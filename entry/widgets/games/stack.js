// Café: "ซ้อนเค้กให้สูง". A cake layer slides over the tower; tap (or Space) to drop it. What hangs over is cut off and
// falls; a perfect drop keeps the full size, and three in a row grow it back a little. Stack 10 layers to win.
// Isometric 3D on a glass pedestal, neon edges in the style's colour.
const GOAL = 10;

export function create(kit) {
  const {ctx, box} = kit, {clamp, lerp, rgba, mod} = kit.u;
  const LH = .2, BASE = 1;
  let S = 60, layers = [], moving = null, falling = [], rings = [], camY = 0, combo = 0, glow = 0;
  const cake = k => ({top: ['#fff3df', '#f6d9a8', '#fff3df'][mod(k, 3)], left: ['#d9a46a', '#7a4a2a', '#e8c08a'][mod(k, 3)], right: ['#c38c55', '#5f3820', '#d3a771'][mod(k, 3)]});
  const glass = () => ({top: rgba(kit.neon, .22), left: rgba(kit.glowC, .28), right: rgba(kit.glowC, .18)});

  const iso = (x, y, z) => [kit.W / 2 + (x - z) * S * .866, kit.H * .8 + (x + z) * S * .5 - (y - camY) * S];
  function poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }

  function slab(b, k, {alpha = 1, lit = 0} = {}) {
    const {x0, x1, z0, z1, y} = b, top = y + LH;
    const T = [iso(x0, top, z0), iso(x1, top, z0), iso(x1, top, z1), iso(x0, top, z1)];
    const L = [iso(x0, top, z1), iso(x1, top, z1), iso(x1, y, z1), iso(x0, y, z1)];
    const R = [iso(x1, top, z0), iso(x1, top, z1), iso(x1, y, z1), iso(x1, y, z0)];
    const sk = b.base ? glass() : cake(k);
    ctx.save(); ctx.globalAlpha *= alpha;
    poly(L); ctx.fillStyle = sk.left; ctx.fill();
    poly(R); ctx.fillStyle = sk.right; ctx.fill();
    poly(T); ctx.fillStyle = sk.top; ctx.fill();
    if (!b.base) {
      // sprinkles on top, a cream line through the side
      ctx.save(); poly(T); ctx.clip(); for (let i = 0; i < 9; i++) { const u = ((k * 7 + i * 13) % 17) / 17, w2 = ((k * 11 + i * 5) % 19) / 19; const [px, py] = iso(lerp(x0, x1, u), top, lerp(z0, z1, w2)); ctx.fillStyle = ['#ff6b8a', '#6bc5ff', '#ffd23f', '#7ad7a0'][i % 4]; ctx.fillRect(px - 1.5, py - .8, 3, 1.6); } ctx.restore();
      ctx.save(); poly(L); ctx.clip(); const [a1, a2] = iso(x0, y + LH * .5, z1), [b1, b2] = iso(x1, y + LH * .5, z1); ctx.strokeStyle = 'rgba(255,248,235,.75)'; ctx.lineWidth = Math.max(1.5, LH * S * .14); ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.stroke(); ctx.restore();
    }
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.4;
    ctx.shadowColor = kit.neon; ctx.shadowBlur = 8 + lit * 18;
    ctx.strokeStyle = rgba(kit.neon, .55 + lit * .45);
    poly(T); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...L[3]); ctx.lineTo(...L[2]); ctx.lineTo(...R[3]); ctx.moveTo(...L[2]); ctx.lineTo(...L[1]); ctx.stroke();
    ctx.restore();
  }

  const placed = () => layers.length - 3;
  function next() {
    const top = layers.at(-1), axis = placed() % 2 ? 'z' : 'x';
    moving = {...top, base: false, y: top.y + LH, axis, off: -1.35, dir: 1, speed: Math.min(2.5, 1.15 + placed() * .09)};
  }
  const slabAt = m => m.axis === 'x' ? {...m, x0: m.x0 + m.off, x1: m.x1 + m.off} : {...m, z0: m.z0 + m.off, z1: m.z1 + m.off};
  function drop() {
    if (kit.phase !== 'play' || !moving) return;
    const prev = layers.at(-1), cur = slabAt(moving), ax = moving.axis;
    const a0 = cur[ax + '0'], a1 = cur[ax + '1'], b0 = prev[ax + '0'], b1 = prev[ax + '1'];
    const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
    if (hi - lo <= .01) { // missed: it all falls
      falling.push({...cur, vy: 0, vx: 0, ax, life: 1.2, k: placed() + 1});
      kit.tone(110, .4, 'sawtooth', .08); kit.buzz(60);
      moving = null;
      return kit.lose(`ซ้อนได้ ${placed()}/${GOAL} ชั้น`);
    }
    const size = a1 - a0;
    let kept;
    if (Math.abs(a0 - b0) < size * .055) { // perfect
      combo++;
      kept = {...cur, [ax + '0']: b0, [ax + '1']: b1};
      if (combo >= 3) { const grow = Math.min(.06, BASE - (b1 - b0)); if (grow > 0) { kept[ax + '0'] -= grow / 2; kept[ax + '1'] += grow / 2; } }
      rings.push({b: kept, life: 1});
      kit.pop(combo > 1 ? `PERFECT ×${combo}` : 'PERFECT', kit.W / 2, kit.H * .2);
      glow = 1;
      kit.chime(placed()); kit.buzz(25);
      kit.say(`ชั้น ${placed() + 1} ตรงพอดี${combo > 1 ? ` ${combo} ครั้งติด` : ''}`);
    } else {
      combo = 0;
      kept = {...cur, [ax + '0']: lo, [ax + '1']: hi};
      const cut = a0 < b0 ? {...cur, [ax + '0']: a0, [ax + '1']: lo} : {...cur, [ax + '0']: hi, [ax + '1']: a1};
      falling.push({...cut, vy: 0, vx: (a0 < b0 ? -1 : 1) * .6, ax, life: 1.2, k: placed() + 1});
      kit.tone(220 * Math.pow(2, placed() / 12), .14, 'triangle', .07); kit.buzz(12);
      kit.say(`ชั้น ${placed() + 1}`);
    }
    for (let i = 0; i < (combo ? 26 : 10); i++) { const [px, py] = iso(lerp(kept.x0, kept.x1, Math.random()), kept.y + LH, lerp(kept.z0, kept.z1, Math.random())); kit.burst(px, py, 1, [kit.neon, '#ffffff'], .6); }
    layers.push(kept);
    box.dataset.layers = String(placed());
    kit.score(placed());
    kit.shake(combo ? .25 : .12);
    if (placed() >= GOAL) { moving = null; glow = 1.5; return kit.win(); }
    next();
  }

  return {
    // for tests: where the sliding layer is
    hook: {get offset() { return moving ? moving.off : null; }},
    resize() { S = Math.min(kit.W * .3, kit.H * .3); },
    reset() {
      const b = (y) => ({x0: -BASE / 2, x1: BASE / 2, z0: -BASE / 2, z1: BASE / 2, y, base: true});
      layers = [b(-LH * 3), b(-LH * 2), b(-LH)];
      falling = []; rings = []; combo = 0; camY = 0; glow = 0;
      box.dataset.layers = '0';
      next();
    },
    update(dt) {
      if (moving && kit.phase === 'play') {
        moving.off += moving.dir * moving.speed * dt;
        if (moving.off > 1.35) { moving.off = 1.35; moving.dir = -1; }
        if (moving.off < -1.35) { moving.off = -1.35; moving.dir = 1; }
      }
      const want = Math.max(0, (layers.at(-1)?.y || 0) - .25);
      camY += (want - camY) * (1 - Math.exp(-dt * 5));
      falling.forEach(f => { f.vy -= 9 * dt; f.y += f.vy * dt; const d = f.vx * dt * .3; f[f.ax + '0'] += d; f[f.ax + '1'] += d; f.life -= dt; });
      falling = falling.filter(f => f.life > 0);
      rings.forEach(r => { r.life -= dt * 1.6; }); rings = rings.filter(r => r.life > 0);
      glow = Math.max(0, glow - dt * 1.4);
    },
    draw() {
      S = Math.min(kit.W * .3, kit.H * .3);
      kit.background();
      // the holographic floor grid, which sinks as the tower rises
      ctx.save(); ctx.strokeStyle = rgba(kit.neon, .16); ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) { const a = iso(i * .5, -.02, -3), b = iso(i * .5, -.02, 3), c = iso(-3, -.02, i * .5), d = iso(3, -.02, i * .5); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.moveTo(...c); ctx.lineTo(...d); ctx.stroke(); }
      ctx.restore();
      const first = Math.max(0, layers.length - 18);
      for (let i = first; i < layers.length; i++) slab(layers[i], i - 2, {lit: i === layers.length - 1 ? glow : 0});
      falling.forEach(f => slab(f, f.k, {alpha: clamp(f.life, 0, 1)}));
      if (moving && kit.phase === 'play') slab(slabAt(moving), placed() + 1, {lit: .4 + .3 * Math.sin(kit.t * 8)});
      rings.forEach(r => { const g = 1 + (1 - r.life) * .5, b = r.b, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, hx = (b.x1 - b.x0) / 2 * g, hz = (b.z1 - b.z0) / 2 * g, y = b.y + LH; ctx.save(); ctx.strokeStyle = rgba('#ffffff', r.life); ctx.lineWidth = 2; ctx.shadowColor = kit.neon; ctx.shadowBlur = 16; poly([iso(cx - hx, y, cz - hz), iso(cx + hx, y, cz - hz), iso(cx + hx, y, cz + hz), iso(cx - hx, y, cz + hz)]); ctx.stroke(); ctx.restore(); });
    },
    hud() { return {label: `ชั้น ${Math.min(placed(), GOAL)}/${GOAL}`, progress: placed() / GOAL}; },
    down() { drop(); },
    key(k) { if (k === ' ' || k === 'Enter' || k === 'ArrowDown') drop(); },
  };
}
