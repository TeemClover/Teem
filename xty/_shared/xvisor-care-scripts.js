/* Built-in scripts for the secret X-VISOR silver cat.
   These are tools for the HUMAN X-VISOR: they only fill the Message composer
   for review/edit. They never auto-send, diagnose, or prescribe health action.

   Runtime Pet speech is generated separately from the canonical persona in
   api/_lib/pet-personas.js. The two systems share the same Pattern → One Action
   philosophy without hard-coding the Pet to repeat these lines. */

import { careDay, careCheckpointForDay, isXvisorPreset } from './xvisor-care.js';

const SCRIPTS = Object.freeze({
  day0: Object.freeze({
    quiet: Object.freeze([
      'ถ้า 28 วันนี้ให้เลือกแค่หนึ่งอย่างที่อยากเห็นเกิดขึ้นจริง จะเลือกอะไร?',
      'ก่อนเริ่ม ขอเลือก One Action เดียวก่อนนะ อะไรคือสิ่งที่ทำแล้วนับว่าเกิดขึ้นจริงสำหรับรอบนี้?',
    ]),
    moving: Object.freeze([
      'เราเริ่มมี Action แล้วนะ ก่อนเพิ่มอย่างอื่น อยากยึดอะไรเป็นหนึ่งเรื่องหลักของรอบนี้?',
    ]),
  }),
  day1_3: Object.freeze({
    quiet: Object.freeze([
      'จากที่ลองเริ่มจริง มีตรงไหนที่ติดที่สุดตอนนี้?',
      'ยังไม่ต้องเปลี่ยนหลายอย่าง ถ้าจะทำให้ Action เดิมง่ายขึ้นหนึ่งจุด อยากปรับตรงไหน?',
    ]),
    moving: Object.freeze([
      'มี Action เกิดขึ้นแล้ว จากที่ทำจริง อะไรทำให้มันเกิดได้ง่ายกว่าที่คิด?',
      'จากสิ่งที่เกิดขึ้นจริงรอบนี้ มีจุดไหนที่อยากเก็บไว้เหมือนเดิม?',
    ]),
  }),
  day7: Object.freeze({
    quiet: Object.freeze([
      'ช่วงแรกยังไม่ค่อยมี Action เกิดขึ้น ถ้าจะดูแค่หนึ่ง friction ตอนนี้คืออะไร?',
    ]),
    moving: Object.freeze([
      'จากสิ่งที่เกิดขึ้นจริงช่วงแรก มีอะไรเริ่มเกิดซ้ำจนอยากสังเกตต่อ?',
      'ถ้าจะเก็บเพียงหนึ่ง Pattern จากสัปดาห์แรก จุดไหนมีหลักฐานใน log ชัดที่สุด?',
    ]),
  }),
  day14: Object.freeze({
    quiet: Object.freeze([
      'ครึ่งทางแล้ว ถ้าจะปรับแค่หนึ่งอย่างเพื่อให้ Action เดิมเกิดง่ายขึ้น อยากเปลี่ยนตรงไหน?',
    ]),
    moving: Object.freeze([
      'จากครึ่งทางที่ผ่านมา มีอะไรที่เกิดได้จริงและควรเก็บไว้ก่อนจะปรับอย่างอื่น?',
      'ถ้าปรับได้แค่หนึ่งจุด โดยไม่รื้อสิ่งที่เวิร์กอยู่ อยากแตะตรงไหน?',
    ]),
  }),
  day21: Object.freeze({
    quiet: Object.freeze([
      'ช่วงท้ายนี้ยังไม่ต้องเพิ่ม Challenge ใหม่ อะไรคือหนึ่งจุดที่ทำให้ Action เดิมกลับมาเกิดได้ง่ายขึ้น?',
    ]),
    moving: Object.freeze([
      'ช่วงท้ายนี้มีอะไรที่ทำต่อได้อยู่แล้ว และไม่จำเป็นต้องเปลี่ยน?',
      'ถ้าจะพารอบนี้ไปจนจบโดยไม่เพิ่มของใหม่ หนึ่งอย่างที่อยากรักษาไว้คืออะไร?',
    ]),
  }),
  day28: Object.freeze({
    quiet: Object.freeze([
      'รอบนี้อาจยังไม่มี Pattern ชัดพอ ถ้าตั้ง Quest ใหม่ อยากทำให้จุดเริ่มง่ายขึ้นตรงไหน?',
    ]),
    moving: Object.freeze([
      'จาก log รอบนี้ มีหนึ่ง Pattern ไหนที่อยากพาไป Quest ถัดไป?',
      'ถ้าเอาไปต่อได้เพียงหนึ่ง Action จากรอบนี้ อยากเก็บอะไรไว้?',
    ]),
  }),
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

function hasMovement(party) {
  return (party?.log || []).some(item => {
    const kind = String(item?.kind || item?.type || '').toLowerCase();
    return kind === 'commit' && !item?.retracted;
  });
}

function scriptFor(party) {
  const key = checkpointKey(party);
  const group = SCRIPTS[key] || SCRIPTS.day1_3;
  const pool = hasMovement(party) ? group.moving : group.quiet;
  const lines = pool?.length ? pool : group.quiet;
  const seed = (party?.log?.length || 0) + (party?.members?.length || 0);
  return lines[seed % lines.length];
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

  const text = scriptFor(party);
  const block = document.createElement('div');
  block.id = 'xvisorBuiltInScript';
  block.className = 'rule-box';
  block.style.marginTop = '14px';
  block.innerHTML = `<b>🐈 SILVER CAT · X-VISOR SCRIPT</b>` +
    `<p style="margin:7px 0 10px">“${text}”</p>` +
    `<button type="button" class="btn ghost sm" id="xvisorUseScript">ใส่ข้อความนี้ใน Message</button>` +
    `<p class="hint" style="margin:8px 0 0">แมวแค่เตรียมคำถามให้ · X-VISOR แก้ก่อนส่งได้เสมอ · ไม่ auto-send และไม่ใช้แทนวิจารณญาณของคนดูแล</p>`;
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
