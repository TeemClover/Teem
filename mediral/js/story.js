/**
 * Mediral 5 Steps — the scroll-scrubbed scene.
 *
 * Every step plays the same grammar, borrowed from the owner's references:
 *   named botanicals → abstract extract streams → a glass blending vessel → one drop →
 *   the product reveals bottom-up from that drop → a role movement → it leaves for the routine rail.
 * Step 1 opens on its supplied bottle with water and foam; no plants imply an unverified formula.
 *
 * Packaging rule: pack art is front-only; bottles are lathes from their own alpha silhouette with the
 * art projected on the front (never re-drawn); flat packs are billboards; yaw ≤ ±12°.
 * Nothing here depicts skin, results, germs, rays blocked or cells: movements illustrate the step's role.
 *
 * Contract (used by js/main.js):
 *   createStory({canvas, steps, asset, reduced, onContextChange}) -> Promise<stage>
 *   stage: setProgress(u), setIngredient(index|null), setSelection(ids), setBand({left, right}), setReducedMotion(bool), pause(), resume(), dispose(), state
 *   onContextChange('lost' | 'restored'): main.js switches between the scene and readable DOM stills.
 *   setBand: landscape set view only — the free screen band (0..1) between the set card and the rail.
 *   STACKED_QUERY is the one media query that switches both the CSS and the scene to words-below-scene.
 *   u: -1..0 = all-five introduction; 0..1 = step 1 … 4..5 = step 5, 5..6 = the selected set.
 *   Ingredient focus accents a botanical without altering the purchase selection or hiding its peers.
 *   state.phase, phaseProgress and stepId expose the current visual phase for companion media.
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
const cubic = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
const LAB_PHASES = [['material', 0, 0.38], ['extraction', 0.38, 0.5], ['concentrate', 0.5, 0.58], ['formulation', 0.58, 0.67], ['drop', 0.67, 0.74], ['reveal', 0.74, 0.85], ['role', 0.85, 1]];

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

function addExtraction(material) {
  const amount = {value: 0};
  material.onBeforeCompile = shader => {
    shader.uniforms.uExtraction = amount;
    shader.fragmentShader = 'uniform float uExtraction;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  #ifdef USE_MAP
    float extractionNoise = fract(sin(dot(floor(vMapUv * 92.0), vec2(12.9898, 78.233))) * 43758.5453);
    float extractionFront = mix(-0.16, 1.16, uExtraction);
    float extractionGrain = vMapUv.y + (extractionNoise - 0.5) * 0.12;
    float extractionKeep = smoothstep(extractionFront - 0.025, extractionFront + 0.045, extractionGrain);
    float extractionEdge = 1.0 - smoothstep(0.0, 0.045, abs(extractionGrain - extractionFront));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.92, 0.58), extractionEdge * 0.28);
    diffuseColor.a *= extractionKeep;
  #endif`);
  };
  material.customProgramCacheKey = () => 'mediral-botanical-extraction-v1';
  return amount;
}

/* ---------- step look ---------- */
const TINT = {CL: 0xf4fbff, AC: 0xeef6ff, BR: 0xe4efb4, SU: 0xfff0d2, PO: 0xefdcc6};

/* ---------- camera ---------- */
export const STACKED_QUERY = '(max-width: 1100px)';
function framing(tall) {
  return tall
    ? {fov: 37, base: new Vector3(0, 0.16, 5.15), look: new Vector3(0, 0, 0), shiftX: 0, shiftY: 0.19}
    : {fov: 35, base: new Vector3(0, 0.3, 5.7), look: new Vector3(0, 0.02, 0), shiftX: -0.14, shiftY: 0};
}

export async function createStory({canvas: el, steps, asset, reduced = false, onContextChange = () => {}}) {
  let disposed = false;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new WebGLRenderer({canvas: el, antialias: !small, alpha: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = NeutralToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  let environmentTarget;
  function refreshEnvironment() {
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    try {
      const next = pmrem.fromScene(room, 0.04);
      const previous = environmentTarget;
      scene.environment = next.texture;
      environmentTarget = next;
      previous?.dispose();
    } finally {
      room.dispose();
      pmrem.dispose();
    }
  }
  refreshEnvironment();
  scene.add(new HemisphereLight(0xfffaf0, 0x8f9f75, 0.65));
  const key = new DirectionalLight(0xfff7e8, 2.2);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const edgeLight = new DirectionalLight(0xe4f5cd, 2.6);
  edgeLight.position.set(3, 2, -2);
  scene.add(edgeLight);

  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  const rnd = seeded(5);
  await document.fonts?.ready;

  /* ---- shared FX ---- */
  const glow = radialTexture([[0, 'rgba(255,246,222,1)'], [0.35, 'rgba(255,236,196,0.55)'], [1, 'rgba(255,236,196,0)']]);
  const soft = radialTexture([[0, 'rgba(18,48,30,0.35)'], [1, 'rgba(18,48,30,0)']]);
  const ring = ringTexture();

  // Glass funnel: the "formulation" gesture from the reference, not a claim about manufacturing.
  const funnelGeo = new LatheGeometry([
    new Vector2(0.055, -1.05), new Vector2(0.075, -0.88), new Vector2(0.09, -0.7),
    new Vector2(0.2, -0.46), new Vector2(0.54, -0.15), new Vector2(0.79, 0.075),
    new Vector2(0.825, 0.11), new Vector2(0.82, 0.145), new Vector2(0.79, 0.155),
    new Vector2(0.76, 0.11), new Vector2(0.51, -0.18), new Vector2(0.17, -0.48),
    new Vector2(0.06, -0.72), new Vector2(0.04, -1.05), new Vector2(0.055, -1.05),
  ], small ? 64 : 96);
  // The page background lives in CSS, outside WebGL's transmission buffer. Keep real curved-glass
  // reflections, but use Fresnel alpha for the body so its centre actually reads through to that page.
  const funnelMat = new MeshPhysicalMaterial({color: 0xa8bb8b, roughness: 0.095, metalness: 0, transparent: true, opacity: 0, clearcoat: 0.75, clearcoatRoughness: 0.04, envMapIntensity: 1.1, side: DoubleSide, depthWrite: false});
  funnelMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float glassEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.7);
  vec3 glassReflection = clamp(gl_FragColor.rgb, vec3(0.0), vec3(1.0));
  gl_FragColor.rgb = mix(vec3(0.32, 0.46, 0.23), glassReflection, 0.24 + glassEdge * 0.36);
  gl_FragColor.a = opacity * (0.035 + glassEdge * 0.4);`);
  };
  funnelMat.customProgramCacheKey = () => 'mediral-funnel-fresnel-glass-v2';
  const funnel = new Mesh(funnelGeo, funnelMat);
  const lipProfile = Array.from({length: 17}, (_, i) => {
    const angle = i / 16 * Math.PI * 2;
    return new Vector2(0.8 + Math.cos(angle) * 0.025, 0.125 + Math.sin(angle) * 0.025);
  });
  const funnelRim = new Mesh(new LatheGeometry(lipProfile, small ? 64 : 96), new MeshPhysicalMaterial({color: 0x52764a, roughness: 0.06, transmission: 0.34, thickness: 0.06, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 3, depthWrite: false}));
  const funnelGroup = new Group();
  funnelGroup.add(funnel, funnelRim);
  funnelGroup.position.set(0, 1.5, 0);
  scene.add(funnelGroup);

  // An unnumbered glass receiving vessel makes the spatial lab readable; it asserts no dose or test.
  const reservoirGeo = new LatheGeometry([
    new Vector2(0, 0), new Vector2(0.32, 0), new Vector2(0.345, 0.025),
    new Vector2(0.345, 0.67), new Vector2(0.365, 0.69), new Vector2(0.363, 0.715),
    new Vector2(0.332, 0.715), new Vector2(0.31, 0.675), new Vector2(0.31, 0.045),
    new Vector2(0, 0.045), new Vector2(0, 0),
  ], small ? 48 : 72);
  const reservoirMat = new MeshPhysicalMaterial({color: 0xf1ffeb, roughness: 0.075, transmission: 0.8, thickness: 0.08, ior: 1.47, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 2.4, side: DoubleSide, depthWrite: false});
  const reservoir = new Group();
  reservoir.add(new Mesh(reservoirGeo, reservoirMat));
  const meniscus = new Mesh(new LatheGeometry([
    new Vector2(0, 0), new Vector2(0.302, 0), new Vector2(0.302, 0.13),
    new Vector2(0.297, 0.142), new Vector2(0.28, 0.13), new Vector2(0, 0.13),
  ], small ? 40 : 64), new MeshPhysicalMaterial({color: 0xe6ecb6, roughness: 0.13, transmission: 0.65, thickness: 0.15, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 1.7, depthWrite: false}));
  meniscus.position.y = 0.045;
  reservoir.add(meniscus);
  const measureMat = new MeshBasicMaterial({color: 0x45623c, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide});
  for (let i = 1; i <= 7; i++) {
    const tick = new Mesh(new PlaneGeometry(i % 3 === 0 ? 0.13 : 0.075, 0.006), measureMat);
    tick.position.set(-0.1, 0.06 + i * 0.073, 0.325);
    tick.rotation.y = -0.28;
    reservoir.add(tick);
  }
  scene.add(reservoir);

  // Abstract extract droplets, not whole leaves or fruit going through a filter.
  const EXTRACT = small ? 45 : 70;
  const extractMat = new MeshPhysicalMaterial({color: 0xb5c990, roughness: 0.17, metalness: 0, transparent: true, opacity: 0.88, clearcoat: 1, envMapIntensity: 1.5, emissive: 0x63753f, emissiveIntensity: 0.13, depthWrite: false});
  const extracts = new InstancedMesh(new SphereGeometry(1, 12, 8), extractMat, EXTRACT);
  extracts.frustumCulled = false;
  const extractSeeds = Array.from({length: EXTRACT}, (_, i) => ({source: i % 5, p: rnd(), a: rnd() * Math.PI * 2, r: rnd(), s: 0.012 + rnd() * 0.015}));
  const extractPalette = [0xa7bf82, 0xd7cd9d, 0xe9eed2, 0xb6c99f, 0xdce8c0];
  extractSeeds.forEach((seed, i) => extracts.setColorAt(i, extractMat.color.clone().setHex(extractPalette[seed.source])));
  scene.add(extracts);
  const BLEND = small ? 24 : 38;
  const blendMat = new MeshPhysicalMaterial({color: 0xdde7b2, roughness: 0.16, transparent: true, opacity: 0.78, clearcoat: 1, envMapIntensity: 1.25, depthWrite: false});
  const blending = new InstancedMesh(new SphereGeometry(1, 10, 7), blendMat, BLEND);
  blending.frustumCulled = false;
  const blendSeeds = Array.from({length: BLEND}, (_, i) => ({a: i / BLEND * Math.PI * 2, r: 0.09 + rnd() * 0.15, y: rnd(), s: 0.007 + rnd() * 0.009}));
  scene.add(blending);

  const drop = new Mesh(new SphereGeometry(0.095, 32, 20), new MeshPhysicalMaterial({color: 0xe7f5ca, roughness: 0.025, transmission: 0.45, thickness: 0.2, ior: 1.4, transparent: true, opacity: 0.98, clearcoat: 1, envMapIntensity: 2.6}));
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
  const bubbleSeeds = Array.from({length: BUB}, () => ({a: rnd() * 6.283, r: 0.18 + rnd() * 0.97, y: -0.4 + rnd() * 1.25, s: 0.022 + rnd() * 0.065, p: rnd()}));
  scene.add(bubbles);
  // The mousse's central foam is softly opaque; the smaller floating bubbles retain their clear rims.
  const foamMat = new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.42, transparent: true, opacity: 0.96, clearcoat: 0.16, envMapIntensity: 0.65, depthWrite: false});
  const foamGeo = new SphereGeometry(1, 20, 14);
  const foamCloud = new InstancedMesh(foamGeo, foamMat, 36);
  scene.add(foamCloud);
  const foamSeeds = Array.from({length: 36}, () => ({a: rnd() * Math.PI * 2, r: 0.25 + rnd() * 0.4, y: rnd() * 0.13, s: 0.035 + rnd() * 0.075}));

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
      // Never replace missing packaging with an invented bottle or a foam-shaped product.
      products[step.id] = entry;
      continue;
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
  // Names appear immediately on a cold rail jump; each image joins as soon as it decodes. One slow
  // botanical must not leave the entire arrival blank. Each step starts its image requests only once.
  const specimens = {};
  const pending = {};
  function loadSpecimens(step) {
    if (!step.featured?.length) return Promise.resolve(null);
    if (pending[step.id]) return pending[step.id];
    const list = step.featured.slice(0, 5).map((item, i, items) => {
      const plate = new Mesh(new PlaneGeometry(1.08, 1.08), new MeshBasicMaterial({transparent: true, alphaTest: 0.04, depthWrite: false}));
      const extraction = addExtraction(plate.material);
      plate.visible = false;
      const label = new Mesh(new PlaneGeometry(0.72, 0.135), new MeshBasicMaterial({map: labelTexture(item.name), transparent: true, depthWrite: false}));
      label.position.y = -0.63;
      const g = new Group();
      g.add(plate, label);
      g.visible = false;
      scene.add(g);
      const echo = (i === 0 || i === items.length - 1)
        ? new Mesh(new PlaneGeometry(1.45, 1.45), new MeshBasicMaterial({transparent: true, alphaTest: 0.04, depthWrite: false})) : null;
      if (echo) { echo.visible = false; scene.add(echo); }
      return {g, plate, label, echo, extraction, item, i, n: items.length, focus: 0, spin: (rnd() - 0.5) * 0.6};
    });
    specimens[step.id] = list;
    pending[step.id] = Promise.all(list.map(async sp => {
      try {
        const map = await imageTexture(asset(sp.item.image), anisotropy);
        if (disposed) { map.dispose(); return; }
        sp.plate.material.map = map;
        sp.plate.material.needsUpdate = true;
        sp.plate.visible = true;
        if (sp.echo) { sp.echo.material.map = map; sp.echo.material.needsUpdate = true; }
        wake();
      } catch (err) {
        if (!disposed) console.warn('[mediral] botanical image unavailable', sp.item.name, err);
      }
    })).then(() => list);
    return pending[step.id];
  }

  /* ---- state ---- */
  const s = {u: -1, target: -1, progress: -1, time: 0, last: 0, running: false, frames: 0, reduced, tall: false,
    paused: false, contextLost: false, ingredient: null, phase: 'intro', phaseProgress: 0, stepId: null,
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
    camera.setViewOffset(view.w, view.h, view.w * f.shiftX, view.h * f.shiftY, view.w, view.h);
    camera.updateProjectionMatrix();
    renderer.setSize(view.w, view.h, false);
  }

  /* ---- the scene as a function of u ---- */
  const setHidden = arr => arr.forEach(m => { m.visible = false; });
  function place(u, time) {
    const f = framing(s.tall);
    const intro = u < 0;
    const stepIndex = Math.min(steps.length - 1, Math.floor(Math.max(0, Math.min(u, steps.length - 0.0001))));
    const t = intro ? 0 : u >= steps.length ? 1 : u - stepIndex;
    const step = steps[stepIndex];
    const setT = clamp01(u - steps.length);
    const tint = TINT[step.id] ?? 0xffffff;
    funnelGroup.position.y = s.tall ? 0.3 : 0.66;
    funnelGroup.scale.setScalar(s.tall ? 0.7 : 1.38);

    // Reset per-frame visibility.
    for (const e of Object.values(products)) e.group.visible = false;
    for (const list of Object.values(specimens)) list?.forEach(sp => { sp.g.visible = false; if (sp.echo) sp.echo.visible = false; });
    bubbles.visible = droplets.visible = powder.visible = drop.visible = foamCloud.visible = extracts.visible = blending.visible = false;
    funnelGroup.visible = false;
    funnelMat.opacity = 0; funnelRim.material.opacity = 0; core.material.opacity = 0; halo.material.opacity = 0;
    reservoir.visible = false;
    reservoirMat.opacity = meniscus.material.opacity = measureMat.opacity = 0;
    veil.material.opacity = 0; shadow.material.opacity = 0; shadow.scale.set(1, 1, 1); shadow.position.x = 0;
    sunBeams.forEach(b => { b.material.opacity = 0; });
    ripples.forEach(r => { r.material.opacity = 0; });

    const phase = LAB_PHASES.find(([, , end]) => t < end) || LAB_PHASES[LAB_PHASES.length - 1];
    s.stepId = intro || u >= steps.length ? null : step.id;
    s.phase = intro ? 'intro' : u >= steps.length ? 'set' : step.role === 'foam' || step.role === 'cleanse' ? 'cleanse' : phase[0];
    s.phaseProgress = intro ? clamp01(u + 1) : u >= steps.length ? setT : s.phase === 'cleanse' ? t : seg(t, phase[1], phase[2]);

    // Pull through the foliage, rise to the glass mouth, then settle on the large product.
    const gather = step.featured?.length ? ease(seg(t, 0.4, 0.54)) * (1 - ease(seg(t, 0.67, 0.78))) : 0;
    const dolly = ease(seg(t, 0.12, 0.44)) * (1 - ease(seg(t, 0.6, 0.76)));
    camPos.copy(f.base).add(new Vector3(Math.sin(stepIndex * 1.4 + t * 2) * (s.tall ? 0.045 : 0.16), gather * (s.tall ? 0.42 : 0.72), -dolly * (s.tall ? 0.15 : 0.42) - ease(seg(t, 0.7, 0.88)) * 0.22));
    camLook.copy(f.look).add(new Vector3(0, -gather * (s.tall ? 0.1 : 0.28), 0));
    if (intro) {
      camPos.copy(f.base).add(new Vector3(0, 0.08, -ease(clamp01(u + 1)) * 0.22));
      camLook.copy(f.look);
    }
    if (u >= steps.length) { camPos.set(0, f.base.y + 0.12, f.base.z + 0.75); camLook.copy(f.look); }
    // Billboards use this frame's camera orientation, including a single reduced-motion frame.
    camera.position.copy(camPos).add(new Vector3(s.pointerCur.x * (s.reduced ? 0 : 0.12), s.pointerCur.y * (s.reduced ? 0 : 0.06), 0));
    camera.lookAt(camLook);

    if (intro) {
      playIntro(clamp01(u + 1), time);
    } else if (u < steps.length) {
      const e = products[step.id];
      if (step.role === 'foam' || step.role === 'cleanse') playMousse(t, time, e);
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

  function showProduct(e, reveal, {x = 0, y = -0.55, z = 0, scale = 1, dim = 0, yaw = 0, roll = 0} = {}) {
    e.group.visible = true;
    e.group.position.set(x, y, z);
    e.group.scale.setScalar(scale);
    e.group.rotation.z = roll;
    if (e.uniforms) { e.uniforms.uReveal.value = reveal >= 1 ? 1.02 : reveal; e.uniforms.uDim.value = dim; }
    if (e.mesh) {
      if (e.billboard) e.mesh.quaternion.copy(camera.quaternion);
      else e.mesh.rotation.y = MathUtils.clamp(yaw, -MAX_YAW, MAX_YAW);
    }
  }

  function presentation(e) {
    const height = e.step.id === 'PO' ? (s.tall ? 0.8 : 1.72)
      : e.step.id === 'CL' ? (s.tall ? 1.05 : 2.28)
      : e.step.id === 'AC' ? (s.tall ? 1 : 2.05) : (s.tall ? 1.07 : 2.2);
    return {height, scale: height / e.height, base: -height / 2};
  }

  function toRail(t, base) {
    const k = ease(seg(t, 0.91, 1));
    return {x: k * (s.tall ? 0.6 : 1.8), y: lerp(base, s.tall ? 0.58 : -0.55, k), scale: 1 - k * 0.86, alpha: 1 - seg(t, 0.95, 1)};
  }

  function playMousse(t, time, e) {
    const p = presentation(e), rail = toRail(t, p.base);
    // The supplied bottle is the first frame. Water and foam surround it rather than replace it.
    showProduct(e, 1, {x: rail.x, y: rail.y, scale: p.scale * rail.scale,
      yaw: s.reduced ? 0 : Math.sin(time * 0.24) * 0.055,
      roll: (s.reduced ? -0.035 : -0.035 + Math.sin(time * 0.22) * 0.012) * rail.alpha});
    ripples.forEach((r, i) => {
      const k = ((time * 0.18 + i / 3) % 1);
      r.position.set(0, p.base - 0.035, 0);
      r.scale.setScalar((s.tall ? 0.45 : 0.8) + k * (s.tall ? 1.15 : 2.4));
      r.material.opacity = (1 - k) * 0.78 * rail.alpha;
    });
    bubbles.visible = true;
    bubbleMat.opacity = 0.9;
    foamMat.opacity = 0.96;
    const extent = s.tall ? 0.55 : 1.15;
    bubbleSeeds.forEach((b, i) => {
      const a = b.a + time * 0.075 + t * 1.3;
      const r = b.r * extent;
      tmp.position.set(Math.cos(a) * r, (b.y - 0.15) * p.height + Math.sin(time * 0.7 + i) * 0.035, Math.sin(a) * r * 0.8 - 0.12);
      tmp.scale.setScalar(Math.max(0.0001, b.s * (s.tall ? 0.6 : 1.05) * rail.alpha));
      tmp.updateMatrix();
      bubbles.setMatrixAt(i, tmp.matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
    foamCloud.visible = true;
    foamSeeds.forEach((b, i) => {
      const a = b.a + Math.sin(time * 0.18 + i) * 0.08;
      tmp.position.set(Math.cos(a) * b.r * extent, p.base + b.y * extent, Math.sin(a) * b.r * extent);
      tmp.scale.setScalar(b.s * extent * rail.alpha);
      tmp.updateMatrix(); foamCloud.setMatrixAt(i, tmp.matrix);
    });
    foamCloud.instanceMatrix.needsUpdate = true;
    shadow.position.y = p.base - 0.04;
    shadow.scale.setScalar(s.tall ? 0.95 : 1.8);
    shadow.material.opacity = 0.8 * rail.alpha;
  }

  // A still-life composition with large subjects at different depths, not a specimen row.
  const botanicalLayout = [
    [-0.98, 0.34, 0.38, 1.18, -0.22], [0.38, 0.7, -0.38, 1.28, 0.12],
    [1.12, -0.18, 0.52, 1.26, -0.18], [-0.53, -0.73, 0.48, 1.16, 0.2],
    [0.08, -0.12, -0.65, 1.2, 0.04],
  ];

  function playStep(step, t, time, e, tint) {
    const p = presentation(e), list = specimens[step.id];
    const hasFocus = Number.isInteger(s.ingredient) && list?.some(sp => sp.i === s.ingredient);
    if (list) {
      list.forEach(sp => {
        const appear = easeOut(seg(t, -0.18 + sp.i * 0.02, 0.015 + sp.i * 0.018));
        const extracted = ease(seg(t, 0.38 + sp.i * 0.006, 0.53 + sp.i * 0.005));
        if (appear <= 0 || extracted >= 1) return;
        const focusTarget = hasFocus && sp.i === s.ingredient ? 1 : 0;
        sp.focus = s.reduced ? focusTarget : lerp(sp.focus, focusTarget, 0.14);
        const emphasis = hasFocus ? 0.94 + sp.focus * (s.tall ? 0.22 : 0.3) : 1;
        const [lx, ly, lz, size, angle] = botanicalLayout[sp.i];
        const drift = s.reduced ? 0 : Math.sin(time * 0.35 + sp.i * 1.7) * 0.035;
        const hx = lx * (s.tall ? 0.45 : 1) * (1 - sp.focus * 0.2);
        const hy = ly * (s.tall ? 0.3 : 1) * (1 - sp.focus * 0.12) + drift;
        // Keep the material in place while its texture dissolves. Never filter a whole fruit.
        sp.g.visible = true;
        sp.g.position.set(hx, hy + extracted * (s.tall ? 0.02 : 0.05), lz * (s.tall ? 0.45 : 1) + sp.focus * (s.tall ? 0.075 : 0.22));
        sp.g.quaternion.copy(camera.quaternion);
        sp.g.scale.setScalar(size * appear * emphasis * (1 - extracted * 0.06) * (s.tall ? 0.43 : 1));
        sp.extraction.value = extracted;
        sp.plate.rotation.z = angle + drift;
        sp.plate.material.opacity = appear * (hasFocus ? 0.7 + sp.focus * 0.3 : 1);
        sp.label.material.opacity = (hasFocus ? sp.focus : sp.i === 0 ? 0.95 : 0) * (1 - ease(seg(t, 0.35, 0.41)));
        if (sp.echo && sp.plate.visible && !s.tall) {
          const side = sp.i === 0 ? -1 : 1;
          sp.echo.visible = t < 0.41;
          sp.echo.position.set(side < 0 ? -0.85 : 1.55, side < 0 ? -1.16 : -0.93, 0.8);
          sp.echo.quaternion.copy(camera.quaternion);
          sp.echo.rotateZ(side * 0.48 + time * 0.018);
          sp.echo.scale.setScalar(side < 0 ? 0.85 : 1.23);
          sp.echo.material.opacity = (hasFocus ? 0.48 + sp.focus * 0.3 : 0.78) * (1 - ease(seg(t, 0.29, 0.41)));
        }
      });
    }
    if (!s.reduced) playLab(step, t, time, p);
    core.position.set(0, p.base + 0.15, 0.05);
    core.quaternion.copy(camera.quaternion);
    core.scale.setScalar(s.tall ? 0.65 : 1.25);
    core.material.opacity = 0.55 * seg(t, 0.72, 0.77) * (1 - seg(t, 0.82, 0.9));
    const reveal = s.reduced ? 1 : easeOut(seg(t, 0.74, 0.85)), rail = toRail(t, p.base);
    shadow.position.y = p.base - 0.03;
    shadow.scale.setScalar(s.tall ? 0.95 : 1.7);
    shadow.material.opacity = 0.72 * reveal * rail.alpha;
    const yaw = s.reduced ? 0 : Math.sin(time * 0.24) * 0.075 + s.pointerCur.x * 0.065;
    showProduct(e, reveal, {x: rail.x, y: rail.y, scale: p.scale * rail.scale, yaw,
      roll: (s.reduced ? 0 : Math.sin(time * 0.22 + step.order) * 0.016) * rail.alpha});
    const role = s.reduced ? 1 : ease(seg(t, 0.84, 0.9)) * (1 - seg(t, 0.93, 0.98));
    if (step.role === 'droplets') playDroplets(role, time, tint, p);
    if (step.role === 'light') playLight(role, time, p);
    if (step.role === 'powder') playPowder(t, role, time, p);
  }

  function playLab(step, t, time, product) {
    if (t <= 0.38 || t >= 0.8) return;
    const labTint = {AC: 0xb9cca0, BR: 0xd6d992, SU: 0xe0cea2, PO: 0xe0c3b2}[step.id] || 0xc5d7ae;
    const unit = s.tall ? 0.48 : 1;
    const vesselScale = s.tall ? 0.82 : 1.48;
    const vesselBase = s.tall ? -0.4 : -0.75;
    const fill = ease(seg(t, 0.46, 0.61));
    const vesselIn = ease(seg(t, 0.39, 0.48)) * (1 - ease(seg(t, 0.67, 0.78)));
    const moveAside = ease(seg(t, 0.65, 0.75));
    reservoir.visible = vesselIn > 0;
    reservoir.position.set(-moveAside * (s.tall ? 0.45 : 0.9), vesselBase, 0);
    reservoir.scale.setScalar(vesselScale);
    reservoir.rotation.set(0, -0.18 + Math.sin(time * 0.2) * 0.035, -moveAside * 0.06);
    reservoirMat.opacity = 0.8 * vesselIn;
    measureMat.opacity = 0.48 * vesselIn;
    meniscus.scale.y = 0.55 + fill * 2.55;
    meniscus.material.color.setHex(labTint);
    meniscus.material.opacity = 0.72 * vesselIn * ease(seg(t, 0.44, 0.52));
    const liquidY = vesselBase + (0.045 + 0.13 * meniscus.scale.y) * vesselScale;
    const mouthY = vesselBase + 0.72 * vesselScale;

    // Multiple small streams separate from the material and collect as an abstract extract.
    const count = Math.min(5, step.featured?.length || 0);
    if (count && t < 0.67) {
      extracts.visible = true;
      extractMat.color.setHex(labTint);
      extractMat.opacity = 0.86 * ease(seg(t, 0.38, 0.42)) * (1 - ease(seg(t, 0.61, 0.67)));
      extractSeeds.forEach((seed, i) => {
        const source = seed.source % count;
        const [lx, ly, lz] = botanicalLayout[source];
        const start = 0.382 + source * 0.004 + seed.p * 0.073;
        const end = start + 0.13 + seed.r * 0.055;
        const travel = seg(t, start, end);
        const u = ease(travel), arc = Math.sin(seed.a) * 0.13 * unit;
        const sx = lx * (s.tall ? 0.45 : 1) + Math.cos(seed.a) * seed.r * 0.22 * unit;
        const sy = ly * (s.tall ? 0.3 : 1) + Math.sin(seed.a) * seed.r * 0.2 * unit;
        const sz = lz * (s.tall ? 0.45 : 1);
        const ex = reservoir.position.x + Math.cos(seed.a) * 0.15 * vesselScale, ez = Math.sin(seed.a) * 0.15 * vesselScale;
        tmp.position.set(
          cubic(sx, sx * 0.6 + arc, ex + arc, ex, u),
          cubic(sy, sy + 0.22 * unit, mouthY + 0.1 * unit, liquidY + 0.02, u),
          cubic(sz, sz * 0.7 + arc, ez - arc, ez, u),
        );
        const pulse = travel > 0 && travel < 1 ? Math.sin(travel * Math.PI) ** 0.35 : 0;
        const size = seed.s * (s.tall ? 0.68 : 1) * pulse;
        tmp.scale.set(Math.max(0.00001, size), Math.max(0.00001, size * (1 + travel * 0.8)), Math.max(0.00001, size));
        tmp.updateMatrix(); extracts.setMatrixAt(i, tmp.matrix);
      });
      extracts.instanceMatrix.needsUpdate = true;
    }

    // Quiet depth layers inside the liquid: a brief stirring current, then a settled meniscus.
    const mixing = ease(seg(t, 0.5, 0.58)) * (1 - ease(seg(t, 0.635, 0.69)));
    if (mixing > 0) {
      blending.visible = true;
      blendMat.color.setHex(labTint);
      blendMat.opacity = 0.72 * mixing * vesselIn;
      const liquidDepth = 0.13 * meniscus.scale.y * vesselScale;
      blendSeeds.forEach((seed, i) => {
        const angle = seed.a + seg(t, 0.5, 0.67) * Math.PI * 5.2 + time * 0.2 * mixing;
        const radius = seed.r * vesselScale * (0.78 + mixing * 0.22);
        tmp.position.set(reservoir.position.x + Math.cos(angle) * radius,
          vesselBase + 0.08 * vesselScale + liquidDepth * (0.12 + seed.y * 0.67), Math.sin(angle) * radius);
        tmp.scale.setScalar(seed.s * vesselScale * (0.5 + mixing * 0.5));
        tmp.updateMatrix(); blending.setMatrixAt(i, tmp.matrix);
      });
      blending.instanceMatrix.needsUpdate = true;
      meniscus.rotation.z = Math.sin(time * 0.65) * 0.018 * mixing;
    } else meniscus.rotation.z = 0;
    ripples.slice(0, 2).forEach((r, i) => {
      r.position.set(reservoir.position.x, liquidY + 0.008 + i * 0.003, 0);
      r.scale.setScalar(vesselScale * (0.31 + i * 0.13 + Math.sin(time * 0.5 + i) * mixing * 0.025));
      r.material.opacity = 0.2 * mixing * vesselIn;
    });

    // The receiving vessel moves aside as one concentrate drop takes over the composition.
    const coalesce = ease(seg(t, 0.625, 0.67)), fall = seg(t, 0.67, 0.74);
    if (coalesce > 0 && fall < 1) {
      drop.visible = true;
      drop.material.color.setHex(labTint);
      drop.position.set(0, lerp(liquidY + 0.13 * unit, product.base + 0.03, ease(fall)), 0.1);
      const size = (s.tall ? 0.68 : 1.1) * coalesce;
      drop.scale.set(size * (1 - fall * 0.12), size * (1.12 + Math.sin(fall * Math.PI) * 0.62), size);
    }
  }

  function playDroplets(role, time, tint, p) {
    if (role <= 0) return;
    droplets.visible = true;
    dropletMat.color.setHex(tint);
    const extent = s.tall ? 0.5 : 1.0;
    dropletSeeds.forEach((d, i) => {
      const a = d.a + time * 0.15 * (0.6 + d.p);
      tmp.position.set(Math.cos(a) * d.r * extent, (d.y - 0.25) * p.height * 0.7 + Math.sin(time * 0.7 + i) * 0.035, Math.sin(a) * d.r * extent * 0.75);
      tmp.scale.setScalar(Math.max(0.0001, d.s * role * (s.tall ? 0.7 : 1.2)));
      tmp.updateMatrix(); droplets.setMatrixAt(i, tmp.matrix);
    });
    droplets.instanceMatrix.needsUpdate = true;
  }

  function playLight(role, time, p) {
    sunBeams.forEach((b, i) => {
      b.position.set((i - 1.5) * (s.tall ? 0.26 : 0.48), 0.7, -1.2);
      b.material.opacity = role * (0.2 + Math.sin(time * 0.4 + i) * 0.04);
    });
    halo.position.set(0, p.base + p.height * 0.55, -0.2);
    halo.quaternion.copy(camera.quaternion);
    halo.scale.setScalar(p.height * (0.75 + role * 0.1));
    halo.material.opacity = role * 0.54;
  }

  function playPowder(t, role, time, product) {
    const fall = seg(t, 0.8, 0.94);
    if (fall <= 0 || role <= 0) return;
    powder.visible = true;
    const extent = s.tall ? 0.5 : 1.0;
    powderSeeds.forEach((p, i) => {
      const k = clamp01(fall * 1.3 - p.p * 0.3), a = p.a + time * 0.08;
      tmp.position.set(Math.cos(a) * p.r * extent * (1.1 - k * 0.3), lerp(p.y * extent * 0.6, product.base - 0.02, easeOut(k)), Math.sin(a) * p.r * extent * 0.6);
      tmp.scale.setScalar(Math.max(0.0001, p.s * role * (s.tall ? 0.8 : 1.3)));
      tmp.updateMatrix(); powder.setMatrixAt(i, tmp.matrix);
    });
    powder.instanceMatrix.needsUpdate = true;
    veil.position.y = product.base - 0.02;
    veil.scale.setScalar(extent);
    veil.material.opacity = 0.75 * ease(seg(t, 0.86, 0.95)) * role;
  }

  function playIntro(t, time) {
    // The opening explains a whole routine. Its five products always remain present and undimmed,
    // independently of any partial shopping list the reader may have made farther down the page.
    const arrangement = [
      {x: -1.02, y: -0.94, z: -0.2, h: 1.92, roll: -0.035},
      {x: -0.5, y: -1.05, z: 0.35, h: 1.25, roll: 0.025},
      {x: 0.05, y: -0.98, z: 0.02, h: 1.76, roll: -0.015},
      {x: 0.72, y: -0.95, z: -0.12, h: 1.88, roll: 0.045},
      {x: 1.07, y: -1.04, z: 0.45, h: 0.74, roll: -0.05},
    ];
    const unit = s.tall ? 0.5 : 1;
    const spread = s.reduced ? 1 : 0.96 + ease(t) * 0.075;
    steps.forEach((step, i) => {
      const e = products[step.id], a = arrangement[i];
      const float = s.reduced ? 0 : Math.sin(time * 0.35 + i * 1.4) * 0.017;
      showProduct(e, 1, {
        x: a.x * unit * spread, y: (a.y + float) * unit, z: a.z * unit,
        scale: a.h * unit / e.height, dim: 0,
        yaw: s.reduced ? 0 : Math.sin(time * 0.18 + i) * 0.045,
        roll: a.roll * (s.reduced ? 0.5 : 1),
      });
    });
    shadow.position.set(0.08 * unit, -1.095 * unit, 0);
    shadow.scale.set(2.4 * unit, 1.25 * unit, 1);
    shadow.material.opacity = 0.58;
  }

  function playSet(t, time) {
    // All five, in routine order, form one composition. Unticked pieces dim; the choice is the buyer's.
    const n = steps.length;
    const k = easeOut(t * 1.6 > 1 ? 1 : t * 1.6);
    // Landscape: the set card owns the left, so the five stand in the free band the DOM reports
    // (card's right edge → rail's left edge), converted to world units at the stage plane.
    let gap = 0.32, offsetX = 0, size = 0.7;
    if (!s.tall) {
      const dist = camPos.distanceTo(camLook);
      const halfW = dist * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const band = s.band ?? {left: 0.45, right: 0.94};
      // Account for the atelier camera's horizontal view offset when fitting to the DOM's free band.
      offsetX = ((band.left + band.right) / 2 * 2 - 1 + 2 * framing(false).shiftX) * halfW;
      const width = (band.right - band.left) * 2 * halfW;
      gap = Math.min(0.78, width / 5.4);
      size = Math.min(1, gap * 1.25);
    }
    steps.forEach((step, i) => {
      const e = products[step.id];
      const x = offsetX + (i - (n - 1) / 2) * gap;
      const scale = size * (0.9 + 0.1 * k);
      const dim = s.selection.has(step.id) ? 0 : 1;
      showProduct(e, 1, {x, y: -0.55 + Math.sin(time * 0.6 + i) * 0.015, z: -Math.abs(i - (n - 1) / 2) * 0.2, scale, dim, yaw: s.reduced ? 0 : Math.sin(time * 0.25 + i) * 0.08});
    });
    shadow.position.x = offsetX;
    shadow.scale.set(Math.max(1.2, gap * 4.2), 1, 1);
    shadow.material.opacity = 0.25 + 0.2 * k;
    foamMat.opacity = s.selection.has(steps[0].id) ? 0.96 : 0.3;
  }

  /* ---- loop ---- */
  // Exactly one queued frame at a time: the id is kept so hiding the tab cancels it, and wake() never
  // queues a second loop on top of one that is still pending.
  let raf = 0;
  function frame(now) {
    raf = 0;
    if (!s.running || disposed || s.paused || s.contextLost) return;
    const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
    s.last = now;
    if (!s.reduced) s.time += dt;
    const k = s.reduced ? 1 : 1 - Math.exp(-dt / 0.12);
    s.u += (s.target - s.u) * k;
    if (Math.abs(s.target - s.u) < 0.0005) s.u = s.target;
    s.pointerCur.lerp(s.pointer, s.reduced ? 0 : 1 - Math.exp(-dt / 0.4));
    place(s.u, s.time);
    const shake = s.reduced ? 0 : 1;
    camera.position.copy(camPos).add(new Vector3(s.pointerCur.x * 0.12 * shake, s.pointerCur.y * 0.06 * shake, 0));
    camera.lookAt(camLook);
    renderer.render(scene, camera);
    s.frames++;
    if (s.reduced && s.u === s.target) { s.running = false; s.last = 0; return; }
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || document.hidden || disposed || s.paused || s.contextLost) return;
    s.running = true;
    raf = requestAnimationFrame(frame);
  }
  function sleep() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    s.running = false;
    s.last = 0;
  }

  const onResize = () => { if (!s.contextLost) resize(); wake(); };
  const onVisibility = () => { if (document.hidden) sleep(); else wake(); };
  const onPointer = e => {
    if (!s.reduced) s.pointer.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  };
  const onLost = event => {
    event?.preventDefault();
    s.contextLost = true;
    sleep();
    onContextChange('lost');
  };
  const onRestored = () => {
    if (disposed) return;
    try {
      // The renderer restores image textures, but this environment was rendered on the GPU;
      // its pixels must be generated again before the page reveals the restored scene.
      refreshEnvironment();
      resize();
      s.contextLost = false;
      onContextChange('restored');
      wake();
    } catch (err) {
      s.contextLost = true;
      sleep();
      console.warn('[mediral] environment restore failed, keeping stills', err);
      onContextChange('lost');
    }
  };
  addEventListener('resize', onResize);
  stacked.addEventListener?.('change', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('pointermove', onPointer, {passive: true});
  el.addEventListener('webglcontextlost', onLost);
  el.addEventListener('webglcontextrestored', onRestored);

  // Preload specimens for the step in view and the next one. Reduced motion shows each step already
  // composed (plates have left), so it never downloads them; the page's stills carry the botanicals.
  const warm = u => {
    if (s.reduced || disposed) return;
    const i = Math.min(steps.length - 1, Math.floor(Math.max(0, u)));
    for (const j of [i, i + 1]) if (steps[j]) loadSpecimens(steps[j]).then(wake, err => console.warn('[mediral] specimens', err));
  };

  resize();
  warm(-1);
  if (renderer.getContext().isContextLost()) onLost();
  wake();

  function setProgress(u) {
    s.progress = Math.max(-1, Math.min(steps.length + 1, u));
    // Keep the raw progress so changing the motion preference does not lose the reader's place.
    s.target = s.reduced && s.progress < 0 ? -0.5
      : s.reduced && s.progress < steps.length ? Math.floor(s.progress) + 0.8 : s.progress;
    warm(s.target);
    wake();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    sleep();
    removeEventListener('resize', onResize);
    stacked.removeEventListener?.('change', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    removeEventListener('pointermove', onPointer);
    el.removeEventListener('webglcontextlost', onLost);
    el.removeEventListener('webglcontextrestored', onRestored);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      const list = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      list.forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      });
    });
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
    environmentTarget.dispose();
    renderer.dispose();
  }

  return {
    // Reduced motion: each step is shown composed (product formed, role visible) instead of scrubbed.
    setProgress,
    setIngredient(index) {
      s.ingredient = Number.isInteger(index) && index >= 0 ? index : null;
      wake();
    },
    setReducedMotion(value) {
      s.reduced = Boolean(value);
      if (s.reduced) { s.pointer.set(0, 0); s.pointerCur.set(0, 0); }
      setProgress(s.progress);
    },
    setSelection(ids) { s.selection = new Set(ids); wake(); },
    setBand(band) { s.band = band; wake(); },
    pause() { s.paused = true; sleep(); },
    resume() { s.paused = false; wake(); },
    dispose,
    state: s,
  };
}
