from pathlib import Path

p = Path('classroom/clip-ai.html')
t = p.read_text(encoding='utf-8')

assert '<meta name="mc-item" content="learn:clip-ai">' in t
assert '<figure class="classroom-lesson-header-image">' in t
assert '/classroom/img/header-lesson3.jpeg' in t
assert 'data-self-contained="lesson3-video-fast-track.js"' in t

# Step 2 chip shown in the fast-track UI.
old_chip = 'video-source-YYYY-MM-DD-HHmm.md จากข้อ 1'
new_chip = 'video-source-____.md จากข้อ 1'
if new_chip not in t:
    assert t.count(old_chip) == 1, f'expected one Step 2 chip, found {t.count(old_chip)}'
    t = t.replace(old_chip, new_chip, 1)

# Exact warning style copied from Lesson 6 and injected by the same fast-track builder.
css_marker = '    .prompt-collapsible{padding-bottom:54px}'
warning_css = '''    .source-warning{margin:14px 0 16px;padding:15px 17px;border:2px solid #c53a34;border-radius:14px;background:#fff1ef;color:#872620}\n    .source-warning b{display:block;font:800 14px "Bai Jamjuree",sans-serif}\n    .source-warning p{margin-top:5px;font-size:13.5px!important;line-height:1.65!important;color:#872620!important}\n'''
if '.source-warning{margin:14px 0 16px' not in t:
    assert css_marker in t, 'fast-track CSS insertion marker missing'
    t = t.replace(css_marker, warning_css + css_marker, 1)

warning_text = 'ถ้าไม่แนบไฟล์จากข้อ 1 คำว่า “ซอสนี้” จะไม่มี Source ให้ AI อ้างอิง และ การแนบภาพจากบท 2 จะทำให้ Video แม่นยำขึ้น'
warning_html = '<div class="source-warning"><b>⚠️ อย่าลืมแนบซอส (.md)</b><p>' + warning_text + '</p></div>'

generate_prompt = '<div class="prompt" data-video-prompt="generate" data-prompt-guard="off"></div>'
if warning_text not in t:
    assert t.count(generate_prompt) == 1, f'expected one generate prompt node, found {t.count(generate_prompt)}'
    t = t.replace(generate_prompt, warning_html + generate_prompt, 1)

# Keep the static final quest in sync with the runtime patchQuest copy.
quest_anchor = '🎯 เควสท้ายบท · สร้างวิดีโอจากซอสให้ได้ 1 ชิ้น'
qstart = t.find(quest_anchor)
assert qstart != -1, 'final quest anchor missing'
qend = min(len(t), qstart + 7000)
quest = t[qstart:qend]
old_token = 'video-source-YYYY-MM-DD-HHmm.md'
if old_token in quest:
    count = quest.count(old_token)
    assert count == 2, f'expected two old filenames in static quest, found {count}'
    quest = quest.replace(old_token, 'video-source.md')

old_check = 'เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16'
new_check = 'เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16 (บางครั้ง AI ชอบทำแนวนอนให้เอง)'
if new_check not in quest:
    assert quest.count(old_check) == 1, f'expected one static final check, found {quest.count(old_check)}'
    quest = quest.replace(old_check, new_check, 1)
t = t[:qstart] + quest + t[qend:]

# Runtime quest must also be the requested wording.
runtime_list = "if(list)list.innerHTML='<li>แนบซอส .md แล้วใช้ Prompt สร้างไฟล์ video-source.md</li><li>เปิดแชทใหม่ที่สร้างวิดีโอได้ แล้วแนบ video-source.md พร้อมภาพที่สร้างจากบท 2</li><li>วางคำสั่งสั้นจากข้อ 2 แล้วกดสร้าง</li><li>เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16 (บางครั้ง AI ชอบทำแนวนอนให้เอง)</li>';"
assert runtime_list in t, 'runtime final quest copy is not the requested version'

# Final surgical verification.
assert t.count(new_chip) == 1
assert warning_text in t
assert warning_html in t
assert generate_prompt in t
assert t.find(warning_html) < t.find(generate_prompt, t.find(warning_html))
assert '.source-warning{margin:14px 0 16px' in t
assert '<figure class="classroom-lesson-header-image">' in t
assert '/classroom/img/header-lesson3.jpeg' in t

q = t[t.find(quest_anchor):t.find(quest_anchor) + 7000]
assert old_token not in q
assert q.count('video-source.md') >= 2
assert new_check in q

p.write_text(t, encoding='utf-8')
print('Lesson 3 Step 2 chip, warning, and final quest verified')
