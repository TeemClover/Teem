import { getParty } from './store.js';

/* Owner-card semantics:
   - the floating label above the card explains the ROLE: เจ้าของสมุด
   - the label inside the card identifies WHO owns this Book (owner alias)
   This matches every other human card, where the name stays inside the card. */

let queued = false;

function syncPartyOwnerLabel() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  const party = getParty(code);
  const owner = party?.members?.find(member => member.role === 'lead');
  if (!owner) return;

  const seats = [...document.querySelectorAll('#seats > .tb-person-seat')];
  const seat = seats.find(node => node.dataset.tbUserId === owner.userId);
  if (!seat) return;

  const floating = seat.querySelector(':scope > .tb-owner-label');
  if (floating && floating.textContent !== 'เจ้าของสมุด') {
    floating.textContent = 'เจ้าของสมุด';
    delete floating.dataset.ownerAlias;
  }

  const cardName = seat.querySelector(':scope > .tb-card-name');
  const alias = owner.alias || 'ไม่ระบุชื่อ';
  if (cardName && cardName.textContent !== alias) cardName.textContent = alias;
}

function syncPublicOwnerOrder() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  const members = document.getElementById('members');
  if (!members) return;
  const owner = [...members.querySelectorAll('.preview-member')]
    .find(node => String(node.querySelector('small')?.textContent || '').includes('เจ้าของสมุด'));
  if (owner && members.firstElementChild !== owner) members.prepend(owner);
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    syncPartyOwnerLabel();
    syncPublicOwnerOrder();
  });
}

function install() {
  /* Remove the old v13 runtime style if this module is hot-reloaded. */
  document.getElementById('tb-owner-label-v13-style')?.remove();

  const root = document.getElementById('view') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
