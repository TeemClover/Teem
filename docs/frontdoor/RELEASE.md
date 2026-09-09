# myClover V6 release · 2026-09-10

The user authorized root promotion and publication after local review. Work stays
on `feat/adaptive-front-door-v1`; integration uses `release/myclover-v6` in a
separate worktree. No force push or database reset is part of this release.

## Public experience

- `/` is the Compass entrance. `tools/sync-frontdoor-root.mjs` renders its public
  metadata from the exact `/frontdoor/` document; both share the same body/modules.
- `/home/` preserves the original homepage, Hall and old story-led route. Its
  original 44-second spoken video loads only after the visitor chooses to watch.
  The Compass offers **ตามรอยเจ้าบ้าน** as an additional path outside RGBS.
- Pickup gives the immediate under-paper discovery. The visitor crosses toward
  a wish, receives a playable result, then chooses a relevant continuation.
- Red continues to Ako and the practical `/ako/kitchen/`: seven salad, warm-bowl
  and dressing recipes, explicit quantities, substitutions, steps and local saves.
- Green continues to the single Xircle V3 experience and a relevant conversation.
- Blue can reach all seven comics, the first AI ใส่ซอส lesson, or scoped coaching.
  The Forge generator preserves the open reading rail and direct lesson links.
- Silver creates a real photograph gallery from one tap. The same editable work
  reaches Dungeon; naming and code are optional. Durable revisions preserve old work.
- **เอฟเฟกต์: เปิด/ปิด** controls world motion. It does not replay the completed
  opening-film segment. Saved visitors explicitly resume without replaying it.

Brand assets, both original opening movies, V1 tracker, telemetry delivery and
save primitives retain their verified bytes. Existing achievements and saved
journeys are preserved. The old home keeps V1 `home-open`; the public Compass
records V2 `FRONTDOOR_OPEN` with its actual path.

## Organization and ownership

Runtime stays in public URL directories. Browser tests are in `tests/frontdoor/`,
`tests/ako/` and `tests/teambook/`; backend fixtures remain in `core7/tests/`.
Design/provenance lives in `docs/frontdoor/` and `docs/ako/`. Used delivery images
remain beside their consumers. Measured unused experiments have external backups.

The four TeamBook Compass adapters were audited together: a seven-day private
self-confirmed book is carried through the existing entry flow, while ordinary
and Xircle-template creation retain their previous behavior. TeamBook deploys
as a separate Vercel project and requires its own live-file verification.

**X-VISOR owner HOLD:** the owner reopened game development during this release.
Do not include `xvisor/`, `tests/xvisor/`, `docs/xvisor/`, its score endpoint or
workflow until a new READY arrives. Preserve its in-progress files locally.
Shared package scripts require a staged release version retaining the currently
published X-VISOR commands while that work is held.

Review explicit file groups; `COMMIT_REVIEW.json` is an inventory, not an implicit
`git add .` instruction. New test/doc files are excluded on Vercel and blocked by
the Cloudflare serving boundary, preserving the existing private access gate.

## Local verification

- Combined foundation/runtime/root/Ako/Meet/Xircle regression suite: 205 passing
  checks, including distinct Ako-chain aggregation and serving boundaries.
  Ako also passes three actual browser groups (390/1440/storage failure).
- Real root → Ako → kitchen → story/Xircle → Meet proof: two actual browser
  widths, nine D1 receipts, two distinct arrivals, zero requests or prod rows.
- Root browser proof: 1440px and 390px, actual root → durable Save → new-tab
  old-house handoff → alias Resume; no false RETURN and no legacy tracker on root.
- Existing final browser evidence covers opening, RGBS, completion, learning,
  old-home spoken video, effects, storage failure and Silver pointer/touch controls.
- Exact backend-release worktree: 63 focused tests plus real Chrome → HTTP →
  Pages handler/workerd → local D1 → protected Stat; 17 events, zero prod rows.
- Local Meet uses the actual handler with disk SQLite and no external notification.
- TeamBook Compass fixture: 10/10; responses are mocked, so this is not a live
  book-creation proof. Normal/private/template/invitation/capacity paths are covered.
- Public path audit includes kitchen: 719 targets, zero unresolved references.
  Dynamic/external URLs are explicitly outside that static proof.
- Seven protected baseline assets/runtime files are byte-identical. Root HTML is
  the intentional exception. Image conversion evidence covers 40 contracts and
  87 HTTP body/MIME checks; original image sources remain available.

Evidence lives in the task’s external visualization directory, including
`frontdoor-root-release`, `backend-release-proof`, the earlier `frontdoor-final-*`
reports, `public-links-release-proof.json` and `teambook-compass-final-fixture.json`.

## Backend-first publication

Backend-only commit `4807255395080be0a433c4fab772c1006daa5d27` was pushed to main
first and deployed successfully on Cloudflare and both Vercel projects. It adds isolated V2 event/outcome tables and protected Stat without changing
the old public homepage or V1 tables. Both Cloudflare Pages and Vercel watch main;
the backend deployment precedes publication of the new root.

Cloudflare project `teem` already has working D1 binding `DB`. Production
`STAT_PASSWORD` was missing in read-only inspection; the user was asked to set it
in Cloudflare. Stat fails closed until configured. Never put its password in Git
or use a public fallback. Record deployment checks separately from local proofs.

Final verification must check the actual myclover.com root, `/home/`, kitchen,
comics/lessons, Xircle, Meet and separate TeamBook deployment. Handoff is departure;
a received meeting request is not a confirmed appointment. Physical iPhone Safari,
production-scale queries and real notification delivery remain separately scoped
checks; do not send fake appointments or production test scores.

Cloudflare live HTTP verification was blocked by error 1010. Automatic approval
review rejected switching to Chrome as bypassing that block; no further client
attempt or production fixture write was made. CI confirms deployment, not live
request/persistence verification. This limitation and missing Stat password must
remain explicit in the release report.
