# X-VISOR QUEST 2.0 — Story Edition

Prepared locally on 10 September 2026. This supersedes the earlier 1.1 integration
notes. No independent game commit or push is performed by the X-VISOR task.

## Player experience

The player starts at `/xvisor/`, and plays or resumes at `/xvisor/quest/`.
The former public quality-preview URL redirects to the actual game. Fixtures,
test selectors and test saves remain in `tests/xvisor/`, outside player routes.

- Teem is the main guide to play, business and interpreting information. Ako
  appears at practical care moments. Each speaker keeps one identity in copy
  and portraits, including practice questions and loading fallbacks. Both mentors
  speak from outside the scene; they never appear as full-body world characters.
- Short dialogue teaches one concept at a time. Customer quotes remain theirs;
  quiz questions stay primary. The Month 2 guide can be hidden or reopened and
  folds automatically on entering Month 3, including old unacknowledged saves.
- The original illustrated rooms, people and props supply the entire game world.
  The user requested this visual direction back after trying pixel-art scenery.
  Cover-derived portraits remain in dialogue only. The unused pixel-background
  atlas and its runtime loader have been removed. Crisp interface controls and
  income graphs are retained for readability.
- Every game event has an explicit presentation decision. Short action scenes
  replace one another without delaying inputs; mobile offscreen actions have
  a temporary scene preview. Exams remain seated in one room during answering,
  next questions and repairs. Open House uses a solid stage and steps, with
  the audience seated on the floor level.
- Routine plans are chosen once. Behavior-only care creates no sale or automatic
  reorder. Fitted and prepared full plans can proceed directly; prerequisites
  are shown before selection. Old saved full plans and the “คุยแฟ้ม X”
  action advance to a real decision without returning to a duplicate chooser.
  Completed information checkpoints and event-created plans continue directly;
  fresh prospects still start with the normal information conversation.
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
`2.0-retention1`. Include every `xvisor/quest/game-*.js` file and the portrait asset
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

The results below record the previous `2.0-release1` checkpoint. Updated visual
reversal checks are recorded in the follow-up section.

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

## Illustrated-world follow-up

The user explicitly requested the code-drawn world back, with Teem/Ako appearing
only in dialogue portraits. This is a targeted visual follow-up to integrated
commit `041e91d15245574d1ad24ce56921cc859043e7e7`; gameplay, narrative, save,
score and economy contracts are preserved. The loader/CSS tag changes to
`2.0-illustrated1` so returning browsers receive the complete corrected graph.
No independent commit or push is performed by this task.

All **179 follow-up checks passed**: 119 unit/release tests, 31 experience checks,
13 Live/action/legacy-plan checks, 10 tutorial/story checks and 6 loading checks.
The world renders without image assets; automated checks cover the expected
number of actors in opening, Day 7, customer practice, exam, Live and Open House.
Browser checks confirm the removed pixel background is never requested and the
new module graph loads coherently, including warm-cache and retry scenarios.

Visual review confirmed the illustrated opening, Day 7 Ako portrait, seated exam,
solid Open House stage, Live studio and seated customer consultation. Proof is
in `/tmp/xvisor-illustrated-{loading,experience,scenes,storyflow}`. Each browser
test uses an isolated context with API writes intercepted. The player's existing
tab was reloaded and retained exam question 2 of 5 and its selected answer.
`git diff --check` passed. The Front Door owner confirmed `041e91d` remains a
local checkpoint; this follow-up does not imply game publication.

### Exam wall correction

The first visual review missed a real door/window overlap in the exam screenshot.
The exam room now shifts its window group 70 world units right and its first lamp
to x=220, leaving the left wall free for the existing entrance. The same layout
is used for entry, questions, repairs, summary and ceremony. The academy care and
leadership study panels also move to the clear wall at (139,39).

Runtime assets now use `2.0-illustrated2`. The 119 unit/release checks and 6 loading
checks passed after the exam change. A separate isolated browser review captured
desktop/mobile questions, open-door entry at two positions, repairs and summary;
the harness was corrected to request a render before capturing and the final run
had no browser errors. Images are in `/tmp/xvisor-exam-wall`, with loading results
in `/tmp/xvisor-exam-wall-loading`. This remains an uncommitted local correction.

### Offer checkpoint correction

The Open House / Good Luck shortcut created a ready recommendation and Routine
plan without recording its information checkpoint. The later offer guard treated
the initial `consent:false` default as a refusal and bounced the player back to
discovery. High People skill made this broken shortcut occur more often.

The event now completes the information conversation when creating a ready plan.
Historical baseline/recommendation flags are repaired without awarding energy,
trust, XP or revenue. Saves already bounced by the old guard recover their saved
plan and offer action. Fresh discovery still has its ordinary information action;
acceptance odds, refusal cooldowns, prices and receipt accounting remain unchanged.
Direct-offer buttons, quick cards, scene copy and Live now use “คุยแฟ้ม X” again.

All **188 checks passed** on `2.0-offer1`: 122 unit/release checks, 19 Live/offer/
legacy-save browser checks, 31 experience checks, 10 story-flow checks and 6
loading checks. The browser regressions cover a real high-skill Open House route,
stale false flags, already-bounced saves and one-click decisions at 1440, 390 and
320px. API writes were intercepted in isolated contexts. Proof is under
`/tmp/xvisor-offer-{scenes,experience,story,loading}`. This checkpoint was
subsequently published in `8792cae7` and verified on the public game.

## Personal sales and returning customers — 2.0-retention1

Personal RoutineX purchases now show the customer's portrait, their choice to
start or return, and the actual marginal income from that transaction. The short
result sits by the next actions; a three-second toast also makes it visible on
small screens. Detailed receipts remain available on demand. A deferred purchase
shows a conversation rather than a delivery or a sale reward. Live retains its
existing group result.

Months 2–12 evaluate the existing paid personal customer base when the month
opens. Trust, adherence, satisfaction, care experience and recent follow-up
increase the chance of an independent repeat purchase. Outcomes are stable for
the same run, customer and month. Some customers hesitate or pause; one direct
follow-up can bring them back, while a refusal leaves room to reconnect in a
later month. Care-only plans do not become purchases, and people who are already
team members are excluded from the personal renewal batch.

The opening card records the actual initial counts and income. It folds after
the next action and remains available for review. Its next-person link advances
past customers already contacted. XOS and the People “ซื้อซ้ำ / พัก” filter expose
the same actionable customers as the engine. Month-opening snapshots stay fixed
as the player works; later personal purchases appear in their own result and in
the month's actual totals.

The existing prices, income tiers, monthly settlements, Year 2 organization
simulation, save key/schema and 1.0b high-score namespace are retained. Existing
saves acquire renewal decisions at their next month opening; loading a save
does not reroll a decision or bill a customer. The entire module import map and
stylesheet use the same `2.0-retention1` cache key.

Verification: **213 checks passed** — 142 unit/release checks, 15 new browser
purchase/renewal/care checks, 31 experience checks, 19 Live/Open House/legacy
offer checks, and 6 loading checks. Browser checks use isolated saves and block
API writes; new results fit 1440, 390 and 320px, including reduced motion.
Proof: `/tmp/xvisor-retention-proof`, `/tmp/xvisor-retention-regression`,
`/tmp/xvisor-retention-v2-scenes`, and `/tmp/xvisor-retention-loading`.
