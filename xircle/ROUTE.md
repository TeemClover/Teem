# Route Guard — /xircle/

> Reviewed: 2026-09-09
> Reviewed against main: `85f5b2ac13dae3757786403f514e90e40a72434b`
> Runtime: `index.html`
> Global source: `/xircle/XIRCLE_ROUTE_SOURCE.md`

## Job
ทำให้คนลองเห็นคุณค่าจากวันตัวอย่าง จนอยากนัด XIRCLE Experience กับข้อมูลและชีวิตจริงของตัวเอง

## Flow — V3 owner directive, 2026-09-08
- Entry: `/xircle/` starts a fresh sample; `#appointment` and legacy `#start` return to the appointment invitation.
- Six actions: sleep → food shutter → movement / day assembly → seven nights → context + Teem / Ako → sample becomes real.
- Primary exit: `/meet/?intent=health&from=xircle&open=booking`; no account or app prerequisite.
- Optional exit after the payoff: `/xircle/learn/`. All legacy ecosystem routes remain directly accessible.

## Locks
- V3 supersedes the previous mandatory Human Care exit and V2 registration/download sequence.
- Sample values are fictional; the same seven bedtimes remain unchanged across contexts. No invented health score or diagnosis.
- Shutter visibly captures, holds, records and docks before the next question. Back and replay cancel pending motion.
- State stays in memory. Never read, clear or write legacy journey keys. Five-digit `invite`, `xty`, or `mode=join&c=` links retain the existing TeamBook destination.
- Preserve the original V5 assets and knowledge ecosystem. App truth remains: Habit Score = Eat + Move + Sleep; body composition is separate.

## Dependencies
`index.html`, `experience-v3.js`, `experience-v3.css`, shared typography, repaired `assets/v3`, selected `assets/v5`, and real `/meet/img/` portraits. No legacy runtime or telemetry import. V2 runtime files are retained but not loaded.

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
