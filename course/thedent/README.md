# The Dent teaching room

Teaching room at `/course/thedent/`: lessons, slides, ready-to-copy prompts and finished public clinic sources. Two workshops cover content/admin communication and Excel/CSV exports from existing SaaS tools. Branch Desk is an optional self-study example or an instructor-selected contingency when a meaningful export is unavailable. The learner view uses short steps and collapsed reference material; extraction is demonstrated before learners reuse the finished source. The previous marketing page remains at `/course/about/`.

The three-hour workshop starts the team's AI Leader practice: produce work, help a colleague produce their own work, and take responsibility for a shared Source. The included 30-minute group follow-up stays 1–2 weeks later; it supports learners regardless of whether they take another course.

## Editing

- Lessons, slides and prompts: `course-content.js`.
- Canonical clinic source: `../../shelf/source/thedent/public-company.md`. Follow the source-shelf workflow when updating facts. The build copies this exact revision to `resources/clinic-public-source.md`.
- Website reading notes and teaching files: `resources/`. `thedent-branches.xlsx` and `.csv` contain real public branch details as a fallback exercise, not an alleged SaaS export. The Excel workshop uses the learner’s actual export when available.
- `tool-quickstart.md` walks through actual Cowork folder access and ChatGPT file downloads. `content-handoff-example.md` and the optional `handoff` prompt extend Workshop 1 into a production brief for the content team.
- The instructor guide has a 20-minute Excel / 50-minute Branch Desk contingency when a meaningful real export is unavailable. The three-row public table is a short exercise, not a substitute for a full business-report workshop.
- [ai-leader-homework.md](resources/ai-leader-homework.md) defines three seven-day missions: days 1–2 repeat one's own workflow without the instructor; days 3–4 coach one colleague to produce their own file; days 5–7 identify a Source owner and an actual version/update problem, or the next update path if no problem is found. AI assembles existing evidence into `ai-leader-progress.md`; no repeated intake forms or invented success metrics.
- [advanced-course.md](resources/advanced-course.md) describes the separate, paid full-day **Advance · ขึ้นซอสกลาง GitHub** course: installation and device preparation, permissions, Source ownership, versions and updates, followed by use from two machines. It helps the organization use one maintained source. The current workshop introduces this roadmap in its final three minutes; it does not perform installation or enroll learners automatically.
- Advance readiness comes from repeatable work, peer practice and a real need to maintain a shared Source. The follow-up's final five minutes can discuss that roadmap when relevant while still helping learners who do not buy it.
- Presenter/learner experience: `course.js` and `course.css`.
- Self-contained Branch Desk example: `daily-brief.html` (legacy filename preserved). It uses public branch/contact details, not financial or patient data.
- Run `node course/thedent/build.mjs` after edits to regenerate the source copy, prompt library, slide notes, embedded files and offline ZIP. Do not edit generated resources directly.

The course kit runs by opening `index.html` after extracting the ZIP. It includes local fonts and embedded Markdown resources. AI and external websites need internet access. Progress stays on the device; edited prompt drafts stay in memory until refresh or explicit download.

## Verification

- `node --test tests/course/auth.test.mjs tests/course/middleware.test.mjs tests/course/branch-desk.test.mjs tests/course/copy.test.mjs` checks access, routing, the example tool and clipboard failure paths.
- `node shelf/validate.mjs` checks source metadata and the catalog.
- `tests/course/http-check.mjs` checks deployed access, protected downloads and encoded routes with a supplied test password; never commit production credentials.
- Verify actual browser flows: five equal project cards, remembered-device entry, website/source downloads, one-click prompt copy and optional editing, Excel/CSV downloads, presentation navigation, Branch Desk search/copy and responsive layouts.

Publishing uses the existing GitHub → Vercel pipeline. Current online content requires a signed course session. Downloaded kits and public source-shelf files are separate shareable copies. See ../README.md for remembered-device and access configuration.
