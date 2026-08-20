# TeamBook — Decor Library

ภาพประดับ 97 ชิ้น พื้นใส ขนาดรวม 658 KB — เอาไปแปะในหน้าไหนก็ได้
ทุกชิ้นถูกครอปชิดขอบภาพของตัวเองแล้ว ไม่มีขอบเปล่าเหลือ

```
xty/assets/decor/
  brand/        8 ชิ้น   Brand
  mascot/       8 ชิ้น   Mascot
  sticker/     35 ชิ้น   Sticker
  stationery/  26 ชิ้น   Stationery
  doodle/      20 ชิ้น   Doodle
  _source/     PNG ต้นฉบับ ห้ามลบ (ดูหัวข้อ "ต้นฉบับ")
```

## เอาไปใช้ยังไง

ภาพพวกนี้เป็น**ของประดับ** ไม่ใช่เนื้อหา คนที่ใช้โปรแกรมอ่านหน้าจอไม่ควรต้องฟังว่า
มีสติกเกอร์รูปหัวใจอยู่ตรงมุม เพราะฉะนั้นปล่อย `alt` ว่างไว้ แล้วซ่อนจาก accessibility tree

```html
<img src="/xty/assets/decor/mascot/cat-holding-book.webp"
     alt="" aria-hidden="true" width="233" height="284"
     loading="lazy" decoding="async">
```

ใส่ `width`/`height` เสมอ ถึงจะย่อด้วย CSS ก็ตาม — เบราว์เซอร์ใช้สองค่านี้จองที่ไว้ก่อน
ภาพจะโหลด ถ้าไม่ใส่ หน้าจะกระตุกตอนภาพมาถึง ขนาดจริงของทุกไฟล์อยู่ในตารางข้างล่าง

ถ้าภาพนั้น**สื่อความหมาย**จริง (เช่น ไอคอนกิจกรรมที่บอกว่าอันไหนคืออันไหน) ก็เขียน `alt`
ให้ตรงกับความหมายนั้น แล้วเอา `aria-hidden` ออก

## กฎที่ควรรู้ก่อนหยิบ

- **หนึ่งหน้าจอ ใส่ไม่กี่ชิ้น** ให้รู้สึกเหมือนสมุดที่มีคนใช้จริง ไม่ใช่กำแพงสติกเกอร์
- **แมวไม่ใช่โลโก้** เป็นเพื่อนร่วมทาง โลโก้หลักคือสมุดปิด + dual-stroke + RGBS
- **Fire / Leaf / Water / Craft** เป็นภาพประกอบของระบบกิจกรรม ไม่ใช่โลโก้
- **โคลเวอร์สี่ใบ** เป็น heritage ของ myClover ใช้เป็นลายเซ็น ไม่ใช่ตราหลักของ TeamBook
- อย่ายืดภาพผิดสัดส่วน ทุกชิ้นวาดมาในอัตราส่วนของตัวเอง

## ต้นฉบับ

`_source/` คือ PNG ที่ตัดพื้นหลังแล้ว เป็นต้นฉบับของทุกไฟล์ในนี้ **อย่าลบ** — ถ้าวันหนึ่ง
อยากได้ไฟล์คมกว่านี้ หรืออยากตัดชิ้นใหม่ออกจากแผ่นเดิม ต้องใช้มัน

สร้างไฟล์ `.webp` ทั้งหมดใหม่ด้วย:

```bash
pip install pillow numpy scipy
python3 scripts/build-decor.py
```

สคริปต์นั้นทำสามอย่าง: ครอปให้ชิดภาพ, แยกแผ่นที่ยังมีหลายชิ้นออกจากกันด้วย alpha,
แล้วเซฟเป็น webp คุณภาพ 82 โดยเก็บพื้นใสไว้ ชื่อไฟล์กำหนดไว้ในตาราง `KEEP` และ `SPLIT`
ในสคริปต์ ถ้าจะเพิ่มชิ้นใหม่ ให้เพิ่มที่นั่นและเพิ่มคำอธิบายใน `scripts/gen-decor-readme.py`
ไม่งั้นสคริปต์จะไม่ยอมสร้างไฟล์นี้ให้

แผ่น `SourceSheet_A/B.png` ขนาดเต็ม (1536×1024) ไม่ได้อยู่ใน repo เพราะทุกชิ้นที่ใช้ได้
ถูกตัดออกมาแล้ว ถ้าต้องการ ให้กลับไปหาจาก zip ต้นทาง
`TeamBook_Web_Decor_PNG_Pack_v2_CleanCut.zip`

## รายการทั้งหมด

### Brand — `brand/` (8 ชิ้น)

เครื่องหมายของ TeamBook เอง — ใช้ตรงที่ต้องบอกว่านี่คือแบรนด์อะไร

| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |
|---|---|---|---|
| `activity-craft.webp` | 65×72 | 1.9 KB | ไอคอนกิจกรรม Craft |
| `activity-fire.webp` | 63×72 | 2.1 KB | ไอคอนกิจกรรม Fire |
| `activity-leaf.webp` | 64×72 | 2.2 KB | ไอคอนกิจกรรม Leaf |
| `activity-water.webp` | 65×72 | 2.1 KB | ไอคอนกิจกรรม Water |
| `clover-heritage.webp` | 100×105 | 5.4 KB | โคลเวอร์สี่ใบ — heritage / ลายเซ็นผู้ก่อตั้ง / easter egg |
| `heart-mark.webp` | 161×144 | 8.0 KB | หัวใจสองเส้น — micro mark, loading, accent |
| `me-bubble.webp` | 135×105 | 5.1 KB | .me bubble — lockup ของ teambook.me |
| `notebook-mark.webp` | 189×200 | 16.0 KB | สมุดปิด + dual-stroke + RGBS — navbar, โปรไฟล์, ชั้นหนังสือ |

### Mascot — `mascot/` (8 ชิ้น)

แมวขาว เป็นเพื่อนร่วมทาง ไม่ใช่ส่วนหนึ่งของโลโก้

| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |
|---|---|---|---|
| `cat-asleep-on-book.webp` | 313×201 | 19.0 KB | empty state — ยังไม่มีอะไรในสมุด |
| `cat-asleep.webp` | 221×236 | 15.3 KB | สงบ / วันนี้ยังไม่มีอะไรใหม่ |
| `cat-holding-book.webp` | 217×269 | 20.6 KB | ต้อนรับ — onboarding, หน้าแรกของสมุดใหม่ |
| `cat-holding-clover.webp` | 227×302 | 21.4 KB | ชมเชย — ครบรอบ, ทำได้ |
| `cat-in-box.webp` | 232×226 | 14.9 KB | เซอร์ไพรส์ / รางวัล |
| `cat-looking-up.webp` | 168×211 | 12.0 KB | ค้นหา / อยากรู้ — หน้ารวมสมุดสาธารณะ |
| `cat-pencil-wink.webp` | 221×263 | 20.4 KB | ชวนให้เขียน — ปุ่มลงชื่อ, เพิ่มกิจกรรม |
| `cat-yarn.webp` | 253×180 | 16.5 KB | ประดับแบบเล่น ๆ |

### Sticker — `sticker/` (35 ชิ้น)

โน้ต ป้าย reaction และชิ้นส่วน UI ที่แปะลงหน้าได้

| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |
|---|---|---|---|
| `activity-tabs-icons.webp` | 342×58 | 8.2 KB | แถบกิจกรรมพร้อมไอคอน (ติดกันเป็นชิ้นเดียว) |
| `activity-tabs-plain.webp` | 342×55 | 7.0 KB | แถบกิจกรรมสีล้วน (ติดกันเป็นชิ้นเดียว) |
| `bubble-blank.webp` | 154×112 | 5.2 KB | tooltip / โน้ตว่าง |
| `bubble-heart.webp` | 116×96 | 4.0 KB | reaction ชื่นชม |
| `bubble-mini-clover.webp` | 83×86 | 3.2 KB | bubble จิ๋วโคลเวอร์ |
| `bubble-mini-dots.webp` | 89×82 | 2.6 KB | bubble จิ๋วกำลังพิมพ์ |
| `bubble-mini-heart.webp` | 83×85 | 2.8 KB | bubble จิ๋วหัวใจ |
| `bubble-mini-me.webp` | 114×88 | 4.2 KB | bubble จิ๋ว .me |
| `button-craft.webp` | 120×121 | 4.8 KB | ปุ่มกลม Craft |
| `button-fire.webp` | 119×120 | 5.4 KB | ปุ่มกลม Fire |
| `button-leaf.webp` | 120×120 | 5.4 KB | ปุ่มกลม Leaf |
| `button-water.webp` | 120×120 | 5.4 KB | ปุ่มกลม Water |
| `label-memory.webp` | 173×92 | 8.0 KB | ป้าย Memory |
| `label-progress.webp` | 172×92 | 6.8 KB | ป้าย Progress |
| `label-team.webp` | 167×89 | 6.5 KB | ป้าย Team |
| `label-together.webp` | 170×87 | 6.8 KB | ป้าย Together |
| `note-clipped.webp` | 164×158 | 7.8 KB | ทิป / โน้ตที่ปักไว้ |
| `note-heart.webp` | 118×110 | 4.4 KB | bubble หัวใจบนกระดาษ |
| `note-lets-go.webp` | 147×155 | 7.7 KB | กระดาษ “Let's go!” |
| `reaction-good-job.webp` | 169×98 | 7.2 KB | reaction “Good job!” |
| `reaction-heart.webp` | 86×73 | 2.4 KB | reaction หัวใจ |
| `reaction-lets-go.webp` | 169×98 | 6.9 KB | reaction “Let's go!” |
| `reaction-like.webp` | 89×73 | 2.9 KB | reaction ถูกใจ |
| `reaction-same-page.webp` | 167×98 | 6.8 KB | reaction “On the same page!” |
| `reaction-see-you-tomorrow.webp` | 175×106 | 8.3 KB | reaction “See you tomorrow!” |
| `ribbon-blank-short.webp` | 216×86 | 6.2 KB | badge สั้น |
| `ribbon-blank-wide.webp` | 254×118 | 8.8 KB | หัวข้อ section แบบกว้าง |
| `ribbon-note.webp` | 208×119 | 6.2 KB | ป้าย / โน้ต |
| `ribbon-tabs-cool.webp` | 119×82 | 4.0 KB | สถานะกิจกรรม ฟ้า/เทา |
| `ribbon-tabs-warm.webp` | 120×83 | 4.0 KB | สถานะกิจกรรม แดง/เขียว |
| `sticky-clover.webp` | 114×111 | 4.5 KB | โน้ต heritage |
| `sticky-heart.webp` | 120×124 | 4.7 KB | ช่วงเวลาที่แชร์กัน |
| `sticky-yellow.webp` | 136×148 | 4.9 KB | callout / ทิป |
| `tags-on-string.webp` | 207×151 | 12.2 KB | tag / metadata |
| `tape-clover.webp` | 192×55 | 3.7 KB | ป้ายหัวข้อ section |

### Stationery — `stationery/` (26 ชิ้น)

สมุด เครื่องเขียน และของบนโต๊ะ

| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |
|---|---|---|---|
| `cards-fan.webp` | 348×232 | 23.4 KB | ภาพประกอบระบบการ์ด/กิจกรรม |
| `clip-binder.webp` | 66×74 | 3.0 KB | คลิปดำ |
| `clip-paper.webp` | 51×69 | 2.6 KB | คลิปหนีบกระดาษ |
| `coffee-clover.webp` | 146×137 | 8.8 KB | เช้า / อบอุ่น |
| `coffee-foam.webp` | 204×231 | 14.4 KB | เช้า / อบอุ่น (ถ้วยใหญ่) |
| `feather-pen.webp` | 184×189 | 10.3 KB | บทส่งท้าย |
| `memory-jar.webp` | 179×203 | 14.6 KB | สะสมความทรงจำ |
| `notebook-closed.webp` | 138×157 | 8.9 KB | ชั้นหนังสือ / คลัง |
| `notebook-open-large.webp` | 396×230 | 22.5 KB | ภาพประกอบใหญ่ |
| `notebook-open.webp` | 230×137 | 12.2 KB | section เรื่องเล่า / ความทรงจำ |
| `notebook-strapped.webp` | 221×258 | 19.1 KB | object แบรนด์รอง |
| `pencil-green.webp` | 110×121 | 3.7 KB | ดินสอเขียว |
| `pencil-grey.webp` | 98×119 | 3.3 KB | ดินสอเทา |
| `pencil-red.webp` | 110×123 | 3.7 KB | ดินสอแดง |
| `pencil.webp` | 70×164 | 4.3 KB | เขียน / แก้ไข |
| `photo-stack.webp` | 241×230 | 19.8 KB | สรุป / ความทรงจำ |
| `pin-blue.webp` | 47×63 | 1.9 KB | หมุดฟ้า |
| `pin-red.webp` | 45×63 | 1.6 KB | หมุดแดง |
| `pin-yellow.webp` | 43×61 | 1.5 KB | หมุดเหลือง |
| `signpost.webp` | 216×263 | 21.9 KB | เส้นทาง Dream / Do / Share |
| `washi-gingham-green.webp` | 149×40 | 3.1 KB | เทปลายสก็อตเขียว |
| `washi-gingham-pink.webp` | 148×42 | 2.8 KB | เทปลายสก็อตชมพู |
| `washi-kraft.webp` | 170×55 | 3.2 KB | เทปกระดาษคราฟท์ |
| `washi-stars-blue.webp` | 150×37 | 3.1 KB | เทปลายดาวฟ้า |
| `washi-stripe-yellow.webp` | 144×43 | 2.6 KB | เทปลายทางเหลือง |
| `wax-seal.webp` | 116×116 | 5.4 KB | ตราปิดท้าย / พิธีจบเล่ม |

### Doodle — `doodle/` (20 ชิ้น)

เส้นวาดเล่น ใช้เป็น accent ไม่ใช่ตัวเอกของหน้า

| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |
|---|---|---|---|
| `clover.webp` | 65×66 | 2.9 KB | accent heritage |
| `flower.webp` | 59×68 | 2.5 KB | ประดับ |
| `footprint.webp` | 42×49 | 1.5 KB | เส้นทาง / ความคืบหน้า |
| `heart-path.webp` | 50×49 | 1.8 KB | เส้นเชื่อม / คั่น |
| `heart.webp` | 71×66 | 3.7 KB | ช่วงเวลาที่แชร์กัน |
| `leaves.webp` | 98×55 | 3.4 KB | accent สงบ / เติบโต |
| `music-note.webp` | 53×55 | 2.1 KB | accent เล่น ๆ |
| `plane-outline.webp` | 84×68 | 3.9 KB | ชวนเพื่อน (ลายเส้น) |
| `plane-path.webp` | 84×61 | 2.9 KB | ชวนเพื่อน + เส้นทาง |
| `plane.webp` | 109×85 | 4.2 KB | ชวนเพื่อน / แชร์ |
| `scribble-blue-soft.webp` | 86×49 | 2.3 KB | ไฮไลต์ฟ้าอ่อน |
| `scribble-blue.webp` | 84×44 | 2.3 KB | ไฮไลต์ฟ้า |
| `scribble-green-soft.webp` | 80×45 | 2.1 KB | ไฮไลต์เขียวอ่อน |
| `scribble-green.webp` | 86×43 | 2.1 KB | ไฮไลต์เขียว |
| `scribble-grey.webp` | 84×45 | 2.0 KB | ไฮไลต์เทา |
| `scribble-pink.webp` | 86×46 | 2.2 KB | ไฮไลต์ชมพู |
| `scribble-red.webp` | 94×46 | 2.4 KB | ไฮไลต์แดง |
| `scribble-yellow.webp` | 92×48 | 2.4 KB | ไฮไลต์เหลือง |
| `sprout.webp` | 98×87 | 4.6 KB | เริ่มต้นใหม่ |
| `star.webp` | 69×66 | 2.7 KB | รางวัล / เน้น |
