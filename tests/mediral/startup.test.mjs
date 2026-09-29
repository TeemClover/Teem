import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../mediral/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function fixture({flow = false} = {}) {
  const classes = new Set(['mr-flow', 'mr-boot']);
  const timers = new Map(), listeners = new Map();
  const context = {
    document: {documentElement: {classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
    }}},
    matchMedia: () => ({matches: flow}), window: {},
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    setTimeout(fn, delay) { timers.set(1, {fn, delay}); return 1; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(script, context);
  return {classes, timers, listeners, startup: context.window.__mediralStartup,
    error(id) { listeners.get('error')?.({target: {id}}); },
    timeout() { const timer = timers.get(1); timers.delete(1); timer?.fn(); }};
}

test('without module execution a bounded watchdog restores readable static flow and the HTML still has working LINE', () => {
  const f = fixture();
  assert.ok(f.classes.has('mr-boot'));
  assert.ok(!f.classes.has('mr-flow'));
  assert.equal(f.timers.get(1).delay, 8000);
  f.timeout();
  assert.equal(f.startup.fallback, true);
  assert.ok(f.classes.has('mr-flow'));
  assert.ok(f.classes.has('mr-nodata'));
  assert.ok(!f.classes.has('mr-boot'));
  assert.match(html, /data-slot="line-link" href="https:\/\/lin\.ee\/rlSlhzT"/);
});

test('only the entry module error releases the gate; an unrelated failed image cannot cancel startup', () => {
  const f = fixture();
  f.error('a-product-image');
  assert.equal(f.startup.pending, true);
  f.error('mediral-module');
  assert.equal(f.startup.fallback, true);
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.size, 0);
  assert.ok(!f.classes.has('mr-boot'));
});

test('a successfully posed page cancels the fallback and late errors cannot repin or unpin it', () => {
  const f = fixture();
  f.startup.ready();
  assert.equal(f.startup.pending, false);
  assert.equal(f.startup.fallback, false);
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.size, 0);
  f.startup.fail();
  assert.equal(f.startup.fallback, false);
  assert.ok(!f.classes.has('mr-flow'));
  assert.ok(!f.classes.has('mr-boot'));
});

test('no JavaScript and reduced motion both retain flow from the first paint', () => {
  assert.match(html, /<html[^>]*class="[^"]*\bmr-flow\b/);
  const f = fixture({flow: true});
  assert.ok(f.classes.has('mr-flow'));
  f.startup.ready();
  assert.ok(f.classes.has('mr-flow'));
  assert.ok(!f.classes.has('mr-boot'));
});
