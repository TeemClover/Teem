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

## Interaction

- Showcase uses four locally stored MP4 files sourced from Airova's public marketing site, reused at the user's request. Video is loaded only when a viewer opens it. Native playback controls; Escape, close button and backdrop close the dialog and stop playback.
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
