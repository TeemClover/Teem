"""Build public /start pages and topic-specific handoff files from catalog.json."""
import csv
import hashlib
import html
import io
import json
import subprocess
import zipfile
from pathlib import Path
from ai_pack import UPLOAD_MESSAGE, starter_text, print_html
from pdf_text import repair_pdf

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE/'catalog.json').read_text())
EPISODES = CATALOG['episodes']
E = html.escape
ORIGIN = 'https://www.myclover.com'

def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2)

def shell(body, title, page='episode', description='', canonical='/start/'):
    robots = '<meta name="robots" content="noindex,follow">' if page == 'catalog' else ''
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8">{robots}<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{E(description,quote=True)}"><meta name="theme-color" content="#0a2818"><title>{E(title)} · myClover</title><link rel="canonical" href="{ORIGIN}{canonical}"><link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="/start/style.css"></head><body data-page="{page}"><a class="skip" href="#main">ข้ามไปเนื้อหา</a><header class="top"><a class="brand" href="/start/"><img src="/icons/icon-192.png" alt="" width="32" height="32"><b>my<em>Clover</em></b><span>โชคดีที่หาเจอ</span></a><span class="top-note">แบบฝึกคู่คลิป</span></header><main id="main">{body}</main><footer><strong>myClover · เริ่มเล็กพอให้ได้ลองจริง</strong><p>แบบฝึกเพื่อทดลองและเรียนรู้ ใช้ข้อมูลจริงและตรวจคำตอบ AI ก่อนใช้ ไม่รับประกันยอดขายหรือรายได้</p><p>คำตอบที่กรอกเก็บบนเบราว์เซอร์ของคุณเอง เก็บเป็นไฟล์เพื่อนำไปใช้กับ AI ที่คุณเลือกได้ อย่าใส่ข้อมูลส่วนตัวของลูกค้า</p><div><a href="https://www.instagram.com/myclover.ai/">Instagram</a><a href="https://www.facebook.com/people/MyClover-Good-Luck-Have-Fun/61592401004383/">Facebook</a><a href="/start/assets/fonts/OFL.txt">สิทธิ์ฟอนต์ Kanit</a></div></footer><script type="module" src="/start/app.mjs"></script></body></html>'''

def static_file_links(ep):
    base = '/start/files/'+ep['slug']+'/'
    return ''.join(f'<a data-download download href="{base}{ep["id"]}-{name}.{ext}"><b>{label}</b><span>{detail}</span></a>' for name,ext,label,detail in [
      ('ai-starter','pdf','PDF · อ่านและแนบให้ AI','บริบท คำถาม คำสั่ง และวิธีทำต่อ ครบในไฟล์เดียว'),
      ('prompt','txt','TXT · แนบหรือคัดลอกทั้งหมด','เนื้อหาครบเหมือนชุด PDF ใช้เมื่อ AI แนบ PDF ไม่ได้'),
      ('ai-starter','md','Markdown · ให้ AI ช่วยเริ่ม','มีบริบท คำถาม และคำสั่งครบในไฟล์เดียว'),
      ('worksheet','pdf','PDF · แบบฝึกสำหรับพิมพ์','แบบฝึก 1 หน้าเดิม สำหรับเขียนคำตอบด้วยมือ'),
      ('worksheet','csv','CSV · ตารางกรอกข้อมูล','เปิดในโปรแกรมตารางที่ใช้อยู่'),
      ('answers','json','JSON · ข้อมูลเริ่มต้น','นำเข้าหน้านี้ แล้วเก็บคำตอบไว้ทำต่อ'),
    ])

cards=[]
for ep in EPISODES:
    search = ' '.join([ep['id'],str(ep['number']),ep['title'],*ep['fields']]).lower()
    cards.append(f'''<article class="topic" id="{ep['id']}" data-topic="{ep['id']}" data-batch="{ep['batch']}" data-search="{E(search,quote=True)}"><span class="number">{ep['number']:02}</span><div><p class="tag">คู่คลิป {ep['id']}</p><h3><a href="/start/{ep['slug']}/">{E(ep['title'])}</a></h3><p>{E(ep['outcome'])}</p><small data-progress></small></div><a class="topic-arrow" href="/start/{ep['slug']}/" aria-label="เริ่มเรื่อง {E(ep['title'],quote=True)}">↗</a></article>''')

index = '''<section class="hero"><div><p class="eyebrow">ของแจกสำหรับคนอยากเริ่มธุรกิจ</p><h1>เห็นเรื่องไหนในคลิป<br>มาเริ่ม<span>เรื่องนั้น</span>ที่นี่</h1><p class="lead">แบบฝึก + คำสั่ง AI + ไฟล์พร้อมใช้<br>เลือกเรื่องเดียว แล้วทำขั้นเล็ก ๆ ให้เกิดขึ้นจริง</p><a class="button" href="#library">เลือกเรื่องที่อยากเริ่ม ↓</a><p class="fine">รับฟรี · ไม่ต้องสมัคร · ไม่ต้องกรอกเบอร์หรืออีเมล</p></div><aside class="hero-note"><span>เริ่มง่ายที่สุด</span><b>01</b><h2>อย่าเริ่มที่โลโก้</h2><p>หางานเล็กที่คุณช่วยคนอื่นได้ก่อน<br>กรอก 3 ช่อง แล้วให้ AI ช่วยจับคู่</p><a href="/start/mc01/">เริ่มจากสิ่งที่ทำเป็น ↗</a></aside></section><section class="how"><div><b>1</b><p><strong>เลือกตรงกับคลิป</strong><span>แต่ละเรื่องมีหน้าและของแจกของตัวเอง</span></p></div><div><b>2</b><p><strong>รับ PDF ตรงเรื่อง</strong><span>อ่านเองหรือใช้กับ AI ได้ในไฟล์เดียว</span></p></div><div><b>3</b><p><strong>แนบไฟล์ให้ AI</strong><span>ใช้ข้อความแนะนำ แล้วให้ AI ถามทีละข้อ</span></p></div></section><div id="incoming" class="incoming" hidden></div><section id="library"><div class="section-heading"><div><p class="eyebrow">คลังของแจก 30 เรื่อง</p><h2>เลือกปัญหาที่ติดอยู่ตอนนี้</h2></div><p>เริ่มบนหน้าเว็บได้ หรือรับไฟล์กลับไปใช้ก็ได้</p></div><label for="search">ค้นหาเลขคลิปหรือหัวข้อ</label><input id="search" type="search" placeholder="เช่น 11 · ต้นทุน · ลูกค้า" autocomplete="off"><div class="filters" aria-label="เลือกชุด"><button data-batch="0" aria-pressed="true">ทั้งหมด</button><button data-batch="1" aria-pressed="false">01–10 · หาจุดเริ่ม</button><button data-batch="2" aria-pressed="false">11–20 · ทำงานให้ชัด</button><button data-batch="3" aria-pressed="false">21–30 · ลองและปรับ</button></div><p id="result-count" class="fine" aria-live="polite">เลือกได้ 30 เรื่อง</p><div class="topics">'''+''.join(cards)+'''</div></section><section class="closing"><h2>ไม่ต้องทำครบทั้ง 30 เรื่องวันนี้</h2><p>เลือกหนึ่งเรื่อง ใช้ข้อมูลจริง ลองทำกับคนจริง<br>สิ่งที่เกิดขึ้นจะบอกเองว่ารอบต่อไปควรปรับตรงไหน</p></section>'''
(HERE/'library').mkdir(exist_ok=True)
(HERE/'library/index.html').write_text(shell('<section id="library-gate" class="claim-card"><p class="eyebrow">เริ่มทีละเรื่อง</p><h1>ทำตอนที่ขอก่อน<br>แล้วค่อยเลือกเรื่องถัดไป</h1><p>ตอบแบบฝึกของตอนที่ดูให้ครบ แล้วกด “ทำแบบฝึกตอนนี้แล้ว” เพื่อเปิดคลังรวมบนเบราว์เซอร์นี้</p><a class="button" href="/start/">กลับไปรับของตามเลขคลิป →</a><noscript><p>เปิด JavaScript เพื่ออ่านความคืบหน้าที่เก็บบนเบราว์เซอร์นี้</p></noscript></section><div id="library-content" hidden>'+index+'</div>','คลังแบบฝึก','catalog','คลังแบบฝึกหลังทำตอนแรก','/start/library/'))
(HERE/'index.html').write_text(shell('<section class="claim-hero"><p class="eyebrow">แบบฝึกคู่คลิป myClover</p><h1>ดูเรื่องไหน<br>เริ่ม<span>เรื่องนั้น</span></h1><p class="lead">รับแบบฝึกพร้อมคำสั่ง AI ของตอนที่คุณขอ<br>เลือกทำทีละเรื่อง แล้วค่อยไปต่อ</p><a class="button" href="#claim">รับของจากคลิปที่ดู ↓</a><p class="fine">รับฟรี · ไม่ต้องสมัครหรือแอด LINE</p></section><section class="claim-card" id="claim"><p class="eyebrow">เลขตอนอยู่บนปกคลิป</p><h2>คุณดูคลิป MC อะไรมา?</h2><form id="claim-form"><label for="episode-code">เลขตอน เช่น MC02 หรือ 02</label><div class="claim-row"><input id="episode-code" name="episode" type="text" maxlength="8" placeholder="MC02" autocomplete="off" required aria-describedby="claim-status"><button class="button" type="submit">เปิดแบบฝึกตอนนี้ →</button></div><p id="claim-status" role="status" aria-live="polite" class="fine">ใส่เลขจากคลิปที่คุณดู เพื่อรับของให้ตรงเรื่อง</p></form><noscript><p>เปิดลิงก์รายตอนจาก DM ของ myClover เพื่อรับ PDF ได้ทันที หรือเปิด JavaScript เพื่อใส่เลขตอนที่นี่</p></noscript></section><section class="claim-note"><h2>ของเรื่องเดียว ทำให้เกิดขึ้นจริง</h2><p>แต่ละตอนมี PDF พร้อมแนบให้ AI, TXT สำรอง และแบบฝึกบนเว็บ ไม่ต้องไล่เก็บทุกไฟล์ เริ่มจากเรื่องที่ตรงกับสิ่งที่ติดอยู่ตอนนี้</p><a id="library-return" href="/start/library/" hidden>คุณทำแบบฝึกแล้ว · กลับเข้าคลังรวม →</a></section>','รับของตรงคลิป','claim','รับแบบฝึกและคำสั่ง AI ให้ตรงกับคลิป myClover ที่คุณดู'))

# Use the same prompt compiler for the web and every downloadable starter.
node_code = "import fs from 'node:fs'; import {buildPrompt,makeBackup,makeCSV} from './start-domain.mjs';const c=JSON.parse(fs.readFileSync('./catalog.json','utf8'));console.log(JSON.stringify(c.episodes.map(e=>({id:e.id,prompt:buildPrompt(e,[]),backup:makeBackup(e,[]),csv:makeCSV(e,[])}))))"
compiled = json.loads(subprocess.run(['node','--input-type=module','-e',node_code],cwd=HERE,check=True,capture_output=True,text=True).stdout)
compiled = {x['id']:x for x in compiled}
# Regenerate the AI-readable PDF before packing; never silently ship a stale PDF.
print_dir=HERE/'print';print_dir.mkdir(exist_ok=True)
for ep in EPISODES:
    (HERE/'files'/ep['slug']).mkdir(parents=True,exist_ok=True)
    (print_dir/(ep['id']+'.html')).write_text(print_html(ep,compiled[ep['id']]['prompt'],CATALOG['version'],CATALOG['updated_at']))
subprocess.run(['node',str(HERE/'render-pdfs.mjs')],check=True)
for ep in EPISODES:
    repair_pdf(HERE/'files'/ep['slug']/(ep['id']+'-ai-starter.pdf'),HERE/'assets/fonts')
manifest=[]
for ep in EPISODES:
    folder=HERE/ep['slug'];folder.mkdir(exist_ok=True)
    files=HERE/'files'/ep['slug'];files.mkdir(parents=True,exist_ok=True)
    c=compiled[ep['id']]
    complete=starter_text(ep,c['prompt'],CATALOG['version'],CATALOG['updated_at'])
    (files/(ep['id']+'-prompt.txt')).write_text(complete)
    (files/(ep['id']+'-answers.json')).write_text(dump(c['backup']))
    (files/(ep['id']+'-worksheet.csv')).write_text(c['csv'],newline='')
    readme=f'''myClover · {ep['id']} · {ep['title']}\n\nอยากเริ่มเร็ว: เปิด {ep['id']}-prompt.txt แล้วคัดลอกไปวางใน AI\nอยากให้ AI มีบริบทครบ: ใช้ {ep['id']}-ai-starter.md\nอยากพิมพ์: ใช้ {ep['id']}-worksheet.pdf\nอยากกรอกเป็นตาราง: ใช้ {ep['id']}-worksheet.csv\nอยากเก็บคำตอบทำต่อบนเว็บ: นำเข้า {ep['id']}-answers.json ที่หน้า {ORIGIN}/start/{ep['slug']}/\n\nชุด ZIP นี้เป็นแบบฝึกเปล่า ไม่รวมคำตอบที่คุณกรอกบนเว็บ\nบนเว็บใช้ “เก็บข้อมูลที่กรอก” เพื่อดาวน์โหลดคำตอบของคุณเป็นไฟล์แยก\nคำตอบบนเว็บเก็บเฉพาะเบราว์เซอร์เครื่องนั้น ไม่ส่งขึ้นฐานรายชื่อหรือส่งให้ AI เอง\n\nการทดลองนี้ไม่รับประกันรายได้ ใช้ข้อมูลจริงและตรวจงานก่อนใช้\n'''
    readme=f'''เริ่มที่ {ep['id']}-ai-starter.pdf: อ่านเอง หรือแนบให้ AI แล้วส่งข้อความนี้\n{UPLOAD_MESSAGE}\n\nถ้าแนบ PDF ไม่ได้ เปิด {ep['id']}-prompt.txt แล้วคัดลอกทั้งหมดไปวางใน AI\nPDF / TXT / Markdown มีบริบทและคำสั่งของเรื่องนี้ครบ เลือกใช้เพียงไฟล์เดียว ไม่ต้องแนบทั้ง ZIP\n\n'''+readme
    (files/'READ-ME.txt').write_text(readme)
    kit=files/(ep['id']+'-starter-kit.zip')
    names=[ep['id']+'-ai-starter.pdf',ep['id']+'-worksheet.pdf',ep['id']+'-ai-starter.md',ep['id']+'-prompt.txt',ep['id']+'-worksheet.csv',ep['id']+'-answers.json','READ-ME.txt']
    with zipfile.ZipFile(kit,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            info=zipfile.ZipInfo(name,(2026,10,28,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,(files/name).read_bytes())
    fields=''.join(f'<label for="answer-{i}"><span class="field-number">{i+1:02}</span>{E(field)}</label><textarea data-answer id="answer-{i}" rows="3" maxlength="4000" placeholder="เติมเท่าที่รู้จริง ถ้ายังไม่รู้ เว้นไว้ให้ AI ถามได้"></textarea>' for i,field in enumerate(ep['fields']))
    next_ep=EPISODES[ep['number'] % len(EPISODES)]
    data=dump(ep).replace('<','\\u003c').replace('&','\\u0026')
    points=''.join('<li>'+E(line)+'</li>' for line in ep['clip_points'])
    body=f'''<nav class="breadcrumb" aria-label="ตำแหน่งหน้า"><span>แบบฝึกคู่คลิป</span><span> / </span><span>{ep['id']}</span></nav><section class="episode-hero"><div><p class="eyebrow">แบบฝึกคู่คลิป {ep['id']} · รับฟรี</p><h1>{E(ep['title'])}</h1><p class="lead">{E(ep['outcome'])}</p><div class="actions"><a data-download class="button" href="/start/files/{ep['slug']}/{ep['id']}-ai-starter.pdf" download>รับ PDF พร้อมใช้กับ AI ↓</a><a class="secondary" href="#work">หรือกรอกบนเว็บแล้วคัดลอกคำสั่ง</a></div><p class="fine">รับของตรงเรื่องนี้ได้เลย · ไม่ต้องสมัครหรือแอด LINE</p></div><img class="clip-cover" src="/start/assets/covers/{ep['id']}.jpg" width="1080" height="1920" alt="ภาพจากคลิป {ep['id']} · {E(ep['title'],quote=True)}"></section><section class="upload-start" aria-labelledby="upload-heading"><p class="eyebrow">เริ่มจากไฟล์เดียว</p><h2 id="upload-heading">รับไฟล์ → แนบให้ AI → ตอบทีละข้อ</h2><ol><li><strong>รับ PDF ของเรื่องนี้</strong><span>เปิดอ่านเอง หรือเก็บไว้แนบในแชต AI ไม่ต้องแตก ZIP</span></li><li><strong>เปิด AI ที่คุณใช้ แล้วแนบ PDF</strong><span>ส่งข้อความด้านล่างพร้อมไฟล์ ไม่จำเป็นต้องกรอกแบบฝึกก่อน</span></li><li><strong>ตอบคำถามและตรวจร่าง</strong><span>ใช้ข้อมูลจริง แล้วเลือกงานเล็กหนึ่งอย่างไปลอง</span></li></ol><div class="upload-copy"><p id="upload-message">{E(UPLOAD_MESSAGE)}</p><button id="copy-upload-message" type="button">คัดลอกข้อความส่งพร้อมไฟล์</button><p id="upload-status" role="status" aria-live="polite"></p></div><p class="fine">ถ้า AI แนบหรืออ่าน PDF ไม่ได้ <a data-download href="/start/files/{ep['slug']}/{ep['id']}-prompt.txt" download>รับ TXT</a> แล้วคัดลอกข้อความทั้งหมดไปวางในแชตได้เลย การแนบไฟล์ขึ้นกับบริการและบัญชีที่ใช้</p></section><section class="episode-intro"><p class="eyebrow">จากสิ่งที่ดู → สิ่งที่จะลอง</p><h2>จบรอบนี้ ลองทำเรื่องเดียว</h2><p class="action-line">{E(ep['action'])}</p><details><summary>ทบทวนสิ่งที่คลิปนี้เล่า</summary><ul>{points}</ul></details></section><section id="work" class="workspace"><div class="worksheet"><p class="eyebrow">01 · ใส่ข้อมูลของคุณ</p><h2>ตอบเท่าที่รู้จริง</h2><p class="hint">ไม่ต้องมีคำตอบสวย ๆ ที่ยังไม่รู้เว้นไว้ได้ AI จะช่วยถามต่อ</p><form onsubmit="return false">{fields}</form><div class="save-actions"><button id="save-json" type="button">เก็บข้อมูลที่กรอก (.json)</button><button id="save-csv" type="button">เก็บเป็นตาราง (.csv)</button><label class="file-import" for="import-json">นำไฟล์ข้อมูลกลับมาทำต่อ<input type="file" id="import-json" accept=".json,application/json"></label></div></div><aside class="ai-handoff"><p class="eyebrow">02 · ให้ AI ช่วยร่าง</p><h2>ข้อมูล + คำสั่ง<br>พร้อมไปด้วยกัน</h2><p>ปุ่มนี้จะรวมคำตอบที่คุณกรอกกับคำสั่งของเรื่องนี้ให้ ถ้ายังไม่ได้กรอก ใช้ให้ AI ถามทีละข้อได้เลย</p><button id="copy-prompt" class="button" type="button">คัดลอกไปใช้กับ AI</button><button id="download-prompt" class="text-button" type="button">คำสั่งพร้อมข้อมูลของฉัน (.txt) ↓</button><p id="status" role="status" aria-live="polite"></p><div class="ai-links"><span>คัดลอกแล้ว เปิด AI ที่คุณใช้</span><a data-ai href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT ↗</a><a data-ai href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">Gemini ↗</a><a data-ai href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Claude ↗</a></div><details class="prompt-details"><summary>ดูหรือเลือกคัดลอกคำสั่งทั้งหมด</summary><label class="sr-only" for="prompt-preview">คำสั่ง AI พร้อมข้อมูลที่กรอก</label><textarea id="prompt-preview" readonly rows="15"></textarea></details><p class="fine">คำตอบอยู่บนเครื่องของคุณ เลือกคัดลอกไปใช้กับ AI เอง<br>แต่ละบริการอาจมีเงื่อนไขหรือโควตาของบัญชีต่างกัน</p></aside></section><section class="download-section"><div class="section-heading"><div><p class="eyebrow">03 · รับไฟล์ของเรื่องนี้</p><h2>ไฟล์อื่นตามวิธีที่คุณใช้</h2></div><a data-download class="button" href="/start/files/{ep['slug']}/{ep['id']}-starter-kit.zip" download>รับชุดไฟล์ ZIP ↓</a></div><p class="hint">ไฟล์ด้านล่างเป็นแบบฝึกเปล่าของ {ep['id']} ถ้าต้องการข้อมูลที่กรอกไว้ ใช้ปุ่มเก็บข้อมูลด้านบน</p><details class="other-formats"><summary>ดู PDF / TXT / Markdown / แบบฝึกและไฟล์สำรอง</summary><div class="file-options">{static_file_links(ep)}</div></details></section><section class="next-action"><p class="eyebrow">พอได้ร่างจาก AI แล้ว</p><h2>กลับไปลองกับของจริง</h2><p>{E(ep['action'])}</p><button id="mark-started" type="button">ทำแบบฝึกตอนนี้แล้ว ✓</button><p id="completion-status" role="status" aria-live="polite"></p><p class="fine">ตอบแบบฝึกครบทั้ง 3 ข้อ แล้วกดเพื่อเปิดคลังรวม · บันทึกเฉพาะเบราว์เซอร์นี้</p></section><section class="line-follow" aria-labelledby="line-heading"><div><p class="eyebrow">อยากติดตาม myClover ต่อ</p><h2 id="line-heading">เก็บ LINE บ้าน myClover ไว้</h2><p>ติดตาม Prompt และอัปเดตใหม่เมื่อพร้อม ไฟล์ของเรื่องนี้รับได้เลยโดยไม่ต้องเพิ่มเพื่อน</p></div><a class="button" href="https://lin.ee/rlSlhzT" target="_blank" rel="noopener noreferrer">แอด LINE myClover ↗</a></section><nav class="next-topics"><a href="https://www.instagram.com/myclover.ai/">กลับไปดูคลิป myClover →</a><a id="library-unlock" href="/start/library/" hidden>ทำตอนนี้แล้ว · เข้าคลังรวม →</a></nav><noscript><p class="notice">เปิด JavaScript เพื่อรวมข้อมูลกับคำสั่ง AI หรือรับไฟล์ TXT / Markdown ด้านบนไปเริ่มได้เลย</p></noscript><script id="episode-data" type="application/json">{data}</script>'''
    (folder/'index.html').write_text(shell(body,ep['title'],'episode',ep['outcome'],'/start/'+ep['slug']+'/'))
    for name in [*names,kit.name]:
        payload=(files/name).read_bytes()
        manifest.append({'episode_id':ep['id'],'path':'files/'+ep['slug']+'/'+name,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
(HERE/'file-manifest.json').write_text(dump({'version':CATALOG['version'],'updated_at':CATALOG['updated_at'],'files':manifest}))
(HERE/'dm-links.csv').write_text('\ufeffepisode_id,title,instagram_dm_url,facebook_dm_url\n'+''.join(','.join(['"'+ep['id']+'"','"'+ep['title'].replace('"','""')+'"',f'"{ORIGIN}/start/{ep["slug"]}/?utm_source=instagram&utm_medium=dm"',f'"{ORIGIN}/start/{ep["slug"]}/?utm_source=facebook&utm_medium=dm"'])+'\n' for ep in EPISODES))
print(dump({'pages':len(EPISODES)+1,'topic_kits':len(EPISODES),'files_in_manifest':len(manifest)}))
