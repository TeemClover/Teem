# Eggcycle

Private mobile web app at `/eggcycle/`, installable on the home screen. Reuses the repository's Vercel functions, existing Postgres driver and admin environment. No additional application dependencies. Internet is required; the service worker never caches health data. Server data is shared across devices after password login.

## Run and verify

```sh
node --test tests/eggcycle/*.test.mjs
node tests/eggcycle/preview.mjs
```

Preview: `http://127.0.0.1:4197/eggcycle/`, password `LOCAL-DEMO`. Loopback only, memory storage, no external calls. Real server requires the existing root package dependencies.

## Production environment

Reuse `DATABASE_URL`. Password precedence: `EGGCYCLE_ADMIN_KEY`, `BACKOFFICE_ADMIN_KEY`, `MEDIRAL_ADMIN_KEY`, `MEET_ADMIN_KEY`. The first configured key wins; there is no built-in fallback password. Eggcycle uses its own signed HttpOnly, Secure, SameSite=Strict session scoped to its API, lasting 30 days. Changing the chosen password invalidates sessions. Logout clears this browser's cookie; it does not revoke a copied cookie on another device.

Optional `EGGCYCLE_INITIAL_PERIOD_START` is an ISO date for the first stored record. Set privately in the deployment environment; never commit personal dates. It only applies if the state row does not exist. Alternatively use the first-run form (defaults to yesterday in Bangkok). Default cycle 28 days, duration 5 days; both editable. Dates and notes remain in private database rows, never source files.

The app is opened manually. Eggcycle has no scheduled checks, Telegram integration, test-message action or notification delivery. Existing `/meet` Telegram credentials are unchanged and are not read by Eggcycle. Old notification settings in stored records are ignored and stripped on the next save.

Two namespaced tables are created additively by `api/_lib/eggcycle/store.js`: state and login rate limits. No existing app tables are altered. Any delivery table from an earlier version is left intact but unused. State writes compare revisions to prevent silent overwrites across devices. Private API responses are no-store. Dates and notes remain in the existing database; removing notifications does not reset records.

## Calendar interpretation

Period start/end records are actual observations. Unrecorded period duration, next period and ovulation are estimates. Day 1 is the period start; next start is start + configured cycle length; ovulation point is cycle day (length − 14), shown with a ±2-day illustration, not a confidence interval or proven personal error bound. For configured 26–32-day cycles with recent recorded intervals in that range, days 8–19 are marked higher pregnancy likelihood following the CDC Standard Days calendar window. Other days are labelled lower likelihood but still possible, never safe to have unprotected sex. Out-of-range cycles and overdue unconfirmed cycles do not receive lower-likelihood labels. Future expected periods use dotted outlines; the app never silently records a new cycle.

Sources: [CDC Standard Days Method](https://www.cdc.gov/contraception/hcp/usspr/standard-days-method.html), [NHS natural family planning](https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/).
