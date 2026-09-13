import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../../classroom/prompts.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ═══ เริ่มทำงาน ═══');
const end = html.indexOf('\n})();', start);
assert.ok(start >= 0 && end > start, 'The actual prompt-vault initialization block must be present');
const initialization = html.slice(start, end);

function initialize(search, { unavailableStorage = false } = {}) {
  const chips = ['food', 'oracle', 'file'].map(id => ({
    id, pressed: 'false',
    getAttribute(name) { return name === 'data-i' ? this.id : name === 'aria-pressed' ? this.pressed : null; },
    setAttribute(name, value) { assert.equal(name, 'aria-pressed'); this.pressed = value; }
  }));
  const qEl = { value: '' };
  const calls = [];
  let context;
  context = vm.createContext({
    location: { search }, qEl, active: [],
    sessionStorage: { getItem(key) {
      if (unavailableStorage) throw new Error('Storage is unavailable');
      return { mc_v_q: 'old meal plan', mc_v_i: 'food,oracle' }[key] ?? null;
    } },
    $(id) { assert.equal(id, 'chips'); return { querySelectorAll(selector) { assert.equal(selector, '.chip'); return chips; } }; },
    // The existing run() retains responsibility for ranking and saving the current
    // query/chips. Capture its inputs instead of reimplementing search or storage.
    run() { calls.push({ query: qEl.value, active: [...context.active] }); },
    paintG() { calls.push('paint'); }
  });
  vm.runInContext(initialization, context, { filename: 'classroom/prompts.html:initialization' });
  return { query: qEl.value, active: [...context.active], chips: chips.map(chip => chip.pressed), calls };
}

for (const query of ['SOP', 'README']) {
  test(`an explicit ${query} lesson URL clears stale hard intent filters before searching`, () => {
    const result = initialize('?q=' + query);
    assert.equal(result.query, query);
    assert.deepEqual(result.active, []);
    assert.deepEqual(result.chips, ['false', 'false', 'false']);
    assert.deepEqual(result.calls, [{ query, active: [] }, 'paint']);
  });
}

test('an explicitly empty q resets both the stored search and intent-chip state', () => {
  const result = initialize('?entry=shelf&q=&source=handoff');
  assert.equal(result.query, '');
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.chips, ['false', 'false', 'false']);
  assert.deepEqual(result.calls, [{ query: '', active: [] }, 'paint']);
});

test('URL-encoded terms and plus-separated words are decoded before searching', () => {
  const result = initialize('?q=%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%A1%E0%B8%B7%E0%B8%AD+README');
  assert.equal(result.query, 'คู่มือ README');
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.calls[0], { query: 'คู่มือ README', active: [] });
});

test('without q, visiting the lesson retains the previous query and intent chips', () => {
  const result = initialize('?entry=shelf');
  assert.equal(result.query, 'old meal plan');
  assert.deepEqual(result.active, ['food', 'oracle']);
  assert.deepEqual(result.chips, ['true', 'true', 'false']);
});

test('malformed URL encoding does not interrupt lesson initialization', () => {
  const result = initialize('?q=%E0%A4%A');
  assert.equal(result.query, 'old meal plan');
  assert.deepEqual(result.active, ['food', 'oracle']);
  assert.deepEqual(result.calls, [{ query: 'old meal plan', active: ['food', 'oracle'] }, 'paint']);
});

test('an explicit query still works when sessionStorage is unavailable', () => {
  const result = initialize('?q=SOP', { unavailableStorage: true });
  assert.equal(result.query, 'SOP');
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.chips, ['false', 'false', 'false']);
  assert.deepEqual(result.calls, [{ query: 'SOP', active: [] }, 'paint']);
});
