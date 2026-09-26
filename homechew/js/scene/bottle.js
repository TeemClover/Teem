/**
 * Prototype bottle family (PROXY — not the A03 production model).
 * Node names follow the product object contract in the pack's tech spec:
 * BottleGlass, SauceFill, FrontLabel, BackLabel, Cap, SealStrip.
 * Proportions are read from the concept stills; real dimensions are UNKNOWN.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group,
  LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  Plane, RepeatWrapping, SRGBColorSpace, Vector2, Vector3, FrontSide,
} from 'three';
import {BOTTLE, BOTTLE_CAVITY, bodyRadius, bottleLevelForVolume} from './timeline.js';
export {bodyRadius} from './timeline.js';
import {LABEL_SPEC, frontLabel, backLabel, sealStrip, sauceTexture} from './textures.js';

/* ---------- profiles ---------- */
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
  return [new Vector2(0, BOTTLE_CAVITY[0][0]), ...BOTTLE_CAVITY.map(([y, r]) => new Vector2(r, y)), new Vector2(0, 5.9)];
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

/** A real closed, horizontal liquid surface, cut from the same cavity as its shell. */
class LiquidSurface {
  constructor(shell, material) {
    this.shell = shell.attributes.position.array;
    const index = shell.index.array, edges = new Map();
    for (let i = 0; i < index.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = index[i + j], b = index[i + (j + 1) % 3];
      edges.set(Math.min(a, b) + ':' + Math.max(a, b), [a, b]);
    }
    this.edges = [...edges.values()];
    this.distances = new Float32Array(this.shell.length / 3);
    const max = 512, geo = new BufferGeometry();
    this.pos = new Float32Array((max + 2) * 3);
    this.normals = new Float32Array((max + 2) * 3);
    this.uv = new Float32Array((max + 2) * 2);
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new BufferAttribute(this.normals, 3));
    geo.setAttribute('uv', new BufferAttribute(this.uv, 2));
    geo.setIndex(Array.from({length: max}, (_, i) => [0, i + 1, i + 2]).flat());
    geo.setDrawRange(0, 0);
    this.mesh = new Mesh(geo, material);
    this.mesh.name = 'SauceFreeSurface';
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.vertices = 0;
  }

  update(normal, height) {
    const key = [...normal, height].map(v => v.toFixed(6)).join(':');
    if (this.last === key) return;
    this.last = key;
    const [nx, ny, nz] = normal, source = this.shell, distances = this.distances;
    for (let i = 0; i < distances.length; i++) distances[i] = nx * source[i * 3] + ny * source[i * 3 + 1] + nz * source[i * 3 + 2] - height;
    const points = new Map();
    for (const [a, b] of this.edges) {
      const da = distances[a], db = distances[b];
      if (da * db > 0 || Math.abs(da - db) < 1e-8) continue;
      const t = da / (da - db);
      const p = [0, 1, 2].map(k => source[a * 3 + k] + (source[b * 3 + k] - source[a * 3 + k]) * t);
      points.set(p.map(v => Math.round(v * 100000)).join(':'), p);
    }
    const contour = [...points.values()];
    this.vertices = contour.length;
    this.mesh.visible = contour.length >= 3;
    if (!this.mesh.visible) return;
    const center = contour.reduce((a, p) => a.map((v, i) => v + p[i] / contour.length), [0, 0, 0]);
    // The basis follows gravity even while the whole hero trio responds to the pointer.
    const tangent = Math.hypot(nx, ny) > 1e-6 ? new Vector3(ny, -nx, 0).normalize() : new Vector3(1, 0, 0);
    const bitangent = new Vector3(...normal).cross(tangent).normalize();
    const angle = p => Math.atan2((p[0] - center[0]) * bitangent.x + (p[1] - center[1]) * bitangent.y + (p[2] - center[2]) * bitangent.z, (p[0] - center[0]) * tangent.x + (p[1] - center[1]) * tangent.y + (p[2] - center[2]) * tangent.z);
    contour.sort((a, b) => angle(a) - angle(b));
    const vertex = (p, i) => {
      this.pos.set(p, i * 3);
      this.normals.set(normal, i * 3);
      this.uv[i * 2] = 0.5 + (p[0] * tangent.x + p[1] * tangent.y + p[2] * tangent.z) * 0.5;
      this.uv[i * 2 + 1] = 0.5 + (p[0] * bitangent.x + p[1] * bitangent.y + p[2] * bitangent.z) * 0.5;
    };
    vertex(center, 0);
    contour.forEach((p, i) => vertex(p, i + 1));
    vertex(contour[0], contour.length + 1);
    this.mesh.geometry.setDrawRange(0, contour.length * 3);
    for (const attr of Object.values(this.mesh.geometry.attributes)) attr.needsUpdate = true;
  }
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
  const sauceGeo = new LatheGeometry(sauceProfile(), 64);
  const sauce = new Mesh(sauceGeo, sauceMat);
  sauce.name = 'SauceFill';
  const surfaceMat = new MeshPhysicalMaterial({
    color: 0xeab375, map: sauceMap, roughness: 0.38, clearcoat: 0.06, clearcoatRoughness: 0.3,
    emissive: product.sauce.glow, emissiveIntensity: 0.16, envMapIntensity: 0.07, specularIntensity: 0.2,
  });
  const surface = new LiquidSurface(sauceGeo, surfaceMat);
  body.add(sauce, surface.mesh);

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

  const liquid = {volume: 0, worldLevel: BOTTLE.fillUpright, surface};
  function setLiquid(volume) {
    body.updateWorldMatrix(true, false);
    const m = body.matrixWorld.elements;
    const normal = [m[1], m[5], m[9]];
    const localLevel = bottleLevelForVolume(Math.acos(Math.max(-1, Math.min(1, normal[1]))), volume);
    clip.constant = m[13] + localLevel;
    surface.update(normal, localLevel);
    liquid.volume = volume;
    liquid.worldLevel = clip.constant;
  }
  return {root, pivot, body, cap, seal, clip, glassMesh, sauceMap, sauceMats: [sauceMat, surfaceMat], labelMat, liquid, setLiquid};
}
