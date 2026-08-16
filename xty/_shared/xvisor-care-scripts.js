/* Built-in X-VISOR helper scripts.
   Separate from normal Pet personalities: these prompts only appear inside
   a Party whose preset is xircle_xvisor. They fill the Message composer for
   the human X-VISOR to review/edit; they never auto-send or diagnose. */

import { careDay, careCheckpointForDay, isXvisorPreset } from './xvisor-care.js';

const SCRIPTS = Object.freeze({
  day0: 'ถ้า 28 วันนี้เลือกเปลี่ยนได้เรื่องเดียว เรื่องไหนจะช่วยชีวิตจริงของคุณมากที่สุด?',
  day1_3: 'ช่วงนี้มีอะไรติดตอนทำสิ่งที่เราตกลงกันไว้ไหม?',
  day7: 'อาทิตย์นี้อะไรทำได้ง่ายขึ้นกว่าวันแรกบ้าง?',
  day14: 'ถ้าจะทำให้ง่ายขึ้นอีกนิด เราควรเปลี่ยนตรงไหนแค่จุดเดียว?',
  day21: 'อะไรจะช่วยให้ช่วงท้ายของรอบนี้ทำต่อได้ง่ายที่สุด?',
  day28: 'จากรอบนี้ อะไรคือหนึ่งอย่างที่อยากทำต่อใน Quest ถัดไป?',
});

function readParty(code) {
  try {
    const list = JSON.parse(localStorage.getItem('mc_xty_parties') || '[]');
    return Array.isArray(list) ? list.find(item => item?.code === code) || null : null;
  } catch { return null; }
}

function isLead(party) {
  try {
    const map = JSON.parse(localStorage.getItem('mc_xty_tokens') || '{}');
    const saved = map?.[party.code];
    const userId = typeof saved === 'string' ? '' : saved?.userId;
    return party?.members?.some(member => member.userId === userId && member.role === 'lead');
  } catch { return false; }
}

function checkpointKey(party) {
  const untouchedSetup = (party?.members?.length || 0) <= 1 && (party?.log?.length || 0) === 0;
  if (untouchedSetup) return 'day0';
  return careCheckpointForDay(careDay(party)).key;
}

function install(attempt = 0) {
  if (!/^\/xty\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  const party = readParty(code);
  const assist = document.getElementById('xvisorCareAssist');
  if (!party || !isXvisorPreset(party) || !assist) {
    if (attempt < 30) setTimeout(() => install(attempt + 1), 400);
    return;
  }
  if (!isLead(party) || document.getElementById('xvisorBuiltInScript')) return;

  const key = checkpointKey(party);
  const text = SCRIPTS[key] || SCRIPTS.day1_3;
  const block = document.createElement('div');
  block.id = 'xvisorBuiltInScript';
  block.className = 'rule-box';
  block.style.marginTop = '14px';
  block.innerHTML = `<b>BUILT-IN X-VISOR SCRIPT</b>` +
    `<p style="margin:7px 0 10px">“${text}”</p>` +
    `<button type="button" class="btn ghost sm" id="xvisorUseScript">ใส่ข้อความนี้ใน Message</button>` +
    `<p class="hint" style="margin:8px 0 0">ระบบแค่เตรียมประโยคให้ · X-VISOR แก้ก่อนส่งได้เสมอ และต้องใช้วิจารณญาณของคนดูแล</p>`;
  assist.appendChild(block);

  document.getElementById('xvisorUseScript')?.addEventListener('click', () => {
    const composer = document.getElementById('msg');
    if (!composer || composer.disabled) return;
    composer.value = text;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.focus();
  });
}

if (typeof document !== 'undefined' && typeof location !== 'undefined') setTimeout(() => install(), 0);
