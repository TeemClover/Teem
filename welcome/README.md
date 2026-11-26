# /welcome · ต้อนรับ X-PLORER

หน้าต้อนรับคนที่เพิ่งเข้ามาเป็นตัวแทน CloverX ขั้นแรก (X-PLORER) บอกความหมายของชื่อ แผนใหม่ และทางไปสอบเป็น X-VISOR
`noindex` ส่งเป็นลิงก์เท่านั้น · `https://www.myclover.com/welcome/?ref=CODE` จะขึ้นรหัสคนชวนในส่วน "เริ่มวันนี้"

## ตั้งค่าใน `index.html` (ไม่ต้องแก้ JS)
- LINE ของทีม: ใส่ `data-line="https://lin.ee/..."` ที่ `#cta-line` ปุ่ม LINE จะขึ้นเอง (รับเฉพาะ lin.ee / line.me)
- คลิปพี่ทอม: ใส่ id YouTube 11 ตัวที่ `#film data-youtube="..."` กรอบคลิปจะขึ้นใต้ Reach · Read · Result
- เปลี่ยนชื่อขั้นแรก: ค้นแทนที่ `X-PLORER` ใน `index.html` เทสต์ และ `assets/og-welcome.jpg` (ภาพพรีวิวลิงก์ต้องทำใหม่)

## ภาพ
`assets/*.webp` ภาพการ์ตูนแนว Pixar ตัวละครเดียวกันทุกภาพ เจนด้วย ChatGPT (26 พ.ย. 2026) 1536×1024 webp q74
`assets/og-welcome.jpg` 1200×630 จัดจาก `hero.webp` + ข้อความ HTML แล้วจับภาพด้วย Chrome

## ตรวจ
`node --test tests/welcome/welcome.test.mjs`
