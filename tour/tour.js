/**
 * บ้าน myClover — scroll-driven 3D house tour (runtime).
 * The DOM sections are the real content: every interactive object in the house is a
 * `[data-item]` link in index.html, which owns its label, description and URL. This module
 * moves the camera per section, opens the dollhouse, lets people pick objects up, and runs
 * the four-clover quest. No telemetry, no network calls beyond the page's own images.
 */
import * as THREE from './vendor/three.module.min.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {makeTextures} from './textures.js';
import {buildHouse, H, CLOVER_ROOMS} from './house.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceQuery.matches;
reduceQuery.addEventListener?.('change', e => { reduced = e.matches; document.body.classList.toggle('reduced', reduced); });
document.body.classList.toggle('reduced', reduced);

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
const roomName = id => ({living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', classroom: 'ห้องเรียน', office: 'ห้องคอม'})[id] || 'บ้าน';

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

/* ---------- inspect panel: "picking up" an object ---------- */
const itemLink = id => $(`[data-item="${id}"]`);
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

/* ---------- card reveal + rail ---------- */
const sections = $$('[data-scene]');
const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) e.target.querySelector('.card')?.classList.add('in'); }, {threshold: 0.2});
sections.forEach(s => io.observe(s));
function setRail(id) { for (const a of $$('[data-rail]')) a.classList.toggle('active', a.dataset.rail === id || (id === 'door' && a.dataset.rail === 'hero')); }

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
else try { boot(); } catch (err) { console.error(err); document.body.classList.add('no-webgl'); finishLoading(); }

function boot() {
  const touch = matchMedia('(pointer: coarse)').matches;
  const mobile = touch && Math.min(screen.width, screen.height) < 820;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);

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
  for (let i = 0; i < MOTES; i++) { motePos.set([(Math.random() - 0.5) * 46 - 3, Math.random() * 6, (Math.random() - 0.5) * 22 + 2], i * 3); moteSeed[i] = Math.random() * 100; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({size: 0.1, map: dotTex, color: '#fff2c4', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending});
  scene.add(new THREE.Points(moteGeo, moteMat));

  const hemi = new THREE.HemisphereLight('#e8f6ff', '#6b8f5e', 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  const sunDay = new THREE.Color('#fff1d6'), sunNight = new THREE.Color('#9fb4ff');

  /* ----- house (rebuilt when quality changes) ----- */
  let house = null, tex = null;
  const bursts = [];
  function build() {
    const hd = quality === 'hd';
    if (house) {
      scene.remove(house.root);
      house.root.traverse(o => { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose()); });
      tex.dispose();
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hd ? 2 : mobile ? 1.25 : 1.5));
    renderer.shadowMap.enabled = hd || !mobile;
    sun.castShadow = renderer.shadowMap.enabled;
    sun.shadow.mapSize.set(hd ? 2048 : 1024, hd ? 2048 : 1024);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    tex = makeTextures(renderer, hd);
    house = buildHouse({renderer, hd, tex, found, mobile});
    scene.add(house.root);
    shadowSpan = 0; sizeCanvas(true);
  }

  /* ----- camera shots ----- */
  const SHOTS = {
    // phone: [distance scale, look-height shift] for portrait screens where the card sits below
    // phoneShot: absolute framing for portrait exteriors (the whole 38 m house cannot fit a phone)
    hero: {pos: [-3, 9.6, 34], look: [-3, 6.4, 0], phoneShot: {pos: [-16.6, 2.4, 17.5], look: [-15.6, 6.6, 0]}},
    door: {pos: [-18.1, 2.3, 11.5], look: [-19, 1.6, 3.4], phone: [1.3, -0.8]},
    books: {pos: [-17.6, 2.9, 6.3], look: [-19.3, 1.1, -1.3]},
    living: {pos: [-10.8, 3.1, 6.9], look: [-12.3, 0.9, -1]},
    kitchen: {pos: [-2.6, 3.1, 6.9], look: [-4.1, 1.1, -1]},
    classroom: {pos: [5.4, 3.1, 6.9], look: [3.9, 1.2, -1]},
    office: {pos: [13.4, 3.1, 6.9], look: [11.9, 1.3, -1]},
    finale: {pos: [9, 4.2, 30], look: [-2, 5.2, 0], phoneShot: {pos: [-12.5, 4.4, 21], look: [-14, 3.3, 0]}},
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
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }
  const pA = new THREE.Vector3(), lA = new THREE.Vector3(), pB = new THREE.Vector3(), lB = new THREE.Vector3();
  function shotAt(i, portrait, outPos, outLook) {
    const s = SHOTS[order[i]];
    outLook.set(...s.look); outPos.set(...s.pos);
    if (portrait && s.phoneShot) { outPos.set(...s.phoneShot.pos); outLook.set(...s.phoneShot.look); }
    else if (portrait) { const [k, dy] = s.phone || [1.18, -0.95]; outPos.sub(outLook).multiplyScalar(k).add(outLook); outLook.y += dy; }
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  function targetFor(p, portrait) {
    const i = Math.min(Math.floor(p), order.length - 1), j = Math.min(i + 1, order.length - 1);
    const f = smooth(clamp(((p - i) - 0.15) / 0.7)); // long holds at each room, glide in between
    shotAt(i, portrait, pA, lA); shotAt(j, portrait, pB, lB);
    wantPos.lerpVectors(pA, pB, f); wantLook.lerpVectors(lA, lB, f);
    if (i !== j && order[i] !== 'hero' && order[j] !== 'finale') wantPos.z += Math.sin(f * Math.PI) * 0.8; // gentle dolly-out between rooms
  }

  /* ----- sizing: follow the canvas' CSS box (100lvh), ignore mobile toolbar jitter ----- */
  let viewShift = 0, lastW = 0, lastH = 0, shadowSpan = 0;
  function sizeCanvas(force) {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (!force && w === lastW && (Math.abs(h - lastH) < 1 || (touch && Math.abs(h - lastH) < 160))) { measure(); return; }
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect >= 1 ? 45 : Math.min(80, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect) * 180 / Math.PI);
    viewShift = NaN; camera.updateProjectionMatrix();
    measure();
  }
  addEventListener('resize', () => sizeCanvas(false));
  document.fonts?.ready.then(() => { measure(); for (const s of house?.screens || []) s.tex.userData.redraw(s.draw(0)); });

  /* ----- picking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mouse = {x: 0, y: 0, tx: 0, ty: 0};
  let hovered = null, downAt = null;
  const glowing = new Set();
  function pickables() {
    const list = [];
    for (const h of house.hotspots) { list.push(h.root); if (h.beacon && h.beacon.material.opacity > 0.05) list.push(h.beacon); }
    for (const c of house.collectibles.values()) if (c.visible && !c.userData.gone) list.push(c);
    return list;
  }
  function pick(x, y) {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObjects(pickables(), true)) {
      const u = hit.object.userData;
      if (u.collect) return {type: 'clover', id: u.collect};
      if (u.item) return {type: 'item', id: u.item};
    }
    return null;
  }
  const overUI = e => e.target !== canvas && e.target.closest?.('a,button,.card,dialog,nav,header,aside');
  const labelOf = id => (itemLink(id)?.textContent || '').replace('→', '').trim();
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1;
    if (e.pointerType !== 'mouse' || !house) return;
    const hit = overUI(e) ? null : pick(e.clientX, e.clientY);
    hovered = hit; document.body.style.cursor = hit ? 'pointer' : '';
    if (hit?.type === 'item') showTip(`${labelOf(hit.id)} · คลิกเพื่อหยิบ`, e.clientX, e.clientY);
    else if (hit?.type === 'clover') showTip('เจอแล้ว! คลิกเพื่อเก็บ 🍀', e.clientX, e.clientY);
    else if (performance.now() > tipHoldUntil) hideTip();
  }, {passive: true});
  addEventListener('pointerdown', e => { downAt = overUI(e) ? null : {x: e.clientX, y: e.clientY, t: e.timeStamp}; }, {passive: true});
  addEventListener('pointerup', e => {
    if (!downAt || !house) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), quick = e.timeStamp - downAt.t < 500; downAt = null;
    if (moved > 8 || !quick) return;
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return closeInspect();
    if (hit.type === 'clover') { collectFromScene(hit.id); showTip(`เก็บได้แล้ว ${found.size}/4 🍀`, e.clientX, e.clientY, 1600); }
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
    if (b.dataset.quality === quality) return;
    quality = b.dataset.quality; store.set('mc:tour:quality', quality); renderQuality();
    $('#loader-text').textContent = quality === 'hd' ? 'กำลังจัดบ้านแบบ HD…' : 'กำลังจัดบ้านแบบ SD…';
    document.body.classList.add('is-loading');
    setTimeout(() => { const keep = inspecting; closeInspect(); build(); first = true; if (keep) openInspect(keep); }, 60);
  });

  /* ----- render loop ----- */
  const clock = new THREE.Clock(), tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  let first = true, running = true, currentScene = '';
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  function frame() {
    if (!running) return;
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, still = reduced;
    const p = progress(), fin = idx('finale'), portrait = camera.aspect < 1;

    const sceneId = order[Math.round(p)];
    if (sceneId !== currentScene) { currentScene = sceneId; setRail(sceneId); if (inspecting && !itemLink(inspecting)?.closest(`[data-scene="${sceneId}"]`)) closeInspect(); }

    // camera: time-based damping so slow devices keep up; slower = calmer
    targetFor(p, portrait);
    const k = first || still ? 1 : 1 - Math.exp(-Math.min(rawDt, 0.5) * 2.6);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    mouse.x = lerp(mouse.x, still ? 0 : mouse.tx, 1 - Math.exp(-dt * 2)); mouse.y = lerp(mouse.y, still ? 0 : mouse.ty, 1 - Math.exp(-dt * 2));
    camera.position.copy(camPos); camera.position.x += mouse.x * 0.3; camera.position.y -= mouse.y * 0.15;
    camera.lookAt(camLook);

    // dollhouse: door swings, facade sinks, roof lifts; everything stays opaque
    const doorOpen = smooth(clamp((p - 0.5) / 0.6));
    const inside = smooth(clamp((p - 1.1) / 0.7)) * (1 - smooth(clamp((p - (fin - 0.75)) / 0.6)));
    const dusk = smooth(clamp((p - (fin - 0.9)) / 0.8));
    house.door.rotation.y = -doorOpen * 1.7 * (1 - dusk);
    house.facade.position.y = -inside * (H + 0.6); house.facade.visible = inside < 0.995;
    house.roof.position.y = H + inside * 9; house.roof.visible = inside < 0.995;
    house.flowers.visible = inside < 0.5;
    const shift = camera.aspect > 1.15 ? -0.17 * inside : 0; // desktop: room sits beside the card
    if (Number.isNaN(viewShift) || Math.abs(shift - viewShift) > 0.0005) { viewShift = shift; if (shift) camera.setViewOffset(lastW, lastH, shift * lastW, 0, lastW, lastH); else camera.clearViewOffset(); }

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
    sun.target.position.set(camLook.x, 0, 0); sun.position.set(camLook.x + 14, 22, 16);
    const span = Math.round(lerp(24, 10, inside));
    if (span !== shadowSpan) { shadowSpan = span; Object.assign(sun.shadow.camera, {left: -span, right: span, top: span * 0.65, bottom: -span * 0.5, near: 1, far: 80}); sun.shadow.camera.updateProjectionMatrix(); }

    // hero clover
    const hc = house.heroClover;
    hc.rotation.y = still ? 0.3 : t * 0.45; hc.position.y = 8.4 + (still ? 0 : Math.sin(t * 1.2) * 0.25);
    hc.position.x = house.halo.position.x = house.cloverLight.position.x = portrait ? -12 : 6.5; // keep it in a phone's narrow frame
    house.halo.position.y = hc.position.y; house.halo.lookAt(camera.position); house.halo.material.opacity = 0.45 * (1 - inside);

    // hotspots: hover lift, picked-up objects float toward you, beacons near the current view
    camera.getWorldDirection(camDir);
    for (const h of house.hotspots) {
      if (h.root === hc) continue; // the big clover animates itself above
      const hov = (hovered?.type === 'item' && hovered.id === h.id) || glowing.has(h.id);
      tmp.copy(h.base);
      if (h.picked) { tmp.y += 0.22 + (still ? 0 : Math.sin(t * 2) * 0.03); tmp.addScaledVector(camDir, -0.25); }
      else if (hov) tmp.y += 0.06;
      h.root.position.lerp(tmp, still ? 1 : 1 - Math.exp(-dt * 10));
      h.root.rotation.y = h.rot.y + (h.picked && !still ? Math.sin(t * 1.5) * 0.18 : 0);
      if (h.beacon) {
        const near = clamp(1 - Math.abs(h.beacon.position.x - camLook.x) / 5.5) * inside;
        const want = h.picked ? 0 : near * (hov ? 1 : 0.85);
        h.beacon.material.opacity = lerp(h.beacon.material.opacity, want, 1 - Math.exp(-dt * 6));
        h.beacon.scale.setScalar((hov ? 0.36 : 0.26) * (1 + (still ? 0 : Math.sin(t * 3 + h.beacon.position.x) * 0.15)));
        h.beacon.visible = h.beacon.material.opacity > 0.01;
      }
    }

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
      for (const s of house.smoke) { const ph = (t * 0.18 + s.userData.phase) % 1; s.position.set(-6 + ph * 0.8, 1.9 + ph * 3.5, -1.2 - ph * 0.6); s.scale.setScalar(0.4 + ph * 1.4); s.material.opacity = 0.5 * (1 - ph); }
      for (const s of house.steam) { const ph = (t * 0.35 + s.userData.phase) % 1; s.position.copy(s.userData.base); s.position.y += ph * 1.1; s.position.x += Math.sin(ph * 6 + t) * 0.08; s.scale.setScalar(0.6 + ph * 1.6); s.material.opacity = 0.4 * (1 - ph); }
      const arr = moteGeo.attributes.position.array;
      for (let i = 0; i < MOTES; i++) { const sd = moteSeed[i]; arr[i * 3 + 1] += dt * (0.06 + (sd % 1) * 0.08); arr[i * 3] += Math.sin(t * 0.3 + sd) * dt * 0.04; if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = 0; }
      moteGeo.attributes.position.needsUpdate = true;
      for (const fn of house.tickers) fn(t, dt);
      if (currentScene === 'office') for (const s of house.screens) { const step = Math.floor(t * 1.5); if (step !== s.step) { s.step = step; s.tex.userData.redraw(s.draw(step)); } }
    }
    moteMat.color.set(dusk > 0.5 ? '#c8ff8a' : '#fff2c4'); moteMat.size = lerp(0.1, 0.2, dusk); moteMat.opacity = 0.3 + dusk * 0.6;

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt; const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, n) => { v.y -= dt * 3; arr[n * 3] += v.x * dt; arr[n * 3 + 1] += v.y * dt; arr[n * 3 + 2] += v.z * dt; });
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.4);
      if (b.life > 1.4) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }

    renderer.render(scene, camera);
    if (first) { first = false; finishLoading(); }
    requestAnimationFrame(frame);
  }

  build();
  targetFor(progress(), camera.aspect < 1); camPos.copy(wantPos); camLook.copy(wantLook);
  requestAnimationFrame(frame);

  // read-only test hook: progress, scene order, quality, and where things sit on screen
  window.__tour = {
    progress, order, found, quality: () => quality, items: () => house.hotspots.map(h => h.id), inspecting: () => inspecting,
    screenOf(id) {
      const obj = house?.collectibles.get(id) || hotById(id)?.root; if (!obj || !obj.visible) return null;
      const v = (house.collectibles.has(id) ? obj.getWorldPosition(new THREE.Vector3()) : new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3())).project(camera);
      return {x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight};
    },
  };
}
