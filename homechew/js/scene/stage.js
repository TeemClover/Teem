/**
 * The one WebGL scene on the page (hero trio + S1 open/pour).
 * - Renders on demand: only when the scroll pose, pointer, size or quality changes.
 * - Stops when the stage is off-screen or the tab is hidden.
 * - All narrative state comes from timeline.pose(u); nothing accumulates between frames.
 */
import {
  BackSide, BoxGeometry, CanvasTexture, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  RepeatWrapping, SRGBColorSpace, Scene, SphereGeometry, Vector3, WebGLRenderer, MathUtils,
} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {pose as poseAt, LAYOUT, BOTTLE} from './timeline.js';
import {createBottle, createGlassMaterial, interiorSamples} from './bottle.js';
import {createPour} from './pour.js';
import {loadArt, shadowBlob, stoneTexture, backdropTexture} from './textures.js';

const TIERS = {
  high: {dpr: 2, shadow: 2048, transmission: true},
  medium: {dpr: 1.5, shadow: 1024, transmission: true},
  low: {dpr: 1.25, shadow: 0, transmission: false},
};

export function pickTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (cores <= 4 || mem <= 2) return 'low';
  return coarse ? 'medium' : 'high';
}

export async function createStage({canvas, base, products, onFail}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false});
  } catch (error) {
    onFail?.(error);
    return null;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  let tierName = pickTier();
  let tier = TIERS[tierName];
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new PerspectiveCamera(27, 1, 0.1, 120);

  // Lights: warm key from upper left (the leaf-shadow window), soft fill, cool-ish rim for glass edges.
  const hemi = new HemisphereLight(0xfff4e4, 0x6b5440, 0.55);
  scene.add(hemi);
  const key = new DirectionalLight(0xffe0bd, 2.3);
  key.position.set(-6.5, 11, 7.5);
  key.target.position.set(0.8, 1.2, 0.3);
  scene.add(key, key.target);
  const rim = new DirectionalLight(0xfff6ea, 1.4);
  rim.position.set(6, 6, -8);
  scene.add(rim);

  // The canvas is transparent over the CSS backdrop, but glass refraction samples an offscreen
  // copy of the scene. This sphere paints the backdrop colours into that copy only, so clear
  // glass shows cream wall instead of three.js's default half-white fill.
  const backdropMat = new MeshBasicMaterial({map: new CanvasTexture(backdropTexture()), side: BackSide, depthWrite: false, toneMapped: false});
  backdropMat.map.colorSpace = SRGBColorSpace;
  const backdrop = new Mesh(new SphereGeometry(70, 32, 16), backdropMat);
  backdrop.renderOrder = -10;
  backdrop.onBeforeRender = r => { backdropMat.colorWrite = r.getRenderTarget() !== null; };
  scene.add(backdrop);

  // Stone slab + table
  const stoneMap = new CanvasTexture(stoneTexture());
  stoneMap.colorSpace = SRGBColorSpace;
  stoneMap.wrapS = stoneMap.wrapT = RepeatWrapping;
  stoneMap.repeat.set(2.6, 1);
  stoneMap.anisotropy = anisotropy;
  const slab = new Mesh(new BoxGeometry(17, 0.9, 6.4), new MeshStandardMaterial({map: stoneMap, roughness: 0.93, color: 0xf6efe4}));
  slab.position.set(-0.6, -0.45, 0.5);
  slab.receiveShadow = true;
  scene.add(slab);

  const blobTex = new CanvasTexture(shadowBlob());
  const blob = (size, opacity) => {
    const m = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({color: 0x2a1c12, alphaMap: blobTex, transparent: true, opacity, depthWrite: false}));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.006;
    m.renderOrder = 1;
    return m;
  };

  const art = await loadArt(base);
  const glass = createGlassMaterial(tier.transmission ? 'high' : 'low');
  const trio = new Group();
  scene.add(trio);
  const bottles = {};
  for (const product of products) {
    const b = createBottle(product, art, {glass, anisotropy, withSeal: true, withBack: true});
    const home = LAYOUT.bottles[product.id];
    b.root.position.set(...home);
    b.contact = blob(3.1, 0.62);
    b.contact.position.set(home[0], 0.006, home[2]);
    trio.add(b.root, b.contact);
    bottles[product.id] = b;
  }
  const hero = bottles['HC-HY'];
  // The cap leaves the bottle, so it lives in the trio group and is placed from the pose.
  trio.add(hero.cap);
  const capBlob = blob(1.4, 0.5);
  trio.add(capBlob);

  const pour = createPour(products.find(p => p.id === 'HC-HY'), anisotropy, hero.sauceMap);
  scene.add(pour.group, pour.stream.mesh);
  const bowlBlob = blob(3.6, 0.5);
  pour.group.add(bowlBlob);

  /* ---------- sizing & quality ---------- */
  let width = 1, height = 1, layout = 'wide';
  function applyTier() {
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    const shadows = tier.shadow > 0;
    renderer.shadowMap.enabled = shadows;
    key.castShadow = shadows;
    if (shadows) {
      key.shadow.mapSize.set(tier.shadow, tier.shadow);
      Object.assign(key.shadow.camera, {left: -7, right: 7, top: 8, bottom: -3, near: 1, far: 30});
      key.shadow.camera.updateProjectionMatrix();
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 5;
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }
    // transmission is a per-material choice; swap glass when tier drops below it
    if (!tier.transmission && glass.transmission > 0) {
      const cheap = createGlassMaterial('low');
      for (const b of Object.values(bottles)) b.glassMesh.material = cheap;
    }
    invalidate();
  }

  function resize(w, h) {
    width = Math.max(1, Math.round(w));
    height = Math.max(1, Math.round(h));
    layout = width / height < 0.9 ? 'tall' : 'wide';
    camera.aspect = width / height;
    applyTier();
  }

  /* ---------- sauce volume: conserved while the bottle tips ---------- */
  const cavity = interiorSamples(3000);
  const cavityY = new Float32Array(cavity.length / 3);
  const fractionBelow = level => { let c = 0; for (let i = 1; i < cavity.length; i += 3) if (cavity[i] <= level) c++; return c / (cavity.length / 3); };
  const FULL = fractionBelow(BOTTLE.fillUpright); // sealed bottle
  const AFTER = fractionBelow(BOTTLE.fillAfter); // after one bowl
  /** World-space level for the active bottle: the height under which `fraction` of the cavity sits. */
  function fillFor(pivot, angle, fraction) {
    const c = Math.cos(angle), sn = Math.sin(angle);
    for (let i = 0, j = 0; i < cavity.length; i += 3, j++) {
      const x = cavity[i], y = cavity[i + 1] - BOTTLE.pivotY;
      cavityY[j] = pivot[1] + x * sn + y * c;
    }
    cavityY.sort();
    return cavityY[Math.min(cavityY.length - 1, Math.floor(fraction * cavityY.length))];
  }

  /* ---------- per-frame application of the pose ---------- */
  const pointer = {x: 0, y: 0, tx: 0, ty: 0};
  const inspect = {on: false, angle: 0, target: 0};
  let u = -1;
  let reduced = false;
  const tmp = new Vector3();

  function applyPose() {
    const p = poseAt(u, layout);
    // camera with off-axis shift
    camera.fov = p.camera.fov;
    camera.position.set(...p.camera.pos);
    camera.lookAt(tmp.set(...p.camera.target));
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] += -p.camera.shift[0];
    camera.projectionMatrix.elements[9] += -p.camera.shift[1];
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    // ambient pointer tilt on the whole trio (hero only), plus explicit inspect rotation
    const w = reduced ? 0 : p.pointerWeight;
    trio.rotation.y = pointer.x * 0.1 * w;
    trio.rotation.x = pointer.y * 0.025 * w;

    for (const [id, o] of Object.entries(p.others)) {
      const b = bottles[id];
      b.root.position.set(...o.pos);
      b.root.visible = o.visible;
      b.contact.position.set(o.pos[0], 0.006, o.pos[2]);
      b.contact.visible = o.visible;
    }

    const a = p.active;
    hero.root.position.set(a.pivot[0], a.pivot[1] - BOTTLE.pivotY, a.pivot[2]);
    hero.pivot.rotation.z = a.angle;
    hero.pivot.rotation.y = inspect.angle * p.pointerWeight;
    const lift = a.pivot[1] - BOTTLE.pivotY;
    hero.contact.position.set(a.pivot[0], 0.006, a.pivot[2]);
    const spread = 1 + lift * 0.5 + a.tilt * 0.6;
    hero.contact.scale.set(spread, spread, 1);
    hero.contact.material.opacity = 0.62 / (spread * spread);

    // seal & cap
    hero.seal?.update(p.seal.peel, p.seal.drop);
    const onBottle = hero.root.position.clone().add(new Vector3(0, BOTTLE.capBottom, 0));
    const rest = new Vector3(...LAYOUT.capRest);
    const c = p.cap;
    const arc = Math.sin(c.aside * Math.PI) * 0.8;
    hero.cap.position.copy(onBottle).lerp(rest, c.aside);
    hero.cap.position.y += c.rise * (1 - c.aside) + arc;
    hero.cap.rotation.set(0, c.twist + c.aside * 0.6, c.aside > 0 && c.aside < 1 ? Math.sin(c.aside * Math.PI) * 0.35 : 0);
    // while the cap still sits on an upright bottle it follows the inspect rotation too
    capBlob.position.set(hero.cap.position.x, 0.007, hero.cap.position.z);
    capBlob.visible = c.aside > 0.4;
    capBlob.material.opacity = 0.5 * Math.max(0, (c.aside - 0.4) / 0.6);

    // sauce level stays horizontal in world space
    // sauce level: same volume in any orientation; it only drops by what reached the bowl
    const remaining = FULL + (AFTER - FULL) * p.pool.level;
    hero.clip.constant = fillFor(a.pivot, a.angle, remaining);
    for (const b of Object.values(bottles)) if (b !== hero) b.clip.constant = BOTTLE.fillUpright + b.root.position.y;

    pour.update(p);
    return p;
  }

  /* ---------- render loop (on demand) ---------- */
  let raf = 0, visible = true, running = true, lost = false;
  const frameTimes = [];
  let lastFrame = 0;

  function frame(now) {
    raf = 0;
    if (!running || !visible || lost) return;
    // ambient pointer easing (does not advance the story)
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    inspect.angle += (inspect.target - inspect.angle) * 0.18;
    const settling = Math.abs(pointer.tx - pointer.x) > 1e-3 || Math.abs(pointer.ty - pointer.y) > 1e-3 || Math.abs(inspect.target - inspect.angle) > 1e-3;
    applyPose();
    renderer.render(scene, camera);
    if (lastFrame) {
      frameTimes.push(now - lastFrame);
      if (frameTimes.length > 90) frameTimes.shift();
      adapt();
    }
    lastFrame = now;
    if (settling) invalidate(); else lastFrame = 0;
    api.frames++;
  }

  // Adaptive quality: sustained slow frames step the tier down once per 90-frame window.
  let adaptCooldown = 0;
  function adapt() {
    if (frameTimes.length < 45 || ++adaptCooldown < 45) return;
    const sorted = frameTimes.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    api.medianFrameMs = median;
    if (median > 26 && tierName !== 'low') {
      tierName = tierName === 'high' ? 'medium' : 'low';
      tier = TIERS[tierName];
      api.tier = tierName;
      frameTimes.length = 0;
      adaptCooldown = 0;
      applyTier();
    }
  }

  function invalidate() {
    if (!raf && running && visible && !lost) raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    onFail?.(new Error('webgl context lost'));
  });

  const api = {
    tier: tierName,
    frames: 0,
    medianFrameMs: null,
    get layout() { return layout; },
    resize,
    setProgress(next) {
      if (next !== u) { u = next; invalidate(); }
    },
    setPointer(x, y) {
      pointer.tx = MathUtils.clamp(x, -1, 1);
      pointer.ty = MathUtils.clamp(y, -1, 1);
      invalidate();
    },
    setInspect(on) {
      inspect.on = on;
      if (!on) inspect.target = 0;
      invalidate();
    },
    rotateBy(rad) {
      if (!inspect.on) return;
      inspect.target += rad;
      invalidate();
    },
    setReduced(value) { reduced = value; invalidate(); },
    setVisible(value) { visible = value; if (value) invalidate(); },
    setRunning(value) { running = value; if (value) invalidate(); },
    /** Render a specific story position to an image URL (static/reduced-motion end states). */
    snapshot(atU, w = 900, h = 700) {
      const prev = {u, width, height, layout};
      u = atU;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      layout = w / h < 0.9 ? 'tall' : 'wide';
      applyPose();
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/webp', 0.86);
      u = prev.u; layout = prev.layout;
      resize(prev.width, prev.height);
      return url;
    },
    debug() {
      const sm = hero.seal?.mesh;
      return {seal: sm && {visible: sm.visible, opacity: sm.material.opacity, sphere: sm.geometry.boundingSphere && [...sm.geometry.boundingSphere.center.toArray(), sm.geometry.boundingSphere.radius].map(v => +v.toFixed(2)), nan: [...sm.geometry.attributes.position.array].some(Number.isNaN), world: sm.getWorldPosition(new Vector3()).toArray().map(v => +v.toFixed(2))}, tier: tierName, dpr: renderer.getPixelRatio(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, frames: api.frames, medianFrameMs: api.medianFrameMs};
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      scene.traverse(o => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) { for (const v of Object.values(m)) v?.isTexture && v.dispose(); m.dispose(); }
      });
      envTex.dispose();
      renderer.dispose();
    },
  };
  applyPose();
  return api;
}
