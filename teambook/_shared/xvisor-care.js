/* TeamBook × Xircle — hidden X-VISOR Care mode.
   This module is intentionally separate from normal TeamBook animal personalities.
   Normal TeamBook sharing remains untouched; the special Xircle invite is exposed
   only inside the Lead-only X-VISOR Care Assist surface. */

import { XVISOR_GUIDE } from './xvisor-guide.js';
export { XVISOR_GUIDE } from './xvisor-guide.js';

export const XVISOR_PRESET_ID = 'xircle_xvisor';
export const XIRCLE_PRESET_ID = 'xircle';

export const XVISOR_CARE_CHECKPOINTS = Object.freeze([
  Object.freeze({ key: 'day0', from: 0, to: 0, label: 'DAY 0 · SETUP', member: 'เริ่มจากหนึ่ง Action ที่ทำได้จริง', lead: 'ตั้งเป้าร่วมกัน · เช็กข้อจำกัด · ตกลงว่าอะไรนับเป็น ลงชื่อ · เลือกเพียงหนึ่ง Action' }),
  Object.freeze({ key: 'day1_3', from: 1, to: 3, label: 'DAY 1–3 · MAKE IT WORK', member: 'ยังไม่ต้องเพิ่มอะไร เช็กก่อนว่าสิ่งที่ตั้งไว้ทำจริงได้ไหม', lead: 'ถามว่าอะไรติดขัด แล้วช่วยทำให้ Action เดิมง่ายพอจะเกิดขึ้นจริง' }),
  Object.freeze({ key: 'day7', from: 4, to: 9, label: 'DAY 7 · FIRST REVIEW', member: 'ชมสิ่งที่ทำได้ก่อน แล้วค่อยดู Pattern', lead: 'ดูหนึ่ง Pattern · ชม Behavior · เลือกหนึ่ง Action ที่จะทำต่อ' }),
  Object.freeze({ key: 'day14', from: 10, to: 17, label: 'DAY 14 · ADJUST ONE THING', member: 'ถ้ายังไม่เวิร์ก ไม่ต้องรื้อทั้งชีวิต ปรับแค่หนึ่งอย่าง', lead: 'ถ้า Trend ยังไม่เดิน ให้ปรับเพียงหนึ่ง Action ไม่เปลี่ยนทุกอย่างพร้อมกัน' }),
  Object.freeze({ key: 'day21', from: 18, to: 25, label: 'DAY 21 · KEEP GOING', member: 'ไม่ต้องเปิดเล่มใหม่ แค่ช่วยให้วงไม่หลุด', lead: 'ย้ำความสม่ำเสมอและถามว่าอะไรจะช่วยให้ช่วงท้ายทำต่อได้ง่ายขึ้น' }),
  Object.freeze({ key: 'day28', from: 26, to: 99, label: 'DAY 28 · REVIEW & CONTINUE', member: 'เล่มนี้จบได้ แต่สิ่งที่เรียนรู้เอาไปต่อได้', lead: 'ทบทวนสิ่งที่ทำจริง → Pattern ที่เห็น → เลือก One Action ถัดไป → เปิดเล่มต่อ' }),
]);

export function isXvisorPreset(value) {
  if (typeof value === 'string') return value === XVISOR_PRESET_ID;
  /* Compatibility: early X-VISOR rooms could reach the server with the
     White Cat correctly selected while preset was accidentally stored as
     casual. Treat the canonical hidden PET as sufficient proof so those
     existing rooms keep their Care surface. */
  return value?.preset === XVISOR_PRESET_ID
    || value?.petId === XVISOR_GUIDE.id
    || value?.pet_id === XVISOR_GUIDE.id;
}

export function currentTemplate() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('template') || '';
}

export function isXvisorCreateContext() {
  return currentTemplate() === XVISOR_PRESET_ID;
}

export function isXircleCreateContext() {
  return [XIRCLE_PRESET_ID, XVISOR_PRESET_ID].includes(currentTemplate());
}

export function applyXircleCreateDefaults(options = {}) {
  const template = typeof window !== 'undefined' ? currentTemplate() : '';
  const requested = options.preset || template;

  if (requested === XVISOR_PRESET_ID) {
    return {
      ...options,
      preset: XVISOR_PRESET_ID,
      verificationMode: 'trust',
      durationDays: 28,
      visibility: 'private',
      budget: 'normal',
      petId: XVISOR_GUIDE.id,
      commitRule: String(options.commitRule || '').trim() || 'วันนี้ทำ Action เดียวที่ตกลงกันไว้',
    };
  }

  if (requested === XIRCLE_PRESET_ID) {
    return {
      ...options,
      preset: XIRCLE_PRESET_ID,
      verificationMode: 'trust',
      durationDays: 7,
      visibility: 'private',
      budget: 'normal',
    };
  }

  return options;
}

/* Normal TeamBook invite. Core TeamBook owns the button/handler that uses this route. */
export function directInviteUrl(code, origin = (typeof location !== 'undefined' ? location.origin : 'https://teambook.me')) {
  return `${origin}/join/?c=${encodeURIComponent(code)}`;
}

/* Special X-VISOR invite: recipient plays Xircle first, then Xircle hands the
   saved room code back to TeamBook at the end of the intro. This link is shown only
   inside the white-cat Care Assist card for the Party Lead. */
export function xvisorInviteUrl(code, origin = (typeof location !== 'undefined' ? location.origin : 'https://teambook.me')) {
  return `${origin}/xircle/?xty=${encodeURIComponent(code)}&xvisor=1`;
}

export function careDay(party, now = Date.now()) {
  const start = Date.parse(party?.startAt || party?.createdAt || '');
  if (!Number.isFinite(start)) return 1;
  return Math.max(1, Math.min(Number(party?.durationDays || 28), Math.floor((now - start) / 86400000) + 1));
}

export function careCheckpointForDay(day) {
  const n = Number(day || 1);
  return XVISOR_CARE_CHECKPOINTS.find(item => n >= item.from && n <= item.to) || XVISOR_CARE_CHECKPOINTS[1];
}

function safeLocalParty(code) {
  try {
    const list = JSON.parse(localStorage.getItem('teambook_books_v1') || '[]');
    return Array.isArray(list) ? list.find(item => item?.code === code) || null : null;
  } catch { return null; }
}

function localIdentity(code) {
  try {
    const tokens = JSON.parse(localStorage.getItem('teambook_book_tokens_v1') || '{}');
    const entry = tokens?.[code];
    if (!entry) return { token: '', userId: '' };
    return typeof entry === 'string'
      ? { token: entry, userId: '' }
      : { token: String(entry.token || ''), userId: String(entry.userId || '') };
  } catch { return { token: '', userId: '' }; }
}

function localRole(party) {
  const identity = localIdentity(party.code);
  return party?.members?.find(member => member.userId === identity.userId)?.role || 'member';
}

function countLog(party, names) {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  return (party?.log || []).filter(item => wanted.has(String(item?.kind || item?.type || '').toLowerCase())).length;
}

export function buildXvisorEndingMarkdown(party) {
  const day = careDay(party);
  const checkpoint = careCheckpointForDay(day);
  const members = (party?.members || []).map(member => `- ${member.alias || 'สมาชิก'}${member.role === 'lead' ? ' · X-VISOR / Lead' : ''}`).join('\n') || '- ไม่มีข้อมูลสมาชิก';
  const commits = countLog(party, ['commit']);
  const messages = countLog(party, ['message']);
  const reacts = countLog(party, ['react', 'reaction']);
  const confirms = countLog(party, ['confirm', 'confirmation']);
  const status = String(party?.state || 'ACTIVE').toUpperCase();

  return `# TeamBook × Xircle — X-VISOR Care Ending\n\n` +
    `- Party: ${party?.name || 'X-VISOR Care Quest'}\n` +
    `- Room: ${party?.code || '-'}\n` +
    `- Status: ${status}\n` +
    `- Duration: ${party?.durationDays || 28} days\n` +
    `- Preset: ${XVISOR_PRESET_ID}\n` +
    `- Guide: ${XVISOR_GUIDE.nameTh} — ${XVISOR_GUIDE.persona}\n\n` +
    `## กลไกของ Care ช่วง\n\n` +
    `Xircle ช่วยให้เห็น Pattern และเลือกสิ่งที่จะปรับ ส่วน TeamBook ช่วยให้ Action นั้นเกิดขึ้นจริงกับคนในวง ผ่านการลงชื่อ, ข้อความ และ ส่งกำลังใจ แบบมีขอบเขต\n\n` +
    `**Understand Yesterday → See One Pattern → Choose One Action → Do It → ลงชื่อ → Review → เล่มถัดไป**\n\n` +
    `## จังหวะมาตรฐาน X-VISOR\n\n` +
    XVISOR_CARE_CHECKPOINTS.map(item => `- ${item.label}: ${item.lead}`).join('\n') + `\n\n` +
    `## สมาชิก\n\n${members}\n\n` +
    `## สิ่งที่เกิดขึ้นใน เรื่องในสมุด\n\n` +
    `- Commit: ${commits}\n- Message: ${messages}\n- React: ${reacts}\n- Confirm: ${confirms}\n\n` +
    `## จุดที่วงอยู่ตอนนี้\n\n${checkpoint.label}\n\n${checkpoint.member}\n\n` +
    `## Pattern ที่เห็น\n\n` +
    `> ให้ X-VISOR และสมาชิกเขียนจากสิ่งที่เห็นร่วมกัน ไม่ใช้ไฟล์นี้วินิจฉัยโรคหรือสรุปผลสุขภาพแทนมนุษย์\n\n- \n\n` +
    `## One Action ถัดไป\n\n- \n\n` +
    `## NEXT QUEST\n\n` +
    `นำ One Action ที่ตกลงกันไปเปิดเล่มถัดไป หากยังมีประโยชน์กับชีวิตจริง ไม่จำเป็นต้องเพิ่มความยากทุกครั้ง\n\n` +
    `---\n` +
    `TeamBook ไม่ดึง Weight, Body Fat, HR, HRV, ยา, โรคประจำตัว หรือข้อมูลสุขภาพดิบจาก Xircle เข้ามาในสมุดโดยอัตโนมัติ การดูแลต้องอยู่ในขอบเขตและ Consent ที่เหมาะสม\n`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function guideCardHtml(role, party) {
  const checkpoint = careCheckpointForDay(careDay(party));
  const copy = role === 'lead' ? checkpoint.lead : checkpoint.member;
  return `<div style="display:grid;grid-template-columns:82px 1fr;gap:14px;align-items:center">` +
    `<div class="avatar-cover" data-color="silver" style="margin:0"><img src="${XVISOR_GUIDE.art}" alt=""><b>${XVISOR_GUIDE.nameTh}</b><small>X-VISOR SECRET PET</small></div>` +
    `<div><span class="label">${checkpoint.label}</span><p style="margin:7px 0 4px;font-weight:800">${XVISOR_GUIDE.persona}</p><p class="whisper" style="margin:0">${copy}</p></div></div>`;
}

function enhanceCreatePage() {
  if (!isXvisorCreateContext() || !document.querySelector('.create-page')) return;
  const main = document.querySelector('.create-page');
  if (main.dataset.xvisorReady) return;
  main.dataset.xvisorReady = '1';

  const intro = document.createElement('section');
  intro.className = 'notebook-card';
  intro.innerHTML = `<span class="label">X-VISOR · HIDDEN ROUTE</span>` +
    `<h2 style="margin-top:8px">X-VISOR Care · เล่ม 28 วัน</h2>` +
    `<p class="whisper">สร้างสมุดจาก route นี้แล้ว หลังจากนั้นใช้ TeamBook ตามปกติ · Private · Trust · ข้อความ 3 · Pattern → One Action</p>` +
    guideCardHtml('lead', { startAt: new Date().toISOString(), durationDays: 28 });
  const first = main.querySelector('.notebook-card');
  main.insertBefore(intro, first || main.firstChild);

  const pname = document.getElementById('pname');
  const prule = document.getElementById('prule');
  if (pname && !pname.value.trim()) pname.value = 'X-VISOR Care Quest';
  if (prule && !prule.value.trim()) prule.value = 'วันนี้ทำ Action เดียวที่ตกลงกันไว้';
  pname?.dispatchEvent(new Event('input', { bubbles: true }));
  prule?.dispatchEvent(new Event('input', { bubbles: true }));

  const duration = [...document.querySelectorAll('#durationPick .pill-choice')].find(button => button.querySelector('b')?.textContent.trim() === '28');
  duration?.click();
  const trust = [...document.querySelectorAll('#verificationPick .preset-choice')].find(button => button.textContent.includes('เชื่อใจกัน'));
  trust?.click();
  const priv = [...document.querySelectorAll('#visibilityPick .wide-choice')].find(button => button.textContent.includes('ส่วนตัว'));
  priv?.click();

  const petSection = document.getElementById('petPick')?.closest('.notebook-card');
  if (petSection) {
    const petPick = document.getElementById('petPick');
    const npcPick = document.getElementById('npcCardPick');
    if (petPick) petPick.hidden = true;
    if (npcPick) npcPick.hidden = true;
    petSection.querySelectorAll('.label').forEach(node => { if (node.textContent.includes('ANIMAL CARD')) node.hidden = true; });
    const fixed = document.createElement('div');
    fixed.style.marginTop = '14px';
    fixed.innerHTML = guideCardHtml('lead', { startAt: new Date().toISOString(), durationDays: 28 });
    petSection.insertBefore(fixed, document.getElementById('petHint') || null);
    const hint = document.getElementById('petHint');
    if (hint) hint.textContent = 'แมวขาวเป็น เพื่อนร่วมทาง ลับของ X-VISOR · หลังสร้างสมุด สมาชิกพิมพ์ “แมวขาว” ตามด้วยคำถามเพื่อคุยกับมันได้';
  }
}

async function copySpecialInvite(code, button, status) {
  const url = xvisorInviteUrl(code);
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand('copy');
      input.remove();
    } catch { copied = false; }
  }

  if (copied) {
    if (status) status.textContent = 'คัดลอก Xircle Invite Link แล้ว · ส่งลิงก์นี้ให้คนที่คุณจะชวน';
    const original = button?.textContent;
    if (button) {
      button.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(() => { if (document.contains(button)) button.textContent = original; }, 1800);
    }
  } else if (status) {
    status.textContent = url;
  }
}

function primeWhiteCatQuestion() {
  const composer = document.getElementById('msg');
  if (!composer || composer.disabled) return;
  const current = String(composer.value || '').trim();
  if (!current) composer.value = 'แมวขาว ';
  else if (!current.includes('แมวขาว')) composer.value = `แมวขาว ${current}`;
  composer.dispatchEvent(new Event('input', { bubbles: true }));
  composer.focus();
  try { composer.setSelectionRange(composer.value.length, composer.value.length); } catch { /* textarea-like only */ }
}

async function ensureWhiteCatIntro(code) {
  const identity = localIdentity(code);
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  if (identity.token) headers.authorization = `Bearer ${identity.token}`;
  try {
    const response = await fetch('/api/teambook-pet', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ mode: 'white_cat_intro', code }),
    });
    const result = await response.json().catch(() => ({}));
    if (result?.spoke) document.getElementById('refresh')?.click();
  } catch { /* onboarding failure must never block the Party */ }
}

function enhancePartyPage(attempt = 0) {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  const party = safeLocalParty(code);
  if (!party || !isXvisorPreset(party)) {
    if (attempt < 24) setTimeout(() => enhancePartyPage(attempt + 1), 500);
    return;
  }
  if (document.body.dataset.xvisorPartyReady) return;
  document.body.dataset.xvisorPartyReady = '1';

  /* IMPORTANT: never capture, rename, or replace #copy. Core TeamBook owns its
     normal invite/share handler and must remain identical for every Party. */
  const role = localRole(party);

  if (!document.getElementById('xvisorCareAssist')) {
    const card = document.createElement('div');
    card.className = 'card'; card.id = 'xvisorCareAssist';
    card.innerHTML = `<span class="label">X-VISOR CARE ASSIST · เพื่อนร่วมทาง ลับ</span>${guideCardHtml(role, party)}` +
      `<p class="hint" style="margin-top:12px">แมวขาวอ่าน เรื่องในสมุด เหมือนสัตว์ตัวอื่น แต่มีคลัง Xircle แยกไว้ช่วยตอบคำถามและช่วยวงมองต่อแบบ X-VISOR · Human X-VISOR ยังเป็นคนดูแลจริง</p>`;

    const ask = document.createElement('div');
    ask.className = 'rule-box';
    ask.style.marginTop = '14px';
    ask.innerHTML = `<b>🐈 ถามแมวขาวได้</b>` +
      `<p class="whisper" style="margin:7px 0 10px">พิมพ์คำว่า <b>แมวขาว</b> แล้วตามด้วยคำถาม เช่น “แมวขาว ABCD คืออะไร?” หรือถามเรื่องที่เกิดขึ้นในสมุดนี้ก็ได้</p>` +
      `<button type="button" class="btn ghost sm" id="xvisorAskWhiteCat">เริ่มถามแมวขาว</button>` +
      `<p class="hint" style="margin:8px 0 0">แมวถามกลับได้ถ้าข้อมูลยังไม่พอ · ตอบจากคลัง Xircle ได้ · ไม่วินิจฉัยหรือแทนผู้เชี่ยวชาญ</p>`;
    card.appendChild(ask);

    if (role === 'lead') {
      const invite = document.createElement('div');
      invite.className = 'rule-box';
      invite.style.marginTop = '14px';
      invite.innerHTML = `<b>XIRCLE INVITE · สำหรับเจ้าของสมุด X-VISOR</b>` +
        `<p class="whisper" style="margin:7px 0 10px">ลิงก์นี้จะให้ผู้รับเล่น Xircle Intro ก่อน แล้วพากลับเข้าห้อง ${code} ตอนเล่นจบ</p>` +
        `<button type="button" class="btn ghost sm" id="xvisorCopyInvite">คัดลอก Xircle Invite Link</button>` +
        `<p class="hint" id="xvisorInviteStatus" style="margin:8px 0 0">คัดลอกเฉพาะลิงก์ · ไม่มีข้อความสำเร็จรูป</p>`;
      card.appendChild(invite);
    }

    const logCard = document.getElementById('log')?.closest('.card');
    logCard?.parentElement?.insertBefore(card, logCard);

    document.getElementById('xvisorAskWhiteCat')?.addEventListener('click', primeWhiteCatQuestion);
    if (role === 'lead') {
      const button = document.getElementById('xvisorCopyInvite');
      const status = document.getElementById('xvisorInviteStatus');
      button?.addEventListener('click', () => copySpecialInvite(code, button, status));
      /* One real Party Log bubble, then the server refuses repeats forever. */
      void ensureWhiteCatIntro(code);
    }
  }

  const ending = document.getElementById('downloadEnding');
  if (ending && !ending.dataset.xvisorCapture) {
    ending.dataset.xvisorCapture = '1';
    ending.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const latest = safeLocalParty(code) || party;
      downloadText(`TeamBook-XVISOR-${code}-ending.md`, buildXvisorEndingMarkdown(latest));
    }, true);
  }
}

function installContextUi() {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  setTimeout(() => {
    if (/^\/new\/?$/.test(location.pathname)) enhanceCreatePage();
    if (/^\/p\/?$/.test(location.pathname)) enhancePartyPage();
  }, 0);
}

installContextUi();
