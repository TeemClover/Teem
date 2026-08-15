import { cardById, cardNameTh } from './cards.js';

export function cardMarkup(cardOrId, { role = '', foil = false } = {}) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card) return '';
  const roleLabel = role === 'lead' ? 'LEAD' : (role === 'npc' ? 'NPC' : (role === 'pet' ? 'PET' : ''));
  const classes = ['animal-card'];
  if (role === 'lead') classes.push('lead-card');
  if (role === 'npc' || role === 'pet') classes.push('companion-card');
  if (foil) classes.push('foil-once');
  return `<div class="${classes.join(' ')}" data-color="${card.color}" aria-label="${cardNameTh(card)}">`
    + (roleLabel ? `<span class="role-badge">${roleLabel}</span>` : '')
    + `<img class="card-art" src="${card.art}" alt="" width="256" height="256" loading="lazy" decoding="async">`
    + `<span class="card-copy"><b>${cardNameTh(card)}</b><small>${card.series}</small></span>`
    + '</div>';
}

export function cardStatusLabel(status) {
  return ({
    AVAILABLE: 'พร้อมใช้',
    IN_PARTY: 'กำลังเป็น Lead',
    NPC_IN_PARTY: 'กำลังร่วมตี้เป็น NPC',
  })[status] || 'เก็บในคอลเลกชัน';
}
