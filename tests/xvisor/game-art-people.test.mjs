import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneArt, getCharacterTraits } from '../../xvisor/quest/game-art.js';
import { createPerson, getPersonAppearance } from '../../xvisor/quest/game-people.js';
import { paintStoryPortrait } from '../../xvisor/quest/game-portrait.js';

const palette = Object.freeze({ skin: '#dda47e', hair: '#493d35', shirt: '#8aafa0', accent: '#f1d789', pants: '#63544b', hairStyle: 'short', clothing: 'polo', glasses: false, accessory: 'none', faceShape: 'oval' });
function recordingBrush() {
  const calls = [];
  const context = new Proxy({}, {
    set(target, property, value) { calls.push(['set', property, value && typeof value === 'object' ? '<paint>' : value]); target[property] = value; return true; },
    get(target, property) {
      if (property in target) return target[property];
      if (String(property).startsWith('create')) return (...args) => {
        calls.push([property, ...args]);
        return { addColorStop: (...stops) => calls.push(['colorStop', ...stops]) };
      };
      return (...args) => { calls.push([property, ...args]); };
    }
  });
  return { context, calls };
}
function drawing(appearance, options = {}) {
  const brush = recordingBrush();
  createSceneArt(brush.context).character(14, 86, appearance, { direction: 'right', pose: 'idle', band: false, ...options });
  return brush.calls;
}

test('all eight explicit hair styles produce different drawn geometry, standing and seated', () => {
  const styles = ['short', 'long', 'ponytail', 'bob', 'bun', 'curly', 'spiky', 'buzz'];
  for (const seated of [false, true]) {
    const drawings = styles.map(hairStyle => JSON.stringify(drawing({ ...palette, hairStyle }, { seated })));
    assert.equal(new Set(drawings).size, styles.length, `seated=${seated}`);
    for (const image of drawings) assert.doesNotMatch(image, /NaN|null/);
  }
});

test('clothing silhouettes, trousers and face accessories reach the actual drawing commands', () => {
  const styles = ['tee', 'polo', 'shirt', 'cardigan', 'hoodie', 'dress'];
  for (const seated of [false, true]) {
    assert.equal(new Set(styles.map(clothing => JSON.stringify(drawing({ ...palette, clothing }, { seated })))).size, styles.length);
    assert.ok(drawing(palette, { seated }).some(call => call[0] === 'set' && call[2] === palette.pants));
  }
  assert.equal(new Set(['none', 'earrings', 'hairclip', 'headband', 'scarf'].map(accessory => JSON.stringify(drawing({ ...palette, accessory })))).size, 5);
  assert.notDeepEqual(drawing({ ...palette, faceShape: 'round' }), drawing(palette));
  assert.equal(drawing({ ...palette, freckles: true }).filter(call => call[0] === 'ellipse' && call[3] === .4 && call[4] === .4).length, 6);
});

test('explicit no-glasses cannot be overridden by the old colour hash', () => {
  for (const shirt of ['#4db783', '#ef8078', '#5fa9d7', '#e4b94e', '#8d78c7']) {
    const appearance = { ...palette, shirt, glasses: false };
    assert.equal(getCharacterTraits(appearance).glasses, false);
    assert.deepEqual(drawing(appearance), drawing({ ...appearance, glasses: 'none' }));
    assert.ok(!drawing(appearance).some(call => call[0] === 'set' && ['#594d3d', '#262421'].includes(call[2])));
  }
  assert.notDeepEqual(drawing({ ...palette, glasses: 'round' }), drawing({ ...palette, glasses: 'square' }));
  assert.deepEqual(drawing({ ...palette, glasses: true }), drawing({ ...palette, glasses: 'square' }));
});

test('sequential generated cohorts retain visible variety and deterministic appearance across reload', () => {
  for (const initialSeed of [1, 8, 93]) {
    let seed = initialSeed;
    const cohort = [];
    for (let index = 1; index <= 48; index++) {
      const result = createPerson({ seed, index, usedNames: cohort.map(person => person.name) });
      seed = result.nextSeed;
      cohort.push(result.person);
    }
    const appearances = cohort.map(getPersonAppearance);
    assert.ok(new Set(appearances.map(item => item.hairStyle)).size >= 7, `hair seed ${initialSeed}`);
    assert.ok(new Set(appearances.map(item => item.clothing)).size >= 5, `clothing seed ${initialSeed}`);
    assert.ok(appearances.filter(item => item.glasses === false).length >= 16, `glasses seed ${initialSeed}`);
    assert.ok(new Set(appearances.map(item => item.hair)).size >= 6);
    const traces = appearances.map(appearance => JSON.stringify(drawing(appearance)));
    assert.equal(new Set(traces).size, cohort.length);
    assert.deepEqual(JSON.parse(JSON.stringify(cohort)).map(person => JSON.stringify(drawing(getPersonAppearance(person)))), traces);
  }
});

test('the same customer and promoted teammate render the exact portrait figure used in the world', () => {
  const customer = { id: 'customer-1', personId: 'shared-person', name: 'มุก', appearance: { ...palette, hairStyle: 'long', clothing: 'cardigan', glasses: 'round' } };
  const teammate = { ...customer, id: 'team-1' };
  assert.deepEqual(getPersonAppearance(customer), getPersonAppearance(teammate));
  const original = JSON.stringify(customer);
  const brush = recordingBrush();
  const canvas = { dataset: {}, getContext: () => brush.context };
  paintStoryPortrait(canvas, { portrait: 'customer' }, customer);
  const shadowStart = brush.calls.findIndex(call => call[0] === 'translate' && call[1] === 30 && call[2] === 87) - 1;
  assert.ok(shadowStart > 0);
  assert.deepEqual(brush.calls.slice(shadowStart, -1), drawing(getPersonAppearance(customer)));
  assert.equal(JSON.stringify(customer), original);
  const count = brush.calls.length;
  paintStoryPortrait(canvas, { portrait: 'customer' }, teammate);
  assert.equal(brush.calls.length, count, 'same identity reuses the same portrait without repainting');
});
