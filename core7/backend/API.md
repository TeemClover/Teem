# myClover: CORE7 — Backend API Contract

> v0.3 Beta implementation อยู่ที่ `functions/api/core7/[[path]].js` และ
> `core7/backend/room-service.js` ใช้ same-origin polling เพื่อ reconnect/sync บน
> Cloudflare Pages + D1 ส่วนสัญญา WebSocket ด้านล่างเป็น upgrade path เมื่อย้ายห้อง
> ไป Durable Objects โดย client interface ไม่ต้องเปลี่ยน

## v0.3 Beta Room endpoints (implemented)

```text
GET  /api/core7/health
GET  /api/core7/rooms
POST /api/core7/rooms                         { displayName, visibility, mode }
POST /api/core7/rooms/:code/join              { displayName }
GET  /api/core7/rooms/:code/state             Bearer <room token>
POST /api/core7/rooms/:code/hand              { cards }
POST /api/core7/rooms/:code/action            { action }
POST /api/core7/rooms/:code/next
POST /api/core7/rooms/:code/leave
```

`mode` คือ `quick | bo3 | bo5` และ `code` เป็น string ตัวเลข 4 หลัก ต้องรักษา
เลขศูนย์นำหน้า Token ดิบไม่เก็บในฐานข้อมูล; state เก็บเฉพาะ SHA-256 hash

สัญญา API ระหว่าง Client (`/core7/`) กับ Backend จริง
Client ฝั่งเว็บพร้อมใช้สัญญานี้แล้วผ่านชั้น Adapter (`core7/js/adapters.js`)

**Stack แนะนำ (ตรงกับของเดิมของเว็บ):** Cloudflare Pages Functions + D1 +
Durable Objects (1 DO ต่อ 1 ห้อง สำหรับ WebSocket / Simultaneous Reveal)
ทางเลือกเทียบเท่า: Supabase (Postgres + Realtime Channel + Edge Functions)

## หลักการที่ห้ามละเมิด

1. **Server-authoritative** — Client ส่งได้เฉพาะ Action (`select_card`,
   `lock_choice`, `discard_card`, `ready`, `rematch`, `forfeit`)
   ห้ามรับผลลัพธ์สำเร็จรูปจาก Client ทุกกรณี
2. **ห้ามส่ง Choice ของคู่แข่งลง Browser ก่อนทั้งคู่ Lock** — ไม่ใช่ซ่อนด้วย
   CSS/JS แต่ต้องไม่อยู่ใน Payload เลย (ดู `MatchAuthority.viewFor()` เป็นแบบ)
3. ทุก Action มี `match_id, round_number, player_id, action_id,
   client_timestamp, idempotency_key` — Action ซ้ำต้องตอบผลเดิม (idempotent)
4. Match ทุกเกมบันทึก `rules_version` — Replay เก่าต้องอ่านได้ตลอดไป
5. Rating เปลี่ยนเฉพาะ Official Ranked Queue — Casual / Bot / Private ไม่แตะ
6. การแก้ผล Match โดย Admin ต้องเขียน `c7_audit_logs` เสมอ

## REST Endpoints

### Auth
```
POST /api/core7/guest                  → { guest_id, session_token, expires_at }
POST /api/core7/auth/link-discord      → OAuth flow (Phase 2)
POST /api/core7/auth/unlink-discord
```

### Room
```
POST /api/core7/rooms                  body: { visibility, locale, ranked:false }
                                       → { room_code, room_id, expires_at }
POST /api/core7/rooms/:code/join       body: { display_name } → { seat, room_state }
POST /api/core7/rooms/:code/leave
POST /api/core7/rooms/:code/ready      body: { cards: [card_id × 7] }
GET  /api/core7/rooms/:code            → room_state (ไม่มีมือของใครเด็ดขาด)
```

### Match
```
POST /api/core7/matches/:id/hand       body: { cards: [card_id × 7] }   (ก่อนเริ่มเท่านั้น)
POST /api/core7/matches/:id/select     body: { card_instance_id, action_id }
POST /api/core7/matches/:id/lock       body: { action_id }
POST /api/core7/matches/:id/discard    body: { card_instance_id, action_id }
POST /api/core7/matches/:id/forfeit
POST /api/core7/matches/:id/rematch    → ห้องเดิม มือใหม่ (ไม่มี Deck Lock)
GET  /api/core7/matches/:id/state      → view ของผู้เรียกเท่านั้น (reconnect snapshot)
```

### Collection
```
GET    /api/core7/cards                → การ์ดทั้งหมดที่ is_active
GET    /api/core7/collection           → user_cards ของผู้เรียก
POST   /api/core7/hands                → สร้าง preset
PUT    /api/core7/hands/:id
DELETE /api/core7/hands/:id
```

### Ranking
```
GET /api/core7/rankings?season=        → leaderboard (แบ่งหน้า)
GET /api/core7/profile/:handle         → ตาม privacy setting
GET /api/core7/history                 → match history ของผู้เรียก
```

### Admin (ต้องมี role + ทุกคำสั่งเขียน audit log)
```
POST /api/core7/admin/cards
POST /api/core7/admin/events
POST /api/core7/admin/rewards
POST /api/core7/admin/grants
POST /api/core7/admin/matches/:id/review    body: { action: 'VOID'|'RECALC', reason }
```

## Realtime Events (WebSocket ต่อห้อง)

ทุก Event: `{ event_id, event_type, match_id, round_number, server_timestamp, payload }`

```
room.joined            room.left              room.ready_changed
match.created          match.started
round.selection_locked   payload: { seat }          ← ไม่มี card/color เด็ดขาด
round.reveal             payload: { a:{card,color}, b:{card,color}, result }
round.discard_required   payload: { seat }
round.resolved           payload: { discards, hand_counts, round_wins }
match.completed          payload: { winner_id, result_type, round_wins }
match.forfeited          match.rematch_requested   match.rematch_started
player.disconnected      player.reconnected
```

`core7/js/engine.js` (`MatchAuthority`) รันบน Worker/DO ได้โดยตรง —
เป็น Reference Implementation ของทั้ง State Machine, Idempotency และ View
ที่ไม่รั่ว Hidden State ทดสอบแล้ว 55 เคส (`core7/tests/`)

## Reconnect / Timeout

- Session token → `GET /matches/:id/state` คืน Snapshot ล่าสุดเฉพาะมุมของผู้เรียก
- Choice ที่ Lock แล้วแต่ยังไม่ Reveal: บอกแค่ `locked: true`
- Ranked: timer ต่อ Action + Disconnect grace period → หมดเวลา = Forfeit
- Casual: เจ้าของห้องเลือกเปิด/ปิด Timer

## Rating Pipeline (Ranked เท่านั้น)

1. `match.completed` (status COMPLETED/FORFEITED เท่านั้น — CANCELLED ข้าม)
2. `score = 1 / 0.5 / 0` ผ่าน `scoreOf()` ใน `core7/js/ranking.js`
3. `updateRating()` (Glicko-2 — ทดสอบกับตัวอย่างมาตรฐานของ Glickman แล้ว)
4. เขียน `c7_ratings` + `c7_rating_history` (UNIQUE match_id กันคิดซ้ำ)
5. Anti-farming: จำกัด rating gain จากคู่เดิมซ้ำในช่วงเวลาสั้น,
   ตรวจ surrender pattern, ตรวจ multi-account — เก็บผลใน audit log

## Environment Variables

```
# Cloudflare Pages → Settings → Bindings / Variables
DB                  = D1 binding (schema: core7/backend/schema.sql)
C7_ROOMS            = Durable Object namespace binding (ห้อง realtime)
C7_SESSION_SECRET   = สุ่มยาว ๆ สำหรับ sign session token
C7_DISCORD_CLIENT_ID / C7_DISCORD_CLIENT_SECRET   (Phase 2 — OAuth)
```

ฝั่ง Client เปิดใช้ Backend ด้วยไฟล์ config (ไม่มี secret):
```html
<script>window.C7_CONFIG = { API_BASE: '/api/core7', WS_BASE: 'wss://…' };</script>
```
ไม่ตั้งค่า = โหมด Local (Bot + ห้องในเครื่อง) ทำงานเต็มรูปแบบเหมือนเดิม

## Discord Bot (Phase 3)

คำสั่ง: `/core7 create · challenge @user · profile · rank · leaderboard · history`
Bot เรียก REST เดียวกันด้วย Bot token — Core Gameplay ห้ามผูกกับ Bot
เว็บต้องเล่นได้เองแม้ไม่มี Discord
