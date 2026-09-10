import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, STAGES, makeInitialState, getRoutineChoices } from '../../xvisor/quest/game-data.js';
import { getStageContent } from '../../xvisor/quest/game-copy.js';
import { getPurchaseIntentCopy, getStoryBeat, getTransactionQuantityLabel } from '../../xvisor/quest/game-story.js';

const routineState = quantity => {
  const initial = makeInitialState({ seed: 31 });
  const person = { id: 'interested', name: 'ฟ้า', quote: 'อยากเริ่มง่าย ๆ', journey: 'baseline', consent: true,
    measured: true, trust: 75, readiness: 80, fitProducts: ['gus'], purchaseIntent: { kind: 'ready', seed: 31, requestedQuantity: quantity } };
  return { ...initial, month: 2, stage: STAGES.MANAGEMENT_ROUTINE, rank: 'xvisor', selectedPersonId: person.id, prospects: [person] };
};

test('purchase cues distinguish an expressed family interest from an order and leave other NPCs alone', () => {
  assert.equal(getPurchaseIntentCopy({}), null);
  assert.equal(getPurchaseIntentCopy({ purchaseIntent: { kind: 'exploring', requestedQuantity: 3 } }), null);
  for (const progress of [{ journey: 'waiting' }, { activePlan: true }, { careOnly: true }]) {
    assert.equal(getPurchaseIntentCopy({ ...routineState(3).prospects[0], ...progress }), null, 'old interest must not hide a later decision');
  }
  const single = getPurchaseIntentCopy(routineState(1).prospects[0]);
  assert.match(single.line, /กำลังหาโปรแกรม/);
  assert.doesNotMatch(single.line, /คนที่บ้าน|ซื้อแล้ว/);
  const family = getPurchaseIntentCopy(routineState(3).prospects[0]);
  assert.match(family.line, /ตัวเองกับคนที่บ้านรวม 3 ชุด/);
  assert.doesNotMatch(family.line, /ซื้อแล้ว|รับประกัน|ในเกม/);
  assert.doesNotMatch(getPurchaseIntentCopy(routineState(99).prospects[0]).line, /99 ชุด|คนที่บ้าน/);
});

test('routine copy keeps actual engine availability, chance, quantity and next steps while voicing the NPC', () => {
  for (const quantity of [1, 2, 3]) {
    const state = routineState(quantity);
    const before = JSON.stringify(state);
    const content = getStageContent(state);
    const expected = getRoutineChoices(state, state.prospects[0]);
    assert.deepEqual(content.routineBuilder.choices.map(({ label, detail, ...choice }) => choice), expected);
    assert.equal(getStoryBeat(state, content).portrait, 'customer');
    assert.equal(getStoryBeat(state, content).speaker, 'ฟ้า');
    assert.equal(getStoryBeat(state, content).line, content.dialogue);
    assert.match(content.dialogue, quantity > 1 ? new RegExp(`คนที่บ้านรวม ${quantity} ชุด`) : /กำลังหาโปรแกรม/);
    for (const choice of content.routineBuilder.choices) {
      if (choice.id !== 'control') assert.match(choice.label, /คุยแฟ้ม X/);
      if (Number(choice.quantity) > 1) assert.match(choice.detail, new RegExp(`เสนอ ${choice.quantity} ชุด`));
    }
    assert.equal(JSON.stringify(state), before);
  }
});

test('set labels use recorded transaction quantity and never infer a purchase from customer intent', () => {
  for (const transaction of [null, {}, { quantity: 1 }, { quantity: 0 }, { quantity: -2 }, { quantity: 2.5 }, { quantity: NaN }, { purchaseIntent: { requestedQuantity: 3 } }]) {
    assert.equal(getTransactionQuantityLabel(transaction), '');
  }
  assert.equal(getTransactionQuantityLabel({ quantity: 2 }), '2 ชุด');
  assert.equal(getTransactionQuantityLabel({ quantity: 3, price: 37440 }), '3 ชุด');
});

test('multiple-set story celebrates one actual purchase once and keeps the next renewal to the buyer', () => {
  const before = routineState(3);
  const transaction = { id: '2-sale-interested', kind: 'sale', customerId: 'interested', quantity: 3,
    items: [{ id: 'routinex-full', quantity: 3 }] };
  const after = { ...before, stage: STAGES.MANAGEMENT, prospects: [],
    customers: [{ ...before.prospects[0], id: 'customer-interested', personId: 'interested' }],
    economy: { ...before.economy, lastTransaction: transaction } };
  const context = { previousState: before, event: EVENTS.CHOOSE_MANAGEMENT_ROUTINE, payload: { id: 'interested', planId: 'all' } };
  const beat = getStoryBeat(after, {}, context);
  assert.equal(beat.key, `purchase:${transaction.id}`);
  assert.match(beat.line, /ฟ้าเลือกเริ่มด้วยกัน 3 ชุด/);
  assert.match(beat.tip, /เจ้าตัว 1 ชุด/);
  assert.doesNotMatch(beat.line, /ลูกค้า 3 คน/);
  assert.notEqual(getStoryBeat(after).key, beat.key);
  assert.notEqual(getStoryBeat(after, {}, { ...context, previousState: after }).key, beat.key);
  const careOnly = { ...after, customers: [{ ...after.customers[0], careOnly: true }], economy: before.economy };
  assert.doesNotMatch(getStoryBeat(careOnly, {}, context).line, /เริ่มด้วยกัน 3 ชุด/);
});
