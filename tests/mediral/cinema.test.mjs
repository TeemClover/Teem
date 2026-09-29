import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// The engine and score are imported unchanged. Only browser layout/media boundaries are adapted.
const enginePath = fileURLToPath(new URL('../../mediral/js/cinema.js', import.meta.url));
const scorePath = fileURLToPath(new URL('../../mediral/js/score.js', import.meta.url));
const importSource = path => import(`data:text/javascript;base64,${Buffer.from(readFileSync(path, 'utf8')).toString('base64')}`);
const {createCinema, resolveTrack} = await importSource(enginePath);
const {score: actualScore} = await importSource(scorePath);

class Style {
  values = new Map();
  setProperty(key, value) { this.values.set(key, String(value)); }
  getPropertyValue(key) { return this.values.get(key) || ''; }
  removeProperty(key) { this.values.delete(key); }
}
class Element {
  constructor(tag = 'div', dataset = {}) {
    this.tagName = tag.toUpperCase();
    this.dataset = dataset;
    this.children = [];
    this.style = new Style();
    this.offsetLeft = this.offsetTop = 0;
    this.offsetWidth = this.offsetHeight = 100;
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = {
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name),
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
    };
    this.srcWrites = [];
    this.inert = false;
  }
  append(child) { child.parentElement = child.offsetParent = this; this.children.push(child); return child; }
  get src() { return this._src; }
  set src(value) { this._src = value; this.srcWrites.push(value); }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { if (name === 'data-src') delete this.dataset.src; else this.attributes.delete(name); }
  closest(selector) {
    assert.equal(selector, '[data-layer]');
    for (let node = this; node; node = node.parentElement) if ('layer' in node.dataset) return node;
    return null;
  }
  querySelectorAll(selector) {
    const matches = node => selector === '[data-layer]' ? 'layer' in node.dataset
      : selector === 'img[data-src]' ? node.tagName === 'IMG' && 'src' in node.dataset
      : selector === '[data-mark]' ? 'mark' in node.dataset : false;
    const found = [];
    const walk = node => node.children.forEach(child => { if (matches(child)) found.push(child); walk(child); });
    walk(this);
    return found;
  }
}
function fixture({tracks = {}, plan = null, definitions = [{name: 'fx'}], at = 0, end = 20} = {}) {
  let T = at;
  const section = new Element();
  const view = section.append(new Element());
  view.clientWidth = 1000;
  view.clientHeight = 800;
  const clock = {clientHeight: 800};
  const layers = new Map(), images = new Map();
  for (const definition of definitions) {
    const parent = definition.parent ? layers.get(definition.parent) : view;
    assert.ok(parent, 'Define parent layers before children');
    const layer = parent.append(new Element('div', {layer: definition.name}));
    if (definition.inert) layer.attributes.set('data-inert-hidden', '');
    if (definition.decorative) layer.attributes.set('aria-hidden', 'true');
    layers.set(definition.name, layer);
    if (definition.image) {
      // An unlabelled wrapper must not create a new loading owner.
      const holder = layer.append(new Element('span'));
      const image = holder.append(new Element('img', {src: `${definition.name}.webp`}));
      images.set(definition.name, image);
    }
  }
  section.getBoundingClientRect = () => ({top: -T * clock.clientHeight});
  const cinema = createCinema({section, view, clock, score: plan || (() => ({end, chapters: [], tracks}))});
  return {cinema, section, view, clock, layers, images,
    move(next) { T = next; cinema.render(); },
    measure() { cinema.measure(); },
  };
}

test('the real rinse wipe and foam restore the same pose after forward and reverse trips', () => {
  const f = fixture({plan: actualScore, definitions: [{name: 'cl'}, {name: 'fx.foam'}], at: 1});
  const shot = f.layers.get('cl'), foam = f.layers.get('fx.foam');
  foam.style.setProperty('--layout-token', '0.7');
  f.measure();
  const pose = () => ({edge: shot.style.getPropertyValue('--edge'), tilt: shot.style.getPropertyValue('--tilt'), foam: foam.style.transform, opacity: foam.style.opacity});
  const first = pose();
  assert.notEqual(first.edge, '', 'The wipe edge is written from its first frame');
  f.move(2.4); f.move(0.2); f.move(5); f.move(1);
  assert.deepEqual(pose(), first);
  assert.equal(foam.style.getPropertyValue('--layout-token'), '0.7', 'Do not delete unrelated authored CSS variables');
  f.move(0);
  assert.equal(shot.style.getPropertyValue('--edge'), String(actualScore({tall: false, W: 1000, H: 800}).tracks.cl[0][1]['--edge']),
    'Before the wipe starts, the CL scene is held fully below its edge');
});

test('a custom property holds its last value after its interval and its first value before it', () => {
  const f = fixture({tracks: {fx: [[1, {'--wipe': 0}], [2, {'--wipe': 1}], [3, {}], [4, {'--wipe': 0.5}]]}});
  f.measure();
  const el = f.layers.get('fx');
  const at = T => { f.move(T); return el.style.getPropertyValue('--wipe'); };
  assert.equal(at(0), '0');
  assert.equal(at(2), '1');
  assert.equal(at(3), '1', 'A keyframe without the property holds its last value');
  assert.equal(at(3.5), '0.75');
  assert.equal(at(0.5), '0', 'An explicit zero is a real pose, restored after a round trip');
  assert.equal(at(3), '1');
});

test('match adds viewport offsets after matching the target centre and keeps matched scale', () => {
  const [pose] = resolveTrack([[0, {match: 'row', dx: 3, dy: -2, s: 0.9}]],
    {cx: 400, cy: 500, w: 100, h: 100}, {W: 1000, H: 800},
    {row: {cx: 600, cy: 700, w: 100, h: 200}});
  assert.equal(pose.tx, 230);
  assert.equal(pose.ty, 184);
  assert.equal(pose.s, 1.8);
});

test('the real hero-to-row score lifts non-CL packs two viewport percent above their matched row', () => {
  const frames = actualScore({tall: false, W: 1000, H: 800}).tracks['hero.AC'];
  const track = resolveTrack(frames, {cx: 200, cy: 250, w: 50, h: 100}, {W: 1000, H: 800},
    {'row.AC': {cx: 500, cy: 600, w: 40, h: 80}});
  // The row hold is the matched pose without an offset; the lift is the next keyframe, which adds dy -2.
  const liftAt = frames.findIndex(([, p]) => p.match === 'row.AC' && p.dy === -2);
  const row = track[liftAt - 1], lifted = track[liftAt];
  assert.equal(frames[liftAt - 1][1].dy, undefined);
  assert.equal(lifted.tx, row.tx);
  assert.equal(lifted.ty, row.ty - 16);
  assert.ok(Math.abs(lifted.s - 0.72) < 1e-10);
});

test('ordinary home offsets and absolute positions retain their existing contract', () => {
  const home = {cx: 400, cy: 500, w: 100, h: 100}, size = {W: 1000, H: 800};
  const [offset, absolute, missingMatch] = resolveTrack([
    [0, {dx: 3, dy: -2}], [1, {x: 60, y: 75, dx: 3, dy: -2}],
    [2, {match: 'missing', dx: 3, dy: -2}],
  ], home, size);
  assert.deepEqual([offset.tx, offset.ty], [30, -16]);
  assert.deepEqual([absolute.tx, absolute.ty], [200, 100], 'Explicit x/y still take priority without match');
  assert.deepEqual([missingMatch.tx, missingMatch.ty], [30, -16]);
});

const windowed = [[5, {o: 0}], [6, {o: 1}], [7, {o: 0}]];
test('deferred images attach at the leading preload boundary, not earlier, and only once', () => {
  const f = fixture({tracks: {fx: windowed}, definitions: [{name: 'fx', image: true}], at: 3.74});
  f.measure();
  const img = f.images.get('fx');
  assert.equal(img.src, undefined);
  f.move(3.75);
  assert.equal(img.src, 'fx.webp');
  f.move(6); f.move(2); f.move(6);
  assert.deepEqual(img.srcWrites, ['fx.webp']);
});

test('a fresh late jump skips an expired layer, but reversing near its trailing window loads it', () => {
  const f = fixture({tracks: {fx: windowed}, definitions: [{name: 'fx', image: true}], at: 8.26});
  f.measure();
  const img = f.images.get('fx');
  assert.equal(f.layers.get('fx').style.opacity, '0');
  assert.equal(img.src, undefined, 'A skipped past chapter must not activate its deferred URL');
  f.move(8.25);
  assert.equal(img.src, 'fx.webp', 'Reverse scrolling gets the same 1.25-screen lead');
});

test('a visible final hold still loads after its last keyframe timestamp', () => {
  const f = fixture({tracks: {fx: [[5, {o: 0}], [6, {o: 1}]]}, definitions: [{name: 'fx', image: true}], at: 18});
  f.measure();
  assert.equal(f.layers.get('fx').style.opacity, '1');
  assert.equal(f.images.get('fx').src, 'fx.webp', 'A two-sided window must not starve a still-visible final pose');
});

test('a loading parent cannot activate a child layer image before the child window', () => {
  const f = fixture({tracks: {parent: [[0, {}], [20, {}]], child: windowed}, definitions: [
    {name: 'parent', image: true}, {name: 'child', parent: 'parent', image: true},
  ]});
  f.measure();
  assert.equal(f.images.get('parent').src, 'parent.webp', 'Unlabelled wrappers retain their nearest layer owner');
  assert.equal(f.images.get('child').src, undefined);
  f.move(3.75);
  assert.deepEqual(f.images.get('child').srcWrites, ['child.webp']);
});

test('an entirely invisible track does not request its image', () => {
  const f = fixture({tracks: {fx: [[0, {o: 0}], [10, {o: 0}]]}, definitions: [{name: 'fx', image: true}], at: 10});
  f.measure();
  assert.equal(f.images.get('fx').src, undefined);
});

test('flow fallback clears poses, releases inert content and hands every picture to native lazy loading', () => {
  const f = fixture({tracks: {fx: [[0, {'--wipe': 0, o: 0}], [10, {'--wipe': 1, o: 1}]],
    future: [[10, {o: 0}], [11, {o: 1}], [12, {o: 0}]]}, definitions: [
    {name: 'fx', inert: true, decorative: true}, {name: 'future', parent: 'fx', image: true},
  ]});
  f.measure();
  const el = f.layers.get('fx');
  assert.equal(el.inert, true);
  assert.equal(el.style.getPropertyValue('--wipe'), '0');
  f.cinema.setFlow(true);
  assert.equal(el.inert, false);
  assert.equal(el.style.transform, '');
  assert.equal(el.style.opacity, '');
  assert.equal(el.style.visibility, '');
  assert.equal(el.style.getPropertyValue('--wipe'), '');
  assert.equal(f.images.get('future').loading, 'lazy');
  assert.equal(f.images.get('future').src, 'future.webp');
  f.cinema.setFlow(false);
  assert.equal(el.style.getPropertyValue('--wipe'), '0');
  assert.equal(el.inert, true);
});

test('a layer inside a faded parent is not live: no transform, no promotion, and the cinema gates pointer events', () => {
  const f = fixture({tracks: {shot: [[0, {o: 0}], [1, {}, 'step'], [2, {}], [2.01, {o: 0}, 'step']], art: [[0, {dx: 5}], [5, {dx: 5}]]},
    definitions: [{name: 'shot'}, {name: 'art', parent: 'shot'}]});
  f.measure();
  const art = f.layers.get('art');
  assert.ok(f.section.classes.has('is-running'), 'CSS may gate pointer events only while the engine owns poses');
  assert.equal(art.style.transform, 'none', 'Hidden with its shot: out of the compositor');
  assert.ok(!art.classes.has('is-live'));
  f.move(1.5);
  assert.equal(art.style.transform, 'translate(50px,0px)');
  assert.ok(art.classes.has('is-live'));
  f.move(3);
  assert.equal(art.style.transform, 'none');
  f.cinema.setFlow(true);
  assert.ok(!f.section.classes.has('is-running'));
});

test('flow keeps decorative art deferred, so returning to motion still respects each preload window', () => {
  const f = fixture({tracks: {deco: [[8, {o: 0}], [9, {}], [10, {o: 0}]], pack: [[8, {o: 0}], [9, {}]]},
    definitions: [{name: 'deco', decorative: true, image: true}, {name: 'pack', image: true}]});
  f.measure();
  f.cinema.setFlow(true);
  assert.equal(f.images.get('pack').src, 'pack.webp', 'Flow shows packs');
  assert.equal(f.images.get('deco').src, undefined, 'Flow hides decorative art, so it does not load it');
  f.cinema.setFlow(false);
  f.move(7);
  assert.equal(f.images.get('deco').src, 'deco.webp', 'Back in motion, its window still applies');
});

test('a child layer loads no earlier than the window of the layer around it', () => {
  const f = fixture({tracks: {shot: [[10, {o: 0}], [11, {}], [12, {}], [12.01, {o: 0}, 'step']], art: [[0, {}], [20, {}]]},
    definitions: [{name: 'shot'}, {name: 'art', parent: 'shot', image: true}], at: 2});
  f.measure();
  assert.equal(f.images.get('art').src, undefined, 'Visible on its own track, but its shot is hidden until 10');
  f.move(15);
  assert.equal(f.images.get('art').src, undefined, 'Nor after its shot has gone');
  f.move(9);
  assert.equal(f.images.get('art').src, 'art.webp');
});

test('focus inside a control that fades out moves to the story, not to nowhere', () => {
  const f = fixture({tracks: {cta: [[0, {}], [1, {o: 0}]]}, definitions: [{name: 'cta', inert: true}]});
  const cta = f.layers.get('cta');
  const button = {};
  cta.contains = node => node === button;
  const previous = globalThis.document;
  globalThis.document = {activeElement: button};
  let focused = null;
  f.section.focus = options => { focused = options; };
  try {
    f.measure();
    assert.equal(cta.inert, false);
    f.move(1);
    assert.equal(cta.inert, true);
    assert.deepEqual(focused, {preventScroll: true});
  } finally {
    globalThis.document = previous;
  }
});


test('browser chrome can reveal more artwork without advancing the story or moving its chapter anchors', () => {
  const f = fixture({plan: actualScore, definitions: [{name: 'po'}, {name: 'po.title'}], at: 13.65});
  const mark = f.section.append(new Element('span', {mark: 'PO'}));
  f.measure();
  assert.equal(mark.style.top, `${12.09 * 800}px`);
  const before = {time: f.cinema.time(), top: mark.style.top, pose: f.layers.get('po.title').style.transform};
  f.view.clientHeight = 900;
  f.measure();
  assert.equal(f.cinema.state.layout.H, 800);
  assert.deepEqual({time: f.cinema.time(), top: mark.style.top, pose: f.layers.get('po.title').style.transform}, before);
  f.view.clientHeight = 800;
  f.measure();
  assert.equal(f.cinema.time(), before.time);
});
