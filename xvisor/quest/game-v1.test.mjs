import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  ORGANIZATION_END_MONTH,
  RELEASE_VERSION,
  V1_SAVE_VERSION,
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
    prospects: [{
      id: 'person-ing', personId: 'person-ing', name: 'อิง', journey: 'recommendation',
      routinePlan: { quality: 'fit', id: 'fit' }, trust: 70, readiness: 78, decisionAttempts: 2,
      adherence: 40, followups: 0, satisfaction: 50, activePlan: false,
    }],
  };
  const action = getBestNextActions(state, 8).find((item) => item.event === EVENTS.FAST_TRACK_FULL_START);
  assert.ok(action);
  assert.match(action.label, /อิง/);
  const result = reduceGame(state, EVENTS.FAST_TRACK_FULL_START, { id: 'person-ing' });
  assert.equal(result.energy, 27);
  assert.equal(result.prospects.length, 0);
  assert.equal(result.customers.length, 1);
  assert.equal(result.customers[0].xvisorStage, 'ready');
  assert.equal(result.economy.personalXV, 9_495);
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
