const box = document.getElementById('log');

if (box) install();

function install() {
  injectStyle();
  box.tabIndex = 0;
  box.setAttribute('aria-label', 'Party Log — เลื่อนอ่านบันทึกได้อย่างอิสระ');

  const code = new URLSearchParams(location.search).get('c') || 'unknown';
  const readKey = `xty:party-log-read:v1:${code}`;
  let lastRenderedMax = -1;
  let rememberedScrollTop = 0;
  let forceBottomOnce = false;
  let suppressReadUntil = 0;
  let queued = false;
  let forceTimer = null;

  function readMarker() {
    try {
      const value = Number(localStorage.getItem(readKey));
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }

  function writeMarker(seq) {
    if (!Number.isFinite(seq) || seq < 0) return;
    try {
      const current = readMarker();
      if (current !== null && current >= seq) return;
      localStorage.setItem(readKey, String(seq));
    } catch {
      // Storage can be unavailable in some in-app/private browsers.
    }
  }

  function posts() {
    return [...box.querySelectorAll('.post')]
      .map(el => {
        const seq = Number(el.querySelector('.rx[data-seq]')?.dataset.seq);
        return Number.isFinite(seq) ? { el, seq } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.seq - b.seq);
  }

  function topInsideBox(el) {
    const outer = box.getBoundingClientRect();
    const inner = el.getBoundingClientRect();
    return Math.max(0, box.scrollTop + inner.top - outer.top);
  }

  function scrollToBottom(maxSeq, markRead = false) {
    suppressReadUntil = performance.now() + 220;
    box.scrollTop = box.scrollHeight;
    rememberedScrollTop = box.scrollTop;
    if (markRead) writeMarker(maxSeq);
  }

  function positionAfterRender() {
    const list = posts();
    if (!list.length) {
      lastRenderedMax = -1;
      rememberedScrollTop = 0;
      return;
    }

    const maxSeq = list[list.length - 1].seq;

    /* Same log, e.g. a reaction/retract repaint: keep the reader exactly
       where they were instead of kicking them to the bottom. */
    if (maxSeq === lastRenderedMax) {
      box.scrollTop = Math.min(rememberedScrollTop, Math.max(0, box.scrollHeight - box.clientHeight));
      return;
    }

    const saved = readMarker();

    /* First install on an existing party has no historical read marker.
       Treat the current snapshot as already-read migration state, so people
       are not dumped at Day 1 just because this feature shipped today. */
    if (saved === null) {
      lastRenderedMax = maxSeq;
      scrollToBottom(maxSeq, true);
      return;
    }

    if (forceBottomOnce) {
      forceBottomOnce = false;
      if (forceTimer) clearTimeout(forceTimer);
      forceTimer = null;
      lastRenderedMax = maxSeq;
      scrollToBottom(maxSeq, true);
      return;
    }

    const firstUnread = list.find(item => item.seq > saved);
    lastRenderedMax = maxSeq;

    if (firstUnread) {
      /* Canon: the FIRST unread item sits at the top edge of the log, so the
         reader can continue downward in order without hunting for the gap. */
      suppressReadUntil = performance.now() + 260;
      box.scrollTop = topInsideBox(firstUnread.el);
      rememberedScrollTop = box.scrollTop;
      firstUnread.el.dataset.unreadStart = 'true';
    } else {
      /* Everything is already read: open at the newest message. */
      scrollToBottom(maxSeq, false);
    }
  }

  function queuePosition() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      positionAfterRender();
    });
  }

  function markVisibleRead() {
    if (performance.now() < suppressReadUntil) return;
    const list = posts();
    if (!list.length) return;
    const bounds = box.getBoundingClientRect();
    let highest = readMarker() ?? -1;

    for (const item of list) {
      const rect = item.el.getBoundingClientRect();
      /* Once a post has crossed into the reading viewport, everything before
         it is necessarily part of the path the user has scrolled through. */
      if (rect.top < bounds.bottom - 18) highest = Math.max(highest, item.seq);
      else break;
    }

    writeMarker(highest);
  }

  function armOwnPostBottom() {
    forceBottomOnce = true;
    if (forceTimer) clearTimeout(forceTimer);
    forceTimer = setTimeout(() => { forceBottomOnce = false; forceTimer = null; }, 10000);
  }

  const observer = new MutationObserver(queuePosition);
  observer.observe(box, { childList: true, subtree: true });

  box.addEventListener('scroll', () => {
    rememberedScrollTop = box.scrollTop;
    markVisibleRead();
  }, { passive: true });
  box.addEventListener('click', markVisibleRead, true);
  box.addEventListener('wheel', markVisibleRead, { passive: true });
  box.addEventListener('touchend', markVisibleRead, { passive: true });
  box.addEventListener('keyup', markVisibleRead);

  /* A message/commit the reader just authored is already read. After the
     async repaint, keep them at the newest post instead of treating their own
     line as an unread interruption. */
  document.getElementById('send')?.addEventListener('click', armOwnPostBottom, true);
  document.getElementById('commitDo')?.addEventListener('click', armOwnPostBottom, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') markVisibleRead();
  });

  queuePosition();
}

function injectStyle() {
  if (document.getElementById('xty-party-log-viewport-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-party-log-viewport-style';
  style.textContent = `
    #log{
      height:min(68dvh,680px);
      min-height:320px;
      overflow-y:auto!important;
      overflow-x:hidden;
      overscroll-behavior-y:auto;
      -webkit-overflow-scrolling:touch;
      touch-action:pan-y;
      scroll-behavior:auto!important;
      overflow-anchor:none;
      scrollbar-gutter:stable;
      padding-right:4px;
      border-top:1px solid rgba(62,51,44,.08);
      border-bottom:1px solid rgba(62,51,44,.08);
    }
    #log:focus-visible{outline:3px solid rgba(50,139,92,.18);outline-offset:3px}
    @media (max-height:650px){#log{height:62dvh;min-height:260px}}
    @media (min-width:760px){#log{height:min(62vh,620px)}}
  `;
  document.head.appendChild(style);
}
