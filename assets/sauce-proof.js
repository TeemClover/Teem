/* myClover · AI ใส่ซอส — optional Kickstarter proof handoff
   แสดงเพียงครั้งเดียว เมื่อผู้เล่นสะสม FIRST HAND ครบ 11 ใบ

   Walkthrough ไม่เกี่ยวกับการปลดล็อกนี้อีกแล้ว:
   - อ่านหรือข้าม Walkthrough ก็ได้
   - เล่นเพียง 1 Match ยังไม่พอ
   - ตัว trigger คือ Collection จริงของ CORE7 เท่านั้น
*/

const KEY_WALK = 'mc_walk_done';
const KEY_SEEN = 'mc_sauce_kickstarter_offer_seen_v3';
const MODAL_ID = 'mcSauceProof';
const FIRST_HAND_REQUIRED = 11;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function firstHandCount() {
  const cards = readJSON('c7:collection', []);
  if (Array.isArray(cards)) {
    return new Set(cards.filter(Boolean)).size;
  }

  const publicCount = Number(readJSON('mc_core7_first_hand_count', 0));
  return Number.isFinite(publicCount) ? Math.max(0, publicCount) : 0;
}

function wasSeen() {
  try { return localStorage.getItem(KEY_SEEN) === '1'; } catch { return false; }
}

function addStyles() {
  if (document.getElementById('mc-sauce-proof-style')) return;
  const style = document.createElement('style');
  style.id = 'mc-sauce-proof-style';
  style.textContent = `
    .mc-proof{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:18px;background:rgb(3 14 8/.84);backdrop-filter:blur(12px);animation:mcProofFade .22s ease both}
    .mc-proof[hidden]{display:none!important}
    .mc-proof__panel{position:relative;width:min(620px,100%);overflow:hidden;border:1px solid rgb(229 199 121/.5);border-radius:25px;padding:clamp(24px,5vw,38px);color:#fff;background:radial-gradient(520px 260px at 100% 0%,rgb(190 148 66/.23),transparent 65%),radial-gradient(460px 280px at 0% 100%,rgb(27 106 66/.42),transparent 68%),linear-gradient(145deg,#071a10,#103421);box-shadow:0 42px 110px rgb(0 0 0/.7);animation:mcProofPop .38s cubic-bezier(.22,1,.36,1) both}
    .mc-proof__close{position:absolute;right:14px;top:13px;width:42px;height:42px;border:1px solid rgb(255 255 255/.18);border-radius:50%;background:rgb(255 255 255/.07);color:#fff;font-size:18px;cursor:pointer}
    .mc-proof__eyebrow{display:block;color:#e5c779;font:800 11px/1.4 system-ui;letter-spacing:.16em}
    .mc-proof h2{max-width:17ch;margin:11px 0 12px;color:#fff;font:800 clamp(26px,5vw,38px)/1.16 system-ui;letter-spacing:-.025em}
    .mc-proof p{margin:0;color:rgb(255 255 255/.82);font:400 16px/1.82 system-ui}
    .mc-proof p+p{margin-top:11px}
    .mc-proof__formula{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:19px 0;padding:13px 15px;border:1px solid rgb(229 199 121/.28);border-radius:14px;background:rgb(255 255 255/.06);color:#e5c779;font:750 13px/1.6 system-ui}
    .mc-proof__formula b{color:#fff}.mc-proof__formula i{font-style:normal;color:rgb(255 255 255/.38)}
    .mc-proof__actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:23px}
    .mc-proof__btn{display:flex;align-items:center;justify-content:center;min-height:50px;border:1px solid rgb(255 255 255/.2);border-radius:13px;padding:11px 17px;color:#fff;background:rgb(255 255 255/.07);font:750 14px/1.35 system-ui;text-decoration:none;cursor:pointer;text-align:center}
    .mc-proof__btn--gold{border-color:#e5c779;background:#e5c779;color:#071a10}
    .mc-proof__fine{display:block;margin-top:13px;color:rgb(255 255 255/.52);font:400 12.5px/1.65 system-ui}
    .mc-proof__confirm{padding-top:2px}.mc-proof__confirm[hidden],.mc-proof__main[hidden]{display:none!important}.mc-proof__warning{margin:18px 0 4px;padding:15px 16px;border:1px solid rgb(229 199 121/.35);border-radius:14px;background:rgb(229 199 121/.09);color:rgb(255 255 255/.88)!important}.mc-proof__warning strong{color:#e5c779}.mc-proof__btn--danger{border-color:rgb(255 171 153/.45);color:#ffd1c7;background:rgb(174 68 55/.17)}
    @keyframes mcProofFade{from{opacity:0}to{opacity:1}}@keyframes mcProofPop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
    @media(max-width:540px){.mc-proof{align-items:end;padding:10px}.mc-proof__panel{border-radius:22px;padding:26px 20px 22px}.mc-proof__actions{grid-template-columns:1fr}.mc-proof__btn--skip{order:2}}
    @media(prefers-reduced-motion:reduce){.mc-proof,.mc-proof__panel{animation:none}}
  `;
  document.head.append(style);
}

/* Walkthrough ยังบันทึกสถานะของตัวเองได้ตามเดิม แต่ไม่ใช้เป็นเงื่อนไข
   Kickstarter อีก และล้างข้อความเก่าที่บอกว่าจะได้คำชวนหลัง Match แรก */
function paintWalkthroughHandoff() {
  const play = document.getElementById('playCore7');
  if (!play) return;

  const read = play.closest('.read');
  const lead = read?.querySelector(':scope > .lead');
  const playbox = play.closest('.playbox');
  const title = playbox?.querySelector('h3');
  const body = playbox?.querySelector('p:not(.fine)');

  if (lead) {
    lead.textContent = 'ต่อจากนี้คุณจะเข้า Quick Tutorial สั้น ๆ แล้วลงเล่นกับ EASY BOT เพื่อดูว่า Source ที่จัดไว้ดีสามารถกลายเป็นเกมที่เล่นได้จริงอย่างไร';
  }
  if (title) title.innerHTML = 'เรียนกติกาไว<br>แล้วลองเล่น 1 Match';
  if (body) {
    body.textContent = 'เกมนี้เป็น Main Quest ที่เราแนะนำ แต่ไม่บังคับ ส่วนหน้าขาย Kickstarter จะเปิดเป็นรางวัลอีกขั้น เมื่อคุณสะสม FIRST HAND ครบ 11 ใบ';
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintWalkthroughHandoff, { once: true });
  } else {
    paintWalkthroughHandoff();
  }
}

export function eligibleForKickstarterProof() {
  return !wasSeen() && firstHandCount() >= FIRST_HAND_REQUIRED;
}

export function tryShowKickstarterProof() {
  if (!eligibleForKickstarterProof() || document.getElementById(MODAL_ID)) return false;
  addStyles();

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'mc-proof';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'mcProofTitle');
  modal.innerHTML = `
    <section class="mc-proof__panel">
      <button class="mc-proof__close" type="button" data-ask-skip aria-label="ปิด">✕</button>
      <div class="mc-proof__main" data-main>
        <span class="mc-proof__eyebrow">💎 FIRST HAND 11 ใบ · PROOF UNLOCKED</span>
        <h2 id="mcProofTitle">คุณสะสมวัตถุดิบพอแล้ว<br>ดูจานที่เอาไปขายต่อไหม?</h2>
        <p>CORE7 ที่คุณเล่น และหน้าขาย Kickstarter ด้านล่าง เกิดจาก <strong>Source 50 บทขวดเดียวกัน</strong></p>
        <p>แค่เปลี่ยนงานปลายทาง จาก “สร้างเกมที่เล่นได้” เป็น “อธิบายเกมให้คนอยากสนับสนุน” — AI ก็หยิบวัตถุดิบชุดเดิมไปจัดจานใหม่ได้</p>
        <div class="mc-proof__formula"><b>🧴 ซอสขวดเดิม</b><i>→</i><span>🎮 เกมที่เล่นได้</span><i>→</i><span>🛍️ หน้าขายที่พร้อมเล่าเรื่อง</span></div>
        <p>ถ้าคุณมีสินค้า บริการ หรือความรู้ของตัวเอง สิ่งที่ต้องสร้างก่อนอาจไม่ใช่หน้าเว็บ แต่คือ Source ที่ดีพอให้ AI เข้าใจว่าคุณกำลังขายอะไรอยู่</p>
        <div class="mc-proof__actions">
          <a class="mc-proof__btn mc-proof__btn--gold" data-open-secret href="/kickstarter/th/?from=first-hand-11">👀 ดูหน้าขายจากซอสขวดเดียว →</a>
          <button class="mc-proof__btn mc-proof__btn--skip" type="button" data-ask-skip>ข้ามก่อน</button>
        </div>
        <span class="mc-proof__fine">รางวัลจาก FIRST HAND 11 ใบ · ไม่เกี่ยวกับ Walkthrough · ไม่บังคับเปิด</span>
      </div>
      <div class="mc-proof__confirm" data-confirm hidden>
        <span class="mc-proof__eyebrow">⚠️ LAST CHANCE</span>
        <h2>แน่ใจหรือว่าจะข้าม?</h2>
        <p class="mc-proof__warning"><strong>คำชวนนี้จะแสดงเพียงครั้งเดียวบนอุปกรณ์นี้</strong> แต่หน้า Kickstarter ยังเข้าผ่านลิงก์ตรงได้ตามปกติ</p>
        <p>ข้ามได้ตามสบายค่ะ เชฟเพียงอยากให้แน่ใจว่าคุณไม่ได้ปิดเพราะนิ้วลื่นค่ะ</p>
        <div class="mc-proof__actions">
          <button class="mc-proof__btn mc-proof__btn--gold" type="button" data-return>👀 กลับไปดู</button>
          <button class="mc-proof__btn mc-proof__btn--danger" type="button" data-confirm-skip>ยืนยัน · ข้ามก่อน</button>
        </div>
        <span class="mc-proof__fine">เมื่อยืนยันแล้ว ระบบจะไม่เด้งคำชวนนี้ซ้ำ</span>
      </div>
    </section>`;

  const main = modal.querySelector('[data-main]');
  const confirm = modal.querySelector('[data-confirm]');
  const previousOverflow = document.documentElement.style.overflow;

  const close = () => {
    modal.remove();
    document.documentElement.style.overflow = previousOverflow;
  };
  const askSkip = () => {
    main.hidden = true;
    confirm.hidden = false;
    modal.querySelector('[data-return]')?.focus();
    try { window.gtag?.('event', 'sauce_kickstarter_offer_skip_warning'); } catch { /* optional */ }
  };
  const returnToOffer = () => {
    confirm.hidden = true;
    main.hidden = false;
    modal.querySelector('[data-open-secret]')?.focus();
  };
  const confirmSkip = () => {
    write(KEY_SEEN, '1');
    try { window.gtag?.('event', 'sauce_kickstarter_offer_skipped'); } catch { /* optional */ }
    close();
  };

  modal.querySelectorAll('[data-ask-skip]').forEach(button => button.addEventListener('click', askSkip));
  modal.querySelector('[data-return]')?.addEventListener('click', returnToOffer);
  modal.querySelector('[data-confirm-skip]')?.addEventListener('click', confirmSkip);
  modal.querySelector('[data-open-secret]')?.addEventListener('click', () => {
    write(KEY_SEEN, '1');
    try { window.gtag?.('event', 'sauce_kickstarter_offer_opened'); } catch { /* optional */ }
  });
  modal.addEventListener('click', event => { if (event.target === modal) askSkip(); });
  document.addEventListener('keydown', function escape(event) {
    if (event.key !== 'Escape' || !document.body.contains(modal)) return;
    if (confirm.hidden) askSkip(); else returnToOffer();
  });

  document.documentElement.style.overflow = 'hidden';
  document.body.append(modal);
  modal.querySelector('[data-open-secret]')?.focus();
  try { window.gtag?.('event', 'sauce_kickstarter_offer_shown', { first_hand_count: firstHandCount() }); } catch { /* analytics optional */ }
  return true;
}

/* คง API เดิมไว้เพื่อไม่ให้ Walkthrough ที่ import ฟังก์ชันนี้พัง
   แต่การอ่านจบไม่เรียก Kickstarter แล้ว */
export function markWalkthroughDone() {
  write(KEY_WALK, '1');
  try { window.MC_STAGE?.paint?.(); } catch { /* stage optional */ }
}

/* CORE7 เรียกทุกครั้งที่แจก FIRST HAND; ฟังก์ชันตรวจจำนวนจริงเอง */
export function notifyFirstHandCardReceived() {
  window.setTimeout(tryShowKickstarterProof, 120);
}
