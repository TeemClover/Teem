import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderCompassPage, renderTourRoot} from '../../tools/sync-frontdoor-root.mjs';

const read = p => readFile(new URL('../../' + p, import.meta.url), 'utf8');

test('public root is the house tour, rendered from tour/index.html', async () => {
  const [root, tour] = await Promise.all(['index.html', 'tour/index.html'].map(read));
  assert.equal(root, renderTourRoot(tour));
  assert.equal(root.slice(root.indexOf('<body')), tour.slice(tour.indexOf('<body')));
  assert.match(root, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/">/);
  assert.match(root, /<meta name="robots" content="index,follow">/);
  assert.match(root, /<meta property="og:url" content="https:\/\/www\.myclover\.com\/">/);
  assert.match(root, /href="\/compass\/"/);
  assert.equal((root.match(/src="\/assets\/my-learning-entry.js"/g) || []).length, 1); // students still see ห้องเรียนของฉัน
  assert.doesNotMatch(root, /assets\/track\.js|content="home-open"/);
});

test('the Compass moved to /compass/ with the exact same body and runtime as /frontdoor/', async () => {
  const [compass, source, home] = await Promise.all(['compass/index.html', 'frontdoor/index.html', 'home/index.html'].map(read));
  assert.equal(compass, renderCompassPage(source));
  assert.equal(compass.slice(compass.indexOf('<body')), source.slice(source.indexOf('<body')));
  assert.match(compass, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/compass\/">/);
  assert.match(compass, /<meta name="robots" content="index,follow">/);
  assert.match(home, /content="home-open"/); assert.match(home, /home-opening-full\.mp4/);
  assert.match(home, /href="\/hall\.html"/); assert.match(home, /href="\/frontdoor\/"/);
});
