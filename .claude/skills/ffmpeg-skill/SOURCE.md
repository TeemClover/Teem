# Source

Skill: `ffmpeg-skill`
Upstream: https://github.com/kajisho5/ffmpeg-skill
Version: 2.17.2
Commit: 1c37ad1cae49f1127cc82919ba9e73bb1f330c65 (2026-10-26)
Vendored: 2026-10-26
License: MIT (see `LICENSE`)

Runtime files only, copied verbatim: `SKILL.md`, `scripts/`, `templates/`,
`mcp/`, `references/` (scripts, devices, ci-platform-pitfalls, gotchas) and
`docs/contract.md` — the same set upstream ships to npm, minus the npx installer.
Repo assets, brand files, demos, tests, evals and CI were left out.

Needs Python 3.10+ and ffmpeg/ffprobe on PATH. Check with
`python3 .claude/skills/ffmpeg-skill/scripts/_contract.py doctor`.

To update: re-clone upstream and replace these files, then bump the commit above.
