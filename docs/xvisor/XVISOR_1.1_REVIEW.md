# X-VISOR QUEST 1.1 — Growth Edition

Local review, 10 September 2026. Builds on `XVISOR_QUALITY2_REVIEW.md`.
This patch is in the `Teem` checkout; it has not been pushed or deployed.

## Experience and visual changes

- Replaced the shared canvas characters with smooth illustrated people: curved
  arms and hands, seated and standing postures, faces, clothing and wristwear.
  The band follows the wrist transform and stays equipped after Day 0 in both
  ordinary and reduced-motion modes.
- Refreshed the opening room, customer work, classroom, The Xircle camp,
  organization, travel and finale scenes. Office furnishings now reflect actual
  customer, repeat-customer and team progress. Canvas resolution is 1536×864
  over the existing 384×216 world coordinates.
- Updated the game surface to softer teal/cream panels, readable controls,
  responsive reports and smooth scene transitions. Travel cards leave the
  destination landmark visible. Motion preferences remain respected.
- Meetings and events now complete in approximately 0.85–1.2 seconds. The
  Xircle has an explicit running state, displays its scene before rewards, locks
  competing actions, survives reloading and grants the existing reward once.
- The previous Quick 3 fixes and first-use explanation remain, including the
  full action menu and review before deliberately closing a campaign month.
- Retains the sound improvements from the preceding review: balanced music,
  distinct event feedback, correct mute/resume and bounded active voices.

## Monthly growth and income

Every new closed month records its actual settled income and available growth
snapshot. The closing board shows income, TGV, customers who reordered, active
customers and team size, with changes against the previous month. Income is
broken into the three existing channels.

The income button and new `ประวัติ 24 เดือน` button open a 24-month journey.
Completed months can be selected from the income bars or dropdown; a second
selector chooses the comparison month. Expandable details expose each channel
and all monthly records. Changes preserve reading position and expanded
comparison state, and a sticky close button remains accessible in long reports.

Year 2 leads with its growth summary and folds activity movements into an
expandable report. Grid columns shrink and wrap correctly on narrow screens.
The Year 1 and Year 2 customer/team scopes are explicitly identified; changes
between incompatible scopes are not presented as comparable percentages.

Historical settled values take priority over projections, including zero.
Missing older customer snapshots remain marked as unrecorded; this update does
not invent those values or backfill nonexistent historical records.

## High Score and save retention

- Display/release version is `1.1`.
- `V1_SAVE_VERSION`, `V1_SCORE_VERSION` and API `SCORE_VERSION` remain `1.0b`.
- Continue-save key remains `xvisorQuestContinueV4`; score-sent keys are unchanged.
- Removed the score API's startup cutoff deletion. No reset, deletion or new
  leaderboard namespace is introduced by this release.
- A delayed score response now updates only the current campaign gate for the
  same run; it cannot replace an open income history. A reopened gate recovers
  its retry control after failure.
- The compensation rules, Month 12 qualification and Month 24 ending remain.

## Verification

Final result: **64/64 unit checks and 29/29 browser scenarios passed**. No uncaught
browser errors. Changed-scope `git diff --check` and runtime syntax checks passed.

Run `npm run test:xvisor` for engine, release, recommendation, growth, UI,
audio lifecycle and mocked score-retention checks. Run `npm run test:xvisor:ui`
against the local HTTP server for isolated browser regressions. Configuration
options are documented in the preceding quality review.

Browser verification includes real event dispatch/completion, early closing,
Month 2 guidance, score-request races, exact posted Month 1 versus Month 24
comparisons, save/reload recovery, Month 12/24 transitions and NEW GAME+.
Expanded Year 2 reports and history controls are checked at 320, 390, 768 and
1440 pixels, including nested-content overflow rather than page width alone.

The isolated preview uses `makeReviewFixtures()` from the QA-only
`game-review-fixtures.mjs`. These explicitly labelled sample states are never
imported by the production game. Its saves live in an in-memory replacement
and its API writes are disabled. Browser tests also use a separate browser
context and intercepted API responses; no real scores or player saves are used.

Proof and scene captures: `/tmp/xvisor-1.1-proof/`.
Preview: `http://127.0.0.1:4186/xvisor/quest/quality-preview.html?release=1.1`.

Native iPhone audio interruption and subjective playback through real speakers
were not tested. Automated audio checks use a controlled AudioContext.

## Repository comparison

The earlier live remote audit found identical X-VISOR source in `Teem`,
`Teem-assets` and GitHub main before these local changes, although their overall
repository commits differed. Commit and blob evidence is retained in
`XVISOR_QUALITY2_REVIEW.md`. Version 1.1 now intentionally differs locally;
that audit is not a claim that the public deployment already contains 1.1.

## Loading correction after testing an existing browser session

The user's existing in-app browser exposed a mixed-version dependency graph:
`game-panels.js` requested `getMonthComparison`, but the cached unversioned
`game-presentation.js` did not export it. The prior fresh Chromium runs did not
exercise this warm-cache case. The default HTML shell consequently remained
visible with an empty canvas and PRE-SEASON values.

Both the game shell and the preview now install an import map before any module
runs. Every runtime module, including transitive dependencies, resolves to the
same `1.1-loadfix1` tag. The preview additionally versions its fixture module
and fetches the game shell with `cache: 'no-store'`. Keep both maps and the entry
script/CSS tag aligned when releasing another code change; the unit test checks
the entire map instead of just the entry filename.

`game-boot.js` catches dependency/startup failures, displays a retry button and
leaves storage untouched. The preview only announces readiness after its iframe
has actually booted. Reloading the user's originally failing in-app tab now
shows Month 8, the illustrated office/characters, working actions and the
expected fixture values without clearing browser data.

`npm run test:xvisor:loading` specifically poisons unversioned dependencies,
checks both document/module graphs, compares history, preserves the parent
save, and simulates a failed versioned import followed by retry recovery.
Captures and request evidence: `/tmp/xvisor-loading-proof/`.

After the loading fix: **64/64 unit checks, 29/29 experience scenarios and
6/6 loading regressions passed**. The loading harness recorded zero unversioned
requests, zero release-tag mismatches and zero uncaught browser errors.

## Character anatomy and income comparison refinement

The income dialog now leads with three always-visible cards for channels
① customer work, ② Direct G1 and ③ Organization. On landscape widths they sit
side by side, with the chosen month's amount, comparison baseline and actual
difference. A separate subtotal shows the contribution from ②+③. The copy
explains each channel's rate/eligibility; it does not attribute every change
between months solely to a promotion.

Monthly rows are ordered from Month 1 to Month 24 and expose all three amounts
and the total before expansion. Column headings stay available while scrolling.
Expanded rows retain the supporting TGV/customer/team detail; the income graph
and additional growth metrics can also be opened. Missing legacy channel data
remains unknown. First-positive channel labels describe the first recorded
income, not an invented certification date.

`npm run test:xvisor:income` checks landscape and portrait geometry, all closed
rows, exact comparison and additional-channel amounts, plus legacy missing
values. Dedicated income captures are in `/tmp/xvisor-income-layout-proof/`.
The isolated preview also provides seated Routine, consultation and classroom
fixtures for character review.

Long hair now uses separate side locks behind the neck and collar instead of a
solid shape beneath the chin. Seated characters have two bent legs and feet,
with chair seats, backs and legs anchored to the same hip geometry. Routine,
consultation and classroom scenes were inspected, including a same-fixture
before/after capture. Wristbands remain attached to the characters' arms.

The final runtime, stylesheet and preview fixture cache tag is `1.1-refine1`.
After this refinement, **64/64 unit checks, 29/29 experience scenarios,
6/6 loading regressions and 7/7 income layout checks passed**. The original
in-app browser was reloaded and visually checked for seated anatomy and the
three-column income comparison. Existing save and high-score keys are retained.
