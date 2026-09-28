# Mediral — หนึ่งหน้า ห้าเรื่อง (v8)

Updated 2026-09-29. Supersedes v7's card-per-beat scroll ("15 cards fading in" and ingredients orbiting a bottle). Creative direction agreed with GPT (creative director) in a private proposal round; Claude owns the code experience. Facts, commerce rules and fallbacks from v7 remain; only the storytelling and motion changed.

## The idea

A new visitor recognises themselves before they see a product list: *one face, five everyday things*. Each concern sits on the pack that looks after it, so the first screen is also the product map. Care is the heart: the maker's intent opens the routine, a user's words close it (ตั้งใจทำ · ใส่ใจใช้ · อยากบอกต่อ), and "take it with you" is only the final, optional line.

## First screen (390×844)

Kicker "MEDIRAL · ชุดดูแลผิว 5 ชิ้น" · headline "หนึ่งหน้า / ห้าเรื่อง" · five crisp packs standing on the stone ledge (base at ~72% of the stage image) with labels ล้าง · สิวง่าย · ดูหมอง · แดด · แต่งผิว · "ล้าง บำรุง ปกป้อง แต่งผิว — เลือกดูแลให้ตรงเรื่อง" · dated poster offer · ดูข้อเสนอชุด 5 ชิ้น. The rail is hidden on the opening.

## Five grammars — motion is the job

| Scene | Moment → headline | Start / middle / end (readable with text hidden) |
|---|---|---|
| CL erase ↑ | กลับถึงบ้าน ผิวผ่านมาทั้งวัน → ล้างวันนี้ออก ก่อนเริ่มดูแล | huge faint "วันทั้งวัน" behind the bottle / foam rises behind it and covers the word / foam settles at the base, word gone |
| AC drop ↓ | เป็นสิวง่าย แต่ก็ยังอยากชุ่มชื้น → ดูแลความมัน ไม่ลืมความชุ่มชื้น | silent clip with tea tree + mangosteen peel / the source lifts and one amber drop falls onto the rising bottle / a quiet level line: สมดุลความมัน ↔ ความชุ่มชื้น (labels only, no ratio) |
| BR reveal ↘ | บางวันผิวดูหมอง สีผิวดูไม่เท่ากัน → ให้สีผิว ดูสม่ำเสมอ | scene in warm dusk / a light band sweeps and reveals bearberry, licorice, vitamin C derivative and the bottle / probiotics · สมดุล and bakuchiol · เรียบเนียน |
| SU glide → | ไม่ชอบกันแดดหนักหน้า? → กันแดด ที่อยากหยิบใช้ | glass sheet enters with its own "สารกรอง UV จากแร่ธาตุ · Zinc Oxide · Titanium Dioxide" label / a clear drop: ไฮยา · ความชุ่มชื้น / the seven Giga White® names with short roles; tube with "ภาพแพ็กจำลอง AI · ค่า SPF/PA ยึดฉลากจริง" |
| PO settle ↓ | บางวันอยากแต่งผิวนิดเดียว → วันไหนอยากแต่ง ค่อยเติมชิ้นนี้ | outlined "เนียน" over the ledge / fine powder drifts and the word fills / compact lands on the ledge; group labels only |

Reduced motion shows each scene's composed end still; short screens (< 700px tall) unpin the scenes and keep light position-linked motion; without WebGL the DOM scenes are complete.

## Customer story (v7 facts, retained)

1. **WHY and the five pieces.** Show the set, its roles and a direct route to the dated offer. The idea is a routine from cleansing to optional makeup with one brand. Never say everyone needs all five or that combined use has proven superior results.
2. **Mousse — the cleansing piece.** Clear water/foam imagery identifies the rinse-off role and the current clover-label pump bottle. Do not borrow ingredients or performance claims from the old rose-label pack.
3. **White serum — care for blemish-prone skin.** Tea tree and mangosteen peel introduce the brand's soothing story; Zinc PCA/witch hazel/grapefruit introduce its balance family; HA/trehalose/Sodium PCA introduce moisture. Brand-described light, quick-absorbing and non-sticky feel closes the piece.
4. **Yellow-green serum — more even-looking skin.** Bearberry/licorice/vitamin C have distinct cosmetic roles in brand material. Probiotics and bakuchiol follow with separate balance/smoothness roles, even without matching plant photography. Finish with the fuller ingredient list and brand-described light, easy-spreading, moisturizing texture. Explain the difference from the white serum here, without prescribing that both must be layered.
5. **Sunscreen — sun care with moisture.** First identify the named mineral UV filters; then HA hydration; then the seven-plant Giga White family. Plants must not appear to supply mineral UV protection. Do not turn the grouping into a tested SPF, penetration or blue-light demonstration.
6. **Powder — optional finishing and coverage.** Lead with coverage and the brand-described fine/light texture; follow with the powder/oil group and the hydration/soothing group. Botanical names remain available without a cell-regeneration story. Shade and weight still need current product information.
7. **Complete-set offer and saved list.** Put the dated price, honest purchase state and copy/card actions before optional customization. Ready buyers retain the fixed offer shortcut throughout.
8. **Optional comparison and full ingredient library.** The serum comparison/use-time information can remain in a disclosure after the offer. Retain all ingredient names, roles and sources behind four product disclosures. These are chosen deeper reads, not mandatory chapters before cleansing or 74 full-screen sections before purchase.

The poster supports the sequence used to tell the set's story. It does not by itself establish an instruction to layer AC before BR. The page states: “หน้านี้เรียงให้เห็นบทบาทของทั้ง 5 ชิ้น วิธีใช้จริงให้ยึดฉลากสินค้า”. Product-specific label guidance remains accessible; no invented wait times, drop counts or serum hierarchy.

## What changes with scroll

Each product has about three meaningful beats. Each beat shows a benefit or role, its relevant ingredient names and the same crisp pack. Scroll promotes the next family; it does not require taps to reveal the selling story. All text remains in semantic DOM, readable during fast/reverse scrolling, resizing, failed WebGL and reduced motion.

Native DOM pack images supply the labels and shape. Contact shadows, modest movement and ingredient layers can provide depth; WebGL may provide restrained atmosphere. Do not reconstruct bottles, project labels onto lathes, invent an unseen back or alter pack lettering with fog, bloom or exposure. Size the visible pack bounds, not the transparent image canvas.

Ingredient motion explains the product-specific family. Avoid repeating a funnel or a measured mixing recipe for every piece. Missing images become readable names rather than a guessed plant or chemical diagram. Keep complete optional source lists separate from shopping selection. No nested scrolling traps or long empty travel; phones 390×844 and 360×640 have priority.

## Quiet media within the composition

The existing silent botanical/pipette film belongs inside a relevant ingredient scene. Remove the standalone film chapter, three lesson cards, customer-facing play/pause/replay buttons, duration badges and status announcements. Keep the AI/concept provenance accessible in source details/footer.

Use the existing 10.00-second H.264 faststart file and its matching WebP poster. Defer loading; autoplay muted/inline only when visible, the tab is active, reduced motion is off and data saving is off. Pause offscreen/hidden. Settle quietly at the end: the clip is not a seamless loop. Reduced motion, data saving, blocked autoplay and failure show the poster, without asking the visitor to play it. No additional generation is required.

The footage and stills are illustrative. They are not Mediral's factory, experiment, formula, real product texture or evidence of results. Glassware, droplets and motion establish no dose, concentration, penetration or efficacy.

## Source and sales boundaries

- Ingredient records keep `name`, optional `image`, `benefit`, `benefit_source` and `benefit_status`. `brand-claim` means attributed brand marketing, not independent validation. `identity-only` does not gain an individual benefit by appearing in a family. Editorial groupings remain identified as reading aids.
- Complete display inventory remains AC 24 / BR 18 / SU 14 / PO 18. This is neither a full INCI list nor 74 distinct actives. Reconciled sunscreen names do not prove species, molecular sizes or formula counts.
- Keep the current mousse formula and size unresolved. Package illustrations remain AI drafts; sunscreen lettering and powder shade/weight cannot be verified from them. Certification logos alone do not establish finished-product organic or medical certification.
- Use strong cosmetic role and sensory copy that the brand actually provides. No acne/melasma treatment, DNA control, germ-killing, live-cell repair, universal safety/shade, invented percentages or timed guarantees.
- The fixed-set poster offer is dated 21–30 September 2026 and remains unverified in the current cart. Preserve expiry, full-set/partial-summary separation and inert purchase behavior until a verified Affiliate URL is supplied. No internal costs or private source paths enter public data or docs.

Run and implementation contracts are in [README.md](README.md). Record actual tests and production verification after integration; earlier release results do not verify this revision.

## Revision history

- v7: continuous product-specific selling, scroll-led ingredient families, crisp DOM packs and decorative no-controls media.
- v6: WHY/offer opening, separate serum comparison and film chapter, optional full atlas after the offer. Superseded by v7.
- Earlier cabinet, serum-pair and mousse-only openings remain superseded.
