/* TeamBook 1.4 — SINGLE RUNTIME ENTRYPOINT

   Historical filename note:
   HTML pages already point at /_shared/language.js. Since TeamBook no longer
   performs runtime translation, V1.4 deliberately turns this existing URL into
   the one and only product bootstrap instead of loading language.js ->
   runtime.js -> route patches in layers.

   V1.4 runtime rules:
   1. This file is the only route owner.
   2. Feature modules are loaded only on routes that use them.
   3. Utility renderers (especially card-ui.js) must never boot route features.
   4. Import active modules without per-module query strings so the browser's
      native ES-module registry can deduplicate a module by one canonical URL.
   5. Same-navigation public GETs are deduplicated while in flight. A refresh,
      focus, or later request still gets fresh data.
   6. Retired compatibility files may remain in git history, but must not be
      imported by the runtime.
*/

const PATH = location.pathname;
const loaded = new Set();

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

function installInFlightGetDedupe() {
  if (globalThis.__teambookV14FetchDedupe || typeof fetch !== 'function') return;
  globalThis.__teambookV14FetchDedupe = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  const pending = new Map();

  function canShare(input, init = {}) {
    const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    if (method !== 'GET') return null;
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      const url = new URL(raw || '', location.origin);
      if (url.origin !== location.origin) return null;
      const publicPreview = url.pathname === '/api/teambook-party-finish'
        && url.searchParams.get('op') === 'public-preview-v2';
      const publicDetail = url.pathname === '/api/teambook-public-detail-v13';
      const publicList = url.pathname === '/api/teambook-public-list-v13';
      if (!publicPreview && !publicDetail && !publicList) return null;
      return `${method} ${url.pathname}?${url.searchParams.toString()}`;
    } catch {
      return null;
    }
  }

  globalThis.fetch = function teambookV14Fetch(input, init) {
    const key = canShare(input, init);
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

function clearRetiredLanguageState() {
  document.getElementById('xtyLanguageCard')?.remove();
  document.getElementById('xtyLanguageChoice')?.remove();
  try { localStorage.removeItem('teambook_language_mode'); } catch {}
}

async function boot() {
  if (globalThis.__teambookV14Runtime) return;
  globalThis.__teambookV14Runtime = true;
  clearRetiredLanguageState();
  installInFlightGetDedupe();

  /* One small brand module is shared by TeamBook pages. Everything else is
     route-scoped below. */
  await importOnce('./header-brand-th.js');

  if (PATH === '/') {
    await importMany([
      './v13-public-first.js',
      './home-create-capacity.js',
      './home-canonical-guard.js',
      './home-cover-v3.js',
      './home-daily-meta.js',
      './home-card-ratio-fix.js',
      './home-self-status.js',
      './home-carousel-desktop.js',
      './v12-home-active-only.js',
      './public-ui-v13-final.js',
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
