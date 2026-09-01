# Clover Compendium

Institutional memory for myClover / Clover X work.

This directory is the source of truth for monthly operating reviews, decisions, experiments, failures, feedback, and skills that should survive across people and AI sessions.

## Read this before taking substantial work

1. Read the latest closed monthly review in `compendium/months/`.
2. Read `compendium/SKILLS.md` to understand current strengths, weak points, and active level-up quests.
3. Preserve decisions that are still active. Do not silently re-open an old hypothesis without new evidence.
4. When proposing product work, identify the user behavior, business metric, or validated friction the work is meant to change.
5. When a month closes, add a new `YYYY-MM.md`, update `SKILLS.md`, and record what changed in the operating doctrine.

## Monthly close format

Each month should contain:

- Executive snapshot
- What was built / shipped / tested
- Money and meaningful resource costs
- What worked
- What failed or surprised us
- Decision log
- CEO / operating feedback
- Skills gained and skills that need leveling
- Rules extracted for future work
- Open hypotheses
- Next-month priorities and stop-doing list

## Current archive

- [`2026-08`](./months/2026-08.md) — **CLOSED** on 2026-09-01. Main lesson: building capacity is ahead of distribution capacity; AI-video production became the most expensive failed distribution experiment of the month.

## Web view

A short internal summary is available at `/compendium/` on myclover.com. The web page intentionally uses the same lightweight read-only gate experience as the existing XTY Admin page.

Important: the web gate is an internal convenience gate, **not a secret vault**. Repository Markdown remains the canonical knowledge source for authorized development agents. Do not put credentials, API keys, private customer data, or secrets in Compendium files.
