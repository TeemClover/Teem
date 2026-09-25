# AskSydScience demo

Responsive, cream-and-sage house demo based on the supplied AskSydScience brief and concept image. This README and build/QA inputs are excluded from Vercel output.

## Entry points

- `/asksydscience/` is the short entrance: hero and four room doors.
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

The kitchen lets visitors choose ingredients on an illustrative plate. The quiet room offers 1-, 3- or 5-minute timers and optional synthesized ambient sound. Stories have text, source links and topic filters; the workshop page holds the proposed four-week journey and FAQs. Full room content is not repeated on the entrance page.

Three 28-second editorial animations use a shared, self-contained player with local JavaScript timelines, play/pause, replay, seeking and volume. Optional synthesized sound starts off. These are not filmed episodes or recordings of Sydney's voice. Verified TikTok originals are separate outbound links in the stories room; no third-party player is embedded.

Without JavaScript, story text and all four proposed weeks remain readable, and the quiet room has a static practice note. Motion respects reduced-motion preferences. AI portraits and rooms are labelled illustrations, not evidence of real premises or events. Fonts are self-hosted IBM Plex Sans Thai under OFL.

The studio has four tabs: overview, content drafts, workshop roster and briefs/approvals. Its figures and five roster IDs are fictional; imported-form totals are explicitly separate from click sessions. Draft edits, status changes, queued briefs and sample approval affect only memory. “เริ่มเดโมใหม่” or a reload resets the simulation; nothing is submitted, published or sent to a team.

Public rooms and Studio have no actual analytics, persistent data storage, accounts, checkout, registration processing or health-data collection. Sound is generated locally after an explicit action, and practice/playback pauses when the page becomes hidden.

The user authorized a public demo, not a live service, real registrations, product sales or a confirmed workshop offer. Unconfirmed destinations remain null; proposed stories and service scope remain proposals. See `docs/asksydscience/` for implementation notes and image provenance.
