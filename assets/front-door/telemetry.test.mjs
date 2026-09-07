import test from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_VERSION, EVENTS, normalizeSource, validateEvent, environmentForHost } from './contract.js';
import { createTelemetry, createActiveClock } from './telemetry.js';
import { VISIT_IDLE_MS } from './state.js';

class Storage {
  values = new Map();
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, String(v)); }
}
const fixture = (extra = {}) => ({ eventId: 'e-test001', installId: 'i-test001', journeyId: 'j-test001', visitId: 'v-test001', eventName: 'FRONTDOOR_OPEN', occurredAt: Date.now(), path: '/', env: 'local', analyticsVersion: ANALYTICS_VERSION, experienceVersion: 'test-v1', properties: {}, ...extra });
function setup(extra = {}) {
  let seq = 0;
  const sent = [];
  const clock = { sample: () => 1200, reset() {}, dispose() {} };
  const telemetry = createTelemetry({
    storage: new Storage(), sessionStorage: new Storage(), clock,
    location: { hostname: 'localhost', origin: 'http://localhost:8000', pathname: '/', search: '' }, enabled: true,
    idFactory: prefix => `${prefix}-test${String(++seq).padStart(5, '0')}`,
    fetch: async (url, init) => { sent.push(JSON.parse(init.body)); return Response.json({ ok: true }, { status: 202 }); },
    setTimeout: () => 1, clearTimeout() {}, ...extra,
  });
  return { telemetry, sent };
}

test('registry locks exactly 15 approved events, never aliases historical home-open', () => {
  assert.deepEqual(Object.keys(EVENTS), ['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'FRONTDOOR_REACTION_COMPLETE', 'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN', 'RETURN', 'RESUME', 'REBUILD', 'FRONTDOOR_FREE_ROAM', 'ANOMALY_START', 'LEGACY_WARNING', 'DUNGEON_HANDOFF']);
  assert.equal(validateEvent(fixture({ eventName: 'home-open' })).error, 'UNKNOWN_EVENT');
});
test('malformed event names, IDs, queries, environments and oversized properties cannot enter the contract', () => {
  for (const patch of [{ eventName: { toString: {} } }, { eventId: '../../x' }, { journeyId: null }, { env: 'development' }, { path: '/?secret=abc' }, { properties: [] }, { properties: { activeMsToFirstChoice: -1 } }, { properties: { raw: 'x'.repeat(9000) } }]) assert.equal(validateEvent(fixture(patch)).ok, false);
  assert.equal(validateEvent(fixture({ eventName: 'DOOR_FOUND', scope: 'event' })).error, 'INVALID_SCOPE');
});
test('safe future optional properties are ignored; sensitive text and unknown top-level data are never persisted', () => {
  const { event } = validateEvent(fixture({ rawStorage: 'secret', properties: { health: 'secret', future: 12, fromNode: 'build', toNode: 'dungeon', identityDurable: true } }));
  assert.equal(event.rawStorage, undefined);
  assert.deepEqual(event.properties, { fromNode: 'build', toNode: 'dungeon', identityDurable: true });
});
test('source normalization is bounded and strips full URL/query content', () => {
  assert.equal(normalizeSource(), 'direct');
  assert.equal(normalizeSource({ search: '?from=astra-post&email=secret' }), 'astra-post');
  assert.equal(normalizeSource({ search: '?utm_source=fb&utm_campaign=private' }), 'facebook');
  assert.equal(normalizeSource({ referrer: 'https://www.teambook.me/private?id=secret' }), 'teambook');
  assert.equal(normalizeSource({ referrer: 'https://google.com/search?q=secret' }), 'search');
  assert.equal(normalizeSource({ referrer: 'https://facebook.com.evil.test/' }), 'unknown');
  assert.equal(normalizeSource({ search: '?from=my-personal-email' }), 'unknown');
  assert.equal(normalizeSource({ search: '?from=constructor' }), 'unknown');
  assert.equal(normalizeSource({ search: '?from=__proto__' }), 'unknown');
  assert.equal(validateEvent(fixture({ properties: JSON.parse('{"constructor":42,"toString":12,"__proto__":{"raw":"private"}}') })).ok, true);
});
test('local defaults disabled and cannot enable a production endpoint or relabel itself prod', async () => {
  for (const extra of [{ enabled: undefined }, { endpoint: 'https://teem.pages.dev/api/core7/analytics/frontdoor' }, { env: 'prod' }]) {
    const { telemetry, sent } = setup(extra);
    telemetry.open(); await telemetry.flush();
    assert.equal(sent.length, 0); assert.equal(telemetry.env, 'local'); telemetry.dispose();
  }
  assert.equal(environmentForHost('preview.teem.pages.dev'), 'preview');
  assert.equal(environmentForHost('www.myclover.com'), 'prod');
});
test('retry retains exact eventId and acknowledges only successful server acceptance', async () => {
  const sent = []; let fail = true;
  const { telemetry } = setup({ fetch: async (_, init) => {
    sent.push(JSON.parse(init.body));
    if (fail) throw new Error('offline');
    return Response.json({ ok: true }, { status: 202 });
  } });
  const event = telemetry.emit('DOOR_FOUND', { doorId: 'dungeon' });
  await telemetry.flush(); assert.equal(telemetry.pending().length, 1);
  fail = false; await telemetry.flush({ force: true });
  assert.equal(sent.length, 2); assert.equal(sent[0].eventId, event.eventId); assert.equal(sent[1].eventId, event.eventId);
  assert.equal(telemetry.pending().length, 0);
  assert.equal(telemetry.emit('DOOR_FOUND', { doorId: 'dungeon' }).duplicate, true);
  telemetry.dispose();
});
test('bounded retry queue survives reload; pending milestones deduplicate without being marked sent', async () => {
  const storage = new Storage(), sessionStorage = new Storage();
  const a = setup({ storage, sessionStorage, fetch: async () => { throw new Error('offline'); } }).telemetry;
  a.emit('DOOR_FOUND', { doorId: 'dungeon' }); await a.flush();
  const originalId = a.pending()[0].eventId; a.dispose();
  const { telemetry: b, sent } = setup({ storage, sessionStorage });
  assert.equal(b.emit('DOOR_FOUND', { doorId: 'dungeon' }).duplicate, true);
  await b.flush({ force: true }); assert.equal(sent[0].eventId, originalId); b.dispose();
});
test('event-scope interactions repeat while installation-scope signals deduplicate', async () => {
  const { telemetry, sent } = setup();
  telemetry.emit('FRONTDOOR_CHOICE'); telemetry.emit('FRONTDOOR_CHOICE');
  telemetry.emit('FRONTDOOR_REACTION_COMPLETE', { scope: 'installation' });
  assert.equal(telemetry.emit('FRONTDOOR_REACTION_COMPLETE', { scope: 'installation' }).duplicate, true);
  await telemetry.flush(); assert.equal(sent.length, 3); telemetry.dispose();
});
test('SAVE is impossible through generic emit and only emitted following verified durable checkpoint', () => {
  const storage = new Storage(); const { telemetry } = setup({ storage });
  assert.equal(telemetry.emit('SAVE', { properties: { checkpointDurable: true } }).ok, false);
  assert.equal(telemetry.save({ doorId: 'dungeon', stage: 'door-found' }).ok, true);
  assert.equal(telemetry.pending().filter(e => e.eventName === 'SAVE').length, 1);
  telemetry.dispose();
});
test('storage failure preserves a usable runtime and never emits SAVE', () => {
  const storage = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } };
  const { telemetry } = setup({ storage });
  const id = telemetry.state.installation.installId;
  telemetry.open(); telemetry.emit('FRONTDOOR_CHOICE');
  assert.equal(telemetry.state.installation.installId, id);
  assert.equal(telemetry.state.installation.durable, false);
  assert.equal(telemetry.save({ doorId: 'dungeon' }).ok, false);
  assert.equal(telemetry.pending().some(e => e.eventName === 'SAVE'), false); telemetry.dispose();
});
test('later visit emits RETURN once, refresh never does; explicit RESUME retains the saved journey', () => {
  const storage = new Storage(), sessionStorage = new Storage();
  let at = Date.now() - 4 * VISIT_IDLE_MS, idSequence = 0;
  const shared = { storage, sessionStorage, now: () => at, idFactory: p => `${p}-lifecycle${++idSequence}` };
  const a = setup(shared).telemetry; a.open(); a.save({ doorId: 'dungeon' }); const journeyId = a.state.journey.journeyId; a.dispose();
  at += VISIT_IDLE_MS + 1;
  const reload = setup({ ...shared, navigationType: 'reload' }).telemetry;
  reload.open(); assert.equal(reload.pending().some(e => e.eventName === 'RETURN'), false); reload.dispose();
  at += VISIT_IDLE_MS + 1;
  const b = setup(shared).telemetry; b.open(); b.open();
  assert.equal(b.pending().filter(e => e.eventName === 'RETURN').length, 1);
  assert.equal(b.pending().some(e => e.eventName === 'RESUME'), false);
  assert.equal(b.resume().ok, true); assert.equal(b.resume().ok, false);
  assert.equal(b.pending().find(e => e.eventName === 'RESUME').journeyId, journeyId); b.dispose();
});
test('REBUILD starts new journey and preserves checkpoint plus legacy achievements', () => {
  const storage = new Storage(); storage.setItem('mc_secret_end_ever_v1', '1');
  const { telemetry } = setup({ storage }); telemetry.save({ doorId: 'dungeon' });
  const previous = telemetry.state.journey.journeyId;
  const result = telemetry.rebuild(); assert.equal(result.previousJourneyId, previous);
  assert.notEqual(telemetry.state.journey.journeyId, previous);
  assert.equal(storage.getItem('mc_secret_end_ever_v1'), '1');
  assert.ok(storage.getItem(`mc:frontdoor:v2:journey:${previous}`));
  assert.equal(telemetry.pending().find(e => e.eventName === 'REBUILD').properties.previousJourneyId, previous); telemetry.dispose();
});
test('active time pauses at idle and hidden boundaries without continuous telemetry', () => {
  const doc = new EventTarget(); doc.hidden = false; const win = new EventTarget(); let t = 0;
  const clock = createActiveClock({ now: () => t, document: doc, window: win, idleMs: 1000 });
  t = 500; assert.equal(clock.sample(), 500);
  t = 5000; assert.equal(clock.sample(), 1000);
  win.dispatchEvent(new Event('pointerdown')); t = 5200; assert.equal(clock.sample(), 1200);
  doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  t = 10000; assert.equal(clock.sample(), 1200);
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); t = 11000; assert.equal(clock.sample(), 1200);
  win.dispatchEvent(new Event('pointerdown')); t = 11200; assert.equal(clock.sample(), 1400); clock.dispose();
});
test('milestones attach local active timing and a small bounded queue cannot grow indefinitely', () => {
  const { telemetry } = setup();
  telemetry.emit('FRONTDOOR_CHOICE'); assert.equal(telemetry.pending()[0].properties.activeMsToFirstChoice, 1200);
  for (let n = 0; n < 40; n++) telemetry.emit('FRONTDOOR_CHOICE');
  assert.ok(telemetry.pending().length <= 32); assert.equal(telemetry.emit('FRONTDOOR_CHOICE').error, 'QUEUE_FULL'); telemetry.dispose();
});

test('exhausted retry budget restarts on refresh without changing eventId', async () => {
  const storage = new Storage(), sessionStorage = new Storage();
  const a = setup({ storage, sessionStorage, fetch: async () => { throw Error('offline'); } }).telemetry;
  a.emit('DOOR_FOUND'); const eventId = a.pending()[0].eventId;
  for (let n = 0; n < 5; n++) await a.flush({ force: true });
  a.dispose();
  const { telemetry: b, sent } = setup({ storage, sessionStorage });
  await b.flush(); assert.equal(sent.length, 1); assert.equal(sent[0].eventId, eventId); b.dispose();
});
test('separate offline tabs cannot overwrite each other; each outbox survives its own refresh', () => {
  const storage = new Storage(), sessionA = new Storage(), sessionB = new Storage();
  const a = setup({ storage, sessionStorage: sessionA }).telemetry;
  const b = setup({ storage, sessionStorage: sessionB }).telemetry;
  a.emit('LUCKY_RETURN'); b.emit('ANOMALY_START'); a.dispose(); b.dispose();
  const a2 = setup({ storage, sessionStorage: sessionA }).telemetry;
  const b2 = setup({ storage, sessionStorage: sessionB }).telemetry;
  assert.deepEqual(a2.pending().map(e => e.eventName), ['LUCKY_RETURN']);
  assert.deepEqual(b2.pending().map(e => e.eventName), ['ANOMALY_START']); a2.dispose(); b2.dispose();
});
test('later bfcache navigation can RETURN; ordinary focus and short back navigation cannot', () => {
  const window = new EventTarget(); let at = Date.now() - 2 * VISIT_IDLE_MS;
  const { telemetry } = setup({ window, now: () => at });
  telemetry.open(); telemetry.save({ doorId: 'dungeon' });
  const back = () => { const event = new Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true }); window.dispatchEvent(event); };
  back(); assert.equal(telemetry.pending().some(e => e.eventName === 'RETURN'), false);
  at += VISIT_IDLE_MS + 1; window.dispatchEvent(new Event('focus'));
  assert.equal(telemetry.pending().some(e => e.eventName === 'RETURN'), false);
  back(); assert.equal(telemetry.pending().filter(e => e.eventName === 'RETURN').length, 1);
  assert.equal(telemetry.pending().find(e => e.eventName === 'RETURN').visitorClass, 'returning-frontdoor'); telemetry.dispose();
});
test('permanent collector rejection is not reported as successful delivery', async () => {
  const { telemetry } = setup({ fetch: async () => Response.json({ ok: false }, { status: 403 }) });
  telemetry.open(); const result = await telemetry.flush();
  assert.equal(result.ok, false); assert.equal(result.rejected, 1); telemetry.dispose();
});
test('saved checkpoint can establish a later visit if visit metadata is lost', () => {
  const storage = new Storage(), sessionStorage = new Storage(); let at = Date.now() - 2 * VISIT_IDLE_MS;
  const a = setup({ storage, sessionStorage, now: () => at }).telemetry;
  a.save({ doorId: 'dungeon' }); a.dispose();
  storage.values.delete('mc:frontdoor:v2:visit'); sessionStorage.values.delete('mc:frontdoor:v2:visit');
  at += VISIT_IDLE_MS + 1;
  const b = setup({ storage, sessionStorage, now: () => at }).telemetry;
  assert.equal(b.state.qualifyingReturn, true); b.dispose();
});
