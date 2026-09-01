import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  RELEASE_VERSION,
  V1_SCORE_VERSION,
  V1_SAVE_VERSION,
  calculateEconomy,
  getBestNextActions,
  makeInitialState,
  reduceGame,
} from './game-data-v1.js';

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
    career: { ...state.career, xleadCertified: true, xgenQualifiedSingleMonth: xgen, xgenCertified: xgen, xgenCertified1b: xgen, xgenQualificationRule: xgen ? 'single-month' : null },
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

test('XGEN qualifies from 3,000,000 XV in one month and 5% is paid in that same month', () => {
  let state = management(4, 6);
  state = {
    ...state,
    economy: { ...state.economy, personalXV: 1_000_000, teamXV: 2_000_000, productSales: 100_000 },
  };
  const live = calculateEconomy(state);
  assert.equal(live.channel3, 150_000);
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
