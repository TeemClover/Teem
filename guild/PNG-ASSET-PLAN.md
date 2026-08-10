# Guild X — PNG Layer Asset Plan

เป้าหมาย: เปลี่ยน `/guild` จาก hero ที่พึ่ง SVG ชิ้นเดียว ให้เป็นหน้าแบบ Apple-style scroll storytelling ที่ใช้ PNG โปร่งใสหลายชั้นซ้อนกัน แต่ละ layer มี parallax / scale / rotate / glow คนละจังหวะ ยิ่งเลื่อนลงยิ่งรู้สึกว่า “4 Paths → X → Hero → Key → Dungeon” กำลังเกิดขึ้นจริง

## หลักภาพรวม

- ใช้ PNG โปร่งใสเป็น foreground/decorative layers; ห้ามทำภาพหน้าเว็บทั้งจอเป็นภาพเดียว
- ให้ HTML text/CTA เป็นของจริงทั้งหมด เพื่อ responsive และอ่านง่าย
- motion หลักผูกกับ scroll progress ไม่ใช่ animation loop อย่างเดียว
- มือถือให้ลดจำนวน layer 25–40% เพื่อไม่รกและไม่กิน GPU
- โทน: black / emerald / antique gold + 4 path colors
- หลีกเลี่ยง fantasy TCG หนักเกินไป; ต้องยังรู้สึกว่าเป็น myClover + community + build together

## Folder ที่แนะนำ

`/guild/assets/png/`

## P0 — Hero Assembly (ต้องมี)

### `clover-red.png`
- Transparent PNG, 768×768
- ใบ Red เดี่ยวจากโลโก้จริง
- วางซ้ายบนของ core
- Scroll: translate(-70px,-35px) → center, rotate(-8deg → 0)
- หลังรวมเสร็จ pulse เบาๆ 1 ครั้ง

### `clover-green.png`
- Transparent PNG, 768×768
- ใบ Green เดี่ยว
- วางขวาบน
- Scroll: translate(70px,-35px) → center, rotate(8deg → 0)

### `clover-blue.png`
- Transparent PNG, 768×768
- ใบ Blue เดี่ยว
- วางซ้ายล่าง
- Scroll: translate(-70px,45px) → center, rotate(7deg → 0)

### `clover-silver.png`
- Transparent PNG, 768×768
- ใบ Silver เดี่ยว
- วางขวาล่าง
- Scroll: translate(70px,45px) → center, rotate(-7deg → 0)

### `gold-x.png`
- Transparent PNG, 1024×1024
- X ทองแยกชิ้น ไม่ติด Clover
- เริ่ม opacity 0.2 / scale .72
- หลัง 4 ใบ converge ให้ scale → 1.04 แล้ว settle 1.0
- ใช้ drop-shadow + CSS brightness แทน export glow หนักๆ

### `gold-orb.png`
- Transparent PNG, 512×512
- จุดศูนย์กลางสำหรับ “พลังรวม”
- เริ่มเล็กมากที่ 0.35 → 1.0
- ใช้เป็นจุด origin ของ energy trails ทุกสี

### `ring-gold.png`
- Transparent PNG, 1200×1200
- วงทองชั้นนอก
- slow rotate 0.15–0.25deg/sec
- Scroll: scale .86 → 1.03

### `ring-green.png`
- Transparent PNG, 1200×1200
- วง energy สีเขียวชั้นใน
- หมุนสวนกับ ring-gold
- opacity 0.25 → 0.72 ตาม scroll

## P1 — Multiply Section

### `particles-1.png`
- 1600×900 transparent
- ฝุ่นทอง + เขียว
- ใช้เป็น background parallax layer
- translateY แค่ 20–35px ตลอด section

### `particles-2.png`
- 1600×900 transparent
- ฝุ่น Red / Blue / Silver แบบบาง
- ใช้ section “4 Paths → X”
- translateX คนละทิศกับ particles-1 เพื่อสร้าง depth

### Asset ที่ควรเจนเพิ่ม

#### `energy-red.png`, `energy-green.png`, `energy-blue.png`, `energy-silver.png`
- 1600×500 transparent
- แถบพลังบางยาว มีปลายหายเป็น particle
- ไม่มีข้อความ ไม่มี icon
- วาง 4 ทิศแล้ว animate เข้าหา orb
- Blend mode: screen / lighten

#### `x-build-01.png` → `x-build-04.png`
- 1024×1024 transparent
- 4 ระยะของ X: spark → outline → metal → full glow
- ใช้ scroll-scrub เปลี่ยน frame แทนวิดีโอ

## P1 — Identity Section

### Asset ที่ควรเจนเพิ่ม

#### `avatar-shadow-01.png` … `avatar-shadow-08.png`
- 512×512 transparent
- avatar แบบ anonymous: hood, fox, robot, cat, silhouette, abstract mask
- ห้ามมีหน้าคนจริง
- ใช้ floating orbit รอบ clover center
- opacity 0.45–0.9; parallax ไม่เท่ากัน

#### `identity-core.png`
- 800×800 transparent
- Clover outline เขียวเรืองแสงบางๆ
- ใช้เป็นศูนย์กลาง identity network

#### `username-tag-*.png` ไม่ต้องทำ
- ชื่อสมมุติควรเป็น HTML text จริง เพื่อคมและ responsive

## P1 — Hero Upgrade / Reward

### `card-red.png`, `card-green.png`, `card-blue.png`, `card-silver.png`
- 700×1100 transparent
- ใช้เป็น floating cards รอบ hero และใน transition
- Desktop: hover tilt
- Mobile: drift เบาๆ ไม่เกิน 8px

### `dungeon-key.png`
- 900×1200 transparent
- กุญแจทอง
- Section upgrade: เริ่ม grayscale/opacity .35 → gold full power ตอน step 5
- Final CTA: rotate(-8deg → 0) + shimmer

### `treasure-chest.png`
- 1200×900 transparent
- หีบสมบัติทอง
- ใช้ท้ายหน้า / Dungeon CTA
- เปิด section แล้ว scale .92 → 1.0 + light spill

### Asset ที่ควรเจนเพิ่ม

#### `hero-card-front.png`
- 900×1300 transparent
- การ์ดขอบทองสถานะ HERO
- ต้องไม่มีชื่อผู้ใช้ฝังในภาพ
- พื้นที่ชื่อ/ข้อมูลให้ HTML overlay

#### `hero-card-glow.png`
- 1200×1600 transparent
- glow/aura รอบการ์ดอย่างเดียว
- แยก layer เพื่อ animate intensity ได้

#### `chest-light.png`
- 1600×900 transparent
- ลำแสงทองจากหีบ ไม่มีตัวหีบ
- ใช้ overlay ตอนท้ายหน้า

## P2 — Decorative Bling

ควรเจนเพิ่มเป็น PNG transparent:

- `gold-star-01.png`, `gold-star-02.png` — star flare ขนาด 256/512
- `crystal-red.png`, `crystal-green.png`, `crystal-blue.png`, `crystal-silver.png` — crystal shards 512×512
- `leaf-dust.png` — ใบ Clover เล็กหลายใบ 1600×900
- `coin-splash.png` — เหรียญทอง 1600×900 ใช้เฉพาะ Dungeon reward
- `magic-circle.png` — วงเวท tech/fantasy บางๆ 1600×1600
- `light-beam-gold.png` — light streak แนวเฉียง 1600×900

## Scroll Storyboard

### 0–18% — Arrival
- rings อยู่ก่อน
- 4 petals แยกจากกัน
- X จางมาก
- scroll แรกทำให้ petals เริ่มเข้าศูนย์กลาง

### 18–34% — Identity
- Hero logo เล็กลง/ถอยไปเป็น background motif
- avatars ลอยเข้ามาทีละตัว
- username tags เป็น HTML
- ไม่มีการบังคับ identity จริง

### 34–58% — Multiply
- 4 energy PNG วิ่งเข้าหาศูนย์กลาง
- orb สว่าง
- x-build เปลี่ยน frame 1 → 4
- particles เพิ่ม intensity

### 58–78% — Hero Upgrade
- cards ลอยผ่านหน้าแบบ depth layers
- Hero Card ขึ้นกลาง
- Gold X flash 1 ครั้ง

### 78–100% — Key / Dungeon
- key เข้ามาจากขวาแบบ parallax
- chest ขึ้นจากด้านล่าง
- chest-light เปิดตาม scroll
- final CTA อยู่เหนือภาพทั้งหมด

## Mobile Rules

- ล็อก `overflow-x: clip` และ `touch-action: pan-y`
- Hero ใช้ petals + X + ring แค่ 1 วง + particles 1 ชุด
- ปิด parallax ที่กิน GPU บางตัวเมื่อ `prefers-reduced-motion`
- จำกัด transform ของ image layer ให้อยู่ใน wrapper 100vw
- ใช้ `contain: paint` กับ scene wrappers
- รูปใหญ่สุดไม่เกิน 900–1200px source บน mobile runtime

## Animation Implementation Notes

- ใช้ `requestAnimationFrame` + CSS custom properties เช่น `--scene-progress`
- อย่า bind style หนักๆ ตรง event `scroll` ทุก element
- ใช้ 1 scroll controller ต่อ scene แล้วคำนวณ transforms
- ใช้ `transform` + `opacity` เป็นหลัก; หลีกเลี่ยง animate `filter: blur()` ต่อ frame
- PNG glow ให้ทำ pre-render บางส่วน แล้วปรับ opacity แทน
- Desktop สามารถใช้ pointer tilt เฉพาะ card/key; mobile ปิด

## Current Starter Pack

ไฟล์ที่เตรียมไว้แล้วใน pack นี้:

- clover-red.png
- clover-green.png
- clover-blue.png
- clover-silver.png
- gold-x.png
- gold-orb.png
- ring-gold.png
- ring-green.png
- particles-1.png
- particles-2.png
- card-red.png
- card-green.png
- card-blue.png
- card-silver.png
- dungeon-key.png
- treasure-chest.png
