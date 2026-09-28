# Mediral 5 Steps — `/mediral/`

The Mediral routine page on myClover tells the five-piece routine as one continuous scroll story: mousse → white serum → yellow-green serum → sunscreen → powder puff.

Each step moves from the ingredients the brand names, through a glass funnel and one drop, to the product revealed. A movement then shows the step's role, and the product joins the routine rail. The story ends with the full set of five, which is the main call to action.

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
| `?today=YYYY-MM-DD` | Previews the poster-offer expiry without changing the clock. |

Static checks:

```sh
node --test tests/mediral/*.test.mjs
```

## Files and contracts

| File | Role |
|---|---|
| `mediral/data/routine.json` | Every product fact: step order, role headline, how and when to use, featured and other ingredient names with images, notes, the set poster offer, the buy state and the disclosure. |
| `mediral/js/main.js` | Renders the accessible page from the data. Maps scroll to story progress `u`. Owns the buyer's set selection (only their ticks change it), copy, card download, fallbacks and the data-error retry. |
| `mediral/js/story.js` | See the `createStory` contract below. Exports `STACKED_QUERY`, the one media query that switches both CSS and scene to words-below-scene. |
| `mediral/js/card.js` | See the `drawRoutineCard` contract below. |
| `mediral/assets/` | Pack AI drafts, botanical and material illustrations (prepared by GPT; see `FIVE_STEP_ASSETS.json`). |
| `mediral/vendor/` | Local three.js subset, copied from Homechew. |

**`story.js` — `createStory({canvas, steps, asset, reduced})`** resolves to `{setProgress(u), setSelection(ids), setBand({left, right}), state}`. `setBand` gives the landscape set view the free screen band (0..1) between the set card and the rail, measured by `main.js`.
- The scene is a pure function of `u` plus idle time.
- It rejects if WebGL or the pack images fail; the page then shows static stills.
- Pack art is front-only: bottles are lathes from their own silhouette with the art projected on, and flat packs are billboards. Yaw stays within ±12°.

**`card.js` — `drawRoutineCard({pieces, data, asset})`** resolves to an object URL of a 1080-wide PNG.
- It lists the ticked pieces in routine order with the three pre-payment checks. It shows no price.
- It rejects on failure, and the page then tells the buyer.

`vercel.json` adds the `/mediral` redirect and the `X-Robots-Tag: noindex` header. `.vercelignore` keeps `docs/mediral/` and `tests/mediral/` out of deployment. The internal reference files are both gitignored (local only) and excluded from deployment: the shop screenshots in `mediral/assets/evidence/`, the asset manifests/briefs (`mediral/assets/*.md`, `*.json`), the held old mousse draft, and the unsoftened sunscreen draft (`su-front.webp`; the page uses `su-front-web.webp`). Noindex is not access control.

## Content that must stay explicit

**Mousse**
- The current clover-label pack is not verified, so the mousse opens with water, foam and its name only.
- The old gold-rose draft and its ingredient list are not used.

**Other packs**
- They are AI drafts and are labelled so on the stage, in the notes and on the card.
- Botanicals are AI illustrations of names in brand material, not proof of ingredients, origin, concentration or effect.

**Copy**
- Headlines state the step's role.
- Brand statements are attributed ("สื่อแบรนด์เล่าว่า…").
- The serum order is story order: no wait times, drop counts or combined effects. Label instructions win.

**Set offer**
- 1,899 THB comes from the brand poster, dated 21–30 Sep 2026. It is labelled as unverified in cart or coupons, and hidden after the end date.
- The serum-pair price and coupons are not part of this page.

**Purchase**
- The Affiliate URL is `null`, so the button says the link is being checked and does not navigate. The page takes no payment.

## Review checklist

- [ ] Desktop and mobile: words sit beside or below the scene, never covering it. No clipped text, missing media or horizontal overflow.
- [ ] Each step plays in order: ingredients → funnel → drop → product → role → rail. The set shows all five.
- [ ] Ticking pieces updates the summary, copy text, card and the dimmed pieces in the scene. Scrolling never changes the ticks.
- [ ] No WebGL or save-data: static stills per step and in the set row, matching the ticks.
- [ ] Reduced motion: steps are shown already composed, with no continuous loop and no CSS transitions.
- [ ] A data load failure shows a banner with minimum facts and a retry button.

## Verification record

Record real outcomes of browser and deployment checks in the commit or pull request that ships them. A saved file is not proof of a working page.
