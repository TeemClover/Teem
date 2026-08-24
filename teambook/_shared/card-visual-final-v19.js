/* TeamBook 1.9 — FINAL card visual owner.

   This module exists to end the stack of historical card CSS patches.

   Contract:
   - collectible Book/card slots are 63:88
   - finished art touches the frame: no cream mat, padding or contain gap
   - the CSS shell clips the art to its rounded corners
   - frame colour comes from card.color
   - Profile stays the original square 1:1 portrait; equipped card art crops
     into that square with no inner gap
*/

import { cardById } from './cards.js';
import { getProfile } from './store.js';

const STALE_STYLE_IDS = [
  'xty-home-card-ratio-fix',
  'tb-book-cover-card-style',
  'xty-clean-card-face-style',
  'tb-card-geometry-v16',
  'tb-card-geometry-v17',
];

function removeStaleStyles() {
  for (const id of STALE_STYLE_IDS) document.getElementById(id)?.remove();
}

function installStyle() {
  removeStaleStyles();
  if (document.getElementById('tb-card-visual-v19')) return;

  const style = document.createElement('style');
  style.id = 'tb-card-visual-v19';
  style.textContent = `
    /* ===== Collectible: the 63:88 shell itself is the mask/frame ===== */
    html body .animal-card:not(.card-back){
      --tb-card-frame:var(--xty-green);
      box-sizing:border-box!important;
      position:relative!important;
      display:block!important;
      width:100%!important;
      height:auto!important;
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:14px!important;
      background:transparent!important;
      overflow:hidden!important;
      /* inset frame: image continues underneath it, therefore no blank mat */
      box-shadow:inset 0 0 0 3px var(--tb-card-frame)!important;
    }
    html body .animal-card[data-color="red"]{--tb-card-frame:var(--xty-red)!important}
    html body .animal-card[data-color="green"]{--tb-card-frame:var(--xty-green)!important}
    html body .animal-card[data-color="blue"]{--tb-card-frame:var(--xty-blue)!important}
    html body .animal-card[data-color="silver"]{--tb-card-frame:var(--xty-silver)!important}

    html body .animal-card:not(.card-back)>.card-art,
    html body .animal-card:not(.card-back) .card-art{
      box-sizing:border-box!important;
      position:absolute!important;
      inset:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      min-width:100%!important;
      min-height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      object-fit:cover!important;
      object-position:center!important;
      transform:none!important;
      clip-path:none!important;
    }

    /* Historical labels must never sit on a finished card face. */
    html body .animal-card:not(.card-back) .card-copy,
    html body .animal-card:not(.card-back) .role-badge,
    html body .animal-card:not(.card-back) .rarity-badge,
    html body .animal-card:not(.card-back) .color-badge,
    html body .animal-card:not(.card-back) .card-accessory{display:none!important}

    /* ===== Book covers: wrapper sizes only, no second mat/frame ===== */
    html body #home #mainParty .xty-home-cover:has(>.animal-card:not(.card-back)),
    html body #home .party-group .xty-party-row-cover:has(.animal-card:not(.card-back)),
    html body #home .party-group .xty-home-cover:has(>.animal-card:not(.card-back)),
    html body .preview-cover:has(>.animal-card:not(.card-back)),
    html body #cover:has(>.animal-card:not(.card-back)){
      box-sizing:border-box!important;
      padding:0!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      overflow:visible!important;
    }

    html body #home #mainParty .xty-home-cover,
    html body #home .party-group .xty-party-row-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover,
    html body #home .tb15-public-party>.animal-card,
    html body .public-party>.animal-card,
    html body .preview-cover>.animal-card,
    html body #cover>.animal-card,
    html body .xcp-opt>.animal-card,
    html body .tb-char-card>.animal-card{
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
    }

    html body #home #mainParty .xty-home-cover>.animal-card:not(.card-back),
    html body #home .party-group .xty-party-row-cover .xty-home-cover>.animal-card:not(.card-back),
    html body #home .tb15-public-party>.animal-card:not(.card-back),
    html body .public-party>.animal-card:not(.card-back),
    html body .preview-cover>.animal-card:not(.card-back),
    html body #cover>.animal-card:not(.card-back),
    html body .xcp-opt>.animal-card:not(.card-back),
    html body .tb-char-card>.animal-card:not(.card-back){
      width:100%!important;
      height:100%!important;
      min-width:0!important;
      max-width:none!important;
      margin:0!important;
    }

    /* Compact Home cards use a 2px inset frame but the same edge-to-edge art. */
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back){
      border-radius:9px!important;
      box-shadow:inset 0 0 0 2px var(--tb-card-frame)!important;
    }

    /* New-book raw card preview follows exactly the same fill contract. */
    html body .xty-cover-current-art[data-category="xty"],
    html body .xty-cover-option[data-category="xty"] .xty-cover-thumb{
      box-sizing:border-box!important;
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
      padding:0!important;
      border-radius:14px!important;
      background:transparent!important;
      overflow:hidden!important;
    }
    html body .xty-cover-current-art[data-category="xty"]>.xty-cover-raw-card,
    html body .xty-cover-option[data-category="xty"] .xty-cover-thumb>.xty-cover-raw-card{
      position:absolute!important;
      inset:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      object-fit:cover!important;
      object-position:center!important;
      clip-path:none!important;
    }

    /* Board/member card portraits fill their existing rounded seat. */
    html body #seats>.tb-person-seat.seat>.av.is-card,
    html body #members .tb-public-member-visual.is-card,
    html body .tb-member-status .tb-book-member-visual.is-card{
      box-sizing:border-box!important;
      padding:0!important;
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
      overflow:hidden!important;
    }
    html body #seats>.tb-person-seat.seat>.av.is-card>img,
    html body #members .tb-public-member-visual.is-card>img,
    html body .tb-member-status .tb-book-member-visual.is-card>img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      border-radius:0!important;
      object-fit:cover!important;
      object-position:center!important;
    }

    /* ===== Profile: ALWAYS the original square 1:1 portrait ===== */
    html body #home #homeAvatar.profile-avatar,
    html body #view #av.profile-avatar,
    html body #home #homeAvatar.profile-avatar.is-card,
    html body #view #av.profile-avatar.is-card{
      --tb-profile-frame:var(--xty-green);
      box-sizing:border-box!important;
      position:relative!important;
      display:block!important;
      flex:0 0 76px!important;
      width:76px!important;
      min-width:76px!important;
      max-width:76px!important;
      height:76px!important;
      min-height:76px!important;
      max-height:76px!important;
      aspect-ratio:1/1!important;
      margin:0!important;
      padding:0!important;
      border:3px solid var(--tb-profile-frame)!important;
      border-radius:18px!important;
      background:transparent!important;
      box-shadow:none!important;
      overflow:hidden!important;
    }
    html body #home #homeAvatar.profile-avatar[data-color="red"],html body #view #av.profile-avatar[data-color="red"]{--tb-profile-frame:var(--xty-red)!important}
    html body #home #homeAvatar.profile-avatar[data-color="green"],html body #view #av.profile-avatar[data-color="green"]{--tb-profile-frame:var(--xty-green)!important}
    html body #home #homeAvatar.profile-avatar[data-color="blue"],html body #view #av.profile-avatar[data-color="blue"]{--tb-profile-frame:var(--xty-blue)!important}
    html body #home #homeAvatar.profile-avatar[data-color="silver"],html body #view #av.profile-avatar[data-color="silver"]{--tb-profile-frame:var(--xty-silver)!important}

    html body #home #homeAvatar.profile-avatar>img,
    html body #view #av.profile-avatar>img,
    html body #home #homeAvatar.profile-avatar.is-card>img,
    html body #view #av.profile-avatar.is-card>img{
      box-sizing:border-box!important;
      position:absolute!important;
      inset:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      min-width:100%!important;
      min-height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      object-fit:cover!important;
      object-position:center!important;
      transform:none!important;
      clip-path:none!important;
    }
  `;
  document.head.appendChild(style);
}

/* If an old cached module injects one of the retired styles after us, delete it
   immediately. This is intentionally a head-only observer: it never touches
   application DOM or causes a second Book render. */
let cleanupQueued = false;
function scheduleCleanup() {
  if (cleanupQueued) return;
  cleanupQueued = true;
  queueMicrotask(() => {
    cleanupQueued = false;
    removeStaleStyles();
    if (!document.getElementById('tb-card-visual-v19')) installStyle();
  });
}

function watchHead() {
  new MutationObserver(scheduleCleanup).observe(document.head, { childList:true });
}

let profileQueued = false;
function syncProfilePortraits() {
  profileQueued = false;
  if (!['/','/profile','/profile/'].includes(location.pathname)) return;
  const profile = getProfile();
  const card = profile?.equippedCardId ? cardById(profile.equippedCardId) : null;
  const nodes = [document.getElementById('homeAvatar'), document.getElementById('av')].filter(Boolean);

  for (const node of nodes) {
    if (!card) {
      node.classList.remove('is-card');
      node.dataset.color = profile?.avatarFrame || 'green';
      continue;
    }

    node.classList.add('is-card');
    node.dataset.color = ['red','green','blue','silver'].includes(card.color) ? card.color : 'green';
    const src = card.imageFull || card.art || card.image || '';
    let img = node.querySelector(':scope > img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      node.replaceChildren(img);
    }
    if (src) {
      const absolute = new URL(src, location.origin).href;
      if (img.src !== absolute) img.src = src;
    }
  }
}

function queueProfileSync() {
  if (profileQueued) return;
  profileQueued = true;
  requestAnimationFrame(syncProfilePortraits);
}

function installProfileSync() {
  if (!['/','/profile','/profile/'].includes(location.pathname)) return;
  for (const id of ['homeAvatar','av']) {
    const node = document.getElementById(id);
    if (node) new MutationObserver(queueProfileSync).observe(node, { childList:true, subtree:false });
  }
  addEventListener('pageshow', queueProfileSync);
  addEventListener('focus', queueProfileSync);
  addEventListener('teambook:synced', queueProfileSync);
  queueProfileSync();
}

installStyle();
watchHead();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installProfileSync, { once:true });
else installProfileSync();
