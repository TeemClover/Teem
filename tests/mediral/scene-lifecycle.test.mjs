import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../mediral/js/story.js', import.meta.url), 'utf8');
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Scene test boundary is missing: ${start}`);
  return source.slice(from, to);
}

// Execute the actual lifecycle tail, state initializer and environment builder. Only the browser,
// scheduler and graphics boundary are adapters; no animation-loop or restore logic is copied here.
// These tests verify lifecycle/resource contracts, not GPU pixels or shader appearance.
const environmentSource = between('  function refreshEnvironment() {', '\n  refreshEnvironment();');
const stateSource = between('  const s = {', '  const view =');
const loopStart = source.indexOf('  /* ---- loop ---- */');
const loopEnd = source.lastIndexOf('\n}');
assert.ok(loopStart >= 0 && loopEnd > loopStart);
const loopSource = source.slice(loopStart, loopEnd);
const flush = () => new Promise(resolve => setImmediate(resolve));

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    fire(name, event = {}) { for (const listener of listeners.get(name) || []) listener(event); },
    get listenerCount() { return [...listeners.values()].reduce((n, list) => n + list.size, 0); },
  };
}

async function fixture({reduced = false} = {}) {
  const frames = new Map(), targets = [], events = [], order = [];
  const windowEvents = eventTarget(), canvas = eventTarget(), document = eventTarget(), stacked = eventTarget();
  document.hidden = false;
  let nextFrame = 0, clock = 0, rendered = 0, gpuLost = false, failEnvironment = false;
  let roomsDisposed = 0, generatorsDisposed = 0, rendererDisposed = false;
  class Vector {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    copy(other) { return this.set(other.x, other.y, other.z); }
    add() { return this; }
    lerp() { return this; }
  }
  const renderer = {
    getContext: () => ({isContextLost: () => gpuLost}),
    render() { rendered++; },
    dispose() { rendererDisposed = true; },
  };
  const context = vm.createContext({
    reduced, steps: ['CL', 'AC', 'BR', 'SU', 'PO'].map(id => ({id})),
    Vector2: Vector, Vector3: Vector, camPos: new Vector(), camLook: new Vector(),
    camera: {position: new Vector(), lookAt() {}}, renderer,
    scene: {environment: null, traverse() {}},
    document, el: canvas, stacked, innerWidth: 1200, innerHeight: 800,
    addEventListener: windowEvents.addEventListener, removeEventListener: windowEvents.removeEventListener,
    requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    resize() {}, place() {}, loadSpecimens: async () => null,
    onContextChange(status) { events.push(status); order.push(`context:${status}`); },
    console: {warn() {}},
    PMREMGenerator: class {
      fromScene() {
        if (failEnvironment) throw new Error('GPU environment allocation failed');
        const id = targets.length + 1;
        const target = {texture: {id, valid: true}, disposed: false, dispose() { this.disposed = true; }};
        targets.push(target);
        order.push(`environment:${id}`);
        return target;
      }
      dispose() { generatorsDisposed++; }
    },
    RoomEnvironment: class { dispose() { roomsDisposed++; } },
  });
  vm.runInContext(`
    function buildLifecycle() {
      let disposed = false, environmentTarget;
      ${environmentSource}
      refreshEnvironment();
      ${stateSource}
      ${loopSource}
    }
    globalThis.stage = buildLifecycle();
  `, context, {filename: 'mediral/js/story.js (actual lifecycle source)'});
  await flush();
  return {
    stage: context.stage, context, frames, targets, events, order, document,
    get rendered() { return rendered; },
    get resourceCounts() { return {roomsDisposed, generatorsDisposed, rendererDisposed}; },
    get listenerCount() { return windowEvents.listenerCount + canvas.listenerCount + document.listenerCount + stacked.listenerCount; },
    frame() {
      assert.equal(frames.size, 1, 'There must be exactly one scheduled animation frame');
      const [id, fn] = frames.entries().next().value;
      frames.delete(id);
      fn(clock += 16);
    },
    loseContext() {
      gpuLost = true;
      context.scene.environment.valid = false;
      let prevented = false;
      canvas.fire('webglcontextlost', {preventDefault() { prevented = true; }});
      assert.ok(prevented, 'The scene allows the browser to restore its context');
    },
    restoreContext({fail = false} = {}) {
      gpuLost = false;
      failEnvironment = fail;
      canvas.fire('webglcontextrestored');
    },
  };
}

test('repeated scene wake requests keep exactly one RAF loop', async () => {
  const ui = await fixture();
  for (let i = 0; i < 5; i++) {
    ui.stage.resume();
    ui.stage.setProgress(1.2);
    ui.stage.setSelection(['CL', 'AC']);
  }
  await flush();
  ui.frame();
  assert.equal(ui.rendered, 1);
  assert.equal(ui.frames.size, 1);
  ui.stage.dispose();
});

test('paused and hidden scenes cannot be restarted by progress or asset completion', async () => {
  const ui = await fixture();
  ui.stage.pause();
  ui.stage.setProgress(3.2);
  ui.stage.setBand({left: 0.45, right: 0.9});
  await flush();
  assert.equal(ui.frames.size, 0);
  ui.document.hidden = true;
  ui.stage.resume();
  assert.equal(ui.frames.size, 0);
  ui.document.hidden = false;
  ui.document.fire('visibilitychange');
  ui.frame();
  assert.equal(ui.rendered, 1);
  ui.stage.dispose();
});

test('changing reduced motion draws one composed frame then resumes at the real progress', async () => {
  const ui = await fixture();
  ui.stage.setProgress(2.23);
  await flush();
  ui.frame();
  ui.stage.setReducedMotion(true);
  ui.frame();
  assert.equal(ui.stage.state.u, 2.8);
  assert.equal(ui.stage.state.running, false);
  assert.equal(ui.frames.size, 0);
  ui.stage.setReducedMotion(false);
  assert.equal(ui.stage.state.target, 2.23);
  await flush();
  assert.equal(ui.frames.size, 1);
  ui.stage.dispose();
});

test('context loss stops rendering and restore rebuilds the environment before revealing the scene', async () => {
  const ui = await fixture();
  const previous = ui.context.scene.environment;
  ui.loseContext();
  ui.stage.setProgress(3.2);
  ui.stage.resume();
  await flush();
  assert.equal(ui.frames.size, 0);
  ui.restoreContext();
  assert.notEqual(ui.context.scene.environment, previous);
  assert.equal(ui.context.scene.environment.valid, true);
  assert.equal(ui.targets[0].disposed, true);
  assert.equal(ui.targets[1].disposed, false);
  assert.deepEqual(ui.order.slice(-2), ['environment:2', 'context:restored']);
  assert.deepEqual(ui.events, ['lost', 'restored']);
  assert.equal(ui.stage.state.contextLost, false);
  assert.equal(ui.frames.size, 1);
  assert.equal(ui.resourceCounts.roomsDisposed, 2);
  assert.equal(ui.resourceCounts.generatorsDisposed, 2);
  ui.stage.dispose();
});

test('failed PMREM regeneration keeps the static fallback and releases temporary resources', async () => {
  const ui = await fixture();
  ui.loseContext();
  ui.restoreContext({fail: true});
  assert.equal(ui.stage.state.contextLost, true);
  assert.equal(ui.frames.size, 0);
  assert.deepEqual(ui.events, ['lost', 'lost']);
  assert.equal(ui.targets.length, 1);
  assert.equal(ui.targets[0].disposed, false);
  assert.equal(ui.resourceCounts.roomsDisposed, 2);
  assert.equal(ui.resourceCounts.generatorsDisposed, 2);
  ui.stage.setProgress(4.2);
  await flush();
  assert.equal(ui.frames.size, 0);
  ui.stage.dispose();
});

test('disposing a scene cancels frames, removes its listeners and prevents later wakes', async () => {
  const ui = await fixture();
  assert.ok(ui.listenerCount > 0);
  ui.stage.setProgress(3.1); // Leave an asset-completion microtask pending while disposing.
  ui.stage.dispose();
  await flush();
  ui.stage.resume();
  ui.stage.setProgress(1.1);
  assert.equal(ui.frames.size, 0);
  assert.equal(ui.listenerCount, 0);
  assert.equal(ui.targets[0].disposed, true);
  assert.equal(ui.resourceCounts.rendererDisposed, true);
  ui.restoreContext();
  assert.equal(ui.targets.length, 1);
});
