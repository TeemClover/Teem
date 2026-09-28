# Mediral — Routine first, complete ingredient story (v5)

Updated 2026-09-28. Extends the routine-first experience with a complete ingredient atlas, extraction/beaker motion and three concept lab stills. The cabinet, serum-pair and mousse-only openings remain superseded. The film remains pending, with its readiness gate off.

## Customer story

The opening shows all five products and “ผิวมีหลายโจทย์ แต่ละขั้นจึงมีหน้าที่”. The visitor first understands cleansing, two serums with different brand-described purposes, morning sunscreen and optional finishing makeup. No claim says everyone needs all five or that their combined use has a proven effect. The routine map offers direct entry into each role; the set shortcut serves visitors ready to review the bundle.

A dedicated lab chapter follows the overview. “จากวัตถุดิบ สู่ภาพของสูตร” introduces three useful questions: which plant or material names appear in a formula, what role the brand gives their group, and how to distinguish an illustration of texture from the product itself. Its three AI concept stills remain available independently of video or WebGL.

The product sequence stays mousse → white serum → yellow-green serum → sunscreen → powder. Each chapter explains the cosmetic role and lets the visitor choose a featured ingredient to read its attributed role while its illustration comes forward. The animated illustration then dissolves in place; small streams collect in a beaker, form an abstract concentrate and lead to the pack reveal. This is visual explanation, not a mixing recipe.

After each serum, sunscreen and powder chapter, a full ingredient atlas shows every listed name grouped into families. All names are visible; pressing one reveals its own description and source attribution. A next-step link resumes the product story. The current mousse has no ingredient atlas because its formula has not been confirmed.

The full set closes the story with the saved list, qualified poster offer and checkout gate. Ingredient exploration never changes the purchase selection.

## Motion and reading chapters

- `u=-1..0` shows all five products, independently of the saved list. The five product chapters remain at `u=0..5`; the set remains at `u=5..6`.
- The separate lab-media chapter and ingredient atlases use normal document flow. They are not extra products and do not change those indices. The fixed stage and rail withdraw while a reading chapter is active.
- Illustrated materials remain selectable during the opening material phase. The following phases are extraction → concentrate → formulation → drop → reveal → role. Dissolving the texture and collecting small streams replaces the earlier whole-ingredient funnel movement.
- Selecting a featured ingredient from a later phase returns to the materials view. Scrolling resumes the sequence; selecting a name in the full atlas changes its text detail only.
- Desktop ingredient families use two columns; phones use one column. Reading does not require a nested scroll area. Missing ingredient images are valid: the name and explanation still work without substituting a guessed plant or molecule.
- Reduced motion, failed WebGL and data errors retain readable explanations and the existing product fallbacks. The static lab stills do not depend on the 3D scene.

## Lab-media delivery state

The following public runtime stills exist:

| Asset | Purpose |
|---|---|
| `assets/motion/lab-botanical.webp` | Concept image for the material-reading beat |
| `assets/motion/lab-research.webp` | Concept image for the extract/group-role beat |
| `assets/motion/lab-compound.webp` | Concept image for the texture beat |
| `assets/motion/lab-film-poster.webp` | Reuses the research still for the main frame |

The requested ten-second video is **pending model selection**, not generated. `data-film-ready="false"` displays “ภาพจำลองงานแล็บ” over the poster. The future MP4 path is stored only in `data-src`; no video source, native control, custom play control, duration badge or media request is active.

After a real approved file is supplied, the gate can be enabled. Playback remains muted and inline, with no preload. Automatic playback requires an active tab, sufficient viewport visibility and motion/data preferences that permit it. Reduced-motion and data-saving readers can explicitly choose play. Leaving the viewport or hiding the tab pauses the film; a media error preserves the poster and reading content. The controller is independent of product-data loading.

## Source contract

Each ingredient retains `name`, optional `image`, `benefit`, `benefit_source` and `benefit_status`. `brand-claim` attributes a role to brand marketing; `identity-only` does not establish an individual effect. `ingredient_groups` resolve names against featured and other ingredient entries and retain family-level attribution. Editorial groupings are identified as myClover's reading aid.

The four atlases contain AC 24, BR 18, SU 14 and PO 18 display entries. This is a source-list reading inventory, not 74 distinct actives or a verified INCI total. Sunscreen aliases, collective headings and component names are reconciled for display; they do not prove a formula count, molecular size or botanical species. Group roles do not become individual efficacy claims.

The current clover-label mousse still has unknown formula and size. The old gold-rose formula is not reused. Sunscreen illustration lettering is not authoritative for SPF/PA. Powder shade, weight and SPF are not inferred. Package images remain labelled AI drafts.

All lab scenes and stills are illustrative. They do not show Mediral's actual factory, research, manufacturing sequence, verified product texture or clinical result. Glassware and abstract particles establish no dose, chemical identity, concentration, penetration or effectiveness. No germ-killing footage, clinical charts, invented percentages or chemical bonds are introduced.

## Sales contract

The five-piece offer comes from the supplied poster for 21–30 September 2026 and remains qualified as unverified in the cart. It appears only in its date window and with all five products selected. Partial lists do not inherit the bundle offer. Affiliate checkout remains unavailable until a verified link is supplied. Internal partner pricing and private evidence remain outside public documentation and runtime assets.

For implementation contracts, release status and checks, see [README.md](README.md). The current mousse media limitation is recorded in [MEDIA_REQUEST_01_MOUSSE.md](MEDIA_REQUEST_01_MOUSSE.md).
