# Route guard — /xircle/

Updated 2026-11-24. The owner asked for the root to become the **welcome page for Xircle customers** (and for people still deciding): open with the two-minute overview film, tell the story in the Apple Watch product-page manner, keep the focus on the real Xircle Band and Xircle Scale, and tour the app through the nine one-minute episodes. This replaces the 2026-11-09 real-app landing as the root experience.

## Current journey

**Welcome + overview film → highlights → tonight: Xircle Band → tomorrow morning: Xircle Scale → through the day: the app → nine one-minute episodes → start in 3 steps → go deeper.**

The page is told as the visitor's first day. The background moves with it: daylight at the top, dusk into a night scene for the Band, dawn for the Scale, daylight again for the app.

- Root: `/xircle/`; preserve existing case/slash aliases. Active root files are `index.html`, `welcome.js` and `welcome.css`, with assets in `assets/welcome/`. The retired `landing.*`, `media-library.*` and `brand-experience.*` files are not loaded by this page.
- Legacy entries still resolve through `route-contract.js`: `#start` is the three-step setup section and `#routine` sits on the "go deeper" section that links to `/routinex/`.
- `?ep=1`…`?ep=9` (one value only) selects that episode and brings the tour into view. It never starts playback.
- Native scrolling throughout. One pinned scene (the Band at night) reads its own scroll progress; everything else is ordinary flow with reveal-on-scroll. No scroll interception, no motion library, no browser storage, no network calls from the runtime.
- Videos: the opening film `MU9jlnp__pg`, the nine episodes and the official setup tutorials are plain YouTube links in the HTML. With JavaScript, a `youtube-nocookie.com` player is created inside `#video-dialog` only after Play and removed on close. Episodes use the 16:9 upload on wide screens and the 9:16 upload at 820 px and below. Muted local previews (`assets/welcome/tour/`) load only when their card is on screen.
- The Band in the night scene turns and catches light as the visitor scrolls: 74 frames of one generated presentation clip of the real product photo, drawn on a canvas. It is labelled on the page, loads only near the scene, and falls back to the real photo with a CSS light sweep (reduced motion, data saver, no script, or a failed frame). The Scale highlight card is a generated top-down scene with an HTML HUD naming the five values. Two highlight cards play short generated clips when they are in front (rings of light from the scale; a bedside night turning into morning). Both are labelled, muted, loaded only when their card is active, and replaced by a still with reduced motion or without script.
- The Band night scene, the scale "step on" demo, the Habit Score rings and the MaxAge line are illustrations with sample numbers and are labelled so on the page. The scale demo does not read a device, ask for input or store anything.
- No personal booking, referral funnel, Teem/Ako presentation, TeamBook handoff, form or personal contact belongs here. Device copy stays inside the communication boundary (`doc/xvisor/claims/`) and carries the official "not a medical device" line.

## Assets, facts and destinations

Sources for every image and preview, and the official page each product statement came from, are in [assets/welcome/README.md](assets/welcome/README.md). Battery life is deliberately not printed: the official pages give two different figures.

App links are unchanged: `https://apps.apple.com/th/app/id6785562482`, `https://play.google.com/store/apps/details?id=health.xircle.app` and `https://www.xircle.health/download`. Buying goes to the official product page's purchase section. The review wall (`/review/`), ห้องความรู้ (`/xircle/learn/`), hardware reference (`/xircle/hardware/`), `/routinex/` and the official site are linked from "go deeper".

All **49 reference pages** remain directly readable. `build/journey-shell.mjs` maintains their shared navigation and skips the root because the welcome page owns its header and footer.

## What the previous landing had that this page does not

The interactive food-scan example, the ten-clip official media library with category queues, the HabiX product strip and the four "Coming soon" Routine X episode cards were part of the 2026-11-09 landing and are not on the welcome page. Their files remain in the repository. The official setup tutorials for the app, Band and Scale are linked from the three-step section; the food-scan recording plays inside the phone in the app chapter.

## Fallbacks and verification

Reduced motion lays the Band scene out flat, stops previews and timed galleries, and shows the scale values without the animation. Without JavaScript the same flat layout applies and every video is a normal YouTube link. Run [JOURNEY_QA.md](JOURNEY_QA.md) against the current revision before delivery, and do not describe a local pass as a production deployment.
