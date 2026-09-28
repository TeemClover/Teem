import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// The real page controller runs in a VM with a small DOM boundary. The score module is the real
// one; the cinema engine is replaced by a stand-in with the same contract (the engine has its own
// suite in cinema.test.mjs), so these tests cover what the controller decides, not how layers move.
const entry = new URL('../../mediral/js/main.js', import.meta.url);
const scoreModule = await import(new URL('../../mediral/js/score.js', import.meta.url));
const {CHAPTERS, END} = scoreModule;
const source = readFileSync(entry, 'utf8').replaceAll('import.meta.url', JSON.stringify(entry.href))
  .replace("import {createCinema} from './cinema.js';", 'const {createCinema} = globalThis.cinemaModule;')
  .replace("import {SHOTS, CHAPTERS, score, closingShot} from './score.js';", 'const {SHOTS, CHAPTERS, score, closingShot} = globalThis.scoreModule;')
  .replace("import('./lab-film.js')", 'globalThis.loadFilmModule()');
const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));
const FLOW = '(prefers-reduced-motion: reduce), (max-height: 520px)';
const TALL = '(max-aspect-ratio: 1/1)';
const from = id => CHAPTERS.find(c => c.id === id).from;

async function fixture({url = 'https://www.myclover.com/mediral/', clock = '2026-09-28T05:00:00Z', clipboardFails = false, readyState = 'complete',
  pendingFonts = false, flow = false, showOffer = false, affiliate = false, profile = true, cinemaFails = false, filmFactory} = {}) {
  const listeners = new Map(), windowListeners = new Map(), timers = new Map(), slots = new Map(), inserted = [];
  const errors = [];
  let now = Date.parse(clock), context, timerId = 0, H = 800, setShift = 0, resolveFonts;
  const fontReady = pendingFonts ? new Promise(resolve => { resolveFonts = resolve; }) : Promise.resolve();
  const addWindowListener = (name, handler, options = {}) => {
    if (!windowListeners.has(name)) windowListeners.set(name, []);
    windowListeners.get(name).push({handler, once: options.once});
  };
  const removeWindowListener = (name, handler) => windowListeners.set(name, (windowListeners.get(name) || []).filter(e => e.handler !== handler));
  const fireWindow = (name, event = {}) => {
    for (const e of [...(windowListeners.get(name) || [])]) { if (e.once) removeWindowListener(name, e.handler); e.handler({type: name, ...event}); }
  };
  const classList = () => {
    const items = new Set();
    return {add: (...n) => n.forEach(x => items.add(x)), remove: (...n) => n.forEach(x => items.delete(x)), contains: n => items.has(n),
      toggle(n, force = !items.has(n)) { force ? items.add(n) : items.delete(n); return force; }};
  };
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.classList = classList(); this.attributes = new Map(); this.dataset = {}; this.children = []; this.disabled = false; this.checked = true; this.hidden = false; this._html = ''; this._text = ''; this.nodes = new Map(); this.style = {setProperty() {}, removeProperty() {}}; }
    set innerHTML(value) { this._html = String(value); this.children = []; }
    get innerHTML() { return this._html; }
    set textContent(value) { this._text = String(value); this.children = []; this._html = ''; }
    get textContent() { return this._text + this.children.map(c => c.textContent || '').join(''); }
    insertAdjacentHTML(position, value) { inserted.push({target: this, position, html: value}); this._html += value; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); if (['href', 'target', 'rel'].includes(name)) delete this[name]; }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    append(...children) { this.children.push(...children); }
    prepend(...children) { this.children.unshift(...children); }
    remove() { this.removed = true; }
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    closest(selector) { return selector === '[data-piece]' && this.value ? this : selector === '[data-action]' && this.dataset.action ? this : null; }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return {top: 0, bottom: 0}; }
  }
  const root = new Element('html');
  // The story track: one marker per chapter, placed where its first composed hold begins.
  const section = new Element('section');
  section.id = 'story';
  section.getBoundingClientRect = () => ({top: -context.scrollY, bottom: (END + 1) * H - context.scrollY});
  const sectionListeners = [];
  section.addEventListener = (name, handler, options) => sectionListeners.push({name, handler, options});
  const marks = CHAPTERS.filter(c => c.id !== 'close').map((chapter, i, list) => {
    const el = new Element('span');
    el.id = chapter.id === 'routine' ? 'routine' : `step-${chapter.id}`;
    el.dataset = chapter.id === 'routine' ? {mark: 'routine'} : {mark: chapter.id, step: chapter.id};
    el.scrollMarginTop = '0px';
    const to = () => (list[i + 1]?.from ?? END + 1) * H;
    Object.defineProperty(el, 'offsetHeight', {get: () => to() - chapter.from * H});
    el.getBoundingClientRect = () => ({top: chapter.from * H - context.scrollY, bottom: to() - context.scrollY});
    return el;
  });
  const set = new Element('section');
  set.id = 'set';
  set.scrollMarginTop = '106px';
  Object.defineProperty(set, 'offsetHeight', {get: () => 1400});
  set.getBoundingClientRect = () => ({top: (END + 1) * H + setShift - context.scrollY, bottom: (END + 1) * H + setShift + 1400 - context.scrollY});
  const view = new Element(), foam = new Element(), heroShot = new Element();
  view.querySelector = selector => selector === '[data-layer="fx.foam"]' ? foam : selector === '[data-shot="routine"]' ? heroShot : new Element();
  section.querySelector = selector => selector === '[data-view]' ? view : new Element();
  const pieces = routine.steps.map(step => Object.assign(new Element('input'), {value: step.id}));
  const rows = routine.steps.map(step => { const el = new Element(); el.dataset.row = step.id; return el; });
  const rails = [...routine.steps, {id: 'set'}].map(step => { const el = new Element('a'); el.dataset.rail = step.id; return el; });
  const actions = ['card', 'copy'].map(action => { const el = new Element('button'); el.dataset.action = action; return el; });
  const film = new Element(); film.id = 'lab-film';
  for (const name of ['compare', 'uses', 'library', 'rail', 'exchange', 'set-headline', 'set-carry', 'pieces', 'set-row', 'offer', 'actions', 'summary', 'buy-hint', 'disclosure', 'profile-link']) slots.set(name, new Element());
  slots.get('actions').prepend = link => { slots.set('buy-link', link); link.remove = () => slots.delete('buy-link'); };
  const document = {
    documentElement: root, body: new Element('body'), visibilityState: 'visible', activeElement: null, readyState, fonts: {ready: fontReady},
    createElement: tag => new Element(tag),
    addEventListener(name, handler) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); },
    querySelector(selector) {
      const slot = selector.match(/^\[data-slot="([^"]+)"\]$/);
      if (slot) return slots.get(slot[1]) ?? null;
      if (selector === '[data-view]') return view;
      if (selector === '#story') return section;
      if (selector === '#set') return set;
      if (selector === '#lab-film') return film;
      const mark = marks.find(m => selector === `#${m.id}`);
      if (mark) return mark;
      if (selector.startsWith('#step-')) return null;
      if (selector.startsWith('[data-formula-group=')) { if (!slots.has(selector)) slots.set(selector, new Element()); return slots.get(selector); }
      return new Element();
    },
    querySelectorAll(selector) {
      if (selector === '#story [data-step]') return marks.filter(m => m.dataset.step);
      if (selector === '#story [data-mark]') return marks;
      if (selector === '.mr-reading-chapter') return [set];
      if (selector === '[data-piece]') return pieces;
      if (selector === '[data-row]') return rows;
      if (selector === '[data-rail]') return rails;
      if (selector === '[data-action="copy"], [data-action="card"]') return actions;
      return [];
    },
  };
  const media = query => {
    const m = {matches: query === FLOW ? flow : false, listeners: [], addEventListener(_n, fn) { this.listeners.push(fn); }};
    medias.set(query, m);
    return m;
  };
  const medias = new Map();
  const cinemas = [];
  // Stand-in engine: T comes from the section position, exactly as the real one computes it.
  const cinemaModule = {createCinema({section: s}) {
    if (cinemaFails) throw new Error('no cinema');
    const c = {measures: 0, flows: [], state: {T: 0, flow: false, layout: {H}},
      measure() { c.measures++; c.state.layout = {H}; },
      time() { return Math.min(END, Math.max(0, -s.getBoundingClientRect().top / c.state.layout.H)); },
      render() { if (!c.state.flow) c.state.T = c.time(); return c.state.T; },
      setFlow(value) { c.flows.push(value); c.state.flow = value; if (!value) c.measure(); },
      chapterAt(T = c.state.T) { let index = -1; CHAPTERS.forEach((ch, i) => { if (T >= ch.from) index = i; }); return index; },
      placeFlowMarks() { c.placed = (c.placed || 0) + 1; }};
    cinemas.push(c);
    return c;
  }};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const data = structuredClone(routine);
  data.set.show_offer = showOffer;
  if (affiliate) data.buy = {...data.buy, status: 'verified', affiliate_url: 'https://shop.example.test/verified-set'};
  if (!profile) data.buy.profile = {...data.buy.profile, status: 'unverified'};
  context = vm.createContext({document, location: new URL(url), URL, URLSearchParams, Intl, Date: ClockDate, console: {warn() {}, error: (...args) => errors.push(args)},
    navigator: {clipboard: {writeText: async () => { if (clipboardFails) throw new Error('denied'); }}},
    matchMedia: media, innerHeight: H, innerWidth: 1000, scrollY: 0,
    getComputedStyle: el => ({scrollMarginTop: el.scrollMarginTop || '0px'}),
    addEventListener: addWindowListener, removeEventListener: removeWindowListener,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ok: true, json: async () => data}),
    loadFilmModule: async () => ({initLabFilm: filmFactory}),
    cinemaModule, scoreModule,
  });
  const animationFrames = new Map();
  let frameId = 0;
  context.window = {requestIdleCallback() {}, scrollTo: ({top}) => { context.scrollY = top; },
    requestAnimationFrame(fn) { animationFrames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { animationFrames.delete(id); }};
  vm.runInContext(source, context, {filename: 'mediral/js/main.js'});
  await tick();
  assert.deepEqual(errors, [], 'The controller must boot before its behavior is tested');
  const run = code => vm.runInContext(code, context);
  const fire = (name, target) => { for (const handler of listeners.get(name) || []) handler({target}); };
  const flushTimers = async delay => {
    await tick();
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); }
    await tick();
  };
  return {run, slots, pieces, actions, rails, root, marks, set, timers, document, context, animationFrames, inserted, cinemas, medias, film, view, section, sectionListeners,
    get cinema() { return cinemas[0]; },
    change(id, checked) { const box = pieces.find(p => p.value === id); box.checked = checked; fire('change', box); },
    restore() { const button = new Element('button'); button.dataset.action = 'select-all'; fire('click', button); },
    followLink(href) { fire('click', {closest: selector => selector === 'a[href^="#formula-"]' && href.startsWith('#formula-') ? {getAttribute: () => href} : null}); },
    clock(value) { now = Date.parse(value); },
    returnToPage() { document.visibilityState = 'visible'; fire('visibilitychange'); },
    hidePage() { document.visibilityState = 'hidden'; fire('visibilitychange'); },
    scroll(y) { context.scrollY = y; run('onScroll()'); },
    at(T) { context.scrollY = T * H; run('onScroll()'); },
    resizeTo(height) { H = height; context.innerHeight = height; fireWindow('resize'); },
    shiftSet(px) { setShift = px; },
    load() { document.readyState = 'complete'; fireWindow('load'); },
    fontsReady() { resolveFonts?.(); },
    windowEvent: fireWindow,
    initialLinkListeners() { return ['wheel', 'touchstart', 'pointerdown', 'keydown', 'load', 'hashchange', 'pagehide'].reduce((count, name) => count + (windowListeners.get(name) || []).filter(e => /cleanup|onLoad/.test(String(e.handler)) || e.handler.name === 'cleanup' || e.handler.name === 'onLoad').length, 0); },
    flushImmediateTimers: () => flushTimers(0),
    flushResize: () => flushTimers(120),
    get H() { return H; },
  };
}

/* ---------- commerce: nothing pretends checkout exists ---------- */
test('the poster offer stays hidden while the data does not allow it, and schedules no refresh', async () => {
  const ui = await fixture();
  assert.equal(ui.slots.get('offer').hidden, true);
  assert.equal(ui.slots.get('offer').innerHTML, '');
  assert.equal([...ui.timers.values()].filter(t => t.delay > 1000).length, 0, 'No midnight refresh for a hidden offer');
});

for (const [date, expected, price] of [
  ['2026-09-20', 'ยังไม่ถึง', false],
  ['2026-09-21', 'ข้อเสนอที่พบ', true],
  ['2026-09-30', 'ข้อเสนอที่พบ', true],
  ['2026-10-01', 'สิ้นสุดแล้ว', false],
]) test(`an allowed poster offer on ${date} observes both calendar boundaries`, async () => {
  const ui = await fixture({url: `http://localhost:3000/mediral/?today=${date}`, showOffer: true});
  const offer = ui.slots.get('offer').innerHTML;
  assert.match(offer, new RegExp(expected));
  assert.equal(offer.includes('฿1,899'), price);
});

test('public and invalid local date overrides cannot revive an expired allowed offer', async () => {
  for (const url of ['https://www.myclover.com/mediral/?today=2026-09-28', 'http://localhost/mediral/?today=2026-02-31']) {
    const ui = await fixture({url, clock: '2026-10-01T00:00:00Z', showOffer: true});
    assert.match(ui.slots.get('offer').innerHTML, /สิ้นสุดแล้ว/);
    assert.doesNotMatch(ui.slots.get('offer').innerHTML, /1,899/);
  }
});

test('an allowed offer refreshes at Bangkok midnight and on returning to the tab', async () => {
  const ui = await fixture({clock: '2026-09-30T16:59:30Z', showOffer: true});
  assert.match(ui.slots.get('offer').innerHTML, /1,899/);
  const timer = [...ui.timers.values()].find(t => t.delay > 1000);
  assert.equal(timer.delay, 30_050, 'Expiry is scheduled at Bangkok midnight, not local-machine midnight');
  ui.clock('2026-09-30T17:00:01Z');
  timer.fn();
  assert.match(ui.slots.get('offer').innerHTML, /สิ้นสุดแล้ว/);
  ui.clock('2026-09-28T00:00:00Z');
  ui.returnToPage();
  assert.match(ui.slots.get('offer').innerHTML, /1,899/);
});

test('without a verified destination there is no buy control at all, only working actions', async () => {
  const ui = await fixture();
  assert.equal(ui.slots.get('buy-link'), undefined, 'No dead or disabled purchase button');
  assert.equal(ui.slots.get('disclosure').hidden, true, 'No commission note without a commission link');
  ui.run('state.data.buy.affiliate_url = "https://shop.example.test/not-verified"; renderBuy()');
  assert.equal(ui.slots.get('buy-link'), undefined, 'A URL without verified status stays out of the page');
  assert.ok(ui.actions.every(button => !button.disabled), 'Save and copy work for the full list');
});

test('the brand profile is a verified link for any list; it is never the set checkout or a commission link', async () => {
  const ui = await fixture();
  const link = ui.slots.get('profile-link');
  const check = () => {
    assert.equal(link.hidden, false);
    assert.equal(link.href, routine.buy.profile.url);
    assert.match(link.href, /^https:\/\/www\.tiktok\.com\/@mediral\.official\.th$/);
    assert.equal(link.textContent, 'ดู Mediral บน TikTok');
    assert.equal(link.rel, 'noopener', 'Not marked sponsored');
    assert.equal(ui.slots.get('disclosure').hidden, true);
  };
  check();
  ui.change('BR', false);
  check();
  for (const id of ['CL', 'AC', 'SU', 'PO']) ui.change(id, false);
  check();
  const hidden = await fixture({profile: false});
  assert.equal(hidden.slots.get('profile-link').hidden, true, 'An unverified profile is not shown');
});

test('a verified commission link serves only the full set, disclosed beside it, and partial lists lose it', async () => {
  const ui = await fixture({affiliate: true});
  const link = () => ui.slots.get('buy-link');
  assert.equal(link().href, 'https://shop.example.test/verified-set');
  assert.equal(link().rel, 'noopener sponsored');
  assert.equal(ui.slots.get('disclosure').hidden, false);
  assert.match(ui.slots.get('disclosure').textContent, /ค่าคอมมิชชัน/);
  ui.change('BR', false);
  assert.equal(link(), undefined);
  assert.equal(ui.slots.get('disclosure').hidden, true);
  assert.match(ui.slots.get('summary').innerHTML, /data-action="select-all"/);
  for (const id of ['CL', 'AC', 'SU', 'PO']) ui.change(id, false);
  assert.ok(ui.actions.every(button => button.disabled));
  ui.restore();
  assert.ok(ui.pieces.every(box => box.checked));
  assert.ok(ui.actions.every(button => !button.disabled));
  assert.equal(link().href, 'https://shop.example.test/verified-set');
  assert.equal(ui.document.activeElement, ui.slots.get('summary'));
});

test('the saved-list summary talks about the list and the store, never a poster price or payment step', async () => {
  const ui = await fixture();
  const full = ui.slots.get('summary').innerHTML;
  assert.match(full, /รายการครบ 5 ชิ้น/);
  ui.change('SU', false);
  const partial = ui.slots.get('summary').innerHTML;
  assert.match(partial, /เลือกไว้ 4 จาก 5 ชิ้น/);
  for (const html of [full, partial]) assert.doesNotMatch(html, /โปสเตอร์|1,899|ชำระ|กดจ่าย/);
});

test('clipboard denial leaves a readonly focused and selected copy field', async () => {
  const ui = await fixture({clipboardFails: true});
  ui.change('BR', false);
  const expected = ui.run('copyText()');
  await ui.run('copyList()');
  const field = ui.document.activeElement;
  assert.equal(field.tagName, 'TEXTAREA');
  assert.equal(field.readOnly, true);
  assert.equal(field.value, expected);
  assert.equal(field.selected, true);
  assert.match(field.getAttribute('aria-label'), /รายการ Mediral/);
});

/* ---------- the story ---------- */
test('every chapter is mounted in the one viewport, opening on its problem before its first benefit', async () => {
  const ui = await fixture();
  const shots = ui.inserted.find(i => i.position === 'beforebegin').html;
  for (const step of routine.steps) {
    const start = shots.indexOf(`data-shot="${step.id}"`);
    assert.ok(start >= 0, `${step.id}: mounted`);
    const next = routine.steps[routine.steps.indexOf(step) + 1];
    const chapter = shots.slice(start, next ? shots.indexOf(`data-shot="${next.id}"`) : undefined);
    const problem = chapter.indexOf(step.scene.problem);
    assert.ok(problem > 0, `${step.id}: the reader's problem is visible text`);
    for (const line of step.scene.headline) assert.ok(chapter.includes(line), `${step.id}: ${line}`);
    const benefits = [...step.scene.waves.map(w => w.split ? w.label.slice(0, w.split) : w.label), step.scene.headline[0]].map(t => chapter.indexOf(t)).filter(i => i >= 0);
    assert.ok(benefits.length, `${step.id}: its benefits are present`);
    assert.ok(problem < Math.min(...benefits), `${step.id}: the problem comes before the first benefit`);
    assert.ok(chapter.includes(step.scene.support), `${step.id}: one support line`);
    assert.ok(chapter.includes(step.image), `${step.id}: the pack`);
    assert.doesNotMatch(chapter, /AI ฉบับร่าง|กำลังตรวจ|รอสูตร|ภาพร่าง|รอยืนยัน|ยังไม่ยืนยัน/, `${step.id}: no backstage status`);
  }
  const markers = ui.inserted.find(i => i.position === 'afterend' && /data-mark=/.test(i.html)).html;
  assert.deepEqual([...markers.matchAll(/id="step-([A-Z]{2})"/g)].map(m => m[1]), routine.steps.map(s => s.id), 'One marker per product, in order');
  const closing = ui.inserted.find(i => /data-shot="set-close"/.test(i.html));
  assert.equal(closing?.position, 'afterend', 'The reassembled set sits just after the opening, beneath the chapters');
  assert.equal((closing.html.match(/class="mr-actor /g) || []).length, 5);
  assert.match(closing.html, /href="#set"/);
  const index = ui.inserted.find(i => i.position === 'beforeend').html;
  assert.equal((index.match(/data-selling-step=/g) || []).length, routine.steps.reduce((n, s) => n + s.selling.beats.length, 0), 'Every attributed beat stays in the reading index');
});

test('the rail and the active chapter follow the markers, and only one rail item is current', async () => {
  const ui = await fixture();
  assert.equal(ui.document.body.dataset.step, 'routine');
  assert.equal(ui.rails.filter(a => a.getAttribute('aria-current')).length, 0);
  for (const [i, step] of routine.steps.entries()) {
    ui.at(from(step.id) - 0.01);
    assert.equal(ui.document.body.dataset.step, i ? routine.steps[i - 1].id : 'routine', `${step.id}: not before its first hold`);
    ui.at(from(step.id));
    assert.equal(ui.document.body.dataset.step, step.id);
    assert.equal(ui.rails[i].getAttribute('aria-current'), 'step');
    assert.equal(ui.rails.filter(a => a.getAttribute('aria-current')).length, 1);
  }
  ui.at(END + 1.2);
  assert.equal(ui.document.body.dataset.step, 'set');
  assert.equal(ui.rails[5].getAttribute('aria-current'), 'step');
});

test('the header takes the chapter on screen, leading its marker slightly, and returns to the page after', async () => {
  const ui = await fixture();
  ui.at(0.2);
  assert.equal(ui.document.body.dataset.chapter, 'routine');
  ui.at(from('AC') - 0.2);
  assert.equal(ui.document.body.dataset.chapter, 'AC', 'A mostly open portal already shows the dark chapter');
  ui.at(from('PO') + 0.1);
  assert.equal(ui.document.body.dataset.chapter, 'PO');
  ui.at(14.0);
  assert.equal(ui.document.body.dataset.chapter, 'close');
  ui.scroll((END + 1) * ui.H + 200);
  assert.equal(ui.document.body.dataset.chapter, 'page');
});

test('the extraction film plays only while AC opens, and never in a hidden tab', async () => {
  const film = {active: false, setActive(value) { this.active = value; }};
  const ui = await fixture({filmFactory: () => film});
  await ui.run('bootFilm()');
  ui.at(2.0);
  assert.equal(film.active, false);
  ui.at(3.8);
  assert.equal(film.active, true);
  ui.hidePage();
  assert.equal(film.active, false);
  ui.returnToPage();
  assert.equal(film.active, true);
  ui.at(5.0);
  assert.equal(film.active, false);
});

test('a new viewport keeps the reader at the same story moment, unless they moved or were outside it', async () => {
  const ui = await fixture();
  ui.at(3.35);
  assert.ok(Math.abs(ui.cinema.state.T - 3.35) < 1e-9);
  ui.resizeTo(1000);                 // svh changes at once; the pixel offset alone would mean T 2.68
  ui.run('onScroll()');
  await ui.flushResize();
  assert.equal(ui.context.scrollY, 3.35 * 1000);
  assert.ok(Math.abs(ui.cinema.state.T - 3.35) < 1e-9);
  assert.equal(ui.document.body.dataset.step, 'CL');

  const toolbar = await fixture();
  toolbar.at(3.35);
  toolbar.resizeTo(800);             // a phone toolbar hides: resize fires, the svh track is unchanged
  toolbar.context.scrollY = 3.6 * 800; // momentum carried on without a new touch
  await toolbar.flushResize();
  assert.equal(toolbar.context.scrollY, 3.6 * 800, 'Same track length: the reader keeps their own scroll');

  const moved = await fixture();
  moved.at(3.35);
  moved.resizeTo(1000);
  moved.windowEvent('wheel');
  moved.context.scrollY = 5000;
  await moved.flushResize();
  assert.equal(moved.context.scrollY, 5000, 'Input during the burst wins');

  const reading = await fixture();
  reading.scroll((END + 1) * 800 + 300);
  reading.resizeTo(1000);
  await reading.flushResize();
  assert.equal(reading.context.scrollY, (END + 1) * 800 + 300, 'Someone in the set or an atlas is never pulled back into the story');
});

test('reduced motion or a short screen reads in normal flow, keeping the reader on the same chapter', async () => {
  const ui = await fixture({flow: true});
  assert.ok(ui.root.classList.contains('mr-flow'));
  assert.deepEqual(ui.cinema.flows, [true]);
  const motion = await fixture();
  assert.deepEqual(motion.cinema.flows, [false]);
  motion.at(from('BR') + 0.4);
  const query = motion.medias.get(FLOW);
  query.matches = true;
  query.listeners.forEach(fn => fn({matches: true}));
  assert.ok(motion.root.classList.contains('mr-flow'));
  assert.equal(motion.cinema.state.flow, true);
  assert.equal(motion.document.body.dataset.step, 'BR', 'The switch keeps the chapter');
  assert.ok(motion.medias.has(TALL), 'Tall and wide compositions share one query with the CSS');
});

test('a failing cinema leaves the readable flow and working commerce, not the data-failure alert', async () => {
  const ui = await fixture({cinemaFails: true});
  assert.ok(ui.root.classList.contains('mr-flow'));
  assert.ok(!ui.root.classList.contains('mr-nodata'));
  assert.ok(ui.actions.every(button => !button.disabled));
  ui.scroll(1200);
  assert.equal(ui.document.body.dataset.chapter, 'page');
});

/* ---------- optional depth ---------- */
test('method, timing and size are inside the expandable product details, without image-status notes', async () => {
  const ui = await fixture();
  const html = ui.run('stepBody(state.data.steps[1])');
  const details = html.slice(html.indexOf('<details'), html.indexOf('</details>'));
  assert.match(details, /วิธีใช้และรายละเอียดชิ้นนี้/);
  assert.ok(details.includes(routine.steps[1].how));
  assert.ok(details.includes(routine.steps[1].size));
  for (const step of routine.steps) assert.doesNotMatch(ui.run(`stepBody(byId('${step.id}'))`), /AI ฉบับร่าง|ยังไม่ยืนยัน|รอยืนยัน|รอข้อมูล/, `${step.id}: finished wording`);
  assert.match(ui.run("stepBody(byId('PO'))"), /ดูเฉด น้ำหนัก และรายละเอียดตัวเลือกที่ร้าน/);
});

test('the library omits an unconfirmed formula and keeps every other name one tap away', async () => {
  const ui = await fixture();
  const library = ui.slots.get('library').innerHTML;
  assert.doesNotMatch(library, /id="formula-CL"/, 'No empty or pending mousse entry');
  for (const step of routine.steps.filter(s => s.id !== 'CL')) {
    const html = ui.run(`ingredientAtlas(byId('${step.id}'))`);
    assert.match(html.match(/^<details\b[^>]*>/)[0], new RegExp(`id="formula-${step.id}"`));
    assert.doesNotMatch(html.match(/^<details\b[^>]*>/)[0], /\sopen\b/);
    const count = step.featured.length + step.ingredients.length;
    assert.equal((html.match(/data-formula-index=/g) || []).length, count);
    for (const ingredient of [...step.featured, ...step.ingredients]) assert.ok(html.includes(`>${ingredient.name}</button>`), ingredient.name);
  }
  const ac = ui.run("ingredientAtlas(byId('AC'))");
  assert.match(ac, /<details class="mr-fact"><summary>ทำความเข้าใจผิวที่เป็นสิวง่าย<\/summary>/, 'General acne knowledge sits behind its own link');
  assert.match(ac, /href="https:\/\/www\.nhs\.uk\/conditions\/acne\/"/);
  assert.match(ac, /href="https:\/\/www\.niams\.nih\.gov\/health-topics\/acne"/);
});

test('direct, in-page and history links open a closed atlas before the reader lands on it', async () => {
  const ui = await fixture();
  const atlas = {tagName: 'DETAILS', open: false};
  ui.document.querySelector = (original => selector => selector === '#formula-BR' ? atlas : original(selector))(ui.document.querySelector);
  ui.followLink('#formula-BR');
  assert.equal(atlas.open, true);
  atlas.open = false;
  ui.context.location.hash = '#formula-BR';
  ui.windowEvent('hashchange');
  assert.equal(atlas.open, true);
});

test('reading a non-featured ingredient changes its attributed detail without selecting products', async () => {
  const ui = await fixture();
  const step = routine.steps.find(s => s.id === 'BR');
  const groupIndex = step.ingredient_groups.findIndex(g => g.ingredientNames.length > 1);
  const name = step.ingredient_groups[groupIndex].ingredientNames[1];
  ui.run(`chooseFormulaIngredient('BR', ${groupIndex}, 1)`);
  const group = ui.slots.get(`[data-formula-group="BR:${groupIndex}"]`);
  assert.equal(group.querySelector('.mr-ingredient-group__name').textContent, name);
  assert.ok(ui.pieces.every(box => box.checked));
});

/* ---------- links and scheduling ---------- */
test('incoming product links land on the chapter\'s first composed hold after the markers exist', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU'});
  assert.equal(ui.context.scrollY, from('SU') * ui.H);
  assert.equal(ui.document.body.dataset.step, 'SU');
  assert.equal(ui.rails[3].getAttribute('aria-current'), 'step');
});

test('an incoming set link wins late native restoration and font layout, then releases its listeners', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#set', readyState: 'interactive', pendingFonts: true});
  const target = () => (END + 1) * ui.H - 106;
  assert.equal(ui.context.scrollY, target());
  ui.scroll(1500);
  ui.load();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, target());
  ui.shiftSet(300);
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, target() + 300, 'Use the current position, not the first measured offset');
  ui.scroll(1200);
  ui.load();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 1200, 'A completed restorer cannot keep pulling the reader back');
});

test('reader input cancels a queued incoming-link restoration', async () => {
  for (const input of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    const ui = await fixture({url: 'https://www.myclover.com/mediral/#set', readyState: 'interactive', pendingFonts: true});
    ui.load();
    ui.windowEvent(input);
    ui.scroll(1750);
    ui.shiftSet(300);
    ui.fontsReady();
    await ui.flushImmediateTimers();
    assert.equal(ui.context.scrollY, 1750, `${input}: respect the reader's new position`);
  }
});

for (const [hash, target] of [['#lab-film', 'AC'], ['#beat-BR-1', 'BR'], ['#founder', 'set'], ['#relay', 'set']]) {
  test(`a legacy ${hash} link lands on what now tells it`, async () => {
    const ui = await fixture({url: `https://www.myclover.com/mediral/${hash}`});
    await ui.flushImmediateTimers();
    assert.equal(ui.document.body.dataset.step, target);
  });
}

test('many scroll events queue one update; the winning frame or timer cancels the other and stale callbacks do nothing', async () => {
  const ui = await fixture();
  ui.run('globalThis.__updates = 0; onScroll = (original => () => { globalThis.__updates++; original(); })(onScroll)');
  const scrollTimers = () => [...ui.timers.values()].filter(timer => timer.delay === 60);
  for (let i = 0; i < 100; i++) ui.run('requestScroll()');
  assert.equal(scrollTimers().length, 1);
  assert.equal(ui.animationFrames.size, 1);
  const [timerId, timer] = [...ui.timers.entries()].find(([, t]) => t.delay === 60);
  ui.timers.delete(timerId);
  timer.fn(); // A throttled view: the timer wins.
  assert.equal(ui.run('__updates'), 1);
  assert.equal(ui.animationFrames.size, 0, 'The losing frame is cancelled, not left to pile up');
  ui.run('requestScroll()');
  const [frameId, frame] = [...ui.animationFrames.entries()][0];
  ui.animationFrames.delete(frameId);
  timer.fn(); // A stale timer from the previous generation must not consume the new request.
  assert.equal(ui.run('__updates'), 1);
  frame();
  assert.equal(ui.run('__updates'), 2);
  assert.equal(scrollTimers().length, 0, 'The losing timer is cleared');
});

test('only the page scrolls: an internal scroll of the cinema viewport is undone at once', async () => {
  const ui = await fixture();
  const guard = ui.sectionListeners.find(l => l.name === 'scroll');
  assert.ok(guard?.options?.capture, 'Element scroll events do not bubble; the guard listens in the capture phase');
  Object.assign(ui.view, {nodeType: 1, scrollTop: 126.5, scrollLeft: 0});
  guard.handler({target: ui.view});
  assert.equal(ui.view.scrollTop, 0);
});

test('a same-document legacy link resolves like a fresh one', async () => {
  const ui = await fixture();
  for (const [hash, step] of [['#lab-film', 'AC'], ['#beat-BR-1', 'BR'], ['#founder', 'set']]) {
    ui.context.location.hash = hash;
    ui.windowEvent('hashchange');
    assert.equal(ui.document.body.dataset.step, step, hash);
  }
});
