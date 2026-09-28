# Mediral five-piece set — `/mediral/`

The Mediral page on myClover sells the fixed five-piece set: mousse → white serum → yellow-green serum → sunscreen → powder puff. The page order shows each piece's role; it is not a verified application order.

The sales path is: customer problem → role → relevant ingredient families → product → offer. The opening answers the buyer who owns several products but does not know what each one does: all five pieces, a role map with brand-stated times, the dated poster offer and a direct route to it. A short chapter compares the two serums side by side with a use-time table. A ten-second illustrated film introduces plants and extracts. The five product chapters keep the extraction/beaker scene and name each product's ingredient families. The purchase card follows; the complete ingredient library comes after the offer as optional deep reading.

**Current implementation — 2026-09-28 sales upgrade:** the lab film is enabled with GPT's approved clip (10.00 s, 1276×720, silent H.264, faststart, 1.15 MB; poster taken from the clip). It is not a seamless loop, so it plays once per visit and offers an explicit replay. The Affiliate link is still pending.

Direction and evidence rules are in [STORYBOARD.md](STORYBOARD.md). The first media request is [MEDIA_REQUEST_01_MOUSSE.md](MEDIA_REQUEST_01_MOUSSE.md).

## Run and check

From the repository root:

```sh
python3 -m http.server 9461 --bind 127.0.0.1
```

Then open `http://127.0.0.1:9461/mediral/`. The static server does not apply Vercel headers.

Test query parameters (QA only):

| Parameter | What it does |
|---|---|
| `?u=-1..6` | Pins the scene at a story position. `-1–0` is the routine overview, `0–1` is the mousse, `1–5` are the next four steps, `5–6` is the set. |
| `?today=YYYY-MM-DD` | Localhost only: previews both boundaries of the poster offer. Public URLs ignore this override. |

Contract and controller behavior checks:

```sh
node --test tests/mediral/*.test.mjs
```

## Files and contracts

| File | Role |
|---|---|
| `mediral/data/routine.json` | Product roles, instructions, featured and other ingredient entries, `ingredient_groups`, source attribution, notes, the poster offer and purchase state. A name can have no image and remain fully readable. |
| `mediral/js/main.js` | Renders the role map, opening offer, serum comparison, use-time table, product chapters and the closed ingredient library; maps the product chapters to `u`. Reading chapters (comparison, film, library, each atlas and — on stacked layouts — the purchase card) have their own visibility state, pause the scene and do not add routine steps. Direct, in-page and history links to `#formula-XX` open that atlas; a fresh link lands below the fixed header. Owns the saved list, copy, card download, dated offer, fallbacks and data-error retry. |
| `mediral/js/story.js` | See the `createStory` contract below. Exports `STACKED_QUERY`, the one media query that switches both CSS and scene to words-below-scene. |
| `mediral/js/lab-film.js` | Independent film controller. A false readiness gate returns an inert API. With the gate on, it supports one automatic in-view pass, manual play/pause, an explicit replay after the end, motion/data preferences, visibility pausing and a poster fallback. `loop` is never set. |
| `mediral/js/card.js` | See the `drawRoutineCard` contract below. |
| `mediral/assets/` | Pack AI drafts, botanical/material illustrations and the concept lab stills under `motion/`. Private preparation manifests are excluded from deployment. |
| `mediral/vendor/` | Local three.js subset, copied from Homechew. |

**`story.js` — `createStory({canvas, steps, asset, reduced, onContextChange})`** resolves to `{setProgress(u), setIngredient(indexOrNull), setSelection(ids), setBand({left, right}), setReducedMotion(bool), pause(), resume(), dispose(), state}`. `setBand` gives the landscape set view the free screen band (0..1) between the set card and the rail, measured by `main.js`. CSS and scene stack at widths up to 1100 px.
- The scene is determined by `u`, the focused ingredient and idle time. The overview is independent of the saved shopping list; selecting an ingredient does not alter purchase selection.
- It rejects if WebGL or the pack images fail; the page then shows static stills.
- `onContextChange('lost' | 'restored')` switches to stills and back while retaining the reading position. GPU environment lighting is rebuilt before restoring the scene. If rebuilding fails, stills remain visible.
- Reduced motion can change while the page is open. Visibility changes pause/resume the renderer; a single animation loop is retained.
- Ingredient names appear on entry and illustrations load independently. The extraction effect removes illustrated material in place; small abstract streams enter a receiving beaker before the concentrate, formulation and pack-reveal phases. Whole fruits are not dropped through a funnel. Mobile glassware uses a smaller composition clear of the top navigation.
- Pack art is front-only: bottles are lathes from their own silhouette with the art projected on, and flat packs are billboards. Yaw stays within ±12°.

**`card.js` — `drawRoutineCard({pieces, data, asset})`** resolves to an object URL of a 1080-wide PNG.
- It lists the ticked pieces in routine order with the three pre-payment checks. It shows no price.
- It rejects on failure, and the page then tells the buyer.

`vercel.json` adds the `/mediral` redirect and the `X-Robots-Tag: noindex` header. `.vercelignore` keeps `docs/mediral/` and `tests/mediral/` out of deployment. The internal reference files are both gitignored (local only) and excluded from deployment: the shop screenshots in `mediral/assets/evidence/`, the asset manifests/briefs (`mediral/assets/*.md`, `*.json`), the held old mousse draft, and the unsoftened sunscreen draft (`su-front.webp`; the page uses `su-front-web.webp`). Noindex is not access control.

## Content that must stay explicit

**Mousse**
- The bottle illustration is based on the clover-label pack in the supplied five-piece poster, generated with imagegen and labelled as an AI draft. It is visible in the opening set and mousse chapter, before and after WebGL loads, in the static fallback and the PNG.
- A verified original packshot is still requested. No formula or size is inferred from the illustration; both ingredient arrays are empty and size is null.
- The old gold-rose draft and its ingredient list are not used.

**Other packs**
- They are AI drafts and are labelled so on the stage, in the notes and on the card.
- Botanicals are AI illustrations of names in brand material, not proof of ingredients, origin, concentration or effect.

**Ingredient atlases and lab media**
- The four atlases expose AC 24, BR 18, SU 14 and PO 18 named display entries, grouped for reading. These 74 entries are not a count of distinct actives or a verified INCI list. Sunscreen aliases and group headings have been reconciled for display only.
- Each product chapter names its ingredient families and links to its atlas with the entry count. The atlases live in the library after the offer, one closed `<details>` per product ("รู้จักสูตรให้ลึกขึ้น · เลือกอ่านตามชิ้นที่สนใจ"). Opening one shows every family and name button; the selected name shows its existing benefit and source status; selecting it does not change the shopping list. Attributed group claims are not promoted into unverified individual claims.
- The current mousse has no ingredient atlas because its ingredient list remains unknown. It does not inherit the old pack's formula.
- Three AI concept stills show botanical, extract and research/texture settings. The poster reuses the research still. They are illustrations, not Mediral's factory, experiment, real product texture or manufacturing instructions.
- The film is GPT's Higgsfield Kling 3.0 Turbo clip of a botanical/pipette extraction illustration: clear liquid gradually turns amber while the camera moves. It is not Mediral's factory, experiment or product texture, and the caption says so. With the flag on, the source is attached only after the controller starts (`preload="none"`). Automatic playback requires sufficient viewport visibility, an active tab, no reduced-motion preference and no data-saving preference, and happens once; the final frame rests under a soft shade with "เล่นอีกครั้ง". Manual play remains available; failure leaves the poster and text readable. On phones the three beat stills are hidden while the film works.

**Copy**
- Headlines state the step's role.
- Brand statements are attributed ("สื่อแบรนด์เล่าว่า…").
- The serum order is story order: no wait times, drop counts or combined effects. Label instructions win. The serum comparison lists brand-told roles and times only; the use-time table shows when each piece is used, not a layering sequence.
- The opening leads with the buyer's problem (several products, unclear roles) and never says everyone needs all five or that combined use has a proven effect.

**Set offer**
- 1,899 THB comes from the brand poster, dated 21–30 Sep 2026. It is labelled as unverified in cart or coupons, and displayed only within those dates. The purchase card also requires all five pieces in the saved list; the opening describes the fixed set itself, so it follows only the dates. Both refresh at Bangkok midnight and when returning to the tab. There is one offer slot, one checkout control and one hint.
- The serum-pair price and coupons are not part of this page.

**Purchase**
- The Affiliate URL is `null`, so the button says the link is being checked and does not navigate. The page takes no payment.
- A future checkout needs `buy.status: "verified"`, an HTTPS Affiliate URL and the full five-piece selection. Partial or empty saved lists never receive the bundle's price or checkout link; a button restores all five pieces.
- Individual selection lives inside an optional disclosure. The summary card scrolls with the document, rather than trapping the buyer in a second scrolling card. Product instructions are expandable on mobile and desktop.
- If clipboard access fails, a focused, selected, read-only text field supports manual copying.

## Review checklist

- [ ] Desktop and mobile: words sit beside or below the scene, never covering it. No clipped text, missing media or horizontal overflow.
- [ ] 390×844 and 360×640 first screen: all five products, the WHY, the dated offer and "ดูข้อเสนอชุด 5 ชิ้น". The header shortcut lands on a purchase card whose price and buy/copy actions are in the first screen.
- [ ] Each step plays in order: materials → extraction/beaker → concentrate → formulation → drop → product → role → rail. On desktop the set shows all five beside the card.
- [ ] Each atlas opens from its summary, from a product link and from a fresh `#formula-XX` URL, below the header, with all grouped names and benefit/source text.
- [ ] The film plays once in view, stops on its last frame with replay, never restarts on re-entry, and waits for a tap with reduced motion or data saving.
- [ ] Ticking pieces updates the summary, copy text, card and the dimmed pieces in the scene. Scrolling never changes the ticks.
- [ ] No WebGL or save-data: static stills per step and in the set row, matching the ticks.
- [ ] Reduced motion: steps are shown already composed, with no continuous loop and no CSS transitions.
- [ ] A data load failure shows a banner with minimum facts and a retry button.

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
