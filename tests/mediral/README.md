# Mediral product-selling checks

Run from the repository root:

```sh
node --test tests/mediral/*.test.mjs
```

The suite uses Node's built-in test runner and standard library only. It needs no install, network or browser automation and does not modify the site. Syntax checks use `node --check`; controller, cinema and media tests run focused harnesses rather than a real browser.

For the 2026-09-29 CL ingredient restoration and three-film increment, root reports the full suite with **117/117 passing** and `node shelf/validate.mjs` passed. GPT/root implemented this increment from `8b9b09ec` while Claude's quota was exhausted. This records the reported local run; it does not claim browser or production verification, and later code changes require their own relevant checks.

## Test ownership and scope

| File | Contract |
|---|---|
| `mediral.test.mjs` | Data, source boundaries, the colour route (each line names number, colour, pack and role in pack order, with no barrier or strength wording), static page order, native first-paint packs, media files/markup, dependencies and deployment exclusions. |
| `controller.test.mjs` | Actual page-controller behavior with a stand-in engine: chapter mounting (problem before benefit), markers → rail/step/header, the LINE close and selected-piece message, resize keeping the story moment, flow switching, independent AC/BR/SU film windows/revisits, the gated offer, profile and commission-link rules, anchors and legacy hashes. |
| `lab-film.test.mjs` | Decorative media without controls: visibility/preferences, deferred loading, error/end state, asynchronous ownership and cleanup. |
| `detail.test.mjs` | The five product pages: the accessible route strip and neighbouring links, three beats per page, all 89 source-listed records pictured in their groups in an open gallery, no invented individual roles, the restored 15-name mousse list, the sunscreen trade-name note, one LINE config, public-only data and visible reduced-motion fallback. |
| `cinema.test.mjs` | The scroll engine: history-independent poses and custom properties, `match` offsets, two-sided and parent-bounded load windows, liveness through parent layers, flow reset. |

## Product and source data

- Five pieces remain in the selected story order: mousse → white serum → yellow-green serum → sunscreen → powder. This is not a verified layering instruction.
- The mousse **has the current clover-reference AI draft pack**. The user confirmed on 2026-09-29 that the 15 names in brand source `S01 _3` apply to the current pack (`UC01`, `USERCONFIRMED`, canonical source 0.2.0). Size, full INCI and independent efficacy remain unverified; no old 80 ml size or mask method is inherited. The held old pack draft is never referenced.
- All five package images remain labelled AI drafts. Native WebP images and usable visible bounds support readable packs without WebGL or reconstructed label geometry.
- Every selling beat has a readable role, source attribution and ingredient names that resolve to that product's catalogue. This increment adds daisy and portulaca images for CL, joining the earlier 23-image detail upgrade and existing library. All 89 records have an image; shared material images retain separate names and cards. These are illustrations, not supplier photographs. Mineral-filter names remain separate from the botanical family.
- Exact display inventory is **CL 15 / AC 24 / BR 18 / SU 14 / PO 18**. Each name belongs to one group. These counts are not a verified full INCI list or distinct actives; group-only claims do not become individual efficacy claims. All 15 CL names stay identity-only because its source does not assign individual roles.
- CL gentle-cleansing/no-dry-feeling copy follows its product-level brand source. Foam freshness follows the owner's sensory direction without claiming a named flower provides perfume. BR describes dull-looking skin, not a diagnosis of missing skin nutrition. PO attributes its “ไม่อุดตัน” wording to Mediral; this is neither an independent test nor a guarantee that no user will develop acne.
- Method/time copy keeps label guidance, source-supported serum morning/evening use and sunscreen reapplication. No invented serum hierarchy, drops, waits, powder weight or shade inventory.
- Held treatment, DNA, germ-killing, regeneration, universal-safety/shade, certification and numerical performance claims remain excluded from public copy.

## Motion v2 cinema (2026-09-29)

- One `#story` cinema; markers for `#routine` and each `#step-*`; every chapter mounted with its problem before its first benefit and the reviewed headline, support and waves.
- The published page reads as finished: no status language, draft notes not rendered, one provenance line in the footer, the owner's exact reply and both credits.
- No buy control without a verified destination; the brand profile shows for any list; a verified commission link would serve only the full set, with its disclosure; the poster offer is off the page but its date rules stay tested.
- Only consumed final WebPs ship, and every one is referenced. No import map or WebGL remains.

## Continuous sales path and scroll

- Main-page order: WHY and all five DOM packs → five motion chapters, each linking to its own product page → the authorized exchange → LINE close. The dated poster offer is hidden.
- Scroll and chapter navigation do not change the selected pieces. Forward/reverse poses and resize preserve the story moment; fresh anchors, reader cancellation and legacy hashes retain controller coverage.
- Each product page adds three beats: ingredients → material/texture → care. CL now includes its confirmed source-list applicability, foam and cleansing role. Every page selects only names from its own catalogue; ingredient illustrations add no new efficacy claims.
- Ingredient galleries are open grouped cards, not closed disclosures: every one of the 89 records has an image and a name, and only sourced individual roles receive benefit text. FAQ and general-knowledge disclosures remain separate.
- `#formula-*` links route to the matching product page's `#ingredients`; old main-page `#ingredients`/`#serums` links route to the set. Detail pages retain their current/previous/next links and exact chapter return.
- Reveal motion is an optional enhancement. The reduced-motion harness shows all targets immediately; CSS hiding rules are limited to an active reveal enhancement with motion allowed. Browser checks still need to exercise moving reveals, deep gallery arrival and preference changes.

## Ambient media and rendering

- Three delivered concept films have matching WebP posters and 1080/720 MP4 variants: the existing AC body cut, plus two 8-second Seedance films for BR and SU. Markup has muted/inline playback and deferred URLs; it has no native/custom player controls, duration badge, status panel or loop.
- SU keeps its visible concept caption, “ภาพจำลองกล้อง UV · ไม่ใช่ผลทดสอบสินค้า”, beside the comparison. It is not a product trial, real UV-camera measurement or manufacturing evidence. AC/BR imagery likewise does not demonstrate an extraction process or a skin result.
- Playback requires the owning selling beat, enough viewport visibility, an active tab and allowed motion/data preferences. An inactive beat or hidden page pauses it; reduced motion/data saving and playback failures retain a poster without a manual-play prompt.
- Each film settles after one completed pass. A tab return or nearby scroll does not rewind it; only that instance's genuine chapter departure and return starts a new pass. Activating one film deactivates the others, and one optional film failure must not prevent the other instances from initializing. There is no replay control.
- A readiness-false instance does no media work. Late play promises or queued observer callbacks from disposed instances cannot restart or pause a newer owner.
- The cinema uses native pack images and deterministic scroll poses, with normal-flow fallback. The retired WebGL/GPU lifecycle is not part of the current runtime or suite.

## LINE, offer and selected-piece message

- The fixed-set poster offer is 1,899 THB, dated 21–30 September 2026, and remains hidden by `show_offer: false`. Start/end boundaries, Bangkok midnight, tab return and invalid/public date overrides are covered.
- The opening describes the fixed set independently. A partial/empty selection never inherits a bundle price or commission link. The verified myClover LINE action remains available even when no pieces are selected; opening it does not place an order.
- The Affiliate URL remains null/pending. A future commission link requires verified status, an HTTPS URL and the complete set, with disclosure beside it.
- Selection and optional copy text remain separate from scrolling. Empty selection disables copy; clipboard denial exposes selected read-only text for manual copying. The saved-list PNG and its download control are retired.
- Pair offers, coupons, strike prices and internal partner costs remain outside the public sales story.

## Files and deployment boundaries

- Referenced WebPs are real local images; every module resolves locally without an import map.
- Package and concept-film provenance remains discoverable in the footer; ingredient galleries identify their images as illustrations rather than supplier photographs.
- HTML and route configuration retain noindex and the slash redirect.
- Private reference screenshots, asset manifests/briefs, development docs/tests, the held mousse draft and the unsoftened sunscreen draft remain excluded from deployment. Noindex is not access control.

## What still requires a real browser and production checks

Harnesses do not prove appearance or playback in a browser. Check desktop, tablet, 390×844 and 360×640: crisp native packs, all five detail pages' three beats and open ingredient galleries, forward/reverse/fast scroll, fresh gallery/chapter/order links, keyboard focus and overflow. Verify reduced motion (including a preference change), an unavailable reveal observer, failed data loading, data saving, ambient playback/pause/end/revisit/fallback, LINE and copying a partial or empty selection. After release, verify the exact live commit, runtime bytes, headers, deployment exclusions and MP4 Range behavior separately. Earlier PNG, closed-atlas and GPU checks remain historical records in `docs/mediral/README.md`, not current acceptance steps.
