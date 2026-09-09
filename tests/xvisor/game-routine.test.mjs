import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS, STAGES, CUSTOMER_STATES, V1_SAVE_VERSION, V1_SCORE_VERSION,
  makeInitialState, reduceGame, getRoutineChoices, getPersonContextAction,
  parseSavedState, serializeState,
} from '../../xvisor/quest/game-data.js';
import { isActionAvailable } from '../../xvisor/quest/game-actions.js';
import { XIRCLE_STARTER, TUTORIAL_OFFER } from '../../xvisor/quest/game-commercial-config.js';

function routineState(overrides = {}, personOverrides = {}) {
  const base = makeInitialState({ seed: 5 });
  const person = {
    id: 'routine-person', name: 'เมย์', journey: 'baseline', consent: true, measured: true,
    trust: 72, readiness: 82, fitProducts: ['gus'], followups: 0, day: 0, adherence: 40,
    ...personOverrides,
  };
  return {
    ...base, month: 4, phase: 'management', stage: STAGES.MANAGEMENT_ROUTINE, rank: 'xvisor', energy: 28,
    selectedPersonId: person.id, prospects: [person],
    skills: Object.fromEntries(['knowledge', 'people', 'care', 'leadership'].map(id => [id, { xp: 25 }])),
    career: { ...base.career, totalSuccessCases: 2 }, ...overrides,
  };
}

function tutorialRoutine() {
  let state = makeInitialState({ seed: 17 });
  state = { ...state, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...state.milestones, certified: true } };
  for (const event of [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT,
    EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) {
    state = reduceGame(state, event);
  }
  assert.equal(state.stage, STAGES.M1_ROUTINE);
  return state;
}

function assertNoSale(before, after) {
  for (const field of ['productSales', 'personalXV', 'sets', 'totalIncome']) assert.equal(after.economy[field], before.economy[field], field);
  assert.equal(after.economy.lastTransaction, null);
  assert.equal(after.monthStats.sales, before.monthStats.sales);
}

test('Month 1 control starts real follow-up without buying anything or creating a receipt', () => {
  const before = tutorialRoutine();
  let state = reduceGame(before, EVENTS.CHOOSE_ROUTINE, { planId: 'control' });
  assert.equal(state.stage, STAGES.M1_ONBOARDING);
  assert.equal(state.energy, before.energy);
  assert.equal(state.prospects[0].careOnly, true);
  assert.equal(state.prospects[0].activePlan, false);
  assert.deepEqual(state.prospects[0].routinePlan.products, []);
  assertNoSale(before, state);
  for (const event of [EVENTS.START_ONBOARDING, EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW,
    EVENTS.CUSTOMER_REVIEW_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE]) state = reduceGame(state, event);
  assert.equal(state.stage, STAGES.M1_TEAM_STARTED);
  assert.equal(state.customers[0].successCase, true);
  assert.equal(state.customers[0].careOnly, true);
  assertNoSale(before, state);
  state = reduceGame(reduceGame(state, EVENTS.END_MONTH), EVENTS.START_NEXT_MONTH);
  assert.equal(state.month, 2);
  assert.equal(state.monthStats.reorders, 0);
  assert.equal(state.economy.personalXV, 0);
  assert.equal(state.customers[0].activePlan, false);
});

test('Month 1 fitted choice submits once and keeps the existing sale price and XV', () => {
  const before = tutorialRoutine();
  const after = reduceGame(before, EVENTS.CHOOSE_ROUTINE, { planId: 'fit' });
  assert.equal(after.stage, STAGES.M1_SALE_RECEIPT);
  assert.equal(after.energy, before.energy - 1);
  assert.deepEqual(after.prospects[0].routinePlan.products, before.prospects[0].fitProducts);
  assert.equal(after.economy.lastTransaction.price, XIRCLE_STARTER.price + TUTORIAL_OFFER.price);
  assert.equal(after.economy.lastTransaction.xv, XIRCLE_STARTER.xv + TUTORIAL_OFFER.xv);
  for (const event of [EVENTS.CHOOSE_ROUTINE, EVENTS.MAKE_OFFER]) {
    const repeated = reduceGame(after, event, { planId: 'fit' });
    assert.equal(repeated.energy, after.energy);
    assert.equal(repeated.economy.personalXV, after.economy.personalXV);
    assert.equal(repeated.monthStats.sales, 1);
  }
});

test('routine readiness is read-only and exposes actionable full-set requirements before a click', () => {
  const before = tutorialRoutine();
  const snapshot = JSON.stringify(before);
  const choices = getRoutineChoices(before);
  assert.deepEqual(choices.map(item => item.id), ['control', 'fit', 'all']);
  assert.deepEqual(choices.map(item => item.cost), [0, 1, 1]);
  assert.equal(choices[0].available, true);
  assert.equal(choices[2].available, false);
  assert.match(choices[2].reason, /Lv\..*\/6/);
  assert.match(choices[2].reason, /เคส/);
  assert.match(choices[2].nextStep, /พฤติกรรม|แผนที่พอดี/);
  assert.equal(JSON.stringify(before), snapshot);
  const rejected = reduceGame(before, EVENTS.CHOOSE_ROUTINE, { planId: 'all' });
  assert.equal(rejected.stage, before.stage);
  assert.equal(rejected.energy, before.energy);
  assert.deepEqual(rejected.skills, before.skills);
  assert.deepEqual(rejected.prospects, before.prospects);
  assert.match(rejected.lastMessage, /Lv\./);
  assert.equal(reduceGame(rejected, EVENTS.CHOOSE_ROUTINE, { planId: 'control' }).stage, STAGES.M1_ONBOARDING);
});

test('management control creates a person to care for, never a paid subscription', () => {
  const before = routineState({}, { fitProducts: [] });
  const choices = getRoutineChoices(before);
  assert.deepEqual(choices.map(item => item.available), [true, false, false]);
  const after = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'control' });
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.equal(after.prospects.length, 0);
  assert.equal(after.customers.length, 1);
  assert.equal(after.customers[0].careOnly, true);
  assertNoSale(before, after);
  const care = getPersonContextAction(after, after.customers[0]);
  assert.equal(care.event, EVENTS.CARE_CUSTOMER);
  const cared = reduceGame(after, care.event, care.payload);
  assert.ok(cared.customers[0].day > 0);
  assert.equal(cared.energy, after.energy - 1);
  assertNoSale(before, cared);
  const customer = { ...cared.customers[0], day: 28, followups: 2, trust: 90, measuredAgain: true, result: 'ดีขึ้น', customerState: CUSTOMER_STATES.READY_TO_BUY };
  const review = { ...cared, customers: [customer] };
  assert.equal(isActionAvailable(review, { event: EVENTS.REORDER_CUSTOMER, id: customer.id, cost: 1 }), false);
  const rejected = reduceGame(review, EVENTS.REORDER_CUSTOMER, { id: customer.id });
  assert.equal(rejected.energy, review.energy);
  assertNoSale(before, rejected);
});

test('a fitted management plan keeps only the person-specific products and offers it once', () => {
  const before = routineState({ rngSeed: 1 }, { fitProducts: ['protein-hmb'] });
  const after = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'fit' });
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.equal(after.energy, before.energy - 1);
  const person = after.customers[0] || after.prospects[0];
  assert.deepEqual(person.routinePlan.products, ['protein-hmb']);
  assert.notEqual(person.journey, 'recommendation');
  const repeat = reduceGame(after, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'fit' });
  assert.equal(repeat.energy, after.energy);
  assert.equal(repeat.economy.personalXV, after.economy.personalXV);
});

test('a prepared full-set customer can buy in one choice while still needing Day 0 care', () => {
  const before = routineState();
  const choice = getRoutineChoices(before).find(item => item.id === 'all');
  assert.equal(choice.available, true);
  assert.ok(choice.chance > 0 && choice.chance < 1);
  const after = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.equal(after.energy, before.energy - 1);
  assert.equal(after.prospects.length, 0);
  assert.equal(after.customers.length, 1);
  assert.equal(after.customers[0].routinePlan.id, 'all');
  assert.deepEqual(after.customers[0].routinePlan.products, ['gus']);
  assert.equal(after.customers[0].day, 0);
  assert.equal(after.customers[0].successCase, false);
  assert.equal(after.customers[0].selfDirected, false);
  assert.equal(after.customers[0].xvisorInterest, false);
  assert.equal(after.monthStats.successCases, before.monthStats.successCases);
  assert.equal(after.monthStats.sales, 1);
  assert.equal(after.economy.lastTransaction.price, 12480);
  assert.equal(after.economy.lastTransaction.xv, 9495);
  const repeat = reduceGame(after, EVENTS.FAST_TRACK_FULL_START, { id: before.selectedPersonId });
  assert.equal(repeat.monthStats.sales, 1);
  assert.equal(repeat.energy, after.energy);
});

test('full-set eligibility requires context, fit, trust and readiness even with experienced skills', () => {
  for (const change of [{ consent: false }, { fitProducts: [] }, { trust: 57 }, { readiness: 61 }]) {
    const before = routineState({}, change);
    assert.equal(getRoutineChoices(before).find(item => item.id === 'all').available, false);
    const after = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
    assert.equal(after.energy, before.energy);
    assert.deepEqual(after.prospects, before.prospects);
    assert.deepEqual(after.skills, before.skills);
    assertNoSale(before, after);
  }
  const before = routineState({ energy: 0 });
  assert.deepEqual(getRoutineChoices(before).map(item => item.available), [true, false, false]);
  assert.equal(reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'control' }).customers.length, 1);
});

test('a full-set refusal remains a real decision with a cooldown instead of a paid retry loop', () => {
  const before = routineState({ rngSeed: 1 });
  const after = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
  assert.equal(after.customers.length, 0);
  assert.equal(after.prospects[0].journey, 'waiting');
  assert.equal(after.prospects[0].nextOfferMonth, before.month + 1);
  assert.equal(after.energy, before.energy - 1);
  assertNoSale(before, after);
  for (const event of [EVENTS.CHOOSE_MANAGEMENT_ROUTINE, EVENTS.OFFER_PROSPECT, EVENTS.FAST_TRACK_FULL_START]) {
    assert.equal(reduceGame(after, event, { id: before.selectedPersonId, planId: 'all' }).energy, after.energy);
  }
});

test('Lv.10 still lets the player decide and saved old recommendation screens resume safely', () => {
  const initial = routineState({ stage: STAGES.MANAGEMENT });
  initial.skills.knowledge.xp = 63;
  const opened = reduceGame(initial, EVENTS.OPEN_MANAGEMENT_ROUTINE, { id: initial.selectedPersonId });
  assert.equal(opened.stage, STAGES.MANAGEMENT_ROUTINE);
  assert.equal(opened.prospects[0].routinePlan, undefined);
  const tutorial = tutorialRoutine();
  const old = { ...tutorial, stage: STAGES.M1_RECOMMENDATION,
    prospects: [{ ...tutorial.prospects[0], journey: 'recommendation', activePlan: false,
      routinePlan: { id: 'control', quality: 'neutral', products: [], includesControl: true } }] };
  const recovered = parseSavedState(serializeState(old));
  assert.equal(recovered.v1SaveVersion, V1_SAVE_VERSION);
  assert.equal(recovered.scoreVersion, V1_SCORE_VERSION);
  const resumed = reduceGame(recovered, EVENTS.MAKE_OFFER);
  assert.equal(resumed.stage, STAGES.M1_ONBOARDING);
  assertNoSale(old, resumed);
  const fitOld = { ...recovered, prospects: [{ ...recovered.prospects[0], routinePlan: { id: 'fit', quality: 'fit', products: ['gus'] } }] };
  const bought = reduceGame(fitOld, EVENTS.MAKE_OFFER);
  assert.equal(bought.stage, STAGES.M1_SALE_RECEIPT);
  assert.equal(bought.monthStats.sales, 1);
});

test('behavior-only care survives reload and cannot invent a Year 2 comeback purchase', () => {
  const before = routineState({}, { fitProducts: [] });
  const chosen = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'control' });
  let state = parseSavedState(serializeState(chosen));
  state = { ...state, month: 13, stage: STAGES.MANAGEMENT, organizationMode: true, campaignComplete: true,
    campaignScore: { locked: true, scoreVersion: V1_SCORE_VERSION }, energy: 0 };
  for (let month = 13; month <= 24; month += 1) {
    assert.equal(state.month, month);
    state = reduceGame(state, EVENTS.END_MONTH);
    assert.equal(state.customers[0].careOnly, true);
    assert.equal(state.customers[0].activePlan, false);
    assert.equal(state.lastOrganizationReport?.repeatCustomers, 0);
    assert.equal(state.lastOrganizationReport?.personalXV, 0);
  }
});

test('legacy Talk plan completes an existing all or incomplete plan without reopening Routine choices', () => {
  for (const routinePlan of [
    { id: 'all', quality: 'fit', products: ['gus'] },
    { id: 'all', quality: 'poor', products: ['gus', 'protein-hmb', 'vita-matrix', 'astamega'] },
    { products: ['gus'] },
  ]) {
    const initial = routineState({ stage: STAGES.MANAGEMENT }, { journey: 'recommendation', routinePlan });
    const before = parseSavedState(serializeState(initial));
    const action = getPersonContextAction(before, before.prospects[0]);
    assert.equal(action.event, EVENTS.OFFER_PROSPECT);
    assert.match(action.label, /คุยแผนกับ/);
    assert.doesNotMatch(action.label, /แฟ้ม X/);
    assert.equal(isActionAvailable(before, action), true);
    const after = reduceGame(before, action.event, action.payload);
    assert.equal(after.stage, STAGES.MANAGEMENT);
    assert.equal(after.energy, before.energy - 1);
    const person = after.customers[0] || after.prospects[0];
    assert.notEqual(person.journey, 'recommendation');
    assert.deepEqual(person.routinePlan.products, ['gus']);
    assert.equal(person.routinePlan.quality, 'fit');
    assert.equal(reduceGame(after, action.event, action.payload).energy, after.energy);
  }
});

test('legacy all with weak fast-track skills still discusses the saved fitted plan once', () => {
  const initial = routineState({ stage: STAGES.MANAGEMENT, skills: { knowledge: { xp: 7 }, people: { xp: 7 }, care: { xp: 0 }, leadership: { xp: 0 } } },
    { journey: 'recommendation', routinePlan: { id: 'all', quality: 'poor', fastLane: true, products: ['gus'] } });
  const after = reduceGame(initial, EVENTS.OFFER_PROSPECT, { id: initial.selectedPersonId });
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.equal(after.energy, initial.energy - 1);
  assert.ok(after.customers.length === 1 || after.prospects[0].journey === 'waiting');
});

test('a saved plan survives a renewed consent step and never asks for the Routine choice again', () => {
  const initial = routineState({ stage: STAGES.MANAGEMENT },
    { journey: 'recommendation', consent: false, routinePlan: { id: 'fit', quality: 'fit', products: ['gus'] } });
  let state = reduceGame(initial, EVENTS.OFFER_PROSPECT, { id: initial.selectedPersonId });
  assert.equal(state.energy, initial.energy);
  assert.equal(state.prospects[0].consent, false);
  assert.equal(state.prospects[0].journey, 'discovery');
  assert.equal(getPersonContextAction(state, state.prospects[0]).event, EVENTS.BASELINE_PROSPECT);
  state = reduceGame(state, EVENTS.BASELINE_PROSPECT, { id: initial.selectedPersonId });
  assert.equal(state.prospects[0].consent, true);
  assert.equal(state.stage, STAGES.MANAGEMENT);
  const next = getPersonContextAction(state, state.prospects[0]);
  assert.equal(next.event, EVENTS.OFFER_PROSPECT);
  state = reduceGame(state, next.event, next.payload);
  assert.equal(state.stage, STAGES.MANAGEMENT);
  assert.ok(state.customers.length === 1 || state.prospects[0].journey === 'waiting');
});

test('omitted legacy consent is recovered only from a completed measured checkpoint', () => {
  const initial = routineState({ stage: STAGES.MANAGEMENT }, { journey: 'recommendation', routinePlan: { id: 'fit', quality: 'fit', products: ['gus'] } });
  delete initial.prospects[0].consent;
  const restored = parseSavedState(serializeState(initial));
  assert.equal(restored.prospects[0].consent, true);
  assert.equal(reduceGame(restored, EVENTS.OFFER_PROSPECT, { id: restored.selectedPersonId }).energy, restored.energy - 1);
  initial.prospects[0].measured = false;
  const missing = parseSavedState(serializeState(initial));
  assert.notEqual(missing.prospects[0].consent, true);
  const deferred = reduceGame(missing, EVENTS.OFFER_PROSPECT, { id: missing.selectedPersonId });
  assert.equal(deferred.energy, missing.energy);
  assert.equal(deferred.prospects[0].journey, 'discovery');
});

test('a stale paid Month 1 recommendation continues to onboarding without another transaction', () => {
  const bought = reduceGame(tutorialRoutine(), EVENTS.CHOOSE_ROUTINE, { planId: 'fit' });
  const legacy = { ...bought, stage: STAGES.M1_RECOMMENDATION, prospects: bought.prospects.map(person => ({ ...person, journey: 'recommendation' })) };
  const after = reduceGame(parseSavedState(serializeState(legacy)), EVENTS.MAKE_OFFER);
  assert.equal(after.stage, STAGES.M1_ONBOARDING);
  assert.equal(after.energy, legacy.energy);
  assert.equal(after.economy.personalXV, legacy.economy.personalXV);
  assert.equal(after.monthStats.sales, 1);
  assert.equal(after.economy.lastTransaction.id, legacy.economy.lastTransaction.id);
});
