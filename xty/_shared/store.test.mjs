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

test('legacy 0-slot profile migrates to Hand 1 and receives all V1 pets', () => {
  localStorage.setItem('mc_xty_profile', JSON.stringify({
    id: 'legacy-player',
    alias: 'คีน',
    avatar: '🍀',
    maxProfileCardSlots: 0,
    profileCardIds: [],
    petIds: ['pig', 'dog', 'crow', 'chicken'],
    createdAt: '2026-08-01T00:00:00.000Z',
  }));

  const profile = store.getProfile();
  assert.equal(profile.version, 2);
  assert.equal(profile.handSize, 1);
  assert.equal(profile.avatarId, 'clover');
  assert.deepEqual(
    ['pig', 'buffalo', 'dog', 'unicorn', 'crow', 'cat', 'chicken', 'turtle'].every(id => profile.petIds.includes(id)),
    true,
  );
});

test('capacity formula keeps create 1 plus join 1 at Hand 1', () => {
  const profile = store.createProfile({ alias: 'Keen', avatarId: 'clover' });
  localStorage.setItem('mc_xty_parties', JSON.stringify([
    { code: 'AAA-111', ownerId: 'u_lead', state: 'ACTIVE', members: [], log: [] },
    { code: 'BBB-222', ownerId: 'someone_else', state: 'RECRUITING', members: [], log: [] },
    { code: 'CCC-333', ownerId: 'u_old', state: 'ARCHIVED', members: [], log: [] },
  ]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({
    'AAA-111': { token: 'a', userId: 'u_lead' },
    'BBB-222': { token: 'b', userId: 'u_member' },
    'CCC-333': { token: 'c', userId: 'u_old' },
  }));

  const usage = store.activePartyUsage(profile);
  assert.deepEqual(usage, { owned: 1, joined: 1, total: 2, maxOwned: 1, maxJoined: 1, maxTotal: 2 });
});

test('Hand 2 allows three active parties but no invented unlock rule', () => {
  const profile = store.normalizeProfile({ id: 'hand-two', alias: 'Two', handSize: 2, petIds: [] });
  assert.equal(store.maxOwnedActiveParties(profile), 2);
  assert.equal(store.maxJoinedActiveParties(profile), 2);
  assert.equal(store.maxActiveParties(profile), 3);
});

test('cloud merge keeps highest Hand, unions pets, and never sums points', () => {
  const local = {
    id: 'local-id', alias: 'Local', avatarId: 'sun', handSize: 2,
    petIds: ['pig'], pointsBalance: 8,
    createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-14T10:00:00.000Z',
  };
  const cloud = {
    id: 'cloud-id', alias: 'Cloud', avatarId: 'cloud', handSize: 1,
    petIds: ['dog'], pointsBalance: 5,
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z',
  };

  const merged = account.mergeXtyProfile(local, cloud);
  assert.equal(merged.id, 'cloud-id');
  assert.equal(merged.alias, 'Local');
  assert.equal(merged.avatarId, 'sun');
  assert.equal(merged.handSize, 2);
  assert.equal(merged.pointsBalance, 8);
  assert.ok(merged.petIds.includes('pig'));
  assert.ok(merged.petIds.includes('dog'));
  assert.equal(merged.createdAt, '2026-08-01T00:00:00.000Z');
});

