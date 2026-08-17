/* ═══════════════════════════════════════════════════════════════
   XTY — shrink a picture before it ever leaves the phone

   The Party Log is read on a phone, one thumb, for about a minute a
   day. A picture only has to be legible there, so this trades away
   sharpness on purpose: long edge capped, re-encoded as WebP, quality
   walked down until the file is small.

   Doing it here rather than on the server means the slow upload never
   happens on a mobile connection, and the API never handles megabytes.
   ═══════════════════════════════════════════════════════════════ */

/* Enough to read a whiteboard photo on a phone, far below a modern
   camera's output. */
const MAX_EDGE = 1280;
const TARGET_BYTES = 110 * 1024;
/* The server's hard ceiling is higher; staying under this keeps a
   pathological image from ever reaching it. */
const CEILING_BYTES = 400 * 1024;
const QUALITY_STEPS = [0.72, 0.6, 0.5, 0.42, 0.35];
const EDGE_STEPS = [1, 0.8, 0.62];

export const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/heic,image/heif';

export function isSupportedImage(file) {
  return !!file && typeof file.type === 'string' && file.type.startsWith('image/');
}

async function decode(file) {
  /* from-image applies the EXIF rotation, otherwise phone photos land
     sideways — the one piece of fidelity worth keeping. */
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { /* Safari lacks the option; fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('DECODE_FAILED'));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

function sizeOf(source) {
  const width = source.width || source.naturalWidth || 0;
  const height = source.height || source.naturalHeight || 0;
  return { width, height };
}

function draw(source, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  /* Flatten transparency onto the notebook paper instead of black,
     since WebP-from-PNG would otherwise darken screenshots. */
  context.fillStyle = '#FFF9E9';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encode(canvas, type, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) canvas.toBlob(blob => resolve(blob), type, quality);
    else resolve(null);
  });
}

async function toBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  /* Chunked because a single spread of ~100k args overflows the stack. */
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Shrink a user-picked file into something small enough to post.
 * @param {File} file
 * @returns {Promise<{base64:string,width:number,height:number,bytes:number,type:string}>}
 */
export async function compressForChat(file) {
  if (!isSupportedImage(file)) throw new Error('UNSUPPORTED_IMAGE');
  const source = await decode(file);
  const { width, height } = sizeOf(source);
  if (!width || !height) throw new Error('DECODE_FAILED');

  const longest = Math.max(width, height);
  const baseScale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;

  /* WebP first; Safari versions that cannot encode it fall back to JPEG,
     which the server accepts too. Once an encoder proves itself the other
     is never probed again — and "proved itself" has to be tracked per
     attempt, not by whether a candidate exists, or a browser without WebP
     would abandon the working encoder as soon as it had any result at all. */
  let best = null;
  let encoderType = '';
  for (const edge of EDGE_STEPS) {
    const scale = baseScale * edge;
    const canvas = draw(source, width * scale, height * scale);
    for (const type of (encoderType ? [encoderType] : ['image/webp', 'image/jpeg'])) {
      let usable = false;
      for (const quality of QUALITY_STEPS) {
        const blob = await encode(canvas, type, quality);
        if (!blob || !blob.size) continue;
        /* toBlob silently hands back a PNG when the type is unsupported. */
        if (blob.type !== type) break;
        usable = true;
        encoderType = type;
        if (!best || blob.size < best.blob.size) {
          best = { blob, width: canvas.width, height: canvas.height };
        }
        if (blob.size <= TARGET_BYTES) {
          return {
            base64: await toBase64(blob), width: canvas.width, height: canvas.height,
            bytes: blob.size, type: blob.type,
          };
        }
      }
      if (usable) break;
    }
  }

  if (!best) throw new Error('ENCODE_FAILED');
  if (best.blob.size > CEILING_BYTES) throw new Error('IMAGE_TOO_LARGE');
  return {
    base64: await toBase64(best.blob), width: best.width, height: best.height,
    bytes: best.blob.size, type: best.blob.type,
  };
}

export function readableBytes(value) {
  const size = Number(value || 0);
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
