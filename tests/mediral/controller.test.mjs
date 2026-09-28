import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const entry = new URL('../../mediral/js/main.js', import.meta.url);
const source = readFileSync(entry, 'utf8').replaceAll('import.meta.url', JSON.stringify(entry.href));
const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));

// Execute the real controller with a small DOM adapter. No browser or graphics emulation:
// assertions cover the visible offer, action state, input selection and accessibility attributes.
async function fixture({url = 'https://www.myclover.com/mediral/', clock = '2026-09-28T05:00:00Z', clipboardFails = false, verifiedLink = false} = {}) {
  const listeners = new Map();
  const timers = new Map();
  const slots = new Map();
  const errors = [];
  let now = Date.parse(clock);
  let context;
  let timerId = 0;
  const classList = () => {
    const items = new Set();
    return {add: (...names) => names.forEach(n => items.add(n)), remove: (...names) => names.forEach(n => items.delete(n)),
      contains: n => items.has(n), toggle(n, force = !items.has(n)) { force ? items.add(n) : items.delete(n); return force; }};
  };
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.classList = classList(); this.attributes = new Map(); this.dataset = {}; this.children = []; this.disabled = false; this.checked = true; this._html = ''; this._text = ''; }
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
    querySelectorAll(selector) { return selector === '.mr-phase li' ? [new Element(), new Element(), new Element()] : []; }
    getBoundingClientRect() { return {top: 0, right: 450, left: 760}; }
  }
  const root = new Element('html');
  const pieces = routine.steps.map(step => Object.assign(new Element('input'), {value: step.id}));
  const rows = routine.steps.map(step => { const el = new Element(); el.dataset.row = step.id; return el; });
  const rails = [...routine.steps, {id: 'set'}].map(step => { const el = new Element('a'); el.dataset.rail = step.id; return el; });
  const actions = ['copy', 'card'].map(action => { const el = new Element('button'); el.dataset.action = action; return el; });
  const sections = rails.map((_, i) => {
    const el = new Element('section');
    Object.defineProperty(el, 'offsetHeight', {get: () => root.classList.contains('mr-static') ? 600 : 1500});
    el.getBoundingClientRect = () => ({top: i * el.offsetHeight - context.scrollY});
    return el;
  });
  for (const name of ['hero-body', 'steps', 'rail', 'word', 'set-headline', 'pieces', 'set-row', 'offer', 'summary', 'buy-link', 'buy-hint', 'disclosure']) slots.set(name, new Element());
  const document = {
    documentElement: root, body: new Element('body'), visibilityState: 'visible', activeElement: null,
    createElement: tag => new Element(tag),
    addEventListener(name, handler) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); },
    querySelector(selector) {
      const match = selector.match(/^\[data-slot="([^"]+)"\]$/);
      if (match) return slots.get(match[1]);
      if (selector === '#step-CL') return sections[0];
      if (selector === '#set') return sections[5];
      if (selector === '[data-piece]') return pieces[0];
      if (selector === '#set .mr-card') return new Element();
      return new Element();
    },
    querySelectorAll(selector) {
      if (selector === '#story [data-step]') return sections.slice(1, 5);
      if (selector === '[data-piece]') return pieces;
      if (selector === '[data-row]') return rows;
      if (selector === '[data-rail]') return rails;
      if (selector === '[data-action]' || selector === '[data-action="copy"], [data-action="card"]') return actions;
      if (selector === '.mr-chapter, .mr-step') return sections;
      return [];
    },
  };
  const media = {matches: false, addEventListener(_name, listener) { this.change = listener; }};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const data = structuredClone(routine);
  if (verifiedLink) data.buy = {...data.buy, status: 'verified', affiliate_url: 'https://shop.example.test/verified-set'};
  context = vm.createContext({document, location: new URL(url), URL, URLSearchParams, Intl, Date: ClockDate, console: {warn() {}, error: (...args) => errors.push(args)},
    navigator: {clipboard: {writeText: async () => { if (clipboardFails) throw new Error('denied'); }}},
    matchMedia: () => media, innerHeight: 500, innerWidth: 1000, scrollY: 0,
    addEventListener() {}, IntersectionObserver: class { observe() {} },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ok: true, json: async () => data}),
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
    clock(value) { now = Date.parse(value); },
    returnToPage() { document.visibilityState = 'visible'; fire('visibilitychange'); },
    scroll(y) { context.scrollY = y; run('onScroll()'); },
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
  ui.scroll(1499);
  assert.equal(ui.run('state.active'), 0);
  assert.equal(ui.rails[0].getAttribute('aria-current'), 'step');
  ui.scroll(1500);
  assert.equal(ui.run('state.active'), 1);
  assert.equal(ui.rails[0].getAttribute('aria-current'), null);
  assert.equal(ui.rails[1].getAttribute('aria-current'), 'step');
  assert.equal(ui.rails.filter(a => a.getAttribute('aria-current')).length, 1);
});

test('context recovery and motion preference changes keep the reader and saved list in place', async () => {
  const ui = await fixture();
  ui.run('state.stage = {setProgress() {}, setBand() {}, setSelection() {}, setReducedMotion(value) { this.reduced = value; }}');
  ui.change('CL', false);
  ui.scroll(3400);
  ui.run('onContextChange("lost")');
  assert.ok(ui.root.classList.contains('mr-static'));
  assert.equal(ui.run('state.active'), 2);
  assert.equal(ui.context.scrollY, 1240);
  ui.run('onContextChange("restored")');
  assert.ok(ui.root.classList.contains('mr-3d'));
  assert.ok(!ui.root.classList.contains('mr-static'));
  assert.equal(ui.context.scrollY, 3400);
  ui.media.change({matches: true});
  assert.ok(ui.root.classList.contains('mr-reduced'));
  assert.equal(ui.run('state.stage.reduced'), true);
  ui.media.change({matches: false});
  assert.ok(!ui.root.classList.contains('mr-reduced'));
  assert.equal(ui.run('state.stage.reduced'), false);
  assert.equal(ui.run('state.active'), 2);
  assert.equal(ui.run('state.selection.has("CL")'), false);
});
