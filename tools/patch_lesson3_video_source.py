from pathlib import Path

p = Path("classroom/clip-ai.html")
t = p.read_text(encoding="utf-8")

# Safety: make sure we are patching the current Lesson 3 page, including the
# single connected raster hero that must not be disturbed.
assert '<meta name="mc-item" content="learn:clip-ai">' in t
assert '<figure class="classroom-lesson-header-image">' in t
assert '/classroom/img/header-lesson3.jpeg' in t
assert '<div class="hero-stage"' not in t

# 1) Step 2 chip only.
old_chip = 'video-source-YYYY-MM-DD-HHmm.md จากข้อ 1'
new_chip = 'video-source-____.md จากข้อ 1'
assert t.count(old_chip) == 1, f"expected 1 old chip, found {t.count(old_chip)}"
t = t.replace(old_chip, new_chip, 1)

# 2) Patch only the final quest block, not similar wording elsewhere.
quest_anchor = '🎯 เควสท้ายบท · สร้างวิดีโอจากซอสให้ได้ 1 ชิ้น'
quest_start = t.find(quest_anchor)
assert quest_start != -1, "final quest anchor not found"
quest_end = min(len(t), quest_start + 7000)
quest = t[quest_start:quest_end]

old_make = 'สร้างไฟล์ video-source-YYYY-MM-DD-HHmm.md'
new_make = 'สร้างไฟล์ video-source.md'
old_attach = 'แนบ video-source-YYYY-MM-DD-HHmm.md พร้อมภาพที่สร้างจากบท 2'
new_attach = 'แนบ video-source.md พร้อมภาพที่สร้างจากบท 2'
old_check = 'เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16'
new_check = 'เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16 (บางครั้ง AI ชอบทำแนวนอนให้เอง)'

for needle in (old_make, old_attach, old_check):
    assert quest.count(needle) == 1, f"final quest expected 1 occurrence of {needle!r}, found {quest.count(needle)}"

quest = quest.replace(old_make, new_make, 1)
quest = quest.replace(old_attach, new_attach, 1)
quest = quest.replace(old_check, new_check, 1)
t = t[:quest_start] + quest + t[quest_end:]

# 3) Copy Lesson 6 warning styling and place the warning immediately above
# the short video-generation prompt.
style = '''<style id="lesson3-source-warning-style">
.source-warning{margin:14px 0 16px;padding:15px 17px;border:2px solid #c53a34;border-radius:14px;background:#fff1ef;color:#872620}
.source-warning b{display:block;font:800 14px "Bai Jamjuree",sans-serif}
.source-warning p{margin-top:5px;font-size:13.5px;line-height:1.65;color:#872620}
</style>'''

if 'id="lesson3-source-warning-style"' not in t:
    assert '</head>' in t
    t = t.replace('</head>', style + '\n</head>', 1)

warning_text = 'ถ้าไม่แนบไฟล์จากข้อ 1 คำว่า “ซอสนี้” จะไม่มี Source ให้ AI อ้างอิง และ การแนบภาพจากบท 2 จะทำให้ Video แม่นยำขึ้น'
warning = '''<div class="source-warning">
  <b>⚠️ อย่าลืมแนบซอส (.md)</b>
  <p>''' + warning_text + '''</p>
</div>
'''

prompt_text = 'สร้างวิดีโอตามซอสนี้'
prompt_pos = t.find(prompt_text)
assert prompt_pos != -1, "short video prompt not found"

if warning_text not in t:
    # The prompt text is a direct descendant of its dark prompt div. Locate
    # that containing div conservatively, then insert the warning before it.
    prompt_div_start = t.rfind('<div', 0, prompt_pos)
    assert prompt_div_start != -1, "prompt containing div not found"
    opening_end = t.find('>', prompt_div_start, prompt_pos)
    assert opening_end != -1, "prompt opening div malformed"
    opening = t[prompt_div_start:opening_end + 1]
    assert 'prompt' in opening.lower(), f"nearest div is not a prompt div: {opening!r}"
    t = t[:prompt_div_start] + warning + t[prompt_div_start:]

# Final verification: exact requested copy is present, old timestamp filename
# is gone from the step chip/final quest, and the hero structure is untouched.
assert t.count(new_chip) == 1
assert warning_text in t
assert '<b>⚠️ อย่าลืมแนบซอส (.md)</b>' in t
assert prompt_text in t
assert new_make in t
assert new_attach in t
assert new_check in t
assert '<figure class="classroom-lesson-header-image">' in t
assert '/classroom/img/header-lesson3.jpeg' in t
assert '<div class="hero-stage"' not in t

p.write_text(t, encoding="utf-8")
print("Lesson 3 video-source copy patched and verified")
