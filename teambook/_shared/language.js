/* TeamBook 1.5 — SINGLE BOOTSTRAP · THAI ONLY

   Historical filename only: HTML pages already point at /_shared/language.js.
   There is NO language module, locale switcher, runtime translation, or
   language state. This URL is the single product bootstrap.

   V1.5 rules:
   1. This file is the only route owner.
   2. Feature modules load only on routes that use them.
   3. Utilities never boot route features.
   4. Public/Home occupancy is rendered only from canonical server capacity.
   5. Per-book capacity compatibility code never runs on Home/Public lists.
   6. Concurrent identical Public GETs share one in-flight response.
   7. Human-language UI is Thai only until a deliberate localization project.
*/

const PATH = location.pathname;
const loaded = new Set();
const CAPACITY_REV = '20260824-card-visual-v19';

globalThis.__TEAMBOOK_VERSION__ = '1.5';
document.documentElement.dataset.teambookVersion = '1.5';

function importOnce(path) {
  if (loaded.has(path)) return Promise.resolve();
  loaded.add(path);
  return import(path).catch(error => {
    loaded.delete(path);
    console.warn(`TeamBook 1.5 module unavailable: ${path}`, error);
  });
}

function importMany(paths) {
  return Promise.all(paths.map(importOnce));
}

function installNetworkGuard() {
  if (globalThis.__teambookV15FetchGuard || typeof fetch !== 'function') return;
  globalThis.__teambookV15FetchGuard = true;

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

  globalThis.fetch = function teambookV15Fetch(input, init) {
    const { method, url } = requestInfo(input, init);

    if (PATH === '/' && method === 'GET' && url?.origin === location.origin
        && url.pathname === '/api/teambook/public') {
      return Promise.resolve(new Response(JSON.stringify({
        ok:true, parties:[], nextCursor:null, legacyHomePublicSuppressed:true,
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

installNetworkGuard();

async function boot() {
  if (globalThis.__teambookV15Runtime) return;
  globalThis.__teambookV15Runtime = true;

  await importOnce('./header-brand-th.js');
  /* Historical geometry may still be referenced by cached pages, but the new
     visual owner below removes those styles and is the final paint authority. */
  await importOnce(`./card-geometry-v16.js?v=${CAPACITY_REV}`);
  await importOnce(`./card-visual-final-v19.js?v=${CAPACITY_REV}`);

  if (PATH === '/') {
    await importMany([
      './home-onboarding-v14.js',
      `./home-public-v15.js?v=${CAPACITY_REV}`,
      './home-create-capacity.js',
      './home-canonical-guard.js',
      './home-cover-v3.js',
      './home-daily-meta-v14.js',
      './home-self-status-v14.js',
      './home-carousel-desktop.js',
      './v12-home-active-only.js',
    ]);
    return;
  }

  if (/^\/p\/?$/.test(PATH)) {
    await importMany([
      `./member-capacity-v14.js?v=${CAPACITY_REV}`,
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
      `./party-card-picker-v15.js?v=${CAPACITY_REV}`,
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
      `./public-detail-v15.js?v=${CAPACITY_REV}`,
      './public-detail-edge-fix-v14.js',
    ]);
    return;
  }

  if (/^\/new\/?$/.test(PATH)) {
    await importMany([
      `./member-capacity-v14.js?v=${CAPACITY_REV}`,
      './v13-public-first.js',
      './v12-new-reuse.js',
      './new-cover-v3.js',
      './new-cover-size-fix.js',
      './collection-skin-picker.js',
      './new-capacity-guard.js',
    ]);
    return;
  }

  if (/^\/public\/?$/.test(PATH)) return;
  if (/^\/profile\/?$/.test(PATH)) return;

  if (/^\/collection\/?$/.test(PATH)) {
    await importMany([
      './v12-gameplay.js',
      './v12-collection-reuse.js',
      '/assets/account.js',
    ]);
  }
}

boot();
