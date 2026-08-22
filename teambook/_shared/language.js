import './activity-ux.js';

/* Compatibility bootstrap only.
   TeamBook's old DOM translation layer was retired on 2026-08-22.
   Canonical notebook language now lives directly in page/source copy. */

function boot() {
  document.getElementById('xtyLanguageCard')?.remove();
  document.getElementById('xtyLanguageChoice')?.remove();

  /* TeamBook V1.2 gameplay is route-aware and leaves current cosmetic
     components in place. */
  import('./v12-gameplay.js?v=20260822-v12d')
    .catch(error => console.warn('TeamBook V1.2 gameplay layer unavailable', error));

  if (/^\/$/.test(location.pathname)) {
    import('./v12-home-active-only.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook active Home filter unavailable', error));
  }

  if (/^\/new(?:\/|$)/.test(location.pathname)) {
    import('./v12-new-reuse.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook reusable card picker unavailable', error));
  }

  if (/^\/collection(?:\/|$)/.test(location.pathname)) {
    import('./v12-collection-reuse.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook reusable Collection actions unavailable', error));
  }

  /* Keep the party card/Seen interaction that previously piggybacked on the
     language module. This is product UI behavior, not language translation. */
  if (/^\/p(?:\/|$)/.test(location.pathname)) {
    import('./party-teambook-cards.js')
      .catch(error => console.warn('TeamBook party card layer unavailable', error));
    import('./v12-party-query.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook companion intent unavailable', error));
    import('./v12-ending-image-auth.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook Ending image auth unavailable', error));
    import('./level-up-growth.js?v=20260822-growth1')
      .catch(error => console.warn('TeamBook growth celebration unavailable', error));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
