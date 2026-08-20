# TeamBook asset migration manifest

Generated for the source-first migration on 2026-08-20.

## Runtime status

- Missing static references: **0**
- Ready card/registry references: **125**
- Deferred card/registry references: **8**
- Runtime asset checks: `node scripts/check-assets.mjs` and `node scripts/check-registry-assets.mjs`
- `/core7` assets: intentionally excluded; TeamBook has no CORE7 runtime dependency.

## Deferred, non-runtime asset batches

These optional decor-library sources are not referenced by the bootable app and may be copied later in small batches:

- `assets/decor/sticker/`
- `assets/decor/stationery/`
- `assets/decor/doodle/`
- `assets/decor/_source/`
- `assets/decor/README.md`
- `scripts/build-decor.py`

Do not fetch a repository archive or run Git LFS to obtain them. Add only a requested batch after preview acceptance.

## Deferred runtime card-art batch

The source copy contained these paths as 0-byte placeholders. They are excluded
from the commit so a placeholder cannot be mistaken for a valid image:

- `assets/cards/epic/orange-cat-blue.webp`
- `assets/cards/epic/orange-cat-green.webp`
- `assets/cards/epic/orange-cat-red.webp`
- `assets/cards/epic/orange-cat-silver.webp`
- `assets/cards/epic/white-cat-blue.webp`
- `assets/cards/epic/white-cat-green.webp`
- `assets/cards/epic/white-cat-red.webp`
- `assets/cards/epic/white-cat-silver.webp`

Fetch or copy this exact eight-file batch only after the preview app boots.
