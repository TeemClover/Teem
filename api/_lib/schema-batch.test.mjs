import test from 'node:test';
import assert from 'node:assert/strict';
import { neon, neonConfig } from '@neondatabase/serverless';
import { runSchemaBatch } from './schema-batch.js';
import { ensureSchema } from './core.js';
import { ensureAiSourceSchema } from './ai-source-store.js';
import { ensureLearnSchema } from './learn-store.js';
import { ensureCommerceSchema } from './learn-commerce.js';

function transport(t, respond) {
  const previous = neonConfig.fetchFunction, requests = [];
  // Use the real Neon serializer with a local fetch double, never a live database.
  neonConfig.fetchFunction = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    if (respond) await respond(request, requests.length);
    return new Response(JSON.stringify({ results: request.queries.map(() => ({
      fields: [], rows: [], rowCount: 0, command: 'CREATE',
    })) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { neonConfig.fetchFunction = previous; });
  return {
    sql: neon('postgresql://schema_test:unused@ep-schema-test.us-east-2.aws.neon.tech/schema_test'),
    requests,
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('native Neon sends dependent schema statements once, in order, in one request', async t => {
  const { sql, requests } = transport(t);
  const statements = [
    'CREATE TABLE IF NOT EXISTS batch_test (id INTEGER)',
    'ALTER TABLE batch_test ADD COLUMN IF NOT EXISTS value TEXT',
    'CREATE INDEX IF NOT EXISTS batch_test_value ON batch_test(value)',
  ];
  await runSchemaBatch(sql, statements);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].queries.map(query => query.query), statements);
});

test('query-only adapters retain serial order and stop immediately on failure', async () => {
  const queries = [], failure = new Error('DDL failed');
  let active = 0, peak = 0;
  const sql = { async query(statement) {
    queries.push(statement); active++; peak = Math.max(peak, active);
    await Promise.resolve(); active--;
    if (statement === 'second') throw failure;
    return [];
  } };
  await assert.rejects(runSchemaBatch(sql, ['first', 'second', 'third']), error => error === failure);
  assert.deepEqual(queries, ['first', 'second']);
  assert.equal(peak, 1);
});

test('a transaction rejection is not swallowed or replayed as individual queries', async () => {
  const failure = new Error('transaction rejected');
  let transactions = 0, directQueries = 0;
  const sql = {
    async transaction(build) {
      transactions++;
      assert.deepEqual(build({ query: statement => statement }), ['first', 'second']);
      throw failure;
    },
    async query() { directQueries++; },
  };
  await assert.rejects(runSchemaBatch(sql, ['first', 'second']), error => error === failure);
  assert.equal(transactions, 1);
  assert.equal(directQueries, 0);
});

test('a cold checkout batches all 97 schema statements in four ordered requests, then caches them', async t => {
  const { sql, requests } = transport(t);
  await ensureAiSourceSchema(sql);
  await ensureSchema(sql);
  await ensureCommerceSchema(sql);
  assert.deepEqual(requests.map(request => request.queries.length), [14, 69, 8, 6]);
  const [registration, core, learn, commerce] = requests.map(request => request.queries.map(query => query.query));
  assert.match(registration[0], /^CREATE TABLE IF NOT EXISTS mc_ai_source_registrations/);
  assert.match(registration.at(-1), /^CREATE TABLE IF NOT EXISTS mc_ai_source_api_checks/);
  assert.match(core[0], /^CREATE TABLE IF NOT EXISTS members/);
  assert.match(core.at(-1), /^CREATE INDEX IF NOT EXISTS idx_xty_system_errors_created/);
  assert.match(learn[0], /^CREATE TABLE IF NOT EXISTS mc_learn_enrollments/);
  assert.match(commerce[0], /^CREATE TABLE IF NOT EXISTS mc_learn_offers/);
  assert.match(commerce.at(-1), /^CREATE TABLE IF NOT EXISTS mc_learn_funnel_events/);
  await Promise.all([ensureSchema(sql), ensureAiSourceSchema(sql), ensureLearnSchema(sql), ensureCommerceSchema(sql)]);
  assert.equal(requests.length, 4, 'warm calls issue no schema requests');
});

for (const [name, ensure] of [
  ['core', ensureSchema], ['registration', ensureAiSourceSchema],
  ['learn', ensureLearnSchema], ['commerce', ensureCommerceSchema],
]) {
  test(`${name} concurrent native batches share initialization and retry a failed transaction`, async t => {
    const entered = deferred(), release = deferred();
    let fail = true;
    const { sql, requests } = transport(t, async () => {
      if (fail) {
        entered.resolve(); await release.promise;
        throw new Error('simulated transport failure');
      }
    });
    const first = ensure(sql);
    await entered.promise;
    const second = ensure(sql);
    const waiting = Promise.allSettled([first, second]);
    assert.equal(requests.length, 1, 'concurrent caller waits on the first batch');
    release.resolve();
    const results = await waiting;
    for (const result of results) {
      assert.equal(result.status, 'rejected');
      assert.match(result.reason.message, /simulated transport failure/);
    }
    assert.equal(requests.length, 1, 'failure must not cause an implicit serial fallback');
    fail = false;
    await ensure(sql);
    assert.deepEqual(requests[1].queries, requests[0].queries, 'failed batch retries from its first statement');
    assert.equal(requests.length, name === 'commerce' ? 3 : 2);
    const completed = requests.length;
    await ensure(sql);
    assert.equal(requests.length, completed);
  });
}

test('commerce waits for the learn batch to commit and retries only its failed dependent batch', async t => {
  const entered = deferred(), release = deferred();
  let rejectCommerce = true;
  const { sql, requests } = transport(t, async (request, count) => {
    if (count === 1) { entered.resolve(); await release.promise; }
    if (request.queries[0].query.startsWith('CREATE TABLE IF NOT EXISTS mc_learn_offers') && rejectCommerce) {
      throw new Error('commerce transaction failed');
    }
  });
  const first = ensureCommerceSchema(sql);
  await entered.promise;
  assert.equal(requests.length, 1, 'commerce must not start before its learn prerequisite finishes');
  release.resolve();
  await assert.rejects(first, /commerce transaction failed/);
  assert.equal(requests.length, 2);
  rejectCommerce = false;
  await ensureCommerceSchema(sql);
  assert.equal(requests.length, 3, 'successful prerequisite stays cached');
  assert.deepEqual(requests[2].queries, requests[1].queries);
});
