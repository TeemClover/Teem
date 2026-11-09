# บ้าน myClover — CAIO portfolio tour

A scroll-driven 3D walk through the myClover house. Each scroll section moves the camera to a
room; each room sends the visitor to a real part of the site. The professional introduction and
second-floor workbench present Narin “Teem” Leelaporn as CAIO · Clover X.

Files: `tour.js` (runtime: scroll, camera, picking, quest, quality, music), `intro.js` (the
loading intro), `house.js` (the house and its rooms), `textures.js` (procedural canvas textures + cropped image textures),
`portfolio.js` / `portfolio.css` (the accessible workbench gallery), `art/` (purpose-made pictures,
WebP), `IMAGE-PROMPTS.md` (what they were generated from).

The house is our real two-storey home from `/showcase/house/` (outside only: two orange hip
roofs, big dark-framed windows, a glass balcony, a carport with the family car, solar panels),
opened like a dollhouse. Inside are four rooms of the website, two per floor, plus a stair hall
added on the right so the walk goes from the kitchen up to the classroom:

```
ชั้น 2   ห้องทำงาน (office)            ห้องเรียน (classroom)   ┐ โถงบันได
ชั้น 1   ห้องนั่งเล่น (living room)     ห้องครัว (kitchen)       ┘ (stair hall)
```

Scrolling runs straight down the page: front garden → door → living room → kitchen → stairs →
classroom → office → back outside at dusk. The floor-1 front sinks into the ground; the
floor-2 front, balcony and roofs lift away together. Every object people can pick up is a
`[data-item]` link in `index.html`; the 3D hotspot reads its label, description and URL there.
Tapping one makes it float toward you and a panel offers its page.

| Room | Objects → destination |
|---|---|
| Living room | compass on the map → `/compass/` (the old homepage) · AI ใส่ซอส book → `/book/ai-sauce/` · CORE7 cards → `/core7/` · Main Quest box → `/hall.html` · Forge → `/forge/` · Walkthrough → `/walkthrough/` · Teem's photo → `/resume/` · record player → plays the house music |
| Kitchen | salad bowl → `/ako/kitchen/` · stove with a pot of simmering sauce → `/homechew/` · hamburg steak plate with a FOOD FAIR table sign on the island → `/hamburg/` · three framed dishes on the wall (pictures only, no links) · recipe book → `/ako/` · XIRCLE Scale → `/xircle/` |
| Stair hall | floating oak stairs, fairy lights on the rail, a gallery of home photos (no links) |
| Classroom | course easel → `/courses/` · whiteboard → `/classroom/` · four computers: บท 1 → `/classroom/free-ai.html`, บท 4 → `/classroom/notebooklm.html`, บท 5 → `/classroom/prompts.html`, one playing THE DUNGEON → `/classroom/dungeon/` |
| Office | XIRCLE screen → `/xircle/` · CAIO profile screen → `/resume/` · Airova screen → `/airova/` · X-VISOR Quest tablet → `/xvisor/` · TeamBook notebook → `/teambook/` · house model → `/showcase/house/` · Mediral cabinet → `/mediral/` · company frame → `https://www.cloverx.co.th/th` · depa placard → the primary announcement below |
| Outside | the big clover / finale button → `/meet/` |

Gold cursor badges mark every pickable object in the current room. Opened objects keep a silver check badge, remain pickable, and retain their status in `mc:tour:opened:v1` local storage. Inspecting an object or opening its destination records it; storage denial falls back to memory. Badges stay about 30 CSS pixels across SD/HD and phone views. The original object materials and image colours stay unchanged in both states.

The paired living-room portraits reuse `/meet/img/teem.jpg` and `/meet/img/ako.jpg`, linking to `/resume/` and `/ako/`. The upstairs office includes a forest-green and cream glass display cabinet marked **Mediral · Partner Project**, linking to `/mediral/`. Its five product images reuse `/mediral/assets/`. `art/mediral-wordmark.svg` copies the original brand wordmark paths, adding explicit dimensions so WebGL can upload it. These textures load with the office and add no lights or animation.

The office centre stays empty for circulation. Two chairs tuck under the rear worktop; the tower sits under it, and the house model no longer has a pedestal in the walkway. The wider office camera and narrower desktop card keep the side furnishings visible. The kitchen notebook uses the generated `art/ako-cookbook-v1.webp` illustration, documented in `art/AKO-COOKBOOK.md`; its Thai title is a separate font-rendered decal.

All destination links, including the inspect panel and fallback HTML, use a new tab with `noopener noreferrer`. In-page room navigation stays in the house. Arrows/checkmarks and link titles distinguish states without relying only on colour.

A static anatomical torso stands by the kitchen's left wall and opens `/routinex/absorb/` for the nutrition/body learning journey. The stylized teaching model uses shared native geometry and materials, without another image download or animation. The upper-storey fascia sits 2 cm ahead of the slab face to prevent the coplanar shimmer seen from outside; the SD/HD browser checks verify the actual geometry clearance.

Picking follows the first surface the ray meets, so walls, floors and furniture block objects behind them; only the current room responds. The Airova screen uses a generated cinema illustration with a film preview and shot sequence, documented in `art/AIROVA-CINEMA.md`. It adds no video playback or animated light.

**Motion:** wheel/trackpad scrolling is smoothed by Lenis (self-hosted, MIT,
`vendor/LENIS-LICENSE.txt`; touch keeps the phone's native scroll). The camera follows one
centripetal Catmull-Rom spline through every shot with a quint ease between rooms and a
critically damped spring (no overshoot), plus a slow breath while resting. Cards lift in, their
headline rises out of a mask, and chips follow one by one. Reduced motion turns all of it off.

**Loading intro:** while the house is prepared, a four-leaf clover is the plot of land and a
small house goes up on it: blueprint, ground floor, upper floor, orange roof, lights on. Each
step is a real milestone reported by `tour.js` through `window.__intro(stage)` (1 engine running,
2 fonts and art list ready, 3 house built, 4 shaders compiled), one leaf lights per step, and the
line under it counts the engine files as they arrive. The status line cycles through what is
"being built" and a second line rotates tips about the house (both lists are at the top of
`intro.js`). When the first frame is drawn the clover turns gold and its shape widens into the
real house. Everything that moves is `transform`/`opacity` only (`tests/tour/intro.test.mjs`
checks the keyframes), because building the house occupies the main thread; `tour.js` yields one
frame before each heavy step so the next storey is already on its way. The intro never waits
for itself: it ends when `is-loading` leaves `<body>`, whichever path removed it. While the
clover opens (about a second) `tour.js` holds the 3D picture and `textures.js` holds its picture uploads, because
the opening is drawn by the GPU as well and a moving scene under it stuttered on large
screens; scrolling ends the hold at once. The sheet with the clover-shaped opening is a
canvas painted once; during the opening `intro.js` erases a larger clover from it each frame,
growing by the same proportion each moment. (As one CSS-stretched layer it vanished on large
screens, because browsers drop a layer that passes their size limit. Of the per-frame ways to
draw it, only a CPU-backed canvas of bounded size held 60 fps on a 5K display.) Reduced motion
keeps the stages and the words, without movement, and fades out.

**Loading order:** the Google Fonts stylesheet does not block the first paint
(`media="print"` until loaded; `tour.js` waits for its faces before drawing canvas labels), and
every module in the house's import graph has a `modulepreload` link, so they download together
instead of one import level at a time. Adding an import means adding its matching link in
`/tour/index.html`; versioned import and preload URLs must agree. The root homepage has its own module graph.

**Smooth walk:** three things used to cost frames between the garden and the rooms, and each has
a guard in `tests/tour/smooth.test.mjs`.
- *Lights never change in number.* three.js compiles lit shaders for an exact light count, and
  the porch lamp used to vanish with the facade, recompiling every material in view at the
  door. All lamps now hang on the house root (`lampLight`); `tour.js` moves the porch lamp with
  the facade and dims it instead of hiding it.
- *Pictures never decode or upload inside a frame that shows them.* `imageTex` decodes with
  `createImageBitmap` off the main thread (falling back to `<img>` where its options are not
  honoured, and for SVG), caps the long side at 1024 px, and sends one new picture per frame to
  the GPU with `renderer.initTexture` before the material uses it.
- *What cannot be seen is not drawn.* While the facade and door are closed (the garden and the
  dusk ending) the four rooms in `house.areas` are hidden, which is well over half of the draw
  calls (the stair hall stays: its own floor and walls show from the garden). Inside they are all shown: the open dollhouse shows a little of every
  neighbour, above and beside. A far overview is rendered once behind the loader so every
  buffer and texture is on the GPU before the walk begins.

The shadow map (desktop only) is redrawn at 24 Hz only while something that casts a shadow
moves; a camera gliding past still furniture redraws it when the view nears the edge of what
the map covers, and otherwise four times a second.

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

**Art corrections:** the course illustration uses Teem's actual identity reference. X-VISOR
uses its existing page capture; the CAIO profile is a native canvas label and XIRCLE uses
the genuine `/work/media/xircle-presentation.webp` capture. TeamBook and Dungeon frame ratios
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
keyboard accessible). The lucky card always carries a line to keep, and "สุ่มอีกใบ" draws
another. With all four clovers found it also says where the prize is, the computer upstairs
that is unlike the others (the Dungeon laptop, `PRIZE` in `tour.js`), and offers a button that
scrolls to the classroom from anywhere in the house. That computer reads the same for
everyone and anyone can open it; opening it is the visitor's own step.
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
  load (blocked, offline), an inline guard ends the loading intro after 6 s and shows every card
  (`html.static`); `<noscript>` does the same without JavaScript. `prefers-reduced-motion` → camera cuts instead of glides, no
  ambient motion.
- **Files of different releases must work together.** The page and each module are fetched
  separately, so a visitor can hold a cached copy of one beside a fresh copy of another. Do
  not import a new name across `tour/` files, or rely on a new field of another file, in the
  same release that adds it: that pairing fails to link and the house never loads. Add the
  name first, use it a release later, or keep the two halves independent as the picture
  queue is.
- **Budget.** SD: pixel ratio 1.25 phones / 1.5 desktop, shadows off on phones; HD as above.
  Rendering pauses on hidden tabs. All geometry is procedural; no model downloads.

## Professional workbench (2026-11-09)

The hero leads directly to the office or `/resume/`. Room anchors center the section at the
camera stop, focus its heading, and restore on Back/Forward. Actual width changes preserve the
current interpolated point in the walk; same-width phone toolbar changes do not move it.

The native `#workbench` dialog holds eight inspectable works: XIRCLE, RoutineX, Mediral,
Airova, AI ใส่ซอส, X-VISOR Quest, TeamBook and House 3D. Type badges distinguish brand work,
partner pages, simulations and personal projects. The copy does not claim sales, user counts
or a production launch for prototypes. All cards and images are static HTML; filters, counts
and URL state are an enhancement in `portfolio.js`. Gallery URLs use bounded
`?view=work&filter=all|cloverx|systems|learning#office` state. Back closes, Forward reopens,
Escape returns focus, and Lenis pauses while the native modal owns scrolling. With JavaScript
disabled, the opener stays hidden and `/work/` remains available.

The office has 30 pickable objects across the house: all 27 older IDs plus `office-xircle`,
`company-cloverx` and `depa-news`. New office art adds no lights, animation loops or external
image requests. XIRCLE is lazily loaded with the office; profile, company and press labels use
native canvas. The room retains the old links, quest, music and visited-item state.

The company link is the public official `https://www.cloverx.co.th/th`. The news board links
to [depa’s RUNWAY TO SLUSH 2026 announcement](https://www.depa.or.th/th/article-view/20260918_01),
checked 2026-11-09. It names CloverX among eight selected Thai digital startup teams for
SLUSH in Helsinki, 18–19 November 2026. At this change’s date the event is upcoming: the
copy says selected to attend, not already attended, an award, technology certification or an
individual endorsement. No publication date is inferred from the URL. The board uses native
text artwork; no third-party news photo is copied.

`art/og-caio-tour-20261109.jpg` is a 1200×630 JPEG crop of the actual local Tour hero
(`desktop-hero-1440.png`, Chromium browser verification, 2026-11-09), not a generated UI mockup.
It replaces the old lucky-card share image.

`/resume/` uses the same user-authorized CAIO role in Thai/English copy, page metadata and
structured data. Existing project-specific contributions stay distinct. No CAIO PDF download
is offered because no public PDF source was supplied with this change.

## Status

`/tour/` is an independent indexed page with canonical `https://www.myclover.com/tour/`.
The root homepage is generated from `entry/home.html`; this change does not regenerate it or
change `/compass/`. Edit `tour/index.html` directly for Tour content.

## Tests

- `npm run test:tour` — internal links/assets, exact DOM/3D item IDs, room primary links,
  preload graph and rendering contracts, CAIO/work-type copy and official company/news allowlists.
- `TOUR_PLAYWRIGHT=<playwright dir> TOUR_CHROME=<chrome> npm run test:tour:ui` — no pick through
  the walls from the garden, walks every room (stairs included), every 3D object matches a page
  link, picks up the TeamBook notebook, lesson computers → บท 1/4/5 + Dungeon, clicks a hidden
  clover, the record player plays and stops the music, the button quest, persistence, repeated SD/HD rebuilds with GPU-resource checks, phone WebGL HD, rail names and 32×44 px targets on a phone, the no-WebGL fallback, and the blocked-module
  fallback. It also checks the real hero/rail/Back journey, eight-work gallery at 320/390/768/1440 px,
  filters/counts, modal focus, URL/reload/Back/Forward, image decode and no-JavaScript fallback.
  Screenshots and a timestamped report go to `TOUR_PROOF_DIR` (or a temp dir).

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
