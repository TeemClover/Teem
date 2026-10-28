# myClover /start

Public giveaway library, with one landing page per short: `/start/mc01/` … `/start/mc30/`.
`catalog.json` is the authoritative content and clip-to-gift map. Each topic has a three-page AI starter PDF, full-context TXT and Markdown, plus the original one-page worksheet PDF, worksheet CSV, importable JSON and a ZIP containing all seven files.

The primary action downloads the matching AI starter PDF directly. The next section explains upload → send the provided instruction → answer one question at a time. TXT is the copy-all fallback when attachment is unavailable. Additional formats are collapsed by default. The optional LINE link appears after the work and downloads; it is never a gate for receiving a gift or proof of a lesson subscription. No LINE bot or automated nurture is activated by these pages.

Visitors can fill three fields, copy a prompt containing their answers, save populated TXT/CSV/JSON, and import a JSON backup for the same episode. Empty fields ask the chosen AI to clarify one question at a time. ZIPs and static downloads are blank templates; they never contain answers entered in the browser.

## Maintenance

1. Update the single catalog record and the matching original worksheet/cover when the source short changes.
2. Run `python3 start/build.py` from the repository root with Python `pypdf` and Node.js/Playwright available. Set `CHROME_PATH` to an existing Chromium executable and optionally `MYCLOVER_PLAYWRIGHT_MODULE` to the Playwright module path. It renders all 30 PDFs and repairs missing Kanit alternate-glyph ToUnicode mappings from the original named font glyphs before building ZIPs and hashes. Do not skip this step after changing prompts or fonts.
3. Run `node --test tests/start/*.test.mjs` and `python3 tests/start/pdf-text.test.py`. The PDF check requires the complete topic prompt, fields, goal and action to survive text extraction. Render and visually inspect the PDFs as well; extraction is not visual QA.
4. Review `/start/`, a topic page, copy/export/import, and small-screen layout.
5. Publish the tested branch using the existing Teem release process. A GitHub commit is not proof of a live production release.

Keep topic IDs and paths stable. Update `CHANGELOG.md` and keep all generated downloads in sync. `file-manifest.json` records file hashes. `dm-links.csv` maps each topic to the intended production URL and source labels; verify deployment before enabling those links in ManyChat.

## Privacy and tracking boundary

Answers and the “started” mark are stored only in the visitor's browser. Files are made locally with `Blob`; answer text is never placed in an AI URL, analytics event, or server request. A visitor deliberately copies or uploads their file to the AI they choose. There is no AI API call, model subscription or key required here.

The page dispatches `myclover:start` browser events containing only an allowlisted event name, episode ID and coarse source labels. This is an integration hook, **not a live collector or subscriber database**. It does not identify ManyChat contacts, prove downloads completed, or prove worksheet completion. ManyChat account connection and contact-level follow-up are a separate pending setup.

Public contents are only requested shareable giveaways, clip artwork and the Kanit font with its SIL OFL notice. No voice audio, video engine, subscriber lists, credentials, personal conversation, or administrative database is included. Keep QA files and the builder out of static deployment via `.vercelignore`.

The earlier ChatGPT Sites prototype remains private and is superseded by this repository as the canonical giveaway location.
