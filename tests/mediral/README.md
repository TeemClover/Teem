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

**The sales path**
- Chapter order: opening (WHY, role map, dated offer, route to `#set`) → serum comparison → film → products → offer → optional ingredient library.
- The opening offer follows the poster dates only; the purchase card also refuses partial saved lists. One offer slot, one checkout control.
- The two serums are compared by brand-told role and time only; the use-time table repeats data and adds no layering sequence. The order note says the page shows roles, not a verified order.
- Every atlas is a closed disclosure holding every name, role and source; direct, in-page and history links open it; a fresh link lands below the header; toggling re-measures the reading gate.
- Stacked layouts read the purchase card like a chapter and pause the scene; desktop keeps the set scene.
- The film is a real faststart MP4, never loops, plays once automatically and replays only on request.

**Files, dependencies and deployment**
- Every referenced image is a real local WebP.
- The lazy `story.js` and `card.js` resolve locally, and every `three` export they use exists in the vendored subset.
- Internal partner pricing never appears in the published folder.
- The page and its routes send `noindex`.
- Reference screenshots, asset manifests and the held draft are excluded from deployment.

## What still needs a browser

Scrolling, WebGL rendering and fallback, reduced motion, mobile layout, copy and PNG download all need a real browser.
