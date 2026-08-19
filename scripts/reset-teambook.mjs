/* ═══════════════════════════════════════════════════════════════
   TeamBook — ล้างข้อมูลทั้งหมดแล้วเริ่มใหม่

   ทำไมต้องมีสคริปต์นี้แยกจาก reset-xty-test.mjs:
   ตัวเดิมเขียนรายชื่อตารางไว้ตายตัว และรายชื่อนั้นตกไปแล้ว 4 ตาราง
   (xty_star_rewards, xty_party_quota_v2, xty_system_errors, ตาราง admin)
   ถ้ารันตัวเดิมแล้ว "เริ่มใหม่" จะเหลือขยะ — ดาวค้าง โควตาสมุดค้าง
   ทำให้เปิดสมุดใหม่ไม่ได้ทั้งที่ล้างไปแล้ว

   ตัวนี้ไม่เขียนรายชื่อตารางเอง แต่ถาม information_schema ว่ามีตาราง
   ขึ้นต้น xty_ อะไรอยู่จริงบ้าง แล้วล้างตามนั้น จะเพิ่มตารางใหม่
   ทีหลังก็ไม่ต้องกลับมาแก้ไฟล์นี้

   วิธีใช้ (default = dry run ไม่ลบอะไรเลย):

     DATABASE_URL=... node scripts/reset-teambook.mjs

   ลบจริงบน environment ที่ไม่ใช่ production:

     DATABASE_URL=... TEAMBOOK_RESET_CONFIRM=WIPE_ALL_TEAMBOOK_DATA \
       node scripts/reset-teambook.mjs --apply

   ลบจริงบน production ต้องใส่ธงที่สองด้วย โดยตั้งใจ:

     ... TEAMBOOK_RESET_ALLOW_PRODUCTION=yes ... --apply

   ธงเสริม:
     --keep-admin   ไม่แตะ session/audit ของ admin (จะได้ไม่หลุด login)
     --blobs        ลบรูปใน Vercel Blob ใต้ prefix xty/ ด้วย
                    (ต้องมี BLOB_READ_WRITE_TOKEN)

   สิ่งที่สคริปต์นี้ล้างไม่ได้ และต้องล้างจากฝั่ง client:
   TeamBook เป็น local-first ข้อมูลโปรไฟล์/สมุดอีกชุดอยู่ใน localStorage
   ของเครื่องแต่ละคน ล้าง DB อย่างเดียวจะเหลือ "ผี" คือสมุดที่เครื่อง
   ยังจำได้แต่ server ไม่รู้จักแล้ว ตัวจัดการคือ DATA_EPOCH ใน
   xty/_shared/store.js — ขยับเลขนั้นหนึ่งครั้ง ทุกเครื่องจะล้าง
   local state ของตัวเองรอบเดียวตอนเปิดหน้าถัดไป
   ═══════════════════════════════════════════════════════════════ */

import { database } from '../api/_lib/core.js';

const CONFIRMATION = 'WIPE_ALL_TEAMBOOK_DATA';
const flags = new Set(process.argv.slice(2));
const apply = flags.has('--apply');
const keepAdmin = flags.has('--keep-admin');
const withBlobs = flags.has('--blobs');

const production = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const confirmed = process.env.TEAMBOOK_RESET_CONFIRM === CONFIRMATION;
const productionAllowed = process.env.TEAMBOOK_RESET_ALLOW_PRODUCTION === 'yes';

const sql = database();

/* Ask the database what exists rather than trusting a list in this file. */
const found = await sql.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name LIKE 'xty\\_%'
  ORDER BY table_name`);

const ADMIN_TABLES = new Set(['xty_admin_audit', 'xty_admin_login_hits', 'xty_admin_sessions']);
const tables = found
  .map(row => row.table_name)
  .filter(name => !(keepAdmin && ADMIN_TABLES.has(name)));

if (!tables.length) {
  console.log('ไม่พบตาราง xty_ ในฐานข้อมูลนี้ — ไม่มีอะไรให้ล้าง');
  process.exit(0);
}

console.log(`ฐานข้อมูล: ${production ? 'PRODUCTION' : 'non-production'}`);
console.log(`ตารางที่จะล้าง ${tables.length} ตาราง${keepAdmin ? ' (ข้ามตาราง admin)' : ''}:\n`);

let total = 0;
for (const table of tables) {
  const [{ n }] = await sql.query(`SELECT COUNT(*)::int n FROM ${table}`);
  total += n;
  console.log(`  ${String(n).padStart(8)}  ${table}`);
}
console.log(`\nรวม ${total} แถว`);

if (!apply) {
  console.log('\nนี่คือ dry run — ยังไม่ลบอะไรทั้งสิ้น');
  console.log(`ถ้าจะลบจริง: TEAMBOOK_RESET_CONFIRM=${CONFIRMATION} node scripts/reset-teambook.mjs --apply`);
  process.exit(0);
}
if (!confirmed) {
  throw new Error(`ต้องตั้ง TEAMBOOK_RESET_CONFIRM=${CONFIRMATION} ก่อนถึงจะลบจริงได้`);
}
if (production && !productionAllowed) {
  throw new Error('นี่คือ production — ต้องตั้ง TEAMBOOK_RESET_ALLOW_PRODUCTION=yes เพิ่มอีกชั้นหนึ่ง');
}

/* One statement, so foreign keys cannot make the order matter and a failure
   half-way through cannot leave the tables inconsistent with each other. */
await sql.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
console.log(`\nล้างแล้ว ${tables.length} ตาราง (${total} แถว)`);

if (withBlobs) {
  const { list, del } = await import('@vercel/blob');
  let cursor;
  let removed = 0;
  do {
    const page = await list({ prefix: 'xty/', cursor, limit: 1000 });
    if (page.blobs.length) {
      await del(page.blobs.map(blob => blob.url));
      removed += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  console.log(`ลบรูปใน Blob ใต้ xty/ แล้ว ${removed} ไฟล์`);
} else {
  console.log('รูปใน Vercel Blob ยังอยู่ — ใส่ --blobs ถ้าต้องการลบด้วย');
}

console.log('\nขั้นตอนสุดท้าย: ขยับ DATA_EPOCH ใน xty/_shared/store.js แล้ว deploy');
console.log('ไม่งั้นเครื่องของคนที่เคยเล่นจะยังจำสมุดเก่าที่ server ไม่มีแล้ว');
