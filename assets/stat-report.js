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

const FORGE = [
  'ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back',
  'ep4-what-traveled-without-us', 'ep5-from-answers-to-a-system',
  'ep6-the-starter-kit', 'ep7-a-voice-that-went-further',
];

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

  return steps;
}

function sendJourney() {
  for (const step of reachedSteps()) {
    try { reportJourneyStep(step); } catch { /* สถิติล่มไม่เกี่ยวกับหน้าเว็บ */ }
  }
}

/* ── Achievement ──
   หน้า /collection/ เป็นเจ้าของกติกาว่าอะไรปลดแล้ว มันคำนวณสดตอน render
   จาก localStorage หลายคีย์ ไฟล์นี้จึงไม่คำนวณซ้ำ (ลอกกติกามาไว้สองที่
   แล้ววันหนึ่งมันจะไม่ตรงกันแน่นอน) แต่รอรับรายการที่หน้านั้นสรุปมาแล้ว

   ผลที่ตามมาซึ่งต้องรู้ตอนอ่านตัวเลข: Achievement จะถูกนับก็ต่อเมื่อเจ้าของ
   เครื่องเคยเปิดหน้า Collection สักครั้ง ตัวเลขนี้จึงอ่านว่า "ปลดแล้วและ
   เคยเปิดดู" ไม่ใช่ "ปลดแล้ว" เฉย ๆ */
function sendAchievements(ids) {
  if (!Array.isArray(ids)) return;
  for (const id of ids) {
    if (!id) continue;
    try { reportAchievementUnlock(id); } catch { /* เหมือนกัน */ }
  }
}

sendJourney();

/* หน้า Collection ยิงสัญญาณมาเมื่อวาดเสร็จ และเผื่อกรณีที่มันวาดเสร็จก่อน
   โมดูลนี้ถูกโหลด (classic defer กับ module ไม่ได้รับประกันลำดับกัน)
   ก็อ่านค่าที่มันฝากไว้บน window ซ้ำอีกทาง */
addEventListener('mc:achievements', event => sendAchievements(event.detail?.unlocked));
sendAchievements(globalThis.MC_UNLOCKED_ACHIEVEMENTS);
