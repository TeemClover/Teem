# AI ใส่ซอส — Backup หน้าเรียนออนไลน์ 6 บทก่อนตัด

วันที่ Backup: 2026-08-06  
สถานะ: หน้าเต็มสำหรับนำไปพัฒนาคอร์ส Offline ภายหลัง

## Commit ที่ล็อกไว้

`53fa5a65bc68c4c6c6de351c545ca6bc3c098846`

หน้าเรียนทั้ง 6 บทก่อนตัดสามารถเรียกคืนจาก Commit นี้ได้ครบทุกบรรทัด

## ไฟล์และ Blob SHA

| บท | ไฟล์ | Blob SHA |
|---|---|---|
| 1 | `classroom/free-ai.html` | `9a5a3dc8c6dbde40153134a3a14b678ed95e55e7` |
| 2 | `classroom/image-ai.html` | `66c632312c1821d677a4968f2ed279f183ef3de6` |
| 3 | `classroom/clip-ai.html` | `26be9a8a34b8fc0bfa673a969717b05956f7858e` |
| 4 | `classroom/notebooklm.html` | `5e751c173a185d061bbdd3a601ea3e1091cd9424` |
| 5 | `classroom/prompts.html` | `84025171845ca1e90f0dec305c2390cb8399f1a0` |
| 6 | `classroom/first-web.html` | `002305c28bb9e9e183e7484240179a0e51d52813` |

## วิธีเรียกคืน

```bash
git checkout 53fa5a65bc68c4c6c6de351c545ca6bc3c098846 -- \
  classroom/free-ai.html \
  classroom/image-ai.html \
  classroom/clip-ai.html \
  classroom/notebooklm.html \
  classroom/prompts.html \
  classroom/first-web.html
```

หรือเปิดดูไฟล์ใดไฟล์หนึ่งโดยไม่ Restore:

```bash
git show 53fa5a65bc68c4c6c6de351c545ca6bc3c098846:classroom/free-ai.html
```

## กฎการใช้ Backup

- หน้าเต็มชุดนี้ไม่ใช่ฉบับออนไลน์หลักหลังการตัด
- เก็บรายละเอียด ตัวอย่าง เครื่องมือ และคำอธิบายยาวไว้ต่อยอดคอร์ส Offline
- ฉบับออนไลน์ใหม่เน้น Step-by-step, ทำ Quest จบ และได้ของกลับบ้านเร็วที่สุด
