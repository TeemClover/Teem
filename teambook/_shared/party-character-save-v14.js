/* TeamBook per-Book character editor canon.
   Starter identities may choose a frame colour. Collection cards already own
   their colour, so the Color select mirrors card.color and becomes read-only. */

import { cardById } from './cards.js';

const $ = id => document.getElementById(id);
let syncing = false;

function selectedCard() {
  const select = $('myAvatarSelect');
  return select ? cardById(select.value) : null;
}

function syncCharacterControls() {
  if (syncing || !/^\/p\/?$/.test(location.pathname)) return;
  const avatar = $('myAvatarSelect');
  const color = $('myColorSelect');
  const save = $('saveMyCharacter');
  const tools = $('myCharacterTools');
  if (!avatar || !color || !save || !tools) return;

  syncing = true;
  if (save.textContent !== '💾 SAVE') save.textContent = '💾 SAVE';

  const card = selectedCard();
  const identityLocked = tools.classList.contains('identity-locked') || avatar.disabled;
  if (card) {
    const cardColor = ['red', 'green', 'blue', 'silver'].includes(card.color) ? card.color : 'green';
    if (color.value !== cardColor) color.value = cardColor;
    color.disabled = true;
    color.dataset.cardColorLocked = '1';
    color.title = 'การ์ดใบนี้กำหนดสีมาแล้ว';
  } else {
    if (color.dataset.cardColorLocked === '1') delete color.dataset.cardColorLocked;
    color.disabled = identityLocked;
    color.removeAttribute('title');
  }
  syncing = false;
}

function install() {
  if (!/^\/p\/?$/.test(location.pathname) || globalThis.__tbPartyCharacterSaveV14) return;
  globalThis.__tbPartyCharacterSaveV14 = true;

  const avatar = $('myAvatarSelect');
  const color = $('myColorSelect');
  const save = $('saveMyCharacter');
  const tools = $('myCharacterTools');
  if (!avatar || !color || !save || !tools) return;

  avatar.addEventListener('change', syncCharacterControls);
  save.addEventListener('click', syncCharacterControls, true);

  /* Collection picker inserts/removes one synthetic card option. Watch only
     these controls, never the whole page. */
  new MutationObserver(syncCharacterControls).observe(avatar, { childList: true });
  new MutationObserver(syncCharacterControls).observe(tools, {
    attributes: true,
    attributeFilter: ['class'],
  });

  syncCharacterControls();
  requestAnimationFrame(syncCharacterControls);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
