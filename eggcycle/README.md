# Eggcycle

Private mobile web app at `/eggcycle/`, installable on the home screen. Reuses the repository's Vercel functions, existing Postgres driver and admin environment. No additional application dependencies. Internet is required; the service worker never caches health data. Server data is shared across devices after password login.

## Run and verify

```sh
node --test tests/eggcycle/*.test.mjs
node tests/eggcycle/preview.mjs
```

Preview: `http://127.0.0.1:4197/eggcycle/`, password `LOCAL-DEMO`. Loopback only, memory storage, no actual Telegram calls. Real server requires the existing root package dependencies.

## Production environment

Reuse `DATABASE_URL` and `CRON_SECRET`. Password precedence: `EGGCYCLE_ADMIN_KEY`, `BACKOFFICE_ADMIN_KEY`, `MEDIRAL_ADMIN_KEY`, `MEET_ADMIN_KEY`. The first configured key wins; there is no built-in fallback password. Eggcycle uses its own signed HttpOnly, Secure, SameSite=Strict session scoped to its API, lasting 30 days. Changing the chosen password invalidates sessions. Logout clears this browser's cookie; it does not revoke a copied cookie on another device.

Telegram precedence: dedicated `EGGCYCLE_TELEGRAM_BOT_TOKEN` / `EGGCYCLE_TELEGRAM_CHAT_ID`, then existing `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`. Set `EGGCYCLE_APP_URL` to the HTTPS production URL if different from `https://www.myclover.com/eggcycle/`. Choose the intended private recipient in env, send a test from settings, then enable notifications. Notifications default off and content defaults generic. No webhook is needed and the existing bot's webhook is never changed. Previews cannot send to Telegram.

Optional `EGGCYCLE_INITIAL_PERIOD_START` is an ISO date for the first stored record. Set privately in the deployment environment; never commit personal dates. It only applies if the state row does not exist. Alternatively use the first-run form (defaults to yesterday in Bangkok). Default cycle 28 days, duration 5 days; both editable. Dates and notes remain in private database rows, never source files.

The Vercel hourly cron invokes `/api/eggcycle?action=cron`. It sends eligible reminders at or after the selected Bangkok hour and retries failed sends on later runs in the same day. Successful event IDs prevent ordinary cron duplicates. The remote Telegram call and database commit cannot be atomic: an interruption after delivery but before commit may cause a duplicate. Days missed entirely do not generate a backlog. Free/Hobby cron restrictions may require an appropriate existing plan or an external hourly scheduler with the same bearer secret. Production status must be verified after deploying; a local preview does not activate cron.

The three namespaced tables are created additively by `api/_lib/eggcycle/store.js`: state, login rate limits, notification delivery records. No existing app tables are altered. State writes compare revisions to prevent silent overwrites across devices. Private API responses are no-store. The database is the source of truth; it needs the same backup protection as other private app records. Generic app assets contain no personal data.

## Calendar interpretation

Period start/end records are actual observations. Unrecorded period duration, next period and ovulation are estimates. Day 1 is the period start; next start is start + configured cycle length; ovulation point is cycle day (length − 14), shown with a ±2-day illustration, not a confidence interval or proven personal error bound. For configured 26–32-day cycles with recent recorded intervals in that range, days 8–19 are marked higher pregnancy likelihood following the CDC Standard Days calendar window. Other days are labelled lower likelihood but still possible, never safe to have unprotected sex. Out-of-range cycles and overdue unconfirmed cycles do not receive lower-likelihood labels. Future expected periods use dotted outlines; the app never silently records a new cycle.

Sources: [CDC Standard Days Method](https://www.cdc.gov/contraception/hcp/usspr/standard-days-method.html), [NHS natural family planning](https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/), [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage), [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
