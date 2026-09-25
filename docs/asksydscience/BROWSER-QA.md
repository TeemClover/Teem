# AskSydScience browser QA

2026-09-25. Actual local checks in the Codex in-app Chromium browser at `/asksydscience/`.

- Rendered hero screenshots inspected at desktop and 390px mobile widths; a mobile story-dialog screenshot was also inspected.
- Checked 360, 390, 768, 1440 viewport widths. A decorative leaf caused 4px mobile overflow; scoped clipping on its section corrected it. Post-fix 360/390/768 checks have no document overflow; 1440 had no overflow initially and is rechecked before release.
- Mobile disclosure opens, follows section links, and closes.
- Mind filter shows one matching story and updates the result count.
- Story dialog opens with correct title, close control receives focus, Escape closes, and focus returns to the triggering story.
- Workshop tab click and ArrowRight navigation update the selected tab and visible panel.
- Registration dialog opens honestly with no form, input, or textarea.
- Review drawer reflected 5 distinct actions; reset removed all rows.
- Emulated reduced motion: no hidden reveals and computed scroll behavior is auto.
- Disabled JavaScript and reloaded: all four weeks visible, story details available, inactive filters hidden. Script execution and media emulation restored after test.

Static integrity is checked separately with `python3 tools/asksydscience/validate.py` (130 checks, no failures or warnings after corrections). No external analytics or storage code. No claim of full WCAG conformance, Lighthouse score, Safari/iOS testing, or field Core Web Vitals.

- Final 1440px recheck after high-resolution image replacement: no horizontal overflow; gallery screenshot inspected; browser warning/error log empty.
