# Teem Clover profile · 2026-09-13

The public `/resume/` introduces Teem through current organizational roles, six selected projects, the AI ใส่ซอส method, experience and life beyond work. Existing `/meet/` and `/classroom/` are the next steps.

## Content and implementation

- `index.html` contains readable Thai content and English translations in `data-en` attributes. Translate leaves, not containers holding interactive controls. Image and accessibility labels use `data-en-alt` and `data-en-aria-label`.
- `resume.css` owns the visual design, responsive layouts, print styles and reduced-motion behavior.
- `resume.js` enhances the static page with WORK/LIFE, language, filters, the illustrative demo and copying the bio. It uses native controls, with no added framework or API.
- The old `resume-base.js` and `resume-upgrade.css` remain for historical reference but are not loaded by this page. `resume.js` no longer injects or patches another runtime.
- `mc_lang` and `mc_resume_mode` remain compatible; unknown values and unavailable storage fall back safely. Explicit links override stored mode. `#career` and `#lifestyle` resolve to the WORK and LIFE beginnings; `#career-proof` and `#life-gallery` still work. Query parameters are retained.
- No changes to `/meet/`, its backend, the archive, global routing or other products. No additional analytics integration; existing page analytics remain, including one `/assets/track.js` reference.

## Source and assets

The supplied `TEEM_RESUME_UPGRADE_FOR_ASTRA_v1.0.0_2026-09-13.md` is the content source and design brief. Its build instructions were distinguished from the current user's request. Roles are source-provided: PiR Academy Assistant Instructor; Clover X AI workflow implementation; GEM Scientific Beauty content workflow support for the doctor; KOOBOON branding and app structure. No dates, financial outcomes, institutional endorsements or qualifications were added for these roles.

- `assets/logos/manifest.json`: official logo URLs and provenance.
- `assets/work/manifest.json`: real local browser project screenshots and observed page state. The X-VISOR image shows its introduction page; its link opens the game. It is not a fabricated game screenshot.
- Reused repository photography: `/meet/img/teem.jpg` (WORK portrait), `/img/teem-life.jpg` (LIFE portrait and Smart Resume cover), `/img/resume-career-stage.webp` (communication experience), `/img/resume-life-boardgame.webp`, `/img/resume-life-snowboard.webp`, `/img/resume-life-scuba.webp` (LIFE). Existing photos were visually inspected; originals remain unchanged and CSS frames them. No generated personal photography or private source files were added.
- Existing social image `/img/og-resume.jpg` is retained.

## Verification and delivery

Local browser verification covered Thai/English, WORK/LIFE, project filters, all three demo states, deep-link mode switching with focus transfer, native keyboard Tab/Space, bio copying, no-JavaScript readable fallback and navigation into the existing `/meet/` AI learning intake. No meeting request was submitted.

Screenshots and the detailed local QA report are delivered outside the public repo in `Teem-profile-qa` alongside this worktree. Viewport checks included 320px and 390px phones, a 768px tablet and a desktop (1309 effective CSS pixels under the browser's zoom setting). No horizontal overflow was observed in these checks. Browser automation history commands were unreliable in this environment; Back/Forward was checked in the isolated state harness, not certified by live-browser automation. Safari and Firefox were not tested. Print styling is included; actual paper output was not verified. This is not a complete site-wide accessibility certification.

Local feature branch: `feat/profile-studio`, based on `main` at `bc822fe7`. This revision is not a production deployment.
