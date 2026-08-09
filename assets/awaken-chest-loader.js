/* myClover · AWAKEN chest lazy loader
   The Terminal gate must never depend on the Loot/chest system. Load the
   chest only when the reader approaches the end of Chapter 7. */
(function () {
  'use strict';
  if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  let loaded = false;
  let observer = null;

  function loadChest() {
    if (loaded) return;
    loaded = true;
    if (observer) observer.disconnect();
    import('/assets/awaken-chest-object-v5.js?v=20260809-2').catch(error => {
      loaded = false;
      console.error('[AWAKEN] Chest failed to load without blocking the chapter.', error);
    });
  }

  function boot() {
    const tail = document.querySelector('#chapter .tail');
    if (!tail) return;
    if (!('IntersectionObserver' in window)) {
      const check = () => {
        if (tail.getBoundingClientRect().top < innerHeight + 900) {
          removeEventListener('scroll', check);
          loadChest();
        }
      };
      addEventListener('scroll', check, { passive: true });
      check();
      return;
    }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadChest();
    }, { rootMargin: '900px 0px' });
    observer.observe(tail);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
