/* Deterministic sketch films. The playhead owns every drawing, action and sound. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root?.querySelector(selector);
  const $$ = (selector, root = document) => root ? [...root.querySelectorAll(selector)] : [];
  const dialog = $('#house-film-dialog');
  const copyNode = $('#house-experiences-copy');
  if (!dialog || !copyNode) return;
  let copy;
  try { copy = JSON.parse(copyNode.textContent); } catch { return; }
  const ns = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = $('#hx-film-toggle', dialog);
  const seek = $('#hx-film-seek', dialog);
  const time = $('#hx-film-time', dialog);
  const sound = $('#hx-film-sound', dialog);
  const soundLabel = $('[data-film-sound-label]', sound);
  const volume = $('#hx-film-volume', dialog);
  const status = $('#hx-film-status', dialog);
  if (!toggle || !seek || !time || !sound) return;
  const state = { story: null, duration: 28, elapsed: 0, started: 0, running: false, sound: false, trigger: null };
  let frame = 0, seeking = false, resumeAfterSeek = false, lastCaption = null;
  let audio = null, master = null, audioGeneration = 0;
  const prepared = new WeakMap();
  const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
  const smooth = (n) => { const p = clamp(n); return p * p * (3 - 2 * p); };
  const now = () => performance.now();
  const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const elapsed = () => clamp(state.elapsed + (state.running ? (now() - state.started) / 1000 : 0), 0, state.duration);
  const numbers = (value) => String(value || '').split(',').map(Number);
  const svg = (name, attributes = {}) => {
    const node = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  function sampleTrack(keys, t) {
    if (!keys.length) return [0, 0, 0, 1, 1];
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i += 1) {
      if (t > keys[i][0]) continue;
      const a = keys[i - 1], b = keys[i];
      const p = smooth((t - a[0]) / Math.max(.001, b[0] - a[0]));
      return a.slice(1).map((value, index) => value + (b[index + 1] - value) * p);
    }
    return keys.at(-1).slice(1);
  }
  function parseTrack(value) {
    return String(value || '').split(';').filter(Boolean).map((part) => {
      const row = numbers(part);
      return [row[0] || 0, row[1] || 0, row[2] || 0, row[3] || 0, row[4] ?? 1, row[5] ?? 1];
    });
  }
  function expandSymbols(layer) {
    $$('use', layer).forEach((use) => {
      const id = use.getAttribute('href')?.slice(1);
      const symbol = id && document.getElementById(id);
      if (!symbol) { use.remove(); return; }
      const box = String(symbol.getAttribute('viewBox') || '0 0 40 40').split(/\s+/).map(Number);
      const x = Number(use.getAttribute('x') || 0), y = Number(use.getAttribute('y') || 0);
      const width = Number(use.getAttribute('width') || 40), height = Number(use.getAttribute('height') || width);
      const wrap = svg('g', { transform: `translate(${x} ${y}) scale(${width / box[2]} ${height / box[3]})` });
      [...symbol.children].forEach((child) => wrap.append(child.cloneNode(true)));
      use.replaceWith(wrap);
    });
  }
  function prepare(story) {
    if (prepared.has(story)) return prepared.get(story);
    const scenes = $$('[data-film-scene]', story).map((scene, index) => {
      const paint = svg('g', { class: 'sf-paint' });
      while (scene.firstChild) paint.append(scene.firstChild);
      const sketch = paint.cloneNode(true);
      sketch.setAttribute('class', 'sf-sketch');
      expandSymbols(sketch);
      $$('[id]', sketch).forEach((node) => node.removeAttribute('id'));
      $$('text', sketch).forEach((node) => node.remove());
      $$('[data-draw]', sketch).forEach((node) => node.removeAttribute('data-draw'));
      const strokes = $$('path,rect,circle,ellipse,line,polyline,polygon', sketch).map((node, order) => {
        node.setAttribute('fill', 'none');
        node.setAttribute('stroke', '#6d7f59');
        node.setAttribute('stroke-width', '1.5');
        node.setAttribute('pathLength', '1');
        node.setAttribute('stroke-dasharray', '1');
        node.setAttribute('stroke-linecap', 'round');
        return { node, delay: .12 + (order % 13) * .073, length: 1.05 + order % 4 * .13 };
      });
      scene.append(sketch, paint);
      const movers = $$('[data-track],[data-float],[data-reveal],[data-draw],[data-steam],[data-orbit],[data-wave]', scene).map((node) => ({
        node,
        base: node.getAttribute('transform') || '',
        baseOpacity: Number(node.getAttribute('opacity') ?? 1),
        keys: node.dataset.track ? parseTrack(node.dataset.track) : null,
        drift: node.dataset.float ? numbers(node.dataset.float) : null,
        reveal: node.dataset.reveal ? numbers(node.dataset.reveal) : null,
        draw: node.dataset.draw ? numbers(node.dataset.draw) : null,
        steam: node.dataset.steam === undefined ? null : Number(node.dataset.steam),
        orbit: node.dataset.orbit === undefined ? null : Number(node.dataset.orbit),
        wave: node.dataset.wave === undefined ? null : Number(node.dataset.wave),
        origin: String(node.dataset.origin || '0 0').split(/\s+/).map(Number)
      }));
      const pencil = svg('g', { class: 'sf-pencil', 'aria-hidden': 'true' });
      pencil.append(svg('path', { d: 'M0 0L7 -18L34 -44L43 -35L16 -9Z', fill: '#b3915b', stroke: '#806d48', 'stroke-width': 1 }), svg('path', { d: 'M0 0L7 -18L16 -9Z', fill: '#eee3c2' }), svg('path', { d: 'M0 0L3 -8L7 -4Z', fill: '#526446' }));
      scene.append(pencil);
      return { node: scene, index, paint, sketch, strokes, movers, pencil };
    });
    const data = { scenes, captions: $$('[data-film-start]', story) };
    prepared.set(story, data);
    return data;
  }
  function animateMover(item, local, still) {
    let [x, y, rotation, scale, opacity] = item.keys ? sampleTrack(item.keys, still ? 5.8 : local) : [0, 0, 0, 1, 1];
    if (item.drift && !still) {
      const [a, b, speed, phase = 0] = item.drift;
      x += Math.sin(local * speed + phase) * a;
      y += Math.cos(local * speed * .79 + phase) * b;
    }
    if (item.reveal) opacity *= still ? 1 : smooth((local - item.reveal[0]) / (item.reveal[1] || 1));
    if (item.steam !== null && !still) {
      const phase = (local * .4 + item.steam) % 1;
      x += Math.sin(local * .9 + item.steam) * 5;
      y -= phase * 43;
      opacity *= Math.sin(phase * Math.PI) * .7;
    }
    if (item.orbit !== null && !still) {
      scale *= 1 + Math.sin(local * .63 + item.orbit * .25) * .045;
      item.origin = [480, 267];
    }
    if (item.wave !== null && !still) y += Math.sin(local * .8 + item.wave) * 5;
    if (item.draw) {
      item.node.setAttribute('stroke-dasharray', '1');
      item.node.setAttribute('stroke-dashoffset', String(still ? 0 : 1 - smooth((local - item.draw[0]) / item.draw[1])));
    }
    const [ox, oy] = item.origin;
    item.node.setAttribute('transform', `${item.base} translate(${x.toFixed(2)} ${y.toFixed(2)}) translate(${ox} ${oy}) rotate(${rotation.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${-ox} ${-oy})`);
    item.node.style.opacity = String(clamp(opacity * item.baseOpacity));
  }
  function drawScene(scene, local, final) {
    const still = reduced.matches;
    scene.node.removeAttribute('hidden');
    scene.node.style.opacity = String(still || final ? 1 : clamp((7 - local) / .27));
    const paintOpacity = still ? 1 : smooth((local - .75) / 1.65);
    scene.paint.style.opacity = String(paintOpacity);
    scene.sketch.style.opacity = String(still ? 0 : 1 - smooth((local - 2.45) / .8));
    scene.strokes.forEach(({ node, delay, length }) => node.setAttribute('stroke-dashoffset', String(1 - smooth((local - delay) / length))));
    scene.movers.forEach((item) => animateMover(item, local, still));
    scene.pencil.style.opacity = '0';
    if (!still && local > .2 && local < 2.6) {
      const active = scene.strokes.find(({ node, delay, length }) => node.tagName.toLowerCase() === 'path' && local > delay && local < delay + length && typeof node.getPointAtLength === 'function');
      if (active) {
        try {
          const length = active.node.getTotalLength();
          const point = active.node.getPointAtLength(length * smooth((local - active.delay) / active.length));
          if (scene.pencil.parentNode !== active.node.parentNode) active.node.parentNode.append(scene.pencil);
          scene.pencil.setAttribute('transform', `translate(${point.x} ${point.y}) scale(.62)`);
          scene.pencil.style.opacity = '.84';
        } catch { /* The drawing still works when geometry measurement is unavailable. */ }
      }
    }
  }
  function render() {
    if (!state.story) return;
    const position = elapsed(), data = prepare(state.story);
    const index = Math.min(data.scenes.length - 1, Math.floor(position / 7));
    data.scenes.forEach((scene, i) => {
      if (i !== index) { scene.node.setAttribute('hidden', ''); return; }
      drawScene(scene, Math.min(7, position - index * 7), position >= state.duration);
    });
    const caption = data.captions[index];
    if (caption !== lastCaption) {
      data.captions.forEach((node) => { node.hidden = node !== caption; });
      lastCaption = caption;
    }
    if (caption) {
      const progress = reduced.matches ? 1 : smooth((position % 7) / .8);
      caption.style.opacity = String(position >= state.duration ? 1 : .35 + progress * .65);
      caption.style.transform = reduced.matches ? 'none' : `translateY(${position >= state.duration ? 0 : (1 - progress) * 5}px)`;
    }
    if (!seeking) seek.value = String(position);
    const whole = Math.floor(position);
    const label = `${whole} ${copy.filmPosition} / ${state.duration}`;
    if (seek.getAttribute('aria-valuetext') !== label) seek.setAttribute('aria-valuetext', label);
    const clockLabel = `${clock(position)} / ${clock(state.duration)}`;
    if (time.textContent !== clockLabel) time.textContent = clockLabel;
    $$('.sf-scene-indicator i', dialog).forEach((node, i) => node.style.setProperty('--progress', String(clamp((position - i * 7) / 7))));
  }

  // Optional original music: soft pentatonic notes, pads and small action cues.
  // Every context is closed on pause, seek, end, close or hidden. Stale resumes
  // cannot reactivate audio or change the state of a newer request.
  function stopAudio() {
    audioGeneration += 1;
    const previous = audio;
    audio = null; master = null;
    if (previous) previous.close().catch(() => {});
  }
  function updateSoundButton(message) {
    sound.setAttribute('aria-pressed', String(state.sound));
    soundLabel.textContent = message || (state.sound ? copy.musicOn : copy.musicOff);
  }
  const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
  function addTone(context, destination, at, duration, midi, gain, type = 'sine', bend = false) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi), at);
    if (bend) oscillator.frequency.exponentialRampToValueAtTime(frequency(midi - 20), at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + Math.min(.025, duration * .12));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope); envelope.connect(destination);
    oscillator.start(at); oscillator.stop(at + duration + .025);
  }
  function scheduleScore(context, offset) {
    const start = context.currentTime + .035;
    const key = state.story.dataset.filmId;
    const melody = key === 'kitchen' ? [72, 76, 79, 76, 74, 79, 81, 79, 76, 74, 72, 67]
      : key === 'mindfulness' ? [67, 72, 74, 79, 74, 72, 69, 67]
        : [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 76, 74];
    const beat = key === 'mindfulness' ? 1.75 : .875;
    for (let n = 0; n * beat < state.duration; n += 1) {
      const at = n * beat + .2;
      if (at < offset || at >= state.duration) continue;
      const note = melody[n % melody.length];
      addTone(context, master, start + at - offset, key === 'mindfulness' ? 1.35 : .78, note, .095, 'sine');
      if (n % 4 === 0) addTone(context, master, start + at - offset + .07, 1.1, note - 12, .045, 'triangle');
    }
    [48, 53, 55, 48].forEach((root, scene) => {
      const begin = scene * 7, end = begin + 7;
      if (end <= offset) return;
      [root, root + 7, root + 12].forEach((midi) => {
        const at = start + Math.max(0, begin - offset);
        addTone(context, master, at, Math.max(.2, end - Math.max(begin, offset)), midi, .022, 'sine');
      });
    });
    const cues = key === 'kitchen' ? [1.1, 2.2, 3.3, 8.9, 9.3, 9.7, 10.1, 12.4, 15.8, 16.8, 17.8, 18.8, 23.5]
      : key === 'welcome' ? [1.8, 7.8, 14.8, 16.4, 18.2, 22.3, 24.4] : [2.1, 7.8, 14.5, 21.5];
    cues.forEach((cue, i) => {
      if (cue < offset) return;
      addTone(context, master, start + cue - offset, key === 'kitchen' ? .13 : .7, key === 'kitchen' ? 83 : 79 + i % 3 * 2, .035, 'sine', key === 'kitchen');
    });
  }
  async function startAudio() {
    stopAudio();
    if (!state.sound || !state.running || document.hidden) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { state.sound = false; updateSoundButton(copy.musicUnavailable); return; }
    const generation = audioGeneration;
    let context;
    try {
      context = new Audio();
      audio = context;
      await context.resume();
      if (generation !== audioGeneration || audio !== context || !state.running || !state.sound || document.hidden) return;
      master = context.createGain();
      master.gain.value = Number(volume?.value || 0) / 100 * .55;
      master.connect(context.destination);
      scheduleScore(context, elapsed());
    } catch {
      if (generation !== audioGeneration || (context && audio !== context)) return;
      stopAudio(); state.sound = false; updateSoundButton(copy.musicUnavailable);
    }
  }
  sound.addEventListener('click', () => {
    state.sound = !state.sound;
    updateSoundButton();
    if (state.sound) startAudio(); else stopAudio();
  });
  volume?.addEventListener('input', () => {
    if (audio && master) master.gain.setTargetAtTime(Number(volume.value) / 100 * .55, audio.currentTime, .06);
  });

  function buttonState() {
    toggle.textContent = state.running ? copy.filmPause : state.elapsed >= state.duration ? copy.filmReplay : copy.filmPlay;
    toggle.setAttribute('aria-pressed', String(state.running));
  }
  function stopFrame() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function pause() {
    state.elapsed = elapsed(); state.running = false;
    seeking = false; resumeAfterSeek = false;
    stopFrame(); stopAudio(); buttonState(); render();
  }
  function play(restart = false) {
    if (!state.story) return;
    if (restart || state.elapsed >= state.duration) state.elapsed = 0;
    state.started = now(); state.running = true;
    status.textContent = '';
    buttonState(); render(); startAudio(); queueFrame();
  }
  function tick() {
    frame = 0;
    if (!state.running) return;
    if (elapsed() >= state.duration) {
      state.elapsed = state.duration; state.running = false;
      stopAudio(); buttonState(); status.textContent = copy.filmEnded;
    }
    render();
    if (state.running) queueFrame();
  }
  function queueFrame() { if (!frame) frame = requestAnimationFrame(tick); }
  function open(trigger) {
    const story = $$('[data-film-id]', dialog).find((node) => node.dataset.filmId === trigger.dataset.houseFilm);
    if (!story) return;
    pause();
    document.dispatchEvent(new CustomEvent('syd:film-open'));
    state.story = story; state.trigger = trigger; state.sound = false;
    state.duration = Number(story.dataset.duration || 28);
    seek.max = String(state.duration);
    lastCaption = null;
    $$('[data-film-id]', dialog).forEach((node) => { node.hidden = node !== story; });
    $('#hx-film-title', dialog).textContent = story.dataset.filmTitle;
    updateSoundButton(); prepare(story);
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
    document.body.classList.add('hx-film-open');
    dialog.scrollTop = 0;
    play(true);
    toggle.focus({ preventScroll: true });
  }
  function closed() {
    pause(); state.sound = false; updateSoundButton();
    document.body.classList.remove('hx-film-open');
    if (state.trigger?.isConnected) state.trigger.focus({ preventScroll: true });
    state.trigger = null;
  }
  function close() {
    if (!dialog.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); closed(); }
  }
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-house-film]') : null;
    if (!trigger) return;
    event.preventDefault(); open(trigger);
  });
  $('[data-house-film-close]', dialog)?.addEventListener('click', close);
  dialog.addEventListener('close', closed);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  let backdropPress = false;
  const outside = (event) => {
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  };
  dialog.addEventListener('pointerdown', (event) => { backdropPress = event.target === dialog && outside(event); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog && backdropPress && outside(event)) close(); backdropPress = false; });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab' || typeof dialog.showModal === 'function') return;
    const controls = $$('button,input', dialog).filter((node) => !node.disabled && node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  toggle.addEventListener('click', () => { if (state.running) pause(); else play(); });
  $('#hx-film-replay', dialog)?.addEventListener('click', () => play(true));
  seek.addEventListener('pointerdown', () => {
    const wasRunning = state.running;
    pause(); seeking = true; resumeAfterSeek = wasRunning;
  });
  seek.addEventListener('input', () => {
    state.elapsed = clamp(Number(seek.value), 0, state.duration);
    state.started = now();
    if (state.elapsed >= state.duration) state.running = false;
    buttonState(); render();
    if (!seeking) { stopAudio(); if (state.running) startAudio(); }
  });
  function finishSeek() {
    if (!seeking) return;
    const resume = resumeAfterSeek && state.elapsed < state.duration;
    seeking = false; resumeAfterSeek = false;
    if (resume) play(); else render();
  }
  window.addEventListener('pointerup', finishSeek);
  seek.addEventListener('pointercancel', () => { seeking = false; resumeAfterSeek = false; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);
  reduced.addEventListener('change', render);
  document.documentElement.classList.add('hx-film-ready');
})();
