# Mediral five-piece set — `/mediral/`

**Colour route (2026-09-29, on `11453867`).** The owner's memory aid, "เริ่มจากขาว ค่อยไปเขียว", is taught through the five real packs in order:

| # | Colour | Pack | Role |
|---|---|---|---|
| 01 | ขาว | มูสโฟมล้างหน้า | ล้าง |
| 02 | ขาว | เซรั่มผิวเป็นสิวง่าย | เลือกบำรุง |
| 03 | เขียวอ่อน | เซรั่มผิวดูหมอง | เลือกบำรุง |
| 04 | เขียวเข้ม | เซรั่มกันแดด | กันแดด |
| 05 | ตลับเขียว | แป้งพัฟ | แต่งผิวเมื่ออยากแต่ง |

- **Always tied:** colour is always shown with the number, pack name and role, because CL and AC are both white and PO is not the darkest.
- **Where it appears:**
  - the routine hold: the daily context "เจอแดด เจอฝุ่นทุกวัน", a drawn colour stripe, number and colour marks under the packs (number and dot only on phones), and one whole line per piece;
  - the chapter foot tags and the rail's colour rings;
  - the closing regroup, where the rail clears so the five stand free;
  - one short line at the LINE close, with marks on the pieces;
  - a route strip on every product page, with the current piece marked and each link named by number, colour and piece.
- **In flow**, the route sits on an ivory ledge.
- **Scope:** it is a memory aid for this set. It is not a strength scale, a proven two-serum layering order or a dust/pollution barrier. The serums are chosen by concern, PO stays optional, and label guidance stays.

**Crown increment (2026-09-29).** The page runs **WHY → the five motion chapters (each with an exit to its own page) → a real exchange → one LINE close.**
- **WHY:** the opening sells an at-home set with practical roles, "ครบทุกขั้นในชุดเดียว · ใช้เฉพาะชิ้นที่ผิวต้องการ". The two serums are told apart by what they are for, and the colour route (above) carries each piece's number, name and role.
- **The cinema:** one scroll clock, material transitions, holds and every accessibility/runtime fix, all as released in Motion v2.
- **AC's film:** AC's material is now a silent concept film (botanicals, then a glass funnel with a fine stream). It plays from its body cut, which ends before the film's lens, so it can rest under the words. The film's own last frame is a still that the camera enters on the way to BR.
- **SU:** its sideways waves hold longer, and each phrase stays on one line.

**Ordering** is a conversation with myClover on LINE (`https://lin.ee/rlSlhzT`, the myClover house account). Every order action on the page and the five product pages reads one config, `routine.json → order`. Opening LINE is not an order: myClover gives price, shipping and payment in the chat before anything is confirmed. The pieces chooser only shapes an optional message to paste. The saved-list picture is gone. The Affiliate URL stays null, and the dated poster offer stays in data only.

**Trust:** the authorized chat screenshot is shipped unchanged (SHA-256 pinned in tests). Teem's own experience ("หลังได้ลองใช้ ผมรู้สึกว่าสิวดีขึ้น") is a separate personal account with individual-result context, tied to no product.

**Product pages:** `/mediral/cl/`, `/ac/`, `/br/`, `/su/`, `/po/` share one template:
- problem → promise → what it looks after → how and when;
- every source-listed name, grouped (AC 24 / BR 18 / SU 14 / PO 18 names in brand material, not full label lists);
- FAQ → LINE → back to the exact chapter.

The mousse page gives its known role only. `data/details.json` holds only the public product fields.

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
| `mediral/data/routine.json` | Product roles, each piece's colour (`tone`) and route line (`route`), the colour route copy (`route`), `when`/`how`, image bounds, per-chapter `scene`, attributed `selling.beats`, the ingredient catalogue, the exchange (exact texts, screenshot, personal experience), provenance, the order channel (`order`), the gated offer and the profile link. |
| `mediral/data/details.json` | Public copy for the five product pages: role, problem, benefits, texture, fit, how, FAQ and every source-listed name with its sourced role (or none). Only public fields. |
| `mediral/js/cinema.js` | The engine: one clock T from the story track, keyframes around each layer's CSS home (offsets, hand-off `match`, camera `focus`, custom properties held across the track), liveness through parent layers, two-sided load windows, flow mode. |
| `mediral/js/score.js` | The score: chapter markup from data, the colour mark (`toneMark`), the AC film (`FILM`), each chapter's exit to its page, the closing regroup in route order, and every layer's timing. |
| `mediral/js/main.js` | Mounts the story and markers, one update per scroll frame, rail/`data-step`/header chapter, keeps the story moment across real viewport changes, the trust block, the LINE close and message, legacy links, the AC film's window and one rewind per genuine revisit. |
| `mediral/js/lab-film.js` | Decorative, muted, inline media with a poster fallback; picks the smaller file on narrow screens; `rewind()` for the owning scene. |
| `mediral/js/detail-view.js`, `mediral/js/detail.js` | The product-page template (pure, with the route strip) and its boot. |
| `mediral/{cl,ac,br,su,po}/index.html` | Static product-page shells: noindex, name, role, way back, LINE link. |
| `mediral/assets/` | AI draft packs, ingredient illustrations, stage/drop/foam and Motion v2 layers, AC's film (two sizes, poster, final lens) and the unchanged chat screenshot. |

### Cinema structure

- `#story.mr-cinema` is a track `(END + 1)` screens tall with one sticky `100svh` viewport. T = −(track top) ÷ viewport height, clamped to `[0, END]`; the same T always gives the same frame, forwards or backwards, slow or fast.
- Invisible `.mr-mark` spans (`#routine`, `#step-CL` … `#step-PO`) cover each chapter's stretch, so anchors, the rail and deep links land on a composed hold. `sections()` = markers + `#set`.
- Layers rest at CSS homes (separate tall/wide compositions, `(max-aspect-ratio: 1/1)`); CSS positions never use transform. Invisible `.mr-slot` boxes mark hand-off poses. A running cinema lets only visible layers take pointer events.
- Every Thai phrase is whole during its hold; objects cross words only in motion. The AC balance phrase is split at its real word boundary around the glass stem.
- Reduced motion or a screen under 520 px tall reads the same chapters in normal flow (set before first paint by one inline line and kept by the controller), with every word visible and decorative art left out.
- Packs are native DOM images moved by transform only. The camera never magnifies a drawn label: the AC bottle leaves frame before the flight into the drop.

### AC's film

- **Files:** `assets/motion/crown-body-1080.mp4` (1920×1080) and `crown-body-720.mp4` (1280×720, for screens up to 900 px wide). Both are silent 24 fps H.264 faststart files, 6.25 seconds long.
- **What they are:** the body of one concept film (botanicals, then a clear glass funnel with a fine stream), cut before the film's lens so it can rest under AC's words however long a reader stays.
- **Stills:** `crown-poster.webp` is the still for reduced motion, data saving and playback failure. `crown-end.webp`, the film's own last frame, is the lens the camera enters between AC and BR.
- **Not evidence:** the footage is concept imagery, not Mediral's factory, research, extraction method, formula, tested results or real product texture. Provenance stays in the footer.
- **Material, not a player:** it is a full-bleed feathered layer, with no frame, controls, timestamps, duration badge or labels.
- **Loading and playback:** nothing is requested at the opening. The source is attached on the first permitted pass. It plays muted and inline from the portal to the lens, and pauses in a hidden tab or outside that window.
- **Revisits:** leaving AC deactivates it first. A genuine return, after truly leaving AC, rewinds it once before it may play again. Scroll frames elsewhere and tab visibility never seek it.

## Content boundaries

- **Colour route:** "เจอแดด เจอฝุ่นทุกวัน" is daily context only. No product claims a dust, PM2.5 or pollution barrier. CL's "Detoxing Pollution & Dirt Cleansing" establishes its name and its cleansing role, and nothing from the legacy rose mousse is transplanted. Colour is not strength or concentration.
- **Mousse:** the current clover-reference pack is an AI draft. Its size and ingredients are unconfirmed, so the pages omit them (no waves, no ingredient block on its product page) instead of borrowing the old gold-rose list, size, method, SLS or hydration claims. Its role is cleansing face and makeup.
- **AC:** soothing botanical pair, oil-balance family, then moisture family. Group attribution stays group attribution; no acne cure, germ killing, deadline or universal sensitive-skin claim.
- **BR:** bearberry/licorice/vitamin C roles, then distinct probiotics/bakuchiol roles, then the fuller source list and light-texture story. No melasma treatment, DNA mechanism, permanent whitening or combined-serum efficacy.
- **SU:** mineral UV-filter names are distinct from hydration and the seven-plant Giga White group. Generic seaweed imagery does not establish HydroAlgae identity or blue-light performance. The tube is shown at normal size and its lettering is never zoomed as proof. The story copy states no SPF/PA value; the sunscreen's own page answers the question with the brand-attributed “สื่อ Mediral ระบุ SPF 50 PA+++” (brand source, checked) and points to the label for use.
- **PO:** product-level coverage and fine/light/easy-spreading texture, powder/oil group and hydration/soothing group. Group names do not establish an individual ingredient's effect. No live-cell regeneration, universal shade, timed guarantee or sunscreen replacement.
- AC/BR sensory language and powder texture are attributed brand descriptions, not a fabricated personal review. One truthful section-level attribution can cover the short selling story; detailed sources and limits remain accessible.
- Every pack is an AI draft, not an authenticated packshot. Ingredient/lab illustrations establish neither concentration, origin, certification nor a manufacturing recipe.

The five product pages (`/mediral/cl/`, `/ac/`, `/br/`, `/su/`, `/po/`) list **AC 24, BR 18, SU 14 and PO 18** names from brand material. These 74 names are neither distinct actives across the range nor a verified full INCI list, and each page says so. Names are grouped as the brand groups them. A name the source lists without a role is shown as a name only, and a missing illustration does not remove it. The sunscreen page notes the trade name HydroAlgae™ without counting it. The mousse page has no ingredient block. Old `#formula-*` links open the matching product page; old `#serums` and `#ingredients` links land on the set.

## Ordering, actions and privacy

- **One way to order: a conversation with myClover on LINE.**
  - The destination is `https://lin.ee/rlSlhzT`, the myClover house account (not the brand's LINE).
  - Every order action on the main page and the product pages reads `routine.json → order`, so the channel changes in one place.
  - Opening LINE is not an order: myClover gives price, shipping and payment in the chat before anything is confirmed. There is no prefilled-message endpoint.
- **Pieces chooser:** it only shapes an optional message to paste in LINE. With none chosen, copy is disabled and LINE stays available. A failed clipboard operation offers selected, read-only text. The saved-list picture is gone.
- **Poster offer:** the fixed five-piece poster offer (1,899 THB, 21–30 September 2026) stays in data with `set.show_offer: false`. Its date rules stay tested for a verified future channel, and it is never shown as a current price.
- **Affiliate:** `buy.affiliate_url` is null. A future commission link needs verified status, an HTTPS URL and the complete set, and is disclosed beside it. The page takes no payment.
- **Brand profile:** a quiet footer link to the brand's verified TikTok profile. It is not a product link, a checkout or a commission link.
- **Real exchange:** the authorized chat screenshot is shipped unchanged (SHA-256 pinned in tests). Teem's own experience is a separate personal account with individual-result context, tied to no product.
- **Deployment:**
  - `vercel.json` keeps the slash redirect and the noindex header, with explicit rules for `/mediral/` and for `/mediral/:page(cl|ac|br|su|po)/` (the wildcard does not reach directory indexes), and noindex meta on every page.
  - `.vercelignore` excludes docs, tests, source screenshots, asset manifests/briefs and held drafts.
  - Internal sources and costs stay outside the public runtime. Noindex is not access control.

## Current verification — 29 Sep 2026 colour route

- **Roles:** built on production `11453867`. Root supplied the source check and the browser QA; Claude wrote the code, tests and docs.
- **Tests:** `node --test tests/mediral/*.test.mjs` passes 106/106, and `node shelf/validate.mjs` passes.
- **Headless Chrome (Claude) and root's browser:**
  - at 390×844 and 360×640, all five route lines are whole at 13 px or more, the marks do not overlap and nothing overflows;
  - at 1280×800 and 1440×900, each column stays inside its own product (11vw columns on 12vw spacing);
  - the rail shows through PO and clears in the regroup;
  - in reduced-motion flow, the route is readable on its ivory ledge and no film source is requested;
  - the product pages' AC → BR link and current mark, and the LINE close, work.
- **Production:** verified against the release commit after pushing (not recorded here before that).

## Historical verification records

The records below describe earlier implementations, including retired scene and player behavior. They are retained as history, not acceptance results for the current page described above.

## Verification record — 29 Sep 2026 crown increment

- **Roles:** built on production `b260673c`. GPT/root supplied one Seedance film (plus the body cut), the public product content, the verified LINE destination and QA. Claude wrote the code, tests and docs.
- **Tests:** `node --test tests/mediral/*.test.mjs` passes 105/105 (content contracts, controller, engine, film, product pages), and `node shelf/validate.mjs` passes.
- **Headless Chrome:**
  - no film is requested at the opening;
  - the phone plays `crown-body-720.mp4` and desktop `crown-body-1080.mp4`, with no controls;
  - the lens bridge reads as a circle on both sizes;
  - SU phrases stay whole;
  - `#order` lands below the header, both fresh and in-page;
  - the reduced-motion flow reads every chapter and the close;
  - the product pages render with no overflow;
  - no console errors.
- **Production:**
  - `563451ca` served all 60 deployable files byte for byte.
  - It sent product routes without the noindex header, so `0d117321` added the explicit directory rule. After that, `/mediral/` and all five product routes send `X-Robots-Tag: noindex, nofollow, noarchive`, and 60/60 files still match.
  - The film body answers Range with 206. The screenshot hash matches in production. Retired `card.js` and the old clip return 404.
  - Live headless Chrome: the phone plays the 720 body and desktop the 1080; `#order` lands below the header; the closing link lands on the set.
  - Root confirmed `563451ca` READY independently.

## Verification record — 28 Sep 2026 product selling revision

- The complete Mediral suite passes **91/91** after integration; shelf validation passes for 14 sources, and the diff has no whitespace errors.
- Browser checks at 1280×800, 820×1180, 390×844 and 360×640 cover the opening, native product packs, ingredient compositions and readable benefit text. No horizontal overflow was observed. The mousse pack is visible; the sunscreen's seven named plant roles are readable on a short phone and tablet.
- Scroll changes the AC botanical/oil-balance family alongside its explanation. Extracts occupy positions beside the pack rather than behind its label. Tablet and mobile reading lines use their actual two-column/stacked layouts; chapter links account for fixed-header clearance.
- The quiet film plays without controls, stays behind the sharp product image, and has no separate lesson or duration badge. Lifecycle, visibility, end-of-film, denied playback and data-saving cases have focused automated coverage.
- Removing the powder removes the fixed-set offer. Four-piece selection survives chapter navigation and desktop/mobile resize. Copy succeeds, and the four-piece PNG was downloaded and opened to verify its actual content.
- Reduced-motion browser checks show five loaded pack images with the video source unattached. Blocking the 3D dependency keeps all five packs and fifteen semantic beats. Blocking product data preserves the static set, a useful failure/retry message and an inert purchase control. All temporary browser overrides were removed afterward.
- Ingredient and claim audit retains AC 24 / BR 18 / SU 14 / PO 18 named entries. These are source-listed names, not a full INCI or a total of distinct actives. Current mousse formulation remains unconfirmed. Full/partial/empty lists, offer date boundaries, verified-link gating and clipboard denial have automated regression coverage.
- Real GPU loss was not forced. Real-device performance and assistive-technology testing are not represented by these browser emulation checks. Actual production bytes and deployment identity are checked after pushing; do not infer publication from local tests.

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
