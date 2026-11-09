# XIRCLE company experience — validation

Reviewed 2026-11-09. This records a repository implementation and local verification. It is not proof of production deployment, current promotional conditions, medical results or a purchase.

## Delivered behavior

The root is a company product introduction that X-VISORs can open with customers. Native scrolling changes a sticky product illustration through Sleep, Eat/Food AI, Move and Body. The page then explains App/Band/Scale, RoutineX and the White Cat knowledge room. The 7-topic presentation uses the same content, native dialog semantics, keyboard controls and browser history. Company links lead to the requested official login, never a personal appointment or external notebook.

WebGL2 point graphics are loaded independently after the core UI; they use no third-party graphics runtime. Missing WebGL, reduced motion, data-saving and JavaScript-disabled cases retain content and navigation. Device tabs enhance three existing HTML explanations; RoutineX and FAQ use native details.

All 50 active pages share generated static wayfinding. The 49 references remain direct-access. Knowledge search/category state stays in the URL, with result announcements and clear/reset states. No new storage key, health input, tracking endpoint, price or outcome claim is introduced. Existing legacy records are untouched; obsolete invitation parameters are ignored. The top-level `/maxage` page is unchanged.

## Commands and scope

- `npm run check:xircle`: shared static shell agrees across 50 pages.
- `npm run test:xircle`: company entry/alias/privacy/reference contracts, including retired personal engines and absence of personal/game/notebook handoffs.
- `npm run test:xircle:journey`: 6 main destinations at 320/390/768/1440px, all 44 deep documents at 390/1440px, sticky chapter sync, mobile title placement, article Back, 7-topic presentation, keyboard, Escape, Back/Forward, deep links/reload, device tabs, RoutineX, official links, storage preservation, knowledge search/filter/reset/Back, local document contents, no JavaScript and no WebGL.
- `npm run test:entry`: portfolio data, generated pages, truthful roles, media budget and structural checks.
- `node tools/build-portfolio.mjs --check` and `node tools/build-sitemap.mjs --check`: generated outputs agree.
- `node tools/motion-pages.mjs --check` and `npm run test:motion`: XIRCLE owns its native story motion and is explicitly exempt from a second global motion engine; the generated portfolio case keeps the shared layer.
- JavaScript syntax and `git diff --check` are checked. The repository has no general lint command.

The previous V3/Compass/game browser tests certified the retired personal-service journey. They are replaced by the current company contracts and browser flows, in accordance with the updated owner direction.

The broader `npm run test:motion` has one pre-existing house-coverage failure (the same 4 unrelated links: Hamburg, RoutineX absorb, Airova and Mediral), reproduced from the untouched baseline. Its other 5 checks pass; the registry `--check` and the XIRCLE-owned-motion assertion pass.

The broad `npm test` suite also runs. It has 20 existing failures outside this change (First Class/TeamBook/card/pet); all 20 failure names were reproduced on untouched baseline `ecfb183b` with the same dependencies/runtime. Logs and comparison are retained outside the public repository.

The final local company browser report passed all 113 layout checks and all interaction checks, with zero application errors or failed local resources. The company contract suite passed 15 tests and the portfolio source suite passed 21. A real local scrolling/presentation recording confirmed the WebGL2 renderer with no page errors. The revised portfolio listing/case was checked at 320/390/1440px.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run check:xircle
npm run test:entry
npm run test:xircle:journey
```

Use `XIRCLE_CHROME` for an installed Chromium executable and `XIRCLE_PROOF_DIR` for local PNGs/report JSON (default `/tmp/xircle-journey-proof`). The browser test starts its own static server and blocks external traffic and non-GET requests.

The HTTP alias tests use the existing Miniflare preview helper, which is not in the root lockfile. An isolated setup used for validation is:

```sh
npm install --prefix /tmp/myclover-xircle-tests miniflare@4.20260730.0
export FRONTDOOR_MINIFLARE=/tmp/myclover-xircle-tests/node_modules/miniflare/dist/src/index.js
npm run test:xircle
```

Validation used Node 26.8.2, pinned Playwright 1.63.0 and installed Chrome. Public portfolio WebPs are encoded from real browser PNGs; `work/media/xircle-provenance.json` records their source. Safari, Firefox, physical phones and user research were not tested. Existing product claims were preserved, not reapproved. No personal booking, merge or production promotion is part of this task.
