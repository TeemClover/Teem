import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// The real page controller runs in a VM with a small DOM boundary. The score module is the real
// one; the cinema engine is replaced by a stand-in with the same contract (the engine has its own
// suite in cinema.test.mjs), so these tests cover what the controller decides, not how layers move.
const entry = new URL('../../mediral/js/main.js', import.meta.url);
const letterModule = await import(new URL('../../mediral/js/letter.js', import.meta.url));
const scoreModule = await import(new URL('../../mediral/js/score.js', import.meta.url));
const {CHAPTERS, END} = scoreModule;
const source = readFileSync(entry, 'utf8').replaceAll('import.meta.url', JSON.stringify(entry.href))
  .replace("import {createLetterMotion} from './letter.js';", 'const {createLetterMotion} = globalThis.letterModule;')
  .replace("import {createCinema} from './cinema.js';", 'const {createCinema} = globalThis.cinemaModule;')
  .replace(/import \{([^}]*)\} from '\.\/score\.js';/, 'const {$1} = globalThis.scoreModule;')
  .replace("import('./lab-film.js')", 'globalThis.loadFilmModule()');
const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const startupSource = readFileSync(new URL('../../mediral/index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const tick = () => new Promise(resolve => setImmediate(resolve));
const FLOW = '(prefers-reduced-motion: reduce), (max-height: 520px)';
const TALL = '(max-aspect-ratio: 1/1)';
const from = id => CHAPTERS.find(c => c.id === id).from;

async function fixture({url = 'https://www.myclover.com/mediral/', clock = '2026-09-28T05:00:00Z', clipboardFails = false, readyState = 'complete',
  pendingFonts = false, pendingData = false, fetchFails = false, flow = false, showOffer = false, affiliate = false, profile = true, line = true, cinemaFails = false, filmFactory} = {}) {
  const listeners = new Map(), windowListeners = new Map(), timers = new Map(), slots = new Map(), inserted = [];
  const errors = [];
  let now = Date.parse(clock), context, timerId = 0, H = 800, setShift = 0, resolveFonts, resolveData;
  const fontReady = pendingFonts ? new Promise(resolve => { resolveFonts = resolve; }) : Promise.resolve();
  const dataReady = pendingData ? new Promise(resolve => { resolveData = resolve; }) : Promise.resolve();
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
    addEventListener() {}
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    closest(selector) { return selector === '[data-piece]' && this.value ? this : selector === '[data-action]' && this.dataset.action ? this : null; }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return {top: 0, bottom: 0}; }
  }
  const root = new Element('html');
  root.classList.add('mr-flow', 'mr-boot');
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
  const actions = ['copy'].map(action => { const el = new Element('button'); el.dataset.action = action; return el; });
  const films = Object.entries(scoreModule.FILMS).map(([id, config]) => {
    const el = new Element(); el.id = config.id; el.dataset.filmStep = id; return el;
  });
  const film = films[0];
  for (const name of ['rail', 'trust', 'order-title', 'order-how', 'order-note', 'route-close', 'line-link', 'pieces', 'message', 'offer', 'actions', 'buy-hint', 'disclosure', 'profile-link']) slots.set(name, new Element());
  const order = new Element('div'); order.id = 'order'; order.scrollMarginTop = '86px';
  order.getBoundingClientRect = () => ({top: (END + 1) * H + setShift + 600 - context.scrollY, bottom: (END + 1) * H + setShift + 1300 - context.scrollY});
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
      if (selector === '#order') return order;
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
      if (selector === '[data-action="copy"]' || selector === '[data-action]') return actions;
      if (selector === '[data-slot="line-link"]') return [slots.get('line-link')];
      if (selector === '[data-lab-film][data-film-step]') return films;
      return [];
    },
  };
  const media = query => {
    const m = {matches: query === FLOW ? flow : false, listeners: [], addEventListener(_n, fn) { this.listeners.push(fn); }};
    medias.set(query, m);
    return m;
  };
  const medias = new Map();
  const cinemas = [], poses = [];
  // Stand-in engine: T comes from the section position, exactly as the real one computes it.
  const cinemaModule = {createCinema({section: s}) {
    if (cinemaFails) throw new Error('no cinema');
    const c = {measures: 0, flows: [], state: {T: 0, flow: false, layout: {H}},
      measure() { c.measures++; c.state.layout = {H}; },
      time() { return Math.min(END, Math.max(0, -s.getBoundingClientRect().top / c.state.layout.H)); },
      render() { if (!c.state.flow) c.state.T = c.time(); poses.push({T: c.state.T, gated: root.classList.contains('mr-boot'), scrollY: context.scrollY}); return c.state.T; },
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
  if (!line) data.order = {...data.order, status: 'unverified'};
  context = vm.createContext({document, location: Object.assign(new URL(url), {replace(href) { this.replaced = href; }, assign(href) { this.assigned = href; }}), URL, URLSearchParams, Intl, Date: ClockDate, console: {warn() {}, error: (...args) => errors.push(args)},
    navigator: {clipboard: {writeText: async () => { if (clipboardFails) throw new Error('denied'); }}},
    matchMedia: media, innerHeight: H, innerWidth: 1000, scrollY: 0,
    getComputedStyle: el => ({scrollMarginTop: el.scrollMarginTop || '0px'}),
    addEventListener: addWindowListener, removeEventListener: removeWindowListener,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); },
    fetch: async () => { await dataReady; if (fetchFails) throw new Error('routine unavailable'); return {ok: true, json: async () => data}; },
    loadFilmModule: async () => ({initLabFilm: filmFactory}),
    cinemaModule, scoreModule, letterModule,
  });
  const animationFrames = new Map();
  let frameId = 0;
  context.window = {requestIdleCallback() {}, scrollTo: ({top}) => { context.scrollY = top; },
    requestAnimationFrame(fn) { animationFrames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { animationFrames.delete(id); }};
  vm.runInContext(startupSource, context, {filename: 'mediral/index.html startup'});
  vm.runInContext(source, context, {filename: 'mediral/js/main.js'});
  await tick();
  if (!fetchFails) assert.deepEqual(errors, [], 'The controller must boot before its behavior is tested');
  const run = code => vm.runInContext(code, context);
  const fire = (name, target) => { for (const handler of listeners.get(name) || []) handler({target}); };
  const flushTimers = async delay => {
    await tick();
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); }
    await tick();
  };
  return {run, slots, pieces, actions, rails, root, marks, set, timers, document, context, animationFrames, inserted, cinemas, poses, errors, medias, film, films, view, section, sectionListeners,
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
    flushStartup: () => flushTimers(8000),
    async releaseData() { resolveData?.(); await tick(); },
    get H() { return H; },
  };
}

/* ---------- first paint: one static opening until the initial cinematic pose exists ---------- */
test('delayed data keeps the startup gate until the first pose, without waiting for fonts or images', async () => {
  const ui = await fixture({pendingData: true, pendingFonts: true, readyState: 'interactive'});
  assert.ok(ui.root.classList.contains('mr-boot'));
  assert.equal(ui.cinemas.length, 0);
  await ui.releaseData();
  assert.ok(ui.poses[0]?.gated, 'The initial cinema render occurs behind the gate');
  assert.ok(!ui.root.classList.contains('mr-boot'));
  assert.equal(ui.context.window.__mediralStartup.pending, false);
  assert.equal([...ui.timers.values()].filter(t => t.delay === 8000).length, 0);
});

for (const hash of ['#step-AC', '#set']) {
  test(`a direct ${hash} link is posed before the startup gate is removed`, async () => {
    const ui = await fixture({url: `https://www.myclover.com/mediral/${hash}`, pendingData: true});
    await ui.releaseData();
    assert.ok(ui.poses.some(pose => pose.gated && pose.scrollY > 0), 'The restored position is rendered before release');
    assert.equal(ui.document.body.dataset.step, hash === '#set' ? 'set' : 'AC');
    assert.ok(!ui.root.classList.contains('mr-boot'));
  });
}

test('data rejection releases the gate into static flow with no inactive order controls', async () => {
  const ui = await fixture({fetchFails: true});
  assert.equal(ui.errors.length, 1);
  assert.ok(ui.root.classList.contains('mr-flow'));
  assert.ok(ui.root.classList.contains('mr-nodata'));
  assert.ok(!ui.root.classList.contains('mr-boot'));
  assert.ok(ui.actions.every(action => action.disabled));
  assert.equal(ui.context.window.__mediralStartup.fallback, true);
});

for (const failure of ['watchdog', 'module-error']) {
  test(`${failure} falls back and a late response never repins or restores an old chapter`, async () => {
    const ui = await fixture({pendingData: true, url: 'https://www.myclover.com/mediral/#step-AC'});
    if (failure === 'watchdog') await ui.flushStartup();
    else ui.windowEvent('error', {target: {id: 'mediral-module'}});
    assert.ok(ui.root.classList.contains('mr-flow'));
    assert.ok(ui.root.classList.contains('mr-nodata'));
    assert.ok(!ui.root.classList.contains('mr-boot'));
    ui.context.scrollY = 1200;
    await ui.releaseData();
    assert.equal(ui.context.scrollY, 1200);
    assert.equal(ui.cinemas.length, 0);
    assert.equal(ui.inserted.length, 0, 'Late content does not shift the static page');
  });
}

test('a late rejected request after static fallback does not insert a new alert or shift the reader', async () => {
  const ui = await fixture({pendingData: true, fetchFails: true});
  await ui.flushStartup();
  ui.context.scrollY = 1200;
  await ui.releaseData();
  assert.equal(ui.context.scrollY, 1200);
  assert.equal(ui.errors.length, 0, 'Fallback already handled this load failure');
  assert.equal(ui.inserted.length, 0);
});

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

test('one order channel: the LINE action reads the verified config; an unverified channel shows no action', async () => {
  const ui = await fixture();
  const link = ui.slots.get('line-link');
  assert.equal(link.hidden, false);
  assert.equal(link.href, routine.order.url);
  assert.match(link.href, /^https:\/\/lin\.ee\/rlSlhzT$/, 'The myClover house LINE, not the brand’s');
  assert.equal(link.textContent, 'แอด LINE สั่งชุดดูแลผิว');
  assert.equal(link.rel, 'noopener');
  assert.equal(ui.slots.get('order-title').textContent, routine.order.heading);
  assert.equal(ui.slots.get('order-how').textContent, routine.order.how);
  assert.match(ui.slots.get('order-how').textContent, /แจ้งราคา ค่าส่ง และวิธีชำระ.*ก่อนยืนยัน/);
  assert.match(ui.slots.get('order-note').textContent, /การสั่งซื้อเกิดขึ้นเมื่อยืนยันในแชตเท่านั้น/, 'Opening LINE is not an order');
  assert.equal(ui.slots.get('route-close').textContent, routine.route.close, 'The close repeats the route in one short line');
  const off = await fixture({line: false});
  assert.equal(off.slots.get('line-link').hidden, true);
});

test('the chosen pieces only shape a message to paste in LINE; none chosen still leaves LINE open', async () => {
  const ui = await fixture();
  assert.equal(ui.slots.get('message').textContent, 'สนใจสั่ง Mediral ชุดดูแลผิว 5 ชิ้น');
  ui.change('BR', false); ui.change('PO', false);
  assert.equal(ui.slots.get('message').textContent, 'สนใจสั่ง Mediral: มูสโฟมล้างหน้า, เซรั่มสำหรับผิวที่เป็นสิวง่าย, เซรั่มกันแดด');
  for (const id of ['CL', 'AC', 'SU']) ui.change(id, false);
  assert.ok(ui.actions.every(button => button.disabled), 'Nothing to copy');
  assert.equal(ui.slots.get('line-link').hidden, false, 'LINE stays available');
  const picks = ui.inserted.find(i => i.target === ui.slots.get('pieces')).html;
  for (const step of routine.steps) {
    assert.match(picks, new RegExp(`href="${step.id.toLowerCase()}/"`), `${step.id}: an exit to its own page`);
    assert.ok(picks.includes(step.order_name));
  }
  assert.match(picks, /เซรั่มสำหรับผิวที่เป็นสิวง่าย[\s\S]*เซรั่มสำหรับผิวที่ดูหมอง/, 'Serums are told apart by what they are for');
});

test('a verified commission link would serve only the full set, disclosed beside it', async () => {
  const ui = await fixture({affiliate: true});
  const link = () => ui.slots.get('buy-link');
  assert.equal(link().href, 'https://shop.example.test/verified-set');
  assert.equal(link().rel, 'noopener sponsored');
  assert.equal(ui.slots.get('disclosure').hidden, false);
  ui.change('BR', false);
  assert.equal(link(), undefined);
  assert.equal(ui.slots.get('disclosure').hidden, true);
});

test('the real exchange is the unchanged screenshot, with Teem’s own experience beside it, not inside it', async () => {
  const ui = await fixture();
  const trust = ui.slots.get('trust').innerHTML;
  assert.match(trust, /src="[^"]*assets\/trust\/owner-chat-original\.jpg" width="640" height="562"/);
  assert.ok(trust.includes(routine.exchange.messages[0].text) && trust.includes(routine.exchange.messages[1].text), 'The alt text quotes both messages exactly');
  assert.doesNotMatch(trust, /<a\b|เปิดดูภาพเต็ม/, 'The attached original photograph is not a lightbox control');
  assert.ok(trust.indexOf('mr-trust__experience') < trust.indexOf('mr-trust__photo'), 'Read the personal letter before its attached exchange');
  assert.match(trust, /น้องงทีม/, 'The original spelling is kept');
  const experience = trust.slice(trust.indexOf('mr-trust__experience'));
  assert.match(experience, /เริ่มจากชอบกลิ่นตอนล้างหน้า จนแฟนหยิบไปลองด้วย/);
  assert.match(experience, /ประสบการณ์ใช้ส่วนตัวของ Teem ผลของแต่ละคนแตกต่างกัน/);
  assert.doesNotMatch(experience, /[“”"]หลังได้ลองใช้/, 'A personal account, not presented as a verbatim quote');
  assert.doesNotMatch(trust, /เซรั่มขวดขาว|AC|รักษา|หายขาด/, 'Not tied to a product, never a cure');
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
  assert.match(field.getAttribute('aria-label'), /ข้อความสั่ง Mediral/);
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
  const rail = ui.slots.get('rail').innerHTML;
  for (const step of routine.steps) assert.match(rail, new RegExp(`data-rail="${step.id}" data-tone="${step.tone.key}" aria-label="ชิ้นที่ ${step.order} ${step.tone.word} ${step.nick}"`), `${step.id}: the rail names the colour with its number`);
});

test('the header takes the chapter on screen, leading its marker slightly, and returns to the page after', async () => {
  const ui = await fixture();
  ui.at(0.2);
  assert.equal(ui.document.body.dataset.chapter, 'routine');
  ui.at(from('AC') - 0.2);
  assert.equal(ui.document.body.dataset.chapter, 'AC', 'A mostly open portal already shows the dark chapter');
  ui.at(from('PO') + 0.1);
  assert.equal(ui.document.body.dataset.chapter, 'PO');
  ui.at(14.5);
  assert.equal(ui.document.body.dataset.chapter, 'close');
  ui.scroll((END + 1) * ui.H + 200);
  assert.equal(ui.document.body.dataset.chapter, 'page');
});

test('the AC film plays from the portal to the lens, never in a hidden tab, and rewinds once per genuine revisit', async () => {
  const calls = [];
  const film = {active: false, setActive(value) { this.active = value; calls.push(value ? 'on' : 'off'); }, rewind() { calls.push('rewind'); }};
  const ui = await fixture({filmFactory: el => el.dataset.filmStep === 'AC' ? film : null});
  await ui.run('bootFilm()');
  ui.at(2.0);
  assert.equal(film.active, false);
  ui.at(3.8);
  assert.equal(film.active, true);
  ui.at(5.8);
  assert.equal(film.active, true, 'Still AC: the film keeps its place under the words');
  ui.hidePage();
  assert.equal(film.active, false);
  ui.returnToPage();
  assert.equal(film.active, true);
  assert.equal(calls.filter(c => c === 'rewind').length, 1, 'Only the first entry into AC counts as a visit');
  calls.length = 0;
  for (const T of [8, 9, 10, 12]) ui.at(T);  // several frames in later chapters
  assert.deepEqual(calls.filter(c => c !== 'off'), [], 'Leaving deactivates; frames elsewhere never seek the film');
  assert.equal(calls[0], 'off', 'Deactivated before anything else happens to it');
  ui.hidePage(); ui.returnToPage();
  assert.ok(!calls.includes('rewind'), 'Tab visibility is not a visit');
  ui.at(4.0);
  const back = calls.slice(calls.lastIndexOf('rewind'));
  assert.equal(calls.filter(c => c === 'rewind').length, 1, 'A genuine return rewinds once');
  assert.deepEqual(back.slice(0, 2), ['rewind', 'on'], 'Rewound before it may play again');
});

test('each chapter owns one film: direct jumps stop the old pass before the next wakes; revisits stay independent', async () => {
  const calls = [], films = new Map();
  const ui = await fixture({filmFactory: el => {
    const id = el.dataset.filmStep;
    const api = {active: false, setActive(value) {
      this.active = value;
      calls.push(`${id}:${value ? 'on' : 'off'}`);
      assert.ok([...films.values()].filter(f => f.active).length <= 1, 'Only one chapter can play at a time, even on backwards jumps');
    }, rewind() { calls.push(`${id}:rewind`); }};
    films.set(id, api); return api;
  }});
  await ui.run('bootFilm()');
  await ui.run('bootFilm()');
  assert.equal(films.size, 5);
  for (const [id, T] of [['AC', 3.8], ['MELT', 6.5], ['BR', 7.2], ['SU', 9.8], ['PO', 12.3], ['AC', 4]]) {
    ui.at(T);
    assert.equal(films.get(id).active, true);
    assert.deepEqual([...films].filter(([, f]) => f.active).map(([key]) => key), [id]);
  }
  assert.equal(calls.filter(c => c === 'AC:rewind').length, 2);
  assert.equal(calls.filter(c => c === 'BR:rewind').length, 1);
  assert.equal(calls.filter(c => c === 'SU:rewind').length, 1);
  ui.at(7.3);
  const rewinds = calls.filter(c => c === 'BR:rewind').length;
  ui.at(8.4); ui.at(7.4); // outside playback, still within this visit
  ui.hidePage(); ui.returnToPage();
  assert.equal(calls.filter(c => c === 'BR:rewind').length, rewinds);
  assert.equal(films.get('BR').active, true);
  ui.at(14.6);
  assert.ok([...films.values()].every(f => !f.active));
  assert.ok(ui.pieces.every(p => p.checked), 'Films never change the order selection');
});

test('a failed chapter film does not prevent the other films; normal flow never activates any', async () => {
  const films = new Map();
  const ui = await fixture({flow: true, filmFactory: el => {
    if (el.dataset.filmStep === 'BR') throw new Error('missing optional film');
    const api = {setActive(value) { this.active = value; }, rewind() {}};
    films.set(el.dataset.filmStep, api); return api;
  }});
  await ui.run('bootFilm()');
  assert.equal(films.size, 4);
  for (const T of [3.8, 7.2, 9.8]) ui.at(T);
  assert.ok([...films.values()].every(f => !f.active));
  assert.ok(!ui.root.classList.contains('mr-nodata'));
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
  assert.ok(!ui.root.classList.contains('mr-boot'));
  assert.equal(ui.context.window.__mediralStartup.pending, false);
  assert.ok(ui.actions.every(button => !button.disabled));
  ui.scroll(1200);
  assert.equal(ui.document.body.dataset.chapter, 'page');
});

/* ---------- optional depth ---------- */
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

test('an old link to a product’s ingredient list opens that product’s own page', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#formula-BR'});
  assert.equal(ui.context.location.replaced, 'br/#ingredients');
});

test('an incoming order link is restored below the header after the story is mounted', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#order', readyState: 'interactive', pendingFonts: true});
  const target = () => (END + 1) * ui.H + 600 - 86;
  assert.equal(ui.context.scrollY, target());
  ui.shiftSet(200);
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, target() + 200);
});

for (const [hash, target] of [['#lab-film', 'AC'], ['#beat-BR-1', 'BR'], ['#founder', 'set'], ['#relay', 'set'], ['#serums', 'set'], ['#ingredients', 'set']]) {
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
