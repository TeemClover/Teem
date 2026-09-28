// The film is independent of the scroll-driven scene; pending media stays a still image.
// The approved clip is not a seamless loop: it plays once per visit, then waits for an explicit replay.
const instances = new WeakMap();
const inert = Object.freeze({ play() {}, pause() {}, dispose() {} });

export function initLabFilm(container = globalThis.document) {
  const section = container?.matches?.('[data-lab-film]')
    ? container : container?.querySelector?.('[data-lab-film]');
  if (!section) return null;
  const video = section.querySelector('[data-film-video]');
  const button = section.querySelector('[data-film-toggle]');
  if (!video || !button || typeof video.play !== 'function') return null;
  const duration = section.querySelector('[data-film-duration]');
  if (section.dataset?.filmReady !== 'true') {
    // A planned film is a still-image chapter until an actual approved file is ready.
    instances.get(section)?.dispose();
    video.removeAttribute('src');
    video.hidden = true;
    video.controls = false;
    button.hidden = true;
    if (duration) duration.hidden = true;
    return inert;
  }
  if (instances.has(section)) return instances.get(section);

  const doc = section.ownerDocument;
  const win = doc?.defaultView;
  if (!doc || !win) return null;
  const label = button.querySelector('[data-film-label]');
  const icon = button.querySelector('[data-film-icon]');
  const status = section.querySelector('[data-film-status]');
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const connection = win.navigator?.connection;
  const originalControls = video.controls;
  const removeListeners = [];
  let inView = false;
  let disposed = false;
  let userPaused = false;
  let manualRequested = false;
  let autoplayBlocked = false;
  let failed = false;
  let ended = false;
  let pending = false;
  let requestId = 0;
  let observer;

  function listen(target, event, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(event, handler, options);
    removeListeners.push(() => target.removeEventListener(event, handler, options));
  }
  function say(message = '') {
    if (status) status.textContent = message;
  }
  function updateButton() {
    const playing = !video.paused || pending;
    if (label) label.textContent = failed ? 'ลองเล่นอีกครั้ง' : playing ? 'หยุดวิดีโอ' : ended ? 'เล่นอีกครั้ง' : 'เล่นวิดีโอ';
    if (icon) icon.textContent = playing ? 'Ⅱ' : ended ? '↺' : '▶';
    button.setAttribute('aria-label', failed ? 'ลองเล่นวิดีโอจำลองแล็บอีกครั้ง'
      : playing ? 'หยุดวิดีโอจำลองแล็บ' : ended ? 'เล่นวิดีโอจำลองแล็บอีกครั้ง' : 'เล่นวิดีโอจำลองแล็บ');
    section.classList.toggle('is-playing', playing);
    section.classList.toggle('is-ended', ended && !playing);
  }
  function allowed() {
    return !disposed && inView && !doc.hidden && !failed &&
      (manualRequested || (!ended && !reduced?.matches && !connection?.saveData && !userPaused && !autoplayBlocked));
  }
  function stop(clearManual = true) {
    requestId += 1;
    pending = false;
    if (clearManual) manualRequested = false;
    video.pause();
    updateButton();
  }
  function finished() {
    if (disposed) return;
    // Rest on the final frame. Re-entering the viewport never starts another pass by itself.
    ended = true;
    stop();
  }
  function mediaError() {
    if (disposed) return;
    failed = true;
    stop();
    section.classList.add('is-error');
    say('ยังเล่นวิดีโอไม่ได้ ดูภาพและคำอธิบายด้านล่างได้');
    updateButton();
  }
  function reconcile() {
    if (!allowed()) {
      if (!video.paused || pending) stop();
      return;
    }
    if (pending || !video.paused) return;
    const id = ++requestId;
    pending = true;
    updateButton();
    let result;
    try {
      result = video.play();
    } catch (error) {
      result = Promise.reject(error);
    }
    Promise.resolve(result).then(() => {
      if (instances.get(section) !== api) return;
      if (id !== requestId) {
        // A late play resolution must not restart a film that has left the viewport.
        if (!allowed()) video.pause();
        return;
      }
      pending = false;
      if (!allowed()) stop();
      else { say(); updateButton(); }
    }).catch(error => {
      if (id !== requestId || disposed) return;
      pending = false;
      manualRequested = false;
      if (error?.name === 'AbortError') { updateButton(); return; }
      if (error?.name === 'NotAllowedError') {
        autoplayBlocked = true;
        say('กดเล่นเพื่อชมวิดีโอ');
        updateButton();
        return;
      }
      mediaError();
    });
  }
  function setVisibility(visible) {
    inView = visible;
    if (!visible) stop();
    else reconcile();
  }
  function measureVisibility() {
    const rect = video.getBoundingClientRect();
    const height = win.innerHeight || doc.documentElement?.clientHeight || 0;
    const width = win.innerWidth || doc.documentElement?.clientWidth || 0;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
    const visibleWidth = Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));
    setVisibility(rect.width > 0 && rect.height > 0 && visibleHeight * visibleWidth / (rect.width * rect.height) >= .25);
  }
  function playManually() {
    if (disposed) return;
    // Explicit play remains available with reduced motion and data saving enabled.
    measureVisibility();
    manualRequested = true;
    userPaused = false;
    autoplayBlocked = false;
    if (ended) {
      ended = false;
      try { video.currentTime = 0; } catch { /* The next play() restarts an ended clip anyway. */ }
    }
    if (failed) {
      failed = false;
      section.classList.remove('is-error');
      video.load();
    }
    say();
    reconcile();
  }
  function pauseManually() {
    userPaused = true;
    stop();
  }
  function preferenceChanged() {
    // A new accessibility/data preference takes effect even during existing playback.
    stop();
    reconcile();
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = false;
  video.removeAttribute?.('loop');
  video.preload = 'none';
  video.controls = false;
  video.hidden = false;
  if (video.dataset.src) video.setAttribute('src', video.dataset.src);
  button.hidden = false;
  if (duration) duration.hidden = false;
  section.classList.add('is-film-ready');
  listen(button, 'click', () => (!video.paused || pending) ? pauseManually() : playManually());
  listen(video, 'playing', () => { if (!allowed()) stop(); else updateButton(); });
  listen(video, 'pause', updateButton);
  listen(video, 'ended', finished);
  listen(video, 'error', mediaError);
  listen(doc, 'visibilitychange', () => { if (doc.hidden) stop(); else reconcile(); });
  listen(win, 'pagehide', () => stop());
  listen(win, 'pageshow', measureVisibility);
  listen(connection, 'change', preferenceChanged);
  if (reduced?.addEventListener) listen(reduced, 'change', preferenceChanged);
  else if (reduced?.addListener) {
    reduced.addListener(preferenceChanged);
    removeListeners.push(() => reduced.removeListener(preferenceChanged));
  }
  if (typeof win.IntersectionObserver === 'function') {
    observer = new win.IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === video);
      if (entry) setVisibility(entry.isIntersecting && entry.intersectionRatio >= .25);
    }, { threshold: [0, .25] });
    observer.observe(video);
  } else {
    listen(win, 'scroll', measureVisibility, { passive: true });
    listen(win, 'resize', measureVisibility, { passive: true });
  }

  const api = {
    play: playManually,
    pause: pauseManually,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      observer?.disconnect();
      removeListeners.forEach(remove => remove());
      video.controls = originalControls;
      button.hidden = true;
      if (duration) duration.hidden = true;
      section.classList.remove('is-film-ready', 'is-playing', 'is-ended');
      instances.delete(section);
    },
  };
  instances.set(section, api);
  updateButton();
  measureVisibility();
  return api;
}
