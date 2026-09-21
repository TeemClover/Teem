# Learner administration — 2026-09-21

## Change

- Separate learner care, payment review, and sales views.
- Search/filter the loaded learner list; show completion marks and file request count.
- Open one learner's lesson progress and file history, with readable catalog names, request counts, and dates.
- Distinguish completion marks from video positions and file requests from completed saves.
- Mobile detail view has a back button and moves focus to the selected record.
- Preview an authenticated slip in the payment panel. Verification retains the one-step, guarded payment/access workflow.
- Direct account lookup avoids treating a learner outside the first page as having no history. Refresh also updates selected accounts outside the list.
- Ready-to-learn notification text checks current access before copying; no message is sent automatically.

## Verification

- 71 tests: admin authorization, direct lookup/scoping, private file request tracking, payment and access transitions.
- 54 tests: media authorization/streaming and toolkit protection.
- Syntax and diff checks passed.
- Real browser with synthetic local API data: desktop and 390 × 844 mobile; no horizontal document overflow.
- Checked name/email search, completed-only filter, empty results, file names/counts/dates, and non-video toolkit rows.
- Checked authenticated slip preview and one-click synthetic payment verification → admitted.
- Checked lookup and refresh of an account absent from the displayed page.
- Checked logout clears private list/detail/metrics, and invalid credentials return the login screen.
- No console errors during the exercised flows.

These browser checks used synthetic example.com accounts and an in-memory payment fixture. They do not approve a real payment or certify a production learner session. Real customer access needs an authenticated admin check.
