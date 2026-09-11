# Classroom browser checks

Run `npm run test:classroom` with Playwright and a Chromium browser available. Each test starts a local static preview, blocks external services, and substitutes only analytics/review API responses and the clipboard. These checks do not submit prompts to external AI products.

If Playwright or Chrome lives outside the project:

```sh
FRONTDOOR_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
FRONTDOOR_CHROME=/absolute/path/to/chrome \
npm run test:classroom
```

The scripts print the location of their JSON evidence and screenshots. Set `CLASSROOM_PROOF_DIR` to an existing output directory if a fixed location is needed.

- `scroll.e2e.mjs`: opens lesson 5 from the classroom, checks all 44 cards, customization, clipboard success/failure, search and zero idle card mutations on desktop and a throttled mobile viewport.
- `learning.e2e.mjs`: all six lesson starts, step navigation, reload/resume, explicit artifact confirmation, progress across lessons, and compact/mobile/desktop layout. Original header artwork and SVGs stay visible. Only optional explanations collapse; contextual links connect the three actions.
- `lesson12.e2e.mjs`: coherent Voice-to-Source instructions, example copying/download, image repair commands, and saved taste checks.
- `lesson34.e2e.mjs`: video readiness/playback, the actual video first frame loads near the viewport without an image poster or autoplay, repair prompts and saved checks; lesson 4 output planning and the mismatch exercise.
- `lesson56.e2e.mjs`: separate saved prompt drafts and resets; automatic lesson 6 takeover, immediate continuation, locked/unlocked passage, keyboard return, reduced motion, and the downloadable example.

The course still records reading progress in `mc_learn` for the existing three-lesson boss invitation. The new `mc_course_journey_v1` records a learner's own confirmation that they made and checked an artifact; merely scrolling does not set it. Drafts and progress remain in the browser, not a server account.

The lesson pages embed shared scripts to work as standalone documents. When changing an embedded source asset, update its matching `data-self-contained` block. The regression tests check source/inline parity for the scripts they cover.
