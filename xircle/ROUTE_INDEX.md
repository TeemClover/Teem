# Xircle Route Index — current consolidated experience

Reviewed: **2026-09-10**. Owner decision: **V3 only**. Source: `6fab7897` (`feat/xircle-experience-v3`), merged as `e7b533a7` into remote main (`1984724c`) with identical V3 runtime files. The prior V2 selection based on stale local refs is superseded.

Read the local `ROUTE.md` before changing a route and [XIRCLE_ROUTE_SOURCE.md](XIRCLE_ROUTE_SOURCE.md) for connections. Current owner decisions override historical guards.

## One experience

`/xircle/`: six actions build a cinematic fictional day, reveal a seven-night pattern, add context with Teem + Ako, and invite the visitor to try it in real life. Runtime: `experience-v3.js` / `experience-v3.css`. Main exit: `/meet/?intent=health&from=xircle&open=booking`; optional knowledge after the payoff. No registration/download sequence, V1/V2 runtime or separate worker.

`/Xircle` and `/Xircle/` are case aliases. They must resolve to the same lowercase source, never another copy.

## Compatibility entries

These URLs preserve old links while loading no old experience engine. Each small shell uses `legacy-entry.js` and `route-contract.js`.

| Existing URL | Current destination |
|---|---|
| `/xircle/start/` | `/xircle/` |
| `/xircle/ghost/` | `/xircle/` |
| `/xircle/care/` | `/xircle/` |
| `/xircle/opportunity/` | `/xircle/` |
| `/xircle/routinex/` | `/xircle/` |
| `/xircle/explore/` | `/xircle/#start` |
| `/xircle/circle/` | `/xircle/#start` |
| `/xircle/care/party/` | `/xircle/#start` |

Bounded Compass context and valid explicit/saved invitations survive according to `route-contract.js`; the destination displays an explicit join/create link where appropriate. Do not restore old progress gates or navigate automatically to TeamBook.

## Independent reference routes

These retain their existing content, artwork and article interactions; `reference.js` supplies navigation and artwork loading without progress checks or storage writes.

- `/xircle/learn/`: searchable short knowledge library.
- `/xircle/learn/topic/`: one short article, with its existing topic fallback and source links.
- `/xircle/hardware/`: device reference and linked explanations.
- `/xircle/products/`: product reference and linked sources.
- `/xircle/doc/`: deep-reference index.

References are optional. Reading or buying anything is not required to reach Meet.

## Deep-reference groups retained

- Academy: `/xircle/doc/academy/`, `/xircle/doc/academy/certification/`.
- Xircle App: `/xircle/doc/app/` plus body/community/eat/habit-score/hardware/maxage/move/sleep.
- Commerce: `/xircle/doc/commerce/` plus glossary/revenue/roles.
- Ecosystem: `/xircle/doc/ecosystem/`.
- Habix: `/xircle/doc/habix/` plus astamega/fives/flavor/gus/protein-hmb/vita-matrix.
- RoutineX: `/xircle/doc/routinex/` plus abcd/day-28.
- Source: `/xircle/doc/source/` plus changelog/glossary/sources/unresolved.
- XOS: `/xircle/doc/xos/` plus customers/learning/missions/team/wealth.
- X-VISOR: `/xircle/doc/xvisor/` plus care/claims/coaching/onboarding/privacy/role.

These are documents, not alternate versions of the main journey. Their historical route labels do not impose a new completion gate.

## Verification boundary

Old links and casing reach the current experience once; invitations remain reachable; direct reference links stay readable; Meet receives only intended context. Preserve every existing localStorage key and exact brand assets. Update the affected guard whenever entry, exit or runtime changes.
