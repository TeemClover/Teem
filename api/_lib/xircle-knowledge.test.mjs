import { test } from 'node:test';
import assert from 'node:assert/strict';

import { xircleKnowledgeFor, WHITE_CAT_ID } from './xircle-knowledge.js';
import { tooSimilarToRecent } from './pet-brain.js';
import { isXvisorPreset, XVISOR_PRESET_ID } from '../../xty/_shared/xvisor-care.js';

test('only White Cat receives the Xircle knowledge pack', () => {
  assert.equal(xircleKnowledgeFor({ petId: 'crow', query: 'ABCD คืออะไร', trigger: 'direct' }), '');
  const pack = xircleKnowledgeFor({ petId: WHITE_CAT_ID, query: 'แมวขาว ABCD คืออะไร?', trigger: 'direct' });
  assert.match(pack, /XIRCLE KNOWLEDGE PACK/);
  assert.match(pack, /A=ABSORB → G\.U\.S\.\+/);
  assert.match(pack, /B=BUILD → Protein HMB\+/);
  assert.match(pack, /C=CONTROL → Behavior/);
  assert.match(pack, /D=DAILY BALANCE/);
  assert.match(pack, /C คือพฤติกรรม ไม่มีสินค้า/);
});

test('RoutineX knowledge keeps the 28-day claim boundary', () => {
  const pack = xircleKnowledgeFor({
    petId: WHITE_CAT_ID,
    query: 'แมวขาว RoutineX 28 วันคืออะไร',
    trigger: 'direct',
  });
  assert.match(pack, /RoutineX \/ 28 วัน/);
  assert.match(pack, /ไม่ใช่คำรับประกันผล/);
});

test('scheduled knowledge retrieval follows the party topic instead of dumping FAQ topics', () => {
  const pack = xircleKnowledgeFor({
    petId: WHITE_CAT_ID,
    activity: 'นอนให้เป็นเวลา',
    history: [{ kind: 'message', alias: 'เอ', body: 'เมื่อคืนเรานอนช้ากว่าเดิม', retracted: false }],
    trigger: 'scheduled',
  });
  assert.match(pack, /Xircle/);
  assert.doesNotMatch(pack, /ABCD \+ Flavor\+/);
  assert.doesNotMatch(pack, /CARE\n/);
});

test('semantic repeat guard catches exact and near-duplicate scheduled pet lines', () => {
  const history = [
    { kind: 'pet', body: 'Teem ทำ Xircle เสร็จแล้วนะ รอบนี้ของจริงเกิดขึ้นแล้ว', retracted: false },
  ];
  assert.equal(tooSimilarToRecent(['Teem ทำ Xircle เสร็จแล้วนะ รอบนี้ของจริงเกิดขึ้นแล้ว'], history), true);
  assert.equal(tooSimilarToRecent(['Teem ทำ Xircle เสร็จแล้ว รอบนี้ของจริงเกิดขึ้นแล้วนะ'], history), true);
  assert.equal(tooSimilarToRecent(['แล้วรอบ 15:35 กดทันไหม'], history), false);
});

test('X-VISOR recognition supports canonical preset and legacy White Cat rooms', () => {
  assert.equal(isXvisorPreset(XVISOR_PRESET_ID), true);
  assert.equal(isXvisorPreset({ preset: XVISOR_PRESET_ID }), true);
  assert.equal(isXvisorPreset({ preset: 'casual', petId: WHITE_CAT_ID }), true);
  assert.equal(isXvisorPreset({ preset: 'casual', pet_id: WHITE_CAT_ID }), true);
  assert.equal(isXvisorPreset({ preset: 'casual', petId: 'crow' }), false);
});
