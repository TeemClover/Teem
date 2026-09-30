// RoutineX · ห้อง A — runtime: native-scroll choreography, stage driver, small interactions.
// Contract: all copy lives in the DOM. This file only reveals it in sequence and drives the canvas.
import { createProgress } from './progress.js?v=steady1';
import { createOpening } from './opening.js?v=touch2';
import { createStage } from './stage.js?v=reveal1';
import { clamp, lerp, sstep } from './gl.js?v=arrival3';

const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqStack = matchMedia('(max-aspect-ratio: 1/1), (max-width: 820px)');
const mqTouch = matchMedia('(pointer: coarse)');
const compactView = () => mqStack.matches || mqTouch.matches || Math.min(innerWidth, innerHeight) < 520;

const canvas = $('#stage');
const chapters = $$('.chapter').map((el, i) => ({
  el, i, dormant: false, beats: $$('.beat', el).map((b) => ({ el: b, pos: b.dataset.pos === 'l' ? -1 : b.dataset.pos === 'r' ? 1 : 0, o: -1 })),
  top: 0, height: 0, travel: 1,
}));

const st = {
  flow: false, reduced: mqReduce.matches, userFlow: false,
  vh: innerHeight, T: 0, Ts: 0, time: 0, last: 0,
  lens: 0, lensV: [0, 0, 0], water: 0, waterV: 0,
  pointer: [0, 0], pointerT: [0, 0],
  stage: null, stageAttempted: false, tone: -1, layout: mqStack.matches ? 'stack' : 'side',
  dirty: true, sides: [], hidden: false, drawer: false,
};

const progress = createProgress();
let entered = false;
let checkpointTimer = 0;
function checkpoint() {
  if (entered && rzT === null) progress.save(scrollT(), st.flow);
}

// ───────────────────────── layout / scroll ─────────────────────────
const viewportProbe = document.createElement('div');
viewportProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:100svh;';
document.body.append(viewportProbe);
// Only the text frame follows browser chrome. Story lengths and GPU surfaces stay fixed.
function fitReadingViewport() {
  const visual = window.visualViewport;
  if (visual && Math.abs(visual.scale - 1) > .02) return;
  const height = Math.floor(Math.min(st.viewportH || innerHeight, innerHeight, visual?.height || innerHeight));
  if (height === st.readHeight) return;
  st.readHeight = height;
  root.style.setProperty('--read-h', height + 'px');
}
window.visualViewport?.addEventListener('resize', fitReadingViewport, { passive: true });
let measuredWidth = innerWidth;
function measure(resetViewport = false) {
  // Stable viewport units keep chapter lengths unchanged as mobile browser bars move.
  if (!st.viewportH || resetViewport) st.viewportH = viewportProbe.offsetHeight || innerHeight;
  st.vh = st.viewportH;
  fitReadingViewport();
  measuredWidth = innerWidth;
  root.style.setProperty('--unit-vh', (st.vh / 100) + 'px');
  const sy = scrollY;
  st.layout = mqStack.matches ? 'stack' : 'side';
  const pinH = st.vh;
  document.documentElement.style.setProperty('--pinh', pinH + 'px');
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    c.top = r.top + sy; c.height = r.height;
    c.travel = Math.max(1, c.height - pinH);
  }
  // beat centres → stage "which side is the text on" curve
  st.sides = [];
  for (const c of chapters) {
    const n = c.beats.length;
    c.beats.forEach((b, j) => { st.sides.push([c.i + (j + 0.5) / n, b.pos]); });
  }
  st.dirty = true;
}
function sideAt(T) {
  const s = st.sides;
  if (!s.length) return 0;
  if (T <= s[0][0]) return s[0][1];
  for (let i = 0; i < s.length - 1; i++) {
    if (T < s[i + 1][0]) {
      const u = (T - s[i][0]) / (s[i + 1][0] - s[i][0]);
      return lerp(s[i][1], s[i + 1][1], sstep(0.35, 0.65, u));
    }
  }
  return s[s.length - 1][1];
}

function scrollT() {
  const y = scrollY;
  if (st.flow) {
    // flow mode: T follows the chapter under the middle of the viewport
    const mid = y + st.vh * 0.55;
    for (let i = chapters.length - 1; i >= 0; i--) {
      const c = chapters[i];
      if (mid >= c.top || i === 0) return i + clamp((mid - c.top) / Math.max(c.height, 1));
    }
  }
  for (let i = chapters.length - 1; i >= 0; i--) {
    const c = chapters[i];
    if (y >= c.top - 0.5 || i === 0) return i + clamp((y - c.top) / c.travel);
  }
  return 0;
}

// per-beat opacity from scroll progress inside its chapter
function updateBeats(dt = 0.016) {
  const y = scrollY;
  let maxO = 0, curSide = 0;
  for (const c of chapters) {
    const dormant = !st.flow && (y + st.vh < c.top || y > c.top + c.height);
    if (dormant !== c.dormant) { c.dormant = dormant; c.el.classList.toggle('is-dormant', dormant); }
    if (dormant) continue;
    const p = st.flow ? 0.5 : clamp((y - c.top) / c.travel, -0.2, 1.2);
    const fadeP = clamp(0.42 * st.vh / c.travel, 0.03, 0.17);
    const n = c.beats.length;
    c.beats.forEach((b, j) => {
      const a = j / n, e = (j + 1) / n;
      let o = 1, ey = 0, bp = 0;
      if (!st.flow) {
        let vin = sstep(a - fadeP * 0.25, a + fadeP * 0.75, p);
        if (c.i === 0 && j === 0) vin = 1;
        const vout = (c.i === chapters.length - 1 && j === n - 1) ? 1 : 1 - sstep(e - fadeP * 0.75, e + fadeP * 0.25, p);
        o = Math.min(vin, vout);
        ey = (1 - vin) * 34 - (1 - vout) * 34;
        bp = clamp((p - a) / (e - a));
        const es = c.i === 0 && j === 0 ? 1 : clamp((p - a + fadeP * 0.2) / (fadeP * 1.7));
        // a beat that is on screen always settles to fully revealed, even when scroll stopped early in its slot
        const tgt = o > 0.45 ? 1 : 0;
        b.ae = b.ae == null ? tgt : b.ae + (tgt - b.ae) * (1 - Math.exp(-dt * 5.5));
        if (Math.abs(tgt - b.ae) < 0.003) b.ae = tgt;
        const enter = st.reduced ? 1 : Math.max(es, b.ae);
        if (Math.abs(o - b.o) > 0.002 || b.bp !== bp || Math.abs(enter - (b.en ?? -1)) > 0.002) {
          b.en = enter;
          b.el.style.setProperty('--o', o.toFixed(3));
          b.el.style.setProperty('--y', ey.toFixed(1));
          b.el.style.setProperty('--e', enter.toFixed(3));
          b.el.style.setProperty('--bp', bp.toFixed(3));
          b.el.style.setProperty('--vis', o > 0.004 ? 'visible' : 'hidden');
          b.el.style.setProperty('--beat-display', o > 0.004 ? 'flex' : 'none');
          b.el.classList.toggle('on', o > 0.55);
          b.o = o; b.bp = bp;
          const tr = $('.tract', b.el);
          if (tr) tr.style.setProperty('--tp', sstep(0.12, 0.85, bp).toFixed(3));
        }
      }
      if (o > maxO) { maxO = o; }
    });
  }
  st.textPresence = maxO;
}

// ───────────────────────── tone & veil ─────────────────────────
const INK = [27, 23, 20], CREAM = [247, 238, 226], PAPER = [246, 239, 228], PLUM = [26, 15, 20];
function applyTone(lum, side) {
  if (st.flow) { const f = INK.join(' '), b = PAPER.join(' '); if (st.fg !== f) { root.style.setProperty('--fg-rgb', f); root.style.setProperty('--bg-rgb', b); st.fg = f; root.classList.remove('dark'); root.style.setProperty('--va', '0'); } return; }
  const k = sstep(0.34, 0.5, lum); // 0 = dark scene, 1 = light
  const mix = (a, b) => a.map((v, i) => Math.round(lerp(v, b[i], k))).join(' ');
  const fg = mix(CREAM, INK), bg = mix(PLUM, PAPER);
  if (fg !== st.fg) { root.style.setProperty('--fg-rgb', fg); root.style.setProperty('--bg-rgb', bg); st.fg = fg; }
  root.classList.toggle('dark', k < 0.5);
  const stack = st.layout === 'stack';
  const pres = st.flow ? 0.5 : (st.textPresence || 0);
  const dk = k < 0.5;
  const va = stack ? (dk ? 0.78 : 0.62) * pres : ((dk ? 0.86 : 0.55) * Math.abs(side) + 0.04) * pres;
  root.style.setProperty('--va', va.toFixed(3));
  root.style.setProperty('--vang', stack ? '0deg' : side < 0 ? '90deg' : '270deg');
  const meta = $('meta[name=theme-color]');
  if (meta && st.metaK !== Math.round(k)) { st.metaK = Math.round(k); meta.content = k > 0.5 ? '#f5efe6' : '#1a0f14'; }
}

// Begin with the food scene; a poster covers loading without blocking scrolling.
const opening = createOpening({ video: $('#mealVideo'), layer: $('#mealFilm'), isReading: () => st.flow || st.reduced });

// Ritual film: plays once on entering the glass scene, resets when the reader leaves, replayable by button.
const film = $('#film'), vid = $('#filmVideo'), replayBtn = $('#filmReplay');
// Film and canvas can have different CSS heights on mobile. Observe their display
// boxes without resizing the GPU or changing the story's stable scroll distances.
const filmGeometry = { scene: [canvas.clientWidth, canvas.clientHeight], video: [vid.clientWidth, vid.clientHeight] };
const filmObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    filmGeometry[entry.target === canvas ? 'scene' : 'video'] = [entry.contentRect.width, entry.contentRect.height];
  }
});
filmObserver.observe(canvas); if (vid) filmObserver.observe(vid);
const filmS = { started: false, ok: true, failed: false, blocked: false, playing: false, done: false, armed: true };
function tryPlay() {
  if (filmS.failed || filmS.blocked) return;
  const pr = vid.play();
  if (pr) pr.catch(() => { filmS.blocked = true; });
}
function loadFilm() {
  if (filmS.started || !vid || st.flow || st.reduced) return;
  filmS.started = true; vid.src = 'assets/ritual.mp4'; vid.preload = 'auto'; vid.load();
}
function playFilm(fromStart) {
  if (!vid || filmS.failed) return;
  loadFilm();
  if (fromStart) { try { vid.currentTime = 0; } catch (e) {} }
  filmS.done = false; filmS.blocked = false;
  tryPlay();
}
function releaseFilm() {
  if (!vid || !filmS.started) return;
  filmS.started = false; filmS.armed = true; filmS.playing = false; filmS.done = false;
  vid.pause(); vid.removeAttribute('src'); vid.load();
}
function updateFilm(T) {
  if (!film) return;
  const fm = sstep(5.8, 6.1, T);
  const fo = 1 - sstep(7.7, 8.7, T);
  const lock = 1 - sstep(5.9, 6.01, T);
  const portal = st.portal;
  const dx = portal ? (portal[0] * filmGeometry.scene[0] - .62 * filmGeometry.video[0]) * lock : 0;
  const dy = portal ? (portal[1] * filmGeometry.scene[1] - .52 * filmGeometry.video[1]) * lock : 0;
  film.style.setProperty('--film-dx', dx.toFixed(2) + 'px');
  film.style.setProperty('--film-dy', dy.toFixed(2) + 'px');
  film.style.setProperty('--fm', fm.toFixed(3));
  film.style.setProperty('--fo', (fo * Math.min(1, fm * 3)).toFixed(3));
  film.style.setProperty('--fv', fm > 0.002 && fo > 0.002 ? 'visible' : 'hidden');
  if (T > 5.2 && T < 8.7 && !st.hidden) loadFilm();
  if (T < 4.9 || T > 8.9 || st.flow || st.reduced) releaseFilm();
  const inScene = !st.reduced && !st.flow && !st.hidden && fm > 0.85 && T < 8.2;
  if (inScene && filmS.armed) { filmS.armed = false; playFilm(true); }
  if (!inScene && filmS.playing) vid.pause();
  if (inScene && !filmS.playing && !filmS.done && !filmS.armed && vid.paused && !vid.ended) tryPlay();
  // leaving the scene re-arms it, so coming back replays from the start
  if (T < 5.6 || T > 8.6) { if (!filmS.armed) { filmS.armed = true; if (vid && vid.currentTime > 0) { try { vid.currentTime = 0; } catch (e) {} } } }
  if (replayBtn) {
    replayBtn.hidden = filmS.failed || !(inScene && (filmS.done || filmS.blocked));
    replayBtn.textContent = filmS.blocked && !filmS.done ? 'เล่นภาพ' : 'เล่นภาพอีกครั้ง';
  }
}
if (vid) {
  vid.addEventListener('playing', () => { filmS.playing = true; filmS.blocked = false; if (replayBtn) replayBtn.hidden = true; });
  vid.addEventListener('pause', () => { filmS.playing = false; });
  vid.addEventListener('ended', () => { filmS.playing = false; filmS.done = true; });
  vid.addEventListener('canplay', () => { if (!filmS.armed && !filmS.done && vid.paused && !st.flow && !st.reduced) tryPlay(); });
  // on a failed load the poster stays in the scene (video element keeps showing its poster); only playback stops
vid.addEventListener('error', () => { if (filmS.started) { filmS.failed = true; filmS.playing = false; if (replayBtn) replayBtn.hidden = true; } });
}
replayBtn?.addEventListener('click', () => playFilm(true));

// ───────────────────────── stage loop ─────────────────────────
function initStage() {
  const stage = createStage(canvas);
  if (!stage) { root.classList.add('no-gl'); return null; }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); const ref = scrollT(); root.classList.add('no-gl'); st.stage = null; setFlow(true, true); requestAnimationFrame(() => seek(ref, false)); });
  return stage;
}
function ensureStage() {
  if (st.stageAttempted || st.flow || st.reduced) return;
  st.stageAttempted = true; st.stage = initStage();
  if (!st.stage) return;
  const small = compactView();
  st.stage.S.dprCap = small ? 1 : 2;
  st.stage.S.qMax = small ? 0.66 : 1; st.stage.S.q = small ? 0.55 : 1;
  resizeStage();
}
function resizeStage() {
  if (!st.stage) return;
  const cap = st.stage.S.dprCap;
  const dpr = Math.min(devicePixelRatio || 1, cap);
  st.stage.resize(innerWidth, st.vh, dpr);
  st.dirty = true;
}

let acc = 0, accN = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (document.hidden) { st.hidden = true; st.last = now; return; }
  st.hidden = false;
  const target = scrollT();
  const inOpening = target < 1.98;
  const frameBudget = compactView() && target >= 1.62 ? 1000 / 30 : 1000 / 60;
  if (st.last && now - st.last < frameBudget - 1) return;
  const dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now;
  const rate = st.reduced ? 3 : 7.5;
  const diff = target - st.Ts;
  const moving = Math.abs(diff) > 0.0004;
  // A fast swipe across chapters should not decode every scene skipped on the way.
  st.Ts = inOpening || Math.abs(diff) > 1.25 ? target : moving ? st.Ts + diff * (1 - Math.exp(-dt * rate)) : target;
  // Water selection belongs only to the later mixing scene.
  const wd = st.water - st.waterV; if (Math.abs(wd) > 0.002) { st.waterV += wd * (1 - Math.exp(-dt * 5)); root.style.setProperty('--wash', st.waterV.toFixed(3)); }
  const pd = [st.pointerT[0] - st.pointer[0], st.pointerT[1] - st.pointer[1]];
  if (Math.abs(pd[0]) + Math.abs(pd[1]) > 0.001) { st.pointer[0] += pd[0] * (1 - Math.exp(-dt * 3)); st.pointer[1] += pd[1] * (1 - Math.exp(-dt * 3)); st.dirty = true; }

  updateBeats(dt);
  opening.update(st.Ts);
  const idle = !st.reduced && !st.flow;
  if (idle) st.time += dt;
  if (!st.flow && chapters.some((c) => c.beats.some((b) => b.ae != null && b.ae !== (b.o > 0.45 ? 1 : 0)))) st.dirty = true;
  if (st.flow) { applyTone(1, 0); updateFilm(st.Ts); updateRail(st.Ts); return; }
  // The opaque opening film does not need a second renderer running behind it.
  if (st.Ts < 1.62) { applyTone(1, sideAt(st.Ts)); updateFilm(st.Ts); updateRail(st.Ts); return; }
  ensureStage();
  if (!st.stage) { updateFilm(st.Ts); updateRail(st.Ts); return; }
  if (!(idle || moving || st.dirty || st.pointer[0] || st.pointer[1])) return;
  st.dirty = false;

  const time = st.reduced || st.flow ? st.Ts * 5 : st.time;
  const out = st.stage.frame({ T: st.Ts, time, sideAt, layout: st.layout, lens: st.lensV, pointer: st.pointer });
  st.portal = out.portal;
  applyTone(out.tone, sideAt(st.Ts));
  updateFilm(st.Ts);
  updateRail(st.Ts);

  // quality governor
  if (idle) {
    acc += dt; accN++;
    if (accN >= 50) {
      const ms = acc / accN * 1000;
      const slowLimit = compactView() ? 46 : 26; acc = 0; accN = 0;
      const S = st.stage.S;
      if (ms > slowLimit && S.q > 0.32) { S.q = Math.max(0.32, S.q - 0.16); if (S.dprCap > 1.1) { S.dprCap = Math.max(1, S.dprCap - 0.25); resizeStage(); } }
      else if (ms < 13 && S.q < S.qMax) S.q = Math.min(S.qMax, S.q + 0.08);
    }
  }
}

// ───────────────────────── rail / navigation ─────────────────────────
const railLinks = $$('#rail a');
let railI = -1;
function updateRail(T) {
  const i = clamp(Math.floor(T + 0.001), 0, chapters.length - 1);
  if (i !== railI) {
    railI = i;
    railLinks.forEach((a, j) => a.setAttribute('aria-current', j === i ? 'true' : 'false'));
  }
  root.style.setProperty('--prog', (T / chapters.length).toFixed(4));
}
function seek(T, smoothScroll = true) {
  const i = clamp(Math.floor(T), 0, chapters.length - 1), c = chapters[i];
  const p = clamp(T - i, 0, 1);
  const y = st.flow ? Math.max(0, c.top + p * c.height - st.vh * 0.55) : c.top + p * c.travel;
  scrollTo({ top: y, behavior: smoothScroll && !st.reduced ? 'smooth' : 'auto' });
}
function goChapter(i) {
  const c = chapters[i]; if (!c) return;
  const fadeP = clamp(0.42 * st.vh / c.travel, 0.03, 0.17);
  const off = i === 0 ? 0 : Math.min(fadeP * 1.25, 0.5 / c.beats.length);
  seek(i + off);
  history.replaceState(history.state, '', '#ch' + i);
}
$$('a[href^="#ch"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const m = /^#ch(\d+)$/.exec(a.getAttribute('href'));
    if (!m) return;
    e.preventDefault(); goChapter(+m[1]);
  });
});

// keep keyboard focus inside a visible beat
chapters.forEach((c) => c.beats.forEach((b, j) => {
  b.el.addEventListener('focusin', () => {
    if (st.flow) return;
    if ((parseFloat(b.el.style.getPropertyValue('--o')) || 0) < 0.4) {
      const n = c.beats.length;
      scrollTo({ top: c.top + ((j + 0.5) / n) * c.travel, behavior: 'auto' });
    }
  });
}));

// ───────────────────────── interactions ─────────────────────────
function radioGroup(container, onPick) {
  const btns = $$('[role=radio]', container);
  btns.forEach((b, i) => {
    b.addEventListener('click', () => pick(i));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const n = btns.length, j = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      btns[j].focus(); pick(j);
    });
  });
  function pick(i) { btns.forEach((b, j) => { b.setAttribute('aria-checked', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; }); onPick(i, btns[i]); }
  btns.forEach((b, j) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' || (j === 0 && !btns.some((x) => x.getAttribute('aria-checked') === 'true')) ? 0 : -1; });
}

const waterGroup = $('.water');
if (waterGroup) {
  radioGroup(waterGroup, (i) => {
    st.water = i;
    $('#waterOut').textContent = i ? 'ชงกับน้ำ 250–300 มล. รสอ่อนลง' : 'ชงกับน้ำ 150 มล. • ชอบรสอ่อนลง ใช้น้ำ 250–300 มล.';
  });
}
$$('#qa .qa__i button').forEach((b) => b.addEventListener('click', () => {
  const p = b.nextElementSibling, open = b.getAttribute('aria-expanded') === 'true';
  $$('#qa .qa__i button').forEach((o) => { if (o !== b) { o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.hidden = true; } });
  b.setAttribute('aria-expanded', open ? 'false' : 'true'); p.hidden = open;
}));

// sources drawer — non-modal, does not touch scroll position
const drawer = $('#sources');
let lastFocus = null;
function openDrawer(from) {
  lastFocus = from || document.activeElement; drawer.hidden = false; st.drawer = true;
  $('#srcOpen').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => $('#srcClose').focus({ preventScroll: true }));
}
function closeDrawer() {
  drawer.hidden = true; st.drawer = false; $('#srcOpen').setAttribute('aria-expanded', 'false');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
$('#srcOpen').addEventListener('click', (e) => (drawer.hidden ? openDrawer(e.currentTarget) : closeDrawer()));
$('#srcOpen2')?.addEventListener('click', (e) => openDrawer(e.currentTarget));
$$('[data-src]').forEach((b) => b.addEventListener('click', (e) => openDrawer(e.currentTarget)));
$('#srcClose').addEventListener('click', closeDrawer);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.drawer) closeDrawer(); });

// reading mode
const readBtn = $('#readToggle');
function setFlow(on, fromUser) {
  st.flow = on; if (fromUser) st.userFlow = on;
  root.classList.toggle('flow', on);
  readBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  requestAnimationFrame(() => { measure(); st.dirty = true; });
}
readBtn.addEventListener('click', () => {
  const y = scrollY, ref = scrollT();
  setFlow(!st.flow, true);
  requestAnimationFrame(() => requestAnimationFrame(() => seek(ref, false)));
});

addEventListener('pointermove', (e) => {
  if (st.reduced || e.pointerType === 'touch') return;
  st.pointerT = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2];
}, { passive: true });
addEventListener('scroll', () => {
  st.dirty = true;
  if (!checkpointTimer) checkpointTimer = setTimeout(() => { checkpointTimer = 0; checkpoint(); }, 200);
}, { passive: true });
addEventListener('pagehide', checkpoint);
let rz = 0;
let rzT = null;
addEventListener('resize', () => {
  fitReadingViewport();
  // Height-only events on phones are usually browser chrome, not a new layout.
  // Do not realloc the WebGL surface or scrollTo during an active swipe.
  if (compactView() && Math.abs(innerWidth - measuredWidth) < 4) return;
  if (rzT == null) rzT = scrollT();
  cancelAnimationFrame(rz);
  rz = requestAnimationFrame(() => {
    measuredWidth = innerWidth; measure(true); resizeStage();
    if (!st.flow) seek(rzT, false);
    rzT = null;
  });
});
mqReduce.addEventListener?.('change', () => { st.reduced = mqReduce.matches; if (st.reduced) setFlow(true); });
document.addEventListener('visibilitychange', () => {
  st.last = 0;
  if (document.hidden) { checkpoint(); vid?.pause(); }
});

// ───────────────────────── boot ─────────────────────────
function boot() {
  if (st.reduced) { st.flow = true; root.classList.add('flow'); readBtn.setAttribute('aria-pressed', 'true'); }
  else if (root.dataset.wd) { root.classList.add('js'); delete root.dataset.wd; }
  chapters.forEach((c) => c.beats.forEach((b) => b.el.style.setProperty('--n', $$('.ln', b.el).length || 1)));
  const saved = progress.restore();
  if (saved?.flow && !st.flow) setFlow(true, true);
  measure();
  if (saved) {
    entered = true; st.Ts = saved.T;
    requestAnimationFrame(() => { seek(saved.T, false); updateBeats(); });
  }
  if (!saved && location.hash && /^#ch\d+$/.test(location.hash)) requestAnimationFrame(() => goChapter(+location.hash.slice(3)));
  root.classList.add('ready');
  entered = true;
  requestAnimationFrame(tick);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); });
  // late layout shifts (images) – re-measure a couple of times
  setTimeout(measure, 600); setTimeout(measure, 2000);
}
window.absorb = { seek: (T) => seek(T, false), get T() { return st.Ts; }, state: st, opening: opening.state };
try { boot(); } catch (e) { console.error(e); root.classList.remove('js'); root.classList.add('flow'); }
