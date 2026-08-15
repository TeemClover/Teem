/* XTY join v2
   Joining and creating are separate capacities. This path never uses the
   legacy combined ACTIVE_PARTY_LIMIT pre-check. */

import { getProfile } from './store.js';

const K_PARTIES = 'mc_xty_parties';
const K_TOKENS = 'mc_xty_tokens';

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

function remember(result) {
  const party = result?.party;
  if (!party?.code) return result;

  const cached = read(K_PARTIES, []);
  const parties = Array.isArray(cached) ? cached : [];
  const index = parties.findIndex(item => item?.code === party.code);
  if (index >= 0) parties[index] = party;
  else parties.unshift(party);
  write(K_PARTIES, parties);

  const cachedTokens = read(K_TOKENS, {});
  const tokens = cachedTokens && typeof cachedTokens === 'object' && !Array.isArray(cachedTokens) ? cachedTokens : {};
  tokens[party.code] = {
    token: result.token || tokenFor(party.code),
    userId: result.meUserId || tokens[party.code]?.userId || '',
    quotaSystem: 'v2-separated',
  };
  write(K_TOKENS, tokens);

  return { ...result, party };
}

export async function joinPartyV2(code, { alias, avatar, avatarColor } = {}) {
  const wanted = String(code || '').replace(/\D/g, '').slice(0, 5);
  if (!/^\d{5}$/.test(wanted)) return { ok: false, error: 'INVALID_CODE' };

  const profile = getProfile();
  if (!profile) return { ok: false, error: 'NO_PROFILE' };

  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const oldToken = tokenFor(wanted);
  if (oldToken) headers.authorization = `Bearer ${oldToken}`;

  let response;
  try {
    response = await fetch(`/api/xty-party-finish?op=join-v2&code=${encodeURIComponent(wanted)}`, {
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
    return { ...result, ok: false, error: result.error || `HTTP_${response.status}` };
  }
  return remember(result);
}
