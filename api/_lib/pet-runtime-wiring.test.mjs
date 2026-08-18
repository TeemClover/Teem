import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');

test('Vercel schedules the XTY living pet worker at all four Bangkok wake slots', () => {
  const config = JSON.parse(text('vercel.json'));
  const petCron = (config.crons || []).find(entry => entry.path === '/api/xty-pet');
  assert.ok(petCron, 'vercel.json must invoke /api/xty-pet');
  assert.equal(petCron.schedule, '0 5,11,17,23 * * *');
});

test('party profile cover scheduler is initialized before install can call it', () => {
  const source = text('xty/_shared/party-profile-covers.js');
  const declaration = source.indexOf('let scheduled = false;');
  const installCall = source.indexOf("if (/^\\d{5}$/.test(code || '')) install();");
  assert.ok(declaration >= 0, 'scheduled declaration must exist');
  assert.ok(installCall >= 0, 'party cover install call must exist');
  assert.ok(declaration < installCall, 'scheduled must leave TDZ before install() calls schedule()');
});

test('scheduled PET worker keeps failed AI turns retryable', () => {
  const source = text('api/xty-pet.js');
  assert.match(source, /async function restoreClaimedWake/);
  assert.match(source, /if \(!force && \(!aiConfigured\(\) \|\| !hasPersona\(party\.pet_id\) \|\| !decision\)\)/);
  assert.match(source, /await restoreClaimedWake\(sql, party, now\)/);
});
