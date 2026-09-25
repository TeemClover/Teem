# Editorial mobile hero — image provenance

Created: 2026-09-26
Project: AskSydScience faithful editorial homepage
Mode: built-in image generation, one edit call. No fallback CLI or API generation.

## Inputs and roles

1. `asksydscience/assets/hero-home.webp` — edit target and Sydney identity reference; face, bob haircut, beige blazer, black top and chin-on-hand pose.
2. `/Users/Teem/Downloads/IMG_1322.JPG` — top hero composition and warmth reference only. Its text, interface and lower sections were explicitly excluded.

Both local inputs were viewed before the edit. The imagegen skill at `/Users/Teem/.codex/skills/.system/imagegen/SKILL.md` was read earlier in this session and applied.

## Full prompt

Use case: identity-preserve / compositing.
Asset type: a single photorealistic mobile website hero background, PORTRAIT 4:5, approximately 1024x1280 pixels.

Input image 1 (hero-home.webp) is the edit target and identity reference. Preserve the same adult Asian woman Sydney, recognizable facial features, dark chin-to-shoulder-length bob, warm smile, beige blazer over a black top, chin resting comfortably on one hand, other arm naturally on the wooden table. Preserve the tactile photoreal photography and warm cream/sage, sunlit home atmosphere.
Input image 2 (IMG_1322.JPG) is a COMPOSITION AND WARMTH REFERENCE ONLY, specifically its top hero photograph. Do not recreate any of the webpage layout, text, logos, buttons, captions, borders, lower panels or book lettering shown in that reference.

Primary edit: art-direct the existing landscape hero as one seamless PORTRAIT 4:5 photograph for mobile. Sydney remains seated behind the wooden table on the RIGHT SIDE. Place the center of her face near x=75% of image width and y=32% of image height, with the top of her head around y=13%. Keep her head completely visible, with natural hair shape; her figure mostly fills the right 55% of the composition. Preserve the chin-on-hand smile and a relaxed, confident, welcoming expression directed at the camera. Keep the entire LEFT 40% as quiet, softly lit warm cream plaster wall suitable for a dark HTML headline, from the top down to about 74% image height. Only very subtle soft leaf shadows may enter this blank wall; no large plants, furniture, face, hands or visually busy objects intrude into that text space.

Environment: sunlit windows and airy curtains behind and to the right of Sydney, warm wooden shelves and green trailing plants at outer margins, soft home-studio depth, restrained beige/cream/sage palette. A wooden tabletop occupies the lower part of the portrait. Place a simple unmarked cream ceramic mug at x=65%, y=81%, with natural perspective and coherent handle. A few neutral unlabelled books may sit at the far lower-right edge. Soft out-of-focus green leaves frame the bottom and outer margins while leaving the left headline area clear.

Constraints: one continuous realistic photograph, no collage or montage. Preserve Sydney's face identity, hairstyle, outfit and pose from image 1; do not substitute another woman. Natural coherent hands, face, mug and body proportions. No words, no typography, no UI, no logos, no watermark, no writing on mugs/books, no additional people. Portrait 4:5 is essential; do not return a landscape crop.

## Tool and original output

Tool: `image_gen.imagegen` / callable `image_gen__imagegen`.
Arguments: full prompt above and the two absolute local input paths via `referenced_image_paths`.
Original output: `/Users/Teem/.codex/generated_images/01a0d91f-4979-73c3-a4c4-4dff555fdd7a/exec-b03adec0-e5c4-4765-8d55-0bc3137f90d0.png`.
Original dimensions: 1122 × 1402 (approximately 4:5).

## Project deliverables

- `asksydscience/assets/hero-home-portrait.webp` — 1122 × 1402; 107,196 bytes.
- `asksydscience/assets/hero-home-portrait-640.webp` — 640 × 800; 49,186 bytes.

Only deterministic proportional resizing and WebP encoding were applied after generation, using bundled Pillow, Lanczos resampling, quality 88 and method 6. No creative image changes outside the built-in tool. Existing images remain unchanged.

## Visual QA and framing

- Photoreal warm cream/sage interior with window light, green plants, wooden table, cream mug and unlabelled books.
- Sydney retains the reference bob, beige blazer, black top, welcoming smile and chin-on-hand pose. Hands and mug appear coherent at website viewing size.
- Left approximately 40% stays mostly quiet cream wall, with soft shadow texture. Foreground greenery begins toward the lower-left portion; keep headline copy above it.
- No interface, text, logos, watermarks, extra people or collage.
- Framing differs from the numeric prompt: face center is approximately x69%, y39%, and top of head is near y22%, rather than x75%, y32% and y13%. The result has more space above Sydney; this was reported to the integrating agent for mobile composition decisions.
- This is an AI-generated editorial demo asset.
