/* TeamBook 1.4 — PURE card renderer.

   IMPORTANT: this utility must never boot route features. Before V1.4 it also
   imported Home/Book/New compatibility modules as a side effect, so simply
   asking for cardMarkup() could start another render stack. Route ownership now
   lives only in /_shared/language.js.
*/

import {
  cardById, cardDescriptorTh,
} from './cards.js';

if (typeof document !== 'undefined' && !document.getElementById('xty-canonical-back-style')) {
  const style = document.createElement('style');
  style.id = 'xty-canonical-back-style';
  style.textContent = `
    .animal-card.card-back{
      aspect-ratio:var(--xty-card-aspect)!important;
      background:#13291d url('/assets/card-back.webp') center/cover no-repeat!important;
      border:0!important;
      box-shadow:0 8px 22px rgba(62,51,44,.16);
      overflow:hidden;
    }
    .animal-card.card-back>.back-mark,.animal-card.card-back>small{display:none!important}
  `;
  document.head.appendChild(style);
}

if (typeof document !== 'undefined' && !document.getElementById('xty-clean-card-face-style')) {
  const style = document.createElement('style');
  style.id = 'xty-clean-card-face-style';
  style.textContent = `
    .animal-card .role-badge,.animal-card .color-badge,.animal-card .card-accessory,.animal-card .card-copy small{display:none!important}
    .animal-card .card-copy{position:absolute!important;left:7px!important;right:7px!important;bottom:7px!important;z-index:5!important;display:block!important;margin:0!important;padding:4px 6px!important;text-align:center!important;border:0!important;border-radius:8px!important;background:rgba(255,254,248,.91)!important;box-shadow:none!important}
    .animal-card .card-copy b{display:block!important;overflow:hidden!important;color:var(--xty-ink)!important;font-size:clamp(10px,3vw,14px)!important;line-height:1.25!important;font-weight:800!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    .animal-card .rarity-badge{top:auto!important;right:50%!important;bottom:8px!important;left:auto!important;transform:translateX(50%)!important;z-index:6!important;min-width:0!important;padding:4px 8px!important;font-size:7px!important;line-height:1!important;letter-spacing:.11em!important;text-align:center!important;white-space:nowrap!important}
    .animal-card .card-art{margin:0!important;width:100%!important;height:100%!important;object-fit:cover!important}
  `;
  document.head.appendChild(style);
}

if (typeof document !== 'undefined' && !document.getElementById('xty-party-cover-size-style')) {
  const style = document.createElement('style');
  style.id = 'xty-party-cover-size-style';
  style.textContent = `
    :root{--xty-party-cover-size:132px;--xty-party-cover-aspect:var(--xty-card-aspect)}
    .public-party{grid-template-columns:var(--xty-party-cover-size) minmax(0,1fr)!important;gap:14px!important;align-items:center!important}
    .public-party>:first-child{width:var(--xty-party-cover-size)!important;max-width:none!important;min-width:0!important;height:auto!important;aspect-ratio:var(--xty-card-aspect)!important;overflow:hidden!important;border-radius:14px!important}
    .public-party>:first-child>svg,.public-party>:first-child>img{display:block!important;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important}
    .preview-hero{grid-template-columns:var(--xty-party-cover-size) minmax(0,1fr)!important;gap:16px!important;align-items:center!important}
    .preview-cover{width:var(--xty-party-cover-size)!important;max-width:none!important;min-width:0!important;height:auto!important;aspect-ratio:var(--xty-card-aspect)!important;overflow:hidden!important;border-radius:14px!important}
    .preview-cover>*{width:100%!important;height:100%!important;max-width:none!important;aspect-ratio:var(--xty-card-aspect)!important}.preview-cover svg,.preview-cover img{display:block!important;object-fit:cover!important}
    .xty-home-cover.avatar-cover,.public-party>.avatar-cover,.preview-cover>.avatar-cover{--cover-accent:var(--xty-green);position:relative!important;display:block!important;padding:0!important;aspect-ratio:var(--xty-card-aspect)!important;border:3px solid var(--cover-accent)!important;border-radius:16px!important;background:#FFF4C8!important;box-shadow:3px 4px 0 rgba(62,51,44,.12)!important;overflow:hidden!important}
    .xty-home-cover.avatar-cover[data-color="red"],.public-party>.avatar-cover[data-color="red"],.preview-cover>.avatar-cover[data-color="red"]{--cover-accent:var(--xty-red)}
    .xty-home-cover.avatar-cover[data-color="blue"],.public-party>.avatar-cover[data-color="blue"],.preview-cover>.avatar-cover[data-color="blue"]{--cover-accent:var(--xty-blue)}
    .xty-home-cover.avatar-cover[data-color="silver"],.public-party>.avatar-cover[data-color="silver"],.preview-cover>.avatar-cover[data-color="silver"]{--cover-accent:var(--xty-silver)}
    .xty-home-cover.avatar-cover>img,.public-party>.avatar-cover>img,.preview-cover>.avatar-cover>img{display:block!important;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;border-radius:9px!important;background:#FFFEF8!important}
    .xty-home-cover.avatar-cover>b,.public-party>.avatar-cover>b,.preview-cover>.avatar-cover>b{position:absolute!important;left:7px!important;right:7px!important;bottom:21px!important;display:block!important;margin:0!important;padding:0!important;color:var(--xty-ink)!important;font-size:13px!important;font-weight:800!important;line-height:1.15!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;background:transparent!important}
    .xty-home-cover.avatar-cover::after,.public-party>.avatar-cover::after,.preview-cover>.avatar-cover::after{content:'STARTER';position:absolute;left:50%;bottom:7px;transform:translateX(-50%);padding:3px 7px;border-radius:999px;background:rgba(255,254,248,.92);color:var(--xty-muted);font:800 7px/1 var(--sans);letter-spacing:.12em;white-space:nowrap}
    .xty-home-cover.avatar-cover small,.public-party>.avatar-cover small,.preview-cover>.avatar-cover small{display:none!important}
    @media(max-width:480px){:root{--xty-party-cover-size:124px}}@media(max-width:340px){:root{--xty-party-cover-size:110px}}
  `;
  document.head.appendChild(style);
}

/* When a collectible TeamBook card is used as a Book cover, the card belongs
   inside the same coloured frame language as Starter. The full finished card
   image stays visible; Book covers do not add a STARTER/name/rarity tag. */
if (typeof document !== 'undefined' && !document.getElementById('tb-book-cover-card-style')) {
  const style = document.createElement('style');
  style.id = 'tb-book-cover-card-style';
  style.textContent = `
    .public-party > .animal-card:not(.card-back),
    .preview-cover > .animal-card:not(.card-back),
    #cover > .animal-card:not(.card-back),
    .tb15-public-party > .animal-card:not(.card-back) {
      --tb-cover-accent:var(--xty-green);
      position:relative!important;
      box-sizing:border-box!important;
      padding:0!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      border:3px solid var(--tb-cover-accent)!important;
      border-radius:16px!important;
      background:#FFF7D8!important;
      box-shadow:3px 4px 0 rgba(62,51,44,.10)!important;
      overflow:hidden!important;
    }
    .public-party > .animal-card[data-color="red"],
    .preview-cover > .animal-card[data-color="red"],
    #cover > .animal-card[data-color="red"],
    .tb15-public-party > .animal-card[data-color="red"]{--tb-cover-accent:var(--xty-red)}
    .public-party > .animal-card[data-color="blue"],
    .preview-cover > .animal-card[data-color="blue"],
    #cover > .animal-card[data-color="blue"],
    .tb15-public-party > .animal-card[data-color="blue"]{--tb-cover-accent:var(--xty-blue)}
    .public-party > .animal-card[data-color="silver"],
    .preview-cover > .animal-card[data-color="silver"],
    #cover > .animal-card[data-color="silver"],
    .tb15-public-party > .animal-card[data-color="silver"]{--tb-cover-accent:var(--xty-silver)}

    .public-party > .animal-card:not(.card-back) .card-art,
    .preview-cover > .animal-card:not(.card-back) .card-art,
    #cover > .animal-card:not(.card-back) .card-art,
    .tb15-public-party > .animal-card:not(.card-back) .card-art {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      margin:0!important;
      object-fit:contain!important;
      border-radius:11px!important;
      background:#FFF7D8!important;
      transform:none!important;
    }

    .public-party > .animal-card:not(.card-back) .card-copy,
    .public-party > .animal-card:not(.card-back) .role-badge,
    .public-party > .animal-card:not(.card-back) .rarity-badge,
    .preview-cover > .animal-card:not(.card-back) .card-copy,
    .preview-cover > .animal-card:not(.card-back) .role-badge,
    .preview-cover > .animal-card:not(.card-back) .rarity-badge,
    #cover > .animal-card:not(.card-back) .card-copy,
    #cover > .animal-card:not(.card-back) .role-badge,
    #cover > .animal-card:not(.card-back) .rarity-badge,
    .tb15-public-party > .animal-card:not(.card-back) .card-copy,
    .tb15-public-party > .animal-card:not(.card-back) .role-badge,
    .tb15-public-party > .animal-card:not(.card-back) .rarity-badge {
      display:none!important;
    }
  `;
  document.head.appendChild(style);
}

export function cardMarkup(cardOrId, { role = '', foil = false, eager = false } = {}) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card) return '';
  const classes = ['animal-card'];
  if (role === 'lead') classes.push('lead-card');
  if (role === 'npc' || role === 'pet') classes.push('companion-card');
  if (foil) classes.push('foil-once');
  classes.push(`rarity-${card.rarity || 'common'}`);
  return `<div class="${classes.join(' ')}" data-color="${card.color}" data-species="${card.species}" aria-label="${cardDescriptorTh(card)}">`
    + `<img class="card-art" src="${card.imageFull || card.art}" alt="" width="630" height="880" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    + '</div>';
}

export function cardStatusLabel(status) {
  return ({ AVAILABLE: 'พร้อมใช้งาน', AVATAR_IN_USE: 'การ์ดประจำตัว', IN_PARTY: 'ใช้อยู่เป็นปกสมุด', NPC_IN_PARTY: 'ใช้อยู่เป็นเพื่อนร่วมทาง' })[status] || 'เก็บในคอลเลกชัน';
}
