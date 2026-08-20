/* Runs the real compressor against a fake canvas whose encoder shrinks
   with quality and scale, so the search loop itself is under test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
let encoderTypes = ['image/webp', 'image/jpeg'];

class FakeBlob {
  constructor(size, type) { this.size = size; this.type = type; }
  async arrayBuffer() { return new Uint8Array(this.size).fill(65).buffer; }
}

function fakeCanvas() {
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ fillRect() {}, drawImage() {}, set fillStyle(_v) {}, set imageSmoothingQuality(_v) {} }),
    toBlob(done, type, quality) {
      calls.push({ type, quality, width: canvas.width, height: canvas.height });
      /* Unsupported encoders hand back a PNG, exactly like a real canvas. */
      if (!encoderTypes.includes(type)) { done(new FakeBlob(900_000, 'image/png')); return; }
      const pixels = canvas.width * canvas.height;
      done(new FakeBlob(Math.round(pixels * quality * 0.35), type));
    },
  };
  return canvas;
}

globalThis.document = { createElement: () => fakeCanvas() };
globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64');
globalThis.createImageBitmap = async () => ({ width: 4032, height: 3024 });

const { compressForChat, isSupportedImage } = await import('./image-compress.js');
const file = { type: 'image/jpeg', name: 'photo.jpg' };

test('a phone photo comes out small and WebP', async () => {
  calls.length = 0; encoderTypes = ['image/webp', 'image/jpeg'];
  const out = await compressForChat(file);
  assert.equal(out.type, 'image/webp');
  assert.ok(out.bytes <= 110 * 1024, `expected <=110KB, got ${out.bytes}`);
  assert.ok(out.base64.length > 0);
});

test('the long edge is capped, and aspect ratio survives', async () => {
  calls.length = 0;
  const out = await compressForChat(file);
  assert.ok(Math.max(out.width, out.height) <= 1280, `long edge ${out.width}x${out.height}`);
  assert.equal(Math.round((out.width / out.height) * 100), Math.round((4032 / 3024) * 100));
});

test('quality is walked down instead of jumping to the worst setting', async () => {
  calls.length = 0;
  await compressForChat(file);
  const webpCalls = calls.filter(call => call.type === 'image/webp');
  assert.equal(webpCalls[0].quality, 0.72, 'must try the best quality first');
  /* Each canvas size restarts at the best quality, so descent is checked
     within a size rather than across the whole run. */
  const bySize = new Map();
  for (const call of webpCalls) {
    const key = `${call.width}x${call.height}`;
    (bySize.get(key) || bySize.set(key, []).get(key)).push(call.quality);
  }
  for (const [size, qualities] of bySize) {
    assert.deepEqual(qualities, [...qualities].sort((a, b) => b - a), `must descend at ${size}`);
    assert.equal(qualities[0], 0.72, `must start from the best quality at ${size}`);
  }
});

test('a browser that cannot encode WebP falls back to JPEG', async () => {
  calls.length = 0; encoderTypes = ['image/jpeg'];
  const out = await compressForChat(file);
  assert.equal(out.type, 'image/jpeg');
  assert.ok(out.bytes <= 110 * 1024);
});

test('an already tiny image is not upscaled', async () => {
  calls.length = 0; encoderTypes = ['image/webp', 'image/jpeg'];
  globalThis.createImageBitmap = async () => ({ width: 320, height: 240 });
  const out = await compressForChat(file);
  assert.equal(out.width, 320);
  assert.equal(out.height, 240);
  globalThis.createImageBitmap = async () => ({ width: 4032, height: 3024 });
});

test('non-images are rejected before any decoding', async () => {
  assert.equal(isSupportedImage({ type: 'application/pdf' }), false);
  await assert.rejects(() => compressForChat({ type: 'application/pdf' }), /UNSUPPORTED_IMAGE/);
});
