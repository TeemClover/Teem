/* TeamBook /p board FINAL visual contract.

   Scope: inside an open Book only. Home / Public / Profile / cover visuals are
   owned elsewhere and must never be changed from here.

   Contract:
   - A Starter human is a quiet square PORTRAIT inside the 63:88 seat (68%).
     It is intentionally not full-bleed, so a real Collection card feels like
     a visible upgrade when the player earns/equips one.
   - A real Collection card may fill the human seat.
   - Companion always shows ANIMAL SPECIES at the top (e.g. ควาย) and the green
     semantic role เพื่อนร่วมทาง at the bottom. Personality/custom names never
     replace either label.
*/

import { getParty } from './store.js';
import { PET_BY_ID } from './pets.js';
import { cardById, cardNameTh } from './cards.js';

const code = new URLSearchParams(location.search).get('c');
let queued = false;

if (/^\d{5}$/.test(code || '')) install();

function installStyle() {
  document.getElementById('tb-party-board-portrait-v21')?.remove();
  const style = document.createElement('style');
  style.id = 'tb-party-board-portrait-v21';
  style.textContent = `
    /* ===== Human Starter portrait =====
       DOM truth wins: if the human seat has no .animal-card, it is Starter.
       Do not trust historical .is-card flags; other modules may leave them on
       wrappers even after the renderer has returned to Starter art. */
    html body #seats > .tb-person-seat:not(:has(.animal-card)) > .av,
    html body #seats > .tb-person-seat.tb-board-starter > .av,
    html body #seats > .xty-starter-member-seat > .av{
      position:absolute!important;
      left:50%!important;
      top:50%!important;
      width:68%!important;
      height:auto!important;
      max-width:68%!important;
      max-height:none!important;
      aspect-ratio:1/1!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;
      place-items:center!important;
      margin:0!important;
      padding:0!important;
      overflow:visible!important;
      border-radius:12px!important;
    }
    html body #seats > .tb-person-seat:not(:has(.animal-card)) > .av > img,
    html body #seats > .tb-person-seat.tb-board-starter > .av > img,
    html body #seats > .xty-starter-member-seat > .av > img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:100%!important;
      max-height:100%!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:12px!important;
      object-fit:contain!important;
      object-position:center!important;
      transform:none!important;
      clip-path:none!important;
    }

    /* Real Collection skin stays full-art. */
    html body #seats > .tb-person-seat.tb-board-full-card > .animal-card,
    html body #seats > .tb-person-seat.tb-board-full-card > .xty-full-card-seat,
    html body #seats > .tb-person-seat.tb-board-full-card .animal-card{
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
    }

    /* ===== Companion ===== */
    html body #seats > .tb-companion-seat.seat > .av,
    html body #seats > .xty-pet-companion-seat > .av{
      position:absolute!important;
      left:50%!important;
      top:50%!important;
      width:86%!important;
      height:72%!important;
      max-width:86%!important;
      max-height:72%!important;
      aspect-ratio:auto!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;
      place-items:center!important;
      margin:0!important;
      padding:0!important;
    }
    html body #seats > .tb-companion-seat.seat > .av > img,
    html body #seats > .xty-pet-companion-seat > .av > img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      object-fit:contain!important;
      object-position:center!important;
      border:0!important;
      border-radius:0!important;
      transform:none!important;
    }

    /* Hide every historical card/personality label on Companion. The two
       canonical overlays below are the only visible texts on that seat. */
    html body #seats > .tb-companion-seat > .tb-card-name,
    html body #seats > .tb-companion-seat > .seat-card-name,
    html body #seats > .tb-companion-seat > .tb-companion-label,
    html body #seats > .tb-companion-seat .card-copy,
    html body #seats > .tb-companion-seat .role-badge,
    html body #seats > .tb-companion-seat .rarity-badge,
    html body #seats > .tb-companion-seat .color-badge,
    html body #seats > .tb-companion-seat .xty-seat-name,
    html body #seats > .tb-companion-seat .xty-seat-state,
    html body #seats > .tb-companion-seat .xty-collection-seat__top,
    html body #seats > .tb-companion-seat .xty-collection-seat__bottom{
      display:none!important;
    }

    .tb-companion-species-v21{
      position:absolute!important;
      left:9px!important;
      right:9px!important;
      top:8px!important;
      z-index:80!important;
      display:block!important;
      min-width:0!important;
      padding:4px 7px!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
      color:var(--xty-ink)!important;
      font-size:clamp(10px,2.7vw,13px)!important;
      font-weight:900!important;
      line-height:1.15!important;
      text-align:center!important;
      border:1px solid rgba(255,255,255,.28)!important;
      border-radius:999px!important;
      background:rgba(255,254,248,.90)!important;
      box-shadow:0 1px 0 rgba(62,51,44,.08)!important;
      pointer-events:none!important;
      backdrop-filter:blur(4px)!important;
      -webkit-backdrop-filter:blur(4px)!important;
    }
    .tb-companion-role-v21{
      position:absolute!important;
      left:50%!important;
      bottom:9px!important;
      z-index:80!important;
      transform:translateX(-50%)!important;
      display:block!important;
      max-width:calc(100% - 16px)!important;
      padding:4px 8px!important;
      color:var(--xty-primary)!important;
      font:900 clamp(8px,2.2vw,10px)/1 var(--thai),var(--sans)!important;
      text-align:center!important;
      white-space:nowrap!important;
      border:1px solid rgba(41,136,87,.26)!important;
      border-radius:999px!important;
      background:rgba(255,254,248,.82)!important;
      pointer-events:none!important;
      backdrop-filter:blur(5px)!important;
      -webkit-backdrop-filter:blur(5px)!important;
    }

    @media(max-width:480px){
      .tb-companion-species-v21{left:6px!important;right:6px!important;top:6px!important;padding:3px 5px!important}
      .tb-companion-role-v21{bottom:7px!important;padding:3px 6px!important}
    }
  `;
  document.head.appendChild(style);
}

function companionSpeciesName(party) {
  const npc = party?.npcCardId ? cardById(party.npcCardId) : null;
  if (npc) return cardNameTh(npc) || npc.speciesNameTh || npc.name || 'สัตว์';
  const pet = party?.petId ? PET_BY_ID[party.petId] : null;
  return pet?.nameTh || 'สัตว์';
}

function ensureOverlay(node, className, text) {
  let el = node.querySelector(`:scope > .${className}`);
  if (!el) {
    el = document.createElement('span');
    el.className = className;
    node.appendChild(el);
  }
  if (el.textContent !== text) el.textContent = text;
}

function classifyHumanSeats(seats) {
  for (const node of seats.querySelectorAll(':scope > .tb-person-seat')) {
    const fullCard = !!node.querySelector('.animal-card:not(.card-back)');
    node.classList.toggle('tb-board-full-card', fullCard);
    node.classList.toggle('tb-board-starter', !fullCard);
    if (!fullCard) {
      /* Historical renderers sometimes leave is-card on the portrait wrapper.
         Once DOM says there is no actual card, remove that stale state. */
      node.querySelector(':scope > .av')?.classList.remove('is-card');
    }
  }
}

function companionCardData(party) {
  const npc = party?.npcCardId ? cardById(party.npcCardId) : null;
  if (npc) return npc;
  return null;
}

function findCompanionSeat(seats, party) {
  /* Prefer semantic classes from any current renderer. */
  const semantic = seats.querySelector(':scope > .tb-companion-seat, :scope > .xty-pet-companion-seat, :scope > .pet-card');
  if (semantic) return semantic;

  /* Capacity >5 may collapse open human places, so Companion is NOT a fixed
     child index anymore. Find the NPC card by its actual species/color and use
     the last matching seat (Companion is appended after human seats). */
  const npc = companionCardData(party);
  if (npc) {
    const matches = Array.from(seats.children).filter(node =>
      node.querySelector(`.animal-card[data-species="${CSS.escape(npc.species)}"][data-color="${CSS.escape(npc.color)}"]`)
    );
    if (matches.length) return matches[matches.length - 1];
  }

  /* Built-in Starter pet renderer carries its own class on the child. */
  return Array.from(seats.children).find(node => node.querySelector('.xty-pet-companion-seat')) || null;
}

function sync() {
  queued = false;
  const seats = document.getElementById('seats');
  const party = getParty(code);
  if (!seats || !party) return;

  classifyHumanSeats(seats);

  const companion = findCompanionSeat(seats, party);
  if (!companion) return;
  companion.classList.add('tb-companion-seat');
  companion.dataset.tbCompanionSpecies = companionSpeciesName(party);
  ensureOverlay(companion, 'tb-companion-species-v21', companion.dataset.tbCompanionSpecies);
  ensureOverlay(companion, 'tb-companion-role-v21', 'เพื่อนร่วมทาง');
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(sync);
}

function install() {
  installStyle();
  const seats = document.getElementById('seats');
  if (!seats) {
    addEventListener('DOMContentLoaded', install, { once:true });
    return;
  }
  new MutationObserver(schedule).observe(seats, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','data-species','data-color'],
  });
  schedule();
  addEventListener('pageshow', schedule);
  addEventListener('focus', schedule);
  addEventListener('teambook:synced', schedule);
}
