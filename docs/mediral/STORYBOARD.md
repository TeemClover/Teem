# Mediral — Routine first, ingredient lab (v4)

Updated 2026-09-28. Supersedes the mousse-first visual upgrade in `dd6fbb34` and the older cabinet/layer-core concepts.

## Customer story

The first screen shows all five products together and explains why the routine has several roles. It asks the visitor to understand those roles before choosing the set: cleansing; two serums with different brand-described purposes; morning sunscreen; optional finishing makeup. It does not claim that everyone needs five products or that using them together has a proven combined effect.

The opening headline is “ผิวมีหลายโจทย์ แต่ละขั้นจึงมีหน้าที่”. A five-step map links directly to each role. “เข้าแล็บดูทีละขั้น” starts the explanation; “ดูชุดและข้อเสนอ” serves visitors ready to review the bundle.

Each product chapter connects a purpose to its materials:

1. Explain the cosmetic role in everyday Thai.
2. Show a few selected ingredients. The visitor can select each name to read its attributed role; the matching illustration comes forward.
3. Gather the illustrated materials into a glass funnel and receiving vessel.
4. Reveal the product, then return it to the routine order.
5. End at the full set with the saved list, dated poster offer and verified-link gate.

The lab is an explanatory setting, not a depicted factory or a scientific result. Glass graduations carry no formula quantities. No skin penetration, germ killing, clinical charts, efficacy percentages or invented concentrations are shown.

## Motion and interaction

- Progress `u=-1..0`: the full set opens together. This overview always shows all five, independently of the reader’s saved shopping list.
- Progress `u=0..5`: the five existing product chapters, beginning with the mousse.
- Botanical chapters: materials are available through `t=0..0.38`, gather around `0.38..0.58`, drop around `0.59..0.70`, reveal around `0.68..0.84`, role thereafter.
- Ingredient buttons explain one material at a time and highlight it in the scene. Selecting from a later product phase returns to the materials view. Normal page scrolling resumes the sequence. Ingredient exploration never modifies the shopping list.
- The full set remains at `u=5..6`. Reader selections affect this purchase summary, not the overview.
- Reduced motion, a missing WebGL scene and data failure retain readable content and product images.

## Source contract

Each featured ingredient has `name`, `image`, `benefit`, `benefit_source` and `benefit_status`. `brand-claim` means that role is attributed to brand marketing, not independently verified. `identity-only` means the material or its group is named but a specific individual effect is not established by the supplied source. Group claims are not silently converted into individual claims. Additional named materials and their available descriptions live in expandable details.

A gel illustration is an abstract material illustration, not a molecular model or proof of how the product behaves. Botanical images are AI illustrations. Package images remain labelled AI drafts.

The current mousse uses the clover-label draft, with formula and size unverified. Its old gold-rose formula is not reused. Sunscreen lettering is not authoritative for SPF/PA. Powder shade, weight and SPF are not inferred.

## Sales contract

The five-piece offer comes from the supplied poster for 21–30 September 2026 and remains qualified as unverified in the cart. It appears only in its date window and with all five products selected. Partial lists do not inherit the bundle offer. Affiliate checkout remains unavailable until a verified link is supplied. No internal partner pricing or private source files are published.
