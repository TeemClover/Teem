import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

// Run the real module with DOM/media event adapters. No network, timers or video decoding.
const source = readFileSync(new URL('../../mediral/js/lab-film.js', import.meta.url), 'utf8');
const {initLabFilm} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ready = true, reduce = false, save = false, observer = true} = {}) {
  const classes = new Set();
  const label = {textContent: ''};
  const icon = {textContent: ''};
  const status = {textContent: ''};
  const duration = {hidden: true};
  const button = Object.assign(new EventTarget(), {
    hidden: true, attributes: {},
    querySelector(selector) { return selector.includes('label') ? label : icon; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  let rect = {top: 900, bottom: 1100, left: 0, right: 400, width: 400, height: 200};
  const video = Object.assign(new EventTarget(), {
    paused: true, controls: false, hidden: true, attributes: {}, currentTime: 0, loop: true,
    dataset: {src: 'assets/motion/lab-film-10s.mp4'},
    playCalls: 0, pauseCalls: 0, loadCalls: 0,
    getBoundingClientRect() { return rect; },
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
    load() { this.loadCalls++; },
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
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const doc = Object.assign(new EventTarget(), {hidden: false, defaultView: win});
  const section = {
    ownerDocument: doc, dataset: {filmReady: String(ready)},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
    },
    querySelector(selector) {
      if (selector.includes('video')) return video;
      if (selector.includes('toggle')) return button;
      if (selector.includes('duration')) return duration;
      return status;
    },
  };
  doc.querySelector = () => section;
  return {
    doc, win, reduced, connection, button, video, section, status, label, duration, classes,
    get io() { return io; },
    inView(visible = true) {
      rect = visible
        ? {top: 100, bottom: 300, left: 0, right: 400, width: 400, height: 200}
        : {top: 900, bottom: 1100, left: 0, right: 400, width: 400, height: 200};
      if (io) io.callback([{target: video, isIntersecting: visible, intersectionRatio: visible ? 1 : 0}]);
      else win.dispatchEvent(new Event('scroll'));
    },
    click() { button.dispatchEvent(new Event('click')); },
    end() {
      // Browser order at the natural end of a non-looping clip: pause, then ended.
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

test('pending media remains a still chapter, without a source, controls or playback work', async () => {
  const html = readFileSync(new URL('../../mediral/index.html', import.meta.url), 'utf8');
  const film = html.match(/<section\b[^>]*id="lab-film"[^>]*>/)?.[0];
  const videoTag = html.match(/<video\b[^>]*data-film-video[^>]*>/)?.[0];
  assert.match(film, /data-film-ready="(?:true|false)"/);
  if (film.includes('data-film-ready="true"')) {
    assert.equal(existsSync(new URL('../../mediral/assets/motion/lab-film-10s.mp4', import.meta.url)), true,
      'The public readiness flag requires an actual film asset');
  }
  assert.match(videoTag, /data-src="assets\/motion\/lab-film-10s\.mp4"/);
  assert.doesNotMatch(videoTag, /\ssrc=|\scontrols(?:\s|>)/);
  assert.doesNotMatch(videoTag, /\sloop(?:[\s=>])/, 'The delivered clip is not a seamless loop');
  assert.match(videoTag, /\shidden(?:\s|>)/);
  const f = fixture({ready: false});
  const api = initLabFilm(f.doc);
  f.inView(); api.play(); f.click(); await tick();
  assert.equal(f.io, undefined);
  assert.equal(f.video.attributes.src, undefined);
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.video.loadCalls, 0);
  assert.equal(f.video.hidden, true);
  assert.equal(f.video.controls, false);
  assert.equal(f.button.hidden, true);
  assert.equal(f.duration.hidden, true);
  assert.equal(f.status.textContent, '');
  assert.doesNotThrow(() => api.dispose());
});

test('pending gate can be enabled later without retaining an inert cached instance', async t => {
  const f = fixture({ready: false});
  const inert = initLabFilm(f.doc);
  f.section.dataset.filmReady = 'true';
  const active = initLabFilm(f.doc);
  t.after(() => active.dispose());
  assert.notEqual(active, inert);
  assert.equal(f.video.attributes.src, f.video.dataset.src);
  f.inView(); await tick();
  assert.equal(f.video.paused, false);
});

test('DOM guard, one instance, muted inline media and no boot preload', t => {
  assert.equal(initLabFilm(null), null);
  const f = mount(t);
  assert.equal(initLabFilm(f.doc), f.api);
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.video.loadCalls, 0);
  assert.equal(f.video.preload, 'none');
  assert.equal(f.video.muted, true);
  assert.equal(f.video.defaultMuted, true);
  assert.equal(f.video.playsInline, true);
  assert.equal(f.video.controls, false);
  assert.equal(f.button.hidden, false);
});

test('autoplay follows viewport and document visibility, with accessible button state', async t => {
  const f = mount(t);
  f.inView(); await tick();
  assert.equal(f.video.paused, false);
  assert.equal(f.label.textContent, 'หยุดวิดีโอ');
  assert.match(f.button.attributes['aria-label'], /^หยุด/);
  f.inView(false);
  assert.equal(f.video.paused, true);
  f.inView(); await tick();
  f.doc.hidden = true;
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.video.paused, true);
  f.doc.hidden = false;
  f.doc.dispatchEvent(new Event('visibilitychange')); await tick();
  assert.equal(f.video.paused, false);
});

test('manual pause survives leaving and returning; manual play resumes', async t => {
  const f = mount(t);
  f.inView(); await tick(); f.click();
  assert.equal(f.video.paused, true);
  f.inView(false); f.inView(); await tick();
  assert.equal(f.video.paused, true);
  f.click(); await tick();
  assert.equal(f.video.paused, false);
});

for (const [name, option] of [['reduced motion', {reduce: true}], ['data saving', {save: true}]]) {
  test(`${name}: poster stays still until explicit play, without automatic re-entry playback`, async t => {
    const f = mount(t, option);
    f.inView(); await tick();
    assert.equal(f.video.playCalls, 0);
    f.click(); await tick();
    assert.equal(f.video.paused, false);
    f.inView(false); f.inView(); await tick();
    assert.equal(f.video.paused, true);
  });
}

test('changed motion or data preferences stop playback immediately', async t => {
  const f = mount(t);
  f.inView(); await tick();
  f.reduced.matches = true;
  f.reduced.dispatchEvent(new Event('change'));
  assert.equal(f.video.paused, true);
  f.click(); await tick();
  assert.equal(f.video.paused, false);
  f.connection.saveData = true;
  f.connection.dispatchEvent(new Event('change'));
  assert.equal(f.video.paused, true);
});

test('blocked autoplay asks for play once without treating the media as broken', async t => {
  const f = mount(t);
  f.video.playImpl = () => Promise.reject(Object.assign(new Error('blocked'), {name: 'NotAllowedError'}));
  f.inView(); await tick();
  assert.equal(f.classes.has('is-error'), false);
  assert.equal(f.status.textContent, 'กดเล่นเพื่อชมวิดีโอ');
  const calls = f.video.playCalls;
  f.inView(); await tick();
  assert.equal(f.video.playCalls, calls);
  f.video.playImpl = null;
  f.click(); await tick();
  assert.equal(f.video.paused, false);
});

test('media failure exposes the poster and reading fallback, with manual retry', async t => {
  const f = mount(t);
  f.video.playImpl = () => Promise.reject(Object.assign(new Error('missing'), {name: 'NotSupportedError'}));
  f.inView(); await tick();
  assert.equal(f.classes.has('is-error'), true);
  assert.match(f.status.textContent, /ดูภาพและคำอธิบาย/);
  assert.equal(f.label.textContent, 'ลองเล่นอีกครั้ง');
  f.video.playImpl = null;
  f.click(); await tick();
  assert.equal(f.video.loadCalls, 1);
  assert.equal(f.classes.has('is-error'), false);
  assert.equal(f.video.paused, false);
});

test('a late play promise cannot restart the film after it leaves the viewport', async t => {
  const f = mount(t);
  let resolve;
  f.video.playImpl = () => new Promise(done => { resolve = done; });
  f.inView(); f.inView(false);
  f.video.paused = false;
  resolve(); await tick();
  assert.equal(f.video.paused, true);
});

test('a disposed instance cannot pause the new owner when its old play promise resolves', async t => {
  const f = fixture();
  let resolve;
  f.video.playImpl = () => new Promise(done => { resolve = done; });
  const old = initLabFilm(f.doc);
  f.inView(); old.dispose();
  f.video.playImpl = null;
  const current = initLabFilm(f.doc);
  t.after(() => current.dispose());
  await tick();
  assert.equal(f.video.paused, false);
  resolve(); await tick();
  assert.equal(f.video.paused, false);
});

test('viewport fallback works without IntersectionObserver and disposal removes it', async t => {
  const f = mount(t, {observer: false});
  f.inView(); await tick();
  assert.equal(f.video.paused, false);
  f.inView(false);
  assert.equal(f.video.paused, true);
  f.api.dispose();
  const calls = f.video.playCalls;
  f.inView(); f.click(); await tick();
  assert.equal(f.video.playCalls, calls);
  assert.equal(f.button.hidden, true);
});

test('the clip plays once, rests on its final frame and offers an explicit replay', async t => {
  const f = mount(t);
  assert.equal(f.video.loop, false, 'Never force a seam between the clear and amber ends of the clip');
  f.inView(); await tick();
  assert.equal(f.video.paused, false);
  f.end();
  assert.equal(f.classes.has('is-ended'), true);
  assert.equal(f.label.textContent, 'เล่นอีกครั้ง');
  assert.match(f.button.attributes['aria-label'], /อีกครั้ง/);
  const calls = f.video.playCalls;
  f.inView(false); f.inView(); await tick();
  assert.equal(f.video.playCalls, calls, 'Returning to the chapter does not start another pass');
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange')); await tick();
  assert.equal(f.video.playCalls, calls, 'Returning to the tab does not start another pass');
  f.click(); await tick();
  assert.equal(f.video.currentTime, 0, 'Replay starts from the beginning');
  assert.equal(f.video.paused, false);
  assert.equal(f.classes.has('is-ended'), false);
  assert.equal(f.label.textContent, 'หยุดวิดีโอ');
});

test('a manually started reduced-motion pass also ends once, without automatic replay', async t => {
  const f = mount(t, {reduce: true});
  f.inView(); await tick();
  f.click(); await tick();
  assert.equal(f.video.paused, false);
  f.end();
  const calls = f.video.playCalls;
  f.inView(false); f.inView(); await tick();
  assert.equal(f.video.playCalls, calls);
  assert.equal(f.label.textContent, 'เล่นอีกครั้ง');
});
