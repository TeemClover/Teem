import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PET_PERSONAS } from './pet-personas.js';
import { hasPersona, petDisplayNames } from './pet-brain.js';
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

test('persona is voice-only and quiet remains centrally allowed', () => {
  for (const id of EXPECTED_V1) {
    const text = String(PET_PERSONAS[id].block || '');
    assert.match(text, /QUIET ตาม brain/i, `${id} must explicitly defer silence to the shared brain`);
  }
});
