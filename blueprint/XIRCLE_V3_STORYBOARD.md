# XIRCLE V3 — the sample becomes an invitation

Source of truth: `XIRCLE_V3_APPOINTMENT_FIRST_BUILD_DIRECTIVE_2026-09-08.md`, read in full. Six meaningful actions; the hook and sleep question share the opening. No registration or download in this route. No production health input. Publication authorized by the owner on 2026-09-09 after final QA.

## The experience to build

| Beat | Visitor action | Visual consequence / what it means | Minimum copy | Next state |
|---|---|---|---|---|
| 1. Hook | Immediately choose a sample night | A full cinematic room, woman and white cat; three simple night choices. No start screen or questionnaire. | เมื่อวาน เป็นแบบไหน? / ลองคืนตัวอย่างหนึ่งคืน | Sleep record |
| 2. Sleep | Action 1: choose a night | The room becomes the existing sleep scene. A blue trace draws the selected duration; its small photographic record docks into a persistent day ribbon. Choice acknowledges immediately; food emerges after the record has been seen. | เก็บคืนหนึ่งไว้แล้ว | Food camera |
| 3. Food | Action 2: shutter | Existing food scene in a viewfinder. A single soft flash, a held photograph, a recording sweep and 12:30 stamp. The photograph then shrinks into the same day ribbon. About 1.2 seconds, with no extra Next and no nutrient analysis. | เก็บมื้อนี้ไว้ / 12:30 · บันทึกแล้ว | Movement choice |
| 4. Movement / one day | Action 3: choose a movement rhythm | The cleaned original park scene receives a live green trace. Three photographic fragments spread and settle as one day. The food image and sleep duration remain the ones just chosen. | วันเดียว เห็นเหตุการณ์ | Invitation to widen time |
| 5. Several days / context | Action 4: แล้วหลายวันล่ะ? | The assembled day contracts into the latest night; six earlier nights spread beside it. The same seven sample bedtimes draw in order; the last three visibly shift later. | หลายวัน เริ่มเห็นสิ่งที่เปลี่ยน / ช่วงนั้นต่างไปเพราะอะไร? | Three sample contexts |
| 6. Human contribution | Action 5: choose context; switching stays available | The dates and numbers stay fixed. An annotation joins nights 5–7. Real Teem + Ako portraits appear alongside their distinct short observations and one practical experiment. The result stays until the visitor acts. | ข้อมูลเดิม เข้าใจชีวิตมากขึ้น | แล้วของคุณล่ะ? |
| 7. Sample → real | Action 6: แล้วของคุณล่ะ? | Sample records recede. Their data labels leave; blank measurement slots, the real Scale image and real Teem + Ako photography enter a warm composition. The next scene is an appointment, not another fictional score. | คราวนี้ เป็นเรื่องของคุณจริง ๆ | Booking reveal |
| 8. Appointment / optional continuation | Book, or quietly continue learning | One visually dominant booking button. No app/account prerequisite. The existing knowledge library is one quiet link after the offer, not another step. | นัดลอง XIRCLE Experience / เราเอา Scale ไปวัดจริง แล้วดูชีวิตจริงกับคุณ | `/meet/?intent=health&from=xircle&open=booking`; optional `/xircle/learn/` |

## Art direction and reuse decisions

- Preserve the existing emerald / warm sunlight / white cat world. Full scene imagery leads; numerical UI only appears in response to actions. The record is a photographic ribbon, not a large dashboard card.
- Retouch `xircle-s00-hook-hero.webp`, `xircle-s03-eat.webp` and `xircle-s04-move.webp` into sibling V3 plates: preserve the people, cat, composition and light; remove conflicting baked text, fixed data and food-analysis graphics. Original assets stay intact. This is a repair of valuable art, not a replacement cast or style.
- Reuse `xircle-s02-sleep.webp`, the uncontaminated left portion of `xircle-s06-yesterday-visible.webp`, and `xircle-s08-seeing-not-doing.webp` with intentional CSS framing. The latter is environmental context, never presented as a real appointment photograph.
- Use the existing real `meet/img/teem.jpg`, `ako.jpg`, `hero.jpg` and the full official CloverX Scale photograph, repaired into `xircle/assets/v3/scale-600.webp`. The 362px in-repo crop was inspected and replaced by this stronger source; its demonstration display is turned off. Do not invent a different device or a photographic meeting that never happened.
- Mobile: image above controls, large type and normal document scrolling; no desktop dashboard squeezed into a phone. Desktop: scene occupies most of the stage, copy occupies intentional negative space. Selected records remain visible through scene changes.

## Interaction and implementation boundaries

- Immediate pressed state; 200–350 ms record response; longer capture and sample-to-real choreography has a specific visible purpose. No automatic dismissal of the human insight.
- Back / replay cancels pending choreography. Rapid taps cannot skip meaningful scenes. Records can be edited without restarting the story.
- Reduced motion keeps the captured state and meaning, removes travel/parallax/flash, and shortens transitions. Sound is optional and off until an explicit toggle.
- Load the first art plate first; stage the likely next scenes after interaction. Portraits and Scale wait for later beats. Failed images keep readable live controls and a usable booking fallback.
- Root runtime remains isolated from legacy progress / telemetry; old progress keys are preserved. The shared navigation guard allows the optional knowledge, deep-information and explore routes without awarding old completion flags. The existing Meet query contract and draft preservation stay in place. No sample values enter that URL or booking payload.
- No invented Habit Score, calorie analysis, automatic sharing, diagnosis, registration success, or confirmed appointment claim.

## Review gate

Browser review at 320 / 360 / 390 / 430 / 1366 px: all six actions, captured meal dwell/docking, persistent records, unchanged data across all contexts, tangible Scale reveal, booking and optional knowledge route. Also exercise back during motion, replay, keyboard, reduced motion, blocked storage, missing image and no-JavaScript fallback. Owner subsequently authorized push and merge on 2026-09-09, after QA.
