import { readAnalyticsStats } from './analytics.js';
import { colorOf } from '../js/cards.js';

export const CORE7_ANALYTICS_VERSION = '1.1.0';
export const CORE7_GAME_VERSION = '0.4.6';

const COLORS = ['RED', 'GREEN', 'BLUE', 'GRAY'];
const EVENTS = new Set(['CORE7_VIEW', 'HAND_VIEW', 'HAND_READY', 'MATCH_START', 'MATCH_COMPLETE', 'REMATCH']);
const DAY_MS = 86400000;
const BKK = 7 * 60 * 60 * 1000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS c7_analytics_installations (
    install_id TEXT PRIMARY KEY,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    page_views INTEGER NOT NULL DEFAULT 0,
    match_starts INTEGER NOT NULL DEFAULT 0,
    match_completes INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_c7_installations_seen ON c7_analytics_installations(first_seen_at, last_seen_at)`,
  `CREATE TABLE IF NOT EXISTS c7_analytics_events (
    event_id TEXT PRIMARY KEY,
    install_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    path TEXT,
    mode TEXT,
    bot_level TEXT,
    match_id TEXT,
    game_version TEXT,
    rules_version TEXT,
    occurred_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_c7_events_time ON c7_analytics_events(occurred_at, event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_c7_events_install ON c7_analytics_events(install_id, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS c7_analytics_color_outcomes (
    match_id TEXT NOT NULL,
    color TEXT NOT NULL,
    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    final_plays INTEGER NOT NULL DEFAULT 0,
    discarded INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(match_id, color)
  )`,
  `CREATE TABLE IF NOT EXISTS c7_analytics_card_picks (
    match_id TEXT NOT NULL,
    seat TEXT NOT NULL,
    card_id TEXT NOT NULL,
    color TEXT NOT NULL,
    copies INTEGER NOT NULL DEFAULT 1,
    won INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(match_id, seat, card_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_c7_card_picks_card ON c7_analytics_card_picks(card_id, color)`,
];

let ready = false;

function safeId(value, fallback = '') {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9:_-]{3,128}$/.test(id) ? id : fallback;
}
function safeText(value, max = 120) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}
function safeTime(value, fallback = Date.now()) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.round(n), Date.now() + 5 * 60 * 1000);
}
function rate(n, d) { return d > 0 ? Number((n * 100 / d).toFixed(1)) : 0; }
function nums(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    const n = Number(v);
    out[k] = v !== '' && v != null && Number.isFinite(n) ? n : v;
  }
  return out;
}
function validDay(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
function bkkDay(ms = Date.now()) { return new Date(ms + BKK).toISOString().slice(0, 10); }
function bounds(params = {}) {
  const today = bkkDay();
  const to = validDay(params.to) ? params.to : today;
  const from = validDay(params.from) ? params.from : bkkDay(Date.now() - 29 * DAY_MS);
  return {
    from, to,
    start: Date.parse(`${from}T00:00:00+07:00`),
    end: Date.parse(`${to}T00:00:00+07:00`) + DAY_MS,
  };
}

export async function ensureAnalyticsV11Schema(db) {
  if (ready) return;
  for (const sql of SCHEMA) await db.prepare(sql).run();
  ready = true;
}

export async function recordClientEvent(db, payload = {}) {
  await ensureAnalyticsV11Schema(db);
  const eventType = String(payload.eventType || '').toUpperCase();
  const installId = safeId(payload.installId);
  const eventId = safeId(payload.eventId);
  if (!EVENTS.has(eventType) || !installId || !eventId) return { ok: false, error: 'INVALID_ANALYTICS_EVENT' };
  const now = Date.now();
  const occurredAt = safeTime(payload.occurredAt, now);
  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO c7_analytics_events (
      event_id, install_id, event_type, path, mode, bot_level, match_id,
      game_version, rules_version, occurred_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    eventId, installId, eventType,
    safeText(payload.path, 160) || null,
    safeText(payload.mode, 24) || null,
    safeText(payload.botLevel, 12) || null,
    safeId(payload.matchId) || null,
    safeText(payload.gameVersion, 24) || CORE7_GAME_VERSION,
    safeText(payload.rulesVersion, 24) || null,
    occurredAt, now,
  ).run();
  if (Number(inserted.meta?.changes || 0) === 0) return { ok: true, duplicate: true };
  const pageInc = ['CORE7_VIEW', 'HAND_VIEW'].includes(eventType) ? 1 : 0;
  const startInc = eventType === 'MATCH_START' ? 1 : 0;
  const completeInc = eventType === 'MATCH_COMPLETE' ? 1 : 0;
  await db.prepare(`
    INSERT INTO c7_analytics_installations (
      install_id, first_seen_at, last_seen_at, page_views, match_starts, match_completes
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(install_id) DO UPDATE SET
      first_seen_at = MIN(c7_analytics_installations.first_seen_at, excluded.first_seen_at),
      last_seen_at = MAX(c7_analytics_installations.last_seen_at, excluded.last_seen_at),
      page_views = c7_analytics_installations.page_views + excluded.page_views,
      match_starts = c7_analytics_installations.match_starts + excluded.match_starts,
      match_completes = c7_analytics_installations.match_completes + excluded.match_completes
  `).bind(installId, occurredAt, occurredAt, pageInc, startInc, completeInc).run();
  return { ok: true };
}

function blankColor() { return { played: 0, wins: 0, losses: 0, ties: 0, final_plays: 0, discarded: 0 }; }

export async function recordDevelopmentMatch(db, payload = {}) {
  await ensureAnalyticsV11Schema(db);
  const matchId = safeId(payload.matchId);
  const rounds = Array.isArray(payload.rounds) ? payload.rounds.slice(0, 32) : [];
  if (!matchId || !rounds.length) return { ok: false, error: 'INVALID_DEVELOPMENT_MATCH' };
  const colorRows = Object.fromEntries(COLORS.map(c => [c, blankColor()]));
  rounds.forEach((round, index) => {
    const a = round?.a; const b = round?.b;
    const result = String(round?.result || '').toUpperCase();
    for (const [seat, card] of [['A', a], ['B', b]]) {
      const color = String(card?.color || '').toUpperCase();
      if (!COLORS.includes(color)) continue;
      const row = colorRows[color];
      row.played += 1;
      if (result === seat) row.wins += 1;
      else if (result === 'TIE' || result === 'DRAW') row.ties += 1;
      else row.losses += 1;
      if (index === rounds.length - 1) row.final_plays += 1;
    }
    for (const card of Array.isArray(round?.discards) ? round.discards : []) {
      const color = String(card?.color || '').toUpperCase();
      if (COLORS.includes(color)) colorRows[color].discarded += 1;
    }
  });

  const statements = [
    db.prepare('DELETE FROM c7_analytics_color_outcomes WHERE match_id = ?').bind(matchId),
    db.prepare('DELETE FROM c7_analytics_card_picks WHERE match_id = ?').bind(matchId),
  ];
  for (const color of COLORS) {
    const r = colorRows[color];
    statements.push(db.prepare(`INSERT INTO c7_analytics_color_outcomes
      (match_id, color, played, wins, losses, ties, final_plays, discarded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(matchId, color, r.played, r.wins, r.losses, r.ties, r.final_plays, r.discarded));
  }
  const winnerSeat = String(payload.winnerSeat || '').toLowerCase();
  const hands = payload.startingHands || {};
  for (const seat of ['a', 'b']) {
    const counts = new Map();
    for (const cardIdRaw of Array.isArray(hands[seat]) ? hands[seat].slice(0, 7) : []) {
      const cardId = safeId(cardIdRaw);
      if (!cardId) continue;
      const key = `${cardId}|${colorOf(cardId)}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const [key, copies] of counts) {
      const [cardId, color] = key.split('|');
      statements.push(db.prepare(`INSERT INTO c7_analytics_card_picks
        (match_id, seat, card_id, color, copies, won) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(matchId, seat, cardId, color, copies, winnerSeat === seat ? 1 : 0));
    }
  }
  await db.batch(statements);
  return { ok: true };
}

export async function recordBotDevelopment(db, stage, payload = {}) {
  const eventType = stage === 'complete' ? 'MATCH_COMPLETE' : 'MATCH_START';
  if (payload.installId && payload.eventId) {
    await recordClientEvent(db, {
      ...payload,
      eventType,
      mode: 'quick',
      botLevel: payload.level,
      path: '/core7/bot/',
    });
  }
  if (stage === 'complete') {
    await recordDevelopmentMatch(db, {
      matchId: payload.matchId,
      rounds: payload.rounds,
      winnerSeat: payload.humanSeat === 'a'
        ? (payload.winner === 'HUMAN' ? 'a' : (payload.winner === 'BOT' ? 'b' : null))
        : (payload.winner === 'HUMAN' ? 'b' : (payload.winner === 'BOT' ? 'a' : null)),
      startingHands: payload.startingHands,
    });
  }
}

export async function syncRoomDevelopment(db, before, after) {
  if (!after?.roomId) return;
  const beforeDone = Array.isArray(before?.matches) ? before.matches.length : 0;
  const afterDone = Array.isArray(after?.matches) ? after.matches.length : 0;
  if (afterDone <= beforeDone) return;
  const completed = after.matches[afterDone - 1];
  const number = Number(completed?.number || afterDone);
  await recordDevelopmentMatch(db, {
    matchId: `${after.roomId}-m${number}`,
    rounds: completed?.rounds || [],
    winnerSeat: completed?.result?.winnerSeat,
    startingHands: after.startingHands,
  });
}

export async function readAnalyticsStatsV11(db, params = {}) {
  const base = await readAnalyticsStats(db, params);
  await ensureAnalyticsV11Schema(db);
  const b = bounds(params);
  const [activeRow, newRow, returningRow, matchUsersRow, rematchRow, funnelRes, versionsRes, colorsRes, picksRes, healthRes, dailyRes] = await Promise.all([
    db.prepare('SELECT COUNT(DISTINCT install_id) n FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ?').bind(b.start, b.end).first(),
    db.prepare('SELECT COUNT(*) n FROM c7_analytics_installations WHERE first_seen_at >= ? AND first_seen_at < ?').bind(b.start, b.end).first(),
    db.prepare(`SELECT COUNT(DISTINCT e.install_id) n FROM c7_analytics_events e
      JOIN c7_analytics_installations i ON i.install_id=e.install_id
      WHERE e.occurred_at >= ? AND e.occurred_at < ? AND i.first_seen_at < ?`).bind(b.start, b.end, b.start).first(),
    db.prepare(`SELECT COUNT(DISTINCT install_id) users, COUNT(DISTINCT match_id) starts
      FROM c7_analytics_events WHERE event_type='MATCH_START' AND occurred_at >= ? AND occurred_at < ?`).bind(b.start, b.end).first(),
    db.prepare(`SELECT COUNT(*) n FROM (
      SELECT install_id FROM c7_analytics_events
      WHERE event_type='MATCH_START' AND occurred_at >= ? AND occurred_at < ?
      GROUP BY install_id HAVING COUNT(DISTINCT match_id) >= 2
    )`).bind(b.start, b.end).first(),
    db.prepare(`SELECT event_type, COUNT(*) events, COUNT(DISTINCT install_id) users
      FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ?
      GROUP BY event_type`).bind(b.start, b.end).all(),
    db.prepare(`SELECT COALESCE(game_version,'unknown') game_version,
      COALESCE(rules_version,'unknown') rules_version, COUNT(*) n
      FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ?
      GROUP BY game_version, rules_version ORDER BY n DESC`).bind(b.start, b.end).all(),
    db.prepare(`SELECT o.color, SUM(o.played) played, SUM(o.wins) wins, SUM(o.losses) losses,
      SUM(o.ties) ties, SUM(o.final_plays) final_plays, SUM(o.discarded) discarded
      FROM c7_analytics_color_outcomes o JOIN c7_analytics_matches m ON m.match_id=o.match_id
      WHERE m.status='COMPLETED' AND m.started_at >= ? AND m.started_at < ? GROUP BY o.color`).bind(b.start, b.end).all(),
    db.prepare(`SELECT p.card_id, p.color, COUNT(*) picked_hands, SUM(p.copies) picked_copies,
      SUM(p.won) won_hands,
      COALESCE(SUM(CASE WHEN e.event_type='PLAYED' THEN e.n ELSE 0 END),0) played,
      COALESCE(SUM(CASE WHEN e.event_type='DISCARDED' THEN e.n ELSE 0 END),0) discarded
      FROM c7_analytics_card_picks p
      JOIN c7_analytics_matches m ON m.match_id=p.match_id
      LEFT JOIN c7_analytics_card_events e ON e.match_id=p.match_id AND e.card_id=p.card_id
      WHERE m.status='COMPLETED' AND m.started_at >= ? AND m.started_at < ?
      GROUP BY p.card_id,p.color ORDER BY picked_hands DESC, played DESC LIMIT 28`).bind(b.start, b.end).all(),
    db.prepare(`SELECT source, MAX(updated_at) latest, COUNT(*) matches
      FROM c7_analytics_matches GROUP BY source`).all(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day,
      COUNT(DISTINCT install_id) active_players,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_START' THEN install_id END) match_players,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_START' THEN match_id END) match_starts,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_COMPLETE' THEN match_id END) match_completes
      FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ? GROUP BY day ORDER BY day`).bind(b.start, b.end).all(),
  ]);

  const active = Number(activeRow?.n || 0);
  const newPlayers = Number(newRow?.n || 0);
  const returning = Number(returningRow?.n || 0);
  const matchUsers = Number(matchUsersRow?.users || 0);
  const starts = Number(matchUsersRow?.starts || 0);
  const rematchUsers = Number(rematchRow?.n || 0);
  const funnel = Object.fromEntries((funnelRes.results || []).map(r => [r.event_type, nums(r)]));
  const developmentColors = {};
  for (const row of colorsRes.results || []) {
    const r = nums(row); const decided = Number(r.wins || 0) + Number(r.losses || 0);
    developmentColors[r.color] = {
      ...r,
      round_win_rate: rate(Number(r.wins || 0), decided),
      tie_rate: rate(Number(r.ties || 0), Number(r.played || 0)),
    };
  }
  const cardPicks = (picksRes.results || []).map(row => {
    const r = nums(row);
    r.hand_win_rate = rate(Number(r.won_hands || 0), Number(r.picked_hands || 0));
    r.sample_ok = Number(r.picked_hands || 0) >= 20;
    return r;
  });

  return {
    ...base,
    analyticsVersion: CORE7_ANALYTICS_VERSION,
    gameVersion: CORE7_GAME_VERSION,
    players: {
      active, new: newPlayers, returning,
      match_players: matchUsers,
      rematch_players: rematchUsers,
      rematch_rate: rate(rematchUsers, matchUsers),
      matches_per_player: matchUsers ? Number((starts / matchUsers).toFixed(2)) : 0,
    },
    funnel,
    versions: (versionsRes.results || []).map(nums),
    developmentColors,
    cardPicks,
    dataHealth: (healthRes.results || []).map(nums),
    dailyPlayers: (dailyRes.results || []).map(nums),
    samplePolicy: { minimum: 20, text: 'เปอร์เซ็นต์ Balance จะแสดงคำเตือนเมื่อ Sample ต่ำกว่า 20 Matches/Hands' },
    patches: [
      { date:'2026-07-31', version:'v0.1', title:'One-prompt birth' },
      { date:'2026-08-01', version:'Manual Patch', title:'Cosmetic + face-up card fix' },
      { date:'2026-08-02', version:'v0.3 Beta', title:'Real multiplayer' },
      { date:'2026-08-03', version:'v0.4.6', title:'MATCH / DOUBLE / SET + Stat v1.1' },
    ],
  };
}

/* ── ตัวนับ Match สะสมทั้งหมด สำหรับโชว์บนหน้าแรกของเกม ──
   นับจาก MATCH_START เพราะโจทย์คือ "เกมที่เล่นไม่จบก็นับ"
   ใช้ COUNT(DISTINCT match_id) กัน event ซ้ำจากการ reconnect หรือ refresh

   pvp = เกมคนกับคน แยกด้วย bot_level ที่ว่าง (แถวของบอทเซ็ต bot_level เสมอ)
   ไม่ใช้ mode เพราะบอทก็บันทึกเป็น mode='quick' เหมือนกัน */
export async function readMatchCounters(db) {
  await ensureAnalyticsV11Schema(db);
  const row = await db.prepare(`
    SELECT
      COUNT(DISTINCT match_id) AS total,
      COUNT(DISTINCT CASE WHEN bot_level IS NULL OR bot_level = '' THEN match_id END) AS pvp
    FROM c7_analytics_events
    WHERE event_type = 'MATCH_START' AND match_id IS NOT NULL AND match_id <> ''
  `).first();
  const total = Number(row?.total || 0);
  const pvp = Number(row?.pvp || 0);
  return { ok: true, total, pvp, bot: Math.max(0, total - pvp) };
}
