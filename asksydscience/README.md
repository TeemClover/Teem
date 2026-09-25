# AskSydScience demo

Responsive, cream-and-sage house demo based on the supplied AskSydScience brief and concept image. This README and build/QA inputs are excluded from Vercel output.

## Entry points

- `/asksydscience/` retains the existing hero, followed by three visible reading notes with room photos and a compact workshop invitation. The four room destinations remain available without adding more top-level sections.
- `https://asksydscience.myclover.com/` via the host-specific Vercel rewrite.
- Dedicated rooms: `/asksydscience/kitchen/`, `/asksydscience/mindfulness/`, `/asksydscience/stories/`, `/asksydscience/workshop/`; `/asksydscience/about/` contains Sydney's letter, selected-items area and trust notes.
- `/asksydscience/studio/index.html` for the clearly labelled simulated studio.
- Shared navigation opens real pages. All pages and assets use `/asksydscience/` URLs, so both entry points share one output.

## Build and verify

The builder generates all six public pages from `tools/asksydscience/site.th.json`, `house-experiences.html` and `film-player.html` in the same content directory. Keep source records in `house-copy.json` consistent. The validator checks each page, cross-page fragments, public assets and Studio, then compares all six pages with a disposable rebuild.

```sh
python3 tools/build-asksydscience.py
python3 tools/asksydscience/validate.py
node --check asksydscience/app.js
node --check asksydscience/house-experiences.js
node --check asksydscience/film-motion.js
node --check asksydscience/studio/studio.js
```

Static checks do not replace browser, accessibility, content-rights or medical-evidence review.

## Experience

The entrance now offers a short piece of writing from the kitchen, quiet room and reading room before visitors choose where to go. Each note has a full-frame 3:2 room image, visible text and an ordinary link; the workshop has a smaller invitation underneath. Notes sit in three columns on desktop and one column on mobile, and remain readable without JavaScript. Dedicated rooms still hold the full experiences.

The kitchen lets visitors choose ingredients on an illustrative plate. The quiet room offers 1-, 3- or 5-minute timers and optional synthesized ambient sound. Stories have text, source links and topic filters; the workshop page holds the proposed four-week journey and FAQs.

New `sydney-kitchen-lived`, `sydney-mindfulness-lived` and `sydney-reading-lived` AI images show Sydney participating in the rooms while retaining the surroundings. Each has a 1536-pixel primary asset and an 800-pixel responsive version. The new images are used on the entrance and the relevant kitchen, mindfulness and about pages; the existing hero is unchanged. The workshop book mockup retains the original empty studio background, and the stories room retains its existing media-cover images. The homepage identifies the new scenes as AI images and the notes as samples. Full prompts and composition notes are in the three `docs/asksydscience/*-OCCUPIED-PROMPT.md` records.

Three 28-second editorial animations use a shared, self-contained player with local JavaScript timelines, play/pause, replay, seeking and volume. Optional synthesized sound starts off. These are not filmed episodes or recordings of Sydney's voice. Verified TikTok originals are separate outbound links in the stories room; no third-party player is embedded.

Without JavaScript, story text and all four proposed weeks remain readable, and the quiet room has a static practice note. Motion respects reduced-motion preferences. AI portraits and rooms are labelled illustrations, not evidence of real premises or events. Fonts are self-hosted IBM Plex Sans Thai under OFL.

The studio has four tabs: overview, content drafts, workshop roster and briefs/approvals. Its figures and five roster IDs are fictional; imported-form totals are explicitly separate from click sessions. Draft edits, status changes, queued briefs and sample approval affect only memory. “เริ่มเดโมใหม่” or a reload resets the simulation; nothing is submitted, published or sent to a team.

Public rooms and Studio have no actual analytics, persistent data storage, accounts, checkout, registration processing or health-data collection. Sound is generated locally after an explicit action, and practice/playback pauses when the page becomes hidden.

The user authorized a public demo, not a live service, real registrations, product sales or a confirmed workshop offer. Unconfirmed destinations remain null; proposed stories and service scope remain proposals. See `docs/asksydscience/` for implementation notes and image provenance.
