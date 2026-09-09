# Route Guard — /xircle/routinex/

Updated: **2026-09-10**. Status: compatibility entry; its former standalone experience is retired by owner decision.

## Current job and flow

Keep existing links working and take them to the single current Xircle experience at `/xircle/`. The shell runs no old story, progress navigation, product sequence or scene engine.

- Entry: direct link, bookmark or historical navigation to this URL.
- Exit: `/xircle/`, with bounded parameters resolved by `route-contract.js`.
- Runtime: small `index.html` shell → `/xircle/legacy-entry.js` → current `/xircle/`.
- A visible ordinary link remains available if JavaScript cannot run.

## Compatibility

Preserve valid explicit or saved invitation context for an optional join/create link on the current page. Do not open TeamBook automatically, change old localStorage, synthesize completion, import `_shared/state.js`, or require the old journey to unlock anything.

## Verification

Check direct entry, parameter handling, invitation preservation, latest-page navigation and the no-JavaScript fallback. The canonical route list and current product/content boundaries are in [XIRCLE_ROUTE_SOURCE.md](/xircle/XIRCLE_ROUTE_SOURCE.md) and [ROUTE_INDEX.md](/xircle/ROUTE_INDEX.md).

## Historical reference

The prior HTML and guard were archived unchanged at `archive/xircle-retired-20260910/xircle/routinex/` under the visualization archive documented in the global source. They preserve the former page and its content boundaries, not a second active route specification.
