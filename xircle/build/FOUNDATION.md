# XIRCLE PLAYABLE — FOUNDATION BLUEPRINT (สำหรับ agent ที่มาสร้างต่อ)

**สถานะ:** เสาเข็มตอกแล้ว + Visual Pass รอบแรกเสร็จ
**สร้างเมื่อ:** 2026-08-13
**อ้างอิง:** `XIRCLE_PLAYABLE_PRODUCT_BUILD_BLUEPRINT_v0.3_20260813.md` (blueprint)
และ `XIRCLE_PROJECT_SOURCE_OF_TRUTH_v1_2026-08-11.md` (content authority — ชนะเสมอเมื่อขัดกัน)

> **NORTH STAR: XIRCLE IS NOT A WEBSITE YOU READ. IT IS A LOOP YOU ENTER.**

เอกสารนี้เขียนให้ agent ตัวถัดไป (Opus / GPT / มนุษย์) เข้ามาสร้างต่อได้โดยไม่ต้องเดาอะไรเลย

---

## 1. สิ่งที่สร้างเสร็จแล้วในรอบนี้

### เส้นทางหลัก `/xircle/` (index.html)
Playable first-time journey ครบ 14 ฉากตาม state machine ของ blueprint §5:

| Scene | เนื้อหา | Interaction | สถานะ |
|---|---|---|---|
| S0 | Hook — "รู้จริง หรือแค่จำได้?" | CTA เดียว | ✅ |
| S1 | Memory vs Measurement | เลือก 1 ใน 3 (ไม่เก็บ ไม่ track) | ✅ |
| S2 | Sleep | เลือก 1 ใน 3 → sleep arc | ✅ |
| S3 | Eat / Snap AI | แตะจาน → scan sweep → demo macro cards | ✅ |
| S4 | Move | เลือก 1 ใน 3 → ring + glowline | ✅ |
| S5 | Night | passive, auto-advance 2.4s (reduced: 0.7s) | ✅ |
| S6 | Morning Payoff | Habit Score demo ring + explain expand + Behavior/Outcome split | ✅ |
| S7 | Adjust One | เลือก 1 ใน 3 (track แค่ boolean) | ✅ |
| S8 | 28-Day Fast Forward | behavior เร็ว / outcome ช้า animation | ✅ |
| S9 | RoutineX ABCD | ประกอบ 5 ชั้น + C trust moment | ✅ |
| S10 | Products Reveal | การ์ด 3 ชั้น + LOCKED ingredients | ✅ |
| S11 | Hardware | Band ↕ Scale split | ✅ |
| S12 | Circle Preview | mock ชัดเจน + invite demo (ไม่หลอกว่า live) | ✅ |
| S13 | Role Fork | MY HEALTH / HELP OTHERS + replay | ✅ |

### หน้าอื่นที่ใช้งานได้จริง
- `/xircle/start/` — Returning Home (§20): greeting ตามเวลาจริง, Adjust One (local-only), Circle Pulse preview, tabs
- `/xircle/opportunity/` — X-VISOR Job Simulator (§25–27): worklist ที่มี signal dot เต้นจริง → Care Brief timeline (SIGNAL/WHY/MISSION/FOLLOW-UP) → opener choice + feedback → workload ×5 → career path (ไม่มีตัวเลขรายได้)
- `/xircle/circle/` — Circle façade (§18–19): Circle Pulse วันนี้, pulse strip 7 วัน, member list (alias + มา/ยังไม่มา เท่านั้น), invite demo — ติดป้าย CIRCLE PREVIEW ตลอด
- `/xircle/ghost/` — Progress façade (§22): กราฟแนวโน้ม 28 วันสลับได้ 3 ค่า (Weight / Pure Muscle / Fat Mass) พร้อม delta = latest − baseline, ชุด DEMO ชัดเจน
- `/xircle/learn/` — Codex façade (§30): การ์ดความรู้พร้อม status badge (CANON / DEMO / PROVISIONAL) เปิด source drawer ได้

### หน้าจองโซน (placeholder มีโครง มีแผนเขียนบอกในหน้า)
`/xircle/routinex/` `/xircle/hardware/` `/xircle/products/` `/xircle/care/` — ตอนนี้เป็น **สะพาน** ชี้เข้าเอกสารจริงใน `/xircle/doc/` แทนการบอกว่า "จะสร้างเฟสถัดไป"

### โซนเอกสารอ้างอิง `/xircle/doc/`
เดิมคือ `/xircle2/` (ซึ่งก่อนหน้านั้นคือ `/xircle/` เอง) — ย้ายเข้ามาเป็น `/xircle/doc/` แล้ว 44 หน้า

**สิ่งที่ต้องรู้ถ้าจะแก้โซนนี้:**
- หน้าในโซนใช้ **relative path เกือบทั้งหมด** จึงย้ายได้โดยไม่พัง
- `doc/_shared/story.js` มี **route table ที่ key ด้วย path เดิม `/xircle/...`** และ normalise pathname ที่ต้นทาง (รองรับทั้ง `/xircle/doc/...` และ `/xircle2/...`) — ห้ามลบตัว normalise ไม่งั้น hero visual ทั้งโซนหายเงียบ ๆ
- asset ของโซนนี้อยู่ที่ `doc/assets/` แยกจาก `assets/` ของโซนเล่น
- `vercel.json` มี redirect ครบทั้ง `/xircle2/*`, `/xircle/app/*`, `/habix`, `/xvisor` ฯลฯ → `/xircle/doc/*` เพื่อไม่ให้ลิงก์ที่เคยแชร์ไปแล้วตาย

### Visual layer (Visual Pass รอบแรก)
- `assets/lifestyle/` — ภาพถ่ายจริงจาก source เดิม (eat / sleep / move / morning / community / xvisor / source) ทำ responsive 640·960·1440 + `hook` crop เฉพาะจอแรก
- `assets/product/` — ภาพแพ็กจริง G.U.S.+ / Protein HMB+ / AstaMega+ / Vita Matrix / กล่อง RoutineX
- `assets/device/` — Band และ Scale crop ออกมาจาก brochure composite **โดยตัดตัวเลขคะแนน/ค่าที่ baked ไว้ทิ้ง** เพื่อไม่ให้ดูเหมือนผลวัดจริง
- Desktop เป็น **two-layer cinematic**: narrative column (≤560px) + framed visual panel — มือถือใช้ภาพเดียวกันเป็น backdrop ที่ scrim แล้ว
- ทุกภาพเป็น source-backed ไม่มีการสร้าง ingredient label / measurement result / device spec ปลอม (§40)

### Shared foundation (`_shared/`)
| ไฟล์ | หน้าที่ | หมายเหตุ |
|---|---|---|
| `typography.css` | self-hosted IBM Plex Sans Thai + Manrope | ห้ามใช้ font CDN ภายนอก |
| `playable.css` | design tokens + ทุก component ของ journey | โทน: void/emerald + cream + cyan/green/gold; **แดงห้ามใช้ตัดสินพฤติกรรม** |
| `state.js` | `window.XState` — 3 ชั้น: memory / session / local | **health-like choices อยู่ใน `XState.memory` เท่านั้น ห้าม persist** |
| `analytics.js` | `window.XAnalytics.track(name, props)` — adapter | allowlist ตาม §35 บังคับในโค้ด; string props ถูก drop ทิ้งเสมอ |
| `playable.js` | scene engine + interaction ทุกฉากของ index.html | generic: `[data-next]`, `[data-choice-group]`, enter/leave hooks |
| `source-drawer.js` | `[data-source-id]` → bottom drawer จาก `data/sources.json` | ชั้น transparency ของ §30 |

### Data contracts (`data/`)
- `flags.json` — analytics mode / debug / public_launch / live_circle
- `sim.json` — ค่า demo visual เท่านั้น (**ห้าม label เป็น score จริง**)
- `canon.json` — ข้อความ canon ที่ public-safe พร้อม status/visibility/source
- `products.json` — ABCD, no price, `ingredients._status: "LOCKED"`
- `opportunity.json` — เคสสมมติ + openers + workload template
- `sources.json` — entries ของ source drawer

### Routing (แก้ใน `vercel.json` ระดับ root แล้ว)
- โซนเก่าทั้งหมดถูก rename เป็น `/xircle/doc/` (archive/freeze ตาม Phase A ข้อ 1)
- ลิงก์เก่าที่คนเคยแชร์ (`/xircle/app`, `/xircle/habix`, `/app`, `/habix`, ฯลฯ) redirect ไป `/xircle/doc/...`
- asset absolute paths ที่โค้ดเก่าอ้าง (`/xircle/_shared/story.css`, `/xircle/assets/source/...`) redirect ไป `/xircle/doc/...`
- ⚠️ **เมื่อโซนใหม่เริ่มใช้ `assets/source/` ของตัวเอง ต้องลบ redirect 3 บรรทัด assets ใน vercel.json ก่อน** ไม่งั้นไฟล์ใหม่จะโดน redirect ทับ

---

## 2. กติกาที่ห้ามละเมิด (บังคับทุกเฟสต่อจากนี้)

1. **Habit Score = Eat + Move + Sleep เท่านั้น** / Body Composition เป็น Outcome คนละชั้น
2. Demo ทุกชิ้นต้องมี label DEMO — ห้ามทำให้ดูเหมือนการคำนวณจริง
3. ห้ามแต่งเอง: สูตรสุขภาพ, ราคา, ส่วนผสม/dose/CFU, compensation %, medical claim, DNA mapping, income guarantee
4. Health-like choices (sleep/eat/move/adjust values) **ห้ามส่งเข้า analytics และห้ามลง storage** — memory เท่านั้น (`state.js` ออกแบบไว้แล้ว อย่า bypass)
5. Analytics event ใหม่ต้องเพิ่มใน allowlist ของ `analytics.js` และต้องอยู่ในชื่อชุด §35 — ห้ามส่ง free-text
6. Circle Pulse วัด "โผล่มา" เท่านั้น — ไม่มี ranking, ไม่มี red state บนตัวคน, ไม่มี collective failure
7. ห้าม fake live multi-user state — Circle จริงต้องมี backend + consent (V0.4+)
8. สินค้าโผล่หลัง behavior เสมอ (ลำดับ §55: PERSON → BEHAVIOR → FEEDBACK → ROUTINE → PRODUCT → DEVICE → CIRCLE → CARE → OPPORTUNITY)
9. `noindex,nofollow` ทุกหน้า จนกว่าเจ้าของโปรเจกต์สั่งเปิด launch
10. Mobile-first: ≤3 ตัวเลือกต่อการตัดสินใจ, thumb ≥44px, ไม่มี hover-dependency, reduced-motion ต้องรองรับ
11. สะกด **Habix** เท่านั้น
12. X-VISOR ≠ แพทย์ ≠ วินิจฉัย — เคสทั้งหมดเป็น fictional จนกว่ามีระบบจริง

---

## 3. งานถัดไปเรียงตามลำดับ (Phase C → F ของ blueprint §45)

### ทันที (ขัดเกลาสิ่งที่มี)
- [ ] `/xircle/start/` ยังไม่ได้ทำ visual pass — ควรได้ zone-hero + ภาพเหมือนหน้าอื่น
- [ ] เพิ่ม 7-Day Checkpoint mock ใน `/xircle/start/` (§21)
- [ ] Day-state ใน start/: นับ streak จาก `XState.local` (มี `visitCount`, `lastVisitDate` รอแล้ว)
- [ ] จานอาหารใน S3 ยังเป็น SVG abstract (ตัวเลือก) — ภาพถ่ายจริงจะดีกว่าถ้าหา source ที่ไม่ปลอมผลวิเคราะห์ได้

### รอบรีวิวที่ปิดไปแล้ว (GPT review, 2026-08-13)
- [x] ไม่มีภาพจริงเลย → นำ asset จาก source กลับเข้ามาทั้งชุด
- [x] Desktop แคบเหมือนมือถือยักษ์ → two-layer cinematic composition
- [x] หลัง journey ตกไปเจอ placeholder → circle / ghost / learn เป็น façade เต็มแล้ว
- [x] X-VISOR simulator ต้องดูเหมือนหน้าจอทำงานจริง → case worklist + care brief timeline
- [x] S1 กด CTA ผ่านก่อนอ่านข้อความสำคัญ → CTA ถูก hold จนบรรทัดสุดท้ายขึ้นครบ
- [x] RoutineX 5 กดเหมือน checklist → C เป็น moment ใหญ่ แล้ว auto-snap ที่เหลือ
- [x] copy CTA หลัง Product ฟังเหมือนถามแหล่งข้อมูลสินค้า → "แล้วเรามองเห็นสองชั้นนี้ได้ยังไง?"

### Phase C เต็ม — System Reveal deep dives
- [ ] `/xircle/routinex/` — 28-Day Run interactive เต็มหน้า
- [ ] `/xircle/products/` — การ์ดเต็ม + source drawer ครบทุกตัว (data พร้อมแล้วใน `products.json`)
- [ ] `/xircle/hardware/` — เรื่องเล่าเต็ม; ใช้ source-backed device visual เท่านั้น

### Phase D เต็ม — Social Preview
- [ ] `/xircle/circle/` — Circle Preview เต็มรูปแบบ (label CIRCLE PREVIEW เสมอ)
- [ ] `/xircle/ghost/` — visual prototype PAST YOU ↔ TODAY (Weight / Pure Muscle / Fat Mass เท่านั้น, delta = latest − baseline)

### Phase E เต็ม — Care
- [ ] `/xircle/care/` — X-VISOR intro + XOS Care Engine story (SIGNAL → PRIORITY → MISSION → HUMAN ACTION → FOLLOW-UP)
- [ ] ขยาย opportunity simulator: เพิ่มเคส, เพิ่ม branching ของ opener

### Phase F — Codex
- [ ] `/xircle/learn/` — ย้าย/เขียนเนื้อหาความรู้เข้า Codex layer พร้อม status badge
- [ ] Deep Dive overlay จาก main journey (ตอนนี้ใช้ source drawer เป็น hook แล้ว)

### V0.4+ (ต้องมี backend — ห้ามทำเป็น static หลอก)
- Live Circle (data model ใน blueprint §47), consent system (§48), real Ghost (§49), Care Mission Engine (§50)

---

## 4. สถาปัตยกรรมที่ agent ถัดไปควรรู้

- **ไม่มี build step** — vanilla HTML/CSS/JS เสิร์ฟตรงจาก repo (เหมือนทั้งเว็บ myclover)
- ทุก path เป็น absolute `/xircle/...` (Phase A ข้อ 7)
- Scene ใหม่ใน journey: เพิ่ม `<section class="scene" data-scene="Sx" data-progress="nn">` + ปุ่ม `data-next` — engine จัดการที่เหลือ
- Choice group ใหม่: `data-choice-group="ชื่อ" data-value="ค่า"` → ค่าเข้า `XState.memory` อัตโนมัติ + reveal `[data-response]` และ `.px-cta.reveal-later` ในฉากเดียวกัน
- หน้าใหม่นอก journey: ใช้ `class="zone-page"` + `typography.css` + `playable.css` แล้วได้ design system ทั้งชุด
- JSON ทุกไฟล์มี `_note` อธิบาย contract ของตัวเอง — อ่านก่อนแก้
- Analytics ปัจจุบัน: push เข้า `window.dataLayer` (ถ้ามี) + console เมื่อ `flags.analytics = "console"` — จุดต่อ collector จริงอยู่ที่ฟังก์ชัน `send()` ใน `analytics.js` จุดเดียว

## 5. Acceptance ที่รอบนี้ผ่านแล้ว (Phase A + B ตาม §45)

- [x] no broken images (ทุก visual เป็น inline SVG/CSS)
- [x] absolute paths ทั้งหมด
- [x] journey จบได้มือเดียวบนมือถือ, การตัดสินใจจริง 3 ครั้ง (Sleep/Eat/Move)
- [x] feedback <300ms (CSS transition ทันทีตอนแตะ)
- [x] DEMO labels ทุกจุดที่เป็นตัวอย่าง
- [x] ไม่มีสูตรที่ถูกนำเสนอเป็น production
- [x] Eat + Move + Sleep → Habit Score เข้าใจได้จากการเล่น (S6)
- [x] C = Control ชัดว่าไม่ใช่สินค้า / สินค้าโผล่หลัง behavior / Band vs Scale แยกชัด / Body Comp แยกจาก Habit Score
- [x] Circle เป็น Preview ชัดเจน / Pulse = showed up
- [x] opportunity ไม่มีตัวเลขรายได้ งานมาก่อนเงิน
- [x] reduced motion รองรับทุกฉาก
