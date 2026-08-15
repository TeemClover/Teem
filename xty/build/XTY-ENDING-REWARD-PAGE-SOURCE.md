# XTY Ending Reward Page — Source / Build Blueprint

> Canon source สำหรับ Claude Work / Claude Code ใช้สร้างหน้าใหม่ของ XTY
> เป้าหมาย: ทำให้ “ฉากจบ” กลายเป็นหนึ่งในเหตุผลหลักที่คนอยากเริ่มเล่น XTY
> Route ที่ต้องสร้าง: `/xty/about/ending/`
> และตีบวก `/xty/about/` ให้มี teaser/link มาหน้านี้

---

## 0. สิ่งที่หน้านี้ต้องขาย

XTY ไม่ใช่แค่ระบบ Commit 7 วัน

สิ่งที่ผู้เล่นได้ตอนจบคือ **เรื่องราวของตี้ที่เอากลับบ้านได้**

ตลอด Quest ระบบมีบริบทอยู่แล้วจาก:

- ชื่อตี้
- สิ่งที่ตี้ตั้งใจทำ
- กติกาว่าอะไรนับเป็น Commit
- สมาชิกและตัวละครของแต่ละคน
- Lead Card
- PET / NPC
- Commit ที่เกิดขึ้นจริง
- Message ที่คุยกัน
- React / Confirm
- Event และการเปลี่ยนแปลงระหว่างทาง
- วันเริ่ม วันจบ และผลของ Quest

เมื่อ Quest จบ XTY เอาข้อเท็จจริงเหล่านี้มาประกอบเป็น **Ending Source `.md`** ทันทีโดยไม่ต้องเรียก AI เพื่อรวบรวมข้อมูลซ้ำ

จากนั้นผู้เล่นเอาไฟล์นี้ไปให้ AI ที่ตัวเองใช้ AI จึงอ่านเรื่องทั้งหมดและตีความออกมาเป็น **การ์ตูน 4 ช่องบนหน้าสมุดเกม** หรือภาพความทรงจำรูปแบบอื่น

สรุปกลไกแบบสั้นที่สุด:

**7 วันของจริง → XTY Ending `.md` → AI อ่านซอส → ภาพฉากจบของตี้**

สำคัญ: ห้ามเขียน copy ที่ทำให้เข้าใจว่า XTY ส่งบทสนทนาไปให้ AI ตลอดเวลา หรือใช้ AI สร้าง Ending `.md` เอง เพราะ implementation ปัจจุบันไม่ใช่แบบนั้น

---

# 1. Positioning หลัก

## Core promise

**เล่น 7 วัน แล้วเอาเรื่องของตี้กลับบ้าน**

## Emotional promise

สิ่งที่ทำร่วมกันไม่หายไปพร้อมวันที่ Quest จบ

## Product promise

เมื่อจบ Quest ทุกคนสามารถดาวน์โหลด Ending `.md` แล้วเอาไปให้ AI สร้างฉากจบจากเรื่องจริงที่เกิดขึ้นในตี้ได้ทันที

## Secret reward

นอกจากฉากจบ ทุกคนยังได้เปิดการ์ดใหม่คนละ 1 ใบ

**อย่าเฉลยในหน้านี้ว่าการ์ดเอาไปทำอะไรได้**

ให้ความรู้สึกว่า “เก็บไว้ก่อน แล้วเล่นต่อจะรู้เอง”

---

# 2. Route + SEO

## URL

`https://www.myclover.com/xty/about/ending/`

## Title

`ฉากจบ XTY — เปลี่ยน 7 วันของตี้เป็นการ์ตูน 4 ช่องด้วย AI`

## Meta Description

`จบ Quest แล้วดาวน์โหลด Ending .md ที่รวมเรื่องจริงของตี้ตลอด 7 วัน จาก Commit, Message, React และเหตุการณ์ระหว่างทาง แล้วให้ AI เปลี่ยนความทรงจำของทุกคนเป็นการ์ตูน 4 ช่องบนหน้าสมุด XTY`

## Search intent ที่ควรจับแบบเป็นธรรมชาติ

ไม่ต้องยัด meta keywords ให้กระจายคำเหล่านี้อยู่ใน heading/body ที่อ่านเป็นภาษาคน:

- การ์ตูน 4 ช่อง AI
- AI สรุปเรื่องราว
- เก็บความทรงจำกับเพื่อน
- challenge 7 วัน
- ทำเป้าหมายกับเพื่อน
- accountability group
- กลุ่มวิ่ง
- กลุ่มอ่านหนังสือ
- study group
- ทำโปรเจกต์ด้วยกัน
- XTY ending
- Ending .md

## Structured Data

ใช้ `WebPage` เป็นหลัก และเพิ่ม `HowTo` สำหรับส่วน 3 ขั้นตอนถ้าทำได้สะอาด

HowTo steps:

1. จบ Quest และดาวน์โหลด Ending `.md`
2. แนบไฟล์ให้ AI แล้วสั่งให้สร้างฉากจบ XTY
3. รับการ์ตูน 4 ช่อง เก็บ ส่งให้เพื่อน หรือแชร์

## Sitemap

เพิ่ม `/xty/about/ending/` ใน `sitemap.xml`

---

# 3. Visual Canon — ห้ามหลุด

## Golden ratio ของ XTY

ใช้ **สัดส่วนการ์ด standard 5:7** เป็นสัดส่วนหลักของ Ending artwork และ gallery thumbnails

นี่คือ visual ratio หลักของระบบ XTY / myClover ฝั่งการ์ด

## Ending visual canon

ฉากจบมาตรฐานคือ:

- 1 หน้าสมุด
- การ์ตูนสรุป 4 ช่อง
- colored-pencil / crayon / hand-drawn notebook illustration
- warm cream + leafy green เป็นแกน
- กระดาษสมุดจริง มีเส้น ดินสอ เทป กระดาษโน้ต สติกเกอร์ รอยวาดมือ
- cute premium ไม่เด็กเกิน ไม่ slick แบบ corporate
- ตัวละคร Animal Avatar ต้องดูเป็นตัวเดิมที่ผู้เล่นรู้จัก
- บรรยากาศอบอุ่น มีความสำเร็จ แต่ไม่ต้องทำเป็นชัยชนะแบบเกมแข่งขัน
- ไม่มี UI เกมหนัก ๆ
- ไม่มี loot-box / casino visual
- ข้อความในภาพมีได้ แต่สั้น อ่านง่าย และทำหน้าที่เหมือนโน้ตในสมุด

## Emotional rule

**สำหรับคนนอก ภาพนี้อาจเป็นการ์ตูนสัตว์น่ารัก 4 ช่อง**

**สำหรับคนในตี้ ภาพเดียวกันคือความทรงจำของ 7 วันที่ทุกคนผ่านมาด้วยกัน**

หน้าเว็บต้องทำให้คนเข้าใจประโยคนี้โดยไม่ต้องอธิบายยาว

---

# 4. Asset Plan

ผู้ใช้มีภาพตัวอย่างจริง 3 ภาพจาก flow ปัจจุบันแล้ว ให้ใช้เป็น proof ของ feature

แนะนำวางใน:

`/xty/assets/ending/`

ชื่อไฟล์ canonical:

1. `ending-step-1-complete.jpg`
   - screenshot หน้า Party Complete
   - มีปุ่ม “ดาวน์โหลด Ending .md”

2. `ending-step-2-ai.jpg`
   - screenshot ตอนแนบไฟล์ Ending ให้ ChatGPT
   - prompt สั้น: “สร้างภาพจากฉากจบ XTY นี้”
   - เห็นภาพที่ AI ตอบกลับมา

3. `ending-step-3-comic.jpg` หรือ `.webp`
   - ภาพ Ending 4 ช่องเต็มหน้า
   - ตัวอย่าง “กินยาทุกวัน / ดูแลตัวเอง”
   - ใช้เป็น Hero proof หรือ final step

อย่า crop จน context ของ screenshot หาย แต่เวลาแสดงบนหน้าให้จัด frame / notebook mount ให้กลายเป็นส่วนหนึ่งของงาน ไม่ใช่โยน screenshot ดิบ ๆ ลงหน้า

---

# 5. Page Storyboard — Scroll Story

## SECTION A — HERO

### Kicker

`THE END IS THE REWARD`

### H1

**7 วันของตี้\nไม่หายไปพร้อมตอนจบ**

### Lead

`เมื่อ Quest จบ XTY จะรวบรวมสิ่งที่เกิดขึ้นจริงระหว่างทางเป็น Ending .md แล้วให้คุณเอาเรื่องของตี้ไปสร้างฉากจบกับ AI ได้ในไม่กี่ขั้น`

### Supporting line

`ไม่ใช่ภาพสำเร็จรูป ไม่ใช่ achievement ที่เหมือนกันทุกคน — แต่เป็นเรื่องของตี้นี้เท่านั้น`

### CTA

Primary: `เริ่มเขียนเรื่องของตี้คุณ` → `/xty/new/`

Secondary: `ดูวิธีเล่น XTY` → `/xty/about/how/`

### Hero visual

ใช้ภาพ `ending-step-3-comic` ใหญ่เป็น proof หลัก
ด้านข้าง/ด้านหลังอาจมี Ending `.md` card และ Animal Avatar เล็ก ๆ แบบ notebook collage

ไม่ต้องสร้าง hero เป็น dashboard

---

# 6. SECTION B — คนเดียว vs ไปเป็นตี้

เป้าหมาย: ให้คนเห็นภาพทันทีว่าทำคนเดียวมันเหนื่อยกว่าการมีเพื่อนร่วมทาง โดยไม่เขียนดูถูกการทำคนเดียว

## Heading

**คนเดียวก็ทำได้\nแต่บางวันมีตี้แล้วไปง่ายกว่า**

## Copy

`เรื่องยากไม่ใช่การรู้ว่าควรทำอะไร เรามักรู้อยู่แล้วว่าควรวิ่ง ควรอ่าน ควรทำงาน ควรดูแลตัวเอง`

`เรื่องยากคือวันที่เหนื่อย วันที่ยุ่ง หรือวันที่คำว่า “พรุ่งนี้ค่อยทำ” ฟังดูสมเหตุสมผลเกินไป`

`XTY ไม่ได้ให้เพื่อนมาคุมเรา แค่ทำให้มีคนที่กำลังเดินเรื่องเดียวกันอยู่ข้าง ๆ`

## Scroll visual storyboard

ทำเป็น visual sequence ที่รู้สึกเหมือนเลื่อนแล้วเรื่องเดินต่อ:

### Frame 1 — Alone

แมวส้ม 1 ตัวเดิน/ทำกิจกรรมคนเดียว

- notebook checklist มีช่องยังว่าง
- กระเป๋าดูหนัก
- หน้าไม่ได้เศร้าดราม่า แค่เหนื่อย/ลังเล
- background โล่งกว่าปกติ

Caption เล็ก:

`วันที่มีแรง — ไปได้`

### Frame 2 — A friend joins

มีเพื่อนตัวที่ 2 เข้ามา

Caption:

`วันที่ไม่ค่อยมีแรง — ยังมีคนเดินอยู่ข้าง ๆ`

### Frame 3 — Full party

ครบ 5 ตัว เดิน/วิ่ง/ถือหนังสือ/ช่วยกันไปตามเส้นทางเดียวกัน

- movement สนุกขึ้น
- มีรอยเท้า/flag/check mark
- ให้เห็น PET/NPC เดินตามได้ถ้า composition ไม่รก

Caption ใหญ่:

**ไม่ต้องเก่งพร้อมกัน\nแค่กลับมา Commit ด้วยกัน**

## Animation direction

ถ้าจะ animate ให้ใช้ CSS / scroll reveal เบา ๆ

- ไม่ใช้ animation หนักจนมือถือกระตุก
- ไม่ auto-scroll
- ไม่ parallax หลาย layer เกินจำเป็น
- content ต้องอ่านได้ครบแม้ JS animation ไม่ทำงาน

---

# 7. SECTION C — 7 วันเขียนเรื่องของมันเอง

## Kicker

`YOUR PARTY ALREADY HAS A STORY`

## H2

**ไม่ต้องนั่งเขียนไดอารี\nXTY มีบริบทของเรื่องอยู่แล้ว**

## Copy

`ชื่อตี้บอกว่าเรามารวมกันเพื่ออะไร กติกา Commit บอกว่าอะไรคือก้าวสำคัญ และ Party Log เก็บสิ่งที่เกิดขึ้นระหว่างทาง`

`ตลอด Quest มีทั้งวันที่ทุกคน Commit พร้อมกัน วันที่มีคนส่งกำลังใจ วันที่เปลี่ยนกติกา วันที่มีเพื่อนเข้ามา หรือวันที่แค่กลับมาบอกว่า “วันนี้ทำแล้ว”`

`ตอนจบ XTY เอาข้อเท็จจริงทั้งหมดมาจัดเป็น Ending Source ให้ทันที โดยไม่ต้องให้ AI เดาว่าเกิดอะไรขึ้น`

## Visual / mini cards

แสดงเป็นองค์ประกอบ 6–8 ชิ้น:

- PARTY NAME
- ACTIVITY
- COMMIT RULE
- CAST
- COMMIT
- MESSAGE
- REACT / CONFIRM
- TIMELINE / EVENTS

แล้วให้ flow รวมเข้าไฟล์ `Ending .md`

## Important accuracy copy

ใช้ข้อความประมาณนี้:

`XTY ทำหน้าที่เก็บ “ความจริง” ของเรื่อง ส่วน AI ทำหน้าที่ “เล่า” ความจริงนั้นออกมาเป็นภาพ`

นี่คือประโยคสำคัญมากของหน้า

---

# 8. SECTION D — 3 ขั้นตอนดูฉากจบ

ต้องใช้ภาพจริง 3 ภาพที่ผู้ใช้ส่งมาเป็นตัวอย่างหลัก

## Kicker

`3 STEPS TO YOUR ENDING`

## H2

**จบ Quest แล้ว\nเสกหน้าสุดท้ายของตี้ได้เลย**

### STEP 1 — ดาวน์โหลด Ending .md

ภาพ: `ending-step-1-complete.jpg`

Heading:

**1. จบ Quest แล้วโหลดซอสตอนจบ**

Copy:

`เมื่อครบ Quest หน้าตี้จะเปิด Ending .md ให้ทุกคนดาวน์โหลด ไฟล์นี้รวม Cast, Timeline, Commit, Stats, เหตุการณ์สำคัญ และ prompt สำหรับฉากจบไว้แล้ว`

Small note:

`ไฟล์ออกทันที เพราะ XTY รวบรวมจากข้อมูลที่ตี้มีอยู่แล้ว ไม่ต้องรอ AI สรุปใหม่`

### STEP 2 — ส่งไฟล์ให้ AI

ภาพ: `ending-step-2-ai.jpg`

Heading:

**2. แนบไฟล์ แล้วพูดสั้น ๆ ก็พอ**

Prompt chip ใหญ่:

`สร้างภาพจากฉากจบ XTY นี้`

Copy:

`AI อ่าน Ending Source แล้วรู้ว่าตี้นี้ทำอะไร มีใครบ้าง เกิดอะไรขึ้นระหว่างทาง และฉากจบควรเล่าเรื่องแบบไหน`

Alternative prompt เล็ก:

`ทำการ์ตูน 4 ช่องจากไฟล์นี้`

อย่าบังคับว่าต้องใช้ ChatGPT เท่านั้น เขียนว่า “AI ที่คุณใช้” แต่ screenshot proof ใช้ ChatGPT ได้ตามจริง

### STEP 3 — ได้หน้าสมุดของตี้

ภาพ: `ending-step-3-comic.jpg`

Heading:

**3. เก็บหน้าสุดท้ายของเรื่องไว้**

Copy:

`AI เปลี่ยนเรื่องที่เกิดขึ้นใน 7 วันให้เป็นการ์ตูน 4 ช่องบนหน้าสมุดเกม จะเซฟเก็บ ส่งให้สมาชิกตี้ หรือแชร์ออกไปก็ได้`

Microcopy:

`เรื่องเดียวกัน เจนใหม่ได้หลายครั้ง แต่ Source เดิมยังเป็นเรื่องจริงของตี้เสมอ`

---

# 9. SECTION E — Emotional payoff

ส่วนนี้ต้องเป็นส่วนที่ “ขาย” feature ที่สุด

## Layout

ใช้ Ending comic เต็ม 5:7 ด้านหนึ่ง
อีกด้านเป็น copy ใหญ่ พื้นที่หายใจเยอะ

## Copy — ใช้เวอร์ชันนี้เป็นหลัก

### H2

**สำหรับคนอื่น\nมันอาจเป็นแค่การ์ตูน 4 ช่อง**

### Follow-up ใหญ่กว่า body

**แต่คนที่อยู่ในตี้\nจะเห็นอย่างอื่นอยู่ในภาพเดียวกัน**

### Body

`เห็นวันที่เกือบไม่ได้ทำ แต่สุดท้ายกลับมา Commit`

`เห็นเพื่อนที่ทักมาในวันที่เงียบ`

`เห็นมุกที่คนนอกไม่เข้าใจ`

`เห็นเป้าหมายเล็ก ๆ ที่พอผ่านมาด้วยกันแล้ว กลายเป็นความทรงจำของช่วงหนึ่งในชีวิต`

### Closing line

**Quest จบได้\nแต่เรื่องนั้นเก็บไว้ได้ตลอดไป**

หลีกเลี่ยงคำหวานเว่อร์หรือ sentimental จนเหมือนโฆษณาประกัน ให้ภาษาตรง อบอุ่น และเชื่อได้

---

# 10. SECTION F — Ending Gallery

## Kicker

`EVERY PARTY ENDS DIFFERENTLY`

## H2

**เรื่องของแต่ละตี้\nไม่มีทางออกมาเหมือนกัน**

## Intro

`กติกาเดียวกัน แต่คน เป้าหมาย บทสนทนา และวันที่ทุกคนเจอไม่เหมือนกัน ฉากจบจึงกลายเป็นหน้าสมุดคนละเรื่อง`

## Gallery behavior

- mobile: horizontal snap gallery หรือ 2-column compact grid
- desktop: editorial masonry / 3-column
- ทุกชิ้นยึด 5:7
- แตะแล้วเปิด large preview ได้
- อย่าทำ carousel auto-play

## Gallery Concepts ที่ควรสร้างเพิ่ม

### 1. Running Party — “วิ่งให้ครบ 3 วัน”

Filename: `ending-gallery-run.webp`

Story seed:

- สมาชิก 4–5 ตัว
- เริ่มจากผูกเชือกรองเท้า
- วิ่งสวนตอนเช้า
- วันฝนตกยังเดินแทน
- จบที่ทุกคนแตะมือกันตรงเส้นทางเดิม

Prompt direction:

`Create a 5:7 four-panel XTY notebook comic about a small animal party completing a 7-day running quest together. Warm colored-pencil drawing, cream notebook paper, green accents, early-morning park, running shoes, gentle check marks, friendly celebration, same canon as XTY Ending.`

### 2. Study / Exam Party — “อ่านสอบด้วยกัน”

Filename: `ending-gallery-study.webp`

Story seed:

- หนังสือคนละกอง
- video call / โต๊ะอ่านไม่ต้องเป็น UI
- คืนที่ง่วง มีเพื่อนส่งกำลังใจ
- จบด้วยปิดหนังสือและติ๊ก checklist ครบ

### 3. Wellness / Weight-care Party — “ดูแลตัวเอง 7 วัน”

Filename: `ending-gallery-wellness.webp`

Story seed:

- น้ำ อาหาร การเดิน การพักผ่อน
- ห้ามทำ before/after body transformation
- ไม่ใช้ตัวเลขน้ำหนักเป็นชัยชนะ
- เน้นนิสัยและการดูแลตัวเอง

### 4. Side Project Party — “ทำโปรเจกต์ให้ขยับทุกวัน”

Filename: `ending-gallery-project.webp`

Story seed:

- laptop / sketch / sticky notes
- Commit เป็นชิ้นงานเล็ก ๆ
- มีช่วงติดบั๊ก/แก้ใหม่
- จบด้วยของที่ทำเสร็จวางกลางโต๊ะ

### 5. Volunteer Party — “ออกไปช่วยด้วยกัน”

Filename: `ending-gallery-volunteer.webp`

Story seed:

- เตรียมของ
- แบ่งงาน
- ลงพื้นที่
- กลับมานั่งเขียนโน้ตสิ่งที่ได้เรียนรู้

### 6. Reading Club — “วันละ 10 หน้า”

Filename: `ending-gallery-reading.webp`

Story seed:

- หนังสือคนละเล่ม
- highlight / bookmark
- แชร์ประโยคที่ชอบ
- จบด้วยกองหนังสือ + ใบเช็กครบ

## Gallery caption pattern

อย่าเขียน caption เป็น feature list

ใช้ชื่อ Quest + ประโยคสั้น เช่น:

- `วิ่งให้ครบ 3 วัน — วันที่ฝนตก พวกเขาเปลี่ยนจากวิ่งเป็นเดิน แต่ไม่มีใครหายไป`
- `อ่านสอบด้วยกัน — ไม่มีใครอ่านแทนใคร แค่รู้ว่าคืนนี้มีอีก 4 คนเปิดหนังสืออยู่เหมือนกัน`

---

# 11. SECTION G — AI mechanism แบบคนทั่วไปเข้าใจ

## H2

**AI ไม่ได้แต่งเรื่องแทนตี้\nมันอ่านเรื่องที่ตี้สร้างไว้แล้ว**

## Diagram

ใช้ diagram ง่าย ๆ:

`ชีวิตจริง`
↓
`Commit · Message · React · Event`
↓
`Ending .md`
↓
`AI`
↓
`4-Panel Comic / Poster / Postcard`

## Copy

`XTY ไม่ต้องให้ AI มานั่งเดาว่าตลอด 7 วันเกิดอะไรขึ้น เพราะระบบมี timeline ของเรื่องอยู่แล้ว Ending .md จึงทำหน้าที่เป็น Source ที่ส่งบริบทให้ครบในครั้งเดียว`

`AI มีหน้าที่เลือกมุมเล่าเรื่อง จัดฉาก และเปลี่ยนความทรงจำเหล่านั้นเป็นภาพ`

## Trust note

`ไฟล์ Ending ไม่ต้องมีอีเมล เบอร์โทร หรือ token ของสมาชิกเพื่อสร้างเรื่อง`

อย่า claim เรื่อง privacy เกินกว่าระบบรองรับจริง

---

# 12. SECTION H — Surprise Card Reward

ต้องเล่าแบบ teaser เท่านั้น

## Visual

การ์ดหงายไม่เต็มใบ / เห็นแสงหรือขอบการ์ด / card back / silhouette

อย่าโชว์คำอธิบาย utility
อย่าใส่ odds
อย่าเฉลย progression mechanic

## Kicker

`AND ONE MORE THING...`

## H2

**ก่อนแยกย้าย\nทุกคนยังได้เปิดการ์ดใหม่อีก 1 ใบ**

## Copy

`การ์ดของแต่ละคนเปิดจาก Quest เดียวกัน แต่เป็นรางวัลของตัวเอง`

`มันเอาไปทำอะไรได้?`

**เก็บไว้ก่อน แล้วเล่นต่อจะรู้เอง**

CTA เล็ก:

`เริ่ม Quest แรก` → `/xty/new/`

---

# 13. FINAL CTA

## H2

**เรื่องของตี้คุณ\nยังไม่มีใครวาด เพราะมันยังไม่เกิดขึ้น**

## Body

`ตั้งเรื่องเล็ก ๆ สักเรื่อง ชวนคนที่อยากไปทางเดียวกัน แล้วให้ 7 วันต่อจากนี้เป็น Source ของหน้าสุดท้าย`

Primary CTA:

`+ ตั้งตี้แรก`

Secondary:

`หาตี้สาธารณะ`

Microcopy:

`วิ่ง อ่านหนังสือ ดูแลตัวเอง ทำงาน ทำโปรเจกต์ หรือเรื่องอะไรก็ได้ที่นิยามคำว่า Commit ได้`

---

# 14. About Page Patch

หน้า `/xty/about/` ปัจจุบันมี `THE END` note ที่อธิบาย Ending แบบเทคนิคเกินไป

ให้เปลี่ยนเป็น teaser ที่ทำให้คนอยากเปิดหน้า Ending โดยยังไม่กินพื้นที่ About มาก

## Suggested replacement

### Kicker / badge

`THE END`

### H2

**7 วันของตี้\nกลายเป็นหน้าสุดท้ายของเรื่องได้**

### Body

`เมื่อ Quest จบ XTY จะทำ Ending .md จากสิ่งที่เกิดขึ้นจริงในตี้ แล้วให้คุณเอาไฟล์นี้ไปให้ AI สร้างการ์ตูน 4 ช่อง โปสเตอร์ หรือภาพความทรงจำของกลุ่มได้`

`สำหรับคนนอกมันอาจเป็นภาพสัตว์น่ารัก แต่สำหรับคนที่ผ่าน 7 วันนั้นมาด้วยกัน มันคืออีกเรื่องหนึ่งเลย`

### CTA

`ดูว่าฉากจบ XTY ทำงานยังไง →` → `/xty/about/ending/`

## Lifecycle wording patch

ใน A PARTY HAS A LIFE:

เดิม:

`ENDING .MD — เก็บซอสความทรงจำ`

เปลี่ยนเป็น:

`ENDING .MD — เอาเรื่องของตี้กลับบ้าน`

## Animal Card section patch

อย่าอธิบาย utility ของการ์ดละเอียดในหน้า Ending
หน้า About หลักมีข้อมูลระบบได้ แต่ teaser ฉากจบควรพูดแค่ว่า:

`เมื่อ Quest จบ ทุกคนมีรางวัลของตัวเองรออยู่`

---

# 15. Internal Links

หน้านี้ต้อง link ไป:

- `/xty/new/` — ตั้งตี้
- `/xty/public/` — หาตี้สาธารณะ
- `/xty/about/how/` — วิธีเล่น
- `/xty/about/what/` — ไอเดียตั้งตี้
- `/xty/about/` — กลับหน้าเกี่ยวกับ

หน้าเหล่านี้ควร link กลับมาที่ `/xty/about/ending/` ด้วย:

- `/xty/about/`
- `/xty/about/how/` ช่วงอธิบายจบ Quest
- `/xty/about/what/` อาจใส่ CTA หลังตัวอย่าง activity

ถ้าไม่รก สามารถเพิ่มลิงก์เล็กในหน้า Party Complete ใต้ปุ่ม Ending `.md` ว่า:

`Ending .md เอาไปทำอะไรได้?`

→ `/xty/about/ending/`

---

# 16. Mobile UX

หน้านี้ต้อง mobile-first เพราะ flow จริงเกิดบนมือถือ

- screenshot 3 ขั้นต้องอ่านได้โดยไม่ pinch
- อย่าวาง screenshot iPhone 3 รูปเรียงเล็ก ๆ ในแถวเดียวบนมือถือ
- ให้เป็น step ใหญ่ทีละชิ้น
- Ending comic ต้องเกือบเต็ม viewport width
- gallery scroll ต้อง native และลื่น ไม่มี auto scroll
- CTA ใหญ่แตะง่าย
- หลีกเลี่ยง sticky หลายชั้น
- animation ทุกอย่างต้องไม่แย่ง scroll

---

# 17. Copy Rules

ใช้ภาษาไทยตรง ๆ อบอุ่น ไม่ corporate

ใช้คำ:

- ตี้
- Quest
- Commit
- Ending .md
- ซอสตอนจบ / Ending Source ในจุดที่อธิบายกลไก
- เรื่องของตี้
- หน้าสุดท้าย
- ความทรงจำ

หลีกเลี่ยง:

- “AI-powered revolutionary platform”
- gamification jargon ยาว ๆ
- productivity bro tone
- “บังคับตัวเองให้มีวินัย”
- การทำให้เพื่อนเป็นผู้คุม
- การเคลมว่า AI เข้าใจทุกอย่างโดยอัตโนมัติ

---

# 18. Key Copy Canon — ประโยคที่ควรล็อก

ประโยคเหล่านี้คือแกนของหน้า:

> **7 วันของตี้ ไม่หายไปพร้อมตอนจบ**

> **XTY ทำหน้าที่เก็บ “ความจริง” ของเรื่อง ส่วน AI ทำหน้าที่ “เล่า” ความจริงนั้นออกมาเป็นภาพ**

> **สำหรับคนอื่น มันอาจเป็นแค่การ์ตูน 4 ช่อง แต่คนที่อยู่ในตี้จะเห็นอย่างอื่นอยู่ในภาพเดียวกัน**

> **Quest จบได้ แต่เรื่องนั้นเก็บไว้ได้ตลอดไป**

> **เรื่องของตี้คุณยังไม่มีใครวาด เพราะมันยังไม่เกิดขึ้น**

---

# 19. Existing Implementation Facts — ใช้อ้างอิงตอน build

Implementation ปัจจุบันมีของจริงแล้ว:

- หน้า Party Complete มีปุ่ม `ดาวน์โหลด Ending .md`
- client เรียก `downloadEndingMarkdown(getParty(code))`
- `buildEndingMarkdown()` ประกอบไฟล์จาก party snapshot โดยตรง
- Ending source มี Party, Cast, Timeline, Important Changes, Memorable Moments, Character Notes, Summary Stats, Story Summary
- มี prompt สำหรับ 4-Panel Comic, Poster, Group Illustration และ Postcard Memory อยู่แล้ว
- Final instruction ในไฟล์บอกผู้เล่นให้เอาไฟล์ไปให้ AI แล้วพิมพ์ให้ทำการ์ตูน 4 ช่อง
- เมื่อ Quest complete ระบบมี card reward flow อยู่แล้ว

ดังนั้นหน้าใหม่ต้องขาย “สิ่งที่มีจริง” ไม่ใช่ mock feature

---

# 20. Build Definition of Done

ถือว่าหน้านี้เสร็จเมื่อ:

- [ ] มี route `/xty/about/ending/`
- [ ] indexable + canonical ถูกต้อง
- [ ] social meta ใช้ XTY OG image หลัก
- [ ] sitemap มี route ใหม่
- [ ] Hero ทำให้เข้าใจว่าฉากจบคือ reward
- [ ] มี Alone → Party 5 คน visual story
- [ ] มี 3-step flow จาก screenshot จริง
- [ ] อธิบาย Ending `.md` → AI อย่างถูกต้อง
- [ ] มี emotional payoff copy
- [ ] มี gallery ฉากจบหลาย use case
- [ ] gallery ยึด 5:7
- [ ] มี surprise card reward แต่ไม่เฉลย utility
- [ ] มี CTA ตั้งตี้ / หาตี้
- [ ] `/xty/about/` มี teaser/link มาหน้า Ending
- [ ] `/xty/about/how/` มี internal link ถ้าไม่ทำให้รก
- [ ] mobile scroll ลื่น ไม่มี auto-scroll / scroll hijack
- [ ] ไม่มีการเปลี่ยน flow การเล่นหรือ Ending generator เดิมโดยไม่จำเป็น

---

# 21. Final Direction to Claude Work

อย่าทำหน้าเป็น documentation ของไฟล์ `.md`

**ทำให้มันเป็นหน้ารางวัลตอนจบเกมที่คนเห็นแล้วอยากมี “เรื่องของตี้ตัวเอง” บ้าง**

คนควรเลื่อนจบแล้วคิดว่า:

> “กูอยากรู้ว่าถ้าตั้งตี้กับเพื่อน 7 วัน ฉากจบของพวกกูจะออกมาเป็นอะไร”

ถ้าหน้าสวยแต่ไม่สร้างความรู้สึกนี้ ถือว่ายังไม่เสร็จ
