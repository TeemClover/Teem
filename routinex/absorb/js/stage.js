// The stage: one WebGL2 canvas that draws the whole journey, driven only by scroll-time T (chapters, in units).
// T = chapterIndex + progressInsideChapter. Same T → same frame (idle drift aside), forwards or backwards.
import { getGL, program, persp, lookAt, rng, hex, clamp, lerp, smooth, sstep } from './gl.js?v=arrival3';
import { SRC, TUN } from './shaders.js?v=journey3';

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
  // Sparse: 12 nutrient beads + 3 gold fibre strands. No plate, no rice mound.
  const rods = new Buf(), orbs = new Buf();
  const plateR = 9.6; // kept for API compat (disc is never drawn)
  const beadCols = [
    [.97,.93,.84],[.62,.84,.34],[.72,.85,.36],[.96,.58,.24],
    [.66,.50,.28],[.64,.82,.35],[.94,.54,.22],[.98,.88,.60],
    [.56,.76,.30],[.70,.48,.24],[.95,.72,.42],[.84,.90,.60],
  ];
  // 12 beads — absorbed nutrients, disperse before gut (cls=0, kind=0)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283 + r() * .3;
    const rr = 1.6 + r() * 1.8;
    const p = [Math.cos(a) * rr, .18 + r() * .4, Math.sin(a) * rr * .9];
    const h1 = [p[0] * 1.3 + (r() - .5) * 1.5, p[1] + 2 + r() * 3, p[2] * 1.3];
    const h2 = [h1[0] * 1.1, h1[1] + 8 + r() * 5, h1[2] * 1.1];
    orbs.push(p, h1, h2, [.16 + .14 * r(), 0, r(), r()], [0, 0, 0, 0], beadCols[i], [1, 0, 0]);
  }
  // 3 gold fibre strands — 20 contiguous curved segments each.
  // pts[i] are pre-computed so tangent direction is exact per segment.
  for (let s = 0; s < 3; s++) {
    const ang = (s / 3) * 6.283;
    const spin = s % 2 === 0 ? 1 : -1;
    const N = 20;
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N;
      const radius = 1.8 + t * 0.7;
      const twist = ang + t * 0.55 * spin;
      return [
        Math.cos(twist) * radius + Math.sin(t * Math.PI * 1.8) * 0.22,
        0.14 + t * 1.35 + Math.sin(t * Math.PI * 1.4) * 0.18,
        Math.sin(twist) * radius * 0.9 + Math.cos(t * Math.PI * 1.6) * 0.14,
      ];
    });
    // one gut destination per strand for a coherent trajectory
    const z2 = -10 - r() * 22, a2 = ang + (r() - .5) * 0.5, rd2 = 0.8 + r() * 1.6;
    const gutDest = at(z2, Math.cos(a2) * rd2, Math.sin(a2) * rd2 * .85);
    const phase = r(), seed = .1 + s * .07;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      const h0 = a.map((v, k) => (v + b[k]) * .5);
      const delta = b.map((v, k) => v - a[k]);
      const d = norm3(delta), length = Math.hypot(...delta) * 1.08;
      // Preserve the same arc and phase in every keyframe: no detached segments.
      const h1 = [h0[0], h0[1] + 3, h0[2]];
      const h2 = h0.map((v, k) => gutDest[k] + v);
      rods.push(h0, h1, h2, [length, .045, seed, phase], [5, 1, 0, 0], [.98, .81, .25], d);
    }
  }
  return { rods: shuffleBuf(rods, r), orbs: shuffleBuf(orbs, r), nr: rods.n, no: orbs.n, plateR };
}

function buildWall(r) {
  const b = new Buf();
  const cols = [[.93, .56, .5], [.87, .46, .43], [.96, .68, .56], [.74, .38, .38], [.9, .6, .52]];
  for (let i = 0; i < 180; i++) {
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
  // Fewer, more distinct organisms per scene zone.
  // g=0: SI wall boundary — cool blue-teal, elongated rods
  // g=1: fermentation — warm amber, rounder
  // g=2: colon colony — diverse hues, varied size
  // g=3: SCFA context — minimal rose+gold
  const rods = new Buf(), orbs = new Buf();
  const groupTints = [
    [[.62,.82,.95],[.50,.72,.88],[.72,.88,.96]],
    [[.95,.72,.42],[.88,.58,.32],[.98,.82,.48]],
    [[.50,.80,.68],[.62,.60,.92],[.68,.78,.92],[.92,.62,.72]],
    [[.95,.52,.55],[.98,.78,.36]],
  ];
  const counts = [[14, 10], [12, 16], [20, 14], [8, 6]];
  const zr = [[-46, -14], [-80, -44], [-140, -82], [-190, -8]];
  const add = (buf, n, g, sizeF) => {
    const tints = groupTints[g];
    for (let i = 0; i < n; i++) {
      const [za, zb] = zr[g];
      const z = za + (zb - za) * r();
      const a = r() * 6.283, rr = 1.5 + Math.sqrt(r()) * 2.9;
      const c = at(z, Math.cos(a) * rr, Math.sin(a) * rr * .85);
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
    const [nr, no] = counts[g];
    const rs = g === 0 ? () => [.80 + .50 * r(), .10 + .04 * r(), r(), r()]
             : g === 1 ? () => [.45 + .35 * r(), .13 + .05 * r(), r(), r()]
             : g === 2 ? () => [.55 + .50 * r(), .11 + .06 * r(), r(), r()]
                       : () => [.35 + .25 * r(), .09 + .03 * r(), r(), r()];
    const os = g === 1 ? () => [.22 + .18 * r(), 0, r(), r()] : () => [.14 + .12 * r(), 0, r(), r()];
    add(rods, nr, g, rs);
    add(orbs, no, g, os);
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
  for (let i = 0; i < 40; i++) {
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
  for (let i = 0; i < 50; i++) {
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
  [3.30, [...at(-15, 0, .4)], [...at(-28, 0, 0)], 42, 12, 3.5], // tight: absorption focus
  [3.95, [...at(-18, .1, .3)], [...at(-28, 0, 0)], 48, 10, 4.0], // wide peek before transition
  [4.05, [...at(-30, 0, .2)], [...at(-46)], 44, 16, 2.5], // deep focus: gold fibre path
  [4.40, [...at(-44, .3, .2)], [...at(-60)], 46, 16, 3.2],
  [4.72, [...at(-52, 0, .4)], [...at(-62)], 50, 10, 5.5], // wide+shallow: fermentation cloud
  [5.00, [...at(-72, 0, .2)], [...at(-95)], 44, 20, 2.0], // deep: SCFA distinct beat
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
    const nextW = Math.max(2, Math.floor(w * dpr)), nextH = Math.max(2, Math.floor(h * dpr));
    if (nextW === W && nextH === H && S.dpr === dpr) return;
    W = nextW; H = nextH;
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
    persp(Pm, cam.fov * Math.PI / 180 * (stack ? (1.18 + .52 * sstep(2.85, 3.05, T) * (1 - sstep(3.95, 4.15, T))) : 1), asp, 0.25, 420, sx + px, sy + py);
    const pos = cam.pos.slice();
    pos[0] += (pointer[0] || 0) * 0.35; pos[1] += (pointer[1] || 0) * 0.2;
    lookAt(V, pos, cam.tgt, [0, 1, 0]);
    // near-vertical look direction: use z-up hint to avoid degenerate basis
    const dl = norm3([cam.tgt[0] - pos[0], cam.tgt[1] - pos[1], cam.tgt[2] - pos[2]]);
    if (Math.abs(dl[1]) > 0.985) lookAt(V, pos, cam.tgt, [0, 0, -1]);

    // Project the actual final tube ring through this frame's camera, not a CSS guess.
    if (T > 5.5 && T < 6.3) {
      const end = cl(-0.5 - TUBE.seg * 0.52);
      const x = V[0]*end[0] + V[4]*end[1] + V[8]*end[2] + V[12];
      const y = V[1]*end[0] + V[5]*end[1] + V[9]*end[2] + V[13];
      const z = V[2]*end[0] + V[6]*end[1] + V[10]*end[2] + V[14];
      state.portal = z < -.25 ? [(1 + (Pm[0]*x + Pm[8]*z)/-z)/2, (1 - (Pm[5]*y + Pm[9]*z)/-z)/2] : null;
    } else state.portal = null;

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
    // Food appears after video fades out (~T=1.7); mix drives bead→gut trajectory.
    const m1 = w(1.70, 2.10, T), m2 = w(2.05, 2.42, T);
    const foodVis = w(1.65, 1.90, T) * (1 - w(2.75, 3.15, T));
    const plateVis = 0; // Opening plate is the authored meal illustration.
    const wallVis = w(2.55, 2.95, T) * (1 - w(5.85, 6.15, T));
    const microStage = w(2.8, 3.3, T), microVis = w(2.75, 3.05, T) * (1 - w(5.9, 6.2, T));
    const hero = w(3.0, 3.2, T) * (1 - w(3.95, 4.1, T));
    const grey = w(3.55, 3.75, T) * (1 - w(3.95, 4.1, T));
    const s0 = w(3.45, 3.75, T) * (1 - w(4.0, 4.25, T));
    const s1 = w(4.10, 4.24, T) * (1 - w(4.45, 4.65, T));
    const s2 = w(5.05, 5.4, T) * (1 - w(5.9, 6.1, T));
    const inCh5 = T >= 5.0;
    const strVis = inCh5 ? w(5.0, 5.15, T) * (1 - w(5.8, 5.95, T)) : w(4.05, 4.20, T) * (1 - w(4.40, 4.60, T));
    const scfaVis = w(4.28, 4.40, T) * (1 - w(4.95, 5.1, T));
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
