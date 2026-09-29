// The stage: one WebGL2 canvas that draws the whole journey, driven only by scroll-time T (chapters, in units).
// T = chapterIndex + progressInsideChapter. Same T → same frame (idle drift aside), forwards or backwards.
import { getGL, program, persp, lookAt, rng, hex, clamp, lerp, smooth, sstep } from './gl.js';
import { SRC, TUN } from './shaders.js';

const STRIDE = 23; // H0(3) H1(3) H2(3) P(4) Q(4) C(3) DIR(3)
const cl = (z) => [TUN.A * Math.sin(z * 0.041), TUN.Y0 + TUN.B * Math.sin(z * 0.027 + 0.7), z];
const at = (z, ox = 0, oy = 0, oz = 0) => { const c = cl(z); return [c[0] + ox, c[1] + oy, c[2] + oz]; };
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// ── particle buffers ────────────────────────────────────────────────────────
class Buf {
  constructor() { this.a = []; }
  push(h0, h1, h2, p, q, c, d) { this.a.push(...h0, ...h1, ...h2, ...p, ...q, ...c, ...d); }
  get n() { return this.a.length / STRIDE; }
}
function shuffleBuf(buf, r) {
  const n = buf.n, idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const out = new Float32Array(buf.a.length);
  for (let i = 0; i < n; i++) out.set(buf.a.slice(idx[i] * STRIDE, idx[i] * STRIDE + STRIDE), i * STRIDE);
  return out;
}

function buildFood(r) {
  const rods = new Buf(), orbs = new Buf();
  const plateR = 9.6;
  const jit = (v, s) => v + (r() - 0.5) * s;
  const lift = (p, kind, seed) => {
    const rr = Math.hypot(p[0], p[2]) + 0.001;
    const h1 = [p[0] * 1.3 + (r() - .5) * 2, p[1] + 1.5 + r() * 5, p[2] * 1.3 + (r() - .5) * 2];
    const h2 = kind === 1
      ? (() => { const z = -7 - r() * 36, a = r() * 6.283, rd = Math.sqrt(r()) * 3.4; return at(z, Math.cos(a) * rd, Math.sin(a) * rd * .85); })()
      : [h1[0] * 1.1, h1[1] + 10 + r() * 6, h1[2] * 1.1];
    return [h1, h2];
  };
  // rice mound (absorbed)
  for (let i = 0; i < 2700; i++) {
    const rr = 3.7 * Math.sqrt(r()), a = r() * 6.283;
    const x = -2.4 + rr * Math.cos(a), z = 1.3 + rr * Math.sin(a) * 0.9;
    const heap = 1 - (rr / 3.7) ** 2;
    const y = 0.16 + 1.5 * heap * (0.55 + 0.45 * r());
    const b = r() * Math.PI, d = norm3([Math.cos(b), (r() - .5) * .5, Math.sin(b)]);
    const s = r(), k = 0.9 + 0.1 * r();
    const p = [x, y, z], [h1, h2] = lift(p, 0, s);
    rods.push(p, h1, h2, [0.4, 0.088, s, r()], [0, 0, 0, 0], [0.97 * k, 0.93 * k, 0.84 * k], d);
  }
  // greens (mostly fibre)
  const greens = [[.36, .64, .2], [.5, .76, .26], [.26, .52, .18], [.62, .8, .3]];
  for (let i = 0; i < 1250; i++) {
    const rr = 3.4 * Math.sqrt(r()), a = r() * 6.283;
    const p = [3.5 + rr * Math.cos(a), 0.14 + 0.75 * r() * (1 - rr / 4) + 0.1, -2.7 + rr * Math.sin(a) * 0.9];
    const b = r() * Math.PI, d = norm3([Math.cos(b), (r() - .5) * .8, Math.sin(b)]);
    const kind = r() < 0.7 ? 1 : 0, s = r();
    const [h1, h2] = lift(p, kind, s);
    const c = greens[Math.floor(r() * greens.length)];
    rods.push(p, h1, h2, [0.42 + 0.4 * r(), 0.052, s, r()], [1, kind, 0, 0], c, d);
  }
  // broccoli / green orbs (fibre)
  for (let i = 0; i < 110; i++) {
    const rr = 3.2 * Math.sqrt(r()), a = r() * 6.283, s = r();
    const p = [3.5 + rr * Math.cos(a), 0.4 + 0.5 * r(), -2.7 + rr * Math.sin(a) * 0.9];
    const [h1, h2] = lift(p, 1, s);
    orbs.push(p, h1, h2, [0.2 + 0.16 * r(), 0, s, r()], [1, 1, 0, 0], [.2, .44 + .12 * r(), .16], [1, 0, 0]);
  }
  // protein (absorbed)
  for (let i = 0; i < 200; i++) {
    const rr = 2.5 * Math.sqrt(r()), a = r() * 6.283, s = r();
    const p = [2.4 + rr * Math.cos(a), 0.3 + 0.35 * r(), 3.5 + rr * Math.sin(a)];
    const [h1, h2] = lift(p, 0, s), t = r();
    orbs.push(p, h1, h2, [0.26 + 0.24 * r(), 0, s, r()], [2, 0, 0, 0], [.66 + .1 * t, .43 + .1 * t, .22 + .06 * t], [1, 0, 0]);
  }
  // carrot + tomato (absorbed)
  for (let i = 0; i < 150; i++) {
    const rr = 3.6 * Math.sqrt(r()), a = r() * 6.283, s = r();
    const p = [3.3 + rr * Math.cos(a), 0.3 + 0.4 * r(), -2.4 + rr * Math.sin(a) * .9];
    const [h1, h2] = lift(p, 0, s);
    orbs.push(p, h1, h2, [0.17 + 0.12 * r(), 0, s, r()], [3, 0, 0, 0], [.96, .56 + .1 * r(), .14], [1, 0, 0]);
  }
  for (let i = 0; i < 55; i++) {
    const rr = 5 * Math.sqrt(r()), a = r() * 6.283, s = r();
    const p = [-.5 + rr * Math.cos(a), 0.3 + 0.3 * r(), 0.8 + rr * Math.sin(a) * .9];
    const [h1, h2] = lift(p, 0, s);
    orbs.push(p, h1, h2, [0.16 + 0.1 * r(), 0, s, r()], [4, 0, 0, 0], [.88, .2 + .06 * r(), .15], [1, 0, 0]);
  }
  // hidden fibre, gold (kept)
  for (let i = 0; i < 120; i++) {
    const rr = 7.4 * Math.sqrt(r()), a = r() * 6.283, s = r();
    const p = [rr * Math.cos(a), 0.3 + 1.3 * r() * (rr < 4 ? 1 : .3), rr * Math.sin(a) * .95];
    const b = r() * Math.PI, d = norm3([Math.cos(b), (r() - .5) * .9, Math.sin(b)]);
    const [h1, h2] = lift(p, 1, s);
    rods.push(p, h1, h2, [0.45 + 0.35 * r(), 0.042, s, r()], [5, 1, 0, 0], [.98, .78 + .08 * r(), .22], d);
  }
  // routine-lens ring (fibre)
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * 6.283 + r() * .04, R = 10.7 + r() * .5, s = r();
    const p = [R * Math.cos(a), 0.08, R * Math.sin(a)];
    const d = norm3([-Math.sin(a), 0.02, Math.cos(a)]);
    const [h1, h2] = lift(p, 1, s);
    rods.push(p, h1, h2, [0.5, 0.05, s, r()], [6, 1, 0, 0], [.98, .78, .25], d);
  }
  return { rods: shuffleBuf(rods, r), orbs: shuffleBuf(orbs, r), nr: rods.n, no: orbs.n, plateR };
}

function buildWall(r) {
  const b = new Buf();
  const cols = [[.93, .56, .5], [.87, .46, .43], [.96, .68, .56], [.74, .38, .38], [.9, .6, .52]];
  for (let i = 0; i < 4200; i++) {
    const z = -3 - r() * 195, th = r() * 6.283;
    const R = 5.0 + 0.5 * Math.sin(z * 0.35) + 0.3 * Math.sin(z * 0.9 + th * 2);
    const c = cl(z), cx = Math.cos(th), sy = Math.sin(th);
    const base = [c[0] + cx * R, c[1] + sy * R * 0.92, z];
    const d = norm3([-cx + (r() - .5) * .4, -sy + (r() - .5) * .4, -0.35 * r() - .1]);
    const col = cols[Math.floor(r() * cols.length)];
    const k = 0.85 + 0.3 * r();
    b.push(base, [0, 0, 0], [0, 0, 0], [0.4 + 0.5 * r(), 0.06 + 0.05 * r(), r(), r()], [0, 0, 0, 0], [col[0] * k, col[1] * k, col[2] * k], d);
  }
  return { data: shuffleBuf(b, r), n: b.n };
}

function buildMicro(r) {
  const rods = new Buf(), orbs = new Buf();
  const tints = [[.95, .52, .55], [.5, .8, .68], [.68, .6, .92], [.95, .72, .42]];
  const zr = [[-46, -14], [-80, -44], [-140, -82], [-190, -8]];
  const add = (buf, isRod, n, g, sizeF) => {
    for (let i = 0; i < n; i++) {
      const [za, zb] = zr[g];
      const z = za + (zb - za) * r();
      const a = r() * 6.283, rr = 1.5 + Math.sqrt(r()) * 2.9;
      const c = at(z, Math.cos(a) * rr, Math.sin(a) * rr * .85);
      // attractor offset
      let off;
      if (g === 0) off = [(r() - .5) * 7, (r() - .5) * 3, (r() - .5) * 3];
      else if (g === 1) { const q = r() * 6.283, w = 1 + r() * 2.4; off = [Math.cos(q) * w, Math.sin(q) * w * .8, (r() - .5) * 6]; }
      else if (g === 2) { const q = r() * 6.283, w = 1.5 + r() * 1.4; off = [Math.cos(q) * w, Math.sin(q) * w * .8, (r() - .5) * 46]; }
      else off = [0, 0, 0];
      const col = tints[Math.floor(r() * tints.length)], k = .9 + .2 * r();
      const d = norm3([r() - .5, r() - .5, r() - .5]);
      buf.push(c, off, [0, 0, 0], sizeF(), [0, 0, g, 0], [col[0] * k, col[1] * k, col[2] * k], d);
    }
  };
  for (let g = 0; g < 4; g++) {
    const nr = g === 3 ? 130 : 120, no = g === 3 ? 120 : 100;
    add(rods, true, nr, g, () => [0.55 + 0.6 * r(), 0.11 + 0.06 * r(), r(), r()]);
    add(orbs, false, no, g, () => [0.16 + 0.16 * r(), 0, r(), r()]);
  }
  return { rods: shuffleBuf(rods, r), orbs: shuffleBuf(orbs, r), nr: rods.n, no: orbs.n };
}

function buildStrand(r) {
  const b = new Buf();
  const gold = [1, .78, .25], grey = [.62, .63, .68], rose = [.95, .55, .56], rose2 = [1, .7, .68];
  const leaf = [.62, .84, .34], amber = [.96, .58, .24];
  for (let i = 0; i < 150; i++) b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0.3, 0.1, i / 150, r()], [0, 0, 0, 0], gold, [1, 0, 0]);
  for (let i = 0; i < 130; i++) b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0.3, 0.095, i / 130, r()], [1, 0, 0, 0], grey, [1, 0, 0]);
  b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [2.6, 0.62, 0.5, 0], [2, 0, 0, 0], rose, [1, 0, 0]);
  for (let i = 0; i < 64; i++) {
    const side = i % 2 ? 1 : -1;
    b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0.42 + 0.34 * r(), 0.032, (Math.floor(i / 2) + r() * .4) / 32, r()], [3, side, 0, 0], rose2, [1, 0, 0]);
  }
  const cs = [gold, leaf, amber];
  for (let k = 0; k < 3; k++) for (let i = 0; i < 260; i++) {
    b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0.24 + 0.08 * r(), 0.085, (i + r()) / 260, r()], [4 + k, 0, 0, 0], cs[k].map((v) => v * (.92 + .16 * r())), [1, 0, 0]);
  }
  return { data: new Float32Array(b.a), n: b.n };
}

function buildScfa(r) {
  const b = new Buf();
  const cols = [[1, .78, .3], [1, .55, .42], [1, .86, .25]];
  const A1 = at(-60);
  for (let i = 0; i < 300; i++) {
    const a = r() * 6.283, rr = 1.4 + r() * 3.4;
    const p = [A1[0] + Math.cos(a) * rr * .8, A1[1] + Math.sin(a) * rr * .7, A1[2] + (r() - .5) * 16];
    const d = norm3([Math.cos(a) + (r() - .5) * .5, Math.sin(a) + (r() - .5) * .5, (r() - .5) * .3]);
    const c = cols[i % 3];
    b.push(p, d, [0, 0, 0], [0.11 + 0.11 * r(), 0, r(), r()], [i % 3, 0, 0, 0], c, [1, 0, 0]);
  }
  return { data: new Float32Array(b.a), n: b.n };
}

function buildDust(r) {
  const b = new Buf();
  const cols = [[1, .82, .62], [1, .7, .55], [.95, .9, .75], [.85, .95, .7]];
  for (let i = 0; i < 380; i++) {
    const big = r() < .12;
    b.push([r() * 28, r() * 20, r() * 28], [0, 0, 0], [0, 0, 0], [big ? 0.28 + r() * .4 : 0.05 + r() * .16, 0, r(), r()], [r(), 0, 0, 0], cols[i % 4], [1, 0, 0]);
  }
  return { data: new Float32Array(b.a), n: b.n };
}

// ── palette / camera keys ───────────────────────────────────────────────────
const PAL = [
  // T, top, bottom, glow colour, glow x, y, strength, fog colour, fogD, vignette
  [0.0, '#faf4ea', '#f0dfc8', '#ffd3a8', .62, .5, .55, '#f6ead9', .004, .12],
  [1.9, '#faf3e8', '#efdcc3', '#ffd0a2', .6, .5, .5, '#f4e6d1', .004, .12],
  [2.2, '#e8d0ba', '#c19a84', '#ffc79a', .5, .5, .35, '#d9b9a0', .01, .18],
  [2.45, '#3f262d', '#1f1217', '#ff9a72', .5, .45, .28, '#170c10', .03, .3],
  [2.65, '#2f1a21', '#150b0f', '#ff9a72', .5, .45, .25, '#150a0e', .03, .3],
  [3.05, '#2a161c', '#0e070a', '#ff9d6e', .6, .5, .34, '#0d0709', .042, .35],
  [4.5, '#2b1a17', '#0e0808', '#ffb075', .55, .5, .38, '#0c0707', .04, .35],
  [5.4, '#2d1c12', '#0d0806', '#ffd067', .5, .5, .42, '#0b0705', .034, .35],
  [5.78, '#33200f', '#150d07', '#ffc45a', .5, .5, .4, '#100a05', .03, .3],
  [6.0, '#b9906d', '#d2b28f', '#ffd9b0', .62, .5, .3, '#c9a684', .003, .1],
  [6.9, '#c39b76', '#dcc09d', '#ffdcb6', .62, .5, .28, '#d2b391', .003, .1],
  [7.7, '#f2e3cf', '#ecd0b2', '#ffe1c2', .5, .5, .3, '#f0ddc6', .003, .1],
  [8.6, '#fbe9d7', '#f5c9a5', '#ffd8b4', .5, .55, .45, '#f8dcc0', .003, .1],
  [9.6, '#f6ede0', '#efdcc6', '#ffe3c6', .5, .55, .35, '#f3e4d0', .003, .1],
  [10, '#f6ede0', '#efdcc6', '#ffe3c6', .5, .55, .35, '#f3e4d0', .003, .1],
].map((k) => ({ t: k[0], top: hex(k[1]), bot: hex(k[2]), gc: hex(k[3]), gp: [k[4], k[5], k[6]], fog: hex(k[7]), fogD: k[8], vig: k[9] }));

const CAM = [
  // T, pos, target, fov(deg), focus, aperture
  [0.00, [0, 36, 11], [0, 0, 0.5], 34, 36, 1.5],
  [0.55, [1, 24, 8.5], [0.5, 0, 0], 33, 24, 2.2],
  [1.00, [2.5, 17, 8], [1, 0, -0.5], 32, 17, 3],
  [1.50, [-3, 14, 9], [0, 0, 0], 32, 14, 3],
  [1.95, [-7, 9.5, 13], [0, 2.5, 0], 34, 16, 3.2],
  [2.35, [0, 7, 4], [0, -4, -1], 40, 8, 2.2],
  [2.62, [0, -8, 3.5], [0, -20, 0], 42, 10, 1.5],
  [2.85, [0, -27, 3.5], [0, -31, -10], 44, 10, 1.5],
  [3.00, [...at(-1, 0, .3)], [...at(-20)], 46, 14, 1.6],
  [3.30, [...at(-15, 0, .4)], [...at(-28, 0, 0)], 44, 12, 4],
  [3.95, [...at(-18, .1, .3)], [...at(-28, 0, 0)], 44, 10, 4.5],
  [4.05, [...at(-30, 0, .2)], [...at(-46)], 46, 16, 3],
  [4.40, [...at(-44, .3, .2)], [...at(-60)], 46, 16, 3.2],
  [4.72, [...at(-52, 0, .4)], [...at(-62)], 46, 10, 4.5],
  [5.00, [...at(-72, 0, .2)], [...at(-95)], 46, 20, 2.6],
  [5.30, [...at(-94, 0, .3)], [...at(-116)], 46, 16, 3],
  [5.62, [...at(-104, .3, .3)], [...at(-124)], 46, 12, 3.5],
  [5.90, [...at(-124)], [...at(-150)], 46, 20, 2.4],
  [6.10, [...at(-152)], [...at(-182)], 46, 24, 1.5],
  [7.00, [...at(-160, 0, .5)], [...at(-192)], 46, 20, 1.5],
  [10.0, [...at(-170, 0, .5)], [...at(-202)], 46, 20, 1.5],
];

function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
function camAt(T) {
  let i = 0;
  while (i < CAM.length - 2 && T >= CAM[i + 1][0]) i++;
  const k0 = CAM[Math.max(i - 1, 0)], k1 = CAM[i], k2 = CAM[Math.min(i + 1, CAM.length - 1)], k3 = CAM[Math.min(i + 2, CAM.length - 1)];
  const u = clamp((T - k1[0]) / Math.max(k2[0] - k1[0], 1e-4));
  const v = (j) => Array.isArray(k1[j]) ? k1[j].map((_, a) => cr(k0[j][a], k1[j][a], k2[j][a], k3[j][a], smooth(u) * .35 + u * .65)) : cr(k0[j], k1[j], k2[j], k3[j], smooth(u) * .35 + u * .65);
  return { pos: v(1), tgt: v(2), fov: v(3), focus: v(4), aper: v(5) };
}
function palAt(T) {
  let i = 0;
  while (i < PAL.length - 2 && T >= PAL[i + 1].t) i++;
  const a = PAL[i], b = PAL[i + 1], u = smooth(clamp((T - a.t) / Math.max(b.t - a.t, 1e-4)));
  const m = (x, y) => x.map((v, j) => lerp(v, y[j], u));
  return { top: m(a.top, b.top), bot: m(a.bot, b.bot), gc: m(a.gc, b.gc), gp: m(a.gp, b.gp), fog: m(a.fog, b.fog), fogD: lerp(a.fogD, b.fogD, u), vig: lerp(a.vig, b.vig, u) };
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// ── stage factory ───────────────────────────────────────────────────────────
export function createStage(canvas) {
  const gl = getGL(canvas);
  if (!gl) return null;
  const P = {};
  try { for (const k in SRC) P[k] = program(gl, SRC[k][0], SRC[k][1]); }
  catch (e) { console.error(e); return null; }

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function group(data, n) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const F = 4, S = STRIDE * F, layout = [[1, 3, 0], [2, 3, 3], [3, 3, 6], [4, 4, 9], [5, 4, 13], [6, 3, 17], [7, 3, 20]];
    for (const [loc, size, off] of layout) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off * F); gl.vertexAttribDivisor(loc, 1); }
    gl.bindVertexArray(null);
    return { vao, n };
  }

  const rr = rng(20260930);
  const food = buildFood(rr), wall = buildWall(rr), micro = buildMicro(rr), strand = buildStrand(rr), scfa = buildScfa(rr), dust = buildDust(rr);
  const G = {
    foodRod: group(food.rods, food.nr), foodOrb: group(food.orbs, food.no),
    wall: group(wall.data, wall.n), microRod: group(micro.rods, micro.nr), microOrb: group(micro.orbs, micro.no),
    strand: group(strand.data, strand.n), scfa: group(scfa.data, scfa.n), dust: group(dust.data, dust.n),
  };
  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const emptyVAO = gl.createVertexArray();
  const TUBE = { ring: 114, seg: 380 };

  const V = new Float32Array(16), Pm = new Float32Array(16);
  let W = 1, H = 1;
  const S = { q: 1, dpr: 1 };
  const state = { tone: 0, bg: [1, 1, 1] };

  function resize(w, h, dpr) {
    W = Math.max(2, Math.floor(w * dpr)); H = Math.max(2, Math.floor(h * dpr));
    canvas.width = W; canvas.height = H; S.dpr = dpr;
    gl.viewport(0, 0, W, H);
  }

  const u1 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform1f(l, v); };
  const u3 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform3f(l, v[0], v[1], v[2]); };
  const u4 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform4f(l, v[0], v[1], v[2], v[3]); };
  const u2 = (p, n, a, b) => { const l = P[p].u[n]; if (l != null) gl.uniform2f(l, a, b); };

  function common(name, c, T, time, vis) {
    gl.useProgram(P[name].p);
    const u = P[name].u;
    gl.uniformMatrix4fv(u.uV, false, V); gl.uniformMatrix4fv(u.uP, false, Pm);
    u2(name, 'uRes', W, H); u1(name, 'uT', time); u1(name, 'uFocus', c.focus); u1(name, 'uAper', c.aper * S.dpr / 1.5 * 1.0);
    u3(name, 'uCam', c.pos); u1(name, 'uVis', vis); u1(name, 'uFogD', c.fogD);
    u3(name, 'uFog', c.fog); u1(name, 'uRim', name.startsWith('micro') || name === 'wall' ? 0.28 : name === 'strand' ? 0.6 : 1); u3(name, 'uLight', [-.35, .65, .7]); u1(name, 'uGlow', c.glow); u1(name, 'uExpo', c.expo);
  }
  const draw = (g, frac) => { gl.bindVertexArray(g.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.max(0, Math.floor(g.n * frac))); };

  function frame(s) {
    const { T, time, sideAt, layout, lens, pointer } = s;
    const q = S.q;
    const cam = camAt(T);
    const pal = palAt(T);
    const asp = W / H;
    // subject placement: text side → shift the subject the other way
    const side = sideAt(T);            // -1 text left, +1 text right, 0 centred
    const stack = layout === 'stack';
    const sx = stack ? 0 : -side * 0.3 * (1 + 0.0);
    const sy = stack ? 0.34 : 0;
    const px = (pointer[0] || 0) * 0.012, py = (pointer[1] || 0) * 0.008;
    persp(Pm, cam.fov * Math.PI / 180 * (stack ? 1.18 : 1), asp, 0.25, 420, sx + px, sy + py);
    const pos = cam.pos.slice();
    pos[0] += (pointer[0] || 0) * 0.35; pos[1] += (pointer[1] || 0) * 0.2;
    lookAt(V, pos, cam.tgt, [0, 1, 0]);
    // near-vertical look direction: use z-up hint to avoid degenerate basis
    const dl = norm3([cam.tgt[0] - pos[0], cam.tgt[1] - pos[1], cam.tgt[2] - pos[2]]);
    if (Math.abs(dl[1]) > 0.985) lookAt(V, pos, cam.tgt, [0, 0, -1]);

    const L = lum([(pal.top[0] + pal.bot[0]) / 2, (pal.top[1] + pal.bot[1]) / 2, (pal.top[2] + pal.bot[2]) / 2]);
    state.tone = L; state.bg = [(pal.top[0] + pal.bot[0]) / 2, (pal.top[1] + pal.bot[1]) / 2, (pal.top[2] + pal.bot[2]) / 2];

    const dark = 1 - sstep(.3, .5, L);
    const c = { pos, tgt: cam.tgt, focus: cam.focus, aper: cam.aper, fog: pal.fog, fogD: pal.fogD, glow: dark * .22 + .06, expo: 1 };

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    // background
    gl.useProgram(P.bg.p);
    u3('bg', 'uTop', pal.top); u3('bg', 'uBot', pal.bot); u3('bg', 'uGlowC', pal.gc); u3('bg', 'uGlowP', pal.gp); u1('bg', 'uAsp', asp); u1('bg', 'uVig', pal.vig);
    gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const w = sstep;
    // weights
    const m1 = w(1.7, 2.15, T), m2 = w(2.4, 2.9, T);
    const foodVis = 1 - w(2.75, 3.15, T);
    const plateVis = 1 - w(2.25, 2.6, T);
    const wallVis = w(2.55, 2.95, T) * (1 - w(5.85, 6.15, T));
    const microStage = w(2.8, 3.3, T), microVis = w(2.75, 3.05, T) * (1 - w(5.9, 6.2, T));
    const hero = w(3.0, 3.2, T) * (1 - w(3.95, 4.1, T));
    const grey = w(3.55, 3.75, T) * (1 - w(3.95, 4.1, T));
    const s0 = w(3.45, 3.75, T) * (1 - w(4.0, 4.25, T));
    const s1 = w(4.15, 4.45, T) * (1 - w(4.95, 5.2, T));
    const s2 = w(5.05, 5.4, T) * (1 - w(5.9, 6.1, T));
    const inCh5 = T >= 5.0;
    const strVis = inCh5 ? w(5.0, 5.15, T) * (1 - w(5.8, 5.95, T)) : w(4.05, 4.25, T) * (1 - w(4.85, 5.0, T));
    const scfaVis = w(4.5, 4.65, T) * (1 - w(4.95, 5.1, T));
    const kiwiVis = w(5.28, 5.4, T) * (1 - w(5.75, 5.9, T));
    const dustVis = 0.9;
    const dustCol = dark > .5 ? [1, .72, .5] : [1, .78, .58];

    // plate disc
    if (plateVis > 0.01) {
      gl.useProgram(P.disc.p);
      gl.uniformMatrix4fv(P.disc.u.uV, false, V); gl.uniformMatrix4fv(P.disc.u.uP, false, Pm);
      u1('disc', 'uR', food.plateR * 1.32); u1('disc', 'uVis', plateVis);
      gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // tunnel membrane + villi
    if (wallVis > 0.01) {
      gl.useProgram(P.tube.p);
      const tu = P.tube.u;
      gl.uniformMatrix4fv(tu.uV, false, V); gl.uniformMatrix4fv(tu.uP, false, Pm);
      u1('tube', 'uWall', wallVis); u3('tube', 'uCam', pos); u3('tube', 'uFog', pal.fog); u1('tube', 'uFogD', pal.fogD); u1('tube', 'uT', time);
      gl.bindVertexArray(emptyVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, TUBE.ring, TUBE.seg);
    }
    if (wallVis > 0.01) {
      common('wall', c, T, time, 1);
      u1('wall', 'uWall', wallVis);
      draw(G.wall, q * 0.7);
    }
    // microbes
    if (microVis > 0.01) {
      const heroAnchor = at(-28);
      const A0 = [heroAnchor[0] + 2.4, heroAnchor[1] + .5, heroAnchor[2]], A1 = at(-60), A2 = at(-126);
      for (const nm of ['microOrb', 'microRod']) {
        common(nm, c, T, time, microVis);
        u1(nm, 'uDimM', lerp(1, 0.4, hero) * lerp(1, 0.55, Math.max(s1, s2))); u3(nm, 'uAS', [s0, s1, s2]); u3(nm, 'uA0', A0); u3(nm, 'uA1', A1); u3(nm, 'uA2', A2); u1(nm, 'uMicro', microStage);
        draw(G[nm], q * 0.62);
      }
    }
    // hero + streams
    if (hero > 0.01 || strVis > 0.01) {
      common('strand', c, T, time, 1);
      u3('strand', 'uHero', at(-28)); u4('strand', 'uRope', [hero, grey, hero, 0]);
      u1('strand', 'uPulse', s0);
      if (inCh5) { u3('strand', 'uSVis', [strVis, 0, 0]); u3('strand', 'uSpd', [1.0, 0.42, 0.2]); u2('strand', 'uStream', pos[2] - 11, 60); u1('strand', 'uDiff', 1); }
      else { u3('strand', 'uSVis', [strVis, 0, 0]); u3('strand', 'uSpd', [.5, .5, .5]); u2('strand', 'uStream', pos[2] - 11, 44); u1('strand', 'uDiff', 0); }
      draw(G.strand, 1);
    }
    if (scfaVis > 0.01) {
      common('scfa', c, T, time, 1); u1('scfa', 'uScfa', scfaVis);
      draw(G.scfa, q);
    }
    // food
    if (foodVis > 0.01) {
      for (const nm of ['foodOrb', 'foodRod']) {
        common(nm, c, T, time, foodVis);
        u3(nm, 'uMixW', [1 - m1, m1 * (1 - m2), m1 * m2]); u1(nm, 'uDis', w(2.0, 2.6, T)); u3(nm, 'uLens', lens);
        draw(G[nm], nm === 'foodRod' ? 1 : 1);
      }
    }
    // kiwi
    if (kiwiVis > 0.01) {
      gl.useProgram(P.kiwi.p);
      gl.uniformMatrix4fv(P.kiwi.u.uV, false, V); gl.uniformMatrix4fv(P.kiwi.u.uP, false, Pm);
      u3('kiwi', 'uFog', pal.fog); u1('kiwi', 'uFogK', 0.12);
      const base = at(-113);
      const kk = [[[-3.4, .9, 0], [.98, .87, .34], [.88, .7, .16], .2], [[2.4, -.5, -2.2], [.72, .86, .38], [.4, .62, .17], -.15]];
      gl.bindVertexArray(quadVAO);
      kk.forEach((k, i) => {
        const bob = Math.sin(time * .5 + i * 2) * .12;
        u3('kiwi', 'uPos', [base[0] + k[0][0], base[1] + k[0][1] + bob, base[2] + k[0][2]]);
        u1('kiwi', 'uS', 2.0 - i * .1); u3('kiwi', 'uA', k[1]); u3('kiwi', 'uB', k[2]); u1('kiwi', 'uVis', kiwiVis); u1('kiwi', 'uRot', k[3] + time * .05 * (i ? -1 : 1));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    }
    // dust (bokeh) last
    common('dust', c, T, time, 1); u1('dust', 'uDust', dustVis); u3('dust', 'uDustCol', dustCol);
    draw(G.dust, q);

    gl.bindVertexArray(null);
    return state;
  }

  return { frame, resize, S, gl };
}
