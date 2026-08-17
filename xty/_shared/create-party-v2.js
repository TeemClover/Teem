/* XTY party creation v2 client
   Server creation now routes through cover-aware v3 while keeping the
   existing quota-v2 persistence model. */

import { memberAvatarValue } from './card-picker.js';
import {
  getProfile, MESSAGE_BUDGETS, DEFAULT_BUDGET, myPartyCodes, refreshParty,
} from './store.js';
import { avatarById } from './avatars.js';
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

function onCreatePage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return /^\/xty\/new\/?$/.test(location.pathname);
}

function levelOneCover(profile) {
  window.__xtyCoverV2 = { coverType: 'avatar', leadCardId: null, core7CardId: null };
  const section = document.getElementById('coverSection');
  if (!section || !profile) return;

  const avatar = avatarById(profile.avatarId || profile.avatarFallback || 'orange_cat');
  section.innerHTML = `
    <span class="step-sticker">1</span>
    <h2>การ์ดผู้นำตี้</h2>
    <p class="whisper" id="coverHint">LV.1 ใช้การ์ดตัวละครเริ่มต้นของคุณเป็นผู้นำตี้อัตโนมัติ</p>
    <div class="card-select-grid" id="leadPick" role="group" aria-label="การ์ดผู้นำตี้เริ่มต้น">
      <div class="card-select picked" role="img" aria-label="ใช้ ${avatar.nameTh} เป็นผู้นำตี้">
        <div class="avatar-cover" data-color="${profile.avatarFrame || 'green'}">
          <img src="${avatar.art}" alt="">
          <b>${avatar.nameTh}</b>
          <small>LV.1 PARTY LEAD</small>
        </div>
      </div>
    </div>`;

  const npcPick = document.getElementById('npcCardPick');
  if (npcPick) {
    npcPick.hidden = true;
    const label = npcPick.previousElementSibling;
    if (label?.classList?.contains('label')) label.hidden = true;
    const companionSection = npcPick.closest('.notebook-card');
    const intro = companionSection?.querySelector(':scope > .whisper');
    if (intro) intro.textContent = 'เลือก Pet ได้ตามปกติ · ถ้ามี Animal Card ใน Collection ใช้เป็นสกินของ Pet ได้';
  }
}

async function installCreatePageSetup() {
  if (!onCreatePage()) return;
  let profile = getProfile();
  if (!profile) return;

  const level = Math.max(1, Number(profile.level || 1));
  if (level <= 1) {
    const cover = document.getElementById('coverSection');
    if (cover) cover.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      levelOneCover(getProfile() || profile);
      if (cover) cover.style.visibility = '';
    });
  }

  /* Refresh locally-known memberships for accurate display, but deliberately
     never block owner creation because owned > maxOwned. The displayed slot
     entitlement stays unchanged, so an intentionally over-limit player may
     legitimately show 2/1, 3/1, etc. Merge/Sync must never destroy parties
     merely to make the count fit the nominal entitlement. */
  await Promise.all(myPartyCodes().map(code => refreshParty(code).catch(() => null)));
  profile = getProfile() || profile;
  if (Math.max(1, Number(profile.level || 1)) <= 1) levelOneCover(profile);
}

if (onCreatePage()) installCreatePageSetup().catch(() => {});

export async function createPartyV2(options = {}) {
  const applied = applyXircleCreateDefaults(options);
  const {
    name, activity, activityId, preset, verificationMode = 'trust', durationDays, color, visibility,
    commitRule, budget, petId, coverType = 'card_back', leadCardId, npcCardId, partyAvatar, core7CardId,
  } = applied;

  const profile = getProfile();
  if (!profile) { const error = new Error('NO_PROFILE'); error.code = 'NO_PROFILE'; throw error; }

  const levelOne = Math.max(1, Number(profile.level || 1)) <= 1;
  const override = typeof window !== 'undefined' && window.__xtyCoverV2 ? window.__xtyCoverV2 : null;
  const finalCoverType = levelOne ? 'avatar' : (override?.coverType || coverType || 'card_back');
  const finalLeadCardId = levelOne
    ? null
    : (override && Object.prototype.hasOwnProperty.call(override, 'leadCardId') ? override.leadCardId : leadCardId);
  const finalCore7CardId = levelOne ? null : (override?.core7CardId || core7CardId || null);
  /* Pet cards are skins at every level. The card already carries its species,
     so LV.1 must not silently discard a Collection choice. */
  const finalNpcCardId = npcCardId || null;
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
        leadCardId: finalLeadCardId,
        core7CardId: finalCore7CardId,
        npcCardId: finalNpcCardId,
        alias: profile.alias,
        avatar: partyAvatar?.species || memberAvatarValue(profile),
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