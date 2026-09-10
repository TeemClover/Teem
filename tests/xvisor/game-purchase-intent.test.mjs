import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS, STAGES, V1_SAVE_VERSION, V1_SCORE_VERSION,
  makeInitialState, reduceGame, getRoutineChoices, getPersonContextAction,
  getRecurringBaseSummary, calculateEconomy, parseSavedState, serializeState,
} from '../../xvisor/quest/game-data.js';
import { createPerson, advanceSeed } from '../../xvisor/quest/game-people.js';
import { getSkillLevel } from '../../xvisor/quest/game-progression.js';

const reload = state => parseSavedState(serializeState(state));
function campaign(seed, xp = 0) {
  const initial = makeInitialState({ seed });
  return { ...initial, month: 2, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true },
    skills: { ...initial.skills, people: { xp }, knowledge: { xp } } };
}
function incoming(seed) {
  const state = reduceGame(campaign(seed), EVENTS.CREATE_LEAD, { source: 'known' });
  const person = state.prospects.at(-1);
  assert.equal(person.purchaseIntent.kind, 'ready');
  const opened = reduceGame(state, EVENTS.OPEN_MANAGEMENT_ROUTINE, { id: person.id });
  assert.equal(opened.stage, STAGES.MANAGEMENT_ROUTINE);
  return opened;
}
const choose = (state, planId = 'all') => reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId });

// Fixed seeds select real generated requests; neither sales nor household
// quantities are injected into these QA states.
test('incoming program seekers are rare, save their household request, and never replace behavior-only or tutorial needs', () => {
  const counts = { ready: 0, total: 0, family: 0 };
  const quantities = new Set();
  for (let seed = 1; seed <= 2000; seed += 1) {
    const made = createPerson({ seed, index: 1 });
    assert.equal(made.nextSeed, advanceSeed(advanceSeed(advanceSeed(advanceSeed(seed)))));
    assert.deepEqual(made, createPerson({ seed, index: 1 }));
    counts.total += 1;
    if (made.person.purchaseIntent.kind === 'ready') {
      counts.ready += 1;
      quantities.add(made.person.purchaseIntent.requestedQuantity);
      counts.family += Number(made.person.purchaseIntent.requestedQuantity > 1);
      assert.ok(made.person.fitProducts.length > 0);
    }
    if (!made.person.fitProducts.length) assert.equal(made.person.purchaseIntent.kind, 'exploring');
    const tutorial = createPerson({ seed, index: 1, tutorial: true }).person;
    assert.equal(tutorial.purchaseIntent.kind, 'exploring');
    assert.equal(tutorial.purchaseIntent.requestedQuantity, 1);
  }
  assert.ok(counts.ready > 30 && counts.ready < 200, JSON.stringify(counts));
  assert.ok(counts.family > 0 && counts.family < counts.ready / 2);
  assert.deepEqual(quantities, new Set([1, 2, 3]));
});

test('a real ordinary conversation can unlock full plan at Lv.3 without two success cases or waiting until Month 4', () => {
  let state = reduceGame(campaign(3, 7), EVENTS.CREATE_LEAD, { source: 'known' });
  const id = state.prospects.at(-1).id;
  assert.equal(state.prospects.at(-1).purchaseIntent.kind, 'exploring');
  for (let step = 0; step < 12 && state.stage !== STAGES.MANAGEMENT_ROUTINE; step += 1) {
    const person = state.prospects.find(person => person.id === id);
    const action = getPersonContextAction(state, person, 'prospect');
    assert.ok(action);
    state = reduceGame(state, action.event, action.payload);
    if (![STAGES.MANAGEMENT, STAGES.MANAGEMENT_ROUTINE].includes(state.stage)) state = reduceGame(state, EVENTS.SCENE_COMPLETE);
  }
  assert.equal(state.stage, STAGES.MANAGEMENT_ROUTINE);
  assert.equal(getSkillLevel(state.skills, 'people'), 3);
  assert.equal(getSkillLevel(state.skills, 'knowledge'), 3);
  assert.equal(state.customers.length, 0);
  assert.equal(state.monthStats.successCases, 0);
  const full = getRoutineChoices(state).find(choice => choice.id === 'all');
  assert.equal(full.available, true);
  assert.ok(full.chance > .3 && full.chance < .7);
  const after = choose(state);
  assert.equal(after.energy, state.energy - 1);
  assert.equal(after.stage, STAGES.MANAGEMENT);
  assert.ok(after.customers.length === 1 || after.prospects[0].journey === 'waiting');
});

test('a real incoming buyer can discuss full plan at Lv.1, with better skills and trust improving the actual chance', () => {
  const state = incoming(53);
  assert.equal(getSkillLevel(state.skills, 'people'), 1);
  assert.equal(state.prospects[0].consent, true);
  assert.equal(state.prospects[0].measured, true);
  assert.ok(state.prospects[0].fitProducts.length);
  const full = getRoutineChoices(state).at(-1);
  assert.equal(full.available, true);
  assert.equal(full.quantity, 3);
  assert.ok(full.chance < 1);
  const experienced = { ...state, skills: { ...state.skills, people: { xp: 25 }, knowledge: { xp: 25 } } };
  assert.ok(getRoutineChoices(experienced).at(-1).chance > full.chance);
  const moreTrust = { ...state, prospects: state.prospects.map(person => ({ ...person, trust: 75 })) };
  assert.ok(getRoutineChoices(moreTrust).at(-1).chance > full.chance);
  const noContext = { ...state, prospects: state.prospects.map(person => ({ ...person, journey: 'new', consent: false, measured: false })) };
  const noFit = { ...state, prospects: state.prospects.map(person => ({ ...person, fitProducts: [] })) };
  for (const blocked of [noContext, noFit]) {
    assert.equal(getRoutineChoices(blocked).at(-1).available, false);
    assert.equal(choose(blocked).energy, blocked.energy);
    assert.equal(choose(blocked).economy.lastTransaction, null);
  }
});

test('one-, two- and three-set first purchases have exact quantities and receipts while adding only one recurring relationship', () => {
  for (const [seed, quantity] of [[32, 1], [400, 2], [53, 3]]) {
    const before = incoming(seed);
    const state = choose(before);
    const tx = state.economy.lastTransaction;
    assert.ok(tx);
    assert.equal(tx.quantity, quantity);
    assert.equal(tx.items.length, 2);
    assert.ok(tx.items.every(item => item.quantity === quantity));
    assert.equal(tx.price, tx.items.reduce((sum, item) => sum + item.quantity * item.price, 0));
    assert.equal(tx.xv, tx.items.reduce((sum, item) => sum + item.quantity * item.xv, 0));
    assert.equal(tx.price, 12480 * quantity);
    assert.equal(tx.xv, 9495 * quantity);
    assert.equal(state.economy.sets, quantity);
    assert.equal(calculateEconomy(state).channel1, Math.round(tx.xv * .2));
    assert.equal(tx.incomeDelta, calculateEconomy(state).projectedIncome);
    assert.equal(state.monthStats.sales, 1);
    assert.equal(state.customers.length, 1);
    assert.equal(state.customers[0].initialOrderQuantity, quantity);
    assert.equal(state.customers[0].renewalQuantity, 1);
    assert.equal(state.customers[0].successCase, false);
    assert.equal(state.customers[0].day, 0);
    assert.equal(getRecurringBaseSummary(state).total, 1);
    assert.deepEqual(choose(reload(before)).economy.lastTransaction, tx);
    assert.deepEqual(choose({ ...before, rngSeed: before.rngSeed + 99 }).economy.lastTransaction, tx);
    for (const event of [EVENTS.CHOOSE_MANAGEMENT_ROUTINE, EVENTS.FAST_TRACK_FULL_START, EVENTS.OFFER_PROSPECT]) {
      const repeated = reduceGame(reload(state), event, { planId: 'all', id: before.selectedPersonId });
      assert.equal(repeated.energy, state.energy);
      assert.equal(repeated.economy.personalXV, state.economy.personalXV);
      assert.equal(repeated.economy.lastTransaction.id, tx.id);
    }
  }
});

test('a family order crossing the baht tier keeps the exact monthly income and all receipt parts reconcile', () => {
  const first = choose(incoming(32));
  let state = reduceGame({ ...first, rngSeed: 242 }, EVENTS.CREATE_LEAD, { source: 'known' });
  const person = state.prospects.at(-1);
  assert.equal(person.purchaseIntent.requestedQuantity, 3);
  state = reduceGame(state, EVENTS.OPEN_MANAGEMENT_ROUTINE, { id: person.id });
  state = choose(state);
  assert.equal(state.customers.length, 2);
  const tx = state.economy.lastTransaction;
  assert.equal(tx.quantity, 3);
  assert.equal(state.economy.productSales, 49920);
  assert.equal(state.economy.personalXV, 37980);
  assert.equal(calculateEconomy(state).retailRate, .23);
  assert.equal(calculateEconomy(state).channel1, Math.round(37980 * .23));
  assert.equal(tx.incomeDelta, Math.round(37980 * .23) - 1899);
  assert.equal(Object.entries(tx.incomeBreakdown).filter(([key]) => key !== 'total').reduce((sum, [, amount]) => sum + amount, 0), tx.incomeDelta);
  assert.equal(getRecurringBaseSummary(state).total, 2);
});

test('a high-intent family can still decline, and cannot reroll their answer or pay energy again in the same month', () => {
  const before = incoming(709);
  const state = choose(before);
  assert.equal(state.customers.length, 0);
  assert.equal(state.economy.lastTransaction, null);
  assert.equal(state.prospects[0].journey, 'waiting');
  assert.equal(state.prospects[0].nextOfferMonth, 3);
  assert.equal(state.prospects[0].purchaseIntent.requestedQuantity, 2);
  assert.equal(state.energy, before.energy - 1);
  assert.equal(choose(reload(before)).prospects[0].journey, 'waiting');
  assert.equal(choose({ ...before, rngSeed: before.rngSeed + 99 }).prospects[0].journey, 'waiting');
  const repeated = reduceGame(reload(state), EVENTS.FAST_TRACK_FULL_START, { id: before.selectedPersonId });
  assert.equal(repeated.energy, state.energy);
  assert.equal(repeated.economy.personalXV, 0);
});

test('family fit and behavior-only choices keep distinct outcomes without forcing a full plan', () => {
  const before = incoming(53);
  const fitted = choose(before, 'fit');
  assert.equal(fitted.customers.length, 1);
  assert.equal(fitted.customers[0].routinePlan.id, 'fit');
  assert.deepEqual(fitted.customers[0].routinePlan.products, before.prospects[0].fitProducts);
  assert.equal(fitted.economy.lastTransaction.quantity, 3);
  const care = choose(before, 'control');
  assert.equal(care.customers.length, 1);
  assert.equal(care.customers[0].careOnly, true);
  assert.equal(care.economy.personalXV, 0);
  assert.equal(care.economy.lastTransaction, null);
  assert.equal(getRecurringBaseSummary(care).total, 0);
});

test('family first purchase does not silently become three renewals or a triple direct-member own purchase', () => {
  let state = choose(incoming(53));
  const personId = state.customers[0].personId;
  const customerId = state.customers[0].id;
  state = { ...state, customers: state.customers.map(person => ({ ...person, xvisorStage: 'case', candidateProgress: 2, candidateStartedMonth: 1 })) };
  state = reduceGame(state, EVENTS.CERTIFY_CANDIDATE, { id: customerId });
  state = reduceGame(state, EVENTS.SCENE_COMPLETE);
  assert.equal(state.team.length, 1);
  assert.equal(state.economy.personalXV, 28485);
  assert.equal(getRecurringBaseSummary(state).total, 1);
  let repeats = 0;
  for (let month = 3; month <= 7; month += 1) {
    const closed = reduceGame(state, EVENTS.END_MONTH);
    state = reduceGame(closed, EVENTS.START_NEXT_MONTH);
    assert.deepEqual(reduceGame(reload(closed), EVENTS.START_NEXT_MONTH).monthOpeningReport, state.monthOpeningReport);
    assert.equal(getRecurringBaseSummary(state).total, 1);
    assert.equal(state.monthOpeningReport.eligibleCount, 1);
    for (const tx of state.monthOpeningReport.transactions) {
      repeats += 1;
      assert.equal(tx.quantity, 1);
      assert.equal(tx.items.length, 1);
      assert.equal(tx.price, 7490);
      assert.equal(tx.xv, 7000);
    }
    assert.equal(state.customers.find(person => person.personId === personId).initialOrderQuantity, 3);
    assert.ok(state.monthOpeningReport.automaticCount <= 1);
    const economy = calculateEconomy(state);
    assert.equal(economy.personalXV, state.monthOpeningReport.automaticCount * 7000);
    assert.equal(economy.tgv, economy.personalXV + economy.teamXV);
  }
  assert.ok(repeats > 0);
});

test('old unresolved prospects gain a stable intent without changing their need, checkpoints, chosen orders or existing receipts', () => {
  const initial = reduceGame(campaign(53), EVENTS.CREATE_LEAD, { source: 'known' });
  const person = { ...initial.prospects[0], journey: 'new', consent: false, measured: false, trust: 22, readiness: 48 };
  delete person.purchaseIntent;
  const legacy = { ...initial, prospects: [person] };
  const loaded = reload(legacy);
  const { purchaseIntent, ...rest } = loaded.prospects[0];
  assert.ok(purchaseIntent);
  for (const key of ['need', 'fitProducts', 'journey', 'consent', 'measured', 'trust', 'readiness']) assert.deepEqual(rest[key], person[key]);
  assert.deepEqual(reload(loaded).prospects[0].purchaseIntent, purchaseIntent);
  assert.deepEqual(getRoutineChoices(loaded), getRoutineChoices(legacy));
  const chosen = { ...legacy, prospects: [{ ...person, journey: 'recommendation', routinePlan: { id: 'all', products: person.fitProducts, quality: 'fit' } }] };
  assert.equal(reload(chosen).prospects[0].purchaseIntent, undefined);
  const paid = choose(incoming(53));
  const receipt = paid.economy.lastTransaction;
  assert.deepEqual(reload(paid).economy.lastTransaction, receipt);
  assert.equal(reload(paid).v1SaveVersion, V1_SAVE_VERSION);
  assert.equal(reload(paid).scoreVersion, V1_SCORE_VERSION);
});
