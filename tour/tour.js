/**
 * บ้าน myClover — scroll-driven 3D house tour (runtime).
 * The DOM sections are the real content: every interactive object in the house is a
 * `[data-item]` link in index.html, which owns its label, description and URL. This module
 * moves the camera per section, opens the dollhouse, lets people pick objects up, plays the
 * house music, and runs the four-clover quest. No telemetry, no network calls beyond the page's
 * own files.
 */
import * as THREE from './vendor/three.module.min.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import Lenis from './vendor/lenis.mjs';
import {HD_LEVELS, createGovernor, updateGovernor, pixelRatio} from './quality.js';
import {makeTextures, FONT} from './textures.js';
import {buildHouse, H, F2, CLOVER_ROOMS, HERO_CLOVER} from './house.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2; // quint in-out: long rest, confident glide
const lerp = (a, b, t) => a + (b - a) * t;
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceQuery.matches;
reduceQuery.addEventListener?.('change', e => { reduced = e.matches; document.body.classList.toggle('reduced', reduced); });
document.body.classList.toggle('reduced', reduced);
document.documentElement.classList.add('js-ready'); // the inline boot guard in index.html stops waiting

/* ---------- smooth scrolling (mouse and trackpad; touch keeps the phone's own scroll) ---------- */
let lenis = null;
if (!reduced && matchMedia('(pointer: fine)').matches) {
  try { lenis = new Lenis({lerp: 0.075, wheelMultiplier: 0.85, anchors: {duration: 1.8}, autoRaf: true}); } catch { lenis = null; }
}

/* ---------- clover quest (per-viewer convenience only) ---------- */
const STORE_KEY = 'mc:tour:clovers:v1';
const found = new Set();
try { for (const id of JSON.parse(store.get(STORE_KEY, '[]'))) if (CLOVER_ROOMS.includes(id)) found.add(id); } catch {}
const LUCKY = [
  'ใบที่สี่ของโคลเวอร์คือ “โชค” อีกสามใบคือความหวัง ความเชื่อ และความรัก วันนี้คุณถือครบทั้งสี่',
  'คนที่หาโคลเวอร์เจอ คือคนที่ยอมมองให้ช้าลงอีกนิด และนั่นคือพรสวรรค์',
  'โชคดีมักมาในรูปบทสนทนาเล็ก ๆ ลองทักเรามาสักประโยค',
  'สิ่งที่คุณอยากเรียน อาจเป็นสิ่งที่เรากำลังอยากสอนพอดี',
  'บ้านหลังนี้ตั้งใจทำไว้รอใครสักคน วันนี้คนนั้นคือคุณ',
  'เรื่องดี ๆ ครั้งต่อไปของคุณ อาจเริ่มจากการกดปุ่มเล็ก ๆ ปุ่มเดียว',
  'คุณไม่ได้มาถึงที่นี่โดยบังเอิญ ความอยากรู้พาคุณมา',
];
let lastLucky = -1;
const drawLucky = () => { let i; do { i = Math.floor(Math.random() * LUCKY.length); } while (i === lastLucky); lastLucky = i; return LUCKY[i]; };
function openLucky() {
  const dlg = $('#lucky'), all = found.size === CLOVER_ROOMS.length;
  dlg.classList.toggle('golden', all);
  $('#lucky-kicker').textContent = all ? 'คุณเจอโคลเวอร์ครบสี่ใบ' : `โคลเวอร์ที่เจอ ${found.size}/4 ใบ`;
  $('#lucky-title').textContent = all ? 'คุณคือคนโชคดีของบ้านนี้' : 'วันนี้คุณโชคดี';
  $('#lucky-message').textContent = drawLucky();
  if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
}
$('#open-lucky')?.addEventListener('click', openLucky);
$('#lucky-again')?.addEventListener('click', () => { $('#lucky-message').textContent = drawLucky(); });
const roomName = id => ({living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', classroom: 'ห้องเรียน', office: 'ห้องโปรเจกต์'})[id] || 'บ้าน';

function renderCount(pop) {
  const btn = $('#clover-count'); if (!btn) return;
  $$('.leaves g', btn).forEach((leaf, i) => leaf.classList.toggle('on', i < found.size));
  $('.count-text', btn).textContent = `${found.size}/4`;
  btn.setAttribute('aria-label', `โคลเวอร์ที่เก็บได้ ${found.size} จาก 4 ใบ`);
  btn.classList.toggle('complete', found.size === CLOVER_ROOMS.length);
  if (pop) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  for (const b of $$('[data-find]')) if (found.has(b.dataset.find)) { b.classList.add('found'); b.textContent = '🍀 เก็บใบนี้แล้ว'; }
}
$('#clover-count')?.addEventListener('click', () => {
  if (found.size === CLOVER_ROOMS.length) return openLucky();
  const next = CLOVER_ROOMS.find(r => !found.has(r));
  showTip(`เหลืออีก ${4 - found.size} ใบ ลองดูใน${roomName(next)}`, innerWidth / 2, 90, 2600);
});

let tipTimer = 0, tipHoldUntil = 0;
function showTip(text, x, y, ms = 0) {
  const tip = $('#tip'); if (!tip) return;
  tip.textContent = text; tip.hidden = false;
  tip.style.left = `${clamp(x, 90, innerWidth - 90)}px`; tip.style.top = `${Math.max(y, 60)}px`;
  clearTimeout(tipTimer); tipHoldUntil = ms ? performance.now() + ms : 0;
  if (ms) tipTimer = setTimeout(hideTip, ms);
}
function hideTip() { const tip = $('#tip'); if (tip) tip.hidden = true; }

const scene3d = {collect: null, hint: null, pick: null, drop: null, glow: null}; // filled once WebGL is up
function collect(id, fromScene) {
  if (!CLOVER_ROOMS.includes(id) || found.has(id)) return;
  found.add(id); store.set(STORE_KEY, JSON.stringify([...found])); renderCount(true);
  if (!fromScene) scene3d.collect?.(id);
  if (found.size === CLOVER_ROOMS.length) setTimeout(openLucky, reduced ? 0 : 900);
}
for (const b of $$('[data-find]')) b.addEventListener('click', () => { // accessible path: hint first, then collect
  const id = b.dataset.find; if (found.has(id)) return;
  if (b.dataset.armed) return collect(id, false);
  b.dataset.armed = '1'; b.textContent = `💡 ${b.dataset.hint} (กดอีกครั้งเพื่อเก็บ)`;
  scene3d.hint?.(id);
});
renderCount(false);

/* ---------- house music: the myClover instrumental, only when someone asks for it ---------- */
const song = $('#song'), musicBtn = $('#music');
let musicOn = false;
function paintMusic(on) {
  musicOn = on; if (!musicBtn) return;
  musicBtn.classList.toggle('playing', on); musicBtn.setAttribute('aria-pressed', String(on));
  $('.music-state', musicBtn).textContent = on ? 'กำลังเล่น · แตะเพื่อหยุด' : 'เปิดเพลงประจำบ้าน';
}
function toggleMusic() {
  if (!song) return;
  if (song.paused) song.play().catch(() => paintMusic(false)); else song.pause();
}
musicBtn?.addEventListener('click', toggleMusic);
song?.addEventListener('play', () => paintMusic(true));
song?.addEventListener('pause', () => paintMusic(false));

/* ---------- inspect panel: "picking up" an object ---------- */
const itemLink = id => $(`[data-item="${id}"]`);
const sceneOfItem = id => itemLink(id)?.closest('[data-scene]')?.dataset.scene;
let inspecting = null;
function openInspect(id) {
  const a = itemLink(id); if (!a) return;
  const panel = $('#inspect');
  $('#inspect-room').textContent = a.closest('section')?.querySelector('.eyebrow')?.textContent.replace(/^\d+\s*/, '') || 'บ้าน myClover';
  $('#inspect-title').textContent = a.textContent.replace('→', '').trim();
  $('#inspect-desc').textContent = a.dataset.desc || '';
  $('#inspect-go').href = a.getAttribute('href');
  panel.hidden = false; requestAnimationFrame(() => panel.classList.add('open'));
  if (inspecting && inspecting !== id) scene3d.drop?.(inspecting);
  inspecting = id; scene3d.pick?.(id); hideTip();
}
function closeInspect() {
  const panel = $('#inspect'); if (!inspecting) return;
  scene3d.drop?.(inspecting); inspecting = null;
  panel.classList.remove('open'); setTimeout(() => { if (!inspecting) panel.hidden = true; }, 250);
}
$('.inspect-close')?.addEventListener('click', closeInspect);
addEventListener('keydown', e => { if (e.key === 'Escape') closeInspect(); });
// hovering or focusing a link in a card lights up the same object in the house
for (const a of $$('[data-item]')) {
  a.addEventListener('pointerenter', () => scene3d.glow?.(a.dataset.item, true));
  a.addEventListener('pointerleave', () => scene3d.glow?.(a.dataset.item, false));
  a.addEventListener('focus', () => scene3d.glow?.(a.dataset.item, true));
  a.addEventListener('blur', () => scene3d.glow?.(a.dataset.item, false));
}

/* ---------- cards: masked headline reveal, staggered chips; hero drifts away on scroll ---------- */
for (const h of $$('.card h2, .hero-card h1 .line')) h.innerHTML = `<span class="rise">${h.innerHTML}</span>`;
for (const list of $$('.items')) $$('li', list).forEach((li, i) => li.style.setProperty('--i', i));
const sections = $$('[data-scene]');
const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) e.target.querySelector('.card')?.classList.add('in'); }, {threshold: 0.2});
sections.forEach(s => io.observe(s));
function setRail(id) { for (const a of $$('[data-rail]')) { const on = a.dataset.rail === id || (id === 'door' && a.dataset.rail === 'hero') || (id === 'stairs' && a.dataset.rail === 'classroom'); a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); } }
const heroCard = $('.hero-card');
function heroDrift() { if (!heroCard || reduced) return; const k = clamp(scrollY / (innerHeight * 0.7)); heroCard.style.setProperty('--drift', k.toFixed(3)); }
addEventListener('scroll', heroDrift, {passive: true}); heroDrift();

/* ---------- quality toggle ---------- */
let quality = store.get('mc:tour:quality', 'sd') === 'hd' ? 'hd' : 'sd';
function renderQuality() { for (const b of $$('[data-quality]')) b.setAttribute('aria-pressed', String(b.dataset.quality === quality)); }
renderQuality();

/* ---------- WebGL boot ---------- */
const canvas = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}); } catch { document.body.classList.add('no-webgl'); }
const finishLoading = () => document.body.classList.remove('is-loading');
if (!renderer) finishLoading();
else boot().catch(err => { console.error(err); document.body.classList.add('no-webgl'); finishLoading(); }); // the story still works without the house

async function boot() {
  const touch = matchMedia('(pointer: coarse)').matches;
  const mobile = touch && Math.min(screen.width, screen.height) < 820;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // reused by the colour, normals and bloom passes
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 500); // near 0.3 m: more depth precision on phones (less z-flicker)

  /* sky dome: smooth gradient, no flat colour flips */
  const skyU = {top: {value: new THREE.Color()}, mid: {value: new THREE.Color()}, bottom: {value: new THREE.Color()}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bottom, smoothstep(0.0, 0.2, -h)); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}',
  }));
  scene.add(sky);
  const SKY = {
    day: [new THREE.Color('#8fcbe8'), new THREE.Color('#e3f1e6'), new THREE.Color('#cfe6dc')],
    warm: [new THREE.Color('#e9d2b0'), new THREE.Color('#f4e7d2'), new THREE.Color('#efe2cb')],
    dusk: [new THREE.Color('#0f1733'), new THREE.Color('#40406a'), new THREE.Color('#2a3050')],
  };
  scene.fog = new THREE.Fog(new THREE.Color(), 50, 170);

  const STARS = 600, starGeo = new THREE.BufferGeometry(), starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.42; starPos.set([Math.cos(th) * Math.sin(ph) * 250, Math.cos(ph) * 250 + 10, Math.sin(th) * Math.sin(ph) * 250], i * 3); }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const starMat = new THREE.PointsMaterial({size: 1.8, map: dotTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false});
  scene.add(new THREE.Points(starGeo, starMat));

  const MOTES = mobile ? 160 : 320, moteGeo = new THREE.BufferGeometry(), motePos = new Float32Array(MOTES * 3), moteSeed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) { motePos.set([(Math.random() - 0.5) * 46 - 1, Math.random() * 6, (Math.random() - 0.5) * 22 + 2], i * 3); moteSeed[i] = Math.random() * 100; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({size: 0.1, map: dotTex, color: '#fff2c4', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending});
  scene.add(new THREE.Points(moteGeo, moteMat));

  const hemi = new THREE.HemisphereLight('#e8f6ff', '#6b8f5e', 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  const sunDay = new THREE.Color('#fff1d6'), sunNight = new THREE.Color('#9fb4ff');
  const sunOffset = new THREE.Vector3(14, 22, 16), lightDist = sunOffset.length();
  const lightDir = sunOffset.clone().normalize().negate(); // direction the light travels
  const lightRight = new THREE.Vector3().crossVectors(lightDir, new THREE.Vector3(0, 1, 0)).normalize();
  const lightUp = new THREE.Vector3().crossVectors(lightRight, lightDir).normalize(), snapCenter = new THREE.Vector3();

  /* ----- HD post-processing: loaded only when someone picks HD ----- */
  let post = null;
  const loadPost = () => post || (post = Promise.all([
    import('./vendor/addons/postprocessing/EffectComposer.js'), import('./vendor/addons/postprocessing/RenderPass.js'),
    import('./vendor/addons/postprocessing/GTAOPass.js'), import('./vendor/addons/postprocessing/UnrealBloomPass.js'),
    import('./vendor/addons/postprocessing/OutputPass.js'),
  ]).then(([a, b, c, d, e]) => ({...a, ...b, ...c, ...d, ...e})));

  /* ----- adaptive quality: keep HD surfaces and props; trade screen effects and resolution
   * for stable motion. Level 0 = full effects; each step is cheaper. ----- */
  const gov = createGovernor(mobile);
  const maxRatio = () => pixelRatio({width: canvas.clientWidth || innerWidth, height: canvas.clientHeight || innerHeight, dpr: devicePixelRatio, hd: quality === 'hd', mobile, level: gov.level});

  /* ----- house (rebuilt when quality changes) ----- */
  let house = null, tex = null, composer = null, aoPass = null, bloomPass = null;
  const bursts = [], loadedRooms = new Set();
  let building = false;
  function disposePost() {
    if (!composer) return;
    aoPass?.gtaoMaterial.dispose(); // r180's GTAOPass.dispose omits its AO shader material
    for (const pass of composer.passes) pass.dispose?.();
    composer.dispose(); composer = aoPass = bloomPass = null;
  }
  async function build() {
    const hd = quality === 'hd';
    const pp = hd ? await loadPost() : null;
    if (house) {
      scene.remove(house.root);
      const geometries = new Set(), materials = new Set();
      house.root.traverse(o => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        for (const m of [].concat(o.material || [])) materials.add(m);
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      tex.dispose();
    }
    Object.assign(gov, createGovernor(mobile));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxRatio()));
    renderer.shadowMap.enabled = hd || !mobile;
    sun.castShadow = renderer.shadowMap.enabled;
    sun.shadow.mapSize.set(hd && !mobile ? 2048 : 1024, hd && !mobile ? 2048 : 1024);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    tex = makeTextures(renderer, hd);
    house = buildHouse({renderer, hd, tex, found, mobile, art});
    scene.add(house.root);
    loadedRooms.clear();
    if (hd) {
      // Complete art uploads before shader warm-up, not halfway through the first HD walk.
      const pictures = [];
      for (const [id, loaders] of house.lazy) { loadedRooms.add(id); for (const load of loaders) pictures.push(load()); }
      let deadline;
      try { await Promise.race([Promise.all(pictures), new Promise(resolve => { deadline = setTimeout(resolve, 4000); })]); }
      finally { clearTimeout(deadline); }
    } else loadRoomsNear(progress());
    disposePost();
    if (pp) { // HD: ambient occlusion in corners and under furniture, soft glow on lamps and screens
      composer = new pp.EffectComposer(renderer);
      composer.addPass(new pp.RenderPass(scene, camera));
      const ao = aoPass = new pp.GTAOPass(scene, camera, 1, 1);
      // AO at half resolution with fewer samples: it is soft by nature, and this is most of HD's cost
      ao.setSize = (w, h) => pp.GTAOPass.prototype.setSize.call(ao, Math.max(1, w >> 1), Math.max(1, h >> 1));
      ao.updateGtaoMaterial({radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 8});
      ao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 6});
      ao.blendIntensity = 0.95;
      // AO renders depth/normals with an override material: keep glow sprites, particles, the sky
      // and see-through meshes (smoke, halo, invisible tap areas) out of it, or they turn into dark blocks
      ao._overrideVisibility = function () {
        const cache = this._visibilityCache;
        this.scene.traverse(o => {
          if (!o.visible) return;
          if (o.isPoints || o.isLine || o.isSprite || o === sky || (o.isMesh && [].concat(o.material).some(m => m?.transparent))) { o.visible = false; cache.push(o); }
        });
      };
      composer.addPass(ao);
      composer.addPass(bloomPass = new pp.UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.4, 2.4)); // threshold above lit walls: only lamps and screens glow
      composer.addPass(new pp.OutputPass());
    }
    shadowSpan = 0; applyGovernor();
    renderer.shadowMap.needsUpdate = true;
    // compile every material now, while the loader is up, instead of as each room first comes into view
    try { await renderer.compileAsync(scene, camera); } catch {}
    // compileAsync covers scene materials, not post-process and shadow shaders. Warm those
    // behind the loader too, including AO which may be enabled later by the governor.
    targetFor(progress(), camera.aspect < 1);
    camera.position.copy(wantPos); camera.lookAt(wantLook);
    if (composer) {
      aoPass.enabled = bloomPass.enabled = true;
      composer.render();
      aoPass.enabled = HD_LEVELS[gov.level].ao; bloomPass.enabled = HD_LEVELS[gov.level].bloom;
    } else renderer.render(scene, camera);
    renderer.shadowMap.needsUpdate = true;
  }
  function applyGovernor() {
    if (aoPass) aoPass.enabled = HD_LEVELS[gov.level].ao;
    if (bloomPass) bloomPass.enabled = HD_LEVELS[gov.level].bloom;
    sizeCanvas(true);
  }
  function governor(rawDt) {
    if (quality === 'hd' && updateGovernor(gov, rawDt)) applyGovernor();
  }

  /* ----- camera: one continuous spline through every shot ----- */
  const SHOTS = {
    // phone: [distance scale, look-height shift] for portrait screens where the card sits below
    // phoneShot: absolute framing for portrait exteriors
    hero: {pos: [1.0, 7.8, 31.5], look: [1.0, 8.3, 0], phoneShot: {pos: [-0.4, 5.6, 33], look: [-0.4, 10.6, 0]}},
    door: {pos: [-4.7, 2.2, 11.5], look: [-5.5, 1.6, 3.6], phone: [1.3, -0.8]},
    // rooms: eye level just under the ceiling, so the floor above stays out of frame
    living: {pos: [-2.6, 2.65, 7.4], look: [-4.1, 0.85, -1]},
    kitchen: {pos: [5.4, 2.65, 7.4], look: [3.9, 0.95, -1]},
    stairs: {pos: [7.6, 3.6, 9.2], look: [10.1, 2.3, -0.8], phone: [1.2, -0.6]},
    classroom: {pos: [5.4, F2 + 2.65, 7.4], look: [3.9, F2 + 1.05, -1]},
    office: {pos: [-2.6, F2 + 2.65, 7.4], look: [-4.1, F2 + 1.05, -1]},
    finale: {pos: [8, 5.6, 28], look: [1.0, 3.4, 0], phoneShot: {pos: [3.2, 4.4, 37], look: [0.4, 3.4, 0]}},
  };
  const order = sections.map(s => s.dataset.scene).filter(id => SHOTS[id]);
  const idx = id => order.indexOf(id);
  let anchors = [];
  function measure() {
    const vh = innerHeight;
    anchors = sections.filter(s => SHOTS[s.dataset.scene]).map((s, i) => i === 0 ? 0 : s.offsetTop + s.offsetHeight / 2 - vh / 2);
  }
  function progress() {
    const y = scrollY;
    if (!anchors.length || y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }
  let pathPos = null, pathLook = null, pathPortrait = null;
  function buildPath(portrait) {
    const P = [], L = [];
    for (const id of order) {
      const s = SHOTS[id], p = new THREE.Vector3(...s.pos), l = new THREE.Vector3(...s.look);
      if (portrait && s.phoneShot) { p.set(...s.phoneShot.pos); l.set(...s.phoneShot.look); }
      else if (portrait) { const [k, dy] = s.phone || [1.18, -0.95]; p.sub(l).multiplyScalar(k).add(l); l.y += dy; }
      P.push(p); L.push(l);
    }
    pathPos = new THREE.CatmullRomCurve3(P, false, 'centripetal'); pathLook = new THREE.CatmullRomCurve3(L, false, 'centripetal'); pathPortrait = portrait;
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const velPos = new THREE.Vector3(), velLook = new THREE.Vector3();
  function targetFor(p, portrait) {
    if (pathPortrait !== portrait) buildPath(portrait);
    const n = order.length - 1, i = Math.min(Math.floor(p), n), u = p - i;
    const f = ease(clamp((u - 0.12) / 0.76)); // hold at each room, glide in between
    const s = n ? Math.min(i + f, n) / n : 0;
    pathPos.getPoint(s, wantPos); pathLook.getPoint(s, wantLook);
    const j = Math.min(i + 1, n);
    if (i !== j && order[i] !== 'hero' && order[j] !== 'finale') wantPos.z += Math.sin(f * Math.PI) * 0.9; // gentle dolly-out between rooms
  }
  // critically damped spring (no overshoot, no lag spikes when a frame is slow)
  function smoothDamp(cur, target, vel, time, dt) {
    const w = 2 / time, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    for (const k of ['x', 'y', 'z']) {
      const ch = cur[k] - target[k], tmp = (vel[k] + w * ch) * dt;
      vel[k] = (vel[k] - w * tmp) * e; cur[k] = target[k] + (ch + tmp) * e;
    }
  }

  /* ----- sizing: follow the canvas' CSS box (100lvh), ignore mobile toolbar jitter ----- */
  let viewShift = 0, viewLift = 0, lastW = 0, lastH = 0, shadowSpan = 0;
  function sizeCanvas(force) {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (!force && w === lastW && (Math.abs(h - lastH) < 1 || (touch && Math.abs(h - lastH) < 160))) { measure(); return; }
    lastW = w; lastH = h;
    renderer.setPixelRatio(maxRatio());
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect >= 1 ? 45 : Math.min(80, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect) * 180 / Math.PI);
    viewShift = viewLift = NaN; camera.updateProjectionMatrix();
    measure();
  }
  addEventListener('resize', () => sizeCanvas(false));
  new ResizeObserver(() => measure()).observe(document.body); // late fonts or images change section heights

  /* ----- pictures load room by room: the next room's images arrive while you look at this one ----- */
  function loadRoomsNear(p) {
    if (!house) return;
    const i = Math.round(p), want = new Set(['outside']);
    for (let k = i - 1; k <= i + 2; k++) { const id = order[k]; if (id === 'door' || id === 'hero') want.add('living'); if (id) want.add(id); }
    for (const id of want) if (!loadedRooms.has(id)) { loadedRooms.add(id); for (const load of house.lazy.get(id) || []) load(); }
  }

  /* ----- picking: the first thing the ray meets wins, so walls and furniture block what is behind them ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mouse = {x: 0, y: 0, tx: 0, ty: 0};
  let hovered = null, downAt = null, currentScene = '';
  const glowing = new Set();
  const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  const seeThrough = o => [].concat(o.material).every(m => m?.transparent && m.opacity < 0.5);
  function pick(x, y) {
    if (!house) return null;
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    // glowing beacons float above everything (drawn without depth), so they are checked first
    for (const h of house.hotspots) if (h.beacon?.visible && h.beacon.material.opacity > 0.05 && ray.intersectObject(h.beacon).length && inReach(h.id)) return {type: 'item', id: h.id};
    if (!house.pickList) { // every solid mesh, minus the big instanced crowds (meadow, books) that only cost time
      house.pickList = []; house.root.traverse(o => { if (o.isMesh && !(o.isInstancedMesh && o.count > 60)) house.pickList.push(o); });
    }
    for (const hit of ray.intersectObjects(house.pickList, false)) {
      const o = hit.object, u = o.userData;
      if (!shown(o) || o.isSprite || o.isPoints) continue;
      if (u.collect) { if (house.collectibles.get(u.collect)?.userData.gone) continue; return currentScene === u.collect ? {type: 'clover', id: u.collect} : null; }
      if (u.item) return inReach(u.item) ? {type: 'item', id: u.item} : null;
      if (u.music) return {type: 'music'};
      if (seeThrough(o)) continue; // glass rails, steam, glow: look through them
      return null; // a wall, a table, a floor: nothing to pick behind it
    }
    return null;
  }
  // only what belongs to the room you are standing in (the big clover belongs to the outside views)
  const inReach = id => id === 'meet' ? ['hero', 'door', 'finale'].includes(currentScene) : sceneOfItem(id) === currentScene;
  const overUI = e => e.target !== canvas && e.target.closest?.('a,button,.card,dialog,nav,header,aside');
  const labelOf = id => (itemLink(id)?.textContent || '').replace('→', '').trim();
  let moveQueued = null;
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1;
    if (e.pointerType !== 'mouse' || !house) return;
    moveQueued = overUI(e) ? {ui: true} : {x: e.clientX, y: e.clientY}; // resolved once per frame
  }, {passive: true});
  function hoverFrame() {
    if (!moveQueued) return; const m = moveQueued; moveQueued = null;
    const hit = m.ui ? null : pick(m.x, m.y);
    hovered = hit; document.body.style.cursor = hit ? 'pointer' : '';
    if (hit?.type === 'item') showTip(`${labelOf(hit.id)} · คลิกเพื่อหยิบ`, m.x, m.y);
    else if (hit?.type === 'clover') showTip('เจอแล้ว! คลิกเพื่อเก็บ 🍀', m.x, m.y);
    else if (hit?.type === 'music') showTip(musicOn ? 'แตะเพื่อหยุดเพลง' : 'แตะเพื่อเปิดเพลงประจำบ้าน 🎵', m.x, m.y);
    else if (performance.now() > tipHoldUntil) hideTip();
  }
  addEventListener('pointerdown', e => { downAt = overUI(e) ? null : {x: e.clientX, y: e.clientY, t: e.timeStamp}; }, {passive: true});
  addEventListener('pointerup', e => {
    if (!downAt || !house) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), quick = e.timeStamp - downAt.t < 500; downAt = null;
    if (moved > 8 || !quick) return;
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return closeInspect();
    if (hit.type === 'clover') { collectFromScene(hit.id); showTip(`เก็บได้แล้ว ${found.size}/4 🍀`, e.clientX, e.clientY, 1600); }
    else if (hit.type === 'music') toggleMusic();
    else openInspect(hit.id);
  });
  function collectFromScene(id) { collect(id, true); flyAway(id); }
  function flyAway(id) {
    const c = house?.collectibles.get(id); if (!c || !c.visible) return;
    burst(c.position.clone(), '#9dffc3', 70); c.userData.gone = 0.0001;
  }
  function burst(at, color, n = 60) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 0.5, (Math.random() - 0.5) * 3)); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({size: 0.16, map: dotTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    scene.add(pts); bursts.push({pts, vel, life: 0});
  }
  const hotById = id => house?.hotspots.find(h => h.id === id);
  scene3d.collect = flyAway;
  scene3d.hint = id => { const c = house?.collectibles.get(id); if (c) c.userData.hint = 1; };
  scene3d.pick = id => { const h = hotById(id); if (h) h.picked = true; };
  scene3d.drop = id => { const h = hotById(id); if (h) h.picked = false; };
  scene3d.glow = (id, on) => { if (on) glowing.add(id); else glowing.delete(id); };

  for (const b of $$('[data-quality]')) b.addEventListener('click', () => {
    if (building || b.dataset.quality === quality) return;
    quality = b.dataset.quality; store.set('mc:tour:quality', quality); renderQuality();
    $('#loader-text').textContent = quality === 'hd' ? 'กำลังจัดบ้านแบบ HD…' : 'กำลังจัดบ้านแบบ SD…';
    building = true;
    for (const button of $$('[data-quality]')) button.disabled = true;
    document.body.classList.add('is-loading');
    setTimeout(async () => {
      const keep = inspecting; closeInspect();
      try { await build(); if (keep) openInspect(keep); }
      catch (err) { console.error(err); document.body.classList.add('no-webgl'); }
      finally {
        clock.getDelta(); building = false; first = true;
        for (const button of $$('[data-quality]')) button.disabled = false;
        if (document.body.classList.contains('no-webgl')) finishLoading();
      }
    }, 60);
  });

  /* ----- render loop ----- */
  const clock = new THREE.Clock(), tmp = new THREE.Vector3(), camDir = new THREE.Vector3(), towardCam = new THREE.Vector3();
  let first = true, running = true, lastShadow = -Infinity, lastShadowProgress = -1;
  const frameStats = {calls: 0, triangles: 0};
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  function frame() {
    if (!running) return;
    if (building) { requestAnimationFrame(frame); return; }
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, still = reduced;
    const p = progress(), fin = idx('finale'), portrait = camera.aspect < 1;

    const sceneId = order[Math.round(p)];
    if (sceneId !== currentScene) { currentScene = sceneId; setRail(sceneId); loadRoomsNear(p); if (inspecting && sceneOfItem(inspecting) !== sceneId) closeInspect(); }
    hoverFrame();

    // camera: spline target, critically damped follow; a slow breath while resting in a room
    targetFor(p, portrait);
    if (first || still) { camPos.copy(wantPos); camLook.copy(wantLook); velPos.set(0, 0, 0); velLook.set(0, 0, 0); }
    else { const k = lenis ? 0.32 : 0.45; smoothDamp(camPos, wantPos, velPos, k, dt); smoothDamp(camLook, wantLook, velLook, k * 0.9, dt); }
    mouse.x = lerp(mouse.x, still ? 0 : mouse.tx, 1 - Math.exp(-dt * 2)); mouse.y = lerp(mouse.y, still ? 0 : mouse.ty, 1 - Math.exp(-dt * 2));
    camera.position.copy(camPos); camera.position.x += mouse.x * 0.3; camera.position.y -= mouse.y * 0.15;
    if (!still) { camera.position.x += Math.sin(t * 0.21) * 0.12; camera.position.y += Math.sin(t * 0.29) * 0.05; }
    camera.lookAt(camLook);

    // dollhouse: door swings, facade sinks, roof lifts; everything stays opaque
    const doorOpen = ease(clamp((p - 0.45) / 0.65));
    const inside = ease(clamp((p - 1.1) / 0.7)) * (1 - ease(clamp((p - (fin - 0.75)) / 0.6)));
    const dusk = ease(clamp((p - (fin - 0.9)) / 0.8));
    house.door.rotation.y = -doorOpen * 1.7 * (1 - dusk);
    // floor-1 front sinks into the ground; floor-2 front and the roofs lift away together
    house.facade.position.y = -inside * (H + 0.6); house.facade.visible = inside < 0.995;
    house.upper.position.y = house.roof.position.y = inside * 10; house.upper.visible = house.roof.visible = inside < 0.995;
    house.flowers.visible = inside < 0.5;
    const shift = camera.aspect > 1.15 ? -0.17 * inside : 0; // desktop: room sits beside the card
    const lift = portrait ? 0.15 * inside : 0; // phone: room sits above the card, not below an empty sky
    if (Number.isNaN(viewShift) || Math.abs(shift - viewShift) > 0.0005 || Math.abs(lift - viewLift) > 0.0005) {
      viewShift = shift; viewLift = lift;
      if (shift || lift) camera.setViewOffset(lastW, lastH, shift * lastW, lift * lastH, lastW, lastH); else camera.clearViewOffset();
    }

    // mood
    ['top', 'mid', 'bottom'].forEach((key, i) => skyU[key].value.copy(SKY.day[i]).lerp(SKY.warm[i], inside).lerp(SKY.dusk[i], dusk));
    scene.fog.color.copy(skyU.bottom.value);
    hemi.intensity = lerp(1.35, 0.3, dusk); sun.intensity = lerp(2.4, 0.2, dusk);
    sun.color.lerpColors(sunDay, sunNight, dusk);
    scene.environmentIntensity = lerp(quality === 'hd' ? 0.6 : 0.5, 0.1, dusk);
    starMat.opacity = dusk * 0.9;
    const lampsOn = Math.max(inside * 0.8, dusk);
    for (const l of house.lights) l.intensity = lampsOn * l.userData.max;
    house.glassMat.emissiveIntensity = dusk * 1.6;
    house.cloverLight.intensity = (1 - inside) * (4 + dusk * 18);
    house.heroMat.emissiveIntensity = 0.35 + dusk * 0.9;
    renderer.toneMappingExposure = lerp(1.05, 1.2, dusk);
    document.body.classList.toggle('night', dusk > 0.5);
    const span = Math.round(lerp(26, 10, inside));
    if (span !== shadowSpan) { shadowSpan = span; Object.assign(sun.shadow.camera, {left: -span, right: span, top: span * 0.65, bottom: -span * 0.5, near: 1, far: 80}); sun.shadow.camera.updateProjectionMatrix(); }
    // follow the view in whole shadow-map texels (in light space), so shadow edges never shimmer
    snapCenter.set(camLook.x, camLook.y - 1, 0);
    const tx = 2 * span / sun.shadow.mapSize.x, ty = span * 1.15 / sun.shadow.mapSize.y;
    const r = Math.round(snapCenter.dot(lightRight) / tx) * tx, u = Math.round(snapCenter.dot(lightUp) / ty) * ty, f = snapCenter.dot(lightDir);
    snapCenter.copy(lightRight).multiplyScalar(r).addScaledVector(lightUp, u).addScaledVector(lightDir, f);
    sun.target.position.copy(snapCenter); sun.position.copy(snapCenter).addScaledVector(lightDir, -lightDist);

    // hero clover
    const hc = house.heroClover;
    const cloverAt = portrait ? HERO_CLOVER.tall : HERO_CLOVER.wide; // keep it inside a phone's narrow frame
    hc.rotation.y = still ? 0.3 : t * 0.45; hc.position.y = cloverAt[1] + (still ? 0 : Math.sin(t * 1.2) * 0.25);
    hc.position.x = house.halo.position.x = house.cloverLight.position.x = cloverAt[0];
    hc.visible = house.halo.visible = inside < 0.9; // outside views only: it would float into the upstairs rooms
    house.halo.position.y = hc.position.y; house.halo.lookAt(camera.position); house.halo.material.opacity = 0.45 * (1 - inside);

    // hotspots: hover lift, picked-up objects float toward you, beacons near the current view
    camera.getWorldDirection(camDir);
    for (const h of house.hotspots) {
      if (h.root === hc) continue; // the big clover animates itself above
      const hov = (hovered?.type === 'item' && hovered.id === h.id) || glowing.has(h.id);
      tmp.copy(h.base);
      if (h.picked) { tmp.y += 0.22 + (still ? 0 : Math.sin(t * 2) * 0.03); tmp.addScaledVector(towardCam.copy(camDir).applyQuaternion(h.invParent), -0.25); }
      else if (hov) tmp.y += 0.06;
      h.root.position.lerp(tmp, still ? 1 : 1 - Math.exp(-dt * 10));
      h.root.rotation.y = h.rot.y + (h.picked && !still ? Math.sin(t * 1.5) * 0.18 : 0);
      if (h.beacon) {
        const here = inReach(h.id) ? 1 : 0;
        const near = clamp(1 - Math.hypot(h.beacon.position.x - camLook.x, (h.beacon.position.y - camLook.y) * 1.6) / 5.5) * inside * here; // this room, this floor
        const want = h.picked ? 0 : near * (hov ? 1 : 0.85);
        h.beacon.material.opacity = lerp(h.beacon.material.opacity, want, 1 - Math.exp(-dt * 6));
        h.beacon.scale.setScalar((hov ? 0.36 : 0.26) * (1 + (still ? 0 : Math.sin(t * 3 + h.beacon.position.x) * 0.15)));
        h.beacon.visible = h.beacon.material.opacity > 0.01;
      }
    }
    if (house.music) house.music.userData.playing = lerp(house.music.userData.playing, musicOn ? 1 : 0, 1 - Math.exp(-dt * 3));

    // hidden clovers
    for (const c of house.collectibles.values()) {
      const u = c.userData; if (!c.visible) continue;
      if (u.gone > 0) { u.gone += dt * 1.6; c.position.y += dt * 3; c.rotation.y += dt * 12; c.scale.setScalar(0.17 * (1 - u.gone) + 0.001); if (u.gone >= 1) c.visible = false; continue; }
      u.hint = Math.max(0, u.hint - dt * 0.25);
      c.position.y = u.base.y + (still ? 0 : Math.sin(t * 2 + u.base.x) * 0.04);
      c.rotation.y = still ? 0.4 : t * 1.3 + u.base.x;
      const hov = hovered?.type === 'clover' && hovered.id === u.id;
      c.scale.setScalar(0.17 * (1 + (hov ? 0.35 : 0) + u.hint * (0.6 + Math.sin(t * 10) * 0.2)));
      c.children[0].material.emissiveIntensity = 0.5 + u.hint * 2 + (hov ? 0.8 : 0);
    }

    if (!still) {
      for (const s of house.steam) { const ph = (t * 0.35 + s.userData.phase) % 1; s.position.copy(s.userData.base); s.position.y += ph * 1.1; s.position.x += Math.sin(ph * 6 + t) * 0.08; s.scale.setScalar(0.6 + ph * 1.6); s.material.opacity = 0.4 * (1 - ph); }
      const arr = moteGeo.attributes.position.array;
      for (let i = 0; i < MOTES; i++) { const sd = moteSeed[i]; arr[i * 3 + 1] += dt * (0.06 + (sd % 1) * 0.08); arr[i * 3] += Math.sin(t * 0.3 + sd) * dt * 0.04; if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = 0; }
      moteGeo.attributes.position.needsUpdate = true;
      for (const fn of house.tickers) fn(t, dt);
    }
    moteMat.color.set(dusk > 0.5 ? '#c8ff8a' : '#fff2c4'); moteMat.size = lerp(0.1, 0.2, dusk); moteMat.opacity = 0.3 + dusk * 0.6;

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt; const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, n) => { v.y -= dt * 3; arr[n * 3] += v.x * dt; arr[n * 3 + 1] += v.y * dt; arr[n * 3 + 2] += v.z * dt; });
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.4);
      if (b.life > 1.4) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }

    // Shadow geometry changes much more slowly than the camera. Never redraw it in every
    // post-processing pass; refresh at 24 Hz during motion, once when reduced motion rests.
    if (first || ((p !== lastShadowProgress || !still || bursts.length || inspecting || hovered) && t - lastShadow >= 1 / 24)) {
      renderer.shadowMap.needsUpdate = true; lastShadow = t; lastShadowProgress = p;
    }
    renderer.info.reset();
    if (composer && (aoPass?.enabled || bloomPass?.enabled)) composer.render(); else renderer.render(scene, camera);
    frameStats.calls = renderer.info.render.calls; frameStats.triangles = renderer.info.render.triangles;
    if (first) { first = false; finishLoading(); } else governor(rawDt);
    requestAnimationFrame(frame);
  }

  // canvas labels in the house use the page font: wait for it (briefly) before drawing them
  try { await Promise.race([Promise.all([500, 600, 700, 800].map(weight => document.fonts.load(`${weight} 48px ${FONT.split(',')[0]}`, 'ยินดีต้อนรับ ครัวเอโกะ Resume'))), new Promise(r => setTimeout(r, 1500))]); } catch {}
  // purpose-made art (IMAGE-PROMPTS.md): slots listed here replace borrowed images
  const art = new Map();
  try {
    const r = await fetch('/tour/art/manifest.json', {cache: 'no-cache'});
    if (r.ok) for (const [slot, file] of Object.entries((await r.json()).slots || {})) if (/^[\w.-]+\.(webp|jpe?g|png)$/.test(file)) art.set(slot, file);
  } catch {}
  measure();
  await build();
  targetFor(progress(), camera.aspect < 1); camPos.copy(wantPos); camLook.copy(wantLook);
  requestAnimationFrame(frame);

  // read-only test hook: progress, scene order, quality, and where things sit on screen
  window.__tour = {
    progress, order, found, quality: () => quality, items: () => house.hotspots.map(h => h.id), inspecting: () => inspecting, pickAt: (x, y) => pick(x, y),
    level: () => gov.level, music: () => musicOn,
    stats: () => ({...frameStats, pixelRatio: renderer.getPixelRatio(), textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, programs: renderer.info.programs.length, batchedMeshes: house.batchedMeshes, ao: !!aoPass?.enabled, bloom: !!bloomPass?.enabled, building}),
    screenOf(id) {
      const obj = id === 'music' ? house?.music : house?.collectibles.get(id) || hotById(id)?.root; if (!obj || !obj.visible) return null;
      const v = (house.collectibles.has(id) ? obj.getWorldPosition(new THREE.Vector3()) : new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3())).project(camera);
      return {x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight};
    },
  };
}
