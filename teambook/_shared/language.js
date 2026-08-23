/* TeamBook 1.4 — SINGLE BOOTSTRAP · THAI ONLY

   Historical filename only: HTML pages already point at /_shared/language.js.
   There is NO language module, locale switcher, runtime translation, or
   language state in TeamBook 1.4. This URL is kept only as the single product
   bootstrap so current pages do not add another compatibility layer.

   V1.4 rules:
   1. This file is the only route owner.
   2. Feature modules load only on routes that use them.
   3. Utilities (especially card-ui.js) never boot route features.
   4. Active modules use one canonical URL, without version-query variants, so
      the browser ES-module registry deduplicates them naturally.
   5. Concurrent identical Public GETs share one in-flight response.
   6. Retired compatibility modules are not loaded.
   7. Human-language UI is Thai only until a future deliberate localization
      project replaces this architecture.
*/

const PATH = location.pathname;
const loaded = new Set();

globalThis.__TEAMBOOK_VERSION__ = '1.4';
document.documentElement.dataset.teambookVersion = '1.4';

function importOnce(path) {
  if (loaded.has(path)) return Promise.resolve();
  loaded.add(path);
  return import(path).catch(error => {
    loaded.delete(path);
    console.warn(`TeamBook 1.4 module unavailable: ${path}`, error);
  });
}

function importMany(paths) {
  return Promise.all(paths.map(importOnce));
}

function installNetworkGuard() {
  if (globalThis.__teambookV14FetchGuard || typeof fetch !== 'function') return;
  globalThis.__teambookV14FetchGuard = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  const pending = new Map();

  function requestInfo(input, init = {}) {
    const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      const url = new URL(raw || '', location.origin);
      return { method, url };
    } catch {
      return { method, url: null };
    }
  }

  function shareKey(method, url) {
    if (method !== 'GET' || !url || url.origin !== location.origin) return '';
    const publicPreview = url.pathname === '/api/teambook-party-finish'
      && url.searchParams.get('op') === 'public-preview-v2';
    const publicDetail = url.pathname === '/api/teambook-public-detail-v13';
    const publicList = url.pathname === '/api/teambook-public-list-v13';
    if (!publicPreview && !publicDetail && !publicList) return '';
    return `${method} ${url.pathname}?${url.searchParams.toString()}`;
  }

  globalThis.fetch = function teambookV14Fetch(input, init) {
    const { method, url } = requestInfo(input, init);

    /* index.html still contains its historical Public loader. V1.4 does not
       let that loader touch the network: the visible Home Public lane is owned
       exclusively by home-public-v14.js and uses the richer v13 list endpoint.
       Returning an empty legacy snapshot keeps the old Home boot harmless. */
    if (PATH === '/' && method === 'GET' && url?.origin === location.origin
        && url.pathname === '/api/teambook/public') {
      return Promise.resolve(new Response(JSON.stringify({
        ok:true, parties:[], nextCursor:null, v14LegacySuppressed:true,
      }), { status:200, headers:{ 'content-type':'application/json' } }));
    }

    const key = shareKey(method, url);
    if (!key) return nativeFetch(input, init);
    if (!pending.has(key)) {
      const request = nativeFetch(input, init)
        .then(response => response.clone())
        .finally(() => setTimeout(() => pending.delete(key), 0));
      pending.set(key, request);
    }
    return pending.get(key).then(response => response.clone());
  };
}

/* Install the network guard synchronously when this module evaluates. The
   bottom inline module in index.html executes later in the module-script queue,
   so its retired Public request is already neutralized before it can fire. */
installNetworkGuard();

async function boot() {
  if (globalThis.__teambookV14Runtime) return;
  globalThis.__teambookV14Runtime = true;

  await importOnce('./header-brand-th.js');

  if (PATH === '/') {
    await importMany([
      './home-onboarding-v14.js',
      './home-public-v14.js',
      './home-create-capacity.js',
      './home-canonical-guard.js',
      './home-cover-v3.js',
      './home-daily-meta-v14.js',
      './home-card-ratio-fix.js',
      './home-self-status-v14.js',
      './home-carousel-desktop.js',
      './v12-home-active-only.js',
    ]);
    return;
  }

  if (/^\/p\/?$/.test(PATH)) {
    await importMany([
      './activity-ux.js',
      './v13-public-first.js',
      './trust-seen.js',
      './live-sync.js',
      './owner-label-v13.js',
      './reward-history-v13.js',
      './party-enhancements.js',
      './party-profile-covers.js',
      './party-log-viewport.js',
      './party-event-copy-v2.js',
      './party-pet-seat-v2.js',
      './party-invite-copy.js',
      './party-log-export.js',
      './party-teambook-cards.js',
      './party-today-details.js',
      './party-visibility-status.js',
      './party-character-save-v14.js',
      './v12-party-query.js',
      './v12-ending-image-auth.js',
      './level-up-growth.js',
      './v12-gameplay.js',
    ]);
    return;
  }

  if (/^\/public\/p\/?$/.test(PATH)) {
    await importMany([
      './activity-ux.js',
      './v13-public-first.js',
      './trust-seen.js',
      './owner-label-v13.js',
      './public-member-identity-v13.js',
      './reward-history-v13.js',
      './public-ui-v13-final.js',
    ]);
    return;
  }

  if (/^\/new\/?$/.test(PATH)) {
    await importMany([
      './v13-public-first.js',
      './v12-new-reuse.js',
      './new-cover-v3.js',
      './new-cover-size-fix.js',
      './collection-skin-picker.js',
      './new-capacity-guard.js',
    ]);
    return;
  }

  if (/^\/collection\/?$/.test(PATH)) {
    await importMany([
      './v12-gameplay.js',
      './v12-collection-reuse.js',
      '/assets/account.js',
    ]);
  }
}

/* Module scripts are deferred by the browser, so the document is already
   parsed when this entrypoint evaluates. Start immediately; do not add another
   DOMContentLoaded layer. */
boot();
