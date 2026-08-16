# Xircle v5 — Image Slot Manifest

All top-level `/xircle/**` product pages are designed to work without final art. CSS fallbacks stay visible until the matching image file exists at the exact path below.

## Production rules
- No baked-in headline text unless explicitly requested.
- Thai-first: user-facing explanatory copy in generated images should be natural Thai; keep English for official product names only when appropriate.
- Export WebP for website use when possible. Existing O4/O5/O6 production assets are PNG and are referenced as PNG.
- Prefer crisp premium product/editorial illustration over stock-photo or generic AI-neon visuals.
- Xircle world: deep green / cream / cyan / mint / restrained gold, cinematic and clean.
- XTY White Cat world: warm cream / graphite / mint / restrained gold, tactile notebook feel.
- **Browser rule: generated artwork is a completed canvas. Do not crop it again in CSS.** Use `object-fit: contain` and preserve the declared ratio so baked Thai UI/copy stays readable on desktop and mobile.

## P0 — make these first
| File | Ratio | Recommended size | Route / moment |
|---|---:|---:|---|
| `xircle-s00-hook-hero.webp` | 16:9 | 1920×1080 | `/xircle/` hook |
| `xircle-s06-yesterday-visible.webp` | 1:1 | 1600×1600 | Habit Score payoff |
| `xircle-s08-seeing-not-doing.webp` | 16:9 | 1920×1080 | Knowing ≠ Doing |
| `xircle-s09-connected-loop.webp` | 4:3 | 1600×1200 | connected loop + first strong White Cat presence |
| `xircle-care-hero.webp` | 16:9 | 1920×1080 | Human Care hero |
| `xircle-opportunity-o6-whitecat-reveal.png` | 4:3 | 1600×1200 | full White Cat reveal |
| `xircle-party-create-hero.webp` | 16:9 | 1920×1080 | Xircle → XTY Create transition |
| `xircle-party-join-hero.webp` | 16:9 | 1920×1080 | Join invitation transition |

## P1 — core journey
| File | Ratio | Recommended size |
|---|---:|---:|
| `xircle-s01-memory-gap.webp` | 4:3 | 1600×1200 |
| `xircle-s02-sleep.webp` | 4:3 | 1600×1200 |
| `xircle-s03-eat.webp` | 4:3 | 1600×1200 |
| `xircle-s04-move.webp` | 4:3 | 1600×1200 |
| `xircle-s07-one-action.webp` | 4:3 | 1600×1200 |
| `xircle-start-today.webp` | 4:3 | 1600×1200 |
| `xircle-care-data-vs-life-01.webp` | 3:2 | 1800×1200 |
| `xircle-opportunity-o0-intro.webp` | 16:9 | 1920×1080 |
| `xircle-opportunity-o1-signal.webp` | 4:3 | 1600×1200 |
| `xircle-opportunity-o2-context.webp` | 3:2 | 1800×1200 |
| `xircle-opportunity-o3-followup.webp` | 4:3 | 1600×1200 |
| `xircle-opportunity-o4-boundary.png` | 4:3 | 1600×1200 |
| `xircle-opportunity-o5-summary.png` | 4:3 | 1600×1200 |

## P2 — supporting pages
| File | Ratio | Recommended size |
|---|---:|---:|
| `xircle-learn-hero.webp` | 16:9 | 1920×1080 |
| `xircle-routinex-hero.webp` | 16:9 | 1920×1080 |
| `xircle-products-hero.webp` | 16:9 | 1920×1080 |
| `xircle-hardware-hero.webp` | 16:9 | 1920×1080 |
| `xircle-together-hero.webp` | 4:3 | 1600×1200 |
| `xircle-pattern-hero.webp` | 16:9 | 1920×1080 |
| `xircle-reference-hero.webp` | 16:9 | 1920×1080 |

## Optional reusable character asset
- `whitecat-guide-cutout.webp` — 1:1 canvas, 1600×1600, transparent background preferred.

## Display rule
- Keep the full source canvas visible on desktop and mobile.
- Preserve the declared 16:9 / 4:3 / 3:2 / 1:1 ratio.
- Letterboxing on very narrow screens is acceptable; cutting baked UI, Thai copy, faces, or diagrams is not.
- Primary website narration remains HTML/CSS; generated text should stay minimal.

## Naming rule
Do not rename these files after generation. The HTML already points to these paths; uploading a file with the matching name replaces the CSS fallback automatically.
