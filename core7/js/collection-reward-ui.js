/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Match Completion Reward Popup
   Shows after every completed Match, including each Match in a SET.
   The reward starts face-down and only reveals its identity after a
   deliberate player flip, so the Flavor Text gets its own moment.
   ═══════════════════════════════════════════════════════════════ */

import {
  SELECT_MODE_UNLOCK_COUNT,
  TOTAL_COLLECTION_CARDS,
  unlockRandomCard,
} from './collection-progress.js';
import { COLOR_META } from './cards.js';
import { cardBackSVG, cardSVG } from './art.js';
import { playCardFlip, playSfx } from './audio.js';

function readSnapshot(matchId) {
  try {
    const raw = localStorage.getItem(`c7:match_${matchId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isCompletedSnapshot(snapshot) {
  if (!snapshot) return false;
  if (snapshot.view?.result) return true;
  return snapshot.state?.phase === 'MATCH_RESULT' && !!snapshot.state?.result;
}

function addStyles() {
  if (document.getElementById('c7-reward-style')) return;
  const style = document.createElement('style');
  style.id = 'c7-reward-style';
  style.textContent = `
    .c7-reward{position:fixed;inset:0;z-index:2400;display:grid;place-items:center;padding:18px;background:rgb(2 13 7/.88);backdrop-filter:blur(13px);animation:c7RewardFade .25s ease both}
    .c7-reward[hidden],.c7-reward [hidden]{display:none!important}
    .c7-reward__panel{position:relative;width:min(760px,100%);display:grid;grid-template-columns:minmax(210px,282px) minmax(0,1fr);column-gap:clamp(24px,5vw,46px);row-gap:clamp(24px,3vw,32px);align-items:center;overflow:hidden;border:1px solid rgb(234 208 140/.55);border-radius:30px;padding:clamp(22px,5vw,40px);color:#fff;background:radial-gradient(560px 300px at 2% 0%,rgb(27 106 66/.48),transparent 66%),radial-gradient(430px 270px at 100% 100%,rgb(190 148 66/.24),transparent 68%),linear-gradient(145deg,#061b10,#0b2d1a);box-shadow:0 48px 130px rgb(0 0 0/.75);animation:c7RewardPop .45s cubic-bezier(.22,1,.36,1) both}
    .c7-reward__panel::before{content:"";position:absolute;inset:-35%;pointer-events:none;background:conic-gradient(from 120deg,transparent,rgb(234 208 140/.055),transparent 28%);animation:c7RewardGlow 8s linear infinite}
    .c7-reward__visual,.c7-reward__copy{position:relative;z-index:1;min-width:0}
    .c7-reward__visual{display:grid;align-items:start}
    .c7-reward__flip{position:relative;width:100%;aspect-ratio:63/88;border:0;padding:0;border-radius:10px;background:transparent;cursor:pointer;perspective:1300px;filter:drop-shadow(0 26px 28px rgb(0 0 0/.42));transform:rotate(-1.4deg);transition:transform .25s ease,filter .25s ease;-webkit-tap-highlight-color:transparent}
    .c7-reward__flip:hover{transform:rotate(-.5deg) translateY(-4px);filter:drop-shadow(0 31px 32px rgb(0 0 0/.48))}
    .c7-reward__flip:focus-visible{outline:3px solid #ead08c;outline-offset:7px}
    .c7-reward__flip-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .78s cubic-bezier(.2,.72,.16,1)}
    .c7-reward__flip.is-flipped .c7-reward__flip-inner{transform:rotateY(180deg)}
    .c7-reward__face{position:absolute;inset:0;overflow:visible;border-radius:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
    .c7-reward__face--front{transform:rotateY(180deg)}
    .c7-reward__face svg{display:block;width:100%;height:100%;overflow:visible;border-radius:0}
    .c7-reward__face--back::after{content:"FLIP TO REVEAL";position:absolute;left:50%;bottom:13px;translate:-50% 0;width:max-content;padding:7px 10px;border:1px solid rgb(234 208 140/.34);border-radius:999px;color:#ead08c;background:rgb(5 22 13/.74);backdrop-filter:blur(6px);font:800 9px/1 "Bai Jamjuree",system-ui;letter-spacing:.15em;box-shadow:0 6px 18px rgb(0 0 0/.28)}
    .c7-reward__flip.is-flipped .c7-reward__face--back::after{content:none}
    .c7-reward__flip:not(.is-flipped)::after{content:"";position:absolute;inset:0;border-radius:10px;pointer-events:none;background:linear-gradient(110deg,transparent 28%,rgb(255 255 255/.13) 46%,transparent 62%);transform:translateX(-120%);animation:c7RewardShine 2.8s ease-in-out infinite}
    .c7-reward__flavor{position:relative;z-index:1;grid-column:1/-1;margin:0;width:100%;padding:19px clamp(24px,5vw,50px) 18px;border:1px solid rgb(234 208 140/.28);border-radius:17px;color:rgb(255 255 255/.88);background:rgb(255 255 255/.06);font:500 clamp(17px,1.7vw,20px)/1.8 "Anuphan",system-ui;text-align:center;text-wrap:balance;animation:c7RewardStory .45s .08s ease both}
    .c7-reward__quote{display:inline-block;color:#ead08c;font:800 42px/.72 "Bai Jamjuree",system-ui;text-shadow:0 0 20px rgb(234 208 140/.22);vertical-align:-.18em;user-select:none}
    .c7-reward__quote--open{margin-right:7px}.c7-reward__quote--close{margin-left:5px}.c7-reward__flavor-text{display:inline}
    .c7-reward__eyebrow{display:block;color:#ead08c;font:800 11px/1.3 "Bai Jamjuree",system-ui;letter-spacing:.16em}
    .c7-reward__copy h2{margin:11px 0 5px;font:800 clamp(29px,6vw,47px)/1.08 "Bai Jamjuree",system-ui;letter-spacing:-.035em;text-wrap:balance}
    .c7-reward__hint{margin-top:14px;color:rgb(255 255 255/.63);font-size:13.5px;line-height:1.65}
    .c7-reward__name{font:700 clamp(18px,3vw,24px)/1.35 "Bai Jamjuree",system-ui;color:#ead08c;animation:c7RewardStory .4s ease both}
    .c7-reward__meter{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:20px;padding:13px 15px;border:1px solid rgb(255 255 255/.12);border-radius:15px;background:rgb(255 255 255/.055);animation:c7RewardStory .4s .04s ease both}
    .c7-reward__meter span{color:rgb(255 255 255/.58);font:700 10px/1.3 "Bai Jamjuree",system-ui;letter-spacing:.13em}.c7-reward__meter b{color:#ead08c;font:800 22px/1 "Bai Jamjuree",system-ui}
    .c7-reward__unlock{margin-top:12px;padding:11px 13px;border-radius:13px;color:#071d12;background:#ead08c;font-size:12.5px;font-weight:800;animation:c7RewardStory .4s .08s ease both}
    .c7-reward__set-note{margin-top:12px;padding:11px 13px;border:1px solid rgb(255 255 255/.14);border-radius:13px;color:rgb(255 255 255/.78);background:rgb(255 255 255/.055);font-size:12.5px;line-height:1.55;animation:c7RewardStory .4s .1s ease both}
    .c7-reward__actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px;animation:c7RewardStory .4s .12s ease both}
    .c7-reward__btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 17px;border:1px solid rgb(255 255 255/.18);border-radius:13px;color:#fff;background:rgb(255 255 255/.07);font:800 13px/1.2 "Bai Jamjuree",system-ui;cursor:pointer;text-decoration:none}.c7-reward__btn--gold{border-color:#ead08c;color:#071d12;background:#ead08c}.c7-reward__actions .c7-reward__btn:only-child{width:100%}
    @keyframes c7RewardFade{from{opacity:0}to{opacity:1}}@keyframes c7RewardPop{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}@keyframes c7RewardStory{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}@keyframes c7RewardShine{0%,28%{transform:translateX(-120%)}58%,100%{transform:translateX(120%)}}@keyframes c7RewardGlow{to{transform:rotate(360deg)}}
    @media(max-width:620px){.c7-reward{align-items:end;padding:10px}.c7-reward__panel{grid-template-columns:116px minmax(0,1fr);column-gap:17px;row-gap:16px;border-radius:24px;padding:20px}.c7-reward__copy h2{font-size:27px}.c7-reward__hint{font-size:12.5px}.c7-reward__visual{display:contents}.c7-reward__flip{grid-column:1;grid-row:1;align-self:center}.c7-reward__copy{grid-column:2;grid-row:1}.c7-reward__flavor{grid-column:1/-1;grid-row:2;padding:15px 18px 14px;border-radius:14px;font-size:15px;line-height:1.72;text-wrap:pretty}.c7-reward__quote{font-size:34px}.c7-reward__meter,.c7-reward__unlock,.c7-reward__set-note,.c7-reward__actions{grid-column:1/-1}.c7-reward__actions{display:grid;grid-template-columns:1fr 1fr}.c7-reward__btn{padding-inline:10px}.c7-reward__actions .c7-reward__btn:only-child{grid-column:1/-1}.c7-reward__face--back::after{font-size:7px;bottom:7px;padding:5px 7px}}
    @media(prefers-reduced-motion:reduce){.c7-reward,.c7-reward__panel,.c7-reward__panel::before,.c7-reward__flip,.c7-reward__flip-inner,.c7-reward__flip:not(.is-flipped)::after,.c7-reward__flavor,.c7-reward__name,.c7-reward__meter,.c7-reward__unlock,.c7-reward__set-note,.c7-reward__actions{animation:none;transition:none}}
  `;
  document.head.append(style);
}

function hasNextSetMatchAction() {
  return [...document.querySelectorAll('#actions button, #actions a')].some(node => (
    /เล่นรอบต่อไป|next match/i.test(node.textContent || '')
  ));
}

function showReward(reward, { isSet = false } = {}) {
  if (!reward?.card || document.getElementById('c7Reward')) return;
  addStyles();

  const card = reward.card;
  const meta = COLOR_META[card.color];
  const continueSet = isSet && hasNextSetMatchAction();
  const overlay = document.createElement('div');
  overlay.id = 'c7Reward';
  overlay.className = 'c7-reward';
  overlay.dataset.revealed = 'false';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'c7RewardTitle');

  overlay.innerHTML = `
    <section class="c7-reward__panel">
      <div class="c7-reward__visual">
        <button class="c7-reward__flip" type="button" data-flip aria-label="พลิกเพื่อเปิดการ์ดใหม่" aria-pressed="false">
          <span class="c7-reward__flip-inner">
            <span class="c7-reward__face c7-reward__face--back">${cardBackSVG({ width: 280 })}</span>
            <span class="c7-reward__face c7-reward__face--front">${cardSVG(card.id, { width: 280 })}</span>
          </span>
        </button>
      </div>
      <div class="c7-reward__copy" aria-live="polite">
        <span class="c7-reward__eyebrow">YOU GOT A NEW CARD</span>
        <h2 id="c7RewardTitle" data-title>คุณได้รับการ์ดใบใหม่</h2>
        <p class="c7-reward__hint" data-hint>แตะการ์ดเพื่อเปิด</p>
        <div data-reveal hidden>
          <div class="c7-reward__name">${meta.emoji} ${card.th}</div>
          <div class="c7-reward__meter"><span>FIRST HAND</span><b>${reward.count}/${TOTAL_COLLECTION_CARDS}</b></div>
          ${reward.selectModeJustUnlocked ? `<div class="c7-reward__unlock">🔓 SELECT HAND UNLOCKED · คุณปลดล็อก FIRST HAND ครบ ${SELECT_MODE_UNLOCK_COUNT} ใบแล้ว</div>` : ''}
          ${continueSet ? '<div class="c7-reward__set-note">แต่ละคนอาจได้การ์ดไม่เหมือนกัน — ลองแชร์กันว่าได้ใบอะไร แล้วปิดหน้าต่างนี้เพื่อกดพร้อมเล่น Match ต่อไป</div>' : ''}
          <div class="c7-reward__actions">
            <button class="c7-reward__btn c7-reward__btn--gold" type="button" data-close>${continueSet ? 'ปิด · กลับไปกดพร้อม' : 'รับการ์ด'}</button>
            ${continueSet ? '' : '<a class="c7-reward__btn" href="/core7/collection/">ดู Collection</a>'}
          </div>
        </div>
      </div>
      <blockquote class="c7-reward__flavor" data-flavor hidden><span class="c7-reward__quote c7-reward__quote--open" aria-hidden="true">“</span><span class="c7-reward__flavor-text">${card.story || 'การ์ดใบนี้ถูกเพิ่มลงใน FIRST HAND Collection ของคุณแล้ว'}</span><span class="c7-reward__quote c7-reward__quote--close" aria-hidden="true">”</span></blockquote>
    </section>`;

  const flip = overlay.querySelector('[data-flip]');
  const title = overlay.querySelector('[data-title]');
  const hint = overlay.querySelector('[data-hint]');
  const flavor = overlay.querySelector('[data-flavor]');
  const revealContent = overlay.querySelector('[data-reveal]');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let revealed = false;

  const close = () => {
    if (!revealed) return;
    overlay.remove();
    document.documentElement.style.overflow = '';
  };

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    overlay.dataset.revealed = 'true';
    flip.classList.add('is-flipped');
    flip.setAttribute('aria-pressed', 'true');
    flip.setAttribute('aria-label', `การ์ด ${card.en} ${card.th}`);
    playCardFlip(false);
    window.setTimeout(() => playSfx('reveal'), reducedMotion ? 0 : 250);

    const revealDetails = () => {
      title.textContent = `คุณได้รับ “${card.en}”`;
      hint.hidden = true;
      flavor.hidden = false;
      revealContent.hidden = false;
    };
    window.setTimeout(revealDetails, reducedMotion ? 0 : 390);
  };

  flip.addEventListener('click', reveal);
  overlay.querySelector('[data-close]').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', function escape(event) {
    if (event.key !== 'Escape' || !document.body.contains(overlay) || !revealed) return;
    close();
    document.removeEventListener('keydown', escape);
  });

  document.documentElement.style.overflow = 'hidden';
  document.body.append(overlay);
  flip.focus();
}

function boot() {
  const matchId = new URLSearchParams(location.search).get('m');
  if (!matchId) return;
  const snapshot = readSnapshot(matchId);
  if (!isCompletedSnapshot(snapshot)) return;
  const reward = unlockRandomCard(matchId);
  if (!reward.isNew) return;
  const isSet = Number(snapshot.series?.target || 0) > 1;
  /* Let the result page paint its actions first, then reveal the reward. */
  window.setTimeout(() => showReward(reward, { isSet }), 360);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

export { SELECT_MODE_UNLOCK_COUNT };
