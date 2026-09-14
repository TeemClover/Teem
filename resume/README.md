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
- Reused repository photography: `/meet/img/teem.jpg` (WORK portrait), `/img/teem-life.jpg` (LIFE portrait), `/img/resume-career-stage.webp` (communication experience), `/img/resume-life-boardgame.webp`, `/img/resume-life-snowboard.webp`, `/img/resume-life-scuba.webp` (LIFE). Existing photos were visually inspected; originals remain unchanged and CSS frames them. No generated personal photography or private source files were added.
- Existing social image `/img/og-resume.jpg` is retained.

## Verification and delivery

Local browser verification covered Thai/English, WORK/LIFE, project filters, all three demo states, deep-link mode switching with focus transfer, native keyboard Tab/Space, bio copying, no-JavaScript readable fallback and navigation into the existing `/meet/` AI learning intake. No meeting request was submitted.

Screenshots and the detailed local QA report are delivered outside the public repo in `Teem-profile-qa` alongside this worktree. Viewport checks included 320px and 390px phones, a 768px tablet and a desktop (1309 effective CSS pixels under the browser's zoom setting). No horizontal overflow was observed in these checks. Browser automation history commands were unreliable in this environment; Back/Forward was checked in the isolated state harness, not certified by live-browser automation. Safari and Firefox were not tested. Print styling is included; actual paper output was not verified. This is not a complete site-wide accessibility certification.

Local feature branch: `feat/profile-studio`, based on `main` at `bc822fe7`. This revision is not a production deployment.

## Follow-up · 2026-09-14

- The latest user decision retains both languages, the TH/EN switch, WORK/LIFE controls and the approved visual style. No translation removal or runtime rewrite is part of this follow-up.
- The existing experience disclosure now adds context for Youpik, In-Tech Steel and Nusasiri, plus a short account of Thai–Chinese media-distribution agreement work in the Sanchuan context. These details are grounded in the previous profile at `bc822fe7`, including its runtime-added account. No current executive status, disputed dates, professional legal qualification or private contractual material is added.
- One native disclosure in LIFE adds the existing Flesh and Blood Pro Tour London and Palm Jumeirah skydiving stories. Both remain collapsed by default and are translated with the same leaf-level `data-en` approach. No tournament result or new event is claimed.
- The Source Shelf card still links to `/shelf/`, and now states in both languages that access requires a key and visitors should contact Teem for one. Shelf access controls and content storage are handled outside this profile change. The shelf screenshot was refreshed from the current locked cabinet on 2026-09-14; it shows catalog labels and the padlock, not accessible source contents.
- Small styles cover the extra disclosure content and access note. The rest of the profile layout and `resume.js` remain unchanged.
- Follow-up checks: JavaScript syntax and diff whitespace passed; all local profile links/assets resolved; the extra stories have bilingual leaf content and closed native disclosures. An isolated run of the unchanged script round-tripped all 144 HTML translation leaves four times while preserving the selected filter, demo step, LIFE mode and query string. This is a local state check, not a new browser or production verification claim.

### Flagship website

- The user's next direction makes the myClover website itself the flagship work. It now appears first as a full-width shelf item linking to `/`, replacing the self-referential Smart Resume card. The shelf still contains six projects, and its count remains derived by the unchanged script.
- The item uses the exact existing `/icons/icon-192.png` logo already used in the homepage header. It is rendered without recoloring or modification; no new logo asset was generated or copied.
- “Built since 2007 through today” and the exact Thai philosophy “ใครเจอเรา คนนั้นโชคดี” are explicitly user-provided facts for this revision. No additional dates or historical milestones are inferred.
- The bilingual expandable story treats the profile as one entrance into the wider website. Current doorway descriptions are grounded in `index.html`, `frontdoor/README.md` and the existing homepage journey: learning AI, making something, exploring food and routines, and continuing toward a conversation. The story does not expose implementation details or turn simulated experiences into outcome claims.
- Existing organizational roles, the two languages, both profile modes, optional experience/LIFE stories and the locked-shelf notice remain intact. This follow-up does not change homepage behavior or access controls.
- Flagship checks: six projects remain, with dynamic all/learn/build/play counts of 6/4/4/3; the site belongs to all three categories. All 147 current translation leaves round-tripped four times in the isolated script check while preserving mode, filter, demo and query state. The original homepage logo and all local links resolve. Browser visual review of the new banner remains separate from these state checks.

- Root browser review confirmed the flagship layout at desktop and 390px mobile widths, EN translation and no horizontal overflow. The current locked shelf screenshot is 1265 x 712; the image attributes and provenance match.

## Teaching, broadcast and research experience · 2026-09-14

The owner explicitly requested six additional roles: former Lazada seller trainer; former guest lecturer teaching blockchain at Assumption College, Bang Rak; former guest lecturer teaching livestreaming at Kasetsart University; prior foreign-affairs subcommittee work in the Thai Parliament; executive responsibilities across multiple business sectors in the Nusasiri group; and research collaboration with Chulalongkorn School of Integrated Innovation (CSII) on AI and longevity. The owner also confirmed teaching social commerce in a nationwide live broadcast on Thai Channel 5.

- These are owner-confirmed professional statements. Official websites are used to identify the institutions and original logos, not to independently substantiate employment, appointments, teaching or research results. No additional dates, credentials, student counts or outcomes are inferred.
- Parliament is described broadly as foreign-affairs subcommittee work. No exact committee name, chamber, ministry appointment, elected office or chairmanship is inferred. The asset is the common Parliament emblem from its National Assembly page.
- Nusasiri uses its historical logo extracted as unchanged embedded JPEG bytes from the official 2022 AGM document; the role is explicitly former. Assumption is the Bang Rak school, not Assumption University. KU uses the university seal. CSII uses its official 2023 identity mark, with the full school name available in the role disclosure.
- The new bilingual `#teaching-proof` section appears before selected work. The existing TV photo and communication story move here instead of duplicating the photograph. Six compact logo cards expose the role at a glance and use native disclosures for context. The Thai–Chinese case remains below the career timeline.
- A hero anchor gives a direct route to this section. The next step links to the actual AI ใส่ซอส course at `/ai-source/` and its free first lesson at `/ai-source/#sample`; no signup or payment is submitted during profile verification.
- All seven new original logo files and their provenance are recorded in `assets/logos/manifest.json`. `resume-restored-work.css` now also styles the teaching section. No new script or dependency is introduced; WORK/LIFE, TH/EN, myClover flagship, the locked shelf and /meet remain.
