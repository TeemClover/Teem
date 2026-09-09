# myClover V6.0 — Compass / RGBS Seed

[Design history and asset records](../docs/frontdoor/README.md) are grouped under `docs/frontdoor/`; browser-delivery images remain in `frontdoor/art/`.

[Release preparation](../docs/frontdoor/RELEASE.md) records the verified local scope, explicit commit review, X-VISOR handoff and the production backend prerequisite.

Local review: run `npm run dev:frontdoor` and use the URL printed by the preview server (`FRONTDOOR_PORT` can select 4173 or 4174). Branch `feat/adaptive-front-door-v1`. Root promotion and publication were authorized on 2026-09-10. `/` is rendered from this exact runtime by `npm run sync:frontdoor-root`; `/frontdoor/` remains its review alias and `/home/` preserves the original welcome. Original logo/favicon/video remain unchanged. Include the four audited TeamBook Compass adapters together. X-VISOR’s owner reopened development and placed its files on HOLD; preserve those files locally until a new READY. Live deployment status is recorded in the release report.

## Experience and purpose

The original cinematic Compass lifts from its actual filmed position. Its light reveals a living gorge below the same paper. Exploration and the optional hand-shaped crossing still give the first discovery before a question.

“อีกฝั่งหนึ่ง… อยากให้มีอะไรรออยู่?” lets the visitor choose a wish for this visit. RGBS keeps the existing canon: **RED Body, GREEN Soul, BLUE Mind, SILVER Craft**. It is not a personality test. The selected bank unfolds, an explicit crossing assembles paper toward it, and the visitor receives a small playable experience inside the same page. Their original artifact, river, video and marks remain mounted.

The commercial purpose is visible craft → a relevant experience → real value → a natural invitation to meet Teem, learn AI, care for oneself, or explore further. No visitor must finish the old free-course quest before being able to request coaching. No ranking/price/availability/revenue promise is invented.

| RGBS | First received experience | Continuation |
|---|---|---|
| Red / Body | Choose a flavor direction; discover a small ingredient/preparation experiment | Ako’s kitchen with seven usable salad/bowl/dressing recipes; optional health/food conversation |
| Green / Soul | Assemble an anchor → small action → observation rhythm; change the action and timing | Xircle V3 cinematic day and context experience; scoped health/Routine appointment with the selected subject |
| Blue / Mind | Choose a work context and scope, or try reading an AI mistake / improving an AI brief | Direct seven-part comic or AI ใส่ซอส first lesson; optional AI coaching/team/course appointment; network experiment → scoped opportunity conversation |
| Silver / Craft | Tap one prepared image collection; a real, playable gallery assembles immediately. Open its photographs and change its arrangement without typing | Carry the same gallery into Dungeon, with visual controls first and an optional code panel; save locally or continue to AI coaching |

RGBS describes four wishes, not a limit of four destinations. An additional **บ้าน myClover** choice leads to `/home/`, preserving the original homepage and its story-led route. This is a separate Compass path, with its own saved destination; it does not invent a fifth RGBS color or classify the visitor.

The four bank images are generated editorial scenes; Ako and Teem use the supplied real identity references. They are not documentary photographs of actual teaching/cooking events. Teem's recurring outfit is a black jacket with red lining/panels over a completely plain white shirt. The two food images show the actual ingredient directions used in the small kitchen experiment, which is not represented as an authored Ako recipe. Green records intention, not completed action or improved health. Blue is a prepared demonstration, not a live AI inference. Silver assembles a real DOM gallery from a bounded, prepared local collection; its photographs can be opened, and its layout can be changed. It continues as actual sandboxed HTML in Dungeon. Prompts, provenance and export sizes: [scene prompts](../docs/frontdoor/SCENES-V2-PROMPTS.md) and [food prompts](../docs/frontdoor/FOOD-V2-PROMPTS.md).

## Runtime

- `app.js`, `underpaper.js`, `paper-crossing.js`: approved opening, real hand trace, raster/WebGL fallback, lifecycle and input support.
- `motion.js`: separates the effects preference from the opening film's finite playback/held-frame lifecycle. No video loop is added.
- `assembly.js`: finite photographic paper unfolding and crossing from the existing artifact; original logo is drawn whole and unchanged. No ambient particle loop.
- `seed-path.js`: canonical RGBS registry, bounded reward companions, destinations and atomic checkpoint references.
- `path-runtime.js`: one wish, horizon, explicit crossing, local reward, continuation, Save/Resume/Rebuild, missing-image recovery.
- `rewards.js` / `rewards.css`: four small local experiences, no storage, telemetry, external request or live AI call of their own.
- `craft-handoff.js`: bounded local title/design/collection/photo → opaque reference → a playable sandboxed gallery and visual layout controls in Dungeon. The code editor is optional for recognized generated work; custom edited HTML is preserved rather than silently replaced with a template. Existing Dungeon state/lab/achievements are untouched. Invalid/expired references fail honestly.
- `compass-path.js`: previous six-pair contract retained to restore historical saved paths exactly.

No new framework or runtime dependency. Front Door never imports global `/assets/track.js`. Original opening assets remain; new bank images load only after their wish is selected, with 720px/mobile and 1200px/desktop variants. Explicit crop metadata preserves faces and meaningful objects through the paper aperture on tall tablets as well as phones/desktops. No logo generation or replacement.

## Save, privacy and telemetry

V2 remains analytics 2.0.0, with exactly 15 canonical event names. Experience version `frontdoor-seed-6.0`. Additive contract fields include door identifiers `ako`, `forge` and `home`, so their navigation is not mislabeled, and bounded optional `seedColor` for the RGBS breakdown. The extra Home path has no invented `seedColor`. Destination receipts use the separate contract described below.

`c7:install_id`, the existing isolated study journey namespace, old checkpoints and all legacy keys remain. V6 local companion keys use `mc:frontdoor:seed:v6:<journey>:<checkpointRef>`. Each contains bounded selected state and at most256 explored points/97 crossing points. The companion is written/read back before foundation checkpoint commit; either failure emits no successful durable SAVE and preserves the earlier reference. Titles remain local and never enter telemetry or URLs.

Returning visitors restore actual reward state (including title/design and optional gallery collection/photo), then explicitly resume. Refresh alone is not RETURN/RESUME. Rebuild starts another journey without deleting saved work. Previous Compass path checkpoints are restored through their retained contract; old title-based Silver work remains usable without being reinterpreted as a new gallery.

REWARD_HORIZON fires only after the selected bank is painted. DOOR_FOUND fires after a real reward outcome and continuation are visible. Early saves accurately store the reward stage. Canonical journey/event deduplication and delivery acknowledgment remain unchanged. DUNGEON_HANDOFF means departure, not confirmed arrival.

Craft links contain their durable opaque reference as soon as the completed link appears, including context-menu/new-tab opening. Records have24-hour expiry and active-journey checks. If storage fails, the visitor is told the work cannot travel and can explicitly open a new experiment. Dungeon now explicitly saves edited HTML with two verified revision slots per work, capped at 16,000 characters. Saved work survives the original handoff expiry; unsaved references still expire. Returning to the same completed seed reuses its work ID. A keepsake continuation can fork the exact saved source into a new journey while retaining the original. No code/title is sent to telemetry or a server.

## Effects control and the original house

**เอฟเฟกต์: เปิด/ปิด** is an effects preference, not a video Play/Pause button. The opening uses the original film's 10–12 second segment once, then holds the Compass at its pickup position. Turning effects on after this hold never replays the last second or rewinds the artifact. Pausing before the segment finishes can resume that unfinished portion. An early pickup and a returning saved journey do not wait for, reload or replay the film.

The switch controls reveal/assembly transitions and water motion. Turning it off freezes the water at its current phase; turning it on wakes the renderer even after its 30-second idle cutoff. Hidden documents suspend canvas work and CSS animation. Reduced-motion and data-saving preferences start with effects off; a visitor's explicit choice takes precedence for that runtime. The switch does not change saved progress or turn sound on. Browser tests exercise the visibility listener with a controlled document-visibility fixture; real iPhone/background-tab scheduling remains device QA.

`/home/` is the preserved original welcome and a meaningful extra destination from the Compass. The original 44-second spoken video remains available through **ดูคลิปเปิดบ้าน** and loads only after that explicit action; the separate muted background film retains its original role. The original Hall, story/comic and lesson routes remain reachable, with a link back to the Compass. `/home/` keeps its historical V1 `home-open` semantics, separate from `FRONTDOOR_OPEN`; its existing tracker is not imported into the new Front Door runtime. Root `index.html` now renders the same Compass body with public canonical/social metadata. Prepared destination events preserve `/` or `/frontdoor/` as the actual starting path. Run the sync command after editing `frontdoor/index.html`.

## Connected meeting intake

`/meet/?entry=compass&intent=ai&topic=private|team|course|academy|explore` supports private/executive coaching, team/org work, small courses, Pi R Academy referral or help choosing. Purpose remains editable. Existing health/opportunity/curious and existing drafts remain compatible. No automatic submission.

Xircle now uses the actual V3 source `6fab7897` (`feat/xircle-experience-v3`), merged as `e7b533a7` into remote main (`1984724c`) with identical V3 runtime files. The earlier `85f5b2ac` integration was V2, selected from stale local refs, and has been replaced with `experience-v3.js` / `experience-v3.css` and its cinematic scene plates. The original favicon is preserved. Green sends only `focus=sleep|move|food`; Xircle acknowledges that wish, explicitly labels its sample data and continues to `/meet/?intent=health&from=xircle&open=booking&focus=…`. The incoming link never overwrites a prior booking draft. Meet draft resumption uses the latest stored answers; explicitly discarding removes its pending in-memory copy too. Xircle V3 itself keeps fictional choices in memory and uses `#appointment` for the return from Meet, without a new storage key.

On 10 September, Xircle was corrected to one active V3 implementation. Its primary invitation is an appointment; no registration/download sequence or separate worker remains in the experience. V1/V2 engines, including the mistaken neutral `experience.js` / `experience.css`, are removed. Eight older experience entrances are compatibility aliases; reference pages are readable without the former five-stage gate. `/Xircle/` and `/xircle/` use the same source. Retired navigation engines and exact old page/document bytes are backed up outside the working repository; no legacy storage keys are changed. See `xircle/ROUTE_INDEX.md` for the current route map.

The existing `/api/meet` handler is now a small production wrapper around `api/_lib/meet-handler.js`. Production retains Neon, its existing schema, admin access and notification ordering. The shared handler validates AI purpose and optional health subject, persisting only bounded server-authored labels in the existing note column. No database migration. Booking contact details belong only to the explicit appointment request, never Front Door telemetry.

The local review server executes that same handler against real disk-backed SQLite. A small local adapter translates PostgreSQL types/casts/placeholders; it does not duplicate validation or invent successful writes. Local receipt IDs start `LOCAL-MEET-`; review and success clearly state this is a local test, with notifications disabled. It never connects to live Neon or sends external messages.

## Checks and local limits

```
npm run dev:frontdoor
npm run test:frontdoor
npm run test:frontdoor:ui
npm run test:frontdoor:path
npm run test:meet
npm run test:meet:ui
npm run test:meet:local:ui
npm run test:xircle:compass
```

Browser tools use FRONTDOOR_MINIFLARE, FRONTDOOR_PLAYWRIGHT, FRONTDOOR_CHROME and FRONTDOOR_PROOF_DIR for local dependency/output paths. Preview static allowlist includes the existing Ako and room assets; this is not deployed routing configuration.

Active browser journeys live under `tests/frontdoor/`, while unit tests stay beside their modules and backend/fixture tooling stays under `core7/tests/`:

| Browser proof | Scope |
|---|---|
| `opening.e2e.mjs` | Opening, pickup and first discovery |
| `rgbs.e2e.mjs` | RGBS rewards, saves, restoration and route handoff |
| `completion.e2e.mjs` | Full continuation through local meeting persistence and Stat |
| `learning.e2e.mjs` | Compass learning choice through real local telemetry and Stat |
| `learning-destinations.e2e.mjs` | Seven existing comic episodes into the practical course |
| `art.e2e.mjs` | Selected-only image loading and responsive crops |
| `performance.e2e.mjs` | Cold mobile network/CPU simulation |
| `motion.e2e.mjs` | Finite film, actual water pixels, effects preference and lifecycle |
| `meeting-intake.e2e.mjs` | Scoped Compass appointment intake |
| `house.e2e.mjs` | Extra original-house path and explicit full-video loading |
| `craft.e2e.mjs` | The same Silver work continued and saved in Dungeon |

`tests/teambook/compass-entry.e2e.mjs` is a separate TeamBook entry test using mocked responses; it is not evidence of a live TeamBook backend or a full Front Door completion. The superseded six-pair visual browser fixture is archived outside the repository. Its saved-state compatibility runtime remains active.

Verification covers two real local chains: browser → Pages handler → local D1 → Stat, and browser → shared Meet handler → SQLite insert/update → matching local receipt → authenticated queue → reopen persisted database. Focused request fixtures additionally cover malformed inputs, draft preservation and failure handling. SQLite proves the shared handler and local persistence, not live Neon deployment or notification delivery. Production deployment, physical iPhone Safari and production-scale performance remain separate review checks. All development telemetry is isolated from prod.

The opening controls use opaque dark-green surfaces and warm-white text (measured contrast13:1). Short landscape layouts omit the redundant grip hint. Mobile near-bank shading covers the constructed bright paper bridge as well as the underlying video, preserving text contrast after arrival.


## Completion pass · 2026-09-10

- The latest saved discovery per RGBS color appears in a small local keepsake map around the unchanged original brand asset. The index contains at most four opaque checkpoint references; older records are retained. Choosing an older keepsake explicitly starts a new journey with its content; this is REBUILD, never a fabricated RETURN/RESUME. Ordinary saved-current-journey return semantics remain unchanged.
- On desktop, the actual live care rhythm, AI example document, or network experiment assembles into the same world. On mobile, the same DOM node remains inline; first completion reveals the result before asking for navigation. No clone, fake output, or live AI claim.
- Blue network accepts bounded offer=skill|time|project and need=first-test|partner|mentor. The selected plan reaches a contextual opportunity intake; no promise of matching availability or income. Private/executive, team, course and Pi R Academy intake remain available. The optional long legacy lesson detour is removed from this short journey; direct old lessons still work.
- Ako now describes the actual V3 example day and continues on the same origin, preserving its existing explicit invitation. It no longer promises the retired test/free-room reward.

## Learning routes and imagery · 2026-09-10

- Blue → `เริ่มเรียน AI` → `เริ่มจากการ์ตูน` gives an immediate example of spotting an invented detail, then opens `/forge/ep1-everyone-gets-to-play/?entry=compass`. The seven-part reading rail reaches `/classroom/free-ai.html` directly from episode 7.
- Blue → `เริ่มเรียน AI` → `ลอง AI ใส่ซอส` gives a prepared vague-brief → context → checkable-email comparison, then opens the first full lesson directly. Both routes keep an optional course/coaching conversation.
- `learningPath` is optional and bounded to `comic|hands-on`. Old saved blue/course states without it retain their previous time-budget experiment and original Meet destination until the visitor explicitly chooses a new learning route. Save/Resume preserves the selected mode and actual example.
- `/classroom/` exposes the real six-lesson course and existing `mc_learn` start/resume progress above the fold. `/forge/` exposes all seven existing episodes. No prerequisite to read, learn or request coaching. The existing read-completion achievement still works.
- Episode 1 and episode 7 opt out of the old intermediate offer/modals through explicit per-page markers. Only marked reading links preserve `entry=forge`; unmarked legacy Main Quest links retain their prior behavior. No progress or achievement key is renamed or cleared.
- The selected bank uses a new square editorial photo: Ako with a delicious plate (red), an everyday pause (green), Teem in the signature black/red jacket and plain white shirt (blue), and a paper sketch becoming a webpage (silver). Two real ingredient photographs replace the food experiment's CSS shapes.
- Focused browser proofs: `tests/frontdoor/art.e2e.mjs`, `tests/frontdoor/learning-destinations.e2e.mjs`, and `tests/frontdoor/learning.e2e.mjs`. The last test uses real local D1 and protected Stat, with production traffic excluded.

### Destination outcomes (additive, separate from the 15 P0 events)

`assets/front-door/outcome-contract.js` owns version 1.0.0 receipts `DESTINATION_ARRIVAL` and `MEET_REQUEST_ACCEPTED`. The P0 analytics registry remains exactly 15 events at 2.0.0; `seedColor` is an optional bounded property. V1 semantics are unchanged.

An opaque `fdh` carries no content or contact information. A bounded local reference links to a prepared validated departure. Normal clicks capture/replay the **same canonical eventId** so navigation during an in-flight delivery cannot lose attribution. Context-menu/new-tab links commit their prepared departure only when the destination actually loads. Clicking again and BFCache restoration generate fresh handoffs. Dungeon replay includes the canonical DUNGEON_HANDOFF. No destination emits another FRONTDOOR_OPEN.

The learning receipt allowlist is explicit: `/forge/`, its exact seven episode paths, `/classroom/`, and its six full lesson paths. A Forge handoff can continue through the course and into Meet without changing attribution. The original-house destination accepts `/home/` as its own arrival path. Onward Classroom receipts do not inflate the Forge arrival count: primary arrival counts require the original Door's own accepted paths. No new receipt names, schema migration or version reinterpretation is needed.

POST `/api/core7/analytics/frontdoor-outcome` checks the existing environment/origin rules, ≤1 KiB receipt schema, canonical receipt name, bounded time and an accepted DOOR_OPEN. It persists only env/eventId/handoffId/name/path/time in additive `fd_v2_outcomes`, deduplicating per env/handoff/name/path. The additive `fd_v2_handoff` index covers departure receipt lookups. No contact data, user title, source HTML, note, finance or health answers enter this table. The browser outbox is capped at eight receipts; local contexts at 32 opaque references; no large offline log.

Stat reports distinct installations per departure Door: opened, actually loaded, and API-accepted request. The rate uses opened → requested, with chronological joins; a missing arrival cannot produce >100%. A receipt means the browser saw a successful persisted Meet request, **not that the appointment time was confirmed**. Direct destination visits, another browser/device, blocked storage or lost delivery may be unlinked. No production deployment or external notification has been performed.

Run `npm run test:frontdoor:completion` for the real browser → local Meet SQLite → local D1 → protected Stat proof, including a saved craft fork and Xircle-to-Meet continuation. `tests/frontdoor/craft.e2e.mjs` and `tests/frontdoor/meeting-intake.e2e.mjs` cover the focused destination endings.

Cold mobile simulation (1.6 Mbps, 80 ms latency, 4× CPU throttle, empty cache) showed opening controls in ~0.4 s and retained a tap at ~0.94 s. Essential discovery layers were ready in ~4.1 s and the full reveal in ~5.9 s from navigation, down from ~11.6 s in the initial measurement. These are local Chrome simulations, not real iPhone measurements. Original video/brand assets remain untouched; responsive world/Compass exports are documented in [mobile export notes](../docs/frontdoor/MOBILE-EXPORTS.md).

## Local tool requirements

Use Node 24 or newer for the real SQLite fixtures. The optional Forge generator
check uses Python 3.10 or newer with Pillow. Miniflare and Playwright can be
provided through the documented `FRONTDOOR_MINIFLARE` and
`FRONTDOOR_PLAYWRIGHT` paths; browser checks also need Chrome. These developer
dependencies are not downloaded by the public website.
