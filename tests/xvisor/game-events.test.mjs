import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS, STAGES, RELEASE_VERSION, GAME_VERSION, V1_SAVE_VERSION, V1_SCORE_VERSION,
  SAVE_KEY, CUSTOMER_STATES, canDispatch, getBestNextActions, makeInitialState,
  parseSavedState, reduceGame, serializeState,
} from '../../xvisor/quest/game-data.js';
import { getStageContent } from '../../xvisor/quest/game-copy.js';

function management(month = 3) {
  const initial = makeInitialState({ seed: 83 });
  return { ...initial, month, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28 };
}

test('The Xircle begins a visible scene before consuming energy or granting rewards', () => {
  const state = management();
  const running = reduceGame(state, EVENTS.RUN_XIRCLE);
  assert.equal(running.stage, STAGES.XIRCLE_RUNNING);
  assert.equal(running.pendingXircle.month, 3);
  assert.ok(running.pendingXircle.startedAt > 0);
  assert.equal(running.energy, state.energy);
  assert.deepEqual(running.skills, state.skills);
  assert.equal(running.monthStats.xircleDone, undefined);
  assert.equal(running.xircleHistory.length, 0);
  const scene = getStageContent(running);
  assert.equal(scene.scene, 'the-xircle');
  assert.equal(scene.status, 'xircle');
  assert.deepEqual(scene.actions, []);
  assert.deepEqual(getBestNextActions(running), []);
});

test('a running The Xircle locks all other actions including month close and exams', () => {
  const running = reduceGame(management(), EVENTS.RUN_XIRCLE);
  for (const event of [EVENTS.RUN_XIRCLE, EVENTS.END_MONTH, EVENTS.START_NEXT_MONTH, EVENTS.CREATE_LEAD, EVENTS.TRAIN_SKILL, EVENTS.XGEN_EXAM]) {
    assert.equal(canDispatch(running, event), false, event);
    assert.equal(reduceGame(running, event, { skill: 'care' }), running, event);
  }
  assert.equal(canDispatch(running, EVENTS.SCENE_COMPLETE), true);
});

test('The Xircle completion grants the existing rewards exactly once', () => {
  const before = management();
  const running = reduceGame(before, EVENTS.RUN_XIRCLE);
  const completed = reduceGame(running, EVENTS.SCENE_COMPLETE);
  assert.equal(completed.stage, STAGES.MANAGEMENT);
  assert.equal(completed.pendingXircle, null);
  assert.equal(completed.energy, before.energy - 2);
  assert.equal(completed.monthStats.xircleDone, true);
  assert.equal(completed.xircleHistory.length, 1);
  assert.equal(completed.xircleMomentum.sourceMonth, 3);
  assert.match(completed.lastMessage, /ได้รับ Momentum/);
  for (const skill of Object.keys(before.skills)) assert.equal(completed.skills[skill].xp, before.skills[skill].xp + 3);
  const repeated = reduceGame(completed, EVENTS.SCENE_COMPLETE);
  assert.deepEqual(repeated.skills, completed.skills);
  assert.equal(repeated.energy, completed.energy);
  assert.deepEqual(repeated.xircleHistory, completed.xircleHistory);
  assert.equal(canDispatch(completed, EVENTS.RUN_XIRCLE), false);
  assert.equal(reduceGame(completed, EVENTS.RUN_XIRCLE), completed);
});

test('The Xircle survives a reload in progress and completes only once after reload', () => {
  const running = reduceGame(management(6), EVENTS.RUN_XIRCLE);
  const restored = parseSavedState(serializeState(running));
  assert.equal(restored.stage, STAGES.XIRCLE_RUNNING);
  assert.deepEqual(restored.pendingXircle, running.pendingXircle);
  assert.equal(canDispatch(restored, EVENTS.SCENE_COMPLETE), true);
  const completed = reduceGame(restored, EVENTS.SCENE_COMPLETE);
  const restoredComplete = parseSavedState(serializeState(completed));
  assert.equal(restoredComplete.pendingXircle, null);
  assert.equal(restoredComplete.xircleHistory.length, 1);
  assert.equal(canDispatch(restoredComplete, EVENTS.RUN_XIRCLE), false);
});

test('The Xircle is unavailable outside its campaign schedule and keeps its low-energy rule', () => {
  assert.equal(canDispatch(management(2), EVENTS.RUN_XIRCLE), false);
  assert.equal(canDispatch({ ...management(3), stage: STAGES.MONTH_CLOSED }, EVENTS.RUN_XIRCLE), false);
  for (const energy of [0, 1]) {
    const state = { ...management(9), energy };
    const completed = reduceGame(reduceGame(state, EVENTS.RUN_XIRCLE), EVENTS.SCENE_COMPLETE);
    assert.equal(completed.energy, 0);
    assert.equal(completed.monthStats.xircleDone, true);
  }
});

test('2.0 changes presentation version while retaining the existing save and score namespace', () => {
  assert.equal(RELEASE_VERSION, '2.0');
  assert.equal(GAME_VERSION, 'X-VISOR QUEST 2.0');
  assert.equal(V1_SAVE_VERSION, '1.0b');
  assert.equal(V1_SCORE_VERSION, '1.0b');
  assert.equal(SAVE_KEY, 'xvisorQuestContinueV4');
  const state = management(12);
  const score = { locked: true, completedMonth: 12, scoreVersion: '1.0b', runId: state.runId, bestTgv: 820000, totalIncome: 42000, bestMonthlyIncome: 23000, organizationSize: 8, completedAt: 1700000000000, xgenByMonth12: false };
  const old = { ...state, releaseVersion: '1.0b', gameVersion: 'X-VISOR QUEST 1.0b', v1SaveVersion: '1.0b', campaignComplete: true, campaignScore: score };
  const restored = parseSavedState(JSON.stringify(old));
  assert.ok(restored);
  assert.equal(restored.releaseVersion, '2.0');
  assert.deepEqual(restored.campaignScore, score);
  assert.equal(restored.runId, state.runId);
});

test('new campaign closures persist honest growth snapshots without changing finances', () => {
  const state = management(2);
  state.customers = [
    { id: 'returning', personId: 'returning', name: 'ผู้ใช้ต่อ', day: 28, activePlan: true, measuredAgain: true, followups: 2, trust: 62, result: 'ดีขึ้น', satisfaction: 50, customerState: CUSTOMER_STATES.READY_TO_BUY },
    { id: 'new', personId: 'new', name: 'ผู้เริ่มใหม่', day: 0, activePlan: true, lastReorderMonth: 2, satisfaction: 50 },
  ];
  state.team = [{ id: 'direct', name: 'ทีมตรง', parentId: 'player', active: true }, { id: 'downstream', name: 'รุ่นถัดไป', parentId: 'direct', active: true }];
  const reordered = reduceGame(state, EVENTS.REORDER_CUSTOMER, { id: 'returning' });
  const closed = reduceGame(reordered, EVENTS.END_MONTH);
  const growth = closed.settlements['2'].growth;
  assert.deepEqual(growth, { activeCustomers: 2, repeatCustomers: 1, repeatTransactions: 1, teamCount: 1, xleadCount: 0, customerScope: 'personal', teamScope: 'direct' });
  assert.equal(closed.settlements['2'].totalIncome, closed.economy.totalIncome);
  assert.deepEqual(parseSavedState(serializeState(closed)).settlements['2'].growth, growth);
});

test('an old partial month cannot fabricate unique repeat customers from transactions', () => {
  const state = management(4);
  state.monthStats = { ...state.monthStats, reorders: 3 };
  state.settlements = { '3': { month: 3, settled: true, totalIncome: 12, currentTGV: 42 } };
  const closed = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(closed.settlements['4'].growth.repeatCustomers, null);
  assert.equal(closed.settlements['4'].growth.repeatTransactions, 3);
  assert.equal(closed.settlements['3'].growth, undefined);
});

test('Year 2 stores corrected monthly reports and organization growth for each closed month', () => {
  const state = management(12);
  state.campaignComplete = true;
  state.career = { ...state.career, xleadCertified: true };
  state.rank = 'xlead';
  state.campaignScore = { locked: true, completedMonth: 12, scoreVersion: '1.0b', runId: state.runId, bestTgv: 100000, totalIncome: 42000, bestMonthlyIncome: 23000, organizationSize: 8, completedAt: 1700000000000, xgenByMonth12: false };
  let current = reduceGame(state, EVENTS.ENTER_ORGANIZATION);
  current = reduceGame(current, EVENTS.END_MONTH);
  current = reduceGame(current, EVENTS.END_MONTH);
  assert.deepEqual(current.organizationReports.map(report => report.month), [13, 14]);
  for (const report of current.organizationReports) {
    const entry = current.settlements[String(report.month)];
    assert.equal(report.income, entry.totalIncome);
    assert.equal(report.tgv, entry.currentTGV);
    assert.deepEqual(entry.growth, { activeCustomers: report.activeCustomers, repeatCustomers: report.repeatCustomers, repeatTransactions: null, teamCount: report.xvisorCount, xleadCount: report.xleadCount, customerScope: 'organization', teamScope: 'organization' });
  }
  const oldReport = current.lastOrganizationReport;
  const legacy = { ...current, organizationReports: undefined };
  const next = reduceGame(legacy, EVENTS.END_MONTH);
  assert.deepEqual(next.organizationReports.map(report => report.month), [14, 15], 'keep the one real report from an old save, without inventing Month 13');
  assert.deepEqual(next.organizationReports[0], oldReport);
});
