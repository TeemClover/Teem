/* ═══════════════════════════════════════════════════════════════
   myClover — ทะเบียนกลางของ Achievement และ Act

   ที่เดียวที่รู้ว่า "ในบ้านนี้มีอะไรให้ปลดบ้าง และเรียงยังไง"
   ทั้งหน้าสถิติหลังบ้าน หน้า Collection และตัวยิง event อ่านจากไฟล์นี้ไฟล์เดียว
   เพิ่มของใหม่ = เติม object ลงในนี้ ไม่ต้องแก้หน้าไหน

   ── ACT vs ACHIEVEMENT ──
   ACT คือการกระทำเล็ก ๆ ที่ทำซ้ำได้ (กดดูวิดีโอ หยิบเข็มทิศ ชนหมัด)
   นับทั้ง "กี่ครั้ง" และ "กี่เครื่อง" เพราะสองเลขนี้ไม่เท่ากัน และส่วนต่าง
   บอกว่าคนกลับมาทำซ้ำหรือกดครั้งเดียวแล้วหาย
   ACT ที่มี achievement:true จะโผล่ใน Collection เป็นช่องเล็กแบบ Emoji
   ไม่ต้องมีภาพประกอบ

   ACHIEVEMENT คือของที่ปลดได้ครั้งเดียวต่อเครื่อง "กี่ครั้ง" กับ "กี่เครื่อง"
   จึงเท่ากันเสมอ ถ้าไม่เท่าแปลว่ามีบั๊ก

   ── stage ──
   บอกว่าของชิ้นนี้อยู่ช่วงไหนของเส้นทาง หน้าสถิติเรียงตามนี้เพื่อให้เห็นว่า
   คนหล่นหายช่วงไหน ไม่ใช่เรียงตามยอดซึ่งจะเห็นแค่ว่าอะไรดัง
   ═══════════════════════════════════════════════════════════════ */

/* เรียงตามลำดับที่คนเดินจริง ตั้งแต่ยืนหน้าประตูจนเปิดบ้านเต็ม */
export const STAGES = Object.freeze([
  { id: 'home', th: 'หน้าแรก · ประตูบ้าน' },
  { id: 'forge', th: 'การ์ตูน WHY AI?' },
  { id: 'walkthrough', th: 'Walkthrough' },
  { id: 'core7', th: 'CORE7' },
  { id: 'classroom', th: 'ห้องเรียน 6 บท' },
  { id: 'awaken', th: 'ด่านบอส AWAKEN' },
  { id: 'endgame', th: 'Player Card · เปิดบ้าน' },
  { id: 'world', th: 'ห้องอื่นในบ้าน' },
  { id: 'secret', th: 'เส้นทางลับ' },
]);

/* ── ACT: การกระทำเล็ก ๆ ──
   id สั้นและอยู่ตัว เพราะมันจะถูกเขียนลง DB ตลอดไป เปลี่ยนเมื่อไหร่
   ข้อมูลเก่ากลายเป็นเด็กกำพร้าทันที (หน้าสถิติจะโชว์แยกให้เห็น ไม่กลืนทิ้ง) */
export const ACTS = Object.freeze([
  { id: 'home-open', stage: 'home', emoji: '🚪', th: 'เปิดหน้าแรก', en: 'Opened the front page', achievement: false },
  { id: 'home-video', stage: 'home', emoji: '▶️', th: 'กดดูคลิปเปิดบ้าน', en: 'Played the opening clip', achievement: true },
  { id: 'home-compass', stage: 'home', emoji: '🧭', th: 'หยิบเข็มทิศเข้าบ้าน', en: 'Picked up the compass', achievement: true },
]);

/* ── ACHIEVEMENT ──
   id ตรงกับของเดิมใน collection/collection.js เป๊ะ ห้ามเปลี่ยน
   ไม่งั้นของที่คนปลดไว้แล้วจะกลายเป็นคนละใบ */
export const ACHIEVEMENTS = Object.freeze([
  /* การ์ตูน — Intro มาก่อน EP1 แล้ว รวมเป็น 9 ใบ */
  { id: 'forge-intro', stage: 'forge', emoji: '🌱', th: 'myClover · Intro', en: 'myClover · Intro' },
  { id: 'forge-1', stage: 'forge', emoji: '📖', th: 'EP1 ทุกคนมีสิทธิ์ลงเล่น', en: 'EP1' },
  { id: 'forge-2', stage: 'forge', emoji: '📖', th: 'EP2 ไอเท็มชิ้นแรก', en: 'EP2' },
  { id: 'forge-3', stage: 'forge', emoji: '📖', th: 'EP3 ของที่กลับมาพร้อมรอยใช้', en: 'EP3' },
  { id: 'forge-4', stage: 'forge', emoji: '📖', th: 'EP4 สิ่งที่เดินทางแทนเรา', en: 'EP4' },
  { id: 'forge-5', stage: 'forge', emoji: '📖', th: 'EP5 จากคำตอบสู่ระบบ', en: 'EP5' },
  { id: 'forge-6', stage: 'forge', emoji: '📖', th: 'EP6 สำหรับคนที่มาทีหลัง', en: 'EP6' },
  { id: 'forge-7', stage: 'forge', emoji: '📖', th: 'EP7 เวลาที่ได้คืนมา', en: 'EP7' },
  { id: 'forge-special', stage: 'forge', emoji: '🎁', th: 'ตอนพิเศษ · Version แรก', en: 'Special · First Version' },
  { id: 'blacksmith', stage: 'forge', emoji: '⚒️', th: 'ตรา BLACKSMITH', en: 'BLACKSMITH sigil' },

  { id: 'walkthrough', stage: 'walkthrough', emoji: '🗺️', th: 'เปิด Walkthrough', en: 'Walkthrough unlocked' },

  { id: 'c7-tutorial', stage: 'core7', emoji: '🧠', th: 'เข้าใจกติกา', en: 'Learned the rules' },
  { id: 'c7-match', stage: 'core7', emoji: '⚔️', th: 'ดวลครั้งแรก', en: 'First duel' },
  { id: 'c7-win', stage: 'core7', emoji: '🏅', th: 'ชัยชนะครั้งแรก', en: 'First victory' },
  { id: 'c7-friend', stage: 'core7', emoji: '🤝', th: 'เล่นกับเพื่อนครั้งแรก', en: 'First friend match' },
  { id: 'c7-set', stage: 'core7', emoji: '🏆', th: 'ครบ 1 SET', en: 'First SET' },
  { id: 'c7-hand', stage: 'core7', emoji: '🖐️', th: 'FIRST HAND ครบ 7 ใบ', en: '7 FIRST HAND cards' },
  { id: 'c7-full', stage: 'core7', emoji: '💎', th: 'FIRST HAND ครบชุด 28 ใบ', en: 'Full collection' },

  { id: 'lesson-1', stage: 'classroom', emoji: '✨', th: 'LV1 เริ่มใช้ AI ฟรี', en: 'LV1' },
  { id: 'lesson-2', stage: 'classroom', emoji: '🖼️', th: 'LV2 สร้างภาพด้วย AI', en: 'LV2' },
  { id: 'lesson-3', stage: 'classroom', emoji: '🎬', th: 'LV3 สร้างวิดีโอและคลิป', en: 'LV3' },
  { id: 'lesson-4', stage: 'classroom', emoji: '📚', th: 'LV4 สร้าง Source ให้ AI', en: 'LV4' },
  { id: 'lesson-5', stage: 'classroom', emoji: '🧠', th: 'LV5 ออกแบบ Prompt', en: 'LV5' },
  { id: 'lesson-6', stage: 'classroom', emoji: '🌐', th: 'LV6 สร้างเว็บชิ้นแรก', en: 'LV6' },

  { id: 'awaken', stage: 'awaken', emoji: '🌅', th: 'ผ่านด่านบอส', en: 'Boss cleared' },
  { id: 'awakened', stage: 'awaken', emoji: '🌅', th: 'ตรา AWAKENED', en: 'AWAKENED sigil' },

  { id: 'card', stage: 'endgame', emoji: '🎴', th: 'บันทึกการ์ดประจำตัว', en: 'Player Card saved' },

  { id: 'home', stage: 'world', emoji: '🍀', th: 'เริ่มเดินในบ้าน', en: 'First step' },
  { id: 'path', stage: 'world', emoji: '🧭', th: 'เลือกสายของตัวเอง', en: 'Chose a path' },
  { id: 'club', stage: 'world', emoji: '🍜', th: 'เยี่ยม myClover Club', en: 'Visited the Club' },
  { id: 'resume', stage: 'world', emoji: '🧾', th: 'เปิด Smart Resume', en: 'Smart Resume unlocked' },
  { id: 'hero', stage: 'world', emoji: '⚔️', th: 'ตรา HERO · Guild X', en: 'HERO sigil' },

  { id: 'seeker', stage: 'secret', emoji: '🔍', th: 'พบโคลเวอร์ที่ซ่อนอยู่', en: 'Found the hidden clover', secret: true },
  { id: 'notebook-found', stage: 'secret', emoji: '📔', th: 'พบสมุดที่หายไป', en: 'Found the notebook', secret: true },
  { id: 'notebook-restored', stage: 'secret', emoji: '📓', th: 'ซ่อมสมุดด้วย RESTORE', en: 'Restored the notebook', secret: true },
  { id: 'secret-end', stage: 'secret', emoji: '🏆', th: 'เพื่อนเล่น · Secret Ending', en: 'Secret ending', secret: true },
  { id: 'glhf', stage: 'secret', emoji: '👊🏻', th: 'GLHF · Well Played', en: 'GLHF', secret: true },
  { id: 'genesis-scroll', stage: 'secret', emoji: '📜', th: 'Genesis Prompt', en: 'Genesis Prompt', secret: true },
]);

/* ของที่ต้องยิง event ได้ทั้งหมด — ใช้ตรวจตอนรับข้อมูลและตอนวาดหน้าสถิติ */
export const ACT_IDS = Object.freeze(ACTS.map(a => a.id));
export const ACHIEVEMENT_IDS = Object.freeze(ACHIEVEMENTS.map(a => a.id));

const BY_ID = new Map([
  ...ACTS.map(a => [a.id, { ...a, kind: 'ACT' }]),
  ...ACHIEVEMENTS.map(a => [a.id, { ...a, kind: 'ACHIEVEMENT' }]),
]);

export function entryById(id) {
  return BY_ID.get(String(id || '')) || null;
}

/* ลำดับของ stage สำหรับเรียงหน้าสถิติ — id ที่ไม่รู้จักได้เลขท้ายสุด
   จะได้ไปกองอยู่ล่างสุดแทนที่จะแทรกกลางแล้วทำให้ลำดับ flow เพี้ยน */
export function stageOrder(stageId) {
  const index = STAGES.findIndex(s => s.id === stageId);
  return index < 0 ? STAGES.length : index;
}
