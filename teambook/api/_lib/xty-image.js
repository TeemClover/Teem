/* ═══════════════════════════════════════════════════════════════
   TeamBook — chat image intake

   The browser already shrinks every picture to a small WebP before it
   gets here (see /_shared/image-compress.js). This module does not
   trust that: it sniffs the real bytes, refuses anything that is not a
   raster photo, and stores it under a content type we chose rather than
   one the client asked for.

   SVG is rejected on purpose. It is a document format — it can carry
   script, and served from our own blob host it would run as us.
   ═══════════════════════════════════════════════════════════════ */

import { put, del, get } from '@vercel/blob';

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

function mediaCookieName(partyCode) {
  return `tb_media_${String(partyCode || '').replace(/[^A-Za-z0-9]/g, '')}`;
}

function cookieValue(req, name) {
  for (const part of String(req?.headers?.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return '';
}

export function partyMediaToken(req, partyCode) {
  const authorization = String(req?.headers?.authorization || '');
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  return cookieValue(req, mediaCookieName(partyCode));
}

/* An <img> request cannot attach the bearer token kept by the TeamBook
   client. After a normal authenticated state refresh, mirror that token into
   a path-scoped HttpOnly cookie used only by this party's media endpoints. */
export function refreshPartyMediaCookie(req, res, partyCode) {
  const authorization = String(req?.headers?.authorization || '');
  if (!authorization.startsWith('Bearer ')) return;
  const value = authorization.slice(7).trim();
  if (!value) return;
  const code = encodeURIComponent(String(partyCode || ''));
  const cookie = `${mediaCookieName(partyCode)}=${encodeURIComponent(value)}; Path=/api/teambook/party/${code}/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
  const current = res.getHeader?.('Set-Cookie');
  if (!current) res.setHeader('Set-Cookie', cookie);
  else res.setHeader('Set-Cookie', Array.isArray(current) ? [...current, cookie] : [current, cookie]);
}

export function partyImageUrl(partyCode, seq) {
  return `/api/teambook/party/${encodeURIComponent(String(partyCode || ''))}/image/${Number(seq)}`;
}

export function partyCoverUrl(partyCode) {
  return `/api/teambook/party/${encodeURIComponent(String(partyCode || ''))}/cover`;
}

export function partyImageSeqFromUrl(value, partyCode) {
  try {
    const pathname = new URL(String(value || ''), 'https://teambook.local').pathname;
    const escaped = String(partyCode || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = pathname.match(new RegExp(`^/api/teambook/party/${escaped}/image/(\\d+)$`, 'i'));
    const seq = Number(match?.[1] || 0);
    return Number.isSafeInteger(seq) && seq > 0 ? seq : null;
  } catch { return null; }
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
  const result = await put(`teambook/${partyCode}/${Date.now()}.${extension}`, decoded.buffer, {
    access: 'private',
    contentType: decoded.contentType,
    /* Names collide across a party otherwise — two members posting in the
       same millisecond would overwrite each other. */
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  return { url: result.url, width: decoded.width, height: decoded.height };
}

export async function readStoredImage(url, options = {}) {
  if (!isStoredImageUrl(url)) return null;
  return get(url, {
    access: 'private',
    ifNoneMatch: options.ifNoneMatch || undefined,
  });
}

/* Groq cannot fetch a private Blob URL. Read the already-small image on the
   server and hand vision a data URL instead; no permanent public derivative
   is created. */
export async function storedImageDataUrl(url) {
  const result = await readStoredImage(url);
  if (!result || result.statusCode !== 200 || !result.stream) return '';
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return '';
  const contentType = sniffImageType(buffer);
  if (!contentType) return '';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
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
