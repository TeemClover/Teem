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


## 12. Optional HD graphics / preserve original SD — 2026-09-24

The owner requests a whole-house upgrade but explicitly retains the original appearance as SD, the default on every fresh page load. HD is an in-session opt-in, independent of the existing low-power toggle; view/room/lens navigation and camera reset preserve the chosen graphics mode. Both modes share one renderer, camera, spatial data and opening layout. Original SD material and furniture implementations remain unchanged.

HD implementation modules load on demand, generate deterministic local surface maps, and cache their furniture/exterior groups for comparison. Material switches rebuild wall batches without changing room coordinates. Contact occlusion excludes transparent glass and preserves the transparent canvas. A failed HD load returns to usable SD; a network failure may require a page refresh because browsers cache failed ES module requests. No new external image assets, downloads, public source scans or student material were added.

The circled ground-floor dining window is corrected to a 3.1-wide, 2.3-high opening, matching adjacent front living glazing. It remains a window, preserving the sole direct carport entry through preparation. User priorities remain attractive presentation and plausible circulation rather than surveyed accuracy. After reviewing the completed local graphics preview, the user explicitly authorized pushing this SD / HD revision to main on 2026-09-24.

## 13. Mobile exploration and HD close-ups — 2026-09-24

The owner authorizes mobile polish, closer zoom, column flicker repair, further HD detail and push to main. Use the exact quality captions SD มาตรฐาน / HD ความละเอียดสูง. Keep SD the initial mode. Mobile controls have larger touch targets, optional tools/details and a CSS focus view with an explicit return control; avoid browser fullscreen requirements. Landscape plan controls use a side column to preserve useful plan height.

The owner explicitly requests suppressing page zoom so gestures control the house. Apply viewport limits, touch-action and cancelable browser gesture/multi-touch/Ctrl-wheel guards without stopping event propagation or canceling single-finger panel scrolling. Raise the house camera limit from 4 to 12 and retain manual framing across resize. Physical Safari verification remains a separate device check.

Fix the carport flicker in geometry: column tops stop at the fascia underside instead of overlapping its front surface. Preserve all existing openings and room data. HD adds shared veneer maps, shaped tableware, recessed basin shells and solar mounting hardware; no external assets, download artifacts or changes to original SD furniture/materials.

## 14. Owner's stair-hall centerpiece and rear solar correction — 2026-09-24

While this revision was being finished, the owner supplied five more references and requested the large stair chandelier, a better-looking second-floor stair zone, rear-facing solar placement and real photos with people. Continue under the existing push authorization. This supersedes the earlier blanket omission of people: include the supplied hall/person image and family living image without changing their content, along with the chandelier close-up. Convert to web-sized metadata-free derivatives; leave supplied originals outside the repository. Public gallery now contains 24 photos in 9 collections. The exterior family photo with house/vehicle identifiers is not needed for these new interior collections and was not added.

Reconstruct eight alternating, descending crystal rings inside the existing stair opening. Use shared materials and bounded static meshes, with brighter faceted crystals only in HD. Keep original floor datums and openings for circulation, slim the return-stair flights for a clear central well, and leave the upper exit open. Show stairs on the second floor and provide a dedicated double-height cutaway with tall rear glazing matching the new photos. Update the rear stair windows in both storeys; other openings and doors remain unchanged. Add a stair-hall catalog/tour entry and owner-confirmed photo binding to hall204.

Move only the circled front bank of six solar modules onto the opposite rear slope. Retain the east bank of eight. SD planes and HD mounting hardware share a single layout helper to avoid future mismatches.


## 15. Shower correction and storey-specific stair views — 2026-09-24

Owner identifies the narrow strip beside bathroom205 as a shower area and explicitly limits this correction to 3D. A cloned model-house presentation transfers that strip out of hall204, adds the enclosing partitions and internal bathroom passage, and preserves the rear ventilation square. Main bathroom furniture keeps its original anchors; the original source rooms/walls and 2D plan are unchanged. The new shower uses chrome handheld fittings, a greige tiled tray, drain and a half-width glass screen with clear access in SD and HD. None of the new phone references is added to the gallery.

Floor-specific stair views no longer force both storeys visible. Bake geometry slices at the floor datum for the isolated lower stairs and upper chandelier, and split the isolated backdrop per storey. Whole/exploded views retain their complete components with the stairs owned by floor1 and landing/chandelier by floor2.

Remove the mobile chandelier close-up P24 and both public derivatives. Keep the approved professional hall/person P25 and living-family P26. Public gallery now contains 23 images in 9 collections; the private source inventory remains unchanged. Continue under the existing authorization to push completed refinements to main.
