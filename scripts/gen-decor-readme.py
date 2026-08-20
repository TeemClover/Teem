#!/usr/bin/env python3
"""Write xty/assets/decor/README.md from the files that are actually there.

Hand-written inventories go stale the first time someone adds a sticker.
This one is generated, so a wrong row means the build was not re-run.
"""
import os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECOR = os.path.join(ROOT, 'xty/assets/decor')

# What each file is for, in the words of whoever has to pick one.
USE = {
 'brand': {
  'notebook-mark':'สมุดปิด + dual-stroke + RGBS — navbar, โปรไฟล์, ชั้นหนังสือ',
  'heart-mark':'หัวใจสองเส้น — micro mark, loading, accent',
  'me-bubble':'.me bubble — lockup ของ teambook.me',
  'clover-heritage':'โคลเวอร์สี่ใบ — heritage / ลายเซ็นผู้ก่อตั้ง / easter egg',
  'activity-fire':'ไอคอนกิจกรรม Fire',
  'activity-leaf':'ไอคอนกิจกรรม Leaf',
  'activity-water':'ไอคอนกิจกรรม Water',
  'activity-craft':'ไอคอนกิจกรรม Craft',
 },
 'mascot': {
  'cat-pencil-wink':'ชวนให้เขียน — ปุ่มลงชื่อ, เพิ่มกิจกรรม',
  'cat-asleep-on-book':'empty state — ยังไม่มีอะไรในสมุด',
  'cat-holding-book':'ต้อนรับ — onboarding, หน้าแรกของสมุดใหม่',
  'cat-yarn':'ประดับแบบเล่น ๆ',
  'cat-looking-up':'ค้นหา / อยากรู้ — หน้ารวมสมุดสาธารณะ',
  'cat-in-box':'เซอร์ไพรส์ / รางวัล',
  'cat-holding-clover':'ชมเชย — ครบรอบ, ทำได้',
  'cat-asleep':'สงบ / วันนี้ยังไม่มีอะไรใหม่',
 },
 'sticker': {
  'bubble-blank':'tooltip / โน้ตว่าง','bubble-heart':'reaction ชื่นชม',
  'bubble-mini-me':'bubble จิ๋ว .me','bubble-mini-heart':'bubble จิ๋วหัวใจ',
  'bubble-mini-clover':'bubble จิ๋วโคลเวอร์','bubble-mini-dots':'bubble จิ๋วกำลังพิมพ์',
  'note-clipped':'ทิป / โน้ตที่ปักไว้','sticky-yellow':'callout / ทิป',
  'sticky-heart':'ช่วงเวลาที่แชร์กัน','sticky-clover':'โน้ต heritage',
  'ribbon-note':'ป้าย / โน้ต','tape-clover':'ป้ายหัวข้อ section',
  'ribbon-blank-wide':'หัวข้อ section แบบกว้าง','ribbon-blank-short':'badge สั้น',
  'ribbon-tabs-warm':'สถานะกิจกรรม แดง/เขียว','ribbon-tabs-cool':'สถานะกิจกรรม ฟ้า/เทา',
  'reaction-lets-go':"reaction “Let's go!”",'reaction-good-job':'reaction “Good job!”',
  'reaction-see-you-tomorrow':'reaction “See you tomorrow!”','reaction-same-page':'reaction “On the same page!”',
  'reaction-heart':'reaction หัวใจ','reaction-like':'reaction ถูกใจ',
  'note-lets-go':"กระดาษ “Let's go!”",'note-heart':'bubble หัวใจบนกระดาษ',
  'tags-on-string':'tag / metadata','label-team':'ป้าย Team',
  'label-progress':'ป้าย Progress','label-memory':'ป้าย Memory','label-together':'ป้าย Together',
  'button-fire':'ปุ่มกลม Fire','button-leaf':'ปุ่มกลม Leaf',
  'button-water':'ปุ่มกลม Water','button-craft':'ปุ่มกลม Craft',
  'activity-tabs-icons':'แถบกิจกรรมพร้อมไอคอน (ติดกันเป็นชิ้นเดียว)',
  'activity-tabs-plain':'แถบกิจกรรมสีล้วน (ติดกันเป็นชิ้นเดียว)',
 },
 'stationery': {
  'coffee-clover':'เช้า / อบอุ่น','coffee-foam':'เช้า / อบอุ่น (ถ้วยใหญ่)',
  'notebook-open':'section เรื่องเล่า / ความทรงจำ','notebook-open-large':'ภาพประกอบใหญ่',
  'notebook-closed':'ชั้นหนังสือ / คลัง','notebook-strapped':'object แบรนด์รอง',
  'cards-fan':'ภาพประกอบระบบการ์ด/กิจกรรม','memory-jar':'สะสมความทรงจำ',
  'pencil':'เขียน / แก้ไข','pencil-red':'ดินสอแดง','pencil-green':'ดินสอเขียว','pencil-grey':'ดินสอเทา',
  'photo-stack':'สรุป / ความทรงจำ','feather-pen':'บทส่งท้าย',
  'signpost':'เส้นทาง Dream / Do / Share','wax-seal':'ตราปิดท้าย / พิธีจบเล่ม',
  'clip-paper':'คลิปหนีบกระดาษ','clip-binder':'คลิปดำ',
  'pin-red':'หมุดแดง','pin-blue':'หมุดฟ้า','pin-yellow':'หมุดเหลือง',
  'washi-kraft':'เทปกระดาษคราฟท์','washi-gingham-pink':'เทปลายสก็อตชมพู',
  'washi-gingham-green':'เทปลายสก็อตเขียว','washi-stars-blue':'เทปลายดาวฟ้า',
  'washi-stripe-yellow':'เทปลายทางเหลือง',
 },
 'doodle': {
  'star':'รางวัล / เน้น','heart':'ช่วงเวลาที่แชร์กัน','clover':'accent heritage',
  'plane':'ชวนเพื่อน / แชร์','plane-outline':'ชวนเพื่อน (ลายเส้น)','plane-path':'ชวนเพื่อน + เส้นทาง',
  'music-note':'accent เล่น ๆ','flower':'ประดับ','leaves':'accent สงบ / เติบโต',
  'sprout':'เริ่มต้นใหม่','footprint':'เส้นทาง / ความคืบหน้า','heart-path':'เส้นเชื่อม / คั่น',
  'scribble-red':'ไฮไลต์แดง','scribble-green':'ไฮไลต์เขียว','scribble-blue':'ไฮไลต์ฟ้า',
  'scribble-grey':'ไฮไลต์เทา','scribble-yellow':'ไฮไลต์เหลือง','scribble-pink':'ไฮไลต์ชมพู',
  'scribble-green-soft':'ไฮไลต์เขียวอ่อน','scribble-blue-soft':'ไฮไลต์ฟ้าอ่อน',
 },
}

GROUPS = [
 ('brand', 'Brand', 'เครื่องหมายของ TeamBook เอง — ใช้ตรงที่ต้องบอกว่านี่คือแบรนด์อะไร'),
 ('mascot', 'Mascot', 'แมวขาว เป็นเพื่อนร่วมทาง ไม่ใช่ส่วนหนึ่งของโลโก้'),
 ('sticker', 'Sticker', 'โน้ต ป้าย reaction และชิ้นส่วน UI ที่แปะลงหน้าได้'),
 ('stationery', 'Stationery', 'สมุด เครื่องเขียน และของบนโต๊ะ'),
 ('doodle', 'Doodle', 'เส้นวาดเล่น ใช้เป็น accent ไม่ใช่ตัวเอกของหน้า'),
]

def main():
    lines = []
    w = lines.append
    total_files = total_kb = 0
    body = []
    for key, title, blurb in GROUPS:
        files = sorted(glob.glob(f'{DECOR}/{key}/*.webp'))
        body.append(f'\n### {title} — `{key}/` ({len(files)} ชิ้น)\n')
        body.append(f'{blurb}\n')
        body.append('| ไฟล์ | ขนาด | น้ำหนัก | ใช้ตอนไหน |')
        body.append('|---|---|---|---|')
        for f in files:
            name = os.path.basename(f)[:-5]
            im = Image.open(f)
            kb = os.path.getsize(f) / 1024
            total_files += 1
            total_kb += kb
            use = USE.get(key, {}).get(name)
            if use is None:
                raise SystemExit(f'{key}/{name} has no description — add one to USE')
            body.append(f'| `{name}.webp` | {im.width}×{im.height} | {kb:.1f} KB | {use} |')

    w('# TeamBook — Decor Library')
    w('')
    w(f'ภาพประดับ {total_files} ชิ้น พื้นใส ขนาดรวม {total_kb:.0f} KB — เอาไปแปะในหน้าไหนก็ได้')
    w('ทุกชิ้นถูกครอปชิดขอบภาพของตัวเองแล้ว ไม่มีขอบเปล่าเหลือ')
    w('')
    w('```')
    w('xty/assets/decor/')
    for key, title, _ in GROUPS:
        n = len(glob.glob(f'{DECOR}/{key}/*.webp'))
        w(f'  {key + "/":<13}{n:>2} ชิ้น   {title}')
    w('  _source/     PNG ต้นฉบับ ห้ามลบ (ดูหัวข้อ "ต้นฉบับ")')
    w('```')
    w('')
    w('## เอาไปใช้ยังไง')
    w('')
    w('ภาพพวกนี้เป็น**ของประดับ** ไม่ใช่เนื้อหา คนที่ใช้โปรแกรมอ่านหน้าจอไม่ควรต้องฟังว่า')
    w('มีสติกเกอร์รูปหัวใจอยู่ตรงมุม เพราะฉะนั้นปล่อย `alt` ว่างไว้ แล้วซ่อนจาก accessibility tree')
    w('')
    w('```html')
    w('<img src="/xty/assets/decor/mascot/cat-holding-book.webp"')
    w('     alt="" aria-hidden="true" width="233" height="284"')
    w('     loading="lazy" decoding="async">')
    w('```')
    w('')
    w('ใส่ `width`/`height` เสมอ ถึงจะย่อด้วย CSS ก็ตาม — เบราว์เซอร์ใช้สองค่านี้จองที่ไว้ก่อน')
    w('ภาพจะโหลด ถ้าไม่ใส่ หน้าจะกระตุกตอนภาพมาถึง ขนาดจริงของทุกไฟล์อยู่ในตารางข้างล่าง')
    w('')
    w('ถ้าภาพนั้น**สื่อความหมาย**จริง (เช่น ไอคอนกิจกรรมที่บอกว่าอันไหนคืออันไหน) ก็เขียน `alt`')
    w('ให้ตรงกับความหมายนั้น แล้วเอา `aria-hidden` ออก')
    w('')
    w('## กฎที่ควรรู้ก่อนหยิบ')
    w('')
    w('- **หนึ่งหน้าจอ ใส่ไม่กี่ชิ้น** ให้รู้สึกเหมือนสมุดที่มีคนใช้จริง ไม่ใช่กำแพงสติกเกอร์')
    w('- **แมวไม่ใช่โลโก้** เป็นเพื่อนร่วมทาง โลโก้หลักคือสมุดปิด + dual-stroke + RGBS')
    w('- **Fire / Leaf / Water / Craft** เป็นภาพประกอบของระบบกิจกรรม ไม่ใช่โลโก้')
    w('- **โคลเวอร์สี่ใบ** เป็น heritage ของ myClover ใช้เป็นลายเซ็น ไม่ใช่ตราหลักของ TeamBook')
    w('- อย่ายืดภาพผิดสัดส่วน ทุกชิ้นวาดมาในอัตราส่วนของตัวเอง')
    w('')
    w('## ต้นฉบับ')
    w('')
    w('`_source/` คือ PNG ที่ตัดพื้นหลังแล้ว เป็นต้นฉบับของทุกไฟล์ในนี้ **อย่าลบ** — ถ้าวันหนึ่ง')
    w('อยากได้ไฟล์คมกว่านี้ หรืออยากตัดชิ้นใหม่ออกจากแผ่นเดิม ต้องใช้มัน')
    w('')
    w('สร้างไฟล์ `.webp` ทั้งหมดใหม่ด้วย:')
    w('')
    w('```bash')
    w('pip install pillow numpy scipy')
    w('python3 scripts/build-decor.py')
    w('```')
    w('')
    w('สคริปต์นั้นทำสามอย่าง: ครอปให้ชิดภาพ, แยกแผ่นที่ยังมีหลายชิ้นออกจากกันด้วย alpha,')
    w('แล้วเซฟเป็น webp คุณภาพ 82 โดยเก็บพื้นใสไว้ ชื่อไฟล์กำหนดไว้ในตาราง `KEEP` และ `SPLIT`')
    w('ในสคริปต์ ถ้าจะเพิ่มชิ้นใหม่ ให้เพิ่มที่นั่นและเพิ่มคำอธิบายใน `scripts/gen-decor-readme.py`')
    w('ไม่งั้นสคริปต์จะไม่ยอมสร้างไฟล์นี้ให้')
    w('')
    w('แผ่น `SourceSheet_A/B.png` ขนาดเต็ม (1536×1024) ไม่ได้อยู่ใน repo เพราะทุกชิ้นที่ใช้ได้')
    w('ถูกตัดออกมาแล้ว ถ้าต้องการ ให้กลับไปหาจาก zip ต้นทาง')
    w('`TeamBook_Web_Decor_PNG_Pack_v2_CleanCut.zip`')
    w('')
    w('## รายการทั้งหมด')
    lines.extend(body)
    w('')
    out = os.path.join(DECOR, 'README.md')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print(f'wrote {out}: {total_files} files, {total_kb:.0f} KB')

if __name__ == '__main__':
    main()
