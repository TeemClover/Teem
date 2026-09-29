# Mediral product-selling checks

Run from the repository root:

```sh
node --test tests/mediral/*.test.mjs
```

The suite uses Node's built-in test runner and standard library only. It needs no install, network or browser automation and does not modify the site. Syntax checks use `node --check`; controller/media/scene tests run focused harnesses rather than a real GPU or browser.

This document describes coverage, not a claim that the current integration or deployment has passed. Record the final full-run result after integration; earlier release totals do not verify a changed working tree.

## Test ownership and scope

| File | Contract |
|---|---|
| `mediral.test.mjs` | Data, source boundaries, static page order, native first-paint packs, media files/markup, dependencies and deployment exclusions. |
| `controller.test.mjs` | Actual page-controller behavior with a stand-in engine: chapter mounting (problem before benefit), markers → rail/step/header, resize keeping the story moment, flow switching, film window, saved lists, the gated offer, the profile and commission-link rules, anchors, legacy hashes and optional ingredient reading. |
| `lab-film.test.mjs` | Decorative media without controls: visibility/preferences, deferred loading, error/end state, asynchronous ownership and cleanup. |
| `detail.test.mjs` | The five product pages: every source-listed name in its group, names without a sourced role left as names, the mousse page without a formula, the sunscreen trade-name note, one LINE config, the way back, public-only data. |
| `cinema.test.mjs` | The scroll engine: history-independent poses and custom properties, `match` offsets, two-sided and parent-bounded load windows, liveness through parent layers, flow reset. |

## Product and source data

- Five pieces remain in the selected story order: mousse → white serum → yellow-green serum → sunscreen → powder. This is not a verified layering instruction.
- The mousse **has the current clover-reference AI draft pack**. Its formula and size remain unknown; no old rose-label ingredients, size or method are inherited. The held old draft is never referenced.
- All five package images remain labelled AI drafts. Native WebP images and usable visible bounds support readable packs without WebGL or reconstructed label geometry.
- Every selling beat has a readable role, source attribution and ingredient names that resolve to that product's catalogue. Missing photographs do not erase BR's five source-described roles or the seven Giga White plant names. Mineral-filter names remain separate from the botanical family.
- Exact display inventory stays CL 0 / AC 24 / BR 18 / SU 14 / PO 18. Each name belongs to one group. These counts are not a verified full INCI list or distinct actives; group-only claims do not become individual efficacy claims.
- Method/time copy keeps label guidance, source-supported serum morning/evening use and sunscreen reapplication. No invented serum hierarchy, drops, waits, powder weight or shade inventory.
- Held treatment, DNA, germ-killing, regeneration, universal-safety/shade, certification and numerical performance claims remain excluded from public copy.

## Motion v2 cinema (2026-09-29)

- One `#story` cinema; markers for `#routine` and each `#step-*`; every chapter mounted with its problem before its first benefit and the reviewed headline, support and waves.
- The published page reads as finished: no status language, draft notes not rendered, one provenance line in the footer, the owner's exact reply and both credits.
- No buy control without a verified destination; the brand profile shows for any list; a verified commission link would serve only the full set, with its disclosure; the poster offer is off the page but its date rules stay tested.
- Only consumed final WebPs ship, and every one is referenced. No import map or WebGL remains.

## Continuous sales path and scroll

- Static order: opening with all five DOM pack images, WHY, dated hero offer and direct `#set` route → product-story container → set offer → optional serum comparison → optional complete ingredient library.
- All five product chapters and their selling-beat headlines, bodies and names remain semantic DOM content without a scene. Scroll highlights the corresponding ingredient family and ambient mood; it does not select products.
- Forward/reverse scrolling and the phone reading line promote the intended beat. Ingredient exploration changes only its attributed detail.
- Comparison is closed initially after the offer. It repeats roles and source usage, not an instruction to layer both serums.
- Every atlas stays a closed disclosure with all names, roles and sources. Direct/in-page/history links open it; fresh links account for the fixed header. Late fonts, reader cancellation and hash changes retain anchor coverage.
- Opening/closing reading disclosures re-measures scene isolation. A hidden or covered scene does not resume merely because loading, context restoration or a tab event completes.

## Ambient media and rendering

- The delivered film is a real, lightweight faststart MP4 with a matching WebP poster. Markup has muted/inline playback and a deferred URL; it has no native/custom player controls, duration badge, status panel or loop.
- Playback requires the owning selling beat, enough viewport visibility, an active tab and allowed motion/data preferences. An inactive beat or hidden page pauses it; reduced motion/data saving and playback failures retain a poster without a manual-play prompt.
- The clip settles after one completed pass. Returning to the scene/tab or reinitializing the controller does not restart it. There is no replay control.
- A readiness-false instance does no media work. Late play promises or queued observer callbacks from disposed instances cannot restart or pause a newer owner.
- The optional scene handles mood/progress without rendering pack labels. Repeated wakes keep one loop; paused/hidden scenes retain their target without waking. Reduced motion draws only the necessary composed frame; context/environment restoration and disposal release resources correctly.

## Offer and saved list

- The fixed-set poster offer is 1,899 THB, dated 21–30 September 2026. Start/end boundaries, Bangkok midnight, tab return and invalid/public date overrides are covered.
- The opening describes the fixed set independently. The purchase summary requires all five selected pieces; partial/empty lists never inherit the bundle price or checkout link.
- The Affiliate URL remains null/pending and the static control has no destination. Even a URL cannot enable checkout without verified status and a complete set.
- Selection, copy text and card behavior remain separate from scroll/ingredient exploration. Clipboard denial exposes selected read-only text for manual copying.
- Pair offers, coupons, strike prices and internal partner costs remain outside the public sales story.

## Files and deployment boundaries

- Referenced WebPs are real local images; every module resolves locally without an import map.
- Package and concept-film provenance remains discoverable in source details.
- HTML and route configuration retain noindex and the slash redirect.
- Private reference screenshots, asset manifests/briefs, development docs/tests, the held mousse draft and the unsoftened sunscreen draft remain excluded from deployment. Noindex is not access control.

## What still requires a real browser and production checks

Harnesses do not prove appearance or playback in a browser. Check desktop, tablet, 390×844 and 360×640: crisp native packs, every benefit/ingredient beat, forward/reverse/fast scroll, fresh links, offer shortcut, optional disclosure focus and overflow. Verify reduced motion, data saving, failed WebGL/data loading, ambient playback/pause/end/fallback, copy and an opened downloaded PNG. After release, verify the exact live commit, runtime bytes, headers, private-path exclusions and MP4 Range behavior separately.
