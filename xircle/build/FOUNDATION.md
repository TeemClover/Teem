# XIRCLE — current build entry

Updated 2026-09-10. The former 14-scene foundation has been retired.

Build only the cinematic **V3** experience at `/xircle/`, sourced from the approved remote implementation (`6fab789`, merged as `e7b533a7`). Read [the current route](../ROUTE.md) and [route source](../XIRCLE_ROUTE_SOURCE.md) before extending it.

The only active entry runtime is `experience-v3.js` with `experience-v3.css`. Legacy URLs use compatibility redirects to the current experience; they must never restore an old engine or progression gate. The primary completion is an invitation to meet, not registration or app download.

Keep existing artwork needed by V3 and the independent reference library, the exact favicon, and historical browser progress. The former foundation and removed engines/styles are archived outside the served repository.


## Shared journey shell · 2026-11-09

The V3 engine now sits below an editorial opening; it remains the only fictional-day runtime. `journey-shell.mjs` generates static navigation, breadcrumbs and footer for the root and 49 independent references. Run `npm run build:xircle` after changing the shell, then `npm run check:xircle`. The static markup remains usable without JavaScript. Do not hand-edit a generated `xircle-shell` / `xircle-footer` block.

`journey.css`, `journey.js` and `knowledge.js` own the shared reading layout, menu and searchable knowledge-list state. Product/article data and source dates remain in their existing files. See `../JOURNEY_QA.md` for browser checks and proof provenance.
