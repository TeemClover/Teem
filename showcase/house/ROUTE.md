# /showcase/house/

Static Home Explorer showcase by Teem / myClover. House is the primary working surface. Thai UI, real procedural Three.js geometry, context-linked SVG plan and evidence photos. No runtime AI, account, API key, server backend or analytics.

Canonical data in app/data/house.js; public photo allowlist in app/data/photos.js. Keep raw photos/PDF, private paths, project location and original filenames outside this route. Candidate photo bindings must stay marked and cannot become confirmed by confidence alone.

Build only this directory with npm run build. Keep root site configuration untouched. Preserve the independent state domains: building view, floor/room, evidence lens, wall setting, photo gallery. Test build, geometry/state tests, asset audit and browser flows before release. See README.md, LEARN.md and reports/QA.md.
