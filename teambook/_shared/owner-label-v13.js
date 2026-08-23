import { getParty } from './store.js';

/* The owner card has two labels with two different jobs:
   - the floating label above the card identifies WHO owns this Book
   - the small label inside the card explains the ROLE of that seat
   Keeping those meanings separate avoids the old "เจ้าของสมุด" badge floating
   above a card whose actual owner name was buried inside the artwork. */

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
  if (floating && floating.textContent !== owner.alias) floating.textContent = owner.alias || 'เจ้าของสมุด';

  const cardName = seat.querySelector(':scope > .tb-card-name');
  if (cardName && cardName.textContent !== 'เจ้าของสมุด') cardName.textContent = 'เจ้าของสมุด';
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
  const root = document.getElementById('view') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
