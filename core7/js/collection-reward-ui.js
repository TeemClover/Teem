/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Match Completion Reward Popup
   ═══════════════════════════════════════════════════════════════ */

import {
  SELECT_MODE_UNLOCK_COUNT,
  TOTAL_COLLECTION_CARDS,
  unlockRandomCard,
} from './collection-progress.js';
import { COLOR_META } from './cards.js';
import { cardSVG } from './art.js';

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
    .c7-reward{position:fixed;inset:0;z-index:2400;display:grid;place-items:center;padding:18px;background:rgb(2 13 7/.86);backdrop-filter:blur(12px);animation:c7RewardFade .25s ease both}
    .c7-reward[hidden]{display:none}
    .c7-reward__card{position:relative;width:min(720px,100%);display:grid;grid-template-columns:minmax(210px,280px) minmax(0,1fr);gap:clamp(20px,5vw,42px);align-items:center;overflow:hidden;border:1px solid rgb(234 208 140/.55);border-radius:28px;padding:clamp(22px,5vw,38px);color:#fff;background:radial-gradient(540px 280px at 5% 0%,rgb(27 106 66/.45),transparent 66%),radial-gradient(420px 260px at 100% 100%,rgb(190 148 66/.23),transparent 68%),linear-gradient(145deg,#071d12,#0b2c1a);box-shadow:0 46px 120px rgb(0 0 0/.72);animation:c7RewardPop .45s cubic-bezier(.22,1,.36,1) both}
    .c7-reward__art{filter:drop-shadow(0 24px 26px rgb(0 0 0/.38));transform:rotate(-1.5deg)}
    .c7-reward__art svg{display:block;width:100%;height:auto;border-radius:15px}
    .c7-reward__eyebrow{display:block;color:#ead08c;font:800 11px/1.3 "Bai Jamjuree",system-ui;letter-spacing:.16em}
    .c7-reward__copy h2{margin:10px 0 3px;font:800 clamp(28px,6vw,46px)/1.08 "Bai Jamjuree",system-ui;letter-spacing:-.035em}
    .c7-reward__name{font:700 clamp(18px,3vw,25px)/1.35 "Bai Jamjuree",system-ui;color:#ead08c}
    .c7-reward__story{margin:14px 0 0;color:rgb(255 255 255/.7);font-size:14px;line-height:1.75}
    .c7-reward__meter{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:20px;padding:13px 15px;border:1px solid rgb(255 255 255/.12);border-radius:15px;background:rgb(255 255 255/.055)}
    .c7-reward__meter span{color:rgb(255 255 255/.58);font:700 10px/1.3 "Bai Jamjuree",system-ui;letter-spacing:.13em}
    .c7-reward__meter b{color:#ead08c;font:800 22px/1 "Bai Jamjuree",system-ui}
    .c7-reward__unlock{margin-top:12px;padding:11px 13px;border-radius:13px;color:#071d12;background:#ead08c;font-size:12.5px;font-weight:800}
    .c7-reward__actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}
    .c7-reward__btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 17px;border:1px solid rgb(255 255 255/.18);border-radius:13px;color:#fff;background:rgb(255 255 255/.07);font:800 13px/1.2 "Bai Jamjuree",system-ui;cursor:pointer;text-decoration:none}
    .c7-reward__btn--gold{border-color:#ead08c;color:#071d12;background:#ead08c}
    @keyframes c7RewardFade{from{opacity:0}to{opacity:1}}
    @keyframes c7RewardPop{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
    @media(max-width:620px){.c7-reward{align-items:end;padding:10px}.c7-reward__card{grid-template-columns:105px minmax(0,1fr);gap:16px;border-radius:23px;padding:20px}.c7-reward__copy h2{font-size:27px}.c7-reward__story{grid-column:1/-1}.c7-reward__meter,.c7-reward__unlock,.c7-reward__actions{grid-column:1/-1}.c7-reward__actions{display:grid;grid-template-columns:1fr 1fr}.c7-reward__btn{padding-inline:10px}}
    @media(prefers-reduced-motion:reduce){.c7-reward,.c7-reward__card{animation:none}}
  `;
  document.head.append(style);
}

function showReward(reward) {
  if (!reward?.card || document.getElementById('c7Reward')) return;
  addStyles();

  const card = reward.card;
  const meta = COLOR_META[card.color];
  const overlay = document.createElement('div');
  overlay.id = 'c7Reward';
  overlay.className = 'c7-reward';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'c7RewardTitle');

  overlay.innerHTML = `
    <section class="c7-reward__card">
      <div class="c7-reward__art">${cardSVG(card.id, { width: 280 })}</div>
      <div class="c7-reward__copy">
        <span class="c7-reward__eyebrow">MATCH COMPLETE · NEW CARD</span>
        <h2 id="c7RewardTitle">ได้รับการ์ดใหม่</h2>
        <div class="c7-reward__name">${meta.emoji} ${card.en} · ${card.th}</div>
        <p class="c7-reward__story">${card.story || 'การ์ดใบนี้ถูกเพิ่มลงใน Collection ของคุณแล้ว'}</p>
        <div class="c7-reward__meter"><span>COLLECTION</span><b>${reward.count}/${TOTAL_COLLECTION_CARDS}</b></div>
        ${reward.selectModeJustUnlocked ? `<div class="c7-reward__unlock">🔓 SELECT HAND UNLOCKED · ตอนนี้คุณจัดมือจาก Collection ได้แล้ว</div>` : ''}
        <div class="c7-reward__actions">
          <button class="c7-reward__btn c7-reward__btn--gold" type="button" data-close>รับการ์ด</button>
          <a class="c7-reward__btn" href="/core7/collection/">ดู Collection</a>
        </div>
      </div>
    </section>`;

  const close = () => {
    overlay.remove();
    document.documentElement.style.overflow = '';
  };
  overlay.querySelector('[data-close]').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', function escape(event) {
    if (event.key !== 'Escape' || !document.body.contains(overlay)) return;
    close();
    document.removeEventListener('keydown', escape);
  });

  document.documentElement.style.overflow = 'hidden';
  document.body.append(overlay);
  overlay.querySelector('[data-close]').focus();
}

function boot() {
  const matchId = new URLSearchParams(location.search).get('m');
  if (!matchId) return;
  const snapshot = readSnapshot(matchId);
  if (!isCompletedSnapshot(snapshot)) return;
  const reward = unlockRandomCard(matchId);
  if (!reward.isNew) return;
  /* Let the result page paint first, then reveal the reward. */
  window.setTimeout(() => showReward(reward), 320);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

export { SELECT_MODE_UNLOCK_COUNT };
