/* Compatibility bootstrap only.
   The old XTY → TeamBook DOM translation layer was retired on 2026-08-22.
   Canonical notebook language now lives directly in page/source copy. */

function boot() {
  document.getElementById('xtyLanguageCard')?.remove();
  document.getElementById('xtyLanguageChoice')?.remove();

  /* Keep the party card/Seen interaction that used to piggyback on the
     language module. This is product UI behavior, not language translation. */
  if (/^\/xty\/p(?:\/|$)/.test(location.pathname)) {
    import('./party-teambook-cards.js')
      .catch(error => console.warn('XTY party card layer unavailable', error));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
