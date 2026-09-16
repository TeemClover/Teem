# Opening lesson toolkit — 2026-09-16

A dedicated toolkit lesson (TOOLKIT), after EP01 and before EP02, groups the interactive workbook, source templates, work recipes, examples and the existing per-lesson ZIP files. The PDF and work-coach bonus remain separate and retain their original package entitlement checks. All video lessons keep video-first layout. The opening showcase follows its video. The bonus panel comes before the workbook panel in TOOLKIT.

The toolkit is an immutable private snapshot, version `2026-09-16-v3`. Nine small files (about 402 KiB total) are stored in `mc_learn_toolkit_files`; no document bodies are in this public repository. `/api/learn-toolkit?file=workbook` checks current paid-course access before serving the workbook. All other toolkit files download as attachments. Metadata pins byte counts and SHA-256 hashes. The inline workbook has a restrictive CSP with hashed scripts and an opaque sandbox; network requests and access to account cookies are unavailable. It does not upload student input. Learners explicitly export/import their progress JSON.

Schema (created during this release):
```sql
CREATE TABLE IF NOT EXISTS mc_learn_toolkit_files (
  course_id text NOT NULL,
  version text NOT NULL,
  file_id text NOT NULL,
  body bytea NOT NULL,
  PRIMARY KEY (course_id, version, file_id)
);
```

Source: local `AI Course/AI_SAUCE_STARTER_KIT_V0.1`. Release copy and publishing SQL are kept locally in `AI Course/toolkit_release_20260916`, outside Git. Future changes should create a new version and update the metadata atomically. Do not edit bytes behind an existing hash. Do not put the bonus PDF or work coach into the standard toolkit ZIP.

Validation: toolkit delivery/auth/integrity tests and existing bonus tests: 24 passed. Course API and frontend regression tests: 117 passed. Live browser verification is recorded in the release handoff after deployment.
