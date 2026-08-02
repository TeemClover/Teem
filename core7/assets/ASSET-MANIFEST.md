# myClover: CORE7 — Asset Manifest

Asset ทั้งหมดของเกมเป็น **งานต้นฉบับ**: ภาพเต็มใบสร้างด้วย ImageGen
และประกอบด้วย template SVG ใน `core7/js/art.js` — ไม่เลียนแบบ Trade Dress,
Frame, Character หรือภาพจำของ TCG แบรนด์อื่น

**Active art set: `FIRST HAND / ART v0.4.0`** — ภาพเต็มใบครบ 28 ใบ
และ Generic 4 สีด้วย template เดียวกัน ตัวเกมอ้างการ์ดด้วย `cardId`
ไม่อ้างลำดับไฟล์ จึง rollback เป็น art set ก่อนหน้าได้โดยไม่กระทบกติกา

ตัวอักษร ขอบ ไอคอน และข้อมูลการ์ดเรนเดอร์เป็น Vector เหนือภาพ WebP
จึงคมทุกขนาด พร้อมสีสำรองหากภาพยังโหลดไม่เสร็จ

## รายการ Asset

| Asset | ฟังก์ชัน | ขนาดฐาน | การใช้งาน | สถานะ |
|---|---|---|---|---|
| โลโก้โคลเวอร์ 4 แฉกรูปหัวใจ Metallic (แดง-ฟ้า-เขียว-เทา ตามภาพต้นแบบแบรนด์) | `cloverLogo(size)` | 100×100 viewBox | Nav, Card Back, Favicon | ✅ Final V1 |
| Wordmark `myClover · CORE7` | HTML + font stack | — | Nav ทุกหน้า | ✅ Final V1 |
| หน้าการ์ด FIRST HAND 28 ใบ | `cardSVG(id)` + WebP | 300×420 (63:88) | Collection, Match, Print | ✅ ART v0.4 ภาพเต็มใบครบ 28 ใบ |
| Generic Card 4 สี | `genericCardSVG(color)` + WebP | 300×420 | Guest ทุกโหมด | ✅ ART v0.4 ครบ 4 สี |
| หลังการ์ดมาตรฐาน — ตราหัวใจโคลเวอร์ + วงเข็มทิศทอง, ชื่อบนใบคือ `myClover` เท่านั้น (CORE7 เป็นชื่อโหมด ห้ามพิมพ์บนการ์ด) | `cardBackSVG()` | 300×420 | Match, Print | ✅ Final V1 — แบบเดียวทุกใบ เดาหน้าไพ่ไม่ได้ |
| โปสเตอร์ myClover : First Hand (Coming Soon) | ไฟล์ภาพจากผู้ก่อตั้ง | `img/core7-poster-{640,1024}.webp` + jpg | หน้า `/card/` ส่วนชวนเล่นเกม | ✅ ภาพจริง |
| Icon ประจำสี (flame/drop/leaf/gear) | `colorIcon(color)` | 24×24 | หน้าการ์ดและภาพสอนกติกา | ✅ Final V1 |
| Pattern ประจำสี (bite/thought/shield/block) | `patternDefs()` | pattern tile | แถบการ์ด, Accessibility | ✅ Final V1 |
| ภาพสรุปกติกาใบเดียว | `core7-rules-overview.png` | 1024×1536 | Landing, Rules, Tutorial, Match | ✅ v0.4.2 |
| วงสี Static | `colorCycleSVG()` | 300×260 | Rules TH/EN | ✅ Final V1 |
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

## Raster replacement ในอนาคต (ถ้าต้องการภาพวาดเต็ม)

Production Prompt ต่อใบอยู่ในข้อมูลการ์ด (`cards.js` ฟิลด์ `artTh`) เช่น
"มือเอื้อมไปหาอาหารจานโปรด" — สไตล์ที่ล็อก: อบอุ่น ร่วมสมัย ไม่ใช่คาสิโน
ไม่ใช่การ์ตูนเด็กเกินไป โทนสีตาม `COLOR_META` + Cream/Gold ของแบรนด์
ภาพจริงวางที่ `core7/assets/cards/<id>.webp` และ `cardSVG` ฝังภาพผ่าน
full-bleed template กลาง (Frame/ชื่ออังกฤษ/ไทย/เลขชุด) จึงเปลี่ยนภาพรายใบได้โดยไม่แก้ layout
