# Route Guard — /xircle/

Reviewed: **2026-09-10**. Canonical experience: **V3**, from `6fab7897` (`feat/xircle-experience-v3`), merged as `e7b533a7` into remote main (`1984724c`), with the same V3 runtime. The earlier V2 selection came from stale local remote refs and is superseded.

## Job

ให้ลองประกอบวันตัวอย่างสั้น ๆ เห็นว่าข้อมูลกับบริบทช่วยกันอย่างไร แล้วเลือกนัดดูเรื่องจริงกับทีม + เอโกะ

## Current flow

**เลือกคืนตัวอย่าง → ถ่ายมื้อตัวอย่าง → เลือกการขยับ → ดูหลายวัน → เติมบริบทและเห็นข้อสังเกต → “แล้วของคุณล่ะ?” → เลือกนัดลองจริง**

- Entry: `/xircle/`, Compass entry, or a compatibility URL in [ROUTE_INDEX.md](ROUTE_INDEX.md).
- Main exit: `/meet/?intent=health&from=xircle&open=booking`; only a bounded subject deliberately selected before entry may accompany it.
- Optional exit after the payoff: `/xircle/learn/`. No registration or app-download CTA in this experience.
- `#appointment` and compatibility `#start` open the appointment invitation without synthesizing a completed example.
- `/Xircle` is a case alias of `/xircle/`, not a separate source tree or experience.

## Runtime

- `index.html`, `experience-v3.js`, `experience-v3.css`, `_shared/typography.css`, V3 scene plates and selected existing V5 / Meet imagery.
- V1/V2 experience engines, including the mistaken neutral `experience.js` / `experience.css`, are removed from the active source.
- `route-contract.js` handles bounded route parameters and read-only legacy invitation compatibility; `entry.css` styles the small Compass continuation.
- No retired `_shared/state.js`, `story-v6.js`, `v5.js`, Compass overlay, or old worker is needed.
- Original myClover logo and `/favicon.ico` remain exact assets.

## State and content boundaries

- The day, chart, sleep, food, movement and context choices are clearly marked prepared examples. They are not personal measurements or a health score.
- Do not send fictional choices into Meet as the visitor's health data.
- Existing progress, invitations and Front Door checkpoints remain intact. No completion flags are required or rewritten.
- V3 choices stay in memory; `#appointment` preserves the invitation when returning from Meet. No new storage key is added. Retired V1/V2 progress/session keys, including `xircle.demo.v2.resume`, stay untouched and are not used to restore V3.
- Valid invitation links remain optional explicit actions. No automatic external navigation or health sharing.

## Verification

Check the full demo, editing/back/restart, Compass subject → Meet, refresh/back continuation, blocked storage, saved invitations and old URLs on mobile and desktop. Useful articles must open directly without replaying the demo.

The current cross-route source is [XIRCLE_ROUTE_SOURCE.md](XIRCLE_ROUTE_SOURCE.md); historical route guards are archived there by reference.
