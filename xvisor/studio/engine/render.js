// One renderer for everything that shows the clip: the live preview, the exported file and the offline demo render.
// drawFrame(ctx, plan, images, t) draws second `t` of the plan into a canvas of any 9:16 size.
import { FRAME, SAFE, coverCrop, fitText, easeOut, easeInOut, clamp } from './layout.js';
import { zoneBox } from './story.js';
import { FONT } from './fonts.js';

const INK = '#17384f';
const NAVY = '#102b3d';
const CREAM = '#fffaf0';
const GREEN = '#3fae74';
const GOLD = '#f1be47';
const FADE = 0.32;
const TEXT_CX = (SAFE.left + SAFE.right) / 2;
const TEXT_W = SAFE.right - SAFE.left;

const STYLE_TYPE = {
  story: { head: FONT.display, headW: 800, body: FONT.body, bodyW: 600, plate: CREAM, ink: INK, accent: GREEN },
  question: { head: FONT.display, headW: 800, body: FONT.body, bodyW: 600, plate: NAVY, ink: '#ffffff', accent: GOLD },
  steps: { head: FONT.display, headW: 800, body: FONT.body, bodyW: 600, plate: '#ffffff', ink: INK, accent: GREEN }
};

function shotAt(plan, t) {
  const shots = plan.shots;
  for (let i = shots.length - 1; i >= 0; i--) if (t >= shots[i].start) return i;
  return 0;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}

// iPhone Safari can misplace textAlign:'center'; measure and draw left-aligned instead (same lesson as assets/sauce-reel.js).
function line(ctx, text, cx, cy, font, weight, size, color, align = 'center') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width;
  const x = align === 'center' ? cx - w / 2 : align === 'right' ? cx - w : cx;
  ctx.fillStyle = color;
  ctx.fillText(text, x, cy);
  return w;
}

function measurer(ctx, font, weight) {
  return (s, size) => { ctx.font = `${weight} ${size}px ${font}`; return ctx.measureText(s).width; };
}

function drawPhoto(ctx, plan, images, shot, t) {
  const photo = plan.photos[shot.photo];
  const img = images[shot.photo];
  const p = clamp((t - shot.start) / Math.max(0.01, shot.dur), 0, 1);
  const z = shot.motion.z0 + (shot.motion.z1 - shot.motion.z0) * easeInOut(p);
  if (!img) { ctx.fillStyle = '#d9e2e6'; ctx.fillRect(0, 0, FRAME.w, FRAME.h); return null; }
  const c = coverCrop(photo.width, photo.height, shot.focus, z, shot.target.x, shot.target.y);
  ctx.drawImage(img, c.x, c.y, c.w, c.h);
  return c;
}

function scrim(ctx, zone, strength) {
  if (zone === 'center') {
    ctx.fillStyle = `rgba(10,30,44,${0.52 * strength})`;
    ctx.fillRect(0, 0, FRAME.w, FRAME.h);
    return;
  }
  const top = zone === 'top';
  const g = ctx.createLinearGradient(0, top ? 0 : FRAME.h, 0, top ? FRAME.h * 0.55 : FRAME.h * 0.45);
  g.addColorStop(0, `rgba(10,30,44,${0.55 * strength})`);
  g.addColorStop(1, 'rgba(10,30,44,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FRAME.w, FRAME.h);
}

// A block of wrapped text on a rounded plate. Returns the plate box.
function plateText(ctx, text, { zone, font, weight, maxSize, minSize, maxLines, plate, ink, alpha, rise, padX = 44, padY = 34, anchorY = null, width = TEXT_W }) {
  const fit = fitText(text, measurer(ctx, font, weight), { maxSize, minSize, maxW: width - padX * 2, maxLines, maxH: 600 });
  const lh = fit.size * fit.lineHeight;
  const widths = fit.lines.map(l => measurer(ctx, font, weight)(l, fit.size));
  const w = Math.min(width, Math.max(...widths, 0) + padX * 2);
  const h = fit.lines.length * lh + padY * 2;
  const box = zoneBox(zone);
  let y = anchorY ?? (zone === 'top' ? box.y0 : zone === 'bottom' ? box.y1 - h : (box.y0 + box.y1) / 2 - h / 2);
  y += rise;
  const x = TEXT_CX - w / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (plate) {
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = plate;
    rr(ctx, x, y, w, h, 34);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }
  fit.lines.forEach((l, i) => line(ctx, l, TEXT_CX, y + padY + lh * i + lh / 2 + fit.size * 0.04, font, weight, fit.size, ink));
  ctx.restore();
  return { x, y, w, h, size: fit.size, lines: fit.lines, overflow: fit.overflow };
}

function chip(ctx, text, cx, y, { fill, color, size = 40, alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `600 ${size}px ${FONT.label}`;
  const w = ctx.measureText(text).width + 52;
  const h = size * 1.7;
  ctx.fillStyle = fill;
  rr(ctx, cx - w / 2, y, w, h, h / 2);
  ctx.fill();
  line(ctx, text, cx, y + h / 2 + 2, FONT.label, 600, size, color);
  ctx.restore();
  return { w, h };
}

function badge(ctx, label, cx, cy, r, fill, color, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  line(ctx, label, 0, r * 0.06, FONT.display, 800, r * 1.1, color);
  ctx.restore();
}

// Drawn check mark: display fonts have no ✓ glyph, and a fallback font would differ between devices.
function tick(ctx, cx, cy, r) {
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = r * 0.26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.48, cy - r * 0.32);
  ctx.stroke();
}

function textAlpha(shot, t, isLast) {
  const local = t - shot.start;
  const inA = easeOut(local / 0.28);
  const outA = isLast ? 1 : 1 - clamp((local - (shot.dur - 0.22)) / 0.22, 0, 1);
  return inA * outA;
}

function drawText(ctx, plan, shot, t, isLast) {
  const type = STYLE_TYPE[plan.style];
  const local = t - shot.start;
  const a = textAlpha(shot, t, isLast);
  const rise = (1 - easeOut(local / 0.35)) * 26;
  const zone = shot.zone;
  if (a <= 0) return;

  if (shot.kind === 'hook') {
    if (plan.style === 'question') {
      const box = plateText(ctx, shot.text, { zone, font: type.head, weight: 800, maxSize: 100, minSize: 60, maxLines: 4, plate: NAVY, ink: '#fff', alpha: a, rise });
      badge(ctx, '?', TEXT_CX + box.w / 2 - 30, box.y - 10, 58, GOLD, NAVY, a, 0.8 + 0.2 * easeOut(local / 0.4));
      return;
    }
    if (plan.style === 'steps') {
      const box = plateText(ctx, shot.text, { zone, font: type.head, weight: 800, maxSize: 98, minSize: 60, maxLines: 4, plate: '#ffffff', ink: INK, alpha: a, rise, padY: 40 });
      badge(ctx, String(plan.shots.filter(s => s.kind === 'step').length), TEXT_CX - box.w / 2 + 34, box.y - 8, 62, GREEN, '#fff', a, 0.8 + 0.2 * easeOut(local / 0.4));
      return;
    }
    const box = plateText(ctx, shot.text, { zone, font: type.head, weight: 800, maxSize: 100, minSize: 60, maxLines: 4, plate: CREAM, ink: INK, alpha: a, rise, padY: 40 });
    if (shot.kicker) chip(ctx, shot.kicker, TEXT_CX, box.y - 96, { fill: GREEN, color: '#fff', size: 38, alpha: a * easeOut((local - 0.2) / 0.3) });
    return;
  }

  if (shot.kind === 'choices') {
    const q = plateText(ctx, shot.text, { zone: 'center', font: type.head, weight: 800, maxSize: 74, minSize: 52, maxLines: 3, plate: null, ink: '#fff', alpha: a, rise, anchorY: 520 });
    let y = Math.max(q.y + q.h + 40, 760);
    shot.choices.forEach((choice, i) => {
      const appear = easeOut((local - 0.5 - i * 0.55) / 0.3);
      if (appear <= 0) return;
      ctx.save();
      ctx.globalAlpha *= a * appear;
      const w = TEXT_W - 40, h = 150, x = TEXT_CX - w / 2, yy = y + (1 - appear) * 30;
      ctx.fillStyle = '#ffffff';
      rr(ctx, x, yy, w, h, 34);
      ctx.fill();
      badge(ctx, 'กขค'[i], x + 82, yy + h / 2, 46, GOLD, NAVY);
      const fit = fitText(choice, measurer(ctx, type.body, 600), { maxSize: 62, minSize: 40, maxW: w - 190, maxLines: 1 });
      line(ctx, fit.lines[0] || '', x + 150, yy + h / 2 + 3, type.body, 600, fit.size, INK, 'left');
      ctx.restore();
      y += h + 30;
    });
    return;
  }

  if (shot.kind === 'step') {
    const box = plateText(ctx, shot.text, { zone, font: type.body, weight: 600, maxSize: 84, minSize: 54, maxLines: 3, plate: '#ffffff', ink: INK, alpha: a, rise, padY: 40, padX: 52 });
    badge(ctx, String(shot.step), TEXT_CX - box.w / 2 + 30, box.y - 6, 56, GREEN, '#fff', a, 0.75 + 0.25 * easeOut(local / 0.35));
    // progress dots
    const dotsY = zone === 'top' ? box.y + box.h + 50 : box.y - 70;
    for (let i = 0; i < shot.total; i++) {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = i < shot.step ? GREEN : 'rgba(255,255,255,.75)';
      rr(ctx, TEXT_CX + 20 + i * 70 - (shot.total * 70) / 2, dotsY, 56, 14, 7);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  if (shot.kind === 'close') {
    const recap = shot.recap;
    let y = 560;
    if (recap) {
      recap.forEach((item, i) => {
        const appear = easeOut((local - 0.2 - i * 0.35) / 0.3);
        if (appear <= 0) return;
        ctx.save();
        ctx.globalAlpha *= a * appear;
        tick(ctx, SAFE.left + 70, y + 50, 40);
        const fit = fitText(item, measurer(ctx, type.body, 600), { maxSize: 58, minSize: 38, maxW: TEXT_W - 150, maxLines: 1 });
        line(ctx, fit.lines[0] || '', SAFE.left + 140, y + 54, type.body, 600, fit.size, '#fff', 'left');
        ctx.restore();
        y += 120;
      });
      y += 30;
    }
    const box = plateText(ctx, shot.text, { zone: 'center', font: type.head, weight: 800, maxSize: 92, minSize: 58, maxLines: 3, plate: plan.style === 'question' ? GOLD : CREAM, ink: NAVY, alpha: a, rise, anchorY: recap ? y : null, padY: 40 });
    if (shot.choices) {
      shot.choices.forEach((c, i) => badge(ctx, 'กขค'[i], TEXT_CX + (i - 1) * 140, box.y + box.h + 110, 52, '#ffffff', NAVY, a * easeOut((local - 0.4 - i * 0.2) / 0.3)));
    }
    if (plan.sample) line(ctx, 'ตัวอย่างจาก X-VISOR Studio', TEXT_CX, SAFE.bottom - 10, FONT.label, 600, 34, 'rgba(255,255,255,.82)');
    return;
  }

  // plain line
  plateText(ctx, shot.text, { zone, font: type.body, weight: 600, maxSize: 82, minSize: 52, maxLines: 4, plate: type.plate, ink: type.ink, alpha: a, rise, padX: 50 });
}

// Platform UI mock for the preview only, so the person can see that nothing sits under buttons or captions.
function drawGuides(ctx) {
  ctx.save();
  ctx.setLineDash([18, 14]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.strokeRect(SAFE.left, SAFE.top, SAFE.right - SAFE.left, SAFE.bottom - SAFE.top);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(0, SAFE.bottom, FRAME.w, FRAME.h - SAFE.bottom);
  ctx.fillRect(SAFE.right, SAFE.top, FRAME.w - SAFE.right, SAFE.bottom - SAFE.top);
  ctx.fillRect(0, 0, FRAME.w, SAFE.top);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(FRAME.w - 80, 900 + i * 150, 42, 0, Math.PI * 2); ctx.fill(); }
  rr(ctx, 60, FRAME.h - 330, 520, 40, 20); ctx.fill();
  rr(ctx, 60, FRAME.h - 270, 760, 34, 17); ctx.fill();
  ctx.restore();
}

export function drawFrame(ctx, plan, images, t, { guides = false } = {}) {
  const canvas = ctx.canvas;
  const s = canvas.width / FRAME.w;
  t = clamp(t, 0, plan.duration - 0.001);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, FRAME.w, FRAME.h);
  const i = shotAt(plan, t);
  const shot = plan.shots[i];
  const isLast = i === plan.shots.length - 1;
  const local = t - shot.start;
  if (i > 0 && local < FADE) {
    const prev = plan.shots[i - 1];
    drawPhoto(ctx, plan, images, prev, prev.end);
    scrim(ctx, prev.zone, 1);
    ctx.globalAlpha = easeInOut(local / FADE);
  }
  drawPhoto(ctx, plan, images, shot, t);
  scrim(ctx, shot.zone, shot.kind === 'close' ? 1.25 : 1);
  ctx.globalAlpha = 1;
  drawText(ctx, plan, shot, t, isLast);
  if (guides) drawGuides(ctx);
  ctx.restore();
}

// Measure every text block at full size; used by tests and by the editor to warn before anything overflows.
export function layoutReport(ctx, plan) {
  const out = [];
  for (const shot of plan.shots) {
    const type = STYLE_TYPE[plan.style];
    const font = shot.kind === 'hook' || shot.kind === 'close' ? type.head : type.body;
    const weight = font === type.head ? 800 : 600;
    const maxLines = shot.kind === 'step' || shot.kind === 'close' ? 3 : 4;
    const fit = fitText(shot.text, measurer(ctx, font, weight), { maxSize: 100, minSize: shot.kind === 'hook' ? 60 : 52, maxW: TEXT_W - 100, maxLines, maxH: 600 });
    out.push({ index: shot.index, kind: shot.kind, size: fit.size, lines: fit.lines, overflow: fit.overflow });
  }
  return out;
}

export { shotAt };
