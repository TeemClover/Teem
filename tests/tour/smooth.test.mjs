/** Nothing that happens while walking through the house may force the GPU to rebuild shaders or redraw what cannot be seen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as THREE from '../../tour/vendor/three.module.min.js';
import {buildHouse, CLOVER_ROOMS} from '../../tour/house.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

function house(t) {
  t.mock.method(THREE.TextureLoader.prototype, 'load', () => new THREE.Texture());
  const tex = new Proxy({canvasTex: () => new THREE.Texture()}, {get: (target, key) => target[key] ?? (target[key] = new THREE.Texture())});
  return buildHouse({renderer: {}, hd: false, tex, found: new Set(), mobile: false});
}
const lit = h => { let n = 0; h.root.traverseVisible(o => { if (o.isLight) n++; }); return n; };

test('hiding the facade, the roof or the rooms never changes the number of lights (a change recompiles every lit shader)', t => {
  const h = house(t), before = lit(h);
  assert.ok(before >= 8, `found ${before} lights`);
  for (const part of [h.facade, h.upper, h.roof, h.flowers, ...[...h.areas.values()].flat()]) part.visible = false;
  assert.equal(lit(h), before);
  assert.equal(h.porch.parent, h.root, 'the porch lamp is lit from the root, tour.js moves it with the facade');
});

test('every room, with its hidden clover, can be left out while the house is closed', t => {
  const h = house(t);
  assert.deepEqual([...h.areas.keys()].sort(), ['classroom', 'kitchen', 'living', 'office']); // the stair hall carries part of the outer shell
  const inRoom = o => { for (let n = o; n; n = n.parent) for (const parts of h.areas.values()) if (parts.includes(n)) return true; return false; };
  for (const id of CLOVER_ROOMS) assert.ok(inRoom(h.collectibles.get(id)), id + ' clover');
  // what the garden view needs stays outside the rooms
  for (const part of [h.facade, h.upper, h.roof, h.door, h.heroClover]) assert.equal(inRoom(part), false);
  const outside = h.hotspots.filter(s => !inRoom(s.root)).map(s => s.id);
  assert.deepEqual(outside, ['meet'], 'only the big clover is pickable from the garden');
});

test('pictures are decoded off the main thread and reach the GPU one per frame', async () => {
  const src = await readFile(root + 'tour/textures.js', 'utf8');
  assert.match(src, /createImageBitmap\(await r\.blob\(\), BITMAP\)/);
  assert.match(src, /renderer\.initTexture\?\.\(t\)/);
  assert.match(src, /if \(uploads\.length\) requestAnimationFrame\(pump\)/);
  assert.match(src, /if \(!globalThis\.__introOpening\) \{/, 'none while the intro opens');
});

test('a cached copy of one tour file from another release cannot stop the house from loading', async () => {
  // 2026-10-12: tour.js imported a new name from textures.js. Beside a cached older textures.js the module graph
  // failed to link, nothing ran, and after the 6 s guard the page had no house.
  const tour = await readFile(root + 'tour/tour.js', 'utf8'), textures = await readFile(root + 'tour/textures.js', 'utf8');
  assert.match(tour, /import \{makeTextures, FONT\} from '\.\/textures\.js';/, 'only the names every release of textures.js has had');
  assert.match(textures, /export function sendPictures\(\) \{\}/, 'the release that imported it may still be cached');
  // and when the module is merely slow, the guard's verdict is withdrawn
  assert.match(tour, /classList\.add\('js-ready'\);[^\n]*\n[^\n]*\n\s*document\.documentElement\.classList\.remove\('static'\); document\.body\.classList\.remove\('no-webgl'\);/);
});

test('the house holds still while the loading intro opens onto it, and no longer than that', async () => {
  const tour = await readFile(root + 'tour/tour.js', 'utf8'), intro = await readFile(root + 'tour/intro.js', 'utf8'), css = await readFile(root + 'tour/tour.css', 'utf8');
  assert.match(tour, /window\.__introOpening && !heldAt\.redraw && scrollY === heldAt\.y && performance\.now\(\) - heldAt\.time < 2000/);
  assert.match(tour, /renderer\.setSize\(w, h, false\); heldAt\.redraw = true;/, 'a resize empties the canvas, so it is drawn again even while held');
  assert.match(intro, /window\.__introOpening = true;/);
  assert.match(intro, /classList\.add\('gone'\);[^\n]*window\.__introOpening = false;/);
  assert.match(css, /\.intro-veil\{[^}]*will-change:transform,opacity\}/);
});
