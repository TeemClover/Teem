// B / Build stage — one WebGL2 canvas. T = chapter index + progress; same T → same frame (idle drift aside).
import { getGL, program, persp, lookAt, rng, hex, clamp, lerp, smooth, sstep } from './gl.js';
import { SRC } from './shaders.js';

const STRIDE = 23; // H0(3) H1(3) H2(3) P(4) Q(4) C(3) DIR(3)
class Buf {
  constructor() { this.a = []; }
  push(h0, h1, h2, p, q, c, d = [1, 0, 0]) { this.a.push(...h0, ...h1, ...h2, ...p, ...q, ...c, ...d); }
  get n() { return this.a.length / STRIDE; }
}
function shuffled(buf, r) {
  const n = buf.n, idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const out = new Float32Array(buf.a.length);
  for (let i = 0; i < n; i++) out.set(buf.a.slice(idx[i] * STRIDE, idx[i] * STRIDE + STRIDE), i * STRIDE);
  return out;
}

const PAL_F = [[.86, .5, .26], [.95, .71, .36], [.97, .92, .84], [.74, .77, .82], [.82, .46, .36]];
const PICK = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4];
const L = 72, NS = 360;
const BUNDLES = [
  { y: -3.4, z: -2.0, tilt: .012, n: 30, ring: .5, th: 0.041 },
  { y: -2.2, z: -4.6, tilt: -.01, n: 28, ring: .5, th: 0.041 },
  { y: -4.8, z: -4.2, tilt: .018, n: 28, ring: .5, th: 0.041 },
  { y: -1.4, z: -7.6, tilt: .006, n: 24, ring: .46, th: 0.044 },
  { y: -5.8, z: -7.8, tilt: -.014, n: 24, ring: .46, th: 0.044 },
  { y: -3.5, z: -10.6, tilt: .01, n: 22, ring: .5, th: 0.051 },
  { y: -1.0, z: -13.2, tilt: -.008, n: 20, ring: .5, th: 0.058 },
  { y: -6.2, z: -13.4, tilt: .012, n: 20, ring: .5, th: 0.058 },
  { y: -3.0, z: -17.2, tilt: -.006, n: 18, ring: .6, th: 0.068 },
  { y: -1.7, z: 1.9, tilt: .02, n: 14, ring: .9, th: 0.085 },   // foreground, out of focus for depth
];

function buildFibres(r) {
  const b = new Buf();
  BUNDLES.forEach((bd, bi) => {
    const x0 = (r() - .5) * 6;
    for (let s = 0; s < bd.n; s++) {
      const c = PAL_F[PICK[Math.floor(r() * PICK.length)]];
      const ph = r() * 6.283, twist = (r() < .5 ? -1 : 1) * (.7 + r() * .5) * .3, bandPh = r() * 4;
      const ringR = bd.ring * (.4 + .7 * r()), k = .92 + r() * .16;
      let g = 0;
      if (bi <= 2 && s % 3 === 0) g = 1; else if (bi <= 4 && s % 2 === 1) g = 2;
      const uw0 = (-6.5 - x0) / L + .5, uw1 = (6.5 - x0) / L + .5;
      const w1 = g === 2 ? (-3 - x0) / L + .5 : uw0, w2 = g === 2 ? (16 - x0) / L + .5 : uw1;
      b.push([x0, bd.y, bd.z], [ringR, twist, ph], [L, bi, bd.tilt], [bd.th * (.85 + .3 * r()), r(), 0, 0], [g, bandPh + s * .37, w1, w2], [c[0] * k, c[1] * k, c[2] * k]);
    }
  });
  return { data: shuffled(b, r), n: b.n };
}

function buildBeads(r) {
  const b = new Buf(), nChains = 40, nK = 28;
  const cols = [[.98, .93, .85], [.96, .74, .44], [.88, .54, .32], [.99, .86, .68]];
  for (let c = 0; c < nChains; c++) {
    const chain = (c + .5) / nChains, tone = cols[c % 4];
    for (let k = 0; k < nK; k++) {
      const grow = r() < .72;
      const bi = Math.floor(r() * 3);
      const bd = BUNDLES[bi];
      const ax = grow ? (r() - .5) * 13 : (r() - .5) * 30;
      const ay = bd.y + ax * bd.tilt + (r() - .5) * 1.8, az = bd.z + (r() - .5) * 1.8;
      const sc = [(r() - .5) * 2, (r() - .5) * 2, (r() - .5) * 2];
      const v = .92 + r() * .16;
      b.push([chain, k / (nK - 1), 0], [ax, ay, az], sc, [.065 + r() * .04, 0, r(), r()], [0, 0, 0, 0], [tone[0] * v, tone[1] * v, tone[2] * v]);
    }
  }
  return { data: shuffled(b, r), n: b.n };
}
function buildHero() { const b = new Buf(); b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1]); b.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [1, 1, 1]); return { data: new Float32Array(b.a), n: 2 }; }
function buildDust(r) {
  const b = new Buf(), cols = [[1, .85, .66], [1, .74, .55], [.97, .92, .8], [.96, .84, .62]];
  for (let i = 0; i < 320; i++) { const big = r() < .12; b.push([r() * 30, r() * 20, r() * 30], [0, 0, 0], [0, 0, 0], [big ? .26 + r() * .36 : .05 + r() * .15, 0, r(), r()], [r(), 0, 0, 0], cols[i % 4]); }
  return { data: new Float32Array(b.a), n: b.n };
}

// ── palette / camera ────────────────────────────────────────────────────────
const PAL = [
  // T, top, bottom, glow colour, glow x, y, strength, fog colour, fogD, vignette
  [0.0, '#fbf6ee', '#eddfca', '#ffe0b8', .62, .45, .5, '#f5eadb', .012, .1],
  [0.6, '#f8f0e3', '#e6d3b6', '#ffdcae', .6, .5, .5, '#f1e3cd', .012, .12],
  [1.05, '#eddcc4', '#d2b690', '#ffd0a0', .55, .5, .45, '#e6d2b2', .02, .16],
  [1.3, '#3c2a22', '#1b1310', '#ffb070', .55, .5, .38, '#1a120e', .03, .3],
  [2.0, '#32241d', '#150e0c', '#ffb377', .55, .5, .36, '#140d0a', .034, .32],
  [3.6, '#30231d', '#130d0b', '#ffbe85', .55, .5, .34, '#120c09', .034, .32],
  [4.0, '#27202a', '#0f0c12', '#e9dccb', .58, .5, .3, '#0e0b10', .034, .34],
  [4.9, '#2a2024', '#110c0f', '#f0d3b1', .58, .5, .34, '#0f0a0d', .03, .34],
  [5.3, '#8c7360', '#cdb195', '#ffdcb6', .6, .5, .36, '#c5aa8f', .012, .14],
  [5.65, '#f0e3d0', '#e8d0b2', '#ffe1c2', .6, .5, .32, '#eddcc6', .006, .1],
  [6.4, '#f7efe3', '#eedcc4', '#ffe3c6', .55, .5, .34, '#f3e6d3', .006, .1],
  [7.0, '#f7efe3', '#eedcc4', '#ffe3c6', .55, .5, .34, '#f3e6d3', .006, .1],
].map((k) => ({ t: k[0], top: hex(k[1]), bot: hex(k[2]), gc: hex(k[3]), gp: [k[4], k[5], k[6]], fog: hex(k[7]), fogD: k[8], vig: k[9] }));

const CAM = [
  // T, pos, target, fov, focus, aperture
  [0.00, [-4.5, -2.5, 4.6], [1.6, -3.7, -2.4], 32, 6.6, 2.6],
  [0.45, [-3.6, -2.6, 4.4], [2.4, -3.7, -2.4], 32, 6.4, 2.6],
  [0.58, [-7.5, 2.4, 9.5], [-0.5, 1.6, -3], 37, 12, 2.2],
  [0.78, [-9, 3.2, 10], [-1, 1.2, -3], 38, 13, 2.2],
  [1.05, [-6, 1.2, 8], [0, -2.4, -3], 36, 10, 2.4],
  [1.35, [-3, -2.4, 4.4], [0.5, -3.4, -2], 30, 6, 3],
  [1.85, [-1.5, -2.6, 4.1], [1.8, -3.3, -2], 30, 6, 3],
  [2.15, [0, -2.8, 6.5], [2.5, -3.6, -3], 34, 9, 2.6],
  [2.9, [4.5, -3.0, 7], [5.5, -3.7, -3], 34, 9, 2.6],
  [3.5, [2, -2.6, 8.5], [3.5, -3.7, -3], 35, 10, 2.4],
  [4.05, [5, -2.6, 3.8], [5.2, -3.4, -1], 28, 4.6, 3.4],
  [4.85, [5.2, -2.7, 3.6], [5.4, -3.4, -1], 28, 4.4, 3.4],
  [5.3, [3, -2, 9], [5, -3.4, -3], 34, 10, 2.4],
  [5.7, [0, -1.5, 34], [4, -3.4, -4], 30, 34, 1.2],
  [6.2, [0, -1.5, 36], [4, -0.6, -4], 30, 36, 1.1],
  [7.0, [0, -1.5, 40], [4, 0.8, -4], 30, 40, 1.0],
];
function cr(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
function camAt(T) {
  let i = 0; while (i < CAM.length - 2 && T >= CAM[i + 1][0]) i++;
  const k0 = CAM[Math.max(i - 1, 0)], k1 = CAM[i], k2 = CAM[Math.min(i + 1, CAM.length - 1)], k3 = CAM[Math.min(i + 2, CAM.length - 1)];
  const u = clamp((T - k1[0]) / Math.max(k2[0] - k1[0], 1e-4)), e = smooth(u) * .35 + u * .65;
  const v = (j) => Array.isArray(k1[j]) ? k1[j].map((_, a) => cr(k0[j][a], k1[j][a], k2[j][a], k3[j][a], e)) : cr(k0[j], k1[j], k2[j], k3[j], e);
  return { pos: v(1), tgt: v(2), fov: v(3), focus: v(4), aper: v(5) };
}
function palAt(T) {
  let i = 0; while (i < PAL.length - 2 && T >= PAL[i + 1].t) i++;
  const a = PAL[i], b = PAL[i + 1], u = smooth(clamp((T - a.t) / Math.max(b.t - a.t, 1e-4)));
  const m = (x, y) => x.map((v, j) => lerp(v, y[j], u));
  return { top: m(a.top, b.top), bot: m(a.bot, b.bot), gc: m(a.gc, b.gc), gp: m(a.gp, b.gp), fog: m(a.fog, b.fog), fogD: lerp(a.fogD, b.fogD, u), vig: lerp(a.vig, b.vig, u) };
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export function createStage(canvas) {
  const gl = getGL(canvas);
  if (!gl) return null;
  const P = {};
  try { for (const k in SRC) P[k] = program(gl, SRC[k][0], SRC[k][1]); } catch (e) { console.error(e); return null; }
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  function group(data, n) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const F = 4, S = STRIDE * F;
    for (const [loc, size, off] of [[1, 3, 0], [2, 3, 3], [3, 3, 6], [4, 4, 9], [5, 4, 13], [6, 3, 17], [7, 3, 20]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off * F); gl.vertexAttribDivisor(loc, 1); }
    gl.bindVertexArray(null);
    return { vao, n };
  }
  const rr = rng(20261001);
  const fibres = buildFibres(rr), beads = buildBeads(rr);
  const G = { fibre: group(fibres.data, fibres.n), bead: group(beads.data, beads.n), hero: (() => { const h = buildHero(); return group(h.data, h.n); })(), dust: (() => { const d = buildDust(rr); return group(d.data, d.n); })() };
  const quadVAO = gl.createVertexArray(); gl.bindVertexArray(quadVAO); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  const emptyVAO = gl.createVertexArray();

  const V = new Float32Array(16), Pm = new Float32Array(16);
  let W = 1, H = 1;
  const S = { q: 1, dpr: 1 };
  const state = { tone: 0 };
  function resize(w, h, dpr) { W = Math.max(2, Math.floor(w * dpr)); H = Math.max(2, Math.floor(h * dpr)); canvas.width = W; canvas.height = H; S.dpr = dpr; gl.viewport(0, 0, W, H); }
  const u1 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform1f(l, v); };
  const u2 = (p, n, a, b) => { const l = P[p].u[n]; if (l != null) gl.uniform2f(l, a, b); };
  const u3 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform3f(l, v[0], v[1], v[2]); };
  const u4 = (p, n, v) => { const l = P[p].u[n]; if (l != null) gl.uniform4f(l, v[0], v[1], v[2], v[3]); };
  function common(name, c, time, vis) {
    gl.useProgram(P[name].p);
    const u = P[name].u;
    gl.uniformMatrix4fv(u.uV, false, V); gl.uniformMatrix4fv(u.uP, false, Pm);
    u2(name, 'uRes', W, H); u1(name, 'uT', time); u1(name, 'uFocus', c.focus); u1(name, 'uAper', c.aper * S.dpr / 1.5);
    u3(name, 'uCam', c.pos); u1(name, 'uVis', vis); u1(name, 'uFogD', c.fogD);
    u3(name, 'uFog', c.fog); u3(name, 'uLight', [-.35, .65, .7]); u1(name, 'uGlow', c.glow); u1(name, 'uExpo', 1); u1(name, 'uRim', c.rim);
  }
  const draw = (g, frac) => { gl.bindVertexArray(g.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.max(0, Math.floor(g.n * frac))); };
  const drawRibbons = (g, frac) => { gl.bindVertexArray(g.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, NS * 2, Math.max(0, Math.floor(g.n * frac))); };

  function frame(s) {
    const { T, time, sideAt, layout, mode, pointer } = s;
    const q = S.q, cam = camAt(T), pal = palAt(T), asp = W / H;
    const side = sideAt(T), stack = layout === 'stack';
    const sx = stack ? 0 : -side * 0.3, sy = stack ? 0.32 : 0;
    persp(Pm, cam.fov * Math.PI / 180 * (stack ? 1.2 : 1), asp, 0.25, 500, sx + (pointer[0] || 0) * .012, sy + (pointer[1] || 0) * .008);
    const pos = cam.pos.slice(), tgt = cam.tgt.slice();
    // foundations: gentle camera character per mode
    const fm = sstep(3.0, 3.25, T) * (1 - sstep(3.8, 3.95, T));
    pos[0] += (mode[1] * -1.4 + mode[2] * 1.2) * fm; pos[2] += (mode[2] * 1.4 - mode[1] * .8) * fm;
    pos[0] += (pointer[0] || 0) * .3; pos[1] += (pointer[1] || 0) * .18;
    lookAt(V, pos, tgt, [0, 1, 0]);
    const Lm = lum([(pal.top[0] + pal.bot[0]) / 2, (pal.top[1] + pal.bot[1]) / 2, (pal.top[2] + pal.bot[2]) / 2]);
    state.tone = Lm;
    const dark = 1 - sstep(.3, .5, Lm);
    const c = { pos, focus: cam.focus, aper: cam.aper, fog: pal.fog, fogD: pal.fogD, glow: dark * .2 + .06, rim: lerp(1, .35, dark) };

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(P.bg.p);
    u3('bg', 'uTop', pal.top); u3('bg', 'uBot', pal.bot); u3('bg', 'uGlowC', pal.gc); u3('bg', 'uGlowP', pal.gp); u1('bg', 'uAsp', asp); u1('bg', 'uVig', pal.vig);
    gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const w = sstep;
    const membV = 1 - w(1.1, 1.6, T);
    const dig = w(.74, .98, T), cross = w(.92, 1.4, T), absorb = w(1.35, 1.9, T), reap = w(1.95, 2.35, T), loop = w(1.95, 2.4, T);
    const build = w(1.3, 1.9, T), turn = w(1.95, 2.3, T) * (1 - .5 * w(3.05, 3.3, T));
    const contract = w(5.0, 5.4, T), hmbVis = w(3.85, 4.05, T) * (1 - w(4.9, 5.05, T)), hmb = w(4.05, 4.5, T);
    const food = mode[0], resist = mode[1], rest = mode[2];

    if (membV > 0.01) {
      gl.useProgram(P.memb.p);
      gl.uniformMatrix4fv(P.memb.u.uV, false, V); gl.uniformMatrix4fv(P.memb.u.uP, false, Pm);
      u1('memb', 'uY', 0); u1('memb', 'uMemb', membV); u3('memb', 'uCam', pos); u3('memb', 'uFog', pal.fog); u1('memb', 'uT', time);
      gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    const dustPass = () => { common('dust', c, time, 1); u1('dust', 'uDust', dark > .5 ? .8 : .7); u3('dust', 'uDustCol', dark > .5 ? [1, .74, .52] : [1, .8, .6]); draw(G.dust, q); };
    dustPass();
    // fibres
    common('fibre', c, time, 1);
    u1('fibre', 'uBuild', build); u1('fibre', 'uTurn', turn); u1('fibre', 'uContract', contract); u1('fibre', 'uTension', resist * fm); u1('fibre', 'uCalm', rest * fm); u1('fibre', 'uPulse', contract);
    u1('fibre', 'uSide', side); u1('fibre', 'uSideK', stack ? 0 : .7);
    drawRibbons(G.fibre, Math.max(q, .5));
    dustPass();
    // beads
    const beadVis = 1 - w(4.05, 4.4, T) * .0;
    common('bead', c, time, beadVis * (1 - w(5.0, 5.35, T)));
    u4('bead', 'uBw', [dig, cross, absorb, reap]); u1('bead', 'uLoop', loop); u1('bead', 'uBeadA', 1); u1('bead', 'uBoost', 1 + .35 * food * fm);
    draw(G.bead, q * .5);
    if (hmbVis > .01) { common('hero', c, time, 1); u3('hero', 'uHmbPos', [5.0, -3.0, -0.6]); u1('hero', 'uHmb', hmb); u1('hero', 'uHmbVis', hmbVis); draw(G.hero, 1); }
    gl.bindVertexArray(null);
    return state;
  }
  return { frame, resize, S, gl };
}
