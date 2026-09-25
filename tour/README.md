# บ้าน myClover — 3D house tour (homepage candidate)

A scroll-driven 3D walk through the myClover house. Each scroll section moves the camera to a
room; each room sends the visitor to a real part of the site.

| Section | Room | Primary destination | 3D hotspot |
|---|---|---|---|
| hero / door | Front garden, door opens | — | — |
| living | ห้องนั่งเล่น | `/hall.html` (Main Quest, CORE7, XTY) | board-game table |
| kitchen | ห้องครัว | `/ako/kitchen/` | salad bowl |
| classroom | ห้องเรียน | `/classroom/` (AI ใส่ซอส) | whiteboard |
| office | ห้องทำงาน | `/teambook/` | desk monitors |
| finale | Dusk, lights on | `/meet/` | big clover above the roof |

**Lucky quest:** one four-leaf clover hides in each room. Tap it in 3D, or use the room card's
hint button (press once for the hint, again to collect; keyboard accessible). Four clovers open
a lucky card that invites the visitor to talk to us. Progress is a per-viewer `localStorage`
convenience (`mc:tour:clovers:v1`) and is never sent anywhere.

## Rules this page keeps

- **Zero selling.** Rooms invite; nothing is priced or pitched.
- **DOM is the content.** Headings, copy and links live in `index.html`; the 3D stage only
  illustrates. Hotspot targets are read from each section's `[data-primary]` link, so there is
  one source of truth for destinations.
- **No telemetry, no third-party scripts.** Three.js r180 is self-hosted in `vendor/` (MIT,
  see `vendor/THREE-LICENSE.txt`). `RoomEnvironment.js` is the upstream addon with its import
  pointed at the vendored module.
- **Graceful degradation.** No WebGL or a boot error → `no-webgl` class, gradient backdrop,
  the full story still works. `prefers-reduced-motion` → camera cuts instead of glides, no
  ambient motion.
- **Budget.** Pixel ratio capped (1.5 phones / 1.75 desktop), shadows desktop only, rendering
  pauses on hidden tabs. All geometry is procedural; no model downloads.

## Status

Review route only: `/tour/` is `noindex` and `/` still serves the Compass front door. Promoting
it means pointing `/` at this page and deciding what happens to the Compass telemetry funnel.

## Tests

- `npm run test:tour` — every internal link and asset resolves; each room has one primary link
  and a clover hint; no third-party script origins.
- `TOUR_PLAYWRIGHT=<playwright dir> TOUR_CHROME=<chrome> npm run test:tour:ui` — walks every
  room, clicks a hidden clover in 3D, completes the quest via buttons, checks persistence and
  the no-WebGL fallback. Screenshots go to `TOUR_PROOF_DIR` (or a temp dir).
