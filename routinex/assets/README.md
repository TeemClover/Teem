# routinex/assets

ภาพของหน้า `/routinex/` และ `/routinex/start/`

| ไฟล์ | คืออะไร | ที่มา |
| --- | --- | --- |
| `sachet-gus.webp` `sachet-protein.webp` `sachet-coreduo.webp` | ซองสินค้าจริง พื้นโปร่ง | Source ของ CloverX (`habix-*-sachet.png` ชุด Product) ครอปและย่อเท่านั้น ไม่ได้แก้ภาพ |
| `box-closed.webp` `box-open.webp` | กล่อง RoutineX ปิดและเปิด | Source `pd-03-routinex` ไดคัตเอาลายตารางออก |
| `scene-a.webp` `scene-b.webp` `scene-c.webp` `scene-d.webp` | ฉากหลังของการ์ด A B C D ในส่วน "เปิดกล่อง" | สร้างด้วย ChatGPT (Create image) 25 พ.ย. 2026 ในภาพไม่มีบรรจุภัณฑ์ ไม่มีโลโก้ ไม่มีตัวหนังสือ |
| `poster-*.webp` | ปกคลิปโค้ชซิง | เฟรมจากคลิปทางการบน YouTube |
| `logo-*.webp` `og-*.jpg` | โลโก้และภาพแชร์ | Source `lg-03-routinex` |

## กติกา

- **ตัวสินค้าต้องเป็นภาพจริงเสมอ** ฉากเจนใช้เป็นพื้นหลังเท่านั้น แล้ววางซองจริงซ้อนด้วย HTML ห้ามให้โมเดลวาดซองหรือตัวหนังสือบนซอง
- หน้าเว็บมีป้าย "ฉากหลังสร้างด้วย AI · ซองคือภาพสินค้าจริง" บนทุกการ์ดที่ใช้ฉากเจน
- ตัวเลขและชื่อส่วนผสมบนการ์ด มาจากสิ่งที่พิมพ์บนซอง ห้อง Absorb / Build และหน้า `xircle/doc/habix/` คำพูดอยู่ในกรอบ `xircle/doc/xvisor/claims/`
- ซอง Protein HMB+ ในไฟล์ต้นทางสะกดว่า "Protien HMB+" (ตรงกับที่เห็นในคลิป Day 0) หน้าเว็บใช้ภาพตามต้นทาง ส่วนข้อความพิมพ์ว่า Protein HMB+
- ต้นฉบับ PNG ของฉากเจนอยู่นอก repo ที่เครื่องของทีม (`~/Claude/routinex-gen/scenes/`)
