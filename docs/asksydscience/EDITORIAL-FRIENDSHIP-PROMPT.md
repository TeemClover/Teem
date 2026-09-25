# Editorial friendship room — image provenance

- Date: 2026-09-26
- Purpose: photographic background for the lower AskSydScience homepage. This is an AI-generated demo environment, not a documentary photograph of Sydney's real home.
- Generator: built-in `image_gen.imagegen`, one reference-guided generation. The tool does not report a model version.
- Input 1 (mood/layout reference): `/Users/Teem/Downloads/IMG_1322.JPG`, user-supplied homepage concept; only the warm living-room atmosphere in section 03 is used. The instruction explicitly excludes its text, frames, interface and people from the output.
- Input 2 (supporting atmosphere/material reference): `asksydscience/assets/home-studio.webp`, existing generated demo room.
- Original output retained outside the repository: `/Users/Teem/.codex/generated_images/01a0d91e-e1a0-7462-8972-1aa29d71a57a/exec-853862ce-d4dd-4147-8a96-85de4f9c2cb7.png` (1536 × 1024).
- Public derivatives: `asksydscience/assets/friendship-room.webp` (1536 × 1024) and `asksydscience/assets/friendship-room-800.webp` (800 × 533).
- Delivery conversion: RGB WebP quality 86, method 6; 800-pixel version resized with Lanczos. No crop, retouch, compositing or manual generative edits. Source references preserved.
- Deployment scope: this internal document is under `docs/asksydscience/`, excluded by the repository's `.vercelignore`; only derivatives are public assets.

## Exact prompt

```text
Use case: photorealistic-natural.
Asset type: photographic living-room background for a warm editorial website, NOT a website screenshot or graphic.
Input images: Image 1 is a mood and room-layout reference ONLY; use the warm cream living room in its bottom section numbered 03, ignore all interface text, portraits, photographs, frames, typography, graphics and other sections. Image 2 is a supporting reference ONLY for the existing AskSydScience room's warm sunlight, natural linen, sage green plants, pale oak materials and realistic photographic texture.
Create one new unoccupied inviting living room photographed straight toward a warm ivory plaster wall, wide 3:2 landscape, 1536 by 1024 pixels. The upper approximately 65 percent of the composition must be a large continuous quiet cream wall: mostly blank from left-center through right-center with subtle soft daylight shadows, generous clear wall space for separately rendered text and three picture frames that will be added later in HTML. DO NOT put any frames or artwork in this image. The lower 35 percent contains a low, soft off-white linen sofa along the lower left, warm cream and muted sage cushions with plain unmarked fabric, and a round pale honey-oak coffee table at lower right. On the table are a small plant in a simple cream ceramic pot and two or three plain cream and sage books with completely blank spines and covers. Natural botanical greenery softly enters from the extreme side margins and bottom corners, never covering the central blank wall. A glimpse of soft curtain at far left is acceptable, but no large window interrupts the blank wall. Calm late-morning sunlight from camera-left, beautiful gentle leaf shadows near the margins, soft inviting tones, modest authentic home atmosphere, photoreal editorial interior photography. Prioritize empty cream wall and low furniture in the specified layout, consistent with the friendly cozy reference. A real lived-in room, not a luxury showroom, not a computer render. No people, no frames, no artwork, no screens, no visible letters or numbers anywhere, no text, no logos, no watermark, no UI, no borders or collage.
```

## Visual review and composition guidance

Both reference images were inspected before generation; the generated output was reviewed at full aspect ratio. The image is a warm, realistic-looking environment photo with an empty cream wall across the upper approximately 64% at center, a low linen sofa at lower left, round oak table with a ceramic plant and blank books at lower right, and greenery along the margins. No people, frames, artwork, logos, text or UI are visible. The material palette and soft leaf shadows restore the supplied concept's welcoming atmosphere while leaving the actual page copy and three frames to HTML.

The cleanest overlay area is roughly 25–80% across the image and 8–59% down. Left leaf shadows are more detailed than the center, and plants enter from both edges; dark green copy may need a subtle localized cream wash if placed over those margins. Preserve the full 3:2 composition where possible: aggressive mobile cropping would remove the sofa or table that establishes this scene. Furniture begins at roughly 64% of image height. This assessment is visual asset QA, not browser or accessibility verification of consuming page code.
