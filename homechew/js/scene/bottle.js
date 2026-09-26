/**
 * Prototype bottle family (PROXY — not the A03 production model).
 * Node names follow the product object contract in the pack's tech spec:
 * BottleGlass, SauceFill, FrontLabel, BackLabel, Cap, SealStrip.
 * Proportions are read from the concept stills; real dimensions are UNKNOWN.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group,
  LatheGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  Plane, RepeatWrapping, SRGBColorSpace, Vector2, Vector3, BackSide, FrontSide,
} from 'three';
import {BOTTLE} from './timeline.js';
import {LABEL_SPEC, frontLabel, backLabel, sealStrip, sauceTexture} from './textures.js';

/* ---------- profiles ---------- */
export function bodyRadius(y) {
  const {radius: R, neckRadius: n} = BOTTLE;
  if (y <= 0.2) return 0.9 + 0.1 * Math.sin((y / 0.2) * Math.PI / 2);
  if (y <= 4.1) return R;
  if (y <= 5.2) {
    const t = (y - 4.1) / 1.1;
    // round shoulder: eases in slowly from the body, then settles into the neck
    return n + (R - n) * (1 + Math.cos(Math.PI * Math.pow(t, 0.85))) / 2;
  }
  return n;
}

function outerProfile() {
  const pts = [[0, 0.02], [0.6, 0.02], [0.8, 0.035]];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    pts.push([0.9 + 0.1 * Math.sin(a), 0.2 - 0.18 * Math.cos(a)]);
  }
  pts.push([1, 4.1]);
  for (let i = 1; i <= 24; i++) {
    const y = 4.1 + (1.1 * i) / 24;
    pts.push([bodyRadius(y), y]);
  }
  pts.push([BOTTLE.neckRadius, 5.64], [0.555, 5.68], [0.555, 5.88], [0.535, 5.94], [0.47, 5.955], [0.44, 5.9], [0.435, 5.6]);
  return pts.map(([x, y]) => new Vector2(x, y));
}

function sauceProfile() {
  const inset = 0.055;
  const pts = [[0, 0.15], [0.84, 0.15], [0.93, 0.24]];
  for (let y = 0.4; y <= 4.1; y += 0.5) pts.push([1 - inset, y]);
  for (let i = 0; i <= 24; i++) {
    const y = 4.1 + (1.1 * i) / 24;
    pts.push([bodyRadius(y) - inset, y]);
  }
  pts.push([BOTTLE.neckRadius - inset, 5.9], [0, 5.9]);
  return pts.map(([x, y]) => new Vector2(x, y));
}

function capProfile() {
  const h = BOTTLE.capTop - BOTTLE.capBottom, r = BOTTLE.capRadius;
  const pts = [[0, h]];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI / 2;
    pts.push([r - 0.05 + 0.05 * Math.sin(a), h - 0.05 + 0.05 * Math.cos(a)]);
  }
  pts.push([r, 0.06], [r - 0.015, 0.0], [r - 0.07, 0.0]);
  return pts.map(([x, y]) => new Vector2(x, y));
}

/**
 * Deterministic point cloud filling the sauce cavity, uniform by volume.
 * Used to keep the sauce volume constant when the bottle tips: the liquid level is the
 * height below which the right fraction of these points lies (see stage.js fillFor()).
 */
export function interiorSamples(n = 3000) {
  const inset = 0.055, y0 = 0.15, y1 = 5.9;
  const pts = new Float32Array(n * 3);
  let s = 12345, k = 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  while (k < n) {
    const x = rnd() * 2 - 1, z = rnd() * 2 - 1, y = y0 + rnd() * (y1 - y0);
    if (Math.hypot(x, z) > bodyRadius(y) - inset) continue;
    pts[k * 3] = x; pts[k * 3 + 1] = y; pts[k * 3 + 2] = z;
    k++;
  }
  return pts;
}

/* ---------- seal strip path (x = 0 plane: [z, y]) ---------- */
const SEAL_W = 0.5;
const SEAL_LIFT = 0.012;
export function sealPath() {
  const pts = [];
  const front = [];
  for (let y = 4.98; y <= 5.64; y += 0.06) front.push([bodyRadius(y) + SEAL_LIFT, y]);
  const cr = BOTTLE.capRadius + SEAL_LIFT, top = BOTTLE.capTop + SEAL_LIFT;
  front.push([cr, BOTTLE.capBottom + 0.03]);
  for (let y = BOTTLE.capBottom + 0.1; y < top - 0.05; y += 0.07) front.push([cr, y]);
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI / 2;
    front.push([cr - 0.05 + 0.05 * Math.cos(a), top - 0.05 + 0.05 * Math.sin(a)]);
  }
  pts.push(...front);
  const across = [];
  for (let i = 1; i < 10; i++) across.push([cr - 0.05 - (2 * (cr - 0.05) * i) / 10, top]);
  pts.push(...across);
  const back = front.slice().reverse().map(([z, y]) => [-z, y]);
  pts.push(...back);
  // resample by arc length
  const segs = [0];
  for (let i = 1; i < pts.length; i++) segs.push(segs[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = segs[segs.length - 1];
  const N = 120;
  const out = [];
  let j = 0;
  for (let k = 0; k <= N; k++) {
    const s = (L * k) / N;
    while (j < segs.length - 2 && segs[j + 1] < s) j++;
    const t = (s - segs[j]) / (segs[j + 1] - segs[j] || 1);
    out.push({s, z: pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, y: pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t});
  }
  for (let k = 0; k <= N; k++) {
    const a = out[Math.max(0, k - 1)], b = out[Math.min(N, k + 1)];
    const tz = b.z - a.z, ty = b.y - a.y, l = Math.hypot(tz, ty) || 1;
    out[k].tz = tz / l; out[k].ty = ty / l;
    // outward normal: rotate tangent so it points away from the bottle axis / up on top
    let nz = ty / l, ny = -tz / l;
    if (nz * out[k].z + ny * 0.001 < 0 && Math.abs(out[k].z) > 0.3) { nz = -nz; ny = -ny; }
    if (Math.abs(out[k].z) <= 0.3 && ny < 0) { nz = -nz; ny = -ny; }
    out[k].nz = nz; out[k].ny = ny;
  }
  // front printed run: neck + cap face, up to the rounded top edge (matches the board's strip aspect)
  const frontLen = out.find(p => p.y > BOTTLE.capTop - 0.04)?.s ?? L * 0.3;
  const topStart = out.find(p => p.y >= top - 0.001)?.s ?? L * 0.45;
  const topEnd = L - topStart;
  return {pts: out, L, frontFrac: frontLen / L, topFrac: (topEnd - topStart) / L};
}

class SealStrip {
  constructor(material) {
    this.path = sealPath();
    this.cols = 7;
    const n = this.path.pts.length;
    const geo = new BufferGeometry();
    this.pos = new Float32Array(n * this.cols * 3);
    const uv = new Float32Array(n * this.cols * 2);
    const idx = [];
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < this.cols; c++) {
        uv[(i * this.cols + c) * 2] = c / (this.cols - 1);
        uv[(i * this.cols + c) * 2 + 1] = this.path.pts[i].s / this.path.L;
        if (i < n - 1 && c < this.cols - 1) {
          const a = i * this.cols + c, b = a + 1, d = a + this.cols, e = d + 1;
          idx.push(a, d, b, b, d, e);
        }
      }
    }
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.geo = geo;
    this.mesh = new Mesh(geo, material);
    this.mesh.name = 'SealStrip';
    this.mesh.castShadow = true;
    this.last = -1;
    this.update(0, 0);
  }

  attached(p, w) {
    const vertical = Math.abs(p.ty) > 0.45;
    const rr = Math.max(Math.abs(p.z), 0.3);
    if (vertical) {
      const a = w / rr;
      return [rr * Math.sin(a), p.y, Math.sign(p.z) * rr * Math.cos(a)];
    }
    return [w, p.y, p.z];
  }

  /** peel ∈ [0,1] maps the peel front along the whole strip; drop ∈ [0,1] lets the free strip fall. */
  update(peel, drop) {
    const key = peel.toFixed(4) + ':' + drop.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    const {pts, L} = this.path;
    const sp = peel * L;
    // peel front sample
    let k = 0;
    while (k < pts.length - 1 && pts[k + 1].s <= sp) k++;
    const f = pts[Math.min(k, pts.length - 1)];
    // pulled up and back over itself, like a hand lifting the strip: stays in view above the cap
    const beta = (145 * Math.PI) / 180;
    const dz0 = -f.tz * Math.cos(beta) + f.nz * Math.sin(beta);
    const dy0 = -f.ty * Math.cos(beta) + f.ny * Math.sin(beta);
    const dropY = -drop * drop * 3.2, dropZ = -drop * 1.4;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      for (let c = 0; c < this.cols; c++) {
        const w = (c / (this.cols - 1) - 0.5) * SEAL_W;
        let x, y, z;
        if (p.s >= sp && peel < 1) {
          [x, y, z] = this.attached(p, w);
        } else {
          // only a short flap follows the peel front; the rest is already wound off in the hand
          const d = Math.min(sp - p.s, 0.75);
          const base = this.attached(f, w);
          const curl = -0.12 * d; // slight paper curl away from the glass
          const cz = dz0 * Math.cos(curl) - dy0 * Math.sin(curl);
          const cy = dz0 * Math.sin(curl) + dy0 * Math.cos(curl);
          x = base[0] * (1 - Math.min(1, d * 0.8) * 0.4);
          y = base[1] + cy * d - 0.015 * d * d;
          z = base[2] + cz * d;
        }
        const o = (i * this.cols + c) * 3;
        this.pos[o] = x;
        this.pos[o + 1] = y + dropY;
        this.pos[o + 2] = z + dropZ;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    this.mesh.material.opacity = 1 - Math.max(0, (drop - 0.55) / 0.45);
    this.mesh.visible = this.mesh.material.opacity > 0.01;
  }
}

/* ---------- factory ---------- */
function tex(canvas, anisotropy, srgb = true) {
  const t = new CanvasTexture(canvas);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

export function createGlassMaterial(tier) {
  if (tier === 'high' || tier === 'medium') {
    return new MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.012, transmission: 1, thickness: 0.18,
      ior: 1.47, envMapIntensity: 1.35, specularIntensity: 1, attenuationColor: 0xf6eee0,
      attenuationDistance: 12, clearcoat: 0.6, clearcoatRoughness: 0.02, side: FrontSide, transparent: false,
    });
  }
  return new MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22,
    envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side: FrontSide,
  });
}

/**
 * Build one bottle. Returns handles the stage animates each frame.
 * clip: a world-space Plane shared per bottle so the sauce surface stays level when tipped.
 */
export function createBottle(product, art, {glass, anisotropy = 4, withSeal = true, withBack = true}) {
  const root = new Group();
  root.name = product.id;
  const pivot = new Group(); // rotation happens about the bottle's middle
  pivot.position.y = BOTTLE.pivotY;
  root.add(pivot);
  const body = new Group();
  body.position.y = -BOTTLE.pivotY;
  pivot.add(body);

  const glassMesh = new Mesh(new LatheGeometry(outerProfile(), 96), glass);
  glassMesh.name = 'BottleGlass';
  glassMesh.castShadow = true;
  glassMesh.renderOrder = 2;
  body.add(glassMesh);

  const clip = new Plane(new Vector3(0, -1, 0), BOTTLE.fillUpright);
  const sauceMap = tex(sauceTexture(product), anisotropy);
  sauceMap.repeat.set(3, 2);
  sauceMap.wrapS = sauceMap.wrapT = RepeatWrapping;
  const sauceMat = new MeshPhysicalMaterial({
    color: 0xffffff, map: sauceMap, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25,
    emissive: product.sauce.glow, emissiveIntensity: 0.34, envMapIntensity: 0.6, clippingPlanes: [clip], side: FrontSide,
  });
  const sauceBack = new MeshBasicMaterial({color: product.sauce.surface, clippingPlanes: [clip], side: BackSide});
  const sauceGeo = new LatheGeometry(sauceProfile(), 64);
  const sauce = new Mesh(sauceGeo, sauceMat);
  sauce.name = 'SauceFill';
  const sauceSurface = new Mesh(sauceGeo, sauceBack); // back faces fake the level surface
  body.add(sauce, sauceSurface);

  const labelH = LABEL_SPEC.top - LABEL_SPEC.bottom;
  const labelMat = new MeshStandardMaterial({map: tex(frontLabel(art, product), anisotropy), roughness: 0.82, metalness: 0});
  const front = new Mesh(new CylinderGeometry(1.008, 1.008, labelH, 96, 1, true, -LABEL_SPEC.frontArc / 2, LABEL_SPEC.frontArc), labelMat);
  front.position.y = LABEL_SPEC.bottom + labelH / 2;
  front.name = 'FrontLabel';
  front.castShadow = true;
  body.add(front);
  if (withBack) {
    const backMat = new MeshStandardMaterial({map: tex(backLabel(art, product), anisotropy), roughness: 0.82});
    const back = new Mesh(new CylinderGeometry(1.008, 1.008, labelH, 48, 1, true, Math.PI - LABEL_SPEC.backArc / 2, LABEL_SPEC.backArc), backMat);
    back.position.y = front.position.y;
    back.name = 'BackLabel';
    body.add(back);
  }

  const cap = new Group();
  cap.name = 'Cap';
  cap.position.y = BOTTLE.capBottom;
  const capMesh = new Mesh(new LatheGeometry(capProfile(), 72), new MeshPhysicalMaterial({
    color: 0x16110d, roughness: 0.34, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.22, side: DoubleSide,
  }));
  capMesh.castShadow = true;
  cap.add(capMesh);
  body.add(cap);

  let seal = null;
  if (withSeal) {
    const path = sealPath();
    const sealMat = new MeshStandardMaterial({
      map: tex(sealStrip(art, path.frontFrac, path.topFrac, product.art), anisotropy), roughness: 0.86,
      side: DoubleSide, transparent: true, opacity: 1,
    });
    seal = new SealStrip(sealMat);
    body.add(seal.mesh);
  }

  return {root, pivot, body, cap, seal, clip, glassMesh, sauceMap, sauceMats: [sauceMat, sauceBack], labelMat};
}
