import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, STAGES, makeInitialState, reduceGame, getPersonContextAction, getBestNextActions, getCustomerRenewalView, serializeState, parseSavedState } from '../../xvisor/quest/game-data.js';
import { isActionAvailable, normalizeAction } from '../../xvisor/quest/game-actions.js';
import { getStoryBeat } from '../../xvisor/quest/game-story.js';
import { monthGrowthHtml } from '../../xvisor/quest/game-panels.js';

function stateWithMember(renewalStatus = 'pending') {
  const initial = makeInitialState({ seed: 31 });
  return {
    ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    team: [{ id: 'member-1', personId: 'person-1', name: 'ฟ้า', parentId: 'player', active: true,
      recurringPaid: true, activePlan: renewalStatus !== 'paused', renewalStatus, renewalMonth: 4,
      lastSelfUseMonth: 3, day: 28, trust: 62, adherence: 65, satisfaction: 65,
      confidence: 65, autonomy: 65, customers: 0, personalXV: 0, personalSalesBaht: 0 }]
  };
}

test('member-only subscriptions have playable XOS/People follow-up and care with one decision per month', () => {
  for (const status of ['pending', 'paused']) {
    const state = stateWithMember(status);
    const member = state.team[0];
    assert.equal(state.customers.length, 0);
    assert.equal(getCustomerRenewalView(state, member).available, true);
    const action = getPersonContextAction(state, member, 'team');
    assert.equal(action.event, EVENTS.REORDER_CUSTOMER);
    assert.match(action.label, /คุยแฟ้ม X กับ ฟ้า/);
    assert.equal(isActionAvailable(state, action), true);
    assert.equal(isActionAvailable(state, { event: EVENTS.CARE_CUSTOMER, id: member.id, cost: 1 }), true);
    const recommended = getBestNextActions(state, 100).find(item => item.event === EVENTS.REORDER_CUSTOMER && item.targetId === member.id);
    assert.ok(recommended, `${status} direct member is reachable from XOS`);
    const after = reduceGame(state, action.event, normalizeAction(action));
    assert.equal(after.energy, state.energy - 1);
    assert.equal(after.team[0].lastRenewalFollowUpMonth, 4);
    assert.equal(isActionAvailable(after, action), false);
    assert.equal(isActionAvailable(after, { event: EVENTS.CARE_CUSTOMER, id: member.id, cost: 1 }), false);
    const restored = parseSavedState(serializeState(after));
    assert.equal(isActionAvailable(restored, action), false);
    assert.deepEqual(getCustomerRenewalView(restored, restored.team[0]), getCustomerRenewalView(after, after.team[0]));
  }
});

test('opening and follow-up story include direct-member self-use without calling it another customer purchase', () => {
  const before = { ...stateWithMember(), month: 3, stage: STAGES.MONTH_CLOSED };
  const state = { ...stateWithMember(), monthOpeningReport: {
    month: 4, eligibleCount: 3, automaticCustomerIds: ['customer-1'], automaticDirectMemberIds: ['member-1'], followUpCustomerIds: [], pausedCustomerIds: ['member-2']
  } };
  const beat = getStoryBeat(state, {}, { event: EVENTS.START_NEXT_MONTH, previousState: before });
  assert.match(beat.line, /ลูกค้าเดิมซื้อซ้ำเอง 1 คน/);
  assert.match(beat.line, /ทีมสายตรงใช้ต่อ 1 คน/);
  assert.match(beat.line, /ขอพัก 1 คน/);
  const paused = { ...state, team: [{ ...state.team[0], renewalStatus: 'paused', lastRenewalFollowUpMonth: 4 }] };
  const result = getStoryBeat(paused, {}, { event: EVENTS.REORDER_CUSTOMER, previousState: state, payload: { id: 'member-1' } });
  assert.match(result.line, /ฟ้าขอพักต่อ/);
  assert.match(result.tip, /เดือน 5/);
});

test('growth summary preserves the team metric beside the accumulating recurring base', () => {
  const state = { ...stateWithMember(), settlements: { 3: {
    month: 3, totalIncome: 1400, channel1: 1400, channel2: 0, channel3: 0, currentTGV: 7000,
    growth: { activeCustomers: 2, repeatCustomers: 1, teamCount: 3, recurringBase: 5, recurringCustomerBase: 2, recurringDirectMemberBase: 3, customerScope: 'personal', teamScope: 'direct', recurringScope: 'personal-direct' }
  } } };
  const html = monthGrowthHtml(state, 3);
  assert.match(html, /data-metric="recurringBase"/);
  assert.match(html, /data-metric="teamCount"/);
  assert.match(html, /แม้บางคนขอพัก/);
});
