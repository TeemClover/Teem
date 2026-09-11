# The Dent teaching room

Teaching room at `/course/thedent/`: 7 lessons, 20 slides, 8 prompts, public clinic sources and two workshops. The teaching flow starts with finished examples, then website extraction, Markdown file creation, content work and a searchable Branch Desk. The previous marketing page remains at `/course/about/`.

## Editing

- Lessons, slides and prompts: `course-content.js`.
- Canonical clinic source: `../../shelf/source/thedent/public-company.md`. Follow the source-shelf workflow when updating facts. The build copies this exact revision to `resources/clinic-public-source.md`.
- Website reading notes and teaching files: `resources/`.
- Presenter/learner experience: `course.js` and `course.css`.
- Self-contained Branch Desk example: `daily-brief.html` (legacy filename preserved). It uses public branch/contact details, not financial or patient data.
- Run `node course/thedent/build.mjs` after edits to regenerate the source copy, prompt library, slide notes, embedded files and offline ZIP. Do not edit generated resources directly.

The course kit runs by opening `index.html` after extracting the ZIP. It includes local fonts and embedded Markdown resources. AI and external websites need internet access. Progress stays on the device; edited prompt drafts stay in memory until refresh or explicit download.

## Verification

- `node --test tests/course/auth.test.mjs tests/course/middleware.test.mjs tests/course/branch-desk.test.mjs` checks access, routing and the actual example tool.
- `node shelf/validate.mjs` checks source metadata and the catalog.
- `tests/course/http-check.mjs` checks deployed access, protected downloads and encoded routes with a supplied test password; never commit production credentials.
- Verify actual browser flows: five equal project cards, remembered-device entry, website/source downloads, prompt copy/edit, presentation navigation, Branch Desk search/copy and responsive layouts.

Publishing uses the existing GitHub → Vercel pipeline. Current online content requires a signed course session. Downloaded kits and public source-shelf files are separate shareable copies. See ../README.md for remembered-device and access configuration.
