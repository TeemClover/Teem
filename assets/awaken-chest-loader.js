/* myClover · AWAKEN chest lazy loader
   The Terminal gate must never depend on the Loot/chest system. Load the
   chest shortly after Chapter 7 opens, before the reader starts scrolling. */
(function () {
  'use strict';
  if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  let loaded = false;
  let timer = 0;

  function loadChest() {
    if (loaded) return;
    loaded = true;
    import('/assets/awaken-chest-object-v5.js?v=20260809-2').catch(error => {
      loaded = false;
      console.error('[AWAKEN] Chest failed to load without blocking the chapter.', error);
    });
  }

  function scheduleIfChapterOpen() {
    const chapter = document.getElementById('chapter');
    if (!chapter || chapter.hidden || loaded || timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      loadChest();
    }, 240);
  }

  function boot() {
    const chapter = document.getElementById('chapter');
    const enter = document.getElementById('enter');
    if (!chapter) return;
    enter?.addEventListener('click', scheduleIfChapterOpen);
    new MutationObserver(scheduleIfChapterOpen).observe(chapter, {
      attributes: true,
      attributeFilter: ['hidden'],
    });
    scheduleIfChapterOpen();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
