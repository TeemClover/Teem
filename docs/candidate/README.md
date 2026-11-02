# CloverX HR Recruitment

Shared buildless HTML renderer: `/candidate/`. Every candidate is rendered by `candidate/candidate.js` using one central template. Template changes update all profiles without rewriting candidate HTML files. The original PDF and original text remain independently accessible. Human reviews, answers and workflow stages are stored separately from imported analysis.

This repository is public. Never commit applicant PDFs, names, contact details, raw resumes, profile JSON, cookies, access tokens or daily candidate reports. Only code and synthetic tests belong here. Candidate data lives in the existing private Postgres database and is returned only after server authentication. `noindex` is supplementary; authentication protects the data.

## Interface

- Team access uses a private capability link. Its fragment token is exchanged for a scoped HttpOnly cookie, then removed from the address bar. No password prompt is needed for the team link. Anonymous access remains denied; noindex alone is not access control. The legacy backoffice login remains as an admin fallback.
- Select the intended jobs in **ตำแหน่งและเกณฑ์**, review the JD and weights (total 100), then enable them. All jobs start disabled to respect the user's selected-position scope.
- **เพิ่มผู้สมัคร** accepts original PDF (3.2 MB maximum) and/or original text. AI-assisted analysis is optional and requires `ANTHROPIC_API_KEY`; the scheduled assistant can organize data itself and use the structured import mode without a separate AI API key.
- Profiles show the original PDF/text first, then standardized work history, evidence-based criterion assessments, provisional total with coverage, inferred applications to CloverX workstreams, traceable source excerpts, at most 10 prescreen questions, answers and human notes.
- Imported scores cannot change a human's stage or notes. Simultaneous human edits use optimistic version checks.
- All sections and configuration are available through website controls; GitHub is not required for a review.
- Highlights rank documented professional evidence only within the same job, require at least 80% evidence coverage and a reviewed profile, and are labelled as preliminary document scores. No hiring outcome is automatic.
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

## Score contract

The score measures professional evidence stated in the resume against the selected job's rubric. Ratings are 0–4, with a mandatory cited excerpt and reason. Missing evidence is `null`, never an automatic zero. Points = rating / 4 × criterion weight. Coverage is the sum of evaluated weights. An incomplete total is displayed as a lower bound (`≥`) with the evaluated coverage; it is not directly comparable to a complete score. Keep the rubric snapshot with each profile. Results are candidate claims until verified. Do not infer or score protected traits, appearance, personality or cultural fit. No automatic candidate rejection, selection, invitations or communications.

## Operations

Existing `DATABASE_URL` and existing backoffice session authentication are reused. The isolated schema is in `api/_lib/candidate/store.js`. Test schema changes on a Neon branch before deployment. The deployed handler lazily ensures only these additive tables after authentication. PDF bytes are kept in the database for this initial bounded implementation; larger document collections should migrate to a dedicated private object store with authenticated streaming.

`node --test tests/candidate/*.test.mjs` runs focused security, data integrity, score and AI adapter tests. `node tests/candidate/preview.mjs` offers a synthetic-only local preview when local listening is available. Never point that preview at real applicant data.

## Daily browser run

Read enabled jobs from the private database. Visit only their configured JobsDB applicant lists in the already-authorized employer account. Inspect every relevant folder and page without silently applying JobsDB High-fit filters. Read complete originals, distinguish profile-only from resume evidence, and preserve the stable job/application ID. Never overwrite people based on a name match; duplicate names can be different applications. Import only new or changed applications and preserve source provenance. Store original PDF bytes when accessible and original text; if an attachment cannot be read, mark the profile incomplete rather than claiming it was reviewed. Use the current rubric, recompute points in the website, and keep the original unmodified.

Log actual completion/partial/blocked/no-new state in `mc_candidate_runs` using Asia/Bangkok dates. Never replace previous successful data with an empty list because access failed. If no jobs are enabled, or JobsDB requires login/OTP, stop that run and report the concrete setup blocker. Do not contact, shortlist, reject, rate, or move candidates in JobsDB. All hiring actions belong to a human reviewer.
