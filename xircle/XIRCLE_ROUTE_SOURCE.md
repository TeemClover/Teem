# XIRCLE route source — interactive Clover X brand walk

Updated 2026-11-09. The latest owner direction is a full interactive company experience: people choose, try and follow the resulting story through XIRCLE, Habix and RoutineX. Include a walking map, official app downloads and categorized clips from `@CloverXOfficial`. The owner authorized reuse of `www.xircle.health` material. Previous personal-service and scroll-only directions do not override this instruction.

## Implementation responsibilities

| Responsibility | Files |
|---|---|
| Brand scenes, route map, choices and shared presentation | `index.html`, `brand-experience.js`, `brand-experience.css` |
| Six stations, three route orders and bounded public state | `brand-state.js` |
| Official downloads, five Habix products, ABCD and FIVES | `brand-catalog.js` |
| Official clip categories, local queues and explicit player loading | `media-library.js`, `media-library.css`, `data/official-videos.json` |
| Optional decorative WebGL2 field | `orb-field.js` |
| Shared static wayfinding across root + 49 references | `build/journey-shell.mjs`, `journey.js`, `journey.css` |
| Contextual immersive RoutineX return path | `../routinex/brand-bridge.js`, `../routinex/brand-bridge.css` |
| Older entry aliases and bounded explicit Compass interest | `legacy-entry.js`, `route-contract.js` |
| Existing reference artwork and knowledge search/filter URL state | `reference.js`, `knowledge.js`, existing reference HTML/data |

The root uses one interactive state in normal and presentation views. Sample selections illustrate how a day can be brought together; they do not represent the visitor's measured health or a recommendation to take a product.

## Product boundaries

- Habit Score represents Eat + Move + Sleep. Body composition is another layer, not a fourth Habit Score input.
- App brings records together; Band follows supported sleep/movement signals; Scale records body-composition readings. No real device pairing occurs in the showroom.
- Habix is the nutrition product brand. RoutineX is the routine system, not a synonym for a product.
- A / Absorb → G.U.S.+; B / Build → Protein HMB+; C / Control → behavior, no product for sale; D / Daily Balance → AstaMega+ and Vita Matrix. Flavor+ adds taste/variety; it is not a new ABCD stage.
- FIVES is the formulation/explanation framework Functional, Intelligent, Value, Effective, Science. It is not a sixth product or a guarantee of results.
- Use five existing product identities. Flavor has no invented pack image or final flavor-SKU names. Existing source conflicts and label/registration limitations remain relevant.
- Ingredient evidence does not establish a finished-product outcome. Do not add diagnosis, guaranteed results, prices, dosage, current promotions or income claims.

## Official links and assets

Verified from live `https://www.xircle.health/download` and `/app` on 2026-11-09:

- App Store: `https://apps.apple.com/th/app/id6785562482`
- Google Play: `https://play.google.com/store/apps/details?id=health.xircle.app`
- Device-aware official download page: `https://www.xircle.health/download`
- Brand portal: `https://buy.xircle.health/login` (plain company login).

The acquisition aliases `/invite`, `/free`, `/join` separately retain `https://buy.xircle.health/login?ref=O5F3LN`. Do not turn this alias requirement into a personal referral on every company CTA.

Official logo, store badges and selected imagery are local in `assets/official/`, with exact URLs, processing and hashes in `provenance.json`. The official website includes conflicting Band numeric specs and explicitly pending MaxAge/accuracy/privacy/support wording; the experience does not turn those into finalized claims.

## Video and state boundaries

The local 10-video catalogue preserves official IDs/titles and groups clips by App, Band, Scale and HabiX + RoutineX. It does not publish or modify a YouTube playlist. A player is requested only after explicit Play; closing or changing context removes the iframe. Keep official external links when embedding is unavailable. Metadata verification is not proof of playback or endorsement of every spoken claim.

The showroom uses bounded public URL selections and does not introduce a health-input form, backend record, browser-storage key or legacy-state migration. RoutineX return links are local, bounded and contextual. Keep the knowledge label **ห้องความรู้**; cat artwork may remain. Do not restore personal booking, Teem/Ako branding, TeamBook or notebook handoffs.

The top-level `/maxage` and unrelated subsystems remain outside this change. Read [ROUTE_INDEX.md](ROUTE_INDEX.md) and [JOURNEY_QA.md](JOURNEY_QA.md) for route and verification details.
