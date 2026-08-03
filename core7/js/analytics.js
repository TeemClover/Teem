const DEFAULT_API_BASE = (/^(www\.)?myclover\.com$/.test(globalThis.location?.hostname || ''))
  ? 'https://teem.pages.dev/api/core7'
  : '/api/core7';

export const CORE7_ANALYTICS_BASE = String(globalThis.C7_CONFIG?.API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');

function post(path, payload) {
  return fetch(`${CORE7_ANALYTICS_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'omit',
  }).then(response => response.ok).catch(() => false);
}

export function reportBotMatchStart({ matchId, level, startedAt = Date.now(), rulesVersion = null }) {
  return post('/analytics/bot/start', { matchId, level, startedAt, rulesVersion });
}

export function reportBotMatchComplete({ state, humanId, level }) {
  if (!state?.matchId || !state?.result || !Array.isArray(state.rounds)) return Promise.resolve(false);
  const humanSeat = state.players?.a?.id === humanId ? 'a'
    : (state.players?.b?.id === humanId ? 'b' : null);
  if (!humanSeat) return Promise.resolve(false);
  const winner = state.result.draw ? 'DRAW'
    : (state.result.winnerSeat === humanSeat ? 'HUMAN' : 'BOT');
  const rounds = state.rounds.map(round => ({
    a: round.a ? { cardId: round.a.cardId, color: round.a.color } : null,
    b: round.b ? { cardId: round.b.cardId, color: round.b.color } : null,
    discards: (round.discards || []).map(card => ({ cardId: card.cardId, color: card.color })),
  }));
  return post('/analytics/bot/complete', {
    matchId: state.matchId,
    level,
    winner,
    resultType: state.result.resultType,
    rulesVersion: state.rulesVersion,
    startedAt: state.startedAt,
    endedAt: state.endedAt || Date.now(),
    rounds,
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
