# Xircle Visual Asset Audit — 2026-08-11

## Status

The broken `campaign-atlas.jpg` implementation is retired. Do not wire pages back to that file.

The web now uses separate stable `/xircle/assets/...` URLs with an error fallback in `/_shared/story.js`. The HQ raster replacement pass is complete for the shared route system and the `/xircle/` landing page. Legacy SVG wrappers remain in the repository only as rollback/reference assets and are no longer used by the shared visual mapper.

## Current repository resolution QA

### Generated experience layer

| Asset | Rendered size | QA |
|---|---:|---|
| `generated/hero-device-cluster.png` | 1254 × 1254, alpha | current layered hero device master |
| `generated/data-orbits.png` | 1254 × 1254, alpha | current parallax atmosphere layer |

### Canonical source layer now in production mapping

| Directory | Production use | Responsive variants |
|---|---|---|
| `source/xircle-v41/` | landing, app, hardware, Body, MaxAge™, community, X-VISOR, ecosystem | 1063 px + 640 px |
| `source/app-ui/` | rotating device UI and app deep routes | native + 640 px |
| `source/brochure-routinex/` | RoutineX and Habix product routes | 1063/640 px plus native product crops |
| `source/commerce/` | Commerce overview, role, revenue and glossary routes | 1199 px + 720 px |

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

X-Commerce now uses its own route-specific panels from the X-Commerce Revenue Guide. It no longer recycles unrelated health or RoutineX imagery.

## Quality decision

**HQ asset replacement is complete for the current route architecture.**

Production assets meet the target classes below:

- Campaign landscape: ~1586 × 992 or equivalent
- Source portrait panels: ~1063 × 1737
- App/XOS screenshots: native source dimensions up to ~1181 × 1930
- Commerce pages: ~1200 × 1696 source-derived panels

No old 360/640 px wrapper was upscaled and presented as HQ. Assets were rebuilt from the supplied source files or generated as new transparent campaign masters.

## Experience and typography QA

- Main hero uses independent transparent PNG layers for device cluster, data orbits, live UI screen and floating glass chips.
- Scroll movement is requestAnimationFrame-throttled and clamped to avoid layout drift.
- Motion is disabled under `prefers-reduced-motion`.
- Shared source/status UI is injected across all Xircle pages.
- Fine print and disclaimer text has a 12 px readability floor with increased line height.
- Responsive `srcset` is assigned where a 640/720 px sibling exists.
- Static audit: 45/45 HTML routes have `noindex`, shared experience JS and resolvable local `src`/`href` paths.

## Asset policy

- Stable absolute `/xircle/assets/...` paths only.
- Canonical data visuals beat generated visuals whenever visible numbers/text matter.
- Body Composition and MaxAge must remain source-correct.
- Generated art may be used for atmosphere, hero storytelling, lifestyle, or abstract product context, but never to invent medical metrics, product labels, compensation values, or unresolved naming.
- AstaMega+ and Vita Matrix use claim-free generated ingredient atmosphere in production mapping. Raw brochure crops containing promotional claim copy remain reference-only and must not be wired into customer-facing routes.
- Flavor+ dedicated final product photography remains unresolved; do not fabricate a canonical package until naming/artwork is confirmed.
- Every critical image must be checked for: file existence, decoded dimensions, mobile crop, desktop crop, readable contrast, and graceful fallback before being marked production-ready.

## 12 Aug 2026 — Cinematic story pass

Nine new 16:9 generated story plates and one transparent parallax master were added under `assets/generated/story-v2/`:

- `morning` — Xircle overview, Habit Score, Body, Hardware and MaxAge context
- `eat` — real meal logging moment with no synthetic UI
- `move` — attainable daily movement in a Thai urban setting
- `sleep` — calm recovery context with no score judgment
- `community` — a supportive circle without staged rally imagery
- `nutrition` — claim-free Habix / RoutineX atmosphere with space for approved packs
- `xvisor` — equal-level human care, explicitly non-medical and non-sales
- `xos` — repeatable team operations with unreadable background screens
- `source` — Academy / Source Control knowledge advantage
- `data-ribbons.png` — transparent cyan/mint/gold parallax layer with no text, metric, icon or synthetic interface

Each photographic master is delivered as a 1600 × 900 WebP plus a 960 × 540 responsive sibling. Generated images never carry canonical UI, package labels, metrics, compensation values or claims. Every cinematic chapter overlays a separate source-correct proof card from S1–S5 assets.

The root hero no longer downloads the retired synthetic device cluster or perspective-mapped UI carousel. It uses the canonical Xircle v4.1 source visual plus the new transparent ribbon layer and HTML glass chips.

Typography is now self-hosted under `assets/fonts/` with Thai and Latin WOFF2 subsets for IBM Plex Sans Thai plus Latin WOFF2 subsets for Manrope. This removes the Google Fonts runtime dependency and prevents Thai tofu/missing-glyph failures in restricted or slow network conditions.

Visual QA after the pass covered all 45 routes at 320, 390, 768 and 1440 px. Browser checks confirmed: zero horizontal overflow, zero missing cinematic chapters, zero broken story/proof images, valid decoded responsive sources, readable 16 px body baseline and no runtime JavaScript errors.
