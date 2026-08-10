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
  { id: 'dungeon', th: 'THE DUNGEON · พฤติกรรมการเล่น' },
  { id: 'endgame', th: 'Player Card · เปิดบ้าน' },
  { id: 'world', th: 'ห้องอื่นในบ้าน' },
  { id: 'secret', th: 'เส้นทางลับ' },
]);

/* ── ACT: การกระทำเล็ก ๆ ──
   id สั้นและอยู่ตัว เพราะมันจะถูกเขียนลง DB ตลอดไป เปลี่ยนเมื่อไหร่
   ข้อมูลเก่ากลายเป็นเด็กกำพร้าทันที (หน้าสถิติจะโชว์แยกให้เห็น ไม่กลืนทิ้ง) */
export const ACTS = Object.freeze([
  /* ── ประตูหน้าบ้าน ── */
  { id: 'home-open', stage: 'home', emoji: '🚪', th: 'เปิดหน้าแรก', en: 'Opened the front page', achievement: false },
  { id: 'home-video', stage: 'home', emoji: '▶️', th: 'กดดูคลิปเปิดบ้าน', en: 'Played the opening clip', achievement: true },
  { id: 'home-compass', stage: 'home', emoji: '🧭', th: 'หยิบเข็มทิศเข้าบ้าน', en: 'Picked up the compass', achievement: true },

  /* ── Hall ── */
  { id: 'hall-open', stage: 'home', emoji: '🏛️', th: 'เปิดหน้า Hall', en: 'Opened the Hall', achievement: false },
  { id: 'hall-bump', stage: 'home', emoji: '👊', th: 'ชนหมัดเปิดบ้าน', en: 'Fist bump', achievement: true },
  { id: 'hall-quest', stage: 'home', emoji: '🎯', th: 'กดปุ่มเควสหลัก', en: 'Tapped the main quest', achievement: false },
  { id: 'hall-path-pick', stage: 'world', emoji: '🎴', th: 'เลือกสายของตัวเอง', en: 'Picked a path', achievement: true },
  { id: 'hall-path-enter', stage: 'world', emoji: '🚶', th: 'เข้าสู่เส้นทางที่เลือก', en: 'Entered the path', achievement: false },
  { id: 'hall-room', stage: 'world', emoji: '🚪', th: 'กดเข้าห้องใน Hall', en: 'Opened a room', achievement: false },
  { id: 'hall-line', stage: 'world', emoji: '💬', th: 'กดแอด LINE', en: 'Tapped Add LINE', achievement: true },

  /* ── การ์ตูน ── */
  { id: 'forge-intro-open', stage: 'forge', emoji: '🌱', th: 'เปิดบทนำ Intro', en: 'Opened the Intro', achievement: false },
  { id: 'forge-open', stage: 'forge', emoji: '📚', th: 'เปิดหน้ารวมการ์ตูน', en: 'Opened the Forge index', achievement: false },
  { id: 'forge-ep-open', stage: 'forge', emoji: '📖', th: 'เปิดอ่านตอน', en: 'Opened an episode', achievement: false },
  { id: 'forge-next-button', stage: 'forge', emoji: '➡️', th: 'กดปุ่มตอนต่อไป', en: 'Used the next button', achievement: false },
  { id: 'forge-next-panel', stage: 'forge', emoji: '🖼️', th: 'แตะภาพ Panel 4 ไปต่อ', en: 'Used panel 4 to continue', achievement: false },
  { id: 'forge-next-scroll', stage: 'forge', emoji: '↕️', th: 'เลื่อนต่อจากท้ายหน้า', en: 'Scrolled past the end', achievement: false },

  { id: 'walkthrough-open', stage: 'walkthrough', emoji: '🗺️', th: 'เปิด Walkthrough', en: 'Opened the walkthrough', achievement: false },

  /* ── ห้องเรียน ── */
  { id: 'class-open', stage: 'classroom', emoji: '🏫', th: 'เปิดหน้ารวมห้องเรียน', en: 'Opened the classroom', achievement: false },
  { id: 'lesson-open', stage: 'classroom', emoji: '📝', th: 'เปิดบทเรียน', en: 'Opened a lesson', achievement: false },

  /* ── THE DUNGEON · ด่านสุดท้ายใหม่ ── */
  { id: 'dungeon-open', stage: 'dungeon', emoji: '🕳️', th: 'เข้าหน้า THE DUNGEON', en: 'Entered THE DUNGEON', achievement: false },
  { id: 'dungeon-accept', stage: 'dungeon', emoji: '⌨️', th: 'กดยอมรับใน Terminal แล้วเริ่มเล่น', en: 'Accepted the terminal link', achievement: false },
  { id: 'dungeon-q1', stage: 'dungeon', emoji: '⏳', th: 'เคลียร์ Quest 01 · ภาษาของตัวเอง', en: 'Cleared Dungeon quest 1', achievement: false },
  { id: 'dungeon-q2', stage: 'dungeon', emoji: '🔍', th: 'เคลียร์ Quest 02 · Code ↔ Browser', en: 'Cleared Dungeon quest 2', achievement: false },
  { id: 'dungeon-q3', stage: 'dungeon', emoji: '🎴', th: 'เคลียร์ Quest 03 · เปิด Party', en: 'Cleared Dungeon quest 3', achievement: false },
  { id: 'dungeon-q4', stage: 'dungeon', emoji: '🥄', th: 'เคลียร์ Quest 04 · Source Network', en: 'Cleared Dungeon quest 4', achievement: false },

  /* วัตถุในแผนที่ — events = แตะกี่ครั้ง, users = กี่เครื่องเคยแตะ */
  { id: 'dungeon-object-forge', stage: 'dungeon', emoji: '🔥', th: 'สำรวจโรงตีเหล็ก', en: 'Inspected the forge', achievement: false },
  { id: 'dungeon-object-computer', stage: 'dungeon', emoji: '🖥️', th: 'สำรวจคอมพิวเตอร์', en: 'Inspected the computer', achievement: false },
  { id: 'dungeon-object-school', stage: 'dungeon', emoji: '🏫', th: 'สำรวจโรงเรียน', en: 'Inspected the school', achievement: false },
  { id: 'dungeon-object-kitchen', stage: 'dungeon', emoji: '🍳', th: 'สำรวจห้องครัว', en: 'Inspected the kitchen', achievement: false },
  { id: 'dungeon-object-shop', stage: 'dungeon', emoji: '🏪', th: 'สำรวจร้าน', en: 'Inspected the shop', achievement: false },
  { id: 'dungeon-object-savepoint', stage: 'dungeon', emoji: '💎', th: 'สำรวจจุดเซฟ', en: 'Inspected the save point', achievement: false },
  { id: 'dungeon-object-guild', stage: 'dungeon', emoji: '🏰', th: 'สำรวจหอกิลด์', en: 'Inspected the guild hall', achievement: false },
  { id: 'dungeon-object-construction', stage: 'dungeon', emoji: '🏗️', th: 'สำรวจไซต์ก่อสร้าง', en: 'Inspected construction', achievement: false },
  { id: 'dungeon-object-fishing', stage: 'dungeon', emoji: '🎣', th: 'ปฏิสัมพันธ์กับจุดตกปลา', en: 'Interacted with fishing', achievement: false },
  { id: 'dungeon-object-sign', stage: 'dungeon', emoji: '🪧', th: 'อ่านป้ายในแผนที่', en: 'Read a map sign', achievement: false },
  { id: 'dungeon-object-notebook', stage: 'dungeon', emoji: '📔', th: 'ปฏิสัมพันธ์กับสมุดเก่า', en: 'Interacted with the old notebook', achievement: false, secret: true },
  { id: 'dungeon-object-dragon', stage: 'dungeon', emoji: '🐉', th: 'สำรวจมังกร', en: 'Inspected the dragon', achievement: false },
  { id: 'dungeon-object-gold', stage: 'dungeon', emoji: '💰', th: 'ปฏิสัมพันธ์กับกองทองมังกร', en: 'Interacted with dragon gold', achievement: false },
  { id: 'dungeon-object-clover', stage: 'dungeon', emoji: '🍀', th: 'สำรวจโคลเวอร์', en: 'Inspected clover', achievement: false, secret: true },

  /* เหตุการณ์/ความลับ */
  { id: 'dungeon-book-found', stage: 'dungeon', emoji: '📔', th: 'SECRET · เจอสมุดที่ซ่อนในป่า', en: 'Found the hidden notebook', achievement: false, secret: true },
  { id: 'dungeon-secret-restored', stage: 'dungeon', emoji: '🔖', th: 'SECRET · ซ่อมสมุดในรอบนี้สำเร็จ', en: 'Restored the notebook this run', achievement: false, secret: true },
  { id: 'dungeon-secret-boot', stage: 'dungeon', emoji: '🥾', th: 'SECRET · ตกได้รองเท้าบูทเก่า', en: 'Fished up the old boot', achievement: false, secret: true },
  { id: 'dungeon-secret-clover', stage: 'dungeon', emoji: '🍀', th: 'SECRET · เจอโคลเวอร์สี่แฉก', en: 'Found the four-leaf clover', achievement: false, secret: true },
  { id: 'dungeon-gold-bug', stage: 'dungeon', emoji: '😏', th: 'SECRET · ใช้บั๊กขโมยทองมังกร', en: 'Used the dragon gold bug', achievement: false, secret: true },
  { id: 'dungeon-lucky-bug', stage: 'dungeon', emoji: '🍀', th: 'SECRET · เจอ Lucky Bug ดาวดวงที่ 6', en: 'Found Lucky Bug', achievement: false, secret: true },
  { id: 'dungeon-dragon-wake', stage: 'dungeon', emoji: '🔥', th: 'ปลุกมังกรจน PARTY WIPE', en: 'Woke the dragon', achievement: false },
  { id: 'dungeon-chest-open', stage: 'dungeon', emoji: '🧰', th: 'เปิดหีบและล็อกดาว', en: 'Opened the Dungeon chest', achievement: false },
  { id: 'dungeon-pry-1', stage: 'dungeon', emoji: '🪓', th: 'งัดหีบครั้งที่ 1', en: 'Pried the chest once', achievement: false },
  { id: 'dungeon-pry-2', stage: 'dungeon', emoji: '🪓', th: 'งัดหีบครั้งที่ 2', en: 'Pried the chest twice', achievement: false },
  { id: 'dungeon-pry-3', stage: 'dungeon', emoji: '🧂', th: 'งัดหีบครั้งที่ 3 · ได้เกลือ', en: 'Broke the chest for salt', achievement: false },
  { id: 'dungeon-chest-broken', stage: 'dungeon', emoji: '🧂', th: 'เปิดผลหีบเกลือ', en: 'Opened the broken salt chest', achievement: false },
  { id: 'dungeon-reset-landed', stage: 'dungeon', emoji: '♻️', th: 'กลับเข้า Dungeon หลัง Reset', en: 'Returned after Dungeon reset', achievement: false },

  /* Side quest ที่ยังใช้อยู่จากสมุด ซึ่ง Dungeon ใหม่ลิงก์ไปหา */
  { id: 'notebook-open', stage: 'secret', emoji: '📔', th: 'หยิบสมุดเก่า', en: 'Picked up the notebook', achievement: true, secret: true },
  { id: 'notebook-restore', stage: 'secret', emoji: '🔧', th: 'กด RESTORE', en: 'Used RESTORE', achievement: true, secret: true },
  { id: 'notebook-bump', stage: 'secret', emoji: '👊🏻', th: 'ชนหมัด Well Played', en: 'Well Played fist bump', achievement: true, secret: true },

  /* ── ห้องอื่นในบ้าน ── */
  { id: 'card-open', stage: 'endgame', emoji: '🎴', th: 'เปิดหน้าทำการ์ด', en: 'Opened the Player Card', achievement: false },
  { id: 'card-save', stage: 'endgame', emoji: '💾', th: 'กดบันทึกการ์ด', en: 'Saved the Player Card', achievement: true },
  { id: 'collection-open', stage: 'world', emoji: '🎒', th: 'เปิด Inventory', en: 'Opened the Inventory', achievement: false },
  { id: 'paths-open', stage: 'world', emoji: '🧭', th: 'เปิดหน้ารวม 4 สาย', en: 'Opened the paths page', achievement: false },
  { id: 'club-open', stage: 'world', emoji: '🍜', th: 'เปิด myClover Club', en: 'Opened the Club', achievement: false },
  { id: 'resume-open', stage: 'world', emoji: '🧾', th: 'เปิด Smart Resume', en: 'Opened Smart Resume', achievement: false },
  { id: 'guild-discord', stage: 'world', emoji: '💠', th: 'เข้า Guild บน Discord', en: 'Went into Discord', achievement: true },
  { id: 'ks-open', stage: 'world', emoji: '📦', th: 'เปิดหน้า Kickstarter', en: 'Opened the campaign page', achievement: false },
]);

/* ── ACHIEVEMENT ──
   id ต้องคงเดิมเพื่อไม่ทำของที่คนปลดไว้แล้วหาย แต่ชื่อและ stage ชี้ไป Dungeon ใหม่ */
export const ACHIEVEMENTS = Object.freeze([
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

  { id: 'awaken', stage: 'dungeon', emoji: '🕳️', th: 'ผ่าน THE DUNGEON', en: 'Dungeon cleared' },
  { id: 'awakened', stage: 'dungeon', emoji: '🌅', th: 'ตรา AWAKENED · หีบ 5/5', en: 'AWAKENED · 5/5 Dungeon chest' },

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

export const ACT_IDS = Object.freeze(ACTS.map(a => a.id));
export const ACHIEVEMENT_IDS = Object.freeze(ACHIEVEMENTS.map(a => a.id));

const BY_ID = new Map([
  ...ACTS.map(a => [a.id, { ...a, kind: 'ACT' }]),
  ...ACHIEVEMENTS.map(a => [a.id, { ...a, kind: 'ACHIEVEMENT' }]),
]);

export function entryById(id) {
  return BY_ID.get(String(id || '')) || null;
}

export function stageOrder(stageId) {
  const index = STAGES.findIndex(s => s.id === stageId);
  return index < 0 ? STAGES.length : index;
}
