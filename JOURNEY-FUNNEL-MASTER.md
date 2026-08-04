# MYCLOVER JOURNEY + FUNNEL MASTER

**Project:** myClover First Run, Classroom, CORE7, AWAKEN, Secret Ending, Guild, Smart Resume และระบบรายได้

**Version:** 2026-08-05 · Master Draft 1

**Status:** ล็อกโครงประสบการณ์และตำแหน่ง CTA ได้แล้ว แต่ Copy, ราคา, Session Operation และ Event Tracking ยังต้องทดสอบกับผู้ใช้จริงก่อนถือเป็น Final

เอกสารนี้ต่อจาก `forge/FORGE-REWORK-MASTER.md` และออกแบบทางเดินตั้งแต่คนเปิดประตูครั้งแรก ไปจนจบ Main Quest, พบฉากจบลับ, เปิด Free Roam, เข้าชุมชน และไปสู่สิ่งที่ซื้อได้โดยไม่สร้าง Paywall ในเส้นการเรียนฟรี

---

# 1. คำตอบหลัก

## 1.1 ระบบไม่มี Paywall ไม่ใช่ปัญหา

myClover ไม่ควรขาย “สิทธิ์ในการรู้” หรือ “สิทธิ์ในการเริ่ม”

สิ่งหลักต่อไปนี้ควรใช้ฟรีต่อไป:

- การ์ตูน WHY AI? 7 ตอน
- Quick Walkthrough
- CORE7 กับบอทและระบบเล่นพื้นฐาน
- ห้องเรียน AI 6 บท
- AWAKEN
- Player Card
- Guild Community ระดับพื้นฐาน
- ความรู้พื้นฐานใน Club

สิ่งที่ขายควรเป็นสิ่งที่ช่วยให้คน:

1. ทำเร็วขึ้น
2. ทำกับงานจริงของตัวเอง
3. มีคนช่วยดูและแก้
4. ได้ของกายภาพหรืออุปกรณ์จริง
5. ได้ระบบที่ติดตั้งให้พร้อมใช้
6. ได้การดูแลต่อเนื่อง
7. ได้ Packaging ที่ทำให้ของเดิมส่งต่อหรือขายได้ง่ายขึ้น

หลักคือ:

> ความรู้และ Core Mechanic แจกฟรีได้
>
> สิ่งที่ขายคือความเร็ว ความสะดวก งานออกแบบ การลงมือร่วมกัน การดูแล และของจริงที่จับต้องได้

## 1.2 Main Quest ต้องเป็นเส้นตรง แต่ทุกห้องยังเปิดจาก Direct Link ได้

คนที่เข้าทางประตูบ้านต้องถูกพาเป็นเส้นตรงก่อนเปิด Free Roam

แต่คนที่ได้รับลิงก์ CORE7, Smart Resume, Club หรือ Kickstarter จากเพื่อน ต้องเข้าเนื้อหานั้นได้ทันที ไม่ถูกบังคับย้อนกลับไปอ่านการ์ตูนก่อน

จึงต้องแยก 2 Context:

### HOUSE JOURNEY

ผู้ใช้เข้าจากหน้าแรกและกำลังเล่น Tutorial ของบ้าน

ระบบพาเป็นลำดับและซ่อน Hall ก่อนถึงเวลา

### DIRECT ROOM

ผู้ใช้เข้าจากลิงก์เฉพาะ เช่น `/core7/`, `/resume/`, `/club/`, `/kickstarter/th/`

เข้าใช้งานห้องนั้นได้เลย แล้วค่อยมี CTA รองว่า:

> ดูว่าเราสร้างสิ่งนี้ขึ้นมาอย่างไร → เริ่ม Journey

ห้ามทำให้ Direct Link เสียประโยชน์ เพราะ CORE7 ต้องส่งให้เพื่อนเล่นได้ และ Smart Resume ต้องส่งให้คนดูผลงานได้โดยตรง

---

# 2. เส้นทาง Main Quest ฉบับเต็ม

```text
ประตูหน้าแรก
↓
บทนำ 14 วัน / 19 ปี
↓
การ์ตูน 7 ตอน
↓
SAVE POINT: BLACKSMITH
↓
Quick Walkthrough
↓
Journey Tutorial CORE7 20–30 วินาที
↓
Starter Hand 2–2–2–1
↓
CORE7 Match กับ EASY Bot
↓
รับ FIRST HAND ใบแรก
↓
Proof Reveal: Idea → System → Package
↓
Optional: Kickstarter Case Study
↓
Optional: Add LINE เพื่อเก็บทางกลับบ้าน
↓
LV.1–LV.6 แบบเส้นตรง
↓
BOSS STAGE: AWAKEN
├─ Main Route → Player Card → Free Roam
└─ Secret Route → สมุดเก่า → RESTORE → เพื่อนเล่น → PLATINUM → Player Card / Guild
↓
FREE ROAM
├─ 4 Paths
├─ Smart Resume
├─ CORE7 ทุกโหมด
├─ Collection
├─ myClover Club
├─ Guild X
└─ Side Quest / Case Study / สินค้า / บริการ
```

---

# 3. หลังการ์ตูน: CORE7 ต้องทำหน้าที่อะไร

CORE7 ไม่ต้องทำให้ทุกคนกลายเป็นคนรักเกม

หน้าที่ใน Journey คือทำลายข้อสงสัยว่า:

> คนที่กำลังจะสอนเรา สร้างของจริงที่ใช้ได้จริงหรือไม่

เป้าหมายความรู้สึกหลัง Match แรกคือ:

- เล่นง่ายกว่าที่คิด
- มันไม่ใช่เป่ายิ้งฉุบธรรมดา
- ของนี้เล่นบนมือถือได้จริง
- ไม่ต้องสมัคร
- ระบบจำผลและคืนรางวัลให้เรา
- คนคนเดียวกับ AI สามารถสร้างระบบระดับนี้ได้
- บทเรียนที่กำลังจะเริ่มมีหลักฐานอยู่ตรงหน้าแล้ว

## 3.1 ไม่ส่งเข้าบอททันที

ถ้าส่งเข้า Match ทันที คนที่ยังไม่รู้กฎจะกดมั่วและคิดว่าเกมไม่ชัด

แต่ Tutorial ปัจจุบันละเอียดเกินไปสำหรับ Journey เพราะมีเรื่องตำแหน่งซ้าย–ขวาและ Server ซึ่งยังไม่จำเป็น

ให้สร้าง Journey Tutorial ใหม่หรือ Mode พิเศษใน Tutorial เดิม มีเพียง 3 การทดลอง:

### STEP 1 — วงสี

ข้อความ:

> ทั้งคู่เลือกการ์ดลับ แล้วเปิดพร้อมกัน
>
> ลองเลือก RED

ผู้เล่นกด RED แล้วเจอ GREEN

ผล:

> RED ชนะ GREEN

### STEP 2 — ผู้แพ้เสียมากกว่า

ข้อความ:

> ผู้ชนะเสียเฉพาะใบที่เล่น
>
> ผู้แพ้เสียใบที่เล่น และต้องทิ้งเพิ่มอีก 1 ใบ

นี่คือจุดที่ทำให้คนรู้ว่าเกมมีทรัพยากร มีการเปิดข้อมูล และมีต้นทุนจากการแพ้

### STEP 3 — SILVER

ข้อความ:

> SILVER เสมอทุกสี ใช้ซื้อเวลาได้
>
> แต่ถ้าเหลือเป็นใบสุดท้าย มันแพ้สีจริง

จบด้วย:

> ชนะครบ 3 Rounds ก่อน หรือทำให้อีกฝ่ายหมดมือ

CTA:

> พร้อมแล้ว — เริ่ม Match แรก

## 3.2 ใช้ Starter Hand ไม่ให้คนออกแบบมือจากศูนย์

มือแรกใช้:

```text
RED 2
GREEN 2
BLUE 2
SILVER 1
```

หน้าเลือกมือแสดงว่า:

> นี่คือมือเริ่มต้นที่สมดุล
>
> ใช้ได้เลย หรือปรับเองก่อนเล่น

CTA หลัก:

> ใช้มือนี้

CTA รอง:

> ปรับมือเอง

การออกแบบมือมีความหมายหลังเล่นจบอย่างน้อย 1 Match แล้ว ไม่ควรทำให้ First-Time Player ต้องแก้โจทย์ที่ยังไม่มีข้อมูล

---

# 4. หลัง CORE7 Match แรก

Result Page ใน Journey Mode ต้องต่างจาก Result ปกติ

ผลแพ้หรือชนะไม่สำคัญ เพราะ Quest คือเล่นให้จบ

## 4.1 จังหวะที่ 1 — Match Complete

หัวข้อ:

> PROOF COMPLETE

ข้อความ:

> คุณผ่านหลักฐานชิ้นแรกแล้ว
>
> เกมนี้ไม่ได้ถามว่าคุณเก่งแค่ไหน แค่ให้คุณลอง ตัดสินใจ แล้วเห็นผลของสิ่งที่เลือก

## 4.2 จังหวะที่ 2 — FIRST HAND ใบแรก

Match แรกไม่ควรสุ่มรางวัลแบบไร้ความหมาย

ให้เลือกการ์ดจาก Pattern ของการเล่น:

- RED มากที่สุด → Courage
- GREEN มากที่สุด → Balance
- BLUE มากที่สุด → Clarity
- SILVER เป็น Turning Point → Build
- ถ้าสูสีมาก → การ์ดที่ตรงกับการตัดสินใจรอบสุดท้าย

ข้อความ:

> การ์ดนี้ไม่ได้เพิ่มพลังให้คุณ
>
> มันบันทึกว่าคุณเลือกเล่น Match แรกอย่างไร

ผลที่ต้องการคือคนรู้สึกว่า “ระบบเห็นการกระทำของเรา และคืนบางอย่างกลับมา”

## 4.3 จังหวะที่ 3 — Proof Reveal

หัวข้อ:

> สิ่งที่คุณเพิ่งเล่น เริ่มจากกติกา 4 สี และกระดาษ 7 ใบ

แสดง Flow:

```text
IDEA
กติกา 4 สี
↓
SOURCE
กฎ โลก และภาษาของเกม
↓
SYSTEM
Resolve, Match, Bot, Save และ Result
↓
OUTPUT
เว็บ การ์ด คู่มือ ภาพ และวิดีโอ
↓
PACKAGE
FIRST HAND และหน้า Campaign
↓
SHARE
คนอื่นเปิดเล่นได้ทันที
```

ข้อความปิด:

> ทั้งหมดนี้คือวงจรเดียวกับ 6 บทที่คุณกำลังจะเรียน
>
> บทที่ 1 จะเริ่มจากของที่เล็กกว่านี้มาก

CTA หลัก:

> เริ่ม LV.1 — สร้าง Item แรกของคุณ

## 4.4 Kickstarter เป็น Side Quest ไม่ใช่ประตูบังคับ

Preview หลัง Proof Reveal:

> SIDE QUEST · จากเกมฟรีสู่ผลิตภัณฑ์
>
> CORE7 เล่นได้ด้วยเศษกระดาษที่เขียนชื่อสี
>
> เราลองให้ AI ช่วยแตกไอเดียเดียวกันเป็นแบรนด์ กล่อง การ์ด ภาพสินค้า และหน้า Campaign เต็มรูปแบบ

CTA รอง:

> ดู Case Study 3 นาที

CTA ข้าม:

> ข้ามไปเริ่มบทที่ 1

ห้ามใช้ประโยคหลักว่า “เอาของแจกฟรีมายัดแพ็กเกจขาย” บนหน้าเว็บ เพราะจะทำให้ Packaging ดูไม่มีคุณค่า

กรอบที่ควรใช้:

> กติกายังคงฟรี
>
> สิ่งที่เพิ่มมูลค่าคือความสะดวก งานออกแบบ ความหมาย ความเป็นเจ้าของ และประสบการณ์ที่อยากหยิบออกมาใช้กับคนอื่น

Kickstarter ควรถูกเรียกกลับมาอีกครั้งใน:

- LV.4 SOURCE — ต้นฉบับเดียวถูกแตกเป็นอะไรบ้าง
- LV.5 MULTIPLY — AI Party ช่วยทำ Campaign อย่างไร
- LV.6 SHARE — Sales Page ที่รันได้จริงหน้าตาเป็นอย่างไร

---

# 5. LINE: จับ Lead เมื่อไร

ห้ามขอให้ Add LINE ก่อนคนได้รับคุณค่า

ตำแหน่งแรกที่เหมาะคือหลัง CORE7 Match แรกและรับการ์ดแล้ว

หัวข้อ:

> เก็บ Save Point นี้ไว้

ข้อความ:

> บ้านจำความคืบหน้าไว้บนเครื่องนี้แล้ว
>
> แอด LINE ไว้เพื่อรับปุ่มกลับมาทำต่อ ตาราง Build Party และ Quest ใหม่ โดยไม่ต้องจำว่าครั้งก่อนเดินถึงไหน

CTA:

> Add LINE · เก็บทางกลับบ้าน

ปุ่มข้าม:

> ยังไม่ต้อง — เริ่ม LV.1 เลย

## 5.1 จุดเตือน LINE ครั้งที่ 2

ถ้าคนไม่ Add LINE หลังเกม ให้ถามอีกครั้งหลังจบ LV.1 เพราะตอนนั้นเขาสร้างของชิ้นแรกแล้ว

ข้อความ:

> คุณมี Item แรกแล้ว
>
> เก็บทางกลับมาอัปเกรดมันใน LINE ได้

หลังจากนี้ไม่ควรถามซ้ำทุกหน้า

## 5.2 LINE มีหน้าที่อะไร

LINE ไม่ใช่ห้องเรียนและไม่ใช่ Feed โฆษณา

LINE ทำหน้าที่ 4 อย่าง:

1. ส่งทางกลับไปยัง Quest ล่าสุด
2. เตือน Session รายสัปดาห์
3. ส่ง Quest ใหม่หรือ Patch Note สำคัญ
4. แจ้งเมื่อสินค้า อุปกรณ์ หรือบริการที่ตรงกับ Path ของคนนั้นเปิดจริง

ความถี่เริ่มต้น:

- 1 ข้อความหลักต่อสัปดาห์
- 1 Reminder ก่อน Session
- ข้อความ Product เฉพาะเมื่อเกี่ยวกับ Path หรือสิ่งที่ผู้ใช้แสดงความสนใจ

ห้าม Broadcast ขายทุกอย่างให้ทุกคน

---

# 6. ห้องเรียน LV.1–LV.6

ทุกบทต้องมี Item กลับบ้าน และปลดล็อกบทต่อไปจาก Action ไม่ใช่ Scroll อย่างเดียว

## LV.1 — LOGIN / FIRST COMMAND

สิ่งที่ได้:

- AI Account พร้อมใช้
- Chat แรก
- Save แรกหรือ Context แรก

Completion:

- กด Copy Prompt แล้ว
- หรือกดยืนยันว่าได้ส่งคำสั่งแรก
- หรือบันทึกผลลัพธ์สั้น ๆ ในหน้า

CTA หลังจบ:

> LV.2 — ทำให้ความคิดมองเห็นได้

CTA รอง:

> เข้า Guild Campfire สัปดาห์นี้

นี่เป็นจุดแรกที่แนะนำ Discord แบบ Soft Invite ได้ เพราะคนมีของบางอย่างมาคุยแล้ว

## LV.2 — CREATE / IMAGE

สิ่งที่ได้:

- ภาพ Version แรก
- ความเข้าใจว่า Output ที่มองเห็นแก้ไขได้ง่ายกว่าความคิดลอย ๆ

Completion:

- Download ภาพ
- หรือกดยืนยันว่าได้สร้างภาพ

Side Quest ที่เปิด:

> ดู Before/After ของ Artwork ใน CORE7

## LV.3 — APPLY / CLIP

สิ่งที่ได้:

- Script หรือ Clip ที่ใช้กับงานจริง
- Feedback จากข้อจำกัดจริง เช่น เวลา กล้อง สถานที่ คนดู

Completion:

- บันทึก Script
- หรือกดยืนยันว่าได้ลองใช้กับงานจริง

Side Quest ที่เปิด:

> เปลี่ยนภาพหรือเรื่องของคุณให้เป็นคลิป 15 วินาที

## LV.4 — SOURCE

สิ่งที่ได้:

- Source กลาง 1 ชุด
- เข้าใจว่าความรู้ไม่ควรเริ่มใหม่ทุกครั้ง

Completion:

- สร้าง Notebook/Source
- ใส่ข้อมูลจริงอย่างน้อย 1 ชุด

นี่คือจุดขายบริการแรกที่เกี่ยวข้องโดยตรง

Paid Offer ที่เหมาะ:

### SOURCE SPRINT

สำหรับคนที่มีข้อมูลอยู่แล้วแต่กระจัดกระจาย

สิ่งที่ซื้อไม่ใช่บทเรียนเพิ่ม แต่คือ Session ที่ช่วย:

- เลือก Source
- จัดโครง
- ตัดสิ่งที่ไม่จำเป็น
- เตรียมให้แตกเป็นหลาย Output

CTA:

> อยากให้ช่วยจัด Source ของงานจริง → จอง Source Sprint

ห้ามบังคับซื้อเพื่อไป LV.5

## LV.5 — MULTIPLY / PROMPT VAULT / AI PARTY

สิ่งที่ได้:

- Prompt ที่ใช้ซ้ำได้
- AI คู่หูหรือ Party Workflow
- Output หลายแบบจาก Source เดียว

Completion:

- Save Prompt
- สร้าง AI Role อย่างน้อย 1 ตัว
- หรือแตก Source เป็น Output อย่างน้อย 2 แบบ

Paid Offer ที่เหมาะ:

### WORKFLOW BUILD

ติดตั้ง Prompt Vault, Role และ Flow ให้ทีม/ธุรกิจ

CTA เป็น Side Quest ไม่ใช่ปุ่มหลัก

## LV.6 — SHARE / FIRST WEBSITE

สิ่งที่ได้:

- หน้าเว็บแรก
- ลิงก์ที่ส่งให้คนอื่นเปิดดูได้
- Proof ที่อยู่นอกเครื่องของตัวเอง

Completion:

- บันทึกลิงก์
- หรือกดยืนยันว่าเผยแพร่แล้ว

หลัง LV.6 เปิด 3 สิ่ง:

1. BOSS STAGE: AWAKEN — Main Quest
2. SMART RESUME — Side Quest
3. LAUNCH / CAMPAIGN CASE STUDY — Side Quest

CTA หลัก:

> เข้าด่านบอส

CTA รอง:

> เปลี่ยนประสบการณ์ของคุณให้กลายเป็น Smart Resume

CTA รองอีกอัน:

> ดูว่า CORE7 ถูกแตกเป็นหน้า Campaign อย่างไร

---

# 7. Smart Resume ควรเปิดเมื่อไร

Smart Resume ไม่ควรแสดงเด่นก่อน LV.6

ก่อนหน้านั้นคนยังไม่เข้าใจว่า Resume นี้ไม่ใช่ CV Template แต่คือการเอาประสบการณ์มาจัดเป็น Source, Story, Proof และ Interface

ตำแหน่งที่เหมาะที่สุดมี 3 จุด:

## 7.1 หลัง LV.6

ข้อความ:

> คุณเพิ่งสร้างหน้าที่คนอื่นเปิดดูได้
>
> Side Quest ต่อไปคือเปลี่ยนสิ่งที่คุณเคยทำ ให้กลายเป็นหลักฐานที่คนอื่นเข้าใจได้

CTA:

> เปิด Smart Resume

## 7.2 หลังสร้าง Player Card

ข้อความ:

> การ์ดบอกว่าคุณเลือกเป็นใคร
>
> Smart Resume บอกว่าคุณเคยผ่านอะไรมา และสร้างอะไรได้จริง

CTA:

> เปลี่ยน Journey ของฉันเป็น Portfolio

## 7.3 ใน Free Roam

Smart Resume เป็นห้อง Career / Proof ไม่ใช่ห้องแรกของผู้มาใหม่

## 7.4 รายได้จาก Smart Resume

หน้า Generator หรือ Method พื้นฐานใช้ฟรีได้

สิ่งที่ขาย:

- Resume Review
- Story Architecture
- Proof Selection
- Copy Rewrite
- Visual Design
- Website Build
- Bilingual Version
- Done-with-you Interview Session

โมเดลบริการ:

```text
ฟรี: ดูตัวอย่าง + ใช้ Framework
↓
Review: ส่งของมาให้ตรวจ
↓
Build Together: สัมภาษณ์และสร้างร่วมกัน
↓
Done For You: ทำเว็บ Smart Resume เต็มระบบ
```

---

# 8. BOSS STAGE: AWAKEN

AWAKEN ปัจจุบันมีแกนที่ดีมากและควรเก็บไว้:

- อ่านอย่างเดียว
- ไม่มีเครื่องมือชิ้นที่ 7
- Reveal ว่า 6 บทคือ Workflow เดียว
- เปิด AI Party
- ให้รหัส AWAKEN / ตรา AWAKENED
- มีสมุดเก่าวางอยู่ข้างทางเป็น Secret Route

## 8.1 Main Route หลัง AWAKEN

หลัง Level Up ให้แสดง 2 ทาง ไม่บังคับ Secret Ending

CTA หลัก:

> สร้าง Player Card ของคุณ

ข้อความ:

> ตอนนี้คุณมี BLACKSMITH และ AWAKEN แล้ว
>
> เก็บสิ่งที่ผ่านมาทั้งหมดไว้บนการ์ด ก่อนบ้านจะเปิดเป็น Free Roam

CTA รองแบบเงียบ:

> ยังมีสมุดเก่าเล่มหนึ่งวางอยู่ข้างทาง

คนที่ไม่กดสมุดไป Player Card และ Free Roam ได้เลย

คนที่กดสมุดเข้าทางลับ

## 8.2 Secret Route ต้องยังเป็น Optional

ห้ามเอาฉากจบลับไปเป็นเงื่อนไขเปิด Free Roam

เหตุผล:

- มันเป็น Emotional Reward สำหรับคนที่อยากสำรวจ
- ความยาวมากกว่าเส้นหลัก
- ทำหน้าที่พูดเรื่องเพื่อน ความทรงจำ การกลับมาเล่น และสิ่งที่เคยเสียหาย
- ถ้าบังคับ มันจะกลายเป็นการบ้านและทำลายความลับ

---

# 9. สมุดเก่า → RESTORE → แล้วไปไหนต่อ

## 9.1 หน้าที่ของ RESTORE

RESTORE ไม่ควรหมายถึงเพียงซ่อมไฟล์ภาพ

ความหมายใน Journey คือ:

> เราไม่สามารถกลับไปเปลี่ยนอดีตได้
>
> แต่เราสามารถนำของที่เคยขาด เคยพัง หรือเคยถูกทิ้ง กลับมาวางในเรื่องของเราใหม่ได้

ปุ่ม RESTORE จึงเป็นการเลือกของผู้เล่น ไม่ใช่ Auto Unlock

## 9.2 หลังใช้ RESTORE

ลำดับ:

1. ซ่อมหน้าที่ขาด
2. อ่าน “เพื่อนเล่น” จนครบ
3. เปิดบทส่งท้าย
4. ได้รหัส/ตรา PLATINUM
5. ชนหมัด WELL PLAYED
6. เปิดถ้วยหรือ Reward Scene
7. จบด้วย 3 ประตู

## 9.3 3 ประตูหลังฉากจบลับ

### ประตูหลัก — FIND A PARTY

> เรื่องนี้ไม่ได้จบเพราะเราเก็บเกมเก่าไว้ได้
>
> มันจบเพราะวันนี้ยังมีคนให้เล่นด้วย

CTA:

> เข้า Guild X · หา Party

### ประตูรอง — TURN MEMORY INTO PROOF

> ทุกคนมีเรื่องที่ตัวเองมองว่าเป็นเพียงอดีต
>
> แต่เมื่อจัดมันใหม่ มันอาจกลายเป็น Item ที่ช่วยคนอื่นได้

CTA:

> เปิด Smart Resume

### ประตูออก — RETURN HOME

CTA:

> กลับบ้าน · เปิด Free Roam

ห้ามวาง Sales Offer แข็งทันทีหลัง WELL PLAYED เพราะอารมณ์ของฉากจบต้องมีพื้นที่หายใจ

การขายควรเริ่มจากประตูถัดไปตามสิ่งที่คนเลือก

---

# 10. Player Card และการเปิด Free Roam

Player Card เป็นพิธีจบ Main Tutorial

การ์ดต้องรวม:

- Class
- ชื่อ
- ประโยคของผู้เล่น
- BLACKSMITH
- AWAKEN
- รางวัล CORE7 ที่เกี่ยวข้อง
- PLATINUM ถ้าผ่านฉากจบลับ

หลัง Save Card สำเร็จ:

```text
THE HOUSE IS NOW OPEN
```

ข้อความ:

> ก่อนหน้านี้บ้านพาคุณเดินทีละห้อง
>
> ตอนนี้คุณมีของชิ้นแรก มี Save Point และรู้ว่าตัวเองกำลังทำอะไร
>
> จากนี้เลือกทางเองได้แล้ว

จากนั้นตั้ง:

```text
mc_first_run_complete = 1
mc_opened = 1
```

แล้วเปิด Hall เต็ม

---

# 11. Free Roam: Side Quest ไหนโผล่เมื่อไร

## CORE7

เปิดทุกโหมดทันทีหลัง Free Roam

Direct Link เปิดได้ตั้งแต่แรกอยู่แล้ว

CTA ใน Hall:

> เล่นอีก Match / ชวนเพื่อน

## Kickstarter / Productization Case Study

เปิดหลัง CORE7 Match แรกแล้ว แต่เป็น Optional

ใน Free Roam อยู่ในห้อง Maker / Case Study

## Smart Resume

เปิดหลัง LV.6 และเด่นหลัง Player Card

เหมาะกับคนที่ต้องการงาน ลูกค้า โอกาส หรืออธิบายตัวเองให้คนอื่นเข้าใจ

## myClover Club

ไม่ควรขาย Band, Scale หรือ RoutineX ใน Main AI Tutorial

ให้เปิดเมื่อคน:

- เลือก KEEPER
- เลือก TASTER
- เข้าห้อง Club เอง
- แสดงความสนใจเรื่องสุขภาพ กิจวัตร การกิน การนอน หรือการติดตามผล

เหตุผลคือสินค้า Health Tech ไม่ใช่อุปกรณ์จำเป็นในการเรียน AI ถ้าแทรกก่อนเวลา คนจะตีความย้อนหลังว่าห้องเรียนฟรีเป็น Funnel ขายสินค้า

## Guild X

Soft Invite หลัง LV.1

Strong Invite หลัง AWAKEN, Player Card หรือ Secret Ending

## Collection

เปิดหลังรับ FIRST HAND ใบแรก

ใช้เป็นหลักฐานว่าการกระทำในระบบมีผลต่อสิ่งที่ผู้เล่นเก็บได้

---

# 12. Guild X ต้องไม่ Redirect ทันทีอีกต่อไป

หน้า `/guild/` ปัจจุบันส่งไป Discord ทันที

ควรเปลี่ยนเป็น Guild Lobby ที่มีข้อมูลก่อนเข้า:

- Guild คืออะไร
- Session ครั้งถัดไปเมื่อไร
- ใช้เวลากี่นาที
- ต้องเตรียมอะไร
- เข้าไปแล้วควรทำอะไรเป็นอย่างแรก
- ปุ่มเข้า Discord
- ปุ่ม Add LINE เพื่อรับ Reminder
- ตารางย้อนหลังหรือ Session Notes

คนไม่ควรถูกโยนเข้า Server ที่ยังไม่รู้ว่าต้องทำอะไร

---

# 13. Session รายสัปดาห์

## ชื่อ

# GUILD CAMPFIRE — WEEKLY BUILD PARTY

## เวลาที่เสนอ

**ทุกวันพุธ เวลา 20:30–21:15 น. ประเทศไทย**

รวม **45 นาที**

เหตุผล:

- ไม่ชนคืนวันศุกร์หรือวันหยุด
- คนทำงานส่วนใหญ่กลับถึงบ้านแล้ว
- 45 นาทีสั้นพอให้มาทุกสัปดาห์
- มีเวลาพอทำของ ไม่กลายเป็นเพียงห้องคุย

ทดสอบเวลา 4 สัปดาห์แรก แล้วดู Attendance จริงก่อนล็อกถาวร

## รูปแบบ 45 นาที

```text
20:30–20:35  CHECKPOINT
ทุกคนตอบสั้น ๆ ว่าสัปดาห์นี้กำลังสร้างอะไร

20:35–20:45  SHOW ONE ITEM
หยิบผลงานจริง 1 ชิ้นมาดู ไม่บรรยายทฤษฎียาว

20:45–21:05  BUILD PARTY
ทุกคนลงมือทำ Quest เดียวกัน หรือแยกห้องตาม Class

21:05–21:12  PLAYTEST / FEEDBACK
ให้ 2–3 คนเปิดของที่ทำแล้วรับ Feedback

21:12–21:15  SAVE POINT
ทุกคนเลือก Next Action 1 ข้อและบันทึกว่าจะกลับมาทำอะไรต่อ
```

## สิ่งที่ Session ห้ามทำ

- ห้ามเสีย 1 ชั่วโมงกับการสมัคร Account
- ห้ามบรรยาย Slide ยาว
- ห้ามให้ทุกคนรอแก้ปัญหาของคนเดียว
- ห้ามขายของกลาง Session ทุกครั้ง
- ห้ามทำให้คนที่ยังไม่มีผลงานรู้สึกว่าเข้าร่วมไม่ได้

## ติดตามตารางที่ไหน

1. `/guild/` — Source of Truth สาธารณะ
2. Discord Events — กด Interested และรับ Notification
3. LINE OA — Reminder ก่อนเริ่ม 24 ชั่วโมง และ 30 นาที
4. Discord Channel `#schedule` — ตาราง 4 สัปดาห์ข้างหน้า
5. Discord Channel `#save-point` — คนโพสต์ Next Action หลัง Session

หน้า `/guild/` ต้องแสดง:

- วันและเวลาครั้งถัดไปแบบ Dynamic
- Countdown หรือ “อีกกี่วัน” ได้ แต่ไม่ใช้แรงกดดันขาย
- หัวข้อ Session
- สิ่งที่ต้องเตรียม
- ปุ่มเข้า Discord
- ปุ่ม Add to Calendar ในอนาคต

---

# 14. Lead: เราต้องหาคนแบบไหน

ห้ามยิงหา “คนที่สนใจ AI” แบบกว้าง เพราะกว้างเกินและไม่มีปัญหาชัด

แบ่ง Lead เป็น 4 กลุ่ม

## A. LEARNER — เรียนมาเยอะแต่ยังไม่มีของ

อาการ:

- ซื้อคอร์สแล้วไม่ได้สร้างอะไร
- เปิด AI แต่ไม่รู้จะเริ่มจากงานไหน
- มีเวลาไม่มาก
- ต้องการคนพาเริ่ม แต่ไม่อยากนั่งเรียนทั้งวัน

ข้อความดึงเข้า:

> ไม่ต้องลงคอร์สใหม่
>
> ลองเล่นของจริง 1 เกม แล้วสร้าง Item แรกใน 10 นาที

ปลายทาง:

- Main Journey
- LINE
- Guild Campfire
- Group Sprint ในอนาคต

## B. CREATOR / EXPERT — มีความรู้แต่ส่งต่อไม่ได้

อาการ:

- มีเอกสาร คลิป โน้ต หรือประสบการณ์เยอะ
- ทุกครั้งที่สอนต้องเริ่มใหม่
- ทีมเล่าไม่เหมือนกัน
- อยากทำคอร์ส เว็บ คู่มือ หรือระบบ

ข้อความดึงเข้า:

> ความรู้ของคุณไม่ควรหยุดอยู่ที่คุณ
>
> ดูว่ากระดาษ 1 แผ่นถูกเปลี่ยนเป็นระบบที่คนอื่นใช้ต่อได้อย่างไร

ปลายทาง:

- Forge Story
- LV.4 SOURCE
- Smart Resume
- Source Sprint
- Workflow Build
- Campaign / Website Service

## C. BUSINESS / TEAM LEAD — มีสินค้าแต่ขาดระบบสื่อสาร

อาการ:

- สินค้าดีแต่คนอธิบายไม่เหมือนกัน
- Onboarding ช้า
- ทีมต้องถามซ้ำ
- มีสื่อหลายชิ้นแต่ไม่มี Source กลาง

ข้อความดึงเข้า:

> อย่าเพิ่ม Content ก่อนรู้ว่า Source กลางของทีมคืออะไร

ปลายทาง:

- Kickstarter Case Study
- Smart Resume / Portfolio
- Source System Audit
- Done-for-you Website / Campaign

## D. PLAYER / FRIEND — อยากเล่นเกมกับคน

อาการ:

- ไม่ได้สนใจ AI เป็นหลัก
- ได้ลิงก์จากเพื่อน
- ชอบเกมหรือกิจกรรมเปิดบทสนทนา

ข้อความดึงเข้า:

> 7 ใบ ไม่มีเด็ค ไม่มีดวง
>
> เปิดแล้วเล่นได้เลย ไม่ต้องสมัคร

ปลายทาง:

- CORE7 Direct
- Invite Friend Loop
- Collection
- Physical Deck / Kickstarter ในอนาคต
- Optional “ดูว่าเกมนี้สร้างอย่างไร” เข้าสู่ Journey

---

# 15. หา Lead จากไหน โดยไม่ต้องออกกล้องหนัก

## 15.1 Screen Proof Content

ทำคลิปหน้าจอสั้น 15–30 วินาที:

- เลือกมือ 7 ใบแล้วเปิดพร้อมกัน
- หน้า Result ชี้ Turning Point
- ภาพ A4 ปี 2007 เทียบกับ Source ปี 2026
- กติกาเศษกระดาษเทียบกับหน้า Kickstarter
- Prompt 1 ชุดแตกเป็นภาพ เว็บ และ Campaign

ใช้ Voice Over หรือ Text Overlay ได้ ไม่ต้องออกกล้อง

CTA ทุกคลิปต้องให้ทำสิ่งเดียว:

> ลองเล่น Match แรก

หรือ

> อ่านเรื่อง 60 วินาทีก่อนเริ่ม

## 15.2 Playable Link

อย่าส่งลิงก์ Home กว้าง ๆ ให้ทุกคน

ส่งลิงก์ตามปัญหา:

- คนชอบเกม → `/core7/`
- คนสงสัยว่า AI สร้างของได้แค่ไหน → Journey Entry
- คนมีประสบการณ์แต่เล่าไม่เป็น → `/resume/`
- คนมีสินค้า/แบรนด์ → Kickstarter Case Study
- คนสนใจสุขภาพ → `/club/`

## 15.3 Invite Loop จาก CORE7

หลัง Match กับเพื่อนหรือบอท ให้มี Share Copy:

> กูเลือกมือ 7 ใบแล้ว ลองมาชนะกูหน่อย

หรือ

> เกมนี้ไม่ต้องสมัคร เปิดแล้วเล่นได้เลย

การชวนเล่นมีแรงเสียดทานต่ำกว่าการชวนมาเรียน AI

เมื่อเพื่อนเล่นจบ จึงค่อยมี Optional CTA:

> อยากดูไหมว่าเกมนี้ถูกสร้างจากไอเดียเล็ก ๆ อย่างไร

## 15.4 Case Study Posts

หัวข้อที่ควรทำ:

- A4 แผ่นแรกคือ Prompt รุ่นกระดาษอย่างไร
- ก่อนมี AI เราแตก Source เป็น VCD, Audio และเอกสารอย่างไร
- ทำไมของฟรียังกลายเป็น Product ได้
- เกม 4 สีถูกแตกเป็นระบบ Collection ได้อย่างไร
- Website ไม่ใช่หน้าโฆษณา แต่เป็น Starter Kit ที่ส่งให้คนทั้งโลกได้

## 15.5 Partner / Small Group Seeding

รอบแรกไม่ต้องหา 10,000 คน

หา 4 กลุ่มเล็ก กลุ่มละ 5–10 คน:

1. คนที่ไม่เคยใช้ AI จริงจัง
2. คนขายหรือทำธุรกิจเล็ก
3. คนทำ Training/Content
4. คนเล่นเกม

ดูว่าแต่ละกลุ่มหลุดตรงไหนและแคร์ Proof แบบใด

---

# 16. ขายอะไร และขายตอนไหน

## OFFER 1 — CORE7 PHYSICAL / FIRST HAND

ขายเมื่อ:

- คนเล่น CORE7 แล้ว
- ดู Kickstarter Case Study
- ต้องการของจริงไว้เล่นกับคนอื่น

ไม่ขายสิทธิ์ในการเล่น ขาย Physical Experience

## OFFER 2 — SOURCE SPRINT

ขายหลัง LV.4 หรือ Case Study สำหรับคนที่มีข้อมูลจริง

สิ่งที่ซื้อ:

- Session จัด Source
- โครงต้นฉบับกลาง
- แผนแตก Output

## OFFER 3 — WORKFLOW BUILD

ขายหลัง LV.5

สำหรับคนหรือทีมที่ต้องการ Prompt Vault, AI Roles และ Workflow ใช้จริง

## OFFER 4 — LAUNCH / WEBSITE SPRINT

ขายหลัง LV.6

สำหรับคนที่มี Source และต้องการหน้าเว็บหรือ Campaign ที่เผยแพร่ได้

## OFFER 5 — SMART RESUME SERVICE

ขายหลัง LV.6, Player Card หรือจาก Direct Resume Lead

## OFFER 6 — BAND + SCALE + ROUTINEX

ขายเฉพาะใน Club / KEEPER / TASTER Journey

ตำแหน่ง:

- หลังผู้ใช้เข้าใจว่า Data จะถูกใช้ปรับ Routine อย่างไร
- หลังมี Onboarding Plan
- ต้องมีทางเลือก “ยังไม่ซื้อ” และข้อมูลฟรีต่อได้

อย่าแทรกใน Main AI Journey

## OFFER 7 — PRIVATE BUILD / CONSULTING

สำหรับบริษัทหรือเจ้าของความรู้ที่เห็น Portfolio แล้วต้องการระบบเต็ม

ทางเข้าที่เหมาะ:

- Smart Resume
- Kickstarter Case Study
- LV.4 / LV.6
- Contact CTA ใน Career Resume

---

# 17. รายได้โดยไม่สร้าง Paywall

โมเดลรวม:

```text
FREE DISCOVERY
การ์ตูน เกม บทเรียน และ Community
↓
PAID ACCELERATION
Sprint, Review, Live Build และ Accountability
↓
PAID IMPLEMENTATION
ทำระบบ เว็บ Source และ Campaign ร่วมกันหรือทำให้
↓
PHYSICAL / HEALTH PRODUCTS
การ์ด Band Scale และอุปกรณ์ที่ใช้จริง
↓
CONTINUITY
RoutineX, Community Program, Maintenance และ Update
```

คนไม่ซื้อยังได้ผลลัพธ์จริง

คนซื้อไม่ได้ซื้อเพราะถูกล็อก แต่ซื้อเพราะเห็นแล้วว่า:

- วิธีนี้ใช้ได้
- ตนเองอยากทำเร็วขึ้น
- อยากให้คนช่วยแก้
- อยากได้ของจริง
- อยากไม่ต้องประกอบระบบเองทั้งหมด

---

# 18. Funnel Events ที่ต้อง Track

```text
journey_start
prologue_complete
forge_ep_1_complete
forge_ep_7_complete
blacksmith_unlocked
quick_walkthrough_complete
core7_journey_tutorial_start
core7_journey_tutorial_complete
core7_first_match_start
core7_first_match_complete
first_hand_first_card_received
proof_reveal_view
kickstarter_case_open
line_cta_view
line_cta_click
lesson_1_start
lesson_1_complete
lesson_2_complete
lesson_3_complete
lesson_4_complete
source_sprint_cta_click
lesson_5_complete
workflow_cta_click
lesson_6_complete
smart_resume_cta_click
awaken_enter
awaken_complete
notebook_open
restore_used
secret_ending_complete
platinum_unlocked
player_card_saved
free_roam_unlocked
guild_lobby_view
discord_join_click
weekly_session_interest
club_product_view
club_product_cta_click
```

Dashboard ต้องตอบ:

- คนเริ่มกี่คน
- ผ่านการ์ตูนกี่คน
- เล่น CORE7 จบกี่คน
- Add LINE หลังได้รับคุณค่ากี่คน
- เริ่มและจบแต่ละบทกี่คน
- Side Quest ไหนถูกเปิด
- ใครเข้าสู่ Guild
- ใครคลิก Offer หลังบทที่เกี่ยวข้อง

ห้ามวัดความสำเร็จด้วย Page View หรือ Bounce Rate อย่างเดียว

---

# 19. State ที่ต้องมี

ใช้ของเดิมให้มากที่สุดและอย่าสร้าง Store ซ้ำ

```text
mc_read
mc_forge_done
mc_titles
mc_learn
mc_learn_done
mc_ch7_done
mc_opened
CORE7 stats / collection state เดิม
```

เพิ่มเฉพาะสิ่งที่ขาด:

```text
mc_quick_walkthrough_done
mc_core7_journey_tutorial_done
mc_core7_first_match_done
mc_first_hand_reward_seen
mc_proof_reveal_seen
mc_line_cta_seen
mc_first_run_complete
mc_guild_invite_seen
```

Direct Room ต้องไม่ตั้ง `mc_first_run_complete` โดยอัตโนมัติ

---

# 20. ลำดับการลงมือทำ

## PHASE 1 — LOCK EXPERIENCE

1. ล็อก Copy การ์ตูนใหม่
2. สร้าง Prologue
3. สร้าง Quick Walkthrough
4. ล็อก Journey Tutorial CORE7
5. ล็อก Result Journey Mode

## PHASE 2 — LINEAR CLASSROOM

1. ล็อกบทตามลำดับ
2. เพิ่ม Action Completion
3. เพิ่ม Next Quest CTA
4. วาง Side Quest ตามบท

## PHASE 3 — ENDGAME

1. ปรับ AWAKEN CTA หลังจบ
2. วาง Main Route / Secret Route ให้ชัด
3. เพิ่ม 3 ประตูหลัง Secret Ending
4. ทำ Player Card เป็นพิธีเปิดโลก

## PHASE 4 — RETENTION

1. เปลี่ยน `/guild/` จาก Redirect เป็น Lobby
2. ปัก Guild Campfire ทุกวันพุธ 20:30–21:15
3. เชื่อม Discord Events และ LINE Reminder
4. ทำหน้า Session Notes

## PHASE 5 — MONETIZATION

1. Kickstarter Case Study
2. Source Sprint CTA
3. Smart Resume Service CTA
4. Launch / Workflow Service
5. Club Product Journey เมื่อสินค้าและระบบดูแลพร้อม

---

# 21. Copy กลางที่ควรใช้

## ก่อนเริ่ม Journey

> คุณไม่ต้องเชื่อว่า AI จะเปลี่ยนชีวิต
>
> แค่ดูว่าคนหนึ่งเคยสร้างระบบเดียวกันอย่างไร ตอนที่ยังไม่มี AI

## ก่อน CORE7

> ก่อนเริ่มเรียน ลองจับของจริงที่สร้างจากวิธีคิดนี้
>
> คุณไม่จำเป็นต้องชอบเกม แค่เล่นให้จบ 1 Match

## หลัง CORE7

> ไอเดียเล็กไม่ได้มีค่าน้อย
>
> มันเพียงยังไม่ได้ถูกจัดเป็น Source, System และสิ่งที่คนอื่นใช้ได้

## ก่อนบทที่ 1

> ของที่คุณเพิ่งเล่นใช้เวลาสร้างหลายขั้น
>
> ของชิ้นแรกของคุณจะเริ่มจากคำสั่งเพียง 1 ครั้ง

## หลัง LV.6

> ตอนนี้คุณไม่ได้มีแค่ความรู้
>
> คุณมีของที่คนอื่นเปิดดูได้แล้ว

## หลัง AWAKEN

> AI ไม่ได้เป็นเจ้าของ Build นี้
>
> คุณคือคนเลือก Quest จัด Party และตัดสินว่ารอบไหนพอ

## หลัง Secret Ending

> เกมที่ดีที่สุดไม่จำเป็นต้องเล่นตลอดไป
>
> แค่ยังมีคนที่เรากลับมาเล่นด้วยได้ มันก็ยังไม่หายไปไหน

---

# 22. คำตัดสินสุดท้าย

โครงปัจจุบันมีของดีมากพอแล้ว แต่ของแต่ละชิ้นทำงานแยกกัน

โครงใหม่นี้ทำให้ทุกอย่างมีหน้าที่ในเกมเดียว:

- การ์ตูนสร้างความหมาย
- CORE7 สร้างความเชื่อ
- ห้องเรียนสร้างทักษะ
- AWAKEN ทำให้เห็นระบบทั้งหมด
- Player Card เก็บตัวตนและ Proof
- Secret Ending ให้รางวัลกับการสำรวจ
- LINE พากลับบ้าน
- Guild ทำให้ไม่ต้องเดินคนเดียว
- Smart Resume เปลี่ยนประสบการณ์เป็นหลักฐาน
- Kickstarter แสดง Productization
- Club เปลี่ยนระบบดิจิทัลไปสู่กิจวัตรและอุปกรณ์จริง
- สินค้าและบริการขายความเร็ว ความช่วยเหลือ และของที่จับต้องได้ โดยไม่ยึดบทเรียนฟรีเป็นตัวประกัน

ประโยคที่ล็อกระบบทั้งหมด:

> เราไม่ได้เปิดคอร์สเพื่อขายความรู้เพิ่ม
>
> เราสร้างบ้านที่ให้คนลองของจริงฟรี แล้วขายเฉพาะสิ่งที่ช่วยให้เขานำวิธีนั้นไปใช้กับชีวิตและงานของตัวเองได้เร็วขึ้น
