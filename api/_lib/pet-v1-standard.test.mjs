import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PET_PERSONAS } from './pet-personas.js';
import { hasAuthoredPersona, hasPersona, petDisplayNames } from './pet-brain.js';
import { PET_SAUCE } from './pet/sauce/index.js';
import * as constitution from './pet/constitution.js';
import { XTY_V1_PET_IDS } from '../../xty/_shared/pets.js';

const EXPECTED_V1 = Object.freeze([
  'pig', 'buffalo', 'dog', 'unicorn', 'crow', 'cat', 'chicken', 'turtle',
]);
const LEGACY_CONFLICTS = [
  /ทุก wake ต้องพูด/i,
  /ทุกครั้งที่ตื่นต้องพูด/i,
  /ห้ามตอบ QUIET/i,
  /ต้องพูดอย่างน้อย 1 บรรทัด/i,
  /เปิดวง.*ทุก wake/i,
];

test('XTY V1 exposes exactly eight canonical pets', () => {
  assert.deepEqual([...XTY_V1_PET_IDS], [...EXPECTED_V1]);
});

test('all eight V1 pets use the same living-brain contract', () => {
  for (const id of EXPECTED_V1) {
    const persona = PET_PERSONAS[id];
    assert.ok(persona, `${id} must have an authored runtime persona`);
    assert.equal(hasPersona(id), true, `${id} must route through pet-brain`);
    assert.ok(persona.nameTh, `${id} must have a Thai display name`);
    assert.ok(persona.emoji, `${id} must have an emoji`);
    assert.ok(String(persona.block || '').length > 80, `${id} persona must not be a registry fallback`);
    assert.ok(petDisplayNames(id).length >= 1, `${id} must be directly addressable`);

    const text = String(persona.block || '');
    for (const conflict of LEGACY_CONFLICTS) {
      assert.equal(conflict.test(text), false, `${id} still contains legacy always-speak rule: ${conflict}`);
    }
  }
});

/* กติกาที่ทุกตัวใช้ร่วมกันต้องอยู่ในรัฐธรรมนูญที่เดียว ถ้าไฟล์ซอสเริ่ม
   เขียนกติกาเองอีกครั้ง แปลว่าเรากลับไปสู่ปัญหาเดิม: กติกาใหม่หนึ่งข้อ
   ต้องไล่แก้ทุกตัว */
test('silence is stated once in the constitution, not repeated in every sauce', () => {
  assert.match(constitution.behaviourMenu(), /QUIET เป็นคำตอบที่ดีและปกติ/);
  assert.match(constitution.decisionRules('scheduled'), /ให้ QUIET/);

  for (const id of EXPECTED_V1) {
    assert.equal(hasAuthoredPersona(id), true, `${id} must have its own sauce file`);
    const sauce = PET_SAUCE[id];
    const flavour = Object.entries(sauce)
      .filter(([key]) => !['id', 'nameTh', 'emoji', 'rgbs'].includes(key))
      .map(([, value]) => (Array.isArray(value) ? value.join(' ') : String(value)))
      .join(' ');
    assert.doesNotMatch(flavour, /QUIET ตาม brain/i,
      `${id} restates a shared rule — that belongs in constitution.js`);
    assert.doesNotMatch(flavour, /ห้ามเดาอากาศ|ห้ามวินิจฉัย/,
      `${id} restates shared safety rules — those belong in constitution.js`);
  }
});

/* เพิ่มสัตว์ใหม่ต้องเป็นการเพิ่มไฟล์ ไม่ใช่การแก้ทุกไฟล์ */
test('a sauce file is voice only and needs nothing else to work', () => {
  for (const sauce of Object.values(PET_SAUCE)) {
    assert.ok(sauce.id && sauce.nameTh && sauce.emoji, 'sauce ต้องบอกว่าตัวเองเป็นใคร');
    assert.ok(sauce.role || sauce.character, `${sauce.id} ต้องมีบุคลิกอย่างน้อยหนึ่งบรรทัด`);
    assert.equal(typeof sauce.behavior, 'undefined', `${sauce.id} ห้ามกำหนด behavior เอง`);
    assert.equal(typeof sauce.rules, 'undefined', `${sauce.id} ห้ามพกกติกาของตัวเอง`);
  }
});

/* สัตว์ที่ยังไม่มีไฟล์ซอสยังต้องพูดได้ ไม่ใช่เงียบเพราะไม่มีใครเขียนบุคลิก */
test('an animal without a sauce file still has a usable voice', () => {
  assert.equal(hasAuthoredPersona('lion'), false);
  assert.equal(hasPersona('lion'), true);
  assert.equal(hasPersona('__proto__'), false);
});
