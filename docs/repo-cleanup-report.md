# รายงานแปลงภาพและเก็บกวาด repo หลัก

วันที่ 9 กันยายน 2026 — แก้ใน `/Users/Teem/Sanchuan/Git/Teem` ตามคำขอล่าสุด

**สถานะ Git:** checkout หลักยังอยู่บน `feat/adaptive-front-door-v1` ที่ `fdadc4974964533de17f2217f065c28361417897` ไม่ได้สลับ branch, commit, merge, push หรือ deploy และยังไม่ได้ปรับ ref ของ `main` งาน Front Door/XIRCLE ที่มีอยู่และรายการ staged เดิมถูกเก็บไว้ครบ จึงไม่ได้ทำให้ `git status` ว่างโดยทิ้งงานเดิม

## สิ่งที่ทำ

- นำ WebP ที่ผ่านการตรวจแล้ว 40 ไฟล์และการแก้ consumer 16 ไฟล์จาก worktree `Teem-assets` มาไว้ใน repo หลัก ตรวจว่า consumer ทั้งหมดตรงกับฐานก่อนคัดลอก ไม่มีไฟล์ปลายทางชน และ source hashes ไม่เปลี่ยน ไม่ได้แก้ worktree `Teem-assets` ในรอบนี้
- เอาสำเนาภาพที่อัปโหลดผิดตำแหน่งและผลทดสอบออกจากราก repo รวม **5 ไฟล์ / 2,219,581 bytes (2.22 MB)** สำรองไว้ข้างนอก repo ก่อนเอาออก
- เพิ่ม ignore แบบเจาะจงสำหรับ `/e2e-result*.png`, `/test-results/`, `/playwright-report/`, `/coverage/` ไม่ใช้กฎ ignore ภาพทั้งหมด
- ไม่ลบ asset สำรอง, masters, originals ของภาพที่แปลง, โลโก้, favicon, Apple/PWA icons หรือ social assets

## ไฟล์ที่เอาออกจากราก repo

| ไฟล์ | Bytes | หลักฐานและสิ่งที่เก็บไว้ |
|---|---:|---|
| `activity-create.webp` | 393,410 | สำเนาตรงกันทุกไบต์ยังอยู่ใน `teambook/assets/art/activities/` และ `xty/assets/art/activities/` |
| `activity-enjoy-food.webp` | 455,970 | สำเนาตรงกันทุกไบต์ยังอยู่ใน `teambook/assets/art/activities/` และ `xty/assets/art/activities/` |
| `activity-project.webp` | 505,106 | สำเนาตรงกันทุกไบต์ยังอยู่ใน `teambook/assets/art/activities/` และ `xty/assets/art/activities/` |
| `activity-trade.webp` | 476,626 | สำเนาตรงกันทุกไบต์ยังอยู่ใน `teambook/assets/art/activities/` และ `xty/assets/art/activities/` |
| `e2e-result.png` | 388,469 | ภาพ screenshot ของหน้า CORE7 จากงาน E2E; ตรวจภาพและประวัติ Git แล้ว ไม่มี consumer ของเว็บที่พบ |

ภาพกิจกรรมทั้ง 4 ไฟล์ถูกเพิ่มด้วย commit `c19902c1` (“Add files via upload”) ซึ่งเพิ่มเฉพาะสำเนาที่ราก ตัวสร้าง URL ใน `teambook/_shared/activities.js` ใช้ `/assets/art/activities/activity-${id}.webp` ภายใต้ TeamBook deployment root และฝั่ง XTY ใช้ `/xty/assets/art/activities/activity-${id}.webp` ตรวจ module จริงใน browser และ response hashes แล้วทั้ง 8 เส้นทางถูกต้อง จึงไม่ได้ตัดสินจากผลค้นหาเป็นศูนย์เพียงอย่างเดียว

สำรองไฟล์ที่เอาออกและ consumer ก่อนแก้: [Teem-cleanup-backup-20260909](/Users/Teem/Sanchuan/Git/Teem-cleanup-backup-20260909) — อยู่ภายนอก repo และสามารถใช้ย้อนกลับเป็นรายไฟล์ได้ ไม่ต้อง reset งานอื่น

## สิ่งที่ยังเก็บไว้

- Asset สำรองและภาพที่ usage/ownership ยังไม่ชัดเจนทั้งหมด รวมถึง `.forge-src/`, `forge/original/`, ภาพสำรองใน `img/`, XIRCLE และ TeamBook/XTY
- `.tmp/classroom-hero/chunk00.b64` และ `part00.b64` รวม 30,036 bytes เป็นชิ้นส่วนอัปโหลดที่ยังมี workflow อ้างอยู่ จึงคงไว้ก่อนตามคำขอที่ยอมเก็บ asset สำรอง ไม่ได้ปิด workflow หรือย้าย source โดยอนุมานเอง
- `captures/index.html` เป็นหน้า Capture Library ที่ Command Center และ Keen ลิงก์ใช้งานจริง ไม่ใช่โฟลเดอร์ screenshot ทิ้งได้

## ผลด้านขนาด

- ภาพที่แปลง 40 รายการ: **35,760,730 → 25,358,900 bytes** ประหยัด **10,401,830 bytes (29.09%)** เมื่อโหลดอย่างละหนึ่งครั้ง ไม่ใช่การอ้างว่าทุก page view ลดเท่ากัน
- การลบไฟล์รากลดชุดไฟล์ checkout/deploy 2,219,581 bytes แต่ไม่ใช่ delivery saving เพิ่มจาก request ของผู้ใช้ที่ยืนยันได้ เพราะเป็นสำเนาที่ไม่ได้ถูกใช้ในเส้นทางที่ตรวจ
- เพราะยังเก็บ originals ไว้ การเพิ่ม derivatives แล้วลบขยะทำให้ไฟล์ภาพใน checkout เพิ่มสุทธิ 23,139,319 bytes บวกเอกสาร/สคริปต์เล็กน้อย **Git history ไม่ลดลง** และไม่มีการ rewrite history

## การตรวจใน repo หลัก

- Chrome 152.0.7977.83: **15 หน้า × desktop/mobile = 30 page checks**; desktop 1440×1000 DPR 1, mobile emulation 390×844 DPR 3 ไม่พบภาพ derivative โหลดเสียหรือ page error ในรอบนี้
- **87 URL checks ผ่าน**: HTTP 200, `image/webp`, response SHA-256 ตรงกับไฟล์ที่ตรวจแล้ว และ browser decode ได้ dimensions เดิม รวม query strings และ fragments
- **8 canonical activity requests ผ่าน**: import ตัวสร้าง URL จริงของ TeamBook/XTY แล้วเรียกภาพทั้ง 4 กิจกรรมใน deployment root ที่ถูกต้อง ทุก response มี SHA-256 ตรงกับสำเนาที่เอาออก
- ราก URL ของไฟล์ที่เอาออกทั้ง 5 รายการคืน 404 บน local static preview; canonical paths ยังคืนภาพเดิม ไม่ใช่ fallback HTML
- ตรวจ ignore rules, `git diff --check`, syntax ของ `collection/collection.js`, source/derivative hashes, metadata, alpha และ consumer references
- ก่อนเริ่มนำเข้า บันทึก hashes ของไฟล์ทั้งหมดและ staged diff เดิมไว้ หลังนำเข้าไม่มีการเปลี่ยนไฟล์นอก allowlist ของงานนี้ และ staged diff เดิมยังตรงกันทุกไบต์
- ขอบเขต: local static preview; external network blocked, API disabled, ไม่มี physical-device / Safari / CDN / production verification การตรวจเต็มชุดเดิมที่ worktree ได้ 190 pass / 20 baseline failures เท่ากับ clean main ไม่ได้อ้างว่าเป็นผลการรัน unit suite ใหม่บน checkout หลักที่มีงานค้าง

หลักฐานรอบ repo หลัก: [ผล request และ page checks](/Users/Teem/Sanchuan/Git/Teem-cleanup-backup-20260909/qa/results.json), [Classroom mobile](/Users/Teem/Sanchuan/Git/Teem-cleanup-backup-20260909/qa/classroom-mobile.png), [Guild desktop](/Users/Teem/Sanchuan/Git/Teem-cleanup-backup-20260909/qa/guild-desktop.png).
หลักฐานเปรียบเทียบคุณภาพก่อน/หลังทั้ง 40 ภาพและรายชื่อ deferral เดิม: [รายงานรอบ worktree](/Users/Teem/Sanchuan/Git/Teem-assets/docs/asset-optimization-report.md).

## การปรับ consumer หลังพัฒนาทางเรียน — 10 กันยายน 2026

การตรวจซ้ำพบ consumer เดิมเลิกใช้ภาพ `classroom/img/hero-classroom.webp` อย่างตั้งใจ 2 จุด:

- `classroom/index.html`: ภาพเปิดหน้าเปลี่ยนเป็นภาพทีมที่ `/frontdoor/art/seed-blue-teem-v2.webp` เพื่อเชื่อมจาก Front Door เข้าห้องเรียน ส่วนภาพ JPG เดิมยังเป็น social metadata ตามข้อยกเว้นเดิม
- `classroom/sauce-cup/index.html`: ภาพประกอบลิงก์ท้ายบทถูกแทนด้วยปุ่มไปลงมือ `/classroom/free-ai.html` โดยตรง ไม่มีภาพ hero เดิมในหน้านี้แล้ว

จึงเก็บรายการ conversion และ relink เดิมเป็นประวัติทุกค่า เพิ่ม `consumer_retirements` เฉพาะสอง consumer/URL นี้ ตัวตรวจต้องพบภาพหรือปุ่มทดแทนใน element จริง และไฟล์ปลายทางต้องอยู่ใน repo ภาพเก่าต้องไม่กลับมาใช้อีกโดยเงียบ ๆ ไม่ยกเว้นการตรวจ source/derivative hashes, metadata, alpha, dimensions, คุณภาพ หรือ HTTP ของ asset ที่เลิกใช้ ทั้ง original และ WebP ยังคงอยู่ ไม่แก้ pixels

ผลตรวจรอบนี้: **40 originals/derivatives ผ่านครบ, 2 retired uses มีหลักฐานตรง, 87 HTTP responses ผ่าน** จาก static server ชั่วคราวที่เปิดจาก repo นี้บนพอร์ตว่างและปิดแล้วหลังจบ ทั้ง query/fragment, MIME และ response bytes ถูกตรวจเหมือนเดิม ตรวจกรณีผิดอีก 5 แบบแล้วต้องไม่ผ่าน: ไม่มีเหตุผล, ภาพเก่ากลับมาใช้, element ทดแทนหาย, ใช้ element ชนิดอื่น, หรือเป้าหมายอยู่นอก repo ส่วน preview `127.0.0.1:4174` ตอบ 404 ที่ `/guild/assets/hero-card.webp` จึงไม่อ้างว่ารอบนี้ยืนยันการส่ง asset ทุกห้องผ่าน preview ตัวนั้นแล้ว ไม่เปลี่ยน server หรือ routing เพื่อให้ตรวจผ่าน

ตารางด้านล่างบันทึก consumer ณ วันที่แปลงภาพ 9 กันยายน การเปลี่ยนแปลงที่ยืนยันแล้วมีเฉพาะสองจุดข้างต้น

## ภาพที่แปลงและ consumer

| Original → WebP | Old bytes | New bytes | Consumer |
|---|---:|---:|---|
| `guild/assets/hero-card.png` → `guild/assets/hero-card.webp` | 3,214,157 | 2,300,106 | `guild/index.html` |
| `guild/assets/hero-card-aura.png` → `guild/assets/hero-card-aura.webp` | 2,571,314 | 1,806,810 | `guild/index.html` |
| `guild/assets/chest-light.png` → `guild/assets/chest-light.webp` | 2,523,458 | 1,814,034 | `guild/index.html` |
| `guild/assets/coin-splash.png` → `guild/assets/coin-splash.webp` | 2,500,442 | 1,851,280 | `guild/index.html` |
| `guild/assets/treasure-chest.png` → `guild/assets/treasure-chest.webp` | 2,473,903 | 1,706,092 | `guild/index.html` |
| `guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.png` → `guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.webp` | 2,012,475 | 1,595,866 | `guild/index.html` |
| `guild/assets/dungeon-key.png` → `guild/assets/dungeon-key.webp` | 1,816,932 | 1,186,104 | `guild/index.html` |
| `guild/assets/extras/golden_emerald_magical_light_sweep.png` → `guild/assets/extras/golden_emerald_magical_light_sweep.webp` | 1,668,909 | 1,127,448 | `guild/index.html` |
| `guild/assets/spark-x.png` → `guild/assets/spark-x.webp` | 1,632,342 | 1,016,530 | `guild/index.html` |
| `classroom/img/hero-classroom.jpg` → `classroom/img/hero-classroom.webp` | 963,682 | 703,022 | `classroom/index.html`, `classroom/sauce-cup/index.html` |
| `ako/assets/xircle-routine-orbs-sprite.png` → `ako/assets/xircle-routine-orbs-sprite.webp` | 796,146 | 563,820 | `ako/ako.css` |
| `img/achievement-hero-guild-x.jpg` → `img/achievement-hero-guild-x.webp` | 672,449 | 523,384 | `collection/collection.js` |
| `img/core7-achievement-07-full-collection.jpeg` → `img/core7-achievement-07-full-collection.webp` | 636,774 | 462,816 | `collection/collection.js` |
| `img/core7-achievement-05-first-set.jpeg` → `img/core7-achievement-05-first-set.webp` | 614,217 | 472,376 | `collection/collection.js` |
| `img/classroom-kitchen-20260812-1445/lv3-cook.jpeg` → `img/classroom-kitchen-20260812-1445/lv3-cook.webp` | 579,840 | 451,312 | `collection/collection.js`, `classroom/index.html` |
| `img/classroom-kitchen-20260812-1445/lv4-split.jpeg` → `img/classroom-kitchen-20260812-1445/lv4-split.webp` | 565,784 | 436,790 | `collection/collection.js`, `classroom/index.html` |
| `img/classroom-kitchen-20260812-1445/lv5-season.jpeg` → `img/classroom-kitchen-20260812-1445/lv5-season.webp` | 563,539 | 448,222 | `collection/collection.js`, `classroom/index.html` |
| `img/core7-achievement-03-first-victory.jpeg` → `img/core7-achievement-03-first-victory.webp` | 554,144 | 421,784 | `collection/collection.js` |
| `img/classroom-kitchen-20260812-1445/lv1-source.jpeg` → `img/classroom-kitchen-20260812-1445/lv1-source.webp` | 543,088 | 424,620 | `collection/collection.js`, `classroom/index.html` |
| `img/classroom-kitchen-20260812-1445/lv2-taste.jpeg` → `img/classroom-kitchen-20260812-1445/lv2-taste.webp` | 537,461 | 418,466 | `collection/collection.js`, `classroom/index.html` |
| `img/classroom-kitchen-20260812-1445/lv6-serve-steak.jpeg` → `img/classroom-kitchen-20260812-1445/lv6-serve-steak.webp` | 535,238 | 417,584 | `collection/collection.js`, `classroom/index.html` |
| `img/core7-achievement-04-first-friend-match.jpeg` → `img/core7-achievement-04-first-friend-match.webp` | 520,819 | 396,204 | `collection/collection.js` |
| `img/core7-achievement-06-first-hand.jpeg` → `img/core7-achievement-06-first-hand.webp` | 504,021 | 376,218 | `collection/collection.js` |
| `img/core7-achievement-01-victory-wheel.jpeg` → `img/core7-achievement-01-victory-wheel.webp` | 480,293 | 353,604 | `collection/collection.js` |
| `classroom/img/header-lesson5.jpeg` → `classroom/img/header-lesson5.webp` | 464,569 | 321,630 | `classroom/prompts.html` |
| `ako/assets/ako-xvisor-ep07-snacking-hunger-poster.png` → `ako/assets/ako-xvisor-ep07-snacking-hunger-poster.webp` | 460,537 | 240,554 | `ako/index.html`, `ako/story/index.html` |
| `img/core7-achievement-02-first-match.jpeg` → `img/core7-achievement-02-first-match.webp` | 459,774 | 358,232 | `collection/collection.js` |
| `ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.png` → `ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.webp` | 454,499 | 240,080 | `ako/index.html`, `ako/story/index.html` |
| `classroom/img/header-lesson2.jpeg` → `classroom/img/header-lesson2.webp` | 451,053 | 313,514 | `classroom/image-ai.html` |
| `classroom/img/header-lesson6.jpeg` → `classroom/img/header-lesson6.webp` | 447,989 | 306,690 | `classroom/first-web.html` |
| `classroom/sauce-cup/header-prologue.jpeg` → `classroom/sauce-cup/header-prologue.webp` | 445,505 | 299,770 | `classroom/sauce-cup/index.html` |
| `classroom/img/header-lesson3.jpeg` → `classroom/img/header-lesson3.webp` | 437,984 | 301,636 | `classroom/clip-ai.html` |
| `classroom/img/header-lesson0.jpeg` → `classroom/img/header-lesson0.webp` | 410,316 | 273,070 | `classroom/lesson-0.html` |
| `img/hall-why.jpg` → `img/hall-why.webp` | 400,912 | 306,274 | `hall.html` |
| `classroom/img/header-lesson1.jpeg` → `classroom/img/header-lesson1.webp` | 400,407 | 272,442 | `classroom/free-ai.html` |
| `img/hall-classroom.jpg` → `img/hall-classroom.webp` | 395,370 | 288,444 | `hall.html`, `resume/index.html` |
| `classroom/img/header-lesson4.jpeg` → `classroom/img/header-lesson4.webp` | 389,925 | 258,940 | `classroom/notebooklm.html` |
| `ako/assets/ako-xvisor-ep06-no-starving-poster.png` → `ako/assets/ako-xvisor-ep06-no-starving-poster.webp` | 356,388 | 185,108 | `ako/index.html`, `ako/story/index.html` |
| `img/lv4/gemini-notebook-studio.png` → `img/lv4/gemini-notebook-studio.webp` | 225,234 | 60,056 | `classroom/notebooklm.html` |
| `ako/assets/ako-real-eating-onion-hero-poster.jpg` → `ako/assets/ako-real-eating-onion-hero-poster.webp` | 78,841 | 57,968 | `ako/index.html` |

## ตรวจซ้ำ

ต้องมี Python 3.10+ และ Pillow ที่รองรับ WebP คำสั่งแรกไม่ต้องเปิด server คำสั่งที่สองใช้ URL ของ local preview ที่เปิดอยู่:

```sh
python3 scripts/verify-repo-assets.py
python3 scripts/verify-repo-assets.py --base-url http://127.0.0.1:8879
```

ก่อนรวมเข้า main ให้ fetch ล่าสุดและตรวจ conflict/งาน Front Door-XIRCLE อีกครั้ง ชุดการแปลงกับการ relink ต้องไปด้วยกัน ห้าม cherry-pick เฉพาะภาพหรือเฉพาะ HTML/JS

## Diff เฉพาะงานนี้

สรุปด้วย temporary index เพื่อแสดงไฟล์ใหม่ด้วย โดยไม่เปลี่ยน index หรือ staged work ของผู้ใช้ ไม่รวมงาน Front Door/XIRCLE เดิม

```text
 .gitignore                                         |    6 +
 activity-create.webp                               |  Bin 393410 -> 0 bytes
 activity-enjoy-food.webp                           |  Bin 455970 -> 0 bytes
 activity-project.webp                              |  Bin 505106 -> 0 bytes
 activity-trade.webp                                |  Bin 476626 -> 0 bytes
 ako/ako.css                                        |    2 +-
 ako/assets/ako-real-eating-onion-hero-poster.webp  |  Bin 0 -> 57968 bytes
 .../ako-xvisor-ep04-otaku-weight-loss-poster.webp  |  Bin 0 -> 240080 bytes
 ako/assets/ako-xvisor-ep06-no-starving-poster.webp |  Bin 0 -> 185108 bytes
 .../ako-xvisor-ep07-snacking-hunger-poster.webp    |  Bin 0 -> 240554 bytes
 ako/assets/xircle-routine-orbs-sprite.webp         |  Bin 0 -> 563820 bytes
 ako/index.html                                     |    8 +-
 ako/story/index.html                               |    6 +-
 classroom/clip-ai.html                             |    2 +-
 classroom/first-web.html                           |    2 +-
 classroom/free-ai.html                             |    2 +-
 classroom/image-ai.html                            |    2 +-
 classroom/img/header-lesson0.webp                  |  Bin 0 -> 273070 bytes
 classroom/img/header-lesson1.webp                  |  Bin 0 -> 272442 bytes
 classroom/img/header-lesson2.webp                  |  Bin 0 -> 313514 bytes
 classroom/img/header-lesson3.webp                  |  Bin 0 -> 301636 bytes
 classroom/img/header-lesson4.webp                  |  Bin 0 -> 258940 bytes
 classroom/img/header-lesson5.webp                  |  Bin 0 -> 321630 bytes
 classroom/img/header-lesson6.webp                  |  Bin 0 -> 306690 bytes
 classroom/img/hero-classroom.webp                  |  Bin 0 -> 703022 bytes
 classroom/index.html                               |   14 +-
 classroom/lesson-0.html                            |    2 +-
 classroom/notebooklm.html                          |    4 +-
 classroom/prompts.html                             |    2 +-
 classroom/sauce-cup/header-prologue.webp           |  Bin 0 -> 299770 bytes
 classroom/sauce-cup/index.html                     |    4 +-
 collection/collection.js                           |   18 +-
 docs/repo-cleanup-report.md                        | 1483 ++++++++++++++++++++
 e2e-result.png                                     |  Bin 388469 -> 0 bytes
 guild/assets/chest-light.webp                      |  Bin 0 -> 1814034 bytes
 guild/assets/coin-splash.webp                      |  Bin 0 -> 1851280 bytes
 guild/assets/dungeon-key.webp                      |  Bin 0 -> 1186104 bytes
 .../extras/golden_emerald_magical_light_sweep.webp |  Bin 0 -> 1127448 bytes
 .../ornate_emerald_gold_fantasy_frame_glow.webp    |  Bin 0 -> 1595866 bytes
 guild/assets/hero-card-aura.webp                   |  Bin 0 -> 1806810 bytes
 guild/assets/hero-card.webp                        |  Bin 0 -> 2300106 bytes
 guild/assets/spark-x.webp                          |  Bin 0 -> 1016530 bytes
 guild/assets/treasure-chest.webp                   |  Bin 0 -> 1706092 bytes
 guild/index.html                                   |   10 +-
 hall.html                                          |    4 +-
 img/achievement-hero-guild-x.webp                  |  Bin 0 -> 523384 bytes
 .../lv1-source.webp                                |  Bin 0 -> 424620 bytes
 img/classroom-kitchen-20260812-1445/lv2-taste.webp |  Bin 0 -> 418466 bytes
 img/classroom-kitchen-20260812-1445/lv3-cook.webp  |  Bin 0 -> 451312 bytes
 img/classroom-kitchen-20260812-1445/lv4-split.webp |  Bin 0 -> 436790 bytes
 .../lv5-season.webp                                |  Bin 0 -> 448222 bytes
 .../lv6-serve-steak.webp                           |  Bin 0 -> 417584 bytes
 img/core7-achievement-01-victory-wheel.webp        |  Bin 0 -> 353604 bytes
 img/core7-achievement-02-first-match.webp          |  Bin 0 -> 358232 bytes
 img/core7-achievement-03-first-victory.webp        |  Bin 0 -> 421784 bytes
 img/core7-achievement-04-first-friend-match.webp   |  Bin 0 -> 396204 bytes
 img/core7-achievement-05-first-set.webp            |  Bin 0 -> 472376 bytes
 img/core7-achievement-06-first-hand.webp           |  Bin 0 -> 376218 bytes
 img/core7-achievement-07-full-collection.webp      |  Bin 0 -> 462816 bytes
 img/hall-classroom.webp                            |  Bin 0 -> 288444 bytes
 img/hall-why.webp                                  |  Bin 0 -> 306274 bytes
 img/lv4/gemini-notebook-studio.webp                |  Bin 0 -> 60056 bytes
 resume/index.html                                  |    2 +-
 scripts/verify-repo-assets.py                      |  109 ++
 64 files changed, 1640 insertions(+), 42 deletions(-)
```

<!-- ASSET_MANIFEST_START -->
```json
{
  "schema": 1,
  "base": "85f5b2ac13dae3757786403f514e90e40a72434b",
  "consumer_retirements": [
    {
      "asset": "classroom/img/hero-classroom.webp",
      "consumer": "classroom/index.html",
      "new_url": "/classroom/img/hero-classroom.webp",
      "reason": "The learning gateway now shows the reference-based Teem workshop image instead of the old generic classroom hero. The original JPG remains only in social metadata.",
      "current_element": {
        "tag": "img",
        "attribute": "src",
        "url": "/frontdoor/art/seed-blue-teem-v2.webp"
      }
    },
    {
      "asset": "classroom/img/hero-classroom.webp",
      "consumer": "classroom/sauce-cup/index.html",
      "new_url": "https://www.myclover.com/classroom/img/hero-classroom.webp",
      "reason": "The closing image link was deliberately replaced with a direct first-lesson action, shortening the learning journey without an intermediate image or page.",
      "current_element": {
        "tag": "a",
        "attribute": "href",
        "url": "/classroom/free-ai.html"
      }
    }
  ],
  "conversions": [
    {
      "old": "guild/assets/hero-card.png",
      "new": "guild/assets/hero-card.webp",
      "old_bytes": 3214157,
      "new_bytes": 2300106,
      "saved_bytes": 914051,
      "dimensions": [
        1024,
        1536
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "ec4ec850e161414ae3007756707aeeaafe2906436e84a15dc17d17ab3a149e6d",
      "new_sha256": "b8d6f93c9387db08adb057ac32661ba23ceb51f2cc4da96acdce4d0cae710faa",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 27,
              "old_url": "assets/hero-card.png",
              "new_url": "assets/hero-card.webp"
            },
            {
              "line": 27,
              "old_url": "assets/hero-card.png",
              "new_url": "assets/hero-card.webp"
            },
            {
              "line": 87,
              "old_url": "/guild/assets/hero-card.png",
              "new_url": "/guild/assets/hero-card.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/hero-card-aura.png",
      "new": "guild/assets/hero-card-aura.webp",
      "old_bytes": 2571314,
      "new_bytes": 1806810,
      "saved_bytes": 764504,
      "dimensions": [
        1024,
        1536
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "3e183d16957ac111ccb3c9564b5403ee9e3708bb8959257d868fea597a63331d",
      "new_sha256": "cb4b28fbfba98752d2f7064ebb63565fd9ad6525c4f6811d359d8f8a2905848e",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 87,
              "old_url": "/guild/assets/hero-card-aura.png",
              "new_url": "/guild/assets/hero-card-aura.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/chest-light.png",
      "new": "guild/assets/chest-light.webp",
      "old_bytes": 2523458,
      "new_bytes": 1814034,
      "saved_bytes": 709424,
      "dimensions": [
        1536,
        1024
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "84008290641ab5cf0c047135f676757aa12895de354f691a8db07c57a8380415",
      "new_sha256": "8ed03bb4c1909d396e934ac1b5973e0dd26835f436f9804711f6ca8f7359f76b",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 89,
              "old_url": "/guild/assets/chest-light.png",
              "new_url": "/guild/assets/chest-light.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/coin-splash.png",
      "new": "guild/assets/coin-splash.webp",
      "old_bytes": 2500442,
      "new_bytes": 1851280,
      "saved_bytes": 649162,
      "dimensions": [
        1536,
        1024
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "fe5153ad1959377ae5f08caecdccf9475ab1f08998b2afbae5a4fa1922ce4066",
      "new_sha256": "5c07d6de9980e09c0012122c716c1868bb3ea73d916d7c9c459e1f1e5652bb83",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 89,
              "old_url": "/guild/assets/coin-splash.png",
              "new_url": "/guild/assets/coin-splash.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/treasure-chest.png",
      "new": "guild/assets/treasure-chest.webp",
      "old_bytes": 2473903,
      "new_bytes": 1706092,
      "saved_bytes": 767811,
      "dimensions": [
        1536,
        1024
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "2e08908444b38ae16ed3cf6d3f6000da76a8b9e92c7e5b14ea5eda33257e296d",
      "new_sha256": "09094de529f0bec838a99d67a673d220ba7b4efec30a99b82a01da004a1727db",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 89,
              "old_url": "/guild/assets/treasure-chest.png",
              "new_url": "/guild/assets/treasure-chest.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.png",
      "new": "guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.webp",
      "old_bytes": 2012475,
      "new_bytes": 1595866,
      "saved_bytes": 416609,
      "dimensions": [
        1254,
        1254
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "bb57a2c61adc0b8837c20a9faa025fe9f53e9b1d1a2d0db25ad38d45b9a9abc5",
      "new_sha256": "4cdc75c29e646f383bf8bda2f68274f07ba1d16046ad47f4d7bf2f411c6effb6",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 87,
              "old_url": "/guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.png",
              "new_url": "/guild/assets/extras/ornate_emerald_gold_fantasy_frame_glow.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/dungeon-key.png",
      "new": "guild/assets/dungeon-key.webp",
      "old_bytes": 1816932,
      "new_bytes": 1186104,
      "saved_bytes": 630828,
      "dimensions": [
        1024,
        1536
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "4b4cac5b185ea42c619dc8c062fee143110654f0783ac744a385ca4acaab9447",
      "new_sha256": "b37f4c314d94ca6c44671b3f3505c2968741ca872066d26b3eb1f59919711f47",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 89,
              "old_url": "/guild/assets/dungeon-key.png",
              "new_url": "/guild/assets/dungeon-key.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/extras/golden_emerald_magical_light_sweep.png",
      "new": "guild/assets/extras/golden_emerald_magical_light_sweep.webp",
      "old_bytes": 1668909,
      "new_bytes": 1127448,
      "saved_bytes": 541461,
      "dimensions": [
        1536,
        1024
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "585e0d176f0a3a7d7cf2957c14dcf4adfc0b3eecf4fa8a1d0bddf347c80dffc6",
      "new_sha256": "8ed0d9aef2b8947b1b52772f20e7b83b7c0fafbb38fe2a898f506216b3d130e3",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 75,
              "old_url": "/guild/assets/extras/golden_emerald_magical_light_sweep.png",
              "new_url": "/guild/assets/extras/golden_emerald_magical_light_sweep.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "guild/assets/spark-x.png",
      "new": "guild/assets/spark-x.webp",
      "old_bytes": 1632342,
      "new_bytes": 1016530,
      "saved_bytes": 615812,
      "dimensions": [
        1536,
        1024
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "d85f8dbf02dd62e716fdb795d395c3e95a74946cfa17001e1303bfa51a0b3a5a",
      "new_sha256": "6046b67d6f794626ab711896a40efc219050feb269fc0652b246269cbc02913f",
      "updates": [
        {
          "consumer": "guild/index.html",
          "replacements": [
            {
              "line": 76,
              "old_url": "/guild/assets/spark-x.png",
              "new_url": "/guild/assets/spark-x.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/hero-classroom.jpg",
      "new": "classroom/img/hero-classroom.webp",
      "old_bytes": 963682,
      "new_bytes": 703022,
      "saved_bytes": 260660,
      "dimensions": [
        1024,
        1536
      ],
      "lossless": false,
      "psnr": 40.14,
      "old_sha256": "0cc265efd01d4a4f89f843bddcdf9d48db9fdfccd2b172c6edf0c08ef6ab75e1",
      "new_sha256": "27ffeee720c7d7161428174dd0718a46402b6fa2841b529d08a68d472344a558",
      "updates": [
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 35,
              "old_url": "/classroom/img/hero-classroom.jpg",
              "new_url": "/classroom/img/hero-classroom.webp"
            }
          ]
        },
        {
          "consumer": "classroom/sauce-cup/index.html",
          "replacements": [
            {
              "line": 157,
              "old_url": "https://www.myclover.com/classroom/img/hero-classroom.jpg",
              "new_url": "https://www.myclover.com/classroom/img/hero-classroom.webp"
            }
          ]
        }
      ],
      "retained_consumers": [
        "classroom/index.html"
      ]
    },
    {
      "old": "ako/assets/xircle-routine-orbs-sprite.png",
      "new": "ako/assets/xircle-routine-orbs-sprite.webp",
      "old_bytes": 796146,
      "new_bytes": 563820,
      "saved_bytes": 232326,
      "dimensions": [
        1254,
        1254
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "d4748dcc1df1f327f7c0d1103803a5cfb977bca7a739ce45671ce73e06d8f32b",
      "new_sha256": "f475038ed0fa4471a272d211a1f19c6fef98ae6946f08f29a34125bbad29924b",
      "updates": [
        {
          "consumer": "ako/ako.css",
          "replacements": [
            {
              "line": 914,
              "old_url": "/ako/assets/xircle-routine-orbs-sprite.png",
              "new_url": "/ako/assets/xircle-routine-orbs-sprite.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/achievement-hero-guild-x.jpg",
      "new": "img/achievement-hero-guild-x.webp",
      "old_bytes": 672449,
      "new_bytes": 523384,
      "saved_bytes": 149065,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 40.51,
      "old_sha256": "7c00bf15bda7ea9ae35c3617b293009db52b5dbeb4df26ffd7a082ed0a1f0650",
      "new_sha256": "0dfbf553e1e1120e9eb87bd8371ed05e53185ac9c2b7463936f457e8e4d64085",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 82,
              "old_url": "../img/achievement-hero-guild-x.jpg",
              "new_url": "../img/achievement-hero-guild-x.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/core7-achievement-07-full-collection.jpeg",
      "new": "img/core7-achievement-07-full-collection.webp",
      "old_bytes": 636774,
      "new_bytes": 462816,
      "saved_bytes": 173958,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 39.79,
      "old_sha256": "e669b4d5eb2c7dd6904db1439786cd9a96ad19ecd88bdcea02e408cc4dcbb0a6",
      "new_sha256": "350439f2553580770c6953b44756b4b6d1d3c6e27ce4ed1f664ca649b6f1b658",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 96,
              "old_url": "../img/core7-achievement-07-full-collection.jpeg",
              "new_url": "../img/core7-achievement-07-full-collection.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/core7-achievement-05-first-set.jpeg",
      "new": "img/core7-achievement-05-first-set.webp",
      "old_bytes": 614217,
      "new_bytes": 472376,
      "saved_bytes": 141841,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 41.3,
      "old_sha256": "41ed14acbae2c4d8f90f24381cda6db3be996b82a7fe4c7aaa872247ba2ca14b",
      "new_sha256": "056008bea8b8145fdcb94eb295c754362eb63f4ddc869b1c2c2a68f54d4853d6",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 94,
              "old_url": "../img/core7-achievement-05-first-set.jpeg",
              "new_url": "../img/core7-achievement-05-first-set.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv3-cook.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv3-cook.webp",
      "old_bytes": 579840,
      "new_bytes": 451312,
      "saved_bytes": 128528,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.19,
      "old_sha256": "12ade5ad6fec0da92c7de3883ad1ae81541f2dc3ccc9e5944d9243a10aec2b7f",
      "new_sha256": "cc1eb03433886b0a13a336ba9d6f68705a783b2d3b98947b733484c8c5aee430",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv3-cook.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv3-cook.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 74,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv3-cook.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv3-cook.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv4-split.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv4-split.webp",
      "old_bytes": 565784,
      "new_bytes": 436790,
      "saved_bytes": 128994,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.11,
      "old_sha256": "10d4a43e9ccaf4d495a7354799302fd171ff8aa919ed2f551cda0c508e31b558",
      "new_sha256": "fbb50900a2cb59a69836c7a2f4b546cb39820d2ab697c0608d6c76cfd64d15df",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv4-split.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv4-split.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 75,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv4-split.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv4-split.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv5-season.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv5-season.webp",
      "old_bytes": 563539,
      "new_bytes": 448222,
      "saved_bytes": 115317,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.56,
      "old_sha256": "2518262c361b43246152d1199bd5bc809187d8b622dfa51a4b5a35e49738d729",
      "new_sha256": "4f336361b43938ae1d5bda69010471c1681abd8c97ceee3b2635dd669a5a7c28",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv5-season.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv5-season.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 76,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv5-season.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv5-season.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/core7-achievement-03-first-victory.jpeg",
      "new": "img/core7-achievement-03-first-victory.webp",
      "old_bytes": 554144,
      "new_bytes": 421784,
      "saved_bytes": 132360,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 41.95,
      "old_sha256": "e0f67a6d475ddc428b38b3da0812aa5a905a976c6bfaecc657a1a89512b02670",
      "new_sha256": "26daf5ceab5ecc327ab3ad98f3c6421e7fb4ad0dd5ca18234648c2eff203d671",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 92,
              "old_url": "../img/core7-achievement-03-first-victory.jpeg",
              "new_url": "../img/core7-achievement-03-first-victory.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv1-source.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv1-source.webp",
      "old_bytes": 543088,
      "new_bytes": 424620,
      "saved_bytes": 118468,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.7,
      "old_sha256": "be5dddfa2799880681c2228cf9e0003d62e22255a8a5b62e0645a94a2039a23b",
      "new_sha256": "dba6100f3d241113c6d29aa61997ee4f88016bef20092626eeb2096868dd7642",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv1-source.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv1-source.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 72,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv1-source.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv1-source.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv2-taste.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv2-taste.webp",
      "old_bytes": 537461,
      "new_bytes": 418466,
      "saved_bytes": 118995,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.76,
      "old_sha256": "2d69940c2b08772c785e3883fa89f519edf234d0e6261b7910232fa713f797c9",
      "new_sha256": "ee153472ebc6ae201820fe8e62cfcfc0ab1268d328bb1e6e4eba4387c760794b",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv2-taste.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv2-taste.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 73,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv2-taste.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv2-taste.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/classroom-kitchen-20260812-1445/lv6-serve-steak.jpeg",
      "new": "img/classroom-kitchen-20260812-1445/lv6-serve-steak.webp",
      "old_bytes": 535238,
      "new_bytes": 417584,
      "saved_bytes": 117654,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.85,
      "old_sha256": "6c5ed20783eefbd7afc52b7ab6110683f9e30b1eff1d782a6d154f5e7225a674",
      "new_sha256": "de0868d8788e2e5901c4a0174aa6be50f3ebfa260936756638df0c87bca057e6",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 13,
              "old_url": "../img/classroom-kitchen-20260812-1445/lv6-serve-steak.jpeg",
              "new_url": "../img/classroom-kitchen-20260812-1445/lv6-serve-steak.webp"
            }
          ]
        },
        {
          "consumer": "classroom/index.html",
          "replacements": [
            {
              "line": 77,
              "old_url": "/img/classroom-kitchen-20260812-1445/lv6-serve-steak.jpeg?v=20260812",
              "new_url": "/img/classroom-kitchen-20260812-1445/lv6-serve-steak.webp?v=20260812"
            }
          ]
        }
      ],
      "retained_consumers": [
        ".github/workflows/fresh-classroom-kitchen-paths.yml"
      ]
    },
    {
      "old": "img/core7-achievement-04-first-friend-match.jpeg",
      "new": "img/core7-achievement-04-first-friend-match.webp",
      "old_bytes": 520819,
      "new_bytes": 396204,
      "saved_bytes": 124615,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 42.67,
      "old_sha256": "99f006245d9e4086f0b56ee4c72497218b29876814c373d69b01d36c85a78a55",
      "new_sha256": "cac6d68c286cd5e5dfe52b338a8fd27ee59949012e1209770db7ec17f9dcc4ae",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 93,
              "old_url": "../img/core7-achievement-04-first-friend-match.jpeg",
              "new_url": "../img/core7-achievement-04-first-friend-match.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/core7-achievement-06-first-hand.jpeg",
      "new": "img/core7-achievement-06-first-hand.webp",
      "old_bytes": 504021,
      "new_bytes": 376218,
      "saved_bytes": 127803,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 41.88,
      "old_sha256": "87e5a2fbcec65228fb570dd67442823d2e659902c7615b5fee7768905ec2092c",
      "new_sha256": "de6794e86b459c935cb08b216deea8670440c3d818420a4feea1841e9803bbf3",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 95,
              "old_url": "../img/core7-achievement-06-first-hand.jpeg",
              "new_url": "../img/core7-achievement-06-first-hand.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/core7-achievement-01-victory-wheel.jpeg",
      "new": "img/core7-achievement-01-victory-wheel.webp",
      "old_bytes": 480293,
      "new_bytes": 353604,
      "saved_bytes": 126689,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 41.82,
      "old_sha256": "05777ff80abaa959bf8ed0903cfb4770e306704651aacb3a689b19b38ce1138e",
      "new_sha256": "49c9845169f1381ac7025772d66871eebf3118eb4e60c14f879d94d582db12a4",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 90,
              "old_url": "../img/core7-achievement-01-victory-wheel.jpeg",
              "new_url": "../img/core7-achievement-01-victory-wheel.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson5.jpeg",
      "new": "classroom/img/header-lesson5.webp",
      "old_bytes": 464569,
      "new_bytes": 321630,
      "saved_bytes": 142939,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 41.06,
      "old_sha256": "048566b1b3ee753ad72d060c1d90837735191b56301682fe646740461f0f3dcd",
      "new_sha256": "3659ee56ab11dc27f7a2d4fb3de04f4586d77ae43b0c5579e3b2a46b68c20163",
      "updates": [
        {
          "consumer": "classroom/prompts.html",
          "replacements": [
            {
              "line": 270,
              "old_url": "/classroom/img/header-lesson5.jpeg",
              "new_url": "/classroom/img/header-lesson5.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "ako/assets/ako-xvisor-ep07-snacking-hunger-poster.png",
      "new": "ako/assets/ako-xvisor-ep07-snacking-hunger-poster.webp",
      "old_bytes": 460537,
      "new_bytes": 240554,
      "saved_bytes": 219983,
      "dimensions": [
        404,
        720
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "b13da062b461bbb868ac6be464736eb90d61e54c7b734dcaf452d44d4d279089",
      "new_sha256": "c7da1660ac503a1a593c47f612df06b787784be5ce6837b84b68278b06589a5b",
      "updates": [
        {
          "consumer": "ako/index.html",
          "replacements": [
            {
              "line": 430,
              "old_url": "/ako/assets/ako-xvisor-ep07-snacking-hunger-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep07-snacking-hunger-poster.webp"
            }
          ]
        },
        {
          "consumer": "ako/story/index.html",
          "replacements": [
            {
              "line": 166,
              "old_url": "/ako/assets/ako-xvisor-ep07-snacking-hunger-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep07-snacking-hunger-poster.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/core7-achievement-02-first-match.jpeg",
      "new": "img/core7-achievement-02-first-match.webp",
      "old_bytes": 459774,
      "new_bytes": 358232,
      "saved_bytes": 101542,
      "dimensions": [
        1672,
        941
      ],
      "lossless": false,
      "psnr": 43.28,
      "old_sha256": "0a24f42683992c9f3d6d3e75d2ca99b619a821b847f7e8b798c501f27be5d89b",
      "new_sha256": "c0d451075d5a57b0c892ea1eebfe5eaba0b41ce7c250820ed674fcb1058a7430",
      "updates": [
        {
          "consumer": "collection/collection.js",
          "replacements": [
            {
              "line": 91,
              "old_url": "../img/core7-achievement-02-first-match.jpeg",
              "new_url": "../img/core7-achievement-02-first-match.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.png",
      "new": "ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.webp",
      "old_bytes": 454499,
      "new_bytes": 240080,
      "saved_bytes": 214419,
      "dimensions": [
        404,
        720
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "b39148342bb0d85aea8ffaaf7616278af93fc78a6e377c1b66e40a33839bf582",
      "new_sha256": "c9895f17dd42ed340f9136e6750093455e18d4fcd5ec61091a825039c3844c26",
      "updates": [
        {
          "consumer": "ako/index.html",
          "replacements": [
            {
              "line": 238,
              "old_url": "/ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.webp"
            }
          ]
        },
        {
          "consumer": "ako/story/index.html",
          "replacements": [
            {
              "line": 60,
              "old_url": "/ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep04-otaku-weight-loss-poster.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson2.jpeg",
      "new": "classroom/img/header-lesson2.webp",
      "old_bytes": 451053,
      "new_bytes": 313514,
      "saved_bytes": 137539,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 41.67,
      "old_sha256": "640ab2bbb6d8485ee495ab6cab64684526be87b370fcb80bd7787fc20e417b23",
      "new_sha256": "e003c8a39b94e6db3c6018dc0a310cdfa5097f3f36cf9cb2cb9338a0a8323923",
      "updates": [
        {
          "consumer": "classroom/image-ai.html",
          "replacements": [
            {
              "line": 240,
              "old_url": "/classroom/img/header-lesson2.jpeg",
              "new_url": "/classroom/img/header-lesson2.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson6.jpeg",
      "new": "classroom/img/header-lesson6.webp",
      "old_bytes": 447989,
      "new_bytes": 306690,
      "saved_bytes": 141299,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 41.93,
      "old_sha256": "2f1c7fffdf1c4a27692633a2730307dcc4870d299f8c95316e84fda4f628a978",
      "new_sha256": "de5ec107338dc48b24107122196759dd3f9b494ef1182bb9bad152d99ca34eba",
      "updates": [
        {
          "consumer": "classroom/first-web.html",
          "replacements": [
            {
              "line": 148,
              "old_url": "/classroom/img/header-lesson6.jpeg",
              "new_url": "/classroom/img/header-lesson6.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/sauce-cup/header-prologue.jpeg",
      "new": "classroom/sauce-cup/header-prologue.webp",
      "old_bytes": 445505,
      "new_bytes": 299770,
      "saved_bytes": 145735,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 41.45,
      "old_sha256": "b484a6e92df71573eb6d81ec6859833860932c3e568bd717e5adbbf74e595922",
      "new_sha256": "190fb3b393ca9a4a6115be4a90f0264c83e2eb28ded9183f1245428f71987d16",
      "updates": [
        {
          "consumer": "classroom/sauce-cup/index.html",
          "replacements": [
            {
              "line": 82,
              "old_url": "/classroom/sauce-cup/header-prologue.jpeg",
              "new_url": "/classroom/sauce-cup/header-prologue.webp"
            }
          ]
        }
      ],
      "retained_consumers": [
        "classroom/sauce-cup/index.html"
      ]
    },
    {
      "old": "classroom/img/header-lesson3.jpeg",
      "new": "classroom/img/header-lesson3.webp",
      "old_bytes": 437984,
      "new_bytes": 301636,
      "saved_bytes": 136348,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 41.97,
      "old_sha256": "cd2e529529e22ae6269aa3f2a194532043e071c61b6c7357122a0e4d0c3117e5",
      "new_sha256": "8284f6f1f5d74a813931e8bcd2b495b0866d733a5482f4d9cb5dee4f8b812054",
      "updates": [
        {
          "consumer": "classroom/clip-ai.html",
          "replacements": [
            {
              "line": 225,
              "old_url": "/classroom/img/header-lesson3.jpeg",
              "new_url": "/classroom/img/header-lesson3.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson0.jpeg",
      "new": "classroom/img/header-lesson0.webp",
      "old_bytes": 410316,
      "new_bytes": 273070,
      "saved_bytes": 137246,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 42.47,
      "old_sha256": "264043ca9bfb0aa96a6b3287090138c4cda840748a17905cb43552bbc3ae1136",
      "new_sha256": "95b9363fd537c2fe1cf2689071bbf95ca1ae778c040f3f79f66d17e93c82ffa9",
      "updates": [
        {
          "consumer": "classroom/lesson-0.html",
          "replacements": [
            {
              "line": 69,
              "old_url": "/classroom/img/header-lesson0.jpeg",
              "new_url": "/classroom/img/header-lesson0.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/hall-why.jpg",
      "new": "img/hall-why.webp",
      "old_bytes": 400912,
      "new_bytes": 306274,
      "saved_bytes": 94638,
      "dimensions": [
        1200,
        900
      ],
      "lossless": false,
      "psnr": 43.41,
      "old_sha256": "a425074be2ace7759d4ffe38bc52b7b1140a70fc1311e93679a41cf02f1e24b6",
      "new_sha256": "91ab92abcfa1f63728104355ddd9de04505baccd35147231ef0b87c72d823aee",
      "updates": [
        {
          "consumer": "hall.html",
          "replacements": [
            {
              "line": 135,
              "old_url": "img/hall-why.jpg",
              "new_url": "img/hall-why.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson1.jpeg",
      "new": "classroom/img/header-lesson1.webp",
      "old_bytes": 400407,
      "new_bytes": 272442,
      "saved_bytes": 127965,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 42.76,
      "old_sha256": "9ce9e4d4250af1b879ba73333677992fab8f2c02e741975dff09839ada771d4d",
      "new_sha256": "3c41504f656a299f42e2829982ee57384b57b5415f0100edbcb3ce0be951e3f2",
      "updates": [
        {
          "consumer": "classroom/free-ai.html",
          "replacements": [
            {
              "line": 343,
              "old_url": "/classroom/img/header-lesson1.jpeg",
              "new_url": "/classroom/img/header-lesson1.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/hall-classroom.jpg",
      "new": "img/hall-classroom.webp",
      "old_bytes": 395370,
      "new_bytes": 288444,
      "saved_bytes": 106926,
      "dimensions": [
        1200,
        900
      ],
      "lossless": false,
      "psnr": 43.5,
      "old_sha256": "da4e74daa245b732c4c17aeee8a836f49547ba3f6bf69ddafe3728812674cffc",
      "new_sha256": "36f3042d951967a0a47ad17855b40e2c660edeb902fe45f6175fb9d002002e50",
      "updates": [
        {
          "consumer": "hall.html",
          "replacements": [
            {
              "line": 146,
              "old_url": "img/hall-classroom.jpg",
              "new_url": "img/hall-classroom.webp"
            }
          ]
        },
        {
          "consumer": "resume/index.html",
          "replacements": [
            {
              "line": 75,
              "old_url": "../img/hall-classroom.jpg?v=20260802",
              "new_url": "../img/hall-classroom.webp?v=20260802"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "classroom/img/header-lesson4.jpeg",
      "new": "classroom/img/header-lesson4.webp",
      "old_bytes": 389925,
      "new_bytes": 258940,
      "saved_bytes": 130985,
      "dimensions": [
        1024,
        1024
      ],
      "lossless": false,
      "psnr": 42.35,
      "old_sha256": "929af1ae634479ea82f0719a8d96afe47378256291593c2ea8f24dc85b1732b0",
      "new_sha256": "c060c67cdb8c348514c645668730e3322d32bcd5d616d347a03d2438ce0d2bce",
      "updates": [
        {
          "consumer": "classroom/notebooklm.html",
          "replacements": [
            {
              "line": 103,
              "old_url": "/classroom/img/header-lesson4.jpeg",
              "new_url": "/classroom/img/header-lesson4.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "ako/assets/ako-xvisor-ep06-no-starving-poster.png",
      "new": "ako/assets/ako-xvisor-ep06-no-starving-poster.webp",
      "old_bytes": 356388,
      "new_bytes": 185108,
      "saved_bytes": 171280,
      "dimensions": [
        404,
        720
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "b688fa829e0e39e857d6e64eb10288fd28dc3e93a701c4cac3320eeb8e8b88c6",
      "new_sha256": "a0b85f9ede2d0c6de9f8ce5aaeba7e32704b20092784407bc03e38ee4822ae5c",
      "updates": [
        {
          "consumer": "ako/index.html",
          "replacements": [
            {
              "line": 422,
              "old_url": "/ako/assets/ako-xvisor-ep06-no-starving-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep06-no-starving-poster.webp"
            }
          ]
        },
        {
          "consumer": "ako/story/index.html",
          "replacements": [
            {
              "line": 162,
              "old_url": "/ako/assets/ako-xvisor-ep06-no-starving-poster.png",
              "new_url": "/ako/assets/ako-xvisor-ep06-no-starving-poster.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "img/lv4/gemini-notebook-studio.png",
      "new": "img/lv4/gemini-notebook-studio.webp",
      "old_bytes": 225234,
      "new_bytes": 60056,
      "saved_bytes": 165178,
      "dimensions": [
        1284,
        2778
      ],
      "lossless": true,
      "psnr": null,
      "old_sha256": "cefaabb368cc82fbbcd23b899936ae09596f8ac85721a541295cd1ba8ad2a826",
      "new_sha256": "a849bb278e36c03a3ec6c74973ca14b1bdfb912bcda91b3601b84f209833ecee",
      "updates": [
        {
          "consumer": "classroom/notebooklm.html",
          "replacements": [
            {
              "line": 136,
              "old_url": "../img/lv4/gemini-notebook-studio.png",
              "new_url": "../img/lv4/gemini-notebook-studio.webp"
            },
            {
              "line": 136,
              "old_url": "../img/lv4/gemini-notebook-studio.png",
              "new_url": "../img/lv4/gemini-notebook-studio.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    },
    {
      "old": "ako/assets/ako-real-eating-onion-hero-poster.jpg",
      "new": "ako/assets/ako-real-eating-onion-hero-poster.webp",
      "old_bytes": 78841,
      "new_bytes": 57968,
      "saved_bytes": 20873,
      "dimensions": [
        1200,
        675
      ],
      "lossless": false,
      "psnr": 47.32,
      "old_sha256": "ef1d82a79da3769b14aea041a470c7d1b9b4c87dee8fc81f57a62043fa3ca6f0",
      "new_sha256": "ac8fd315d8e8abeee180bcb82046a08dac788be1292888e78c0fb78a8d5e87fb",
      "updates": [
        {
          "consumer": "ako/index.html",
          "replacements": [
            {
              "line": 43,
              "old_url": "/ako/assets/ako-real-eating-onion-hero-poster.jpg",
              "new_url": "/ako/assets/ako-real-eating-onion-hero-poster.webp"
            }
          ]
        }
      ],
      "retained_consumers": []
    }
  ],
  "cleanup": [
    {
      "path": "activity-create.webp",
      "bytes": 393410,
      "sha256": "8309a91983f4dc60e89ad65aaba46b975f5123ca15361c6253c184a230822df8",
      "reason": "misplaced byte-identical upload; canonical copies retained"
    },
    {
      "path": "activity-enjoy-food.webp",
      "bytes": 455970,
      "sha256": "694c4d6be522ba9110348b86aa06d061d68c7e1a9ffa634817507540a73c0590",
      "reason": "misplaced byte-identical upload; canonical copies retained"
    },
    {
      "path": "activity-project.webp",
      "bytes": 505106,
      "sha256": "486a1559593a3d97b2533b6f7406183f7b02d0b604a79bbe10e446b5ffbb872f",
      "reason": "misplaced byte-identical upload; canonical copies retained"
    },
    {
      "path": "activity-trade.webp",
      "bytes": 476626,
      "sha256": "b1c7eda1ca11ef9f18c234326dc1e4cbb67f2243e5cb8bf969b68f8cbeb04b98",
      "reason": "misplaced byte-identical upload; canonical copies retained"
    },
    {
      "path": "e2e-result.png",
      "bytes": 388469,
      "sha256": "6e45f2162e4c5495bd2cc0b2b00f9c1953493635d8fe1c423bc4bddf78d86334",
      "reason": "generated E2E screenshot; not a site asset"
    }
  ]
}
```
<!-- ASSET_MANIFEST_END -->
