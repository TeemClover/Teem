# myClover: CORE7 — Patch Notes

## 2026-08-04 — v0.5 Bilingual Web + Card Unlock Stat

- ขึ้นเวอร์ชันเกมเป็น `v0.5` ทุกจุดที่แสดงผล และรวมเลขเวอร์ชันไว้ที่ `CORE7_GAME_VERSION` ที่เดียว
- ทั้งเว็บใช้คีย์ภาษาเดียวกันคือ `mc_lang` และย้ายค่าเดิมจาก `c7:lang` ให้อัตโนมัติครั้งเดียว (ยกเว้นหน้า Kickstarter ที่เป็นอังกฤษเสมอ)
- เพิ่มหน้า `/en/` เป็น Landing Page ภาษาอังกฤษสำหรับ SEO พร้อม hreflang ทั้งสองทาง
- เก็บ Stat จำนวนการ์ด FIRST HAND ใบใหม่ที่ถูกเปิด ผ่าน event `CARD_UNLOCK` ใหม่ (Analytics v1.2)
- เพิ่มคอลัมน์ `card_id` ในตาราง event ด้วย migration ที่รันซ้ำได้ ไม่กระทบข้อมูลเดิม
- หน้า Stat มีกราฟรายวันกลับมาแล้ว แสดง Match ที่เริ่ม, Match ที่เล่นจบ และการ์ดใบใหม่ที่ถูกเปิดในแท่งเดียวกัน
- หน้า Stat เพิ่มหมวด CARD UNLOCK: จำนวนใบที่เปิด, จำนวนเครื่อง, เฉลี่ยต่อเครื่อง, ใบที่เคยถูกสุ่มออก และเครื่องที่สะสมครบ 7 ใบจนปลดล็อก SELECT
- Export CSV รวมข้อมูลรายวันและ Card Unlock ด้วย

## 2026-08-03 — v0.4.6 Mode Language + Stat v1.1

- เปลี่ยนชื่อโหมดที่ผู้เล่นเห็นเป็น `1 WIN (Match)`, `2 WIN (Double)` และ `3 WIN (Set)`
- คง internal ID `quick / bo3 / bo5` ไว้ชั่วคราว เพื่อให้ห้องและสถิติเก่าอ่านต่อได้โดยไม่ทำ Gameplay พัง
- อัปเกรด `/core7/stat/` เป็น Development Lab สำหรับใช้พัฒนาเกมจากข้อมูลจริง
- เพิ่ม Anonymous Installation ID แบบสุ่มในเครื่องสำหรับดู New, Returning, Match Players และ Rematch โดยไม่เก็บชื่อ อีเมล หรือ IP
- เพิ่ม Funnel: เปิด CORE7 → เปิด Hand Builder → ล็อกมือ → เริ่ม Match → เล่นจบ → เล่นต่อ
- เพิ่ม Balance Stat รายสี: Play, Round Win, Tie, Final Round และ Extra Discard
- เพิ่ม Starting Hand Pick และ Hand Win Rate รายการ์ด พร้อมเตือนเมื่อ Sample ต่ำกว่า 20 Hands
- เพิ่ม Game/Rules Version, Patch Timeline, Data Health และ Export CSV
- แยก Match ออกจากโหมดหลายชัยชนะอย่างชัดเจนในหน้า Stat และ Game Mode

## 2026-08-03 — Rules Image Delivery Hotfix

- เปลี่ยนทุกหน้าที่แสดงภาพสรุปกติกาจาก PNG เป็น WebP รวม Landing, Rules, Tutorial, Match และ Kickstarter
- ลดไฟล์ภาพที่ส่งให้ผู้เล่นจากประมาณ 2.0 MB เหลือประมาณ 497 KB
- แก้ Content-Type และ cache header ของไฟล์ WebP ให้ถูกต้อง

## 2026-08-02 — v0.4.5 Full-bleed Rules Flip Hotfix

- การ์ดกติกาหน้าแรกแสดงภาพเต็มใบ ไม่มี padding หรือกรอบซ้อนด้านใน
- เพิ่มเสียงพลิกการ์ดแบบ paper sweep และเสียงแตะโต๊ะ ทั้งตอนเปิดและคว่ำกลับ
- เสียงเคารพปุ่มเปิด/ปิด SFX และไม่กระทบการพลิกหากอุปกรณ์ไม่รองรับ Web Audio

## 2026-08-02 — v0.4.4 Lore Foundation

- หน้าแรกเริ่มด้วยการ์ดกติกาคว่ำ และกดเพื่อพลิกดูกติกาหรือคว่ำกลับได้ พร้อม keyboard และ reduced-motion support
- ใส่กรอบมนแบบการ์ดจริงให้ภาพบนหน้า Rules
- ล็อก Lore Canon: `RED = Body`, `BLUE = Mind`, `GREEN = Soul`, `GRAY = Craft`
- เพิ่ม Lore บนหน้า About โดยแยกออกจากกติกาและหน้าเล่น เพื่อไม่เพิ่มภาระให้ผู้เล่น

## 2026-08-02 — v0.4.3 Conversation Starter

- คืนภาพกติกาแบบเดิมที่สื่อสารแกนเกมได้ทันที และเอา All Tie ออกจากคำอธิบายกติกาที่ผู้เล่นเห็น
- วางภาพกติกาหน้าแรกในกรอบมนแบบการ์ดจริง
- เปลี่ยนหลังการ์ดทุกจุดเป็นภาพจริง `hall-core7.png` ที่ปรับเป็นมาตรฐาน 2.5 × 3.5 นิ้ว (750×1050 px)
- ปรับถ้อยคำ Tutorial ให้ย้ำว่า CORE7 เป็น Conversation Starter ที่ช่วยให้คนเปิดบทสนทนา

## 2026-08-02 — v0.4.2 Rules Hotfix

- ถอดชื่อสายแบบเดิมออกจากหน้าเกมและ metadata ฝั่ง UI ใช้เฉพาะสีโดยไม่ตีความ
- อัปเดต `CORE7_RULES_VERSION 1.1.0`: ถ้าเสมอทุกตา เปิด Starting Hand และให้ฝ่ายที่เริ่มด้วย GRAY น้อยกว่าชนะ; จำนวน GRAY เท่ากันจริงจึง DRAW
- เปลี่ยนภาพสรุปกติกาและปรับกรอบ Hero/หน้า Rules/Tutorial ให้พอดีกับภาพ
- เพิ่มปุ่ม `Rules` แบบขยายได้มุมซ้ายบนของโต๊ะ ตรงข้ามปุ่ม `Discard`

## 2026-08-02 — v0.4.1 Hotfix

- คืน emoji สีฟ้าในข้อความ, OUT และ Timeline เป็น `🔵`; icon บนการ์ดยังคงเป็นหยดน้ำ
- เปลี่ยนวงสีกดได้บนหน้าแรกเป็นภาพกติกา PNG ใบเดียว และใช้ภาพเดียวกันสรุปท้าย Tutorial
- เพิ่ม hover/focus และ click/tap preview เพื่อดูภาพการ์ดใน Summary และ Round Timeline
- เพิ่มคีย์บอร์ดลูกศรซ้าย/ขวาเพื่อเปลี่ยนการ์ดในหน้า Collection Card Detail

## 2026-08-02 — v0.4

- รีเฟรช FIRST HAND เป็นภาพเต็มใบครบ 28 ใบ และคง Generic ภาพเต็มใบครบ 4 สี
- ปรับ template ให้สมมาตร: ตัดแถบซ้าย, ตัดข้อมูลสายและชื่อสีด้านบน, เหลือวงกลม icon สีมุมซ้ายบน
- แถบสีล่างเป็นสีเรียบ ไม่มี pattern และ footer เหลือ `FIRST HAND · NN / 28`
- เปลี่ยน icon BLUE บนการ์ดจากดวงตาเป็นหยดน้ำ
- ไพ่ใบเล็กในมือแสดง artwork, ขอบสีชัด และชื่อ English พร้อมสีสำรองระหว่างโหลดภาพ
- แก้ Color Cycle ให้แสดงทั้งหน้า Rules ภาษาไทยและ English
- โลโก้บนทุกหน้าในเกมกลับ `/core7/`; เฉพาะหน้า `/core7/` กลับหน้าเว็บหลัก

## 2026-08-02 — v0.3 Beta

- เปิดสถาปัตยกรรม multiplayer แบบ server-authoritative ผ่าน Cloudflare Pages Functions + D1
- ใช้รหัสห้องตัวเลข 4 หลัก (`0000–9999`) ที่ server จองแบบ atomic และคืนเมื่อหมดอายุ
- เพิ่ม Public Lobby พร้อม Refresh, empty/error/loading state และ atomic Join
- สร้างห้องได้แบบ Quick Match, Best of 3 และ Best of 5
- Series ใช้ Starting Hand เดิมทุก Match และเปิดเผยมือเต็มเมื่อจบ Series
- local player อยู่ฝั่งซ้ายเสมอบนเครื่องของตน
- ไพ่ที่ผู้แพ้ทิ้งถูกเปิดเผยในโต๊ะ, history และ summary
- เพิ่มสรุปแยกผู้เล่น ไพ่ที่เล่น ไพ่ที่ทิ้ง และจำนวนสี
- ลดบอทเหลือ EASY (สุ่ม) และ HARD (คิดจากข้อมูลสาธารณะ)
- เพิ่ม sound effects แบบ Web Audio พร้อมปุ่ม mute และบันทึกค่าบนอุปกรณ์
- Tutorial แสดงผู้เล่นฝั่งซ้าย เพิ่ม TH/EN toggle และอธิบาย Quick/BO3/BO5
- รีเฟรช FIRST HAND ทั้ง 28 ใบเป็น procedural SVG `ART v0.3.0`
- เพิ่ม reconnect polling, opaque bearer token, hashed room credentials, idempotent action และ state version
- ปรับจังหวะรอบสุดท้ายให้พลิกไพ่และอ่านผล Round ก่อนประกาศผล Match
- เปลี่ยนกองหงายเป็น `Discard`: จอกว้างเปิด/ซ่อนได้และโต๊ะกลับมากึ่งกลางเมื่อซ่อน ส่วนจอแคบใช้ drawer
- แสดงใบทิ้งของผู้แพ้ค้างบนโต๊ะ, ในกองหงาย และบนจอผล Match
- เปลี่ยนข้อความจบเกมเป็น `YOU WIN`, `YOU LOSE` และ `DRAW`
- แสดง Public Lobby พร้อม Refresh/Join บนหน้า `/core7/play/`
- แสดงกติกาเป็นบรรทัดเดียวใต้โต๊ะ พร้อมตัวนับ `OUT` ของทั้งสองฝั่ง
- เพิ่มการปัดการ์ดขึ้นเพื่อเลือกและ Lock ทันที พร้อมเสียง fling และ haptic
- รวมช่อง Room Code ไว้ใน Public Lobby และตัดปุ่มเข้าห้องที่ซ้ำออก
- จัด Round Timeline แบบสมมาตร โดยวางใบทิ้งกรอบเส้นประใต้ฝั่งเจ้าของการ์ด
- โลโก้ myClover มุมซ้ายบนกลับไปหน้า Index หลัก
- เพิ่ม ART v0.4 Pilot: ภาพเต็มใบ `JOY`, `CURIOSITY`, `PATIENCE`, `BUILD` และ Generic 4 สีบน template สองภาษาเดียวกัน

## 2026-08-01 — Manual Cosmetic / Face-up Fix

- แก้รายละเอียด cosmetic ด้วยมือหลังการสร้างเวอร์ชันแรก
- ปรับการแสดงการ์ดหงายและข้อมูลบนโต๊ะให้อ่านง่ายขึ้น

## 2026-07-31 — v0.1

- CORE7 เวอร์ชันแรกเกิดจาก one-prompt build
- วางกติกา ไพ่ 4 สี Hand Builder และ flow การเล่นพื้นฐาน

> เลขเวอร์ชันข้ามจาก v0.1/manual patch เป็น v0.3 Beta ตามชื่อ release ที่กำหนด ไม่มีการสร้าง v0.2 ย้อนหลัง
