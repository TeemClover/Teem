/* ═══════════════════════════════════════════════════════════════
   XTY — Pet Card Registry (28 = 7 series × 4 RGBS)

   The whole set lives here from day one, but the collection UI only
   ever renders what the player has actually found (Pet Card Blueprint
   §20, §30): the world should feel larger through discovery, not
   through a checklist.

   Naming rules that must not drift (§3, §13, §32):
   - `id` and `nameTh` are always the ANIMAL, never the crafted object.
   - Silver artwork may depict what human craft makes of the animal,
     but the card is still named after the animal.
   - Chat representation is always the animal emoji + name.
   ═══════════════════════════════════════════════════════════════ */

export const SERIES = Object.freeze({
  starter: { id: 'starter', no: '01', labelTh: 'เริ่มต้น', labelEn: 'STARTER' },
  work:    { id: 'work',    no: '02', labelTh: 'ลุยงาน',   labelEn: 'WORK' },
  beast:   { id: 'beast',   no: '03', labelTh: 'สายบุก',   labelEn: 'BEAST' },
  wild:    { id: 'wild',    no: '04', labelTh: 'สายแรง',   labelEn: 'WILD' },
  forest:  { id: 'forest',  no: '05', labelTh: 'สายป่า',   labelEn: 'FOREST' },
  untamed: { id: 'untamed', no: '06', labelTh: 'สุดทาง',   labelEn: 'UNTAMED' },
  legend:  { id: 'legend',  no: '07', labelTh: 'ตำนาน',    labelEn: 'LEGEND' },
});

/* RGBS mirrors core7 COLOR_META. Kept as ids only — the hex values stay
   owned by /core7/js/cards.js so there is one source of truth (§11). */
export const RGBS = Object.freeze({
  red:    { id: 'red',    emoji: '🔴', labelEn: 'RED',    labelTh: 'แดง',    hex: '#E45B5B' },
  green:  { id: 'green',  emoji: '🟢', labelEn: 'GREEN',  labelTh: 'เขียว',  hex: '#55B56A' },
  blue:   { id: 'blue',   emoji: '🔵', labelEn: 'BLUE',   labelTh: 'น้ำเงิน', hex: '#5B8DFF' },
  silver: { id: 'silver', emoji: '⚪', labelEn: 'SILVER', labelTh: 'เงิน',    hex: '#98A0A8' },
});

function pet(id, nameTh, emoji, color, series, persona, opts = {}) {
  return Object.freeze({
    id, nameTh, emoji, color, series, persona,
    /* Starter portraits are XTY originals. Later pets may point at an
       existing myClover universe asset instead of duplicating it. */
    art: opts.art || null,
    /* craftArt: Silver only — what human hands make of it (§4) */
    craftArt: opts.craftArt || null,
    unlockedByDefault: series === 'starter',
    /* Pet cards may become playable in CORE7 later, but that needs its
       own spec first — nothing here changes CORE7 rules (§23, §32). */
    core7Eligible: false,
    secret: series === 'legend',
  });
}

export const PETS = Object.freeze([
  /* 01 STARTER — granted to every new XTY profile (§15) */
  pet('pig',     'หมู',   '🐷', 'red',    'starter', 'อารมณ์ดี เป็นกันเอง ชวนเริ่มโดยไม่กดดัน', { art: '/xty/assets/art/pets/pig.webp' }),
  pet('dog',     'ปอมขาว','🐶', 'green',  'starter', 'เพื่อนตี้ใจดี คอยเรียกทุกคนกลับมา', { art: '/xty/assets/art/pets/dog.webp' }),
  pet('crow',    'กา',    '🐦‍⬛', 'blue',  'starter', 'ช่างสังเกต จำรายละเอียดเล็ก ๆ ได้ดี', { art: '/xty/assets/art/pets/crow.webp' }),
  pet('chicken', 'ไก่',   '🐔', 'silver', 'starter', 'จิกงานทีละนิด ทำเรื่องยากให้เป็นขั้นเล็ก', { art: '/xty/assets/art/pets/chicken.webp' }),

  /* 02 WORK */
  pet('buffalo', 'ควาย',  '🐃', 'red',    'work', 'ใจสู้ ทำต่อได้ทีละก้าว', { art: '/xty/assets/art/pets/buffalo.webp' }),
  pet('horse',   'ม้า',   '🐎', 'green',  'work', 'กระตือรือร้น พาตี้วิ่งไปข้างหน้า ชอบ momentum'),
  pet('elephant','ช้าง',  '🐘', 'blue',   'work', 'จำเก่ง สุขุม สรุปสิ่งที่ตี้เคยพูดไว้'),
  pet('cow',     'วัว',   '🐄', 'silver', 'work', 'practical เน้นผลลัพธ์ ทำของธรรมดาให้เกิด output', { craftArt: 'สเต็ก' }),

  /* 03 BEAST */
  pet('bull',    'กระทิง','🐂', 'red',    'beast', 'พุ่งชนเป้าหมาย เร็ว แรง ไม่ชอบอ้อม'),
  pet('lion',    'สิงห์',  '🦁', 'green',  'beast', 'Leader energy คุมวง ปกป้องทีม เรียกมาตรฐาน'),
  pet('tiger',   'เสือ',  '🐅', 'blue',   'beast', 'เงียบ คม จับข้ออ้างและ contradiction'),
  pet('rhino',   'แรด',   '🦏', 'silver', 'beast', 'หน้าด้านแบบมีเป้าหมาย ลุยจนเสร็จ', { craftArt: 'งานคราฟต์จากลายนอ' }),

  /* 04 WILD — opt-in intensity, roast the commitment not the person (§8) */
  pet('monitor_lizard', 'เหี้ย', '🦎', 'red',    'wild', 'ประชด กวนตรง ๆ แบบเพื่อนสนิท'),
  pet('snake',   'งู',    '🐍', 'green',  'wild', 'ประชดสุภาพ พูดดีแต่แทงตรงจุด'),
  pet('owl',     'นกฮูก', '🦉', 'blue',   'wild', 'อธิบายละเอียดจนคนรู้ว่าข้ออ้างตัวเองไม่สมเหตุผล'),
  pet('crocodile','จระเข้','🐊', 'silver', 'wild', 'พูดน้อย ต่อยหนัก ประโยคสั้นแต่จบ', { craftArt: 'กระเป๋าหนัง' }),

  /* 05 FOREST */
  pet('gorilla', 'กอริลลา','🦍', 'red',   'forest', 'พลังเยอะ ปกป้องตี้ ชอบให้ลงมือจริง'),
  pet('deer',    'กวาง',  '🦌', 'green',  'forest', 'แซ่บ ไว อ่านห้องเก่ง พูดมีสีสัน'),
  pet('fox',     'จิ้งจอก','🦊', 'blue',  'forest', 'ฉลาดแกมโกง หาทางลัด จับจุดอ่อนของแผน', { art: '/guild/assets/avatar-fox-ui.png' }),
  pet('sheep',   'แกะ',   '🐑', 'silver', 'forest', 'นุ่มนวลแต่เป็นระบบ เปลี่ยนของดิบให้ใช้งานได้', { craftArt: 'เสื้อขนแกะ' }),

  /* 06 UNTAMED */
  pet('bear',    'หมี',   '🐻', 'red',    'untamed', 'อบอุ่น ใจดี ตัวใหญ่แต่ใจเย็น เป็น safe anchor'),
  pet('rabbit',  'กระต่าย','🐇', 'green', 'untamed', 'รีบไปหมด กระตือรือร้น ชวนคนทำเดี๋ยวนี้'),
  pet('cat',     'แมวส้ม','🐱', 'blue',   'untamed', 'ขี้เล่น ชวนมองเรื่องยากให้เบาลง', { art: '/xty/assets/art/pets/orange-cat.webp' }),
  pet('turtle',  'เต่า',  '🐢', 'silver', 'untamed', 'ค่อยเป็นค่อยไป แต่ทำต่อจนถึงเป้าหมาย', { art: '/xty/assets/art/pets/turtle.webp' }),

  /* 07 LEGEND — hidden discovery, prestige only, never smarter (§11, §21) */
  pet('dragon',  'มังกร', '🐉', 'red',    'legend', 'พลังมหาศาล ท้าทายให้ทำเรื่องที่ดูเป็นไปไม่ได้'),
  pet('unicorn', 'ยูนิคอร์น','🦄','green','legend', 'พลังบวก ชวนพักใจและฉลองก้าวเล็ก ๆ', { art: '/xty/assets/art/pets/unicorn.webp' }),
  pet('sloth',   'สลอธ',  '🦥', 'blue',   'legend', 'ช้ามาก คิดก่อนตอบ ต่อต้านความรีบ'),
  pet('robot',   'หุ่นยนต์','🤖', 'silver','legend', 'precise, systematic, deadpan — สิ่งที่มนุษย์สร้างขึ้น', { art: '/guild/assets/avatar-android-ui.png' }),
]);

export const PET_BY_ID = Object.freeze(
  PETS.reduce((map, p) => { map[p.id] = p; return map; }, {})
);

/* XTY V1 deliberately exposes a friendly eight-pet set from day one.
   The larger registry stays available for future discovery systems, but
   V1 pickers must filter through this list and must not apply series or
   rarity gates (Light Questboard Patch §11–12). */
export const XTY_V1_PET_IDS = Object.freeze([
  'pig', 'buffalo',
  'dog', 'unicorn',
  'crow', 'cat',
  'chicken', 'turtle',
]);

export const XTY_V1_PETS = Object.freeze(
  XTY_V1_PET_IDS.map(id => PET_BY_ID[id]).filter(Boolean)
);

export const STARTER_PET_IDS = Object.freeze(
  PETS.filter(p => p.unlockedByDefault).map(p => p.id)
);

export const TOTAL_PETS = PETS.length; // 28 — design total, never shown as a goal

export function petsInSeries(seriesId) {
  return PETS.filter(p => p.series === seriesId);
}
