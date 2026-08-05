const COLORS = Object.freeze(['RED', 'GREEN', 'BLUE', 'SILVER']);
const FORMATS = new Set(['quick', 'bo3', 'bo5']);
const BOT_LEVELS = new Set(['easy', 'hard']);
const WINNERS = new Set(['HUMAN', 'BOT', 'A', 'B', 'DRAW']);
const MATCH_STATUSES = new Set(['STARTED', 'COMPLETED', 'ABANDONED']);
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const STALE_AFTER_MS = 8 * 60 * 60 * 1000;

/* แยกออกมาเป็นค่าคงที่เพราะ migration GRAY → SILVER ต้องสร้างตารางนี้ใหม่
   (CHECK ระบุชื่อสีไว้ตรง ๆ SQLite แก้ในที่เดิมไม่ได้) ทั้งสองที่ต้องใช้ DDL
   ก้อนเดียวกัน ไม่งั้นตารางที่สร้างใหม่จะเพี้ยนจากของเดิมโดยไม่มีใครเห็น */
export const CARD_EVENTS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS c7_analytics_card_events (
    match_id        TEXT NOT NULL,
    card_id         TEXT NOT NULL,
    color           TEXT NOT NULL CHECK(color IN ('RED','GREEN','BLUE','SILVER')),
    event_type      TEXT NOT NULL CHECK(event_type IN ('PLAYED','DISCARDED')),
    n               INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(match_id, card_id, color, event_type)
  )`;

export const CARD_EVENTS_INDEX_SQL = `CREATE INDEX IF NOT EXISTS idx_c7_analytics_card_events_card
    ON c7_analytics_card_events(card_id, color, event_type)`;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS c7_analytics_matches (
    match_id        TEXT PRIMARY KEY,
    series_id       TEXT,
    source          TEXT NOT NULL CHECK(source IN ('BOT','ONLINE')),
    bot_level       TEXT CHECK(bot_level IS NULL OR bot_level IN ('easy','hard')),
    format          TEXT NOT NULL CHECK(format IN ('quick','bo3','bo5')),
    status          TEXT NOT NULL CHECK(status IN ('STARTED','COMPLETED','ABANDONED')),
    winner          TEXT CHECK(winner IS NULL OR winner IN ('HUMAN','BOT','A','B','DRAW')),
    result_type     TEXT,
    rounds          INTEGER NOT NULL DEFAULT 0,
    started_at      INTEGER NOT NULL,
    ended_at        INTEGER,
    duration_ms     INTEGER,
    rules_version   TEXT,
    played_red      INTEGER NOT NULL DEFAULT 0,
    played_green    INTEGER NOT NULL DEFAULT 0,
    played_blue     INTEGER NOT NULL DEFAULT 0,
    played_silver     INTEGER NOT NULL DEFAULT 0,
    discarded_red   INTEGER NOT NULL DEFAULT 0,
    discarded_green INTEGER NOT NULL DEFAULT 0,
    discarded_blue  INTEGER NOT NULL DEFAULT 0,
    discarded_silver  INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_c7_analytics_matches_started
    ON c7_analytics_matches(started_at, source, status)`,
  `CREATE INDEX IF NOT EXISTS idx_c7_analytics_matches_series
    ON c7_analytics_matches(series_id, started_at)`,
  `CREATE TABLE IF NOT EXISTS c7_analytics_series (
    series_id       TEXT PRIMARY KEY,
    format          TEXT NOT NULL CHECK(format IN ('quick','bo3','bo5')),
    status          TEXT NOT NULL CHECK(status IN ('STARTED','COMPLETED','ABANDONED')),
    target_wins     INTEGER NOT NULL,
    winner          TEXT CHECK(winner IS NULL OR winner IN ('A','B','DRAW')),
    started_at      INTEGER NOT NULL,
    ended_at        INTEGER,
    duration_ms     INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_c7_analytics_series_started
    ON c7_analytics_series(started_at, format, status)`,
  CARD_EVENTS_TABLE_SQL,
  CARD_EVENTS_INDEX_SQL,
];

let schemaReady = false;

function safeId(value, fallback = '') {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9:_-]{3,120}$/.test(id) ? id : fallback;
}

function safeText(value, max = 80) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}

function safeTime(value, fallback = Date.now()) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const maxFuture = Date.now() + 5 * 60 * 1000;
  return Math.min(Math.round(n), maxFuture);
}

function emptyCounts() {
  return { RED: 0, GREEN: 0, BLUE: 0, SILVER: 0 };
}

function normalizeCard(card) {
  if (!card || typeof card !== 'object') return null;
  const color = String(card.color || '').toUpperCase();
  const cardId = safeId(card.cardId);
  if (!COLORS.includes(color) || !cardId) return null;
  return { cardId, color };
}

export function summarizeRounds(rounds) {
  const played = emptyCounts();
  const discarded = emptyCounts();
  const cardEvents = new Map();
  let roundCount = 0;

  function addEvent(card, eventType) {
    const normalized = normalizeCard(card);
    if (!normalized) return false;
    const bucket = eventType === 'PLAYED' ? played : discarded;
    bucket[normalized.color] += 1;
    const key = `${eventType}|${normalized.cardId}|${normalized.color}`;
    const current = cardEvents.get(key) || { ...normalized, eventType, n: 0 };
    current.n += 1;
    cardEvents.set(key, current);
    return true;
  }

  for (const round of Array.isArray(rounds) ? rounds.slice(0, 32) : []) {
    if (!round || typeof round !== 'object') continue;
    const hasA = addEvent(round.a, 'PLAYED');
    const hasB = addEvent(round.b, 'PLAYED');
    if (hasA && hasB) roundCount += 1;
    for (const card of Array.isArray(round.discards) ? round.discards.slice(0, 4) : []) {
      addEvent(card, 'DISCARDED');
    }
  }

  return { played, discarded, cardEvents: [...cardEvents.values()], roundCount };
}

export async function ensureAnalyticsSchema(db) {
  if (schemaReady) return;
  for (const sql of SCHEMA) await db.prepare(sql).run();
  schemaReady = true;
}

function normalizeFormat(value) {
  return FORMATS.has(value) ? value : 'quick';
}

async function upsertMatchStart(db, {
  matchId, seriesId = null, source, botLevel = null, format = 'quick',
  startedAt = Date.now(), rulesVersion = null,
}) {
  const now = Date.now();
  await db.prepare(`
    INSERT INTO c7_analytics_matches (
      match_id, series_id, source, bot_level, format, status,
      started_at, rules_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'STARTED', ?, ?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET
      series_id = COALESCE(c7_analytics_matches.series_id, excluded.series_id),
      bot_level = COALESCE(c7_analytics_matches.bot_level, excluded.bot_level),
      format = excluded.format,
      started_at = MIN(c7_analytics_matches.started_at, excluded.started_at),
      rules_version = COALESCE(c7_analytics_matches.rules_version, excluded.rules_version),
      updated_at = excluded.updated_at
  `).bind(
    matchId, seriesId, source, botLevel, normalizeFormat(format),
    safeTime(startedAt, now), safeText(rulesVersion, 32) || null, now, now,
  ).run();
}

async function upsertSeriesStart(db, { seriesId, format, targetWins, startedAt }) {
  const now = Date.now();
  await db.prepare(`
    INSERT INTO c7_analytics_series (
      series_id, format, status, target_wins, started_at, created_at, updated_at
    ) VALUES (?, ?, 'STARTED', ?, ?, ?, ?)
    ON CONFLICT(series_id) DO UPDATE SET
      format = excluded.format,
      target_wins = excluded.target_wins,
      started_at = MIN(c7_analytics_series.started_at, excluded.started_at),
      updated_at = excluded.updated_at
  `).bind(
    seriesId, normalizeFormat(format), Math.max(1, Math.min(3, Number(targetWins) || 1)),
    safeTime(startedAt, now), now, now,
  ).run();
}

async function upsertCompletedMatch(db, {
  matchId, seriesId = null, source, botLevel = null, format = 'quick', winner,
  resultType = null, startedAt, endedAt, rulesVersion = null, rounds,
}) {
  const now = Date.now();
  const start = safeTime(startedAt, now);
  const end = Math.max(start, safeTime(endedAt, now));
  const summary = summarizeRounds(rounds);
  const winnerValue = WINNERS.has(winner) ? winner : 'DRAW';
  const statement = db.prepare(`
    INSERT INTO c7_analytics_matches (
      match_id, series_id, source, bot_level, format, status, winner, result_type,
      rounds, started_at, ended_at, duration_ms, rules_version,
      played_red, played_green, played_blue, played_silver,
      discarded_red, discarded_green, discarded_blue, discarded_silver,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET
      series_id = COALESCE(excluded.series_id, c7_analytics_matches.series_id),
      source = excluded.source,
      bot_level = excluded.bot_level,
      format = excluded.format,
      status = 'COMPLETED',
      winner = excluded.winner,
      result_type = excluded.result_type,
      rounds = excluded.rounds,
      started_at = MIN(c7_analytics_matches.started_at, excluded.started_at),
      ended_at = excluded.ended_at,
      duration_ms = excluded.duration_ms,
      rules_version = excluded.rules_version,
      played_red = excluded.played_red,
      played_green = excluded.played_green,
      played_blue = excluded.played_blue,
      played_silver = excluded.played_silver,
      discarded_red = excluded.discarded_red,
      discarded_green = excluded.discarded_green,
      discarded_blue = excluded.discarded_blue,
      discarded_silver = excluded.discarded_silver,
      updated_at = excluded.updated_at
  `).bind(
    matchId, seriesId, source, botLevel, normalizeFormat(format), winnerValue,
    safeText(resultType, 64) || null, summary.roundCount, start, end, end - start,
    safeText(rulesVersion, 32) || null,
    summary.played.RED, summary.played.GREEN, summary.played.BLUE, summary.played.SILVER,
    summary.discarded.RED, summary.discarded.GREEN, summary.discarded.BLUE, summary.discarded.SILVER,
    now, now,
  );

  const statements = [
    statement,
    db.prepare('DELETE FROM c7_analytics_card_events WHERE match_id = ?').bind(matchId),
    ...summary.cardEvents.map(event => db.prepare(`
      INSERT INTO c7_analytics_card_events (match_id, card_id, color, event_type, n)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(match_id, card_id, color, event_type) DO UPDATE SET n = excluded.n
    `).bind(matchId, event.cardId, event.color, event.eventType, event.n)),
  ];
  await db.batch(statements);
  return summary;
}

async function completeSeries(db, { seriesId, format, targetWins, winner, startedAt, endedAt }) {
  const now = Date.now();
  const start = safeTime(startedAt, now);
  const end = Math.max(start, safeTime(endedAt, now));
  const winnerValue = ['A', 'B', 'DRAW'].includes(winner) ? winner : 'DRAW';
  await db.prepare(`
    INSERT INTO c7_analytics_series (
      series_id, format, status, target_wins, winner,
      started_at, ended_at, duration_ms, created_at, updated_at
    ) VALUES (?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(series_id) DO UPDATE SET
      format = excluded.format,
      status = 'COMPLETED',
      target_wins = excluded.target_wins,
      winner = excluded.winner,
      started_at = c7_analytics_series.started_at,
      ended_at = excluded.ended_at,
      duration_ms = excluded.duration_ms,
      updated_at = excluded.updated_at
  `).bind(
    seriesId, normalizeFormat(format), Math.max(1, Math.min(3, Number(targetWins) || 1)),
    winnerValue, start, end, end - start, now, now,
  ).run();
}

export async function recordBotMatchStart(db, payload) {
  await ensureAnalyticsSchema(db);
  const matchId = safeId(payload?.matchId);
  const level = BOT_LEVELS.has(payload?.level) ? payload.level : null;
  if (!matchId || !level) return { ok: false, error: 'INVALID_BOT_MATCH_START' };
  await upsertMatchStart(db, {
    matchId, source: 'BOT', botLevel: level, format: 'quick',
    startedAt: payload.startedAt, rulesVersion: payload.rulesVersion,
  });
  return { ok: true };
}

export async function recordBotMatchComplete(db, payload) {
  await ensureAnalyticsSchema(db);
  const matchId = safeId(payload?.matchId);
  const level = BOT_LEVELS.has(payload?.level) ? payload.level : null;
  const winner = WINNERS.has(payload?.winner) ? payload.winner : null;
  if (!matchId || !level || !winner || !Array.isArray(payload?.rounds)) {
    return { ok: false, error: 'INVALID_BOT_MATCH_COMPLETE' };
  }
  await upsertCompletedMatch(db, {
    matchId, source: 'BOT', botLevel: level, format: 'quick', winner,
    resultType: payload.resultType, startedAt: payload.startedAt,
    endedAt: payload.endedAt, rulesVersion: payload.rulesVersion,
    rounds: payload.rounds,
  });
  return { ok: true };
}

export async function syncRoomAnalytics(db, before, after) {
  if (!after?.roomId) return;
  await ensureAnalyticsSchema(db);
  const beforeMatchNumber = Number(before?.matchNumber || 0);
  const afterMatchNumber = Number(after.matchNumber || 0);
  const seriesId = safeId(after.roomId);
  const format = normalizeFormat(after.mode);
  const targetWins = Number(after.targetWins || 1);

  if (seriesId && after.match && afterMatchNumber > beforeMatchNumber) {
    const matchId = safeId(after.match.matchId, `${seriesId}-m${afterMatchNumber}`);
    await upsertSeriesStart(db, {
      seriesId, format, targetWins,
      startedAt: after.match.startedAt || after.updatedAt || Date.now(),
    });
    await upsertMatchStart(db, {
      matchId, seriesId, source: 'ONLINE', format,
      startedAt: after.match.startedAt || after.updatedAt || Date.now(),
      rulesVersion: after.match.rulesVersion,
    });
  }

  const beforeCompleted = Array.isArray(before?.matches) ? before.matches.length : 0;
  const afterCompleted = Array.isArray(after.matches) ? after.matches.length : 0;
  if (seriesId && afterCompleted > beforeCompleted) {
    const completed = after.matches[afterCompleted - 1];
    const number = Number(completed?.number || afterMatchNumber || afterCompleted);
    const matchId = safeId(after.match?.matchId, `${seriesId}-m${number}`);
    const matchState = after.match?.matchId === matchId ? after.match : null;
    const result = completed?.result || matchState?.result || {};
    await upsertCompletedMatch(db, {
      matchId, seriesId, source: 'ONLINE', format,
      winner: result.draw ? 'DRAW' : String(result.winnerSeat || '').toUpperCase(),
      resultType: result.resultType,
      startedAt: matchState?.startedAt || completed?.startedAt || after.updatedAt,
      endedAt: matchState?.endedAt || completed?.endedAt || after.updatedAt,
      rulesVersion: matchState?.rulesVersion,
      rounds: completed?.rounds || matchState?.rounds || [],
    });
  }

  if (seriesId && after.status === 'SERIES_ENDED' && before?.status !== 'SERIES_ENDED') {
    const firstStarted = after.matches?.[0]?.startedAt || after.createdAt || after.updatedAt;
    await completeSeries(db, {
      seriesId, format, targetWins,
      winner: after.seriesWinner ? String(after.seriesWinner).toUpperCase() : 'DRAW',
      startedAt: firstStarted,
      endedAt: after.updatedAt || Date.now(),
    });
  } else if (seriesId && after.status === 'CANCELLED' && before?.status !== 'CANCELLED') {
    const now = after.updatedAt || Date.now();
    await db.prepare(`
      UPDATE c7_analytics_series
      SET status = 'ABANDONED', ended_at = ?, duration_ms = MAX(0, ? - started_at), updated_at = ?
      WHERE series_id = ? AND status = 'STARTED'
    `).bind(now, now, now, seriesId).run();
  }
}

function validDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function bangkokDay(ms = Date.now()) {
  return new Date(ms + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function dateBounds(params = {}) {
  const today = bangkokDay();
  let to = validDay(params.to) ? params.to : today;
  let from = validDay(params.from) ? params.from : bangkokDay(Date.now() - 29 * DAY_MS);
  let start = Date.parse(`${from}T00:00:00+07:00`);
  let end = Date.parse(`${to}T00:00:00+07:00`) + DAY_MS;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    to = today;
    from = bangkokDay(Date.now() - 29 * DAY_MS);
    start = Date.parse(`${from}T00:00:00+07:00`);
    end = Date.parse(`${to}T00:00:00+07:00`) + DAY_MS;
  }
  if ((end - start) / DAY_MS > MAX_RANGE_DAYS) {
    start = end - MAX_RANGE_DAYS * DAY_MS;
    from = bangkokDay(start);
  }
  return { from, to, start, end };
}

function rowNumbers(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    if (typeof value === 'number' || value == null) out[key] = value;
    else {
      const numeric = Number(value);
      out[key] = value !== '' && Number.isFinite(numeric) ? numeric : value;
    }
  }
  return out;
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator * 100 / denominator).toFixed(1)) : 0;
}

export async function readAnalyticsStats(db, params = {}) {
  await ensureAnalyticsSchema(db);
  const now = Date.now();
  const staleBefore = now - STALE_AFTER_MS;
  await db.batch([
    db.prepare(`UPDATE c7_analytics_matches SET status = 'ABANDONED', updated_at = ?
      WHERE status = 'STARTED' AND started_at < ?`).bind(now, staleBefore),
    db.prepare(`UPDATE c7_analytics_series SET status = 'ABANDONED', ended_at = ?,
      duration_ms = MAX(0, ? - started_at), updated_at = ?
      WHERE status = 'STARTED' AND started_at < ?`).bind(now, now, now, staleBefore),
  ]);

  const bounds = dateBounds(params);
  const matchWhere = 'started_at >= ? AND started_at < ?';
  const bindRange = statement => statement.bind(bounds.start, bounds.end);

  const [totalsRes, botRes, onlineRes, seriesRes, colorRes, cardsRes, resultRes, dailyRes] = await Promise.all([
    bindRange(db.prepare(`SELECT
      COUNT(*) AS started,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'ABANDONED' THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN status = 'STARTED' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'COMPLETED' AND winner = 'DRAW' THEN 1 ELSE 0 END) AS draws,
      AVG(CASE WHEN status = 'COMPLETED' THEN rounds END) AS avg_rounds,
      AVG(CASE WHEN status = 'COMPLETED' THEN duration_ms END) AS avg_duration_ms
      FROM c7_analytics_matches WHERE ${matchWhere}`)).first(),
    bindRange(db.prepare(`SELECT bot_level AS level,
      COUNT(*) AS started,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'ABANDONED' THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN status = 'COMPLETED' AND winner = 'HUMAN' THEN 1 ELSE 0 END) AS human_wins,
      SUM(CASE WHEN status = 'COMPLETED' AND winner = 'BOT' THEN 1 ELSE 0 END) AS bot_wins,
      SUM(CASE WHEN status = 'COMPLETED' AND winner = 'DRAW' THEN 1 ELSE 0 END) AS draws,
      AVG(CASE WHEN status = 'COMPLETED' THEN rounds END) AS avg_rounds,
      AVG(CASE WHEN status = 'COMPLETED' THEN duration_ms END) AS avg_duration_ms
      FROM c7_analytics_matches WHERE source = 'BOT' AND ${matchWhere}
      GROUP BY bot_level ORDER BY bot_level`)).all(),
    bindRange(db.prepare(`SELECT format,
      COUNT(*) AS started,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'ABANDONED' THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN status = 'COMPLETED' AND winner = 'DRAW' THEN 1 ELSE 0 END) AS draws,
      AVG(CASE WHEN status = 'COMPLETED' THEN rounds END) AS avg_rounds,
      AVG(CASE WHEN status = 'COMPLETED' THEN duration_ms END) AS avg_duration_ms
      FROM c7_analytics_matches WHERE source = 'ONLINE' AND ${matchWhere}
      GROUP BY format ORDER BY format`)).all(),
    db.prepare(`SELECT s.format,
      COUNT(*) AS started,
      SUM(CASE WHEN s.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN s.status = 'ABANDONED' THEN 1 ELSE 0 END) AS abandoned,
      AVG(CASE WHEN s.status = 'COMPLETED' THEN s.duration_ms END) AS avg_duration_ms,
      AVG(CASE WHEN s.status = 'COMPLETED' THEN (
        SELECT COUNT(*) FROM c7_analytics_matches m WHERE m.series_id = s.series_id AND m.status = 'COMPLETED'
      ) END) AS avg_matches
      FROM c7_analytics_series s
      WHERE s.started_at >= ? AND s.started_at < ?
      GROUP BY s.format ORDER BY s.format`).bind(bounds.start, bounds.end).all(),
    bindRange(db.prepare(`SELECT
      SUM(played_red) AS played_red, SUM(played_green) AS played_green,
      SUM(played_blue) AS played_blue, SUM(played_silver) AS played_silver,
      SUM(discarded_red) AS discarded_red, SUM(discarded_green) AS discarded_green,
      SUM(discarded_blue) AS discarded_blue, SUM(discarded_silver) AS discarded_silver
      FROM c7_analytics_matches WHERE status = 'COMPLETED' AND ${matchWhere}`)).first(),
    db.prepare(`SELECT e.card_id, e.color,
      SUM(CASE WHEN e.event_type = 'PLAYED' THEN e.n ELSE 0 END) AS played,
      SUM(CASE WHEN e.event_type = 'DISCARDED' THEN e.n ELSE 0 END) AS discarded,
      SUM(e.n) AS total
      FROM c7_analytics_card_events e
      JOIN c7_analytics_matches m ON m.match_id = e.match_id
      WHERE m.status = 'COMPLETED' AND m.started_at >= ? AND m.started_at < ?
      GROUP BY e.card_id, e.color
      ORDER BY total DESC, played DESC, e.card_id ASC LIMIT 24`).bind(bounds.start, bounds.end).all(),
    bindRange(db.prepare(`SELECT COALESCE(result_type, 'UNKNOWN') AS result_type, COUNT(*) AS n
      FROM c7_analytics_matches WHERE status = 'COMPLETED' AND ${matchWhere}
      GROUP BY result_type ORDER BY n DESC`)).all(),
    bindRange(db.prepare(`SELECT date(started_at / 1000, 'unixepoch', '+7 hours') AS day,
      COUNT(*) AS started,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'ABANDONED' THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN source = 'BOT' THEN 1 ELSE 0 END) AS bot_started,
      SUM(CASE WHEN source = 'BOT' AND status = 'COMPLETED' THEN 1 ELSE 0 END) AS bot_completed,
      SUM(CASE WHEN source = 'ONLINE' THEN 1 ELSE 0 END) AS online_started,
      SUM(CASE WHEN source = 'ONLINE' AND status = 'COMPLETED' THEN 1 ELSE 0 END) AS online_completed,
      SUM(CASE WHEN source = 'BOT' AND bot_level = 'easy' AND status = 'COMPLETED' AND winner = 'HUMAN' THEN 1 ELSE 0 END) AS easy_human_wins,
      SUM(CASE WHEN source = 'BOT' AND bot_level = 'easy' AND status = 'COMPLETED' THEN 1 ELSE 0 END) AS easy_completed,
      SUM(CASE WHEN source = 'BOT' AND bot_level = 'hard' AND status = 'COMPLETED' AND winner = 'HUMAN' THEN 1 ELSE 0 END) AS hard_human_wins,
      SUM(CASE WHEN source = 'BOT' AND bot_level = 'hard' AND status = 'COMPLETED' THEN 1 ELSE 0 END) AS hard_completed
      FROM c7_analytics_matches WHERE ${matchWhere}
      GROUP BY day ORDER BY day ASC`)).all(),
  ]);

  const totals = rowNumbers(totalsRes || {});
  totals.started ||= 0; totals.completed ||= 0; totals.abandoned ||= 0; totals.active ||= 0;
  totals.draws ||= 0; totals.avg_rounds ||= 0; totals.avg_duration_ms ||= 0;
  totals.completion_rate = rate(totals.completed, totals.started);
  totals.draw_rate = rate(totals.draws, totals.completed);

  const bot = (botRes.results || []).map(row => {
    const item = rowNumbers(row);
    item.completion_rate = rate(item.completed || 0, item.started || 0);
    item.human_win_rate = rate(item.human_wins || 0, item.completed || 0);
    return item;
  });
  const online = (onlineRes.results || []).map(row => {
    const item = rowNumbers(row);
    item.completion_rate = rate(item.completed || 0, item.started || 0);
    item.draw_rate = rate(item.draws || 0, item.completed || 0);
    return item;
  });
  const series = (seriesRes.results || []).map(row => {
    const item = rowNumbers(row);
    item.completion_rate = rate(item.completed || 0, item.started || 0);
    return item;
  });

  const colorRow = rowNumbers(colorRes || {});
  const colors = {};
  let totalPlayed = 0;
  for (const color of COLORS) totalPlayed += Number(colorRow[`played_${color.toLowerCase()}`] || 0);
  for (const color of COLORS) {
    const key = color.toLowerCase();
    const played = Number(colorRow[`played_${key}`] || 0);
    const discarded = Number(colorRow[`discarded_${key}`] || 0);
    colors[color] = { played, discarded, total: played + discarded, play_share: rate(played, totalPlayed) };
  }

  return {
    ok: true,
    timezone: 'Asia/Bangkok',
    generatedAt: now,
    range: { from: bounds.from, to: bounds.to },
    totals,
    bot,
    online,
    series,
    colors,
    topCards: (cardsRes.results || []).map(rowNumbers),
    resultTypes: (resultRes.results || []).map(rowNumbers),
    daily: (dailyRes.results || []).map(row => {
      const item = rowNumbers(row);
      item.easy_human_win_rate = rate(item.easy_human_wins || 0, item.easy_completed || 0);
      item.hard_human_win_rate = rate(item.hard_human_wins || 0, item.hard_completed || 0);
      item.completion_rate = rate(item.completed || 0, item.started || 0);
      return item;
    }),
    definitions: {
      match: 'หนึ่ง CORE7 Match; DOUBLE และ SET มีหลาย Matches ในหนึ่งชุดแข่งขัน',
      completed: 'Match ที่ได้ผลลัพธ์หรือจบด้วยการยอมแพ้',
      abandoned: 'Match ที่เริ่มแล้วไม่มีผลลัพธ์เกิน 8 ชั่วโมง',
      colors: 'นับการ์ดของทั้งสองฝั่งเฉพาะ Match ที่เล่นจบ แยก Played และ Extra Discard',
    },
  };
}
