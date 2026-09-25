# AskSydScience demo

Responsive, cream-and-sage house demo based on the supplied AskSydScience brief and concept image. This README and build/QA inputs are excluded from Vercel output.

## Entry points

- `/asksydscience/` on the main site.
- `https://asksydscience.myclover.com/` via the host-specific Vercel rewrite.
- `/asksydscience/studio/index.html` for the clearly labelled simulated studio.
- All assets use `/asksydscience/` URLs, so both entry points share one output.

## Build and verify

The public page is built from `tools/asksydscience/site.th.json` and `tools/asksydscience/house-experiences.html`. Keep the source records and editorial proposal in `tools/asksydscience/house-copy.json` consistent; the validator also uses that file and copies these dependencies into a disposable rebuild.

```sh
python3 tools/build-asksydscience.py
python3 tools/asksydscience/validate.py
node --check asksydscience/app.js
node --check asksydscience/house-experiences.js
node --check asksydscience/studio/studio.js
```

The rebuilt version passed 1,284 static integrity checks. These checks do not replace browser, accessibility, content-rights or medical-evidence review.

## Experience

Four doors lead to the vegetarian kitchen, prayer/mindfulness room, living-room stories and four-week workshop proposal. The kitchen lets visitors choose ingredients on an illustrative plate. The quiet room offers 1-, 3- or 5-minute timers and optional synthesized ambient sound, started explicitly by the visitor.

Three 20-second editorial animations use local JavaScript timelines with play, pause, replay and seeking. They are not filmed episodes or recordings of Sydney's voice. Verified TikTok originals are separate outbound links; no third-party player is embedded. Stories also have readable text and source links, with keyboard-accessible dialogs, filters and workshop tabs.

Without JavaScript, story text and all four proposed weeks remain readable, and the quiet room has a static practice note. Motion respects reduced-motion preferences. AI portraits and rooms are labelled illustrations, not evidence of real premises or events. Fonts are self-hosted IBM Plex Sans Thai under OFL.

The studio has four tabs: overview, content drafts, workshop roster and briefs/approvals. Its figures and five roster IDs are fictional; imported-form totals are explicitly separate from click sessions. Draft edits, status changes, queued briefs and sample approval affect only memory. “เริ่มเดโมใหม่” or a reload resets the simulation; nothing is submitted, published or sent to a team.

The main page's review drawer counts only clicks in the current tab. Neither page has actual analytics, persistent data storage, accounts, checkout, registration processing or health-data collection. Optional room audio is generated locally, and practice/playback pauses when the page becomes hidden.

The user authorized a public demo, not a live service, real registrations, product sales or a confirmed workshop offer. Unconfirmed destinations remain null; proposed stories and service scope remain proposals. See `docs/asksydscience/` for implementation notes and image provenance.
