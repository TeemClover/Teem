import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isPrivateShelfPath } from '../../shelf/route-policy.js';

test('public shelf shell and admin UI remain available', () => {
  for (const route of ['/shelf', '/shelf/', '/shelf/index.html', '/shelf/shelf.js', '/shelf/shelf.css', '/shelf/admin/', '/shelf/admin/admin.js']) assert.equal(isPrivateShelfPath(route), false, route);
});
test('direct catalog, markdown, templates, docs and encoded variants never expose bytes', () => {
  for (const route of ['/shelf/catalog.json', '/shelf/source/', '/shelf/source/method/sauce-working-principle.md', '/shelf/source/TEMPLATE.md', '/shelf/README.md', '/shelf/CHANGELOG.md', '/shelf/validate.mjs', '/shelf/%73ource/method/sauce-working-principle.md', '/shelf/%2573ource/file.md', '/shelf//source/file.md', '/shelf/new-file.json']) assert.equal(isPrivateShelfPath(route), true, route);
});
test('unrelated routes are outside shelf policy', () => {
  for (const route of ['/', '/resume/', '/shelfish/', '/api/shelf', '/meet/', '/ako/']) assert.equal(isPrivateShelfPath(route), false, route);
});
test('deployment bundles sources into API and leaves private redirects to middleware', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.functions['api/shelf.js'].includeFiles, 'shelf/{catalog.json,source/**}');
  // A vercel.json redirect can run before the private middleware response and
  // return public cache headers even when the source bytes remain protected.
  for(const source of ['/shelf/source/:path*','/shelf/catalog.json','/shelf/README.md','/shelf/CHANGELOG.md']){
    assert(!config.redirects.some(rule => rule.source === source),source);
  }
});
