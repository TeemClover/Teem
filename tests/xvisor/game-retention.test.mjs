import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeInitialState, reduceGame, parseSavedState, serializeState, calculateEconomy,
  EVENTS, STAGES, CUSTOMER_STATES, V1_SCORE_VERSION, SAVE_KEY,
  getRenewalFollowupEligibility, getPersonContextAction, applyAutomaticCustomerCycles, getRecurringBaseSummary,
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
  assert.equal(report.automaticCustomerIds.length, 9);
  assert.equal(report.followUpCustomerIds.length, 1);
  assert.equal(report.pausedCustomerIds.length, 2);
  assert.equal(new Set([...report.automaticCustomerIds, ...report.actionableCustomerIds]).size, 12);
  assert.deepEqual(report.actionableCustomerIds, [...report.followUpCustomerIds, ...report.pausedCustomerIds]);
  assert.equal(report.salesBaht, 67410);
  assert.equal(report.personalXV, 63000);
  assert.equal(report.incomeDelta, 14490);
  assert.deepEqual(report.income, { channel1: 14490, channel2: 0, channel3: 0, channel4: 0, total: 14490 });
  assert.equal(report.accountingFinalized, true);
  assert.equal(report.transactions.reduce((sum, tx) => sum + tx.incomeDelta, 0), report.incomeDelta);
  assert.ok(report.transactions.some((tx) => tx.incomeBreakdown.tierTrueUp > 0));
  assert.equal(state.monthStats.autoReorders, 9);
  assert.equal(state.monthStats.reorders, 9);
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

test('care-only, deeper team people, duplicate records and current-month purchases never double bill', () => {
  const state = campaign({ count: 1 });
  state.customers.push(
    { ...state.customers[0], id: 'duplicate-c0' },
    { ...state.customers[0], id: 'behavior-duplicate', careOnly: true, activePlan: false },
    { ...state.customers[0], id: 'care', personId: 'care-person', careOnly: true },
    { ...state.customers[0], id: 'team-customer', personId: 'team-person' },
    { ...state.customers[0], id: 'fresh', personId: 'fresh-person', lastReorderMonth: 5 },
  );
  state.team = [{ id: 'team-member', personId: 'team-person', name: 'ทีม', parentId: 'another-member', active: false }];
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
  assert.equal(after.monthOpeningReport.incomeDelta, 16100);
  assert.ok(after.economy.totalIncome > after.monthOpeningReport.incomeDelta);
  assert.equal(after.monthOpeningReport.transactions.reduce((sum, tx) => sum + tx.incomeDelta, 0), 16100);
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

test('Year 2 shares the recurring base, counts a paired direct member once and excludes behavior-only plans', () => {
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
  assert.equal(next.monthOpeningReport.month, 13);
  assert.equal(next.monthOpeningReport.eligibleCount, 1);
  assert.equal(next.monthOpeningReport.accountingFinalized, true);
  assert.equal(getRecurringBaseSummary(next).total, 1);
});

function mixedBase() {
  const state = campaign();
  state.customers = state.customers.filter((customer) => [0, 2, 3, 4, 7].some((n) => customer.id === `c${n}`));
  state.skills.leadership = { xp: 0 };
  state.rank = 'xlead';
  state.career = { ...state.career, xleadCertified: true };
  const member = (id, personId, parentId = 'player') => ({ id, personId, name: id, parentId, active: true, rank: 'xvisor', certifiedMonth: 4, confidence: 1, autonomy: 1, teamSkill: 1, specialty: 'builder', customers: 0, trust: 75, adherence: 75, satisfaction: 75 });
  state.team = [member('direct-paired', 'p2'), member('direct-only', 'p5'), member('deeper', 'p6', 'direct-paired')];
  return state;
}

test('direct own purchases belong to the player once; deeper purchases belong to their own recommender', () => {
  const state = open(mixedBase());
  const report = state.monthOpeningReport;
  assert.equal(report.eligibleCount, 6);
  assert.equal(report.automaticCount, 6);
  assert.equal(report.automaticCustomerIds.length, 4);
  assert.deepEqual(report.automaticDirectMemberIds, ['direct-paired', 'direct-only']);
  assert.equal(report.directMemberXV, 14000);
  assert.equal(report.directMemberSalesBaht, 14980);
  const economy = calculateEconomy(state);
  assert.equal(economy.personalXV, 42000);
  assert.equal(economy.personalSalesBaht, 44940);
  assert.equal(economy.channel1, 9660);
  assert.equal(economy.teamXV, 7000);
  assert.equal(economy.tgv, 49000);
  assert.equal(economy.channel2, 280, 'the parent earns only from the deeper member order, not their own purchase');
  assert.equal(state.team.find((member) => member.id === 'direct-only').commission, 0);
  assert.equal(state.team.find((member) => member.id === 'deeper').commission, 0);
  assert.equal(getRecurringBaseSummary(state).total, 6);
  assert.equal(getRecurringBaseSummary(state).customerCount, 4);
  assert.equal(getRecurringBaseSummary(state).directMemberCount, 2);
  assert.deepEqual(getRecurringBaseSummary(reload(state)), getRecurringBaseSummary(state));
  assertNoNewOrder(state, reduceGame(reload(state), EVENTS.REORDER_CUSTOMER, { id: 'direct-paired' }));
});

test('legacy current-month self-use transfers actual volume once without new receipts or rewritten history', () => {
  const state = campaign({ count: 0 });
  state.month = 6;
  state.team = [{ id: 'direct-old', personId: 'old-person', name: 'กานต์', parentId: 'player', active: true, lastSelfUseMonth: 6, personalXV: 7000, personalSalesBaht: 7490, commission: 1400, totalIncome: 4400, monthlyOutput: { selfUse: 1, personalXV: 7000, personalSalesBaht: 7490, commission: 1400 } }];
  state.economy = { ...state.economy, teamXV: 7000, teamProductSales: 7490 };
  state.monthOpeningReport = { month: 6, eligibleCount: 0, automaticCustomerIds: [], followUpCustomerIds: [], pausedCustomerIds: [], incomeDelta: 0 };
  state.settlements = { '5': { month: 5, settled: true, total: 1234 } };
  const next = reload(state);
  assert.equal(next.economy.personalXV, 7000);
  assert.equal(next.economy.productSales, 7490);
  assert.equal(next.economy.teamXV, 0);
  assert.equal(next.team[0].commission, 0);
  assert.equal(next.economy.lastTransaction, null);
  assert.deepEqual(next.monthOpeningReport, state.monthOpeningReport);
  assert.deepEqual(next.settlements, state.settlements);
  assert.deepEqual(reload(next).economy, next.economy);
  assert.equal(getRecurringBaseSummary(next).directMemberPurchasedThisMonth, 1);
});

test('duplicate customer history picks the same paid record in either list order', () => {
  const state = campaign({ count: 1 });
  state.customers.push({ ...state.customers[0], id: 'older-alias', lastReorderMonth: 2, trust: 10, satisfaction: 20 });
  const forward = open(state);
  const backward = open({ ...state, customers: [...state.customers].reverse() });
  assert.deepEqual(forward.monthOpeningReport, backward.monthOpeningReport);
  assert.equal(getRecurringBaseSummary(forward).total, 1);
});

test('a current-month buyer promoted to direct member retains one subscription and waits until next month', () => {
  const state = mixedBase();
  state.month = 5;
  state.customers = [{ ...state.customers[0], id: 'paid-now', personId: 'p2', lastReorderMonth: 5 }];
  state.team = [{ ...state.team[0], lastReorderMonth: 5, certifiedMonth: 5 }];
  const base = getRecurringBaseSummary(state);
  assert.equal(base.total, 1);
  assert.equal(base.directMemberCount, 1);
  const attempted = reduceGame(state, EVENTS.REORDER_CUSTOMER, { id: state.team[0].id });
  assertNoNewOrder(state, attempted);
  assert.equal(attempted.energy, state.energy);
  assert.equal(open(state).monthOpeningReport.eligibleCount, 1);
});

test('retail boundaries are strictly over baht thresholds, with XV remaining the payout base', () => {
  const state = campaign({ count: 0 });
  for (const [sales, rate] of [[40000, .20], [40000.01, .23], [100000, .23], [100000.01, .25]]) {
    const income = calculateEconomy({ ...state, economy: { ...state.economy, productSales: sales, personalXV: 50000 } });
    assert.equal(income.retailRate, rate);
    assert.equal(income.channel1, Math.round(50000 * rate));
  }
});

test('a naturally taught customer and later real sales build a six-month base without reselling existing people', () => {
  let state = makeInitialState({ seed: 17 });
  state = { ...state, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...state.milestones, certified: true } };
  for (const event of [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT, EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) state = reduceGame(state, event);
  state = reduceGame(state, EVENTS.CHOOSE_ROUTINE, { planId: 'fit' });
  for (const event of [EVENTS.CLOSE_RECEIPT, EVENTS.START_ONBOARDING, EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW, EVENTS.CUSTOMER_REVIEW_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE]) state = reduceGame(state, event);
  const firstId = state.customers[0].id;
  const firstStartIds = new Set([state.customers[0].personId]);
  const observations = [];
  for (let month = 2; month <= 7; month += 1) {
    state = open(state);
    assert.equal(state.month, month);
    assert.equal(state.stage, STAGES.MANAGEMENT);
    const summary = getRecurringBaseSummary(state);
    observations.push({ ...summary, month });
    assert.ok(state.monthOpeningReport.automaticCount > 0, `month ${month} has continued care producing a real repeat`);
    assert.deepEqual(reload(state).monthOpeningReport, state.monthOpeningReport);
    if (month >= 5) continue; // The last three months use only the existing base.
    for (let lead = 0; lead < 2; lead += 1) {
      const oldIds = new Set(state.prospects.map((person) => person.id));
      state = reduceGame(state, EVENTS.CREATE_LEAD, { source: 'known' });
      const target = state.prospects.find((person) => !oldIds.has(person.id));
      assert.ok(target);
      for (let step = 0; step < 16; step += 1) {
        const targetNow = state.prospects.find((person) => person.id === target.id);
        if (!targetNow || targetNow.journey === 'waiting') break;
        if (state.stage === STAGES.MANAGEMENT_ROUTINE) {
          state = reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: targetNow.fitProducts.length ? 'fit' : 'control' });
        } else if (state.stage !== STAGES.MANAGEMENT) {
          state = reduceGame(state, EVENTS.SCENE_COMPLETE);
        } else {
          const action = getPersonContextAction(state, targetNow, 'prospect');
          assert.ok(action);
          state = reduceGame(state, action.event, action.payload);
        }
      }
      const customer = state.customers.find((person) => person.personId === target.id);
      if (customer) {
        if (!customer.careOnly) firstStartIds.add(customer.personId);
        for (let care = 0; care < 2; care += 1) state = reduceGame(state, EVENTS.CARE_CUSTOMER, { id: customer.id });
      }
    }
  }
  assert.ok(firstStartIds.size > 1 && firstStartIds.size < 7, 'real offers grow the base while retaining refusals or no-purchase choices');
  assert.equal(observations.at(-1).total, firstStartIds.size);
  assert.ok(observations.at(-1).total > observations[0].total);
  assert.equal(state.customers.find((customer) => customer.id === firstId).renewalCount, 6);
  assert.ok(observations.some((summary) => summary.pausedCount > 0), 'some customers pause without erasing their accumulated relationship');
  assert.equal(state.monthStats.sales, 0);
  assert.ok(observations.at(-1).purchasedThisMonth > 0);
  assert.equal(state.settlements['6'].growth.recurringBase, firstStartIds.size);
});

test('a paused member-only buyer can be cared for and return without touching their customer sales after reload', () => {
  let state = campaign({ seed: 2, count: 0, quality: 40 });
  state.team = Array.from({ length: 16 }, (_, index) => ({ id: `direct-${index}`, personId: `direct-person-${index}`, name: `สมาชิก ${index}`, parentId: 'player', active: true, certifiedMonth: 4, confidence: 40, autonomy: 40, teamSkill: 2, specialty: 'builder', customers: 3, trust: 40, adherence: 40, satisfaction: 40, lastSelfUseMonth: 4 }));
  state = open(state);
  const candidates = state.team.filter((member) => getRenewalFollowupEligibility(state, member).available);
  assert.ok(candidates.length);
  let returned = null;
  for (const member of candidates) {
    const beforeChance = getRenewalFollowupEligibility(state, member).chance;
    const cared = reduceGame(state, EVENTS.CARE_CUSTOMER, { id: member.id });
    assert.equal(cared.energy, state.energy - 1);
    assert.ok(getRenewalFollowupEligibility(cared, cared.team.find((row) => row.id === member.id)).chance > beforeChance);
    const next = reduceGame(cared, EVENTS.REORDER_CUSTOMER, { id: member.id });
    if (next.economy.personalXV > cared.economy.personalXV) { returned = { cared, next, id: member.id }; break; }
  }
  assert.ok(returned);
  assert.equal(returned.next.economy.personalXV - returned.cared.economy.personalXV, 7000);
  assert.equal(returned.next.economy.teamXV, returned.cared.economy.teamXV);
  assert.equal(returned.next.team.find((row) => row.id === returned.id).personalXV, returned.cared.team.find((row) => row.id === returned.id).personalXV);
  const loaded = reload(returned.next);
  assert.deepEqual(loaded.economy, returned.next.economy);
  assert.equal(loaded.team.find((row) => row.id === returned.id).personalXV, returned.next.team.find((row) => row.id === returned.id).personalXV);
  assertNoNewOrder(loaded, reduceGame(loaded, EVENTS.REORDER_CUSTOMER, { id: returned.id }));
});

test('Year 2 direct subscriptions contribute to channel 1 once and event support can improve renewal', () => {
  const seed = open(mixedBase());
  let state = { ...seed, month: 12, campaignComplete: true, campaignScore: { locked: true, scoreVersion: V1_SCORE_VERSION }, campaignOutcome: { xgenByMonth12: false } };
  state = reduceGame(state, EVENTS.ENTER_ORGANIZATION);
  for (let month = 13; month <= 18; month += 1) {
    const before = state;
    state = reduceGame(state, EVENTS.END_MONTH);
    assert.ok(state.settlements[String(month)]?.settled);
    const report = state.monthOpeningReport;
    assert.equal(report.month, month);
    assert.equal(report.accountingFinalized, true);
    assert.equal(report.personalXV, report.automaticCount * 7000);
    assert.equal(state.settlements[String(month)].personalXV, report.personalXV);
    assert.equal(state.settlements[String(month)].personalSalesBaht, report.automaticCount * 7490);
    assert.equal(report.transactions.reduce((sum, tx) => sum + tx.incomeDelta, 0), report.incomeDelta);
    assert.deepEqual(reload(state).monthOpeningReport, report);
    assert.equal(getRecurringBaseSummary(state).total, 6);
    assert.deepEqual(reduceGame(reload(before), EVENTS.END_MONTH).monthOpeningReport, report);
  }
  const paused = campaign({ count: 60, quality: 45 });
  paused.month = 15;
  paused.organizationMode = true;
  paused.customers = paused.customers.map((customer) => ({ ...customer, activePlan: false, renewalStatus: 'paused', renewalMonth: 14, lastReorderMonth: 13 }));
  const ordinary = applyAutomaticCustomerCycles(paused, true);
  const supported = applyAutomaticCustomerCycles(paused, true, { retention: .07, comeback: .34 });
  assert.ok(supported.monthOpeningReport.automaticCount > ordinary.monthOpeningReport.automaticCount);
  assert.ok(ordinary.monthOpeningReport.automaticCustomerIds.every((id) => supported.monthOpeningReport.automaticCustomerIds.includes(id)));
});

test('six real offers and two certifications keep identical renewal outcomes through missing-field save migration', () => {
  const initial = makeInitialState({ seed: 148 });
  let state = { ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true }, encounters: { ...initial.encounters, months: [] },
    skills: { ...initial.skills, people: { xp: 150 }, knowledge: { xp: 150 }, care: { xp: 12 }, leadership: { xp: 12 } } };
  for (const [index, name] of ['ลิน', 'กาย', 'แพร', 'ขิม', 'เจน', 'ปอนด์'].entries()) {
    const id = `${String.fromCharCode(97 + index)}-person`;
    // Older qualified prospects need not have review/success flags yet. The
    // real sale path must initialize a finite satisfaction before serialization.
    const prospect = { id, name, journey: 'baseline', consent: true, measured: true, fitProducts: ['gus'], trust: 90, readiness: 95, adherence: 45, followups: 0, lastContactMonth: 4 };
    state = { ...state, stage: STAGES.MANAGEMENT_ROUTINE, prospects: [...state.prospects, prospect], selectedPersonId: id };
    state = reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { id, planId: 'fit' });
    assert.ok(state.customers.some((customer) => customer.personId === id));
    assert.equal(state.economy.lastTransaction.kind, 'sale');
  }
  for (const personId of ['a-person', 'b-person']) {
    const customer = state.customers.find((person) => person.personId === personId);
    state = { ...state, stage: STAGES.MANAGEMENT, customers: state.customers.map((person) => person.id === customer.id ? { ...person, xvisorStage: 'case', candidateProgress: 2, candidateStartedMonth: 3 } : person) };
    state = reduceGame(state, EVENTS.CERTIFY_CANDIDATE, { id: customer.id });
    assert.ok(state.team.some((member) => member.personId === personId));
    state = reduceGame(state, EVENTS.SCENE_COMPLETE);
  }
  state = { ...state, stage: STAGES.MANAGEMENT, customers: state.customers.filter((person) => person.personId !== 'b-person') };
  const closed = close(state);
  assert.ok(closed.customers.every((customer) => Number.isFinite(customer.satisfaction)));
  const direct = reduceGame(closed, EVENTS.START_NEXT_MONTH);
  assert.equal(direct.monthOpeningReport.eligibleCount, 6);
  const loaded = reduceGame(reload(closed), EVENTS.START_NEXT_MONTH);
  assert.deepEqual(loaded.monthOpeningReport, direct.monthOpeningReport);
  assert.deepEqual(loaded.economy, direct.economy);
  for (const unknown of [undefined, null, NaN]) {
    const legacy = { ...closed, customers: closed.customers.map((customer) => ({ ...customer, satisfaction: unknown })) };
    const beforeSave = reduceGame(legacy, EVENTS.START_NEXT_MONTH);
    const afterLoad = reduceGame(reload(legacy), EVENTS.START_NEXT_MONTH);
    assert.deepEqual(afterLoad.monthOpeningReport, beforeSave.monthOpeningReport);
    assert.ok(afterLoad.customers.every((customer) => Number.isFinite(customer.satisfaction)));
  }
});
