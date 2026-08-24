/* TeamBook — pure collectible-card renderer.

   Geometry belongs to the canonical card visual owner. This file must not
   create a second frame, crop mask, rounded image, or object-fit rule. It only
   turns card data into semantic markup and keeps the status-copy contract used
   by build-time runtime-wiring checks.
*/

import { cardById, cardDescriptorTh } from './cards.js';

/* Card back is a texture rather than a finished collectible face, so it keeps
   its own dedicated renderer. */
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

/* Legacy decorative copy is not part of the finished image. Keep old markup
   harmless if an older caller still appends it, but do not touch geometry. */
if (typeof document !== 'undefined' && !document.getElementById('xty-clean-card-copy-style')) {
  const style = document.createElement('style');
  style.id = 'xty-clean-card-copy-style';
  style.textContent = `
    .animal-card .role-badge,
    .animal-card .color-badge,
    .animal-card .card-accessory,
    .animal-card .card-copy,
    .animal-card .rarity-badge{display:none!important}
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
  return ({
    AVAILABLE: 'พร้อมใช้งาน',
    AVATAR_IN_USE: 'การ์ดประจำตัว',
    IN_PARTY: 'ใช้อยู่เป็นปกสมุด',
    NPC_IN_PARTY: 'ใช้อยู่เป็นเพื่อนร่วมทาง',
  })[status] || 'เก็บในคอลเลกชัน';
}
