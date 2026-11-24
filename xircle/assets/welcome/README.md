# Welcome page assets — sources

Prepared 2026-11-24 for the `/xircle/` welcome page ("วันแรกของคุณกับ Xircle"). Everything here is a web-sized copy; originals stay where they came from. Two assets are AI-generated presentation scenes made from real product photos; they are listed under "Generated presentation scenes" and labelled on the page.

## Videos

| File | Source | Processing |
| --- | --- | --- |
| `film.webp`, `og.jpg` | Cover of the opening film [MU9jlnp__pg](https://youtu.be/MU9jlnp__pg) on the CloverX channel (`i.ytimg.com/vi/MU9jlnp__pg/maxresdefault.jpg`) | WebP 1280×720; `og.jpg` is a 1200×630 centre crop |
| `tour/epNN-h.mp4`, `tour/epNN-v.mp4` | Series masters "เริ่มต้นกับ Xircle" EP.1–9, `xircle-tNN-*_16x9_1920x1080_60fps.mp4` and `…_9x16_1080x1920_60fps.mp4` | Silent 6.7 s preview: three 2.2 s pieces starting at 1.0 s, 18 s and 38 s; 960×540 or 540×960, 30 fps, H.264 CRF 29, faststart, no audio |
| `tour/epNN-h.webp`, `tour/epNN-v.webp` | First frame of the matching preview | WebP q76 |

The page plays the full episodes from YouTube after a visitor presses Play: the 16:9 uploads ([playlist](https://www.youtube.com/playlist?list=PLLpWLuBth_ZU)) on wide screens and the 9:16 uploads ([playlist](https://www.youtube.com/playlist?list=PLbi96bODWmCo)) on narrow ones. IDs live in `index.html` (`data-h`, `data-v`).

## Product and lifestyle images

Taken from the official site www.xircle.health on 2026-11-24. The owner's earlier authorization to reuse that site's brand material for this page is recorded in [`../official/provenance.json`](../official/provenance.json); this revision was requested by the company. The source does not say which images are photographs and which are renders, so the page does not claim either.

| File | Source | Processing |
| --- | --- | --- |
| `band-onyx.webp`, `band-sand.webp`, `band-black-navy.webp`, `band-silver.webp` | `https://www.xircle.health/assets/band-{onyx,sand,black-navy,silver}.png` (302×373, transparent) | 2× Lanczos resize, light unsharp mask, WebP with alpha |
| `band-mesh.webp` | `https://www.xircle.health/assets/band-hero-shot.png` | Cropped to the product, resized to 1100 px high, WebP with alpha |
| `band-day.webp` | `https://www.xircle.health/assets/eco-app.jpg` | WebP |
| `bedside.webp` | `https://www.xircle.health/assets/sleep-bedside.jpg` | Resized to 1200 px, WebP |
| `scale-flatlay.webp` | `https://www.xircle.health/assets/eco-scale.png` | WebP |
| `scale-top.webp` | Company Drive product folder, `XIRCLE_Scale 02` (kit copy `sources/product/xircle-scale-02.jpg`) | White background removed by flood fill from the four corners, cropped, resized to 1000 px wide, WebP with alpha |

App screens on the phone reuse the existing sanitized crops in [`../real-app/`](../real-app/README.md).

## Generated presentation scenes

Both were made on 2026-11-24 at the owner's request, from real product photos, and the page labels each as "ภาพจำลอง". They show the product in a staged scene; they are not documentary photographs and add no product claim.

| File | How it was made | Processing |
| --- | --- | --- |
| `band-seq/f000.webp` … `f073.webp` | Higgsfield, model Seedance 2.5, job `a2fef204-55ad-4f89-8494-9bdf9e91c769`: 5 s, 1080p, no audio, 80 credits. Reference frame: the official `band-hero-shot.png` placed on the page's night background. Brief: keep the product identical, slow 25° orbit, one pass of light over the mesh strap, then warm dawn light. | Frames 47–120 of 121 only. The first 47 frames are left out because the model drew a glowing blue edge on the module that the real product does not have. Cropped to the centre 1080×1080, resized to 720×720, WebP q56 (1.8 MB for 74 frames). |
| `scale-hud.webp` | ChatGPT image generation with the real product photo (`XIRCLE_Scale 02`) as reference: top-down, two bare feet on the scale, dark slate floor, no text. | Centre-cropped to 16:9, 1600×900, WebP q80. The generated centre button shows the X mark without the small "XIRCLE" wordmark of the real one. |

Second batch, same day, asked for by the owner with a brief to make the motion more imaginative:

| File | How it was made | Processing |
| --- | --- | --- |
| `scale-ripple.mp4` | Higgsfield, model Seedance 2.5, job `2d581768-b7fe-4ed5-8888-4d635fe83953`: 5 s, 1080p, no audio, 80 credits. First and last frame are both `scale-hud` (so it loops). Brief: locked top-down camera; rings of light in cyan, emerald and violet spread from the scale across the floor while the glass panels glow, then everything returns to the first frame. | 1280×720, H.264 CRF 25, no audio (0.56 MB) |
| `bedside-night.mp4`, `bedside-night.webp` | Higgsfield, model Seedance 2.5, job `74ed6914-2f05-4bbc-b4b5-e83e55e12f84`: 5 s, 1080p, 1:1, no audio, 80 credits. Last frame: the official `sleep-bedside.jpg`. First frame: the same photo graded to moonlight with the phone screen blacked out, made locally. Brief: one night turning into morning; rings of light breathe out from the band, gather into an arc that travels to the phone, and the screen wakes. | 900×900, H.264 CRF 26, no audio; the WebP is the first frame |

The rings and arcs of light in these two clips are a visual metaphor for the devices reading the body and syncing to the app. Neither device emits light like this, and the page labels both cards "ภาพจำลองเพื่อการนำเสนอ". The still shown without motion on the bedside card is the real official photo (`bedside.webp`).

The HUD on the Scale card (corner marks, scan line, the five value names and "ดูต่อได้ 9 ค่า") is HTML and CSS over that image, so the Thai text is real text. The page draws the Band sequence on a canvas by scroll position; it loads only when the night scene is near, is skipped with reduced motion or data saver, and narrow screens load every second frame. Without it the real product photo with the CSS light sweep is shown.

## Drawn in code, labelled as examples

The light that passes over the Band in the night scene is a CSS gradient masked to the product photo and tied to scroll; the photo itself is not altered or regenerated, and the slight turn is a CSS 3D transform of the same flat image. The sleep line behind the Band, the scale display digits and footprints, the five value cards (61.4 kg, 24.8 %, 43.2 kg, 2.6 kg, 54.1 %), the Habit Score rings (76) and the MaxAge trend line are illustrations made in HTML/CSS/SVG. The page labels them as sample numbers; none is a visitor's measurement or a product result.

## Product facts used in the copy

| Statement on the page | Source checked 2026-11-24 |
| --- | --- |
| Band 19 g · no screen, LED status light · IP68 · wireless charging in under 2 hours · 30 days of on-device storage · tracks heart rate, sleep, steps and HRV | xircle.health home and `/products/xircle-band-1` (overview and spec list) |
| Band colours Onyx, Sand, Black Navy, Silver | `/products/xircle-band-1` |
| Scale: five values per weigh-in (weight, body fat, muscle mass, bone mass, body water) · up to 180 kg · 0.05 kg steps · up to 8 profiles · bare feet, open the app, saved to My Body | `/products/xircle-scale` (overview and spec list) |
| Nine values on My Body · weigh once a week · estimates, read as a trend | Series EP.8 narration |
| Habit Score from eating, sleep and movement · MaxAge is a direction, not a prediction | Series EP.2 and EP.9 descriptions |

Left out on purpose: **battery life**. The official home page says 10 days, the Band page says up to 15 days and its spec list says about 15 days in normal use. Add a figure only after the owner confirms which one to print.
