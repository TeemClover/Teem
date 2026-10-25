# บรีฟภาพและวิดีโอ · หน้าแรก myClover (ให้ GPT ทำ)

> **อัปเดต 2026-10-25:** หน้าแรก v4 ไม่ใช้ช่อง `hero-loop.mp4` `demo-*.webp` และ `service-*.webp` แล้ว ภาพและคลิปของหน้าแรกอยู่ที่ `entry/media/v4/` (ทำด้วย Higgsfield ผ่านงาน media ใน `.github/workflows/homepage-portfolio.yml`) ช่องที่ยังใช้: `og-home.jpg` และ `door.webp`

> อัปเดต 2026-10-24 · ใช้กับหน้าแรก `entry/home.html` และหน้า `/hire/`
> ตอนนี้ทุกช่องมี **placeholder ที่วาดด้วย CSS** (หน้าเว็บสวยครบแล้วแม้ยังไม่มีไฟล์) ไฟล์จริงจะเข้าไปแทนเองเมื่อวางชื่อไฟล์ถูก
> **คำสั่งพร้อมวางให้ ChatGPT:** `entry/GPT-IMAGE-UPGRADE.md` (ภาพทั้งเว็บในไฟล์เดียว: หน้าแรก 9 ช่อง ปกไอเดียระบบ และภาพสินค้าในตัวอย่าง พร้อม prompt โค้ดส่งออก และวิธีส่งมอบ)

## วิธีใส่ไฟล์ (3 ขั้น)

1. สร้างภาพหรือวิดีโอตามบรีฟ แล้วตั้งชื่อไฟล์ **ตามช่อง "ชื่อไฟล์" ตรงตัว**
2. วางไฟล์ไว้ที่ `entry/media/`
3. รัน `npm run sync:frontdoor-root` แล้ว commit (`index.html` จะเปลี่ยนจาก placeholder เป็นไฟล์จริงเอง)

ไม่ต้องแก้ HTML หรือ CSS เอง · ถ้ายังไม่มีไฟล์ หน้าเว็บใช้ placeholder ต่อได้ไม่พัง

## กติการ่วมทุกภาพ (ห้ามข้าม)

- **ไม่มีตัวหนังสือในภาพ** (ยกเว้น OG ซึ่งจะใส่ข้อความทีหลังด้วยโค้ด เพราะ AI วาดภาษาไทยผิดบ่อย)
- **ไม่มีโลโก้หรือแบรนด์จริง** ร้านในเดโมเป็นแบรนด์สมมติ ห้ามเลียนแบบร้านจริง
- **ไม่มีหน้าคนจริงที่จำได้** ถ้ามีคนในภาพ ให้เห็นแค่มือหรือด้านหลัง
- โทนแบรนด์: เขียวป่ากลางคืน `#04100a`, เขียวโคลเวอร์ `#34d27a`, มิ้นต์ `#93ffc4`, ทอง `#f4c75a`, ครีม `#f7f2e6`
- ส่งออกเป็น **WebP** (ภาพ) หรือ **MP4 H.264** (วิดีโอ) ตามขนาดในตาราง และไม่เกินขนาดไฟล์ที่กำหนด

## ตารางช่อง

| ช่อง | ชื่อไฟล์ | ขนาด | ไฟล์ไม่เกิน | อยู่ตรงไหน |
|---|---|---|---|---|
| วิดีโอพื้นหลังหน้าแรก | `hero-loop.mp4` + ภาพปก `hero-loop.webp` | 1920×1080 · 6–8 วิ · วนต่อเนื่อง · ไม่มีเสียง | 2.5 MB (MP4) · 120 KB (ปก) | หลังหัวเรื่องและโคลเวอร์ (ทับด้วยความทึบ 50%) |
| เดโมคาเฟ่ | `demo-cafe.webp` | 1200×750 (16:10) | 140 KB | ภาพหัวเว็บในมือถือจำลอง เมื่อเลือก "คาเฟ่" |
| เดโมครู/โค้ช | `demo-coach.webp` | 1200×750 | 140 KB | เมื่อเลือก "ครู/โค้ช" |
| เดโมร้านออนไลน์ | `demo-shop.webp` | 1200×750 | 140 KB | เมื่อเลือก "ร้านออนไลน์" |
| เดโมสตูดิโอ | `demo-studio.webp` | 1200×750 | 140 KB | เมื่อเลือก "สตูดิโอ/ฟรีแลนซ์" |
| บริการ: เว็บไซต์ | `service-web.webp` | 960×640 (3:2) | 100 KB | การ์ดบริการหน้าแรก |
| บริการ: แอปและระบบ | `service-app.webp` | 960×640 | 100 KB | การ์ดบริการหน้าแรก |
| บริการ: เกมและ 3D | `service-game.webp` | 960×640 | 100 KB | การ์ดบริการหน้าแรก |
| ภาพแชร์ลิงก์ (OG) | `og-home.jpg` | 1200×630 | 300 KB | เวลาแชร์ลิงก์หน้าแรกใน LINE/Facebook |

ช่องที่ **ไม่ต้องทำ** (ใช้ของจริงแล้ว): ภาพประตูบ้าน `door.webp` (เรนเดอร์จากบ้าน 3D จริง), รูป Teem (`teem-portrait.webp` จากรูปจริง), ภาพผลงานใน `/work/` (ภาพหน้าจอจริง)

---

## 1) `hero-loop.mp4` · วิดีโอพื้นหลังหน้าแรก

**จุดประสงค์:** บรรยากาศ "ห้องแล็บตอนกลางคืน" ที่มีแสงลอดโคลเวอร์แก้ว ให้หน้าแรกดูมีชีวิต แต่ไม่แย่งความสนใจจากหัวเรื่องและเกม
**ข้อบังคับ:** มืด คอนทราสต์ต่ำ เคลื่อนไหวช้ามาก วนกลับจุดเริ่มได้เนียน (ไม่มีรอยต่อ) ไม่มีวัตถุชัดตรงกลาง (ตรงกลางมีข้อความทับ)

```
Cinematic macro loop, 16:9, 8 seconds, seamless loop. Deep forest-green night background (#04100a).
Soft caustic light patterns, as if light passes through a green glass four-leaf clover placed off-frame,
slowly ripple across a dark matte surface. A few tiny warm-gold sparks drift upward and fade.
Very slow, calm motion, shallow depth of field, gentle bokeh. Low contrast, mostly dark, light only
in the lower-left and upper-right areas; keep the center calm and empty for text.
No objects in focus, no text, no logos, no people. Photoreal, premium, quiet.
```
**ภาพปก `hero-loop.webp`:** เฟรมแรกของคลิปเดียวกัน
**ทำด้วย Higgsfield ได้:** ใช้ Kling หรือ Seedance แบบ text-to-video แล้วตัดเป็น loop 8 วิ (Code ช่วยตัด/บีบไฟล์ได้)

## 2) ภาพเดโม 4 ร้าน (`demo-*.webp`)

**จุดประสงค์:** ภาพหัวเว็บของร้านสมมติในมือถือจำลอง ภาพเดียวต้องเข้ากับทั้ง 4 สไตล์ (อบอุ่น · หรู · สนุก · มินิมอล) เพราะสีพื้นและตัวอักษรเปลี่ยนตามสไตล์ที่ผู้เล่นเลือก
**ข้อบังคับ:** แสงกลาง ๆ ไม่ติดโทนสีจัด, วัตถุหลักอยู่กลางภาพ (ขอบถูกครอปบนมือถือ), ไม่มีตัวหนังสือ/ป้าย/โลโก้

- `demo-cafe.webp` — ร้าน "มอสคาเฟ่" (สมมติ) กาแฟและขนมปังอบเช้า
```
Editorial food photo, 16:10. A small neighborhood café counter in soft morning light: a fresh butter
croissant on a ceramic plate, a latte with simple latte art, a few loaves of bread behind, a small
potted moss plant. Natural light, neutral warm-white tones, clean composition, main subject centered,
generous empty space at the top. No text, no signs, no logos, no people's faces.
```
- `demo-coach.webp` — "เลขง่ายแล็บ" (สมมติ) ติวคณิต ม.ต้น ตัวต่อตัว
```
Bright, friendly study scene, 16:10. A wooden desk with an open notebook showing simple hand-drawn
geometry shapes and number blocks, colored pencils, a small whiteboard in the background with abstract
doodles (no readable words), a child's hand holding a pencil. Soft daylight, neutral tones, centered,
calm and encouraging. No readable text, no logos, no faces.
```
- `demo-shop.webp` — "ถักใจ" (สมมติ) ไหมพรมถักมือ
```
Cozy product photo, 16:10. Hand-knitted items arranged on a light linen surface: a moss-green scarf,
a small beanie, and a little knitted cat doll, balls of yarn and knitting needles. Soft side light,
neutral background, centered, handmade feel. No text, no tags, no logos, no people's faces.
```
- `demo-studio.webp` — "เฟรมสิบ สตูดิโอ" (สมมติ) สตูดิโอถ่ายภาพ
```
Behind-the-scenes photo studio, 16:10. A camera on a tripod in the foreground (slightly out of focus),
a softbox light and a seamless paper backdrop with a single product (a glass bottle) being photographed.
Clean, professional, neutral grey-white tones, centered subject. No text, no brand marks, no faces.
```

## 3) ภาพบริการ 3 แบบ (`service-*.webp`)

**จุดประสงค์:** การ์ดบริการบนพื้นครีม ภาพเองโทนมืดแบบห้องแล็บกลางคืนให้ต่อกับหน้าแรก
**สไตล์ร่วม:** 3D render แบบแก้วเรืองแสงบนพื้นเขียวป่ากลางคืน (#04100a) แสงมิ้นต์และทอง, วัตถุลอยกลางภาพ, ขอบภาพมืด, ไม่มีตัวหนังสือ

- `service-web.webp`
```
3D render, 3:2. A floating translucent glass browser window with a simple abstract website layout
(blocks, an image area, a pill button) glowing mint-green, a small glass four-leaf clover as a cursor.
Deep forest-green night background, soft gold rim light, subtle reflections. No text, no logos.
```
- `service-app.webp`
```
3D render, 3:2. A floating translucent glass smartphone showing an abstract app grid and a calendar
with one highlighted gold time slot, mint-green glow, small glass tiles orbiting around it.
Deep forest-green night background, soft gold rim light. No text, no logos.
```
- `service-game.webp`
```
3D render, 3:2. Three glowing glass playing cards fanned out in mid-air, the middle card showing an
abstract four-leaf clover emblem in gold, tiny sparks, a hint of a miniature 3D house in the background.
Deep forest-green night background, mint and gold light. No text, no logos.
```

## 4) `og-home.jpg` · ภาพแชร์ลิงก์

**ทำ 2 ขั้น:** (1) GPT ทำพื้นหลัง `entry/media/source/og-home-bg.png` โดย **เว้นพื้นที่ซ้ายว่างไว้ 55%** (2) Claude Code ใส่ข้อความไทยด้วยฟอนต์จริงแล้วบันทึกเป็น `entry/media/og-home.jpg` (AI วาดตัวอักษรไทยเพี้ยนบ่อย)
```
Wide banner, 1200x630. Right side: a green glass four-leaf clover glowing on a deep forest-green night
background, gentle caustic light, tiny gold sparks, a faint perspective grid floor. Left 55% of the
image: smooth dark empty space for text. Premium, cinematic. No text, no logos.
```
ข้อความที่จะใส่: "Teem Clover สร้างเว็บ แอป เกม ด้วย AI" · "ปรุงเว็บใน 3 แตะ" · "myclover.com"

---

## ตรวจก่อน commit

- [ ] ชื่อไฟล์ตรงตาราง และอยู่ใน `entry/media/`
- [ ] ขนาดพิกเซลและขนาดไฟล์ไม่เกินที่กำหนด
- [ ] ไม่มีตัวหนังสือ โลโก้ หรือหน้าคนจริงในภาพ (ยกเว้น OG หลังใส่ข้อความ)
- [ ] รัน `npm run sync:frontdoor-root` แล้วเปิดหน้าแรกดูทั้งมือถือและคอม
- [ ] รัน `npm run test:entry` ผ่าน
