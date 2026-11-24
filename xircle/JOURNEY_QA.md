# Xircle welcome page — validation

Updated 2026-11-24. This records what was checked for the welcome page at `/xircle/`. It does not certify production deployment, health outcomes, app installation or every external video player.

## Scope

`index.html`, `welcome.js`, `welcome.css` and `assets/welcome/`. The 49 reference pages and their shared navigation are unchanged.

## Evidence on 2026-11-24 (local, working tree, before commit)

Automated, run with Node 22:

- `node --test xircle/route-contract.test.mjs xircle/company-boundary.test.mjs xircle/knowledge-access.test.mjs` — 13 of 13 passed. These now assert the welcome runtime, the legacy `#start` / `#routine` anchors, no form or personal funnel, no browser storage or network call in the runtime, no `<iframe>` or autoplay in the HTML, the opening film, nine episodes with distinct 16:9 and 9:16 IDs, matching story links, and that every local cover, preview and image exists.
- `node xircle/build/journey-shell.mjs --check` — "50 pages" verified; the root is skipped.
- `node --check xircle/welcome.js` and `git diff --check` — clean.

Observed in a Chromium browser pane against a local static server, at 1440×900 and 375×812:

- No console errors and no failed local requests on load. No request to YouTube before Play.
- English switch, eighth release (checked locally before commit, 1440×900 and 375×812): after switching, no visible Thai text or label is left except the switch itself; the tour and episode links are hidden; Play opens `SKO2pAW8xMs` with its English title; the weigh button and the chapter name in the bar change language when the page rewrites them; switching back restores every Thai text, the Thai film and the plain address; `?lang=en` opens the page in English; no horizontal page scroll in either language.
- Seventh release (checked locally before commit, 1440×900 and 375×812). The highlights run Band, Scale, Food Scan, Sleep, MaxAge. Sleep card: the film sits beside the app's sleep screen (above it on narrow screens); the row for the stage on screen lights, the line is drawn up to the current moment, and the durations, score ring and Restorative sum arrive with the morning shot. MaxAge card: when the ring closes, the panel rises with the three inputs and the markers for actual age, Bio Age and Max Age; the day letters fade. No label covers another; no horizontal page scroll.
- Sixth release (checked locally before commit). Hero at 1440×900, 2000×800 and 1024×680: the film fills the first screen, the headline is readable on the frosted top, the montage plays almost in focus with the feature label following the shots, and the pointer lens shows the frame sharp; at 375×812 the cover image and caption are unchanged and the montage file is not requested. Food Scan card at 1440×900 and 375×812: the five dish labels come in one by one with their three numbers, "+n" chips travel to the totals, and the totals end at 49 / 96 / 35 g and 895 kcal; labels do not cover each other or the totals.
- Hero stage on wide screens, fifth release (checked locally before commit at 1440×900, 2000×800 and 1024×680): the stage is 1392×580, 1480×490 and 976×415; the montage plays out of focus, the feature label and progress marks follow the shots, the pointer lens shows the frame sharp, the montage pauses while the film dialog is open or the hero is off screen and resumes after. At 375×812 the cover image and caption are unchanged and the montage file is not requested.
- Hero film: Play opens the dialog and the film plays from `youtube-nocookie.com`; closing removes the player.
- Highlights: five cards, dot navigation, the two clip cards play their previews when centred.
- Band scene: clock runs 22:30 → 06:30, four captions in turn, sleep line draws, dawn light rises. Colour picker swaps all four colours.
- Band scroll sequence and Scale HUD card (second release, checked locally at both widths before commit): all 74 frames load at 1440 px and 38 at 375 px, the product turns and the light and dawn pass with scroll, the still photo shows until the frames are ready; the HUD card shows the five values with leader lines (wide) or as a grid of chips (narrow). No console errors, no horizontal scroll.
- 24/7 card in the Band chapter, fifth release (checked locally at 1440×900 and 375×812 before commit): the dawn clip plays once when the card is half in view and starts again when the card returns; the seven week marks fill and the charge mark lights; text beside the clip on wide screens, above it on narrow ones; no horizontal page scroll.
- Sleep card, fifth release (checked locally at both widths before commit): the one-night film plays once with the Band on the sleeper's wrist, and the stage label under it follows the shots.
- Scroll rework (same release): the highlights are pinned and vertical scroll carries all five cards past, resting on each; dots jump to a card; the manifesto shows three short lines one at a time. Checked at 1440×900 and 375×812: no horizontal page scroll, no failed requests.
- Highlight cards, fourth release (checked locally at both widths before commit): the Band card plays the montage; the food card shows dish names and the macro readout over the scan clip; the Habit Score card plays once and shows the score when the ring closes. Labels stay on their dishes and pillars in both layouts.
- Highlight clips (third release, checked locally at both widths before commit): the Scale card loops its rings-of-light clip under the HUD; the bedside card plays night to morning once, holds on the real photo, and starts again when the card comes back to the front. Clips load only when their card is active.
- Band light sweep (added after the first release, checked locally at both widths): two passes of light cross the product during the night scene and none shows at rest, with reduced motion or without script.
- Scale: the display counts up to the sample value, footprints and the five value cards appear, "ชั่งอีกครั้ง" replays.
- App chapter: the phone changes screen with each part of the story (wide); each part carries its own screen (narrow).
- Tour: wide layout previews advance through the list and the stage opens the 16:9 upload with previous/next; narrow layout plays the centred card's 9:16 preview and opens the 9:16 upload in a vertical player. EP.8 and EP.9 were opened from story links and next/previous; EP.1 and EP.4 from the narrow rail.
- `?ep=3` lands on the tour with EP.3 selected; `?ep=3&ep=5` is ignored.
- Narrow layout has no horizontal page scroll (`scrollWidth` equals the viewport width).
- With the `js` class removed, the Band scene lays out flat with all four captions visible.

Not done: no run with the operating system's reduced-motion setting switched on (only the flat layout it shares with the no-script path was inspected), no Safari, Firefox or physical phone, no production check. `landing.e2e.mjs` belongs to the retired landing and will fail against this root; a browser harness for the welcome page has not been written yet, so `npm run test:xircle:journey` is not evidence for this page.

## Required checks before delivery

```sh
node --test xircle/route-contract.test.mjs xircle/company-boundary.test.mjs xircle/knowledge-access.test.mjs
node xircle/build/journey-shell.mjs --check
node --check xircle/welcome.js
git diff --check
```

Then, in a visible browser at a wide and a narrow width: play the opening film; open one episode from the tour and one from a story link; check the narrow tour opens the vertical upload; run the scale demo; pick each Band colour; confirm the store links, the three setup tutorials and the "go deeper" links. Automated tests cannot certify live YouTube delivery, app installation, sign-in or purchase.

Keep any result tied to the tested revision. A local or preview pass does not establish production deployment.
