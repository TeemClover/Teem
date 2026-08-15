import { allParties, myPartyCodes, isActiveParty } from './store.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';
import { cardSVG } from '../../core7/js/art.js';

const BACK = '/core7/assets/myclover-back.webp';
let scheduled = false;

function mainParty() {
  const mine = new Set(myPartyCodes());
  const list = allParties().filter(p => mine.has(p.code));
  return list.find(isActiveParty) || list[0] || null;
}

function sync() {
  scheduled = false;
  const party = mainParty();
  const host = document.getElementById('mainParty');
  const card = host?.querySelector('.main-party');
  if (!party || !card) return;
  const current = card.firstElementChild;
  if (!current) return;

  if (party.coverType === 'core7_card' && party.coverValue) {
    const core = core7CardById(party.coverValue);
    if (!core || current.dataset?.coverV3 === party.coverValue) return;
    const wrap = document.createElement('div');
    wrap.className = 'xty-home-core7-cover';
    wrap.dataset.coverV3 = party.coverValue;
    wrap.innerHTML = cardSVG(core.id, { width: 300, showNumber: true });
    current.replaceWith(wrap);
    return;
  }

  if (party.coverType === 'card_back' && current.dataset?.coverV3 !== 'back') {
    const wrap = document.createElement('div');
    wrap.className = 'xty-home-real-back';
    wrap.dataset.coverV3 = 'back';
    wrap.innerHTML = `<img src="${BACK}" alt="หลังการ์ด myClover">`;
    current.replaceWith(wrap);
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(sync);
}

const style = document.createElement('style');
style.textContent = `
  .xty-home-core7-cover,.xty-home-real-back{flex:none;width:min(154px,34vw);aspect-ratio:63/88;overflow:hidden;border-radius:14px;box-shadow:var(--shadow);background:#13291d}
  .xty-home-core7-cover svg,.xty-home-real-back img{display:block;width:100%;height:100%;object-fit:cover}
`;
document.head.appendChild(style);

const host = document.getElementById('mainParty');
if (host) new MutationObserver(schedule).observe(host, { childList: true, subtree: true });
schedule();
