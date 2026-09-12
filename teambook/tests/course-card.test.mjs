import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { claimAndPersist, COURSE_QUEST, CLAIM_ENDPOINT, courseRevealPath, courseContinuation, persistedReward } from '../course-card/bridge.js';
import { createProfile, importServerCardReward, TEAMBOOK_PROFILE_KEY, revealPartyCardReward } from '../_shared/store.js';
import { cardById } from '../_shared/cards.js';

const TOKEN = 'test_receipt_'.padEnd(43, 'x');
const CARD = 'ORANGE_CAT_GREEN_COMMON_001';
const reward = () => ({ rewardId: 'course_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  cardId: CARD, questId: COURSE_QUEST, earnedAt: new Date().toISOString() });

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function context() {
  globalThis.localStorage = storage();
  const profile = createProfile({ alias: 'Test learner', avatarId: 'orange_cat' });
  const getStoredProfile = () => JSON.parse(localStorage.getItem(TEAMBOOK_PROFILE_KEY) || 'null');
  return { profileId: profile.id, token: TOKEN, getStoredProfile, importReward: importServerCardReward, cardById };
}
const response = value => ({ ok: true, json: async () => ({ ok: true, reward: value }) });

test('claims on MyClover without credentials and imports the exact card once on retries', async () => {
  const options = context(); const value = reward(); let calls = 0;
  const fetchImpl = async (url, request) => {
    calls += 1;
    assert.equal(url, CLAIM_ENDPOINT);
    assert.equal(request.credentials, 'omit');
    assert.equal(request.mode, 'cors');
    assert.equal(request.referrerPolicy, 'no-referrer');
    assert.deepEqual(JSON.parse(request.body), { action: 'claim', token: TOKEN, profileId: options.profileId });
    return response(value);
  };
  await claimAndPersist({ ...options, fetchImpl });
  await claimAndPersist({ ...options, fetchImpl });
  const profile = options.getStoredProfile();
  assert.equal(calls, 2);
  assert.equal(profile.cardRewards.length, 1);
  assert.equal(profile.ownedCards.length, 1);
  assert.equal(profile.cardRewards[0].partyCode, '');
  assert.ok(persistedReward(profile, value));
});

test('a course card reveals locally without joining or posting to a room', async () => {
  const options = context(); const value = reward();
  await claimAndPersist({ ...options, fetchImpl: async () => response(value) });
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('must not call a room endpoint'); };
  try {
    const result = await revealPartyCardReward(value.rewardId);
    assert.equal(result.ok, true);
    assert.ok(options.getStoredProfile().cardRewards[0].revealedAt);
  } finally { globalThis.fetch = original; }
});

test('refuses success if profile storage drops the import write', async () => {
  const options = context();
  localStorage.setItem = () => {};
  await assert.rejects(claimAndPersist({ ...options, fetchImpl: async () => response(reward()) }), { code: 'STORAGE_FAILED' });
  assert.equal(options.getStoredProfile().cardRewards.length, 0);
});

test('rejects expired or already bound receipts without importing a card', async () => {
  for (const code of ['RECEIPT_EXPIRED', 'CLAIMED_BY_ANOTHER_PROFILE']) {
    const options = context();
    await assert.rejects(claimAndPersist({ ...options,
      fetchImpl: async () => ({ ok: false, json: async () => ({ ok: false, code }) }),
    }), { code });
    assert.equal(options.getStoredProfile().ownedCards.length, 0);
  }
});

test('a profile change while claiming cannot give the bound card to the new profile', async () => {
  const options = context();
  await assert.rejects(claimAndPersist({ ...options, fetchImpl: async () => {
    createProfile({ alias: 'Other learner', avatarId: 'white_cat' });
    return response(reward());
  } }), { code: 'PROFILE_CHANGED' });
  assert.equal(options.getStoredProfile().cardRewards.length, 0);
});

test('invalid reward data and network failures cannot manufacture a local reward', async () => {
  for (const override of [{ cardId: 'NONEXISTENT' }, { questId: 'another-course' }, { earnedAt: 'not-a-date' }]) {
    const options = context();
    await assert.rejects(claimAndPersist({ ...options, fetchImpl: async () => response({ ...reward(), ...override }) }), { code: 'INVALID_REWARD' });
    assert.equal(options.getStoredProfile().ownedCards.length, 0);
  }
  const options = context();
  await assert.rejects(claimAndPersist({ ...options, fetchImpl: async () => { throw new Error('offline'); } }), { code: 'NETWORK' });
  assert.equal(options.getStoredProfile().ownedCards.length, 0);
});

function entry(hash, session = storage()) {
  const source = readFileSync(new URL('../course-card/index.html', import.meta.url), 'utf8');
  const script = source.match(/<script id="course-card-entry">([\s\S]*?)<\/script>/)[1];
  const replaced = [];
  const handlers = {};
  const c = { window: { addEventListener: (name, fn) => { handlers[name] = fn; } }, location: { hash, pathname: '/course-card/', search: '', reload() { c.reloaded = true; } },
    history: { replaceState: (...args) => replaced.push(args[2]) }, sessionStorage: session };
  vm.runInNewContext(script, c);
  return { ...c.window.__COURSE_CARD_ENTRY__, replaced, session, handlers, context: c };
}

test('receipt leaves the address immediately, survives a same-tab retry, and never goes in the query', () => {
  const first = entry('#' + TOKEN);
  assert.deepEqual(first.replaced, ['/course-card/']);
  assert.equal(first.token, TOKEN);
  const retry = entry('', first.session);
  assert.equal(retry.token, TOKEN);
  assert.equal(retry.fresh, false);
});

test('invalid fresh fragment cannot fall back to a different receipt; unavailable session storage still strips it', () => {
  const session = storage(); session.setItem('teambook_course_card_receipt_v1', TOKEN);
  const invalid = entry('#bad%20receipt', session);
  assert.equal(invalid.token, ''); assert.equal(invalid.invalid, true);
  assert.equal(session.getItem('teambook_course_card_receipt_v1'), null);
  const blocked = entry('#' + TOKEN, { setItem() { throw new Error('blocked'); } });
  assert.equal(blocked.token, TOKEN);
  assert.deepEqual(blocked.replaced, ['/course-card/']);
});

test('opening a new receipt in an existing bridge tab strips it and restarts from same-tab storage', () => {
  const opened = entry('');
  opened.context.location.hash = '#' + TOKEN;
  opened.handlers.hashchange();
  assert.deepEqual(opened.replaced, ['/course-card/']);
  assert.equal(opened.session.getItem('teambook_course_card_receipt_v1'), TOKEN);
  assert.equal(opened.context.reloaded, true);
});

test('only this course reward gets the fixed join continuation; arbitrary destinations cannot redirect', () => {
  const value = reward();
  assert.match(courseRevealPath(value), /^\/reveal\/\?r=course_[^&]+&course=thedent$/);
  assert.equal(courseContinuation(value, new URLSearchParams('course=thedent&next=https://evil.example')), '/join/?c=52113');
  assert.equal(courseContinuation(value, new URLSearchParams('course=other')), null);
  assert.equal(courseContinuation({ ...value, questId: 'party-complete:52113' }, new URLSearchParams('course=thedent')), null);
});

test('course card page is published and keeps a direct join fallback independent of claim success', () => {
  const builder = readFileSync(new URL('../scripts/build-static.mjs', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../course-card/index.html', import.meta.url), 'utf8');
  assert.match(builder, /'course-card'/);
  assert.match(html, /href="\/join\/\?c=52113"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.ok(html.indexOf('id="course-card-entry"') < html.indexOf('rel="stylesheet"'));
});
