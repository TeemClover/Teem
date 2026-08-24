/* TeamBook animal-card catalog.
   Free avatar appearance is intentionally separate from card ownership.
   The catalog is data-driven and future-ready for all four locked rarity
   levels. Every card belongs to the public TeamBook series. */

import { TEAMBOOK_SPECIES, speciesById, AVATAR_FRAMES } from './avatars.js';

export const TEAMBOOK_CARD_SERIES = 'TeamBook';
export const TEAMBOOK_CARD_COLORS = Object.freeze(['red', 'green', 'blue', 'silver']);
export const TEAMBOOK_CARD_RARITIES = Object.freeze(['common', 'rare', 'epic', 'legendary']);
export const TEAMBOOK_RARITY_META = Object.freeze({
  common: Object.freeze({ id: 'common', label: 'COMMON', labelTh: 'คอมมอน', partyCover: false }),
  rare: Object.freeze({ id: 'rare', label: 'RARE', labelTh: 'แรร์', partyCover: true }),
  epic: Object.freeze({ id: 'epic', label: 'EPIC', labelTh: 'อีพิก', partyCover: true }),
  legendary: Object.freeze({ id: 'legendary', label: 'LEGENDARY', labelTh: 'เลเจนดารี', partyCover: true }),
});
export const TEAMBOOK_CARD_RULES = Object.freeze({
  generic: Object.freeze({ collectible: false, reward: false, partyCover: false }),
  common: Object.freeze({ collectible: true, background: 'flat-rgbs', partyCover: false }),
  rare: Object.freeze({ collectible: true, background: 'notebook-colored-pencil', partyCover: true }),
  epic: Object.freeze({ collectible: true, frame: 'premium-gold', partyCover: true }),
  legendary: Object.freeze({ collectible: true, maxPerSpecies: 1, colorVariants: false, partyCover: true }),
});

export const TEAMBOOK_PERSONALITIES = Object.freeze({
  orange_cat: { id: 'orange-cat-warm-spark', nameTh: 'นักจุดไฟใจดี', descriptionTh: 'ชวนให้เริ่มจากก้าวเล็ก ๆ แล้วทำให้คนรอบข้างอยากไปต่อด้วยกัน', flavorTh: 'เริ่มเล็ก ๆ แล้วชวนกันไปต่อ' },
  white_pom: { id: 'white-pom-cheerful-guide', nameTh: 'ไกด์พลังบวก', descriptionTh: 'คอยชี้ทางแบบไม่เร่งใคร และเห็นคุณค่าของทุกก้าวที่เกิดขึ้นจริง', flavorTh: 'ก้าวสั้น ๆ ก็ยังนับนะ' },
  white_cat: { id: 'xvisor-white-cat-silver', nameTh: 'ผู้ดูแลแพตเทิร์น', descriptionTh: 'อ่านสิ่งที่เกิดขึ้นจริงในสมุดก่อน ชี้จุดที่น่าสังเกต และเมื่อถูกเรียกสามารถอธิบาย Xircle, RoutineX และ X-VISOR ได้โดยไม่รีบสรุปแทนคน', flavorTh: 'เห็นทีละจุด แล้วค่อยไปต่อ' },
  pig: { id: 'pig-cozy-builder', nameTh: 'นักสร้างมุมสบาย', descriptionTh: 'จัดพื้นที่ให้เรื่องยากดูเป็นมิตรและเริ่มลงมือได้ง่ายขึ้นอีกนิด', flavorTh: 'ทำให้เรื่องยากน่าเริ่มขึ้นอีกนิด' },
  buffalo: { id: 'buffalo-steady-anchor', nameTh: 'หลักที่มั่นคง', descriptionTh: 'รักษาจังหวะที่ทำไหวและช่วยให้ทีมไม่หลุดจากสิ่งที่ตกลงกัน', flavorTh: 'ช้าได้ แต่ไม่ทิ้งกัน' },
  crow: { id: 'crow-clever-scout', nameTh: 'หน่วยสอดแนมช่างคิด', descriptionTh: 'ชอบสำรวจทางเลือกใหม่และมองเห็นช่องเล็ก ๆ ในวันที่ทุกอย่างติดขัด', flavorTh: 'มองเห็นทางใหม่ในวันที่ติดขัด' },
  turtle: { id: 'turtle-calm-traveler', nameTh: 'นักเดินทางใจเย็น', descriptionTh: 'เดินสม่ำเสมอโดยไม่เปรียบเทียบความเร็ว และรู้ว่าควรพักเมื่อไร', flavorTh: 'ค่อย ๆ ไป แต่ไปถึง' },
  chicken: { id: 'chicken-morning-buddy', nameTh: 'เพื่อนปลุกเช้า', descriptionTh: 'พกพลังเริ่มต้นวันใหม่และเตือนอย่างอ่อนโยนว่าลองใหม่ได้เสมอ', flavorTh: 'วันนี้ลองอีกหนึ่งรอบไหม' },
  rabbit: { id: 'rabbit-kind-sprinter', nameTh: 'นักวิ่งใจอ่อนโยน', descriptionTh: 'เร่งได้เมื่อพร้อม แต่ไม่ทำให้การพักกลายเป็นความผิด', flavorTh: 'เร็วเมื่อพร้อม พักเมื่อควร' },
  fox: { id: 'fox-playful-planner', nameTh: 'นักวางแผนขี้เล่น', descriptionTh: 'ปรับแผนเก่ง ทดลองสนุก และไม่ยอมให้แผนเดิมขวางเป้าหมายจริง', flavorTh: 'เปลี่ยนแผนได้ เป้าหมายยังอยู่' },
  owl: { id: 'owl-night-librarian', nameTh: 'บรรณารักษ์กลางคืน', descriptionTh: 'เก็บบทเรียนของวันอย่างเป็นระเบียบ แล้ววางมันลงก่อนพัก', flavorTh: 'เก็บบทเรียนไว้ แล้วปิดวันเบา ๆ' },
  unicorn: { id: 'unicorn-bright-dreamer', nameTh: 'นักฝันสีสด', descriptionTh: 'ทำให้ภาพในใจกลายเป็นก้าวเล็กที่จับต้องได้โดยไม่กลัวความแปลกใหม่', flavorTh: 'ของจริงเริ่มจากสิ่งที่กล้าจินตนาการ' },
  monitor_lizard: { id: 'monitor-lizard-gremlin-max', nameTh: 'GREMLIN MAX', descriptionTh: 'สัตว์ลับที่อ่านเรื่องจริงในสมุด จับ contradiction และขุด receipt มากวนแบบเพื่อนสนิท', flavorTh: 'กูไม่ได้เสือก กูอ่าน Party Log' },
});

export function cardIdFor(species, color = 'green', rarity = 'common') {
  const animal = speciesById(species) || TEAMBOOK_SPECIES[0];
  const pickedColor = TEAMBOOK_CARD_COLORS.includes(color) ? color : 'green';
  const pickedRarity = TEAMBOOK_CARD_RARITIES.includes(rarity) ? rarity.toUpperCase() : 'COMMON';
  return `${animal.id.toUpperCase()}_${pickedColor.toUpperCase()}_${pickedRarity}_001`;
}

/* Cards print as art alone — no name, no reading of the picture — so a
   species that ships without a written personality is a card all the same. */
const PLAIN_PERSONALITY = Object.freeze({
  id: 'plain', nameTh: '', descriptionTh: '', flavorTh: '',
});

function baseCard(animal, color, rarity) {
  const personality = TEAMBOOK_PERSONALITIES[animal.id] || PLAIN_PERSONALITY;
  const rarityMeta = TEAMBOOK_RARITY_META[rarity] || TEAMBOOK_RARITY_META.common;
  const partyCover = rarityMeta.partyCover;
  return {
    cardId: cardIdFor(animal.id, color, rarity), collection: 'pet',
    name: animal.nameTh, nameEn: animal.nameEn, species: animal.id,
    speciesNameTh: animal.nameTh, speciesNameEn: animal.nameEn, color,
    colorNameTh: AVATAR_FRAMES[color].labelTh, rarity, series: TEAMBOOK_CARD_SERIES,
    personalityId: personality.id, personalityNameTh: personality.nameTh,
    personalityPath: personality === PLAIN_PERSONALITY ? null : `/cards/personalities/${personality.id}.md`,
    description: personality.descriptionTh, descriptionTh: personality.descriptionTh,
    flavorText: personality.flavorTh, flavorTh: personality.flavorTh,
    fallback: animal.fallback,
    image: animal.art,
    usableAsAvatar: true, usableAsNpc: true, usableAsPartyCover: partyCover,
    status: 'collectible', unlockMethod: 'teambook_reward',
    avatarEligible: true, npcEligible: true, partyCoverEligible: partyCover,
    eligibility: Object.freeze({ starter: false, reward: true, avatar: true, lead: partyCover, npc: true, partyCover }),
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
    red: { variant: 'sunrise-rooftop', description: 'แมวยืนบนดาดฟ้ายามเช้า ถือธงผ้าเล็ก ๆ เพื่อชวนทีมเริ่มก้าวแรก', flavor: 'แสงแรกไม่ต้องดัง แค่พอให้เราเห็นทาง' },
    green: { variant: 'garden-map', description: 'แมวกางแผนที่ในสวนสมุด ชี้เส้นทางสั้นที่สุดที่ทุกคนเดินไหว', flavor: 'ทางที่ดี คือทางที่เพื่อนยังเดินมาด้วยกัน' },
    blue: { variant: 'raincoat-guide', description: 'แมวใส่เสื้อกันฝน นำทีมข้ามแอ่งน้ำด้วยรอยยิ้มและร่มดินสอสี', flavor: 'ฝนตกก็เริ่มได้ แค่เริ่มคนละจังหวะ' },
    silver: { variant: 'moonlit-lantern', description: 'แมวถือโคมเงินบนทางเดินกลางคืน คอยเว้นแสงไว้ให้คนที่มาทีหลัง', flavor: 'ฉันจะเปิดไฟไว้ จนกว่าเธอจะกลับมา' },
  },
  white_cat: {
    red: { variant: 'festival-notes', description: 'แมวขาวนั่งจดบันทึกข้างธงงานวัด เก็บช่วงเล็ก ๆ ที่ทำให้ทีมยิ้ม', flavor: 'เรื่องสำคัญบางอย่างพูดเบา ๆ ก็ได้ยิน' },
    green: { variant: 'forest-lookout', description: 'แมวขาวซ่อนตัวบนหอสังเกตในป่า มองเห็นรอยเท้าที่พาทีมกลับเข้าทาง', flavor: 'รอยเล็กที่สุด อาจเป็นคำตอบที่เราตามหา' },
    blue: { variant: 'window-rain', description: 'แมวขาวเฝ้าหน้าต่างวันฝนตก จัดโน้ตสีน้ำเงินของทุก ลงชื่อ ไว้อย่างอ่อนโยน', flavor: 'ฉันเห็นวันที่เธอยังพยายาม แม้ไม่มีใครพูดถึง' },
    silver: { variant: 'snow-library', description: 'แมวขาวเดินในห้องสมุดหิมะ เก็บบทเรียนเป็นดาวกระดาษสีเงิน', flavor: 'ความเงียบก็เก็บเรื่องราวได้ครบ' },
  },
  white_pom: {
    red: { variant: 'train-platform', description: 'หมาโบกผ้าแดงที่ชานชาลา ช่วยให้ทุกคนขึ้นรถของก้าวถัดไปทันเวลา', flavor: 'ไม่ต้องรีบทั้งทาง แค่ไม่พลาดก้าวของวันนี้' },
    green: { variant: 'hill-signpost', description: 'หมาปักป้ายทางบนเนินเขียว เขียนระยะสั้น ๆ ที่ทีมทำได้จริง', flavor: 'ป้ายนี้ไม่ได้เร่ง แค่บอกว่าเรามาถูกทาง' },
    blue: { variant: 'seaside-compass', description: 'หมาถือเข็มทิศริมทะเลสีฟ้า ชวนทีมฟังคลื่นและเลือกทางที่สบายใจ', flavor: 'เข็มทิศที่ดี พาเรากลับมาฟังตัวเอง' },
    silver: { variant: 'star-trail', description: 'หมาลากเส้นดาวสีเงินบนฟ้า ทำเครื่องหมายทุกก้าวที่ทีมเคยผ่าน', flavor: 'ทุกก้าวที่ผ่านไป กลายเป็นดาวนำทางดวงใหม่' },
  },
  chicken: {
    red: {
      variant: 'country-kitchen-pancake', accessoryType: 'apron',
      description: 'ไก่สวมผ้ากันเปื้อนสีแดง พลิกแพนเค้กในครัวสมุดด้วยจังหวะสนุก ๆ',
      flavor: 'เช้านี้เริ่มได้ด้วยของอร่อยชิ้นเล็ก ๆ',
    },
    green: {
      variant: 'birdhouse-workshop', accessoryType: 'tool-belt',
      description: 'ไก่คาดเข็มขัดเครื่องมือสีเขียว ค่อย ๆ ต่อบ้านนกบนโต๊ะงานไม้',
      flavor: 'วางทีละชิ้น เดี๋ยวบ้านหลังเล็กก็เป็นรูปเป็นร่าง',
    },
    blue: {
      variant: 'xylophone-rehearsal', accessoryType: 'bow-tie',
      description: 'ไก่ผูกหูกระต่ายสีน้ำเงิน ตีไซโลโฟนเป็นจังหวะสดใสในห้องดนตรี',
      flavor: 'ทำนองสั้น ๆ ก็ชวนทั้งห้องขยับตามได้',
    },
    silver: {
      variant: 'winter-pond-skate', accessoryType: 'earmuffs-and-skates',
      description: 'ไก่ใส่ที่ครอบหูและรองเท้าสเก็ตสีเงิน กางปีกไถลบนบ่อน้ำแข็ง',
      flavor: 'รักษาสมดุลไว้ แล้วปล่อยให้ทางโค้งพาเราไป',
    },
  },
});

function makeRareCard(animal, color) {
  const scene = RARE_SCENES[animal.id]?.[color];
  if (!scene) return null;
  const card = baseCard(animal, color, 'rare');
  const path = `/assets/cards/rare/${animal.id.replaceAll('_', '-')}-${color}-rare-001.webp`;
  return Object.freeze({
    ...card, artVariant: scene.variant, accessoryType: scene.accessoryType || 'clover-charm', accessoryColor: color,
    description: scene.description, descriptionTh: scene.description,
    flavorText: scene.flavor, flavorTh: scene.flavor,
    image: path, imageThumb: path, imageFull: path, art: path,
  });
}

/* ── the printed set ───────────────────────────────────────────────
   A card exists only where art exists. Nothing is generated to fill a
   grid, so the set is never "complete" and a tier can grow at any time
   by dropping files in and adding a line here.

   Ids keep their trailing _001/_002 because they are storage keys, not
   anything a player sees: renaming them would orphan cards people
   already own. The number a player never sees is not a running number.

   Starter animals are deliberately absent from the tiers below — they are
   free identities, not commons, and they carry no colour. The reverse is
   also allowed: a species may print cards without ever joining the Starter
   roster, which is how a new animal is met by opening a card rather than
   being handed out. Adding one is an entry in TEAMBOOK_SPECIES plus art. */

const PRINTED = Object.freeze({
  /* 8 species × 4 colours × 2 artworks */
  common: ['orange_cat', 'white_cat', 'white_pom', 'pig', 'buffalo', 'chicken', 'crow', 'turtle']
    .flatMap(species => TEAMBOOK_CARD_COLORS.flatMap(color => ['a', 'b'].map((variant, index) => ({
      species, color, variant: index + 1,
      art: `/assets/cards/common/${species.replaceAll('_', '-')}-${color}-${variant}.webp`,
    })))),
  /* the original painted scenes, kept at their existing ids */
  rare: ['orange_cat', 'white_pom', 'white_cat', 'chicken']
    .flatMap(species => TEAMBOOK_CARD_COLORS.map(color => ({ species, color, variant: 1, scene: true }))),
  /* All reviewed Epic cat/Pom artworks are present in the TeamBook app. */
  epic: ['orange_cat', 'white_cat', 'white_pom']
    .flatMap(species => TEAMBOOK_CARD_COLORS.map(color => ({
      species, color, variant: 1,
      art: `/assets/cards/epic/${species.replaceAll('_', '-')}-${color}.webp`,
    }))).concat(TEAMBOOK_CARD_COLORS.map(color => ({
      species: 'monitor_lizard', color, variant: 1,
      art: `/assets/cards/epic/monitor-lizard-${color}.webp`,
    }))),
  /* one colour each, on purpose — no set to complete */
  legendary: [
    ['orange_cat', 'blue'], ['white_cat', 'silver'], ['white_pom', 'green'],
    ['buffalo', 'silver'], ['chicken', 'red'], ['crow', 'blue'],
    ['pig', 'red'], ['unicorn', 'green'],
    ['monitor_lizard', 'silver'],
  ].map(([species, color]) => ({
    species, color, variant: 1,
    art: `/assets/cards/legendary/${species.replaceAll('_', '-')}-${color}.webp`,
  })),
});

function printedId(species, color, rarity, variant) {
  return `${species.toUpperCase()}_${color.toUpperCase()}_${rarity.toUpperCase()}_${String(variant).padStart(3, '0')}`;
}

function makePrintedCard(rarity, entry) {
  const animal = speciesById(entry.species);
  if (!animal) return null;
  if (rarity === 'rare') return makeRareCard(animal, entry.color);
  const card = baseCard(animal, entry.color, rarity);
  return Object.freeze({
    ...card,
    cardId: printedId(entry.species, entry.color, rarity, entry.variant),
    artVariant: `${rarity}-${entry.variant}`, accessoryColor: entry.color,
    image: entry.art, imageThumb: entry.art, imageFull: entry.art, art: entry.art,
  });
}

export const TEAMBOOK_COMMON_CARDS = Object.freeze(PRINTED.common.map(e => makePrintedCard('common', e)).filter(Boolean));
export const TEAMBOOK_RARE_CARDS = Object.freeze(PRINTED.rare.map(e => makePrintedCard('rare', e)).filter(Boolean));
export const TEAMBOOK_EPIC_CARDS = Object.freeze(PRINTED.epic.map(e => makePrintedCard('epic', e)).filter(Boolean));
export const TEAMBOOK_LEGENDARY_CARDS = Object.freeze(PRINTED.legendary.map(e => makePrintedCard('legendary', e)).filter(Boolean));
export const TEAMBOOK_CARDS = Object.freeze([
  ...TEAMBOOK_COMMON_CARDS, ...TEAMBOOK_RARE_CARDS, ...TEAMBOOK_EPIC_CARDS, ...TEAMBOOK_LEGENDARY_CARDS,
]);

/* One draw, same odds every time. No pity counter, no streak memory —
   a run of commons says nothing about the next card. */
export const TEAMBOOK_DROP_ODDS = Object.freeze({ common: 70, rare: 22, epic: 7, legendary: 1 });

export function rollRarity(random = Math.random) {
  let roll = random() * 100;
  for (const [rarity, weight] of Object.entries(TEAMBOOK_DROP_ODDS)) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return 'common';
}

const cardsById = TEAMBOOK_CARDS.reduce((map, card) => { map[card.cardId] = card; return map; }, {});
for (const card of TEAMBOOK_COMMON_CARDS) cardsById[card.cardId.replace('_COMMON_001', '_001')] = card;
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
  const rarity = TEAMBOOK_RARITY_META[card.rarity] || TEAMBOOK_RARITY_META.common;
  return `${cardNameTh(card)} · สี${card.colorNameTh} · ${rarity.label}`;
}
export function isKnownCardId(cardId) { return !!cardById(cardId); }

export function validateCardCatalog(catalog = TEAMBOOK_CARDS) {
  const issues = [];
  const legendaryBySpecies = new Map();
  for (const card of catalog) {
    if (!TEAMBOOK_CARD_RARITIES.includes(card.rarity)) issues.push(`${card.cardId}:rarity`);
    if (card.rarity !== 'legendary' && card.accessoryColor !== card.color) issues.push(`${card.cardId}:accessory-color`);
    if (card.rarity === 'common' && card.eligibility?.partyCover) issues.push(`${card.cardId}:common-cover`);
    if (card.rarity !== 'common' && !card.eligibility?.partyCover) issues.push(`${card.cardId}:collectible-cover`);
    if (card.rarity === 'legendary') {
      const count = (legendaryBySpecies.get(card.species) || 0) + 1;
      legendaryBySpecies.set(card.species, count);
      if (count > TEAMBOOK_CARD_RULES.legendary.maxPerSpecies) issues.push(`${card.species}:legendary-duplicate`);
    }
  }
  return issues;
}
