from pathlib import Path
import re
import subprocess

OLD = "90d962423d4d7d6456ad8ef765b946daf17a4ab6"


def old_text(path: str) -> str:
    return subprocess.check_output(["git", "show", f"{OLD}:{path}"], text=True)


def remove_balanced_div(text: str, class_name: str, required: bool = True):
    op = re.search(
        r'<div\b[^>]*class=["\'][^"\']*\b' + re.escape(class_name) + r'\b[^"\']*["\'][^>]*>',
        text,
        re.I,
    )
    if not op:
        if required:
            raise RuntimeError(f"missing div.{class_name}")
        return text, 0
    token = re.compile(r"<div\b[^>]*>|</div\s*>", re.I)
    depth = 0
    for m in token.finditer(text, op.start()):
        if m.group(0).lower().startswith("<div"):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                a, b = op.start(), m.end()
                while a > 0 and text[a - 1] in " \t":
                    a -= 1
                if a > 0 and text[a - 1] == "\n":
                    a -= 1
                while b < len(text) and text[b] in " \t":
                    b += 1
                if b < len(text) and text[b] == "\n":
                    b += 1
                return text[:a] + text[b:], 1
    raise RuntimeError(f"unbalanced div.{class_name}")


def old_header_parts(path: str, lesson: int):
    old = old_text(path)
    style = re.search(
        r'<style id="classroom-lesson-header-image-style">.*?</style>', old, re.S | re.I
    )
    figure = re.search(
        r'<figure class="classroom-lesson-header-image">\s*'
        r'<img\s+src="/classroom/img/header-lesson'
        + str(lesson)
        + r'\.jpeg"[^>]*>\s*</figure>',
        old,
        re.S | re.I,
    )
    if not style or not figure:
        raise RuntimeError(f"{path}: historical lesson image block missing")
    return style.group(0), figure.group(0)


def restore_connected_lesson_art():
    # The raster illustration is the card-connected artwork the user wants to keep.
    # Remove the older artwork below/around it instead.
    pages = [
        (2, "classroom/image-ai.html", "hero-stage"),
        (3, "classroom/clip-ai.html", "hero-stage"),
        (4, "classroom/notebooklm.html", None),
        (5, "classroom/prompts.html", "heroimg"),
    ]
    for lesson, path, old_art in pages:
        p = Path(path)
        text = p.read_text(encoding="utf-8")
        text = re.sub(
            r'\s*<style id="classroom-lesson-header-image-style">.*?</style>\s*',
            "\n",
            text,
            flags=re.S | re.I,
        )
        text = re.sub(
            r'\s*<figure class="classroom-lesson-header-image">.*?</figure>\s*',
            "\n",
            text,
            flags=re.S | re.I,
        )
        style, figure = old_header_parts(path, lesson)
        if "</head>" not in text:
            raise RuntimeError(f"{path}: missing </head>")
        text = text.replace("</head>", style + "\n</head>", 1)
        head = re.search(
            r'<header\b[^>]*class=["\'][^"\']*\bhead\b[^"\']*["\'][^>]*>',
            text,
            re.I,
        )
        if not head:
            raise RuntimeError(f"{path}: missing header.head")
        text = text[: head.end()] + "\n  " + figure + "\n" + text[head.end() :]
        if old_art:
            text, n = remove_balanced_div(text, old_art)
            if n != 1:
                raise RuntimeError(f"{path}: could not remove old {old_art}")
        p.write_text(text, encoding="utf-8")


def section_containing(text: str, marker: str):
    pos = text.find(marker)
    if pos < 0:
        raise RuntimeError(f"section marker missing: {marker}")
    starts = [m for m in re.finditer(r"<section\b[^>]*>", text, re.I) if m.start() < pos]
    if not starts:
        raise RuntimeError("section start missing")
    start = starts[-1].start()
    token = re.compile(r"<section\b[^>]*>|</section\s*>", re.I)
    depth = 0
    for m in token.finditer(text, start):
        if m.group(0).lower().startswith("<section"):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return start, m.end()
    raise RuntimeError("unbalanced section")


SMART_SECTION = '''<section class="block smart-resume-workflow" id="smart-resume">
  <div class="section-head"><div><span class="ey">SERVE · SMART RESUME</span><h2>ทำ Smart Resume จากซอสให้เสร็จใน 3 Step</h2><p>ใช้ไฟล์ชีวิตชุดเดิมจากบท 2 ไม่ต้องกรอกประวัติใหม่อีกรอบ ให้ AI อ่านซอสก่อน แล้วค่อยประกอบเป็นหน้า HTML ที่สลับดูเรื่องงานกับเรื่องชีวิตได้</p></div></div>

  <div class="source-warning"><b>⚠️ อย่าลืมแนบซอส (.md)</b><br>ใช้ไฟล์เดียวกับที่ใช้ทำ <b>“โปสเตอร์หนังชีวิต” ในบท 2</b> แนบไปพร้อม Prompt ด้านล่างทุกครั้ง ถ้ายังไม่มีไฟล์ ให้กลับไปทำบท 2 ก่อน — งานนี้ห้ามให้ AI เดาประวัติแทนคุณ</div>
  <div class="smart-actions"><a class="btn alt" href="image-ai.html">← กลับไปบท 2 · หยิบซอสชีวิต</a><a class="btn alt" href="/resume/first-version/" target="_blank" rel="noopener">ดูตัวอย่าง Smart Resume →</a></div>

  <div class="smart-steps">
    <article class="smart-step">
      <div class="step-no">1</div>
      <div class="step-body">
        <h3>วางโครง Smart Resume จากซอส</h3>
        <p>แนบ <code>.md</code> แล้วใช้ Prompt นี้ก่อน ยังไม่ต้องเขียนโค้ด เป้าหมายคือให้ AI จัดว่าข้อมูลอะไรอยู่ฝั่ง <b>WORK</b> และอะไรอยู่ฝั่ง <b>LIFE</b></p>
        <div class="prompt-card"><button class="copy-smart" type="button" data-copy-target="smartPrompt1">คัดลอก Prompt</button><pre id="smartPrompt1">อ่านไฟล์ Source / ซอส .md ที่แนบมา แล้วช่วยวางโครงสร้าง “Smart Resume” แบบหน้าเดียวให้ฉันก่อน โดยยังไม่ต้องเขียนโค้ด

เป้าหมายของหน้า:
- มี 2 มุมที่กดสลับได้ชัดเจน: WORK และ LIFE
- WORK ใช้เล่าเรื่องการงาน เช่น บทบาท ประสบการณ์ ทักษะ โปรเจกต์ ผลงาน หรือผลลัพธ์ เฉพาะที่ Source มีข้อมูลรองรับ
- LIFE ใช้เล่าเรื่องตัวตน ความสนใจ ไลฟ์สไตล์ คุณค่า กิจวัตร หรือสิ่งที่ให้ความสำคัญ เฉพาะที่ Source มีข้อมูลรองรับ
- ไม่จำเป็นต้องใช้หัวข้อครบทุกข้อ ถ้า Source ไม่มี ให้ตัดส่วนนั้นออกหรือเว้นไว้ ห้ามเดา ห้ามแต่ง ห้ามเติมความสำเร็จเอง
- ข้อมูลชุดเดียวกันที่เหมาะกับทั้งสองมุมสามารถใช้ร่วมกันได้ แต่ไม่ต้องเขียนซ้ำโดยไม่จำเป็น

รูปแบบที่อยากได้:
- hierarchy อ่านง่ายบนมือถือและจอใหญ่
- ใช้ card / table / timeline เฉพาะเมื่อช่วยให้ข้อมูลอ่านง่ายจริง
- WORK และ LIFE มีบุคลิกต่างกันเล็กน้อยแต่ยังเป็นเว็บเดียวกัน
- ปุ่มสลับมี transition ที่ดูดีและไม่รบกวนการอ่าน
- รองรับ prefers-reduced-motion

ตอบกลับเป็น Blueprint ก่อน โดยบอก:
1. ข้อมูลที่พบจริงใน Source
2. โครง WORK
3. โครง LIFE
4. ข้อมูลที่ Source ไม่มีและคุณจะไม่เดา
5. Layout และ interaction ที่จะใช้</pre></div>
      </div>
    </article>

    <article class="smart-step">
      <div class="step-no">2</div>
      <div class="step-body">
        <h3>ทำ <code>index.html</code> ตามซอสนี้</h3>
        <p>เมื่อโครงโอเค ใช้ Prompt นี้ในแชตเดิมพร้อมซอสเดิม แล้วขอไฟล์เดียวเปิดได้ทันที</p>
        <div class="prompt-card"><button class="copy-smart" type="button" data-copy-target="smartPrompt2">คัดลอก Prompt</button><pre id="smartPrompt2">จาก Blueprint ที่เราตกลงกัน และ Source / ซอส .md ที่แนบอยู่ สร้างไฟล์ index.html ของ Smart Resume ให้เสร็จสมบูรณ์

กติกาหลัก:
- self-contained ไฟล์เดียว: HTML + CSS + JavaScript อยู่ใน index.html
- เปิดด้วยเบราว์เซอร์ได้ทันทีโดยไม่ต้องติดตั้งอะไร
- มีปุ่ม WORK / LIFE ที่กดสลับเนื้อหาได้จริง
- ใช้เฉพาะข้อเท็จจริงที่มีใน Source เท่านั้น ห้ามเดา ห้ามแต่ง ห้ามเติม placeholder เป็นประวัติจริง
- ถ้าข้อมูลส่วนไหนไม่มี ให้ตัด section นั้นออก ไม่ต้องพยายามทำให้ดูครบ
- ถ้ามี link ให้ใช้เฉพาะ link ที่ Source ให้มา
- responsive ทั้งมือถือและ desktop
- card, table และ timeline ต้องไม่ล้นจอ
- transition ลื่น ดูเรียบร้อย และรองรับ prefers-reduced-motion
- ใช้ semantic HTML และปุ่มที่ใช้งานด้วย keyboard ได้
- ไม่ต้องใช้ framework หรือ dependency ภายนอกถ้าไม่จำเป็น

ส่งกลับเป็นโค้ด index.html ฉบับเต็มเพียงไฟล์เดียว พร้อมใช้งาน</pre></div>
      </div>
    </article>

    <article class="smart-step">
      <div class="step-no">3</div>
      <div class="step-body">
        <h3>Checklist ก่อนเสิร์ฟ</h3>
        <p>เปิดไฟล์จริงแล้วเช็กทีละข้อ อย่าตัดสินจากหน้าตาอย่างเดียว</p>
        <ul class="checklist smart-checklist">
          <li><label><input type="checkbox"> <code>index.html</code> เปิดได้ด้วยเบราว์เซอร์โดยตรง</label></li>
          <li><label><input type="checkbox"> ปุ่ม WORK / LIFE สลับข้อมูลได้จริง</label></li>
          <li><label><input type="checkbox"> ทุกข้อมูลย้อนกลับไปหาในซอสได้ ไม่มีประวัติที่ AI แต่งเพิ่ม</label></li>
          <li><label><input type="checkbox"> ส่วนที่ซอสไม่มีข้อมูลถูกตัดออกหรือเว้นไว้ ไม่เดาเอง</label></li>
          <li><label><input type="checkbox"> มือถืออ่านง่าย ตาราง การ์ด และข้อความไม่ล้นจอ</label></li>
          <li><label><input type="checkbox"> Transition ดูดี แต่เมื่อเปิด Reduced Motion แล้วยังใช้งานได้ครบ</label></li>
          <li><label><input type="checkbox"> ไม่มี API key รหัสผ่าน หรือข้อมูลลับติดอยู่ในไฟล์</label></li>
        </ul>
      </div>
    </article>
  </div>

  <div class="legacy-smart-resume-compat" hidden aria-hidden="true"><input id="pageName"><input id="pageDesc"><input id="pageColor" value="#1b6a42"><input id="pageCta"><button id="starter-js" type="button"></button><button id="starter-copy" type="button"></button><textarea id="template"></textarea></div>
</section>'''


TLDR = '''
<section class="serve-tldr" id="serveTldr" aria-label="สรุปบทเรียน">
  <div class="serve-tldr-main">
    <span class="ey">TL;DR · งานวันนี้</span>
    <h2>ซอสชีวิต 1 ไฟล์ → Smart Resume 1 หน้า</h2>
    <p>แนบ <code>.md</code> เดิมจากบท 2 ให้ AI วางโครง WORK / LIFE ก่อน แล้วค่อยสร้าง <code>index.html</code> ไฟล์เดียว เปิดเช็กข้อมูลจริง และค่อยเสิร์ฟให้คนอื่นดู</p>
  </div>
  <div class="serve-tldr-side">
    <span class="ey">ของกลับบ้าน</span>
    <div class="take-home"><span>🧴 ซอสชีวิต .md ชุดเดิม</span><span>🧭 Blueprint WORK / LIFE</span><span>📄 Smart Resume index.html</span><span>✅ Checklist ก่อนเสิร์ฟ</span></div>
  </div>
</section>'''


SMART_STYLE = '''
<style id="lesson6-smart-resume-style">
.serve-tldr{display:grid;grid-template-columns:1.35fr .85fr;gap:14px;margin:20px 0 24px}.serve-tldr>div{padding:22px;border:1px solid rgba(18,40,28,.11);border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(10,40,24,.06)}.serve-tldr h2{margin:6px 0 8px;font-size:clamp(22px,3vw,31px);line-height:1.18}.serve-tldr p{margin:0;color:#59655e}.take-home{display:grid;gap:8px;margin-top:10px}.take-home span{display:block;padding:9px 11px;border-radius:12px;background:rgba(27,106,66,.07);font-weight:750}
.smart-resume-workflow{overflow:hidden}.smart-resume-workflow .section-head{margin-bottom:16px}.source-warning{margin:16px 0;padding:16px 18px;border:1px solid rgba(184,86,53,.30);border-radius:16px;background:rgba(184,86,53,.08);line-height:1.65}.smart-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.smart-steps{display:grid;gap:16px}.smart-step{display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;padding:19px;border:1px solid rgba(18,40,28,.1);border-radius:20px;background:linear-gradient(145deg,#fff,#fbfaf5);box-shadow:0 10px 30px rgba(10,40,24,.05)}.step-no{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#133b28;color:#fff;font-size:20px;font-weight:900}.step-body h3{margin:2px 0 6px;font-size:21px}.step-body>p{margin:0 0 12px;color:#667168}.prompt-card{position:relative;margin-top:12px;padding-top:48px;border-radius:16px;background:#071a10;color:#f4f2e9;overflow:hidden}.prompt-card pre{margin:0;padding:0 17px 18px;white-space:pre-wrap;overflow-wrap:anywhere;font:500 13.5px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#edf4ee}.copy-smart{position:absolute;right:10px;top:10px;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.09);color:#fff;padding:8px 11px;font-weight:800;cursor:pointer}.copy-smart:hover{background:rgba(255,255,255,.16)}.smart-checklist{margin-top:12px}.smart-checklist li{padding:9px 0}.smart-checklist label{cursor:pointer}.smart-checklist input{accent-color:#1b6a42}
@media(max-width:680px){.serve-tldr{grid-template-columns:1fr}.smart-step{grid-template-columns:1fr}.step-no{width:38px;height:38px}.prompt-card pre{font-size:12.5px}.hero-grid{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){.smart-resume-workflow *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>
'''


SMART_JS = '''
<script id="lesson6-smart-resume-js">
document.addEventListener('click',async function(e){
  const b=e.target.closest('.copy-smart');if(!b)return;
  const el=document.getElementById(b.dataset.copyTarget);if(!el)return;
  const text=el.textContent.trim();let ok=false;
  try{await navigator.clipboard.writeText(text);ok=true}catch(err){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(_){ok=false}ta.remove()}
  const old=b.textContent;b.textContent=ok?'คัดลอกแล้ว ✓':'เลือกข้อความแล้วคัดลอก';setTimeout(()=>b.textContent=old,1600);
});
</script>
'''


def patch_lesson6():
    p = Path("classroom/first-web.html")
    text = p.read_text(encoding="utf-8")
    old = old_text("classroom/first-web.html")

    # Restore the chef/steak SVG hero exactly; remove the separate raster frame.
    historical_hero = re.search(r'<header class="hero">.*?</header>', old, re.S | re.I)
    if not historical_hero:
        raise RuntimeError("lesson6: historical chef hero missing")
    text, n = re.subn(
        r'<header class="hero">.*?</header>',
        lambda _: historical_hero.group(0),
        text,
        count=1,
        flags=re.S | re.I,
    )
    if n != 1:
        raise RuntimeError("lesson6: current hero missing")
    text = re.sub(r'\s*<style id="lesson6-header-card-sync">.*?</style>\s*', "\n", text, flags=re.S | re.I)
    text = re.sub(r'\s*<style id="classroom-lesson-header-image-style">.*?</style>\s*', "\n", text, flags=re.S | re.I)

    # Restore the original 2-column chef layout rule.
    old_grid = re.search(r"\.hero-grid\{[^{}]*\}", old, re.I)
    cur_grid = re.search(r"\.hero-grid\{[^{}]*\}", text, re.I)
    if not old_grid or not cur_grid:
        raise RuntimeError("lesson6: hero-grid css missing")
    text = text[: cur_grid.start()] + old_grid.group(0) + text[cur_grid.end() :]

    # Existing explanatory content stays; only hide the old chapter numbers.
    for number in ("1", "2", "4", "5"):
        text, n = re.subn(r'<span class="num">' + number + r"</span>", "", text, count=1)
        if n != 1:
            raise RuntimeError(f"lesson6: heading number {number} missing")

    # Replace only the old section 3 workflow.
    start, end = section_containing(text, "สูตรทำเมนคอร์ส: ซอส → HTML")
    text = text[:start] + SMART_SECTION + text[end:]

    # Lesson-2-style summary directly after hero.
    hero_start = text.find('<header class="hero">')
    hero_end = text.find("</header>", hero_start)
    if hero_start < 0 or hero_end < 0:
        raise RuntimeError("lesson6: hero bounds missing")
    hero_end += len("</header>")
    text = text[:hero_end] + TLDR + text[hero_end:]

    text = text.replace("</head>", SMART_STYLE + "\n</head>", 1)
    text = text.replace("</body>", SMART_JS + "\n</body>", 1)
    p.write_text(text, encoding="utf-8")


def assert_result():
    pages = [
        (2, "classroom/image-ai.html", "hero-stage"),
        (3, "classroom/clip-ai.html", "hero-stage"),
        (4, "classroom/notebooklm.html", None),
        (5, "classroom/prompts.html", "heroimg"),
    ]
    for lesson, path, old_art in pages:
        text = Path(path).read_text(encoding="utf-8")
        if text.count(f"/classroom/img/header-lesson{lesson}.jpeg") != 1:
            raise RuntimeError(f"{path}: connected lesson image must occur exactly once")
        if text.count('<figure class="classroom-lesson-header-image">') != 1:
            raise RuntimeError(f"{path}: connected figure missing/duplicated")
        if text.count('id="classroom-lesson-header-image-style"') != 1:
            raise RuntimeError(f"{path}: connected-image style missing/duplicated")
        if old_art == "hero-stage" and re.search(r'<div\b[^>]*class=["\'][^"\']*\bhero-stage\b', text, re.I):
            raise RuntimeError(f"{path}: wrong old hero-stage still visible")
        if old_art == "heroimg" and re.search(r'<div\b[^>]*class=["\'][^"\']*\bheroimg\b', text, re.I):
            raise RuntimeError(f"{path}: wrong old heroimg still visible")

    text = Path("classroom/first-web.html").read_text(encoding="utf-8")
    required = [
        '<div class="hero-art"',
        "steakTitle",
        "Smart Resume",
        "WORK",
        "LIFE",
        "อย่าลืมแนบซอส (.md)",
        "โปสเตอร์หนังชีวิต",
        "TL;DR · งานวันนี้",
        "ของกลับบ้าน",
        "GitHub Pages",
        "OPTIONAL",
        'data-copy-target="smartPrompt1"',
        'data-copy-target="smartPrompt2"',
        "Checklist ก่อนเสิร์ฟ",
    ]
    for needle in required:
        if needle not in text:
            raise RuntimeError(f"lesson6 missing required content: {needle}")
    if "/classroom/img/header-lesson6.jpeg" in text:
        raise RuntimeError("lesson6: wrong separate raster frame still exists")
    for number in ("1", "2", "4", "5"):
        if f'<span class="num">{number}</span>' in text:
            raise RuntimeError(f"lesson6: old heading {number} still numbered")
    if text.count('id="serveTldr"') != 1:
        raise RuntimeError("lesson6: TLDR missing/duplicated")
    if text.count('id="lesson6-smart-resume-style"') != 1:
        raise RuntimeError("lesson6: smart style missing/duplicated")
    if text.count('<section class="block smart-resume-workflow"') != 1:
        raise RuntimeError("lesson6: Smart Resume workflow missing/duplicated")


restore_connected_lesson_art()
patch_lesson6()
assert_result()
print("OK: classroom visual correction + lesson 6 Smart Resume patch validated")
