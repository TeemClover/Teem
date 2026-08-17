/* XTY animal species.

   Two lists, deliberately:

   XTY_SPECIES is every animal the game knows how to draw. XTY_AVATARS is
   the Starter roster — the twelve anyone may simply wear, for free, owning
   nothing. Animals added from here on join XTY_SPECIES with starter:false:
   they exist on cards and are met by opening one, never handed out.
   Keeping the roster separate is the whole reason that is possible.

   Avatar identity and RGBS frame color are separate profile choices;
   changing a Pet never changes the player's avatar. */

function species(id, slug, nameTh, fallback, starter = true) {
  return Object.freeze({
    id,
    nameTh,
    fallback,
    starter,
    art: `/xty/assets/art/avatars/${slug}.webp`,
  });
}

export const XTY_SPECIES = Object.freeze([
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
]);

export const SPECIES_BY_ID = Object.freeze(
  XTY_SPECIES.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

/* No fallback here on purpose: a caller asking about an unknown species
   wants to know it is unknown, not to be handed a cat. */
export function speciesById(id) {
  return SPECIES_BY_ID[String(id || '')] || null;
}

/* The Starter roster — what the avatar and party pickers offer for free. */
export const XTY_AVATARS = Object.freeze(XTY_SPECIES.filter(item => item.starter));

export const AVATAR_BY_ID = Object.freeze(
  XTY_AVATARS.reduce((map, item) => {
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
