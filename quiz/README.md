# myClover Quiz

Live multiplayer quiz for `/quiz/`; host screen at `/quiz/host/`. It is an open tool: any host writes or imports their own questions. There is no built-in question bank.

- Up to 200 players per room; numeric six-digit room code and locally generated QR.
- Guest nicknames with nine animal choices, one image per animal, shown everywhere as a round close-up of the animal's face (`assets/faces/*.jpg`, 256×256, cropped from the original TeamBook Rare art); orange and white cats share the same cat choice. The full 68-ID catalog remains accepted for old clients and existing rooms. Legacy IDs render using the corresponding single animal image. No membership or collectible ownership changes.
- **ตั้งคำถามเอง**: enter a question count from 5 to 20, then use numbered navigation to write each question and four choices. The first choice is the correct answer. Choices are shuffled once per room, keeping that order for everyone.
- **ดูวิธีทำไฟล์ Excel**: a button under the import heading opens a dialog with a 42-second how-to video (`guide/excel-guide.mp4`, 720p, 1.9 MB, Thai voice-over by ElevenLabs with subtitles in the picture; `excel-guide.th.vtt` is available but off by default), three short steps and the template download. The video loads only when the dialog opens. Source project: `~/Claude/quiz-guide-video` on Tom's M2 (code-drawn, rebuild with `node build.js && node render.js --workers=2 && node audio.js && node publish.js`).
- **Import XLSX / CSV**: choose a local file up to 5 MB with columns A–E: question, correct answer, wrong answer 1, wrong answer 2, wrong answer 3. Each nonempty row is one question; import 5–20 questions. The original file is never uploaded. A local module worker parses the file, and a preview shows the source rows, correct-answer column, validation errors and count before replacing the custom draft. Room creation stays disabled during review until import or cancellation. Imports can be edited in the numbered editor and are revalidated by the existing server when creating a room.
- The first nonempty row is checked conservatively for Thai/English header labels, including the original workbook's partial header with only A/B labeled. The UI states whether that row is skipped or kept and lets the host override it, so a real first question is not silently discarded. Empty rows are skipped; missing or duplicate choices, excess populated columns and too many questions produce visible errors rather than truncation.
- XLSX supports worksheet selection, formatted numeric choices, saved formula values and per-sheet errors for formula cells without cached values or Excel error cells. Files with more than 30 sheets or a sheet range exceeding 1,000 rows are rejected for that scope. CSV supports comma/semicolon/tab separators, quoted commas/newlines/escaped quotes, Excel `sep=` directives, UTF-8, UTF-16 and Thai Windows-874. A downloadable five-question CSV example is at `/quiz/templates/quiz-import.csv`.
- The draft stays in this browser's local storage, including hidden questions when the count is reduced. It is sent to the server only when creating a room. Question text is limited to 240 characters; each of the four distinct choices to 100. The server validates every set and ignores submitted answer indexes and IDs. A room cannot be created without questions. The API body limit is 96 KiB to fit twenty full Thai questions. Existing rooms keep their original questions.
- Host selects 10, 20, 30 or 60 seconds. Every question starts after a shared four-second countdown.
- Correct answer: `round(1000 - 500 × elapsed / duration)`. Incorrect/unanswered: zero. Ties: more correct answers, then less time on correct answers, then join time and stable player ID.
- Reveal, vote distribution, top five between rounds, final podium/full results and UTF-8 CSV export.
- Round scores count up from the previous result before rows cross into their new ranks; incoming and outgoing top-five players animate together. Motion is disabled when the device requests reduced motion.
- The avatar picker shows one selected card with left/right arrows and a shuffle button. Shuffle always chooses a different appearance; animal names and the large gallery are omitted.
- The picker uses the round face images, prepares the next random choice and neighboring images, and keeps a bounded cache of twelve decoded previews. The visible card stays in place until the requested image is decoded, then two layers crossfade for 180 ms. Rapid taps honor only the latest selection; a failed load preserves the previous selection and remains retryable. The original TeamBook images remain unchanged.
- Names lead in the lobby, waiting screen, leaderboard and podium; round animal faces sit beside each name. The TeamBook paper-and-clover theme includes a green invitation panel, an orbiting countdown, staggered answer entrances, answer celebration, round progress and a rising final podium. New lobby arrivals animate without replaying every existing player's entrance. Reduced motion applies to all these effects.
- Thirteen synthesized arcade SFX cover controls, joins, 3–2–1, question start, the final five seconds, timeout, answer lock, correct/wrong answers, reveal, leaderboard, overtakes and the final fanfare. Host sound starts after a browser user gesture unless muted; players default to silent. The host header provides a speaker toggle, volume slider and test button, with saved preferences. No audio files, external services or autoplay bypasses are used. Round sounds are scheduled once on the audio clock, cancel on early reveal/mute, and skip past cues when enabling mid-round or returning from slides. Volume uses a master gain and compressor.
- Refresh restores the host/player session in the same browser. Repeated joins and answers are idempotent. The first accepted answer is final.

## Server

The limit was raised from 100 to 200 on 2026-11-26: the SQL function is now `mc_quiz_command_v2`, and a one-time, re-runnable `DO` block widens the old `player_count` CHECK on existing tables.

`api/quiz.js` uses the existing `DATABASE_URL` and Neon driver. It creates only the namespaced `mc_quiz_*` tables/function in `api/_lib/quiz/schema.js`. No new service or environment variable is required. Production does **not** fall back to process memory.

The database clock decides the deadline and score. Room commands use row locks, and concurrent answers hold compatible share locks. A unique answer key prevents scoring twice. Host commands require a hashed random host token and expected state version. Tokens are never included in public state, QR links or exports. The client cannot choose its points or elapsed time.

Room state is public to people who know the code, including chosen display names, avatars and revealed scores. Answer keys, votes, earned points and rank changes stay hidden until reveal. State responses use a one-second Vercel CDN cache to share polling across 200 players. Clock synchronization and private actions are uncached. Public rooms expire after 12 hours; no account data is touched. Host creation is limited to ten rooms per IP/hour.

XLSX parsing lazily loads the vendored official SheetJS Community Edition 0.20.3 mini build inside the local import worker. Runtime import does not depend on an external CDN. Source, license, checksum and the small ESM-export adaptation are documented in `vendor/README.sheetjs.md` and `vendor/LICENSE.sheetjs`. Workers are terminated on completion, cancellation, file changes or leaving the creator, with a 20-second timeout. CSV decoding and validation use the shared local importer without loading SheetJS.

SQL and memory repositories are separate. Memory exists only for an explicitly injected local preview/test. `tests/quiz/postgres.sql` validates the actual PostgreSQL function on an isolated branch. Do not run the fixture on production.

## Validation and local preview

```sh
node --test tests/quiz/*.test.mjs
node tests/quiz/preview.mjs
```

Preview: `http://127.0.0.1:4199/quiz/` and `/quiz/host/`. Preview is loopback-only and isolated from production.

The API suite simulates 200 simultaneous clients across a neutral 12-question fixture and custom 5- and 20-question games (7,400 answers total), rejects player 201, and checks timing, ownership, retries, draft restoration, content validation and score privacy. Additional tests cover host-written question scoring, draft persistence, rejection of rooms without questions, old avatar IDs, bounded audio envelopes, round scheduling, cancellation, mute and autoplay retry. Import tests read real compressed XLSX binaries with the deployed parser, handle headers/no headers/partial headers, multiple sheets, formatted numbers, CSV quoting/encodings and malformed rows, and verify correct-answer shuffling. The import controller test covers review/apply/cancel, stale file results and HTML escaping. These are functional tests, not measurements of 100 real devices, browser frame rate or event-speaker audio quality.

QR code generator: Kazuhiko Arase, MIT license, vendored from `kazuhikoarase/qrcode-generator/js/dist/qrcode.js`; its original header is retained. The local ESM export is the only adaptation.
