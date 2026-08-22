/* TeamBook V1.2 — Collection chronology + reusable-card actions.
   A card is a memory collectible, not an occupied inventory slot. Cards can
   be reused across books; Cover + Companion collision is enforced only inside
   the destination book. */

import { allParties, getProfile, isActiveParty, ownedCards, partyIdentity } from './store.js';
import { cardById, cardDescriptorTh } from './cards.js';

const bangkokDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric',
});

function stamp(value) {
  const n = new Date(value || 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

function dateDDMMYYYY(value) {
  const n = stamp(value);
  if (!n) return '—';
  const parts = bangkokDate.formatToParts(new Date(n));
  const get = type => parts.find(part => part.type === type)?.value || '';
  const day = get('day'); const month = get('month'); const year = get('year');
  return day && month && year ? `${day}-${month}-${year}` : '—';
}

function sortedRecords() {
  return ownedCards(getProfile()).sort((a, b) => stamp(b.acquiredAt) - stamp(a.acquiredAt));
}

function syncCollectionDates() {
  const cards = [...document.querySelectorAll('#cards .collection-card')];
  const records = sortedRecords();
  cards.forEach((button, index) => {
    const record = records[index];
    const card = record ? cardById(record.cardId) : null;
    if (!record || !card) return;
    const date = dateDDMMYYYY(record.acquiredAt);
    const caption = button.querySelector('.collection-status');
    if (caption) caption.textContent = date;
    button.setAttribute('aria-label', `${cardDescriptorTh(card)} · พบ ${date}`);
  });
}

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

function syncDetail() {
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

  /* No IN USE / AVAILABLE copy. The equipped avatar already has its visual
     treatment, and book placement does not consume the card. */
  const status = document.getElementById('detailStatus');
  if (status) status.textContent = card.personalityNameTh || '';
}

let queued = false;
function sync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    syncCollectionDates();
    syncDetail();
  });
}

function install() {
  if (!/^\/collection(?:\/|$)/.test(location.pathname)) return;
  const cards = document.getElementById('cards');
  const dialog = document.getElementById('detail');
  const observer = new MutationObserver(sync);
  if (cards) observer.observe(cards, { childList: true, subtree: true });
  if (dialog) {
    observer.observe(dialog, { attributes: true, childList: true, subtree: true });
    dialog.addEventListener('click', sync, true);
  }
  addEventListener('pageshow', sync);
  sync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
