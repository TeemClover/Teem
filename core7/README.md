# myClover: CORE7

เกมการ์ดออนไลน์ Mobile-first ของบ้าน myClover — **7 ใบ ไม่มีเด็ค ไม่มีดวง
มีแค่สิ่งที่คุณเลือกและคนที่นั่งตรงข้าม**

โมดูลนี้ Self-contained ทั้งหมดอยู่ใต้ `/core7/` — ไม่แตะหน้าอื่นของ
myclover.com ไม่มี Build Step ไม่มี Dependency ภายนอก (Vanilla ES Modules)

## เล่นอะไรได้แล้วบ้าง (v0.4.1)

| ระบบ | สถานะ |
|---|---|
| Landing / Rules TH-EN / Interactive Tutorial | ✅ |
| Hand Builder — Guest (Generic 4 สี) + โหมด Collection (28 ใบ + Preset) | ✅ |
| เล่นกับบอท 2 ระดับ (EASY / HARD) จบ Match จริง | ✅ |
| Simultaneous Reveal + ทิ้งเพิ่ม + Tie Break ครบ (Final Gray, History, Draw) | ✅ |
| Refresh / กลับเข้า Match เดิม (Snapshot restore) | ✅ |
| Multiplayer ข้ามอุปกรณ์ + รหัส 4 หลัก + Public Lobby | ✅ โค้ดพร้อม; production ต้อง bind D1 ตาม `DEPLOY-v0.3.md` |
| Quick / BO3 / BO5 + Starting Hand lock ตลอด Series | ✅ |
| Sound effects + mute / Summary แยกฝั่ง สี ไพ่เล่น ไพ่ทิ้ง | ✅ |
| Result Page: Timeline, Turning Point, Share to Discord, ชวนคุยหลังเกม | ✅ |
| Collection + Card Detail + Favorite + สถิติ + History + Profile (ในเครื่อง) | ✅ |
| Print Tools — A4 9-up 63×88 mm + เส้นตัด | ✅ |
| Rules Engine + Glicko-2 + Bot — Unit/Integration Tests 55 เคส | ✅ |
| **บัญชี Member / Ranked Queue** | ⏳ Phase ถัดไป; Casual multiplayer ไม่ต้องสมัคร |

หลักที่ยึดตลอด: ไม่มีปุ่มหลอก — ทุกอย่างที่ยังไม่ทำงานติดป้าย
"รอ Server จริง" ชัดเจน และเกมออฟไลน์/ในเครื่องเล่นได้จริงครบวงจร

## โครงสร้าง

```
core7/
├── js/
│   ├── rules.js        Rules Engine — pure functions, CORE7_RULES_VERSION 1.0.0
│   ├── cards.js        Seed 28 ใบ FIRST HAND + Generic 4 สี
│   ├── engine.js       MatchAuthority — "Server" ของ Match (hidden state,
│   │                   idempotent actions, per-player views, snapshot restore)
│   ├── bot.js          บอท EASY/HARD — deterministic, ไม่เห็น hidden state
│   ├── ranking.js      Glicko-2 + Tier (SEED→FOUR-LEAF) + config
│   ├── adapters.js     LocalBotClient / RoomHost / RoomGuest / RemoteAdapter
│   ├── art.js          Asset ต้นฉบับทั้งหมด (Procedural SVG)
│   ├── match-ui.js     หน้าจอ Match ใช้ร่วมทุกโหมด — คุยผ่าน client interface
│   ├── store.js        สถิติ/มือ/Preset/Favorite ใน localStorage (Guest model)
│   └── ui.js           Shell + helper
├── tests/              node:test — rules / engine security / bot / glicko-2
├── backend/
│   ├── schema.sql      Cloudflare D1 — ตาราง c7_* + seed การ์ด (idempotent)
│   └── API.md          REST + WebSocket contract + rating pipeline + env
├── assets/ASSET-MANIFEST.md
└── <route>/index.html  ทุก Route ตามสเปค (landing, play, rules, tutorial,
                        hand, bot, create, join, room, match(=in room), result,
                        collection, cards, profile, rank, history, print,
                        open-play, about, admin)
```

## รัน / ทดสอบ

```bash
# เว็บ — static ล้วน เสิร์ฟจาก root repo
python3 -m http.server 8000     # เปิด http://localhost:8000/core7/

# tests (Node 18+)
node --test core7/tests/*.test.mjs
```

## สถาปัตยกรรม: ทำไมย้ายขึ้น Server จริงได้โดยไม่รื้อ

UI ทุกหน้าคุยกับ **client interface** เดียว (`send / getView / subscribe`)
— ไม่เคยคำนวณผลเกมเอง `MatchAuthority` (engine.js) คือผู้ตัดสินเพียงหนึ่งเดียว
และเขียนแบบไม่มี Dependency กับ Browser จึงยกไปรันบน Cloudflare Worker /
Durable Object ได้ตรง ๆ เป็น Reference Implementation ของ Backend

ลำดับเชื่อม Backend จริง (รายละเอียดใน `backend/API.md`):

1. รัน `backend/schema.sql` ใน D1 แล้ว bind เป็น `DB`
2. สร้าง Durable Object ต่อห้อง — ห่อ `MatchAuthority` + WebSocket
3. Implement REST ตาม API.md (Pages Functions ใน `functions/api/core7/`)
4. ตั้ง `window.C7_CONFIG = { API_BASE, WS_BASE }` ใน config ของเว็บ
5. Implement `RemoteAdapter` ใน `adapters.js` ตาม interface เดิม — UI ไม่แก้

ข้อห้ามที่ Contract ล็อกไว้: Client ห้ามส่งผลลัพธ์, ห้ามส่ง choice คู่แข่ง
ก่อน reveal, ทุก action idempotent, Rating เปลี่ยนเฉพาะ Official Ranked Queue

## ความยุติธรรมและความปลอดภัย

- Guest = Member ในกติกา 100% — ภาพการ์ดเป็นความทรงจำ ไม่ใช่อาวุธ
- ไม่มี Pay-to-win, ไม่มีค่าพลัง, ไม่มี Skill, ไม่มี RNG ตัดสินเกม
- บอทเห็นเฉพาะข้อมูลหงายหน้า (โกงไม่ได้โดยโครงสร้าง — view ไม่มีมือคู่แข่ง)
- ไม่มี Free Text Chat — ใช้ Conversation Prompt ท้ายเกมแทน
- ไม่เก็บข้อมูลส่วนตัว: สถิติ Guest อยู่ใน localStorage ของผู้เล่นเอง
  Analytics นับในเครื่องเท่านั้น ไม่ส่งออก

## Accessibility

- ทุกสีมี Icon + Pattern + ชื่อ (ผู้แยกสีไม่ได้อ่านเกมได้)
- Touch target ≥ 44px, aria-label ทุกปุ่ม, aria-live สำหรับผลรอบ
- `prefers-reduced-motion` ตัด Animation ทั้งหมด (state ไม่ผูกกับ Animation)
- Safe area iPhone (`env(safe-area-inset-bottom)`), Portrait + Landscape

## Known Limitations (V1)

1. Multiplayer ต้องมี Cloudflare Pages + D1 binding ชื่อ `DB`; local static server เล่น Bot/Tutorial ได้ แต่สร้างห้อง production ไม่ได้
2. บัญชี Member / Ranked / Leaderboard / Achievement / Event Unlock /
   People Cards — Schema และ Contract พร้อม แต่ต้องมี Server
3. ภาพการ์ดเป็นสไตล์ Minimal-Warm (SVG ต้นฉบับ) — แผนยกระดับอยู่ใน
   ASSET-MANIFEST.md โดยไม่ต้องแก้โครงการ์ด
4. Open Graph ต่อห้อง/ต่อผลใช้ข้อความ meta กลาง — ภาพ OG เฉพาะผลยังไม่ถูกเรนเดอร์ฝั่ง Server

## Next Phase

1. Backend จริง (D1 + DO) → เปิดห้องข้ามอุปกรณ์ + บัญชี Member
2. Ranked Queue + Season + Leaderboard (logic พร้อม — เหลือ endpoint)
3. Discord OAuth (Phase 2) → Bot คำสั่ง `/core7` (Phase 3)
4. Event Table Mode (จับคู่สลับโต๊ะในงานจริง — Data Model รองรับแล้ว)
5. People Cards + Claim Code / QR + Print PDF แบบ Bleed สำหรับโรงพิมพ์
