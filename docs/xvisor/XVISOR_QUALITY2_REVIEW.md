# X-VISOR QUEST — experience review, 10 September 2026

The work is in the `Teem` local checkout. This patch keeps the 1.0b save format,
economic rules, Month 12 qualification and Month 24 ending. It has not been
committed, pushed or deployed.

## Local and GitHub parity before this patch

Verified live with `git ls-remote origin HEAD refs/heads/main refs/heads/feat/adaptive-front-door-v1`:

| Checkout/reference | Commit | Relationship to current main |
| --- | --- | --- |
| GitHub `main` | `1984724c60fdf60f6374ec91fde33be531b8e272` | Live remote matches cached `origin/main` |
| `Teem`, `feat/adaptive-front-door-v1` | `fdadc4974964533de17f2217f065c28361417897` | 1 ahead, 3 behind across the repository |
| `Teem-assets`, `chore/asset-optimization` | `85f5b2ac13dae3757786403f514e90e40a72434b` | 2 behind across the repository |

All three references had the identical `xvisor` tree
`d0b4dd164c14b534ecba697d32390558e06e012b` and `api/xvisor-scores.js` blob
`d05135f511d5a7f4ddf0a03aaa653f75d6d3629b`. Both working copies initially had
no changes in those paths. The local Xvisor changes listed below now intentionally
differ from main. Other pending local work was left intact. This is repository
parity evidence. A limited public check also found that the deployed
`/xvisor/quest/game-ui.js` exactly matches main (blob
`ec6909ee9758b32829ed928e4db6ea8684b6423e`); the whole deployment was not compared.

## Fixed gameplay and experience issues

- Quick choices previously included ending the month while productive work and
  energy remained. Recommendations now filter current prerequisites and energy
  before ranking, retain distinct source/skill payloads and show varied categories.
- The first management visit explains that the three cards are recommendations.
  A persistent full-menu button and reopenable help make the extra choices visible.
  Acknowledgement is saved with the existing game state.
- Every campaign month-close entry point opens a review, including the quick card.
  It shows remaining energy, projected results and playable opportunities; the
  tutorial never advertises unavailable management actions. Year 2 retains its
  intentional one-action-per-month flow.
- A short input guard prevents a double click from selecting the next freshly
  rendered card. The latest outcome also appears beside the choices.
- People actions now check actual prerequisites. Day 28 customers can remeasure
  instead of receiving an ineffective care action; certification and reorder
  options respect readiness. Consultation energy display matches the reducer.
- Closing details restores page scrolling. Mobile HUD uses space more efficiently,
  text contrast is improved, and the keyboard skip link stays hidden for pointer use.
- The landing page recognises an existing save. High Score has an accessible name,
  request cancellation, a ten-second timeout and a retry action.

## Graphics, motion and sound

- Added room-specific colour, softer environmental light, character blinks, screen
  details and fading particles within the existing canvas renderer.
- Added clearer action hierarchy, tactile hover/press feedback and a finite guide
  pulse. Reduced motion stops walking, jumping, scans and celebration particles.
- Music has phrase rests and softer balance around effects. Muting, hiding the tab
  or disabling one channel clears scheduled voices, preventing stale rewards on
  resume. Audio failures remain optional and voice counts are bounded.

## Verification and local review

Final result: **47/47 automated tests passed**, **17/17 browser checks passed**,
no uncaught browser errors, and `git diff --check` passed for the changed scope.

Run `npm run test:xvisor` for the release, UI, recommendation and audio lifecycle
tests. `npm run test:xvisor:ui` runs the browser regressions against a local server
at `http://127.0.0.1:4186` by default. The browser runner uses its own context,
blocks API writes and does not change the user's browser save.

Browser runner options: `XVISOR_BASE_URL`, `XVISOR_PLAYWRIGHT` (package or absolute
module path), `XVISOR_CHROME` (optional executable), and `XVISOR_PROOF_DIR`.

Reviewed scenarios include first-use guidance and persistence, actual full-menu
actions, double clicks, early and exhausted-energy month closure, tutorial entry
into Month 2, Year 2, the Month 24 finale, NEW GAME+, and widths 320/390/768/1440.
The browser tests cover representative states rather than every possible strategy.
Audio lifecycle tests use a controlled AudioContext; native iPhone interruption
behaviour and subjective playback on speakers are not claimed as tested.

Use `/xvisor/quest/quality-preview.html` for a Month 2 preview with in-memory saves
and API writes disabled, or `/xvisor/` to play from the landing page. Review captures
and machine-readable results are saved under `/tmp/xvisor-quality2-proof/`.
