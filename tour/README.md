# บ้าน myClover — 3D house tour (homepage)

A scroll-driven 3D walk through the myClover house. Each scroll section moves the camera to a
room; each room sends the visitor to a real part of the site.

Files: `tour.js` (runtime: scroll, camera, picking, quest, quality, music), `house.js` (the house
and its rooms), `textures.js` (procedural canvas textures + cropped image textures),
`art/` (purpose-made pictures, WebP), `IMAGE-PROMPTS.md` (what they were generated from).

The house is our real two-storey home from `/showcase/house/` (outside only: two orange hip
roofs, big dark-framed windows, a glass balcony, a carport with the family car, solar panels),
opened like a dollhouse. Inside are four rooms of the website, two per floor, plus a stair hall
added on the right so the walk goes from the kitchen up to the classroom:

```
ชั้น 2   ห้องโปรเจกต์ (project room)   ห้องเรียน (classroom)   ┐ โถงบันได
ชั้น 1   ห้องนั่งเล่น (living room)     ห้องครัว (kitchen)       ┘ (stair hall)
```

Scrolling runs straight down the page: front garden → door → living room → kitchen → stairs →
classroom → project room → back outside at dusk. The floor-1 front sinks into the ground; the
floor-2 front, balcony and roofs lift away together. Every object people can pick up is a
`[data-item]` link in `index.html`; the 3D hotspot reads its label, description and URL there.
Tapping one makes it float toward you and a panel offers its page.

| Room | Objects → destination |
|---|---|
| Living room | compass on the map → `/compass/` (the old homepage) · AI ใส่ซอส book → `/book/ai-sauce/` · CORE7 cards → `/core7/` · Main Quest box → `/hall.html` · Forge → `/forge/` · Walkthrough → `/walkthrough/` · Teem's photo → `/resume/` · record player → plays the house music |
| Kitchen | salad bowl → `/ako/kitchen/` · stove with a pot of simmering sauce → `/homechew/` · three framed dishes → their recipes · recipe book → `/ako/` · XIRCLE Scale → `/xircle/` |
| Stair hall | floating oak stairs, fairy lights on the rail, a gallery of home photos (no links) |
| Classroom | course easel → `/courses/` · whiteboard → `/classroom/` · four computers: บท 1 → `/classroom/free-ai.html`, บท 4 → `/classroom/notebooklm.html`, บท 5 → `/classroom/prompts.html`, one playing THE DUNGEON → `/classroom/dungeon/` |
| Project room | screens: X-VISOR QUEST → `/xvisor/` · Resume → `/resume/` · TeamBook notebook on its stand → `/teambook/` · model of our real house turning on the centre table → `/showcase/house/` |
| Outside | the big clover / finale button → `/meet/` |

Glowing beacons mark pickable objects in the room you are looking at, and every object has an
invisible, slightly larger tap area. Hovering a link in a card lights up the same object.
Picking follows the first surface the ray meets, so walls, floors and furniture block what is
behind them, and only objects of the room you are standing in respond.

**Motion:** wheel/trackpad scrolling is smoothed by Lenis (self-hosted, MIT,
`vendor/LENIS-LICENSE.txt`; touch keeps the phone's native scroll). The camera follows one
centripetal Catmull-Rom spline through every shot with a quint ease between rooms and a
critically damped spring (no overshoot), plus a slow breath while resting. Cards lift in, their
headline rises out of a mask, and chips follow one by one. Reduced motion turns all of it off.

**Music:** the myClover Instrument (the Clover Song instrumental, `/assets/audio/clover-song.mp3`,
`preload="none"`) plays only when someone presses the music button or taps the record player.

**Pictures:** each is cropped to fill its frame (never stretched). SD loads room by room (the
current room and the next two); HD prepares all room art behind its loader, with a 4-second
deadline so an unavailable image never blocks the house. Every picture material starts with a 1×1 placeholder map, so a
picture arriving mid-scroll never recompiles a shader. The six purpose-made pictures from
`IMAGE-PROMPTS.md` are in `art/` as WebP (resized for their frames) and mapped in
`art/manifest.json`; `art/dungeon-screen.webp` is a capture of the Dungeon's pixel field.

**SD / HD:** SD is the default and is remembered per viewer (`mc:tour:quality`). HD rebuilds
with 2× surface textures, normal maps, soft shadows (2048 px desktop / 1024 px phones),
anisotropy and extra room props. Ambient occlusion and bloom are optional adaptive effects.
Desktop HD starts at DPR 1.35 with bloom; phone HD starts at DPR 1.1 without screen effects.
A sustained fast device can reach DPR 1.5 + half-resolution GTAO; slow devices shed effects
before going down to DPR 1.1 / 0.85. Frame buffers are capped at 2.4 million pixels on desktop
and 1.3 million on phones, including large and high-DPI displays.

**Smooth HD:** the governor reacts to sustained slow frames in under a second, including
frames slower than 250 ms, and requires 10 continuous fast seconds plus cooldown to recover.
HD surface detail and props stay enabled at every level. Static repeated furniture is batched;
small meadow leaves use flat geometry instead of the hero clover's heavily bevelled model.
Shadows are shared across passes and refreshed at most 24 times per second. Scene, shadow and
post-process shaders warm behind the loader. Rebuilds pause rendering and release old image
crops, instance buffers and post-processing resources. A real-device frame rate still depends
on its GPU, thermal state and other browser work; browser emulation is not a physical-phone benchmark.

**Art corrections:** the course illustration uses Teem's actual identity reference; Resume
and X-VISOR screens display captures of their current pages. TeamBook and Dungeon frame ratios
match their art. See `art/POLISH-20260926.md` for sources and the image-edit prompt.
Portrait room framing puts the room above the card instead of leaving a large empty sky.

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

- **Explore first.** The page invites people to look around, get to know us, and go on to a
  course, a product or our work. It shows no prices itself; the course, book and Homechew pages do.
- **DOM is the content.** Headings, copy and links live in `index.html`; the 3D stage only
  illustrates. Hotspot targets are read from each section's `[data-primary]` link, so there is
  one source of truth for destinations.
- **No telemetry, no third-party scripts.** Three.js r180 is self-hosted in `vendor/` (MIT,
  see `vendor/THREE-LICENSE.txt`). `RoomEnvironment.js` is the upstream addon with its import
  pointed at the vendored module.
- **Graceful degradation.** The HTML is readable before any 3D. No WebGL or a boot error →
  `no-webgl` class, gradient backdrop, the full story still works. If the module itself can't
  load (blocked, offline), an inline guard lifts the loader after 6 s and shows every card
  (`html.static`); `<noscript>` does the same without JavaScript. `prefers-reduced-motion` → camera cuts instead of glides, no
  ambient motion.
- **Budget.** SD: pixel ratio 1.25 phones / 1.5 desktop, shadows off on phones; HD as above.
  Rendering pauses on hidden tabs. All geometry is procedural; no model downloads.

## Status

Promoted on 2026-09-26: `/` is rendered from `tour/index.html` by `npm run sync:frontdoor-root`
(`index,follow`, canonical `/`). `/tour/` stays as a `noindex` review alias with canonical `/`.
The previous Compass front door moved to `/compass/` (same runtime, same telemetry; entry path
`/compass/`), reachable from the compass on the living-room game table. Edit `tour/index.html`,
then re-run the sync; never edit the root `index.html` by hand.

## Tests

- `npm run test:tour` — every internal link and asset resolves; each room has one primary link
  and a clover hint; no third-party script origins.
- `TOUR_PLAYWRIGHT=<playwright dir> TOUR_CHROME=<chrome> npm run test:tour:ui` — no pick through
  the walls from the garden, walks every room (stairs included), every 3D object matches a page
  link, picks up the TeamBook notebook, lesson computers → บท 1/4/5 + Dungeon, clicks a hidden
  clover, the record player plays and stops the music, the button quest, persistence, repeated SD/HD rebuilds with GPU-resource checks, phone WebGL HD, rail names and 32×44 px targets on a phone, the no-WebGL fallback, and the blocked-module
  fallback. Screenshots go to `TOUR_PROOF_DIR` (or a temp dir).

`TOUR_HARDWARE=1` runs browser verification on the installed GPU instead of SwiftShader.

## Book preview (`/book/ai-sauce/`)

Free preview of *คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น*. The full PDF stays a locked
course file inside `/learn`; only the first 10 pages are published, as images.

- Publish/refresh: `pip install pymupdf && python3 tools/build-ebook-preview.py <local PDF>`.
  It writes `book/ai-sauce/pages/p01..p10(.jpg|-m.jpg)` and `manifest.json` (hard cap: 10 pages).
  The PDF is never copied into the repo.
- The reader always ends on a lock page: `/ai-source/` for new readers, `/learn/` for students.
  Without a manifest it shows only that lock page.
- `npm run test:tour:book` — reader test with a fake 36-page manifest (desktop + phone).
