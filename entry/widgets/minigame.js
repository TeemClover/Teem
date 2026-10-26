// "มินิเกมโปรโมต" widget: a 25-second catch game themed on the business that was picked, drawn on a canvas in the
// style's colours, using the business's own product photos. Win = a sample coupon ticket. No prize is real and
// nothing leaves the page. Reduced motion gets a still "tap the right ones" board instead of falling objects.
const DURATION = 25, GOAL = 8;
const GAMES = {
  cafe: {title: 'เก็บเมนูเช้า', hint: 'ลากถาดรับขนมกับกาแฟ หลบเมล็ดไหม้', good: 'photo', bad: 'bean', badName: 'เมล็ดไหม้', catcher: 'tray', bg: 'steam', coupon: 'ส่วนลด 10% เมนูเช้า', suffix: '10'},
  coach: {title: 'เก็บคำตอบที่ถูก', hint: 'รับเฉพาะโจทย์ที่ได้คำตอบตรงป้าย', good: 'math', bad: 'math', catcher: 'book', bg: 'grid', coupon: 'ทดลองเรียนฟรีเพิ่ม 15 นาที', suffix: '15'},
  shop: {title: 'เก็บไหมพรม', hint: 'รับไหมพรมลงตะกร้า หลบกรรไกร', good: 'yarn', bad: 'scissors', badName: 'กรรไกร', catcher: 'basket', bg: 'knit', coupon: 'ส่งฟรี 1 ชิ้น', suffix: 'SHIP'},
  studio: {title: 'เก็บภาพคม', hint: 'รับภาพคมชัด หลบภาพเบลอ', good: 'photo', bad: 'blur', badName: 'ภาพเบลอ', catcher: 'frame', bg: 'thirds', coupon: 'ส่วนลด 10% แพ็กเกจถ่ายภาพ', suffix: '10'},
};
const TARGETS = [10, 12, 15, 20, 24];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hex = c => { const m = /^#?([\da-f]{6})$/i.exec(String(c).trim()); if (!m) return [200, 160, 90]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const lum = c => { const [r, g, b] = hex(c); return (r * .299 + g * .587 + b * .114) / 255; };

// sums for the tutor: `good` equals the target, anything else is off by a little
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
  const code = `${(industry.brandEn || 'DEMO').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)}-${game.suffix}`;
  const ticket = `<div class="w-ticket" role="status"><span class="w-ticket-brand">${esc(industry.brand)} ให้คุณ</span><b>${esc(game.coupon)}</b><span class="w-ticket-code">${esc(code)}</span><small>คูปองจำลอง · ในเว็บจริงผูกกับร้านของคุณ</small></div>`;
  const imgs = photos.map(src => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; });
  return reduced ? board(root, {industry, esc, game, imgs, ticket}) : arcade(root, {industry, esc, game, imgs, ticket});
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

/* ---------- the arcade ---------- */
function arcade(root, {industry, esc, game, imgs, ticket}) {
  root.innerHTML = `<div class="w-game" data-game="${esc(game.key)}">
    <canvas class="w-game-canvas" tabindex="0" aria-label="${esc(game.title)}: ใช้ปุ่มลูกศรซ้ายขวา หรือลากเพื่อเลื่อน"></canvas>
    <div class="w-game-cover"><span class="w-game-brand">${esc(industry.brand)}</span><b>${esc(game.title)}</b><p>${esc(game.hint)}</p>
      <button type="button" class="w-go w-game-go">เริ่มเล่น · ${DURATION} วินาที</button><small>ชนะรับ: ${esc(game.coupon)} (คูปองจำลอง)</small></div>
    <p class="sr-only" aria-live="polite" data-say></p>
  </div>`;
  const box = root.querySelector('.w-game'), cv = box.querySelector('canvas'), cover = box.querySelector('.w-game-cover'), say = box.querySelector('[data-say]');
  const ctx = cv.getContext('2d');
  const css = getComputedStyle(box);
  const v = n => css.getPropertyValue(n).trim();
  const C = {on: v('--demo-on-accent') || '#ffffff', accent: v('--demo-accent') || '#d2691e', text: v('--demo-text') || '#222222', muted: v('--demo-muted') || '#777777', bg: v('--demo-bg') || '#ffffff', surface: v('--demo-surface') || '#ffffff', line: v('--demo-line') || '#dddddd', font: v('--demo-font') || 'system-ui, sans-serif'};
  const dark = lum(C.bg) < .35;
  const gold = '#f2c46b';
  C.hi = mix(C.accent, '#ffffff', .45); C.lo = mix(C.accent, '#000000', .35);

  let W = 0, H = 0, dpr = 1, R = 24, bg = null, sprites = {};
  let raf = 0, last = 0, phase = 'idle', elapsed = 0, spawnIn = 0, score = 0, combo = 0, target = pick(TARGETS), goodSinceTarget = 0;
  let cx = 0, tx = 0, keyDir = 0, squash = 0, shake = 0, flash = 0, outro = 0;
  let items = [], parts = [], texts = [];

  /* sprites: drawn once per size, then only moved */
  function sprite(draw) {
    const pad = 8, size = Math.ceil((R * 2 + pad * 2) * dpr);
    const s = document.createElement('canvas'); s.width = s.height = size;
    const x = s.getContext('2d'); x.scale(dpr, dpr);
    const c = R + pad;
    x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(c, c + R * .86, R * .74, R * .2, 0, 0, Math.PI * 2); x.fill();
    draw(x, c);
    return {s, half: R + pad};
  }
  const rim = (x, c) => {
    const g = x.createLinearGradient(c - R, c - R, c + R, c + R);
    g.addColorStop(0, C.hi); g.addColorStop(.5, C.accent); g.addColorStop(1, C.lo);
    x.lineWidth = 3; x.strokeStyle = g; x.beginPath(); x.arc(c, c, R - 1.5, 0, Math.PI * 2); x.stroke();
  };
  const gloss = (x, c) => {
    const g = x.createLinearGradient(0, c - R, 0, c);
    g.addColorStop(0, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(c, c - R * .46, R * .74, R * .42, 0, 0, Math.PI * 2); x.fill();
  };
  const photoSprite = (img, blur) => sprite((x, c) => {
    x.save(); x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.clip();
    let src = img;
    if (blur) { const t = document.createElement('canvas'); t.width = t.height = 10; t.getContext('2d').drawImage(img, 0, 0, 10, 10); src = t; x.imageSmoothingQuality = 'high'; }
    const k = Math.max(2 * R / (src.width || 1), 2 * R / (src.height || 1)), w = src.width * k, h = src.height * k;
    x.drawImage(src, c - w / 2, c - h / 2, w, h);
    if (blur) { x.fillStyle = 'rgba(128,128,128,.28)'; x.fillRect(c - R, c - R, 2 * R, 2 * R); }
    gloss(x, c); x.restore();
    if (blur) { x.setLineDash([4, 4]); x.lineWidth = 2.5; x.strokeStyle = rgba(C.muted, .9); x.beginPath(); x.arc(c, c, R - 1.5, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
    else rim(x, c);
  });
  const yarnSprite = col => sprite((x, c) => {
    const g = x.createRadialGradient(c - R * .35, c - R * .4, R * .1, c, c, R);
    g.addColorStop(0, mix(col, '#ffffff', .4)); g.addColorStop(1, mix(col, '#000000', .3));
    x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
    x.save(); x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.clip();
    x.strokeStyle = 'rgba(255,255,255,.38)'; x.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(c, c, R * 1.05, R * (.2 + k * .14), .6 + k * .35, 0, Math.PI * 2); x.stroke(); }
    x.restore();
    x.strokeStyle = mix(col, '#000000', .15); x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(c + R * .7, c + R * .6); x.quadraticCurveTo(c + R * 1.05, c + R * .9, c + R * .9, c + R * 1.15); x.stroke();
    gloss(x, c);
  });
  const beanSprite = () => sprite((x, c) => {
    x.strokeStyle = 'rgba(140,140,140,.55)'; x.lineWidth = 2; x.lineCap = 'round';
    for (const dx of [-6, 2, 9]) { x.beginPath(); x.moveTo(c + dx, c - R * .55); x.bezierCurveTo(c + dx - 6, c - R * .85, c + dx + 6, c - R * 1.0, c + dx, c - R * 1.25); x.stroke(); }
    x.save(); x.translate(c, c + 3); x.rotate(-.5);
    const g = x.createRadialGradient(-R * .2, -R * .25, 2, 0, 0, R * .9);
    g.addColorStop(0, '#5a3a24'); g.addColorStop(1, '#140b05');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, R * .62, R * .82, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#000'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(0, -R * .7); x.bezierCurveTo(-R * .25, -R * .2, R * .25, R * .2, 0, R * .7); x.stroke();
    x.restore();
  });
  const scissorsSprite = () => sprite((x, c) => {
    const steel = x.createLinearGradient(c - R, c - R, c + R, c + R);
    steel.addColorStop(0, '#f4f6f8'); steel.addColorStop(.5, '#9aa3ad'); steel.addColorStop(1, '#5d6670');
    x.lineCap = 'round';
    for (const s of [-1, 1]) {
      x.save(); x.translate(c, c); x.rotate(s * .35);
      x.fillStyle = steel; x.beginPath(); x.moveTo(-3, 0); x.lineTo(3, 0); x.lineTo(1.2, -R * .95); x.lineTo(-1.2, -R * .95); x.closePath(); x.fill();
      x.strokeStyle = '#c0392b'; x.lineWidth = 4; x.beginPath(); x.arc(0, R * .48, R * .3, 0, Math.PI * 2); x.stroke();
      x.restore();
    }
    x.fillStyle = '#2c3e50'; x.beginPath(); x.arc(c, c, 2.8, 0, Math.PI * 2); x.fill();
  });
  const sumSprite = text => sprite((x, c) => {
    const g = x.createRadialGradient(c - R * .3, c - R * .35, 2, c, c, R);
    g.addColorStop(0, dark ? mix(C.surface, '#ffffff', .12) : '#ffffff'); g.addColorStop(1, C.surface);
    x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
    rim(x, c);
    x.fillStyle = C.text; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = R * .66; x.font = `700 ${fs}px ${C.font}`;
    while (x.measureText(text).width > R * 1.6 && fs > 10) { fs -= 1; x.font = `700 ${fs}px ${C.font}`; }
    x.fillText(text, c, c + 1);
    gloss(x, c);
  });

  function buildBackground() {
    bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    const x = bg.getContext('2d'); x.scale(dpr, dpr);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, dark ? mix(C.bg, C.accent, .1) : mix(C.bg, '#ffffff', .5)); g.addColorStop(1, mix(C.bg, C.accent, dark ? .18 : .14));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const s = x.createRadialGradient(W / 2, -H * .2, 10, W / 2, -H * .2, H * 1.1);
    s.addColorStop(0, rgba(dark ? gold : '#ffffff', dark ? .2 : .6)); s.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.strokeStyle = rgba(C.accent, dark ? .16 : .12); x.fillStyle = rgba(C.accent, dark ? .16 : .12); x.lineWidth = 1.2;
    if (game.bg === 'grid') {
      for (let gx = 0; gx < W; gx += 18) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, H); x.stroke(); }
      for (let gy = 0; gy < H; gy += 18) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(W, gy + .5); x.stroke(); }
      x.font = `600 14px ${C.font}`; x.fillStyle = rgba(C.text, .12);
      ['x+y', '÷', '×', '=?', '½', 'π'].forEach((t, i) => x.fillText(t, (i * 97 + 30) % W, 40 + (i * 53) % (H - 70)));
    } else if (game.bg === 'knit') {
      for (let gy = 12; gy < H; gy += 16) for (let gx = (gy / 16 % 2) * 8; gx < W; gx += 16) { x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + 4, gy + 6); x.lineTo(gx + 8, gy); x.stroke(); }
    } else if (game.bg === 'thirds') {
      for (const f of [1 / 3, 2 / 3]) { x.beginPath(); x.moveTo(W * f, 0); x.lineTo(W * f, H); x.moveTo(0, H * f); x.lineTo(W, H * f); x.stroke(); }
      const m = 14, l = 16; x.lineWidth = 2;
      for (const [a, b, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { x.beginPath(); x.moveTo(a, b + sy * l); x.lineTo(a, b); x.lineTo(a + sx * l, b); x.stroke(); }
    } else {
      x.lineWidth = 2; x.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const sx = (i * 131 + 40) % W, sy = 30 + (i * 71) % (H - 80); x.beginPath(); x.moveTo(sx, sy + 30); x.bezierCurveTo(sx - 10, sy + 15, sx + 10, sy + 10, sx, sy - 6); x.stroke(); }
    }
    const fl = x.createLinearGradient(0, H - 26, 0, H);
    fl.addColorStop(0, rgba(C.accent, 0)); fl.addColorStop(1, rgba(C.accent, dark ? .25 : .18));
    x.fillStyle = fl; x.fillRect(0, H - 26, W, 26);
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    R = clamp(W * .068, 21, 34);
    buildBackground();
    sprites = {
      photo: imgs.filter(i => i.complete && i.naturalWidth).map(i => photoSprite(i)),
      blur: imgs.filter(i => i.complete && i.naturalWidth).map(i => photoSprite(i, true)),
      yarn: [C.accent, '#7a8f4a', '#c9a26b', '#b5546a'].map(yarnSprite),
      bean: beanSprite(), scissors: scissorsSprite(),
      orb: sprite((x, c) => { const g = x.createRadialGradient(c - R * .3, c - R * .35, 2, c, c, R); g.addColorStop(0, C.hi); g.addColorStop(1, C.lo); x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill(); gloss(x, c); }),
      smudge: sprite((x, c) => { x.fillStyle = 'rgba(120,120,120,.55)'; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill(); x.setLineDash([4, 4]); x.lineWidth = 2.5; x.strokeStyle = rgba(C.muted, .9); x.beginPath(); x.arc(c, c, R - 1.5, 0, Math.PI * 2); x.stroke(); }),
    };
    items.forEach(it => { if (it.text) it.sp = sumSprite(it.text); });
    cx = tx = clamp(cx || W / 2, catcherW() / 2, W - catcherW() / 2);
    draw();
  }
  const catcherW = () => clamp(W * .22, 78, 120);

  function spawn() {
    const goodChance = .7;
    const ok = Math.random() < goodChance;
    let sp, text = '';
    let val = 0;
    if (game.good === 'math') { ({text, val} = sum(target, ok)); sp = sumSprite(text); }
    else if (ok) sp = game.good === 'yarn' ? (Math.random() < .35 && sprites.photo.length ? pick(sprites.photo) : pick(sprites.yarn)) : (sprites.photo.length ? pick(sprites.photo) : sprites.orb);
    else sp = game.bad === 'blur' ? (sprites.blur.length ? pick(sprites.blur) : sprites.smudge) : sprites[game.bad];
    const p = elapsed / DURATION;
    items.push({x: rnd(R + 8, W - R - 8), y: -R, v: H * rnd(.5, .62) * (1 + p * .7), rot: game.good === 'math' ? 0 : rnd(-.3, .3), spin: game.good === 'math' ? 0 : rnd(-1.2, 1.2), ok, sp, text, val});
  }
  function burst(x, y, n, colors, power = 1) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(60, 220) * power; parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80 * power, life: 1, r: rnd(1.8, 4), c: pick(colors), sq: Math.random() < .4}); }
  }
  function float(x, y, t, c) { texts.push({x: clamp(x, 56, W - 56), y, t, c, life: 1}); }
  function speak(t) { say.textContent = t; }

  function catchIt(it) {
    if (it.ok) {
      score++; combo++; squash = 1;
      burst(it.x, it.y, 16, [C.accent, gold, C.hi]);
      float(it.x, it.y - R, combo >= 3 ? `คอมโบ x${combo}` : '+1', C.accent);
      if (game.good === 'math' && ++goodSinceTarget >= 3) { goodSinceTarget = 0; let n; do n = pick(TARGETS); while (n === target); target = n; float(W / 2, 64, `เป้าหมายใหม่ = ${target}`, C.text); items.forEach(i => { if (i.text) i.ok = i.val === target; }); }
      if (score % 2 === 0 || score === GOAL) speak(`เก็บได้ ${score} จาก ${GOAL}`);
    } else {
      score = Math.max(0, score - 1); combo = 0; shake = .35; flash = .3;
      burst(it.x, it.y, 10, ['#888888', '#555555'], .7);
      float(it.x, it.y - R, game.good === 'math' ? 'ผิด −1' : `${game.badName} −1`, '#c0392b');
    }
  }

  function frame(now) {
    raf = 0;
    if (phase !== 'play' && phase !== 'outro') return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    if (document.hidden) { raf = requestAnimationFrame(frame); return; }
    if (phase === 'play') {
      elapsed += dt;
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = clamp(.72 - elapsed / DURATION * .3, .4, .8); }
      if (keyDir) tx = clamp(tx + keyDir * W * 1.1 * dt, catcherW() / 2, W - catcherW() / 2);
      cx += (tx - cx) * Math.min(1, dt * 16);
      const top = H - 38, half = catcherW() / 2;
      for (const it of items) {
        it.y += it.v * dt; it.rot += it.spin * dt;
        if (!it.done && it.y + R * .6 >= top && it.y - R < top + 14 && Math.abs(it.x - cx) < half + R * .35) { it.done = true; catchIt(it); }
        if (it.y - R > H) { it.done = true; if (it.ok && game.good !== 'math') combo = 0; }
      }
      items = items.filter(it => !it.done);
      if (score >= GOAL) win();
      else if (elapsed >= DURATION) lose();
    } else {
      outro -= dt;
      if (outro <= 0) { phase = 'over'; showEnd(); draw(); return; }
    }
    for (const p of parts) { p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * (phase === 'outro' ? .55 : 1.4); }
    parts = parts.filter(p => p.life > 0);
    for (const t of texts) { t.y -= 34 * dt; t.life -= dt * 1.1; }
    texts = texts.filter(t => t.life > 0);
    squash = Math.max(0, squash - dt * 5); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function drawCatcher() {
    const w = catcherW(), y = H - 38, sq = 1 + squash * .12;
    ctx.save(); ctx.translate(cx, y); ctx.scale(sq, 2 - sq);
    const g = ctx.createLinearGradient(0, -6, 0, 26);
    g.addColorStop(0, C.hi); g.addColorStop(1, C.lo);
    ctx.fillStyle = g; ctx.strokeStyle = C.lo; ctx.lineWidth = 2;
    if (game.catcher === 'tray') {
      ctx.beginPath(); ctx.ellipse(0, 8, w / 2, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', .35); ctx.beginPath(); ctx.ellipse(0, 5, w / 2 - 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (game.catcher === 'book') {
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -2, w, 22, 5) : ctx.rect(-w / 2, -2, w, 22); ctx.fill();
      ctx.fillStyle = C.surface; for (let i = -w / 2 + 10; i < w / 2 - 4; i += 11) { ctx.beginPath(); ctx.arc(i, 1, 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = rgba('#ffffff', .4); ctx.beginPath(); ctx.moveTo(-w / 2 + 8, 11); ctx.lineTo(w / 2 - 8, 11); ctx.stroke();
    } else if (game.catcher === 'basket') {
      ctx.beginPath(); ctx.moveTo(-w / 2, -2); ctx.lineTo(w / 2, -2); ctx.lineTo(w / 2 - 10, 24); ctx.lineTo(-w / 2 + 10, 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', .35); ctx.lineWidth = 1.5;
      for (let i = -w / 2 + 8; i < w / 2; i += 10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 3, 22); ctx.stroke(); }
      for (const yy of [7, 15]) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, yy); ctx.lineTo(w / 2 - 6, yy); ctx.stroke(); }
    } else {
      ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.lineCap = 'round'; const l = 14, hw = w / 2, t = -6, b = 22;
      for (const [a, c, sx, sy] of [[-hw, t, 1, 1], [hw, t, -1, 1], [-hw, b, 1, -1], [hw, b, -1, -1]]) { ctx.beginPath(); ctx.moveTo(a, c + sy * l); ctx.lineTo(a, c); ctx.lineTo(a + sx * l, c); ctx.stroke(); }
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(0, 8, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function pill(x, y, text, fill, color) {
    ctx.font = `600 14px ${C.font}`;
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, 26, 13) : ctx.rect(x, y, w, 26); ctx.fill();
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, x + 11, y + 13.5);
    return w;
  }
  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake) ctx.translate(rnd(-1, 1) * shake * 10, rnd(-1, 1) * shake * 6);
    ctx.drawImage(bg, 0, 0, W, H);
    for (const it of items) { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.drawImage(it.sp.s, -it.sp.half, -it.sp.half, it.sp.half * 2, it.sp.half * 2); ctx.restore(); }
    drawCatcher();
    for (const p of parts) { ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.c; if (p.sq) ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of texts) { ctx.globalAlpha = clamp(t.life * 1.4, 0, 1); ctx.font = `700 16px ${C.font}`; ctx.lineWidth = 4; ctx.strokeStyle = rgba(dark ? '#000000' : '#ffffff', .7); ctx.strokeText(t.t, t.x, t.y); ctx.fillStyle = t.c; ctx.fillText(t.t, t.x, t.y); }
    ctx.globalAlpha = 1;
    // HUD: score with a bar, the goal for the tutor, a timer ring
    const panel = rgba(C.surface, dark ? .82 : .9);
    const w = pill(10, 10, `เก็บได้ ${score}/${GOAL}`, panel, C.text);
    ctx.fillStyle = rgba(C.line, .9); ctx.fillRect(10, 40, w, 4);
    ctx.fillStyle = C.accent; ctx.fillRect(10, 40, w * Math.min(1, score / GOAL), 4);
    if (game.good === 'math') { ctx.font = `700 15px ${C.font}`; const t = `หาคำตอบ = ${target}`; const tw = ctx.measureText(t).width + 26; pill((W - tw) / 2, 10, t, C.accent, C.on); }
    const left = Math.max(0, DURATION - elapsed), rx = W - 26, ry = 26;
    ctx.fillStyle = panel; ctx.beginPath(); ctx.arc(rx, ry, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(rx, ry, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / DURATION)); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = `700 13px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText(String(Math.ceil(left)), rx, ry + 1);
    if (flash) { ctx.fillStyle = `rgba(192,57,43,${flash * .35})`; ctx.fillRect(0, 0, W, H); }
  }

  function start() {
    cover.hidden = true; box.querySelector('.w-game-end')?.remove();
    phase = 'play'; elapsed = 0; spawnIn = .3; score = 0; combo = 0; items = []; parts = []; texts = []; goodSinceTarget = 0; target = pick(TARGETS); last = 0;
    if (!W) resize();
    cv.focus({preventScroll: true});
    speak(`เริ่มแล้ว ${game.hint} เก็บให้ได้ ${GOAL} ชิ้นใน ${DURATION} วินาที`);
    raf ||= requestAnimationFrame(frame);
  }
  function win() {
    phase = 'outro'; outro = 1.1; items = [];
    for (let i = 0; i < 4; i++) burst(rnd(W * .2, W * .8), rnd(H * .2, H * .5), 22, [C.accent, gold, C.hi, '#ffffff'], 1.3);
    speak(`ชนะแล้ว ได้คูปอง ${game.coupon}`);
  }
  function lose() { phase = 'outro'; outro = .4; items = []; speak(`หมดเวลา เก็บได้ ${score} จาก ${GOAL}`); }
  function showEnd() {
    const won = score >= GOAL;
    box.insertAdjacentHTML('beforeend', `<div class="w-game-end">${won ? ticket : `<p class="w-game-miss"><b>เกือบแล้ว!</b> เก็บได้ ${score}/${GOAL}</p>`}<button type="button" class="${won ? 'w-pill' : 'w-go w-game-go'}" data-again>${won ? 'เล่นอีกครั้ง' : 'ลองอีกรอบ'}</button></div>`);
  }

  // input: drag or tap anywhere on the board, or the arrow keys
  const toX = e => { const r = cv.getBoundingClientRect(); tx = clamp(e.clientX - r.left, catcherW() / 2, W - catcherW() / 2); };
  const onDown = e => { if (phase !== 'play') return; cv.setPointerCapture?.(e.pointerId); toX(e); };
  const onMove = e => { if (phase === 'play' && (e.buttons || e.pointerType === 'mouse')) toX(e); };
  const onKey = e => {
    if (phase !== 'play') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keyDir = e.key === 'ArrowLeft' ? -1 : 1; e.preventDefault(); }
  };
  const onKeyUp = e => { if ((e.key === 'ArrowLeft' && keyDir < 0) || (e.key === 'ArrowRight' && keyDir > 0)) keyDir = 0; };
  const onClick = e => { if (e.target.closest('.w-game-go, [data-again]')) start(); };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('keydown', onKey);
  addEventListener('keyup', onKeyUp);
  root.addEventListener('click', onClick);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(cv);
  imgs.forEach(i => i.decode?.().then(() => { if (W) resize(); }, () => {}));
  requestAnimationFrame(resize);

  return () => {
    phase = 'gone'; cancelAnimationFrame(raf);
    ro?.disconnect();
    removeEventListener('keyup', onKeyUp);
    root.removeEventListener('click', onClick);
  };
}
