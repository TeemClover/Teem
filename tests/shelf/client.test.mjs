import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const clientSource = await readFile(new URL('../../shelf/shelf.js', import.meta.url), 'utf8');
const clientHtml = await readFile(new URL('../../shelf/index.html', import.meta.url), 'utf8');
const catalog = { categories: [], sources: [{ id: 'qa-source', title: 'QA sauce', description: 'A test source', tags: [], categories: [], status_label: 'Test', version: '1.0' }] };
const unlocked = { ok: true, authenticated: true, user: { id: 'qa-person', name: 'QA Reader' }, sourceIds: null };
const locked = { ok: true, authenticated: false, user: null, sourceIds: null };
const sourceResponse = (content = 'QA original content', version = '1.0') => ({ ok: true, source: { id: 'qa-source', title: 'QA sauce', version, content } });
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

// A minimal DOM adapter executes the actual browser entry point. It records user-
// visible effects while fetch/clipboard promises are resolved in controlled order.
function fixture({ clipboard, fallbackCopies = false, catalogData = catalog, hash = '' } = {}) {
  const nodes = new Map();
  const requests = [];
  const effects = { clipboard: [], fallbackCopies: [], selectedText: [], downloads: [], modals: [], focused: [], scrolled: [] };
  let selectedInput = null;
  class Element {
    constructor(tag = 'div', id = '') { this.tagName = tag.toUpperCase(); this.id = id; this.className = ''; this.listeners = new Map(); this.children = []; this.parentNode = null; this.attributes = new Map(); this.dataset = {}; this.style = {}; this.value = ''; this.open = false; this.hidden = false; this.disabled = false; this._text = ''; }
    set textContent(value) { this._text = String(value ?? ''); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent ?? String(child)).join(''); }
    append(...children) { for (const child of children) { this.children.push(child); if (typeof child === 'object') child.parentNode = this; } }
    replaceChildren(...children) { this._text = ''; this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    addEventListener(name, handler) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(handler); }
    fire(name, properties = {}) { return Promise.all((this.listeners.get(name) || []).map(handler => handler({ currentTarget: this, target: this, preventDefault() {}, ...properties }))); }
    click() { if (this.tagName === 'A' && this.download) effects.downloads.push({ filename: this.download, href: this.href }); return this.fire('click'); }
    showModal() { this.open = true; effects.modals.push(this.id); }
    close() { this.open = false; this.fire('close'); }
    focus() { document.activeElement = this; effects.focused.push(this.id); }
    scrollIntoView() { effects.scrolled.push(this.id); }
    select() { selectedInput = this; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); }
    querySelectorAll(selector) { const result = []; const visit = parent => { for (const child of parent.children) { if (selector === 'button' && child.tagName === 'BUTTON') result.push(child); if (child.children) visit(child); } }; visit(this); return result; }
  }
  for (const match of clientHtml.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g)) nodes.set(match[2], new Element(match[1], match[2]));
  const closeButtons = ['key-dialog', 'reader-dialog'].map(id => { const button = new Element('button'); button.dataset.close = id; return button; });
  const document = new Element('document');
  Object.assign(document, {
    hidden: false,
    getElementById(id) {
      const node = nodes.get(id) || [...nodes.values()].flatMap(root => descendants(root)).find(item => item.id === id);
      assert.ok(node, `The real HTML or rendered DOM must expose #${id}`); return node;
    },
    createElement(tag) { return new Element(tag); },
    querySelectorAll(selector) { return selector === '[data-close]' ? closeButtons : []; },
    execCommand(command) { assert.equal(command, 'copy'); effects.fallbackCopies.push(selectedInput?.value); return fallbackCopies; },
    createRange() { return { node: null, selectNodeContents(node) { this.node = node; } }; }
  });
  const window = new Element('window');
  window.location = new URL(hash || '/shelf/', 'https://www.myclover.com/shelf/');
  class ClientURL extends URL {
    static createObjectURL() { return 'blob:qa-only'; }
    static revokeObjectURL() {}
  }
  const context = vm.createContext({
    document, window, AbortController, Blob,
    URL: ClientURL,
    navigator: { clipboard: { writeText(content) { effects.clipboard.push(content); return clipboard ? clipboard(content) : Promise.resolve(); } } },
    matchMedia() { return { matches: true }; },
    getSelection() { return { removeAllRanges() {}, addRange(range) { effects.selectedText.push(range.node.textContent); } }; },
    setTimeout() { return 1; }, clearTimeout() {},
    fetch(url, options) {
      const pending = deferred();
      const body = options.body ? JSON.parse(options.body) : null;
      const action = body?.action || new URL(url, 'http://qa.local').searchParams.get('action');
      const request = { action, body, settled: false, respond(data, status = 200) { request.settled = true; pending.resolve({ ok: status >= 200 && status < 300, status, json: async () => data }); } };
      requests.push(request); return pending.promise;
    }
  });
  vm.runInContext(clientSource, context, { filename: 'shelf/shelf.js' });
  const get = id => document.getElementById(id);
  const pending = (action, kind, position = 0) => { const found = requests.filter(request => !request.settled && request.action === action && (!kind || request.body?.kind === kind))[position]; assert.ok(found, `Expected pending ${action}${kind ? `/${kind}` : ''} request at position ${position}`); return found; };
  return { get, document, window, effects, pending, requests, pendingRequests(action) { return requests.filter(request => !request.settled && request.action === action); }, async boot(session = unlocked) { pending('catalog').respond({ ok: true, catalog: catalogData }); pending('session').respond(session); await tick(); },
    async navigateHash(value) { window.location.hash = value; await window.fire('hashchange'); },
    open() { return get('bottles').children[0].click(); },
    async openReader(content = 'QA original content') { const task = this.open(); pending('take', 'open').respond(sourceResponse(content)); await task; },
    async logout() { const task = get('logout').click(); pending('logout').respond(locked); await task; }
  };
}

function descendants(root, predicate = () => true) {
  const result = [];
  for (const child of root.children || []) { if (predicate(child)) result.push(child); result.push(...descendants(child, predicate)); }
  return result;
}
const hasClass = className => node => String(node.className).split(/\s+/).includes(className);
const renderedSources = ui => descendants(ui.get('source-list'), node => Boolean(node.dataset?.sourceId));
const sourceIds = ui => renderedSources(ui).map(node => node.dataset.sourceId);
function recipeCatalog() {
  const makeSource = (id, order, stage, shortTitle, useWith, output) => ({
    id, title: 'Recipe ' + order, description: 'Public recipe description ' + order,
    categories: ['method'], tags: ['organization'], version: '1.0', status_label: 'QA labels',
    content: 'QA_BODY_MUST_NEVER_RENDER',
    recipe: { collection_id: 'organization-starter', order, stage, short_title: shortTitle, use_with: useWith,
      inputs: ['QA source documents'], outputs: [output], prerequisites: order === 1 ? [] : ['org-recipe-1'],
      lessons: [{ label: 'Classroom lesson', href: '/classroom/free-ai.html' }, { label: 'Course lesson', href: '/course/organization/' }] }
  });
  return {
    collections: [{ id: 'organization-starter', title: 'เริ่มครัว AI ในองค์กร', description: 'QA recipe collection introduction' }],
    categories: [{ id: 'method', label: 'วิธีทำงาน' }, { id: 'legacy', label: 'ข้อมูลเดิม' }],
    sources: [
      { id: 'legacy-source', title: 'Legacy record', description: 'Legacy-only topic', categories: ['legacy'], tags: ['old shelf'], version: '0.9', status_label: 'Legacy', content: 'QA_BODY_MUST_NEVER_RENDER' },
      makeSource('org-recipe-3', 3, 'SERVE', 'ส่งงานต่อ', 'Web editor', 'QA handoff kit'),
      makeSource('org-recipe-1', 1, 'SOURCE', 'ตั้งวัตถุดิบ', 'ChatGPT', 'QA working source'),
      makeSource('org-recipe-2', 2, 'TASTE', 'ชิมให้ตรงกัน', 'NotebookLM', 'QA decision-map')
    ]
  };
}

test('a delayed open response cannot reopen the reader after logout', async () => {
  const ui = fixture(); await ui.boot();
  const opening = ui.open(); const take = ui.pending('take', 'open');
  await ui.logout(); take.respond(sourceResponse('Content that must stay discarded')); await opening;
  assert.equal(ui.get('cabinet').dataset.state, 'locked');
  assert.equal(ui.get('reader-dialog').open, false);
  assert.equal(ui.get('reader-content').textContent, '');
  assert.deepEqual(ui.effects.modals, []);
});

for (const kind of ['copy', 'download']) {
  test(`a delayed ${kind} response cannot deliver after logout`, async () => {
    const ui = fixture(); await ui.boot(); await ui.openReader();
    const delivering = ui.get(kind === 'copy' ? 'copy-source' : 'download-source').click();
    const take = ui.pending('take', kind);
    await ui.logout(); take.respond(sourceResponse('Discard this late delivery')); await delivering;
    assert.equal(ui.get('reader-content').textContent, '');
    assert.equal(ui.get('reader-dialog').open, false);
    assert.deepEqual(ui.effects.clipboard, []);
    assert.deepEqual(ui.effects.fallbackCopies, []);
    assert.deepEqual(ui.effects.downloads, []);
  });
}

test('an old authenticated session response cannot unlock again after logout', async () => {
  const ui = fixture(); await ui.boot();
  const refreshing = ui.document.fire('visibilitychange'); const session = ui.pending('session');
  await ui.logout(); session.respond(unlocked); await refreshing;
  assert.equal(ui.get('cabinet').dataset.state, 'locked');
  assert.equal(ui.get('member-name').textContent, '');
});

test('an initial session response cannot replace a newer successful unlock or claim it failed', async () => {
  const ui = fixture();
  const initialSession = ui.pending('session');
  ui.pending('catalog').respond({ ok: true, catalog });
  ui.get('shelf-key').value = 'QA-local-only-key';
  const unlocking = ui.get('key-form').fire('submit');
  ui.pending('unlock').respond(unlocked); await tick();
  // The initial request remains unresolved; the next session request verifies the new cookie.
  ui.pending('session', undefined, 1).respond(unlocked);
  await unlocking;
  initialSession.respond(locked); await tick();
  assert.equal(ui.get('cabinet').dataset.state, 'unlocked');
  assert.equal(ui.get('connection-status').textContent, '');
});

test('copy failure selects the latest server source and version, not stale reader content', async () => {
  const ui = fixture({ clipboard: async () => { throw new Error('Denied'); } });
  await ui.boot(); await ui.openReader('QA version 1');
  const copying = ui.get('copy-source').click();
  ui.pending('take', 'copy').respond(sourceResponse('QA version 2', '2.0')); await copying;
  assert.equal(ui.get('reader-content').textContent, 'QA version 2');
  assert.equal(ui.get('reader-version').textContent, 'SOURCE / v2.0');
  assert.deepEqual(ui.effects.selectedText, ['QA version 2']);
});

test('a visibility refresh during unlock cannot leave a successful key dialog stranded', async () => {
  const ui = fixture(); await ui.boot(locked); await ui.get('open-key').click();
  ui.get('shelf-key').value = 'QA-local-only-key';
  const unlocking = ui.get('key-form').fire('submit');
  ui.pending('unlock').respond(unlocked); await tick();
  const verification = ui.pending('session');
  const refreshing = ui.document.fire('visibilitychange');
  const backgroundCheck = ui.pendingRequests('session').find(request => request !== verification);
  if (backgroundCheck) backgroundCheck.respond(unlocked);
  await refreshing;
  verification.respond(unlocked); await unlocking;
  assert.equal(ui.get('cabinet').dataset.state, 'unlocked');
  assert.equal(ui.get('key-dialog').open, false);
  assert.equal(ui.get('shelf-key').value, '');
});

test('clipboard rejection after logout does not attempt a new fallback copy', async () => {
  const clipboard = deferred();
  const ui = fixture({ clipboard: () => clipboard.promise, fallbackCopies: true });
  await ui.boot(); await ui.openReader();
  const copying = ui.get('copy-source').click();
  ui.pending('take', 'copy').respond(sourceResponse('QA clipboard content')); await tick();
  assert.deepEqual(ui.effects.clipboard, ['QA clipboard content']);
  await ui.logout(); clipboard.reject(new Error('Permission denied later')); await copying;
  assert.deepEqual(ui.effects.fallbackCopies, []);
  assert.deepEqual(ui.effects.selectedText, []);
  assert.equal(ui.get('reader-status').textContent, '');
});

test('an unchanged session refresh does not discard an authorized in-flight open', async () => {
  const ui = fixture(); await ui.boot();
  const opening = ui.open(); const take = ui.pending('take', 'open');
  const refreshing = ui.document.fire('visibilitychange'); ui.pending('session').respond(unlocked); await refreshing;
  take.respond(sourceResponse('QA requested content')); await opening;
  assert.equal(ui.get('reader-dialog').open, true);
  assert.equal(ui.get('reader-content').textContent, 'QA requested content');
});

test('a change of recipient closes content belonging to the previous recipient', async () => {
  const ui = fixture(); await ui.boot(); await ui.openReader();
  const refreshing = ui.document.fire('visibilitychange');
  ui.pending('session').respond({ ...unlocked, user: { id: 'different-person', name: 'Another QA Reader' } });
  await refreshing;
  assert.equal(ui.get('reader-dialog').open, false);
  assert.equal(ui.get('reader-content').textContent, '');
});

test('a change of source scope clears content that is no longer authorized', async () => {
  const ui = fixture(); await ui.boot(); await ui.openReader();
  const refreshing = ui.document.fire('visibilitychange');
  ui.pending('session').respond({ ...unlocked, sourceIds: ['another-source'] });
  await refreshing;
  assert.equal(ui.get('reader-dialog').open, false);
  assert.equal(ui.get('reader-content').textContent, '');
});

for (const kind of ['open', 'copy', 'download']) {
  test(`a delayed ${kind} response is discarded after a session check relocks the shelf`, async () => {
    const ui = fixture(); await ui.boot();
    if (kind !== 'open') await ui.openReader();
    const delivering = kind === 'open' ? ui.open() : ui.get(kind === 'copy' ? 'copy-source' : 'download-source').click();
    const take = ui.pending('take', kind);
    const refreshing = ui.document.fire('visibilitychange'); ui.pending('session').respond(locked); await refreshing;
    take.respond(sourceResponse('QA revoked access content')); await delivering;
    assert.equal(ui.get('cabinet').dataset.state, 'locked');
    assert.equal(ui.get('reader-dialog').open, false);
    assert.equal(ui.get('reader-content').textContent, '');
    assert.deepEqual(ui.effects.clipboard, []);
    assert.deepEqual(ui.effects.fallbackCopies, []);
    assert.deepEqual(ui.effects.downloads, []);
  });
}

test('unordered recipes become a stable numbered path and cabinet without mutating the catalog', async () => {
  const data = recipeCatalog(); const originalOrder = data.sources.map(source => source.id);
  const ui = fixture({ catalogData: data }); await ui.boot(locked);
  const expected = ['org-recipe-1', 'org-recipe-2', 'org-recipe-3'];
  const pathLinks = descendants(ui.get('learning-paths'), hasClass('recipe-step'));
  assert.deepEqual(pathLinks.map(link => link.href), expected.map(id => '#source-' + id));
  assert.deepEqual(pathLinks.map(link => descendants(link, hasClass('step-index'))[0].textContent), ['01', '02', '03']);
  const bottleLabels = descendants(ui.get('bottles'), node => node.tagName === 'STRONG');
  assert.deepEqual(bottleLabels.map(node => node.textContent), ['ตั้งวัตถุดิบ', 'ชิมให้ตรงกัน', 'ส่งงานต่อ']);
  assert.deepEqual(sourceIds(ui), [...expected, 'legacy-source']);
  assert.deepEqual(data.sources.map(source => source.id), originalOrder);
  ui.get('search').value = 'organization'; await ui.get('search').fire('input');
  ui.get('search').value = ''; await ui.get('search').fire('input');
  assert.deepEqual(sourceIds(ui), [...expected, 'legacy-source']);
  assert.equal(ui.get('learning-paths').hidden, false);
});

test('legacy sources stay in a separate selectable shelf after the ordered recipe group', async () => {
  const ui = fixture({ catalogData: recipeCatalog() }); await ui.boot(locked);
  const groups = descendants(ui.get('source-list'), hasClass('source-group'));
  assert.deepEqual(groups.map(group => group.dataset.collection), ['organization-starter', 'other']);
  assert.match(groups[1].textContent, /ซอสบนชั้นอื่น/);
  assert.match(groups[1].textContent, /Legacy record/);
  const other = ui.get('collection-filters').children.find(button => button.dataset.collection === 'other');
  await other.click();
  assert.deepEqual(sourceIds(ui), ['legacy-source']);
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
});

test('an unchanged access check preserves an expanded recipe label', async () => {
  const ui = fixture({ catalogData: recipeCatalog() }); await ui.boot(unlocked);
  const detail = descendants(ui.get('source-list'), node => node.tagName === 'DETAILS')[0];
  detail.open = true;
  const refreshing = ui.document.fire('visibilitychange');
  ui.pending('session').respond(unlocked); await refreshing;
  assert.equal(descendants(ui.get('source-list'), node => node.tagName === 'DETAILS')[0], detail);
  assert.equal(detail.open, true);
  assert.equal(ui.pendingRequests('take').length, 0);
});

test('recipe introductions and expanded metadata render labels only and do not request bodies', async () => {
  const data = recipeCatalog();
  data.sources.find(source => source.id === 'org-recipe-1').recipe.inputs = ['<img src=x onerror=alert(1)>'];
  const ui = fixture({ catalogData: data }); await ui.boot(locked);
  const details = descendants(ui.get('source-list'), node => node.tagName === 'DETAILS');
  details.forEach(detail => { detail.open = true; });
  const text = ui.get('learning-paths').textContent + ui.get('source-list').textContent;
  assert.match(text, /NotebookLM/);
  assert.match(text, /QA decision-map/);
  assert.match(text, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(text, /QA_BODY_MUST_NEVER_RENDER/);
  assert.equal(descendants(ui.get('source-list'), node => node.tagName === 'IMG').length, 0);
  assert.equal(ui.get('reader-content').textContent, '');
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
  assert.deepEqual(ui.effects.modals, []);
});

for (const query of ['notebooklm', 'DECISION-MAP']) {
  test(`search discovers a recipe through its tool/output label: ${query}`, async () => {
    const ui = fixture({ catalogData: recipeCatalog() }); await ui.boot(locked);
    ui.get('search').value = query; await ui.get('search').fire('input');
    assert.deepEqual(sourceIds(ui), ['org-recipe-2']);
    assert.equal(ui.get('result-count').textContent, '1 จาก 4 ขวด');
  });
}

test('recipe lesson links allow only normalized same-origin classroom and course pages', async () => {
  const data = recipeCatalog();
  data.sources.find(source => source.id === 'org-recipe-1').recipe.lessons = [
    { label: 'Allowed classroom', href: '/classroom/free-ai.html' },
    { label: 'Allowed course', href: 'https://www.myclover.com/course/organization/?lesson=1#notes' },
    { label: 'Outside origin', href: 'https://outside.example/classroom/' },
    { label: 'Raw source', href: '/shelf/source/private.md' },
    { label: 'Wrong local page', href: '/api/shelf?action=admin' },
    { label: 'Path traversal', href: '/classroom/../../api/shelf' },
    { label: 'Executable URL', href: 'javascript:alert(1)' }
  ];
  const ui = fixture({ catalogData: data }); await ui.boot(locked);
  const row = ui.get('source-org-recipe-1');
  const lessons = descendants(row, hasClass('recipe-lessons'))[0];
  assert.deepEqual(descendants(lessons, node => node.tagName === 'A').map(link => link.href), ['/classroom/free-ai.html', '/course/organization/?lesson=1#notes']);
});

test('a source hash arriving before asynchronous catalog load reveals and focuses its row without opening it', async () => {
  const data = recipeCatalog(); const ui = fixture({ catalogData: data, hash: '#source-org-recipe-2' });
  ui.pending('session').respond(locked); await tick();
  assert.deepEqual(ui.effects.modals, []);
  ui.pending('catalog').respond({ ok: true, catalog: data }); await tick();
  assert.equal(ui.document.activeElement.id, 'source-org-recipe-2');
  assert.equal(ui.effects.scrolled.at(-1), 'source-org-recipe-2');
  assert.match(ui.get('source-org-recipe-2').className, /is-linked/);
  assert.equal(ui.get('cabinet').dataset.state, 'locked');
  assert.equal(ui.get('reader-content').textContent, '');
  assert.deepEqual(ui.effects.modals, []);
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
});

test('source hash navigation clears conflicting collection, category and search filters', async () => {
  const ui = fixture({ catalogData: recipeCatalog() }); await ui.boot(locked);
  await ui.get('collection-filters').children.find(button => button.dataset.collection === 'other').click();
  await ui.get('filters').children.find(button => button.textContent === 'ข้อมูลเดิม').click();
  ui.get('search').value = 'Legacy-only'; await ui.get('search').fire('input');
  assert.deepEqual(sourceIds(ui), ['legacy-source']);
  await ui.navigateHash('#source-org-recipe-3');
  assert.deepEqual(sourceIds(ui), ['org-recipe-1', 'org-recipe-2', 'org-recipe-3']);
  assert.equal(ui.get('search').value, '');
  assert.equal(ui.get('filters').children[0].getAttribute('aria-pressed'), 'true');
  assert.equal(ui.get('collection-filters').children.find(button => button.dataset.collection === 'organization-starter').getAttribute('aria-pressed'), 'true');
  assert.equal(ui.document.activeElement.id, 'source-org-recipe-3');
  assert.deepEqual(ui.effects.modals, []);
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
});

test('the collection hash navigates its introduction and ordered recipes without requiring a key', async () => {
  const ui = fixture({ catalogData: recipeCatalog(), hash: '#organization-starter' }); await ui.boot(locked);
  assert.equal(ui.effects.scrolled.at(-1), 'organization-starter');
  assert.deepEqual(sourceIds(ui), ['org-recipe-1', 'org-recipe-2', 'org-recipe-3']);
  assert.equal(ui.get('cabinet').dataset.state, 'locked');
  assert.deepEqual(ui.effects.modals, []);
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
});

test('native path links handle keyboard-origin clicks and restore a filtered target even at the same hash', async () => {
  const ui = fixture({ catalogData: recipeCatalog(), hash: '#source-org-recipe-2' }); await ui.boot(locked);
  ui.get('search').value = 'no matching recipe'; await ui.get('search').fire('input');
  assert.deepEqual(sourceIds(ui), []);
  const link = descendants(ui.get('learning-paths'), hasClass('recipe-step')).find(node => node.href === '#source-org-recipe-2');
  assert.equal(link.tagName, 'A');
  assert.equal(link.getAttribute('tabindex'), null, 'The anchor remains in the native keyboard tab order');
  // Browsers dispatch a click with detail=0 when Enter activates a native anchor.
  await link.fire('click', { detail: 0 });
  assert.equal(ui.window.location.hash, '#source-org-recipe-2');
  assert.equal(ui.document.activeElement.id, 'source-org-recipe-2');
  assert.equal(ui.get('search').value, '');
  assert.ok(sourceIds(ui).includes('org-recipe-2'));
  assert.deepEqual(ui.effects.modals, []);
  assert.deepEqual(ui.requests.map(request => request.action), ['catalog', 'session']);
});
