import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  partyCoverUrl, partyImageSeqFromUrl, partyImageUrl, partyMediaToken, refreshPartyMediaCookie,
} from '../api/_lib/xty-image.js';

const ROOT = new URL('..', import.meta.url).pathname;

test('private image references stay on member-gated TeamBook routes', () => {
  assert.equal(partyImageUrl('1234567890', 7), '/api/teambook/party/1234567890/image/7');
  assert.equal(partyCoverUrl('1234567890'), '/api/teambook/party/1234567890/cover');
  assert.equal(partyImageSeqFromUrl('/api/teambook/party/1234567890/image/7', '1234567890'), 7);
  assert.equal(partyImageSeqFromUrl('/api/teambook/party/9999999999/image/7', '1234567890'), null);
  assert.equal(partyImageSeqFromUrl('https://example.com/photo.webp', '1234567890'), null);
});

test('local party bearer sessions become path-scoped HttpOnly media cookies', () => {
  const headers = new Map();
  const res = {
    getHeader: name => headers.get(name),
    setHeader: (name, value) => headers.set(name, value),
  };
  refreshPartyMediaCookie({ headers: { authorization: 'Bearer secret-token' } }, res, '1234567890');
  const cookie = headers.get('Set-Cookie');
  assert.match(cookie, /^tb_media_1234567890=secret-token;/);
  assert.match(cookie, /Path=\/api\/teambook\/party\/1234567890\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.equal(partyMediaToken({ headers: { cookie: cookie.split(';')[0] } }, '1234567890'), 'secret-token');
  assert.equal(partyMediaToken({ headers: { authorization: 'Bearer newer-token', cookie } }, '1234567890'), 'newer-token');
});

test('deployment writes public blobs while TeamBook state routes stay gated', () => {
  const image = readFileSync(join(ROOT, 'api/_lib/xty-image.js'), 'utf8');
  const publicList = readFileSync(join(ROOT, 'api/teambook-public-list-v13.js'), 'utf8');
  const media = readFileSync(join(ROOT, 'api/teambook-media.js'), 'utf8');
  const pet = readFileSync(join(ROOT, 'api/_lib/pet-brain.js'), 'utf8');
  const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

  assert.match(image, /access: 'public'/);
  assert.doesNotMatch(image, /access: 'private'/);
  assert.match(image, /fetch\(url/);
  assert.match(media, /AUTH_REQUIRED/);
  assert.match(media, /readStoredImage/);
  assert.match(media, /Cache-Control', 'private, max-age=300'/);
  assert.match(pet, /storedImageDataUrl/);
  assert.match(publicList, /row\.cover_type === 'image' \? 'card_back'/);
  assert.doesNotMatch(publicList, /coverValue: row\.cover_value \|\| row\.lead_card_id/);

  const mediaRewrite = config.rewrites.findIndex(item => item.destination.startsWith('/api/teambook-media'));
  const catchAllRewrite = config.rewrites.findIndex(item => item.source === '/api/teambook/:path*');
  assert.ok(mediaRewrite >= 0 && mediaRewrite < catchAllRewrite);
});
