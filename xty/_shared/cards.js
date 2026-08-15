/* XTY animal-card catalog.
   Free avatar appearance is intentionally separate from card ownership.
   The catalog is data-driven and future-ready for all four locked rarity
   levels. Common and Rare are the currently issued NOTEBOOK_002 set. */

import { XTY_AVATARS, AVATAR_FRAMES } from './avatars.js';

export const XTY_CARD_SERIES = 'NOTEBOOK_002';
export const XTY_CARD_COLORS = Object.freeze(['red', 'green', 'blue', 'silver']);
export const XTY_CARD_RARITIES = Object.freeze(['common', 'rare', 'epic', 'legendary']);
export const XTY_RARITY_META = Object.freeze({
  common: Object.freeze({ id: 'common', label: 'COMMON', labelTh: 'คอมมอน', partyCover: false }),
  rare: Object.freeze({ id: 'rare', label: 'RARE', labelTh: 'แรร์', partyCover: true }),
  epic: Object.freeze({ id: 'epic', label: 'EPIC', labelTh: 'อีพิก', partyCover: true }),
  legendary: Object.freeze({ id: 'legendary', label: 'LEGENDARY', labelTh: 'เลเจนดารี', partyCover: true }),
});
export const XTY_CARD_RULES = Object.freeze({
  generic: Object.freeze({ collectible: false, reward: false, partyCover: false }),
  common: Object.freeze({ collectible: true, background: 'flat-rgbs', partyCover: false }),
  rare: Object.freeze({ collectible: true, background: 'notebook-colored-pencil', partyCover: true }),
  epic: Object.freeze({ collectible: true, frame: 'premium-gold', partyCover: true }),
  legendary: Object.freeze({ collectible: true, maxPerSpecies: 1, colorVariants: false, partyCover: true }),
});

export const XTY_PERSONALITIES = Object.freeze({
  orange_cat: { id: 'orange-cat-warm-spark', nameTh: 'นักจุดไฟใจดี', descriptionTh: 'ชวนให้เริ่มจากก้าวเล็ก ๆ แล้วทำให้คนรอบข้างอยากไปต่อด้วยกัน', flavorTh: 'เริ่มเล็ก ๆ แล้วชวนกันไปต่อ' },
  white_pom: { id: 'white-pom-cheerful-guide', nameTh: 'ไกด์พลังบวก', descriptionTh: 'คอยชี้ทางแบบไม่เร่งใคร และเห็นคุณค่าของทุกก้าวที่เกิดขึ้นจริง', flavorTh: 'ก้าวสั้น ๆ ก็ยังนับนะ' },
  white_cat: { id: 'white-cat-quiet-observer', nameTh: 'ผู้สังเกตเงียบ ๆ', descriptionTh: 'มองเห็นรายละเอียดและความพยายามเล็ก ๆ ที่คนอื่นอาจเดินผ่านไป', flavorTh: 'เห็นความพยายามที่คนอื่นอาจมองข้าม' },
  pig: { id: 'pig-cozy-builder', nameTh: 'นักสร้างมุมสบาย', descriptionTh: 'จัดพื้นที่ให้เรื่องยากดูเป็นมิตรและเริ่มลงมือได้ง่ายขึ้นอีกนิด', flavorTh: 'ทำให้เรื่องยากน่าเริ่มขึ้นอีกนิด' },
  buffalo: { id: 'buffalo-steady-anchor', nameTh: 'หลักที่มั่นคง', descriptionTh: 'รักษาจังหวะที่ทำไหวและช่วยให้ทีมไม่หลุดจากสิ่งที่ตกลงกัน', flavorTh: 'ช้าได้ แต่ไม่ทิ้งกัน' },
  crow: { id: 'crow-clever-scout', nameTh: 'หน่วยสอดแนมช่างคิด', descriptionTh: 'ชอบสำรวจทางเลือกใหม่และมองเห็นช่องเล็ก ๆ ในวันที่ทุกอย่างติดขัด', flavorTh: 'มองเห็นทางใหม่ในวันที่ติดขัด' },
  turtle: { id: 'turtle-calm-traveler', nameTh: 'นักเดินทางใจเย็น', descriptionTh: 'เดินสม่ำเสมอโดยไม่เปรียบเทียบความเร็ว และรู้ว่าควรพักเมื่อไร', flavorTh: 'ค่อย ๆ ไป แต่ไปถึง' },
  chicken: { id: 'chicken-morning-buddy', nameTh: 'เพื่อนปลุกเช้า', descriptionTh: 'พกพลังเริ่มต้นวันใหม่และเตือนอย่างอ่อนโยนว่าลองใหม่ได้เสมอ', flavorTh: 'วันนี้ลองอีกหนึ่งรอบไหม' },
  rabbit: { id: 'rabbit-kind-sprinter', nameTh: 'นักวิ่งใจอ่อนโยน', descriptionTh: 'เร่งได้เมื่อพร้อม แต่ไม่ทำให้การพักกลายเป็นความผิด', flavorTh: 'เร็วเมื่อพร้อม พักเมื่อควร' },
  fox: { id: 'fox-playful-planner', nameTh: 'นักวางแผนขี้เล่น', descriptionTh: 'ปรับแผนเก่ง ทดลองสนุก และไม่ยอมให้แผนเดิมขวางเป้าหมายจริง', flavorTh: 'เปลี่ยนแผนได้ เป้าหมายยังอยู่' },
  owl: { id: 'owl-night-librarian', nameTh: 'บรรณารักษ์กลางคืน', descriptionTh: 'เก็บบทเรียนของวันอย่างเป็นระเบียบ แล้ววางมันลงก่อนพัก', flavorTh: 'เก็บบทเรียนไว้ แล้วปิดวันเบา ๆ' },
  unicorn: { id: 'unicorn-bright-dreamer', nameTh: 'นักฝันสีสด', descriptionTh: 'ทำให้ภาพในใจกลายเป็นก้าวเล็กที่จับต้องได้โดยไม่กลัวความแปลกใหม่', flavorTh: 'ของจริงเริ่มจากสิ่งที่กล้าจินตนาการ' },
});

export function cardIdFor(species, color = 'green', rarity = 'common') {
  const animal = XTY_AVATARS.find(item => item.id === species) || XTY_AVATARS[0];
  const pickedColor = XTY_CARD_COLORS.includes(color) ? color : 'green';
  const pickedRarity = XTY_CARD_RARITIES.includes(rarity) ? rarity.toUpperCase() : 'COMMON';
  return `${animal.id.toUpperCase()}_${pickedColor.toUpperCase()}_${pickedRarity}_001`;
}

function baseCard(animal, color, rarity) {
  const personality = XTY_PERSONALITIES[animal.id];
  const rarityMeta = XTY_RARITY_META[rarity] || XTY_RARITY_META.common;
  const partyCover = rarityMeta.partyCover;
  return {
    cardId: cardIdFor(animal.id, color, rarity), collection: 'pet',
    name: animal.nameTh, species: animal.id, speciesNameTh: animal.nameTh, color,
    colorNameTh: AVATAR_FRAMES[color].labelTh, rarity, series: XTY_CARD_SERIES,
    personalityId: personality.id, personalityNameTh: personality.nameTh,
    personalityPath: `/xty/cards/personalities/${personality.id}.md`,
    description: personality.descriptionTh, descriptionTh: personality.descriptionTh,
    flavorText: personality.flavorTh, flavorTh: personality.flavorTh,
    fallback: animal.fallback,
    image: animal.art,
    usableAsAvatar: true, usableAsNpc: true, usableAsPartyCover: partyCover,
    playableInCore7: true, status: 'collectible', unlockMethod: 'quest_reward',
    avatarEligible: true, npcEligible: true, partyCoverEligible: partyCover, core7Playable: true,
    eligibility: Object.freeze({ starter: false, reward: true, avatar: true, lead: partyCover, npc: true, partyCover, core7: true }),
  };
}

function makeCommonCard(animal, color) {
  const card = baseCard(animal, color, 'common');
  return Object.freeze({
    ...card, artVariant: 'flat-color-common-v3', accessoryType: 'clover-charm',
    accessoryColor: color, image: animal.art, imageThumb: animal.art, imageFull: animal.art, art: animal.art,
  });
}

const RARE_SCENES = Object.freeze({
  orange_cat: {
    red: { variant: 'sunrise-rooftop', description: 'แมวส้มยืนบนดาดฟ้ายามเช้า ถือธงผ้าเล็ก ๆ เพื่อชวนทีมเริ่มก้าวแรก', flavor: 'แสงแรกไม่ต้องดัง แค่พอให้เราเห็นทาง' },
    green: { variant: 'garden-map', description: 'แมวส้มกางแผนที่ในสวนสมุด ชี้เส้นทางสั้นที่สุดที่ทุกคนเดินไหว', flavor: 'ทางที่ดี คือทางที่เพื่อนยังเดินมาด้วยกัน' },
    blue: { variant: 'raincoat-guide', description: 'แมวส้มใส่เสื้อกันฝน นำทีมข้ามแอ่งน้ำด้วยรอยยิ้มและร่มดินสอสี', flavor: 'ฝนตกก็เริ่มได้ แค่เริ่มคนละจังหวะ' },
    silver: { variant: 'moonlit-lantern', description: 'แมวส้มถือโคมเงินบนทางเดินกลางคืน คอยเว้นแสงไว้ให้คนที่มาทีหลัง', flavor: 'ฉันจะเปิดไฟไว้ จนกว่าเธอจะกลับมา' },
  },
  white_cat: {
    red: { variant: 'festival-notes', description: 'แมวขาวนั่งจดบันทึกข้างธงงานวัด เก็บช่วงเล็ก ๆ ที่ทำให้ทีมยิ้ม', flavor: 'เรื่องสำคัญบางอย่างพูดเบา ๆ ก็ได้ยิน' },
    green: { variant: 'forest-lookout', description: 'แมวขาวซ่อนตัวบนหอสังเกตในป่า มองเห็นรอยเท้าที่พาทีมกลับเข้าทาง', flavor: 'รอยเล็กที่สุด อาจเป็นคำตอบที่เราตามหา' },
    blue: { variant: 'window-rain', description: 'แมวขาวเฝ้าหน้าต่างวันฝนตก จัดโน้ตสีน้ำเงินของทุก Commit ไว้อย่างอ่อนโยน', flavor: 'ฉันเห็นวันที่เธอยังพยายาม แม้ไม่มีใครพูดถึง' },
    silver: { variant: 'snow-library', description: 'แมวขาวเดินในห้องสมุดหิมะ เก็บบทเรียนเป็นดาวกระดาษสีเงิน', flavor: 'ความเงียบก็เก็บเรื่องราวได้ครบ' },
  },
  white_pom: {
    red: { variant: 'train-platform', description: 'ปอมขาวโบกผ้าแดงที่ชานชาลา ช่วยให้ทุกคนขึ้นรถของก้าวถัดไปทันเวลา', flavor: 'ไม่ต้องรีบทั้งทาง แค่ไม่พลาดก้าวของวันนี้' },
    green: { variant: 'hill-signpost', description: 'ปอมขาวปักป้ายทางบนเนินเขียว เขียนระยะสั้น ๆ ที่ทีมทำได้จริง', flavor: 'ป้ายนี้ไม่ได้เร่ง แค่บอกว่าเรามาถูกทาง' },
    blue: { variant: 'seaside-compass', description: 'ปอมขาวถือเข็มทิศริมทะเลสีฟ้า ชวนทีมฟังคลื่นและเลือกทางที่สบายใจ', flavor: 'เข็มทิศที่ดี พาเรากลับมาฟังตัวเอง' },
    silver: { variant: 'star-trail', description: 'ปอมขาวลากเส้นดาวสีเงินบนฟ้า ทำเครื่องหมายทุกก้าวที่ทีมเคยผ่าน', flavor: 'ทุกก้าวที่ผ่านไป กลายเป็นดาวนำทางดวงใหม่' },
  },
});

function makeRareCard(animal, color) {
  const scene = RARE_SCENES[animal.id]?.[color];
  if (!scene) return null;
  const card = baseCard(animal, color, 'rare');
  const path = `/xty/assets/cards/rare/${animal.id.replaceAll('_', '-')}-${color}-rare-001.webp`;
  return Object.freeze({
    ...card, artVariant: scene.variant, accessoryType: 'clover-charm', accessoryColor: color,
    description: scene.description, descriptionTh: scene.description,
    flavorText: scene.flavor, flavorTh: scene.flavor,
    image: path, imageThumb: path, imageFull: path, art: path,
  });
}

export const XTY_COMMON_CARDS = Object.freeze(XTY_AVATARS.flatMap(animal => XTY_CARD_COLORS.map(color => makeCommonCard(animal, color))));
export const XTY_RARE_CARDS = Object.freeze(XTY_AVATARS.filter(animal => RARE_SCENES[animal.id]).flatMap(animal => XTY_CARD_COLORS.map(color => makeRareCard(animal, color)).filter(Boolean)));
export const XTY_CARDS = Object.freeze([...XTY_COMMON_CARDS, ...XTY_RARE_CARDS]);

const cardsById = XTY_CARDS.reduce((map, card) => { map[card.cardId] = card; return map; }, {});
for (const card of XTY_COMMON_CARDS) cardsById[card.cardId.replace('_COMMON_001', '_001')] = card;
export const CARD_BY_ID = Object.freeze(cardsById);

export function cardById(cardId) { return CARD_BY_ID[String(cardId || '').toUpperCase()] || null; }
export function canonicalCardId(cardId) { return cardById(cardId)?.cardId || String(cardId || '').toUpperCase(); }
export function cardNameTh(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  return card ? card.speciesNameTh : 'การ์ดความทรงจำ';
}
export function cardDescriptorTh(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card) return 'การ์ดความทรงจำ';
  const rarity = XTY_RARITY_META[card.rarity] || XTY_RARITY_META.common;
  return `${cardNameTh(card)} · สี${card.colorNameTh} · ${rarity.label}`;
}
export function isKnownCardId(cardId) { return !!cardById(cardId); }

export function validateCardCatalog(catalog = XTY_CARDS) {
  const issues = [];
  const legendaryBySpecies = new Map();
  for (const card of catalog) {
    if (!XTY_CARD_RARITIES.includes(card.rarity)) issues.push(`${card.cardId}:rarity`);
    if (card.rarity !== 'legendary' && card.accessoryColor !== card.color) issues.push(`${card.cardId}:accessory-color`);
    if (card.rarity === 'common' && card.eligibility?.partyCover) issues.push(`${card.cardId}:common-cover`);
    if (card.rarity !== 'common' && !card.eligibility?.partyCover) issues.push(`${card.cardId}:collectible-cover`);
    if (card.rarity === 'legendary') {
      const count = (legendaryBySpecies.get(card.species) || 0) + 1;
      legendaryBySpecies.set(card.species, count);
      if (count > XTY_CARD_RULES.legendary.maxPerSpecies) issues.push(`${card.species}:legendary-duplicate`);
    }
  }
  return issues;
}
