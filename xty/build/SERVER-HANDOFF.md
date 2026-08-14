# XTY — Server Handoff

**สถานะ production 2026-08-14:** ต่อ Vercel API + Neon แล้ว · รหัสตี้ใช้ข้ามเครื่องได้

ไฟล์ production:

- `api/xty/[...path].js` — Party API บน Vercel
- `api/_lib/core.js` — Neon schema รวมตาราง XTY
- `api/xty-pet.js` — pet wake endpoint แบบ secure + quiet-first
- `api/_lib/pet-brain.js` — ตัวที่อ่านแชทจริงแล้วตัดสินใจว่าจะพูดหรือเงียบ
- `api/_lib/pet-personas.js` — บุคลิกที่ส่งเข้าโมเดล (คู่กับ `xty/pets/personas/*.md`)
- `xty/_shared/store.js` — server adapter + local cache (ไม่มี WebSocket/long-poll)

สิ่งที่ต้องตั้งใน deployment ก่อนเปิด pet wake อัตโนมัติ:

1. ตั้ง `CRON_SECRET` ใน Vercel
2. ให้ scheduler เรียก `GET /api/xty-pet` พร้อม `Authorization: Bearer <CRON_SECRET>`
   เวลา UTC `17:00 · 23:00 · 05:00 · 11:00` (ตรงกับไทย `00:00 · 06:00 · 12:00 · 18:00`)
3. อยากให้บอทอ่านแชทจริง ต้องตั้ง `ANTHROPIC_API_KEY` และ `XTY_PET_AI=on` ด้วย
   ไม่ตั้ง = บอทยังทำงานได้แต่ใช้ประโยคสำเร็จรูป ไม่ยิง API เลย (ดู §5)

ยังไม่ใส่ `crons` ลง `vercel.json` เพราะ Vercel Hobby อนุญาตเพียงวันละครั้ง
แต่ requirement ของ XTY คือ 4 รอบ/วัน; เปิด config นี้เมื่อยืนยันแผน deployment แล้วเท่านั้น

> Schema D1 ด้านล่างเก็บไว้เป็น portable reference จากร่างเดิม
> ส่วนระบบที่ myclover.com ใช้งานจริงปัจจุบันคือ Neon/Postgres ใน `api/`.

---

## 1. เกมทำงานยังไง (อ่านก่อนแตะโค้ด)

XTY ไม่ใช่แอปแชท มันคือ **เกมของกิจกรรมในชีวิตจริง**

```
ตั้งตี้ → ตั้งกติกา → ทำจริง → COMMIT → MESSAGE ถ้าจำเป็น → REACT → กลับมาพรุ่งนี้
```

สามคำที่เป็นแกน — **ใช้คำทับศัพท์เสมอ ห้ามแปล:**

| | ความหมาย | กินโควตาไหม |
|---|---|---|
| **Commit** | ฉันทำสิ่งที่ตี้ตกลงกันแล้ว | **ไม่** |
| **Message** | มีบางอย่างสำคัญพอจะฝากไว้ | **ใช่** |
| **React** | เห็นแล้ว / ขำ / เอาใจช่วย | **ไม่** |

**Commit สำคัญกว่า Message** — หัวตี้เป็นคนตั้งว่าอะไรถึงนับเป็น Commit

### ตัวเลขที่ล็อกแล้ว

```
สมาชิก           2–5 คน (หัวตี้ 1 คน)
Message budget   1 / 3 / 5 ต่อคนต่อวัน · default = 3
Message          append-only · แก้ไม่ได้ · ถอนได้
Pet bubbles      สูงสุด 3 ต่อรอบ · 4 รอบต่อวัน
```

### หลักที่ห้ามละเมิด

> **No message debt. Less chat. More commit.**
> **เปิดวันละครั้งก็ยังตามตี้ทัน**

แปลว่า **ห้ามทำ**: WebSocket / SSE / long-poll, typing indicator, read receipt,
unread badge แบบ `99+`, push ทุกข้อความ, infinite scroll

ใช้ภาษาสงบแทน: `3 อัปเดตวันนี้` · `4 / 5 COMMITTED TODAY`

---

## 2. ของที่มีอยู่แล้ว — อย่าสร้างใหม่

| ของ | ที่อยู่ |
|---|---|
| Google + LINE OAuth (PKCE) | `functions/api/auth/[[path]].js` |
| ตาราง account/session | `functions/_lib/account.js` |
| Progress sync (ดูดคีย์ `mc_*`) | `functions/api/progress.js` |
| แพตเทิร์นห้อง + `version` | `functions/api/core7/[[path]].js` |

คีย์ที่ XTY ใช้คือ `mc_xty_profile` และ `mc_xty_parties` — ขึ้นต้น `mc_` แล้ว
**โปรไฟล์จะ sync ขึ้น account อัตโนมัติเมื่อ login** งานที่ขาดคือ *การแชร์ตี้ระหว่างคน*

---

## 3. Schema (D1)

```sql
CREATE TABLE IF NOT EXISTS xty_parties (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,        -- ABC-123
  name         TEXT NOT NULL,
  activity     TEXT,
  commit_rule  TEXT,                        -- อะไรถึงนับเป็น Commit
  budget       TEXT NOT NULL DEFAULT 'normal',  -- quiet|normal|social
  pet_id       TEXT,                        -- NULL = ไม่มีสัตว์
  owner_id     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  head_seq     INTEGER NOT NULL DEFAULT 0,
  pet_last_wake TEXT                        -- ISO ของรอบบอทล่าสุด
);

CREATE TABLE IF NOT EXISTS xty_members (
  party_id  TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  alias     TEXT NOT NULL,
  avatar    TEXT,
  role      TEXT NOT NULL,                  -- lead|member
  joined_at TEXT NOT NULL,
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE IF NOT EXISTS xty_posts (
  party_id  TEXT NOT NULL,
  seq       INTEGER NOT NULL,
  user_id   TEXT NOT NULL,                  -- 'pet:crow' สำหรับบอท
  kind      TEXT NOT NULL,                  -- commit|message|pet
  body      TEXT NOT NULL,
  sent_at   TEXT NOT NULL,                  -- เวลาส่งจริง
  retracted INTEGER NOT NULL DEFAULT 0,
  pet_id    TEXT,
  wake_hour INTEGER,
  PRIMARY KEY (party_id, seq)
);

CREATE TABLE IF NOT EXISTS xty_reactions (
  party_id TEXT NOT NULL,
  seq      INTEGER NOT NULL,
  user_id  TEXT NOT NULL,
  emoji    TEXT NOT NULL,
  PRIMARY KEY (party_id, seq, user_id, emoji)
);
```

### ต้องบังคับฝั่ง server ด้วย ไม่ใช่แค่ฝั่งหน้าเว็บ

- สมาชิก **ไม่เกิน 5** · หัวตี้ **คนเดียว**
- **1 Commit ต่อคนต่อวัน** — ซ้ำให้ตอบ `ALREADY_COMMITTED`
- **Message ตามโควตา** — เกินให้ตอบ `NO_BUDGET`
- **Commit และ React ไม่นับโควตา**
- `seq` เดินหน้าอย่างเดียว ใช้ `head_seq`
- **ห้ามมี endpoint แก้ body ของ post** มีแต่ retract

---

## 4. API

```
POST  /api/xty/party                    { name, activity, commitRule, budget, petId }
GET   /api/xty/party/:code
POST  /api/xty/party/:code/join         { alias, avatar }
POST  /api/xty/party/:code/commit       { note? }
POST  /api/xty/party/:code/message      { body }
POST  /api/xty/party/:code/react        { seq, emoji }     -- toggle
POST  /api/xty/party/:code/retract      { seq }            -- เจ้าของ post เท่านั้น
GET   /api/xty/party/:code/feed?since=<seq>
```

### `feed` — relay เป็นรอบ ไม่ใช่ stream

```jsonc
{
  "head": 15,
  "today": { "committed": 3, "members": 5, "updates": 7 },
  "budgetLeft": 2,
  "posts": [
    { "seq": 13, "userId": "u_x", "alias": "แพร", "avatar": "🐶",
      "kind": "commit", "body": "อ่านครบ 20 หน้า",
      "sentAt": "2026-08-14T13:20:11Z",
      "reactions": { "🔥": ["u_a","u_b"], "❤️": ["u_c"] },
      "retracted": false }
  ]
}
```

ถ้า `since === head` ตอบสั้น: `{ "head": n, "posts": [], ... }`

Reaction ชุดที่ใช้: `❤️ 🔥 👏 😂 🫡 💪 👀 🍀` (ค่าอื่นให้ปฏิเสธ)

---

## 5. บอทสัตว์ประจำตี้ — Scheduled Worker

### ตารางเวลา

ตื่น **วันละ 4 รอบ: 00:00 · 06:00 · 12:00 · 18:00** (เวลาไทย)

```
Cloudflare Cron:  0 17,23,5,11 * * *      # UTC = ICT − 7
```

ระหว่างรอบ **บอทไม่ทำอะไรเลย** ไม่ตอบข้อความทันที ไม่ตาม webhook

### แต่ละรอบทำอะไร

```
ตื่น
↓
ดึง post ตั้งแต่ pet_last_wake ถึงตอนนี้
↓
อ่านพร้อมบริบท: กติกา Commit · ใครยัง commit ไม่ครบ · เรื่องที่ฝากไว้ยังค้าง
↓
ตัดสินใจ: จะพูดหรือจะเงียบ
↓
ถ้าพูด → เขียน 1–3 bubbles (kind='pet')
↓
อัปเดต pet_last_wake
```

### กฎของบอท — สำคัญกว่าความฉลาด

1. **เงียบได้ และควรเงียบบ่อย** — ไม่มีอะไรเปลี่ยน = ไม่ต้องพูด
   ถ้าตอบทุกรอบทุกวัน มันจะกลายเป็น noise ที่พังหลักของสินค้า
2. **สูงสุด 3 bubbles ต่อรอบ** — เกินให้ตัด
3. **อ้างอิงของจริงใน log เท่านั้น** ห้ามแต่งเหตุการณ์
4. **ห้ามตอบแบบ chatbot** — ไม่ใช่ "มีข้อความมา → ตอบ"
   แต่เป็น "สังเกต → จำ → รอ → พูดเมื่อมีประโยชน์"
5. **Roast the commitment, not the person** — ห้ามแตะ รูปร่าง น้ำหนัก โรค
   ความพิการ สุขภาพจิต เชื้อชาติ ศาสนา เพศ sexuality ฐานะการเงิน trauma
   **ทุก series ไม่มีข้อยกเว้น**
6. **Starter 4 ตัวไม่ roast เลย** — แค่สังเกต ถาม ให้กำลังใจ
7. บอท **React ได้** โดยไม่ต้องพูด — เป็นวิธีแสดงบุคลิกที่ไม่สร้าง noise

### รอบไหนเหมาะกับอะไร

| เวลา | บทบาท |
|---|---|
| 06:00 | เปิดวัน — กติกาวันนี้คืออะไร ใครยังค้างอะไรจากเมื่อวาน |
| 12:00 | กลางวัน — มักเงียบ พูดเฉพาะมีเรื่องค้างจริง |
| 18:00 | ช่วงที่คนกลับมา — ถามเรื่องที่ฝากไว้ ชวน commit |
| 00:00 | ปิดวัน — สรุปสั้น ๆ ว่าวันนี้เป็นยังไง |

### บุคลิก

อยู่ในไฟล์ `xty/pets/personas/*.md` — STARTER ครบทั้ง 4 ตัวแล้ว
(`pig` · `dog` · `crow` · `chicken`) และ `README.md` อธิบายโครง
ใช้ engine เดียวกันทุกตัว เปลี่ยนแค่ persona
**สัตว์หายากไม่ได้ฉลาดกว่า** ต่างกันที่น้ำเสียงและจังหวะเท่านั้น

ตัวที่ส่งเข้าโมเดลจริงคือ `api/_lib/pet-personas.js` (`.md` คือเอกสาร)
เพราะ Vercel bundle เฉพาะไฟล์ที่ถูก import ตรง ๆ — **แก้บุคลิกต้องแก้ทั้งสองที่**

### บอทอ่านแชทยังไง (`api/_lib/pet-brain.js`)

ทุกรอบที่มีอะไรให้อ่านจริง ๆ บอทจะส่งของพวกนี้เข้าโมเดล `claude-opus-5`:

```
system : บุคลิกของสัตว์ตัวนั้น + ชื่อตี้ · กิจกรรม · กติกา Commit ที่ตี้ตั้งเอง
         + รายชื่อสมาชิก + เวลารอบนี้ + จำนวนคนที่ commit วันนี้ + กฎ 10 ข้อ
user   : log จริงตั้งแต่ pet_last_wake (สูงสุด 60 โพสต์) — commit · ข้อความ ·
         ข้อความที่ถูกถอน · รีแอค + bubble ล่าสุดของตัวเอง 3 อัน (กันพูดซ้ำ)
```

โมเดลตอบเป็นบรรทัดล้วน หรือ `QUIET` คำเดียวถ้าไม่มีอะไรควรพูด

**ตัวกรองฝั่งเราหลังโมเดลตอบ** (ไม่เชื่อ prompt อย่างเดียว):

- ตัดเหลือ 3 bubbles · บรรทัดละ 160 ตัวอักษร
- ตัด bullet / เครื่องหมายคำพูด / control character ที่โมเดลอาจใส่มา
- เจอคำในลิสต์ต้องห้าม (รูปร่าง น้ำหนัก โรค ฯลฯ) → **ทิ้งทั้งรอบ เงียบแทน**
- `stop_reason: refusal` → เงียบ
- API error / ไม่ได้ตั้ง key / สัตว์ยังไม่มี persona → กลับไปใช้ประโยคสำเร็จรูปเดิม

เทสต์: `npm test` (หรือแยก `test:pet-brain` = prompt + ตัวกรอง ·
`test:pet-wake` = ทั้ง loop กับ Neon ปลอมและ API ปลอม)

### เปิด/ปิด — ตอนนี้ปิดอยู่

```
XTY_PET_AI=on            # ไม่ตั้ง = ใช้ประโยคสำเร็จรูปอย่างเดียว ไม่ยิง API
ANTHROPIC_API_KEY=sk-...  # ต้องมีคู่กัน ขาดตัวใดตัวหนึ่ง = ไม่ยิง
CRON_SECRET=...          # ไม่มี = endpoint ตอบ 503 ไม่ทำงานเลย
```

ทั้งสามตัวยังไม่ได้ตั้ง และ `vercel.json` ยังไม่มี `crons`
เพราะฉะนั้น **deploy โค้ดนี้แล้วบอทยังไม่พูด** — ต้องเปิดเองทีละชั้น

### ค่าใช้จ่ายต่อรอบ

ยิง API เฉพาะตอนที่มีความเคลื่อนไหวจริงตั้งแต่รอบที่แล้ว
(บวกกรณีเดียว: ตี้เงียบเกิน 24 ชม. จะทักครั้งเดียวตอน 18:00 แล้วไม่ทักอีก
จนกว่าจะมีคนพูด) ตี้ที่เงียบสนิท = 0 request
`output_config.effort` ตั้งไว้ที่ `low` — งานนี้คือเลือกว่าจะพูดไหม ไม่ใช่งานคิดหนัก

### เขียนลง log ยังไง

frontend รองรับแล้ว — เรียก `appendPetTurn(code, { petId, bubbles, wakeHour })`
ฝั่ง server เขียน `xty_posts` ที่ `kind='pet'`, `user_id='pet:<petId>'`, ใส่ `pet_id` และ `wake_hour`
หน้าตี้จะเรนเดอร์เป็น bubble ของสัตว์พร้อม emoji และชื่อไทยให้เอง

---

## 6. ยังไม่ต้องทำ / ห้ามแต่งเอง

**ยังไม่ทำ:** pet draw, XP, unlock, public discovery, marketplace, lootbox

**ห้ามแต่งตัวเลขเอง** (open decisions):
```
XTY score formula        pet draw cost        drop rates
duplicate handling       slot unlock cadence  legendary odds
message reset time       time-zone behaviour  retention ceiling
pet intervention budget ที่ละเอียดกว่า 0–3 ต่อรอบ
```
ทำเป็น config แล้ว mark TODO

---

## 7. สลับ frontend มาใช้ server

`xty/_shared/store.js` แยก I/O ไว้ในฟังก์ชันเดียวกันหมด
เปลี่ยน body ของ `createParty` `joinParty` `postToParty` `toggleReaction`
`retractPost` `postsSince` `getParty` ให้ `fetch` แทน `localStorage`

**ข้อควรระวัง:** ตอนนี้เป็น **synchronous** ถ้าเปลี่ยนเป็น async
ต้องไล่ใส่ `await` ในหน้า `xty/p/`, `xty/new/`, `xty/join/`, `xty/index.html`, `profile/`
(จุดเรียกไม่เยอะ ประมาณ 15 จุด)

ฟังก์ชันคำนวณสถานะเกม (`committedToday`, `messagesLeftToday`, `budgetOf`)
เป็น pure function รับ party object — ใช้ต่อได้เลยไม่ต้องแก้

---

## 8. ก่อนเปิดให้คนนอกทีมใช้

- **Consent** — ต้องมีหน้าอธิบายว่าข้อความถูกเก็บนานแค่ไหน ใครเห็นได้บ้าง
- **Retention** — เจ้าของตี้เลือกตอนตั้ง แต่ควรมีเพดาน ยังไม่ได้ล็อกตัวเลข
- **ใครลบตี้ได้** และเกิดอะไรกับ log เมื่อสมาชิกออก
- **Moderation** — วงเล็ก 2–5 คนและเข้าด้วยคำเชิญ ทำให้ปัญหาเล็กกว่าแชทสาธารณะมาก
  แต่ยังต้องมีทางรายงาน
