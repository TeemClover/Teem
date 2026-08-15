import {
  XTY_RARITY_META, cardById, cardDescriptorTh, cardNameTh,
} from './cards.js';

if (typeof document !== 'undefined' && !document.getElementById('xty-canonical-back-style')) {
  const style = document.createElement('style');
  style.id = 'xty-canonical-back-style';
  style.textContent = `
    .animal-card.card-back{
      aspect-ratio:63/88!important;
      background:#13291d url('/core7/assets/myclover-back.webp') center/cover no-repeat!important;
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
    /* Canonical XTY card face: art first. The only visible copy on-card is
       the card name plus one rarity tag at bottom center. */
    .animal-card .role-badge,
    .animal-card .color-badge,
    .animal-card .card-accessory,
    .animal-card .card-copy small{display:none!important}
    .animal-card .card-copy{
      position:absolute!important;
      left:8px!important;right:8px!important;bottom:31px!important;z-index:5!important;
      display:block!important;margin:0!important;padding:4px 6px!important;
      text-align:center!important;border:0!important;border-radius:7px!important;
      background:rgba(255,254,248,.91)!important;
      box-shadow:none!important;
    }
    .animal-card .card-copy b{
      display:block!important;overflow:hidden!important;
      color:var(--xty-ink)!important;font-size:clamp(10px,3vw,14px)!important;
      line-height:1.25!important;font-weight:800!important;
      text-overflow:ellipsis!important;white-space:nowrap!important;
    }
    .animal-card .rarity-badge{
      top:auto!important;right:50%!important;bottom:8px!important;left:auto!important;
      transform:translateX(50%)!important;z-index:6!important;
      min-width:0!important;padding:4px 8px!important;
      font-size:7px!important;line-height:1!important;letter-spacing:.11em!important;
      text-align:center!important;white-space:nowrap!important;
    }
    .animal-card.rarity-rare .card-art,
    .animal-card.rarity-epic .card-art,
    .animal-card.rarity-legendary .card-art{
      margin:0!important;width:100%!important;height:100%!important;object-fit:cover!important;
    }
  `;
  document.head.appendChild(style);
}

if (typeof location !== 'undefined' && /^\/xty\/p(?:\/|$)/.test(location.pathname)) {
  import('./party-enhancements.js').catch(error => console.warn('XTY party enhancements unavailable', error));
  import('./party-profile-covers.js').catch(error => console.warn('XTY profile/cover layer unavailable', error));
  import('./party-log-viewport.js').catch(error => console.warn('XTY party log viewport unavailable', error));
  import('./party-event-copy-v2.js').catch(error => console.warn('XTY party event copy unavailable', error));
}
if (typeof location !== 'undefined' && /^\/xty\/new(?:\/|$)/.test(location.pathname)) {
  import('./new-cover-v3.js').catch(error => console.warn('XTY cover picker unavailable', error));
}
if (typeof location !== 'undefined' && /^\/xty\/?$/.test(location.pathname)) {
  import('./home-cover-v3.js').catch(error => console.warn('XTY home cover layer unavailable', error));
}

export function cardMarkup(cardOrId, { role = '', foil = false, eager = false } = {}) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card) return '';
  const classes = ['animal-card'];
  if (role === 'lead') classes.push('lead-card');
  if (role === 'npc' || role === 'pet') classes.push('companion-card');
  if (foil) classes.push('foil-once');
  classes.push(`rarity-${card.rarity || 'common'}`);
  const rarity = XTY_RARITY_META[card.rarity] || XTY_RARITY_META.common;
  return `<div class="${classes.join(' ')}" data-color="${card.color}" data-species="${card.species}" aria-label="${cardDescriptorTh(card)}">`
    + `<img class="card-art" src="${card.imageFull || card.art}" alt="" width="630" height="880" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    + `<span class="card-copy"><b>${cardNameTh(card)}</b></span>`
    + `<span class="rarity-badge">${rarity.label}</span>`
    + '</div>';
}

export function cardStatusLabel(status) {
  return ({ AVAILABLE: 'พร้อมใช้งาน', AVATAR_IN_USE: 'ใช้อยู่เป็น Avatar', IN_PARTY: 'ใช้อยู่เป็น Party Cover', NPC_IN_PARTY: 'ใช้อยู่เป็น NPC' })[status] || 'เก็บในคอลเลกชัน';
}
