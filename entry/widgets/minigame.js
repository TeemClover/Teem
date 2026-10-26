// "มินิเกมโปรโมต" widget: "ซ้อนให้สูง", a 3D stacking game in the business's own material (owner brief 2026-10-26:
// creative, and it should look ahead of its time). A layer slides over the tower; tap (or Space) to drop it. What hangs
// over is cut off and falls; a perfect drop keeps the full size, and three in a row grow it back a little.
// Stack 10 layers to win a sample coupon. Each business stacks its own thing:
//   café → cake layers · tutor → numbered blocks · yarn shop → knitted layers · studio → photo prints of its own work
// Drawn on a canvas in isometric 3D with neon edges in the style's colour; small synthesised sounds after the first tap.
// No prize is real and nothing leaves the page. Reduced motion gets a still "tap the right ones" board instead.
const GOAL = 10;
const GAMES = {
  cafe: {title: 'ซ้อนเค้กให้สูง', hint: 'แตะให้ชั้นเค้กวางตรงกัน ตรงพอดีได้ชั้นเต็ม', skin: 'cake', coupon: 'ส่วนลด 10% เมนูเช้า', suffix: '10', good: 'photo', bad: 'bean', badName: 'เมล็ดไหม้'},
  coach: {title: 'ซ้อนบล็อกเลข', hint: 'แตะให้บล็อกวางตรงกัน ทุกชั้นคือเลขข้อถัดไป', skin: 'blocks', coupon: 'ทดลองเรียนฟรีเพิ่ม 15 นาที', suffix: '15', good: 'math', bad: 'math'},
  shop: {title: 'ซ้อนไหมพรม', hint: 'แตะให้ผ้าถักวางตรงกัน ตรงพอดีได้ชั้นเต็ม', skin: 'knit', coupon: 'ส่งฟรี 1 ชิ้น', suffix: 'SHIP', good: 'yarn', bad: 'scissors', badName: 'กรรไกร'},
  studio: {title: 'ซ้อนภาพ', hint: 'แตะให้ภาพวางตรงกัน ตรงพอดีได้ภาพเต็ม', skin: 'prints', coupon: 'ส่วนลด 10% แพ็กเกจถ่ายภาพ', suffix: '10', good: 'photo', bad: 'blur', badName: 'ภาพเบลอ'},
};
const TARGETS = [10, 12, 15, 20, 24];
const HUD_FONT = "'Chakra Petch', 'Anuphan', system-ui, sans-serif";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hex = c => { const m = /^#?([\da-f]{6})$/i.exec(String(c).trim()); if (!m) return [200, 160, 90]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `#${A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('')}`; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const mod = (k, m) => ((k % m) + m) % m;

// sums for the tutor's still board: `good` equals the target, anything else is off by a little
function sum(target, good) {
  const v = good ? target : target + pick([-3, -2, -1, 1, 2, 3]);
  return {val: v, text: sumText(v)};
}
function sumText(v) {
  const forms = [() => { const a = Math.floor(rnd(1, v)); return `${a}+${v - a}`; }, () => { const b = Math.floor(rnd(1, 9)); return `${v + b}−${b}`; }];
  const divs = []; for (let a = 2; a <= Math.sqrt(v); a++) if (v % a === 0) divs.push(a);
  if (divs.length) forms.push(() => { const a = pick(divs); return Math.random() < .5 ? `${a}×${v / a}` : `${v / a}×${a}`; });
  return pick(forms)();
}

export function mount(root, {industry, esc, photos = []}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const game = {key: GAMES[industry.key] ? industry.key : 'cafe', ...(GAMES[industry.key] || GAMES.cafe)};
  const code = `${(industry.brandEn || 'DEMO').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'DEMO'}-${game.suffix}`;
  const ticket = `<div class="w-ticket" role="status"><span class="w-ticket-brand">${esc(industry.brand)} ให้คุณ</span><b>${esc(game.coupon)}</b><span class="w-ticket-code">${esc(code)}</span><small>คูปองจำลอง · ในเว็บจริงผูกกับร้านของคุณ</small></div>`;
  const imgs = photos.map(src => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; });
  if (!document.querySelector('link[data-game-font]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/fonts/site/game.css'; l.dataset.gameFont = ''; document.head.append(l); }
  return reduced ? board(root, {industry, esc, game, imgs, ticket}) : stack(root, {industry, esc, game, imgs, ticket});
}

/* ---------- reduced motion: tap the right ones ---------- */
function board(root, {esc, game, imgs, ticket}) {
  const need = 4;
  const target = pick(TARGETS);
  const good = Array.from({length: need}, (_, i) => ({ok: true, i}));
  const bad = Array.from({length: 2}, (_, i) => ({ok: false, i}));
  const cards = [...good, ...bad].sort(() => Math.random() - .5);
  const face = c => {
    if (game.good === 'math') return `<span class="w-sum">${sum(target, c.ok).text}</span>`;
    if (!c.ok && game.bad === 'blur' && imgs.length) return `<img src="${imgs[c.i % imgs.length].src}" alt="" class="is-blur">`;
    if (!c.ok) return `<span class="w-bad">${esc(game.badName)}</span>`;
    if (game.good === 'yarn' || !imgs.length) return `<span class="w-yarn" aria-hidden="true"></span>`;
    return `<img src="${imgs[c.i % imgs.length].src}" alt="">`;
  };
  const label = c => game.good === 'math' ? '' : c.ok ? (game.good === 'yarn' ? 'ไหมพรม' : 'ของดี') : game.badName;
  root.innerHTML = `<div class="w-game is-still" data-game="${esc(game.key)}"><p class="w-game-q"><b>${esc(game.title)}</b> · ${game.good === 'math' ? `แตะโจทย์ที่ได้ ${target} ให้ครบ ${need} ข้อ` : `แตะของดีให้ครบ ${need} ชิ้น`}</p>
    <div class="w-board">${cards.map((c, k) => `<button type="button" class="w-token" data-k="${k}" aria-pressed="false"${label(c) ? ` aria-label="${esc(label(c))}"` : ''}>${face(c)}</button>`).join('')}</div>
    <p class="w-game-say" aria-live="polite" data-say>เก็บได้ 0/${need}</p></div>`;
  let got = 0;
  const say = root.querySelector('[data-say]');
  const onClick = e => {
    const b = e.target.closest('.w-token');
    if (!b || b.disabled) return;
    if (!cards[+b.dataset.k].ok) { say.textContent = `ชิ้นนั้นไม่ใช่ · เก็บได้ ${got}/${need}`; return; }
    b.disabled = true; b.setAttribute('aria-pressed', 'true'); got++;
    say.textContent = `เก็บได้ ${got}/${need}`;
    if (got >= need) root.querySelector('.w-game').innerHTML = `${ticket}<button type="button" class="w-pill" data-again>เล่นอีกครั้ง</button>`;
  };
  const onAgain = e => { if (e.target.closest('[data-again]')) board(root, {esc, game, imgs, ticket}); };
  root.addEventListener('click', onClick);
  root.addEventListener('click', onAgain);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('click', onAgain); };
}

/* ---------- "ซ้อนให้สูง": the stacking game ---------- */
function stack(root, {industry, esc, game, imgs, ticket}) {
  root.innerHTML = `<div class="w-game is-stack" data-game="${esc(game.key)}" data-layers="0">
    <canvas class="w-game-canvas" tabindex="0" aria-label="${esc(game.title)}: แตะ หรือกดเว้นวรรค เพื่อวางชั้น"></canvas>
    <button type="button" class="w-game-snd" aria-pressed="true" aria-label="เสียงในเกม">♪</button>
    <div class="w-game-cover"><span class="w-game-brand">${esc(industry.brand)}</span><b>${esc(game.title)}</b><p>${esc(game.hint)}</p>
      <button type="button" class="w-go w-game-go">เริ่มเล่น</button><small>ซ้อนถึง ${GOAL} ชั้น รับ: ${esc(game.coupon)} (คูปองจำลอง)</small></div>
    <p class="sr-only" aria-live="polite" data-say></p>
  </div>`;
  const box = root.querySelector('.w-game'), cv = box.querySelector('canvas'), cover = box.querySelector('.w-game-cover'), say = box.querySelector('[data-say]'), snd = box.querySelector('.w-game-snd');
  const ctx = cv.getContext('2d');
  const css = getComputedStyle(box);
  const v = n => css.getPropertyValue(n).trim();
  const C = {accent: v('--demo-accent') || '#d2691e', text: v('--demo-text') || '#222222', bg: v('--demo-bg') || '#ffffff'};
  // the arena is always a dark, deep space lit by the style's accent: neon on glass
  // a black accent (minimal) would give no light: it glows white-blue instead
  const lum = c => { const [r, g, b] = hex(c); return (r * .299 + g * .587 + b * .114) / 255; };
  const glowC = lum(C.accent) < .2 ? '#cfd8ff' : C.accent;
  const neon = mix(glowC, '#ffffff', .25), deep = mix(glowC, '#05060a', .9), deep2 = mix(glowC, '#05060a', .74);
  const SKIN = {
    cake: k => ({top: ['#fff3df', '#f6d9a8', '#fff3df'][mod(k, 3)], left: ['#d9a46a', '#7a4a2a', '#e8c08a'][mod(k, 3)], right: ['#c38c55', '#5f3820', '#d3a771'][mod(k, 3)], deco: 'sprinkle'}),
    blocks: k => { const c = [C.accent, '#ffd23f', '#5ce1c4', '#9b8cff', '#ff8a5c'][mod(k, 5)]; return {top: mix(c, '#ffffff', .3), left: c, right: mix(c, '#000000', .25), deco: 'digit'}; },
    knit: k => { const c = ['#e98fb0', '#8fc9e9', '#f2c46b', '#a7dba0', '#c9a7f2'][mod(k, 5)]; return {top: mix(c, '#ffffff', .25), left: c, right: mix(c, '#000000', .18), deco: 'stitch'}; },
    prints: k => ({top: '#ffffff', left: '#f4f4f2', right: '#dcdcd8', deco: 'photo'}),
  };
  const skinOf = SKIN[game.skin] || SKIN.cake;
  // the three base layers are a glass pedestal, the same for every business
  const skin = (k, base) => base ? {top: rgba(neon, .22), left: rgba(glowC, .28), right: rgba(glowC, .18), deco: 'glass'} : skinOf(k);

  // world: a slab is a box [x0,x1] × [z0,z1], LH thick; the view is isometric
  const LH = .2, BASE = 1;
  let W = 0, H = 0, dpr = 1, S = 60;
  let raf = 0, last = 0, phase = 'idle', layers = [], moving = null, falling = [], parts = [], rings = [], texts = [];
  let camY = 0, combo = 0, shake = 0, glow = 0, outro = 0, t = 0, sound = true, ac = null;

  function resize() {
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.min(W * .3, H * .3);
    if (phase !== 'play') draw();
  }
  const iso = (x, y, z) => [W / 2 + (x - z) * S * .866, H * .8 + (x + z) * S * .5 - (y - camY) * S];
  function poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }

  /* ---------- one slab ---------- */
  function slab(b, k, {alpha = 1, lit = 0} = {}) {
    const {x0, x1, z0, z1, y} = b, top = y + LH;
    const T = [iso(x0, top, z0), iso(x1, top, z0), iso(x1, top, z1), iso(x0, top, z1)];
    const L = [iso(x0, top, z1), iso(x1, top, z1), iso(x1, y, z1), iso(x0, y, z1)];
    const R = [iso(x1, top, z0), iso(x1, top, z1), iso(x1, y, z1), iso(x1, y, z0)];
    const sk = skin(k, b.base);
    ctx.save(); ctx.globalAlpha *= alpha;
    poly(L); ctx.fillStyle = sk.left; ctx.fill();
    poly(R); ctx.fillStyle = sk.right; ctx.fill();
    poly(T); ctx.fillStyle = sk.top; ctx.fill();
    // what the slab is made of
    if (sk.deco === 'photo' && imgs.length) {
      const im = imgs[mod(k, imgs.length)];
      if (im.complete && im.naturalWidth) {
        ctx.save(); poly(T); ctx.clip();
        // map the image onto the top face (an affine transform of the unit square)
        const [ox, oy] = T[0], [ax, ay] = T[1], [bx, by] = T[3];
        const pad = .08;
        ctx.transform(ax - ox, ay - oy, bx - ox, by - oy, ox, oy);
        ctx.drawImage(im, pad, pad, 1 - pad * 2, 1 - pad * 2);
        ctx.restore();
      }
    }
    if (sk.deco === 'sprinkle') { ctx.save(); poly(T); ctx.clip(); for (let i = 0; i < 9; i++) { const u = ((k * 7 + i * 13) % 17) / 17, w2 = ((k * 11 + i * 5) % 19) / 19; const [px, py] = iso(lerp(x0, x1, u), top, lerp(z0, z1, w2)); ctx.fillStyle = ['#ff6b8a', '#6bc5ff', '#ffd23f', '#7ad7a0'][i % 4]; ctx.fillRect(px - 1.5, py - .8, 3, 1.6); } ctx.restore(); }
    if (sk.deco === 'stitch') { ctx.save(); poly(L); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; const n = Math.max(3, Math.round((x1 - x0) * 10)); for (let i = 0; i < n; i++) { const u = (i + .5) / n; const [a1, a2] = iso(lerp(x0, x1, u - .03), top - LH * .2, z1), [b1, b2] = iso(lerp(x0, x1, u), y + LH * .25, z1), [c1, c2] = iso(lerp(x0, x1, u + .03), top - LH * .2, z1); ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.lineTo(c1, c2); ctx.stroke(); } ctx.restore(); }
    if (sk.deco === 'digit') { const [px, py] = iso((x0 + x1) / 2, y + LH / 2, z1); ctx.save(); ctx.translate(px, py); ctx.transform(1, .577, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = `600 ${Math.max(9, LH * S * .7)}px ${HUD_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k), 0, 1); ctx.restore(); }
    if (game.skin === 'cake' && !b.base) { ctx.save(); poly(L); ctx.clip(); const [a1, a2] = iso(x0, y + LH * .5, z1), [b1, b2] = iso(x1, y + LH * .5, z1); ctx.strokeStyle = 'rgba(255,248,235,.75)'; ctx.lineWidth = Math.max(1.5, LH * S * .14); ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.stroke(); ctx.restore(); }
    // neon edges: the look of the arena
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.4;
    ctx.shadowColor = neon; ctx.shadowBlur = 8 + lit * 18;
    ctx.strokeStyle = rgba(neon, .55 + lit * .45);
    poly(T); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...L[3]); ctx.lineTo(...L[2]); ctx.lineTo(...R[3]); ctx.moveTo(...L[2]); ctx.lineTo(...L[1]); ctx.stroke();
    ctx.restore();
  }
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- the arena ---------- */
  let bgCache = null;
  function background() {
    if (!bgCache || bgCache.w !== W || bgCache.h !== H) {
      const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, deep); g.addColorStop(1, deep2); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const rg = x.createRadialGradient(W / 2, H * .7, 0, W / 2, H * .7, W * .7); rg.addColorStop(0, rgba(glowC, .32)); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; x.fillRect(Math.random() * W, Math.random() * H * .8, 1, 1); }
      bgCache = {c, w: W, h: H};
    }
    ctx.drawImage(bgCache.c, 0, 0, W, H);
    // the holographic floor grid, which sinks as the tower rises
    ctx.save(); ctx.strokeStyle = rgba(neon, .16); ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) { const a = iso(i * .5, -.02, -3), b = iso(i * .5, -.02, 3), c = iso(-3, -.02, i * .5), d = iso(3, -.02, i * .5); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.moveTo(...c); ctx.lineTo(...d); ctx.stroke(); }
    ctx.restore();
    // a scan line
    const sy = ((t * 60) % (H + 40)) - 20; ctx.fillStyle = rgba(neon, .05); ctx.fillRect(0, sy, W, 2);
  }

  /* ---------- the game ---------- */
  function reset() {
    layers = [{x0: -BASE / 2, x1: BASE / 2, z0: -BASE / 2, z1: BASE / 2, y: -LH * 3, base: true}, {x0: -BASE / 2, x1: BASE / 2, z0: -BASE / 2, z1: BASE / 2, y: -LH * 2, base: true}, {x0: -BASE / 2, x1: BASE / 2, z0: -BASE / 2, z1: BASE / 2, y: -LH, base: true}];
    falling = []; parts = []; rings = []; texts = []; combo = 0; camY = 0; shake = 0; glow = 0;
    next();
  }
  const placed = () => layers.length - 3;
  function next() {
    const top = layers.at(-1), axis = placed() % 2 ? 'z' : 'x';
    const speed = Math.min(2.5, 1.15 + placed() * .09);
    moving = {...top, y: top.y + LH, axis, off: -1.35, dir: 1, speed};
    moving.base = false;
  }
  function slabAt(m) { const d = m.off; return m.axis === 'x' ? {...m, x0: m.x0 + d, x1: m.x1 + d} : {...m, z0: m.z0 + d, z1: m.z1 + d}; }
  function drop() {
    if (phase !== 'play' || !moving) return;
    const prev = layers.at(-1), cur = slabAt(moving), ax = moving.axis;
    const a0 = cur[ax + '0'], a1 = cur[ax + '1'], b0 = prev[ax + '0'], b1 = prev[ax + '1'];
    const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
    if (hi - lo <= .01) { // missed: it all falls
      falling.push({...cur, vy: 0, vx: 0, ax, life: 1.2, k: placed() + 1});
      tone(110, .4, 'sawtooth', .08); buzz(60);
      moving = null; return lose();
    }
    const size = a1 - a0;
    let kept;
    if (Math.abs(a0 - b0) < size * .055) { // perfect
      combo++;
      kept = {...cur, [ax + '0']: b0, [ax + '1']: b1};
      if (combo >= 3) { const grow = Math.min(.06, BASE - (b1 - b0)); if (grow > 0) { kept[ax + '0'] -= grow / 2; kept[ax + '1'] += grow / 2; } }
      rings.push({b: kept, life: 1});
      texts.push({text: combo > 1 ? `PERFECT ×${combo}` : 'PERFECT', life: 1});
      glow = 1;
      chime(placed()); buzz(25);
      speak(`ชั้น ${placed() + 1} ตรงพอดี${combo > 1 ? ` ${combo} ครั้งติด` : ''}`);
    } else {
      combo = 0;
      kept = {...cur, [ax + '0']: lo, [ax + '1']: hi};
      const cut = a0 < b0 ? {...cur, [ax + '0']: a0, [ax + '1']: lo} : {...cur, [ax + '0']: hi, [ax + '1']: a1};
      falling.push({...cut, vy: 0, vx: (a0 < b0 ? -1 : 1) * .6, ax, life: 1.2, k: placed() + 1});
      tone(220 * Math.pow(2, placed() / 12), .14, 'triangle', .07); buzz(12);
      speak(`ชั้น ${placed() + 1}`);
    }
    // sparks along the new top
    for (let i = 0; i < (combo ? 26 : 10); i++) { const [px, py] = iso(lerp(kept.x0, kept.x1, Math.random()), kept.y + LH, lerp(kept.z0, kept.z1, Math.random())); parts.push({x: px, y: py, vx: rnd(-60, 60), vy: rnd(-120, -30), life: rnd(.4, .9), c: Math.random() < .5 ? neon : '#ffffff'}); }
    layers.push(kept);
    box.dataset.layers = String(placed());
    shake = combo ? .25 : .12;
    if (placed() >= GOAL) return win();
    next();
  }
  function win() {
    phase = 'outro'; outro = 1.4; moving = null; glow = 1.5;
    for (let i = 0; i < 90; i++) parts.push({x: W / 2 + rnd(-W * .3, W * .3), y: H * .5 + rnd(-H * .3, H * .2), vx: rnd(-140, 140), vy: rnd(-260, -40), life: rnd(.8, 1.6), c: pick([neon, '#ffffff', '#ffd23f', C.accent])});
    [0, 4, 7, 12].forEach((s, i) => setTimeout(() => tone(523 * Math.pow(2, s / 12), .35, 'sine', .08), i * 90));
    speak(`ชนะแล้ว ซ้อนครบ ${GOAL} ชั้น ได้คูปอง ${game.coupon}`);
  }
  function lose() { phase = 'outro'; outro = 1; speak(`พลาดแล้ว ซ้อนได้ ${placed()} จาก ${GOAL} ชั้น`); }
  function showEnd() {
    const won = placed() >= GOAL;
    box.insertAdjacentHTML('beforeend', `<div class="w-game-end">${won ? ticket : `<p class="w-game-miss"><b>เกือบแล้ว!</b> ซ้อนได้ ${placed()}/${GOAL} ชั้น</p>`}<button type="button" class="${won ? 'w-pill' : 'w-go w-game-go'}" data-again>${won ? 'เล่นอีกครั้ง' : 'ลองอีกรอบ'}</button></div>`);
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = 0;
    if (phase === 'gone') return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now; t += dt;
    if (moving && phase === 'play') {
      moving.off += moving.dir * moving.speed * dt;
      if (moving.off > 1.35) { moving.off = 1.35; moving.dir = -1; }
      if (moving.off < -1.35) { moving.off = -1.35; moving.dir = 1; }
    }
    const want = Math.max(0, (layers.at(-1)?.y || 0) - .25);
    camY += (want - camY) * (1 - Math.exp(-dt * 5));
    falling.forEach(f => { f.vy -= 9 * dt; f.y += f.vy * dt; const d = f.vx * dt * .3; f[f.ax + '0'] += d; f[f.ax + '1'] += d; f.life -= dt; });
    falling = falling.filter(f => f.life > 0);
    parts.forEach(p => { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
    rings.forEach(r => { r.life -= dt * 1.6; }); rings = rings.filter(r => r.life > 0);
    texts.forEach(x => { x.life -= dt * .9; }); texts = texts.filter(x => x.life > 0);
    shake = Math.max(0, shake - dt); glow = Math.max(0, glow - dt * 1.4);
    draw();
    if (phase === 'outro') { outro -= dt; if (outro <= 0) { phase = 'over'; showEnd(); } }
    if (phase === 'play' || phase === 'outro' || parts.length || falling.length) raf = requestAnimationFrame(frame);
  }
  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = shake ? rnd(-3, 3) * shake * 4 : 0, sy = shake ? rnd(-3, 3) * shake * 4 : 0;
    background();
    ctx.save(); ctx.translate(sx, sy);
    // the tower, then what falls in front of it, then the slab in the air
    const first = Math.max(0, layers.length - 18);
    for (let i = first; i < layers.length; i++) slab(layers[i], i - 2, {lit: i === layers.length - 1 ? glow : 0});
    falling.forEach(f => slab(f, f.k, {alpha: clamp(f.life, 0, 1)}));
    if (moving && phase === 'play') { const m = slabAt(moving); slab(m, placed() + 1, {lit: .4 + .3 * Math.sin(t * 8)}); }
    // perfect rings
    rings.forEach(r => { const g = 1 + (1 - r.life) * .5, b = r.b, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, hx = (b.x1 - b.x0) / 2 * g, hz = (b.z1 - b.z0) / 2 * g, y = b.y + LH; ctx.save(); ctx.strokeStyle = rgba('#ffffff', r.life); ctx.lineWidth = 2; ctx.shadowColor = neon; ctx.shadowBlur = 16; poly([iso(cx - hx, y, cz - hz), iso(cx + hx, y, cz - hz), iso(cx + hx, y, cz + hz), iso(cx - hx, y, cz + hz)]); ctx.stroke(); ctx.restore(); });
    parts.forEach(p => { ctx.globalAlpha = clamp(p.life * 1.5, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // HUD
    ctx.save();
    ctx.font = `600 ${Math.max(15, W * .045)}px ${HUD_FONT}`; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = neon; ctx.shadowBlur = 10;
    ctx.fillText(`ชั้น ${Math.min(placed(), GOAL)}/${GOAL}`, 14, 12);
    const p = Math.min(1, placed() / GOAL), bw = W * .34;
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(14, 14 + Math.max(15, W * .045) * 1.3, bw, 4);
    ctx.fillStyle = neon; ctx.fillRect(14, 14 + Math.max(15, W * .045) * 1.3, bw * p, 4);
    texts.forEach(x => { ctx.globalAlpha = clamp(x.life * 1.4, 0, 1); ctx.font = `600 ${Math.max(18, W * .07)}px ${HUD_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = neon; ctx.shadowBlur = 18; ctx.fillText(x.text, W / 2, H * .16 - (1 - x.life) * 24); });
    ctx.restore();
  }

  /* ---------- sound (small, synthesised, only after a tap) ---------- */
  function audio() { if (!sound) return null; if (!ac) { const A = window.AudioContext || window.webkitAudioContext; ac = A ? new A() : null; } if (ac?.state === 'suspended') ac.resume(); return ac; }
  function tone(f, d, type = 'sine', g = .06) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), v = a.createGain(), w = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, w); v.gain.setValueAtTime(0, w); v.gain.linearRampToValueAtTime(g, w + .005); v.gain.exponentialRampToValueAtTime(.0001, w + d);
    o.connect(v); v.connect(a.destination); o.start(w); o.stop(w + d + .02);
  }
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const chime = k => { const f = 523 * Math.pow(2, SCALE[Math.min(k, SCALE.length - 1)] / 12); tone(f, .5, 'sine', .07); tone(f * 2, .25, 'sine', .025); };
  const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };
  function speak(text) { say.textContent = text; }

  function start() {
    cover.hidden = true; box.querySelector('.w-game-end')?.remove();
    phase = 'play'; last = 0; t = 0;
    if (!W) resize();
    reset(); box.dataset.layers = '0';
    cv.focus({preventScroll: true});
    audio();
    speak(`เริ่มแล้ว ${game.hint} ซ้อนให้ถึง ${GOAL} ชั้น แตะ หรือกดเว้นวรรค เพื่อวาง`);
    raf ||= requestAnimationFrame(frame);
  }

  // input: a tap on the arena, or Space / Enter / ↓
  const onDown = e => { if (phase === 'play') { e.preventDefault(); drop(); } };
  const onKey = e => {
    if (!(e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown')) return;
    e.preventDefault(); // Space never scrolls the page while the game has focus
    if (phase === 'play') drop(); else if ((phase === 'idle' || phase === 'over') && e.key !== 'ArrowDown') start();
  };
  const onClick = e => {
    if (e.target.closest('.w-game-go, [data-again]')) start();
    if (e.target.closest('.w-game-snd')) { sound = !sound; snd.setAttribute('aria-pressed', String(sound)); snd.classList.toggle('is-off', !sound); }
  };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('keydown', onKey);
  root.addEventListener('click', onClick);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(cv);
  reset(); requestAnimationFrame(resize);
  imgs.forEach(i => i.decode?.().then(() => { if (phase !== 'play') draw(); }, () => {}));

  // for tests: where the sliding layer is, and how many are stacked
  box.stackGame = {get offset() { return moving ? moving.off : null; }, get placed() { return placed(); }, get phase() { return phase; }};
  return () => {
    phase = 'gone'; cancelAnimationFrame(raf);
    ro?.disconnect();
    root.removeEventListener('click', onClick);
    try { ac?.close(); } catch {}
  };
}
