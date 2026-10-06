# ตอนต่อ — /short prototype

Responsive, buildless Thai AI story discovery, viewing and comic-reading prototype in the existing Teem website. Working name: ตอนต่อ / TONTOR.

## Preview

Run `node short/preview.mjs`, then open `http://127.0.0.1:4317/short/`.
No package installation or build required. The preview server binds to loopback and serves only this prototype and its six existing local Thai/Latin font files.

Public release target: `https://www.myclover.com/short/` on the existing Vercel `teem` project, production branch `main`. Public availability must be verified after deployment; a local preview or Git push alone does not confirm it.

## Sharing

- Homepage brand card: `assets/og/tontor-v2.jpg` (1200 × 630 JPEG), with the prominent original logo, ตอนต่อ — เรื่องสั้น ความรู้สึกยาว, and the explicit description แหล่งรวมละครสั้น แอนิเมชัน และการ์ตูน AI ภาษาไทย.
- Twelve per-story cards: `assets/og/<story-id>-v2.jpg`. All pages include Open Graph and Twitter large-image metadata directly in HTML, so link scrapers do not need JavaScript. Versioned image URLs refresh image caches; previous cards remain available for existing links.
- Share URLs use `/short/story/<story-id>/`, with an optional `?episode=<n>`; the legacy `?story=<id>&episode=<n>` links still work.
- `node short/build-share-pages.mjs` regenerates the twelve static pages from the homepage and catalog. `node short/render-og.mjs` builds all thirteen share cards using generated artwork and exact Thai text rendered with the existing local fonts.
- OG background generated with the built-in image_gen tool: `assets/og-background-v1.webp`. Complete prompt set, including this composition: `assets/prompts.json`. Authoring files and local QA scripts are excluded from the public deployment by `.vercelignore`.

## Included

- Film-first discovery: nine short films by default, four film-only hero picks (romance, Thai horror, naga fantasy and comedy). Animation and comics remain available through format tabs.
- Hero supports horizontal touch swipes, mouse dragging, wrapping arrow buttons, direct slide selection and keyboard arrows. Vertical touch scrolling stays native; no automatic rotation interrupts reading. Desktop artwork uses a bounded frame with original poster proportions and a soft backdrop, avoiding portrait-to-banner cropping.
- Twelve fictional Thai stories across live-action-style dramas, animation and a readable comic. Includes Thai ghosts, naga mythology, literary reinterpretations and village/workplace comedy alongside romance, BL and period drama.
- Four Thai-theme collections and separate format/genre filters. New concepts: กระสือแถวบ้าน, นาคสายมู, ทศกัณฐ์ แผนก HR, หนุมาน เด็กส่งของ, วันทอง ไม่ขอเลือก and ผู้ใหญ่บ้าน อินฟลูฯ.
- Featured-story selector, genre filtering, search by title/genre/creator/province, creator-to-story links, empty states.
- Vertical video player, episode selection, three free episodes, explicit confirmation to spend ten demo coins per later episode.
- Three-page illustrated HR comic with Thai captions, scroll-position restoration and the same episode-unlock flow.
- Expandable creator/AI/content provenance, concept age guidance, content warnings, remaining full-series coin price and transparency dialogs. No fake verification badges, ratings or audience counts.
- Demo coin packs with no checkout, saved stories, resume playback, direct story/episode links.
- Browser-local persistence, native modal focus handling, keyboard controls, reduced-motion support, mobile bottom navigation.

## Demo boundaries

All titles, people, studios, episode counts, classifications, and plots are fictional Thai-themed sample data. They are not attributed to real Thai filmmakers. Posters and comic pages were produced with the built-in image_gen tool; their complete prompt set is `assets/prompts.json`. Each of the eleven video stories has one silent animated-poster video, reused across its fictional episodes. The comic reuses its three sample pages across demo episodes. No existing film or third-party trailer is included. Age guidance is conceptual and does not claim an official classification.

Assets: `assets/{rain,north,ghost,warrior,office,period,krasue,naga,hanuman,wanthong,village}.webp` and matching `.webm` clips; `assets/hr.webp` and `assets/hr-page-{1,2,3}.webp` for the comic. The generation originals remain outside the repository; optimized project assets are included here. The existing IBM Plex Sans Thai fonts are reused from `../routinex/build/fonts/`. Recreate selected clips with `node short/render-motion.mjs krasue naga hanuman wanthong village` while the preview server is running.

No login, remote analytics, payment gateway, uploads, real wallet, or creator payouts. Stored preferences and progress are local to this browser. Coin limits and access checks are only a demonstration; they are not suitable for paid content protection.

## Verification

`node short/verify-hero.mjs` verifies six viewport widths through 2560px, all four film slides, arrow/keyboard wrapping, mouse drag thresholds, native touch swipes versus vertical scrolling, and selected-film playback. The same `SHORT_BASE_URL` and `SHORT_PROOF_DIR` overrides apply.

`node short/verify.mjs` uses the bundled Playwright runtime or `SHORT_PLAYWRIGHT`/`SHORT_CHROME` overrides. It verifies desktop/phone/tablet layout, all eleven playable local clips, search and genres, Thai collections and format filters, favorites, video/comic progress restoration, three comic pages, locked episode confirmation and repeat unlock behavior, remaining coin price, transparency dialogs, coin packs, deep links, malformed or unavailable browser storage, and absence of page errors. Screenshots are written to `/private/tmp/tontor-qa` by default or `SHORT_PROOF_DIR`.

`SHORT_BASE_URL=https://www.myclover.com node short/verify.mjs` runs the same browser checks against the public website. `SHORT_VERIFY=reading` focuses on reading and sharing; `SHORT_VERIFY=sharing` focuses on metadata, share images and deep links. Screenshots and results remain outside the public repository.

All release commits should include only `short/`, its routing rules and development-file exclusions. Preserve unrelated source-shelf work and other pending local changes.
