import test from 'node:test';
import assert from 'node:assert/strict';

/* store.js runs the epoch check at module load, so the fake storage has to be
   in place before the import — hence a file of its own rather than another
   case inside store.test.mjs. Each case imports a fresh module instance so the
   load-time check runs against its own storage. */
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

const LIVED_IN = {
  mc_xty_profile: '{"id":"live","alias":"เก่า"}',
  mc_xty_parties: '[{"code":"12345"}]',
  mc_xty_tokens: '{"12345":"t"}',
  mc_xty_profile_ids: '["live"]',
  mc_xty_public_hide_full: '1',
  'c7:collection': '{"cards":["FIRST_HAND_001"]}',
  mc_session: 'account-session',
};
const TEAMBOOK_KEYS = ['mc_xty_profile', 'mc_xty_parties', 'mc_xty_tokens',
                       'mc_xty_profile_ids', 'mc_xty_public_hide_full'];

let instance = 0;
async function bootWith(storage) {
  globalThis.localStorage = storage;
  await import(`./store.js?epoch-case=${instance++}`);
  return storage;
}

/* The bug this file exists for: the first deploy after the epoch shipped wiped
   every device that had been playing, because none of them carried the stamp
   yet. A missing stamp means "from before the epoch", not "missed a wipe". */
test('a device that predates the epoch keeps its books and is adopted', async () => {
  const storage = await bootWith(fakeStorage({ ...LIVED_IN }));
  for (const key of TEAMBOOK_KEYS) {
    assert.equal(storage.has(key), true, `${key} must survive — no wipe was asked for`);
  }
  assert.equal(storage.getItem('mc_xty_profile'), '{"id":"live","alias":"เก่า"}');
  assert.equal(storage.getItem('mc_tb_data_epoch'), '1', 'it is stamped for next time');
});

test('a device already on the current epoch keeps its books', async () => {
  const storage = await bootWith(fakeStorage({ ...LIVED_IN, mc_tb_data_epoch: '1' }));
  for (const key of TEAMBOOK_KEYS) assert.equal(storage.has(key), true);
});

test('a device behind a bumped epoch is cleared exactly once', async () => {
  /* Stamped 0, which is behind the shipped 1 — the shape of a real bump. */
  const storage = await bootWith(fakeStorage({ ...LIVED_IN, mc_tb_data_epoch: '0' }));
  for (const key of TEAMBOOK_KEYS) {
    assert.equal(storage.has(key), false, `${key} should have been dropped by the bump`);
  }
  assert.equal(storage.getItem('mc_tb_data_epoch'), '1');
});

test('a rollback never wipes: a device ahead of the code is left alone', async () => {
  const storage = await bootWith(fakeStorage({ ...LIVED_IN, mc_tb_data_epoch: '9' }));
  for (const key of TEAMBOOK_KEYS) assert.equal(storage.has(key), true);
  assert.equal(storage.getItem('mc_tb_data_epoch'), '9', 'and its stamp is not rewound');
});

test('the epoch never reaches CORE7 or the account session', async () => {
  const storage = await bootWith(fakeStorage({ ...LIVED_IN, mc_tb_data_epoch: '0' }));
  assert.equal(storage.getItem('c7:collection'), '{"cards":["FIRST_HAND_001"]}');
  assert.equal(storage.getItem('mc_session'), 'account-session');
});

test('a brand new device starts stamped and empty', async () => {
  const storage = await bootWith(fakeStorage({}));
  assert.equal(storage.getItem('mc_tb_data_epoch'), '1');
  for (const key of TEAMBOOK_KEYS) assert.equal(storage.has(key), false);
});
