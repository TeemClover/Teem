# TeamBook asset manifest

Every runtime reference below resolves inside the Vercel Root Directory
`teambook`. `npm run check:assets` rejects missing files, empty files, Git LFS
pointers and invalid PNG/JPEG/WebP signatures.

| TeamBook Path | Purpose | Original Source | Runtime Reference | Status |
|---|---|---|---|---|
| `assets/brand/` | TeamBook logos and marks | copied from legacy TeamBook source | HTML metadata and navigation | READY |
| `assets/start/` | Start/onboarding illustration | copied from `/xty/assets/start/` | `/start/` | READY |
| `assets/activity/` | Activity catalog art | copied from `/xty/assets/activity/` | `_shared/activities.js` | READY |
| `assets/avatars/` | Free profile avatars | copied from `/xty/assets/avatars/` | `_shared/avatars.js` | READY |
| `assets/pets/` | TeamBook PET art | copied from `/xty/assets/pets/` | `_shared/pets.js` | READY |
| `assets/cards/common/` | Common card fronts | copied from `/xty/assets/cards/common/` | `_shared/cards.js` | READY |
| `assets/cards/rare/` | Rare card fronts | copied from `/xty/assets/cards/rare/` | `_shared/cards.js` | READY |
| `assets/cards/epic/white-pom-*.webp` | Published Epic card fronts | copied from `/xty/assets/cards/epic/` | `_shared/cards.js` | READY |
| `assets/cards/legendary/` | Legendary card fronts | copied from `/xty/assets/cards/legendary/` | `_shared/cards.js` | READY |
| `_shared/xty.css`, `_shared/card-ui.js`, `_shared/card-reveal.css` | Card backs and frames | refactored local CSS/HTML | card collection and reveal UI | GENERATED LOCALLY |
| `_shared/audio.js` | UI sound effects | TeamBook Web Audio synthesis | browser interaction feedback | GENERATED LOCALLY |
| `assets/decor/` | Optional decoration library | legacy source | no boot/runtime reference | NOT SHIPPED |
| `assets/cards/epic/orange-cat-*.webp` | Future Epic card batch (4) | no valid binary found in repository | not present in card catalog | NOT PUBLISHED |
| `assets/cards/epic/white-cat-*.webp` | Future Epic card batch (4) | no valid binary found in repository | not present in card catalog | NOT PUBLISHED |

The eight unpublished Epic paths existed only as zero-byte placeholders. They
are deliberately absent from the catalog and commit. When reviewed art arrives,
copy exactly that small batch, run `npm run check:assets`, then add the cards to
`PRINTED.epic`; never fetch a repository archive or wait for Git LFS.

No runtime image, font, audio or card asset is loaded from GitHub, myClover,
`/xty`, `/core7`, root `/assets`, or another repository directory.
