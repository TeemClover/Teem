// RoutineX · ห้อง B — runtime: native-scroll choreography, stage + film driver, small interactions.
// Contract: all copy lives in the DOM. This file only reveals it in sequence and drives the canvas and films.
// Mobile lessons ported from room A: stable viewport probe, height-only resizes never re-measure, per-entry progress.
import { createStage } from './stage.js?v=journey2';
import { createFilms } from './films.js?v=journey2';
import { createProgress } from './progress.js?v=journey2';
import { clamp, lerp, sstep } from './gl.js?v=journey2';

const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqStack = matchMedia('(max-aspect-ratio: 1/1), (max-width: 820px)');
const mqTouch = matchMedia('(pointer: coarse)');
const compactView = () => mqStack.matches || mqTouch.matches || Math.min(innerWidth, innerHeight) < 520;

const canvas = $('#stage');
const chapters = $$('.chapter').map((el, i) => ({
  el, i, dormant: false,
  beats: $$('.beat', el).map((b) => ({ el: b, pos: b.dataset.pos === 'l' ? -1 : b.dataset.pos === 'r' ? 1 : 0, o: -1, steps: +b.dataset.steps || 0, ph: -1 })),
  top: 0, height: 0, travel: 1,
}));

const st = {
  flow: false, reduced: mqReduce.matches, userFlow: false,
  vh: innerHeight, T: 0, Ts: 0, time: 0, last: 0, glLast: 0,
  mode: 0, modeV: [1, 0, 0],
  pointer: [0, 0], pointerT: [0, 0],
  stage: null, stageAttempted: false, tone: 0.9, layout: mqStack.matches ? 'stack' : 'side',
  dirty: true, sides: [], hidden: false, film: 0, filmOps: [0, 0],
};
const films = createFilms({ compact: compactView });
const progress = createProgress();
let entered = false, checkpointTimer = 0;
function checkpoint() { if (entered && rzT === null) progress.save(scrollT(), st.flow); }

// ───────────────────────── layout / scroll ─────────────────────────
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:100svh;';
document.body.append(probe);
// Only the text frame follows browser chrome. Story lengths, GPU surfaces and seek positions stay fixed.
function fitReadingViewport() {
  const vv = window.visualViewport;
  if (vv && Math.abs(vv.scale - 1) > 0.02) return; // pinch zoom: leave layout alone
  const h = Math.floor(Math.min(st.viewportH || innerHeight, innerHeight, vv?.height || innerHeight));
  if (h === st.readHeight) return;
  st.readHeight = h; root.style.setProperty('--read-h', h + 'px');
}
window.visualViewport?.addEventListener('resize', fitReadingViewport, { passive: true });
let measuredWidth = innerWidth;
function measure(resetViewport = false) {
  if (!st.viewportH || resetViewport) st.viewportH = probe.offsetHeight || innerHeight;
  st.vh = st.viewportH;
  fitReadingViewport();
  measuredWidth = innerWidth;
  root.style.setProperty('--unit-vh', (st.vh / 100) + 'px');
  root.style.setProperty('--pinh', st.vh + 'px');
  const sy = scrollY;
  st.layout = mqStack.matches ? 'stack' : 'side';
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    c.top = r.top + sy; c.height = r.height;
    c.travel = Math.max(1, c.height - st.vh);
  }
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

// per-beat opacity from scroll progress inside its chapter; hidden beats/chapters are display:none and inert
function updateBeats(dt = 0.016) {
  const y = scrollY;
  let maxO = 0;
  for (const c of chapters) {
    const dormant = !st.flow && (y + st.vh < c.top || y > c.top + c.height);
    if (dormant !== c.dormant) { c.dormant = dormant; c.el.classList.toggle('is-dormant', dormant); }
    if (dormant) continue;
    const p = st.flow ? 0.5 : clamp((y - c.top) / c.travel, -0.2, 1.2);
    const fadeP = clamp(0.42 * st.vh / c.travel, 0.03, 0.17);
    const n = c.beats.length;
    let best = -1, bestO = -1;
    c.beats.forEach((b, j) => {
      const a = j / n, e = (j + 1) / n;
      let o = 1;
      if (!st.flow) {
        let vin = sstep(a - fadeP * 0.25, a + fadeP * 0.75, p);
        if (c.i === 0 && j === 0) vin = 1;
        const vout = (c.i === chapters.length - 1 && j === n - 1) ? 1 : 1 - sstep(e - fadeP * 0.75, e + fadeP * 0.25, p);
        o = Math.min(vin, vout);
        const ey = (1 - vin) * 34 - (1 - vout) * 34;
        const bp = clamp((p - a) / (e - a));
        const es = c.i === 0 && j === 0 ? 1 : clamp((p - a + fadeP * 0.2) / (fadeP * 1.7));
        // a beat that is on screen always settles to fully revealed, even when scroll stopped early in its slot
        const tgt = o > 0.45 ? 1 : 0;
        b.ae = b.ae == null ? tgt : b.ae + (tgt - b.ae) * (1 - Math.exp(-dt * 5.5));
        if (Math.abs(tgt - b.ae) < 0.003) b.ae = tgt;
        const enter = st.reduced ? 1 : Math.max(es, b.ae);
        if (Math.abs(o - b.o) > 0.002 || b.bp !== bp || Math.abs(enter - (b.en ?? -1)) > 0.002) {
          b.en = enter;
          const s = b.el.style;
          s.setProperty('--o', o.toFixed(3)); s.setProperty('--y', ey.toFixed(1)); s.setProperty('--e', enter.toFixed(3)); s.setProperty('--bp', bp.toFixed(3));
          s.setProperty('--vis', o > 0.004 ? 'visible' : 'hidden');
          s.setProperty('--beat-display', o > 0.004 ? 'flex' : 'none');
          const shown = o > 0.004;
          if (shown === b.el.inert) b.el.inert = !shown;
          b.el.classList.toggle('on', o > 0.55);
          b.o = o; b.bp = bp;
          if (b.steps) {
            const ph = Math.min(b.steps - 1, Math.floor(bp * b.steps));
            if (ph !== b.ph) { b.ph = ph; b.el.dataset.ph = ph; }
          }
        }
      }
      if (o > maxO) maxO = o;
      if (o > bestO) { bestO = o; best = j; }
    });
    // ch3 (food / resistance / rest) tints the stage: one beat = one mode
    if (c.i === 3 && !st.flow && best >= 0 && best !== st.mode) { st.mode = best; st.dirty = true; }
  }
  st.textPresence = maxO;
  const closing = chapters[chapters.length - 1].beats.at(-1);
  root.style.setProperty('--closing', st.flow || chapters.at(-1).dormant ? '0' : Math.max(0, closing.o).toFixed(3));
}

// ───────────────────────── tone & veil ─────────────────────────
const INK = [27, 23, 20], CREAM = [247, 238, 226], PAPER = [246, 239, 228], PLUM = [26, 15, 20];
function applyTone(lum, side, filmK) {
  if (st.flow) { const f = INK.join(' '), b = PAPER.join(' '); if (st.fg !== f) { root.style.setProperty('--fg-rgb', f); root.style.setProperty('--bg-rgb', b); st.fg = f; root.classList.remove('dark'); root.style.setProperty('--va', '0'); } return; }
  // Over a live film the type is always cream on the CSS scrim: deterministic contrast whatever the footage does.
  const k = sstep(0.34, 0.5, lerp(lum, 0.08, filmK));
  const mix = (a, b) => a.map((v, i) => Math.round(lerp(v, b[i], k))).join(' ');
  const fg = mix(CREAM, INK), bg = mix(PLUM, PAPER);
  if (fg !== st.fg) { root.style.setProperty('--fg-rgb', fg); root.style.setProperty('--bg-rgb', bg); st.fg = fg; }
  root.classList.toggle('dark', k < 0.5);
  const stack = st.layout === 'stack';
  const pres = st.textPresence || 0;
  const dk = k < 0.5;
  const va0 = stack ? (dk ? 0.78 : 0.62) * pres : ((dk ? 0.86 : 0.8) * Math.abs(side) + 0.04) * pres;
  root.style.setProperty('--va', (va0 * (1 - 0.65 * filmK)).toFixed(3));
  root.style.setProperty('--vang', stack ? '0deg' : side < 0 ? '90deg' : '270deg');
  const meta = $('meta[name=theme-color]');
  if (meta && st.metaK !== Math.round(k)) { st.metaK = Math.round(k); meta.content = k > 0.5 ? '#f5efe6' : '#1a0f14'; }
}

// Human fallback (ch5): SVG arm-and-glass is used only while film 2 is not showing.
const humanEl = $('.human');
function updateHuman(T) {
  if (!humanEl || st.flow) return;
  const cover = 1 - clamp(st.filmOps[1] * 1.6);
  const ho = sstep(5.28, 5.5, T) * (1 - sstep(5.94, 5.995, T)) * cover;
  const rp = sstep(5.3, 5.62, T), fr = lerp(28, 0, sstep(5.52, 5.86, T)), bl = sstep(5.68, 5.9, T);
  const key = [ho, rp, fr, bl].map((v) => v.toFixed(3)).join();
  if (key === st.hk) return; st.hk = key;
  const s = humanEl.style;
  s.setProperty('--ho', ho.toFixed(3)); s.setProperty('--hv', ho > 0.004 ? 'visible' : 'hidden');
  s.setProperty('--rp', rp.toFixed(3)); s.setProperty('--fr', fr.toFixed(2)); s.setProperty('--bl', bl.toFixed(3));
}

// ───────────────────────── stage loop ─────────────────────────
function initStage() {
  const stage = createStage(canvas);
  if (!stage) { root.classList.add('no-gl'); return null; }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.add('no-gl'); st.stage = null; setFlow(true); });
  return stage;
}
// The GL scene starts only when it is actually visible (film not yet, or not at all, covering it).
function ensureStage() {
  if (st.stageAttempted || st.flow || st.reduced) return;
  st.stageAttempted = true; st.stage = initStage();
  if (!st.stage) { setFlow(true); return; }
  const small = compactView();
  st.stage.S.dprCap = small ? 1 : 2;
  st.stage.S.qMax = small ? 0.66 : 1; st.stage.S.q = small ? 0.55 : 1;
  resizeStage();
}
function resizeStage() {
  if (!st.stage) return;
  const dpr = Math.min(devicePixelRatio || 1, st.stage.S.dprCap);
  st.stage.resize(innerWidth, st.vh, dpr);
  st.dirty = true;
}

let acc = 0, accN = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (document.hidden) { st.hidden = true; st.last = now; return; }
  st.hidden = false;
  const dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now;
  const target = scrollT();
  const rate = st.reduced ? 3 : 7.5;
  const diff = target - st.Ts;
  const moving = Math.abs(diff) > 0.0004;
  // A fast jump across chapters should not render every scene skipped on the way.
  st.Ts = Math.abs(diff) > 1.25 ? target : moving ? st.Ts + diff * (1 - Math.exp(-dt * rate)) : target;
  let lensMoving = false;
  for (let i = 0; i < 3; i++) {
    const tv = st.mode === i ? 1 : 0, d = tv - st.modeV[i];
    if (Math.abs(d) > 0.002) { st.modeV[i] += d * (1 - Math.exp(-dt * 3.2)); lensMoving = true; } else st.modeV[i] = tv;
  }
  const pd = [st.pointerT[0] - st.pointer[0], st.pointerT[1] - st.pointer[1]];
  if (Math.abs(pd[0]) + Math.abs(pd[1]) > 0.001) { st.pointer[0] += pd[0] * (1 - Math.exp(-dt * 3)); st.pointer[1] += pd[1] * (1 - Math.exp(-dt * 3)); st.dirty = true; }

  updateBeats(dt);
  // films follow the raw scroll position, never the eased stage time
  const fo = films.update(target, dt, now, !st.flow && !st.reduced);
  st.film = fo.opaque; st.filmOps = fo.ops;
  updateHuman(st.Ts);
  updateRail(st.Ts);
  if (st.flow) { applyTone(1, 0, 0); return; }

  const glHidden = fo.live && fo.opaque > 0.985;   // film fully covers the canvas: skip the expensive render
  const introCovered = target < 1.65 && films.list[0]?.state !== 'failed';
  if (!glHidden && !introCovered) ensureStage();
  const idle = !st.reduced && !glHidden;
  if (idle) st.time += dt;
  if (chapters.some((c) => c.beats.some((b) => b.ae != null && b.ae !== (b.o > 0.45 ? 1 : 0)))) st.dirty = true;
  if (!st.stage || glHidden) { applyTone(st.tone, sideAt(st.Ts), fo.opaque); return; }
  if (!(idle || moving || lensMoving || st.dirty || st.pointer[0] || st.pointer[1])) return;
  if (compactView() && now - st.glLast < 32) return;      // 30 fps ceiling on phones
  st.glLast = now; st.dirty = false;

  const time = st.reduced ? st.Ts * 5 : st.time;
  const out = st.stage.frame({ T: st.Ts, time, sideAt, layout: st.layout, mode: st.modeV, pointer: st.pointer });
  st.tone = out.tone;
  applyTone(out.tone, sideAt(st.Ts), fo.opaque);

  // quality governor
  if (idle) {
    acc += dt; accN++;
    if (accN >= 50) {
      const ms = acc / accN * 1000; acc = 0; accN = 0;
      const S = st.stage.S, slow = compactView() ? 46 : 26;
      if (ms > slow && S.q > 0.32) { S.q = Math.max(0.32, S.q - 0.16); if (S.dprCap > 1.1) { S.dprCap = Math.max(1, S.dprCap - 0.25); resizeStage(); } }
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
addEventListener('hashchange', () => {
  const m = /^#ch(\d+)$/.exec(location.hash);
  if (m && chapters[+m[1]]) goChapter(+m[1]);
});
// keep keyboard focus inside a visible beat
chapters.forEach((c) => c.beats.forEach((b, j) => {
  b.el.addEventListener('focusin', () => {
    if (st.flow) return;
    if ((parseFloat(b.el.style.getPropertyValue('--o')) || 0) < 0.4) scrollTo({ top: c.top + ((j + 0.5) / c.beats.length) * c.travel, behavior: 'auto' });
  });
}));

// ───────────────────────── dialogs (evidence / formula) ─────────────────────────
const dlgs = { evidence: $('#evidence'), formula: $('#formula') };
const scrim = $('#scrim');
let openDlg = null, lastFocus = null;
const inertTargets = () => ['#story', '#bar', '#rail', '.skip'].flatMap((q) => $$(q));
function focusables(el) { return $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', el).filter((n) => !n.hidden && n.offsetParent !== null); }
function openDialog(id, from) {
  if (openDlg) return;
  const d = dlgs[id]; if (!d) return;
  lastFocus = from || document.activeElement; d.hidden = false; scrim.hidden = false; openDlg = d;
  inertTargets().forEach((e) => { e.inert = true; });
  $('#srcOpen').setAttribute('aria-expanded', id === 'evidence' ? 'true' : 'false');
  requestAnimationFrame(() => { const f = focusables(d)[0] || d; f.focus({ preventScroll: true }); });
}
function closeDialog() {
  if (!openDlg) return;
  openDlg.hidden = true; scrim.hidden = true; openDlg = null;
  inertTargets().forEach((e) => { e.inert = false; });
  // beats hidden by the choreography stay inert
  chapters.forEach((c) => c.beats.forEach((b) => { if (!st.flow && b.o >= 0) b.el.inert = !(b.o > 0.004); }));
  $('#srcOpen').setAttribute('aria-expanded', 'false');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
$('#srcOpen').addEventListener('click', (e) => openDialog('evidence', e.currentTarget));
$$('[data-open]').forEach((b) => b.addEventListener('click', (e) => openDialog(b.dataset.open, e.currentTarget)));
$$('[data-close]').forEach((b) => b.addEventListener('click', closeDialog));
scrim.addEventListener('click', closeDialog);
addEventListener('keydown', (e) => {
  if (!openDlg) return;
  if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
  if (e.key === 'Tab') {
    const f = focusables(openDlg); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !openDlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !openDlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
});

// ───────────────────────── reading mode ─────────────────────────
const readBtn = $('#readToggle');
function setFlow(on, fromUser) {
  st.flow = on; if (fromUser) st.userFlow = on;
  root.classList.toggle('flow', on);
  readBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  chapters.forEach((c) => c.beats.forEach((b) => { b.el.inert = false; b.o = -1; b.bp = NaN; }));
  if (on) films.releaseAll();
  requestAnimationFrame(() => { measure(); st.dirty = true; });
}
readBtn.addEventListener('click', () => {
  const ref = scrollT();
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
let rz = 0, rzT = null;
addEventListener('resize', () => {
  fitReadingViewport();
  // Height-only events on phones are browser chrome, not a new layout: no re-measure, no scrollTo, no GL realloc.
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
  if (document.hidden) { checkpoint(); films.pause(); }
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
    st.Ts = saved.T;
    requestAnimationFrame(() => { seek(saved.T, false); updateBeats(); });
  } else if (location.hash && /^#ch\d+$/.test(location.hash)) requestAnimationFrame(() => goChapter(+location.hash.slice(3)));
  root.classList.add('ready');
  entered = true;
  requestAnimationFrame(tick);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); });
  setTimeout(measure, 600); setTimeout(measure, 2000);
}
window.build = { seek: (T) => seek(T, false), get T() { return st.Ts; }, state: st, films };
try { boot(); } catch (e) { console.error(e); root.classList.remove('js'); root.classList.add('flow'); }
