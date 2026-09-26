/**
 * Canvas-painted textures for the prototype bottle.
 * v1.2: the front label and seal strip use the owner's illustrated label boards
 * (pack v1.2 assets/labels/*, flat crops). Back label, paper and sauce are painted here.
 * When print-ready A02 files arrive, swap the files in assets/img/label/ — UVs stay the same.
 */

const FONT_THAI_SERIF = '"Noto Serif Thai", "Noto Sans Thai", serif';
const FONT_THAI_SANS = '"Noto Sans Thai", system-ui, sans-serif';
const FONT_LATIN = '"Cormorant Garamond", Georgia, serif';

export const LABEL_SPEC = {
  // Front label keeps the board's aspect (≈0.63): 3.35R tall → ≈2.12R of arc ≈ 120°.
  frontArc: (120 * Math.PI) / 180,
  backArc: (96 * Math.PI) / 180,
  bottom: 0.6,
  top: 3.95,
  frontPx: [2048, 1536],
  backPx: [768, 1536],
};

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('image failed: ' + src));
  img.src = src;
});

export async function loadArt(base) {
  const [lockup, mark] = await Promise.all([
    loadImage(base + 'assets/brand/homechew-lockup.svg'),
    loadImage(base + 'assets/brand/homechew-mark.svg'),
  ]);
  const label = {}, seal = {};
  await Promise.all(['hy', 'mc', 'ck'].map(async k => {
    [label[k], seal[k]] = await Promise.all([
      loadImage(base + `assets/img/label/label-${k}-v12.webp`).catch(() => null),
      loadImage(base + `assets/img/label/seal-${k}-v12.webp`).catch(() => null),
    ]);
  }));
  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load(`700 120px ${FONT_THAI_SERIF}`, 'น้ำจิ้มไก่หาดใหญ่ซีฟู้ดมหาชัยซอสแจ่วเชียงคาน'),
      document.fonts.load(`600 60px ${FONT_LATIN}`, 'HAT YAI CHICKEN SAUCE'),
      document.fonts.load(`500 40px ${FONT_THAI_SANS}`, 'รอยืนยันข้อมูลฉลากหลัง'),
    ]);
  }
  return {lockup, mark, label, seal};
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Deterministic PRNG so textures are identical every load (no flicker between visits).
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function paper(ctx, w, h, base = '#f1e8d6', seed = 3) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  // soft mottling
  for (let i = 0; i < 90; i++) {
    const x = r() * w, y = r() * h, rad = 40 + r() * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.018 + r() * 0.02;
    // fade to the same colour at zero alpha — fading to transparent black paints grey halos
    const rgb = r() > 0.5 ? '120,90,50' : '255,252,240';
    g.addColorStop(0, `rgba(${rgb},${rgb[0] === '1' ? a : a * 1.4})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // fibres
  ctx.lineWidth = 1;
  for (let i = 0; i < w * h / 900; i++) {
    const x = r() * w, y = r() * h, len = 4 + r() * 14, ang = r() * Math.PI;
    ctx.strokeStyle = `rgba(${r() > 0.5 ? '110,80,45' : '255,255,245'},${0.05 + r() * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
}

function spacedText(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + spacing; });
}

/** Front label: the owner's illustrated label board, flat. Falls back to a typeset label. */
export function frontLabel(art, product) {
  const img = art.label[product.art];
  const W = 1024, H = Math.round(W * 3.35 / (LABEL_SPEC.frontArc * 1.008));
  const [c, ctx] = canvas(W, H);
  paper(ctx, W, H, '#f2e9d7', product.seed);
  if (img) {
    ctx.drawImage(img, 0, 0, W, H);
    // a hint of print texture so the flat board reads as paper on glass
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = 'multiply';
    const [p] = canvas(W, H);
    paper(p.getContext('2d'), W, H, '#f6efe2', product.seed + 3);
    ctx.drawImage(p, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }
  const cx = W / 2;
  const lw = W * 0.5, lh = lw * 498 / 657;
  ctx.drawImage(art.lockup, cx - lw / 2, 80, lw, lh);
  ctx.fillStyle = '#231d18';
  ctx.textAlign = 'center';
  ctx.font = `700 84px ${FONT_THAI_SERIF}`;
  ctx.fillText(product.name_th, cx, H * 0.78);
  ctx.font = `600 40px ${FONT_LATIN}`;
  spacedText(ctx, product.name_en, cx, H * 0.78 + 70, 5);
  return c;
}

/** Back label: states that the facts are pending — every value comes from data (null → รอยืนยัน). */
export function backLabel(art, product) {
  const [W, H] = LABEL_SPEC.backPx;
  const [c, ctx] = canvas(W, H);
  paper(ctx, W, H, '#f0e7d4', product.seed + 11);
  const pad = 70;
  ctx.drawImage(art.mark, W / 2 - 70, 90, 140, 140 * 246 / 288);
  ctx.fillStyle = '#231d18';
  ctx.textAlign = 'center';
  ctx.font = `700 50px ${FONT_THAI_SERIF}`;
  ctx.fillText(product.name_th, W / 2, 330);
  ctx.font = `600 34px ${FONT_THAI_SANS}`;
  ctx.fillStyle = product.accent;
  ctx.fillText('ข้อมูลฉลากหลัง · รอยืนยัน', W / 2, 400);
  const rows = [
    ['ปริมาณสุทธิ', product.net_quantity],
    ['ส่วนประกอบ', product.ingredients],
    ['สารก่อภูมิแพ้', product.allergens],
    ['การเก็บรักษา', product.storage],
    ['ควรบริโภคก่อน', product.shelf_life_unopened],
    ['หลังเปิดขวด', product.shelf_life_opened],
  ];
  ctx.textAlign = 'left';
  let y = 500;
  for (const [k, v] of rows) {
    ctx.fillStyle = '#231d18';
    ctx.font = `600 36px ${FONT_THAI_SANS}`;
    ctx.fillText(k, pad, y);
    ctx.fillStyle = 'rgba(58,47,38,.7)';
    ctx.font = `500 32px ${FONT_THAI_SANS}`;
    ctx.fillText(v == null ? 'รอยืนยัน' : String(v), pad, y + 46);
    ctx.fillStyle = 'rgba(35,29,24,.18)';
    ctx.fillRect(pad, y + 72, W - pad * 2, 2);
    y += 128;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3a2f26';
  ctx.font = `italic 500 38px ${FONT_LATIN}`;
  ctx.fillText('Good Sauce Brings', W / 2, H - 150);
  ctx.fillText('Good People Home', W / 2, H - 104);
  return c;
}

/**
 * Seal strip: v runs along the strip path (0 = front free end, 1 = back glued end).
 * Canvas top = v 1. The front segment occupies the bottom `frontFrac` of the canvas.
 */
export function sealStrip(art, frontFrac, topFrac, key) {
  const W = 256, H = 2048;
  const [c, ctx] = canvas(W, H);
  paper(ctx, W, H, '#f4ecdc', 5);
  ctx.fillStyle = 'rgba(110,80,45,.14)';
  ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
  const img = art.seal?.[key];
  const yTop = H * (1 - frontFrac);
  if (img) {
    // the board's strip artwork covers the front segment (neck + cap front), upright
    ctx.drawImage(img, 0, yTop - 40, W, H - yTop + 40);
  } else {
    const words = ['Good', 'Sauce', 'Brings', 'Good', 'People', 'Home'];
    const step = (H - 90 - yTop - 60) / (words.length + 0.6);
    ctx.fillStyle = '#2c231a';
    ctx.textAlign = 'center';
    ctx.font = `600 50px ${FONT_LATIN}`;
    words.forEach((w, i) => ctx.fillText(w, W / 2, yTop + 60 + step * (i + 1)));
  }
  const topMid = H * (1 - frontFrac - topFrac / 2);
  ctx.save();
  ctx.translate(W / 2, topMid);
  ctx.rotate(Math.PI);
  ctx.drawImage(art.mark, -60, -52, 120, 120 * 246 / 288);
  ctx.restore();
  return c;
}

/** Sauce body: colour variation + suspended chilli/garlic flecks (visual direction only). */
export function sauceTexture(product) {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  const r = rng(product.seed * 7 + 1);
  ctx.fillStyle = product.sauce.base;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 200;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, product.sauce.deep + '55');
    g.addColorStop(1, product.sauce.deep + '00');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const flecks = product.sauce.flecks;
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H;
    const s = 1.5 + r() ** 3 * 8;
    ctx.fillStyle = flecks[Math.floor(r() * flecks.length)];
    ctx.globalAlpha = 0.55 + r() * 0.45;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Travertine-like slab: warm limestone, soft veining and small pores. */
export function stoneTexture() {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  const r = rng(41);
  ctx.fillStyle = '#ebe2d4';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 180;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const rgb = r() > 0.5 ? '214,196,168' : '250,246,238';
    g.addColorStop(0, `rgba(${rgb},.3)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    let x = r() * W, y = r() * H;
    ctx.strokeStyle = `rgba(190,168,136,${0.12 + r() * 0.12})`;
    ctx.lineWidth = 1 + r() * 3;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += 40 + r() * 90; y += (r() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    const x = r() * W, y = r() * H, s = 0.6 + r() ** 4 * 5;
    ctx.fillStyle = `rgba(150,124,94,${0.18 + r() * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s, 0, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Colours of the CSS backdrop, for the glass refraction pass only. */
export function backdropTexture() {
  const [c, ctx] = canvas(8, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#f8f2e7');
  g.addColorStop(0.45, '#f3eadb');
  g.addColorStop(0.62, '#ece0cc');
  g.addColorStop(1, '#d9c8ae');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  return c;
}

/** Stoneware speckle for the dipping bowl. */
export function bowlTexture() {
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  const r = rng(77);
  ctx.fillStyle = '#d8cdbd';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(${r() > 0.3 ? '80,62,48' : '255,250,240'},${0.2 + r() * 0.5})`;
    ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.5 + r() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Soft contact shadow, painted white-on-black because three.js alphaMap reads luminance. */
export function shadowBlob() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgb(235,235,235)');
  g.addColorStop(0.3, 'rgb(130,130,130)');
  g.addColorStop(0.65, 'rgb(34,34,34)');
  g.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}

/** Concentric ripple ring for the pool surface (alpha map, white = visible). */
export function rippleTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgb(0,0,0)');
  g.addColorStop(0.6, 'rgb(255,255,255)');
  g.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return c;
}
