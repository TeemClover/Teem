# Mediral five-piece set — `/mediral/`

**Motion v2 — one cinema (2026-09-29).** The story is one sticky viewport driven by one scroll clock, not five boxed product slides. The order is: **opening (promise "จากล้างหน้า / ถึงผิวพร้อมออกจากบ้าน", five packs on a stone ledge) → the routine row (ล้าง · บำรุง · ปกป้อง · แต่งผิว) → CL → AC → BR → SU → PO → the five reassembled → the set (a short real exchange, the five pieces, working actions) → optional serum comparison and ingredient library.** The order explains roles; it is not a layering instruction, and no one needs all five.

Every chapter opens on the reader's problem, read whole, then a two-line promise, one to three benefit waves and one support line. Objects carry chapters across: a foam front washes the routine row into the rinse scene and the bottle hands off at an identical pose; a water ring rises at the bottle's foot and opens into AC with four depths moving at different rates; the camera flies into the drop resting beside the capped AC bottle and comes out in BR's gold light (a new world, not AC's formula flowing into BR); a light streak wipes sideways into SU; air thickens into powder over PO; PO dissolves over the reassembled five. Glass, drops, foam, ribbon and powder are concept imagery, never a manufacturing process, test or product texture.

The owner's full reply and Teem's message sit together near the set as one editorial exchange: a personal trial impression with no SKU named, and a personal statement of intent. Neither is a review, rating or efficacy proof. General acne knowledge (NHS/NIAMS) sits behind "ทำความเข้าใจผิวที่เป็นสิวง่าย" in the AC library entry, apart from the product's promise.

Commerce: there is no buy button. The working actions are "บันทึกรายการที่เลือก" (PNG) and "คัดลอกรายการ", and "ดู Mediral บน TikTok" opens the brand profile, verified 2026-09-29 (not a product link, checkout or Affiliate link). The Affiliate URL stays null. The dated poster offer is kept in data but off the page (`set.show_offer: false`); its code path and date rules stay tested.

Direction and evidence rules: [STORYBOARD.md](STORYBOARD.md). Current mousse media limitation: [MEDIA_REQUEST_01_MOUSSE.md](MEDIA_REQUEST_01_MOUSSE.md).

## Run and check

From the repository root:

```sh
python3 -m http.server 9461 --bind 127.0.0.1
node --test tests/mediral/*.test.mjs
node shelf/validate.mjs
```

Open `http://127.0.0.1:9461/mediral/`. A static server does not reproduce Vercel headers or guarantee HTTP Range support for video. The localhost-only `?today=YYYY-MM-DD` override exercises poster-offer boundaries; public URLs must ignore it. Check actual production identity, headers, assets and media after publishing.

## Files and contracts

| File | Responsibility |
|---|---|
| `mediral/data/routine.json` | Product roles, `when`/`how`, image bounds, per-chapter `scene` (problem, headline, support, waves), attributed `selling.beats`, the ingredient catalogue and groups, the exchange, provenance, the gated offer and purchase/profile state. |
| `mediral/js/cinema.js` | The engine: one clock T from the story track, keyframes resolved around each layer's CSS home (offsets, hand-off `match`, camera `focus`, custom properties held across the track), liveness through parent layers, two-sided load windows, flow mode. No timers or animation loop of its own. |
| `mediral/js/score.js` | The score: chapter markup from data and every layer's timing. Chapter `from` values are each chapter's first composed hold. |
| `mediral/js/main.js` | Mounts the chapters and markers, schedules one update per scroll frame, maps markers to rail/`data-step`/header chapter, keeps the story moment across real viewport changes, owns the saved list, profile link, gated offer, clipboard/card actions, anchors, atlases and fallbacks. |
| `mediral/js/lab-film.js` | Decorative, muted media inside AC with motion/data preference guards and a poster fallback. No customer-facing player controls or duration/status UI. |
| `mediral/js/card.js` | A PNG of the saved list without a price, with the provenance line and neutral pre-purchase checks. |
| `mediral/assets/` | AI draft packs, ingredient illustrations, the concept film, stage/drop/foam plates and the five Motion v2 material layers (only consumed final WebPs). Private preparation manifests, prompts and originals stay out. |

### Cinema structure

- `#story.mr-cinema` is a track `(END + 1)` screens tall with one sticky `100svh` viewport. T = −(track top) ÷ viewport height, clamped to `[0, END]`; the same T always gives the same frame, forwards or backwards, slow or fast.
- Invisible `.mr-mark` spans (`#routine`, `#step-CL` … `#step-PO`) cover each chapter's stretch, so anchors, the rail and deep links land on a composed hold. `sections()` = markers + `#set`.
- Layers rest at CSS homes (separate tall/wide compositions, `(max-aspect-ratio: 1/1)`); CSS positions never use transform. Invisible `.mr-slot` boxes mark hand-off poses. A running cinema lets only visible layers take pointer events.
- Every Thai phrase is whole during its hold; objects cross words only in motion. The AC balance phrase is split at its real word boundary around the glass stem.
- Reduced motion or a screen under 520 px tall reads the same chapters in normal flow (set before first paint by one inline line and kept by the controller), with every word visible and decorative art left out.
- Packs are native DOM images moved by transform only. The camera never magnifies a drawn label: the AC bottle leaves frame before the flight into the drop.

### Ambient film

The existing `assets/motion/lab-film-10s.mp4` is a silent 10.00-second H.264 faststart clip, 1276×720, about 1.15 MB. Its matching poster is `lab-film-poster.webp`. The three concept stills remain available; this revision does not require new generation.

The clip is illustrative botanical/pipette footage. It is not Mediral's factory, research, extraction method, tested absorption or real product texture. Provenance stays accessible in source details/footer, without turning the buying path into a video lesson.

Decorative mode must work without a toggle button. The source remains deferred, playback is muted and inline, and autoplay requires sufficient visibility, an active tab, no reduced-motion preference and no data-saving preference. Leaving the viewport or hiding the tab pauses it. A denied autoplay or media error leaves the poster visible without an error/control panel. Because the shot is not a seamless loop, it plays through and settles quietly; it must not restart on re-entry. Reduced-motion/data-saving visitors receive a poster without a manual playback prompt. Native controls, custom play/pause/replay, timestamps and duration badges are absent.

## Content boundaries

- **Mousse:** the current clover-reference pack is an AI draft. Its size and ingredients are unconfirmed, so the page omits them (no waves, no library entry) instead of borrowing the old gold-rose list, size, method, SLS or hydration claims. Its role is cleansing face and makeup.
- **AC:** soothing botanical pair, oil-balance family, then moisture family. Group attribution stays group attribution; no acne cure, germ killing, deadline or universal sensitive-skin claim.
- **BR:** bearberry/licorice/vitamin C roles, then distinct probiotics/bakuchiol roles, then the fuller source list and light-texture story. No melasma treatment, DNA mechanism, permanent whitening or combined-serum efficacy.
- **SU:** mineral UV-filter names are distinct from hydration and the seven-plant Giga White group. Generic seaweed imagery does not establish HydroAlgae identity or blue-light performance. The tube is shown at normal size; its lettering is never zoomed as proof, and the story copy states no SPF/PA value (the details point to the tube label).
- **PO:** product-level coverage and fine/light/easy-spreading texture, powder/oil group and hydration/soothing group. Group names do not establish an individual ingredient's effect. No live-cell regeneration, universal shade, timed guarantee or sunscreen replacement.
- AC/BR sensory language and powder texture are attributed brand descriptions, not a fabricated personal review. One truthful section-level attribution can cover the short selling story; detailed sources and limits remain accessible.
- Every pack is an AI draft, not an authenticated packshot. Ingredient/lab illustrations establish neither concentration, origin, certification nor a manufacturing recipe.

The optional library after the offer retains **AC 24, BR 18, SU 14 and PO 18** named display entries. These 74 entries are neither distinct actives across the range nor a verified full INCI list. Ingredient `benefit_status` remains `brand-claim` or `identity-only`; `ingredient_groups` preserve attribution and complete membership. A missing illustration does not remove the name. The current mousse has no fabricated atlas. Closed atlas disclosures open from product links and fresh hashes, below the fixed header; ingredient exploration never changes the saved purchase list.

## Offer, actions and privacy

- The poster's fixed five-piece offer is 1,899 THB for 21–30 September 2026, qualified as unverified in the current cart/channel/coupons. Both hero and set retire it outside the dates and refresh at Bangkok midnight/tab return. The hero describes the fixed set independently; the saved-list card requires all five pieces. Partial/empty lists never inherit the bundle price or checkout.
- `buy.affiliate_url` is null and `buy.status` is pending. The purchase control has no destination. A future checkout requires verified status, an HTTPS Affiliate URL and the complete set. No price advantage, individual-product price or coupon is invented.
- Copy/PNG actions reflect the saved list. A failed clipboard operation offers selected, read-only text for manual copying. The page takes no payment.
- `vercel.json` keeps the slash redirect and noindex header/meta. `.vercelignore` excludes docs, tests, source screenshots, asset manifests/briefs, the held old mousse draft and the unsoftened sunscreen draft. Internal sources and costs stay outside public runtime. Noindex is not access control.

## Verification — product selling revision, 28 September 2026

- The complete Mediral suite passes **91/91** after integration; shelf validation passes for 14 sources, and the diff has no whitespace errors.
- Browser checks at 1280×800, 820×1180, 390×844 and 360×640 cover the opening, native product packs, ingredient compositions and readable benefit text. No horizontal overflow was observed. The mousse pack is visible; the sunscreen's seven named plant roles are readable on a short phone and tablet.
- Scroll changes the AC botanical/oil-balance family alongside its explanation. Extracts occupy positions beside the pack rather than behind its label. Tablet and mobile reading lines use their actual two-column/stacked layouts; chapter links account for fixed-header clearance.
- The quiet film plays without controls, stays behind the sharp product image, and has no separate lesson or duration badge. Lifecycle, visibility, end-of-film, denied playback and data-saving cases have focused automated coverage.
- Removing the powder removes the fixed-set offer. Four-piece selection survives chapter navigation and desktop/mobile resize. Copy succeeds, and the four-piece PNG was downloaded and opened to verify its actual content.
- Reduced-motion browser checks show five loaded pack images with the video source unattached. Blocking the 3D dependency keeps all five packs and fifteen semantic beats. Blocking product data preserves the static set, a useful failure/retry message and an inert purchase control. All temporary browser overrides were removed afterward.
- Ingredient and claim audit retains AC 24 / BR 18 / SU 14 / PO 18 named entries. These are source-listed names, not a full INCI or a total of distinct actives. Current mousse formulation remains unconfirmed. Full/partial/empty lists, offer date boundaries, verified-link gating and clipboard denial have automated regression coverage.
- Real GPU loss was not forced. Real-device performance and assistive-technology testing are not represented by these browser emulation checks. Actual production bytes and deployment identity are checked after pushing; do not infer publication from local tests.

## Historical verification records

The records below describe earlier implementations, including retired scene and player behavior. They are retained as history, not acceptance results for the product-selling revision above.

## Verification record — 29 Sep 2026 Motion v2 cinema

- Built from production `86914686` after the owner's review. Claude wrote the engine, score, page, data, tests and docs. GPT supplied five material layers (native size, not upscaled), directed the slice, and ran browser QA and the source/copy reviews. A three-lens read-only review (engine, accessibility/flow, copy) found click-blocking by faded shots, toolbar-resize snap-back, excess compositing and residual audit-voice strings. All were fixed before release.
- Headless Chrome captures at 390×844 and 1265×720/1440×900 covered 0/25/50/75/100% of every transition, plus reduced-motion flow at 390×844: hero → row → foam wipe/hand-off, word sweep, ring portal (feathered to the ring's measured inner edge), AC's three holds, the flight into the drop, BR's focus planes, the SU streak and ribbon, the powder veil, PO outline-to-solid, and the regroup. No console errors or horizontal overflow. Real hit-testing: the hero CTAs at T 0 and the closing link at T END receive the click.
- Root browser QA passed the hero, portal, AC, BR, SU, PO and regroup holds on phone and desktop. It also covered the rail numerals on dark chapters, the PO footer clear of the rail, partial selection/copy/profile, and an opened saved PNG with no draft or pending copy.
- The retired WebGL layer (`story.js`, `vendor/three`) is removed: the opaque viewport would have hidden it while it still used the GPU.
- Automated: `node --test tests/mediral/*.test.mjs` passes 90/90 (content contracts, controller, the cinema engine and the film), and `node shelf/validate.mjs` passes. Production was checked after the push.

## Verification record — 28 Sep 2026 polish

- `node --test tests/mediral/*.test.mjs`: 31 passed, including offer boundaries, invalid/public date overrides, midnight/visibility refresh, partial/empty/full lists, verified-link gating, denied clipboard, chapter progress, single animation loop, context/motion recovery and PMREM lifecycle.
- Browser checks at 1440×900, 1280×720, 1024×768, 390×844 and 360×640: scene arrival, gathering, mobile product details and the full-set section; no horizontal overflow. The summary uses normal document scrolling. The sunscreen caveat and details control remain visible on the short phone viewport.
- Browser interaction: remove one piece → price disappears; remove all → copy/download disabled; restore all → full list and dated offer return. Clipboard copy succeeded. The downloaded five-piece PNG was opened and visually checked.
- Dynamic reduced-motion preference activated the composed scene and stills. Blocking `story.js` yielded readable static sections; blocking `routine.json` yielded the error message and retry control, and retry after unblocking recovered the page.
- Context-loss/restore logic and PMREM success/failure/disposal were exercised in focused controller/lifecycle harnesses; a real GPU reset was not forced in the browser.
- `node shelf/validate.mjs` passed. The existing access-cache routing suite could not start because local dependency `@vercel/functions` is absent (the same environment limitation reported before this polish); no routing or dependency files changed in this pass.
- Production before this polish was verified at commit `d603d810027a688387242764df3291056c313034`: Vercel READY and 38 runtime assets matched Git. The new deployment must be verified against the new commit after pushing.
- The polish deployment `3d3bb3ac` was READY and all 38 runtime files matched Git. Production showed the directory URL lacked the wildcard's robots header (the HTML robots meta was present); an explicit `/mediral/` header rule was added in the follow-up fix.

## Verification record — 28 Sep 2026 botanical visual upgrade

- The current clover-reference mousse draft appears at entry, in the animated scene, the full set, static fallback and downloaded PNG. The first-paint poster hides when the reader leaves the mousse chapter, including while the scene is still loading.
- Browser visual checks at 1280×720, 1024×768, 390×844 and 360×640: large botanical compositions, glass gathering, product reveal, mousse first frame and the full set. The short phone view keeps the sunscreen lettering caveat and product-details control visible; there is no horizontal overflow.
- The mobile hero identifies myClover as independent of the brand. Product facts and AI provenance remain available in each step's expandable details.
- Reduced-motion mode and blocked scene-module fallback both retain the mousse image. The five-piece PNG was downloaded and opened to verify the new bottle.
- All 31 Mediral contract, controller and scene-lifecycle tests passed after the visual changes. A separate review caught the loading-poster chapter leak, which was fixed before publication.
- The upgrade adds one 56 KB WebP. No new video service or third-party runtime is used. The Affiliate link and mousse ingredient/size verification remain pending.

## Verification record — 28 Sep 2026 routine-first lab

- The opening presents all five pieces and the reason for each step before individual products. Its composition remains complete when a reader removes a piece from the optional saved list.
- Featured ingredient buttons reveal an attributed role and focus the matching illustration. Scrolling resumes the ingredient sequence; returning from the product reveal to a selected ingredient leaves the saved list unchanged. Other source-listed ingredients have explanations inside product details; these entries are not a claim about the number of distinct actives in a formula.
- Browser checks at 1280×720, 1024×768, 390×844 and 360×640 covered the overview, ingredient controls and the glass gathering scene. The tablet overview includes its independent-site notice; short phone chapters use normal document flow so details are not trapped in a nested panel.
- Reduced motion retains a single five-piece composition. Blocking the scene module renders five loaded static packs and working ingredient explanations. Removing the powder hides the fixed bundle price while the opening retains all five products.
- Reloading a dynamic chapter link lands in the correct chapter. Initial anchor alignment handles late document/font layout and cancels when the reader interacts or changes the hash. Controller tests cover these races and cleanup.
- All 39 Mediral contract, controller and scene-lifecycle tests passed. The lab is explicitly illustrative; it does not depict verified manufacturing or test results. No additional media or third-party runtime was introduced.
- Production verification is performed after pushing this revision; the Affiliate link, verified packshots and current mousse formula remain pending.

## Verification record — 28 Sep 2026 ingredient atlas and concept lab

- Four natural-flow atlases expose every grouped source-list entry; the mousse stays unpopulated. Product indices and the saved shopping list remain separate from ingredient exploration.
- Three concept WebPs and a reused poster are present. The requested film remains pending; the readiness gate is false. This is not a completed video delivery.
- The dedicated film behavior suite passes 13 tests: gate/no-source behavior, later activation, DOM safety, viewport/tab visibility, manual pause, reduced motion, data saving, preference changes, blocked playback, media fallback/retry, late promise resolution, ownership across dispose/re-init and the no-IntersectionObserver fallback.
- The final combined Mediral suite passes 59/59 and the shelf validator passes. Browser QA covered desktop/mobile atlases, all-name visibility, non-featured ingredient selection changing detail/source without changing products, four loaded lab images with no video source, reduced-motion sunscreen reading without overflow, and the mobile extraction/beaker scene. The renderer pauses behind reading chapters; regression checks cover that behavior.

## Verification record — 28 Sep 2026 sales upgrade

- Starting point: production `f2c186d2`. Owner direction relayed by GPT: WHY first, benefit before depth, optional deep ingredient reading, faster offer. Claude changed HTML/CSS/JS/data/docs/tests; GPT supplied and checked the film and poster (Higgsfield Kling 3.0 Turbo, one job, no additional generation) and reviews QA.
- Scroll to the offer on a 390×844 phone: `#set` begins at about 14.0 screen heights (previously 26.4). At 360×640 it is 11.3; at 1440×900 it is 16.8. The difference comes from moving the full atlases after the offer, shorter product chapters (230 vh desktop / 200 vh stacked) and a flowing phone opening.
- Browser checks at 390×844, 360×640 and 1440×900: opening, serum comparison, use-time table, header shortcut to the purchase card (390×844: price at y≈254, buy button at y≈438; scene paused behind it), fresh `#formula-SU` (summary below the 60 px header), fresh `#serums`, no horizontal overflow. The film played once to 10.00 s, showed "เล่นอีกครั้ง", did not restart on re-entry and replayed from the start. The local static server lacks HTTP Range, so seeking was checked only on production.
- Automated: every Mediral contract, controller, lab-film and scene-lifecycle test passes, together with the shelf validator (see the commit for counts).
