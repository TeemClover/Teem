# myClover: CORE7 — Asset Manifest

Asset ทั้งหมดของเกมเป็น **งานต้นฉบับ** สร้างด้วยโค้ด (Procedural SVG)
ในไฟล์ `core7/js/art.js` — ไม่เลียนแบบ Trade Dress, Frame, Character
หรือภาพจำของ TCG แบรนด์อื่น และไม่มีไฟล์ภายนอกที่ติดลิขสิทธิ์

การเรนเดอร์เป็น Vector ทำให้คมทุกขนาด โหลดเร็ว (ไม่มีไฟล์ภาพให้ดาวน์โหลด)
และแก้ไขได้ด้วย Git diff ธรรมดา

## รายการ Asset

| Asset | ฟังก์ชัน | ขนาดฐาน | การใช้งาน | สถานะ |
|---|---|---|---|---|
| โลโก้โคลเวอร์ 4 แฉก Metallic | `cloverLogo(size)` | 100×100 viewBox | Nav, Card Back, Favicon-ready | ✅ Final V1 |
| Wordmark `myClover · CORE7` | HTML + font stack | — | Nav ทุกหน้า | ✅ Final V1 |
| หน้าการ์ด FIRST HAND 28 ใบ | `cardSVG(id)` + `SCENES` | 300×420 (63:88) | Collection, Match, Print | ✅ ภาพประกอบ V1 (สไตล์ Minimal-Warm — ยกระดับเป็นภาพวาดเต็มได้ใน V2 โดยเปลี่ยนเฉพาะ `SCENES`) |
| Generic Card 4 สี | `genericCardSVG(color)` | 300×420 | Guest ทุกโหมด | ✅ Final V1 |
| หลังการ์ดมาตรฐาน | `cardBackSVG()` | 300×420 | Match, Print | ✅ Final V1 — สมมาตร เดาหน้าไพ่ไม่ได้ |
| Icon ประจำสี (flame/eye/leaf/gear) | `colorIcon(color)` | 24×24 | ทุก UI ที่แสดงสี | ✅ Final V1 |
| Pattern ประจำสี (bite/thought/shield/block) | `patternDefs()` | pattern tile | แถบการ์ด, Accessibility | ✅ Final V1 |
| วงสี Interactive | `colorCycleSVG()` | 300×260 | Landing, Rules | ✅ Final V1 |
| Table Background | CSS gradient (`core7.css` .match-shell) | — | หน้า Match | ✅ Final V1 |
| Open Graph Image | — | 1200×630 | Social share | ⏳ ใช้ meta ข้อความก่อน — สร้างภาพเมื่อมีเครื่องมือเรนเดอร์ PNG ฝั่ง Server |
| Collection Cover | ใช้ `cloverLogo` + การ์ดพัด (Landing) | — | หน้า Collection | ✅ V1 |

## ข้อกำหนดการพิมพ์ (Print Spec)

- ขนาดการ์ดสำเร็จ: **63 × 88 mm** (มาตรฐาน TCG)
- หน้าเว็บ `/core7/print/`: A4 9-up (3×3) + เส้นตัด — ใช้ที่บ้านได้ทันที
- สำหรับโรงพิมพ์: เพิ่ม Bleed 3 mm ต่อขอบ → พื้นที่พิมพ์ 69 × 94 mm
  (เรนเดอร์ SVG ที่ scale เดิมแล้วขยาย background ออก 3 mm — ทำได้จาก
  `cardSVG` โดยเพิ่มพารามิเตอร์ bleed ใน V2)
- แนะนำกระดาษ 250–300 gsm หรือกระดาษธรรมดา + ซองการ์ดสี

## แนวทางภาพ V2 (ถ้าต้องการภาพวาดเต็ม)

Production Prompt ต่อใบอยู่ในข้อมูลการ์ด (`cards.js` ฟิลด์ `artTh`) เช่น
"มือเอื้อมไปหาอาหารจานโปรด" — สไตล์ที่ล็อก: อบอุ่น ร่วมสมัย ไม่ใช่คาสิโน
ไม่ใช่การ์ตูนเด็กเกินไป โทนสีตาม `COLOR_META` + Cream/Gold ของแบรนด์
เมื่อได้ภาพจริง: วางไฟล์ที่ `core7/assets/cards/<id>.webp` แล้วให้
`cardSVG` ฝังภาพแทน `SCENES` — โครงการ์ด (Frame/ชื่อ/Pattern) ไม่ต้องแก้
