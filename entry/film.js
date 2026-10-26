/**
 * The homepage film "ใบที่ 4" (owner brief and approved script, 2026-10-26): 20 seconds that loop, drawn in code.
 *   0.0–1.5   a point of light draws a four-leaf clover; leaves 1–3 are the three answers, leaf 4 is gold
 *   1.5–4.5   three taps fill leaves 1, 2 and 3 (business · what you want · style); their answers pop out
 *   4.5–6.5   the answers fly into the gold leaf; it splits open and becomes a whole website
 *   6.5–14.5  one leaf flips at a time and the whole site changes: photos, colours, type, layout, module, device;
 *             then faster and faster through the 64
 *   14.5–17   a beat of silence; the wall of all 64 sites; they fold back into one gold leaf
 *   17–20     the clover again, empty, waiting for you; it closes into the point of light and the loop restarts
 * Every loop picks a different combination (deterministic per loop, so tests can seek). The websites are drawn from
 * the same data, colours, fonts and photos the real templates use (entry/data.json, entry/media/film/atlas.webp).
 * Captions and buttons are HTML (entry/home.html); this file only sets #film[data-cap] and #film[data-act].
 * Sound is synthesised with WebAudio, off until the visitor turns it on. Nothing is sent anywhere.
 */
const TAU = Math.PI * 2;
const LOOP = 20;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: x => 1 - Math.pow(1 - clamp(x), 3),
  in: x => Math.pow(clamp(x), 3),
  io: x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  expo: x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); },
  back: x => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  sine: x => -(Math.cos(Math.PI * clamp(x)) - 1) / 2,
};
const env = (t, a, b, fi = .3, fo = .3) => t < a || t > b ? 0 : Math.min(E.out((t - a) / fi), E.sine((b - t) / fo));
function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hex = c => { const m = /^#?([\da-f]{6})$/i.exec(String(c).trim()); const n = m ? parseInt(m[1], 16) : 0x888888; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

// captions (HTML, index = data-c) and acts (for CSS: the title steps aside while the site plays)
const CAPS = [[.2, 4.4], [4.7, 6.4], [6.6, 9.4], [10.6, 12.4], [15, 16.9], [17.2, 19.4]];
const ACTS = [0, 1.5, 4.5, 6.5, 14.5, 17];
const FLIP_KINDS = ['style', 'ind', 'feat', 'style', 'device', 'ind', 'feat', 'style'];
const FLIP_TIMES = [6.5, 7.5, 8.5, 9.5, 10.5, 11, 11.5, 12];
// 12.5–14.5: a reel of whole sites sliding past, faster and faster (no flashing: every site stays whole and readable)
const REEL = {from: 12.5, to: 14.5, n: 9};
const reelX = t => (REEL.n - 1) * (s => .35 * s + .65 * s * s)(seg(t, REEL.from, REEL.to)); // which site is centred
const reelTimes = Array.from({length: REEL.n}, (_, k) => { const x = k / (REEL.n - 1), s = (-.35 + Math.sqrt(.35 * .35 + 4 * .65 * x)) / (2 * .65); return REEL.from + s * (REEL.to - REEL.from); });
// photo sheet: built by tools/build-film-atlas.mjs (rows = business, columns = style)
const ATLAS = {url: '/entry/media/film/atlas.webp', hw: 288, hh: 180, it: 96, itemsY: 720};
// the clover leaf, pointing up from the centre (same path as the poster in entry/home.html)
const LEAF = 'M0 0C-5-9-19-11-19-23-19-32-10-35-4.5-29.5-2.5-27.5-1-26.5 0-24.5 1-26.5 2.5-27.5 4.5-29.5 10-35 19-32 19-23 19-11 5-9 0 0Z';
const LEAF_LEN = 118; // its outline length in path units
const ANG = [-45, 45, 135, 225].map(d => d * Math.PI / 180);
const GOLD = ['#7b5c26', '#c9a253', '#f6e2a4', '#b08a3e', '#fff4c9', '#a98337', '#e8cd88'];

/* ======================================================================================= the plan of one loop */
function planLoop(L, n) {
  const r = rng(9173 + L * 7919);
  const pick = (cur, len) => { let v; do { v = Math.floor(r() * len); } while (v === cur); return v; };
  // loop 0 is the script's example: café · booking · luxury
  const start = L === 0 ? {i: 0, f: 1, s: 1} : {i: Math.floor(r() * n.i), f: Math.floor(r() * n.f), s: Math.floor(r() * n.s)};
  const flips = [];
  let cur = {...start, d: 0};
  const styleOrder = L === 0 ? [2, 3, 0] : [0, 1, 2, 3].filter(s => s !== start.s).sort(() => r() - .5);
  let si = 0;
  FLIP_KINDS.forEach((kind, k) => {
    const next = {...cur};
    if (kind === 'style') next.s = styleOrder[si++ % 3];
    if (kind === 'ind') next.i = L === 0 ? [2, 3][k === 1 ? 0 : 1] : pick(cur.i, n.i);
    if (kind === 'feat') next.f = L === 0 ? [2, 3][k === 2 ? 0 : 1] : pick(cur.f, n.f);
    if (kind === 'device') next.d = 1 - cur.d;
    flips.push({t: FLIP_TIMES[k], kind, from: cur, to: next, dur: .5});
    cur = next;
  });
  // the reel: the site as it is now, then eight more, each one answer away from the last
  const reel = [{...cur}];
  for (let k = 1; k < REEL.n; k++) {
    const next = {...reel[k - 1]};
    const kind = 'sisfsisf'[k - 1]; // the look changes every other site, so the reel reads as many sites, not one
    if (kind === 's') next.s = pick(next.s, n.s); else if (kind === 'i') next.i = pick(next.i, n.i); else next.f = pick(next.f, n.f);
    reel.push(next);
  }
  return {start, flips, reel};
}

/* ======================================================================================= the film */
export function createFilm({root, canvas, data, reduced, autoplay = true, loadFont, emit = () => {}, onLeaf, sound, pause, count}) {
  const ctx = canvas.getContext('2d');
  const inds = data.industries, feats = data.features, stys = data.styles;
  const N = {i: inds.length, f: feats.length, s: stys.length};
  const leaf = new Path2D(LEAF);
  const plans = new Map();
  const plan = L => { if (!plans.has(L)) { plans.set(L, planLoop(L, N)); if (plans.size > 4) plans.delete(plans.keys().next().value); } return plans.get(L); };
  const comboNo = c => c.i * 16 + c.f * 4 + c.s + 1;

  // the styles as the canvas needs them
  const ST = stys.map(s => {
    const v = s.vars;
    return {key: s.key, tpl: s.template, bg: v['--demo-bg'], surface: v['--demo-surface'], text: v['--demo-text'], muted: v['--demo-muted'], accent: v['--demo-accent'],
      onAccent: v['--demo-on-accent'], line: v['--demo-line'], display: v['--demo-display'] || v['--demo-font'], dw: v['--demo-display-w'] || '600',
      font: v['--demo-font'], tw: v['--demo-text-w'] || '400', ui: v['--demo-ui'] || "'Anuphan', sans-serif", hand: v['--demo-hand'] || v['--demo-font'],
      condensed: (v['--demo-display-x'] || '100%') !== '100%', dark: !!s.dark, radius: parseFloat(v['--demo-radius']) || 8, label: s.label};
  });
  stys.forEach(s => loadFont?.(s));
  // the template fonts arrive through their own stylesheets: wait until their faces are declared, then fetch them
  // (asking before the stylesheet is in finds no face, and a canvas alone never starts the download)
  const first = f => String(f).split(',')[0].replace(/["']/g, '').trim();
  const wanted = new Set(ST.flatMap(s => [first(s.display), first(s.font), first(s.ui), first(s.hand)]));
  const fontsReady = (async () => {
    for (let i = 0; i < 40; i++) {
      const faces = [...document.fonts].filter(f => wanted.has(first(f.family)));
      if (new Set(faces.map(f => first(f.family))).size >= wanted.size) { await Promise.all(faces.map(f => f.load().catch(() => {}))); return; }
      await new Promise(r => setTimeout(r, 150));
    }
  })();

  // icons from the page's own sprite, as canvas paths
  const icons = {};
  function icon(name) {
    if (icons[name]) return icons[name];
    const sym = document.getElementById(`i-${name}`);
    const parts = [];
    const n = (el, k) => +(el.getAttribute(k) || 0);
    sym?.querySelectorAll('path,circle,ellipse,rect,line,polyline').forEach(el => {
      const p = new Path2D(), tag = el.tagName.toLowerCase();
      if (tag === 'path') return parts.push(new Path2D(el.getAttribute('d')));
      if (tag === 'circle') p.arc(n(el, 'cx'), n(el, 'cy'), n(el, 'r'), 0, TAU);
      if (tag === 'ellipse') p.ellipse(n(el, 'cx'), n(el, 'cy'), n(el, 'rx'), n(el, 'ry'), 0, 0, TAU);
      if (tag === 'rect') p.roundRect ? p.roundRect(n(el, 'x'), n(el, 'y'), n(el, 'width'), n(el, 'height'), n(el, 'rx')) : p.rect(n(el, 'x'), n(el, 'y'), n(el, 'width'), n(el, 'height'));
      if (tag === 'line') { p.moveTo(n(el, 'x1'), n(el, 'y1')); p.lineTo(n(el, 'x2'), n(el, 'y2')); }
      if (tag === 'polyline') el.getAttribute('points').trim().split(/[\s,]+/).map(Number).reduce((a, v, k, arr) => { if (k % 2) (k === 1 ? p.moveTo(arr[0], v) : p.lineTo(arr[k - 1], v)); return a; }, 0);
      parts.push(p);
    });
    return (icons[name] = parts);
  }
  function drawIcon(name, x, y, size, color, lw = 1.8) {
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of icon(name)) ctx.stroke(p);
    ctx.restore();
  }

  // the photo sheet is decoded off the main thread into a bitmap before its first use (a first drawImage of a
  // still-encoded image would decode it in the middle of a frame)
  let atlas = null, atlasOk = false;
  (async () => {
    try {
      const img = new Image(); img.decoding = 'async'; img.src = ATLAS.url; await img.decode();
      atlas = 'createImageBitmap' in window ? await createImageBitmap(img) : img; atlasOk = true;
    } catch {}
  })();

  /* ---------------- stage ---------------- */
  let W = 0, H = 0, dpr = 1, portrait = false, U = 1, quality = 1;
  function size() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(devicePixelRatio || 1, W * H > 1.1e6 ? 1.5 : 1.75) * (quality < 1 ? .75 : 1);
    dpr = Math.max(1, dpr);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.05;
    U = Math.min(W, H) / 100;
  }
  // the clover sits where the HTML poster sits: centred at 40 % height; 44 % of the short side (max 340 px) wide, or
  // 62 % of the width (max 300 px) on a tall screen
  const cloverAt = () => ({x: W / 2, y: H * .4, s: (portrait ? Math.min(W * .62, 300) : Math.min(Math.min(W, H) * .44, 340)) / 120});
  // the website frame: a browser on wide stages, a phone on tall ones (and the device flip swaps them)
  function frameFor(device) {
    const top = H * (portrait ? .13 : .11), bottom = H - (portrait ? 212 : 206);
    const avail = Math.max(120, bottom - top);
    if (device === 'desk') {
      let w = Math.min(W * (portrait ? .9 : .72), avail * 1.6), h = w / 1.6;
      if (h > avail) { h = avail; w = h * 1.6; }
      return {x: (W - w) / 2, y: top + (avail - h) / 2, w, h, r: Math.max(10, w * .018), bar: Math.max(18, h * .07)};
    }
    let h = avail, w = h / 2.05;
    if (w > W * .7) { w = W * .7; h = w * 2.05; }
    return {x: (W - w) / 2, y: top + (avail - h) / 2, w, h, r: w * .13, bar: w * .1};
  }
  const lerpRect = (a, b, k) => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), r: lerp(a.r, b.r, k), bar: lerp(a.bar, b.bar, k)});

  /* ---------------- drawing helpers ---------------- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))) : ctx.rect(x, y, w, h); }
  // a face is "ready" once the browser has it; until then (and below a readable size) a soft bar stands in, so text
  // never flashes from a fallback face to the real one, and tiny type never turns into broken pixels
  const readyFaces = new Map();
  function faceReady(weight, family) {
    const key = weight + family, v = readyFaces.get(key);
    if (v === true) return true;
    const now = performance.now();
    if (typeof v === 'number' && now - v < 400) return false;
    let ok = true; try { ok = document.fonts.check(`${weight} 16px ${family}`, 'กขค'); } catch {}
    readyFaces.set(key, ok || now); return ok;
  }
  function bar(str, x, y, size, color, align, base, alpha, max) {
    const w = Math.min(max || 1e9, [...str].length * size * .5), h = Math.max(1.5, size * .38);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const y0 = base === 'middle' ? y - h / 2 : base === 'top' ? y : y - size * .45 - h / 2;
    ctx.save(); ctx.globalAlpha *= alpha * .32; ctx.fillStyle = color; rr(x0, y0, w, h, h / 2); ctx.fill(); ctx.restore();
  }
  function text(str, x, y, {size, weight = 400, family, color, align = 'left', base = 'alphabetic', alpha = 1, condensed = false, max}) {
    if (alpha <= .004 || size < 3) return;
    const barColor = typeof color === 'string' ? color : '#888888';
    if (!faceReady(weight, family)) return bar(str, x, y, size, barColor, align, base, alpha, max);
    // between 7.5 and 9.5 px the bar hands over to the letters gradually, so a page that grows never pops
    const k = clamp((size - 7.5) / 2);
    if (k < 1) bar(str, x, y, size, barColor, align, base, alpha * (1 - k), max);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha * k; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.font = `${weight} ${size.toFixed(1)}px ${family}`;
    if ('fontStretch' in ctx) ctx.fontStretch = condensed ? 'ultra-condensed' : 'normal';
    if (max) { const m = ctx.measureText(str).width; if (m > max) { ctx.font = `${weight} ${(size * max / m).toFixed(1)}px ${family}`; } }
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  const patterns = {};
  function pattern(kind) {
    if (patterns[kind]) return patterns[kind];
    const c = document.createElement('canvas'), d = kind === 'grain' ? 7 : 22;
    c.width = c.height = d; const x = c.getContext('2d');
    if (kind === 'grain') { x.fillStyle = 'rgba(140,90,40,.09)'; x.fillRect(1, 1, 1, 1); x.fillRect(4, 5, 1, 1); }
    else { x.fillStyle = 'rgba(232,62,140,.18)'; x.beginPath(); x.arc(d / 2, d / 2, 1.8, 0, TAU); x.fill(); }
    return (patterns[kind] = ctx.createPattern(c, 'repeat'));
  }
  // zoom > 1 crops into the middle of the photo (where its subject is)
  function photo(i, s, x, y, w, h, zoom = 1) {
    if (!atlasOk) { ctx.fillStyle = rgba(ST[s].accent, .25); ctx.fillRect(x, y, w, h); return; }
    const sw = ATLAS.hw, sh = ATLAS.hh, ar = w / h, sar = sw / sh;
    let cw = sw, ch = sh; if (ar > sar) ch = sw / ar; else cw = sh * ar;
    cw /= zoom; ch /= zoom;
    ctx.drawImage(atlas, s * sw + (sw - cw) / 2, i * sh + (sh - ch) / 2, cw, ch, x, y, w, h);
  }
  function item(i, s, n, x, y, w, h) {
    if (!atlasOk) { ctx.fillStyle = rgba(ST[s].accent, .2); ctx.fillRect(x, y, w, h); return; }
    const it = ATLAS.it, ar = w / h;
    let cw = it, ch = it; if (ar > 1) ch = it / ar; else cw = it * ar;
    ctx.drawImage(atlas, (s * 3 + n) * it + (it - cw) / 2, ATLAS.itemsY + i * it + (it - ch) / 2, cw, ch, x, y, w, h);
  }
  // gap: the leaves of a clover start a little away from its centre, so their outlines do not cross
  function leafPath(cx, cy, scale, ang, gap = 0) { const m = new DOMMatrix().translateSelf(cx, cy).rotateSelf(ang * 180 / Math.PI).translateSelf(0, -gap * scale).scaleSelf(scale, scale); const p = new Path2D(); p.addPath(leaf, m); return p; }
  function goldGrad(x0, y0, x1, y1, shift = 0) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    GOLD.forEach((c, k) => g.addColorStop(clamp((k / (GOLD.length - 1) + shift) % 1.0001), c));
    return g;
  }

  /* ---------------- the clover ---------------- */
  // draw: 0→1 outline drawn; fill[k]: 0→1 glass filled; hide[k]: leaf scale-out; pulse: leaf-1 invitation
  function clover(c, {draw = 1, fill = [0, 0, 0, 0], gold = 1, alpha = 1, hide = [0, 0, 0, 0], pulse = 0, glow = 0, combo, t}) {
    ctx.save(); ctx.globalAlpha *= alpha;
    // stem
    ctx.strokeStyle = rgba('#8fd3a0', .75); ctx.lineWidth = 1.6 * c.s; ctx.lineCap = 'round';
    ctx.setLineDash([80 * c.s, 400 * c.s]); ctx.lineDashOffset = (1 - draw) * 80 * c.s;
    ctx.beginPath(); ctx.moveTo(c.x, c.y + 2 * c.s); ctx.bezierCurveTo(c.x + 3 * c.s, c.y + 24 * c.s, c.x + 2 * c.s, c.y + 44 * c.s, c.x - 6 * c.s, c.y + 64 * c.s); ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 4; k++) {
      const h = hide[k];
      if (h >= 1) continue;
      const sc = c.s * (1 - h) * (k === 0 ? 1 + pulse * .07 : 1);
      const p = leafPath(c.x, c.y, sc, ANG[k], 3);
      const f = fill[k];
      // glass (leaves 1–3) or gold (leaf 4)
      if (k === 3 ? gold * draw > 0 : f > 0) {
        const dx = Math.sin(ANG[k]), dy = -Math.cos(ANG[k]);
        const cx2 = c.x + dx * 21 * sc, cy2 = c.y + dy * 21 * sc; // the middle of the leaf
        const bx = c.x + dx * 3 * sc, by = c.y + dy * 3 * sc, ex = c.x + dx * 27 * sc, ey = c.y + dy * 27 * sc; // its midrib
        ctx.save(); ctx.clip(p);
        const box = [cx2 - 26 * sc, cy2 - 26 * sc, 52 * sc, 52 * sc];
        if (k === 3) {
          ctx.globalAlpha *= clamp(gold * draw);
          ctx.fillStyle = goldGrad(c.x - 30 * sc, c.y - 30 * sc, c.x + 30 * sc, c.y + 30 * sc, (t || 0) * .03);
          ctx.fillRect(...box);
          // a slow band of light across the gold
          const at = (((t || 0) * .35) % 1.8) - .4, sh = ctx.createLinearGradient(cx2 - 26 * sc, cy2 - 26 * sc, cx2 + 26 * sc, cy2 + 26 * sc);
          sh.addColorStop(clamp(at - .12), 'rgba(255,250,230,0)'); sh.addColorStop(clamp(at), 'rgba(255,250,230,.55)'); sh.addColorStop(clamp(at + .12), 'rgba(255,250,230,0)');
          ctx.fillStyle = sh; ctx.fillRect(...box);
          if (glow > 0) { ctx.fillStyle = `rgba(255,246,214,${glow * .55})`; ctx.fillRect(...box); }
          ctx.strokeStyle = 'rgba(110,80,30,.38)'; ctx.lineWidth = Math.max(.7, .8 * sc); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        } else {
          ctx.globalAlpha *= E.out(f);
          // deep green glass
          const base = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 26 * sc);
          base.addColorStop(0, '#2f7a4a'); base.addColorStop(1, '#0c2f1e');
          ctx.fillStyle = base; ctx.fillRect(...box);
          // the answer, upright and filling the leaf: the business's product · the feature · the style's own photo
          if (combo && atlasOk) {
            const R = 25 * sc;
            if (k === 0) item(combo.i, combo.s, 0, cx2 - R, cy2 - R, R * 2, R * 2);
            if (k === 2) photo(combo.i, combo.s, cx2 - R, cy2 - R, R * 2, R * 2, 1.45);
          }
          if (combo && k === 1) {
            const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 15 * sc); g.addColorStop(0, 'rgba(242,215,154,.4)'); g.addColorStop(1, 'rgba(242,215,154,0)');
            ctx.fillStyle = g; ctx.fillRect(...box);
            if (sc > .9) drawIcon(feats[combo.f].icon, cx2, cy2, 17 * sc, '#fff4d6', 1.6);
          }
          // keep the picture inside the clover's light: a soft vignette and a sheen (no midrib: over a photo it reads as a scratch)
          const v = ctx.createRadialGradient(cx2 - 3 * sc, cy2 - 5 * sc, 5 * sc, cx2, cy2, 25 * sc);
          v.addColorStop(0, 'rgba(8,32,20,0)'); v.addColorStop(.7, 'rgba(8,32,20,.12)'); v.addColorStop(1, 'rgba(6,24,15,.6)');
          ctx.fillStyle = v; ctx.fillRect(...box);
          const sh = ctx.createLinearGradient(cx2 - 22 * sc, cy2 - 24 * sc, cx2 + 8 * sc, cy2 + 6 * sc);
          sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(.5, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sh; ctx.fillRect(...box);
        }
        ctx.restore();
      }
      // outline, drawn in by `draw`
      ctx.save();
      ctx.lineWidth = clamp(1.1 * sc, 1, 2.2); ctx.lineJoin = 'round';
      ctx.strokeStyle = k === 3 ? '#f6e2a4' : (f > .5 ? 'rgba(232,255,240,.92)' : '#8fd3a0');
      if (k < 3 && f > .5) { ctx.shadowColor = 'rgba(143,211,160,.55)'; ctx.shadowBlur = 6; }
      const len = LEAF_LEN * sc;
      ctx.setLineDash([len * draw, len]); ctx.lineDashOffset = 0;
      if (k === 3 && glow > 0) { ctx.shadowColor = 'rgba(255,230,160,.9)'; ctx.shadowBlur = 30 * glow; }
      ctx.stroke(p);
      ctx.restore();
    }
    ctx.restore();
  }
  function ripple(x, y, k) {
    if (k <= 0 || k >= 1) return;
    ctx.save();
    // a fingertip: a soft point of light and two thin rings, not a solid dot over the picture
    const on = Math.sin(k * Math.PI), r = 6 + k * 34 * U * .12 + k * 20;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(255,244,214,${(1 - k) * .85})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,244,214,${(1 - k) * .4})`; ctx.beginPath(); ctx.arc(x, y, r * .62, 0, TAU); ctx.stroke();
    const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
    g.addColorStop(0, `rgba(255,250,235,${on * .75})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
    ctx.restore();
  }
  // an answer chip: icon + label on a dark glass pill
  function chip(x, y, iconName, label, a, scale = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(scale, scale);
    const fs = Math.max(13, U * 2.1);
    ctx.font = `600 ${fs}px 'Anuphan', sans-serif`;
    const w = ctx.measureText(label).width + fs * 2.6, h = fs * 2.1;
    rr(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(14,16,14,.82)'; ctx.fill();
    ctx.strokeStyle = 'rgba(242,215,154,.65)'; ctx.lineWidth = 1; ctx.stroke();
    drawIcon(iconName, -w / 2 + fs * 1.15, 0, fs * 1.15, '#f2d79a', 2);
    text(label, -w / 2 + fs * 2, fs * .36, {size: fs, weight: 600, family: "'Anuphan', sans-serif", color: '#fff'});
    ctx.restore();
  }

  /* ---------------- the website mock-ups (one per template, wide and narrow) ---------------- */
  // boxes in fractions of the content area; d = 0 wide (browser), 1 narrow (phone)
  const LAY = {
    maison: [
      {photo: [0, 0, 1, 1], title: [.5, .45, .085], tag: [.5, .54, .024], cta: [.5, .62, .2, .07], seal: [.5, .25, .05], module: [.64, .68, .32, .25], cards: [.05, .7, .11, .23, .125]},
      {photo: [0, 0, 1, .44], title: [.5, .53, .13], tag: [.5, .59, .042], cta: [.5, .66, .52, .05], seal: [.5, .2, .1], module: [.06, .74, .88, .2], cards: null},
    ],
    journal: [
      {photo: [.5, .17, .42, .5, -4], title: [.05, .33, .1], tag: [.05, .42, .025], cta: [.05, .48, .17, .07], mast: .09, module: [.05, .62, .38, .3], cards: [.5, .73, .13, .2, .155]},
      {photo: [.1, .2, .8, .3, -3], title: [.06, .15, .15], tag: [.06, .58, .045], cta: [.06, .63, .46, .05], mast: .05, module: [.06, .72, .88, .22], cards: null},
    ],
    pop: [
      {photo: [.54, .1, .38, .6], title: [.05, .34, .1], tag: [.05, .43, .028], cta: [.05, .5, .19, .075], module: [.05, .63, .4, .3], cards: [.52, .74, .13, .2, .16]},
      {photo: [.16, .06, .68, .34], title: [.06, .5, .15], tag: [.06, .56, .046], cta: [.06, .61, .48, .052], module: [.06, .7, .88, .24], cards: null},
    ],
    index: [
      {photo: [.34, .17, .62, .5], title: [.035, .9, .13], tag: [.035, .22, .022], cta: [.035, .29, .16, .05], meta: .08, module: [.035, .38, .27, .32], cards: [.66, .73, .3, .055, .065]},
      {photo: [.06, .1, .88, .26], title: [.06, .48, .17], tag: [.06, .54, .04], cta: [.06, .58, .4, .04], meta: .045, module: [.06, .64, .88, .24], cards: null},
    ],
  };
  // where a page's parts are, for one combination, inside rect C (content area); w = 0..1 phone-ness
  function boxes(tpl, w, C) {
    const A = LAY[tpl][0], B = LAY[tpl][1];
    const v = (a, b) => a.map((x, k) => lerp(x, b ? b[k] ?? x : x, w));
    const r4 = (f, b) => { const q = v(f, b); return {x: C.x + q[0] * C.w, y: C.y + q[1] * C.h, w: q[2] * C.w, h: q[3] * C.h, rot: (q[4] || 0) * Math.PI / 180}; };
    const pt = (f, b) => { const q = v(f, b); return {x: C.x + q[0] * C.w, y: C.y + q[1] * C.h, size: q[2] * C.w}; };
    return {
      photo: r4(A.photo, B.photo), title: pt(A.title, B.title), tag: pt(A.tag, B.tag), cta: r4(A.cta, B.cta), module: r4(A.module, B.module),
      cards: A.cards && w < .5 ? A.cards : null, cardsA: (1 - w * 2), seal: A.seal ? pt(A.seal, B.seal) : null, mast: A.mast != null ? lerp(A.mast, B.mast, w) : null, meta: A.meta != null ? lerp(A.meta, B.meta, w) : null,
    };
  }

  // one page, one combination, drawn at strength `a`
  function page(c, C, w, a, t, opts = {}) {
    const S = ST[c.s], ind = inds[c.i], feat = feats[c.f], tpl = S.tpl;
    const b = boxes(tpl, w, C);
    const g = opts.grow ?? 1; // assembly 0→1 (the first build)
    const st = k => E.out(seg(g, k * .1, k * .1 + .45)); // stagger
    ctx.save(); ctx.globalAlpha *= a;
    // background and texture
    ctx.fillStyle = S.bg; ctx.fillRect(C.x, C.y, C.w, C.h);
    ctx.save(); rr(C.x, C.y, C.w, C.h, 0); ctx.clip();
    if (tpl === 'journal' || tpl === 'pop') { ctx.save(); ctx.translate(C.x, C.y + (tpl === 'pop' ? -((t * 6) % 22) : 0)); ctx.fillStyle = pattern(tpl === 'pop' ? 'dots' : 'grain'); ctx.fillRect(0, 0, C.w, C.h + 22); ctx.restore(); }
    if (tpl === 'index') { ctx.strokeStyle = 'rgba(18,18,18,.07)'; ctx.lineWidth = 1; const cols = w > .5 ? 4 : 12; for (let k = 0; k <= cols; k++) { const x = C.x + C.w * .035 + k * (C.w * .93 / cols); ctx.beginPath(); ctx.moveTo(x, C.y); ctx.lineTo(x, C.y + C.h * st(0)); ctx.stroke(); } }
    // photo
    const P = b.photo, pa = st(1);
    if (pa > 0) {
      ctx.save(); ctx.globalAlpha *= pa;
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.rotate(P.rot || 0);
      const x = -P.w / 2, y = -P.h / 2;
      if (tpl === 'journal') { ctx.fillStyle = '#fffdf8'; ctx.shadowColor = 'rgba(59,36,20,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillRect(x - P.w * .04, y - P.w * .04, P.w * 1.08, P.h + P.w * .16); ctx.shadowColor = 'transparent'; }
      if (tpl === 'pop') { ctx.save(); ctx.translate(P.w * .035, P.w * .035); blob(x, y, P.w, P.h, t); ctx.fillStyle = S.accent; ctx.fill(); ctx.restore(); blob(x, y, P.w, P.h, t); ctx.clip(); }
      else if (tpl === 'index') { const g2 = E.io(seg(g, .15, .7)); ctx.beginPath(); ctx.rect(x + P.w * (1 - g2) * .5, y, P.w * g2, P.h); ctx.clip(); }
      else { ctx.beginPath(); ctx.rect(x, y, P.w, P.h); ctx.clip(); }
      const z = 1.06 + Math.sin(t * .4) * .03;
      photo(c.i, c.s, x - P.w * (z - 1) / 2, y - P.h * (z - 1) / 2, P.w * z, P.h * z);
      if (tpl === 'maison') { const gr = ctx.createLinearGradient(0, y, 0, y + P.h); gr.addColorStop(0, 'rgba(10,9,8,.55)'); gr.addColorStop(.5, 'rgba(10,9,8,.62)'); gr.addColorStop(1, 'rgba(10,9,8,.9)'); ctx.fillStyle = gr; ctx.fillRect(x, y, P.w, P.h); }
      ctx.restore();
      if (tpl === 'journal') { ctx.save(); ctx.translate(P.x + P.w / 2, P.y - P.w * .03); ctx.rotate(-.06); ctx.fillStyle = 'rgba(210,105,30,.3)'; ctx.fillRect(-P.w * .12, -P.w * .025, P.w * .24, P.w * .05); ctx.restore(); }
    }
    // masthead / meta rows
    if (b.mast != null) { const y = C.y + C.h * b.mast; ctx.strokeStyle = S.text; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(C.x + C.w * .05, y); ctx.lineTo(C.x + C.w * (.05 + .9 * st(0)), y); ctx.moveTo(C.x + C.w * .05, y + 3); ctx.lineTo(C.x + C.w * (.05 + .9 * st(0)), y + 3); ctx.stroke(); text(ind.brandEn.toUpperCase(), C.x + C.w * .05, y - 6, {size: Math.max(6, C.w * .016), weight: 600, family: S.ui, color: S.muted, alpha: st(0)}); }
    if (b.meta != null) { const y = C.y + C.h * b.meta; ctx.fillStyle = S.text; ctx.fillRect(C.x + C.w * .035, y, C.w * .93 * st(0), 1); text(`(01)  ${ind.brandEn}`, C.x + C.w * .035, y - 6, {size: Math.max(6, C.w * .015), weight: 500, family: S.ui, color: S.text, alpha: st(0)}); }
    // seal (luxury)
    if (b.seal) { const s2 = b.seal; ctx.save(); ctx.globalAlpha *= st(0); ctx.strokeStyle = S.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.size, -Math.PI / 2, -Math.PI / 2 + TAU * st(0)); ctx.stroke(); ctx.restore(); text((ind.brandEn.match(/[A-Z]/) || ['M'])[0], s2.x, s2.y, {size: s2.size * 1.1, weight: 400, family: S.display, color: '#f3dc9f', align: 'center', base: 'middle', alpha: st(1)}); }
    // title
    const T = b.title, ta = st(2);
    const center = tpl === 'maison';
    // the name rises in whole: never cut letter by letter (Thai would leave a vowel or tone mark hanging)
    const shown = ind.brand, reveal = E.out(opts.type ?? 1);
    if (ta > 0 && reveal > 0) {
      ctx.save(); ctx.globalAlpha *= reveal;
      const color = tpl === 'maison' ? goldGrad(T.x - T.size * 3, 0, T.x + T.size * 3, 0, t * .04) : tpl === 'pop' ? S.accent : tpl === 'index' && w < .5 ? '#121212' : S.text;
      if (tpl === 'pop') {
        const pop = E.back(seg(g, .2, .6)), bob = Math.sin(t * 2.4) * T.size * .03;
        ctx.save(); ctx.translate(T.x, T.y + bob); ctx.scale(.6 + .4 * pop, .6 + .4 * pop);
        text(shown, 0, 0, {size: T.size, weight: S.dw, family: S.display, color, alpha: ta, max: C.w * .9});
        ctx.restore();
      } else text(shown, T.x, T.y + (1 - ta) * T.size * .3, {size: T.size, weight: S.dw, family: S.display, color, align: center ? 'center' : 'left', alpha: ta, condensed: S.condensed, max: C.w * .9});
      ctx.restore();
    }
    // tagline
    const G = b.tag;
    text(ind.tagline, G.x, G.y, {size: G.size, weight: tpl === 'pop' ? 700 : tpl === 'maison' ? 300 : 600, family: tpl === 'pop' ? S.font : S.font, color: tpl === 'maison' ? '#e9dcc3' : S.text, align: center ? 'center' : 'left', alpha: st(3), max: C.w * .88});
    // call to action
    const K = b.cta, ka = st(3);
    if (ka > 0) {
      ctx.save(); ctx.globalAlpha *= ka;
      const kx = center ? K.x - K.w / 2 : K.x, ky = K.y - K.h / 2;
      if (tpl === 'index') { ctx.fillStyle = S.text; ctx.fillRect(kx, ky + K.h, K.w, 1); }
      else {
        if (tpl === 'pop') { rr(kx, ky + K.h * .12, K.w, K.h, K.h / 2); ctx.fillStyle = S.text; ctx.fill(); }
        rr(kx, ky, K.w, K.h, tpl === 'maison' || tpl === 'pop' ? K.h / 2 : Math.min(S.radius, K.h / 2));
        if (tpl === 'maison') { ctx.strokeStyle = 'rgba(200,163,90,.7)'; ctx.lineWidth = 1; ctx.stroke(); } else { ctx.fillStyle = S.accent; ctx.fill(); }
      }
      text(feat.cta, kx + (tpl === 'index' ? 0 : K.w / 2), ky + K.h / 2, {size: Math.max(6, K.h * .42), weight: 600, family: S.ui, color: tpl === 'maison' ? '#f3dc9f' : tpl === 'index' ? S.text : S.onAccent, align: tpl === 'index' ? 'left' : 'center', base: 'middle', max: K.w * .9});
      ctx.restore();
    }
    // the feature module
    const M = b.module, ma = st(4);
    if (ma > 0) module(feat.key, S, M, ma, t, c);
    // three pieces
    if (b.cards && b.cardsA > 0) {
      const [cx0, cy0, cw0, ch0, step] = b.cards;
      for (let n = 0; n < 3; n++) {
        const a2 = st(5 + n * .5) * b.cardsA;
        if (a2 <= 0) continue;
        const x = C.x + (cx0 + n * step) * C.w, y = C.y + cy0 * C.h, cw = cw0 * C.w, ch = ch0 * C.h;
        ctx.save(); ctx.globalAlpha *= a2; ctx.translate(x + cw / 2, y + ch / 2 + (1 - a2) * 20);
        if (tpl === 'pop') ctx.rotate((n - 1) * .07); if (tpl === 'journal') ctx.rotate((n - 1) * -.06);
        if (tpl === 'index') {
          ctx.fillStyle = S.line; ctx.fillRect(-cw / 2, ch / 2, cw, 1);
          text(`0${n + 1}`, -cw / 2, 0, {size: ch * .38, weight: 500, family: S.ui, color: S.muted, base: 'middle'});
          item(c.i, c.s, n, -cw / 2 + cw * .12, -ch * .42, ch * .84, ch * .84);
          text(ind.items[n].name, -cw / 2 + cw * .12 + ch, 0, {size: ch * .38, weight: 500, family: S.font, color: S.text, base: 'middle', max: cw * .6});
        } else {
          if (tpl === 'pop') { rr(-cw / 2 + 4, -ch / 2 + 4, cw, ch, 12); ctx.fillStyle = S.accent; ctx.fill(); }
          rr(-cw / 2, -ch / 2, cw, ch, tpl === 'pop' ? 12 : tpl === 'maison' ? 0 : 3);
          ctx.fillStyle = tpl === 'maison' ? '#1a1714' : '#fffdf8'; ctx.fill();
          if (tpl === 'pop') { ctx.strokeStyle = S.text; ctx.lineWidth = 2; ctx.stroke(); }
          const pad = cw * .07;
          ctx.save(); rr(-cw / 2 + pad, -ch / 2 + pad, cw - pad * 2, ch * .62, tpl === 'pop' ? 8 : 0); ctx.clip(); item(c.i, c.s, n, -cw / 2 + pad, -ch / 2 + pad, cw - pad * 2, ch * .62); ctx.restore();
          text(ind.items[n].name, -cw / 2 + pad, ch / 2 - pad * 1.6, {size: Math.max(5, cw * .085), weight: tpl === 'maison' ? 400 : 600, family: tpl === 'maison' ? S.display : S.ui, color: tpl === 'maison' ? '#f1e8d8' : S.text, max: cw - pad * 2});
          if (tpl === 'journal') { ctx.fillStyle = 'rgba(210,105,30,.26)'; ctx.fillRect(-cw * .18, -ch / 2 - 4, cw * .36, 8); }
        }
        ctx.restore();
      }
    }
    // extras that make each template itself
    if (tpl === 'pop') { star(C.x + C.w * (w > .5 ? .82 : .47), C.y + C.h * (w > .5 ? .06 : .14), C.w * .03, t, '#ffd23f', S.text, st(2)); ring(C.x + C.w * .93, C.y + C.h * .86, C.w * .025, '#7ad7c0', st(4)); }
    if (tpl === 'journal' && w < .5) text('แวะมานะ!', C.x + C.w * .33, C.y + C.h * .56, {size: C.w * .03, weight: 400, family: S.hand, color: S.accent, alpha: st(3)});
    if (tpl === 'maison' && !opts.lite) { ctx.fillStyle = `rgba(243,220,159,${.5 * st(1)})`; const rr2 = rng(c.i * 7 + 3); for (let k = 0; k < 26; k++) { const x = C.x + rr2() * C.w, y = C.y + ((rr2() * C.h - t * 8 * (.5 + rr2())) % C.h + C.h) % C.h; ctx.beginPath(); ctx.arc(x, y, .6 + rr2() * 1.3, 0, TAU); ctx.fill(); } }
    ctx.restore(); // clip
    ctx.restore();
  }
  function blob(x, y, w, h, t) {
    ctx.beginPath();
    const cx = x + w / 2, cy = y + h / 2, n = 7;
    for (let k = 0; k <= n * 4; k++) {
      const a = k / (n * 4) * TAU, rr2 = 1 + .06 * Math.sin(a * 3 + t * 1.3) + .04 * Math.cos(a * 2 - t);
      const px = cx + Math.cos(a) * w / 2 * rr2, py = cy + Math.sin(a) * h / 2 * rr2;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function star(x, y, r, t, fill, stroke, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(t * .8);
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? r * .45 : r, an = k / 10 * TAU - Math.PI / 2; k ? ctx.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2) : ctx.moveTo(Math.cos(an) * rr2, Math.sin(an) * rr2); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }
  function ring(x, y, r, color, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = r * .35; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }

  // the feature, alive inside its box
  function module(key, S, M, a, t, c) {
    ctx.save(); ctx.globalAlpha *= a;
    const dark = S.tpl === 'maison';
    rr(M.x, M.y, M.w, M.h, S.tpl === 'pop' ? 16 : S.tpl === 'index' || dark ? 2 : 10);
    ctx.fillStyle = dark ? 'rgba(20,18,15,.9)' : S.surface; ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(200,163,90,.5)' : S.tpl === 'pop' ? S.text : S.tpl === 'index' ? S.text : S.line; ctx.lineWidth = S.tpl === 'pop' ? 2 : 1; ctx.stroke();
    const pad = Math.min(M.w, M.h) * .1, fs = Math.max(5, Math.min(M.h * .13, M.w * .06));
    const ink = dark ? '#f1e8d8' : S.text, muted = dark ? '#a9997f' : S.muted, acc = S.accent;
    text(feats.find(f => f.key === key).label, M.x + pad, M.y + pad + fs, {size: fs, weight: 600, family: S.ui, color: ink, max: M.w - pad * 2});
    const y0 = M.y + pad + fs * 1.9, h0 = M.y + M.h - pad - y0;
    if (key === 'booking') {
      const sel = Math.floor(t * 1.2) % 4;
      for (let k = 0; k < 4; k++) { const bw = (M.w - pad * 2 - 3 * pad * .5) / 4, x = M.x + pad + k * (bw + pad * .5); rr(x, y0, bw, h0 * .36, h0 * .18); ctx.fillStyle = k === 1 ? acc : 'transparent'; ctx.fill(); ctx.strokeStyle = k === 1 ? acc : (dark ? 'rgba(200,163,90,.4)' : S.line); ctx.stroke(); }
      for (let k = 0; k < 4; k++) { const bw = (M.w - pad * 2 - 3 * pad * .5) / 4, x = M.x + pad + k * (bw + pad * .5), y = y0 + h0 * .5; rr(x, y, bw, h0 * .36, h0 * .18); ctx.fillStyle = k === sel ? acc : 'transparent'; ctx.fill(); ctx.strokeStyle = k === sel ? acc : (dark ? 'rgba(200,163,90,.4)' : S.line); ctx.stroke(); text(['10:00', '11:30', '13:00', '15:30'][k], x + bw / 2, y + h0 * .18, {size: Math.min(h0 * .2, bw * .26), weight: 600, family: S.ui, color: k === sel ? (dark ? '#140f06' : S.onAccent) : ink, align: 'center', base: 'middle'}); }
    } else if (key === 'store') {
      const n = Math.floor(t * 1.5) % 4;
      for (let k = 0; k < 3; k++) { const y = y0 + k * h0 / 3.2, rh = h0 / 3.6; item(c.i, c.s, k, M.x + pad, y, rh, rh); ctx.fillStyle = muted; ctx.globalAlpha *= .9; ctx.fillRect(M.x + pad + rh * 1.3, y + rh * .3, M.w * .35, Math.max(1, rh * .14)); ctx.globalAlpha /= .9; rr(M.x + M.w - pad - rh * 1.6, y + rh * .15, rh * 1.6, rh * .7, rh * .35); ctx.fillStyle = k < n ? acc : 'transparent'; ctx.fill(); ctx.strokeStyle = acc; ctx.stroke(); }
      const bx = M.x + M.w - pad - fs * .8, by = M.y + pad + fs * .5; drawIcon('cart', bx - fs, by, fs * 1.4, ink, 2); ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(bx, by - fs * .4, fs * .55 * (1 + .25 * Math.max(0, Math.sin(t * 9.4))), 0, TAU); ctx.fill(); text(String(n), bx, by - fs * .38, {size: fs * .7, weight: 700, family: S.ui, color: dark ? '#140f06' : S.onAccent, align: 'center', base: 'middle'});
    } else if (key === 'minigame') {
      const gx = M.x + pad, gy = y0, gw = M.w - pad * 2, gh = h0;
      rr(gx, gy, gw, gh, 6); ctx.fillStyle = dark ? '#0b0a08' : rgba(acc, .1); ctx.fill();
      for (let k = 0; k < 7; k++) { const r2 = rng(k * 31 + 5), px = gx + gw * (.1 + r2() * .8), py = gy + ((t * gh * (.5 + r2() * .5) + r2() * gh) % gh); ctx.fillStyle = k % 3 ? acc : (dark ? '#f3dc9f' : S.text); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, gh * .05), 0, TAU); ctx.fill(); }
      const bx = gx + gw / 2 + Math.sin(t * 2.2) * gw * .32; rr(bx - gw * .1, gy + gh * .82, gw * .2, gh * .1, gh * .05); ctx.fillStyle = dark ? '#f3dc9f' : S.text; ctx.fill();
      text(String(Math.floor(t * 2) % 9), gx + gw - 4, gy + gh * .2, {size: gh * .16, weight: 700, family: S.ui, color: ink, align: 'right'});
    } else {
      const ar = Math.min(h0 * .7, M.w * .2); ctx.save(); ctx.beginPath(); ctx.arc(M.x + pad + ar / 2, y0 + ar / 2, ar / 2, 0, TAU); ctx.clip(); photo(c.i, c.s, M.x + pad, y0, ar, ar); ctx.restore();
      const on = Math.floor(t * .9) % 3;
      for (let k = 0; k < 3; k++) { const x = M.x + pad + ar + pad + k * (M.w - ar - pad * 3) / 3, w2 = (M.w - ar - pad * 3) / 3.4; ctx.fillStyle = k === on ? acc : muted; ctx.globalAlpha *= k === on ? 1 : .4; ctx.fillRect(x, y0 + ar * .2, w2, Math.max(1.5, h0 * .06)); ctx.globalAlpha /= k === on ? 1 : .4; }
      for (let k = 0; k < 2; k++) { ctx.fillStyle = muted; ctx.globalAlpha *= .35; ctx.fillRect(M.x + pad + ar + pad, y0 + ar * (.5 + k * .25), (M.w - ar - pad * 3) * (k ? .6 : .9), Math.max(1, h0 * .045)); ctx.globalAlpha /= .35; }
    }
    ctx.restore();
  }

  // the device: a browser window or a phone; d = 0 browser, 1 phone
  function device(F, d, a, domain) {
    ctx.save(); ctx.globalAlpha *= a;
    // a soft shadow without shadowBlur (a blur this size every frame costs more than the page itself)
    const sh = ctx.createRadialGradient(F.x + F.w / 2, F.y + F.h * .62, 0, F.x + F.w / 2, F.y + F.h * .62, Math.max(F.w, F.h) * .62);
    sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(F.x - F.w * .2, F.y - F.h * .1, F.w * 1.4, F.h * 1.4);
    rr(F.x, F.y, F.w, F.h, F.r); ctx.fillStyle = '#0e100e'; ctx.fill();
    ctx.strokeStyle = 'rgba(242,215,154,.4)'; ctx.lineWidth = 1; ctx.stroke();
    const bar = F.bar;
    if (d < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - d;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = ['#ff6b5f', '#ffbe2e', '#2bc840'][k]; ctx.beginPath(); ctx.arc(F.x + bar * .55 + k * bar * .42, F.y + bar / 2, bar * .13, 0, TAU); ctx.fill(); }
      rr(F.x + F.w * .3, F.y + bar * .22, F.w * .4, bar * .56, bar * .28); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      text(domain, F.x + F.w / 2, F.y + bar / 2, {size: bar * .36, weight: 500, family: "'Anuphan', sans-serif", color: 'rgba(244,239,230,.75)', align: 'center', base: 'middle', max: F.w * .36});
      ctx.restore();
    }
    ctx.restore();
  }
  function notch(F, d, a) { if (d <= 0) return; ctx.save(); ctx.globalAlpha *= a * d; rr(F.x + F.w * .36, F.y + F.w * .045, F.w * .28, F.w * .06, F.w * .03); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); }
  const contentOf = (F, d) => {
    const inset = lerp(0, F.w * .035, d);
    const top = lerp(F.bar, F.w * .035, d);
    return {x: F.x + inset, y: F.y + top + (d > .5 ? 0 : 0), w: F.w - inset * 2, h: F.h - top - inset, r: lerp(0, F.r * .8, d)};
  };

  /* ---------------- the 64 ---------------- */
  let wallLeaf = null;
  function wall(t, k0) {
    const cols = 8, rows = 8, aspect = portrait ? .7 : 1.6;
    const top = 76, bottom = H - 218, pad = 16;
    const cw = Math.min((W - pad * 2) / cols, (bottom - top) / rows * aspect), ch = cw / aspect;
    const gw = cw * cols, gh = ch * rows, gx = (W - gw) / 2, gy = top + (bottom - top - gh) / 2;
    const appear = seg(t, 15, 15.9), fold = E.in(seg(t, 16.25, 16.95)), sweep = (t - 15.4) / 1.1;
    const zoom = lerp(1.18, 1, E.out(appear));
    const cx = W / 2, cy = gy + gh / 2;
    let n = 0;
    for (let i = 0; i < 4; i++) for (let f = 0; f < 4; f++) for (let s = 0; s < 4; s++) {
      const row = i * 2 + (f >> 1), col = (f & 1) * 4 + s;
      const x0 = gx + col * cw, y0 = gy + row * ch;
      const dist = Math.hypot(col - 3.5, row - 3.5) / 5;
      const a = E.back(clamp(appear * 1.8 - dist * .8));
      if (a <= 0) continue;
      let x = cx + (x0 + cw / 2 - cx) * zoom, y = cy + (y0 + ch / 2 - cy) * zoom;
      x = lerp(x, cx, fold); y = lerp(y, cy, fold);
      const sc = a * (1 - fold * .9);
      const w = (cw - 4) * sc * zoom, h = (ch - 4) * sc * zoom;
      ctx.save(); ctx.globalAlpha *= clamp(a) * (1 - fold * fold);
      const S = ST[s];
      rr(x - w / 2, y - h / 2, w, h, 3); ctx.fillStyle = S.bg; ctx.fill(); ctx.clip();
      if (atlasOk) photo(i, s, x - w / 2, y - h / 2, w, h * .62);
      ctx.fillStyle = S.accent; ctx.fillRect(x - w * .4, y + h * .18, w * .5, Math.max(1.5, h * .08));
      ctx.fillStyle = S.text; ctx.globalAlpha *= .5; ctx.fillRect(x - w * .4, y + h * .32, w * .3, Math.max(1, h * .05));
      ctx.restore();
      // the light sweep, row by row
      const lit = clamp(1 - Math.abs(sweep * 8 - row) / 1.4);
      if (lit > 0 && fold < 1) { ctx.save(); ctx.globalAlpha = lit * .5 * (1 - fold); ctx.fillStyle = '#fff3c4'; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.restore(); }
      if (comboNo({i, f, s}) === k0 && appear > .9 && fold < .2) { ctx.save(); ctx.strokeStyle = '#f2d79a'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4); ctx.restore(); }
      n++;
    }
    // the gold leaf they fold into
    const lg = E.back(seg(t, 16.75, 17.05));
    wallLeaf = {x: cx, y: cy + 12 * cloverAt().s * 1.4};
    if (lg > 0) { const c = {x: cx, y: cy, s: cloverAt().s * 1.4 * lg}; ctx.save(); ctx.shadowColor = 'rgba(255,220,140,.8)'; ctx.shadowBlur = 40; ctx.fillStyle = goldGrad(cx - 40, cy - 40, cx + 40, cy + 40, t * .05); ctx.fill(leafPath(cx, cy + 12 * c.s, c.s, 0)); ctx.restore(); }
  }

  /* ---------------- dust ---------------- */
  const DUST = Array.from({length: 46}, (_, k) => { const r = rng(k * 97 + 11); return {x: r(), y: r(), z: .3 + r() * .7, p: r() * TAU}; });
  function dust(t, a) {
    ctx.save();
    for (const d of quality < 1 ? DUST.slice(0, 20) : DUST) {
      const x = ((d.x + Math.sin(t * .2 + d.p) * .02) % 1) * W, y = (((d.y - t * .012 * d.z) % 1 + 1) % 1) * H;
      ctx.globalAlpha = a * (.25 + .5 * d.z) * (.6 + .4 * Math.sin(t * 2 + d.p));
      ctx.fillStyle = '#f2d79a'; ctx.beginPath(); ctx.arc(x, y, .6 + d.z * 1.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ======================================================================================= one frame */
  function frame(T) {
    const t = ((T % LOOP) + LOOP) % LOOP, L = Math.floor(T / LOOP);
    const P = plan(L), A = P.start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background
    const bg = ctx.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, Math.max(W, H) * .75);
    bg.addColorStop(0, '#142219'); bg.addColorStop(1, '#070908');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const hush = t >= 14.5 && t < 15;
    dust(t + L * LOOP, hush ? .15 : 1);
    const c = cloverAt();
    const desk0 = portrait ? 'phone' : 'desk', desk1 = portrait ? 'desk' : 'phone';
    // ---- 1–2: the clover, the taps
    if (t < 6.5) {
      const draw = E.io(seg(t, .1, 1.1));
      const fill = [0, 1, 2].map(k => E.out(seg(t, 1.5 + k, 1.9 + k)));
      const s3 = seg(t, 4.5, 6.6);
      const hide = [0, 1, 2].map(k => E.in(seg(t, 5.9, 6.5))).concat([0]);
      const glow = env(t, 4.8, 6.0, .3, .4);
      // leaf 4 leaves the clover in act 3, so the clover draws it only before 4.9
      const leaf4 = t < 4.9 ? 0 : 1;
      clover(c, {draw, fill: [...fill, 0], gold: 1, hide: [...hide.slice(0, 3), leaf4], combo: A, t, glow: t < 4.9 ? glow : 0, alpha: 1});
      // taps and chips
      for (let k = 0; k < 3; k++) {
        const tk = 1.5 + k, tipX = c.x + Math.sin(ANG[k]) * 26 * c.s, tipY = c.y - Math.cos(ANG[k]) * 26 * c.s;
        ripple(tipX, tipY, seg(t, tk - .05, tk + .55));
        const chipIn = E.back(seg(t, tk + .1, tk + .45)), fly = E.in(seg(t, 4.5, 4.95));
        if (chipIn > 0 && fly < 1) {
          const out = 1.25, ox = c.x + Math.sin(ANG[k]) * 46 * c.s * out, oy = c.y - Math.cos(ANG[k]) * 40 * c.s * out;
          const g4 = {x: c.x + Math.sin(ANG[3]) * 20 * c.s, y: c.y - Math.cos(ANG[3]) * 20 * c.s};
          const opt = [inds[A.i], feats[A.f], stys[A.s]][k];
          chip(lerp(ox, g4.x, fly), lerp(oy, g4.y, fly), opt.icon, opt.short || opt.label, chipIn * (1 - fly * .8), lerp(1, .2, fly));
        }
      }
      // ---- 3: the gold leaf opens into the website
      if (t >= 4.9) {
        const F = frameFor(desk0), d = desk0 === 'phone' ? 1 : 0;
        const grow = E.expo(seg(t, 4.9, 5.55));
        const g4 = {x: c.x + Math.sin(ANG[3]) * 0, y: c.y};
        const lc = {x: lerp(g4.x, F.x + F.w / 2, grow), y: lerp(g4.y, F.y + F.h * .62, grow)};
        const ls = lerp(c.s, Math.min(F.w, F.h) / 52, grow);
        const ang = lerp(ANG[3], TAU, E.io(seg(t, 4.9, 5.5)));
        const open = E.io(seg(t, 5.5, 6.05));
        // the site behind, revealed through a growing clover iris
        if (open > 0) {
          const iris = E.out(seg(t, 5.5, 6.2));
          ctx.save();
          const fr = lerpRect({x: lc.x - 10, y: lc.y - 10, w: 20, h: 20, r: 10, bar: 2}, F, iris);
          device(fr, d, iris, inds[A.i].domain);
          rr(fr.x, fr.y, fr.w, fr.h, fr.r); ctx.clip();
          page(A, contentOf(fr, d), d, 1, t, {grow: seg(t, 5.65, 6.45), type: seg(t, 5.8, 6.35)});
          ctx.restore();
          notch(fr, d, iris);
        }
        // two halves of the leaf swing open like doors
        ctx.save();
        ctx.shadowColor = 'rgba(255,225,150,.9)'; ctx.shadowBlur = (12 + 18 * env(t, 4.9, 6, .2, .5)) * quality;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(lc.x, lc.y); ctx.rotate(ang);
          ctx.translate(side * open * 40 * ls, 0); ctx.rotate(side * open * .9); ctx.scale(1 - open * .4, 1);
          ctx.beginPath(); ctx.rect(side < 0 ? -40 * ls : 0, -50 * ls, 40 * ls, 60 * ls); ctx.clip();
          ctx.globalAlpha = 1 - E.in(seg(t, 5.7, 6.15));
          ctx.scale(ls, ls);
          ctx.fillStyle = goldGrad(-30, -30, 30, 10, t * .1); ctx.fill(leaf);
          ctx.restore();
        }
        ctx.restore();
        // burst
        const b = seg(t, 5.45, 6.2);
        if (b > 0 && b < 1) { const rr2 = rng(77); ctx.save(); for (let k = 0; k < 40; k++) { const an = rr2() * TAU, sp = (60 + rr2() * 240) * E.out(b); ctx.globalAlpha = (1 - b) * .9; ctx.fillStyle = k % 3 ? '#f2d79a' : '#fff6d6'; ctx.beginPath(); ctx.arc(lc.x + Math.cos(an) * sp, lc.y + Math.sin(an) * sp, 1 + rr2() * 2.2, 0, TAU); ctx.fill(); } ctx.restore(); }
      }
    }
    // ---- 4: one leaf at a time, the whole site changes
    const dev = x => (x.d ? desk1 : desk0);
    const hudAt = F => portrait ? {x: W / 2, y: F.y - c.s * 11, s: c.s * .26} : {x: F.x - c.s * 15, y: F.y + c.s * 12, s: c.s * .3};
    if (t >= 6.5 && t < REEL.from) {
      let f = null;
      for (const q of P.flips) if (q.t <= t) f = q;
      const prev = f ? f.from : {...A, d: 0}, cur = f ? f.to : {...A, d: 0};
      const k = f ? seg(t, f.t, f.t + f.dur) : 1, km = E.io(k);
      const dA = dev(prev) === 'phone' ? 1 : 0, dB = dev(cur) === 'phone' ? 1 : 0;
      const F = lerpRect(frameFor(dev(prev)), frameFor(dev(cur)), km);
      const dd = lerp(dA, dB, km);
      device(F, dd, 1, inds[(k < .5 ? prev : cur).i].domain);
      ctx.save(); rr(F.x, F.y, F.w, F.h, F.r); ctx.clip();
      const C = contentOf(F, dd);
      if (k < 1 && dA !== dB) {
        // a new device: the old page dims away, the frame changes shape, then the new page comes up. One at a time,
        // and each page dims as one picture (a dark veil over it), so its own layers never show through each other
        const out = 1 - E.in(seg(k, 0, .4)), inn = E.out(seg(k, .55, 1)), lit = out > 0 ? out : inn;
        if (out > 0) page(prev, C, dd, 1, t); else if (inn > 0) page(cur, C, dd, 1, t, {grow: .6 + .4 * inn});
        ctx.fillStyle = `rgba(14,16,14,${1 - lit})`; ctx.fillRect(C.x, C.y, C.w, C.h);
      } else if (k < 1) {
        // the new site is drawn over the old one behind a moving edge, never through it: each pixel shows one site
        const edge = C.y + C.h * E.io(k);
        page(prev, C, dd, 1, t);
        ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, edge - C.y); ctx.clip();
        page(cur, C, dd, 1, t, {grow: .7 + .3 * k});
        ctx.restore();
        const glow = ctx.createLinearGradient(0, edge - 14, 0, edge + 2);
        glow.addColorStop(0, 'rgba(242,215,154,0)'); glow.addColorStop(1, 'rgba(255,240,200,.55)');
        ctx.fillStyle = glow; ctx.fillRect(C.x, edge - 14, C.w, 16);
        ctx.fillStyle = '#fff4d6'; ctx.fillRect(C.x, edge - 1, C.w, 1.5);
      } else page(cur, C, dd, 1, t);
      ctx.restore();
      notch(F, dd, 1);
      // the small clover keeps score, beside the site: which leaf flipped
      const hud = hudAt(F);
      const inA = E.out(seg(t, 6.5, 6.9));
      const flash = f ? env(t, f.t, f.t + .5, .05, .45) : 0;
      const which = f ? ({ind: 0, feat: 1, style: 2, device: 3})[f.kind] : -1;
      clover(hud, {draw: 1, fill: [1, 1, 1, 0], gold: 1, alpha: inA, combo: cur, t, glow: which === 3 ? flash : 0, pulse: which === 0 ? flash : 0});
      if (flash > 0 && which >= 0 && which < 3) { ctx.save(); ctx.globalAlpha = flash; ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1.5; ctx.stroke(leafPath(hud.x, hud.y, hud.s * (1 + flash * .25), ANG[which], 3)); ctx.restore(); }
      setCount(t >= 6.8 ? comboNo(cur) : 0);
    } else if (t >= REEL.from && t < 14.5) {
      // ---- the reel: whole sites slide past, faster and faster, into the silence
      const x = reelX(t), speed = (reelX(Math.min(REEL.to, t + .02)) - x) / .02;
      const fade = 1 - E.in(seg(t, 14.25, 14.5));
      ctx.save();
      for (let k = Math.floor(x) - 1; k <= Math.floor(x) + 2; k++) {
        if (k < 0 || k >= REEL.n) continue;
        const R2 = P.reel[k], d2 = dev(R2) === 'phone' ? 1 : 0, F0 = frameFor(dev(R2));
        const off = (k - x) * F0.w * 1.12;
        if (F0.x + off > W || F0.x + off + F0.w < 0) continue;
        const sc = 1 - Math.min(.1, Math.abs(k - x) * .1);
        const F = {...F0, x: F0.x + off + F0.w * (1 - sc) / 2, y: F0.y + F0.h * (1 - sc) / 2, w: F0.w * sc, h: F0.h * sc, r: F0.r * sc, bar: F0.bar * sc};
        device(F, d2, 1, inds[R2.i].domain);
        ctx.save(); rr(F.x, F.y, F.w, F.h, F.r); ctx.clip();
        page(R2, contentOf(F, d2), d2, 1, t, {lite: true});
        ctx.restore();
        notch(F, d2, 1);
      }
      // speed lines once it is fast
      if (speed > 2.5) { const a = clamp((speed - 2.5) / 5) * .5, r3 = rng(3); ctx.strokeStyle = `rgba(242,215,154,${a})`; ctx.lineWidth = 1; for (let q = 0; q < 14; q++) { const y = H * (.15 + r3() * .6), l = 40 + r3() * 160, x0 = ((r3() * W - t * 1400 * (.5 + r3())) % W + W) % W; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + l, y); ctx.stroke(); } }
      // into the dark: the night closes over the sites as one picture (fading each layer would let them show through each other)
      if (fade < 1) { ctx.globalAlpha = 1 - fade; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      const centred = P.reel[clamp(Math.round(x), 0, REEL.n - 1)];
      const F0 = frameFor(dev(centred));
      clover(hudAt(F0), {draw: 1, fill: [1, 1, 1, 0], gold: 1, alpha: fade, combo: centred, t, glow: .3 + .3 * Math.sin(t * 20)});
      setCount(comboNo(centred));
    } else setCount(0);
    // ---- 5: a beat of silence, then the 64
    if (t >= 15 && t < 17) wall(t, comboNo(A));
    // ---- 6: the clover again, empty, waiting for you; then it closes into the point of light
    if (t >= 17) {
      const back = E.io(seg(t, 17, 17.7));
      const close = E.io(seg(t, 19.2, 19.95));
      const draw = 1 - close;
      const pulse = env(t, 17.8, 19.1, .2, .3) * (.5 + .5 * Math.sin((t - 17.8) * 6));
      // leaves 1–3 come back as outlines; the gold leaf flies home from the middle
      clover(c, {draw: draw * clamp(back * 1.3), fill: [0, 0, 0, 0], gold: 0, hide: [0, 0, 0, 1], pulse: Math.max(0, pulse), t, alpha: 1});
      const home = {x: c.x, y: c.y};
      const from = wallLeaf || {x: W / 2, y: H * .5};
      const gx = lerp(from.x, home.x, back), gy = lerp(from.y, home.y, back);
      const s4 = lerp(c.s * 1.4, c.s, back) * (1 - close);
      if (s4 > .01) {
        ctx.save(); ctx.shadowColor = 'rgba(255,220,140,.7)'; ctx.shadowBlur = 24 * (1 - back * .6);
        ctx.fillStyle = goldGrad(gx - 30, gy - 30, gx + 30, gy + 30, t * .05);
        ctx.globalAlpha = clamp(1 - close * 1.2);
        ctx.fill(leafPath(gx, gy, s4, lerp(0, ANG[3] - TAU, back) + (back < 1 ? 0 : 0)));
        ctx.restore();
      }
      if (pulse > 0) { const tipX = c.x + Math.sin(ANG[0]) * 26 * c.s, tipY = c.y - Math.cos(ANG[0]) * 26 * c.s; ripple(tipX, tipY, ((t - 17.8) * .9) % 1); }
      // the point of light it closes into (where the next loop starts)
      const pt = env(t, 19.3, 20, .3, .05);
      if (pt > 0) { ctx.save(); ctx.globalAlpha = pt; const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 18); g.addColorStop(0, '#fff6d6'); g.addColorStop(1, 'rgba(242,215,154,0)'); ctx.fillStyle = g; ctx.fillRect(c.x - 20, c.y - 20, 40, 40); ctx.restore(); }
    }
    if (t < .5) { const pt = 1 - seg(t, .1, .5); ctx.save(); ctx.globalAlpha = pt; const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 18); g.addColorStop(0, '#fff6d6'); g.addColorStop(1, 'rgba(242,215,154,0)'); ctx.fillStyle = g; ctx.fillRect(c.x - 20, c.y - 20, 40, 40); ctx.restore(); }
    // HTML cues: caption and act
    let cap = '';
    CAPS.forEach(([a, b], k) => { if (t >= a && t < b) cap = String(k); });
    if (root.dataset.cap !== cap) root.dataset.cap = cap;
    let act = 0; ACTS.forEach((a, k) => { if (t >= a) act = k + 1; });
    if (root.dataset.act !== String(act)) root.dataset.act = String(act);
    root.dataset.t = t.toFixed(1);
    lastT = T;
  }
  let shownCount = -1;
  function setCount(n) {
    if (!count || n === shownCount) return;
    shownCount = n;
    count.classList.toggle('is-on', n > 0);
    if (n > 0) count.textContent = `ชุดที่ ${n} / 64`;
  }

  /* ======================================================================================= sound */
  const audio = createScore();

  /* ======================================================================================= clock and controls */
  let playing = false, userPaused = false, visible = true, raf = 0, base = 1.2, since = 0, lastT = 1.2;
  const now = () => (audio.on ? audio.time() : base + (playing ? (performance.now() - since) / 1000 : 0));
  // if frames run slow for a second (an older phone), draw at a lower resolution with less glow
  let ema = 16, slowFor = 0, lastNow = 0;
  function loop(nowMs) {
    raf = 0;
    if (!playing) return;
    if (lastNow && nowMs) { const d = Math.min(100, nowMs - lastNow); ema += (d - ema) * .1; slowFor = ema > 26 ? slowFor + d : 0; if (slowFor > 1000 && quality === 1) { quality = .6; size(); } }
    lastNow = nowMs || 0;
    const T = now();
    frame(T);
    if (audio.on) audio.schedule(T, plan);
    raf = requestAnimationFrame(loop);
  }
  function play() {
    if (playing || userPaused || !visible) return;
    playing = true; since = performance.now(); lastNow = 0;
    if (audio.on) audio.resume(base);
    root.classList.add('is-live');
    raf ||= requestAnimationFrame(loop);
  }
  function stop() {
    if (!playing) return;
    base = now(); playing = false;
    audio.suspend();
    cancelAnimationFrame(raf); raf = 0;
  }
  function seek(T) { base = T; since = performance.now(); if (audio.on) audio.resume(base); frame(T); }
  function setPauseUi() {
    if (!pause) return;
    pause.hidden = false;
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.querySelector('span').textContent = userPaused ? 'เล่นต่อ' : 'หยุด';
    pause.querySelector('use').setAttribute('href', userPaused ? '#i-play' : '#i-pause');
  }
  function setSoundUi() {
    if (!sound) return;
    sound.hidden = false;
    sound.setAttribute('aria-pressed', String(audio.on));
    sound.querySelector('span').textContent = audio.on ? 'ปิดเสียง' : 'เปิดเสียง';
    sound.querySelector('use').setAttribute('href', audio.on ? '#i-sound' : '#i-mute');
  }
  pause?.addEventListener('click', () => { userPaused = playing; if (userPaused) stop(); else play(); setPauseUi(); emit(userPaused ? 'film-pause' : 'film-play'); });
  sound?.addEventListener('click', () => {
    const T = now();
    if (audio.on) { base = T; since = performance.now(); audio.off(); }
    else { audio.enable(T); if (!playing) { userPaused = false; play(); setPauseUi(); } }
    setSoundUi(); emit(audio.on ? 'film-sound-on' : 'film-sound-off');
  });
  canvas.addEventListener('click', () => onLeaf?.());
  canvas.style.cursor = 'pointer';
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) play(); else stop(); }, {threshold: .15}).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else play(); });
  addEventListener('resize', () => { size(); if (!playing) frame(base); });
  size();
  setPauseUi(); setSoundUi();
  // shape each style's text once while the page is idle, so its first frame in the film does not pay for it
  fontsReady.then(() => {
    if (!playing) frame(base);
    (window.requestIdleCallback || setTimeout)(() => {
      const x = document.createElement('canvas').getContext('2d');
      ST.forEach(s => { for (const [w, f, c] of [[s.dw, s.display, s.condensed], [s.tw, s.font, false], [600, s.ui, false]]) { x.font = `${w} 48px ${f}`; if ('fontStretch' in x) x.fontStretch = c ? 'ultra-condensed' : 'normal'; inds.forEach(i => { x.measureText(i.brand); x.fillText(i.brand, 0, 40); x.measureText(i.tagline); }); } });
    }, {timeout: 2000});
  });
  if (autoplay) play(); else { frame(base); root.classList.add('is-live'); }
  const api = {seek, play: () => { userPaused = false; play(); setPauseUi(); }, pause: () => { userPaused = true; stop(); setPauseUi(); }, get time() { return lastT; }, get playing() { return playing; }, get soundOn() { return audio.on; }, plan: L => plan(L)};
  root.film = api;
  return api;

  /* ======================================================================================= the score */
  // 120 BPM, D major. Cues follow the script; all synthesised, no files. Off until the visitor turns it on.
  function createScore() {
    let ac = null, master = null, verb = null, a0 = 0, on = false;
    const cueCache = new Map();
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    function init() {
      if (ac) return;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 8; comp.attack.value = .003; comp.release.value = .2;
      master.connect(comp); comp.connect(ac.destination);
      // a small plate reverb (generated impulse)
      verb = ac.createConvolver(); const len = ac.sampleRate * 1.8, ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch), r = rng(31 + ch); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3); }
      verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = .32; verb.connect(vg); vg.connect(master);
    }
    const out = (g, wet = .3) => { g.connect(master); if (wet > 0) { const s = ac.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); } };
    function tone(when, freq, dur, {type = 'sine', gain = .2, attack = .005, wet = .3, glide = 0} = {}) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, when); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), when + dur);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + attack); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
      o.connect(g); out(g, wet); o.start(when); o.stop(when + dur + .05);
    }
    let noiseBuf = null;
    function noise(when, dur, {gain = .2, f0 = 800, f1 = 800, q = 1, type = 'bandpass', attack = .01, wet = .2} = {}) {
      if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0), r = rng(5); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, when); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + dur);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + attack); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
      s.connect(f); f.connect(g); out(g, wet); s.start(when, Math.random()); s.stop(when + dur + .05);
    }
    const chime = (w, m, g = .16) => { tone(w, hz(m), 1.6, {gain: g, wet: .5}); tone(w, hz(m) * 2.76, .5, {gain: g * .25, wet: .5}); tone(w, hz(m + 24), .25, {gain: g * .15}); };
    const kick = (w, g = .5) => tone(w, 120, .32, {gain: g, glide: .35, wet: 0, attack: .002});
    const hat = (w, g = .05) => noise(w, .05, {gain: g, f0: 9000, f1: 9000, type: 'highpass', wet: 0, attack: .001});
    const clap = (w, g = .12) => noise(w, .14, {gain: g, f0: 1600, f1: 1200, q: .8, wet: .25, attack: .002});
    const pad = (w, notes, dur, g = .05) => notes.forEach(m => { tone(w, hz(m), dur, {type: 'triangle', gain: g, attack: .25, wet: .6}); tone(w, hz(m) * 1.004, dur, {type: 'sawtooth', gain: g * .18, attack: .3, wet: .6}); });
    const bass = (w, m, d = .45) => tone(w, hz(m), d, {type: 'triangle', gain: .22, wet: 0, attack: .01});
    const whoosh = (w, d = .7, up = true) => noise(w, d, {gain: .22, f0: up ? 300 : 4000, f1: up ? 5000 : 300, q: 1.2, attack: d * .6, wet: .4});
    const boom = w => { tone(w, 70, 1.4, {gain: .55, glide: .5, wet: .2, attack: .003}); noise(w, .5, {gain: .25, f0: 2000, f1: 200, type: 'lowpass', wet: .4, attack: .002}); };
    const SIG = {warm: (w, m) => { tone(w, hz(m), .35, {gain: .18, wet: .3}); tone(w, hz(m) * 4, .08, {gain: .05}); }, luxury: (w, m) => tone(w, hz(m - 24), .9, {type: 'triangle', gain: .2, wet: .5}), playful: (w, m) => tone(w, hz(m), .18, {gain: .16, glide: 2.2, wet: .3}), minimal: w => noise(w, .03, {gain: .2, f0: 5000, f1: 5000, q: 6, wet: .1, attack: .001})};
    const FLIPSND = {ind: w => { tone(w, 820, .09, {gain: .14, wet: .1}); noise(w, .03, {gain: .12, f0: 3000, f1: 3000, q: 3, wet: 0, attack: .001}); }, feat: w => { tone(w, 1320, .5, {gain: .1, wet: .5}); tone(w, 2640, .3, {gain: .04, wet: .5}); }, style: w => noise(w, .25, {gain: .16, f0: 600, f1: 6000, q: 1.5, attack: .05, wet: .3}), device: w => whoosh(w, .35, true)};
    const CH = [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]]; // D · Bm · G · A
    // every cue of loop L, at loop times
    function cues(L) {
      const P = plan(L), out = [];
      const at = (t, fn) => out.push({t, fn});
      at(0, w => pad(w, [38, 50], 1.6, .06)); at(.95, w => tone(w, hz(69), .5, {gain: .1, wet: .5}));
      [62, 66, 69].forEach((m, k) => at(1.5 + k, w => { noise(w, .02, {gain: .1, f0: 4000, f1: 4000, q: 2, wet: 0, attack: .001}); chime(w, m + 12); }));
      at(4.5, w => whoosh(w, .55)); at(4.9, w => noise(w, 1.1, {gain: .14, f0: 400, f1: 8000, q: .7, attack: 1, wet: .5}));
      at(6, w => { boom(w); pad(w, CH[0], 2, .05); chime(w, 74, .12); });
      for (let b = 0; b < 16; b++) { const t = 6.5 + b * .5; if (t >= 14.5) break; at(t - .5 + .5, w => kick(w, .4)); if (b % 2 === 1) at(t, w => clap(w)); }
      for (let e = 0; e < 32; e++) { const t = 6.25 + e * .25; if (t >= 14.5) break; at(t, w => hat(w)); }
      for (let bar = 0; bar < 4; bar++) { const t = 6 + bar * 2; if (bar) at(t, w => pad(w, CH[bar], 2, .045)); [0, .5, 1, 1.5].forEach(o => at(t + o, w => bass(w, CH[bar][0] - 12))); }
      P.flips.forEach((f, k) => { at(f.t, w => { FLIPSND[f.kind](w); if (f.kind === 'style') SIG[stys[f.to.s].key](w, 69 + (k % 3) * 2); }); });
      reelTimes.forEach((tt, k) => { if (k) at(tt, w => tone(w, hz(74 + k * 2), .08, {gain: .07, wet: .15})); });
      at(12.5, w => noise(w, 2, {gain: .12, f0: 300, f1: 9000, q: .8, attack: 1.9, wet: .3}));
      at(15, w => { boom(w); pad(w, [50, 57, 62, 64, 69], 2.2, .06); });
      for (let k = 0; k < 12; k++) at(15.3 + k * .09, w => tone(w, hz([74, 78, 81, 86][k % 4] + (k > 7 ? 12 : 0)), .3, {gain: .05, wet: .6}));
      at(16.3, w => whoosh(w, .7, false));
      at(17, w => { pad(w, [43, 55, 59, 62], 1.2, .045); chime(w, 74, .1); });
      at(18.2, w => pad(w, [50, 57, 62, 66], 1.8, .04));
      [17.8, 18.85].forEach(t => at(t, w => chime(w, 62, .07)));
      return out;
    }
    let horizon = -1;
    return {
      get on() { return on; },
      time: () => ac ? ac.currentTime - a0 : 0,
      enable(T) { init(); if (!ac) return; ac.resume(); a0 = ac.currentTime - T; horizon = T; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(.85, ac.currentTime, .08); on = true; },
      off() { if (!ac) return; master.gain.setTargetAtTime(0, ac.currentTime, .05); on = false; },
      resume(T) { if (!ac || !on) return; ac.resume(); a0 = ac.currentTime - T; horizon = T; },
      suspend() { if (ac && on) ac.suspend(); },
      // schedule what falls in the next 250 ms of film time
      schedule(T) {
        if (!ac || !on) return;
        const until = T + .25;
        if (horizon < T - .5) horizon = T;
        for (let L = Math.floor(horizon / LOOP); L <= Math.floor(until / LOOP); L++) {
          if (!cueCache.has(L)) { cueCache.set(L, cues(L)); if (cueCache.size > 3) cueCache.delete(cueCache.keys().next().value); }
          for (const c of cueCache.get(L)) { const abs = L * LOOP + c.t; if (abs >= horizon && abs < until) c.fn(Math.max(ac.currentTime, a0 + abs)); }
        }
        horizon = until;
      },
    };
  }
}
