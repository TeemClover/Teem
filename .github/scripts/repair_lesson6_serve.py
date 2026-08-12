from pathlib import Path
import re

path = Path('classroom/first-web.html')
s = path.read_text(encoding='utf-8')
original = s

STYLE = r'''<style id="lesson6-smart-resume-style">
.serve-tldr{display:grid;grid-template-columns:1.35fr .85fr;gap:14px;margin:20px 0 24px}.serve-tldr>div{padding:22px;border:1px solid rgba(18,40,28,.11);border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(10,40,24,.06)}.serve-tldr h2{margin:6px 0 8px;font-size:clamp(22px,3vw,31px);line-height:1.18}.serve-tldr p{margin:0;color:#59655e}.take-home{display:grid;gap:8px;margin-top:10px}.take-home span{display:block;padding:9px 11px;border-radius:12px;background:rgba(27,106,66,.07);font-weight:750}
.smart-resume-workflow{overflow:hidden}.smart-resume-workflow .section-head{margin-bottom:16px}.source-warning{margin:12px 0 14px;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgba(153,25,25,.08)}.source-warning strong,.source-warning b{color:#a31717}.source-warning code{background:rgba(163,23,23,.08);padding:1px 5px;border-radius:5px}.smart-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 18px}.smart-steps{display:grid;gap:12px;margin-top:14px}.smart-step{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;padding:18px;border:1px solid rgba(18,40,28,.1);border-radius:17px;background:#fff;box-shadow:0 9px 26px rgba(18,40,28,.05)}.step-no{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgb(var(--green));color:#fff;font-weight:850}.step-body h3{font-family:"Bai Jamjuree",sans-serif;font-size:18px;line-height:1.4}.step-body>p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important;line-height:1.65!important}.prompt-card{position:relative;margin-top:12px;min-height:130px;padding:48px 14px 54px;border:1px solid rgba(190,148,66,.24);border-radius:14px;background:#06180f;color:#d8f4e2;overflow:hidden}.prompt-copy{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font:500 13px/1.72 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#d8f4e2}.prompt-card[data-prompt-collapse]:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden}.prompt-card:not([data-prompt-collapse]){min-height:unset;padding-bottom:18px}.copy-smart{position:absolute;right:14px;top:10px;z-index:2;border:1px solid rgba(215,245,226,.3);border-radius:8px;padding:5px 10px;background:rgba(255,255,255,.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif!important;font-size:11px!important;line-height:1.35!important;font-weight:700!important;cursor:pointer}.copy-smart:hover,.prompt-expand:hover{background:rgba(255,255,255,.13)}.prompt-expand{position:absolute;left:14px;bottom:10px;z-index:2;border:1px solid rgba(215,245,226,.3);border-radius:8px;padding:5px 10px;background:rgba(255,255,255,.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif!important;font-size:11px!important;line-height:1.35!important;font-weight:700!important;cursor:pointer}.smart-checklist{margin-top:12px}.smart-checklist li{padding:9px 0}.smart-checklist label{cursor:pointer}.smart-checklist input{accent-color:#1b6a42}
@media(max-width:680px){.serve-tldr{grid-template-columns:1fr}.smart-step{grid-template-columns:32px minmax(0,1fr);padding:16px 14px}.step-no{width:32px;height:32px}.prompt-copy{font-size:12.5px}.hero-grid{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){.smart-resume-workflow *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>'''
s, n = re.subn(r'<style id="lesson6-smart-resume-style">.*?</style>', STYLE, s, count=1, flags=re.S)
assert n == 1, f'style replace={n}'

TLDR = r'''<section class="serve-tldr" id="serveTldr" aria-label="สรุปบทเรียน">
  <div class="serve-tldr-main">
    <span class="ey">TL;DR · งานวันนี้</span>
    <h2>ประวัติที่ AI รู้จัก → ซอส .md → Smart Resume</h2>
    <p>เริ่มใน AI ที่รู้จักคุณที่สุด ให้มันรวบรวมเฉพาะข้อมูลที่เปิดสาธารณะได้และฝังคำสั่งสร้างเว็บทั้งหมดลงใน <code>.md</code> จากนั้นเปิดแชทใหม่ แนบไฟล์ แล้วสั่งสั้น ๆ ว่า <b>“ทำเวปตามซอสนี้”</b></p>
  </div>
  <div class="serve-tldr-side">
    <span class="ey">ของกลับบ้าน</span>
    <div class="take-home"><span>🧴 Smart Resume Source .md</span><span>🌓 โครง WORK / LIFE ในซอส</span><span>📄 Smart Resume index.html</span><span>✅ Public-safe Checklist</span></div>
  </div>
</section>'''
s, n = re.subn(r'<section class="serve-tldr" id="serveTldr".*?</section>', TLDR, s, count=1, flags=re.S)
assert n == 1, f'tldr replace={n}'

PROMPT1 = r'''สกัดข้อมูลเกี่ยวกับฉันจากบริบททั้งหมดที่ AI ตัวนี้เข้าถึงได้จริง แล้วสร้างเป็น Source / ซอส ไฟล์ Markdown (.md) ที่พร้อมใช้สร้าง “Smart Resume” แบบ Single-file HTML ได้ทันที โดยคำสั่งสำหรับสร้างเว็บทั้งหมดต้องถูกรวมอยู่ในไฟล์ .md นี้แล้ว

แหล่งข้อมูลที่ให้สำรวจ:
- ใช้บทสนทนาปัจจุบันเป็นฐาน
- ถ้าระบบนี้มี Memory, โปรไฟล์, Personal Context หรือประวัติแชทอื่นของบัญชีนี้ที่ระบบเข้าถึงได้จริง ให้ค้นและรวบรวมข้อมูลเกี่ยวกับฉันจากบริบทเหล่านั้นด้วย เพื่อให้ Source รู้จักเจ้าของมากที่สุด
- ถ้าระบบเข้าถึงแชทอื่นไม่ได้ ห้ามอ้างว่าเข้าถึงได้ และห้ามแต่งข้อมูลมาชดเชย
- ถ้าข้อมูลขัดกัน ให้ยึดข้อมูลล่าสุดที่เจ้าของระบุหรือแก้ไขเอง ถ้ายังยืนยันไม่ได้ให้ตัดออก

PUBLIC-SAFE FILTER — สำคัญมาก:
- ใส่เฉพาะข้อมูลที่เหมาะสำหรับเปิดบนเว็บไซต์สาธารณะ
- ห้ามใส่รหัสผ่าน, API key, token, เลขบัตร, เลขบัญชี, ที่อยู่บ้าน, ข้อมูลสุขภาพหรือการเงินส่วนตัว, ข้อมูลลูกค้า/บริษัทที่เป็นความลับ หรือข้อมูลของบุคคลอื่นที่ไม่ควรเผยแพร่
- เบอร์โทร อีเมลส่วนตัว ที่อยู่ และข้อมูลครอบครัว ให้ใส่เฉพาะเมื่อบริบทระบุชัดว่าเจ้าของใช้เปิดเผยต่อสาธารณะอยู่แล้ว
- ถ้าไม่แน่ใจว่าข้อมูลใดควรเปิดสาธารณะ ให้ตัดออกจาก Source โดยไม่ต้องใส่ค่าจริงไว้แม้ในหัวข้อ “ห้ามใช้”
- ใช้เฉพาะข้อเท็จจริงที่มีหลักฐานจากบริบท ห้ามเดา ห้ามขยายความสำเร็จ ห้ามสร้างตำแหน่ง ปี ตัวเลข ลูกค้า รางวัล หรือผลงานเพิ่มเอง

สร้างไฟล์ .md ตามโครงนี้:

# Smart Resume Source
> เอกสารนี้คือ “ซอส” สำหรับสร้าง Smart Resume ของเจ้าของข้อมูล เมื่อแนบไฟล์นี้ให้ AI แล้วสั่งเพียง “ทำเวปตามซอสนี้” ให้ทำตาม BUILD DIRECTIVE ด้านล่างทันที

## 0. BUILD DIRECTIVE — คำสั่งที่ต้องใช้สร้าง index.html
- สร้างไฟล์ `index.html` ฉบับเต็มเพียงไฟล์เดียว พร้อมใช้งานทันที
- Self-contained: HTML + CSS + JavaScript ที่จำเป็นอยู่ในไฟล์เดียว ไม่ใช้ Framework หรือ dependency ภายนอกถ้าไม่จำเป็น
- เปิดไฟล์ด้วย Browser ได้โดยตรง และ Responsive ทั้งมือถือ Tablet และ Desktop
- หน้าเป็น Smart Resume ที่มีมุม WORK และ LIFE ให้ผู้ใช้กดสลับได้จริง ถ้าข้อมูลบางหมวดไม่มี ให้ตัด section นั้นออก ห้ามสร้างข้อมูลเติมให้ครบ
- WORK ใช้เล่าเฉพาะบทบาท ประสบการณ์ ทักษะ โปรเจกต์ ผลงาน ผลลัพธ์ และ Timeline ที่ Source รองรับ
- LIFE ใช้เล่าเฉพาะตัวตน ความสนใจ คุณค่า ไลฟ์สไตล์ เรื่องราว หรือสิ่งที่ให้ความสำคัญที่ Source รองรับ
- ใช้ Hero, Card, Table, Timeline, Tag, Quote หรือองค์ประกอบอื่นเฉพาะเมื่อช่วยให้ข้อมูลจริงอ่านง่ายขึ้น ไม่ทำกล่องเพราะอยากให้ดูเยอะ
- ถ้ามีภาพหรือ Public URL ที่ Source อนุญาตให้ใช้ จึงค่อยใช้ ถ้าไม่มี ห้ามสร้างรูปบุคคลปลอมขึ้นมาแทนเจ้าของ
- ถ้ามี Link ให้ใช้เฉพาะ Link ที่ Source ระบุว่าเผยแพร่ได้
- มี Visual hierarchy ชัด อ่านง่าย ตัวหนังสือไม่เล็ก ปุ่มกดง่าย และองค์ประกอบไม่ล้นจอ
- Transition ลื่นและเรียบร้อย แต่ต้องรองรับ `prefers-reduced-motion`
- ใช้ Semantic HTML, Keyboard navigation, Focus state และ Contrast ที่อ่านได้
- ห้ามมี Tracker, API key, Credential, Backend form หรือการส่งข้อมูลออกจากเครื่องโดยที่ Source ไม่ได้สั่ง
- ห้ามใส่ Placeholder ที่ดูเหมือนข้อเท็จจริงจริง ถ้าไม่มีข้อมูลให้ตัดส่วนนั้นออก
- ชื่อ ตำแหน่ง ปี ตัวเลข ผลงาน และ Claim ทุกอย่างต้องย้อนกลับมาหา Source นี้ได้
- เลือกภาษาและน้ำเสียงตามข้อมูลเจ้าของ ถ้าภาษาไทยเป็นหลักให้ใช้ `lang="th"`
- ตั้ง `<title>` และ meta description จากข้อมูล Public-safe ที่มีจริง
- ส่งกลับเป็นโค้ด `index.html` ฉบับเต็มในครั้งเดียว พร้อมใช้งาน ไม่ถามคำถามเพิ่มก่อนสร้าง

## 1. PUBLIC IDENTITY — เจ้าของคือใคร
สรุปชื่อที่ใช้สาธารณะ บทบาทปัจจุบัน คำอธิบายตัวเองแบบสั้น พื้นที่ความเชี่ยวชาญ และบริบทที่คนทั่วไปควรรู้ โดยใช้เฉพาะข้อมูลที่เปิดเผยได้

## 2. WORK — เรื่องงาน
รวบรวมเฉพาะข้อมูลจริงที่มี เช่น บทบาท งานที่ทำ ทักษะ วิธีทำงาน โปรเจกต์ ผลงาน ผลลัพธ์ ประสบการณ์ จุดเปลี่ยน และ Timeline พร้อมปี/ตัวเลขเฉพาะที่ยืนยันได้

## 3. LIFE — เรื่องชีวิตและตัวตน
รวบรวมความสนใจ งานอดิเรก คุณค่า วิธีคิด ไลฟ์สไตล์ เรื่องราวหรือจุดเปลี่ยนที่เจ้าของเคยเล่า และสิ่งที่ช่วยให้คนรู้จักตัวตนมากขึ้น โดยคัดเฉพาะเรื่องที่เหมาะกับการเปิดสาธารณะ

## 4. CURRENT FOCUS — ตอนนี้กำลังทำอะไร
สรุปสิ่งที่กำลังสร้าง เป้าหมายปัจจุบัน โปรเจกต์ที่กำลังเดิน และทิศทางถัดไป เฉพาะข้อมูลล่าสุดที่มีจริง

## 5. PROOF / PROJECTS / ACHIEVEMENTS
รายการผลงาน โปรเจกต์ รางวัล ตัวเลข หรือหลักฐานที่ใช้บนหน้าได้ พร้อมบริบทสั้น ๆ ห้ามใส่รายการที่ยืนยันจากข้อมูลไม่ได้

## 6. VOICE & PERSONALITY
สรุปน้ำเสียง วิธีพูด บุคลิก คำที่ชอบ/ไม่ชอบ และพลังงานที่หน้าเว็บควรถ่ายทอด โดยแยกให้ชัดว่าอะไรเป็นข้อมูลที่เห็นจากบทสนทนา ไม่ตีความเป็นข้อเท็จจริงส่วนบุคคลเกินหลักฐาน

## 7. VISUAL DIRECTION
สรุปสี บรรยากาศ สไตล์ ความเรียบ/ความสนุก องค์ประกอบที่เหมาะกับเจ้าของ รวมถึงสิ่งที่ไม่ควรใช้ ถ้าบริบทไม่มีข้อมูล ให้ใช้แนวทางกลาง ๆ ที่อ่านง่ายและไม่สร้างข้อเท็จจริงใหม่

## 8. PUBLIC LINKS & CONTACT
ใส่เฉพาะเว็บไซต์ Social Profile Portfolio หรือช่องทางติดต่อที่บริบทระบุว่าเป็น Public อยู่แล้ว ถ้าไม่มีให้เว้นหัวข้อนี้ ไม่เดา URL

## 9. CONTENT MAP — โครงหน้า Smart Resume
ออกแบบลำดับเนื้อหาจากข้อมูลที่มีจริง ระบุว่าอะไรอยู่ Hero, WORK, LIFE, Timeline, Projects, Proof, Now/Next, Contact และอะไรควรใช้ร่วมกันสองมุม โดยไม่สร้าง section ที่ไม่มีข้อมูล

## 10. INTERACTION RECIPE
กำหนดพฤติกรรม WORK / LIFE toggle, Navigation, Card/Timeline interaction, Transition, Mobile behavior, Keyboard และ Reduced Motion ให้พร้อมนำไปสร้างหน้าได้ทันที

## 11. DO NOT INVENT / DO NOT PUBLISH
เขียนเป็น “กติกา” และ “หมวดข้อมูลที่ตั้งใจไม่ใช้” เท่านั้น ห้ามคัดลอกค่าข้อมูลลับจริงมาเก็บไว้ในหัวข้อนี้

## 12. FINAL QA BEFORE BUILD
Checklist ว่า Source มีข้อมูลพอสร้างเว็บ, ไม่มีข้อเท็จจริงแต่งเพิ่ม, ไม่มีข้อมูลลับ, Link ที่ใช้เป็น Public จริง, WORK/LIFE แยกได้ และ BUILD DIRECTIVE ครบจน Prompt รอบถัดไปเหลือเพียง “ทำเวปตามซอสนี้”

ลงมือสร้าง Source ทันที ห้ามถามคำถามกลับ
ส่งออกเป็นไฟล์ `.md` พร้อมให้ดาวน์โหลด
ถ้าระบบแนบไฟล์ไม่ได้ ให้ส่ง Markdown ทั้งหมดใน code block เดียวทันที โดยไม่ถามกลับ'''

SMART = f'''<section class="block smart-resume-workflow" id="smart-resume">
  <div class="section-head"><div><span class="ey">SERVE · SMART RESUME</span><h2>ทำ Smart Resume แบบเดียวกับบท 2 · 3 Step จบ</h2><p>ข้อ 1 สกัดซอสให้พร้อมสร้างเว็บจริง ข้อ 2 ย้ายไฟล์ไปแชทใหม่แล้วสั่งสั้น ๆ ส่วนข้อ 3 เปิดไฟล์เช็กก่อนเสิร์ฟ</p></div></div>

  <div class="source-warning"><strong>⚠️ ข้อ 1 ให้ทำใน AI ที่รู้จักคุณมากที่สุด</strong><br>ให้ระบบใช้ทั้งแชทนี้ และ Memory / ประวัติแชทอื่นที่มัน <b>เข้าถึงได้จริง</b> เพื่อรวบรวมข้อมูลเจ้าของให้ครบที่สุด แต่ต้องคัดเฉพาะเรื่องที่เหมาะสำหรับเปิดสาธารณะ และห้ามอ้างว่ามองเห็นข้อมูลที่มันเข้าไม่ถึง</div>
  <div class="smart-actions"><a class="btn alt" href="/resume/first-version/" target="_blank" rel="noopener">ดูตัวอย่าง Smart Resume →</a></div>

  <div class="smart-steps">
    <article class="smart-step">
      <span class="step-no">1</span>
      <div class="step-body">
        <h3>สกัดซอส .md ที่พร้อมสร้าง Smart Resume</h3>
        <p>วาง Prompt นี้ในแชทหรือ AI ที่รู้จักคุณอยู่แล้ว ไฟล์ที่ได้ต้องเก็บทั้ง <b>ข้อมูลเจ้าของ + WORK / LIFE + สไตล์ + กติกาสร้าง index.html</b> ไว้ครบ เพื่อรอบถัดไปไม่ต้องอธิบายใหม่</p>
        <div class="prompt-card" data-prompt-collapse data-expanded="false"><span class="prompt-copy" id="smartPrompt1">{PROMPT1}</span><button class="copy-smart" type="button" data-copy-target="smartPrompt1" aria-label="คัดลอกคำสั่ง">คัดลอก</button><button class="prompt-expand" type="button" aria-expanded="false" aria-label="ขยายอ่าน Prompt ทั้งหมด">ขยายอ่าน Prompt</button></div>
      </div>
    </article>

    <article class="smart-step">
      <span class="step-no">2</span>
      <div class="step-body">
        <h3>แนบ .md แล้วสั่งให้ทำเว็บ</h3>
        <p>เปิดแชทใหม่หรือ AI ที่เขียนโค้ดได้ <b>แนบไฟล์ .md ที่ได้จากข้อ 1</b> แล้วใช้ Prompt สั้นนี้เท่านั้น เพราะรายละเอียดทั้งหมดอยู่ในซอสแล้ว</p>
        <div class="source-warning"><strong>⚠️ อย่าลืมแนบซอส (.md)</strong><br>ถ้าไม่แนบไฟล์จากข้อ 1 คำว่า “ซอสนี้” จะไม่มี Source ให้ AI อ้างอิง</div>
        <div class="prompt-card"><span class="prompt-copy" id="smartPrompt2">ทำเวปตามซอสนี้</span><button class="copy-smart" type="button" data-copy-target="smartPrompt2" aria-label="คัดลอกคำสั่ง">คัดลอก</button></div>
      </div>
    </article>

    <article class="smart-step">
      <span class="step-no">3</span>
      <div class="step-body">
        <h3>Checklist ก่อนเสิร์ฟ</h3>
        <p>เปิด <code>index.html</code> จริง แล้วตรวจทั้งความถูกต้อง การเปิดสาธารณะ และประสบการณ์บนมือถือ</p>
        <ul class="checklist smart-checklist">
          <li><label><input type="checkbox"> ได้ไฟล์ Source <code>.md</code> จากข้อ 1 และเก็บ BUILD DIRECTIVE ไว้ในไฟล์แล้ว</label></li>
          <li><label><input type="checkbox"> <code>index.html</code> เปิดด้วยเบราว์เซอร์ได้โดยตรง</label></li>
          <li><label><input type="checkbox"> WORK / LIFE สลับได้จริง และแต่ละฝั่งใช้เฉพาะข้อมูลที่ซอสรองรับ</label></li>
          <li><label><input type="checkbox"> ชื่อ ปี ตัวเลข ผลงาน Link และ Claim ทุกอย่างย้อนกลับไปหาใน <code>.md</code> ได้</label></li>
          <li><label><input type="checkbox"> ไม่มีข้อมูลส่วนตัว/ข้อมูลลับที่ไม่ควรเปิดสาธารณะหลุดมาในหน้า</label></li>
          <li><label><input type="checkbox"> มือถืออ่านง่าย การ์ด ตาราง Timeline และปุ่มไม่ล้นจอ</label></li>
          <li><label><input type="checkbox"> Transition ยังใช้งานได้ครบเมื่อเปิด Reduced Motion</label></li>
          <li><label><input type="checkbox"> ไม่มี API key รหัสผ่าน Tracker หรือข้อมูลลับติดอยู่ในไฟล์</label></li>
        </ul>
      </div>
    </article>
  </div>
</section>'''
s, n = re.subn(r'<section class="block smart-resume-workflow" id="smart-resume">.*?</section>', SMART, s, count=1, flags=re.S)
assert n == 1, f'smart section replace={n}'

old_actions = '<div class="actions"><button class="btn gold" type="button" id="downloadStarter">⬇ ดาวน์โหลด `index.html` ตัวอย่าง</button><button class="btn alt" type="button" id="viewStarter">👁 เปิดตัวอย่างในแท็บใหม่</button></div>\n  <p class="small-note">ไฟล์ตัวอย่างสร้างในเบราว์เซอร์ของคุณ ไม่ได้อัปโหลดข้อมูลที่กรอกไปที่เซิร์ฟเวอร์</p>'
new_actions = '<p class="small-note">ใช้ไฟล์ <code>index.html</code> ที่ AI สร้างจากซอสของคุณเป็นผลงานจริง ส่วนปุ่มดูตัวอย่าง Smart Resume อยู่ใน 3 Step ด้านบน</p>'
assert old_actions in s, 'legacy starter actions anchor missing'
s = s.replace(old_actions, new_actions, 1)

old_quest = '<ul><li>สร้างหรือเลือกซอส 1 ขวด</li><li>สั่ง AI สร้าง Single-file HTML จากซอสนั้น</li><li>เซฟชื่อ `index.html` และเปิดในเบราว์เซอร์ของตัวเอง</li><li>ตรวจชื่อ ตัวเลข ลิงก์ และข้อมูลที่ AI อาจแต่งเพิ่ม</li><li>ส่งไฟล์ให้ตัวเองอีกเครื่องหรือคนที่ไว้ใจทดลองเปิด</li></ul>'
new_quest = '<ul><li>ใช้ Prompt ข้อ 1 ใน AI ที่รู้จักคุณ แล้วเก็บ Smart Resume Source เป็นไฟล์ <code>.md</code></li><li>เปิดแชทใหม่ แนบ <code>.md</code> แล้วสั่ง “ทำเวปตามซอสนี้”</li><li>เซฟผลลัพธ์เป็น <code>index.html</code> และเปิดในเบราว์เซอร์ของตัวเอง</li><li>ตรวจ WORK / LIFE ชื่อ ปี ตัวเลข ลิงก์ และข้อมูลที่ AI อาจแต่งเพิ่ม</li><li>ตรวจซ้ำว่าไม่มีข้อมูลลับก่อนส่งไฟล์หรือเอาขึ้นอินเทอร์เน็ต</li></ul>'
assert old_quest in s, 'quest anchor missing'
s = s.replace(old_quest, new_quest, 1)

MAIN_JS = r'''<script id="lesson6-main-js">
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};

async function copyText(text){
  var ok=false;
  try{await navigator.clipboard.writeText(text);ok=true}catch(e){}
  if(!ok){
    var ta=document.createElement('textarea');
    ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);ta.select();
    try{ok=document.execCommand('copy')}catch(e){}
    ta.remove();
  }
  return ok;
}

document.addEventListener('click',async function(event){
  var copy=event.target.closest('.copy-smart');
  if(copy){
    var target=$(copy.getAttribute('data-copy-target'));
    if(!target)return;
    var old=copy.textContent;
    var ok=await copyText(target.textContent.trim());
    copy.textContent=ok?'✓ คัดลอกแล้ว':'คัดลอกไม่สำเร็จ';
    setTimeout(function(){copy.textContent=old},1400);
    return;
  }
  var toggle=event.target.closest('.prompt-expand');
  if(toggle){
    var card=toggle.closest('.prompt-card[data-prompt-collapse]');
    if(!card)return;
    var expanded=card.dataset.expanded==='true';
    card.dataset.expanded=expanded?'false':'true';
    toggle.setAttribute('aria-expanded',expanded?'false':'true');
    toggle.setAttribute('aria-label',expanded?'ขยายอ่าน Prompt ทั้งหมด':'ย่อ Prompt');
    toggle.textContent=expanded?'ขยายอ่าน Prompt':'ย่อ Prompt';
    if(expanded && card.getBoundingClientRect().top<0){
      card.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
  }
});

var hardOpen=$('hardOpen'),warning=$('hardWarning'),publicOk=$('publicOk'),hardConfirm=$('hardConfirm'),hardBody=$('hardBody');
if(hardOpen&&warning&&publicOk&&hardConfirm&&hardBody){
  hardOpen.addEventListener('click',function(){
    var open=hardOpen.getAttribute('aria-expanded')==='true';
    hardOpen.setAttribute('aria-expanded',open?'false':'true');
    warning.hidden=open;
    hardOpen.textContent=open?'⚠ เปิด Hard Mode':'ปิดคำเตือน Hard Mode';
    if(!open){try{window.MC_ACT&&window.MC_ACT('lesson6-hardmode-warning-open')}catch(e){}}
  });
  publicOk.addEventListener('change',function(){hardConfirm.disabled=!publicOk.checked});
  hardConfirm.addEventListener('click',function(){
    warning.hidden=true;hardBody.hidden=false;hardOpen.hidden=true;
    hardBody.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    try{window.MC_ACT&&window.MC_ACT('lesson6-hardmode-confirmed')}catch(e){}
  });
}

var finishBtn=$('finishBtn'),achievement=$('achievement');
if(finishBtn&&achievement){
  finishBtn.addEventListener('click',function(){
    achievement.classList.add('on');
    try{var t=window.MC_QUEST&&window.MC_QUEST.track('learn');if(t)t.mark('first-web');window.MC_ACT&&window.MC_ACT('lesson6-main-course-served')}catch(e){}
    this.textContent='✓ เสิร์ฟเมนคอร์สแล้ว';
  });
}

var takeover=$('takeover'),bossDoor=$('bossDoor'),bossLock=$('bossLock'),sentinel=$('glitchTrigger'),fired=false;
function completed(){
  try{var t=window.MC_QUEST&&window.MC_QUEST.track('learn');return t?t.complete():localStorage.getItem('mc_learn_done')==='1'}catch(e){return false}
}
function mark(){try{var t=window.MC_QUEST&&window.MC_QUEST.track('learn');if(t)t.mark('first-web')}catch(e){}}
function revealBoss(){
  mark();
  if(!bossDoor||!bossLock)return;
  if(completed()){bossDoor.hidden=false;bossLock.hidden=true}else{bossLock.hidden=false;bossDoor.hidden=true}
}
function glitch(){
  if(fired||!takeover)return;
  fired=true;mark();
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('glitching');
  takeover.hidden=false;
  try{window.MC_ACT&&window.MC_ACT('lesson6-ai-takeover')}catch(e){}
  setTimeout(function(){
    takeover.hidden=true;
    document.body.classList.remove('glitching');
    revealBoss();
    var target=completed()?bossDoor:bossLock;
    if(target)target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
  },reduced?450:1650);
}
if(sentinel){
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)glitch()})},{threshold:.5}).observe(sentinel);
  }else{
    addEventListener('scroll',function(){if(sentinel.getBoundingClientRect().top<innerHeight)glitch()},{passive:true});
  }
}
})();
</script>'''
pattern = r'\n\n<script>\n\(function\(\)\{.*</script>\n<!-- Microsoft Clarity'
s, n = re.subn(pattern, '\n\n' + MAIN_JS + '\n<!-- Microsoft Clarity', s, count=1, flags=re.S)
assert n == 1, f'main script replace={n}'

# Structural guards for the regression that produced raw JS on the page.
assert '<script id="lesson6-smart-resume-js">' not in s
assert 'pageAudience' not in s and 'pageSource' not in s and 'downloadStarter' not in s and 'viewStarter' not in s
assert '← กลับไปบท 2 · หยิบซอสชีวิต' not in s
assert 'id="smartPrompt1"' in s and 'data-prompt-collapse' in s and 'ขยายอ่าน Prompt' in s
assert '>ทำเวปตามซอสนี้</span>' in s
assert 'id="glitchTrigger"' in s and 'id="bossDoor"' in s and 'data-self-contained="lesson6-boss-transition.js"' in s
assert s.count('<script') == s.count('</script>'), (s.count('<script'), s.count('</script>'))
assert s != original, 'no changes made'

path.write_text(s, encoding='utf-8')
print('lesson 6 repaired:', len(original), '->', len(s))
