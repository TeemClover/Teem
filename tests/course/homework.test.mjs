import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../course/thedent/course.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../../course/thedent/course-content.js', import.meta.url), 'utf8');
const contentContext = vm.createContext({ window: {} });
vm.runInContext(content, contentContext);
const data = JSON.parse(JSON.stringify(contentContext.window.DENT_COURSE));

function actualCode(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start > 0 && end > start, `Run the actual runtime code between ${from} and ${to}`);
  return source.slice(start, end);
}

const runtime = [
  actualCode('  const STORE =', '  const dialog ='),
  actualCode('  function persist()', '  function notify('),
  actualCode('  function setHomework(', '  function followupNote('),
  'this.api = { state, drafts, restoreHomework, persist, setHomework };'
].join('\n');
const plain = value => JSON.parse(JSON.stringify(value));

function harness({ saved, raw = saved === undefined ? null : JSON.stringify(saved) } = {}) {
  const writes = [], domChanges = [];
  let stored = raw, renders = 0;
  const field = { value: 'Keep this edited prompt', selectionStart: 5, selectionEnd: 9 };
  const document = { activeElement: field };
  const count = { textContent: '' };
  const cards = data.homework.map(m => {
    const classes = new Set();
    return {
      dataset: { homeworkCard: m.id }, classes,
      classList: { toggle(name, enabled) { domChanges.push(['class', m.id, name, enabled]); if (enabled) classes.add(name); else classes.delete(name); } }
    };
  });
  const inputs = data.homework.map(m => ({ dataset: { homework: m.id }, checked: false }));
  const surface = {
    set innerHTML(value) { renders++; document.activeElement = null; field.value = ''; this.markup = value; }
  };
  document.querySelector = selector => {
    if (selector === '#homework-count') return count;
    if (selector === '#learning-surface') return surface;
    throw new Error(`Unexpected page access: ${selector}`);
  };
  document.querySelectorAll = selector => {
    if (selector === '[data-homework-card]') return cards;
    if (selector === '[data-homework]') return inputs;
    throw new Error(`Unexpected page access: ${selector}`);
  };
  const render = () => { surface.innerHTML = 'Replaced page'; };
  const context = vm.createContext({
    data, document, $: selector => document.querySelector(selector), render, renderLesson: render,
    localStorage: {
      getItem(key) { assert.equal(key, 'dent-course-v1'); return stored; },
      setItem(key, value) { assert.equal(key, 'dent-course-v1'); writes.push(value); stored = value; }
    }
  });
  vm.runInContext(runtime, context);
  return { ...context.api, document, field, count, cards, inputs, writes, domChanges,
    stored: () => stored, renders: () => renders };
}

function assertPromptPreserved(h, draft, checks) {
  assert.equal(h.drafts.get('leader-homework'), draft);
  assert.equal(h.state.checks, checks, 'existing check state is not replaced');
  assert.equal(h.document.activeElement, h.field);
  assert.equal(h.field.value, 'Keep this edited prompt');
  assert.equal(h.field.selectionStart, 5);
  assert.equal(h.field.selectionEnd, 9);
  assert.equal(h.renders(), 0, 'a checkbox update must not render the lesson again');
}

test('saved progress from before homework keeps its module, completed lessons and checks', () => {
  const saved = { module: 'workshop2', done: ['sauce', 'workshop1'], checks: { 'workshop1:0': true, 'workshop2:1': false } };
  const h = harness({ saved });
  assert.equal(h.state.module, saved.module);
  assert.deepEqual([...h.state.done], saved.done);
  assert.deepEqual(plain(h.state.checks), saved.checks);
  assert.equal(h.state.homework.size, 0);
  h.persist();
  assert.deepEqual(JSON.parse(h.stored()), { ...saved, homework: [] });
});

test('the retired PRD lesson resumes at file work without claiming the new lesson is completed', () => {
  const h = harness({ saved: { module: 'prd', done: ['start', 'prd'], homework: ['teach-peer'] } });
  assert.equal(h.state.module, 'files');
  assert.deepEqual([...h.state.done], ['start']);
  assert.deepEqual([...h.state.homework], ['teach-peer']);
  h.persist();
  assert.equal(JSON.parse(h.stored()).module, 'files');
});

test('restoreHomework rejects malformed values, unknown IDs and non-string entries, and deduplicates valid IDs', () => {
  const h = harness();
  for (const value of [undefined, null, false, 1, 'repeat-work', {}, { 'repeat-work': true }]) {
    assert.equal(h.restoreHomework(value).size, 0);
  }
  const value = ['repeat-work', 'unknown', null, 7, {}, ['teach-peer'], 'teach-peer', 'repeat-work', 'source-owner', 'source-owner'];
  assert.deepEqual([...h.restoreHomework(value)], ['repeat-work', 'teach-peer', 'source-owner']);
  assert.equal(value.length, 10, 'restoring does not mutate the saved input');
});

test('malformed storage starts safely, while mixed saved homework restores only valid unique IDs', () => {
  const broken = harness({ raw: '{broken JSON' });
  assert.equal(broken.state.module, 'start');
  assert.equal(broken.state.homework.size, 0);
  const h = harness({ saved: { module: 'followup', homework: ['teach-peer', 'removed-mission', 'teach-peer', false, 'repeat-work'] } });
  assert.equal(h.state.module, 'followup');
  assert.deepEqual([...h.state.homework], ['teach-peer', 'repeat-work']);
  h.persist();
  assert.deepEqual(JSON.parse(h.stored()).homework, ['teach-peer', 'repeat-work']);
});

test('checking, reloading and unchecking homework persists progress without replacing the lesson or edited prompt', () => {
  const saved = { module: 'followup', done: ['start', 'sauce', 'workshop2'], checks: { 'workshop2:0': true }, homework: [] };
  const h = harness({ saved }), draft = 'Use my actual files and my own instructions';
  const checks = h.state.checks;
  h.drafts.set('leader-homework', draft);
  h.setHomework('repeat-work', true);
  h.setHomework('teach-peer', true);
  h.setHomework('teach-peer', true);
  assert.deepEqual([...h.state.homework], ['repeat-work', 'teach-peer']);
  assert.equal(h.count.textContent, '2 / 3');
  assert.deepEqual(h.inputs.map(input => input.checked), [true, true, false]);
  assert.deepEqual(h.cards.map(card => card.classes.has('is-done')), [true, true, false]);
  assertPromptPreserved(h, draft, checks);
  assert.deepEqual(JSON.parse(h.stored()), { ...saved, homework: ['repeat-work', 'teach-peer'] });

  const reloaded = harness({ raw: h.stored() }), reloadedChecks = reloaded.state.checks;
  assert.deepEqual([...reloaded.state.homework], ['repeat-work', 'teach-peer']);
  assert.equal(reloaded.state.module, saved.module);
  assert.deepEqual([...reloaded.state.done], saved.done);
  assert.deepEqual(plain(reloaded.state.checks), saved.checks);
  reloaded.drafts.set('leader-homework', draft);
  reloaded.setHomework('repeat-work', false);
  assert.deepEqual([...reloaded.state.homework], ['teach-peer']);
  assert.equal(reloaded.count.textContent, '1 / 3');
  assert.deepEqual(reloaded.inputs.map(input => input.checked), [false, true, false]);
  assert.deepEqual(reloaded.cards.map(card => card.classes.has('is-done')), [false, true, false]);
  assertPromptPreserved(reloaded, draft, reloadedChecks);
  assert.deepEqual(JSON.parse(reloaded.stored()), { ...saved, homework: ['teach-peer'] });
});

test('unknown homework IDs cannot change state, storage, cards, focus or prompt drafts', () => {
  const saved = { module: 'followup', done: ['sauce'], checks: { 'sauce:0': true }, homework: ['repeat-work'] };
  const h = harness({ saved }), draft = 'My draft stays in place';
  const checks = h.state.checks, originalStorage = h.stored();
  h.drafts.set('leader-homework', draft);
  for (const id of ['removed-mission', '__proto__', '', undefined, null, 7, { id: 'teach-peer' }]) {
    h.setHomework(id, true);
    h.setHomework(id, false);
  }
  assert.deepEqual([...h.state.homework], ['repeat-work']);
  assert.equal(h.state.module, saved.module);
  assert.deepEqual([...h.state.done], saved.done);
  assert.deepEqual(plain(h.state.checks), saved.checks);
  assert.equal(h.stored(), originalStorage);
  assert.equal(h.writes.length, 0);
  assert.equal(h.domChanges.length, 0);
  assert.equal(h.count.textContent, '');
  assert.deepEqual(h.inputs.map(input => input.checked), [false, false, false]);
  assertPromptPreserved(h, draft, checks);
});
