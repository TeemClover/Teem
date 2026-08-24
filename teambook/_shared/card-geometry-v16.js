/* TeamBook 1.7 — canonical 63:88 card geometry.
   Finished collectible art is never cropped, rounded, padded or letterboxed.
   Frames live outside the 63:88 content box so the picture always stays whole. */

import { cardById } from './cards.js';
import { getProfile } from './store.js';

const A = 'var(--xty-card-aspect,63/88)';

function installStyle() {
  document.getElementById('tb-card-geometry-v16')?.remove();
  if (document.getElementById('tb-card-geometry-v17')) return;
  const style = document.createElement('style');
  style.id = 'tb-card-geometry-v17';
  style.textContent = `
    /* A collectible card is already a finished 63:88 picture. */
    html body .animal-card:not(.card-back){
      --tb-frame:var(--xty-green);
      box-sizing:border-box!important;width:100%!important;height:auto!important;aspect-ratio:${A}!important;
      margin:0!important;padding:0!important;border:0!important;border-radius:12px!important;
      background:transparent!important;overflow:visible!important;
      box-shadow:0 0 0 3px var(--tb-frame),3px 4px 0 rgba(62,51,44,.10)!important;
    }
    html body .animal-card[data-color="red"]{--tb-frame:var(--xty-red)!important}
    html body .animal-card[data-color="green"]{--tb-frame:var(--xty-green)!important}
    html body .animal-card[data-color="blue"]{--tb-frame:var(--xty-blue)!important}
    html body .animal-card[data-color="silver"]{--tb-frame:var(--xty-silver)!important}
    html body .animal-card:not(.card-back) .card-art{
      display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;
      object-fit:contain!important;object-position:center!important;transform:none!important;clip-path:none!important;
    }

    /* Parent slots size the card; they never clip it again. */
    html body .xty-home-cover:has(>.animal-card:not(.card-back)),
    html body .xty-party-row-cover:has(.animal-card:not(.card-back)),
    html body .preview-cover:has(>.animal-card:not(.card-back)),
    html body #cover:has(>.animal-card:not(.card-back)),
    html body .tb-char-card,html body .xcp-opt{overflow:visible!important}
    html body .xty-home-cover:has(>.animal-card:not(.card-back)){
      border:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;
    }

    /* Every place that owns a card slot derives height from 63:88. */
    html body #home #mainParty .xty-home-cover,
    html body #home .party-group .xty-party-row-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover,
    html body #home .tb15-public-party>:first-child,
    html body .public-party>:first-child,
    html body .preview-cover,html body #cover,
    html body .xty-cover-current-art,html body .xty-cover-thumb,
    html body #seats>.tb-person-seat,html body #seats>.tb-companion-seat,
    html body #members .tb-public-member-visual,
    html body .tb-member-status .tb-book-member-visual{
      box-sizing:border-box!important;aspect-ratio:${A}!important;height:auto!important;
    }

    /* Cover/list contexts never paint labels over collectible art. */
    html body #home #mainParty .animal-card .card-copy,
    html body #home #mainParty .animal-card .role-badge,
    html body #home #mainParty .animal-card .rarity-badge,
    html body #home .party-group .animal-card .card-copy,
    html body #home .party-group .animal-card .role-badge,
    html body #home .party-group .animal-card .rarity-badge,
    html body .public-party>.animal-card .card-copy,
    html body .public-party>.animal-card .role-badge,
    html body .public-party>.animal-card .rarity-badge,
    html body #cover>.animal-card .card-copy,
    html body #cover>.animal-card .role-badge,
    html body #cover>.animal-card .rarity-badge{display:none!important}

    /* Shared Collection picker + Book picker: full card, selection outside. */
    html body .xcp-opt>.animal-card:not(.card-back),
    html body .tb-char-card>.animal-card:not(.card-back){
      width:100%!important;height:auto!important;aspect-ratio:${A}!important;overflow:visible!important;
    }
    html body .xcp-opt>.animal-card:not(.card-back) .card-art,
    html body .tb-char-card>.animal-card:not(.card-back) .card-art{
      width:100%!important;height:100%!important;object-fit:contain!important;border-radius:0!important;
    }

    /* New-book cover shelf also keeps raw card pixels intact. */
    html body .xty-cover-current-art[data-category="xty"],
    html body .xty-cover-option[data-category="xty"] .xty-cover-thumb{
      aspect-ratio:${A}!important;overflow:visible!important;background:transparent!important;
    }
    html body .xty-cover-current-art[data-category="xty"]>.xty-cover-raw-card,
    html body .xty-cover-option[data-category="xty"] .xty-cover-thumb>.xty-cover-raw-card{
      display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border:0!important;border-radius:0!important;object-fit:contain!important;object-position:center!important;
      clip-path:none!important;
    }

    /* Starter cover: square source fills the vertical Starter shell. */
    html body #home .xty-home-cover.avatar-cover,
    html body .public-party>.avatar-cover,
    html body .preview-cover>.avatar-cover,
    html body #cover>.avatar-cover{box-sizing:border-box!important;aspect-ratio:${A}!important;overflow:hidden!important}
    html body #home .xty-home-cover.avatar-cover>img,
    html body .public-party>.avatar-cover>img,
    html body .preview-cover>.avatar-cover>img,
    html body #cover>.avatar-cover>img{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border-radius:0!important;object-fit:cover!important;object-position:center!important;transform:none!important;
    }

    /* Board seats: Collection card fills all 63:88; no inner rounded mask. */
    html body #seats>.tb-person-seat.seat>.av,
    html body #seats>.tb-person-seat.seat>.av.is-card{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;transform:none!important;aspect-ratio:${A}!important;overflow:visible!important;border-radius:0!important;
    }
    html body #seats>.tb-person-seat.seat>.av>img{
      display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border-radius:0!important;object-position:center!important;transform:none!important;
    }
    html body #seats>.tb-person-seat.seat>.av.is-card>img{object-fit:contain!important}
    html body #seats>.tb-person-seat.seat>.av:not(.is-card)>img{object-fit:cover!important}

    html body #members .tb-public-member-visual>img,
    html body .tb-member-status .tb-book-member-visual>img{
      display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border-radius:0!important;object-fit:cover!important;object-position:center!important;
    }
    html body #members .tb-public-member-visual.is-card>img,
    html body .tb-member-status .tb-book-member-visual.is-card>img{object-fit:contain!important}

    /* Profile: no inset gap. A Collection card changes the profile slot to 63:88
       and the visible frame colour comes from card.color, never avatarFrame. */
    html body .profile-avatar{--tb-profile-frame:var(--xty-green);box-sizing:border-box!important;padding:0!important;overflow:hidden!important}
    html body .profile-avatar[data-color="red"]{--tb-profile-frame:var(--xty-red)!important}
    html body .profile-avatar[data-color="green"]{--tb-profile-frame:var(--xty-green)!important}
    html body .profile-avatar[data-color="blue"]{--tb-profile-frame:var(--xty-blue)!important}
    html body .profile-avatar[data-color="silver"]{--tb-profile-frame:var(--xty-silver)!important}
    html body .profile-avatar:not(.is-card)>img{
      width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;
      border-radius:0!important;object-fit:cover!important;
    }
    html body .profile-avatar.is-card{
      width:76px!important;height:auto!important;aspect-ratio:${A}!important;border:0!important;border-radius:12px!important;
      background:transparent!important;overflow:visible!important;
      box-shadow:0 0 0 3px var(--tb-profile-frame),3px 4px 0 rgba(62,51,44,.10)!important;
    }
    html body .profile-avatar.is-card>img{
      display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border:0!important;border-radius:0!important;object-fit:contain!important;object-position:center!important;clip-path:none!important;
    }

    @media(max-width:380px){
      html body #home .party-group .xty-party-row-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover>.animal-card,
      html body #home .party-group .xty-party-row-cover .xty-home-real-back,
      html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover{
        width:54px!important;min-width:54px!important;height:auto!important;aspect-ratio:${A}!important;
      }
    }
  `;
  document.head.appendChild(style);
}

let queued = false;
function syncProfileCardFrames() {
  queued = false;
  if (!['/','/profile','/profile/'].includes(location.pathname)) return;
  const profile = getProfile();
  const card = profile?.equippedCardId ? cardById(profile.equippedCardId) : null;
  const nodes = [document.getElementById('homeAvatar'), document.getElementById('av')].filter(Boolean);
  for (const node of nodes) {
    if (!card) {
      if (node.classList.contains('is-card')) node.classList.remove('is-card');
      const color = profile?.avatarFrame || 'green';
      if (node.dataset.color !== color) node.dataset.color = color;
      continue;
    }
    if (!node.classList.contains('is-card')) node.classList.add('is-card');
    const color = ['red','green','blue','silver'].includes(card.color) ? card.color : 'green';
    if (node.dataset.color !== color) node.dataset.color = color;
    const src = card.imageFull || card.art || card.image || '';
    let img = node.querySelector(':scope > img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      node.replaceChildren(img);
    }
    const absolute = src ? new URL(src, location.origin).href : '';
    if (absolute && img.src !== absolute) img.src = src;
  }
}

function queueProfileSync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(syncProfileCardFrames);
}

function installProfileSync() {
  if (!['/','/profile','/profile/'].includes(location.pathname)) return;
  queueProfileSync();
  for (const id of ['homeAvatar','av']) {
    const node = document.getElementById(id);
    if (node) new MutationObserver(queueProfileSync).observe(node, { childList:true });
  }
  addEventListener('pageshow', queueProfileSync);
  addEventListener('focus', queueProfileSync);
  addEventListener('teambook:synced', queueProfileSync);
}

installStyle();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installProfileSync, { once:true });
else installProfileSync();
