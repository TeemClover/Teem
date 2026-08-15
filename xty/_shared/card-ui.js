import {
  XTY_RARITY_META, cardById, cardDescriptorTh, cardNameTh,
} from './cards.js';

/* Party-only progressive enhancement: linkify chat URLs, merge canonical
   party events into the visible log, and expose self-leave without making
   every XTY page pay for that code. */
if (typeof location !== 'undefined' && /^\/xty\/p(?:\/|$)/.test(location.pathname)) {
  import('./party-enhancements.js').catch(error => console.warn('XTY party enhancements unavailable', error));
}

export function cardMarkup(cardOrId, { role = '', foil = false, eager = false } = {}) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card) return '';
  const roleLabel = role === 'lead' ? 'LEAD' : (role === 'npc' ? 'NPC' : (role === 'pet' ? 'PET' : ''));
  const classes = ['animal-card'];
  if (role === 'lead') classes.push('lead-card');
  if (role === 'npc' || role === 'pet') classes.push('companion-card');
  if (foil) classes.push('foil-once');
  classes.push(`rarity-${card.rarity || 'common'}`);
  const rarity = XTY_RARITY_META[card.rarity] || XTY_RARITY_META.common;
  return `<div class="${classes.join(' ')}" data-color="${card.color}" data-species="${card.species}" aria-label="${cardDescriptorTh(card)}">`
    + (roleLabel ? `<span class="role-badge">${roleLabel}</span>` : '')
    + `<span class="rarity-badge">${rarity.label}</span>`
    + `<span class="color-badge">${card.colorNameTh}</span>`
    + `<img class="card-art" src="${card.imageFull || card.art}" alt="" width="630" height="880" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    + '<span class="card-accessory" aria-hidden="true"><i></i><i></i><i></i><i></i><b>✦</b></span>'
    + `<span class="card-copy"><b>${cardNameTh(card)}</b><small>สี${card.colorNameTh} · ${rarity.label}</small></span>`
    + '</div>';
}

export function cardStatusLabel(status) {
  return ({
    AVAILABLE: 'พร้อมใช้งาน',
    AVATAR_IN_USE: 'ใช้อยู่เป็น Avatar',
    IN_PARTY: 'ใช้อยู่เป็น Party Cover',
    NPC_IN_PARTY: 'ใช้อยู่เป็น NPC',
  })[status] || 'เก็บในคอลเลกชัน';
}
