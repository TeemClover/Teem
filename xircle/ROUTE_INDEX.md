# Xircle Route Guard Index — myClover

> Inventory ของทุก URL route ใต้ `/xircle/` ที่มี `index.html` และต้องมี `ROUTE.md` ประจำ folder.

Reviewed: 2026-08-20 · Routes: **58** · Global source: `/xircle/XIRCLE_ROUTE_SOURCE.md`

## Maintenance contract

1. ก่อนแก้ route ให้อ่าน `ROUTE.md` ใน folder นั้น + global source.
2. ถ้าแก้ flow ข้ามหน้า ให้อ่าน guard ของ entry และ exit ทุกหน้า.
3. ถ้า Job, state, asset, naming หรือ exit เปลี่ยน ให้อัปเดต guard ใน PR เดียวกัน.
4. Owner decision ใหม่ชนะ guard เก่า แล้วต้องแก้ guard ให้ตาม decision ใหม่.
5. Route ใหม่ที่มี `index.html` ต้องมี `ROUTE.md` ก่อน merge.

## Global invariant

- Xircle App = **Measure → Record → Score → Trend → Feedback**
- myClover Xircle Route = **Experience → Understand → Interpret → Choose → Repeat → Care → Together**
- Main journey = **Xircle → Human Care → X-VISOR → RoutineX → สมุดแมวขาว / White Cat Care → Review Xircle**
- Website route ไม่สร้าง production tracker/scoring/device engine ซ้ำ Xircle App.
- Thai-first; `สมุดแมวขาว` เป็นคำหลัก.
- **Public handoff ไปสมุดแมวขาวต้องไป `https://teambook.me/*` โดยตรง.** `/xty/` อยู่ได้เฉพาะ internal repo/compatibility implementation และห้ามใช้เป็น public destination จาก Xircle.
- `Legacy` ห้ามใช้; Deep Reference/Reference Library → `ข้อมูลเชิงลึก`.
- Health data: consent + เห็นเท่าที่จำเป็น + ไม่วินิจฉัย.
- Mobile story: controls ทันที; feedback ห้ามดัน CTA.
- Artwork: ตรวจ ratio ไฟล์จริง; crop เฉพาะภาพที่ไม่เสีย baked UI/text.
- Product/claim/revenue/formula ที่ไม่ยืนยัน = เปิด Source/Unresolved, ห้ามเดา.

## Route inventory

### Experience / activation
`/xircle/` · `/xircle/start/` · `/xircle/care/` · `/xircle/opportunity/` · `/xircle/routinex/` · `/xircle/circle/` · `/xircle/care/party/` · `/xircle/ghost/`

### Hub / knowledge
`/xircle/explore/` · `/xircle/learn/` · `/xircle/learn/topic/` · `/xircle/products/` · `/xircle/hardware/` · `/xircle/doc/`

### Deep routes
Academy 2 · App 9 · Commerce 4 · Ecosystem 1 · Habix 7 · RoutineX 3 · Source 5 · XOS 6 · X-VISOR 7.

## Definition of Done

- Job เดิมยังทำได้ หรือ guard ถูกเปลี่ยนโดยตั้งใจ
- Entry/Exit ไม่มี dead-end
- mobile/desktop ผ่าน visual QA
- CTA ไม่กระโดดจาก feedback/copy
- asset ratio/crop ถูกต้อง
- naming ไม่ย้อนคำเก่า
- health/product/business claims มี source/boundary
- ไม่สร้าง App runtime ซ้ำ
- route ใหม่มี local guard และถูกนับใน index
