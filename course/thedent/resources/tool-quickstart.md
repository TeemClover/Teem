# ใช้เครื่องมือกับไฟล์ของเรา

Claude Cowork ช่วยอ่านและจัดไฟล์ในโฟลเดอร์ ส่วน ChatGPT ใช้ Chat เพื่อคุย ร่าง และสร้างภาพ หรือ Work เพื่อทำงานกับไฟล์ที่เปิดตรวจและแก้ต่อได้

ทำโฟลเดอร์เรียน source / input / output วาง clinic-public-source.md ใน source ภาพและไฟล์รอบนี้อยู่ใน input ผลงานเก็บใน output

ใช้เฉพาะไฟล์และฟิลด์ที่ได้รับอนุญาต ตัดตัวระบุบุคคลที่ไม่จำเป็นออก การใช้ AI อาจประมวลผลผ่านผู้ให้บริการหรือคลาวด์ตามเครื่องมือและโหมด

## Claude Cowork

1. เปิด Claude Desktop แล้วเลือก Cowork ในหน้าสร้างงาน
2. เลือกโฟลเดอร์เรียนและให้สิทธิ์เข้าถึงตามที่แอปขอ
3. บอกชื่อไฟล์ต้นทางและตำแหน่ง output เปิด Desktop ค้างไว้ระหว่างทำงานกับไฟล์ในเครื่อง

~~~text
อ่าน source/clinic-public-source.md สรุปชื่อสาขา เบอร์ และ LINE จากไฟล์ เก็บ URL ที่มา แล้วบันทึกเป็น output/quick-start.docx พร้อมบอกตำแหน่งไฟล์
~~~

## ChatGPT Chat / Work

**Work บน Desktop:** เลือก Work และให้สิทธิ์ไฟล์หรือโฟลเดอร์ที่ต้องใช้ตามที่แอปขอ ให้บันทึกผลใน output

**Chat หรือ Work บนเว็บ:** ผู้เรียนเปิดไฟล์จากเครื่องแล้วแนบ ระบุชนิดไฟล์ และดาวน์โหลดผลเก็บใน output

~~~text
อ่าน clinic-public-source.md ที่แนบ สรุปชื่อสาขา เบอร์ และ LINE จากไฟล์ เก็บ URL ที่มา แล้วสร้าง quick-start.docx ให้ดาวน์โหลด
~~~

เลือก ChatGPT สำหรับสร้างภาพ แล้วดาวน์โหลดภาพจริงเป็น image.png งาน Word/Excel ใช้เส้นทางที่เข้าถึงต้นทางและส่งไฟล์กลับได้ในบัญชีของตนเอง

## ลองแก้หนึ่งจุด

เปิด quick-start.docx แล้วสั่ง “ปรับเป็นตารางชื่อสาขา / เบอร์ / LINE เก็บข้อมูลเดิมและบันทึกฉบับใหม่” จากนั้นเปิดไฟล์หลังแก้

หากไฟล์ยังไม่มา ให้ขอไฟล์ดาวน์โหลดอีกครั้ง หรือตรวจโฟลเดอร์และสิทธิ์กับผู้ช่วย สำหรับ workbook ดาวน์โหลด .xlsx โดยตรงเพื่อเก็บหลายชีตครบ

## เอกสารทางการ

- [เริ่ม Claude Cowork](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
- [เริ่ม ChatGPT Work](https://learn.chatgpt.com/docs/get-started-with-work)
- [เลือก Chat, Work และเครื่องมืออื่น](https://learn.chatgpt.com/docs/use-chatgpt)
- [สร้างภาพใน ChatGPT](https://learn.chatgpt.com/docs/image-generation)
