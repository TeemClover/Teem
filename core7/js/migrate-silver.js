/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — GRAY → SILVER (ครั้งเดียวจบ)

   สีที่สี่เคยชื่อ GRAY ทั้งชื่อที่คนเห็นและคีย์ในข้อมูล ตอนนี้เป็น SILVER
   ทั้งคู่ ของที่ค้างอยู่ในเครื่องผู้เล่นจึงยังเป็นคำเก่า ถ้าไม่แปลงให้:

     - การ์ด ⚙️ ที่ปลดล็อกไว้จะหายจาก Collection (id ไม่ตรงกับ FIRST_HAND)
     - มือที่บันทึกไว้กับ preset จะอ้างการ์ดที่ไม่มีอยู่
     - เกมที่ค้างกลางคันจะ restore ไม่ได้

   ทำงานบน "ข้อความ JSON ดิบ" ของแต่ละคีย์ ไม่ใช่เดินโครงสร้าง เพราะรูปร่าง
   ข้อมูลมีหลายแบบมาก (array ของ id, snapshot ทั้งก้อน, สถิติ) การไล่ทีละ
   ชนิดจะพลาดง่ายกว่า และ token ที่แทนที่ยาวและเฉพาะพอที่จะไม่ไปโดนข้อความ
   อื่นโดยบังเอิญ

   รันครั้งเดียวแล้วปักธงไว้ ครั้งต่อไปข้ามทันที
   ═══════════════════════════════════════════════════════════════ */

const DONE_KEY = 'c7:silver_migrated';

/* เรียงจากยาวไปสั้น — TIEBREAK_FINAL_GRAY ต้องโดนก่อน GRAY เปล่า ๆ
   ทุกตัวมีขอบเขตชัด (ขึ้นต้นด้วย fh- / มี _ คั่น / อยู่ในเครื่องหมายคำพูด)
   จึงไม่ไปแตะชื่อผู้เล่นหรือข้อความอิสระที่ผู้ใช้พิมพ์เอง */
const RULES = [
  ['TIEBREAK_FINAL_GRAY', 'TIEBREAK_FINAL_SILVER'],
  ['TIEBREAK_FEWER_GRAY', 'TIEBREAK_FEWER_SILVER'],
  ['startingGrayCounts', 'startingSilverCounts'],
  ['finalGrayLosses', 'finalSilverLosses'],
  ['fh-gray-', 'fh-silver-'],
  ['gen-gray', 'gen-silver'],
  ['"GRAY"', '"SILVER"'],
];

function migrateText(text) {
  let out = text;
  for (const [from, to] of RULES) out = out.split(from).join(to);
  return out;
}

/* คีย์ที่เกมนี้เป็นเจ้าของ — ไม่แตะของแอปอื่นที่อยู่โดเมนเดียวกัน */
function ownedKey(key) {
  return key.startsWith('c7:') || key.startsWith('mc_core7_');
}

export function migrateSilverStorage({ force = false } = {}) {
  try {
    if (!force && localStorage.getItem(DONE_KEY) === '1') return { ok: true, skipped: true };
  } catch { return { ok: false, error: 'NO_STORAGE' }; }

  let scanned = 0;
  let changed = 0;
  try {
    /* เก็บรายชื่อคีย์ก่อนแล้วค่อยเขียน — เขียนระหว่างวนจะทำให้ index เลื่อน */
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && ownedKey(key)) keys.push(key);
    }
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (typeof raw !== 'string' || !raw) continue;
      scanned += 1;
      const next = migrateText(raw);
      if (next !== raw) { localStorage.setItem(key, next); changed += 1; }
    }
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* โควตาเต็มหรือโหมดส่วนตัว — ปล่อยผ่าน ดีกว่าทำให้หน้าเว็บพังทั้งหน้า */
    return { ok: false, error: 'WRITE_FAILED', scanned, changed };
  }
  return { ok: true, scanned, changed };
}

/* ต้องรันก่อนโมดูลอื่นอ่าน localStorage — store.js import ไฟล์นี้เป็นบรรทัดแรก */
migrateSilverStorage();
