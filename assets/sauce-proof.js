/* myClover · AI ใส่ซอส — optional Kickstarter proof handoff
   Shows once, only after BOTH milestones exist:
   1) Walkthrough completed
   2) At least one FIRST HAND card received from CORE7
*/

const KEY_WALK = 'mc_walk_done';
const KEY_SEEN = 'mc_sauce_kickstarter_offer_seen_v1';
const MODAL_ID = 'mcSauceProof';

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

function hasWalkthrough() {
  try { return localStorage.getItem(KEY_WALK) === '1'; } catch { return false; }
}

function hasFirstHandCard() {
  const cards = readJSON('c7:collection', []);
  if (Array.isArray(cards) && cards.length > 0) return true;
  const publicCount = Number(readJSON('mc_core7_first_hand_count', 0));
  return Number.isFinite(publicCount) && publicCount > 0;
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
    .mc-proof h2{max-width:16ch;margin:11px 0 12px;color:#fff;font:800 clamp(26px,5vw,38px)/1.16 system-ui;letter-spacing:-.025em}
    .mc-proof p{margin:0;color:rgb(255 255 255/.82);font:400 16px/1.82 system-ui}
    .mc-proof p+p{margin-top:11px}
    .mc-proof__formula{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:19px 0;padding:13px 15px;border:1px solid rgb(229 199 121/.28);border-radius:14px;background:rgb(255 255 255/.06);color:#e5c779;font:750 13px/1.6 system-ui}
    .mc-proof__formula b{color:#fff}.mc-proof__formula i{font-style:normal;color:rgb(255 255 255/.38)}
    .mc-proof__actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:23px}
    .mc-proof__btn{display:flex;align-items:center;justify-content:center;min-height:50px;border:1px solid rgb(255 255 255/.2);border-radius:13px;padding:11px 17px;color:#fff;background:rgb(255 255 255/.07);font:750 14px/1.35 system-ui;text-decoration:none;cursor:pointer;text-align:center}
    .mc-proof__btn--gold{border-color:#e5c779;background:#e5c779;color:#071a10}
    .mc-proof__fine{display:block;margin-top:13px;color:rgb(255 255 255/.52);font:400 12.5px/1.65 system-ui}
    @keyframes mcProofFade{from{opacity:0}to{opacity:1}}@keyframes mcProofPop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
    @media(max-width:540px){.mc-proof{align-items:end;padding:10px}.mc-proof__panel{border-radius:22px;padding:26px 20px 22px}.mc-proof__actions{grid-template-columns:1fr}.mc-proof__btn--skip{order:2}}
    @media(prefers-reduced-motion:reduce){.mc-proof,.mc-proof__panel{animation:none}}
  `;
  document.head.append(style);
}

export function eligibleForKickstarterProof() {
  return !wasSeen() && hasWalkthrough() && hasFirstHandCard();
}

export function tryShowKickstarterProof() {
  if (!eligibleForKickstarterProof() || document.getElementById(MODAL_ID)) return false;
  addStyles();

  /* Mark on display, not on click. The invitation is intentionally one-time,
     including when the visitor chooses to skip it. */
  write(KEY_SEEN, '1');

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'mc-proof';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'mcProofTitle');
  modal.innerHTML = `
    <section class="mc-proof__panel">
      <button class="mc-proof__close" type="button" data-close aria-label="ปิด">✕</button>
      <span class="mc-proof__eyebrow">SOURCE → GAME → SALES PAGE</span>
      <h2 id="mcProofTitle">คุณลองชิมเกมแล้ว<br>ดูจานที่เอาไปขายต่อไหม?</h2>
      <p>CORE7 ที่คุณเพิ่งเล่น และหน้าขาย Kickstarter ด้านล่าง เกิดจาก <strong>Source 50 บทขวดเดียวกัน</strong></p>
      <p>แค่เปลี่ยนงานปลายทาง จาก “สร้างเกมที่เล่นได้” เป็น “อธิบายเกมให้คนอยากสนับสนุน” — AI ก็หยิบวัตถุดิบชุดเดิมไปจัดจานใหม่ได้</p>
      <div class="mc-proof__formula"><b>ซอสขวดเดิม</b><i>→</i><span>เกมที่เล่นได้</span><i>→</i><span>หน้าขายที่พร้อมเล่าเรื่อง</span></div>
      <p>ถ้าคุณมีสินค้า บริการ หรือความรู้ของตัวเอง สิ่งที่ต้องสร้างก่อนอาจไม่ใช่หน้าเว็บ แต่คือ Source ที่ดีพอให้ AI เข้าใจว่าคุณกำลังขายอะไรอยู่</p>
      <div class="mc-proof__actions">
        <a class="mc-proof__btn mc-proof__btn--gold" href="/kickstarter/th/?from=first-hand">🍽️ ดูหน้าขายจากซอสขวดเดียว →</a>
        <button class="mc-proof__btn mc-proof__btn--skip" type="button" data-close>ข้ามก่อน</button>
      </div>
      <span class="mc-proof__fine">ไม่บังคับ · ไม่เด้งซ้ำ · ข้ามแล้วเดินต่อได้ตามปกติ</span>
    </section>`;

  const close = () => {
    modal.remove();
    document.documentElement.style.overflow = '';
  };
  modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', function escape(event) {
    if (event.key !== 'Escape' || !document.body.contains(modal)) return;
    close();
    document.removeEventListener('keydown', escape);
  });

  document.documentElement.style.overflow = 'hidden';
  document.body.append(modal);
  modal.querySelector('.mc-proof__btn--gold')?.focus();
  try { window.gtag?.('event', 'sauce_kickstarter_offer_shown'); } catch { /* analytics optional */ }
  return true;
}

export function markWalkthroughDone({ showOffer = true } = {}) {
  write(KEY_WALK, '1');
  try { window.MC_STAGE?.paint?.(); } catch { /* stage optional */ }
  if (showOffer) window.setTimeout(tryShowKickstarterProof, 80);
}

export function notifyFirstHandCardReceived() {
  window.setTimeout(tryShowKickstarterProof, 80);
}
