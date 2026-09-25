# ขอภาพสำหรับบ้าน 3D (`/tour/`) — prompt สำหรับ GPT

ภาพในบ้านตอนนี้ยืมมาจากหน้าอื่น โค้ดครอปให้เต็มกรอบเสมอ **ไม่ยืดภาพแล้ว** แต่บางรูปสัดส่วนต่างจากกรอบมาก
พอครอปแล้วเนื้อหาหาย รายการด้านล่างคือรูปที่ควรทำใหม่ให้พอดีกรอบ

## วิธีใส่ภาพ (ไม่ต้องแก้โค้ด)

1. เจนภาพตาม prompt แล้วส่งออกเป็น `.webp` (หรือ `.jpg`) ตามขนาดในตาราง
2. วางไฟล์ไว้ที่ `tour/art/` ตามชื่อไฟล์ในตาราง
3. เพิ่มชื่อ slot กับชื่อไฟล์ใน `tour/art/manifest.json` เช่น
   ```json
   { "slots": { "forge-cover": "forge-cover.webp", "table-map": "table-map.webp" } }
   ```
4. เปิดบ้านใหม่ ภาพใหม่จะขึ้นแทนภาพเดิมทันที ถ้ายังไม่ใส่ บ้านใช้ภาพเดิม (ครอปให้พอดี) ต่อไปได้

โทนของบ้าน: เขียว `#1D6B3D` · เขียวใบโคลเวอร์ `#2E9E5B` · ทอง `#E9B949` · ครีม `#FBF6EC` · ส้มกระเบื้อง `#D2683F`
ทุกภาพ: ไม่มีโลโก้แบรนด์อื่น ไม่มีลายน้ำ ตัวอักษรไทยในภาพต้องสะกดถูก (ถ้า GPT เขียนไทยเพี้ยน ให้ขอภาพแบบไม่มีตัวอักษร)

| ลำดับ | slot / ชื่อไฟล์ | ใช้ที่ไหนในบ้าน | สัดส่วน | ขนาดแนะนำ | ภาพที่ใช้อยู่ตอนนี้ และปัญหา |
|---|---|---|---|---|---|
| 1 | `forge-cover` → `forge-cover.webp` | ปกหนังสือบนโต๊ะมุมหนังสือ (ห้องนั่งเล่น) | 2:3 แนวตั้ง | 1024×1536 | `img/card-forge.jpg` 4:3 แนวนอน ครอปเหลือแค่กลางภาพ |
| 2 | `walkthrough-cover` → `walkthrough-cover.webp` | ปกหนังสือบนโต๊ะมุมหนังสือ | 2:3 แนวตั้ง | 1024×1536 | `img/col-walkthrough.webp` 1.9:1 กว้างมาก ครอปแล้วเหลือนิดเดียว |
| 3 | `table-map` → `table-map.webp` | แผนที่ใต้เข็มทิศบนโต๊ะเกม | 4:3 แนวนอน | 1536×1152 | `frontdoor/art/underpaper-valley-mobile.webp` แนวตั้ง 3:4 ครอปเสียทรง |
| 4 | `teem-portrait` → `teem-portrait.webp` | กรอบรูปเหนือโซฟา (กดแล้วไป `/resume/`) | 4:5 แนวตั้ง | 1024×1280 | `img/party-teem.webp` จัตุรัส 320px ความละเอียดต่ำ |
| 5 | `course-poster` → `course-poster.webp` | รูปบนป้ายประกาศคอร์สในห้องเรียน | 3:2 แนวนอน | 1536×1024 | `img/classroom-hero.jpg` 8:3 กว้างมาก ครอปเสียองค์ประกอบ |
| 6 (ไม่บังคับ) | `teambook-cover` → `teambook-cover.webp` | หน้าสมุด TeamBook ที่เปิดอยู่บนโต๊ะห้องคอม | 11:8 แนวนอน | 1408×1024 | ตอนนี้วาดด้วยโค้ด ใช้ได้แล้ว ทำใหม่ถ้าอยากให้สวยขึ้น |

จอในห้องคอม (X-VISOR, เลือกสายของคุณ, การ์ดประจำตัว) ใช้ภาพเดิมของแต่ละโปรเจกต์ สัดส่วนใกล้ 16:9 อยู่แล้ว ไม่ต้องทำใหม่

---

## 1 · `forge-cover` — ปก "เรื่องเล่าจากโรงตีเหล็ก"

```
Vertical book cover, 2:3 aspect ratio, 1024x1536. A warm, cinematic illustration of a
blacksmith's forge at night: glowing anvil, sparks rising, hammers and tongs on the wall,
an open notebook and a small green four-leaf clover charm on the workbench. Rich amber and
deep green palette, painterly editorial style, soft film grain. Leave clean space in the top
third for a title. Title text in Thai, large and clear: "เรื่องเล่าจากโรงตีเหล็ก".
Small subtitle below: "อ่านฟรี · myClover". No other text, no logos, no watermark.
```

## 2 · `walkthrough-cover` — ปก "Walkthrough"

```
Vertical book cover, 2:3 aspect ratio, 1024x1536. A friendly illustrated path that starts
as loose ingredients and handwritten notes at the bottom (a notebook, sticky notes, a sauce
bottle) and climbs step by step into a small playable game world at the top (tiny pixel-art
castle, a character, a green four-leaf clover flag). Clean modern editorial illustration,
cream background #FBF6EC with green #1D6B3D and gold #E9B949 accents. Title in English:
"Walkthrough", subtitle in Thai: "จากวัตถุดิบในหัว ถึงเกมที่เล่นได้".
No other text, no logos, no watermark.
```

## 3 · `table-map` — แผนที่ใต้เข็มทิศ

ต่อเนื่องกับหน้าแรกเดิม (หยิบเข็มทิศบนแผนที่) ถ้าได้ ให้แนบ `frontdoor/art/underpaper-valley.webp` เป็นภาพอ้างอิงสไตล์

```
Top-down view of a hand-drawn fantasy valley map on warm aged paper, 4:3 landscape,
1536x1152, meant to lie flat on a wooden game table. A river gorge winds through green
valleys, small villages, a forest, a bridge, and a little house marked with a four-leaf
clover. Ink lines with soft watercolor washes in green, teal and warm ochre. Slightly curled
paper edges, subtle fold lines. Seen perfectly from above, no perspective, no hands,
no compass (a 3D compass will sit on top), no text, no watermark.
```

## 4 · `teem-portrait` — ภาพเทมในกรอบ

**ต้องแนบรูปจริงของเทมเป็น reference** ห้ามให้ GPT เดาหน้าตา

```
Warm editorial portrait for a framed photo on a living-room wall, 4:5 vertical, 1024x1280.
Use the attached reference photo for the person's face and identity exactly. Half-body,
relaxed friendly smile, looking at the camera. Outfit: black jacket with red lining and red
panels over a completely plain white shirt. Soft window light, blurred cozy home interior
background with plants and books, gentle green and cream tones. Photographic, natural skin,
no text, no logos, no watermark.
```

## 5 · `course-poster` — รูปบนป้ายประกาศคอร์ส

```
Bright, welcoming photo-style illustration of a small modern AI class in a sunny room,
3:2 landscape, 1536x1024. A teacher at a whiteboard showing a simple flow diagram
(talk -> build -> use a source -> extend), a few adult learners with laptops, colorful
bunting flags above, a bowl of sauce on the teacher's desk as a playful prop, green
four-leaf clover accents. Cream, green #2E9E5B and warm orange palette. Leave the whiteboard
diagram as simple shapes with no readable words. No text, no logos, no watermark.
```

## 6 · `teambook-cover` (ไม่บังคับ) — หน้าสมุด TeamBook

```
An open notebook page seen from directly above, 11:8 landscape, 1408x1024. Cream paper with
faint green ruled lines, a hand-lettered heading "TeamBook", a small hand-drawn group of
friends' avatars, three checklist items drawn as simple doodles (checkbox shapes only,
no readable text), washi tape corners, a green four-leaf clover sticker. Clean, cheerful,
flat illustration, no perspective, no watermark.
```
