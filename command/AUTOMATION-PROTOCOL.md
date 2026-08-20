# myClover Empire Automation Protocol

## Mission
`/command/` is the single front door for operating the myClover empire.
Every operation first declares one strategic verb: **CREATE, EXPAND, or CONQUER**.
Then execution uses one shared TCG language: **ACTION → PASS → GO AGAIN → CLOSE CHAIN**.

The Command Center is not a second source of truth. It reads project sources, manifests, repository state, health, work queues, population signals, learning signals, and infrastructure status, then dispatches work to the correct human or agent.

## Strategic verbs

### CREATE
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

### EXPAND
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

### CONQUER
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

## TCG execution language

### ACTION
The current priority holder executes **one concrete Next Action**.

Rules:
- read the governing Source before editing
- obey Guardrails / Do Not Break
- do not silently expand scope while resolving the action
- produce an observable output or decision

### PASS
Give priority to the next human, AI, reviewer, or production desk.

A valid PASS includes:
- the Operation packet
- what changed
- the output produced
- decisions already locked
- questions still unresolved
- the exact action expected from the next priority holder

PASS is not “throw the task over the wall.” Context must travel with priority.

### GO AGAIN
Use when the current Action resolves successfully but the Operation Goal is **not finished**.

Before GO AGAIN:
- update Next Action to the next concrete move
- preserve Source and Guardrails
- record any decision that changes the route
- keep the same Operation instead of creating a duplicate task

An Operation may GO AGAIN multiple times.

### CLOSE CHAIN
Close only when:
- Success Check passes in reality
- expected output exists and is findable
- no hidden blocker remains
- the next person can understand what was completed without reconstructing the whole conversation

If those conditions are not true, use GO AGAIN or BLOCK instead of pretending the chain is closed.

### BLOCK
BLOCK is a temporary interruption, not a destination.
A blocker must say:
- what is missing
- who/what can unblock it
- what condition allows GO AGAIN

If the task is no longer wanted, **DELETE it** instead of leaving a permanent zombie blocker. Deleted Operations remain represented in the backoffice audit trail.

## Human-development rule
Every Operation should teach the operator how to work better, not only tell them what button to press.
Command and Keen surfaces should expose expandable coaching that explains:
- why this chain state exists
- what good execution looks like
- what context is missing from the packet
- what would cause rework later

The system should gradually improve humans and agents together.

## Control-plane modules
1. Project Manifest — one schema for every project.
2. Current Goal + Next Action — one active direction per project.
3. Source Graph — mother source, child source, canon, dependencies and consumers.
4. Work Queue — Action → Pass → Go Again → Close Chain.
5. Agent Registry — responsibility, permissions, forbidden areas and preferred tools.
6. Health / Repo Warden — tests, deploys, cron, dead routes, stale sources and drift; read-only by default.
7. Decision Memory — what was decided, why, when and what must not be “fixed” later.
8. Population Command — new users, active users, return, first action, interaction and current bottleneck.
9. Learning Loop — registration, completion, review and feedback signals that improve operators and products.
10. Infrastructure City — internal buildings and external providers with state, latest event and advice.

## Dispatch rule
A command is not considered dispatched until it has:
- strategic mode: CREATE / EXPAND / CONQUER
- target project
- goal
- next action
- owner/agent
- source to obey
- expected output
- success check
- guardrails

If any field is unknown, the Command Center must surface the missing field rather than invent it.

## Daily brief
The default board should answer within 30 seconds:
1. เมื่อคืนอะไรเปลี่ยน
2. อะไรพัง
3. อะไรมีคนใช้
4. วันนี้ควรแตะอะไรแค่เรื่องเดียว

The board should also select one **Command Pulse** graph from current attention signals, while letting operators inspect additional charts on demand.

## Attention rule
New construction must not hide operational debt.
Attention takes priority when there are:
- runtime/system errors
- blocked chains
- stale open Operations
- weak social interaction relative to activity
- learning/registration work waiting to be closed

The board should state both the signal and a recommended next move.

## Infrastructure-city rule
myClover infrastructure should be readable like a city-building game.
Every meaningful building/service should expose, where available:
- state
- role
- latest update time
- latest event
- recommendation
- direct route to its real admin/console

External providers must distinguish **configured/linked** from **verified healthy**. Do not claim health that the runtime cannot actually probe.

## Achievement rule
The bottom of the Command board should show real achievements from the last 7 days so operators see progress, not only problems. Examples include closed chains, TeamBook activity, people seen, new learners, and student feedback.

## Population rule
Infrastructure activity is not population growth. Commits, routes, generated assets, and agents are supply-side metrics. The Command Center must keep human metrics visible beside them so new construction does not hide an empty city.

## Key card
The Command Center uses the Flesh and Blood `Command and Conquer` Marvel card as its visual key. It represents the feeling of taking priority, resolving a chain, expanding territory, and operating an empire from one board. The operational source of truth remains this protocol and `empire-manifest.json`.
