/* ═══════════════════════════════════════════════════════════════
   ต่อสาย Journey กับ Achievement เข้าหน้าสถิติ

   หน้า /stat/journey/ กับ /collection/stat/ มี query พร้อมแล้ว และ API
   ก็เปิดรับแล้ว แต่ไม่เคยมีใครยิง event เข้าไปเลย ตัวเลขจึงเป็นศูนย์ทุกช่อง
   แบบที่อ่านไม่ออกว่า "ไม่มีคนเดิน" หรือ "ยังไม่ได้ต่อสาย" — backend เอง
   ก็ขึ้นเตือนไว้ว่า 'Journey ยังไม่ได้ต่อสาย' ไฟล์นี้คือสายเส้นนั้น

   ── ทำไมเป็นการ "ไล่เทียบสถานะ" ไม่ใช่ยิงตอนเกิดเหตุ ──
   ความคืบหน้าทุกอย่างอยู่ใน localStorage อยู่แล้ว ถ้าไปแทรกจุดยิงตามที่
   ต่าง ๆ ที่ทำให้ค่าเปลี่ยน จะต้องแก้หลายไฟล์และพลาดง่ายเวลาเพิ่มขั้นใหม่
   ที่นี่จึงอ่านสถานะทั้งก้อนตอนโหลดหน้า แล้วยิงเฉพาะขั้นที่ถึงแล้วแต่ยัง
   ไม่เคยยิง — reportJourneyStep กันซ้ำต่อเครื่องให้อยู่แล้ว จึงยิงกี่รอบ
   ก็ได้ และคนที่เดินไปไกลแล้วก่อนมีไฟล์นี้ก็ถูกนับย้อนให้ครบในรอบเดียว

   ⚠️ ยิงทิ้งอย่างเดียว ไม่รอผล ไม่ throw — สถิติล่มต้องไม่ทำให้เว็บพัง
   ═══════════════════════════════════════════════════════════════ */
import { reportJourneyStep, reportAchievementUnlock } from '/core7/js/analytics.js';
import { unlockedAchievementIds } from '/assets/achievement-state.js';

const FORGE = [
  'ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back',
  'ep4-what-traveled-without-us', 'ep5-from-answers-to-a-system',
  'ep6-the-starter-kit', 'ep7-a-voice-that-went-further',
];
const LEARN = ['free-ai', 'image-ai', 'clip-ai', 'notebooklm', 'prompts', 'first-web'];

function raw(k, d = '') { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } }
function list(k) { return raw(k).split(',').filter(Boolean); }
function json(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function hasTitle(t) { const a = json('mc_titles', []); return Array.isArray(a) && a.includes(t); }

/* ⚠️ คีย์คือ c7:stats_bot ขีดล่าง ไม่ใช่ c7:stats:bot — store.js ต่อ namespace
   'c7:' เข้ากับชื่อ 'stats_' + mode เอง เดาผิดทีตัวเลขจะเป็นศูนย์ตลอดกาล
   โดยไม่มีอะไรบอกว่าเพราะอะไร (เคยพลาดมาแล้วตอนทำเข็มทิศ) */
function matchesPlayed() {
  let n = 0;
  for (const m of ['bot', 'casual']) {
    const s = json('c7:stats_' + m, null);
    if (s && typeof s.matchesPlayed === 'number') n += s.matchesPlayed;
  }
  return n;
}

function path() { return globalThis.location?.pathname || ''; }

/* ขั้นของ Journey — ชื่อ event ต้องตรงกับ JOURNEY_STEPS ใน
   core7/backend/analytics-v11.js เป๊ะ ๆ ไม่งั้น query หาไม่เจอและเงียบหาย */
function reachedSteps() {
  const read = list('mc_read');
  const learn = list('mc_learn');
  const p = path();
  const steps = [];

  /* ขั้นแรกคือเส้น 100% ของกราฟ — นับตอนเปิดหน้าแรกจริง ๆ เท่านั้น
     ถ้ายิงจากทุกหน้า คนที่ได้ลิงก์ตรงเข้าห้องในจะถูกนับเป็น "เข้าประตู"
     ด้วย แล้ว conversion ทุกขั้นถัดไปจะดูต่ำกว่าความจริงทั้งกระดาน */
  if (p === '/' || p === '/index.html') steps.push('JOURNEY_START');

  if (raw('mc_intro_seen') === '1') steps.push('PROLOGUE_COMPLETE');
  FORGE.forEach((slug, i) => { if (read.includes(slug)) steps.push(`FORGE_EP_${i + 1}_COMPLETE`); });
  if (raw('mc_forge_done') === '1' || hasTitle('BLACKSMITH')) steps.push('SAVEPOINT_BLACKSMITH');
  if (raw('mc_walk_done') === '1') steps.push('QUICK_WALKTHROUGH_COMPLETE');
  if (json('c7:tutorial_completed', false) === true) steps.push('CORE7_ONBOARDING_START');
  if (matchesPlayed() > 0) steps.push('CORE7_ONBOARDING_COMPLETE');

  /* สองขั้นนี้วัด "เห็นหน้านั้น" ไม่ใช่ "ทำสำเร็จ" จึงผูกกับ path
     แต่บทที่ 1 นับจากที่เรียนจบด้วย เพราะคนที่เรียนจบไปแล้วย่อมเคยเริ่ม */
  if (p.startsWith('/core7/hand/')) steps.push('LOADOUT_VIEW');
  if (p === '/classroom/free-ai.html' || learn.includes('free-ai')) steps.push('LESSON_1_START');
  LEARN.forEach((slug, i) => { if (learn.includes(slug)) steps.push(`LESSON_${i + 1}_COMPLETE`); });

  /* บท 7 กับสมุดใช้ธงถาวรอยู่แล้ว จึง backfill คนที่เคยผ่านมาก่อนมี event
     ชุดนี้ได้ทันทีเมื่อเขากลับมาเปิดหน้าใดก็ได้ในบ้าน */
  const bossOpen = p.startsWith('/classroom/awaken/') || raw('mc_ch7_entered') === '1'
    || raw('mc_ch7_done') === '1' || hasTitle('AWAKENED');
  if (bossOpen) steps.push('BOSS_7_OPEN');
  if (raw('mc_ch7_done') === '1' || hasTitle('AWAKENED')) steps.push('BOSS_7_COMPLETE');
  if (raw('mc_nb_seen') === '1' || raw('mc_nb_restored') === '1' || raw('mc_secret_end') === '1') steps.push('NOTEBOOK_OPEN');
  if (raw('mc_nb_restored') === '1') steps.push('NOTEBOOK_RESTORED');
  if (raw('mc_secret_end') === '1') steps.push('SECRET_END_COMPLETE');
  if (hasTitle('GLHF')) steps.push('NOTEBOOK_BUMP_COMPLETE');

  return steps;
}

function sendJourney() {
  for (const step of reachedSteps()) {
    try { reportJourneyStep(step); } catch { /* สถิติล่มไม่เกี่ยวกับหน้าเว็บ */ }
  }
}

/* ── Achievement ──
   กติกาว่าอะไรปลดแล้วอยู่ที่ assets/achievement-state.js ซึ่งหน้า /collection/
   ก็อ่านชุดเดียวกัน ไม่มีการลอกเงื่อนไขไปไว้สองที่

   เดิมไฟล์นี้รอรับรายการจากหน้า Collection ผลคือนับได้เฉพาะคนที่เคยเปิดอัลบั้ม
   คนที่อ่านการ์ตูนจบแล้วเดินต่อไปเลยไม่เคยถูกนับ ตัวเลขจึงตอบคำถามผิดข้อ
   ตอนนี้คำนวณเองได้ทุกหน้า จึงนับ "ปลดแล้ว" ตรง ๆ ไม่ต้องแวะที่ไหนก่อน */
function sendAchievements(ids) {
  if (!Array.isArray(ids)) return;
  for (const id of ids) {
    if (!id) continue;
    try { reportAchievementUnlock(id); } catch { /* เหมือนกัน */ }
  }
}

sendJourney();
try { sendAchievements(unlockedAchievementIds()); } catch { /* สถิติล่มไม่เกี่ยวกับหน้าเว็บ */ }

/* หลาย milestone ถูกบันทึกหลังผู้ใช้กดปุ่มในหน้าเดิม เช่น เรียนจบบท 7,
   ซ่อมสมุด และชนมือ ถ้าตรวจแค่ตอนโหลดหน้าจะต้องรอให้เขาเปิดหน้าใหม่ก่อน
   ตัวเลขจึงมาช้า ตรวจซ้ำหลัง click จบหนึ่งรอบเพื่อให้ handler ของหน้านั้น
   เขียน localStorage ให้เสร็จก่อน แล้วส่ง milestone ได้ทันที */
document.addEventListener('click', () => setTimeout(sendJourney, 0));

/* หน้า Collection ยังยิงสัญญาณมาตอนวาดเสร็จ — ไม่ได้จำเป็นอีกแล้วเพราะเรา
   คำนวณเองได้ แต่รับไว้เพราะมันคือจังหวะที่ค่าเพิ่งถูกอ่านใหม่หมาด ๆ
   และ reportAchievementUnlock กันซ้ำต่อเครื่องอยู่แล้ว จึงไม่มีทางนับเกิน */
addEventListener('mc:achievements', event => sendAchievements(event.detail?.unlocked));
