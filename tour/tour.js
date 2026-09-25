/**
 * บ้าน myClover — scroll-driven 3D house tour.
 * The DOM sections are the real content and navigation; this module only adds the house
 * behind them. Scroll position chooses a camera shot per section, the facade and roof open
 * like a dollhouse, the sky moves from day to dusk, and four hidden clovers can be collected.
 * No telemetry, no network calls. Local storage keeps collected clovers for this viewer only.
 */
import * as THREE from './vendor/three.module.min.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceQuery.matches;
reduceQuery.addEventListener?.('change', e => { reduced = e.matches; document.body.classList.toggle('reduced', reduced); });
if (reduced) document.body.classList.add('reduced');

/* ---------- clover collection (per-viewer convenience only) ---------- */
const ROOMS = ['living', 'kitchen', 'classroom', 'office'];
const STORE_KEY = 'mc:tour:clovers:v1';
const found = new Set();
try { for (const id of JSON.parse(localStorage.getItem(STORE_KEY) || '[]')) if (ROOMS.includes(id)) found.add(id); } catch {}
const saveFound = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify([...found])); } catch {} };

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
function drawLucky() {
  let i; do { i = Math.floor(Math.random() * LUCKY.length); } while (i === lastLucky && LUCKY.length > 1);
  lastLucky = i; return LUCKY[i];
}
function openLucky() {
  const dlg = $('#lucky'), all = found.size === ROOMS.length;
  dlg.classList.toggle('golden', all);
  $('#lucky-kicker').textContent = all ? 'คุณเจอโคลเวอร์ครบสี่ใบ' : `โคลเวอร์ที่เจอ ${found.size}/4 ใบ`;
  $('#lucky-title').textContent = all ? 'คุณคือคนโชคดีของบ้านนี้' : 'วันนี้คุณโชคดี';
  $('#lucky-message').textContent = drawLucky();
  if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
}
$('#open-lucky')?.addEventListener('click', openLucky);
$('#lucky-again')?.addEventListener('click', () => { $('#lucky-message').textContent = drawLucky(); });

function renderCount(pop) {
  const btn = $('#clover-count'); if (!btn) return;
  $$('.leaves g', btn).forEach((leaf, i) => leaf.classList.toggle('on', i < found.size));
  $('.count-text', btn).textContent = `${found.size}/4`;
  btn.setAttribute('aria-label', `โคลเวอร์ที่เก็บได้ ${found.size} จาก 4 ใบ`);
  btn.classList.toggle('complete', found.size === ROOMS.length);
  if (pop) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  for (const b of $$('[data-find]')) {
    const has = found.has(b.dataset.find);
    b.classList.toggle('found', has);
    if (has) b.textContent = '🍀 เก็บใบนี้แล้ว';
  }
}
$('#clover-count')?.addEventListener('click', () => {
  if (found.size === ROOMS.length) return openLucky();
  const next = ROOMS.find(r => !found.has(r));
  showTip(`เหลืออีก ${4 - found.size} ใบ ลองดูใน${roomName(next)}`, innerWidth / 2, 90, 2600);
});
const roomName = id => ({living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', classroom: 'ห้องเรียน', office: 'ห้องทำงาน'})[id] || 'บ้าน';

let tipTimer = 0, tipHoldUntil = 0;
function showTip(text, x, y, ms = 0) {
  const tip = $('#tip'); if (!tip) return;
  tip.textContent = text; tip.hidden = false;
  tip.style.left = `${clamp(x, 90, innerWidth - 90)}px`; tip.style.top = `${Math.max(y, 60)}px`;
  clearTimeout(tipTimer); tipHoldUntil = ms ? performance.now() + ms : 0;
  if (ms) tipTimer = setTimeout(hideTip, ms);
}
function hideTip() { const tip = $('#tip'); if (tip) tip.hidden = true; }

let collectInScene = null; // set once the 3D scene exists
function collect(id, fromScene) {
  if (!ROOMS.includes(id) || found.has(id)) return;
  found.add(id); saveFound(); renderCount(true);
  if (!fromScene) collectInScene?.(id);
  if (found.size === ROOMS.length) setTimeout(openLucky, reduced ? 0 : 900);
}
// Accessible path: first press reveals the hint, second press collects.
for (const b of $$('[data-find]')) b.addEventListener('click', () => {
  const id = b.dataset.find; if (found.has(id)) return;
  if (b.dataset.armed) return collect(id, false);
  b.dataset.armed = '1'; b.textContent = `💡 ${b.dataset.hint} (กดอีกครั้งเพื่อเก็บ)`;
  highlightInScene?.(id);
});
let highlightInScene = null;
renderCount(false);

/* ---------- card reveal + rail ---------- */
const sections = $$('[data-scene]');
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) e.target.querySelector('.card')?.classList.add('in');
}, {threshold: 0.25});
sections.forEach(s => io.observe(s));
function setRail(id) { for (const a of $$('[data-rail]')) a.classList.toggle('active', a.dataset.rail === id || (id === 'door' && a.dataset.rail === 'hero')); }

/* ---------- WebGL boot ---------- */
const canvas = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
} catch {
  document.body.classList.add('no-webgl');
}
if (!renderer) finishLoading();
else try { boot(); } catch (err) { // the story still works without the house
  console.error(err); document.body.classList.add('no-webgl'); finishLoading();
}

function finishLoading() { document.body.classList.remove('is-loading'); }

function boot() {
  const mobile = matchMedia('(max-width: 760px)').matches || navigator.maxTouchPoints > 0 && innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  /* ----- materials & helpers ----- */
  const matCache = new Map();
  const mat = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({color, roughness: 0.75, ...o}));
    return matCache.get(key);
  };
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  function box(parent, [w, h, d], [x, y, z], material, rot) {
    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'string' ? mat(material) : material));
    m.position.set(x, y + h / 2, z); if (rot) m.rotation.set(...rot); parent.add(m); return m;
  }
  function cyl(parent, [rt, rb, h, seg = 20], [x, y, z], material) {
    const m = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof material === 'string' ? mat(material) : material));
    m.position.set(x, y + h / 2, z); parent.add(m); return m;
  }
  function blob(parent, r, [x, y, z], color, detail = 1) {
    const m = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color, {flatShading: true})));
    m.position.set(x, y, z); parent.add(m); return m;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.userData.redraw = fn => { fn(ctx, w, h); t.needsUpdate = true; };
    return t;
  }
  const FONT = "'Anuphan', 'Noto Sans Thai', sans-serif";

  /* ----- clover geometry ----- */
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(-0.55, 0.3, -0.62, 0.92, -0.26, 1.0);
  leafShape.bezierCurveTo(-0.07, 1.05, 0, 0.88, 0, 0.76);
  leafShape.bezierCurveTo(0, 0.88, 0.07, 1.05, 0.26, 1.0);
  leafShape.bezierCurveTo(0.62, 0.92, 0.55, 0.3, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, {depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 18});
  leafGeo.translate(0, 0, -0.05);
  function makeClover(material, leaves = 4, stem = true) {
    const g = new THREE.Group();
    for (let i = 0; i < leaves; i++) {
      const l = new THREE.Mesh(leafGeo, material); l.rotation.z = i * Math.PI * 2 / leaves + Math.PI / 4; l.castShadow = true; g.add(l);
    }
    if (stem) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, -0.6, 0.05), new THREE.Vector3(0.05, -1.3, 0.1)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.05, 8), material));
    }
    return g;
  }

  /* ----- world ----- */
  const world = new THREE.Group(); scene.add(world);
  const W = 8, D = 7, H = 3.1; // room width, depth, wall height
  const CX = {living: -12, kitchen: -4, classroom: 4, office: 12};

  // Ground + garden
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 64), mat('#8fc587', {roughness: 1}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const plinth = box(world, [33.4, 0.35, D + 0.8], [0, -0.35, 0], '#d8cdb8');
  plinth.receiveShadow = true;

  const woodTex = canvasTex(256, 256, (c, w, h) => {
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 64 - 64; x < w; x += 128) {
      const v = 190 + Math.random() * 30; c.fillStyle = `rgb(${v},${v * 0.78 | 0},${v * 0.55 | 0})`; c.fillRect(x, y, 127, 31);
      c.fillStyle = 'rgba(80,50,20,.08)'; for (let k = 0; k < 5; k++) c.fillRect(x, y + 4 + k * 5, 127, 1);
    }
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(2.4, 2);

  const WALL = {living: '#dfe7d3', kitchen: '#f5e6bd', classroom: '#d9e8f3', office: '#eddcd0'};
  const FLOOR = {living: '#ffffff', kitchen: '#f1efe9', classroom: '#ffffff', office: '#ffffff'};
  for (const [id, cx] of Object.entries(CX)) {
    const fm = id === 'kitchen' ? mat('#efe9dc', {roughness: 0.5}) : new THREE.MeshStandardMaterial({color: FLOOR[id], map: woodTex, roughness: 0.6});
    const f = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), fm); f.position.set(cx, -0.06, 0); f.receiveShadow = true; world.add(f);
    if (id === 'kitchen') { // checker tiles
      const tiles = canvasTex(256, 256, (c, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#e8e1d2' : '#f8f5ee'; c.fillRect(i * 32, j * 32, 32, 32); } });
      tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 2.6); fm.map = tiles; fm.color.set('#ffffff');
    }
    const back = box(world, [W, H, 0.24], [cx, 0, -D / 2 - 0.12], WALL[id]); back.castShadow = false;
    box(world, [W, 0.14, 0.05], [cx, 0, -D / 2 + 0.02], '#ffffff');
  }
  // side walls & partitions with doorways
  for (const x of [-16, -8, 0, 8, 16]) {
    const outer = Math.abs(x) === 16, c = '#f3efe6';
    if (outer) { box(world, [0.24, H, D + 0.24], [x, 0, 0], c); continue; }
    box(world, [0.2, H, 3.3], [x, 0, -D / 2 + 1.65], c);
    box(world, [0.2, H, 1.9], [x, 0, D / 2 - 0.95], c);
    box(world, [0.2, 0.7, 1.8], [x, H - 0.7, 0.75], c);
  }

  /* ----- facade (fades out as we step inside) ----- */
  const facade = new THREE.Group(); world.add(facade);
  const facadeMat = new THREE.MeshStandardMaterial({color: '#f7f1e3', roughness: 0.85, transparent: true});
  const trimMat = new THREE.MeshStandardMaterial({color: '#2f5d44', roughness: 0.6, transparent: true});
  const glassMat = new THREE.MeshStandardMaterial({color: '#bfe0ef', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55, emissive: '#ffcf7a', emissiveIntensity: 0});
  const FZ = D / 2 + 0.12;
  function wallWithHole(x0, x1, hx0, hx1, hy0, hy1) {
    const piece = (a, b, y0, y1) => { if (b - a > 0.01 && y1 - y0 > 0.01) box(facade, [b - a, y1 - y0, 0.24], [(a + b) / 2, y0, FZ], facadeMat); };
    piece(x0, hx0, 0, H); piece(hx1, x1, 0, H); piece(hx0, hx1, 0, hy0); piece(hx0, hx1, hy1, H);
  }
  let door;
  for (const [id, cx] of Object.entries(CX)) {
    if (id === 'living') {
      wallWithHole(cx - W / 2, cx + W / 2, cx - 0.7, cx + 0.7, 0, 2.3);
      const hinge = new THREE.Group(); hinge.position.set(cx - 0.7, 0, FZ + 0.02); facade.add(hinge);
      box(hinge, [1.4, 2.28, 0.08], [0.7, 0, 0], trimMat);
      const knob = cyl(hinge, [0.05, 0.05, 0.08], [1.22, 1.05, 0.08], mat('#e9b949', {metalness: 0.8, roughness: 0.3})); knob.rotation.x = Math.PI / 2;
      door = hinge;
      for (const dx of [-2.6, 2.6]) { // little windows either side of the door
        const g = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), glassMat); g.position.set(cx + dx, 1.75, FZ + 0.13); facade.add(g);
      }
    } else {
      wallWithHole(cx - W / 2, cx + W / 2, cx - 1.4, cx + 1.4, 0.95, 2.35);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), glassMat); g.position.set(cx, 1.65, FZ); facade.add(g);
      box(facade, [3.0, 0.1, 0.4], [cx, 0.85, FZ + 0.1], trimMat);
      box(facade, [0.06, 1.4, 0.06], [cx, 0.95, FZ + 0.05], trimMat);
    }
  }
  // eave trim along the whole front
  box(facade, [33, 0.18, 0.4], [0, H - 0.05, FZ + 0.05], trimMat);

  /* ----- roof ----- */
  const roof = new THREE.Group(); roof.position.y = H; world.add(roof);
  const roofMat = new THREE.MeshStandardMaterial({color: '#b5543c', roughness: 0.7, transparent: true});
  const rs = new THREE.Shape(); rs.moveTo(-(D / 2 + 0.9), 0); rs.lineTo(0, 2.5); rs.lineTo(D / 2 + 0.9, 0); rs.lineTo(-(D / 2 + 0.9), 0);
  const roofGeo = new THREE.ExtrudeGeometry(rs, {depth: 33.6, bevelEnabled: false}); roofGeo.translate(0, 0, -16.8);
  const roofMesh = shadowy(new THREE.Mesh(roofGeo, roofMat)); roofMesh.rotation.y = Math.PI / 2; roof.add(roofMesh);
  const chimney = box(roof, [0.8, 1.8, 0.8], [-6, 0.8, -1.2], new THREE.MeshStandardMaterial({color: '#8a4a36', transparent: true}));
  const roofMats = [roofMat, chimney.material];
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.6, roughness: 1}));
    s.userData.phase = i / 5; roof.add(s); smoke.push(s);
  }

  /* ----- garden ----- */
  const garden = new THREE.Group(); world.add(garden);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 10), mat('#d9d2c2')); s.position.set(-12 + Math.sin(i * 0.8) * 0.3, 0.02, 4.5 + i * 1.05); s.receiveShadow = true; garden.add(s);
  }
  const TREES = [[-24, -6, 1.2], [-21, 6, 0.9], [-27, 2, 1.4], [23, -5, 1.3], [26, 4, 1], [21, 9, 0.8], [-6, -14, 1.5], [6, -15, 1.3], [16, -12, 1.1], [-17, -12, 1.2]];
  for (const [x, z, s] of TREES) {
    cyl(garden, [0.18 * s, 0.26 * s, 1.6 * s], [x, 0, z], '#7a5236');
    blob(garden, 1.3 * s, [x, 2.3 * s, z], '#4f9a5c'); blob(garden, 0.95 * s, [x + 0.6 * s, 3.1 * s, z + 0.2], '#62b06c'); blob(garden, 0.8 * s, [x - 0.5 * s, 2.9 * s, z - 0.3], '#3f8a50');
  }
  const flowerColors = ['#f28b82', '#fbd46d', '#ffffff', '#c39bd3', '#f7a1c4'];
  const flowers = new THREE.Group(); garden.add(flowers);
  for (let i = 0; i < 70; i++) {
    const x = -15.5 + Math.random() * 31; if (Math.abs(x + 12) < 1.2) continue;
    const z = D / 2 + 0.6 + Math.random() * 0.9;
    blob(flowers, 0.09 + Math.random() * 0.06, [x, 0.25 + Math.random() * 0.2, z], flowerColors[i % flowerColors.length], 0);
    blob(flowers, 0.18, [x, 0.12, z], '#3f8a50', 0);
  }
  // clover meadow: instanced three-leaf clovers
  {
    const N = mobile ? 260 : 520, leafMat = mat('#3f9a57', {roughness: 0.6});
    const meshes = [0, 1, 2].map(() => new THREE.InstancedMesh(leafGeo, leafMat, N));
    const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      let x, z; do { x = (Math.random() - 0.5) * 70; z = (Math.random() - 0.5) * 50 + 6; } while (Math.abs(x) < 17.5 && z < 6.5 && z > -5 || Math.abs(x + 12) < 1.5 && z > 3);
      e.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.4, 0, Math.random() * 6.28); q.setFromEuler(e); p.set(x, 0.12, z); const s = 0.14 + Math.random() * 0.1; sc.set(s, s, s);
      m4.compose(p, q, sc);
      meshes.forEach((mesh, k) => { rot.makeRotationZ(k * Math.PI * 2 / 3); mesh.setMatrixAt(i, m4.clone().multiply(rot)); });
    }
    meshes.forEach(m => { m.receiveShadow = true; garden.add(m); });
  }

  /* ----- hotspots & collectibles registry ----- */
  const hotspots = []; // {root, href, label}
  const hrefFor = scene => { const a = $(`[data-scene="${scene}"] [data-primary]`); return a ? {href: a.getAttribute('href'), label: a.dataset.label || a.textContent.trim()} : null; };
  function hotspot(root, sceneId) { const h = hrefFor(sceneId); if (h) { root.traverse(o => { o.userData.hot = hotspots.length; }); hotspots.push({root, ...h, base: root.scale.clone()}); } }

  const tickers = []; // per-frame animation callbacks (t, dt)

  /* ----- living room ----- */
  {
    const cx = CX.living, g = new THREE.Group(); world.add(g);
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.03, 48), mat('#d98a5f', {roughness: 1})); rug.position.set(cx, 0.015, 0.4); rug.receiveShadow = true; g.add(rug);
    const rug2 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.035, 48), mat('#f2d7a6', {roughness: 1})); rug2.position.set(cx, 0.02, 0.4); g.add(rug2);
    const sofa = '#4f7d63';
    box(g, [3.2, 0.45, 1.05], [cx, 0, -2.6], sofa); box(g, [3.2, 0.75, 0.28], [cx, 0.4, -3.1], sofa);
    box(g, [0.28, 0.7, 1.05], [cx - 1.6, 0, -2.6], sofa); box(g, [0.28, 0.7, 1.05], [cx + 1.6, 0, -2.6], sofa);
    for (const dx of [-0.75, 0.75]) box(g, [1.4, 0.18, 0.9], [cx + dx, 0.45, -2.55], '#6a9a7e');
    box(g, [0.55, 0.45, 0.18], [cx - 1.0, 0.62, -2.85], '#f2c14e', [0.2, 0.2, 0]);
    box(g, [0.55, 0.45, 0.18], [cx + 1.05, 0.62, -2.85], '#e37c5b', [0.2, -0.2, 0]);
    // coffee table with a board game (hotspot → Hall)
    const table = new THREE.Group(); world.add(table);
    box(table, [2.0, 0.08, 1.3], [cx, 0.44, 0.4], mat('#a8744a', {roughness: 0.5}));
    for (const [dx, dz] of [[-0.9, -0.55], [0.9, -0.55], [-0.9, 0.55], [0.9, 0.55]]) cyl(table, [0.04, 0.04, 0.44], [cx + dx, 0, 0.4 + dz], '#6d4a30');
    const boardTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#fbf3df'; c.fillRect(0, 0, w, h);
      const cols = ['#2e9e5b', '#e9b949', '#e37c5b', '#4a8fd1'];
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180, 26, 0, 7); c.fill(); }
      c.strokeStyle = '#14281d'; c.lineWidth = 6; c.beginPath(); c.arc(256, 256, 120, 0, 7); c.stroke();
      c.fillStyle = '#14281d'; c.font = `700 44px ${FONT}`; c.textAlign = 'center'; c.fillText('Main Quest', 256, 250); c.font = `600 30px ${FONT}`; c.fillText('CORE7 · XTY', 256, 296);
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.1), [mat('#14281d'), mat('#14281d'), new THREE.MeshStandardMaterial({map: boardTex, roughness: 0.5}), mat('#14281d'), mat('#14281d'), mat('#14281d')]);
    board.position.set(cx, 0.5, 0.4); board.rotation.y = 0.25; board.castShadow = true; table.add(board);
    const pawnCols = ['#e37c5b', '#4a8fd1', '#f2c14e', '#2e9e5b'];
    const pawns = pawnCols.map((col, i) => { const p = new THREE.Group(); cyl(p, [0.05, 0.08, 0.14], [0, 0, 0], col); blob(p, 0.06, [0, 0.19, 0], col, 2); p.position.set(cx - 0.3 + i * 0.2, 0.52, 0.25 + (i % 2) * 0.3); table.add(p); return p; });
    const dice = [box(table, [0.12, 0.12, 0.12], [cx + 0.75, 0.48, 0.1], '#ffffff'), box(table, [0.12, 0.12, 0.12], [cx + 0.62, 0.48, 0.25], '#ffffff')];
    tickers.push(t => { pawns.forEach((p, i) => { p.position.y = 0.52 + Math.max(0, Math.sin(t * 2 + i * 1.6)) * 0.12; }); dice.forEach((d, i) => { d.rotation.y = t * 0.6 + i; }); });
    hotspot(table, 'living');
    // bookshelf on the left wall (hides clover #1 on top)
    box(g, [0.45, 2.3, 1.8], [cx - 3.65, 0, -1.8], '#8c6242');
    for (let s = 0; s < 4; s++) {
      box(g, [0.42, 0.04, 1.7], [cx - 3.6, 0.3 + s * 0.5, -1.8], '#6b4a30');
      for (let b = 0; b < 7; b++) box(g, [0.3, 0.3 + Math.random() * 0.12, 0.13], [cx - 3.55, 0.34 + s * 0.5, -2.5 + b * 0.19], ['#e37c5b', '#2e9e5b', '#4a8fd1', '#f2c14e', '#7d5ba6', '#ffffff'][(b + s) % 6]);
    }
    // floor lamp + plant + wall art
    cyl(g, [0.03, 0.03, 1.7], [cx + 3.1, 0, -2.7], '#333333');
    const shade = cyl(g, [0.2, 0.35, 0.4], [cx + 3.1, 1.6, -2.7], mat('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 0.9})); shade.castShadow = false;
    cyl(g, [0.3, 0.24, 0.5], [cx + 3.2, 0, 2.3], '#d8cdb8'); blob(g, 0.55, [cx + 3.2, 1.0, 2.3], '#4f9a5c'); blob(g, 0.4, [cx + 3.0, 1.4, 2.2], '#62b06c');
    const artTex = canvasTex(256, 192, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe3f0'); gr.addColorStop(1, '#f7e7c4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#2e9e5b'; for (let i = 0; i < 4; i++) { c.save(); c.translate(128, 100); c.rotate(i * Math.PI / 2 + Math.PI / 4); c.beginPath(); c.ellipse(0, -28, 22, 30, 0, 0, 7); c.fill(); c.restore(); } });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({map: artTex})); art.position.set(cx, 2.05, -D / 2 + 0.01); g.add(art);
    box(g, [1.62, 1.22, 0.03], [cx, 1.44, -D / 2 - 0.005], '#6d4a30');
  }

  /* ----- kitchen ----- */
  const steam = [];
  {
    const cx = CX.kitchen, g = new THREE.Group(); world.add(g);
    box(g, [5.6, 0.9, 0.72], [cx - 0.8, 0, -3.1], '#fbf8f1');
    box(g, [5.7, 0.06, 0.78], [cx - 0.8, 0.9, -3.08], mat('#3b3f3c', {roughness: 0.35}));
    for (let i = 0; i < 5; i++) box(g, [1.02, 0.6, 0.02], [cx - 3.05 + i * 1.12, 0.18, -2.73], '#e8ece6');
    box(g, [5.6, 0.75, 0.42], [cx - 0.8, 1.85, -3.26], '#7fae95');
    box(g, [5.6, 0.62, 0.02], [cx - 0.8, 1.02, -3.46], '#e9f1ec'); // backsplash
    box(g, [1.1, 2.2, 0.8], [cx + 2.9, 0, -3.0], mat('#dfe5e2', {metalness: 0.4, roughness: 0.3}));
    box(g, [0.04, 0.5, 0.05], [cx + 2.45, 1.3, -2.58], '#999999');
    // stove + pot with steam
    box(g, [0.9, 0.03, 0.6], [cx - 2.4, 0.93, -3.05], '#1f2320');
    for (const dx of [-0.2, 0.2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 24), mat('#ff7a3d', {emissive: '#ff5a1f', emissiveIntensity: 1.4})); r.rotation.x = Math.PI / 2; r.position.set(cx - 2.4 + dx, 0.97, -3.05); g.add(r); }
    cyl(g, [0.2, 0.18, 0.28], [cx - 2.6, 0.96, -3.05], mat('#c9ced1', {metalness: 0.8, roughness: 0.25}));
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.5})); s.userData.phase = i / 6; s.userData.base = new THREE.Vector3(cx - 2.6, 1.3, -3.05); g.add(s); steam.push(s); }
    // herb pots on the counter (clover #2 hides here)
    for (let i = 0; i < 3; i++) { cyl(g, [0.12, 0.1, 0.2], [cx + 0.6 + i * 0.35, 0.93, -3.15], '#c56b4a'); blob(g, 0.16, [cx + 0.6 + i * 0.35, 1.25, -3.15], ['#4f9a5c', '#62b06c', '#3f8a50'][i]); }
    // island with a salad bowl (hotspot → Ako's kitchen)
    box(g, [2.6, 0.9, 1.1], [cx, 0, 0.4], mat('#b98352', {roughness: 0.5}));
    box(g, [2.8, 0.06, 1.25], [cx, 0.9, 0.4], mat('#f4f1ea', {roughness: 0.3}));
    for (const dx of [-0.8, 0, 0.8]) { cyl(g, [0.2, 0.2, 0.06], [cx + dx, 0.66, 1.35], '#2f5d44'); cyl(g, [0.03, 0.03, 0.66], [cx + dx, 0, 1.35], '#333333'); }
    const bowl = new THREE.Group(); world.add(bowl);
    const bowlMesh = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#ffffff', {roughness: 0.25, side: THREE.DoubleSide})));
    bowlMesh.position.set(cx - 0.3, 1.38, 0.4); bowl.add(bowlMesh);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.08 + (i % 4) * 0.07; blob(bowl, 0.12, [cx - 0.3 + Math.cos(a) * r, 1.36 + (i % 3) * 0.03, 0.4 + Math.sin(a) * r], ['#5fb25a', '#8fd16a', '#3f8a50'][i % 3]); }
    for (let i = 0; i < 5; i++) { const a = i * 1.3; const tm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat('#e2412f', {roughness: 0.3})); tm.position.set(cx - 0.3 + Math.cos(a) * 0.2, 1.47, 0.4 + Math.sin(a) * 0.2); bowl.add(tm); }
    const lime = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), mat('#b7dd5a')); lime.position.set(cx - 0.18, 1.49, 0.3); lime.rotation.z = 0.5; bowl.add(lime);
    box(bowl, [0.7, 0.04, 0.45], [cx + 0.65, 0.93, 0.45], '#c79a63');
    blob(bowl, 0.13, [cx + 0.55, 1.07, 0.45], '#f3a53a', 1); blob(bowl, 0.11, [cx + 0.82, 1.06, 0.4], '#e2412f', 1);
    tickers.push(t => { bowl.rotation.y = 0; bowlMesh.rotation.y = t * 0.3; });
    hotspot(bowl, 'kitchen');
    // pendants
    for (const dx of [-0.7, 0.7]) {
      cyl(g, [0.01, 0.01, 1.2], [cx + dx, H - 1.2, 0.4], '#333333');
      const s = cyl(g, [0.12, 0.3, 0.3], [cx + dx, H - 1.5, 0.4], mat('#2f5d44', {emissive: '#ffcf7a', emissiveIntensity: 0.25})); s.castShadow = false;
    }
  }

  /* ----- classroom ----- */
  let orb;
  {
    const cx = CX.classroom, g = new THREE.Group(); world.add(g);
    const wbTex = canvasTex(1024, 420, (c, w, h) => {
      c.fillStyle = '#fdfefe'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d6b3d'; c.font = `800 92px ${FONT}`; c.fillText('AI ใส่ซอส', 60, 130);
      c.fillStyle = '#4a8fd1'; c.font = `600 44px ${FONT}`; c.fillText('คุย → สร้าง → ใช้ Source → ต่อยอด', 60, 215);
      c.strokeStyle = '#e37c5b'; c.lineWidth = 6; c.beginPath(); c.moveTo(60, 250); c.bezierCurveTo(300, 300, 520, 230, 760, 270); c.stroke();
      c.fillStyle = '#44584b'; c.font = `500 36px ${FONT}`; c.fillText('ฟรี · ไม่ต้องสมัคร · ใช้กับ AI ตัวไหนก็ได้', 60, 350);
    });
    const wb = new THREE.Group(); world.add(wb);
    box(wb, [4.2, 1.8, 0.08], [cx - 0.3, 1.0, -D / 2 + 0.05], '#9aa3a8');
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.64), new THREE.MeshStandardMaterial({map: wbTex, roughness: 0.3})); face.position.set(cx - 0.3, 1.9, -D / 2 + 0.1); wb.add(face);
    box(wb, [4.0, 0.06, 0.18], [cx - 0.3, 0.98, -D / 2 + 0.15], '#9aa3a8');
    hotspot(wb, 'classroom');
    const screenTex = canvasTex(256, 160, (c, w, h) => {
      c.fillStyle = '#0f1f18'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2e9e5b'; c.beginPath(); c.roundRect(16, 18, 150, 36, 12); c.fill();
      c.fillStyle = '#e9ecef'; c.beginPath(); c.roundRect(90, 68, 150, 36, 12); c.fill();
      c.fillStyle = '#2e9e5b'; c.beginPath(); c.roundRect(16, 116, 110, 30, 12); c.fill();
    });
    const screenMat = new THREE.MeshStandardMaterial({map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.9});
    for (const [dx, dz] of [[-1.6, -0.6], [0.9, -0.6], [-1.6, 1.4], [0.9, 1.4]]) {
      box(g, [1.3, 0.05, 0.7], [cx + dx, 0.72, dz], '#e9d8b8');
      for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cyl(g, [0.025, 0.025, 0.72], [cx + dx + lx, 0, dz + lz], '#6b7075');
      box(g, [0.5, 0.02, 0.34], [cx + dx, 0.77, dz + 0.05], '#c9ced1');
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), screenMat); scr.position.set(cx + dx, 0.95, dz - 0.12); scr.rotation.x = -0.15; g.add(scr);
      cyl(g, [0.22, 0.22, 0.05], [cx + dx, 0.44, dz + 0.65], '#4a8fd1'); cyl(g, [0.03, 0.03, 0.44], [cx + dx, 0, dz + 0.65], '#6b7075');
      box(g, [0.44, 0.45, 0.05], [cx + dx, 0.48, dz + 0.87], '#4a8fd1');
    }
    // floating AI orb over the teacher desk
    box(g, [1.4, 0.8, 0.6], [cx + 2.8, 0, -2.4], '#b98352');
    orb = new THREE.Group(); orb.position.set(cx + 2.8, 1.75, -2.4); world.add(orb);
    orb.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({color: '#7fd1a4', wireframe: true, emissive: '#2e9e5b', emissiveIntensity: 1.2})));
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), new THREE.MeshStandardMaterial({color: '#e8fff1', emissive: '#7fe0a8', emissiveIntensity: 2})));
    tickers.push(t => { orb.rotation.y = t * 0.8; orb.rotation.x = t * 0.3; orb.position.y = 1.75 + Math.sin(t * 1.6) * 0.08; });
    cyl(g, [0.3, 0.24, 0.5], [cx - 3.3, 0, 2.6], '#d8cdb8'); blob(g, 0.5, [cx - 3.3, 0.95, 2.6], '#4f9a5c');
  }

  /* ----- office ----- */
  let monitorTex;
  {
    const cx = CX.office, g = new THREE.Group(); world.add(g);
    // window with sky & skyline
    const skyTex = canvasTex(512, 320, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd3f0'); gr.addColorStop(1, '#fbe3b4'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(40,70,60,.35)'; for (let x = 0; x < w; x += 38) { const bh = 60 + (x * 37 % 110); c.fillRect(x, h - bh, 32, bh); }
    });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({map: skyTex, emissive: '#ffffff', emissiveMap: skyTex, emissiveIntensity: 0.7}));
    win.position.set(cx + 1.8, 1.9, -D / 2 + 0.02); g.add(win);
    box(g, [2.56, 0.08, 0.16], [cx + 1.8, 1.1, -D / 2 + 0.08], '#ffffff'); box(g, [0.06, 1.5, 0.06], [cx + 1.8, 1.15, -D / 2 + 0.05], '#ffffff');
    // desk + monitors (hotspot → TeamBook)
    const desk = new THREE.Group(); world.add(desk);
    box(desk, [3.0, 0.07, 1.0], [cx - 0.9, 0.75, -2.5], mat('#a8744a', {roughness: 0.45}));
    for (const dx of [-1.4, 1.4]) box(desk, [0.07, 0.75, 0.9], [cx - 0.9 + dx, 0, -2.5], '#2f3a35');
    monitorTex = canvasTex(512, 300, drawMonitor(0));
    const monMat = new THREE.MeshStandardMaterial({map: monitorTex, emissive: '#ffffff', emissiveMap: monitorTex, emissiveIntensity: 0.85});
    for (const [dx, ry] of [[-0.45, 0.18], [0.45, -0.18]]) {
      const mon = new THREE.Group(); mon.position.set(cx - 0.9 + dx, 0.82, -2.75); mon.rotation.y = ry; desk.add(mon);
      box(mon, [0.86, 0.52, 0.04], [0, 0.22, 0], '#1b1f1d');
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.46), monMat); scr.position.set(0, 0.48, 0.025); mon.add(scr);
      cyl(mon, [0.03, 0.03, 0.22], [0, 0, 0], '#1b1f1d');
    }
    box(desk, [0.5, 0.02, 0.18], [cx - 0.9, 0.79, -2.25], '#e9ecef');
    const mug = cyl(desk, [0.06, 0.05, 0.12], [cx + 0.2, 0.79, -2.3], '#e9b949');
    hotspot(desk, 'office');
    // chair
    cyl(g, [0.3, 0.3, 0.08], [cx - 0.9, 0.46, -1.7], '#2f5d44'); box(g, [0.56, 0.6, 0.08], [cx - 0.9, 0.55, -1.42], '#2f5d44'); cyl(g, [0.035, 0.035, 0.46], [cx - 0.9, 0, -1.7], '#555555');
    // cork board with quest cards
    box(g, [1.8, 1.1, 0.04], [cx - 1.0, 1.5, -D / 2 + 0.03], '#c89b6a');
    const noteCols = ['#fff27a', '#ffc2d1', '#bdf0c9', '#b9dcff', '#ffd9a0', '#e3c9ff'];
    for (let i = 0; i < 6; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), mat(noteCols[i])); n.position.set(cx - 1.6 + (i % 3) * 0.6, 2.28 - Math.floor(i / 3) * 0.45, -D / 2 + 0.06); n.rotation.z = (Math.random() - 0.5) * 0.2; g.add(n); }
    // trophy shelf beside the window (clover #4 lives here)
    box(g, [1.4, 0.05, 0.3], [cx + 3.2, 1.2, -3.2], '#6b4a30');
    cyl(g, [0.08, 0.12, 0.25], [cx + 2.8, 1.25, -3.2], mat('#e9b949', {metalness: 0.9, roughness: 0.25}));
    box(g, [0.5, 1.6, 0.35], [cx - 3.5, 0, -3.1], '#8c6242');
    cyl(g, [0.3, 0.24, 0.5], [cx + 3.3, 0, 2.4], '#d8cdb8'); blob(g, 0.55, [cx + 3.3, 1.0, 2.4], '#3f8a50'); blob(g, 0.35, [cx + 3.1, 1.45, 2.3], '#62b06c');
    tickers.push(t => { mug.rotation.y = t; });
  }
  function drawMonitor(step) {
    return (c, w, h) => {
      c.fillStyle = '#10201a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e9f5ee'; c.font = `700 30px ${FONT}`; c.fillText('TeamBook', 20, 40);
      const cols = ['#2e9e5b', '#e9b949', '#4a8fd1', '#e37c5b'];
      for (let col = 0; col < 3; col++) for (let r = 0; r < 4; r++) {
        const on = (r + col + step) % 5 === 0;
        c.fillStyle = on ? cols[(col + r) % 4] : 'rgba(233,245,238,.14)';
        c.beginPath(); c.roundRect(20 + col * 160, 64 + r * 56, 146, 44, 8); c.fill();
      }
    };
  }

  /* ----- big hero clover above the roof (hotspot → meet) ----- */
  const heroMat = new THREE.MeshPhysicalMaterial({color: '#35b46a', roughness: 0.18, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#0d5a2f', emissiveIntensity: 0.35, sheen: 0.5, sheenColor: new THREE.Color('#b8ffd1')});
  const heroClover = makeClover(heroMat); heroClover.scale.setScalar(2.1); heroClover.position.set(8.5, 8.4, 0.5); world.add(heroClover);
  const halo = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.72, 64), new THREE.MeshBasicMaterial({color: '#fff3b0', transparent: true, opacity: 0.45, side: THREE.DoubleSide}));
  halo.position.copy(heroClover.position); world.add(halo);
  hotspot(heroClover, 'finale');

  /* ----- hidden collectible clovers ----- */
  const collectibles = new Map();
  const SPOTS = {living: [CX.living - 3.6, 2.5, -1.4], kitchen: [CX.kitchen + 1.62, 1.12, -3.0], classroom: [CX.classroom + 1.55, 2.95, -D / 2 + 0.25], office: [CX.office + 3.5, 1.45, -3.2]};
  for (const id of ROOMS) {
    const m = new THREE.MeshStandardMaterial({color: '#39b86b', roughness: 0.3, emissive: '#1d8a48', emissiveIntensity: 0.5});
    const c = makeClover(m); c.scale.setScalar(0.17); c.position.set(...SPOTS[id]); c.userData = {id, base: new THREE.Vector3(...SPOTS[id]), hint: 0, gone: found.has(id) ? 1 : 0};
    // invisible, finger-sized hit area (the leaves alone are a tiny, gappy target)
    c.add(new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 8), new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})));
    c.traverse(o => { o.userData.collect = id; });
    c.visible = !found.has(id); world.add(c); collectibles.set(id, c);
  }

  /* ----- particles: dust motes / fireflies, stars, bursts ----- */
  const dotTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const MOTES = mobile ? 180 : 360;
  const moteGeo = new THREE.BufferGeometry(), motePos = new Float32Array(MOTES * 3), moteSeed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) { motePos[i * 3] = (Math.random() - 0.5) * 40; motePos[i * 3 + 1] = Math.random() * 6; motePos[i * 3 + 2] = (Math.random() - 0.5) * 22 + 2; moteSeed[i] = Math.random() * 100; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({size: 0.12, map: dotTex, color: '#fff2c4', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending});
  const motes = new THREE.Points(moteGeo, moteMat); world.add(motes);

  const STARS = 600, starGeo = new THREE.BufferGeometry(), starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45; starPos[i * 3] = Math.cos(th) * Math.sin(ph) * 180; starPos[i * 3 + 1] = Math.cos(ph) * 180 + 10; starPos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 180; }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({size: 1.6, map: dotTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false});
  scene.add(new THREE.Points(starGeo, starMat));

  const bursts = [];
  function burst(at, color = '#7fe0a8', n = 60) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 0.5, (Math.random() - 0.5) * 3)); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({size: 0.18, map: dotTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    world.add(pts); bursts.push({pts, vel, life: 0});
  }

  /* ----- lights ----- */
  const hemi = new THREE.HemisphereLight('#e8f6ff', '#6b8f5e', 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(14, 22, 16); sun.castShadow = !mobile;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left: -22, right: 22, top: 14, bottom: -10, near: 1, far: 70}); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  let shadowSpan = 0;
  const roomLights = Object.values(CX).map(cx => { const l = new THREE.PointLight('#ffd9a0', 0, 11, 1.6); l.position.set(cx, 2.7, 0.6); scene.add(l); return l; });
  const cloverLight = new THREE.PointLight('#9dffc3', 0, 14, 1.5); cloverLight.position.set(8.5, 8.4, 2.5); scene.add(cloverLight);

  /* ----- camera shots per section ----- */
  const SHOTS = {
    // phone: [distance scale, look-height shift] for portrait screens where the card sits below
    hero: {pos: [0, 9.6, 31], look: [0, 6.4, 0], phone: [1.4, 3.4]},
    door: {pos: [-10.9, 2.3, 11.5], look: [-12, 1.6, 3.4], phone: [1.3, -0.8]},
    living: {pos: [-10.7, 3.1, 6.9], look: [-12.2, 1.0, -1]},
    kitchen: {pos: [-2.7, 3.1, 6.9], look: [-4.2, 1.1, -1]},
    classroom: {pos: [5.3, 3.1, 6.9], look: [3.8, 1.3, -1]},
    office: {pos: [13.3, 3.1, 6.9], look: [11.8, 1.2, -1]},
    finale: {pos: [11, 4.2, 27], look: [1, 5.2, 0], phone: [1.3, -1.6]},
  };
  const order = sections.map(s => s.dataset.scene).filter(id => SHOTS[id]);
  const idx = id => order.indexOf(id);
  let anchors = [];
  function measure() {
    const vh = innerHeight;
    anchors = sections.filter(s => SHOTS[s.dataset.scene]).map((s, i) => {
      const top = s.offsetTop, h = s.offsetHeight;
      return i === 0 ? 0 : top + h / 2 - vh / 2;
    });
  }
  function progress() {
    const y = scrollY;
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function shotAt(i, aspect, outPos, outLook) {
    const s = SHOTS[order[i]];
    outLook.set(...s.look); outPos.set(...s.pos);
    if (aspect < 1) { // portrait phones: step back, lift the room above the card
      const [k, dy] = s.phone || [1.18, -0.95];
      outPos.sub(outLook).multiplyScalar(k).add(outLook);
      outLook.y += dy;
    }
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const pA = new THREE.Vector3(), lA = new THREE.Vector3(), pB = new THREE.Vector3(), lB = new THREE.Vector3();
  function targetFor(p, aspect) {
    const i = Math.min(Math.floor(p), order.length - 1), j = Math.min(i + 1, order.length - 1);
    const f = smooth(clamp(((p - i) - 0.12) / 0.76));
    shotAt(i, aspect, pA, lA); shotAt(j, aspect, pB, lB);
    wantPos.lerpVectors(pA, pB, f); wantLook.lerpVectors(lA, lB, f);
    // arc upward while travelling between rooms so the move feels like a crane shot
    if (i !== j && order[i] !== 'hero' && order[j] !== 'finale') wantPos.y += Math.sin(f * Math.PI) * 0.9, wantPos.z += Math.sin(f * Math.PI) * 1.2;
  }

  /* ----- sizing ----- */
  let viewShift = 0;
  function resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect >= 1 ? 45 : Math.min(80, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect) * 180 / Math.PI);
    viewShift = NaN; camera.updateProjectionMatrix();
    measure();
  }
  addEventListener('resize', resize); resize();
  document.fonts?.ready.then(() => { for (const t of [monitorTex]) t.userData.redraw(drawMonitor(0)); measure(); });

  /* ----- pointer: parallax, hover, click ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mouse = {x: 0, y: 0, tx: 0, ty: 0};
  let hovered = null, downAt = null;
  const pickables = () => [...hotspots.map(h => h.root), ...[...collectibles.values()].filter(c => c.visible)];
  function pick(cx, cy) {
    ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables(), true)[0];
    if (!hit) return null;
    const o = hit.object;
    if (o.userData.collect) return {type: 'clover', id: o.userData.collect};
    if (o.userData.hot !== undefined) return {type: 'hot', h: hotspots[o.userData.hot]};
    return null;
  }
  const overUI = e => e.target !== canvas && e.target.closest?.('a,button,.card,dialog,nav,header');
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1;
    if (e.pointerType !== 'mouse') return;
    const hit = overUI(e) ? null : pick(e.clientX, e.clientY);
    hovered = hit;
    document.body.style.cursor = hit ? 'pointer' : '';
    if (hit?.type === 'hot') showTip(hit.h.label, e.clientX, e.clientY);
    else if (hit?.type === 'clover') showTip('เจอแล้ว! แตะเพื่อเก็บ 🍀', e.clientX, e.clientY);
    else if (performance.now() > tipHoldUntil) hideTip();
  }, {passive: true});
  addEventListener('pointerdown', e => { downAt = overUI(e) ? null : {x: e.clientX, y: e.clientY, t: e.timeStamp}; }, {passive: true});
  addEventListener('pointerup', e => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), quick = e.timeStamp - downAt.t < 500; // input timestamps, not handler time downAt = null;
    if (moved > 8 || !quick) return;
    const hit = pick(e.clientX, e.clientY); if (!hit) return;
    if (hit.type === 'clover') { collectFromScene(hit.id); showTip(`เก็บได้แล้ว ${found.size}/4 🍀`, e.clientX, e.clientY, 1600); }
    else if (e.pointerType !== 'mouse' && tapArmed !== hit.h) { tapArmed = hit.h; showTip(`${hit.h.label} · แตะอีกครั้งเพื่อไป`, e.clientX, e.clientY, 2400); }
    else location.href = hit.h.href;
  });
  let tapArmed = null;

  function collectFromScene(id) { collect(id, true); flyAway(id); }
  function flyAway(id) {
    const c = collectibles.get(id); if (!c || !c.visible) return;
    burst(c.position.clone(), '#9dffc3', 70); c.userData.gone = 0.0001;
  }
  collectInScene = flyAway;
  highlightInScene = id => { const c = collectibles.get(id); if (c) c.userData.hint = 1; };

  /* ----- render loop ----- */
  const bgDay = new THREE.Color('#cfe6dc'), bgWarm = new THREE.Color('#efe2cb'), bgDusk = new THREE.Color('#1f2a45'), bg = new THREE.Color();
  scene.background = bg; scene.fog = new THREE.Fog(bg, 45, 150);
  const clock = new THREE.Clock();
  let first = true, running = true, currentScene = '';
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  function frame() {
    if (!running) return;
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, still = reduced;
    const p = progress(), fin = idx('finale'), aspect = camera.aspect;

    // section state
    const sceneId = order[Math.round(p)];
    if (sceneId !== currentScene) { currentScene = sceneId; setRail(sceneId); tapArmed = null; }

    // camera
    targetFor(p, aspect);
    const k = first || still ? 1 : 1 - Math.exp(-Math.min(rawDt, 0.5) * 3.2); // real time, so slow devices never lag behind the scroll
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    mouse.x = lerp(mouse.x, still ? 0 : mouse.tx, 1 - Math.exp(-dt * 3)); mouse.y = lerp(mouse.y, still ? 0 : mouse.ty, 1 - Math.exp(-dt * 3));
    camera.position.copy(camPos); camera.position.x += mouse.x * 0.45; camera.position.y -= mouse.y * 0.25;
    camera.lookAt(camLook);

    // dollhouse: door swings, facade + roof open, then close again for the night view
    const doorOpen = smooth(clamp((p - 0.55) / 0.6));
    const inside = smooth(clamp((p - 1.1) / 0.7)) * (1 - smooth(clamp((p - (fin - 0.75)) / 0.6)));
    const dusk = smooth(clamp((p - (fin - 0.9)) / 0.8));
    if (door) door.rotation.y = -doorOpen * 1.7 * (1 - dusk);
    facadeMat.opacity = trimMat.opacity = 1 - inside; glassMat.opacity = 0.55 * (1 - inside);
    facade.visible = inside < 0.99;
    facadeMat.depthWrite = trimMat.depthWrite = inside < 0.05;
    roof.position.y = H + inside * 7; roof.rotation.x = -inside * 0.35;
    for (const m of roofMats) { m.opacity = 1 - inside; m.depthWrite = inside < 0.05; }
    roof.visible = inside < 0.99;
    flowers.visible = inside < 0.5; // flowerbeds would sit in the foreground of every room shot

    // sky & light mood
    bg.copy(bgDay).lerp(bgWarm, inside).lerp(bgDusk, dusk);
    scene.fog.color.copy(bg);
    hemi.intensity = lerp(1.4, 0.35, dusk); sun.intensity = lerp(2.4, 0.25, dusk); sun.color.set(dusk > 0.5 ? '#9fb4ff' : '#fff1d6');
    starMat.opacity = dusk * 0.9;
    scene.environmentIntensity = lerp(0.55, 0.1, dusk);
    // keep the shadow map tight around what the camera is looking at
    sun.target.position.set(camLook.x, 0, 0); sun.position.set(camLook.x + 14, 22, 16);
    const span = Math.round(lerp(22, 10, inside));
    if (span !== shadowSpan) { shadowSpan = span; Object.assign(sun.shadow.camera, {left: -span, right: span, top: span * 0.65, bottom: -span * 0.5}); sun.shadow.camera.updateProjectionMatrix(); }
    const lampsOn = Math.max(inside * 0.7, dusk);
    roomLights.forEach(l => { l.intensity = lampsOn * 9; });
    glassMat.emissiveIntensity = dusk * 1.6;
    cloverLight.intensity = (1 - inside) * (4 + dusk * 18);
    heroMat.emissiveIntensity = 0.35 + dusk * 0.9;
    renderer.toneMappingExposure = lerp(1.05, 1.25, dusk);
    const shift = aspect > 1.15 ? -0.17 * inside : 0;
    if (Math.abs(shift - viewShift) > 0.0005) { viewShift = shift; if (shift) camera.setViewOffset(innerWidth, innerHeight, shift * innerWidth, 0, innerWidth, innerHeight); else camera.clearViewOffset(); }
    document.body.classList.toggle('night', dusk > 0.5);

    // hero clover
    heroClover.rotation.y = still ? 0.3 : t * 0.45; heroClover.position.y = 8.4 + (still ? 0 : Math.sin(t * 1.2) * 0.25);
    halo.position.y = heroClover.position.y; halo.lookAt(camera.position); halo.scale.setScalar(1 + (still ? 0 : Math.sin(t * 2) * 0.04)); halo.material.opacity = 0.45 * (1 - inside);

    // hovered hotspot grows slightly
    for (const h of hotspots) { const want = hovered?.h === h ? 1.05 : 1; h.root.scale.lerp(tmpA.copy(h.base).multiplyScalar(want), 0.2); }

    // collectibles: bob, sparkle, hint pulse, fly-away when collected
    for (const c of collectibles.values()) {
      const u = c.userData; if (!c.visible) continue;
      if (u.gone > 0) {
        u.gone += dt * 1.6; c.position.y += dt * 3; c.rotation.y += dt * 12; c.scale.setScalar(0.17 * (1 - u.gone) + 0.001);
        if (u.gone >= 1) c.visible = false; continue;
      }
      u.hint = Math.max(0, u.hint - dt * 0.25);
      c.position.y = u.base.y + (still ? 0 : Math.sin(t * 2 + u.base.x) * 0.04);
      c.rotation.y = still ? 0.4 : t * 1.3 + u.base.x;
      const hov = hovered?.type === 'clover' && hovered.id === u.id;
      c.scale.setScalar(0.17 * (1 + (hov ? 0.35 : 0) + u.hint * (0.6 + Math.sin(t * 10) * 0.2)));
      c.children[0].material.emissiveIntensity = 0.5 + u.hint * 2 + (hov ? 0.8 : 0);
    }

    // chimney smoke, steam, motes
    if (!still) {
      for (const s of smoke) { const ph = (t * 0.18 + s.userData.phase) % 1; s.position.set(-6 + ph * 0.8, 1.9 + ph * 3.5, -1.2 - ph * 0.6); s.scale.setScalar(0.4 + ph * 1.4); s.material.opacity = 0.55 * (1 - ph) * (1 - inside); }
      for (const s of steam) { const ph = (t * 0.35 + s.userData.phase) % 1; s.position.copy(s.userData.base); s.position.y += ph * 1.1; s.position.x += Math.sin(ph * 6 + t) * 0.08; s.scale.setScalar(0.6 + ph * 1.6); s.material.opacity = 0.45 * (1 - ph); }
      const arr = moteGeo.attributes.position.array;
      for (let i = 0; i < MOTES; i++) { const sd = moteSeed[i]; arr[i * 3 + 1] += dt * (0.08 + (sd % 1) * 0.1); arr[i * 3] += Math.sin(t * 0.3 + sd) * dt * 0.05; if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = 0; }
      moteGeo.attributes.position.needsUpdate = true;
      tickers.forEach(fn => fn(t, dt));
      if (currentScene === 'office' && Math.floor(t * 2) !== monitorTex.userData.step) { monitorTex.userData.step = Math.floor(t * 2); monitorTex.userData.redraw(drawMonitor(monitorTex.userData.step)); }
    }
    moteMat.color.set(dusk > 0.5 ? '#c8ff8a' : '#fff2c4'); moteMat.size = lerp(0.12, 0.2, dusk); moteMat.opacity = 0.35 + dusk * 0.6;

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt; const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, n) => { v.y -= dt * 3; arr[n * 3] += v.x * dt; arr[n * 3 + 1] += v.y * dt; arr[n * 3 + 2] += v.z * dt; });
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.4);
      if (b.life > 1.4) { world.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }

    renderer.render(scene, camera);
    if (first) { first = false; finishLoading(); }
    requestAnimationFrame(frame);
  }
  camPos.set(...SHOTS.hero.pos); camLook.set(...SHOTS.hero.look);
  requestAnimationFrame(frame);
  // read-only test hook: progress, scene order, and where a hidden clover sits on screen
  window.__tour = {progress, order, found, screenOf(id) {
    const c = collectibles.get(id); if (!c?.visible) return null;
    const v = c.getWorldPosition(new THREE.Vector3()).project(camera);
    return {x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight};
  }};
}
