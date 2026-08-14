/* XTY-native object avatars. Canonical ids are stored in the profile;
   artwork paths can change without rewriting player data. Emoji remain
   migration fallbacks for profiles created before the illustrated set. */

function avatar(id, nameTh, fallback) {
  return Object.freeze({
    id,
    nameTh,
    fallback,
    art: `/xty/assets/avatars/${id}.webp`,
  });
}

export const XTY_AVATARS = Object.freeze([
  avatar('clover', 'โคลเวอร์', '🍀'),
  avatar('sun', 'ดวงอาทิตย์', '☀️'),
  avatar('cloud', 'ก้อนเมฆ', '☁️'),
  avatar('flame', 'เปลวไฟ', '🔥'),
  avatar('wave', 'คลื่น', '🌊'),
  avatar('mountain', 'ภูเขา', '⛰️'),
  avatar('ramen', 'ราเมง', '🍜'),
  avatar('dice', 'ลูกเต๋า', '🎲'),
  avatar('headphones', 'หูฟัง', '🎧'),
  avatar('book', 'หนังสือ', '📕'),
  avatar('sneaker', 'รองเท้าผ้าใบ', '👟'),
  avatar('camera', 'กล้อง', '📷'),
]);

export const AVATAR_BY_ID = Object.freeze(
  XTY_AVATARS.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

export function avatarById(id) {
  return AVATAR_BY_ID[id] || AVATAR_BY_ID.clover;
}

export function avatarFallback(id, fallback = '🍀') {
  return AVATAR_BY_ID[id]?.fallback || fallback || '🍀';
}

