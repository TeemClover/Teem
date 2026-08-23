import { getParty } from './store.js';

/* Owner-card semantics:
   - the floating label above the card identifies WHO owns this Book
   - the label inside the card explains the ROLE: เจ้าของสมุด
   The legacy renderer still owns its text nodes, so this patch never fights it.
   We attach data to the existing labels and let CSS present the corrected copy. */

let queued = false;

function installStyle() {
  if (document.getElementById('tb-owner-label-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-owner-label-v13-style';
  style.textContent = `
    #seats>.tb-person-seat.lead>.tb-owner-label[data-owner-alias]{font-size:0!important;letter-spacing:0!important}
    #seats>.tb-person-seat.lead>.tb-owner-label[data-owner-alias]::after{
      content:attr(data-owner-alias);font:900 9px/1.2 var(--thai),var(--sans);letter-spacing:0
    }
    #seats>.tb-person-seat.lead>.tb-card-name{font-size:0!important}
    #seats>.tb-person-seat.lead>.tb-card-name::after{
      content:'เจ้าของสมุด';font-size:clamp(10px,2.7vw,13px);font-weight:900;line-height:1.15
    }
    @media(max-width:480px){
      #seats>.tb-person-seat.lead>.tb-owner-label[data-owner-alias]::after{font-size:8px}
    }
  `;
  document.head.appendChild(style);
}

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
  if (floating && floating.dataset.ownerAlias !== owner.alias) {
    floating.dataset.ownerAlias = owner.alias || 'เจ้าของสมุด';
  }
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
    installStyle();
    syncPartyOwnerLabel();
    syncPublicOwnerOrder();
  });
}

function install() {
  installStyle();
  const root = document.getElementById('view') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
