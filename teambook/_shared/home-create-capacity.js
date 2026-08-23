/* TeamBook Home — creation CTA follows real capacity.

   Canon:
   - Home has only one compact create action: “เปิดสมุดกับเพื่อน” in #homeActions.
   - The large first-book/create hero may appear when capacity allows.
   - When owned capacity is full, hide the large hero instead of injecting a
     second “เปิดสมุดใหม่” button next to the canonical Home action.
   - /new remains reachable from the canonical action so people may inspect the
     setup even when the server will ultimately enforce capacity.
*/

import { activePartyUsage, getProfile, hasProfile } from './store.js';

const DEBUG_MAX7_KEY = 'teambook_debug_max_owned_7';
let queued = false;

function debugMaxOwned() {
  try { return localStorage.getItem(DEBUG_MAX7_KEY) === '1' ? 7 : 0; }
  catch { return 0; }
}

function installStyle() {
  if (document.getElementById('tb-home-create-capacity-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-create-capacity-style';
  style.textContent = `
    #v13CreateBook[hidden]{display:none!important}
    #tbCreateCapacityCompact{display:none!important}
  `;
  document.head.appendChild(style);
}

function capacityState() {
  const profile = getProfile();
  if (!profile) return null;
  const usage = activePartyUsage(profile);
  const maxOwned = debugMaxOwned() || Number(usage.maxOwned || 1);
  const ownedFull = Number(usage.owned || 0) >= maxOwned;
  const totalFull = Number(usage.total || 0) >= Number(usage.maxTotal || 0);
  return {
    ...usage,
    maxOwned,
    canCreate: !ownedFull && !totalFull,
  };
}

function canonicalizeActions() {
  document.querySelectorAll('#homeActions a[href^="/new/"]').forEach(link => {
    link.textContent = '+ เปิดสมุดกับเพื่อน';
    link.removeAttribute('data-v13-duplicate-create');
  });
  document.querySelectorAll('#homeActions a[href^="/join/"]').forEach(link => {
    link.textContent = 'ใส่รหัสเข้าสมุด';
  });
  /* Retire the old capacity fallback if it was already mounted before this
     module revision (Safari bfcache / hot deployment). */
  document.getElementById('tbCreateCapacityCompact')?.remove();
}

function sync() {
  if (location.pathname !== '/' || !hasProfile()) return;
  installStyle();
  canonicalizeActions();

  const capacity = capacityState();
  const hero = document.getElementById('v13CreateBook');
  if (!capacity) return;

  if (hero) hero.hidden = !capacity.canCreate;
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
  canonicalizeActions();
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
