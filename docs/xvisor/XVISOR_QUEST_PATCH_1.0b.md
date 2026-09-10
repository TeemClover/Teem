# X-VISOR QUEST 1.0b — Corrective Patch

## Release intent
1.0b corrects the commercial model, XGEN qualification, Year 2 branching, end-game navigation, fixed recognition trips, and mobile finale overflow without changing the 12-month core loop.

## Revenue canon
### ① Personal customer sales
Retail tier is selected from **monthly product sales in baht**, not XV.

- below 40,000 baht: 20%
- from 40,000 baht: 23%
- from 100,000 baht: 25%

When the tier changes during the month, the new percentage is recalculated retroactively across that month's prior personal sales. XV remains Volume and is not the base used to calculate channel ① cash income.

### ② Direct G1 development
For every Direct G1 X-VISOR:
1. calculate that person's own monthly sales-baht tier (20 / 23 / 25%),
2. calculate that person's commission from their sales baht,
3. player receives 20% of that commission.

The player's own 25% tier must never be applied to a Direct G1 sale.

### ③ Organization
XGEN receives 5% of current-month TGV. TGV includes the modeled monthly XV transactions from the whole organization. There is no nested XLEAD layer in this 5% calculation.

## XGEN qualification
XGEN qualifies when **one game month reaches 3,000,000 XV TGV**.

- qualification becomes permanent for that run,
- channel ③ 5% is paid in the same qualifying month,
- qualification does not require rolling-3 volume,
- reaching the target by Month 12 determines the Year 2 path.

## Month 13–24 branch
### XGEN Path
If XGEN was reached by Month 12:
- Year 2 remains XGEN,
- channel ③ remains available,
- fixed Recognition Trips appear in Month 16 and Month 22,
- The Xircle appears in Month 15, 18, 21, 24.

### XLEAD Path
If XGEN was not reached by Month 12:
- Year 2 continues as XLEAD,
- no channel ③ Organization 5%,
- no Recognition Trip,
- the run still reaches the Month 24 ending so the player can see the difference and retry.

## Customer base
Channel ① in later months must come from the player's accumulated recurring customer base plus current-month personal starts/repeats. It must not be modeled as one permanent customer generating the same income for the whole year.

## End game / NEW GAME+
Month 24 is a hard stop. Finale must always expose:
- Scoreboard submission,
- NEW GAME+,
- fresh New Run,
- back to ending scene.

NEW GAME+ starts immediately at Month 1 with Certified X-VISOR status, Energy 28, full Management, zero customers, zero team, and zero run-specific score/economy. It must never land on a Routine screen with no available action.

## Mobile finale
The finale dialog must stay inside the viewport, scroll vertically, and stack dense finale grids to one column on small screens.

## High Score reset
1.0b uses score namespace `1.0b`. Existing 1.0 scores remain stored but are not returned by the 1.0b scoreboard, producing a clean 1.0b leaderboard without destructive database deletion.

## Visible release label
The game shell, footer, world label, score submission, and cache keys must identify the release as **1.0b**.
