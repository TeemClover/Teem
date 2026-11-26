# ฟิล์มหน้า /welcome · ภาพหลัก 9 ภาพ → คลิป Seedance 8 คลิป

ฟิล์มเล่าตามสคริปต์ยาวของพี่ทอม (xvisor-invite-script-long-v1) เป็นฉากต่อเนื่อง
ภาพท้ายของฉากหนึ่ง = ภาพแรกของฉากถัดไป (seam frame) คลิปจึงต่อกันเป็นเรื่องเดียวไม่มีรอยตัด

| ฉาก | ช่วงในสคริปต์ | เริ่ม → จบ | การเคลื่อนกล้อง (prompt Seedance) |
|---|---|---|---|
| hook | ฮุก 0:00–0:30 | k0 ถนนนีออน → k1 ลูกค้าลอยหาย ประภาคารเปิดไฟ | screens drift up like lanterns, customer bubbles float away, slow tilt up to the sky, lighthouse beam turns on |
| tom | ช่วง 1 ผมเป็นใคร | k1 → k2 ห้องบนประภาคาร ส่งเข็มทิศโคลเวอร์ | camera flies over the sea to the lighthouse and through its window, warm lantern light |
| pain | ช่วง 2 บ้านบนที่ดินคนอื่น | k2 → k3 บ้านบนแท่นจอมือถือที่แตก | the room dissolves into a stormy sky, the house rises onto a floating screen platform that tilts and cracks |
| why | ช่วง 3 Reach · Read · Result | k3 → k4 เนินเขาตอนเช้า ขึ้นชั่ง แสงวงรอบตัว | storm clears to sunrise, platform falls away, the explorer lands on a green hill, rings of light rise |
| product | ช่วง 4 RoutineX A·B·C·D | k4 → k5 กล่องเปิด การ์ด 4 ใบลอย | camera follows the light into a kitchen, the box lid lifts, four glowing cards float out |
| story | ช่วง 5 จากคนขายของเป็นคนดูแล | k5 → k6 ดูแลครอบครัวเพื่อนบ้าน | cards fly out of the window to a neighbour's home, explorer kneels to show a family their numbers |
| ai | ช่วง 6 เครื่องมือ AI | k6 → k7 หุ่นจัดงานให้ นักสำรวจพักจิบชา | holograms multiply around the robot, the explorer sits back with tea |
| start | CTA สองทาง | k7 → k8 ทางแยก ประตูทองบนเนิน | camera pulls out of the window to a fork in the trail and a golden gate at sunrise |

## ตั้งค่าที่แนะนำ
Seedance 2.5 · mode `omni_reference` · start_image = kN · end_image = kN+1 · 9:16 · 5 วินาที · 720p · ไม่เอาเสียง
- ราคาที่ Higgsfield ตอบ (26 พ.ย. 2026): 35 เครดิต/คลิป · ร่าง 480p (`draft: true`) 15 เครดิต/คลิป
- ครบ 8 ฉาก: ร่าง 120 เครดิต แล้วจริง 280 เครดิต · ยอดคงเหลือตอนเช็ก 966.91
- ต้องแสดง prompt + ราคาทุกช็อต และรอ Teem อนุมัติก่อนกดเจนทุกครั้ง

## ทำแล้ว
- hook (26 พ.ย. 2026): Google Flow · โหมดเฟรม · Omni 1.2 Flash · 9:16 · 720p · 8 วิ · x1 = 24 เครดิต Flow
  ภาพเริ่ม = ภาพเปิดใหม่จาก GPT (ครอป 9:16) · ภาพจบ = k1 ครอป 9:16 · แตกเฟรม 12 fps = 96 เฟรม (4.8 MB)
  k0 = ภาพเปิดเดียวกัน k1 = เฟรมสุดท้ายของคลิป (รอยต่อกับฉาก tom ตรงพอดี) · ต้นฉบับอยู่ ~/Claude/welcome-flow/

## เอาคลิปมาใส่หน้า
1. `node tools/welcome-frames.mjs <scene> <clip.mp4>` → `welcome/film/<scene>/001.webp…`
2. ใส่จำนวนเฟรมที่ `frames` ของฉากนั้นใน `welcome/welcome.js`
3. ระหว่างที่เฟรมยังโหลดไม่ครบ หน้าใช้ภาพนิ่งซูมเข้าแล้วละลายต่อแทน (คือแบบตอนนี้)
