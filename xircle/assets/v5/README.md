# Xircle v5 — Image Slot Manifest

All top-level `/xircle/**` product pages are designed to work without final art. CSS fallbacks stay visible until the matching image file exists at the exact path below.

## Production rules
- No baked-in headline text unless explicitly requested.
- Keep the focal subject inside the center safe zone for responsive crop.
- Export WebP for website use.
- Prefer crisp premium product/editorial illustration over stock-photo or generic AI-neon visuals.
- Xircle world: deep green / cream / cyan / mint / restrained gold, cinematic and clean.
- XTY White Cat world: warm cream paper / graphite / mint / restrained gold, tactile notebook feel.

## P0 — make these first
| File | Ratio | Recommended size | Route / moment |
|---|---:|---:|---|
| `xircle-s00-hook-hero.webp` | 16:9 | 1920×1080 | `/xircle/` hook |
| `xircle-s06-yesterday-visible.webp` | 1:1 | 1600×1600 | Habit Score payoff |
| `xircle-s08-seeing-not-doing.webp` | 16:9 | 1920×1080 | Knowing ≠ Doing |
| `xircle-s09-connected-loop.webp` | 4:3 | 1600×1200 | connected loop + first strong White Cat presence |
| `xircle-care-hero.webp` | 16:9 | 1920×1080 | Human Care hero |
| `xircle-opportunity-o6-whitecat-reveal.webp` | 4:3 | 1600×1200 | full White Cat reveal |
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
| `xircle-opportunity-o4-boundary.webp` | 4:3 | 1600×1200 |
| `xircle-opportunity-o5-summary.webp` | 4:3 | 1600×1200 |

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

## Safe-zone rule
- 16:9 hero: keep critical subject/action inside center ~70%; mobile may crop toward 4:3.
- 4:3 scene: keep critical subject inside center ~80%.
- 3:2 editorial scene: avoid important faces/details at extreme left/right edges.
- 1:1: keep the full score/character system comfortably inside center 82%.

## Naming rule
Do not rename these files after generation. The HTML already points to these paths; uploading a file with the matching name replaces the CSS fallback automatically.
