import test from 'node:test';
import assert from 'node:assert/strict';
import { applyXircleCreateDefaults, XVISOR_PRESET_ID } from '../_shared/xvisor-care.js';

test('White Cat route preserves explicit verification and visibility choices', () => {
  const applied = applyXircleCreateDefaults({
    preset: XVISOR_PRESET_ID,
    verificationMode: 'confirm',
    visibility: 'public',
    budget: 'social',
    durationDays: 7,
    commitRule: 'ทำสิ่งที่ตกลงกัน',
  });

  assert.equal(applied.verificationMode, 'confirm');
  assert.equal(applied.visibility, 'public');
  assert.equal(applied.budget, 'social');
  assert.equal(applied.durationDays, 28);
  assert.equal(applied.preset, XVISOR_PRESET_ID);
});

test('White Cat route still supplies safe defaults when choices are absent', () => {
  const applied = applyXircleCreateDefaults({ preset: XVISOR_PRESET_ID });
  assert.equal(applied.verificationMode, 'trust');
  assert.equal(applied.visibility, 'private');
  assert.equal(applied.budget, 'normal');
  assert.equal(applied.durationDays, 28);
});
