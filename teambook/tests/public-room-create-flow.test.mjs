import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { requestedRoomSettings } from '../api/_lib/v12-create.js';
import { applyXircleCreateDefaults, XVISOR_PRESET_ID } from '../_shared/xvisor-care.js';

const here = dirname(fileURLToPath(import.meta.url));

function source(path) {
  return readFileSync(resolve(here, path), 'utf8');
}

test('normal TeamBook create preserves Public + Confirm at the V1.2 server boundary', () => {
  assert.deepEqual(
    requestedRoomSettings({ visibility: 'public', verificationMode: 'confirm' }),
    { visibility: 'public', verificationMode: 'confirm' },
  );
});

test('normal TeamBook create preserves Private + Trust at the V1.2 server boundary', () => {
  assert.deepEqual(
    requestedRoomSettings({ visibility: 'private', verificationMode: 'trust' }),
    { visibility: 'private', verificationMode: 'trust' },
  );
});

test('invalid or missing room choices fail closed instead of becoming public accidentally', () => {
  assert.deepEqual(
    requestedRoomSettings({ visibility: 'anything', verificationMode: 'anything' }),
    { visibility: 'private', verificationMode: 'trust' },
  );
});

test('White Cat defaults preserve an explicit Public + Confirm choice', () => {
  const applied = applyXircleCreateDefaults({
    preset: XVISOR_PRESET_ID,
    visibility: 'public',
    verificationMode: 'confirm',
  });
  assert.equal(applied.visibility, 'public');
  assert.equal(applied.verificationMode, 'confirm');
  assert.equal(applied.durationDays, 28);
});

test('client reconciles the visible room choice immediately before submit', () => {
  const client = source('../_shared/create-party-v2.js');
  assert.match(client, /applyXircleCreateDefaults\(selectedRoomChoices\(options\)\)/);
  assert.match(client, /visibilityText\.includes\('สาธารณะ'\)/);
  assert.match(client, /verificationText\.includes\('ต้อง'\).*verificationText\.includes\('เห็นแล้ว'\)/s);
  assert.match(client, /preset: finalPreset, verificationMode, durationDays: finalDurationDays, color, visibility/);
});

test('outer server adapter writes final room choices back to the canonical book row', () => {
  const adapter = source('../api/_lib/v12-create.js');
  assert.match(adapter, /visibility=\$6,verification_mode=\$7/);
  assert.match(adapter, /party\.visibility = roomSettings\.visibility/);
  assert.match(adapter, /party\.verificationMode = roomSettings\.verificationMode/);
});
