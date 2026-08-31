# X-VISOR QUEST — PATCH V7
## BIG TEAM • REAL INCOME STACK • 3M XGEN WIN

ไฟล์นี้คือ **source of truth ล่าสุดสำหรับ Keen ทำ `/xvisor/quest/` ต่อจาก V6**

รอบนี้ต้องแก้แกนเกมหลัง Certified X-VISOR ใหม่ เพราะ playtest จริงให้ความรู้สึกผิดจากสิ่งที่เกมต้องการสื่อ:

> เล่นเป็นปีในเกม สกิล Lv.10 หมดแล้ว แต่ยังต้องตามคนเดิมซ้ำ ๆ ขายได้น้อย ทีมเกิดยาก และรายได้ค้างระดับหลักพัน

ถ้าผู้เล่นเล่นแล้วสรุปว่า “งาน X-VISOR เหนื่อย ไม่คุ้ม ไม่น่าทำ” ถือว่า **game design fail** แม้ระบบทุกปุ่มจะทำงานถูก

North Star:

> **ช่วงแรกทำเอง → เก่งขึ้นแบบก้าวกระโดด → ลูกค้าเดินเอง → ทีมโตเอง → XLEAD ได้รายได้ช่อง 2 จริง → TGV โต → ชนะที่ 3,000,000 → XGEN → เล่นต่อเพื่อดู organization และรายได้โตต่อ**

---

# 1. P0 — Economy ใหม่ให้ใช้ข้อมูลนี้

## RoutineX

```js
RoutineX = {
  price: 7490,
  xv: 7000,
  cycle: 'monthly'
}
```

- ลูกค้าที่เริ่ม RoutineX = ยอดขาย 7,490 บาท / 7,000 XV
- ถ้าใช้ต่อเนื่อง เดือนถัดไปซื้ออีก 7,490 บาท / 7,000 XV
- Repeat ต้องเป็น core economy ไม่ใช่ rare event
- ลูกค้าที่ self-directed / satisfied ซื้อซ้ำเองได้โดยไม่กิน Energy

## Xircle Band + Scale

```js
XircleStarter = {
  name: 'Xircle Band + Scale',
  price: 4990,
  xv: 2495,
  cycle: 'first_customer_only'
}
```

- ขายคนใหม่ครั้งแรก
- ซื้อครั้งเดียว
- ไม่ repeat ทุกเดือน

## ลูกค้าใหม่แบบ Full Start

เดือนแรก:

- Xircle Band + Scale = 4,990 / 2,495 XV
- RoutineX = 7,490 / 7,000 XV

รวม:

> **ยอดขาย 12,480 บาท / 9,495 XV**

เดือนถัดไปถ้าใช้ต่อ:

> **RoutineX 7,490 บาท / 7,000 XV**

Receipt ต้องแยก 2 SKU ให้เข้าใจว่าฮาร์ดแวร์ครั้งแรก แต่ RoutineX เป็นรอบรายเดือน

---

# 2. P0 — Channel 1 ใช้ยอดขายเป็นบาท ไม่ใช่ XV

current implementation เดิมคิดจาก `personalXV * rate` ทำให้ RoutineX 7,490 / 7,000 XV ได้ 1,400 ซึ่งผิดฐาน

ใช้:

```js
personalRetailIncome = personalSalesBaht * retailRate
```

Tier game snapshot:

- 0–39,999 บาท/เดือน → 20%
- 40,000–99,999 บาท/เดือน → 23%
- 100,000+ บาท/เดือน → 25%

XV เป็น volume แยก ไม่ใช่เงิน

ตัวอย่าง:

- RoutineX 7,490 × 20% = **1,498 บาท**
- New Full Start 12,480 × 20% = **2,496 บาท**

ถ้ายอดใหม่ทำให้ข้าม tier ต้อง recalculate รายได้ทั้งยอดเดือน และ receipt แสดง income delta จาก transaction นั้นจริง

---

# 3. P0 — XLEAD รายได้ช่อง 2 ต้องเปิดจริง

คำอธิบายสำหรับผู้เล่น:

> **X-VISOR ในทีมได้คอมเท่าไหร่ XLEAD ได้ 20% ของคอมที่เขาได้**

เทียบเป็นยอดขาย G1:

- G1 tier 20% → เราได้ 4% ของยอด G1
- G1 tier 23% → เราได้ 4.6%
- G1 tier 25% → เราได้ 5%

คิด **แยก G1 ทีละคน** ตาม tier ของคนนั้น

```js
directMentoring = sum(g1 => {
  const g1Commission = g1.personalSalesBaht * g1.retailRate;
  return g1Commission * 0.20;
});
```

ห้ามรวมยอด G1 ทั้งหมดแล้ว ×5%

ทันทีที่ขึ้น XLEAD ต้องเกิด MONEY MOMENT:

> 🌱 XLEAD  
> ปลดล็อก **② รายได้จากการพัฒนา X-VISOR**

แล้วคำนวณยอดของเดือนปัจจุบันที่ G1 ทำไว้แล้วทันที

ไม่ใช่ขึ้น XLEAD แล้ว `teamIncome = 0`

---

# 4. X-VISOR ในทีมซื้อใช้เอง ต้องสร้างยอด

Active X-VISOR มี monthly self-use RoutineX

เมื่อถึงรอบ:

> 📦 พลอยต่อ RoutineX ของตัวเอง

G1 ได้:

- personal sales +7,490
- personal XV +7,000
- commission ของตัวเองตาม tier

XLEAD ได้:

- 20% ของ commission ที่ G1 ได้

ทั้งหมดอัตโนมัติ ไม่กิน Energy player

Team economy จึงไม่ควรเป็นศูนย์เพียงเพราะเดือนนั้นลูกทีมยังไม่ปิดลูกค้าใหม่

---

# 5. ไม่มี Team max 3

ตรวจ implementation ปัจจุบันแล้ว: `3 Active X-VISOR` เป็น **เกณฑ์ XLEAD** ไม่ใช่ max team

ห้ามใช้ target นี้เป็น cap

State ต้องรองรับ:

- G1 3
- G1 10
- G1 30+
- downstream X-VISOR
- XLEAD ในทีมหลายคน
- organization หลักร้อยคนใน late game

Canvas ไม่ต้องวาดทุกคนพร้อมกัน ใช้ group / zone / count ได้

---

# 6. Team growth ต้อง SNOWBALL

current team simulation จำกัด output ต่อคนต่ำเกินไป ทำให้ Leadership สูงแล้วทีมยังโตแบบหยดน้ำ

เปลี่ยนเป็น compound growth:

## G1 ใหม่
ยังต้องช่วย

## G1 คล่อง
มี monthly engine ของตัวเอง:

- self-use
- หาคน
- customer sale
- repeat
- referral
- candidate

## G1 เก่ง
เริ่มสร้าง X-VISOR ของตัวเอง

## XLEAD ในทีม
สร้าง sub-team ของตัวเอง

Pacing target ในเกม:

- Month 4: Team ~2
- Month 6: Team ~5
- Month 9: Team 12–20 ได้ใน good play
- Month 12+: หลายสิบคนได้ถ้าลง Leadership / Xcademy / Open House ดี

นี่เป็น game pacing ไม่ใช่ projection โลกจริง

---

# 7. P0 — Follow-up spam ต้องหาย

Prospect 1 คนไม่ควรถูก manual follow-up แบบเดิมเกิน 1–2 ครั้งโดยไม่มี state change

หลัง `ขอคิดก่อน` ให้มี 3 ทาง:

1. ใกล้พร้อม → follow-up ครั้งถัดไปรู้ผล
2. ยังไม่ใช่จังหวะ → cooldown 1–3 เดือน
3. ไม่สนใจตอนนี้ → หลุดจาก priority; รอ reactivation จาก Open House / Content / life event

ถ้า cooldown:

> `ยังไม่ต้องตาม`  
> `รอ Open House / เดือน X`

**ห้ามเสีย Energy กับคนนี้ในช่วง cooldown**

ถ้า action ไม่มี meaningful delta ห้าม render action นั้นเลย

---

# 8. ลบคำ `ชวนทำต่อ`

คำนี้ไม่บอกว่าทำอะไร

ถ้าหมายถึง Repeat:

> `📦 ต่อ RoutineX เดือนใหม่`

ถ้าซื้อเอง:

> `✅ ซื้อรอบใหม่เอง`

ถ้าหมายถึง follow-up:

> `💬 คุยเรื่องรอบถัดไป`

ทุกปุ่มต้องบอก action จริง

---

# 9. ลูกค้าที่ดีต้องออกจาก micro-management

เพิ่ม states:

```js
SELF_DIRECTED
AUTO_REORDER
NEEDS_HELP
COOLDOWN
READY_TO_BUY
READY_TO_REFER
READY_XVISOR
READY_CERTIFY
```

ลูกค้า `SELF_DIRECTED`:

- ไม่ขึ้น Quick Action ติดตาม
- ไม่ใช้ Energy
- RoutineX ซื้อซ้ำอัตโนมัติได้
- referral เกิดเองบางส่วน
- ถ้าหลุดค่อยกลับ `NEEDS_HELP`

---

# 10. Skill Lv.10 ต้องเหมือน earned cheat

ตอนนี้ player max Skill แต่ยังลำบากเท่าเดิม = fail

## 📚 ความรู้ Lv.10
- recommendation ไม่วนหลาย screen
- product fit auto-suggest
- content quality สูง
- objection ด้านข้อมูลผ่านง่าย

## 💬 คุยกับคน Lv.10
- warm prospect ข้าม small-talk stages
- Open House attendee บางคนพร้อมนัดทันที
- `ขอคิดก่อน` ที่ readiness พอ → follow-up เดียวจบ
- คนไม่ fit ถูกคัดออกเร็ว ไม่เผา Energy

## ❤️ ดูแล Lv.10
- ลูกค้าดี self-directed เร็ว
- auto-repeat สูง
- referral เกิดเองบางส่วน
- XOS แทบไม่แนะนำ routine follow-up
- player ดูเฉพาะ exception / hot case

## 🌱 พาทีม Lv.10
- G1 ทำ monthly engine เอง
- Candidate เร็ว
- G1 สร้าง candidate เอง
- XLEAD ในทีมเริ่มเกิด
- player focus organization ไม่ micro G1

เมื่อ Level Up ต้องบอก mechanic ที่เปลี่ยน ไม่ใช่แค่ `+XP`

---

# 11. Quick Actions 3 อัน = 3 สิ่งที่คุ้มที่สุด

สร้าง:

```js
getBestNextActions(state, limit = 3)
```

Priority:

## S
- 💰 พร้อมซื้อ
- 📦 พร้อมต่อ RoutineX
- ✨ พร้อมเข้าสาย X-VISOR
- 🎓 Candidate พร้อมสอบ
- 🏠 Open House ที่ batch impact สูง
- 🎓 Xcademy ที่ช่วยหลายคน
- 🌱 Leader milestone

## A
- Referral ready
- Remeasure ที่จะเปลี่ยน state
- Warm prospect พร้อมนัด
- Skill อีกครั้งเดียว Level Up

## B
- Content / Ads เมื่อ pipeline บาง
- เพิ่มคนใหม่เมื่อไม่มี warm opportunity จริง

ห้ามเสนอ:

- คน cooldown
- no-op follow-up
- self-directed customer
- create-new-lead ถ้ามี ready-to-buy / ready-xvisor ค้าง

ถ้าไม่มี action คุ้ม:

> `🌙 จบเดือน`

ไม่ต้องเผา Energy ให้หมด

---

# 12. Energy = เวลา ไม่ใช่ภาษีทุก transaction

## 0 ⚡
- auto RoutineX repeat
- G1 self-use
- team autonomous sale
- team autonomous follow-up
- team referral

## 1 ⚡
- โทร / ทัก / นัด
- hot follow-up
- content
- skill training
- candidate review

## 2 ⚡
- ไปพบ
- Scale / consultation เจอตัว
- Xcademy batch
- Open House batch

28 ⚡ ต้องเป็น “งบตัดสินใจ” ไม่ใช่ tap counter

---

# 13. 🎓 Xcademy — 4 ครั้ง/เดือน

แทน Center

เดือนละ 4 ครั้ง

มี 2 ห้อง:

## 👋 OPP / Intro
สำหรับคนใหม่ / prospect / customer ที่เริ่มสนใจธุรกิจ

ผลแบบ batch:

- readiness ขึ้น
- business interest ขึ้น
- บางคนพร้อมนัด
- บางคนเริ่มถาม X-VISOR

## 🧑‍🏫 Training X-VISOR
สำหรับ Candidate / G1 / Certified X-VISOR

ผล:

- skill/confidence ทีมขึ้น
- candidate progress
- G1 output
- leader readiness

Cost 2 ⚡ / ครั้ง

ระบบเลือก eligible people อัตโนมัติ ไม่ต้องติ๊กทีละคน

---

# 14. 🏠 Open House — 1 ครั้ง/เดือน

แทน Good Luck

เมื่อกด:

> ชวน **ทุกคนใน list ที่เหมาะสม** อัตโนมัติ

ผล:

- บางคนไม่มา
- บางคนมา
- attendee readiness / aspiration กระโดด
- ได้ลูกค้าใหม่
- ได้นัด Xircle
- ได้คนสนใจธุรกิจ
- บางคนขอเข้า Xcademy
- บางคนที่พร้อมมากขอให้ช่วยเตรียมสอบ X-VISOR

Report ตัวอย่าง:

> 🏠 Open House  
> ชวน 24 · มา 13  
> 💰 พร้อมเริ่ม Routine 4  
> ⚖️ นัด Xircle 3  
> ✨ สนใจ X-VISOR 5  
> 🎓 พร้อม Xcademy 2

Cost 2 ⚡ เพราะเป็น batch action ที่ต้องคุ้มมาก

---

# 15. X-VISOR creation ต้องง่ายขึ้นมาก

Customer → X-VISOR ไม่ควรเป็น rare event

Aspiration เพิ่มจาก:

- เห็นผลเอง
- referral/community
- Xcademy OPP
- Open House
- เห็น X-VISOR คนอื่นโต
- People/Leadership skill

Fast path:

> ✨ สนใจ X-VISOR  
> → 🎓 Xcademy  
> → ฝึก/สอบ  
> → 🌱 Certified X-VISOR

Skill สูง + Open House ดี สามารถเดิน path ใน 1–2 เดือน

ไม่มี hard cap 3 คน

---

# 16. TGV ต้องเป็น score หลัก

หลังมีทีม HUD ต้องมี:

> **🏙️ TGV เดือนนี้ 482,000 / 3,000,000**

TGV = monthly organization XV ตาม tree ทั้งหมด

รวม:

- personal XV
- G1 XV
- downstream generations
- RoutineX repeat
- Xircle first sale
- X-VISOR self-use

**TGV reset ทุกเดือน**

เก็บ `bestTGV` แยกเป็น record

---

# 17. WIN CONDITION = 3,000,000 TGV / เดือน

เอา hard end 24 เดือนออก

HUD:

> **เดือน 12**

ไม่ใช่:

> เดือน 12 / 24

เป้าหมายใหญ่:

> 🏙️ **สร้าง TGV 3,000,000 ใน 1 เดือน**

เมื่อถึง:

# 🏆 XGEN

จากนั้นมีปุ่ม:

> `เล่นต่อ ▶`

เข้า Endless Mode

ห้าม reset save

---

# 18. หลัง XGEN ต้องเล่นต่อได้

หลัง Win:

- organization ยังโต
- TGV ทำ record ใหม่
- รายได้ยังโต
- XLEAD ในทีมเพิ่ม
- breakaway organization เกิด
- Open House / Xcademy ยังเล่นต่อ

Records:

> 🏆 Best TGV 4,820,000  
> 💰 รายได้รวม ฿1,240,000  
> 🌱 X-VISOR 86  
> 👑 XLEAD 7

---

# 19. Revenue stack ต้องครบ

หน้า Income แสดง 4 ช่องแบบ progressive disclosure

## ① ขายและดูแลลูกค้า
X-VISOR ขึ้นไป

## ② พัฒนา G1
เปิด XLEAD

> 20% ของ commission ที่ G1 ได้

## ③ บริหารองค์กร
เปิด Organization/XGEN phase

ใช้ current game source snapshot:

> 5% ของ TGV

## ④ ขยายองค์กร
เปิดเมื่อมี breakaway organization

current game source snapshot:

> 1.75% ของ breakaway organization volume

สำหรับ ③/④ ใส่ note:

> `แบบจำลองจากโครงสร้างแผนปัจจุบัน`

---

# 20. รายได้รวม = score อีกตัว

HUD:

> 💰 **รายได้รวม ฿XXX,XXX**

กดแล้วดู history รายเดือน:

### เดือน 9 · ฿48,320
- ① ลูกค้า ฿18,700
- ② G1 ฿29,620
- ③ —
- ④ —

เก็บ snapshot รายเดือนจริง ห้ามคำนวณย้อนหลังจาก current state

---

# 21. Team member ต้องมีรายได้ของเขา

กดคนในทีม:

> **พลอย · X-VISOR**  
> 💰 รายได้เดือนนี้ ฿11,500  
> 📦 ยอดส่วนตัว ฿50,000  
> XV 46,000  
> ลูกค้า 6  
> ทีมย่อย 1

XLEAD เห็น:

> จากพลอย คุณได้ 20% ของคอมเขา = **฿2,300**

นี่เข้าใจง่ายกว่าแสดง 4.6% ลอย ๆ

---

# 22. Month Summary = Reward Screen

ลด dashboard 20 ช่อง

ใช้ 5 block:

## 💰 เงิน
> เดือนนี้ ฿72,450  
> รวม ฿320,800  
> NEW RECORD

## 🏙️ TGV
> 860,000 / 3,000,000  
> ↑ 41%

## 👥 ลูกค้า
> ใหม่ 8 · ต่อ Routine 23

## 🌱 ทีม
> X-VISOR 14 · XLEAD 1  
> ทีมทำเอง 92 งาน

## ⭐ ไฮไลต์
> Open House ได้ Candidate 4  
> พลอยสร้าง X-VISOR คนแรกของตัวเอง

แล้ว:

> `▶ เดือนถัดไป`

---

# 23. เงินต้องโตจากฐานที่สะสม

Compounding assets:

- Customer base → RoutineX repeat
- X-VISOR base → self-use + customer sales
- G1 → Channel 2
- XLEAD → subteam
- Organization → TGV + Channel 3/4

Month 12 ห้ามเหมือน Month 2 ที่เริ่มหา sale จากศูนย์ทุกเดือน

---

# 24. Keep V6 UX fixes

ยังต้องรักษา:

- Asian light–medium skin palette เป็น majority
- emoji-first menus
- text น้อย
- `กลับกระดาน` / ✕ ใช้ได้จริง
- Month Summary clean
- ลบคำ `Center`
- ลบ `Good Luck`
- ลบ `เติบโตและพาทีม`
- ลบ `ชวนทำต่อ`

---

# 25. Current implementation findings ที่ต้องแก้

จาก code review ปัจจุบัน:

1. `DIRECT_MENTORING_RULE.rate` ยังเป็น `null` → ช่อง 2 ไม่เกิดเงินจริง
2. `getRetailTier()` ยังรับ XV → ต้องเปลี่ยนเป็น personal sales baht
3. team cycle ใช้ RoutineX offer อย่างเดียว → ยังไม่มี Xircle first sale 4,990 / 2,495 XV
4. team output ต่อ member ถูก clamp ต่ำ → snowball ช้า
5. candidate/team growth เกิดน้อย → ทีมโตช้า
6. Active X-VISOR target 3 เป็นเกณฑ์ XLEAD ไม่ใช่ max team
7. game ยังมี 24-month / season review framing → เปลี่ยนเป็น 3M win + Endless
8. TGV มี state อยู่แล้วแต่ยังไม่เป็น primary win score

---

# 26. Pacing acceptance

ทำ automated simulation อย่างน้อย 500 seeds

## Month 3
- customer base 3–6
- repeat เริ่มเกิด
- income > Month 1 ชัด
- X-VISOR interest เกิดบ่อยพอ

## Month 6
- X-VISOR 3–8 ใน good play
- repeat เป็นฐานรายได้สำคัญ
- team self-use / team sales เกิดทุกเดือน
- monthly income หลักหมื่น reachable ใน simulation

## Month 9
- XLEAD reachable
- Channel 2 > 0 ทันที
- team ใหญ่เกิน 3 ได้
- skilled play ห้ามยังติด ฿1,400/เดือน

## Month 12+
- team output > player manual output
- TGV มี acceleration
- downstream X-VISOR/XLEAD เกิด

## Win
- 3M ต้อง reachable ด้วย good strategy
- ไม่ auto-win ง่าย
- แต่ห้าม grind follow-up 30 เดือน

---

# 27. Tests — Economy

1. RoutineX = 7490 / 7000 XV
2. Xircle Band+Scale = 4990 / 2495 XV
3. new full customer = 12480 / 9495 XV
4. RoutineX repeats monthly
5. Xircle does not repeat
6. Channel 1 uses personalSalesBaht
7. 7490 at 20% = 1498
8. 12480 at 20% = 2496
9. G1 commission from own sales
10. XLEAD gets 20% of G1 commission
11. 4 / 4.6 / 5 equivalent rates work
12. Direct Mentoring calculated per G1 tier
13. G1 self-use creates sales + XV
14. G1 self-use contributes mentor income
15. month history stores channel 1–4 separately
16. total income equals sum closed months

---

# 28. Tests — Growth / Follow-up

17. no team-size cap 3
18. 10+ G1 can exist
19. downstream X-VISOR can exist
20. Lv10 Leadership materially stronger than Lv1
21. cooldown prospect cannot be spam-followed
22. no-op follow-up never consumes Energy
23. `ขอคิดก่อน` resolves / cools down instead of infinite loop
24. self-directed customer not recommended for follow-up
25. auto-repeat costs 0 Energy
26. Quick Action excludes no-op
27. Quick Action prioritizes sale/repeat/candidate over new lead
28. `ชวนทำต่อ` absent from UI

---

# 29. Tests — TGV / Endgame

29. TGV is monthly, not lifetime cumulative
30. TGV includes player + all generations
31. RoutineX repeat contributes XV
32. Xircle first sale contributes 2495 XV once
33. G1 self-use contributes TGV
34. 3,000,000 monthly TGV triggers XGEN win
35. XGEN does not reset save
36. after XGEN player can start next month
37. bestTGV persists
38. Endless income continues

---

# 30. Definition of Done

V7 ผ่านเมื่อ playtest ให้ feeling นี้:

### ก่อน
> ตามคนเดิม 8 เดือน เสีย ⚡ แล้วยังไม่ซื้อ

### หลัง
> คนนี้ยังไม่ใช่จังหวะ ระบบเอาออกจาก priority ไปทำคนที่พร้อมกว่า

### ก่อน
> Skill Lv.10 แล้วเหมือนเดิม

### หลัง
> Lv.10 แล้วลูกค้าปกติซื้อซ้ำเอง ทีมทำงานเอง กูดูแค่เรื่องสำคัญ

### ก่อน
> ทีมมี 3 คนแล้วเหมือนหยุด

### หลัง
> ทีม 14 คน มีคนสร้างคนต่อเอง และมี XLEAD ในทีม

### ก่อน
> เป็น XLEAD แล้วยังได้หลักพันเท่าเดิม

### หลัง
> พอ XLEAD ช่อง 2 เปิด รายได้จาก G1 กระโดดทันที

### ก่อน
> เดือน 24 จบ แล้วไงต่อ

### หลัง
> เป้าคือ 3M TGV → XGEN → เล่นต่อดู organization กับเงินโตได้เรื่อย ๆ

---

# 31. FINAL PLAYER FANTASY

> ตอนเริ่ม กูต้องทำเองจริง

> พอเก่งขึ้น กูเลิกเสียเวลากับคนที่ไม่พร้อม

> ลูกค้าที่ดีต่อ RoutineX เองทุกเดือน

> X-VISOR ในทีมซื้อใช้เองและขายลูกค้าเอง

> พอเป็น XLEAD กูได้ 20% ของคอมที่ G1 ได้

> ทีมเริ่มสร้างทีมต่อเอง

> TGV จากหลักหมื่นกลายเป็นหลักแสน แล้วเร่งไปหลักล้าน

> กูชนะที่ 3M เป็น XGEN แล้วเกมยังไม่จบ

> จากนี้กูอยากรู้ว่า organization นี้จะโตและสร้างรายได้ได้อีกแค่ไหน

**ถ้า player ยังรู้สึกว่าต้อง spam follow-up เพื่อหาเงินหลัง Skill Lv.10 ถือว่างานยังไม่เสร็จ**
