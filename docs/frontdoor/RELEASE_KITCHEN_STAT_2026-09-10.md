# Ako kitchen and journey Stat

This update follows the user's direct authorization to finish the kitchen/Stat
work and publish to main after local verification. X-VISOR2.0 remains in a
separate local checkpoint pending direct user approval; no game runtime,
workflow, scores, or save changes are included in this release.

## Delivered changes

- Fifteen practical recipes, including eight original Thai adaptations of
  Japanese home dishes. Common local ingredients, explicit substitutions,
  quantities, cooking endpoints and ingredient/allergen notes. Sources and
  limits are recorded in `docs/ako/recipe-provenance.md`.
- Eight matching food illustrations in responsive WebP variants, about 1.04 MB
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
- Outcomes API adds `paths` in version 1.1.0, using existing event/outcome tables.
  Every path is grouped by the original accepted departure and the selected
  environment/date/source filters. Multiple pages are never summed as people.
  Direct recipe visitors without an existing valid Compass handoff are outside
  this cohort. No new identity or Front Door OPEN is fabricated for them.
## Verification

- 191 focused Front Door, V1/V2, outcome, kitchen, sharing and Stat checks passed.
- Kitchen browser regression passed at 390px and 1440px, plus blocked-storage
  behavior. Every recipe/photo, portions, saves and completed steps were checked.
- Sharing browser proof passed at both widths: all 15 URLs/static previews,
  actual clipboard, LINE payload inspection, ingredient search, history, old
  fragments and print. All 15 pages also pass with JavaScript disabled. Native
  share cancellation/failure has focused tests; no social message was submitted.
- Actual browser Compass → Ako → new recipe → Xircle → Meet produced 11 real
  local D1 receipts and two distinct Ako arrivals. Protected Stat displayed the
  exact recipe count 2. Zero production rows or meeting submissions were created.
- Independent Stat workerd/D1/browser proof and the original 17-event telemetry
  regression passed. Error-state transport simulations are labeled separately.
- Public link audit: 753 local targets, zero unresolved references.
Evidence is kept outside the public repository in the session visualization
directory: `ako-recipes-v2`, `ako-sharing-v2`, `ako-journey-stat-v2`,
`stat-v6-expanded`, and `ako-stat-only-public-links.json`.

## Production boundary

Cloudflare Pages project `teem` has D1 binding `DB`, but the previous read-only
inspection found no production `STAT_PASSWORD`. The user was asked to set that
secret and redeploy. Never commit a password or bypass the fail-closed gate.

The previous Cloudflare request returned error 1010, and automatic approval
review rejected a browser retry as bypassing that restriction. This update does
not retry that endpoint or inject a production fixture. Successful deployment
checks and public Vercel UI verification must be reported separately from live
Cloudflare persistence/access, which remains unverified until that access is
resolved. Physical iPhone Safari and actual recipe cooking/tasting are also not
claimed by the local browser proofs.
