from pathlib import Path
import html
import re

path = Path('classroom/first-web.html')
s = path.read_text(encoding='utf-8')

# 1) Make the long Prompt text HTML-safe. Raw <title> inside a span was parsed as markup
# and swallowed the rest of the document in browsers.
marker = '<span class="prompt-copy" id="smartPrompt1">'
start = s.find(marker)
if start < 0:
    raise RuntimeError('smartPrompt1 marker missing')
content_start = start + len(marker)
content_end = s.find('</span>', content_start)
if content_end < 0:
    raise RuntimeError('smartPrompt1 closing span missing')
prompt_text = s[content_start:content_end]
# Decode any previous entities once, then escape for safe text content.
prompt_text = html.unescape(prompt_text)
prompt_text = prompt_text.replace('ตั้ง `<title>` และ meta description', 'ตั้งชื่อหน้า (title) และ meta description')
prompt_safe = html.escape(prompt_text, quote=False)
s = s[:content_start] + prompt_safe + s[content_end:]

# 2) Lesson-2-like wording and flow.
s = s.replace('ทำ Smart Resume แบบเดียวกับบท 2 · 3 Step จบ', 'ทำ Smart Resume ให้ได้วันนี้')
s = s.replace('ข้อ 1 สกัดซอสให้พร้อมสร้างเว็บจริง ข้อ 2 ย้ายไฟล์ไปแชทใหม่แล้วสั่งสั้น ๆ ส่วนข้อ 3 เปิดไฟล์เช็กก่อนเสิร์ฟ', 'ใช้วิธีเดียวกับบท 2: สกัดซอสจากแชทที่รู้จักคุณ → ย้ายไฟล์ .md → สั่งสั้น ๆ → เปิดเช็กก่อนเสิร์ฟ')
s = s.replace('สกัดซอส .md ที่พร้อมสร้าง Smart Resume', 'สกัดซอส Smart Resume .md')
s = s.replace('แนบ .md แล้วสั่งให้ทำเว็บ', 'แนบซอส แล้วสร้างเว็บ')
s = s.replace('Checklist ก่อนเสิร์ฟ', 'เช็กก่อนเสิร์ฟ')

# Remove the floating warning above the steps and put it inside Step 1 like Lesson 2.
warning_re = re.compile(
    r'\n\s*<div class="source-warning"><strong>⚠️ ข้อ 1 ให้ทำใน AI ที่รู้จักคุณมากที่สุด</strong><br>.*?</div>\n',
    re.S,
)
s, removed = warning_re.subn('\n', s, count=1)
if removed != 1:
    raise RuntimeError(f'expected one floating Step 1 warning, got {removed}')

step1_intro = ('<p>วาง Prompt นี้ในแชทหรือ AI ที่รู้จักคุณอยู่แล้ว ไฟล์ที่ได้ต้องเก็บทั้ง '
               '<b>ข้อมูลเจ้าของ + WORK / LIFE + สไตล์ + กติกาสร้าง index.html</b> '
               'ไว้ครบ เพื่อรอบถัดไปไม่ต้องอธิบายใหม่</p>')
step1_warning = (step1_intro + '\n'
    '        <div class="source-warning"><strong>ห้ามเริ่มข้อ 1 จากแชทว่าง</strong>'
    '<span>ทำข้อนี้ใน AI หรือแชทที่รู้จักคุณมากที่สุด ให้ใช้แชทนี้รวมกับ Memory / ประวัติอื่นที่มันเข้าถึงได้จริง '
    'เพื่อรวบรวมข้อมูลให้ครบที่สุด แต่คัดเฉพาะเรื่องที่เหมาะกับการเปิดสาธารณะ ถ้ามันเข้าถึงอะไรไม่ได้ ห้ามอ้างว่าเห็นและห้ามเดาแทน</span></div>')
if step1_intro not in s:
    raise RuntimeError('Step 1 intro not found')
s = s.replace(step1_intro, step1_warning, 1)

# 3) Replace the Smart Resume visual layer with the same proportions/controls as Lesson 2.
new_style = r'''<style id="lesson6-smart-resume-style">
.serve-tldr{display:grid;grid-template-columns:1.35fr .85fr;gap:14px;margin:20px 0 24px}.serve-tldr>div{padding:22px;border:1px solid rgba(18,40,28,.11);border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(10,40,24,.06)}.serve-tldr h2{margin:6px 0 8px;font-size:clamp(22px,3vw,31px);line-height:1.18}.serve-tldr p{margin:0;color:#59655e}.take-home{display:grid;gap:8px;margin-top:10px}.take-home span{display:block;padding:9px 11px;border-radius:12px;background:rgba(27,106,66,.07);font-weight:750}
.smart-resume-workflow{overflow:visible}.smart-resume-workflow .section-head{margin-bottom:14px}.smart-resume-workflow .section-head h2{font-size:clamp(22px,4.2vw,29px);line-height:1.35}.smart-resume-workflow .section-head p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important;line-height:1.7!important}
.smart-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 16px}.smart-steps{display:grid;gap:12px;margin-top:14px}.smart-step{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;padding:18px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:#fff;box-shadow:0 9px 26px rgb(18 40 28/.05);overflow:visible}.step-no{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgb(var(--green));color:#fff;font-size:15px;font-weight:850}.step-body{min-width:0}.step-body h3{font-family:"Bai Jamjuree",system-ui,sans-serif!important;font-size:18px!important;line-height:1.4!important;font-weight:700!important}.step-body>p{margin-top:4px;margin-bottom:0;color:rgb(var(--muted));font-size:14px!important;line-height:1.7!important}
.source-warning{margin:12px 0;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgba(153,25,25,.08)}.source-warning strong{display:block;font-family:"Bai Jamjuree",system-ui,sans-serif!important;font-size:15px!important;color:#a31717}.source-warning span{display:block;margin-top:2px;font-size:13px!important;line-height:1.6!important}.source-warning code{background:rgba(163,23,23,.08);padding:1px 5px;border-radius:5px}
.prompt-card{position:relative;font-family:ui-monospace,Menlo,Consolas,monospace!important;font-size:12.8px!important;background:#071a10;color:#d7f5e2;border:1px solid rgb(var(--gold)/.2);border-radius:13px;padding:48px 16px 16px;margin-top:13px;line-height:1.7!important;overflow:visible;overflow-wrap:anywhere;box-shadow:inset 0 1px 0 rgb(255 255 255/.055)}.prompt-card[data-prompt-collapse]{padding-bottom:54px}.prompt-copy{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit!important;color:inherit}.prompt-card[data-prompt-collapse]:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden;white-space:normal}.copy-smart{position:absolute;top:9px;right:9px;z-index:3;min-height:31px;border:1px solid rgb(255 255 255/.16);border-radius:8px;padding:5px 11px;background:rgb(var(--gold));color:#071a10;font-family:"Bai Jamjuree",system-ui,sans-serif!important;font-size:11.5px!important;font-weight:700!important;line-height:1.4!important;cursor:pointer}.prompt-expand{position:absolute;left:14px;bottom:10px;z-index:3;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font-family:"Bai Jamjuree",system-ui,sans-serif!important;font-size:11px!important;font-weight:700!important;line-height:1.4!important;cursor:pointer}.prompt-expand:hover{background:rgb(255 255 255/.13)}
.smart-checklist{margin-top:12px}.smart-checklist li{padding:9px 0}.smart-checklist label{cursor:pointer}.smart-checklist input{accent-color:rgb(var(--green))}
@media(max-width:680px){.serve-tldr{grid-template-columns:1fr}.smart-step{grid-template-columns:32px minmax(0,1fr);padding:16px 14px}.step-no{width:32px;height:32px}.prompt-card{font-size:12.5px!important}.hero-grid{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){.smart-resume-workflow *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>'''
style_re = re.compile(r'<style id="lesson6-smart-resume-style">.*?</style>', re.S)
s, style_count = style_re.subn(new_style, s, count=1)
if style_count != 1:
    raise RuntimeError(f'lesson6 smart resume style block count={style_count}')

# Guards against the original DOM-eating bug and accidental loss of the ending.
start = s.find(marker)
content_start = start + len(marker)
content_end = s.find('</span>', content_start)
region = s[content_start:content_end]
if '<' in region or '>' in region:
    raise RuntimeError('raw angle bracket remains inside smartPrompt1 text')
for required in [
    'id="smartPrompt2"', 'ทำเวปตามซอสนี้', 'เช็กก่อนเสิร์ฟ',
    'id="hardMode"', 'id="glitchTrigger"', 'id="bossDoor"', '/classroom/dungeon/',
    'class="prompt-expand"', 'data-copy-target="smartPrompt1"'
]:
    if required not in s:
        raise RuntimeError(f'missing required marker: {required}')
if s.count('<script') != s.count('</script>'):
    raise RuntimeError('script tag count mismatch')

path.write_text(s, encoding='utf-8')
print('lesson 6 Prompt UI repaired safely')
