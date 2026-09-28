import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const entry = new URL('../../mediral/js/main.js', import.meta.url);
const source = readFileSync(entry, 'utf8').replaceAll('import.meta.url', JSON.stringify(entry.href))
  // Mock only the scene module boundary so the real asynchronous boot path remains under test.
  .replace("import('./story.js')", 'globalThis.loadStoryModule()')
  .replace("import('./lab-film.js')", 'globalThis.loadFilmModule()');
const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));

// Execute the real controller with a small DOM adapter. No browser or graphics emulation:
// assertions cover the visible offer, action state, input selection and accessibility attributes.
async function fixture({url = 'https://www.myclover.com/mediral/', clock = '2026-09-28T05:00:00Z', clipboardFails = false, verifiedLink = false, readyState = 'complete', pendingFonts = false, readingChapters = [], storyFactory, filmFactory, stacked = false, flow = false, productScrollMargin = '0px'} = {}) {
  const listeners = new Map();
  const windowListeners = new Map();
  const timers = new Map();
  const slots = new Map();
  const errors = [];
  let now = Date.parse(clock);
  let context;
  let timerId = 0;
  let sectionHeight = 1500;
  let resolveFonts;
  const fontReady = pendingFonts ? new Promise(resolve => { resolveFonts = resolve; }) : Promise.resolve();
  const addWindowListener = (name, handler, options = {}) => {
    if (!windowListeners.has(name)) windowListeners.set(name, []);
    windowListeners.get(name).push({handler, once: options.once});
  };
  const removeWindowListener = (name, handler) => {
    windowListeners.set(name, (windowListeners.get(name) || []).filter(entry => entry.handler !== handler));
  };
  const fireWindow = name => {
    for (const entry of [...(windowListeners.get(name) || [])]) {
      if (entry.once) removeWindowListener(name, entry.handler);
      entry.handler({type: name});
    }
  };
  const classList = () => {
    const items = new Set();
    return {add: (...names) => names.forEach(n => items.add(n)), remove: (...names) => names.forEach(n => items.delete(n)),
      contains: n => items.has(n), toggle(n, force = !items.has(n)) { force ? items.add(n) : items.delete(n); return force; }};
  };
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.classList = classList(); this.attributes = new Map(); this.dataset = {}; this.children = []; this.disabled = false; this.checked = true; this._html = ''; this._text = ''; this.nodes = new Map(); }
    set innerHTML(value) { this._html = String(value); this.children = []; }
    get innerHTML() { return this._html; }
    set textContent(value) { this._text = String(value); this.children = []; this._html = ''; }
    get textContent() { return this._text + this.children.map(c => c.textContent || '').join(''); }
    insertAdjacentHTML(_position, value) { this._html += value; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); if (['href', 'target', 'rel'].includes(name)) delete this[name]; }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    append(...children) { this.children.push(...children); }
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    closest(selector) { return selector === '[data-piece]' && this.value ? this : selector === '[data-action]' && this.dataset.action ? this : null; }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
    querySelectorAll(selector) { if (this.allNodes?.has(selector)) return this.allNodes.get(selector); return selector === '.mr-phase li' ? [new Element(), new Element(), new Element()] : selector === '.mr-lab__tabs button' ? Array.from({length: 5}, (_, i) => this.querySelector(`button-${i}`)) : selector === '[data-formula-index]' ? Array.from({length: 8}, (_, i) => this.querySelector(`formula-button-${i}`)) : []; }
    getBoundingClientRect() { return {top: 0, right: 450, left: 760}; }
    getContext() { return {getExtension: () => null}; }
  }
  const root = new Element('html');
  const readingNodes = readingChapters.map(chapter => {
    const el = new Element(chapter.tag || 'section');
    el.id = chapter.id;
    el.scrollMarginTop = chapter.scrollMarginTop || '0px';
    if (chapter.tag === 'details') el.open = false;
    el.offsetHeight = chapter.height;
    el.getBoundingClientRect = () => {
      const top = (root.classList.contains('mr-static') ? chapter.staticTop : chapter.top) - context.scrollY;
      return {top, bottom: top + chapter.height};
    };
    return el;
  });
  const pieces = routine.steps.map(step => Object.assign(new Element('input'), {value: step.id}));
  const rows = routine.steps.map(step => { const el = new Element(); el.dataset.row = step.id; return el; });
  const rails = [...routine.steps, {id: 'set'}].map(step => { const el = new Element('a'); el.dataset.rail = step.id; return el; });
  const actions = ['copy', 'card'].map(action => { const el = new Element('button'); el.dataset.action = action; return el; });
  // Inline custom properties written by the scene engine are recorded as the page would hold them.
  const styleStore = () => { const values = new Map(); return {setProperty: (k, v) => values.set(k, String(v)), getPropertyValue: k => values.get(k) ?? '', values}; };
  const sections = ['routine', ...rails].map((_, i) => {
    const el = new Element('section');
    el.id = i === 0 ? 'routine' : i === 6 ? 'set' : `step-${routine.steps[i - 1].id}`;
    el.scrollMarginTop = i > 0 && i < 6 ? productScrollMargin : '0px';
    el.style = styleStore();
    if (i > 0 && i < 6) {
      const step = routine.steps[i - 1];
      el.dataset = {step: step.id, scene: step.id, grammar: step.scene.grammar, pin: 'true'};
    }
    Object.defineProperty(el, 'offsetHeight', {get: () => root.classList.contains('mr-static') ? 600 : sectionHeight});
    el.getBoundingClientRect = () => ({top: i * el.offsetHeight - context.scrollY, bottom: (i + 1) * el.offsetHeight - context.scrollY, height: el.offsetHeight});
    return el;
  });
  const scenes = sections.slice(1, 6);
  const film = new Element(); film.id = 'lab-film';
  for (const name of ['routine-map', 'routine-still', 'hero-offer', 'compare', 'uses', 'hero-body', 'steps', 'library', 'rail', 'word', 'set-headline', 'pieces', 'set-row', 'offer', 'summary', 'buy-link', 'buy-hint', 'disclosure']) slots.set(name, new Element());
  const document = {
    documentElement: root, body: new Element('body'), visibilityState: 'visible', activeElement: null, readyState, fonts: {ready: fontReady},
    createElement: tag => new Element(tag),
    addEventListener(name, handler) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); },
    querySelector(selector) {
      const match = selector.match(/^\[data-slot="([^"]+)"\]$/);
      if (match) return slots.get(match[1]);
      if (selector === '#routine') return sections[0];
      if (selector.startsWith('#step-')) return sections[routine.steps.findIndex(s => selector === `#step-${s.id}`) + 1];
      if (selector === '#set') return sections[6];
      if (selector === '#lab-film') return film;
      const reading = readingNodes.find(node => selector === `#${node.id}`);
      if (reading) return reading;
      if (selector.startsWith('[data-lab=') || selector.startsWith('[data-formula-group=')) { if (!slots.has(selector)) slots.set(selector, new Element()); return slots.get(selector); }
      if (selector === '[data-piece]') return pieces[0];
      if (selector === '#set .mr-card') return new Element();
      return new Element();
    },
    querySelectorAll(selector) {
      if (selector === '#story [data-step]') return sections.slice(1, 6);
      if (selector === '[data-scene]') return scenes;
      if (selector === '.mr-reading-chapter') return readingNodes;
      if (selector === '[data-piece]') return pieces;
      if (selector === '[data-row]') return rows;
      if (selector === '[data-rail]') return rails;
      if (selector === '[data-action]' || selector === '[data-action="copy"], [data-action="card"]') return actions;
      if (selector === '.mr-chapter, .mr-scene, .mr-note, .mr-library') return sections;
      return [];
    },
  };
  const media = {matches: false, addEventListener(_name, listener) { this.change = listener; }};
  const stackedMedia = {matches: stacked, addEventListener() {}};
  const flowMedia = {matches: flow, addEventListener() {}};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const data = structuredClone(routine);
  if (verifiedLink) data.buy = {...data.buy, status: 'verified', affiliate_url: 'https://shop.example.test/verified-set'};
  context = vm.createContext({document, location: new URL(url), URL, URLSearchParams, Intl, Date: ClockDate, console: {warn() {}, error: (...args) => errors.push(args)},
    navigator: {clipboard: {writeText: async () => { if (clipboardFails) throw new Error('denied'); }}},
    matchMedia: query => query === '(max-width: 1100px)' ? stackedMedia : query === '(max-height: 699px)' ? flowMedia : media, innerHeight: 500, innerWidth: 1000, scrollY: 0,
    getComputedStyle: el => ({scrollMarginTop: el.scrollMarginTop || '0px'}),
    addEventListener: addWindowListener, removeEventListener: removeWindowListener, IntersectionObserver: class { observe() {} },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ok: true, json: async () => data}),
    loadStoryModule: async () => ({createStory: storyFactory}),
    loadFilmModule: async () => ({initLabFilm: filmFactory}),
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
  return {run, slots, pieces, actions, rails, root, media, timers, document, context, scenes, animationFrames,
    change(id, checked) { const box = pieces.find(p => p.value === id); box.checked = checked; fire('change', box); },
    restore() { const button = new Element('button'); button.dataset.action = 'select-all'; fire('click', button); },
    readingNodes,
    followLink(href) { fire('click', {closest: selector => selector === 'a[href^="#formula-"]' && href.startsWith('#formula-') ? {getAttribute: () => href} : null}); },
    toggleAtlas() { fire('toggle', {matches: selector => selector === '.mr-ingredient-atlas'}); },
    clock(value) { now = Date.parse(value); },
    returnToPage() { document.visibilityState = 'visible'; fire('visibilitychange'); },
    hidePage() { document.visibilityState = 'hidden'; fire('visibilitychange'); },
    scroll(y) { context.scrollY = y; run('onScroll()'); },
    layout(height) { sectionHeight = height; },
    load() { document.readyState = 'complete'; fireWindow('load'); },
    fontsReady() { resolveFonts?.(); },
    windowEvent: fireWindow,
    // Temporary incoming-link restorers only; the permanent atlas hash opener is expected to stay.
    initialLinkListeners() { return ['wheel', 'touchstart', 'pointerdown', 'keydown', 'load', 'hashchange', 'pagehide'].reduce((count, name) => count + (windowListeners.get(name) || []).filter(entry => !String(entry.handler).includes('openAtlas')).length, 0); },
    windowListenerSources(name) { return (windowListeners.get(name) || []).map(entry => String(entry.handler)); },
    async flushImmediateTimers() {
      await tick();
      for (const [id, timer] of [...timers]) if (timer.delay === 0) { timers.delete(id); timer.fn(); }
      await tick();
    },
  };
}

for (const [date, expected, price] of [
  ['2026-09-20', 'ยังไม่ถึง', false],
  ['2026-09-21', 'ข้อเสนอที่พบ', true],
  ['2026-09-30', 'ข้อเสนอที่พบ', true],
  ['2026-10-01', 'สิ้นสุดแล้ว', false],
]) test(`poster offer on ${date} observes both calendar boundaries`, async () => {
  const ui = await fixture({url: `http://localhost:3000/mediral/?today=${date}`});
  const offer = ui.slots.get('offer').innerHTML;
  assert.match(offer, new RegExp(expected));
  assert.equal(offer.includes('฿1,899'), price);
});

test('public and invalid local date overrides cannot revive an expired offer', async () => {
  for (const url of ['https://www.myclover.com/mediral/?today=2026-09-28', 'http://localhost/mediral/?today=2026-02-31']) {
    const ui = await fixture({url, clock: '2026-10-01T00:00:00Z'});
    assert.match(ui.slots.get('offer').innerHTML, /สิ้นสุดแล้ว/);
    assert.doesNotMatch(ui.slots.get('offer').innerHTML, /1,899/);
  }
});

test('returning to the tab and Bangkok midnight refresh the displayed offer', async () => {
  const ui = await fixture({clock: '2026-09-30T16:59:30Z'});
  assert.match(ui.slots.get('offer').innerHTML, /1,899/);
  const timer = [...ui.timers.values()][0];
  assert.equal(timer.delay, 30_050, 'Expiry is scheduled at Bangkok midnight, not local-machine midnight');
  ui.clock('2026-09-30T17:00:01Z');
  timer.fn();
  assert.match(ui.slots.get('offer').innerHTML, /สิ้นสุดแล้ว/);
  ui.clock('2026-09-28T00:00:00Z');
  ui.returnToPage();
  assert.match(ui.slots.get('offer').innerHTML, /1,899/);
});

test('partial and empty saved lists cannot use the fixed bundle price or verified checkout', async () => {
  const ui = await fixture({verifiedLink: true});
  const link = ui.slots.get('buy-link');
  assert.equal(link.href, 'https://shop.example.test/verified-set');
  ui.change('BR', false);
  assert.doesNotMatch(ui.slots.get('offer').innerHTML, /1,899/);
  assert.equal(link.href, undefined);
  assert.equal(link.getAttribute('aria-disabled'), 'true');
  assert.match(ui.slots.get('summary').innerHTML, /data-action="select-all"/);
  for (const id of ['CL', 'AC', 'SU', 'PO']) ui.change(id, false);
  assert.ok(ui.actions.every(button => button.disabled));
  assert.match(ui.slots.get('summary').innerHTML, /data-action="select-all"/);
  ui.restore();
  assert.ok(ui.pieces.every(box => box.checked));
  assert.ok(ui.actions.every(button => !button.disabled));
  assert.equal(link.href, 'https://shop.example.test/verified-set');
  assert.match(ui.slots.get('offer').innerHTML, /1,899/);
  assert.equal(ui.document.activeElement, ui.slots.get('summary'));
});

test('a URL without verified status remains inert', async () => {
  const ui = await fixture();
  ui.run('state.data.buy.affiliate_url = "https://shop.example.test/not-verified"; renderBuy()');
  assert.equal(ui.slots.get('buy-link').href, undefined);
  assert.equal(ui.slots.get('buy-link').getAttribute('aria-disabled'), 'true');
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

test('method, timing and size are inside the expandable product details', async () => {
  const ui = await fixture();
  const html = ui.run('stepBody(state.data.steps[1])');
  const details = html.slice(html.indexOf('<details'), html.indexOf('</details>'));
  assert.match(details, /วิธีใช้และรายละเอียดชิ้นนี้/);
  assert.match(details, /class="mr-facts"/);
  assert.ok(details.includes(routine.steps[1].how));
  assert.ok(details.includes(routine.steps[1].size));
});

test('rail and active role do not advance during the final viewport of a chapter', async () => {
  const ui = await fixture();
  ui.scroll(2999);
  assert.equal(ui.run('state.active'), 0);
  assert.equal(ui.rails[0].getAttribute('aria-current'), 'step');
  ui.scroll(3000);
  assert.equal(ui.run('state.active'), 1);
  assert.equal(ui.rails[0].getAttribute('aria-current'), null);
  assert.equal(ui.rails[1].getAttribute('aria-current'), 'step');
  assert.equal(ui.rails.filter(a => a.getAttribute('aria-current')).length, 1);
});

test('context recovery and motion preference changes keep the reader and saved list in place', async () => {
  const ui = await fixture();
  ui.run('state.stage = {pause() {}, resume() {}, setProgress() {}, setMood() {}, setReducedMotion(value) { this.reduced = value; }}');
  ui.change('CL', false);
  ui.scroll(4900);
  ui.run('onContextChange("lost")');
  assert.ok(ui.root.classList.contains('mr-static'));
  assert.equal(ui.run('state.active'), 2);
  assert.equal(ui.context.scrollY, 1840);
  ui.run('onContextChange("restored")');
  assert.ok(ui.root.classList.contains('mr-3d'));
  assert.ok(!ui.root.classList.contains('mr-static'));
  assert.equal(ui.context.scrollY, 4900);
  ui.media.change({matches: true});
  assert.ok(ui.root.classList.contains('mr-reduced'));
  assert.equal(ui.run('state.stage.reduced'), true);
  ui.media.change({matches: false});
  assert.ok(!ui.root.classList.contains('mr-reduced'));
  assert.equal(ui.run('state.stage.reduced'), false);
  assert.equal(ui.run('state.active'), 2);
  assert.equal(ui.run('state.selection.has("CL")'), false);
});


test('the routine opens with all five roles before the first product chapter', async () => {
  const ui = await fixture();
  assert.equal(ui.run('state.u'), -1);
  assert.equal(ui.document.body.dataset.step, 'routine');
  assert.equal(ui.rails.filter(a => a.getAttribute('aria-current')).length, 0);
  for (const step of routine.steps) assert.ok(ui.slots.get('routine-map').innerHTML.includes(`#step-${step.id}`));
  ui.scroll(1499);
  assert.equal(ui.run('state.active'), -1);
  ui.scroll(1500);
  assert.equal(ui.document.body.dataset.step, 'CL');
  assert.equal(ui.rails[0].getAttribute('aria-current'), 'step');
});

test('the complete atlas is optional deep reading after the offer, with every name and role retained', async () => {
  const ui = await fixture();
  const steps = ui.slots.get('steps').innerHTML;
  const library = ui.slots.get('library').innerHTML;
  assert.doesNotMatch(steps, /id="formula-/, 'Full ingredient lists no longer lengthen the product story');
  for (const step of routine.steps.filter(s => s.id !== 'CL')) {
    const html = ui.run(`ingredientAtlas(byId('${step.id}'))`);
    const opening = html.match(/^<details\b[^>]*>/)?.[0];
    assert.ok(opening, `${step.id}: the atlas is a disclosure`);
    assert.match(opening, new RegExp(`id="formula-${step.id}"`));
    assert.doesNotMatch(opening, /\sopen\b/, `${step.id}: closed until the reader or a direct link opens it`);
    assert.match(html, /<summary\b/, `${step.id}: a keyboard-operable summary names the product`);
    const count = step.featured.length + step.ingredients.length;
    assert.match(html, new RegExp(`${count} ชื่อ`), `${step.id}: the closed summary states how many names it holds`);
    assert.equal((html.match(/data-formula-index=/g) || []).length, count);
    for (const ingredient of [...step.featured, ...step.ingredients]) assert.ok(html.includes(`>${ingredient.name}</button>`), ingredient.name);
    assert.ok(library.includes(`id="formula-${step.id}"`), `${step.id}: rendered in the library`);
    assert.ok(html.includes(step.how), `${step.id}: method lives with the complete list`);
    assert.match(steps, new RegExp(`href="#formula-${step.id}"[^>]*>ส่วนผสมทั้งหมด ${count} ชื่อ`), `${step.id}: the scene links to its full list`);
    for (const group of step.ingredient_groups.filter(g => g.ingredientNames.length)) {
      assert.ok(html.includes(group.title), `${step.id}: the optional library retains every ingredient family`);
    }
  }
  const mousse = ui.run('ingredientAtlas(byId("CL"))');
  assert.match(mousse, /^<details\b[^>]*id="formula-CL"/, 'The mousse keeps a details entry for its method and provenance');
  assert.doesNotMatch(mousse, /data-formula-index=/, 'The unconfirmed mousse formula has no ingredient names');
  assert.ok(mousse.includes(routine.steps[0].ingredients_note));
});

test('direct, in-page and history links open a closed atlas before the reader lands on it', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#formula-SU', readingChapters: [
    {id: 'formula-SU', tag: 'details', top: 9100, staticTop: 5200, height: 1200},
    {id: 'formula-AC', tag: 'details', top: 7600, staticTop: 4200, height: 1200},
  ]});
  await ui.flushImmediateTimers();
  const [su, ac] = ui.readingNodes;
  assert.equal(su.open, true, 'A fresh URL opens its own atlas');
  assert.equal(ui.context.scrollY, 9100);
  assert.equal(ac.open, false, 'Other atlases stay closed');
  ui.followLink('#formula-AC');
  assert.equal(ac.open, true, 'The click opens the atlas before the browser follows the anchor');
  ac.open = false;
  ui.context.location.hash = '#formula-AC';
  ui.windowEvent('hashchange');
  assert.equal(ac.open, true, 'Back/forward navigation opens it again');
  assert.equal(ui.run('openAtlas("#formula-AC\\" onmouseover=\\"x")'), null, 'Only product atlas ids are accepted');
});

test('opening or closing an atlas re-measures reading isolation without a scroll event', async () => {
  const scene = sceneBoundary();
  const chapter = {id: 'formula-BR', tag: 'details', top: 9000, staticTop: 5200, height: 300};
  const ui = await fixture({storyFactory: async () => scene, readingChapters: [chapter]});
  await ui.run('bootStage()');
  ui.scroll(8600);
  assert.equal(scene.state.paused, false);
  chapter.top = 8600; // The disclosure above opened and moved this atlas under the header.
  chapter.height = 1400;
  ui.toggleAtlas();
  assert.equal(ui.document.body.dataset.readingChapter, 'formula-BR');
  assert.equal(scene.state.paused, true);
  chapter.top = 9000;
  chapter.height = 300;
  ui.toggleAtlas();
  assert.equal(ui.document.body.dataset.readingChapter, undefined);
  assert.equal(scene.state.paused, false);
});

test('fresh atlas and product URLs honour the clearance assigned to their target', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#formula-AC', readyState: 'interactive', pendingFonts: true,
    readingChapters: [{id: 'formula-AC', tag: 'details', top: 7600, staticTop: 4200, height: 1200, scrollMarginTop: '102px'}]});
  assert.equal(ui.context.scrollY, 7498, 'The summary is not hidden at y=0 under the header');
  ui.load();
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 7498, 'Repeated restoration after load and fonts keeps the same clearance');
  const product = await fixture({url: 'https://www.myclover.com/mediral/#step-SU'});
  assert.equal(product.context.scrollY, 6000, 'Product chapters still start their scene at the exact top');
});

test('stacked layouts read the purchase card like a chapter and pause the scene; desktop keeps the set scene', async () => {
  for (const stacked of [true, false]) {
    const scene = sceneBoundary();
    const ui = await fixture({stacked, storyFactory: async () => scene});
    await ui.run('bootStage()');
    ui.change('BR', false);
    ui.scroll(8000); // powder chapter
    assert.equal(scene.state.paused, false);
    ui.scroll(9000); // #set reaches the top after the header shortcut
    assert.equal(ui.document.body.dataset.readingChapter, stacked ? 'set' : undefined);
    assert.equal(scene.state.paused, stacked, stacked ? 'No frames behind the full-width offer' : 'Desktop set scene keeps rendering');
    assert.equal(ui.document.body.dataset.step, 'set', 'Scene progress and the rail still reach the set');
    assert.equal(ui.run('state.selection.has("BR")'), false, 'Layout gating never changes the saved list');
    ui.scroll(8000);
    assert.equal(scene.state.paused, false);
  }
});

test('the controller and scene share one stacked-layout query', () => {
  const main = readFileSync(new URL('../../mediral/js/main.js', import.meta.url), 'utf8');
  const story = readFileSync(new URL('../../mediral/js/story.js', import.meta.url), 'utf8');
  const query = story.match(/export const STACKED_QUERY = '([^']+)'/)?.[1];
  assert.ok(query);
  assert.ok(main.includes(`matchMedia('${query}')`));
});

test('the opening names every role with its product and brand-stated time, then routes to the offer', async () => {
  const ui = await fixture();
  const map = ui.slots.get('routine-map').innerHTML;
  for (const step of routine.steps) {
    assert.match(map, new RegExp(`href="#step-${step.id}"`));
    assert.ok(map.includes(step.role_short), `${step.id}: role first`);
    assert.ok(map.includes(step.nick), `${step.id}: then the product`);
    assert.ok(map.includes(step.when.join(' · ')), `${step.id}: then when it is used`);
  }
});

test('the opening shows the fixed set’s dated poster offer, independent of a partial saved list', async () => {
  const ui = await fixture({url: 'http://localhost:3000/mediral/?today=2026-09-28'});
  const hero = () => ui.slots.get('hero-offer').innerHTML;
  assert.match(hero(), /฿1,899/);
  assert.match(hero(), /โปสเตอร์/, 'The price is identified as poster evidence');
  assert.match(hero(), /ยังไม่ยืนยันในตะกร้า/);
  ui.change('BR', false);
  assert.match(hero(), /฿1,899/, 'The opening describes the fixed set, not the reader’s saved list');
  assert.doesNotMatch(ui.slots.get('offer').innerHTML, /1,899/, 'The saved-list summary still refuses the bundle price');
  for (const [date, text] of [['2026-09-20', 'ยังไม่เริ่ม'], ['2026-10-01', 'สิ้นสุดแล้ว']]) {
    const later = await fixture({url: `http://localhost:3000/mediral/?today=${date}`});
    assert.doesNotMatch(later.slots.get('hero-offer').innerHTML, /1,899/);
    assert.match(later.slots.get('hero-offer').innerHTML, new RegExp(text));
  }
});

test('Bangkok midnight retires the opening offer together with the set offer', async () => {
  const ui = await fixture({clock: '2026-09-30T16:59:30Z'});
  assert.match(ui.slots.get('hero-offer').innerHTML, /1,899/);
  ui.clock('2026-09-30T17:00:01Z');
  [...ui.timers.values()][0].fn();
  assert.doesNotMatch(ui.slots.get('hero-offer').innerHTML, /1,899/);
  assert.doesNotMatch(ui.slots.get('offer').innerHTML, /1,899/);
});

test('the two serums are compared by role and brand-stated time, never as a combined regimen', async () => {
  const ui = await fixture();
  const compare = ui.slots.get('compare').innerHTML;
  const cards = compare.match(/<article\b/g) || [];
  assert.equal(cards.length, 2);
  for (const step of routine.steps) {
    const shown = compare.includes(`href="#step-${step.id}"`);
    assert.equal(shown, ['AC', 'BR'].includes(step.id), `${step.id}: only the two serums are compared`);
    if (!shown) continue;
    assert.ok(compare.includes(step.headline));
    for (const beat of step.selling.beats.slice(0, 2)) assert.ok(compare.includes(beat.title));
    assert.ok(compare.includes(step.when.join(' · ')));
    assert.ok(compare.includes(step.selling.choose));
    assert.match(compare, new RegExp(`href="#formula-${step.id}"`));
  }
  assert.match(compare, /ภาพแพ็ก AI ฉบับร่าง/);
  assert.doesNotMatch(compare, /ทาคู่|ใช้คู่|ใช้ร่วมกัน|เสริมฤทธิ์|ได้ผลดีกว่า|ทาก่อน|ทาหลัง/);
});

test('the use-time table repeats source timing and how-to without inventing a layering sequence', async () => {
  const ui = await fixture();
  const table = ui.slots.get('uses').innerHTML;
  const rows = table.split('<tr>').slice(2);
  assert.equal(rows.length, routine.steps.length);
  routine.steps.forEach((step, i) => {
    const row = rows[i];
    assert.ok(row.includes(step.nick));
    assert.ok(row.includes(step.when.join(' · ')));
    assert.ok(row.includes(step.how));
  });
  assert.doesNotMatch(table, /บำรุงชั้นที่|ลงต่อจาก|ทาคู่/);
});

test('reading a non-featured ingredient changes its attributed detail without moving or selecting products', async () => {
  const ui = await fixture();
  ui.change('PO', false);
  ui.scroll(3800);
  const before = ui.run('[...state.selection].join(",")');
  ui.run('chooseFormulaIngredient("AC", 1, 4)');
  const expected = ui.run('formulaIngredients(byId("AC"), 1)[4]');
  const panel = ui.slots.get('[data-formula-group="AC:1"]');
  assert.equal(panel.querySelector('.mr-ingredient-group__name').textContent, expected.name);
  assert.equal(panel.querySelector('.mr-ingredient-group__benefit').textContent, expected.benefit);
  assert.ok(panel.querySelector('.mr-ingredient-group__source').textContent.includes(expected.benefit_source));
  assert.equal(panel.querySelector('formula-button-4').getAttribute('aria-pressed'), 'true');
  assert.equal(panel.querySelector('formula-button-0').getAttribute('aria-pressed'), 'false');
  assert.equal(ui.context.scrollY, 3800);
  assert.equal(ui.run('[...state.selection].join(",")'), before);
});

test('atlas links and context recovery retain the reading chapter without advancing product indices', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#formula-AC', readingChapters: [{id: 'formula-AC', top: 4100, staticTop: 1900, height: 1500}]});
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 4100);
  ui.scroll(4280);
  assert.equal(ui.document.body.dataset.readingChapter, 'formula-AC');
  ui.run('onContextChange("lost")');
  assert.equal(ui.context.scrollY, 2080, 'Preserve the same offset within the reading chapter after layout collapse');
  assert.equal(ui.document.body.dataset.readingChapter, 'formula-AC');
  assert.equal(ui.run('sections().length'), 7, 'Additional reading chapters are not extra products');
});

function sceneBoundary() {
  return {
    state: {contextLost: false, paused: false}, progress: [], calls: [],
    pause() { this.state.paused = true; this.calls.push('pause'); },
    resume() { this.state.paused = false; this.calls.push('resume'); },
    setProgress(value) { this.progress.push({value, paused: this.state.paused}); },
    setMood(value) { this.mood = value; }, setReducedMotion() {}, dispose() {},
  };
}

test('reading chapters pause the scene, keep targets current and prevent a tab return from resuming it', async () => {
  const scene = sceneBoundary();
  const ui = await fixture({storyFactory: async () => scene,
    readingChapters: [{id: 'formula-AC', top: 4100, staticTop: 1900, height: 1500}]});
  await ui.run('bootStage()');
  assert.equal(ui.run('state.stage'), scene, 'Exercise the controller’s real scene boot path');
  ui.change('PO', false);
  ui.scroll(4280);
  assert.equal(scene.state.paused, true);
  assert.equal(ui.document.body.dataset.readingChapter, 'formula-AC');
  const targetCount = scene.progress.length;
  ui.scroll(4380);
  assert.ok(scene.progress.length > targetCount, 'Scroll still supplies progress while rendering is paused');
  assert.deepEqual(scene.progress.at(-1), {value: ui.run('state.u'), paused: true});
  ui.hidePage();
  ui.returnToPage();
  assert.equal(scene.state.paused, true, 'A visible tab is not enough when a reading chapter still covers the canvas');
  ui.scroll(5800);
  assert.equal(scene.state.paused, false, 'Leaving the reading chapter resumes the scene');
  assert.equal(ui.document.body.dataset.readingChapter, undefined);
  assert.deepEqual(scene.progress.at(-1), {value: ui.run('state.u'), paused: false});
  assert.equal(ui.run('state.selection.has("PO")'), false, 'Playback gating never changes the saved list');
});

test('a scene that finishes loading inside a reading chapter is paused before boot supplies its progress', async () => {
  const scene = sceneBoundary();
  let finishScene;
  const ui = await fixture({storyFactory: () => new Promise(resolve => { finishScene = resolve; }),
    readingChapters: [{id: 'formula-BR', top: 4100, staticTop: 1900, height: 1500}]});
  const boot = ui.run('bootStage()');
  await tick();
  ui.scroll(4280); // The reader moves while scene textures are still loading.
  finishScene(scene);
  await boot;
  assert.equal(ui.run('state.stage'), scene);
  assert.equal(scene.state.paused, true);
  assert.equal(scene.calls[0], 'pause', 'Do not wake the newly loaded scene behind the reading chapter');
  assert.ok(scene.progress.length > 0);
  assert.ok(scene.progress.every(target => target.paused), 'Boot and availability updates both preserve the gate');
  assert.equal(scene.progress.at(-1).value, ui.run('state.u'));
});

test('a hidden-tab scene boot stays paused and resumes only when the visible product scene returns', async () => {
  const scene = sceneBoundary();
  let finishScene;
  const ui = await fixture({storyFactory: () => new Promise(resolve => { finishScene = resolve; })});
  const boot = ui.run('bootStage()');
  await tick();
  ui.hidePage();
  finishScene(scene);
  await boot;
  assert.equal(scene.state.paused, true);
  assert.ok(scene.progress.every(target => target.paused));
  ui.returnToPage();
  assert.equal(scene.state.paused, false);
});

test('incoming product links resolve after the dynamic chapters exist', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU'});
  assert.equal(ui.context.scrollY, 6000);
  assert.equal(ui.document.body.dataset.step, 'SU');
  assert.equal(ui.rails[3].getAttribute('aria-current'), 'step');
});

test('an incoming chapter wins late native reload restoration and font layout, then releases its listeners', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU', readyState: 'interactive', pendingFonts: true});
  assert.equal(ui.context.scrollY, 6000);
  ui.scroll(1500); // A native reload restores the old offset after the dynamic chapter was placed.
  ui.load();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 6000);
  assert.equal(ui.document.body.dataset.step, 'SU');
  assert.ok(ui.initialLinkListeners() > 0, 'Late font layout can still move the destination');
  ui.layout(1700);
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 6800, 'Use the current chapter position, not the first measured offset');
  assert.equal(ui.document.body.dataset.step, 'SU');
  assert.equal(ui.initialLinkListeners(), 0);
  ui.scroll(1200);
  ui.load();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 1200, 'A completed restorer cannot keep pulling the reader back');
});

test('late fonts are handled when the document was already loaded before data arrived', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-BR', pendingFonts: true});
  await ui.flushImmediateTimers();
  ui.layout(1800);
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 5400);
  assert.equal(ui.document.body.dataset.step, 'BR');
  assert.equal(ui.initialLinkListeners(), 0);
});

test('reader input cancels queued incoming-link restoration and removes every temporary listener', async () => {
  for (const input of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU', readyState: 'interactive', pendingFonts: true});
    ui.load(); // Queue the correction, then let a reader act before it fires.
    ui.windowEvent(input);
    ui.scroll(1750);
    ui.layout(1700);
    ui.fontsReady();
    await ui.flushImmediateTimers();
    assert.equal(ui.context.scrollY, 1750, `${input}: respect the reader's new position`);
    assert.equal(ui.initialLinkListeners(), 0, `${input}: no dormant temporary listeners`);
  }
});

test('a different hash or leaving the page cancels its pending initial chapter correction', async () => {
  for (const event of ['hashchange', 'pagehide']) {
    const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU', readyState: 'interactive', pendingFonts: true});
    if (event === 'hashchange') ui.context.location.hash = '#step-AC';
    ui.windowEvent(event);
    ui.scroll(3100);
    ui.fontsReady();
    ui.load();
    await ui.flushImmediateTimers();
    assert.equal(ui.context.scrollY, 3100);
    assert.equal(ui.initialLinkListeners(), 0);
  }
});

test('five scenes carry the ad copy, the fifteen attributed beats and a crisp pack without any motion', async () => {
  const ui = await fixture();
  const html = ui.slots.get('steps').innerHTML;
  assert.equal((html.match(/class="mr-scene mr-scene--/g) || []).length, 5);
  assert.equal((html.match(/data-selling-step=/g) || []).length, 15);
  const grammars = new Set();
  for (const step of routine.steps) {
    assert.ok(html.includes(`id="step-${step.id}"`));
    assert.ok(html.includes(`data-grammar="${step.scene.grammar}"`));
    grammars.add(step.scene.grammar);
    assert.ok(html.includes(step.image), `${step.id}: the native pack image`);
    assert.ok(html.includes(step.scene.problem) && html.includes(step.scene.role) && html.includes(step.scene.proof));
    for (const line of step.scene.headline) assert.ok(html.includes(`<span class="mr-line">${line}</span>`));
    for (const beat of step.selling.beats) {
      assert.ok(html.includes(beat.title) && html.includes(beat.body), `${step.id}: ${beat.id}`);
      if (beat.names.length) assert.ok(html.includes(`(${beat.names.join(', ')})`), `${step.id}: ${beat.id} names`);
      for (const tag of Object.values(beat.tags || {})) assert.ok(html.includes(`<small>${tag}</small>`));
    }
  }
  assert.equal(grammars.size, 5, 'Each product has its own movement grammar');
  assert.doesNotMatch(html, /data-ingredient-index|mr-lab__tabs|mr-product/);
});

test('the acne note is a general fact, visibly separate from the serum role and linked to its sources', async () => {
  const ui = await fixture();
  const html = ui.slots.get('steps').innerHTML;
  const ac = html.slice(html.indexOf('id="step-AC"'), html.indexOf('id="step-BR"'));
  const fact = ac.match(/<p class="mr-scene__fact">[\s\S]*?<\/p>/)?.[0] || '';
  assert.match(fact, /สิวมีหลายปัจจัย ทั้งน้ำมัน การอุดตัน และการอักเสบ/);
  assert.match(fact, /ไม่ใช่ผลของผลิตภัณฑ์/);
  assert.match(fact, /href="https:\/\/www\.nhs\.uk\/conditions\/acne\/"/);
  assert.match(fact, /href="https:\/\/www\.niams\.nih\.gov\/health-topics\/acne"/);
  assert.doesNotMatch(fact, /Mediral|เซรั่ม/, 'The general fact does not become a product claim');
  assert.equal((html.match(/mr-scene__fact/g) || []).length, 1, 'Only AC carries the general note');
});

test('forward and reverse scrolling set each scene phase from position, without changing the saved list', async () => {
  const scene = sceneBoundary();
  const ui = await fixture({storyFactory: async () => scene});
  await ui.run('bootStage()');
  ui.change('PO', false);
  const selection = ui.run('[...state.selection].join(",")');
  const ac = ui.scenes[1];
  for (const [y, key, mood, p] of [[3100, 'AC:0', 'botanical', .1], [3450, 'AC:1', 'hydration', .45], [3800, 'AC:2', 'texture', .8], [3450, 'AC:1', 'hydration', .45], [3100, 'AC:0', 'botanical', .1], [6500, 'SU:1', 'hydration', .5], [6800, 'SU:2', 'plants', .8]]) {
    ui.scroll(y);
    assert.equal(ui.run('state.beat.key'), key, `scroll ${y}`);
    assert.equal(scene.mood, mood, `mood at ${y}`);
    const owner = ui.scenes[routine.steps.findIndex(step => step.id === key.slice(0, 2))];
    assert.equal(Number(owner.style.getPropertyValue('--p')), p);
    assert.equal(ui.run('[...state.selection].join(",")'), selection);
  }
  ui.scroll(3450); // p = .45 in the drop grammar: the source is formed, the drop is travelling
  assert.equal(ac.style.getPropertyValue('--a'), '1.0000');
  const drop = Number(ac.style.getPropertyValue('--b'));
  assert.ok(drop > 0 && drop < 1, 'The drop is mid-flight');
  assert.equal(ac.style.getPropertyValue('--c'), '0.0000');
});

test('short screens unpin scenes but still map position to lightweight motion', async () => {
  const pinned = await fixture();
  pinned.scroll(3000);
  assert.equal(pinned.scenes[1].style.getPropertyValue('--p'), '0.0000', 'A pinned scene starts when its frame arrives');
  const flow = await fixture({flow: true});
  flow.scroll(3000);
  assert.equal(flow.scenes[1].style.getPropertyValue('--p'), '0.3673', 'An unpinned scene plays while it crosses the reading band');
  flow.scroll(3775);
  assert.equal(flow.scenes[1].style.getPropertyValue('--p'), '1.0000');
});

test('ambient film is active only in its owning AC opening, never after the drop or in a hidden tab', async () => {
  const film = {active: false, setActive(value) { this.active = value; }};
  const ui = await fixture({filmFactory: () => film});
  await ui.run('bootFilm()');
  assert.equal(film.active, false);
  ui.scroll(3050);
  assert.equal(film.active, true);
  ui.hidePage();
  assert.equal(film.active, false);
  ui.returnToPage();
  assert.equal(film.active, true);
  ui.scroll(3600);
  assert.equal(film.active, false);
  ui.scroll(4550);
  assert.equal(film.active, false);
});

for (const [hash, target, key] of [['#lab-film', 3000, 'AC:0'], ['#beat-BR-1', 4500, 'BR:0']]) {
  test(`a legacy ${hash} link lands on the product scene that now tells it`, async () => {
    const ui = await fixture({url: `https://www.myclover.com/mediral/${hash}`});
    await ui.flushImmediateTimers();
    assert.equal(ui.context.scrollY, target);
    assert.equal(ui.run('state.beat.key'), key);
  });
}

test('scene phases are the same in stacked and wide layouts; the purchase gate stays separate', async () => {
  for (const stacked of [false, true]) {
    const ui = await fixture({stacked});
    ui.scroll(3450);
    assert.equal(ui.run('state.beat.key'), 'AC:1');
    ui.scroll(9000);
    assert.equal(ui.document.body.dataset.readingChapter, stacked ? 'set' : undefined);
  }
});

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

test('product anchor clearance activates the destination and survives late layout or context changes', async () => {
  const ui = await fixture({url: 'https://www.myclover.com/mediral/#step-SU', productScrollMargin: '100px', pendingFonts: true});
  assert.equal(ui.context.scrollY, 5900);
  assert.equal(ui.document.body.dataset.step, 'SU');
  assert.equal(ui.rails[3].getAttribute('aria-current'), 'step');
  ui.layout(1700);
  ui.fontsReady();
  await ui.flushImmediateTimers();
  assert.equal(ui.context.scrollY, 6700, 'The restored link retains the CSS header clearance');
  ui.run('onContextChange("lost")');
  assert.equal(ui.context.scrollY, 2300, 'A positive section offset is preserved through layout changes');
  assert.equal(ui.document.body.dataset.step, 'SU');
  ui.run('state.stage = {pause() {}, resume() {}, setProgress() {}, setMood() {}}; onContextChange("restored")');
  assert.equal(ui.context.scrollY, 6700);
  ui.scroll(6675);
  assert.equal(ui.document.body.dataset.step, 'BR');
  ui.scroll(6700); // Where a native #step-SU click lands after applying scroll-margin-top.
  assert.equal(ui.document.body.dataset.step, 'SU');
});
