import test from 'node:test';
import assert from 'node:assert/strict';

/* store.js runs the epoch check at module load, so the fake storage has to be
   in place before the import — hence a file of its own rather than another
   case inside store.test.mjs. */
function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); },
    has: key => map.has(key),
    keys: () => [...map.keys()],
  };
}

const storage = fakeStorage({
  mc_xty_profile: '{"id":"old","alias":"เก่า"}',
  mc_xty_parties: '[{"code":"12345"}]',
  mc_xty_tokens: '{"12345":"t"}',
  mc_xty_profile_ids: '["old"]',
  mc_xty_public_hide_full: '1',
  'c7:collection': '{"cards":["FIRST_HAND_001"]}',
  mc_session: 'account-session',
});
globalThis.localStorage = storage;

await import('./store.js');

test('a data-epoch bump clears this device TeamBook state exactly once', () => {
  for (const key of ['mc_xty_profile', 'mc_xty_parties', 'mc_xty_tokens',
                     'mc_xty_profile_ids', 'mc_xty_public_hide_full']) {
    assert.equal(storage.has(key), false, `${key} should have been dropped by the epoch`);
  }
  assert.equal(storage.getItem('mc_tb_data_epoch'), '1');
});

test('the epoch never reaches CORE7 or the account session', () => {
  assert.equal(storage.getItem('c7:collection'), '{"cards":["FIRST_HAND_001"]}');
  assert.equal(storage.getItem('mc_session'), 'account-session');
});

test('a device already on the current epoch keeps its books', async () => {
  const current = fakeStorage({
    mc_tb_data_epoch: '1',
    mc_xty_profile: '{"id":"live"}',
    mc_xty_parties: '[{"code":"54321"}]',
  });
  globalThis.localStorage = current;
  /* A fresh module instance re-runs the load-time check against this storage. */
  await import(`./store.js?epoch-check=${Date.now()}`);
  assert.equal(current.getItem('mc_xty_profile'), '{"id":"live"}');
  assert.equal(current.getItem('mc_xty_parties'), '[{"code":"54321"}]');
});
