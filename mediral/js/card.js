/**
 * "ใบสรุปก่อนจ่าย" — a PNG checklist of the pieces the buyer ticked, in routine order.
 * No prices: the poster offer has dates and the card may be opened later.
 *
 * Contract (used by js/main.js):
 *   drawRoutineCard({pieces, data, asset}) -> Promise<string>  // object URL of a 1080-wide PNG (≥1350 tall)
 *   pieces = the ticked entries of routine.json `steps`, in order; data = routine.json; asset(path) -> URL
 *   Rejects on any failure so main.js can tell the buyer on the page.
 */
const W = 1080, MIN_H = 1350, PAD = 90;
const C = {forest: '#0e4f2c', deep: '#0a3520', ink: '#12261b', soft: '#4a5d51', gold: '#c8a45e', warn: '#6d5317', line: 'rgba(14,79,44,0.16)'};
const SERIF = '"Noto Serif Thai", "Cormorant Garamond", serif';
const SANS = '"Noto Sans Thai", system-ui, sans-serif';

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', {granularity: 'word'}) : null;
const words = s => (segmenter ? [...segmenter.segment(s)].map(p => p.segment) : [...s]);
function wrap(g, str, maxWidth) {
  const lines = [];
  let line = '';
  for (const w of words(str)) {
    if (line && g.measureText(line + w).width > maxWidth) { lines.push(line.trimEnd()); line = w.trimStart(); } else line += w;
  }
  if (line) lines.push(line);
  return lines;
}
/** Wrapped text with its first baseline at y; returns the y just below the last line. */
function text(g, str, x, y, {font, color = C.ink, maxWidth = W - 2 * PAD, lineHeight = 1.42, align = 'left'}) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  const lines = wrap(g, str, maxWidth);
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lineHeight));
  return y + (lines.length - 1) * size * lineHeight + size * 0.5;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
function foam(g, cx, cy, r) { // stand-in for the mousse while its current pack is unverified
  const bubbles = [[0, 0, 1], [-0.55, 0.25, 0.62], [0.58, 0.3, 0.55], [-0.2, -0.62, 0.5], [0.35, -0.5, 0.42]];
  for (const [dx, dy, s] of bubbles) {
    g.beginPath();
    g.arc(cx + dx * r, cy + dy * r, r * 0.55 * s, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fill();
    g.strokeStyle = 'rgba(14,79,44,0.25)';
    g.lineWidth = 2;
    g.stroke();
  }
}

function layout(g, H, {pieces, data, imgs}, pinFooter = true) {
  const total = data.steps.length;
  const full = pieces.length === total;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f1f4ec');
  bg.addColorStop(1, '#f6f4ee');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = C.gold;
  g.lineWidth = 2;
  g.strokeRect(36, 36, W - 72, H - 72);

  text(g, 'myClover · Mediral 5 Steps', PAD, 130, {font: 'italic 500 40px "Cormorant Garamond"', color: C.forest});
  let y = text(g, 'ใบสรุปก่อนจ่าย', PAD, 215, {font: `600 60px ${SERIF}`, color: C.deep});
  g.fillStyle = C.gold;
  g.fillRect(PAD, y + 18, 72, 3);
  y = text(g, full ? 'ชุดครบ 5 ชิ้น' : `เลือก ${pieces.length} จาก ${total} ชิ้น`, PAD, y + 82, {font: `600 34px ${SERIF}`, color: C.deep});

  // One row per piece: image, step number, name, role, when.
  y += 30;
  for (const p of pieces) {
    const rowH = 150;
    roundRect(g, PAD, y, W - 2 * PAD, rowH, 22);
    g.fillStyle = 'rgba(255,255,255,0.78)';
    g.fill();
    g.strokeStyle = C.line;
    g.lineWidth = 2;
    g.stroke();
    const img = imgs[p.id];
    if (img) {
      let h = 120, w = h * img.naturalWidth / img.naturalHeight;
      if (w > 110) { h *= 110 / w; w = 110; }
      g.drawImage(img, PAD + 20 + (110 - w) / 2, y + (rowH - h) / 2, w, h);
    } else foam(g, PAD + 75, y + rowH / 2, 34);
    text(g, String(p.order).padStart(2, '0'), PAD + 160, y + 62, {font: 'italic 500 48px "Cormorant Garamond"', color: C.gold});
    text(g, `${p.nick}${p.size ? ` · ${p.size}` : ''}`, PAD + 240, y + 58, {font: `600 30px ${SERIF}`, color: C.deep, maxWidth: W - 2 * PAD - 260});
    text(g, `${p.role_short || p.verb} · ${p.when.join(' / ')}`, PAD + 240, y + 104, {font: `400 24px ${SANS}`, color: C.soft, maxWidth: W - 2 * PAD - 260});
    y += rowH + 16;
  }
  if (pieces.some(p => !p.image)) {
    y = text(g, 'มูสล้างหน้า: ภาพแพ็กปัจจุบันยังรอยืนยัน ให้ดูภาพและขนาดที่ร้านระบุ', PAD, y + 20, {font: `500 22px ${SANS}`, color: C.warn});
  }

  // Three checks
  y = text(g, 'ก่อนกดจ่าย เช็กให้ตรงสามข้อ', PAD, y + 66, {font: `600 32px ${SERIF}`, color: C.deep});
  const checks = [
    full ? 'รายการชุดในร้านมีครบทั้ง 5 ชิ้นนี้' : 'ตัวเลือกในร้านตรงกับชิ้นที่เลือกไว้',
    'แพ็กและขนาดตรงกับที่ร้านระบุว่าจะส่ง',
    'ยอดหลังใช้สิทธิและค่าส่งที่หน้าชำระ เป็นยอดที่รับได้',
  ];
  y += 26;
  for (const [i, item] of checks.entries()) {
    y += 28;
    g.strokeStyle = C.forest;
    g.lineWidth = 3;
    roundRect(g, PAD, y - 28, 36, 36, 8);
    g.stroke();
    g.font = `600 22px ${SANS}`;
    g.fillStyle = C.forest;
    g.textAlign = 'center';
    g.fillText(String(i + 1), PAD + 18, y - 3);
    y = text(g, item, PAD + 56, y, {font: `400 27px ${SANS}`, maxWidth: W - 2 * PAD - 56}) + 12;
  }

  const note = `${data.order_note} · ภาพแพ็ก AI ฉบับร่าง ไม่ใช่ฉลากต้นฉบับ · ข้อมูลจากสื่อแบรนด์ที่ได้รับ ${data.evidence.received} · ราคาและสิทธิดูที่หน้าชำระเงินเท่านั้น`;
  y = text(g, note, PAD, pinFooter ? Math.max(y + 56, H - 160) : y + 56, {font: `400 21px ${SANS}`, color: C.soft, lineHeight: 1.5});
  return y + 70;
}

export async function drawRoutineCard({pieces, data, asset}) {
  if (!pieces.length) throw new Error('no pieces selected');
  await Promise.all([`600 60px ${SERIF}`, `600 30px ${SERIF}`, `400 24px ${SANS}`, 'italic 500 40px "Cormorant Garamond"']
    .map(f => document.fonts?.load(f).catch(() => null)));
  const imgs = Object.fromEntries(await Promise.all(pieces.filter(p => p.image).map(async p => [p.id, await loadImage(asset(p.image))])));
  const probe = document.createElement('canvas');
  probe.width = W; probe.height = 2600;
  const needed = layout(probe.getContext('2d'), 2600, {pieces, data, imgs}, false);
  const c = document.createElement('canvas');
  c.width = W; c.height = Math.max(MIN_H, Math.ceil(needed));
  layout(c.getContext('2d'), c.height, {pieces, data, imgs});
  const blob = await new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'));
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}
