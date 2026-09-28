# Mediral 5 Steps — `/mediral/`

The Mediral routine page on myClover tells the five-piece routine as one continuous scroll story: mousse → white serum → yellow-green serum → sunscreen → powder puff.

The opening shows the clover-label mousse bottle from the first frame, with water and foam around it. The following steps move from the ingredients the brand names, through a glass funnel and one drop, to the product revealed. The scene uses large products, botanical depth and a moving camera in a forest/chartreuse editorial layout. The story ends with the full set of five, which is the main call to action.

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
| `?u=0..6` | Pins the scene at a story position. `0–1` is the mousse, `1–5` are the next four steps, `5–6` is the set. |
| `?today=YYYY-MM-DD` | Localhost only: previews both boundaries of the poster offer. Public URLs ignore this override. |

Contract and controller behavior checks:

```sh
node --test tests/mediral/*.test.mjs
```

## Files and contracts

| File | Role |
|---|---|
| `mediral/data/routine.json` | Every product fact: step order, role headline, how and when to use, featured and other ingredient names with images, notes, the set poster offer, the buy state and the disclosure. |
| `mediral/js/main.js` | Renders the accessible page from the data. Maps scroll to story progress `u`. Owns the reader's saved list, copy, card download, dated offer, fallbacks and the data-error retry. Saving individual pieces does not change the store's fixed bundle. |
| `mediral/js/story.js` | See the `createStory` contract below. Exports `STACKED_QUERY`, the one media query that switches both CSS and scene to words-below-scene. |
| `mediral/js/card.js` | See the `drawRoutineCard` contract below. |
| `mediral/assets/` | Pack AI drafts, botanical and material illustrations (prepared by GPT; see `FIVE_STEP_ASSETS.json`). |
| `mediral/vendor/` | Local three.js subset, copied from Homechew. |

**`story.js` — `createStory({canvas, steps, asset, reduced, onContextChange})`** resolves to `{setProgress(u), setSelection(ids), setBand({left, right}), setReducedMotion(bool), pause(), resume(), dispose(), state}`. `setBand` gives the landscape set view the free screen band (0..1) between the set card and the rail, measured by `main.js`. CSS and scene stack at widths up to 1100 px.
- The scene is a pure function of `u` plus idle time.
- It rejects if WebGL or the pack images fail; the page then shows static stills.
- `onContextChange('lost' | 'restored')` switches to stills and back while retaining the reading position. GPU environment lighting is rebuilt before restoring the scene. If rebuilding fails, stills remain visible.
- Reduced motion can change while the page is open. Visibility changes pause/resume the renderer; a single animation loop is retained.
- Ingredient names appear on entry and illustrations load independently. Mobile botanicals and funnel use a smaller composition clear of the top navigation.
- Pack art is front-only: bottles are lathes from their own silhouette with the art projected on, and flat packs are billboards. Yaw stays within ±12°.

**`card.js` — `drawRoutineCard({pieces, data, asset})`** resolves to an object URL of a 1080-wide PNG.
- It lists the ticked pieces in routine order with the three pre-payment checks. It shows no price.
- It rejects on failure, and the page then tells the buyer.

`vercel.json` adds the `/mediral` redirect and the `X-Robots-Tag: noindex` header. `.vercelignore` keeps `docs/mediral/` and `tests/mediral/` out of deployment. The internal reference files are both gitignored (local only) and excluded from deployment: the shop screenshots in `mediral/assets/evidence/`, the asset manifests/briefs (`mediral/assets/*.md`, `*.json`), the held old mousse draft, and the unsoftened sunscreen draft (`su-front.webp`; the page uses `su-front-web.webp`). Noindex is not access control.

## Content that must stay explicit

**Mousse**
- The bottle illustration is based on the clover-label pack in the supplied five-piece poster, generated with imagegen and labelled as an AI draft. It is visible before and after WebGL loads, in the static fallback, the set and the PNG.
- A verified original packshot is still requested. No formula or size is inferred from the illustration; both ingredient arrays are empty and size is null.
- The old gold-rose draft and its ingredient list are not used.

**Other packs**
- They are AI drafts and are labelled so on the stage, in the notes and on the card.
- Botanicals are AI illustrations of names in brand material, not proof of ingredients, origin, concentration or effect.

**Copy**
- Headlines state the step's role.
- Brand statements are attributed ("สื่อแบรนด์เล่าว่า…").
- The serum order is story order: no wait times, drop counts or combined effects. Label instructions win.

**Set offer**
- 1,899 THB comes from the brand poster, dated 21–30 Sep 2026. It is labelled as unverified in cart or coupons, and displayed only within those dates and with all five pieces selected. The page refreshes the offer at Bangkok midnight and when returning to the tab.
- The serum-pair price and coupons are not part of this page.

**Purchase**
- The Affiliate URL is `null`, so the button says the link is being checked and does not navigate. The page takes no payment.
- A future checkout needs `buy.status: "verified"`, an HTTPS Affiliate URL and the full five-piece selection. Partial or empty saved lists never receive the bundle's price or checkout link; a button restores all five pieces.
- Individual selection lives inside an optional disclosure. The summary card scrolls with the document, rather than trapping the buyer in a second scrolling card. Product instructions are expandable on mobile and desktop.
- If clipboard access fails, a focused, selected, read-only text field supports manual copying.

## Review checklist

- [ ] Desktop and mobile: words sit beside or below the scene, never covering it. No clipped text, missing media or horizontal overflow.
- [ ] Each step plays in order: ingredients → funnel → drop → product → role → rail. The set shows all five.
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
