# Xircle v5 — Artwork Usage Audit

ตรวจวันที่ 2026-08-18 หลังเพิ่ม RoutineX product bridge และ invited-party conversion block

## Active artwork

| Asset | ใช้ที่ |
|---|---|
| `xircle-s00-hook-hero.webp` | `/xircle/` — เปิดเส้นทาง |
| `xircle-s01-memory-gap.webp` | `/xircle/` — ความจำไม่ใช่ข้อมูลทั้งหมด |
| `xircle-s02-sleep.webp` | `/xircle/` — นอน |
| `xircle-s03-eat.webp` | `/xircle/` — กิน |
| `xircle-s04-move.webp` | `/xircle/` — ขยับ |
| `xircle-s06-yesterday-visible.webp` | `/xircle/` — Habit Score / เมื่อวานมองเห็นได้ |
| `xircle-s07-one-action.webp` | `/xircle/` — เลือก 1 อย่าง |
| `xircle-s08-seeing-not-doing.webp` | `/xircle/` — เห็นแล้วไม่ได้แปลว่าทำต่อได้ |
| `xircle-s09-connected-loop.webp` | `/xircle/` — ระบบที่ต่อกัน |
| `xircle-care-hero.webp` | `/xircle/care/` |
| `xircle-care-data-vs-life-01.webp` | `/xircle/care/` |
| `xircle-opportunity-o0-intro.webp` | `/xircle/opportunity/` |
| `xircle-opportunity-o1-signal.webp` | `/xircle/opportunity/` |
| `xircle-opportunity-o2-context.webp` | `/xircle/opportunity/` |
| `xircle-opportunity-o3-followup.webp` | `/xircle/opportunity/` |
| `xircle-opportunity-o4-boundary.png` | `/xircle/opportunity/` |
| `xircle-opportunity-o5-summary.png` | `/xircle/opportunity/` |
| `xircle-opportunity-o6-whitecat-reveal.png` | `/xircle/explore/` — Hero ห้องแมวขาว / จุดเซฟ |
| `xircle-routinex-hero.webp` | `/xircle/routinex/` — final payoff หลังดู A / B / C / D / Flavor+ ครบ; เปิด product window ก่อน XTY |
| `xircle-start-today.webp` | `/xircle/start/` |
| `xircle-hardware-hero.webp` | `/xircle/hardware/` |
| `xircle-products-hero.webp` | `/xircle/products/` |
| `xircle-pattern-hero.webp` | `/xircle/ghost/` |
| `xircle-learn-hero.webp` | `/xircle/learn/` |
| `xircle-reference-hero.webp` | `/xircle/doc/` |
| `xircle-together-hero.webp` | `/xircle/together/` และภาพประกอบในห้องแมวขาว |
| `xircle-party-create-hero.webp` | `/xircle/circle/` และ `/xircle/care/party/` — เปิดวง / ภาพหลัก 28 วัน |
| `xircle-party-join-hero.webp` | `/xircle/circle/` — บล็อก “มีคนชวนอยู่แล้ว?” และ `/xircle/care/party/` เมื่อมี invite handoff |
| `whitecat-guide-cutout.webp` | ใช้เป็นไกด์แมวขาวหลายหน้า เช่น Explore / Learn / Circle / Party / Reference |

## Conversion roles

- `xircle-routinex-hero.webp` ไม่แย่ง diagram ระหว่างบทเรียน: แสดงเฉพาะ final scene แล้วพาไป `ดูสินค้าใน RoutineX` หรือไปต่อ `แมวขาว · XTY` ได้ทันที
- `xircle-party-create-hero.webp` = คนที่กำลังคิดจะเปิดวงของตัวเอง
- `xircle-party-join-hero.webp` = คนที่มีคำชวน/รหัสตี้อยู่แล้ว จึงใช้เป็น visual สำหรับ Join โดยเฉพาะ
- Product deep-dive เป็น optional detour หลัง RoutineX เท่านั้น ไม่เปิดทางให้ข้าม first-day journey

## Display invariant

1. ไฟล์จริงที่อัปโหลดล่าสุดเป็นตัวกำหนดสัดส่วนของกรอบ ไม่ใช้ ratio เก่าจาก manifest บังคับภาพใหม่
2. หลังภาพโหลด กรอบต้องตาม canvas จริง: `width:100%` + `height:auto`
3. ภาพเต็มบรรทัดบนมือถือขยายได้ถึงความกว้าง viewport และยังเก็บมุมมน
4. ไม่ยืดภาพ ไม่บีบภาพ และไม่สร้างแถบว่างบน/ล่างจากกรอบที่สูงกว่าภาพ
5. ภาพแต่ละภาพต้องมีหน้าที่ใน journey/conversion ที่ชัดเจน ไม่ยัดเพื่อให้ตัวเลข usage เป็น 100%