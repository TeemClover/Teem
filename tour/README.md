# บ้าน myClover — 3D house tour (homepage candidate)

A scroll-driven 3D walk through the myClover house. Each scroll section moves the camera to a
room; each room sends the visitor to a real part of the site.

Files: `tour.js` (runtime: scroll, camera, picking, quest, quality), `house.js` (scene
construction), `textures.js` (procedural canvas textures + lazy image textures).

Eight scroll sections. Each room has a primary link plus objects people can pick up
(tap/click → the object floats toward you and a panel offers its page). Every object is a
`[data-item]` link in `index.html`; the 3D hotspot reads its label, description and URL from there.

| Section | Room | Objects → destination |
|---|---|---|
| hero / door | Front garden; door with a welcome sign opens | — |
| books | มุมหนังสือ | AI ใส่ซอส book → `/ai-source/` · Forge → `/forge/` · Walkthrough → `/walkthrough/` |
| living | ห้องนั่งเล่น | compass on the map → `/frontdoor/` (old homepage) · CORE7 cards → `/core7/` · Main Quest box → `/hall.html` · mini dollhouse → `/showcase/house/` · Teem's photo → `/resume/` |
| kitchen | ห้องครัว | salad bowl → `/ako/kitchen/` · three framed dishes → their recipes · recipe book → `/ako/` |
| classroom | ห้องเรียน | course poster → `/courses/` · whiteboard → `/classroom/` · four laptops → LV.1–LV.4 · sauce cup → `/classroom/sauce-cup/` |
| office | ห้องคอม | four screens: X-VISOR → `/xvisor/` · TeamBook → `/teambook/` · XIRCLE → `/xircle/` · card maker → `/card/` |
| finale | Dusk, lights on | big clover / button → `/meet/` |

Glowing beacons mark pickable objects near the current view. Hovering a link in a card lights
up the same object. Photos (food, screens, portrait, cards, compass) reuse images already on the
site and load lazily.

**SD / HD:** SD is the default and is remembered per viewer (`mc:tour:quality`). HD rebuilds
the house with 2× textures, rounded-furniture detail, soft 2048 px shadows (also on phones),
more meadow/hedge detail and up to 2× pixel ratio.

**No flicker by design:** the facade sinks into the ground and the roof lifts away (both
opaque; no transparency sorting), the canvas follows its `100lvh` box and ignores phone toolbar
resizes, the camera eases with real-time damping and long holds per room, and the sky is a
gradient dome rather than a switching background colour.

**Lucky quest:** one four-leaf clover hides in the living room, kitchen, classroom and office.
Tap it in 3D, or use the room card's hint button (press once for the hint, again to collect;
keyboard accessible). Four clovers open a lucky card that invites the visitor to talk to us.
Progress is a per-viewer `localStorage` convenience (`mc:tour:clovers:v1`), never sent anywhere.

## Rules this page keeps

- **Invitations, not pitches.** Rooms invite; nothing on this page shows a price. The book
  corner and classroom poster link to the AI ใส่ซอส and course pages, which do.
- **DOM is the content.** Headings, copy and links live in `index.html`; the 3D stage only
  illustrates. Hotspot targets are read from each section's `[data-primary]` link, so there is
  one source of truth for destinations.
- **No telemetry, no third-party scripts.** Three.js r180 is self-hosted in `vendor/` (MIT,
  see `vendor/THREE-LICENSE.txt`). `RoomEnvironment.js` is the upstream addon with its import
  pointed at the vendored module.
- **Graceful degradation.** No WebGL or a boot error → `no-webgl` class, gradient backdrop,
  the full story still works. `prefers-reduced-motion` → camera cuts instead of glides, no
  ambient motion.
- **Budget.** SD: pixel ratio 1.25 phones / 1.5 desktop, shadows off on phones; HD as above.
  Rendering pauses on hidden tabs. All geometry is procedural; no model downloads.

## Status

Review route only: `/tour/` is `noindex` and `/` still serves the Compass front door. Promoting
it means pointing `/` at this page and deciding what happens to the Compass telemetry funnel.

## Tests

- `npm run test:tour` — every internal link and asset resolves; each room has one primary link
  and a clover hint; no third-party script origins.
- `TOUR_PLAYWRIGHT=<playwright dir> TOUR_CHROME=<chrome> npm run test:tour:ui` — walks every
  room, checks all 25 objects match page links, picks up a screen in 3D, clicks a hidden
  clover in 3D, completes the quest via buttons, checks persistence and
  the SD→HD rebuild and the no-WebGL fallback. Screenshots go to `TOUR_PROOF_DIR` (or a temp dir).
