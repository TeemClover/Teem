# myClover Session — Experience and Motion Design

Status: Draft for approval  
Applies to: `myclover.com/meet/`  
Updated: 30 August 2026

## 1. Design north star

> **Human warmth inside a memorable future-facing frame.**

The page should feel like entering a private, carefully prepared conversation—not opening a chatbot, filling a lead form, or watching a technology demonstration.

The memorable element is the meeting of two perspectives:

- Teem is represented by structure, lines, systems, and long-range movement.
- Ako is represented by warmth, rhythm, taste, and everyday movement.
- The two visual languages converge on the visitor.

High-tech comes from precision, timing, light, and responsive behavior. It must not come from excessive neon, 3D chrome, floating dashboards, or constant motion.

## 2. Experience qualities

The final experience must feel:

- **Personal** — every response changes based on the visitor's choice.
- **Composed** — spacious layout, short copy, deliberate transitions.
- **Credible** — real people, specific experience, honest boundaries.
- **Alive** — subtle motion responds to the visitor without slowing them down.
- **Rare** — the session feels like access to two experienced people, not a free generic consultation.

It must not feel:

- Like LINE, Messenger, or a customer-support widget.
- Like an AI companion pretending to be Teem or Ako.
- Like a recruitment, downline-building, or network-marketing landing page.
- Like a SaaS dashboard made from repeated cards.
- Like a parallax demo in which content is secondary to effects.

## 3. Visual system

### Palette

| Token | Value | Role |
| --- | --- | --- |
| Warm Ivory | `#F7F3EA` | Primary canvas |
| Cream Light | `#FCFAF5` | Conversation surface |
| Charcoal | `#19221D` | Primary text and CTA |
| Midnight Ink | `#07131F` | One deep editorial section |
| Clover Green | `#287354` | Health and human care |
| Electric Blue | `#4F8CFF` | Licence path and care systems |
| Soft Gold | `#C8A85D` | Open conversation and signature |
| Hairline | `rgba(25,34,29,.12)` | Dividers and card edges |

Only one intent color is active at a time. Electric Blue is a precise accent, not a full-page neon wash.

### Typography

Retain the current font stack to protect speed and visual continuity:

- Display: `Anuphan`, 600.
- Body: `IBM Plex Sans Thai`, 400–500.
- English labels: uppercase, small size, generous letter spacing.

Rules:

- Large statements use short lines and generous breathing room.
- Do not bold whole paragraphs.
- Do not place body copy over complex parts of photography.
- Use numerals and English labels as navigation rhythm, not decoration.

### Surfaces

- Main page: mostly open canvas without boxed sections.
- Dynamic value panel: thin edge, soft ivory glass, no heavy shadow.
- Conversational booking: one elevated cream surface with a restrained luminous edge.
- Deep section: Midnight Ink used once for the Duo or Closed Folder, not both.
- Border radius: 22–30 px on major surfaces, full pill only for choices and CTA.

### Photography

- Use the existing real photography as the identity anchor.
- Do not replace Teem or Ako's faces with generated people.
- Hero image should feel editorial and approachable, not like a corporate team portrait.
- Secondary portraits should support the story of two perspectives, not act as outbound profile cards.

## 4. Page composition

### 4.1 Hero — The invitation

Desktop: copy left, real duo portrait right.  
Mobile: copy first, portrait completes the lower half of the opening screen.

Content order:

1. `MYCLOVER SESSION · BANGKOK / ONLINE`
2. `มาเจอกันก่อน`
3. `แล้วกลับไปพร้อมก้าวต่อไปที่ชัดกว่าเดิม`
4. Two-line proof: 19 years / thousands trained / Ako's routine and food strength.
5. Primary CTA: `เลือกเรื่องที่อยากเอามาคุย`
6. Single-line practical note: Free / Online 25 / In-person 45.

Remove the collection of five hero chips. Health-specific Body Check-in appears only after Health is selected.

### Hero signature animation

Two extremely thin traces begin apart:

- A structured blue line moves in measured segments.
- A warmer green-gold line moves with a softer organic curve.
- They meet behind the words `myClover Session` and create a four-leaf intersection for one quiet pulse.

The animation runs once on entry, then settles. A barely perceptible 12–16 second ambient drift may continue behind the photograph.

### 4.2 Intent selector — The first response

Prompt:

> **วันนี้อะไรพาคุณมาหาเรา?**

Desktop: three wide choices in one row.  
Mobile: three stacked choices with the selected choice anchored at the top.

Each choice contains:

- A short label.
- A one-line human description.
- A minimal symbol made from the same trace system.

Selection behavior:

1. The chosen card rises 2 px and its trace completes.
2. The page accent changes over 240 ms.
3. The current dynamic panel content fades down 6 px and out.
4. New content fades in from 8 px below.
5. CTA label updates without changing width abruptly.

No URL change and no horizontal carousel.

### 4.3 Dynamic value — What the visitor takes home

Use the heading:

> **คุณจะกลับไปพร้อมอะไร**

Present three outcomes as an editorial numbered list rather than a cloud of chips.

The honest qualifier sits below a hairline divider. It should feel like a confident promise, not legal small print.

Health may include one compact baseline illustration. The licence and care-system path may include the Closed Folder preview. Open Conversation needs no extra product visual.

### 4.4 The Duo — Why two people

Preferred layout:

```text
TEEM                              AKO
19 YEARS · PEOPLE · SYSTEMS       ROUTINE · FOOD · REAL LIFE
                 \              /
                       YOU
          ชีวิต เป้าหมาย และจังหวะของคุณ
```

The central `YOU` node is the visual focus. Teem and Ako remain evidence around the visitor, not celebrities above the visitor.

Copy lockup:

> **ทีมมองว่าอะไรทำให้คุณไปได้ไกล**  
> **เอโกะมองว่าอะไรทำให้คุณทำได้ทุกวัน**

Outbound profile links are secondary text links revealed after the booking CTA area, not actions on the portrait itself.

### Duo motion

- On scroll, Teem's line draws 65% toward the center.
- Ako's line draws from the opposite side with a 120 ms offset.
- Both complete when `YOU` reaches 60% of the viewport.
- `YOU` receives one 1.0 → 1.04 → 1.0 pulse.
- No looping pulse.

### 4.5 Session method

Use four stages:

1. `01 LISTEN` — เริ่มจากเรื่องของคุณ
2. `02 SEE` — เห็นข้อมูล จุดแข็ง หรือสิ่งที่มองข้าม
3. `03 CONNECT` — เชื่อมทางเลือกที่ตรงกับคุณ
4. `04 CHOOSE` — คุณเลือกว่าจะไปต่อหรือพอแค่นี้

Desktop: a horizontal line with four editorial stops.  
Mobile: a vertical trace that advances as each step enters the viewport.

Do not animate every word. Draw the trace and reveal each stage once.

### 4.6 Closed Folder

Only render when the licence-examination and care-system path is selected.

Use a quiet, dark editorial composition:

> **แฟ้มนี้ไม่ได้มีไว้ส่งให้ทุกคนอ่าน**  
> มันมีไว้เปิดคุยกับคนตรงหน้า

The folder remains visually closed. A subtle blue edge appears as the pointer moves or the device scrolls, but pages do not fan open and no carousel appears.

### 4.7 Honest questions

Use four accordions with complete answers:

- Is this network marketing?
- Can Teem or Ako recruit or enrol me?
- What support is available if I choose to take the licence examination?
- Can I discuss only health?

Opening one answer closes the previous answer. The disclosure motion is 220–300 ms with height and opacity coordinated. Avoid rotating oversized icons or bouncing the section.

### 4.8 Signature

Use one quiet block before the final CTA:

> **ใครเจอเรา คนนั้นโชคดี**

Explanation:

> ต่อให้สุดท้ายคุณไม่ได้ซื้อ ไม่ได้เลือกสอบ หรือยังไม่พร้อมไปต่อ เราอยากให้คุณกลับไปพร้อมข้อมูล มุมมอง หรือก้าวถัดไปที่ชัดกว่าเดิม

The visual can include one gold Clover point that illuminates once as the signature enters view.

## 5. Conversational booking layer

### Design intent

The booking layer is the first minute of a myClover Session. It is not a chat simulation for entertainment.

### Container

Desktop:

- Centered surface, 560–620 px wide, maximum 86 svh.
- Page remains visible behind a warm blurred scrim.
- Rounded 28 px corners and a one-pixel intent-colored edge.

Mobile:

- Full-width sheet, maximum 94 svh.
- Rounded upper corners, safe-area-aware footer.
- Current question and available choices stay above the on-screen keyboard.

### Header

```text
myClover Session                     Close
รู้จักคุณทีละนิด ก่อนเราจะได้เจอกัน
──────────── progress trace ────────────
```

Do not show repeating human avatars. One small duo photograph may appear only in the opening message.

### Message language

- System messages align left and use open cream space without a comic bubble tail.
- Visitor answers align right as compact intent-colored capsules.
- Keep system messages to 1–3 short lines.
- Do not display timestamps.
- Do not use double ticks, online status, or notification sounds.

### Opening choreography

1. CTA dot expands into a horizontal trace: 160 ms.
2. Scrim fades in: 220 ms.
3. Booking surface rises 18 px and resolves from 0.98 to 1.0 scale: 420 ms.
4. Header and first prompt enter with a 90 ms stagger.
5. Choices appear together after the prompt, not one by one.

The first usable choice must be available within 600 ms of the click.

### Response choreography

When a visitor chooses an answer:

1. The chosen capsule moves into the answer position: 260 ms.
2. Unchosen choices fade to 0 and collapse: 180 ms.
3. A neutral `preparing` glyph appears for 350–700 ms.
4. The acknowledgement resolves with a short trace sweep: 360 ms.
5. The next question follows after 100 ms.

The visitor can tap Skip Animation after the first response through the reduced-motion preference or by interacting immediately. No transition may trap input.

### Preparing indicator

Use three points moving along a short Clover-shaped path. Label it for screen readers as:

`myClover กำลังเตรียมคำถามถัดไป`

Never identify it as Teem or Ako typing.

### Progress

- Use a thin trace with five nodes, not a numbered form stepper.
- Completed nodes remain filled.
- Current node receives one short glow and then becomes static.
- Text alternative: `ขั้นตอน 2 จาก 5`.

### Choice controls

- Minimum height 48 px.
- Use full descriptive labels: `ออนไลน์ · 25 นาที`, not `ออนไลน์` alone.
- Selected state uses checkmark, border, and color.
- On desktop, hover adds 1–2 px lift and line illumination.
- On touch, use immediate active-state feedback without hover dependence.

### Free-text controls

- Inputs appear only when required by the current question.
- Labels remain visible above the field.
- Character counter appears only for the optional 200-character context field.
- Contact field keeps the user's original text; it does not guess whether it is LINE or telephone.

### Review state

The conversation resolves into a single editorial summary card:

```text
YOUR MYCLOVER SESSION

เรื่อง        Exam & Care System
รูปแบบ       Online · 25 นาที
เวลาที่ขอ    TUE 1 SEP · 18:30
ติดต่อ       LINE @example
```

Each row has a quiet `แก้ไข` control. The final consent appears before the CTA with normal readable contrast.

### Sending state

- CTA label becomes `กำลังส่งคำขอ…`.
- A moving light travels across the CTA once per second.
- All duplicate-submit actions are disabled.
- The rest of the summary remains readable.
- A timeout or error always exits the sending state and restores a retry action.

### Success state

The progress trace completes and folds into a four-leaf Clover mark.

Copy:

> **ได้รับคำขอนัดแล้ว 🍀**  
> เราจะติดต่อกลับเพื่อยืนยันเวลาอีกครั้ง

Then display:

- Reference number.
- Topic.
- Requested date/time.
- Meeting mode.
- Contact destination.

The animation runs once for 700–900 ms. No confetti.

### Error state

- Keep the warm surface; do not turn the interface red.
- Use a small muted red line and clear message.
- Preserve every answer.
- CTA becomes `ลองส่งอีกครั้ง`.

## 6. Motion system

### Motion tokens

| Token | Duration | Use |
| --- | ---: | --- |
| Instant | 100–160 ms | Press feedback, icon state |
| Quick | 180–260 ms | Choice selection, accordion |
| Compose | 320–480 ms | Message and panel transitions |
| Arrival | 520–700 ms | First entrance, acknowledgement |
| Ambient | 12–16 s | Background drift only |

### Easing

- Enter: `cubic-bezier(.2,.9,.2,1)`
- Exit: `cubic-bezier(.4,0,1,1)`
- Ambient: `ease-in-out`

### Motion rules

1. Animate `transform`, `opacity`, and SVG stroke where possible.
2. Use blur only on first entrance and keep it below 6 px.
3. No more than two independently moving elements in one viewport.
4. Loops are restricted to ambient background and preparing/sending states.
5. Every success or selection animation plays once.
6. Pointer parallax is limited to 2–5 px and disabled on touch and reduced-motion modes.
7. Scroll-linked motion must never move body copy away from the reader.

## 7. Memorable interaction signatures

The experience needs only three signatures:

### A. Two traces become one Clover

Used in the Hero, Duo, and Success state. Repetition creates memory without introducing unrelated effects.

### B. Choice becomes conversation

The selected button physically becomes the visitor's answer capsule. This is the transition that makes the booking feel conversational.

### C. Progress becomes confirmation

At success, the five-node progress trace folds into the Clover mark. It visually communicates that the request is complete.

Do not add additional signature effects unless one of these is removed.

## 8. Responsive behavior

### Mobile, below 768 px

- Sticky booking CTA is visible after the Hero CTA leaves the viewport.
- Hero CTA scrolls to the selector rather than opening a generic booking immediately.
- Intent choices stack.
- Duo becomes a vertical composition with `YOU` between Teem and Ako.
- Session method becomes vertical.
- Booking uses a bottom sheet/full-height hybrid.

### Desktop, 768 px and above

- No persistent bottom sticky CTA.
- Header, dynamic panel, and section CTA provide booking access.
- Duo and timeline use horizontal compositions.
- Booking opens centered and does not occupy the full display.

### Large desktop, 1280 px and above

- Content max width remains controlled; do not stretch copy across the viewport.
- Photography may use additional negative space, but body text remains within 60–68 characters per line.

## 9. Accessibility and reduced motion

- `prefers-reduced-motion` removes parallax, ambient loops, auto-drawing lines, and artificial preparation delays.
- Reduced-motion mode changes messages with a short opacity transition of 100 ms or less.
- The conversation uses a polite ARIA live region for the newest prompt only.
- Focus moves to the first choice for each new question.
- Closing returns focus to the CTA that opened the layer.
- Escape closes only after a warning if the visitor has entered contact information.
- All intent states meet WCAG AA text contrast.
- Decorative SVGs and traces are hidden from assistive technology.

## 10. Performance implementation direction

- Use CSS transitions, SVG stroke animation, and the Web Animations API already available in the browser.
- Do not add a heavy animation or chat framework.
- Keep current compressed real photography; provide responsive sources only if they reduce transfer size.
- Lazy-load every non-hero visual.
- Do not autoplay video in the Hero.
- If an optional welcome video is added later, load its poster first and media only after explicit interaction.
- Keep the conversational state in the existing page JavaScript and submit to the existing API.

## 11. Visual QA checklist

- Hero explains the value before the first scroll.
- High-tech details remain visible but do not compete with faces or copy.
- Only one intent color dominates at a time.
- The selected choice transforms smoothly into the first conversational answer.
- No artificial pause exceeds 700 ms.
- Desktop has no large bottom overlay CTA.
- Mobile CTA never covers an active input or action.
- Opening, Back, Edit, Close/Reopen, Sending, Success, Error, and reduced-motion states are visually complete.
- Success clearly means “request received,” not “appointment confirmed.”
- The final page still feels like myClover even with all animation disabled.
