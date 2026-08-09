/* myClover · AWAKEN chapter lightweight loader
   - Chapter 7 is a normal continuous page: no XP progress bar / phase dots / phase-scroll UI.
   - Keep the original #end sentinel untouched so chapter completion / AWAKEN still works.
   - Load the chest shortly after Chapter 7 opens, before the reader reaches the ending.
*/
(function () {
  'use strict';
  if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  let loaded = false;
  let timer = 0;

  function simplifyChapterScroll() {
    if (document.documentElement.dataset.awakenSimpleScroll === '1') return;
    document.documentElement.dataset.awakenSimpleScroll = '1';

    /* The inline legacy script still owns chapter completion. Detach only its
       decorative scroll-progress targets; references remain harmless off-DOM. */
    document.getElementById('xp')?.remove();
    document.getElementById('dots')?.remove();

    /* PHASE CLEAR markers existed only to be lit while scrolling. Remove them
       from the reading flow, but keep #end so reaching the bottom still finishes. */
    document.querySelectorAll('[data-clear]').forEach(marker => marker.remove());

    const style = document.createElement('style');
    style.id = 'awaken-simple-scroll-style';
    style.textContent = `
      #chapter .phase{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        transform:none!important;
        max-height:none!important;
        overflow:visible!important;
      }
      #xp,#dots,[data-clear]{display:none!important}
    `;
    document.head.append(style);
  }

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

    simplifyChapterScroll();
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
