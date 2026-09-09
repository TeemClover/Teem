# Repository layout and safe cleanup boundaries

Updated 2026-09-10. This map describes the current route-oriented repository. It does not authorize moving a public route, changing deployment, or removing a legacy save contract.

## The directory tree is also the URL tree

This is a static HTML/CSS/JavaScript site with provider-specific API entrypoints. `package.json` has local preview and test commands, but no frontend bundler or `src` → `dist` build. A folder move can therefore be a public URL change even when all its files still exist.

| Area | Current responsibility | Cleanup boundary |
| --- | --- | --- |
| `index.html`, `hall.html`, `hall-full.html` | Public Compass root and existing Hall entry files | Root is the approved Compass entrance; its document is rendered from `frontdoor/index.html`. Keep Hall independently accessible. |
| `home/` | Preserved original homepage, reached as an additional Compass path | Keep its original voice video and legacy route; load the full spoken video only when explicitly requested. This is separate from promoting the new Front Door to `/`. |
| `frontdoor/` | Shared Compass experience at `/` and `/frontdoor/`, RGBS paths, rewards and saved-work restoration | Keep runtime module paths stable. `README.md` is the entrypoint for implementation notes. |
| `frontdoor/art/` | Browser-ready Compass/world layers and generated path/food images | Keep used assets alongside the feature. Provenance and prompts are grouped under `docs/frontdoor/`. |
| `assets/front-door/` | Additive telemetry/state/outcome contracts shared with destinations | Keep imports and the canonical event registry stable. |
| `core7/backend/` and `stat/frontdoor/` | V2 persistence/aggregation and protected Stat UI | Preserve V1 history, D1 tables, API paths and Stat access control. |
| `tests/frontdoor/` | Active browser journeys for opening, RGBS, learning, art, performance, motion, original house, craft and meeting continuation | Keep browser tests grouped by experience; imports point back to shared local fixtures. Screenshots/proof data are external outputs, not source files. |
| `tests/teambook/` | TeamBook-specific browser entry checks | `compass-entry.e2e.mjs` uses mocked TeamBook responses; do not present it as an end-to-end live backend proof. |
| `core7/tests/` | Backend tests, local preview, real local D1/Meet fixtures and shared test helpers | Keep this executable tooling. `frontdoor-preview.mjs` remains the local server entrypoint used by browser tests. |
| `ako/`, `ako/kitchen/`, `xircle/`, `meet/` | Food, practical recipes, daily-routine and meeting continuations | Keep their public routes. Xircle V3 entry and compatibility aliases are intentional. |
| `forge/`, `classroom/` | Seven-episode comic and practical AI lessons | Preserve episode/lesson URLs and existing reader progress. Generated Forge pages also have a source generator. |
| `xvisor/`, `teambook/`, `xty/` | Separate active product areas | Preserve product boundaries. X-VISOR is on owner HOLD; four audited TeamBook Compass adapters join this release. Other product files remain untouched. |
| Other room directories, including `guild/`, `collection/`, `resume/`, `paths/`, `club/`, `course/`, `compendium/`, `command/`, `first-class/`, `kickstarter/`, `members/`, `profile/`, `privacy/` | Existing route namespaces | A filename inventory is not proof that a route is unused. Leave these in place unless a route-specific audit authorizes a change. |
| `api/` | Vercel API entrypoints and shared server helpers | Keep provider-recognized entry locations. Do not move into a generic frontend `src` tree. |
| `functions/` | Cloudflare Pages Functions | Explicitly excluded from Vercel by `.vercelignore`; preserve that separation. |
| `icons/`, `favicon.ico`, `mask-icon.svg`, `site.webmanifest` | Existing brand and app metadata assets | Do not redesign or replace them during organization. |
| `assets/`, `img/`, `media/` and room-local `assets/`/`img/` | Shared and room-specific runtime assets | Relocation requires updating every consuming HTML, CSS, JS and generator reference together. |
| `blueprint/` | Approved product/architecture source documents | Preserve their stable names and chronology. |
| `docs/` | Repository maps, evidence indexes and cleanup reports | Preferred home for new cross-repository documentation. |
| `docs/frontdoor/` | Front Door storyboard, generation provenance, exact prompts and mobile export notes | Documentation only; runtime images remain under `frontdoor/art/`. |
| `tools/`, `scripts/`, `.github/workflows/` | Build, verification, migration and automation sources | Not public experience code, but operational paths are referenced explicitly. |
| `.forge-src/` | Original comic panels | Default input of `tools/build.py`; preserve originals and generator linkage. |
| `.tmp/classroom-hero/` | Historical image-upload chunks | Despite its name, a GitHub workflow explicitly reads this path. Do not sweep it as generic temporary output. |

Remaining top-level route folders such as `captures/`, `walkthrough/`, `card/`, `calling/`, `boss/`, `invite/`, `register/`, `keen/`, `class/`, `first-class/` and `en/` have not been audited for retirement by this layout pass.

## Public entrances and ownership

Ownership here identifies a code boundary, not permission to absorb another active task's changes.

| Public room or entrance | Repository folder/file | Ownership / status |
| --- | --- | --- |
| `/` | `index.html` | Approved public Compass entry; regenerated with `tools/sync-frontdoor-root.mjs`. |
| `/frontdoor/` | `frontdoor/` | Compass, rewards and local journey runtime. |
| `/home/` | `home/` | Implemented original-house destination from the Compass; original voice video is explicitly opened, and legacy routes remain available. The approved root now uses the Compass; this old-house route remains separate. |
| `/hall.html` | `hall.html` | Existing Hall route; preserve independently of the homepage entrance. |
| `/ako/` | `ako/` | Ako's food/life experience and existing media. |
| `/xircle/`, `/Xircle/` | `xircle/` | Current V3 experience plus compatibility aliases. |
| `/meet/` | `meet/` | Meeting intake UI; shared server validation remains in `api/_lib/`. |
| `/forge/` | `forge/` | Seven-episode comic; source generator is `tools/build.py`. |
| `/classroom/`, `/classroom/dungeon/` | `classroom/` | Existing lessons/Dungeon; Front Door owns only the scoped continuation adapters. |
| `/stat/frontdoor/` | `stat/frontdoor/` | Protected Front Door analytics surface. |
| `/xvisor/` | `xvisor/` | Owner reopened development: HOLD until new READY; retain published game, score version 1.0b and saved games. |
| `/teambook/`, `/xty/` | `teambook/`, `xty/` | Separate product areas; preserve their current work and state contracts. |

## Front Door placement convention

- Feature runtime remains under `frontdoor/`; shared telemetry remains under `assets/front-door/`.
- Unit tests stay adjacent to their modules. The existing `test:frontdoor` command uses these globs and the tests use relative imports.
- Active experience browser tests live under `tests/frontdoor/`. Backend tests and fixture servers remain under `core7/tests/`; `dev:frontdoor` still directly executes `core7/tests/frontdoor-preview.mjs`.
- The Front Door browser suite is `opening`, `rgbs`, `completion`, `learning`, `learning-destinations`, `art`, `performance`, `motion`, `meeting-intake`, `house` and `craft`, each ending in `.e2e.mjs`. Shared fixtures are imported from `../../core7/tests/`; runtime modules from `../../frontdoor/` when a test directly exercises them.
- TeamBook's mocked Compass entry check is `tests/teambook/compass-entry.e2e.mjs`. The obsolete `compass-path-ui` visual fixture is archived externally; its historical saved-state reader remains under `frontdoor/`.
- Generated delivery images stay under `frontdoor/art/`, with mobile siblings and provenance. Full-resolution generation originals remain preserved at their documented source paths.
- Storyboard, asset provenance, prompt and mobile-export notes are grouped under [docs/frontdoor](frontdoor/README.md). `frontdoor/README.md` remains the implementation entrypoint and links to the moved records.
- Browser screenshots, SQLite/D1 fixture data, traces and proof output belong in the external local evidence directory or an ignored test-output directory, not beside public assets.

## Completed organization and retained compatibility

These changes organize development files and archive measured unused assets. They do not replace public room URLs or erase legacy state.

1. The unused `frontdoor/art/compass-awake.webp` experiment is archived outside the repository. Its original size was 182,350 bytes; no current runtime consumer needs it.
2. Unused `frontdoor/art/leaf-0.webp` through `leaf-3.webp` (391,528 bytes total) are archived with the obsolete `core7/tests/compass-path-ui.e2e.mjs` fixture that depended on them. Historical provenance retains the original asset paths; these filenames do not indicate active runtime dependencies.
3. Seven Front Door storyboard, prompt/provenance and mobile-export records were moved into `docs/frontdoor/`, with README and local document/asset links updated. The records total about 38 KB before link edits. No image originals or runtime assets were moved. This is organization, not a meaningful first-load performance optimization: runtime code does not request these records.
4. `compass-on-page.webp`, `workshop.webp`, `paper-aperture.png`, the rim/clean plates and current world/mobile layers are still consumed. Their old-looking names do not make them rejected assets.
5. `frontdoor/compass-path.js` is a legacy saved-path compatibility reader imported by `path-runtime.js`; `flow.js` is imported by `app.js`. Keep both even though their original visual concept was replaced.
6. Active Front Door browser tests moved to `tests/frontdoor/`, with package commands and relative imports updated together. The TeamBook-only mocked destination test moved to `tests/teambook/`. Backend tests and local servers remain under `core7/tests/`.

## Build/deployment cautions supported by the current files

`tools/build.py` defaults its input to `.forge-src/`, writes `forge/` HTML/images, and rewrites root `_redirects`. Do not run it as a harmless formatting or folder-cleanup command. Its generated pages, compatibility redirects and public source generator must remain consistent with the current open reading rail and direct course continuation. Test generator changes against isolated temporary outputs rather than overwriting the working site for verification.

`vercel.json`, `_redirects`, `_headers`, `middleware.js`, `functions/_middleware.js` and `.vercelignore` are routing/hosting boundaries. The final release pass adds scoped Front Door/X-VISOR QA exclusions to `.vercelignore` and a 404 boundary in `functions/_middleware.js`; the existing private access gate is preserved. The local preview serves an explicit public-room allowlist (including original Hall continuations) from the repository tree; a physical move may require a preview change as well as a production routing change.

Before a final commit, refresh `git status --short` and review an explicit file list. In particular, active X-VISOR changes and its score endpoint must not be absorbed by a broad `git add .`. Existing cross-room WebP conversion work must also be reviewed as a group: its image exports and rewritten consumers belong together (see `repo-cleanup-report.md`).
