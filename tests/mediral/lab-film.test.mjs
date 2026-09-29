import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Run the actual decorative-media controller, with only browser/media events adapted. The video
// really has a zero-sized box when hidden; its poster frame remains measurable independently.
const source = readFileSync(new URL('../../mediral/js/lab-film.js', import.meta.url), 'utf8');
const {initLabFilm} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ready = true, reduce = false, save = false, observer = true, innerFrame = false} = {}) {
  const classes = new Set();
  let rect = {top: 900, bottom: 1100, left: 0, right: 400, width: 400, height: 200};
  const zero = {top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0};
  const video = Object.assign(new EventTarget(), {
    paused: true, controls: false, hidden: true, attributes: {}, currentTime: 0, loop: true,
    dataset: {src: 'assets/motion/lab-film-10s.mp4'},
    playCalls: 0, pauseCalls: 0, loadCalls: 0,
    getBoundingClientRect() { return this.hidden ? zero : rect; },
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    play() {
      this.playCalls++;
      if (this.playImpl) return this.playImpl();
      this.paused = false;
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls++;
      const wasPaused = this.paused;
      this.paused = true;
      if (!wasPaused) this.dispatchEvent(new Event('pause'));
    },
    load() { this.loadCalls++; this.currentTime = 0; },
  });
  const reduced = Object.assign(new EventTarget(), {matches: reduce});
  const connection = Object.assign(new EventTarget(), {saveData: save});
  const win = Object.assign(new EventTarget(), {
    innerWidth: 400, innerHeight: 800,
    matchMedia: () => reduced, navigator: {connection},
  });
  let io;
  if (observer) win.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; io = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  const doc = Object.assign(new EventTarget(), {hidden: false, defaultView: win});
  const frame = {getBoundingClientRect: () => rect};
  const section = {
    ownerDocument: doc, dataset: {filmReady: String(ready)},
    matches: selector => selector === '[data-lab-film]',
    getBoundingClientRect: () => rect,
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
    },
    querySelector(selector) {
      if (selector === '[data-film-video]') return video;
      if (selector === '[data-film-frame]') return innerFrame ? frame : null;
      return null; // No button, duration label or status text exists in this scene.
    },
  };
  doc.querySelector = () => section;
  return {
    doc, win, reduced, connection, video, section, frame, classes,
    get io() { return io; },
    inView(visible = true) {
      rect = visible
        ? {top: 100, bottom: 300, left: 0, right: 400, width: 400, height: 200}
        : {top: 900, bottom: 1100, left: 0, right: 400, width: 400, height: 200};
      if (io && !io.disconnected) {
        const measurable = io.target.getBoundingClientRect().height > 0;
        io.callback([{target: io.target, isIntersecting: visible && measurable, intersectionRatio: visible && measurable ? 1 : 0}]);
      } else win.dispatchEvent(new Event('scroll'));
    },
    end() {
      video.currentTime = 10;
      video.paused = true;
      video.dispatchEvent(new Event('pause'));
      video.dispatchEvent(new Event('ended'));
    },
  };
}

function mount(t, options) {
  const f = fixture(options);
  const api = initLabFilm(f.doc);
  t.after(() => api.dispose());
  return {...f, api};
}
const activate = async f => { f.inView(); f.api.setActive(true); await tick(); };

test('pending media remains a poster, without a source or playback work', async () => {
  const f = fixture({ready: false});
  const api = initLabFilm(f.doc);
  f.inView(); api.setActive(true); await tick();
  assert.equal(f.io, undefined);
  assert.equal(f.video.attributes.src, undefined);
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.video.loadCalls, 0);
  assert.equal(f.video.hidden, true);
  assert.equal(f.video.controls, false);
  assert.doesNotThrow(() => api.dispose());
});

test('pending media can be enabled later, but still waits for its visible owning beat', async t => {
  const f = fixture({ready: false});
  const inert = initLabFilm(f.doc);
  f.section.dataset.filmReady = 'true';
  const api = initLabFilm(f.doc);
  t.after(() => api.dispose());
  assert.notEqual(api, inert);
  f.inView(); await tick();
  assert.equal(f.video.attributes.src, undefined);
  assert.equal(f.video.playCalls, 0);
  api.setActive(true); await tick();
  assert.equal(f.video.paused, false);
});

test('one instance needs no button and preserves muted inline, deferred-load media', t => {
  assert.equal(initLabFilm(null), null);
  const f = mount(t);
  assert.equal(initLabFilm(f.section), f.api);
  assert.equal(f.video.attributes.src, undefined);
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.video.loadCalls, 0);
  assert.equal(f.video.preload, 'none');
  assert.equal(f.video.muted, true);
  assert.equal(f.video.defaultMuted, true);
  assert.equal(f.video.playsInline, true);
  assert.equal(f.video.controls, false);
  assert.equal(f.video.attributes['aria-hidden'], 'true');
  assert.equal(f.video.tabIndex, -1);
});

for (const innerFrame of [false, true]) {
  test(`initial hidden video loads from the visible ${innerFrame ? 'inner poster frame' : 'container'}`, async t => {
    const f = mount(t, {innerFrame});
    assert.equal(f.video.getBoundingClientRect().height, 0);
    assert.equal(f.io.target, innerFrame ? f.frame : f.section);
    await activate(f);
    assert.equal(f.video.playCalls, 1);
    assert.equal(f.video.hidden, false);
    assert.equal(f.video.attributes.src, f.video.dataset.src);
  });
}

test('active beat, viewport and document visibility all gate playback', async t => {
  const f = mount(t);
  f.api.setActive(true); await tick();
  assert.equal(f.video.playCalls, 0, 'An active but offscreen beat does not load');
  f.inView(); await tick();
  assert.equal(f.video.paused, false);
  f.api.setActive(false);
  assert.equal(f.video.paused, true);
  f.inView(); await tick();
  assert.equal(f.video.playCalls, 1, 'A visible but inactive beat does not resume');
  f.api.setActive(true); await tick();
  f.inView(false);
  assert.equal(f.video.paused, true);
  f.inView(); await tick();
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.video.paused, true);
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange')); await tick();
  assert.equal(f.video.paused, false);
});

for (const [name, option] of [['reduced motion', {reduce: true}], ['data saving', {save: true}]]) {
  test(`${name} keeps the poster and does not request a video source`, async t => {
    const f = mount(t, option);
    await activate(f);
    f.api.setActive(false); f.api.setActive(true); f.inView(false); f.inView(); await tick();
    assert.equal(f.video.playCalls, 0);
    assert.equal(f.video.attributes.src, undefined);
    assert.equal(f.video.hidden, true);
    assert.equal(f.classes.has('is-still'), true);
  });
}

test('changing motion/data preferences stops playback and shows a poster; permission restoration resumes', async t => {
  const f = mount(t);
  await activate(f);
  f.video.currentTime = 3;
  f.reduced.matches = true; f.reduced.dispatchEvent(new Event('change'));
  assert.equal(f.video.paused, true);
  assert.equal(f.video.hidden, true);
  assert.equal(f.classes.has('is-still'), true);
  f.reduced.matches = false; f.reduced.dispatchEvent(new Event('change')); await tick();
  assert.equal(f.video.paused, false);
  assert.equal(f.video.hidden, false);
  assert.equal(f.video.currentTime, 3, 'Changing preference does not replay the beginning');
  f.connection.saveData = true; f.connection.dispatchEvent(new Event('change'));
  assert.equal(f.video.paused, true);
  assert.equal(f.video.hidden, true);
});

for (const [name, errorName, errorClass] of [['blocked autoplay', 'NotAllowedError', false], ['media failure', 'NotSupportedError', true]]) {
  test(`${name} settles silently on the poster, without repeated attempts`, async t => {
    const f = mount(t);
    f.video.playImpl = () => Promise.reject(Object.assign(new Error(name), {name: errorName}));
    await activate(f);
    assert.equal(f.video.hidden, true);
    assert.equal(f.classes.has('is-error'), errorClass);
    assert.equal(f.classes.has('is-still'), true);
    assert.equal(f.video.attributes.src, undefined, 'Release a source that will not be played');
    const calls = f.video.playCalls;
    f.inView(false); f.inView(); f.api.setActive(true); await tick();
    assert.equal(f.video.playCalls, calls);
  });

  test(`dispose/re-init recovers from ${name} while the old hidden video stays measurable through its frame`, async t => {
    const f = fixture();
    const old = initLabFilm(f.doc);
    f.video.playImpl = () => Promise.reject(Object.assign(new Error(name), {name: errorName}));
    f.inView(); old.setActive(true); await tick();
    assert.equal(f.video.hidden, true);
    old.dispose();
    assert.equal(f.classes.has('is-error'), false);
    f.video.playImpl = null;
    const current = initLabFilm(f.doc);
    t.after(() => current.dispose());
    current.setActive(true); await tick();
    assert.equal(f.video.playCalls, 2);
    assert.equal(f.video.hidden, false);
    assert.equal(f.video.paused, false);
  });
}

test('an asynchronous media error exposes a poster and stops the active pass', async t => {
  const f = mount(t);
  await activate(f);
  f.video.dispatchEvent(new Event('error'));
  assert.equal(f.video.paused, true);
  assert.equal(f.video.hidden, true);
  assert.equal(f.api.state.failed, true);
});

test('a late play promise cannot restart a film after its beat becomes inactive', async t => {
  const f = mount(t);
  let resolve;
  f.video.playImpl = () => new Promise(done => { resolve = done; });
  f.inView(); f.api.setActive(true); f.api.setActive(false);
  f.video.paused = false;
  resolve(); await tick();
  assert.equal(f.video.paused, true);
  assert.equal(f.classes.has('is-playing'), false);
});

test('a disposed instance cannot pause a new owner when its old play promise resolves', async t => {
  const f = fixture();
  let resolve;
  f.video.playImpl = () => new Promise(done => { resolve = done; });
  const old = initLabFilm(f.doc);
  f.inView(); old.setActive(true); old.dispose();
  f.video.playImpl = null;
  const current = initLabFilm(f.doc);
  t.after(() => current.dispose());
  current.setActive(true); await tick();
  assert.equal(f.video.paused, false);
  resolve(); await tick();
  assert.equal(f.video.paused, false);
});

test('a queued observer delivery from a disposed controller cannot pause the new owner', async t => {
  const f = fixture();
  const old = initLabFilm(f.doc);
  f.inView(); old.setActive(true); await tick();
  const staleObserver = f.io;
  old.dispose();
  const current = initLabFilm(f.doc);
  t.after(() => current.dispose());
  current.setActive(true); await tick();
  staleObserver.callback([{target: staleObserver.target, isIntersecting: false, intersectionRatio: 0}]);
  assert.equal(f.video.paused, false);
});

test('viewport fallback observes the poster box, and disposal releases the source and listeners', async t => {
  const f = mount(t, {observer: false});
  await activate(f);
  assert.equal(f.video.paused, false);
  f.inView(false);
  assert.equal(f.video.paused, true);
  f.api.dispose();
  assert.equal(f.video.attributes.src, undefined);
  assert.equal(f.video.hidden, true);
  const calls = f.video.playCalls;
  f.inView(); f.api.setActive(true); f.win.dispatchEvent(new Event('pageshow')); await tick();
  assert.equal(f.video.playCalls, calls);
});

test('a completed clip keeps its final frame and cannot replay on scene/tab return or controller re-init', async t => {
  const f = mount(t);
  assert.equal(f.video.loop, false);
  await activate(f);
  f.end();
  assert.equal(f.classes.has('is-ended'), true);
  assert.equal(f.video.hidden, false);
  assert.equal(f.video.currentTime, 10);
  const calls = f.video.playCalls;
  f.api.setActive(false); f.api.setActive(true); f.inView(false); f.inView(); await tick();
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange')); await tick();
  assert.equal(f.video.playCalls, calls);
  f.api.dispose();
  const current = initLabFilm(f.doc);
  t.after(() => current.dispose());
  current.setActive(true); await tick();
  assert.equal(f.video.playCalls, calls, 'Once per visit survives disposal/re-init of the same element');
  assert.equal(f.video.hidden, true, 'After a disposed media resource, the completed scene uses its poster');
});

test('a genuine new visit rewinds a finished film to its first frame; before any source it does nothing', async t => {
  const f = mount(t);
  f.api.rewind();
  assert.equal(f.video.getAttribute('src'), null, 'Nothing is requested by a rewind alone');
  await activate(f);
  f.end();
  const calls = f.video.playCalls;
  f.api.setActive(false);
  f.api.rewind();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.classes.has('is-ended'), false);
  assert.equal(f.video.playCalls, calls, 'An inactive rewind waits; it does not play');
  f.api.setActive(true); await tick();
  assert.equal(f.video.playCalls, calls + 1, 'The next visit plays from the start');
});

test('narrow screens take the smaller file when one exists', async t => {
  const f = fixture();
  f.video.dataset.srcSmall = 'assets/motion/small.mp4';
  f.win.matchMedia = query => ({matches: query === '(max-width: 900px)', addEventListener() {}, removeEventListener() {}});
  const api = initLabFilm(f.doc);
  t.after(() => api.dispose());
  f.inView(); api.setActive(true); await tick();
  assert.equal(f.video.getAttribute('src'), 'assets/motion/small.mp4');
});

test('three scene instances keep completion, media errors and replay ownership independent', async t => {
  const [ac, br, su] = Array.from({length: 3}, () => mount(t));
  for (const f of [ac, br, su]) f.inView();
  ac.api.setActive(true); await tick();
  ac.end();
  ac.api.setActive(false);
  br.api.setActive(true); await tick();
  assert.equal(ac.video.playCalls, 1);
  assert.equal(br.video.playCalls, 1, 'Completing AC never completes BR');
  br.video.dispatchEvent(new Event('error'));
  br.api.setActive(false);
  su.api.setActive(true); await tick();
  assert.equal(br.video.hidden, true);
  assert.equal(su.video.paused, false, 'A BR media failure cannot block SU');
  su.api.setActive(false);
  ac.api.rewind(); ac.api.setActive(true); await tick();
  assert.equal(ac.video.currentTime, 0);
  assert.equal(ac.video.playCalls, 2);
  assert.equal(br.video.playCalls, 1);
  assert.equal(su.video.playCalls, 1);
});
