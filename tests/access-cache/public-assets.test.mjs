import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_ASSET_INVENTORY } from '../../routing/public-asset-inventory.js';
import { PUBLIC_ASSET_CACHE_HEADERS, publicAssetPath } from '../../routing/public-assets.js';
import { buildPublicAssetInventory, renderPublicAssetInventory } from '../../tools/build-public-assets.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('published lesson, comic, product and shell assets resolve without any session state', () => {
  for (const file of [
    '/classroom/img/header-lesson1.webp',
    '/classroom/sauce-cup/header-prologue.webp',
    '/classroom/awaken/notebook/img/nb-01.jpg',
    '/img/party-teem.webp', '/forge/img/01-p3-640.webp',
    '/forge/original/01.jpeg', '/forge/original/family2026.jpg',
    '/xvisor/quest/assets/teem-ako-guides-v2.png',
    '/xircle/assets/product/astamega-320.webp', '/xty/assets/pets/starter-dog.webp',
    '/assets/account.js', '/learn/assets/learn.css',
    '/course/thedent/course.css', '/course/thedent/opening.js',
    '/course/thedent/fonts/ibm-plex-sans-thai-thai-400.woff2',
    '/course/admin/reviews/reviews.css', '/course/admin/reviews/reviews.js',
    '/course/review-consent/consent.css', '/course/review-consent/consent.js',
    '/media/home-opening-bg.mp4', '/ako/assets/ako-real-eating-onion-hero.m4v',
    '/hf/assets/example-teem.mp4',
    '/shelf/shelf.css',
  ]) {
    assert.equal(publicAssetPath(file), file);
  }
  assert.equal(publicAssetPath('/learn/classroom/img/header-lesson1.webp'), '/classroom/img/header-lesson1.webp');
  assert.equal(publicAssetPath('/course/thedent912/opening/slide-01.jpg'), '/course/thedent/opening/slide-01.jpg');
  assert.equal(publicAssetPath('/course/thedent/followup-qr.svg'), '/course/thedent/followup-qr.svg');
});

test('image extensions never open private/API/internal or unreviewed storage', () => {
  for (const file of [
    '/api/learn-foundation', '/api/learn-foundation?file=img/header-lesson1.webp',
    '/api/teambook-media/member.jpg', '/api/learn-media/file.png',
    '/private/photo.jpg', '/uploads/member.png', '/shelf/source/private.jpg',
    '/shelf/catalog.json', '/shelf/source/source.md', '/shelf/admin/index.html',
    '/classroom/awaken/notebook/index.html', '/classroom/index.html',
    '/classroom/media/lesson3-source-example.mp4', '/classroom/lv5/vault-data.js',
    '/ai-source/assets/EP01_SAMPLE.mp4', '/media/unreviewed.mp4',
    '/ako/assets/new-video.mp4', '/hf/assets/uploads/member.mp4',
    '/classroom/AI-SAUCE-COURSE-MASTER.md', '/classroom/backups/private.png',
    '/classroom/img/new-unreviewed.png',
    '/course/thedent912/index.html', '/course/thedent912/course-content.js',
    '/course/thedent912/opening-data.js', '/course/thedent912/course-resources.js',
    '/course/thedent/course.js', '/course/thedent912/course.js',
    '/course/thedent912/tools.js', '/course/thedent912/resources/answer-key.md',
    '/course/thedent912/downloads/the-dent-course-kit.zip',
    '/course/thedent912/resources/thedent-branches.csv',
    '/course/admin/reviews/index.html', '/account/index.html', '/learn/index.html',
    '/tests/classroom/fixture.png', '/functions/private.png',
    '/xty/assets/decor/_source/03_UI_Stickers/private.png',
    '/calling/assets/hero-device.webp',
  ]) assert.equal(publicAssetPath(file), null, file);
});

test('ambiguous aliases cannot cross publication boundaries', () => {
  for (const file of [
    '/CLASSROOM/img/header-lesson1.webp', '/Classroom/img/header-lesson1.webp',
    '/classroom//img/header-lesson1.webp', '/classroom/img/../img/header-lesson1.webp',
    '/classroom/img/%68eader-lesson1.webp', '/classroom/img/header-lesson1.webp?file=private',
    '/classroom/img/header-lesson1.webp#fragment', '/classroom\\img\\header-lesson1.webp',
    '//classroom/img/header-lesson1.webp', '/learn//classroom/img/header-lesson1.webp',
    '/course/thedent912/%6fpening/slide-01.jpg', '/course/thedent912/opening/slide-01.jpg/',
    null, {}, undefined,
  ]) assert.equal(publicAssetPath(file), null, String(file));
});

test('stable public files can be cached and revalidated without any session headers', () => {
  for (const header of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control']) {
    assert.match(PUBLIC_ASSET_CACHE_HEADERS[header], /public/);
    assert.match(PUBLIC_ASSET_CACHE_HEADERS[header], /must-revalidate/);
    assert.doesNotMatch(PUBLIC_ASSET_CACHE_HEADERS[header], /private|no-store|immutable/);
  }
  assert.equal(PUBLIC_ASSET_CACHE_HEADERS.Vary, undefined);
  assert.equal(PUBLIC_ASSET_CACHE_HEADERS['Set-Cookie'], undefined);
  assert.match(PUBLIC_ASSET_CACHE_HEADERS['Cache-Control'], /max-age=300(?:,|$)/);
  assert.match(PUBLIC_ASSET_CACHE_HEADERS['CDN-Cache-Control'], /max-age=3600(?:,|$)/);
  assert.match(PUBLIC_ASSET_CACHE_HEADERS['Vercel-CDN-Cache-Control'], /max-age=3600(?:,|$)/);
});

test('every reviewed asset is an existing regular file within this checkout', async () => {
  const base = await realpath(root);
  for (const file of PUBLIC_ASSET_INVENTORY) {
    assert.equal(publicAssetPath(file), file, file);
    const actual = await realpath(path.join(root,file.slice(1)));
    assert.equal(actual, path.join(base,file.slice(1)), file);
    assert.equal((await stat(actual)).isFile(),true,file);
    assert.doesNotMatch(file, /\/(?:api|backend|functions|tests|docs|_source|private|uploads|backups|internal)\//i);
    assert.doesNotMatch(file, /\.(?:html?|md|pdf|zip|csv|xlsx|json|mjs)$/i);
  }
});

test('the committed inventory is fresh against reviewed publication roots', async () => {
  const current = await buildPublicAssetInventory(root);
  assert.deepEqual(PUBLIC_ASSET_INVENTORY,current);
  assert.equal(await readFile(path.join(root,'routing/public-asset-inventory.js'),'utf8'),renderPublicAssetInventory(current));
});
