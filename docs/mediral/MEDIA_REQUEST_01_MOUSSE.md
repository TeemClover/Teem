# Mousse imagery — current illustration and remaining source request

Updated 2026-09-28 after the owner asked for the missing first product bottle and a stronger visual treatment.

## Used on the page

`mediral/assets/pack/cl-clover-front-v2.webp` is a 1024×1536 transparent WebP, generated with the built-in imagegen tool from the clover-label white pump bottle visible in the supplied five-piece poster. It replaces the foam-only stand-in. Foam and water now move around the bottle. The image is also used before WebGL loads, in static fallback, the routine rail, the set and the saved PNG.

This is an **AI illustration**, not an untouched packshot. The main source-visible wordmark, cleansing title, clear cap and clover motif were checked against the poster. Unverified lower-label words were removed in a second pass. Small simulated print is not evidence of a claim, formula, certification or size.

The old gold-rose pack is still held and excluded. No old-pack ingredients were assigned to the clover product. `size` remains null and both ingredient arrays remain empty.

## Remaining real media

| ID | Source needed | Use |
|---|---|---|
| M1 | Brand-supplied or photographed front packshot of the current clover SKU, label pixels untouched, transparent background, at least 1024 px tall | Replace the AI illustration after checking identity and label |
| M2 | Real footage of the current pump dispensing foam, unaltered colour, no face required | Show actual texture; procedural foam is atmosphere only |

M1 is not complete merely because the AI illustration is now visible. When the real packshot arrives, update its status and notes everywhere the pack appears. Keep ingredient and size fields unknown until supported by current label evidence.

## Image generation recipe used

Built-in imagegen, two passes; the selected result was exported to WebP with alpha preserved. No video generation or external video credits were used.

Initial brief: isolate only the white clover-label mousse bottle from the poster; upright near-front view, full clear cap and base, tall white body, original green Mediral wordmark, cleansing title and clover placement. Neutral studio light, transparent background, no floor, leaves, bubbles, badge, price, new certification, ingredient or volume.

Correction prompt: keep the silhouette, cap, pump, main wordmark and clover; fully transparent pixels outside the physical bottle. Remove the generated lower-label words “PURIFYING”, “MOISTURIZING”, “MILD CARE”, “DERMATOLOGICALLY TESTED” and “FOR SENSITIVE SKIN”; leave indistinct green microprinting. Readable text is limited to the source-visible “Mediral”, “ORGANIC”, “Detoxing Pollution & Dirt Cleansing” and “MOUSSE”. No new claims or volume.
