import {
  allParties, myPartyCodes, isActiveParty, partyIdentity, committedToday, getProfile,
} from './store.js';
import { cardById as xtyCardById, cardNameTh } from './cards.js';
import { avatarById } from './avatars.js';
import { PET_BY_ID } from './pets.js';
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
  if (!identity?.userId) return false;
  const member = Array.isArray(party.members)
    ? party.members.find(item => item.userId === identity.userId)
    : null;
  return !!((party.ownerId && identity.userId === party.ownerId) || member?.role === 'lead');
}

function allMyParties() {
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

/* The large Home carousel is OWNER space only. Joined parties belong in
   the lower "ตี้ที่เป็นสมาชิก" list and must never appear as a hero card. */
function partiesForHome(entries = allMyParties()) {
  return entries.filter(entry => entry.owned);
}

function xtyCardMarkup(card) {
  return `<div class="animal-card rarity-${esc(card.rarity || 'common')}" data-color="${esc(card.color)}" data-species="${esc(card.species)}">`
    + `<img class="card-art" src="${esc(card.imageFull || card.art)}" alt="" width="630" height="880" loading="lazy" decoding="async">`
    + `<span class="card-copy"><b>${esc(cardNameTh(card))}</b></span>`
    + '</div>';
}

function coverMarkup(party) {
  /* An ending picture set by the lead outranks any card: it is what the
     party chose to be remembered by. */
  if (party.coverType === 'image' && party.coverValue) {
    return `<div class="xty-home-cover xty-home-image-cover">`
      + `<img src="${esc(party.coverValue)}" alt="ปกฉากจบของ ${esc(party.name || 'ตี้')}" loading="lazy" decoding="async">`
      + '</div>';
  }

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
  const lead = Array.isArray(party.members) ? party.members.find(member => member.role === 'lead') : null;
  let snapshot = {
    species: lead?.avatar || profile?.avatarId || 'orange_cat',
    color: lead?.avatarColor || lead?.avatar_color || profile?.avatarFrame || 'green',
  };
  try { snapshot = { ...snapshot, ...JSON.parse(party.coverValue || '{}') }; } catch {}
  const avatar = avatarById(snapshot.species);
  return `<div class="xty-home-cover avatar-cover" data-color="${esc(snapshot.color || 'green')}">`
    + `<img src="${esc(avatar.art)}" alt=""><b>${esc(avatar.nameTh)}</b></div>`;
}

function petThumbMarkup(party) {
  const npc = party.npcCardId ? xtyCardById(party.npcCardId) : null;
  if (npc) {
    const art = npc.art || npc.imageFull;
    if (art) return `<span class="xty-party-row-pet"><img src="${esc(art)}" alt="${esc(cardNameTh(npc))}" loading="lazy" decoding="async"></span>`;
  }

  const pet = party.petId ? PET_BY_ID[party.petId] : null;
  if (pet?.art) {
    return `<span class="xty-party-row-pet"><img src="${esc(pet.art)}" alt="${esc(pet.nameTh)}" loading="lazy" decoding="async"></span>`;
  }
  if (pet?.emoji) return `<span class="xty-party-row-pet emoji" aria-label="${esc(pet.nameTh)}">${esc(pet.emoji)}</span>`;

  /* Keep the slot even when there is no companion so every title starts at
     exactly the same x-position. */
  return '<span class="xty-party-row-pet empty" aria-hidden="true"></span>';
}

function rowVisualSignature(party) {
  return [
    party.coverType || '', party.coverValue || '', party.leadCardId || '',
    party.npcCardId || '', party.petId || '', party.updatedAt || '',
  ].join(':');
}

function decoratePartyRows(entries) {
  const byCode = new Map(entries.map(entry => [String(entry.party.code), entry.party]));
  const rows = document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row');
  for (const row of rows) {
    let code = '';
    try { code = new URL(row.href, location.href).searchParams.get('c') || ''; } catch {}
    const party = byCode.get(code);
    if (!party) continue;

    const signature = rowVisualSignature(party);
    if (row.dataset.xtyVisualSignature === signature && row.classList.contains('xty-party-summary-row')) continue;

    const visual = document.createElement('span');
    visual.className = 'xty-party-row-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = `<span class="xty-party-row-cover">${coverMarkup(party)}</span>${petThumbMarkup(party)}`;

    const oldIcon = row.querySelector('.ic');
    if (oldIcon) oldIcon.replaceWith(visual);
    else row.prepend(visual);
    row.classList.add('xty-party-summary-row');
    row.dataset.xtyVisualSignature = signature;
  }
}

function terminalLabel(party) {
  const state = String(party.state || '').toUpperCase();
  if (state === 'DISSOLVED') return 'DISSOLVED';
  if (state === 'COMPLETED') return 'COMPLETED';
  return '';
}

function slideMarkup(entry, total) {
  const { party } = entry;
  const done = committedToday(party).size;
  const members = Array.isArray(party.members) ? party.members.length : 0;
  const terminal = !isActiveParty(party);
  const badge = terminal ? terminalLabel(party) : 'หัวตี้';
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
  return entries.map(({ party }) => [
    party.code, party.state, party.updatedAt, party.coverType,
    party.coverValue, party.leadCardId, party.members?.length || 0, party.log?.length || 0,
  ].join(':')).join('|');
}

function sync() {
  scheduled = false;
  if (rendering) return;
  const host = document.getElementById('mainParty');
  if (!host) return;

  const allEntries = allMyParties();
  decoratePartyRows(allEntries);
  const entries = partiesForHome(allEntries);

  /* A user who only joined other people's parties gets no large hero card.
     Their parties remain visible in the lower member group. */
  if (!entries.length) {
    if (host.querySelector('.xty-party-carousel')) host.replaceChildren();
    lastSignature = '';
    return;
  }

  const signature = signatureOf(entries);
  if (signature === lastSignature && host.querySelector('.xty-party-carousel')) return;

  rendering = true;
  const total = entries.length;
  host.innerHTML = `<div class="xty-party-carousel${total > 1 ? ' multiple' : ''}" aria-label="ตี้ที่คุณเป็นหัวตี้ · ปัดซ้ายขวาเพื่อดูตี้อื่น">`
    + entries.map(entry => slideMarkup(entry, total)).join('')
    + '</div>';
  lastSignature = signature;
  rendering = false;
}

function schedule() {
  if (scheduled || rendering) return;
  scheduled = true;
  queueMicrotask(sync);
}

const style = document.createElement('style');
style.id = 'xty-home-cover-v3-style';
style.textContent = `
  #mainParty{margin-top:18px;margin-right:-20px;margin-left:-20px}
  #mainParty>.main-party{visibility:hidden!important;pointer-events:none!important}
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

  /* Lower party lists: the Party Cover is the primary visual. The companion
     gets its own fixed secondary slot. Empty companion slots stay reserved,
     so every party name/detail column lines up exactly and nothing overlaps. */
  .party-group .xty-party-summary-row{
    display:grid!important;
    grid-template-columns:100px minmax(0,1fr) 18px!important;
    gap:12px!important;align-items:center!important;
    min-height:104px!important;padding:10px 14px!important;
  }
  .xty-party-row-visual{
    width:100px;height:82px;display:grid;grid-template-columns:58px 34px;
    gap:8px;align-items:center;justify-content:start;overflow:visible;
  }
  .xty-party-row-cover{
    width:58px;height:82px;display:block;overflow:hidden;border-radius:9px;
  }
  .xty-party-row-cover .xty-home-cover{
    width:58px!important;height:82px!important;max-width:58px!important;
    min-width:58px!important;aspect-ratio:5/7!important;border-radius:9px!important;
  }
  .xty-party-row-cover .xty-home-cover>.animal-card,
  .xty-party-row-cover .xty-home-core7-cover,
  .xty-party-row-cover .xty-home-real-back,
  .xty-party-row-cover .xty-home-cover.avatar-cover{
    width:58px!important;height:82px!important;min-width:58px!important;
    aspect-ratio:5/7!important;border-radius:9px!important;
  }
  .xty-party-row-cover .xty-home-core7-cover svg,
  .xty-party-row-cover .xty-home-real-back img{
    width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;
  }
  .xty-party-row-cover .animal-card .card-copy,
  .xty-party-row-cover .animal-card .card-art{
    width:100%!important;height:100%!important;margin:0!important;object-fit:cover!important;
  }
  .xty-party-row-cover .xty-home-cover.avatar-cover{
    padding:3px!important;border-width:2px!important;box-shadow:none!important;
  }
  .xty-party-row-cover .xty-home-cover.avatar-cover>b,
  .xty-party-row-cover .xty-home-cover.avatar-cover::after{display:none!important}
  .xty-party-row-cover .xty-home-cover.avatar-cover>img{
    width:100%!important;height:100%!important;border-radius:6px!important;object-fit:contain!important;
  }
  .xty-party-row-pet{
    width:34px;height:34px;display:grid;place-items:center;align-self:center;
    overflow:visible;font-size:27px;line-height:1;
  }
  .xty-party-row-pet img{
    display:block;width:34px;height:34px;max-width:none;object-fit:contain;
  }
  .xty-party-row-pet.empty{visibility:hidden}
  .party-group .xty-party-summary-row .tx{min-width:0;align-self:center}
  .party-group .xty-party-summary-row .tx b{
    display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .party-group .xty-party-summary-row .tx small{
    display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .party-group .xty-party-summary-row .go{justify-self:end;align-self:center}

  @media(max-width:480px){
    .xty-party-slide{flex-basis:calc(100% - 30px)}
    .xty-party-slide .main-party{gap:13px!important}
  }
  @media(max-width:380px){
    .party-group .xty-party-summary-row{
      grid-template-columns:90px minmax(0,1fr) 16px!important;gap:9px!important;padding:9px 11px!important;
    }
    .xty-party-row-visual{width:90px;height:76px;grid-template-columns:54px 30px;gap:6px}
    .xty-party-row-cover,
    .xty-party-row-cover .xty-home-cover,
    .xty-party-row-cover .xty-home-cover>.animal-card,
    .xty-party-row-cover .xty-home-core7-cover,
    .xty-party-row-cover .xty-home-real-back,
    .xty-party-row-cover .xty-home-cover.avatar-cover{
      width:54px!important;min-width:54px!important;height:76px!important;
    }
    .xty-party-row-pet,.xty-party-row-pet img{width:30px;height:30px}
    .xty-party-row-pet{font-size:24px}
  }
`;
document.head.appendChild(style);

const home = document.getElementById('home');
if (home) new MutationObserver(schedule).observe(home, { childList: true, subtree: true });
schedule();
