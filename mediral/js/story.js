/**
 * Mediral 5 Steps — the scroll-scrubbed scene.
 *
 * Every step plays the same grammar, borrowed from the owner's references:
 *   separate (named botanicals, a few per screen) → gather → a clear glass funnel → one drop →
 *   the product reveals bottom-up from that drop → a role movement → it leaves for the routine rail.
 * Step 1 (mousse) has no verified current pack or formula, so it plays water + foam and a name only.
 *
 * Packaging rule: pack art is front-only; bottles are lathes from their own alpha silhouette with the
 * art projected on the front (never re-drawn); flat packs are billboards; yaw ≤ ±12°.
 * Nothing here depicts skin, results, germs, rays blocked or cells: movements illustrate the step's role.
 *
 * Contract (used by js/main.js):
 *   createStory({canvas, steps, asset, reduced}) -> Promise<{setProgress(u), setSelection(ids), setBand({left, right}), state}>
 *   setBand: landscape set view only — the free screen band (0..1) between the set card and the rail.
 *   STACKED_QUERY is the one media query that switches both the CSS and the scene to words-below-scene.
 *   u: 0..1 = step 1, 1..2 = step 2 … 4..5 = step 5, 5..6 = the set. Scene is a pure function of u + idle time.
 *   Rejects if WebGL or the pack images fail, so main.js keeps the static stills.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, LatheGeometry, Vector2, Vector3,
  MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, SphereGeometry, CanvasTexture,
  SRGBColorSpace, PMREMGenerator, NeutralToneMapping, DirectionalLight, HemisphereLight, MathUtils,
  DoubleSide, InstancedMesh, Object3D,
} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const ADDITIVE = 2; // THREE.AdditiveBlending (not exported by the vendored subset)
const MAX_YAW = MathUtils.degToRad(12);
const clamp01 = x => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a)); // 0..1 inside [a, b]
const ease = x => x * x * (3 - 2 * x);
const easeOut = x => 1 - (1 - x) ** 3;
const lerp = MathUtils.lerp;

/* ---------- canvas helpers ---------- */
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', {willReadFrequently: true})];
}
function tex(c) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function radialTexture(stops) {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return tex(c);
}
function ringTexture() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 96, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,250,236,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return tex(c);
}
function beamTexture() {
  const [c, g] = canvas(128, 512);
  const v = g.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, 'rgba(255,240,205,0)');
  v.addColorStop(0.3, 'rgba(255,240,205,0.9)');
  v.addColorStop(1, 'rgba(255,240,205,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 512);
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.5, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h;
  g.fillRect(0, 0, 128, 512);
  return tex(c);
}
function labelTexture(text, {size = 44, color = '#0e4f2c', w = 512, h = 96, font = '"Noto Sans Thai", sans-serif', weight = 500} = {}) {
  const [c, g] = canvas(w, h);
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2, w - 16);
  return tex(c);
}
async function loadImage(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return img;
}
async function imageTexture(url, anisotropy) {
  const t = new CanvasTexture(await loadImage(url));
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/* ---------- bottles from their own silhouette ---------- */
function silhouette(img) {
  const W = 220, H = Math.round(W * img.naturalHeight / img.naturalWidth);
  const [, g] = canvas(W, H);
  g.drawImage(img, 0, 0, W, H);
  const a = g.getImageData(0, 0, W, H).data;
  const rows = new Array(H).fill(null);
  let top = -1, bottom = -1;
  const centers = [];
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 120) { if (l < 0) l = x; r = x; }
    if (l < 0) continue;
    rows[y] = [l, r];
    if (top < 0) top = y;
    bottom = y;
    centers.push((l + r + 1) / 2);
  }
  if (top < 0) throw new Error('pack image has no opaque pixels');
  centers.sort((p, q) => p - q);
  return {W, H, rows, top, bottom, cx: centers[Math.floor(centers.length / 2)]};
}
function latheFromSilhouette(sil, height) {
  const {rows, top, bottom, cx} = sil;
  const scale = height / (bottom - top + 1);
  const pts = [new Vector2(0, 0)];
  const step = Math.max(1, Math.round((bottom - top) / 110));
  for (let y = bottom; y >= top; y -= step) {
    const win = [];
    for (let k = -1; k <= 1; k++) { const row = rows[y + k]; if (row) win.push(Math.max(cx - row[0], row[1] + 1 - cx)); }
    const r = win.length ? win.sort((p, q) => p - q)[Math.floor(win.length / 2)] : 0.5;
    pts.push(new Vector2(Math.max(0.002, r * scale), (bottom - y) * scale));
  }
  pts.push(new Vector2(0, (bottom - top + 1) * scale));
  const geo = new LatheGeometry(pts, 56);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (cx + pos.getX(i) / scale) / sil.W, 1 - (bottom - pos.getY(i) / scale) / sil.H);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* Bottom-up reveal with a warm edge, plus a "dim" for pieces the buyer unticked in the set view. */
function addReveal(material, height, billboard) {
  const u = {uReveal: {value: 0}, uHeight: {value: height}, uDim: {value: 0}};
  material.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uHeight;\nvarying float vRy;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n  vRy = ${billboard ? 'position.y / uHeight + 0.5' : 'position.y / uHeight'};`);
    sh.fragmentShader = 'uniform float uReveal;\nuniform float uDim;\nvarying float vRy;\n' + sh.fragmentShader
      .replace('void main() {', 'void main() {\n  if (vRy > uReveal) discard;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float edge = (1.0 - smoothstep(0.0, 0.07, uReveal - vRy)) * (1.0 - step(1.0, uReveal));
  gl_FragColor.rgb += vec3(1.0, 0.9, 0.68) * edge * 1.1;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.95, 0.92), uDim * 0.6);
  gl_FragColor.a *= 1.0 - uDim * 0.65;`);
  };
  material.customProgramCacheKey = () => `mediral-reveal-${billboard ? 'b' : 'l'}`;
  return u;
}

/* ---------- step look ---------- */
const TINT = {CL: 0xf4fbff, AC: 0xeef6ff, BR: 0xe4efb4, SU: 0xfff0d2, PO: 0xefdcc6};

/* ---------- camera ---------- */
export const STACKED_QUERY = '(max-width: 760px), (orientation: portrait) and (max-width: 1100px)';
function framing(tall) {
  return tall
    ? {fov: 40, base: new Vector3(0, 0.5, 5.3), look: new Vector3(0, 0.12, 0), shiftY: 0.23}
    : {fov: 30, base: new Vector3(0, 0.45, 6.0), look: new Vector3(0, 0.2, 0), shiftY: 0};
}

export async function createStory({canvas: el, steps, asset, reduced = false}) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new WebGLRenderer({canvas: el, antialias: !small, alpha: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = NeutralToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new HemisphereLight(0xfffaf0, 0xd5e2d2, 0.9));
  const key = new DirectionalLight(0xfff0d6, 1.4);
  key.position.set(-3, 5, 4);
  scene.add(key);

  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  const rnd = seeded(5);
  await document.fonts?.ready;

  /* ---- shared FX ---- */
  const glow = radialTexture([[0, 'rgba(255,246,222,1)'], [0.35, 'rgba(255,236,196,0.55)'], [1, 'rgba(255,236,196,0)']]);
  const soft = radialTexture([[0, 'rgba(18,48,30,0.35)'], [1, 'rgba(18,48,30,0)']]);
  const ring = ringTexture();

  // Glass funnel: the "formulation" gesture from the reference, not a claim about manufacturing.
  const funnelGeo = new LatheGeometry([
    new Vector2(0.03, -0.86), new Vector2(0.045, -0.62), new Vector2(0.08, -0.5), new Vector2(0.3, -0.24),
    new Vector2(0.58, -0.02), new Vector2(0.64, 0), new Vector2(0.62, 0.01),
  ], 64);
  const funnelMat = new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, side: DoubleSide, depthWrite: false});
  const funnel = new Mesh(funnelGeo, funnelMat);
  const funnelTint = new Mesh(funnelGeo, new MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false, side: DoubleSide}));
  funnelTint.scale.set(0.9, 0.9, 0.9);
  const funnelGroup = new Group();
  funnelGroup.add(funnel, funnelTint);
  funnelGroup.position.set(0, 1.5, 0);
  scene.add(funnelGroup);

  const drop = new Mesh(new SphereGeometry(0.06, 24, 16), new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.85, clearcoat: 1, envMapIntensity: 2}));
  drop.visible = false;
  scene.add(drop);

  const core = new Mesh(new PlaneGeometry(1.1, 1.1), new MeshBasicMaterial({map: glow, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false}));
  scene.add(core);

  const shadow = new Mesh(new PlaneGeometry(1.4, 0.5), new MeshBasicMaterial({map: soft, transparent: true, opacity: 0, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -0.56, 0);
  scene.add(shadow);

  // Bubbles (mousse), droplets (serums), powder (puff), dust (ambient) — instanced, cheap.
  // Soap-film look on a pale page: clear centre, visible tinted rim (fresnel), iridescent highlights.
  const rim = (material, rimColor) => {
    material.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.6);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, ${rimColor}, fres * 0.55);
  gl_FragColor.a = clamp(0.1 + fres * 0.95, 0.0, 1.0) * opacity;`);
    };
    material.customProgramCacheKey = () => `mediral-rim-${rimColor}`;
    return material;
  };
  const bubbleMat = rim(new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.9, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 520], envMapIntensity: 1.8, depthWrite: false}), 'vec3(0.56, 0.68, 0.6)');
  const BUB = small ? 44 : 70;
  const bubbles = new InstancedMesh(new SphereGeometry(1, 20, 14), bubbleMat, BUB);
  const bubbleSeeds = Array.from({length: BUB}, () => ({a: rnd() * 6.283, r: 0.2 + rnd() * 1.6, y: -0.5 + rnd() * 1.6, s: 0.03 + rnd() * 0.11, p: rnd()}));
  scene.add(bubbles);

  const DROPS = 26;
  const dropletMat = rim(new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.95, clearcoat: 1, envMapIntensity: 2, depthWrite: false}), 'vec3(0.5, 0.64, 0.56)');
  const droplets = new InstancedMesh(new SphereGeometry(1, 18, 12), dropletMat, DROPS);
  const dropletSeeds = Array.from({length: DROPS}, () => ({a: rnd() * 6.283, r: 0.55 + rnd() * 0.75, y: -0.45 + rnd() * 1.4, s: 0.02 + rnd() * 0.05, p: rnd()}));
  scene.add(droplets);

  const POW = small ? 140 : 240;
  const powder = new InstancedMesh(new SphereGeometry(1, 6, 4), new MeshBasicMaterial({color: 0xe9d3b8, transparent: true, opacity: 0.8, depthWrite: false}), POW);
  const powderSeeds = Array.from({length: POW}, () => ({a: rnd() * 6.283, r: rnd() * 1.2, y: 1.3 + rnd() * 1.2, s: 0.006 + rnd() * 0.012, p: rnd()}));
  scene.add(powder);
  const veil = new Mesh(new PlaneGeometry(2.4, 2.4), new MeshBasicMaterial({map: radialTexture([[0, 'rgba(239,220,198,0.95)'], [0.6, 'rgba(239,220,198,0.4)'], [1, 'rgba(239,220,198,0)']]), transparent: true, opacity: 0, depthWrite: false}));
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = -0.55;
  scene.add(veil);

  const ripples = [0, 1, 2].map(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({map: ring, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false}));
    m.rotation.x = -Math.PI / 2;
    m.position.y = -0.55;
    scene.add(m);
    return m;
  });

  const beamMap = beamTexture();
  const sunBeams = [0, 1, 2, 3].map(i => {
    const b = new Mesh(new PlaneGeometry(0.5 + i * 0.18, 5), new MeshBasicMaterial({map: beamMap, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false, side: DoubleSide}));
    b.position.set(-2.2 + i * 0.55, 1.8, -1.2);
    b.rotation.z = 0.62;
    scene.add(b);
    return b;
  });
  const halo = new Mesh(new PlaneGeometry(2.2, 2.2), new MeshBasicMaterial({map: ring, color: 0xfff0cc, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false}));
  scene.add(halo);

  const DUST = small ? 40 : 90;
  const dust = new InstancedMesh(new SphereGeometry(0.005, 6, 4), new MeshBasicMaterial({color: 0xfff1d0, transparent: true, opacity: 0.7, blending: ADDITIVE, depthWrite: false}), DUST);
  const dustSeeds = Array.from({length: DUST}, () => ({x: (rnd() - 0.5) * 5, y: -0.8 + rnd() * 3, z: (rnd() - 0.5) * 2, p: rnd() * 6.28, s: 0.4 + rnd()}));
  scene.add(dust);
  const tmp = new Object3D();

  /* ---- products (one per step) ---- */
  const products = {};
  for (const step of steps) {
    const g = new Group();
    g.visible = false;
    scene.add(g);
    const entry = {step, group: g, uniforms: null, height: step.height, mesh: null};
    if (!step.image) {
      // Step 1 without a verified pack: a soft foam cluster stands in; the name lives in the DOM.
      const cluster = new Group();
      for (let i = 0; i < 26; i++) {
        const b = new Mesh(new SphereGeometry(1, 20, 14), bubbleMat);
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.34;
        b.position.set(Math.cos(a) * r, 0.25 + rnd() * 0.5 - r * 0.4, Math.sin(a) * r * 0.6);
        b.scale.setScalar(0.06 + rnd() * 0.12);
        cluster.add(b);
      }
      g.add(cluster);
      entry.foam = cluster;
    } else if (step.render === 'lathe') {
      const img = await loadImage(asset(step.image));
      const geo = latheFromSilhouette(silhouette(img), step.height);
      const map = new CanvasTexture(img);
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = anisotropy;
      const mat = new MeshPhysicalMaterial({map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.85, alphaTest: 0.5, transparent: true});
      mat.color.setScalar(0.62);
      entry.uniforms = addReveal(mat, step.height, false);
      entry.mesh = new Mesh(geo, mat);
      g.add(entry.mesh);
    } else {
      const img = await loadImage(asset(step.image));
      const map = new CanvasTexture(img);
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = anisotropy;
      const w = step.height * img.naturalWidth / img.naturalHeight;
      const mat = new MeshBasicMaterial({map, transparent: true, alphaTest: 0.3});
      entry.uniforms = addReveal(mat, step.height, true);
      entry.mesh = new Mesh(new PlaneGeometry(w, step.height), mat);
      entry.mesh.position.y = step.height / 2;
      entry.billboard = true;
      g.add(entry.mesh);
    }
    products[step.id] = entry;
  }

  /* ---- specimens (named botanicals), loaded per step ---- */
  // One load per step, ever: the promise is cached before anything resolves, so scroll events that call
  // warm() again reuse it. Groups join the scene only when the whole step has loaded. A failed step stays
  // failed (no retry storm); its product still reveals, just without plates.
  const specimens = {};
  const pending = {};
  function loadSpecimens(step) {
    if (!step.featured?.length) return Promise.resolve(null);
    pending[step.id] ??= Promise.all(step.featured.slice(0, 5).map(async (item, i, list) => {
      const map = await imageTexture(asset(item.image), anisotropy);
      const plate = new Mesh(new PlaneGeometry(0.56, 0.56), new MeshBasicMaterial({map, transparent: true, alphaTest: 0.04, depthWrite: false}));
      const label = new Mesh(new PlaneGeometry(0.72, 0.135), new MeshBasicMaterial({map: labelTexture(item.name), transparent: true, depthWrite: false}));
      label.position.y = -0.38;
      const g = new Group();
      g.add(plate, label);
      g.visible = false;
      return {g, plate, label, i, n: list.length, spin: (rnd() - 0.5) * 0.6};
    })).then(list => {
      list.forEach(sp => scene.add(sp.g));
      specimens[step.id] = list;
      return list;
    });
    return pending[step.id];
  }

  /* ---- state ---- */
  const s = {u: 0, target: 0, time: 0, last: 0, running: false, frames: 0, reduced, tall: false,
    selection: new Set(steps.map(x => x.id)), pointer: new Vector2(), pointerCur: new Vector2(),
    band: null}; // landscape set view: free screen band {left, right} in 0..1, measured by main.js from the DOM
  const view = {w: 1, h: 1};
  const camPos = new Vector3(), camLook = new Vector3();
  // Same query as the CSS layout switch (words below the scene), so scene and text always agree.
  const stacked = matchMedia(STACKED_QUERY);

  function resize() {
    view.w = innerWidth; view.h = innerHeight;
    s.tall = stacked.matches;
    const f = framing(s.tall);
    camera.fov = f.fov;
    camera.aspect = view.w / view.h;
    // Portrait: move the image up so text owns the lower part of the screen.
    if (f.shiftY) camera.setViewOffset(view.w, view.h, 0, view.h * f.shiftY, view.w, view.h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(view.w, view.h, false);
  }

  /* ---- the scene as a function of u ---- */
  const setHidden = arr => arr.forEach(m => { m.visible = false; });
  function place(u, time) {
    const f = framing(s.tall);
    const stepIndex = Math.min(steps.length - 1, Math.floor(Math.min(u, steps.length - 0.0001)));
    const t = u >= steps.length ? 1 : u - stepIndex;
    const step = steps[stepIndex];
    const setT = clamp01(u - steps.length);
    const tint = TINT[step.id] ?? 0xffffff;

    // Reset per-frame visibility.
    for (const e of Object.values(products)) e.group.visible = false;
    for (const list of Object.values(specimens)) list?.forEach(sp => { sp.g.visible = false; });
    bubbles.visible = droplets.visible = powder.visible = drop.visible = false;
    funnelMat.opacity = 0; funnelTint.material.opacity = 0; core.material.opacity = 0; halo.material.opacity = 0;
    veil.material.opacity = 0; shadow.material.opacity = 0; shadow.scale.set(1, 1, 1); shadow.position.x = 0;
    sunBeams.forEach(b => { b.material.opacity = 0; });
    ripples.forEach(r => { r.material.opacity = 0; });

    // Camera: gentle dolly per phase, pull back for the set.
    const gather = step.featured?.length ? ease(seg(t, 0.18, 0.46)) * (1 - ease(seg(t, 0.5, 0.64))) : 0;
    camPos.copy(f.base).add(new Vector3(Math.sin(stepIndex * 1.3) * 0.25, gather * 0.55, -ease(seg(t, 0.5, 0.75)) * 0.7 + gather * 0.3));
    camLook.copy(f.look).add(new Vector3(0, gather * 0.75, 0));
    if (u >= steps.length) { camPos.set(0, f.base.y + 0.35, f.base.z + 0.9); camLook.copy(f.look); }

    if (u < steps.length) {
      const e = products[step.id];
      if (!step.image) playMousse(t, time, e);
      else playStep(step, t, time, e, tint);
    } else {
      playSet(setT, time);
    }

    // Ambient dust drifts in the key light.
    dustSeeds.forEach((d, i) => {
      tmp.position.set(d.x + Math.sin(time * 0.2 * d.s + d.p) * 0.15, -0.8 + ((d.y + 0.8 + time * 0.03 * d.s) % 3), d.z);
      tmp.scale.setScalar(0.7 + Math.sin(time + d.p) * 0.3);
      tmp.updateMatrix();
      dust.setMatrixAt(i, tmp.matrix);
    });
    dust.instanceMatrix.needsUpdate = true;
  }

  function showProduct(e, reveal, {x = 0, y = -0.55, z = 0, scale = 1, dim = 0, yaw = 0} = {}) {
    e.group.visible = true;
    e.group.position.set(x, y, z);
    e.group.scale.setScalar(scale);
    if (e.uniforms) { e.uniforms.uReveal.value = reveal >= 1 ? 1.02 : reveal; e.uniforms.uDim.value = dim; }
    if (e.mesh) {
      if (e.billboard) e.mesh.quaternion.copy(camera.quaternion);
      else e.mesh.rotation.y = MathUtils.clamp(yaw, -MAX_YAW, MAX_YAW);
    }
    if (e.foam) e.foam.scale.setScalar(Math.max(0.001, reveal));
  }

  function toRail(t) { // the last beat: glide down-right and shrink toward the DOM routine rail
    const k = ease(seg(t, 0.9, 1));
    return {x: k * (s.tall ? 0 : 1.6), y: -0.55 - k * (s.tall ? 1.2 : 0.4), scale: 1 - k * 0.85, alpha: 1 - seg(t, 0.96, 1)};
  }

  function playMousse(t, time, e) {
    // Water opens the space: ripples on a still surface.
    ripples.forEach((r, i) => {
      const k = ((time * 0.18 + i / 3) % 1);
      r.scale.setScalar(0.4 + k * 3.2);
      r.material.opacity = (1 - k) * 0.55 * (1 - seg(t, 0.85, 1));
    });
    // Foam blooms and drifts: the cleansing role, drawn as texture, not as germs or skin.
    bubbles.visible = true;
    bubbleMat.opacity = 0.9;
    const bloom = easeOut(seg(t, -0.3, 0.4)); // already foaming on arrival
    const sweep = ease(seg(t, 0.55, 0.9));
    bubbleSeeds.forEach((b, i) => {
      const a = b.a + time * 0.05 * (0.5 + b.p);
      const r = b.r * (0.35 + bloom * 0.65);
      tmp.position.set(Math.cos(a) * r + sweep * 2.4 * (0.5 + b.p), b.y + Math.sin(time * 0.6 + i) * 0.04 + bloom * 0.1, Math.sin(a) * r * 0.5 - 0.3);
      const pop = seg(t, 0.8 + b.p * 0.12, 0.9 + b.p * 0.1);
      tmp.scale.setScalar(Math.max(0.0001, b.s * bloom * (1 - pop)));
      tmp.updateMatrix();
      bubbles.setMatrixAt(i, tmp.matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
    const reveal = easeOut(seg(t, 0.05, 0.45));
    const rail = toRail(t);
    shadow.material.opacity = 0.5 * reveal * rail.alpha;
    showProduct(e, reveal, {x: rail.x, y: rail.y, scale: rail.scale * 1.1});
  }

  function playStep(step, t, time, e, tint) {
    const list = specimens[step.id];
    // 1) Separate: named botanicals appear one by one on a loose arc, like specimen plates.
    // 2) Gather: they rise and funnel in.
    if (list) {
      list.forEach(sp => {
        const appear = easeOut(seg(t, 0.02 + sp.i * 0.035, 0.14 + sp.i * 0.035));
        const g = ease(seg(t, 0.2 + sp.i * 0.02, 0.44));
        if (appear <= 0 || g >= 1) return;
        sp.g.visible = true;
        // A loose arc over the stage centre, clear of the text columns on both sides.
        const theta = sp.n > 1 ? (sp.i / (sp.n - 1) - 0.5) * 2.1 : 0;
        const radius = s.tall ? 0.66 : 1.0;
        const hx = Math.sin(theta) * radius;
        const hy = (s.tall ? 0.2 : 0.42) + Math.cos(theta) * (s.tall ? 0.34 : 0.42) + Math.sin(time * 0.5 + sp.i) * 0.025;
        const x = lerp(hx, 0, g), y = lerp(hy, 1.45, g), z = lerp(0.2, 0, g);
        sp.g.position.set(x, y, z);
        sp.g.quaternion.copy(camera.quaternion);
        sp.g.scale.setScalar(Math.max(0.0001, appear * (1 - g * 0.85)));
        sp.plate.material.opacity = appear * (1 - seg(t, 0.4, 0.46));
        sp.label.material.opacity = appear * (1 - ease(seg(t, 0.2, 0.3)));
        sp.plate.rotation.z = g * sp.spin * 4;
      });
    }
    // 3) The glass funnel receives them and glows in the product's tint.
    const funnelIn = ease(seg(t, 0.16, 0.3)) * (1 - ease(seg(t, 0.58, 0.68)));
    funnelMat.opacity = 0.28 * funnelIn;
    funnelTint.material.color.setHex(tint);
    funnelTint.material.opacity = 0.35 * ease(seg(t, 0.36, 0.48)) * funnelIn;
    funnelGroup.rotation.y = time * 0.15;
    // 4) One drop falls from the spout to where the product will stand.
    const fall = seg(t, 0.46, 0.56);
    if (fall > 0 && fall < 1) {
      drop.visible = true;
      drop.material.color.setHex(tint);
      drop.position.set(0, lerp(0.62, -0.05 + e.height * 0.4, fall * fall), 0);
      drop.scale.set(1, 1 + fall * 0.5, 1);
    }
    core.position.set(0, -0.55 + e.height * 0.45, 0.05);
    core.quaternion.copy(camera.quaternion);
    core.material.opacity = 0.9 * seg(t, 0.52, 0.56) * (1 - seg(t, 0.6, 0.72));
    // 5) Reveal bottom-up from the drop's light.
    const reveal = easeOut(seg(t, 0.54, 0.7));
    const rail = toRail(t);
    shadow.material.opacity = 0.5 * reveal * rail.alpha;
    const yaw = reduced ? 0 : Math.sin(time * 0.3) * 0.12 + s.pointerCur.x * 0.1;
    showProduct(e, reveal, {x: rail.x, y: rail.y, scale: rail.scale, yaw});
    // 6) Role movement.
    const role = ease(seg(t, 0.66, 0.78)) * (1 - seg(t, 0.9, 0.97));
    if (step.role === 'droplets') playDroplets(role, time, tint, e);
    if (step.role === 'light') playLight(role, time, e);
    if (step.role === 'powder') playPowder(t, role, time);
  }

  function playDroplets(role, time, tint, e) {
    if (role <= 0) return;
    droplets.visible = true;
    dropletMat.color.setHex(tint);
    dropletSeeds.forEach((d, i) => {
      const a = d.a + time * 0.18 * (0.6 + d.p);
      tmp.position.set(Math.cos(a) * d.r, -0.55 + e.height * 0.5 + d.y * 0.6 + Math.sin(time * 0.8 + i) * 0.05, Math.sin(a) * d.r * 0.55);
      tmp.scale.setScalar(Math.max(0.0001, d.s * role));
      tmp.updateMatrix();
      droplets.setMatrixAt(i, tmp.matrix);
    });
    droplets.instanceMatrix.needsUpdate = true;
  }

  function playLight(role, time, e) {
    // Daylight arrives: warm beams and a soft halo around the tube. No shield, no percentages.
    sunBeams.forEach((b, i) => { b.material.opacity = role * (0.16 + Math.sin(time * 0.5 + i) * 0.04); });
    halo.position.set(0, -0.55 + e.height * 0.55, -0.2);
    halo.quaternion.copy(camera.quaternion);
    halo.scale.setScalar(0.9 + role * 0.25 + Math.sin(time * 0.7) * 0.02);
    halo.material.opacity = role * 0.5;
  }

  function playPowder(t, role, time) {
    const fall = seg(t, 0.64, 0.86);
    if (fall <= 0 || role <= 0) return;
    powder.visible = true;
    powderSeeds.forEach((p, i) => {
      const k = clamp01(fall * 1.3 - p.p * 0.3);
      const a = p.a + time * 0.1;
      tmp.position.set(Math.cos(a) * p.r * (1.1 - k * 0.3), lerp(p.y, -0.53, easeOut(k)), Math.sin(a) * p.r * 0.5);
      tmp.scale.setScalar(Math.max(0.0001, p.s * role));
      tmp.updateMatrix();
      powder.setMatrixAt(i, tmp.matrix);
    });
    powder.instanceMatrix.needsUpdate = true;
    veil.material.opacity = 0.75 * ease(seg(t, 0.74, 0.88)) * role;
  }

  function playSet(t, time) {
    // All five, in routine order, form one composition. Unticked pieces dim; the choice is the buyer's.
    const n = steps.length;
    const k = easeOut(t * 1.6 > 1 ? 1 : t * 1.6);
    // Landscape: the set card owns the left, so the five stand in the free band the DOM reports
    // (card's right edge → rail's left edge), converted to world units at the stage plane.
    let gap = 0.46, offsetX = 0, size = 0.58;
    if (!s.tall) {
      const dist = camPos.distanceTo(camLook);
      const halfW = dist * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const band = s.band ?? {left: 0.45, right: 0.94};
      offsetX = ((band.left + band.right) / 2 * 2 - 1) * halfW;
      const width = (band.right - band.left) * 2 * halfW;
      gap = Math.min(0.56, width / 5.4);
      size = Math.min(0.7, gap * 1.25);
    }
    steps.forEach((step, i) => {
      const e = products[step.id];
      const x = offsetX + (i - (n - 1) / 2) * gap;
      const scale = size * (0.6 + 0.4 * k);
      const dim = s.selection.has(step.id) ? 0 : 1;
      showProduct(e, 1, {x, y: -0.55 + Math.sin(time * 0.6 + i) * 0.015, z: -Math.abs(i - (n - 1) / 2) * 0.2, scale, dim, yaw: reduced ? 0 : Math.sin(time * 0.25 + i) * 0.08});
    });
    shadow.position.x = offsetX;
    shadow.scale.set(Math.max(1.2, gap * 4.2), 1, 1);
    shadow.material.opacity = 0.45 * k;
    bubbleMat.opacity = s.selection.has(steps[0].id) ? 0.9 : 0.3;
  }

  /* ---- loop ---- */
  // Exactly one queued frame at a time: the id is kept so hiding the tab cancels it, and wake() never
  // queues a second loop on top of one that is still pending.
  let raf = 0;
  function frame(now) {
    raf = 0;
    if (!s.running) return;
    const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
    s.last = now;
    if (!reduced) s.time += dt;
    const k = reduced ? 1 : 1 - Math.exp(-dt / 0.12);
    s.u += (s.target - s.u) * k;
    if (Math.abs(s.target - s.u) < 0.0005) s.u = s.target;
    s.pointerCur.lerp(s.pointer, reduced ? 0 : 1 - Math.exp(-dt / 0.4));
    place(s.u, s.time);
    const shake = reduced ? 0 : 1;
    camera.position.copy(camPos).add(new Vector3(s.pointerCur.x * 0.12 * shake, s.pointerCur.y * 0.06 * shake, 0));
    camera.lookAt(camLook);
    renderer.render(scene, camera);
    s.frames++;
    if (reduced && s.u === s.target) { s.running = false; s.last = 0; return; }
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || document.hidden) return;
    s.running = true;
    raf = requestAnimationFrame(frame);
  }
  function sleep() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    s.running = false;
    s.last = 0;
  }

  addEventListener('resize', () => { resize(); wake(); });
  stacked.addEventListener?.('change', () => { resize(); wake(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else wake(); });
  if (!reduced) addEventListener('pointermove', e => { s.pointer.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)); }, {passive: true});

  // Preload specimens for the step in view and the next one. Reduced motion shows each step already
  // composed (plates have left), so it never downloads them; the page's stills carry the botanicals.
  const warm = u => {
    if (reduced) return;
    const i = Math.min(steps.length - 1, Math.floor(Math.max(0, u)));
    for (const j of [i, i + 1]) if (steps[j]) loadSpecimens(steps[j]).then(wake, err => console.warn('[mediral] specimens', err));
  };

  resize();
  warm(0);
  wake();

  return {
    // Reduced motion: each step is shown composed (product formed, role visible) instead of scrubbed.
    setProgress(u) {
      const snapped = reduced && u < steps.length ? Math.floor(u) + 0.8 : u;
      s.target = Math.max(0, Math.min(steps.length + 1, snapped));
      warm(s.target);
      wake();
    },
    setSelection(ids) { s.selection = new Set(ids); wake(); },
    setBand(band) { s.band = band; wake(); },
    state: s,
  };
}
