/* TeamBook V1.2 — immutable final cast snapshot for Ending Art.

   Operational history (avatar/PET swaps during setup) is not story evidence.
   The Ending receives only the character state that exists when the book
   closes: final member avatar/card, final marker color, final role, and final
   companion. This module is intentionally pure so it can be unit-tested and
   reused by the image-provider adapter. */

import { cardById } from './cards.js';
import { endingPersonaPrompt, endingVisualPersonaFor } from './ending-personas.js';
import { speciesById } from './avatars.js';
import { PET_BY_ID } from './pets.js';

const COLORS = new Set(['red', 'green', 'blue', 'silver']);

function markerColor(value) {
  return COLORS.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'green';
}

function currentMembers(party) {
  if (Array.isArray(party?.members) && party.members.length) return party.members;
  return (Array.isArray(party?.memberHistory) ? party.memberHistory : [])
    .filter(member => !member?.leftAt);
}

function identityOf(value) {
  const raw = String(value || 'orange_cat');
  const card = cardById(raw);
  if (card) {
    return {
      identitySource: 'card_avatar',
      avatarValue: raw,
      cardId: card.cardId,
      species: card.species,
      nativeCardColor: card.color || '',
      personaId: card.species,
    };
  }
  return {
    identitySource: 'starter_avatar',
    avatarValue: raw,
    cardId: null,
    species: raw,
    nativeCardColor: '',
    personaId: raw,
  };
}

export function buildFinalCastSnapshot(party) {
  const members = currentMembers(party).map(member => {
    const identity = identityOf(member?.avatar);
    return Object.freeze({
      entityId: String(member?.userId || ''),
      alias: String(member?.alias || ''),
      roleAtClose: member?.role === 'lead' ? 'lead' : 'member',
      ...identity,
      markerColor: markerColor(member?.avatarColor),
    });
  });

  const rawCompanion = String(party?.npcCardId || party?.petId || '');
  const companion = rawCompanion ? (() => {
    const identity = identityOf(rawCompanion);
    return Object.freeze({
      entityId: 'companion',
      alias: 'companion',
      roleAtClose: 'companion',
      ...identity,
      markerColor: null,
      companionMarker: 'small book charm or bell',
    });
  })() : null;

  return Object.freeze({
    frozenAt: String(party?.endAt || party?.updatedAt || ''),
    ownerId: String(party?.ownerId || members.find(member => member.roleAtClose === 'lead')?.entityId || ''),
    members: Object.freeze(members),
    companion,
  });
}

function memberLine(member) {
  const role = member.roleAtClose === 'lead'
    ? 'BOOK OWNER / LEAD — show ownership only through a gentle notebook cue; never hierarchy, crown, throne, spotlight, or larger body size.'
    : 'MEMBER — visually equal to the book owner.';
  const identity = member.cardId
    ? `Final character is card ${member.cardId}, species ${member.species}. Preserve the card character identity; do not recolor the whole animal.`
    : `Final character is starter animal ${member.species}.`;
  const color = `Player marker color is ${member.markerColor}. Put this color on one subtle accessory such as scarf, ribbon, tag, strap, collar, small bag, or held-object accent.`;
  return [
    `${member.alias || 'member'}: ${role}`,
    identity,
    color,
    endingPersonaPrompt(member.personaId),
  ].join(' ');
}

function companionLine(companion) {
  if (!companion) return 'No companion in the final cast.';
  const identity = companion.cardId
    ? `Final companion is card ${companion.cardId}, species ${companion.species}.`
    : `Final companion is ${companion.species}.`;
  return [
    `${identity} It is a COMPANION, not another member. Give it a distinct small companion marker (${companion.companionMarker}).`,
    endingPersonaPrompt(companion.personaId),
  ].join(' ');
}

export function finalCastPrompt(snapshot) {
  const lines = [
    'FINAL CAST — CANONICAL. NO HUMAN PEOPLE.',
    'Represent every person only as their final TeamBook animal/card character.',
    'Old avatar/card/companion choices are setup history and MUST NOT appear.',
    'Native card color and player marker color are different concepts. Never recolor the whole animal to identify a player.',
  ];
  for (const member of snapshot?.members || []) lines.push(memberLine(member));
  lines.push(companionLine(snapshot?.companion));
  return lines.join('\n');
}

export function finalCastPersonaSummary(snapshot) {
  return (snapshot?.members || []).map(member => ({
    alias: member.alias,
    role: member.roleAtClose,
    species: member.species,
    markerColor: member.markerColor,
    persona: endingVisualPersonaFor(member.personaId).label,
  }));
}

function referenceAsset(entity) {
  if (!entity) return '';
  if (entity.cardId) {
    const card = cardById(entity.cardId);
    return card?.imageFull || card?.art || card?.image || '';
  }
  if (entity.roleAtClose === 'companion') {
    const pet = PET_BY_ID[entity.species];
    if (pet?.art) return pet.art;
  }
  return speciesById(entity.species)?.art || PET_BY_ID[entity.species]?.art || '';
}

/* One visual reference may represent more than one member wearing the same
   Starter animal. Keep the entities separate in the cast prompt, but send the
   shared artwork only once to avoid wasting image-input budget. */
export function finalCastReferences(snapshot) {
  const references = new Map();
  const add = entity => {
    const assetPath = referenceAsset(entity);
    if (!assetPath) return;
    const current = references.get(assetPath) || {
      assetPath,
      species: entity.species,
      identitySource: entity.identitySource,
      entities: [],
    };
    current.entities.push(Object.freeze({
      entityId: entity.entityId,
      alias: entity.alias,
      roleAtClose: entity.roleAtClose,
      markerColor: entity.markerColor,
      cardId: entity.cardId,
    }));
    references.set(assetPath, current);
  };

  for (const member of snapshot?.members || []) add(member);
  add(snapshot?.companion);
  return Object.freeze([...references.values()].map(reference => Object.freeze({
    ...reference,
    entities: Object.freeze(reference.entities),
  })));
}
