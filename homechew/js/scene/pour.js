/**
 * Pour option A (tech spec): deterministic mesh ribbon + rising pool + ripple rings,
 * all driven by the scroll pose. No fluid simulation, no accumulated state.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, Group, LatheGeometry,
  Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace,
  SphereGeometry, Vector2,
} from 'three';
import {BOWL} from './timeline.js';
import {bowlTexture, rippleTexture} from './textures.js';

const R = BOWL.radius, D = BOWL.depth, B = BOWL.innerBottom;

// inner wall radius as a function of height above the slab
export function bowlInnerRadius(y) {
  const t = Math.min(1, Math.max(0, (y - B) / (D - B)));
  return 0.32 + (R - 0.1 - 0.32) * Math.sin(t * Math.PI / 2) ** 0.9;
}

function bowlProfile() {
  const pts = [[0, 0.004], [0.5, 0.004], [0.56, 0.02], [0.6, 0.06]];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    pts.push([0.6 + (R - 0.6) * Math.sin(t * Math.PI / 2) ** 0.8, 0.06 + (D - 0.06) * t]);
  }
  pts.push([R - 0.02, D + 0.025], [R - 0.07, D + 0.03], [R - 0.1, D]);
  for (let i = 15; i >= 0; i--) {
    const y = B + ((D - B) * i) / 16;
    pts.push([bowlInnerRadius(y), y]);
  }
  pts.push([0, B]);
  return pts.map(([x, y]) => new Vector2(x, y));
}

class Stream {
  constructor(material, rings = 56, sides = 14) {
    this.rings = rings; this.sides = sides;
    const geo = new BufferGeometry();
    this.pos = new Float32Array(rings * sides * 3);
    const idx = [];
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
        idx.push(a, c, b, b, c, d);
      }
    }
    const uv = new Float32Array(rings * sides * 2);
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
      uv[(i * sides + j) * 2] = j / sides;
      uv[(i * sides + j) * 2 + 1] = i / (rings - 1);
    }
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.geo = geo;
    this.mesh = new Mesh(geo, material);
    this.mesh.name = 'SauceRibbon';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    // the thread that is left when the pour stops breaks into a few beads (Plateau–Rayleigh)
    const dropGeo = new SphereGeometry(1, 16, 12);
    this.drops = Array.from({length: 6}, () => {
      const d = new Mesh(dropGeo, material);
      d.visible = false;
      this.mesh.add(d);
      return d;
    });
  }

  /**
   * Parabolic viscous ribbon from the mouth to the pool surface.
   * head/tail ∈ [0,1] trim the ribbon along its fall, so it can arrive and detach.
   */
  update({mouth, axis, head, tail}, surfaceY, contact, flow = 0) {
    const v0 = [axis[0] * 0.55, Math.max(-0.2, axis[1] * 0.4), 0];
    const g = -5.2;
    const start = [mouth[0] + axis[0] * 0.05, mouth[1] + axis[1] * 0.05, mouth[2]];
    // time to reach the surface: start.y + v0y t + g/2 t² = surfaceY
    const a = g / 2, b = v0[1], c = start[1] - surfaceY;
    const T = (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    // pull the landing point gently toward the bowl centre so the ribbon meets the pool
    const land = [start[0] + v0[0] * T, surfaceY, start[2]];
    const bend = [contact[0] - land[0], 0, contact[2] - land[2]];
    // a real pour never falls as a rod: a slow sideways sway travels down the ribbon with the scroll
    const at = f => {
      const t = f * T, k = f * f, sway = Math.sin(f * 5.5 - flow * 38) * 0.045 * Math.sin(Math.PI * Math.min(1, f * 1.15));
      return [start[0] + v0[0] * t + bend[0] * k + sway, start[1] + v0[1] * t + a * t * t, start[2] + v0[2] * t + bend[2] * k + sway * 0.6];
    };
    // breakup: when the tail has detached, the remaining thread above it beads into drops
    const breaking = tail > 0 && tail < 1;
    this.drops.forEach((d, i) => {
      d.visible = breaking;
      if (!breaking) return;
      const f = tail * (1 - (i + 1) / 7) + 0.02 * Math.sin(i * 2.1);
      const [x, y, z] = at(Math.max(0.01, f));
      const r = 0.05 * (1 - i / 8) * (0.7 + 0.6 * tail);
      d.position.set(x, y, z);
      d.scale.set(r, r * 1.35, r);
    });
    const t0 = tail, t1 = Math.max(tail + 0.001, head);
    const up = [0, 1, 0];
    for (let i = 0; i < this.rings; i++) {
      const f = t0 + ((t1 - t0) * i) / (this.rings - 1);
      const t = f * T;
      const [cx, cy, cz] = at(f);
      // thinning as it accelerates; slight bulge where it folds into the pool
      // viscous ribbon: wide lip at the mouth, thins as it falls, gentle deterministic ripples
      // (driven by the ribbon's own length, not time), soft bulge where it folds into the pool
      let r = 0.135 * (1 - 0.45 * Math.sqrt(f)) + 0.07 * Math.max(0, 1 - f / 0.07) + 0.06 * Math.max(0, (f - 0.88) / 0.12) ** 2;
      // varicose ripples travel down with the flow (scroll-driven, so rewinding plays them back)
      r *= 1 + 0.1 * Math.sin(f * 23 - flow * 60) + 0.05 * Math.sin(f * 51 + 1.3 - flow * 90);
      if (i === 0 || i === this.rings - 1) r *= 0.75;
      // tangent for ring orientation
      const vx = v0[0] + bend[0] * 2 * f / T, vy = v0[1] + 2 * a * t, vz = bend[2] * 2 * f / T;
      const vl = Math.hypot(vx, vy, vz) || 1;
      const tx = vx / vl, ty = vy / vl, tz = vz / vl;
      // basis perpendicular to tangent
      let nx = up[1] * tz - up[2] * ty, ny = up[2] * tx - up[0] * tz, nz = up[0] * ty - up[1] * tx;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-4) { nx = 1; ny = 0; nz = 0; nl = 1; }
      nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      for (let j = 0; j < this.sides; j++) {
        const ang = (j / this.sides) * Math.PI * 2;
        const ca = Math.cos(ang) * r, sa = Math.sin(ang) * r * 0.78; // slightly ribbon-flat
        const o = (i * this.sides + j) * 3;
        this.pos[o] = cx + nx * ca + bx * sa;
        this.pos[o + 1] = cy + ny * ca + by * sa;
        this.pos[o + 2] = cz + nz * ca + bz * sa;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    if (this.mesh.material.map) this.mesh.material.map.offset.y = flow * 9; // flecks travel down the ribbon
  }
}

export function createPour(product, anisotropy = 4, sauceMap = null) {
  const group = new Group();
  group.name = 'PourSet';
  const bowlMapCanvas = bowlTexture();
  const bowlMap = new CanvasTexture(bowlMapCanvas);
  bowlMap.colorSpace = SRGBColorSpace;
  bowlMap.anisotropy = anisotropy;
  const bowl = new Mesh(new LatheGeometry(bowlProfile(), 72), new MeshStandardMaterial({
    map: bowlMap, roughness: 0.62, metalness: 0, side: DoubleSide,
  }));
  bowl.name = 'DipBowl';
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  group.add(bowl);

  const poolMap = sauceMap ? sauceMap.clone() : null;
  if (poolMap) { poolMap.repeat.set(1.6, 1.6); poolMap.needsUpdate = true; }
  const sauceMat = new MeshPhysicalMaterial({
    color: 0xc4b3a4, map: poolMap, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.22,
    emissive: product.sauce.glow, emissiveIntensity: 0.3, envMapIntensity: 0.12, specularIntensity: 0.5,
  });
  const pool = new Mesh(new CircleGeometry(1, 64), sauceMat);
  pool.rotation.x = -Math.PI / 2;
  pool.name = 'SaucePool';
  pool.receiveShadow = true;
  group.add(pool);

  const rippleMap = new CanvasTexture(rippleTexture());
  const ripples = [0, 1].map(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
      color: 0xfff1dc, alphaMap: rippleMap, transparent: true, opacity: 0, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    group.add(m);
    return m;
  });

  // where the ribbon lands, sauce piles up briefly before it spreads (viscous coiling)
  const mound = new Mesh(new SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), sauceMat);
  mound.visible = false;
  group.add(mound);

  const streamMap = sauceMap ? sauceMap.clone() : null;
  if (streamMap) { streamMap.repeat.set(1, 4); streamMap.needsUpdate = true; }
  const streamMat = new MeshPhysicalMaterial({
    color: 0xffffff, map: streamMap, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06,
    emissive: product.sauce.glow, emissiveIntensity: 0.3, envMapIntensity: 0.7, side: DoubleSide,
  });
  const stream = new Stream(streamMat);
  stream.mesh.visible = false;

  return {
    group,
    stream,
    /** @param p pose from timeline.js */
    update(p) {
      const [bx, by, bz] = p.bowl.pos;
      group.position.set(bx, by, bz);
      group.visible = p.bowl.visible;
      const level = B + 0.012 + (D - B - 0.14) * p.pool.level;
      pool.visible = p.pool.level > 0.002;
      const rr = bowlInnerRadius(level) - 0.01;
      pool.scale.set(rr, rr, 1);
      pool.position.y = level;
      // contact point: slightly off-centre toward the bottle side
      const contactLocal = [0.12, level, 0];
      const pouring = p.stream.on;
      ripples.forEach((m, i) => {
        const phase = (p.u * 22 + i * 0.5) % 1;
        const live = pouring && p.pool.level > 0.03;
        m.visible = live;
        m.position.set(contactLocal[0], level + 0.004 + i * 0.001, contactLocal[2]);
        const s = 0.25 + phase * Math.min(rr * 1.4, 1.2);
        m.scale.set(s, s, 1);
        m.material.opacity = live ? 0.55 * (1 - phase) : 0;
      });
      stream.mesh.visible = pouring;
      const landed = pouring && p.stream.head >= 1 && p.stream.tail < 0.9;
      mound.visible = landed;
      if (landed) {
        const pulse = 1 + 0.12 * Math.sin(p.u * 80);
        mound.position.set(contactLocal[0], level - 0.01, contactLocal[2]);
        mound.scale.set(0.26 * pulse, 0.085 * (1 - p.stream.tail), 0.26 * pulse);
      }
      if (pouring) {
        stream.update(p.stream, by + level, [bx + contactLocal[0], by + level, bz + contactLocal[2]], p.u);
      }
    },
  };
}
