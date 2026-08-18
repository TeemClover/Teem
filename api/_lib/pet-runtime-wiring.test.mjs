import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');

test('Vercel schedules the XTY living pet worker at all four Bangkok :27 wake slots', () => {
  const config = JSON.parse(text('vercel.json'));
  const petCron = (config.crons || []).find(entry => entry.path === '/api/xty-pet');
  assert.ok(petCron, 'vercel.json must invoke /api/xty-pet');
  // Vercel cron is UTC: 05:27 / 11:27 / 17:27 / 23:27 UTC = 12:27 / 18:27 / 00:27 / 06:27 ICT.
  assert.equal(petCron.schedule, '27 5,11,17,23 * * *');
});

test('GitHub manual wake runs the real due-room scheduler and does not duplicate the automatic cron', () => {
  const source = text('.github/workflows/xty-pet-wake.yml');
  assert.doesNotMatch(source, /^\s*schedule:\s*$/m, 'Vercel must be the only automatic PET scheduler');
  assert.doesNotMatch(source, /\?force=1/, 'manual health check must not wake one arbitrary room');
  assert.match(source, /providerFailures/);
  assert.match(source, /deferred/);
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
