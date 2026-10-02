# AskSydScience Market — multi-brand store demo

Date: 2026-10-02. Catalogue version: SYD-MARKET-DEMO-1.0.

## Request and release scope

The user requested a working example at `/asksydscience/demo/`, inspired by the store at https://th.iherb.com, with varied fictional brands and mock products. This is a newly authorized commerce-design demonstration, not a live commerce service or a revision to the existing website offer.

Only `asksydscience/demo/` public files are added, plus this documentation and an isolated test under `tools/asksydscience/`. The original `/asksydscience/` home, room demos, `/asksydneyscience/offer/`, rate card, global scripts and Vercel configuration remain unchanged. The existing `.vercelignore` excludes `docs/asksydscience/` and `tools/asksydscience/`.

## Visual reference and assets

The iHerb reference was opened on 2026-10-02 to inspect storefront structure: prominent search, category and brand navigation, product discovery and cart. Its logo, product images, product descriptions, customer reviews and code were not copied. The new store has its own AskSydScience identity, cream/sage/earthtone palette and original SVG packaging rendered by `art.mjs`.

30 fictional products across 8 invented brand identities and 6 categories: supplements (6), nutrition (5), pantry (6), skincare (5), body care (4), lifestyle (4). Pack shapes include bottles, tubs, pouches, boxes, tins, jars, droppers, pumps, tubes, candles, a mug, flask and rolled mat. These names are design fixtures, not a representation of trading businesses or a trademark clearance.

Existing repository Thai font URLs are referenced; no font files are copied or distributed in this change. No network product images or generation-service dependencies are required.

## Working interactions

- Thai/English search; categories, multi-brand and price filters; removable filter chips; sorting; empty results.
- Initial 12 catalogue cards, load 24 then all 30; 6-product featured rail; 3 conceptual collections and 8 clickable brand tiles.
- Saved items in memory; no account required.
- Accessible-name native product dialogs, mock details, variant prices and quantities. Four items have an additional duo option.
- Native cart drawer, quantity updates/removal, 9-unit cap per product/variant, authoritative fixture prices and integer-satang calculations.
- Demo coupon SYD10 for 10%; mock shipping free at discounted subtotal >=799 THB, otherwise 50 THB, zero for an empty cart.
- Order-preview screen stops before checkout. It shows the arithmetic but never says an order was placed.
- Allowlisted product deep links via `?product=p01`; clipboard action has a manual-address fallback.
- Mobile filter drawer moves the same filter form rather than creating duplicate IDs.

## Boundaries

Visible DEMO notices describe all brands, goods, labels, prices, comparison prices, availability, discounts and shipping as fictional. There are no fake testimonials, star ratings, evidence claims, credentials, health-outcome promises or personal recommendations. Product details explicitly state there is no real formula, clinical evidence or usage advice.

No authentication, order API, checkout, payment fields, addresses, health-data collection, cookies, localStorage, tracking, email signup or external seller link. Cart and saved state are tab-memory only and reset after reload. The one unavailable item is intentionally disabled. Noindex is an indexing preference, not access control; the demo and repository are public.

A production marketplace needs a separate scope for real product sources and permissions, content/claim review, merchant operations, inventory, data/privacy, shipping, tax, payments, security, and service support. The existing Offer and its rates are not expanded by this demo.

## Verification actually executed

Local Node: 13 tests passed, including all 29 available standard products x9 quantities x2 coupon states = 522 cart combinations. Test command in the repository:

```sh
node --test tools/asksydscience/market-demo.test.mjs
node --check asksydscience/demo/store.mjs
node --check asksydscience/demo/art.mjs
```

Chromium: 46 in-memory UI checks passed, including search, compound filters, safe search text, sorting, favourites, variants, quantity caps, coupon rejection/removal, correct totals, order-preview boundary, native dialogs, pagination, filter relocation and no horizontal document overflow at 320/360/390/650/768/900/1024/1440 px. No runtime JavaScript errors or duplicate IDs were observed in the exercised paths. No-JavaScript limitation is explicit. Reduced-motion CSS was checked.

Environment limitation: localhost browser navigation was blocked by the execution environment. The test harness rendered the exact local HTML/CSS with the three modules flattened into an in-memory script, rather than navigating a real HTTP page. This is not a hosted-browser, Safari/iOS, full accessibility-conformance or field-performance verification. Screenshots use the installed Thai fallback font, not proof of production font loading. Git blob hashes for all five public files were read back and matched the locally tested files before PR creation.

Production deployment state and HTTP/MIME delivery must be checked separately after merge; a commit is not itself proof of a successful deployment.
