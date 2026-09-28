import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const entry = new URL('../../mediral/js/main.js', import.meta.url);
const source = readFileSync(entry, 'utf8').replaceAll('import.meta.url', JSON.stringify(entry.href))
  // Mock only the scene module boundary so the real asynchronous boot path remains under test.
  .replace("import('./story.js')", 'globalThis.loadStoryModule()');
const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));

// Execute the real controller with a small DOM adapter. No browser or graphics emulation:
// assertions cover the visible offer, action state, input selection and accessibility attributes.
async function fixture({url = 'https://www.myclover.com/mediral/', clock = '2026-09-28T05:00:00Z', clipboardFails = false, verifiedLink = false, readyState = 'complete', pendingFonts = false, readingChapters = [], storyFactory, stacked = false} = {}) {
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
    querySelectorAll(selector) { return selector === '.mr-phase li' ? [new Element(), new Element(), new Element()] : selector === '.mr-lab__tabs button' ? Array.from({length: 5}, (_, i) => this.querySelector(`button-${i}`)) : selector === '[data-formula-index]' ? Array.from({length: 8}, (_, i) => this.querySelector(`formula-button-${i}`)) : []; }
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
  const sections = ['routine', ...rails].map((_, i) => {
    const el = new Element('section');
    el.id = i === 0 ? 'routine' : i === 6 ? 'set' : `step-${routine.steps[i - 1].id}`;
    Object.defineProperty(el, 'offsetHeight', {get: () => root.classList.contains('mr-static') ? 600 : sectionHeight});
    el.getBoundingClientRect = () => ({top: i * el.offsetHeight - context.scrollY, bottom: (i + 1) * el.offsetHeight - context.scrollY});
    return el;
  });
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
      const reading = readingNodes.find(node => selector === `#${node.id}`);
      if (reading) return reading;
      if (selector.startsWith('[data-lab=') || selector.startsWith('[data-formula-group=')) { if (!slots.has(selector)) slots.set(selector, new Element()); return slots.get(selector); }
      if (selector === '[data-piece]') return pieces[0];
      if (selector === '#set .mr-card') return new Element();
      return new Element();
    },
    querySelectorAll(selector) {
      if (selector === '#story [data-step]') return sections.slice(2, 6);
      if (selector === '.mr-reading-chapter') return readingNodes;
      if (selector === '[data-piece]') return pieces;
      if (selector === '[data-row]') return rows;
      if (selector === '[data-rail]') return rails;
      if (selector === '[data-action]' || selector === '[data-action="copy"], [data-action="card"]') return actions;
      if (selector === '.mr-chapter, .mr-step, .mr-routine') return sections;
      return [];
    },
  };
  const media = {matches: false, addEventListener(_name, listener) { this.change = listener; }};
  const stackedMedia = {matches: stacked, addEventListener() {}};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const data = structuredClone(routine);
  if (verifiedLink) data.buy = {...data.buy, status: 'verified', affiliate_url: 'https://shop.example.test/verified-set'};
  context = vm.createContext({document, location: new URL(url), URL, URLSearchParams, Intl, Date: ClockDate, console: {warn() {}, error: (...args) => errors.push(args)},
    navigator: {clipboard: {writeText: async () => { if (clipboardFails) throw new Error('denied'); }}},
    matchMedia: query => query === '(max-width: 1100px)' ? stackedMedia : media, innerHeight: 500, innerWidth: 1000, scrollY: 0,
    getComputedStyle: el => ({scrollMarginTop: el.scrollMarginTop || '0px'}),
    addEventListener: addWindowListener, removeEventListener: removeWindowListener, IntersectionObserver: class { observe() {} },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ok: true, json: async () => data}),
    loadStoryModule: async () => ({createStory: storyFactory}),
  });
  context.window = {requestIdleCallback() {}, scrollTo: ({top}) => { context.scrollY = top; }};
  vm.runInContext(source, context, {filename: 'mediral/js/main.js'});
  await tick();
  assert.deepEqual(errors, [], 'The controller must boot before its behavior is tested');
  const run = code => vm.runInContext(code, context);
  const fire = (name, target) => { for (const handler of listeners.get(name) || []) handler({target}); };
  return {run, slots, pieces, actions, rails, root, media, timers, document, context,
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
  ui.run('state.stage = {pause() {}, resume() {}, setProgress() {}, setBand() {}, setSelection() {}, setReducedMotion(value) { this.reduced = value; }}');
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
    assert.match(ui.run(`stepBody(byId('${step.id}'))`), new RegExp(`href="#formula-${step.id}"[^>]*>อ่านส่วนผสมทั้งหมด ${count} ชื่อ`));
    for (const group of step.ingredient_groups.filter(g => g.ingredientNames.length)) {
      assert.ok(ui.run(`stepBody(byId('${step.id}'))`).includes(group.title), `${step.id}: the product view names its ingredient families`);
    }
  }
  assert.equal(ui.run('ingredientAtlas(byId("CL"))'), '', 'The unconfirmed mousse formula has no list');
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

test('a fresh atlas URL lands below the fixed header, while product anchors keep their scene position', async () => {
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
    for (const point of step.compare_points) assert.ok(compare.includes(point));
    assert.ok(compare.includes(step.when.join(' · ')));
    for (const item of step.featured) assert.ok(compare.includes(item.name));
    assert.match(compare, new RegExp(`href="#formula-${step.id}"`));
  }
  assert.match(compare, /ภาพแพ็ก AI ฉบับร่าง/);
  assert.doesNotMatch(compare, /ทาคู่|ใช้คู่|ใช้ร่วมกัน|เสริมฤทธิ์|ได้ผลดีกว่า|ทาก่อน|ทาหลัง/);
});

test('the use-time table repeats data only: no sequence, mousse deferred to its label', async () => {
  const ui = await fixture();
  const table = ui.slots.get('uses').innerHTML;
  const rows = table.split('<tr>').slice(2);
  const labels = routine.use_time_labels;
  assert.equal(rows.length, routine.steps.length);
  routine.steps.forEach((step, i) => {
    const row = rows[i];
    assert.ok(row.includes(step.nick));
    if (!step.use_times.length) {
      assert.match(row, /colspan="4"[^>]*>ยึดวิธีใช้บนฉลากขวดที่ได้รับ/);
      return;
    }
    for (const key of Object.keys(labels)) {
      assert.equal(row.includes(`aria-label="${labels[key]}"`), step.use_times.includes(key), `${step.id}: ${key}`);
    }
  });
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
    setIngredient() {}, setBand() {}, setReducedMotion() {}, setSelection() {}, dispose() {},
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
    readingChapters: [{id: 'lab-film', top: 4100, staticTop: 1900, height: 1500}]});
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

test('choosing an ingredient reveals its own role without changing the saved routine', async () => {
  const ui = await fixture();
  ui.run('state.stage = {pause() {}, resume() {}, setProgress() {}, setSelection() {}, setIngredient(index) { this.focusedIngredient = index; }}');
  ui.change('PO', false);
  ui.scroll(3800); // white serum product phase
  ui.run('chooseIngredient("AC", 0)');
  assert.equal(ui.context.scrollY, 3120, 'Return from the product phase to the ingredient view');
  assert.equal(ui.run('state.stage.focusedIngredient'), 0);
  assert.equal(ui.run('state.selection.has("PO")'), false);
  const panel = ui.document.querySelector('[data-lab="AC"]');
  assert.equal(panel.querySelector('.mr-lab__name').textContent, routine.steps[1].featured[0].name);
  assert.equal(panel.querySelector('button-0').getAttribute('aria-pressed'), 'true');
  ui.scroll(3300);
  assert.equal(ui.run('state.ingredientOverride'), null, 'Scrolling resumes the material sequence');
  ui.scroll(4500);
  assert.equal(ui.document.body.dataset.step, 'BR');
  assert.equal(ui.run('state.stage.focusedIngredient'), 0, 'A new formula starts on its own first ingredient');
});
