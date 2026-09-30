// The invitation is readable while the complete seekable film warms up.
// Neither a slow connection nor a failed decoder can lock the reader in.
export function createOpening({ root, video, layer, isReading, enterStory }) {
  const invite = document.querySelector('#invitation');
  const enter = document.querySelector('#arrivalEnter');
  const read = document.querySelector('#arrivalRead');
  const status = document.querySelector('#arrivalStatus');
  const meter = document.querySelector('#arrivalMeter');
  const background = [...document.querySelectorAll('.bar, .rail, #story, .skip')];
  const state = { loaded: false, ready: false, failed: false, target: 0, seeking: false, warming: 0, released: false, slow: false, open: false, bytes: 0, total: 0 };
  let controller, objectURL, deadline, slowTimer, lastStatus = '', lastSeek = 0, generation = 0;
  const poster = layer.querySelector('img');
  const mobileMedia = matchMedia('(max-width: 820px), (pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 520 || navigator.connection?.saveData;
  function report() {
    const reading = isReading();
    const pct = state.total ? Math.min(99, Math.floor(state.bytes / state.total * 100)) : null;
    const message = reading ? 'พร้อมอ่าน · ภาพนิ่งและเรื่องราวครบทุกตอน'
      : state.ready ? 'ภาพพร้อมแล้ว · ค่อย ๆ เลื่อนเพื่อเดินทาง'
      : state.failed ? 'วิดีโอยังไม่พร้อม · สำรวจด้วยภาพนิ่งและอ่านต่อได้ครบ'
      : state.slow ? 'ภาพกำลังมา · เริ่มด้วยภาพนิ่งก่อนได้ ไม่ต้องรอ'
      : state.bytes && state.bytes >= state.total && state.total ? 'กำลังเตรียมภาพให้เลื่อนได้ลื่นไหล'
      : `ระหว่างที่คุณอ่าน เรากำลังเตรียมภาพการเดินทาง${pct !== null ? ' · ' + pct + '%' : ''}`;
    // Announce only meaningful state changes, not every downloaded chunk.
    if (message !== lastStatus) { status.textContent = message; lastStatus = message; }
    const available = reading || state.ready || state.failed || state.slow;
    enter.setAttribute('aria-disabled', available ? 'false' : 'true');
    enter.textContent = reading ? 'เข้าไปอ่านกัน ↗' : state.ready ? 'เข้าไปสำรวจกัน ↗' : available ? 'เริ่มสำรวจด้วยภาพนิ่ง ↗' : 'กำลังเตรียมการเดินทาง…';
    meter.hidden = reading || state.failed;
    meter.style.setProperty('--loaded', state.ready ? '1' : String(state.total ? state.bytes / state.total : .03));
  }
  function fail() {
    state.failed = true; state.ready = false; state.seeking = false;
    video.hidden = true; clearTimeout(deadline); clearTimeout(slowTimer); report();
  }
  function markReady() {
    state.ready = true; state.warming = 0; state.seeking = false;
    clearTimeout(deadline); clearTimeout(slowTimer); report(); seek();
  }
  function seek() {
    if (!state.ready || !Number.isFinite(video.duration) || video.duration <= 0 || video.seeking || state.seeking || isReading()) return;
    const t = Math.min(state.target, Math.max(0, video.duration - .045));
    if (Math.abs(video.currentTime - t) < 1 / 30) return;
    const now = performance.now();
    if (now - lastSeek < (mobileMedia ? 65 : 32)) return;
    lastSeek = now; state.seeking = true;
    try { video.currentTime = t; } catch { fail(); }
  }
  async function preload() {
    if (state.loaded || isReading()) return;
    state.loaded = true; state.failed = false; state.bytes = 0; state.total = 0;
    video.hidden = false;
    const currentGeneration = ++generation;
    controller = new AbortController();
    slowTimer = setTimeout(() => { state.slow = true; report(); }, 8000);
    deadline = setTimeout(() => { controller.abort(); fail(); }, 30000);
    try {
      const response = await fetch(mobileMedia ? 'assets/meal-zoom-mobile-v4.mp4' : 'assets/meal-zoom-v3.mp4', { signal: controller.signal });
      if (currentGeneration !== generation) return;
      if (!response.ok) throw new Error('Opening film unavailable');
      state.total = Number(response.headers.get('content-length')) || 0;
      let blob;
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks = [];
        let lastPct = -1;
        while (true) {
          const { done, value } = await reader.read();
          if (currentGeneration !== generation) return;
          if (done) break;
          chunks.push(value); state.bytes += value.byteLength;
          const pct = state.total ? Math.floor(state.bytes / state.total * 10) : 0;
          if (pct !== lastPct) { lastPct = pct; report(); }
        }
        blob = new Blob(chunks, { type: 'video/mp4' });
      } else { blob = await response.blob(); state.bytes = blob.size; }
      if (state.failed || currentGeneration !== generation) return;
      state.total = state.bytes; report();
      objectURL = URL.createObjectURL(blob);
      video.src = objectURL; video.preload = 'auto'; video.load();
    } catch { if (currentGeneration === generation) fail(); }
  }
  function warmDecoder() {
    if (state.failed || state.released || state.ready || state.warming || video.readyState < 2 || !Number.isFinite(video.duration) || video.duration <= 0) return;
    // Decode a non-zero frame and return to the beginning before enabling entry.
    state.warming = 1;
    try { video.currentTime = Math.min(.08, video.duration / 2); } catch { fail(); }
  }
  video.addEventListener('loadeddata', warmDecoder);
  video.addEventListener('durationchange', warmDecoder);
  video.addEventListener('seeked', () => {
    if (state.failed || state.released) return;
    if (state.warming === 1) { state.warming = 2; video.currentTime = 0; return; }
    if (state.warming === 2) { markReady(); return; }
    state.seeking = false; seek();
  });
  video.addEventListener('error', () => { if (state.loaded && !state.released) fail(); });
  function dismiss(reading = false) {
    if (!state.open) return;
    state.open = false; invite.classList.remove('is-open'); invite.hidden = true;
    root.classList.remove('arrival-open'); background.forEach(e => e.inert = false);
    invite.removeAttribute('aria-modal'); invite.removeAttribute('role');
    enterStory(reading);
    document.querySelector(reading ? '#h0' : '#story').focus({ preventScroll: true });
  }
  enter.addEventListener('click', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    if (enter.getAttribute('aria-disabled') === 'true') return;
    // A real user gesture unlocks video on mobile browsers; scrolling owns time.
    if ((state.ready || video.readyState >= 1) && !isReading()) {
      const playback = video.play();
      if (playback?.then) playback.then(() => video.pause()).catch(() => video.pause());
    }
    dismiss(isReading());
  });
  read.addEventListener('click', () => dismiss(true));
  invite.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dismiss(true); return; }
    if (e.key !== 'Tab') return;
    const first = enter, last = read;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === document.querySelector('#inviteTitle'))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return {
    state,
    start(show) {
      invite.hidden = !show;
      if (show) {
        state.open = true; root.classList.add('arrival-open'); invite.classList.add('is-open');
        invite.setAttribute('role', 'dialog'); invite.setAttribute('aria-modal', 'true');
        background.forEach(e => e.inert = true); read.hidden = false;
        document.querySelector('#inviteTitle').focus({ preventScroll: true });
      }
      report();
      if (show) preload();
    },
    update(T) {
      const visible = !isReading() && T < 1.98;
      const p = Math.max(0, Math.min(1, (T - 1.65) / .3));
      const opacity = visible ? 1 - p * p * (3 - 2 * p) : 0;
      layer.style.opacity = opacity.toFixed(3); layer.style.visibility = opacity > .002 ? 'visible' : 'hidden';
      if (visible && state.released && objectURL) {
        state.released = false; state.failed = false; video.hidden = false; video.src = objectURL; video.load();
        deadline = setTimeout(fail, 10000);
      }
      if (visible) preload();
      // Release the decoded frame surfaces once the introduction is out of view.
      // The small compressed blob stays available for a reverse scroll.
      if ((T > 2.15 || isReading()) && state.loaded && !state.released && !state.open) {
        generation++; controller?.abort(); clearTimeout(deadline); clearTimeout(slowTimer);
        state.ready = false; state.released = !!objectURL; state.loaded = !!objectURL; state.seeking = false; state.warming = 0;
        video.pause(); video.removeAttribute('src'); video.load();
      }
      video.style.opacity = state.ready ? '1' : '0';
      if (!state.ready) {
        const src = T < 1.1 ? 'assets/meal-zoom-v3.jpg' : 'assets/meal-particles-v3.jpg';
        if (poster.getAttribute('src') !== src) poster.src = src;
      }
      state.target = Math.max(0, Math.min(1, (T - .13) / 1.47)) * Math.max(0, (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6) - .045);
      if (visible && !state.open) seek();
      if (isReading() && !video.paused) video.pause();
    },
  };
}
