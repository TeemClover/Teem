import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, STATE_KEYS, STATE_VERSION, VISIT_IDLE_MS, classifyLegacyVisitor } from './state.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    entries: () => Object.fromEntries(values),
  };
}
function context(initial = {}) {
  const storage = memoryStorage(initial);
  const sessionStorage = memoryStorage();
  let timestamp = 1700000000000;
  let sequence = 0;
  const options = { storage, sessionStorage, now: () => timestamp, idFactory: prefix => `${prefix}-fixture-${++sequence}` };
  return { storage, sessionStorage, options, advance: delta => { timestamp += delta; }, create: (extra = {}) => createState({ ...options, ...extra }) };
}

test('installation reuses V1 identity exactly; new identity is durable after verification', () => {
  const existing = context({ 'c7:install_id': 'legacy:install_123' });
  assert.deepEqual(existing.create().installation, { installId: 'legacy:install_123', durable: true });
  const fresh = context();
  const state = fresh.create();
  assert.equal(state.installation.durable, true);
  assert.equal(fresh.storage.getItem('c7:install_id'), state.installation.installId);
});

test('storage unavailable preserves stable in-memory identity and functional journey', () => {
  const failing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const state = context().create({ storage: failing, sessionStorage: failing });
  const initial = state.snapshot();
  state.updateJourney({ stage: 'door-found', doorId: 'dungeon', intentPrimary: 'build' });
  state.recordActivity();
  assert.equal(state.installation.durable, false);
  assert.equal(state.snapshot().installation.installId, initial.installation.installId);
  assert.equal(state.journey.journeyId, initial.journey.journeyId);
  assert.equal(state.journey.doorId, 'dungeon');
  assert.deepEqual(state.saveCheckpoint(), { ok: false, durable: false, checkpoint: null, error: 'CHECKPOINT_PERSISTENCE_FAILED' });
  assert.equal(state.journey.checkpoint, undefined);
});

test('malformed legacy installation is preserved and does not masquerade as durable V2 identity', () => {
  const ctx = context({ 'c7:install_id': 'not a safe identifier' });
  const state = ctx.create();
  assert.equal(ctx.storage.getItem('c7:install_id'), 'not a safe identifier');
  assert.equal(state.installation.durable, false);
  assert.match(state.installation.installId, /^i-/);
});

test('successful SAVE commits and reads back complete versioned checkpoint', () => {
  const ctx = context();
  const state = ctx.create();
  const result = state.saveCheckpoint({ stage: 'door-found', doorId: 'dungeon', intentPrimary: 'curious', source: 'line', experienceVersion: 'frontdoor-2026.09-v1', activeMs: 4000 });
  assert.equal(result.ok, true);
  assert.equal(result.durable, true);
  assert.equal(result.checkpoint.savedVisitId, state.visit.visitId);
  assert.equal(result.checkpoint.version, STATE_VERSION);
  const stored = JSON.parse(ctx.storage.getItem(STATE_KEYS.journey(state.journey.journeyId)));
  assert.deepEqual(stored.checkpoint, result.checkpoint);
  assert.equal(ctx.storage.getItem(STATE_KEYS.activeJourney), state.journey.journeyId);
});

test('checkpoint write failure exposes failure, retains usable memory and no successful checkpoint', () => {
  const ctx = context();
  const state = ctx.create();
  ctx.storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(state.saveCheckpoint({ doorId: 'dungeon', stage: 'door-found' }).ok, false);
  assert.equal(state.journey.doorId, 'dungeon');
  assert.equal(state.journey.checkpoint, undefined);
});

test('checkpoint read-back mismatch is failure, never reported as durable save', () => {
  const ctx = context();
  const state = ctx.create();
  ctx.storage.setItem = () => {};
  const result = state.saveCheckpoint({ stage: 'door-found' });
  assert.equal(result.durable, false);
  assert.equal(result.ok, false);
  assert.equal(state.journey.checkpoint, undefined);
});

test('new tabs and refresh share active visit and neither causes RETURN', () => {
  const ctx = context();
  const first = ctx.create();
  first.saveCheckpoint({ doorId: 'dungeon' });
  ctx.advance(10000);
  const secondTab = ctx.create({ sessionStorage: memoryStorage() });
  assert.equal(secondTab.visit.visitId, first.visit.visitId);
  assert.equal(secondTab.qualifyingReturn, false);
  const refreshed = ctx.create({ navigationType: 'reload' });
  assert.equal(refreshed.visit.visitId, first.visit.visitId);
  assert.equal(refreshed.qualifyingReturn, false);
  assert.equal(refreshed.resume().ok, false);
});

test('refresh after long inactivity never creates or defers a RETURN', () => {
  const ctx = context();
  const first = ctx.create();
  first.saveCheckpoint({ doorId: 'dungeon' });
  ctx.advance(VISIT_IDLE_MS + 1);
  const refresh = ctx.create({ navigationType: 'reload' });
  assert.equal(refresh.visit.visitId, first.visit.visitId);
  assert.equal(refresh.qualifyingReturn, false);
  assert.equal(refresh.resume().ok, false);
  ctx.advance(1000);
  assert.equal(ctx.create().qualifyingReturn, false);
  assert.equal(refresh.beginVisit().qualifyingReturn, false);
});

test('later qualifying visit creates RETURN eligibility only for saved Front Door journey', () => {
  const ctx = context();
  const first = ctx.create();
  first.saveCheckpoint({ doorId: 'dungeon', intentPrimary: 'build' });
  ctx.advance(VISIT_IDLE_MS);
  const returned = ctx.create();
  assert.equal(returned.qualifyingReturn, true);
  assert.notEqual(returned.visit.visitId, first.visit.visitId);
  assert.equal(returned.journey.journeyId, first.journey.journeyId);
  assert.equal(returned.visitorClass, 'returning-frontdoor');
  assert.equal(returned.visit.returnSavedVisitId, first.visit.visitId);
  const refreshedReturn = ctx.create({ navigationType: 'reload' });
  assert.equal(refreshedReturn.qualifyingReturn, false);
  assert.equal(refreshedReturn.visit.visitId, returned.visit.visitId);
  assert.equal(refreshedReturn.resume().ok, true);
  const unsavedCtx = context();
  const unsaved = unsavedCtx.create();
  unsaved.updateJourney({ doorId: 'dungeon' });
  unsavedCtx.advance(VISIT_IDLE_MS);
  assert.equal(unsavedCtx.create().qualifyingReturn, false);
});

test('focus, visibility and recorded activity alone cannot begin a later visit', () => {
  const ctx = context();
  const first = ctx.create();
  first.saveCheckpoint();
  ctx.advance(VISIT_IDLE_MS + 1000);
  first.recordActivity();
  assert.equal(first.visit.visitId, first.journey.checkpoint.savedVisitId);
  assert.equal(first.qualifyingReturn, false);
  ctx.advance(VISIT_IDLE_MS + 1000);
  assert.equal(first.beginVisit({ navigationType: 'visibility' }).qualifyingReturn, false);
  ctx.advance(VISIT_IDLE_MS + 1000);
  assert.equal(first.beginVisit({ navigationType: 'focus' }).qualifyingReturn, false);
});

test('RESUME requires explicit continuation in a later visit and is once per visit', () => {
  const ctx = context();
  const first = ctx.create();
  assert.equal(first.resume().ok, false);
  first.saveCheckpoint({ intentPrimary: 'build', doorId: 'dungeon', stage: 'door-found' });
  assert.equal(first.resume().ok, false);
  ctx.advance(VISIT_IDLE_MS + 1);
  const returned = ctx.create();
  assert.equal(returned.visit.resumedJourneyId, undefined);
  const resumed = returned.resume();
  assert.equal(resumed.ok, true);
  assert.equal(resumed.previousSavedVisitId, first.visit.visitId);
  assert.equal(resumed.journey.doorId, 'dungeon');
  assert.equal(returned.resume().ok, false);
  assert.equal(ctx.create({ navigationType: 'reload' }).resume().ok, false);
});

test('REBUILD preserves old journeys, checkpoints and all legacy state', () => {
  const legacy = { 'c7:install_id': 'legacy-123', mc_read: READING_SLUG, mc_nb_seen_ever_v1: '1', 'c7:stats_bot': '{"matchesPlayed":4}', 'analyticsVersion': '1.6.0', 'mc:any_unknown_history': 'unchanged' };
  const ctx = context(legacy);
  const first = ctx.create();
  first.saveCheckpoint({ doorId: 'dungeon' });
  const previousId = first.journey.journeyId;
  const originalRecord = ctx.storage.getItem(STATE_KEYS.journey(previousId));
  const result = first.rebuild();
  assert.equal(result.previousJourneyId, previousId);
  assert.notEqual(result.journey.journeyId, previousId);
  assert.equal(result.journey.checkpoint, undefined);
  assert.equal(ctx.storage.getItem(STATE_KEYS.journey(previousId)), originalRecord);
  for (const [key, value] of Object.entries(legacy)) assert.equal(ctx.storage.getItem(key), value, key);
  assert.equal(ctx.storage.getItem(STATE_KEYS.activeJourney), result.journey.journeyId);
});

const READING_SLUG = 'ep1-everyone-gets-to-play';
test('history classification reads finite known keys, tolerates malformed records and excludes weak signals', () => {
  const weak = memoryStorage({ 'c7:install_id': 'legacy-123', mc_lang: 'th', mc_glhf_seen: '1', mc_read: 'arbitrary', mc_titles: '{broken', mc_dungeon_state_v2: '{"v":2,"accepted":true}', 'c7:stats_bot': '{"matchesPlayed":"wrong"}' });
  Object.defineProperty(weak, 'length', { get() { throw new Error('Full storage scans forbidden'); } });
  assert.equal(classifyLegacyVisitor(weak), 'new');
  weak.setItem('mc_read', READING_SLUG);
  assert.equal(classifyLegacyVisitor(weak), 'legacy');
  weak.setItem('c7:stats_bot', '{"matchesPlayed":1}');
  assert.equal(classifyLegacyVisitor(weak), 'returning-room');
  weak.setItem('mc_nb_restored_ever_v1', '1');
  assert.equal(classifyLegacyVisitor(weak), 'veteran');
});

test('malformed Front Door history cannot route to arbitrary destinations or inject stored free text', () => {
  const ctx = context({ [STATE_KEYS.activeJourney]: 'j-old-123', [STATE_KEYS.journey('j-old-123')]: '{broken', [STATE_KEYS.visit]: '{"version":999}' });
  const state = ctx.create();
  assert.notEqual(state.journey.journeyId, 'j-old-123');
  const result = state.saveCheckpoint({ doorId: 'https://hostile.example', stage: 'long sensitive text', source: 'raw?query=secret', rawLocalStorage: 'private', intentPrimary: 'build', activeMs: Infinity });
  assert.equal(result.ok, true);
  assert.equal(result.checkpoint.doorId, undefined);
  assert.equal(result.checkpoint.stage, 'state-0');
  assert.equal(result.checkpoint.intentPrimary, 'build');
  assert.equal(result.checkpoint.rawLocalStorage, undefined);
  assert.equal(result.checkpoint.source, undefined);
  assert.equal(result.checkpoint.activeMs, undefined);
});

test('partial unsaved journey survives reload without falsely becoming a SAVE or RETURN', () => {
  const ctx = context();
  const first = ctx.create();
  first.updateJourney({ stage: 'reward', intentPrimary: 'curious', intentSecondary: 'anomaly', source: 'qr' });
  const refreshed = ctx.create({ navigationType: 'reload' });
  assert.equal(refreshed.journey.journeyId, first.journey.journeyId);
  assert.equal(refreshed.journey.stage, 'reward');
  assert.equal(refreshed.journey.source, 'qr');
  assert.equal(refreshed.journey.checkpoint, undefined);
  assert.equal(refreshed.qualifyingReturn, false);
});
