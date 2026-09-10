# X-VISOR developer checks

The player entry is `/xvisor/`; the playable game is `/xvisor/quest/`.
No fixture or test controls are imported by either player page.

Run `npm run test:xvisor` for the unit and release checks. With a local static
server at `http://127.0.0.1:4186`, run these browser checks:

- `npm run test:xvisor:entry`: the real landing page, play, reload/resume and old
  preview-link recovery, with no game fixture injection.
- `npm run test:xvisor:ui`: gameplay, scenes and responsive dialogs.
- `npm run test:xvisor:loading`: warm-cache dependencies and startup recovery.
- `npm run test:xvisor:income`: income channels and Month 1–24 comparisons.
- `npm run test:xvisor:story`: play the full tutorial through Month 2, mentor identity, Routine choices, and optional encounters.
- `npm run test:xvisor:scenes`: desktop/mobile Live sales, individual receipts, visible action scenes, and old saved-plan recovery.

Focused follow-up checks (set `XVISOR_BASE_URL` to the isolated test server):

- `node tests/xvisor/game-retention.e2e.mjs`: real sale feedback, recurring paid base, direct-member own use, pauses and returns at 1440/390/320px.
- `node tests/xvisor/game-recurring-people.e2e.mjs`: paired and member-only renewal actions, care, receipts and reload protection.
- `node tests/xvisor/game-npc-visual.e2e.mjs`: varied NPCs, matching portraits, standing/seated artwork and stable reloads. The art gallery is injected only into the isolated QA browser.

Browser checks require Playwright and Chromium. `XVISOR_PLAYWRIGHT` may point to
the installed Playwright module, `XVISOR_CHROME` to Chrome, and `XVISOR_BASE_URL`
to the local server. Every harness uses isolated browser storage and blocks
API traffic; never point fixture tools at a player's existing browser profile.

The optional local scene viewer is `/tests/xvisor/quality-preview.html`. It
uses in-memory saves, blocks its iframe's API requests, and is restricted to
localhost. Its import map and the player shell must share the same release tag.
The old `/xvisor/quest/quality-preview.html` link now opens the actual game.

This directory is excluded from Vercel deployment by `.vercelignore`. Other
static publishers must also exclude `tests/xvisor/` and `docs/xvisor/` from
their publish output. Tests stay in Git for CI and future maintenance.
