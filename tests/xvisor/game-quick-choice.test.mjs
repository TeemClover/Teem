import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS, CUSTOMER_STATES, STAGES, canDispatch, getBestNextActions, getPersonContextAction,
  makeInitialState, reduceGame,
} from '../../xvisor/quest/game-data.js';
import { isActionAvailable, normalizeAction } from '../../xvisor/quest/game-actions.js';
import { getStageContent } from '../../xvisor/quest/game-copy.js';

function management(overrides = {}) {
  const initial = makeInitialState({ seed: 73 });
  return { ...initial, stage: STAGES.MANAGEMENT, phase: 'management', month: 2, rank: 'xvisor', energy: 28, ...overrides };
}

function customer(id, overrides = {}) {
  return { id, personId: id, name: `ลูกค้า ${id}`, day: 7, followups: 1, trust: 62, adherence: 52, satisfaction: 50, customerState: CUSTOMER_STATES.NEEDS_HELP, activePlan: true, ...overrides };
}

test('Month 2 offers useful choices with explanations before suggesting an early close', () => {
  const state = management();
  const before = JSON.stringify(state);
  const choices = getStageContent(state).actions;
  assert.equal(choices.length, 3);
  assert.equal(choices.some(choice => choice.event === EVENTS.END_MONTH), false);
  assert.ok(choices.some(choice => choice.event === EVENTS.CREATE_LEAD));
  assert.ok(choices.some(choice => choice.event === EVENTS.TRAIN_SKILL));
  for (const choice of choices) {
    assert.ok(choice.reason.length > 12);
    assert.ok(choice.categoryLabel);
    const after = reduceGame(state, choice.event, normalizeAction(choice));
    assert.equal(after.energy, state.energy - choice.cost);
    assert.ok(after.prospects.length > 0 || Object.values(after.skills).some(skill => skill.xp > 0));
  }
  assert.equal(JSON.stringify(state), before, 'reading choices must not change saved progress');
});

test('Quick 3 finds different playable routes even behind a long list of candidates', () => {
  const state = management({
    customers: [
      ...Array.from({ length: 24 }, (_, index) => customer(`candidate-${index}`, { xvisorStage: 'case', candidateProgress: 2, candidateStartedMonth: 1 })),
      customer('needs-care'),
    ],
    prospects: [{ id: 'new-person', name: 'คนใหม่', journey: 'new', trust: 50 }],
  });
  state.monthStats = { ...state.monthStats, xcademySessions: 4, openHouseDone: true };
  const choices = getBestNextActions(state);
  assert.deepEqual(choices.map(choice => choice.category), ['team', 'people', 'care']);
  assert.equal(choices[0].event, EVENTS.CERTIFY_CANDIDATE);
  assert.ok(choices.every(choice => isActionAvailable(state, choice)));
});

test('one remaining energy filters costly missions before filling Quick 3', () => {
  const state = management({
    energy: 1,
    prospects: Array.from({ length: 18 }, (_, index) => ({ id: `baseline-${index}`, name: `คน ${index}`, journey: 'discovery', trust: 50 })),
    customers: [customer('review', { day: 28, measuredAgain: false })],
  });
  const choices = getBestNextActions(state);
  assert.equal(choices.length, 3);
  assert.ok(choices.every(choice => choice.cost <= 1));
  assert.ok(choices.every(choice => choice.event !== EVENTS.END_MONTH));
  assert.ok(choices.every(choice => ![EVENTS.BASELINE_PROSPECT, EVENTS.REMEASURE_CUSTOMER, EVENTS.RUN_XCADEMY, EVENTS.RUN_OPEN_HOUSE].includes(choice.event)));
});

test('stale care missions cannot waste a click on an automated customer', () => {
  const state = management({ customers: [customer('automated', { selfDirected: true, customerState: CUSTOMER_STATES.SELF_DIRECTED })] });
  state.missions = [{ type: 'care', targetId: 'automated', label: 'ติดตามลูกค้า', completed: false }];
  const choices = getBestNextActions(state);
  assert.equal(choices.length, 3);
  assert.ok(choices.every(choice => choice.event !== EVENTS.CARE_CUSTOMER));
  assert.equal(isActionAvailable(state, { event: EVENTS.CARE_CUSTOMER, targetId: 'automated', cost: 1 }), false);
});

test('care recommendations continue to real checkpoints instead of disappearing after one follow-up', () => {
  let state = management({ customers: [customer('care-progress')] });
  const first = getBestNextActions(state, 12).find(choice => choice.event === EVENTS.CARE_CUSTOMER);
  assert.ok(first);
  state = reduceGame(state, first.event, normalizeAction(first));
  const firstDay = state.customers[0].day;
  const next = getBestNextActions(state, 12).find(choice => choice.event === EVENTS.CARE_CUSTOMER);
  assert.ok(next);
  const after = reduceGame(state, next.event, normalizeAction(next));
  assert.ok(after.customers[0].day > firstDay);
  assert.equal(after.energy, state.energy - next.cost);
});

test('lead sources and practice skills retain distinct payloads when filling Quick choices', () => {
  const state = management({ skills: { knowledge: { xp: 3 }, people: { xp: 3 }, care: { xp: 3 }, leadership: { xp: 3 } } });
  const choices = getBestNextActions(state, 12);
  const leads = choices.filter(choice => choice.event === EVENTS.CREATE_LEAD).map(choice => choice.payload.source);
  assert.deepEqual(new Set(leads), new Set(['known', 'content']));
  const practice = choices.filter(choice => choice.event === EVENTS.TRAIN_SKILL);
  assert.equal(new Set(practice.map(choice => choice.payload.skill)).size, 4);
  for (const choice of practice) {
    const after = reduceGame(state, choice.event, normalizeAction(choice));
    assert.equal(after.skills[choice.payload.skill].xp, state.skills[choice.payload.skill].xp + 2);
  }
});

test('completed monthly activities and locked lead sources are unavailable', () => {
  const state = management();
  state.monthStats = { ...state.monthStats, xcademySessions: 4, eventDone: true, xircleDone: true };
  for (const event of [EVENTS.RUN_XCADEMY, EVENTS.RUN_CENTER, EVENTS.RUN_WEEKLY, EVENTS.RUN_OPEN_HOUSE, EVENTS.RUN_GOOD_LUCK, EVENTS.RUN_MONTHLY_EVENT, EVENTS.RUN_XIRCLE]) {
    assert.equal(isActionAvailable(state, { event, cost: 2 }), false, event);
  }
  assert.equal(isActionAvailable(state, { event: EVENTS.CREATE_LEAD, payload: { source: 'ads' }, cost: 1 }), false);
  assert.equal(isActionAvailable(state, { event: EVENTS.TRAIN_SKILL, payload: { skill: 'missing' }, cost: 1 }), false);
});

test('a free Routine remains playable at zero energy before the month closes', () => {
  const state = management({ energy: 0, prospects: [{ id: 'routine', name: 'พร้อมวางแผน', journey: 'baseline', trust: 50 }] });
  const choices = getBestNextActions(state);
  assert.equal(choices[0].event, EVENTS.OPEN_MANAGEMENT_ROUTINE);
  assert.equal(choices.some(choice => choice.event === EVENTS.END_MONTH), false);
  const after = reduceGame(state, choices[0].event, normalizeAction(choices[0]));
  assert.equal(after.stage, STAGES.MANAGEMENT_ROUTINE);
  assert.equal(after.energy, 0);
});

test('zero energy with no remaining free work recommends closing and then the next month', () => {
  const state = management({ energy: 0 });
  assert.equal(getBestNextActions(state)[0].event, EVENTS.END_MONTH);
  const closed = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(closed.stage, STAGES.MONTH_CLOSED);
  assert.equal(getBestNextActions(closed)[0].event, EVENTS.START_NEXT_MONTH);
  const next = reduceGame(closed, EVENTS.START_NEXT_MONTH);
  assert.equal(next.month, 3);
  assert.equal(next.energy, 28);
});

test('intentional early closing remains legal while Quick 3 offers work', () => {
  const state = management();
  assert.equal(canDispatch(state, EVENTS.END_MONTH), true);
  assert.equal(getBestNextActions(state).some(choice => choice.event === EVENTS.END_MONTH), false);
  const after = reduceGame(state, EVENTS.END_MONTH);
  assert.equal(after.stage, STAGES.MONTH_CLOSED);
  assert.equal(after.settlements['2'].settled, true);
});

test('pending exams keep priority over ordinary work and preserve the month-close gate', () => {
  const state = management();
  state.economy = { ...state.economy, personalXV: 1_000_000, teamXV: 2_000_000 };
  assert.equal(getBestNextActions(state)[0].event, EVENTS.XGEN_EXAM);
  assert.equal(reduceGame(state, EVENTS.END_MONTH).settlements['2'], undefined);
});

test('People opens a real review at Day 28 even while satisfaction is low', () => {
  const state = management({ customers: [customer('day28', { day: 28, satisfaction: 45, measuredAgain: false })] });
  const action = getPersonContextAction(state, state.customers[0], 'customer');
  assert.equal(action.event, EVENTS.REMEASURE_CUSTOMER);
  assert.equal(isActionAvailable(state, action), true);
  const after = reduceGame(state, action.event, normalizeAction(action));
  assert.equal(after.customers[0].measuredAgain, true);
  assert.equal(after.energy, state.energy - 2);
  assert.equal(getPersonContextAction(after, after.customers[0], 'customer'), null, 'a reviewed incomplete result must not offer a dead care button');
});

test('People keeps care available while certification is waiting for Xcademy or next month', () => {
  const state = management({ customers: [customer('candidate-wait', { xvisorStage: 'case', candidateProgress: 2, candidateStartedMonth: 2 })] });
  const waiting = getPersonContextAction(state, state.customers[0], 'customer');
  assert.equal(waiting.event, EVENTS.CARE_CUSTOMER);
  assert.equal(isActionAvailable(state, waiting), true);
  const ready = { ...state, monthStats: { ...state.monthStats, xcademySessions: 1 } };
  const certify = getPersonContextAction(ready, ready.customers[0], 'customer');
  assert.equal(certify.event, EVENTS.CERTIFY_CANDIDATE);
  assert.equal(isActionAvailable(ready, certify), true);
});

test('People checks reorder trust and follow-up prerequisites before suggesting a purchase', () => {
  const state = management({ customers: [customer('reorder', { day: 28, customerState: CUSTOMER_STATES.READY_TO_BUY, measuredAgain: false, followups: 2, trust: 62, result: 'ดีขึ้น' })] });
  const action = getPersonContextAction(state, state.customers[0], 'customer');
  assert.equal(action.event, EVENTS.REMEASURE_CUSTOMER);
  for (const overrides of [{ trust: 57 }, { followups: 1 }, { result: 'หลุด' }]) {
    const blocked = customer('blocked', { day: 28, customerState: CUSTOMER_STATES.READY_TO_BUY, measuredAgain: true, followups: 2, trust: 62, result: 'ดีขึ้น', ...overrides });
    assert.equal(getPersonContextAction(state, blocked, 'customer'), null);
  }
  const eligible = { ...state.customers[0], measuredAgain: true };
  assert.equal(getPersonContextAction(state, eligible, 'customer').event, EVENTS.REORDER_CUSTOMER);
});
