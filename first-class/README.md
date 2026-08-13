# AI ใส่ซอส · First Class Pilot

## Flow ที่เปิดใช้แล้ว

1. ผู้เรียนเข้า `/first-class/`, เข้า Discord ก่อนได้ และกรอกฟอร์มโดยไม่ต้องแนบสลิป
2. ระบบบันทึกสถานะ `submitted` พร้อมเวลาโอน, Email และ Discord Username
3. ตัวตรวจยอดภายนอกเรียก `POST /api/first-class` ด้วย `action: verify_payment`, ยอด `98`, ความมั่นใจอย่างน้อย `0.9` และ header `x-verifier-key`
4. เมื่อผ่าน ระบบเปลี่ยนเป็น `paid` + `granted`, มอบ Discord Role และส่งอีเมลโดยอัตโนมัติเมื่อกำหนด credentials ครบ
5. ถ้าระบบจับคู่ไม่สำเร็จ Teem ใช้ `/first-class/admin/` กดยืนยัน, ขอสลิป, มอบ Role หรือเปิดอีเมลสำเร็จรูปได้

## Environment variables

- `DATABASE_URL` (Vercel/Neon) หรือ D1 binding ชื่อ `DB` (Cloudflare)
- `FIRST_CLASS_ADMIN_KEY` สำหรับ Control Room (ค่าเริ่มต้นของ Pilot คือ `calling`; ตั้ง Environment Variable เพื่อเปลี่ยนได้)
- `FIRST_CLASS_VERIFIER_KEY` สำหรับตัวตรวจยอด/AI reconciliation
- `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_FIRST_CLASS_ROLE_ID` สำหรับมอบ Role อัตโนมัติ
- `RESEND_API_KEY`, `FIRST_CLASS_FROM_EMAIL` สำหรับอีเมลอัตโนมัติ

ถ้า Discord หรือ Email credentials ยังไม่ครบ ระบบจะใช้สถานะ `ready` และเตรียมปุ่มทำงานด้วยมือไว้ใน Control Room จึงไม่ทำให้ Pilot ตันกลางทาง

## สถานะหลัก

- Payment: `submitted` → `proof_requested` หรือ `paid`
- First Class: `pending` → `granted`
- Discord: `pending` → `ready` / `needs_match` / `granted` / `failed`
- Email: `pending` → `ready` / `sent` / `failed`
- Attendance: `false` → `true`
