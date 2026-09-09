# Repository guidance — Source shelf

These rules apply to source/knowledge work. They do not authorize unrelated product, game, database, deployment, or asset changes. Preserve existing subsystem instructions and files.

## Canonical source workflow

- The user's source shelf is `/shelf/source/`; its human entry point is `/shelf/`.
- Before finding, updating, or creating a sauce/Source, read `shelf/catalog.json` and `shelf/README.md`, then read the relevant file in full. Search title, ID, tags, and filename aliases; do not rely on chat memory alone.
- New reusable sources and new revisions belong under `shelf/source/<category>/`. Reuse the existing stable ID/path for an update rather than creating a second competing latest file.
- Existing sources elsewhere in the repo remain valid for their original scope. Do not delete, move, or silently override them; link or explicitly reconcile them when requested.
- Follow `shelf/source/TEMPLATE.md` for new sources. Keep source dates, compilation dates, update dates, and shelf import dates distinct. Use ISO dates and Arabic numerals.
- Record a version and changelog. An import or formatting fix does not mean facts were reverified or a company approved the text. Preserve SOURCE / COMPANY CLAIM / DERIVED / OPEN distinctions and unread-audio limitations.
- Update the source, `shelf/catalog.json`, `shelf/README.md`, and `shelf/CHANGELOG.md` together. The web index reads the catalog; avoid a second hardcoded catalog in JavaScript.
- Validate with `node shelf/validate.mjs` before committing. Preserve Git history; do not force-push. If another writer advanced the branch, reread/reconcile before retrying.
- This repository is public. Store only the requested shareable sources. Do not add private audio, personal health/financial details, credentials, or private conversation transcripts by default. `noindex` is not access control.
- Report the actual branch/commit and whether the live website was verified. Do not call a commit a successful production deployment without checking.
