/* TeamBook /p board visual contract.

   This module is deliberately scoped to the inside-book board only.
   Home, Public, Profile and cover geometry are owned elsewhere.

   Contract:
   - Starter/member portraits stay the original quiet square portrait inside
     the 63:88 seat. They do NOT become full-bleed art.
   - A real Collection card may still fill its seat, so finding/equipping a
     card remains a visible upgrade from Starter.
   - Companion always shows its species name at the top and the semantic
     status "เพื่อนร่วมทาง" at the bottom. No personality/custom nickname.
*/

import { getParty } from './store.js';
import { PET_BY_ID } from './pets.js';
import { cardById, cardNameTh } from './cards.js';

const code = new URLSearchParams(location.search).get('c');
let queued = false;

if (/^\d{5}$/.test(code || '')) install();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[ch]));
}

function installStyle() {
  if (document.getElementById('tb-party-board-portrait-v21')) return;
  const style = document.createElement('style');
  style.id = 'tb-party-board-portrait-v21';
  style.textContent = `
    /* Restore the approved Starter/member treatment inside /p only.
       card-geometry-v16 is intentionally stronger elsewhere, so this rule is
       loaded after all /p modules and wins only on the board. */
    html body #seats > .tb-person-seat.seat > .av:not(.is-card),
    html body #seats > .xty-starter-member-seat > .av:not(.is-card){
      position:absolute!important;
      left:50%!important;
      top:50%!important;
      width:68%!important;
      height:auto!important;
      aspect-ratio:1/1!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;
      place-items:center!important;
      overflow:visible!important;
      border-radius:12px!important;
    }
    html body #seats > .tb-person-seat.seat > .av:not(.is-card) > img,
    html body #seats > .xty-starter-member-seat > .av:not(.is-card) > img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:100%!important;
      max-height:100%!important;
      margin:0!important;
      padding:0!important;
      object-fit:contain!important;
      object-position:center!important;
      border-radius:12px!important;
      transform:none!important;
    }

    /* Companion is not a Signature card. Keep the original full-body portrait
       with calm space around it. */
    html body #seats > .tb-companion-seat.seat > .av,
    html body #seats > .xty-pet-companion-seat > .av{
      position:absolute!important;
      left:50%!important;
      top:50%!important;
      width:86%!important;
      height:72%!important;
      aspect-ratio:auto!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;
      place-items:center!important;
    }
    html body #seats > .tb-companion-seat.seat > .av > img,
    html body #seats > .xty-pet-companion-seat > .av > img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      object-fit:contain!important;
      object-position:center!important;
      border-radius:0!important;
      transform:none!important;
    }

    /* party-teambook-cards may recreate its historical personality-name
       overlay. Hide that on Companion and own the two labels below so renderer
       order cannot make them disappear or rename themselves. */
    html body #seats > .tb-companion-seat > .tb-card-name,
    html body #seats > .tb-companion-seat > .seat-card-name,
    html body #seats > .tb-companion-seat > .tb-companion-label{
      display:none!important;
    }
    .tb-companion-species-v21{
      position:absolute;left:9px;right:9px;top:8px;z-index:50;
      display:block;min-width:0;padding:4px 7px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--xty-ink);font-size:clamp(10px,2.7vw,13px);font-weight:900;line-height:1.15;
      text-align:center;border-radius:999px;background:rgba(255,254,248,.90);
      border:1px solid rgba(255,255,255,.28);
      box-shadow:0 1px 0 rgba(62,51,44,.08);
      pointer-events:none;
      backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
    }
    .tb-companion-role-v21{
      position:absolute;left:50%;bottom:9px;z-index:50;transform:translateX(-50%);
      max-width:calc(100% - 16px);padding:4px 8px;
      color:var(--xty-primary);font:900 clamp(8px,2.2vw,10px)/1 var(--thai),var(--sans);
      text-align:center;white-space:nowrap;border-radius:999px;
      background:rgba(255,254,248,.72);border:1px solid rgba(255,255,255,.44);
      pointer-events:none;
      backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);
    }
    @media(max-width:480px){
      .tb-companion-species-v21{left:6px;right:6px;top:6px;padding:3px 5px}
      .tb-companion-role-v21{bottom:7px;padding:3px 6px}
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

function sync() {
  queued = false;
  const seats = document.getElementById('seats');
  const party = getParty(code);
  if (!seats || !party) return;

  const companion = seats.children[5];
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
  new MutationObserver(schedule).observe(seats, { childList:true, subtree:true });
  schedule();
  addEventListener('pageshow', schedule);
  addEventListener('teambook:synced', schedule);
}
