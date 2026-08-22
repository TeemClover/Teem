import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { requestedRoomSettings } from '../api/_lib/v12-create.js';
import { applyXircleCreateDefaults, XVISOR_PRESET_ID } from '../_shared/xvisor-care.js';

const here = dirname(fileURLToPath(import.meta.url));
const client = readFileSync(resolve(here, '../_shared/create-party-v2.js'), 'utf8');
const adapter = readFileSync(resolve(here, '../api/_lib/v12-create.js'), 'utf8');

assert.deepEqual(
  requestedRoomSettings({ visibility: 'public', verificationMode: 'confirm' }),
  { visibility: 'public', verificationMode: 'confirm' },
  'V1.2 server boundary must preserve Public + Confirm',
);
assert.deepEqual(
  requestedRoomSettings({ visibility: 'private', verificationMode: 'trust' }),
  { visibility: 'private', verificationMode: 'trust' },
  'V1.2 server boundary must preserve Private + Trust',
);
assert.deepEqual(
  requestedRoomSettings({ visibility: 'bad', verificationMode: 'bad' }),
  { visibility: 'private', verificationMode: 'trust' },
  'invalid room settings must fail closed',
);

const whiteCat = applyXircleCreateDefaults({
  preset: XVISOR_PRESET_ID,
  visibility: 'public',
  verificationMode: 'confirm',
});
assert.equal(whiteCat.visibility, 'public', 'White Cat must preserve explicit Public');
assert.equal(whiteCat.verificationMode, 'confirm', 'White Cat must preserve explicit Confirm');
assert.equal(whiteCat.durationDays, 28, 'White Cat authored route remains 28 days');

assert.match(
  client,
  /applyXircleCreateDefaults\(selectedRoomChoices\(options\)\)/,
  'client must reconcile the visible room choice at submit time',
);
assert.match(
  client,
  /preset: finalPreset, verificationMode, durationDays: finalDurationDays, color, visibility/,
  'client payload must carry visibility and verificationMode',
);
assert.match(
  adapter,
  /visibility=\$6,verification_mode=\$7/,
  'outer adapter must persist final room settings on canonical book row',
);
assert.match(adapter, /party\.visibility = roomSettings\.visibility/);
assert.match(adapter, /party\.verificationMode = roomSettings\.verificationMode/);

console.log('Public room create flow OK: normal + White Cat, public/private + trust/confirm.');
