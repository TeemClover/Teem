# Mediral five-piece set — `/mediral/`

The page presents the five-piece set, then gives each piece a reason to belong: cleanse → white serum → yellow-green serum → sunscreen → optional powder. This is the story order, not a verified instruction to layer the products or a claim that every person needs all five.

The current revision makes one continuous path: **WHY and the five pieces → five product stories → set offer → optional comparison and complete ingredient library**. Each product keeps a crisp native DOM pack image beside a few readable benefit/ingredient beats. Scroll changes the highlighted family; buyers do not need to tap every ingredient to understand the story. A quiet botanical film sits within a relevant ingredient composition. There is no separate comparison lesson or video chapter before the first product.

Local integration checks pass for this revision. Production identity is checked after publishing; historical records below describe older versions. The Affiliate URL remains pending.

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
| `mediral/data/routine.json` | Product roles, `when`/`how`, image bounds, attributed `selling.beats`, sensory copy, the complete ingredient catalogue and groups, dated offer and purchase state. |
| `mediral/js/main.js` | Renders semantic product stories and optional ingredient atlases, synchronizes the visible beat with scroll, keeps shopping selection separate, and owns offer dates, clipboard/card actions, anchors and fallback handling. |
| `mediral/js/story.js` | Optional atmosphere and light effects. It does not render, relight or reconstruct product labels. Its lifecycle must pause when hidden and release resources on disposal. |
| `mediral/js/lab-film.js` | Decorative, muted in-view media with motion/data preference guards and a poster fallback. No customer-facing player controls or duration/status UI. |
| `mediral/js/card.js` | Generates a PNG of the saved list without a price, retaining package provenance and pre-payment checks. |
| `mediral/assets/` | Existing AI draft packs and ingredient illustrations, plus the existing concept film and stills. Private preparation manifests remain excluded. |
| `mediral/vendor/` | Local three.js subset; no additional external runtime is needed. |

### Product and scroll structure

- Five `.mr-product#step-ID[data-step][data-index]` chapters contain semantic text. Each has a sticky `.mr-product__visual`, a `.mr-product__pack .mr-pack > img`, and `.mr-selling-beat` blocks with their title, explanation and ingredient names always in the DOM.
- `.mr-beat-art[data-beat-art][data-visual]` selects the current visual family without replacing the text or changing shopping selection. Images without a matching source identity are not substituted for unnamed plants or compounds.
- `.mr-product__finish` retains sensory copy, method/source details and a route onward. The meaning of AC versus BR belongs near the serums; usage information remains accessible without a separate mandatory chapter.
- The `#serums` disclosure follows the offer and is closed initially. Its optional role/time comparison does not interrupt the route to cleansing or prescribe serum layering.
- Native pack images remain readable before WebGL, without WebGL and with reduced motion. Use their visible bounds to choose scale; transparent canvas size is not product size. Do not project pack art onto bottle geometry, invent back labels or apply scene exposure/fog to labels.
- Forward/reverse scrolling, resizing, fast scrolling and fresh product/atlas links must retain useful reading positions. No nested scrolling trap or exact-coordinate flash is required to read a claim.

### Ambient film

The existing `assets/motion/lab-film-10s.mp4` is a silent 10.00-second H.264 faststart clip, 1276×720, about 1.15 MB. Its matching poster is `lab-film-poster.webp`. The three concept stills remain available; this revision does not require new generation.

The clip is illustrative botanical/pipette footage. It is not Mediral's factory, research, extraction method, tested absorption or real product texture. Provenance stays accessible in source details/footer, without turning the buying path into a video lesson.

Decorative mode must work without a toggle button. The source remains deferred, playback is muted and inline, and autoplay requires sufficient visibility, an active tab, no reduced-motion preference and no data-saving preference. Leaving the viewport or hiding the tab pauses it. A denied autoplay or media error leaves the poster visible without an error/control panel. Because the shot is not a seamless loop, it plays through and settles quietly; it must not restart on re-entry. Reduced-motion/data-saving visitors receive a poster without a manual playback prompt. Native controls, custom play/pause/replay, timestamps and duration badges are absent.

## Content boundaries

- **Mousse:** the current clover-reference pack is an AI draft and visible in the set and its product chapter. Its size and ingredients remain unconfirmed. The old gold-rose list, size, mask method, SLS and hydration claims are not inherited. Category-level cleansing is sufficient; no empty ingredient carousel.
- **AC:** soothing botanical pair, oil-balance family, then moisture family. Group attribution stays group attribution; no acne cure, germ killing, deadline or universal sensitive-skin claim.
- **BR:** bearberry/licorice/vitamin C roles, then distinct probiotics/bakuchiol roles, then the fuller source list and light-texture story. No melasma treatment, DNA mechanism, permanent whitening or combined-serum efficacy.
- **SU:** mineral UV-filter names are distinct from hydration and the seven-plant Giga White group. Generic seaweed imagery does not establish HydroAlgae identity or blue-light performance. Illustrated lettering is not current SPF/PA evidence.
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
