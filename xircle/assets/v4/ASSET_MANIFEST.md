# Xircle v4 — Art Asset Manifest

Drop final generated `.webp` files into this folder using the exact filenames below. Pages already contain graceful CSS fallback art, so missing files do not break the experience.

## Main `/xircle/`

| Priority | Filename | Ratio | Scene |
|---|---|---:|---|
| P0 | `xircle-s00-hook-hero.webp` | 16:9 | Hook / yesterday fragments |
| P1 | `xircle-s01-memory-gap.webp` | 4:3 | Memory → visible |
| P1 | `xircle-s02-sleep.webp` | 4:3 | Sleep scene |
| P1 | `xircle-s03-eat.webp` | 4:3 | Eat / food awareness |
| P1 | `xircle-s04-move.webp` | 4:3 | Movement scene |
| P0 | `xircle-s06-yesterday-visible.webp` | 1:1 | Habit Score payoff |
| P1 | `xircle-s07-one-action.webp` | 4:3 | One Action |
| P0 | `xircle-s08-seeing-not-doing.webp` | 16:9 | Data → real life friction |
| P0 | `xircle-s09-connected-loop.webp` | 16:9 | Connected ecosystem loop |

## `/xircle/start/`

| Priority | Filename | Ratio |
|---|---|---:|
| P1 | `xircle-start-today.webp` | 4:3 |

## `/xircle/care/`

| Priority | Filename | Ratio | Use |
|---|---|---:|---|
| P0 | `xircle-care-hero.webp` | 16:9 | Data ↔ Human Care hero |
| P0 | `xircle-care-data-vs-life-01.webp` | 3:2 | Data → Context comparison |

Future optional set:
- `xircle-care-data-vs-life-02.webp`
- `xircle-care-data-vs-life-03.webp`

## `/xircle/opportunity/`

| Priority | Filename | Ratio | Scene |
|---|---|---:|---|
| P1 | `xircle-opportunity-o0-intro.webp` | 16:9 | Signal intro |
| P1 | `xircle-opportunity-o1-signal.webp` | 4:3 | Sleep signal |
| P0 | `xircle-opportunity-o2-context.webp` | 3:2 | Real-life context reveal |
| P1 | `xircle-opportunity-o3-followup.webp` | 4:3 | Day 3 follow-up |
| P1 | `xircle-opportunity-o4-boundary.webp` | 4:3 | Professional boundary |
| P0 | `xircle-opportunity-o6-whitecat-reveal.webp` | 4:3 | First White Cat reveal |

## `/xircle/care/party/`

| Priority | Filename | Ratio | Mode |
|---|---|---:|---|
| P0 | `xircle-party-create-hero.webp` | 16:9 | CREATE |
| P0 | `xircle-party-join-hero.webp` | 16:9 | JOIN |

## `/xircle/learn/`

| Priority | Filename | Ratio |
|---|---|---:|
| P2 | `xircle-learn-hero.webp` | 16:9 |

## `/xircle/routinex/`

| Priority | Filename | Ratio |
|---|---|---:|
| P1 | `xircle-routinex-hero.webp` | 16:9 |

---

# First image batch — make these first

1. `xircle-s00-hook-hero.webp`
2. `xircle-s06-yesterday-visible.webp`
3. `xircle-s08-seeing-not-doing.webp`
4. `xircle-s09-connected-loop.webp`
5. `xircle-care-hero.webp`
6. `xircle-care-data-vs-life-01.webp`
7. `xircle-opportunity-o2-context.webp`
8. `xircle-opportunity-o6-whitecat-reveal.webp`
9. `xircle-party-create-hero.webp`
10. `xircle-party-join-hero.webp`

These 10 assets determine most of the perceived quality of the new experience.

# Production notes

- Prefer WebP, crisp enough for retina displays.
- Keep important subjects inside the center 70% safe area for mobile crop.
- Do not bake paragraphs/headlines into art.
- Preserve negative space for live HTML typography.
- White Cat must stay visually consistent across every image.
- Xircle scenes: digital, structured, airy.
- XTY scenes: notebook, warm cream paper, action-oriented.
- The Xircle → XTY bridge should visually feel like digital interface becoming a physical notebook world.
- Open any route with `?art=debug` to reveal art-slot filenames during asset QA.
