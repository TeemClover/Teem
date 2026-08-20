"""Build /xty/read/ — the hub and its four chapters.

One shell, five bodies. The head, the escape hatch and the chapter feet are
identical everywhere by construction rather than by five copies staying in
sync, which is what a hand-written set stops doing after the second edit.
"""
import pathlib

CHAPTERS = [
    ('why',  '01', 'WHY',  'ทำไมต้องมีสมุดแบบนี้'),
    ('how',  '02', 'HOW',  'สมุดหนึ่งเล่มใช้ยังไง'),
    ('what', '03', 'WHAT', 'เอาไปทำอะไรได้บ้าง'),
    ('next', '04', 'NEXT', 'เปิดหน้าแรกของคุณ'),
]

SHELL = '''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="icon" href="/xty/assets/brand/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/xty/assets/brand/teambook-mark-256.png">
<link rel="apple-touch-icon" href="/xty/assets/brand/teambook-icon-180.png">
<meta name="theme-color" content="#FFF9E9">
<title>{title}</title>
<link rel="canonical" href="https://www.myclover.com/xty/read/{slug_path}">
<!-- TEAMBOOK SOCIAL SHARE -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="TeamBook">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://www.myclover.com/xty/assets/brand/teambook-og-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TeamBook — สมุดกลุ่มมีชีวิต · มีฉัน มีเธอ มีเรื่องของเรา">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://www.myclover.com/xty/assets/brand/teambook-og-1200x630.jpg">
<!-- /TEAMBOOK SOCIAL SHARE -->
<meta name="description" content="{desc}">
<link rel="stylesheet" href="/xty/_shared/landing.css?v=20260819-1">
<link rel="stylesheet" href="/xty/_shared/start.css?v=2">
<link rel="stylesheet" href="/xty/_shared/read.css?v=2">
</head>
<body class="landing">

<div class="read-bar">
  <a class="home" href="/xty/read/"><img src="/xty/assets/brand/teambook-logo.png" alt="TeamBook"></a>
  <a class="enter" id="enterApp" href="/xty/start/">เข้า TeamBook</a>
</div>

{body}

<script>
  /* No dead ends. Where "เข้า TeamBook" lands depends on whether this person
     already has a book: the shelf if they do, the front door if they do not. */
  try {{
    if (localStorage.getItem('mc_xty_profile')) {{
      document.getElementById('enterApp').href = '/xty/';
      document.getElementById('enterApp').textContent = 'ไปที่สมุดของฉัน';
    }}
  }} catch (error) {{ /* private mode — the front door is the safe default */ }}
</script>
</body>
</html>
'''

HUB_BODY = '''<main class="read-wrap">
  <img class="read-mascot" src="/xty/assets/decor/mascot/cat-holding-book.webp" alt="" aria-hidden="true" width="233" height="284" fetchpriority="low" decoding="async">
  <p class="eyebrow">TEAMBOOK</p>
  <h1 style="margin:14px 0 0;font-size:clamp(32px,5.6vw,50px);line-height:1.14;letter-spacing:-.025em;font-weight:800">เรื่องของ TeamBook</h1>
  <p class="read-lede">อ่านตอนไหนก็ได้ ไม่ต้องเรียงก็ได้ สี่บทนี้ตอบว่าสมุดกลุ่มแบบนี้มีไว้ทำไม ใช้ยังไง เอาไปทำอะไรได้ และจะเริ่มเล่มแรกยังไง</p>

  <ul class="toc">
{items}
  </ul>

  <p class="read-foot" style="margin-top:40px;padding:0">อยากเริ่มเลยโดยไม่ต้องอ่าน — <a href="/xty/public/">หาสมุดที่เข้าร่วมได้</a> หรือ <a href="/xty/new/">เปิดสมุดของตัวเอง</a></p>
</main>
'''

TOC_ITEM = '''    <li><a href="/xty/read/{slug}/">
      <span class="no">{no}</span>
      <span><b>{name}</b><span>{blurb}</span></span>
      <span class="go">→</span>
    </a></li>'''

WHY = '''<main class="chapter">
  <span class="chapter-no">01 · WHY</span>
  <h1>สำคัญที่ทำด้วยกัน<br>ไม่ใช่นัดเจอกัน</h1>
  <p class="lede">กลุ่มวิ่งส่วนใหญ่ไม่ได้ตายเพราะคนไม่อยากวิ่ง มันตายเพราะนัดไม่ตรงกันสองสามอาทิตย์ แล้วก็เงียบไปเอง</p>

  <h2>ปัญหาไม่ใช่ว่าเราขาดแอปคุย</h2>
  <p>เรามีแชทกลุ่มเยอะเกินพอแล้ว สิ่งที่ขาดไม่ใช่ที่คุย แต่คือที่ที่<b>เห็นกันว่าใครทำอะไรไปแล้ว</b>โดยไม่ต้องคุย และไม่ต้องอยู่พร้อมกัน</p>
  <p>ชีวิตจริงเกิดนอกหน้าจอ คุณวิ่งตอนหกโมงเช้า เพื่อนอ่านหนังสือตอนเที่ยงคืน ถ้าเครื่องมือบังคับให้เจอกันก่อนถึงจะนับ แปลว่ามันกำลังขวางสิ่งที่มันควรจะช่วย</p>

  <h2>ทำไมการมีคนอยู่ด้วยถึงเปลี่ยนอะไรได้</h2>
  <p>เรื่องนี้ไม่ใช่ความรู้สึกลอย ๆ มีงานวิจัยที่ศึกษามานาน</p>

  <div class="cite">
    <b>คนที่กลัวว่าจะถ่วงกลุ่ม คือคนที่ได้จากกลุ่มมากที่สุด</b>
    <p>งานรวบรวมผลการศึกษา 26 ชิ้น ผู้เข้าร่วมกว่า 2,100 คน พบสิ่งที่เรียกว่า Köhler effect — คนที่อ่อนที่สุดในทีมพยายามมากขึ้นเมื่ออยู่ในทีม เทียบกับตอนทำคนเดียว กลไกคือความรู้สึกว่าตัวเองขาดไม่ได้ บวกกับการเห็นคนอื่นทำอยู่</p>
    <cite>Weber &amp; Hertel (2007) · Journal of Personality and Social Psychology 93(6)</cite>
  </div>

  <div class="cite">
    <b>การจดว่าวันนี้ทำอะไร คือตัวแปรที่อธิบายผลได้มากที่สุด</b>
    <p>งานวิเคราะห์ 122 การประเมิน ผู้เข้าร่วมรวม 44,747 คน ในเรื่องการกินและการออกกำลังกาย พบว่าการบันทึกตัวเอง (self-monitoring) อธิบายความต่างของผลลัพธ์ระหว่างงานวิจัยได้มากที่สุด และได้ผลดีขึ้นอีกเมื่อมีอีกเทคนิคหนึ่งควบคู่ไปด้วย</p>
    <cite>Michie, Abraham, Whittington, McAteer &amp; Gupta (2009) · Health Psychology 28(6)</cite>
  </div>

  <p>ในสมุด สองอย่างนี้คือ <b>ลงชื่อ</b> กับ <b>เห็นแล้ว</b> — จดว่าวันนี้ทำแล้ว และมีใครสักคนเห็น</p>

  <h2>แต่ไม่ต้องทำเรื่องเดียวกันก็ได้</h2>
  <p>สมุดหนึ่งเล่มรองรับสองแบบ จะตกลงกันว่าทำเรื่องเดียวกันทั้งเล่มก็ได้ หรือต่างคนต่างมีเรื่องของตัวเองก็ได้ สิ่งที่ใช้ร่วมกันคือหน้ากระดาษ ไม่ใช่ภารกิจ</p>
  <p>เพราะแบบนั้น เล่มหนึ่งจึงมีคนวิ่ง คนอ่านหนังสือ คนดูแลต้นไม้ และคนที่แค่อยากเปิดไฟล์งานที่หนีมาสามวัน อยู่ด้วยกันได้โดยไม่มีใครต้องยอมใคร</p>
</main>
'''

HOW = '''<main class="chapter">
  <span class="chapter-no">02 · HOW</span>
  <h1>สมุดหนึ่งเล่ม<br>ใช้ยังไง</h1>
  <p class="lede">เปิดสมุด เลือกว่าจะเล่นแบบไหน แล้วออกไปใช้ชีวิต วันละครั้งกลับมาลงชื่อ เท่านั้นจริง ๆ</p>

  <h2>ตอนเปิดเล่ม เลือกก่อนว่าจะเล่นแบบไหน</h2>
  <div class="own-grid" style="margin-top:18px">
    <div class="own">
      <b>ทำเรื่องเดียวกัน</b>
      <span>ทุกคนทำกิจกรรมเดียวกัน แต่ตั้งเป้าของตัวเองได้ — เล่มนี้อ่านหนังสือ แต่คุณอ่าน 10 หน้า เพื่อนอ่าน 20 นาที</span>
    </div>
    <div class="own">
      <b>ต่างคนต่างทำ</b>
      <span>แต่ละคนเลือกกิจกรรมของตัวเองตอนเข้าร่วม แล้วกลับมาลงชื่อในสมุดเดียวกัน</span>
    </div>
  </div>

  <h2>ตกลงให้ชัดว่า “วันนี้นับว่าได้ทำเมื่อ…”</h2>
  <p>ไม่ใช่การตรวจสอบ แต่เป็นการตกลงกับตัวเองล่วงหน้าว่าแค่ไหนถึงนับ ซึ่งเป็นจุดที่งานวิจัยบอกว่าต่างจากการแค่ตั้งใจไว้เฉย ๆ</p>

  <div class="cite">
    <b>การตกลงล่วงหน้าว่า “ถ้า… แล้วฉันจะ…” ได้ผลกว่าความตั้งใจเปล่า ๆ</b>
    <p>งานรวบรวมการทดสอบอิสระ 94 ชิ้น ผู้เข้าร่วมกว่า 8,000 คน พบผลขนาดกลางถึงใหญ่ (d = 0.65) ต่อการทำเป้าหมายได้สำเร็จ ทั้งตอนเริ่มลงมือ ตอนกันสิ่งรบกวน และตอนเลิกทำสิ่งที่ไม่เวิร์ก</p>
    <cite>Gollwitzer &amp; Sheeran (2006) · Advances in Experimental Social Psychology 38</cite>
  </div>

  <h2>วันหนึ่งในสมุด</h2>
  <ul>
    <li><b>ลงชื่อ</b> — วันละครั้ง บอกว่าวันนี้ทำแล้ว แนบรูปได้หนึ่งรูป หรือไม่แนบก็ได้</li>
    <li><b>เห็นแล้ว</b> — คนในสมุดกดให้กัน ไม่ใช่การตรวจ แค่บอกว่าเห็นนะ</li>
    <li><b>เขียนสั้น ๆ</b> — วันละไม่กี่ข้อความ ครั้งละไม่เกิน 120 ตัวอักษร ห้องจะได้ไม่ท่วมจนไม่มีใครอยากเปิด</li>
  </ul>
  <p>วันที่พลาดไม่ต้องหายไปจากกลุ่ม วันต่อไปยังกลับมาได้ เพราะไม่มีคะแนนที่ต้องไล่ตามใคร</p>

  <h2>มีสัตว์อีกตัวอยู่ในสมุดด้วย</h2>
  <p>เพื่อนร่วมทางของเล่มจะอ่านสิ่งที่เกิดขึ้นจริงในสมุด แล้วพูดเท่าที่จำเป็น บางวันมันทักว่าเมื่อวานทุกคนกลับมาครบ บางวันมันเงียบ เพราะคำตอบที่ดีที่สุดคือปล่อยให้คนได้อยู่ด้วยกันเอง มันไม่ได้ออกไปทำแทนใคร และไม่ได้ตอบทุกข้อความ</p>

  <h2>พอหมดเวลา</h2>
  <p>สมุดจะปิดเล่ม แล้วรวมสิ่งที่เกิดขึ้นจริงตลอดเล่มเป็นซอสไฟล์เดียว ทุก 7 วันนับเป็นหนึ่งตอน — 7 วันได้ 1 ตอน 28 วันได้ 4 ตอน และทุกเล่มได้ปกปิดท้าย 3 แบบให้เลือกเก็บ 1</p>
</main>
'''

WHAT = '''<main class="chapter">
  <span class="chapter-no">03 · WHAT</span>
  <h1>เอาไปทำ<br>อะไรได้บ้าง</h1>
  <p class="lede">อะไรก็ได้ที่ตอบได้ว่า “วันนี้ทำอะไรถึงนับว่าได้ทำ” กิจกรรมแบ่งเป็นสี่สี ไม่ใช่เพื่อจัดหมวด แต่เพื่อให้เลือกได้เร็ว</p>

  <h2>🔥 แดง — ร่างกาย</h2>
  <p>เดิน · วิ่ง · ออกกำลัง · กินอร่อย · หรือเขียนเอง</p>

  <h2>🍃 เขียว — ชีวิตและการดูแล</h2>
  <p>กินให้ดี · นอนให้พอ · งานบ้าน · ดูแลตัวเอง · หรือเขียนเอง</p>

  <h2>💧 น้ำเงิน — ใจและการเรียนรู้</h2>
  <p>อ่าน · เรียน · พักใจ · เกม · หรือเขียนเอง</p>

  <h2>⚙️ เงิน — งานและการสร้าง</h2>
  <p>ทำงาน · สร้างสรรค์ · ซื้อขาย · ทำโปรเจ็กต์ · หรือเขียนเอง</p>

  <h2>ทุกสีมี “เขียนเอง” ของตัวเอง</h2>
  <p>ถ้าเรื่องที่อยากทำไม่ตรงกับอะไรเลย เขียนเองได้ สีจะตามหมวดที่เลือก ชื่อกิจกรรมใส่เอง คำอธิบายจะใส่หรือไม่ใส่ก็ได้</p>

  <h2>สองแบบในเล่มเดียว</h2>
  <p>ถ้าเล่มนี้ตกลงกันว่า <b>ทำเรื่องเดียวกัน</b> เจ้าของสมุดเลือกกิจกรรมของเล่ม แล้วทุกคนใช้ร่วมกัน แต่ตั้งเป้าของตัวเองได้</p>
  <p>ถ้าเล่มนี้เป็นแบบ <b>ต่างคนต่างทำ</b> ทุกคนเลือกของตัวเองตอนเข้าร่วม แล้วในหน้าเดียวกันจะมีสีของกิจกรรมแต่ละคนอยู่ปนกัน ซึ่งเป็นภาพที่ตรงกับชีวิตจริงมากกว่า</p>
</main>
'''

NEXT = '''<main class="chapter">
  <span class="chapter-no">04 · NEXT</span>
  <h1>แล้วเล่มแรกของคุณ<br>จะเป็นเรื่องอะไร?</h1>
  <p class="lede">ไม่ต้องเตรียมตัวให้พร้อม ไม่ต้องมีเป้าหมายใหญ่ เลือกเรื่องเล็ก ๆ สักเรื่องที่อยากให้เกิดขึ้นจริง แล้วเริ่ม</p>

  <h2>ทาง A — มีบางอย่างที่อยากชวนคนอื่นทำไปด้วยกัน</h2>
  <p>เล่มนี้จะมีกิจกรรมร่วมกันหนึ่งอย่าง แต่ละคนตั้งเป้าของตัวเองได้</p>
  <div class="start-cta" style="padding:18px 0 0;text-align:left">
    <div class="row" style="justify-content:flex-start">
      <a class="btn primary" href="/xty/new/?mode=shared">เปิดสมุดแบบทำเรื่องเดียวกัน</a>
    </div>
  </div>

  <h2>ทาง B — แค่อยากมีที่ที่ทุกคนกลับมาเจอกัน</h2>
  <p>แต่ละคนเลือกเรื่องของตัวเอง แล้วมาอยู่หน้าเดียวกัน</p>
  <div class="start-cta" style="padding:18px 0 0;text-align:left">
    <div class="row" style="justify-content:flex-start">
      <a class="btn primary" href="/xty/new/?mode=individual">เปิดสมุดแบบต่างคนต่างทำ</a>
    </div>
  </div>

  <img class="read-seal" src="/xty/assets/decor/mascot/cat-holding-clover.webp" alt="" aria-hidden="true" width="245" height="321" loading="lazy" decoding="async">

  <h2>ยังไม่มีใครให้ชวน?</h2>
  <p>เข้าไปอยู่ในสมุดที่คนอื่นเปิดไว้ได้เลย ไม่ต้องรอใครว่าง อ่านเรื่องที่เขาเขียนกันมาก่อนแล้วค่อยตัดสินใจ</p>
  <blockquote class="pull" style="margin-left:0;margin-right:0">ไม่ต้องรู้ว่าเขาเป็นใครจริง ๆ<br>ไม่ต้องบอกว่าคุณเป็นใคร<br><b>ขอแค่รู้ว่ามีใครบางคน พร้อมเห็นสิ่งที่เราทำ</b></blockquote>

  <div class="cite">
    <b>กลุ่มเล็กที่ไม่เปิดเผยตัวตน เปลี่ยนพฤติกรรมได้จริง</b>
    <p>งานทบทวนอย่างเป็นระบบของ Cochrane รวม 27 การศึกษา ผู้เข้าร่วม 10,565 คน พบว่าโมเดลกลุ่มช่วยเหลือกันแบบ Alcoholics Anonymous ให้ผลดีกว่าการรักษาแบบอื่นที่ยอมรับกันแล้วในแง่การหยุดดื่มต่อเนื่อง ในเรื่องที่ขึ้นชื่อว่าเปลี่ยนยากที่สุดเรื่องหนึ่ง</p>
    <cite>Kelly, Humphreys &amp; Ferri (2020) · Cochrane Database of Systematic Reviews, Issue 3</cite>
  </div>

  <div class="cite claim">
    <b>มีแอปที่ทำแบบนี้อยู่แล้ว และทำมาสิบปี</b>
    <p>みんチャレ (minChalle) ของญี่ปุ่น แยกตัวจากโครงการสร้างธุรกิจใหม่ของ Sony ปี 2017 ใช้ทีมละ 5 คนที่ไม่รู้จักกัน แชทกลุ่มห้องเดียว โพสต์วันละครั้ง และสมาชิกกดรับรองให้กัน — โครงเดียวกับสมุดเล่มหนึ่งเกือบทุกข้อ บริษัทรายงานว่ามีผู้ใช้เกินหนึ่งล้านคนในปี 2022 และมีงานตีพิมพ์ใน JMIR Aging (2024) ที่ศึกษาผู้สูงอายุ 74 คนเป็นเวลา 12 สัปดาห์ พบว่าจำนวนก้าวเพิ่มขึ้น โดยผู้วิจัยระบุเองว่ายังต้องศึกษาต่อ</p>
    <cite>ตัวเลขผู้ใช้เป็นรายงานของบริษัท A10 Lab ไม่ใช่งานวิจัย · TeamBook ยังไม่มีหลักฐานผลลัพธ์ของตัวเอง เราออกแบบตามหลักการเดียวกันเท่านั้น</cite>
  </div>

  <h2>มีรหัสสมุดอยู่แล้ว</h2>
  <p>ถ้าเพื่อนส่งรหัสมาให้ ใส่รหัสแล้วเข้าไปได้เลย</p>
  <div class="start-cta" style="padding:18px 0 0;text-align:left">
    <div class="row" style="justify-content:flex-start">
      <a class="btn secondary" href="/xty/public/">หาสมุดสาธารณะ</a>
      <a class="btn secondary" href="/xty/join/">ใส่รหัสสมุด</a>
    </div>
  </div>
</main>
'''

BODIES = {'why': WHY, 'how': HOW, 'what': WHAT, 'next': NEXT}

def nav(index):
    prev_link = ('<a href="/xty/read/%s/">← %s</a>' % (CHAPTERS[index - 1][0], CHAPTERS[index - 1][2])
                 if index > 0 else '<a href="/xty/read/">← หน้าสารบัญ</a>')
    next_link = ('<a href="/xty/read/%s/">%s →</a>' % (CHAPTERS[index + 1][0], CHAPTERS[index + 1][2])
                 if index + 1 < len(CHAPTERS) else '<a href="/xty/new/">เปิดสมุดเล่มแรก →</a>')
    return ('<nav class="chapter-nav">%s<span class="spacer"></span>%s</nav>\n'
            '<p class="read-foot">หน้า %s / 04 · <a href="/xty/read/">กลับไปหน้าสารบัญ</a></p>'
            % (prev_link, next_link, CHAPTERS[index][1]))

root = pathlib.Path('xty/read')
root.mkdir(parents=True, exist_ok=True)

items = '\n'.join(TOC_ITEM.format(slug=slug, no=no, name=name, blurb=blurb)
                  for slug, no, name, blurb in CHAPTERS)
(root / 'index.html').write_text(SHELL.format(
    title='เรื่องของ TeamBook',
    slug_path='',
    desc='อ่านว่าสมุดกลุ่มแบบนี้มีไว้ทำไม ใช้ยังไง เอาไปทำอะไรได้ และจะเริ่มเล่มแรกยังไง',
    body=HUB_BODY.format(items=items),
), encoding='utf-8')

for index, (slug, no, name, blurb) in enumerate(CHAPTERS):
    page = root / slug
    page.mkdir(exist_ok=True)
    (page / 'index.html').write_text(SHELL.format(
        title='%s %s — %s | TeamBook' % (no, name, blurb),
        slug_path='%s/' % slug,
        desc=blurb,
        body=BODIES[slug] + '\n' + nav(index),
    ), encoding='utf-8')

print('built /xty/read/ + %d chapters' % len(CHAPTERS))
