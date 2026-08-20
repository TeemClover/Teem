/* Home has one canonical renderer: home-cover-v3.
   The legacy renderer in xty/index.html still writes #mainParty during its
   normal home refresh. On Safari that write can remove the already-painted
   carousel for a frame before the canonical MutationObserver restores it,
   which looks like cached card art blinking or disappearing until refresh.

   Install this before home-cover-v3 and before the page's renderHome() keeps
   running. Empty writes are still allowed; only the obsolete .main-party
   markup is ignored. */

const host = document.getElementById('mainParty');
if (host && host.dataset.xtyCanonicalGuard !== '1') {
  host.dataset.xtyCanonicalGuard = '1';
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

  if (descriptor?.get && descriptor?.set) {
    Object.defineProperty(host, 'innerHTML', {
      configurable: true,
      enumerable: false,
      get() { return descriptor.get.call(this); },
      set(value) {
        const html = String(value ?? '');
        const isLegacyMainParty = /class=["'][^"']*\bmain-party\b[^"']*["']/.test(html)
          && !html.includes('xty-party-carousel');
        if (isLegacyMainParty) return;
        descriptor.set.call(this, html);
      },
    });
  }
}
