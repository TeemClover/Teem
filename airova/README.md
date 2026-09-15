# myClover × Airova Official Partner

Static landing page: `/airova/` (with `/airova` redirect). Thai partner page for myClover. Built 2026-09-15.

## Content and destinations

- All account creation buttons use `https://studio.airova.ai/auth/join?via=MYCLOVER`.
- **Current offer, clarified by the user on 2026-09-16: 50 free introductory credits, a partner privilege from myClover when signing up through `https://studio.airova.ai/auth/join?via=MYCLOVER`.** This is 50 credits total. Ordinary signup without a referral does not receive this partner benefit; other partners may also offer benefits. Do not describe myClover as the sole provider or use “myClover only”. myClover Official Partner status is user provided.
- Benefits: special discounts, Thai support directly from the platform, courses, community, free templates, activities and promotions. No invented discount rate, event date, or course price.
- Partner follow-up uses existing myClover LINE destination `https://lin.ee/rlSlhzT`.
- Airova community destination comes from its public homepage.
- Course title and subjects verified from https://www.piracademy.com/course/seedance-advanced-video-production.
- Airova's connected `list_models` catalog verified Omni and Seedance 2.5 available on 2026-09-15. Public homepage copy is older; do not downgrade this to a coming-soon claim based only on that copy.

## Visual partner story

- The main story uses three original illustrations for Learn → Create → Grow, with short pain prompts and actions that lead to the course, Airova signup, and community.
- The compact myClover × Airova strip focuses on organization-level partner advantages: special offers, Thai support, learning, and ongoing community activities. Personal names and biographies are omitted.
- The visual marketing flow connects brand → content → Thai video → scheduled posting. The complete official tool list remains linked: https://studio.airova.ai/blog/update-creative-agent-toolkits.
- New story illustrations are generated editorial concepts, not photographs of a real company workshop, platform screenshots, or Airova model outputs. Prompts and provenance are recorded in `_source/story-image-prompts.md` and `assets/sources.json`.
- Existing video wall, free templates, official academy course, signup offer and MCP Ready branding are retained. Course and FAQ text are shortened.

## Social sharing

- Facebook/Open Graph and Twitter use `assets/airova-share-50-privilege-v11.png`, a 2400 × 1260 lossless PNG retaining the preferred original campaign and MCP badge. The offer reads “ฟรี 50 เครดิต” and the CTA reads “สิทธิพิเศษจาก myClover”.
- Metadata complements the image with world-class AI for Thai users and the complete marketing workflow: brand building, content planning, image/video production, and scheduled multi-platform posting. The complete built-in generation prompt and provenance are in `share-preview-prompt.md`.
- The preview uses the original canonical myClover icon and Airova SVG as separate image layers, preserved in `_source/share-preview-v3.html`. Generated v2 logos were incorrect and that image is retired from the public allowlist.
- V4 preserves that approved image and adds a compact bottom-right MCP Ready badge with original ChatGPT and Claude symbols. The editable badge lives in `_source/share-preview-v4.html` and logo provenance in `assets/sources.json`.
- V11 corrects the CTA to “สิทธิพิเศษจาก myClover” and removes sole-provider implications across active page copy and downloads. Signing up through the referral remains the condition. Only the CTA image region changes; the 50-credit number and approved artwork remain intact. Renderer: `_source/share-preview-v11.html`; built-in edit prompt: `_source/share-v11-prompt.md`.
- Earlier V10 changes only the offer number and CTA on the approved V9 image, using two small patches from a built-in imagegen edit. The portrait, typography outside the offer, official logos, light trails and MCP module remain the original V9 pixels. Editable composition: `_source/share-preview-v10.html`; prompt: `_source/share-v10-prompt.md`. Earlier source prompts and versioned artwork are historical records of the superseded 30-credit campaign, not current offers.
- Earlier V9 preserves the supplied early campaign directly. A surgical built-in imagegen brand erase supplies only a small top-left patch; canonical logos replace the incorrect marks. The bottom-right MCP Ready badge uses a dark glass panel, cut corners, a cyan/violet rim, and original ChatGPT/Claude marks. Editable composition: `_source/share-preview-v9.html`; prompt: `_source/share-v9-prompt.md`. No portrait mask or cutout is used.
- Earlier V8 uses a fresh built-in imagegen scene with the original portrait clipped as a native image layer, preserving the original face and colors. Native Kanit typography, canonical partner logos and original social/client marks are rendered in `_source/share-preview-v8.html`. Prompt: `_source/share-v8-scene-prompt.md`; platform evidence: `_source/share-v8-platform-sources.md`. Direct canvas export avoids screenshot scaling and repeated JPEG compression.
- Earlier V7 emphasizes the complete workflow through repeated product imagery, large video frames, social posts, and a calendar/clock. It uses no owner portrait or personal names. Native composition: `_source/share-preview-v7.html`; built-in imagegen prompt: `_source/share-v7-workflow-prompt.md`. The final PNG is exported directly from a native canvas to avoid screenshot scaling and JPEG degradation.
- Earlier V5 starts with fresh artwork from the original portrait, preserving vivid cobalt, violet and lime colors. All Thai copy and original logo layers are newly rendered from `_source/share-preview-v5.html`; it does not reuse a flattened JPEG. Background generation is native 1730 × 909; text and vectors are rendered at 2×. Prompt: `_source/share-v5-prompt.md`.
- The image has a new filename; previously cached Facebook cards may need a re-scrape in the Sharing Debugger.

## Interaction

- The clearly labelled demo reveals the existing examples in four batches of four, one every 620 ms. It makes no generation API calls and spends no credits. The readonly prompt describes each sample batch.
- Hidden cards remain inert and have no video source. Revealed clips retain the existing wall controls. Backgrounding the page suspends the sequence; reset cancels pending timers. Without JavaScript, the original 16-clip gallery remains available.
- “ลองสร้างของคุณเอง” is always available and links to the MYCLOVER referral; it becomes the primary action after 16 clips. No automatic navigation.
- Controller verification: `node --test airova/demo-controller.test.mjs`.

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
