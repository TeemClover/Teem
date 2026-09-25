/**
 * Procedural surface textures for the house tour. Everything is drawn on canvases at load,
 * so there is nothing to download; HD simply draws at a higher resolution with more detail.
 */
import * as THREE from './vendor/three.module.min.js';

export const FONT = "'Anuphan', 'Noto Sans Thai', sans-serif";

// deterministic noise so SD and HD look like the same house
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; }

export function makeTextures(renderer, hd) {
  const S = hd ? 1024 : 512;
  const aniso = Math.min(hd ? 8 : 4, renderer.capabilities.getMaxAnisotropy());
  const made = [];

  function canvasTex(w, h, draw, {repeat, srgb = true} = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
    t.userData.redraw = fn => { fn(ctx, w, h); t.needsUpdate = true; };
    made.push(t); return t;
  }
  function grain(ctx, w, h, amount, seed = 7) { // fine per-pixel noise for plaster/fabric
    const r = rng(seed), img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }

  const tex = {};

  // Oak planks: per-plank tone, flowing grain lines, soft seams
  tex.wood = canvasTex(S, S, (c, w, h) => {
    const r = rng(11), rows = 8, ph = h / rows;
    for (let y = 0; y < rows; y++) {
      const offset = (y % 2) * w * 0.37 + r() * w * 0.2;
      for (let x = -w; x < w * 2; x += w * 0.62) {
        const px = x + offset, tone = 0.86 + r() * 0.16;
        c.fillStyle = `rgb(${196 * tone | 0},${150 * tone | 0},${104 * tone | 0})`; c.fillRect(px, y * ph, w * 0.62, ph);
        c.save(); c.beginPath(); c.rect(px, y * ph, w * 0.62, ph); c.clip();
        const lines = hd ? 22 : 12;
        for (let k = 0; k < lines; k++) {
          c.strokeStyle = `rgba(${90 + r() * 30 | 0},${55 + r() * 20 | 0},25,${0.06 + r() * 0.1})`; c.lineWidth = 0.6 + r() * (hd ? 1.6 : 1.2);
          const yy = y * ph + r() * ph, amp = 1 + r() * 3, f = 0.004 + r() * 0.01;
          c.beginPath(); for (let xx = px; xx <= px + w * 0.62; xx += 6) c.lineTo(xx, yy + Math.sin(xx * f + k) * amp); c.stroke();
        }
        if (r() < 0.3) { c.fillStyle = 'rgba(90,55,25,.18)'; c.beginPath(); c.ellipse(px + r() * w * 0.6, y * ph + ph / 2, 6 + r() * 6, 3, 0, 0, 7); c.fill(); }
        c.restore();
        c.fillStyle = 'rgba(70,40,15,.35)'; c.fillRect(px, y * ph, 2, ph);
      }
      c.fillStyle = 'rgba(70,40,15,.45)'; c.fillRect(0, y * ph, w, hd ? 3 : 2);
    }
    grain(c, w, h, 10, 12);
  }, {repeat: [2.6, 2.2]});

  // furniture: continuous grain, no plank seams (tinted by each material's colour)
  tex.grain = canvasTex(S / 2, S / 2, (c, w, h) => {
    const r = rng(17); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < (hd ? 70 : 40); k++) {
      c.strokeStyle = `rgba(80,45,15,${0.05 + r() * 0.09})`; c.lineWidth = 0.6 + r() * 1.4;
      const y0 = r() * h, amp = 2 + r() * 5, f = 0.01 + r() * 0.02;
      c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, y0 + Math.sin(x * f + k) * amp + Math.sin(x * f * 3.1) * amp * 0.3); c.stroke();
    }
    grain(c, w, h, 12, 18);
  }, {repeat: [1, 1]});

  tex.tile = canvasTex(S, S, (c, w, h) => { // kitchen floor: warm terrazzo-ish tiles
    const n = 6, s = w / n, r = rng(21);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      c.fillStyle = (i + j) % 2 ? '#e9e1d1' : '#f6f1e6'; c.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < (hd ? 40 : 16); k++) { c.fillStyle = ['#c9b79a', '#9fb7a6', '#d8a58a'][k % 3]; c.globalAlpha = 0.35; c.beginPath(); c.arc(i * s + r() * s, j * s + r() * s, 1 + r() * 2.5, 0, 7); c.fill(); }
      c.globalAlpha = 1;
    }
    c.strokeStyle = 'rgba(120,100,80,.35)'; c.lineWidth = hd ? 3 : 2;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
  }, {repeat: [2.2, 1.9]});

  tex.plaster = canvasTex(S / 2, S / 2, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); grain(c, w, h, 14, 5); }, {repeat: [3, 1.5]});

  tex.stripes = canvasTex(S / 2, S / 2, (c, w, h) => { // living-room wallpaper
    c.fillStyle = '#e4ecd9'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += w / 8) { c.fillStyle = 'rgba(79,125,99,.12)'; c.fillRect(x, 0, w / 32, h); }
    grain(c, w, h, 8, 3);
  }, {repeat: [4, 1]});

  tex.subway = canvasTex(S / 2, S / 4, (c, w, h) => {
    c.fillStyle = '#c9d6cf'; c.fillRect(0, 0, w, h);
    const tw = w / 6, th = h / 6;
    for (let y = 0; y < 6; y++) for (let x = -1; x < 7; x++) {
      const px = x * tw + (y % 2) * tw / 2;
      const g = c.createLinearGradient(px, y * th, px, y * th + th); g.addColorStop(0, '#f7fbf8'); g.addColorStop(1, '#e3ece7');
      c.fillStyle = g; c.fillRect(px + 1.5, y * th + 1.5, tw - 3, th - 3);
    }
  }, {repeat: [3, 1]});

  tex.fabric = canvasTex(S / 2, S / 2, (c, w, h) => { // woven texture, tinted by material colour
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${y % 4 ? 0.05 : 0.09})`; c.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(0,0,0,${x % 4 ? 0.03 : 0.06})`; c.fillRect(x, 0, 1, h); }
    grain(c, w, h, 16, 9);
  }, {repeat: [3, 3]});

  tex.rug = canvasTex(S, S, (c, w, h) => { // round rug with a woven clover-diamond motif
    c.fillStyle = '#e7c69a'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const rings = ['#b8573c', '#f3e3c4', '#2f6b4b', '#f3e3c4', '#d98a5f', '#f3e3c4'];
    rings.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, w * (0.5 - i * 0.055), 0, 7); c.fill(); });
    c.fillStyle = '#2f6b4b';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.save(); c.translate(cx + Math.cos(a) * w * 0.4, cy + Math.sin(a) * w * 0.4); c.rotate(a + Math.PI / 4); c.fillRect(-w * 0.018, -w * 0.018, w * 0.036, w * 0.036); c.restore(); }
    for (let i = 0; i < 4; i++) { c.save(); c.translate(cx, cy); c.rotate(i * Math.PI / 2); c.fillStyle = '#b8573c'; c.beginPath(); c.ellipse(0, -w * 0.08, w * 0.05, w * 0.07, 0, 0, 7); c.fill(); c.restore(); }
    grain(c, w, h, 18, 4);
  });

  tex.marble = canvasTex(S / 2, S / 2, (c, w, h) => {
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); const r = rng(33);
    for (let k = 0; k < (hd ? 14 : 8); k++) {
      c.strokeStyle = `rgba(150,140,125,${0.15 + r() * 0.2})`; c.lineWidth = 0.5 + r() * 1.5;
      c.beginPath(); let x = r() * w, y = 0; c.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 30; y += 10 + r() * 20; c.lineTo(x, y); } c.stroke();
    }
  }, {repeat: [1, 1]});

  tex.grass = canvasTex(S, S, (c, w, h) => {
    c.fillStyle = '#8ec27f'; c.fillRect(0, 0, w, h); const r = rng(44);
    for (let k = 0; k < (hd ? 9000 : 3500); k++) {
      const g = 120 + r() * 70 | 0; c.strokeStyle = `rgba(${g * 0.55 | 0},${g},${g * 0.45 | 0},.55)`; c.lineWidth = 1;
      const x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); c.stroke();
    }
  }, {repeat: [60, 60]});

  tex.cork = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#c99c6b'; c.fillRect(0, 0, w, h); grain(c, w, h, 50, 8); });

  tex.dispose = () => made.forEach(t => t.dispose());
  tex.canvasTex = canvasTex;
  return tex;
}

/** Image textures load lazily; the mesh shows a tint until the picture arrives. */
const loader = new THREE.TextureLoader();
const imageCache = new Map();
export function imageTex(url, material, renderer) {
  const apply = t => { material.map = t; material.color.set('#ffffff'); if (material.emissiveMap !== undefined && material.userData.glow) material.emissiveMap = t; material.needsUpdate = true; };
  if (imageCache.has(url)) { const t = imageCache.get(url); if (t.image) apply(t); else t.userData.waiting.push(apply); return; }
  const t = loader.load(url, tt => { tt.userData.waiting.forEach(fn => fn(tt)); tt.userData.waiting = []; });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.userData.waiting = [apply]; imageCache.set(url, t);
}
