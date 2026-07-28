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
#
# คีย์ = เลขตอน ใช้ตั้งชื่อไฟล์ใน forge/img/ ด้วย (เช่น 04.jpg, 01-p2.jpg)
EPISODES = [
    ("01", "1",  "ทุกคนมีสิทธิ์ลงเล่น",       "ep1-everyone-gets-to-play",   False,
     ["011.jpg", "012.jpg", "013.jpg", "014.jpg"]),
    ("02", "2",  "ไอเท็มชิ้นแรก",             "ep2-the-first-item",          False,
     ["021.jpg", "022.jpg", "023.jpg", "024.jpg"]),
    ("03", "3",  "ของที่กลับมาพร้อมรอยใช้",   "ep3-the-item-that-came-back", False,
     ["031.jpg", "032.jpg", "033.jpg", "034.jpg"]),
    ("04", "4",  "สิ่งที่เดินทางแทนเรา",      "ep4-what-traveled-without-us",  False,
     ["041.jpg", "042.jpg", "043.jpg", "044.jpg"]),
    ("05", "5",  "จากคำตอบสู่ระบบ",           "ep5-from-answers-to-a-system",  False, ["05.png"]),
    ("06", "6",  "ชุดเริ่มต้นของผู้เล่นใหม่", "ep6-the-starter-kit",           False, ["06.png"]),
    ("07", "7",  "เสียงที่ไปไกลกว่าเรา",      "ep7-a-voice-that-went-further", False, ["07.png"]),
    ("08", "8",  "ช่างตีเหล็กหลังเวที",       "ep8-the-blacksmith-backstage",  False, ["08.png"]),
    ("09", "9",  "ของที่ดีต้องไปถึงมือคน",    "ep9-tools-must-reach-people",   False, ["09.png"]),
    ("10", "10", "ครั้งนี้ผมไม่ปิดจอ",        "ep10-this-time-i-left-the-screen-on", False, ["10.png"]),
    ("11", "11", "แต่ละคนมี Class ของตัวเอง", "ep11-everyone-has-their-own-class",   False, ["09s.png"]),
    ("12", "12", "เกมใหม่ ลีกใหม่",           "ep12-a-new-game-a-new-league",        False, ["10.png"]),
]

# เรียงเลขตอนใหม่เป็น 1–12 (เดิมเริ่มที่ 0 และมีตอน 9.5)
# คนที่อ่านค้างไว้ก่อนเปลี่ยนต้องไม่เสียความคืบหน้า และลิงก์เก่าต้องยังเปิดได้
# ตารางนี้เลยถูกใช้ 2 ที่: ย้ายค่าใน localStorage (quest.js) และทำ _redirects
OLD_TO_NEW = [
    ("ep0-my-own-machine",         "ep1-everyone-gets-to-play"),
    ("ep1-month-five",             "ep2-the-first-item"),
    ("ep2-footsteps",              "ep3-the-item-that-came-back"),
    ("ep3-fresh-disc",             "ep4-what-traveled-without-us"),
    ("ep4-deckbuilding",           "ep5-from-answers-to-a-system"),
    ("ep5-dream-factory",          "ep6-the-starter-kit"),
    ("ep6-ten-to-thousand",        "ep7-a-voice-that-went-further"),
    ("ep7-the-smith-who-lost",     "ep8-the-blacksmith-backstage"),
    ("ep8-the-one-from-hatyai",    "ep9-tools-must-reach-people"),
    ("ep9-open-the-screen",        "ep10-this-time-i-left-the-screen-on"),
    ("ep9-5-the-guild-i-imagined", "ep11-everyone-has-their-own-class"),
    ("ep10-the-tenth-step",        "ep12-a-new-game-a-new-league"),
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

# แบนเนอร์หน้าแรก — ช่อง 4 ของตอนที่ 11 (ฝูงชนเดินตอนพระอาทิตย์ตก) เลี่ยงกรอบข้อความ
BANNER_SRC = next(s[0] for k, _, _, _, _, s in EPISODES if k == '11')
if not SKIP_IMG and os.path.exists(os.path.join(SRC, BANNER_SRC)):
    s = Image.open(os.path.join(SRC, BANNER_SRC)).convert('RGB')
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
FORGE_CODE  = 'CLOVERX'     # เปลี่ยนเมื่อไหร่ต้องแก้แฮชใน card/index.html ด้วย
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

RENAMED_JS = ','.join("'%s':'%s'" % (o, n) for o, n in OLD_TO_NEW)

QUEST_JS = '''/* ═══════════════════════════════════════════════════════════════
   myclover — ความคืบหน้า + ตราประจำตัวของทั้งเว็บ

   ⚠️ สร้างอัตโนมัติจาก tools/build.py — อย่าแก้ไฟล์นี้ตรง ๆ

   เก็บอยู่ในเครื่องของผู้ใช้ล้วน (localStorage) ไม่ส่งออกไปไหน
   ล้างข้อมูลเบราว์เซอร์เมื่อไหร่ ความคืบหน้าก็หายไปด้วย

   ── เส้นความคืบหน้า ──
   forge = อ่านการ์ตูน  ·  learn = เรียนห้องเรียน
   ทำครบเส้นไหน ปลดตราของเส้นนั้นให้เอง

   ── บอกหน้าเว็บว่าหน้านี้คือของอะไร ──
   <meta name="mc-item" content="forge:ep1-everyone-gets-to-play">
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

  /* ── ย้ายความคืบหน้าเก่ามาชื่อใหม่ ──
     ตอนการ์ตูนถูกเรียงเลขใหม่เป็น 1–12 (เดิมเริ่มที่ 0 และมีตอน 9.5)
     คนที่อ่านค้างไว้ก่อนหน้านั้นต้องไม่เสียของ — แปลงครั้งเดียวแล้วปักธงไว้ */
  var RENAMED={%RENAMED%};
  function migrate(){
    if(ls('mc_read_v2','')==='1') return;
    var raw=ls('mc_read','');
    if(raw){
      var out=[], seen={};
      raw.split(',').forEach(function(s){
        var k=RENAMED[s]||s;
        if(k && !seen[k]){ seen[k]=1; out.push(k); }
      });
      save('mc_read',out.join(','));
    }
    save('mc_read_v2','1');
  }

  function boot(){ migrate(); heal(); paint(); watch(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
'''.replace('%TRACKS%', tracks_js).replace('%RENAMED%', RENAMED_JS)

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
    <p>ตั้งแต่ “{EPISODES[0][2]}” จนถึง “{EPISODES[-1][2]}” — ครบทั้ง {len(EPISODES)} ตอน<br>
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
  <p>19 ปีของคนที่เอาวิธีคิดแบบคนเล่นเกมมาทำธุรกิจ — อ่านเกมให้ออก หา META ให้เจอ แล้วพาทั้งทีมไปต่อ<br>12 ตอน อ่านฟรีทั้งหมด</p>
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
    f'{SITE}/forge/img/11-og.jpg', index_body, INDEX_CSS,
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


# ─────────────────────────────────────────────────────────────
# หน้าของแต่ละสาย — /paths/
#
# หน้าแรกมีด่านเลือกสายอยู่แล้ว แต่เลือกเสร็จเห็นแค่ลิงก์สามอัน
# หน้าพวกนี้คือ "ที่ที่แต่ละสายเดินต่อ" — ลำดับที่แนะนำ + ของที่ตรงกับคน
#
# ⚠️ ชื่อสาย/อีโมจิ/สี ต้องตรงกับ 2 ที่:
#    CLASSES ใน card/index.html  (ใช้วาดการ์ด)
#    PATHS   ใน index.html       (ด่านเลือกสายหน้าแรก)
#
# ขั้นในเส้นทางผูกกับความคืบหน้าได้ 3 แบบ
#    ('item',  'learn:notebooklm')  ทำบทนั้นแล้วขั้นนี้ติ๊กเขียว
#    ('track', 'forge')             ครบทั้งเส้นแล้วขึ้นป้าย "ครบแล้ว"
#    ('none',  '')                  ไม่ผูกกับอะไร
# ─────────────────────────────────────────────────────────────

CARD_GIFT = ('../../card/', 'ทำการ์ดประจำตัว',
             'บอกคนอื่นได้ใน 1 ภาพว่าคุณเป็นสายไหน และเก็บตราที่ปลดได้ไว้บนนั้น')
CLASS_GIFT = ('../../classroom/', 'ห้องเรียน AI ทั้ง 6 บท',
              'เรียนฟรี บทละประมาณ 10 นาที ทำตามได้เลยไม่ต้องมีพื้นฐาน')
WALK_GIFT = ('../../walkthrough/', 'ห้องบทสรุป 🔒',
             'เปิดให้คนที่อ่านการ์ตูนครบทั้ง 12 ตอน — แปลภาษาเกมเป็นภาษาธุรกิจ '
             'และเปิดเบื้องหลังว่าเว็บนี้สร้างขึ้นมายังไง')

PATHS = [
 {'key':'THINKER','slug':'thinker','th':'สายคิด','emo':'🧠','ac':'#2E4A8F',
  'hook':'อยากเจอคนที่คิดเป็นระบบเหมือนกัน',
  'who':'ชอบวางแผน ถอดบทเรียน มองภาพรวมก่อนลงมือ',
  'h1':'คิดจนเห็นทั้งกระดาน<br>แล้วค่อยเริ่มขยับตัว',
  'lead':'คุณไม่ได้ขาดไอเดีย — คุณมีเยอะจนล้นด้วยซ้ำ สิ่งที่ขาดคือที่เก็บความคิด'
         'ที่หยิบกลับมาใช้ต่อได้จริง กับคนที่คิดเป็นระบบพอจะคุยด้วยได้',
  'signs':['เห็นปัญหาของงานตั้งแต่ยังไม่เริ่ม แล้วโดนหาว่าคิดมาก',
           'มีโน้ต ไฟล์ และไอเดียเก็บไว้เต็มเครื่อง แต่ยังไม่ได้ลงมือสักอัน',
           'สนุกกับการถอดบทเรียนหลังจบงาน มากกว่าตอนทำงานเสียอีก'],
  'strong':'คุณมองเห็นภาพรวมและลำดับก่อนหลังโดยไม่ต้องมีใครสอน คนแบบนี้หายาก '
           'และเป็นคนที่ทีมวิ่งไปหาเสมอเวลาสิ่งต่าง ๆ เริ่มยุ่ง',
  'stuck':'รอให้คิดครบก่อนค่อยเริ่ม แล้วก็ไม่ได้เริ่มสักที ทางออกไม่ใช่คิดให้น้อยลง '
          'แต่คือมีที่ให้ความคิดออกไปอยู่นอกหัว แล้วให้เครื่องมือทำงานต่อจากตรงนั้น',
  'route':[
    ('track','forge','อ่านเรื่องเล่าจากโรงตีเหล็ก',
     '12 ตอน อ่านฟรี ไม่ต้องสมัคร — 19 ปีของคนที่คิดมากกว่าขาย '
     'รวมถึงตอนที่คิดเยอะแล้วยังพลาดอยู่ดี','../../forge/','เริ่มอ่านตอนแรก'),
    ('item','learn:notebooklm','⭐ LV.4 สร้าง Source ครั้งเดียว ใช้ต่อได้ทั้งงาน',
     'บทติดดาวของห้องเรียน — ย้ายสิ่งที่อยู่ในหัวลงไฟล์เดียว '
     'แล้วให้ AI แตกออกเป็นสไลด์ ภาพ เสียง และวิดีโอ ต่อจากตรงนั้น',
     '../../classroom/notebooklm.html','เข้าบทติดดาว'),
    ('item','learn:prompts','LV.5 Smart Prompt Vault',
     'คลังพรอมต์พร้อมใช้ และวิธีสร้าง AI คู่หูที่รู้จักงานของคุณ — '
     'สำหรับคนที่อยากให้คำถามคมขึ้น ไม่ใช่ถามให้เยอะขึ้น',
     '../../classroom/prompts.html','เปิดคลังพรอมต์')],
  'gifts':[CLASS_GIFT, WALK_GIFT, CARD_GIFT]},

 {'key':'TASTER','slug':'taster','th':'สายกิน','emo':'🍜','ac':'#C4622D',
  'hook':'อยากกินอร่อยแบบไม่รู้สึกผิด',
  'who':'รักการกินจริง ๆ และไม่อยากเลิกรักมันเพื่อสุขภาพ',
  'h1':'กินให้อร่อย<br>โดยไม่ต้องรู้สึกผิดทีหลัง',
  'lead':'บ้านนี้ไม่เชื่อเรื่องอดอาหาร เราเชื่อว่ากินเป็นดีกว่าอดตาย '
         'และเรื่องกินคือเสาแรกที่เรากำลังทำอยู่',
  'signs':['วางแผนทริปจากร้านที่อยากกิน ก่อนจะเลือกที่พักด้วยซ้ำ',
           'เคยอดจนผอมมาแล้ว แล้วก็กลับมาหนักกว่าเดิม',
           'ไม่เชื่อว่าคนเราจะกินอกไก่ต้มกับผักนึ่งไปได้ทั้งชีวิต'],
  'strong':'คุณรู้จักความสุขของตัวเองจริง ๆ และไม่ยอมแลกมันทิ้งง่าย ๆ '
           'ระบบสุขภาพที่อยู่กับคนได้นานต้องสร้างบนความสุข ไม่ใช่บนการฝืน',
  'stuck':'รู้เรื่องกินเยอะ แต่ความรู้กระจายอยู่คนละที่ พอถึงเวลาเลือกจริง '
          'เลยเลือกจากความหิว ไม่ได้เลือกจากสิ่งที่รู้',
  'route':[
    ('none','','แวะดูจุดยืนของ myclover club',
     'กิน นอน ใช้พลัง — สามเสาที่เราเชื่อ และเหตุผลว่าทำไมเราไม่เดินทางเดียว'
     'กับตลาดสุขภาพทั่วไป','../../club/','เข้าห้อง club'),
    ('item','learn:free-ai','LV.1 เริ่มใช้ AI ให้เป็น',
     'ลองกับเรื่องใกล้ตัวก่อน เช่น อ่านฉลาก จัดมื้อทั้งอาทิตย์ '
     'หรือหาของกินแถวที่กำลังจะไป — เริ่มจากศูนย์ ใช้เวลาประมาณ 10 นาที',
     '../../classroom/free-ai.html','เริ่มบทแรก'),
    ('item','learn:notebooklm','⭐ LV.4 เก็บสิ่งที่รู้ไว้ที่เดียว',
     'บทติดดาว — รวมสิ่งที่คุณรู้เรื่องกินไว้ในไฟล์เดียว '
     'แล้วให้ AI ตอบจากของของคุณเอง ไม่ใช่ตอบจากอินเทอร์เน็ตทั่วไป',
     '../../classroom/notebooklm.html','เข้าบทติดดาว')],
  'note':'เนื้อหาสามเสา (กิน · นอน · ใช้พลัง) กำลังทยอยลง — '
         'ระหว่างนี้ห้องเรียนใช้ได้เต็มที่แล้ว และใช้กับเรื่องกินได้ตรง ๆ',
  'gifts':[('../../club/','แวะดู myclover club',
            'จุดยืนเรื่องสุขภาพในแบบที่ไม่ต้องเหมือนใคร'), CLASS_GIFT, CARD_GIFT]},

 {'key':'KEEPER','slug':'keeper','th':'สายคลีน','emo':'💪','ac':'#1F8A70',
  'hook':'อยากมีระบบที่วัดผลได้',
  'who':'มีวินัยอยู่แล้ว ขาดแค่ระบบที่เห็นผลชัด',
  'h1':'คุณไม่ได้ขาดความตั้งใจ<br>คุณขาดระบบที่วัดได้',
  'lead':'ทำได้อยู่แล้ว แต่ไม่รู้ว่าทำไปแล้วได้อะไร — เราเลยสนใจส่วนที่วัดผลได้ '
         'มากกว่าส่วนที่ปลุกใจ',
  'signs':['เคยทำต่อเนื่องได้เป็นเดือน แล้วหลุดตอนชีวิตยุ่งขึ้นมาพอดี',
           'จดไว้หลายที่ ทั้งแอป ทั้งสมุด ทั้งโน้ตในมือถือ จนไม่รู้ต้องดูอันไหน',
           'อยากเห็นเป็นตัวเลขว่าเดือนนี้ดีขึ้นกว่าเดือนก่อนตรงไหน'],
  'strong':'คุณทำต่อเนื่องได้จริง ซึ่งคนส่วนใหญ่ติดตั้งแต่ก้าวแรก '
           'เหลือแค่ทำให้สิ่งที่ทำอยู่ทุกวันมองเห็นเป็นตัวเลขได้',
  'stuck':'พอวัดไม่ได้ ก็ไม่รู้ว่าควรทำต่อหรือควรเปลี่ยน สุดท้ายเลยเลิก '
          'ทั้งที่มันอาจกำลังได้ผลอยู่',
  'route':[
    ('none','','แวะดูจุดยืนของ myclover club',
     'กิน นอน ใช้พลัง — สามเสาที่เราเชื่อ และเกณฑ์ที่เราใช้วัดว่าอะไรเรียกว่าดีขึ้น',
     '../../club/','เข้าห้อง club'),
    ('item','learn:notebooklm','⭐ LV.4 เขียนกติกาของตัวเองลงไฟล์เดียว',
     'บทติดดาว — พอกติกาอยู่ในไฟล์เดียว AI จะตอบตามกติกาของคุณได้ '
     'และคุณจะเห็นเองว่าตรงไหนที่เขียนไว้แต่ไม่เคยทำ',
     '../../classroom/notebooklm.html','เข้าบทติดดาว'),
    ('item','learn:prompts','LV.5 พรอมต์ที่ใช้ซ้ำได้ทุกวัน',
     'สรุปวันนี้ · เทียบกับอาทิตย์ที่แล้ว · หาจุดที่หลุดบ่อย — '
     'ชุดคำถามเดิมที่ถามซ้ำได้ทุกวัน คือสิ่งที่ทำให้ข้อมูลเทียบกันได้',
     '../../classroom/prompts.html','เปิดคลังพรอมต์')],
  'note':'เครื่องมือติดตามผลของบ้านยังทำอยู่ ระหว่างนี้เราแนะนำให้ใช้ AI '
         'กับไฟล์ของตัวเองไปก่อน — ซึ่งปรับตามใจคุณได้มากกว่าแอปสำเร็จรูปด้วยซ้ำ',
  'gifts':[('../../club/','แวะดู myclover club',
            'กิน นอน ใช้พลัง — สามเสาที่วัดผลได้จริง'), CLASS_GIFT, CARD_GIFT]},

 {'key':'MAKER','slug':'maker','th':'สายประดิษฐ์','emo':'🧰','ac':'#4B5A67',
  'hook':'อยากใช้ AI ให้เป็นในงานจริง',
  'who':'ชอบสร้างของ และอยากให้เครื่องมือทำงานแทนได้',
  'h1':'ให้เครื่องมือทำงานแทน<br>แล้วเอาเวลาไปสร้างของ',
  'lead':'ห้องเรียนของบ้านนี้สร้างมาเพื่อคุณโดยตรง — ไม่ต้องเขียนโค้ดเป็น '
         'ไม่ต้องจ่ายก่อน เริ่มบทแรกได้เลยวันนี้',
  'signs':['เปิด AI ไว้ทุกวัน แต่ยังใช้แค่ถาม–ตอบ ยังไม่ได้ใช้มันสร้างของ',
           'อยากมีเว็บหรือเครื่องมือของตัวเอง แต่ติดว่าไม่ได้เรียนสายเขียนโปรแกรม',
           'เห็นของสวย ๆ แล้วอยากรู้ว่าเบื้องหลังทำยังไง มากกว่าอยากได้ของชิ้นนั้น'],
  'strong':'คุณลงมือก่อนแล้วค่อยเข้าใจ ซึ่งเป็นวิธีที่เร็วที่สุดกับเครื่องมือ AI '
           'เพราะมันเปลี่ยนเร็วเกินกว่าจะรอเรียนให้ครบก่อนค่อยใช้',
  'stuck':'สร้างของได้เยอะ แต่ไม่ได้เก็บวิธีที่ใช้เอาไว้ '
          'พอกลับมาทำอีกทีเลยต้องออกตามหาใหม่ตั้งแต่ต้น',
  'route':[
    ('item','learn:free-ai','LV.1 AI ฟรีที่ควรมีติดเครื่อง',
     'รู้ว่าตัวไหนเก่งเรื่องอะไร แล้วเลือกใช้ให้ถูกงาน — เริ่มจากศูนย์ '
     'ใช้เวลาประมาณ 10 นาที','../../classroom/free-ai.html','เริ่มบทแรก'),
    ('item','learn:notebooklm','⭐ LV.4 สร้าง Source ของตัวเอง',
     'บทติดดาว — เก็บวิธีทำงานของคุณไว้ในไฟล์เดียว '
     'แล้วงานชิ้นต่อไปเริ่มจากไฟล์นั้นแทนที่จะเริ่มจากศูนย์ทุกครั้ง',
     '../../classroom/notebooklm.html','เข้าบทติดดาว'),
    ('item','learn:first-web','LV.6 สร้างเว็บแรกของตัวเอง',
     'ด่านสุดท้ายของห้องเรียน — จบบทนี้แล้วคุณจะมีเว็บของตัวเองอยู่บนอินเทอร์เน็ตจริง ๆ',
     '../../classroom/first-web.html','ไปด่านสุดท้าย')],
  'gifts':[CLASS_GIFT, WALK_GIFT, CARD_GIFT]},
]


def hex_rgb(h):
    """#2E4A8F → '46 74 143' — จะได้ใส่ความโปร่งใสด้วย rgb(var(--ac)/.1) ได้"""
    n = int(h.lstrip('#'), 16)
    return f'{(n >> 16) & 255} {(n >> 8) & 255} {n & 255}'


PATH_CSS = '''
.phero{padding:52px 0 40px;background:
  radial-gradient(700px 340px at 6% -22%,rgb(var(--ac)/.16),transparent 62%),
  radial-gradient(420px 260px at 97% 0%,rgb(var(--gold)/.13),transparent 60%)}
.phero .emo{font-size:46px;line-height:1}
.ptag{display:inline-flex;align-items:center;gap:8px;margin-top:14px;font-family:"Bai Jamjuree";
  font-weight:700;font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:rgb(var(--ac));
  background:rgb(var(--ac)/.10);border:1px solid rgb(var(--ac)/.3);border-radius:999px;padding:6px 14px}
.phero h1{font-size:clamp(29px,5.4vw,48px);font-weight:700;line-height:1.16;margin:16px 0 14px}
.phero .lead{font-size:16.5px;color:rgb(var(--ink)/.76);max-width:58ch}
.sect{padding:44px 0}
.sect+.sect{padding-top:0}
.sect h2{font-family:"Bai Jamjuree";font-size:clamp(21px,3.4vw,29px);font-weight:700;line-height:1.28}
.sect .sub{color:rgb(var(--ink)/.68);margin-top:9px;max-width:60ch;font-size:15px}
.eyebrow{font-family:"Bai Jamjuree";font-size:12px;font-weight:700;letter-spacing:.13em;
  text-transform:uppercase;color:rgb(var(--gold))}
.signs{display:grid;gap:9px;margin-top:20px}
.sign{display:flex;gap:11px;align-items:flex-start;background:#fff;border:1px solid rgb(var(--ink)/.09);
  border-radius:14px;padding:14px 16px;font-size:15px}
.sign i{font-style:normal;color:rgb(var(--ac));font-weight:700;flex:none}
.two{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:20px}
@media(max-width:720px){.two{grid-template-columns:1fr}}
.box{border-radius:16px;padding:19px 21px;border:1px solid rgb(var(--ink)/.1);background:#fff}
.box.acc{background:rgb(var(--ac)/.06);border-color:rgb(var(--ac)/.24)}
.box b{display:block;font-family:"Bai Jamjuree";font-size:15.5px;margin-bottom:7px}
.box p{font-size:14.5px;color:rgb(var(--ink)/.76)}
.route{margin-top:20px;display:grid;gap:11px}
.step{position:relative;display:block;background:#fff;border:1px solid rgb(var(--ink)/.1);
  border-radius:16px;padding:17px 20px 17px 60px;transition:transform .18s,box-shadow .18s,border-color .18s}
.step:hover{transform:translateY(-2px);box-shadow:0 16px 32px -20px rgb(18 40 28/.42);
  border-color:rgb(var(--ac)/.4)}
.step .n{position:absolute;left:17px;top:17px;width:30px;height:30px;border-radius:9px;display:grid;
  place-items:center;font-family:"Bai Jamjuree";font-weight:700;font-size:14px;
  background:rgb(var(--ac)/.12);color:rgb(var(--ac))}
.step b{font-family:"Bai Jamjuree";font-size:16px;display:block;line-height:1.4}
.step p{font-size:14.5px;color:rgb(var(--ink)/.72);margin-top:5px}
.step .go{display:inline-block;margin-top:9px;font-family:"Bai Jamjuree";font-weight:700;
  font-size:13.5px;color:rgb(var(--ac))}
.step.done{background:rgb(27 106 66/.05);border-color:rgb(27 106 66/.32)}
.step.done .n{background:rgb(var(--green));color:#fff}
.step.done .n i{display:none}
.step.done .n::after{content:"✓"}
.ok{display:inline-block;margin-left:7px;font-size:11px;font-weight:700;font-family:"Bai Jamjuree";
  color:rgb(var(--green));border:1px solid rgb(var(--green)/.42);border-radius:999px;
  padding:2px 9px;vertical-align:middle}
.pgline{margin-top:13px;font-size:13px;color:rgb(var(--muted))}
.note{margin-top:18px;background:rgb(var(--gold)/.09);border:1px solid rgb(var(--gold)/.32);
  border-radius:14px;padding:14px 17px;font-size:14px;color:rgb(var(--ink)/.8)}
.note b{font-family:"Bai Jamjuree";color:rgb(var(--ink))}
.gifts{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:11px;margin-top:20px}
.gift{background:#fff;border:1px solid rgb(var(--ink)/.1);border-radius:16px;padding:17px 19px;
  transition:transform .18s,box-shadow .18s,border-color .18s}
.gift:hover{transform:translateY(-3px);box-shadow:0 18px 34px -22px rgb(18 40 28/.45);
  border-color:rgb(var(--ac)/.38)}
.gift b{font-family:"Bai Jamjuree";font-size:15px;display:block;line-height:1.4}
.gift small{display:block;color:rgb(var(--ink)/.68);font-size:13.5px;margin-top:6px;line-height:1.6}
.gift::after{content:"เปิดดู →";display:block;font-family:"Bai Jamjuree";font-weight:700;
  font-size:12.5px;color:rgb(var(--ac));margin-top:8px}
.flag{margin-top:8px;background:rgb(var(--deep));color:#fff;border-radius:20px;
  padding:clamp(22px,3.4vw,30px);
  background-image:radial-gradient(560px 240px at 6% -34%,rgb(var(--ac)/.55),transparent 64%)}
.flag b{font-family:"Bai Jamjuree";font-size:18px;display:block}
.flag p{color:rgb(255 255 255/.78);font-size:14.5px;margin-top:7px;max-width:54ch}
.btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;padding:13px 22px;
  font-family:"Bai Jamjuree";font-weight:700;font-size:14.5px;border:1px solid rgb(255 255 255/.24);
  color:#fff;background:transparent;cursor:pointer;transition:transform .15s,background .15s}
.btn:hover{transform:translateY(-2px);background:rgb(255 255 255/.07)}
.btn.gold{background:rgb(var(--gold));border-color:rgb(var(--gold));color:rgb(var(--deep))}
.btn.gold:hover{background:rgb(var(--gold))}
.flagged{margin-top:14px;font-size:14px;color:rgb(190 148 66);font-weight:600}
.pcards{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:22px}
@media(max-width:760px){.pcards{grid-template-columns:1fr}}
.pcard{display:block;background:#fff;border:1px solid rgb(var(--ink)/.1);
  border-left:5px solid rgb(var(--c));border-radius:16px;padding:20px 22px;
  transition:transform .18s,box-shadow .18s}
.pcard:hover{transform:translateY(-3px);box-shadow:0 20px 40px -24px rgb(18 40 28/.48)}
.pcard .e{font-size:31px;line-height:1}
.pcard .nm{display:block;font-family:"Bai Jamjuree";font-weight:700;font-size:11.5px;
  letter-spacing:.13em;text-transform:uppercase;color:rgb(var(--c));margin-top:9px}
.pcard h3{font-family:"Bai Jamjuree";font-size:18px;line-height:1.4;margin-top:3px;font-weight:700}
.pcard p{font-size:14.5px;color:rgb(var(--ink)/.7);margin-top:8px}
.pcard .go{display:inline-block;margin-top:11px;font-family:"Bai Jamjuree";font-weight:700;
  font-size:13.5px;color:rgb(var(--c))}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:20px}
@media(max-width:820px){.three{grid-template-columns:1fr}}
.others{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:18px}
.oth{background:#fff;border:1px solid rgb(var(--ink)/.1);border-radius:14px;padding:15px 16px;
  transition:transform .18s,border-color .18s}
.oth:hover{transform:translateY(-2px);border-color:rgb(var(--ink)/.3)}
.oth .e{font-size:23px;line-height:1}
.oth b{display:block;font-family:"Bai Jamjuree";font-size:14.5px;margin-top:6px;line-height:1.4}
.oth small{display:block;color:rgb(var(--ink)/.66);font-size:12.5px;margin-top:4px;line-height:1.55}
'''

FLAG_JS = '''
(function(){
  var K='%s', b=document.getElementById('flagBtn'), m=document.getElementById('flagMsg');
  function on(){ try{ return localStorage.getItem('mc_class')===K; }catch(e){ return false; } }
  function paint(){ if(b) b.hidden=on(); if(m) m.hidden=!on(); }
  if(b) b.addEventListener('click',function(){
    try{ localStorage.setItem('mc_class',K); }catch(e){}
    paint();
  });
  paint();
})();
'''


def path_page(p):
    others = [o for o in PATHS if o['key'] != p['key']]

    signs = '\n'.join(
        f'    <div class="sign"><i>✓</i><span>{E(s)}</span></div>' for s in p['signs'])

    steps = []
    for i, (kind, ref, label, why, href, cta) in enumerate(p['route'], 1):
        attr = f' data-mc-item="{ref}"' if kind == 'item' else ''
        badge = (f'<span class="ok" data-mc-done="{ref}" hidden>ครบแล้ว</span>'
                 if kind == 'track' else '')
        steps.append(
            f'    <a class="step" href="{href}"{attr}>\n'
            f'      <span class="n"><i>{i}</i></span>\n'
            f'      <b class="disp">{label}{badge}</b>\n'
            f'      <p>{why}</p>\n'
            f'      <span class="go">{cta} →</span>\n'
            f'    </a>')
    steps = '\n'.join(steps)

    gifts = '\n'.join(
        f'    <a class="gift" href="{h}"><b class="disp">{t}</b><small>{d}</small></a>'
        for h, t, d in p['gifts'])

    others_html = '\n'.join(
        f'    <a class="oth" href="../{o["slug"]}/"><span class="e">{o["emo"]}</span>'
        f'<b class="disp">{o["th"]}</b><small>{E(o["who"])}</small></a>' for o in others)

    note = (f'  <div class="note"><b>พูดกันตรง ๆ:</b> {p["note"]}</div>\n'
            if p.get('note') else '')

    body = f'''<nav class="bar"><div class="wrap">
  <a class="home disp" href="../../">🍀 my<em>clover</em></a>
  <span class="ttl"><b>{p['emo']} {p['th']}</b>เส้นทางของคุณในบ้านหลังนี้</span>
</div></nav>

<header class="phero"><div class="wrap">
  <div class="emo">{p['emo']}</div>
  <span class="ptag">{p['key']} · {p['th']}</span>
  <h1 class="disp">{p['h1']}</h1>
  <p class="lead">{p['lead']}</p>
</div></header>

<section class="sect"><div class="wrap">
  <span class="eyebrow">ฟังดูคุ้นไหม</span>
  <h2 class="disp">ถ้าสามข้อนี้ใช่ คุณมาถูกหน้าแล้ว</h2>
  <p class="sub">ไม่มีแบบทดสอบ ไม่มีคะแนน — อ่านแล้วรู้สึกว่าใช่ก็พอ</p>
  <div class="signs">
{signs}
  </div>
  <div class="two">
    <div class="box acc"><b class="disp">สิ่งที่คุณได้เปรียบ</b><p>{p['strong']}</p></div>
    <div class="box"><b class="disp">จุดที่สายนี้มักติด</b><p>{p['stuck']}</p></div>
  </div>
</div></section>

<section class="sect"><div class="wrap">
  <span class="eyebrow">เส้นทางที่เราแนะนำ</span>
  <h2 class="disp">สามก้าวถัดไป เรียงมาให้แล้ว</h2>
  <p class="sub">ไม่ใช่ข้อบังคับ ข้ามหรือสลับได้ตามใจ — ทำอันไหนแล้วมันจะติ๊กเขียวให้เอง
  เก็บอยู่ในเครื่องคุณล้วน ไม่ได้ส่งไปไหน</p>
  <div class="route">
{steps}
  </div>
  <p class="pgline"><span data-mc-progress="learn" hidden></span></p>
{note}</div></section>

<section class="sect"><div class="wrap">
  <span class="eyebrow">ของในบ้านที่ตรงกับสายนี้</span>
  <h2 class="disp">หยิบไปใช้ได้เลย ไม่มีเงื่อนไข</h2>
  <div class="gifts">
{gifts}
  </div>
</div></section>

<section class="sect"><div class="wrap">
  <div class="flag">
    <b class="disp">ปักธงว่าคุณคือ{p['th']}</b>
    <p>จำไว้ในเครื่องของคุณเอง แล้วหน้าอื่นในบ้านจะหยิบของที่ตรงกับคุณขึ้นมาก่อน
    รวมถึงการ์ดประจำตัวที่จะขึ้นสาย{p['th']}ให้อัตโนมัติ — เปลี่ยนใจทีหลังได้ตลอด</p>
    <p class="flagged" id="flagMsg" hidden>🍀 ปักธงเรียบร้อย — คุณคือ{p['th']}</p>
    <div class="btnrow">
      <button type="button" class="btn" id="flagBtn">ปักธงว่าฉันคือ{p['th']}</button>
      <a class="btn gold" href="../../card/">ไปทำการ์ดประจำตัว</a>
    </div>
  </div>
</div></section>

<section class="sect"><div class="wrap" data-mc-end>
  <span class="eyebrow">ไม่ใช่สายนี้ก็ไม่เป็นไร</span>
  <h2 class="disp">ดูสายอื่นได้ ห้องทุกห้องเปิดเหมือนเดิม</h2>
  <p class="sub">สายเป็นแค่ทางลัดให้เราหยิบของถูกอันมาวางตรงหน้าคุณ ไม่ได้ล็อกอะไรทั้งนั้น</p>
  <div class="others">
{others_html}
  </div>
</div></section>

<footer>
  <p>🍀 myclover.com · เลือกได้ ไม่เลือกก็ได้ · เปลี่ยนใจทีหลังได้ตลอด</p>
  <p style="margin-top:6px"><a href="../">ดูทุกสาย</a> · <a href="../../">กลับหน้าบ้าน</a> ·
     <a href="../../card/">ทำการ์ด</a> · <a href="../../privacy/">ข้อมูลของคุณ</a></p>
</footer>'''

    js = ('<script defer src="../../assets/quest.js"></script>\n<script>'
          + FLAG_JS % p['key'] + '</script>\n')
    css = f':root{{--ac:{hex_rgb(p["ac"])}}}\n' + PATH_CSS
    return page(
        f'{p["emo"]} {p["th"]} — เส้นทางของคุณ | myclover',
        f'{p["hook"]} — {p["who"]} · เส้นทางที่แนะนำสำหรับ{p["th"]}ในบ้าน myclover',
        f'{SITE}/img/og-home.jpg', body, css, js,
        canonical=f'<link rel="canonical" href="{SITE}/paths/{p["slug"]}/">\n')


def paths_index():
    cards = '\n'.join(
        f'''    <a class="pcard" href="{p['slug']}/" style="--c:{hex_rgb(p['ac'])}">
      <span class="e">{p['emo']}</span>
      <span class="nm">{p['key']}</span>
      <h3 class="disp">{p['th']} — {E(p['hook'])}</h3>
      <p>{E(p['who'])}</p>
      <span class="go">ดูเส้นทางของ{p['th']} →</span>
    </a>''' for p in PATHS)

    body = f'''<nav class="bar"><div class="wrap">
  <a class="home disp" href="../">🍀 my<em>clover</em></a>
  <span class="ttl"><b>สายทั้งหมด</b>เลือกได้ ไม่เลือกก็ได้</span>
</div></nav>

<header class="phero"><div class="wrap">
  <div class="emo">🧭</div>
  <span class="ptag">เลือกสาย</span>
  <h1 class="disp">วันนี้อะไรพามาที่นี่?</h1>
  <p class="lead">เลือกอันที่ใกล้ตัวที่สุด แล้วเราจะหยิบของในบ้านที่ตรงกับคุณมาวางให้
  พร้อมลำดับที่แนะนำว่าควรเริ่มตรงไหน — ไม่ได้ล็อกทาง ห้องอื่นยังเข้าได้เหมือนเดิมทุกห้อง
  และเปลี่ยนใจทีหลังได้ตลอด</p>
</div></header>

<section class="sect"><div class="wrap">
  <span class="eyebrow">สี่สายของบ้าน</span>
  <h2 class="disp">อ่านสองบรรทัด แล้วเลือกอันที่ใช่ที่สุด</h2>
  <p class="sub">ไม่ต้องเลือกให้ถูก เลือกให้ใกล้ตัวก็พอ ที่เหลือเราจัดให้</p>
  <div class="pcards">
{cards}
  </div>
</div></section>

<section class="sect"><div class="wrap" data-mc-end>
  <span class="eyebrow">เลือกแล้วเกิดอะไรขึ้น</span>
  <h2 class="disp">เปลี่ยนแค่ลำดับของ ไม่ได้เปลี่ยนสิทธิ์</h2>
  <div class="three">
    <div class="box"><b class="disp">🧭 ได้ลำดับที่แนะนำ</b>
      <p>สามก้าวถัดไปที่เรียงมาให้แล้ว ว่าควรเริ่มตรงไหนแล้วไปต่อยังไง
      ทำอันไหนแล้วมันจะติ๊กเขียวให้เอง</p></div>
    <div class="box"><b class="disp">🃏 ขึ้นบนการ์ดประจำตัว</b>
      <p>การ์ดของคุณจะพิมพ์สายที่เลือกไว้ให้อัตโนมัติ พร้อมสีประจำสาย
      เปลี่ยนสายทีหลังการ์ดก็เปลี่ยนตาม</p></div>
    <div class="box"><b class="disp">🔓 ไม่มีอะไรถูกล็อก</b>
      <p>ทุกห้องยังเข้าได้เหมือนเดิมทั้งหมด ไม่ว่าจะเลือกสายไหน
      หรือไม่เลือกเลยก็ตาม</p></div>
  </div>
  <div class="note"><b>สายคืออะไร:</b> เป็นแค่ป้ายที่เราใช้จัดของให้ตรงคน
  ไม่ใช่ระดับ ไม่ใช่การสอบ และไม่มีสายไหนดีกว่าสายไหน
  สิ่งที่เลือกไว้เก็บอยู่ในเครื่องของคุณเองล้วน ไม่ได้ส่งไปไหน</div>
</div></section>

<footer>
  <p>🍀 myclover.com · Good Luck, Have Fun</p>
  <p style="margin-top:6px"><a href="../">กลับหน้าบ้าน</a> · <a href="../card/">ทำการ์ด</a> ·
     <a href="../classroom/">ห้องเรียน AI</a> · <a href="../forge/">การ์ตูน</a></p>
</footer>'''

    css = f':root{{--ac:{hex_rgb("#1B6A42")}}}\n' + PATH_CSS
    return page('เลือกสายของคุณ | myclover',
                'สี่สายของบ้าน myclover — สายคิด สายกิน สายคลีน สายประดิษฐ์ '
                'เลือกแล้วเราจะหยิบของที่ตรงกับคุณมาวางให้ พร้อมลำดับที่แนะนำ',
                f'{SITE}/img/og-home.jpg', body, css, '',
                canonical=f'<link rel="canonical" href="{SITE}/paths/">\n')


PDEST = os.path.join(ROOT, 'paths')
os.makedirs(PDEST, exist_ok=True)
open(os.path.join(PDEST, 'index.html'), 'w', encoding='utf-8').write(paths_index())
for p in PATHS:
    d = os.path.join(PDEST, p['slug'])
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(path_page(p))

print(f'สร้างหน้าสาย {len(PATHS)+1} หน้า')


# ─────────────────────────────────────────────────────────────
# _redirects — ลิงก์ตอนเก่าที่คนแชร์ไว้ต้องยังเปิดได้
# Cloudflare Pages อ่านไฟล์นี้เอง ไม่ต้องตั้งอะไรเพิ่ม
# ─────────────────────────────────────────────────────────────
lines = ['# สร้างอัตโนมัติจาก tools/build.py — อย่าแก้ไฟล์นี้ตรง ๆ',
         '# ตอนการ์ตูนถูกเรียงเลขใหม่เป็น 1–12 ลิงก์เดิมพามาที่ตอนเดียวกัน', '']
lines += [f'/forge/{o}/{" " * max(1, 38 - len(o))}/forge/{n}/  301' for o, n in OLD_TO_NEW]
lines += ['', '# หน้าลงทะเบียนถูกรวมเข้าหน้าทำการ์ดแล้ว',
          '/register/*                              /card/#register  301', '']
open(os.path.join(ROOT, '_redirects'), 'w', encoding='utf-8').write('\n'.join(lines))
print('เขียน _redirects แล้ว')
