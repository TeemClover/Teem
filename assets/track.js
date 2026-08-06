/* ═══════════════════════════════════════════════════════════════
   myClover — ตัวยิง Act แบบไม่ต้องเขียน JS

   หน้าเว็บส่วนใหญ่ของบ้านนี้เป็น script แบบเก่า ไม่ใช่ module และไม่ควรต้อง
   แก้ JS ทุกครั้งที่อยากรู้ว่ามีคนกดปุ่มไหนบ้าง โมดูลนี้จึงอ่านจาก HTML แทน

     <meta name="mc-act-view" content="home-open">   ← ยิงตอนเปิดหน้า
     <button data-mc-act="home-video">              ← ยิงตอนกด

   ใส่แล้วจบ ไม่ต้องเรียกอะไรเพิ่ม
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

function fireView() {
  const meta = document.querySelector('meta[name="mc-act-view"]');
  const id = meta?.getAttribute('content');
  if (!id) return;
  try {
    const key = `mc:act_view:${id}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
  } catch { /* โหมดส่วนตัว */ }
  fire(id);
}

function onClick(event) {
  const el = event.target?.closest?.('[data-mc-act]');
  if (el) fire(el.getAttribute('data-mc-act'));
}

function enhanceWalkthrough() {
  if (!/^\/walkthrough\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (document.getElementById('walkthrough-reading-style')) return;

  const style = document.createElement('style');
  style.id = 'walkthrough-reading-style';
  style.textContent = `
    #doc section>.read{width:min(700px,calc(100% - 64px))!important;margin-inline:auto!important;padding-inline:0!important}
    #doc .hero .wrap,#doc .top .wrap{padding-left:max(28px,env(safe-area-inset-left))!important;padding-right:max(28px,env(safe-area-inset-right))!important}
    #doc section{padding-top:clamp(36px,6vw,58px)!important;padding-bottom:clamp(36px,6vw,58px)!important}
    #doc p,#doc li{overflow-wrap:anywhere}
    #doc .lead{font-size:17px!important;line-height:1.75!important}

    .walk-more{margin-top:21px;border:1px solid rgb(18 40 28/.12);border-radius:17px;overflow:hidden;background:rgb(255 255 255/.76);box-shadow:0 10px 28px rgb(18 40 28/.04)}
    .walk-more summary{position:relative;list-style:none;cursor:pointer;padding:16px 50px 16px 18px;color:rgb(27 106 66);font-size:14px;font-weight:800;line-height:1.5;user-select:none}
    .walk-more summary::-webkit-details-marker{display:none}
    .walk-more summary::after{content:'＋';position:absolute;right:16px;top:50%;translate:0 -50%;display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:rgb(27 106 66/.09);font-size:17px}
    .walk-more[open] summary{border-bottom:1px solid rgb(18 40 28/.08);background:rgb(27 106 66/.045)}
    .walk-more[open] summary::after{content:'−'}
    .walk-more__body{padding:18px;color:rgb(18 40 28/.82);font-size:15px;line-height:1.78}
    .walk-more__body>p:first-child{margin-top:0}
    .walk-more__body .compare,.walk-more__body .numbers{margin-top:16px}
    .walk-more__body .chef{margin-top:17px}

    .walk-thai-note{margin:20px 0 4px;padding:16px 17px;border:1px solid rgb(27 106 66/.25);border-radius:17px;background:linear-gradient(135deg,rgb(27 106 66/.09),#fff);font-size:14px;line-height:1.75}
    .walk-thai-note b{display:block;margin-bottom:3px;color:rgb(27 106 66);font-size:16px}

    .proof-grid{align-items:stretch}
    .proof-shot{position:relative;display:flex;flex-direction:column;width:100%;min-width:0;overflow:hidden;border:1px solid rgb(18 40 28/.12);border-radius:20px;padding:0;background:#fff;color:rgb(18 40 28);box-shadow:0 18px 42px rgb(18 40 28/.08);cursor:zoom-in;text-align:left}
    .proof-shot__crop{position:relative;overflow:hidden;aspect-ratio:4/5;background:#eeece8}
    .proof-shot__crop img{width:100%;height:100%;object-fit:cover;object-position:50% 0;transition:transform .25s ease}
    .proof-shot--source .proof-shot__crop img{object-position:50% 100%}
    .proof-shot:hover .proof-shot__crop img{transform:scale(1.025)}
    .proof-shot__zoom{position:absolute;right:10px;top:10px;border:1px solid rgb(255 255 255/.7);border-radius:999px;padding:6px 10px;background:rgb(7 26 16/.76);color:#fff;font-size:11px;font-weight:800;backdrop-filter:blur(7px)}
    .proof-shot__copy{display:block;padding:15px 16px 16px}.proof-shot__copy b{display:block;font-size:15px}.proof-shot__copy small{display:block;margin-top:4px;color:rgb(79 91 82);font-size:12.5px;line-height:1.6}
    .proof-lightbox{position:fixed;inset:0;z-index:4000;display:grid;place-items:center;padding:18px;background:rgb(2 12 7/.9);backdrop-filter:blur(12px)}
    .proof-lightbox[hidden]{display:none!important}.proof-lightbox__panel{position:relative;width:min(760px,100%);max-height:92dvh;overflow:auto;border:1px solid rgb(229 199 121/.48);border-radius:19px;background:#fff;box-shadow:0 40px 110px rgb(0 0 0/.72);overscroll-behavior:contain}
    .proof-lightbox__panel img{width:100%;height:auto;display:block}.proof-lightbox__close{position:sticky;float:right;right:12px;top:12px;z-index:2;width:45px;height:45px;margin:12px 12px -57px 0;border:1px solid rgb(255 255 255/.65);border-radius:50%;background:rgb(5 24 14/.82);color:#fff;font-size:19px;cursor:pointer;backdrop-filter:blur(8px)}

    @media(max-width:700px){
      #doc section>.read{width:calc(100% - 64px)!important}
      #doc .story-card{padding:17px!important}
      #doc .proof-grid{grid-template-columns:1fr!important;gap:15px!important}
      .proof-shot__crop{aspect-ratio:5/4}
      .proof-shot--source .proof-shot__crop img{object-position:center 82%}
    }
    @media(max-width:390px){
      #doc section>.read{width:calc(100% - 52px)!important}
      #doc .hero .wrap,#doc .top .wrap{padding-left:24px!important;padding-right:24px!important}
      .walk-more summary{padding-left:16px;font-size:13.5px}.walk-more__body{padding:16px}
      .proof-lightbox{align-items:end;padding:8px}.proof-lightbox__panel{max-height:94dvh;border-radius:17px 17px 10px 10px}
    }
  `;
  document.head.append(style);

  const sections = [...document.querySelectorAll('#doc > section')];

  function compactDetails(section, summary, nodes) {
    const clean = nodes.filter(node => node && node.parentNode);
    if (!section || !clean.length) return;
    const first = clean[0];
    const details = document.createElement('details');
    details.className = 'walk-more';
    const head = document.createElement('summary');
    head.textContent = summary;
    const body = document.createElement('div');
    body.className = 'walk-more__body';
    details.append(head, body);
    first.parentNode.insertBefore(details, first);
    clean.forEach(node => body.append(node));
    details.addEventListener('toggle', () => {
      if (details.open) fire('walkthrough-read-more');
    }, { once: true });
  }

  if (sections[0]) {
    const cards = sections[0].querySelectorAll('.story-card p');
    if (cards[0]) cards[0].textContent = 'จัดความรู้ให้เป็นระบบ และทำให้คนใหม่ไม่ต้องเริ่มจากศูนย์';
    if (cards[1]) cards[1].textContent = 'ชิมภาษา ตัดของเกิน และแปลเรื่องยากให้เห็นภาพ';
    const extras = [...sections[0].querySelectorAll(':scope > .read > p:not(.lead)')];
    compactDetails(sections[0], '👀 อ่านเพิ่ม · ทำไมต้องมีเชฟในคอร์ส AI', extras);
  }

  if (sections[1]) {
    const h2 = sections[1].querySelector('h2');
    if (h2) h2.innerHTML = 'ผมรู้จักไฟล์ที่ AI ย่อยง่าย<br>จากคนที่คุยกันไม่รู้เรื่อง';
    const direct = [...sections[1].querySelectorAll(':scope > .read > p:not(.lead)')];
    const extras = [direct[1], sections[1].querySelector('.compare'), sections[1].querySelector('.truth'), sections[1].querySelector('.chef')];
    compactDetails(sections[1], '📄 อ่านเพิ่ม · ทำไม .md เหมาะเป็น Source กลาง', extras);
  }

  if (sections[2]) {
    const extras = [...sections[2].querySelectorAll(':scope > .read > p:not(.lead)')];
    compactDetails(sections[2], '⏱️ อ่านเพิ่ม · ประหยัดเวลา เครดิต และลด AI หลอนอย่างไร', extras);
  }

  const proofGrid = document.querySelector('.proof-grid');
  if (proofGrid) {
    const note = document.createElement('div');
    note.className = 'walk-thai-note';
    note.innerHTML = '<b>🇹🇭 ทั้งเกมและเว็บไซต์นี้สร้างด้วยภาษาไทย</b>Source 50 บท การคุยแก้กติกา การทดสอบ และ Prompt ที่ใช้สร้าง myclover.com เป็นภาษาไทยทั้งหมด ยกเว้นคำสั่งเปิดงานภาษาอังกฤษสั้น ๆ ในภาพแรก';
    proofGrid.before(note);
    proofGrid.innerHTML = `
      <button class="proof-shot" type="button" data-proof-src="/img/walkthrough/claude-code-proof.webp" data-proof-alt="หน้าจอ Claude Code เริ่มสร้าง CORE7 จาก Master Build Brief">
        <span class="proof-shot__crop"><img src="/img/walkthrough/claude-code-proof.webp" loading="lazy" decoding="async" alt="หน้าจอ Claude Code เริ่มสร้าง CORE7 จาก Master Build Brief"><span class="proof-shot__zoom">🔍 ขยาย</span></span>
        <span class="proof-shot__copy"><b>💬 1 คำสั่งเปิดงาน</b><small>พร้อม Source ที่ปรุงไว้แล้ว</small></span>
      </button>
      <button class="proof-shot proof-shot--source" type="button" data-proof-src="/img/walkthrough/source-50-proof.webp" data-proof-alt="Source 50 บทของ myClover CORE7">
        <span class="proof-shot__crop"><img src="/img/walkthrough/source-50-proof.webp" loading="lazy" decoding="async" alt="Source 50 บทของ myClover CORE7"><span class="proof-shot__zoom">🔍 ขยาย</span></span>
        <span class="proof-shot__copy"><b>🧴 สูตรทั้งเล่มอยู่ในขวดนี้</b><small>สิ่งที่ต้องทำและสิ่งที่ห้ามทำ</small></span>
      </button>`;
  }
  if (sections[3]) {
    const extras = [
      sections[3].querySelector('.numbers'),
      ...sections[3].querySelectorAll(':scope > .read > p:not(.lead)'),
      sections[3].querySelector('.chef')
    ];
    compactDetails(sections[3], '🛠️ อ่านเพิ่ม · “Prompt เดียว” ทำเกมเสร็จจริงหรือ', extras);
  }

  if (sections[4]) {
    const lead = sections[4].querySelector('.lead');
    if (lead) lead.textContent = 'Prompt ยังใช้ค่ะ แต่เป็นเพียงเครื่องปรุง อาหารหลักคือ Source และรสมือของคุณเอง';
    const lessons = sections[4].querySelectorAll('.lesson small');
    const short = ['ปรุงซอส', 'ชิมแล้วแก้', 'ทำจานจริง', 'แตกหลายเมนู', 'เปิดลิ้นชัก', 'เสิร์ฟให้ใช้จริง'];
    lessons.forEach((node, i) => { if (short[i]) node.textContent = short[i]; });
    const extras = [...sections[4].querySelectorAll(':scope > .read > p:not(.lead)')];
    compactDetails(sections[4], '🧂 อ่านเพิ่ม · แล้ว Prompt อยู่ตรงไหนของหลักสูตร', extras);
  }

  const final = sections.find(section => section.classList.contains('final'));
  if (final) {
    const h2 = final.querySelector('h2');
    const lead = final.querySelector('.lead');
    const playTitle = final.querySelector('.playbox h3');
    const playCopy = final.querySelector('.playbox p:not(.fine)');
    const fine = final.querySelector('.fine');
    if (h2) h2.innerHTML = 'พอแล้วกับการอ่าน<br>ลองเล่นสิ่งที่ Source สร้างขึ้นมา';
    if (lead) lead.textContent = 'Quick Tutorial สั้น ๆ แล้วระบบจะจัดมือเริ่มต้นให้ ก่อนส่งไปเจอ EASY BOT ทันที';
    if (playTitle) playTitle.innerHTML = 'เรียนไว<br>แล้วเล่น 1 Match';
    if (playCopy) playCopy.textContent = 'ไม่ผ่านหน้าแรก ไม่ต้องเลือกมือ และไม่ต้องสมัครสมาชิก';
    if (fine) fine.textContent = 'จบเกมแล้วรับ FIRST HAND ใบแรก อาจมีประตูหลังครัวเปิดให้ดูของลับ 1 ครั้ง';
  }

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

if (typeof window !== 'undefined') window.MC_ACT = fire;
export { fire as trackAct };
