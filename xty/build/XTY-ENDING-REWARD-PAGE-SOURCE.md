# XTY About Journey + Ending Reward — Master Source / Build Blueprint

> Canon source สำหรับ **ChatGPT Work** ใช้ตีบวก XTY About Journey, สร้างหน้า Ending Reward และสร้างภาพประกอบที่ยังขาดในรอบเดียว
>
> เป้าหมาย: คนที่เปิด `/xty/about/` ต้องเข้าใจ XTY ได้จบในหน้าเดียว แต่ถ้าอยากอ่านต่อ ให้มีเส้นทางตรงที่ไม่หลง:
>
> **ABOUT → WHY → HOW → WHAT → IDEAS → PLAY**
>
> พร้อมทำให้ “ฉากจบ” เป็นหนึ่งในเหตุผลหลักที่คนอยากเริ่มเล่น XTY

---

# 0. งานที่ต้องทำจาก Source นี้

ให้ ChatGPT Work ตรวจของจริงใน repo ก่อนแก้ แล้วทำงานต่อไปนี้:

1. ตีบวก `/xty/about/` ให้เป็นหน้าเดียวที่อ่านจบแล้วเข้าใจ XTY ครบ โดยยังสั้น สนุก และ visual-first
2. จัดเส้นทางอ่านต่อให้เป็นทางเดียว:
   - `/xty/about/`
   - `/xty/about/why/`
   - `/xty/about/how/`
   - `/xty/about/what/`
   - `/xty/ideas/`
   - `/xty/` หรือ CTA เริ่มเล่น
3. แต่ละหน้าต้องมี `NEXT` ที่ชัดเจนไปหน้าถัดไป ห้ามแตกแขนงจนคนหลง
4. สร้างหน้า feature ใหม่ `/xty/about/ending/` สำหรับขาย “รางวัลตอนจบเกม” โดยเฉพาะ
5. หน้า Ending เป็น optional deep dive จาก ABOUT/WHAT ไม่ต้องขวาง main straight path
6. ใช้ภาพ proof 3 ภาพของ Ending flow ที่ผู้ใช้ให้มา
7. **สร้างภาพประกอบใหม่ด้วย image generation** เมื่อจำเป็น โดยยึด visual canon ด้านล่าง
8. ทำ gallery ตัวอย่างฉากจบหลายประเภท เช่น กลุ่มวิ่ง, อ่านสอบ, Book Club, side project, งานอาสา
9. อัปเดต internal links, canonical, schema และ sitemap ให้ครบ
10. ห้ามเพิ่ม visible SEO keyword blocks กลับไปบนหน้าเล่นจริง

---

# 1. Product Architecture — แยก PLAY / STORY / SEARCH ให้ชัด

## PLAY SURFACES — ต้องโล่ง

หน้าเหล่านี้มีไว้ “ใช้” ไม่ใช่ “อ่านบทความ”:

- `/xty/`
- `/xty/public/`
- `/xty/p/`
- `/xty/join/`
- `/xty/new/`
- profile / collection / reveal และ utility routes

กติกา:

- ไม่ใส่ SEO article
- ไม่ใส่ keyword cloud
- ไม่ใส่ย่อหน้าชวนค้นหา
- ข้อความทุกบรรทัดต้องช่วย action ที่ผู้ใช้กำลังทำ
- metadata / schema หลังฉากมีได้ แต่ visible UI ต้องสงบ

## STORY SURFACES — อ่านแล้วอยากเล่น

- `/xty/about/`
- `/xty/about/why/`
- `/xty/about/how/`
- `/xty/about/what/`
- `/xty/about/ending/`

เนื้อหาต้องเหมือน product story ไม่ใช่ documentation

## SEARCH SURFACE — รับ long-tail

- `/xty/ideas/`

หน้านี้รับคำค้นพวก:

- หาตี้
- หาเพื่อนวิ่ง / กลุ่มวิ่ง
- ออกกำลังกาย / สุขภาพ
- อ่านหนังสือ / Book Club
- อ่านสอบ / Study Group
- เรียนภาษา
- accountability
- side project
- แชร์ความรู้
- งานอาสา
- กิจกรรมกับเพื่อน

แต่เขียนให้เป็น “ไอเดียชวนเล่น” ไม่ใช่ keyword dump

---

# 2. Main Journey — ABOUT ต้องจบในหน้าเดียวได้

`/xty/about/` ต้องตอบให้ครบโดยไม่บังคับคนเปิดหน้าอื่น

คนที่อ่านจบควรรู้:

1. XTY คืออะไร
2. ทำไมมีตี้แล้วบางเรื่องง่ายกว่า
3. เล่นยังไง
4. เอาไปทำอะไรได้
5. ตลอด Quest เกิดอะไรขึ้น
6. ตอนจบได้อะไรกลับบ้าน
7. เริ่มเล่นตรงไหน

แต่เนื้อหาต้อง **visual-first + short copy**

ใช้ภาพ ตัวละคร การ์ด fake Party Log และ scroll story ช่วยเล่าแทน paragraph ยาว

## Suggested ABOUT order

### A. HERO

**ตั้งตี้ แล้วออกไปเล่นชีวิตจริงด้วยกัน**

Supporting copy สั้น:

`ชวนเพื่อน 2–5 คน เลือกเรื่องที่อยากทำ แล้วกลับมา Commit ว่าวันนี้ลงมือแล้ว`

CTA:
- `+ ตั้งตี้`
- `หาตี้สาธารณะ`

### B. WHY TEASER

**คนเดียวก็ทำได้\nแต่บางวันมีตี้แล้วไปง่ายกว่า**

เล่าเป็นภาพมากกว่าตัวหนังสือ:

- แมวส้มเริ่มคนเดียว
- วันที่ดีไปได้
- วันที่เหนื่อยเริ่มนั่งท้อ / checklist ค้าง
- เพื่อนค่อย ๆ เข้ามา
- ครบ 5 ตัวเดินต่อด้วยกัน สนุกขึ้น ไม่ใช่แข่งขันกัน

Copy ไม่เกิน 2–3 บรรทัด

CTA รองเล็ก:
`ทำไม XTY ถึงออกแบบแบบนี้ →` ไป `/xty/about/why/`

### C. HOW TEASER

จำให้ได้ใน 3 verbs:

**ตั้งตี้ → ออกไปทำ → กลับมา Commit**

เสริมได้อีก 1 บรรทัด:

`เกมเกิดในชีวิตจริง หน้าจอมีไว้ช่วยให้ตี้ยังเดินอยู่`

CTA: `/xty/about/how/`

### D. WHAT TEASER

ใช้ภาพกิจกรรม ไม่ต้องอธิบายทุก use case:

`วิ่ง · อ่าน · เรียน · ทำงาน · ดูแลตัวเอง · หรือเรื่องที่มีแค่พวกคุณเข้าใจ`

CTA: `/xty/about/what/`

### E. CALM PARTY LOG

โชว์ว่า XTY ไม่ใช่ group chat อีกห้อง

Copy:

**คุยน้อย แต่ยังรู้ว่าเพื่อนเดินถึงไหนแล้ว**

`Commit คือแกน Message มีเท่าที่จำเป็น React ใช้บอกว่า “เห็นนะ” โดยไม่เพิ่มหนี้ข้อความ`

### F. ENDING REWARD TEASER — สำคัญมาก

อย่าพูดเป็น technical note

Heading:

**แล้ว 7 วันที่ผ่านมาจะไม่หายไป**

Copy:

`ตอน Quest จบ XTY จะรวบรวมร่องรอยที่เกิดขึ้นจริงของตี้เป็น Ending Source ให้เอาไปสร้างฉากจบกับ AI ได้ใน prompt เดียว`

โชว์ภาพ Ending comic จริงแบบใหญ่

Emotional line:

**สำหรับคนอื่น มันอาจเป็นการ์ตูนสัตว์ 4 ช่อง\nแต่คนในตี้จะเห็น 7 วันที่ตัวเองผ่านมาด้วยกัน**

ลิงก์รอง:
`ดูว่าฉากจบเกิดขึ้นยังไง → /xty/about/ending/`

### G. SECRET CARD TEASER

ไม่อธิบายระบบทั้งหมด

**ก่อนแยกย้าย ทุกคนยังได้เปิดการ์ดใหม่อีก 1 ใบ**

`มันเอาไปทำอะไรได้? เก็บไว้ก่อน แล้วเล่นต่อจะรู้เอง`

### H. END CTA

**อยากรู้ว่าฉากจบของตี้คุณจะเป็นเรื่องอะไร?**

Primary: `+ ตั้งตี้แรก`

Secondary small text:
`ยังไม่พร้อมเล่น? อ่าน WHY ต่อ →`

---

# 3. Deep Reading Path — เส้นตรงห้ามหลง

คนที่กด “อ่านต่อ” จาก About ต้องเดินตามนี้:

## ABOUT → WHY

WHY มีไว้ตอบเพียงคำถามเดียว:

**ทำไมบางเรื่องมีคนเดินด้วยแล้วง่ายกว่า?**

อย่าทำเป็น essay ยาว

แนว copy:

`เราไม่ได้ขาดแอปคุยกัน เราขาดพื้นที่ที่คุยน้อย แต่ยังช่วยให้สิ่งที่ตั้งใจเกิดขึ้นจริง`

ประเด็นหลัก:

- Message Debt
- ชีวิตจริงเกิดข้างนอกแอป
- กลุ่มเล็ก 2–5 คนมีความหมาย
- ไม่ optimize ให้คนอยู่ในแอปนาน

NEXT เท่านั้น:

`แล้วเล่นยังไง? → HOW`

---

## WHY → HOW

HOW ให้สั้นจนจำได้:

1. ตั้งตี้ / เข้าตี้
2. เขียนกติกา Commit ให้ชัด
3. ออกไปทำจริง
4. กลับมา Commit
5. จบ Quest แล้วรับ Ending + reward

ไม่ต้องอธิบายทุก control

NEXT:

`เอาไปทำอะไรได้บ้าง? → WHAT`

---

## HOW → WHAT

WHAT ไม่ต้องเป็น SEO dump

ใช้ภาพ + card สั้น ๆ:

- วิ่ง
- อ่าน
- เรียน
- สุขภาพ
- งาน / project
- สร้างสรรค์
- งานอาสา
- Custom

Core line:

**ถ้าอธิบายได้ว่า “วันนี้ทำอะไรแล้วนับว่า Commit” ก็เอามาตั้งเป็นตี้ได้**

แทรก Ending teaser ได้ เพราะ WHAT = “สิ่งที่ XTY ทำให้กิจกรรมเหล่านี้กลายเป็นเรื่องราว”

NEXT:

`ยังคิดไม่ออก? ดูไอเดียตั้งตี้ → IDEAS`

---

## WHAT → IDEAS

`/xty/ideas/` เป็น long-tail search page และ inspiration page

ให้เนื้อหาเยอะกว่าหน้าอื่นได้ แต่ยังต้องอ่านสนุก

ตัวอย่าง tone:

**หาเพื่อนวิ่ง / กลุ่มวิ่ง**
`ไม่ต้อง pace เดียวกัน ไม่ต้องอยู่สนามเดียวกัน ตกลงแค่ว่าอะไรนับเป็น Commit แล้วกลับมาบอกว่า “วันนี้ออกไปแล้ว”`

**อ่านสอบ / Study Group**
`ไม่ต้องเปิดกล้องนั่งเฝ้ากันทั้งคืน แต่ยังรู้ว่าอีก 4 คนกำลังเดินอยู่เหมือนกัน`

ท้ายหน้าอย่าโยนลิงก์หลายทาง

NEXT หลัก:

`เลือกได้แล้ว → เริ่มเล่น XTY`

---

## IDEAS → PLAY

ปลายทางคือ `/xty/`

ข้อความ:

**พอมีเรื่องที่อยากทำแล้ว ไม่ต้องอ่านต่อ**

`ตั้งตี้ แล้วเริ่มวันแรกเลย`

CTA: `เริ่มเล่น`

---

# 4. Optional Deep Dive — `/xty/about/ending/`

หน้า Ending ไม่ใช่ขั้นบังคับของ main path แต่เป็น feature page ที่ทำหน้าที่ “ขายรางวัลตอนจบเกม”

คนอาจเข้าจาก:

- ABOUT Ending teaser
- WHAT
- social/share
- Search

เมื่ออ่านจบ CTA กลับไป PLAY หรือกลับเข้า main journey ได้

---

# 5. สิ่งที่หน้า Ending ต้องขาย

XTY ไม่ใช่แค่ระบบ Commit 7 วัน

**สิ่งที่ผู้เล่นได้ตอนจบคือเรื่องราวของตี้ที่เอากลับบ้านได้**

ตลอด Quest ระบบมีบริบทจาก:

- ชื่อตี้
- สิ่งที่ตี้ตั้งใจทำ
- กติกา Commit
- สมาชิกและ Animal Avatar
- Lead Card
- PET / NPC
- Commit ที่เกิดขึ้นจริง
- Message
- React / Confirm
- Event และการเปลี่ยนแปลงระหว่างทาง
- วันเริ่ม วันจบ และผลของ Quest

เมื่อ Quest จบ XTY เอาข้อเท็จจริงเหล่านี้มาประกอบเป็น **Ending Source `.md`** ทันที

### Accuracy rule — สำคัญ

ปัจจุบัน **Ending `.md` ไม่ได้สร้างด้วย AI**

มันถูกประกอบจากข้อมูลจริงของ Party ด้วย deterministic code จึงเร็ว ดาวน์โหลดได้ทันที และไม่ต้องเสีย AI call เพื่อรวบรวมสิ่งที่ระบบรู้อยู่แล้ว

จากนั้น AI ถูกใช้ตรงที่ AI เก่งจริง:

**อ่านซอส → ตีความเรื่องราว → สร้างภาพฉากจบ**

ห้ามเขียนว่า XTY ส่งบทสนทนาให้ AI ตลอด 7 วัน

ห้ามเขียนว่า XTY ใช้ AI สรุป `.md` ถ้า implementation ยังไม่ได้ทำแบบนั้น

สรุปกลไก:

**7 วันของจริง → XTY ประกอบ Ending Source → ผู้เล่นส่งให้ AI → AI สร้างภาพความทรงจำ**

---

# 6. ความจริงเรื่อง “ทำไม XTY ไม่สร้างภาพให้เลย” — พูดตรง ๆ ได้

นี่ควรเป็น feature story ไม่ใช่ disclaimer เล็ก ๆ

## Heading option

**จริง ๆ เราอยากเสกภาพนี้ให้ทุกตี้เลย**

## Recommended copy

`แต่ภาพ AI มีต้นทุนทุกครั้งที่สร้าง และเราอยากให้ XTY เปิดให้คนตั้งตี้กับเพื่อนได้ฟรี`

`ถ้า XTY แบกค่าประมวลผลภาพของทุกตี้ไว้เอง สิ่งที่ดูเหมือนของขวัญเล็ก ๆ ตอนจบ จะกลายเป็นต้นทุนที่โตตามจำนวนคนเล่น`

`เราเลยเลือกทำส่วนที่สำคัญที่สุดให้ทุกคนก่อน: เก็บเรื่องจริงที่เกิดขึ้นตลอด Quest แล้วประกอบเป็น “ซอสตอนจบ” ที่พร้อมให้ AI อ่านทันที`

`คุณเอาไฟล์นี้ไปใช้กับ AI ที่มีอยู่แล้วได้ ไม่ต้องเล่า 7 วันใหม่ ไม่ต้องนั่งเขียน prompt ยาว — แนบซอส แล้วสั่งให้ปรุง`

Strong line:

**เราไม่ได้ตัดฉากจบออกเพื่อประหยัด\nเราแยก “เรื่องของคุณ” ออกจาก “ค่าปรุงภาพ” เพื่อให้เรื่องนั้นยังเป็นของทุกคนได้ฟรี**

### Future note

พูดถึงอนาคตได้ แต่ห้าม promise date:

`ถ้าวันหนึ่งเราทำให้ต้นทุนส่วนนี้ยั่งยืนได้ เราก็อยากให้ฉากจบเกิดขึ้นใน XTY โดยไม่ต้องออกไปไหนเหมือนกัน`

`แต่วันนี้ Source-first ทำให้ทุกคนได้ของชิ้นเดียวกันก่อน: เรื่องราวของตัวเองที่พกออกไปใช้ต่อได้ ไม่ถูกล็อกไว้กับระบบเรา`

นี่เป็นทั้ง product philosophy และ portability story

---

# 7. Ending Hero

## Kicker

`THE END IS THE REWARD`

## H1

**7 วันของตี้\nไม่หายไปพร้อมตอนจบ**

## Lead

`เมื่อ Quest จบ XTY จะเก็บร่องรอยที่เกิดขึ้นจริงเป็น Ending Source แล้วให้คุณเอาเรื่องของตี้ไปสร้างฉากจบกับ AI ได้ง่าย ๆ`

## Supporting line

`ไม่ใช่ภาพสำเร็จรูปที่ทุกคนได้เหมือนกัน แต่เป็นเรื่องของตี้นี้เท่านั้น`

Hero visual:

- ภาพการ์ตูน Ending 4 ช่องเต็มหน้า 5:7 เป็นพระเอก
- Ending `.md` card ซ้อนเล็ก ๆ
- Animal cast / notebook props เป็น secondary
- ห้ามทำ hero เป็น dashboard

---

# 8. Emotional Story — คนเดียว → ไปด้วยกัน

## Heading

**คนเดียวก็ทำได้\nแต่บางวันมีตี้แล้วไปง่ายกว่า**

## Copy

`เรื่องยากไม่ใช่การรู้ว่าควรทำอะไร เรามักรู้อยู่แล้วว่าควรวิ่ง ควรอ่าน ควรทำงาน หรือควรดูแลตัวเอง`

`เรื่องยากคือวันที่เหนื่อย วันที่ยุ่ง หรือวันที่ “พรุ่งนี้ค่อยทำ” ฟังดูสมเหตุสมผลเกินไป`

`XTY ไม่ได้ให้เพื่อนมาคุมเรา แค่ทำให้มีคนที่กำลังเดินเรื่องเดียวกันอยู่ข้าง ๆ`

## Scroll visual storyboard

### Frame 1 — Alone
แมวส้มตัวเดียว เริ่มด้วยพลังดี ๆ มี checklist

### Frame 2 — Heavy day
วันต่อมาแมวส้มนั่งเหนื่อย checklist ยังว่าง ไม่ทำให้ดูเศร้าหนัก แค่รู้สึกว่าไปคนเดียวมันใช้แรงใจ

### Frame 3 — Someone joins
เพื่อน 1–2 ตัวเข้ามา ไม่ลาก ไม่คุม แค่เดินข้าง ๆ

### Frame 4 — Full party
ครบ 5 ตัว เดิน/วิ่ง/อ่าน/ทำภารกิจคนละจังหวะ แต่ไปทางเดียวกัน สนุกและมีชีวิต

Line ปิด:

**พอมีคนเดินด้วย เรื่องเดิมอาจยังยากเท่าเดิม\nแต่มันไม่รู้สึกว่าเราต้องแบกมันคนเดียว**

---

# 9. The 3-Step Ending Flow — ต้องเป็น highlight หลัก

ใช้คำจำง่ายแบบครัว/ซอส:

## 1. รับซอส

**จบ Quest → ดาวน์โหลด Ending `.md`**

Copy:

`XTY รวบรวม Cast, Timeline, Commit, Message, React, Stats และ prompt สำหรับฉากจบไว้ให้แล้ว`

Visual proof:
- screenshot Party Complete
- ปุ่ม `ดาวน์โหลด Ending .md`

## 2. สั่งปรุง

**แนบไฟล์ให้ AI → พิมพ์ prompt เดียว**

Prompt ที่โชว์จริง:

`สร้างภาพจากฉากจบ XTY นี้`

หรือ

`ทำการ์ตูน 4 ช่องจากไฟล์นี้`

Copy:

`ไม่ต้องเล่าใหม่ว่าใครอยู่ในตี้ ทำอะไรกัน หรือเกิดอะไรขึ้นตลอด 7 วัน — ซอสอยู่ในไฟล์แล้ว`

Visual proof:
- screenshot ChatGPT
- เห็นไฟล์ `.md`
- เห็น prompt สั้น ๆ
- เห็น AI สร้างภาพตอบ

## 3. ดื่มด่ำ

**ได้เรื่องของตี้กลับมาเป็นภาพ**

Copy:

`เก็บไว้ ส่งให้เพื่อนในตี้ ตั้งเป็นความทรงจำ หรือโพสต์ลง social ก็ได้`

Visual proof:
- Ending comic 5:7 เต็มภาพ

Flow graphic:

**รับซอส → สั่งปรุง → ดื่มด่ำ**

ควรอ่านได้แม้ไม่อ่าน paragraph

---

# 10. Emotional Line — ต้องมีบนหน้า

ใช้ copy นี้หรือเกลาให้ลื่นขึ้นโดยรักษาความหมาย:

**สำหรับคนอื่น มันอาจดูเป็นแค่การ์ตูนสัตว์น่ารัก 4 ช่อง**

**แต่คนในตี้จะเห็นวันที่เกือบไม่ได้ทำ\nข้อความที่ช่วยให้กลับมา\nมุกที่มีแค่พวกเขาเข้าใจ\nและ 7 วันที่เคยเดินไปด้วยกันอยู่ในภาพเดียวกัน**

ปิดว่า:

**ภาพเดียวกัน แต่ไม่ใช่ความทรงจำเดียวกันสำหรับทุกคน**

---

# 11. Visual Canon — ห้ามหลุด

## Golden ratio ของ XTY

Ending artwork และ gallery card ใช้ **5:7** เป็นสัดส่วน canon

นี่คือสัดส่วนเดียวกับการ์ด standard / FIRST HAND ที่ใช้เป็น visual grammar ของระบบ

## Ending visual canon

- 1 หน้าสมุด
- การ์ตูน 4 ช่อง
- colored pencil / crayon / hand-drawn notebook illustration
- warm cream + leafy green เป็นแกน
- texture กระดาษจริง
- เส้นสมุด ดินสอ เทป กระดาษโน้ต สติกเกอร์ รอยวาดมือ
- cute premium
- ตัวละคร Animal Avatar ต้อง recognizable
- ความสำเร็จแบบอบอุ่น ไม่ใช่แข่งขัน
- ไม่มี casino / loot-box visual
- ไม่มี dashboard หนัก ๆ
- ข้อความในภาพสั้น อ่านง่าย เหมือน note จริง

## Character tone

ให้สัตว์ดูมี personality และ movement มากขึ้น:

- ไม่ยืนเรียงเหมือน icon
- มี body language
- ช่วยกันถือของ / วิ่ง / อ่าน / แบกกระเป๋า / ฉลอง
- แต่ละตัวมีบทบาทเล็ก ๆ ที่ต่างกัน

---

# 12. Existing Proof Assets — 3 ภาพจริง

ใช้ภาพ 3 ภาพที่ผู้ใช้ให้ ChatGPT Work เป็น proof หลัก

ถ้าต้อง materialize/copy เข้ repo ให้ใช้ชื่อ canonical:

1. `/xty/assets/ending/ending-step-1-complete.jpg`
   - Party Complete UI
   - เห็นปุ่มดาวน์โหลด Ending `.md`

2. `/xty/assets/ending/ending-step-2-ai.jpg`
   - ChatGPT conversation
   - แนบ Ending `.md`
   - prompt สั้น
   - เห็นผลลัพธ์ image generation

3. `/xty/assets/ending/ending-step-3-comic.jpg` หรือ `.webp`
   - การ์ตูน 4 ช่องตัวอย่าง “กินยาทุกวัน / ดูแลตัวเอง”
   - ใช้เป็น Hero proof และ Step 3

อย่า crop จน context หาย

เวลาแสดง screenshot ให้ mount อยู่ใน notebook / paper frame ที่เข้ากับเว็บ ไม่โยน screenshot ดิบ ๆ แบบ documentation

---

# 13. ChatGPT Work — ต้องสร้างภาพเพิ่มด้วย

Source นี้ไม่ได้ให้ Work แค่แก้ HTML/CSS

**ให้ ChatGPT Work ใช้ image generation สร้างภาพประกอบที่ยังขาด** และนำไปใช้ในหน้าเว็บจริง

## Required generated illustration 1 — Alone → Party

สร้างภาพ/ชุดภาพสำหรับ scroll story:

- แมวส้มเริ่มคนเดียว
- วันที่เหนื่อยและเริ่มท้อ
- เพื่อนเข้ามาทีละตัว
- จบด้วย Animal Party 5 ตัวเดินไปด้วยกันอย่างสนุก

Style ต้องตรง XTY notebook / warm hand-drawn canon

## Required generated gallery examples

สร้าง Ending mockups อย่างน้อย 4–6 ใบ สัดส่วน 5:7:

### A. Running Party
สัตว์ 3–5 ตัวซ้อมวิ่งกันคนละ pace มีรองเท้า เส้นทาง tick marks และ Finish note

### B. Study / Exam Party
โต๊ะอ่านหนังสือ สมุด ข้อสอบ กาแฟ ดึก ๆ แต่โทนอุ่น มี moment ช่วยกันผ่านวันยาก

### C. Book Club
หนังสือหลายเล่ม sticky notes quote doodles และ conversation moment

### D. Side Project
laptop/sketch/notebook/build checklist เห็น progress จาก idea → draft → ship

### E. Volunteer Party
กิจกรรมช่วยชุมชน แพ็กของ ปลูกต้นไม้ หรือทำภารกิจร่วมกัน

### F. Wellness Party
เน้นการดูแลตัวเอง / routines / movement / sleep / meals แบบไม่ body-shame และไม่ใช้ before-after

แต่ละภาพต้องรู้สึกว่า “นี่คือ Ending ของตี้หนึ่งจริง ๆ” ไม่ใช่ stock illustration

---

# 14. Gallery Section

## Heading

**เรื่องของแต่ละตี้ไม่เหมือนกัน\nฉากจบก็ไม่ควรเหมือนกัน**

## Lead

`วิ่งด้วยกัน 7 วัน อ่านสอบด้วยกัน ทำเว็บให้เสร็จ หรือแค่คอยเตือนกันให้ดูแลตัวเอง — XTY ใช้โครงเดียวกัน แต่เรื่องที่เกิดขึ้นเป็นของพวกคุณเอง`

Gallery caption สั้นมาก เช่น:

- `ตี้ซ้อม 10K · 7 วัน`
- `อ่านสอบก่อนวันจริง`
- `Book Club: เล่มที่ดองมานาน`
- `Ship ก่อนวันศุกร์`
- `ช่วยกันคนละไม้ละมือ`
- `กลับมาดูแลตัวเอง`

บน mobile ทำ horizontal scroll หรือ 2-column ที่เห็น art เป็นพระเอก

---

# 15. PET / NPC Storytelling

ด้าน narrative สามารถเล่า PET/NPC ว่าเป็น “เพื่อนร่วมทางที่เห็นเรื่องทั้งหมดเกิดขึ้น” และ Ending art อาจให้ PET มีบทเหมือนผู้จดบันทึก / narrator ในสมุด

แต่ copy factual ต้องไม่หลอกว่า PET เป็นคน generate `.md` ถ้า implementation ยังไม่ใช่แบบนั้น

ใช้ wording เช่น:

`PET เดินมากับตี้ตลอดทาง และเมื่อเรื่องจบ ทุก Commit กับเหตุการณ์ที่ถูกเก็บไว้ก็กลายเป็นวัตถุดิบของหน้าสุดท้าย`

ไม่ใช้:

`PET ใช้ AI เขียนเรื่องทั้งหมดให้คุณ` ถ้ายังไม่จริง

---

# 16. Secret Card Reward

Ending ไม่ได้มีแค่ภาพ

## Kicker

`AND ONE MORE THING...`

## Heading

**ก่อนแยกย้าย\nทุกคนยังได้เปิดการ์ดใหม่อีก 1 ใบ**

## Copy

`การ์ดที่ได้เป็นของแต่ละคน ไม่จำเป็นต้องเหมือนกัน`

จากนั้นหยุด

Microcopy:

**มันเอาไปทำอะไรได้?\nเก็บไว้ก่อน แล้วเล่นต่อจะรู้เอง**

ห้ามทำตาราง rarity / probability

ห้ามเฉลย mechanics ที่ผู้ใช้ยังไม่อยากเปิด

---

# 17. Future — บอกสิ่งที่อยากไปให้ถึงได้

มี section เล็ก ๆ ได้ เช่น:

## Heading

**วันนี้คุณเอาซอสไปปรุงเอง\nวันหนึ่งเราอยากให้มันเกิดตรงนี้เลย**

Copy:

`เราอยากให้วันจบ Quest ทุกตี้เปิด XTY แล้วเห็นหน้าสมุดของตัวเองรออยู่ทันที`

`แต่เรายังไม่อยากเอาต้นทุนการสร้างภาพไปบังคับให้ XTY ต้องปิดกั้นคนเล่นฟรี วันนี้เลยเริ่มจากสิ่งที่เราทำให้ทุกคนได้แน่นอนก่อน: Source ที่ครบ พร้อม และเป็นของคุณ`

`ถ้าวันหนึ่งโมเดลนี้ยั่งยืนพอ เราอยากลดขั้นตอนให้เหลือปุ่มเดียว โดยยังรักษาความเป็นเจ้าของเรื่องราวของผู้เล่นไว้เหมือนเดิม`

ห้ามระบุวันเปิด feature ถ้ายังไม่มี

---

# 18. SEO ของ Ending — ทำหลังฉาก ไม่ทำหน้าให้รก

## URL

`https://www.myclover.com/xty/about/ending/`

## Title

`ฉากจบ XTY — เปลี่ยน 7 วันของตี้เป็นการ์ตูน 4 ช่องด้วย AI`

## Meta Description

`จบ Quest แล้วรับ Ending .md ที่เก็บเรื่องจริงของตี้ตลอด 7 วัน จาก Commit, Message, React และเหตุการณ์ระหว่างทาง แล้วใช้ AI สร้างการ์ตูน 4 ช่องเป็นความทรงจำของกลุ่ม`

Search intent ที่แทรกอย่างเป็นธรรมชาติ:

- การ์ตูน 4 ช่อง AI
- AI สร้างภาพจากเรื่องราว
- เก็บความทรงจำกับเพื่อน
- challenge 7 วัน
- accountability group
- group memory
- XTY ending

ไม่ต้องทำ visible keyword block

Structured data:

- `WebPage`
- `HowTo` สำหรับ 3 steps

HowTo:

1. รับซอส — ดาวน์โหลด Ending `.md`
2. สั่งปรุง — แนบให้ AI และใช้ prompt เดียว
3. ดื่มด่ำ — รับภาพ 4 ช่องและเก็บ/แชร์

เพิ่ม route ลง sitemap

---

# 19. Navigation Rules

## About nav

ABOUT / WHY / HOW / WHAT

`IDEAS` ไม่จำเป็นต้องเป็น tab ใหญ่ อาจอยู่ท้าย WHAT หรือ footer แบบลิงก์รอง

`ENDING` เป็น feature deep-dive link ไม่ต้องแย่ง navigation หลัก

## NEXT card

ทุก deep page มี NEXT card เดียวเป็นพระเอก:

- WHY → HOW
- HOW → WHAT
- WHAT → IDEAS
- IDEAS → PLAY

Back link มีได้ แต่ visual priority ต่ำกว่า NEXT

## About itself

About อ่านจบแล้ว CTA ไป PLAY ได้ทันที

คนไม่ต้องผ่าน WHY/HOW/WHAT ก่อนเล่น

---

# 20. Copy Tone

ภาษาไทยเป็นหลัก

หลักการ:

- สั้น
- เป็นมนุษย์
- ไม่ corporate
- ไม่อธิบายระบบเหมือน manual
- ให้ภาพทำงานแทน paragraph
- ไม่ hype AI แบบ “ปฏิวัติอนาคต”
- ไม่ใช้ศัพท์เทคนิคถ้าไม่จำเป็น
- คำว่า Source / ซอส ใช้ได้เมื่อช่วยอธิบาย Ending
- Commit เป็นศัพท์เกมหลัก

ตัวอย่าง tone ที่ถูก:

`พอมีคนเดินด้วย เรื่องเดิมอาจยังยากเท่าเดิม แต่มันไม่รู้สึกว่าเราต้องแบกมันคนเดียว`

`ไม่ต้องเล่า 7 วันใหม่ ซอสอยู่ในไฟล์แล้ว`

`สำหรับคนอื่นมันคือการ์ตูน 4 ช่อง สำหรับพวกคุณมันคืออาทิตย์นั้น`

Tone ที่ไม่เอา:

`AI-powered revolutionary accountability ecosystem`

---

# 21. Mobile-first Rules

- ภาพ 5:7 ต้องเห็นเต็มและสวยบนมือถือ
- text block ไม่ยาวจนกลายเป็น wall of text
- 3-step proof ควรเป็น 1 column บน mobile
- screenshot frame อ่านรายละเอียดหลักได้
- gallery swipe ได้ลื่น
- ไม่ใช้ auto-scroll
- ไม่ snap บังคับ scroll
- ไม่มี parallax หนักที่ทำให้ iPhone กระตุก
- ใช้ lazy loading กับ gallery แต่ Hero proof ต้องโหลดเร็ว

---

# 22. Performance

- generated art ใช้ WebP/AVIF ถ้าเหมาะ
- OG/social proof อาจเก็บ JPG
- กำหนด width/height หรือ aspect-ratio ป้องกัน layout shift
- ไม่โหลด gallery ทุกใบ full-res ตั้งแต่แรก
- no autoplay video
- no heavy JS ถ้า CSS ทำได้

---

# 23. ห้ามทำ

- ห้ามใส่ SEO essay บน `/xty/` หรือ `/xty/public/`
- ห้ามทำ About เป็นหน้าเอกสารยาวจนต้องอ่านทุกอย่างก่อนเริ่มเล่น
- ห้ามแตก navigation เป็น maze
- ห้ามทำ Ending เป็น technical documentation ของ `.md`
- ห้าม claim ว่า AI สร้าง Ending `.md`
- ห้าม claim ว่า XTY สร้างภาพในแอปวันนี้ ถ้ายังไม่ได้ทำ
- ห้ามซ่อนว่าภาพ AI มีต้นทุน — พูดตรง ๆ แบบเป็น product philosophy ได้
- ห้ามทำ card reward เหมือนพนัน/loot box
- ห้ามเฉลยการ์ดว่าทำอะไรได้ทั้งหมด
- ห้ามทำ wellness gallery ด้วย body transformation / before-after
- ห้ามสร้างตัวละครใหม่จนหลุดจาก XTY visual universe
- ห้ามแก้ play mechanics โดยไม่จำเป็นกับงานนี้

---

# 24. Definition of Done

งานเสร็จเมื่อ:

## ABOUT
- อ่านหน้าเดียวแล้วเข้าใจ XTY และอยากลองได้
- ending reward ถูกเล่าเป็น feature สำคัญ
- ไม่มี SEO clutter

## PATH
- ABOUT → WHY → HOW → WHAT → IDEAS → PLAY เดินเป็นเส้นตรง
- NEXT ของทุกหน้าชัด

## ENDING
- `/xty/about/ending/` มี Hero + emotional story + 3-step proof + cost/free philosophy + gallery + card teaser + future note + CTA
- 3 ภาพ proof ถูกใช้จริง
- มีภาพประกอบใหม่ที่ Work สร้างเพิ่ม

## VISUAL
- Ending artwork ใช้ 5:7
- notebook / colored pencil canon ไม่หลุด
- mobile สวยและลื่น

## SEO
- metadata/schema/sitemap ครบ
- long-tail อยู่ใน IDEAS / Ending ตามบริบท
- play surfaces สะอาด

## PRODUCT TRUTH
- อธิบายถูกว่า XTY ประกอบ Ending Source จากข้อมูลจริงโดยไม่ต้อง AI call ในขั้นนั้น
- AI ถูกใช้ตอนตีความและสร้างภาพ
- ไม่พูดเกิน implementation

## FINAL FEELING

คนเลื่อนจบแล้วควรคิดว่า:

**“กูอยากรู้ว่าถ้าตั้งตี้กับเพื่อน 7 วัน ฉากจบของพวกกูจะออกมาเป็นอะไร”**

และคนที่อ่าน deep path จนถึง IDEAS ควรจบด้วย:

**“โอเค เลือกเรื่องได้แล้ว ไปตั้งตี้เลย”**

---

# 25. Final Instruction to ChatGPT Work

ก่อนแก้ ให้สำรวจไฟล์จริงของ XTY และ reuse component / CSS / asset ที่มีอยู่แล้วให้มากที่สุด

จากนั้น:

1. ปรับ About journey ตาม Source นี้
2. สร้าง `/xty/about/ending/`
3. สร้างภาพประกอบใหม่ด้วย image generation ตาม visual canon
4. นำภาพไปใช้ในหน้าเว็บจริง ไม่สร้างทิ้งไว้เฉย ๆ
5. ใช้ proof screenshots 3 ภาพเป็นหลักฐานว่า flow นี้ทำได้จริง
6. รักษาหน้า PLAY ให้โล่ง
7. ทำ internal navigation เป็นเส้นตรง
8. ทำ SEO หลังฉากและในหน้าที่เหมาะสม
9. ตรวจ mobile layout / loading / spacing
10. อย่าเปลี่ยน mechanics ของ XTY ถ้าไม่จำเป็น

**เป้าหมายไม่ใช่สร้างหน้าอธิบาย `.md`**

**เป้าหมายคือสร้าง journey ที่ทำให้คนอยากเริ่มเล่น เพราะรู้ว่าชีวิตจริง 7 วันที่กำลังจะเกิดขึ้นมี “ตอนจบที่เอากลับบ้านได้” รออยู่**
