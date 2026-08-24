import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PET_BY_ID, TEAMBOOK_V1_PET_IDS } from '../_shared/pets.js';
import { PET_SAUCE } from '../api/_lib/pet/sauce/index.js';

test('HIA stays secret but has the full-body chat avatar and authored brain', () => {
  const hia = PET_BY_ID.monitor_lizard;
  assert.equal(hia.nameTh, 'เหี้ย');
  assert.equal(hia.nameEn, 'HIA');
  assert.equal(hia.secret, true);
  assert.equal(hia.art, '/assets/art/pets/monitor-lizard.webp');
  assert.equal(TEAMBOOK_V1_PET_IDS.includes(hia.id), false);
  assert.equal(PET_SAUCE.monitor_lizard.id, hia.id);
  assert.ok(PET_SAUCE.monitor_lizard.aliases.includes('HIA'));
  assert.equal(PET_SAUCE.monitor_lizard.pronouns.includes('กู/มึง'), true);
});
