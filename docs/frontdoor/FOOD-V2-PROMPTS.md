# Front Door food imagery V2

Generated 2026-09-10 with the built-in image_gen tool, then resized/encoded with Sharp. These are generated editorial recipe illustrations, not photographs of dishes actually cooked by Ako. No nutrition results or recipe changes are implied.

## Originals (preserved)

- Bright: `/Users/Teem/.codex/generated_images/01a087e7-0fd9-72c1-8f28-04cee52b0764/exec-5cee8781-f07a-4d29-99ef-7c08d6c27046.png`
- Warm: `/Users/Teem/.codex/generated_images/01a087e7-0fd9-72c1-8f28-04cee52b0764/exec-3d36de41-e0f1-48ac-bd62-e76438c567ff.png`

The warm variant was an image edit of the bright original. The bowl, camera, framing, produce, table and light intentionally match; only the flavor finish changes.

## Runtime exports

- [seed-food-bright-v2.webp](../../frontdoor/art/seed-food-bright-v2.webp): 1000 × 667, WebP quality 88.
- [seed-food-bright-v2-mobile.webp](../../frontdoor/art/seed-food-bright-v2-mobile.webp): 600 × 400, WebP quality 85.
- [seed-food-warm-v2.webp](../../frontdoor/art/seed-food-warm-v2.webp): 1000 × 667, WebP quality 88.
- [seed-food-warm-v2-mobile.webp](../../frontdoor/art/seed-food-warm-v2-mobile.webp): 600 × 400, WebP quality 85.

Exports retain the complete source composition; no crop, repainting, food replacement or perspective edits were done in code. Recipe images use intrinsic landscape dimensions and full-width rendering; no bowl is cut off by CSS.

## Bright generation prompt

```text
Use case: photorealistic-natural
Asset type: premium editorial food photograph, a real appetizing recipe result inside a Thai interactive website.
Primary request: One beautiful small handmade ivory ceramic shallow bowl filled with juicy ripe red tomato bite-size wedges and crisp pale-green cucumber half-moons, freshly tossed with only a little lime juice. A single small green lime wedge rests inside the bowl near its edge, so the flavor is visually unambiguous. This must look delicious, fresh and genuinely easy to make at home.
Scene/backdrop: warm honey-toned wooden kitchen table, subtle natural grain, neutral soft out-of-focus background. No people.
Composition/framing: landscape 3:2, close editorial angle looking down about 45 degrees, the entire ceramic bowl visible with generous 10 percent breathing room on all sides, bowl centered and filling about 75 percent of image width. No cut-off rim. Honest small serving, not enormous pile.
Lighting/mood: soft warm morning window side-light, luminous translucent tomato flesh, clear cucumber seeds, fine droplets and small naturally glossy lime juice highlights, convincing appetizing shadows, delicate dimensional texture, high-end cookbook photography with exact crisp food detail.
Constraints: ONLY tomato, cucumber and lime as edible ingredients. No sesame in this first variant. No protein, fish, meat, bread, herbs, salad leaves, cheese, rice, flowers, sauces, garnish, utensils obscuring food, hands, logos, words or watermark. No illustration, plastic, 3D render, excessive dark mood or surrealism. The actual dish is the hero; beauty comes from ripe fresh produce and light.
```

## Warm edit prompt

```text
Use case: precise-object-edit
Edit target: the supplied generated landscape food photograph.
Make the second flavor variant of exactly this dish for a before/after interactive recipe. Keep the same entire ivory ceramic bowl, same amount and arrangement of ripe red tomato wedges and cucumber pieces, exact same camera angle and landscape 3:2 framing, wooden table, warm side light, realistic food texture and appetizing visual quality.
Change ONLY the following edible finish: remove the green lime wedge entirely and replace its space with a couple of cucumber pieces; remove any lime-specific juice dressing, keep produce's natural fresh moisture; scatter a modest teaspoon of lightly crushed toasted white sesame over the tomato and cucumber surfaces, with individual golden ivory seeds and a little finely crushed sesame clearly visible. The visual must instantly communicate fragrant toasted sesame rather than citrus. Do not add any other ingredients.
Constraints: no lime or lemon, no black sesame, herbs, protein, salad leaves, rice, sauce, cutlery, people, labels, text, logos, watermark. Keep entire bowl visible without cropping. Photorealistic high-end cookbook image, no illustration.
```
