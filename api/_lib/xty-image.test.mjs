/* Guards the intake rules that keep the blob store from becoming an
   upload surface for whatever a client feels like sending. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_IMAGE_BYTES, decodeImagePayload, isStoredImageUrl, sniffImageType,
} from './xty-image.js';

function webp(payloadBytes = 32) {
  const body = Buffer.alloc(payloadBytes, 0x20);
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii'), body,
  ]);
}
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)]);
const JPEG = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF]), Buffer.alloc(16)]);

test('content type comes from the bytes', () => {
  assert.equal(sniffImageType(webp()), 'image/webp');
  assert.equal(sniffImageType(PNG), 'image/png');
  assert.equal(sniffImageType(JPEG), 'image/jpeg');
});

test('SVG is refused — it is a script carrier, not a photo', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(sniffImageType(svg), '');
  assert.equal(decodeImagePayload({ data: svg.toString('base64') }).error, 'UNSUPPORTED_IMAGE');
});

test('a mislabelled data URL cannot smuggle its own content type', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
  const decoded = decodeImagePayload({ data: `data:image/webp;base64,${svg}` });
  assert.equal(decoded.error, 'UNSUPPORTED_IMAGE');
});

test('a real webp decodes and keeps its stated size', () => {
  const decoded = decodeImagePayload({ data: webp().toString('base64'), width: 1280, height: 720 });
  assert.equal(decoded.error, undefined);
  assert.equal(decoded.contentType, 'image/webp');
  assert.equal(decoded.width, 1280);
  assert.equal(decoded.height, 720);
});

test('nonsense dimensions are dropped rather than stored', () => {
  const decoded = decodeImagePayload({ data: webp().toString('base64'), width: -5, height: 9e9 });
  assert.equal(decoded.width, null);
  assert.equal(decoded.height, null);
});

test('oversize payloads are refused before any upload', () => {
  const huge = webp(MAX_IMAGE_BYTES + 1024).toString('base64');
  assert.equal(decodeImagePayload({ data: huge }).error, 'IMAGE_TOO_LARGE');
});

test('empty and malformed payloads are refused', () => {
  assert.equal(decodeImagePayload(null).error, 'NO_IMAGE');
  assert.equal(decodeImagePayload({ data: '' }).error, 'BAD_IMAGE');
  assert.equal(decodeImagePayload({ data: 'not base64 !!!' }).error, 'BAD_IMAGE');
});

test('only our own blob host may be used as a cover', () => {
  assert.equal(isStoredImageUrl('https://abc123.public.blob.vercel-storage.com/xty/00042/a.webp'), true);
  assert.equal(isStoredImageUrl('https://evil.com/a.webp'), false);
  /* the lookalike host is the one worth naming */
  assert.equal(isStoredImageUrl('https://blob.vercel-storage.com.evil.com/a.webp'), false);
  assert.equal(isStoredImageUrl('http://abc.public.blob.vercel-storage.com/a.webp'), false);
  assert.equal(isStoredImageUrl('javascript:alert(1)'), false);
  assert.equal(isStoredImageUrl(''), false);
});
