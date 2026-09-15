import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoController } from './demo-controller.js';

function fixture(options = {}) {
  const timers = new Map();
  const history = [];
  let nextId = 0;
  const controller = createDemoController({
    ...options,
    schedule(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, delay });
      return id;
    },
    cancel(id) { timers.delete(id); },
    onChange(state, reason) { history.push({ ...state, reason }); }
  });
  const tick = () => {
    assert.equal(timers.size, 1, 'exactly one reveal is scheduled');
    const [id, task] = timers.entries().next().value;
    timers.delete(id);
    task.callback();
    return task;
  };
  return { controller, timers, history, tick };
}

test('four deliberate clicks reveal four sequential clips each, then stop at 16', () => {
  const { controller, timers, history, tick } = fixture();
  assert.equal(controller.snapshot().visible, 4);
  assert.equal(controller.snapshot().revealed, 0);
  for (let batch = 0; batch < 4; batch += 1) {
    assert.equal(controller.start(), true);
    assert.equal(controller.snapshot().visible, (batch + 1) * 4);
    assert.equal(controller.snapshot().revealed, batch * 4);
    for (let result = 1; result <= 4; result += 1) {
      assert.equal(tick().delay, 620);
      assert.equal(controller.snapshot().revealed, batch * 4 + result);
      assert.equal(controller.snapshot().busy, result !== 4);
    }
    assert.equal(timers.size, 0, 'a next batch waits for the next click');
  }
  assert.equal(controller.snapshot().complete, true);
  assert.equal(controller.start(), false);
  assert.equal(timers.size, 0);
  assert.deepEqual(history.filter(item => item.reason === 'reveal').map(item => item.revealed),
    Array.from({ length: 16 }, (_, index) => index + 1));
});

test('rapid repeated clicks cannot queue extra batches or parallel timers', () => {
  const { controller, timers, tick } = fixture();
  controller.start();
  for (let click = 0; click < 10; click += 1) assert.equal(controller.start(), false);
  assert.equal(timers.size, 1);
  tick();
  assert.equal(controller.start(), false);
  tick(); tick(); tick();
  assert.equal(controller.snapshot().revealed, 4);
  assert.equal(controller.snapshot().visible, 4);
  assert.equal(timers.size, 0);
});

test('reset cancels an in-flight batch and ignores a stale timer callback', () => {
  const { controller, timers, tick } = fixture();
  controller.start();
  tick();
  const stale = timers.values().next().value.callback;
  controller.reset();
  stale();
  assert.equal(controller.snapshot().revealed, 0);
  assert.equal(controller.snapshot().visible, 4);
  assert.equal(controller.snapshot().busy, false);
  assert.equal(timers.size, 0);
  assert.equal(controller.start(), true);
  tick();
  assert.equal(controller.snapshot().revealed, 1);
});

test('page interruption pauses the batch and resumes from the next unrevealed clip', () => {
  const { controller, timers, tick } = fixture();
  controller.start(); tick();
  const stale = timers.values().next().value.callback;
  controller.suspend();
  stale();
  assert.equal(timers.size, 0);
  assert.equal(controller.snapshot().revealed, 1);
  assert.equal(controller.snapshot().busy, true);
  assert.equal(controller.start(), false);
  controller.resume();
  controller.resume();
  tick(); tick(); tick();
  assert.equal(controller.snapshot().revealed, 4);
  assert.equal(controller.snapshot().busy, false);
  assert.equal(timers.size, 0);
});

test('reset while suspended stays paused and may start again after resuming', () => {
  const { controller, timers, tick } = fixture();
  controller.start(); controller.suspend(); controller.reset();
  assert.equal(controller.start(), false);
  controller.resume();
  assert.equal(timers.size, 0);
  controller.start(); tick();
  assert.equal(controller.snapshot().revealed, 1);
});

test('partial final batches respect total bounds and invalid totals are rejected', () => {
  const { controller, tick } = fixture({ total: 6, batchSize: 4 });
  controller.start(); tick(); tick(); tick(); tick();
  controller.start(); tick(); tick();
  assert.equal(controller.snapshot().revealed, 6);
  assert.equal(controller.snapshot().visible, 6);
  assert.equal(controller.snapshot().complete, true);
  assert.equal(controller.start(), false);
  for (const options of [{ total: 0 }, { total: 2.5 }, { batchSize: -1 }]) {
    assert.throws(() => createDemoController(options), RangeError);
  }
});
