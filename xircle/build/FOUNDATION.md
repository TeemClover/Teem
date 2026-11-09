# XIRCLE — current build entry

Updated 2026-11-09. Build the interactive Clover X brand walk described in `../ROUTE.md`. The owner wants meaningful choices, a walking map, XIRCLE/Habix/RoutineX connections, official clips and app downloads. Historical personal-service and scroll-only implementations are superseded.

`brand-experience.js` / `.css` own the six-station scenes, map and presentation. `brand-state.js` owns bounded URL state; `brand-catalog.js` owns product roles and official download destinations. `media-library.js` / `.css` use the local official-video catalogue. `orb-field.js` is optional decorative WebGL2. Information and controls must not depend on the graphics engine.

`journey-shell.mjs` generates static header, breadcrumbs and footer across the root and 49 references. Run `npm run build:xircle`, then `npm run check:xircle`; do not hand-edit generated shell/footer blocks. The existing RoutineX A/B rooms use an explicit `brand=xircle` bridge and bounded return route; preserve their standalone mode.

Maintain real links, concise Thai copy, keyboard/history behavior, reduced motion and no-JavaScript reference/download paths. Use **ห้องความรู้**; cat imagery can remain. Primary brand login has no personal referral; the separate acquisition aliases retain their exact requested ref.

Keep source/claim boundaries and asset aspect ratios. Do not restore personal booking or external notebook handoffs. Leave legacy local records and the top-level `/maxage` page intact. Verify the current implementation using `../JOURNEY_QA.md` before claiming completion.
