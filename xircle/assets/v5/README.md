# Xircle v5 — Image Slot Manifest

All top-level `/xircle/**` product pages are designed to work without final art. CSS fallbacks stay visible until the matching image file exists at the exact path below.

## Production rules
- No baked-in headline text unless explicitly requested.
- Thai-first: user-facing explanatory copy in generated images should be natural Thai; keep English for official product names only when appropriate.
- Export WebP for website use when possible. Existing O4/O5/O6 production assets are PNG and are referenced as PNG.
- Prefer crisp premium product/editorial illustration over stock-photo or generic AI-neon visuals.
- Xircle world: deep green / cream / cyan / mint / restrained gold, cinematic and clean.
- XTY White Cat world: warm cream / graphite / mint / restrained gold, tactile notebook feel.
- **Actual uploaded file canvas is the source of truth.** This table records the intended/current slot, but an older ratio in this document must never force a newly replaced image into the wrong frame.
- **Browser rule:** let the frame follow the real image canvas. Fill the frame width, keep the complete source canvas visible, and do not create artificial letterbox space from a stale ratio.

## P0 — make these first
| File | Current ratio | Recommended size | Route / moment |
|---|---:|---:|---|
| `xircle-s00-hook-hero.webp` | 4:3 | 1600×1200 | `/xircle/` hook |
| `xircle-s06-yesterday-visible.webp` | 4:3 | 1600×1200 | Habit Score payoff |
| `xircle-s08-seeing-not-doing.webp` | 16:9 | 1920×1080 | Knowing ≠ Doing |
| `xircle-s09-connected-loop.webp` | 4:3 | 1600×1200 | connected loop + first strong White Cat presence |
| `xircle-care-hero.webp` | 4:3 | 1600×1200 | Human Care hero |
| `xircle-opportunity-o6-whitecat-reveal.png` | 4:3 | 1600×1200 | full White Cat reveal / White Cat safe-room hero |
| `xircle-party-create-hero.webp` | 16:9 | 1920×1080 | 28-day / XTY transition hero |
| `xircle-party-join-hero.webp` | 16:9 | 1920×1080 | invite-specific reserve/share art |

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
- The actual uploaded image dimensions override an older ratio note in this manifest.
- After load, the wrapper should follow the real image canvas (`width:100%; height:auto`).
- Full-row artwork on phones may expand to viewport width while keeping its rounded corners.
- Do not distort, stretch, or hide Thai UI, faces, diagrams, or meaningful baked content.
- Primary website narration remains HTML/CSS; generated text should stay minimal.

## Naming rule
Do not rename these files after generation. The HTML already points to these paths; uploading a file with the matching name replaces the CSS fallback automatically.
