# TeamBook Book Lineage & Memory Canon

Status: canonical foundation

## Why this exists

TeamBook is not only a live activity surface. A finished book is intended to become a memory object that may matter more after months or years than it did on the day it was active.

The model is intentionally closer to a notebook shelf or a TCG album than to a disposable task history:

- a card image can become an anchor for a period of life;
- the people who were in that book matter;
- the exact cover chosen for that volume matters;
- the order of volumes matters;
- a member graduating from one book and opening another creates real lineage.

The system must therefore preserve provenance instead of reconstructing the past from mutable current data.

## Two different relationships

### Continuation

An official next volume of the same story.

`A1 -> A2 -> A3`

Rules:

- only the lead/owner of the finished source book may create the official continuation;
- the continuation stays in the same `series_id`;
- `volume_number` increments;
- `previous_book_id` points to the finished source volume;
- there is at most one official next volume from a source volume;
- there is no daily streak requirement and no penalty for waiting before opening the next volume.

The human-facing continuity language should be closer to:

> เขียนด้วยกันมา 6 เล่ม

not:

> 168-day streak

### Spawn

A former member of a finished book starts a new series of their own.

```text
A1 -> A2 -> A3 -> A4
          |\
          | B1 -> B2
          \\ C1 -> C2 -> C3
```

Rules:

- the creator must have been a member of the source book;
- the new book starts a new `series_id` at volume 1;
- `spawned_from_book_id` points to the source volume;
- `spawned_from_user_id` records which member carried the branch forward;
- the new series keeps the same `tree_root_book_id`, making the full propagation tree queryable later.

This is the XVISOR tree. It is not a sales genealogy or a leaderboard. It records where living circles came from.

## Root / Series / Tree

Each book lineage record stores three useful scopes:

- `book_id` — one exact volume;
- `series_id` / `series_root_book_id` — one continuing story;
- `tree_root_book_id` — the oldest ancestor in the propagation tree.

A continuation keeps the same series and tree root.

A spawn starts a new series but keeps the ancestor tree root.

## Finished books are time capsules

When a book closes, TeamBook seals a historical memory snapshot.

The sealed snapshot includes at least:

- book identity and title;
- lifecycle timestamps and duration;
- the cover used at the end of that volume;
- card identity and visual metadata when a card is the cover;
- the roster as it existed for that book;
- each member's alias/avatar/role for that historical period;
- join/leave information available at sealing time.

Historical presentation should prefer this sealed snapshot over mutable live profile or card metadata.

## Card art is memory-bearing data

A card that has been used as a book cover is not merely a skin. Its image may become the visual index of a person's memory of that book.

Therefore:

### Do not overwrite history

Once a `card_id` has been publicly obtainable or used as a book cover, its visual identity should be treated as immutable.

If art needs a meaningful replacement, create a new card/version/edition rather than silently changing the old card's visual identity.

A finished book must continue to display the image associated with that historical card/cover, even if the current collection later gains new editions.

### Snapshot, do not reconstruct

A finished book should not ask the current profile:

> What is this person's alias now?

or the current card catalog:

> What does this card look like now?

and use those answers to rewrite the old book.

The memory snapshot is the source for the historical view.

## Why the image matters

TeamBook assumes a product hypothesis that images can act as powerful retrieval cues for autobiographical and social memory.

A user may eventually recognize a period immediately from one cover card:

> "ใบนี้คือช่วงที่พวกเราอยู่เล่มนั้นด้วยกัน"

The product should make room for that emotional value instead of treating cards only as rewards or cosmetics.

This is why the Profile gallery should eventually separate:

- **กำลังเขียน** — covers from active books;
- **สมุดที่เขียนจบแล้ว** — sealed historical volumes grouped by series.

The active gallery shows what the person is using now.

The memory shelf shows what they lived through.

## No competitive meaning

Lineage length is not a score.

Do not add by default:

- longest-series leaderboards;
- percentile comparisons;
- rank for number of descendants;
- rewards for continuing the most volumes;
- punishment for pausing between volumes.

The tree exists to preserve continuity and propagation, not to create another competition surface.

## Current backend foundation

The backend foundation stores:

- root / continuation / spawn relation;
- series and volume number;
- previous volume;
- spawn source and spawning member;
- propagation tree root;
- cover snapshot;
- sealed memory snapshot;
- seal timestamp.

Existing books are conservatively backfilled as roots because historical relationships that were never recorded should not be invented.

## Future UI actions

The intended future lifecycle is:

### เขียนเล่มต่อไป

For the owner of a finished book:

- create a continuation in the same series;
- copy the previous roster as a starting selection;
- allow changing the book name, duration, cover, commitments, and next-season roster;
- the old volume remains immutable.

### เปิดสมุดของตัวเอง

For a member graduating from a finished book:

- create a new series;
- record the source book and spawning member;
- begin volume 1 of a new branch.

These two actions must remain different in both data and product meaning.
