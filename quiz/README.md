# Clover Quiz

Live multiplayer quiz for `/quiz/`; host screen at `/quiz/host/`.

- Up to 100 players per room; numeric six-digit room code and locally generated QR.
- Guest nicknames and 68 existing Rare TeamBook appearances. No membership or collectible ownership changes.
- **ครบรอบ 20 ปี**: twelve Clover questions imported from the supplied `คำถาม kahoot-2.xlsx`. Column B is labeled the correct answer.
- **ตั้งคำถามเอง**: enter a question count from 5 to 20, then use numbered navigation to write each question and four choices. The first choice is the correct answer. Both modes independently shuffle choices once per room, keeping that order for everyone.
- Custom drafts stay in this browser's local storage, including hidden questions when the count is reduced. Drafts are sent to the server only when creating a room. Question text is limited to 240 characters; each of the four distinct choices to 100. The server validates every set and ignores submitted answer indexes and IDs. The API body limit is 96 KiB to fit twenty full Thai questions.
- Host selects 10, 20, 30 or 60 seconds. Every question starts after a shared four-second countdown.
- Correct answer: `round(1000 - 500 × elapsed / duration)`. Incorrect/unanswered: zero. Ties: more correct answers, then less time on correct answers, then join time and stable player ID.
- Reveal, vote distribution, top five between rounds, final podium/full results and UTF-8 CSV export.
- Round scores count up from the previous result before rows cross into their new ranks; incoming and outgoing top-five players animate together. Motion is disabled when the device requests reduced motion.
- The avatar picker shows one selected card with left/right arrows and a shuffle button. Shuffle always chooses a different appearance; animal names and the large gallery are omitted.
- The picker uses 252×352 JPEG previews of the Rare art, prepares the next random choice and neighboring images, and keeps a bounded cache of twelve decoded previews. The visible card stays in place until the requested image is decoded, then two layers crossfade for 180 ms. Rapid taps honor only the latest selection; a failed load preserves the previous selection and remains retryable. The original TeamBook images remain unchanged.
- The TeamBook paper-and-clover theme includes floating cards, a green invitation panel, an orbiting countdown, staggered answer entrances, answer celebration, round progress, and a rising final podium. New lobby arrivals animate without replaying every existing player's entrance. Reduced motion applies to all these effects.
- Refresh restores the host/player session in the same browser. Repeated joins and answers are idempotent. The first accepted answer is final.

## Server

`api/quiz.js` uses the existing `DATABASE_URL` and Neon driver. It creates only the namespaced `mc_quiz_*` tables/function in `api/_lib/quiz/schema.js`. No new service or environment variable is required. Production does **not** fall back to process memory.

The database clock decides the deadline and score. Room commands use row locks, and concurrent answers hold compatible share locks. A unique answer key prevents scoring twice. Host commands require a hashed random host token and expected state version. Tokens are never included in public state, QR links or exports. The client cannot choose its points or elapsed time.

Room state is public to people who know the code, including chosen display names, avatars and revealed scores. Answer keys, votes, earned points and rank changes stay hidden until reveal. State responses use a one-second Vercel CDN cache to share polling across 100 players. Clock synchronization and private actions are uncached. Public rooms expire after 12 hours; no account data is touched. Host creation is limited to ten rooms per IP/hour.

SQL and memory repositories are separate. Memory exists only for an explicitly injected local preview/test. `tests/quiz/postgres.sql` validates the actual PostgreSQL function on an isolated branch. Do not run the fixture on production.

## Validation and local preview

```sh
node --test tests/quiz/*.test.mjs
node tests/quiz/preview.mjs
```

Preview: `http://127.0.0.1:4199/quiz/` and `/quiz/host/`. Preview is loopback-only and isolated from production.

The API suite simulates 100 simultaneous clients across the original 12 questions and custom 5- and 20-question games (3,700 answers total), rejects player 101, and checks timing, ownership, retries, draft restoration, content validation and score privacy. This is a functional capacity test, not a measurement of 100 real devices on an event Wi-Fi network.

QR code generator: Kazuhiko Arase, MIT license, vendored from `kazuhikoarase/qrcode-generator/js/dist/qrcode.js`; its original header is retained. The local ESM export is the only adaptation.
