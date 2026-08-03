const DEFAULT_API_BASE = (/^(www\.)?myclover\.com$/.test(globalThis.location?.hostname || ''))
  ? 'https://teem.pages.dev/api/core7'
  : '/api/core7';

export const CORE7_ANALYTICS_BASE = String(globalThis.C7_CONFIG?.API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
export const CORE7_GAME_VERSION = '0.4.6';
export const CORE7_ANALYTICS_VERSION = '1.1.0';

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

function onceKey(type, matchId) { return `${SENT_PREFIX}${type}:${matchId || location.pathname}`; }
function alreadySent(type, matchId) {
  try { return localStorage.getItem(onceKey(type, matchId)) === '1'; }
  catch { return false; }
}
function markSent(type, matchId) {
  try { localStorage.setItem(onceKey(type, matchId), '1'); } catch { /* private mode */ }
}

export function reportFunnelEvent(eventType, {
  path = globalThis.location?.pathname || '', mode = null, botLevel = null,
  matchId = null, rulesVersion = null, once = false,
} = {}) {
  const type = String(eventType || '').toUpperCase();
  if (once && alreadySent(type, matchId)) return Promise.resolve(true);
  if (once) markSent(type, matchId);
  return post('/analytics/event', {
    eventId: randomId('e'),
    installId: getInstallId(),
    eventType: type,
    path, mode, botLevel, matchId,
    gameVersion: CORE7_GAME_VERSION,
    rulesVersion,
    occurredAt: Date.now(),
  });
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
