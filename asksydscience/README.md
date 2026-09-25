# AskSydScience demo

Responsive editorial demo based on the supplied AskSydScience v0.1 kit and concept image. This README and build/QA inputs are excluded from Vercel output.

## Entry points

- `/asksydscience/` on the main site.
- `https://asksydscience.myclover.com/` via the host-specific Vercel rewrite.
- All assets use `/asksydscience/` URLs, so both entry points share one output.

## Build and verify

Edit `tools/asksydscience/site.th.json` for Thai copy. Run `python3 tools/build-asksydscience.py`, `python3 tools/asksydscience/validate.py`, and `node --check asksydscience/app.js`.

## Experience

Mobile disclosure navigation; three-topic story filter; starting-point choices; native detail dialogs with Escape/focus return; keyboard-accessible four-week workshop tabs; FAQs; and an explicit local review drawer. Its counts are memory-only and reset on refresh. There is no analytics transport, form, account, checkout, or health-data collection.

Without JavaScript, stories and all four weeks remain readable. Motion respects reduced-motion preferences. Story and workshop content remains proposed demo material; missing destinations remain null. AI portrait and room assets have visible demo attribution. The editorial illustrations are also AI demo images based on the supplied art direction. Fonts are self-hosted IBM Plex Sans Thai under OFL.

User requested publication of the demo; that does not approve opening registrations, selling products, or treating proposed content as verified episodes. See `docs/asksydscience/` for QA and image provenance.
