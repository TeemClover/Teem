# Xircle Route Guard Index — myClover

> สารบัญ route guard สำหรับทุก URL ใต้ `/xircle/` ที่มี `index.html`

Reviewed: **2026-08-26**  
Reviewed against main: `73f5115fd5ead8274f614eecfe2dd94d87b7d207`  
Route guards: **58 routes**

## วิธีใช้

1. ก่อนแก้ route ไหน อ่าน `ROUTE.md` ใน folder นั้น
2. ถ้าแก้ flow ข้ามหลายหน้า อ่าน `/xircle/XIRCLE_ROUTE_SOURCE.md` + guard ของ entry/exit ทุกหน้า
3. ถ้า runtime เปลี่ยน Job / State / Asset / Naming / Exit ให้ update guard ใน PR เดียวกัน
4. Owner decision ใหม่ชนะ guard เก่า แต่ต้องแก้ guard ให้ตามในงานเดียวกัน
5. Route ใหม่ที่มี `index.html` ต้องมี `ROUTE.md` ก่อน merge

## Global invariant

**Xircle website route ไม่ใช่ Xircle App เวอร์ชันเว็บ**

- Xircle App: `Measure → Record → Score → Trend → Feedback`
- myClover Xircle Route: `Experience → Understand → Interpret → Choose → Repeat → Care → Together`

Main experience:

**Xircle → Human Care → X-VISOR → RoutineX → สมุดแมวขาว / White Cat Care → Review Xircle**

## Experience / activation
- `/xircle/` — One Day with Xircle
- `/xircle/start/` — Choose One Thing
- `/xircle/care/` — Human Care
- `/xircle/opportunity/` — X-VISOR Simulator
- `/xircle/routinex/` — RoutineX Interactive Route
- `/xircle/circle/` — สมุดแมวขาว 28 วัน
- `/xircle/care/party/` — White Cat Care Handoff
- `/xircle/ghost/` — Pattern / Review

## Hub / knowledge
- `/xircle/explore/` — ห้องแมวขาว / Safe Room Hub
- `/xircle/learn/` — ห้องความรู้
- `/xircle/learn/topic/` — Knowledge Topic
- `/xircle/products/` — RoutineX Product Window
- `/xircle/hardware/` — Band & Scale Bridge
- `/xircle/doc/` — ข้อมูลเชิงลึก Hub

## Deep groups
- Academy: `/xircle/doc/academy/`, `/xircle/doc/academy/certification/`
- Xircle App: `/xircle/doc/app/` + body/community/eat/habit-score/hardware/maxage/move/sleep
- Commerce: `/xircle/doc/commerce/` + glossary/revenue/roles
- Ecosystem: `/xircle/doc/ecosystem/`
- Habix: `/xircle/doc/habix/` + astamega/fives/flavor/gus/protein-hmb/vita-matrix
- RoutineX: `/xircle/doc/routinex/` + abcd/day-28
- Source: `/xircle/doc/source/` + changelog/glossary/sources/unresolved
- XOS: `/xircle/doc/xos/` + customers/learning/missions/team/wealth
- X-VISOR: `/xircle/doc/xvisor/` + care/claims/coaching/onboarding/privacy/role

## Definition of Done
- Job เดิมยังอยู่ หรือเปลี่ยนโดยตั้งใจและ guard ถูก update
- Entry/Exit ไม่มี dead-end ที่ไม่ได้ตั้งใจ
- mobile/desktop ผ่าน visual QA
- CTA ไม่กระโดดเพราะ feedback/copy
- asset ratio/crop ตัดสินจาก artwork จริง
- naming ใหม่ไม่ย้อนคำเก่า
- health/product/business claims มี source และ boundary
- ไม่สร้าง App runtime ซ้ำใน website experience
- route ใหม่มี local `ROUTE.md` และถูกเพิ่มใน index
