// Load the film behind its matching poster; scrolling never waits for the network.
export function createOpening({ video, layer, isReading }) {
  const state = { loaded: false, ready: false, failed: false, target: 0, seeking: false, warming: 0, released: false, bytes: 0, total: 0 };
  let controller, objectURL, deadline, lastSeek = 0, generation = 0;
  const poster = layer.querySelector('img');
  const mobileMedia = matchMedia('(max-width: 820px), (pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 520 || navigator.connection?.saveData;
  function fail() {
    state.failed = true; state.ready = false; state.seeking = false;
    video.hidden = true; clearTimeout(deadline);
  }
  function markReady() {
    state.ready = true; state.warming = 0; state.seeking = false;
    clearTimeout(deadline); seek();
  }
  function seek() {
    if (!state.ready || !Number.isFinite(video.duration) || video.duration <= 0 || video.seeking || state.seeking || isReading()) return;
    const t = Math.min(state.target, Math.max(0, video.duration - .045));
    if (Math.abs(video.currentTime - t) < 1 / 30) return;
    const now = performance.now();
    if (now - lastSeek < 32) return;
    lastSeek = now; state.seeking = true;
    try { video.currentTime = t; } catch { fail(); }
  }
  async function preload() {
    if (state.loaded || isReading()) return;
    state.loaded = true; state.failed = false; state.bytes = 0; state.total = 0;
    video.hidden = false;
    const currentGeneration = ++generation;
    controller = new AbortController();
    deadline = setTimeout(() => { controller.abort(); fail(); }, 30000);
    try {
      const response = await fetch(mobileMedia ? 'assets/meal-zoom-mobile-v5.mp4' : 'assets/meal-zoom-v3.mp4', { signal: controller.signal });
      if (currentGeneration !== generation) return;
      if (!response.ok) throw new Error('Opening film unavailable');
      state.total = Number(response.headers.get('content-length')) || 0;
      let blob;
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (currentGeneration !== generation) return;
          if (done) break;
          chunks.push(value); state.bytes += value.byteLength;
        }
        blob = new Blob(chunks, { type: 'video/mp4' });
      } else { blob = await response.blob(); state.bytes = blob.size; }
      if (state.failed || currentGeneration !== generation) return;
      state.total = state.bytes;
      objectURL = URL.createObjectURL(blob);
      video.src = objectURL; video.preload = 'auto'; video.load();
    } catch { if (currentGeneration === generation) fail(); }
  }
  function warmDecoder() {
    if (state.failed || state.released || state.ready || state.warming || video.readyState < 2 || !Number.isFinite(video.duration) || video.duration <= 0) return;
    // Warm the decoder before replacing the poster.
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
  // Some mobile browsers unlock media only during a real touch.
  function unlock() {
    if (isReading() || !state.ready) return;
    const playback = video.play();
    if (playback?.then) playback.then(() => { video.pause(); removeEventListener('pointerdown', unlock); }).catch(() => video.pause());
  }
  addEventListener('pointerdown', unlock, { passive: true });
  return {
    state,
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
      if ((T > 2.15 || isReading()) && state.loaded && !state.released) {
        generation++; controller?.abort(); clearTimeout(deadline);
        state.ready = false; state.released = !!objectURL; state.loaded = !!objectURL; state.seeking = false; state.warming = 0;
        video.pause(); video.removeAttribute('src'); video.load();
      }
      video.style.opacity = state.ready ? '1' : '0';
      if (!state.ready) {
        const src = T < 1.1 ? 'assets/meal-zoom-v3.jpg' : 'assets/meal-particles-v3.jpg';
        if (poster.getAttribute('src') !== src) poster.src = src;
      }
      state.target = Math.max(0, Math.min(1, (T - .13) / 1.47)) * Math.max(0, (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6) - .045);
      if (visible) seek();
      if (isReading() && !video.paused) video.pause();
    },
  };
}
