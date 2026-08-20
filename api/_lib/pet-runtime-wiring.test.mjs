import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dailyPresenceRequired, presenceFallback, scheduledBubbleAllowance, shouldReadScheduled,
} from './pet/presence-policy.js';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');

test('Vercel schedules the XTY living pet worker at all four Bangkok :27 wake slots', () => {
  const config = JSON.parse(text('vercel.json'));
  const petCron = (config.crons || []).find(entry => entry.path === '/api/xty-pet');
  assert.ok(petCron, 'vercel.json must invoke /api/xty-pet');
  assert.equal(petCron.schedule, '27 5,11,17,23 * * *');
});

test('GitHub manual wake runs the real due-room scheduler and does not duplicate the automatic cron', () => {
  const source = text('.github/workflows/xty-pet-wake.yml');
  assert.doesNotMatch(source, /^\s*schedule:\s*$/m, 'Vercel must be the only automatic PET scheduler');
  assert.doesNotMatch(source, /\?force=1/, 'manual health check must not wake one arbitrary room');
  assert.match(source, /providerFailures/);
  assert.match(source, /deferred/);
});

test('scheduled PET sweep has no room-count or wall-clock cutoff and reads the whole Party session', () => {
  const source = text('api/xty-pet.js');
  assert.doesNotMatch(source, /XTY_PET_WAKE_LIMIT/);
  assert.doesNotMatch(source, /XTY_PET_WAKE_BUDGET_MS/);
  assert.doesNotMatch(source, /LOG_SLICE/);
  assert.doesNotMatch(source, /ORDER BY p\.seq DESC LIMIT/);
  assert.match(source, /state IN \$\{liveStateSql\}/);
  assert.match(source, /inspected: due\.length/);
  assert.match(source, /m\.role/);
  assert.match(source, /kind === 'system'/);
});

test('direct PET conversation never consumes the next scheduled :27 inspection', () => {
  const source = text('api/xty-pet.js');
  const direct = source.slice(source.indexOf('async function directReply'), source.indexOf('async function whiteCatIntro'));
  const intro = source.slice(source.indexOf('async function whiteCatIntro'), source.indexOf('function manualFallback'));
  assert.doesNotMatch(direct, /SET pet_last_wake=/);
  assert.doesNotMatch(intro, /SET pet_last_wake=/);
});

test('presence floor is one visible PET bubble a day, while PET volume never overtakes humans', () => {
  assert.equal(scheduledBubbleAllowance({ humanToday: 0, petToday: 0 }), 1);
  assert.equal(scheduledBubbleAllowance({ humanToday: 0, petToday: 1 }), 0);
  assert.equal(scheduledBubbleAllowance({ humanToday: 4, petToday: 2 }), 2);
  assert.equal(dailyPresenceRequired(6, { humanToday: 0, petToday: 0 }), false);
  assert.equal(dailyPresenceRequired(12, { humanToday: 0, petToday: 0 }), true);
  assert.equal(dailyPresenceRequired(18, { humanToday: 2, petToday: 1 }), false);
});

test('connected human activity can wake PET again after daily presence when message budget remains', () => {
  const context = {
    humanToday: 4, petToday: 1, humanUpdates: 1,
    timedThreadDue: false, lastHumanAt: new Date(), lastPetAt: new Date(Date.now() - 1000),
  };
  assert.equal(shouldReadScheduled(18, context), true);
  assert.equal(shouldReadScheduled(18, { ...context, humanToday: 1, petToday: 1 }), false);
});

test('daily presence fallback calls the silent lead by name instead of emitting a generic bot line', () => {
  const line = presenceFallback({
    party: { activity: 'ทำเว็บ TeamBook' },
    context: { members: [
      { alias: 'ที', role: 'lead', postsToday: 0 },
      { alias: 'เอ', role: 'member', postsToday: 1 },
    ] },
    history: [],
  });
  assert.match(line, /ที/);
  assert.match(line, /หัวตี้/);
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
