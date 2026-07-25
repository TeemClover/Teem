# YYY Studio OS

แอปจัดการโปรดักชันสำหรับช่องวิดีโอสั้น 3 ภาษา (ไทย / 简体中文 / 日本語)
ของจักรวาล **The YYY Diary** — เหยาเหยา (瑶瑶) × ยูริ (ユリ) × ยู (ตากล้อง POV)

- **ออฟไลน์ 100%** — ไม่เรียก API ภายนอก ทุกโมดูลเป็น template/rule logic
- **สแตก:** Python 3.11+, Streamlit, SQLite (ไฟล์เดียว), pandas
- **UI ภาษาไทยทั้งหมด** เนื้อหา 3 ภาษาเป็นอักษรแม่เท่านั้น — **ไม่มี Pinyin/Romanization**

## โมดูล

| หน้า | ทำอะไร |
|---|---|
| 🏠 แดชบอร์ด | ตัวเลขรวม: ตอนทั้งหมด, ฟุตในคลัง, HIGH VALUE assets, การใช้ซ้ำสะสม + ปุ่มโหลดข้อมูลตัวอย่าง |
| 🎬 วางแผนถ่าย (Smart Shoot) | เลือกโลเคชัน (12 แห่ง) → ได้ HOOK ตลกสถานการณ์ + MICRO-SCRIPT 8-12 บรรทัด 3 ภาษา + B-roll checklist แล้วบันทึกเป็นตอนได้ทันที |
| 🗄️ คลังฟุต (Evergreen) | เพิ่ม/ค้นหา/กรองฟุต — ฟุตคู่ (duo) ติดป้ายทอง **[HIGH VALUE ASSET]** อัตโนมัติ |
| 🔍 จับคู่บท (Matcher) | วิเคราะห์บท (keyword 3 ภาษา) → แนะนำ `REUSE:` ฟุตเก่าสูงสุด 3 ตัวเลือกต่อซีน HIGH VALUE มาก่อนเสมอ |
| 🚀 ส่งออก (Omnichannel) | สร้างโครงโฟลเดอร์ตอน + metadata 4 แพลตฟอร์ม (TikTok/Douyin/IG/FB) พร้อม export .txt |

## ติดตั้งและรัน

ต้องมี Python 3.11 ขึ้นไป (`python3 --version`)

```bash
cd yyy
python3 -m venv .venv          # แนะนำ (ข้ามได้ถ้าจะลงใน python หลัก)
source .venv/bin/activate
pip install -r requirements.txt && streamlit run app.py
```

เบราว์เซอร์จะเปิด `http://localhost:8501` อัตโนมัติ
ครั้งแรกให้กดปุ่ม **"โหลดข้อมูลตัวอย่าง"** ที่หน้าแดชบอร์ด เพื่อนำเข้าฟุต Reaction Bank 30 รายการ

## โครงสร้างโปรเจกต์

```
yyy/
├── app.py                     # App shell + แดชบอร์ด
├── requirements.txt
├── core/
│   ├── canon.py               # ตัวละคร กฎจักรวาล อารมณ์มาตรฐาน keyword dict
│   ├── schema.sql             # สคีมา SQLite (รันอัตโนมัติครั้งแรก)
│   └── db.py                  # ชั้นเชื่อมต่อฐานข้อมูล
├── modules/
│   ├── smart_shoot.py         # MODULE 1: แผนถ่าย
│   ├── asset_db.py            # MODULE 2: คลังฟุต
│   ├── script_matcher.py      # MODULE 2: จับคู่บท
│   └── omnichannel.py         # MODULE 3: โฟลเดอร์ + metadata
├── data/
│   ├── seed_locations.json    # โลเคชัน 12 แห่ง
│   ├── seed_hooks.json        # คลัง hook/บท 3 ภาษา/B-roll ต่อ archetype
│   └── seed_footage_demo.json # ฟุตตัวอย่าง 30 รายการ (Reaction Bank)
├── projects/                  # โฟลเดอร์ตอน (สร้างอัตโนมัติเมื่อบันทึกตอน)
└── yyy_studio.db              # ฐานข้อมูล (สร้างอัตโนมัติเมื่อเปิดแอปครั้งแรก)
```

## แบ็กอัพฐานข้อมูล (ระบบ 3-2-1)

ข้อมูลทั้งหมดอยู่ในไฟล์เดียว: `yyy_studio.db`

- **3 สำเนา:** ไฟล์งานจริง + สำเนาอีก 2 ชุด
- **2 สื่อ:** เช่น SSD ในเครื่อง + external drive
- **1 นอกสถานที่:** cloud drive หรือฝากไว้อีกที่หนึ่ง

```bash
# วิธีแบ็กอัพที่ปลอดภัย (ปิดแอปก่อน หรือใช้คำสั่ง .backup ของ sqlite)
sqlite3 yyy_studio.db ".backup 'backup/yyy_studio_$(date +%Y%m%d).db'"

# หรือคัดลอกตรงๆ เมื่อปิดแอปแล้ว
cp yyy_studio.db ~/Backups/yyy_studio_$(date +%Y%m%d).db
```

กู้คืน: วางไฟล์แบ็กอัพกลับมาแทน `yyy_studio.db` แล้วเปิดแอปใหม่
โฟลเดอร์ `projects/` ควรแบ็กอัพด้วยถ้าเก็บไฟล์วิดีโอจริงไว้ข้างใน

## กฎเหล็กของระบบ

1. ทุกโพสต์ทุกแพลตฟอร์มต้องมี `#YYY`
2. Douyin ห้ามมีอักษรละตินยกเว้นคำว่า YYY
3. ห้ามมี Pinyin/Romanization ใน UI, ข้อมูล และคอนเทนต์ที่สร้าง
4. ฟุตคู่ (duo_in_frame=1) = HIGH VALUE ASSET — ระบบคำนวณเอง ผู้ใช้แก้ตรงๆ ไม่ได้
5. ชุด Signature เท่านั้น เพื่อให้ฟุตตัดข้ามตอนได้ตลอดกาล
