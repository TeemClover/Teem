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

/* หน้า Walkthrough ถูกล็อกเป็นหน้าเรื่องยาวอยู่แล้ว จึงแต่งจานเพิ่มเติมจาก
   script กลางนี้ได้โดยไม่ต้องยัดภาพฐาน64 ลง HTML และไม่กระทบหน้าอื่น */
function enhanceWalkthrough() {
  if (!/^\/walkthrough\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (document.getElementById('walkthrough-proof-style')) return;

  const style = document.createElement('style');
  style.id = 'walkthrough-proof-style';
  style.textContent = `
    #doc .wrap{padding-left:max(24px,env(safe-area-inset-left))!important;padding-right:max(24px,env(safe-area-inset-right))!important}
    #doc .read{padding-left:clamp(4px,1.5vw,14px);padding-right:clamp(4px,1.5vw,14px)}
    #doc p,#doc li{overflow-wrap:anywhere}
    .walk-thai-note{margin:22px 0 5px;padding:18px 20px;border:1px solid rgb(27 106 66/.25);border-radius:17px;background:linear-gradient(135deg,rgb(27 106 66/.09),#fff);font-size:15px;line-height:1.8}
    .walk-thai-note b{display:block;margin-bottom:4px;color:rgb(27 106 66);font-size:17px}
    .proof-grid{align-items:stretch}
    .proof-shot{position:relative;display:flex;flex-direction:column;width:100%;min-width:0;overflow:hidden;border:1px solid rgb(18 40 28/.12);border-radius:20px;padding:0;background:#fff;color:rgb(18 40 28);box-shadow:0 18px 42px rgb(18 40 28/.08);cursor:zoom-in;text-align:left}
    .proof-shot__crop{position:relative;overflow:hidden;aspect-ratio:4/5;background:#eeece8}
    .proof-shot__crop img{width:100%;height:100%;object-fit:cover;object-position:50% 0;transition:transform .25s ease}
    .proof-shot--source .proof-shot__crop img{object-position:50% 100%}
    .proof-shot:hover .proof-shot__crop img{transform:scale(1.025)}
    .proof-shot__zoom{position:absolute;right:10px;top:10px;border:1px solid rgb(255 255 255/.7);border-radius:999px;padding:6px 10px;background:rgb(7 26 16/.76);color:#fff;font-size:11px;font-weight:800;backdrop-filter:blur(7px)}
    .proof-shot__copy{display:block;padding:16px 17px 17px}.proof-shot__copy b{display:block;font-size:16px}.proof-shot__copy small{display:block;margin-top:5px;color:rgb(79 91 82);font-size:13px;line-height:1.65}
    .proof-lightbox{position:fixed;inset:0;z-index:4000;display:grid;place-items:center;padding:18px;background:rgb(2 12 7/.9);backdrop-filter:blur(12px)}
    .proof-lightbox[hidden]{display:none!important}.proof-lightbox__panel{position:relative;width:min(760px,100%);max-height:92dvh;overflow:auto;border:1px solid rgb(229 199 121/.48);border-radius:19px;background:#fff;box-shadow:0 40px 110px rgb(0 0 0/.72);overscroll-behavior:contain}
    .proof-lightbox__panel img{width:100%;height:auto;display:block}.proof-lightbox__close{position:sticky;float:right;right:12px;top:12px;z-index:2;width:45px;height:45px;margin:12px 12px -57px 0;border:1px solid rgb(255 255 255/.65);border-radius:50%;background:rgb(5 24 14/.82);color:#fff;font-size:19px;cursor:pointer;backdrop-filter:blur(8px)}
    @media(max-width:640px){#doc .wrap{padding-left:max(24px,env(safe-area-inset-left))!important;padding-right:max(24px,env(safe-area-inset-right))!important}#doc .read{padding-inline:2px}.proof-grid{grid-template-columns:1fr!important;gap:16px!important}.walk-thai-note{padding:17px}.proof-lightbox{align-items:end;padding:8px}.proof-lightbox__panel{max-height:94dvh;border-radius:17px 17px 10px 10px}}
  `;
  document.head.append(style);

  const proofGrid = document.querySelector('.proof-grid');
  if (proofGrid) {
    const note = document.createElement('div');
    note.className = 'walk-thai-note';
    note.innerHTML = '<b>🇹🇭 งานทั้งหมดทำด้วยภาษาไทยล้วน</b>Source 50 บท การคุยแก้กติกา การทดสอบระบบ และเว็บไซต์ myclover.com ทั้งหมด ถูกเขียนและสั่งงานด้วยภาษาไทย มีภาษาอังกฤษเพียงคำสั่งเปิดงานสั้น ๆ ที่เห็นในภาพเท่านั้น คุณไม่จำเป็นต้องแปลความคิดตัวเองเป็นภาษาอังกฤษก่อนคุยกับ AI';
    proofGrid.before(note);
    proofGrid.innerHTML = `
      <button class="proof-shot" type="button" data-proof-src="/img/walkthrough/claude-code-proof.webp" data-proof-alt="หน้าจอ Claude Code เริ่มสร้าง CORE7 จาก Master Build Brief">
        <span class="proof-shot__crop"><img src="/img/walkthrough/claude-code-proof.webp" loading="lazy" decoding="async" alt="หน้าจอ Claude Code เริ่มสร้าง CORE7 จาก Master Build Brief"><span class="proof-shot__zoom">🔍 แตะเพื่อขยาย</span></span>
        <span class="proof-shot__copy"><b>💬 1 คำสั่งเปิดงาน + Source ที่ปรุงแล้ว</b><small>ประโยคอังกฤษสั้น ๆ คือคำสั่งเปิดงานเพียงจุดเดียว หลังจากนั้นงานทั้งหมดเดินต่อจาก Source ภาษาไทย</small></span>
      </button>
      <button class="proof-shot proof-shot--source" type="button" data-proof-src="/img/walkthrough/source-50-proof.webp" data-proof-alt="Source 50 บทของ myClover CORE7">
        <span class="proof-shot__crop"><img src="/img/walkthrough/source-50-proof.webp" loading="lazy" decoding="async" alt="Source 50 บทของ myClover CORE7"><span class="proof-shot__zoom">🔍 แตะเพื่อขยาย</span></span>
        <span class="proof-shot__copy"><b>🧴 เกมไม่ได้อยู่ใน Prompt มันอยู่ใน 50 บทนี้</b><small>สิ่งที่ต้องทำ สิ่งที่ห้ามทำ ระบบออนไลน์ และภาพปลายทาง ถูกปรุงไว้ในขวดเดียวก่อนเริ่มสร้าง</small></span>
      </button>`;
  }

  const emoji = ['🍳','🌏','🧴','🎮','🧑‍🍳','🃏'];
  document.querySelectorAll('.kicker').forEach((node, index) => {
    if (index < emoji.length && !node.textContent.trim().startsWith(emoji[index])) {
      node.textContent = `${emoji[index]} ${node.textContent.trim()}`;
    }
  });

  const lightbox = document.createElement('div');
  lightbox.className = 'proof-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'ภาพหลักฐานแบบขยาย');
  lightbox.innerHTML = '<div class="proof-lightbox__panel"><button class="proof-lightbox__close" type="button" aria-label="ปิดภาพ">✕</button><img alt=""></div>';
  document.body.append(lightbox);
  const fullImage = lightbox.querySelector('img');
  const closeLightbox = () => {
    lightbox.hidden = true;
    fullImage.removeAttribute('src');
    document.documentElement.style.overflow = '';
  };
  document.addEventListener('click', event => {
    const shot = event.target.closest?.('[data-proof-src]');
    if (!shot) return;
    fullImage.src = shot.dataset.proofSrc;
    fullImage.alt = shot.dataset.proofAlt || 'ภาพหลักฐาน';
    lightbox.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lightbox.querySelector('.proof-lightbox__close')?.focus();
    fire('walkthrough-proof-expand');
  });
  lightbox.querySelector('.proof-lightbox__close')?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onClick, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fireView();
      enhanceWalkthrough();
    }, { once: true });
  } else {
    fireView();
    enhanceWalkthrough();
  }
}

/* เผื่อหน้าไหนอยากยิงเองจากโค้ดที่ไม่ใช่ module */
if (typeof window !== 'undefined') window.MC_ACT = fire;

export { fire as trackAct };
