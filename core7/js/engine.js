/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Match Engine (Authority)

   คลาสนี้คือ "Server" ของ Match หนึ่งเกม — ถือ Hidden State ทั้งหมด
   UI เป็นเพียง Client: ส่ง Action เข้ามา แล้วรับ Event / View กลับไป

   หลักการเดียวกับ Server จริง:
   - ไม่มีทางอ่าน Choice ของคู่แข่งก่อน Reveal ผ่าน viewFor()
   - ทุก Action ถูก Validate ที่นี่ ไม่เชื่อผลลัพธ์จาก Client
   - Action ซ้ำ (Double Submit / Refresh) เป็น Idempotent
   - State Serialize / Restore ได้ เพื่อ Reconnect

   ไฟล์นี้รันได้ทั้งใน Browser และใน Server จริง (Cloudflare Worker /
   Durable Object) โดยไม่ต้องแก้ — นี่คือเส้นทางย้ายขึ้น Backend
   ═══════════════════════════════════════════════════════════════ */

import {
  CORE7_RULES_VERSION, resolveRound, resolveMatch,
  validateHand, MATCH_RESULT_TYPE,
} from './rules.js';
import { colorOf } from './cards.js';

export const PHASE = {
  ROUND_SELECT: 'ROUND_SELECT',
  ROUND_REVEAL: 'ROUND_REVEAL',
  DISCARD_REQUIRED: 'DISCARD_REQUIRED',
  MATCH_RESULT: 'MATCH_RESULT',
};

export const CARD_STATUS = {
  IN_HAND: 'IN_HAND',
  PLAYED: 'PLAYED',
  DISCARDED_EXTRA: 'DISCARDED_EXTRA',
};

let eventCounter = 0;
const newEventId = () => `ev-${Date.now().toString(36)}-${(++eventCounter).toString(36)}`;

export class MatchAuthority {
  /* players = {
       a: { id, name, cards: [cardId × 7] },
       b: { id, name, cards: [cardId × 7] },
     } */
  constructor({ matchId, players, mode = 'casual', ranked = false }) {
    for (const seat of ['a', 'b']) {
      const colors = players[seat].cards.map(colorOf);
      const v = validateHand(colors);
      if (!v.ok) throw new Error(`hand ${seat}: ${v.reason}`);
    }
    this.state = {
      matchId,
      rulesVersion: CORE7_RULES_VERSION,
      mode, ranked,
      phase: PHASE.ROUND_SELECT,
      roundNumber: 1,
      players: {
        a: this._seat(players.a, 'a'),
        b: this._seat(players.b, 'b'),
      },
      /* choices ของรอบปัจจุบัน — Hidden State ห้ามหลุดออกทาง viewFor */
      current: { a: { selected: null, locked: false }, b: { selected: null, locked: false } },
      rounds: [],            // ประวัติรอบที่จบแล้ว (ข้อมูลหงายหน้า)
      discardBy: null,       // seat ที่ต้องทิ้งเพิ่ม
      result: null,          // ผล Match เมื่อจบ
      startedAt: Date.now(),
      endedAt: null,
      seenActions: {},       // idempotency_key → ผลที่ตอบไปแล้ว
    };
    this.listeners = [];
  }

  _seat(p, seat) {
    return {
      id: p.id, name: p.name, seat,
      roundWins: 0,
      hand: p.cards.map((cardId, i) => ({
        iid: `${seat}${i + 1}`,
        cardId,
        color: colorOf(cardId),
        status: CARD_STATUS.IN_HAND,
      })),
    };
  }

  /* ── Event bus ── */
  subscribe(fn) { this.listeners.push(fn); return () => {
    this.listeners = this.listeners.filter(l => l !== fn);
  }; }

  _emit(type, payload = {}) {
    const ev = {
      event_id: newEventId(),
      event_type: type,
      match_id: this.state.matchId,
      round_number: this.state.roundNumber,
      server_timestamp: Date.now(),
      payload,
    };
    for (const fn of this.listeners) fn(ev);
    return ev;
  }

  _seatOf(playerId) {
    if (this.state.players.a.id === playerId) return 'a';
    if (this.state.players.b.id === playerId) return 'b';
    return null;
  }

  _handCount(seat) {
    return this.state.players[seat].hand
      .filter(c => c.status === CARD_STATUS.IN_HAND).length;
  }

  /* ═══ Actions — ทางเข้าเดียวของ Client ═══ */

  action(playerId, act) {
    const seat = this._seatOf(playerId);
    if (!seat) return { ok: false, error: 'UNKNOWN_PLAYER' };

    /* Idempotency: action_id ที่เคยเห็นแล้ว ตอบผลเดิม ไม่ทำซ้ำ */
    if (act.action_id && this.state.seenActions[act.action_id] !== undefined) {
      return this.state.seenActions[act.action_id];
    }
    let res;
    switch (act.type) {
      case 'select_card': res = this._selectCard(seat, act.cardInstanceId); break;
      case 'lock_choice': res = this._lockChoice(seat); break;
      case 'discard_card': res = this._discardCard(seat, act.cardInstanceId); break;
      case 'forfeit': res = this._forfeit(seat); break;
      default: res = { ok: false, error: 'UNKNOWN_ACTION' };
    }
    if (act.action_id) this.state.seenActions[act.action_id] = res;
    return res;
  }

  _selectCard(seat, iid) {
    const s = this.state;
    if (s.phase !== PHASE.ROUND_SELECT) return { ok: false, error: 'WRONG_PHASE' };
    if (s.current[seat].locked) return { ok: false, error: 'ALREADY_LOCKED' };
    const card = s.players[seat].hand.find(c => c.iid === iid);
    if (!card || card.status !== CARD_STATUS.IN_HAND) {
      return { ok: false, error: 'CARD_NOT_IN_HAND' };
    }
    s.current[seat].selected = iid;
    return { ok: true };
  }

  _lockChoice(seat) {
    const s = this.state;
    if (s.phase !== PHASE.ROUND_SELECT) return { ok: false, error: 'WRONG_PHASE' };
    if (s.current[seat].locked) return { ok: true, already: true };   // idempotent
    if (!s.current[seat].selected) return { ok: false, error: 'NOTHING_SELECTED' };
    s.current[seat].locked = true;
    /* บอกอีกฝ่ายว่า Lock แล้ว — แต่ไม่บอกว่าเลือกอะไร */
    this._emit('round.selection_locked', { seat });
    if (s.current.a.locked && s.current.b.locked) this._reveal();
    return { ok: true };
  }

  _reveal() {
    const s = this.state;
    s.phase = PHASE.ROUND_REVEAL;
    const played = {};
    for (const seat of ['a', 'b']) {
      const iid = s.current[seat].selected;
      const card = s.players[seat].hand.find(c => c.iid === iid);
      card.status = CARD_STATUS.PLAYED;
      played[seat] = { iid: card.iid, cardId: card.cardId, color: card.color };
    }
    const rr = resolveRound({ a: played.a.color, b: played.b.color });
    const round = {
      n: s.roundNumber,
      a: played.a, b: played.b,
      result: rr.result,
      winner: rr.winner ? s.players[rr.winner.toLowerCase()].id : null,
      discards: [],
    };
    s.rounds.push(round);
    if (rr.winner) s.players[rr.winner.toLowerCase()].roundWins += 1;

    this._emit('round.reveal', {
      round: s.roundNumber,
      a: played.a, b: played.b,
      result: rr.result,
    });

    /* ผู้ชนะครบ 3 → จบทันที ไม่ต้องทิ้งเพิ่ม (Priority 1: ชนะ "ทันที") */
    const wins = { a: s.players.a.roundWins, b: s.players.b.roundWins };
    if (wins.a >= 3 || wins.b >= 3) return this._finishRound();

    /* ผู้แพ้ต้องทิ้งเพิ่ม 1 ใบ — เฉพาะเมื่อยังมีการ์ดเหลือ */
    if (rr.loser) {
      const loserSeat = rr.loser.toLowerCase();
      if (this._handCount(loserSeat) > 0) {
        s.phase = PHASE.DISCARD_REQUIRED;
        s.discardBy = loserSeat;
        this._emit('round.discard_required', { seat: loserSeat });
        return;
      }
    }
    this._finishRound();
  }

  _discardCard(seat, iid) {
    const s = this.state;
    if (s.phase !== PHASE.DISCARD_REQUIRED) return { ok: false, error: 'DISCARD_NOT_REQUIRED' };
    if (s.discardBy !== seat) return { ok: false, error: 'NOT_YOUR_DISCARD' };
    const card = s.players[seat].hand.find(c => c.iid === iid);
    if (!card || card.status !== CARD_STATUS.IN_HAND) {
      return { ok: false, error: 'CARD_NOT_IN_HAND' };
    }
    card.status = CARD_STATUS.DISCARDED_EXTRA;
    s.rounds[s.rounds.length - 1].discards.push({
      seat, iid: card.iid, cardId: card.cardId, color: card.color,
    });
    s.discardBy = null;
    this._finishRound();
    return { ok: true };
  }

  _finishRound() {
    const s = this.state;
    const last = s.rounds[s.rounds.length - 1];
    this._emit('round.resolved', {
      round: last.n, result: last.result, discards: last.discards,
      handCounts: { a: this._handCount('a'), b: this._handCount('b') },
      roundWins: { a: s.players.a.roundWins, b: s.players.b.roundWins },
    });

    const outcome = resolveMatch({
      roundWins: { a: s.players.a.roundWins, b: s.players.b.roundWins },
      handCounts: { a: this._handCount('a'), b: this._handCount('b') },
      rounds: s.rounds.map(r => ({ a: r.a.color, b: r.b.color, result: r.result })),
      startingGrayCounts: {
        a: s.players.a.hand.filter(c => c.color === 'GRAY').length,
        b: s.players.b.hand.filter(c => c.color === 'GRAY').length,
      },
    });

    if (outcome) {
      s.phase = PHASE.MATCH_RESULT;
      s.endedAt = Date.now();
      s.result = {
        winnerSeat: outcome.winner ? outcome.winner.toLowerCase() : null,
        winnerId: outcome.winner
          ? s.players[outcome.winner.toLowerCase()].id : null,
        resultType: outcome.resultType,
        draw: outcome.draw,
        roundWins: { a: s.players.a.roundWins, b: s.players.b.roundWins },
        startingGrayCounts: {
          a: s.players.a.hand.filter(c => c.color === 'GRAY').length,
          b: s.players.b.hand.filter(c => c.color === 'GRAY').length,
        },
      };
      this._emit('match.completed', s.result);
      return;
    }
    /* เริ่ม Round ถัดไป */
    s.roundNumber += 1;
    s.phase = PHASE.ROUND_SELECT;
    s.current = { a: { selected: null, locked: false }, b: { selected: null, locked: false } };
  }

  _forfeit(seat) {
    const s = this.state;
    if (s.phase === PHASE.MATCH_RESULT) return { ok: false, error: 'MATCH_OVER' };
    const other = seat === 'a' ? 'b' : 'a';
    s.phase = PHASE.MATCH_RESULT;
    s.endedAt = Date.now();
    s.result = {
      winnerSeat: other,
      winnerId: s.players[other].id,
      resultType: MATCH_RESULT_TYPE.FORFEIT,
      draw: false,
      roundWins: { a: s.players.a.roundWins, b: s.players.b.roundWins },
    };
    this._emit('match.forfeited', { forfeitedBy: seat, ...s.result });
    return { ok: true };
  }

  /* ═══ Views — สิ่งเดียวที่ Client มองเห็น ═══ */

  viewFor(playerId) {
    const seat = this._seatOf(playerId);
    if (!seat) return null;
    const other = seat === 'a' ? 'b' : 'a';
    const s = this.state;
    const me = s.players[seat];
    const opp = s.players[other];
    return {
      matchId: s.matchId,
      rulesVersion: s.rulesVersion,
      mode: s.mode, ranked: s.ranked,
      phase: s.phase,
      roundNumber: s.roundNumber,
      seat,
      you: {
        id: me.id, name: me.name, roundWins: me.roundWins,
        hand: me.hand.map(c => ({ ...c })),
        selected: s.current[seat].selected,
        locked: s.current[seat].locked,
      },
      opponent: {
        /* ห้ามส่งมือ / choice ของคู่แข่ง — ส่งเฉพาะข้อมูลหงายหน้า */
        name: opp.name, roundWins: opp.roundWins,
        handCount: this._handCount(other),
        locked: s.current[other].locked,
      },
      /* ประวัติทุกใบที่ใช้แล้ว = ข้อมูลหงายหน้าของทั้งคู่ */
      rounds: s.rounds.map(r => ({
        n: r.n, result: r.result,
        you: seat === 'a' ? r.a : r.b,
        opp: seat === 'a' ? r.b : r.a,
        youWon: r.result === (seat === 'a' ? 'A' : 'B'),
        discards: r.discards.map(d => ({ ...d, yours: d.seat === seat })),
      })),
      discardRequired: s.phase === PHASE.DISCARD_REQUIRED && s.discardBy === seat,
      waitingOpponentDiscard: s.phase === PHASE.DISCARD_REQUIRED && s.discardBy !== seat,
      startingHands: s.phase === PHASE.MATCH_RESULT ? {
        you: me.hand.map(c => ({ cardId: c.cardId, color: c.color, status: c.status })),
        opponent: opp.hand.map(c => ({ cardId: c.cardId, color: c.color, status: c.status })),
      } : null,
      result: s.result ? {
        ...s.result,
        youWon: s.result.winnerSeat === seat,
        youLost: s.result.winnerSeat === other,
      } : null,
    };
  }

  /* ═══ Serialize / Restore — สำหรับ Refresh / Reconnect ═══ */

  toJSON() { return JSON.parse(JSON.stringify(this.state)); }

  static restore(snapshot) {
    const m = Object.create(MatchAuthority.prototype);
    m.state = JSON.parse(JSON.stringify(snapshot));
    m.listeners = [];
    return m;
  }
}
