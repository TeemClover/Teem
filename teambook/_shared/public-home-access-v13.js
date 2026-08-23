/* TeamBook V1.3 — Public access guard.
   Public discovery is part of Home, not an opt-in drawer.

   Canon:
   - the Public Lobby route is always reachable
   - every Home visit starts with the embedded Public lane visible
   - pressing ซ่อน may collapse it for the CURRENT page visit only
   - an old localStorage hide value must never make a new/fresh visitor think
     there are no Public Books. */

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
let queued = false;
let bootDefaultApplied = false;

function applyOpenDefaultOnce() {
  if (bootDefaultApplied || location.pathname !== '/') return;
  bootDefaultApplied = true;
  try {
    /* V1.3 used to persist this preference across visits/profiles. That made
       Public look empty for a fresh person on a reused browser. Public-first
       now means each Home visit starts open; a same-page explicit hide still
       works because this reset runs only once per document load. */
    localStorage.removeItem(HIDDEN_KEY);
  } catch {}
}
applyOpenDefaultOnce();

function hiddenByChoice() {
  try { return localStorage.getItem(HIDDEN_KEY) === '1'; }
  catch { return false; }
}

function installStyle() {
  if (document.getElementById('tb-public-access-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-access-v13-style';
  style.textContent = `
    #publicBookButton{display:flex!important}
    #publicDiscovery[data-v13-public-access="open"]{display:block!important}
  `;
  document.head.appendChild(style);
}

function sync() {
  if (location.pathname !== '/') return;
  installStyle();

  const button = document.getElementById('publicBookButton');
  if (button) {
    button.textContent = 'หาสมุดสาธารณะ';
    button.href = '/public/';
  }

  const section = document.getElementById('publicDiscovery');
  if (!section) return;
  const hidden = hiddenByChoice();
  section.dataset.v13PublicAccess = hidden ? 'hidden' : 'open';

  /* Legacy Home may put [hidden] back while it is hydrating. Public-first wins
     unless the person explicitly pressed ซ่อน during this page visit. */
  if (!hidden && !document.getElementById('home')?.hidden && section.hidden) {
    section.hidden = false;
  }
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
  installStyle();
  const root = document.body;
  new MutationObserver(schedule).observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  [0, 120, 420, 1000].forEach(delay => setTimeout(schedule, delay));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
