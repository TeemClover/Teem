import { MatchAuthority, PHASE } from '../js/engine.js';
import { validateHand } from '../js/rules.js';
import { colorOf } from '../js/cards.js';

export const ROOM_TTL_MS = 15 * 60 * 1000;
export const ACTIVE_TTL_MS = 6 * 60 * 60 * 1000;
/* สามโหมดของเกม — ต่างกันแค่ "ต้องชนะกี่ Match ถึงจบ" มือเจ็ดใบถูกล็อกเหมือนกันหมด
   ID ภายในยังเป็น quick/bo3/bo5 เพราะห้องเก่าและสถิติที่เก็บไว้แล้วอ้างชื่อนี้
   ถ้าเปลี่ยน ID ข้อมูลเดิมจะอ่านไม่ออก — ชื่อที่ผู้เล่นเห็นเปลี่ยนได้อิสระผ่าน label */
export const ROOM_MODES = Object.freeze({
  quick: { label: 'MATCH', target: 1 },
  bo3: { label: 'DOUBLE', target: 2 },
  bo5: { label: 'SET', target: 3 },
});

/* รับชื่อใหม่เป็น input ได้ด้วย จะได้เขียนลิงก์ ?mode=double ได้โดยไม่ต้องรู้ ID เก่า */
const MODE_ALIASES = Object.freeze({ match: 'quick', double: 'bo3', set: 'bo5' });

const cleanName = value => String(value || 'Guest')
  .replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) || 'Guest';

export function validCode(code) { return /^\d{4}$/.test(String(code)); }

export function normalizeMode(mode) {
  const key = String(mode || '').toLowerCase();
  if (ROOM_MODES[key]) return key;
  if (MODE_ALIASES[key]) return MODE_ALIASES[key];
  return 'quick';
}

export function validateCards(cards) {
  if (!Array.isArray(cards)) return false;
  const colors = cards.map(colorOf);
  return validateHand(colors).ok;
}

export function createRoomState({ roomId, code, displayName, authHash, visibility = 'public', mode = 'quick', now = Date.now() }) {
  if (!validCode(code)) throw new Error('INVALID_ROOM_CODE');
  const normalizedMode = normalizeMode(mode);
  return {
    schemaVersion: 1,
    roomId,
    code,
    visibility: visibility === 'unlisted' ? 'unlisted' : 'public',
    mode: normalizedMode,
    targetWins: ROOM_MODES[normalizedMode].target,
    status: 'WAITING',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ROOM_TTL_MS,
    players: {
      a: { id: crypto.randomUUID(), name: cleanName(displayName), authHash, connected: true, lastSeenAt: now },
      b: null,
    },
    startingHands: { a: null, b: null },
    handReady: { a: false, b: false },
    matchNumber: 0,
    matchWins: { a: 0, b: 0 },
    readyNext: { a: false, b: false },
    match: null,
    matches: [],
  };
}

export function seatForHash(room, authHash) {
  if (room.players.a?.authHash === authHash) return 'a';
  if (room.players.b?.authHash === authHash) return 'b';
  return null;
}

export function joinRoom(room, { displayName, authHash, now = Date.now() }) {
  if (room.status !== 'WAITING' || room.players.b) return { ok: false, error: 'ROOM_FULL' };
  room.players.b = {
    id: crypto.randomUUID(), name: cleanName(displayName), authHash,
    connected: true, lastSeenAt: now,
  };
  room.status = 'HAND_BUILDING';
  touch(room, now);
  return { ok: true, seat: 'b' };
}

export function setHand(room, seat, cards, now = Date.now()) {
  if (!['WAITING', 'HAND_BUILDING'].includes(room.status)) return { ok: false, error: 'WRONG_PHASE' };
  if (!room.players[seat]) return { ok: false, error: 'UNKNOWN_PLAYER' };
  if (!validateCards(cards)) return { ok: false, error: 'INVALID_HAND' };
  room.startingHands[seat] = [...cards];
  room.handReady[seat] = true;
  touch(room, now);
  if (room.players.b && room.handReady.a && room.handReady.b) startMatch(room, now);
  return { ok: true };
}

function startMatch(room, now = Date.now()) {
  room.matchNumber += 1;
  const authority = new MatchAuthority({
    matchId: `${room.roomId}-m${room.matchNumber}`,
    mode: room.mode,
    players: {
      a: { id: room.players.a.id, name: room.players.a.name, cards: room.startingHands.a },
      b: { id: room.players.b.id, name: room.players.b.name, cards: room.startingHands.b },
    },
  });
  room.match = authority.toJSON();
  room.status = 'PLAYING';
  room.readyNext = { a: false, b: false };
  touch(room, now);
}

export function applyAction(room, seat, action, now = Date.now()) {
  if (room.status !== 'PLAYING' || !room.match) return { ok: false, error: 'MATCH_NOT_ACTIVE' };
  const authority = MatchAuthority.restore(room.match);
  const result = authority.action(room.players[seat].id, action);
  if (!result.ok) return result;
  room.match = authority.toJSON();
  touch(room, now);
  if (authority.state.phase === PHASE.MATCH_RESULT) finishMatch(room, authority, now);
  return result;
}

function finishMatch(room, authority, now) {
  const result = authority.state.result;
  if (result.winnerSeat) room.matchWins[result.winnerSeat] += 1;
  room.matches.push({
    number: room.matchNumber,
    result: { ...result },
    rounds: authority.state.rounds.map(r => structuredClone(r)),
    endedAt: now,
  });
  const seriesWinner = ['a', 'b'].find(seat => room.matchWins[seat] >= room.targetWins);
  room.status = seriesWinner ? 'SERIES_ENDED' : 'BETWEEN_MATCHES';
  room.seriesWinner = seriesWinner || null;
  room.readyNext = { a: false, b: false };
  touch(room, now);
}

export function readyNextMatch(room, seat, now = Date.now()) {
  if (room.status !== 'BETWEEN_MATCHES') return { ok: false, error: 'WRONG_PHASE' };
  room.readyNext[seat] = true;
  touch(room, now);
  if (room.readyNext.a && room.readyNext.b) startMatch(room, now);
  return { ok: true };
}

export function leaveRoom(room, seat, now = Date.now()) {
  if (room.status === 'SERIES_ENDED') return { ok: true };
  if (room.status === 'PLAYING' && room.match) {
    const authority = MatchAuthority.restore(room.match);
    const result = authority.action(room.players[seat].id, {
      type: 'forfeit', action_id: `leave-${seat}-${now}`,
    });
    if (result.ok) {
      room.match = authority.toJSON();
      finishMatch(room, authority, now);
    }
  } else {
    room.status = 'CANCELLED';
    room.expiresAt = now;
  }
  return { ok: true };
}

export function heartbeat(room, seat, now = Date.now()) {
  if (!room.players[seat]) return { ok: false, error: 'UNKNOWN_PLAYER' };
  room.players[seat].lastSeenAt = now;
  room.players[seat].connected = true;
  touch(room, now);
  return { ok: true };
}

export function viewFor(room, seat, now = Date.now()) {
  const other = seat === 'a' ? 'b' : 'a';
  const player = room.players[seat];
  const opponent = room.players[other];
  if (!player) return null;
  player.lastSeenAt = now;
  const matchView = room.match
    ? MatchAuthority.restore(room.match).viewFor(player.id)
    : null;
  if (matchView && room.status !== 'SERIES_ENDED') matchView.startingHands = null;
  const publicMatches = room.matches.map(m => ({
    number: m.number,
    result: m.result,
    rounds: m.rounds.map(r => ({
      n: r.n, result: r.result,
      you: seat === 'a' ? r.a : r.b,
      opp: seat === 'a' ? r.b : r.a,
      youWon: r.result === (seat === 'a' ? 'A' : 'B'),
      discards: r.discards.map(d => ({ ...d, yours: d.seat === seat })),
    })),
  }));
  return {
    room: {
      code: room.code, visibility: room.visibility, mode: room.mode,
      modeLabel: ROOM_MODES[room.mode].label, targetWins: room.targetWins,
      status: room.status, expiresAt: room.expiresAt,
      you: { name: player.name, seat, ready: room.handReady[seat], nextReady: room.readyNext[seat] },
      opponent: opponent ? {
        name: opponent.name, ready: room.handReady[other], nextReady: room.readyNext[other],
        connected: now - opponent.lastSeenAt < 15000,
      } : null,
      matchNumber: room.matchNumber,
      yourMatchWins: room.matchWins[seat],
      opponentMatchWins: room.matchWins[other],
      seriesEnded: room.status === 'SERIES_ENDED',
      youWonSeries: room.seriesWinner === seat,
    },
    matchView,
    matches: publicMatches,
    startingHands: room.status === 'SERIES_ENDED' ? {
      you: room.startingHands[seat], opponent: room.startingHands[other],
    } : null,
  };
}

export function publicLobbyItem(room, now = Date.now()) {
  if (room.visibility !== 'public' || room.status !== 'WAITING' || room.players.b || room.expiresAt <= now) return null;
  return {
    code: room.code,
    hostName: room.players.a.name,
    mode: room.mode,
    modeLabel: ROOM_MODES[room.mode].label,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
  };
}

function touch(room, now) {
  room.updatedAt = now;
  room.expiresAt = now + (room.status === 'WAITING' ? ROOM_TTL_MS : ACTIVE_TTL_MS);
}
