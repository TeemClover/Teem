/* ═══════════════════════════════════════════════════════════════
   TeamBook — chat image intake

   The browser already shrinks every picture to a small WebP before it
   gets here (see xty/_shared/image-compress.js). This module does not
   trust that: it sniffs the real bytes, refuses anything that is not a
   raster photo, and stores it under a content type we chose rather than
   one the client asked for.

   SVG is rejected on purpose. It is a document format — it can carry
   script, and served from our own blob host it would run as us.
   ═══════════════════════════════════════════════════════════════ */

import { put, del } from '@vercel/blob';

/* The client aims well under this. The ceiling is here to stop a
   hand-rolled request, not to shape normal uploads. */
export const MAX_IMAGE_BYTES = 600 * 1024;

const SIGNATURES = [
  { type: 'image/webp', test: b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { type: 'image/jpeg', test: b => b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { type: 'image/png', test: b => b.length > 8 && b.toString('hex', 0, 8) === '89504e470d0a1a0a' },
];

/* Content type comes from the bytes, never from the request. */
export function sniffImageType(buffer) {
  return SIGNATURES.find(item => item.test(buffer))?.type || '';
}

export function decodeImagePayload(image) {
  if (!image || typeof image !== 'object') return { error: 'NO_IMAGE' };
  const raw = String(image.data || '');
  /* Accept a bare base64 body or a data: URL, but read the bytes either way. */
  const base64 = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  if (!base64 || !/^[A-Za-z0-9+/=\s]+$/.test(base64)) return { error: 'BAD_IMAGE' };

  let buffer;
  try { buffer = Buffer.from(base64, 'base64'); } catch { return { error: 'BAD_IMAGE' }; }
  if (!buffer.length) return { error: 'BAD_IMAGE' };
  if (buffer.length > MAX_IMAGE_BYTES) return { error: 'IMAGE_TOO_LARGE' };

  const contentType = sniffImageType(buffer);
  if (!contentType) return { error: 'UNSUPPORTED_IMAGE' };

  const width = Math.round(Number(image.width) || 0);
  const height = Math.round(Number(image.height) || 0);
  return {
    buffer,
    contentType,
    width: width > 0 && width <= 20000 ? width : null,
    height: height > 0 && height <= 20000 ? height : null,
  };
}

/* The SDK accepts either a read-write token or OIDC plus a store id, and
   under OIDC the token is injected into the running function rather than
   listed as a project variable — so a store id alone is enough to mean
   "configured". This check stays deliberately permissive: guessing wrong
   here would refuse uploads that the SDK could actually authorise, and a
   genuinely missing credential still surfaces from the call itself. */
export function blobConfigured() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/* The SDK reports every credential problem as a BlobError carrying this
   wording; anything else is a real upload failure worth its own message. */
export function isCredentialError(error) {
  return /no blob credentials|no read-write token|storeId was found/i.test(String(error?.message || ''));
}

/**
 * Put one already-validated image into blob storage.
 * @returns {Promise<{url:string,width:number|null,height:number|null}>}
 */
export async function storePartyImage(partyCode, decoded) {
  const extension = decoded.contentType === 'image/png' ? 'png'
    : (decoded.contentType === 'image/jpeg' ? 'jpg' : 'webp');
  const result = await put(`xty/${partyCode}/${Date.now()}.${extension}`, decoded.buffer, {
    access: 'public',
    contentType: decoded.contentType,
    /* Names collide across a party otherwise — two members posting in the
       same millisecond would overwrite each other. */
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  return { url: result.url, width: decoded.width, height: decoded.height };
}

/* Best effort. A leftover blob costs pennies; a failed post that reports
   success costs trust, so a cleanup failure never surfaces to the caller. */
export async function discardPartyImage(url) {
  if (!url) return;
  try { await del(url); } catch (error) { console.error('TeamBook image cleanup failed', error); }
}

/* Only URLs we minted may be used as a cover. Without this check a lead
   could point the cover at any host and every member's history would
   fetch it. */
export function isStoredImageUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && /(^|\.)(blob\.vercel-storage\.com|public\.blob\.vercel-storage\.com)$/.test(url.hostname);
  } catch { return false; }
}
