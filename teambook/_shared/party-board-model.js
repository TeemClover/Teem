/* Canonical data model for the private /p board.

   A Starter is identified only by the absence of a valid collectible card
   id in canonical party data. DOM classes are presentation details and must
   never decide which artwork renderer is used.

   Companion is a semantic party role, not a seat number. The renderer may
   show 1–11 humans and an optional vacancy before appending this model. */

import { cardById } from './cards.js';
import { speciesById } from './avatars.js';
import { PET_BY_ID } from './pets.js';
import { normalizeMemberLimit } from './member-limit.js';

export function orderedPartyMembers(party) {
  const members = Array.isArray(party?.members)
    ? party.members.filter(member => member && !member.leftAt)
    : [];
  const lead = members.find(member => member.role === 'lead') || null;
  return lead
    ? [lead, ...members.filter(member => member !== lead)]
    : members;
}

export function memberBoardIdentity(member) {
  const card = cardById(String(member?.avatar || ''));
  if (card) {
    return Object.freeze({
      kind: 'collectible',
      card,
      cardId: card.cardId,
      species: card.species,
      color: card.color,
    });
  }

  const species = speciesById(String(member?.avatar || ''));
  return Object.freeze({
    kind: 'starter',
    card: null,
    cardId: null,
    species: species?.id || '',
    art: species?.art || '',
    fallback: species?.fallback || member?.avatar || '🍀',
    color: member?.avatarColor || 'green',
  });
}

export function companionBoardIdentity(party) {
  const card = party?.npcCardId ? cardById(String(party.npcCardId)) : null;
  if (card) {
    return Object.freeze({
      kind: 'collectible-companion',
      card,
      cardId: card.cardId,
      petId: party?.petId || null,
      species: card.species,
      nameTh: card.speciesNameTh || card.nameTh || card.name || 'สัตว์',
    });
  }

  const pet = party?.petId ? PET_BY_ID[String(party.petId)] : null;
  if (pet) {
    return Object.freeze({
      kind: 'starter-companion',
      card: null,
      cardId: null,
      pet,
      petId: pet.id,
      species: pet.id,
      nameTh: pet.nameTh || 'สัตว์',
      art: pet.art || '',
      fallback: pet.emoji || '🐾',
    });
  }

  return Object.freeze({
    kind: 'empty-companion', card: null, cardId: null, pet: null,
    petId: null, species: '', nameTh: 'สัตว์', art: '', fallback: '🐾',
  });
}

export function partyBoardPlan(party) {
  const members = orderedPartyMembers(party);
  const memberLimit = normalizeMemberLimit(party?.memberLimit);
  return Object.freeze({
    memberLimit,
    remaining: Math.max(0, memberLimit - members.length),
    members: Object.freeze(members.map(member => Object.freeze({
      member,
      identity: memberBoardIdentity(member),
    }))),
    companion: companionBoardIdentity(party),
  });
}
