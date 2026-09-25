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

  function initPractice() {
    if (!$('#hx-practice-toggle') || !$('#hx-practice-time') || !$('#hx-breath-orbit')) return;
  const practice = { duration: Number($('input[name="hx-duration"]:checked')?.value || 60), elapsed: 0, started: 0, running: false };
  const practiceToggle = $('#hx-practice-toggle');
  const practiceTime = $('#hx-practice-time');
  const practicePrompt = $('#hx-practice-prompt');
  const practiceStatus = $('#hx-practice-status');
  const orbit = $('#hx-breath-orbit');
  const ambientButton = $('#hx-ambient');
  const ambientLabel = $('[data-ambient-label]', ambientButton);
  let frame = 0;
  let audio = null;
  let lastPracticeSecond = -1;
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


  function tick() {
    frame = 0;
    if (!practice.running) return;
    if (elapsed(practice) >= practice.duration) finishPractice();
    else { drawPractice(); queueFrame(); }
  }
  function queueFrame() { if (!frame) frame = requestAnimationFrame(tick); }
  const pauseForPage = () => {
    if (practice.running) pausePractice(copy.practiceHidden);
    stopAmbient();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForPage(); });
  document.addEventListener('syd:film-open', () => { if (practice.running) pausePractice(); stopAmbient(); });
  window.addEventListener('pagehide', pauseForPage);
  reduced.addEventListener('change', () => drawPractice(true));
  drawPractice(true);
  document.documentElement.classList.add('hx-practice-ready');
  }
  initPractice();
  document.documentElement.classList.add('hx-ready');
})();
