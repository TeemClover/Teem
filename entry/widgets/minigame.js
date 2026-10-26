// "มินิเกมโปรโมต" widget: every business plays its own game (owner brief 2026-10-26: each business's game should be
// different, creative, and look ahead of its time). They share one arena: a dark, deep space lit by the style's colour,
// neon edges, a HUD in Chakra Petch, small synthesised sounds after the first tap, and a sample coupon for a win.
//   café   → ซ้อนเค้กให้สูง  stack cake layers in isometric 3D; a perfect drop keeps the full size   (games/stack.js)
//   tutor  → บวกให้พอดี      number orbs circle a core; tap two that add up to its number          (games/orbs.js)
//   yarn   → ต่อไหมพรม       drag yarn between balls of the same colour, threads never cross       (games/yarn.js)
//   studio → กดชัตเตอร์       a viewfinder: shoot when the shop's own photo is sharp and centred     (games/focus.js)
// Each game is a small module, fetched only when its business is picked. No prize is real and nothing leaves the
// page. Reduced motion gets a still "tap the right ones" board instead.
const GAMES = {
  cafe: {mod: 'stack', title: 'ซ้อนเค้กให้สูง', hint: 'แตะให้ชั้นเค้กวางตรงกัน ตรงพอดีได้ชั้นเต็ม', goal: 'ซ้อนถึง 10 ชั้น', how: 'แตะ หรือกดเว้นวรรค เพื่อวางชั้น', coupon: 'ส่วนลด 10% เมนูเช้า', suffix: '10', good: 'photo', bad: 'bean', badName: 'เมล็ดไหม้'},
  coach: {mod: 'orbs', title: 'บวกให้พอดี', hint: 'แตะเลข 2 ลูกที่บวกกันได้เลขกลางจอ', goal: 'ครบ 6 คู่ใน 45 วินาที', how: 'แตะเลข หรือใช้ลูกศรเลือกแล้วกดเว้นวรรค', coupon: 'ทดลองเรียนฟรีเพิ่ม 15 นาที', suffix: '15', good: 'math', bad: 'math'},
  shop: {mod: 'yarn', title: 'ต่อไหมพรม', hint: 'ลากเส้นไหมเชื่อมลูกสีเดียวกัน เส้นห้ามทับกัน', goal: 'ต่อครบ 3 ผืน', how: 'ลากด้วยนิ้ว หรือใช้ลูกศร กดเว้นวรรคเพื่อจับเส้น', coupon: 'ส่งฟรี 1 ชิ้น', suffix: 'SHIP', good: 'yarn', bad: 'scissors', badName: 'กรรไกร'},
  studio: {mod: 'focus', title: 'กดชัตเตอร์', hint: 'รอให้ภาพคมและอยู่กลางกรอบ แล้วแตะถ่าย', goal: 'ภาพสวย 5 จาก 8 ช็อต', how: 'แตะ หรือกดเว้นวรรค เพื่อถ่าย', coupon: 'ส่วนลด 10% แพ็กเกจถ่ายภาพ', suffix: '10', good: 'photo', bad: 'blur', badName: 'ภาพเบลอ'},
};
const TARGETS = [10, 12, 15, 20, 24];
const HUD_FONT = "'Chakra Petch', 'Anuphan', system-ui, sans-serif";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k;
const hex = c => { const m = /^#?([\da-f]{6})$/i.exec(String(c).trim()); if (!m) return [200, 160, 90]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `#${A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('')}`; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const mod = (k, m) => ((k % m) + m) % m;
const util = {clamp, rnd, pick, lerp, hex, mix, rgba, mod, HUD_FONT};

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
  return reduced ? board(root, {industry, esc, game, imgs, ticket}) : arena(root, {industry, esc, game, imgs, ticket});
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

/* ---------- the arena every game plays in ---------- */
function arena(root, {industry, esc, game, imgs, ticket}) {
  root.innerHTML = `<div class="w-game is-arena is-${esc(game.mod)}" data-game="${esc(game.key)}" data-score="0">
    <canvas class="w-game-canvas" tabindex="0" aria-label="${esc(game.title)}: ${esc(game.how)}"></canvas>
    <button type="button" class="w-game-snd" aria-pressed="true" aria-label="เสียงในเกม">♪</button>
    <div class="w-game-cover"><span class="w-game-brand">${esc(industry.brand)}</span><b>${esc(game.title)}</b><p>${esc(game.hint)}</p>
      <button type="button" class="w-go w-game-go" disabled>เริ่มเล่น</button><small>${esc(game.goal)} รับ: ${esc(game.coupon)} (คูปองจำลอง)</small></div>
    <p class="sr-only" aria-live="polite" data-say></p>
  </div>`;
  const box = root.querySelector('.w-game'), cv = box.querySelector('canvas'), cover = box.querySelector('.w-game-cover'), say = box.querySelector('[data-say]'), snd = box.querySelector('.w-game-snd');
  const ctx = cv.getContext('2d');
  const css = getComputedStyle(box);
  const v = n => css.getPropertyValue(n).trim();
  const C = {accent: v('--demo-accent') || '#d2691e', text: v('--demo-text') || '#222222', bg: v('--demo-bg') || '#ffffff'};
  // a black accent (minimal) would give no light: it glows white-blue instead
  const lum = c => { const [r, g, b] = hex(c); return (r * .299 + g * .587 + b * .114) / 255; };
  const glowC = lum(C.accent) < .2 ? '#cfd8ff' : C.accent;
  const neon = mix(glowC, '#ffffff', .25), deep = mix(glowC, '#05060a', .9), deep2 = mix(glowC, '#05060a', .74);

  let raf = 0, last = 0, phase = 'idle', outro = 0, won = false, endText = '', sound = true, ac = null, shakeV = 0, score = 0;
  let parts = [], texts = [], g = null, alive = true;

  const kit = {
    ctx, cv, box, imgs, game, C, glowC, neon, deep, deep2, W: 0, H: 0, dpr: 1, t: 0, u: util,
    get phase() { return phase; },
    // sparks: n points from (x, y)
    burst(x, y, n = 16, colors = [neon, '#ffffff'], power = 1) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(40, 170) * power; parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40 * power, life: rnd(.4, .9), c: pick(colors), r: rnd(1, 2.2)}); } },
    // a word that floats up and fades
    pop(text, x, y, size = 1) { texts.push({text, x: x ?? kit.W / 2, y: y ?? kit.H * .2, life: 1, size}); },
    shake(v) { shakeV = Math.max(shakeV, v); },
    score(n) { score = n; box.dataset.score = String(n); },
    say(text) { say.textContent = text; },
    win(text) { if (phase !== 'play') return; phase = 'outro'; outro = 1.4; won = true; endText = text; for (let i = 0; i < 90; i++) parts.push({x: kit.W / 2 + rnd(-kit.W * .3, kit.W * .3), y: kit.H * .5 + rnd(-kit.H * .3, kit.H * .2), vx: rnd(-140, 140), vy: rnd(-260, -40), life: rnd(.8, 1.6), c: pick([neon, '#ffffff', '#ffd23f', C.accent]), r: rnd(1.2, 2.4)}); [0, 4, 7, 12].forEach((s, i) => setTimeout(() => kit.tone(523 * Math.pow(2, s / 12), .35, 'sine', .08), i * 90)); kit.say(`ชนะแล้ว ได้คูปอง ${game.coupon}`); },
    lose(text) { if (phase !== 'play') return; phase = 'outro'; outro = 1; won = false; endText = text; kit.say(`พลาดแล้ว ${text}`); },
    tone(f, d, type = 'sine', gain = .06, glide = 0) {
      const a = audio(); if (!a) return;
      const o = a.createOscillator(), vg = a.createGain(), w = a.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, w); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * glide), w + d);
      vg.gain.setValueAtTime(0, w); vg.gain.linearRampToValueAtTime(gain, w + .005); vg.gain.exponentialRampToValueAtTime(.0001, w + d);
      o.connect(vg); vg.connect(a.destination); o.start(w); o.stop(w + d + .02);
    },
    noise(d = .08, gain = .08, f = 2400) {
      const a = audio(); if (!a) return;
      const len = Math.max(1, Math.floor(a.sampleRate * d)), b = a.createBuffer(1, len, a.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = a.createBufferSource(), bp = a.createBiquadFilter(), vg = a.createGain();
      s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; vg.gain.value = gain;
      s.connect(bp); bp.connect(vg); vg.connect(a.destination); s.start();
    },
    // rising notes for a run of good moves
    chime(k) { const SC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; const f = 523 * Math.pow(2, SC[Math.min(Math.max(0, k), SC.length - 1)] / 12); kit.tone(f, .5, 'sine', .07); kit.tone(f * 2, .25, 'sine', .025); },
    buzz(ms) { try { navigator.vibrate?.(ms); } catch {} },
    font(px, w = 600) { return `${w} ${px}px ${HUD_FONT}`; },
    // the deep space behind every game: a gradient lit from below by the style's colour, and a few stars
    background() {
      const {W, H, dpr} = kit;
      if (!bgCache || bgCache.w !== W || bgCache.h !== H) {
        const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        const x = c.getContext('2d'); x.scale(dpr, dpr);
        const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, deep); gr.addColorStop(1, deep2); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        const rg = x.createRadialGradient(W / 2, H * .7, 0, W / 2, H * .7, W * .7); rg.addColorStop(0, rgba(glowC, .32)); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; x.fillRect(Math.random() * W, Math.random() * H * .8, 1, 1); }
        bgCache = {c, w: W, h: H};
      }
      ctx.drawImage(bgCache.c, 0, 0, W, H);
      const sy = ((kit.t * 60) % (H + 40)) - 20; ctx.fillStyle = rgba(neon, .05); ctx.fillRect(0, sy, W, 2);
    },
  };
  let bgCache = null;
  function audio() { if (!sound) return null; if (!ac) { const A = window.AudioContext || window.webkitAudioContext; ac = A ? new A() : null; } if (ac?.state === 'suspended') ac.resume(); return ac; }

  function resize() {
    const r = cv.getBoundingClientRect();
    kit.W = Math.max(1, r.width); kit.H = Math.max(1, r.height);
    kit.dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(kit.W * kit.dpr); cv.height = Math.round(kit.H * kit.dpr);
    g?.resize?.();
    if (phase !== 'play' && phase !== 'outro') draw();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now; kit.t += dt;
    if (phase === 'play' || phase === 'outro') g.update(dt);
    parts.forEach(p => { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
    texts.forEach(x => { x.life -= dt * .9; }); texts = texts.filter(x => x.life > 0);
    shakeV = Math.max(0, shakeV - dt);
    draw();
    if (phase === 'outro') { outro -= dt; if (outro <= 0) { phase = 'over'; showEnd(); } }
    if (phase === 'play' || phase === 'outro' || parts.length) raf = requestAnimationFrame(frame);
  }
  function draw() {
    if (!kit.W || !g) return;
    ctx.setTransform(kit.dpr, 0, 0, kit.dpr, 0, 0);
    ctx.save();
    if (shakeV) ctx.translate(rnd(-3, 3) * shakeV * 4, rnd(-3, 3) * shakeV * 4);
    g.draw();
    parts.forEach(p => { ctx.globalAlpha = clamp(p.life * 1.5, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // HUD: what the game counts, and its bar; a timer on the right when the game has one
    const h = g.hud(), fs = Math.max(15, kit.W * .042);
    ctx.save();
    ctx.font = kit.font(fs); ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = neon; ctx.shadowBlur = 10;
    ctx.fillText(h.label, 14, 12);
    if (h.right) { ctx.textAlign = 'right'; ctx.fillStyle = h.warn ? '#ff8a8a' : '#ffffff'; ctx.fillText(h.right, kit.W - 56, 12); ctx.textAlign = 'left'; }
    const bw = kit.W * .34;
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(14, 14 + fs * 1.3, bw, 4);
    ctx.fillStyle = neon; ctx.fillRect(14, 14 + fs * 1.3, bw * clamp(h.progress, 0, 1), 4);
    texts.forEach(x => { ctx.globalAlpha = clamp(x.life * 1.4, 0, 1); ctx.font = kit.font(Math.max(17, kit.W * .062 * x.size)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = neon; ctx.shadowBlur = 18; ctx.fillText(x.text, x.x, x.y - (1 - x.life) * 24); });
    ctx.restore();
  }
  function showEnd() {
    box.insertAdjacentHTML('beforeend', `<div class="w-game-end">${won ? ticket : `<p class="w-game-miss"><b>เกือบแล้ว!</b> ${esc(endText)}</p>`}<button type="button" class="${won ? 'w-pill' : 'w-go w-game-go'}" data-again>${won ? 'เล่นอีกครั้ง' : 'ลองอีกรอบ'}</button></div>`);
  }
  function start() {
    if (!g) return;
    cover.hidden = true; box.querySelector('.w-game-end')?.remove();
    phase = 'play'; last = 0; kit.t = 0; parts = []; texts = []; shakeV = 0;
    if (!kit.W) resize();
    kit.score(0); g.reset();
    cv.focus({preventScroll: true});
    audio();
    kit.say(`เริ่มแล้ว ${game.hint} ${game.goal} ${game.how}`);
    raf ||= requestAnimationFrame(frame);
  }
  const wake = () => { if (phase === 'play') raf ||= requestAnimationFrame(frame); };

  // input: pointer (tap or drag) and keys; Space and the arrows never scroll the page while the game has focus
  const at = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onDown = e => { if (phase !== 'play') return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {} g.down?.(...at(e)); wake(); };
  const onMove = e => { if (phase === 'play' && g.move) g.move(...at(e)); };
  const onUp = e => { if (phase === 'play' && g.up) g.up(...at(e)); };
  const KEYS = [' ', 'Enter', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
  const onKey = e => {
    if (!KEYS.includes(e.key)) return;
    if (phase === 'play') { e.preventDefault(); g.key?.(e.key); wake(); }
    else if ((phase === 'idle' || phase === 'over') && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); start(); }
  };
  const onClick = e => {
    if (e.target.closest('.w-game-go, [data-again]')) start();
    if (e.target.closest('.w-game-snd')) { sound = !sound; snd.setAttribute('aria-pressed', String(sound)); snd.classList.toggle('is-off', !sound); }
  };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('keydown', onKey);
  root.addEventListener('click', onClick);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(cv);

  // the game itself: fetched now, with the same version as this file
  const ready = import(`./games/${game.mod}.js${new URL(import.meta.url).search}`).then(m => {
    if (!alive) return;
    g = m.create(kit);
    g.reset();
    box.querySelector('.w-game-go').disabled = false;
    requestAnimationFrame(resize);
    imgs.forEach(i => i.decode?.().then(() => { if (phase !== 'play') draw(); }, () => {}));
  }, () => { cover.querySelector('p').textContent = 'โหลดเกมไม่สำเร็จ ลองรีเฟรชหน้า'; });

  // for tests: the phase, the score, and what each game exposes to play it
  box.game = {get phase() { return phase; }, get score() { return score; }, get hook() { return g?.hook; }, ready};
  return () => {
    alive = false; phase = 'gone'; cancelAnimationFrame(raf);
    ro?.disconnect();
    root.removeEventListener('click', onClick);
    try { ac?.close(); } catch {}
  };
}
