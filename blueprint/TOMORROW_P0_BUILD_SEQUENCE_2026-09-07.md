# Tomorrow P0 Build Sequence — 2026-09-07

**Objective:** build the smallest vertical slice that proves the future architecture at a 10/10 quality bar.

Do **not** attempt to finish myClover 2.0 in one day.

---

# 1. Clone / baseline

```bash
git clone <repo>
cd Teem
git checkout main
git pull
npm install
npm test
git checkout -b feat/adaptive-front-door-v1
```

Before editing:

- open current `/`
- capture desktop screenshot
- capture iPhone-size screenshot
- record current Network waterfall
- record current localStorage keys
- note current root load/performance

---

# 2. Read only the blueprint pack first

Read in order:

```text
/blueprint/README.md
/blueprint/MYCLOVER_ADAPTIVE_FRONT_DOOR_MASTER_PRD_V2_ULTRA_2026-09-06.md
/blueprint/MYCLOVER_REPO_RECON_FOR_ASTRA_LOCAL_2026-09-06.md
/blueprint/MYCLOVER_UNIVERSE_TELEMETRY_V2_STAT_ARCHITECTURE_2026-09-06.md
/blueprint/MYCLOVER_UNIVERSE_CANON_2026-09-06.md
```

Then inspect only the current repo files named in the Recon.

Do not ingest the whole repo.

---

# 3. First Astra prompt

> Read every source in `/blueprint/` first, then inspect only the repository files named in the Repo Recon first-read section. Do not modify anything yet. Your first task is to produce a concise implementation diagnosis for the P0 vertical slice: **Universe Telemetry V2 minimum → State 0 → First Click → Lucky Return → Reward Horizon → BUILD/CURIOUS → THE DUNGEON → Save → Return.** Identify the minimum files to touch, current analytics/state contracts to preserve, performance risks, and the safest sequence. Do not redesign Hall or destination rooms. Do not ingest the whole repo. Do not start coding until you can explain the exact slice and its telemetry.

When diagnosis is correct:

> **Build it. Start with Telemetry V2 minimum.**

---

# 4. Local state inventory

Run before writing reset/migration code:

```bash
rg -n "localStorage\.(getItem|setItem|removeItem)|localStorage\[" --glob '!node_modules/**'
rg -n "mc_[A-Za-z0-9_:.-]+|c7:[A-Za-z0-9_:.-]+" --glob '!node_modules/**'
```

Create a local temporary registry of state contracts.

Do not upload all localStorage to analytics.

---

# 5. Telemetry V2 minimum — first implementation milestone

Implement only what the P0 slice needs:

```text
FRONTDOOR_OPEN
FRONTDOOR_STATE
FRONTDOOR_CHOICE
FRONTDOOR_REACTION_COMPLETE
FRONTDOOR_LUCKY_RETURN_VIEW
FRONTDOOR_LUCKY_RETURN_COMPLETE
FRONTDOOR_REWARD_HORIZON_VIEW
FRONTDOOR_DOOR_FOUND
FRONTDOOR_SAVE
FRONTDOOR_DOOR_OPEN
FRONTDOOR_RETURN
FRONTDOOR_RESUME
FRONTDOOR_REBUILD
FRONTDOOR_ANOMALY_START
FRONTDOOR_LEGACY_WARNING
FRONTDOOR_ANOMALY_CONTINUE
DUNGEON_HANDOFF
```

Minimum common properties:

```text
installId
journeyId
visitorClass
source
intentPrimary
intentSecondary
doorId
experienceVersion
graphicsTier
occurredAt
```

Do not log sensitive user text/health/financial data.

---

# 6. Build `/stat/frontdoor/`

Before high-end visuals, prove test events can be observed.

Dashboard minimum:

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

Show rates between milestones.

Also show:

```text
median time to first touch
median time to Lucky Return
median time to Door Found
```

Must be readable on mobile and desktop.

Local/preview traffic must not pollute production stats.

---

# 7. Build a clean Front Door runtime

Do **not** automatically inherit `/assets/track.js` because it can eagerly initiate many unrelated patch imports.

Prefer a clean runtime such as:

```text
/assets/front-door/
  app.js
  state.js
  routes.js
  styles.css
  audio.js
  telemetry.js
```

Keep it small until the interaction works.

---

# 8. State 0 — the first public scene

Objective:

> A total stranger wants to touch something within 5 seconds.

Working copy concept:

```text
MYCLOVER · บ้านที่เปลี่ยนตามคุณ

หน้านี้ยังสร้างไม่เสร็จ

เลือก 1 อย่าง
แล้วดูว่าเว็บนี้จะประกอบตัวเองไปทางไหน
```

Working intent pieces:

```text
ตัวฉัน
สิ่งที่กำลังสร้าง
คนของฉัน
งานและรายได้
ลองของที่คิดว่าฉันน่าจะชอบ
```

These must not look like a generic SaaS card grid or survey radio buttons.

They should feel like pieces of an unfinished composition while remaining obviously tappable.

Do not show full navigation before the first choice.

---

# 9. First Click — do not proceed until this is exceptional

When the first choice is tapped, the visitor must perceive:

> **I caused the website to change.**

The reaction should combine, where useful:

```text
visual reconstruction
GUI reconstruction
layout/state change
route geometry
VFX
sound wake
copy response
```

The immediate response should feel <150ms even if decorative motion continues.

After first touch, Web Audio may wake because the user gesture now permits it.

Do not start with loud music.

---

# 10. Give Before Ask

After Choice 1:

Do not immediately ask Question 2.

Return something useful first.

The user should receive a **Lucky Return** before more effort is requested.

Every time the system asks for 1 unit of effort, it should feel like the visitor receives >=1–2 units of value.

---

# 11. Reward Horizon

Before the route asks for meaningful reading/effort, show what waits at the end.

For BUILD, the strongest reward is THE DUNGEON itself.

Do not show a generic lock icon.

Show a real visual fragment/preview of what is waiting.

The visitor should feel:

> “อีกนิดเดียวกูจะถึงไอ้นั่น”

not:

> “กูต้องอ่านอีกตั้งเยอะ”

---

# 12. Finish BUILD branch first

Canonical P0 branch:

```text
สิ่งที่กำลังสร้าง
→ Lucky Return
→ ขอดูของจริงก่อน
→ Reward Horizon
→ FIRST DOOR FOUND
→ THE DUNGEON
→ Save
→ Open
```

Only now read the full Dungeon source if not already needed:

```text
/classroom/dungeon/index.html
```

Do not rewrite Dungeon.

Design an entrance worthy of it.

---

# 13. First Door reveal quality bar

Do not render:

```text
Recommended for you: Dungeon
[Go]
```

Instead:

```text
last choice locks
→ unrelated fragments dim
→ route line resolves
→ Dungeon visual language bleeds into the current house
→ terminal/system fragment forms
→ title/reason appears
→ CTA becomes physically available
```

Target reveal ~1–1.8s, but CTA can become tappable before decorative animation ends.

Use View Transitions where supported only if they improve the illusion without creating a dependency.

---

# 14. Finish CURIOUS branch second

Canonical:

```text
ลองของที่คิดว่าฉันน่าจะชอบ
→ normal house stops
→ ambient/sound collapses
→ GUI retracts
→ ANOMALY
→ legacy warning threshold
→ voluntary continue
→ THE DUNGEON
```

Read just-in-time:

```text
/classroom/awaken/legacy.html
/classroom/awaken/notebook/index.html
```

Owner confirmed `legacy.html` was originally intended as a warning/filter for people entering the harsher direct Dungeon without completing the lessons.

Do not fake browser malware/security chrome.

The anomaly belongs inside the myClover fiction/interface.

---

# 15. Canonical secret/product lineage

Locked:

> The notebook found in the forest in Dungeon is the same notebook that becomes TeamBook.me.

Preserve this relationship.

The notebook is not merely an Easter egg; it is a real universe artifact that crosses from game → product.

---

# 16. Save happens at Door Found

Do not wait until Dungeon completion.

Once First Door is found, save enough state for return:

```text
journeyId
choices/intents
firstDoor
recommendations/build state
saved timestamp
```

No login.

Refresh should preserve it.

---

# 17. Returning root

When the saved visitor returns to `/`, do not replay first-run automatically.

Minimum returning experience:

```text
WELCOME BACK

คราวก่อนคุณเปิด
THE DUNGEON

[ ไปต่อ ]
[ ดูบ้าน ]
[ ประกอบใหม่ ]
```

Legacy users with meaningful old progress should also be recognized rather than treated as total strangers.

---

# 18. Free Roam

At First Door:

```text
[ เปิดประตู ]
[ ดูบ้านทั้งหมด ]
```

The adaptive experience is an invitation, not a trap.

Direct room URLs remain direct.

---

# 19. Mobile-first review loop

Mac = forge.

iPhone = jury.

After every meaningful visual milestone, test:

```text
อยากกดไหม?
กดแล้วรู้ทันทีไหมว่าเว็บเปลี่ยนเพราะเรา?
ภาพแพงหรือแค่เอฟเฟกต์เยอะ?
เสียงช่วยไหม?
กดด้วยนิ้วดีไหม?
อยากกดต่อเองไหม?
อยาก screen-record ไหม?
```

Do not expand routes before first-click quality passes.

---

# 20. Performance rules

- do not preload the whole universe
- load only State 0 assets first
- after Choice 1, prefetch likely branch assets
- after Choice 2, prefetch destination-critical assets
- WebGPU = enhancement, not requirement
- Canvas/WebGL/SVG/CSS/DOM should provide strong fallbacks
- reduced-motion experience must remain world-class
- expensive loops pause in background tabs
- avoid main-thread long tasks
- no large Clover song preload just for SFX
- no unrelated global patch storm

High-end means **maximum perceptual quality per millisecond of friction**.

---

# 21. What not to do tomorrow

Do not:

- rebuild every route
- redesign Xircle
- redesign X-VISOR
- redesign TeamBook
- rewrite Meet
- delete Hall
- migrate whole repo to a framework
- build Collection V2 fully
- build the private Income route fully
- build every Stat page
- add runtime AI routing
- add login/cloud sync
- clean every old config
- build elaborate 3D before first click works

---

# 22. If time/credit remains

After BUILD + CURIOUS + Save/Return are 10/10:

Add functional skeletons:

```text
SELF → Xircle / RoutineX / Meet
PEOPLE → Meet / X-VISOR / TeamBook
INCOME → placeholder/qualification architecture only
```

Polish later based on real data.

---

# 23. Merge gate

Do not replace production root until:

- new first screen clearly beats current root
- first touch is irresistible/testable
- first reaction is causal and fast
- mobile is exceptional
- telemetry is wired
- local/preview analytics separation works
- root network is audited
- Save/Return works
- direct rooms survive
- Dungeon handoff works
- Free Roam exists
- reduced motion works
- sound mute works
- old important history/state is not accidentally destroyed

---

# 24. Tomorrow's actual win condition

Not:

> “We finished myClover 2.0.”

Win condition:

> **A stranger enters, wants to touch, receives value, sees a treasure worth returning for, reaches THE DUNGEON through a route that feels personally caused, saves that path, and the Stat system can explain every meaningful milestone.**
