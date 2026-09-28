# Mediral /mediral — Storyboard v3 "5 ขั้น จากวัตถุดิบสู่รูทีน"

2026-09-28 · Claude (creative direction + page) · replaces the Vitrine/serum-pair direction

> **Current direction (v3):** the owner's new reference asks for a substantial visual upgrade: large focal objects, botanical depth, visible glass highlights and camera movement. The mousse opens on a clover-label bottle illustration with foam/water around it; subsequent chapters move ingredients → glass funnel → one drop → product → role → rail. Forest/chartreuse backgrounds and Thai sans typography replace the small ivory/gold presentation. See `README.md` for the shipped behaviour. The layer-core concept below is retained as design history, not the current implementation.

## Direction from the owner

The owner does not want a display cabinet. The page tells how each product comes to be. It starts from the ingredients the brand selected, combines them into the product, and shows the product's place in the full routine:

1. Cleanse with the mousse
2. Treat in two layers with the two serums
3. Protect with SPF
4. Finish with the powder puff

The page talks directly to the user. It should feel inviting and read as organic, cosmetics-grade skincare. The story opens on the mousse, then adds one piece at a time. Each piece shows through movement what it is for. The goal is to sell the full five-piece set.

## Big idea: the routine layer core

One continuous 3D space with no shelves, cabinet or product cards over the scene.

At the centre floats a translucent **layer core**: a thin frosted disc. Each step adds its own layer to the disc, shown through that step's own movement. By the last step the core holds all five layers, and the five products wait in order along the routine line behind it.

The core is a diagram of order and purpose, not skin. There is no face, no before/after and no depicted result. That keeps "what it helps with" visible without fake effects.

Each step is one scroll chapter, played in this order:

| Phase | Local scroll | What moves | What the user learns |
|---|---|---|---|
| ที่มา (origin) | 0–0.32 | The brand-listed botanicals drift in from depth and orbit the centre, labelled as AI illustration | What the brand says went into it |
| รวม (combine) | 0.32–0.62 | The botanicals spiral into a warm light core; the product materialises bottom-up from that light | Many named ingredients → one product |
| บทบาท (role) | 0.60–0.90 | That step's movement adds its layer to the core (below) | What this step is for in the routine |
| เข้ารูทีน (join) | 0.88–1.0 | The product glides to its numbered place on the routine line | 1/5 … 5/5 — the set builds up |

Step movements. The words are brand-described cosmetic functions only.

| # | Product | Layer movement | Words used |
|---|---|---|---|
| 1 | Mousse (pump) | Iridescent foam blooms over the core, then pops; the base clears to a bright ring | ล้าง — เริ่มจากผิวที่ล้างสะอาด |
| 2 | White serum 15 ml | A clear drop falls from the dropper and spreads into the first thin film | บำรุงชั้นที่ 1 |
| 3 | Yellow-green serum 30 ml | A pale lime drop spreads a second film over the first | บำรุงชั้นที่ 2 |
| 4 | Sunscreen serum 15 ml | A light dome rises over the stack; sun rays soften at its surface, then it settles into a warm film | ปกป้อง — ขั้นสุดท้ายของการบำรุงตอนเช้า |
| 5 | Powder puff | Fine powder drifts down and settles into a soft matte veil | ปกปิด — ปิดท้ายเมื่อแต่งหน้า |

**Set chapter:** the camera pulls back to the complete core and the five products in routine order.
- The panel shows what is in the set, when to use each step (เช้า/เย็น), the set offer as seen in the brand poster (with its dates and the fact that it is unverified), the buy action, copy text and a saved summary card.
- Unticking a product switches to "only some pieces". Scrolling never changes this choice.

**Ready buyers:** the header and the hero have a "ดูชุด 5 ชิ้น" shortcut, and the routine rail (1–5) links straight to the set.

## Visual language

- **Organic + cosmetics-grade:** ivory `#f6f4ee` and sage `#dce7da` space, forest green `#0e4f2c` type, a hairline gold `#c8a45e` used sparingly, and fine clinical rules and numerals (`01 / CLEANSE`).
- **Type:** Thai serif for headlines, Cormorant italic for Latin accents, Noto Sans Thai for body text.
- **Light:** warm morning key from the upper left, soft dust in the light, frosted surfaces. No black/gold luxury clichés; the real pack colours lead.
- **Motion:** slow, eased, scroll-scrubbed. Idle motion is limited to a gentle float and drifting dust.

## Evidence rules the page follows

**Product copy**
- Wording is "สื่อแบรนด์ระบุ/เล่าว่า…" or neutral routine language.
- Never: treat, cure, kill germs, fade melasma, repair cells, "organic 100%", certified, suitable for everyone.
- "Organic" appears only as the brand's tone and pack wording.

**Mousse**
- Show the AI draft of the clover-label bottle derived from the supplied five-piece poster; identify it as an illustration. A verified original packshot is still pending. The formula and size remain unverified, so ingredient arrays stay empty and timing reads "ตามฉลาก".
- The old gold-rose draft and its ingredient list are not used anywhere on the page. The old mask instruction (1–2 minutes) is not used.

**Sunscreen**
- No SPF/PA figures in copy; the page says to read them on the tube's label.
- The web copy of the AI draft (`su-front-web.webp`) softens the tiny AI-lettered PA marking, and a visible note says the lettering on the draft is AI-drawn. The unsoftened draft stays out of git and deployment.
- The abstract powder illustration is not captioned as the UV filters; Zinc Oxide and Titanium Dioxide appear as text only.

**Powder**
- No weight, shade or SPF claims.

**Set price**
- The brand poster shows 1,899 THB for 21–30 Sep 2026, plus a gift the poster mentions.
- The page labels this as poster information, not a verified cart price or coupon. It hides the number automatically after 30 Sep 2026.
- No per-piece prices are shown.

**Purchase links**
- The affiliate link stays `null`, so the buy button is inert with a "กำลังตรวจ" label. No store or placeholder URL.

**Imagery**
- Pack images are AI drafts with a visible label.
- Botanicals are AI illustrations with a visible label.
- The internal partner cost never appears.

## Fallbacks kept from v1 QA

- **Scroll vs choice:** the scene's storytelling never changes the purchase choice.
- **Static stills:** with no WebGL or save-data, each chapter shows its pack and botanicals as a still. The set still shows exactly the ticked pieces.
- **Reduced motion:** chapters snap to their composed state (product formed, layer done); no scrubbing, no idle loop, CSS transitions off.
- **Lazy loading:** the 3D module loads after first paint; botanical textures load per chapter.
- **Data failure:** a banner with retry and minimum facts replaces the empty page.
- **Summary card:** a PNG checklist of the chosen pieces in routine order, with no price.
