import {
  allParties, myPartyCodes, isActiveParty, partyIdentity, committedToday, getProfile,
} from './store.js';
import { cardById as xtyCardById, cardNameTh, XTY_RARITY_META } from './cards.js';
import { avatarById } from './avatars.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';
import { cardSVG } from '../../core7/js/art.js';

const BACK = '/core7/assets/myclover-back.webp';
let scheduled = false;
let rendering = false;
let lastSignature = '';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function isOwnedParty(party) {
  const identity = partyIdentity(party.code);
  return !!(identity?.userId && party.ownerId && identity.userId === party.ownerId);
}

function partiesForHome() {
  const mine = new Set(myPartyCodes());
  return allParties()
    .filter(party => mine.has(party.code))
    .map((party, index) => ({ party, index, owned: isOwnedParty(party) }))
    .sort((a, b) => {
      const activeA = isActiveParty(a.party) ? 0 : 1;
      const activeB = isActiveParty(b.party) ? 0 : 1;
      if (activeA !== activeB) return activeA - activeB;
      const timeA = new Date(a.party.createdAt || a.party.startAt || 0).getTime() || 0;
      const timeB = new Date(b.party.createdAt || b.party.startAt || 0).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      return a.index - b.index;
    });
}

function xtyCardMarkup(card) {
  const rarity = XTY_RARITY_META[card.rarity] || XTY_RARITY_META.common;
  return `<div class="animal-card rarity-${esc(card.rarity || 'common')}" data-color="${esc(card.color)}" data-species="${esc(card.species)}">`
    + `<img class="card-art" src="${esc(card.imageFull || card.art)}" alt="" width="630" height="880" loading="lazy" decoding="async">`
    + `<span class="card-copy"><b>${esc(cardNameTh(card))}</b></span>`
    + `<span class="rarity-badge">${esc(rarity.label)}</span>`
    + '</div>';
}

function coverMarkup(party) {
  if (party.coverType === 'core7_card' && party.coverValue) {
    const card = core7CardById(party.coverValue);
    if (card) return `<div class="xty-home-cover xty-home-core7-cover">${cardSVG(card.id, { width: 300, showNumber: true })}</div>`;
  }

  const usesXtyCard = ['card', 'legacy_card'].includes(party.coverType)
    || (!party.coverType && party.leadCardId);
  if (usesXtyCard) {
    const card = xtyCardById(party.leadCardId || party.coverValue);
    if (card) return `<div class="xty-home-cover">${xtyCardMarkup(card)}</div>`;
  }

  if (party.coverType === 'card_back') {
    return `<div class="xty-home-cover xty-home-real-back"><img src="${BACK}" alt="หลังการ์ด myClover"></div>`;
  }

  const profile = getProfile();
  let snapshot = { species: profile?.avatarId || 'orange_cat', color: profile?.avatarFrame || 'green' };
  try { snapshot = { ...snapshot, ...JSON.parse(party.coverValue || '{}') }; } catch {}
  const avatar = avatarById(snapshot.species);
  return `<div class="xty-home-cover avatar-cover" data-color="${esc(snapshot.color || 'green')}">`
    + `<img src="${esc(avatar.art)}" alt=""><b>${esc(avatar.nameTh)}</b></div>`;
}

function terminalLabel(party) {
  const state = String(party.state || '').toUpperCase();
  if (state === 'DISSOLVED') return 'DISSOLVED';
  if (state === 'COMPLETED') return 'COMPLETED';
  return '';
}

function slideMarkup(entry, total) {
  const { party, owned } = entry;
  const done = committedToday(party).size;
  const members = Array.isArray(party.members) ? party.members.length : 0;
  const terminal = !isActiveParty(party);
  const badge = terminal ? terminalLabel(party) : (owned ? 'หัวตี้' : 'เข้าร่วม');
  return `<article class="xty-party-slide${total === 1 ? ' single' : ''}" data-code="${esc(party.code)}">`
    + `<div class="card main-party">`
    + coverMarkup(party)
    + `<div class="xty-party-copy"><span class="party-state">${esc(badge)}</span>`
    + `<h2>${esc(party.name)}</h2>`
    + `<p class="whisper" style="margin:0">${esc(party.activity || 'ยังไม่ระบุกิจกรรม')}</p>`
    + `<p class="whisper">${done}/${members} Commit วันนี้</p>`
    + `<a class="btn gold sm" href="/xty/p/?c=${encodeURIComponent(party.code)}">${terminal ? 'ดู Ending' : 'เข้าตี้ / Commit'}</a>`
    + `</div></div></article>`;
}

function signatureOf(entries) {
  return entries.map(({ party, owned }) => [
    party.code, owned ? 1 : 0, party.state, party.updatedAt, party.coverType,
    party.coverValue, party.leadCardId, party.members?.length || 0, party.log?.length || 0,
  ].join(':')).join('|');
}

function sync() {
  scheduled = false;
  if (rendering) return;
  const host = document.getElementById('mainParty');
  if (!host) return;
  const entries = partiesForHome();
  if (!entries.length) return;
  const signature = signatureOf(entries);
  if (signature === lastSignature && host.querySelector('.xty-party-carousel')) return;

  rendering = true;
  const total = entries.length;
  host.innerHTML = `<div class="xty-party-carousel${total > 1 ? ' multiple' : ''}" aria-label="ตี้ของคุณ · ปัดซ้ายขวาเพื่อดูตี้อื่น">`
    + entries.map(entry => slideMarkup(entry, total)).join('')
    + '</div>';

  const rows = document.getElementById('myParties');
  if (rows) rows.replaceChildren();
  const heading = document.getElementById('partyHeading');
  if (heading) heading.hidden = true;
  lastSignature = signature;
  rendering = false;
}

function schedule() {
  if (scheduled || rendering) return;
  scheduled = true;
  /* MutationObserver + microtask runs before the browser's next paint. This
     removes the old one-frame legacy layout that used to flash before the
     carousel took over. */
  queueMicrotask(sync);
}

const style = document.createElement('style');
style.id = 'xty-home-cover-v3-style';
style.textContent = `
  #mainParty{margin-top:18px;margin-right:-20px;margin-left:-20px}
  /* index.html still owns the local-first data paint, but its old direct
     main-party card is never allowed to become visible. The observer swaps
     it for the canonical carousel in the same paint cycle. */
  #mainParty>.main-party{visibility:hidden!important;pointer-events:none!important}
  #partyHeading,#myParties{display:none!important}
  .xty-party-carousel{
    display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;
    padding:0 20px 9px;scroll-snap-type:x mandatory;scroll-padding-left:20px;
    overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;
    scrollbar-width:none;
  }
  .xty-party-carousel::-webkit-scrollbar{display:none}
  .xty-party-slide{flex:0 0 calc(100% - 34px);min-width:0;scroll-snap-align:start;scroll-snap-stop:always}
  .xty-party-slide.single{flex-basis:100%}
  .xty-party-slide .main-party{
    display:grid!important;grid-template-columns:var(--xty-party-cover-size,132px) minmax(0,1fr)!important;
    gap:clamp(13px,3vw,18px)!important;align-items:center!important;
    min-height:100%;margin-top:0!important;
  }
  .xty-home-cover{
    display:block;width:var(--xty-party-cover-size,132px)!important;max-width:none!important;min-width:0!important;
    height:auto!important;aspect-ratio:var(--xty-party-cover-aspect,5/7)!important;overflow:hidden;border-radius:14px;
  }
  .xty-home-cover>.animal-card,
  .xty-home-cover.avatar-cover,
  .xty-home-core7-cover,
  .xty-home-real-back{
    width:100%!important;height:100%!important;aspect-ratio:var(--xty-party-cover-aspect,5/7)!important;
  }
  .xty-home-core7-cover,.xty-home-real-back{box-shadow:var(--shadow);background:#13291d}
  .xty-home-core7-cover svg,.xty-home-real-back img{
    display:block;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;
  }
  .xty-party-copy{min-width:0}
  .xty-party-copy h2{overflow-wrap:anywhere;margin:4px 0 3px;font-size:22px;line-height:1.25}
  .xty-party-copy .btn{margin-top:13px}
  .xty-home-cover.avatar-cover small{display:none!important}
  @media(max-width:480px){
    .xty-party-slide{flex-basis:calc(100% - 30px)}
    .xty-party-slide .main-party{gap:13px!important}
  }
`;
document.head.appendChild(style);

const home = document.getElementById('home');
if (home) new MutationObserver(schedule).observe(home, { childList: true, subtree: true });
schedule();
