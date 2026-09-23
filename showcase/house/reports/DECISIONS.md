# Implementation decisions · 2026-09-24

1. The current user request selects Git/Teem and /showcase/house, authorizes the owner's layout as a teaching example, and adds drone imagery. This supersedes the preparation pack's earlier unknown repo/route and 12-photo inventory. Public originals remain excluded.
2. Existing repository is static HTML and ES modules. Use plain JavaScript + Three.js 0.180.0 and esbuild 0.25.10, not a nested React app. Source lives in app/. No root package/routing changes.
3. Actual source set has 23 photos and two plan pages. Display21 derivatives in8 sets; omit2 images containing people. Crop aerial to solar-roof house; redact visible plate/number/desk/photo details and strip metadata. No newly generated photos.
4. Both floor calibrations and geometry are draft traces. 31 spaces include carport, voids, circulation and terraces; they are not31 rooms. Floor level difference is3.29m. Calibration residuals are fit-to-scan values, not surveyed accuracy.
5. Photo-to-room bindings: six candidate sets, two exterior context sets, zero confirmed. UI makes this visible. Pending mappings do not invent a precise photo pin. Floorplan/model share room IDs independent of photo confidence.
6. House geometry is stylized and provisional. Height, roof, solar panel count, furniture, steps, landscape and ceiling appearance are assumptions. Living ceiling is an underside grid material approximation, not a second-floor void or a real-time mirror.
7. Downloadable SVG plans are redraws from canonical polygons. Starter includes data and interactive2D code; source kit includes3D code without photographs. Raw scan/title block is not in downloads. No blanket rights grant to third-party photography or architecture.
8. Prepared as an isolated draft review branch. No merge, billing/security changes or production deploy is performed. Local browser tests are desktop/viewport emulation; mobile hardware and first-user study remain untested.

9. Release revision: official homepage logo; free SVG plans only. Student lesson guide, source ZIPs, data export and kit generators removed from current public tree and retained privately. Student access remains closed, with no fake client-side password gate. User authorized main release. Git history is not erased.

10. Superseding local-only revision: no downloads at all, including SVG plans. Keep the interactive on-screen plan. Rebuild interior fittings from photo signatures, with separate built-in/movable layers and isolated room views. New graphite/blue workbench UI. No commit, push or deployment authorized for this revision; prior main commit cf331f57 remains unchanged.


## 11. Owner correction and screen-first art direction — 2026-09-24

The owner prioritizes a beautiful, impressive interactive model over exact real-world proportions; this is not intended for construction. Maintain recognizable rooms, the specified furniture sides and plausible connected circulation. Keep all changes local without commit/push; no downloadable files.

Close the visual assembly gap with fascia/infill without moving the source floor datums. Balcony floors use the existing polygons rather than a second invented slab. The shallow upper projection is retained. Make carport entry into prep the only direct carport-to-interior door and keep the route to dining open. Preserve other exterior source openings, since the correction concerns entry from the carport. Open the upstairs lounge to the hall, correct bathroom access through dressing, and draw the documented door swing sides.

Owner identifies the photo bedroom as 201 and the study as the upstairs lounge. Bedrooms 202/203 have no photo bindings and use normal plan-led beds; 201 alone uses the upholstered platform with its head against the lounge. Lounge sofa sits on the 201 side, desk on the 202 side. Dining chairs face the table. Bathroom layouts follow the fixture types and relative positions in the plan, with presentation sizes chosen for clarity.
