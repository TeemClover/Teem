import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMBOOK_CARDS } from './cards.js';
import {
  buildFinalCastSnapshot, finalCastPrompt, finalCastReferences,
} from './ending-cast-v12.js';

test('final cast uses final members and preserves duplicate animals with different marker colors', () => {
  const party = {
    ownerId: 'u1',
    endAt: '2026-08-22T04:00:00.000Z',
    members: [
      { userId: 'u1', alias: 'Som', role: 'lead', avatar: 'white_cat', avatarColor: 'green' },
      { userId: 'u2', alias: 'Teem', role: 'member', avatar: 'white_cat', avatarColor: 'red' },
    ],
    memberHistory: [
      { userId: 'gone', alias: 'Old', role: 'member', avatar: 'pig', avatarColor: 'blue', leftAt: '2026-08-20T00:00:00Z' },
    ],
    petId: 'turtle',
  };
  const snapshot = buildFinalCastSnapshot(party);
  assert.equal(snapshot.members.length, 2);
  assert.deepEqual(snapshot.members.map(item => item.species), ['white_cat', 'white_cat']);
  assert.deepEqual(snapshot.members.map(item => item.markerColor), ['green', 'red']);
  assert.equal(snapshot.members.some(item => item.entityId === 'gone'), false);
  assert.equal(snapshot.companion?.species, 'turtle');
});

test('card identity stays canonical while player marker color remains separate', () => {
  const card = TEAMBOOK_CARDS.find(item => item?.species && item?.cardId);
  assert.ok(card, 'test requires one TeamBook card');
  const snapshot = buildFinalCastSnapshot({
    members: [{ userId: 'u1', alias: 'A', role: 'lead', avatar: card.cardId, avatarColor: 'silver' }],
  });
  const member = snapshot.members[0];
  assert.equal(member.cardId, card.cardId);
  assert.equal(member.species, card.species);
  assert.equal(member.nativeCardColor, card.color || '');
  assert.equal(member.markerColor, 'silver');
});

test('Ending cast prompt knows owner, member, companion, persona and forbids humans', () => {
  const snapshot = buildFinalCastSnapshot({
    members: [
      { userId: 'u1', alias: 'Owner', role: 'lead', avatar: 'unicorn', avatarColor: 'green' },
      { userId: 'u2', alias: 'Friend', role: 'member', avatar: 'cat', avatarColor: 'blue' },
    ],
    petId: 'xvisor_white_cat_silver',
  });
  const prompt = finalCastPrompt(snapshot);
  assert.match(prompt, /NO HUMAN PEOPLE/);
  assert.match(prompt, /BOOK OWNER \/ LEAD/);
  assert.match(prompt, /REALITY ENCHANTER/);
  assert.match(prompt, /SIDE-QUEST ARTIST/);
  assert.match(prompt, /PATTERN CARETAKER/);
  assert.match(prompt, /marker color is green/i);
  assert.match(prompt, /marker color is blue/i);
  assert.match(prompt, /COMPANION, not another member/);
  assert.match(prompt, /Old avatar\/card\/companion choices.*MUST NOT appear/);
});

test('visual references use Starter portraits, collectible art, and the canonical PET portrait', () => {
  const card = TEAMBOOK_CARDS.find(item => item?.species === 'pig' && item?.rarity === 'rare');
  assert.ok(card);
  const snapshot = buildFinalCastSnapshot({
    members: [
      { userId: 'u1', alias: 'Starter', role: 'lead', avatar: 'white_cat', avatarColor: 'green' },
      { userId: 'u2', alias: 'Collector', role: 'member', avatar: card.cardId, avatarColor: 'red' },
    ],
    petId: 'buffalo',
  });
  const references = finalCastReferences(snapshot);
  assert.deepEqual(references.map(item => item.assetPath), [
    '/assets/art/avatars/white-cat.webp',
    card.imageFull,
    '/assets/art/pets/buffalo.webp',
  ]);
  assert.deepEqual(references.map(item => item.entities[0].roleAtClose), ['lead', 'member', 'companion']);
});

test('duplicate Starter animals share one visual input while members stay distinct', () => {
  const snapshot = buildFinalCastSnapshot({
    members: [
      { userId: 'u1', alias: 'Green', role: 'lead', avatar: 'white_cat', avatarColor: 'green' },
      { userId: 'u2', alias: 'Blue', role: 'member', avatar: 'white_cat', avatarColor: 'blue' },
    ],
  });
  const references = finalCastReferences(snapshot);
  assert.equal(references.length, 1);
  assert.deepEqual(references[0].entities.map(item => item.alias), ['Green', 'Blue']);
});

test('HIA companion uses the exact equipped collectible artwork and GREMLIN MAX persona', () => {
  const hia = TEAMBOOK_CARDS.find(item => item.species === 'monitor_lizard' && item.rarity === 'legendary');
  assert.ok(hia);
  const snapshot = buildFinalCastSnapshot({
    members: [{ userId: 'u1', alias: 'Owner', role: 'lead', avatar: 'orange_cat', avatarColor: 'green' }],
    npcCardId: hia.cardId,
  });
  const prompt = finalCastPrompt(snapshot);
  const reference = finalCastReferences(snapshot).find(item => item.entities.some(entity => entity.roleAtClose === 'companion'));
  assert.match(prompt, /GREMLIN MAX/);
  assert.equal(reference?.assetPath, hia.imageFull);
});

test('memberLimit 11 plus companion produces the full canonical reference cast', () => {
  const species = [
    'orange_cat', 'white_pom', 'white_cat', 'pig', 'buffalo', 'crow',
    'turtle', 'chicken', 'rabbit', 'fox', 'owl',
  ];
  const snapshot = buildFinalCastSnapshot({
    members: species.map((avatar, index) => ({
      userId: `u${index + 1}`,
      alias: `Member ${index + 1}`,
      role: index === 0 ? 'lead' : 'member',
      avatar,
      avatarColor: ['red', 'green', 'blue', 'silver'][index % 4],
    })),
    petId: 'monitor_lizard',
  });
  assert.equal(snapshot.members.length, 11);
  assert.equal(finalCastReferences(snapshot).length, 12);
});
