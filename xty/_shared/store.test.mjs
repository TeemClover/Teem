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
const cards = await import('./cards.js');

test.beforeEach(() => localStorage.clear());

test('legacy object avatar migrates to an animal and receives all V1 pets', () => {
  localStorage.setItem('mc_xty_profile', JSON.stringify({
    id: 'legacy-player', alias: 'คีน', avatar: '🍀', petIds: ['pig'],
    createdAt: '2026-08-01T00:00:00.000Z',
  }));

  const profile = store.getProfile();
  assert.equal(profile.version, 3);
  assert.equal(profile.avatarId, 'orange_cat');
  assert.equal(profile.avatarFrame, 'green');
  assert.equal(profile.equippedCardId, 'ORANGE_CAT_GREEN_001');
  assert.deepEqual(profile.ownedCards.map(item => item.cardId), ['ORANGE_CAT_GREEN_001']);
  assert.equal(
    ['pig', 'buffalo', 'dog', 'unicorn', 'crow', 'cat', 'chicken', 'turtle']
      .every(id => profile.petIds.includes(id)),
    true,
  );
});

test('universal launch catalog has one durable card for every animal and RGBS color', () => {
  assert.equal(cards.XTY_CARDS.length, 48);
  assert.equal(new Set(cards.XTY_CARDS.map(card => card.cardId)).size, 48);
  for (const animal of new Set(cards.XTY_CARDS.map(card => card.species))) {
    assert.deepEqual(
      cards.XTY_CARDS.filter(card => card.species === animal).map(card => card.color).sort(),
      ['blue', 'green', 'red', 'silver'],
    );
  }
});

test('starter card follows the chosen animal and color and is immediately usable', () => {
  const profile = store.createProfile({ alias: 'Keen', avatarId: 'turtle', avatarFrame: 'silver' });
  assert.equal(profile.starterCardId, 'TURTLE_SILVER_001');
  assert.equal(profile.equippedCardId, profile.starterCardId);
  assert.equal(store.ownedCardIds().includes(profile.starterCardId), true);
  assert.equal(store.availableOwnedCards()[0].cardId, profile.starterCardId);
});

test('a card is locked only by an active role in a party this player owns', () => {
  const profile = store.createProfile({ alias: 'Keen', avatarId: 'turtle', avatarFrame: 'silver' });
  const party = {
    code: '0123', ownerId: 'u_other', state: 'ACTIVE', leadCardId: profile.starterCardId,
    members: [], log: [],
  };
  localStorage.setItem('mc_xty_parties', JSON.stringify([party]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({ '0123': { token: 'x', userId: 'u_member' } }));
  assert.equal(store.cardAvailability(profile.starterCardId).status, 'AVAILABLE');

  localStorage.setItem('mc_xty_parties', JSON.stringify([{ ...party, ownerId: 'u_owner' }]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({ '0123': { token: 'x', userId: 'u_owner' } }));
  assert.equal(store.cardAvailability(profile.starterCardId).status, 'IN_PARTY');
});

test('quest reward is persisted before reveal, cannot reroll, and never duplicates', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'green' });
  const first = store.prepareCardReward({ questId: 'party-complete:0001', partyCode: '0001' });
  const reloaded = store.prepareCardReward({ questId: 'party-complete:0001', partyCode: '0001' });
  assert.equal(reloaded.rewardId, first.rewardId);
  assert.equal(reloaded.cardId, first.cardId);
  assert.equal(store.ownedCardIds().includes(first.cardId), true);
  assert.equal(store.pendingCardReward().cardId, first.cardId);

  const starterCardId = store.getProfile().starterCardId;
  store.useCardAsAvatar(first.cardId);
  assert.equal(store.getProfile().equippedCardId, first.cardId);
  assert.equal(store.getProfile().starterCardId, starterCardId);

  store.markCardRewardRevealed(first.rewardId);
  const second = store.prepareCardReward({ questId: 'party-complete:0002', partyCode: '0002' });
  assert.notEqual(second.cardId, first.cardId);
  assert.equal(new Set(store.ownedCardIds()).size, store.ownedCardIds().length);
});

test('collection exhaustion reports complete instead of issuing a duplicate', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'green' });
  for (let index = 0; index < 47; index += 1) {
    const reward = store.prepareCardReward({ questId: `quest-${index}`, partyCode: String(index).padStart(4, '0') });
    assert.ok(reward.cardId);
  }
  assert.equal(store.ownedCardIds().length, 48);
  assert.equal(new Set(store.ownedCardIds()).size, 48);
  const exhausted = store.prepareCardReward({ questId: 'quest-exhausted', partyCode: '9999' });
  assert.equal(exhausted.cardId, null);
  assert.equal(exhausted.complete, true);
});

test('Ending Markdown is comic-ready and never leaks member ids', () => {
  const ending = store.buildEndingMarkdown({
    code: '0123', name: 'เดินด้วยกัน', activity: 'เดิน 20 นาที', commitRule: 'เดินจริงแล้วค่อย Commit',
    durationDays: 7, preset: 'casual', color: 'green', state: 'DISSOLVED',
    createdAt: '2026-08-01T00:00:00.000Z', endedAt: '2026-08-04T00:00:00.000Z',
    leadCardId: 'ORANGE_CAT_GREEN_001', npcCardId: 'TURTLE_SILVER_001',
    memberHistory: [
      { userId: 'account:secret-lead-id', alias: 'คีน', role: 'lead', joinedAt: '2026-08-01T00:00:00.000Z' },
      { userId: 'local:secret-member-id', alias: 'กล้วย', role: 'member', joinedAt: '2026-08-01T00:00:00.000Z', leftAt: '2026-08-03T00:00:00.000Z' },
    ],
    members: [],
    events: [
      { type: 'PARTY_CREATED', partyDay: 1, at: '2026-08-01T00:00:00.000Z', data: { name: 'เดินด้วยกัน' } },
      { type: 'MEMBER_KICKED', partyDay: 3, at: '2026-08-03T00:00:00.000Z', data: { alias: 'กล้วย', userId: 'secret-member-id' } },
      { type: 'PARTY_DISSOLVED', partyDay: 4, at: '2026-08-04T00:00:00.000Z', data: {} },
    ],
    log: [{
      seq: 1, kind: 'commit', userId: 'account:secret-lead-id', sentAt: '2026-08-01T08:00:00.000Z',
      retracted: false, reactions: { '🍀': ['local:secret-member-id'] }, confirmedBy: 'local:secret-member-id',
    }],
  }, { generatedAt: '2026-08-05T00:00:00.000Z' });

  assert.match(ending, /# XTY Party Ending/);
  assert.match(ending, /## 4-Panel Comic Prompt/);
  assert.match(ending, /## Important Changes/);
  assert.match(ending, /## Funny \/ Memorable Moments/);
  assert.match(ending, /## Poster Prompt/);
  assert.match(ending, /DISSOLVED/);
  assert.doesNotMatch(ending, /secret-lead-id|secret-member-id/);
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
  assert.ok(merged.ownedCards.some(card => card.cardId === 'ORANGE_CAT_RED_001'));
  assert.ok(merged.ownedCards.some(card => card.cardId === 'WHITE_POM_BLUE_001'));
});
