# Offer location, subdomain paths and special monthly care

Update: 2026-10-02. Supersedes the original path statement in OFFER-20261002.md.

## Authorized changes

- Move the four Offer source files out of `asksydneyscience/offer/` into `asksydscience/offer/`; remove the wrongly named directory, not a second maintained copy.
- Keep existing public links working through permanent legacy redirects. Query selections stay in the URL. Share links now use `/offer/` on `asksydscience.myclover.com` or `/asksydscience/offer/` on the main site.
- Map subdomain root and room suffixes into `/asksydscience/`. Explicit document routes include `/demo/`, `/offer/`, `/about/`, `/stories/`, `/kitchen/`, `/mindfulness/`, `/workshop/`, `/studio/`, with and without final slash. A guarded host-only fallback covers nested static paths without prepending twice to existing prefixed assets or swallowing API/reserved paths. Other hosts and API rules remain semantically unchanged.
- All paid monthly care fees must say `ราคาพิเศษ ลด 50% แล้ว`. Owner confirms the existing payable amounts are already discounted: 3,000 -> 1,500 THB/month and 7,000 -> 3,500 THB/month. No additional half-price multiplication. Website setup fees, extra work and installment amounts are unchanged.
- Add comparison metadata to the canonical rate card; render the normal price, special price and saving in care choices, selected summary and text/print exports. The zero-priced self-care option has no discount claim.
- Preserve the existing native website form scope and all recent CrescoHealth branding changes. This is not a new e-commerce or form backend implementation.

## Verification performed before commit

25 Node tests passed (the 17 existing cases plus 8 route/discount regressions). The existing combinations still calculate unchanged payable amounts. The pre-edit Vercel JSON was reconstructed for local processing and byte-verified against its Git blob SHA; tests compared all unrelated rule data and functions/crons unchanged after edits. JSON is written compactly per rule for transfer; formatting changes are not routing changes.

12 Chromium in-memory checks passed: A/B/C base unchanged, paid care options show correct normal/special rates, self care hides the discount, three- and twelve-month budgets do not double-discount, real text download contains discount language, copy-summary payload with a clipboard stub, no horizontal overflow at 360/390/768/1440px and no uncaught JS errors. Localhost navigation is blocked by this environment; ESM imports were flattened into the in-memory page. Not a claim of hosted browser E2E, Safari or complete accessibility conformance. Live deployment and HTTP route/asset checks are separate and must be recorded after deployment.

Run `node --test tools/asksydscience/offer/*.test.mjs`.
