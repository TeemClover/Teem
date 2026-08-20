/* ทะเบียนซอส — เพิ่มสัตว์ใหม่ = เพิ่มไฟล์ แล้วมาต่อ import ตรงนี้บรรทัดเดียว
   ไม่ต้องแตะ constitution.js, compose.js หรือ เพื่อนร่วมทาง-brain.js เลย */

import pig from './pig.js';
import buffalo from './buffalo.js';
import horse from './horse.js';
import elephant from './elephant.js';
import cow from './cow.js';
import whiteCat from './xvisor-white-cat-silver.js';
import dog from './dog.js';
import unicorn from './unicorn.js';
import crow from './crow.js';
import cat from './cat.js';
import chicken from './chicken.js';
import turtle from './turtle.js';

const ALL = [pig, buffalo, horse, elephant, cow, whiteCat, dog, unicorn, crow, cat, chicken, turtle];

export const PET_SAUCE = Object.freeze(ALL.reduce((map, item) => {
  map[item.id] = Object.freeze(item);
  return map;
}, Object.create(null)));

export function hasSauce(petId) {
  return Object.prototype.hasOwnProperty.call(PET_SAUCE, String(petId || ''));
}

/* สัตว์ที่ยังไม่มีไฟล์ซอสของตัวเองยังพูดได้ แค่เสียงจะกลาง ๆ —
   ดีกว่าเงียบเพราะไม่มีใครเขียนบุคลิกให้ */
export function sauceFor(petId, registryPet = null) {
  if (hasSauce(petId)) return PET_SAUCE[petId];
  if (!registryPet) return null;
  return Object.freeze({
    id: registryPet.id,
    nameTh: registryPet.nameTh,
    emoji: registryPet.emoji || '🐾',
    rgbs: `${String(registryPet.color || '').toUpperCase()} · ${String(registryPet.series || '').toUpperCase()}`,
    character: registryPet.persona || 'เป็นเพื่อนร่วมสมุดที่มีชีวิตชีวา',
    provisional: true,
  });
}
