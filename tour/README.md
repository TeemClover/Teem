# บ้าน myClover — 3D house tour (homepage candidate)

A scroll-driven 3D walk through the myClover house. Each scroll section moves the camera to a
room; each room sends the visitor to a real part of the site.

Files: `tour.js` (runtime: scroll, camera, picking, quest, quality), `house.js` (the house and
its rooms), `textures.js` (procedural canvas textures + lazy, cropped image textures),
`art/` (optional purpose-made pictures), `IMAGE-PROMPTS.md` (what to generate).

The house is our real two-storey home from `/showcase/house/` (outside only: two orange hip
roofs, big dark-framed windows, a glass balcony, a carport with the family car, solar panels),
opened like a dollhouse. Inside are four rooms of the website, two per floor:

```
ชั้น 2   ห้องคอม (computer room)     ห้องเรียน (classroom)
ชั้น 1   ห้องนั่งเล่น (living room)    ห้องครัว (kitchen)
```

Scrolling runs straight down the page: front garden → door → living room → kitchen → up to the
classroom → computer room → back outside at dusk. The floor-1 front sinks into the ground; the
floor-2 front, balcony and roofs lift away together. Every object people can pick up is a
`[data-item]` link in `index.html`; the 3D hotspot reads its label, description and URL there.
Tapping one makes it float toward you and a panel offers its page.

| Room | Objects → destination |
|---|---|
| Living room | compass on the map → `/frontdoor/` (the old homepage) · AI ใส่ซอส book → `/book/ai-sauce/` · CORE7 cards → `/core7/` · mini model of this house → `/showcase/house/` · Main Quest box → `/hall.html` · Forge → `/forge/` · Walkthrough → `/walkthrough/` · Teem's photo → `/resume/` |
| Kitchen | salad bowl → `/ako/kitchen/` · three framed dishes → their recipes · recipe book → `/ako/` · XIRCLE Scale → `/xircle/` |
| Classroom | course announcement easel → `/courses/` · whiteboard → `/classroom/` (one way into the free lessons) |
| Computer room | screens: X-VISOR QUEST → `/xvisor/` · เลือกสายของคุณ → `/paths/` · การ์ดประจำตัว → `/card/` · TeamBook notebook on the desk → `/teambook/` |
| Outside | the big clover / finale button → `/meet/` |

Glowing beacons mark pickable objects in the room you are looking at, and every object has an
invisible, slightly larger tap area. Hovering a link in a card lights up the same object.

**Pictures:** photos reuse images already on the site and load lazily. Each is cropped to fill
its frame (never stretched). Pictures whose shape is far from their frame have art slots:
`IMAGE-PROMPTS.md` has the GPT prompts; drop the file in `art/` and map it in
`art/manifest.json` (`{"slots": {"forge-cover": "forge-cover.webp"}}`), no code change.

**SD / HD:** SD is the default and is remembered per viewer (`mc:tour:quality`). HD rebuilds
the house with 2× procedural textures plus normal maps (wood grain, plank seams, fabric weave,
plaster, tiles, cork, grass), 16× anisotropy, soft 2048 px shadows (also on phones), ambient
occlusion (GTAO) and a light bloom on lamps and screens, up to 2× pixel ratio (1.75 on phones),
and HD-only props: clocks, wall shelves and vases, a globe and bookends, utensil rail and
kettle, desk lamp and keyboard keys, pencil cups, garden lanterns, a bench and a mailbox.
Post-processing add-ons are vendored from three.js r180 under `vendor/addons/` with their
`three` import pointed at the vendored module. The AO pass skips sprites, particles, the sky
and see-through meshes (otherwise they render as dark blocks).

**No flicker by design:** the facade sinks into the ground and the roof lifts away (both
opaque; no transparency sorting); the canvas follows its `100lvh` box and ignores phone toolbar
resizes; the camera eases with real-time damping and long holds per room; the sky is a
gradient dome. Flat decals (pictures, screens, labels) carry a depth bias, stacked cards sit
5 mm apart, and no two building surfaces share a plane: the plinth sits 4 cm below the floors (coplanar faces z-fought on phones), the
camera near plane is 0.3 m for depth precision, and the shadow camera follows the view in whole
shadow-map texels in light space, so shadow edges do not shimmer while scrolling.

**Lucky quest:** one four-leaf clover hides in each of the four rooms.
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
  room, checks every 3D object matches a page link, picks up the TeamBook notebook in 3D, clicks a hidden
  clover in 3D, completes the quest via buttons, checks persistence and
  the SD→HD rebuild and the no-WebGL fallback. Screenshots go to `TOUR_PROOF_DIR` (or a temp dir).

## Book preview (`/book/ai-sauce/`)

Free preview of *คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น*. The full PDF stays a locked
course file inside `/learn`; only the first 10 pages are published, as images.

- Publish/refresh: `pip install pymupdf && python3 tools/build-ebook-preview.py <local PDF>`.
  It writes `book/ai-sauce/pages/p01..p10(.jpg|-m.jpg)` and `manifest.json` (hard cap: 10 pages).
  The PDF is never copied into the repo.
- The reader always ends on a lock page: `/ai-source/` for new readers, `/learn/` for students.
  Without a manifest it shows only that lock page.
- `npm run test:tour:book` — reader test with a fake 36-page manifest (desktop + phone).
