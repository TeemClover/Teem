import { getParty } from './store.js';

/* Owner-card semantics, authoritative after all board renderers:
   - floating label above the owner card = ROLE: เจ้าของสมุด
   - label inside the owner card = WHO: owner alias

   This module intentionally loads after the /p route modules. It also watches
   late rerenders so legacy/cached code cannot swap the two labels again. */

let queued = false;

function removeLegacySwapStyle() {
  document.getElementById('tb-owner-label-v13-style')?.remove();
}

function ensureOverlay(node, className, text) {
  let el = node.querySelector(`:scope > .${className}`);
  if (!el) {
    el = document.createElement('span');
    el.className = className;
    node.appendChild(el);
  }
  if (el.textContent !== text) el.textContent = text;
  return el;
}

function syncPartyOwnerLabel() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;

  const party = getParty(code);
  const owner = party?.members?.find(member => member?.role === 'lead' && !member.leftAt);
  if (!owner) return;

  const seats = [...document.querySelectorAll('#seats > .tb-person-seat')];
  const seat = seats.find(node => node.dataset.tbUserId === owner.userId)
    || seats.find(node => node.classList.contains('lead'));
  if (!seat) return;

  removeLegacySwapStyle();

  /* Remove legacy pseudo-content hook. */
  const floating = ensureOverlay(seat, 'tb-owner-label', 'เจ้าของสมุด');
  delete floating.dataset.ownerAlias;
  floating.removeAttribute('data-owner-alias');
  floating.style.removeProperty('font-size');
  floating.style.removeProperty('letter-spacing');

  ensureOverlay(seat, 'tb-card-name', owner.alias || 'ไม่ระบุชื่อ');

  /* No non-owner seat should ever carry the owner role label. */
  seats.forEach(node => {
    if (node !== seat) node.querySelector(':scope > .tb-owner-label')?.remove();
  });
}

function syncPublicOwnerOrder() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  const members = document.getElementById('members');
  if (!members) return;
  const owner = [...members.querySelectorAll('.preview-member')]
    .find(node => String(node.querySelector('small')?.textContent || '').includes('เจ้าของสมุด'));
  if (owner && members.firstElementChild !== owner) members.prepend(owner);
}

function sync() {
  removeLegacySwapStyle();
  syncPartyOwnerLabel();
  syncPublicOwnerOrder();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync();
  });
}

function install() {
  sync();

  const root = document.getElementById('view') || document.body;
  new MutationObserver(schedule).observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-owner-alias', 'data-tb-user-id'],
  });

  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule();
  });

  /* Cover async renderers which finish just after route boot. */
  [0, 50, 250, 750, 1500].forEach(delay => setTimeout(schedule, delay));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
