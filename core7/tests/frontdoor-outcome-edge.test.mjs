import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as contract from '../../assets/front-door/contract.js';
import * as statData from '../../stat/frontdoor/data.js';
import * as recipeCatalog from '../../ako/kitchen/catalog.js';
import { createTelemetry } from '../../assets/front-door/telemetry.js';
import { prepareOutcomeLink, captureOutcomeDeparture, createOutcomeClient } from '../../assets/front-door/outcomes.js';
import { validateOutcome } from '../../assets/front-door/outcome-contract.js';
import { persistFrontdoorEvent, readFrontdoorStats } from '../backend/frontdoor-v2.js';
import { persistOutcome, readOutcomes } from '../backend/frontdoor-outcomes.js';
import { onRequest } from '../../functions/api/core7/[[path]].js';
import { sqliteD1 } from './helpers/sqlite-d1.mjs';

const BASE = Date.now() - 60000;
let sequence = 0;
const nextId = prefix => `${prefix}-outcome-edge-${++sequence}`;
const timer = () => ({ unref() {} });
function storage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function snapshot(extra = {}) {
  return {
    installation: { installId: nextId('install'), durable: true },
    journey: { journeyId: nextId('j'), source: 'direct', experienceVersion: 'frontdoor-outcome-edge', intentPrimary: 'self' },
    visit: { visitId: nextId('v') }, visitorClass: 'new', ...extra,
  };
}
function departure(extra = {}) {
  const value = snapshot();
  const result = contract.validateEvent({
    eventId: nextId('e'), handoffId: nextId('h'), eventName: 'DOOR_OPEN', env: 'local',
    installId: value.installation.installId, journeyId: value.journey.journeyId, visitId: value.visit.visitId,
    occurredAt: BASE, path: '/frontdoor/', experienceVersion: value.journey.experienceVersion,
    analyticsVersion: contract.ANALYTICS_VERSION, doorId: 'ako', visitorClass: 'new', properties: {}, ...extra,
  });
  assert.equal(result.ok, true);
  return result.event;
}
function receipt(open, extra = {}) {
  return { version: '1.0.0', eventId: nextId('o'), handoffId: open.handoffId, env: open.env,
    name: 'DESTINATION_ARRIVAL', path: '/ako/', occurredAt: open.occurredAt + 1000, ...extra };
}
function backendFetch(db, calls = []) {
  return async (input, init = {}) => {
    const url = new URL(input, 'http://localhost');
    calls.push({ url: url.href, event: JSON.parse(init.body) });
    return onRequest({ request: new Request(url, init), env: { DB: db }, params: { path: url.pathname.split('/').slice(3) } });
  };
}
async function settled(client) {
  for (let attempt = 0; attempt < 40 && client.pending().length; attempt += 1) await nextTurn();
  assert.deepEqual(client.pending(), [], 'destination receipt queue should be acknowledged');
}

test('destination replays the exact source departure while an older P0 request remains in flight', async t => {
  const db = sqliteD1(), store = storage(), session = storage(), sourceCalls = [], destinationCalls = [];
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const dispatch = backendFetch(db, sourceCalls);
  let first = true;
  const telemetry = createTelemetry({
    enabled: true, location: new URL('http://localhost/frontdoor/'), storage: store, sessionStorage: session,
    now: () => BASE, idFactory: nextId, clock: { sample: () => 0, dispose() {} }, setTimeout: timer, clearTimeout() {},
    fetch: async (...args) => { if (first) { first = false; await blocked; } return dispatch(...args); },
  });
  t.after(() => { telemetry.dispose(); db.close(); });
  telemetry.open();
  const inFlight = telemetry.flush();
  telemetry.state.updateJourney({ doorId: 'ako' });
  const link = prepareOutcomeLink('/ako/', { env: 'local', enabled: true, store, origin: 'http://localhost', now: BASE, snapshot: telemetry.state.snapshot() });
  const emitted = telemetry.emit('DOOR_OPEN', { handoffId: link.handoffId });
  const original = telemetry.pending().find(event => event.eventId === emitted.eventId);
  captureOutcomeDeparture(link.handoffId, original, store);
  const destination = createOutcomeClient({ location: new URL(link.href, 'http://localhost'), store, session, now: () => BASE + 1000, delay: timer, fetcher: backendFetch(db, destinationCalls) });
  try {
    destination.arrival();
    await settled(destination);
    assert.equal(sourceCalls.length, 0, 'the source request is still deliberately pending');
    assert.equal(destinationCalls[0].event.eventName, 'DOOR_OPEN');
    assert.equal(destinationCalls[0].event.eventId, emitted.eventId);
    assert.deepEqual(destinationCalls[0].event, original, 'replay must not invent an opening or change its timestamp');
    assert.equal(destinationCalls[1].event.name, 'DESTINATION_ARRIVAL');
    assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE event_name='DOOR_OPEN'").first()).n, 1);
  } finally { release(); await inFlight; }
  await telemetry.flush({ force: true });
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE event_name='DOOR_OPEN'").first()).n, 1, 'late source delivery must deduplicate against destination replay');
});

test('preparing a context-menu link emits nothing; actual arrival commits one sanitized departure', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const store = storage(), session = storage(), calls = [], value = snapshot();
  value.journey.privateNote = 'private-contact-and-financial-detail';
  const link = prepareOutcomeLink('/ako/?entry=compass', { env: 'local', enabled: true, store, origin: 'http://localhost', now: BASE, snapshot: value });
  assert.equal(calls.length, 0);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'fd_v2_%'").first()).n, 0);
  assert.equal([...store.data.values()].join('').includes(value.journey.privateNote), false);
  const client = createOutcomeClient({ location: new URL(link.href, 'http://localhost'), store, session, now: () => BASE + 2000, delay: timer, fetcher: backendFetch(db, calls) });
  assert.equal(calls.length, 0, 'constructing a client is not a departure');
  client.arrival(); await settled(client);
  assert.deepEqual(calls.map(call => call.event.eventName || call.event.name), ['DOOR_OPEN', 'DESTINATION_ARRIVAL']);
  assert.equal(calls[0].event.occurredAt, BASE + 2000, 'deferred opening time is the actual destination load');
  assert.equal(calls[0].event.path, '/frontdoor/');
  assert.equal(JSON.stringify(calls).includes('private-contact'), false);
  assert.equal(JSON.stringify(calls).includes('entry=compass'), false);
  client.arrival(); await settled(client);
  assert.equal(calls.length, 2, 'a repeat arrival in the same loaded document is idempotent');
});

test('fresh handoffs preserve repeat openings while chronology prevents an old arrival crediting a later opening', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const value = snapshot(), store = storage(), session = storage();
  const link1 = prepareOutcomeLink('/ako/', { env: 'local', enabled: true, store, origin: 'http://localhost', now: BASE, snapshot: value });
  const link2 = prepareOutcomeLink('/ako/', { env: 'local', enabled: true, store, origin: 'http://localhost', now: BASE + 10000, snapshot: value });
  assert.notEqual(link1.handoffId, link2.handoffId);
  for (const [index, link] of [link1, link2].entries()) {
    const client = createOutcomeClient({ location: new URL(link.href, 'http://localhost'), store, session, now: () => BASE + 1000 + index * 10000, delay: timer, fetcher: backendFetch(db) });
    client.arrival(); await settled(client);
  }
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM fd_v2_outcomes').first()).n, 2);
  const all = await readOutcomes(db, 'e.env=?', ['local'], BASE, BASE + 20000);
  assert.deepEqual(all.rows, [{ door: 'ako', opened: 1, arrived: 1, requested: 0 }]);
  const laterOnly = await readOutcomes(db, 'e.env=? AND e.occurred_at>=?', ['local', BASE + 10000], BASE + 10000, BASE + 20000);
  assert.equal(laterOnly.rows[0].arrived, 1, 'the second real opening has its own later arrival');
  // A legacy/repeated handoff can still exist in historical data. Never use its earlier receipt for a later opening.
  await persistFrontdoorEvent(db, departure({ installId: value.installation.installId, journeyId: value.journey.journeyId, visitId: value.visit.visitId, handoffId: link1.handoffId, visitorClass: 'returning-frontdoor', occurredAt: BASE + 15000 }));
  const returning = await readOutcomes(db, 'e.env=? AND e.visitor_class=?', ['local', 'returning-frontdoor'], BASE, BASE + 20000);
  assert.deepEqual(returning.rows, [{ door: 'ako', opened: 1, arrived: 0, requested: 0 }]);
});

test('missing arrival receipts cannot make the displayed opened-to-requested rate exceed 100 percent', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  for (const index of [0, 1]) {
    const open = departure(); await persistFrontdoorEvent(db, open);
    if (index === 0) await persistOutcome(db, receipt(open));
    await persistOutcome(db, receipt(open, { name: 'MEET_REQUEST_ACCEPTED', path: '/meet/', occurredAt: BASE + 2000 }));
  }
  const day = new Date(BASE + 7 * 3600000).toISOString().slice(0, 10);
  const stats = await readFrontdoorStats(db, { from: day, to: day, env: 'local' });
  assert.deepEqual(stats.outcomes.rows, [{ door: 'ako', opened: 2, arrived: 1, requested: 2 }]);
  // Run the real Stat renderer with minimal DOM transport; the report above comes from real SQLite.
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', dataset: {}, innerHTML: '', textContent: '', hidden: false, options: [], replaceChildren(...children) { this.options = children; }, addEventListener() {}, reportValidity: () => true });
    return nodes.get(id);
  };
  const imports = { '/assets/front-door/contract.js': contract, './data.js': statData, '/ako/kitchen/catalog.js': recipeCatalog };
  const source = (await readFile(new URL('../../stat/frontdoor/frontdoor.js', import.meta.url), 'utf8'))
    .replace(/^import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';/gm, (_statement, names, specifier) => {
      assert.ok(Object.hasOwn(imports, specifier), `load the actual Stat dependency: ${specifier}`);
      return `const {${names}} = imports[${JSON.stringify(specifier)}];`;
    });
  const context = vm.createContext({ imports, document: { getElementById: node, querySelectorAll: () => [] }, location: new URL('http://localhost/stat/frontdoor/'),
    Intl, Date, URLSearchParams, AbortController, Option: function(text, value) { this.text = text; this.value = value; },
    setTimeout: timer, clearTimeout() {}, fetch: async () => Response.json(stats) });
  vm.runInContext(source, context, { filename: 'stat/frontdoor/frontdoor.js' });
  for (let attempt = 0; attempt < 20 && !node('outcome-rows').innerHTML; attempt += 1) await nextTurn();
  assert.match(node('outcome-rows').innerHTML, /<td>100%<\/td>/);
  assert.doesNotMatch(node('outcome-rows').innerHTML, /200%/);
  assert.match(node('outcome-cards').innerHTML, /เปิดทาง → ถึง <strong>50%<\/strong>/);
  assert.match(node('outcome-cards').innerHTML, /เปิดทาง → ขอคุย <strong>100%<\/strong>/);
  assert.doesNotMatch(node('outcome-cards').innerHTML, /200%/);
  assert.match(await readFile(new URL('../../stat/frontdoor/index.html', import.meta.url), 'utf8'), /เปิดทาง → ขอคุย/);
});

test('outcome context cannot cross environments or enable disabled delivery; future receipts fail validation', async t => {
  const db = sqliteD1(); t.after(() => db.close());
  const store = storage(), calls = [], value = snapshot();
  const link = prepareOutcomeLink('/ako/', { env: 'local', enabled: true, store, origin: 'http://localhost', now: BASE, snapshot: value });
  const remote = createOutcomeClient({ location: new URL(link.href, 'https://myclover.com'), store, now: () => BASE + 1000, delay: timer, fetcher: backendFetch(db, calls) });
  assert.equal(remote, null); assert.equal(calls.length, 0);
  const disabled = prepareOutcomeLink('/ako/', { env: 'local', enabled: false, store, origin: 'http://localhost', now: BASE, snapshot: value });
  const local = createOutcomeClient({ location: new URL(disabled.href, 'http://localhost'), store, now: () => BASE + 1000, delay: timer, fetcher: backendFetch(db, calls) });
  assert.deepEqual(local.arrival(), { ok: false, error: 'DELIVERY_DISABLED' });
  assert.equal(calls.length, 0);
  const open = departure(); await persistFrontdoorEvent(db, open);
  assert.equal(validateOutcome(receipt(open, { occurredAt: Date.now() + 3600000 })).ok, false);
  const response = await onRequest({ request: new Request('https://teem.pages.dev/api/core7/analytics/frontdoor-outcome', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify(receipt(open, { env: 'prod' })),
  }), env: { DB: db }, params: { path: ['analytics', 'frontdoor-outcome'] } });
  assert.equal(response.status, 403);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n, 0);
});
