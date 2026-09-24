# House statistics

Scope: `/showcase/house/`; dashboard `/showcase/house/stat/`; same-origin API `/api/house-stats`.

## Architecture

- `showcase/house/app/analytics-contract.js`: bounded vocabulary, attribution labels and active-time clock.
- `app/analytics.js`: small nonblocking collector. Cumulative page-visit snapshots, 15-second heartbeat only when changed, debounced interaction flush, pagehide/visibility/course-click beacon. Three failed requests stop the collector. No external analytics SDK.
- `app/main.js` and `onboarding.js`: existing semantic state transitions and readiness/outcome hooks. No model/camera geometry changes.
- `api/_lib/house-stats.js`: independently initialized PostgreSQL tables using the existing DATABASE_URL. Monotonic sequence guards and visitor ownership prevent duplicate/out-of-order snapshots overwriting a newer visit. Read aggregation in SQL, Bangkok calendar-day ranges, 180-day visit retention. Rotating IP-hash anti-abuse bucket expires after two hours; no IP in visit records.
- `api/house-stats.js`: GET requires the existing `mc_backoffice_session`; POST checks origin, body size, known fields and counters, privacy signals, bot UA and rate limits. Owner sessions are excluded. Reuses the existing `/api/backoffice-auth` and password configuration, no new password.
- `stat/`: static login shell plus authenticated report rendering; no private statistics in HTML or shared caches.

## Measurement definitions

- Unique visitors are anonymous random browser IDs (180-day expiry), hashed before storage, not verified people. No storage means per-page identity.
- A visit is one page open/reload, not a 30-minute session. Daily unique counts are not additive across dates.
- Active time accrues while visible, for at most 30 seconds after interaction; hiding pauses immediately. An engaged visit has a feature use and at least 10 active seconds.
- Exposure means a visible/unobscured control observed in the viewport, sampled once a second. Actual use also proves exposure. It does not prove a person noticed the control. Per-feature denominators are visits, not click totals.
- Course conversion counts an actual outgoing course-link click, not opening the learn dialog, arrival confirmation or enrollment.
- Direct links and tour-driven room selection are not manual room choices. UI controls and canvas room picks share the same reducer instrumentation.
- Acquisition stores referring hostname and allowlisted UTM labels only, not full URLs, text, coordinates, screenshots or typed data. DNT/GPC and an owner browser opt-out are honored.
- No data is backfilled. Chart blanks/zeros before collection are not evidence of no historical visitors. Report shows first retained visit date.

## Verification

Run locked root dependencies with `npm ci`, then:

```sh
npm run test:house-stats
npm --prefix showcase/house run build
npm --prefix showcase/house test
npm --prefix showcase/house run typecheck
npm --prefix showcase/house run validate:house
npm --prefix showcase/house run audit:public
```

For the SQL integration test and isolated preview, install `@electric-sql/pglite` in a temporary directory outside the project, then point `HOUSE_PGLITE_MODULE` to its `dist/index.js`:

```sh
HOUSE_PGLITE_MODULE=/temporary/path/node_modules/@electric-sql/pglite/dist/index.js node tests/house-stats/postgres.mjs
HOUSE_PGLITE_MODULE=/temporary/path/node_modules/@electric-sql/pglite/dist/index.js node tests/house-stats/preview.mjs
```

The fixture runs on 127.0.0.1:4326, uses in-memory PostgreSQL and a clearly labeled test login. `/__seed` creates local sample charts; `/__inspect` exposes only the local test records. All fixtures/tests are excluded by `.vercelignore`. Never point the fixture at production.

Manual browser checks performed for this release: real SD/HD, room, wall, plan/photo, learn/course interactions recorded once; login failure/success, range filtering, logout protection, authenticated owner exclusion; no horizontal overflow at 1440×1000, 390×844, 360×800 and 844×390. Screenshots in the ignored `showcase/house/reports/screenshots/` folder use labeled local QA data.
