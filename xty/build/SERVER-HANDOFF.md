# XTY — Server Handoff Spec

**สถานะ:** frontend ใช้งานได้แล้วแบบ local-first · ยังไม่มี backend
**เขียนเพื่อ:** คนที่มาต่อฝั่ง database ให้ตี้ข้ามเครื่องได้จริง

---

## สรุปสั้น

ตอนนี้ XTY ทำงานครบทั้ง flow แต่เก็บทุกอย่างไว้ใน `localStorage` ของเครื่องเดียว
แปลว่า **รหัสตี้ยังใช้ข้ามเครื่องไม่ได้** — คนที่กดเข้าตี้จากอีกเครื่องจะเจอ "ไม่เจอตี้นี้"

งานที่เหลือคือทำ API ให้ตรงสัญญาที่ `xty/_shared/store.js` ใช้อยู่แล้ว
**ไม่ต้องแก้หน้าเว็บเลยสักหน้า** ถ้า API คืนรูปแบบเดียวกัน

---

## ของที่มีอยู่แล้วในเรโป — อย่าสร้างใหม่

| ของ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| Google + LINE OAuth (PKCE) | `functions/api/auth/[[path]].js` | ใช้ D1 · session cookie |
| ตาราง account/session | `functions/_lib/account.js` | `mc_accounts` `mc_sessions` `mc_auth_identities` |
| Progress sync | `functions/api/progress.js` | ดูดคีย์ `mc_*` `mc-*` `c7:*` ขึ้น server |
| แพตเทิร์นห้องออนไลน์ | `functions/api/core7/[[path]].js` | `c7_beta_rooms` + `version` optimistic concurrency |

**คีย์ที่ XTY ใช้คือ `mc_xty_profile` และ `mc_xty_parties`** — ขึ้นต้นด้วย `mc_` แล้ว
เพราะงั้น**โปรไฟล์กับตี้จะถูก sync ขึ้น account อัตโนมัติอยู่แล้ว**เมื่อผู้ใช้ login
งานที่ยังขาดคือ **การแชร์ตี้ระหว่างคน** ไม่ใช่การเก็บของคนเดียว

---

## ตารางที่ต้องสร้าง (D1)

```sql
CREATE TABLE IF NOT EXISTS xty_parties (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,      -- ABC-123
  name        TEXT NOT NULL,
  activity    TEXT,
  pet_id      TEXT,                      -- NULL = ไม่มีสัตว์ประจำตี้
  owner_id    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  head_seq    INTEGER NOT NULL DEFAULT 0 -- ลำดับล่าสุดของ log
);

CREATE TABLE IF NOT EXISTS xty_members (
  party_id  TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  alias     TEXT NOT NULL,
  avatar    TEXT,
  role      TEXT NOT NULL,               -- 'lead' | 'member'
  joined_at TEXT NOT NULL,
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS xty_posts (
  party_id TEXT NOT NULL,
  seq      INTEGER NOT NULL,
  user_id  TEXT NOT NULL,
  kind     TEXT NOT NULL,                -- 'message' | 'checkin'
  body     TEXT NOT NULL,
  sent_at  TEXT NOT NULL,                -- เวลาส่งจริง
  PRIMARY KEY (party_id, seq)
);
```

**ข้อบังคับที่ต้องบังคับฝั่ง server ด้วย ไม่ใช่แค่ฝั่งหน้าเว็บ:**

- สมาชิกต่อตี้ **ไม่เกิน 5** (`PARTY_MAX`) — เกินให้ตอบ `FULL`
- **หัวตี้มีคนเดียว** ต่อหนึ่งตี้
- `seq` ต้องเดินหน้าอย่างเดียว ใช้ `head_seq` เป็นตัวนับ

---

## API ที่ต้องมี

ให้ตรงกับที่ `store.js` เรียกอยู่ (ตอนนี้เป็น local function ชื่อเดียวกัน)

```
POST   /api/xty/party                 → สร้างตี้     { name, activity, petId }
GET    /api/xty/party/:code           → อ่านตี้ + สมาชิก
POST   /api/xty/party/:code/join      → เข้าตี้      { alias, avatar }
POST   /api/xty/party/:code/post      → ส่งข้อความ   { body, kind }
GET    /api/xty/party/:code/feed?since=<seq>  → ดึงเป็นก้อน
```

### `feed` คือหัวใจ — ต้องเป็น relay ไม่ใช่ push

```jsonc
// GET /api/xty/party/ABC-123/feed?since=12
{
  "head": 15,
  "posts": [
    { "seq": 13, "userId": "...", "alias": "กล้วยทอด", "avatar": "🌻",
      "kind": "message", "body": "เจอกันสองทุ่ม", "sentAt": "2026-08-14T13:20:11Z" }
  ]
}
```

**กติกาที่ห้ามเปลี่ยน:**

- `sentAt` = เวลาที่ส่งจริง · `seq` = ลำดับที่ส่งถึง — คนละเรื่องกัน
- ถ้า `since === head` ให้ตอบ `{ "head": n, "posts": [] }` สั้น ๆ
- **ห้ามทำ WebSocket / SSE / long-poll** — ตั้งใจให้เป็นรอบ
  ผู้ใช้เปิดหน้าแล้วได้ทั้งรอบมาก้อนเดียว ไม่ใช่ข้อความไหลทีละอัน
- อย่าใส่ typing indicator, read receipt, unread badge ที่ตะโกน

เหตุผลไม่ใช่เรื่องประหยัดแบนด์วิดท์อย่างเดียว — หลักของสินค้าคือ
**"ทุกวัน ไม่ใช่ทั้งวัน"** ถ้าใส่ push ทุกข้อความ มันจะกลายเป็นแอปแชทที่ทวงเวลาคน

---

## ยังไม่ต้องทำ

- AI Pet engine (Phase G) — ตอนนี้ pet เป็นแค่ emoji ประจำตี้
- Pet random draw / XP / unlock formula — **ห้ามแต่งสูตรเอง** ยังไม่ canon
- Public party discovery
- Moderation policy
- ลบ/แก้ข้อความย้อนหลัง

## ที่ต้องตัดสินใจก่อนเปิดใช้จริง

- **Retention** — เจ้าของตี้เลือกตอนตั้งวง แต่ควรมีเพดานตาม purpose
  (ตี้สุขภาพควรสั้นกว่าตี้เล่นเกม) ยังไม่ได้ล็อกตัวเลข
- **ใครลบตี้ได้** และเกิดอะไรกับ log เมื่อสมาชิกออก
- **Consent** — พอเป็นคนจริงในตี้จริง ต้องมีหน้าอธิบายว่าข้อความถูกเก็บนานแค่ไหน
  ก่อนเปิดให้คนนอกทีมใช้

---

## วิธีสลับ frontend มาใช้ server

`xty/_shared/store.js` แยก I/O ไว้ในฟังก์ชันเดียวกันหมดแล้ว
เปลี่ยนแค่ body ของ `createParty` `joinParty` `postToParty` `postsSince` `getParty`
ให้ `await fetch(...)` แทนการอ่าน `localStorage` — signature เดิม หน้าเว็บไม่ต้องแก้

ข้อควรระวัง: ฟังก์ชันพวกนี้ตอนนี้เป็น **synchronous** ถ้าเปลี่ยนเป็น async
ต้องไล่ใส่ `await` ในหน้า `xty/p/`, `xty/new/`, `xty/join/` ด้วย (จุดเรียกไม่เยอะ)
