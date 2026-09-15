# V12 — correct Thai CTA typography

2026-09-16. User identified that the generated V11 CTA read “พีเศษ” instead of “พิเศษ”.

- Exact final label: **สิทธิพิเศษจาก myClover**.
- Native font: Kanit 700, loaded with the actual Thai label before rendering.
- พิเศษ contains short สระอิ U+0E34 after พ; no long สระอี U+0E35.
- Mode: native canvas text and pill rendering. No image-generation call for this correction.
- The existing V11 image remains the continuous base. Only the pill interior at x41/y507/w441/h63 on a 1200 × 630 grid changes. The 50-credit offer, portrait, original logos, neon lighting and MCP module stay intact.
- Editable source: `share-preview-v12.html`.
- Final: `../assets/airova-share-50-privilege-v12.png`, 2400 × 1260 lossless PNG exported directly from canvas.
- Visual review compared the short vowel against V11 and checked all glyphs and the arrow remain inside the pill.
