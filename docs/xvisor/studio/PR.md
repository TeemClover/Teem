## X‑VISOR Studio: from one photo to a first clip, at `/xvisor/studio/`

A person who isn't comfortable with AI opens the link on their phone, plays a 9:16 sample clip, and then either tries the sample photos or uses their own 1–3 photos. They type what they want to say in their own words and get a 15–30 s draft with a beginning, middle and end. They can edit the hook, move the crop focus, and swap which photo each shot uses. They can then save the clip and send the latest brief to Claude. No account, API key, upload or camera is needed.

### Handoff for the `/xvisor` session (no dependency between the two PRs)

- **Button:** `ทำคลิปแรกจากรูปของพี่`
- **Link:** `/xvisor/studio/`
- **One-line description:** `เลือกรูป เล่าด้วยคำของพี่ ได้คลิปแนวตั้งพร้อมส่งต่อให้ Claude`
- Studio works with or without the new `/xvisor` page. Its only link back is `/xvisor/` in the header.
- Possible conflict: this PR adds one redirect to `vercel.json` (`/xvisor/studio` → `/xvisor/studio/`), placed after `/routinex/start` to keep it away from the `/xvisor` entries.

### How it works

- **One plan, three outputs.** `engine/story.js#buildPlan` produces a plan carrying a short id. The canvas preview, the in-browser export and the offline demo render all draw it through the same `engine/render.js#drawFrame`. The Claude brief (`engine/brief.js`) is built from the same plan. The file name and the brief both carry the plan id (for example `xvisor-clip-gab7un.mp4` ↔ `ฉบับ gab7un`).
- **Content rules** (from the X‑VISOR skill's clip playbook and Claim Guard):
  - It skips questions the story already answers and asks at most two (audience and CTA), each with a recommended choice.
  - Personal lines come only from the person's own text. It never adds results, days of use or health numbers, and never asks anyone to film a face.
  - Every line is checked against the Claim Guard word list.
- **Three telling styles:** `เล่าเรื่องเช้านี้` (story), `ชวนตอบหนึ่งคำถาม` (question with ก/ข/ค and a comment CTA), `โชว์ทีละขั้น` (numbered steps and a recap).
- **Thai on mobile:**
  - Lines break at spaces first, then at ICU word boundaries. Silent-letter syllables stay whole (คอมเมนต์).
  - Line breaks are balanced, and font size is fitted to each text block.
  - Text stays inside a 9:16 safe area that clears platform buttons and captions, on the side of the frame away from the photo's focus point.
  - The preview can overlay mock app buttons ("แสดงพื้นที่ปุ่มของแอปวิดีโอ").
- **Photos stay on the device.** EXIF orientation is applied and images are downscaled to 1600 px. HEIC and other unreadable files get a Thai explanation.
- **Export is detected at runtime:** MP4 (H.264) where MediaRecorder supports it, otherwise WebM with a duration patched in so players can seek. Without a recorder, the button reads `บันทึกภาพรายฉาก + บท (PNG, TXT)` and saves one 1080×1920 PNG per shot plus the script. On touch devices it uses the share sheet.
- **Lazy loading.** The landing page plays a pre-rendered MP4. The renderer and fonts load on the first choice, and the exporter loads only when saving.
- **Official assets in one place:** `engine/official-assets.js`. The sample uses `xircle/assets/official/scale-lifestyle.webp` (owner-authorized, see `provenance.json`) and `xircle/assets/real-app/scale.jpg`. Both are byte-identical to the files of the same purpose in the TeemClover/xvisor skill repo, which is not public yet. Switch `publicPath` there when it publishes.

### Demo clips (rendered from the same engine and the same sample content)

`xvisor/studio/demo/xvisor-studio-{story,question,steps}.mp4` are H.264 High, yuv420p, 1080×1920, 30 fps, faststart, with a silent AAC track, about 2.5 MB each, 19.8 s / 19.8 s / 17.0 s long. They were rendered with `node tests/xvisor/studio/render-demo.mjs` using Skia canvas and ffmpeg. The plan ids in `demo/demo.json` match the plans the browser builds for the same sample (e2e check "sample plan in browser = pre-rendered demo plan").

### Tests

- `node --test tests/xvisor/studio/story.test.mjs`: 12/12 pass.
- `node tests/xvisor/studio/e2e.mjs` (Chrome 157, headless): 38/39 pass. The one failure is `/favicon.ico` returning 404 from the local sparse checkout. That file exists on `main`.
  - **Mobile is Chrome emulation** (393×852 @3x, touch, iOS 17 Safari UA). It was **not tested on a real iPhone**. Desktop was 1366×900.
  - **In-browser video export works in Chrome** as `video/mp4;codecs=avc1.42E01F`: `xvisor-clip-gab7un.mp4` is 720×1280, 20.6 s for a 20.5 s plan. Frames at start, middle and end match the renderer at 35.0 / 31.8 / 37.9 dB PSNR. The WebM path (`?force=nomp4`) produced 19.75 s with a finite duration.
  - **Fallbacks tested:** no codec (`?force=nocodec`) gives 5 PNGs at 1080×1920 plus a script that carries the same plan id, and the preview still plays. Blocked clipboard (`?force=noclip`) shows manual copy instructions with the brief text selected.
  - **Edit propagation:** after a longer Thai hook and a crop drag, the preview, the exported file, the copied brief (read back from the clipboard) and the file name all carry plan `gab7un`. The old hook does not appear in the brief.

Evidence, from the e2e run: [`docs/xvisor/studio/`](https://github.com/TeemClover/Teem/tree/ai/xvisor-studio/docs/xvisor/studio) (screenshots, `e2e-report.json`, `brief-copied-mobile.txt`, `export-vs-render.jpg`).

### Files

- `xvisor/studio/**`: the page, the engine and the demo clips.
- `tests/xvisor/studio/**`: unit tests, e2e and the demo renderer. Already excluded from deploys by `.vercelignore` (`tests/xvisor/`).
- `docs/xvisor/studio/**`: evidence. Already excluded by `.vercelignore` (`docs/xvisor/`).
- `vercel.json`: one redirect.

No onboarding, game or `/xvisor` page files are touched. No new dependencies, paid services or accounts.
