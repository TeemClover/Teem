import { getParty, committedToday } from './store.js';
import { PET_BY_ID } from './pets.js';
import { resolveMemberAvatar } from './card-picker.js';
import { cardById, cardNameTh } from './cards.js';
import { cardMarkup } from './card-ui.js';

const code = new URLSearchParams(location.search).get('c');
let scheduled = false;
let syncing = false;

if (code && /^\d{5}$/.test(code)) install();

function install() {
  injectStyle();
  const seats = document.getElementById('seats');
  if (!seats) return;
  new MutationObserver(schedule).observe(seats, { childList: true, subtree: true });
  schedule();
}

function injectStyle() {
  if (document.getElementById('xty-pet-seat-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-pet-seat-v2-style';
  style.textContent = `
    /* The table is six literal 63×88 card spaces. Nothing in the grid gets
       to grow taller just because it contains a name or a status. */
    #seats.party-table > *{
      width:100%;
      min-width:0;
      aspect-ratio:var(--xty-card-aspect)!important;
    }

    /* If a Collection card is equipped, the card itself IS the seat. Keep
       the frame that belongs to the card and do not add a second lead/pet
       colour border around it. Name and state are printed over the art. */
    #seats .xty-full-card-seat{
      position:relative;
      display:block;
      overflow:hidden;
      border:0!important;
      border-radius:14px;
      background:transparent;
      box-shadow:none!important;
    }
    #seats .xty-full-card-seat > .animal-card{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      margin:0!important;
      border-radius:14px!important;
    }
    #seats .xty-full-card-seat > .animal-card .card-art{
      width:100%!important;
      height:100%!important;
      object-fit:cover!important;
    }
    #seats .xty-full-card-seat .xty-seat-name,
    #seats .xty-full-card-seat .xty-seat-state{
      position:absolute;
      right:7px;
      left:7px;
      z-index:8;
      pointer-events:none;
      color:#3E332C;
      text-align:center;
      text-shadow:
        0 1px 0 rgba(255,254,248,.98),
        1px 0 0 rgba(255,254,248,.95),
        -1px 0 0 rgba(255,254,248,.95),
        0 -1px 0 rgba(255,254,248,.95),
        0 2px 5px rgba(255,254,248,.86);
    }
    #seats .xty-full-card-seat .xty-seat-name{
      top:8px;
      overflow:hidden;
      font-size:clamp(10px,3vw,13px);
      font-weight:900;
      line-height:1.18;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    #seats .xty-full-card-seat .xty-seat-state{
      bottom:7px;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:1px;
      font-size:clamp(8px,2.4vw,10px);
      font-weight:900;
      line-height:1.12;
    }
    #seats .xty-full-card-seat .xty-seat-state b{
      color:var(--xty-primary);
      font-size:clamp(14px,4vw,18px);
      line-height:1;
      text-shadow:
        0 1px 0 rgba(255,254,248,1),
        1px 0 0 rgba(255,254,248,1),
        -1px 0 0 rgba(255,254,248,1),
        0 -1px 0 rgba(255,254,248,1);
    }

    /* Starter PET stays a portrait, not a fake card. */
    .xty-pet-companion-seat{
      position:relative;
      overflow:hidden;
      border:2px dashed color-mix(in srgb,var(--xty-green) 72%,var(--xty-ink));
      background:linear-gradient(180deg,#F4FBEF 0%,#E8F7E9 100%);
      box-shadow:3px 4px 0 rgba(62,51,44,.08);
    }
    .xty-pet-companion-seat .slot-label{
      color:var(--xty-primary);
      letter-spacing:.12em;
    }
    .xty-pet-companion-seat .av{
      width:88%;
      margin-top:10px;
      aspect-ratio:1;
    }
    .xty-pet-companion-seat .av img{
      width:100%;
      height:100%;
      object-fit:contain;
      filter:drop-shadow(0 3px 0 rgba(62,51,44,.08));
    }
    .xty-pet-companion-seat .al{
      margin-top:3px;
      font-size:clamp(11px,3.2vw,14px);
    }
    .xty-pet-companion-seat .rl{
      margin-top:3px;
      color:var(--xty-primary);
    }
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]));
}

function schedule() {
  if (scheduled || syncing) return;
  scheduled = true;
  queueMicrotask(sync);
}

function fullCardSeat(card, { name = '', role = '', mark = '', pet = false } = {}) {
  const tile = document.createElement('div');
  tile.className = 'seat-card-wrap xty-full-card-seat';
  tile.dataset.fullCardSeat = [card.cardId, name, role, mark, pet ? 'pet' : 'member'].join('|');
  tile.innerHTML = cardMarkup(card, { role: pet ? 'npc' : '' })
    + `<span class="xty-seat-name">${esc(name)}</span>`
    + `<span class="xty-seat-state"><span>${esc(role)}</span>${mark ? `<b>${esc(mark)}</b>` : ''}</span>`;
  return tile;
}

function memberCardFor(party, member) {
  if (!member) return null;
  if (member.role === 'lead') {
    /* A selected XTY Party Cover wins over the member's personal avatar.
       Image, CORE7 and card-back covers are handled by the cover layer and
       must not be replaced by the profile avatar here. */
    if (party.coverType === 'card' || party.leadCardId) {
      const leadCard = cardById(party.leadCardId);
      if (leadCard) return leadCard;
    }
    if (['image', 'core7_card', 'card_back'].includes(party.coverType)) return null;
  }
  const resolved = resolveMemberAvatar(member.avatar);
  return resolved?.cardId ? cardById(resolved.cardId) : null;
}

function sync() {
  scheduled = false;
  if (syncing) return;
  const party = getParty(code);
  const seats = document.getElementById('seats');
  if (!party || !seats) return;

  const done = committedToday(party);
  const lead = party.members.find(m => m.role === 'lead') || null;
  const others = party.members.filter(m => m.role !== 'lead');
  const slots = [lead, others[0] || null, others[1] || null, others[2] || null, others[3] || null];

  syncing = true;
  try {
    slots.forEach((member, index) => {
      if (!member) return;
      const current = seats.children[index];
      if (!current) return;
      const card = memberCardFor(party, member);
      if (!card) return; // starter/profile portrait remains the standard seat
      const mark = done.has(member.userId) ? '✓' : '○';
      const role = member.role === 'lead' ? 'หัวตี้' : 'สมาชิก';
      const signature = [card.cardId, member.alias, role, mark, 'member'].join('|');
      if (current.dataset?.fullCardSeat === signature) return;
      current.replaceWith(fullCardSeat(card, { name: member.alias, role, mark }));
    });

    /* A Collection card chosen for PET/NPC also occupies the whole sixth
       card slot. A built-in starter PET remains a portrait tile. */
    const npc = cardById(party.npcCardId);
    const currentPet = seats.children[5];
    if (npc && currentPet) {
      const name = cardNameTh(npc);
      const signature = [npc.cardId, name, 'เพื่อนประจำตี้', '', 'pet'].join('|');
      if (currentPet.dataset?.fullCardSeat !== signature) {
        currentPet.replaceWith(fullCardSeat(npc, {
          name,
          role: 'เพื่อนประจำตี้',
          pet: true,
        }));
      }
      return;
    }

    const pet = party.petId ? PET_BY_ID[party.petId] : null;
    if (!pet || !currentPet) return;
    if (currentPet.dataset?.petSeatV2 === party.petId) return;
    if (!currentPet.querySelector('.companion-card') && !currentPet.classList.contains('pet-card')) return;

    const tile = document.createElement('div');
    tile.className = 'seat xty-card pet-card xty-pet-companion-seat';
    tile.dataset.petSeatV2 = party.petId;
    tile.innerHTML = `<span class="slot-label">🐾 PET</span>`
      + `<div class="av">${pet.art ? `<img src="${esc(pet.art)}" alt="" width="256" height="256" loading="eager" decoding="async">` : esc(pet.emoji || '🐾')}</div>`
      + `<div class="al">${esc(pet.nameTh)}</div>`
      + `<div class="rl">เพื่อนประจำตี้</div>`;
    currentPet.replaceWith(tile);
  } finally {
    syncing = false;
  }
}
