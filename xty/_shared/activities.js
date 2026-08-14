function activity(id, labelTh, character, hintTh = '') {
  return Object.freeze({
    id,
    labelTh,
    character,
    hintTh,
    art: `/xty/assets/art/activities/activity-${id}.webp`,
  });
}

export const XTY_ACTIVITIES = Object.freeze([
  activity('walk', 'เดิน', 'แมวส้ม', 'เดินเล่นหรือเก็บก้าวด้วยกัน'),
  activity('run', 'วิ่ง', 'ปอมขาว', 'ออกไปวิ่งในจังหวะของตัวเอง'),
  activity('workout', 'ออกกำลัง', 'ควาย', 'ขยับร่างกายแบบที่ทำไหว'),
  activity('sleep', 'นอนให้พอ', 'แมวขาว', 'ช่วยกันรักษาเวลาพักผ่อน'),
  activity('eat', 'กินให้ดี', 'หมู', 'ดูแลมื้ออาหารโดยไม่ตัดสินรูปร่าง'),
  activity('read', 'อ่าน', 'เต่า', 'อ่านทีละนิดแต่ไปด้วยกัน'),
  activity('study', 'เรียน', 'กา', 'เรียนหรือทบทวนสิ่งใหม่'),
  activity('work', 'ทำงาน', 'ปอมขาว', 'โฟกัสงานสำคัญให้เสร็จ'),
  activity('housework', 'งานบ้าน', 'ไก่', 'เก็บกวาดทีละมุม'),
  activity('mindfulness', 'พักใจ', 'ยูนิคอร์น', 'หยุดหายใจและกลับมาอยู่กับตัวเอง'),
  activity('wellness', 'ดูแลตัวเอง', 'แมวขาว', 'ทำเรื่องเล็ก ๆ ให้ตัวเองสบายขึ้น'),
  activity('create', 'สร้างสรรค์', 'จิ้งจอก', 'วาด เขียน ทำของ หรือทดลองไอเดีย'),
  activity('board-game', 'บอร์ดเกม', 'แมวส้ม + ปอมขาว', 'นัดเล่นเกมโต๊ะด้วยกัน'),
  activity('custom', 'กำหนดเอง', 'แมวส้ม', 'เขียนกิจกรรมของตี้เอง'),
]);

export const ACTIVITY_BY_ID = Object.freeze(
  XTY_ACTIVITIES.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

export function activityById(id) {
  return ACTIVITY_BY_ID[id] || ACTIVITY_BY_ID.custom;
}

export const XTY_PRESETS = Object.freeze([
  { id: 'casual', labelTh: 'สบาย ๆ', hintTh: 'ทำตามจังหวะของแต่ละคน', art: ACTIVITY_BY_ID.walk.art, budget: 'social' },
  { id: 'challenge', labelTh: 'ชาเลนจ์', hintTh: 'มีเป้าหมายชัด ชวนกันทำต่อ', art: ACTIVITY_BY_ID.run.art, budget: 'normal' },
  { id: 'mission', labelTh: 'ภารกิจ', hintTh: 'ร่วมมือให้ของหนึ่งอย่างเสร็จ', art: ACTIVITY_BY_ID.create.art, budget: 'normal' },
  { id: 'verified', labelTh: 'ช่วยยืนยัน', hintTh: 'Commit แล้วให้เพื่อนหนึ่งคน Confirm', art: ACTIVITY_BY_ID.study.art, budget: 'quiet' },
]);
