// Tutor: "บวกให้พอดี". Eight number orbs circle a core that shows a number. Tap two orbs that add up to it: they fuse
// into the core. A wrong pair costs 3 seconds; quick pairs in a row win a second back. Six pairs in 45 seconds wins.
// Keyboard: the arrows move between orbs, Space or Enter picks one.
const GOAL = 6, TIME = 45, TARGETS = [10, 12, 15], TAU = Math.PI * 2;

export function create(kit) {
  const {ctx} = kit, {clamp, rnd, pick, lerp, rgba, mix} = kit.u;
  let target = 10, time = TIME, got = 0, orbs = [], sel = null, focus = -1, rot = 0, coreHit = 0, streak = 0, lastGood = -9, refill = [];
  const N = 8;

  // where things are
  const L = () => {
    const {W, H} = kit, cx = W / 2, cy = H * .58;
    return {cx, cy, rx: Math.min(W * .4, H * .62), ry: H * .31, r: clamp(Math.min(W, H) * .068, 17, 28), core: clamp(Math.min(W, H) * .12, 30, 52)};
  };
  function place(o) {
    const {cx, cy, rx, ry, r} = L();
    const a = o.slot / N * TAU + rot, k = o.slot % 2 ? .84 : 1;
    const bob = Math.sin(kit.t * 1.3 + o.slot * 1.7) * r * .18;
    o.x = cx + Math.cos(a) * rx * k; o.y = cy + Math.sin(a) * ry * k + bob;
    o.s = 1 + .12 * Math.sin(a); // lower orbs are nearer, a little larger
    o.r = r * o.s;
    if (o.fly > 0) { const f = easeIn(o.fly); o.x = lerp(o.x, cx, f); o.y = lerp(o.y, cy, f); o.r *= 1 - f * .7; }
  }
  const easeIn = x => x * x * x;
  const easeBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  const live = () => orbs.filter(o => !o.fly);
  const has = v => live().some(o => o.v === v);
  // a value whose partner is not on the board, and that does not pair with another lone one
  function decoy() {
    for (let k = 0; k < 40; k++) { const v = Math.floor(rnd(1, target)); if (v * 2 !== target && !has(target - v) && !has(v)) return v; }
    return Math.floor(rnd(1, target));
  }
  function pairVals() { let a; do { a = Math.floor(rnd(1, target)); } while (a * 2 === target); return [a, target - a]; }
  function spawn(slot, v, delay = 0) { orbs.push({slot, v, born: -delay, fly: 0, err: 0, x: 0, y: 0, r: 0, s: 1}); }

  function select(o) {
    if (!o || o.fly) return;
    if (sel === o) { sel = null; kit.tone(420, .06, 'triangle', .04); return; }
    if (!sel) { sel = o; kit.tone(560 + o.v * 18, .08, 'triangle', .05); kit.say(`เลือก ${o.v}`); return; }
    const a = sel, b = o; sel = null;
    if (a.v + b.v === target) {
      a.fly = b.fly = .001;
      got++; kit.score(got);
      const quick = kit.t - lastGood < 2.6; lastGood = kit.t;
      streak = quick ? streak + 1 : 1;
      if (streak > 1) { time = Math.min(TIME, time + 1); kit.pop(`ไว ×${streak} +1 วิ`, kit.W / 2, kit.H * .2); } else kit.pop(`${a.v} + ${b.v} = ${target}`, kit.W / 2, kit.H * .2, .8);
      kit.chime(got); kit.noise(.18, .05, 3200); kit.buzz(20);
      kit.say(`${a.v} บวก ${b.v} ได้ ${target} ครบ ${got} คู่`);
      refill.push({at: kit.t + .55, slots: [a.slot, b.slot]});
      if (got >= GOAL) setTimeout(() => kit.win(), 450);
    } else {
      a.err = b.err = .45;
      time -= 3; streak = 0;
      kit.pop('−3 วิ', (a.x + b.x) / 2, Math.min(a.y, b.y) - 30, .8);
      kit.tone(150, .3, 'sawtooth', .06, .6); kit.buzz(50); kit.shake(.15);
      kit.say(`${a.v} บวก ${b.v} ได้ ${a.v + b.v} ไม่ใช่ ${target}`);
    }
  }
  const order = () => live().slice().sort((p, q) => p.slot - q.slot);

  function orb(o) {
    const born = clamp(o.born / .45, 0, 1), sc = o.born < 1 ? easeBack(born) : 1;
    if (sc <= 0) return;
    const r = o.r * sc, x = o.x + (o.err ? Math.sin(kit.t * 70) * 4 * (o.err / .45) : 0), y = o.y;
    const on = sel === o, bad = o.err > 0;
    const c = bad ? '#ff5a6a' : on ? '#ffffff' : kit.glowC;
    ctx.save();
    ctx.globalAlpha = 1 - o.fly * .6;
    // glow behind
    const gl = ctx.createRadialGradient(x, y, r * .6, x, y, r * 1.9); gl.addColorStop(0, rgba(c, on ? .55 : .3)); gl.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = gl; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    // the sphere: lit from the top left
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, mix(c, '#ffffff', .75)); g.addColorStop(.45, mix(c, '#05060a', .25)); g.addColorStop(1, mix(c, '#05060a', .72));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = on ? 2.5 : 1.4; ctx.strokeStyle = rgba(on ? '#ffffff' : kit.neon, .9); ctx.shadowColor = kit.neon; ctx.shadowBlur = on ? 18 : 8; ctx.stroke();
    ctx.shadowBlur = 0;
    // an orbit line around it
    ctx.strokeStyle = rgba(kit.neon, .35); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.35, r * .42, -.35, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = kit.font(Math.round(r * .95), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fillText(String(o.v), x, y + r * .04);
    ctx.restore();
    if (orbs.indexOf(o) === focus && !o.fly) { ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -kit.t * 20; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
  function core() {
    const {cx, cy, core: R} = L();
    const hit = coreHit;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (1.8 + hit));
    g.addColorStop(0, rgba(kit.neon, .35 + hit * .5)); g.addColorStop(1, rgba(kit.neon, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
    ctx.fillStyle = rgba(kit.deep, .75); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // the clock: a ring that empties
    ctx.lineWidth = 3; ctx.strokeStyle = rgba('#ffffff', .12); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = time < 10 ? '#ff8a8a' : kit.neon; ctx.shadowColor = kit.neon; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(time / TIME, 0, 1)); ctx.stroke();
    // two dashed rings turning opposite ways
    ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = rgba(kit.neon, .5); ctx.setLineDash([3, 7]);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(kit.t * .6); ctx.beginPath(); ctx.arc(0, 0, R * 1.28, 0, TAU); ctx.stroke(); ctx.rotate(-kit.t * 1.4); ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(0, 0, R * 1.46, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff'; ctx.font = kit.font(Math.round(R * (.95 + hit * .25)), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = kit.neon; ctx.shadowBlur = 16 + hit * 20; ctx.fillText(String(target), cx, cy + R * .05);
    ctx.restore();
    // the beam from a picked orb to the core
    if (sel) { ctx.save(); ctx.strokeStyle = rgba('#ffffff', .7); ctx.lineWidth = 2; ctx.shadowColor = kit.neon; ctx.shadowBlur = 12; ctx.setLineDash([8, 6]); ctx.lineDashOffset = kit.t * 40; ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.restore(); }
  }

  return {
    // for tests: two orbs that make the number, as points on the canvas
    hook: {
      get target() { return target; },
      pair() { const l = live(); for (const a of l) for (const b of l) if (a !== b && a.v + b.v === target && a.born >= .45 && b.born >= .45) return [[a.x, a.y], [b.x, b.y]]; return null; },
    },
    reset() {
      target = pick(TARGETS); time = TIME; got = 0; orbs = []; sel = null; focus = -1; streak = 0; lastGood = -9; refill = []; coreHit = 0;
      const vals = [...pairVals(), ...pairVals(), ...pairVals()];
      const slots = Array.from({length: N}, (_, i) => i).sort(() => Math.random() - .5);
      vals.forEach((v, i) => spawn(slots[i], v, i * .06));
      spawn(slots[6], decoy(), .4); spawn(slots[7], decoy(), .46);
      orbs.forEach(place);
    },
    update(dt) {
      rot += dt * .11;
      coreHit = Math.max(0, coreHit - dt * 2);
      if (kit.phase === 'play') { time -= dt; if (time <= 0) { time = 0; kit.lose(`ได้ ${got}/${GOAL} คู่`); } }
      orbs.forEach(o => {
        o.born += dt; o.err = Math.max(0, o.err - dt);
        if (o.fly) { o.fly = Math.min(1, o.fly + dt / .35); if (o.fly >= 1) { o.gone = true; coreHit = 1; kit.burst(L().cx, L().cy, 10, [kit.neon, '#ffffff'], .8); } }
      });
      if (orbs.some(o => o.gone)) { const f = orbs[focus]; orbs = orbs.filter(o => !o.gone); focus = f ? orbs.indexOf(f) : -1; }
      refill = refill.filter(r => { if (kit.t < r.at) return true; const [a, b] = pairVals(); spawn(r.slots[0], a); spawn(r.slots[1], b); return false; });
      orbs.forEach(place);
    },
    draw() {
      kit.background();
      orbs.forEach(place);
      // orbs above the core first, then the core, then the nearer ones
      const back = orbs.filter(o => o.y < L().cy && !o.fly), front = orbs.filter(o => o.y >= L().cy || o.fly);
      back.forEach(orb); core(); front.forEach(orb);
    },
    hud() { return {label: `คู่ ${got}/${GOAL}`, progress: got / GOAL, right: `${Math.ceil(time)} วิ`, warn: time < 10}; },
    down(x, y) {
      let best = null, bd = Infinity;
      for (const o of live()) { const d = Math.hypot(o.x - x, o.y - y); if (d < o.r * 1.4 && d < bd) { best = o; bd = d; } }
      if (best) { focus = -1; select(best); }
    },
    key(k) {
      const list = order();
      if (!list.length) return;
      let i = list.indexOf(orbs[focus]);
      if (k === 'ArrowRight' || k === 'ArrowDown') i = (i + 1) % list.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (i - 1 + list.length) % list.length;
      else if (k === ' ' || k === 'Enter') { if (i < 0) i = 0; else { select(list[i]); return; } }
      focus = orbs.indexOf(list[i]);
      kit.say(`เลข ${list[i].v}`);
    },
  };
}
