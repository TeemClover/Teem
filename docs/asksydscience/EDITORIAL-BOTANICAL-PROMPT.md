# Editorial botanical branch — image provenance

- Date: 2026-09-26
- Purpose: decorative leaf ornament for the AskSydScience editorial stories/footer. AI-generated botanical cutout, not a scientific plant identification image.
- Generator: built-in `image_gen.imagegen`, one new generation followed by one focused edge-refinement edit, both requesting a genuinely transparent alpha background. The tool does not report a model version.
- Reference input: no raster input was passed in this call. The warm olive/sage palette was guided by the user-provided `IMG_1322.JPG`, inspected earlier in the same asset task session.
- Initial output retained outside the repository: `/Users/Teem/.codex/generated_images/01a0d91e-e1a0-7462-8972-1aa29d71a57a/exec-47d3d36d-091c-4abd-a3e9-35f9b2b4f622.png` (1254 × 1254, RGBA).
- Selected refined output: `/Users/Teem/.codex/generated_images/01a0d91e-e1a0-7462-8972-1aa29d71a57a/exec-74bdd3f1-74ba-49a2-ab5b-d1ef4bea795a.png` (1254 × 1254, RGBA).
- Public derivative: `asksydscience/assets/botanical-branch.webp` (1024 × 1024, RGBA).
- Delivery conversion: resized with Lanczos; WebP quality 90, method 6, exact RGB preservation requested. Alpha preserved. No background removal, pixel retouching, crop, compositing or other manual image edits.
- Deployment scope: this internal document is under `docs/asksydscience/`, excluded by `.vercelignore`.

## Exact prompt

```text
Use case: photorealistic-natural.
Asset type: a single isolated botanical cutout ornament for a warm cream editorial website.
Generate one elegant short botanical branch on a genuinely transparent alpha background, square 1024 by 1024 pixels. A slender gently curving warm brown-green stem enters from the bottom-right corner and arcs diagonally toward upper-left, carrying exactly seven delicately spaced muted olive and sage green leaves, a natural ficus/olive-like shape with visible fine veins, matte organic surfaces, subtle variation and tender edges. The leaves should be realistic photographic foliage, softly lit by warm natural daylight, with a calm gentle character matching a sunlit cream-and-sage home. Keep the branch airy and asymmetric; no dense bush. Occupy about 80 percent of the square, allowing transparent breathing room around leaf edges. The lighting may give the leaves soft dimensional shading but there must be NO cast shadow on a surface because no background or surface exists. IMPORTANT: output a real transparent background with alpha, not a white or beige rectangle and not a checkerboard pattern painted into the image. Only the leaves and single connected delicate stem are visible. No pot, flowers, fruit, soil, furniture, people, text, logo, watermark, border, UI, flat vector styling or added backdrop.
```

## Focused refinement prompt

The initial WebP was inspected, then passed as the edit target for this refinement:

```text
Edit this transparent botanical branch cutout to refine its edge quality only. Preserve the same seven leaves, leaf shapes, olive and sage photographic green surfaces, fine veins, thin curved stem running from bottom-right toward top-left, composition and genuinely transparent alpha background. Remove every neon yellow, red, bright green and orange pixel fringe or small jagged colored patch around the leaves and stem. All edge pixels must take their color naturally from the adjacent muted olive green leaf or brown-green stem. Produce clean natural antialiased photographic edges without a halo, colored fringe, surface shadow, painted outline or glow. Keep the leaf interiors detailed, softly lit and opaque; use smooth alpha only along the object boundaries. No background at all, no white rectangle, no checkerboard, no added elements or text. Deliver a square 1024 by 1024 RGBA image with actual transparency.
```

## Alpha and visual review

Both generated PNGs and the exported WebP are RGBA with alpha extrema 0–255. This is an actual transparent cutout, not a painted white rectangle or checkerboard.

The image shows seven muted green leaves with visible veins on a thin curved stem entering from the lower-right. No pot, person, text or backdrop is present. The original and delivered image were inspected visually. The tool's black transparency display exaggerated bright fringe pixels, prompting the focused edit; subsequent pixel inspection established that bright red fringe pixels in both outputs have alpha only 1–4 out of 255, so they are nearly invisible in normal alpha compositing. No manual mask cleanup or retouching was performed. Consuming CSS and browser presentation were left to the main task.
