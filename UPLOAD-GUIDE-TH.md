# myClover Homepage V3 — Package

นี่คือแพ็กหน้าใหม่เวอร์ชันล่าสุด

## มีอะไรในแพ็ก
- `index.html` — หน้าแรก / ประตูบ้าน
- `hall.html` — โถงทางเดินเวอร์ชันใหม่
- `hall-full.html` — โถงฉบับเต็ม (First Version)
- `img/home-opening-poster.jpg` — ภาพ poster ของคลิปเปิดบ้าน
- `media/home-opening-bg.mp4` — วิดีโอ background ไม่มีเสียง
- `media/home-opening-full.mp4` — วิดีโอเต็ม 44 วินาที (เปลี่ยนไฟล์นี้ได้ภายหลัง)
- `favicon.ico`, `favicon.svg`, `mask-icon.svg`, `site.webmanifest`
- `icons/` — ชุดไอคอนเว็บ
- `IMAGE-SLOTS.md` — ลิสต์ภาพที่แนะนำให้สร้างเพิ่ม
- `SHA256SUMS.txt` — เช็กไฟล์ไม่เสีย

## จุดสำคัญ
### หน้าแรก
- ไม่มี lock / password แล้ว
- มี TH / EN เฉพาะหน้าแรก
- copy ใหม่:
  - "ดูคลิปสั้น 44 วิ ก่อนเริ่ม"
  - "บ้านหลังนี้มีทั้งเรื่องเล่า บทเรียน เกม และของที่หยิบกลับไปใช้ได้จริง"
- ปุ่มหลัก 2 ปุ่ม:
  - ดูคลิปเปิดบ้าน
  - หยิบเข็มทิศ
- Easter egg ท้ายหน้า:
  - เริ่มเป็น ☘️
  - ถ้าสุ่มติด 1/10 เปลี่ยนเป็น 🍀 และให้ SEEKER

### โถง
- เปิดด้วย "คุณหยิบเข็มทิศมาแล้ว"
- ขาย 3 ของหลักก่อน:
  - WHY AI?
  - ห้องเรียน AI 6 บท
  - CORE7
- มี Main Quest และลิงก์ไป Inventory
- มี section โลกของ myClover 4 สาย:
  - 🔴 TASTER
  - 🔵 THINKER
  - 🟢 KEEPER
  - ⚙️ MAKER
- มี mini tooltip สำหรับศัพท์เกม / ศัพท์เทคนิค
- มีปุ่มขยาย:
  - ดูโถงฉบับเต็ม (First Version)

## วิธีอัปโหลด
1. เปิด repo `TeemClover/Teem`
2. เข้า branch ที่ต้องการอัป เช่น `agent/home-video-gateway`
3. แตก ZIP นี้ แล้วอัปโหลดไฟล์ตาม path เดิมจาก root ของ repo
4. Commit แล้วเช็กหน้าเว็บ

## หมายเหตุเรื่องภาพ
ตอนนี้ `hall.html` ใช้ "พื้นที่รอภาพ" สำหรับการ์ด Main Quest
ดูชื่อไฟล์แนะนำใน `IMAGE-SLOTS.md`


## V3.1 changes
- `index.html` ไม่มี Easter egg แล้ว
- หน้าแรกจบในหนึ่งเฟรมและปิดการเลื่อน
- วิดีโอ background เล่นวนด้วย `loop`
- Easter egg ย้ายไปท้าย `hall.html`
- เมื่อพบ SEEKER แล้ว ปุ่มเปลี่ยนเป็น 🍀 และถูก disable ถาวร
- เมื่อโหลดหน้าใหม่หลังพบแล้ว จะไม่ขึ้นข้อความให้ลองกดอีก


## V3.2 — Social preview และ SEO
- ปรับ title และ meta description ให้ขายทั้งความโชคดีและผลลัพธ์ที่อยู่ในบ้าน
- เพิ่ม Open Graph และ Twitter Card ครบชุด
- ใช้ `img/og-home.jpg` เป็นภาพแชร์หน้าแรก 1200×630
- เพิ่ม canonical และ robots directive
- เพิ่ม WebSite, Organization และ WebPage structured data ที่หน้าแรก
- เพิ่ม CollectionPage + ItemList structured data ที่หน้า Hall
- เพิ่ม `robots.txt` และ `sitemap.xml`
- ตั้ง `hall-full.html` เป็น `noindex,follow` เพื่อไม่ให้ First Version แข่งกับหน้าหลัก
- เพิ่ม `SOCIAL-SEO-GUIDE-TH.md`
