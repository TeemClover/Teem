import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS, STAGES, makeInitialState, reduceGame, canDispatch, getBestNextActions,
  getLiveReadiness, getActiveEncounter, parseSavedState, serializeState, calculateEconomy,
  V1_SAVE_VERSION, V1_SCORE_VERSION,
} from '../../xvisor/quest/game-data.js';
import { normalizeNpcIdentities } from '../../xvisor/quest/game-people.js';
import { ENCOUNTER_COPY } from '../../xvisor/quest/game-narrative-data.js';

const ids = ['people', 'knowledge', 'care', 'leadership'];
function management(seed = 5) {
  const state = makeInitialState({ seed });
  return { ...state, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    skills: Object.fromEntries(ids.map(id => [id, { xp: 25 }])),
    prospects: Array.from({ length: 5 }, (_, index) => ({ id: `person-${index}`, name: `QA ${index}`, journey: 'baseline', consent: true, fitProducts: ['gus'], trust: 76, readiness: 82, adherence: 40, followups: 0 })),
    liveProgress: { contentSessions: 2, totalLives: 0, lastMonth: null } };
}

test('Content builds LIVE experience only when a real post creates leads', () => {
  let state = management();
  state = { ...state, month: 2, prospects: [], liveProgress: { contentSessions: 0 } };
  assert.equal(getLiveReadiness(state).unlocked, false);
  for (let count = 1; count <= 2; count += 1) {
    const previous = state.prospects.length;
    state = reduceGame(state, EVENTS.CREATE_LEAD, { source: 'content' });
    assert.equal(state.stage, STAGES.CONTENT_RUNNING);
    assert.ok(state.prospects.length > previous);
    assert.equal(state.liveProgress.contentSessions, count);
    const stale = reduceGame(state, EVENTS.CREATE_LEAD, { source: 'content' });
    assert.equal(stale.liveProgress.contentSessions, count);
    state = reduceGame(stale, EVENTS.SCENE_COMPLETE);
  }
  assert.equal(getLiveReadiness(state).unlocked, true);
  assert.equal(getLiveReadiness(state).available, false, 'new leads still need context and consent');
  assert.match(getLiveReadiness(state).reason, /ข้อมูลเริ่มต้น/);
  const beginner = { ...state, skills: Object.fromEntries(ids.map(id => [id, { xp: 0 }])) };
  assert.equal(getLiveReadiness(beginner).unlocked, false);
  assert.ok(getLiveReadiness(beginner).requirements.some(item => !item.met));
  assert.match(getLiveReadiness(beginner).reason, /คุยกับคน Lv\.1\/3/);
  assert.doesNotMatch(getLiveReadiness(beginner).reason, /คอนเทนต์/);
});

test('LIVE has a running stage, locks other actions and resumes safely after reload', () => {
  const before = management();
  const running = reduceGame(before, EVENTS.RUN_LIVE);
  assert.equal(running.stage, STAGES.LIVE_RUNNING);
  assert.equal(running.energy, before.energy);
  assert.equal(running.customers.length, 0);
  assert.equal(running.economy.lastTransaction, null);
  assert.deepEqual(running.pendingLive.targetIds, ['person-0', 'person-1', 'person-2']);
  assert.deepEqual(getBestNextActions(running), []);
  for (const event of [EVENTS.RUN_LIVE, EVENTS.END_MONTH, EVENTS.XGEN_EXAM, EVENTS.CREATE_LEAD, EVENTS.RESOLVE_ENCOUNTER]) {
    assert.equal(canDispatch(running, event), false);
    assert.equal(reduceGame(running, event).stage, STAGES.LIVE_RUNNING);
  }
  const restored = parseSavedState(serializeState(running));
  assert.deepEqual(restored.pendingLive, running.pendingLive);
  const after = reduceGame(restored, EVENTS.SCENE_COMPLETE);
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.equal(after.pendingLive, null);
  assert.equal(after.energy, before.energy - 2);
  assert.equal(after.liveReport.attempted, 3);
  assert.equal(after.liveReport.sales, 3);
  assert.equal(after.customers.length, 3);
  assert.ok(after.customers.every(person => person.day === 0 && !person.successCase));
  assert.equal(after.monthStats.playerActions.attract, 1);
  assert.equal(after.monthStats.energyUse.attract, 2);
  for (const event of [EVENTS.SCENE_COMPLETE, EVENTS.RUN_LIVE]) {
    const repeated = reduceGame(after, event);
    assert.equal(repeated.energy, after.energy);
    assert.equal(repeated.customers.length, after.customers.length);
    assert.equal(repeated.liveHistory.length, 1);
    assert.equal(repeated.economy.personalXV, after.economy.personalXV);
  }
});

test('LIVE records separate real receipts and their summed finance survives monthly posting', () => {
  const before = management();
  let state = reduceGame(reduceGame(before, EVENTS.RUN_LIVE), EVENTS.SCENE_COMPLETE);
  const transactions = state.liveReport.transactions;
  assert.equal(new Set(transactions.map(item => item.id)).size, 3);
  assert.equal(state.economy.productSales, transactions.reduce((sum, item) => sum + item.price, 0));
  assert.equal(state.economy.personalXV, transactions.reduce((sum, item) => sum + item.xv, 0));
  assert.ok(transactions.every(item => item.price === 12480 && item.xv === 9495));
  assert.equal(transactions.reduce((sum, item) => sum + item.incomeDelta, 0), calculateEconomy(state).projectedIncome);
  assert.deepEqual(state.liveHistory[0].transactions, transactions);
  const expected = calculateEconomy(state).projectedIncome;
  state = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(state.settlements['4'].totalIncome, expected);
  const restored = parseSavedState(serializeState(state));
  assert.deepEqual(restored.liveHistory[0].transactions, transactions);
});

test('LIVE excludes unconsented, mismatched and waiting people and retains genuine refusals', () => {
  const before = management(1);
  before.skills.people.xp = 7;
  before.skills.knowledge.xp = 7;
  before.prospects.push(
    { ...before.prospects[0], id: 'private', consent: false },
    { ...before.prospects[0], id: 'no-product', fitProducts: [] },
    { ...before.prospects[0], id: 'waiting', journey: 'waiting', nextOfferMonth: 9 },
    { ...before.prospects[0], id: 'unready', readiness: 54 },
    { ...before.prospects[0], id: 'no-trust', trust: 49 },
  );
  const after = reduceGame(reduceGame(before, EVENTS.RUN_LIVE), EVENTS.SCENE_COMPLETE);
  assert.equal(after.liveReport.attempted, 3);
  assert.ok(after.liveReport.sales < 3);
  assert.equal(after.liveReport.sales + after.liveReport.declinedIds.length, 3);
  for (const id of ['private', 'no-product', 'waiting', 'unready', 'no-trust', 'person-3', 'person-4']) {
    assert.deepEqual(after.prospects.find(person => person.id === id), normalizeNpcIdentities(before).prospects.find(person => person.id === id));
  }
  for (const id of after.liveReport.declinedIds) {
    const person = after.prospects.find(item => item.id === id);
    assert.equal(person.journey, 'waiting');
    assert.equal(person.nextOfferMonth, before.month + 1);
  }
  assert.equal(getLiveReadiness({ ...before, energy: 1 }).available, false);
  assert.ok(getBestNextActions(before, 3).some(action => action.event === EVENTS.RUN_LIVE), 'ready LIVE is discoverable in Quick 3 above the ordinary Open House');
});

test('LIVE receipts never pay Organization income before the existing manual XGEN exam', () => {
  const before = management();
  before.economy = { ...before.economy, personalXV: 2_975_000, productSales: 3_000_000 };
  const originalIncome = calculateEconomy(before).projectedIncome;
  const after = reduceGame(reduceGame(before, EVENTS.RUN_LIVE), EVENTS.SCENE_COMPLETE);
  assert.ok(after.economy.personalXV >= 3_000_000);
  assert.equal(after.career.xgenExamPassed, false);
  assert.equal(calculateEconomy(after).channel3, 0);
  assert.ok(after.liveReport.transactions.every(item => item.incomeBreakdown.channel3Delta === 0));
  assert.equal(after.liveReport.transactions.reduce((sum, item) => sum + item.incomeDelta, 0), calculateEconomy(after).projectedIncome - originalIncome);
  assert.ok(after.liveReport.transactions.every(item => typeof item.tierBefore === 'object' && typeof item.tierAfter === 'object'));
});

function allContexts(state) {
  return { ...state,
    prospects: [
      ...state.prospects,
      { id: 'content-qa', source: 'content', journey: 'discovery', consent: false, trust: 50, readiness: 50 },
    ],
    customers: [
      { id: 'care-qa', day: 7, selfDirected: false, adherence: 50, trust: 50 },
      { id: 'win-qa', day: 28, selfDirected: true, successCase: true, trust: 75 },
    ],
    team: [{ id: 'team-qa', active: true, confidence: 50, autonomy: 40 }],
    liveProgress: { contentSessions: 2, totalLives: 1, lastMonth: 1 }
  };
}

test('seeded encounters use only a run subset, never repeat, and stay at most one per month', () => {
  const initial = allContexts(management(7));
  assert.equal(initial.encounters.months.length, 4);
  assert.equal(new Set(initial.encounters.months).size, 4);
  assert.deepEqual(makeInitialState({ seed: 7 }).encounters, makeInitialState({ seed: 7 }).encounters);
  assert.notDeepEqual(makeInitialState({ seed: 7 }).encounters.bag, makeInitialState({ seed: 8 }).encounters.bag);
  let state = initial;
  const offered = [];
  for (let month = 2; month <= 12; month += 1) {
    state = { ...state, month, energy: 28 };
    state = reduceGame(state, EVENTS.TRAIN_SKILL, { skill: 'people' });
    const active = getActiveEncounter(state);
    if (!active) continue;
    offered.push(active.key);
    assert.ok(ENCOUNTER_COPY[active.key]);
    state = reduceGame(state, EVENTS.RESOLVE_ENCOUNTER, { encounterId: active.id, choiceId: 'skip' });
    state = reduceGame(state, EVENTS.TRAIN_SKILL, { skill: 'care' });
    assert.equal(getActiveEncounter(state), null);
  }
  assert.equal(offered.length, 4);
  assert.equal(new Set(offered).size, 4);
  assert.ok(state.encounters.bag.length > 0, 'a run leaves some event stories for another playthrough');
});

test('encounter choices have small real effects, are optional, and cannot resolve twice', () => {
  let state = allContexts(management(7));
  state.encounters = { ...state.encounters, months: [4], bag: ['followup-reset', 'quiet-week'] };
  state = reduceGame(state, EVENTS.TRAIN_SKILL, { skill: 'knowledge' });
  const active = getActiveEncounter(state);
  assert.equal(active.key, 'followup-reset');
  assert.equal(canDispatch(state, EVENTS.END_MONTH), true);
  const restored = parseSavedState(serializeState(state));
  assert.deepEqual(getActiveEncounter(restored), active);
  const before = restored.customers.find(person => person.id === active.targetId);
  const after = reduceGame(restored, EVENTS.RESOLVE_ENCOUNTER, { encounterId: active.id, choiceId: 'simplify' });
  assert.equal(after.customers.find(person => person.id === active.targetId).adherence, before.adherence + 4);
  assert.equal(after.economy.personalXV, restored.economy.personalXV);
  assert.equal(after.energy, restored.energy);
  const duplicate = reduceGame(after, EVENTS.RESOLVE_ENCOUNTER, { encounterId: active.id, choiceId: 'simplify' });
  assert.deepEqual(duplicate.customers, after.customers);
  assert.equal(duplicate.encounters.resolved.length, 1);
  assert.equal(getActiveEncounter({ ...state, month: 5 }), null);
  assert.equal(getActiveEncounter({ ...state, customers: [] }), null);
  assert.deepEqual(reduceGame(restored, EVENTS.RESOLVE_ENCOUNTER, { encounterId: 'stale', choiceId: 'simplify' }).customers, restored.customers);
});

test('old saves gain stable story state while existing leaderboard and save contracts remain', () => {
  const old = management();
  delete old.encounters;
  delete old.liveProgress;
  old.releaseVersion = '1.0b';
  old.campaignScore = { locked: true, scoreVersion: '1.0b', totalIncome: 12345 };
  const recovered = parseSavedState(JSON.stringify(old));
  assert.equal(recovered.v1SaveVersion, V1_SAVE_VERSION);
  assert.equal(recovered.scoreVersion, V1_SCORE_VERSION);
  assert.equal(recovered.campaignScore.totalIncome, 12345);
  assert.equal(recovered.liveProgress.contentSessions, 0, 'do not invent old posting history');
  assert.deepEqual(parseSavedState(serializeState(recovered)).encounters, recovered.encounters);
  const replay = reduceGame(recovered, EVENTS.NEW_GAME_PLUS);
  assert.notEqual(replay.encounters.seed, recovered.encounters.seed);
  assert.equal(replay.encounters.seen.length, 0);
  assert.equal(replay.liveProgress.contentSessions, 0);
});
