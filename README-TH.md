# myClover Entry V4

ไฟล์ในชุดนี้:
- `index.html` — ประตูบ้านแบบหนึ่งเฟรม วิดีโอ fit-height บน desktop และเต็มจอบน mobile
- `hall.html` — GLHF ritual, Main Quest progress, การ์ตูน, ห้องเรียน, CORE7, RGBG, Sub Quest และ Seeker
- `img/hall-core7.png` — ภาพหลังการ์ด CORE7 จากไฟล์อ้างอิงที่ให้มา

## Progress keys ที่ใช้งาน
- การ์ตูน: `mc_read` — 7 ตอน
- ห้องเรียน: `mc_learn` — 6 บท
- หลักฐาน: `mc_opened=1` หลังบันทึกการ์ด
- GLHF: `mc_glhf_seen=1`
- Seeker: `mc_seek_n`, `mc_seek_hit`, และตรา `SEEKER` ใน `mc_titles`

## ลำดับ RGBG
1. 🔴 TASTER
2. 🟢 KEEPER
3. 🔵 THINKER
4. ⚙️ MAKER

## Upload
อัป `index.html`, `hall.html` และ `img/hall-core7.png` ไปยัง root ของ repository ตาม path เดิม


## V4.1 changes
- แก้ tooltip เป็น floating tooltip วางนอก card เพื่อไม่ให้ชนกรอบหรือถูกตัดบนมือถือ
- การ์ด 4 สายกดได้จริง ไป `paths/` พร้อม anchor (`#taster`, `#keeper`, `#thinker`, `#maker`)
- เพิ่ม section “Paths” แบบไม่เด่น แต่เข้าอ่านต่อได้
- ใช้ภาพจริงจาก `img/` ในการ์ด WHY AI / ห้องเรียน / CORE7 และหน้า Paths
- เปลี่ยนการ์ดภาพเป็นแบบโชว์ภาพเต็มใบ (`object-fit: contain`) ไม่ครอป
- เพิ่มลิงก์ `Paths` ใน nav และ footer
- ต้องมีไฟล์ภาพใน `img/`:
  - `hall-why.jpg`
  - `hall-classroom.jpg`
  - `hall-core7.jpg`
  - `paths-hero.jpg`
