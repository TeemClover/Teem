import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  V9_SAVE_VERSION,
  XGEN_ROLLING_TARGET,
  buildPersonAction,
  calculateEconomy,
  getRolling3TGV,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
} from './game-data-v9.js';

function withManagement(state, month = 2) {
  return {
    ...state,
    month,
    stage: 'management',
    phase: 'management',
    energy: 28,
    rank: 'xvisor',
    milestones: { ...state.milestones, certified: true },
  };
}

test('V9 rejects incompatible V8 run saves instead of partial migration', () => {
  const state = makeInitialState({ seed: 1 });
  const old = { ...state };
  delete old.v9SaveVersion;
  assert.equal(parseSavedState(JSON.stringify(old)), null);
  assert.equal(state.v9SaveVersion, V9_SAVE_VERSION);
});

test('current TGV is this month only and ignores historical organization.tgv', () => {
  const state = withManagement(makeInitialState({ seed: 2 }), 5);
  const current = {
    ...state,
    career: { ...state.career, xgenCertified: true },
    economy: { ...state.economy, personalXV: 7_000, teamXV: 14_000 },
    organization: { ...state.organization, tgv: 999_999_999, lastMonthTGV: 500_000 },
  };
  const economy = calculateEconomy(current);
  assert.equal(economy.tgv, 21_000);
  assert.equal(economy.channel3, 1_050);
});

test('rolling XGEN qualification uses latest three months, not lifetime accumulation', () => {
  const state = withManagement(makeInitialState({ seed: 3 }), 4);
  const current = {
    ...state,
    economy: { ...state.economy, personalXV: 1_300_000, teamXV: 0 },
    organization: {
      ...state.organization,
      tgvHistory: [
        { month: 1, tgv: 900_000 },
        { month: 2, tgv: 900_000 },
        { month: 3, tgv: 900_000 },
      ],
    },
  };
  assert.equal(getRolling3TGV(current), 3_100_000);
  assert.ok(getRolling3TGV(current) >= XGEN_ROLLING_TARGET);
});

test('XGEN qualification unlocks exam once and certification persists', () => {
  const state = withManagement(makeInitialState({ seed: 4 }), 4);
  const qualified = {
    ...state,
    economy: { ...state.economy, personalXV: 1_200_000, teamXV: 0 },
    organization: {
      ...state.organization,
      tgvHistory: [
        { month: 2, tgv: 900_000 },
        { month: 3, tgv: 900_000 },
      ],
    },
  };
  const certified = reduceGame(qualified, EVENTS.XGEN_EXAM);
  assert.equal(certified.career.xgenQualified, true);
  assert.equal(certified.career.xgenCertified, true);
  assert.equal(certified.rank, 'xgen');
});

test('person recommendation action always names the person and uses แฟ้ม X', () => {
  const state = withManagement(makeInitialState({ seed: 5 }), 2);
  const target = { id: 'p-ing', name: 'อิง', status: 'พร้อมคุย' };
  const action = buildPersonAction({ event: EVENTS.OFFER_PROSPECT, target, state });
  assert.equal(action.label, '📁 นัดคุยแฟ้ม X กับ อิง');
  assert.equal(action.targetName, 'อิง');
});

test('Organization Mode enters explicitly, survives serialization, and advances after refresh', () => {
  const base = withManagement(makeInitialState({ seed: 6 }), 12);
  const campaign = {
    ...base,
    campaignComplete: true,
    campaignScore: {
      locked: true,
      completedMonth: 12,
      bestTgv: 1_500_000,
      totalIncome: 500_000,
      bestMonthlyIncome: 90_000,
      organizationSize: 45,
      scoreVersion: 'v9-pre-release-1',
      runId: base.runId,
    },
    organization: {
      ...base.organization,
      lastMonthTGV: 1_300_000,
      bestTGV: 1_500_000,
      aggregate: { activeCustomers: 180, xvisorCount: 24, xleadCount: 3, candidateCount: 4, overflowPeople: 0 },
      tgvHistory: [
        { month: 10, tgv: 1_000_000 },
        { month: 11, tgv: 1_150_000 },
        { month: 12, tgv: 1_300_000 },
      ],
    },
  };
  const month13 = reduceGame(campaign, EVENTS.ENTER_ORGANIZATION);
  assert.equal(month13.organizationMode, true);
  assert.equal(month13.month, 13);
  assert.equal(month13.energy, 0);

  const restored = parseSavedState(serializeState(month13));
  assert.ok(restored);
  assert.equal(restored.organizationMode, true);
  assert.equal(restored.month, 13);

  const month14 = reduceGame(restored, EVENTS.END_MONTH);
  assert.equal(month14.organizationMode, true);
  assert.equal(month14.month, 14);
  assert.equal(month14.energy, 0);
  assert.equal(campaign.campaignScore.bestTgv, month14.campaignScore.bestTgv);
});
