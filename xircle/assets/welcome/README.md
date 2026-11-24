# Welcome page assets — sources

Prepared 2026-11-24 for the `/xircle/` welcome page ("วันแรกของคุณกับ Xircle"). Everything here is a web-sized copy; originals stay where they came from. Two assets are AI-generated presentation scenes made from real product photos; they are listed under "Generated presentation scenes" and labelled on the page.

## Videos

| File | Source | Processing |
| --- | --- | --- |
| `film.webp`, `og.jpg` | Cover of the opening film [MU9jlnp__pg](https://youtu.be/MU9jlnp__pg) on the CloverX channel (`i.ytimg.com/vi/MU9jlnp__pg/maxresdefault.jpg`) | WebP 1280×720; `og.jpg` is a 1200×630 centre crop |
| `film-live.mp4`, `film-live.webp` | Cut from the opening film itself. Source: the local master of the same film (`ref2-Xircle-explainer-original.mp4` in the website handoff references, 1920×1080, 131 s; the YouTube upload `MU9jlnp__pg` reports the same length and title). Nine shots of 1.75 s with 0.25 s dissolves, starting at 11.4, 19.2, 34.3, 45.0, 53.7, 62.2, 70.5, 86.5 and 100.4 s: Habit Tracker, Sleep, AI Food Scan, Metabolic Balance, Move, Heart Rate, Habit Score, Body Composition, MaxAge. Cropped to 1600×900 at (96, 84) so the logo strip and the burned-in subtitle pill are left out. Nothing generated. | 1280×720, 30 fps, H.264 CRF 28, no audio, 13.8 s, 1.1 MB; the WebP is the frame at 1.0 s |
| `tour/epNN-h.mp4`, `tour/epNN-v.mp4` | Series masters "เริ่มต้นกับ Xircle" EP.1–9, `xircle-tNN-*_16x9_1920x1080_60fps.mp4` and `…_9x16_1080x1920_60fps.mp4` | Silent 6.7 s preview: three 2.2 s pieces starting at 1.0 s, 18 s and 38 s; 960×540 or 540×960, 30 fps, H.264 CRF 29, faststart, no audio |
| `tour/epNN-h.webp`, `tour/epNN-v.webp` | First frame of the matching preview | WebP q76 |

The page plays the full episodes from YouTube after a visitor presses Play: the 16:9 uploads ([playlist](https://www.youtube.com/playlist?list=PLLpWLuBth_ZU)) on wide screens and the 9:16 uploads ([playlist](https://www.youtube.com/playlist?list=PLbi96bODWmCo)) on narrow ones. IDs live in `index.html` (`data-h`, `data-v`).

## Product and lifestyle images

Taken from the official site www.xircle.health on 2026-11-24. The owner's earlier authorization to reuse that site's brand material for this page is recorded in [`../official/provenance.json`](../official/provenance.json); this revision was requested by the company. The source does not say which images are photographs and which are renders, so the page does not claim either.

| File | Source | Processing |
| --- | --- | --- |
| `band-onyx.webp`, `band-sand.webp`, `band-black-navy.webp`, `band-silver.webp` | `https://www.xircle.health/assets/band-{onyx,sand,black-navy,silver}.png` (302×373, transparent) | 2× Lanczos resize, light unsharp mask, WebP with alpha |
| `band-mesh.webp` | `https://www.xircle.health/assets/band-hero-shot.png` | Cropped to the product, resized to 1100 px high, WebP with alpha |
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

The rings and arcs of light in these two clips are a visual metaphor for the devices reading the body and syncing to the app. Neither device emits light like this, and the page labels both cards "ภาพจำลองเพื่อการนำเสนอ".

Third batch, same day. The owner asked for a fast montage on the Band card and for generated clips on the food-scan and Habit Score cards in place of the vertical app clips:

| File | How it was made | Processing |
| --- | --- | --- |
| `band-montage.mp4`, `band-montage.webp` | Higgsfield, model Seedance 2.5, job `3e87984a-eb7f-44a5-9484-cdfcf5014043`: 6 s, 1080p, 1:1, no audio, 96 credits. Reference: a sheet of the four official Band images. Brief: match-cut montage, a different person and place about every half second with the wrist held in the centre (run, office, kitchen, pool, garden, gym, train, parent and child, yoga, sleep). | 900×900, H.264 CRF 27, no audio (0.86 MB); the WebP is the first frame. In several shots the model drew the X mark on the module as a lit green X; on the real product the X is not lit and the status LED is a separate small dot. |
| `food-scan.mp4`, `food-scan.webp` | Start and end frame: a top-down meal generated with GPT Image 2.6 on Higgsfield (job `6786bb9f-c493-4676-bb4e-fe9b83617b7e`). Clip: Seedance 2.5, job `14ebc1bf-1818-4be1-bf66-ac7939f45463`: 5 s, 1080p, 1:1, no audio, 80 credits. Brief: locked camera; a scan line leaves the phone, each dish gets a glowing outline, points of green, amber and coral light lift from the food, then everything returns to the first frame (it loops). | 900×900, H.264 CRF 25, no audio (0.41 MB); the WebP is the first frame |
| `habit-week.mp4`, `habit-week.webp`, `habit-week-end.webp` | Start frame: seven light pillars and a faint ring, generated with GPT Image 2.6 on Higgsfield (job `664b9745-dfc4-4cb0-95d4-256dd010c85a`). Clip: Seedance 2.5, job `d36eea26-8c9a-4a2e-8612-0fa6b6fa3077`: 6 s, 1080p, 1:1, no audio, 96 credits. Brief: locked camera; each pillar releases three ribbons of light that fly up and fill the ring until it is complete. | 900×900, H.264 CRF 23, no audio; WebP stills are the first and last frames |

On these three cards the words and numbers are HTML over the clip: the dish names, the per-dish protein / carbohydrate / fat numbers (กะเพราไก่ไข่ดาว 30 / 60 / 22, ต้มยำกุ้ง 14 / 8 / 4, ผัดผักบุ้ง 4 / 8 / 9, มะละกอ 1 / 10 / 0, สับปะรด 0 / 10 / 0, in grams), the meal totals they add up to (49 g, 96 g, 35 g, and 895 kcal at 4, 4 and 9 kcal per gram), the day initials and the score (76) are examples written for this page, not output of the app, and are labelled so. Their positions are given in the clip's own coordinates and converted for the wide and narrow layouts in `welcome.css`.

Fourth batch, same day. The first sleep clip showed the Band lying on a bedside table while "tracking"; the owner pointed out it has to be on the sleeper. It was replaced on the sleep card, and `bedside.webp`, `bedside-night.*` were removed. The owner then asked for that clip to be kept somewhere it fits, so its morning half came back as `band-sync.*` on the 24/7 card in the Band chapter, where it only shows data arriving in the app:

| File | How it was made | Processing |
| --- | --- | --- |
| `sleep-night.mp4`, `sleep-night.webp`, `sleep-night-end.webp` | Higgsfield, model Seedance 2.5, job `ae58fcb3-6dd6-486c-97ff-06e40105af2e`: 8 s, 1080p, 1:1, no audio, 128 credits. Reference: the sheet of the four official Band images. Brief: a five-shot film of one night with the Band on the sleeper's wrist in every shot (falling asleep, light sleep, deep sleep, dreaming sleep, waking), each stage with its own colour and rhythm of light. | 900×900, H.264 CRF 25, no audio; WebP stills are the first and last frames |

| `band-sync.mp4`, `band-sync.webp`, `band-sync-end.webp` | Cut from the earlier bedside clip (Higgsfield, Seedance 2.5, job `74ed6914-2f05-4bbc-b4b5-e83e55e12f84`, 5 s, 80 credits; its last frame is the official `sleep-bedside.jpg`). Only the part from 1.75 s is used: morning light, an arc of light travels from the Band to the phone and the app screen wakes. No new generation. | 900×900, H.264 CRF 25, no audio, 3.3 s; WebP stills are the first and last frames |

The app screen on the phone in `band-sync` is drawn by the model and is not a real screenshot; the card is labelled "ภาพจำลองเพื่อการนำเสนอ".

Beside the sleep clip the card shows the app's sleep screen, redrawn in HTML after the overview film (0:15 to 0:21): last night 00:29 to 08:07, 7:36 asleep, score 78, the four rows Awake 0:21 / Light 3:43 / REM 1:50 / Deep 1:44, and REM + Deep = Restorative 3:34. Those are the film's own sample numbers. The line in the rows is a simplified single cycle drawn to follow the five shots of the clip (`data-cues` and `data-rows`), not a real night. The coloured light in the clip is a visual metaphor; the Band does not emit it.

The last card keeps the seven-day clip and its sample Habit Score of 76, then shows a MaxAge panel redrawn in HTML after the overview film at 1:36 to 1:49: Habit Score + Body Composition + health values, and a ruler with actual age, Bio Age, the Thai average and Max Age. Like the film, it prints no age figures, and it carries the film's line that these are estimates from device data and not a medical diagnosis.

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

**Wear and charging line.** The 24/7 card in the Band chapter says "ใส่ได้ 24/7 · ชาร์จสัปดาห์ละครั้ง โดยไม่ต้องถอดจากข้อมือ". The wording was given by the owner on 24 Nov 2026. What the official site says, read the same day: the home page has "แบตเตอรี่ 10 วัน · ชาร์จครั้งเดียวใช้ได้ทั้งสัปดาห์ ไม่ต้องถอดบ่อย", the Band page has "ใส่ได้ทั้งวันทั้งคืน", wireless charging and a charging case with its own 210 mAh battery, and the support page has "ชาร์จ Band ด้วยแท่นชาร์จไร้สาย". None of those pages says in so many words that the Band charges while it is on the wrist, so that part rests on the owner's word.

Still left out on purpose: a **battery-day figure**. The official home page says 10 days, the Band page says up to 15 days and its spec list says about 15 days in normal use. A test keeps a day figure off the page until the owner confirms which one to print.
