# Route Guard — /xircle/explore/

> Reviewed: 2026-08-26  
> Reviewed against main: `73f5115fd5ead8274f614eecfe2dd94d87b7d207`  
> Runtime: `index.html`  
> Global source: `/xircle/XIRCLE_ROUTE_SOURCE.md`

## Job
จุดเซฟหลังจบเส้นแรกและ hub ไปทุกห้อง

## Flow
- **Entry:** หลัง main journey unlock หรือ nav
- **Exit:** สมุดแมวขาว, ความรู้, X-VISOR/CARE, RoutineX, deep info

## สิ่งที่ผู้ใช้ต้องเข้าใจเมื่อออกจากหน้านี้
พักได้ เลือกต่อได้ กลับมาได้ แมวขาวช่วยจำทาง

## Locks — ห้ามทำหาย
หนึ่งใน 5 ☁️SAVE; SAVE = auth/cloud save ไม่ใช่ progress rail; cat ไม่ครองจอ

## Dependencies / จุดเชื่อม
state.js, shared save/auth, whitecat assets

## กฎร่วม
- อ่าน `/xircle/XIRCLE_ROUTE_SOURCE.md` และ `/xircle/ROUTE_INDEX.md` ก่อนเปลี่ยน flow ข้ามหน้า
- Thai-first; ใช้ศัพท์อังกฤษเมื่อเป็นชื่อระบบ/ผลิตภัณฑ์ที่จำเป็น
- ฝั่ง White Cat ใช้คำหลัก **สมุดแมวขาว**; ชื่อระบบเมื่อจำเป็นคือ **White Cat Care**
- `/xty/` คงเป็น technical route ได้ แต่ห้ามดึง XTY/ตี้กลับมาเป็น narrative หลัก
- ใช้คำ **ข้อมูลเชิงลึก**; ห้ามใช้คำเก่าที่ owner เลิกใช้
- Health data = sensitive data: consent, เห็นเท่าที่จำเป็น, ไม่วินิจฉัย
- ตรวจ ratio จาก artwork จริง; อย่าครอป baked UI/text สำคัญ
- Controls ต้องใช้ได้ทันที; feedback/copy ต้องไม่ทำให้ CTA กระโดดตำแหน่ง
- Product/claim/revenue/formula ที่ไม่ยืนยัน: ไป Source/Unresolved และ **ห้ามเดา**

## Before merge
- เดิน **entry → interaction → exit** จริงบน mobile และ desktop
- ตรวจ CTA/feedback ไม่กระโดด, links ไม่ตัน, naming ไม่ย้อนคำเก่า
- ตรวจภาพไม่บิด/ไม่แหว่งสาระ และไม่มีพื้นที่ตายผิดปกติ
- ถ้าแก้ Job, Entry, Exit, State, Asset หรือ Naming โดยตั้งใจ ให้ update `ROUTE.md` ใน PR เดียวกัน
- ถ้ามี route ใหม่ที่มี `index.html` ต้องมี `ROUTE.md` ก่อน merge
