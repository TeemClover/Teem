import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  clear() { this.#values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.crypto ||= webcrypto;

const store = await import('./store.js');
const account = await import('./account.js');

test.beforeEach(() => localStorage.clear());

test('legacy object avatar migrates to an animal and receives all V1 pets', () => {
  localStorage.setItem('mc_xty_profile', JSON.stringify({
    id: 'legacy-player', alias: 'คีน', avatar: '🍀', petIds: ['pig'],
    createdAt: '2026-08-01T00:00:00.000Z',
  }));

  const profile = store.getProfile();
  assert.equal(profile.version, 2);
  assert.equal(profile.avatarId, 'orange_cat');
  assert.equal(profile.avatarFrame, 'green');
  assert.equal(
    ['pig', 'buffalo', 'dog', 'unicorn', 'crow', 'cat', 'chicken', 'turtle']
      .every(id => profile.petIds.includes(id)),
    true,
  );
});

test('launch capacity is create 1, join 3, total 4', () => {
  const profile = store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'blue' });
  localStorage.setItem('mc_xty_parties', JSON.stringify([
    { code: '0123', ownerId: 'u_lead', state: 'ACTIVE', members: [], log: [] },
    { code: '1234', ownerId: 'someone_else', state: 'RECRUITING', members: [], log: [] },
    { code: '2345', ownerId: 'u_old', state: 'ARCHIVED', members: [], log: [] },
  ]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({
    '0123': { token: 'a', userId: 'u_lead' },
    '1234': { token: 'b', userId: 'u_member' },
    '2345': { token: 'c', userId: 'u_old' },
  }));

  assert.deepEqual(store.activePartyUsage(profile), {
    owned: 1, joined: 1, total: 2, maxOwned: 1, maxJoined: 3, maxTotal: 4,
  });
  assert.equal(profile.avatarFrame, 'blue');
});

test('invite code is exactly four digits and keeps possible leading zeroes as text', () => {
  for (let i = 0; i < 50; i += 1) assert.match(store.inviteCode(), /^\d{4}$/);
});

test('cloud merge keeps newest animal avatar and frame, unions pets, and never sums points', () => {
  const local = {
    id: 'local-id', alias: 'Local', avatarId: 'orange_cat', avatarFrame: 'red',
    petIds: ['pig'], pointsBalance: 8,
    createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-14T10:00:00.000Z',
  };
  const cloud = {
    id: 'cloud-id', alias: 'Cloud', avatarId: 'white_pom', avatarFrame: 'blue',
    petIds: ['dog'], pointsBalance: 5,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z',
  };

  const merged = account.mergeXtyProfile(local, cloud);
  assert.equal(merged.id, 'cloud-id');
  assert.equal(merged.alias, 'Local');
  assert.equal(merged.avatarId, 'orange_cat');
  assert.equal(merged.avatarFrame, 'red');
  assert.equal(merged.pointsBalance, 8);
  assert.ok(merged.petIds.includes('pig'));
  assert.ok(merged.petIds.includes('dog'));
  assert.equal(merged.createdAt, '2026-08-01T00:00:00.000Z');
});
