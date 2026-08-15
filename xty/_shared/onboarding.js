/* ═══════════════════════════════════════════════════════════════
   XTY — ป้ายบอกทางตอนเริ่มใช้

   สามชิ้น: ป๊อปอัปบอกคนเก่าว่าย้ายบ้านแล้ว ป๊อปอัปกติกาสำหรับคนใหม่
   และการ์ดชวนบันทึกตี้ไว้ที่หน้าจอโฮม

   หน้าตี้ตั้งใจไม่ผูก manifest ไว้ Add to Home Screen จะได้จำ URL ของ
   ตี้นั้นตรง ๆ ถ้าเมื่อไหร่ใส่ manifest เข้าไป ไอคอนจะเด้งไป start_url
   ของทั้งเว็บแทนแล้วฟีเจอร์นี้จะพัง
   ═══════════════════════════════════════════════════════════════ */

const SEEN_ORIGIN = 'mc_xty_seen_origin_notice';
const SEEN_RULES  = 'mc_xty_seen_rules';
const SEEN_SAVE   = 'mc_xty_seen_save_hint';

function seen(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function markSeen(key) {
  try { localStorage.setItem(key, '1'); } catch {} /* โหมดส่วนตัว — แค่เด้งซ้ำได้ ไม่พัง */
}

/* เคยเล่นแล้วหรือยัง ใช้ตัดสินว่าใครควรเห็นข้อความไหน */
export function hasPlayed() {
  try {
    return localStorage.getItem('mc_xty_profile') !== null
        || localStorage.getItem('mc_xty_tokens') !== null;
  } catch { return false; }
}

/* Chrome ยิง event นี้ครั้งเดียวและยิงเร็ว ต้องรับไว้ตั้งแต่โมดูลโหลด
   ไม่งั้นตอนผู้ใช้กดปุ่มจะไม่มีอะไรให้ prompt แล้ว */
let installEvent = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });

function platform() {
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function standalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function openDialog(html) {
  const dlg = document.createElement('dialog');
  dlg.className = 'xo-dialog';
  dlg.innerHTML = `<div class="xo-inner">${html}</div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  /* showModal ต้องรอให้ element อยู่ใน DOM ก่อน */
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
  return dlg;
}

/* ── ป๊อปอัป 1 — คนเก่า: บอกว่าย้ายบ้านแล้วและของตามมาครบ ────────── */
export function showOriginNotice({ force = false } = {}) {
  if (!force && (seen(SEEN_ORIGIN) || !hasPlayed())) return null;
  markSeen(SEEN_ORIGIN);
  const dlg = openDialog(`
    <p class="xo-badge">เข้าง่ายขึ้นแล้ว</p>
    <h2>ย้ายมารวมที่เดียวให้แล้ว</h2>
    <p class="xo-lead">
      เมื่อก่อน XTY เข้าได้สองทาง ทำให้ progress แยกกันคนละกอง
      ตอนนี้เหลือทางเดียวคือ <b>myclover.com/xty</b> ของเดิมของคุณตามมาครบแล้ว
      ไม่ต้องทำอะไรเพิ่ม
    </p>
    <ul class="xo-rules">
      <li><span class="xo-ico">🔖</span><div><b>ลิงก์เก่ายังใช้ได้</b>
        <span>ที่เคยบันทึกไว้จะพามาที่ใหม่ให้เอง</span></div></li>
      <li><span class="xo-ico">📌</span><div><b>บันทึกหน้าตี้ไว้ที่หน้าจอโฮม</b>
        <span>กดเข้าได้เลย ไม่ต้องพิมพ์ลิงก์อีก — ปุ่มอยู่ในหน้าตี้</span></div></li>
    </ul>
    <div class="xo-actions"><button class="btn gold" value="ok">เข้าใจแล้ว</button></div>
  `);
  dlg.querySelector('button').addEventListener('click', () => dlg.close());
  return dlg;
}

/* ── ป๊อปอัป 2 — คนใหม่: กติกาแบบอ่านจบใน 20 วินาที ──────────────── */
export function showRulesIntro({ force = false } = {}) {
  if (!force && seen(SEEN_RULES)) return null;
  markSeen(SEEN_RULES);
  const dlg = openDialog(`
    <p class="xo-badge">กติกา 20 วินาที</p>
    <h2>วันละนิด พอให้ตี้ตามกันทัน</h2>
    <p class="xo-lead">
      สนามจริงคือชีวิตของคุณ หน้าจอเป็นแค่โต๊ะกลางที่กลับมาเจอกัน
      ใช้เวลาประมาณวันละ 1 นาที
    </p>
    <ul class="xo-rules">
      <li><span class="xo-ico">✅</span><div><b>Commit — วันละครั้ง</b>
        <span>บอกตี้ว่าวันนี้ขยับอะไรไปแล้ว นี่คือหัวใจของเกม</span></div></li>
      <li><span class="xo-ico">❤️</span><div><b>React — ฟรี ไม่จำกัด</b>
        <span>กดให้เพื่อนรู้ว่าเห็นแล้ว ไม่ต้องพิมพ์ตอบ</span></div></li>
      <li><span class="xo-ico">🤝</span><div><b>Confirm — เพื่อนยืนยันให้ได้</b>
        <span>คนในตี้กดรับรอง Commit ของกันและกัน</span></div></li>
      <li><span class="xo-ico">💬</span><div><b>Message — จำกัดต่อวัน</b>
        <span>ตั้งใจให้จำกัด Party Log จะได้ไม่ยาวจนตามไม่ไหว</span></div></li>
    </ul>
    <div class="xo-actions"><button class="btn gold" value="ok">เริ่มเล่นเลย</button></div>
  `);
  dlg.querySelector('button').addEventListener('click', () => dlg.close());
  return dlg;
}

/* ── การ์ดชวนบันทึกตี้ไว้ที่หน้าจอโฮม ───────────────────────────── */
function saveSteps() {
  if (platform() === 'ios') {
    return `<ol class="xo-steps">
      <li>กดปุ่ม <b>แชร์</b> ⎋ ที่แถบล่างของ Safari</li>
      <li>เลื่อนหาแล้วกด <b>เพิ่มไปยังหน้าจอโฮม</b></li>
      <li>ตั้งชื่อตี้ให้จำง่าย แล้วกด <b>เพิ่ม</b></li>
    </ol>`;
  }
  if (platform() === 'android') {
    return `<ol class="xo-steps">
      <li>กดเมนู <b>⋮</b> มุมขวาบนของเบราว์เซอร์</li>
      <li>เลือก <b>เพิ่มลงในหน้าจอหลัก</b></li>
      <li>กด <b>เพิ่ม</b> ไอคอนตี้จะไปอยู่หน้าจอโฮม</li>
    </ol>`;
  }
  return `<ol class="xo-steps">
    <li>กด <b>Ctrl/Cmd + D</b> เพื่อบุ๊กมาร์กหน้านี้</li>
    <li>หรือลากไอคอนหน้าแถบที่อยู่ไปวางที่บุ๊กมาร์กบาร์</li>
  </ol>`;
}

function showSaveSteps() {
  const dlg = openDialog(`
    <p class="xo-badge">บันทึกตี้</p>
    <h2>เก็บตี้นี้ไว้ที่หน้าจอโฮม</h2>
    <p class="xo-lead">พอบันทึกแล้ว กดไอคอนเดียวเข้าตี้นี้ได้เลย ไม่ต้องพิมพ์ลิงก์หรือจำรหัส</p>
    ${saveSteps()}
    <div class="xo-actions"><button class="btn gold">เรียบร้อย</button></div>
  `);
  dlg.querySelector('button').addEventListener('click', () => dlg.close());
}

/**
 * วางการ์ด "บันทึกตี้ไว้ที่หน้าจอโฮม" ไว้บนสุดของหน้าตี้
 * @param {HTMLElement} host  ที่ที่จะแทรกการ์ด
 * @param {string} partyName  ชื่อตี้ ใช้ตอนคัดลอกลิงก์
 */
export function mountSaveToHome(host, partyName = 'ตี้ของฉัน') {
  if (!host || seen(SEEN_SAVE) || standalone()) return null;

  const card = document.createElement('section');
  card.className = 'xo-save-card';
  card.innerHTML = `
    <button class="xo-dismiss" type="button" aria-label="ปิดคำแนะนำนี้">×</button>
    <h3>📌 เก็บตี้นี้ไว้กดเข้าเร็ว ๆ</h3>
    <p>บันทึกไว้ที่หน้าจอโฮม แล้วกดไอคอนเข้าตี้นี้ได้เลย ไม่ต้องพิมพ์ลิงก์</p>
    <div class="xo-save-actions">
      <button class="btn gold sm" data-act="save">เพิ่มไปหน้าจอโฮม</button>
      <button class="btn ghost sm" data-act="copy">คัดลอกลิงก์ตี้</button>
    </div>
  `;
  host.prepend(card);

  const close = () => { markSeen(SEEN_SAVE); card.remove(); };
  card.querySelector('.xo-dismiss').addEventListener('click', close);

  card.querySelector('[data-act="save"]').addEventListener('click', async () => {
    /* Chrome ติดตั้งได้จริงก็ใช้ของจริง ที่เหลือบอกวิธีกดทีละขั้น */
    if (installEvent) {
      installEvent.prompt();
      try { await installEvent.userChoice; } catch {}
      installEvent = null;
      markSeen(SEEN_SAVE);
      card.remove();
      return;
    }
    showSaveSteps();
  });

  card.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    const btn = card.querySelector('[data-act="copy"]');
    try {
      if (navigator.share) { await navigator.share({ title: partyName, url: location.href }); return; }
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(() => { btn.textContent = 'คัดลอกลิงก์ตี้'; }, 1800);
    } catch { /* ผู้ใช้กดยกเลิกเอง ไม่ต้องทำอะไร */ }
  });

  return card;
}
