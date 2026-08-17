/* XTY party creation v2 client
   Server creation now routes through cover-aware v3 while keeping the
   existing quota-v2 persistence model. */

import { getProfile, MESSAGE_BUDGETS, DEFAULT_BUDGET } from './store.js';
import { applyXircleCreateDefaults } from './xvisor-care.js';

const K_PARTIES = 'mc_xty_parties';
const K_TOKENS = 'mc_xty_tokens';

function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function remember(result) {
  const party = result?.party;
  if (!party?.code) return party || null;
  const parties = read(K_PARTIES, []);
  const list = Array.isArray(parties) ? parties : [];
  const index = list.findIndex(item => item?.code === party.code);
  if (index >= 0) list[index] = party; else list.unshift(party);
  write(K_PARTIES, list);
  const tokens = read(K_TOKENS, {});
  const map = tokens && typeof tokens === 'object' && !Array.isArray(tokens) ? tokens : {};
  map[party.code] = { token: result.token || map[party.code]?.token || '', userId: result.meUserId || map[party.code]?.userId || '', quotaSystem: 'v2' };
  write(K_TOKENS, map);
  return party;
}

export async function createPartyV2(options = {}) {
  const applied = applyXircleCreateDefaults(options);
  const {
    name, activity, activityId, preset, verificationMode = 'trust', durationDays, color, visibility,
    commitRule, budget, petId, coverType = 'card_back', leadCardId, npcCardId, partyAvatar, core7CardId,
  } = applied;

  const profile = getProfile();
  if (!profile) { const error = new Error('NO_PROFILE'); error.code = 'NO_PROFILE'; throw error; }

  const override = typeof window !== 'undefined' && window.__xtyCoverV2 ? window.__xtyCoverV2 : null;
  const finalCoverType = override?.coverType || coverType || 'card_back';
  const finalLeadCardId = override && Object.prototype.hasOwnProperty.call(override, 'leadCardId') ? override.leadCardId : leadCardId;
  const finalCore7CardId = override?.core7CardId || core7CardId || null;
  const finalDurationDays = typeof window !== 'undefined' && Number(window.__xtyDurationOverride)
    ? Number(window.__xtyDurationOverride) : Number(durationDays || 7);
  const finalPreset = typeof window !== 'undefined' && window.__xtyPresetOverride
    ? String(window.__xtyPresetOverride) : preset;
  const activityOverride = typeof window !== 'undefined' && window.__xtyActivityOverride
    ? window.__xtyActivityOverride : null;
  const finalActivityId = activityOverride?.id || activityId;
  const finalActivity = activityOverride?.labelTh || activity;

  let response;
  try {
    response = await fetch('/api/xty-party-finish?op=create-v3', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        name, activity: finalActivity, activityId: finalActivityId, preset: finalPreset, verificationMode, durationDays: finalDurationDays, color, visibility, commitRule,
        budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
        petId: petId || null,
        coverType: finalCoverType,
        leadCardId: finalLeadCardId || null,
        core7CardId: finalCore7CardId || null,
        npcCardId: npcCardId || null,
        alias: profile.alias,
        avatar: partyAvatar?.species || profile.avatarId || profile.avatarFallback,
        avatarColor: partyAvatar?.color || profile.avatarFrame || 'green',
        profileId: profile.id,
        quotaSystem: 'v2',
      }),
    });
  } catch {
    const error = new Error('OFFLINE'); error.code = 'OFFLINE'; throw error;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const code = result.error || `HTTP_${response.status}`;
    const error = new Error(code); error.code = code; error.detail = result; throw error;
  }
  return remember(result);
}
