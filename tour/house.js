/**
 * Builds the myClover house. Pure scene construction: returns the pieces the tour animates
 * (facade, roof, door, screens, hotspots, collectibles). Every interactive object is tagged
 * with an item id that matches a `[data-item]` link in index.html, which owns label and URL.
 */
import * as THREE from './vendor/three.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {FONT, imageTex} from './textures.js';

export const H = 3.2, D = 7;
// x extents of each zone; the house runs from x=-22 to x=16
export const ZONES = {books: [-22, -16.5], living: [-16.5, -8], kitchen: [-8, 0], classroom: [0, 8], office: [8, 16]};
export const CLOVER_ROOMS = ['living', 'kitchen', 'classroom', 'office'];

export function buildHouse({renderer, hd, tex, found, mobile}) {
  const root = new THREE.Group();
  const out = {root, hotspots: [], collectibles: new Map(), tickers: [], lights: [], screens: [], smoke: []};
  const geoCache = new Map(), matCache = new Map();

  /* ---------- helpers ---------- */
  const M = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({color, roughness: 0.72, ...o}));
    return matCache.get(key);
  };
  const fabric = color => hd
    ? new THREE.MeshPhysicalMaterial({color, map: tex.fabric, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4)})
    : new THREE.MeshStandardMaterial({color, map: tex.fabric, roughness: 0.92});
  const wood = (color = '#b07a4c') => M(color, {map: tex.grain, roughness: 0.5});
  function geo(kind, args) {
    const key = kind + args.join(',');
    if (!geoCache.has(key)) {
      geoCache.set(key, kind === 'rbox' ? new RoundedBoxGeometry(args[0], args[1], args[2], hd ? 3 : 1, Math.min(args[3], args[0] / 2.2, args[1] / 2.2, args[2] / 2.2))
        : kind === 'box' ? new THREE.BoxGeometry(...args)
        : kind === 'cyl' ? new THREE.CylinderGeometry(args[0], args[1], args[2], hd ? 32 : 18)
        : kind === 'sph' ? new THREE.SphereGeometry(args[0], hd ? 32 : 16, hd ? 20 : 12)
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
  const plane = (p, [w, h], [x, y, z], mat, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.receiveShadow = true; p.add(m); return m; };
  const photo = (url, glow = false, tint = '#d9d2c4') => { const m = new THREE.MeshStandardMaterial({color: tint, roughness: 0.45}); if (glow) { m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = 0.75; m.userData.glow = true; } imageTex(url, m, renderer); return m; };
  const hot = (obj, id) => { obj.traverse(o => { o.userData.item = id; }); out.hotspots.push({root: obj, id, base: obj.position.clone(), rot: obj.rotation.clone()}); return obj; };
  const group = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  function plant(p, x, z, s = 1, pot = '#e8dccb') {
    cy(p, [0.26 * s, 0.2 * s, 0.46 * s], [x, 0, z], M(pot, {roughness: 0.5}));
    const leaves = ['#3f8a50', '#4f9a5c', '#62b06c'];
    for (let i = 0; i < (hd ? 9 : 5); i++) { const a = i * 2.39; blob(p, (0.22 + (i % 3) * 0.06) * s, [x + Math.cos(a) * 0.2 * s, (0.62 + (i % 4) * 0.16) * s, z + Math.sin(a) * 0.2 * s], leaves[i % 3], hd ? 1 : 0); }
  }
  function lampLight(x, y, z, intensity = 6, dist = 7) { const l = new THREE.PointLight('#ffd9a0', 0, dist, 1.7); l.position.set(x, y, z); l.userData.max = intensity; root.add(l); out.lights.push(l); return l; }
  function label(text, w = 512, h = 128, bg = '#14281d', fg = '#fbf6ec', size = 56) {
    return tex.canvasTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = `700 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 4); });
  }

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

  /* ---------- ground & garden ---------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.grass, roughness: 1}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; root.add(ground);
  bx(root, [38.8, 0.4, D + 0.9], [-3, -0.4, 0], M('#d8cdb8', {roughness: 0.9}));
  const garden = group(root);
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(geo('cyl', [0.42, 0.46, 0.08]), M('#dcd5c6', {roughness: 0.95})); place(s, garden, -19 + Math.sin(i * 0.8) * 0.3, 0.02, 4.6 + i * 1.05); }
  const TREES = [[-29, -6, 1.3], [-26, 7, 1], [-32, 2, 1.5], [23, -5, 1.3], [26, 4, 1.05], [21, 10, 0.85], [-8, -14, 1.6], [4, -15, 1.4], [15, -12, 1.2], [-20, -12, 1.3]];
  for (const [x, z, s] of TREES) {
    cy(garden, [0.16 * s, 0.26 * s, 1.7 * s], [x, 0, z], M('#7a5236', {roughness: 0.9}));
    blob(garden, 1.35 * s, [x, 2.4 * s, z], '#4f9a5c', hd ? 2 : 1); blob(garden, 1.0 * s, [x + 0.6 * s, 3.2 * s, z + 0.2], '#62b06c', hd ? 2 : 1); blob(garden, 0.85 * s, [x - 0.55 * s, 3.0 * s, z - 0.3], '#3f8a50', hd ? 2 : 1);
  }
  const flowers = out.flowers = group(garden);
  const flowerColors = ['#f28b82', '#fbd46d', '#ffffff', '#c39bd3', '#f7a1c4'];
  const hedgeMat = M('#4f9a5c', {roughness: 0.95, map: tex.fabric});
  for (const [x0, x1] of [[-21.8, -20.1], [-17.9, 15.8]]) {
    rb(flowers, [x1 - x0, 0.42, 0.55], [(x0 + x1) / 2, 0, D / 2 + 0.75], hedgeMat, null, 0.18);
    for (let x = x0 + 0.15; x < x1; x += hd ? 0.22 : 0.4) {
      const k = Math.round(x * 13);
      sp(flowers, 0.045 + (k % 3) * 0.01, [x, 0.425, D / 2 + 0.58 + (k % 5) * 0.08], M(flowerColors[Math.abs(k) % 5], {roughness: 0.6}));
    }
  }
  { // clover meadow (instanced three-leaf clovers)
    const N = hd ? 900 : mobile ? 260 : 480, leafMat = M('#3f9a57', {roughness: 0.6});
    const meshes = [0, 1, 2].map(() => new THREE.InstancedMesh(leafGeo, leafMat, N));
    const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      let x, z; do { x = (r() - 0.5) * 80 - 3; z = (r() - 0.5) * 56 + 6; } while ((x > -23 && x < 17 && z < 6.8 && z > -5) || (Math.abs(x + 19) < 1.6 && z > 3));
      e.set(-Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 6.28); q.setFromEuler(e); p.set(x, 0.1, z); const s = 0.13 + r() * 0.1; sc.set(s, s, s);
      m4.compose(p, q, sc);
      meshes.forEach((mesh, k) => { rot.makeRotationZ(k * Math.PI * 2 / 3); mesh.setMatrixAt(i, m4.clone().multiply(rot)); });
    }
    meshes.forEach(m => { m.receiveShadow = true; garden.add(m); });
  }

  /* ---------- shell: floors, back walls, partitions ---------- */
  const floorMat = {
    wood: new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.wood, roughness: 0.5, metalness: 0.02}),
    tile: new THREE.MeshStandardMaterial({color: '#ffffff', map: tex.tile, roughness: 0.35}),
  };
  for (const [id, [x0, x1]] of Object.entries(ZONES)) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.12, D), id === 'kitchen' ? floorMat.tile : floorMat.wood);
    f.position.set((x0 + x1) / 2, -0.06, 0); f.receiveShadow = true; root.add(f);
  }
  const wallMats = {
    books: M('#ffffff', {map: tex.stripes}), living: M('#ffffff', {map: tex.stripes}),
    kitchen: M('#f5e6bd', {map: tex.plaster}), classroom: M('#d6e6f2', {map: tex.plaster}), office: M('#ecd9cc', {map: tex.plaster}),
  };
  for (const [id, [x0, x1]] of Object.entries(ZONES)) {
    const w = bx(root, [x1 - x0, H, 0.24], [(x0 + x1) / 2, 0, -D / 2 - 0.12], wallMats[id]); w.castShadow = false;
    bx(root, [x1 - x0, 0.14, 0.05], [(x0 + x1) / 2, 0, -D / 2 + 0.02], '#fbf8f1');
    if (id !== 'kitchen') bx(root, [x1 - x0, 0.9, 0.04], [(x0 + x1) / 2, 0, -D / 2 + 0.01], M('#ffffff', {map: tex.plaster, color: id === 'living' || id === 'books' ? '#f3f0e6' : '#fbf8f1'})); // wainscot
  }
  const partMat = M('#f3efe6', {map: tex.plaster});
  for (const x of [-22, -8, 0, 8, 16]) {
    if (x === -22 || x === 16) { bx(root, [0.24, H, D + 0.24], [x, 0, 0], partMat); continue; }
    bx(root, [0.2, H, 3.3], [x, 0, -D / 2 + 1.65], partMat); bx(root, [0.2, H, 1.9], [x, 0, D / 2 - 0.95], partMat); bx(root, [0.2, 0.7, 1.8], [x, H - 0.7, 0.75], partMat);
  }

  /* ---------- facade (sinks into the ground, never fades) ---------- */
  const facade = out.facade = group(root);
  const facadeMat = M('#f7f1e3', {map: tex.plaster, roughness: 0.85}), trimMat = M('#2f5d44', {roughness: 0.55});
  const glassMat = out.glassMat = new THREE.MeshStandardMaterial({color: '#bcd9e6', roughness: 0.08, metalness: 0.3, emissive: '#ffcf7a', emissiveIntensity: 0});
  const FZ = D / 2 + 0.12;
  const hole = (x0, x1, hx0, hx1, hy0, hy1) => {
    const piece = (a, b, y0, y1) => { if (b - a > 0.01 && y1 - y0 > 0.01) bx(facade, [b - a, y1 - y0, 0.24], [(a + b) / 2, y0, FZ], facadeMat); };
    piece(x0, hx0, 0, H); piece(hx1, x1, 0, H); piece(hx0, hx1, 0, hy0); piece(hx0, hx1, hy1, H);
  };
  const windowAt = (x, w) => {
    plane(facade, [w, 1.4], [x, 1.65, FZ], glassMat);
    bx(facade, [w + 0.3, 0.1, 0.42], [x, 0.85, FZ + 0.1], trimMat); bx(facade, [0.06, 1.4, 0.06], [x, 0.95, FZ + 0.03], trimMat);
    const box = bx(facade, [w + 0.1, 0.22, 0.3], [x, 0.62, FZ + 0.24], M('#8a5a3c')); box.castShadow = false;
    for (let i = 0; i < 6; i++) blob(facade, 0.12, [x - w / 2 + 0.2 + i * (w - 0.4) / 5, 0.92, FZ + 0.25], flowerColors[i % 5], 1);
  };
  hole(-22, -16.5, -19.7, -18.3, 0, 2.3);
  hole(-16.5, -8, -13.8, -10.8, 0.95, 2.35); windowAt(-12.3, 3.0);
  for (const cx of [-4, 4, 12]) { hole(cx - 4, cx + 4, cx - 1.4, cx + 1.4, 0.95, 2.35); windowAt(cx, 2.8); }
  const hinge = out.door = group(facade, -19.7, 0, FZ + 0.02);
  rb(hinge, [1.4, 2.28, 0.09], [0.7, 0, 0], trimMat, null, 0.03);
  for (const yy of [0.35, 1.25]) bx(hinge, [1.0, 0.7, 0.02], [0.7, yy, 0.05], M('#3b7053'));
  const knob = cy(hinge, [0.05, 0.05, 0.09], [1.2, 1.05, 0.09], M('#e9b949', {metalness: 0.85, roughness: 0.25})); knob.rotation.x = Math.PI / 2;
  const sign = plane(hinge, [0.9, 0.3], [0.7, 1.95, 0.06], new THREE.MeshStandardMaterial({map: label('ยินดีต้อนรับ', 512, 170, '#fbf6ec', '#1d6b3d', 78)}));
  sign.castShadow = false;
  bx(facade, [2.2, 0.12, 1.2], [-19, H - 0.9, FZ + 0.6], trimMat); // porch canopy
  for (const dx of [-0.95, 0.95]) { // porch lanterns
    cy(facade, [0.09, 0.11, 0.32], [-19 + dx, 2.0, FZ + 0.2], M('#fff1cf', {emissive: '#ffcf7a', emissiveIntensity: 1.2}));
  }
  bx(facade, [38.4, 0.18, 0.4], [-3, H - 0.05, FZ + 0.05], trimMat);
  const porchLight = lampLight(-19, 2.3, 4.6, 5, 6);

  /* ---------- roof (lifts away, never fades) ---------- */
  const roof = out.roof = group(root, 0, H, 0);
  const roofMat = M('#b5543c', {roughness: 0.65});
  if (hd) { // tile rows via texture
    roofMat.map = tex.canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#b5543c'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(60,20,10,.35)'; c.fillRect(0, y, w, 4); for (let x = (y / 32 % 2) * 16; x < w; x += 32) { c.fillStyle = 'rgba(60,20,10,.2)'; c.fillRect(x, y, 2, 32); } } }, {repeat: [18, 3]});
  }
  const rs = new THREE.Shape(); rs.moveTo(-(D / 2 + 0.9), 0); rs.lineTo(0, 2.5); rs.lineTo(D / 2 + 0.9, 0); rs.lineTo(-(D / 2 + 0.9), 0);
  const roofGeo = new THREE.ExtrudeGeometry(rs, {depth: 39.6, bevelEnabled: false}); roofGeo.translate(0, 0, -19.8);
  const roofMesh = place(new THREE.Mesh(roofGeo, roofMat), roof, -3, 0, 0); roofMesh.rotation.y = Math.PI / 2;
  bx(roof, [0.8, 1.8, 0.8], [-6, 0.8, -1.2], M('#8a4a36'));
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(geo('ico', [0.35, 1]), new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.5, roughness: 1, depthWrite: false})); s.userData.phase = i / 5; roof.add(s); out.smoke.push(s); }

  /* ================= BOOK CORNER ================= */
  {
    const g = group(root);
    // tall bookshelf with instanced books
    const shelfWood = wood('#8c6242');
    bx(g, [4.4, 2.7, 0.05], [-19.5, 0, -3.4], wood('#6b4a30'));
    for (const sx of [-21.68, -17.32]) rb(g, [0.06, 2.72, 0.55], [sx, 0, -3.15], shelfWood, null, 0.01);
    rb(g, [4.42, 0.06, 0.56], [-19.5, 2.66, -3.15], shelfWood, null, 0.01);
    const bookGeo = new THREE.BoxGeometry(1, 1, 1), N = hd ? 150 : 90;
    const books = new THREE.InstancedMesh(bookGeo, M('#ffffff', {roughness: 0.6}), N);
    const cols = ['#e37c5b', '#2e9e5b', '#4a8fd1', '#f2c14e', '#7d5ba6', '#f3efe6', '#1d6b3d', '#b8573c'];
    const m4 = new THREE.Matrix4(), c = new THREE.Color(); let i = 0;
    for (let s = 0; s < 5 && i < N; s++) {
      let x = -21.5;
      while (x < -17.6 && i < N) {
        const w = 0.07 + ((i * 37) % 7) / 60, h = 0.32 + ((i * 13) % 5) / 40, lean = (i % 11 === 0) ? 0.2 : 0;
        m4.compose(new THREE.Vector3(x + w / 2, 0.14 + s * 0.52 + h / 2, -3.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, lean)), new THREE.Vector3(w, h, 0.34));
        books.setMatrixAt(i, m4); books.setColorAt(i, c.set(cols[(i * 5 + s) % cols.length])); x += w + 0.01; i++;
      }
      bx(g, [4.3, 0.04, 0.5], [-19.5, 0.1 + s * 0.52, -3.1], wood('#6b4a30'));
    }
    books.count = i; books.castShadow = true; g.add(books);
    // featured books on a display table: AI ใส่ซอส / Forge / Walkthrough
    rb(g, [1.9, 0.72, 0.7], [-18.9, 0, -0.9], wood('#a8744a'), null, 0.05);
    const cover = (title, sub, bg, fg) => tex.canvasTex(360, 512, (c2, w, h) => {
      c2.fillStyle = bg; c2.fillRect(0, 0, w, h);
      c2.fillStyle = 'rgba(255,255,255,.12)'; c2.fillRect(0, 0, 26, h);
      c2.fillStyle = fg; c2.font = `800 64px ${FONT}`; c2.textAlign = 'center'; c2.fillText(title, w / 2 + 10, 190);
      c2.font = `600 30px ${FONT}`; c2.fillText(sub, w / 2 + 10, 250);
      c2.beginPath(); c2.arc(w / 2 + 10, 370, 56, 0, 7); c2.fillStyle = 'rgba(255,255,255,.18)'; c2.fill();
      c2.font = `700 58px ${FONT}`; c2.fillStyle = fg; c2.fillText('🍀', w / 2 + 10, 392);
    });
    const featured = [
      {id: 'aisauce-book', mat: new THREE.MeshStandardMaterial({map: cover('AI ใส่ซอส', 'หนังสือเล่มแรกของบ้าน', '#1d6b3d', '#fbf6ec'), roughness: 0.5}), x: -19.45, ry: 0.35},
      {id: 'forge-book', mat: photo('/img/card-forge.jpg'), x: -18.9, ry: 0},
      {id: 'walkthrough-book', mat: photo('/img/col-walkthrough.webp'), x: -18.35, ry: -0.35},
    ];
    for (const b of featured) {
      const bk = group(g, b.x, 0.72, -0.95); bk.rotation.set(-0.18, b.ry, 0);
      rb(bk, [0.46, 0.64, 0.07], [0, 0, 0], M('#f3efe6'), null, 0.01);
      plane(bk, [0.44, 0.62], [0, 0.32, 0.036], b.mat);
      hot(bk, b.id);
    }
    // reading nook: armchair, side table, lamp, throw
    const chair = group(g, -21.0, 0, -0.2); chair.rotation.y = 0.7;
    const mustard = fabric('#d9a441');
    rb(chair, [1.0, 0.42, 0.9], [0, 0.12, 0], mustard, null, 0.12); rb(chair, [1.0, 0.8, 0.22], [0, 0.4, -0.38], mustard, null, 0.1);
    rb(chair, [0.2, 0.6, 0.9], [-0.5, 0.12, 0], mustard, null, 0.08); rb(chair, [0.2, 0.6, 0.9], [0.5, 0.12, 0], mustard, null, 0.08);
    for (const [dx, dz] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) cy(chair, [0.03, 0.02, 0.14], [dx, 0, dz], '#5a3d28');
    rb(chair, [0.7, 0.06, 0.5], [0.05, 0.56, 0.05], fabric('#b8573c'), [0.1, 0, 0.05], 0.02);
    cy(g, [0.28, 0.28, 0.04], [-21.2, 0.58, 1.2], wood('#8c6242')); cy(g, [0.04, 0.04, 0.58], [-21.2, 0, 1.2], '#5a3d28');
    cy(g, [0.07, 0.06, 0.12], [-21.1, 0.62, 1.15], M('#ffffff', {roughness: 0.3})); // mug
    cy(g, [0.02, 0.02, 1.6], [-21.6, 0, -1.4], '#333333');
    const shade = cy(g, [0.18, 0.3, 0.32], [-21.6, 1.55, -1.4], M('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 1})); shade.castShadow = false;
    lampLight(-21.3, 1.6, -1.1, 4, 5);
    // welcome mat + shoe bench + coat hooks
    const mat = new THREE.MeshStandardMaterial({map: label('WELCOME HOME', 512, 256, '#8a5a3c', '#f3e3c4', 60), roughness: 1});
    const mm = plane(g, [1.5, 0.75], [-19, 0.012, 2.7], mat, [-Math.PI / 2, 0, 0]); mm.receiveShadow = true;
    rb(g, [1.2, 0.45, 0.4], [-17.3, 0, 2.9], wood('#a8744a'), null, 0.04);
    rb(g, [0.28, 0.1, 0.12], [-17.6, 0.45, 2.85], '#e37c5b', null, 0.04); rb(g, [0.28, 0.1, 0.12], [-17.2, 0.45, 2.95], '#4a8fd1', null, 0.04);
    for (let k = 0; k < 3; k++) cy(g, [0.03, 0.03, 0.12], [-21.86, 1.7, 1.8 + k * 0.4], '#e9b949').rotation.z = Math.PI / 2;
    plant(g, -17.1, -2.6, 1.3);
    // half-height divider shelf between book corner and living room
    rb(g, [0.4, 1.05, 3.0], [-16.5, 0, -2.0], wood('#8c6242'), null, 0.03);
    plant(g, -16.5, -1.2, 0.6); plant(g, -16.5, -2.8, 0.55);
  }

  /* ================= LIVING ROOM ================= */
  {
    const cx = -12.3, g = group(root);
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.025, 64), new THREE.MeshStandardMaterial({map: tex.rug, roughness: 1}));
    rug.position.set(cx, 0.013, 0.2); rug.receiveShadow = true; g.add(rug);
    // sofa
    const sage = fabric('#5b8a6f');
    rb(g, [3.4, 0.42, 1.05], [cx, 0.08, -2.6], sage, null, 0.1); rb(g, [3.4, 0.8, 0.3], [cx, 0.36, -3.1], sage, null, 0.12);
    rb(g, [0.3, 0.66, 1.05], [cx - 1.7, 0.08, -2.6], sage, null, 0.12); rb(g, [0.3, 0.66, 1.05], [cx + 1.7, 0.08, -2.6], sage, null, 0.12);
    for (const dx of [-0.78, 0.78]) rb(g, [1.5, 0.18, 0.92], [cx + dx, 0.5, -2.55], fabric('#6f9e82'), null, 0.08);
    rb(g, [0.55, 0.45, 0.16], [cx - 1.1, 0.64, -2.85], fabric('#f2c14e'), [0.2, 0.25, 0], 0.08);
    rb(g, [0.55, 0.45, 0.16], [cx + 1.1, 0.64, -2.85], fabric('#e37c5b'), [0.2, -0.25, 0], 0.08);
    rb(g, [0.9, 0.05, 0.6], [cx + 0.9, 0.7, -2.4], fabric('#f3e3c4'), [0, 0.3, 0.06], 0.02);
    // photo of Teem → resume, clover art
    const frame = group(g, cx - 0.8, 1.55, -D / 2 + 0.03);
    rb(frame, [0.92, 1.16, 0.05], [0, 0, 0], wood('#6d4a30'), null, 0.01);
    plane(frame, [0.8, 1.04], [0, 0.58, 0.03], photo('/img/party-teem.webp'));
    hot(frame, 'teem-photo');
    const art = group(g, cx + 0.8, 1.7, -D / 2 + 0.03);
    rb(art, [1.0, 0.8, 0.05], [0, 0, 0], wood('#6d4a30'), null, 0.01);
    plane(art, [0.88, 0.68], [0, 0.4, 0.03], new THREE.MeshStandardMaterial({map: tex.canvasTex(256, 200, (c2, w, h) => { const gr = c2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe3f0'); gr.addColorStop(1, '#f7e7c4'); c2.fillStyle = gr; c2.fillRect(0, 0, w, h); c2.fillStyle = '#2e9e5b'; for (let k = 0; k < 4; k++) { c2.save(); c2.translate(128, 100); c2.rotate(k * Math.PI / 2 + Math.PI / 4); c2.beginPath(); c2.ellipse(0, -26, 20, 28, 0, 0, 7); c2.fill(); c2.restore(); } })}));
    // game table
    rb(g, [2.3, 0.1, 1.45], [cx, 0.42, 0.25], wood('#a8744a'), null, 0.04);
    for (const [dx, dz] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) cy(g, [0.05, 0.04, 0.42], [cx + dx, 0, 0.25 + dz], '#6d4a30');
    // map + compass (the original front door: "pick up the compass") → /frontdoor/
    const compass = group(g, cx - 0.5, 0.52, 0.35);
    plane(compass, [1.0, 0.72], [0, 0.002, 0], photo('/frontdoor/art/underpaper-valley-mobile.webp', false, '#e8dcc0'), [-Math.PI / 2, 0, 0.12]);
    const cbody = new THREE.MeshStandardMaterial({transparent: true, alphaTest: 0.2, roughness: 0.35, metalness: 0.2, color: '#c9b27a'});
    imageTex('/frontdoor/art/compass-body-mobile.webp', cbody, renderer);
    const disc = plane(compass, [0.46, 0.46], [0.05, 0.03, 0.02], cbody, [-Math.PI / 2, 0, 0]); disc.castShadow = true;
    const needleMat = new THREE.MeshStandardMaterial({transparent: true, alphaTest: 0.2, color: '#ffffff'}); imageTex('/frontdoor/art/compass-needle.webp', needleMat, renderer);
    const needle = plane(compass, [0.32, 0.32], [0.05, 0.04, 0.02], needleMat, [-Math.PI / 2, 0, 0]);
    out.tickers.push(t => { needle.rotation.z = Math.sin(t * 0.9) * 0.35 + Math.sin(t * 2.3) * 0.08; });
    hot(compass, 'compass');
    // CORE7 cards fanned on the table → /core7/
    const core7 = group(g, cx + 0.55, 0.53, 0.3);
    const cards = ['gen-red', 'gen-green', 'gen-blue', 'gen-silver', 'fh-red-courage'].slice(0, hd ? 5 : 4);
    cards.forEach((name, k) => {
      const card = plane(core7, [0.26, 0.46], [(k - (cards.length - 1) / 2) * 0.13, 0.003 + k * 0.002, Math.abs(k - (cards.length - 1) / 2) * 0.04], photo(`/core7/assets/cards/${name}.webp`, false, '#3a3f5c'), [-Math.PI / 2, 0, (k - (cards.length - 1) / 2) * 0.22]);
      card.castShadow = true;
    });
    const deck = rb(core7, [0.28, 0.08, 0.48], [0.5, 0, -0.1], M('#1d2340', {roughness: 0.5}), [0, 0.3, 0], 0.01);
    hot(core7, 'core7');
    for (let k = 0; k < 2; k++) { const d = rb(g, [0.12, 0.12, 0.12], [cx + 0.95 + k * 0.16, 0.52, -0.2 + k * 0.1], '#ffffff', null, 0.025); out.tickers.push(t => { d.rotation.y = t * 0.5 + k; }); }
    // console with board-game boxes (Hall) and the mini dollhouse (3D house) → showcase
    rb(g, [2.3, 0.62, 0.55], [cx + 3.0, 0, -3.1], wood('#8c6242'), null, 0.03);
    const hall = group(g, cx + 2.45, 0.62, -3.05);
    const boxLabel = tex.canvasTex(512, 320, (c2, w, h) => { c2.fillStyle = '#1d6b3d'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#f2c14e'; c2.font = `800 70px ${FONT}`; c2.textAlign = 'center'; c2.fillText('MAIN QUEST', w / 2, 140); c2.fillStyle = '#fbf6ec'; c2.font = `600 42px ${FONT}`; c2.fillText('CORE7 · XTY · Hall', w / 2, 220); });
    rb(hall, [0.8, 0.1, 0.5], [0, 0, 0], M('#e37c5b'), [0, 0.1, 0], 0.01); rb(hall, [0.78, 0.1, 0.48], [0, 0.1, 0], M('#4a8fd1'), [0, -0.08, 0], 0.01);
    const top = rb(hall, [0.8, 0.1, 0.5], [0, 0.2, 0], M('#1d6b3d'), [0, 0.04, 0], 0.01);
    plane(hall, [0.76, 0.46], [0, 0.302, 0], new THREE.MeshStandardMaterial({map: boxLabel}), [-Math.PI / 2, 0, -0.04]);
    hot(hall, 'hall');
    const mini = group(g, cx + 3.55, 0.62, -3.1);
    rb(mini, [0.8, 0.42, 0.42], [0, 0, 0], M('#f7f1e3', {roughness: 0.6}), null, 0.02);
    const mr = new THREE.Shape(); mr.moveTo(-0.27, 0); mr.lineTo(0, 0.24); mr.lineTo(0.27, 0); mr.lineTo(-0.27, 0);
    const mroof = new THREE.Mesh(new THREE.ExtrudeGeometry(mr, {depth: 0.9, bevelEnabled: false}), M('#b5543c')); mroof.geometry.translate(0, 0, -0.45); mroof.rotation.y = Math.PI / 2; place(mroof, mini, 0, 0.42, 0);
    for (let k = 0; k < 3; k++) bx(mini, [0.13, 0.11, 0.01], [-0.25 + k * 0.25, 0.18, 0.215], M('#fff1cf', {emissive: '#ffcf7a', emissiveIntensity: 1.3}));
    bx(mini, [0.1, 0.18, 0.01], [0.33, 0, 0.215], M('#2f5d44'));
    hot(mini, 'house3d');
    // tea set to welcome guests
    const tea = group(g, cx - 0.1, 0.52, -0.2);
    sp(tea, 0.12, [0, 0.1, 0], M('#f3efe6', {roughness: 0.25})).scale.set(1, 0.8, 1);
    cy(tea, [0.02, 0.03, 0.12], [0.14, 0.1, 0], M('#f3efe6', {roughness: 0.25})).rotation.z = -0.9;
    for (let k = 0; k < 2; k++) cy(tea, [0.055, 0.04, 0.07], [-0.25 + k * 0.14, 0, 0.12], M('#ffffff', {roughness: 0.25}));
    // floor lamp + plants
    cy(g, [0.025, 0.025, 1.75], [cx - 3.2, 0, -2.6], '#333333');
    const ls = cy(g, [0.2, 0.36, 0.42], [cx - 3.2, 1.62, -2.6], M('#fff1cf', {emissive: '#ffd58a', emissiveIntensity: 1})); ls.castShadow = false;
    lampLight(cx, 2.6, 0.6, 7, 9);
    plant(g, cx + 3.4, 2.3, 1.1); plant(g, cx - 3.5, 2.5, 0.9, '#c56b4a');
  }

  /* ================= KITCHEN ================= */
  {
    const cx = -4, g = group(root);
    const counterMat = M('#fbf8f1', {roughness: 0.4}), marble = M('#ffffff', {map: tex.marble, roughness: 0.25});
    rb(g, [5.6, 0.88, 0.7], [cx - 0.8, 0, -3.1], counterMat, null, 0.02);
    rb(g, [5.7, 0.06, 0.78], [cx - 0.8, 0.88, -3.08], marble, null, 0.01);
    for (let k = 0; k < 5; k++) { rb(g, [1.04, 0.62, 0.02], [cx - 3.05 + k * 1.12, 0.14, -2.74], M('#7fae95', {roughness: 0.5}), null, 0.01); cy(g, [0.012, 0.012, 0.2], [cx - 3.05 + k * 1.12, 0.62, -2.72], M('#e9b949', {metalness: 0.8, roughness: 0.3})).rotation.z = Math.PI / 2; }
    bx(g, [5.6, 0.7, 0.02], [cx - 0.8, 0.94, -3.46], M('#ffffff', {map: tex.subway, roughness: 0.2}));
    rb(g, [2.6, 0.7, 0.4], [cx - 2.3, 1.9, -3.26], M('#7fae95', {roughness: 0.5}), null, 0.02);
    rb(g, [2.4, 0.04, 0.3], [cx + 0.6, 2.35, -3.3], wood('#8c6242'), null, 0.01); // open shelf with jars
    for (let k = 0; k < 6; k++) { cy(g, [0.08, 0.08, 0.2], [cx - 0.35 + k * 0.38, 2.39, -3.3], M(['#f2c14e', '#e37c5b', '#9ccf7a'][k % 3], {transparent: true, opacity: 0.85, roughness: 0.15})); cy(g, [0.085, 0.085, 0.04], [cx - 0.35 + k * 0.38, 2.59, -3.3], wood('#8c6242')); }
    // three framed dishes by Ako → recipe pages
    const dishes = [['dish-chicken', 'chicken-egg-bowl'], ['dish-soup', 'mushroom-egg-soup'], ['dish-tofu', 'tofu-tomato-cool']];
    dishes.forEach(([id, slug], k) => {
      const f = group(g, cx - 0.55 + k * 1.05, 1.18, -D / 2 + 0.03);
      rb(f, [0.92, 0.66, 0.04], [0, 0, 0], M('#fbf6ec'), null, 0.01);
      plane(f, [0.84, 0.56], [0, 0.33, 0.025], photo(`/ako/kitchen/art/${slug}-v1-mobile.webp`, false, '#e8c9a0'));
      hot(f, id);
    });
    rb(g, [1.1, 2.2, 0.8], [cx + 2.9, 0, -3.0], M('#dfe5e2', {metalness: 0.45, roughness: 0.3}), null, 0.05);
    cy(g, [0.02, 0.02, 0.6], [cx + 2.42, 1.1, -2.58], M('#bbbbbb', {metalness: 0.9, roughness: 0.2}));
    // stove + pot + steam
    bx(g, [0.9, 0.03, 0.6], [cx - 2.4, 0.91, -3.05], '#1f2320');
    for (const dx of [-0.2, 0.2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 28), M('#ff7a3d', {emissive: '#ff5a1f', emissiveIntensity: 1.4})); r.rotation.x = Math.PI / 2; r.position.set(cx - 2.4 + dx, 0.95, -3.05); g.add(r); }
    cy(g, [0.21, 0.19, 0.3], [cx - 2.6, 0.94, -3.05], M('#d6c2a6', {metalness: 0.7, roughness: 0.25}));
    cy(g, [0.22, 0.22, 0.03], [cx - 2.6, 1.24, -3.05], M('#c9ced1', {metalness: 0.8, roughness: 0.2}));
    out.steam = [];
    for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(geo('sph', [0.08]), new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false})); s.userData = {phase: k / 7, base: new THREE.Vector3(cx - 2.6, 1.3, -3.05)}; g.add(s); out.steam.push(s); }
    // herbs (clover #2 hides here)
    for (let k = 0; k < 3; k++) { cy(g, [0.12, 0.1, 0.2], [cx + 0.6 + k * 0.35, 0.91, -3.15], '#c56b4a'); for (let j = 0; j < 4; j++) blob(g, 0.08, [cx + 0.6 + k * 0.35 + (j % 2 - 0.5) * 0.08, 1.2 + j * 0.05, -3.15 + (j > 1 ? 0.05 : -0.05)], ['#4f9a5c', '#62b06c', '#3f8a50'][k], 1); }
    // island: wood base, marble top
    rb(g, [2.8, 0.88, 1.15], [cx, 0, 0.4], wood('#b98352'), null, 0.04);
    rb(g, [3.0, 0.06, 1.3], [cx, 0.88, 0.4], marble, null, 0.015);
    for (const dx of [-0.9, 0, 0.9]) { cy(g, [0.21, 0.21, 0.06], [cx + dx, 0.66, 1.4], fabric('#2f5d44')); cy(g, [0.025, 0.025, 0.66], [cx + dx, 0, 1.4], M('#333333', {metalness: 0.6})); }
    // salad bowl → Ako's kitchen
    const bowl = group(g, cx - 0.55, 0.94, 0.4);
    place(new THREE.Mesh(new THREE.SphereGeometry(0.42, hd ? 48 : 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#ffffff', {roughness: 0.2, side: THREE.DoubleSide})), bowl, 0, 0.42, 0);
    for (let k = 0; k < (hd ? 26 : 14); k++) { const a = k * 2.4, r = 0.06 + (k % 5) * 0.06; blob(bowl, 0.1 + (k % 3) * 0.02, [Math.cos(a) * r, 0.4 + (k % 3) * 0.03, Math.sin(a) * r], ['#5fb25a', '#8fd16a', '#3f8a50', '#b5d96a'][k % 4], 1); }
    for (let k = 0; k < 6; k++) { const a = k * 1.1; sp(bowl, 0.055, [Math.cos(a) * 0.2, 0.49, Math.sin(a) * 0.2], M('#e2412f', {roughness: 0.25})); }
    for (let k = 0; k < 3; k++) { const e = sp(bowl, 0.07, [Math.cos(k * 2.1) * 0.12, 0.48, Math.sin(k * 2.1) * 0.12], M('#fff8e8', {roughness: 0.4})); e.scale.set(1, 0.5, 1); sp(bowl, 0.035, [Math.cos(k * 2.1) * 0.12, 0.505, Math.sin(k * 2.1) * 0.12], M('#f2b632', {roughness: 0.3})); }
    hot(bowl, 'ako-kitchen');
    // Ako's recipe book on a stand → /ako/
    const rbk = group(g, cx + 0.35, 0.94, 0.25); rbk.rotation.set(-0.5, -0.2, 0);
    rb(rbk, [0.5, 0.36, 0.03], [0, 0, 0], M('#e37c5b'), null, 0.01);
    plane(rbk, [0.46, 0.32], [0, 0.18, 0.018], new THREE.MeshStandardMaterial({map: label('ครัวเอโกะ', 512, 360, '#fbf6ec', '#b8573c', 88)}));
    hot(rbk, 'ako');
    // bread board, fruit bowl, plates
    rb(g, [0.6, 0.04, 0.34], [cx + 1.0, 0.94, 0.7], wood('#c79a63'), null, 0.02);
    const bread = sp(g, 0.1, [cx + 1.0, 1.04, 0.7], M('#d99a4e', {roughness: 0.7})); bread.scale.set(2.6, 0.8, 0.9);
    const fb = cy(g, [0.26, 0.16, 0.1], [cx + 1.0, 0.94, 0.1], M('#2f5d44', {roughness: 0.4}));
    [['#f3a53a', 0.09], ['#e2412f', 0.085], ['#b7dd5a', 0.075], ['#f3a53a', 0.08]].forEach(([col, r], k) => sp(g, r, [cx + 1.0 + Math.cos(k * 1.6) * 0.1, 1.1 + (k === 3 ? 0.08 : 0), 0.1 + Math.sin(k * 1.6) * 0.1], M(col, {roughness: 0.4})));
    for (const dx of [-1.2, 1.3]) cy(g, [0.2, 0.16, 0.025], [cx + dx, 0.94, 1.0], M('#ffffff', {roughness: 0.2}));
    for (const dx of [-0.75, 0.75]) {
      cy(g, [0.008, 0.008, 1.2], [cx + dx, H - 1.2, 0.4], '#333333');
      const s = cy(g, [0.12, 0.32, 0.32], [cx + dx, H - 1.52, 0.4], M('#2f5d44', {emissive: '#ffcf7a', emissiveIntensity: 0.25, roughness: 0.4})); s.castShadow = false;
    }
    lampLight(cx, 1.9, 0.4, 7, 7);
  }

  /* ================= CLASSROOM ================= */
  {
    const cx = 4, g = group(root);
    // bunting across the room: the "announcement" mood
    const flagCols = ['#e37c5b', '#f2c14e', '#2e9e5b', '#4a8fd1'];
    for (let k = 0; k < 16; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 3), M(flagCols[k % 4], {side: THREE.DoubleSide, roughness: 0.8})); f.rotation.x = Math.PI; f.position.set(cx - 3.7 + k * 0.49, 2.85 - Math.sin(k / 15 * Math.PI) * 0.25, -3.25); g.add(f); }
    // whiteboard → free lessons
    const wbTex = tex.canvasTex(1024, 420, (c, w) => {
      c.fillStyle = '#fdfefe'; c.fillRect(0, 0, w, 420);
      c.fillStyle = '#1d6b3d'; c.font = `800 92px ${FONT}`; c.fillText('AI ใส่ซอส', 60, 130);
      c.fillStyle = '#4a8fd1'; c.font = `600 44px ${FONT}`; c.fillText('คุย → สร้าง → ใช้ Source → ต่อยอด', 60, 215);
      c.strokeStyle = '#e37c5b'; c.lineWidth = 6; c.beginPath(); c.moveTo(60, 250); c.bezierCurveTo(300, 300, 520, 230, 760, 270); c.stroke();
      c.fillStyle = '#44584b'; c.font = `500 36px ${FONT}`; c.fillText('บทเรียนฟรี 6 ด่าน · ไม่ต้องสมัคร', 60, 350);
    });
    const wb = group(g, cx - 1.1, 1.0, -D / 2 + 0.05);
    rb(wb, [3.4, 1.6, 0.06], [0, 0, 0], M('#9aa3a8', {metalness: 0.5, roughness: 0.35}), null, 0.02);
    plane(wb, [3.28, 1.48], [0, 0.8, 0.035], new THREE.MeshStandardMaterial({map: wbTex, roughness: 0.25}));
    rb(wb, [3.2, 0.05, 0.14], [0, -0.03, 0.08], M('#9aa3a8'));
    hot(wb, 'classroom');
    // course announcement easel → /courses/
    const ad = group(g, cx + 2.55, 0, -2.3); ad.rotation.y = -0.35;
    for (const dx of [-0.45, 0.45]) cy(ad, [0.03, 0.03, 2.0], [dx, 0, 0.1], wood('#8c6242')).rotation.x = -0.12;
    cy(ad, [0.03, 0.03, 1.9], [0, 0, -0.35], wood('#8c6242')).rotation.x = 0.25;
    const posterTex = tex.canvasTex(600, 840, (c) => {
      c.fillStyle = '#fbf6ec'; c.fillRect(0, 0, 600, 840);
      c.fillStyle = '#e37c5b'; c.fillRect(0, 0, 600, 110);
      c.fillStyle = '#ffffff'; c.font = `800 62px ${FONT}`; c.textAlign = 'center'; c.fillText('ประกาศ!', 300, 78);
      c.fillStyle = '#14281d'; c.font = `800 60px ${FONT}`; c.fillText('คอร์สเรียน', 300, 560); c.fillText('กับครูทีม', 300, 630);
      c.fillStyle = '#1d6b3d'; c.font = `600 34px ${FONT}`; c.fillText('เริ่มจาก AI ใส่ซอส', 300, 690);
      c.fillStyle = '#2e9e5b'; c.beginPath(); c.roundRect(150, 730, 300, 70, 35); c.fill(); c.fillStyle = '#fff'; c.font = `700 34px ${FONT}`; c.fillText('ดูรอบเรียน →', 300, 776);
    });
    const posterMat = new THREE.MeshStandardMaterial({map: posterTex, roughness: 0.5});
    const board = group(ad, 0, 1.0, 0.18); board.rotation.x = -0.12;
    rb(board, [1.1, 1.5, 0.04], [0, 0, 0], M('#ffffff'), null, 0.01);
    plane(board, [1.0, 1.4], [0, 0.75, 0.025], posterMat);
    plane(board, [0.86, 0.58], [0, 1.08, 0.03], photo('/img/classroom-hero.jpg'));
    hot(ad, 'courses');
    // four student desks, each laptop opens a different lesson
    const lessons = [['lv1', 'LV.1', 'Source', '#2e9e5b'], ['lv2', 'LV.2', 'Taste', '#e9b949'], ['lv3', 'LV.3', 'Cook', '#e37c5b'], ['lv4', 'LV.4', 'Split', '#4a8fd1']];
    [[-2.3, -0.8], [0.2, -0.8], [-2.3, 1.3], [0.2, 1.3]].forEach(([dx, dz], k) => {
      rb(g, [1.35, 0.05, 0.72], [cx + dx, 0.72, dz], wood('#e0c9a0'), null, 0.02);
      for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cy(g, [0.022, 0.022, 0.72], [cx + dx + lx, 0, dz + lz], M('#6b7075', {metalness: 0.6}));
      const [id, lv, name, col] = lessons[k];
      const lap = group(g, cx + dx, 0.77, dz + 0.05);
      rb(lap, [0.52, 0.02, 0.36], [0, 0, 0], M('#c9ced1', {metalness: 0.6, roughness: 0.3}), null, 0.01);
      const scrTex = tex.canvasTex(320, 200, c => { c.fillStyle = '#10201a'; c.fillRect(0, 0, 320, 200); c.fillStyle = col; c.beginPath(); c.roundRect(20, 22, 110, 40, 20); c.fill(); c.fillStyle = '#10201a'; c.font = `800 26px ${FONT}`; c.fillText(lv, 40, 51); c.fillStyle = '#fbf6ec'; c.font = `800 52px ${FONT}`; c.fillText(name, 20, 128); c.fillStyle = 'rgba(251,246,236,.5)'; c.font = `500 24px ${FONT}`; c.fillText('เปิดบทเรียน →', 20, 172); });
      const lid = group(lap, 0, 0.02, -0.17); lid.rotation.x = -0.25;
      rb(lid, [0.52, 0.34, 0.015], [0, 0, 0], M('#c9ced1', {metalness: 0.6, roughness: 0.3}), null, 0.008);
      plane(lid, [0.48, 0.3], [0, 0.17, 0.009], new THREE.MeshStandardMaterial({map: scrTex, emissive: '#ffffff', emissiveMap: scrTex, emissiveIntensity: 0.8}));
      hot(lap, id);
      rb(g, [0.44, 0.06, 0.42], [cx + dx, 0.44, dz + 0.65], fabric(col), null, 0.03); cy(g, [0.025, 0.025, 0.44], [cx + dx, 0, dz + 0.65], M('#6b7075'));
      rb(g, [0.44, 0.42, 0.05], [cx + dx, 0.5, dz + 0.86], fabric(col), null, 0.03);
    });
    // teacher desk with a sauce cup (the 7-minute intro lesson) and the AI orb
    rb(g, [1.4, 0.78, 0.62], [cx + 2.7, 0, 0.9], wood('#b98352'), null, 0.03);
    const sauce = group(g, cx + 2.4, 0.78, 0.85);
    cy(sauce, [0.13, 0.08, 0.07], [0, 0, 0], M('#ffffff', {roughness: 0.2}));
    cy(sauce, [0.115, 0.115, 0.01], [0, 0.06, 0], M('#b8411f', {roughness: 0.15}));
    cy(sauce, [0.01, 0.01, 0.24], [0.08, 0.04, 0], M('#d8d8d8', {metalness: 0.9, roughness: 0.2})).rotation.z = 0.9;
    hot(sauce, 'sauce-cup');
    const orb = group(g, cx + 3.0, 1.55, 0.9);
    orb.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({color: '#7fd1a4', wireframe: true, emissive: '#2e9e5b', emissiveIntensity: 1.2})));
    orb.add(new THREE.Mesh(geo('sph', [0.15]), new THREE.MeshStandardMaterial({color: '#e8fff1', emissive: '#7fe0a8', emissiveIntensity: 2})));
    out.tickers.push(t => { orb.rotation.y = t * 0.8; orb.rotation.x = t * 0.3; orb.position.y = 1.55 + Math.sin(t * 1.6) * 0.07; });
    plant(g, cx - 3.4, 2.7, 1);
    lampLight(cx, 2.7, 0.6, 7, 9);
  }

  /* ================= OFFICE / COMPUTER ROOM ================= */
  {
    const cx = 12, g = group(root);
    const skyTex = tex.canvasTex(512, 320, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd3f0'); gr.addColorStop(1, '#fbe3b4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(40,70,60,.35)'; for (let x = 0; x < w; x += 38) { const bh = 60 + (x * 37 % 110); c.fillRect(x, h - bh, 32, bh); } });
    plane(g, [1.6, 1.3], [cx + 3.0, 2.0, -D / 2 + 0.02], new THREE.MeshStandardMaterial({map: skyTex, emissive: '#ffffff', emissiveMap: skyTex, emissiveIntensity: 0.7}));
    rb(g, [1.76, 0.07, 0.18], [cx + 3.0, 1.3, -D / 2 + 0.09], '#ffffff', null, 0.01);
    // long desk along the back wall
    rb(g, [6.4, 0.07, 0.95], [cx - 0.7, 0.75, -2.85], wood('#a8744a'), null, 0.02);
    for (const dx of [-3.7, -0.7, 2.3]) rb(g, [0.07, 0.75, 0.85], [cx + dx, 0, -2.85], M('#2f3a35', {metalness: 0.4}), null, 0.01);
    // four monitors, each a different project
    const screens = [
      {id: 'xvisor', img: '/xvisor/xvisor-intro-hero.webp', tag: 'X-VISOR QUEST', col: '#e9b949'},
      {id: 'teambook', draw: 'teambook', tag: 'TeamBook', col: '#2e9e5b'},
      {id: 'xircle', img: '/xircle/assets/v3/hero-800.webp', tag: 'XIRCLE', col: '#4a8fd1'},
      {id: 'card', img: '/img/col-card.webp', tag: 'การ์ดประจำตัว', col: '#e37c5b'},
    ];
    screens.forEach((s, k) => {
      const mon = group(g, cx - 3.0 + k * 1.52, 0.82, -3.05); mon.rotation.y = (1.5 - k) * 0.06;
      rb(mon, [1.36, 0.82, 0.05], [0, 0.26, 0], M('#1b1f1d', {roughness: 0.4}), null, 0.02);
      let mat;
      if (s.img) mat = photo(s.img, true, '#223');
      else {
        const t = tex.canvasTex(512, 300, drawTeamBook(0)); out.screens.push({tex: t, draw: drawTeamBook});
        mat = new THREE.MeshStandardMaterial({map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.8});
      }
      plane(mon, [1.28, 0.72], [0, 0.67, 0.027], mat);
      const tag = plane(mon, [0.7, 0.12], [0, 0.2, 0.03], new THREE.MeshStandardMaterial({map: label(s.tag, 512, 88, s.col, '#10201a', 52)}));
      tag.castShadow = false;
      cy(mon, [0.03, 0.03, 0.26], [0, 0, 0], M('#1b1f1d')); rb(mon, [0.34, 0.02, 0.2], [0, 0, 0.02], M('#1b1f1d'), null, 0.005);
      hot(mon, s.id);
    });
    rb(g, [0.9, 0.03, 0.28], [cx - 0.7, 0.82, -2.45], M('#e9ecef', {roughness: 0.4}), null, 0.01);
    rb(g, [0.12, 0.03, 0.18], [cx + 0.1, 0.82, -2.45], M('#e9ecef'), null, 0.01);
    const mug = cy(g, [0.06, 0.05, 0.12], [cx + 1.6, 0.82, -2.5], '#e9b949');
    out.tickers.push(t => { mug.rotation.y = t; });
    // gaming chair
    const chair = group(g, cx - 0.7, 0, -1.7);
    cy(chair, [0.3, 0.3, 0.1], [0, 0.44, 0], fabric('#2f5d44')); rb(chair, [0.58, 0.8, 0.1], [0, 0.55, 0.3], fabric('#2f5d44'), [0.12, 0, 0], 0.05);
    cy(chair, [0.035, 0.035, 0.44], [0, 0, 0], M('#555555', {metalness: 0.7}));
    for (let k = 0; k < 5; k++) { const leg = rb(chair, [0.34, 0.04, 0.05], [Math.cos(k * 1.256) * 0.17, 0.04, Math.sin(k * 1.256) * 0.17], M('#333333'), [0, -k * 1.256, 0], 0.01); }
    // cork board with quest notes, server rack with blinking lights
    rb(g, [1.5, 0.9, 0.04], [cx + 0.9, 1.98, -D / 2 + 0.03], M('#ffffff', {map: tex.cork}), null, 0.01);
    const noteCols = ['#fff27a', '#ffc2d1', '#bdf0c9', '#b9dcff', '#ffd9a0', '#e3c9ff'];
    for (let k = 0; k < 6; k++) plane(g, [0.3, 0.26], [cx + 0.45 + (k % 3) * 0.45, 2.65 - Math.floor(k / 3) * 0.38, -D / 2 + 0.06], M(noteCols[k]), [0, 0, (k % 2 ? 1 : -1) * 0.06]);
    rb(g, [0.6, 1.5, 0.6], [cx - 3.6, 0, -1.2], M('#23282a', {roughness: 0.4, metalness: 0.4}), null, 0.02);
    const leds = [];
    for (let k = 0; k < 8; k++) leds.push(bx(g, [0.05, 0.03, 0.01], [cx - 3.6 - 0.18 + (k % 2) * 0.1, 0.25 + Math.floor(k / 2) * 0.3, -0.89], new THREE.MeshStandardMaterial({color: '#7fe0a8', emissive: '#7fe0a8', emissiveIntensity: 1})));
    out.tickers.push(t => { leds.forEach((l, k) => { l.material.emissiveIntensity = (Math.sin(t * (3 + k) + k) > 0) ? 1.6 : 0.2; }); });
    // trophy shelf (clover #4)
    rb(g, [1.3, 0.05, 0.3], [cx + 3.0, 1.1, -3.25], wood('#6b4a30'), null, 0.01);
    cy(g, [0.08, 0.12, 0.25], [cx + 2.6, 1.15, -3.25], M('#e9b949', {metalness: 0.9, roughness: 0.2}));
    plant(g, cx + 3.3, 2.4, 1.1);
    lampLight(cx - 0.7, 2.4, -1.5, 7, 8);
  }
  function drawTeamBook(step) {
    return (c, w, h) => {
      c.fillStyle = '#10201a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e9f5ee'; c.font = `700 34px ${FONT}`; c.fillText('TeamBook', 22, 46);
      c.fillStyle = 'rgba(233,245,238,.6)'; c.font = `500 20px ${FONT}`; c.fillText('สมุดกลุ่มมีชีวิต', 200, 44);
      const cols = ['#2e9e5b', '#e9b949', '#4a8fd1', '#e37c5b'];
      for (let col = 0; col < 3; col++) for (let r = 0; r < 4; r++) {
        const on = (r + col + step) % 5 === 0;
        c.fillStyle = on ? cols[(col + r) % 4] : 'rgba(233,245,238,.14)';
        c.beginPath(); c.roundRect(22 + col * 160, 70 + r * 56, 146, 44, 8); c.fill();
      }
    };
  }

  /* ---------- hero clover (→ /meet/) ---------- */
  const heroMat = out.heroMat = new THREE.MeshPhysicalMaterial({color: '#35b46a', roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#0d5a2f', emissiveIntensity: 0.35, sheen: 0.5, sheenColor: new THREE.Color('#b8ffd1')});
  const hc = out.heroClover = clover(heroMat); hc.scale.setScalar(2.1); hc.position.set(6.5, 8.4, 0.5); root.add(hc);
  hot(hc, 'meet');
  const halo = out.halo = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.72, 64), new THREE.MeshBasicMaterial({color: '#fff3b0', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false}));
  halo.position.copy(hc.position); root.add(halo);
  const cl = out.cloverLight = new THREE.PointLight('#9dffc3', 0, 14, 1.5); cl.position.set(6.5, 8.4, 2.5); root.add(cl);

  /* ---------- hidden clovers ---------- */
  const SPOTS = {living: [-9.0, 1.32, -3.1], kitchen: [-2.45, 1.12, -3.05], classroom: [5.0, 2.72, -D / 2 + 0.25], office: [15.4, 1.42, -3.25]};
  for (const id of CLOVER_ROOMS) {
    const m = new THREE.MeshStandardMaterial({color: '#39b86b', roughness: 0.3, emissive: '#1d8a48', emissiveIntensity: 0.5});
    const c = clover(m); c.scale.setScalar(0.17); c.position.set(...SPOTS[id]);
    c.add(new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 8), new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}))); // finger-sized hit area
    c.traverse(o => { o.userData.collect = id; });
    c.userData = {id, collect: id, base: new THREE.Vector3(...SPOTS[id]), hint: 0, gone: 0};
    c.visible = !found.has(id); root.add(c); out.collectibles.set(id, c);
  }

  /* ---------- hint beacons above every interactive object ---------- */
  const beaconTex = tex.canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,180,.9)'); g.addColorStop(0.5, 'rgba(255,220,120,.25)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 40, 0, 7); c.stroke();
  });
  const box3 = new THREE.Box3(), v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  for (const h of out.hotspots) {
    if (h.id === 'meet') continue;
    box3.setFromObject(h.root); box3.getCenter(v);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: beaconTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0}));
    s.position.set(v.x, box3.max.y + 0.22, v.z); s.scale.setScalar(0.28); s.renderOrder = 10; s.userData.item = h.id;
    root.add(s); h.beacon = s;
  }
  return out;
}
