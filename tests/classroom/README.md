# Classroom browser checks

Run `npm run test:classroom` with Playwright and a Chromium browser available. Each test starts a local static preview, blocks external services, and substitutes only analytics/review API responses and the clipboard. These checks do not submit prompts to external AI products.

If Playwright or Chrome lives outside the project:

```sh
FRONTDOOR_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
FRONTDOOR_CHROME=/absolute/path/to/chrome \
npm run test:classroom
```

The scripts print the location of their JSON evidence and screenshots. Set `CLASSROOM_PROOF_DIR` to an existing output directory if a fixed location is needed.

- `first-paint.e2e.mjs`: cold loads of all six lessons at 390px and 1440px under 4x CPU slowdown. Captures early browser frames, checks that the final layout is the first visible lesson, and measures header/button stability. Holds optional analytics requests to confirm they cannot delay the lesson; JavaScript-disabled pages remain readable.
- `scroll.e2e.mjs`: opens lesson 5 from the classroom quest map, filters the 28-command deck, drags a card onto the floating wok dock, taps a combo, picks styles, copies (success and failure), uses smart search and a remix chip, reloads, and checks zero idle deck mutations on desktop and a throttled mobile viewport.
- `learning.e2e.mjs`: all six lesson starts, step navigation, reload/resume, explicit artifact confirmation, progress across lessons, and compact/mobile/desktop layout. Original header artwork and SVGs stay visible. Only optional explanations collapse; contextual links connect the three actions.
- `lesson12.e2e.mjs`: coherent Voice-to-Source instructions, example copying/download, image repair commands, and saved taste checks.
- `lesson34.e2e.mjs`: video readiness/playback, the actual video first frame loads near the viewport without an image poster or autoplay, repair prompts and saved checks; lesson 4 output planning and the mismatch exercise.
- `lesson56.e2e.mjs`: lesson 5 per-command drafts that survive remove/re-add, search, reload and clearing the wok, plus the video example preset; automatic lesson 6 takeover, immediate continuation, locked/unlocked passage, keyboard return, reduced motion, and the downloadable example.
- `notebook-images.e2e.mjs`: run directly with `node tests/classroom/notebook-images.e2e.mjs` (the same Playwright/Chrome overrides work). At 390px and 1440px, checks the first notebook image loads immediately, pages 3/4 start and finish during RESTORE, pages 5–10 remain lazy, the existing picture sources are reused without fallback downloads, and the original reveal timing and progress still work. Outputs request timing JSON and entry/effect/reveal screenshots. This local game-progress fixture checks scheduling; authentication and cache policies require the separate access/cache integration checks.

The course still records reading progress in `mc_learn` for the existing three-lesson boss invitation. The new `mc_course_journey_v1` records a learner's own confirmation that they made and checked an artifact; merely scrolling does not set it. Mission clears (`cleared`) are saved only when the learner presses a step's next-mission button, and XP/rank are derived from that saved work, never stored. Lesson 5 keeps its wok, styles and drafts in `mc_command_deck_v1`. Drafts and progress remain in the browser, not a server account.

The lesson pages embed shared scripts to work as standalone documents. When changing an embedded source asset, update its matching `data-self-contained` block — `node tools/classroom-inline-sync.mjs` copies `course-learning-journey.js`, `command-deck.js` and `sauce-reel.js` into every page (pass other names explicitly; some pages carry their own variant of other assets) and `--check` reports drift. The regression tests check source/inline parity for the scripts they cover.

`classroom-render.js` runs in the head before lesson content can paint. Inline lesson modules mount in document order; `course-learning-journey.js` sends `classroom:prepare` for final copy, builds the workflow/folds, then sends `classroom:decorate` for tooltips. After queued frame work finishes, the guard reveals the lesson and sends `classroom:ready`. Optional external scripts follow the journey. Keep header image dimensions in the HTML, keep layout during preparation, and do not add timed structural retries or make readiness depend on video, analytics, or decorative animation.
