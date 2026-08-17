# Xircle v5 — Artwork Usage Audit

ตรวจวันที่ 2026-08-17 หลังรอบ mobile/desktop visual QA

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
| `xircle-start-today.webp` | `/xircle/start/` |
| `xircle-hardware-hero.webp` | `/xircle/hardware/` |
| `xircle-products-hero.webp` | `/xircle/products/` |
| `xircle-pattern-hero.webp` | `/xircle/ghost/` |
| `xircle-learn-hero.webp` | `/xircle/learn/` |
| `xircle-reference-hero.webp` | `/xircle/doc/` |
| `xircle-together-hero.webp` | `/xircle/together/` และภาพประกอบในห้องแมวขาว |
| `xircle-party-create-hero.webp` | `/xircle/circle/` และ `/xircle/care/party/` — ภาพหลัก 28 วัน / ทำด้วยกัน |
| `whitecat-guide-cutout.webp` | ใช้เป็นไกด์แมวขาวหลายหน้า เช่น Explore / Learn / Circle / Party / Reference |

## Deliberate reserves — ไม่ใช่ไฟล์ตกหล่น

| Asset | สถานะ | เหตุผล |
|---|---|---|
| `xircle-party-join-hero.webp` | สำรองสำหรับคำชวน / share card | ผู้ใช้เลือก `xircle-party-create-hero.webp` เป็นภาพหน้าหลักของประสบการณ์ 28 วัน เพราะอธิบายการทำด้วยกันชัดกว่า จึงไม่ควรสลับ Hero หน้า Party ไปมาเมื่อมีรหัสชวน |
| `xircle-routinex-hero.webp` | สำรอง | หน้า `/xircle/routinex/` ใช้แผนภาพ ABCD + Flavor+ แบบ interactive ที่คงอยู่บนจอทั้งบท จึงไม่ควรยัด Hero อีกภาพเข้าไปจนแย่งลำดับสายตา |

## Display invariant

1. ไฟล์จริงที่อัปโหลดล่าสุดเป็นตัวกำหนดสัดส่วนของกรอบ ไม่ใช้ ratio เก่าจาก manifest บังคับภาพใหม่
2. หลังภาพโหลด กรอบต้องตาม canvas จริง: `width:100%` + `height:auto`
3. ภาพเต็มบรรทัดบนมือถือขยายได้ถึงความกว้าง viewport และยังเก็บมุมมน
4. ไม่ยืดภาพ ไม่บีบภาพ และไม่สร้างแถบว่างบน/ล่างจากกรอบที่สูงกว่าภาพ
5. ถ้าภาพหนึ่งถูกเก็บเป็น reserve ต้องมีเหตุผลทาง UX ชัดเจน ไม่ยัดภาพเพื่อให้ตัวเลข usage เป็น 100%
