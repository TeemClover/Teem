/* XTY animal avatars. Avatar identity and RGBS frame color are separate
   profile choices; changing a Pet never changes the player's avatar. */

function avatar(id, slug, nameTh, fallback) {
  return Object.freeze({
    id,
    nameTh,
    fallback,
    art: `/xty/assets/art/avatars/${slug}.webp`,
  });
}

export const XTY_AVATARS = Object.freeze([
  avatar('orange_cat', 'orange-cat', 'แมวส้ม', '🐱'),
  avatar('white_pom', 'white-pom', 'ปอมขาว', '🐶'),
  avatar('white_cat', 'white-cat', 'แมวขาว', '🐈'),
  avatar('pig', 'pig', 'หมู', '🐷'),
  avatar('buffalo', 'buffalo', 'ควาย', '🐃'),
  avatar('crow', 'crow', 'กา', '🐦‍⬛'),
  avatar('turtle', 'turtle', 'เต่า', '🐢'),
  avatar('chicken', 'chicken', 'ไก่', '🐔'),
  avatar('rabbit', 'rabbit', 'กระต่าย', '🐰'),
  avatar('fox', 'fox', 'จิ้งจอก', '🦊'),
  avatar('owl', 'owl', 'นกฮูก', '🦉'),
  avatar('unicorn', 'unicorn', 'ยูนิคอร์น', '🦄'),
]);

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
