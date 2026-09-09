# V3 scene plates

Built-in imagegen edits of the existing V5 artwork; no CLI fallback. Original V5 assets remain untouched. Clean PNG masters were generated first, visually checked against their originals, then resized and encoded as WebP at 1448 / 800 pixels. These six WebP files are the project delivery assets; the PNG generations remain in the conversation output.

## hero

Source: `../v5/xircle-s00-hook-hero.webp`

Delivery: `hero-1448.webp`, `hero-800.webp`.

Prompt:

Use case: precise-object-edit. Edit target: the attached existing premium XIRCLE cinematic artwork. Create a clean background plate for an interactive website, preserving the exact woman, pose, clothes, face, white cat, armchair, window, warm sun, room geometry, camera angle, emerald-and-gold lighting, rich cinematic detail, and 4:3 composition. Remove ALL typography, ALL logos (including the tiny collar lettering), ALL three floating EAT/MOVE/SLEEP HUD panels, and ALL glowing trails/orbs. Seamlessly reconstruct only the affected room behind those elements: continuous dark emerald wall, right bookshelf, ambient room, wood floor. Do not introduce any new subjects. Keep the existing scene's photographic beauty and detail. No text, no letters, no data, no UI, no overlays. High quality PNG.

## food

Source: `../v5/xircle-s03-eat.webp`

Delivery: `food-1448.webp`, `food-800.webp`.

Prompt:

Use case: precise-object-edit. Edit target: the attached existing XIRCLE food scene. Preserve the exact woman, face, pose, clothes, white cat, complete food dishes, chopsticks, drinking glass, table, room composition, and soft bright window light. Remove ONLY the floating circular food-analysis/HUD object at the upper right, all floating ingredient icons and glowing trails, and tiny letters on the cat collar. Seamlessly reconstruct cream curtains/window behind removed graphics. Keep the plate of real food prominent at lower center. Keep the original 4:3 framing and premium photographic detail. Do not invent new objects, change the people, or alter the dishes. No UI, no text, no labels, no nutritional or health imagery. Clean cinematic background plate, high-quality PNG.

## move

Source: `../v5/xircle-s04-move.webp`

Delivery: `move-1448.webp`, `move-800.webp`.

Prompt:

Use case: precise-object-edit. Edit target: attached existing XIRCLE movement scene. Preserve the exact woman, face, athletic clothing, walking pose, white cat, stairway, trees, sunlight, distant park and all real environmental objects. Remove ONLY the large floating green activity dashboard, all baked numbers/text/logo icons and all glowing data trails. Seamlessly reconstruct the right side as continuation of the existing park pathway and softly lit greenery. Preserve 4:3 framing, beautiful warm sun, detailed photographic textures and cinematic depth. Keep the person and cat identical, no new subjects. No text, logos, icons or UI anywhere. Clean background plate for live HTML/SVG interaction, high-quality PNG.

## Official Scale, V3

Replaces the in-repo 362px partial crop with a full, accurate device image. Source: [CloverX XIRCLE](https://www.cloverx.co.th/th/xircle), [official full photograph](https://www.cloverx.co.th/_next/image?q=90&url=%2F_next%2Fstatic%2Fmedia%2Fxircle-scale.124w8st-txc1s.png&w=3840). Verified 2026-09-08. Retouched to remove props and turn off the demonstration display; no real user measurement is depicted. Device silhouette, faceted zones and XIRCLE emblem retained. Final: `scale-600.webp`, 600 × 750, WebP quality 90. Mode: image edit using the official source. Master: `generated_images/exec-bd8541f8-b311-4255-8679-829165bee5be.png`.

Exact prompt:

```text
Edit this official XIRCLE Scale photograph accurately. Isolate only the complete white XIRCLE Scale on perfectly uniform flat warm ivory RGB #eae3d4. Preserve EXACT existing perspective, rounded square shape, proportions, four faceted contact zones, silver circular XIRCLE emblem, materials and all physical edges. Remove all background props. Turn off ONLY the illuminated demonstration display so the same rectangular screen becomes neutral inactive glass, absolutely no digits, bars or glowing icons. No product redesign, no new measurements, no invented branding. Whole device fully visible with generous ivory margins. High-quality PNG. Solid ivory background, NO transparency, NO checkerboard, NO texture, NO gradient. Fidelity to the reference device is essential.
```

