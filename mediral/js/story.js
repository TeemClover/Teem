/**
 * Mediral five-piece set — the ambient scene behind the page.
 *
 * Packs and ingredient pictures are crisp DOM images owned by js/main.js; nothing here relights,
 * projects or re-draws a label. This scene only adds depth and light around them: drifting dust,
 * soft light, foam bubbles, clear droplets, rising extract motes, golden oil beads, fine powder and
 * gentle beams, blended by the mood of the selling beat that is on screen. Nothing depicts skin,
 * results, rays being blocked, absorption, or a manufacturing step.
 *
 * Contract (used by js/main.js):
 *   createStory({canvas, steps, reduced, onContextChange}) -> Promise<stage>
 *   stage: setProgress(u), setMood(kind), setReducedMotion(bool), pause(), resume(), dispose(), state
 *   kind: 'intro' | 'foam' | 'botanical' | 'hydration' | 'oil' | 'mineral' | 'plants' | 'powder' | 'texture' | 'set'
 *   u: -1..0 opening; 0..1 the mousse … 4..5 the powder; 5..6 the set.
 *   STACKED_QUERY is the one media query that switches CSS, main.js and this scene to art-above-words.
 *   onContextChange('lost' | 'restored'): main.js drops the ambient layer and brings it back.
 *   Rejects if WebGL fails; the page is complete without it.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Vector2, Vector3,
  MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, SphereGeometry, CanvasTexture,
  SRGBColorSpace, PMREMGenerator, NeutralToneMapping, DirectionalLight, HemisphereLight, MathUtils,
  DoubleSide, InstancedMesh, Object3D,
} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const ADDITIVE = 2; // THREE.AdditiveBlending (not exported by the vendored subset)
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = MathUtils.lerp;

/* ---------- canvas helpers ---------- */
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
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

/* ---------- moods ---------- */
// Each beat names one mood; the layers it asks for fade in while the others fade out.
const LAYERS = ['bubbles', 'droplets', 'motes', 'oil', 'powder', 'beams', 'halo', 'ripples'];
const MOODS = {
  intro: {beams: 0.35, halo: 0.35},
  foam: {bubbles: 1, ripples: 1, droplets: 0.2},
  botanical: {motes: 1, halo: 0.25},
  plants: {motes: 0.85, beams: 0.3, halo: 0.3},
  hydration: {droplets: 1, bubbles: 0.25, halo: 0.2},
  oil: {oil: 1, motes: 0.25, halo: 0.2},
  mineral: {beams: 1, halo: 0.6},
  powder: {powder: 1, halo: 0.3},
  texture: {halo: 1, droplets: 0.4},
  set: {halo: 0.2},
};
const MOTE_TINT = {AC: 0xb9cca0, BR: 0xd6d992, SU: 0xe0cea2, PO: 0xe0c3b2};

/* ---------- camera ---------- */
export const STACKED_QUERY = '(max-width: 1100px)';
function framing(tall) {
  // Desktop art sits right of the reading column; stacked layouts keep it in the upper band.
  return tall
    ? {fov: 37, base: new Vector3(0, 0.16, 5.15), look: new Vector3(0, 0, 0), shiftX: 0, shiftY: 0.19, unit: 0.5}
    : {fov: 35, base: new Vector3(0, 0.3, 5.7), look: new Vector3(0, 0.02, 0), shiftX: -0.14, shiftY: 0, unit: 1};
}

export async function createStory({canvas: el, steps, reduced = false, onContextChange = () => {}}) {
  let disposed = false;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new WebGLRenderer({canvas: el, antialias: !small, alpha: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = NeutralToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

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
  const tmp = new Object3D();

  /* ---- ambient layers ---- */
  // Clear film: a visible tinted rim (fresnel) around a transparent centre, readable on a pale page.
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
  const instanced = (geometry, material, count) => {
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  };

  const bubbleMat = rim(new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 520], envMapIntensity: 1.8, depthWrite: false}), 'vec3(0.56, 0.68, 0.6)');
  const bubbleSeeds = Array.from({length: small ? 40 : 64}, () => ({a: rnd() * 6.283, r: 0.35 + rnd() * 0.9, y: rnd(), s: 0.022 + rnd() * 0.06, p: rnd()}));
  const bubbles = instanced(new SphereGeometry(1, 20, 14), bubbleMat, bubbleSeeds.length);

  const dropletMat = rim(new MeshPhysicalMaterial({color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 2, depthWrite: false}), 'vec3(0.5, 0.64, 0.56)');
  const dropletSeeds = Array.from({length: small ? 18 : 28}, () => ({a: rnd() * 6.283, r: 0.55 + rnd() * 0.75, y: rnd(), s: 0.02 + rnd() * 0.05, p: rnd()}));
  const droplets = instanced(new SphereGeometry(1, 18, 12), dropletMat, dropletSeeds.length);

  // Extract motes rise slowly around the ingredient pictures. They are atmosphere, not an extraction.
  const moteMat = new MeshPhysicalMaterial({color: 0xb5c990, roughness: 0.17, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 1.5, emissive: 0x63753f, emissiveIntensity: 0.13, depthWrite: false});
  const moteSeeds = Array.from({length: small ? 36 : 60}, () => ({a: rnd() * Math.PI * 2, r: 0.4 + rnd() * 0.95, y: rnd(), s: 0.01 + rnd() * 0.016, p: rnd()}));
  const motes = instanced(new SphereGeometry(1, 12, 8), moteMat, moteSeeds.length);

  const oilMat = rim(new MeshPhysicalMaterial({color: 0xf1d98f, roughness: 0.05, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 2.2, emissive: 0x8a6a1f, emissiveIntensity: 0.12, depthWrite: false}), 'vec3(0.72, 0.58, 0.24)');
  const oilSeeds = Array.from({length: small ? 16 : 24}, () => ({a: rnd() * 6.283, r: 0.45 + rnd() * 0.8, y: rnd(), s: 0.018 + rnd() * 0.045, p: rnd()}));
  const oil = instanced(new SphereGeometry(1, 18, 12), oilMat, oilSeeds.length);

  const powderMat = new MeshBasicMaterial({color: 0xe9d3b8, transparent: true, opacity: 0, depthWrite: false});
  const powderSeeds = Array.from({length: small ? 120 : 200}, () => ({a: rnd() * 6.283, r: rnd() * 1.2, y: rnd(), s: 0.006 + rnd() * 0.012, p: rnd()}));
  const powder = instanced(new SphereGeometry(1, 6, 4), powderMat, powderSeeds.length);

  const beamMap = beamTexture();
  const beams = [0, 1, 2, 3].map(i => {
    const b = new Mesh(new PlaneGeometry(0.5 + i * 0.18, 5), new MeshBasicMaterial({map: beamMap, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false, side: DoubleSide}));
    b.rotation.z = 0.62;
    b.visible = false;
    scene.add(b);
    return b;
  });
  const ring = ringTexture();
  const halo = new Mesh(new PlaneGeometry(2.2, 2.2), new MeshBasicMaterial({map: radialTexture([[0, 'rgba(255,246,222,0.9)'], [0.45, 'rgba(255,236,196,0.35)'], [1, 'rgba(255,236,196,0)']]), transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false}));
  halo.visible = false;
  scene.add(halo);
  const ripples = [0, 1, 2].map(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({map: ring, transparent: true, opacity: 0, blending: ADDITIVE, depthWrite: false}));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    return m;
  });

  const dustSeeds = Array.from({length: small ? 40 : 90}, () => ({x: (rnd() - 0.5) * 5, y: -0.8 + rnd() * 3, z: (rnd() - 0.5) * 2, p: rnd() * 6.28, s: 0.4 + rnd()}));
  const dust = new InstancedMesh(new SphereGeometry(0.005, 6, 4), new MeshBasicMaterial({color: 0xfff1d0, transparent: true, opacity: 0.7, blending: ADDITIVE, depthWrite: false}), dustSeeds.length);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---- state ---- */
  const s = {u: -1, target: -1, progress: -1, time: 0, last: 0, running: false, frames: 0, reduced, tall: false,
    paused: false, contextLost: false, mood: 'intro', weights: {},
    stepId: null, pointer: new Vector2(), pointerCur: new Vector2()};
  const view = {w: 1, h: 1};
  for (const layer of LAYERS) s.weights[layer] = 0;
  const camPos = new Vector3(), camLook = new Vector3();
  // Same query as the CSS layout switch (art above the words), so scene and text always agree.
  const stacked = matchMedia(STACKED_QUERY);

  function resize() {
    view.w = innerWidth; view.h = innerHeight;
    s.tall = stacked.matches;
    const f = framing(s.tall);
    camera.fov = f.fov;
    camera.aspect = view.w / view.h;
    camera.setViewOffset(view.w, view.h, view.w * f.shiftX, view.h * f.shiftY, view.w, view.h);
    camera.updateProjectionMatrix();
    renderer.setSize(view.w, view.h, false);
  }

  /* ---- the scene as a function of u, mood and time ---- */
  function scatter(mesh, seeds, weight, place) {
    mesh.visible = weight > 0.004;
    if (!mesh.visible) return;
    seeds.forEach((seed, i) => {
      place(seed, i);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  function place(u, time, dt = 0) {
    const f = framing(s.tall);
    const unit = f.unit;
    const index = Math.min(steps.length - 1, Math.floor(Math.max(0, Math.min(u, steps.length - 0.0001))));
    s.stepId = u < 0 || u >= steps.length ? null : steps[index].id;
    const target = MOODS[s.mood] || MOODS.set;
    const k = s.reduced ? 1 : 1 - Math.exp(-dt / 0.35);
    for (const layer of LAYERS) s.weights[layer] = lerp(s.weights[layer], target[layer] || 0, k);
    const w = s.weights;
    const drift = s.reduced ? 0 : 1;

    camPos.copy(f.base).add(new Vector3(Math.sin(index * 1.4 + u) * 0.04 * unit, 0, 0));
    camLook.copy(f.look);
    camera.position.copy(camPos).add(new Vector3(s.pointerCur.x * 0.12 * drift, s.pointerCur.y * 0.06 * drift, 0));
    camera.lookAt(camLook);

    const rise = (seed, speed) => ((seed.y + time * speed * (0.6 + seed.p)) % 1);
    bubbleMat.opacity = 0.9 * w.bubbles;
    scatter(bubbles, bubbleSeeds, w.bubbles, (b, i) => {
      const y = rise(b, 0.05);
      const a = b.a + time * 0.12;
      tmp.position.set(Math.cos(a) * b.r * unit * 1.1, (-0.9 + y * 2) * unit, Math.sin(a) * b.r * unit * 0.6);
      tmp.scale.setScalar(Math.max(0.0001, b.s * unit * (0.7 + Math.sin(time + i) * 0.08) * (1 - Math.abs(y - 0.5) * 0.9)));
    });
    ripples.forEach((r, i) => {
      const phase = (time * 0.18 + i / 3) % 1;
      r.visible = w.ripples > 0.004;
      r.position.set(0, -0.95 * unit, 0);
      r.scale.setScalar((0.5 + phase * 2.2) * unit);
      r.material.opacity = (1 - phase) * 0.6 * w.ripples;
    });
    dropletMat.opacity = 0.95 * w.droplets;
    scatter(droplets, dropletSeeds, w.droplets, (d, i) => {
      const a = d.a + time * 0.15 * (0.6 + d.p);
      tmp.position.set(Math.cos(a) * d.r * unit * 1.2, (-0.7 + d.y * 1.5) * unit + Math.sin(time * 0.7 + i) * 0.035, Math.sin(a) * d.r * unit * 0.75);
      tmp.scale.setScalar(Math.max(0.0001, d.s * unit * 1.2));
    });
    moteMat.opacity = 0.86 * w.motes;
    moteMat.color.setHex(MOTE_TINT[s.stepId] ?? 0xc5d7ae);
    scatter(motes, moteSeeds, w.motes, m => {
      const y = rise(m, 0.035);
      const a = m.a + time * 0.05;
      tmp.position.set((Math.cos(a) * m.r - 0.35) * unit * 1.2, (-1 + y * 2.2) * unit, Math.sin(a) * m.r * unit * 0.7);
      tmp.scale.setScalar(Math.max(0.0001, m.s * unit * 1.4 * Math.sin(y * Math.PI) ** 0.5));
    });
    oilMat.opacity = 0.92 * w.oil;
    scatter(oil, oilSeeds, w.oil, (o, i) => {
      const a = o.a + time * 0.09;
      tmp.position.set(Math.cos(a) * o.r * unit * 1.15, (-0.8 + o.y * 1.6) * unit + Math.sin(time * 0.5 + i) * 0.04, Math.sin(a) * o.r * unit * 0.7);
      tmp.scale.setScalar(Math.max(0.0001, o.s * unit * 1.3));
    });
    powderMat.opacity = 0.8 * w.powder;
    scatter(powder, powderSeeds, w.powder, p => {
      const y = 1 - ((p.y + time * 0.03 * (0.5 + p.p)) % 1);
      const a = p.a + time * 0.06;
      tmp.position.set(Math.cos(a) * p.r * unit * 1.2, (-1 + y * 2.4) * unit, Math.sin(a) * p.r * unit * 0.6);
      tmp.scale.setScalar(Math.max(0.0001, p.s * unit * 1.3));
    });
    beams.forEach((b, i) => {
      b.visible = w.beams > 0.004;
      b.position.set((-1.3 + i * 0.5) * unit, 0.9 * unit, -1.2);
      b.scale.setScalar(unit);
      b.material.opacity = w.beams * (0.2 + Math.sin(time * 0.4 + i) * 0.04);
    });
    halo.visible = w.halo > 0.004;
    halo.position.set(0, 0.05 * unit, -0.4);
    halo.quaternion.copy(camera.quaternion);
    halo.scale.setScalar(unit * (1.1 + Math.sin(time * 0.3) * 0.03));
    halo.material.opacity = 0.55 * w.halo;

    dustSeeds.forEach((d, i) => {
      tmp.position.set(d.x + Math.sin(time * 0.2 * d.s + d.p) * 0.15, -0.8 + ((d.y + 0.8 + time * 0.03 * d.s) % 3), d.z);
      tmp.scale.setScalar((0.7 + Math.sin(time + d.p) * 0.3) * (1 + w.beams * 0.6));
      tmp.updateMatrix();
      dust.setMatrixAt(i, tmp.matrix);
    });
    dust.instanceMatrix.needsUpdate = true;
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
    place(s.u, s.time, dt);
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
      console.warn('[mediral] environment restore failed, keeping the page without the ambient layer', err);
      onContextChange('lost');
    }
  };
  addEventListener('resize', onResize);
  stacked.addEventListener?.('change', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('pointermove', onPointer, {passive: true});
  el.addEventListener('webglcontextlost', onLost);
  el.addEventListener('webglcontextrestored', onRestored);

  resize();
  if (renderer.getContext().isContextLost()) onLost();
  wake();

  function setProgress(u) {
    s.progress = Math.max(-1, Math.min(steps.length + 1, u));
    // Keep the raw progress so changing the motion preference does not lose the reader's place.
    s.target = s.reduced && s.progress < 0 ? -0.5
      : s.reduced && s.progress < steps.length ? Math.floor(s.progress) + 0.8 : s.progress;
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
    // Reduced motion: layers are composed at their final weights and drawn once per change.
    setProgress,
    setMood(kind) {
      const next = MOODS[kind] ? kind : 'set';
      if (next === s.mood) return;
      s.mood = next;
      wake();
    },
    setReducedMotion(value) {
      s.reduced = Boolean(value);
      if (s.reduced) { s.pointer.set(0, 0); s.pointerCur.set(0, 0); }
      setProgress(s.progress);
    },
    pause() { s.paused = true; sleep(); },
    resume() { s.paused = false; wake(); },
    dispose,
    state: s,
  };
}
