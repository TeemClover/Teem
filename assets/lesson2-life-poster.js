/* AI ใส่ซอส · Lesson 2 life-poster flow
   แชทเก่า → สกัดซอสชีวิต .md → แชทใหม่ → โปสเตอร์หนังชีวิต → ชิมและแก้ซอส
*/
(function(){
'use strict';
if(!/\/classroom\/image-ai\.html$/.test(location.pathname)) return;

const EXTRACT_PROMPT = `สร้าง “ซอสลูก” สำหรับโปสเตอร์เรื่องของฉัน เป็นไฟล์ Markdown (.md) ที่พร้อมใช้สร้างภาพได้ทันที โดยไม่ต้องอธิบายเพิ่มใน Prompt รอบถัดไป
ถ้าซอสแม่เล่าเรื่องงาน ร้าน หรือสินค้า ให้ทำโปสเตอร์เรื่องนั้นโดยใช้ข้อมูลเดิม ไม่ต้องเปลี่ยนเป็นประวัติชีวิตของฉัน ถ้าเป็นข้อมูลตัวตนจึงทำโปสเตอร์หนังชีวิต

แหล่งข้อมูลที่ให้ใช้ เรียงตามลำดับ:
1. ซอสแม่ (.md) ที่ฉันแนบมา ถ้ามี — ใช้เป็นฐานหลักเสมอ
2. บทสนทนาปัจจุบัน
3. ถ้าข้อมูลจาก 1 และ 2 ยังไม่พอสำหรับหัวข้อใด ให้ค้นเพิ่มจาก Memory โปรไฟล์ Personal Context หรือประวัติแชทอื่นของบัญชีนี้ เฉพาะเท่าที่ระบบเข้าถึงได้จริง
- ถ้าระบบเข้าถึงบริบทอื่นไม่ได้ ห้ามอ้างว่าเข้าถึงได้ และห้ามแต่งข้อมูลมาชดเชย
- ถ้าข้อมูลจากหลายแหล่งขัดกัน ให้ยึดซอสแม่ก่อน แล้วจึงยึดข้อมูลล่าสุดที่ฉันยืนยันเอง
- สิ่งที่ยังไม่รู้ให้เขียนว่า “ยังไม่มีข้อมูล” ห้ามเดา

สิ่งที่ต้องเก็บให้ครบ:
- เจ้าของเรื่องหรือโปรเจกต์คือใคร ทำอะไร และต้องการสื่อเรื่องใด
- บุคลิก วิธีพูด จุดเด่น และสิ่งที่ให้ความสำคัญ
- เรื่องราวหรือจุดเปลี่ยนสำคัญ
- ฉาก สี วัตถุ และบรรยากาศที่เหมาะกับการเล่าเรื่องชีวิต
- รูปลักษณ์หรือการแต่งตัว ถ้ามีข้อมูลจริง

ตั้งชื่อไฟล์ว่า poster-source-YYYY-MM-DD-HHmm.md โดยใช้วันและเวลาปัจจุบันขณะสร้างไฟล์
ถ้าระบบไม่รู้เวลาจริง ให้คงตัวอักษร YYYY-MM-DD-HHmm ไว้ตามนั้น เพื่อให้ฉันเติมเอง

จัด Source ให้ครบตามหัวข้อนี้:
# ซอสลูก (Source) สำหรับโปสเตอร์จากซอสแม่
> เอกสารนี้คือ “ซอส” (Source) ของงานนี้ เก็บบริบท กติกา และข้อห้ามไว้ครบแล้ว
> เมื่อฉันแนบไฟล์นี้แล้วสั่งสั้น ๆ ว่า “สร้างภาพตามซอสนี้” ให้ถือว่า “ซอส” หมายถึงไฟล์นี้ และให้ทำงานจากไฟล์นี้ทันทีโดยไม่ต้องถามบริบทเพิ่ม
## ข้อมูลไฟล์
- ชื่อไฟล์: poster-source-YYYY-MM-DD-HHmm.md
- สร้างเมื่อ: (วัน เดือน ปี และเวลาที่สร้างไฟล์นี้)
- ซอสแม่ที่ใช้: (ชื่อไฟล์ซอสแม่ที่แนบมา หรือระบุว่าไม่ได้แนบ)
- แหล่งข้อมูลที่ใช้: (ระบุว่าส่วนไหนมาจากซอสแม่ ส่วนไหนมาจากบทสนทนา และส่วนไหนมาจากบริบทอื่น)
## ตัวตนหรือโปรเจกต์และบริบทของเจ้าของเรื่อง
## เส้นเรื่อง — มาจากไหน กำลังทำอะไร และกำลังไปทางไหน
## สิ่งสำคัญที่ภาพต้องสื่อ
## ฉาก วัตถุ สี แสง และอารมณ์
## รายละเอียดบุคคลและการแต่งตัวที่มีหลักฐาน
## สิ่งที่ห้ามแต่งเพิ่ม
## Image Recipe — โปสเตอร์จากเรื่องใน Source
- ภาพแนวตั้งอัตราส่วน 9:16
- เล่าเรื่องด้วยภาพ ไม่มีตัวหนังสือบนภาพ
- ถ้าแนบเฉพาะ Source ให้สร้างเป็น Illustration โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง
- ถ้าแนบ Source พร้อมรูปจริง ให้ใช้รูปเป็นภาพอ้างอิงหลัก และรักษาใบหน้า ทรงผม และลักษณะสำคัญ
- เลือกองค์ประกอบและจังหวะภาพให้สะท้อนเรื่องราวใน Source
- รายละเอียดที่ไม่มีข้อมูลให้ใช้ทางเลือกเรียบและเป็นกลาง ห้ามสร้างข้อเท็จจริงใหม่

ลงมือสร้าง Source ทันที ห้ามถามคำถามกลับ
ส่งออกเป็นไฟล์ .md พร้อมให้ดาวน์โหลด โดยใช้ชื่อไฟล์ poster-source-YYYY-MM-DD-HHmm.md ตามเวลาจริง
ถ้าระบบแนบไฟล์ไม่ได้ ให้ส่ง Markdown ทั้งหมดใน code block เดียวทันที โดยไม่ถามกลับ และบอกชื่อไฟล์ที่ควรใช้บันทึกไว้ด้านบน code block`;

const POSTER_PROMPT = `สร้างภาพตามซอสนี้`;

function setText(el,text){
  if(el && el.textContent!==text) el.textContent=text;
}

function setPrompt(el,text){
  if(!el) return;
  let button=el.querySelector('.cpx');
  if(el.hasAttribute('data-prompt-collapse') && button && !button.hasAttribute('data-copy-full')){
    button.remove();
    button=null;
  }
  const current=[...el.childNodes].filter(n=>n!==button && !(n.nodeType===1 && n.classList.contains('prompt-expand'))).map(n=>n.textContent||'').join('').trim();
  if(current!==text.trim()){
    [...el.childNodes].forEach(n=>{ if(n!==button && !(n.nodeType===1 && n.classList.contains('prompt-expand'))) n.remove(); });
    if(el.hasAttribute('data-prompt-collapse')){
      const promptCopy=document.createElement('span');
      promptCopy.className='prompt-copy';
      promptCopy.textContent=text;
      el.insertBefore(promptCopy,button||null);
    }else{
      el.insertBefore(document.createTextNode(text),button||null);
    }
  }
  if(button){button.dataset.copyText=text;return;}
  if(!button){
    const copyLabel='คัดลอก';
    button=document.createElement('button');
    button.type='button';button.className='cpx';button.textContent=copyLabel;
    button.setAttribute('data-copy-full','true');
    button.dataset.copyText=text;
    button.setAttribute('aria-label','คัดลอกคำสั่ง');
    button.addEventListener('click',async()=>{
      const text=button.dataset.copyText||'';
      let ok=false;
      try{await navigator.clipboard.writeText(text);ok=true}catch(e){}
      if(!ok){
        const area=document.createElement('textarea');
        area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0;pointer-events:none';
        document.body.append(area);area.select();
        try{ok=document.execCommand('copy')}catch(e){}
        area.remove();
      }
      button.textContent=ok?'✓ คัดลอกแล้ว':'คัดลอกไม่สำเร็จ';
      setTimeout(()=>button.textContent=copyLabel,1400);
    });
    el.append(button);
  }
}

function setupPromptCollapse(el){
  if(!el) return;
  if(!document.getElementById('prompt-collapse-style-v2')){
    const style=document.createElement('style');
    style.id='prompt-collapse-style-v2';
    style.textContent='.prompt-collapsible{padding-bottom:54px}.prompt-copy{display:block}.prompt-collapsible:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden}.prompt-expand{position:absolute;left:14px;bottom:10px;z-index:2;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif;font-size:11px;font-weight:700;cursor:pointer}.prompt-expand:hover{background:rgb(255 255 255/.13)}.life-md-alert{margin:12px 0;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgba(153,25,25,.08)}.life-md-alert strong{display:block;color:#a31717}.life-md-alert span{display:block;margin-top:2px;font-size:13px;line-height:1.6}';
    document.head.append(style);
  }
  if(!el.querySelector('.prompt-copy')){
    const controls=[...el.querySelectorAll('.cpx,.prompt-expand')];
    const content=[...el.childNodes].filter(node=>!controls.includes(node));
    const value=content.map(node=>node.textContent||'').join('').trim();
    content.forEach(node=>node.remove());
    const promptCopy=document.createElement('span');promptCopy.className='prompt-copy';promptCopy.textContent=value;
    el.insertBefore(promptCopy,el.firstChild);
  }
  el.classList.add('prompt-collapsible');
  if(!el.hasAttribute('data-expanded')) el.dataset.expanded='false';
  const copy=el.querySelector('.cpx');
  if(copy) copy.textContent='คัดลอก';
  let toggle=el.querySelector('.prompt-expand');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='prompt-expand';
    toggle.setAttribute('aria-label','ขยายอ่าน Prompt ทั้งหมด');
    toggle.addEventListener('click',()=>{
      const expanded=el.dataset.expanded==='true';
      el.dataset.expanded=expanded?'false':'true';
      toggle.setAttribute('aria-expanded',expanded?'false':'true');
      toggle.setAttribute('aria-label',expanded?'ขยายอ่าน Prompt ทั้งหมด':'ย่อ Prompt');
      toggle.textContent=expanded?'ขยายอ่าน Prompt':'ย่อ Prompt';
      if(expanded && el.getBoundingClientRect().top<0) el.scrollIntoView({block:'start',behavior:'smooth'});
    });
    el.append(toggle);
  }
  const expanded=el.dataset.expanded==='true';
  toggle.setAttribute('aria-expanded',expanded?'true':'false');
  toggle.setAttribute('aria-label',expanded?'ย่อ Prompt':'ขยายอ่าน Prompt ทั้งหมด');
  toggle.textContent=expanded?'ย่อ Prompt':'ขยายอ่าน Prompt';
}

function injectStyle(){
  if(document.getElementById('lesson2-life-poster-style')) return;
  const style=document.createElement('style');
  style.id='lesson2-life-poster-style';
  style.textContent=`
    .life-md-alert{margin:12px 0;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgba(153,25,25,.08)}
    .life-md-alert strong{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:15px;color:#a31717}
    .life-md-alert span{display:block;margin-top:2px;font-size:13px;line-height:1.6}
    .life-md-alert code{background:rgba(163,23,23,.08);padding:1px 5px;border-radius:5px}
    .prompt-collapsible{padding-bottom:54px}
    .prompt-copy{display:block}
    .prompt-collapsible:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden}
    .prompt-expand{position:absolute;left:14px;bottom:10px;z-index:2;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif;font-size:11px;font-weight:700;cursor:pointer}
    .prompt-expand:hover{background:rgb(255 255 255/.13)}
    .life-photo-note{margin-top:10px;border:1px solid rgb(var(--ink)/.1);border-radius:12px;background:rgb(var(--paper)/.55);padding:0 13px}
    .life-photo-note summary{cursor:pointer;font-family:"Bai Jamjuree",sans-serif;font-weight:700;font-size:13.5px;padding:10px 0;color:rgb(var(--green))}
    .life-photo-note p{padding:0 0 11px;margin:0!important;font-size:13px!important;line-height:1.6!important}
    .life-fast{margin:18px 0 28px}
    .life-fast__intro{padding:18px 20px;border:1px solid rgb(var(--green)/.24);border-radius:17px;background:linear-gradient(135deg,rgb(var(--green)/.08),rgb(var(--gold)/.09))}
    .life-fast__intro b{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:18px;color:rgb(var(--deep))}
    .life-fast__intro p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .life-why{margin-top:14px;padding:20px;border-radius:17px;background:rgb(var(--deep));color:#fff}
    .life-why h2{font-family:"Bai Jamjuree",sans-serif;font-size:21px;color:rgb(var(--gold))}
    .life-section-num{display:inline-grid;place-items:center;width:32px;height:32px;margin-right:10px;border-radius:50%;background:rgb(var(--gold));color:rgb(var(--deep));font-size:15px;font-weight:850;vertical-align:middle}
    .life-why>p{margin-top:7px;color:rgb(255 255 255/.86);font-size:15px!important}
    .life-why__quote{margin:14px 0 4px;padding:13px 16px;border-left:4px solid rgb(var(--gold));background:rgb(255 255 255/.07);border-radius:0 12px 12px 0;font-size:18px;font-weight:750}
    .life-why__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}
    .life-why__grid div{padding:13px;border:1px solid rgb(255 255 255/.13);border-radius:13px;background:rgb(255 255 255/.06)}
    .life-why__grid b{display:block;color:rgb(var(--gold));font-size:14px}.life-why__grid p{margin-top:3px;color:rgb(255 255 255/.82);font-size:13px!important;line-height:1.65!important}
    .life-fast__steps{display:grid;gap:12px;margin-top:14px}
    .life-fast__step{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:18px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:#fff;box-shadow:0 9px 26px rgb(18 40 28/.05)}
    .life-fast__num{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgb(var(--green));color:#fff;font-weight:850}
    .life-fast__step h3{font-family:"Bai Jamjuree",sans-serif;font-size:18px;line-height:1.4}
    .life-fast__step p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .life-paths{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .life-path{padding:14px;border:1px solid rgb(var(--gold)/.34);border-radius:14px;background:rgb(var(--gold)/.07)}
    .life-path b{display:block;color:#775719}.life-path p{font-size:13px!important;line-height:1.65!important}
    .life-examples{margin-top:15px;padding:18px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:rgb(var(--paper)/.55)}
    .life-examples h2{font-family:"Bai Jamjuree",sans-serif;font-size:20px;color:rgb(var(--deep))}
    .life-examples>p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .life-examples__grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:14px}
    .life-example{overflow:hidden;margin:0;border:1px solid rgb(var(--ink)/.12);border-radius:15px;background:#fff}
    .life-example img{display:block;width:100%;height:auto;aspect-ratio:9/16;object-fit:cover;background:#10271d}
    .life-example figcaption{padding:13px 14px}
    .life-example b{display:block;font-family:"Bai Jamjuree",sans-serif;color:rgb(var(--deep));font-size:15px}
    .life-example span{display:block;margin-top:3px;color:rgb(var(--muted));font-size:13px;line-height:1.65}
    .life-done{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .life-done label{display:flex;gap:9px;align-items:flex-start;padding:11px 12px;border:1px solid rgb(var(--ink)/.1);border-radius:12px;background:rgb(var(--paper)/.5);font-size:13px;line-height:1.55;cursor:pointer}
    .life-done input{width:18px;height:18px;margin-top:2px;accent-color:rgb(var(--green));flex:none}

    .life-taste-tool{margin-top:14px;padding:20px;border:1px solid #aac8b3;border-radius:17px;background:#eff6ec;color:#173d29}
    .life-taste-tool h2{font-size:22px;line-height:1.45}.life-taste-tool>p{margin:7px 0 13px;font-size:15px}
    .life-taste-tool fieldset{padding:0;margin:14px 0;border:0;min-width:0}.life-taste-tool legend{font-weight:750;margin-bottom:9px}
    .life-taste-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}.life-taste-choice{display:flex;align-items:flex-start;gap:9px;padding:12px;border:1px solid #c6d7c6;border-radius:11px;background:#fff;cursor:pointer;font-size:14px}
    .life-taste-choice:has(input:checked){border-color:#1b6a42;background:#e3efdc}.life-taste-choice input{margin-top:5px;accent-color:#1b6a42;flex:none}.life-taste-choice b,.life-taste-choice small{display:block}.life-taste-choice small{color:#586b55;font-size:13px!important}
    .life-taste-field{display:block;margin-top:12px;font-size:14px;font-weight:700}.life-taste-field textarea{display:block;width:100%;min-height:82px;margin-top:6px;padding:10px 12px;border:1px solid #b1c8b5;border-radius:10px;background:#fff;color:#183a29;resize:vertical;font:inherit;font-weight:400;line-height:1.6}
    .life-taste-field textarea:focus{outline:2px solid #1b6a42;outline-offset:2px}.life-taste-field[hidden],.life-taste-tool [hidden]{display:none!important}
    .life-taste-hint,.life-check-status{color:#526d4b;font-size:14px;margin-top:12px}.life-taste-tool .prompt{margin-top:12px;white-space:pre-wrap;overflow-wrap:anywhere}
    .life-taste-return{margin-top:12px;padding:12px;border-radius:10px;background:#fff;font-size:14px;line-height:1.65}
    @media(max-width:600px){.life-taste-tool{padding:17px}.life-taste-options{grid-template-columns:1fr}}
    @media(max-width:720px){.life-why__grid,.life-done{grid-template-columns:1fr}.life-paths,.life-examples__grid{grid-template-columns:1fr}.life-fast__step{grid-template-columns:32px 1fr;padding:16px 14px}}
  `;
  document.head.append(style);
}

function patchTop(){
  document.title='บทที่ 2 · Taste · ซอสสร้างภาพได้จริง · AI ใส่ซอส';
  const description=document.querySelector('meta[name="description"]');
  if(description) description.content='แนบซอส .md แล้วสร้างภาพแนวตั้ง 9:16 ให้เร็วที่สุด: มีซอสอย่างเดียวได้ Illustration และแนบรูปจริงเพิ่มเพื่อรักษาความเหมือน';
  const head=document.querySelector('.head');
  if(head){
    setText(head.querySelector('.lead'),'แนบซอส .md แล้วสร้างภาพแนวตั้ง 9:16 ได้ทันที — มีซอสอย่างเดียวได้ Illustration และแนบรูปจริงเพิ่มเมื่ออยากให้ภาพเหมือนคุณ');
    const meta=[...head.querySelectorAll('.meta span')];
    ['⏱️ 10–15 นาที','🧴 ใช้ซอส .md','🖼️ ได้ภาพ 9:16','📎 รูปจริงเป็นตัวเลือก'].forEach((txt,i)=>setText(meta[i],txt));
  }
  const tldr=document.querySelector('.tldr');
  if(tldr){
    setText(tldr.querySelector('.tldr-main h2'),'ใช้ซอสเดิม สร้างโปสเตอร์ แล้วแก้ให้ตรง 1 รอบ');
    setText(tldr.querySelector('.tldr-main p'),'ซอส .md มาจากแชทเดิมที่สร้างภาพไม่ได้ก็ใช้ได้ แค่ย้ายไฟล์ไปเปิดในแชทใหม่ที่สร้างภาพได้ แล้วเลือกว่าจะทำ Illustration หรือแนบรูปจริงเพื่อรักษาความเหมือน');
    const take=[...tldr.querySelectorAll('.takehome span')];
    ['🧴 ซอสชีวิต .md','🎨 Illustration เมื่อมีแค่ .md','📷 ภาพเหมือนเมื่อแนบรูปจริง','✅ ได้ภาพ 9:16'].forEach((txt,i)=>setText(take[i],txt));
  }
}

function buildFastTrack(){
  const tldr=document.querySelector('.tldr');
  if(!tldr) return;
  let fast=document.getElementById('lesson2FastTrack');
  if(!fast){
    fast=document.createElement('section');
    fast.className='life-fast';
    fast.id='lesson2FastTrack';
    fast.innerHTML=`
      <div class="life-fast__intro"><b>แชทเดิมสร้างภาพไม่ได้ก็ไม่เป็นไร</b><p>สกัดซอสลูกในแชทที่รู้จักคุณ แล้วนำไฟล์ไปเปิดในแชทใหม่ที่สร้างภาพได้ ผู้เรียนไม่ต้องเริ่มเล่าเรื่องตัวเองใหม่</p></div>
      <section class="life-why"><h2>ทำไมบทนี้ต้อง “ชิม” ด้วยภาพ</h2><div class="life-why__quote">ภาพ 1 ภาพ สื่อความหมายได้มากกว่าคำ 1,000 คำ</div><p>ซอสที่อ่านแล้วดูครบ อาจยังมีช่องว่างซ่อนอยู่ พอให้ระบบแปลงเป็นภาพ เราจะเห็นทันทีว่ามันเข้าใจตัวตน เรื่องราว อารมณ์ และสิ่งสำคัญของเราตรงหรือไม่ ก่อนเอาซอสไปทำงานจริงหลายชิ้น</p><div class="life-why__grid"><div><b>👀 เห็นความเข้าใจผิด</b><p>สิ่งที่คลุมเครือจะโผล่ออกมาเป็นคน ฉาก สี และวัตถุที่ผิด</p></div><div><b>⚡ ตรวจได้เร็ว</b><p>มองภาพครั้งเดียว เห็นทั้งสิ่งที่ตรง สิ่งที่ขาด และสิ่งที่ระบบแต่งเพิ่ม</p></div><div><b>🧴 พิสูจน์ว่าซอสใช้ได้</b><p>รายละเอียดที่ภาพยังไม่ตรงช่วยบอกว่า ควรเติมกติกาข้อไหนก่อนนำซอสไปใช้ต่อ</p></div></div></section>
      <figure class="sauce-flow"><span class="sauce-flow__frame"><img src="/classroom/img/sauce-flow-3step.jpeg" width="1600" height="800" loading="lazy" decoding="async" alt="สามขั้นตอนของการปรุงจากซอส · ขั้นที่ 1 ใช้ซอสแม่สกัดซอสลูก · ขั้นที่ 2 ใช้ซอสลูกสร้างงาน เช่น สไลด์ เอกสาร หรือภาพ · ขั้นที่ 3 ตรวจงานที่ได้จากซอสว่าตรงเป้าหมาย ครบถ้วน ชัดเจน และพร้อมใช้"></span><figcaption class="sauce-flow__cap">ทุกบทตั้งแต่นี้ไปใช้จังหวะเดียวกัน — ซอสแม่ให้ซอสลูก ซอสลูกให้งาน แล้วตรวจงานกลับไปที่ซอส</figcaption></figure>
      <div class="life-fast__steps">
        <article class="life-fast__step" id="lesson2Work"><span class="life-fast__num">1</span><div><h3>ใช้ซอสแม่ สกัดซอสลูกสำหรับโปสเตอร์</h3><p>แนบ<b>ซอสแม่</b>จากบทที่ 1 แล้ววาง Prompt นี้ ระบบต้องสร้างไฟล์ทันทีโดยไม่ถามกลับ ผลลัพธ์คือ <code>poster-source-YYYY-MM-DD-HHmm.md</code> ที่มีวันเวลากำกับไว้ในชื่อ</p><p>ซอสแม่เป็นเรื่องร้าน งาน หรือสินค้า ใช้เรื่องนั้นต่อได้เลย ไม่ต้องเริ่มเล่าชีวิตใหม่</p><div class="life-md-alert"><strong>ยังไม่มีซอสแม่ก็ทำได้</strong><span>ถ้ายังไม่ได้ทำบทที่ 1 ให้วาง Prompt นี้ในแชทเดิมที่รู้จักคุณอยู่แล้ว Prompt จะไปดึงจากบทสนทนาและ Memory ให้แทน หากยังไม่มีทั้งสองอย่าง <a href="free-ai.html#lesson1Example">ดาวน์โหลด Source เรื่องสมมติจากบท 1</a> แล้วแนบในแชทใหม่ได้เลย</span></div><div class="prompt" data-life-prompt="extract" data-prompt-guard="off" data-prompt-collapse></div></div></article>
        <article class="life-fast__step"><span class="life-fast__num">2</span><div><h3>แนบซอส แล้วสร้างภาพ</h3><p>เปิดแชทใหม่ที่สร้างภาพได้ <b>แนบซอส .md ทุกครั้ง</b> แล้วเลือกเส้นทางที่ตรงกับไฟล์ในมือ จากนั้นวางคำสั่งสั้นด้านล่างเพื่อสร้างภาพ</p><div class="life-paths"><div class="life-path"><b>🎨 มีซอส .md อย่างเดียว</b><p>ได้ Illustration หรือตัวละครวาดที่เล่าเรื่องจากซอส โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง</p></div><div class="life-path"><b>📷 มีซอส .md + รูปจริง</b><p>ได้ภาพที่รักษาใบหน้า ทรงผม และลักษณะสำคัญของคนในรูปให้ใกล้เคียงต้นฉบับ</p></div></div><div class="prompt" data-life-prompt="poster" data-prompt-guard="off"></div></div></article>
        <article class="life-fast__step"><span class="life-fast__num">3</span><div><h3>เช็กว่าภาพใช้ได้จริง</h3><p>เทียบภาพกับซอส แล้วเลือก 1 จุดที่ควรแก้ด้านล่าง ถ้าตรวจแล้วตรงทั้งหมด ยืนยันสิ่งที่ตรงได้โดยไม่ต้องหาข้อผิดพลาดเพิ่ม</p><div class="life-done"><label><input type="checkbox"><span>ได้ภาพแนวตั้ง 9:16 จริง 1 ภาพ</span></label><label><input type="checkbox"><span>เรื่องหลักและอารมณ์ในภาพตรงกับซอส</span></label><label><input type="checkbox"><span>ไม่มีประวัติหรือความสำเร็จที่ซอสไม่เคยบอก</span></label><label><input type="checkbox"><span>มีแค่ซอสจึงได้ Illustration หรือแนบรูปจริงแล้วใบหน้ายังตรง</span></label><label><input type="checkbox"><span>ตรวจเทียบกับซอสแล้ว ระบุจุดแก้ได้ หรือยืนยันว่าไม่พบจุดผิด</span></label></div><p class="life-check-status" id="lifeCheckStatus" role="status" aria-live="polite"></p></div></article>
      </div>
      <section class="life-examples" id="lesson2Examples"><h2>ตัวอย่างผลลัพธ์จาก Prompt เดียวกัน</h2><p>ทั้งสองภาพใช้ Prompt สร้างภาพด้านบนกับแชทใหม่ที่สร้างภาพได้ ต่างกันเพียงไฟล์ที่แนบ</p><div class="life-examples__grid"><figure class="life-example"><img data-poster-example="illustration" width="540" height="960" loading="lazy" alt="ตัวอย่างโปสเตอร์แนวตั้งแบบ Illustration เมื่อแนบเฉพาะซอส .md"><figcaption><b>🎨 แนบเฉพาะซอส .md</b><span>ได้ Illustration ที่เล่าเรื่องจากซอส โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง</span></figcaption></figure><figure class="life-example"><img data-poster-example="portrait" width="540" height="960" loading="lazy" alt="ตัวอย่างโปสเตอร์แนวตั้งแบบภาพเหมือน เมื่อแนบซอส .md พร้อมรูปจริง"><figcaption><b>📷 แนบซอส .md + รูปจริง</b><span>ได้โปสเตอร์ที่เล่าเรื่องเดียวกัน พร้อมรักษาความเหมือนของบุคคลในรูป</span></figcaption></figure></div></section>
      <div class="chef-note"><b>เชฟชิมแล้ว</b><p>ถ้ามีแค่ซอส เชฟเสิร์ฟเป็น Illustration ให้ค่ะ ถ้าอยากได้ภาพเหมือน ให้แนบรูปจริงเพิ่มพร้อมซอสตั้งแต่รอบแรกค่ะ</p></div>`;
    tldr.insertAdjacentElement('afterend',fast);
  }
  const extractPrompt=fast.querySelector('[data-life-prompt="extract"]');
  extractPrompt?.setAttribute('data-prompt-collapse','');
  setPrompt(extractPrompt,EXTRACT_PROMPT);
  setupPromptCollapse(extractPrompt);
  const posterPrompt=fast.querySelector('[data-life-prompt="poster"]');
  setPrompt(posterPrompt,POSTER_PROMPT);
  setupTaste(fast);
  const examples=window.__LESSON2_POSTER_EXAMPLES__||{};
  const illustration=fast.querySelector('[data-poster-example="illustration"]');
  const portrait=fast.querySelector('[data-poster-example="portrait"]');
  if(illustration && examples.illustration && illustration.src!==examples.illustration) illustration.src=examples.illustration;
  if(portrait && examples.portrait && portrait.src!==examples.portrait) portrait.src=examples.portrait;
  let node=fast.nextElementSibling;
  while(node && !node.classList.contains('quest')){
    const next=node.nextElementSibling;
    node.remove();
    node=next;
  }
}


const TASTE_KEY='mc-lesson2-taste-v2';
function setupTaste(fast){
  if(fast.dataset.tasteReady==='1') return;
  fast.dataset.tasteReady='1';
  const tool=document.createElement('section');
  tool.id='lesson2Taste';
  tool.className='life-taste-tool';
  tool.setAttribute('aria-labelledby','lesson2TasteTitle');
  tool.innerHTML=`
    <h2 id="lesson2TasteTitle">ชิมแล้ว แก้เพียง 1 จุด</h2>
    <p>ดูภาพคู่กับซอส เลือกสาเหตุ แล้วคัดลอกคำสั่งไปใช้ในแชทที่สร้างภาพ พร้อมแนบภาพปัจจุบัน ซอสลูก และรูปอ้างอิงเดิมถ้ามี</p>
    <fieldset><legend>ผลที่ตรวจได้</legend><div class="life-taste-options">
      <label class="life-taste-choice"><input type="radio" name="lesson2TasteCause" value="missing"><span><b>ซอสยังไม่ได้บอก</b><small>เช่น ยังไม่กำหนดสีผ้ากันเปื้อน → เพิ่มกติกาลงซอส</small></span></label>
      <label class="life-taste-choice"><input type="radio" name="lesson2TasteCause" value="ignored"><span><b>ซอสบอกแล้ว แต่ภาพไม่ตรง</b><small>เช่น ระบุสีเขียว แต่ได้สีแดง → ย้ำกติกาและแก้ภาพ</small></span></label>
      <label class="life-taste-choice"><input type="radio" name="lesson2TasteCause" value="decision"><span><b>ฉันเพิ่งตัดสินใจเปลี่ยน</b><small>เช่น อยากเปลี่ยนแสงเป็นช่วงเช้า → บันทึกการตัดสินใจใหม่</small></span></label>
      <label class="life-taste-choice"><input type="radio" name="lesson2TasteCause" value="correct"><span><b>ตรวจแล้วตรง</b><small>ไม่พบจุดที่ต้องแก้ → เก็บกติกาที่ผ่านไว้ใช้ต่อ</small></span></label>
    </div></fieldset>
    <label class="life-taste-field" id="lifeTasteChangeField" for="lifeTasteChange">จุดเดียวที่ต้องการแก้ พร้อมบอกว่าควรเป็นอย่างไร<textarea id="lifeTasteChange" maxlength="600" placeholder="เช่น เปลี่ยนผ้ากันเปื้อนสีแดงเป็นเขียวเข้มตาม Source"></textarea></label>
    <label class="life-taste-field" for="lifeTasteKeep">สิ่งที่ตรวจแล้วตรง และต้องรักษาไว้<textarea id="lifeTasteKeep" maxlength="600" placeholder="เช่น โต๊ะไม้ ต้นไม้ 1 ต้น และแสงอุ่นตรงกับ Source แล้ว"></textarea></label>
    <p class="life-taste-hint" id="lifeTasteHint" role="status" aria-live="polite">เลือกผลที่ตรวจได้ แล้วระบุรายละเอียดเพื่อสร้างคำสั่งของคุณ</p>
    <div class="prompt" id="lifeRepairPrompt" data-prompt-guard="off" data-prompt-collapse hidden></div>
    <div class="life-taste-return"><b>หลังใช้คำสั่ง:</b> ตรวจภาพอีกครั้ง แล้วเก็บซอสลูกฉบับที่อัปเดตไว้พร้อมภาพ หากได้กติกาที่ใช้กับงานอื่นด้วย ให้เพิ่มกลับเข้าซอสแม่ ข้อมูลที่ติ๊กและพิมพ์ในหน้านี้บันทึกไว้เฉพาะเบราว์เซอร์นี้</div>
  `;
  fast.querySelector('.life-fast__steps').insertAdjacentElement('afterend',tool);
  const checks=[...fast.querySelectorAll('.life-done input')];
  const radios=[...tool.querySelectorAll('input[name="lesson2TasteCause"]')];
  const change=tool.querySelector('#lifeTasteChange');
  const keep=tool.querySelector('#lifeTasteKeep');
  const prompt=tool.querySelector('#lifeRepairPrompt');
  const hint=tool.querySelector('#lifeTasteHint');
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(TASTE_KEY)||'{}')||{};}catch(e){}
  checks.forEach((check,i)=>check.checked=Array.isArray(saved.checks)&&saved.checks[i]===true);
  radios.forEach(radio=>radio.checked=radio.value===saved.cause);
  change.value=typeof saved.change==='string'?saved.change.slice(0,600):'';
  keep.value=typeof saved.keep==='string'?saved.keep.slice(0,600):'';
  function render(save){
    const cause=radios.find(radio=>radio.checked)?.value||'';
    const correct=cause==='correct';
    tool.querySelector('#lifeTasteChangeField').hidden=correct;
    const ready=Boolean(cause && keep.value.trim() && (correct || change.value.trim()));
    const done=checks.filter(check=>check.checked).length;
    const status=fast.querySelector('#lifeCheckStatus');
    if(status) setText(status,'ตรวจแล้ว '+done+' / '+checks.length+' ข้อ · กลับมาทำต่อในเบราว์เซอร์นี้ได้');
    prompt.hidden=!ready;
    if(ready){
      const action={
        missing:'ข้อมูลนี้ยังไม่ได้ระบุใน Source ให้เพิ่มเป็นกติกาที่ฉันยืนยันในรอบนี้ แล้วแก้ภาพเพียงจุดนี้',
        ignored:'Source ระบุข้อมูลนี้แล้ว ให้คงข้อเท็จจริงใน Source ย้ำกติกาที่ภาพทำผิด และแก้ภาพเพียงจุดนี้',
        decision:'นี่เป็นการตัดสินใจใหม่ของฉัน ไม่ใช่ข้อผิดพลาดของภาพเดิม ให้บันทึกว่ากติกาใหม่แทนที่ข้อใดใน Source แล้วแก้ภาพเพียงจุดนี้'
      }[cause];
      const text=correct
        ? 'ฉันตรวจภาพปัจจุบันเทียบกับ Source แล้ว และยืนยันว่ารายละเอียดต่อไปนี้ตรง:\n'+keep.value.trim()+'\n\nยังไม่ต้องสร้างภาพใหม่ ให้บันทึกรายการที่ยืนยันนี้ในหัวข้อ “กติกาที่ผ่านการตรวจภาพ” ของ Task Source โดยรักษาข้อมูลเดิมและแยกสิ่งที่ยังไม่มีข้อมูล ห้ามเพิ่มข้อเท็จจริงอื่น ระบุชื่อรูปอ้างอิงที่ยังต้องแนบทุกครั้ง แล้วส่ง Source .md ฉบับอัปเดตให้ดาวน์โหลด ถ้าสร้างไฟล์ไม่ได้ ให้ส่ง Markdown ฉบับเต็มใน code block เดียว'
        : 'ใช้ภาพปัจจุบัน Task Source และรูปอ้างอิงที่แนบ แก้เฉพาะจุดต่อไปนี้:\n'+change.value.trim()+'\n\nสาเหตุและวิธีแก้: '+action+'\n\nสิ่งที่ตรวจแล้วตรงและห้ามเปลี่ยน:\n'+keep.value.trim()+'\n\nคงรายละเอียดอื่นจากภาพเดิม ห้ามจัดองค์ประกอบใหม่หรือเพิ่มข้อมูลที่ Source ไม่รองรับ สร้างภาพแก้ไข 1 ภาพ แล้วส่ง Task Source .md ฉบับอัปเดตที่บันทึกกติกาและสิ่งที่เปลี่ยน พร้อมชื่อรูปอ้างอิงที่ต้องแนบต่อไป ถ้าสร้างไฟล์ไม่ได้ ให้ส่ง Markdown ฉบับเต็มใน code block เดียว';
      setPrompt(prompt,text);
      setupPromptCollapse(prompt);
      setText(hint,correct?'คำสั่งพร้อมแล้ว คัดลอกเพื่อเก็บสิ่งที่ตรวจผ่านกลับเข้า Source':'คำสั่งพร้อมแล้ว คัดลอกไปแก้ภาพ 1 รอบ แล้วตรวจจุดเดิมอีกครั้ง');
      const copy=prompt.querySelector('.cpx');
      if(copy)copy.setAttribute('aria-label',correct?'คัดลอกคำสั่งบันทึกกติกาที่ผ่าน':'คัดลอกคำสั่งแก้ภาพและอัปเดต Source');
    }else{
      setText(hint,!cause?'เลือกผลที่ตรวจได้ก่อน':!keep.value.trim()?'บอกสิ่งที่ตรวจแล้วตรงอย่างน้อย 1 ข้อ เพื่อรักษาไว้': 'ระบุจุดที่ต้องการแก้และผลที่ต้องการ แล้วคำสั่งจะพร้อมคัดลอก');
    }
    if(save){try{localStorage.setItem(TASTE_KEY,JSON.stringify({checks:checks.map(check=>check.checked),cause,change:change.value,keep:keep.value}));}catch(e){}}
  }
  checks.forEach(check=>check.addEventListener('change',()=>render(true)));
  radios.forEach(radio=>radio.addEventListener('change',()=>render(true)));
  [change,keep].forEach(field=>field.addEventListener('input',()=>render(true)));
  render(false);
}

function patchFaqAndQuest(){
  const quest=document.querySelector('.quest');
  if(!quest) return;
  quest.id='lesson2Complete';
  setText(quest.querySelector('h2'),'🎯 เควสท้ายบท · ภาพตรงเรื่อง และซอสพร้อมใช้ต่อ');
  setText(quest.querySelector(':scope > p'),'จบบทเมื่อได้ภาพ 9:16 ตรวจเทียบกับซอส และเก็บกติกาที่ใช้ได้กลับเข้าไฟล์แล้ว');
  const list=quest.querySelector('ol');
  if(list) list.innerHTML='<li>ใช้ซอสแม่สร้างซอสลูกสำหรับภาพ 1 ไฟล์</li><li>สร้างภาพ 9:16 แล้วตรวจเทียบกับซอส</li><li>แก้จุดที่เลือก 1 รอบ หรือบันทึกสิ่งที่ตรวจแล้วตรง จากนั้นเก็บกติกากลับเข้าซอสลูก</li>';
  if(!quest.querySelector('.finish')?.classList.contains('done')) setText(quest.querySelector('.finish'),'ฉันตรวจภาพและเก็บกติกาแล้ว');
  setText(quest.querySelector('.achievement'),'🥄 TASTE CHECK PASSED · ซอสใช้สร้างภาพได้จริง');
}

function apply(){
  injectStyle();
  patchTop();
  buildFastTrack();
  patchFaqAndQuest();
}

function boot(){
  apply();
  if(!window.MC_CLASSROOM_RENDER){
    requestAnimationFrame(apply);
    setTimeout(apply,250);
    setTimeout(apply,1000);
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
