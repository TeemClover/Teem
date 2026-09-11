# myClover project portal

`/course/` is the project selector and shows five team project cards and one free learning card on an ordinary visit. Cards have no project numbers. Order: TheDent, Pi R Academy, Clover X, CrescoHealth, GEMS Scientific Beauty, AI ใส่ซอส. The last card is an ordinary public link to `/classroom`, with no password flow. Choosing TheDent first checks the existing device session with the server: a valid session opens the classroom directly; otherwise the password dialog appears. Other project cards open their password dialog; only TheDent is enabled and other IDs always receive the same unsuccessful-login response.

TheDent is at `/course/thedent/`. Login is checked by `/api/course-access`; a signed, scoped, host-only HttpOnly cookie remembers this browser for up to 400 days. A same-origin `POST` with `{action: 'status', project: 'thedent'}` verifies the existing cookie and renews it without a password. Authenticated classroom HTML visits also renew it, including direct bookmarks. Already-issued 30-day cookies remain valid until their original expiry and are upgraded on the next return. The browser can remove cookies earlier; clearing browser data, private browsing, logout or changing devices requires entering the password again. The password and signing secret exist only in server environment settings:

- `COURSE_DENT_PASSWORD`
- `COURSE_SESSION_SECRET` (cryptographically random, at least 32 characters)

Set both as Secrets for the `teem` Vercel project in Production and Preview before deployment. Missing configuration fails closed. Do not put values into frontend code, build files, repository history, logs, query parameters or localStorage. Changing either value invalidates existing sessions after deployment.

Middleware inspects every path before static routing, rejects encoded classroom aliases (including for signed-in users), redirects unauthenticated classroom-page requests to the portal and rejects asset requests. The `/api/course-content` handler independently verifies access before serving an explicit allowlist of HTML, scripts, styles, fonts, training files and the offline ZIP. Responses are private/no-store. Existing unrelated middleware behavior remains intact.

Production and Preview login throttling uses the existing `DATABASE_URL` and an isolated `public.course_dent_login_rate_limit` table (created at runtime). It permits 30 attempts per address/project per five-minute window, stores only keyed address hashes, and clears the counter after a successful login. Database errors fail closed; the in-memory fallback is for local development without a database only.

The gate applies to current website delivery. Public GitHub history, earlier deployments and copies already downloaded are separate copies; this change does not revoke those copies or make the repository private.

## Maintenance

- Portal: `index.html`, `portal.css`, `portal.js`.
- Classroom: `thedent/`; see its README for content editing.
- Rebuild classroom downloads after edits: `node course/thedent/build.mjs`.
- Branch Desk checks: `node --test tests/course/branch-desk.test.mjs`.
- Authentication checks: `node --test tests/course/auth.test.mjs`.
- Old direct resource URLs redirect to the new protected locations. Old lesson/presentation hashes on `/course/` verify the remembered device first and preserve the intended lesson; only unrecognized devices see the password dialog.
