import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  ORGANIZATION_END_MONTH,
  RELEASE_VERSION,
  V1_SAVE_VERSION,
  canDispatch,
  getCurrentExamQuestion,
  getBestNextActions,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
} from './game-data-v1.js';
import { makeTeamMember } from './game-progression-v8.js';
import { createPerson } from './game-people.js';

function management(state, month = 12) {
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

function withCoreTeam(seed = 11) {
  let state = management(makeInitialState({ seed }), 12);
  const member = makeTeamMember({
    id: 'person-jen', personId: 'person-jen', name: 'เจน', source: 'known', appearance: {},
  }, state, { id: 'member-jen', parentId: 'player', generation: 1 });
  const teamMember = {
    ...member,
    active: true,
    certifiedMonth: 3,
    customers: 8,
    confidence: 72,
    autonomy: 68,
    teamSkill: 5,
    candidatePipeline: 3,
    leaderReadiness: 55,
  };
  return {
    ...state,
    team: [teamMember],
    customers: [{
      id: 'customer-mei', personId: 'person-mei', name: 'เมย์', activePlan: true,
      satisfaction: 86, selfDirected: true, day: 28, followups: 3, adherence: 88,
    }],
    career: { ...state.career, xleadCertified: true, xgenCertified: true },
    rank: 'xgen',
    campaignComplete: true,
    campaignScore: {
      locked: true,
      completedMonth: 12,
      bestTgv: 1_500_000,
      totalIncome: 500_000,
      bestMonthlyIncome: 90_000,
      organizationSize: 1,
      scoreVersion: '1.0',
      runId: state.runId,
      completedAt: Date.now(),
    },
  };
}

function withOrganizationFoundation(seed = 11) {
  let state = management(makeInitialState({ seed }), 12);
  state = {
    ...state,
    rank: 'xgen',
    career: { ...state.career, xleadCertified: true, xgenCertified: true },
    customers: Array.from({ length: 36 }, (_, index) => ({
      id: `customer-${index}`,
      personId: `customer-person-${index}`,
      name: `ลูกค้า ${index}`,
      activePlan: true,
      satisfaction: 70 + (index % 20),
      adherence: 72 + (index % 16),
      successCase: true,
      result: 'ดีขึ้น',
    })),
  };
  const team = Array.from({ length: 8 }, (_, index) => ({
    ...makeTeamMember({
      id: `person-${index}`,
      personId: `person-${index}`,
      name: `สมาชิก ${index}`,
      appearance: {},
    }, state, {
      id: `member-${index}`,
      parentId: index < 4 ? 'player' : `member-${index % 4}`,
      generation: index < 4 ? 1 : 2,
    }),
    active: true,
    certifiedMonth: Math.max(2, 8 - index),
    customers: 4 + (index % 5),
    pausedCustomers: index % 3,
    candidatePipeline: index % 5,
    confidence: 62 + (index % 20),
    autonomy: 55 + (index % 20),
    teamSkill: 3 + (index % 5),
    leaderReadiness: 45 + (index % 30),
    rank: index === 0 ? 'xlead' : 'xvisor',
  }));
  return {
    ...state,
    team,
    campaignComplete: true,
    campaignScore: {
      locked: true,
      completedMonth: 12,
      bestTgv: 350_000,
      totalIncome: 500_000,
      bestMonthlyIncome: 90_000,
      organizationSize: team.length,
      scoreVersion: '1.0',
      runId: state.runId,
      completedAt: 1,
    },
    organization: { ...state.organization, bestTGV: 350_000, lastMonthTGV: 350_000 },
  };
}

function legalMove(state, event, payload) {
  assert.equal(canDispatch(state, event), true, `${event} must be legal at ${state.stage}`);
  const next = reduceGame(state, event, payload);
  assert.notEqual(next, state, `${event} must advance state`);
  return next;
}

function certifyLegally(seed = 901) {
  let state = makeInitialState({ seed });
  for (const event of [
    EVENTS.START_PATH,
    EVENTS.WEAR_BAND,
    EVENTS.START_SELF_SCALE,
    EVENTS.SELF_SCAN_COMPLETE,
    EVENTS.START_MONTAGE,
    EVENTS.MONTAGE_COMPLETE,
    EVENTS.START_MONTAGE,
    EVENTS.MONTAGE_COMPLETE,
  ]) state = legalMove(state, event);
  state = legalMove(state, EVENTS.SELECT_PRACTICE, { answer: 'context' });
  for (const event of [
    EVENTS.SUBMIT_PRACTICE,
    EVENTS.CONTINUE_PRACTICE,
    EVENTS.MONTAGE_COMPLETE,
    EVENTS.START_DAY14_SCALE,
    EVENTS.DAY14_SCAN_COMPLETE,
    EVENTS.START_MONTAGE,
    EVENTS.MONTAGE_COMPLETE,
  ]) state = legalMove(state, event);
  state = legalMove(state, EVENTS.SELECT_PRACTICE, { answer: 'ask_context' });
  for (const event of [
    EVENTS.SUBMIT_PRACTICE,
    EVENTS.CONTINUE_PRACTICE,
    EVENTS.MONTAGE_COMPLETE,
    EVENTS.START_DAY28_SCALE,
    EVENTS.DAY28_SCAN_COMPLETE,
    EVENTS.GO_EXAM,
    EVENTS.EXAM_TRANSIT_COMPLETE,
  ]) state = legalMove(state, event);
  for (let index = 0; index < 5; index += 1) {
    const question = getCurrentExamQuestion(state);
    state = legalMove(state, EVENTS.SELECT_EXAM, { answer: question.correct });
    state = legalMove(state, EVENTS.SUBMIT_EXAM);
    state = legalMove(state, EVENTS.NEXT_EXAM);
  }
  state = legalMove(state, EVENTS.COMPLETE_CERTIFICATION);
  return legalMove(state, EVENTS.CEREMONY_COMPLETE);
}

test('1.0 rejects pre-release saves and round-trips its own save', () => {
  const state = makeInitialState({ seed: 1 });
  assert.equal(state.releaseVersion, RELEASE_VERSION);
  assert.equal(state.v1SaveVersion, V1_SAVE_VERSION);
  const old = JSON.parse(serializeState(state));
  delete old.releaseVersion;
  delete old.v1SaveVersion;
  assert.equal(parseSavedState(JSON.stringify(old)), null);
  const restored = parseSavedState(serializeState(state));
  assert.ok(restored);
  assert.equal(restored.releaseVersion, '1.0');
  const score = { locked: true, bestTgv: 777_000, totalIncome: 123_456, runId: state.runId, scoreVersion: '1.0' };
  const legacyCompatible = JSON.parse(serializeState({ ...state, campaignScore: score }));
  delete legacyCompatible.organization.trips;
  delete legacyCompatible.organization.cultureScore;
  const backfilled = parseSavedState(JSON.stringify(legacyCompatible));
  assert.deepEqual(backfilled.campaignScore, score);
  assert.deepEqual(backfilled.organization.trips, []);
  assert.equal(backfilled.organization.cultureScore, 58);
});

test('true legal run still reaches certification and completes Month 1–12 without bypassing dispatch rules', () => {
  let state = legalMove(certifyLegally(), EVENTS.START_MONTH_1);
  for (const event of [
    EVENTS.FIND_PERSON,
    EVENTS.TALK,
    EVENTS.REQUEST_CONSENT,
    EVENTS.START_CUSTOMER_BASELINE,
    EVENTS.CUSTOMER_BASELINE_COMPLETE,
    EVENTS.OPEN_ROUTINE_BUILDER,
  ]) state = legalMove(state, event);
  state = legalMove(state, EVENTS.CHOOSE_ROUTINE, { planId: 'fit' });
  for (const event of [
    EVENTS.MAKE_OFFER,
    EVENTS.CLOSE_RECEIPT,
    EVENTS.START_ONBOARDING,
    EVENTS.FOLLOW_UP_CUSTOMER,
    EVENTS.START_CUSTOMER_REVIEW,
    EVENTS.CUSTOMER_REVIEW_COMPLETE,
    EVENTS.SAVE_SUCCESS,
    EVENTS.CONTINUE_CARE,
  ]) state = legalMove(state, event);
  for (let month = 1; month <= 12; month += 1) {
    state = legalMove(state, EVENTS.END_MONTH);
    if (month < 12) state = legalMove(state, EVENTS.START_NEXT_MONTH);
  }
  assert.equal(state.campaignComplete, true);
  assert.equal(state.campaignScore.locked, true);
  assert.equal(state.campaignScore.completedMonth, 12);
});

test('Year 2 is one-click and TGV comes from transactions, not previousTGV compounding', () => {
  const campaign = withCoreTeam(2);
  campaign.organization = { ...campaign.organization, lastMonthTGV: 999_999_999, bestTGV: 999_999_999 };
  const month13 = reduceGame(campaign, EVENTS.ENTER_ORGANIZATION);
  assert.equal(month13.organizationMode, true);
  assert.equal(month13.month, 13);
  assert.equal(month13.economy.personalXV, 0);
  assert.equal(month13.economy.teamXV, 0);
  const year2Actions = getBestNextActions(month13, 3);
  assert.equal(year2Actions.length, 1);
  assert.equal(year2Actions[0].label, '▶ ผ่านไปอีก 1 เดือน');
  const month14 = reduceGame(month13, EVENTS.END_MONTH);
  const report = month14.lastOrganizationReport;
  assert.equal(report.month, 13);
  assert.equal(report.activities.xcademy, 4);
  assert.equal(report.activities.openHouse, 1);
  assert.equal(report.activities.xircle, 0);
  assert.ok(report.tgv > 0);
  assert.ok(report.tgv < 100_000_000);
  assert.equal(month14.settlements['13'].tgv, report.tgv);
  assert.equal(month14.month, 14);
});

test('Organization Year auto-runs The Xircle only on 15/18/21/24', () => {
  let state = reduceGame(withCoreTeam(3), EVENTS.ENTER_ORGANIZATION);
  state = { ...state, month: 15 };
  const next = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(next.lastOrganizationReport.activities.xcademy, 4);
  assert.equal(next.lastOrganizationReport.activities.openHouse, 1);
  assert.equal(next.lastOrganizationReport.activities.xircle, 1);
});

test('Month 24 hard-stops the run and NEW GAME+ starts free management at Month 1', () => {
  let state = reduceGame(withCoreTeam(4), EVENTS.ENTER_ORGANIZATION);
  state = { ...state, month: ORGANIZATION_END_MONTH };
  const done = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(done.runComplete, true);
  assert.equal(done.month, 24);
  assert.equal(done.twoYearSummary.month24TGV, done.settlements['24'].tgv);
  const actions = getBestNextActions(done, 3);
  assert.equal(actions[0].event, EVENTS.NEW_GAME_PLUS);
  const ng = reduceGame(done, EVENTS.NEW_GAME_PLUS);
  assert.equal(ng.runMode, 'NEW_GAME_PLUS');
  assert.equal(ng.month, 1);
  assert.equal(ng.stage, 'management');
  assert.equal(ng.energy, 28);
  assert.equal(ng.rank, 'xvisor');
  assert.equal(ng.team.length, 0);
  assert.equal(ng.customers.length, 0);
  assert.equal(ng.campaignScore, null);
});

test('high-skill Full Start fast track appears and can skip directly to Xcademy readiness', () => {
  let state = management(makeInitialState({ seed: 5 }), 5);
  state = {
    ...state,
    skills: {
      ...state.skills,
      people: { xp: 42 },
      knowledge: { xp: 33 },
    },
    career: { ...state.career, totalSuccessCases: 3 },
    prospects: [{
      id: 'person-ing', personId: 'person-ing', name: 'อิง', journey: 'baseline',
      fitProducts: ['gus'], trust: 70, readiness: 78, decisionAttempts: 2,
      adherence: 40, followups: 0, satisfaction: 50, activePlan: false,
    }],
  };
  state = reduceGame(state, EVENTS.OPEN_MANAGEMENT_ROUTINE, { id: 'person-ing' });
  assert.equal(state.stage, 'management_routine');
  state = reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
  assert.equal(state.prospects[0].routinePlan.fastLane, true);
  const action = getBestNextActions(state, 8).find((item) => item.event === EVENTS.FAST_TRACK_FULL_START);
  assert.ok(action);
  assert.match(action.label, /อิง/);
  const result = reduceGame(state, EVENTS.FAST_TRACK_FULL_START, { id: 'person-ing' });
  assert.equal(result.energy, 27);
  assert.equal(result.prospects.length, 0);
  assert.equal(result.customers.length, 1);
  assert.equal(result.customers[0].xvisorStage, 'ready');
  assert.equal(result.customers[0].fullSetFastLane, true);
  assert.equal(result.economy.personalXV, 9_495);
});

test('ครบชุด stays a bad fit when capability or readiness is insufficient', () => {
  let state = management(makeInitialState({ seed: 55 }), 3);
  state = {
    ...state,
    prospects: [{ id: 'person-weak', personId: 'person-weak', name: 'นิว', journey: 'baseline', trust: 38, readiness: 42, fitProducts: ['gus'] }],
    selectedPersonId: 'person-weak',
    stage: 'management_routine',
  };
  state = reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
  assert.equal(state.lastEvent, 'ROUTINE_TOO_MUCH');
  assert.equal(state.prospects[0].routinePlan.quality, 'poor');
  assert.equal(getBestNextActions(state, 8).some((item) => item.event === EVENTS.FAST_TRACK_FULL_START), false);
});

test('500-seed Year 2 pacing has real churn, attrition, variance, unique trips and a Month 24 hard stop', () => {
  const ratios = [];
  const endings = new Set();
  let runsWithDips = 0;
  let runsWithAttrition = 0;
  let runsWithComebacks = 0;
  for (let seed = 1; seed <= 500; seed += 1) {
    let state = reduceGame(withOrganizationFoundation(seed), EVENTS.ENTER_ORGANIZATION);
    const reports = [];
    while (!state.runComplete) {
      state = reduceGame(state, EVENTS.END_MONTH);
      reports.push(state.lastOrganizationReport);
    }
    assert.equal(reports.length, 12);
    assert.equal(state.month, 24);
    assert.equal(state.runComplete, true);
    assert.deepEqual(reports.filter((report) => report.activities.xircle).map((report) => report.month), [15, 18, 21, 24]);
    assert.ok(reports.every((report) => report.activities.xcademy === 4 && report.activities.openHouse === 1));
    assert.ok(reports.reduce((sum, report) => sum + report.churnedCustomers, 0) > 0);
    if (reports.some((report) => report.pausedMembers + report.quitMembers > 0)) runsWithAttrition += 1;
    if (reports.some((report) => report.comebackMembers > 0)) runsWithComebacks += 1;
    const tgvs = reports.map((report) => report.tgv);
    if (tgvs.slice(1).some((tgv, index) => tgv < tgvs[index])) runsWithDips += 1;
    ratios.push(tgvs.at(-1) / Math.max(1, tgvs[0]));
    endings.add(tgvs.at(-1));
    assert.equal(state.organization.trips.length, 2);
    assert.equal(new Set(state.organization.trips.map((trip) => trip.destination)).size, 2);
    assert.deepEqual(state.twoYearSummary.options, ['scoreboard', 'new-game-plus', 'new-run']);
    assert.ok(state.twoYearSummary.bestTGV >= Math.max(...tgvs));
    assert.ok(state.twoYearSummary.total24Income >= state.twoYearSummary.bestMonthIncome);
  }
  ratios.sort((a, b) => a - b);
  assert.ok(ratios[Math.floor(ratios.length / 2)] > 1.15);
  assert.ok(ratios[Math.floor(ratios.length * 0.95)] < 3.5);
  assert.ok(runsWithDips >= 450);
  assert.ok(runsWithAttrition >= 450);
  assert.ok(runsWithComebacks >= 350);
  assert.ok(endings.size >= 150, `expected broad variance, got ${endings.size} distinct Month 24 TGV results`);
});

test('expanded name pool can generate 200 people without visible duplicate names', () => {
  let seed = 7;
  let usedNames = [];
  const names = [];
  for (let index = 1; index <= 200; index += 1) {
    const created = createPerson({ seed, usedNames, source: 'known', index });
    seed = created.nextSeed;
    names.push(created.person.name);
    usedNames = [...usedNames, created.person.name];
  }
  assert.equal(new Set(names).size, 200);
});
