import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeInitialState, reduceGame, parseSavedState, serializeState, calculateEconomy,
  EVENTS, STAGES, CUSTOMER_STATES, V1_SCORE_VERSION, SAVE_KEY,
  getRenewalFollowupEligibility, getPersonContextAction, applyAutomaticCustomerCycles,
} from '../../xvisor/quest/game-data.js';
import { TUTORIAL_OFFER } from '../../xvisor/quest/game-commercial-config.js';

// Fixed QA customers exercise outcomes; these values are not sales forecasts.
function campaign({ seed = 8, count = 12, quality = 75 } = {}) {
  const base = makeInitialState({ seed });
  return {
    ...base, month: 4, phase: 'management', stage: STAGES.MANAGEMENT, rank: 'xvisor', energy: 28,
    customers: Array.from({ length: count }, (_, index) => ({
      id: `c${index}`, personId: `p${index}`, name: `ลูกค้า ${index}`, activePlan: true,
      trust: quality, adherence: quality, satisfaction: quality,
      day: 28, followups: 2, measuredAgain: true, lastReorderMonth: 4,
    })),
    skills: { ...base.skills, care: { xp: 12 } },
  };
}
const close = (state) => reduceGame(state, EVENTS.END_MONTH);
const open = (state) => reduceGame(close(state), EVENTS.START_NEXT_MONTH);
const person = (state, id) => state.customers.find((customer) => customer.id === id);
const reload = (state) => parseSavedState(serializeState(state));

function assertNoNewOrder(before, after) {
  assert.equal(after.economy.personalXV, before.economy.personalXV);
  assert.equal(after.economy.productSales, before.economy.productSales);
  assert.equal(after.economy.sets, before.economy.sets);
  assert.equal(after.economy.lastTransaction?.id, before.economy.lastTransaction?.id);
  assert.equal(after.monthStats.reorders, before.monthStats.reorders);
}

test('opening evaluates every paid plan and records real repeat income, including a retail tier increase', () => {
  const state = open(campaign());
  const report = state.monthOpeningReport;
  assert.equal(state.month, 5);
  assert.equal(report.eligibleCount, 12);
  assert.equal(report.automaticCustomerIds.length, 7);
  assert.equal(report.followUpCustomerIds.length, 3);
  assert.equal(report.pausedCustomerIds.length, 2);
  assert.equal(new Set([...report.automaticCustomerIds, ...report.actionableCustomerIds]).size, 12);
  assert.deepEqual(report.actionableCustomerIds, [...report.followUpCustomerIds, ...report.pausedCustomerIds]);
  assert.equal(report.salesBaht, 52430);
  assert.equal(report.personalXV, 49000);
  assert.equal(report.incomeDelta, 11270);
  assert.deepEqual(report.income, { channel1: 11270, channel2: 0, channel3: 0, channel4: 0, total: 11270 });
  assert.equal(report.accountingFinalized, true);
  assert.equal(report.transactions.reduce((sum, tx) => sum + tx.incomeDelta, 0), report.incomeDelta);
  assert.ok(report.transactions.some((tx) => tx.incomeBreakdown.tierTrueUp > 0));
  assert.equal(state.monthStats.autoReorders, 7);
  assert.equal(state.monthStats.reorders, 7);
  for (const tx of report.transactions) {
    assert.equal(tx.kind, 'reorder');
    assert.equal(tx.price, TUTORIAL_OFFER.price);
    assert.equal(tx.xv, TUTORIAL_OFFER.xv);
    assert.equal(tx.items.length, 1);
    assert.equal(person(state, tx.customerId).lastReorderMonth, 5);
    assert.equal(person(state, tx.customerId).renewalSource, 'automatic');
  }
});

test('opening survives reload and unrelated RNG changes without rerolling or charging again', () => {
  const ended = close(campaign());
  const state = reduceGame(ended, EVENTS.START_NEXT_MONTH);
  const reordered = { ...reload(ended), rngSeed: 999999, customers: [...ended.customers].reverse() };
  const same = reduceGame(reordered, EVENTS.START_NEXT_MONTH);
  assert.deepEqual(same.monthOpeningReport, state.monthOpeningReport);
  assert.deepEqual(reload(state).monthOpeningReport, state.monthOpeningReport);
  assert.deepEqual(reduceGame(reload(state), EVENTS.START_NEXT_MONTH).monthOpeningReport, state.monthOpeningReport);
  assertNoNewOrder(state, reduceGame(reload(state), EVENTS.START_NEXT_MONTH));
  assert.strictEqual(applyAutomaticCustomerCycles(state), state);
});

test('care and stronger relationships increase renewal chances without making every customer buy', () => {
  const weak = campaign({ count: 80, quality: 25 });
  const strong = campaign({ count: 80, quality: 90 });
  strong.skills.care = { xp: 99 };
  strong.customers = strong.customers.map((customer) => ({ ...customer, followups: 4, successCase: true, lastContactMonth: 4 }));
  const low = open(weak).monthOpeningReport.automaticCustomerIds;
  const high = open(strong).monthOpeningReport.automaticCustomerIds;
  assert.ok(high.length > low.length);
  assert.ok(high.length < strong.customers.length);
  assert.ok(low.every((id) => high.includes(id)), 'the same customer roll cannot worsen with better care');
});

test('care-only, paired team people, duplicate records and current-month purchases never double bill', () => {
  const state = campaign({ count: 1 });
  state.customers.push(
    { ...state.customers[0], id: 'duplicate-c0' },
    { ...state.customers[0], id: 'behavior-duplicate', careOnly: true, activePlan: false },
    { ...state.customers[0], id: 'care', personId: 'care-person', careOnly: true },
    { ...state.customers[0], id: 'team-customer', personId: 'team-person' },
    { ...state.customers[0], id: 'fresh', personId: 'fresh-person', lastReorderMonth: 5 },
  );
  state.team = [{ id: 'team-member', personId: 'team-person', name: 'ทีม', active: false }];
  const next = open(state);
  assert.equal(next.monthOpeningReport.eligibleCount, 1);
  assert.deepEqual(next.monthOpeningReport.automaticCustomerIds, ['c0']);
  assert.equal(next.economy.personalXV, 7000);
  assert.equal(person(next, 'duplicate-c0').lastReorderMonth, 5);
  assert.equal(person(next, 'behavior-duplicate').activePlan, false);
  assert.equal(person(next, 'care').renewalMonth, undefined);
  assert.equal(person(next, 'team-customer').renewalMonth, undefined);
  assert.equal(person(next, 'fresh').renewalMonth, undefined);
  for (const id of ['c0', 'duplicate-c0', 'care', 'team-customer', 'fresh']) {
    const attempted = reduceGame(next, EVENTS.REORDER_CUSTOMER, { id });
    assertNoNewOrder(next, attempted);
    assert.equal(attempted.energy, next.energy);
  }
});

test('paused Day 28 customers can receive care and return through one follow-up with one real receipt', () => {
  const state = open(campaign());
  const id = 'c9';
  assert.equal(person(state, id).renewalStatus, 'paused');
  assert.equal(getPersonContextAction(state, person(state, id)).event, EVENTS.REORDER_CUSTOMER);
  const readiness = getRenewalFollowupEligibility(state, person(state, id));
  assert.equal(readiness.available, true);
  const cared = reduceGame(state, EVENTS.CARE_CUSTOMER, { id });
  assert.equal(cared.energy, state.energy - 1);
  assert.ok(getRenewalFollowupEligibility(cared, person(cared, id)).chance > readiness.chance);
  assertNoNewOrder(state, cared);
  const next = reduceGame(cared, EVENTS.REORDER_CUSTOMER, { id });
  assert.equal(next.energy, cared.energy - 1);
  assert.equal(next.economy.personalXV - cared.economy.personalXV, 7000);
  assert.equal(next.economy.lastTransaction.kind, 'reorder');
  assert.equal(next.economy.lastTransaction.customerId, id);
  assert.equal(next.economy.lastTransaction.price, 7490);
  assert.equal(next.economy.lastTransaction.incomeDelta, calculateEconomy(next).projectedIncome - calculateEconomy(cared).projectedIncome);
  assert.equal(person(next, id).renewalStatus, 'automatic');
  assert.equal(person(next, id).renewalSource, 'followup');
  assert.equal(person(next, id).lastRenewalFollowUpMonth, 5);
  assert.equal(next.monthStats.autoReorders, state.monthStats.autoReorders);
  assert.deepEqual(next.monthOpeningReport, state.monthOpeningReport);
  assert.deepEqual(reload(next).monthOpeningReport, state.monthOpeningReport);
  for (const event of [EVENTS.REORDER_CUSTOMER, EVENTS.CARE_CUSTOMER]) {
    const repeated = reduceGame(reload(next), event, { id });
    assertNoNewOrder(next, repeated);
    assert.equal(repeated.energy, next.energy);
  }
});

test('an unsuccessful follow-up is a real pause, not a sale or a paid retry loop', () => {
  const state = open(campaign({ count: 30, quality: 35 }));
  const outcomes = state.monthOpeningReport.actionableCustomerIds.map((id) => ({ id, after: reduceGame(state, EVENTS.REORDER_CUSTOMER, { id }) }));
  const failed = outcomes.find(({ id, after }) => person(after, id).renewalStatus === 'paused');
  assert.ok(failed, 'the fixed cohort includes an actual refusal');
  assert.ok(outcomes.some(({ id, after }) => person(after, id).renewalStatus === 'automatic'), 'follow-up can also bring customers back');
  const { id, after } = failed;
  assert.equal(after.energy, state.energy - 1);
  assertNoNewOrder(state, after);
  assert.equal(person(after, id).activePlan, false);
  assert.equal(person(after, id).lastRenewalFollowUpMonth, 5);
  assert.equal(getRenewalFollowupEligibility(after, person(after, id)).available, false);
  const repeated = reduceGame(reload(after), EVENTS.REORDER_CUSTOMER, { id });
  assertNoNewOrder(after, repeated);
  assert.equal(repeated.energy, after.energy);
  assert.deepEqual(after.monthOpeningReport, state.monthOpeningReport);
  const nextMonth = open(after);
  assert.equal(person(nextMonth, id).renewalMonth, 6);
  if (person(nextMonth, id).renewalStatus !== 'automatic') assert.equal(getRenewalFollowupEligibility(nextMonth, person(nextMonth, id)).available, true);
});

test('legacy manual reorders cannot repeat a sale in the same month', () => {
  const state = campaign({ count: 1, quality: 65 });
  state.customers[0] = { ...state.customers[0], result: 'ดีขึ้น', customerState: CUSTOMER_STATES.READY_TO_BUY, selfDirected: false };
  const sameMonth = reduceGame(state, EVENTS.REORDER_CUSTOMER, { id: 'c0' });
  assertNoNewOrder(state, sameMonth);
  assert.equal(sameMonth.energy, state.energy);
  const older = { ...state, customers: [{ ...state.customers[0], lastReorderMonth: 3 }] };
  const allowed = reduceGame(older, EVENTS.REORDER_CUSTOMER, { id: 'c0' });
  assert.equal(allowed.economy.personalXV, 7000);
  const repeated = reduceGame({ ...allowed, customers: [{ ...older.customers[0], lastReorderMonth: 4 }] }, EVENTS.REORDER_CUSTOMER, { id: 'c0' });
  assertNoNewOrder(allowed, repeated);
  assert.equal(repeated.energy, allowed.energy);
});

test('opening income excludes both last month income and new team income', () => {
  const state = campaign();
  state.rank = 'xlead';
  state.career = { ...state.career, xleadCertified: true };
  state.economy = { ...state.economy, personalXV: 210000, productSales: 224700 };
  state.team = [{ id: 'member-one', personId: 'team-one', name: 'ทีมหนึ่ง', active: true, parentId: 'player', generation: 1, rank: 'xvisor', customers: 5, confidence: 80, autonomy: 80, teamSkill: 5, personalXV: 35000, personalSalesBaht: 37450 }];
  const after = open(state);
  assert.ok(calculateEconomy(after).channel2 > 0);
  assert.equal(after.monthOpeningReport.income.channel2, 0);
  assert.equal(after.monthOpeningReport.incomeDelta, 11270);
  assert.ok(after.economy.totalIncome > after.monthOpeningReport.incomeDelta);
  assert.equal(after.monthOpeningReport.transactions.reduce((sum, tx) => sum + tx.incomeDelta, 0), 11270);
});

test('old open saves gain no invented opening notice and preserve score/save identity', () => {
  const state = campaign();
  const loaded = reload(state);
  assert.equal(loaded.monthOpeningReport, undefined);
  assert.equal(loaded.customers.some((customer) => customer.renewalMonth), false);
  assert.equal(loaded.scoreVersion, V1_SCORE_VERSION);
  assert.equal(SAVE_KEY, 'xvisorQuestContinueV4');
  assert.equal(loaded.runId, state.runId);
  assert.equal(open(loaded).monthOpeningReport.month, 5);
});

test('Year 2 retains its own simulation and excludes personal/team duplicates and behavior-only plans', () => {
  let state = campaign({ count: 0 });
  state = { ...state, month: 12, campaignComplete: true, campaignScore: { locked: true, scoreVersion: V1_SCORE_VERSION }, campaignOutcome: { xgenByMonth12: false } };
  state.customers = [
    { id: 'paired-customer', personId: 'team-person', name: 'ทีม', activePlan: true, satisfaction: 100 },
    { id: 'behavior', personId: 'behavior', name: 'ดูแล', careOnly: true, activePlan: false, satisfaction: 100 },
  ];
  state.team = [{ id: 'member', personId: 'team-person', name: 'ทีม', active: true, parentId: 'player', generation: 1, rank: 'xvisor', customers: 0, confidence: 80, autonomy: 80, teamSkill: 5 }];
  state = reduceGame(state, EVENTS.ENTER_ORGANIZATION);
  assert.equal(state.organizationMode, true);
  assert.equal(state.month, 13);
  assert.equal(state.economy.personalXV, 0);
  assert.equal(state.monthOpeningReport, undefined);
  const next = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(next.economy.personalXV, 0);
  assert.equal(person(next, 'behavior').activePlan, false);
  assert.equal(next.monthOpeningReport, undefined);
});
