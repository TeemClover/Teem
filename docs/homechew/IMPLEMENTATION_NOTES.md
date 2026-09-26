# Homechew v1.5 — การเทและภาพสำรอง

## ปริมาตร

`timeline.js` ใช้ `BOTTLE_CAVITY` ร่วมกับ geometry ใน `bottle.js` จึงวัดช่องขวดเดียวกับที่เห็นจริง โดย integrate พื้นที่หน้าตัดใต้ระนาบแนวนอนและหาความสูงด้วย binary search แทน percentile จาก point cloud ที่กระโดดตามตำแหน่งตัวอย่าง

สมดุลทุกตำแหน่ง scroll:

`initialVolume = fill.volume + stream.volume + pool.volume`

- ปริมาตรเริ่มต้น ≈ 12.8944 หน่วยโมเดล³
- หนึ่งถ้วย ≈ 1.10645 หน่วยโมเดล³ หรือ 8.5809% ของปริมาตรเริ่มต้น
- จบแล้วขวดเหลือ 91.4191% ระดับตั้งตรงอยู่ในช่วงไหล่ขวด
- ตัวเลขทั้งหมดเป็นหน่วยโมเดล ไม่ใช่ขนาดบรรจุจริงหรือ mL
- ระดับถ้วยย้อนจากปริมาตรและรูปทรงถ้วย ไม่เพิ่มความสูงแบบเส้นตรง
- ผิวหน้าซอสเป็น mesh ที่ตัดตามช่องขวดจริง ตั้งฉากกับแรงโน้มถ่วง ส่วน shell ถูก clip ที่ระนาบเดียวกัน
- ปริมาตรที่อยู่ระหว่างปากขวดกับถ้วยจะลงถ้วยเมื่อท้ายสายซอสหลุด ไม่เติมกลับเข้าไปในขวด

การแสดงผลยังเป็น deterministic mesh animation ไม่ใช่ CFD: ไม่มีการจำลองฟองอากาศและความหนืดของสูตรจริงครบทุกอย่าง การอนุรักษ์ปริมาตรและระดับผิวแสดงผลผ่านการทดสอบเชิงตัวเลขอิสระ

## กล้อง

คงเส้นทางกล้อง spline เดิม แต่ช่วงเทตรวจขอบเขตขวด ถ้วย และฝาบนระนาบภาพตาม aspect ratio จริง แล้วปรับตำแหน่งและระยะกล้องอย่างต่อเนื่องให้ครบเฟรม โดยสงวนพื้นที่ข้อความและปุ่มติดจอ การตรวจแค่ข้อความไม่ทับวัตถุไม่พอ: v1.4 ผ่าน overlap guard แต่ขวดบางส่วนหลุดเฟรมทางขวา

การตรวจ `timeline.test.mjs` ใช้จุดผิวขวดหนาแน่นกว่าที่ตัว fit ใช้ ครอบคลุม 6 สัดส่วนจอ และตรวจความต่อเนื่องของความเร็วกล้อง `volume.test.mjs` ใช้ fine midpoint integration แยกจาก Gauss integration ในโค้ดจริง

## ภาพสำรองและการ export

HTML เริ่มด้วย `hc-static` และภาพขวดที่เรนเดอร์ไว้ เมื่อฉากพร้อมจึงเปิด scroll choreography; การที่ JS/3D ล้มเหลวจะไม่ทิ้งพื้นที่ sticky เปล่าไว้

`tests/homechew/export-posters.mjs` สร้างภาพ 4 ไฟล์จาก scene/ฉลากเดียวกับหน้าเว็บ:

- `trio-wide.webp`: 1920×1200
- `trio-tall.webp`: 780×1688
- `trio-tablet.webp`: 1536×2048
- `trio-set.webp`: 1170×1270, crop จาก render 1170×2532

ตั้ง `FRONTDOOR_PLAYWRIGHT` เป็นไฟล์โมดูล Playwright, `FRONTDOOR_CHROME` เป็น Chrome executable, `HOMECHEW_SHARP` เป็นโฟลเดอร์แพ็กเกจ sharp และ `HOMECHEW_BASE_URL` เป็น local preview ก่อนรัน:

```sh
node tests/homechew/export-posters.mjs
node --test tests/homechew/
node tests/homechew/page.e2e.mjs
node tests/homechew/resilience.e2e.mjs
```

ดูภาพที่ export ทุกครั้งหลังเปลี่ยนกล้อง hero เพื่อให้ crop ชุดซอสไม่ตัดฝาหรือก้นขวด ภาพอาหารใหม่และ prompts อยู่ใน `ASSETS_v1.5.md`; ผลตรวจรอบนี้อยู่ใน `QA_v1.5.md`
