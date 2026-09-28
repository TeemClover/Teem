# Media request 01 — step 1 (mousse) · for GPT

2026-09-28 · from Claude · status: **ยังไม่สร้าง / no video credits**

> **Superseded in part (v2.1):** the shipped page does not use `cl-front-ai-draft-hold.webp` or the old-pack botanicals for step 1; the mousse shows water, foam and its name only until M1 (a verified current pack) exists. The "Reuse now" rows below for step 1 are history. M1–M3 remain open requests.

## Scope

The first scene is built in-browser: procedural foam, light and the layer core, with no generated video. This request covers only what the browser cannot honestly make.

Nothing here asks AI to redraw a label. Reuse the existing library first.

## Reuse now (copy into `mediral/assets/`, no generation)

| Path in page | Source | Used for |
|---|---|---|
| `pack/cl-front-ai-draft-hold.webp` | already delivered | Step 1 pack. It stays labelled as a draft of the old gold-rose pack. |
| `botanicals/green-tea-shoot.webp`, `oat-panicle.webp`, `aloe-cut-leaf.webp`, `hibiscus-flower.webp`, `lily-flower.webp`, `rice-grain-panicle.webp` | already delivered | Step 1 origin. The list comes from the old-pack media and is shown as pending the current SKU. |
| `botanicals/licorice-root.webp`, `goji-fruit.webp`, `rosehip-fruit.webp` | `Sources/mediral/assets-prep/ingredients/` | Steps 3 and 5 name these today as text only. Add them at the same 768 px / q86 treatment and the page will show them. |

## Requests (ordered by priority)

| ID | Purchase question it answers | Reference | Spec | Real or AI | Later motion | Pass criteria | Mobile fallback |
|---|---|---|---|---|---|---|---|
| M1 | "ขวดที่ร้านส่งหน้าตาแบบนี้ใช่ไหม" | TT01 / TT05 / TT08 clover-label mousse; the brand's own packshot if obtainable | Front packshot on transparent alpha, lossless WebP, ≥1024 px tall, label pixels untouched | **Real source only.** Brand-supplied, or a photo of the unit in hand. No AI label. | none | Full front label readable; size text legible or recorded as unknown; SKU matched by the seller | same file |
| M2 | "ฟองเป็นยังไง" (texture proof) | Real product, clover pack | 4–6 s macro of pump → foam on the palm, daylight, 4K 9:16 and 16:9, no grading that changes colour | **Real footage only** | none. Shown as a clip in the step 1 panel, labelled "ถ่ายจากสินค้าจริง" with the date | Unedited colour; date and lot noted; no face | still frame |
| M3 | (atmosphere, optional) | none | Soft ivory/sage morning-light plate, 16:9 and 9:16, empty centre, no text, no product | AI OK | Could become a slow Kling light loop later. **Not now.** | No stray objects or letters | CSS gradient (current) |

When M1 arrives, swap in `pack/cl-front.webp` and set `image_status` in `data/routine.json` from `ai-draft-hold` to the verified status. Until the brand confirms that the old ingredient list belongs to the clover SKU, keep it labelled "จากสื่อแพ็กรุ่นเดิม · รอยืนยันกับแพ็กปัจจุบัน" (`ingredients_status: "pending-sku"`). Never present it as the current formula.

## Not requested

- No AI foam-on-skin
- No before/after
- No "germs removed" visuals
- No human faces
- No Kling or Seedance generation in this round
