# YYY Studio OS — Claude Code Execution Prompt
> วิธีใช้: เปิด Claude Code CLI ในโฟลเดอร์เปล่า แล้ววางพรอมต์ทั้งบล็อกด้านล่างนี้

## สถาปัตยกรรมที่เลือก
Python 3.11+ / Streamlit / SQLite — รันด้วย `pip install -r requirements.txt && streamlit run app.py`
ออฟไลน์ 100% ไม่พึ่ง API ภายนอก / ฐานข้อมูลเป็นไฟล์เดียว แบ็กอัพตามระบบ 3-2-1 ได้ทันที

---

You are building "YYY Studio OS" — a local production management app for a trilingual short-video channel. Build it completely and autonomously. Do not ask me questions; make sensible decisions and finish.

========================================
0. NON-NEGOTIABLE RULES
========================================
- Stack: Python 3.11+, Streamlit, SQLite (sqlite3 stdlib), pandas. NO other services, NO internet dependency at runtime.
- All UI labels in Thai. All seed content in native scripts only: Thai, Simplified Chinese, Japanese.
- CRITICAL: Never output Pinyin, Romanization, or pronunciation guides anywhere in UI, data, or generated content.
- App must run with exactly: pip install -r requirements.txt && streamlit run app.py
- Every module must work offline with template/rule logic (no LLM API calls).

========================================
1. PROJECT CANON (hardcode in core/canon.py)
========================================
CHARACTERS = {
 "YY": {"name_th": "เหยาเหยา", "name_zh": "瑶瑶", "name_ja": "ヤオヤオ",
        "lang": "zh", "spice": 10, "mbti": "INTJ",
        "persona": "ดาราสาว CEO จีน เฟียส หรูหรา ปากแข็ง เผ็ดระดับ 10",
        "outfit": "ชุดกี่เพ้าโมเดิร์นสีแดง (Signature — ชุดเดิมทุกคลิป)",
        "color": "#C0392B"},
 "YR": {"name_th": "ยูริ", "name_zh": "尤莉", "name_ja": "ユリ",
        "lang": "ja", "spice": 0, "mbti": "ISFP",
        "persona": "ศิลปินสาวญี่ปุ่น อ่อนหวาน ละเอียดอ่อน กินเผ็ดไม่ได้เลย",
        "outfit": "ชุดเอิร์ธโทนสไตล์ศิลปิน (Signature — ชุดเดิมทุกคลิป)",
        "color": "#2E75B6"},
 "YOU": {"name_th": "ยู", "name_zh": "尤", "name_ja": "ユウ",
        "lang": "th", "role": "POV cameraman — ไม่เข้ากล้องเด็ดขาด เสียงเป็น VO ทีหลัง",
        "color": "#C9A227"}}
UNIVERSE_RULES = [
 "ทุกคนพูดภาษาแม่ตัวเอง เข้าใจกัน 100% ไม่มีมุกงงภาษา",
 "ยูไม่เข้ากล้อง เสียงยูอัด VO ภายหลัง แก้บทยูได้เสมอ",
 "ทุกตอนต้องมีจังหวะมองกล้องเรียก 'ยู' อย่างน้อย 2 ครั้ง (1 ครั้งใน 3 วินาทีแรก)",
 "ความขัดแย้งหลัก: เผ็ดระดับ 10 ปะทะ เผ็ดระดับ 0",
 "ชุด Signature เท่านั้น เพื่อให้ฟุตตัดข้ามตอนได้ตลอดกาล"]
HASHTAG_CORE = "#YYY"  # every platform, every post, no exceptions

========================================
2. DATABASE SCHEMA (core/schema.sql — execute on first run)
========================================
CREATE TABLE IF NOT EXISTS footage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT,
  characters TEXT NOT NULL CHECK(characters IN ('YY','YR','DUO','LINK','BROLL')),
  duo_in_frame INTEGER NOT NULL DEFAULT 0,
  high_value INTEGER GENERATED ALWAYS AS (CASE WHEN duo_in_frame=1 THEN 1 ELSE 0 END) STORED,
  location TEXT, outfit_ok INTEGER DEFAULT 1,
  emotion TEXT,
  shot_type TEXT,
  takes INTEGER DEFAULT 1, duration_sec REAL,
  spoken_line TEXT, sub_th TEXT, sub_zh TEXT, sub_ja TEXT,
  use_count INTEGER DEFAULT 0, last_used_at TEXT,
  notes TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  title_th TEXT, title_zh TEXT, title_ja TEXT,
  tier TEXT CHECK(tier IN ('A','B','C','D')),
  location TEXT, status TEXT DEFAULT 'draft',
  script_json TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reuse_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER REFERENCES episodes(id),
  footage_id INTEGER REFERENCES footage(id),
  suggested_at TEXT DEFAULT (datetime('now')), accepted INTEGER DEFAULT 0
);
Standard emotion list (canon.py): ["หัวเราะ","ตกใจ","แขวะ","อ้อน","เขิน","งอน","ซึ้ง","ฟินอาหาร","เผ็ดไม่ไหว","มั่นใจ","ยอมแพ้","ง่วง","เชียร์","ช็อคราคา","เรียกยู"]

========================================
3. MODULE 1 — Smart Shoot (modules/smart_shoot.py)
========================================
UI: dropdown เลือกโลเคชัน (จาก seed_locations.json 12 แห่ง: ตลาดนัดกลางคืน, เยาวราช, คาเฟ่, ซูเปอร์มาร์เก็ต, BTS, ตุ๊กตุ๊ก, สวนสาธารณะ, ยิมมวยไทย, ร้านนวด, จตุจักร, เซเว่น, คอนโด/ครัว) + ปุ่ม "สร้างแผนถ่าย"
Each location JSON entry: {name_th, archetype, best_time, permit_note, noise_level}
Output (rule-based composition from seed_hooks.json):
 a) HOOK ตลกสถานการณ์: เลือก template ตาม archetype แล้วเติมตัวละคร — ทุก hook สร้างจากสูตร "เหยาเหยาอยากเผ็ด × ยูริอยากหวาน × ยูต้องจ่าย/แก้ปัญหา"
 b) MICRO-SCRIPT 8-12 บรรทัด: โครง 4 จังหวะ (เปิดฮุค 3 วิ → ความขัดแย้งเผ็ด-หวาน → จุดพีค → ปิด+เรียกยู) แต่ละบรรทัดระบุผู้พูด ไลน์ 3 ภาษา (ผู้พูดพูดภาษาแม่ อีกสองภาษาคือซับ) — จากคลังประโยค template อย่างน้อย 5 ชุดต่อ archetype สุ่มผสมไม่ให้ซ้ำ
 c) B-ROLL CHECKLIST 8-10 ช็อตตาม archetype
 d) ปุ่ม "บันทึกเป็นตอน" → insert into episodes + สร้างโฟลเดอร์ผ่าน Module 3

========================================
4. MODULE 2 — Asset DB + Script Matcher
========================================
asset_db.py UI:
 - ฟอร์มเพิ่มฟุต (ทุก field จาก schema) + bulk import จาก data/seed_footage_demo.json (demo 30 รายการอิงคลัง Reaction Bank: D01-D30 duo, Y01-Y05 เรียกยู, R01-R06, L05-L08 รับส่งของ)
 - ตารางค้นหา/กรอง: ตัวละคร, emotion, location, HIGH VALUE
 - Badge สีทอง "[HIGH VALUE ASSET]" อัตโนมัติเมื่อ duo_in_frame=1 (ห้ามให้ user แก้ตรงๆ)
 - Dashboard: จำนวนฟุตต่อหมวด, ฟุตใช้บ่อยสุด, ฟุตไม่เคยใช้
script_matcher.py logic:
 - Input: เลือก episode (หรือ paste บทดิบ) → parse หา (ตัวละคร, emotion keywords, location) ด้วย keyword dict (เช่น 'หัวเราะ/ขำ/笑/笑う' → 'หัวเราะ')
 - Rank: +50 duo_in_frame (HIGH VALUE ก่อนเสมอ), +20 emotion ตรง, +10 location ตรง, -5×use_count, -10 ถ้าใช้ใน 7 วันล่าสุด
 - Output ต่อซีน: "REUSE: <filename> (คะแนน, เหตุผล)" สูงสุด 3 ตัวเลือก + ปุ่ม accept → reuse_log + update use_count/last_used_at
 - สรุป: "ประหยัดการถ่ายไป X ช็อต จากทั้งหมด Y"

========================================
5. MODULE 3 — Omnichannel (modules/omnichannel.py)
========================================
 a) Folder generator: projects/EP###_ชื่อ/{01_Raw,02_Audio_VO,03_Subtitles,04_Exports/{TikTok,Douyin,IG_Reels,FB_Reels}} (idempotent)
 b) Metadata generator ต่อแพลตฟอร์ม:
  - TikTok (ไทย): title สั้นมีตัวเลข/คำถาม, caption ไทย, hashtags: #YYY #TheYYYDiary #พี่ยูพาเที่ยว + 3 แท็กเทรนด์ตามธีม
  - Douyin (จีน): 标题จีนล้วน, caption จีน, hashtags: #YYY #曼谷YYY #曼谷生活 + 2 แท็กจีนตามธีม (ห้ามอักษรละตินยกเว้น YYY)
  - IG Reels: caption อังกฤษ+ไทยสั้น, hashtags: #YYY #BangkokLife #YuriYaoYao + 4 แท็กอังกฤษ
  - FB Reels: caption ไทยเล่าเรื่อง 2 ประโยค, hashtags 3 ตัวนำด้วย #YYY
  - บรรทัดแรก caption ต้องมี hook คำถามหรือตัวเลข + copy ผ่าน st.code
 c) Export เป็น .txt ลง 04_Exports อัตโนมัติ

========================================
6. APP SHELL (app.py)
========================================
- st.set_page_config(page_title="YYY Studio OS", layout="wide")
- Sidebar: "YYY Studio OS" + radio 4 หน้า: "🎬 วางแผนถ่าย (Smart Shoot)", "🗄️ คลังฟุต (Evergreen)", "🔍 จับคู่บท (Matcher)", "🚀 ส่งออก (Omnichannel)"
- Dashboard หน้าแรก: ตอนทั้งหมด, ฟุตในคลัง, HIGH VALUE assets, ฟุตใช้ซ้ำสะสม
- Init DB อัตโนมัติ + ปุ่ม "โหลดข้อมูลตัวอย่าง"

========================================
7. BUILD ORDER & DEFINITION OF DONE
========================================
Build in order: core → data seeds → asset_db → smart_shoot → script_matcher → omnichannel → app.py (test each step)
DONE เมื่อ:
 [ ] streamlit run app.py เปิดได้ไม่มี error ทั้ง 4 หน้า
 [ ] เพิ่มฟุต duo แล้วขึ้น [HIGH VALUE ASSET] อัตโนมัติ
 [ ] สร้างแผนถ่ายจาก "เยาวราช" ได้ hook+script+B-roll ครบ
 [ ] Matcher แนะนำ "REUSE:" โดย HIGH VALUE ขึ้นก่อน คะแนนลดตาม use_count
 [ ] สร้างตอนใหม่แล้วโฟลเดอร์ครบ + metadata 4 แพลตฟอร์มมี #YYY ทุกอัน
 [ ] ไม่มี Pinyin/Romanization ที่ใดในระบบ (grep ตรวจก่อนส่งงาน)
 [ ] README.md อธิบายติดตั้ง+รัน+แบ็กอัพ db
Write clean, commented code. When finished, run the app, verify the checklist yourself, then print a summary of what was built.
