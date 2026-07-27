#!/usr/bin/env python3
"""สร้างภาพย่อ/แปลงฟอร์แมต + หน้าเว็บของ /forge/ ทั้งหมด"""
from PIL import Image
import os, shutil, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# โฟลเดอร์ภาพต้นฉบับ (00.png … 10.png) — ตั้งด้วย FORGE_SRC ได้
SRC  = os.environ.get('FORGE_SRC') or os.path.join(ROOT, '.forge-src')
DEST = os.path.join(ROOT, 'forge')
IMG  = os.path.join(DEST, 'img')
SITE = 'https://myclover.com'

# (ไฟล์ต้นทาง, เลขตอนที่แสดง, ชื่อตอน, slug, เป็นตอนพิเศษไหม)
EPISODES = [
    ("00",  "0",   "เครื่องของตัวเอง",        "ep0-my-own-machine",         False),
    ("01",  "1",   "เดือนที่ 5",              "ep1-month-five",             False),
    ("02",  "2",   "เสียงฝีเท้า",             "ep2-footsteps",              False),
    ("03",  "3",   "กลิ่นแผ่นสด",             "ep3-fresh-disc",             False),
    ("04",  "4",   "จัดเด็ค",                 "ep4-deckbuilding",           False),
    ("05",  "5",   "โรงงานปั๊มฝัน",           "ep5-dream-factory",          False),
    ("06",  "6",   "10 → 1000",               "ep6-ten-to-thousand",        False),
    ("07",  "7",   "ช่างที่ขาดทุน",           "ep7-the-smith-who-lost",     False),
    ("08",  "8",   "คนที่ขึ้นมาจากหาดใหญ่",   "ep8-the-one-from-hatyai",    False),
    ("09",  "9",   "เปิดจอ",                  "ep9-open-the-screen",        False),
    ("09s", "9.5", "กิลด์ที่ผมวาดไว้ในหัว",   "ep9-5-the-guild-i-imagined", True),
    ("10",  "10",  "ก้าวที่ 10",              "ep10-the-tenth-step",        False),
]

os.makedirs(IMG, exist_ok=True)
SKIP_IMG = os.environ.get('SKIP_IMG') == '1'

# ─────────────────────────────────────────────────────────────
# ภาพ
# ─────────────────────────────────────────────────────────────
meta = {}
total = 0
for key, num, title, slug, special in EPISODES:
    if SKIP_IMG:
        # สร้างเฉพาะหน้าเว็บ — อ่านขนาดจากภาพที่แปลงไว้แล้ว ไม่ต้องมีไฟล์ต้นฉบับ
        w, h = Image.open(f'{IMG}/{key}.jpg').size
        tw, th = Image.open(f'{IMG}/{key}-thumb.jpg').size
        meta[key] = {'w': w, 'h': h, 'tw': tw, 'th': th}
        continue

    im = Image.open(os.path.join(SRC, f'{key}.png')).convert('RGB')
    w, h = im.size
    meta[key] = {'w': w, 'h': h}

    # เต็มตอน — webp 1024 (หลัก) / 640 (จอเล็ก) / jpg สำรอง
    im.save(f'{IMG}/{key}-1024.webp', 'WEBP', quality=85, method=6)
    im.resize((640, round(h * 640 / w)), Image.LANCZOS)\
      .save(f'{IMG}/{key}-640.webp', 'WEBP', quality=85, method=6)
    im.save(f'{IMG}/{key}.jpg', 'JPEG', quality=85, optimize=True, progressive=True)

    # ภาพปก = ช่องแรกของตอน
    panel = im.crop((0, 0, w, h // 4))
    pw, ph = panel.size
    thumb = panel.resize((560, round(ph * 560 / pw)), Image.LANCZOS)
    thumb.save(f'{IMG}/{key}-thumb.webp', 'WEBP', quality=82, method=6)
    thumb.save(f'{IMG}/{key}-thumb.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    meta[key]['tw'], meta[key]['th'] = thumb.size

    # ภาพสำหรับแชร์ 1200x630 — ครอปกลางช่องแรกให้เต็มกรอบ
    og = Image.new('RGB', (1200, 630))
    scale = max(1200 / pw, 630 / ph)
    r = panel.resize((round(pw * scale), round(ph * scale)), Image.LANCZOS)
    og.paste(r, ((1200 - r.width) // 2, (630 - r.height) // 2))
    og.save(f'{IMG}/{key}-og.jpg', 'JPEG', quality=86, optimize=True, progressive=True)

# แบนเนอร์หน้าแรก — ช่อง 4 ของตอนพิเศษ (ฝูงชนเดินตอนพระอาทิตย์ตก) เลี่ยงกรอบข้อความ
if not SKIP_IMG:
    s = Image.open(os.path.join(SRC, '09s.png')).convert('RGB')
    sw, sh = s.size
    p4 = s.crop((0, sh * 3 // 4, sw, sh))
    band = p4.crop((0, 62, sw, min(p4.height, 62 + 380)))
    band.save(f'{IMG}/banner.webp', 'WEBP', quality=84, method=6)
    band.save(f'{IMG}/banner.jpg', 'JPEG', quality=84, optimize=True, progressive=True)

for f in os.listdir(IMG):
    total += os.path.getsize(os.path.join(IMG, f))
print(f'ภาพทั้งหมด {len(os.listdir(IMG))} ไฟล์  รวม {total/1048576:.1f} MB')

# ─────────────────────────────────────────────────────────────
# หน้าเว็บ
# ─────────────────────────────────────────────────────────────
SERIES = 'เรื่องเล่าจากโรงตีเหล็ก'
E = html.escape

CSS = '''
:root{--ink:18 40 28;--paper:248 246 240;--green:27 106 66;--deep:10 40 24;--gold:190 148 66;--muted:96 108 100}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Anuphan",sans-serif;background:rgb(var(--paper));color:rgb(var(--ink));line-height:1.75;-webkit-font-smoothing:antialiased}
.disp{font-family:"Bai Jamjuree",sans-serif;letter-spacing:-.015em}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
:focus-visible{outline:3px solid rgb(var(--gold));outline-offset:3px;border-radius:8px}
.bar{position:sticky;top:0;z-index:60;background:rgb(var(--deep));color:#fff;border-bottom:1px solid rgb(190 148 66/.28)}
.bar .wrap{display:flex;align-items:center;gap:12px;min-height:56px;padding-top:8px;padding-bottom:8px}
.bar .home{font-family:"Bai Jamjuree";font-weight:700;font-size:15px;white-space:nowrap;
  min-height:44px;display:inline-flex;align-items:center;padding:0 4px}
.bar .home em{font-style:normal;color:rgb(var(--gold))}
.bar .ttl{margin-left:auto;text-align:right;font-size:13px;color:rgb(255 255 255/.72);min-width:0}
.bar .ttl b{display:block;font-family:"Bai Jamjuree";font-size:14.5px;color:#fff;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
footer{text-align:center;color:rgb(var(--muted));font-size:12.5px;padding:34px 0 48px}
footer a{color:rgb(var(--green));font-weight:600}
.sp{display:inline-block;background:rgb(var(--gold));color:rgb(var(--deep));font-family:"Bai Jamjuree";font-weight:700;
  font-size:10.5px;border-radius:6px;padding:2px 8px;letter-spacing:.04em;vertical-align:middle}
'''

def page(title, desc, ogimg, body, extra_css='', extra_js='', canonical=''):
    return f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{ogimg}">
<meta name="twitter:card" content="summary_large_image">
{canonical}<meta name="theme-color" content="#0A2818">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&family=Bai+Jamjuree:wght@500;600;700&display=swap" rel="stylesheet">
<style>{CSS}{extra_css}</style>
</head>
<body>
{body}
{extra_js}<!-- Cloudflare Web Analytics — ไม่ใช้คุกกี้ ไม่ตามรอยรายบุคคล --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "cd6b654477f3437ca6619742cf119aa6"}}'></script>
</body>
</html>
'''

# ── หน้ารวมทุกตอน ──
INDEX_CSS = '''
.head{background:rgb(var(--deep));color:#fff;padding:clamp(34px,6vw,58px) 0 clamp(30px,5vw,48px);
  background-image:radial-gradient(700px 360px at 12% -18%,rgb(27 106 66/.55),transparent 62%),
                   radial-gradient(520px 320px at 92% 110%,rgb(190 148 66/.2),transparent 60%)}
.head .eyebrow{font-family:"Bai Jamjuree";font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--gold))}
.head h1{font-family:"Bai Jamjuree";font-size:clamp(29px,5.6vw,46px);line-height:1.16;margin:12px 0 14px}
.head p{color:rgb(255 255 255/.8);font-size:16.5px;max-width:52ch}
.start{display:inline-flex;align-items:center;gap:9px;background:rgb(var(--gold));color:rgb(var(--deep));
  border-radius:13px;padding:15px 26px;font-family:"Bai Jamjuree";font-weight:700;font-size:16px;margin-top:26px;
  min-height:44px;transition:transform .18s,filter .18s}
.start:hover{transform:translateY(-2px);filter:brightness(1.07)}
.startrow{display:flex;gap:11px;flex-wrap:wrap;align-items:center}
.start.ghost{background:transparent;color:#fff;border:1.5px solid rgb(255 255 255/.4)}
.start.ghost:hover{border-color:rgb(var(--gold));background:rgb(190 148 66/.12)}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;padding:clamp(28px,5vw,46px) 0 10px}
@media(min-width:700px){.grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:980px){.grid{grid-template-columns:repeat(4,1fr)}}
.ep{background:#fff;border:1px solid rgb(var(--ink)/.09);border-radius:16px;overflow:hidden;
  display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s,border-color .2s}
.ep:hover{transform:translateY(-4px);box-shadow:0 22px 42px -26px rgb(18 40 28/.5);border-color:rgb(27 106 66/.38)}
.ep .im{aspect-ratio:1024/540;background:rgb(var(--deep));overflow:hidden}
.ep .im img{width:100%;height:100%;object-fit:cover}
.ep .bd{padding:13px 15px 15px;display:flex;flex-direction:column;gap:3px;flex:1}
.ep .no{font-family:"Bai Jamjuree";font-weight:700;font-size:11.5px;letter-spacing:.08em;color:rgb(var(--gold))}
.ep b{font-family:"Bai Jamjuree";font-size:15.5px;line-height:1.35}
'''

cards = []
for i, (key, num, title, slug, special) in enumerate(EPISODES):
    m = meta[key]
    badge = ' <span class="sp">ตอนพิเศษ</span>' if special else ''
    cards.append(f'''    <a class="ep" href="{slug}/">
      <div class="im">
        <picture>
          <source type="image/webp" srcset="img/{key}-thumb.webp">
          <img src="img/{key}-thumb.jpg" width="{m['tw']}" height="{m['th']}" loading="lazy" decoding="async"
               alt="{SERIES} ตอนที่ {num} — {E(title)}">
        </picture>
      </div>
      <div class="bd">
        <span class="no">ตอนที่ {num}{badge}</span>
        <b class="disp">{E(title)}</b>
      </div>
    </a>''')

index_body = f'''<header class="bar"><div class="wrap">
  <a class="home disp" href="../">🍀 my<em>clover</em></a>
  <span class="ttl"><b>{SERIES}</b></span>
</div></header>

<section class="head"><div class="wrap">
  <span class="eyebrow">อ่านฟรี · ไม่ต้องสมัคร</span>
  <h1 class="disp">{SERIES}</h1>
  <p>19 ปีของคนที่เอาวิธีคิดแบบคนเล่นเกมมาทำธุรกิจ — อ่านเกมให้ออก หา META ให้เจอ แล้วพาทั้งทีมไปต่อ<br>11 ตอน กับอีก 1 ตอนพิเศษ</p>
  <a class="start disp" href="{EPISODES[0][3]}/">▶ เริ่มอ่านจากตอนแรก</a>
</div></section>

<main class="wrap"><div class="grid">
{chr(10).join(cards)}
</div></main>

<footer>
  <p>🍀 myclover.com — อ่านฟรี ไม่มีเงื่อนไข</p>
  <p style="margin-top:6px"><a href="../">กลับหน้าบ้าน</a> · <a href="../privacy/">ข้อมูลของคุณ</a></p>
</footer>'''

open(f'{DEST}/index.html', 'w', encoding='utf-8').write(page(
    f'{SERIES} — อ่านฟรีบน myclover',
    '19 ปีของคนที่เอาวิธีคิดแบบคนเล่นเกมมาทำธุรกิจ — ปรับตัว หา META แล้วพาทั้งทีมไปต่อ อ่านฟรีทุกตอน ไม่ต้องสมัคร',
    f'{SITE}/forge/img/09s-og.jpg', index_body, INDEX_CSS,
    canonical=f'<link rel="canonical" href="{SITE}/forge/">\n'))

# ── หน้าอ่านแต่ละตอน ──
READ_CSS = '''
.strip{background:rgb(var(--deep));font-size:0;line-height:0}
.strip picture{display:block}
.strip img{width:100%;height:auto;margin:0 auto;display:block}
.tapnext{display:block;cursor:pointer;-webkit-tap-highlight-color:rgb(190 148 66/.18)}
.nav{padding:22px 0 8px}
.row{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}
.nb{flex:1 1 auto;min-width:132px;min-height:52px;display:flex;align-items:center;justify-content:center;gap:8px;
  background:#fff;border:1px solid rgb(var(--ink)/.14);border-radius:13px;padding:12px 18px;
  font-family:"Bai Jamjuree";font-weight:700;font-size:15px;transition:transform .18s,box-shadow .18s,border-color .18s}
.nb:hover{transform:translateY(-2px);box-shadow:0 16px 30px -20px rgb(18 40 28/.5);border-color:rgb(27 106 66/.4)}
.nb.main{background:rgb(var(--green));border-color:rgb(var(--green));color:#fff}
.nb.gold{background:rgb(var(--gold));border-color:rgb(var(--gold));color:rgb(var(--deep))}
.allbtn{font-family:"Bai Jamjuree";font-weight:700;font-size:12.5px;color:rgb(var(--gold));
  border:1px solid rgb(190 148 66/.5);border-radius:999px;padding:0 13px;white-space:nowrap;
  min-height:44px;display:inline-flex;align-items:center;transition:.16s}
.allbtn:hover{background:rgb(190 148 66/.14)}
@media(max-width:600px){.bar .ttl{display:none}}
.epttl{padding:26px 0 4px}
.epttl .no{font-family:"Bai Jamjuree";font-weight:700;font-size:12.5px;letter-spacing:.1em;color:rgb(var(--gold))}
.epttl h1{font-family:"Bai Jamjuree";font-size:clamp(23px,4.2vw,34px);line-height:1.24;margin-top:6px}
.kb{text-align:center;font-size:12.5px;color:rgb(var(--muted));margin-top:14px}
.endnote{background:rgb(27 106 66/.06);border:1px solid rgb(27 106 66/.2);border-radius:16px;
  padding:20px 24px;margin-top:20px;text-align:center;font-size:15px}
.endnote b{font-family:"Bai Jamjuree";display:block;margin-bottom:5px;font-size:16.5px}
'''

for i, (key, num, title, slug, special) in enumerate(EPISODES):
    m = meta[key]
    prev_ep = EPISODES[i - 1] if i > 0 else None
    next_ep = EPISODES[i + 1] if i < len(EPISODES) - 1 else None
    d = os.path.join(DEST, slug)
    os.makedirs(d, exist_ok=True)

    row = []
    if prev_ep:
        row.append(f'<a class="nb disp" href="../{prev_ep[3]}/" rel="prev" data-prev>← ตอนก่อนหน้า</a>')
    row.append('<a class="nb disp" href="../">ดูทุกตอน</a>')
    if next_ep:
        row.append(f'<a class="nb main disp" href="../{next_ep[3]}/" rel="next" data-next>ตอนต่อไป →</a>')
    nav = '\n      '.join(row)

    end = ''
    if not next_ep:
        end = '''<div class="endnote">
        <b class="disp">🍀 จบแล้วครับ ขอบคุณที่อ่านจนจบ</b>
        อ่านซ้ำตอนไหนก็ได้ หรือแวะดูห้องอื่น ๆ ในบ้านต่อได้เลย
        <div class="row" style="margin-top:16px">
          <a class="nb gold disp" href="../">กลับไปหน้ารวมทุกตอน</a>
          <a class="nb disp" href="../../">แวะดูบ้าน myclover</a>
        </div>
      </div>'''

    badge = ' <span class="sp">ตอนพิเศษ</span>' if special else ''
    alt = f'{SERIES} ตอนที่ {num} — {E(title)}'
    # แตะที่ภาพ = ไปตอนถัดไป (มาตรฐานเว็บตูน) — ใช้ลิงก์จริง เบราว์เซอร์จะไม่สับสนกับการปัดเลื่อน
    if next_ep:
        tap_o = (f'<a class="tapnext" href="../{next_ep[3]}/" '
                 f'aria-label="อ่านตอนต่อไป — ตอนที่ {next_ep[1]} {E(next_ep[2])}">')
        tap_c = '</a>'
    else:
        tap_o = tap_c = ''
    tap_hint = ('แตะที่ภาพเพื่อไปตอนต่อไป · หรือกดลูกศร ← → บนคีย์บอร์ด'
                if next_ep else 'จบซีรีส์แล้ว — กดลูกศร ← เพื่อย้อนกลับตอนก่อนหน้า')
    body = f'''<header class="bar"><div class="wrap">
  <a class="home disp" href="../">← ทุกตอน</a>
  <span class="ttl">ตอนที่ {num}<b>{E(title)}</b></span>
</div></header>

<div class="wrap epttl">
  <span class="no">ตอนที่ {num}{badge}</span>
  <h1 class="disp">{E(title)}</h1>
</div>

<main class="strip">
  {tap_o}<picture>
    <source type="image/webp" media="(max-width:640px)" srcset="../img/{key}-640.webp">
    <source type="image/webp" srcset="../img/{key}-1024.webp">
    <img src="../img/{key}.jpg" width="{m['w']}" height="{m['h']}"
         loading="eager" fetchpriority="high" decoding="async" alt="{alt}">
  </picture>{tap_c}
</main>

<nav class="wrap nav">
  <div class="row">
      {nav}
  </div>
  {end}
  <p class="kb">{tap_hint}</p>
</nav>

<footer>
  <p>🍀 {SERIES} · myclover.com</p>
  <p style="margin-top:6px"><a href="../">ทุกตอน</a> · <a href="../../">กลับหน้าบ้าน</a> · <a href="../../privacy/">ข้อมูลของคุณ</a></p>
</footer>'''

    js = '''<script>
document.addEventListener('keydown',function(e){
  if(e.altKey||e.ctrlKey||e.metaKey) return;
  var t=e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA') return;
  var go=null;
  if(e.key==='ArrowLeft')  go=document.querySelector('[data-prev]');
  if(e.key==='ArrowRight') go=document.querySelector('[data-next]');
  if(go){ e.preventDefault(); location.href=go.getAttribute('href'); }
});
</script>
'''
    open(f'{d}/index.html', 'w', encoding='utf-8').write(page(
        f'ตอนที่ {num}: {title} — {SERIES} | myclover',
        f'{SERIES} ตอนที่ {num} — {title} · อ่านฟรี ไม่ต้องสมัคร',
        f'{SITE}/forge/img/{key}-og.jpg', body, READ_CSS, js,
        canonical=f'<link rel="canonical" href="{SITE}/forge/{slug}/">\n'))

print(f'สร้างหน้าเว็บ {len(EPISODES)+1} หน้า')
