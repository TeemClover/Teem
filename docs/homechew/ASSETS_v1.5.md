# Homechew v1.5 — ภาพเพิ่มสำหรับหน้าเว็บ

สร้าง 2026-09-26 ด้วย **built-in imagegen** ตามคำขอของเจ้าของงาน ภาพทั้งหมดเป็น **generated concept** ไม่ใช่ภาพถ่ายสินค้าหรือหลักฐานสูตรจริง ไม่แก้ฉลาก v1.2 ที่ได้รับมา

| ภาพ | ไฟล์ใช้งานใน `homechew/assets/img/food/` | ตำแหน่ง | ขนาด |
|---|---|---|---|
| หมูย่างยกจากถ้วยแจ่ว | `ck-dip-v15-720.webp`, `ck-dip-v15-1122.webp` | วงกลมรสเผ็ดและเรื่องรสเชียงคาน | 720×900 / 1122×1402 |
| ทะเลสุกกับน้ำจิ้มเขียว | `mc-feast-v15-720.webp`, `mc-feast-v15-1122.webp` | สำรับมหาชัย | 720×900 / 1122×1402 |
| โต๊ะทอด · ทะเล · ย่าง | `table-cooked-v15-1100.webp`, `table-cooked-v15-1672.webp` | ภาพกว้างชวนกิน | 1100×619 / 1672×941 |
| ไก่จิ้มซอสสีส้มตามโมเดล | `hy-dip-orange-v15-720.webp`, `hy-dip-orange-v15-1122.webp` | ภาพสำรอง วงกลมรสหวาน เรื่องหาดใหญ่ และส่วนความพิถีพิถัน | 720×900 / 1122×1402 |
| จานไก่กับซอสสีส้มตามโมเดล | `hy-feast-orange-v15-720.webp`, `hy-feast-orange-v15-1122.webp` | ภาพสำรองและสำรับหาดใหญ่ | 720×900 / 1122×1402 |

ทุกภาพตรวจด้วยสายตาก่อนใช้: อาหารสุก ไม่มีหอยนางรมดิบ ไม่มีฉลากที่แต่งขึ้น ไม่มีข้อความหรือตรารับรองในภาพ ไฟล์ WebP ย่อจากภาพต้นฉบับโดยไม่ขยายเกินต้นฉบับ (118–278 KB ต่อไฟล์โดยประมาณ)

ภาพเปิด `homechew/assets/img/product/trio-{wide,tall,tablet}.webp` และภาพชุดซอส `trio-set.webp` เป็นภาพที่เรนเดอร์จากฉาก 3D และฉลากเดิมโดยตรง เพื่อให้ first paint กับฉากเคลื่อนไหวมีรูปทรงและสีเดียวกัน ไม่ได้ให้ AI สร้างฉลากใหม่ ภาพชุดซอสแสดงขวดครบทั้ง 3 ใบแทนการ์ดฉลากแบน

## Prompts ที่ใช้สร้างภาพ

### แก้สีซอสน้ำจิ้มไก่ตามคำยืนยันเจ้าของ

ใช้ **built-in imagegen edit** โดยมี `hy-dip-1122.webp` หรือ `hy-feast-1122.webp` เป็นภาพเป้าหมาย และ `assets/img/product/trio-set.webp` เป็นภาพอ้างอิงเฉพาะสีส้มในขวดตรงกลาง คงโมเดล 3D เดิม เก็บภาพรุ่นเก่าไว้ และส่งออกภาพใหม่เป็น WebP quality 84 สองขนาด ภาพยังเป็น concept ไม่ใช่ภาพสินค้าจริง

ภาพจิ้มไก่:

> Use case: precise-object-edit. Asset: Homechew Hat Yai chicken dipping sauce website food photo. Image 1 is the edit target; image 2 is ONLY a sauce COLOR reference, specifically the warm orange sauce inside the CENTER bottle. Change only the sauce in image 1: the bowl's sauce, glossy coating on the dipped fried chicken, and connected dripping sauce should all have the natural warm orange hue of the center bottle in image 2. The sauce is Thai sweet chili chicken dipping sauce, translucent glossy orange with visible small red chili flecks, garlic and seeds; not dark brown or soy sauce. Keep plausible darker orange in shadows and bright orange highlights without neon saturation or opaque creamy texture. Preserve the exact composition, crop, chicken shape and fried texture, hand, bowl, limes, peppers, shallots, tabletop, warm photographic lighting, depth of field and every other element of image 1. Preserve appetizing photorealism. Do not introduce bottles, labels, text, extra props, or any elements from image 2. Return only the edited portrait food photograph.

ภาพจานไก่:

> Use case: precise-object-edit. Asset: Homechew Hat Yai chicken dipping sauce website meal photo. Image 1 is the edit target; image 2 is ONLY a sauce COLOR reference, specifically the warm orange sauce inside the CENTER bottle. Change only the dipping sauce inside the bowl in image 1 from brownish amber to the natural warm orange hue of the center bottle in image 2. Thai sweet chili chicken dipping sauce, translucent glossy orange with visible small red chili flecks, garlic and seeds, natural orange shadows and highlights, not dark brown, soy sauce, neon or creamy opaque sauce. Preserve the exact image 1 portrait composition and crop, fried chicken pieces with opaque white fully cooked interiors, herbs, plates, bowl shape, peppers, shallots, tabletop, warm photographic lighting and depth of field. Do not change the chicken color. No new objects, bottles, labels, text or elements from image 2. Return only the edited portrait food photograph.

### หมูย่างจิ้มแจ่ว

> Use case: photorealistic-natural. Asset type: premium Thai sauce brand Homechew website food photograph, portrait 4:5 composition. Create an exceptionally appetizing macro photograph of one thick fully cooked grilled pork neck slice held with dark wooden chopsticks, the lower corner being lifted just above a small handmade ceramic bowl of Thai jaew dipping sauce. The pork has natural irregular caramelized char edges, juicy but fully cooked opaque interior, fine glossy fat, realistic meat grain; not raw pink. Rich translucent deep reddish brown jaew clings thinly to its lower edge with one short realistic viscous drip, visible toasted chili and small rice specks. Bowl sits lower center, pork in the center of frame, beautiful ceramic ivory-rust rim and shallow amount of sauce. Behind in soft bokeh: a few grilled pork slices, small bamboo basket of sticky rice, fresh cucumber and mint. Warm directional afternoon window light from upper left, deep olive-brown background, premium editorial food magazine, 85mm macro, tactile natural textures, restrained props, appetizing and authentic domestic table. Keep the main pork and dipping bowl inside central 70 percent of frame for both circular and portrait cropping. No bottles, no packaging, no writing, no logos, no text, no flames, no smoke, no raw meat, no hands visible, no impossible long stretchy cheese-like sauce.

### โต๊ะสามมื้อ

> Use case: photorealistic-natural. Asset type: Homechew premium Thai dipping sauce landing page, wide 16:9 editorial photograph. Create a beautifully appetizing spread of three fully cooked Thai meals on a warm walnut dining table at home. Left foreground: golden craggy Hat Yai fried chicken thighs and wings with crispy fried shallots, a small handmade cream ceramic bowl of glossy amber-red sweet chili sauce beside it. Center back: platter of bright coral-orange steamed whole prawns, steamed crab legs and cracked cooked crab with fluffy opaque white meat, and a few opaque poached squid rings; a small bowl of vivid natural green seafood dipping sauce positioned toward the viewer. Right foreground: neatly sliced juicy fully cooked grilled pork neck with fine caramelized edges on banana leaf, a small handmade bowl of deep red-brown jaew with roasted chili and tiny rice specks. Small basket of sticky rice, cut lime, cucumber and fresh herbs as restrained background accents. Every ingredient realistic and coherent; human-scale table for a small shared meal, not a giant buffet. Camera at 40-degree table height, 50mm lens, main trio of dishes all in appetizing focus, layered depth, warm window light from left, soft grounded shadows, quiet premium Thai home, tactile matte ceramics and linen, editorial food magazine polish. All dishes and their paired sauce bowls clearly readable within frame and comfortably uncropped. No bottles or packaging, no labels, no text, no people, no hands, no oysters or mussels, no raw seafood, no raw red meat, no ice, no smoke, no plastic.

### สำรับมหาชัย

> Use case: photorealistic-natural. Asset type: Homechew premium Thai seafood dipping sauce website food photograph, portrait 4:5. A craveable intimate close table composition of fully cooked Thai seafood: three beautiful coral-orange grilled tiger prawns with natural lightly charred shells and white opaque exposed tail flesh, pieces of steamed crab with fluffy white fully cooked crab meat, a few gently curled opaque white poached squid pieces. Center foreground hero is a handmade small ivory speckled ceramic bowl of fresh vivid olive-lime green Thai seafood dipping sauce with finely chopped green chili, garlic and tiny chili seeds. One peeled cooked prawn tail rests gently on the bowl rim with a little green sauce coating it, inviting the viewer to dip. Behind, seafood sits on a matte ceramic platter with a banana leaf, fresh lime halves, a little coriander, nothing excessive. Warm soft directional window light, believable highlights on moist cooked shellfish, tactile rustic cream ceramics and light brown wooden table, deep moss-green backdrop, tasteful editorial 85mm food photography, shallow depth of field with bowl and front prawns sharply focused. Natural anatomy, realistic portions, pristine appetizing styling. No oysters, no mussels, no raw seafood, no ice, no bottles or labels, no text, no smoke, no people or hands.

## สถานะ asset requests เดิม

- R2-05: มีภาพสำรองจากฉาก 3D สำหรับเว็บแล้ว; ภาพถ่ายสินค้าจริงยังช่วยยืนยันสีและสัดส่วนได้
- R2-10, R2-11: มีภาพ concept สำหรับเว็บแล้วตามตารางข้างต้น
- R2-12: มีภาพโต๊ะอาหารสุกสำหรับเว็บแล้ว โดยไม่ใส่ขวดเพื่อคงฉลากให้ถูกต้องในส่วนสินค้า
- ฉลากพร้อมพิมพ์ โลโก้ vector และขนาดขวดจริงยังใช้รายการเดิมใน `ASSET_REQUESTS_ROUND_02.md`; รอบนี้ไม่ต้องสร้างคำขอภาพซ้ำ
