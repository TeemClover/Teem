# /share · หน้าเดียวที่ X-VISOR ส่งให้ลูกค้า

- `/share/?ref=CODE` ปุ่ม 2x2: รูทีน (`/routinex/`) · เซอเคิล (`/xircle/`) · รวมรีวิว (`/review/`) · สั่งซื้อ (`https://buy.xircle.health/?ref=CODE&openExternalBrowser=1`)
- `/share/code/` X-VISOR ใส่ Code แล้วกด "สร้าง Link" ได้ลิงก์ `/share/?ref=CODE` พร้อมปุ่มคัดลอก ส่งต่อ และเปิดดู

## กติกาของรหัส (`ref.js`)

- `ref` ถูกกรองเหลือ `A–Z a–z 0–9 - _` ยาวไม่เกิน 32 ตัว แล้วส่งต่อไปที่ปุ่มสั่งซื้อเท่านั้น
- หน้า `/share/` ไม่แก้ตัวพิมพ์ของรหัสที่มากับลิงก์ ส่วนช่องกรอกใน `/share/code/` ทำเป็นตัวพิมพ์ใหญ่ และรับลิงก์ที่มี `?ref=` ติดมาได้
- รหัสล่าสุดถูกจำไว้ในเครื่องของลูกค้า (`localStorage` คีย์ `myclover.share.ref`) ถ้าเปิด `/share/` แบบไม่มีรหัส ปุ่มสั่งซื้อยังใช้รหัสเดิม รหัสในลิงก์มาก่อนรหัสที่จำไว้เสมอ
- ไม่มีรหัสเลย ปุ่มสั่งซื้อพาไป `https://buy.xircle.health/?openExternalBrowser=1`

## ไฟล์

`index.html` `share.css` `share.js` `ref.js` `code/index.html` `code/code.js` `assets/`

- `assets/routinex-box.webp` `assets/routinex-logo.webp` ย่อจาก `/routinex/assets/`
- `assets/xircle-band.webp` `assets/xircle-logo.svg` ย่อจาก `/xircle/assets/`
- `assets/og-share.jpg` ภาพพรีวิวตอนส่งลิงก์ 1200×630 จัดวางด้วย HTML จากภาพสองชุดข้างบน
- ตัวอักษรใช้ไฟล์ของ `/xircle/assets/fonts/`

ตรวจ: `node --test tests/share/share.test.mjs` · แก้ CSS หรือ JS แล้วเปลี่ยนเลข `?v=` ในทั้งสองหน้า
