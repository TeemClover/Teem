import { getProfile, availableOwnedCards } from './store.js';
import { cardMarkup } from './card-ui.js';
import { cardDescriptorTh } from './cards.js';
import { getUnlockedFirstHandIds } from '../../core7/js/collection-progress.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';
import { cardSVG } from '../../core7/js/art.js';

const BACK = '/core7/assets/myclover-back.webp';

function installStyles() {
  if (document.getElementById('xty-cover-v3-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-cover-v3-style';
  style.textContent = `
    #leadPick .card-select{align-self:start}
    .xty-real-card-back,.xty-core7-cover{width:100%;aspect-ratio:63/88;overflow:hidden;border-radius:14px;background:#13291d;box-shadow:0 3px 8px rgba(62,51,44,.12)}
    .xty-real-card-back img{width:100%;height:100%;object-fit:cover}
    .xty-core7-cover svg{display:block;width:100%;height:100%}
    .xty-cover-caption{display:block;margin-top:7px;color:var(--xty-muted);font-size:11.5px;line-height:1.35;text-align:center}
  `;
  document.head.appendChild(style);
}

function backMarkup() {
  return `<div class="xty-real-card-back"><img src="${BACK}" alt="หลังการ์ด myClover"></div><span class="xty-cover-caption">หลังการ์ด myClover</span>`;
}

function core7Markup(id) {
  const card = core7CardById(id);
  if (!card) return '';
  return `<div class="xty-core7-cover">${cardSVG(id, { width: 300, showNumber: true })}</div><span class="xty-cover-caption">${card.en} · ${card.th}</span>`;
}

function setOverride(coverType, leadCardId = null, core7CardId = null) {
  window.__xtyCoverV2 = { coverType, leadCardId, core7CardId };
}

function button(markup, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'card-select'; b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', label); b.innerHTML = markup; b.addEventListener('click', onClick);
  return b;
}

function install() {
  const host = document.getElementById('leadPick');
  const hint = document.getElementById('coverHint');
  if (!host || host.dataset.coverV3 === '1') return;
  host.dataset.coverV3 = '1'; installStyles(); host.innerHTML = '';

  const items = [];
  const choose = selected => {
    items.forEach(item => {
      const on = item === selected;
      item.classList.toggle('picked', on);
      item.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  };

  const back = button(backMarkup(), 'ใช้หลังการ์ด myClover เป็นปกตี้', () => {
    setOverride('card_back'); choose(back);
  });
  back.classList.add('picked'); back.setAttribute('aria-checked', 'true'); items.push(back); host.appendChild(back);
  setOverride('card_back');

  const profile = getProfile();
  const xtyCards = availableOwnedCards({ role: 'lead', profile });
  for (const card of xtyCards) {
    const b = button(`${cardMarkup(card, { role: 'lead' })}<span class="xty-cover-caption">${cardDescriptorTh(card)}</span>`,
      `ใช้ ${cardDescriptorTh(card)} เป็นปกตี้`, () => { setOverride('card', card.cardId, null); choose(b); });
    items.push(b); host.appendChild(b);
  }

  const core7Ids = getUnlockedFirstHandIds();
  for (const id of core7Ids) {
    const card = core7CardById(id); if (!card) continue;
    const b = button(core7Markup(id), `ใช้ ${card.en} ${card.th} เป็นปกตี้`, () => {
      setOverride('core7_card', null, id); choose(b);
    });
    items.push(b); host.appendChild(b);
  }

  if (hint) {
    const bits = ['หลังการ์ด myClover ใช้ได้เสมอ'];
    if (xtyCards.length) bits.push(`Animal Card ที่ใช้เป็นปกได้ ${xtyCards.length} ใบ`);
    if (core7Ids.length) bits.push(`FIRST HAND ที่ปลดแล้ว ${core7Ids.length} ใบ`);
    hint.textContent = bits.join(' · ');
  }
}

requestAnimationFrame(() => requestAnimationFrame(install));
