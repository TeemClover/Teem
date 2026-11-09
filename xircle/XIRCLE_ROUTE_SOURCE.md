# XIRCLE route source — company product experience

Updated 2026-11-09. The current user requests an advanced scrolling product introduction that the company and all X-VISORs can use to explain the system to customers. They explicitly retired the Teem + Ako personal-service direction and external TeamBook handoff. White Cat means the knowledge room in this journey. Existing illustration assets may be reused.

## Current implementation

| Responsibility | Files |
|---|---|
| Product story, native scroll chapters, device tabs, presentation/history | `index.html`, `company-story.js`, `company-story.css` |
| Optional local WebGL2 point field | `orb-field.js` |
| Shared static header, breadcrumbs, company CTA and footer across 50 pages | `build/journey-shell.mjs`, `journey.js`, `journey.css` |
| Old URL aliases and bounded explicit Compass subject | `legacy-entry.js`, `route-contract.js` |
| Independent artwork loading | `reference.js` |
| Search/category/result/reset URL state | `knowledge.js` |
| Existing knowledge and product/reference content | `data/library-founder-v1.js`, `data/library-simple-v1.js`, independent HTML documents |

The product narrative links Sleep, Eat/Food AI, Move and Body, then explains App/Band/Scale and RoutineX. Presentation mode reuses these content blocks as 7 topics. Reduced motion, missing WebGL and JavaScript-disabled devices retain readable information and real links.

There is no personal appointment, fictional customer assessment, notebook creation/join or game invitation in this product path. The old V3 engine and its obsolete personal-flow tests are retired; the current tests verify company boundaries, presentation/history, scrolling and all reference routes.

## Product boundaries

- Habit Score represents Eat + Move + Sleep; Body Composition is a separate layer.
- Band helps follow behavior; Scale helps show body-composition trends; App connects records and explanations. Describe only supported current functions.
- RoutineX: A / Absorb → G.U.S.+; B / Build → Protein HMB+; C / Control → behavior, not a purchasable product; D / Daily Balance → Vita Matrix and AstaMega+.
- Product images and screen numbers are illustrations; they are not this visitor's health data or a promised outcome.
- Ingredient evidence does not certify a finished product. Existing source caveats and official-label references remain.
- Do not add prices, dosage, current promotions, diagnosis, guaranteed health results or income claims without verified current sources.
- The official onward URL remains `https://buy.xircle.health/login?ref=O5F3LN`. `/invite`, `/free`, `/join` preserve this requested login destination. The top-level `/maxage` sleep-kit page is untouched.

## State and historical continuity

No new browser-storage key is introduced. Legacy keys and records are neither read for personal handoff nor mutated by the new company runtime. Valid bounded Compass focus can expose a chapter link; raw health text, email, notebook codes and arbitrary URLs are not forwarded.

The prior personal-service V3 direction is available in Git history. It does not override the current owner instruction. All original illustration assets needed by reference material remain. See [ROUTE_INDEX.md](ROUTE_INDEX.md) and [JOURNEY_QA.md](JOURNEY_QA.md).
