// Ambient film: a silent part of one ingredient scene, not a player. There are no controls, no
// duration badge and no status text. Each clip plays through once per
// visit and rests on its final frame; only the owning scene may rewind it, when the reader has truly
// left and comes back. Reduced motion, data saving, blocked autoplay and media errors all keep the
// still poster; nothing is requested for them. Narrow screens take the smaller file when one exists.
const instances = new WeakMap();
const completed = new WeakSet();
const inert = Object.freeze({setActive() {}, rewind() {}, dispose() {}});

export function initLabFilm(container = globalThis.document) {
  const section = container?.matches?.('[data-lab-film]')
    ? container : container?.querySelector?.('[data-lab-film]');
  if (!section) return null;
  const video = section.querySelector('[data-film-video]');
  if (!video || typeof video.play !== 'function') return null;
  if (section.dataset?.filmReady !== 'true') {
    // A planned film stays a still image until an actual approved file is ready.
    instances.get(section)?.dispose();
    video.removeAttribute('src');
    video.hidden = true;
    video.controls = false;
    return inert;
  }
  if (instances.has(section)) return instances.get(section);

  const doc = section.ownerDocument;
  const win = doc?.defaultView;
  if (!doc || !win) return null;
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const connection = win.navigator?.connection;
  // The video may be hidden while the poster is showing. Measuring it would deadlock loading:
  // attach() waits for visibility, but the video only gets a box after attach().
  const visibilityTarget = section.querySelector('[data-film-frame]') || section;
  const removeListeners = [];
  let active = false;
  let inView = false;
  let disposed = false;
  let blocked = false;
  let failed = false;
  let ended = completed.has(video);
  let pending = false;
  let attached = false;
  let requestId = 0;
  let observer;

  function listen(target, event, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(event, handler, options);
    removeListeners.push(() => target.removeEventListener(event, handler, options));
  }
  function allowed() {
    return !disposed && active && inView && !doc.hidden && !failed && !ended && !blocked
      && !reduced?.matches && !connection?.saveData;
  }
  function present() {
    const still = !attached || blocked || failed || reduced?.matches || connection?.saveData;
    video.hidden = Boolean(still);
    section.classList.toggle('is-still', Boolean(still));
    section.classList.toggle('is-ended', ended);
  }
  function detach() {
    const hadSource = Boolean(video.getAttribute('src'));
    video.removeAttribute('src');
    attached = false;
    // Abort an in-flight download/decode when this controller gives up ownership.
    if (hadSource) video.load();
  }
  function stop() {
    requestId += 1;
    pending = false;
    if (!video.paused) video.pause();
    section.classList.toggle('is-playing', false);
  }
  function attach() {
    // The source is attached on the first permitted pass, so still-only readers never request it.
    if (!attached) {
      attached = true;
      const small = video.dataset.srcSmall && win.matchMedia?.('(max-width: 900px)')?.matches;
      const src = small ? video.dataset.srcSmall : video.dataset.src;
      if (src) video.setAttribute('src', src);
    }
    present();
  }
  function mediaError() {
    if (disposed) return;
    failed = true;
    stop();
    detach();
    section.classList.add('is-error');
    present();
  }
  function reconcile() {
    // An observer delivery may already be queued when dispose() disconnects it. It must not pause
    // a newer controller that now owns the same video element.
    if (disposed) return;
    if (!allowed()) {
      if (!video.paused || pending) stop();
      present();
      return;
    }
    if (pending || !video.paused) return;
    attach();
    const id = ++requestId;
    pending = true;
    let result;
    try {
      result = video.play();
    } catch (error) {
      result = Promise.reject(error);
    }
    Promise.resolve(result).then(() => {
      if (instances.get(section) !== api) return;
      if (id !== requestId) {
        // A late play resolution must not restart a film that has since left its scene.
        if (!allowed()) video.pause();
        return;
      }
      pending = false;
      if (!allowed()) stop();
      else section.classList.toggle('is-playing', true);
    }).catch(error => {
      if (id !== requestId || disposed) return;
      pending = false;
      if (error?.name === 'AbortError') return;
      if (error?.name === 'NotAllowedError') {
        // Without controls there is nothing to ask for: settle quietly on the poster.
        blocked = true;
        stop();
        detach();
        present();
        return;
      }
      mediaError();
    });
  }
  function finished() {
    if (disposed) return;
    // Rest on the final frame. Returning to the scene never starts another pass by itself.
    ended = true;
    completed.add(video);
    stop();
    present();
  }
  function setVisibility(visible) {
    inView = visible;
    reconcile();
  }
  function measureVisibility() {
    const rect = visibilityTarget.getBoundingClientRect();
    const height = win.innerHeight || doc.documentElement?.clientHeight || 0;
    const width = win.innerWidth || doc.documentElement?.clientWidth || 0;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
    const visibleWidth = Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));
    setVisibility(rect.width > 0 && rect.height > 0 && visibleHeight * visibleWidth / (rect.width * rect.height) >= .25);
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = false;
  video.removeAttribute?.('loop');
  video.controls = false;
  video.preload = 'none';
  video.setAttribute?.('aria-hidden', 'true');
  video.tabIndex = -1;
  section.classList.remove('is-error', 'is-playing', 'is-ended', 'is-still');
  section.classList.add('is-film-ready');
  present();
  listen(video, 'playing', () => { if (!allowed()) stop(); });
  listen(video, 'pause', () => section.classList.remove('is-playing'));
  listen(video, 'ended', finished);
  listen(video, 'error', mediaError);
  listen(doc, 'visibilitychange', reconcile);
  listen(win, 'pagehide', stop);
  listen(win, 'pageshow', measureVisibility);
  listen(connection, 'change', reconcile);
  if (reduced?.addEventListener) listen(reduced, 'change', reconcile);
  else if (reduced?.addListener) {
    reduced.addListener(reconcile);
    removeListeners.push(() => reduced.removeListener(reconcile));
  }
  if (typeof win.IntersectionObserver === 'function') {
    observer = new win.IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === visibilityTarget);
      if (entry) setVisibility(entry.isIntersecting && entry.intersectionRatio >= .25);
    }, {threshold: [0, .25]});
    observer.observe(visibilityTarget);
  } else {
    listen(win, 'scroll', measureVisibility, {passive: true});
    listen(win, 'resize', measureVisibility, {passive: true});
  }

  const api = {
    // The owning scene says when this ingredient beat is on screen; hidden beats never play.
    setActive(value) {
      if (disposed) return;
      active = Boolean(value);
      if (active && !observer) measureVisibility();
      reconcile();
    },
    // A genuine new visit to the scene: start the pass again from its first frame.
    rewind() {
      if (disposed || (!ended && !attached)) return;
      stop();
      ended = false;
      completed.delete(video);
      if (attached) {
        try { video.currentTime = 0; } catch { /* not seekable yet: it starts from 0 anyway */ }
      }
      present();
      reconcile();
    },
    get state() { return {active, inView, ended, blocked, failed, attached}; },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      observer?.disconnect();
      removeListeners.forEach(remove => remove());
      detach();
      video.hidden = true;
      section.classList.remove('is-film-ready', 'is-playing', 'is-ended', 'is-still', 'is-error');
      instances.delete(section);
    },
  };
  instances.set(section, api);
  measureVisibility();
  return api;
}
