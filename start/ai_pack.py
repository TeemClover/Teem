"""Readable, selectable-text Thai handoffs; no account or model dependency."""
from html import escape as E

UPLOAD_MESSAGE = 'อ่านไฟล์นี้ แล้วช่วยฉันทำแบบฝึกตามหัวข้อ ถ้าข้อมูลยังไม่พอ ให้ถามทีละข้อ เริ่มจากคำถามแรกได้เลย'

def starter_text(ep, prompt, version, updated_at):
    points='\n'.join('- '+line for line in ep['clip_points'])
    return f'''myClover | {ep['id']} | {ep['title']}
รุ่น {version} | ปรับปรุง {updated_at}
หน้าแบบฝึก: https://www.myclover.com/start/{ep['slug']}/

1. วิธีเริ่มใช้
แนบ PDF หรือไฟล์ข้อความนี้ใน AI ที่รองรับ แล้วส่งข้อความ:
“{UPLOAD_MESSAGE}”
ถ้าแนบไฟล์ไม่ได้ ให้คัดลอกข้อความทั้งหมดในไฟล์นี้ไปวางในแชต
ไม่ต้องกรอกให้ครบก่อนเริ่ม ข้อมูลที่ยังไม่มีให้ AI ถามต่อทีละข้อ

2. เรื่องนี้ช่วยอะไร
{ep['outcome']}

3. บริบทจากคลิป
{points}

4. คำสั่งสำหรับ AI และข้อมูลตั้งต้น
{prompt}

5. หลังได้ร่าง
{ep['action']}
ตรวจร่างกับข้อมูลจริงก่อนใช้ จดสิ่งที่เกิดขึ้นหนึ่งอย่างแล้วค่อยปรับรอบถัดไป

ไฟล์นี้เป็นแบบฝึกเปล่า ไม่ได้เก็บคำตอบที่คุณกรอกบนเว็บ
หากกรอกบนเว็บแล้ว ให้ดาวน์โหลด “คำสั่งพร้อมข้อมูลของฉัน” เป็น TXT แทน
อย่าใส่ข้อมูลส่วนตัวของลูกค้า ผลที่ AI ร่างยังต้องตรวจเอง
ความสามารถแนบและอ่านไฟล์ขึ้นกับบริการและบัญชี ถ้าอ่านไม่ได้ให้ใช้ข้อความทั้งหมดแทน
'''

def print_html(ep, prompt, version, updated_at):
    points=''.join('<li>'+E(p)+'</li>' for p in ep['clip_points'])
    questions=''.join(f'<div class="question"><b>{i+1:02} / {E(q)}</b><p>ข้อมูลของฉัน: .................................................................................</p></div>' for i,q in enumerate(ep['fields']))
    # A single column and actual Unicode text preserve reading order in extraction.
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><title>{E(ep['id']+' '+ep['title'])} - myClover AI Starter</title><style>
@font-face{{font-family:Kanit;src:url(../assets/fonts/Kanit-Regular.ttf);font-weight:400}}
@font-face{{font-family:Kanit;src:url(../assets/fonts/Kanit-SemiBold.ttf);font-weight:600}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box}}body{{margin:0;color:#254f3b;font:11pt/1.55 Kanit,sans-serif}}
.page{{width:210mm;height:297mm;padding:17mm 18mm 16mm;position:relative;break-after:page;background:#fffefa}}.page:last-child{{break-after:auto}}
.brand{{font-weight:600;font-size:12pt;border-bottom:1px solid #cad4c3;padding-bottom:3mm;margin-bottom:6mm}}.brand span{{float:right;color:#68765c;font-size:9pt}}
.eyebrow{{font-size:10pt;color:#68765c;margin:0 0 2mm}}h1{{font-size:25pt;line-height:1.3;margin:0 0 4mm}}h2{{font-size:17pt;margin:4mm 0 2mm;line-height:1.4}}p{{margin:2mm 0}}.lead{{font-size:12pt;line-height:1.55}}.box{{background:#e8eedc;padding:3mm 5mm;border-radius:3mm;margin:4mm 0}}.box p{{margin:1mm 0}}ol,ul{{padding-left:7mm;margin:2mm 0}}li{{margin:1mm 0}}.question{{margin-top:3mm;padding-bottom:2mm;border-bottom:1px solid #dbe1d2}}.question b{{font-weight:600;font-size:11pt}}.question p{{font-size:10pt;color:#68765c}}.small{{font-size:9pt;color:#68765c}}.prompt{{font-size:10pt;line-height:1.72;white-space:pre-wrap;overflow-wrap:anywhere;margin:3mm 0 0}}.footer{{position:absolute;bottom:8mm;left:18mm;right:18mm;font-size:8pt;color:#68765c;border-top:1px solid #dbe1d2;padding-top:2mm;display:flex;justify-content:space-between}}a{{color:inherit}}
</style></head><body><section class="page"><div class="brand">myClover <span>โชคดีที่หาเจอ</span></div>
<p class="eyebrow">คู่คลิป {ep['id']} / แบบฝึกพร้อมคำสั่ง AI</p><h1>{E(ep['title'])}</h1><p class="lead">{E(ep['outcome'])}</p>
<div class="box"><h2 style="margin-top:0">เริ่มได้ใน 3 ขั้น</h2><ol><li>เปิด AI ที่ใช้ แล้วแนบ PDF นี้</li><li>ส่งข้อความด้านล่าง</li><li>ตอบคำถามทีละข้อ แล้วตรวจร่างก่อนนำไปลอง</li></ol><p><b>ข้อความที่ส่งพร้อมไฟล์</b></p><p>{E(UPLOAD_MESSAGE)}</p></div>
<h2>จากคลิปสู่สิ่งที่จะลอง</h2><ul>{points}</ul><h2>ข้อมูลจริง 3 ข้อ</h2><p class="small">คิดไว้ก่อน หรือให้ AI ถามตอนเริ่มก็ได้ ไม่ต้องกรอก PDF ให้ครบ</p>{questions}
<p class="small">ถ้าแนบไฟล์ไม่ได้ ใช้ TXT คู่กันแล้วคัดลอกข้อความทั้งหมดไปวางในแชต</p>
<div class="footer"><span>{ep['id']} / รุ่น {E(version)} / {E(updated_at)}</span><span>1 / 3 · อ่านและเริ่ม</span></div></section>
<section class="page"><div class="brand">myClover <span>{ep['id']} / คำสั่งพร้อมใช้</span></div><h2 style="margin-top:0">คำสั่งสำหรับ AI</h2><p class="small">ให้ AI ใช้คำสั่งและคำถามในหน้านี้ประกอบคำตอบจริงของเจ้าของงาน</p><div class="prompt">{E(prompt)}</div>
<div class="footer"><span>{ep['id']} / {E(ep['title'])}</span><span>2 / 3 · ให้ AI ช่วยร่าง</span></div></section>
<section class="page"><div class="brand">myClover <span>{ep['id']} / ลงมือทำต่อ</span></div><p class="eyebrow">หลังได้ร่าง อย่าหยุดที่คำตอบในแชต</p><h1>เลือกทำหนึ่งอย่าง<br>กับข้อมูลจริง</h1><div class="box"><p class="lead">{E(ep['action'])}</p></div>
<h2>ก่อนเอาร่างไปใช้</h2><ol><li>เช็กว่าตรงกับสิ่งที่คุณทำได้และข้อมูลจริงหรือไม่</li><li>แยกข้อเท็จจริงออกจากสิ่งที่ AI เสนอหรือคาดเดา</li><li>แก้ตัวเลข ชื่อ เงื่อนไข และข้อความที่ยังยืนยันไม่ได้</li><li>ลองขั้นเล็กก่อน แล้วบันทึกผลจริงหนึ่งอย่าง</li></ol>
<h2>ถ้า AI ยังตอบกว้างเกินไป</h2><div class="box"><p>“ย่อให้เหลืองานเล็กหนึ่งอย่างที่ฉันทำได้วันนี้ ถ้าขาดข้อมูลให้ถามเพิ่มทีละข้อ แล้วช่วยร่างสิ่งที่นำไปลองได้จริง”</p></div>
<h2>กลับมาทำต่อบนเว็บ</h2><p><a href="https://www.myclover.com/start/{ep['slug']}/">myclover.com/start/{ep['slug']}/</a></p><p>กรอกข้อมูลบนเว็บ แล้วเลือก “คำสั่งพร้อมข้อมูลของฉัน” เพื่อเก็บคำตอบไปใช้กับ AI ต่อ</p>
<p class="small">PDF นี้เป็นแบบฝึกเปล่าของเรื่อง {ep['id']} ไม่มีคำตอบที่เคยกรอกในเว็บ ตัวไฟล์ใช้ข้อความที่เลือกและคัดลอกได้ ไม่ต้องสแกนภาพก่อนอ่าน</p><p class="small">แต่ละบริการและบัญชีรองรับไฟล์ต่างกัน หากแนบหรืออ่าน PDF ไม่ได้ ให้คัดลอก TXT ทั้งไฟล์แทน ไม่จำเป็นต้องสมัครบริการเสียเงินเพื่อใช้แบบฝึกนี้</p>
<div class="footer"><span>ใช้ข้อมูลจริง / ตรวจร่างก่อนใช้ / ไม่รับประกันรายได้</span><span>3 / 3 · ลองและปรับ</span></div></section></body></html>'''
