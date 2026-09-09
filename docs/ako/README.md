# ครัวสลัดเอโกะ

The useful food destination is [/ako/kitchen/](../../ako/kitchen/index.html). [/ako/](../../ako/index.html) leads with the kitchen while retaining Ako's existing real video, story, social accounts and onward XIRCLE/Meet links. Brand files and original media were not replaced.

The kitchen opens with one complete recipe already visible. The fifteen-recipe browser is optional. Each recipe has a static public URL, for example `/ako/kitchen/ginger-chicken-cabbage/`, with its own canonical URL, Open Graph preview and Recipe JSON-LD. The old `/ako/kitchen/#tomato-lime` bookmarks still work. Internal navigation keeps a valid existing handoff; public share links deliberately strip all handoff and query values. Home, story and kitchen load the existing outcomes module; the central outcome registry is maintained by the Front Door owner.

## Recipes and useful behavior

- `tomato-lime`: cherry tomato, cucumber and lime salad, about 5 minutes.
- `tomato-sesame`: the same vegetables with toasted sesame, about 7 minutes.
- `egg-crunch`: hard-boiled egg salad with yogurt mustard dressing, about 15 minutes.
- `tofu-rice`: a warm rice bowl with tofu, mushrooms and broccoli, about 20 minutes with cooked rice.
- `yogurt-mustard`: creamy yogurt dressing, about 3 minutes.
- `soy-lime`: a light soy/lime dressing, about 3 minutes.
- `peanut-lime`: peanut dressing or dip, about 5 minutes.

[recipes.js](../../ako/kitchen/recipes.js) owns quantities, steps, substitutions, technique and ingredient/allergen notes. The eight Japanese-inspired everyday additions use a one-person base; the seven original recipes retain their existing two-person quantities and IDs. [Recipe provenance](recipe-provenance.md) records actual primary sources, adaptations and limits for the additions. Recipes are editorial home-cooking starting points, not claims that Ako personally tested each one or achieved medical, calorie or weight outcomes. Photos are labeled recipe illustrations; the two Front Door tomato images match their respective recipes. [KITCHEN-ART.json](KITCHEN-ART.json) retains full built-in image generation prompts and source paths for three new illustrations. Sharp only resized and encoded those outputs; the originals remain in their generated source location.

Portions can be set to 1, 2 or 4. Cook mode keeps ingredients and larger checkbox steps in view. Recipe selection, portions, saved recipe IDs and the current recipe's completed steps use only `myclover:ako:kitchen:v1`. A verified read-back is required before reporting successful durable save. Unavailable storage leaves the current recipe functional in memory and shows failure clearly. No legacy, installation, achievement, Meet draft or existing progress key is changed. This local recipe bookmark does not emit the Front Door durable SAVE event.

## Verification

```sh
node tools/build-ako-recipes.mjs
node tools/build-ako-recipes.mjs --check
node --test tests/ako/*.test.mjs

AKO_BASE_URL=http://127.0.0.1:4174 \
FRONTDOOR_PLAYWRIGHT=/path/to/playwright/index.mjs \
FRONTDOOR_CHROME=/path/to/chrome \
node tests/ako/kitchen.e2e.mjs
```

`AKO_PROOF_DIR` optionally selects an evidence directory. The browser script expects the local preview already running; it does not alter the server, mock API responses or submit appointments.

September 10 verification: 9 focused tests passed. Real local Chrome QA passed at 390×844 and 1440×1000: home to kitchen, every recipe, matching loaded images, portions, save/reload, retained completed steps, recipe shelf, cook mode, completion/restart and blocked storage. No page errors, failed image responses or horizontal overflow. Tests also verify legacy installation, reading progress and a pre-existing Meet draft remain unchanged. The first recipe is complete in static HTML for JavaScript-disabled reading. Physical iPhone Safari and live deployment remain outside this verification.

## Recipe publishing and sharing

Edit `ako/kitchen/recipes.js`, then run `npm run build:ako`. It updates the library, fifteen static recipe pages, the small catalog used by Stat and the sitemap recipe block. Do not hand-edit generated recipe pages. Native share uses the current recipe title and clean public URL. Clipboard, manual selection and LINE prefill are fallbacks; no message is sent automatically. Print layout retains the full recipe. Each recipe remains readable without JavaScript, including source links and ingredient substitutions. Ingredient search stays entirely in memory.

Static recipe reads join an existing, valid Compass handoff as destination receipts. They never create a new Front Door installation or OPEN event; unrelated direct/share visitors are not silently counted as Compass visitors. Recipe-level Stat counts describe this linked cohort only.
