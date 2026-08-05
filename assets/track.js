/* ═══════════════════════════════════════════════════════════════
   myClover — ตัวยิง Act แบบไม่ต้องเขียน JS

   หน้าเว็บส่วนใหญ่ของบ้านนี้เป็น script แบบเก่า ไม่ใช่ module และไม่ควรต้อง
   แก้ JS ทุกครั้งที่อยากรู้ว่ามีคนกดปุ่มไหนบ้าง โมดูลนี้จึงอ่านจาก HTML แทน

     <meta name="mc-act-view" content="home-open">   ← ยิงตอนเปิดหน้า
     <button data-mc-act="home-video">              ← ยิงตอนกด

   ใส่แล้วจบ ไม่ต้องเรียกอะไรเพิ่ม

   ── กันตัวเลขบวม ──
   view นับครั้งเดียวต่อ session (refresh ไม่นับซ้ำ แต่เปิดใหม่พรุ่งนี้นับ)
   click นับทุกครั้งจริง ๆ เพราะ "กดกี่ครั้ง" คือข้อมูล ไม่ใช่ noise
   แต่กันรัวด้วยหน้าต่าง 800ms กันนิ้วลั่นและ double-fire ของบางเบราว์เซอร์

   ยิงทิ้งไม่รอผล ไม่ throw — สถิติพลาดดีกว่าหน้าเว็บพัง
   ═══════════════════════════════════════════════════════════════ */

import { reportAct } from '/core7/js/analytics.js';

const RAPID_MS = 800;
const lastFired = new Map();

function fire(actId) {
  const id = String(actId || '').trim();
  if (!id) return;
  const now = Date.now();
  if (now - (lastFired.get(id) || 0) < RAPID_MS) return;
  lastFired.set(id, now);
  try { reportAct(id); } catch { /* ออฟไลน์ */ }
}

/* เปิดหน้า — ครั้งเดียวต่อ session ต่อ act */
function fireView() {
  const meta = document.querySelector('meta[name="mc-act-view"]');
  const id = meta?.getAttribute('content');
  if (!id) return;
  try {
    const key = `mc:act_view:${id}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
  } catch { /* โหมดส่วนตัว — ยอมให้นับซ้ำดีกว่าไม่นับเลย */ }
  fire(id);
}

/* ดักที่ document เพื่อให้ปุ่มที่ถูกสร้างทีหลังใช้ได้ด้วยโดยไม่ต้องผูกใหม่ */
function onClick(event) {
  const el = event.target?.closest?.('[data-mc-act]');
  if (el) fire(el.getAttribute('data-mc-act'));
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onClick, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireView, { once: true });
  } else {
    fireView();
  }
}

/* เผื่อหน้าไหนอยากยิงเองจากโค้ดที่ไม่ใช่ module */
if (typeof window !== 'undefined') window.MC_ACT = fire;

export { fire as trackAct };
