import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOMER_STATES, EVENTS, STAGES, makeInitialState, reduceGame, serializeState, parseSavedState,
  getCustomerRenewalView, getPersonContextAction, buildPersonAction, getBestNextActions,
  getRenewalFollowupEligibility
} from '../../xvisor/quest/game-data.js';
import { isActionAvailable, normalizeAction } from '../../xvisor/quest/game-actions.js';
import { getStageContent } from '../../xvisor/quest/game-copy.js';
import { getStoryBeat } from '../../xvisor/quest/game-story.js';

function management(month = 3, overrides = {}) {
  return {
    ...makeInitialState({ seed: 37 }), month, stage: STAGES.MANAGEMENT,
    phase: 'management', rank: 'xvisor', energy: 28, ...overrides
  };
}

const openingReport = {
  month: 3, eligibleCount: 6,
  automaticCustomerIds: ['auto-1', 'auto-2', 'auto-3'],
  followUpCustomerIds: ['pending-1', 'pending-2'], pausedCustomerIds: ['paused-1'],
  incomeDelta: 1200
};

function customer(id, overrides = {}) {
  return {
    id, personId: id, name: `คน${id}`, activePlan: true, careOnly: false,
    day: 28, followups: 0, measuredAgain: false, trust: 40, adherence: 40,
    satisfaction: 40, result: 'หลุด', selfDirected: true,
    customerState: CUSTOMER_STATES.AUTO_REORDER, lastReorderMonth: 2,
    renewalMonth: 3, renewalStatus: 'pending', ...overrides
  };
}

test('pending and paused customers stay actionable through the same selector and reducer despite old day/self-directed gates', () => {
  for (const renewalStatus of ['pending', 'paused']) {
    const person = customer(renewalStatus, { renewalStatus, activePlan: renewalStatus !== 'paused' });
    const state = management(3, { customers: [person] });
    const eligibility = getRenewalFollowupEligibility(state, person);
    assert.equal(eligibility.available, true, renewalStatus);
    assert.equal(getCustomerRenewalView(state, person).available, true);
    const contextAction = getPersonContextAction(state, person, 'customer');
    assert.equal(contextAction?.event, EVENTS.REORDER_CUSTOMER);
    assert.match(contextAction.label, new RegExp(`คุยแฟ้ม X กับ ${person.name}`));
    assert.equal(isActionAvailable(state, contextAction), true);
    assert.equal(buildPersonAction({ event: EVENTS.REORDER_CUSTOMER, target: person, state }).label, contextAction.label);
    const quick = getBestNextActions(state, 100).find(item => item.event === EVENTS.REORDER_CUSTOMER && item.targetId === person.id);
    assert.ok(quick, `${renewalStatus} appears in XOS`);
    assert.equal(quick.label, contextAction.label);
    const stageChoice = getStageContent(state).actions.find(item => item.event === EVENTS.REORDER_CUSTOMER);
    assert.ok(stageChoice, `${renewalStatus} has a playable quick choice`);
    assert.equal(stageChoice.label, contextAction.label);
    const after = reduceGame(state, contextAction.event, normalizeAction(contextAction));
    const afterPerson = after.customers.find(item => item.id === person.id);
    assert.equal(after.energy, state.energy - eligibility.cost);
    assert.equal(afterPerson.lastRenewalFollowUpMonth, state.month);
    assert.equal(isActionAvailable(after, contextAction), false, 'one renewal decision per month');
  }
});

test('automatic renewals and an already followed-up pause never offer another reorder', () => {
  for (const person of [
    customer('automatic', { renewalStatus: 'automatic', lastReorderMonth: 3 }),
    customer('tried', { renewalStatus: 'paused', lastRenewalFollowUpMonth: 3 })
  ]) {
    const state = management(3, { customers: [person] });
    assert.equal(isActionAvailable(state, { event: EVENTS.REORDER_CUSTOMER, id: person.id, cost: 1 }), false);
    assert.equal(isActionAvailable(state, { event: EVENTS.CARE_CUSTOMER, id: person.id, cost: 1 }), false);
    assert.notEqual(getPersonContextAction(state, person, 'customer')?.event, EVENTS.REORDER_CUSTOMER);
    assert.equal(getBestNextActions(state, 100).some(item => item.event === EVENTS.REORDER_CUSTOMER), false);
    const view = getCustomerRenewalView(state, person);
    assert.equal(view.available, false);
    assert.match(view.detail, person.renewalStatus === 'automatic' ? /ไม่ต้องตามซื้อซ้ำ/ : /เดือน 4/);
  }
});

test('legacy reorder buttons share reducer guards for a paid month, duplicate identity and team membership', () => {
  const person = customer('legacy', {
    renewalStatus: undefined, renewalMonth: undefined, selfDirected: false,
    customerState: CUSTOMER_STATES.READY_TO_BUY, measuredAgain: true, followups: 3, trust: 80, result: 'ดีขึ้น'
  });
  const action = { event: EVENTS.REORDER_CUSTOMER, id: person.id, cost: 1 };
  assert.equal(isActionAvailable(management(3, { customers: [person] }), action), true);
  const cases = [
    management(3, { customers: [{ ...person, lastReorderMonth: 3 }] }),
    management(3, { customers: [person], monthStats: { ...management().monthStats, reorderedCustomerIds: [person.personId] } }),
    management(3, { customers: [person, { ...person, id: 'duplicate', lastReorderMonth: 3 }] }),
    management(3, { customers: [person], team: [{ id: 'teammate', personId: person.personId, name: person.name, active: true }] })
  ];
  for (const state of cases) {
    assert.equal(isActionAvailable(state, action), false);
    assert.notEqual(getPersonContextAction(state, state.customers[0], 'customer')?.event, EVENTS.REORDER_CUSTOMER);
    const after = reduceGame(state, action.event, { id: person.id });
    assert.equal(after.energy, state.energy);
    assert.equal(after.economy.personalXV, state.economy.personalXV);
  }
});

test('relationship care before a pending renewal is available at Day 28 and preserves the later decision', () => {
  const person = customer('care');
  const state = management(3, { customers: [person] });
  const action = { event: EVENTS.CARE_CUSTOMER, id: person.id, cost: 1 };
  assert.equal(isActionAvailable(state, action), true);
  const after = reduceGame(state, action.event, { id: person.id });
  assert.equal(after.energy, state.energy - 1);
  assert.ok(after.customers[0].trust > person.trust);
  assert.equal(after.customers[0].renewalStatus, 'pending');
  assert.equal(getRenewalFollowupEligibility(after, after.customers[0]).available, true);
});

test('current renewal decisions survive save/load and old/care-only records do not invent renewal status', () => {
  const person = customer('waiting', { renewalStatus: 'paused', lastRenewalFollowUpMonth: 3 });
  const state = management(3, { customers: [person], monthOpeningReport: openingReport });
  const restored = parseSavedState(serializeState(state));
  assert.deepEqual(getCustomerRenewalView(restored, restored.customers[0]), getCustomerRenewalView(state, person));
  assert.equal(getCustomerRenewalView(state, { ...person, renewalMonth: 2 }), null);
  assert.equal(getCustomerRenewalView(state, { ...person, careOnly: true }), null);
  assert.equal(getCustomerRenewalView(state, { ...person, renewalStatus: undefined }), null);
});

test('new month guide uses the posted opening decision counts and points to follow-up', () => {
  const state = management(3, { monthOpeningReport: openingReport });
  const previousState = management(2, { stage: STAGES.MONTH_CLOSED });
  const content = getStageContent(state);
  const context = { event: EVENTS.START_NEXT_MONTH, previousState };
  const beat = getStoryBeat(state, content, context);
  assert.equal(beat.key, 'month-opening:3');
  assert.equal(beat.speaker, 'ทีม');
  assert.equal(beat.portrait, 'teem');
  assert.match(beat.line, /ซื้อซ้ำเอง 3 คน/);
  assert.match(beat.line, /รอคุย 2 คน/);
  assert.match(beat.line, /ขอพัก 1 คน/);
  assert.match(beat.tip, /XOS.*ผู้คน/);
  assert.doesNotMatch(beat.line + beat.tip, /รับประกัน|แน่นอน/);
  assert.deepEqual(getStoryBeat(state, content, context), beat, 'rendering one action keeps the same beat');
});

test('opening report is not narrated again after reload, another action, or a duplicate start', () => {
  const state = management(3, { monthOpeningReport: openingReport });
  const content = getStageContent(state);
  for (const context of [
    {},
    { event: EVENTS.TRAIN_SKILL, previousState: management(3) },
    { event: EVENTS.START_NEXT_MONTH, previousState: state },
    { event: EVENTS.START_NEXT_MONTH, previousState: management(2, { monthOpeningReport: openingReport }) }
  ]) {
    assert.doesNotMatch(getStoryBeat(state, content, context).key, /^month-opening:/);
  }
  const old = management(3, { monthOpeningReport: { ...openingReport, month: 2 } });
  assert.doesNotMatch(getStoryBeat(old, getStageContent(old), {
    event: EVENTS.START_NEXT_MONTH, previousState: management(2)
  }).key, /^month-opening:/);
});

test('a month with no eligible renewal does not claim a sale or guaranteed income', () => {
  const state = management(3, { monthOpeningReport: {
    month: 3, eligibleCount: 0, automaticCustomerIds: [], followUpCustomerIds: [], pausedCustomerIds: [], incomeDelta: 0
  } });
  const beat = getStoryBeat(state, getStageContent(state), {
    event: EVENTS.START_NEXT_MONTH, previousState: management(2)
  });
  assert.match(beat.line, /ยังไม่มีลูกค้าเดิมที่ถึงรอบซื้อซ้ำ/);
  assert.doesNotMatch(beat.line, /ซื้อซ้ำเอง|รายได้เพิ่ม/);
});

test('a fresh follow-up refusal explains the next month without replaying after reload', () => {
  const beforePerson = customer('พัก');
  const previousState = management(3, { customers: [beforePerson] });
  const state = management(3, { customers: [{
    ...beforePerson, renewalStatus: 'paused', lastRenewalFollowUpMonth: 3
  }] });
  const content = getStageContent(state);
  const beat = getStoryBeat(state, content, {
    event: EVENTS.REORDER_CUSTOMER, previousState, payload: { id: beforePerson.id }
  });
  assert.equal(beat.key, 'renewal-paused:พัก:3');
  assert.match(beat.line, /ขอพักต่อ.*ยังไม่ซื้อซ้ำ/);
  assert.match(beat.tip, /เดือน 4/);
  assert.doesNotMatch(getStoryBeat(state, content).key, /^renewal-paused:/);
  assert.doesNotMatch(getStoryBeat(state, content, {
    event: EVENTS.REORDER_CUSTOMER, previousState: state, payload: { id: beforePerson.id }
  }).key, /^renewal-paused:/);
});
