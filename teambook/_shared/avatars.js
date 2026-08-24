/* TeamBook animal species.

   Two lists, deliberately:

   TEAMBOOK_SPECIES is every animal the game knows how to draw. TEAMBOOK_AVATARS is
   the Starter roster — the twelve anyone may simply wear, for free, owning
   nothing. Animals added from here on join TEAMBOOK_SPECIES with starter:false:
   they exist on cards and are met by opening one, never handed out.
   Keeping the roster separate is the whole reason that is possible.

   Avatar identity and RGBS frame color are separate profile choices;
   changing a Pet never changes the player's avatar.

   TeamBook 1.4 architecture: this file is pure data/presentation. It MUST NOT
   boot the app runtime or import the bootstrap as a side effect. */

function species(id, slug, nameTh, fallback, starter = true, nameEn = '', artOverride = '') {
  return Object.freeze({
    id,
    nameTh,
    nameEn: nameEn || id,
    fallback,
    starter,
    art: artOverride || `/assets/art/avatars/${slug}.webp`,
  });
}

export const TEAMBOOK_SPECIES = Object.freeze([
  species('orange_cat', 'orange-cat', 'แมว', '🐱'),
  species('white_pom', 'white-pom', 'หมา', '🐶'),
  species('white_cat', 'white-cat', 'แมวขาว', '🐈'),
  species('pig', 'pig', 'หมู', '🐷'),
  species('buffalo', 'buffalo', 'ควาย', '🐃'),
  species('crow', 'crow', 'กา', '🐦‍⬛'),
  species('turtle', 'turtle', 'เต่า', '🐢'),
  species('chicken', 'chicken', 'ไก่', '🐔'),
  species('rabbit', 'rabbit', 'กระต่าย', '🐰'),
  species('fox', 'fox', 'จิ้งจอก', '🦊'),
  species('owl', 'owl', 'นกฮูก', '🦉'),
  species('unicorn', 'unicorn', 'ยูนิคอร์น', '🦄'),
  /* Secret collectible species: card-only, never offered in Starter. */
  species('monitor_lizard', 'monitor-lizard', 'เหี้ย', '🦎', false, 'HIA', '/assets/art/pets/monitor-lizard.webp'),
]);

export const SPECIES_BY_ID = Object.freeze(
  TEAMBOOK_SPECIES.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

export function speciesById(id) {
  return SPECIES_BY_ID[String(id || '')] || null;
}

export const TEAMBOOK_AVATARS = Object.freeze(TEAMBOOK_SPECIES.filter(item => item.starter));

export const AVATAR_BY_ID = Object.freeze(
  TEAMBOOK_AVATARS.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

export const AVATAR_FRAMES = Object.freeze({
  red: { id: 'red', labelTh: 'แดง', hex: '#E45B5B' },
  green: { id: 'green', labelTh: 'เขียว', hex: '#55B56A' },
  blue: { id: 'blue', labelTh: 'น้ำเงิน', hex: '#5B8DFF' },
  silver: { id: 'silver', labelTh: 'เงิน', hex: '#98A0A8' },
});

export function avatarById(id) {
  return AVATAR_BY_ID[id] || AVATAR_BY_ID.orange_cat;
}

export function avatarFallback(id, fallback = '🐱') {
  return AVATAR_BY_ID[id]?.fallback || fallback || '🐱';
}
