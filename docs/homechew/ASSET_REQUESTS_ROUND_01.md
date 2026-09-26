# Homechew — ASSET_REQUESTS_ROUND_01

**ออกเมื่อ:** 2026-09-26 · **สำหรับ:** Homechew Web Pack **v1.2** · **อ้างอิง:** แพ็ก v1.0 `docs/06_ASSET_REQUESTS.md` (ID A01–A14) และต้นแบบ `/homechew/` ในเครื่อง
**สถานะต้นแบบตอนนี้:** ทุกช่องด้านล่างใช้ของแทนชั่วคราวอยู่ (ภาพ concept ที่ลบข้อความรับรองแล้ว, โลโก้ trace, ขวด proxy) — ดู `STATUS_2026-09-26.md`

---

## 0. วิธีส่งกลับใน Pack v1.2

```
Homechew_Claude_Web_Pack_v1.2/
  ASSET_MANIFEST_v1.2.json      ← 1 รายการต่อไฟล์: id, filename, kind(real_photo|generated_concept|vector|model|video),
                                   source/ผู้ถ่าย/เครื่องมือ, วันที่, width, height, sha256, approved_by, public_use_ready
  assets/A01_logo/ …            ← โฟลเดอร์ตาม ID
  assets/A02_labels/ …
  …
  CHANGELOG.md                  ← บอกว่า v1.2 เพิ่ม/แก้อะไร เทียบ v1.0
```

กติกาทุกไฟล์
- ตั้งชื่อ `<ID>_<คำอธิบาย>_<ratio>_<width>.<ext>` เช่น `A05-HY-DIP-01_4x5_1600.jpg`
- ส่ง**ต้นฉบับ** (PNG/TIFF/JPG คุณภาพสูง, หรือ SVG/AI/GLB) — ฝั่งเว็บจะย่อและทำ WebP เอง
- ระบุชัดว่าเป็น **ภาพจริง** หรือ **ภาพ AI/concept**; ภาพ AI ต้องใส่ `kind: generated_concept`
- **ห้ามมีตัวอักษรในภาพ** ยกเว้นฉลากที่มาจากไฟล์ typeset ที่อนุมัติแล้ว (A02)
- ห้ามมี: JAPANESE STANDARDS, ตรารับรอง, ปริมาตร (เช่น 240 mL), ส่วนประกอบที่ยังไม่ยืนยัน, ธงญี่ปุ่น, คันจิสุ่ม, ป้ายขายดี, โลโก้ร้านอื่น
- อาหารต้อง**สุกแล้ว**ทั้งหมด ไม่มีภาพดิบ→สุก
- Alpha ต้องเป็น PNG/WebP โปร่งจริง ไม่ใช่ลายตารางหมากรุก
- ภาพคน (ผู้ปรุง/เจ้าของ) ต้องเป็นภาพจริงที่เจ้าตัวอนุมัติเท่านั้น ห้ามให้ AI สร้างหน้า — ตอนนี้เจ้าของเลือกไม่เปิดเผยตัว

ลำดับความสำคัญ: **P0** = ต้องมีเพื่อให้ vertical slice ดูจริง · **P1** = เรื่องเล่า/ความน่าเชื่อ · **P2** = ก่อนเปิดสาธารณะ

---

## P0 — จำเป็นสำหรับรอบถัดไป

```yaml
id: A01-LOGO-VECTOR
status: needed
use_in: header, ฉลากขวด 3D ทุกใบ, ส่วนปิดท้าย, favicon
priority: P0
kind: vector
reference_files: [assets/source/logo-approved-reference.jpeg]
deliver:
  - A01_mark.svg            # ไอคอน H/บ้าน/หยด/ถ้วย อย่างเดียว
  - A01_wordmark.svg        # "Homechew"
  - A01_lockup_stacked.svg  # ไอคอน + Homechew + โฮมชูว + ホームチュウ
  - A01_lockup_horizontal.svg  # ไอคอน + Homechew แนวนอน สำหรับ header
  - A01_mark_1024.png, A01_mark_2048.png (โปร่งใส)
  - A01_mark_mono_dark.svg, A01_mark_mono_light.svg (สีเดียว สำหรับพื้นเข้ม/อ่อน)
colors: ระบุ hex ทางการ (ตอนนี้เว็บใช้ #2c231a เข้ม, #7e5738 น้ำตาลถ้วย — วัดจากภาพ)
must_preserve: รูปทรงตามภาพที่เจ้าของเลือก, สะกด Homechew / โฮมชูว / ホームチュウ
must_not_add: ช้อน, ไอน้ำ, การออกแบบใหม่
fallback: SVG trace อัตโนมัติ homechew/assets/brand/*.svg (ตอนนี้ใช้อยู่)
acceptance: ซ้อนทับภาพอ้างอิงแล้วตรง, เส้นคม, ใช้ได้ที่ 24px
```

```yaml
id: A02-LABEL-FLAT (HY / MC / CK)
status: needed
use_in: ฉลากบนขวด 3D (หน้า+หลัง), การ์ดสินค้า, proof พิมพ์
priority: P0
kind: vector
reference_files: [assets/source/hat-yai-concept.png, mahachai-concept.png, chiang-khan-concept.png]
deliver_per_sku:
  - A02-<SKU>_front.ai|svg (vector, ตัวอักษร typeset จริง)
  - A02-<SKU>_front_texture_4096.png   # แบนเต็มผืน ไม่มี perspective
  - A02-<SKU>_back.svg + _back_texture_2048.png
  - A02-<SKU>_illustration_layer.png   # ภาพสถานที่แยกชั้น โปร่งใส
  - A02_seal_strip.svg + _texture.png  # แถบกระดาษ "Good Sauce Brings Good People Home"
dimensions: ใช้ขนาดฉลากจริงถ้ามี (มม.) พร้อม bleed/seam; ถ้ายังไม่มีขวดจริง ให้ยึดสัดส่วน proxy ด้านล่าง
proxy_geometry_now:
  bottle_body_radius: 1 หน่วย (R)
  front_label: สูง 3.35R (จากก้น 0.60R ถึง 3.95R), พันรอบ 230° → ผืนแบนกว้าง ≈ 4.05R : สูง 3.35R (≈ 1.21 : 1)
  printable_center: ช่วงกลาง ~110° (≈ 45% ของความกว้างผืน) คือส่วนที่เห็นตรงหน้า
  back_label: 96° → ผืน ≈ 1.69R : 3.35R (≈ 1 : 2)
  seal_strip: กว้าง 0.5R, ยาวรวม ≈ 3.5R (คอหน้า → ข้ามฝา → คอหลัง), ข้อความอยู่ช่วงคอด้านหน้า
text_layout_front: โลโก้ lockup → ภาพสถานที่ → ชื่อไทย → ชื่ออังกฤษตัวพิมพ์ใหญ่ → เส้นสั้นสีประจำรส
text_layout_back: ช่องข้อมูล ปริมาณสุทธิ / ส่วนประกอบ / สารก่อภูมิแพ้ / การเก็บรักษา / ควรบริโภคก่อน / หลังเปิดขวด / ผู้ผลิต — ถ้ายังไม่มีข้อมูลให้เว้นเป็น "รอยืนยัน"
accent_colors: HY #aa411e · MC #315537 · CK #743925 (จาก data/products.json)
must_not_add: THAI ROOTS • JAPANESE STANDARDS, ปริมาตร, ตรารับรอง, landmark ที่ยังไม่ตรวจว่าอยู่จริง
fallback: ฉลากวาดด้วย canvas + ภาพสถานที่ crop จาก concept (ตอนนี้ใช้อยู่)
acceptance: อ่านชื่อไทยได้ที่ขวดสูง 300px บนจอ, ไม่มีรอยต่อที่มุมหน้า, ผู้ตรวจภาษาญี่ปุ่นตรวจแล้ว
```

```yaml
id: A03-BOTTLE-MODEL
status: needed
use_in: ขวด 3D ทั้งหน้า (hero, เปิด, เท)
priority: P0
kind: model
deliver: A03_bottle.glb + ไฟล์ต้นฉบับ (.blend) + texture maps
node_names (ต้องใช้ชื่อนี้): BottleGlass, SauceFill, FrontLabel, BackLabel, Cap, SealFront, SealTop, SealBack
requirements:
  - หน่วยเมตร, ก้นขวดอยู่ที่ y=0, แกนขวดตรงแกน Y, ฉลากหน้าหันไปทาง +Z
  - Cap แยกชิ้น origin อยู่ขอบล่างฝา (เพื่อหมุนเปิด)
  - SauceFill เป็นปริมาตรปิด อยู่ในแก้ว หนาแก้ว ~2–3 มม. ถ้ารู้
  - UV ของ FrontLabel/BackLabel ตรงกับ A02 แบบแบน 0–1
  - แถบซีล 3 ชิ้น (หน้า/บน/หลัง) หรือ mesh เดียวแบ่ง UV ตามความยาว
  - triangles รวม ≤ 60k, texture ≤ 2048 ต่อแผ่น (มือถือ)
dimensions: ความสูง, เส้นผ่านศูนย์กลางตัว/คอ/ฝา จริง (มม.) — ตอนนี้ UNKNOWN
proxy_now: สัดส่วนจาก concept — สูงรวม 6.15R, คอ 0.52R, ฝา 0.64R สูง 0.43R, ไหล่ 4.1R→5.2R
fallback: ขวด lathe ใน homechew/js/scene/bottle.js
acceptance: เปิดใน three.js/gltf-viewer ได้, ชื่อ node ครบ, ขนาดตรงของจริง
```

```yaml
id: A04-PACKSHOT (HY / MC / CK)
status: needed
use_in: ภาพ fallback เมื่อไม่มี WebGL/ลดการเคลื่อนไหว, การ์ดแต่ละรส (S2), ภาพชุดซอส (S5)
priority: P0
kind: generated_concept_or_real_photo
ratio: 2:3
minimum_pixels: [1600, 2400]
camera: ตรงหน้า ระดับกลางฉลาก เลนส์ยาว (ไม่บิดเบี้ยว) + อีกช็อต 3/4 หมุน ~30°
composition: ขวดเต็มใบ เห็นฝาและก้นครบ, ขวดกลางภาพ, เว้นขอบบนล่าง ≥ 8%
lighting: key อุ่นจากซ้ายบน, rim ขวาหลังให้ขอบแก้วชัด, สะท้อนแก้วนุ่ม ไม่มีจุดขาวแตก
required_layers: [bottle_alpha, shadow_separate, neutral_bg_version]
alpha: true (PNG โปร่งใส) + อีกไฟล์พื้นครีม #f3eadb
camera_consistency: ทั้ง 3 รสมุม/ขนาด/แสงเดียวกันทุกประการ (จะเรียงข้างกัน)
text_in_image: เฉพาะฉลากจาก A02 เท่านั้น
must_not_add: อาหาร/ผัก/พริกรอบขวด (ภาพนี้คือสินค้าเดี่ยว), ปริมาตร, ตรารับรอง
fallback: ภาพ concept ที่ลบข้อความแล้ว homechew/assets/img/*-concept-*.webp
acceptance: ตัดวางบนพื้นครีมแล้วขอบแก้วไม่มีขอบขาว/เทา
```

```yaml
id: A05-HY-DIP-01
status: needed
use_in: S1 ช่วง "อร่อย" (การ์ดภาพที่เลื่อนเข้าหลังเท) และบทหาดใหญ่ใน S2
priority: P0
kind: generated_concept_or_real_photo
reference_files: [assets/source/hat-yai-concept.png]
ratio: 4:5   # การ์ดบนเว็บ ≈ 8:9 จะ crop จาก 4:5; ขอ 16:9 อีกเวอร์ชันด้วย
minimum_pixels: [1600, 2000]
camera: macro 3/4 จากด้านบนเล็กน้อย ~35°, ระยะชัดตื้น
composition: ไก่ทอดสุกกรอบ ชิ้นหนึ่งกำลังจิ้ม/ยกจากถ้วยน้ำจิ้มสีส้มอำพัน เห็นซอสเกาะเงา, ถ้วยเซรามิกครีมลายจุด (เข้ากับถ้วย 3D), ว่างด้านซ้ายสำหรับข้อความ
lighting: key อุ่นด้านข้าง, fill ธรรมชาติ, ไฮไลต์เปียกบนซอส
required_layers: [food, dipping_bowl, background]
alpha: false
text_in_image: none
must_preserve: สีซอสตามตัวอย่างจริง (A11) เมื่อได้มา; ตอนนี้โทนเว็บ #c5501f
must_not_add: ส่วนประกอบที่ยังไม่ยืนยันในซอส, โลโก้ใหม่, ชื่อร้านไก่ทอด, เนื้อดิบ
pair_with: ถ้วย 3D ที่เทเสร็จ (u≈0.88)
fallback: หมูย่าง crop จากภาพเชียงคาน (food-grilled-concept.webp)
acceptance: น่ากิน, ความข้นดูจริง, ไม่มีตัวอักษร AI
```

```yaml
id: A06-MC-DIP-01
status: needed
use_in: บทมหาชัยใน S2, สำรองสำหรับ S1 ถ้าเปลี่ยนรสที่เท
priority: P0
kind: generated_concept_or_real_photo
reference_files: [assets/source/mahachai-concept.png]
ratio: 4:5 (+16:9)
minimum_pixels: [1600, 2000]
camera: macro 3/4, ชัดตื้น
composition: กุ้งหรือหมึก**ลวก/นึ่งสุก** จิ้มน้ำจิ้มซีฟู้ดสีเขียวสด, มะนาวผ่าครึ่งเป็นสีเน้น, ผักชีสด (ถ้ามี) อยู่ในถ้วยเสิร์ฟแยก
lighting: สว่างสดกว่า HY เล็กน้อย, แสงคม ไม่แฟลชจัด
required_layers: [food, dipping_bowl, background]
alpha: false
text_in_image: none
must_not_add: อาหารทะเลดิบ, น้ำแข็งกับกุ้งดิบ, การอ้างว่าผักชีอยู่ในขวด
fallback: ภาพ concept มหาชัย (มีกุ้งดิบเป็นพร็อพ — ต้องเปลี่ยน)
acceptance: สีเขียวน่ากินไม่เทา, อาหารสุกชัดเจน
```

```yaml
id: A07-CK-DIP-01
status: needed
use_in: บทเชียงคานใน S2
priority: P0
kind: generated_concept_or_real_photo
reference_files: [assets/source/chiang-khan-concept.png]
ratio: 4:5 (+16:9)
minimum_pixels: [1600, 2000]
camera: macro 3/4 ระดับต่ำ
composition: หมู/ไก่ย่างสุก ขอบไหม้พอสวย จิ้มซอสแจ่วสีน้ำตาลแดงในถ้วยจิ้ม, โต๊ะอุ่น
lighting: แสงอุ่นต่ำ นุ่ม
required_layers: [food, dipping_bowl, background]
alpha: false
text_in_image: none
must_not_add: ควัน (สื่อว่า smoked), ป้ายเชียงคาน, จานไหม้ดำ, ข้าวเหนียวถ้ายังไม่ยืนยันเรื่องเล่า
fallback: crop จากภาพ concept เชียงคาน
acceptance: ไม่ดำเกิน, ซอสเงา
```

```yaml
id: A08-POUR-REF
status: needed
use_in: ปรับวัสดุ/ความข้น/ความเร็วสายซอสใน 3D (S1) — ไม่ใช่วิดีโอเล่นอัตโนมัติ
priority: P0
kind: real_photo (หรือคลิปสั้นถ่ายจริง)
deliver:
  - A08_pour_ref_HY.mp4  # 3–5 วิ, กล้องนิ่ง, เทจากขวดจริงหรือขวดใกล้เคียงลงถ้วย, 60fps ถ้าได้
  - A08_pour_stills_HY_*.jpg  # 4 เฟรม: ก่อนเท / สายซอสเริ่ม / สายซอสกลาง / ผิวในถ้วยหลังเท
  - A08_bowl_endstate_topdown_4x5_1600.jpg  # ถ้วยซอสที่เทเสร็จ มุมบน 45°
camera: ด้านข้างตรง เห็นปากขวด สายซอส และจุดตกในถ้วยในเฟรมเดียว
lighting: เหมือน A05
must_not_add: น้ำพุ่ง, ซอสกระเด็น, การเทปริมาณเกินจริง
fallback: สายซอส mesh ใน homechew/js/scene/pour.js
acceptance: เห็นความหนาสายซอสและการพับตัวตอนตกถ้วยชัด
```

---

## P1 — เรื่องเล่าและความน่าเชื่อ

```yaml
id: A09-PLACE-ILLUSTRATION (HY / MC / CK)
status: needed
use_in: แถบภาพบนฉลาก (A02) และพื้นหลังเบา ๆ ของแต่ละบทใน S2
priority: P1
kind: vector_or_original_illustration
deliver_per_place:
  - A09-<SKU>_label_band.png  # ~1.62:1, ≥ 1600px กว้าง, ขอบเฟดเข้ากระดาษได้
  - A09-<SKU>_layers/*.png    # แยกชั้น ฟ้า / ฉากไกล / ฉากใกล้ (โปร่งใส) สำหรับ parallax 2.5D, 2400×1600
source: วาดจากภาพที่เจ้าของถ่าย หรือภาพอ้างอิงสถานที่ที่ตรวจแล้ว
must_not_add: landmark ที่ยังไม่ยืนยัน (เช่น หอนาฬิกาใน concept หาดใหญ่), ตัวอักษร
fallback: crop ภาพสถานที่จากฉลาก concept
acceptance: เจ้าของยืนยันว่าเป็นภาพของที่นั้นจริง
```

```yaml
id: A10-KITCHEN (3 ภาพ) — พักไว้: เจ้าของยังไม่เปิดเผยผู้ปรุง
status: needed — ต้องได้ภาพจริงและความยินยอม
use_in: (อนาคต) ส่วนเบื้องหลังการปรุง
priority: P1
kind: real_photo
ratio: 4:5
minimum_pixels: [1600, 2000]
note: เว็บตัดยอดภาพเป็นทรงหลังคาบ้าน (ตัด 13% บนสุดที่มุม) — ให้สิ่งสำคัญอยู่กลางภาพ
composition: ไม่ต้องเห็นหน้า ใช้มือ/วัตถุดิบ/ครัวได้; อย่างน้อยเป็นมือที่สะอาดกำลังเลือกวัตถุดิบ, เตรียม, ชิมด้วยช้อน; พื้นที่ครัวจริง
must_not_add: เชฟปลอม, โรงงาน, ห้องแล็บ, ภาพ AI ของผู้ปรุงจริง
fallback: ช่องเว้นว่างมีคำบอก (ตอนนี้ใช้อยู่)
acceptance: เจ้าของอนุมัติทุกภาพก่อนใช้
```

```yaml
id: A11-SAUCE-SAMPLE (HY / MC / CK)
status: needed
use_in: ปรับสีและความข้นของซอสใน 3D และทุกภาพ
priority: P1
kind: real_photo
deliver_per_sku:
  - A11-<SKU>_spoon.jpg       # ซอสในช้อน ใต้แสงกลางวันขาว มี gray card ในภาพ
  - A11-<SKU>_drip.jpg        # ซอสหยดจากช้อน เห็นความข้น
  - A11-<SKU>_glass_jar.jpg   # ซอสในแก้วใส เห็นเม็ด/ชิ้นลอย
minimum_pixels: [2000, 2000]
current_web_colors: HY base #c5501f · MC #8f9c33 · CK #7a2a12 (เดาจาก concept)
acceptance: ส่งค่าสี hex ที่วัดได้มาด้วยถ้าทำได้
```

```yaml
id: A12-SET-TABLE
status: needed
use_in: S5 ชุดซอส (แทนภาพ concept 3 ขวด) และ S6 ปิดท้าย
priority: P1
kind: generated_concept_or_real_photo
ratio: 16:9 และ 4:5
minimum_pixels: [2400, 1350]
composition: 3 ขวดเรียงบนโต๊ะอบอุ่น + ถ้วยจิ้ม 3 สี + มื้อที่ปรุงสุก, เว้นพื้นที่ขวาสำหรับข้อความ; เวอร์ชัน 4:5 สำหรับมือถือ
must_not_add: กล่อง/บรรจุภัณฑ์ที่ยังไม่ได้ทดสอบ (ถ้าใส่ต้องระบุว่าเป็น concept), ของแถมที่ยังไม่มี
text_in_image: none (ยกเว้นฉลาก A02)
fallback: hero-desktop concept ที่ลบข้อความแล้ว
```

---

## P2 — ก่อนเปิดสาธารณะ (Gate B)

| ID | ขออะไร | ใช้ทำอะไร |
|---|---|---|
| A13 | ภาพสูตร/เมนู หลังสูตรผ่านการทดสอบ, 4:5 1600×2000, เครื่องเคียงอยู่ในถ้วยแยก | S4 เติมอีกนิด |
| A14 | ภาพขวดจริง หน้า/ข้าง/หลัง/บน, ขนาดจริง (มม.), รายละเอียดฝา, ข้อความฉลากหลังจริง | หมุนขวด 360° ได้จริง, ฉลากหลัง |
| — | ข้อมูล: ปริมาณสุทธิ, ส่วนประกอบ, สารก่อภูมิแพ้, การเก็บรักษา, อายุก่อน/หลังเปิด, ราคา, รอบส่ง/พื้นที่, ช่องทางติดต่อ | เติมแทน "รอยืนยัน" ใน `data/products.json` (ส่งเป็น JSON ได้เลย) |

## ไม่ได้ขอในรอบนี้
- วิดีโอ Higgsfield / Seedance (V01–V03) — ยังไม่จำเป็นต่อ vertical slice; ถ้าจะทำ ต้องแจ้งราคา/โควตาก่อน
- ภาพหรือเสียงสังเคราะห์ของผู้ปรุงหรือเจ้าของ — ห้าม
