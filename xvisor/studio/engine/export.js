// Saving the clip. Loaded only when someone opens the save step.
// The recorder plays the plan through drawFrame in real time on its own canvas, so the file shows exactly the preview.
import { drawFrame } from './render.js';

const CANDIDATES = [
  'video/mp4;codecs=avc1.42E01F',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
];

// What this browser can save, checked at runtime. `force` comes from ?force=… so fallbacks can be demonstrated.
export function exportSupport(force = '') {
  const can = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
  let type = '';
  if (can && !force.includes('nocodec')) {
    const allowed = force.includes('nomp4') ? CANDIDATES.filter(t => !t.startsWith('video/mp4')) : CANDIDATES;
    type = allowed.find(t => MediaRecorder.isTypeSupported?.(t)) || '';
  }
  if (!type) return { video: false, label: 'บันทึกภาพรายฉาก + บท (PNG, TXT)', ext: null };
  const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
  return { video: true, type, ext, label: `บันทึกคลิป (.${ext})` };
}

export function extensionFor(mime) {
  return String(mime).startsWith('video/mp4') ? 'mp4' : String(mime).startsWith('video/webm') ? 'webm' : 'bin';
}

// Record the plan. Resolves to { blob, mime, ext, duration }.
export function recordClip(plan, images, { type, width = 720, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width * 16 / 9);
    const ctx = canvas.getContext('2d');
    drawFrame(ctx, plan, images, 0);
    const stream = canvas.captureStream(30);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    } catch (error) {
      reject(Object.assign(new Error('recorder'), { cause: error }));
      return;
    }
    const chunks = [];
    let raf = 0, start = 0, stopped = false;
    const stop = () => { if (stopped) return; stopped = true; cancelAnimationFrame(raf); clearInterval(keep); if (recorder.state !== 'inactive') recorder.stop(); };
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = e => { stop(); reject(e.error || new Error('recorder')); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      if (signal?.aborted) { reject(new DOMException('aborted', 'AbortError')); return; }
      const mime = (recorder.mimeType || type).split(';')[0];
      let blob = new Blob(chunks, { type: mime });
      const duration = plan.duration;
      if (mime === 'video/webm') {
        try { blob = new Blob([withWebmDuration(new Uint8Array(await blob.arrayBuffer()), duration * 1000)], { type: mime }); } catch { /* keep the playable original */ }
      }
      resolve({ blob, mime, ext: extensionFor(mime), duration });
    };
    signal?.addEventListener('abort', stop);
    let last = 0;
    const draw = now => {
      if (stopped) return;
      last = now;
      const t = (now - start) / 1000;
      drawFrame(ctx, plan, images, Math.min(t, plan.duration));
      onProgress?.(Math.min(1, t / plan.duration));
      if (t >= plan.duration + 0.15) stop();
    };
    const frame = now => { draw(now); if (!stopped) raf = requestAnimationFrame(frame); };
    // Some browsers throttle rAF on a hidden canvas; a timer keeps frames coming if that happens.
    const keep = setInterval(() => { const now = performance.now(); if (!stopped && start && now - last > 80) draw(now); }, 1000 / 30);
    recorder.start(250);
    start = performance.now();
    raf = requestAnimationFrame(frame);
  });
}

// MediaRecorder writes WebM without a finite duration, which makes many players show 0:00 and refuse to seek.
// Insert Segment/Info/Duration (same approach as short/render-motion.mjs, ported to the browser).
export function withWebmDuration(buf, durationMs) {
  const vint = at => { let mask = 0x80, len = 1; while (len <= 8 && !(buf[at] & mask)) { mask >>= 1; len++; } if (len > 8) throw new Error('ebml'); return { mask, len }; };
  const read = at => {
    const idLen = vint(at).len;
    const id = [...buf.subarray(at, at + idLen)].map(b => b.toString(16).padStart(2, '0')).join('');
    const sizeAt = at + idLen;
    const { mask, len } = vint(sizeAt);
    let value = buf[sizeAt] & (mask - 1), unknown = value === mask - 1;
    for (let i = 1; i < len; i++) { value = value * 256 + buf[sizeAt + i]; if (buf[sizeAt + i] !== 0xff) unknown = false; }
    const dataAt = sizeAt + len;
    return { id, at, sizeAt, len, dataAt, unknown, size: unknown ? buf.length - dataAt : value };
  };
  const sizeBytes = (value, len) => { const out = new Uint8Array(len); let n = value; for (let i = len - 1; i >= 0; i--) { out[i] = n % 256; n = Math.floor(n / 256); } out[0] |= 1 << (8 - len); return out; };
  let at = 0, segment = null;
  while (at < buf.length) { const e = read(at); if (e.id === '18538067') { segment = e; break; } at = e.dataAt + e.size; }
  if (!segment) throw new Error('no segment');
  at = segment.dataAt;
  while (at < buf.length) {
    const info = read(at);
    if (info.id === '1549a966') {
      for (let p = info.dataAt; p < info.dataAt + info.size;) { const e = read(p); if (e.id === '4489') return buf; p = e.dataAt + e.size; }
      const dur = new Uint8Array(11);
      dur.set([0x44, 0x89, 0x88]);
      new DataView(dur.buffer).setFloat64(3, durationMs);
      const infoSize = info.size + dur.length;
      const infoLen = Math.max(info.len, 4);
      const head = buf.subarray(0, info.at);
      const infoId = buf.subarray(info.at, info.sizeAt);
      const body = buf.subarray(info.dataAt, info.dataAt + info.size);
      const tail = buf.subarray(info.dataAt + info.size);
      const out = new Uint8Array(head.length + infoId.length + infoLen + body.length + dur.length + tail.length);
      let o = 0;
      out.set(head, o); o += head.length;
      out.set(infoId, o); o += infoId.length;
      out.set(sizeBytes(infoSize, infoLen), o); o += infoLen;
      out.set(body, o); o += body.length;
      out.set(dur, o); o += dur.length;
      out.set(tail, o);
      // The Segment was written with unknown size by MediaRecorder, so growing Info needs no other change.
      if (!segment.unknown) throw new Error('sized segment');
      return out;
    }
    if (info.unknown) break;
    at = info.dataAt + info.size;
  }
  throw new Error('no info');
}

// Fallback when this browser cannot record video: one PNG per shot (taken mid-shot) plus the script as text.
export async function renderStills(plan, images, width = 1080) {
  const files = [];
  for (const shot of plan.shots) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width * 16 / 9);
    const t = shot.kind === 'close' || shot.kind === 'choices' ? shot.end - 0.05 : Math.min(shot.end - 0.05, shot.start + Math.max(0.9, shot.dur * 0.6));
    drawFrame(canvas.getContext('2d'), plan, images, t);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    files.push(new File([blob], `xvisor-${plan.id}-shot${shot.index + 1}.png`, { type: 'image/png' }));
  }
  return files;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
