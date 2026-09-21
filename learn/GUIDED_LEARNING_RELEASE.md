# Guided learning release · 2026-09-21

The entry path now asks the learner to send a ready-to-use request to their chat AI, answer one question at a time, check the populated result and carry it into the next lesson. No blank Source template is a prerequisite. Video lessons retain video-first order. TOOLKIT remains after EP01 and before EP02.

All 23 active private readings provide a `guided-start` tool: steps, a field-free request, expected output and readiness criteria. Existing recipes remain available in secondary disclosures with assisted copying as the default. Example and reference blocks are labeled separately; blank reference structures are collapsed.

Private lesson bodies are stored in `mc_learn_readings`. No paid prompt bodies belong in Git. Toolkit version and hashes live in `api/_lib/learn-toolkit-catalog.js`; bodies are immutable private `mc_learn_toolkit_files` rows. Updated per-lesson ZIPs use the same authenticated toolkit endpoint. Original media assets and Blob indexes are unchanged. Both base and premium course tiers receive the starter; PDF/full work coach continue to require their existing bonus entitlement.

The workbook starts with the same interview helper. Its manual workspace is a secondary disclosure; export/import remain local. It does not call an AI service or upload learner answers. Authenticated downloads retain server-side request tracking; a request is not proof of saving the file.

Private release evidence, backups, bundles and content audits are kept in `AI Course/learner_guidance_20260921`, outside the public repository. A rollback restores the prior metadata version and backed-up readings; never replace immutable file bytes in place. Guard reading updates against their recorded baseline hashes.

Verification covers real private payload parsing, missing-input flow, clipboard fallback, view disposal, toolkit integrity/auth, course tier access and lesson resource navigation. Prompt-contract review is not evidence of identical behavior on every external AI. Video/audio are unchanged by this release.
