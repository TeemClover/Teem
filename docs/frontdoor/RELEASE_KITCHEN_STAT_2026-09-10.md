# Ako kitchen, journey Stat and X-VISOR 2.0 integration

This update follows the user's authorization to finish the kitchen/Stat work and
publish to main after local verification. It supersedes the X-VISOR HOLD in the
earlier V6 release: the game owner supplied a new READY for `2.0-release1` and a
complete manifest. No score or saved-state reset is authorized or performed.

## Delivered changes

- Fifteen practical recipes, including eight original Thai adaptations of
  Japanese home dishes. Common local ingredients, explicit substitutions,
  quantities, cooking endpoints and ingredient/allergen notes. Sources and
  limits are recorded in `docs/ako/recipe-provenance.md`.
- Eight matching food illustrations in responsive WebP variants, about1.04MB
  total for all sixteen files. Existing brand assets are unchanged.
- Static per-recipe URLs with complete readable HTML, individual canonical/OG
  metadata and Recipe JSON-LD. `tools/build-ako-recipes.mjs` reproduces the pages,
  the lightweight recipe catalog, library links and recipe sitemap entries.
- Native share, clean clipboard links, LINE prefill, manual-copy fallback and
  print layout. Shared URLs never include handoff IDs or query parameters.
  Old fragment bookmarks, recipe saves and legacy progress are preserved.
- Ingredient search remains local in memory. Back restores the recipe previously
  shown by a library history entry; printed scaled recipes include servings.
- Stat has discoverable overview navigation, readable destination conversion
  cards, Ako journey stops and per-recipe drilldown. Setup, access, environment,
  no-data and failed-request states remain distinguishable. Existing V1 pages
  and the canonical fifteen V2 events keep their meaning.
- Outcomes API adds `paths` in version1.1.0, using existing event/outcome tables.
  Every path is grouped by the original accepted departure and the selected
  environment/date/source filters. Multiple pages are never summed as people.
  Direct recipe visitors without an existing valid Compass handoff are outside
  this cohort. No new identity or Front Door OPEN is fabricated for them.
- X-VISOR2.0 includes the complete runtime/module/art graph and reviewed tests.
  The score endpoint only removes age-based deletion; authentication, validation,
  existing namespace and rows remain intact. See `docs/xvisor/RELEASE_2.0.md`.

## Verification

-191 focused Front Door, V1/V2, outcome, kitchen, sharing and Stat checks passed.
- Kitchen browser regression passed at390px and1440px, plus blocked-storage
  behavior. Every recipe/photo, portions, saves and completed steps were checked.
- Sharing browser proof passed at both widths: all15 URLs/static previews,
  actual clipboard, LINE payload inspection, ingredient search, history, old
  fragments and print. All15 pages also pass with JavaScript disabled. Native
  share cancellation/failure has focused tests; no social message was submitted.
- Actual browser Compass → Ako → new recipe → Xircle → Meet produced11 real
  local D1 receipts and two distinct Ako arrivals. Protected Stat displayed the
  exact recipe count2. Zero production rows or meeting submissions were created.
- Independent Stat workerd/D1/browser proof and the original17-event telemetry
  regression passed. Error-state transport simulations are labeled separately.
- Public link audit:761 local targets, zero unresolved references.
- X-VISOR owner reports196 checks; independent review reran135 and reviewed the
  remaining61 saved browser checks. No live score writes were used.

Evidence is kept outside the public repository in the session visualization
directory: `ako-recipes-v2`, `ako-sharing-v2`, `ako-journey-stat-v2`,
`stat-v6-expanded`, `xvisor-release-audit`, and `ako-stat-public-links.json`.

## Production boundary

Cloudflare Pages project `teem` has D1 binding `DB`, but the previous read-only
inspection found no production `STAT_PASSWORD`. The user was asked to set that
secret and redeploy. Never commit a password or bypass the fail-closed gate.

The previous Cloudflare request returned error1010, and automatic approval
review rejected a browser retry as bypassing that restriction. This update does
not retry that endpoint or inject a production fixture. Successful deployment
checks and public Vercel UI verification must be reported separately from live
Cloudflare persistence/access, which remains unverified until that access is
resolved. Physical iPhone Safari and actual recipe cooking/tasting are also not
claimed by the local browser proofs.
