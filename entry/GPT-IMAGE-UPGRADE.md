# คำสั่งสำหรับ ChatGPT: ภาพทั้งเว็บ myClover (v2)

> วิธีใช้: คัดลอก **ทั้งไฟล์นี้** ไปวางใน ChatGPT แล้วพิมพ์ต่อท้ายว่า "เริ่มจากกลุ่ม P1"
> v2 · 2026-10-24 · รวมของเดิม (หน้าแรก 9 ภาพ) กับของใหม่ (ไอเดียระบบ) ไว้ในไฟล์เดียว · ใช้กับ PR #289 (branch `claude/ecstatic-sagan-n10dp0`)
> ทุกช่องมีภาพแทนอยู่แล้ว เว็บใช้ได้ครบโดยไม่ต้องรอภาพ ภาพใหม่จะเข้าไปแทนเองเมื่อชื่อไฟล์ถูกต้อง

---

## ถึง ChatGPT

คุณคือผู้กำกับภาพของ myClover เว็บของ Teem Clover ที่รับทำเว็บ แอป และเกมด้วย AI งานรอบนี้มี 3 กลุ่ม ทำตามลำดับความสำคัญ

| กลุ่ม | จำนวน | ใช้ที่ไหน | ความสำคัญ |
|---|---|---|---|
| **P1** หน้าแรก | 9 ไฟล์ | หน้าแรก myclover.com | ทำก่อน |
| **P2** ปกไอเดียระบบ | 10 ไฟล์ | การ์ดในหน้า /showcase/ (หน้ารอง) | ทำต่อ |
| **P3** ภาพสินค้าในตัวอย่าง | 51 ไฟล์ | ในระบบตัวอย่างแต่ละแบบ | ทำเมื่อมีเวลา ไม่บังคับ |

### ห้ามทำด้วย AI (มีของจริงแล้ว หรือต้องเป็นของจริง)
- **ภาพปกผลงานจริง** Mediral · Hamburg Food Fair · Homechew · X-VISOR Quest · Airova · บ้าน myClover 3D · ห้องเรียน · CORE7 · TeamBook ใช้ภาพหน้าจอจริงของเว็บ Claude Code ทำไว้แล้ว ห้ามวาดใหม่ เพราะต้องตรงกับงานจริง
- **ภาพสินค้าจริงของลูกค้า** เช่น ขวด Mediral รุ่นปัจจุบัน ต้องเป็นภาพถ่ายจากแบรนด์ ไม่ใช่ภาพที่ AI สร้าง
- **รูปของ Teem** ใช้รูปถ่ายจริงที่มีอยู่แล้ว

### โทนแบรนด์ (กลุ่ม P1)
- เขียวป่ากลางคืน `#04100a` · เขียวโคลเวอร์ `#34d27a` · มิ้นต์ `#93ffc4` · ทอง `#f4c75a` · ครีม `#f7f2e6`
- วัสดุหลัก: แก้วใสสีเขียว แสงลอด (caustics) ประกายทองเล็ก ๆ · อารมณ์: พรีเมียม เงียบ ลึก มีเทคโนโลยีแต่ไม่เย็นชา
- กลุ่ม P2 และ P3 เป็นธุรกิจสมมติ ใช้โทนของแต่ละธุรกิจตามที่เขียนใน prompt

### กติกาที่ห้ามพลาด (ใช้กับทุกภาพ ภาพไหนผิดข้อใด ให้ทำใหม่)
1. **ไม่มีตัวหนังสือ ตัวเลข ป้าย หรือโลโก้ในภาพ** ไม่ว่าภาษาใด ฉลากบนขวดให้ว่างหรือเป็นลายนามธรรม (AI วาดภาษาไทยผิดบ่อย ข้อความทั้งหมดอยู่ในโค้ดของเว็บ)
2. **ไม่มีแบรนด์จริงหรือโลโก้แอปจริง** รวมถึงโลโก้ LINE ร้านและสินค้าในตัวอย่างเป็นของสมมติทั้งหมด
3. **ไม่มีหน้าคนที่จำได้** ถ้ามีคน ให้เห็นแค่มือ ด้านหลัง หรือหลุดโฟกัส
4. **วัตถุหลักอยู่กลางภาพ** เพราะมือถือจะครอปขอบซ้ายขวา
5. **ทำขนาดและชื่อไฟล์ตามตารางตรงตัว** และไฟล์ต้องไม่เกินขนาดที่กำหนด
6. **ไม่มีภาพที่สื่อว่ารักษาโรคหรือเห็นผล** ในภาพสกินแคร์และอาหารเสริม ห้ามมีหมอ ชุดกาวน์ ภาพก่อนหลัง หรือผิวที่ดูเหมือนผ่านการรักษา
7. **QR ในภาพต้องเป็นลายนามธรรมที่สแกนไม่ได้** ห้ามสร้าง QR จริง

### ลำดับงาน
ทำทีละช่องตามตาราง กลุ่ม P1 ให้ทำ **3 แบบ** ต่อช่องแล้วเลือกแบบที่ดีที่สุดตามเกณฑ์ "ผ่านเมื่อ" กลุ่ม P2 ทำ 2 แบบต่อช่อง กลุ่ม P3 ทำแบบเดียวพอ แต่ให้ทั้งชุดของร้านเดียวกันใช้พื้น แสง และมุมกล้องเดียวกัน แล้วส่งออกตามขั้น "ส่งออก"

---

## P1 · หน้าแรก (9 ไฟล์ · วางที่ `entry/media/`)

> **อัปเดต 2026-10-25 (หน้าแรก v4):** หน้าแรกใหม่ใช้ภาพและคลิปที่ทำด้วย Higgsfield ครบแล้ว อยู่ที่ `entry/media/v4/` (ภาพหัวเว็บ 16 ชุด ภาพเรื่องราว 16 ภาพ ภาพสินค้า 48 ภาพ คลิปวน 16 คลิป ทุกภาพเป็นธุรกิจสมมติ) ช่อง 1–8 ด้านล่างจึง**ไม่ต้องทำแล้ว** ยังใช้ได้อยู่: ช่อง 9 (`og-home-bg.png` ภาพแชร์ลิงก์) และ `door.webp` ที่มีอยู่แล้ว

| # | ชื่อไฟล์ | ขนาดสุดท้าย | ไม่เกิน | อยู่ตรงไหนในเว็บ |
|---|---|---|---|---|
| 1 | `demo-cafe.webp` | 1200×750 | 140 KB | ภาพหัวเว็บในมือถือจำลอง เมื่อเลือก "คาเฟ่" |
| 2 | `demo-coach.webp` | 1200×750 | 140 KB | เมื่อเลือก "ครู/โค้ช" |
| 3 | `demo-shop.webp` | 1200×750 | 140 KB | เมื่อเลือก "ร้านออนไลน์" |
| 4 | `demo-studio.webp` | 1200×750 | 140 KB | เมื่อเลือก "สตูดิโอ/ฟรีแลนซ์" |
| 5 | `service-web.webp` | 960×640 | 100 KB | การ์ดบริการ "เว็บไซต์" |
| 6 | `service-app.webp` | 960×640 | 100 KB | การ์ดบริการ "แอปและระบบ" |
| 7 | `service-game.webp` | 960×640 | 100 KB | การ์ดบริการ "เกมและ interactive 3D" |
| 8 | `hero-loop.webp` | 1920×1080 | 120 KB | ภาพปกของวิดีโอพื้นหลังหน้าแรก (ทำวิดีโอได้ด้วยตามข้อ 8) |
| 9 | `og-home-bg.png` | 1200×630 | 1 MB | พื้นหลังภาพแชร์ลิงก์ (วางที่ `entry/media/source/` · Code จะใส่ข้อความไทยเอง) |

### 1–4) ภาพหัวเว็บของร้านสมมติ (`demo-*.webp`, 16:10)

ภาพนี้อยู่ใต้หัวข้อของเว็บตัวอย่าง และต้องเข้าได้กับทั้ง 4 สไตล์ที่ผู้เล่นเลือก (อบอุ่น · หรู · สนุก · มินิมอล) เพราะเว็บเปลี่ยนแค่สีพื้นกับตัวอักษร **ใช้แสงธรรมชาติ สีกลาง ๆ ไม่ติดโทนจัด และเว้นที่ว่างด้านบนไว้เล็กน้อย**

**ผ่านเมื่อ:** มองแวบเดียวรู้ว่าเป็นธุรกิจประเภทไหน · ไม่มีตัวหนังสือแม้แต่ตัวเดียว · ครอปเหลือ 4:3 ตรงกลางแล้ววัตถุหลักยังครบ

**1 · `demo-cafe.webp` (มอสคาเฟ่: กาแฟดี ขนมปังอบเช้า)**
```
Editorial food photograph, 16:10. A small neighborhood café counter in soft morning window light:
a fresh butter croissant on a handmade ceramic plate, a latte with simple latte art, a few rustic
loaves on a wooden board behind, a small pot of moss as decoration. Neutral warm-white palette,
natural shadows, shallow depth of field, main subject centered, calm empty space at the top.
No text, no signs, no menus, no logos, no packaging, no people's faces.
```

**2 · `demo-coach.webp` (เลขง่ายแล็บ: ติวคณิต ม.ต้น ตัวต่อตัว)**
```
Bright friendly study photograph, 16:10. A wooden desk seen from slightly above: an open notebook with
simple hand-drawn geometric shapes (triangles, circles, a bar chart) but no readable numbers or words,
colored pencils, wooden number-free blocks, a child's hand holding a pencil. Soft daylight, neutral
tones with a touch of green, centered, encouraging and calm.
No readable text or numbers, no logos, no faces.
```

**3 · `demo-shop.webp` (ถักใจ: ไหมพรมถักมือ ทีละชิ้น)**
```
Cozy handmade product photograph, 16:10. Hand-knitted items arranged on light linen: a moss-green
scarf loosely folded, a small cream beanie, and a little knitted cat doll, with two balls of yarn
and wooden knitting needles. Soft side light, neutral background, centered, warm handmade feel.
No text, no tags, no labels, no logos, no faces.
```

**4 · `demo-studio.webp` (เฟรมสิบ สตูดิโอ: ถ่ายสินค้าและโปรไฟล์)**
```
Behind-the-scenes photo studio, 16:10. A camera on a tripod in the soft-focus foreground, a large
softbox and a seamless light-grey paper backdrop, one simple unbranded glass bottle on a plinth being
photographed. Clean professional neutral grey-white tones, centered subject.
No text, no brand marks, no logos, no faces.
```

### 5–7) ภาพการ์ดบริการ (`service-*.webp`, 3:2)

การ์ดอยู่บนพื้นสีครีม แต่ตัวภาพใช้โทนมืดแบบห้องแล็บกลางคืนให้ต่อเนื่องกับหน้าแรก **ทั้ง 3 ภาพต้องเป็นชุดเดียวกัน: มุมกล้อง แสง และวัสดุเดียวกัน**

**ผ่านเมื่อ:** วาง 3 ภาพเรียงกันแล้วดูเป็นชุดเดียว · รู้ทันทีว่าเป็นเว็บ / แอป / เกม · ไม่มีตัวหนังสือ

**5 · `service-web.webp`**
```
Premium 3D render, 3:2. A floating translucent green-glass browser window with an abstract website
layout (a header bar, an image block, three cards, a rounded button) glowing mint green, a tiny glass
four-leaf clover as the cursor. Deep forest-green night background (#04100a), soft gold rim light,
subtle caustic reflections on a dark glossy floor. No text, no letters, no logos.
```

**6 · `service-app.webp`**
```
Premium 3D render, 3:2, same lighting and materials as a matching set. A floating translucent
green-glass smartphone showing an abstract app grid and a calendar with one highlighted gold time
slot, small glass tiles orbiting it. Deep forest-green night background (#04100a), soft gold rim
light, dark glossy floor. No text, no numbers, no logos.
```

**7 · `service-game.webp`**
```
Premium 3D render, 3:2, same lighting and materials as a matching set. Three glowing glass playing
cards fanned in mid-air, the middle card showing an abstract golden four-leaf clover emblem, tiny gold
sparks, a small glass miniature two-storey house glowing softly in the background.
Deep forest-green night background (#04100a), mint and gold light. No text, no numbers, no logos.
```

### 8) `hero-loop.webp` (ภาพปก) และวิดีโอ `hero-loop.mp4` (ถ้าทำได้)

อยู่หลังหัวเรื่องหน้าแรก ทับด้วยความทึบ 50% **ต้องมืดและนิ่ง** ตรงกลางต้องว่าง เพราะมีข้อความและเกมวางทับ

**ผ่านเมื่อ:** ย่อเหลือ 400 px แล้วยังเป็นพื้นหลังมืด ๆ ที่มีแสงเขียวทองเบา ๆ ไม่มีวัตถุชัดตรงกลาง

```
Cinematic macro still, 16:9. Deep forest-green darkness (#04100a). Soft caustic light patterns, as if
light passes through a green glass four-leaf clover placed off-frame, ripple across a dark matte
surface. A few tiny warm-gold sparks. Light only in the lower-left and upper-right; the center stays
calm and nearly empty. Low contrast, premium, quiet. No objects in focus, no text, no logos, no people.
```

**วิดีโอ (ทำเฉพาะถ้ามีเครื่องมือทำวิดีโอ เช่น Sora):** ใช้ภาพปกนี้เป็นเฟรมแรก ยาว 8 วินาที เคลื่อนไหวช้ามาก แสงไหลเบา ๆ วนกลับจุดเริ่มได้เนียน ไม่มีเสียง ไฟล์ 1920×1080 H.264 ไม่เกิน 2.5 MB ชื่อ `hero-loop.mp4` ถ้าทำไม่ได้ให้ข้าม เพราะ Claude Code ทำผ่าน Higgsfield ได้

### 9) `og-home-bg.png` (พื้นหลังภาพแชร์ลิงก์)

ภาพที่ขึ้นเวลาแชร์ลิงก์ใน LINE หรือ Facebook **ฝั่งซ้าย 55% ต้องว่างและมืดเรียบ** เพราะจะใส่ข้อความไทยด้วยฟอนต์จริงทีหลัง

**ผ่านเมื่อ:** ฝั่งซ้ายว่างพอวางหัวข้อ 2 บรรทัดใหญ่ ๆ ได้ · โคลเวอร์แก้วสวยชัดฝั่งขวา · ไม่มีตัวหนังสือ

```
Wide banner, exactly 1200x630. Right side: a beautiful green glass four-leaf clover with a short glass
stem, glowing from within, golden light at its center, soft caustics on a dark surface below, tiny gold
sparks, a faint perspective grid floor fading into darkness. Left 55% of the frame: smooth, dark,
empty forest-green space for text. Premium, cinematic. No text, no letters, no logos.
```


---

## P2 · ปกไอเดียระบบ (10 ไฟล์ · 1280×800 · ไม่เกิน 120 KB)

การ์ดในหน้า /showcase/ ซึ่งเป็นหน้ารอง ภาพควรสวยแต่ไม่แย่งความเด่นจากผลงานจริง ใช้แสงธรรมชาติ สีกลาง ๆ ตามโทนของแต่ละธุรกิจสมมติ

**ผ่านเมื่อ:** มองแวบเดียวรู้ว่าเป็นระบบอะไร · ไม่มีตัวหนังสือ โลโก้ หรือหน้าคน · ครอปเหลือ 16:10 ตรงกลางแล้ววัตถุหลักยังครบ

**10 · `showcase/media/shop/cover.webp` — ร้านของแต่งบ้านออนไลน์ (ไม้มุม)**
```
Styled home-decor vignette on a light oak sideboard against a soft sage wall: a matte cream teardrop ceramic vase with dried grass, an amber glass candle, a small snake plant in a terracotta pot, a woven rattan basket. Soft daylight, deep green and oak accents, calm and premium. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**11 · `showcase/media/skincare/cover.webp` — หน้าร้านแบรนด์สกินแคร์ (นวลา)**
```
Minimal skincare still life on travertine stone blocks: a glass dropper bottle, a low cream jar and a sunscreen tube with blank labels, a few water droplets, nude and soft sage palette, gentle long shadow, clean premium light. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**12 · `showcase/media/supplement/cover.webp` — หน้าร้านอาหารเสริม (นวลา เดลี่)**
```
Clean morning wellness flat lay on pale linen: two white supplement bottles with sage caps and blank labels, a few tablets and golden softgels, a glass of water and orange slices. Bright natural light, calm, honest, no medical props. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**13 · `showcase/media/food/cover.webp` — ร้านอาหารพร้อมทาน ส่งแช่เย็น (ข้าวหอมดาว)**
```
Thai home-cooked meals packed for chilled delivery: green curry with jasmine rice and basil pork in reusable meal boxes, a jar of dark red chili paste, set inside an open insulated box with ice packs on a warm wooden table, terracotta and turmeric tones. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**14 · `showcase/media/menu/cover.webp` — เมนู QR สั่งจากโต๊ะ (ข้าวหอมดาว)**
```
Thai restaurant table seen from above: pad thai, creamy tom yum and papaya salad, a small wooden table tent with an abstract square pattern that is not a real scannable code, a smartphone lying face-up showing a blurred colourful menu interface. Warm evening light. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**15 · `showcase/media/erp-restaurant/cover.webp` — ERP ร้านอาหาร**
```
Restaurant back office: a tablet on a stainless kitchen pass showing abstract coloured order tickets and bar charts with no readable text, a chef's hands plating a dish in soft focus behind. Warm kitchen light, no faces. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**16 · `showcase/media/erp-brand/cover.webp` — ERP แบรนด์ขายออนไลน์**
```
Small e-commerce stock room: tidy shelves of blank-labelled skincare boxes and bottles, kraft shipping boxes and packing tape on a table, a laptop showing an abstract dashboard with bar charts and no readable text. Soft daylight. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**17 · `showcase/media/erp-retail/cover.webp` — ERP ร้านค้าปลีก**
```
Home-decor shop counter: a tablet point-of-sale showing an abstract grid of product tiles, a small receipt printer, a gift wrapped in kraft paper and twine, shelves with vases and candles softly blurred behind. Warm afternoon light. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**18 · `showcase/media/line-restaurant/cover.webp` — LINE OA + AI ร้านอาหาร**
```
A hand holding a smartphone that shows an abstract chat with speech bubbles and small food photo cards, no readable text and no app logos, a Thai restaurant table with dishes softly blurred behind. Warm light, no faces. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

**19 · `showcase/media/line-brand/cover.webp` — LINE OA + AI แบรนด์สกินแคร์**
```
A smartphone on a bathroom vanity showing an abstract chat with speech bubbles and small product cards, no readable text and no app logos, blank-labelled skincare bottles around it, soft morning light. 16:10. No text, no letters, no numbers, no logos (including app logos), no real brands, no faces.
```

---

## P3 · ภาพสินค้าในตัวอย่าง (51 ไฟล์ · 800×800 · ไม่เกิน 60 KB · ไม่บังคับ)

ภาพสินค้าของร้านสมมติในระบบตัวอย่าง ตอนนี้ใช้ภาพวาดอัตโนมัติอยู่ ทำเมื่อมีเวลา **ทุกภาพ: สินค้าชิ้นเดียวกลางภาพ พื้นเรียบสีอ่อน แสงนุ่ม มุมกล้องเดียวกันทั้งร้าน ฉลากว่างหรือเป็นลายนามธรรม ไม่มีตัวหนังสือ**

ใช้ prompt นี้ แล้วแทน `<ภาพ>` ด้วยคอลัมน์ "ภาพอะไร":
```
Square product photograph, 1:1. <ภาพ>. Single subject centered on a soft plain light background that
matches the shop's colours, soft studio light, gentle shadow, consistent camera angle across the set.
Blank or abstract labels only. No text, no letters, no numbers, no logos, no real brands, no faces.
```

| # | ไฟล์ | สินค้า | ภาพอะไร |
|---|---|---|---|
| 1 | `showcase/media/shop/vase-clay.webp` | แจกันดินเผาทรงหยดน้ำ | hand-thrown matte ceramic teardrop vase with dried grass, cream glaze |
| 2 | `showcase/media/shop/vase-glass.webp` | แจกันแก้วรีไซเคิล | recycled bottle-green hand-blown glass vase with a single eucalyptus branch |
| 3 | `showcase/media/shop/candle-rain.webp` | เทียนหอม กลิ่นป่าหลังฝน | amber glass candle jar on a wooden side table, soft rain light |
| 4 | `showcase/media/shop/diffuser-tea.webp` | ก้านไม้หอม กลิ่นชาขาว | reed diffuser bottle with rattan sticks on a linen shelf |
| 5 | `showcase/media/shop/towel-set.webp` | ชุดผ้าขนหนูคอตตอน 3 ผืน | stack of folded cotton towels in cream and sage, bathroom shelf |
| 6 | `showcase/media/shop/basket-rattan.webp` | ตะกร้าหวายมีหูจับ | handwoven rattan basket with a folded throw blanket |
| 7 | `showcase/media/shop/mug-stone.webp` | แก้วมัคสโตนแวร์ | stoneware mug with a green rim, steam, morning window light |
| 8 | `showcase/media/shop/tray-teak.webp` | ถาดไม้สักทรงรี | oval teak serving tray with a ceramic cup and fruit |
| 9 | `showcase/media/shop/lamp-linen.webp` | โคมไฟตั้งโต๊ะผ้าลินิน | linen table lamp glowing warm on a bedside table at dusk |
| 10 | `showcase/media/shop/cushion-stripe.webp` | ปลอกหมอนอิงลายทาง | striped woven cotton cushion on a linen sofa |
| 11 | `showcase/media/shop/plant-snake.webp` | ลิ้นมังกรในกระถางดินเผา | snake plant in a terracotta pot beside a window |
| 12 | `showcase/media/shop/plant-pothos.webp` | พลูด่างกระถางแขวน | pothos plant in a hanging macrame planter |
| 13 | `showcase/media/skincare/gel-cleanser.webp` | เจลล้างหน้า อโลเวรา | frosted pump bottle of clear facial gel cleanser with aloe leaf, sage background |
| 14 | `showcase/media/skincare/foam-rice.webp` | โฟมล้างหน้า ข้าวหอมมะลิ | cream squeeze tube of rice foam cleanser with jasmine rice grains |
| 15 | `showcase/media/skincare/serum-niacin.webp` | เซรั่มไนอะซินาไมด์ 5% | amber-tinted glass dropper bottle serum, warm nude backdrop |
| 16 | `showcase/media/skincare/serum-ha.webp` | เซรั่มไฮยาลูรอน | clear glass dropper serum bottle with water droplets, pale blue backdrop |
| 17 | `showcase/media/skincare/toner-cucumber.webp` | โทนเนอร์ น้ำแตงกวา | tall bottle of cucumber toner with sliced cucumber |
| 18 | `showcase/media/skincare/cream-gel.webp` | มอยส์เจอไรเซอร์ เจลครีม | low cream jar with gel cream swatch, nude stone backdrop |
| 19 | `showcase/media/skincare/sun-milk.webp` | กันแดดเนื้อน้ำนม SPF50 PA++++ | sunscreen tube on a sunlit linen towel, warm shadows |
| 20 | `showcase/media/skincare/set-3step.webp` | ชุด 3 ขั้น ล้าง บำรุง ปกป้อง | minimal gift box of three skincare products, nude and sage tones |
| 21 | `showcase/media/supplement/vitc.webp` | วิตามินซี 500 มก. | white supplement bottle with orange cap and a few tablets, citrus slices |
| 22 | `showcase/media/supplement/zinc.webp` | ซิงก์ 15 มก. | small white bottle with slate-blue cap, minimal |
| 23 | `showcase/media/supplement/fiber.webp` | ไฟเบอร์ชงดื่ม กลิ่นส้มยูซุ | fanned stick sachets of yuzu fiber drink with a glass of water |
| 24 | `showcase/media/supplement/collagen.webp` | คอลลาเจนไตรเปปไทด์ ชนิดผง | soft blush box of collagen powder sachets, minimal studio |
| 25 | `showcase/media/supplement/fishoil.webp` | น้ำมันปลา 1,000 มก. | white bottle with golden softgel capsules spilling beside it |
| 26 | `showcase/media/supplement/starter-set.webp` | ชุดเริ่มต้น 30 วัน | sage gift box with supplement bottle and sachets, morning kitchen counter |
| 27 | `showcase/media/food/greencurry-box.webp` | แกงเขียวหวานไก่ + ข้าวหอมมะลิ | Thai green curry chicken with jasmine rice in a two-compartment meal box |
| 28 | `showcase/media/food/kaprao-box.webp` | ข้าวกะเพราหมูสับ | holy basil minced pork with rice in a meal box, fried egg on the side |
| 29 | `showcase/media/food/massaman-box.webp` | มัสมั่นไก่ | massaman chicken curry with potatoes and peanuts in a ceramic bowl |
| 30 | `showcase/media/food/tomyum-pack.webp` | ต้มยำกุ้งน้ำข้น | creamy tom yum goong with prawns and herbs in a bowl |
| 31 | `showcase/media/food/chili-paste.webp` | น้ำพริกนรก สูตรดาว | glass jar of dark red Thai chili paste with a gold lid, dried chilies |
| 32 | `showcase/media/food/curry-paste.webp` | พริกแกงเขียวหวานสด | fresh green curry paste in a jar with lemongrass and kaffir lime leaves |
| 33 | `showcase/media/food/satay-pack.webp` | หมูสะเต๊ะ พร้อมน้ำจิ้ม | grilled pork satay skewers with peanut sauce and cucumber relish |
| 34 | `showcase/media/food/mango-rice.webp` | ข้าวเหนียวมะม่วง | mango sticky rice with coconut cream on a white plate |
| 35 | `showcase/media/food/gift-set.webp` | ชุดของฝาก น้ำพริก 3 รส | kraft gift box with three chili paste jars and a handwritten card |
| 36 | `showcase/media/menu/kaprao.webp` | ข้าวกะเพราหมูสับ | Thai basil minced pork on jasmine rice with a crispy fried egg, overhead |
| 37 | `showcase/media/menu/greencurry.webp` | แกงเขียวหวานไก่ + ข้าว | green curry chicken in a ceramic bowl with Thai eggplant and basil |
| 38 | `showcase/media/menu/massaman.webp` | มัสมั่นไก่ + ข้าว | massaman chicken curry with potatoes in a clay bowl |
| 39 | `showcase/media/menu/tomyum.webp` | ต้มยำกุ้งน้ำข้น | creamy tom yum goong with prawns, lemongrass and chili in a bowl |
| 40 | `showcase/media/menu/vegstir.webp` | ผัดผักรวมเต้าหู้ + ข้าว (เจ) | stir-fried mixed vegetables and tofu on rice, bright greens |
| 41 | `showcase/media/menu/padthai.webp` | ผัดไทยกุ้งสด | pad thai with prawns, lime wedge and crushed peanuts on a plate |
| 42 | `showcase/media/menu/boat.webp` | ก๋วยเตี๋ยวเรือหมู | Thai boat noodle soup with pork and morning glory, dark broth |
| 43 | `showcase/media/menu/padseeew.webp` | ผัดซีอิ๊วหมู | pad see ew wide rice noodles with Chinese kale on a plate |
| 44 | `showcase/media/menu/satay.webp` | หมูสะเต๊ะ 10 ไม้ | pork satay skewers with peanut sauce on a banana leaf |
| 45 | `showcase/media/menu/springroll.webp` | ปอเปี๊ยะทอด (มังสวิรัติ) | crispy vegetarian spring rolls with plum dipping sauce |
| 46 | `showcase/media/menu/somtam.webp` | ส้มตำไทย | Thai green papaya salad with tomatoes, peanuts and long beans |
| 47 | `showcase/media/menu/thaitea.webp` | ชาไทยเย็น | Thai iced tea in a tall glass with ice and condensation |
| 48 | `showcase/media/menu/lemongrass.webp` | น้ำตะไคร้ใบเตย | pale green lemongrass pandan drink in a glass with a pandan knot |
| 49 | `showcase/media/menu/coconut.webp` | มะพร้าวน้ำหอม | chilled young coconut with a straw on a wooden table |
| 50 | `showcase/media/menu/mango.webp` | ข้าวเหนียวมะม่วง | mango sticky rice with coconut cream, mung beans on top |
| 51 | `showcase/media/menu/bualoy.webp` | บัวลอยไข่หวาน | bua loy colorful rice dumplings in warm coconut milk with a sweet egg |

ถ้ารายการสินค้าเปลี่ยน ตารางล่าสุดอยู่ใน `showcase/MEDIA-BRIEFS.md` (สร้างอัตโนมัติ และบอกว่าช่องไหนมีภาพแล้ว)

---

## ส่งออก (ทำหลังเลือกแบบที่ดีที่สุดแล้ว)

ถ้าคุณรัน Python ได้ ให้ใช้โค้ดนี้ครอปให้ได้สัดส่วนตรง ย่อ และบีบ WebP ให้ไม่เกินขนาดที่กำหนด

```python
from PIL import Image
import io

def export(src, dst, w, h, max_kb):
    im = Image.open(src).convert('RGB')
    # crop to the exact ratio from the center, then resize
    r = w / h
    W, H = im.size
    if W / H > r:
        nw = int(H * r); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else:
        nh = int(W / r); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    im = im.resize((w, h), Image.LANCZOS)
    if dst.endswith('.png'):
        im.save(dst, 'PNG', optimize=True); return
    for q in range(86, 40, -4):
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
        if buf.tell() <= max_kb * 1024:
            open(dst, 'wb').write(buf.getvalue()); print(dst, q, buf.tell() // 1024, 'KB'); return
    raise SystemExit(f'{dst}: cannot reach {max_kb} KB, simplify the image')

# export('cafe.png', 'demo-cafe.webp', 1200, 750, 140)
# export('web.png', 'service-web.webp', 960, 640, 100)
# export('hero.png', 'hero-loop.webp', 1920, 1080, 120)
# export('og.png', 'og-home-bg.png', 1200, 630, 1024)
# export('cover-menu.png', 'cover.webp', 1280, 800, 120)      # P2
# export('kaprao.png', 'kaprao.webp', 800, 800, 60)          # P3
```

## ส่งมอบ (เลือก 1 ทาง)

**ทาง A: ถ้าคุณเข้าถึง repo `TeemClover/Teem` ได้ (เช่น Codex)**
1. ทำงานบน branch `claude/ecstatic-sagan-n10dp0` (หรือ branch ที่เจ้าของบอก)
2. วางไฟล์ตามที่อยู่ในตาราง: P1 ที่ `entry/media/` (ยกเว้น `og-home-bg.png` ไว้ที่ `entry/media/source/`) · P2 ที่ `showcase/media/<ชื่อระบบ>/cover.webp` · P3 ที่ `showcase/media/<ร้าน>/<สินค้า>.webp`
3. รัน `npm ci` แล้วรัน `npm run sync:frontdoor-root` และ `node tools/build-portfolio.mjs` (หน้าเว็บจะเปลี่ยนจากภาพแทนเป็นไฟล์จริงเอง ห้ามแก้ไฟล์ HTML ที่สร้างอัตโนมัติด้วยมือ)
4. รัน `npm run test:entry` แล้ว `npx playwright install chromium && npm run test:entry:ui && npm run test:showcase:ui` ต้องผ่านทั้งหมด
5. commit ด้วยข้อความ `Media: <ชื่อไฟล์ที่เพิ่ม>` แล้ว push

**ทาง B: ถ้าคุณทำได้แค่ในแชต**
ส่งไฟล์ทั้งหมดเป็น zip ไฟล์เดียวชื่อ `myclover-media.zip` ข้างในจัดโฟลเดอร์ตามที่อยู่ในตาราง (เช่น `entry/media/demo-cafe.webp`, `showcase/media/menu/cover.webp`) แล้วบอกเจ้าของว่า **"ส่ง zip นี้ให้ Claude Code วางเข้าเว็บ"** Claude Code จะวางไฟล์ รันคำสั่ง ใส่ข้อความไทยลงภาพ OG และตรวจหน้าเว็บให้

## รายงานกลับ (พิมพ์ตอนจบ)
- ไฟล์ที่ทำเสร็จ: ที่อยู่ไฟล์ · ขนาดพิกเซล · ขนาดไฟล์ KB
- ไฟล์ที่ข้าม และเหตุผล
- แบบที่เลือกของแต่ละช่องในกลุ่ม P1 และ P2 และเหตุผล 1 บรรทัด
- ตรวจกติกา 7 ข้อแล้วหรือยัง
