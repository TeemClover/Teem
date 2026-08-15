/* XTY universal animal-card catalog.
   The launch build reuses the lightweight notebook animal art and applies
   RGBS as a card surface. Every animal nevertheless has a durable card id
   for every color, so future art/personality variants do not need a data
   migration. */

import { XTY_AVATARS, AVATAR_FRAMES } from './avatars.js';

export const XTY_CARD_SERIES = 'NOTEBOOK_001';
export const XTY_CARD_COLORS = Object.freeze(['red', 'green', 'blue', 'silver']);

export const XTY_PERSONALITIES = Object.freeze({
  orange_cat: { id: 'orange-cat-warm-spark', nameTh: 'นักจุดไฟใจดี', flavorTh: 'เริ่มเล็ก ๆ แล้วชวนกันไปต่อ' },
  white_pom: { id: 'white-pom-cheerful-guide', nameTh: 'ไกด์พลังบวก', flavorTh: 'ก้าวสั้น ๆ ก็ยังนับนะ' },
  white_cat: { id: 'white-cat-quiet-observer', nameTh: 'ผู้สังเกตเงียบ ๆ', flavorTh: 'เห็นความพยายามที่คนอื่นอาจมองข้าม' },
  pig: { id: 'pig-cozy-builder', nameTh: 'นักสร้างมุมสบาย', flavorTh: 'ทำให้เรื่องยากน่าเริ่มขึ้นอีกนิด' },
  buffalo: { id: 'buffalo-steady-anchor', nameTh: 'หลักที่มั่นคง', flavorTh: 'ช้าได้ แต่ไม่ทิ้งกัน' },
  crow: { id: 'crow-clever-scout', nameTh: 'หน่วยสอดแนมช่างคิด', flavorTh: 'มองเห็นทางใหม่ในวันที่ติดขัด' },
  turtle: { id: 'turtle-calm-traveler', nameTh: 'นักเดินทางใจเย็น', flavorTh: 'ค่อย ๆ ไป แต่ไปถึง' },
  chicken: { id: 'chicken-morning-buddy', nameTh: 'เพื่อนปลุกเช้า', flavorTh: 'วันนี้ลองอีกหนึ่งรอบไหม' },
  rabbit: { id: 'rabbit-kind-sprinter', nameTh: 'นักวิ่งใจอ่อนโยน', flavorTh: 'เร็วเมื่อพร้อม พักเมื่อควร' },
  fox: { id: 'fox-playful-planner', nameTh: 'นักวางแผนขี้เล่น', flavorTh: 'เปลี่ยนแผนได้ เป้าหมายยังอยู่' },
  owl: { id: 'owl-night-librarian', nameTh: 'บรรณารักษ์กลางคืน', flavorTh: 'เก็บบทเรียนไว้ แล้วปิดวันเบา ๆ' },
  unicorn: { id: 'unicorn-bright-dreamer', nameTh: 'นักฝันสีสด', flavorTh: 'ของจริงเริ่มจากสิ่งที่กล้าจินตนาการ' },
});

export function cardIdFor(species, color = 'green') {
  const animal = XTY_AVATARS.find(item => item.id === species) || XTY_AVATARS[0];
  const pickedColor = XTY_CARD_COLORS.includes(color) ? color : 'green';
  return `${animal.id.toUpperCase()}_${pickedColor.toUpperCase()}_001`;
}

function makeCard(animal, color) {
  const personality = XTY_PERSONALITIES[animal.id];
  return Object.freeze({
    cardId: cardIdFor(animal.id, color),
    species: animal.id,
    speciesNameTh: animal.nameTh,
    color,
    colorNameTh: AVATAR_FRAMES[color].labelTh,
    series: XTY_CARD_SERIES,
    artVariant: 'notebook-full-card-v1',
    personalityId: personality.id,
    personalityNameTh: personality.nameTh,
    personalityPath: `/xty/cards/personalities/${personality.id}.md`,
    flavorTh: personality.flavorTh,
    art: animal.art,
    fallback: animal.fallback,
    eligibility: Object.freeze({ starter: true, reward: true, avatar: true, lead: true, npc: true }),
  });
}

export const XTY_CARDS = Object.freeze(
  XTY_AVATARS.flatMap(animal => XTY_CARD_COLORS.map(color => makeCard(animal, color))),
);

export const CARD_BY_ID = Object.freeze(
  XTY_CARDS.reduce((map, card) => {
    map[card.cardId] = card;
    return map;
  }, {}),
);

export function cardById(cardId) {
  return CARD_BY_ID[String(cardId || '').toUpperCase()] || null;
}

export function cardNameTh(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  return card ? `${card.speciesNameTh}สี${card.colorNameTh}` : 'การ์ดความทรงจำ';
}

export function isKnownCardId(cardId) {
  return !!cardById(cardId);
}
