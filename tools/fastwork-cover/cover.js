/* Teem Clover — Fastwork motion cover.
   "One thread": three real pieces of work stand on one floor. A single lime thread leaves the
   sentence, runs the ring under them and wakes one piece at a time; then the ring turns.

   Everything on screen is a pure function of time t (seconds, 0 ≤ t < DUR), so frames can be
   rendered in any order and the last frame meets the first.  window.__cover.seek(t) draws time t. */
(() => {
  'use strict';

  // ── timing ──────────────────────────────────────────────────────────────────────────────
  const ACT = 4.5;               // seconds each piece holds the front
  const ACTS = 3;
  const DUR = ACT * ACTS;        // 13.5 s loop
  // one act, in seconds from its start. Rests are deliberate: arrive → rest → thread → wake → work → rest → turn → rest
  const K = {
    pulseOut: .45,  pulseAtFront: 1.27,  pulseGone: 3.02,     // the thread leaves the sentence, reaches the front piece, finishes its lap
    wakeUp: [1.2, 1.56],  wakeDown: [2.96, 3.26],              // front piece lit
    sheen: [1.26, 2.12],
    work: [1.52, 3.0],                                         // what happens inside the screen
    turn: [3.4, 4.45],                                         // the ring turns a third
    cross: [3.62, 4.14],                                       // the lit service hands over
  };
  const Q = new URLSearchParams(location.search);
  const STILL = Q.get('still') === '1';

  // ── camera (must match --persp / --ox / --oy in cover.css) ─────────────────────────────
  const D = 2200, OX = 1424, OY = 392;
  const CX = 1424, FY = 742;     // where the world origin (floor level) sits on the stage
  const YAW = 16;                // every slab faces the same way: right edge away from camera
  const th = YAW * Math.PI / 180;
  const L = [Math.cos(th), -Math.sin(th)];   // along a slab's base   (x, z)
  const N = [Math.sin(th), Math.cos(th)];    // out of a slab's face  (x, z)
  const project = (x, y, z) => { const k = D / (D - z); return [OX + (CX + x - OX) * k, OY + (FY + y - OY) * k, k]; };

  // ── the ring the pieces ride (lateral radius RA along L, depth radius RB along N) ───────
  const C0 = [75, -118];
  const RA = 400, RB = 350;
  const PHI0 = -36;              // rest angle of the front piece (0° = dead front)
  const TRACK_A = RA + 118, TRACK_B = RB + 92;   // the visible thread ring on the floor
  const ringPoint = (deg, a, b) => { const r = deg * Math.PI / 180, s = a * Math.sin(r), c = b * Math.cos(r); return [C0[0] + s * L[0] + c * N[0], C0[1] + s * L[1] + c * N[1]]; };

  // ── pieces ──────────────────────────────────────────────────────────────────────────────
  const SW = 680;                // slab width in world px
  const BAR = 44;                // window bar height
  const PIECES = [
    { id: 'web', url: 'myclover.com/homechew', screenH: 425, reflSrc: 'assets/work/homechew-page.jpg' },
    { id: 'system', url: 'myclover.com/showcase/erp-brand', screenH: 425, reflSrc: 'assets/work/erp.jpg' },
    { id: 'learn', url: 'myclover.com/classroom', screenH: 382.5, reflSrc: 'assets/work/trailer/f051.jpg' },
  ];
  const COPY_TOP = 325, TAG_MAX = 90, TAG_MEASURE = Number(Q.get('measure')) || 642;   // headline: largest size, and the width it must fit
  const TRAILER_FRAMES = 52;
  const CARD_L = -262, CARD_N = 66, CARD_YAW = -12;   // CORE7 card: offset from the classroom slab (along base, out of face) and its own yaw
  const SCROLL_MAX = 238;        // Homechew: how far the page scrolls inside its window (world px)
  // ERP attention path, in screen-texture px (texture is 1200 wide → scaled to SW)
  const ERP_STOPS = [[222, 119, 953, 93], [222, 223, 565, 275], [798, 223, 377, 405]].map((r) => r.map((v) => v * SW / 1200));

  // ── helpers ─────────────────────────────────────────────────────────────────────────────
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const easeInOutCubic = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeInOutQuart = (p) => (p < .5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
  const smooth = (p) => p * p * (3 - 2 * p);
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; };

  const stage = $('#stage');
  if (STILL) stage.classList.add('is-still');
  const worlds = ['#floorWorld', '#reflWorld', '#slabWorld'].map((s) => $(s));
  worlds.forEach((w) => { w.style.transform = `translate3d(${CX}px,${FY}px,0)`; });
  const [floorWorld, reflWorld, slabWorld] = worlds;

  // ── floor ───────────────────────────────────────────────────────────────────────────────
  const floor = el('div', 'floor', floorWorld);
  const floorO = el('div', '', floor);                       // world (x, z) → floor-local (x, y)
  floorO.style.cssText = 'position:absolute;left:1700px;top:1700px;width:0;height:0';
  const pool = el('div', 'pool', floorO); pool.style.position = 'absolute';

  // ── build pieces ────────────────────────────────────────────────────────────────────────
  const imgs = [];
  const load = (src) => { const i = new Image(); i.decoding = 'sync'; i.src = src; imgs.push(i); return i; };
  const EDGE_STEPS = 6, EDGE_GAP = 3.4;

  PIECES.forEach((p) => {
    p.h = p.screenH + BAR;
    const mk = (cls, parent) => { const n = el('div', cls, parent); n.style.top = `${-p.h}px`; n.style.height = `${p.h}px`; n.style.width = `${SW}px`; n.style.left = `${-SW / 2}px`; return n; };
    p.edges = Array.from({ length: EDGE_STEPS }, (_, k) => mk(k > 2 ? 'edge far' : 'edge', slabWorld));
    p.el = mk('slab', slabWorld);
    const bar = el('div', 'bar', p.el); el('i', '', bar); el('i', '', bar); el('i', '', bar);
    el('span', 'url', bar).textContent = p.url;
    p.screen = el('div', 'screen', p.el);
    p.glass = el('div', 'glass', p.el);
    p.sheen = el('div', 'sheen', p.el);
    p.wake = el('div', 'wake', p.el);
    p.dim = el('div', 'dim', p.el);
    p.shadow = el('div', 'shadow', floorO); p.shadow.style.position = 'absolute';
    p.refl = mk('refl', reflWorld); p.refl.style.backfaceVisibility = 'visible';
    const ri = el('img', '', p.refl); ri.src = p.reflSrc; ri.style.cssText = `position:absolute;left:0;top:${BAR}px;bottom:auto;width:${SW}px`;
  });

  // web — the real Homechew page scrolls under its sticky nav
  const web = PIECES[0];
  web.page = el('img', '', web.screen); web.page.src = 'assets/work/homechew-page.jpg'; web.page.style.width = `${SW}px`;
  web.nav = el('img', '', web.screen); web.nav.src = 'assets/work/homechew-nav.jpg'; web.nav.style.width = `${SW}px`;
  const NAV_TOP = 45 * SW / 1920;          // where the nav sits before it sticks (below the announcement bar)

  // system — the demo ERP overview, with attention walking KPI → chart → to-do
  const sys = PIECES[1];
  el('img', '', sys.screen).src = 'assets/work/erp.jpg'; sys.screen.firstChild.style.width = `${SW}px`;
  sys.focus = el('div', 'focus', sys.screen);

  // learn — real frames of the AI ใส่ซอส trailer, plus a CORE7 card standing with it
  const learn = PIECES[2];
  learn.canvas = el('canvas', '', learn.screen); learn.canvas.width = 960; learn.canvas.height = 540;
  learn.canvas.style.width = `${SW}px`; learn.canvas.style.height = `${learn.screenH}px`;
  learn.ctx = learn.canvas.getContext('2d');
  learn.flash = el('div', 'flash', learn.screen);
  learn.frames = Array.from({ length: TRAILER_FRAMES }, (_, i) => load(`assets/work/trailer/f${String(i).padStart(3, '0')}.jpg`));
  const card = { w: 186, h: 260 };
  card.el = el('div', 'card', slabWorld); card.el.style.cssText = `top:${-card.h}px;left:${-card.w / 2}px;width:${card.w}px;height:${card.h}px`;
  const cf = el('div', 'face front', card.el); el('img', '', cf).src = 'assets/work/card-back.webp'; card.dimF = el('div', 'dim', cf);
  const cb = el('div', 'face back', card.el); el('img', '', cb).src = 'assets/work/card-connect.webp'; card.dimB = el('div', 'dim', cb);
  card.shadow = el('div', 'shadow', floorO); card.shadow.style.cssText = 'position:absolute;width:260px;height:120px;margin:-60px 0 0 -130px';

  // ── copy ────────────────────────────────────────────────────────────────────────────────
  if (Q.get('tag')) $('.tag').textContent = Q.get('tag');     // try another headline without editing index.html
  const words = [...document.querySelectorAll('#svc .w')];
  words.forEach((w) => w.setAttribute('data-text', w.textContent));
  const tab = $('#tab');
  let geo = null;      // measured text + thread geometry (after fonts load)

  // ── thread geometry ─────────────────────────────────────────────────────────────────────
  const thLine = $('#thLine'), thGlow = $('#thGlow'), puHead = $('#puHead'), puTail = $('#puTail'), puHalo = $('#puHalo');
  const JOIN = -64;    // ring angle where the thread from the sentence merges into the ring
  function buildThread() {
    const fit = stage.getBoundingClientRect().width / 1920;
    const sr = stage.getBoundingClientRect();
    const rect = (n) => { const r = n.getBoundingClientRect(); return { l: (r.left - sr.left) / fit, t: (r.top - sr.top) / fit, r: (r.right - sr.left) / fit, b: (r.bottom - sr.top) / fit }; };
    // fit the headline to the measure of the block (the name sets the width), then re-centre the block
    const tagEl = $('.tag'), copyEl = $('#copy');
    tagEl.style.fontSize = `${TAG_MAX}px`;
    const rg = document.createRange(); rg.selectNodeContents(tagEl);
    const tagFs = Math.min(TAG_MAX, Math.floor(TAG_MAX * TAG_MEASURE / (rg.getBoundingClientRect().width / fit)));
    tagEl.style.fontSize = `${tagFs}px`;
    copyEl.style.setProperty('top', `${(COPY_TOP + (TAG_MAX - tagFs) * 1.22 / 2).toFixed(1)}px`, 'important');
    const copy = rect($('#copy')), svc = rect($('#svc'));
    const wr = words.map(rect);
    const ruleY = svc.b + 8;
    // rule under the services → on-ramp → one lap of the ring
    const ringPts = [];
    for (let d = 0; d <= 360; d += 3) { const [x, z] = ringPoint(JOIN + d, TRACK_A, TRACK_B); const [X, Y] = project(x, 0, z); ringPts.push([X, Y]); }
    const J = ringPts[0], J1 = ringPts[1];
    const tl = Math.hypot(J1[0] - J[0], J1[1] - J[1]); const tx = (J1[0] - J[0]) / tl, ty = (J1[1] - J[1]) / tl;
    const x0 = copy.l, xr = svc.r + 16;
    const ramp = `M${x0} ${ruleY} L${xr} ${ruleY} C${xr + 120} ${ruleY} ${J[0] - tx * 130} ${J[1] - ty * 130} ${J[0]} ${J[1]}`;
    const ring = ringPts.slice(1).map((p) => `L${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
    const d = `${ramp} ${ring}`;
    [thLine, thGlow, puHead, puTail, puHalo].forEach((p) => p.setAttribute('d', d));
    const total = thLine.getTotalLength();
    // where along the path is the dead-front of the ring (under the awake piece)?
    const front = ringPoint(PHI0, TRACK_A, TRACK_B); const [fx, fy] = project(front[0], 0, front[1]);
    let best = 0, bd = 1e9, joinAt = 0, jd = 1e9;
    for (let i = 0; i <= 1200; i++) {
      const s = total * i / 1200; const pt = thLine.getPointAtLength(s);
      const dd = Math.hypot(pt.x - fx, pt.y - fy); if (dd < bd && s < total * .6) { bd = dd; best = s; }
      const dj = Math.hypot(pt.x - J[0], pt.y - J[1]); if (dj < jd && s < total * .5) { jd = dj; joinAt = s; }
    }
    geo = { copy, svc, wr, ruleY, total, front: best, joinAt };
    tab.style.top = `${ruleY - copy.t - 2.5}px`;
  }

  // ── pose of every piece at time t ───────────────────────────────────────────────────────
  function ringAngle(i, t) {
    const a = Math.floor(t / ACT) % ACTS, tau = t - a * ACT;
    const turn = STILL ? 0 : easeInOutCubic(seg(tau, K.turn[0], K.turn[1]));
    return PHI0 - 120 * i + 120 * (a + turn);
  }
  const norm180 = (d) => { let v = ((d % 360) + 360) % 360; if (v > 180) v -= 360; return v; };

  function draw(t) {
    if (!geo) return;
    t = ((t % DUR) + DUR) % DUR;
    const act = Math.floor(t / ACT) % ACTS, tau = t - act * ACT;

    // how awake the front piece is
    const wake = STILL ? .55 : smooth(seg(tau, K.wakeUp[0], K.wakeUp[1])) * (1 - smooth(seg(tau, K.wakeDown[0], K.wakeDown[1])));
    const sheenP = STILL ? -1 : seg(tau, K.sheen[0], K.sheen[1]);

    const order = [];
    PIECES.forEach((p, i) => {
      const phi = ringAngle(i, t);
      const isFront = i === act;
      const [bx, bz] = ringPoint(phi, RA, RB);
      const lift = isFront ? wake * 26 : 0;
      const x = bx + N[0] * lift, z = bz + N[1] * lift;
      const depth = (x - C0[0]) * N[0] + (z - C0[1]) * N[1];          // along the face normal: + is nearer
      const far = clamp01((RB * Math.cos(PHI0 * Math.PI / 180) - depth) / (RB * 1.9));
      const base = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${YAW}deg)`;
      p.el.style.transform = base;
      p.el.style.filter = far > .02 ? `blur(${(far * 2.8).toFixed(2)}px)` : 'none';
      p.dim.style.opacity = (far * .46).toFixed(3);
      p.wake.style.opacity = isFront ? wake.toFixed(3) : 0;
      if (isFront && sheenP > 0 && sheenP < 1) { p.sheen.style.opacity = Math.sin(Math.PI * sheenP).toFixed(3); p.sheen.style.transform = `translateX(${lerp(-70, 250, easeInOutSine(sheenP)).toFixed(1)}%) skewX(-12deg)`; }
      else p.sheen.style.opacity = 0;
      p.edges.forEach((e, k) => { e.style.transform = `${base} translateZ(${(-(k + 1) * EDGE_GAP).toFixed(1)}px)`; e.style.filter = p.el.style.filter; e.style.opacity = (1 - far * .55).toFixed(3); });
      p.refl.style.transform = `${base} scaleY(-1)`;
      p.refl.style.opacity = (.3 * (1 - far * .7)).toFixed(3);
      p.shadow.style.transform = `translate(${x.toFixed(2)}px,${z.toFixed(2)}px) rotate(${-YAW}deg)`;
      p.shadow.style.opacity = (1 - far * .35).toFixed(3);
      p.pos = { x, z, depth, far, isFront };
      order.push({ depth, nodes: [...p.edges, p.el] });
      if (isFront) { pool.style.transform = `translate(${(x + N[0] * 60).toFixed(1)}px,${(z + N[1] * 60).toFixed(1)}px) rotate(${-YAW}deg)`; pool.style.opacity = (wake * .9).toFixed(3); }
    });

    // card stands just in front of the classroom slab, to its right
    {
      const p = learn.pos;
      const x = p.x + L[0] * CARD_L + N[0] * CARD_N, z = p.z + L[1] * CARD_L + N[1] * CARD_N;
      const isFront = act === 2;
      // turns to show a real card face (CONNECT), holds, and completes the turn back to the card back
      const spin = STILL || !isFront ? 0 : 180 * easeInOutCubic(seg(tau, K.work[0], K.work[0] + .52)) + 180 * easeInOutCubic(seg(tau, K.work[1] - .52, K.work[1]));
      card.el.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${(CARD_YAW + spin).toFixed(2)}deg)`;
      const f = `blur(${(p.far * 2.6).toFixed(2)}px)`;
      cf.style.filter = cb.style.filter = p.far > .02 ? f : 'none';
      card.dimF.style.opacity = card.dimB.style.opacity = (p.far * .55).toFixed(3);
      card.shadow.style.transform = `translate(${x.toFixed(2)}px,${z.toFixed(2)}px) rotate(${-CARD_YAW}deg)`;
      order.push({ depth: p.depth + CARD_N, nodes: [card.el] });
    }
    order.sort((a, b) => a.depth - b.depth);
    let zi = 10; order.forEach((o) => o.nodes.forEach((n) => { n.style.zIndex = zi++; }));

    // ── inside the screens ────────────────────────────────────────────────────────────────
    { // web: scroll while it is in front, wind back unseen while it rides the back of the ring
      let s = 0;
      if (!STILL) {
        if (act === 0) s = easeInOutCubic(seg(tau, K.work[0], K.work[1]));
        else if (act === 1) s = 1 - easeInOutSine(seg(tau, .5, 3.1));
      }
      const y = s * SCROLL_MAX;
      web.page.style.transform = `translate3d(0,${(-y).toFixed(2)}px,0)`;
      web.nav.style.transform = `translate3d(0,${Math.max(0, NAV_TOP - y).toFixed(2)}px,0)`;
    }
    { // system: attention walks through three real regions of the dashboard
      let o = 0, r = ERP_STOPS[0];
      if (!STILL && act === 1) {
        const [w0, w1] = K.work;
        o = smooth(seg(tau, w0 - .12, w0 + .16)) * (1 - smooth(seg(tau, w1 - .1, w1 + .2)));
        const p1 = easeInOutCubic(seg(tau, w0 + .42, w0 + .84)), p2 = easeInOutCubic(seg(tau, w0 + 1.0, w0 + 1.4));
        r = ERP_STOPS[0].map((v, k) => lerp(lerp(v, ERP_STOPS[1][k], p1), ERP_STOPS[2][k], p2));
      }
      sys.focus.style.opacity = o.toFixed(3);
      sys.focus.style.transform = `translate3d(${r[0].toFixed(2)}px,${r[1].toFixed(2)}px,0)`;
      sys.focus.style.width = `${r[2].toFixed(2)}px`; sys.focus.style.height = `${r[3].toFixed(2)}px`;
    }
    { // learn: play the real trailer frames once, ending on the resting frame
      let f = TRAILER_FRAMES - 1, fl = 0;
      if (!STILL && act === 2 && tau >= K.work[0] - .22) {
        const u = tau - (K.work[0] - .22);
        f = Math.min(TRAILER_FRAMES - 1, Math.round(u * 30));
        fl = (1 - seg(u, 0, .42)) * .5;
      }
      if (learn.shown !== f) { const im = learn.frames[f]; if (im.complete && im.naturalWidth) { learn.ctx.drawImage(im, 0, 0, 960, 540); learn.shown = f; } }
      learn.flash.style.opacity = fl.toFixed(3);
    }

    // ── copy: which service is lit ────────────────────────────────────────────────────────
    const cross = STILL ? 0 : easeInOutCubic(seg(tau, K.cross[0], K.cross[1]));
    words.forEach((w, i) => {
      const on = STILL ? 0 : i === act ? 1 - cross : i === (act + 1) % ACTS ? cross : 0;
      w.style.setProperty('--on', on.toFixed(3));
    });
    if (!STILL) {
      const a = geo.wr[act], b = geo.wr[(act + 1) % ACTS];
      tab.style.left = `${(lerp(a.l, b.l, cross) - geo.copy.l).toFixed(2)}px`;
      tab.style.width = `${lerp(a.r - a.l, b.r - b.l, cross).toFixed(2)}px`;
    }

    // ── the pulse ─────────────────────────────────────────────────────────────────────────
    const T = geo.total;
    if (STILL) {
      [puHead, puTail, puHalo].forEach((p) => { p.style.opacity = 0; });
      thLine.style.opacity = .72; thGlow.style.opacity = .3;
    } else {
      // leaves from under the lit word, reaches the front piece as it wakes, then runs the lap
      const start = geo.wr[act].l - geo.copy.l;
      const pos = tau < K.pulseAtFront
        ? lerp(start, geo.front, easeInOutCubic(seg(tau, K.pulseOut, K.pulseAtFront)))
        : lerp(geo.front, T + 40, easeInOutSine(seg(tau, K.pulseAtFront, K.pulseGone)));
      const vis = smooth(seg(tau, K.pulseOut, K.pulseOut + .2)) * (1 - smooth(seg(tau, K.pulseGone - .3, K.pulseGone)));
      const dash = (node, len, lead) => { const a = Math.max(0, pos - len), b = Math.min(T, pos + lead); node.setAttribute('stroke-dasharray', `0 ${a.toFixed(1)} ${Math.max(0, b - a).toFixed(1)} ${(T + 100).toFixed(1)}`); };
      dash(puHead, 46, 0); dash(puTail, 230, 0); dash(puHalo, 120, 14);
      puHead.style.opacity = vis.toFixed(3); puTail.style.opacity = (vis * .5).toFixed(3); puHalo.style.opacity = (vis * .55).toFixed(3);
    }
  }

  // ── boot ────────────────────────────────────────────────────────────────────────────────
  function fitStage() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--fit', Q.get('fit') === '0' ? 1 : Math.min(1, k));
  }
  const ready = (async () => {
    fitStage();
    await document.fonts.ready;
    await Promise.all([document.fonts.load('600 90px Fraunces', 'TEEM'), document.fonts.load('600 90px Kanit', 'AI ที่ใช้'), document.fonts.load('400 47px Kanit', 'ออกแบบ'), document.fonts.load('400 14px Kanit', 'a')]);
    const all = [...imgs, ...document.querySelectorAll('#stage img')];
    await Promise.all(all.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))));
    await Promise.all(all.map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
    buildThread();
    draw(STILL ? 0 : Number(Q.get('t')) || 0);
  })();

  let live = !STILL && !Q.has('t') && Q.get('paused') !== '1';
  const api = {
    DUR, ready,
    seek(t) { live = false; draw(t); },
    play() { live = true; },
  };
  window.__cover = api;
  addEventListener('resize', () => { fitStage(); if (geo) { buildThread(); } });
  ready.then(() => {
    const t0 = performance.now();
    const tick = (now) => { if (live) draw(((now - t0) / 1000) % DUR); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });

  ready.then(() => {
  // ── crop guides: what each Fastwork layout shows of a 16:9 cover (see README) ───────────
  // Fastwork's phone/tablet cover box is W × 200 CSS px, object-fit: cover, centred. The info panel
  // hides its last 36 px, and a 72 px avatar sits at left 16 px, 128 px below the cover top.
  if (Q.get('guides') === '1') {
    const g = $('#guides'); g.hidden = false;
    const add = (css, label, labelCss = '') => { const n = el('div', '', g); n.style.cssText = `position:absolute;${css}`; if (label) { const b = el('b', '', n); b.textContent = label; b.style.cssText = `position:absolute;white-space:nowrap;font-weight:500;${labelCss}`; } return n; };
    const tier = (W, color, label, labelSide) => {
      const s = 1920 / W, top = (W * 9 / 16 - 200) / 2;
      const y0 = Math.max(0, top * s), y1 = (top + 164) * s;
      add(`left:0;right:0;top:${y0}px;height:${y1 - y0}px;border-top:2px dashed ${color};border-bottom:2px dashed ${color};color:${color}`, label, `${labelSide}:14px;top:6px`);
      add(`left:${16 * s}px;top:${(top + 128) * s}px;width:${72 * s}px;height:${72 * s}px;border-radius:50%;border:2px dashed ${color};background:repeating-linear-gradient(45deg, ${color}33 0 10px, transparent 10px 20px)`);
    };
    tier(390, '#7fe3ff', 'มือถือ 390px — แถบที่เห็น (เส้นประบน–ล่าง) และรูปโปรไฟล์ (วงกลม)', 'right');
    tier(428, '#ffd36b', 'มือถือ 428px', 'right');
    tier(820, '#ff9ecf', 'แท็บเล็ต 820px', 'right');
    // owner-only chrome on a 428 px phone: menu button and Preview pill
    { const s = 1920 / 428, top = (428 * 9 / 16 - 200) / 2;
      add(`left:${16 * s}px;top:${(top + 8) * s}px;width:${40 * s}px;height:${40 * s}px;border-radius:${20 * s}px;border:2px dashed #ffd36b;background:#ffd36b22`);
      add(`left:${(428 - 16 - 107) * s}px;top:${(top + 8) * s}px;width:${107 * s}px;height:${40 * s}px;border-radius:${20 * s}px;border:2px dashed #ffd36b;background:#ffd36b22;color:#ffd36b`, 'ปุ่มของเจ้าของโปรไฟล์', 'left:10px;top:-30px'); }
    // the message layer
    if (geo) add(`left:${geo.copy.l - 18}px;top:${geo.copy.t + 6}px;width:${Math.max(...geo.wr.map((r) => r.r)) - geo.copy.l + 60}px;height:${geo.ruleY - geo.copy.t + 10}px;border:2.5px solid #d6ff7a;border-radius:10px;color:#d6ff7a`, 'ชั้นสารหลัก — เห็นครบทุกขนาดจอ', 'left:0;top:-32px');
  }
  });
})();
