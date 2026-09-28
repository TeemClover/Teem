# Mediral 5 Steps checks

Run from the repository root:

```sh
node --test tests/mediral/*.test.mjs
```

The suite uses Node's built-in test runner and standard library only. There is no install, network access, browser automation or website change. The JavaScript syntax check runs `node --check` without executing the browser modules.

## What the suite protects

**The story in `mediral/data/routine.json`**
- Five steps in the owner-selected order: mousse → white serum → yellow-green serum → sunscreen → powder.
- The mousse has no pack image and no old-formula ingredient list, and nothing references the held old mousse draft.
- Every other pack is marked and labelled as an AI draft.
- Headlines lead with each step's role.
- Public copy contains none of the held claims (treatment, melasma, germs, DNA, "no chemicals", certification marks, SPF/PA numbers, percentage and hour claims).

**The set offer and purchase**
- The set offer is poster evidence: 1,899, dated 21–30 Sep 2026. The page hides it after the end date.
- The serum-pair price, coupons and strike prices stay out of the page.
- The Affiliate button is inert while its URL is `null`.

**Files, dependencies and deployment**
- Every referenced image is a real local WebP.
- The lazy `story.js` and `card.js` resolve locally, and every `three` export they use exists in the vendored subset.
- Internal partner pricing never appears in the published folder.
- The page and its routes send `noindex`.
- Reference screenshots, asset manifests and the held draft are excluded from deployment.

## What still needs a browser

Scrolling, WebGL rendering and fallback, reduced motion, mobile layout, copy and PNG download all need a real browser.
