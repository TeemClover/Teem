# myClover Repo Recon — Astra Local Build Handoff

**Repo:** `TeemClover/Teem`  
**Date:** 2026-09-06  
**Purpose:** make the first local Astra session start from product work, not repo archaeology.

## 1. Repo shape

This is a large **static-first web ecosystem** with server/API pieces, not a conventional React/Vite/Next frontend app.

Important user-facing areas include:

```text
/
hall.html
/classroom/
/classroom/dungeon/
/classroom/awaken/
/forge/
/walkthrough/
/core7/
/xircle/
/xvisor/
/meet/
teambook/
/xty/
/resume/
/club/
/collection/
/guild/
/paths/
/card/
/profile/
/stat/
```

Shared/infrastructure:

```text
/assets/
/img/
/media/
/icons/
/api/
middleware.js
vercel.json
package.json
site.webmanifest
_headers
_redirects
```

## 2. Build/deploy reality

Root `package.json` is not a frontend build app. There is no normal root `npm run dev` / `npm run build` workflow. Existing scripts are mainly tests and product-specific checks.

For static Front Door iteration, a simple local server is enough at first:

```bash
python3 -m http.server 8000
```

Use production-like Vercel local tooling only when testing middleware, APIs, redirect/rewrite behavior, or host-specific logic.

Recommended tomorrow:

```bash
git checkout main
git pull
npm install
npm test
git checkout -b feat/adaptive-front-door-v1
```

Capture baseline screenshots, Network waterfall, current localStorage inventory, and current root behavior before editing.

## 3. `/` is bigger than a homepage

`site.webmanifest` uses:

```text
start_url: /
display: standalone
```

So replacing `/` also changes the installed-PWA entrance. Returning-user behavior cannot be an afterthought.

The current root is a cinematic AI-course entrance. Useful pieces may be reused, but its product contract changes from:

```text
AI course entrance → Hall
```

to:

```text
Living House → value → First Door → Save → Personalized Home
```

## 4. Hall and old Main Quest

`hall.html` currently acts as the old state-aware house/compass and includes Forge, Classroom, CORE7, paths, rooms, Inventory, Resume, Club, XTY, Guild, Xircle and secret mechanics.

Do not delete Hall in the first implementation.

Old architecture may eventually be replaced, but initial migration should keep Hall/Main Quest available until the new Home has parity.

`hall-full.html` is a historical First Version snapshot. Keep it as archive/history; do not merge its old CSS into the new root.

## 5. `assets/stage.js`

Protect this file.

Its job is essentially:

> “คนคนนี้เดินถึงไหนแล้วใน Main Quest เดิม?”

It reads legacy state from `mc_*`, `c7:*`, Forge progress and Classroom state.

Do **not** mutate it into the new global recommendation/personalization engine.

Recommended separation:

```text
assets/stage.js
= legacy/Main Quest progress

new Front Door state
= intent + Lucky Return + First Door + personalized Home
```

## 6. Existing state keys to protect

Known important examples:

```text
mc_glhf_seen
mc_intro_seen
mc_read
mc_walk_done
mc_learn
mc_class
mc_seek_n
mc_seek_hit
mc_titles
mc_secret_end
mc_secret_end_ever_v1
mc_nb_seen
mc_nb_seen_ever_v1
mc_nb_restored
mc_nb_restored_ever_v1
mc_dungeon_state_v2
mc_dungeon_cleared_v1
mc_dungeon_awakened_v1

c7:tutorial_completed
c7:stats_bot
c7:stats_casual
c7:collection
c7:first_set_completed
c7:install_id
```

Tomorrow run a local registry scan before implementing any reset logic:

```bash
rg -n "localStorage\.(getItem|setItem|removeItem)|localStorage\[" --glob '!node_modules/**'
rg -n "mc_[A-Za-z0-9_:.-]+|c7:[A-Za-z0-9_:.-]+" --glob '!node_modules/**'
```

Owner is willing to radically rebuild architecture because current real-user volume is tiny, but mythology/history should still be preserved deliberately rather than accidentally erased.

## 7. Direct links are a historical invariant

Old Journey docs explicitly separate HOUSE JOURNEY from DIRECT ROOM.

Direct URLs such as:

```text
/core7/
/resume/
/club/
/xvisor/
/xircle/
/classroom/dungeon/
```

must remain directly usable.

The new `/` improves discovery; it is not an onboarding gate.

## 8. Crown Jewel — THE DUNGEON

Canonical:

```text
/classroom/dungeon/
```

Current Dungeon is already a large stateful one-file experience with the explicit idea:

```text
one living HTML file
```

and evolution from text/terminal toward interactive/game/network states.

**Do not rebuild it.**

Front Door should create an entrance worthy of it.

Approved entrances:

```text
BUILD → proof → THE DUNGEON
```

and:

```text
CURIOUS → ANOMALY → legacy warning → THE DUNGEON
```

Same destination; different emotional meaning.

## 9. Secret lineage

Important current/historical files:

```text
/classroom/awaken/legacy.html
/classroom/awaken/legacy-snapshot.html
/classroom/awaken/notebook/
```

`legacy.html` is the real red warning page:

```text
THIS PAGE IS CORRUPTED!!
LEGACY FILE · INTEGRITY CHECK FAILED
```

Owner confirmed this warning page was originally intended to filter people entering the harsher/direct Dungeon experience without completing all lessons.

Dungeon/achievement registry also contains:

```text
dungeon-object-fishing
dungeon-object-notebook
dungeon-book-found
dungeon-secret-boot
dungeon-secret-clover
...
```

Owner canon lock:

> **The notebook found in the forest in Dungeon is the same notebook that becomes TeamBook.me.**

This should be treated as product/lore lineage, not a disposable Easter egg.

## 10. TeamBook public origin

Source lives under `teambook/` in this repo, but `teambook/index.html` declares canonical:

```text
https://teambook.me/
```

Treat it as cross-origin when designing transitions/handoffs unless local deployment inspection proves another canonical myClover mirror.

Do not assume same-origin View Transition into TeamBook.

## 11. Xircle

Current `/xircle/` is already a useful interactive one-day experience (Eat / Move / Sleep → Habit Score) with a low-friction promise around ~2 minutes and no signup.

This is already a strong Lucky Return destination.

Front Door role:

```text
SELF → SEE → XIRCLE
```

Do not block P0 Front Door on redesigning Xircle.

## 12. RoutineX

Canonical working route:

```text
/xircle/routinex/
```

Front Door meaning:

```text
REPEAT
```

not merely a product catalogue.

## 13. X-VISOR

Current public release:

```text
/xvisor/
→ /xvisor/quest/
```

Use as proof for people signaling:

```text
system / team / organization / business simulation
```

Do not rewrite X-VISOR during Front Door P0.

## 14. Meet

Canonical:

```text
/meet/
```

Current page already has intent-based interaction, premium motion, health/business/human layers, and booking continuation.

Use it as the human-context First Door.

Verify locally whether proposed query parameters such as:

```text
?intent=health
?intent=business
```

are actually consumed before relying on them.

## 15. Collection / Achievement architecture

Important files:

```text
/assets/achievement-state.js
/assets/achievements.js
/collection/index.html
/collection/collection.js
/collection/stat/
```

Current system already has the correct architectural instinct:

- central registry
- ACT vs ACHIEVEMENT distinction
- shared achievement-state truth
- orphan/duplicate detection in Stat

Preserve existing IDs. Historical IDs are data contracts.

## 16. Tracking performance warning

Current `/assets/track.js` is **not** merely a tiny tracker. It starts loading many patch modules across Guild/Awaken/Classroom/Forge/CORE7/etc.

Do not casually load it on the new flagship root.

The new Front Door needs a clean minimal runtime and clean minimal telemetry client.

Recommended direction:

```text
/assets/front-door/
  app.js
  state.js
  routes.js
  styles.css
  audio.js
  telemetry.js
```

Only split further when VFX complexity justifies it.

## 17. Current analytics backend

Core analytics currently lives around:

```text
/core7/js/analytics.js
```

It already supports:

- anonymous installation ID
- repeatable ACT events
- once-per-device milestones
- Journey events
- Achievement unlocks
- overview/stat APIs
- keepalive non-blocking delivery

Universe Telemetry V2 should evolve this foundation instead of throwing it away blindly.

## 18. Media/audio assets

Current home media includes multi-megabyte opening videos. Current global audio folder has Clover songs >4MB each.

Do not preload these just to make the new Front Door feel expensive.

New SFX should be a small intentional package or procedural Web Audio.

High-end must mean high perceptual quality, not huge initial download.

## 19. Deployment configs — leave alone during P0

Inspect but do not “clean up” casually:

```text
middleware.js
vercel.json
_headers
.vercelignore
_redirects
```

Middleware canonicalizes extensionless page-like paths to trailing slash and preserves query params. Vercel config contains many historical aliases/host routes. `_headers` includes private/noindex rules. `.vercelignore` intentionally prevents Cloudflare functions from being served as static source.

P0 Front Door does not need a routing cleanup project.

## 20. Files Astra should read first

### Product source

```text
/blueprint/README.md
/blueprint/MYCLOVER_ADAPTIVE_FRONT_DOOR_MASTER_PRD_V2_ULTRA_2026-09-06.md
/blueprint/MYCLOVER_REPO_RECON_FOR_ASTRA_LOCAL_2026-09-06.md
/blueprint/MYCLOVER_UNIVERSE_TELEMETRY_V2_STAT_ARCHITECTURE_2026-09-06.md
/blueprint/TOMORROW_P0_BUILD_SEQUENCE_2026-09-07.md
/blueprint/MYCLOVER_UNIVERSE_CANON_2026-09-06.md
```

### Current entrance/state/runtime

```text
/index.html
/hall.html
/assets/stage.js
/assets/hall-core.js
/assets/track.js
/assets/track-core.js
/core7/js/analytics.js
/assets/achievement-state.js
/assets/achievements.js
/stat/index.html
/stat/journey/index.html
/stat/behavior/index.html
/collection/stat/index.html
/middleware.js
/vercel.json
/package.json
```

### Crown Jewel context — just in time

```text
/classroom/dungeon/index.html
/classroom/awaken/legacy.html
/classroom/awaken/notebook/index.html
/xircle/index.html
/xvisor/index.html
/meet/index.html
/teambook/index.html
```

Do not ingest all Crown Jewel internals before the relevant branch is being built.

## 21. Do not touch yet

P0 should not:

- redesign Xircle
- redesign X-VISOR
- redesign TeamBook
- rewrite Meet
- delete Hall
- delete historical achievements
- migrate whole repo to a framework
- refactor all APIs
- refactor all localStorage
- clean all Vercel/Cloudflare routing
- add runtime AI routing
- create account/cloud-sync requirements

## 22. P0 quality target

Prove one vertical slice:

```text
Telemetry V2 minimum
→ State 0
→ first click
→ causal visual/GUI/VFX/SFX reconstruction
→ Lucky Return
→ Reward Horizon
→ BUILD → Dungeon
→ CURIOUS → Anomaly → legacy warning → Dungeon
→ Save
→ Return
```

If this is not exceptional, do not expand the universe yet.

## 23. Mac vs iPhone

Mac = forge:

- code
- DevTools
- Git
- network
- performance
- audio/VFX
- viewport simulation

Phone = jury:

- do I want to tap?
- does it feel instant?
- does the sound feel expensive?
- does it feel exclusive?
- would I screen-record it?
- do I want to come back?

## 24. Final repo rule

> **Use the local repository as the source of truth for implementation facts. Use `/blueprint/` as the source of truth for product intent.**
