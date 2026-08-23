/* TeamBook book creation v2 client
   V1.2 routes creation through the reusable-card server adapter while keeping
   the existing quota-v2 persistence model. */

import { memberAvatarValue } from './card-picker.js';
import {
  getProfile, MESSAGE_BUDGETS, DEFAULT_BUDGET, myPartyCodes, refreshParty,
} from './store.js';
import { avatarById } from './avatars.js';
import { applyXircleCreateDefaults } from './xvisor-care.js';

const K_PARTIES = 'teambook_books_v1';
const K_TOKENS = 'teambook_book_tokens_v1';
const DEBUG_MAX7_KEY = 'teambook_debug_max_owned_7';
const DEBUG_MAX7_CODE = 'max7books';

function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function debugMaxOwned7Enabled() {
  try { return localStorage.getItem(DEBUG_MAX7_KEY) === '1'; }
  catch { return false; }
}

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
  return /^\/new\/?$/.test(location.pathname);
}

/* The page's visible radio state is the last word at submit time. This closes
   a class of bugs where an enhancement re-renders a choice after the closure
   variable was set, leaving the screen saying Public/Confirm while the payload
   still carries Private/Trust. TeamBook Thai pages are canonical source copy,
   so these labels are stable UI semantics rather than a translation layer. */
function selectedRoomChoices(options) {
  if (!onCreatePage()) return options;
  const visibilityText = String(document.querySelector('#visibilityPick [aria-checked="true"]')?.textContent || '');
  const verificationText = String(document.querySelector('#verificationPick [aria-checked="true"]')?.textContent || '');
  let visibility = options.visibility;
  let verificationMode = options.verificationMode;
  if (visibilityText.includes('สาธารณะ')) visibility = 'public';
  else if (visibilityText.includes('ส่วนตัว')) visibility = 'private';
  if (verificationText.includes('ต้อง') && verificationText.includes('เห็นแล้ว')) verificationMode = 'confirm';
  else if (verificationText.includes('เชื่อใจกัน')) verificationMode = 'trust';
  return { ...options, visibility, verificationMode };
}

function levelOneCover(profile) {
  window.__teambookCoverV2 = { coverType: 'avatar', leadCardId: null };
  window.__xtyCoverV2 = window.__teambookCoverV2;
  const section = document.getElementById('coverSection');
  if (!section || !profile) return;

  const avatar = avatarById(profile.avatarId || profile.avatarFallback || 'orange_cat');
  section.innerHTML = `
    <span class="step-sticker">1</span>
    <h2>ปกสมุดของคุณ</h2>
    <p class="whisper" id="coverHint">Level 1 ใช้การ์ดตัวละครและสีปัจจุบันของคุณเป็นปกอัตโนมัติ · ไม่มีการเลือกปก</p>
    <div class="card-select-grid" id="leadPick" role="group" aria-label="ปกสมุดอัตโนมัติ">
      <div class="card-select" role="img" aria-label="ใช้ ${avatar.nameTh} เป็นปกสมุดอัตโนมัติ">
        <div class="avatar-cover" data-color="${profile.avatarFrame || 'green'}">
          <img src="${avatar.art}" alt="">
          <b>${avatar.nameTh}</b>
          <small>STARTER COVER</small>
        </div>
      </div>
    </div>
    <p class="hint">เปลี่ยน Avatar และสีได้ก่อนสร้างสมุด · เมื่อสร้างแล้ว ปกของสมุดเล่มนี้จะถูกล็อก</p>`;

  const npcPick = document.getElementById('npcCardPick');
  if (npcPick) {
    npcPick.hidden = true;
    const label = npcPick.previousElementSibling;
    if (label?.classList?.contains('label')) label.hidden = true;
    const companionSection = npcPick.closest('.notebook-card');
    const intro = companionSection?.querySelector(':scope > .whisper');
    if (intro) intro.textContent = 'เลือกเพื่อนร่วมทางได้ตามปกติ · ถ้ามีการ์ดในคอลเลกชัน ใช้เป็นสกินของเพื่อนร่วมทางได้';
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
     never block owner creation because owned > maxOwned. */
  await Promise.all(myPartyCodes().map(code => refreshParty(code).catch(() => null)));
  profile = getProfile() || profile;
  if (Math.max(1, Number(profile.level || 1)) <= 1) levelOneCover(profile);
}

if (onCreatePage()) installCreatePageSetup().catch(() => {});

export async function createPartyV2(options = {}) {
  const applied = applyXircleCreateDefaults(selectedRoomChoices(options));
  const {
    name, activity, activityId, preset, verificationMode = 'trust', durationDays, color, visibility,
    activityMode = 'shared', activityDescription = '', activityColor = null, successRule = '',
    commitRule, budget, petId, coverType = 'card_back', leadCardId, npcCardId, partyAvatar,
  } = applied;

  const profile = getProfile();
  if (!profile) { const error = new Error('NO_PROFILE'); error.code = 'NO_PROFILE'; throw error; }

  const levelOne = Math.max(1, Number(profile.level || 1)) <= 1;
  /* new-cover-v3 historically used __xtyCoverV2 while this module used a
     TeamBook-prefixed name. V1.2 accepts both and keeps the public override
     TeamBook-owned. */
  const override = typeof window !== 'undefined'
    ? (window.__teambookCoverV2 || window.__xtyCoverV2 || null)
    : null;
  const finalCoverType = levelOne ? 'avatar' : (override?.coverType || coverType || 'card_back');
  const finalLeadCardId = levelOne
    ? null
    : (override && Object.prototype.hasOwnProperty.call(override, 'leadCardId') ? override.leadCardId : leadCardId);

  /* V1.2 cards are reusable across books. The create-page enhancement can
     choose an owned NPC card even when legacy availableOwnedCards hid it. */
  const npcOverridePresent = typeof window !== 'undefined'
    && Object.prototype.hasOwnProperty.call(window, '__teambookNpcV12');
  const finalNpcCardId = npcOverridePresent ? (window.__teambookNpcV12 || null) : (npcCardId || null);

  /* Cross-book reuse is allowed; double-role placement inside one book is
     not. Refuse this before creating anything so a bad mixed-picker state can
     never leave an invisible active book behind on the server. */
  if (finalLeadCardId && finalNpcCardId
    && String(finalLeadCardId).toUpperCase() === String(finalNpcCardId).toUpperCase()) {
    const error = new Error('INVALID_CARD_PLACEMENT');
    error.code = 'INVALID_CARD_PLACEMENT';
    throw error;
  }

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
    response = await fetch('/api/teambook-v12?action=create', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        name, activity: finalActivity, activityId: finalActivityId, preset: finalPreset, verificationMode, durationDays: finalDurationDays, color, visibility, commitRule,
        activityMode, activityDescription, activityColor, successRule,
        budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
        petId: petId || null,
        coverType: finalCoverType,
        leadCardId: finalLeadCardId,
        npcCardId: finalNpcCardId,
        alias: profile.alias,
        avatar: partyAvatar?.species || memberAvatarValue(profile),
        avatarColor: partyAvatar?.color || profile.avatarFrame || 'green',
        profileId: profile.id,
        quotaSystem: 'v2',
        /* The debug slot toggle is intentionally explicit: the server validates
           the same code before lifting the owned-book cap, so UI and API cannot
           disagree about 1/7 vs the Level entitlement. */
        debugCapacityCode: debugMaxOwned7Enabled() ? DEBUG_MAX7_CODE : null,
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
