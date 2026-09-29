import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../../mediral/js/letter.js', import.meta.url), 'utf8');
const {createLetterMotion} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const OPEN = {
  '--letter-y': '0px',
  '--letter-turn': '0deg',
  '--letter-fold': '0deg',
  '--letter-fold-shade': '0',
  '--letter-sticker-y': '0px',
  '--letter-sticker-turn': '-12deg',
  '--letter-sticker-scale': '1',
  '--letter-sticker-opacity': '1',
  '--letter-photo-y': '0px',
  '--letter-photo-turn': '-2deg',
  '--letter-photo-opacity': '1',
};

function fixture({letter = true, photo = true, height = 800} = {}) {
  const view = {innerHeight: height};
  const layout = {letter: height * 1.03, photo: height * 1.03};
  const calls = [];
  const values = new Map();
  const anchor = name => ({getBoundingClientRect() { calls.push(`read:${name}`); return {top: layout[name]}; }});
  const anchors = {'[data-letter-anchor]': letter ? anchor('letter') : null, '[data-photo-anchor]': photo ? anchor('photo') : null};
  const element = {
    ownerDocument: {defaultView: view},
    querySelector: selector => anchors[selector],
    style: {setProperty(name, value) { calls.push(`write:${name}`); values.set(name, value); }},
  };
  const motion = createLetterMotion({element});
  return {motion, layout, view, calls, values, pose: () => Object.fromEntries(values),
    move(letterTop, photoTop = letterTop) {
      Object.assign(layout, {letter: letterTop, photo: photoTop});
      motion.render(motion.read());
    }};
}

test('read snapshots only stable anchors; render consumes the snapshot without another layout read', () => {
  const f = fixture();
  const frame = f.motion.read();
  assert.deepEqual(f.calls, ['read:letter', 'read:photo']);
  assert.equal(f.values.size, 0);
  f.layout.letter = f.layout.photo = -800;
  f.calls.length = 0;
  f.motion.render(frame);
  assert.ok(f.calls.every(call => call.startsWith('write:')));
  assert.equal(f.values.get('--letter-y'), '36px', 'The measured frame does not change under a later layout');
  assert.equal(f.values.get('--letter-photo-y'), '-120px');
});

test('entry begins folded and translated, then paper, sticker and photo settle at their own reading boundaries', () => {
  const f = fixture();
  f.move(800 * 1.03);
  assert.equal(f.values.get('--letter-y'), '36px');
  assert.equal(f.values.get('--letter-turn'), '-3deg');
  assert.equal(f.values.get('--letter-fold'), '85deg');
  assert.equal(f.values.get('--letter-fold-shade'), '0.85');
  assert.equal(f.values.get('--letter-photo-y'), '-120px');
  assert.equal(f.values.get('--letter-photo-opacity'), '0.15');
  f.move(800 * .85, 800 * .6);
  assert.equal(f.values.get('--letter-sticker-y'), '-50px');
  assert.equal(f.values.get('--letter-sticker-turn'), '20deg');
  assert.equal(f.values.get('--letter-sticker-scale'), '1.2');
  assert.equal(f.values.get('--letter-sticker-opacity'), '0');
  assert.equal(f.values.get('--letter-photo-y'), '0px');
  f.move(800 * .52, 800 * .6);
  assert.equal(f.values.get('--letter-fold'), '0deg');
  assert.equal(f.values.get('--letter-fold-shade'), '0');
  assert.equal(f.values.get('--letter-y'), '0px');
  f.move(800 * .5, 800 * .6);
  assert.deepEqual(f.pose(), OPEN);
});

test('the attached photograph progresses independently from the already-open letter', () => {
  const f = fixture();
  f.move(0, 800 * (.6 + 1.03) / 2);
  assert.equal(f.values.get('--letter-fold'), '0deg');
  assert.equal(f.values.get('--letter-sticker-opacity'), '1');
  assert.equal(f.values.get('--letter-photo-y'), '-60px');
  assert.equal(f.values.get('--letter-photo-turn'), '0.5deg');
  assert.equal(f.values.get('--letter-photo-opacity'), '0.575');
});

test('reverse scrolling restores the same pose and overscroll cannot overshoot either end', () => {
  const f = fixture();
  f.move(540, 680);
  const middle = f.pose();
  f.move(-900);
  assert.deepEqual(f.pose(), OPEN);
  f.move(3000);
  assert.equal(f.values.get('--letter-y'), '36px');
  assert.equal(f.values.get('--letter-fold'), '85deg');
  assert.equal(f.values.get('--letter-sticker-opacity'), '0');
  assert.equal(f.values.get('--letter-photo-opacity'), '0.15');
  f.move(540, 680);
  assert.deepEqual(f.pose(), middle);
});

test('settled mode restores the full reading state, including after motion has already started', () => {
  const f = fixture();
  f.move(900);
  f.motion.render(f.motion.read(), {settled: true});
  assert.deepEqual(f.pose(), OPEN);
  f.motion.render(null, {settled: true});
  assert.deepEqual(f.pose(), OPEN);
});

test('viewport resizing recomputes the same pose for the same viewport-relative positions', () => {
  const f = fixture();
  f.move(540, 680);
  const before = f.pose();
  f.view.innerHeight = 400;
  f.move(270, 340);
  assert.deepEqual(f.pose(), before);
});

test('absent or invalid layout leaves content readable and never writes NaN or infinity', () => {
  const empty = createLetterMotion();
  assert.doesNotThrow(() => empty.render(empty.read()));
  const f = fixture({letter: false, photo: false});
  f.motion.render(f.motion.read());
  assert.deepEqual(f.pose(), OPEN);
  for (const height of [0, -1, NaN, Infinity, null, undefined]) {
    f.motion.render({height, letterTop: 900, photoTop: 900});
    assert.deepEqual(f.pose(), OPEN);
  }
  f.motion.render({height: 800, letterTop: NaN, photoTop: Infinity});
  assert.deepEqual(f.pose(), OPEN);
  f.motion.render();
  assert.deepEqual(f.pose(), OPEN);
});

test('one missing anchor settles its own content without preventing the other motion', () => {
  const f = fixture({photo: false});
  f.move(900);
  assert.equal(f.values.get('--letter-fold'), '85deg');
  assert.equal(f.values.get('--letter-photo-y'), '0px');
  assert.equal(f.values.get('--letter-photo-opacity'), '1');
});
