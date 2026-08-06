const DEFAULT_API_BASE = (/^(www\.)?myclover\.com$/.test(globalThis.location?.hostname || ''))
  ? 'https://teem.pages.dev/api/core7'
  : '/api/core7';

export const CORE7_ANALYTICS_BASE = String(globalThis.C7_CONFIG?.API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
export const CORE7_GAME_VERSION = '0.5';
export const CORE7_ANALYTICS_VERSION = '1.3.0';

const INSTALL_KEY = 'c7:install_id';
const SENT_PREFIX = 'c7:analytics:sent:';

function randomId(prefix) {
  try { return `${prefix}-${crypto.randomUUID()}`; }
  catch { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}

export function getInstallId() {
  try {
    let id = localStorage.getItem(INSTALL_KEY);
    if (!id) { id = randomId('i'); localStorage.setItem(INSTALL_KEY, id); }
    return id;
  } catch { return randomId('i'); }
}

function post(path, payload) {
  return fetch(`${CORE7_ANALYTICS_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'omit',
  }).then(response => response.ok).catch(() => false);
}

/* กันซ้ำ "ต่อหน้า" — ไม่มี matchId ก็ใช้ path ของหน้าเป็นตัวแยก
   เหมาะกับของอย่าง CORE7_VIEW ที่นับหน้าละครั้ง */
function onceKey(type, matchId) { return `${SENT_PREFIX}${type}:${matchId || location.pathname}`; }
function alreadySent(type, matchId) {
  try { return localStorage.getItem(onceKey(type, matchId)) === '1'; }
  catch { return false; }
}
function markSent(type, matchId) {
  try { localStorage.setItem(onceKey(type, matchId), '1'); } catch { /* private mode */ }
}

/* กันซ้ำ "ต่อเครื่อง" — คีย์ไม่มี path ปนอยู่เลย
   ⚠️ ของที่นับ "กี่เครื่องเดินผ่านขั้นนี้" ต้องใช้ชุดนี้เท่านั้น
   เคยใช้ชุดข้างบนซึ่งตกไปใช้ location.pathname เป็นตัวแยก ผลคือมันกันซ้ำได้
   แค่ตอนอยู่หน้าเดิม พอเดินข้ามหน้าก็นับเป็นคีย์ใหม่แล้วยิงอีกรอบ —
   PROLOGUE_COMPLETE ยิง 23 ครั้งจากการเดินทางรอบเดียว ทั้งที่ควรครั้งเดียว
   ตัวเลข "กี่ครั้ง" กับ "กี่เครื่อง" จึงเพี้ยนกันคนละโลก
   (เทสต์เดิมเปิดหน้าเดิมซ้ำ ๆ เลยผ่าน — ต้องเดินข้ามหน้าถึงจะเห็น) */
function onceDeviceKey(name) { return `${SENT_PREFIX}dev:${name}`; }
function alreadySentOnDevice(name) {
  try { return localStorage.getItem(onceDeviceKey(name)) === '1'; }
  catch { return false; }
}
function markSentOnDevice(name) {
  try { localStorage.setItem(onceDeviceKey(name), '1'); } catch { /* private mode */ }
}

/* ── ทางเข้า ──
   `?entry=forge` บอกว่าคนเดินมาตามเส้น Journey ไม่ได้เข้า /core7/ เอง
   จำไว้ในเครื่องเพราะแฟล็กหลุดทันทีที่กดลิงก์ถัดไป แล้วสถิติจะเห็นครึ่งเดียว

   ไม่ได้ใช้กั้นใคร ตัวเกมยังเปิดให้ทุกคนเข้าตรงได้เหมือนเดิม — มีไว้แยกตัวเลข
   ตอนอ่านอย่างเดียว */
const ENTRY_KEY = 'c7:entry';
const VALID_ENTRIES = new Set(['forge']);

export function getEntry() {
  try {
    const fromUrl = new URLSearchParams(globalThis.location?.search || '').get('entry');
    const value = String(fromUrl || '').toLowerCase();
    if (VALID_ENTRIES.has(value)) { localStorage.setItem(ENTRY_KEY, value); return value; }
    const saved = localStorage.getItem(ENTRY_KEY);
    return VALID_ENTRIES.has(saved) ? saved : null;
  } catch { return null; }
}

/* คนที่เดินจบเส้นแล้วไม่ควรถูกนับเป็น Journey ตลอดไป */
export function clearEntry() {
  try { localStorage.removeItem(ENTRY_KEY); } catch { /* private mode */ }
}

export function reportFunnelEvent(eventType, {
  path = globalThis.location?.pathname || '', mode = null, botLevel = null,
  matchId = null, rulesVersion = null, cardId = null, once = false, entry = undefined,
  ref = null,
} = {}) {
  const type = String(eventType || '').toUpperCase();
  if (once && alreadySent(type, matchId)) return Promise.resolve(true);
  if (once) markSent(type, matchId);
  return post('/analytics/event', {
    eventId: randomId('e'),
    installId: getInstallId(),
    eventType: type,
    path, mode, botLevel, matchId, cardId, ref,
    entry: entry === undefined ? getEntry() : entry,
    gameVersion: CORE7_GAME_VERSION,
    rulesVersion,
    occurredAt: Date.now(),
  });
}

/* ── เส้นทาง First Run ──
   หน้า Journey เรียกอันนี้อันเดียวพอ เช่น reportJourneyStep('FORGE_EP_1_COMPLETE')

   `once` เป็นค่าเริ่มต้น เพราะขั้นพวกนี้วัด "เครื่องที่ผ่านไปแล้ว" ไม่ใช่
   "กดกี่ครั้ง" — คนกด Back แล้วอ่านซ้ำต้องไม่ทำให้ตัวเลขบวม

   ยิงทิ้งไม่รอผล และไม่ throw ออกมา เน็ตล่มต้องไม่ทำให้หน้าเว็บค้าง */
export function reportJourneyStep(step, { once = true, ...rest } = {}) {
  const type = String(step || '').toUpperCase();
  if (!type) return Promise.resolve(false);
  const key = `journey:${type}`;
  if (once && alreadySentOnDevice(key)) return Promise.resolve(true);
  if (once) markSentOnDevice(key);
  return reportFunnelEvent(type, { once: false, ...rest }).catch(() => false);
}

/* การ์ด FIRST HAND ใบใหม่ที่เพิ่งถูกเปิด — ยิงเฉพาะตอนได้ใบใหม่จริง
   ใบซ้ำหรือ Match ที่แจกรางวัลไปแล้วจะไม่มาถึงตรงนี้ */
export function reportCardUnlock({ cardId, matchId = null } = {}) {
  if (!cardId) return Promise.resolve(false);
  return reportFunnelEvent('CARD_UNLOCK', { cardId, matchId });
}

export function reportCore7View(path = globalThis.location?.pathname || '/core7/') {
  const type = path.includes('/hand/') ? 'HAND_VIEW' : 'CORE7_VIEW';
  let seen = false;
  try {
    const key = `c7:view:${type}:${path}`;
    seen = sessionStorage.getItem(key) === '1';
    if (!seen) sessionStorage.setItem(key, '1');
  } catch { /* session storage unavailable */ }
  return seen ? Promise.resolve(true) : reportFunnelEvent(type, { path });
}

export function reportBotMatchStart({ matchId, level, startedAt = Date.now(), rulesVersion = null }) {
  return post('/analytics/bot/start', {
    matchId, level, startedAt, rulesVersion,
    installId: getInstallId(), eventId: randomId('e'),
    gameVersion: CORE7_GAME_VERSION,
  });
}

export function reportBotMatchComplete({ state, humanId, level }) {
  if (!state?.matchId || !state?.result || !Array.isArray(state.rounds)) return Promise.resolve(false);
  const humanSeat = state.players?.a?.id === humanId ? 'a'
    : (state.players?.b?.id === humanId ? 'b' : null);
  if (!humanSeat) return Promise.resolve(false);
  const winner = state.result.draw ? 'DRAW'
    : (state.result.winnerSeat === humanSeat ? 'HUMAN' : 'BOT');
  const rounds = state.rounds.map(round => ({
    result: round.result,
    a: round.a ? { cardId: round.a.cardId, color: round.a.color } : null,
    b: round.b ? { cardId: round.b.cardId, color: round.b.color } : null,
    discards: (round.discards || []).map(card => ({ cardId: card.cardId, color: card.color })),
  }));
  return post('/analytics/bot/complete', {
    matchId: state.matchId,
    level,
    winner,
    humanSeat,
    resultType: state.result.resultType,
    rulesVersion: state.rulesVersion,
    startedAt: state.startedAt,
    endedAt: state.endedAt || Date.now(),
    rounds,
    startingHands: {
      a: (state.players?.a?.hand || []).map(card => card.cardId),
      b: (state.players?.b?.hand || []).map(card => card.cardId),
    },
    installId: getInstallId(),
    eventId: randomId('e'),
    gameVersion: CORE7_GAME_VERSION,
  });
}

export async function fetchCore7Stats({ from, to } = {}) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/stats?${query}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

/* ── การกระทำเล็ก ๆ ──
   กดปุ่ม เปิดหน้า หยิบของ — นับ "กี่ครั้ง" จริง ๆ ไม่กันซ้ำ เพราะจำนวนครั้ง
   คือข้อมูล คนกดวิดีโอ 3 รอบต่างจากคนกดครั้งเดียวแล้วปิด
   (ตัวกันรัวอยู่ที่ assets/track.js ซึ่งกันแค่นิ้วลั่นในหน้าต่างสั้น ๆ) */
export function reportAct(actId, extra = {}) {
  const id = String(actId || '').trim();
  if (!id) return Promise.resolve(false);
  return reportFunnelEvent('ACT', { ...extra, ref: id }).catch(() => false);
}

/* ── Achievement ──
   ปลดได้ครั้งเดียวต่อเครื่อง กันซ้ำที่นี่ด้วย เพราะถ้าหลุดไปสองครั้ง
   ตัวเลข "กี่เครื่อง" กับ "กี่ครั้ง" จะไม่ตรงกันแล้วอ่านไม่ออกว่าอันไหนจริง */
export function reportAchievementUnlock(achievementId, extra = {}) {
  const id = String(achievementId || '').trim();
  if (!id) return Promise.resolve(false);
  const key = `ach:${id}`;
  if (alreadySentOnDevice(key)) return Promise.resolve(true);
  markSentOnDevice(key);
  return reportFunnelEvent('ACHIEVEMENT_UNLOCK', { ...extra, ref: id }).catch(() => false);
}

/* Dashboard — สรุปวันนี้เทียบเมื่อวาน พร้อมสัญญาณที่ควรไปดูต่อ */
export async function fetchCore7Overview() {
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/overview`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

/* Achievement & Act Stat — ของแต่ละชิ้นมีคนทำกี่ครั้ง กี่เครื่อง */
export async function fetchCore7AchievementStats({ from, to } = {}) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/achievement-stats?${query}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

/* Journey Funnel — คนหลุดตรงไหนระหว่างประตูหน้าแรกกับบทที่ 1 */
export async function fetchCore7JourneyStats({ from, to } = {}) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/journey-stats?${query}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

/* Collection Stat — การ์ดแต่ละใบถูกเปิดไปแล้วกี่เครื่อง และคนหลุดที่ใบที่เท่าไหร่ */
export async function fetchCore7CollectionStats({ from, to } = {}) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/collection-stats?${query}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

/* จำนวน Match ที่เล่นไปแล้วทั้งหมด — โชว์บนหน้าแรกของเกม
   เกมที่เล่นไม่จบก็นับ และรวมเกมกับบอทด้วย */
export async function fetchCore7Counters() {
  const response = await fetch(`${CORE7_ANALYTICS_BASE}/counters`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}
