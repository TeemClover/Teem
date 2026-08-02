# myClover: CORE7 — Patch Notes

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
- จอกว้างแสดงกองหงายถาวร ส่วนจอแคบใช้ drawer แบบ mobile
- แสดงใบทิ้งของผู้แพ้ค้างบนโต๊ะ, ในกองหงาย และบนจอผล Match
- เปลี่ยนข้อความจบเกมเป็น `YOU WIN`, `YOU LOSE` และ `DRAW`
- แสดง Public Lobby พร้อม Refresh/Join บนหน้า `/core7/play/`
- ฝังกติกาวงสีลงบนลายโต๊ะ พร้อมตัวนับสีที่เปิดเผยแล้วของทั้งสองฝั่ง
- เพิ่มการปัดการ์ดขึ้นเพื่อเลือกและ Lock ทันที พร้อมเสียง fling และ haptic
- รวมช่อง Room Code ไว้ใน Public Lobby และตัดปุ่มเข้าห้องที่ซ้ำออก
- จัด Round Timeline แบบสมมาตร โดยวางใบทิ้งกรอบเส้นประใต้ฝั่งเจ้าของการ์ด
- โลโก้ myClover มุมซ้ายบนกลับไปหน้า Index หลัก

## 2026-08-01 — Manual Cosmetic / Face-up Fix

- แก้รายละเอียด cosmetic ด้วยมือหลังการสร้างเวอร์ชันแรก
- ปรับการแสดงการ์ดหงายและข้อมูลบนโต๊ะให้อ่านง่ายขึ้น

## 2026-07-31 — v0.1

- CORE7 เวอร์ชันแรกเกิดจาก one-prompt build
- วางกติกา ไพ่ 4 สี Hand Builder และ flow การเล่นพื้นฐาน

> เลขเวอร์ชันข้ามจาก v0.1/manual patch เป็น v0.3 Beta ตามชื่อ release ที่กำหนด ไม่มีการสร้าง v0.2 ย้อนหลัง
