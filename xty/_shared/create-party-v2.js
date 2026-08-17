/* XTY party creation v2 client
   Server creation now routes through cover-aware v3 while keeping the
   existing quota-v2 persistence model. */

import { memberAvatarValue } from './card-picker.js';
import {
  activePartyUsage, getProfile, MESSAGE_BUDGETS, DEFAULT_BUDGET, myPartyCodes, refreshParty,
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
    if (intro) intro.textContent = 'LV.1 เลือก Pet เป็นเพื่อนร่วมทางได้ · Animal Card จะเปิดหลัง Quest Clear';
  }
}

function renderNoCreateSlot(profile, usage) {
  const main = document.querySelector('main.create-page');
  if (!main || document.getElementById('xtyCreateCapacityGate')) return;
  main.querySelectorAll(':scope > .notebook-card, :scope > .advanced-card, :scope > #go, :scope > .note')
    .forEach(node => { node.hidden = true; });
  const panel = document.createElement('section');
  panel.id = 'xtyCreateCapacityGate';
  panel.className = 'card';
  const level = Math.max(1, Number(profile?.level || 1));
  panel.innerHTML = `<p class="kicker">PARTY SLOT</p><h2 class="title" style="font-size:26px">ไม่มีการ์ดสร้างตี้เหลือ</h2>`
    + `<p class="lede">ตอนนี้ใช้ช่องสร้างตี้ ${usage.owned}/${usage.maxOwned} อยู่ · LV.${level} ต้องจบหรือยุบตี้เดิมก่อน แล้วช่องจะคืนกลับมาเต็ม</p>`
    + `<a class="btn gold" href="/xty/">กลับไปดูตี้ของฉัน</a>`;
  const lede = main.querySelector(':scope > .lede');
  if (lede) lede.insertAdjacentElement('afterend', panel); else main.prepend(panel);
}

async function installCreatePageGuard() {
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

  /* Revalidate every locally-known membership before deciding capacity.
     This is what makes an admin dissolve immediately give the device its
     owner/join slots back instead of leaving stale ACTIVE localStorage. */
  await Promise.all(myPartyCodes().map(code => refreshParty(code).catch(() => null)));
  profile = getProfile() || profile;
  const usage = activePartyUsage(profile);
  if (usage.owned >= usage.maxOwned) renderNoCreateSlot(profile, usage);
  else if (Math.max(1, Number(profile.level || 1)) <= 1) levelOneCover(profile);
}

if (onCreatePage()) installCreatePageGuard().catch(() => {});

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
  const finalNpcCardId = levelOne ? null : (npcCardId || null);
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
