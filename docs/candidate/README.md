# CloverX HR Recruitment

Shared buildless HTML renderer: `/candidate/`. Every candidate is rendered by `candidate/candidate.js` using one central template. Template changes update all profiles without rewriting candidate HTML files. The original PDF and original text remain independently accessible. Human reviews, answers and workflow stages are stored separately from imported analysis.

This repository is public. Never commit applicant PDFs, names, contact details, raw resumes, profile JSON, cookies, access tokens or daily candidate reports. Only code and synthetic tests belong here. Candidate data lives in the existing private Postgres database and is returned only after server authentication. `noindex` is supplementary; authentication protects the data.

## Interface

- Team access uses a private capability link. Its fragment token is exchanged for a scoped HttpOnly cookie, then removed from the address bar. No password prompt is needed for the team link. Anonymous access remains denied; noindex alone is not access control. The legacy backoffice login remains as an admin fallback.
- Select the intended jobs in **ตำแหน่งและเกณฑ์**, review the JD and weights (total 100), then enable them. All jobs start disabled to respect the user's selected-position scope.
- **เพิ่มผู้สมัคร** accepts original PDF (3.2 MB maximum) and/or original text. AI-assisted analysis is optional and requires `ANTHROPIC_API_KEY`; the scheduled assistant can organize data itself and use the structured import mode without a separate AI API key.
- Every profile starts with an evidence-linked snapshot: one professional-background sentence, exactly two strength slots and three key-skill slots. Unsupported slots explicitly show insufficient evidence. The original PDF/text follows; work history, score details, relevance, evidence and prescreen questions are collapsible. Mobile has a compact applicant picker. Original files, answers and human notes remain accessible.
- Imported scores cannot change a human's stage or notes. Simultaneous human edits use optimistic version checks.
- All sections and configuration are available through website controls; GitHub is not required for a review.
- Each job has a directory of every matching application, displayed three cards per page with independent previous/next controls and exact totals. Reviewed profiles sort by preliminary document score, then evidence coverage and stable ID; unread profiles follow without a score or rank. No 80% coverage filter or 1,000-record cutoff hides applications. Search/status/job filters apply to both the directory and sidebar. Scores remain provisional and no hiring outcome is automatic.
- Bulk import supports up to 400 records from the website. Source IDs are required, and pending card summaries cannot replace an already reviewed profile/PDF. Original text and normalized profiles can be downloaded separately. Downloads include the candidate name and stable record identifier in their filename; original PDFs also open in an independent browser tab.

## API

`GET /api/candidate` returns jobs, a bounded page of candidate metadata, grouped counts and the last 30 runs. `page` starts at 0; `job`, `search`, and `status` filter on the server before pagination, so search covers all imported applicants. The header distinguishes reviewed profiles from pending full-resume reads. `GET ?id=...` returns one full private profile. `GET ?action=resume&id=...` serves its authenticated PDF inline; `download=1` downloads it.

Cookie-authenticated writes require a matching Origin. `POST` actions:

- `job`: `{job,version}` (existing jobs; disabled until configured).
- `analyze`: `{jobId,sourceId,sourceUrl,originalText,pdfBase64,filename}`.
- `import`: same fields plus `profile` (schema in `ai.js`, validated by `model.js`).
- `review`: `{id,version,status,notes}`; notes can contain JSON `{note,answers}`.
- `run`: `{runId,state,message,jobIds,checked,imported}` with state `success`, `partial`, `blocked`, or `no_new`.

An optional separately configured `CANDIDATE_SYNC_TOKEN` permits read/import/analyze/run actions, never human review or rubric edits. It is not created or exposed by this change. A scheduled assistant with authorized Neon access can instead use the dedicated `mc_candidate_*` tables directly; no browser authentication token needs to be published or retained.

## Summary contract

`profile.quickSummary` contains `sentence: {text,evidenceIds}`, exactly 2 `strengths` and exactly 3 `skills`. Each nonempty item must reference resume evidence. Missing evidence uses empty text/IDs; the UI shows an explicit unknown and never fills slots from generic skills or pending card summaries. Summaries describe documented professional work, without personality, protected characteristics or hiring recommendations. Legacy records stay readable and show their new summary as pending. The AI provider schema and server normalization share the same structure.

## Score contract

The score measures professional evidence stated in the resume against the selected job's rubric. Ratings are 0–4, with a mandatory cited excerpt and reason. Missing evidence is `null`, never an automatic zero. Points = rating / 4 × criterion weight. Coverage is the sum of evaluated weights. An incomplete total is displayed as a lower bound (`≥`) with the evaluated coverage; it is not directly comparable to a complete score. Keep the rubric snapshot with each profile. Results are candidate claims until verified. Do not infer or score protected traits, appearance, personality or cultural fit. No automatic candidate rejection, selection, invitations or communications.

## Operations

Existing `DATABASE_URL` and existing backoffice session authentication are reused. The isolated schema is in `api/_lib/candidate/store.js`. Test schema changes on a Neon branch before deployment. The deployed handler lazily ensures only these additive tables after authentication. PDF bytes are kept in the database for this initial bounded implementation; larger document collections should migrate to a dedicated private object store with authenticated streaming.

`node --test tests/candidate/*.test.mjs` runs focused security, data integrity, score and AI adapter tests. `node tests/candidate/preview.mjs` offers a synthetic-only local preview when local listening is available. Never point that preview at real applicant data.

## Resume processing and recovery

Enqueue/import actions do not run a background PDF reader. A pending record remains pending until an authorized worker reads the complete resume and imports a reviewed profile. A scheduled run is separate from an active backfill. Track each application by `(job_id,source_id)` and record file hashes, page counts and completion in a private manifest outside this public repository. Preserve human status/notes. Record unreadable, unavailable, oversized or truncated files as blocked/partial with exact reasons. Extracted text or a saved PDF alone does not establish a completed review.

## Daily browser run

Read enabled jobs from the private database. Visit only their configured JobsDB applicant lists in the already-authorized employer account. Inspect every relevant folder and page without silently applying JobsDB High-fit filters. Read complete originals, distinguish profile-only from resume evidence, and preserve the stable job/application ID. Never overwrite people based on a name match; duplicate names can be different applications. Import only new or changed applications and preserve source provenance. Store original PDF bytes when accessible and original text; if an attachment cannot be read, mark the profile incomplete rather than claiming it was reviewed. Use the current rubric, recompute points in the website, and keep the original unmodified.

Log actual completion/partial/blocked/no-new state in `mc_candidate_runs` using Asia/Bangkok dates. Never replace previous successful data with an empty list because access failed. If no jobs are enabled, or JobsDB requires login/OTP, stop that run and report the concrete setup blocker. Do not contact, shortlist, reject, rate, or move candidates in JobsDB. All hiring actions belong to a human reviewer.


## Scoring completeness and loading

Reading a PDF and scoring it are separate operations. A reviewed profile must also have criterion assessments with reasons and valid evidence IDs; an all-null assessment is unscored, never 0/100. Use the same saved rubric and 0–4 anchors for each applicant to that job. Missing evidence remains null; related professional work can receive level 1 when the reason clearly explains the limited overlap. Never infer domain experience from an employer name. Display both documented points and coverage; a numeric zero requires an explicitly assessed criterion. The header distinguishes read resumes from scored profiles. Finish scoring from existing full-resume evidence before reporting a review as assessed.

The initial list retrieves only assessment fields and rubric weights, runs independent database reads concurrently, and omits detailed score sections from card responses. Full resume/evidence text is loaded only on selection. A static loading panel and module-load fallback remain visible during startup, with a retry control after 12 seconds and a bounded API wait. Versioned modules avoid mixing old HTML and new startup code.


## Weekly diary and shared calling notes

The seven-day strip starts at 2026-11-01, supports previous/next weeks, and filters cards by the original SEEK application date in `profile.presentation.appliedAt`, converted to Asia/Bangkok. The first day includes applications from that date and all earlier dates as the opening balance. Exact original application timestamps remain unchanged. Missing source dates have a separate confirmation group and never inherit import, assessment or note timestamps. Salary and job filters compose with the selected day/week. The daily activity list shows timestamped imports, assessment runs, team notes and favorites separately from application-date counts.

Favorite is an independent `favorite` boolean. Existing prescreen/interview selections are migrated once, only for null favorites. Changing a heart does not change the candidate stage, call state or notes.

Each calling note is appended to `mc_candidate_team_events` with an author, server timestamp, owner, call outcome and optional next-contact time. Notes remain visible to the authorized team. Legacy notes and answers are retained. Edited question answers merge only the keys changed by the reviewer. Untouched calling fields are preserved on the server. Every new note has a stable request ID so a repeated request cannot duplicate it; a changed retry is rejected. Stale versions return a conflict, with a UI action that reloads current notes while retaining the reviewer's draft.

The additive schema migration is serialized with a transaction advisory lock. Authentication, same-origin mutation checks, no-store/noindex controls, and the sync-token restriction on human review actions remain in place. No applicant documents, source manifests or credentials belong in the public repository.

Validation: `node --test tests/candidate/*.test.mjs`. The private integration/preview harness uses synthetic tables in an isolated schema; it is excluded from publication.

The canonical `/candidate` and `/candidate/` entry paths have explicit security-header rules in addition to child assets. Verify no-store, noindex and the same-origin CSP on the actual production response after deployment.
