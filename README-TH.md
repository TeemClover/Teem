# myClover Entry V4.5 — RPG Main Quest Tracker

อัปโหลด:
- `index.html`
- `hall.html`

## Main Quest Tracker
Section แรกเปลี่ยนจากการ์ดใหญ่ 3 ใบเป็น Quest Tracker แบบ RPG

Tracker จะหาเควสที่ค้างอยู่แล้วแนะนำเพียงจุดเดียว:
1. ตอนแรกของ WHY AI? ที่ยังไม่ได้อ่าน
2. บทเรียนแรกที่ยังไม่ได้เรียน
3. การสร้างและบันทึกการ์ด
4. Main Quest Completed
5. Secret Quest หากผู้เล่นค้นพบสมุดเล่มเก่า
6. Secret Ending Unlocked เมื่อเคลียร์ True End

## Progress keys
- `mc_read` — การ์ตูน 7 ตอน
- `mc_learn` — ห้องเรียน 6 บท
- `mc_opened=1` — บันทึกการ์ดแล้ว
- `mc_nb_seen=1` — พบสมุดเล่มเก่า
- `mc_nb_restored=1` — ซ่อมสมุดแล้ว
- `mc_secret_end=1` — อ่านบทส่งท้ายถึงรหัสสุดท้ายแล้ว
- `mc_titles` มี `GLHF` — ชนหมัด รับ Platinum Trophy และตราสุดท้ายแล้ว

## Final states
### Main Quest Completed
แสดงเมื่อ WHY 7/7 + HOW 6/6 + PROOF 1/1

### Secret Ending Unlocked
แสดงเมื่อ:
- ซ่อมสมุดแล้ว
- อ่าน Secret Ending จบแล้ว
- ได้ตรา GLHF แล้ว

สถานะ True End แสดงถาวรทุกครั้งที่กลับหน้า Hall
