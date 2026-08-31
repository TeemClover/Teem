# X-VISOR QUEST — PATCH V6
## MAKE IT SIMPLE • MAKE IT FAST • MAKE THE PLAYER FEEL RICH

ไฟล์นี้คือ **source of truth ล่าสุดสำหรับ patch `/xvisor/quest/` หลัง V5**

ไม่ต้องรื้อ PRE-SEASON / RoutineX 28 วัน / Exam Room / Certification ที่ทำดีแล้ว รอบนี้แก้ **เกมหลัง Certified X-VISOR** เป็นหลัก รวมทั้ง bug/UX/economy/endgame ที่ตรวจเจอจาก implementation ปัจจุบัน

---

# 0. เป้าหมายรอบนี้

หลังสอบเป็น X-VISOR เกมต้องไม่ให้ความรู้สึกว่า:

> “ทำงานเยอะ ตามคนเดิมซ้ำ ๆ เปลือง ⚡ แล้วได้เงินนิดเดียว”

แต่ต้องรู้สึกว่า:

> “ยิ่งเก่ง งานยิ่งง่าย ลูกค้าบางคนเดินต่อเอง งานกลุ่มช่วยหลายคนพร้อมกัน ทีมซื้อ ใช้ ขาย และดูแลเอง พอเป็น XLEAD รายได้ช่อง 2 เปิดจริง เงินรวมโตแบบเห็นชัด และเราเริ่มรวยขึ้นเพราะระบบโต ไม่ใช่เพราะกดเยอะขึ้น”

เกมนี้ต้อง **ง่ายกว่าเดิมมาก**: ลด text, ลด micro-management, เพิ่ม emoji, auto-progress และ milestone jump

---

# 1. P0 — ปุ่ม `กลับกระดาน` ต้องกดได้จริง

Production bug: modal “ความเก่งของคุณ / คนของคุณ / เมนูงาน” มีปุ่ม `กลับกระดาน` แต่กดแล้วไม่ปิดจริง

ถึง event handler ปัจจุบันจะมี fallback `closeDialog()` แล้ว ก็ถือว่า bug ยังไม่จบ

ทุก dialog ต้องมี:
- มุมขวาบน `✕`
- ด้านล่าง `← กลับกระดาน`

ทั้ง 2 ปุ่มใช้ action เดียวกัน:

```js
function returnToBoard() {
  closeDialog();
  activeDialogKey = null;
  render();
  requestAnimationFrame(() => document.querySelector('#actionBar button:not([disabled])')?.focus());
}
```

ใน event handler ต้องมี explicit branch ก่อน fallback:

```js
if (button.dataset.dialogAction === 'close') {
  event.preventDefault();
  event.stopPropagation();
  return returnToBoard();
}
```

รองรับ click, touch, Enter/Space, Escape และ mobile browser

ต้องมี browser/DOM test จริง ไม่ใช่ regex test อย่างเดียว: เปิด Skill/People/Work/Income modal → กดกลับกระดาน → `dialog.open === false` → board กดต่อได้

---

# 2. เปลี่ยนคำ `เติบโตและพาทีม`

คำนี้แปลก เอาออกทั้งหมด

เมนูใช้ Emoji + คำสั้น:
- `👥 คน`
- `📣 หาคน`
- `📚 เรียน`
- `🎓 Xcademy`
- `🏠 Open House`
- `🌱 ทีม`
- `💰 รายได้`

ลดคำแบบ MANAGEMENT, Reach → Interest, System, Autonomy และหัวข้อยาว ๆ

---

# 3. UI ต้อง CLEAN กว่านี้

Month Summary ตอนนี้มี card เล็กเยอะเกิน เหมือน dashboard หลังบ้าน

HUD หลักเก็บแค่:
- `📅 7 / 24`
- `⚡ 18 / 28`
- `👥 ลูกค้า 6 · ทีม 3`
- `💰 ฿87,420`

XV ไม่ต้องเด่นเท่าเงิน กดดูรายละเอียดจาก Income ได้

---

# 4. Highlight / Score = รายได้รวม

ค่าที่ highlight เหมือน score ให้เปลี่ยนเป็น:

> **💰 รายได้รวม ฿XXX,XXX**

หมายถึงรายได้ที่ปิดรอบสะสมทั้งหมดในเกม

Rank แยกต่างหาก เช่น `XLEAD`
Skill level ย้ายไป `📚 ความเก่ง`

---

# 5. กด `💰 รายได้รวม` ต้องดูย้อนหลังได้

เพิ่ม Income History ต่อเดือน:

```js
monthIncome: {
  retail: ...,
  directMentoring: ...,
  management: ...,
  expansion: ...,
  total: ...
}
```

ตัวอย่าง mobile:

> 📅 เดือน 9 · **฿31,500**
> ① จากลูกค้า ฿14,200
> ② จาก G1 ฿17,300

ต้อง store ตอน close month จริง ห้ามคำนวณย้อนหลังจาก state ล่าสุด

---

# 6. P0 — Economy ช่อง 1 ปัจจุบันผิดฐาน

โค้ดปัจจุบันใช้:

```js
activeRetail = personalXV * rate
```

แต่ revenue source ปัจจุบันนิยาม Channel 1 เป็น **Personal Sales / Customer Care** และตัวอย่างใช้ยอดขายเงินบาท เช่น 120,000 × 25%

ต้องแยก:
- `personalSalesBaht`
- `personalXV`

Game snapshot tier:
- 0–39,999 → 20%
- 40,000–99,999 → 23%
- 100,000+ → 25%

```js
retailIncome = personalSalesBaht * retailRate
```

XV เป็น volume แยก ไม่ใช่ฐาน cash commission

Receipt:
> ยอดสินค้า +฿7,490
> XV +7,000
> ขั้นรายได้ 20%
> รายได้เพิ่ม +฿1,498

ติด label ว่าเป็นแบบจำลองในเกมตาม source snapshot ปัจจุบัน

---

# 7. P0 — XLEAD ต้องได้รายได้ช่อง 2 จริง

ตอนนี้ `teamIncome = 0` แม้เป็น XLEAD ซึ่งทำให้การสร้างทีมไม่คุ้ม

ใช้ Channel 2 จาก source ที่มีแล้ว:

## ② Direct Mentoring Bonus

คิด **G1 ทีละคน** ตาม tier ของ G1:
- G1 Tier 20% → XLEAD 4%
- G1 Tier 23% → XLEAD 4.6%
- G1 Tier 25% → XLEAD 5%

บริษัทจ่ายเพิ่ม ไม่หัก commission ของ G1

```js
directMentoring = sum(
  g1.monthPersonalSalesBaht * mentoringRateFor(g1.retailTier)
)
```

ห้ามใช้ `sumG1Sales * 5%`

เมื่อขึ้น XLEAD ต้องมี MONEY MOMENT:

> 🌱 XLEAD
> ปลดล็อก ② รายได้จากการพัฒนา G1
> +฿XX,XXX เดือนนี้

และกดดูรายคนได้

---

# 8. X-VISOR ในทีมซื้อใช้เอง ต้องมี Volume

Business rule รอบนี้จาก Product Owner:

> X-VISOR ซื้อสินค้าใช้เองอยู่แล้ว ยอดซื้อใช้เองของ G1 เข้า personal sales/volume ของ G1 และเมื่อเราเป็น XLEAD ยอดนั้นมีส่วนใน Channel 2

Team state:

```js
member.selfUseOrders
member.customerSales
member.personalSalesBaht = selfUseOrders + customerSales
```

Active X-VISOR มี routine cycle ซื้อใช้เองอัตโนมัติได้ ไม่ใช้ Energy player

> 📦 พลอยต่อ Routine ของตัวเอง
> ยอดส่วนตัวของพลอย +฿7,490

---

# 9. คนเล่นต้องรู้สึก “รวยขึ้น”

ไม่ guarantee รายได้จริง แต่ simulation ต้องมี growth fantasy ชัด

Direction:
- Month 1: sale แรก
- Month 2–3: sale + repeat หลายรายการ, referral, candidate/G1
- Month 4–6: auto-repeat, G1 2–4, team volume, รายได้โตชัด
- Month 7–9: XLEAD reachable และ Channel 2 ต้อง jump ทันที
- Month 10–12: skilled play ควรเห็น team economy ใหญ่กว่าการทำเอง

เป้าความรู้สึก:
> เดือน 3 หลักพัน → เดือน 6 หลักหมื่น → ขึ้น XLEAD แล้วเงินกระโดด

ทั้งหมดเป็น game balance ไม่ใช่ real-world income promise

---

# 10. P0 — เลิก Follow-up คนเดิมซ้ำ ๆ

ห้ามกดติดตามคนเดิมแล้ว -1 ⚡ แต่แทบไม่มีอะไรเกิด จากนั้น XOS ดันคนเดิมขึ้นอีก

ทุก action ที่เสีย ⚡ ต้องมี meaningful delta อย่างน้อยหนึ่งอย่าง:
- stage/สถานะเปลี่ยน
- นัดสำเร็จ
- พร้อมซื้อ/reorder
- remeasure/result
- referral
- X-VISOR interest/candidate progress
- skill/team progress

ถ้า predicted delta = 0 อย่า render action นั้น และอย่าเสีย Energy

---

# 11. Follow-up Cooldown

เพิ่ม:

```js
nextUsefulContactMonth
followupCooldown
```

หลังตามหนึ่งครั้ง ถ้ายังไม่พร้อม:

> นนท์ · ขอคิดก่อน
> ตอนนี้ยังไม่ต้องตาม
> รอ Open House / เดือนหน้า

ห้ามกลับมา Top 3 จนมี trigger ใหม่

---

# 12. `ขอคิดก่อน` ต้องมีปลายทาง

หลังขอคิดก่อน:
- Follow-up 1 ครั้งแล้วถ้า readiness ถึง → พร้อมเริ่ม
- ถ้ายังไม่ถึง → cooldown ห้ามตามซ้ำ
- Open House เป็น accelerator

ไม่ควร follow-up คนเดิม 3–5 รอบเพื่อได้ผลเดิม

---

# 13. ลูกค้าดีไม่ต้องติดตามตลอด

ลูกค้าที่ใช้เองได้ / Routine ชัด / adherence ดี / care skill สูง:

> ✅ ดูแลตัวเองได้

จากนั้น:
- ไม่ขึ้น XOS
- ไม่กิน Energy
- auto-reorder ได้
- referral อัตโนมัติเป็นบางครั้ง

มีปัญหาค่อยกลับมา `⚠️ ต้องช่วยอีกครั้ง`

---

# 14. AUTO REORDER

ลูกค้าพอใจและ self-directed สามารถซื้อซ้ำเองตามรอบ:

> 📦 นนท์ต่อ Routine อีก 1 รอบ
> +ยอดขาย +XV +รายได้

ไม่ใช้ Energy

❤️ ดูแล level สูงเพิ่ม auto-reorder และ self-directed rate

---

# 15. Quick Action 3 ปุ่ม = Best Next Action

สร้าง:

```js
getBestNextActions(state, limit = 3)
```

ลำดับ:

### S
- พร้อมซื้อ/reorder
- พร้อม Certification/X-VISOR
- Xcademy/Open House ที่กระทบหลายคน

### A
- ถึงเวลาวัดซ้ำ
- Referral พร้อม
- Warm lead พร้อมนัด
- Candidate ใกล้ milestone

### B
- Skill อีก 1 ครั้งแล้ว level up
- Content/Ads เมื่อ pipeline แห้ง
- หาคนใหม่เมื่อ pipeline ต่ำจริง

ห้าม quick action:
- cooldown follow-up
- self-directed customer
- no-op
- create lead ใหม่ทั้งที่ warm opportunities ค้างเยอะ

Quick copy สั้น:
- `💰 ปิดกับเมย์ · ⚡1`
- `📦 นนท์พร้อมทำต่อ · ⚡1`
- `✨ ชวนโอมเป็น X-VISOR · ⚡1`
- `🎓 Xcademy · ⚡2`
- `🏠 Open House · ⚡2`
- `📚 เรียน → Lv.6 · ⚡1`

---

# 16. `Center` เปลี่ยนเป็น `Xcademy`

UI ห้ามใช้ Center

# 🎓 Xcademy

งานรายสัปดาห์ เดือนละ **4 ครั้ง**

```js
monthStats.xcademyUsed = 0 // max 4
```

ไม่ใช้ `centerDone` แบบเดือนละ 1 ครั้ง

Xcademy มี 2 ห้อง:

## 👋 OPP / Intro
สำหรับคนใหม่/prospect/ลูกค้าที่เริ่มสนใจธุรกิจ
ผล: เปิดใจ, readiness, X-VISOR interest, นัดต่อ

## 🧑‍🏫 Training X-VISOR
สำหรับ Candidate / Certified X-VISOR / G1
ผล: skill/confidence/candidate progress/team output

ไม่ต้องเลือกคนทีละคน ระบบเลือก eligible people ให้อัตโนมัติ

ก่อนกด:
> 👋 OPP / Intro · มีคนเหมาะ 6 คน
> 🧑‍🏫 Training X-VISOR · ทีม/ผู้สมัคร 4 คน

Cost `⚡2` ต่อครั้ง เพราะออกไปเจอแต่ช่วยหลายคนพร้อมกัน

---

# 17. `Good Luck` เปลี่ยนเป็น `Open House`

UI ห้ามใช้ Good Luck

# 🏠 Open House

เดือนละ **1 ครั้ง**
Cost `⚡2`

เมื่อกด:
> ชวนทุกคนในลิสต์ที่เหมาะสมอัตโนมัติ

ผู้เล่นไม่ต้องเลือกชื่อทีละคน

ผล:
- บางคนไม่มา
- บางคนมา
- คนที่มาเปิดใจขึ้นแรง
- บางคนขอนัดวัด
- บางคนพร้อมเริ่ม Routine
- บางคนสนใจ X-VISOR
- บางคนขอเข้า Xcademy/เตรียม Certification เอง

ตัวอย่าง report:
> 🏠 Open House จบแล้ว
> 👥 ชวน 14 · 🚪 มา 8
> ⚖️ อยากนัดวัด 3
> 📦 พร้อมเริ่ม 2
> ✨ สนใจ X-VISOR 2
> 🎓 1 คนขอเข้า Xcademy

Open House ต้องเป็น growth accelerator ที่คุ้ม 2 ⚡ จริง

---

# 18. Skill ต้องเป็น STEP-CHANGE ไม่ใช่ stat ประดับ

Screenshot ปัจจุบัน ❤️ ดูแล Lv.8 / 🌱 พาทีม Lv.10 แต่เกมยัง spam follow-up แปลว่า effect เบาเกิน

## 📚 ความรู้
- Lv3 Recommendation แม่นขึ้น
- Lv5 ลด product explanation friction
- Lv7 Content ได้ warm leads มากขึ้น
- Lv10 คำถามยาก/objection จบใน action เดียวได้มากขึ้น

## 💬 คุยกับคน
- Lv3 ทักครั้งเดียวบางคนพร้อมนัด
- Lv5 warm prospect ข้าม 1 friction step
- Lv7 `ขอคิดก่อน` follow-up เดียวรู้ผลเมื่อพร้อม
- Lv10 Open House/warm leads บางคนพร้อม Baseline/เริ่มได้เลย

## ❤️ ดูแล
- Lv3 follow-up เดิน checkpoint ใหญ่
- Lv5 self-directed เริ่มเกิด
- Lv7 auto reorder สูงขึ้นมาก
- Lv8+ ห้ามแนะนำ follow-up ลูกค้าปกติซ้ำ
- Lv10 ลูกค้าดีส่วนใหญ่เดินเอง + repeat/referral อัตโนมัติได้

## 🌱 พาทีม
- Lv3 Xcademy Training แรงขึ้น
- Lv5 G1 หา lead เองทุกเดือน
- Lv7 G1 sale/reorder เองสม่ำเสมอ
- Lv8 Candidate ใช้ขั้นน้อยลง
- Lv10 G1 สร้างลูกค้า, sale, self-use, reorder, referral, candidate เอง

ผู้เล่น Lv10 ห้ามยังต้อง micro ทีม

เมื่อ level up ต้องบอก mechanic ที่เปลี่ยน เช่น:
> ❤️ ดูแล Lv.8
> จากนี้ลูกค้าที่เดินเองได้จะไม่ถูกแนะนำให้ตามซ้ำ และมีโอกาสซื้อรอบต่อไปเอง

---

# 19. Team recurring activity ต้องแรงขึ้น

เมื่อ Leadership สูง team cycle ต้องมี output ชัด เช่น:

> พลอย เดือนนี้
> 👥 คนใหม่ 4
> 🧡 ลูกค้าใหม่ 2
> 📦 Sale 3
> 🔁 Reorder 2
> 🎓 Candidate 1

ไม่ควร G1 เก่งแล้วได้ sale 0–1 ตลอด

ทุก active X-VISOR มี self-use routine cycle เพิ่ม personal sales/XV ของเขา และ Channel 2 ของ XLEAD

---

# 20. XLEAD progression UI ภาษาไทย

เปลี่ยน:
- Success Case → `เคสที่เห็นผล`
- Active X-VISOR → `X-VISOR ที่กำลังทำงาน`
- Center participation → `เข้า Xcademy`
- Team activity → `งานที่ทีมทำเอง`
- Leadership → `ทักษะพาทีม`

ถ้าครบทุกข้อ trigger XLEAD milestone ทันที อย่าให้ผู้เล่นนั่งมอง checklist เขียวอยู่

---

# 21. Month Summary ลดจาก 20 ช่องเหลือ 4 block

## 💰 เงิน
> เดือนนี้ ฿31,500 · รวม ฿87,420 · ↑ จากเดือนก่อน

## 👥 คน
> ลูกค้าใหม่ 3 · ซื้อซ้ำ 5 · Open House → นัดใหม่ 4

## 🌱 ทีม
> X-VISOR 4 · ทีมทำเอง 28 งาน · Sale ทีม 8

## ⭐ ไฮไลต์
> พลอยได้ลูกค้าคนที่ 5 · โอมพร้อม Candidate · คุณปลดล็อก XLEAD

มี `ดูรายละเอียด` ถ้าต้องการ stats เต็ม

---

# 22. Asian skin palette

Appearance pool ปัจจุบันมี dark tone เยอะเกิน visual direction

ปรับ default warm Asian light–medium range เช่น:

```js
['#F2C7A5','#EDBC99','#E8B18C','#DFA37E','#D59673','#C98A69','#E7AD87','#DFA07A']
```

Hair ใช้ black / soft black / dark brown เป็นหลัก

เพิ่มความต่างผ่าน hair style, glasses, shirt, jacket, accessory, hair clips มากกว่าพึ่ง skin tone

---

# 23. Endgame ที่ตรวจเจอ — เกมยังหยุดก่อน XGEN

V5 มี XLEAD แต่ยังจบที่ 24-Month Review

ต่อจริง:

> XLEAD → สร้าง XLEAD ในทีม → Organization → XGEN → 3M Challenge

Source revenue snapshot ปัจจุบันมี:
- ① Active Retail 20/23/25%
- ② Direct Mentoring 4/4.6/5%
- ③ Agency Management 5% TGV
- ④ Franchise Expansion 1.75% breakaway organization volume

XGEN qualification ยังมี source conflict จึง **ห้ามเรียก 3M ว่า qualification official** แต่ใช้เป็น game end challenge ได้:

> 🏙️ สร้างองค์กร 3,000,000 / เดือน

ครบ 24 เดือนแล้วยังไม่ถึง ให้ `เล่นต่อแบบ Endless` ไม่บังคับ reset

---

# 24. Best Next Action hard rule

ทุก candidate action มี internal fields:

```js
{ impact, urgency, milestoneChance, revenueChance, batchSize, energyCost, cooldown }
```

ถ้า predicted delta = 0 → ไม่ render

ถ้าไม่มี action คุ้มจริง:

> `🌙 จบเดือน`
> งานสำคัญเดือนนี้เสร็จแล้ว คนที่เหลือยังไม่ถึงจังหวะต้องตาม

ดีกว่าเผา Energy ฟรีหรือสร้าง lead ใหม่มั่ว ๆ

---

# 25. Automated pacing tests

Run อย่างน้อย 200 seeds: Balanced / Skill-first / Event-first / Team-first

Acceptance:

### Month 3
- median customers >= 3
- transactions >= 4
- X-VISOR interest เกิดจริง

### Month 6
- normal good play team >= 2
- auto reorder เกิด
- income ไม่ stagnate

### Month 9
- XLEAD reachable
- Channel 2 > 0 ถ้า G1 มี sales/self-use

### Month 12
- team activity ต้องมากกว่าผู้เล่นเองได้

ห้าม Lv8–10 ยังต้อง spam follow-up เพื่อหาเงิน

---

# 26. Required tests

## Bug/UI
1. กลับกระดานใช้ได้ทุก modal
2. ✕ ใช้ได้
3. Escape ใช้ได้
4. ไม่มี `เติบโตและพาทีม`
5. emoji-first menu
6. Month Summary ไม่เป็น 20-cell dashboard

## Economy
7. Channel 1 ใช้ personal sales baht ไม่ใช่ XV
8. XV แยกจาก cash income
9. XLEAD unlock Channel 2
10. G1 20% → 4%
11. G1 23% → 4.6%
12. G1 25% → 5%
13. Direct Mentoring คิด G1 รายคน
14. G1 self-use เข้า personal sales
15. self-use มีผล Channel 2
16. month history เก็บ channel breakdown
17. total income = sum closed months
18. HUD highlight = total income

## Follow-up
19. no-op action ไม่เสีย Energy
20. same person ไม่ quick-action ซ้ำใน cooldown
21. self-directed customer ไม่ขึ้น follow-up
22. auto-reorder ไม่ใช้ Energy
23. best 3 prioritizes warm/high-value opportunities

## Events
24. Xcademy max 4/month
25. OPP/Intro affects prospects
26. Training affects candidates/team
27. Open House max 1/month
28. Open House invite all eligible automatically
29. attendance ไม่ 100%
30. attendees readiness/aspiration jump
31. Open House สร้าง customer + X-VISOR opportunities
32. UI ไม่มี Center/Good Luck

## Skill
33. Care Lv8 ลด follow-up spamจริง
34. Care Lv10 auto-repeat/self-directed สูง
35. People Lv7 waiting case รู้ผลเร็ว
36. Leadership Lv10 output กระโดดจาก Lv1
37. level-up อธิบาย mechanic ที่เปลี่ยน

## Endgame
38. XLEAD มี income channel 2
39. organization state รองรับ XGEN
40. 3M challenge มีจริง
41. month 24 ไม่บังคับ reset

---

# 27. Definition of Done

Patch นี้ผ่านเมื่อ:
- กลับกระดานกดได้จริง
- UI สะอาดและ emoji-first
- score เด่น = รายได้รวม
- income history ดูย้อนหลังได้
- Channel 1 ใช้ยอดขายบาท
- XLEAD ได้ Channel 2 4/4.6/5 จริง
- G1 ซื้อใช้เองสร้าง volume และ Channel 2
- Xcademy 4 ครั้ง/เดือน มี OPP + Training
- Open House 1 ครั้ง/เดือน invite all และสร้าง batch opportunity
- ลูกค้าดี auto-reorder/self-directed
- ไม่ spam คนเดิม
- Quick 3 เลือกงานที่คุ้มที่สุด
- Skill สูงทำให้เกมง่ายขึ้นแบบก้าวกระโดด
- Leadership Lv10 ไม่ต้อง micro ทีม
- Month 6–9 เงิน/ทีมโตชัด
- XLEAD มี money jump
- XGEN / 3M / Endless ต่อได้
- cast ดู Asian skin tone มากขึ้น

---

# 28. Final Feel

หลัง patch ผู้เล่นควรพูดว่า:

> “ตอนแรกเหนื่อยเพราะยังไม่เก่ง”

แล้วต่อมา:

> “ลูกค้าซื้อซ้ำเองแล้ว”
> “Open House ทีเดียวคนขยับหลายคน”
> “Xcademy ทีเดียวทีมเก่งขึ้นหลายคน”
> “กูไม่ต้องตามทุกคนแล้ว”
> “พอเป็น XLEAD รายได้ช่อง 2 เปิด เงินกระโดดเลย”
> “ทีมซื้อ ใช้ ขาย ดูแลกันเอง”
> “28 ⚡ เท่าเดิม แต่เงินกับทีมโตหลายเท่า”

**เกมต้องทำให้คนอยากโตต่อ ไม่ใช่ทำให้คนรู้สึกว่างาน X-VISOR เหนื่อยและไม่คุ้ม**
