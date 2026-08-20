/* ═══════════════════════════════════════════════════════════════
   ย้ายบ้านแล้ว — ไฟล์นี้เหลือไว้เป็นทางเข้าเก่าเท่านั้น

   บุคลิกรายตัวอยู่ที่ pet/sauce/<ตัว>.js (ไฟล์ละตัว)
   กติกาที่ทุกตัวใช้ร่วมกันอยู่ที่ pet/constitution.js

   ของเดิมเก็บทั้ง 12 บุคลิกไว้ในไฟล์เดียว และเขียนกติกาซ้ำในทุกบุคลิก
   พอมีกติกาใหม่ทีต้องไล่แก้ 12 จุด ตอนนี้แก้ที่ constitution.js ที่เดียว
   ═══════════════════════════════════════════════════════════════ */

import { PET_SAUCE } from './pet/sauce/index.js';
import { sauceBlock } from './pet/compose.js';

/* รูปร่างเดิมของ PET_PERSONAS ยังใช้ได้ เผื่อมีของเก่าอ้างถึงอยู่ */
export const PET_PERSONAS = Object.freeze(Object.entries(PET_SAUCE).reduce((map, [id, sauce]) => {
  map[id] = Object.freeze({
    nameTh: sauce.nameTh,
    emoji: sauce.emoji,
    rgbs: sauce.rgbs,
    block: sauceBlock(sauce),
  });
  return map;
}, Object.create(null)));

export { PET_SAUCE };
