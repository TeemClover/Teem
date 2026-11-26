# /share · หน้าเดียวที่ X-VISOR ส่งให้ลูกค้า

- `/share/?ref=CODE` ปุ่ม 2x2: รูทีน (`/routinex/`) · เซอเคิล (`/xircle/`) · รวมรีวิว (`/review/`) · สั่งซื้อ (`https://buy.xircle.health/?ref=CODE&openExternalBrowser=1`)
- `/share/code/` X-VISOR ใส่ Code แล้วกด "สร้าง Link" ได้ลิงก์ `/share/?ref=CODE` พร้อมปุ่มคัดลอก ส่งต่อ และเปิดดู
- `/share/slide/` สไลด์วิธีใช้ 10 ภาพ กดปุ่ม ลูกศรคีย์บอร์ด ปัด หรือแตะครึ่งจอเพื่อเปลี่ยน ลิงก์ตรงด้วย `#3` มีปุ่มบันทึกภาพ (JPG 1920×1080) และเต็มจอ ภาพอยู่ใน `slide/img/` ต้นฉบับ HTML ของสไลด์อยู่นอก repo ที่ `~/Claude/share-launch-slides/source/slides.html` บนเครื่อง M2 ของ Teem

## กติกาของรหัส (`ref.js`)

- `ref` ถูกกรองเหลือ `A–Z a–z 0–9 - _` ยาวไม่เกิน 32 ตัว แล้วส่งต่อไปที่ปุ่มสั่งซื้อเท่านั้น
- หน้า `/share/` ไม่แก้ตัวพิมพ์ของรหัสที่มากับลิงก์ ส่วนช่องกรอกใน `/share/code/` ทำเป็นตัวพิมพ์ใหญ่ และรับลิงก์ที่มี `?ref=` ติดมาได้
- รหัสล่าสุดถูกจำไว้ในเครื่องของลูกค้า (`localStorage` คีย์ `myclover.share.ref`) ถ้าเปิด `/share/` แบบไม่มีรหัส ปุ่มสั่งซื้อยังใช้รหัสเดิม รหัสในลิงก์มาก่อนรหัสที่จำไว้เสมอ
- ไม่มีรหัสเลย (ไม่มีในลิงก์และไม่เคยจำไว้) ปุ่มสั่งซื้อใช้รหัสของบริษัท `CLOVERX` → `https://buy.xircle.health/?ref=CLOVERX&openExternalBrowser=1` (ตั้งที่ `DEFAULT_REF` ใน `ref.js` และ `href` ของปุ่มใน `index.html`) ป้ายรหัสบนปุ่มขึ้นเฉพาะรหัสของ X-VISOR

## ไฟล์

`index.html` `share.css` `share.js` `ref.js` `code/index.html` `code/code.js` `assets/`

โทนสี: ขาวฟ้าของ Clover X (ฟ้าโลโก้ `#4388FD`, น้ำเงินเข้ม `#0E1B3D`) ตาม Teem 26 พ.ย. · `assets/cloverx-logo.png` ไดคัตจาก Source `cloverx-logo-01.jpg`

- `assets/routinex-box.webp` `assets/routinex-logo.webp` ย่อจาก `/routinex/assets/`
- `assets/xircle-band.webp` `assets/xircle-logo.svg` ย่อจาก `/xircle/assets/`
- `assets/og-share.jpg` ภาพพรีวิวตอนส่งลิงก์ 1200×630 จัดวางด้วย HTML จากภาพสองชุดข้างบน
- ตัวอักษรใช้ไฟล์ของ `/xircle/assets/fonts/`

ตรวจ: `node --test tests/share/share.test.mjs` · แก้ CSS หรือ JS แล้วเปลี่ยนเลข `?v=` ในทั้งสองหน้า
