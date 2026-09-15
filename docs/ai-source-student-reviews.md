# Student reviews on the AI Sauce sales page

## Delivery boundary

`/ai-source/` reads the two existing public review APIs at runtime. No real review
text, names, occupations, raw exports, or credentials are copied into Git.

- First Class: `/api/first-class-review?public=1`; existing public consent and
  `admin_hidden` rules remain unchanged.
- The Dent: `/api/course-reviews?public=1`; both learner consent and the separate
  instructor publication choice remain required. Shortlisting never publishes.
- A safe source label is added for the known The Dent cohort. Unknown internal
  cohort identifiers are not exposed or relabelled as The Dent.
- The sales page interleaves up to six available reviews. Each card identifies
  its original live class, and the introduction distinguishes these experiences
  from the online course being sold.
- Anonymous consent currently excludes identifying information, including the
  occupation/company field. These cards say “ผู้เรียน First Class” or
  “ผู้เรียน The Dent”. A role may be shown only when the public projection and
  consent permit it; no role is inferred from a quote or a course.
- Each source can fail independently. Empty or unavailable reviews leave no
  empty marketing section. Text is inserted with `textContent`, never HTML.

## Live data audit — 2026-09-16

The public First Class API returned six reviews: four named and two anonymous.
Two named records included a public role/company value. The two anonymous
records returned no role. The Workshop public API returned zero records.

A zero public result does not establish whether consent, publication, or a
nonblank testimonial is missing. That requires an authorized read at
`https://www.myclover.com/course/admin/reviews/`. This change does not approve
or publish reviews on the instructor’s behalf.

## Validation

- `node --test tests/ai-source/student-reviews.test.mjs tests/course/reviews-admin.test.mjs ai-source/sales-page-checkout.test.mjs`: 33 passed after rebasing onto the verified live commit.
- Tests cover private/anonymous redaction, separate publication and consent,
  source attribution, unknown cohorts, revocation, text injection, API failure,
  uncached anonymous requests, and the sales-page wiring.
- Browser preview used the actual public API responses held only in `/tmp`.
  Six cards rendered. Desktop 1280px used two columns; mobile 390px and 320px
  used one column, with no overflowing review cards. No console errors on the
  sales page. The review CTA navigated to `/classroom/`.
- The legacy `first-class/first-class.test.mjs` suite has ten existing failures
  because that former sales page is now a classroom redirect. The same failures
  were confirmed in the unchanged base checkout; no First Class files changed.

## Release check

Before deployment, preserve the latest live checkout fixes. On 2026-09-16 the
production `/ai-source/` HTML matched `origin/main` commit
`52dfc9db715bb93b7aad769830bcece62e7b7d69` byte for byte (SHA-256
`c462911d8cd2c533c09577e9e71eb611f1647584dbde5f74d39ee50a90cbf802`).
The current production sales script is `sales-page.js?v=live-checkout-15`.

The reviews branch was rebased onto that exact production commit and retains its
checkout script. Deploy from the isolated reviews worktree after reconciling with any
any newer production commit. Verify both new static assets and the public API,
then confirm the live section renders only permitted reviews. No new environment
variables or database schema migration are required.
