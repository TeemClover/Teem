import { getProfile, createProfile, updateProfile, importServerCardReward, TEAMBOOK_PROFILE_KEY } from '../_shared/store.js';
import { syncXtyProfile } from '../_shared/account.js';
import { TEAMBOOK_AVATARS } from '../_shared/avatars.js';
import { cardById } from '../_shared/cards.js';
import { claimAndPersist, courseRevealPath, persistedReward, COURSE_QUEST } from './bridge.js';

const $ = id => document.getElementById(id);
const TOKEN_KEY = 'teambook_course_card_receipt_v1';
const SUCCESS_KEY = 'teambook_course_card_saved_v1';
const entry = window.__COURSE_CARD_ENTRY__ || {};
delete window.__COURSE_CARD_ENTRY__;
let token = entry.token || '';
let busy = false;

function storedProfile() {
  try { return JSON.parse(localStorage.getItem(TEAMBOOK_PROFILE_KEY) || 'null'); } catch { return null; }
}
function storageReady() {
  const key = 'teambook_course_card_storage_probe';
  try { localStorage.setItem(key, '1'); const ok = localStorage.getItem(key) === '1'; localStorage.removeItem(key); return ok; } catch { return false; }
}
function readSaved() {
  try { return JSON.parse(sessionStorage.getItem(SUCCESS_KEY) || 'null'); } catch { return null; }
}
function showError(code) {
  const messages = {
    RECEIPT_EXPIRED: 'ลิงก์รับการ์ดหมดอายุแล้ว กลับไปที่หน้าผลประเมินเพื่อตรวจสิทธิ์ หรือเข้าสมุดด้านล่างได้เลย',
    CLAIMED_BY_ANOTHER_PROFILE: 'ลิงก์นี้รับการ์ดกับโปรไฟล์อื่นแล้ว เปิดจากเบราว์เซอร์เดิมที่รับการ์ด หรือเข้าสมุดด้านล่างได้เลย',
    INVALID_RECEIPT: 'ยังไม่พบสิทธิ์รับการ์ด เปิดจากปุ่มรับการ์ดในหน้าผลประเมินอีกครั้ง หรือเข้าสมุดด้านล่างได้เลย',
    PROFILE_CHANGED: 'โปรไฟล์เปลี่ยนระหว่างรับการ์ด เปิดหน้านี้อีกครั้งจากเบราว์เซอร์เดิมเพื่อใช้โปรไฟล์ที่รับสิทธิ์ไว้',
    STORAGE_FAILED: 'ยังเก็บการ์ดในเครื่องนี้ไม่ได้ ลองเปิดด้วย Safari หรือ Chrome ที่อนุญาตให้เก็บข้อมูล แล้วใช้ลิงก์รับการ์ดเดิมอีกครั้ง',
    NETWORK: 'ยังติดต่อหน้ารับการ์ดไม่สำเร็จ ลองอีกครั้งได้ โดยสิทธิ์เดิมจะไม่ถูกสุ่มใหม่',
  };
  $('error').textContent = messages[code] || 'ยังรับการ์ดไม่สำเร็จ ลองอีกครั้งได้ หรือเข้าสมุดด้านล่างก่อน';
  $('error').hidden = false;
}
function showProfile() {
  const profile = getProfile();
  $('new-profile').hidden = !!profile?.alias;
  $('existing-profile').hidden = !profile?.alias;
  $('existing-profile').textContent = profile?.alias ? `รับการ์ดให้ ${profile.alias}` : '';
  $('alias').required = !profile?.alias;
  $('claim-button').textContent = profile?.alias ? 'รับการ์ดของฉัน →' : 'ตั้งชื่อแล้วรับการ์ด →';
  $('claim-form').hidden = false;
}
function showSuccess(reward) {
  $('claim-form').hidden = true;
  $('error').hidden = true;
  $('reload').hidden = true;
  $('status').textContent = 'การ์ดของคุณพร้อมเปิดแล้ว';
  $('open-card').href = courseRevealPath(reward);
  $('success').hidden = false;
  $('save-state').textContent = 'เก็บการ์ดในเครื่องนี้แล้ว';
  // Local success is already established. An account save is optional and must not block opening the card.
  syncXtyProfile({ recoverParties: false }).then(result => {
    if (result?.ok && result.authenticated) $('save-state').textContent = 'เก็บการ์ดในเครื่องนี้และบัญชี TeamBook แล้ว';
    else if (result?.authenticated) $('save-state').textContent = 'เก็บในเครื่องนี้แล้ว · ยังเก็บกับบัญชีไม่สำเร็จ เปิดการ์ดต่อได้';
  }).catch(() => {});
}

for (const avatar of TEAMBOOK_AVATARS) {
  const option = document.createElement('option');
  option.value = avatar.id;
  option.textContent = `${avatar.fallback} ${avatar.nameTh}`;
  $('avatar').append(option);
}

$('claim-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  $('error').hidden = true;
  if (!storageReady()) { showError('STORAGE_FAILED'); return; }
  let profile = getProfile();
  if (!profile?.alias) {
    const alias = $('alias').value.trim();
    if (!alias) { $('alias').focus(); return; }
    profile = profile?.id ? updateProfile({ alias })
      : createProfile({ alias, avatarId: $('avatar').value, avatarFrame: 'green' });
  }
  if (storedProfile()?.id !== profile?.id) { showError('STORAGE_FAILED'); return; }
  busy = true;
  $('claim-button').disabled = true;
  $('claim-button').textContent = 'กำลังรับการ์ด…';
  $('status').textContent = 'กำลังเก็บการ์ดให้คุณ';
  try {
    const reward = await claimAndPersist({ token, profileId: profile.id,
      getStoredProfile: storedProfile, importReward: importServerCardReward, cardById });
    try {
      sessionStorage.setItem(SUCCESS_KEY, JSON.stringify(reward));
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
    token = '';
    showSuccess(reward);
    $('open-card').focus();
  } catch (error) {
    $('status').textContent = 'ยังรับการ์ดไม่เสร็จ';
    showError(error.code);
    showProfile();
  } finally {
    busy = false;
    $('claim-button').disabled = false;
  }
});
$('reload').addEventListener('click', () => location.reload());

async function boot() {
  if (entry.invalid) { $('status').textContent = 'เปิดจากหน้าผลประเมินเพื่อรับการ์ด'; showError('INVALID_RECEIPT'); return; }
  if (!storageReady()) { $('status').textContent = 'ยังเก็บการ์ดในเครื่องนี้ไม่ได้'; showError('STORAGE_FAILED'); return; }
  try { await syncXtyProfile({ recoverParties: false }); } catch {}
  const saved = readSaved();
  if (!token && saved?.questId === COURSE_QUEST && persistedReward(storedProfile(), saved)) { showSuccess(saved); return; }
  if (!token) { $('status').textContent = 'เปิดจากหน้าผลประเมินเพื่อรับการ์ด'; showError('INVALID_RECEIPT'); return; }
  $('status').textContent = 'เลือกโปรไฟล์แล้วรับการ์ดได้เลย';
  showProfile();
}
boot().catch(() => {
  $('status').textContent = 'ยังเตรียมโปรไฟล์ไม่สำเร็จ';
  showError('UNAVAILABLE'); $('reload').hidden = false;
});
