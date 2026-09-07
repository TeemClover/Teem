import test from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_VERSION, EVENTS, validateEvent } from '../../assets/front-door/contract.js';
import { handleFrontdoorRequest, ensureFrontdoorSchema, readFrontdoorStats } from '../backend/frontdoor-v2.js';
import { onRequest as apiRoute } from '../../functions/api/core7/[[path]].js';
import { CORE7_ANALYTICS_VERSION, recordClientEvent } from '../backend/analytics-v11.js';
import { sqliteD1 } from './helpers/sqlite-d1.mjs';

const NOW = Date.parse('2026-09-07T12:00:00+07:00');
let sequence = 0;
function event(eventName = 'FRONTDOOR_OPEN', extra = {}) {
  return {
    eventId: `e-test-${++sequence}`, installId: 'test-installation', journeyId: 'j-test-one', visitId: 'v-test-one',
    eventName, occurredAt: NOW, path: '/frontdoor/', source: 'direct', visitorClass: 'new',
    intentPrimary: 'build', doorId: 'dungeon', experienceVersion: 'frontdoor-test-v1',
    analyticsVersion: ANALYTICS_VERSION, graphicsTier: 'essential', viewport: 'mobile', motion: 'full',
    audio: 'available', env: 'local', properties: eventName === 'SAVE' ? { checkpointDurable: true } : {}, ...extra,
  };
}
async function post(db, payload, options = {}) {
  const url = options.url || 'http://localhost/api/core7/analytics/frontdoor';
  return (options.route || handleFrontdoorRequest)({
    request: new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...options.headers }, body: JSON.stringify(payload) }),
    env: { DB: db, ...options.env }, params: { path: ['analytics', 'frontdoor'] },
  });
}
const range = { from: '2026-09-07', to: '2026-09-07', env: 'local' };

test('canonical registry contains exactly the approved 15 names', () => {
  assert.deepEqual(Object.keys(EVENTS), ['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'FRONTDOOR_REACTION_COMPLETE', 'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN', 'RETURN', 'RESUME', 'REBUILD', 'FRONTDOOR_FREE_ROAM', 'ANOMALY_START', 'LEGACY_WARNING', 'DUNGEON_HANDOFF']);
  for (const name of Object.keys(EVENTS)) assert.equal(validateEvent(event(name)).ok, true, name);
});

test('unknown, malformed, oversized and unsafe properties are handled before persistence', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  for (const [payload, expected] of [
    [event('MADE_UP'), 'UNKNOWN_EVENT'], [event(undefined, { eventId: 'unsafe/identifier' }), 'INVALID_ID'],
    [event(undefined, { installId: {} }), 'INVALID_ID'], [event(undefined, { env: 'staging' }), 'INVALID_ENV'],
    [event(undefined, { properties: { activeMsToFirstChoice: -1 } }), 'INVALID_TIMING'],
    [event(undefined, { properties: { secretText: 'x'.repeat(9000) } }), 'PAYLOAD_TOO_LARGE'],
    [event('SAVE', { properties: {} }), 'SAVE_NOT_DURABLE'],
  ]) {
    const response = await post(db, payload);
    assert.equal(response.status, expected === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
    assert.equal((await response.json()).error, expected);
  }
  const malformed = await handleFrontdoorRequest({ request: new Request('http://localhost/api/core7/analytics/frontdoor', { method: 'POST', body: '{no json' }), env: { DB: db } });
  assert.equal(malformed.status, 400);
  const safe = await post(db, event(undefined, { properties: { secretText: 'do not store', activeMsInJourney: 400 }, rawStorage: { secret: 'private' } }));
  assert.equal(safe.status, 202);
  const row = await db.prepare('SELECT properties_json FROM fd_v2_events').first();
  assert.deepEqual(JSON.parse(row.properties_json), { activeMsInJourney: 400 });
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM fd_v2_events').first()).n, 1);
});

test('streamed oversized bodies are stopped without trusting Content-Length', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(4096)); }, cancel() { cancelled = true; } });
  const response = await handleFrontdoorRequest({ request: new Request('http://localhost/api/core7/analytics/frontdoor', { method: 'POST', body: stream, duplex: 'half' }), env: { DB: db } });
  assert.equal(response.status, 413); assert.equal(cancelled, true);
});

test('environment and Origin separate local, preview and production storage', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  assert.equal((await post(db, event(), { url: 'https://teem.pages.dev/api/core7/analytics/frontdoor' })).status, 403);
  assert.equal((await post(db, event(undefined, { env: 'prod' }), { url: 'https://teem.pages.dev/api/core7/analytics/frontdoor', headers: { origin: 'http://localhost:3000' } })).status, 403);
  assert.equal((await post(db, event(undefined, { env: 'prod' }), { url: 'https://teem.pages.dev/api/core7/analytics/frontdoor', headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await post(db, event(), { url: 'https://unknown.example/api/core7/analytics/frontdoor' })).status, 503);
  assert.equal((await post(db, event(undefined, { env: 'prod' }), { env: { FRONTDOOR_ENV: 'prod' } })).status, 403);
  assert.equal((await post(db, event(undefined, { env: 'prod' }), { url: 'https://fixture.teem.pages.dev/api/core7/analytics/frontdoor', env: { FRONTDOOR_ENV: 'prod' } })).status, 503);
  assert.equal((await post(db, event())).status, 202);
  assert.equal((await post(db, event(undefined, { env: 'preview' }), { url: 'https://fixture.teem.pages.dev/api/core7/analytics/frontdoor', headers: { origin: 'https://fixture.teem.pages.dev' } })).status, 202);
  assert.equal((await post(db, event(undefined, { env: 'prod' }), { url: 'https://teem.pages.dev/api/core7/analytics/frontdoor', headers: { origin: 'https://myclover.com' } })).status, 202);
  for (const env of ['local', 'preview', 'prod']) {
    const stats = await readFrontdoorStats(db, { ...range, env });
    assert.equal(stats.metrics.FRONTDOOR_OPEN.events, 1, env);
  }
});

test('event retries and journey / installation scopes deduplicate in SQLite', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const first = event();
  assert.equal((await (await post(db, first)).json()).duplicate, false);
  assert.equal((await (await post(db, first)).json()).duplicate, true);
  assert.equal((await (await post(db, { ...first, eventName: 'DOOR_OPEN' })).json()).duplicate, true);
  for (const payload of [event('DOOR_FOUND'), event('DOOR_FOUND'), event('DOOR_FOUND', { journeyId: 'j-test-two' })]) await post(db, payload);
  for (const payload of [event('LUCKY_RETURN', { scope: 'installation' }), event('LUCKY_RETURN', { scope: 'installation', journeyId: 'j-test-two' }), event('LUCKY_RETURN', { scope: 'installation', installId: 'test-second-install' })]) await post(db, payload);
  const stats = await readFrontdoorStats(db, range);
  assert.equal(stats.metrics.FRONTDOOR_OPEN.events, 1);
  assert.equal(stats.metrics.DOOR_FOUND.events, 2);
  assert.equal(stats.metrics.DOOR_FOUND.installations, 1);
  assert.equal(stats.metrics.DOOR_FOUND.journeys, 2);
  assert.equal(stats.metrics.LUCKY_RETURN.events, 2);
});

test('Stat fixture uses distinct installations, linked chronology, exact medians and converging graph edges', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  for (const [index, ms] of [1000, 3000, 9000, 11000].entries()) {
    const shared = { installId: `fixture-install-${index}`, journeyId: `j-fixture-${index}`, source: index % 2 ? 'qr' : 'astra-post', viewport: index % 2 ? 'desktop' : 'mobile', intentPrimary: index % 2 ? 'curious' : 'build' };
    await post(db, event('FRONTDOOR_OPEN', shared));
    await post(db, event('FRONTDOOR_CHOICE', { ...shared, occurredAt: NOW + 10, properties: { activeMsToFirstChoice: ms } }));
    // Repeatable choices do not distort one journey's first-touch timing.
    await post(db, event('FRONTDOOR_CHOICE', { ...shared, occurredAt: NOW + 20, properties: { activeMsToFirstChoice: ms + 100000 } }));
    if (index < 3) {
      await post(db, event('LUCKY_RETURN', { ...shared, occurredAt: NOW + 30, properties: { activeMsToLuckyReturn: ms + 2000 } }));
      await post(db, event('DOOR_FOUND', { ...shared, occurredAt: NOW + 40, properties: { activeMsToDoorFound: ms + 4000, fromNode: shared.intentPrimary, toNode: 'dungeon' } }));
    }
  }
  // These unrelated/out-of-order choices cannot improve an Open→Choice linked rate.
  await post(db, event('FRONTDOOR_OPEN', { installId: 'orphan-install', journeyId: 'j-orphan-one' }));
  await post(db, event('FRONTDOOR_CHOICE', { installId: 'orphan-install', journeyId: 'j-orphan-two' }));
  await post(db, event('FRONTDOOR_CHOICE', { installId: 'orphan-install', journeyId: 'j-orphan-one', occurredAt: NOW - 1 }));
  const stats = await readFrontdoorStats(db, range);
  assert.equal(stats.status, 'ready');
  assert.deepEqual(stats.metrics.FRONTDOOR_CHOICE, { installations: 5, journeys: 6, events: 10 });
  assert.equal(stats.timings.activeMsToFirstChoice, 6000);
  assert.equal(stats.timings.activeMsToLuckyReturn, 5000);
  assert.equal(stats.timings.activeMsToDoorFound, 7000);
  assert.deepEqual(stats.rates.find(r => r.from === 'FRONTDOOR_OPEN' && r.to === 'FRONTDOOR_CHOICE'), {
    from: 'FRONTDOOR_OPEN', to: 'FRONTDOOR_CHOICE', numerator: 4, denominator: 5, rate: 0.8,
    unit: 'installations', cohort: 'from-in-range; same-journey; chronological',
  });
  assert.deepEqual(stats.transitions.map(r => [r.from, r.to, r.installations]), [['build', 'dungeon', 2], ['curious', 'dungeon', 1]]);
  assert.equal(stats.breakdowns.source.find(row => row.value === 'astra-post').installations, 2);
  assert.equal((await readFrontdoorStats(db, { ...range, source: 'qr', viewport: 'desktop', intentPrimary: 'curious', doorId: 'dungeon' })).metrics.FRONTDOOR_OPEN.installations, 2);
});

test('Save→Return links prior-day durable saves to later visits, never same-visit refreshes', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  await post(db, event('SAVE', { occurredAt: NOW - 2 * 86400000 }));
  await post(db, event('RETURN', { visitId: 'v-later-visit' }));
  await post(db, event('SAVE', { installId: 'same-visit-install', occurredAt: NOW - 1000 }));
  await post(db, event('RETURN', { installId: 'same-visit-install' }));
  await post(db, event('RETURN', { installId: 'never-saved-install' }));
  const stats = await readFrontdoorStats(db, range);
  const rate = stats.rates.find(row => row.from === 'SAVE' && row.to === 'RETURN');
  assert.equal(rate.denominator, 2); assert.equal(rate.numerator, 1); assert.equal(rate.rate, 0.5);
  assert.equal(stats.metrics.SAVE.installations, 1);
});

test('Stat guard remains fail closed; no-data, unwired, failed and invalid are distinct', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const url = 'http://localhost/api/core7/frontdoor-stats?from=2026-09-07&to=2026-09-07&env=local';
  const request = headers => new Request(url, { headers });
  assert.equal((await handleFrontdoorRequest({ request: request(), env: { DB: db, STAT_PASSWORD: 'fixture-pass' } })).status, 401);
  assert.equal((await (await handleFrontdoorRequest({ request: request(), env: { DB: db } })).json()).status, 'unwired');
  const headers = { authorization: `Basic ${btoa('teem:fixture-pass')}` };
  const env = { DB: db, STAT_PASSWORD: 'fixture-pass' };
  const response = await handleFrontdoorRequest({ request: request(headers), env });
  assert.equal(response.status, 200); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.equal((await response.json()).status, 'no-data');
  assert.equal((await (await handleFrontdoorRequest({ request: request(headers), env: { STAT_PASSWORD: 'fixture-pass' } })).json()).status, 'unwired');
  const badDb = { prepare() { throw new Error('simulated DB outage'); } };
  const failed = await handleFrontdoorRequest({ request: request(headers), env: { ...env, DB: badDb } });
  assert.equal(failed.status, 500); assert.equal((await failed.json()).status, 'request-failed');
  const badRange = await handleFrontdoorRequest({ request: new Request(url.replace('2026-09-07', '2025-01-01'), { headers }), env });
  assert.equal(badRange.status, 400);
  const prodRead = await handleFrontdoorRequest({ request: new Request(url.replace('env=local', 'env=prod'), { headers }), env });
  assert.equal(prodRead.status, 403);
});

test('actual API routing persists V2 without running old migration; V1 1.6.0 and forge remain intact', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const response = await post(db, event(), { route: apiRoute });
  assert.equal(response.status, 202);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name LIKE 'c7_%'").first()).n, 0);
  assert.equal(CORE7_ANALYTICS_VERSION, '1.6.0');
  const legacy = await recordClientEvent(db, { eventId: 'legacy-event-id', installId: 'test-installation', eventType: 'ACT', path: '/', entry: 'forge', ref: 'home-open', analyticsVersion: '1.6.0', occurredAt: NOW });
  assert.equal(legacy.ok, true);
  const row = await db.prepare('SELECT event_type, entry, ref FROM c7_analytics_events').first();
  assert.deepEqual(row, { event_type: 'ACT', entry: 'forge', ref: 'home-open' });
  assert.equal((await readFrontdoorStats(db, range)).metrics.FRONTDOOR_OPEN.events, 1);
});
