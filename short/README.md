# ตอนต่อ / TONTOR

Responsive film-first prototype at `https://www.myclover.com/short/`.
Slogan: **เรื่องสั้น ความรู้สึกยาว**. The fictional Thai creator community includes short films, animation, comics and original novels.

## Local preview

`node short/preview.mjs` → `http://127.0.0.1:4317/short/`.
Buildless ES modules; no installation or production build required. Preview only serves `/short/` and its existing Thai font dependencies, with byte-range support for videos.

## Experience

- Nine movie concepts lead discovery. The Hero opens on a random Thai-focused film without repeating the previous opening when browser storage is available. Native scroll-snap follows touch with momentum; mouse drag, arrows, dots and keyboard also work. All panels remain mounted. Mobile artwork fills the Hero edge to edge with readable text over a gradient; desktop posters retain their proportions.
- Downloaded highlights in `hero-trailers.js` play muted only on the active, visible Hero slide. Users can pause, replay or enable sound; opening a dialog, hiding the tab or leaving the Hero pauses playback. Inactive sources are unloaded. Reduced-motion and data-saving preferences require an explicit play action. The watch button opens that same actual clip in the native player.
- Completed pilot files live in `assets/clips/` and are explicitly enabled through `library.js`. They play through native HTML video with audio, full-screen support, optional script captions, episode navigation and optional autoplay. MP4 files are different clips, not animated posters reused as new finished episodes.
- Concepts without finished footage retain clearly labeled silent animated posters. Their additional episode counts demonstrate the coin flow.
- Four compact featured creator cards keep the film catalog in focus: one individual portrait and three original studio logos. Detailed profile dialogs include biographies, province, disciplines, linked films/novels and browser-local follow state. All twelve creator identities remain available for story credits. No audience counts or verification claims are invented.
- Somchai episode 1 imports ten completed illustrated sheets (forty panels) from the user’s existing Thai adaptation. It is free, with optional accessible panel transcripts, expanded reading, and scroll restoration across screen sizes. The newly generated cover matches the existing fictional protagonist; `docs/somchai-cover.json` records the prompt and source hashes.
- The HR comic has two distinct chapters and five illustrated pages with Thai DOM dialogue. The novel collection has three original complete stories, three substantial distinct chapters each. Reader controls offer paper, sepia and night themes, text sizing, chapter navigation and scroll restoration.
- Search, format/genre filters, saved stories, reading/viewing progress, coin balance and creator follows persist in this browser. Spending demo coins requires explicit confirmation and never charges real money.

## Content and provenance

Creator identities and classifications are fictional presentation material. Most prototype plots are original presentation concepts; Somchai is the imported Thai adaptation described above. Portraits, covers and comic art were generated with built-in image_gen; the three team logos are original SVG marks in `assets/creators/logos/`. Prompts are preserved in `assets/prompts.json` and `assets/art-prompts-v2.json`; authoring manifests are excluded from deployment.

`content-library.js` contains original novels, profile copy and production scripts. `media-pilots.js` identifies each downloaded Meta AI / Google Flow clip; `library.js` enables only completed files. Caption tracks are optional authored-script cues with approximate timings, not a certified speech transcript. Generated actors can vary between pilot scenes.

`docs/hero-highlights.json` preserves the four original cliffhanger scripts and completed-media provenance. The first completed highlight is the eight-second Nakhon Naga scene from Google Flow / Veo 3.1 Fast. Reference PNGs are authoring inputs and are excluded from deployment; the optimized MP4 and extracted WebP poster ship with the app. Planned highlights are not enabled before their actual files are available.

No real authentication, payment processing, content-rights moderation, uploads or creator payouts are implemented. The demo is suitable for presenting the product and trying its user flows; browser storage is not a secure wallet or paid-content access system.

## Sharing

`node short/build-share-pages.mjs` regenerates 16 static story pages with server-readable Open Graph metadata and direct `/short/story/<id>/?episode=<n>` links. The homepage uses `assets/og/tontor-v3.jpg`; each film and novel has its own 1200×630 JPEG share card with logo, slogan and Thai title. `node short/render-og.mjs <story-id>` renders selected cards with exact Thai type and generated artwork.

## Verification

Start a local preview, then run `node short/verify-app.mjs` (default port4321; override `SHORT_BASE_URL`). It checks responsive layouts, full novel chapters, reader preferences/resume, distinct comic images, creator profiles/follows, search/saved stories and native MP4 audio/video decoding.

`node short/verify-carousel.mjs` checks continuous mouse movement, real CDP touch swipes in both directions, native vertical scrolling, settling, keyboard and accessibility at320–2560px.

`node short/verify.mjs` starts an isolated preview and runs app + state/coin/deep-link checks. Override `SHORT_BASE_URL=https://www.myclover.com` to check production. Artifacts stay in `/private/tmp/` or `SHORT_PROOF_DIR`. `SHORT_APP_VERIFY='MP4'` runs only media checks.

Release only `short/` and necessary development-file exclusions. Preserve unrelated changes; publish without force-pushing and verify the actual deployment and public website.
