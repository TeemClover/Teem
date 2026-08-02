# CORE7 v0.3 Beta — Production Setup

โค้ด multiplayer อยู่ใน repo แล้ว แต่การเล่นข้ามอุปกรณ์จะออนไลน์จริงหลังเจ้าของโปรเจกต์ผูก Cloudflare D1 และ deploy เท่านั้น ไม่มี secret ใดควรอยู่ใน Git

## สิ่งที่เจ้าของโปรเจกต์ต้องเตรียม

- Cloudflare account และสิทธิ์แก้ Pages project ของ `myclover.com`
- D1 database สำหรับ production และ staging (แยกกัน)
- สิทธิ์แก้ DNS/domain และ Pages environment bindings
- budget/spending alert และช่องทางรับ alert เมื่อ API error
- Privacy/Terms/Beta notice และระยะเวลาเก็บ room logs ที่อนุมัติแล้ว
- ผู้ทดสอบ 2–4 คน คนละอุปกรณ์และคนละเครือข่าย
- ผู้รับผิดชอบตัดสินใจ rollback หลังเปิด Beta

## ขั้นตอนเปิด Staging

1. สร้าง D1 database สำหรับ staging ใน Cloudflare Dashboard
2. รัน `core7/backend/schema.sql` กับ database นั้น
3. ที่ Pages project → Settings → Bindings เพิ่ม D1 binding ชื่อ **`DB`**
4. ผูก binding ให้ Preview environment ก่อน แล้ว deploy branch staging
5. เปิด `/api/core7/health` ต้องได้ `{"ok":true,"version":"0.3-beta"}`
6. เปิด `/core7/create/` สร้าง Public Quick room และใช้อีกอุปกรณ์ Join จาก `/core7/join/`
7. ทดสอบ Quick, BO3, BO5, refresh/reconnect และ disconnect คนละ network

Pages จะ bundle catch-all function ที่ `functions/api/core7/[[path]].js` อัตโนมัติ
บน `teem.pages.dev` client ใช้ same-origin `/api/core7`; บน `www.myclover.com`
ซึ่งเสิร์ฟ static site ผ่าน Vercel client จะเรียก `https://teem.pages.dev/api/core7`
อัตโนมัติผ่าน CORS ไม่มี client secret

## Production checklist

- [ ] production D1 รัน schema ล่าสุดแล้ว
- [ ] binding ชื่อ `DB` อยู่ทั้ง Preview และ Production
- [ ] `/api/core7/health` ตอบ 200
- [ ] Public Lobby ไม่แสดงห้อง unlisted/เต็ม/หมดอายุ
- [ ] รหัส `0042`-ลักษณะเดียวกันรักษาเลขศูนย์นำหน้า
- [ ] สองอุปกรณ์เล่นจบ Quick/BO3/BO5 และเห็นตัวเองฝั่งซ้าย
- [ ] refresh ระหว่างเลือก, reveal และ discard กลับเข้า state เดิม
- [ ] network payload ฝ่ายตรงข้ามไม่มี Starting Hand ก่อน Series จบ
- [ ] monitoring และ spending alert เปิดอยู่
- [ ] Privacy/Terms/Beta notice มี support contact
- [ ] มี release ก่อนหน้าให้ rollback และทดสอบปิดหน้า multiplayer แล้ว

## การดูแลข้อมูล

- ห้องรอหมดอายุหลัง 15 นาทีเมื่อไม่มี activity
- ห้องที่เริ่มแล้วต่ออายุได้สูงสุดตาม activity และถูกเก็บใน `c7_beta_rooms`
- token ดิบอยู่เฉพาะ browser; server เก็บ SHA-256 hash ใน state JSON
- หน้า Lobby ได้เฉพาะ code, host display name, mode และเวลา ไม่ได้รับ auth hash หรือมือ
- ควรตั้ง scheduled cleanup เพื่อลบแถว `expires_at < Date.now()` ตาม retention ที่อนุมัติ

ตัวอย่าง cleanup SQL:

```sql
DELETE FROM c7_beta_rooms WHERE expires_at < CAST(strftime('%s','now') AS INTEGER) * 1000;
```

## Rollback

1. rollback Pages deployment เป็น release ก่อนหน้า
2. หากต้องหยุดเฉพาะ multiplayer ให้เอา D1 binding ออกจาก production; API จะตอบ `CORE7_DB_NOT_CONFIGURED` และ Bot/Tutorial ยังทำงาน
3. อย่าลบ database ระหว่าง incident เก็บไว้ตรวจ state ตาม retention policy
4. art set อยู่ใน `core7/js/art.js` และมี `CORE7_ART_VERSION`; rollback code จะคืนภาพเดิมโดยไม่กระทบ card IDs
