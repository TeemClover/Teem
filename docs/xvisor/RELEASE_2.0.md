# X-VISOR QUEST 2.0 — Story Edition

Prepared locally on 10 September 2026. This supersedes the earlier 1.1 integration
notes. No independent game commit or push is performed by the X-VISOR task.

## Player experience

The player starts at `/xvisor/`, and plays or resumes at `/xvisor/quest/`.
The former public quality-preview URL redirects to the actual game. Fixtures,
test selectors and test saves remain in `tests/xvisor/`, outside player routes.

- Teem is the main guide to play, business and interpreting information. Ako
  appears at practical care moments. Each speaker shares one identity in copy,
  portraits and scenes, including practice questions and loading fallbacks.
- Short dialogue teaches one concept at a time. Customer quotes remain theirs;
  quiz questions stay primary. The Month 2 guide can be hidden or reopened and
  folds automatically on entering Month 3, including old unacknowledged saves.
- Cover-derived pixel art supplies both mentors and four environments: home
  office, kitchen, creator studio and garden. Existing code-drawn people and
  props keep their poses, with warmer shading. Crisp interface controls and
  income graphs are retained for readability.
- Every game event has an explicit presentation decision. Short action scenes
  replace one another without delaying inputs; mobile offscreen actions have
  a temporary scene preview. Exams remain seated in one room during answering,
  next questions and repairs. Open House uses a solid stage and steps, with
  the audience seated on the floor level.
- Routine plans are chosen once. Behavior-only care creates no sale or automatic
  reorder. Fitted and prepared full plans can proceed directly; prerequisites
  are shown before selection. Old saved full plans and the former “คุยแฟ้ม X”
  action advance to a real decision without returning to a duplicate chooser.
  Explicitly missing permission still needs to be obtained.
- Two content sessions and appropriate skills unlock Live. One Live per month
  costs two energy and talks with up to three ready, consenting prospects.
  Decisions, refusals, receipts and income are tracked individually. A new
  customer still starts at Day 0. Completion is safe across reloads and cannot
  award the same results twice. Ready Live sessions appear in Quick 3.
- Each run schedules up to four optional encounters from eight contextual
  types. The run seed, offered events and choices persist; a run does not repeat
  encounters or show the whole pool. Two short choices have small disclosed
  effects; skipping is always available. Narrative variations stay stable on
  rerender and differ across seeds.
- Actual month-end growth and all three income channels remain comparable
  across Months 1–24. Live outcomes expose individual receipts on request,
  without automatically covering the game with a dialog.

## Data and release contracts

Display version is `2.0`; the complete runtime import map and CSS use
`2.0-release1`. Include every `xvisor/quest/game-*.js` file and both new assets
when integrating. Browser module filenames remain canonical.

Keep `SAVE_KEY = xvisorQuestContinueV4`, save schema 6, `SCORE_VERSION = 1.0b`
and `mc_xvisor_1b_score_sent:` markers. No leaderboard reset, score-row cleanup,
database reset or browser-storage deletion is part of this release. Old saves
gain stable story fields on load. Scores are still posted to the existing board.

Receipt tier metadata is serializable again, and receipts use the same manual
XGEN examination policy as the income display. Commercial prices, XV and
commission formulas were not replaced with invented product-specific prices.

## Integration scope

Integrate `xvisor/index.html`, `xvisor/quest/**`, `tests/xvisor/**`,
`docs/xvisor/**`, the score-retention change in `api/xvisor-scores.js`, the seven
`test:xvisor*` package scripts and `.github/workflows/xvisor-1.0-release.yml`.
Include the recorded removals of tests and documentation from the old public
quest directory. Preserve all Front Door/Ako and other package scripts.
Vercel excludes test/doc directories, and Front Door's host middleware blocks
those paths. Developer fixtures additionally restrict initialization to localhost.

See [art sources and prompts](ART_2.0.md) and [test commands](../../tests/xvisor/README.md).

## Verification

All **196 checks passed**: 118 unit/release tests, 31 experience checks,
13 Live/action/legacy-plan checks, 10 full tutorial/story checks, 6 loading
checks, 7 income-layout checks and 11 entry/resume checks. Browser contexts
were isolated and API writes were intercepted; no real score was submitted.

Proof directories:

- `/tmp/xvisor-v2-experience/`: Open House stage, classroom, all 24-month paths,
  responsive reports, Month 3 guide folding and score-dialog behavior.
- `/tmp/xvisor-v2-scenes/`: desktop/390px/320px Live, individual receipts,
  offscreen action previews and the old “คุยแฟ้ม X” saved-plan recovery.
- `/tmp/xvisor-v2-storyflow/`: actual tutorial/practice/exam interactions,
  Day 7 Ako, all plan routes and optional encounters.
- `/tmp/xvisor-v2-loading/`: complete `2.0-release1` graph, stale-cache poison,
  dependency failure/retry and preserved saved progress.
- `/tmp/xvisor-v2-income/` and `/tmp/xvisor-v2-entry/`: three visible income
  channels, Month 1–24 comparisons, genuine entry actions and resume behavior.

Syntax and `git diff --check` passed. The user's actual in-app tab was reloaded
at `/xvisor/quest/` and confirmed to show the 2.0 player surface, Team dialogue,
rendered artwork and an enabled start action. No fixture was installed there.

The shared branch is `feat/adaptive-front-door-v1`; at verification, HEAD and
origin/main both pointed to `e883290fa5f7132fdd71e125edba84b6b0b191bd` before
these uncommitted game changes. No live deployment is implied by local
verification. The Front Door owner must integrate the complete graph together
and report its eventual game commit, push and live verification separately.
