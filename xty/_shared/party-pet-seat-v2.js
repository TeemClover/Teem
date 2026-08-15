import { getParty } from './store.js';
import { PET_BY_ID } from './pets.js';

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

function sync() {
  scheduled = false;
  if (syncing) return;
  const party = getParty(code);
  const seats = document.getElementById('seats');
  if (!party || !seats || party.npcCardId || !party.petId) return;
  const pet = PET_BY_ID[party.petId];
  if (!pet) return;

  const current = seats.lastElementChild;
  if (!current || current.dataset?.petSeatV2 === party.petId) return;
  if (!current.querySelector('.companion-card') && !current.classList.contains('pet-card')) return;

  const tile = document.createElement('div');
  tile.className = 'seat xty-card pet-card xty-pet-companion-seat';
  tile.dataset.petSeatV2 = party.petId;
  tile.innerHTML = `<span class="slot-label">🐾 PET</span>`
    + `<div class="av">${pet.art ? `<img src="${esc(pet.art)}" alt="" width="256" height="256" loading="eager" decoding="async">` : esc(pet.emoji || '🐾')}</div>`
    + `<div class="al">${esc(pet.nameTh)}</div>`
    + `<div class="rl">เพื่อนประจำตี้</div>`;

  syncing = true;
  current.replaceWith(tile);
  syncing = false;
}
