# myClover Blueprint — Adaptive Front Door / Living House

**Date:** 2026-09-06  
**Status:** P0 build pack for local Mac + Astra 6  
**Repository:** `TeemClover/Teem`

This folder is the working source pack for the largest front-of-house rebuild since myClover launched.

## Read in this order

1. `MYCLOVER_ADAPTIVE_FRONT_DOOR_MASTER_PRD_V2_ULTRA_2026-09-06.md` — product/experience constitution.
2. `MYCLOVER_REPO_RECON_FOR_ASTRA_LOCAL_2026-09-06.md` — repo reality, state/deploy constraints, files to inspect.
3. `MYCLOVER_UNIVERSE_TELEMETRY_V2_STAT_ARCHITECTURE_2026-09-06.md` — Stat/Telemetry V2 that must be wired before the public Front Door.
4. `TOMORROW_P0_BUILD_SEQUENCE_2026-09-07.md` — exact order of work for the first local build session.
5. `MYCLOVER_UNIVERSE_CANON_2026-09-06.md` — lore/product relationships that implementation must not accidentally break.

## P0 objective

Do **not** rebuild the whole universe in one pass.

Prove one vertical slice at a 10/10 quality bar:

```text
Telemetry V2 minimum
→ State 0
→ irresistible first touch
→ immediate visual + GUI + VFX + SFX causal reconstruction
→ Lucky Return
→ Reward Horizon
→ BUILD → THE DUNGEON
→ CURIOUS → ANOMALY → legacy warning → THE DUNGEON
→ Save
→ Return
```

The first public experience must make a stranger feel:

> **ดีที่กดเข้ามา**

and ideally later:

> **ต้องหาเวลากลับมาทำให้จบ**

## Non-negotiable principles

- **Value before path.**
- **No conversion before value.**
- **Give before ask.**
- **Show the treasure before asking for effort.**
- **Playable, not game-looking.**
- **Every tap must visibly matter.**
- **The page must feel like it is assembling because of the visitor.**
- **High-end Visual / GUI / VFX / SFX are core product requirements, not polish.**
- **Direct room links remain direct.**
- **THE DUNGEON is a Crown Jewel; do not rebuild it.**
- **Old architecture may be replaced, but old mythology/achievements should be preserved and repackaged.**
- **Do not ingest or rewrite the entire repo before the P0 slice works.**

## Positioning

External launch hook:

> ผมลองให้ Astra ทำ “หน้าแรกของเว็บ” จาก Prompt เดียว
>
> แต่แทนที่จะให้มันสร้าง Landing Page
>
> ผมให้มันสร้างเว็บที่ **ประกอบตัวเองตามคนที่เปิด**
>
> ลองดูว่า **ของคุณจะกลายเป็นอะไร**

Internal author position:

> **AI Experience Architect**

Astra is the creation engine/hook.  
myClover is the proof.  
Teem is the author/system designer.

## Tomorrow: first instruction to Astra

> Read every file in `/blueprint/` first, then inspect only the repository files named in the repo recon. Do not modify anything until you can explain the exact P0 vertical slice, the minimum files to touch, current analytics/state contracts, and performance risks. Do not redesign Hall or destination rooms, do not import the whole repo into context, and do not start with visual code before the minimum Telemetry V2 contract is clear.

When the diagnosis is correct:

> **Build it. Start with Telemetry V2 minimum.**
