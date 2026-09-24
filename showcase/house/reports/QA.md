# Shower annex and floor-separated stair hall — 2026-09-24

All 74 tests, syntax checks, build, source-data validation and public-output audit pass. The 3D presentation clone also passes geometry validation in its new regression tests. The canonical house.js and interactive 2D plan are unchanged. Main bath fixtures retain their original placement and the shower is entered from bathroom205, with a solid boundary to the hall and stair void.

Browser-inspected the updated HD second floor from above, isolated bathroom205, isolated stair hall on each floor, and exploded view. The new shower has visible fittings, screen and tiled wet area; isolated bathroom geometry no longer shows the unrelated rear wall over the ventilation void. F2 has no lower staircase/backdrop. Exploded stairs remain attached to F1; the landing/chandelier remain attached to F2.

A 390 × 844 viewport override, with the existing browser zoom yielding 354 × 767 CSS pixels, was used for SD/HD shower checks and closer zoom. Document width equaled the viewport width and visualViewport.scale remained1. Fresh navigation starts in SD. This is desktop browser emulation, not physical mobile/Safari testing.

The stair gallery visibly shows1 /1: the approved professional hall/person photo. Public gallery totals23 images in9 collections. Removed P24 and both web derivatives; the new bathroom phone references were not copied into the repository. P25/P26 and the 3D chandelier remain. Local ignored screenshots include shower-hd-mobile.png and shower-stair-exploded.png. Earlier sections describe previous builds.

---

# Mobile controls, close-up HD and column repair — 2026-09-24

User authorized push to main after these refinements. All 65 tests, syntax checks, build, data validation and public-output audit pass after the added stair-hall scope. Final CSS-only adjustments were rebuilt and the public audit rerun. Existing room circulation and SD furniture materials remain intact; no downloads were added.

The final scope includes the owner's newly supplied chandelier photos. Added eight descending rings in both modes, bright faceted crystals in HD, slimmer supported stair flights, landing guards and a double-height isolated presentation. The stair remains visible when viewing floor 2. Ring/tread tests verify at least 2 metres of clearance above occupied treads and an open upper exit; geometry stays within 10k SD / 30k HD triangles for this addition. Rear stair windows were aligned on both floors from the photo reference. Browser-inspected the overall second floor and isolated HD hall on desktop and a narrow mobile viewport, then switched to both real stair photos. Family living-room photo also loads successfully. There are now 24 photos in 9 sets, with 3 confirmed / 4 candidate / 2 context bindings. New web derivatives contain no EXIF metadata; the owner explicitly approved showing people.

Solar layout now places 6 modules on the rear slope and retains the other 8 on the east slope. One shared descriptor generates SD cell planes and HD frames. Tests verify the rear reflection, unchanged east coordinates, panel count and frame/cell alignment. Browser inspection confirms the corrected rear/east banks.

Local Chromium checks covered portrait 360 × 740 and 390 × 844, landscape 844 × 390, and desktop. A later browser zoom state also exercised actual CSS viewports 354 × 767 and 767 × 354. Mobile document height matched viewport height with scrollY = 0; room details scrolled internally. Verified expandable tools, room details, focus mode and Escape, model/plan/photo navigation, and accessible landscape details. The short landscape plan now keeps a visible SVG instead of collapsing to zero height.

- UI uses exactly SD มาตรฐาน / HD ความละเอียดสูง; a refreshed page starts in SD.
- Close-up zoom reaches 12 (previous limit 4). Switching SD/HD at zoom 12 retained the identical camera pose. Focus/orientation changes preserve manual framing.
- Viewport limits and touch-action rules are present. Synthetic cancelable gesturestart/gesturechange, multi-touch move and Ctrl-wheel events were prevented; a one-touch move was not canceled. The wheel still reached house controls and changed house zoom while visualViewport.scale stayed 1. This is event-handler verification, not a physical Safari pinch test; the in-app browser does not support native touch injection.
- Both front column tops meet the fascia underside at y = 2.7. A geometry regression proves zero area of overlapping coplanar visible faces. Front and oblique HD views show clean joins.
- Inspected HD dining/tableware, bathroom 205 basin and roof solar frames in close views. Solar hardware aligns to all 14 existing panels; focused geometry tests cover alignment, recess shape, finite geometry and budgets.
- No console warnings or errors in the inspected final browser session. Temporary viewport and device-emulation overrides were cleared. No new sustained performance benchmark or production deployment claim.

Local ignored screenshots include mobile-hd-dining-closeup.png, mobile-polish-hd-facade.png, mobile-polish-hd-basin.png, mobile-polish-final.png and solar-rear-final.png under reports/screenshots/. Earlier sections describe previous builds.

---

# Optional SD / HD graphics — 2026-09-24

User authorized the current graphics revision for main on 2026-09-24. These are local verification results, not proof of production deployment. Original SD materials/furniture are retained. Front dining glazing is widened in shared geometry for both modes. All 53 tests, syntax checks, build, house validation and public audit pass.

Browser checks used the local Chromium preview at desktop 958 × 937 and mobile viewport 390 × 844, including emulated DPR 2. These are desktop/viewport checks, not physical iPhone/Safari or Android measurements. Verified whole exterior, both floors, exploded view, isolated lounge, master bedroom and dining; plan/model navigation; furniture visibility; HD with the low-power setting. No unexpected rendering warnings/errors appeared; two logged import warnings were deliberately induced by blocking HD chunks for fallback testing.

- Fresh SD loads requested zero HD modules. HD activates on demand and leaves camera pose byte-for-byte unchanged.
- Four repeated HD→SD cycles retained the same camera. After cache warm-up, observed geometries stayed at 232; textures remained 30 in HD / 24 in SD at the same whole-house view. Draw calls returned to 105 in SD versus 431 for the HD multi-pass pipeline. These are counts, not a sustained FPS/memory benchmark.
- Captured SD before and after those cycles: scene pixels match exactly in the inspected scene region. The only full-page pixel difference was a small asynchronously loaded sidebar thumbnail region.
- Returning to SD during an artificially delayed HD import remains SD after all four HD chunks load; no late switch overrides the user's choice.
- Blocking HD module fetches returns to the existing SD scene with a visible refresh hint. Unblocking then refreshing restores normal HD loading.
- Mobile controls fit without horizontal overflow, have 44px touch targets, and remain above the floor dock. Temporary viewport, density and network overrides were removed after verification.
- Private plans and student kits remain unavailable; the built public audit found no prohibited artifacts or stale generated bundles.

Screenshots are local ignored artifacts in reports/screenshots/: graphics-sd-before.png, graphics-sd-after.png, graphics-hd-mobile.png, graphics-hd-whole.png and graphics-hd-dining.png. Earlier release notes below refer to earlier builds.

---

# Flush west elevation release — 2026-09-24

User authorized main publication after one final fix: the upper west face beside bedrooms202/203 now aligns with the lower wall atx=-0.6. Extend adjoining upper slabs/edgewalls/roofeave together and remove the obsolete narrow211ledge. Remaining layout and controls are unchanged from the approved Studio preview.

37 tests pass, including a regression for matching west faces and removedledge; build, data validation and public audit pass. Browser reviewed the same west/front angle as the supplied screenshot: no remaining setback.30 selectable spaces;21photos; no downloadable files. Earlier local-only notes below are historical and superseded by the latest publish instruction. Production deployment is not established by these local checks.

---

# Owner corrections / screen presentation — 2026-09-24

Latest work remains local and uncommitted on `codex/home-explorer`; no push, merge or deployment. Owner explicitly prefers an attractive on-screen model over exact real-world proportions, while keeping the specified doors, circulation and furniture sides.

Build, JavaScript syntax, 36 tests, house validation and public audit pass. New regression checks cover shell closure below floor 2, sole direct carport entry into prep, prep→dining clearance, lounge→hall opening, bathroom routes (201→dressing→205,202→206,203→207), chair facing, distinct bedroom furniture, sofa/desk sides and fixture doorway clearance. No download files are shipped.

Actual desktop browser inspection at958×952: whole/front and rear shell join, isolated lounge, bedroom201/202, bathroom205, diningchairs, and updatedplan door symbols. No browser console errors observed. Removed the spanning curtain pelmets that obscured cutaway rooms; selected camera angles favor visible furniture. Screenshots are local ignored files. No new physical-mobile or performance benchmark claim.

Photo binding now has2owner-confirmed sets(201 bedroom, upstairs lounge),4candidate sets,2context sets. Bedrooms202/203 have no photos. These corrections do not establish surveyed or construction accuracy.

---

# Local Home Studio revision — 2026-09-24

This latest revision is local only: no new commit, push, merge or deployment. Previous main release cf331f57 is unchanged. No plan/guide/ZIP downloads remain in the current local app tree or UI; older release notes below are historical.

Build, JavaScript syntax, 25 tests, geometry validation and public-output audit pass. Added regression checks for independent fixed/movable layers and absence of downloadable artifacts. Browser inspection at measured desktop sizes 958x952 and 1265x720 found no console errors. Verified room collection, isolated living/kitchen/bedroom, separate built-in/furniture toggles and overhead camera. Further current screenshots/checks are stored locally.

Photo-led updates: pale L sofa and patterned cushions, four metal/glass coffee tables, fluted TV cabinetry, mirrored shelving, dining setting, upper kitchen cabinets/backsplash/island, leather platform bed, wall panels/curtains and work desk. Solar modules now occupy adjacent roof faces, with rectangular geometry. Materials and lighting refined. Placement, dimensions and mapping remain provisional; this is a stylized interactive reconstruction, not a photogrammetry scan or surveyed as-built model.

Graphite/blue spatial workbench replaces the earlier cream/green presentation. Grid, camera presets and layer controls support exploration; furniture cannot yet be dragged/repositioned. Current revision prioritizes desktop; no new physical-mobile or full performance benchmark claim.

---

# Release revision — 2026-09-24

Release checks: build, syntax, 23 tests and public audit pass. Browser verified official logo and disabled student-material button; direct local URL checks return 200 for both free SVG plans/logo and 404 for the old guide, source/starter ZIPs, data JSON, download README and source-kit generator.

Official myClover homepage logo replaces the placeholder. Public downloads now contain only two free SVG plans. Student kits, guide, data export and kit generators are removed; the prior ZIP validation below is historical and does not mean those downloads are still public.

# Home Explorer — บันทึกการตรวจงาน

วันที่ตรวจ: 2026-09-24 (Asia/Bangkok)
สาขา: `codex/home-explorer`
ขอบเขต: ตัวอย่าง `/showcase/house/` ในเครื่อง ก่อน commit ส่งมอบ
สถานะ: ไม่พบ blocker จากรายการที่ตรวจด้านล่าง ยังไม่ใช่การรับรองความแม่นยำของบ้านหรือผลทดสอบทุกอุปกรณ์

รายงานนี้รวบรวมผลคำสั่งที่รันจริงและผลตรวจผ่านเบราว์เซอร์ของรอบพัฒนา สร้าง build/ZIP รอบส่งมอบแล้วและรันคำสั่งทุกข้อในตารางซ้ำผ่าน เมื่อ 2026-09-24 03:00–03:01 (Asia/Bangkok) ใช้เวลาตรวจใน `data-validation.json` และ `public-audit.json` ประกอบ ไม่ใช้ commit ก่อนเริ่มพัฒนาเป็นรหัสของ build ใหม่

## สภาพแวดล้อม

| รายการ | ที่ตรวจจริง |
|---|---|
| Runtime | Node.js 26.8.2 |
| Dependencies | Three.js 0.180.0, esbuild 0.25.10 ตาม lockfile |
| เบราว์เซอร์ | Codex In-app Browser, Chromium 153; user agent รายงาน macOS |
| Desktop viewport | 1440 × 900 |
| Mobile emulation | ความกว้าง 360 และ 390 CSS px |
| URL | `http://127.0.0.1:4317/showcase/house/` |
| Rendering | WebGL2; มีการจำลอง context loss และทดสอบทางกลับ |

การจำลอง viewport บน desktop ไม่ใช่การทดสอบ iPhone/Android เครื่องจริง ไม่ได้ทดสอบ Safari เครื่องจริงในรอบนี้

## คำสั่งและผลที่ยืนยันแล้ว

| คำสั่ง | ผล |
|---|---|
| `npm test` | ผ่าน 23 tests: state, polygon, overlap, calibration transform, wall/opening, stair void, mapping gate และ learning export |
| `npm run typecheck` | ผ่าน; ใช้ `node --check` ตรวจ syntax ของ JavaScript ไม่ใช่ TypeScript type analysis |
| `npm run build` | ผ่าน; สร้าง route static และแบ่งโหลดโค้ดฉาก 3D |
| `npm run validate:house` | ผ่าน; รายละเอียดใน `data-validation.json` |
| `npm run audit:public` | ผ่าน; รายละเอียดขนาดและไฟล์ที่ตรวจใน `public-audit.json` |

ZIP starter 2D ตรวจความสมบูรณ์ของ archive และเปิดตัวอย่างจริง เลือกครัวแล้วได้รหัสห้องตรงกัน สลับชั้นแล้วล้าง selection เดิม แปลน SVG เปิดอ่านได้

ZIP โค้ด 3D ถูกแตกลงโฟลเดอร์แยกและทดสอบ `npm ci --offline`, build, syntax check, data validation และ tests 14 รายการที่บรรจุในชุดนั้นผ่าน ไม่มีการอาศัยไฟล์ app จากโครงการภายนอก ชุด 3D ไม่มีภาพถ่าย และใช้ `photoSets = []` โดยตั้งใจ ZIP รอบสุดท้ายสร้างจาก source ล่าสุดและทดสอบแยกซ้ำผ่านครบเมื่อ 03:01 (Asia/Bangkok)

## ข้อมูลบ้านและหลักฐาน

- 2 ชั้น, 31 พื้นที่, 37 แนวผนัง พื้นที่รวมทางสัญจร ระเบียง ช่องลม และที่จอดรถ จึงไม่เรียกว่า 31 ห้องภายใน
- ระดับพื้นหลักชั้น 2 สูงกว่าชั้น 1 อยู่ 3.29 m จากแบบ การแยกชั้นเปลี่ยน display transform โดยไม่แก้ระดับในข้อมูล
- Geometry และ calibration ทั้ง 2 ชั้นเป็น draft ไม่มีสถานะตรวจวัดหน้างานหรือแบบก่อสร้าง
- ค่า maximum fit residual ของสแกนประมาณ 0.08159 m และ 0.04249 m; RMS ประมาณ 0.04285 m และ 0.02063 m ตามลำดับ เป็นความสอดคล้องของจุดปรับแนวสแกน ไม่ใช่ความแม่นยำของอาคารจริง
- รูปสำหรับเว็บ 21 ภาพใน 8 ชุด จาก inventory ต้นทาง 23 ภาพ ภาพ 2 ใบที่มีบุคคลไม่ได้อยู่ในชุดเว็บ
- Photo mapping: 6 candidate sets, 2 exterior/context sets, 0 confirmed bindings โดย UI แสดงข้อจำกัดและไม่มี confirmed room pin
- ความสูง/ความหนาผนัง ช่องเปิด หลังคา ฝ้า เฟอร์นิเจอร์ จำนวนขั้นบันได แผงโซลาร์และสวนบางส่วนเป็นค่าประมาณเพื่อจำลอง

## การใช้งานที่ตรวจผ่านเบราว์เซอร์

| กลุ่ม | ผลที่เห็นจริง |
|---|---|
| โมเดล | เปิดทั้งหลัง ชั้น 1 ชั้น 2 และแยกชั้นได้ เลือกพื้นที่จากฉากจริง รวมที่จอดรถ และได้ข้อมูลพื้นที่ที่สอดคล้องกัน |
| แปลน | ใช้รหัสห้องร่วมกับโมเดล เลือกพื้นที่แล้วข้อมูลตรงกัน เปิดรายการห้องและสลับชั้นได้; ปุ่ม zoom คง keyboard focus และไม่มีข้อความ `null` จากรหัสแปลนที่ว่าง |
| รูปห้องที่ไม่มีหลักฐาน | ห้องน้ำที่ไม่มีชุดภาพแสดง empty state ไม่ยืมภาพภายนอกมาแสดง |
| แกลเลอรี | ภาพแนวตั้งแสดงแบบ contain; Next/Previous, ลูกศรคีย์บอร์ด และ Escape ทำงาน |
| กลับจากรูป | ปิดแกลเลอรีแล้วกลับ lens เดิมและคืน focus ตามทางที่ทดสอบ |
| Modal ระหว่างดูภาพ | เปิดชุดเรียนรู้แล้วกด Escape กลับมา ภาพเดิมยังอยู่ที่ 2 / 3 โดยไม่รีเซ็ต index |
| ฝ้า | เปิดมุมดูฝ้าห้องนั่งเล่นและกดกลับไปมองด้านบนได้ |
| ทัวร์ | Next/Back/Exit ใช้ state ของการสำรวจบ้านและเปลี่ยนจุดได้ |
| Responsive | ที่ความกว้าง 360 และ 390 px ไม่พบ horizontal page overflow; ตรวจภาพหน้าจอแปลนครัวและภาพห้องแนวตั้งที่ 360 px แล้ว |
| WebGL failure | ใช้ `WEBGL_lose_context` ทำให้ context หายจริง → แสดงแปลน fallback → กด retry แล้วโมเดลกลับมาทำงาน |

Console warning ขณะตั้งใจทำให้ WebGL context หายเป็นผลที่คาดไว้ของการทดสอบ fallback ไม่ได้สรุปว่าเป็น error ทั่วไปของการเปิดเว็บตามปกติ

## วงรอบซ้ำ การหยุดวาดเมื่อไม่ใช้งาน และเวลาโหลด

ทดสอบ 20 รอบ `f1 → f2 → exploded → whole` มีข้อมูลดิบใน `cycles.json`:

| จุดเก็บข้อมูล | View | Geometries | Textures | Draw calls |
|---|---|---:|---:|---:|
| ก่อนเริ่ม | exploded | 74 | 6 | 71 |
| หลัง 10 รอบ | whole | 72 | 6 | 73 |
| หลัง 20 รอบ | whole | 72 | 6 | 73 |

จำนวน geometry/texture คงที่ระหว่างรอบ 10 และ 20 ที่ view เดียวกัน ค่าเริ่มต้นเป็นอีก view จึงไม่ใช้ความต่าง 74 → 72 เป็นการวัดการรั่วของหน่วยความจำ ตัวอย่างหลังรอบ 20 ยังมี animation ทำงานอยู่ขณะเก็บค่า ไม่ใช้ค่าเฉลี่ยเฟรมจากตัวอย่างนี้อ้างว่าเป็น FPS benchmark

ตรวจภาวะ idle แยกแล้วจำนวน rendered frames ไม่เปลี่ยนเป็นเวลามากกว่า 30 วินาทีหลังการเคลื่อนไหวสิ้นสุด

การโหลด cold ครั้งที่บันทึก ใช้ network emulation 20 Mbps, RTT 80 ms และปิด cache:

| ค่า | ผลที่บันทึก |
|---|---:|
| `firstReady` นับจาก navigation | 872.6 ms |
| `sceneReady` สำหรับเตรียมฉาก | 268.1 ms |
| ผลรวม transferred resources รวม navigation | 812,669 bytes |

นี่เป็นการสังเกตการโหลดครั้งหนึ่งบน desktop ภายใต้ network emulation ไม่ใช่ผลโทรศัพท์จริงหรือค่าเฉลี่ยหลายรอบ ขนาด gzip ใน `public-audit.json` เป็นค่าประเมินการบีบอัดจากไฟล์บนดิสก์ แยกจาก transferred bytes ที่วัดในเบราว์เซอร์ ไม่มีการทดสอบ FPS ต่อเนื่อง 30 วินาทีในรอบนี้

## ภาพหน้าจอ

ภาพจากเว็บที่รันจริงอยู่ใน `reports/screenshots/` ซึ่งเก็บในเครื่องและไม่ commit รายการที่ตรวจพบขณะเขียนรายงาน:

- `desktop-01-whole-front.png`
- `desktop-02-f1-cutaway.png`
- `desktop-03-f2-cutaway.png`
- `desktop-04-exploded.png`
- `desktop-05-living-ceiling.png`
- `desktop-06-living-photo.png`
- `desktop-07-kitchen-plan.png`
- `desktop-08-webgl-fallback.png`
- `desktop-09-whole-side.png`
- `mobile-emulated-01-whole-390.png`
- `mobile-emulated-02-f1-360.png`
- `mobile-emulated-03-kitchen-plan-360.png`
- `mobile-emulated-04-living-portrait-360.png`

ชื่อ `mobile-emulated` ระบุว่าเป็น viewport emulation ภาพทั้งหมดมาจากเว็บที่รันจริง ไม่ใช้ภาพอ้างอิงหรือภาพที่สร้างขึ้นแทนผลลัพธ์

## ความเป็นส่วนตัวและการเผยแพร่

Public-output audit ตรวจ HTML, bundles, derivatives และไฟล์ในชุดดาวน์โหลด รวม archive ซ้อน ไม่พบ raw PDF, source scan, private source paths, ชื่อไฟล์ต้นฉบับที่กำหนดตรวจ, sourcemap หรือ EXIF/XMP ใน WebP ณรอบที่ผ่าน รูปสำหรับเว็บได้รับการครอบและปิดรายละเอียดที่ระบุตัวบุคคลตามการเตรียม asset; การตรวจอัตโนมัติไม่ได้ยืนยันสิทธิ์ภาพแทนเจ้าของผลงาน

Local preview bind ที่ `127.0.0.1` และจำกัด route `/showcase/house/` มีการกัน path นอกโฟลเดอร์และไดเรกทอรีพัฒนา ไม่ได้แก้ระบบบัญชี auth/billing หรือ routing ของเว็บเดิม ต้นฉบับและ ledger ส่วนตัวเก็บนอก repo

ชุดเรียนรู้ระบุขอบเขตการคัดลอกโค้ดและข้อมูลตัวอย่าง ไม่มีการมอบสิทธิ์ภาพถ่ายหรือแบบต้นฉบับแทนบุคคลอื่น และแนบ IBM Plex OFL พร้อมฟอนต์ การเผยแพร่ยังเป็นขั้นตอนแยกจากผล QA นี้ ไม่มีการ merge หรือ production deployment จากการทดสอบในเครื่อง

## สิ่งที่ยังไม่ได้ทดสอบหรือยังรอยืนยัน

- iPhone Safari และ Android Chrome เครื่องจริง รวม pinch/two-finger interaction บนอุปกรณ์จริง
- การตรวจ accessibility แบบครบถ้วนด้วย screen reader, text zoom 200% และทุกเส้นทางคีย์บอร์ด
- FPS benchmark ต่อเนื่อง 30 วินาทีบนหลายอุปกรณ์ รวม memory/performance profiling ระยะยาว
- การทดลองกับผู้ใช้ใหม่ 5 คนและเวลาในการทำงานจริง
- การยืนยัน geometry/calibration และ photo-to-room mapping โดยเจ้าของ/ผู้ตรวจหลักฐาน
- ข้อมูลเครดิตและสิทธิ์ภาพ/แบบต้นทางสำหรับการนำไปใช้เชิงพาณิชย์นอกขอบเขตตัวอย่างที่เจ้าของโครงการให้ไว้

ไม่มี blocker ที่พบในขอบเขตทดสอบข้างต้น ข้อจำกัดที่คงอยู่เป็นส่วนหนึ่งของสถานะตัวอย่าง draft และต้องคงแสดงตามจริงก่อนอ้างความพร้อมใช้งานในบริบทที่กว้างกว่ารอบนี้
