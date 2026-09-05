import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  RELEASE_VERSION,
  V1_SCORE_VERSION,
  V1_SAVE_VERSION,
  calculateEconomy,
  canDispatch,
  getBestNextActions,
  makeInitialState,
  parseSavedState,
  reduceGame,
} from './game-data.js';

function management(seed = 1, month = 1) {
  const state = makeInitialState({ seed });
  return {
    ...state,
    month,
    phase: 'management',
    stage: 'management',
    rank: 'xvisor',
    energy: 28,
    milestones: { ...state.milestones, certified: true },
  };
}

function campaignReady({ seed = 20, xgen = false } = {}) {
  const state = management(seed, 12);
  return {
    ...state,
    campaignComplete: true,
    career: { ...state.career, xleadCertified: true, xgenQualifiedSingleMonth: xgen, xgenCertified: xgen, xgenCertified1b: xgen, xgenExamPassed: xgen, xgenQualificationRule: xgen ? 'single-month' : null },
    rank: xgen ? 'xgen' : 'xlead',
    campaignOutcome: { xgenByMonth12: xgen },
    campaignScore: {
      locked: true,
      completedMonth: 12,
      bestTgv: xgen ? 3_050_000 : 1_250_000,
      totalIncome: 420_000,
      bestMonthlyIncome: 110_000,
      organizationSize: 2,
      scoreVersion: V1_SCORE_VERSION,
      runId: state.runId,
      completedAt: 1,
      xgenByMonth12: xgen,
    },
  };
}

test('1.0b version is explicit and score namespace is reset', () => {
  assert.equal(RELEASE_VERSION, '1.0b');
  assert.equal(V1_SAVE_VERSION, '1.0b');
  assert.equal(V1_SCORE_VERSION, '1.0b');
});

test('channel 1 tier uses monthly sales baht while payout uses all personal XV', () => {
  const base = management(2);
  const at20 = calculateEconomy({ ...base, economy: { ...base.economy, personalXV: 50_000, productSales: 39_999 } });
  const at23 = calculateEconomy({ ...base, economy: { ...base.economy, personalXV: 50_000, productSales: 40_000 } });
  const at25 = calculateEconomy({ ...base, economy: { ...base.economy, personalXV: 50_000, productSales: 100_000 } });
  assert.equal(at20.retailRate, 0.20);
  assert.equal(at20.channel1, 10_000);
  assert.equal(at23.retailRate, 0.23);
  assert.equal(at23.channel1, 11_500);
  assert.equal(at25.retailRate, 0.25);
  assert.equal(at25.channel1, 12_500);
});

test('channel 2 is 20% of each Direct G1 commission using that persons baht tier and XV payout base', () => {
  const base = management(3);
  const state = {
    ...base,
    rank: 'xlead',
    career: { ...base.career, xleadCertified: true },
    team: [{ id: 'g1-a', name: 'A', parentId: 'player', active: true, personalSalesBaht: 50_000, personalXV: 70_000 }],
  };
  const economy = calculateEconomy(state);
  assert.equal(economy.directG1[0].tier.rate, 0.23);
  assert.equal(economy.directG1[0].commission, 16_100);
  assert.equal(economy.channel2, 3_220);
});

test('legacy rolling-3 XGEN flags never unlock 5% or an exam below 3M current-month TGV', () => {
  const base = management(31, 10);
  const ghost = {
    ...base,
    rank: 'xlead',
    energy: 0,
    career: { ...base.career, xleadCertified: true, xgenQualified: true, xgenCertified: false, xgenQualificationRule: null },
    sceneReport: { kind: 'xgen-qualified', rolling3TGV: 3_200_000 },
    economy: { ...base.economy, personalXV: 381_590, teamXV: 1_300_000, productSales: 120_000 },
  };
  const economy = calculateEconomy(ghost);
  assert.equal(economy.tgv, 1_681_590);
  assert.equal(economy.channel3, 0);
  const actions = getBestNextActions(ghost, 3);
  assert.equal(actions.some((item) => item.event === EVENTS.XGEN_EXAM), false);
  assert.equal(actions[0].event, EVENTS.END_MONTH);

  const closed = reduceGame(ghost, EVENTS.END_MONTH);
  assert.equal(closed.stage, 'month_closed');
  assert.equal(closed.month, 10);
  assert.equal(closed.settlements['10'].currentTGV, 1_681_590);
  assert.equal(closed.career.xgenQualifiedSingleMonth, false);
});

test('a saved rolling-XGEN milestone is recovered to a playable Month 10 without losing progress', () => {
  const base = management(32, 10);
  const stuck = {
    ...base,
    stage: 'xgen_milestone',
    rank: 'xlead',
    energy: 0,
    career: { ...base.career, xleadCertified: true, xgenQualified: true, xgenCertified: false, xgenQualificationRule: null },
    sceneReport: { kind: 'xgen-qualified', rolling3TGV: 3_200_000 },
    economy: { ...base.economy, personalXV: 381_590, teamXV: 1_431_475, productSales: 120_000 },
  };
  const recovered = parseSavedState(JSON.stringify(stuck));
  assert.equal(recovered.stage, 'management');
  assert.equal(recovered.month, 10);
  assert.equal(calculateEconomy(recovered).tgv, 1_813_065);
  assert.equal(canDispatch(recovered, EVENTS.END_MONTH), true);

  const closed = reduceGame(recovered, EVENTS.END_MONTH);
  assert.equal(closed.stage, 'month_closed');
  assert.equal(closed.settlements['10'].currentTGV, 1_813_065);
});

test('an already-settled ghost XGEN month resumes at Month 11 without settling twice', () => {
  const base = management(33, 10);
  const settlement = { month: 10, currentTGV: 1_813_065, tgv: 1_813_065, totalIncome: 53_949, total: 53_949, settled: true };
  const stuck = {
    ...base,
    stage: 'xgen_milestone',
    rank: 'xlead',
    energy: 0,
    career: { ...base.career, xleadCertified: true, xgenQualified: true, xgenCertified: false, xgenQualificationRule: null },
    sceneReport: { kind: 'xgen-qualified', rolling3TGV: 3_200_000 },
    economy: { ...base.economy, personalXV: 381_590, teamXV: 1_431_475, productSales: 120_000, totalIncome: 205_967, receivedIncome: 205_967 },
    settlements: { ...base.settlements, '10': settlement },
  };
  const recovered = parseSavedState(JSON.stringify(stuck));
  assert.equal(recovered.stage, 'month_closed');
  const actions = getBestNextActions(recovered, 3);
  assert.equal(actions[0].event, EVENTS.START_NEXT_MONTH);
  assert.equal(canDispatch(recovered, EVENTS.START_NEXT_MONTH), true);

  const next = reduceGame(recovered, EVENTS.START_NEXT_MONTH);
  assert.equal(next.month, 11);
  assert.equal(next.stage, 'management');
  assert.equal(next.economy.totalIncome, 205_967);
  assert.equal(Object.keys(next.settlements).filter((month) => month === '10').length, 1);
});

test('XGEN qualifies from 3,000,000 XV in one month and requires the live release manual exam before paying 5%', () => {
  let state = management(4, 6);
  state = {
    ...state,
    economy: { ...state.economy, personalXV: 1_000_000, teamXV: 2_000_000, productSales: 100_000 },
  };
  const live = calculateEconomy(state);
  assert.equal(live.channel3, 0);
  assert.equal(getBestNextActions(state, 8)[0].event, EVENTS.XGEN_EXAM);
  const waiting = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(waiting.stage, 'management');
  assert.equal(waiting.settlements['6'], undefined);
  state = reduceGame(waiting, EVENTS.XGEN_EXAM);
  assert.equal(state.career.xgenExamPassed, true);
  assert.equal(calculateEconomy(state).channel3, 150_000);
  state = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(state.career.xgenQualifiedSingleMonth, true);
  assert.equal(state.career.xgenQualificationRule, 'single-month');
  assert.equal(state.settlements['6'].channel3, 150_000);
});

test('Year 2 branches by whether XGEN was reached by Month 12', () => {
  const xlead = reduceGame(campaignReady({ seed: 5, xgen: false }), EVENTS.ENTER_ORGANIZATION);
  const xgen = reduceGame(campaignReady({ seed: 6, xgen: true }), EVENTS.ENTER_ORGANIZATION);
  assert.equal(xlead.year2Path, 'xlead');
  assert.equal(xgen.year2Path, 'xgen');
  assert.equal(xlead.organization.trips.length, 0);
  assert.equal(xgen.rank, 'xgen');
});

test('XGEN Year 2 recognition trips are fixed to Month 16 and Month 22', () => {
  let state = reduceGame(campaignReady({ seed: 7, xgen: true }), EVENTS.ENTER_ORGANIZATION);
  while (!state.runComplete && state.month <= 22) state = reduceGame(state, EVENTS.END_MONTH);
  assert.deepEqual(state.organization.trips.map((trip) => trip.month), [16, 22]);
  assert.equal(new Set(state.organization.trips.map((trip) => trip.destination)).size, 2);
});

test('XLEAD Year 2 has no Organization 5% and no recognition trip', () => {
  let state = reduceGame(campaignReady({ seed: 8, xgen: false }), EVENTS.ENTER_ORGANIZATION);
  state = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(state.lastOrganizationReport.year2Path, 'xlead');
  assert.equal(state.lastOrganizationReport.incomeBreakdown.channel3, 0);
  assert.equal(state.organization.trips.length, 0);
});

test('NEW GAME+ always returns to playable Month 1 management with actions', () => {
  const finished = { ...campaignReady({ seed: 9, xgen: true }), runComplete: true, organizationMode: true, month: 24, twoYearSummary: {} };
  const ng = reduceGame(finished, EVENTS.NEW_GAME_PLUS);
  assert.equal(ng.runMode, 'NEW_GAME_PLUS');
  assert.equal(ng.month, 1);
  assert.equal(ng.stage, 'management');
  assert.equal(ng.energy, 28);
  assert.equal(ng.customers.length, 0);
  assert.equal(ng.team.length, 0);
  assert.ok(getBestNextActions(ng, 3).length > 0);
});

test('Month 12 enters Year 2, Month 24 hard-stops, and the finale can start NEW GAME+', () => {
  let state = reduceGame(campaignReady({ seed: 10, xgen: true }), EVENTS.ENTER_ORGANIZATION);
  assert.equal(state.organizationMode, true);
  assert.equal(state.month, 13);

  while (!state.runComplete) state = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(state.month, 24);
  assert.equal(state.runComplete, true);
  assert.equal(state.twoYearSummary.year2Path, 'xgen');

  const next = reduceGame(state, EVENTS.NEW_GAME_PLUS);
  assert.equal(next.runMode, 'NEW_GAME_PLUS');
  assert.equal(next.month, 1);
  assert.ok(getBestNextActions(next, 3).length > 0);
});
