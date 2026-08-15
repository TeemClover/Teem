/* XTY party creation v2
   New quota identity is intentionally separate from the legacy party counters.
   Logged-in players are counted by stable MY member number on the server. */

import { getProfile, MESSAGE_BUDGETS, DEFAULT_BUDGET } from './store.js';

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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Server state is canonical. Private mode may simply lose the warm cache.
  }
}

function remember(result) {
  const party = result?.party;
  if (!party?.code) return party || null;

  const parties = read(K_PARTIES, []);
  const list = Array.isArray(parties) ? parties : [];
  const index = list.findIndex(item => item?.code === party.code);
  if (index >= 0) list[index] = party;
  else list.unshift(party);
  write(K_PARTIES, list);

  const tokens = read(K_TOKENS, {});
  const map = tokens && typeof tokens === 'object' && !Array.isArray(tokens) ? tokens : {};
  map[party.code] = {
    token: result.token || map[party.code]?.token || '',
    userId: result.meUserId || map[party.code]?.userId || '',
    quotaSystem: 'v2',
  };
  write(K_TOKENS, map);

  return party;
}

export async function createPartyV2({
  name, activity, activityId, preset, verificationMode = 'trust', durationDays, color, visibility,
  commitRule, budget, petId, coverType = 'avatar', leadCardId, npcCardId, partyAvatar,
}) {
  const profile = getProfile();
  if (!profile) {
    const error = new Error('NO_PROFILE');
    error.code = 'NO_PROFILE';
    throw error;
  }

  let response;
  try {
    response = await fetch('/api/xty-party-finish?op=create-v2', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        name,
        activity,
        activityId,
        preset,
        verificationMode,
        durationDays,
        color,
        visibility,
        commitRule,
        budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
        petId: petId || null,
        coverType,
        leadCardId: leadCardId || null,
        npcCardId: npcCardId || null,
        alias: profile.alias,
        avatar: partyAvatar?.species || profile.avatarId || profile.avatarFallback,
        avatarColor: partyAvatar?.color || profile.avatarFrame || 'green',
        profileId: profile.id,
        quotaSystem: 'v2',
      }),
    });
  } catch {
    const error = new Error('OFFLINE');
    error.code = 'OFFLINE';
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const code = result.error || `HTTP_${response.status}`;
    const error = new Error(code);
    error.code = code;
    error.detail = result;
    throw error;
  }

  return remember(result);
}
