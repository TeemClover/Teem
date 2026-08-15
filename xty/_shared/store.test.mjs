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
const cardUi = await import('./card-ui.js');

test.beforeEach(() => localStorage.clear());

test('legacy profile migrates without inventing a starter card', () => {
  localStorage.setItem('mc_xty_profile', JSON.stringify({
    id: 'legacy-player', alias: 'คีน', avatar: '🍀', petIds: ['pig'],
    createdAt: '2026-08-01T00:00:00.000Z',
  }));
  const profile = store.getProfile();
  assert.equal(profile.version, 5);
  assert.equal(profile.avatarId, 'orange_cat');
  assert.equal(profile.avatarFrame, 'green');
  assert.equal(profile.starterCardId, null);
  assert.equal(profile.equippedCardId, null);
  assert.deepEqual(profile.ownedCards, []);
  assert.equal(profile.level, 1);
  assert.equal(
    ['pig', 'buffalo', 'dog', 'unicorn', 'crow', 'cat', 'chicken', 'turtle']
      .every(id => profile.petIds.includes(id)),
    true,
  );
});

test('catalog contains 48 common and 12 rare cards with separate cover rights', () => {
  assert.equal(cards.XTY_CARDS.length, 60);
  assert.equal(cards.XTY_COMMON_CARDS.length, 48);
  assert.equal(cards.XTY_RARE_CARDS.length, 12);
  assert.equal(new Set(cards.XTY_CARDS.map(card => card.cardId)).size, 60);
  assert.equal(cards.XTY_COMMON_CARDS.every(card => !card.eligibility.partyCover), true);
  assert.equal(cards.XTY_RARE_CARDS.every(card => card.eligibility.partyCover), true);
  assert.equal(cards.XTY_RARE_CARDS.every(card => /\/xty\/assets\/cards\/rare\/.+\.webp$/.test(card.imageFull)), true);
  assert.deepEqual(cards.XTY_CARD_RARITIES, ['common', 'rare', 'epic', 'legendary']);
  assert.equal(cards.XTY_CARD_RULES.common.partyCover, false);
  assert.equal(cards.XTY_CARD_RULES.epic.frame, 'premium-gold');
  assert.equal(cards.XTY_CARD_RULES.legendary.maxPerSpecies, 1);
  assert.equal(cards.XTY_CARD_RULES.legendary.colorVariants, false);
  assert.deepEqual(cards.validateCardCatalog(), []);
  assert.equal(cards.XTY_CARDS.every(card => card.name === card.speciesNameTh), true);
  assert.equal(cards.XTY_CARDS.every(card => card.accessoryColor === card.color), true);
  assert.equal(cards.XTY_CARDS.every(card => [
    'image', 'flavorText', 'description', 'usableAsAvatar', 'usableAsNpc',
    'usableAsPartyCover', 'playableInCore7', 'status', 'unlockMethod',
  ].every(key => key in card)), true);
  assert.equal(cards.cardById('ORANGE_CAT_GREEN_001').cardId, 'ORANGE_CAT_GREEN_COMMON_001');
  assert.equal(cards.cardNameTh('ORANGE_CAT_GREEN_COMMON_001'), 'แมวส้ม');
  assert.match(cards.cardDescriptorTh('ORANGE_CAT_GREEN_COMMON_001'), /แมวส้ม · สีเขียว · COMMON/);
  const markup = cardUi.cardMarkup('ORANGE_CAT_GREEN_COMMON_001');
  assert.match(markup, /class="card-accessory"/);
  assert.match(markup, /class="color-badge">เขียว/);
  assert.match(markup, /<b>แมวส้ม<\/b><small>สีเขียว · COMMON<\/small>/);
});

test('new profile starts at level 1 with a free avatar and no owned cards', () => {
  const profile = store.createProfile({ alias: 'Keen', avatarId: 'turtle', avatarFrame: 'silver' });
  assert.equal(profile.level, 1);
  assert.equal(profile.avatarId, 'turtle');
  assert.equal(profile.avatarFrame, 'silver');
  assert.equal(profile.starterCardId, null);
  assert.equal(profile.equippedCardId, null);
  assert.deepEqual(store.ownedCardIds(), []);
  assert.deepEqual(store.availableOwnedCards(), []);
});

test('a rewarded card is persisted before reveal and cannot be rerolled', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'green' });
  const first = store.prepareCardReward({ questId: 'party-complete:00001', partyCode: '00001' });
  const reloaded = store.prepareCardReward({ questId: 'party-complete:00001', partyCode: '00001' });
  assert.equal(reloaded.rewardId, first.rewardId);
  assert.equal(reloaded.cardId, first.cardId);
  assert.equal(store.ownedCardIds().includes(first.cardId), true);
  assert.equal(store.pendingCardReward().cardId, first.cardId);
  assert.equal(store.shouldOfferProgressSave(), true);
  const used = store.useCardAsAvatar(first.cardId);
  assert.equal(used.equippedCardId, first.cardId);
  store.markCardRewardRevealed(first.rewardId);
  const second = store.prepareCardReward({ questId: 'party-complete:00002', partyCode: '00002' });
  assert.notEqual(second.cardId, first.cardId);
  assert.equal(new Set(store.ownedCardIds()).size, store.ownedCardIds().length);
});

test('collection exhaustion returns complete instead of issuing a duplicate', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'green' });
  for (let index = 0; index < 60; index += 1) {
    const reward = store.prepareCardReward({ questId: `quest-${index}`, partyCode: String(index).padStart(5, '0') });
    assert.ok(reward.cardId);
  }
  assert.equal(store.ownedCardIds().length, 60);
  assert.equal(new Set(store.ownedCardIds()).size, 60);
  const exhausted = store.prepareCardReward({ questId: 'quest-exhausted', partyCode: '99999' });
  assert.equal(exhausted.cardId, null);
  assert.equal(exhausted.complete, true);
});

test('collection debug codes unlock and discard the whole data-driven catalog', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'green' });
  const unlocked = store.applyCollectionDebugCode('getallitem');
  assert.equal(unlocked.ok, true);
  assert.equal(store.ownedCardIds().length, cards.XTY_CARDS.length);
  const discarded = store.applyCollectionDebugCode('discard');
  assert.equal(discarded.ok, true);
  assert.deepEqual(store.ownedCardIds(), []);
  assert.deepEqual(store.getProfile().cardRewards, []);
  assert.equal(store.applyCollectionDebugCode('unknown').error, 'INVALID_DEBUG_CODE');
});

test('card placement only locks an owned role in a party controlled by this player', () => {
  store.createProfile({ alias: 'Keen', avatarId: 'turtle', avatarFrame: 'silver' });
  const reward = store.prepareCardReward({ questId: 'first', partyCode: '01234' });
  const party = { code: '01234', ownerId: 'u_other', state: 'ACTIVE', leadCardId: reward.cardId, members: [], log: [] };
  localStorage.setItem('mc_xty_parties', JSON.stringify([party]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({ '01234': { token: 'x', userId: 'u_member' } }));
  assert.equal(store.cardAvailability(reward.cardId).status, 'AVAILABLE');
  localStorage.setItem('mc_xty_parties', JSON.stringify([{ ...party, ownerId: 'u_owner' }]));
  localStorage.setItem('mc_xty_tokens', JSON.stringify({ '01234': { token: 'x', userId: 'u_owner' } }));
  assert.equal(store.cardAvailability(reward.cardId).status, 'IN_PARTY');
});

test('owned-party capacity follows level and unlocked paid milestones', () => {
  const level1 = store.createProfile({ alias: 'Keen', avatarId: 'orange_cat', avatarFrame: 'blue' });
  assert.deepEqual(store.activePartyUsage(level1), {
    owned: 0, joined: 0, total: 0, maxOwned: 1, maxJoined: 3, maxTotal: 4,
  });
  const level4 = store.normalizeProfile({ ...level1, level: 4 });
  assert.equal(store.maxOwnedActiveParties(level4), 4);
  assert.equal(store.maxActiveParties(level4), 7);
  const max = store.normalizeProfile({ ...level1, level: 4, paidTier: 'max', unlockedBonusSlots: 3 });
  assert.equal(store.maxOwnedActiveParties(max), 7);
  assert.equal(store.maxActiveParties(max), 10);
});

test('invite code is exactly five digits and preserves leading zeroes as text', () => {
  for (let index = 0; index < 100; index += 1) assert.match(store.inviteCode(), /^\d{5}$/);
});

test('completion gate stays locked until Bangkok midnight after the final quest day', () => {
  const party = { startAt: '2026-08-15T10:00:00.000Z', durationDays: 7 };
  const locked = store.partyCompletionState(party, new Date('2026-08-21T16:59:59.999Z'));
  const open = store.partyCompletionState(party, new Date('2026-08-21T17:00:00.000Z'));
  assert.equal(locked.eligible, false);
  assert.equal(locked.day, 7);
  assert.equal(open.eligible, true);
  assert.equal(open.scheduledEndAt, '2026-08-21T17:00:00.000Z');
});

test('completed party gets one final message allowance with no daily refill', () => {
  const party = {
    state: 'COMPLETED', budget: 'normal', endAt: '2026-08-15T10:00:00.000Z',
    log: [
      { kind: 'message', userId: 'u1', sentAt: '2026-08-15T09:59:59.000Z' },
      { kind: 'message', userId: 'u1', sentAt: '2026-08-15T10:00:01.000Z' },
      { kind: 'message', userId: 'u1', sentAt: '2026-08-16T10:00:01.000Z' },
    ],
  };
  assert.deepEqual(store.messageAllowance(party, 'u1'), {
    phase: 'final', limit: 3, used: 2, left: 1, writable: true,
  });
  party.log.push({ kind: 'message', userId: 'u1', sentAt: '2026-08-18T10:00:01.000Z' });
  assert.deepEqual(store.messageAllowance(party, 'u1'), {
    phase: 'history', limit: 3, used: 3, left: 0, writable: false,
  });
});

test('confirm mode separates waiting commits from valid progress', () => {
  const progress = store.partyProgress({
    startAt: '2026-08-14T17:00:00.000Z', durationDays: 2, verificationMode: 'confirm',
    log: [
      { kind: 'commit', userId: 'u1', sentAt: '2026-08-15T08:00:00.000Z', valid: false },
      { kind: 'commit', userId: 'u2', sentAt: '2026-08-15T09:00:00.000Z', confirmedBy: 'u1' },
    ],
  });
  assert.deepEqual(progress[0], { day: 1, key: '2026-08-15', count: 2, validCount: 1, waitingCount: 1 });
});

test('Ending Markdown is portable and never leaks member ids', () => {
  const ending = store.buildEndingMarkdown({
    code: '01234', name: 'เดินด้วยกัน', activity: 'เดิน 20 นาที', commitRule: 'เดินจริงแล้วค่อย Commit',
    durationDays: 7, preset: 'casual', color: 'green', state: 'DISSOLVED',
    createdAt: '2026-08-01T00:00:00.000Z', endedAt: '2026-08-04T00:00:00.000Z',
    memberHistory: [
      { userId: 'account:secret-lead-id', alias: 'คีน', role: 'lead', joinedAt: '2026-08-01T00:00:00.000Z' },
      { userId: 'local:secret-member-id', alias: 'กล้วย', role: 'member', joinedAt: '2026-08-01T00:00:00.000Z' },
    ],
    members: [], events: [{ type: 'PARTY_DISSOLVED', partyDay: 4, at: '2026-08-04T00:00:00.000Z', data: {} }],
    log: [{ seq: 1, kind: 'commit', userId: 'account:secret-lead-id', sentAt: '2026-08-01T08:00:00.000Z', retracted: false, reactions: {} }],
  }, { generatedAt: '2026-08-05T00:00:00.000Z' });
  assert.match(ending, /# XTY Party Ending/);
  assert.match(ending, /## 4-Panel Comic Prompt/);
  assert.match(ending, /DISSOLVED/);
  assert.doesNotMatch(ending, /secret-lead-id|secret-member-id/);
});

test('cloud merge keeps durable id, highest level, and unions card ownership', () => {
  const local = {
    id: 'local-id', alias: 'Local', avatarId: 'orange_cat', avatarFrame: 'red', level: 3,
    ownedCards: [{ cardId: 'ORANGE_CAT_RED_COMMON_001', acquiredAt: '2026-08-10T00:00:00.000Z' }],
    createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-14T10:00:00.000Z',
  };
  const cloud = {
    id: 'cloud-id', alias: 'Cloud', avatarId: 'white_pom', avatarFrame: 'blue', level: 2,
    ownedCards: [{ cardId: 'WHITE_POM_BLUE_COMMON_001', acquiredAt: '2026-08-09T00:00:00.000Z' }],
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z',
  };
  const merged = account.mergeXtyProfile(local, cloud);
  assert.equal(merged.id, 'cloud-id');
  assert.equal(merged.alias, 'Local');
  assert.equal(merged.level, 3);
  assert.equal(merged.ownedCards.length, 2);
  assert.equal(merged.createdAt, '2026-08-01T00:00:00.000Z');
});

test('newer collection reset tombstone prevents cloud cards from reappearing', () => {
  const local = {
    id: 'local-id', alias: 'Local', avatarId: 'orange_cat', avatarFrame: 'red',
    ownedCards: [], cardRewards: [], collectionResetAt: '2026-08-15T12:00:00.000Z',
    createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-15T12:00:00.000Z',
  };
  const cloud = {
    id: 'cloud-id', alias: 'Cloud', avatarId: 'white_pom', avatarFrame: 'blue',
    ownedCards: [{ cardId: 'WHITE_POM_BLUE_COMMON_001', acquiredAt: '2026-08-14T00:00:00.000Z' }],
    cardRewards: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-14T10:00:00.000Z',
  };
  const merged = account.mergeXtyProfile(local, cloud);
  assert.deepEqual(merged.ownedCards, []);
  assert.equal(merged.collectionResetAt, '2026-08-15T12:00:00.000Z');
});
