import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { TEAMBOOK_CARDS } from './cards.js';
import {
  companionBoardIdentity, memberBoardIdentity, partyBoardPlan,
} from './party-board-model.js';

const realCard = TEAMBOOK_CARDS.find(card => card?.cardId && card?.eligibility?.avatar);

function members(count) {
  return Array.from({ length: count }, (_, index) => ({
    userId: `user-${index + 1}`,
    alias: `Member ${index + 1}`,
    role: index === 0 ? 'lead' : 'member',
    avatar: 'pig',
    avatarColor: 'green',
  }));
}

test('human Starter versus collectible is decided by actual card id', () => {
  const starter = memberBoardIdentity({ avatar:'pig', avatarColor:'red' });
  assert.equal(starter.kind, 'starter');
  assert.equal(starter.cardId, null);
  assert.match(starter.art, /\/assets\/art\/avatars\/pig\.webp$/);

  const collectible = memberBoardIdentity({ avatar:realCard.cardId, avatarColor:'red' });
  assert.equal(collectible.kind, 'collectible');
  assert.equal(collectible.cardId, realCard.cardId);

  const staleClassLikeValue = memberBoardIdentity({ avatar:'is-card', avatarColor:'blue' });
  assert.equal(staleClassLikeValue.kind, 'starter');
  assert.equal(staleClassLikeValue.cardId, null);
});

test('Starter companion comes from semantic petId and keeps transparent portrait asset', () => {
  const companion = companionBoardIdentity({ petId:'buffalo', npcCardId:null });
  assert.equal(companion.kind, 'starter-companion');
  assert.equal(companion.petId, 'buffalo');
  assert.equal(companion.nameTh, 'ควาย');
  assert.equal(companion.art, '/assets/art/pets/buffalo.webp');
  assert.equal(companion.cardId, null);
});

test('valid npcCardId keeps the real full-art collectible path', () => {
  const companion = companionBoardIdentity({ petId:'buffalo', npcCardId:realCard.cardId });
  assert.equal(companion.kind, 'collectible-companion');
  assert.equal(companion.cardId, realCard.cardId);
  assert.equal(companion.card, realCard);
});

test('memberLimit 1–11 never turns a human position into Companion identity', () => {
  for (let memberLimit = 1; memberLimit <= 11; memberLimit += 1) {
    const plan = partyBoardPlan({
      memberLimit,
      members:members(memberLimit),
      petId:'buffalo',
      npcCardId:null,
    });
    assert.equal(plan.members.length, memberLimit);
    assert.equal(plan.remaining, 0);
    assert.equal(plan.companion.kind, 'starter-companion');
    assert.equal(plan.companion.petId, 'buffalo');
  }
});

const [page, bootstrap, interaction, geometry] = await Promise.all([
  readFile(new URL('../p/index.html', import.meta.url), 'utf8'),
  readFile(new URL('./language.js', import.meta.url), 'utf8'),
  readFile(new URL('./party-teambook-cards.js', import.meta.url), 'utf8'),
  readFile(new URL('./card-geometry-v16.js', import.meta.url), 'utf8'),
]);

test('/p owns board DOM and retired compatibility renderers no longer boot', () => {
  assert.match(page, /const board = partyBoardPlan\(p\)/);
  assert.match(page, /dataset\.tbCompanion = 'true'/);
  assert.match(page, /tb-starter-companion-seat/);
  assert.match(page, />เพื่อนร่วมทาง<\/span>/);
  assert.doesNotMatch(page, /seats\.children\[5\]/);
  assert.doesNotMatch(page, /seatIsCard|personalityNameTh/);
  assert.doesNotMatch(bootstrap, /party-pet-seat-v2|party-board-portrait-v21/);
});

test('interaction layer addresses semantic seats and never rewrites their artwork', () => {
  assert.match(interaction, /querySelectorAll\(':scope > \[data-tb-user-id\]'\)/);
  assert.doesNotMatch(interaction, /seats\.children\[/);
  assert.doesNotMatch(interaction, /cardMarkup|replaceWith\(fullCardSeat|companionName/);
  assert.doesNotMatch(interaction, /\.av\.is-card/);
});

test('Starter board art is contained and global geometry no longer makes it full-bleed', () => {
  assert.match(interaction, /#seats>\.tb-person-seat\.seat>\.av img[\s\S]*?object-fit:contain!important/);
  assert.match(interaction, /#seats>\.tb-starter-companion-seat>\.av img[\s\S]*?object-fit:contain!important/);
  assert.match(interaction, /background:transparent!important/);
  assert.match(interaction, /background:var\(--xty-green\)/);
  assert.doesNotMatch(geometry, /#seats>\.tb-person-seat\.seat>\.av/);
});
