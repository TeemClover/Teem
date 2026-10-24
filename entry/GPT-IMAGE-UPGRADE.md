# คำสั่งสำหรับ GPT: อัปเกรดภาพหน้าแรก myClover

> วิธีใช้: คัดลอก **ทั้งไฟล์นี้** ไปวางใน ChatGPT แล้วพิมพ์ต่อท้ายว่า "เริ่มจากข้อ 1"
> เขียนเมื่อ 2026-10-24 สำหรับ PR #289 (branch `claude/ecstatic-sagan-n10dp0`) · รายละเอียดช่องภาพทั้งหมดอยู่ใน `entry/MEDIA-BRIEFS.md`

---

## ถึง GPT

คุณคือผู้กำกับภาพของ myClover งานของคุณคือสร้างภาพ 9 ไฟล์ให้หน้าแรกเว็บ myclover.com ตอนนี้ทุกช่องใช้ภาพแทนที่วาดด้วย CSS อยู่ ภาพของคุณจะเข้าไปแทนเองเมื่อชื่อไฟล์ถูกต้อง

**เว็บนี้คืออะไร:** หน้าแรกของ Teem Clover ซึ่งรับทำเว็บ แอป และเกมด้วย AI หน้าแรกเป็นเกมสั้น ๆ: ผู้เล่นแตะใบโคลเวอร์แก้ว 3 ใบเพื่อเลือกประเภทธุรกิจ สิ่งที่อยากได้ และสไตล์ แล้วเว็บตัวอย่างจะประกอบขึ้นในจอมือถือจำลอง ฉากหลังเป็น "ห้องแล็บกลางคืน" สีเขียวป่าเข้ม มีแสงลอดผ่านแก้วสีเขียวและประกายทอง

**โทนแบรนด์ (ใช้ทุกภาพ):**
- เขียวป่ากลางคืน `#04100a` · เขียวโคลเวอร์ `#34d27a` · มิ้นต์ `#93ffc4` · ทอง `#f4c75a` · ครีม `#f7f2e6`
- วัสดุหลัก: แก้วใสสีเขียว แสงลอด (caustics) ประกายทองเล็ก ๆ
- อารมณ์: พรีเมียม เงียบ ลึก มีเทคโนโลยีแต่ไม่เย็นชา

### กติกาที่ห้ามพลาด (ภาพไหนผิดข้อใด ให้ทำใหม่)
1. **ไม่มีตัวหนังสือ ตัวเลข ป้าย หรือโลโก้ในภาพ** ไม่ว่าภาษาใด (AI วาดภาษาไทยผิดบ่อย ข้อความทั้งหมดอยู่ในโค้ดของเว็บ)
2. **ไม่มีแบรนด์จริง** ร้านในเดโมเป็นแบรนด์สมมติ (มอสคาเฟ่ · เลขง่ายแล็บ · ถักใจ · เฟรมสิบ สตูดิโอ) ห้ามมีอะไรที่คล้ายร้านหรือสินค้าจริง
3. **ไม่มีหน้าคนที่จำได้** ถ้ามีคน ให้เห็นแค่มือ ด้านหลัง หรือหลุดโฟกัส
4. **วัตถุหลักอยู่กลางภาพ** เพราะมือถือจะครอปขอบซ้ายขวา
5. **ทำขนาดและชื่อไฟล์ตามตารางตรงตัว** และไฟล์ต้องไม่เกินขนาดที่กำหนด

### ลำดับงาน
ทำทีละช่องตามตาราง ทุกช่องให้ทำ **3 แบบ** แล้วเลือกแบบที่ดีที่สุดตามเกณฑ์ "ผ่านเมื่อ" ของช่องนั้น บอกเหตุผลที่เลือกสั้น ๆ แล้วค่อยส่งออกไฟล์ตามขั้น "ส่งออก" ด้านล่าง

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
| 9 | `og-home-bg.png` | 1200×630 | 1 MB | พื้นหลังภาพแชร์ลิงก์ (Code จะใส่ข้อความไทยเอง) |

---

## 1–4) ภาพหัวเว็บของร้านสมมติ (`demo-*.webp`, 16:10)

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

## 5–7) ภาพการ์ดบริการ (`service-*.webp`, 3:2)

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

## 8) `hero-loop.webp` (ภาพปก) และวิดีโอ `hero-loop.mp4` (ถ้าทำได้)

อยู่หลังหัวเรื่องหน้าแรก ทับด้วยความทึบ 50% **ต้องมืดและนิ่ง** ตรงกลางต้องว่าง เพราะมีข้อความและเกมวางทับ

**ผ่านเมื่อ:** ย่อเหลือ 400 px แล้วยังเป็นพื้นหลังมืด ๆ ที่มีแสงเขียวทองเบา ๆ ไม่มีวัตถุชัดตรงกลาง

```
Cinematic macro still, 16:9. Deep forest-green darkness (#04100a). Soft caustic light patterns, as if
light passes through a green glass four-leaf clover placed off-frame, ripple across a dark matte
surface. A few tiny warm-gold sparks. Light only in the lower-left and upper-right; the center stays
calm and nearly empty. Low contrast, premium, quiet. No objects in focus, no text, no logos, no people.
```

**วิดีโอ (ทำเฉพาะถ้ามีเครื่องมือทำวิดีโอ เช่น Sora):** ใช้ภาพปกนี้เป็นเฟรมแรก ยาว 8 วินาที เคลื่อนไหวช้ามาก แสงไหลเบา ๆ วนกลับจุดเริ่มได้เนียน ไม่มีเสียง ไฟล์ 1920×1080 H.264 ไม่เกิน 2.5 MB ชื่อ `hero-loop.mp4` ถ้าทำไม่ได้ให้ข้าม เพราะ Claude Code ทำผ่าน Higgsfield ได้

## 9) `og-home-bg.png` (พื้นหลังภาพแชร์ลิงก์)

ภาพที่ขึ้นเวลาแชร์ลิงก์ใน LINE หรือ Facebook **ฝั่งซ้าย 55% ต้องว่างและมืดเรียบ** เพราะจะใส่ข้อความไทยด้วยฟอนต์จริงทีหลัง

**ผ่านเมื่อ:** ฝั่งซ้ายว่างพอวางหัวข้อ 2 บรรทัดใหญ่ ๆ ได้ · โคลเวอร์แก้วสวยชัดฝั่งขวา · ไม่มีตัวหนังสือ

```
Wide banner, exactly 1200x630. Right side: a beautiful green glass four-leaf clover with a short glass
stem, glowing from within, golden light at its center, soft caustics on a dark surface below, tiny gold
sparks, a faint perspective grid floor fading into darkness. Left 55% of the frame: smooth, dark,
empty forest-green space for text. Premium, cinematic. No text, no letters, no logos.
```

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
```

## ส่งมอบ (เลือก 1 ทาง)

**ทาง A: ถ้าคุณเข้าถึง repo `TeemClover/Teem` ได้ (เช่น Codex)**
1. ทำงานบน branch `claude/ecstatic-sagan-n10dp0` (หรือ branch ที่เจ้าของบอก)
2. วางไฟล์ 1–8 ไว้ที่ `entry/media/` ส่วน `og-home-bg.png` วางไว้ที่ `entry/media/source/` (ยังไม่ใช่ภาพที่ใช้จริง)
3. รัน `npm ci` แล้วรัน `npm run sync:frontdoor-root` (หน้า `/` จะเปลี่ยนจากภาพแทนเป็นไฟล์จริงเอง ห้ามแก้ `index.html` ด้วยมือ)
4. รัน `npm run test:entry` และ `npx playwright install chromium && npm run test:entry:ui` ต้องผ่านทั้งหมด
5. commit ด้วยข้อความ `Homepage media: <ชื่อไฟล์ที่เพิ่ม>` แล้ว push

**ทาง B: ถ้าคุณทำได้แค่ในแชต**
ส่งไฟล์ทั้งหมดเป็น zip ไฟล์เดียวชื่อ `myclover-media.zip` ข้างในมีไฟล์ชื่อตรงตามตาราง แล้วบอกเจ้าของว่า **"ส่ง zip นี้ให้ Claude Code วางเข้าเว็บ"** Claude Code จะวางไฟล์ รันคำสั่ง ใส่ข้อความไทยลงภาพ OG และตรวจหน้าเว็บให้

## รายงานกลับ (พิมพ์ตอนจบ)
- ไฟล์ที่ทำเสร็จ: ชื่อ · ขนาดพิกเซล · ขนาดไฟล์ KB
- ไฟล์ที่ข้าม และเหตุผล
- แบบที่เลือกของแต่ละช่อง และเหตุผล 1 บรรทัด
- ตรวจกติกา 5 ข้อแล้วหรือยัง (ไม่มีตัวหนังสือ · ไม่มีแบรนด์จริง · ไม่มีหน้าคน · วัตถุกลางภาพ · ขนาดตรง)
