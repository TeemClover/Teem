/**
 * Homechew page controller.
 * One scroll clock owns the story: native scroll → u → (DOM beat + CSS vars) and (3D pose).
 * The page is complete without this file; it only upgrades the stage.
 */
import {beatAt, clamp} from './scene/timeline.js';

const root = document.documentElement;
const $ = sel => document.querySelector(sel);
const story = $('#story');
const hero = $('#top');
const pour = $('#pour');
const stageEl = $('#stage');
const canvas = $('#scene');
const base = new URL('../', import.meta.url).href;

// Scene-side product look (visual direction only; facts stay null in data/products.json).
const LOOK = {
  // v1.2: matched to the owner-selected dip close-ups (amber-orange / bright green / deep red-brown).
  'HC-HY': {art: 'hy', seed: 1, sauce: {base: '#c1520f', deep: '#7c2a05', pool: '#b8480d', surface: '#9c3c0a', glow: '#6e2402', flecks: ['#b3200c', '#d8321a', '#f5cf92', '#ffe8bd', '#8e1a06', '#e4501e']}},
  'HC-MC': {art: 'mc', seed: 2, sauce: {base: '#a3b43c', deep: '#5d7217', pool: '#9aad38', surface: '#7d9024', glow: '#3a4a08', flecks: ['#d8341a', '#f3eec4', '#3f6a14', '#cadb66', '#2f5410']}},
  'HC-CK': {art: 'ck', seed: 3, sauce: {base: '#8e3516', deep: '#4a170a', pool: '#83301a', surface: '#5e2010', glow: '#2e0c03', flecks: ['#d4562a', '#2a0d05', '#ecb672', '#a33a16', '#f6d7a0']}},
};

const state = {
  target: -1, shown: -1, last: 0, raf: 0,
  m: {pourTop: 0, pourH: 1, heroTop: 0, heroH: 1, vh: 1},
  static: false, no3d: false, reduced: false,
  stage: null, beat: 'hero',
};
window.__homechew = state; // QA hook (read-only use in tests)

/* ---------- measurement ---------- */
const docTop = el => el.getBoundingClientRect().top + window.scrollY;
function measure() {
  state.m = {
    heroTop: docTop(hero),
    heroH: Math.max(1, hero.offsetHeight),
    pourTop: docTop(pour),
    pourH: Math.max(1, pour.offsetHeight),
    vh: window.innerHeight,
  };
  state.target = computeTarget();
}

function computeTarget() {
  if (state.static) return -1;
  const y = window.scrollY, m = state.m;
  if (y < m.pourTop) return clamp((y - m.heroTop) / (m.pourTop - m.heroTop || 1)) - 1;
  return clamp((y - m.pourTop) / Math.max(1, m.pourH - m.vh));
}

/* ---------- the clock ---------- */
function tick(now) {
  state.raf = 0;
  const dt = Math.min(0.1, (now - (state.last || now)) / 1000);
  state.last = now;
  const diff = state.target - state.shown;
  // Exponential approach: visual smoothing only; always converges to the scroll position.
  const k = 1 - Math.exp(-dt / 0.16); // ~0.35s glide: wheel notches blend into one motion
  state.shown = Math.abs(diff) < 0.0006 ? state.target : state.shown + diff * (dt ? k : 1);
  apply(state.shown);
  if (state.shown !== state.target) request(); else state.last = 0;
}
function request() { if (!state.raf) state.raf = requestAnimationFrame(tick); }

function apply(u) {
  const beat = state.static ? 'rest' : beatAt(u);
  if (beat !== state.beat) {
    state.beat = beat;
    story.dataset.beat = beat;
  }
  story.style.setProperty('--pour', Math.max(0, u).toFixed(4));
  state.stage?.setProgress(u);
  if (inspect.on && u > -0.75) setInspect(false);
}

function onScroll() {
  state.target = computeTarget();
  request();
}

/* ---------- static mode (reduced motion, no WebGL, save-data) ---------- */
function setStatic(on) {
  state.static = on;
  root.classList.toggle('hc-static', on);
  measure();
  state.shown = state.target;
  apply(state.shown);
  state.stage?.setReduced(state.reduced);
  if (on) fillStills();
}

let stillsDone = false;
function fillStills() {
  if (stillsDone || !state.stage) return;
  stillsDone = true;
  const shots = {open: 0.3, pour: 0.68, enjoy: 0.96}; // scroll positions (see storyClock)
  for (const [step, u] of Object.entries(shots)) {
    const img = document.querySelector(`[data-still="${step}"]`);
    try {
      img.src = state.stage.snapshot(u, 720, 900);
      img.alt = {open: 'ฉากเปิดขวดหาดใหญ่ แถบซีลลอกออกแล้ว ฝากำลังหมุนออก (โมเดลตัวแทน)', pour: 'ฉากเทน้ำจิ้มหาดใหญ่ลงถ้วย (โมเดลตัวแทน)', enjoy: 'ถ้วยน้ำจิ้มหาดใหญ่ที่เทพร้อมแล้ว (โมเดลตัวแทน)'}[step];
    } catch { /* keep concept fallback image */ }
  }
}

/* ---------- inspect ("หมุนดูขวด") ---------- */
const inspectBox = $('.hc-inspect');
const inspectBtn = $('.hc-inspect__toggle');
const resetBtn = $('.hc-inspect__reset');
const surface = $('.hc-inspect__surface');
const inspect = {on: false, x: 0, dragging: false};
function setInspect(on) {
  inspect.on = on;
  inspectBtn.setAttribute('aria-pressed', String(on));
  inspectBtn.textContent = on ? 'เลิกหมุน' : 'หมุนดูขวด';
  resetBtn.hidden = !on;
  root.classList.toggle('is-inspecting', on);
  state.stage?.setInspect(on);
}
inspectBtn.addEventListener('click', () => setInspect(!inspect.on));
resetBtn.addEventListener('click', () => { state.stage?.setInspect(false); state.stage?.setInspect(true); });
inspectBtn.addEventListener('keydown', e => {
  if (!inspect.on) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    state.stage?.rotateBy(e.key === 'ArrowLeft' ? -0.35 : 0.35);
  } else if (e.key === 'Escape') setInspect(false);
});
surface.addEventListener('pointerdown', e => { inspect.dragging = true; inspect.x = e.clientX; surface.setPointerCapture(e.pointerId); });
surface.addEventListener('pointermove', e => {
  if (!inspect.dragging) return;
  state.stage?.rotateBy((e.clientX - inspect.x) * 0.012);
  inspect.x = e.clientX;
});
const endDrag = () => { inspect.dragging = false; };
surface.addEventListener('pointerup', endDrag);
surface.addEventListener('pointercancel', endDrag);

/* ---------- ambient pointer (fine pointers only) ---------- */
const fine = matchMedia('(pointer: fine)');
window.addEventListener('pointermove', e => {
  if (!fine.matches || !state.stage || state.reduced || state.shown > 0) return;
  state.stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
}, {passive: true});

/* ---------- 3D upgrade ---------- */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function fail(reason) {
  console.info('[homechew] 3D stage unavailable, keeping poster:', reason?.message || reason);
  state.no3d = true;
  root.classList.remove('is-3d');
  root.classList.add('no-3d');
  inspectBox.hidden = true;
  state.stage?.setRunning(false);
  setStatic(true);
}

async function upgrade() {
  const saveData = navigator.connection?.saveData;
  if (saveData || !webglAvailable() || new URLSearchParams(location.search).has('no3d')) return fail('save-data or no WebGL');
  try {
    const {createStage} = await import('./scene/stage.js');
    const products = await fetch(base + 'data/products.json').then(r => r.json());
    const list = products.products.map(p => ({...p, ...LOOK[p.id]}));
    const stage = await createStage({canvas, base, products: list, onFail: fail});
    if (!stage) return;
    state.stage = stage;
    const rect = stageEl.getBoundingClientRect();
    stage.resize(rect.width, rect.height);
    stage.setReduced(state.reduced);
    stage.setProgress(state.shown);
    new ResizeObserver(([entry]) => {
      stage.resize(entry.contentRect.width, entry.contentRect.height);
      measure();
      onScroll();
    }).observe(stageEl);
    new IntersectionObserver(([e]) => stage.setVisible(e.isIntersecting)).observe(stageEl);
    document.addEventListener('visibilitychange', () => stage.setRunning(!document.hidden));
    requestAnimationFrame(() => {
      root.classList.add('is-3d');
      inspectBox.hidden = false;
      if (state.static) fillStills();
    });
  } catch (error) {
    fail(error);
  }
}

/* ---------- mobile CTA hides while the set itself is on screen ---------- */
const mobileCta = $('.hc-mobile-cta');
new IntersectionObserver(entries => {
  for (const e of entries) mobileCta.classList.toggle('is-hidden', e.isIntersecting);
}, {threshold: 0.15}).observe($('#set'));

/* ---------- flavour image parallax (2.5D) ---------- */
const media = [...document.querySelectorAll('.hc-flavor__media, [data-progress]')];
const visibleMedia = new Set();
const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting ? visibleMedia.add(e.target) : visibleMedia.delete(e.target)));
media.forEach(m => io.observe(m));
let parRaf = 0;
function parallax() {
  parRaf = 0;
  if (state.reduced) return;
  const vh = window.innerHeight;
  for (const m of visibleMedia) {
    const r = m.getBoundingClientRect();
    const t = ((r.top + r.height / 2) - vh / 2) / vh; // −1…1 around the viewport centre
    m.style.setProperty('--par', clamp(t, -1, 1).toFixed(3));
    // 0 as the element enters from below → 1 as it leaves at the top
    if (m.hasAttribute('data-progress')) m.style.setProperty('--t', clamp((vh - r.top) / (vh + r.height)).toFixed(3));
  }
}

/* ---------- boot ---------- */
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
state.reduced = reducedQuery.matches;
reducedQuery.addEventListener('change', e => {
  state.reduced = e.matches;
  setStatic(state.reduced || state.no3d);
});
setStatic(state.reduced);
window.addEventListener('scroll', () => {
  onScroll();
  if (!parRaf) parRaf = requestAnimationFrame(parallax);
}, {passive: true});
window.addEventListener('resize', () => { measure(); onScroll(); });
document.fonts?.ready.then(() => { measure(); onScroll(); });
// Start the 3D right after first paint (not after every image has loaded): the bottles are the hero.
requestAnimationFrame(() => setTimeout(() => upgrade(), 0));
window.addEventListener('load', () => { measure(); onScroll(); });
