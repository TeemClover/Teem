/* TeamBook Home — creation CTA follows real capacity.

   Canon:
   - Home has one compact create action: “เปิดสมุดเล่มใหม่” in #homeActions.
   - Action order is Create -> Join by code -> Public books.
   - The large first-book/create hero may appear when capacity allows.
   - When owned capacity is full, hide the large hero instead of injecting a
     second create button next to the canonical Home action.
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
  const actions = document.getElementById('homeActions');
  if (!actions) return;

  const create = actions.querySelector('a[href^="/new/"]');
  const join = actions.querySelector('a[href^="/join/"]');
  const publicBooks = document.getElementById('publicBookButton')
    || actions.querySelector('a[href^="/public/"]');

  if (create) {
    create.textContent = 'เปิดสมุดเล่มใหม่';
    create.removeAttribute('data-v13-duplicate-create');
  }
  if (join) join.textContent = 'ใส่รหัสเข้าสมุด';

  /* Public discovery has its own live lane above, but this secondary shortcut
     is intentionally kept under the join-by-code action. home-public-v14 may
     hide the historical button while taking ownership of the feed, so restore
     only this shortcut here without reviving the legacy renderer. */
  if (publicBooks) {
    publicBooks.textContent = 'ดูสมุดสาธารณะ';
    if (publicBooks.hidden) publicBooks.hidden = false;
    publicBooks.style.setProperty('display', 'flex', 'important');
  }

  /* Keep the three compact actions deterministic even if another Home module
     has moved or retouched them during boot. */
  if (create && create.parentElement === actions && actions.firstElementChild !== create) {
    actions.prepend(create);
  }
  if (join && join.parentElement === actions && create?.nextElementSibling !== join) {
    create ? create.insertAdjacentElement('afterend', join) : actions.prepend(join);
  }
  if (publicBooks && publicBooks.parentElement === actions && join?.nextElementSibling !== publicBooks) {
    join ? join.insertAdjacentElement('afterend', publicBooks) : actions.append(publicBooks);
  }

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
