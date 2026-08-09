/* myClover · AWAKEN chapter loader
   - After the player enters Lv.7, every Phase is available immediately.
   - XP / phase dots remain decorative progress indicators only; they never gate content.
   - Keep the original #end sentinel untouched so chapter completion / AWAKEN still works.
   - Load the chest shortly after Chapter 7 opens.
*/
(function () {
  'use strict';
  if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  let loaded = false;
  let timer = 0;

  function ungateChapter() {
    if (document.documentElement.dataset.awakenUngated === '1') return;
    document.documentElement.dataset.awakenUngated = '1';

    const style = document.createElement('style');
    style.id = 'awaken-ungated-style';
    style.textContent = `
      /* Phase containers and their direct reading blocks are always present.
         Hidden attributes inside accordions / notebook choices still behave normally. */
      #chapter .phase{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        transform:none!important;
        translate:none!important;
        scale:1!important;
        max-height:none!important;
        overflow:visible!important;
        clip-path:none!important;
        filter:none!important;
      }
      #chapter .phase > *{
        visibility:visible!important;
        opacity:1!important;
        transform:none!important;
        translate:none!important;
        scale:1!important;
        clip-path:none!important;
        filter:none!important;
      }
      /* XP and phase dots are indicators only. */
      #xp,#dots{visibility:visible!important;opacity:1!important}
    `;
    document.head.append(style);

    const reveal = () => {
      const chapter = document.getElementById('chapter');
      if (!chapter || chapter.hidden) return;

      document.querySelectorAll('#chapter .phase').forEach(phase => {
        phase.hidden = false;
        phase.removeAttribute('aria-hidden');
      });

      const xp = document.getElementById('xp');
      const dots = document.getElementById('dots');
      if (xp) xp.hidden = false;
      if (dots) dots.hidden = false;
    };

    reveal();
    const chapter = document.getElementById('chapter');
    if (chapter) {
      new MutationObserver(reveal).observe(chapter, {
        attributes:true,
        childList:true,
        subtree:true,
        attributeFilter:['hidden','class','style','aria-hidden'],
      });
    }
    window.addEventListener('pageshow', reveal);
    window.addEventListener('focus', reveal);
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

    ungateChapter();
    const onOpen = () => {
      ungateChapter();
      scheduleIfChapterOpen();
    };
    enter?.addEventListener('click', () => queueMicrotask(onOpen));
    new MutationObserver(onOpen).observe(chapter, {
      attributes: true,
      attributeFilter: ['hidden'],
    });
    onOpen();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
