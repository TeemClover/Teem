/**
 * Builds the myClover house: the outside follows our real two-storey home (see
 * /showcase/house/: two orange hip roofs, big dark-framed windows, a glass balcony, a carport
 * and solar panels); the inside is four rooms of the website, two per floor.
 *
 *   ชั้น 2   ห้องโปรเจกต์ (office, x<0)  ห้องเรียน (classroom, x>0)  ┐ โถงบันได (stairs, x>8):
 *   ชั้น 1   ห้องนั่งเล่น (living, x<0)   ห้องครัว (kitchen, x>0)      ┘ ครัว → ห้องเรียน
 *
 * Pure scene construction: returns the pieces the tour animates. Every interactive object is
 * tagged with an item id that matches a `[data-item]` link in index.html (label, text, URL).
 * Flat decals (pictures, screens, labels) use a depth bias so they never z-fight on phones.
 */
import * as THREE from './vendor/three.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {FONT, imageTex} from './textures.js';
import {batchStaticSiblings} from './batching.js';
import {centeredText} from './labels.js';

export const H = 3.2, SLAB = 0.2, F2 = H + SLAB, D = 7, W = 8; // wall height, floor-2 level, room depth/width
export const CLOVER_ROOMS = ['living', 'kitchen', 'classroom', 'office'];
export const ROOMS = {living: [-4, 0], kitchen: [4, 0], classroom: [4, F2], office: [-4, F2]}; // centre x, floor y
export const STAIR = {x0: 8.24, x1: 11.24}; // the stair hall added to the right of the kitchen
export const HERO_CLOVER = {wide: [12.4, 9.9, 0.5], tall: [-1.5, 10.4, 0.5]};

/** Art slots: a purpose-made picture dropped in /tour/art/ replaces the borrowed one once the
 * slot is mapped to its filename in /tour/art/manifest.json (see IMAGE-PROMPTS.md).
 * `aspect` = the frame's width/height; any picture is cropped to fill it, never stretched. */
export const ART = {
  'teem-portrait': {fallback: '/img/party-teem.webp', aspect: 4 / 5},
  'forge-cover': {fallback: '/img/card-forge.jpg', aspect: 2 / 3},
  'walkthrough-cover': {fallback: '/img/col-walkthrough.webp', aspect: 2 / 3},
  'table-map': {fallback: '/frontdoor/art/underpaper-valley-mobile.webp', aspect: 4 / 3},
  'course-poster': {fallback: '/img/classroom-hero.jpg', aspect: 3 / 2},
  'teambook-cover': {fallback: '', aspect: 11 / 8},
  'screen-resume': {fallback: '/img/og-resume.jpg', aspect: 16 / 9},
  'screen-xvisor': {fallback: '/xvisor/xvisor-intro-hero.webp', aspect: 16 / 9},
  'dungeon-screen': {fallback: '/tour/art/dungeon-screen.webp', aspect: 16 / 10},
};

/* one shared 1×1 texture: every picture material is born with a map, so swapping in the real
 * image later never recompiles a shader mid-scroll (a recompile is a visible hitch in HD) */
const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blank.needsUpdate = true;

export function buildHouse({renderer, hd, tex, found, mobile, art = new Map()}) {
  const root = new THREE.Group();
  const out = {root, hotspots: [], collectibles: new Map(), tickers: [], lights: [], screens: [], smoke: [], steam: [], lazy: new Map(), music: null};
  let area = 'outside'; // which room is being built: pictures load per room, as the visitor gets near
  const geoCache = new Map(), matCache = new Map();
  const artUrl = slot => art.has(slot) ? `/tour/art/${art.get(slot)}` : ART[slot].fallback;

  /* ---------- helpers ---------- */
  const M = (color, o = {}) => {
    // key by texture uuid: JSON.stringify on a texture would serialise its whole canvas
    const key = color + Object.entries(o).map(([k, v]) => `${k}:${v?.isTexture ? v.uuid : v}`).join(',');
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({color, roughness: 0.72, ...o}));
    return matCache.get(key);
  };
  const nm = (t, s = 1) => t ? {normalMap: t, normalScale: new THREE.Vector2(s, s)} : {}; // HD-only relief
  const fabricCache = new Map();
  const fabric = color => { if (!fabricCache.has(color)) fabricCache.set(color, hd
    ? new THREE.MeshPhysicalMaterial({color, map: tex.fabric, ...nm(tex.fabricN, 0.8), roughness: 0.9, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4)})
    : new THREE.MeshStandardMaterial({color, map: tex.fabric, roughness: 0.92})); return fabricCache.get(color); };
  const wood = (color = '#b07a4c') => hd ? M(color, {map: tex.grain, normalMap: tex.grainN, roughness: 0.42}) : M(color, {map: tex.grain, roughness: 0.5});
  function geo(kind, args) {
    const key = kind + args.join(',');
    if (!geoCache.has(key)) {
      geoCache.set(key, kind === 'rbox' ? new RoundedBoxGeometry(args[0], args[1], args[2], hd ? 3 : 1, Math.min(args[3], args[0] / 2.2, args[1] / 2.2, args[2] / 2.2))
        : kind === 'box' ? new THREE.BoxGeometry(...args)
        : kind === 'cyl' ? new THREE.CylinderGeometry(args[0], args[1], args[2], hd ? 32 : 18)
        : kind === 'sph' ? new THREE.SphereGeometry(args[0], hd && args[0] >= 0.1 ? 24 : 12, hd && args[0] >= 0.1 ? 16 : 8)
        : new THREE.IcosahedronGeometry(args[0], args[1]));
    }
    return geoCache.get(key);
  }
  const place = (m, parent, x, y, z, rot) => { m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const asMat = m => typeof m === 'string' ? M(m) : m;
  // rounded box sitting on y (bottom), centred on x/z
  const rb = (p, [w, h, d], [x, y, z], mat, rot, r = 0.04) => place(new THREE.Mesh(geo('rbox', [w, h, d, r]), asMat(mat)), p, x, y + h / 2, z, rot);
  const bx = (p, [w, h, d], [x, y, z], mat, rot) => place(new THREE.Mesh(geo('box', [w, h, d]), asMat(mat)), p, x, y + h / 2, z, rot);
  const cy = (p, [rt, rb_, h], [x, y, z], mat) => place(new THREE.Mesh(geo('cyl', [rt, rb_, h]), asMat(mat)), p, x, y + h / 2, z);
  const sp = (p, r, [x, y, z], mat) => place(new THREE.Mesh(geo('sph', [r]), asMat(mat)), p, x, y, z);
  const blob = (p, r, [x, y, z], color, detail = 1) => place(new THREE.Mesh(geo('ico', [r, detail]), M(color, {flatShading: !hd, roughness: 0.8})), p, x, y, z);
  // flat decal: pulled toward the camera in depth so it never fights the surface behind it
  const plane = (p, [w, h], [x, y, z], mat, rot) => {
    mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.receiveShadow = true; p.add(m); return m;
  };
  const photo = (url, aspect, glow = false, tint = '#d9d2c4') => {
    const m = new THREE.MeshStandardMaterial({color: tint, roughness: 0.45, map: blank});
    if (glow) { m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = 0; m.emissiveMap = blank; m.userData.glow = 0.75; } // dark until the picture loads
    if (url) { if (!out.lazy.has(area)) out.lazy.set(area, []); out.lazy.get(area).push(() => imageTex(url, m, renderer, aspect)); }
    return m;
  };
  const artMat = (slot, glow = false, tint) => photo(artUrl(slot), ART[slot].aspect, glow, tint);
  const hot = (obj, id) => { obj.traverse(o => { o.userData.item = id; }); out.hotspots.push({root: obj, id, base: obj.position.clone(), rot: obj.rotation.clone()}); return obj; };
  const group = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  function plant(p, x, z, s = 1, pot = '#e8dccb') {
    cy(p, [0.26 * s, 0.2 * s, 0.46 * s], [x, 0, z], M(pot, {roughness: 0.5}));
    const leaves = ['#3f8a50', '#4f9a5c', '#62b06c'];
    for (let i = 0; i < (hd ? 9 : 5); i++) { const a = i * 2.39; blob(p, (0.2 + (i % 3) * 0.05) * s, [x + Math.cos(a) * 0.16 * s, (0.62 + (i % 4) * 0.15) * s, z + Math.sin(a) * 0.16 * s], leaves[i % 3], hd ? 1 : 0); }
  }
  function lampLight(p, x, y, z, intensity = 6, dist = 7) { const l = new THREE.PointLight('#ffd9a0', 0, dist, 1.7); l.position.set(x, y, z); l.userData.max = intensity; p.add(l); out.lights.push(l); return l; }
  function label(text, w = 512, h = 128, bg = '#14281d', fg = '#fbf6ec', size = 56) {
    return tex.canvasTex(w, h, (c) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = `700 ${size}px ${FONT}`;
      const m = c.measureText(text); // centre the inked glyphs (Thai marks sit above and below the line)
      centeredText(c, text, w / 2, h / 2 + ((m.actualBoundingBoxAscent || size * 0.7) - (m.actualBoundingBoxDescent || 0)) / 2, w - 32);
    });
  }
  const canvasMat = (w, h, draw, glow = 0) => { const t = tex.canvasTex(w, h, draw); return new THREE.MeshStandardMaterial({map: t, roughness: 0.45, ...(glow ? {emissive: '#ffffff', emissiveMap: t, emissiveIntensity: glow} : {})}); };
  const ceramic = M('#f3efe6', {roughness: 0.25}), brass = M('#c9a24a', {metalness: 0.9, roughness: 0.25});
  const vase = (p, x, y, z, col, h = 0.28) => { cy(p, [0.06, 0.09, h], [x, y, z], M(col, {roughness: 0.2})); blob(p, 0.12, [x, y + h + 0.1, z], '#62b06c', 1); };
  const stack = (p, x, y, z, n, rot = 0) => { for (let k = 0; k < n; k++) rb(p, [0.34 - k * 0.02, 0.05, 0.24], [x, y + k * 0.052, z], ['#e37c5b', '#2e9e5b', '#f3efe6', '#4a8fd1'][k % 4], [0, rot + k * 0.12, 0], 0.01); };
  const clock = (p, x, y, z) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 40), ceramic); c.rotation.x = Math.PI / 2; place(c, p, x, y, z);
    const hand = bx(p, [0.02, 0.15, 0.01], [x, y - 0.02, z + 0.035], '#14281d'); hand.userData.dynamic = true; out.tickers.push(t => { hand.rotation.z = -t * 0.2; });
  };
  const flowerColors = ['#f28b82', '#fbd46d', '#ffffff', '#c39bd3', '#f7a1c4'];

  /* ---------- clover geometry ---------- */
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(-0.55, 0.3, -0.62, 0.92, -0.26, 1.0);
  leafShape.bezierCurveTo(-0.07, 1.05, 0, 0.88, 0, 0.76);
  leafShape.bezierCurveTo(0, 0.88, 0.07, 1.05, 0.26, 1.0);
  leafShape.bezierCurveTo(0.62, 0.92, 0.55, 0.3, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, {depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: hd ? 4 : 2, curveSegments: hd ? 24 : 12});
  leafGeo.translate(0, 0, -0.05);
  out.leafGeo = leafGeo;
  function clover(material, leaves = 4) {
    const g = new THREE.Group();
    for (let i = 0; i < leaves; i++) { const l = new THREE.Mesh(leafGeo, material); l.rotation.z = i * Math.PI * 2 / leaves + Math.PI / 4; l.castShadow = true; g.add(l); }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, -0.6, 0.05), new THREE.Vector3(0.05, -1.3, 0.1)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.05, 8), material));
    return g;
  }

  /* ================= GROUND, GARDEN, CARPORT ================= */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.grass, ...nm(tex.grassN), roughness: 1}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; ground.receiveShadow = true; root.add(ground);
  bx(root, [STAIR.x1 + 8.56, 0.36, D + 0.9], [(STAIR.x1 - 8.2) / 2 + 0.08, -0.4, 0], M('#d8cdb8', {roughness: 0.9})); // top 4 cm under the floors: never coplanar
  const paving = M('#d6d1c6', {roughness: 0.95});
  bx(root, [4.4, 0.04, 14], [-9.9, -0.06, 3.2], paving); // driveway under the carport
  const garden = group(root);
  for (let i = 0; i < 9; i++) place(new THREE.Mesh(geo('cyl', [0.42, 0.46, 0.06]), M('#dcd5c6', {roughness: 0.95})), garden, -5.5 + Math.sin(i * 0.8) * 0.25, -0.02, 4.5 + i * 1.05);
  const TREES = [[15.2, 5.5, 1.1], [16, -1.5, 1.3], [14.2, -6.5, 1.0], [-15, -5, 1.3], [-16.5, 3, 1.1], [3, -10, 1.4], [-5, -11, 1.2], [18, 9, 0.9]];
  for (const [x, z, s] of TREES) {
    cy(garden, [0.16 * s, 0.26 * s, 1.7 * s], [x, 0, z], M('#7a5236', {roughness: 0.9}));
    blob(garden, 1.35 * s, [x, 2.4 * s, z], '#4f9a5c', hd ? 2 : 1); blob(garden, 1.0 * s, [x + 0.6 * s, 3.2 * s, z + 0.2], '#62b06c', hd ? 2 : 1); blob(garden, 0.85 * s, [x - 0.55 * s, 3.0 * s, z - 0.3], '#3f8a50', hd ? 2 : 1);
  }
  const flowers = out.flowers = group(garden); // front hedge: hidden while the camera is inside
  const hedgeMat = M('#4f9a5c', {roughness: 0.95, map: tex.fabric});
  for (const [x0, x1] of [[-7.9, -6.3], [-4.7, 10.9]]) {
    rb(flowers, [x1 - x0, 0.42, 0.55], [(x0 + x1) / 2, 0, D / 2 + 0.75], hedgeMat, null, 0.18);
    for (let x = x0 + 0.15; x < x1; x += hd ? 0.22 : 0.4) { const k = Math.round(x * 13); sp(flowers, 0.045 + (Math.abs(k) % 3) * 0.01, [x, 0.425, D / 2 + 0.58 + (Math.abs(k) % 5) * 0.08], M(flowerColors[Math.abs(k) % 5], {roughness: 0.6})); }
  }
  { // Ground cover is only a few pixels tall: reserve bevelled leaves for the hero and quest.
    const N = hd ? 900 : mobile ? 260 : 480, leafMat = M('#3f9a57', {roughness: 0.6, side: THREE.DoubleSide});
    const meadowLeaf = new THREE.ShapeGeometry(leafShape, 4);
    const meshes = [0, 1, 2].map(() => new THREE.InstancedMesh(meadowLeaf, leafMat, N));
    const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      let x, z; do { x = (r() - 0.5) * 70; z = (r() - 0.5) * 56 + 6; } while ((x > -12.5 && x < 12.6 && z < 11 && z > -5) || (Math.abs(x + 5.5) < 1.4 && z > 3));
      e.set(-Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 6.28); q.setFromEuler(e); p.set(x, 0.05, z); const s = 0.13 + r() * 0.1; sc.set(s, s, s);
      m4.compose(p, q, sc);
      meshes.forEach((mesh, k) => { rot.makeRotationZ(k * Math.PI * 2 / 3); mesh.setMatrixAt(i, m4.clone().multiply(rot)); });
    }
    meshes.forEach(m => { m.receiveShadow = true; garden.add(m); });
  }
  const white = M('#f4f2ec', {map: tex.plaster, ...nm(tex.plasterN), roughness: 0.85}), grey = M('#c9c6bf', {roughness: 0.7}), frameMat = M('#2b2f31', {roughness: 0.45, metalness: 0.3});
  const railGlass = new THREE.MeshStandardMaterial({color: '#cfe6ee', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false});
  { // carport on the left, with a glass-railed deck above like the real house
    const cp = group(root, -9.9, 0, 0);
    for (const [x, z] of [[-1.7, 3.1], [-1.7, -3.0]]) cy(cp, [0.14, 0.14, H], [x, 0, z], white);
    bx(cp, [3.9, 0.22, D + 0.3], [0, H - 0.02, 0.1], white);
    bx(cp, [3.9, 0.9, 0.04], [0, H + 0.2, D / 2 + 0.22], railGlass); bx(cp, [0.04, 0.9, D + 0.3], [-1.93, H + 0.2, 0.1], railGlass);
    bx(cp, [3.94, 0.05, 0.08], [0, H + 1.1, D / 2 + 0.22], frameMat); bx(cp, [0.08, 0.05, D + 0.3], [-1.93, H + 1.1, 0.1], frameMat);
    // the family car
    const car = group(cp, 0, 0, 0.4);
    const paint = M('#f2f2f0', {roughness: 0.25, metalness: 0.4}), tyre = M('#1c1c1c', {roughness: 0.8});
    const glassDark = () => new THREE.MeshStandardMaterial({color: '#2d3a44', roughness: 0.1, metalness: 0.5});
    rb(car, [1.85, 0.62, 4.3], [0, 0.32, 0], paint, null, 0.18);
    rb(car, [1.62, 0.55, 2.5], [0, 0.9, -0.25], paint, null, 0.2);
    for (const [x, z] of [[-0.93, 1.35], [0.93, 1.35], [-0.93, -1.4], [0.93, -1.4]]) { const w = cy(car, [0.34, 0.34, 0.24], [x, 0.22, z], tyre); w.rotation.z = Math.PI / 2; w.position.y = 0.34; }
    plane(car, [1.45, 0.42], [0, 1.2, 1.0], glassDark(), [-1.05, 0, 0]);
    for (const s of [-1, 1]) plane(car, [2.2, 0.38], [s * 0.815, 1.18, -0.25], glassDark(), [0, s * Math.PI / 2, 0]);
    for (const s of [-0.62, 0.62]) bx(car, [0.3, 0.1, 0.03], [s, 0.62, 2.16], M('#fff6d6', {emissive: '#fff1c0', emissiveIntensity: 0.4}));
  }

  /* ================= SHELL: floors, slab, back & side walls, partitions ================= */
  const floorMat = {
    wood: new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.wood, ...nm(tex.woodN, 0.9), roughness: hd ? 0.38 : 0.5, metalness: 0.02}),
    tile: new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.tile, ...nm(tex.tileN, 0.8), roughness: hd ? 0.32 : 0.35}),
  };
  const wallMat = {
    living: M('#ffffff', {map: tex.stripes, ...nm(tex.stripesN)}), kitchen: M('#f5e6bd', {map: tex.plaster, ...nm(tex.plasterN)}),
    classroom: M('#d6e6f2', {map: tex.plaster, ...nm(tex.plasterN)}), office: M('#ecd9cc', {map: tex.plaster, ...nm(tex.plasterN)}),
  };
  for (const [id, [cx, fy]] of Object.entries(ROOMS)) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), id === 'kitchen' ? floorMat.tile : floorMat.wood);
    f.position.set(cx, fy - 0.06, 0); f.receiveShadow = true; root.add(f);
    const back = bx(root, [W, H, 0.24], [cx, fy, -D / 2 - 0.12], wallMat[id]); back.castShadow = false;
    bx(root, [W, 0.14, 0.05], [cx, fy, -D / 2 + 0.025], '#fbf8f1'); // skirting
    if (id !== 'kitchen') bx(root, [W, 0.9, 0.03], [cx, fy, -D / 2 + 0.015], M('#f3f0e6', {map: tex.plaster})); // wainscot, 1.5 cm behind the skirting face
  }
  // floor-2 slab: between the ceiling of floor 1 (y=H) and the floor boxes of floor 2 (bottom F2-0.12)
  bx(root, [16.4, SLAB - 0.12, D + 0.3], [0, H, 0], white);
  bx(root, [16.4, 0.12, 0.14], [0, H + 0.02, D / 2 + 0.08], grey); // slab edge band seen in section
  // side walls (always visible; they frame the dollhouse), with window decals inside and out
  const sideWindow = canvasMat(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a9d8ef'); g.addColorStop(1, '#f4e6c3'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,110,70,.5)'; for (let x = 0; x < w; x += 42) { c.beginPath(); c.arc(x + 20, h - 10, 34, Math.PI, 0); c.fill(); } c.strokeStyle = '#2b2f31'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke(); }, 0.45);
  // right wall: doorways into the stair hall (floor 1 near the front, floor 2 at the back)
  const DOOR1 = [1.5, 2.9], DOOR2 = [-3.25, -1.95], DH = 2.3, ZW = D / 2 + 0.12;
  function sideWall(x, fy, door) {
    if (!door) return bx(root, [0.24, H, 2 * ZW], [x, fy, 0], white);
    const [a, b] = door;
    bx(root, [0.24, H, a + ZW], [x, fy, (a - ZW) / 2], white); bx(root, [0.24, H, ZW - b], [x, fy, (b + ZW) / 2], white);
    bx(root, [0.24, H - DH, b - a], [x, fy + DH, (a + b) / 2], white);
    for (const z of [a, b]) bx(root, [0.3, DH, 0.06], [x, fy, z], wood('#8c6242')); // door frame
    bx(root, [0.3, 0.06, b - a + 0.06], [x, fy + DH, (a + b) / 2], wood('#8c6242'));
  }
  for (const fy of [0, F2]) {
    sideWall(-8.12, fy); sideWall(8.12, fy, fy ? DOOR2 : DOOR1);
    for (const face of [-1, 1]) plane(root, [1.6, 1.3], [-8.12 + face * 0.125, fy + 1.75, 0.2], sideWindow, [0, face * Math.PI / 2, 0]);
    plane(root, [1.6, 1.3], [8.12 - 0.125, fy + 1.75, 0.2], sideWindow, [0, -Math.PI / 2, 0]);
  }
  // partitions between the two rooms of each floor, with a doorway near the back
  for (const fy of [0, F2]) {
    bx(root, [0.2, H, D - 2.2], [0, fy, 1.1], white);
    bx(root, [0.2, H, 0.9], [0, fy, -D / 2 + 0.45], white);
    bx(root, [0.2, 0.6, 1.3], [0, fy + H - 0.6, -D / 2 + 1.55], white); // lintel spans the doorway only
  }

  /* ================= FACADE: floor 1 sinks, floor 2 rises with the roof ================= */
  const FZ = D / 2 + 0.12;
  const glassMat = out.glassMat = new THREE.MeshStandardMaterial({color: '#9fb9c4', roughness: 0.06, metalness: 0.4, emissive: '#ffcf7a', emissiveIntensity: 0});
  function frontWall(parent, fy, holes, xa = -8.24, xb = 8.24) { // holes: [x0, x1, y0, y1] in wall space, left to right
    const piece = (a, b, y0, y1) => { if (b - a > 0.01 && y1 - y0 > 0.01) bx(parent, [b - a, y1 - y0, 0.24], [(a + b) / 2, fy + y0, FZ], white); };
    const xs = [xa, ...holes.flatMap(h => [h[0], h[1]]), xb];
    for (let i = 0; i < xs.length; i += 2) piece(xs[i], xs[i + 1], 0, H);
    for (const [x0, x1, y0, y1] of holes) { piece(x0, x1, 0, y0); piece(x0, x1, y1, H); }
  }
  function glazing(parent, fy, [x0, x1, y0, y1], mullions = 2) {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2;
    plane(parent, [w, h], [cx, fy + y0 + h / 2, FZ], glassMat);
    bx(parent, [w + 0.1, 0.08, 0.3], [cx, fy + y0 - 0.08, FZ], frameMat); bx(parent, [w + 0.1, 0.08, 0.3], [cx, fy + y1, FZ], frameMat);
    for (const x of [x0, x1]) bx(parent, [0.08, h, 0.3], [x, fy + y0, FZ], frameMat);
    for (let k = 1; k <= mullions; k++) bx(parent, [0.05, h, 0.12], [x0 + w * k / (mullions + 1), fy + y0, FZ + 0.02], frameMat);
  }
  const facade = out.facade = group(root);
  frontWall(facade, 0, [[-6.2, -4.8, 0, 2.4], [-3.6, -0.6, 0.35, 2.7], [1.0, 7.0, 0.35, 2.7]]);
  glazing(facade, 0, [-3.6, -0.6, 0.35, 2.7], 1); glazing(facade, 0, [1.0, 7.0, 0.35, 2.7], 3);
  // stair hall front: one tall window runs through both floors (lower half sinks, upper half lifts)
  const WX = [9.2, 10.6], stairWall = (parent, x0, x1, y0, y1) => bx(parent, [x1 - x0, y1 - y0, 0.24], [(x0 + x1) / 2, y0, FZ], white);
  stairWall(facade, STAIR.x0, WX[0], 0, H); stairWall(facade, WX[1], STAIR.x1, 0, H); stairWall(facade, WX[0], WX[1], 0, 0.6);
  glazing(facade, 0, [WX[0], WX[1], 0.6, H], 1);
  const door = out.door = group(facade, -6.2, 0, FZ + 0.03);
  rb(door, [1.4, 2.38, 0.09], [0.7, 0, 0], M('#3a2a20', {map: tex.grain, roughness: 0.4}), null, 0.02);
  cy(door, [0.04, 0.04, 0.3], [1.22, 0.9, 0.08], brass);
  for (const y of [0.5, 1.2, 1.9]) bx(door, [1.1, 0.03, 0.02], [0.7, y, 0.055], M('#2a1d15', {roughness: 0.5})); // grooves on the leaf
  bx(facade, [2.6, 0.12, 1.3], [-5.5, 2.62, FZ + 0.6], white); // porch canopy
  // welcome sign: fixed on the canopy (it used to ride on the door leaf and skewed as the door swung)
  const sign = group(facade, -5.5, 2.3, FZ + 1.2);
  rb(sign, [1.5, 0.34, 0.05], [0, 0, 0], wood('#6d4a30'), null, 0.015);
  plane(sign, [1.38, 0.26], [0, 0.17, 0.028], new THREE.MeshStandardMaterial({map: label('ยินดีต้อนรับ', 768, 144, '#fbf6ec', '#1d6b3d', 84), roughness: 0.6}));
  for (const dx of [-0.55, 0.55]) cy(sign, [0.008, 0.008, 0.02], [dx, 0.34, 0], brass);
  for (const dx of [-0.95, 0.95]) { const l = cy(facade, [0.09, 0.11, 0.3], [-5.5 + dx, 2.0, FZ + 0.18], M('#fff1cf', {emissive: '#ffcf7a', emissiveIntensity: 1.2})); l.castShadow = false; }
  rb(facade, [2.2, 0.12, 0.9], [-5.5, -0.06, FZ + 0.55], grey, null, 0.02); // front step
  lampLight(facade, -5.5, 2.3, 4.8, 5, 6);
  const upper = out.upper = group(root);
  frontWall(upper, F2, [[-7.2, -1.2, 0.2, 2.75], [1.4, 3.8, 0.9, 2.5], [4.6, 7.0, 0.9, 2.5]]);
  glazing(upper, F2, [-7.2, -1.2, 0.2, 2.75], 3); glazing(upper, F2, [1.4, 3.8, 0.9, 2.5], 1); glazing(upper, F2, [4.6, 7.0, 0.9, 2.5], 1);
  bx(upper, [6.6, 0.14, 1.3], [-4.2, F2 - 0.14, FZ + 0.65], white); // balcony deck
  bx(upper, [6.6, 0.95, 0.04], [-4.2, F2, FZ + 1.28], railGlass);
  bx(upper, [6.64, 0.05, 0.07], [-4.2, F2 + 0.95, FZ + 1.28], frameMat);
  for (const x of [-7.4, -1.0]) cy(upper, [0.1, 0.1, F2 - 0.14], [x, 0, FZ + 1.1], white); // balcony columns (they rise with it)
  bx(upper, [16.5, 0.18, 0.4], [0, F2 + H - 0.1, FZ + 0.06], grey); // top band
  stairWall(upper, STAIR.x0, WX[0], H, F2 + H); stairWall(upper, WX[1], STAIR.x1, H, F2 + H); stairWall(upper, WX[0], WX[1], F2 + 2.6, F2 + H);
  stairWall(upper, WX[0], WX[1], H, H + 0.16); glazing(upper, H, [WX[0], WX[1], 0.26, SLAB + 2.6], 1); // no frame shares a face with the lower window
  bx(upper, [STAIR.x1 - STAIR.x0 + 0.1, 0.18, 0.4], [(STAIR.x0 + STAIR.x1) / 2, F2 + H - 0.1, FZ + 0.06], grey);

  /* ================= ROOFS: two hip roofs + solar panels (lift away when inside) ================= */
  const roof = out.roof = group(root);
  const tile = M('#d2683f', {roughness: 0.62, side: THREE.DoubleSide, ...(hd ? {map: tex.canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#d2683f'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(80,25,10,.35)'; c.fillRect(0, y, w, 4); for (let x = (y / 32 % 2) * 16; x < w; x += 32) { c.fillStyle = 'rgba(80,25,10,.2)'; c.fillRect(x, y, 2, 32); } } }, {repeat: [1, 1]})} : {})});
  function hipRoof(cx, cz, w, d, h, y) {
    const hw = w / 2, hd2 = d / 2, rl = Math.max(0, hw - hd2); // ridge half-length along x
    const A = [cx - hw, y, cz + hd2], B = [cx + hw, y, cz + hd2], C = [cx + hw, y, cz - hd2], Dd = [cx - hw, y, cz - hd2];
    const R1 = [cx - rl, y + h, cz], R2 = [cx + rl, y + h, cz];
    const tris = [A, B, R2, A, R2, R1, B, C, R2, C, Dd, R1, C, R1, R2, Dd, A, R1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris.flat()), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(tris.flatMap(v => [v[0] * 0.5, (v[2] + v[1]) * 0.5])), 2));
    g.computeVertexNormals();
    place(new THREE.Mesh(g, tile), roof, 0, 0, 0);
    bx(roof, [w, 0.16, d], [cx, y - 0.16, cz], white); // fascia / soffit
    return {slope: Math.atan2(h, hd2)};
  }
  const top = F2 + H;
  hipRoof(-4.1, 0.1, 9.0, D + 1.6, 2.1, top);
  const right = hipRoof(4.1, -0.2, 9.0, D + 2.0, 2.5, top + 0.12);
  hipRoof((STAIR.x0 + STAIR.x1) / 2 + 0.1, 0, STAIR.x1 - STAIR.x0 + 0.5, D + 1.1, 1.3, top); // lower roof over the stair hall
  const solar = M('#1f2d4a', {roughness: 0.25, metalness: 0.5, ...(hd ? {map: tex.canvasTex(128, 128, c => { c.fillStyle = '#1f2d4a'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(200,220,255,.35)'; c.lineWidth = 2; for (let k = 0; k <= 128; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 128); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(128, k); c.stroke(); } })} : {})});
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { // panels on the front slope of the right roof, 6 cm above the tiles
    const along = 0.6 + r * 1.15, x = 2.3 + k * 1.1;
    const pz = -0.2 + (D + 2.0) / 2 - along * Math.cos(right.slope), py = top + 0.12 + along * Math.sin(right.slope) + 0.06;
    bx(roof, [1.0, 0.04, 1.05], [x, py, pz], solar, [right.slope, 0, 0]);
  }

  /* ================= LIVING ROOM (floor 1, left): book corner, game table, lounge ================= */
  const room = id => { area = id; return group(root, ROOMS[id][0], ROOMS[id][1], 0); };
  const BW = -D / 2; // back wall face (room local z)
  {
    const g = room('living');
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.025, 64), new THREE.MeshStandardMaterial({map: tex.rug, roughness: 1}));
    rug.position.set(0.2, 0.0125, 0.4); rug.receiveShadow = true; g.add(rug);
    const sage = fabric('#5b8a6f');
    rb(g, [3.2, 0.42, 1.0], [0.2, 0.08, BW + 0.85], sage, null, 0.1); rb(g, [3.2, 0.8, 0.3], [0.2, 0.36, BW + 0.4], sage, null, 0.12);
    rb(g, [0.3, 0.66, 1.0], [-1.4, 0.08, BW + 0.85], sage, null, 0.12); rb(g, [0.3, 0.66, 1.0], [1.8, 0.08, BW + 0.85], sage, null, 0.12);
    for (const dx of [-0.52, 0.92]) rb(g, [1.4, 0.18, 0.88], [dx, 0.5, BW + 0.9], fabric('#6f9e82'), null, 0.08);
    rb(g, [0.5, 0.44, 0.16], [-0.9, 0.64, BW + 0.62], fabric('#f2c14e'), [0.2, 0.25, 0], 0.08);
    rb(g, [0.5, 0.44, 0.16], [1.3, 0.64, BW + 0.62], fabric('#e37c5b'), [0.2, -0.25, 0], 0.08);
    // photo of Teem → /resume/, clover art
    const frame = group(g, -0.45, 1.5, BW + 0.03);
    rb(frame, [0.84, 1.04, 0.05], [0, 0, 0], wood('#6d4a30'), null, 0.01);
    plane(frame, [0.72, 0.9], [0, 0.52, 0.035], artMat('teem-portrait'));
    hot(frame, 'teem-photo');
    const art = group(g, 0.95, 1.66, BW + 0.03);
    rb(art, [0.9, 0.72, 0.05], [0, 0, 0], wood('#6d4a30'), null, 0.01);
    plane(art, [0.78, 0.6], [0, 0.36, 0.035], canvasMat(256, 200, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe3f0'); gr.addColorStop(1, '#f7e7c4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#2e9e5b'; for (let k = 0; k < 4; k++) { c.save(); c.translate(128, 100); c.rotate(k * Math.PI / 2 + Math.PI / 4); c.beginPath(); c.ellipse(0, -26, 20, 28, 0, 0, 7); c.fill(); c.restore(); } }));
    // game table: compass on the map (old homepage), CORE7 cards, dice, tea for guests
    rb(g, [2.2, 0.1, 1.4], [0.2, 0.42, 0.45], wood('#a8744a'), null, 0.04);
    for (const [dx, dz] of [[-0.95, -0.58], [0.95, -0.58], [-0.95, 0.58], [0.95, 0.58]]) cy(g, [0.05, 0.04, 0.42], [0.2 + dx, 0, 0.45 + dz], '#6d4a30');
    const compass = group(g, -0.3, 0.52, 0.55);
    plane(compass, [0.84, 0.63], [0, 0.006, 0], artMat('table-map', false, '#e8dcc0'), [-Math.PI / 2, 0, 0.12]);
    const cbody = new THREE.MeshStandardMaterial({transparent: true, alphaTest: 0.2, roughness: 0.35, metalness: 0.2, color: '#c9b27a'});
    imageTex('/frontdoor/art/compass-body-mobile.webp', cbody, renderer, 1);
    plane(compass, [0.42, 0.42], [0.05, 0.035, 0.02], cbody, [-Math.PI / 2, 0, 0]).castShadow = true;
    const needleMat = new THREE.MeshStandardMaterial({transparent: true, alphaTest: 0.2, color: '#ffffff'}); imageTex('/frontdoor/art/compass-needle.webp', needleMat, renderer, 1);
    const needle = plane(compass, [0.3, 0.3], [0.05, 0.05, 0.02], needleMat, [-Math.PI / 2, 0, 0]);
    needle.userData.dynamic = true; out.tickers.push(t => { needle.rotation.z = Math.sin(t * 0.9) * 0.35 + Math.sin(t * 2.3) * 0.08; });
    hot(compass, 'compass');
    const core7 = group(g, 0.8, 0.53, 0.45);
    const cards = ['gen-red', 'gen-green', 'gen-blue', 'gen-silver', 'fh-red-courage'].slice(0, hd ? 5 : 4);
    cards.forEach((name, k) => { // each card 5 mm above the one below: no shared depth
      const mid = (cards.length - 1) / 2;
      plane(core7, [0.24, 0.42], [(k - mid) * 0.12, 0.006 + k * 0.005, Math.abs(k - mid) * 0.035], photo(`/core7/assets/cards/${name}.webp`, 0.24 / 0.42, false, '#3a3f5c'), [-Math.PI / 2, 0, (k - mid) * 0.22]).castShadow = true;
    });
    rb(core7, [0.26, 0.08, 0.44], [0.45, 0, -0.12], M('#1d2340', {roughness: 0.5}), [0, 0.3, 0], 0.01);
    hot(core7, 'core7');
    for (let k = 0; k < 2; k++) { const d = rb(g, [0.11, 0.11, 0.11], [1.05 + k * 0.15, 0.52, 0.95 + k * 0.08], '#ffffff', null, 0.025); d.userData.dynamic = true; out.tickers.push(t => { d.rotation.y = t * 0.5 + k; }); }
    const tea = group(g, 0.2, 0.52, 0.05);
    sp(tea, 0.11, [0, 0.09, 0], ceramic).scale.set(1, 0.8, 1);
    cy(tea, [0.02, 0.03, 0.12], [0.13, 0.09, 0], ceramic).rotation.z = -0.9;
    for (let k = 0; k < 2; k++) cy(tea, [0.05, 0.037, 0.065], [-0.24 + k * 0.13, 0, 0.1], M('#ffffff', {roughness: 0.25}));
    // console: Main Quest box (Hall) and the record player (plays the myClover instrumental)
    rb(g, [1.9, 0.62, 0.52], [2.95, 0, BW + 0.3], wood('#8c6242'), null, 0.03);
    const hall = group(g, 2.45, 0.62, BW + 0.32);
    rb(hall, [0.7, 0.09, 0.44], [0, 0, 0], M('#e37c5b'), [0, 0.1, 0], 0.01); rb(hall, [0.68, 0.09, 0.42], [0, 0.095, 0], M('#4a8fd1'), [0, -0.08, 0], 0.01);
    rb(hall, [0.7, 0.09, 0.44], [0, 0.19, 0], M('#1d6b3d'), [0, 0.04, 0], 0.01);
    plane(hall, [0.66, 0.4], [0, 0.285, 0], canvasMat(512, 320, (c, w) => { c.fillStyle = '#1d6b3d'; c.fillRect(0, 0, w, 320); c.fillStyle = '#f2c14e'; c.font = `800 70px ${FONT}`; centeredText(c, 'MAIN QUEST', w / 2, 140, w - 40); c.fillStyle = '#fbf6ec'; c.font = `600 42px ${FONT}`; centeredText(c, 'CORE7 · XTY · Hall', w / 2, 220, w - 40); }), [-Math.PI / 2, 0, -0.04]);
    hot(hall, 'hall');
    const player = out.music = group(g, 3.45, 0.62, BW + 0.3);
    rb(player, [0.62, 0.12, 0.46], [0, 0, 0], wood('#5a3d28'), null, 0.02);
    const platter = group(player, -0.06, 0.12, 0.02);
    cy(platter, [0.2, 0.2, 0.02], [0, 0, 0], M('#2b2f31', {metalness: 0.6, roughness: 0.3}));
    cy(platter, [0.19, 0.19, 0.008], [0, 0.02, 0], M('#111111', {roughness: 0.35})); // the record
    cy(platter, [0.06, 0.06, 0.004], [0, 0.028, 0], M('#2e9e5b', {roughness: 0.5})); // green label
    const arm = group(player, 0.22, 0.12, -0.14); arm.rotation.y = 0.5;
    cy(arm, [0.025, 0.03, 0.06], [0, 0, 0], brass);
    rb(arm, [0.018, 0.018, 0.26], [0, 0.05, 0.12], M('#c9ced1', {metalness: 0.9, roughness: 0.2}), null, 0.006);
    for (const dx of [-0.42, 0.42]) { const sp_ = group(player, dx, 0, 0); rb(sp_, [0.18, 0.3, 0.2], [0, 0, 0], M('#2b2f31', {roughness: 0.5}), null, 0.02); cy(sp_, [0.055, 0.055, 0.01], [0, 0.14, 0.1], M('#6b7075', {metalness: 0.5})).rotation.x = Math.PI / 2; }
    player.userData.playing = 0;
    platter.userData.dynamic = true; arm.userData.dynamic = true; out.tickers.push((t, dt) => { const on = player.userData.playing; platter.rotation.y -= dt * 3.5 * on; arm.rotation.y = 0.5 - 0.35 * on; });
    player.traverse(o => { o.userData.music = true; });
    // book corner along the left wall: open shelf, three featured books, armchair, reading lamp
    const bs = group(g, -3.7, 0, -1.3); bs.rotation.y = Math.PI / 2;
    const shelfWood = wood('#8c6242');
    bx(bs, [3.6, 2.6, 0.05], [0, 0, -0.26], wood('#6b4a30'));
    for (const sx of [-1.8, 1.8]) rb(bs, [0.06, 2.62, 0.52], [sx, 0, 0], shelfWood, null, 0.01);
    rb(bs, [3.62, 0.06, 0.53], [0, 2.58, 0], shelfWood, null, 0.01);
    const N = hd ? 150 : 110, books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M('#ffffff', {roughness: 0.6}), N);
    const bcols = ['#e37c5b', '#2e9e5b', '#4a8fd1', '#f2c14e', '#7d5ba6', '#f3efe6', '#1d6b3d', '#b8573c'];
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); let i = 0;
    for (let s = 0; s < 5 && i < N; s++) {
      let x = -1.72;
      while (x < 1.6 && i < N) {
        const w = 0.07 + ((i * 37) % 7) / 60, h = 0.3 + ((i * 13) % 5) / 40, lean = (i % 11 === 0) ? 0.18 : 0;
        m4.compose(new THREE.Vector3(x + w / 2, 0.14 + s * 0.5 + h / 2, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, lean)), new THREE.Vector3(w, h, 0.32));
        books.setMatrixAt(i, m4); books.setColorAt(i, col.set(bcols[(i * 5 + s) % bcols.length])); x += w + 0.012; i++;
      }
      bx(bs, [3.5, 0.04, 0.48], [0, 0.09 + s * 0.5, 0], wood('#6b4a30'));
    }
    books.count = i; books.castShadow = true; bs.add(books);
    const shelfTable = group(g, -2.55, 0, 1.2); shelfTable.rotation.y = 0.55;
    rb(shelfTable, [1.7, 0.72, 0.62], [0, 0, 0], wood('#a8744a'), null, 0.05);
    const featured = [
      {id: 'aisauce-book', mat: photo('/book/ai-sauce/pages/p01-m.jpg', 0.34 / 0.6, false, '#1d6b3d'), x: -0.5, ry: 0.28, size: [0.34, 0.6]}, // real cover of the field guide
      {id: 'forge-book', mat: artMat('forge-cover'), x: 0, ry: 0, size: [0.4, 0.6]},
      {id: 'walkthrough-book', mat: artMat('walkthrough-cover'), x: 0.5, ry: -0.28, size: [0.4, 0.6]},
    ];
    for (const b of featured) {
      const bk = group(shelfTable, b.x, 0.72, -0.08); bk.rotation.set(-0.18, b.ry, 0);
      rb(bk, [b.size[0] + 0.02, b.size[1] + 0.02, 0.06], [0, 0, 0], M('#f3efe6'), null, 0.01);
      plane(bk, b.size, [0, (b.size[1] + 0.02) / 2, 0.034], b.mat);
      hot(bk, b.id);
    }
    const chair = group(g, -3.0, 0, 2.55); chair.rotation.y = 0.75;
    const mustard = fabric('#d9a441');
    rb(chair, [0.95, 0.42, 0.85], [0, 0.12, 0], mustard, null, 0.12); rb(chair, [0.95, 0.78, 0.22], [0, 0.4, -0.36], mustard, null, 0.1);
    rb(chair, [0.2, 0.58, 0.85], [-0.48, 0.12, 0], mustard, null, 0.08); rb(chair, [0.2, 0.58, 0.85], [0.48, 0.12, 0], mustard, null, 0.08);
    for (const [dx, dz] of [[-0.38, -0.33], [0.38, -0.33], [-0.38, 0.33], [0.38, 0.33]]) cy(chair, [0.03, 0.02, 0.14], [dx, 0, dz], '#5a3d28');
    cy(g, [0.02, 0.02, 1.6], [-3.65, 0, 1.55], '#333333');
    const shade = cy(g, [0.17, 0.28, 0.3], [-3.65, 1.55, 1.55], M('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 1})); shade.castShadow = false;
    lampLight(g, -3.3, 1.6, 1.8, 4, 5);
    cy(g, [0.025, 0.025, 1.7], [-1.95, 0, BW + 0.35], '#333333');
    const ls = cy(g, [0.19, 0.33, 0.4], [-1.95, 1.58, BW + 0.35], M('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 1})); ls.castShadow = false;
    plane(g, [1.3, 0.65], [-1.5, 0.013, 2.9], new THREE.MeshStandardMaterial({map: label('WELCOME HOME', 512, 256, '#8a5a3c', '#f3e3c4', 60), roughness: 1}), [-Math.PI / 2, 0, 0]);
    plant(g, 3.35, 2.4, 1.05);
    lampLight(g, 0.2, 2.6, 0.6, 7, 9);
    if (hd) {
      clock(g, -1.2, 2.45, BW + 0.03);
      rb(g, [1.7, 0.05, 0.26], [2.95, 1.78, BW + 0.14], wood('#8c6242'), null, 0.01);
      vase(g, 2.35, 1.83, BW + 0.14, '#2f5d44'); vase(g, 3.55, 1.83, BW + 0.14, '#f2c14e', 0.2); stack(g, 2.95, 1.83, BW + 0.14, 3);
      stack(g, 1.0, 0.52, 0.02, 3, 0.6);
      const globe = sp(bs, 0.15, [1.2, 2.8, 0.02], M('#4a8fd1', {roughness: 0.4})); cy(bs, [0.05, 0.07, 0.08], [1.2, 2.64, 0.02], brass);
      globe.userData.dynamic = true; out.tickers.push(t => { globe.rotation.y = t * 0.3; });
      vase(bs, -1.2, 2.64, 0.02, '#e37c5b');
    }
  }

  /* ================= KITCHEN (floor 1, right): Ako's dishes + the XIRCLE Scale ================= */
  {
    const g = room('kitchen');
    const counterMat = M('#fbf8f1', {roughness: 0.4}), marble = M('#ffffff', {map: tex.marble, roughness: 0.25});
    rb(g, [5.6, 0.88, 0.7], [-0.8, 0, BW + 0.4], counterMat, null, 0.02);
    rb(g, [5.7, 0.06, 0.78], [-0.8, 0.88, BW + 0.42], marble, null, 0.01);
    for (let k = 0; k < 5; k++) { rb(g, [1.04, 0.62, 0.02], [-3.05 + k * 1.12, 0.14, BW + 0.765], M('#7fae95', {roughness: 0.5}), null, 0.01); cy(g, [0.012, 0.012, 0.2], [-3.05 + k * 1.12, 0.62, BW + 0.79], brass).rotation.z = Math.PI / 2; }
    bx(g, [5.6, 0.7, 0.02], [-0.8, 0.94, BW + 0.035], M('#ffffff', {map: tex.subway, ...nm(tex.subwayN), roughness: 0.2}));
    rb(g, [2.6, 0.7, 0.4], [-2.3, 1.9, BW + 0.22], M('#7fae95', {roughness: 0.5}), null, 0.02);
    rb(g, [2.4, 0.04, 0.3], [0.6, 2.35, BW + 0.17], wood('#8c6242'), null, 0.01);
    for (let k = 0; k < 6; k++) { cy(g, [0.08, 0.08, 0.2], [-0.35 + k * 0.38, 2.39, BW + 0.17], M(['#f2c14e', '#e37c5b', '#9ccf7a'][k % 3], {transparent: true, opacity: 0.85, roughness: 0.15})); cy(g, [0.085, 0.085, 0.04], [-0.35 + k * 0.38, 2.59, BW + 0.17], wood('#8c6242')); }
    [['dish-chicken', 'chicken-egg-bowl'], ['dish-soup', 'mushroom-egg-soup'], ['dish-tofu', 'tofu-tomato-cool']].forEach(([id, slug], k) => {
      const f = group(g, -0.55 + k * 1.05, 1.2, BW + 0.035);
      rb(f, [0.92, 0.66, 0.04], [0, 0, 0], M('#fbf6ec'), null, 0.01);
      plane(f, [0.84, 0.56], [0, 0.33, 0.03], photo(`/ako/kitchen/art/${slug}-v1-mobile.webp`, 0.84 / 0.56, false, '#e8c9a0'));
      hot(f, id);
    });
    rb(g, [1.1, 2.2, 0.8], [2.9, 0, BW + 0.5], M('#dfe5e2', {metalness: 0.45, roughness: 0.3}), null, 0.05);
    cy(g, [0.02, 0.02, 0.6], [2.42, 1.1, BW + 0.92], M('#bbbbbb', {metalness: 0.9, roughness: 0.2}));
    // the stove: a pot of Homechew sauce simmering (→ /homechew/)
    const stove = group(g, -2.4, 0.945, BW + 0.45);
    bx(stove, [0.9, 0.03, 0.6], [0, 0, 0], '#1f2320'); // hob, 5 mm above the marble top (was coplanar: flickered)
    for (const dx of [-0.2, 0.2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 28), M('#ff7a3d', {emissive: '#ff5a1f', emissiveIntensity: 1.4})); r.rotation.x = Math.PI / 2; r.position.set(dx, 0.045, 0); stove.add(r); }
    const potMat = M('#c9ced1', {metalness: 0.85, roughness: 0.22, side: THREE.DoubleSide});
    const pot = place(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.24, hd ? 40 : 24, 1, true), potMat), stove, -0.2, 0.15, 0); // open pot: you can see the sauce
    cy(stove, [0.18, 0.18, 0.012], [-0.2, 0.03, 0], potMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, hd ? 40 : 24), potMat); rim.rotation.x = Math.PI / 2; place(rim, stove, -0.2, 0.27, 0);
    for (const s_ of [-1, 1]) rb(stove, [0.1, 0.025, 0.035], [-0.2 + s_ * 0.25, 0.22, 0], M('#2b2f31', {roughness: 0.5}), null, 0.01); // handles
    const sauce = cy(stove, [0.19, 0.19, 0.02], [-0.2, 0.2, 0], M('#b8411f', {roughness: 0.18, emissive: '#6b1a08', emissiveIntensity: 0.35})); // surface 5 cm under the rim
    const bubbles = [];
    for (let k = 0; k < (hd ? 9 : 6); k++) { const b = sp(stove, 0.022 + (k % 3) * 0.008, [-0.2 + Math.cos(k * 2.3) * 0.11 * ((k % 2) + 0.4), 0.222, Math.sin(k * 2.3) * 0.1], M('#d4552a', {roughness: 0.1})); b.castShadow = false; b.userData.dynamic = true; bubbles.push(b); }
    out.tickers.push(t => bubbles.forEach((b, k) => { const ph = (t * (0.7 + k * 0.09) + k * 0.37) % 1; b.scale.setScalar(ph < 0.85 ? ph / 0.85 : 0.001); b.position.y = 0.214 + ph * 0.012; }));
    const spoon = group(stove, -0.12, 0.2, 0.02); spoon.rotation.set(0.25, 0, -0.55); // wooden spoon resting in the pot
    rb(spoon, [0.022, 0.42, 0.012], [0, 0, 0], wood('#c08a55'), null, 0.005);
    sp(spoon, 0.04, [0, 0, 0], wood('#c08a55')).scale.set(1, 1.3, 0.35);
    // a finished jar beside the pot
    const jar = group(stove, 0.24, 0.03, 0.06);
    cy(jar, [0.07, 0.07, 0.17], [0, 0, 0], M('#c2411c', {roughness: 0.12}));
    cy(jar, [0.072, 0.072, 0.035], [0, 0.17, 0], M('#1d6b3d', {roughness: 0.4}));
    const jarLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.0715, 0.0715, 0.08, 32, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({map: label('homechew', 256, 96, '#fbf6ec', '#1d6b3d', 40), roughness: 0.6}));
    jarLabel.position.set(0, 0.085, 0); jar.add(jarLabel);
    hot(stove, 'homechew');
    for (let k = 0; k < 7; k++) { const s_ = new THREE.Mesh(geo('sph', [0.08]), new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false})); s_.userData = {phase: k / 7, base: new THREE.Vector3(-2.6, 1.2, BW + 0.45)}; g.add(s_); out.steam.push(s_); }
    for (let k = 0; k < 3; k++) { cy(g, [0.12, 0.1, 0.2], [0.6 + k * 0.35, 0.91, BW + 0.35], '#c56b4a'); for (let j = 0; j < 4; j++) blob(g, 0.08, [0.6 + k * 0.35 + (j % 2 - 0.5) * 0.08, 1.2 + j * 0.05, BW + 0.35 + (j > 1 ? 0.05 : -0.05)], ['#4f9a5c', '#62b06c', '#3f8a50'][k], 1); }
    rb(g, [2.8, 0.88, 1.15], [0, 0, 0.4], wood('#b98352'), null, 0.04);
    rb(g, [3.0, 0.06, 1.3], [0, 0.88, 0.4], marble, null, 0.015);
    for (const dx of [-0.9, 0, 0.9]) { cy(g, [0.21, 0.21, 0.06], [dx, 0.66, 1.4], fabric('#2f5d44')); cy(g, [0.025, 0.025, 0.66], [dx, 0, 1.4], M('#333333', {metalness: 0.6})); }
    const bowl = group(g, -0.55, 0.94, 0.4);
    place(new THREE.Mesh(new THREE.SphereGeometry(0.42, hd ? 48 : 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#ffffff', {roughness: 0.2, side: THREE.DoubleSide})), bowl, 0, 0.42, 0);
    for (let k = 0; k < (hd ? 26 : 14); k++) { const a = k * 2.4, r = 0.06 + (k % 5) * 0.06; blob(bowl, 0.1 + (k % 3) * 0.02, [Math.cos(a) * r, 0.4 + (k % 3) * 0.03, Math.sin(a) * r], ['#5fb25a', '#8fd16a', '#3f8a50', '#b5d96a'][k % 4], 1); }
    for (let k = 0; k < 6; k++) { const a = k * 1.1; sp(bowl, 0.055, [Math.cos(a) * 0.2, 0.49, Math.sin(a) * 0.2], M('#e2412f', {roughness: 0.25})); }
    hot(bowl, 'ako-kitchen');
    const rbk = group(g, 0.35, 0.94, 0.25); rbk.rotation.set(-0.5, -0.2, 0);
    rb(rbk, [0.5, 0.36, 0.03], [0, 0, 0], M('#e37c5b'), null, 0.01);
    plane(rbk, [0.46, 0.32], [0, 0.18, 0.02], new THREE.MeshStandardMaterial({map: label('ครัวเอโกะ', 512, 360, '#fbf6ec', '#b8573c', 88)}));
    hot(rbk, 'ako');
    rb(g, [0.6, 0.04, 0.34], [1.0, 0.94, 0.7], wood('#c79a63'), null, 0.02);
    sp(g, 0.1, [1.0, 1.04, 0.7], M('#d99a4e', {roughness: 0.7})).scale.set(2.6, 0.8, 0.9);
    cy(g, [0.26, 0.16, 0.1], [1.0, 0.94, 0.1], M('#2f5d44', {roughness: 0.4}));
    [['#f3a53a', 0.09], ['#e2412f', 0.085], ['#b7dd5a', 0.075], ['#f3a53a', 0.08]].forEach(([c, r], k) => sp(g, r, [1.0 + Math.cos(k * 1.6) * 0.1, 1.1 + (k === 3 ? 0.08 : 0), 0.1 + Math.sin(k * 1.6) * 0.1], M(c, {roughness: 0.4})));
    for (const dx of [-0.75, 0.75]) {
      cy(g, [0.008, 0.008, 1.2], [dx, H - 1.2, 0.4], '#333333');
      const s = cy(g, [0.12, 0.32, 0.32], [dx, H - 1.52, 0.4], M('#2f5d44', {emissive: '#ffcf7a', emissiveIntensity: 0.25, roughness: 0.4})); s.castShadow = false;
    }
    // XIRCLE Scale by the fridge (→ /xircle/): glass top, a small readout, the logo
    const scale = group(g, 2.35, 0, 1.75); scale.rotation.y = -0.35;
    rb(scale, [0.42, 0.05, 0.42], [0, 0, 0], M('#1b2226', {roughness: 0.2, metalness: 0.3}), null, 0.04);
    rb(scale, [0.4, 0.012, 0.4], [0, 0.05, 0], M('#e9eff1', {roughness: 0.05, metalness: 0.1}), null, 0.02);
    plane(scale, [0.26, 0.1], [0, 0.064, 0.1], canvasMat(256, 100, c => { c.fillStyle = '#0d1418'; c.fillRect(0, 0, 256, 100); c.fillStyle = '#7fe0a8'; c.font = `700 44px ${FONT}`; centeredText(c, 'XIRCLE', 128, 62, 224); c.fillStyle = 'rgba(127,224,168,.6)'; c.fillRect(40, 78, 176, 4); }, 0.9), [-Math.PI / 2, 0, 0]);
    hot(scale, 'xircle');
    lampLight(g, 0, 1.9, 0.4, 7, 7);
    if (hd) {
      cy(g, [0.012, 0.012, 1.6], [-1.6, 1.45, BW + 0.1], brass).rotation.z = Math.PI / 2;
      for (let k = 0; k < 5; k++) { const x = -2.2 + k * 0.3; cy(g, [0.008, 0.008, 0.32], [x, 1.13, BW + 0.12], M('#bbbbbb', {metalness: 0.9, roughness: 0.2})); sp(g, 0.05, [x, 1.1, BW + 0.14], M('#bbbbbb', {metalness: 0.9, roughness: 0.2})).scale.set(1, 0.4, 1); }
      for (let k = 0; k < 6; k++) cy(g, [0.05, 0.05, 0.015], [-0.35 + k * 0.07, 0.96, 0.92], M(k % 2 ? '#e2412f' : '#9ccf7a', {roughness: 0.4})).rotation.z = Math.PI / 2.3;
      rb(g, [0.3, 0.45, 0.02], [0.7, 0.35, BW + 0.785], fabric('#e37c5b'), null, 0.01);
    }
  }

  /* ================= STAIR HALL (right of the kitchen): floating stairs up to the classroom ================= */
  {
    area = 'stairs';
    const cx = (STAIR.x0 + STAIR.x1) / 2, w = STAIR.x1 - STAIR.x0, g = group(root, 0, 0, 0);
    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, D), floorMat.wood); hallFloor.position.set(cx, -0.06, 0); hallFloor.receiveShadow = true; g.add(hallFloor);
    const hallWall = M('#f1e6d6', {map: tex.plaster, ...nm(tex.plasterN)});
    bx(g, [w, F2 + H, 0.24], [cx, 0, -D / 2 - 0.12], hallWall).castShadow = false; // back
    bx(g, [0.24, F2 + H, 2 * ZW], [STAIR.x1 - 0.12, 0, 0], white); // outer side wall, both floors
    plane(g, [0.24, 0.24], [STAIR.x1 - 0.245, 0.3, 3.0], M('#ffffff'), [0, -Math.PI / 2, 0]); // light switch plate
    // landing at floor 2, in front of the classroom door
    bx(g, [w, 0.3, 1.5], [cx, F2 - 0.3, -D / 2 + 0.75], floorMat.wood);
    // 16 floating oak treads + the landing make 17 risers of 20 cm along the outer wall
    const SX0 = 9.85, SX1 = STAIR.x1 - 0.24, zTop = -D / 2 + 1.5, zBot = 2.95, n = 16, run = (zBot - zTop) / n, rise = F2 / 17;
    const oak = wood('#c08a55');
    for (let i = 0; i < n; i++) rb(g, [SX1 - SX0, 0.06, run + 0.02], [(SX0 + SX1) / 2, (i + 1) * rise - 0.06, zBot - (i + 0.5) * run], oak, null, 0.012);
    const L = Math.hypot(zBot - zTop, F2), slope = Math.atan2(F2, zBot - zTop);
    const along = (m, y) => { m.rotation.x = slope; m.position.set(m.position.x, y, (zBot + zTop) / 2); return m; };
    along(bx(g, [0.06, 0.28, L], [SX0 - 0.03, 0, 0], M('#2b2f31', {metalness: 0.4, roughness: 0.4})), F2 / 2 - 0.1); // stringer
    along(bx(g, [0.02, 0.85, L - 0.3], [SX0 - 0.03, 0, 0], railGlass), F2 / 2 + 0.45); // glass balustrade
    const rail = along(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L, 12), M('#8c6242', {roughness: 0.4})), F2 / 2 + 0.92);
    rail.rotation.x = slope + Math.PI / 2; rail.position.x = SX0 - 0.03; rail.castShadow = true; g.add(rail);
    // fairy lights along the handrail: warm dots that make the climb feel like an invitation
    const bulbMat = M('#fff1cf', {emissive: '#ffcf7a', emissiveIntensity: 1.6});
    for (let k = 1; k < 18; k++) { const f = k / 18; const b = sp(g, 0.022, [SX0 - 0.03, f * F2 + 0.85 + Math.sin(k * 1.7) * 0.04, zBot - f * (zBot - zTop)], bulbMat); b.castShadow = false; }
    bx(g, [SX0 - STAIR.x0, 0.9, 0.02], [(STAIR.x0 + SX0) / 2, F2, zTop], railGlass); // landing edge over the hall
    bx(g, [SX0 - STAIR.x0, 0.04, 0.05], [(STAIR.x0 + SX0) / 2, F2 + 0.9, zTop], frameMat);
    // gallery on the outer wall, climbing with the stairs
    [['/img/resume-life-boardgame.webp', 4 / 3], ['/ako/kitchen/art/chicken-egg-bowl-v1-mobile.webp', 4 / 3], ['/img/party-teem.webp', 1]].forEach(([url, a], k) => {
      const f = group(g, SX1 - 0.02, 1.55 + k * 1.05, 1.9 - k * 1.55); f.rotation.y = -Math.PI / 2;
      const fw = a >= 1 ? 0.62 : 0.5, fh = fw / a;
      rb(f, [fw + 0.08, fh + 0.08, 0.04], [0, 0, 0], M('#f3efe6'), null, 0.01);
      plane(f, [fw, fh], [0, (fh + 0.08) / 2, 0.025], photo(url, fw / fh));
    });
    // bottom of the stairs: shoe bench, plant, a round mirror; a pendant drops down the stairwell
    rb(g, [0.9, 0.42, 0.36], [STAIR.x0 + 0.62, 0, -1.2], wood('#8c6242'), [0, Math.PI / 2, 0], 0.03);
    for (let k = 0; k < 3; k++) rb(g, [0.12, 0.08, 0.26], [STAIR.x0 + 0.45 + (k % 2) * 0.16, 0.42, -1.5 + k * 0.28], ['#e37c5b', '#1d6b3d', '#f2c14e'][k], [0, 0.2 * k, 0], 0.03);
    plant(g, STAIR.x0 + 0.55, 0.4, 1.1);
    const mir = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 48), M('#dfe8ea', {metalness: 0.95, roughness: 0.06})); mir.rotation.x = Math.PI / 2; place(mir, g, cx - 0.5, 1.6, -D / 2 + 0.02);
    cy(g, [0.006, 0.006, 2.4], [cx - 0.3, F2 + H - 2.4, 0.2], '#333333');
    const pend = cy(g, [0.12, 0.26, 0.34], [cx - 0.3, F2 + H - 2.74, 0.2], M('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 1.1})); pend.castShadow = false;
    lampLight(g, cx - 0.3, F2 + H - 3.0, 0.4, 6, 9);
  }

  /* ================= CLASSROOM (floor 2, right): course announcement + four lesson computers ================= */
  {
    const g = room('classroom');
    const flagCols = ['#e37c5b', '#f2c14e', '#2e9e5b', '#4a8fd1'];
    for (let k = 0; k < 16; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 3), M(flagCols[k % 4], {side: THREE.DoubleSide, roughness: 0.8})); f.rotation.x = Math.PI; f.position.set(-3.7 + k * 0.49, 2.9 - Math.sin(k / 15 * Math.PI) * 0.25, BW + 0.25); g.add(f); }
    // the whiteboard opens the free classroom; each laptop opens one lesson, the fourth one is playing the Dungeon
    const wb = group(g, -1.1, 1.0, BW + 0.05);
    rb(wb, [3.4, 1.6, 0.06], [0, 0, 0], M('#9aa3a8', {metalness: 0.5, roughness: 0.35}), null, 0.02);
    plane(wb, [3.28, 1.48], [0, 0.8, 0.04], canvasMat(1024, 420, (c, w) => {
      c.fillStyle = '#fdfefe'; c.fillRect(0, 0, w, 420);
      c.fillStyle = '#1d6b3d'; c.font = `800 92px ${FONT}`; c.fillText('AI ใส่ซอส', 60, 130);
      c.fillStyle = '#4a8fd1'; c.font = `600 44px ${FONT}`; c.fillText('คุย → สร้าง → ใช้ Source → ต่อยอด', 60, 215);
      c.strokeStyle = '#e37c5b'; c.lineWidth = 6; c.beginPath(); c.moveTo(60, 250); c.bezierCurveTo(300, 300, 520, 230, 760, 270); c.stroke();
      c.fillStyle = '#44584b'; c.font = `500 36px ${FONT}`; c.fillText('บทเรียนฟรี · ไม่ต้องสมัคร', 60, 350);
    }));
    rb(wb, [3.2, 0.05, 0.14], [0, -0.03, 0.08], M('#9aa3a8'));
    hot(wb, 'classroom');
    const LESSONS = [
      {id: 'lesson-1', img: '/img/classroom-kitchen-20260812-1445/lv1-source.webp', tag: 'บท 1 · SOURCE', col: '#2e9e5b'},
      {id: 'lesson-4', img: '/img/classroom-kitchen-20260812-1445/lv4-split.webp', tag: 'บท 4 · SPLIT', col: '#4a8fd1'},
      {id: 'lesson-5', img: '/img/classroom-kitchen-20260812-1445/lv5-season.webp', tag: 'บท 5 · SEASON', col: '#e9b949'},
      {id: 'dungeon', img: artUrl('dungeon-screen'), tag: 'THE DUNGEON', col: '#6ee7a8', game: true},
    ];
    [[-2.3, -0.8], [0.2, -0.8], [-2.3, 1.3], [0.2, 1.3]].forEach(([dx, dz], k) => {
      const L = LESSONS[k];
      rb(g, [1.35, 0.05, 0.72], [dx, 0.72, dz], wood('#e0c9a0'), null, 0.02);
      for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cy(g, [0.022, 0.022, 0.72], [dx + lx, 0, dz + lz], M('#6b7075', {metalness: 0.6}));
      const lap = group(g, dx, 0.77, dz + 0.05);
      const shell = M(L.game ? '#1f2a24' : '#c9ced1', {metalness: 0.6, roughness: 0.3});
      rb(lap, [0.66, 0.022, 0.44], [0, 0, 0], shell, null, 0.012);
      plane(lap, [0.56, 0.2], [0, 0.024, 0.06], M(L.game ? '#10201a' : '#2b2f31', {roughness: 0.6}), [-Math.PI / 2, 0, 0]); // keyboard deck
      const lid = group(lap, 0, 0.022, -0.21); lid.rotation.x = -0.28;
      rb(lid, [0.66, 0.43, 0.02], [0, 0, 0], shell, null, 0.01);
      plane(lid, [0.6, L.game ? 0.375 : 0.3375], [0, 0.235, 0.012], photo(L.img, L.game ? 16 / 10 : 16 / 9, true, '#223'));
      plane(lid, [0.6, 0.05], [0, 0.035, 0.013], new THREE.MeshStandardMaterial({map: label(L.tag, 512, 44, L.col, '#10201a', 30), emissive: '#ffffff', emissiveIntensity: 0.25})).castShadow = false;
      if (L.game) { // gamepad and a green glow: someone is mid-run in the Dungeon
        const pad = group(g, dx + 0.48, 0.77, dz + 0.22); pad.rotation.y = -0.4;
        rb(pad, [0.2, 0.035, 0.11], [0, 0, 0], M('#2b2f31', {roughness: 0.4}), null, 0.03);
        for (const [bx_, c] of [[0.05, '#e2412f'], [0.075, '#6ee7a8']]) cy(pad, [0.011, 0.011, 0.012], [bx_, 0.035, -0.01], c);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({color: '#6ee7a8', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending}));
        glow.rotation.x = -Math.PI / 2; glow.position.set(dx, 0.776, dz); g.add(glow); // screen light spilling on the desk (no extra lamp: cheaper in HD)
      }
      hot(lap, L.id);
      const col = L.col;
      rb(g, [0.44, 0.06, 0.42], [dx, 0.44, dz + 0.65], fabric(col), null, 0.03); cy(g, [0.025, 0.025, 0.44], [dx, 0, dz + 0.65], M('#6b7075'));
      rb(g, [0.44, 0.42, 0.05], [dx, 0.5, dz + 0.86], fabric(col), null, 0.03);
    });
    // course announcement easel → /courses/
    const ad = group(g, 2.6, 0, -2.2); ad.rotation.y = -0.4;
    for (const dx of [-0.45, 0.45]) cy(ad, [0.03, 0.03, 2.0], [dx, 0, 0.1], wood('#8c6242')).rotation.x = -0.12;
    cy(ad, [0.03, 0.03, 1.9], [0, 0, -0.35], wood('#8c6242')).rotation.x = 0.25;
    const board = group(ad, 0, 1.0, 0.18); board.rotation.x = -0.12;
    rb(board, [1.1, 1.5, 0.04], [0, 0, 0], M('#ffffff'), null, 0.01);
    plane(board, [1.0, 1.4], [0, 0.75, 0.03], canvasMat(600, 840, c => {
      c.fillStyle = '#fbf6ec'; c.fillRect(0, 0, 600, 840);
      c.fillStyle = '#e37c5b'; c.fillRect(0, 0, 600, 110);
      c.fillStyle = '#ffffff'; c.font = `800 62px ${FONT}`; centeredText(c, 'ประกาศ!', 300, 78, 540);
      c.fillStyle = '#14281d'; c.font = `800 60px ${FONT}`; centeredText(c, 'คอร์สเรียน', 300, 560, 540); centeredText(c, 'กับครูทีม', 300, 630, 540);
      c.fillStyle = '#1d6b3d'; c.font = `600 34px ${FONT}`; centeredText(c, 'เริ่มจาก AI ใส่ซอส', 300, 690, 540);
      c.fillStyle = '#2e9e5b'; c.beginPath(); c.roundRect(150, 730, 300, 70, 35); c.fill(); c.fillStyle = '#fff'; c.font = `700 34px ${FONT}`; centeredText(c, 'ดูรอบเรียน →', 300, 776, 264);
    }));
    plane(board, [0.86, 0.574], [0, 0.96, 0.036], artMat('course-poster'));
    hot(ad, 'courses');
    rb(g, [1.4, 0.78, 0.62], [2.7, 0, 0.9], wood('#b98352'), null, 0.03);
    cy(g, [0.13, 0.08, 0.07], [2.4, 0.78, 0.85], M('#ffffff', {roughness: 0.2}));
    cy(g, [0.115, 0.115, 0.012], [2.4, 0.846, 0.85], M('#6b3a1f', {roughness: 0.15})); // coffee surface 8 mm above the rim: the two used to share a plane and flickered
    const orb = group(g, 3.0, 1.55, 0.9);
    orb.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({color: '#7fd1a4', wireframe: true, emissive: '#2e9e5b', emissiveIntensity: 1.2})));
    orb.add(new THREE.Mesh(geo('sph', [0.15]), new THREE.MeshStandardMaterial({color: '#e8fff1', emissive: '#7fe0a8', emissiveIntensity: 2})));
    out.tickers.push(t => { orb.rotation.y = t * 0.8; orb.rotation.x = t * 0.3; orb.position.y = 1.55 + Math.sin(t * 1.6) * 0.07; });
    plant(g, 3.35, 2.9, 0.9);
    lampLight(g, 0, 2.7, 0.6, 7, 9);
    if (hd) {
      clock(g, -3.3, 2.3, BW + 0.03);
      plane(g, [1.1, 0.7], [1.45, 1.6, BW + 0.02], canvasMat(320, 200, c => { c.fillStyle = '#d6ecf5'; c.fillRect(0, 0, 320, 200); c.fillStyle = '#7fbf8e'; [[60, 70, 50, 35], [150, 60, 40, 50], [230, 80, 55, 40], [120, 140, 35, 25]].forEach(([x, y, a, b]) => { c.beginPath(); c.ellipse(x, y, a, b, 0.3, 0, 7); c.fill(); }); c.fillStyle = '#1d6b3d'; c.font = `700 22px ${FONT}`; c.fillText('โลกใบนี้ของเรา', 14, 190); }));
      for (const [dx, dz] of [[-2.3, -0.8], [0.2, -0.8], [-2.3, 1.3], [0.2, 1.3]]) { cy(g, [0.04, 0.035, 0.1], [dx + 0.5, 0.77, dz - 0.2], M('#f2c14e')); for (let k = 0; k < 3; k++) cy(g, [0.006, 0.006, 0.16], [dx + 0.5 + (k - 1) * 0.015, 0.8, dz - 0.2], ['#e37c5b', '#4a8fd1', '#2e9e5b'][k]); }
    }
  }

  /* ================= PROJECT ROOM (floor 2, left): X-VISOR + Resume screens, TeamBook, the house model ================= */
  {
    const g = room('office');
    const skyMat = canvasMat(512, 320, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd3f0'); gr.addColorStop(1, '#fbe3b4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(40,70,60,.35)'; for (let x = 0; x < w; x += 38) { const bh = 60 + (x * 37 % 110); c.fillRect(x, h - bh, 32, bh); } }, 0.7);
    plane(g, [1.6, 1.3], [3.0, 2.0, BW + 0.02], skyMat);
    rb(g, [1.76, 0.07, 0.18], [3.0, 1.3, BW + 0.09], '#ffffff', null, 0.01);
    rb(g, [6.2, 0.07, 0.95], [-0.8, 0.75, BW + 0.65], wood('#a8744a'), null, 0.02);
    for (const dx of [-3.7, -0.8, 2.1]) rb(g, [0.07, 0.75, 0.85], [dx, 0, BW + 0.65], M('#2f3a35', {metalness: 0.4}), null, 0.01);
    const screens = [
      {id: 'xvisor', mat: artMat('screen-xvisor', true, '#223'), tag: 'X-VISOR QUEST', col: '#e9b949', x: -2.55, ry: 0.12},
      {id: 'resume', mat: artMat('screen-resume', true, '#223'), tag: 'RESUME · ทีม', col: '#e37c5b', x: 0.95, ry: -0.12},
    ];
    for (const s_ of screens) {
      const mon = group(g, s_.x, 0.82, BW + 0.45); mon.rotation.y = s_.ry;
      rb(mon, [1.6, 0.96, 0.05], [0, 0.26, 0], M('#1b1f1d', {roughness: 0.4}), null, 0.02);
      plane(mon, [1.52, 0.855], [0, 0.74, 0.032], s_.mat);
      plane(mon, [0.8, 0.13], [0, 0.2, 0.034], new THREE.MeshStandardMaterial({map: label(s_.tag, 512, 84, s_.col, '#10201a', 48)})).castShadow = false;
      cy(mon, [0.03, 0.03, 0.26], [0, 0, 0], M('#1b1f1d')); rb(mon, [0.34, 0.02, 0.2], [0, 0, 0.02], M('#1b1f1d'), null, 0.005);
      hot(mon, s_.id);
    }
    rb(g, [0.9, 0.03, 0.28], [-2.55, 0.82, BW + 1.0], M('#e9ecef', {roughness: 0.4}), null, 0.01);
    rb(g, [0.12, 0.03, 0.18], [-1.9, 0.82, BW + 1.0], M('#e9ecef'), null, 0.01);
    // TeamBook: the green notebook, open on a stand between the screens (→ /teambook/)
    const nb = group(g, -0.8, 0.82, BW + 0.6); nb.rotation.x = -0.9;
    rb(nb, [0.9, 0.62, 0.035], [0, 0, 0], M('#2e9e5b', {roughness: 0.6}), null, 0.012);
    rb(nb, [0.86, 0.58, 0.012], [0, 0.02, 0.03], M('#fbf6ec', {roughness: 0.8}), null, 0.004);
    plane(nb, [0.77, 0.56], [0, 0.31, 0.043], art.has('teambook-cover') ? artMat('teambook-cover') : canvasMat(440, 320, c => { c.fillStyle = '#fbf6ec'; c.fillRect(0, 0, 440, 320); c.fillStyle = 'rgba(29,107,61,.12)'; for (let y = 60; y < 320; y += 28) c.fillRect(20, y, 400, 2); c.fillStyle = '#1d6b3d'; c.font = `800 44px ${FONT}`; c.fillText('TeamBook', 24, 50); }));
    cy(nb, [0.012, 0.012, 0.58], [0, 0.02, 0.05], '#e9b949');
    hot(nb, 'teambook');
    // centre table: the model of our real house turns slowly (→ /showcase/house/)
    const table = group(g, 0.2, 0, 1.05);
    cy(table, [0.12, 0.2, 0.74], [0, 0, 0], M('#2b2f31', {metalness: 0.4, roughness: 0.4}));
    cy(table, [0.82, 0.82, 0.05], [0, 0.74, 0], wood('#c08a55'));
    plane(table, [0.6, 0.12], [0, 0.793, 0.66], new THREE.MeshStandardMaterial({map: label('บ้านจริงของเรา · 3D', 512, 100, '#14281d', '#f2c14e', 44)}), [-Math.PI / 2, 0, 0]);
    const model = group(table, 0, 0.79, -0.05);
    const turn = group(model); out.tickers.push(t => { turn.rotation.y = t * 0.25; });
    cy(turn, [0.6, 0.62, 0.04], [0, 0, 0], M('#f3efe6', {roughness: 0.5}));
    cy(turn, [0.56, 0.56, 0.012], [0, 0.04, 0], M('#5fae6a', {roughness: 0.9})); // lawn
    const mh = group(turn, 0.06, 0.052, 0), walls = M('#f4f2ec', {roughness: 0.6}), glassD = M('#2d3a44', {roughness: 0.1, metalness: 0.5});
    rb(mh, [0.66, 0.24, 0.36], [0, 0, 0], walls, null, 0.01); rb(mh, [0.66, 0.24, 0.36], [0, 0.25, 0], walls, null, 0.01);
    for (const [x, y, w_] of [[-0.15, 0.04, 0.2], [0.18, 0.05, 0.22], [-0.12, 0.3, 0.3], [0.2, 0.32, 0.14]]) bx(mh, [w_, 0.14, 0.012], [x, y, 0.18], glassD);
    bx(mh, [0.3, 0.012, 0.1], [-0.12, 0.25, 0.23], walls); // balcony
    for (const x of [-0.17, 0.17]) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.16, 4), tile); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.75); place(r, mh, x, 0.57, 0); }
    for (let k = 0; k < 3; k++) bx(mh, [0.07, 0.01, 0.06], [0.1 + k * 0.08, 0.6, 0.07], solar, [0.5, 0, 0]);
    bx(mh, [0.24, 0.012, 0.38], [-0.46, 0.24, 0], walls); for (const z of [-0.15, 0.15]) cy(mh, [0.01, 0.01, 0.24], [-0.56, 0, z], walls); // carport
    rb(mh, [0.12, 0.07, 0.22], [-0.46, 0, 0.02], M('#f2f2f0', {roughness: 0.3, metalness: 0.4}), null, 0.02); // the family car
    for (let k = 0; k < 5; k++) blob(turn, 0.06 + (k % 2) * 0.02, [Math.cos(k * 1.3 + 2) * 0.45, 0.1, Math.sin(k * 1.3 + 2) * 0.45], '#4f9a5c', 1);
    hot(model, 'house3d'); // the model itself, not the whole table: its tap area must not cover the TeamBook
    const mug = cy(g, [0.06, 0.05, 0.12], [-3.3, 0.82, BW + 0.95], '#e9b949');
    mug.userData.dynamic = true; out.tickers.push(t => { mug.rotation.y = t; });
    const chair = group(g, -2.55, 0, -1.8); chair.rotation.y = 0.2;
    cy(chair, [0.3, 0.3, 0.1], [0, 0.44, 0], fabric('#2f5d44')); rb(chair, [0.58, 0.8, 0.1], [0, 0.55, 0.3], fabric('#2f5d44'), [0.12, 0, 0], 0.05);
    cy(chair, [0.035, 0.035, 0.44], [0, 0, 0], M('#555555', {metalness: 0.7}));
    for (let k = 0; k < 5; k++) rb(chair, [0.34, 0.04, 0.05], [Math.cos(k * 1.256) * 0.17, 0.04, Math.sin(k * 1.256) * 0.17], M('#333333'), [0, -k * 1.256, 0], 0.01);
    rb(g, [1.5, 0.9, 0.04], [0.3, 2.05, BW + 0.03], M('#ffffff', {map: tex.cork, ...nm(tex.corkN)}), null, 0.01);
    const noteCols = ['#fff27a', '#ffc2d1', '#bdf0c9', '#b9dcff', '#ffd9a0', '#e3c9ff'];
    for (let k = 0; k < 6; k++) plane(g, [0.3, 0.26], [-0.15 + (k % 3) * 0.45, 2.72 - Math.floor(k / 3) * 0.38, BW + 0.06], M(noteCols[k]).clone(), [0, 0, (k % 2 ? 1 : -1) * 0.06]);
    rb(g, [0.6, 1.5, 0.6], [-3.55, 0, -1.2], M('#23282a', {roughness: 0.4, metalness: 0.4}), null, 0.02);
    const leds = [];
    for (let k = 0; k < 8; k++) leds.push(bx(g, [0.05, 0.03, 0.01], [-3.55 - 0.18 + (k % 2) * 0.1, 0.25 + Math.floor(k / 2) * 0.3, -0.895], new THREE.MeshStandardMaterial({color: '#7fe0a8', emissive: '#7fe0a8', emissiveIntensity: 1})));
    out.tickers.push(t => { leds.forEach((l, k) => { l.material.emissiveIntensity = (Math.sin(t * (3 + k) + k) > 0) ? 1.6 : 0.2; }); });
    rb(g, [1.3, 0.05, 0.3], [3.0, 1.1, BW + 0.15], wood('#6b4a30'), null, 0.01);
    cy(g, [0.08, 0.12, 0.25], [2.6, 1.15, BW + 0.15], M('#e9b949', {metalness: 0.9, roughness: 0.2}));
    plant(g, 3.3, 2.5, 1.05); plant(g, -3.3, 2.7, 0.8, '#2f5d44');
    lampLight(g, -0.8, 2.4, -1.5, 7, 8);
    if (hd) {
      cy(g, [0.1, 0.12, 0.03], [2.0, 0.82, BW + 0.55], M('#1b1f1d'));
      cy(g, [0.015, 0.015, 0.5], [2.0, 0.84, BW + 0.55], M('#1b1f1d')).rotation.z = 0.3;
      const dl = cy(g, [0.05, 0.12, 0.14], [1.82, 1.22, BW + 0.55], M('#f2c14e', {emissive: '#ffcf7a', emissiveIntensity: 0.9})); dl.castShadow = false;
      lampLight(g, 1.82, 1.1, BW + 0.75, 2.5, 3);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) bx(g, [0.055, 0.015, 0.05], [-2.55 - 0.36 + k * 0.066, 0.855, BW + 0.91 + r * 0.06], M('#fbfbfb', {roughness: 0.5}));
      place(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 10, 32, Math.PI), M('#1b1f1d', {roughness: 0.4})), g, 0.6, 0.95, BW + 0.9);
      for (const x of [0.48, 0.72]) cy(g, [0.05, 0.05, 0.04], [x, 0.84, BW + 0.9], M('#1b1f1d')).rotation.z = Math.PI / 2;
    }
  }

  /* ---------- hero clover (→ /meet/) ---------- */
  const heroMat = out.heroMat = new THREE.MeshPhysicalMaterial({color: '#35b46a', roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#0d5a2f', emissiveIntensity: 0.35, sheen: 0.5, sheenColor: new THREE.Color('#b8ffd1')});
  const hc = out.heroClover = clover(heroMat); hc.scale.setScalar(2.1); hc.position.set(...HERO_CLOVER.wide); root.add(hc);
  hot(hc, 'meet');
  const halo = out.halo = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.72, 64), new THREE.MeshBasicMaterial({color: '#fff3b0', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false}));
  halo.position.copy(hc.position); root.add(halo);
  const cl = out.cloverLight = new THREE.PointLight('#9dffc3', 0, 14, 1.5); cl.position.set(HERO_CLOVER.wide[0], HERO_CLOVER.wide[1], 2.5); root.add(cl);

  /* ---------- hidden clovers (room-local spots → world) ---------- */
  const SPOTS = {living: [2.95, 1.32, BW + 0.3], kitchen: [1.8, 1.12, BW + 0.4], classroom: [0.95, 2.72, BW + 0.25], office: [3.4, 1.42, BW + 0.15]};
  for (const id of CLOVER_ROOMS) {
    const [cx, fy] = ROOMS[id], at = new THREE.Vector3(SPOTS[id][0] + cx, SPOTS[id][1] + fy, SPOTS[id][2]);
    const m = new THREE.MeshStandardMaterial({color: '#39b86b', roughness: 0.3, emissive: '#1d8a48', emissiveIntensity: 0.5});
    const c = clover(m); c.scale.setScalar(0.17); c.position.copy(at);
    c.add(new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 8), new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}))); // finger-sized hit area
    c.traverse(o => { o.userData.collect = id; });
    c.userData = {id, collect: id, base: at.clone(), hint: 0, gone: 0};
    c.visible = !found.has(id); root.add(c); out.collectibles.set(id, c);
  }

  /* ---------- hint beacons above every interactive object ---------- */
  const beaconTex = tex.canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,180,.9)'); g.addColorStop(0.5, 'rgba(255,220,120,.25)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 40, 0, 7); c.stroke();
  });
  const box3 = new THREE.Box3(), v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const hitMat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false});
  for (const h of out.hotspots) {
    h.invParent = h.root.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); // "toward the camera" in the parent's frame
    if (h.id === 'meet') continue;
    box3.setFromObject(h.root); box3.getCenter(v);
    // invisible, slightly larger tap area: flat things (a notebook, a map, cards) are tiny on a phone
    const size = box3.getSize(new THREE.Vector3()), hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.x, 0.2) + 0.12, Math.max(size.y, 0.14) + 0.12, Math.max(size.z, 0.2) + 0.12), hitMat);
    hit.position.copy(h.root.worldToLocal(v.clone())); hit.quaternion.copy(h.root.getWorldQuaternion(new THREE.Quaternion()).invert());
    hit.scale.divide(h.root.getWorldScale(new THREE.Vector3())); hit.userData.item = h.id; h.root.add(hit);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: beaconTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0}));
    s.position.set(v.x, box3.max.y + 0.22, v.z); s.scale.setScalar(0.28); s.renderOrder = 10; s.userData.item = h.id;
    root.add(s); h.beacon = s;
  }
  out.batchedMeshes = batchStaticSiblings(root);
  return out;
}
