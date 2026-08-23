/* TeamBook Home — creation CTA follows real capacity.

   Product rule:
   - if the person can create another book, the V1.3 Create hero may stay at
     the top of Home
   - if creation capacity is full, do not advertise /new at all
   - instead show one quiet, disabled capacity button directly under the
     active-book hero so attention stays on the book already being lived in
   - when a slot becomes available again, restore the Create hero automatically

   This is presentation-only. The server remains the authority that rejects an
   over-capacity create request. */

import { activePartyUsage, getProfile, hasProfile } from './store.js';

const COMPACT_ID = 'tbCreateCapacityCompact';
let queued = false;

function installStyle() {
  if (document.getElementById('tb-home-create-capacity-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-create-capacity-style';
  style.textContent = `
    #v13CreateBook[hidden]{display:none!important}
    .tb-create-capacity-compact{margin:10px 0 16px;text-align:center}
    .tb-create-capacity-compact[hidden]{display:none!important}
    .tb-create-capacity-compact .btn{width:min(100%,420px);margin:0;min-height:46px;font-size:13px;opacity:.72;cursor:default}
    .tb-create-capacity-compact .btn:disabled{opacity:.72;color:var(--xty-muted);-webkit-text-fill-color:var(--xty-muted)}
  `;
  document.head.appendChild(style);
}

function capacityState() {
  const profile = getProfile();
  if (!profile) return null;
  const usage = activePartyUsage(profile);
  const ownedFull = usage.owned >= usage.maxOwned;
  const totalFull = usage.total >= usage.maxTotal;
  return {
    ...usage,
    canCreate: !ownedFull && !totalFull,
    ownedFull,
    totalFull,
  };
}

function compactLabel(capacity) {
  if (capacity.ownedFull) {
    return `ช่องสร้างสมุดเต็ม · ${capacity.owned}/${capacity.maxOwned}`;
  }
  return `ช่องสมุดที่ใช้งานเต็ม · ${capacity.total}/${capacity.maxTotal}`;
}

function ensureCompact(mainParty) {
  let node = document.getElementById(COMPACT_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = COMPACT_ID;
    node.className = 'tb-create-capacity-compact';
    node.innerHTML = '<button class="btn ghost" type="button" disabled aria-disabled="true"></button>';
  }
  if (node.previousElementSibling !== mainParty) {
    mainParty.insertAdjacentElement('afterend', node);
  }
  return node;
}

function sync() {
  if (location.pathname !== '/' || !hasProfile()) return;
  installStyle();

  const capacity = capacityState();
  const mainParty = document.getElementById('mainParty');
  const hero = document.getElementById('v13CreateBook');
  if (!capacity || !mainParty) return;

  /* Available capacity: creation deserves the prominent first position. */
  if (capacity.canCreate) {
    if (hero && hero.hidden) hero.hidden = false;
    const compact = document.getElementById(COMPACT_ID);
    if (compact && !compact.hidden) compact.hidden = true;
    return;
  }

  /* Full capacity: never leave a prominent create invitation on screen. */
  if (hero && !hero.hidden) hero.hidden = true;
  const compact = ensureCompact(mainParty);
  const button = compact.querySelector('button');
  const label = compactLabel(capacity);
  if (button && button.textContent !== label) button.textContent = label;
  if (compact.hidden) compact.hidden = false;
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
  if (location.pathname !== '/') return;
  installStyle();
  const home = document.getElementById('home') || document.body;
  const observer = new MutationObserver(schedule);
  observer.observe(home, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  addEventListener('pageshow', schedule);
  addEventListener('storage', schedule);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule();
  });
  schedule();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
