// Yarn shop: "ต่อไหมพรม". Balls of yarn sit in pairs on a grid; drag a thread from one ball to the other of the same
// colour. Threads cannot cross: drawing over another thread cuts it. Three boards (4×4, 5×5, 6×6); filling every
// square knits the whole board. Each board is new: a random path through every square, cut into pieces, so it can
// always be solved. Keyboard: the arrows move, Space or Enter picks up or puts down a thread.
const LEVELS = [{n: 4, k: 3}, {n: 5, k: 4}, {n: 6, k: 5}];
const YARN = ['#ff6f91', '#4fc3f7', '#ffd54f', '#7ed39b', '#b9a2ff'];
const TAU = Math.PI * 2;

// a path through every square (backbite moves on a snake), cut into k pieces of at least 3 squares
function puzzle(n, k) {
  const nb = i => { const r = Math.floor(i / n), c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
  const adj = (a, b) => nb(a).includes(b);
  for (let tries = 0; tries < 40; tries++) {
    let p = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) p.push(r * n + (r % 2 ? n - 1 - c : c));
    for (let it = 0; it < n * n * 30; it++) {
      if (Math.random() < .5) p.reverse();
      const cand = nb(p[0]).filter(x => x !== p[1]);
      const j = p.indexOf(cand[Math.floor(Math.random() * cand.length)]);
      p = [...p.slice(0, j).reverse(), ...p.slice(j)];
    }
    const len = Array(k).fill(3);
    for (let e = n * n - 3 * k; e > 0; e--) len[Math.floor(Math.random() * k)]++;
    const pieces = []; let at = 0;
    for (const l of len) { pieces.push(p.slice(at, at + l)); at += l; }
    // a pair of balls side by side would be no puzzle at all
    if (pieces.every(q => !adj(q[0], q.at(-1))) || tries === 39) return pieces;
  }
}

export function create(kit) {
  const {ctx} = kit, {mix, rgba} = kit.u;
  let lv = 0, n = 4, k = 3, sol = [], ends = new Map(), paths = [], cur = null, cursor = 0, keys = false, connected = 0, total = 0, next = 0, flash = 0, fill = 0;
  const geo = () => { const {W, H} = kit, top = 50, size = Math.min(W * .9, H - top - 24); return {size, cs: size / n, ox: (W - size) / 2, oy: top + (H - top - size) / 2}; };
  const center = i => { const {cs, ox, oy} = geo(); return [ox + (i % n + .5) * cs, oy + (Math.floor(i / n) + .5) * cs]; };
  const cellAt = (x, y) => { const {cs, ox, oy, size} = geo(); if (x < ox || y < oy || x >= ox + size || y >= oy + size) return -1; return Math.floor((y - oy) / cs) * n + Math.floor((x - ox) / cs); };
  const adj = (a, b) => (Math.abs(a - b) === n) || (Math.abs(a - b) === 1 && Math.floor(a / n) === Math.floor(b / n));
  const complete = c => { const p = paths[c]; return p.length > 1 && ends.get(p[0]) === c && ends.get(p.at(-1)) === c && p[0] !== p.at(-1); };
  const covered = () => { const s = new Set(); paths.forEach(p => p.forEach(i => s.add(i))); ends.forEach((_, i) => s.add(i)); return s.size; };

  function load() {
    ({n, k} = LEVELS[lv]);
    sol = puzzle(n, k);
    ends = new Map(); sol.forEach((q, c) => { ends.set(q[0], c); ends.set(q.at(-1), c); });
    paths = sol.map(() => []); cur = null; cursor = Math.floor(n * n / 2); next = 0; fill = 0;
  }
  function grab(i) {
    if (i < 0) return false;
    const e = ends.get(i);
    if (e != null) { paths[e] = [i]; cur = e; kit.tone(330 + e * 60, .07, 'triangle', .05); return true; }
    for (let c = 0; c < k; c++) { const j = paths[c].indexOf(i); if (j >= 0) { paths[c].length = j + 1; cur = c; return true; } }
    return false;
  }
  // one square further for the thread in hand
  function step(i) {
    if (cur == null) return false;
    const p = paths[cur], head = p.at(-1);
    if (!adj(head, i)) return false;
    const back = p.indexOf(i);
    if (back >= 0) { p.length = back + 1; return true; }
    if (complete(cur)) return false;
    const e = ends.get(i);
    if (e != null && e !== cur) return false;
    for (let c = 0; c < k; c++) if (c !== cur) { const j = paths[c].indexOf(i); if (j >= 0) { paths[c].length = j; kit.tone(180, .08, 'square', .03); } }
    p.push(i);
    kit.tone(440 + p.length * 22, .03, 'sine', .025);
    if (e === cur) linked();
    return true;
  }
  function walk(target) {
    for (let guard = 0; guard < n * 2 && cur != null; guard++) {
      const head = paths[cur].at(-1);
      if (head === target) return;
      const hr = Math.floor(head / n), hc = head % n, tr = Math.floor(target / n), tc = target % n;
      const dr = Math.sign(tr - hr), dc = Math.sign(tc - hc);
      const tryR = dr ? head + dr * n : -1, tryC = dc ? head + dc : -1;
      const first = Math.abs(tr - hr) >= Math.abs(tc - hc) ? [tryR, tryC] : [tryC, tryR];
      if (!first.some(q => q >= 0 && step(q))) return;
      if (cur == null || complete(cur)) return; // linked: the thread is put down
    }
  }
  function linked() {
    const c = cur;
    cur = null;
    const [x, y] = center(paths[c].at(-1));
    kit.burst(x, y, 18, [YARN[c], '#ffffff'], .8); kit.chime(paths.filter((_, q) => complete(q)).length + lv * 2); kit.buzz(15);
    kit.say(`เชื่อมเส้นสีที่ ${c + 1} แล้ว`);
    recount();
  }
  function recount() {
    const now = paths.filter((_, c) => complete(c)).length;
    connected = now;
    kit.score(total + now);
    if (now === k && !next) {
      const full = covered() === n * n;
      kit.pop(full ? 'ถักเต็มผืน!' : `ผืนที่ ${lv + 1} เสร็จ`, kit.W / 2, kit.H * .18);
      flash = 1; fill = 0; next = kit.t + 1.1;
      kit.say(full ? 'ถักเต็มผืน' : `ผืนที่ ${lv + 1} เสร็จ`);
    }
  }

  function ball(i, c, done) {
    const [x, y] = center(i), {cs} = geo(), r = cs * .36, col = YARN[c];
    ctx.save();
    if (done) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, mix(col, '#ffffff', .55)); g.addColorStop(.6, col); g.addColorStop(1, mix(col, '#000000', .45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // wound strands
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.strokeStyle = rgba(mix(col, '#ffffff', .5), .7); ctx.lineWidth = Math.max(1, r * .09);
    for (let s = 0; s < 4; s++) { ctx.beginPath(); ctx.ellipse(x, y, r * (1 - s * .05), r * (.32 + s * .14), .7 + s * .9, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = rgba('#ffffff', done ? .9 : .5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function thread(c) {
    const p = paths[c];
    if (p.length < 2) return;
    const {cs} = geo(), col = YARN[c], w = cs * .3, done = complete(c);
    const line = () => { ctx.beginPath(); p.forEach((i, q) => { const [x, y] = center(i); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (done) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    line(); ctx.strokeStyle = mix(col, '#000000', .2); ctx.lineWidth = w; ctx.stroke();
    ctx.shadowBlur = 0;
    // the twist of the yarn: slanted strands across it, like plied wool
    ctx.save();
    ctx.strokeStyle = rgba(mix(col, '#ffffff', .5), .8); ctx.lineWidth = Math.max(1, w * .16);
    const gap = w * .42;
    ctx.beginPath();
    for (let q = 1; q < p.length; q++) {
      const [x0, y0] = center(p[q - 1]), [x1, y1] = center(p[q]), len = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / len, dy = (y1 - y0) / len;
      for (let d = gap / 2; d < len; d += gap) { const x = x0 + dx * d, y = y0 + dy * d, h = w * .38; ctx.moveTo(x - dy * h - dx * h * .6, y + dx * h - dy * h * .6); ctx.lineTo(x + dy * h + dx * h * .6, y - dx * h + dy * h * .6); }
    }
    ctx.stroke(); ctx.restore();
    line(); ctx.strokeStyle = rgba('#ffffff', .18); ctx.lineWidth = Math.max(1, w * .1); ctx.stroke();
    ctx.restore();
  }

  return {
    // for tests: the squares of one colour's answer, as points on the canvas
    hook: {get level() { return lv; }, get connected() { return connected; }, solution(c = 0) { return sol[c].map(center); }},
    reset() { lv = 0; total = 0; connected = 0; flash = 0; keys = false; load(); },
    update(dt) {
      flash = Math.max(0, flash - dt * 1.2);
      if (next) fill = Math.min(1, fill + dt * 2);
      if (next && kit.t >= next && kit.phase === 'play') {
        total += k; lv++;
        if (lv >= LEVELS.length) { lv = LEVELS.length - 1; next = 0; kit.win(); return; }
        load(); connected = 0; kit.score(total);
      }
    },
    draw() {
      kit.background();
      const {size, cs, ox, oy} = geo();
      // the board: dark glass with a neon edge
      ctx.save();
      ctx.fillStyle = rgba(kit.deep, .72); ctx.strokeStyle = rgba(kit.neon, .45 + flash * .5); ctx.lineWidth = 1.5; ctx.shadowColor = kit.neon; ctx.shadowBlur = 10 + flash * 20;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ox - 6, oy - 6, size + 12, size + 12, 12) : ctx.rect(ox - 6, oy - 6, size + 12, size + 12); ctx.fill(); ctx.stroke();
      ctx.restore();
      // squares a thread passes through turn into knitting: little V stitches in its colour
      const own = new Map(); paths.forEach((p, c) => p.forEach(i => own.set(i, c)));
      for (let i = 0; i < n * n; i++) {
        const [x, y] = center(i), c = own.get(i) ?? ends.get(i);
        if (c == null || !own.has(i)) { ctx.fillStyle = rgba(kit.neon, .22); ctx.fillRect(x - 1, y - 1, 2, 2); continue; }
        // a soft tint while you play; the stitches come up when the board is done
        ctx.fillStyle = rgba(YARN[c], .1 + fill * .08); ctx.fillRect(x - cs * .47, y - cs * .47, cs * .94, cs * .94);
        if (fill <= 0) continue;
        ctx.save(); ctx.strokeStyle = rgba(YARN[c], fill * .55); ctx.lineWidth = Math.max(1, cs * .05);
        for (let q = -1; q <= 1; q += 2) { const sx = x + q * cs * .2; ctx.beginPath(); ctx.moveTo(sx - cs * .12, y - cs * .32); ctx.lineTo(sx, y - cs * .05); ctx.lineTo(sx + cs * .12, y - cs * .32); ctx.moveTo(sx - cs * .12, y + .02 * cs); ctx.lineTo(sx, y + cs * .27); ctx.lineTo(sx + cs * .12, y + .02 * cs); ctx.stroke(); }
        ctx.restore();
      }
      for (let c = 0; c < k; c++) thread(c);
      ends.forEach((c, i) => ball(i, c, complete(c)));
      if (keys) { const [x, y] = center(cursor); ctx.save(); ctx.strokeStyle = cur != null ? YARN[cur] : '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -kit.t * 18; ctx.strokeRect(x - cs * .46, y - cs * .46, cs * .92, cs * .92); ctx.restore(); }
    },
    hud() { return {label: `ผืน ${lv + 1}/${LEVELS.length} · ${connected}/${k} เส้น`, progress: (total + connected) / LEVELS.reduce((s, l) => s + l.k, 0)}; },
    down(x, y) { keys = false; if (!next) grab(cellAt(x, y)); },
    move(x, y) { if (cur == null || next) return; const i = cellAt(x, y); if (i >= 0) walk(i); },
    up() { if (cur != null) { cur = null; recount(); } },
    key(key) {
      if (next) return;
      keys = true;
      if (key === ' ' || key === 'Enter') { if (cur != null) { cur = null; recount(); } else if (grab(cursor)) kit.say(`จับเส้นสีที่ ${cur + 1}`); return; }
      const r = Math.floor(cursor / n), c = cursor % n;
      const to = key === 'ArrowUp' ? (r ? cursor - n : -1) : key === 'ArrowDown' ? (r < n - 1 ? cursor + n : -1) : key === 'ArrowLeft' ? (c ? cursor - 1 : -1) : (c < n - 1 ? cursor + 1 : -1);
      if (to < 0) return;
      if (cur == null) cursor = to;
      else if (step(to)) cursor = to;
    },
  };
}
