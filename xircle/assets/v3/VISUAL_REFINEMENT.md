# XIRCLE V3 visual refinement — 2026-09-10

These sibling assets refine the current V3 scene continuity. The original source files remain untouched. They do not replace a logo, favicon, or brand mark.

## Provenance

Generated with the built-in `image_gen` image-edit tool using one existing project image per edit. No CLI generation, external model, or stock image substitution was used. Master PNGs remain outside the repository at:

`/Users/Teem/.codex/visualizations/2026/09/07/01a07b30-0992-7eb3-97dc-9d541a4e7820/xircle-visual-refinement/`

- `sleep-clean-master.png`: generated from `xircle/assets/v5/xircle-s02-sleep.webp`.
- `meal-detail-master.png`: generated from `xircle/assets/v3/food-1448.webp`.

Original generated files remain in `/Users/Teem/.codex/generated_images/01a08766-f3d2-7be2-bb9b-b292206795c5/` as `exec-613d173e-cf21-462a-91a4-841ee310436c.png` and `exec-7fa8581c-c730-4d7f-bd4d-14543913db35.png` respectively.

## Delivered assets

All images are 4:3. Delivery copies use the bundled sharp WebP encoder, quality 88 and effort 6; the only post-generation operations were format conversion and proportional resize. The system cwebp binary was unavailable because of a missing libtiff dependency, so the bundled image library handled delivery encoding.

| Asset | Dimensions | Intended use |
| --- | --- | --- |
| `sleep-clean-1448.webp` | 1448 × 1086 | Clean sleeping scene, same woman/cat/room, without baked HUDs |
| `sleep-clean-800.webp` | 800 × 600 | Mobile/responsive variant |
| `meal-detail-1448.webp` | 1448 × 1086 | Closer view of the same meal for the capture/discovery state |
| `meal-detail-800.webp` | 800 × 600 | Mobile/responsive variant |

## Visual review

Both generated outputs were viewed and checked before selection. The sleep image preserves the original sleeping pose, face, hands, clothing, cat, bedding, window light and bedside objects while removing the blue graphics and collar/book lettering. The meal detail retains the gray marble tabletop, warm window light, central chicken/basil stir fry, green-bean dish, soup and water glass. It has no human face, hands, labels, numbers or nutrition claims. These are illustrative scene images, not measurements of a visitor's meals or sleep. Meal glass and side plate touch the frame edges; the main meal is fully readable and intended to remain the visual focus. Avoid aggressive crop that hides the main dish, sleeper's face or cat.

## Exact prompts

### Sleep cleanup

Use case: precise-object-edit. Edit target: the attached sleeping woman and white cat bedroom image. Create a clean photographic version for the same website scene. REMOVE every baked graphic: the entire blue floating dashboard in upper left, all blue glowing lines, moons, circles, particles and trails crossing the room, and all letters on the cat collar and book spine. Reconstruct the exact plain dark upholstered wall behind these overlays and the exact natural window light. Preserve the same woman's face, identity, sleeping posture, folded hands beneath cheek, white satin top, wristband, bedding textures, golden bedside lamp and water glass, window and warm early morning light, same white fluffy sleeping cat and its posture. Landscape 4:3 composition. Frame both the woman's whole face and both folded hands clearly and keep the full white cat clearly visible with breathing room at the edges. Preserve photographic anatomy and scene continuity, no replacement model, no new objects. NO text, NO symbols, NO logos, NO watermarks, NO interfaces, NO light effects; this is one natural cinematic still, warm and calm.

### Meal detail

Use case: precise-object-edit. Edit target/reference: the attached woman eating at gray marble table. Make a detail photograph of the SAME meal and table by moving the camera closer to the tabletop, angled about 45 degrees downwards. Landscape 4:3. Main subject is the meal, not a portrait: the large shallow ivory bowl of Thai stir fry with small chicken pieces, green basil, red chillies centered foreground; the small ivory plate of green beans on the left; the matching ivory bowl of clear vegetable soup at back right; the clear water glass at far right; retain the partial green vegetable plate only if naturally present at lower right. Keep the same exact dishes, food ingredients, gray marble veining, warm natural daylight from the window to the right, realistic natural food texture and soft shadows. No human face, no cat, no floating rice bowl, no hands, no new dishes or ingredients. The food fills most of the frame, all primary dishes readable, glass not cropped. This is a photographic close-up shot from the same exact lunch scene, not a collage or UI. No text, no labels, no numbers, no logos, no HUDs, no diagrams, no calorie or nutrition claims.

## Integration

- Sleep scene, three-moment memory and seven-night strip now share `sleep-clean-800.webp`; the main scene can request the 1448px image.
- Viewfinder, captured photo, saved meal thumbnail and day memory all use the same `meal-detail` image. The main food background remains the original V3 room.
- The capture stays opaque after the 100ms flash; parent arrival fading cannot wash it out when tapped quickly. The flight keeps a uniform scale instead of stretching into a square.
- Three day photographs preserve 4:3 framing, with separate readable labels. The real Scale uses its complete existing photograph without polygon cuts; its outer backdrop is softly masked and placed beside the people.
- No fictional food, sleep or movement record enters Meet or analytics.
