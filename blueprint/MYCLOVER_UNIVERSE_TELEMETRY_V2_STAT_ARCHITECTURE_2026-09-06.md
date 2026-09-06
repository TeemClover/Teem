# myClover Universe Telemetry V2
## Stat / Event / Achievement Architecture — prerequisite for the new Front Door

**Date:** 2026-09-06  
**Priority:** P0  
**Analytics direction:** evolve current system from single-funnel analytics into long-lived universe telemetry.

---

# 1. Why Telemetry V2 comes first

The new `/` will assemble itself from visitor choices, show different Lucky Returns, reveal different rewards, route to different Crown Jewels, remember old/new visitors, and continue growing as new rooms appear.

If telemetry is added after the experience is built, the launch data we most need will already be lost.

> **Telemetry is part of the product architecture, not a post-launch dashboard.**

Minimum V2 contract must exist before the public Front Door is wired.

---

# 2. Keep the strong current foundations

Current analytics already has good ideas:

- anonymous installation identity: `c7:install_id`
- no login requirement
- repeatable `ACT` vs one-time `ACHIEVEMENT`
- users/installations vs event counts
- Journey / Behavior / Achievement dashboards
- central Achievement/Act registry
- once-per-device dedupe for milestone-style events
- non-blocking network delivery

Do not throw these away blindly.

---

# 3. What must change

Current stage ontology largely describes the old Main Quest:

```text
home → forge → walkthrough → core7 → classroom → dungeon → endgame → world → secret
```

The new house is not one funnel.

A visitor may go directly to:

```text
SELF → Xircle
BUILD → Dungeon
PEOPLE → TeamBook
INCOME → a qualified private route
CURIOUS → Anomaly → Dungeon
```

Therefore V2 should think in terms of a graph/universe rather than one mandatory sequence.

---

# 4. The 8 telemetry layers

```text
1. ACQUISITION
2. IDENTITY / HISTORY
3. INTENT
4. VALUE
5. REWARD HORIZON
6. JOURNEY / ROUTE
7. ROOM / ACHIEVEMENT / ARTIFACT
8. RETURN / OUTCOME
```

These layers are independent enough that future rooms can join without redesigning the whole schema.

---

# 5. Acquisition

Question:

> คนนี้มาจากไหน?

Normalize coarse source data:

```text
direct
astra-post
facebook
instagram
line
dm
qr
door-share
search
unknown
```

Support:

```text
?from=
utm_source
utm_medium
utm_campaign
```

Suggested fields:

```js
source
medium
campaign
referrerHost
landingPath
```

Do not persist unnecessarily detailed/sensitive referrer URLs.

---

# 6. Visitor/history class

Question:

> บ้านเคยรู้จัก installation นี้หรือยัง?

Coarse classes:

```text
new
legacy
returning-frontdoor
returning-room
veteran
```

Local history can be summarized from old state:

```text
Forge progress
Classroom progress
CORE7 history
Dungeon progress
Secret Ending
Collection/Achievement count
Front Door completion
last First Door
return count
```

Do **not** upload raw localStorage.

Compute named safe facts locally.

---

# 7. Intent

Intent is current need, not personality.

Primary V1 families:

```text
self
build
people
income
curious
```

Secondary examples:

SELF:

```text
see
repeat
human-help
```

BUILD:

```text
proof
learn
improve
```

PEOPLE:

```text
help
system
together
```

INCOME:

```text
skill
business
structured-work
urgent
```

CURIOUS:

```text
anomaly
```

Do not store sensitive free text in V1.

---

# 8. VALUE — the biggest new layer

Old analytics often knows whether someone opened/clicked/completed.

The new system must answer:

> **Did the visitor actually receive value yet?**

Create first-class value milestones.

Examples:

```text
LUCKY_RETURN_VIEW
LUCKY_RETURN_INTERACT
LUCKY_RETURN_COMPLETE
INSIGHT_REVEAL
PROOF_EXPERIENCED
USEFUL_OUTPUT_CREATED
```

Every route should define its earliest genuine value event.

This lets Stat ask:

> คนไม่ได้แค่เข้า — เขาได้อะไรแล้วหรือยัง?

---

# 9. Reward Horizon

Before asking for meaningful effort, the experience should show the reward waiting at the end.

Track:

```text
REWARD_HORIZON_VIEW
REWARD_HORIZON_EXPAND
REWARD_HORIZON_CTA
```

Useful properties:

```js
rewardId
journeyId
destinationDoor
estimatedEffortBucket
```

This tests the core repackaging thesis:

> **Seeing the treasure first increases willingness to continue.**

---

# 10. Journey ID

Each Front Door attempt gets a local Journey ID:

```text
j-...
```

Suggested Journey identity:

```js
journeyId
journeyVersion
startedAt
primaryIntent
secondaryIntent
firstDoor
source
```

A single installation may create multiple Journeys over time.

---

# 11. Journey lifecycle

Canonical concepts:

```text
JOURNEY_START
CHOICE
VALUE
REWARD_HORIZON
DOOR_FOUND
SAVE
DOOR_OPEN
ROOM_RETURN
JOURNEY_RESUME
JOURNEY_REBUILD
JOURNEY_COMPLETE
```

Not every open-ended path requires a final completion event.

---

# 12. P0 Front Door events

Lock these before building the visual experience:

```text
FRONTDOOR_OPEN
FRONTDOOR_STATE
FRONTDOOR_FIRST_CHOICE_VIEW
FRONTDOOR_CHOICE
FRONTDOOR_REACTION_COMPLETE
FRONTDOOR_LUCKY_RETURN_VIEW
FRONTDOOR_LUCKY_RETURN_COMPLETE
FRONTDOOR_REWARD_HORIZON_VIEW
FRONTDOOR_CHOICE_SECONDARY
FRONTDOOR_DOOR_FOUND
FRONTDOOR_SAVE
FRONTDOOR_DOOR_OPEN
FRONTDOOR_FREE_ROAM
FRONTDOOR_RETURN
FRONTDOOR_RESUME
FRONTDOOR_REBUILD
FRONTDOOR_ANOMALY_START
FRONTDOOR_LEGACY_WARNING
FRONTDOOR_ANOMALY_CONTINUE
DUNGEON_HANDOFF
```

Avoid encoding every property into the event name.

Use stable event names + properties.

---

# 13. Event envelope V2

Suggested common shape:

```js
{
  eventId,
  installId,

  eventType,
  eventName,
  occurredAt,

  path,
  roomId,

  journeyId,
  handoffId,

  source,
  visitorClass,

  intentPrimary,
  intentSecondary,

  ref,

  analyticsVersion,
  experienceVersion,
  roomVersion,

  properties: {}
}
```

Do not require every field on every event.

---

# 14. Deduplication scopes

Make event scope explicit:

```text
event
journey
installation
```

Examples:

```text
repeatable ACT
→ event

First Door Found
→ journey

Achievement
→ installation
```

For Journey-scoped events, use a key such as:

```text
journeyId + eventName + ref
```

---

# 15. Active-time metrics

Pageview alone cannot tell why someone stopped.

Measure active time locally and attach milestone durations rather than sending high-frequency pings.

Useful milestones:

```text
activeMsBeforeFirstChoice
activeMsToLuckyReturn
activeMsToDoorFound
activeMsInJourney
```

Respect page visibility.

---

# 16. Core new KPIs

## First Interaction Rate

```text
unique FRONTDOOR_CHOICE
/
unique FRONTDOOR_OPEN
```

Also track median active time to first choice.

## Lucky Return Rate

```text
unique installations receiving Lucky Return
/
unique Front Door opens
```

## Value → Continue

```text
continued after Lucky Return
/
received Lucky Return
```

## Door Open Rate

```text
DOOR_OPEN
/
DOOR_FOUND
```

## Save → Return

```text
returned saved Journeys
/
saved Journeys
```

This last metric directly tests the desired feeling:

> วันนี้ไม่มีเวลา แต่ต้องกลับมาทำให้จบ

---

# 17. Completion is not the only success

New success hierarchy:

```text
LEVEL 1 — first interaction
LEVEL 2 — Lucky Return
LEVEL 3 — Reward Horizon / Door Found
LEVEL 4 — Save
LEVEL 5 — Door Open
LEVEL 6 — destination value
LEVEL 7 — Return
LEVEL 8 — deep completion / artifact / conversion
```

This prevents long high-value experiences from looking like failures merely because people do not finish them in one sitting.

---

# 18. Handoff ID

When Front Door sends a visitor into a room, persist a coarse handoff ID:

```text
h-...
```

Purpose:

```text
Door Open
↔
Destination Arrival
```

Do not expose sensitive choice details in URLs.

Same-origin rooms may use local state or a safe query token. TeamBook is cross-origin and should initially use a simple source/handoff strategy without blocking P0.

---

# 19. Universal room contract

Each major room should eventually declare a small common contract:

```js
ROOM = {
  id,
  version,
  valueEvent,
  completionEvent?,
  primaryNextDoors
}
```

Normalized room milestones:

```text
ROOM_ENTER
ROOM_VALUE
ROOM_MILESTONE
ROOM_COMPLETE
ROOM_EXIT
ROOM_RETURN
```

Detailed room ACT events still remain useful.

---

# 20. Dungeon deep telemetry stays

Current Dungeon already tracks meaningful detail, including:

```text
dungeon-open
dungeon-accept
dungeon-q1
dungeon-q2
dungeon-q3
dungeon-q4
object interactions
fishing
old notebook
dragon
gold
clover
secret discoveries
```

Keep it.

Universe Telemetry only adds a common layer around it.

---

# 21. Artifact lineage — new concept

Achievement answers:

> what did the visitor unlock/do?

Artifact answers:

> what thing exists across the myClover universe and how did it transform?

Owner canon example:

```text
ARTIFACT: teambook-notebook

DUNGEON
→ found in forest
→ restored / secret route
→ meaning: เพื่อนเล่น
→ real-world manifestation: TeamBook.me
```

This is not a disposable Easter egg. It is a product/lore bridge.

Future Artifact registry can grow to Source/Sauce, FIRST HAND, Blacksmith tools, etc., but do not force every object into V1.

---

# 22. Achievement preservation

Current Collection history includes Forge, Classroom, Awaken, rooms, Blacksmith, Hero, Clover Song, Seeker, notebook-found, notebook-restored, Secret Ending, GLHF, CORE7, Dungeon and more.

Do not throw them away because current real-user count is tiny.

Architecture may be rebuilt. Mythology/history should be repackaged.

New Achievement philosophy:

> **proof that the house remembers what the visitor actually did**

Use meaningful categories such as:

```text
DISCOVER
LEARN
BUILD
HELP
PLAY
RESTORE
CONNECT
RETURN
SECRET
```

Do not give a badge for every click.

---

# 23. Collection V2 direction

Long-term `/collection/` can become:

> **the museum of what this visitor actually encountered in the universe**

Potential organization:

```text
STORY
LEARNING
PROOF
ARTIFACTS
DOORS
SECRET HISTORY
WORLD
```

For an artifact such as the notebook:

```text
FOUND — Dungeon forest
RESTORED — secret route
BECAME — TeamBook.me
```

This is P1/P2, not required before the first visual slice.

---

# 24. Privacy

Keep the current low-friction spirit.

Do not add fingerprinting.

Do not upload full localStorage.

Do not make account/login mandatory.

Do not store sensitive health/financial free text in V1.

For the private income route, coarse events are enough:

```text
income_intent_selected
income_route_info_view
income_qualification_continue
income_private_door_found
income_private_door_open
```

Do not record debt, salary, bank balance or sensitive personal circumstances.

---

# 25. Capability / performance telemetry

The Front Door is a high-end technical experience. We need evidence if the tech itself hurts people.

Capture only coarse capability:

```text
viewport: mobile | tablet | desktop
motion: full | reduced
graphics: essential | premium | cinematic
audio: unavailable | available | enabled | muted
```

Do not send exact hardware models.

Sample performance:

```text
LCP
INP
CLS
frontdoor_wake_ms
frontdoor_reaction_ms
door_reveal_ms
vfx_degraded
```

Do not send continuous frame data for every visitor.

---

# 26. Error telemetry

Normalize a tiny set of errors:

```text
frontdoor_runtime_error
route_config_missing
destination_prefetch_failed
audio_init_failed
vfx_init_failed
storage_failed
```

Analytics failure must never block product behavior.

---

# 27. Analytics version

Current analytics is `1.x` and represents the old ontology.

Universe Telemetry should bump the major version:

```text
2.0.0
```

Also keep separate product versions:

```text
experienceVersion: frontdoor-2026.09-v1
roomVersion: dungeon-v2 / xvisor-1.0b / etc.
```

Never reuse an old event ID with a new semantic meaning.

Example:

Old:

```text
home-open
```

New root should use:

```text
frontdoor-open
```

because they are different experiences.

---

# 28. Registry architecture

Current `assets/achievements.js` already demonstrates a useful single-source-of-truth model.

V2 direction:

```text
telemetry/events.js
telemetry/rooms.js
telemetry/achievements.js
telemetry/artifacts.js
telemetry/journeys.js
```

These names are conceptual; do not over-modularize before P0 works.

Critical rule:

> Event meaning must live in one registry, not be copied into multiple dashboards and clients.

Unknown received events should surface as ORPHANs rather than silently disappearing.

---

# 29. Development / preview separation

Local development must not pollute production analytics.

Canonical environment property:

```text
env = local | preview | prod
```

Default local behavior should not POST into production.

Preview telemetry may be enabled intentionally but must remain filterable/separate.

---

# 30. New `/stat/` information architecture

Long-term:

```text
/stat/                Command Center
/stat/acquisition/    sources
/stat/frontdoor/      first touch + routing
/stat/value/          Lucky Return + Reward Horizon
/stat/journeys/       route graph / resume
/stat/rooms/          destination health
/stat/behavior/       detailed ACT behavior
/stat/collection/     Achievement + Artifact
/stat/retention/      return / D1 / D7
/stat/quality/        performance / device / errors
```

Do not build all of these before the Front Door.

---

# 31. P0 `/stat/frontdoor/`

Before public Front Door work, create one responsive dashboard that answers:

```text
OPEN
FIRST TOUCH
LUCKY RETURN
REWARD HORIZON
DOOR FOUND
SAVE
DOOR OPEN
RETURN
```

Show rates between them.

Also show:

```text
median time to first touch
median time to Lucky Return
median time to Door Found
```

Filters needed early:

```text
source
new / returning / legacy
mobile / desktop / tablet
intent
First Door
```

Primary metrics must read well on phone. Detail tables may scroll horizontally only where necessary.

---

# 32. Route distribution

Show route families:

```text
SELF
BUILD
PEOPLE
INCOME
CURIOUS
```

Then First Door distribution.

Do not call alternative successful routes “drop-off.”

Only call abandonment when someone leaves before the next meaningful milestone.

---

# 33. The most important product questions V2 must answer

1. **เราให้คุณค่าช้าเกินไปตรงไหน?**
2. **คนเห็นรางวัลแล้วอยากเดินต่อมากขึ้นจริงไหม?**
3. **ประตูที่เลือกให้ตรงพอจนคนเปิดหรือไม่?**
4. **คนที่ไม่มีเวลาวันนี้ Save แล้วกลับมาหรือเปล่า?**
5. **ของเก่าชิ้นไหนมีคุณค่ามากขึ้นหลัง Repackage?**
6. **คนที่เจอ myClover มี behavioral evidence ว่ารู้สึกว่าคุ้มไหม?**

We cannot directly measure “โชคดี.” Use proxies:

```text
Lucky Return
Door Open
Save
Return
Share
Deep continuation
Contextual feedback
```

---

# 34. Minimum implementation order

Before high-end Front Door coding:

```text
1. Freeze V2 minimum event schema
2. Add Journey ID
3. Add source normalization
4. Add visitor/history class snapshot
5. Add clean Front Door telemetry client
6. Add backend acceptance / validation
7. Build /stat/frontdoor/
8. Verify local/preview/prod separation
9. Verify test event flow
10. Then build State 0
```

Do **not** build the whole Stat universe before visual work.

Minimum prerequisite is:

```text
schema
+ event client
+ backend acceptance
+ frontdoor dashboard skeleton
```

Then Telemetry and Front Door evolve together.

---

# 35. Final North Star

The telemetry system should make it possible to answer:

> **For any installation that enters myClover, what did the house understand, what value did it give, what did the visitor choose, what did the house reveal, what did they discover, and did they come back — without needing to know their real-world identity?**

The Stat system is the nervous system.

The Front Door is the face.

The repo is the memory.

The Collection is the museum/history.

The Crown Jewels are the proof.
