# เริ่มจาก Chat ได้ ทั้งบัญชี Free และเสียเงิน

## ChatGPT Free

เปิด https://chatgpt.com แล้วเริ่ม Chat ใหม่ แนบ Source หรือไฟล์ที่เลือก ขอเอกสาร / ตารางให้ดาวน์โหลด และสร้างภาพได้ตามโควตาของบัญชี งานอัปโหลด วิเคราะห์ข้อมูล และสร้างภาพมีโควตาแยกกัน ให้ทำทีละงานตามข้อความในแอป

## Claude Free

เปิด https://claude.ai แล้วเริ่ม Chat ใหม่ แนบไฟล์ที่ต้องใช้ ขอ .docx / .xlsx / .md ให้ดาวน์โหลดได้ตามโควตา หากไม่เห็นเครื่องมือสร้างไฟล์ ให้ดู Settings → Capabilities → Code execution and file creation การสร้างไฟล์ใน Chat ไม่ต้องเข้า Claude Code ส่วน Cowork เป็นเส้นทางสำหรับแผนเสียเงินบน Desktop

## ในคลาสนี้

เลือก “ChatGPT / Claude Free · Chat” ในแต่ละบทแล้วคัดลอกพรอมป์ ผู้เรียนเลือกไฟล์จากเครื่อง แนบใน Chat ดาวน์โหลดผล และจัดเก็บในโฟลเดอร์เอง คนที่มี Work / Cowork ใช้ตัวเลือกตามสิทธิ์บัญชีได้

หากเครื่องมือสร้างไฟล์ไม่พร้อม ขอเอกสารเป็น Markdown คัดลอกบันทึกเป็น .md แบบ plain text UTF-8 หรือตารางเป็น TSV วางใน Excel แล้ว Save As เป็น .xlsx ไม่เปลี่ยนนามสกุลข้อความให้เป็น .xlsx หากโควตาหมดให้เก็บคำสั่งและไฟล์ไว้ทำต่อ

เอกสารทางการ: [ChatGPT Free](https://help.openai.com/en/articles/9275245-using-chatgpt-with-images) · [Claude สร้างไฟล์ รวม Free](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude)

---

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
