# Xircle Visual Asset Audit — 2026-08-11

## Status

The broken `campaign-atlas.jpg` implementation is retired. Do not wire pages back to that file.

The web now uses separate stable `/xircle/assets/...` URLs with an error fallback in `/_shared/story.js`. The Xircle hero has been switched to `hero-xircle-hq.svg`; other legacy campaign/source wrappers still need a final HQ raster replacement pass.

## Current repository resolution QA

### Campaign layer

| Asset | Current rendered source size | QA |
|---|---:|---|
| `hero-xircle-hq.svg` | 1200 × 751 | usable / current hero |
| `hero-xircle.svg` | 640 × 401 | legacy fallback |
| `habit-score.svg` | legacy compact wrapper | replace with HQ |
| `hardware.svg` | legacy compact wrapper | replace with HQ |
| `community.svg` | legacy compact wrapper | replace with HQ |
| `routinex.svg` | legacy compact wrapper | replace with HQ |

### Canonical source layer

Current `body-composition.svg`, `maxage-canonical.svg`, `protein-hmb.svg`, `gus-product.svg`, `astamega-product.svg`, `vita-matrix-product.svg`, `routinex-box.svg`, and `xvisor.svg` are compact source wrappers. They are valid as semantic/canonical references but are not the final Apple-style high-resolution presentation assets.

## High-resolution source extraction verified

### Xircle revised 4.1 brochure

The 2-page source renders at approximately **5315 × 1737 px per page**. Each of the 5 vertical visual panels is approximately **1063 × 1737 px**, enough for high-quality web use.

Verified panel subjects:

1. Cover / Xircle positioning
2. Habit Score / Eat · Move · Sleep
3. Community / Your Xircle
4. The Habit Tracker / phone ecosystem
5. Daily routine story
6. Band + Scale + App ecosystem
7. MaxAge canonical persona
8. Body Composition / Trend
9. App dashboard
10. Health process / long-term direction

Canonical MaxAge persona visible in source:
- Actual Age 46
- Bio Age 48.2
- MaxAge™ 78.4

### RoutineX brochure

The 8-page brochure supplies high-resolution material for:

- RoutineX box / daily pack
- Xircle Scale + Band + App
- Eat · Move · Sleep
- ABCD
- Protein HMB+
- G.U.S.+
- AstaMega+
- Vita Matrix
- RoutineX package/system overview

### Xircle / XOS manual DOCX

The source package contains real app/source imagery, including images around **1080 × 1504**, **1181 × 1930**, **1080 × 1451**, and related sizes. These are valid candidates for XOS and app deep-dive pages and supersede the earlier assumption that no usable XOS imagery was supplied.

### X-VISOR Certification DOCX

Usable X-VISOR / product source imagery is present, including a source visual around **1181 × 1930**.

### X-Commerce Revenue Guide

The PDF supplies route-specific visuals for:

- X-Commerce cover
- SELL → MENTOR → MANAGE → EXPAND model
- Direct Mentoring mechanics
- Agency / growth examples
- Stacking / role progression

These should be used for Commerce pages instead of recycling RoutineX or health imagery.

## Route coverage QA

`/_shared/story.js` now explicitly covers the major customer/story routes for:

- Ecosystem
- Xircle App
- Habit Score / Eat / Move / Sleep
- Hardware
- Body Composition
- MaxAge
- Community
- Habix product family / FIVES / Flavor entry
- RoutineX / ABCD / Day 28
- X-VISOR and its deep routes
- XOS and its deep routes
- Academy / Certification

X-Commerce deliberately keeps its native route-specific visual for now rather than injecting an unrelated health/product asset. Its next visual pass should use the X-Commerce source PDF.

## Quality decision

**Current state is visually functional but not yet final-resolution across every route.**

The final production pass should replace compact wrappers with source-derived or campaign WebP assets at these target sizes:

- Campaign landscape: ~1586 × 992 or equivalent
- Source portrait panels: ~1063 × 1737
- App/XOS screenshots: native source dimensions up to ~1181 × 1930
- Commerce pages: ~1200 × 1696 source-derived panels

Do not upscale the old 360/640 px wrappers and call them HQ. Replace them from the original source or a newly generated campaign master.

## Asset policy

- Stable absolute `/xircle/assets/...` paths only.
- Canonical data visuals beat generated visuals whenever visible numbers/text matter.
- Body Composition and MaxAge must remain source-correct.
- Generated art may be used for atmosphere, hero storytelling, lifestyle, or abstract product context, but never to invent medical metrics, product labels, compensation values, or unresolved naming.
- Flavor+ dedicated final product photography remains unresolved; do not fabricate a canonical package until naming/artwork is confirmed.
- Every critical image must be checked for: file existence, decoded dimensions, mobile crop, desktop crop, readable contrast, and graceful fallback before being marked production-ready.
