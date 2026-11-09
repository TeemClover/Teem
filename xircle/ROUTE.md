# Route Guard — /xircle/

Reviewed: **2026-09-10**. Canonical experience: **V3**, from `6fab7897` (`feat/xircle-experience-v3`), merged as `e7b533a7` into remote main (`1984724c`), with the same V3 runtime. The earlier V2 selection came from stale local remote refs and is superseded.

## Journey upgrade — 2026-11-09

The V3 fictional-day engine is retained inside a new mobile-first opening. Visitors can start the example, open knowledge/reference material, or explicitly choose the existing Meet destination. The new overview does not collect health data, require registration, or mark the example complete.

- A generated static header, breadcrumbs and footer connect all 50 active pages. Deep documents keep a local table of contents. Source/status content remains available; the old generic build-zone banner is not shown in the visitor flow.
- `journey.css` / `journey.js` provide shared layout, accessible mobile navigation and native fragment history. `build/journey-shell.mjs` owns the shared static markup (`npm run build:xircle`, `npm run check:xircle`).
- The V3 step strip opens visited steps only. Restart resets only in-memory example choices; legacy records and invitations are unchanged. `#appointment` / `#start` still open the real invitation and scroll it into view.
- `knowledge.js` adds result announcements, selected-filter semantics, empty/reset states and bounded `q` / `part` URL state. Article Back and refresh retain the list. No new browser-storage key is added.
- `/invite`, `/free`, `/join` (both slash forms in Vercel) retain the requested `https://buy.xircle.health/login?ref=O5F3LN` acquisition destination. This is independent of the primary Meet journey. `/maxage` is unchanged.
- `/work/xircle/` is a generated case study with real local-preview screenshots; it makes no health or performance-outcome claim. No production deployment is implied by a local test.

Validation and reproducible commands: [JOURNEY_QA.md](JOURNEY_QA.md).

## Job

ให้ลองประกอบวันตัวอย่างสั้น ๆ เห็นว่าข้อมูลกับบริบทช่วยกันอย่างไร แล้วเลือกนัดดูเรื่องจริงกับทีม + เอโกะ

## Current flow

**เลือกคืนตัวอย่าง → ถ่ายมื้อตัวอย่าง → เลือกการขยับ → ดูหลายวัน → เติมบริบทและเห็นข้อสังเกต → “แล้วของคุณล่ะ?” → เลือกนัดลองจริง**

- Entry: `/xircle/`, Compass entry, or a compatibility URL in [ROUTE_INDEX.md](ROUTE_INDEX.md).
- Main exit: `/meet/?intent=health&from=xircle&open=booking`; only a bounded subject deliberately selected before entry may accompany it.
- Optional exits after the payoff: `/xircle/learn/` or `/xvisor/?from=xircle` (ลองเป็นคนดูแลบ้าง). The quiet header knowledge shortcut is available immediately. Meet stays the primary action; no registration or app-download CTA.
- `#appointment` and compatibility `#start` open the appointment invitation without synthesizing a completed example.
- `/Xircle` is a case alias of `/xircle/`, not a separate source tree or experience.

## Runtime

- `index.html`, `experience-v3.js`, `experience-v3.css`, `_shared/typography.css`, V3 scene plates and selected existing V5 / Meet imagery.
- V1/V2 experience engines, including the mistaken neutral `experience.js` / `experience.css`, are removed from the active source.
- `route-contract.js` handles bounded route parameters and read-only legacy invitation compatibility; `entry.css` styles the small Compass continuation.
- `xvisor-path.js` carries only an already-present valid handoff reference to optional onward links, even when storage is unavailable. It creates no installation, checkpoint or telemetry event.
- No retired `_shared/state.js`, `story-v6.js`, `v5.js`, Compass overlay, or old worker is needed.
- Original myClover logo and `/favicon.ico` remain exact assets.

## State and content boundaries

- The day, chart, sleep, food, movement and context choices are clearly marked prepared examples. They are not personal measurements or a health score.
- Do not send fictional choices into Meet as the visitor's health data.
- Existing progress, invitations and Front Door checkpoints remain intact. No completion flags are required or rewritten.
- V3 choices stay in memory; `#appointment` preserves the invitation when returning from Meet, knowledge or the game invitation. No new storage key is added. Retired V1/V2 progress/session keys, including `xircle.demo.v2.resume`, stay untouched and are not used to restore V3.
- Valid invitation links remain optional explicit actions. No automatic external navigation or health sharing.

## Verification

Check the full demo, editing/back/restart, Compass subject → Meet, refresh/back continuation, blocked storage, saved invitations and old URLs on mobile and desktop. Useful articles must open directly without replaying the demo.

The current cross-route source is [XIRCLE_ROUTE_SOURCE.md](XIRCLE_ROUTE_SOURCE.md); historical route guards are archived there by reference.
