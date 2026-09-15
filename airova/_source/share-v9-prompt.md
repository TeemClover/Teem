# Share V9 — original ad brand-row repair

Mode: built-in imagegen, precise object edit.
Edit target: `/var/folders/tp/m2gw0jhs5fd6mz8t54qyvzzm0000gn/T/codex-clipboard-03111d96-6007-4a65-9ff3-9396a48f6e75.png`.
Only the repaired top-left brand-row rectangle is intended for native compositing onto the untouched original. Original person, typography and remaining scene pixels remain from the supplied original; actual logos are placed separately from official source files.

## Prompt

Use case: precise-object-edit.
Edit target: the supplied original 1734 by 907 pixel social-share advertisement.
Make ONE surgical removal only: erase the incorrect generated branding in the TOP-LEFT BRAND ROW, approximately the rectangle x25 to x720, y20 to y170. This comprises the bright lime clover symbol, the white “myClover”, the multiplication cross, the white/gradient “Airova”, and the spaced small “OFFICIAL PARTNER” underneath. Replace ONLY those logos and text pixels with seamless clean inky dark navy background matching the existing adjacent navy background. The repaired top-left area should be empty, natural and smooth, with no writing, no logos, no outlines or residual text ghosts.
Preserve absolutely everything outside that top-left brand region: the original person's exact face, expression, glasses, hair, pose, jacket, skin texture; every Thai headline and offer and CTA word; the neon rings, paths, city and four floating video images; all original colors, sharpness and brightness. Do not redesign anything. No overall recoloring, sharpening changes or new visual objects. Keep the exact original landscape composition and dimensions as closely as possible.
Purpose: only the small cleaned top-left region from your output will be used as a patch over the untouched original; the original person and all other original pixels are preserved by separate native compositing. Official logos will be placed later from original vector files. Do not generate replacement logos.

## Final native composition

- Base: exact user-supplied early campaign `_source/share-v9-original-ad.png` (1734 × 907). The portrait and all original typography/light trails are kept as one continuous image. No face regeneration, cutout, saturation filter or relighting.
- Only the top-left x0–510/y0–128 region of the 1200 × 630 canvas uses the brand erase result. Canonical multicolor myClover icon and original Airova white/gold SVG are placed over the clean band.
- MCP Ready: clipped-corner dark glass module, cyan-to-violet rim, tiny lime indicator, two short light traces, and original ChatGPT/Claude icons. Native composition `_source/share-preview-v9.html`.
- Final `_source` design exports directly to `assets/airova-share-original-v9.png`, 2400 × 1260 lossless PNG.
