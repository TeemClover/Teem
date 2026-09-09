# Universe Telemetry V2 minimum

Telemetry infrastructure only. This directory does not build State 0, change the root, or import `track.js`, Stage, Hall or achievement evaluators.

## Contract

`contract.js` is the one registry consumed by client, backend and Stat. Analytics version **2.0.0** is independent of V1 **1.6.0**. The canonical P0 names are exactly:

```
FRONTDOOR_OPEN
FRONTDOOR_CHOICE
FRONTDOOR_REACTION_COMPLETE
LUCKY_RETURN
REWARD_HORIZON
DOOR_FOUND
SAVE
DOOR_OPEN
RETURN
RESUME
REBUILD
FRONTDOOR_FREE_ROAM
ANOMALY_START
LEGACY_WARNING
DUNGEON_HANDOFF
```

Required envelope: `eventId`, `installId`, `journeyId`, `visitId`, `eventName`, `occurredAt` (epoch milliseconds), `path` (no query/hash), `experienceVersion`, `analyticsVersion`, `env`. Optional safe fields: `handoffId`, `source`, `visitorClass`, `intentPrimary`, `intentSecondary`, `doorId`, `graphicsTier`, `viewport`, `motion`, `audio`, `scope`, `properties`.

Properties are selected in the shared validator: bounded active times, durability booleans, coarse graph nodes, return reason and previous journey/saved visit IDs. Unknown future properties are discarded without rejecting an otherwise valid event. Add safe future fields in this shared validator; do not forward arbitrary free text or URLs. The collector rejects unknown events, malformed IDs, unsafe known values and payloads over 8 KiB. It does not retain rejected payloads.

`LUCKY_RETURN` means meaningful value was delivered; it is not an animation-complete alias. `REWARD_HORIZON` means the reward was actually shown. `DUNGEON_HANDOFF` means departure intent, **not confirmed arrival**. No old `home-open` data is remapped.

## State and lifecycle

`createState()` reads a finite legacy allowlist and preserves existing values. `c7:install_id` is reused; unavailable storage uses one stable in-memory identity for the runtime with `durable:false`. State schema version 1 lives under the separate `mc:frontdoor:v2:*` namespace.

- A journey has its own `j-…` ID and versioned record. Partial progress can survive reload.
- A visit has a `v-…` ID. Navigation/back-forward after **30 minutes without activity** begins a later visit. Refresh always continues the visit; visibility/focus never establishes one.
- `RETURN` requires a durable saved journey and that later visit. A persisted browser back/forward-cache restoration is handled as navigation. Losing visit metadata can fall back to the checkpoint's saved time.
- `RESUME` is emitted only by explicit `resume()`, once per qualifying visit, preserving the saved journey ID.
- `REBUILD` starts another journey and preserves all earlier journey records and legacy history.
- `save()` writes and reads back the complete checkpoint and active pointer. If any required persistence fails, it returns `{ok:false,durable:false,error:'CHECKPOINT_PERSISTENCE_FAILED'}` and emits no SAVE. A previous valid checkpoint remains usable.

Identity/checkpoints belong to this browser origin; this is not login, cross-origin synchronization or a guarantee across browser data clearing. Simultaneous tabs share the active journey pointer; the last deliberate selection is the active choice. Each journey record remains independently stored.

## Minimal integration API

```js
import { createTelemetry } from '/assets/front-door/telemetry.js';

const telemetry = createTelemetry({
  // Production is enabled automatically. Local/preview require explicit opt-in.
  enabled: true,
  context: { viewport: 'mobile', motion: 'reduced', audio: 'muted', graphicsTier: 'essential' },
});
telemetry.open();
telemetry.state.updateJourney({ intentPrimary: 'build', intentSecondary: 'proof' });
telemetry.emit('FRONTDOOR_CHOICE');
// Later, only when the corresponding value / reward / door is actually shown:
telemetry.emit('LUCKY_RETURN');
telemetry.emit('REWARD_HORIZON');
telemetry.state.updateJourney({ doorId: 'dungeon' });
telemetry.emit('DOOR_FOUND', { properties: { fromNode: 'build', toNode: 'dungeon' } });
const saved = telemetry.save({ stage: 'door-found' });
// Present saved.ok to the caller; navigation must not wait for telemetry.flush().
```

Use the lifecycle methods `save`, `resume`, `rebuild` and `open`; generic `emit` rejects lifecycle events that require state evidence. Do not emit successful SAVE based merely on clicking a button.

The local active clock has no periodic pings. It pauses when hidden or after 30 seconds without activity, and emits milestone timing only on events. `updateJourney` preserves accumulated active time across refreshes. Call `dispose()` when permanently unmounting the runtime.

## Delivery and deduplication

Delivery uses asynchronous JSON `fetch`, `keepalive:true`, and no credentials. Product methods do not await it. A per-tab session outbox holds at most 32 events / 32 KiB, expiring after 24 hours. It survives refresh and cannot be overwritten by another tab. If session storage fails, the queue remains in memory. **Closing a tab can discard undelivered events**; P0 deliberately avoids a long-lived offline log.

Retryable failures use bounded exponential delay, at most five automatic attempts per runtime. Reload starts a fresh retry budget; online/pagehide can retry. The original `eventId` is retained. Acknowledgment happens only after an accepted response. Permanent collector rejections are removed and exposed in the flush result, not reported as successful delivery.

The server enforces both `(env,event_id)` uniqueness and a computed unique scope key:

- `event`: repeated interactions get separate IDs; retries keep the ID.
- `journey`: installation + journey + event + door. Canonical journey milestones cannot downgrade to event scope.
- `installation`: installation + event + door; explicit scope for a permanent signal.

No P0 event awards an achievement. Scope does not mutate historical achievement registries or V1 sent flags.

## Backend and environments

Discovered route: `functions/api/core7/[[path]].js` → `core7/backend/analytics-v11.js` → Cloudflare D1 `env.DB`. V2 dispatches separately, before the V1 migration:

- `POST /api/core7/analytics/frontdoor`
- `GET /api/core7/frontdoor-stats`

`core7/backend/frontdoor-v2.js` creates `fd_v2_events` and three indexes idempotently in the existing D1 binding. No V1 tables are altered. The new table stores only validated fields, safe properties, receipt time and dedupe keys. There is no deletion or destructive migration.

The server derives local/prod/known Cloudflare preview environment from deployment host, or a trusted `FRONTDOOR_ENV` binding for other hosts. Loopback can never become production, and a known preview host cannot be upgraded by a mistaken prod binding. Payload environment must match the collector. Origin checks also reject local/preview browser traffic sent to production. This prevents accidental development pollution; anonymous telemetry is not proof against deliberately forged server requests.

The browser defaults local/preview delivery off. Explicit opt-in can only target an endpoint in the same environment. Production myclover.com uses the existing Cloudflare analytics host `teem.pages.dev`. Every database row and query includes environment; local/preview Stat cannot query prod rows even if a DB binding is shared.

The aggregate endpoint reuses `functions/stat/_middleware.js`: `STAT_PASSWORD` is required; `STAT_USER` defaults to `teem`. Missing protection fails closed. `/stat/frontdoor/` is served under that existing Cloudflare guard. Vercel-hosted myclover.com shows a link to the protected Cloudflare dashboard; no deployment/routing changes were made. Anonymous visitors sending events do not need to log in.

## Stat definitions

Eight main metrics count distinct installations per event, with events/journeys separately labeled. Additional panels show free roam/resume/rebuild, anomaly/warning/handoff, distributions and a compact graph-edge table. BUILD and CURIOUS can both connect to `dungeon` without a mandatory linear funnel.

Filters: environment, Bangkok calendar date range (up to 93 days), source, visitor class, viewport, primary intent and door. Filters select facts attached to each event; missing intent/door on early events remains unknown rather than being retrospectively invented. Stage rates link chronological events within the same installation/journey. Denominators are distinct installations. Save→Return uses saved installations through the range end and a later-visit Return inside the range, including earlier saves. It is a saved-cohort return rate, not D1/D7 retention.

Timing medians use the earliest active-time value per journey. SQL aggregates all matching rows; it does not silently truncate a raw event sample. NO DATA, PIPELINE UNWIRED and REQUEST FAILED are distinct. No telemetry is emitted by the dashboard itself.

## Verification

Node 24 supports the dependency-free SQLite unit/integration tests:

```sh
npm run test:frontdoor
```

The separate end-to-end test uses the real Pages API handler inside Cloudflare workerd, a local persistent D1 binding, real HTTP requests, the browser client, durable browser storage and the actual Stat page. Only event data/clock values are fixtures. It verifies authentication, validation, deduplication, environment rejection, SQL persistence/aggregation, eight displayed KPIs, mobile overflow and NO DATA. It never connects to a production database.

Supply Miniflare 4.20260730.0 and Playwright from temporary/existing development tools; neither is added as a production dependency. Set `FRONTDOOR_MINIFLARE` and `FRONTDOOR_PLAYWRIGHT` to their module entry files, optionally `FRONTDOOR_CHROME` to an installed Chrome executable, and `FRONTDOOR_PROOF_DIR` to a writable artifact directory, then:

```sh
npm run test:frontdoor:e2e
```

Outputs: `proof.json`, desktop/mobile screenshots and the path to a local D1 directory. `FRONTDOOR_KEEP_OPEN=1` keeps the isolated server/browser alive for inspection; close that browser or press Ctrl-C to finish. No frontend build or root promotion is involved.

Local verification does not establish live Cloudflare deployment, production bindings/CORS, real iPhone Safari behavior or production query cost at scale. Those remain release checks before public Front Door integration.
