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

# ตารางตอน — (คีย์, เลขตอนที่แสดง, ชื่อตอน, slug, ตอนพิเศษไหม, ไฟล์ต้นฉบับ)
#
# ไฟล์ต้นฉบับเป็น "ลิสต์ของช่อง" เรียงจากบนลงล่าง
#   ตอนที่รีมาสเตอร์แล้ว = 4 ช่องแนวตั้ง แตะช่องท้ายไปตอนต่อไป
#   ตอนเก่าที่ยังไม่ได้รีมาสเตอร์ = ภาพยาวใบเดียว
# ตอนไหนยังไม่มีไฟล์ต้นฉบับในเครื่อง จะข้ามการแปลงภาพและใช้ของที่แปลงไว้แล้ว
EPISODES = [
    ("00",  "0",   "เครื่องของตัวเอง",        "ep0-my-own-machine",         False,
     ["001.jpeg", "002.jpeg", "003.jpeg", "004.jpeg"]),
    ("01",  "1",   "เดือนที่ 5",              "ep1-month-five",             False,
     ["011.jpg", "012.jpeg", "013.jpeg", "014.jpeg"]),
    ("02",  "2",   "เสียงฝีเท้า",             "ep2-footsteps",              False, ["02.png"]),
    ("03",  "3",   "กลิ่นแผ่นสด",             "ep3-fresh-disc",             False, ["03.png"]),
    ("04",  "4",   "จัดเด็ค",                 "ep4-deckbuilding",           False, ["04.png"]),
    ("05",  "5",   "โรงงานปั๊มฝัน",           "ep5-dream-factory",          False, ["05.png"]),
    ("06",  "6",   "10 → 1000",               "ep6-ten-to-thousand",        False, ["06.png"]),
    ("07",  "7",   "ช่างที่ขาดทุน",           "ep7-the-smith-who-lost",     False, ["07.png"]),
    ("08",  "8",   "คนที่ขึ้นมาจากหาดใหญ่",   "ep8-the-one-from-hatyai",    False, ["08.png"]),
    ("09",  "9",   "เปิดจอ",                  "ep9-open-the-screen",        False, ["09.png"]),
    ("09s", "9.5", "กิลด์ที่ผมวาดไว้ในหัว",   "ep9-5-the-guild-i-imagined", True,  ["09s.png"]),
    ("10",  "10",  "ก้าวที่ 10",              "ep10-the-tenth-step",        False, ["10.png"]),
]

os.makedirs(IMG, exist_ok=True)
SKIP_IMG = os.environ.get('SKIP_IMG') == '1'


def panel_keys(key, srcs):
    """ชื่อไฟล์ของแต่ละช่อง — ตอนช่องเดียวใช้ชื่อเดิม จะได้ไม่ต้องแปลงภาพเก่าใหม่หมด"""
    if len(srcs) == 1:
        return [key]
    return [f'{key}-p{i+1}' for i in range(len(srcs))]


# ─────────────────────────────────────────────────────────────
# ภาพ
# ─────────────────────────────────────────────────────────────
meta = {}
total = 0
built = 0
for key, num, title, slug, special, srcs in EPISODES:
    pk = panel_keys(key, srcs)
    have = all(os.path.exists(os.path.join(SRC, f)) for f in srcs)

    if SKIP_IMG or not have:
        # ไม่มีต้นฉบับ (หรือสั่งข้าม) — อ่านขนาดจากภาพที่แปลงไว้แล้ว
        meta[key] = {
            'panels': [dict(zip(('w', 'h'), Image.open(f'{IMG}/{k}.jpg').size)) | {'k': k} for k in pk],
        }
        tw, th = Image.open(f'{IMG}/{key}-thumb.jpg').size
        meta[key]['tw'], meta[key]['th'] = tw, th
        continue

    built += 1
    panels = []
    first = None
    for k, srcname in zip(pk, srcs):
        im = Image.open(os.path.join(SRC, srcname)).convert('RGB')
        w, h = im.size
        if first is None:
            first = im
        panels.append({'k': k, 'w': w, 'h': h})

        # webp 1024 (หลัก) / 640 (จอเล็ก) / jpg สำรอง
        im.save(f'{IMG}/{k}-1024.webp', 'WEBP', quality=85, method=6)
        im.resize((640, round(h * 640 / w)), Image.LANCZOS)\
          .save(f'{IMG}/{k}-640.webp', 'WEBP', quality=85, method=6)
        im.save(f'{IMG}/{k}.jpg', 'JPEG', quality=85, optimize=True, progressive=True)
    meta[key] = {'panels': panels}

    # ภาพปก = ช่องแรกของตอน · ตอนภาพยาวใบเดียวให้ครอปเอาหนึ่งในสี่บน
    fw, fh = first.size
    cover = first if len(srcs) > 1 else first.crop((0, 0, fw, fh // 4))
    pw, ph = cover.size
    thumb = cover.resize((560, round(ph * 560 / pw)), Image.LANCZOS)
    thumb.save(f'{IMG}/{key}-thumb.webp', 'WEBP', quality=82, method=6)
    thumb.save(f'{IMG}/{key}-thumb.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    meta[key]['tw'], meta[key]['th'] = thumb.size

    # ภาพสำหรับแชร์ 1200x630 — ครอปกลางช่องแรกให้เต็มกรอบ
    og = Image.new('RGB', (1200, 630))
    scale = max(1200 / pw, 630 / ph)
    r = cover.resize((round(pw * scale), round(ph * scale)), Image.LANCZOS)
    og.paste(r, ((1200 - r.width) // 2, (630 - r.height) // 2))
    og.save(f'{IMG}/{key}-og.jpg', 'JPEG', quality=86, optimize=True, progressive=True)

# แบนเนอร์หน้าแรก — ช่อง 4 ของตอนพิเศษ (ฝูงชนเดินตอนพระอาทิตย์ตก) เลี่ยงกรอบข้อความ
if not SKIP_IMG and os.path.exists(os.path.join(SRC, '09s.png')):
    s = Image.open(os.path.join(SRC, '09s.png')).convert('RGB')
    sw, sh = s.size
    p4 = s.crop((0, sh * 3 // 4, sw, sh))
    band = p4.crop((0, 62, sw, min(p4.height, 62 + 380)))
    band.save(f'{IMG}/banner.webp', 'WEBP', quality=84, method=6)
    band.save(f'{IMG}/banner.jpg', 'JPEG', quality=84, optimize=True, progressive=True)

for f in os.listdir(IMG):
    total += os.path.getsize(os.path.join(IMG, f))
print(f'ภาพทั้งหมด {len(os.listdir(IMG))} ไฟล์  รวม {total/1048576:.1f} MB  (แปลงใหม่ {built} ตอน)')

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
[hidden]{display:none!important}
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

# ─────────────────────────────────────────────────────────────
# เควสต์ของบ้าน — assets/quest.js
#
# ตารางตอนการ์ตูนอยู่ในไฟล์นี้อยู่แล้ว เลยให้ไฟล์นี้เป็นเจ้าของ
# "ความคืบหน้า + ตราประจำตัว" ของทั้งเว็บไปเลย จะได้มีที่เดียว
#
# เพิ่มตราใหม่ต้องแก้ 2 ที่: TRACKS ข้างล่างนี้ (ไว้ปลดอัตโนมัติ)
# และ TITLES ใน card/index.html (ไว้แสดงผลบนการ์ด)
# ─────────────────────────────────────────────────────────────

# (slug, ชื่อบท) เรียงตามลำดับเรียน — ไฟล์จริงคือ classroom/<slug>.html
LESSONS = [
    ("free-ai",     "LV.1 เริ่มใช้ AI"),
    ("image-ai",    "LV.2 สร้างภาพ"),
    ("clip-ai",     "LV.3 สร้างวิดีโอ"),
    ("notebooklm",  "LV.4 สร้าง Source — บทติดดาว"),
    ("prompts",     "LV.5 สร้าง AI คู่หู"),
    ("first-web",   "LV.6 สร้างเว็บแรก"),
]

# รหัสที่ได้ตอนทำครบ = ชื่อของสิ่งสุดท้ายในเส้นนั้น จะได้รู้สึกว่าได้มาจริง ๆ
FORGE_CODE  = 'TENTHSTEP'   # = ตอนสุดท้ายของการ์ตูน
LEARN_CODE  = 'FIRSTWEB'    # = บทสุดท้ายของห้องเรียน

TRACKS = {
    'forge': {'key': 'mc_read',  'done': 'mc_forge_done', 'title': 'FORGE',
              'unit': 'ตอน', 'what': 'อ่าน',
              'items': [slug for _, _, _, slug, _, _ in EPISODES]},
    'learn': {'key': 'mc_learn', 'done': 'mc_learn_done', 'title': 'SCHOLAR',
              'unit': 'บท', 'what': 'เรียน',
              'items': [slug for slug, _ in LESSONS]},
}

tracks_js = ',\n    '.join(
    "%s:{key:'%s',done:'%s',title:'%s',unit:'%s',what:'%s',items:[%s]}" % (
        name, t['key'], t['done'], t['title'], t['unit'], t['what'],
        ','.join("'%s'" % i for i in t['items']))
    for name, t in TRACKS.items())

QUEST_JS = '''/* ═══════════════════════════════════════════════════════════════
   myclover — ความคืบหน้า + ตราประจำตัวของทั้งเว็บ

   ⚠️ สร้างอัตโนมัติจาก tools/build.py — อย่าแก้ไฟล์นี้ตรง ๆ

   เก็บอยู่ในเครื่องของผู้ใช้ล้วน (localStorage) ไม่ส่งออกไปไหน
   ล้างข้อมูลเบราว์เซอร์เมื่อไหร่ ความคืบหน้าก็หายไปด้วย

   ── เส้นความคืบหน้า ──
   forge = อ่านการ์ตูน  ·  learn = เรียนห้องเรียน
   ทำครบเส้นไหน ปลดตราของเส้นนั้นให้เอง

   ── บอกหน้าเว็บว่าหน้านี้คือของอะไร ──
   <meta name="mc-item" content="forge:ep0-my-own-machine">
   แล้วเมื่อผู้ใช้เลื่อนมาถึง [data-mc-end] (ถ้าไม่มีก็ footer)
   จะนับว่าทำชิ้นนั้นเสร็จ — เลื่อนถึงท้ายจริง ๆ ไม่ใช่แค่เปิดหน้า

   ── จุดเกาะใน HTML (ทาสีให้เองอัตโนมัติ) ──
   ค่าที่ขึ้นต้นด้วยชื่อเส้น เช่น "forge" หรือ "learn"
     [data-mc-progress=forge]      "อ่านแล้ว 3/12 ตอน" · ซ่อนถ้ายังไม่เริ่ม
     [data-mc-bar=forge]           แถบความคืบหน้า — ปรับ width เป็น %
     [data-mc-continue=forge:../]  ลิงก์ "ทำต่อ" — หลัง : คือ path นำหน้า
     [data-mc-demote=forge:ghost]  ใส่คลาส ghost เมื่อเริ่มแล้ว (ลดความเด่น)
     [data-mc-done=forge]          บล็อกที่โผล่เมื่อครบ
     [data-mc-undone=forge]        บล็อกที่ซ่อนเมื่อครบ (ตั้งต้นต้องมองเห็น)
     [data-mc-any=forge]           บล็อกที่โผล่เมื่อเริ่มแล้วอย่างน้อย 1 ชิ้น
     [data-mc-item=forge:slug]     ใส่คลาส .done ให้เมื่อทำชิ้นนั้นแล้ว
     [data-mc-title=FORGE]         บล็อกที่โผล่เมื่อได้ตรานั้นแล้ว
     [data-mc-notitle=FORGE]       บล็อกที่ซ่อนเมื่อได้ตรานั้นแล้ว
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var TRACKS={
    %TRACKS%
  };
  var TKEY='mc_titles';

  function ls(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
  function save(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function each(sel,fn){
    var l=document.querySelectorAll(sel);
    for(var i=0;i<l.length;i++) fn(l[i]);
  }
  function addCls(el,c,on){
    var re=new RegExp('(^|\\\\s)'+c+'(?=\\\\s|$)','g');
    el.className=(el.className.replace(re,' ').replace(/\\s+/g,' ').replace(/^ | $/g,''))+(on?' '+c:'');
  }
  function split(v,def){
    var i=(v||'').indexOf(':');
    return i<0 ? [v||def, ''] : [v.slice(0,i), v.slice(i+1)];
  }

  /* ── ตราประจำตัว ── */
  function titles(){
    try{ var a=JSON.parse(ls(TKEY,'[]')); return Array.isArray(a)?a:[]; }
    catch(e){ return []; }
  }
  function hasTitle(k){ return titles().indexOf(k)>=0; }
  function grant(k){
    var a=titles();
    if(a.indexOf(k)>=0) return false;
    a.push(k); save(TKEY,JSON.stringify(a));
    return true;
  }

  /* ── เส้นความคืบหน้า ── */
  function T(name){
    var t=TRACKS[name];
    if(!t) return null;
    function get(){
      return ls(t.key,'').split(',').filter(function(s){ return t.items.indexOf(s)>=0; });
    }
    return {
      cfg      : t,
      items    : t.items,
      total    : t.items.length,
      list     : get,
      count    : function(){ return get().length; },
      has      : function(s){ return get().indexOf(s)>=0; },
      complete : function(){ return get().length>=t.items.length; },
      next     : function(){
        var a=get();
        for(var i=0;i<t.items.length;i++) if(a.indexOf(t.items[i])<0) return t.items[i];
        return null;
      },
      mark     : function(s){
        if(t.items.indexOf(s)<0) return false;
        var a=get();
        if(a.indexOf(s)>=0) return false;
        a.push(s); save(t.key,a.join(','));
        if(a.length>=t.items.length){ save(t.done,'1'); grant(t.title); }
        paint();
        return true;
      },
      reset    : function(){
        try{ localStorage.removeItem(t.key); localStorage.removeItem(t.done); }catch(e){}
        paint();
      }
    };
  }

  /* ตราเคยได้แล้วแต่ localStorage ของตราหาย — ซ่อมให้เงียบ ๆ */
  function heal(){
    for(var n in TRACKS) if(ls(TRACKS[n].done,'')==='1') grant(TRACKS[n].title);
  }

  var API={ TRACKS:TRACKS, track:T, titles:titles, hasTitle:hasTitle, grant:function(k){
    var isNew=grant(k); if(isNew) paint(); return isNew; }, paint:function(){ paint(); } };
  window.MC_QUEST=API;

  /* ── ทาสีทุกจุดเกาะ ── */
  function paint(){
    each('[data-mc-progress]',function(el){
      var t=T(el.getAttribute('data-mc-progress')); if(!t) return;
      var n=t.count(), z=t.total, d=n>=z;
      el.textContent = d ? (t.cfg.what+'ครบทั้ง '+z+' '+t.cfg.unit+'แล้ว')
                         : (t.cfg.what+'แล้ว '+n+'/'+z+' '+t.cfg.unit);
      el.hidden = n===0;
      addCls(el,'is-done',d);
    });
    each('[data-mc-bar]',function(el){
      var t=T(el.getAttribute('data-mc-bar')); if(!t) return;
      el.style.width=Math.round(t.count()/t.total*100)+'%';
    });
    each('[data-mc-continue]',function(el){
      var p=split(el.getAttribute('data-mc-continue')), t=T(p[0]); if(!t) return;
      var nx=t.next();
      if(!nx || t.count()===0){ el.hidden=true; return; }
      el.hidden=false;
      el.setAttribute('href', p[1]+nx+(p[1].indexOf('.html')<0 && p[1].slice(-1)!=='#' ? '/' : ''));
    });
    each('[data-mc-demote]',function(el){
      var p=split(el.getAttribute('data-mc-demote')), t=T(p[0]); if(!t) return;
      addCls(el,p[1]||'ghost',t.count()>0);
    });
    each('[data-mc-done]',function(el){
      var t=T(el.getAttribute('data-mc-done')); if(!t) return;
      el.hidden=!t.complete();
    });
    each('[data-mc-undone]',function(el){
      var t=T(el.getAttribute('data-mc-undone')); if(!t) return;
      el.hidden=t.complete();
    });
    each('[data-mc-any]',function(el){
      var t=T(el.getAttribute('data-mc-any')); if(!t) return;
      el.hidden=t.count()===0;
    });
    each('[data-mc-item]',function(el){
      var p=split(el.getAttribute('data-mc-item')), t=T(p[0]); if(!t) return;
      addCls(el,'done',t.has(p[1]));
    });
    each('[data-mc-title]',  function(el){ el.hidden=!hasTitle(el.getAttribute('data-mc-title')); });
    each('[data-mc-notitle]',function(el){ el.hidden= hasTitle(el.getAttribute('data-mc-notitle')); });
  }

  /* ── หน้านี้คือชิ้นไหน แล้วอ่านถึงท้ายรึยัง ── */
  function watch(){
    var m=document.querySelector('meta[name="mc-item"]');
    if(!m) return;
    var p=split(m.getAttribute('content')), t=T(p[0]);
    if(!t || !p[1]) return;
    var end=document.querySelector('[data-mc-end]')||document.querySelector('footer');
    var fired=false;
    function fire(){ if(fired) return; fired=true; t.mark(p[1]); }
    if(end && window.IntersectionObserver){
      new IntersectionObserver(function(es,o){
        if(es[0].isIntersecting){ o.disconnect(); fire(); }
      },{rootMargin:'0px 0px -12% 0px'}).observe(end);
    } else {
      fire();   /* เบราว์เซอร์เก่า — นับให้เลยดีกว่าไม่นับ */
    }
    /* แตะภาพไปตอนต่อไป = อ่านตอนนี้จบแล้วเหมือนกัน */
    var tn=document.querySelector('.tapnext');
    if(tn) tn.addEventListener('click',fire);
  }

  function boot(){ heal(); paint(); watch(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
'''.replace('%TRACKS%', tracks_js)

os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
open(os.path.join(ROOT, 'assets', 'quest.js'), 'w', encoding='utf-8').write(QUEST_JS)

# ไฟล์เดิมถูกแทนที่ด้วย quest.js แล้ว
_old = os.path.join(ROOT, 'assets', 'progress.js')
if os.path.exists(_old):
    os.remove(_old)

# บล็อก "อ่านจบแล้ว" — ใช้ทั้งหน้ารวมและหน้าตอน (ต่างกันแค่ path)
def finish_block(up):
    return f'''<div class="finish" data-mc-done="forge" hidden>
    <span class="fl">⚒️ อ่านครบทุกตอนแล้ว</span>
    <b class="disp">คุณเดินผ่านโรงตีเหล็กมาทั้งสายแล้ว</b>
    <p>ตั้งแต่เครื่องเครื่องแรก จนถึงก้าวที่ 10 — ครบทั้ง 12 ตอน<br>
       ขอบคุณที่อ่านจนจบจริง ๆ ครับ</p>
    <div class="codebox">
      <span class="lb">รหัสของคุณ</span>
      <code id="fcode">{FORGE_CODE}</code>
      <button type="button" class="cp" id="fcopy">คัดลอก</button>
    </div>
    <p class="sm">เอาไปใส่ในหน้าทำการ์ด จะได้ตรา <b>⚒️ ผ่านโรงตีเหล็ก</b> กับกรอบไฟบนการ์ดของคุณ</p>
    <a class="fbtn disp" href="{up}card/">⚡ ไปทำการ์ดของคุณ</a>

    <div class="nextup">
      <span class="hr"><i></i>แล้วไงต่อ<i></i></span>
      <p>เรื่องที่คุณเพิ่งอ่านจบ ไม่ได้จบที่ตัวผมคนเดียว<br>
         วิธีคิดแบบคนเล่นเกม — ปรับตัว หา META แล้วพาทั้งทีมไปต่อ — ใช้กับธุรกิจอะไรก็ได้
         และมันสนุกกว่ามากเวลาเล่นกันหลายคน</p>
      <p>กิลด์ของเราเลยมีไว้แบบนั้น ไม่ได้มีไว้ขายอะไรกับคุณ
         แต่มีไว้ให้คนที่อยากโตทั้งเรื่องงานและเรื่องชีวิต มาโตไปด้วยกัน<br>
         <b>ใครเจอเรา คนนั้นโชคดี — #glhf</b></p>
      <a class="fbtn ghost disp" href="{up}walkthrough/">🗺️ เปิด Walkthrough — คู่มือแปลภาษาเกมเป็นภาษาธุรกิจ</a>
      <p class="sm">หน้านี้เปิดให้เฉพาะคนที่อ่านจบ — ถอดกลไกของเรื่องที่คุณเพิ่งอ่าน
         และเล่าว่าบ้านหลังนี้สร้างขึ้นมายังไง</p>
    </div>
  </div>'''

FINISH_CSS = '''
.finish{background:linear-gradient(160deg,rgb(10 40 24),rgb(18 62 38));color:#fff;border-radius:20px;
  padding:clamp(24px,4.4vw,34px);margin-top:22px;text-align:center;
  border:1px solid rgb(190 148 66/.4);box-shadow:0 26px 54px -34px rgb(10 40 24/.85)}
.finish .fl{display:inline-block;font-family:"Bai Jamjuree";font-weight:700;font-size:11.5px;
  letter-spacing:.14em;color:rgb(var(--gold));border:1px solid rgb(190 148 66/.45);
  border-radius:999px;padding:5px 13px}
.finish b.disp{display:block;font-family:"Bai Jamjuree";font-size:clamp(19px,3.4vw,25px);margin:14px 0 8px}
.finish p{color:rgb(255 255 255/.78);font-size:15px;line-height:1.7}
.finish .sm{font-size:13.5px;color:rgb(255 255 255/.68);margin-top:12px}
.finish .sm b{color:rgb(var(--gold))}
.codebox{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;
  background:rgb(255 255 255/.07);border:1px dashed rgb(190 148 66/.55);border-radius:14px;
  padding:12px 16px;margin-top:18px}
.codebox .lb{font-size:12.5px;color:rgb(255 255 255/.6)}
.codebox code{font-family:"Bai Jamjuree";font-weight:700;font-size:clamp(20px,3.6vw,26px);
  letter-spacing:.14em;color:rgb(var(--gold))}
.codebox .cp{background:rgb(255 255 255/.12);border:1px solid rgb(255 255 255/.24);color:#fff;
  border-radius:9px;padding:8px 13px;font-family:"Bai Jamjuree";font-weight:700;font-size:12.5px;
  cursor:pointer;min-height:36px}
.codebox .cp:hover{background:rgb(190 148 66/.3);border-color:rgb(var(--gold))}
.fbtn{display:inline-flex;align-items:center;gap:8px;background:rgb(var(--gold));color:rgb(var(--deep));
  border-radius:13px;padding:14px 26px;font-family:"Bai Jamjuree";font-weight:700;font-size:15.5px;
  margin-top:18px;min-height:44px;transition:transform .18s,filter .18s}
.fbtn:hover{transform:translateY(-2px);filter:brightness(1.07)}
.fbtn.ghost{background:transparent;color:#fff;border:1.5px solid rgb(255 255 255/.38)}
.fbtn.ghost:hover{border-color:rgb(var(--gold));background:rgb(190 148 66/.14)}
.nextup{margin-top:30px}
.nextup .hr{display:flex;align-items:center;gap:12px;font-family:"Bai Jamjuree";font-weight:700;
  font-size:11.5px;letter-spacing:.16em;color:rgb(255 255 255/.5)}
.nextup .hr i{flex:1;height:1px;background:rgb(255 255 255/.18)}
.nextup p{margin-top:14px;font-size:14.5px}
.nextup p + p{margin-top:12px}
.nextup p b{color:rgb(var(--gold))}
.prog{margin-top:22px;max-width:340px}
.prog .track{height:7px;border-radius:999px;background:rgb(255 255 255/.15);overflow:hidden}
.prog .track i{display:block;height:100%;width:0;border-radius:999px;
  background:linear-gradient(90deg,rgb(var(--green)),rgb(var(--gold)));transition:width .5s ease}
.prog .tx{display:inline-block;margin-top:8px;font-family:"Bai Jamjuree";font-weight:700;
  font-size:12.5px;color:rgb(255 255 255/.75)}
.prog .tx.is-done{color:rgb(var(--gold))}
'''

COPY_JS = '''
(function(){
  var b=document.getElementById('fcopy'), c=document.getElementById('fcode');
  if(!b||!c) return;
  b.addEventListener('click',function(){
    var t=c.textContent, ok=function(){ b.textContent='คัดลอกแล้ว ✓';
      setTimeout(function(){ b.textContent='คัดลอก'; },1800); };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(ok,function(){ b.textContent=t; });
    } else { b.textContent=t; }
  });
})();
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
.ep.read{border-color:rgb(27 106 66/.42)}
.ep.read .im{position:relative}
.ep.read .im::after{content:"✓";position:absolute;top:8px;right:8px;width:26px;height:26px;
  display:flex;align-items:center;justify-content:center;border-radius:50%;
  background:rgb(var(--green));color:#fff;font-size:14px;font-weight:700;
  box-shadow:0 4px 10px -3px rgb(10 40 24/.6)}
.ep.read .im img{opacity:.72}
.rstw{text-align:center;padding:6px 0 4px}
.rst{background:none;border:0;color:rgb(var(--muted));font-size:12.5px;text-decoration:underline;
  cursor:pointer;padding:10px;min-height:44px}
.rst:hover{color:rgb(var(--green))}
''' + FINISH_CSS

cards = []
for i, (key, num, title, slug, special, _srcs) in enumerate(EPISODES):
    m = meta[key]
    badge = ' <span class="sp">ตอนพิเศษ</span>' if special else ''
    cards.append(f'''    <a class="ep" href="{slug}/" data-mc-item="forge:{slug}">
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
  <div class="startrow">
    <a class="start disp" data-mc-continue="forge:" href="{EPISODES[0][3]}/" hidden>▶ อ่านต่อจากที่ค้างไว้</a>
    <a class="start disp" data-mc-demote="forge:ghost" href="{EPISODES[0][3]}/">เริ่มอ่านจากตอนแรก</a>
  </div>
  <div class="prog">
    <div class="track"><i data-mc-bar="forge"></i></div>
    <span class="tx" data-mc-progress="forge" hidden></span>
  </div>
</div></section>

<main class="wrap">
  <div class="grid">
{chr(10).join(cards)}
  </div>
  {finish_block('../')}
  <p class="rstw" data-mc-any="forge" hidden><button type="button" class="rst" id="rstBtn">ล้างความคืบหน้าการอ่าน</button></p>
</main>

<footer>
  <p>🍀 myclover.com — อ่านฟรี ไม่มีเงื่อนไข</p>
  <p style="margin-top:6px"><a href="../">กลับหน้าบ้าน</a> · <a href="../privacy/">ข้อมูลของคุณ</a></p>
</footer>'''

open(f'{DEST}/index.html', 'w', encoding='utf-8').write(page(
    f'{SERIES} — อ่านฟรีบน myclover',
    '19 ปีของคนที่เอาวิธีคิดแบบคนเล่นเกมมาทำธุรกิจ — ปรับตัว หา META แล้วพาทั้งทีมไปต่อ อ่านฟรีทุกตอน ไม่ต้องสมัคร',
    f'{SITE}/forge/img/09s-og.jpg', index_body, INDEX_CSS,
    '<script defer src="../assets/quest.js"></script>\n<script>' + COPY_JS + '''
document.addEventListener('DOMContentLoaded',function(){
  var b=document.getElementById('rstBtn');
  if(b) b.addEventListener('click',function(){
    if(confirm('ล้างความคืบหน้าการอ่านทั้งหมด? เครื่องหมายที่อ่านแล้วจะหายไป')) window.MC_QUEST.track('forge').reset();
  });
});
</script>\n''',
    canonical=f'<link rel="canonical" href="{SITE}/forge/">\n'))

# ── หน้าอ่านแต่ละตอน ──
READ_CSS = '''
.strip{background:rgb(var(--deep));font-size:0;line-height:0}
.strip picture{display:block}
.strip img{width:100%;height:auto;margin:0 auto;display:block}
/* ช่องต่อกันสนิท ไม่มีรอยต่อ · scroll-margin กันช่องโดนแถบบนบังตอนกระโดด
   ตรึงกว้างสุดที่ 1024px = ความกว้างจริงของไฟล์ต้นฉบับ
   กว้างกว่านี้คือขยายเกินความละเอียดที่มี และบนจอคอมภาพจะสูงจนต้องย่อหน้าต่างถึงจะอ่านได้ */
.panel{display:block;cursor:pointer;scroll-margin-top:56px;max-width:1024px;margin:0 auto;
  -webkit-tap-highlight-color:rgb(190 148 66/.18)}
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
.epprog{text-align:center;padding:14px 0 2px}
.epprog .tx{font-family:"Bai Jamjuree";font-weight:700;font-size:12.5px;color:rgb(var(--muted))}
.epprog .tx.is-done{color:rgb(var(--green))}
''' + FINISH_CSS

for i, (key, num, title, slug, special, _srcs) in enumerate(EPISODES):
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
        end = '''<div class="endnote" data-mc-undone="forge">
        <b class="disp">🍀 ถึงตอนสุดท้ายแล้วครับ ขอบคุณที่อ่านมาถึงตรงนี้</b>
        ถ้ายังเก็บไม่ครบทุกตอน ย้อนกลับไปเก็บได้เลย — อ่านครบเมื่อไหร่มีของให้
        <div class="row" style="margin-top:16px">
          <a class="nb gold disp" href="../">กลับไปหน้ารวมทุกตอน</a>
          <a class="nb disp" href="../../">แวะดูบ้าน myclover</a>
        </div>
      </div>'''

    badge = ' <span class="sp">ตอนพิเศษ</span>' if special else ''
    alt = f'{SERIES} ตอนที่ {num} — {E(title)}'

    # ── ช่องภาพ ──
    # แตะช่องที่ยังไม่ใช่ช่องท้าย = เลื่อนลงไปช่องถัดไป (ใช้ #anchor ล้วน ไม่ต้องพึ่ง JS)
    # แตะช่องท้าย = ไปตอนถัดไป ตามมาตรฐานเว็บตูน
    panels = m['panels']
    last = len(panels) - 1
    strip = []
    for pi, pn in enumerate(panels):
        pk, pw, ph = pn['k'], pn['w'], pn['h']
        eager = pi == 0
        palt = alt if len(panels) == 1 else f'{alt} — ช่องที่ {pi+1}'
        pic = (f'<picture>\n'
               f'      <source type="image/webp" media="(max-width:640px)" srcset="../img/{pk}-640.webp">\n'
               f'      <source type="image/webp" srcset="../img/{pk}-1024.webp">\n'
               f'      <img src="../img/{pk}.jpg" width="{pw}" height="{ph}"\n'
               f'           loading="{"eager" if eager else "lazy"}"'
               f'{" fetchpriority=" + chr(34) + "high" + chr(34) if eager else ""}'
               f' decoding="async" alt="{palt}">\n'
               f'    </picture>')
        if pi < last:
            strip.append(f'  <a class="panel" id="p{pi+1}" href="#p{pi+2}" '
                         f'aria-label="เลื่อนไปช่องที่ {pi+2}">{pic}</a>')
        elif next_ep:
            strip.append(f'  <a class="panel tapnext" id="p{pi+1}" href="../{next_ep[3]}/" '
                         f'aria-label="อ่านตอนต่อไป — ตอนที่ {next_ep[1]} {E(next_ep[2])}">{pic}</a>')
        else:
            strip.append(f'  <div class="panel" id="p{pi+1}">{pic}</div>')
    strip = '\n'.join(strip)

    if len(panels) > 1:
        tap_hint = ('แตะที่ภาพเพื่อเลื่อนไปช่องถัดไป · ช่องสุดท้ายพาไปตอนต่อไป · หรือกดลูกศร ← → บนคีย์บอร์ด'
                    if next_ep else 'จบซีรีส์แล้ว — กดลูกศร ← เพื่อย้อนกลับตอนก่อนหน้า')
    else:
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
{strip}
</main>

<nav class="wrap nav" data-mc-end>
  <div class="row">
      {nav}
  </div>
  <p class="epprog"><span class="tx" data-mc-progress="forge" hidden></span></p>
  {end}
  {finish_block('../../')}
  <p class="kb">{tap_hint}</p>
</nav>

<footer>
  <p>🍀 {SERIES} · myclover.com</p>
  <p style="margin-top:6px"><a href="../">ทุกตอน</a> · <a href="../../">กลับหน้าบ้าน</a> · <a href="../../privacy/">ข้อมูลของคุณ</a></p>
</footer>'''

    js = '<script defer src="../../assets/quest.js"></script>\n<script>' + '''
document.addEventListener('keydown',function(e){
  if(e.altKey||e.ctrlKey||e.metaKey) return;
  var t=e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA') return;
  var go=null;
  if(e.key==='ArrowLeft')  go=document.querySelector('[data-prev]');
  if(e.key==='ArrowRight') go=document.querySelector('[data-next]');
  if(go){ e.preventDefault(); location.href=go.getAttribute('href'); }
});
''' + COPY_JS + '</script>\n'
    # การนับว่าอ่านจบตอนนี้ quest.js จัดการเองจาก <meta name="mc-item">
    open(f'{d}/index.html', 'w', encoding='utf-8').write(page(
        f'ตอนที่ {num}: {title} — {SERIES} | myclover',
        f'{SERIES} ตอนที่ {num} — {title} · อ่านฟรี ไม่ต้องสมัคร',
        f'{SITE}/forge/img/{key}-og.jpg', body, READ_CSS, js,
        canonical=(f'<link rel="canonical" href="{SITE}/forge/{slug}/">\n'
                   f'<meta name="mc-item" content="forge:{slug}">\n')))

print(f'สร้างหน้าเว็บ {len(EPISODES)+1} หน้า')
