# Lived-in home image provenance

Created 2026-09-26. These three illustrative AI demo scenes place Sydney within the room; they do not document her real home or activities. The original room assets and homepage hero remain preserved.

| Scene | Full prompt and QA | Full image — 1536 × 1024 | Responsive image — 800 × 533 |
| --- | --- | --- | --- |
| Kitchen | [Kitchen prompt](KITCHEN-OCCUPIED-PROMPT.md) | [Kitchen WebP](../../asksydscience/assets/sydney-kitchen-lived.webp) | [Kitchen 800 WebP](../../asksydscience/assets/sydney-kitchen-lived-800.webp) |
| Mindfulness | [Mindfulness prompt](MINDFULNESS-OCCUPIED-PROMPT.md) | [Mindfulness WebP](../../asksydscience/assets/sydney-mindfulness-lived.webp) | [Mindfulness 800 WebP](../../asksydscience/assets/sydney-mindfulness-lived-800.webp) |
| Reading | [Reading prompt](READING-OCCUPIED-PROMPT.md) | [Reading WebP](../../asksydscience/assets/sydney-reading-lived.webp) | [Reading 800 WebP](../../asksydscience/assets/sydney-reading-lived-800.webp) |

Each scene used one reference-based edit through built-in GPT Imagegen (`image_gen.imagegen`), with its existing room image as the edit target and `hero-home.webp` as Sydney's identity reference. No CLI generation fallback was used; the tool did not expose a model version. Subsequent processing was limited to WebP format conversion and proportional resizing, with no manual creative edits or crop.

The individual records retain complete prompts, input roles, generator output paths, encoding details, and composition QA, including differences from the requested figure scale. The final room-dominant compositions were visually accepted for this demo.

The homepage shows all three full-room images alongside visible reading notes. The dedicated kitchen and mindfulness pages preserve their full 3:2 frames; About uses the reading scene with its letter on the left on desktop and below the full image at widths up to 1000 px. The workshop keeps its original empty studio backdrop so the book mockup does not cover Sydney.
