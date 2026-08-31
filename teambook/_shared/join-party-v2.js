/* TeamBook join v2
   Joining and creating are separate capacities. This path never uses the
   legacy combined ACTIVE_PARTY_LIMIT pre-check. */

import { getProfile } from './store.js';

const K_PARTIES = 'teambook_books_v1';
const K_TOKENS = 'teambook_book_tokens_v1';
const K_PENDING_JOIN = 'teambook_pending_join_v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function tokenFor(code) {
  const map = read(K_TOKENS, {});
  const entry = map && typeof map === 'object' && !Array.isArray(map) ? map[code] : null;
  return typeof entry === 'string' ? entry : (entry?.token || '');
}

function clearPendingJoin() {
  try { localStorage.removeItem(K_PENDING_JOIN); } catch {}
}

function remember(result, fallbackCode = '') {
  const party = result?.party || null;
  const code = String(party?.code || result?.code || fallbackCode || '').toUpperCase();
  if (!code) return result;

  if (party?.code) {
    const cached = read(K_PARTIES, []);
    const parties = Array.isArray(cached) ? cached : [];
    const index = parties.findIndex(item => item?.code === party.code);
    if (index >= 0) parties[index] = party;
    else parties.unshift(party);
    write(K_PARTIES, parties);
  }

  const cachedTokens = read(K_TOKENS, {});
  const tokens = cachedTokens && typeof cachedTokens === 'object' && !Array.isArray(cachedTokens) ? cachedTokens : {};
  tokens[code] = {
    token: result.token || tokenFor(code),
    userId: result.meUserId || tokens[code]?.userId || '',
    quotaSystem: 'v2-separated',
  };
  write(K_TOKENS, tokens);
  if (result.token) clearPendingJoin();

  return party ? { ...result, code, party } : { ...result, code };
}

export async function joinPartyV2(code, {
  alias, avatar, avatarColor,
} = {}) {
  const wanted = String(code || '').replace(/\D/g, '').slice(0, 5);
  if (!/^\d{5}$/.test(wanted)) return { ok: false, error: 'INVALID_CODE' };

  const profile = getProfile();
  if (!profile) return { ok: false, error: 'NO_PROFILE' };

  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const oldToken = tokenFor(wanted);
  if (oldToken) headers.authorization = `Bearer ${oldToken}`;

  const pendingPayload = {
    alias: String(alias || profile.alias || '').trim(),
    avatar: avatar || profile.avatarId || profile.avatarFallback || 'orange_cat',
    avatarColor: avatarColor || profile.avatarFrame || 'green',
  };
  write(K_PENDING_JOIN, { code: wanted, payload: pendingPayload, attemptedAt: new Date().toISOString() });

  let response;
  try {
    response = await fetch(`/api/teambook-party-finish?op=join-v2&code=${encodeURIComponent(wanted)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        alias: String(alias || profile.alias || '').trim(),
        avatar: avatar || profile.avatarId || profile.avatarFallback || 'orange_cat',
        avatarColor: avatarColor || profile.avatarFrame || 'green',
        profileId: profile.id,
        quotaSystem: 'v2-separated',
      }),
    });
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const error = result.error || `HTTP_${response.status}`;
    if (response.status < 500 && !/^HTTP_5/.test(error)) clearPendingJoin();
    return { ...result, ok: false, error };
  }
  const remembered = remember(result, wanted);
  clearPendingJoin();
  return remembered;
}

export async function recoverPendingJoinV2() {
  const pending = read(K_PENDING_JOIN, null);
  if (!pending?.code || !pending?.payload) return { ok: true, recovered: false };
  const attempted = new Date(pending.attemptedAt || 0).getTime();
  if (!Number.isFinite(attempted) || Date.now() - attempted > 24 * 60 * 60 * 1000) {
    clearPendingJoin();
    return { ok: true, recovered: false, expired: true };
  }
  const result = await joinPartyV2(pending.code, pending.payload);
  return result.error ? result : { ...result, recovered: true };
}
