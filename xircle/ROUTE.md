# Route guard — /xircle/

Updated 2026-11-09. Current owner direction: a playable Clover X Brand Experience that the company and every X-VISOR can open with customers. This supersedes the personal-service V3 and the later scroll-only product presentation. Keep the interface concise, visual and useful to explore.

## Journey

**Choose an interest → follow a six-station map → try a sample day → connect XIRCLE / RoutineX / Habix → learn from official videos → download the app.**

- Root: `/xircle/`; case/slash variants reach this implementation.
- Active runtime: `brand-experience.js` / `brand-experience.css`, bounded URL state in `brand-state.js`, catalogue in `brand-catalog.js`, official video library in `media-library.js` / `media-library.css`.
- Stations: `hello`, `signal`, `connect`, `routine`, `habix`, `finish`. Selecting sleep, eating or movement changes the recommended order. The map shows the current stop and visited stops; visitors can jump, go back or restart.
- Visitors can change sample moments, collect/remove three illustrative day signals, select App/Band/Scale, unfold ABCD and inspect five Habix products. Choices change the scene and its next route; they do not calculate health results or prescribe products.
- The map and presentation use native dialogs and the same active experience state. Keyboard, Escape, focus restoration, browser history and reload must work.
- A/B connect to the existing immersive `/routinex/absorb/` and `/routinex/build/` rooms with opt-in company context and a bounded return route. Preserve the standalone rooms outside that context.
- `C / Control` is behavior with no purchasable product. Habix is the nutrition product brand; RoutineX is the routine system. FIVES is a framework, not a sixth product.
- The learning destination is labelled **ห้องความรู้**. Existing cat illustration assets can remain.
- Primary company login is `https://buy.xircle.health/login`, with no personal referral. Download destinations come from the official Xircle website. The separately requested acquisition aliases `/invite`, `/free`, `/join` retain `https://buy.xircle.health/login?ref=O5F3LN`.
- No personal booking, Teem/Ako presentation, TeamBook handoff or personal contact destination belongs in the brand walk.

## State and media

The public showroom uses bounded URL values for station, interest, moment, device, ABCD stage, product, illustrative selections and visited stops. It does not read/write health records or migrate legacy storage. Retired invitation/notebook parameters have no role. Preserve history/reload and the official-media category/selection when moving between parts of the page.

Official video metadata is local in `data/official-videos.json`: 10 clips from `@CloverXOfficial`, grouped into App, Band, Scale and HabiX + RoutineX. These are on-site category queues, not newly published YouTube playlists. A `youtube-nocookie.com` iframe is created only after explicit Play and removed on close, queue change or history change. Keep a real YouTube fallback; do not claim live embedded playback is certified from metadata checks alone.

## References, fallbacks and claims

The 49 reference pages remain directly readable. `build/journey-shell.mjs` generates the shared static header/breadcrumb/footer across 50 pages. `journey.js` / `journey.css` own shared navigation; `knowledge.js` owns URL search/filter state; `reference.js` loads artwork only.

WebGL2 in `orb-field.js` is decorative and optional. Native scrolling, reduced motion, no-WebGL and no-JavaScript reference/download paths must remain usable. Do not add scroll interception or a second global motion engine.

Reuse official and existing assets with real aspect ratios. The verified App Store / Google Play links are in `brand-catalog.js`; official asset provenance is in `assets/official/provenance.json`. Product details remain subject to their original sources and current labels. Avoid conflicting specs, prices, dosage, diagnosis or guaranteed outcomes. The top-level `/maxage` sleep-kit page remains outside this change.

Run [JOURNEY_QA.md](JOURNEY_QA.md) before delivery. A local pass or branch preview does not certify production deployment.
