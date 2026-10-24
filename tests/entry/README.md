# Homepage and portfolio tests

What the restructure added (`/`, `/work/`, `/hire/`, `/walkthrough/`, sitemap, llms.txt, vercel.json routing) is checked at three levels.

| Level | Command | Needs |
|---|---|---|
| Sources and generated pages | `npm run test:entry` | `npm ci` |
| Homepage in Chromium (local copy of the repo) | `npm run test:entry:ui` | `npm ci && npx playwright install chromium` |
| A real deployment | `npm run verify:deployment -- https://<host>` and `ENTRY_BASE_URL=https://<host> npm run test:entry:ui` | the same, plus network access to the host |

From a clean checkout:

```sh
npm ci
npx playwright install chromium        # Playwright is pinned in devDependencies (1.63.0)
npm run test:entry
npm run test:entry:ui
```

- `ENTRY_CHROME=/path/to/chrome` reuses a browser that is already installed instead of downloading one.
- `VERCEL_AUTOMATION_BYPASS_SECRET` opens a preview that has Vercel Deployment Protection.
- CI runs all three levels on pull requests: `.github/workflows/homepage-portfolio.yml`. The deployment job finds the Vercel preview of the PR's commit itself.
- Generated pages: after editing `entry/home.html`, `entry/data.json`, `work/cases.json`, `hire/services.json` or `walkthrough/lessons.json`, run `npm run sync:frontdoor-root`, `node tools/build-portfolio.mjs` and `node tools/build-sitemap.mjs`; the tests fail while a published page differs from its source.
- Not covered by automation: real phones, a logged-in student with a real enrollment (the test mocks `/api/learn?action=entry`), and human testing with people who do not know myClover (BLUEPRINT §12 F3).
