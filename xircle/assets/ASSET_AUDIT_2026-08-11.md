# Xircle Visual Asset Audit — 2026-08-11

## Root cause of the broken imagery

The previously committed `xircle/assets/campaign/campaign-atlas.jpg` is invalid for the intended atlas. GitHub reports the file as only 11,431 bytes. The runtime was slicing this file as seven full campaign images, therefore the visual layer could not work reliably.

**Decision:** retire the old atlas implementation. Do not wire pages to `campaign-atlas.jpg` again.

## Canonical visual sources reviewed

### Xircle revised 4.1 — 2-page brochure
High-resolution source contains these distinct visual panels:

1. X-VISOR before / after
2. Xircle The Habit Tracker app
3. Community / Your Xircle
4. Hand-held Xircle app
5. Daily routine
6. Band + Scale + App ecosystem
7. MaxAge canonical persona
8. Body Composition + Trend
9. Eat / Move / Sleep dashboard
10. MaxAge dashboard

Canonical MaxAge persona in this source is:
- Actual Age 46
- Bio Age 48.2
- MaxAge™ 78.4

### RoutineX brochure — 8 pages
Useful visual assets extracted/reviewed:

1. RoutineX 28-Day box / daily pack
2. Body Composition guide with Xircle Scale + Band + App
3. Eat · Move · Sleep nutrition / habit guide
4. ABCD + Protein HMB+
5. G.U.S.+ product visual
6. AstaMega+ product visual
7. Vita Matrix product visual
8. RoutineX system / package overview

## Campaign image QA

### Approved campaign visuals
- Xircle app hero
- Habit Score / Eat Move Sleep
- Band + Scale hardware
- Community
- RoutineX daily journey

### Rejected as canonical
- Generated Body Composition image: contains outdated/incorrect `BODY SCORE` wording. Use exact source-derived Body Composition visual instead.
- Generated MaxAge image: shows Actual Age 38. Current canonical persona is Actual Age 46 / Bio Age 48.2 / MaxAge™ 78.4. Use exact source-derived MaxAge visual instead.

## Complete working set required by the web

### Core / Xircle
- Hero
- Habit Score
- Hardware
- Body Composition
- MaxAge™
- Community
- Daily Routine
- X-VISOR
- App dashboard variants

### Habix / RoutineX
- RoutineX box
- ABCD
- Protein HMB+
- G.U.S.+
- AstaMega+
- Vita Matrix
- Eat Move Sleep guide
- RoutineX system overview

## Known gaps in supplied visual source

1. **Flavor+ dedicated final product photography** — current certification names are not fully resolved across source versions, so final Flavor+ product art must not be fabricated as canonical yet.
2. **Production XOS UI screenshots** — the supplied XOS DOCX provides feature/story information but no usable rendered production screenshots through the current source package. Use designed UI illustration only if clearly presented as conceptual, not as a screenshot of the real product.

## Asset policy going forward

- Every asset used by `/xircle/*` must have a stable absolute `/xircle/assets/...` path.
- Never point critical visuals at a generated atlas unless the repository file has been verified for correct binary size and decoded dimensions.
- Canonical data visuals beat generated visuals when text/numbers are visible.
- Body Composition and MaxAge pages must use source-derived canonical images.
- Do not embed obsolete claim language from a brochure into customer-facing copy merely because it appears inside a source image; source images can be used as visual/reference material while page copy follows the current certification/source-of-truth rules.
