/* TeamBook V1.3 — Public access guard.
   The legacy Home script still owns some old Active-vs-Public visibility rules.
   Public-first canon wins here without fighting those renderers in a DOM loop:
   - the Public Lobby button is always visible/clickable for every profile
   - the embedded Public lane is visible unless the person explicitly hid it
   - explicit hide remains respected and still prevents the V1.3 loader fetch. */

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
let queued = false;

function hiddenByChoice() {
  try { return localStorage.getItem(HIDDEN_KEY) === '1'; }
  catch { return false; }
}

function installStyle() {
  if (document.getElementById('tb-public-access-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-access-v13-style';
  style.textContent = `
    /* V1.3 previously hid this legacy button because the embedded lane was
       expected to replace it. Public-first now treats the route itself as a
       permanent escape hatch, so every person can browse Public at any time. */
    #publicBookButton{display:flex!important}

    /* The old Home renderer may leave [hidden] on this section depending on
       Active-book state. When Public has not been explicitly hidden, render it
       anyway; V1.3's own observer then hydrates the Lobby normally. */
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

  /* Remove stale legacy hiding after Home has settled. Do not do this when the
     person explicitly pressed ซ่อน; that preference remains authoritative. */
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
  /* Legacy Home priority runs asynchronously. Re-assert canon after its usual
     settling window as well as through the observer. */
  [0, 120, 420, 1000].forEach(delay => setTimeout(schedule, delay));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
