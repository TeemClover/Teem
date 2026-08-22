/* TeamBook V1.2 — preserve Collection → Party companion intent.
   The V1.2 picker is populated asynchronously after the legacy management UI,
   so wait for its reusable-card option instead of depending on the retired
   CARD_IN_USE-aware picker. */

import { cardById } from './cards.js';

function install() {
  if (!/^\/p(?:\/|$)/.test(location.pathname)) return;
  const params = new URLSearchParams(location.search);
  const cardId = String(params.get('npc') || '').toUpperCase();
  if (!cardId || !cardById(cardId)) return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const select = document.getElementById('npcSelect');
    const wanted = `v12:card:${cardId}`;
    if (select && [...select.options].some(option => option.value === wanted)) {
      select.value = wanted;
      const tools = document.getElementById('partyTools');
      if (tools) tools.open = true;
      clearInterval(timer);
      return;
    }
    if (attempts >= 30) clearInterval(timer);
  }, 150);
}

requestAnimationFrame(install);
