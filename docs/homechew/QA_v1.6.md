# Homechew v1.6 — หลักฐานตรวจในเครื่อง

2026-09-26 · branch `feat/adaptive-front-door-v1` · base HEAD `041e91d1` · งานรอบนี้ยังไม่ commit/deploy

## ผลตรวจ

- `node --test tests/homechew/`: **23/23 ผ่าน** รวม 8 ข้อของ commerce/security และ 15 ข้อเดิมที่ปรับสัญญาราคาให้ตรงกับคำสั่งล่าสุด
- PostgreSQL contract ผ่านด้วย PGlite (PostgreSQL ในเครื่อง): schema, rate buckets, customer lease, transaction ของ customer/event/order, event delivery flag, list, stale update, lease loss, pause/resume/delete guard และ cleanup ไม่มีการต่อ DB ลูกค้าจริง
- Local SQLite persistence: ปิดและเปิด Store ใหม่ ข้อมูลผู้สนใจยังอยู่
- Browser storefront: 360/390/430/768/1440/1920, ย้อนฉากเท, CTA/keyboard, reduced motion, no WebGL, no JavaScript ผ่าน; console errors ไม่มี ในรอบที่อนุญาตฟอนต์จริง LCP 372–1092 ms, CLS 0–0.003 (Chrome lab เท่านั้น)
- รอบทดสอบแรกบล็อก Google Fonts ตามค่าเริ่มต้นของ test harness จึงมี ERR_FAILED จากฟอนต์ 2 requests/หน้า ไม่ใช่ JS/ภาพเสีย; rerun ด้วย `HOMECHEW_ALLOW_FONTS=1` ผ่านทุกข้อ ไม่ซ่อนข้อผิดพลาดของ production
- Browser commerce: 390×960 / 1440×960 ผ่าน login → ทดลองรับข่าว/ยินยอม/เลือกรส → พิมพ์สั่งใน waitlist แล้วไม่รับออเดอร์ → แท็บออเดอร์จำลอง → เลือกและพิมพ์ → logout ล้างรายการหน้าจอ ไม่มี JS errors หรือ horizontal overflow
- ตรวจภาพด้วยสายตา พบราคาสีอ่อนเกินบนพื้นครีมและแก้เป็นสีเข้มแล้ว ตรวจ screenshot รอบใหม่
- PDF ฉลาก 100×150 มม. เรนเดอร์และตรวจชื่อ/ที่อยู่/รายการแพ็กจากข้อมูลตัวอย่างแล้ว ไม่มีเลขขนส่ง/บาร์โค้ดสมมติให้เข้าใจว่าใช้ส่งจริง
- ตรวจการตั้งค่าติดตั้งจริงด้วย preflight: ยังขาด admin credentials, canonical origin, DB, LINE credentials, AI credentials/model ตามที่รายงานไว้ ไม่ใช่ installation success

## หลักฐาน

- `QA_v1.6.browser.json`, `QA_v1.6.commerce.json`
- `/tmp/homechew-v16-proof/offer-390.png`, `offer-1440.png`
- `/tmp/homechew-v16-proof/admin-chat-390.png`, `admin-chat-1440.png`
- `/tmp/homechew-v16-proof/label-390.pdf`, `label-1440.pdf`, `label-render.png`
- `/tmp/homechew-v16-page-fonts/` ภาพหกขนาดจอและโหมดสำรอง

## ขอบเขตที่ยังไม่ยืนยัน

- ยังไม่ติดตั้งหรือเปลี่ยน settings บน LINE OA เดิม ยังไม่ตรวจผู้ดูแลเก่าหรือหมุน token
- ยังไม่ทดสอบ signed webhook จริงจาก LINE, Neon ผ่านเครือข่ายจริง, Anthropic account/model จริง, Vercel runtime build/deploy หรือโดเมน production
- ยังไม่ทดสอบเครื่องพิมพ์จริงและการส่งพัสดุจริง; ฉลากคือฉลากที่อยู่ ไม่ใช่ carrier label
- สินค้ายังไม่ได้ผลิต ต้องยืนยันขนาด สูตร ส่วนผสม/สารก่อภูมิแพ้ อายุสินค้า การเก็บ และการส่งก่อนเปิดขาย
- ระบบรับออเดอร์ถูกปิดสองชั้นตามคำสั่งล่าสุด แม้ code path สำหรับอนาคตผ่านการทดสอบแล้ว ไม่อ้างว่าร้านพร้อมรับเงินจริง
