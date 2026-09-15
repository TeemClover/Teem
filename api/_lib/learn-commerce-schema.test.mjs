import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureAiSourceSchema } from './ai-source-store.js';
import { ensureCommerceSchema } from './learn-commerce.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

for (const [name, ensure, lastStatement] of [
  ['registration', ensureAiSourceSchema, 'CREATE TABLE IF NOT EXISTS mc_ai_source_api_checks'],
  ['commerce', ensureCommerceSchema, 'CREATE TABLE IF NOT EXISTS mc_learn_funnel_events'],
]) {
  test(`${name} schema concurrent and warm requests share one ordered initialization`, async () => {
    const entered = deferred(), release = deferred(), queries = [];
    let active = 0, peak = 0;
    const sql = { async query(statement) {
      queries.push(statement); active++; peak = Math.max(peak, active);
      if (queries.length === 1) { entered.resolve(); await release.promise; }
      await Promise.resolve();
      active--;
      return [];
    } };
    const first = ensure(sql);
    await entered.promise;
    const second = ensure(sql), third = ensure(sql);
    assert.equal(queries.length, 1, 'other requests must wait for the schema in flight');
    release.resolve();
    await Promise.all([first, second, third]);
    assert.equal(peak, 1, 'dependent schema statements remain sequential');
    assert.equal(queries.filter(q => q.startsWith(lastStatement)).length, 1);
    const completedCount = queries.length;
    assert.ok(completedCount > 1);
    await ensure(sql);
    assert.equal(queries.length, completedCount, 'a warm request makes no schema round trips');
  });

  test(`${name} schema cache is isolated by database client`, async () => {
    const entered = deferred(), release = deferred();
    const a = [], b = [];
    const clientA = { async query(statement) {
      a.push(statement);
      if (a.length === 1) { entered.resolve(); await release.promise; }
      return [];
    } };
    const clientB = { async query(statement) { b.push(statement); return []; } };
    const pendingA = ensure(clientA);
    await entered.promise;
    await ensure(clientB);
    assert.equal(a.length, 1, 'client A is still waiting');
    assert.ok(b.at(-1).startsWith(lastStatement), 'client B initializes independently');
    release.resolve();
    await pendingA;
    assert.deepEqual(a, b, 'both clients receive the complete schema in the same order');
  });

  test(`${name} schema failure rejects all waiting callers and permits a complete retry`, async () => {
    const failure = new Error('transient schema failure');
    const entered = deferred(), release = deferred(), queries = [];
    let shouldFail = true;
    const sql = { async query(statement) {
      queries.push(statement);
      if (shouldFail && statement.startsWith(lastStatement)) {
        entered.resolve(); await release.promise; throw failure;
      }
      return [];
    } };
    const first = ensure(sql);
    await entered.promise;
    const second = ensure(sql);
    const settled = Promise.allSettled([first, second]);
    release.resolve();
    const results = await settled;
    for (const result of results) {
      assert.equal(result.status, 'rejected');
      assert.equal(result.reason, failure);
    }
    assert.equal(queries.filter(q => q.startsWith(lastStatement)).length, 1);
    shouldFail = false;
    await ensure(sql);
    assert.equal(queries.filter(q => q.startsWith(lastStatement)).length, 2);
    const successfulCount = queries.length;
    await ensure(sql);
    assert.equal(queries.length, successfulCount);
  });

  test(`${name} schema retries after a synchronous query failure, including prerequisites`, async () => {
    const failure = new Error('connection unavailable');
    const queries = [];
    let shouldFail = true;
    const sql = { query(statement) {
      queries.push(statement);
      if (shouldFail) throw failure;
      return Promise.resolve([]);
    } };
    await assert.rejects(ensure(sql), error => error === failure);
    shouldFail = false;
    await ensure(sql);
    assert.equal(queries[0], queries[1], 'the failed first step is retried');
    assert.ok(queries.at(-1).startsWith(lastStatement));
  });
}
