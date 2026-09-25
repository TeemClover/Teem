/* Local room experiences. No accounts, storage, analytics transport or network calls. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const copyNode = $('#house-experiences-copy');
  if (!copyNode) return;
  let copy;
  try { copy = JSON.parse(copyNode.textContent); } catch { return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const namespace = 'http://www.w3.org/2000/svg';

  // The plate is an illustration of a general idea, never a nutrition calculation.
  const foodPositions = {
    vegetables: [[67, 99, 55, -14], [91, 158, 61, 12], [52, 199, 57, -9], [116, 218, 41, 18]],
    grains: [[186, 85, 48, -6], [233, 113, 44, 14]],
    protein: [[187, 192, 47, -5], [231, 178, 46, 12], [214, 238, 40, -11]]
  };
  function drawFood(input) {
    const region = $(`#hx-plate-${input.dataset.food}`);
    if (!region || !foodPositions[input.dataset.food]) return;
    const symbols = foodPositions[input.dataset.food].map(([x, y, size, angle]) => {
      const symbol = document.createElementNS(namespace, 'use');
      symbol.setAttribute('href', `#hx-food-${input.dataset.icon}`);
      symbol.setAttribute('x', x);
      symbol.setAttribute('y', y);
      symbol.setAttribute('width', size);
      symbol.setAttribute('height', size);
      symbol.setAttribute('transform', `rotate(${angle} ${x + size / 2} ${y + size / 2})`);
      return symbol;
    });
    region.setAttribute('color', input.dataset.color);
    region.replaceChildren(...symbols);
    const summary = $('#hx-plate-summary');
    if (summary) summary.textContent = $$('[data-food]:checked').map((item) => item.value).join(' · ');
  }
  $$('[data-food]').forEach((input) => input.addEventListener('change', () => drawFood(input)));
  $$('[data-food]:checked').forEach(drawFood);

  const practice = { duration: 60, elapsed: 0, started: 0, running: false };
  const film = { duration: 20, elapsed: 0, started: 0, running: false, story: null, trigger: null };
  const practiceToggle = $('#hx-practice-toggle');
  const practiceTime = $('#hx-practice-time');
  const practicePrompt = $('#hx-practice-prompt');
  const practiceStatus = $('#hx-practice-status');
  const orbit = $('#hx-breath-orbit');
  const ambientButton = $('#hx-ambient');
  const ambientLabel = $('[data-ambient-label]', ambientButton);
  const dialog = $('#house-film-dialog');
  const filmToggle = $('#hx-film-toggle');
  const filmSeek = $('#hx-film-seek');
  const filmTime = $('#hx-film-time');
  let frame = 0;
  let audio = null;
  let lastPracticeSecond = -1;
  let lastCaption = null;
  let seeking = false;
  const elapsed = (state, now = performance.now()) => clamp(state.elapsed + (state.running ? (now - state.started) / 1000 : 0), 0, state.duration);
  const remember = (state) => { state.elapsed = elapsed(state); state.running = false; };
  const announce = (message) => { if (practiceStatus) practiceStatus.textContent = message; };

  function stopAmbient() {
    if (audio) {
      const active = audio;
      audio = null;
      active.close().catch(() => {});
    }
    ambientButton?.setAttribute('aria-pressed', 'false');
    if (ambientLabel) ambientLabel.textContent = copy.ambientOff;
  }
  async function toggleAmbient() {
    if (audio) { stopAmbient(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      if (ambientLabel) ambientLabel.textContent = copy.ambientUnavailable;
      return;
    }
    let context;
    try {
      // A quiet, synthesized texture starts only from this explicit button press.
      context = new AudioContext();
      audio = context;
      const output = context.createGain();
      output.gain.value = 0;
      output.connect(context.destination);
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < samples.length; index += 1) {
        previous = (previous + (Math.random() * 2 - 1) * .035) / 1.035;
        samples[index] = previous * 2.4;
      }
      const texture = context.createBufferSource();
      texture.buffer = buffer;
      texture.loop = true;
      const soften = context.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 500;
      texture.connect(soften);
      soften.connect(output);
      texture.start();
      await context.resume();
      if (audio !== context) return;
      output.gain.linearRampToValueAtTime(.14, context.currentTime + 1.2);
      ambientButton.setAttribute('aria-pressed', 'true');
      ambientLabel.textContent = copy.ambientOn;
    } catch {
      // A cancelled start must not stop a newer, explicitly requested sound.
      if (context && audio !== context) return;
      stopAmbient();
      if (ambientLabel) ambientLabel.textContent = copy.ambientUnavailable;
    }
  }
  ambientButton?.addEventListener('click', toggleAmbient);

  function drawPractice(force = false) {
    const seconds = Math.ceil(practice.duration - elapsed(practice));
    if (force || seconds !== lastPracticeSecond) {
      lastPracticeSecond = seconds;
      practiceTime.textContent = clock(seconds);
      if (practice.running) {
        const prompts = copy.practicePrompts;
        const promptIndex = Math.floor(elapsed(practice) / 15) % prompts.length;
        practicePrompt.textContent = prompts[promptIndex];
      }
    }
    orbit.classList.toggle('is-running', practice.running && !reduced.matches);
  }
  function setPracticeButton(label) {
    practiceToggle.replaceChildren(document.createTextNode(label));
    practiceToggle.setAttribute('aria-pressed', String(practice.running));
  }
  function pausePractice(message = copy.practicePaused) {
    if (practice.running) remember(practice);
    stopAmbient();
    setPracticeButton(practice.elapsed >= practice.duration ? copy.practiceReplay : practice.elapsed > 0 ? copy.practiceResume : copy.practiceStart);
    practicePrompt.textContent = message;
    announce(message);
    drawPractice(true);
  }
  function finishPractice() {
    practice.elapsed = practice.duration;
    practice.running = false;
    stopAmbient();
    setPracticeButton(copy.practiceReplay);
    practicePrompt.textContent = copy.practiceFinished;
    announce(copy.practiceFinished);
    drawPractice(true);
  }
  function resetPractice() {
    practice.running = false;
    practice.elapsed = 0;
    stopAmbient();
    setPracticeButton(copy.practiceStart);
    practicePrompt.textContent = copy.practiceReady;
    announce(copy.practiceReady);
    drawPractice(true);
  }
  practiceToggle?.addEventListener('click', () => {
    if (practice.running) { pausePractice(); return; }
    if (practice.elapsed >= practice.duration) practice.elapsed = 0;
    practice.started = performance.now();
    practice.running = true;
    setPracticeButton(copy.practicePause);
    announce(copy.practiceStarted);
    drawPractice(true);
    queueFrame();
  });
  $('#hx-practice-reset')?.addEventListener('click', resetPractice);
  $$('input[name="hx-duration"]').forEach((input) => input.addEventListener('change', () => {
    practice.duration = Number(input.value);
    resetPractice();
    announce(copy.practiceDuration);
  }));

  // A 20-second, seekable editorial film is rendered from an actual timeline.
  // Caption changes remain in reduced-motion mode; vector movement is removed.
  function styleAll(selector, styles) {
    $$(selector, film.story).forEach((node) => Object.assign(node.style, styles));
  }
  function drawFilm() {
    if (!film.story) return;
    const t = elapsed(film);
    if (!seeking) filmSeek.value = String(t);
    filmSeek.setAttribute('aria-valuetext', `${Math.floor(t)} ${copy.filmPosition}`);
    filmTime.textContent = `${clock(t)} / ${clock(film.duration)}`;
    const captions = $$('[data-film-start]', film.story);
    const activeCaption = captions.find((caption) => t >= Number(caption.dataset.filmStart) && t < Number(caption.dataset.filmEnd));
    if (activeCaption !== lastCaption) {
      captions.forEach((caption) => { caption.hidden = caption !== activeCaption; });
      lastCaption = activeCaption;
    }
    const still = reduced.matches;
    const key = film.story.dataset.filmId;
    if (key === 'welcome') {
      styleAll('.hx-house-shape', { transform: still ? 'none' : `translateY(${(1 - clamp(t / 4)) * 22}px) scale(${.94 + clamp(t / 5) * .06})`, opacity: String(still ? 1 : .15 + clamp(t / 3) * .85) });
      styleAll('.hx-film-sun', { transform: still ? 'none' : `translate(${-t * .7}px, ${Math.sin(t / 5) * 5}px)` });
      styleAll('.hx-house-leaf', { transform: still ? 'none' : `scale(${.65 + clamp((t - 5) / 9) * .35}) rotate(${Math.sin(t / 3) * 3}deg)` });
      styleAll('.hx-house-path', { opacity: String(still ? 1 : clamp((t - 12) / 3)) });
    } else if (key === 'kitchen') {
      [['.hx-film-veg', 0], ['.hx-film-grain', 6.5], ['.hx-film-protein', 9.5]].forEach(([selector, start]) => {
        const amount = clamp((t - start) / 1.7);
        styleAll(selector, { opacity: String(still ? (t >= start ? 1 : .15) : .08 + amount * .92), transform: still ? 'none' : `translateY(${(1 - amount) * 13}px)` });
      });
    } else if (key === 'mindfulness') {
      styleAll('.hx-film-person', { opacity: String(still ? 1 : .4 + clamp(t / 3) * .6) });
      styleAll('.hx-film-breath', { transform: still ? 'none' : `scale(${.94 + (Math.sin(t * Math.PI / 4.5) + 1) * .08})`, opacity: String(still ? .75 : .4 + (Math.sin(t * Math.PI / 4.5) + 1) * .25) });
      styleAll('.hx-film-thought', { transform: still ? 'none' : `translateY(${-t * .8}px)`, opacity: String(still ? .6 : .75 - clamp(t / 20) * .6) });
    }
  }
  function setFilmButton() {
    filmToggle.textContent = film.running ? copy.filmPause : film.elapsed >= film.duration ? copy.filmReplay : copy.filmPlay;
    filmToggle.setAttribute('aria-pressed', String(film.running));
  }
  function pauseFilm() {
    seeking = false;
    if (film.running) remember(film);
    setFilmButton();
    drawFilm();
  }
  function playFilm(restart = false) {
    if (restart || film.elapsed >= film.duration) film.elapsed = 0;
    film.started = performance.now();
    film.running = true;
    setFilmButton();
    drawFilm();
    queueFrame();
  }
  function openFilm(trigger) {
    const selected = $$('[data-film-id]', dialog).find((story) => story.dataset.filmId === trigger.dataset.houseFilm);
    if (!selected) return;
    if (practice.running) pausePractice();
    stopAmbient();
    pauseFilm();
    film.trigger = trigger;
    film.story = selected;
    lastCaption = null;
    $$('[data-film-id]', dialog).forEach((story) => { story.hidden = story !== selected; });
    $('#hx-film-title').textContent = selected.dataset.filmTitle;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    }
    document.body.classList.add('hx-film-open');
    dialog.scrollTop = 0;
    playFilm(true);
    filmToggle.focus({ preventScroll: true });
  }
  function filmClosed() {
    pauseFilm();
    document.body.classList.remove('hx-film-open');
    if (film.trigger?.isConnected) film.trigger.focus({ preventScroll: true });
    film.trigger = null;
  }
  function closeFilm() {
    if (!dialog.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); filmClosed(); }
  }
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-house-film]') : null;
    if (!trigger) return;
    event.preventDefault();
    openFilm(trigger);
  });
  $('[data-house-film-close]', dialog)?.addEventListener('click', closeFilm);
  dialog.addEventListener('close', filmClosed);
  let backdropPress = false;
  const outside = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', (event) => { backdropPress = event.target === dialog && outside(event); });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && backdropPress && outside(event)) closeFilm();
    backdropPress = false;
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeFilm(); return; }
    if (event.key !== 'Tab' || typeof dialog.showModal === 'function') return;
    const controls = $$('button, input', dialog).filter((node) => !node.disabled && node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  filmToggle.addEventListener('click', () => { if (film.running) pauseFilm(); else playFilm(); });
  $('#hx-film-replay').addEventListener('click', () => playFilm(true));
  filmSeek.addEventListener('input', () => {
    film.elapsed = clamp(Number(filmSeek.value), 0, film.duration);
    film.started = performance.now();
    if (film.elapsed >= film.duration) film.running = false;
    setFilmButton();
    drawFilm();
  });
  filmSeek.addEventListener('pointerdown', () => { seeking = true; });
  window.addEventListener('pointerup', () => { if (seeking) { seeking = false; drawFilm(); } });
  filmSeek.addEventListener('pointercancel', () => { seeking = false; drawFilm(); });

  function tick() {
    frame = 0;
    if (practice.running) {
      if (elapsed(practice) >= practice.duration) finishPractice();
      else drawPractice();
    }
    if (film.running) {
      if (elapsed(film) >= film.duration) {
        film.elapsed = film.duration;
        film.running = false;
        setFilmButton();
      }
      drawFilm();
    }
    if (practice.running || film.running) queueFrame();
  }
  function queueFrame() { if (!frame) frame = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    seeking = false;
    if (practice.running) pausePractice(copy.practiceHidden);
    if (film.running) pauseFilm();
    stopAmbient();
  });
  window.addEventListener('pagehide', () => {
    seeking = false;
    if (practice.running) pausePractice(copy.practiceHidden);
    if (film.running) pauseFilm();
    stopAmbient();
  });
  reduced.addEventListener('change', () => { drawPractice(true); drawFilm(); });
  drawPractice(true);
  document.documentElement.classList.add('hx-ready');
})();
