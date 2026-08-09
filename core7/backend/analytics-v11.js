import {
  readAnalyticsStats,
  ensureAnalyticsSchema,
  CARD_EVENTS_TABLE_SQL,
  CARD_EVENTS_INDEX_SQL,
} from './analytics.js';
import { colorOf, FIRST_HAND } from '../js/cards.js';
import { ACTS, ACHIEVEMENTS, STAGES, stageOrder } from '../../assets/achievements.js';

export const CORE7_ANALYTICS_VERSION = '1.5.0';
export const CORE7_GAME_VERSION = '0.5';

const COLORS = ['RED', 'GREEN', 'BLUE', 'SILVER'];

/* ── เส้นทาง First Run ──
   ลำดับที่คนเดินจากประตูหน้าแรกไปจนจบบทที่ 7 เก็บไว้ที่เดียวเพราะทั้งชุด
   event ที่ยอมรับ ทั้งลำดับบนกราฟ และป้ายที่คนอ่าน ต้องมาจากแหล่งเดียวกัน
   ไม่งั้นเพิ่มขั้นใหม่แล้วลืมแก้ที่ใดที่หนึ่ง กราฟจะโกหกเงียบ ๆ

   หน้าเว็บฝั่ง Journey ยังไม่มี ตัวรับข้อมูลมาก่อนโดยตั้งใจ — event ที่ไม่ได้
   เก็บวันนี้ คือข้อมูลที่ย้อนกลับไปเก็บไม่ได้ตลอดไป */
export const JOURNEY_STEPS = Object.freeze([
  { event: 'JOURNEY_START', th: 'เข้าประตูหน้าแรก' },
  { event: 'PROLOGUE_COMPLETE', th: 'อ่านบทนำจบ' },
  { event: 'FORGE_EP_1_COMPLETE', th: 'จบ EP1' },
  { event: 'FORGE_EP_2_COMPLETE', th: 'จบ EP2' },
  { event: 'FORGE_EP_3_COMPLETE', th: 'จบ EP3' },
  { event: 'FORGE_EP_4_COMPLETE', th: 'จบ EP4' },
  { event: 'FORGE_EP_5_COMPLETE', th: 'จบ EP5' },
  { event: 'FORGE_EP_6_COMPLETE', th: 'จบ EP6' },
  { event: 'FORGE_EP_7_COMPLETE', th: 'จบ EP7' },
  { event: 'SAVEPOINT_BLACKSMITH', th: 'รับ BLACKSMITH' },
  { event: 'QUICK_WALKTHROUGH_COMPLETE', th: 'อ่าน Walkthrough จบ' },
  { event: 'CORE7_ONBOARDING_START', th: 'เริ่มเล่น CORE7' },
  { event: 'CORE7_ONBOARDING_COMPLETE', th: 'เล่น CORE7 จบ' },
  { event: 'LOADOUT_VIEW', th: 'เห็นหน้า Loadout' },
  { event: 'LESSON_1_START', th: 'เริ่มบทที่ 1' },
  { event: 'LESSON_1_COMPLETE', th: 'เรียนจบบทที่ 1' },
  { event: 'LESSON_2_COMPLETE', th: 'เรียนจบบทที่ 2' },
  { event: 'LESSON_3_COMPLETE', th: 'เรียนจบบทที่ 3' },
  { event: 'LESSON_4_COMPLETE', th: 'เรียนจบบทที่ 4' },
  { event: 'LESSON_5_COMPLETE', th: 'เรียนจบบทที่ 5' },
  { event: 'LESSON_6_COMPLETE', th: 'เรียนจบบทที่ 6' },
  { event: 'BOSS_7_OPEN', th: 'เปิดบทที่ 7' },
  { event: 'BOSS_7_COMPLETE', th: 'อ่านบทที่ 7 จบ' },
]);

/* สมุดเป็น Side Quest ในบท 7 จึงแยกออกจากเส้นหลัก ถ้าเอาไปคั่นใน
   JOURNEY_STEPS คนที่ตั้งใจข้ามสมุดจะถูกอ่านว่า "หลุด" ทั้งที่เดิน Main Quest
   ต่อถูกต้องแล้ว */
export const NOTEBOOK_STEPS = Object.freeze([
  { event: 'NOTEBOOK_OPEN', th: 'เปิดสมุดเล่มเก่า' },
  { event: 'NOTEBOOK_RESTORED', th: 'ซ่อมสมุดด้วย RESTORE' },
  { event: 'SECRET_END_COMPLETE', th: 'อ่าน Secret Ending จบ' },
  { event: 'NOTEBOOK_BUMP_COMPLETE', th: 'ชนมือ WELL PLAYED' },
]);

/* ทางเข้าที่ยอมรับ — 'forge' คือเดินตามเส้น Journey มา ค่าอื่นถูกทิ้งเป็น null */
const ENTRIES = new Set(['forge']);

const EVENTS = new Set([
  'CORE7_VIEW', 'HAND_VIEW', 'HAND_READY', 'MATCH_START', 'MATCH_COMPLETE', 'REMATCH',
  /* v1.2 — การ์ด FIRST HAND ที่ถูกเปิดใหม่หลังจบ Match ยิงมาที่นี่ ใบละหนึ่ง event */
  'CARD_UNLOCK',
  /* v1.3–v1.4 — เส้นทาง First Run ตั้งแต่ประตูหน้าแรกถึงจบบทที่ 7 */
  ...JOURNEY_STEPS.map(step => step.event),
  /* v1.4 — Side Quest สมุดหลังบท 7 แยกกราฟจาก Main Quest */
  ...NOTEBOOK_STEPS.map(step => step.event),
  /* v1.3 — การกระทำเล็ก ๆ กับ Achievement ตัวไหนถูกทำ/ปลด อยู่ที่คอลัมน์ ref
     ใช้สองชนิดนี้แทนการเพิ่ม event type ใหม่ทุกครั้งที่มีปุ่มใหม่ */
  'ACT', 'ACHIEVEMENT_UNLOCK',
]);
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

/* ตารางเดิมสร้างไปแล้วบน D1 จริง CREATE TABLE IF NOT EXISTS เลยไม่เติมคอลัมน์ให้
   ต้อง ALTER เอง และกลืน error "duplicate column" ทิ้ง เพราะรันซ้ำทุก request */
const MIGRATIONS = [
  `ALTER TABLE c7_analytics_events ADD COLUMN card_id TEXT`,
  /* v1.3 — คนเข้ามาทางไหน: 'forge' คือเดินมาตามเส้น Journey ส่วน null คือ
     เข้า /core7/ เองหรือได้ลิงก์จากเพื่อน ตัวเกมเปิดให้ทุกคนเหมือนเดิม
     แฟล็กนี้มีไว้แยกตัวเลขตอนอ่าน ไม่ได้ใช้กั้นใคร */
  `ALTER TABLE c7_analytics_events ADD COLUMN entry TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_c7_events_entry ON c7_analytics_events(entry, event_type, occurred_at)`,
  /* v1.3 — "อันไหน" ของ event ที่ต้องระบุตัว: act id หรือ achievement id
     แยกจาก card_id เพราะความหมายคนละเรื่อง และ card_id ถูกใช้ไปแล้ว */
  `ALTER TABLE c7_analytics_events ADD COLUMN ref TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_c7_events_ref ON c7_analytics_events(event_type, ref, occurred_at)`,
];


/* ── GRAY → SILVER ──
   สีที่สี่เปลี่ยนชื่อทั้งระบบ ของที่เก็บไว้แล้วต้องตามมาด้วย ไม่งั้นสถิติจะแตก
   เป็นสองก้อน (GRAY เก่า + SILVER ใหม่) แล้วอ่านค่าไหนก็ผิดทั้งคู่

   แยกจาก MIGRATIONS ข้างบนเพราะแตะตารางของ analytics v1 ด้วย ต้องมั่นใจว่า
   ทั้งสอง schema ถูกสร้างครบก่อน ไม่งั้น ALTER จะยิงใส่ตารางที่ยังไม่มี แล้ว
   error ถูกกลืนไปเงียบ ๆ โดยไม่มีใครรู้ว่าไม่ได้แปลง

   RENAME COLUMN error ถ้ารันไปแล้วหรือตารางเพิ่งสร้างใหม่ด้วยชื่อใหม่
   ส่วน UPDATE รันซ้ำได้ เพราะ WHERE จะไม่เจอแถวแล้ว */
const SILVER_MIGRATIONS = [
  `ALTER TABLE c7_analytics_matches RENAME COLUMN played_gray TO played_silver`,
  `ALTER TABLE c7_analytics_matches RENAME COLUMN discarded_gray TO discarded_silver`,
  `UPDATE c7_analytics_color_outcomes SET color = 'SILVER' WHERE color = 'GRAY'`,
  `UPDATE c7_analytics_card_picks SET color = 'SILVER' WHERE color = 'GRAY'`,
  `UPDATE c7_analytics_card_picks SET card_id = REPLACE(card_id, 'fh-gray-', 'fh-silver-') WHERE card_id LIKE 'fh-gray-%'`,
  `UPDATE c7_analytics_card_picks SET card_id = 'gen-silver' WHERE card_id = 'gen-gray'`,
  `UPDATE c7_analytics_events SET card_id = REPLACE(card_id, 'fh-gray-', 'fh-silver-') WHERE card_id LIKE 'fh-gray-%'`,
  `UPDATE c7_analytics_events SET card_id = 'gen-silver' WHERE card_id = 'gen-gray'`,
  `UPDATE c7_analytics_matches SET result_type = 'TIEBREAK_FINAL_SILVER' WHERE result_type = 'TIEBREAK_FINAL_GRAY'`,
  `UPDATE c7_analytics_matches SET result_type = 'TIEBREAK_FEWER_SILVER' WHERE result_type = 'TIEBREAK_FEWER_GRAY'`,
  /* ห้องที่ยังเปิดค้างอยู่เก็บ state ทั้งก้อนเป็น JSON — ถ้าไม่แปลง คนที่กำลัง
     เล่นอยู่ตอน deploy จะเห็นการ์ด ⚙️ หายไปทั้งมือ เพราะ id ไม่ตรงกับสำรับใหม่ */
  `UPDATE c7_beta_rooms SET state_json = REPLACE(state_json, 'fh-gray-', 'fh-silver-') WHERE state_json LIKE '%fh-gray-%'`,
  `UPDATE c7_beta_rooms SET state_json = REPLACE(state_json, 'gen-gray', 'gen-silver') WHERE state_json LIKE '%gen-gray%'`,
  `UPDATE c7_beta_rooms SET state_json = REPLACE(state_json, '"GRAY"', '"SILVER"') WHERE state_json LIKE '%"GRAY"%'`,
];

/* c7_analytics_card_events มี CHECK(color IN (...)) ที่เขียนชื่อสีไว้ตรง ๆ ของจริง
   บน D1 ถูกสร้างตอนที่สีที่สี่ยังชื่อ GRAY แปลว่าตารางนั้นตอนนี้ "ห้าม" ค่า SILVER
   อยู่ ทั้ง UPDATE ของเก่าและ INSERT ของใหม่จะถูกปฏิเสธทั้งคู่ — และเงียบด้วย
   เพราะทุกอย่างที่นี่ถูกครอบ try ไว้

   SQLite แก้ CHECK ในที่เดิมไม่ได้ ต้องสร้างตารางใหม่แล้วย้ายข้อมูล ทำใน batch
   เดียวเพราะ D1 รัน batch เป็น transaction — ถ้าล้มกลางทางจะไม่เหลือสภาพที่
   ตารางถูก rename ทิ้งไว้แล้วไม่มีตัวจริง

   SUM(n) + GROUP BY เผื่อกรณีที่แถว GRAY กับ SILVER ชนกันหลังแปลง id: รวมยอด
   ไม่ใช่ทิ้งใบใดใบหนึ่ง */
async function rebuildCardEventsForSilver(db) {
  const row = await db.prepare(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'c7_analytics_card_events'`,
  ).first();
  const ddl = String(row?.sql || '');
  if (!ddl || !/GRAY/i.test(ddl)) return false;

  await db.batch([
    db.prepare(`ALTER TABLE c7_analytics_card_events RENAME TO c7_analytics_card_events_gray`),
    db.prepare(CARD_EVENTS_TABLE_SQL),
    db.prepare(`INSERT INTO c7_analytics_card_events (match_id, card_id, color, event_type, n)
      SELECT match_id,
             CASE WHEN card_id = 'gen-gray' THEN 'gen-silver'
                  WHEN card_id LIKE 'fh-gray-%' THEN REPLACE(card_id, 'fh-gray-', 'fh-silver-')
                  ELSE card_id END,
             CASE WHEN color = 'GRAY' THEN 'SILVER' ELSE color END,
             event_type,
             SUM(n)
      FROM c7_analytics_card_events_gray
      GROUP BY 1, 2, 3, 4`),
    db.prepare(`DROP TABLE c7_analytics_card_events_gray`),
    db.prepare(CARD_EVENTS_INDEX_SQL),
  ]);
  return true;
}

let silverDone = false;

export async function migrateSilverDatabase(db) {
  if (silverDone) return { ok: true, skipped: true };
  await ensureAnalyticsSchema(db);
  await ensureAnalyticsV11Schema(db);

  /* ทำก่อน UPDATE ก้อนล่าง เพราะตราบใดที่ CHECK เก่ายังอยู่ แถวสี SILVER
     เขียนลงตารางนั้นไม่ได้เลย */
  let rebuilt = false;
  try { rebuilt = await rebuildCardEventsForSilver(db); }
  catch (error) { console.error('CORE7 card_events rebuild failed', error); }

  let applied = 0;
  const failed = [];
  for (const sql of SILVER_MIGRATIONS) {
    try { await db.prepare(sql).run(); applied += 1; }
    catch { failed.push(sql.slice(0, 60)); }
  }
  silverDone = true;
  /* ที่ล้มส่วนใหญ่คือของที่แปลงไปแล้ว (RENAME COLUMN ซ้ำ) แต่คืนออกมาให้เห็น
     ดีกว่ากลืนทิ้ง — เวลามีอะไรผิดจริงจะได้มีร่องรอย */
  return { ok: true, applied, rebuilt, failed };
}

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
  for (const sql of MIGRATIONS) {
    try { await db.prepare(sql).run(); } catch { /* คอลัมน์มีอยู่แล้ว */ }
  }
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
      game_version, rules_version, occurred_at, created_at, card_id, entry, ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    eventId, installId, eventType,
    safeText(payload.path, 160) || null,
    safeText(payload.mode, 24) || null,
    safeText(payload.botLevel, 12) || null,
    safeId(payload.matchId) || null,
    safeText(payload.gameVersion, 24) || CORE7_GAME_VERSION,
    safeText(payload.rulesVersion, 24) || null,
    occurredAt, now,
    safeId(payload.cardId) || null,
    /* จำกัดชุดค่าไว้ ไม่ให้กลายเป็นถังขยะที่ใครยัดอะไรก็ได้เข้ามา */
    ENTRIES.has(String(payload.entry || '').toLowerCase())
      ? String(payload.entry).toLowerCase() : null,
    /* ไม่เช็คกับทะเบียนตรงนี้ — id ที่ถูกเปลี่ยนชื่อทีหลังต้องไม่ทำให้ข้อมูล
       ที่ยิงมาแล้วหายไป หน้าสถิติจะแยกโชว์ของที่ไม่รู้จักให้เห็นเองว่ามีอะไรค้าง */
    safeId(payload.ref) || null,
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
  const [activeRow, newRow, returningRow, matchUsersRow, rematchRow, funnelRes, versionsRes, colorsRes, picksRes, healthRes, dailyRes, unlockRow, unlockCardsRes, selectUnlockRow] = await Promise.all([
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
      COUNT(DISTINCT CASE WHEN event_type='MATCH_COMPLETE' THEN match_id END) match_completes,
      COUNT(CASE WHEN event_type='CARD_UNLOCK' THEN 1 END) card_unlocks
      FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ? GROUP BY day ORDER BY day`).bind(b.start, b.end).all(),
    db.prepare(`SELECT COUNT(*) unlocks, COUNT(DISTINCT install_id) players,
      COUNT(DISTINCT card_id) distinct_cards
      FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND occurred_at >= ? AND occurred_at < ?`).bind(b.start, b.end).first(),
    db.prepare(`SELECT card_id, COUNT(*) unlocks, COUNT(DISTINCT install_id) players
      FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND card_id IS NOT NULL
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY card_id ORDER BY unlocks DESC, card_id LIMIT 28`).bind(b.start, b.end).all(),
    db.prepare(`SELECT COUNT(DISTINCT install_id) n FROM (
      SELECT install_id FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND occurred_at >= ? AND occurred_at < ?
      GROUP BY install_id HAVING COUNT(DISTINCT card_id) >= 7
    )`).bind(b.start, b.end).first(),
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
    cardUnlocks: {
      unlocks: Number(unlockRow?.unlocks || 0),
      players: Number(unlockRow?.players || 0),
      distinct_cards: Number(unlockRow?.distinct_cards || 0),
      select_unlocked_players: Number(selectUnlockRow?.n || 0),
      /* ต่อหัวได้กี่ใบ — บอกว่าคนเล่นซ้ำจนสะสมจริงหรือเปิดใบเดียวแล้วหาย */
      per_player: Number(unlockRow?.players || 0)
        ? Number((Number(unlockRow.unlocks) / Number(unlockRow.players)).toFixed(2)) : 0,
      /* สุ่มแจกทีละใบไม่ซ้ำ ถ้าตัวเลขนี้เอียงมากแปลว่า RNG มีปัญหา */
      cards: (unlockCardsRes.results || []).map(nums),
    },
    samplePolicy: { minimum: 20, text: 'เปอร์เซ็นต์ Balance จะแสดงคำเตือนเมื่อ Sample ต่ำกว่า 20 Matches/Hands' },
    patches: [
      { date:'2026-07-31', version:'v0.1', title:'One-prompt birth' },
      { date:'2026-08-01', version:'Manual Patch', title:'Cosmetic + face-up card fix' },
      { date:'2026-08-02', version:'v0.3 Beta', title:'Real multiplayer' },
      { date:'2026-08-03', version:'v0.4.6', title:'MATCH / DOUBLE / SET + Stat v1.1' },
      { date:'2026-08-04', version:'v0.5', title:'สองภาษาทั้งเว็บ · Card Unlock Stat · กราฟรายวัน' },
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

/* ── Journey Funnel ──
   คนหลุดตรงไหนระหว่างประตูหน้าแรกกับตอนจบบทที่ 7 และ Side Quest สมุด

   นับ "เครื่องที่ผ่านขั้นนี้" ไม่ใช่จำนวน event เพราะคนกดซ้ำหรือ refresh ได้
   และไม่บังคับว่าต้องผ่านขั้นก่อนหน้าจริง — ถ้าตัวเลขขั้นหลังมากกว่าขั้นหน้า
   นั่นแปลว่ามีทางลัดที่ไม่ได้ตั้งใจ ซึ่งเป็นเรื่องที่ต้องเห็น ไม่ใช่เรื่องที่
   ต้องกลบด้วยการบังคับให้กราฟลดทางเดียว */
export async function readJourneyFunnel(db, params = {}) {
  await ensureAnalyticsV11Schema(db);
  const b = bounds(params);
  const types = JOURNEY_STEPS.map(s => s.event);
  const holes = types.map(() => '?').join(',');

  const notebookTypes = NOTEBOOK_STEPS.map(s => s.event);
  const notebookHoles = notebookTypes.map(() => '?').join(',');

  const [stepsRes, entryRes, dailyRes, homeRes, notebookRes, bossToBumpRes,
    forgeNavSummaryRes, forgeNavEpisodeRes, forgeNavDailyRes] = await Promise.all([
    db.prepare(`SELECT event_type, COUNT(DISTINCT install_id) users, COUNT(*) events,
      MIN(occurred_at) first_at, MAX(occurred_at) last_at
      FROM c7_analytics_events
      WHERE event_type IN (${holes}) AND occurred_at >= ? AND occurred_at < ?
      GROUP BY event_type`).bind(...types, b.start, b.end).all(),
    /* CORE7 เปิดให้ทุกคนเข้าได้ ตัวเลขจึงต้องแยกว่าใครเดินมาตามเส้น
       ใครเข้าเองหรือได้ลิงก์จากเพื่อน ไม่งั้นอ่าน conversion ผิดทั้งกระดาน */
    db.prepare(`SELECT COALESCE(entry,'direct') entry,
      COUNT(DISTINCT install_id) users,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_START' THEN install_id END) match_players,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_COMPLETE' THEN install_id END) finishers
      FROM c7_analytics_events
      WHERE occurred_at >= ? AND occurred_at < ?
      GROUP BY COALESCE(entry,'direct')`).bind(b.start, b.end).all(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day,
      COUNT(DISTINCT CASE WHEN event_type='JOURNEY_START' THEN install_id END) started,
      COUNT(DISTINCT CASE WHEN event_type='ACT' AND ref='home-video' THEN install_id END) watched_video,
      COUNT(DISTINCT CASE WHEN event_type='LESSON_1_START' THEN install_id END) reached_lesson,
      COUNT(DISTINCT CASE WHEN event_type='BOSS_7_COMPLETE' THEN install_id END) boss_completed,
      COUNT(DISTINCT CASE WHEN event_type='NOTEBOOK_OPEN' THEN install_id END) notebook_opened,
      COUNT(DISTINCT CASE WHEN event_type='NOTEBOOK_BUMP_COMPLETE' THEN install_id END) bumped
      FROM c7_analytics_events
      WHERE (event_type IN ('JOURNEY_START','LESSON_1_START','BOSS_7_COMPLETE','NOTEBOOK_OPEN','NOTEBOOK_BUMP_COMPLETE')
        OR (event_type='ACT' AND ref='home-video'))
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY day ORDER BY day`).bind(b.start, b.end).all(),
    /* เส้นทางหน้าแรกต้องดูเป็น cohort ต่อเครื่อง ไม่ใช่แค่ยอดคลิกแยกกัน
       ไม่งั้นตอบไม่ได้ว่าคนดูวิดีโอคือคนเดียวกับคนที่เข้าบ้านหรือไม่ */
    db.prepare(`WITH home AS (
      SELECT install_id,
        MIN(CASE WHEN ref='home-open' THEN occurred_at END) opened_at,
        MIN(CASE WHEN ref='home-video' THEN occurred_at END) video_at,
        MIN(CASE WHEN ref='hall-open' THEN occurred_at END) hall_at
      FROM c7_analytics_events
      WHERE event_type='ACT' AND ref IN ('home-open','home-video','hall-open')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY install_id
    )
    SELECT
      COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) visitors,
      COUNT(CASE WHEN opened_at IS NOT NULL AND video_at IS NOT NULL THEN 1 END) watched_video,
      COUNT(CASE WHEN opened_at IS NOT NULL AND hall_at IS NOT NULL
        AND (video_at IS NULL OR hall_at < video_at) THEN 1 END) entered_direct,
      COUNT(CASE WHEN opened_at IS NOT NULL AND video_at IS NOT NULL
        AND hall_at IS NOT NULL AND video_at <= hall_at THEN 1 END) video_then_hall,
      COUNT(CASE WHEN opened_at IS NOT NULL AND video_at IS NOT NULL
        AND (hall_at IS NULL OR hall_at < video_at) THEN 1 END) video_without_hall
    FROM home`).bind(b.start, b.end).first(),
    db.prepare(`SELECT event_type, COUNT(DISTINCT install_id) users, COUNT(*) events,
      MIN(occurred_at) first_at, MAX(occurred_at) last_at
      FROM c7_analytics_events
      WHERE event_type IN (${notebookHoles}) AND occurred_at >= ? AND occurred_at < ?
      GROUP BY event_type`).bind(...notebookTypes, b.start, b.end).all(),
    db.prepare(`WITH flags AS (
      SELECT install_id,
        MAX(CASE WHEN event_type='BOSS_7_COMPLETE' THEN 1 ELSE 0 END) boss_done,
        MAX(CASE WHEN event_type='NOTEBOOK_BUMP_COMPLETE' THEN 1 ELSE 0 END) bumped
      FROM c7_analytics_events
      WHERE event_type IN ('BOSS_7_COMPLETE','NOTEBOOK_BUMP_COMPLETE')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY install_id
    )
    SELECT SUM(boss_done) boss_completed,
      SUM(CASE WHEN boss_done=1 AND bumped=1 THEN 1 ELSE 0 END) bumped_after_boss
    FROM flags`).bind(b.start, b.end).first(),
    db.prepare(`SELECT ref method, COUNT(DISTINCT install_id) users, COUNT(*) events
      FROM c7_analytics_events
      WHERE event_type='ACT' AND ref IN ('forge-next-button','forge-next-scroll')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY ref`).bind(b.start, b.end).all(),
    db.prepare(`SELECT path, ref method, COUNT(DISTINCT install_id) users, COUNT(*) events
      FROM c7_analytics_events
      WHERE event_type='ACT' AND ref IN ('forge-next-button','forge-next-scroll')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY path, ref ORDER BY path, ref`).bind(b.start, b.end).all(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day, ref method,
      COUNT(DISTINCT install_id) users, COUNT(*) events
      FROM c7_analytics_events
      WHERE event_type='ACT' AND ref IN ('forge-next-button','forge-next-scroll')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY day, ref ORDER BY day, ref`).bind(b.start, b.end).all(),
  ]);

  const rows = new Map((stepsRes.results || []).map(r => [String(r.event_type), nums(r)]));
  const first = Number(rows.get(types[0])?.users || 0);
  let prev = 0;
  const steps = JOURNEY_STEPS.map((step, index) => {
    const row = rows.get(step.event) || {};
    const users = Number(row.users || 0);
    const out = {
      event: step.event,
      th: step.th,
      index,
      users,
      events: Number(row.events || 0),
      /* เทียบกับขั้นแรก = เส้น 100% ของกราฟ */
      share: rate(users, first),
      /* กี่ % ของคนที่ผ่านขั้นก่อนหน้า แล้วมาถึงขั้นนี้ */
      step_rate: index === 0 ? 100 : rate(users, prev),
      lost: index === 0 ? 0 : Math.max(0, prev - users),
      first_at: Number(row.first_at || 0) || null,
      last_at: Number(row.last_at || 0) || null,
    };
    prev = users;
    return out;
  });

  /* ขั้นที่คนหายเยอะสุด — ข้ามขั้นที่ยังไม่มีใครไปถึงเลย เพราะนั่นคือปลายทาง
     ที่ยังไม่เปิด ไม่ใช่รูรั่ว เท่ากันเอาขั้นที่มาก่อน */
  let worst = null;
  for (const step of steps) {
    if (!step.index || !step.users) continue;
    if (!worst || step.lost > worst.lost) {
      worst = { event: step.event, th: step.th, lost: step.lost, step_rate: step.step_rate };
    }
  }

  const last = steps[steps.length - 1];
  const home = nums(homeRes || {});
  home.video_rate = rate(home.watched_video, home.visitors);
  home.direct_rate = rate(home.entered_direct, home.visitors);
  home.video_then_hall_rate = rate(home.video_then_hall, home.visitors);
  home.video_to_hall_rate = rate(home.video_then_hall, home.watched_video);
  home.video_without_hall_rate = rate(home.video_without_hall, home.watched_video);

  const notebookRows = new Map((notebookRes.results || []).map(r => [String(r.event_type), nums(r)]));
  const notebookBase = Number(notebookRows.get(notebookTypes[0])?.users || 0);
  let notebookPrev = 0;
  const notebookSteps = NOTEBOOK_STEPS.map((step, index) => {
    const row = notebookRows.get(step.event) || {};
    const users = Number(row.users || 0);
    const out = {
      event: step.event, th: step.th, index, users,
      events: Number(row.events || 0),
      share: rate(users, notebookBase),
      step_rate: index === 0 ? 100 : rate(users, notebookPrev),
      lost: index === 0 ? 0 : Math.max(0, notebookPrev - users),
      first_at: Number(row.first_at || 0) || null,
      last_at: Number(row.last_at || 0) || null,
    };
    notebookPrev = users;
    return out;
  });
  const secret = nums(bossToBumpRes || {});
  secret.boss_to_bump_rate = rate(secret.bumped_after_boss, secret.boss_completed);
  secret.steps = notebookSteps;

  const navSummaryRows = (forgeNavSummaryRes.results || []).map(nums);
  const navByMethod = Object.fromEntries(navSummaryRows.map(row => [String(row.method), row]));
  const buttonNav = navByMethod['forge-next-button'] || { users: 0, events: 0 };
  const scrollNav = navByMethod['forge-next-scroll'] || { users: 0, events: 0 };
  const navEvents = Number(buttonNav.events || 0) + Number(scrollNav.events || 0);
  const forgeNavigation = {
    button: buttonNav,
    scroll: scrollNav,
    total_events: navEvents,
    button_share: rate(buttonNav.events, navEvents),
    scroll_share: rate(scrollNav.events, navEvents),
    winner: Number(scrollNav.events || 0) > Number(buttonNav.events || 0) ? 'scroll'
      : Number(buttonNav.events || 0) > Number(scrollNav.events || 0) ? 'button' : 'tie',
    byEpisode: (forgeNavEpisodeRes.results || []).map(nums),
    daily: (forgeNavDailyRes.results || []).map(nums),
  };

  return {
    ok: true,
    range: { from: b.from, to: b.to },
    generatedAt: Date.now(),
    analyticsVersion: CORE7_ANALYTICS_VERSION,
    gameVersion: CORE7_GAME_VERSION,
    /* ยังไม่มีหน้าไหนยิง event พวกนี้ — บอกให้ชัดว่าเลขศูนย์แปลว่า
       "ยังไม่ได้ต่อสาย" ไม่ใช่ "ไม่มีคนเดิน" */
    wired: steps.some(s => s.events > 0),
    totals: {
      started: first,
      reached_end: last.users,
      /* ชื่อเก่าเก็บไว้เพื่อไม่ทำ dashboard รุ่นที่ cache อยู่พังระหว่าง deploy */
      reached_lesson: last.users,
      completion_rate: rate(last.users, first),
    },
    home,
    forgeNavigation,
    steps,
    secret,
    dropoff: worst,
    byEntry: (entryRes.results || []).map(row => {
      const r = nums(row);
      r.finish_rate = rate(Number(r.finishers || 0), Number(r.match_players || 0));
      return r;
    }),
    daily: (dailyRes.results || []).map(nums),
  };
}

/* ── Stat Overview ──
   หน้า Dashboard ต้องตอบสองอย่างใน 5 วินาที: วันนี้เกิดอะไรขึ้น และมีอะไร
   ที่ต้องไปดูต่อ ตัวเลขละเอียดอยู่ในหน้าย่อยแล้ว ที่นี่จึงเอาแค่ยอดกับสัญญาณ

   เทียบวันนี้กับเมื่อวานเสมอ เพราะเลขเดี่ยว ๆ อ่านไม่ออกว่าดีหรือแย่
   "วันนี้ 12 คน" ไม่มีความหมายจนกว่าจะรู้ว่าเมื่อวาน 3 หรือ 40

   วันอิงเวลาไทย และ "วันนี้" คือช่วงที่ยังไม่จบ ตัวเลขจึงยังไม่เต็มวัน —
   คืน `partial` ออกไปให้หน้าเว็บบอกผู้อ่านตรง ๆ ไม่ให้เข้าใจผิดว่าวันนี้ตก */
export async function readStatOverview(db) {
  await ensureAnalyticsV11Schema(db);
  const now = Date.now();
  const today = bkkDay(now);
  const yesterday = bkkDay(now - DAY_MS);
  const startOf = day => Date.parse(`${day}T00:00:00+07:00`);
  const todayStart = startOf(today);
  const yStart = startOf(yesterday);

  /* ก้อนเดียวจบ แล้วค่อยแยกวันตอนอ่าน — ยิงสองรอบเปลืองกว่าโดยไม่ได้อะไรเพิ่ม */
  const dayCounts = `
    SELECT
      COUNT(DISTINCT install_id) devices,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_START' THEN match_id END) match_starts,
      COUNT(DISTINCT CASE WHEN event_type='MATCH_COMPLETE' THEN match_id END) match_completes,
      COUNT(CASE WHEN event_type='CARD_UNLOCK' THEN 1 END) card_unlocks,
      COUNT(CASE WHEN event_type='ACT' THEN 1 END) acts,
      COUNT(DISTINCT CASE WHEN event_type='ACHIEVEMENT_UNLOCK' THEN install_id || '|' || COALESCE(ref,'') END) achievements,
      COUNT(DISTINCT CASE WHEN event_type='JOURNEY_START' THEN install_id END) journey_starts,
      COUNT(DISTINCT CASE WHEN event_type='LESSON_1_START' THEN install_id END) lesson_starts
    FROM c7_analytics_events WHERE occurred_at >= ? AND occurred_at < ?`;

  const [todayRow, yRow, newRow, wiringRes, dailyRes] = await Promise.all([
    db.prepare(dayCounts).bind(todayStart, todayStart + DAY_MS).first(),
    db.prepare(dayCounts).bind(yStart, yStart + DAY_MS).first(),
    db.prepare(`SELECT COUNT(*) n FROM c7_analytics_installations
      WHERE first_seen_at >= ? AND first_seen_at < ?`).bind(todayStart, todayStart + DAY_MS).first(),
    /* ตัวรับพร้อมแต่ยังไม่มีใครยิง = ยังไม่ได้ต่อสาย ต้องแยกจาก "ไม่มีคนทำ" */
    db.prepare(`SELECT event_type, COUNT(*) n FROM c7_analytics_events
      WHERE event_type IN ('ACT','ACHIEVEMENT_UNLOCK','JOURNEY_START','CARD_UNLOCK')
      GROUP BY event_type`).all(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day,
      COUNT(DISTINCT install_id) devices
      FROM c7_analytics_events WHERE occurred_at >= ?
      GROUP BY day ORDER BY day`).bind(todayStart - 13 * DAY_MS).all(),
  ]);

  const t = nums(todayRow || {});
  const y = nums(yRow || {});
  const KEYS = ['devices', 'match_starts', 'match_completes', 'card_unlocks',
    'acts', 'achievements', 'journey_starts', 'lesson_starts'];
  const metrics = KEYS.map(key => {
    const nowValue = Number(t[key] || 0);
    const prev = Number(y[key] || 0);
    return {
      key,
      today: nowValue,
      yesterday: prev,
      delta: nowValue - prev,
      /* เมื่อวานเป็นศูนย์แล้ววันนี้มี = ขึ้นจากศูนย์ ไม่ใช่ขึ้นอนันต์ ปล่อยเป็น null
         ให้หน้าเว็บเลือกคำพูดเอง ดีกว่าโชว์ Infinity% */
      change_rate: prev > 0 ? Number((((nowValue - prev) / prev) * 100).toFixed(1)) : null,
    };
  });

  const wiring = Object.fromEntries(
    (wiringRes.results || []).map(r => [String(r.event_type), Number(r.n || 0)]),
  );

  /* สัญญาณที่ควรไปดูต่อ — เรียงจากเรื่องที่ทำให้ข้อมูลผิดก่อน แล้วค่อยเรื่องที่
     แค่ยังไม่ได้ทำ เพราะข้อมูลผิดทำให้ตัดสินใจผิด ส่วนของที่ยังไม่ต่อแค่ยังไม่มีเลข */
  const alerts = [];
  const dupRow = await db.prepare(`SELECT COUNT(*) events,
      COUNT(DISTINCT install_id || '|' || COALESCE(ref,'')) pairs
      FROM c7_analytics_events WHERE event_type='ACHIEVEMENT_UNLOCK'`).first();
  const dupes = Math.max(0, Number(dupRow?.events || 0) - Number(dupRow?.pairs || 0));
  if (dupes > 0) {
    alerts.push({
      level: 'warn', href: '/collection/stat/',
      th: `Achievement ถูกยิงซ้ำ ${dupes} ครั้ง — ปลดได้ครั้งเดียวต่อเครื่อง แปลว่ามีจุดที่ไม่ได้กันไว้`,
    });
  }
  if (!wiring.JOURNEY_START) {
    alerts.push({
      level: 'info', href: '/stat/journey/',
      th: 'Journey ยังไม่ได้ต่อสาย — ยังไม่มีหน้าไหนเรียก reportJourneyStep()',
    });
  }
  if (!wiring.ACHIEVEMENT_UNLOCK) {
    alerts.push({
      level: 'info', href: '/collection/stat/',
      th: 'Achievement ยังไม่ได้ต่อสาย — หน้า Collection ยังคำนวณสดตอน render ไม่ได้ยิง event',
    });
  }
  if (!wiring.ACT) {
    alerts.push({
      level: 'info', href: '/collection/stat/',
      th: 'ยังไม่มีหน้าไหนยิง Act — ใส่ data-mc-act ใน HTML แล้วตัวเลขจะเริ่มไหล',
    });
  }

  return {
    ok: true,
    generatedAt: now,
    today,
    yesterday,
    /* วันนี้ยังไม่จบ ตัวเลขจึงเทียบกับเมื่อวานแบบเต็มวันไม่ได้ตรง ๆ */
    partial: true,
    hoursIntoDay: Number(((now - todayStart) / 3600000).toFixed(1)),
    newDevices: Number(newRow?.n || 0),
    metrics,
    wiring,
    alerts,
    daily: (dailyRes.results || []).map(nums),
    analyticsVersion: CORE7_ANALYTICS_VERSION,
    gameVersion: CORE7_GAME_VERSION,
  };
}

/* ── Achievement & Act Stat ──
   เรียงตาม stage ของเส้นทางจริง ไม่ใช่เรียงตามยอด เพราะคำถามคือ "คนหล่นหาย
   ช่วงไหน" ไม่ใช่ "อะไรดัง" เรียงตามยอดจะเห็นแค่ว่าของต้นทางเยอะเสมอ

   ACT นับสองเลขแยกกัน:
     events = กดกี่ครั้ง  ·  users = กี่เครื่อง
   สองเลขนี้ไม่เท่ากัน และส่วนต่างคือข้อมูล — คนกดวิดีโอ 3 รอบแปลว่าดูจริง
   คนกดครั้งเดียวแล้วหายแปลว่าเปิดมาแล้วปิด

   ACHIEVEMENT ปลดได้ครั้งเดียวต่อเครื่อง สองเลขจึงต้องเท่ากันเสมอ
   ถ้าไม่เท่าคือมีบั๊กที่ฝั่ง client ยิงซ้ำ — คืน `duplicates` ออกมาให้เห็นเลย

   id ที่ไม่มีในทะเบียนไม่ถูกทิ้ง แต่ถูกแยกไปกอง `orphans` เพราะมันแปลว่ามี
   ของที่ถูกเปลี่ยนชื่อหรือลบไปแล้วแต่ข้อมูลเก่ายังอยู่ ต้องเห็น ไม่ใช่หายเงียบ */
export async function readAchievementStats(db, params = {}) {
  await ensureAnalyticsV11Schema(db);
  const b = bounds(params);
  const window = [b.start, b.end];

  const [rowsRes, reachRow, dailyRes] = await Promise.all([
    db.prepare(`SELECT event_type, ref, COUNT(*) events,
      COUNT(DISTINCT install_id) users,
      MIN(occurred_at) first_at, MAX(occurred_at) last_at
      FROM c7_analytics_events
      WHERE event_type IN ('ACT','ACHIEVEMENT_UNLOCK')
        AND ref IS NOT NULL AND ref <> ''
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY event_type, ref`).bind(...window).all(),
    /* ฐานสำหรับคิด % — ทุกเครื่องที่ยิง event อะไรก็ได้เข้ามาในช่วงนี้ */
    db.prepare(`SELECT COUNT(DISTINCT install_id) n FROM c7_analytics_events
      WHERE occurred_at >= ? AND occurred_at < ?`).bind(...window).first(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day,
      COUNT(CASE WHEN event_type='ACT' THEN 1 END) acts,
      COUNT(CASE WHEN event_type='ACHIEVEMENT_UNLOCK' THEN 1 END) unlocks,
      COUNT(DISTINCT install_id) users
      FROM c7_analytics_events
      WHERE event_type IN ('ACT','ACHIEVEMENT_UNLOCK')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY day ORDER BY day`).bind(...window).all(),
  ]);

  const reach = Number(reachRow?.n || 0);
  const seen = new Map();
  for (const row of rowsRes.results || []) {
    seen.set(`${row.event_type}|${row.ref}`, nums(row));
  }

  function build(entry, kind) {
    const row = seen.get(`${kind === 'ACT' ? 'ACT' : 'ACHIEVEMENT_UNLOCK'}|${entry.id}`) || {};
    const users = Number(row.users || 0);
    const events = Number(row.events || 0);
    seen.delete(`${kind === 'ACT' ? 'ACT' : 'ACHIEVEMENT_UNLOCK'}|${entry.id}`);
    return {
      id: entry.id,
      kind,
      stage: entry.stage,
      emoji: entry.emoji,
      th: entry.th,
      en: entry.en,
      secret: !!entry.secret,
      isAchievement: kind === 'ACHIEVEMENT' || !!entry.achievement,
      events,
      users,
      /* ต่อหัวทำซ้ำกี่ครั้ง — ของ achievement ต้องเป็น 1.00 เสมอ */
      per_user: users ? Number((events / users).toFixed(2)) : 0,
      /* % ของเครื่องที่เข้ามาในช่วงนี้ทั้งหมด */
      reach_rate: rate(users, reach),
      /* ยิงเกิน 1 ครั้งต่อเครื่องทั้งที่ปลดได้ครั้งเดียว = บั๊ก */
      duplicates: kind === 'ACHIEVEMENT' ? Math.max(0, events - users) : 0,
      first_at: Number(row.first_at || 0) || null,
      last_at: Number(row.last_at || 0) || null,
    };
  }

  const items = [
    ...ACTS.map(a => build(a, 'ACT')),
    ...ACHIEVEMENTS.map(a => build(a, 'ACHIEVEMENT')),
  ].sort((x, y) => stageOrder(x.stage) - stageOrder(y.stage));

  /* จัดเป็นกลุ่มตาม stage ให้หน้าเว็บวาดตามลำดับเส้นทางได้เลย ไม่ต้องเรียงเอง */
  const stages = STAGES.map(stage => {
    const list = items.filter(i => i.stage === stage.id);
    const touched = list.filter(i => i.users > 0).length;
    return {
      id: stage.id,
      th: stage.th,
      items: list,
      total: list.length,
      touched,
      /* เครื่องที่มากที่สุดในบรรดาของในช่วงนี้ = มีคนมาถึงช่วงนี้กี่เครื่อง */
      users: list.reduce((max, i) => Math.max(max, i.users), 0),
    };
  }).filter(s => s.total > 0);

  const orphans = [...seen.entries()].map(([key, row]) => {
    const [eventType, ref] = key.split('|');
    return { id: ref, kind: eventType === 'ACT' ? 'ACT' : 'ACHIEVEMENT', ...nums(row) };
  });

  return {
    ok: true,
    range: { from: b.from, to: b.to },
    generatedAt: Date.now(),
    analyticsVersion: CORE7_ANALYTICS_VERSION,
    gameVersion: CORE7_GAME_VERSION,
    /* ยังไม่มีหน้าไหนยิงเข้ามา = ยังไม่ได้ต่อสาย ไม่ใช่ไม่มีคนทำ */
    wired: items.some(i => i.events > 0),
    totals: {
      reach,
      tracked: items.length,
      touched: items.filter(i => i.users > 0).length,
      never: items.filter(i => !i.users).length,
      acts: items.filter(i => i.kind === 'ACT').reduce((n, i) => n + i.events, 0),
      unlocks: items.filter(i => i.kind === 'ACHIEVEMENT').reduce((n, i) => n + i.users, 0),
      duplicates: items.reduce((n, i) => n + i.duplicates, 0),
    },
    stages,
    orphans,
    daily: (dailyRes.results || []).map(nums),
  };
}

/* ── Collection Stat ──
   คำถามที่หน้านี้ต้องตอบคือ "คนหลุดตอนไหน" ไม่ใช่ "การ์ดใบไหนดัง"
   ตัวเลขต่อใบเป็นแค่เครื่องมือตรวจ RNG ส่วนของจริงคือ retention:
   มีกี่เครื่องที่เก็บได้ 1 ใบแล้วหายไป กี่เครื่องที่ไปถึง 7 ใบ (ปลดล็อก SELECT)

   นับด้วย install_id แบบสุ่มในเครื่อง ไม่ใช่คน — เปลี่ยนเบราว์เซอร์คือคนละหัว
   ตัวเลขจึงเป็นขอบล่าง อ่านเป็นแนวโน้ม ไม่ใช่จำนวนหัวจริง

   เติมการ์ดที่ยังไม่เคยถูกเปิดให้ครบ 28 ใบจากฝั่งนี้ ไม่ปล่อยให้หน้าเว็บเดาเอง
   ใบที่ไม่เคยโผล่คือสัญญาณ ต้องเห็นเป็นศูนย์ ไม่ใช่หายไปจากตาราง */
export async function readCollectionStats(db, params = {}) {
  await ensureAnalyticsV11Schema(db);
  const b = bounds(params);
  const window = [b.start, b.end];

  const [cardsRes, totalsRow, ladderRes, funnelRes, dailyRes] = await Promise.all([
    db.prepare(`SELECT card_id, COUNT(*) unlocks, COUNT(DISTINCT install_id) players,
      MIN(occurred_at) first_at, MAX(occurred_at) last_at
      FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND card_id IS NOT NULL AND card_id <> ''
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY card_id`).bind(...window).all(),
    db.prepare(`SELECT COUNT(*) unlocks, COUNT(DISTINCT install_id) players,
      COUNT(DISTINCT card_id) distinct_cards
      FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND occurred_at >= ? AND occurred_at < ?`).bind(...window).first(),
    /* กี่เครื่องมีการ์ดกี่ใบ — ฐานของทั้งกราฟ drop-off */
    db.prepare(`SELECT owned, COUNT(*) installs FROM (
        SELECT install_id, COUNT(DISTINCT card_id) owned
        FROM c7_analytics_events
        WHERE event_type='CARD_UNLOCK' AND card_id IS NOT NULL AND card_id <> ''
          AND occurred_at >= ? AND occurred_at < ?
        GROUP BY install_id
      ) GROUP BY owned ORDER BY owned`).bind(...window).all(),
    /* ขั้นก่อนหน้าการ์ดใบแรก — คนหลุดก่อนได้ใบแรกก็ต้องเห็นด้วย */
    db.prepare(`SELECT event_type, COUNT(DISTINCT install_id) users
      FROM c7_analytics_events
      WHERE event_type IN ('CORE7_VIEW','HAND_READY','MATCH_START','MATCH_COMPLETE','CARD_UNLOCK')
        AND occurred_at >= ? AND occurred_at < ?
      GROUP BY event_type`).bind(...window).all(),
    db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') day,
      COUNT(*) unlocks, COUNT(DISTINCT install_id) players
      FROM c7_analytics_events
      WHERE event_type='CARD_UNLOCK' AND occurred_at >= ? AND occurred_at < ?
      GROUP BY day ORDER BY day`).bind(...window).all(),
  ]);

  const byId = new Map((cardsRes.results || []).map(r => [String(r.card_id), nums(r)]));
  const players = Number(totalsRow?.players || 0);
  const cards = FIRST_HAND.map(card => {
    const row = byId.get(card.id) || {};
    const cardPlayers = Number(row.players || 0);
    return {
      card_id: card.id,
      no: card.no,
      color: card.color,
      en: card.en,
      th: card.th,
      unlocks: Number(row.unlocks || 0),
      players: cardPlayers,
      /* สัดส่วนของคนที่เก็บการ์ดอยู่ ไม่ใช่ของคนที่เข้าเว็บ — ตอบว่า
         "ในบรรดาคนที่เริ่มเก็บแล้ว มีกี่ % ที่ได้ใบนี้" */
      owner_rate: rate(cardPlayers, players),
      first_at: Number(row.first_at || 0) || null,
      last_at: Number(row.last_at || 0) || null,
    };
  });

  /* เครื่องที่มีการ์ดอย่างน้อย n ใบ — ไล่จากท้ายมาหน้าเพื่อสะสมย้อนกลับ */
  const ladderRows = (ladderRes.results || []).map(nums);
  const exact = new Map(ladderRows.map(r => [Number(r.owned), Number(r.installs)]));
  const steps = [];
  let atLeast = 0;
  for (let owned = FIRST_HAND.length; owned >= 1; owned -= 1) {
    atLeast += exact.get(owned) || 0;
    steps.unshift({
      owned,
      installs: exact.get(owned) || 0,
      at_least: atLeast,
      /* เทียบกับคนที่ได้ใบแรก = เส้น 100% ของกราฟ */
      share: 0,
      /* กี่ % ของคนที่มาถึงใบก่อนหน้า แล้วไปต่อได้อีกใบ */
      step_rate: 0,
    });
  }
  for (const step of steps) {
    step.share = rate(step.at_least, players);
    const prev = steps[step.owned - 2];
    step.step_rate = prev ? rate(step.at_least, prev.at_least) : 100;
  }

  const funnel = Object.fromEntries(
    (funnelRes.results || []).map(r => [String(r.event_type), Number(r.users || 0)]),
  );

  /* จุดที่คนหายเยอะที่สุด — ชี้ให้ดูก่อน ไม่ต้องไล่อ่านตารางเอง
     ข้ามใบแรกเพราะ step_rate ของมันคือ 100 เสมอ ไม่ใช่ข้อมูล
     ข้ามขั้นที่ at_least เป็นศูนย์ด้วย เพราะนั่นคือปลายบันไดที่ยังไม่มีใครไปถึง
     ไม่ใช่รูรั่ว
     เท่ากันให้เอาใบที่มาก่อน — อุดรูที่อยู่ต้นทางได้คนกลับมามากกว่า */
  let worst = null;
  for (const step of steps) {
    if (step.owned < 2 || !step.at_least) continue;
    const prev = steps[step.owned - 2];
    const lost = (prev?.at_least || 0) - step.at_least;
    if (!worst || lost > worst.lost) worst = { owned: step.owned, lost, step_rate: step.step_rate };
  }

  return {
    ok: true,
    range: { from: b.from, to: b.to },
    generatedAt: Date.now(),
    analyticsVersion: CORE7_ANALYTICS_VERSION,
    gameVersion: CORE7_GAME_VERSION,
    totalCards: FIRST_HAND.length,
    selectUnlockAt: 7,
    totals: {
      unlocks: Number(totalsRow?.unlocks || 0),
      players,
      distinct_cards: Number(totalsRow?.distinct_cards || 0),
      never_unlocked: cards.filter(c => !c.unlocks).length,
      per_player: players ? Number((Number(totalsRow.unlocks) / players).toFixed(2)) : 0,
      completed: exact.get(FIRST_HAND.length) || 0,
    },
    funnel,
    steps,
    dropoff: worst,
    cards,
    daily: (dailyRes.results || []).map(nums),
  };
}
