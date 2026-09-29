import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {score, SHOTS} from '../../mediral/js/score.js';
import {resolveTrack, sample} from '../../mediral/js/cinema.js';

const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url)));
const cl = routine.steps.find(step => step.id === 'CL');
const layouts = [
  {tall: true, W: 320, H: 640},
  {tall: true, W: 390, H: 844},
  {tall: false, W: 1280, H: 800},
];
function poses(layout) {
  const tracks = score(layout).tracks;
  const home = {cx: layout.W / 2, cy: layout.H * .2, w: 200, h: 60};
  const resolved = Object.fromEntries(Object.entries(tracks)
    .filter(([key]) => ['cl.word1', 'cl.word2', 'cl.foot', 'cl.botanical-label', 'fx.foam'].includes(key))
    .map(([key, frames]) => [key, resolveTrack(frames, home, layout)]));
  return (key, T) => sample(resolved[key], T);
}

test('CL uses the gentle rinse phrase in the title and static-flow markup', () => {
  assert.equal(cl.headline, 'ล้างวันนี้ออกอย่างอ่อนโยน');
  assert.deepEqual(cl.scene.headline, ['ล้างวันนี้', 'ออกอย่างอ่อนโยน']);
  const html = SHOTS.CL(cl, path => path);
  assert.match(html, /data-layer="cl\.word1">ล้างวันนี้<\/span>/);
  assert.match(html, /data-layer="cl\.word2">ออกอย่างอ่อนโยน<\/span>/);
  assert.ok(html.indexOf('>ล้างวันนี้</span>') < html.indexOf('>ออกอย่างอ่อนโยน</span>'));
});

test('the rinse promise dissolves under foam and reveals its gentle answer without a snap', () => {
  for (const layout of layouts) {
    const at = poses(layout);
    assert.equal(at('cl.word1', 1.8).o, 1);
    assert.equal(at('cl.word2', 1.8).o, 0);
    assert.equal(at('cl.word2', 2.38).o, 1, 'The revealed word remains whole after the foam passes');
    assert.equal(at('cl.word1', 2.38).o, 0);
    assert.ok(at('cl.word1', 2.11).o > 0 && at('cl.word1', 2.11).o < 1, 'The first phrase dissolves instead of snapping off');
    assert.ok(at('cl.word2', 2.28).o > 0 && at('cl.word2', 2.28).o < 1, 'The answer eases into the rinsed space instead of snapping on');
    assert.equal(at('fx.foam', 2.38).o, 0, 'The foam has cleared for the composed reading hold');
    let lastOpacity = 0;
    for (let n = 1680; n <= 2380; n++) {
      const T = n / 1000, first = at('cl.word1', T).o, second = at('cl.word2', T).o;
      assert.equal(first * second, 0, `Only one word may occupy the title at T${T}`);
      assert.ok(second >= lastOpacity, 'The answer reveals continuously behind the foam');
      assert.ok(second - lastOpacity < .03, 'No one-frame appearance');
      lastOpacity = second;
    }
    assert.equal(lastOpacity, 1);
  }
});

test('CL finishes its promise before the botanical names and product foot appear', () => {
  for (const layout of layouts) {
    const at = poses(layout);
    for (let n = 1300; n <= 3100; n++) {
      const T = n / 1000;
      const titleOpacity = Math.max(at('cl.word1', T).o, at('cl.word2', T).o);
      for (const key of ['cl.botanical-label', 'cl.foot']) {
        assert.ok(titleOpacity === 0 || at(key, T).o === 0,
          `${key} must not compete with the title at T${T}, ${layout.W}px`);
      }
    }
    assert.equal(at('cl.botanical-label', 2.7).o, 1);
    assert.equal(at('cl.foot', 2.7).o, 1, 'The product link still has a composed reading hold');
  }
});
