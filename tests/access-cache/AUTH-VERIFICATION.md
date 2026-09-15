# Auth and session verification — 2026-09-15

## Scope

Verified the changed source in a real Chromium 152 browser against
`tests/access-cache/auth-preview.mjs` at `http://localhost:4178`.
The preview uses the production `createAuthHandler`, `currentUser`,
`createLearnHandler`, and course authorization functions with an **in-memory
database and course fixtures**. OTP delivery is intercepted locally. These
checks do not establish that production OAuth, email delivery, or the production
database/deployment works.

The browser used an isolated persistent profile at
`/private/tmp/myclover-auth-cache-profile`. No session token or password was put
in localStorage. Browser cache was left enabled; the test did not install network
routes or set DevTools Disable cache.

## Browser results

| Requirement | Result | Observed evidence |
| --- | --- | --- |
| C: Guest cannot read paid lessons | Pass | Direct `/learn/?course=ai-sauce&lesson=FOUNDATION` showed the existing verification form; lesson API returned 401 `AUTH_REQUIRED`. |
| D: Login persists through refresh and navigation | Pass | Submitted the existing email OTP form for `member@fixture.test`; actual server cookie opened the private fixture lesson. Refresh and clicking the second lesson retained the account. |
| D: Login persists after browser close/reopen | Pass | Closed Chromium with `agent-browser close`, launched it again with the same persistent profile, opened `ADV01`; private fixture content and `fixture-member` returned without another password/OTP. `document.cookie` was empty because the session is HttpOnly. |
| E: Logout revokes session and clears UI | Pass | Clicked the existing account dialog's logout button. Session endpoint returned `user:null`; direct lesson endpoint returned 401 and `Cache-Control: private, no-store, max-age=0`; reading DOM was empty. |
| E: Browser Back cannot restore paid reading after logout | Pass | Entered an authorized lesson, navigated to another document, logged out on that origin, then used Back. `pageshow.persisted` was **true**, confirming a real bfcache restore. Reading DOM remained empty, classroom hidden, login form visible. |
| E: Expired server session is denied | Pass | Logged in through the actual OTP endpoints, verified the private lesson appeared, set only the fixture database's `expires_at` to the past, refreshed. Session returned null, lesson returned 401, reading DOM was empty, login visible. |
| F: Login without course entitlement is denied | Pass | Submitted the existing OTP UI for `unentitled@fixture.test`. The session was verified, but only the enrolled/locked state appeared; direct lesson API returned 403 `COURSE_ACCESS_REQUIRED`, with no lesson payload and an empty reading DOM. |

Screenshots (local artifacts):

- `/private/tmp/myclover-auth-proof/authorized-second-lesson.png`
- `/private/tmp/myclover-auth-proof/after-logout.png`
- `/private/tmp/myclover-auth-proof/expired-session.png`
- `/private/tmp/myclover-auth-proof/without-course-access.png`

## Automated tests

- `node --test tests/access-cache/auth-session.test.mjs api/_lib/auth-email.test.mjs api/_lib/learn-media-authorization.test.mjs`: **25 passed**.
- `node --test tests/access-cache/account-client.test.mjs`: **4 passed**.
- `node --test learn/tests/frontend.test.mjs`: **48 passed**.

Tests exercise real token creation/hashing, absolute expiry, logout token replay,
revocation, email proof, denied course access, malformed/ambiguous cookies, shared
cache exclusion, safe complete return URLs, logout failures, stale async session
results, provider discovery failure, cross-tab notifications, and removal of
private reading before a history snapshot.

## Existing lifetime retained

- Member `mc_session`: **30 days**, absolute expiry in database and cookie
  `Max-Age=2592000`; `HttpOnly; Secure; SameSite=Lax; Path=/`, host-only cookie.
  Returning requests validate the existing session; they do not extend it.
- Email OTP: **10 minutes**, one use and at most five guesses; this is a login
  challenge lifetime, not the remembered session lifetime.
- Separate existing systems were not changed: Dent course **400 days**, renewed
  by its established status/content flow; shelf **7 days** capped by access key
  expiry; backoffice **12 hours**; XTY admin **10 hours**; Discord **30 days**.

No production deployment or production account login was performed by these
tests. Production Google/LINE login, actual email delivery, and real member
entitlements require a separate authorized production verification.
