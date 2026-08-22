/* TeamBook V1.2 — Collection actions for reusable cards.
   Placement in another book is no longer a reason to hide a card action.
   Same-book Cover + Companion collision is enforced at the destination. */

import { allParties, isActiveParty, partyIdentity } from './store.js';
import { cardById } from './cards.js';

function cardIdFromDetail() {
  const cover = document.getElementById('useCover');
  const npc = document.getElementById('useNpc');
  try {
    const fromCover = new URL(cover?.href || location.href, location.origin).searchParams.get('lead');
    if (fromCover && cardById(fromCover)) return fromCover;
    const fromNpc = new URL(npc?.href || location.href, location.origin).searchParams.get('npc');
    return fromNpc && cardById(fromNpc) ? fromNpc : '';
  } catch { return ''; }
}

function ownedPartyForCompanion(cardId) {
  return allParties().find(party => {
    const identity = partyIdentity(party.code);
    return isActiveParty(party)
      && identity?.userId
      && party.ownerId === identity.userId
      && String(party.leadCardId || '') !== cardId;
  }) || null;
}

function sync() {
  const dialog = document.getElementById('detail');
  if (!dialog || (!dialog.open && !dialog.hasAttribute('open'))) return;
  const cardId = cardIdFromDetail();
  const card = cardById(cardId);
  if (!card) return;

  const cover = document.getElementById('useCover');
  const npc = document.getElementById('useNpc');
  if (cover) {
    cover.hidden = !card.eligibility?.partyCover;
    cover.href = `/new/?lead=${encodeURIComponent(card.cardId)}`;
  }
  if (npc) {
    npc.hidden = !card.eligibility?.npc;
    const party = ownedPartyForCompanion(card.cardId);
    npc.href = party
      ? `/p/?c=${encodeURIComponent(party.code)}&npc=${encodeURIComponent(card.cardId)}#manage`
      : `/new/?npc=${encodeURIComponent(card.cardId)}`;
  }

  const status = document.getElementById('detailStatus');
  if (status && !status.textContent.includes('ใช้ซ้ำข้ามสมุดได้')) {
    status.textContent = `${status.textContent.replace(/\s*·\s*ใช้อยู่(?:เป็นปกสมุด|เป็นเพื่อนร่วมทาง).*$/u, '').trim()} · ใช้ซ้ำข้ามสมุดได้`;
  }
}

function install() {
  if (!/^\/collection(?:\/|$)/.test(location.pathname)) return;
  const dialog = document.getElementById('detail');
  if (!dialog) return;
  const observer = new MutationObserver(sync);
  observer.observe(dialog, { attributes: true, childList: true, subtree: true });
  dialog.addEventListener('click', () => requestAnimationFrame(sync), true);
  sync();
}

requestAnimationFrame(() => requestAnimationFrame(install));
