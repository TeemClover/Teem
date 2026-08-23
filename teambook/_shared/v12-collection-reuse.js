/* TeamBook V1.2 — Collection chronology + reusable-card actions.
   A card is a memory collectible, not an occupied inventory slot. Cards can
   be reused across books; Cover + Companion collision is enforced only inside
   the destination book. */

import { allParties, getProfile, isActiveParty, ownedCards, partyIdentity } from './store.js';
import { cardById, cardDescriptorTh } from './cards.js';

const DEBUG_MAX7_CODE = 'max7books';
const DEBUG_MAX7_KEY = 'teambook_debug_max_owned_7';

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
    if (caption && caption.textContent !== date) caption.textContent = date;
    const label = `${cardDescriptorTh(card)} · พบ ${date}`;
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
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

function setHidden(node, hidden) {
  if (node && node.hidden !== hidden) node.hidden = hidden;
}

function setHref(node, href) {
  if (!node) return;
  const current = node.getAttribute('href') || '';
  if (current !== href) node.setAttribute('href', href);
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
    setHidden(cover, !card.eligibility?.partyCover);
    setHref(cover, `/new/?lead=${encodeURIComponent(card.cardId)}`);
  }
  if (npc) {
    setHidden(npc, !card.eligibility?.npc);
    const party = ownedPartyForCompanion(card.cardId);
    setHref(npc, party
      ? `/p/?c=${encodeURIComponent(party.code)}&npc=${encodeURIComponent(card.cardId)}#manage`
      : `/new/?npc=${encodeURIComponent(card.cardId)}`);
  }

  /* No IN USE / AVAILABLE copy. The equipped avatar already has its visual
     treatment, and book placement does not consume the card. */
  const status = document.getElementById('detailStatus');
  const persona = card.personalityNameTh || '';
  if (status && status.textContent !== persona) status.textContent = persona;
}

function debugMax7Enabled() {
  try { return localStorage.getItem(DEBUG_MAX7_KEY) === '1'; }
  catch { return false; }
}

function installDebugMax7Toggle() {
  const form = document.getElementById('debugForm');
  const input = document.getElementById('debugCode');
  const feedback = document.getElementById('debugFeedback');
  if (!form || !input || !feedback) return;

  form.addEventListener('submit', event => {
    const code = String(input.value || '').trim().toLowerCase();
    if (code !== DEBUG_MAX7_CODE) return;

    /* Capture this debug code before the legacy Collection handler sees it.
       The toggle is intentionally device-local; the create API independently
       verifies the authenticated test member before honouring the 7-book cap. */
    event.preventDefault();
    event.stopImmediatePropagation();

    const enabled = !debugMax7Enabled();
    try {
      if (enabled) localStorage.setItem(DEBUG_MAX7_KEY, '1');
      else localStorage.removeItem(DEBUG_MAX7_KEY);
    } catch {}

    input.value = '';
    feedback.classList.remove('error');
    feedback.textContent = enabled
      ? 'โหมดทดสอบ 7 สมุด: เปิดแล้ว · สร้างสมุดที่กำลังเขียนได้สูงสุด 7 เล่ม'
      : 'โหมดทดสอบ 7 สมุด: ปิดแล้ว · กลับไปใช้จำนวนช่องตาม Level';
  }, true);
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

  installDebugMax7Toggle();

  /* Observe content replacement in the grid, but only the dialog's own open
     state. Inner href/hidden/text changes are our output and must not feed
     back into another render loop. */
  if (cards) new MutationObserver(sync).observe(cards, { childList: true, subtree: true });
  if (dialog) {
    new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    dialog.addEventListener('click', sync, true);
  }
  addEventListener('pageshow', sync);
  sync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
