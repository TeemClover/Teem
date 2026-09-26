# AskSydScience demo

Responsive, cream-and-sage house demo based on the supplied AskSydScience brief and concept image. This README and build/QA inputs are excluded from Vercel output.

## Entry points

- `/asksydscience/` follows the reference's four editorial scenes: Sydney's welcome, 01 polaroid stories, 02 a book-and-gifts still life, and 03 a friendship room with three framed room links. The workshop invitation and framed images lead to the four dedicated rooms.
- `https://asksydscience.myclover.com/` via the host-specific Vercel rewrite.
- Dedicated rooms: `/asksydscience/kitchen/`, `/asksydscience/mindfulness/`, `/asksydscience/stories/`, `/asksydscience/workshop/`; `/asksydscience/about/` contains Sydney's letter, selected-items area and trust notes.
- `/asksydscience/studio/index.html` for the clearly labelled simulated studio.
- Shared navigation opens real pages. All pages and assets use `/asksydscience/` URLs, so both entry points share one output.

## Build and verify

The builder generates all six public pages from `tools/asksydscience/site.th.json`, `home-editorial.html`, `house-experiences.html` and `film-player.html` in the same content directory. The homepage's editorial markup is in `home-editorial.html`, with its dedicated styles in `asksydscience/home-editorial.css`; the shared room styles remain separate. Keep source records in `house-copy.json` consistent. The validator checks each page, cross-page fragments, public assets and Studio, then compares all six pages with a disposable rebuild.

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

The entrance uses a sequence of warm editorial scenes rather than an equal room-card grid. The welcome pairs Sydney's portrait with an introduction. Three polaroids lead into stories, with a separate optional animation control. A book mockup sits within the gifts scene and links to the proposed workshop. The friendship room displays Sydney cooking, meditating and reading in three clickable frames. Static copy and ordinary room links remain usable without JavaScript. The dedicated rooms still hold the full experiences.

The kitchen lets visitors choose ingredients on an illustrative plate. The quiet room offers 1-, 3- or 5-minute timers and optional synthesized ambient sound. Stories have text, source links and topic filters; the workshop page holds the proposed four-week journey and FAQs.

New `sydney-kitchen-lived`, `sydney-mindfulness-lived` and `sydney-reading-lived` AI images show Sydney participating in the rooms while retaining the surroundings. Each has a 1536-pixel primary asset and an 800-pixel responsive version. They appear in the homepage's friendship frames and the relevant kitchen, mindfulness and about pages. The dedicated kitchen and mindfulness pages preserve full 3:2 room views; About places its letter beside the reading scene on desktop and below the full image on smaller screens. The dedicated workshop book mockup retains the original empty studio background, and the stories room retains its existing media-cover images. The homepage labels the scenes and stories as demo illustrations and the book as a mockup, not a real product. Full prompts and composition notes are in the three `docs/asksydscience/*-OCCUPIED-PROMPT.md` records.

Three 28-second editorial animations use a shared, self-contained player with local JavaScript timelines, play/pause, replay, seeking and volume. Optional synthesized sound starts off. These are not filmed episodes or recordings of Sydney's voice. Verified TikTok originals are separate outbound links in the stories room; no third-party player is embedded.

Without JavaScript, story text and all four proposed weeks remain readable, and the quiet room has a static practice note. Motion respects reduced-motion preferences. AI portraits and rooms are labelled illustrations, not evidence of real premises or events. Fonts are self-hosted IBM Plex Sans Thai and Sriracha for handwritten annotations, both under OFL; their copyright notices and complete licenses ship in `assets/fonts/OFL.txt`.

The studio has four tabs: overview, content drafts, workshop roster and briefs/approvals. Its figures and five roster IDs are fictional; imported-form totals are explicitly separate from click sessions. Draft edits, status changes, queued briefs and sample approval affect only memory. “เริ่มเดโมใหม่” or a reload resets the simulation; nothing is submitted, published or sent to a team.

Public rooms and Studio have no actual analytics, persistent data storage, accounts, checkout, registration processing or health-data collection. Sound is generated locally after an explicit action, and practice/playback pauses when the page becomes hidden.

The user authorized a public demo, not a live service, real registrations, product sales or a confirmed workshop offer. Unconfirmed destinations remain null; proposed stories and service scope remain proposals. See `docs/asksydscience/` for implementation notes and image provenance.
