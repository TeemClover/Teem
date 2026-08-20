# myClover Empire Automation Protocol

## Mission
`/command/` is the single front door for operating the myClover empire.
Every action must reduce to one of three verbs: CREATE, EXPAND, or CONQUER.
The Command Center is not a second source of truth. It reads project sources, manifests, repository state, health, work queues, and population signals, then dispatches work to the correct human or agent.

## CREATE
Use when something does not exist yet.

Required packet:
- project identity: name, slug, domain/path, repository, owner
- problem and intended user
- current goal
- next action
- mother source / canon location
- modules/routes to create
- dependencies
- assigned agent or production desk
- release target
- first population metric

Completion means the project is registered, has a source, has an executable next action, and has a measurable human outcome.

## EXPAND
Use when an existing project gains a new route, feature, workflow, asset family, automation, or integration.

Required packet:
- existing project
- expansion goal
- scope to change
- source/canon that governs the change
- dependency impact
- work queue owner
- tests/health checks
- decision log entry
- release plan
- expected population impact

Completion means the expansion is live without creating source drift or orphan dependencies.

## CONQUER
Use when importing, replacing, absorbing, migrating, or integrating an external system/project into myClover.

Required packet:
- target inventory
- what to keep, replace, archive, or wrap
- route/domain plan
- source ownership after migration
- account/identity integration
- dependency migration map
- data migration/risk notes
- success metric

Completion means the target can be operated from the same control plane and no longer requires a separate mental model.

## Control-plane modules
1. Project Manifest — one schema for every project.
2. Current Goal + Next Action — one active direction per project.
3. Source Graph — mother source, child source, canon, dependencies and consumers.
4. Work Queue — Teem → AI → Keen → Review → Merge → Live.
5. Agent Registry — responsibility, permissions, forbidden areas and preferred tools.
6. Health / Repo Warden — tests, deploys, cron, dead routes, stale sources and drift; read-only by default.
7. Decision Memory — what was decided, why, when and what must not be "fixed" later.
8. Population Command — new users, active users, return, first action, interaction and current bottleneck.

## Dispatch rule
A command is not considered dispatched until it has:
- operation type
- target project
- goal
- next action
- owner/agent
- source to obey
- expected output
- success check

If any field is unknown, the Command Center must surface the missing field rather than invent it.

## Daily brief
The default Command Center view should answer within 30 seconds:
1. เมื่อคืนอะไรเปลี่ยน
2. อะไรพัง
3. อะไรมีคนใช้
4. วันนี้ควรแตะอะไรแค่เรื่องเดียว

## Population rule
Infrastructure activity is not population growth. Commits, routes, generated assets, and agents are supply-side metrics. The Command Center must keep human metrics visible beside them so new construction does not hide an empty city.

## Key card
The Command Center uses the Flesh and Blood `Command and Conquer` Marvel card as its visual key. It is a theme/identity device only; the operational source of truth remains this protocol and `empire-manifest.json`.
