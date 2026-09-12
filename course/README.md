# myClover project portal

`/course/` is the project selector and shows five team project cards and one free learning card on an ordinary visit. Cards have no project numbers. Order: TheDent, Pi R Academy, Clover X, CrescoHealth, GEMS Scientific Beauty, AI ใส่ซอส. The last card is an ordinary public link to `/classroom`, with no password flow. Choosing TheDent first checks the existing device session with the server: a valid session opens the classroom directly; otherwise the password dialog appears. Other project cards open their password dialog; only TheDent is enabled and other IDs always receive the same unsuccessful-login response.

TheDent is at `/course/thedent912/`. Login is checked by `/api/course-access`; a signed, scoped, host-only HttpOnly cookie remembers this browser for up to 400 days. A same-origin `POST` with `{action: 'status', project: 'thedent'}` verifies the existing cookie and renews it without a password. Authenticated classroom HTML visits also renew it, including direct bookmarks. Already-issued 30-day cookies remain valid until their original expiry and are upgraded on the next return. The browser can remove cookies earlier; clearing browser data, private browsing, logout or changing devices requires entering the password again. The password and signing secret exist only in server environment settings:

- `COURSE_DENT_PASSWORD`
- `COURSE_SESSION_SECRET` (cryptographically random, at least 32 characters)

Set both as Secrets for the `teem` Vercel project in Production and Preview before deployment. Missing configuration fails closed. Do not put values into frontend code, build files, repository history, logs, query parameters or localStorage. Changing either value invalidates existing sessions after deployment.

Middleware inspects every path before static routing, rejects encoded classroom aliases (including for signed-in users), redirects unauthenticated classroom-page requests to the portal and rejects asset requests. The `/api/course-content` handler independently verifies access before serving an explicit allowlist of HTML, scripts, styles, fonts, training files and the offline ZIP. Responses are private/no-store. Existing unrelated middleware behavior remains intact.

Production and Preview login throttling uses the existing `DATABASE_URL` and an isolated `public.course_dent_login_rate_limit` table (created at runtime). It permits 30 attempts per address/project per five-minute window, stores only keyed address hashes, and clears the counter after a successful login. Database errors fail closed; the in-memory fallback is for local development without a database only.

The gate applies to current website delivery. Public GitHub history, earlier deployments and copies already downloaded are separate copies; this change does not revoke those copies or make the repository private.

## Maintenance

### TheDent 12 September evaluation and follow-up

- Canonical classroom: `/course/thedent912/`. Old `/course/thedent/` links redirect; the physical directory and `thedent` cookie scope remain unchanged.
- Closing slide 20 and the follow-up lesson link to the protected `evaluation.html`; `followup-qr.svg` encodes the canonical evaluation URL.
- `/api/course-review` stores responses in `course_reviews`, cohort `thedent-2026-09-12`, separately from First Class registrations/reviews. It uses the existing `DATABASE_URL`; `GET` checks schema readiness without returning responses.
- Only authenticated classroom sessions may submit. A participant UUID provides retry idempotency; shared-device users choose “เริ่มแบบประเมินสำหรับคนถัดไป” to start a fresh respondent. It is not verified identity or attendance.
- Consent defaults to internal use. Only the testimonial may be reused publicly according to consent; anonymous quotations require removing names/details within the text too. There is no public response-list endpoint.
- Successful submissions receive an opaque 30-day receipt, sent in a URL fragment to `https://www.teambook.me/course-card/`. It does not contain answers. TeamBook claims it through exact-origin CORS, bound to one profile, then persists the existing card reward and offers the room `52113`. A claim retry returns the same reward. Scores and publication consent do not affect eligibility.
- The TeamBook deployment must include `course-card/` along with the myClover API release. Do not use production feedback or reward claims for smoke tests; use the memory-only localhost preview and focused tests instead.
- Review data is retained in the database for the instructor's follow-up; this release does not add an admin export UI. Existing First Class dashboards are intentionally unchanged.

- Portal: `index.html`, `portal.css`, `portal.js`.
- Classroom: `thedent/`; see its README for content editing.
- Rebuild classroom downloads after edits: `node course/thedent/build.mjs`.
- Branch Desk checks: `node --test tests/course/branch-desk.test.mjs`.
- Authentication checks: `node --test tests/course/auth.test.mjs`.
- Old direct resource URLs redirect to the new protected locations. Old lesson/presentation hashes on `/course/` verify the remembered device first and preserve the intended lesson; only unrecognized devices see the password dialog.
