// Pure layout helpers shared by the live preview, the in-browser export and the offline demo render.
// Units are a 1080 × 1920 frame; the renderer scales the context for smaller canvases.

export const FRAME = { w: 1080, h: 1920 };

// Vertical-video safe area. Platform UI (TikTok, Reels, Shorts) covers the top status/tabs, the right-hand
// action column and the bottom caption/username block, so text and focal points stay inside this box.
export const SAFE = { left: 80, right: 1080 - 160, top: 250, bottom: 1920 - 430 };
export const ZONES = {
  // y0 leaves room above the plate for a kicker chip or number badge that must still clear SAFE.top.
  top: { y0: 350, y1: 820 },
  bottom: { y0: 1010, y1: 1480 }
};

const SEGMENTER = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
// Thai marks that must stay attached to the previous character, and leading vowels that must not end a line.
const COMBINING = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
const LEADING = /[\u0E40-\u0E44]$/;

export function graphemes(text) {
  return [...String(text || '')].filter(ch => !COMBINING.test(ch)).length;
}

// Break text into units that can be placed on a line. Spaces stay as their own units so they can be dropped at line ends.
// A unit that starts with a mark, or with a consonant silenced by ์ (as in “ต์” of “คอมเมนต์”), belongs to the previous one.
const ATTACH = /^([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]|[\u0E01-\u0E2E]\u0E4C)/;
function mergeAttached(parts) {
  const out = [];
  for (const p of parts) {
    if (out.length && p !== ' ' && out[out.length - 1] !== ' ' && (ATTACH.test(p) || LEADING.test(out[out.length - 1]))) out[out.length - 1] += p;
    else out.push(p);
  }
  return out;
}

export function breakUnits(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  if (SEGMENTER) return mergeAttached([...SEGMENTER.segment(s)].map(part => part.segment));
  // Fallback: break on spaces, then into syllable-sized chunks that never split a mark from its base.
  const out = [];
  for (const word of s.split(/( )/)) {
    if (word === ' ') { out.push(' '); continue; }
    let chunk = '';
    for (const ch of word) {
      if (chunk && !COMBINING.test(ch) && !LEADING.test(chunk) && graphemes(chunk) >= 3) { out.push(chunk); chunk = ''; }
      chunk += ch;
    }
    if (chunk) out.push(chunk);
  }
  return out;
}

function greedy(units, measure, maxW) {
  const lines = [];
  let line = '';
  for (const unit of units) {
    const next = line + unit;
    if (line && unit !== ' ' && measure(next.trimEnd()) > maxW) {
      lines.push(line.trim());
      line = unit === ' ' ? '' : unit;
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// Greedy wrap, then narrow the width while the line count holds so lines come out balanced (no one-word last line).
// Thai writers put a space between phrases, so a space is the preferred break. A phrase is only split into words
// when it is wider than the line on its own.
function phraseUnits(text, measure, maxW) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out = [];
  s.split(' ').forEach((phrase, i) => {
    if (i) out.push(' ');
    if (measure(phrase) <= maxW) out.push(phrase);
    else out.push(...breakUnits(phrase));
  });
  return out;
}

export function wrapBalanced(text, measure, maxW) {
  const units = phraseUnits(text, measure, maxW);
  if (!units.length) return [];
  const base = greedy(units, measure, maxW);
  if (base.length < 2) return base;
  let lo = maxW * 0.45, hi = maxW, best = base;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const trial = greedy(units, measure, mid);
    if (trial.length === base.length && trial.every(l => measure(l) <= maxW)) { best = trial; hi = mid; } else { lo = mid; }
  }
  return best;
}

// True when every space-separated phrase fits on a line by itself at this measure.
function phrasesFit(text, measure, maxW) {
  return String(text || '').trim().split(/\s+/).every(p => measure(p) <= maxW);
}

// Largest font size that fits `maxLines` lines inside `maxW`. Returns size, lines and whether it had to overflow.
// Down to 80% of maxSize it keeps every phrase whole; below that it would rather break inside a phrase than shrink.
export function fitText(text, measureAt, { maxSize, minSize, maxW, maxLines, maxH = Infinity, lineHeight = 1.32 }) {
  const floor = Math.max(minSize, Math.round(maxSize * 0.8));
  for (const keepPhrases of [true, false]) {
    for (let size = maxSize; size >= (keepPhrases ? floor : minSize); size -= 2) {
      const measure = s => measureAt(s, size);
      if (keepPhrases && !phrasesFit(text, measure, maxW)) continue;
      const lines = wrapBalanced(text, measure, maxW);
      const tallest = Math.max(0, ...lines.map(measure));
      if (lines.length <= maxLines && tallest <= maxW && lines.length * size * lineHeight <= maxH) return { size, lines, lineHeight, overflow: false };
    }
  }
  const measure = s => measureAt(s, minSize);
  const lines = wrapBalanced(text, measure, maxW);
  return { size: minSize, lines, lineHeight, overflow: lines.length > maxLines || lines.length * minSize * lineHeight > maxH };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Cover-fit an image so that its focus point lands at (tx, ty) of the frame, clamped so the frame is always covered.
export function coverCrop(iw, ih, focus, zoom, tx, ty, W = FRAME.w, H = FRAME.h) {
  const scale = Math.max(W / iw, H / ih) * Math.max(1, zoom);
  const dw = iw * scale, dh = ih * scale;
  const x = clamp(tx * W - focus.x * dw, W - dw, 0);
  const y = clamp(ty * H - focus.y * dh, H - dh, 0);
  return { x, y, w: dw, h: dh, fx: x + focus.x * dw, fy: y + focus.y * dh };
}

export const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
export const easeInOut = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export { clamp };
