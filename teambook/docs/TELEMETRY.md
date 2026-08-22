# TeamBook behavior telemetry contract

TeamBook owns its analytics. The myClover Command Center must not query this database or copy these credentials.

## Purpose

Collect the minimum first-party signals needed to answer:

- Which pages are opened and actually read?
- How many people are active now, daily, and weekly?
- Who returns for another session?
- Which identified TeamBook people send messages and sign/commit, and how often?
- Where does the product lose attention before the first useful action?
- What should the TeamBook House Command pay attention to next?

Collection starts from the first production deploy of this system, including the zero-user baseline.

## Identity

- Anonymous visitors get a random first-party `teambook_visitor` HttpOnly cookie.
- Sessions use a 30-minute first-party `teambook_analytics_session` HttpOnly cookie.
- If a TeamBook account session exists, telemetry is linked server-side to `account:<id>`.
- If the browser has a valid local TeamBook profile but no account, the client may send only its internal profile id and the server records `local:<id>`.
- No fingerprinting is used.

## Events

The browser automatically sends:

- `PAGE_VIEW` — one event when a built TeamBook page opens.
- `ENGAGEMENT` — active foreground seconds plus maximum scroll depth, flushed roughly every 30 seconds and on page hide.
- `NAVIGATE` — first-party page-to-page navigation destination.

Raw message text, commit text, image contents, invite codes, URL query strings and hashes are not copied into telemetry.

## Product actions

Message and sign/commit counts are read from canonical TeamBook tables (`teambook_book_entries`) rather than duplicated as client analytics events. This keeps action totals authoritative even if a browser blocks telemetry.

## Storage

- `teambook_analytics_visitors`
- `teambook_analytics_sessions`
- `teambook_analytics_events`

The ingest endpoint is `/api/telemetry`.
The private House Command endpoint is `/api/telemetry-stats` and requires a real TeamBook admin session.

## Command Center

`/command/` shows the Behavior Observatory with:

- active users in the last 15 minutes and 24 hours
- visitors, sessions, page views and return rate
- average active reading time
- page-level views, unique visitors, active time and scroll depth
- identified actors with visits, messages and commits
- anonymous returning visitors as pseudonymous visitor ids
- 7-day page-view vs commit chart
- automated attention hints
- latest telemetry signal timestamp

## Privacy boundaries

- Do not store IP addresses in product analytics.
- Do not store URL query strings or hashes.
- Do not export TeamBook telemetry into the myClover database.
- Do not use analytics identifiers for advertising.
- Keep TeamBook telemetry, admin auth and database credentials house-local.
