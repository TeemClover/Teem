# The Dent teaching room

Static teaching site at `/course/`: 7 lessons, 20 slides, 8 prompts, 15 resources and two workshops. Fictional data only. The previous course information page is retained at `/course/about/`.

## Editing

- Lesson, slide and prompt copy: `course-content.js`.
- Teaching files: `resources/`.
- Presenter/learner experience: `course.js` and `course.css`.
- Self-contained CSV prototype: `daily-brief.html`.
- After any change, run `node course/build.mjs` to regenerate the prompt library, slide notes, embedded resource text and deterministic offline ZIP. Do not hand-edit the generated files.

The course kit runs by opening `index.html` after extracting the ZIP. It includes local fonts and embedded resources. AI services still need an internet connection. Only lesson progress is saved in localStorage; edited prompt drafts stay in memory until the page is refreshed.

## Verification

- `node course/tests/daily-brief.test.cjs` checks CSV calculations and validation against the actual HTML logic.
- Start a local static server at the repository root, then run `node course/tests/browser.e2e.mjs` with Playwright available. Optional environment variables: `COURSE_URL`, `PLAYWRIGHT_MODULE_PATH`, `CHROME_PATH`.
- The browser checks routes, prompts, downloads, offline use, presentation navigation, timer, laptop/mobile layout and CSV upload behavior.

Publishing uses the existing GitHub → Vercel pipeline. `/course` redirects to `/course/` through the existing middleware. No new service or API is required.
