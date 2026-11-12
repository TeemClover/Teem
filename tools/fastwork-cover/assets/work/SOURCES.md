# ที่มาของภาพในปก (provenance)

ทุกภาพคือผลงานจริงที่เปิดอยู่บนเว็บ ถ่ายด้วยสคริปต์ในโฟลเดอร์นี้ ไม่มีภาพหน้าจอที่วาดขึ้นเอง
วันที่ถ่าย: 2026-11-12 (headless Chromium, viewport 1280×800, DPR 1.5, locale th-TH)

| ไฟล์ | มาจาก | ทำอะไรกับภาพ |
| --- | --- | --- |
| `homechew-page.jpg` | https://www.myclover.com/homechew/ (เลื่อนหน้าหนึ่งรอบให้ส่วนที่ reveal ตอน scroll แสดงครบ แล้วถ่ายเต็มหน้า) | ตัดเฉพาะ 1,400px แรกของหน้า ย่อเหลือกว้าง 1200px |
| `homechew-nav.jpg` | หน้าเดียวกัน | ตัดแถบเมนู (sticky) ออกมาเป็นชิ้นแยก เพื่อให้ตอนเลื่อนในปก เมนูค้างบนเหมือนเว็บจริง |
| `erp.jpg` | https://www.myclover.com/showcase/erp-brand/ หน้า "ภาพรวม" | ย่อเหลือกว้าง 1200px ไม่ตัด — แถบบน "ตัวอย่างสาธิต นวลา เป็นธุรกิจสมมติ" และป้าย "ข้อมูลสมมติ" ของหน้าเว็บยังอยู่ในภาพ |
| `trailer/f000–f051.jpg` | โค้ด trailer จริงของห้องเรียน AI ใส่ซอส (`assets/classroom-trailer.js` ใน repo นี้ = ที่เสิร์ฟบน /classroom/) | เรียก `MC_TRAILER.render(ctx, 960, 540, T)` ที่ T = 7.6–9.3 วินาที (ฉากชื่อเรื่อง) ทีละเฟรม 30fps — เป็นภาพที่เว็บวาดเอง ณ เวลานั้น |
| `card-back.webp` | `core7/assets/card-back.webp` (หลังการ์ดเกม CORE7) | ย่อเหลือกว้าง 480px |
| `card-connect.webp` | `core7/assets/cards/fh-silver-connect.webp` (ภาพหน้าการ์ด CONNECT ของ CORE7) | ย่อเหลือกว้าง 480px แสดงแบบ crop ให้พอดีสัดส่วนการ์ด |

ถ่ายใหม่: `node tools/fastwork-cover/capture.mjs` (ได้ไฟล์ดิบใน `raw/` ซึ่งไม่ได้ commit) และ `node tools/fastwork-cover/capture-trailer.mjs`
จากนั้นย่อ/ตัดด้วยคำสั่ง ffmpeg ใน `README.md` หัวข้อ "ทำ texture ใหม่"

## สิ่งที่เปิดดูแล้วแต่ไม่ได้ใช้

- `/mediral/` — เป็นแบรนด์ของบุคคลที่สาม (หน้าเว็บระบุเองว่า "ไม่ใช่เว็บไซต์ทางการของ Mediral") ใส่บนปกโปรไฟล์แล้วเสี่ยงถูกเข้าใจว่าเป็นเจ้าของแบรนด์
- `x.myclover.com` (Clover X Office) — หน้าแรกสาธารณะมีแถบชื่อสมาชิกทีมและสถานะทีม จึงไม่นำมาแสดง
- `/tour/` — โทนฟ้า/ขาวสว่าง ไม่เข้ากับชุดสีเขียวลึกของปก
- `teambook.me` — redirect ไป `www.teambook.me` ซึ่งเครือข่ายของ session นี้ไม่ได้อนุญาต จึงไม่ได้เปิดดู (ข้ามตามที่ตกลง)
