# XIRCLE interactive brand experience — validation

Updated 2026-11-09. This records implementation scope and required checks. It does not certify production deployment, current sales conditions, health outcomes, embedded video playback or an app installation.

## Current behavior

The root is a company experience that every X-VISOR can open with customers. Sleep, eating and movement choices change the order of a six-station map. Visitors can build an illustrative day, select devices, explore RoutineX ABCD and five Habix products, then follow official app downloads. The map and presentation share the active state. Back/Forward, reload, restart and direct station links are part of the journey.

The existing immersive `/routinex/absorb/` and `/routinex/build/` rooms receive explicit brand context and a bounded return to the map. Personal exits are replaced only within that context. C / Control remains behavior, FIVES remains a framework, and the knowledge room is labelled ห้องความรู้.

The official media library uses 10 locally catalogued clips from `@CloverXOfficial`, grouped into App, Band, Scale and HabiX + RoutineX. These are local queues. No remote player/thumbnail is requested until the visitor explicitly presses Play; close, queue and history changes remove the iframe. External YouTube links remain available.

WebGL2 is optional; reduced-motion, no-WebGL and no-JavaScript paths retain useful reference/download links. Fifty pages retain generated shared wayfinding; all 49 references remain directly accessible. No health-input form, personal booking, TeamBook handoff, new storage key or legacy record migration is introduced. The top-level `/maxage` is outside scope.

## Current execution status

The previous 15-contract / 113-layout audit at `c361bc4c` describes the superseded company scrolling implementation. It is historical evidence, not certification of this new interactive revision.

The implemented candidate passed 18 contracts, 21 portfolio/entry tests, 26 tour tests and the full browser suite with 134 layout checks plus interaction flows, zero page errors and zero failed local resources. A separate regression pass after the final scroll/history fixes confirmed visible mobile headings, focused browser-history restoration, `at` station persistence, media history and the contextual RoutineX return. Browser proof records HEAD, dirty files and timestamps; delivered clean-commit proof is retained outside the public repository, alongside the original working-tree reports. Portfolio screenshots are refreshed from the implemented experience.

The 134 layout checks comprise the original 112 public-route/reference combinations, 21 station/map combinations, and a mobile Habix check. The no-third-party-before-Play assertion applies to the new root/media library; older deep reference embeds are recorded separately and are not covered by that claim.

## Commands and expected scope

- `npm run check:xircle`: generated shared shell agrees across 50 pages.
- `npm run test:xircle`: entry/alias/company/privacy/reference contracts, official downloads, product taxonomy and bounded interactive state.
- `npm run test:xircle:journey`: six main destinations at 320/390/768/1440px and all 44 deep references at 390/1440px; branching route, sample collection/removal, moments, devices, all ABCD stages, five product choices, map/presentation, keyboard/Escape/focus, Back/Forward/reload/restart, contextual RoutineX return, official video filters/queues/lazy player/removal, knowledge states, legacy storage and no-JS/no-WebGL fallbacks.
- `npm run test:entry`: truthful roles, case data, generated portfolio, media budget and structural checks.
- `node tools/build-portfolio.mjs --check`, `node tools/build-sitemap.mjs --check`, `node tools/motion-pages.mjs --check`: generated outputs agree; XIRCLE owns its motion and is exempt from a second global engine.
- `npm run test:tour`: shared portfolio/house entry contracts.
- JavaScript syntax and `git diff --check`. There is no general repository lint command.

The local browser harness blocks external traffic and non-GET requests. It can verify creation/removal of the intended player and exact outbound URLs, but cannot certify real YouTube playback, app installation or purchase/account completion.

## Broader known limitations

The current broad `npm test` reports 190/210 passing and 20 failures outside this change (pet time budget, First Class, TeamBook/card contracts). All 20 ordered names, locations and first error lines were matched to untouched baseline `ecfb183b`; raw logs and comparison are outside the public repository. Do not report the broad suite as fully passing or assume a new run has the same result without checking.

The current broader motion suite has 5/6 passing, with one house-coverage failure listing four baseline links: Hamburg, RoutineX absorb, Airova and Mediral. Registry checks and XIRCLE motion ownership are separate checks. Preserve this limitation until a current result establishes otherwise; do not alter unrelated pages to silence it.

Safari, Firefox, physical phones and user research are not certified. Existing product claims were preserved, not reapproved. Store URLs were verified from official website HTML; a correct link does not prove installation. Video IDs/titles/official author were checked. A separate visible local Chrome check played the official Band-pairing tutorial `w31zX_f5iqI` and exposed Pause with 0:25 elapsed of 1:16. This proves one local playback observation, not all ten videos or uninterrupted embedded delivery.

## Reproduce locally

```sh
npm ci
npx playwright install chromium
npm run check:xircle
npm run test:entry
npm run test:xircle:journey
```

Use `XIRCLE_CHROME` for an installed Chromium executable and `XIRCLE_PROOF_DIR` for local report/screenshots (default `/tmp/xircle-journey-proof`). The browser report includes run time, HEAD, dirty files, runtime/browser version and final status. Bind delivered evidence to the tested revision; do not describe a working-tree run as a clean committed run.

The existing alias HTTP helper uses isolated Miniflare, which is not in the root lockfile:

```sh
npm install --prefix /tmp/myclover-xircle-tests miniflare@4.20260730.0
export FRONTDOOR_MINIFLARE=/tmp/myclover-xircle-tests/node_modules/miniflare/dist/src/index.js
npm run test:xircle
```

No merge, production promotion or protected-preview sharing link is authorized by this validation document.
