# Route guard — /xircle/

Updated 2026-11-09. The current owner request is a complete redesign of the customer-facing landing page: an Apple Watch-inspired scrolling product story using the real Xircle logo, product artwork and app screens. This replaces the six-station map as the root experience.

## Current journey

**Meet Xircle → eat / AI Food Scan → sleep → move → App, Band and Scale → HabiX / Routine X → official tutorials → download the app.**

- Root: `/xircle/`; preserve existing case/slash aliases. Active root files are `index.html`, `landing.js` and `landing.css`, with `media-library.js` / `media-library.css` for official tutorials. The retired `brand-experience` map is not loaded by this page.
- Use native scrolling, section anchors, a concise mobile menu and progressive enhancement. The visual story must work on desktop and mobile without scroll interception or another global motion engine.
- The food interaction is a canned example: play the capture/ingredient/nutrition stages and change a bounded portion multiplier. It does not open a camera, upload photos, collect health inputs or run live food analysis. Label the example clearly and keep nutrition estimates distinguishable from actual visitor measurements.
- Show the two supplied app recordings with visible local posters and native playback controls. Their status/account-points and operating-system navigation areas are cropped, and audio is removed. Opening/closing a dialog must manage playback, Escape and focus correctly.
- Preserve all 10 official tutorials from `@CloverXOfficial`, their category queues, local metadata and self-hosted thumbnail images. Create the `youtube-nocookie.com` player only after Play; closing or changing the queue removes it. Keep real YouTube fallback links.
- Routine X has **four non-playable Coming soon episode cards**. They reserve space for future welcome clips and must not imply those clips are already available.

## Assets and destinations

Use the actual Xircle and Routine X logos, product images and sanitized real-app crops. Asset sources, thumbnail IDs, video processing and the Higgsfield hero generation are recorded in [assets/real-app/README.md](assets/real-app/README.md). Identify the generated hero as a presentation scene; the displayed phone interface is a separate real-app capture.

The primary app links are `https://apps.apple.com/th/app/id6785562482` and `https://play.google.com/store/apps/details?id=health.xircle.app`. Keep `https://www.xircle.health/download` and the official Xircle site as company destinations. No personal booking, referral funnel, Teem/Ako presentation, TeamBook handoff or personal contact belongs in this landing. Separately requested acquisition aliases remain outside this redesign.

All **49 reference pages** remain directly readable, including ห้องความรู้, hardware, products and detailed sources. `build/journey-shell.mjs` maintains their shared static navigation and skips the root because the landing owns its header/footer. Existing reference scripts and product taxonomy remain independent of the new root. The top-level `/maxage` page is outside this change.

## Fallbacks and verification

Reduced motion removes decorative animation and skips the timed scan progression. Without JavaScript, keep the static story, example information, direct local-video links, official-channel link, reference pages and app-download links usable. The root does not require WebGL or browser storage.

Run [JOURNEY_QA.md](JOURNEY_QA.md) against the current revision before delivery. Do not reuse six-station-map results as evidence for this landing, or describe a local pass as a production deployment.
