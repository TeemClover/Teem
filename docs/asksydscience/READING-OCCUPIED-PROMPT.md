# Reading room with Sydney — image provenance

Created: 2026-09-26  
Project: AskSydScience lived-in home  
Mode: built-in image generation tool, one edit call, no CLI/API image generation.  
Use case: compositing / identity-preserve.

## Inputs and roles

1. `asksydscience/assets/home-studio.webp` — edit target; existing room composition, architecture, furniture, plants and natural light.
2. `asksydscience/assets/hero-home.webp` — Sydney identity reference only; adult Asian woman with dark chin-to-shoulder-length bob.

Both local inputs were inspected with `view_image` before generation.

## Full prompt

Use case: compositing / identity-preserve.
Asset type: wide photorealistic editorial website room image, 3:2 landscape, ideally 1536x1024.

Input image 1 (home-studio.webp) is the EDIT TARGET: preserve its room, camera position, wide framing, cream walls, sage textiles, left windows and sheer curtains, abundant green plants, low bookshelf, right-side linen sofa, wooden floor, light-and-shadow pattern, and foreground wooden table with ceramic mug, open notebook, pencil and stacked books. Preserve these environmental details and the room-first composition.
Input image 2 (hero-home.webp) is an IDENTITY REFERENCE ONLY: use the same adult Asian woman Sydney, with the same facial features and straight dark chin-to-shoulder-length bob. Do not copy the reference portrait framing, hand-to-cheek pose, blazer, direct camera gaze or large figure size.

Primary edit: naturally add Sydney seated on the sofa in the RIGHT THIRD of image 1, reading an open book held comfortably in her lap with anatomically coherent hands. She wears a simple cream linen shirt with neutral trousers. Her posture is relaxed and believable, gaze softly lowered to the pages, not looking at the camera. Include only one person. Her seated figure must be small in the room, approximately 20–28 percent of the complete image height, with the architecture, furniture, plants and light making up 75–85 percent of the visual emphasis. Keep the foreground table and books clearly visible; preserve airy space across the left/center for website copy. This is a candid environmental interior photograph, not a portrait or fashion shoot. Match the original golden natural window light, perspective, depth and authentic linen/wood/paper textures. Subtle natural human presence in a spacious, lived-in room.

Constraints: change only what is required to seat the referenced woman naturally on the right-side sofa; keep the original room composition and generous environmental view. No other people, no signage, no readable book titles or lettering, no logos, no watermark, no collage, no illustration. Output a single polished 3:2 wide photograph.

## Tool and source output

Tool: `image_gen.imagegen` / callable `image_gen__imagegen`.  
Arguments: the full prompt above and the two absolute local input paths through `referenced_image_paths`. No model override or CLI fallback.  
Original output: `/Users/Teem/.codex/generated_images/01a0d91f-4979-73c3-a4c4-4dff555fdd7a/exec-57a1e88b-7fb3-4c85-a0a9-d564a769e9da.png`.  
Generated dimensions: 1536 × 1024.

## Project outputs

- `asksydscience/assets/sydney-reading-lived.webp` — 1536 × 1024; 152,970 bytes.
- `asksydscience/assets/sydney-reading-lived-800.webp` — 800 × 533; 72,260 bytes.

Only deterministic format conversion and proportional resize were applied after generation, using bundled Pillow with Lanczos resampling and WebP quality 86, method 6. No compositing, retouching or creative image edits were performed outside the image tool. Existing assets remain unchanged.

## Composition QA

- Original room layout, window light, plants, cream/sage furniture and wooden foreground table are closely preserved.
- One adult woman sits naturally on the right-side sofa, looking down at an open book, wearing a cream linen shirt and neutral trousers.
- Book and hand arrangement are coherent at website viewing size; no additional person, visible logo, watermark or readable lettering.
- Left and center remain open for copy; room environment and foreground books dominate the image.
- The requested seated figure height was 20–28% of the image. The generated figure is approximately 49–50% of image height, occupying roughly 9–12% of the image area. This deviation was reported to the integrating agent; no second generation was made within the one-edit scope.
- This is an AI-generated editorial demo image, not documentary evidence of a photographed activity.

