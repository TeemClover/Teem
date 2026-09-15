# myClover × Airova Official Partner

Static landing page: `/airova/` (with `/airova` redirect). Thai partner page for myClover. Built 2026-09-15.

## Content and destinations

- All account creation buttons use `https://studio.airova.ai/auth/join?via=MYCLOVER`.
- 30 free introductory credits and myClover Official Partner status are user-provided facts.
- Benefits: special discounts, Thai support directly from the platform, courses, community, free templates, activities and promotions. No invented discount rate, event date, or course price.
- Partner follow-up uses existing myClover LINE destination `https://lin.ee/rlSlhzT`.
- Airova community destination comes from its public homepage.
- Course title and subjects verified from https://www.piracademy.com/course/seedance-advanced-video-production.
- Airova's connected `list_models` catalog verified Omni and Seedance 2.5 available on 2026-09-15. Public homepage copy is older; do not downgrade this to a coming-soon claim based only on that copy.

## Social sharing

- Facebook/Open Graph and Twitter use `assets/airova-share-thai-video-v2.jpg`, a dedicated 1200 × 630 JPEG preview with the user's portrait, Thai AI video headline, and 30-credit introductory offer.
- Metadata leads with the introductory offer and Thai video creation. The complete built-in generation prompt and provenance are in `share-preview-prompt.md`.
- The image has a new filename; previously cached Facebook cards may need a re-scrape in the Sharing Debugger.

## Interaction

- Showcase is a 16-clip autoplay wall sourced from Airova's public marketing templates, reused at the user's request. Each clip has verified non-silent native audio; source URLs and audio measurements are in `wall-clips.json`.
- Videos preload near the viewport and autoplay muted/loop inline while visible. Offscreen videos and hidden tabs pause. Only one clip can be audible; opening another clip's sound mutes the previous one.
- The wall has pause/resume and per-clip sound, expand, and retry controls. Reduced-motion preferences start the wall paused. The expanded video uses native controls; Escape/backdrop/close stops it and restores visible muted wall playback. Both video and template dialogs suspend the wall, preserving the global pause setting.
- Wall media contains 16 H.264/AAC MP4 clips (480 × 854, 8 seconds, 10.24 MB combined) and WebP posters. Every file has faststart enabled. Native audio is retained without adding a soundtrack. Silent hero samples are not used in the new wall.
- Three original myClover prompt templates can be copied or downloaded without signup. They are suggestions for getting started, not Airova marketplace recipes and not guaranteed to reproduce the sample imagery. Source of the on-page prompts is `airova.js`; matching downloadable versions are in `templates/`.
- The platform charges generation credits separately from the free prompt download.
- Links work as ordinary HTML anchors. No analytics, form submissions or account handling are added to this page.

## Sources and assets

- Airova logo: https://studio.airova.ai/marketing/logo/aistudio.svg and aistudio-white.svg.
- Airova showcase videos: https://cdn.airova.ai/landing/hero/hero-car.mp4, hero-character.mp4, hero-fashion.mp4 and https://cdn.airova.ai/landing/tpl/ugc/01.mp4.
- Posters from https://cdn.airova.ai/landing/hero/posters/ and https://cdn.airova.ai/landing/posters/; file names in `assets/` preserve their source names. WebP copies optimize page loading.
- Omni mark is the official model mark from Google DeepMind. ByteDance Seed is the official provider logo displayed alongside the name Seedance 2.5; no separate Seedance model logo was invented. Exact source URLs are in `assets/sources.json`.
- Course cover and PiR logo are supplied by the public PiR Academy website; exact sources in the asset manifest.
- `creative-portal.png` is original editorial artwork generated with the built-in image_gen tool, not an Airova result. The page uses its optimized WebP version.

Image prompt: “Premium cinematic 16:9 stylized-concept hero: elegant translucent iridescent glass portal and flowing chrome film ribbon rising from an obsidian studio plinth. Photorealistic editorial sculpture, center-right composition with generous black negative space on the left. Vivid acid-lime lighting, subtle cyan refraction, tiny magenta highlights. Realistic glass and mirror chrome, atmospheric depth, refined reflected floor. No text, letters, logos, UI, people or watermark.”

## Preview

Serve the repository root with any static HTTP server, then open `/airova/`. The older frontdoor preview server and public-link test have route allowlists that do not include this independent page.
