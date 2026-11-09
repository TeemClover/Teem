# XIRCLE journey — implementation and verification

Reviewed 2026-11-09. This is a repository implementation and local verification record. It does not certify a production deployment, health claim, medical result, appointment, game completion or X-VISOR qualification.

## Scope

The opening now explains three ways to start: try a fictional day, read a question, or explicitly choose the existing Meet appointment route. A shared static shell connects the root and 49 references. The V3 day, seven-night example and context variants remain the only story engine. The same artwork, product/article data, source warnings and legacy invitation adapter remain.

`journey.css` / `journey.js` own shared layout and navigation. `knowledge.js` owns search/filter URL state. `build/journey-shell.mjs` generates the static header, breadcrumbs and footer; its check is idempotent. No new storage key or backend endpoint is introduced. The visited-step strip uses in-memory state only.

The requested acquisition aliases point to `https://buy.xircle.health/login?ref=O5F3LN` in Vercel; the standalone `/invite/` fallback agrees. This does not replace the main Meet CTA. The top-level `/maxage` sleep-kit page is unchanged. The 44 deep documents retain their content; their generic old build-zone banner is hidden, with source/status details still accessible.

The portfolio adds `/work/xircle/` through `work/cases.json` and the existing generator. Its role repeats the published myClover role from `/resume/`; it adds no title or outcome claim. Four WebP files come from real local browser PNGs; see `work/media/xircle-provenance.json`.

## Checks

- `npm run check:xircle`: static shell matches across all 50 pages.
- `node tools/build-portfolio.mjs --check`: generated portfolio pages match their JSON.
- `node tools/build-sitemap.mjs --check`: sitemap matches its source.
- `npm run test:xircle`: 24 route, privacy, alias and reference-access checks pass with the local Miniflare dependency configured.
- `npm run test:entry`: 21 portfolio, structure and source checks pass.
- `npm run test:xircle:journey`: all 6 main destinations at 320/390/768/1440px; all 44 deep documents at 390/1440px; keyboard skip/menu/Tab/Escape; all day actions; visited-step editing; three context variants; Meet/back/refresh/restart; search/filter/no-results/reset/article Back; local document anchors; no-JavaScript opening and menu. The report records 113 layout checks, no page errors and no failed local assets.
- `npm run test:xircle:xvisor`: 320/390/1440px story, optional game, knowledge/search/article, appointment returns, malformed handoffs and blocked storage pass. No API/write attempts, app errors or HTTP failures.
- `npm run test:xircle:compass`: retained story/Compass/legacy-entry/appointment/storage checks pass. The proof separately records Chromium's exact native `ViewTransition opt-in disabled` cancellation messages during rapid navigation; application errors remain a failing condition. Transient photo phases are observed by MutationObserver so screenshot duration cannot race the 530ms docking state.
- New portfolio listing, case, lazy-loaded screenshots, Xircle click-through and Back were inspected at 320/390/1440px. Browser screenshots were reviewed on desktop and mobile.
- JavaScript syntax checks and `git diff --check` pass. The repository defines no general lint command.

The broad `npm test` suite is also run. It reports 190/210 passing, with 20 failures in existing First Class/TeamBook/card/pet checks outside this change. All 20 failure names were reproduced on untouched baseline `ecfb183b` using the same dependencies and runtime. The comparison and logs are retained with delivery evidence; these areas are not changed as part of the XIRCLE upgrade.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run check:xircle
npm run test:entry
npm run test:xircle:journey
```

`XIRCLE_CHROME` selects an installed Chromium executable; `XIRCLE_PROOF_DIR` selects the screenshot/report directory (default `/tmp/xircle-journey-proof`). This browser suite starts its own static server and blocks external requests and all non-GET traffic.

The older route/browser suites require Miniflare separately from the root lockfile. The validation environment used Miniflare `4.20260730.0`, Node `26.8.2`, the pinned Playwright `1.63.0`, and installed Google Chrome. One isolated setup is:

```sh
npm install --prefix /tmp/myclover-xircle-tests miniflare@4.20260730.0
export FRONTDOOR_MINIFLARE=/tmp/myclover-xircle-tests/node_modules/miniflare/dist/src/index.js
export FRONTDOOR_PLAYWRIGHT="$PWD/node_modules/playwright/index.mjs"
# Set FRONTDOOR_CHROME to an installed Chrome executable, if not using Playwright's browser.
npm run test:xircle
npm run test:xircle:compass
npm run test:xircle:xvisor
```

## Limits

Chromium was tested locally. Safari, Firefox, physical phones and user research were not run. No live booking, registration, external notebook write, merge or production deployment was performed. Existing medical/product content was preserved, not reapproved or newly verified. Local proof and original PNGs are delivered outside the public repository.
