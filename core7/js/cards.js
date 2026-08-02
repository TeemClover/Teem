/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Card Seed Data
   ชุดแรก: FIRST HAND — มือแรก (28 ใบ สีละ 7) + Generic 4 สี

   การ์ดไม่มีตัวเลข ไม่มีค่าพลัง ไม่มี Skill — สีเท่านั้นที่ตัดสินเกม
   ═══════════════════════════════════════════════════════════════ */

/* สี 4 สาย — Accessibility: ห้ามพึ่งสีอย่างเดียว ทุกสีมี icon + pattern + ชื่อ */
export const COLOR_META = {
  RED: {
    color: 'RED', emoji: '🔴',
    nameTh: 'แดง', nameEn: 'Red',
    icon: 'flame', pattern: 'bite',
    hex: '#C8442C', deep: '#8F2B1A', soft: '#F4D9D2',
    creed: 'ความอยากมักชนะวินัย',
    beats: 'GREEN', beatsTh: 'ชนะเขียว',
  },
  GREEN: {
    color: 'GREEN', emoji: '🟢',
    nameTh: 'เขียว', nameEn: 'Green',
    icon: 'leaf', pattern: 'shield',
    hex: '#2E7D4F', deep: '#1B5233', soft: '#D8EBDF',
    creed: 'วินัยชนะการคิดแต่ไม่ลงมือ',
    beats: 'BLUE', beatsTh: 'ชนะฟ้า',
  },
  BLUE: {
    color: 'BLUE', emoji: '🔵',
    nameTh: 'ฟ้า', nameEn: 'Blue',
    icon: 'droplet', pattern: 'thought',
    hex: '#2C6BA8', deep: '#1B4470', soft: '#D6E4F2',
    creed: 'ความคิดหยุดอารมณ์อยากได้',
    beats: 'RED', beatsTh: 'ชนะแดง',
  },
  GRAY: {
    color: 'GRAY', emoji: '⚙️',
    nameTh: 'เทา', nameEn: 'Gray',
    icon: 'gear', pattern: 'block',
    hex: '#6E7378', deep: '#43474C', soft: '#E4E6E8',
    creed: 'เครื่องมือช่วย Block และเปิดข้อมูล แต่ไม่ตัดสินชีวิตแทนเรา',
    beats: null, beatsTh: 'เสมอทุกสี (Block)',
  },
};

export const COLLECTION_FIRST_HAND = {
  id: 'first-hand',
  slug: 'first-hand',
  nameEn: 'FIRST HAND',
  nameTh: 'มือแรก',
  descriptionTh: 'ชุดการ์ดเริ่มต้นของ myClover: CORE7 — ความหมาย 28 คำ สีละ 7 ใบ สำหรับเลือกมือ 7 ใบที่เป็นคุณ',
  descriptionEn: 'The starting set of myClover: CORE7 — 28 meanings, seven per color, for building the seven cards that are you.',
};

/* FIRST HAND — 28 ใบ
   art = คีย์ฉากภาพต้นฉบับใน art.js (procedural SVG)
   story = เรื่องราวสั้นบนหน้า Card Detail (ไม่บังคับอ่านตอนเล่น) */
export const FIRST_HAND = [
  /* ── 🔴 RED ── */
  { id: 'fh-red-desire', no: 1, color: 'RED', en: 'Desire', th: 'ความอยาก',
    artTh: 'มือเอื้อมไปหาอาหารจานโปรด',
    story: 'ก่อนทุกการเริ่มต้น มีความอยากอยู่หนึ่งอย่างเสมอ' },
  { id: 'fh-red-joy', no: 2, color: 'RED', en: 'Joy', th: 'ความสุข',
    artTh: 'โต๊ะอาหารที่มีเสียงหัวเราะ',
    story: 'ความสุขไม่ได้อยู่ในจาน แต่อยู่รอบโต๊ะ' },
  { id: 'fh-red-taste', no: 3, color: 'RED', en: 'Taste', th: 'รสชาติ',
    artTh: 'ช้อนแรกของเมนูที่ตั้งใจทำ',
    story: 'ช้อนแรกของของที่ตั้งใจทำ บอกอะไรมากกว่าคำวิจารณ์ทั้งหน้า' },
  { id: 'fh-red-passion', no: 4, color: 'RED', en: 'Passion', th: 'แรงปรารถนา',
    artTh: 'เปลวไฟอุ่นในครัว',
    story: 'ไฟที่พอดีไม่ได้เผา แต่ทำให้ทุกอย่างสุกงอม' },
  { id: 'fh-red-courage', no: 5, color: 'RED', en: 'Courage', th: 'ความกล้า',
    artTh: 'คนลองชิมสิ่งใหม่เป็นครั้งแรก',
    story: 'คำแรกของสิ่งที่ไม่เคยลอง คือความกล้าขนาดพอดีคำ' },
  { id: 'fh-red-warmth', no: 6, color: 'RED', en: 'Warmth', th: 'ความอบอุ่น',
    artTh: 'ถ้วยร้อนในมือ 2 ข้าง',
    story: 'บางวันสิ่งที่ต้องการไม่ใช่คำตอบ แต่เป็นถ้วยอุ่น ๆ ในมือ' },
  { id: 'fh-red-celebration', no: 7, color: 'RED', en: 'Celebration', th: 'การเฉลิมฉลอง',
    artTh: 'โต๊ะอาหารใต้แสงไฟเทศกาล',
    story: 'การฉลองคือการบอกกันว่า เรามาถึงตรงนี้ด้วยกันแล้ว' },

  /* ── 🔵 BLUE ── */
  { id: 'fh-blue-clarity', no: 8, color: 'BLUE', en: 'Clarity', th: 'ความชัดเจน',
    artTh: 'เมฆเปิดออกเห็นท้องฟ้าใส',
    story: 'เมฆไม่เคยเป็นของถาวร ท้องฟ้าใสรออยู่เสมอ' },
  { id: 'fh-blue-perspective', no: 9, color: 'BLUE', en: 'Perspective', th: 'มุมมอง',
    artTh: 'คนยืนมองเส้นทางจากที่สูง',
    story: 'ปัญหาเดิมจากที่สูงขึ้นหนึ่งชั้น มักเล็กลงหนึ่งขนาด' },
  { id: 'fh-blue-wisdom', no: 10, color: 'BLUE', en: 'Wisdom', th: 'ปัญญา',
    artTh: 'สมุดเปิดข้างต้นไม้ใหญ่',
    story: 'ความรู้อ่านจบเป็นเล่ม ปัญญาโตช้า ๆ เหมือนต้นไม้' },
  { id: 'fh-blue-curiosity', no: 11, color: 'BLUE', en: 'Curiosity', th: 'ความสงสัย',
    artTh: 'กล้องส่องทางไกลมองดาว',
    story: 'คำถามที่ดีหนึ่งข้อ พาไปได้ไกลกว่าคำตอบร้อยข้อ' },
  { id: 'fh-blue-strategy', no: 12, color: 'BLUE', en: 'Strategy', th: 'กลยุทธ์',
    artTh: 'แผนที่กับหมุดหลายจุด',
    story: 'แผนที่ไม่ได้บอกให้ไปทางไหน แต่ทำให้เห็นว่าเลือกอะไรได้บ้าง' },
  { id: 'fh-blue-reflection', no: 13, color: 'BLUE', en: 'Reflection', th: 'การทบทวน',
    artTh: 'เงาสะท้อนบนผิวน้ำนิ่ง',
    story: 'น้ำนิ่งเท่านั้นที่สะท้อนตรง ใจนิ่งเท่านั้นที่เห็นชัด' },
  { id: 'fh-blue-choice', no: 14, color: 'BLUE', en: 'Choice', th: 'การเลือก',
    artTh: 'ทางแยกที่มีแสงหลายทาง',
    story: 'ทุกทางแยกมีแสงของมันเอง สิ่งเดียวที่ต้องทำคือเลือก' },

  /* ── 🟢 GREEN ── */
  { id: 'fh-green-discipline', no: 15, color: 'GREEN', en: 'Discipline', th: 'วินัย',
    artTh: 'รองเท้าที่เตรียมไว้ก่อนพระอาทิตย์ขึ้น',
    story: 'วินัยไม่ใช่เสียงปลุก แต่เป็นรองเท้าที่วางไว้ตั้งแต่เมื่อคืน' },
  { id: 'fh-green-consistency', no: 16, color: 'GREEN', en: 'Consistency', th: 'ความสม่ำเสมอ',
    artTh: 'ต้นไม้ต้นเดิมเติบโตผ่านหลายวัน',
    story: 'ต้นไม้ไม่โตในวันเดียว แต่โตทุกวัน' },
  { id: 'fh-green-balance', no: 17, color: 'GREEN', en: 'Balance', th: 'สมดุล',
    artTh: 'ก้อนหินวางสมดุลริมลำธาร',
    story: 'สมดุลไม่ใช่การหยุดนิ่ง แต่คือการวางน้ำหนักให้ถูกที่' },
  { id: 'fh-green-patience', no: 18, color: 'GREEN', en: 'Patience', th: 'ความอดทน',
    artTh: 'เมล็ดที่กำลังแตกยอด',
    story: 'ใต้ดินที่มองไม่เห็น เมล็ดกำลังทำงานของมันอยู่' },
  { id: 'fh-green-care', no: 19, color: 'GREEN', en: 'Care', th: 'การดูแล',
    artTh: 'มือประคองต้นอ่อน',
    story: 'ของที่บอบบางไม่ต้องการมือที่แข็งแรง แค่มือที่อยู่ตรงนั้น' },
  { id: 'fh-green-recovery', no: 20, color: 'GREEN', en: 'Recovery', th: 'การฟื้นตัว',
    artTh: 'แสงเช้าหลังฝนหยุด',
    story: 'ฝนหยุดเสมอ และแสงเช้าไม่เคยผิดนัด' },
  { id: 'fh-green-commitment', no: 21, color: 'GREEN', en: 'Commitment', th: 'ความตั้งใจมั่น',
    artTh: 'รอยเท้าต่อเนื่องไปถึงยอดเขา',
    story: 'ยอดเขาไม่เคยเดินมาหาใคร รอยเท้าต้องเดินไปเอง' },

  /* ── ⚙️ GRAY ── */
  { id: 'fh-gray-observe', no: 22, color: 'GRAY', en: 'Observe', th: 'สังเกต',
    artTh: 'แว่นขยายเหนือชิ้นงาน',
    story: 'ก่อนแก้อะไรได้ ต้องเห็นมันชัด ๆ ก่อน' },
  { id: 'fh-gray-measure', no: 23, color: 'GRAY', en: 'Measure', th: 'วัดผล',
    artTh: 'ไม้บรรทัดกับแบบร่าง',
    story: 'สิ่งที่วัดได้ ปรับปรุงได้' },
  { id: 'fh-gray-build', no: 24, color: 'GRAY', en: 'Build', th: 'สร้าง',
    artTh: 'มือประกอบชิ้นส่วนเข้าด้วยกัน',
    story: 'ของจริงชิ้นเล็ก ชนะแผนสวยหนึ่งเล่มเสมอ' },
  { id: 'fh-gray-repair', no: 25, color: 'GRAY', en: 'Repair', th: 'ซ่อมแซม',
    artTh: 'เครื่องมือกำลังซ่อมของที่แตกร้าว',
    story: 'ของที่ถูกซ่อมด้วยมือ มีเรื่องราวมากกว่าของใหม่' },
  { id: 'fh-gray-connect', no: 26, color: 'GRAY', en: 'Connect', th: 'เชื่อมต่อ',
    artTh: 'สะพานเชื่อมพื้นที่ 2 ฝั่ง',
    story: 'สะพานไม่เคยถามว่าฝั่งไหนสำคัญกว่า' },
  { id: 'fh-gray-adapt', no: 27, color: 'GRAY', en: 'Adapt', th: 'ปรับตัว',
    artTh: 'ชิ้นส่วนหลายรูปทรงประกอบใหม่',
    story: 'ชิ้นส่วนเดิม เรียงใหม่ ก็เป็นของใหม่ได้' },
  { id: 'fh-gray-iterate', no: 28, color: 'GRAY', en: 'Iterate', th: 'ทำซ้ำให้ดีขึ้น',
    artTh: 'แบบร่างหลาย Version เรียงต่อกัน',
    story: 'Version แรกไม่ต้องสมบูรณ์ แค่ต้องมี Version ถัดไป' },
];

/* Generic Cards — สำหรับ Guest (และทุกคน) ค่าเท่ากับการ์ดภาพทุกประการ */
export const GENERIC_CARDS = [
  { id: 'gen-red', color: 'RED', en: 'Red', th: 'แดง', generic: true },
  { id: 'gen-blue', color: 'BLUE', en: 'Blue', th: 'ฟ้า', generic: true },
  { id: 'gen-green', color: 'GREEN', en: 'Green', th: 'เขียว', generic: true },
  { id: 'gen-gray', color: 'GRAY', en: 'Gray', th: 'เทา', generic: true },
];

const BY_ID = new Map(
  [...FIRST_HAND, ...GENERIC_CARDS].map(c => [c.id, c]),
);

export function cardById(id) {
  return BY_ID.get(id) || null;
}

export function cardsByColor(color) {
  return FIRST_HAND.filter(c => c.color === color);
}

export function colorOf(cardId) {
  const c = BY_ID.get(cardId);
  return c ? c.color : null;
}
