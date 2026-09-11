/* AI ใส่ซอส · Lesson 3 fast video flow
   ซอสเดิม + ภาพบท 2 → ซอสวิดีโอ .md → วิดีโอ 10 วินาที 9:16
*/
(function(){
'use strict';
if(!/\/classroom\/clip-ai\.html$/.test(location.pathname)) return;

const VIDEO_SOURCE_PROMPT=`ใช้ซอสแม่ (.md) ที่แนบเป็นวัตถุดิบ แล้วสร้าง “ซอสลูก” สำหรับวิดีโอเล่าเรื่องชีวิตเจ้าของบัญชี ความยาว 10 วินาที อัตราส่วนแนวตั้ง 9:16

แหล่งข้อมูลที่ให้ใช้ เรียงตามลำดับ:
1. ซอสแม่ (.md) ที่แนบมา — ใช้เป็นฐานหลักเสมอ
2. บทสนทนาปัจจุบัน
3. ถ้าข้อมูลจาก 1 และ 2 ยังไม่พอสำหรับหัวข้อใด ให้ค้นเพิ่มจาก Memory โปรไฟล์ Personal Context หรือประวัติแชทอื่นของบัญชีนี้ เฉพาะเท่าที่ระบบเข้าถึงได้จริง
- ถ้าระบบเข้าถึงบริบทอื่นไม่ได้ ห้ามอ้างว่าเข้าถึงได้ และห้ามแต่งข้อมูลมาชดเชย
- ห้ามแต่งประวัติ ความสำเร็จ หรือเหตุการณ์ใหม่ที่ไม่มีหลักฐานจากแหล่งข้างต้น
- ถ้าข้อมูลขัดกัน ให้ยึดซอสแม่ก่อน แล้วจึงยึดข้อมูลล่าสุดที่เจ้าของยืนยันเอง

ตั้งชื่อไฟล์ว่า video-source-YYYY-MM-DD-HHmm.md โดยใช้วันและเวลาปัจจุบันขณะสร้างไฟล์
ถ้าระบบไม่รู้เวลาจริง ให้คงตัวอักษร YYYY-MM-DD-HHmm ไว้ตามนั้น เพื่อให้เจ้าของเติมเอง

สร้างไฟล์ให้ครบตามหัวข้อนี้:
# ซอสลูก (Source) สำหรับวิดีโอชีวิต — 10 วินาที
> เอกสารนี้คือ “ซอส” (Source) ของงานนี้ เก็บบริบท ลำดับภาพ และข้อห้ามไว้ครบแล้ว
> เมื่อฉันแนบไฟล์นี้แล้วสั่งสั้น ๆ ว่า “สร้างวิดีโอตามซอสนี้” ให้ถือว่า “ซอส” หมายถึงไฟล์นี้ และให้ทำงานจากไฟล์นี้ทันทีโดยไม่ต้องถามบริบทเพิ่ม
## ข้อมูลไฟล์
- ชื่อไฟล์: video-source-YYYY-MM-DD-HHmm.md
- สร้างเมื่อ: (วัน เดือน ปี และเวลาที่สร้างไฟล์นี้)
- ซอสแม่ที่ใช้: (ชื่อไฟล์ซอสแม่ที่แนบมา)
- แหล่งข้อมูลที่ใช้: (ระบุว่าส่วนไหนมาจากซอสแม่ ส่วนไหนมาจากบทสนทนา และส่วนไหนมาจากบริบทอื่น)
## เป้าหมายของวิดีโอ
- เล่าให้เห็นว่าเจ้าของบัญชีเป็นใคร ผ่านอะไรมาบ้าง และกำลังไปทางไหน
- ความยาว 10 วินาที
- ภาพแนวตั้ง 9:16

## ข้อเท็จจริงของเจ้าของเรื่อง
## Message เดียวที่คนดูควรรู้สึกได้
## Visual Direction — สี แสง อารมณ์ ฉาก และสไตล์
## ลำดับภาพ 10 วินาที
- 0–3 วินาที: จุดเริ่มต้นหรือตัวตน
- 3–7 วินาที: สิ่งที่ทำหรือจุดเปลี่ยน
- 7–10 วินาที: ทิศทางที่กำลังไป
## การเคลื่อนไหวของคน วัตถุ และกล้อง
## สิ่งที่ห้ามเปลี่ยนหรือแต่งเพิ่ม
## Definition of Done
- เล่นได้จริงเป็นวิดีโอ 1 ชิ้น
- ความยาวไม่เกิน 10 วินาที
- แนวตั้ง 9:16
- ดูแล้วเชื่อมโยงกลับมาที่เจ้าของบัญชีได้

ไม่ต้องเขียนบทพากย์ ไม่ต้องวางแผนถ่ายจริง และไม่ต้องใส่ข้อความบนจอ
ถ้าข้อมูลส่วนใดไม่มี ให้เขียนว่า “ยังไม่มีข้อมูล” และออกแบบส่วนที่เหลือจากข้อมูลจริงที่มี
ลงมือสร้าง Source ทันที ห้ามถามคำถามกลับ
ส่งออกเป็นไฟล์ .md พร้อมดาวน์โหลด โดยใช้ชื่อไฟล์ video-source-YYYY-MM-DD-HHmm.md ตามเวลาจริง
ถ้าแนบไฟล์ไม่ได้ ให้ส่ง Markdown ทั้งหมดใน code block เดียว และบอกชื่อไฟล์ที่ควรใช้บันทึกไว้ด้านบน code block`;

const VIDEO_PROMPT=`สร้างวิดีโอตามซอสนี้`;

function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

function setPrompt(el,text){
  if(!el)return;
  let button=el.querySelector('.cpx');
  if(el.hasAttribute('data-prompt-collapse')&&button&&!button.hasAttribute('data-copy-full')){
    button.remove();button=null;
  }
  const current=[...el.childNodes].filter(node=>node!==button && !(node.nodeType===1 && node.classList.contains('prompt-expand'))).map(node=>node.textContent||'').join('').trim();
  if(current!==text.trim()){
    [...el.childNodes].forEach(node=>{if(node!==button && !(node.nodeType===1 && node.classList.contains('prompt-expand')))node.remove()});
    if(el.hasAttribute('data-prompt-collapse')){
      const promptCopy=document.createElement('span');
      promptCopy.className='prompt-copy';promptCopy.textContent=text;
      el.insertBefore(promptCopy,button||null);
    }else{
      el.insertBefore(document.createTextNode(text),button||null);
    }
  }
  el.dataset.copyText=text;
  if(button)return;
  const copyLabel='คัดลอก';
  button=document.createElement('button');
  button.type='button';button.className='cpx';button.textContent=copyLabel;button.setAttribute('aria-label','คัดลอกคำสั่ง');
  button.setAttribute('data-copy-full','true');
  button.addEventListener('click',async()=>{
    let ok=false;
    try{await navigator.clipboard.writeText(el.dataset.copyText);ok=true}catch(error){}
    if(!ok){
      const area=document.createElement('textarea');area.value=el.dataset.copyText;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0;pointer-events:none';
      document.body.append(area);area.select();
      try{ok=document.execCommand('copy')}catch(error){}
      area.remove();
    }
    button.textContent=ok?'✓ คัดลอกแล้ว':'คัดลอกไม่สำเร็จ';
    setTimeout(()=>button.textContent=copyLabel,1400);
  });
  el.append(button);
}

function setupPromptCollapse(el){
  if(!el)return;
  if(!document.getElementById('prompt-collapse-style-v3')){
    const style=document.createElement('style');style.id='prompt-collapse-style-v3';
    style.textContent='.prompt-collapsible{padding-bottom:54px}.prompt-copy{display:block}.prompt-collapsible:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden}.prompt-expand{position:absolute;left:14px;bottom:10px;z-index:2;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif;font-size:11px;font-weight:700;cursor:pointer}.prompt-expand:hover{background:rgb(255 255 255/.13)}';
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
  if(!el.hasAttribute('data-expanded'))el.dataset.expanded='false';
  const copy=el.querySelector('.cpx');
  if(copy)copy.textContent='คัดลอก';
  let toggle=el.querySelector('.prompt-expand');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';toggle.className='prompt-expand';toggle.setAttribute('aria-label','ขยายอ่าน Prompt ทั้งหมด');
    toggle.addEventListener('click',()=>{
      const expanded=el.dataset.expanded==='true';
      el.dataset.expanded=expanded?'false':'true';
      toggle.setAttribute('aria-expanded',expanded?'false':'true');
      toggle.setAttribute('aria-label',expanded?'ขยายอ่าน Prompt ทั้งหมด':'ย่อ Prompt');
      toggle.textContent=expanded?'ขยายอ่าน Prompt':'ย่อ Prompt';
      if(expanded&&el.getBoundingClientRect().top<0)el.scrollIntoView({block:'start',behavior:'smooth'});
    });
    el.append(toggle);
  }
  const expanded=el.dataset.expanded==='true';
  toggle.setAttribute('aria-expanded',expanded?'true':'false');
  toggle.setAttribute('aria-label',expanded?'ย่อ Prompt':'ขยายอ่าน Prompt ทั้งหมด');
  toggle.textContent=expanded?'ย่อ Prompt':'ขยายอ่าน Prompt';
}

function injectStyle(){
  if(document.getElementById('lesson3-video-fast-style'))return;
  const style=document.createElement('style');style.id='lesson3-video-fast-style';
  style.textContent=`
    .video-fast{margin:18px 0 28px}
    .video-ready,.video-repair{margin:15px 0;padding:18px;border:1px solid rgb(var(--green)/.22);border-radius:17px;background:#fff}
    .video-ready h2,.video-repair h3{font-family:"Bai Jamjuree",sans-serif;font-size:18px;color:rgb(var(--deep))}
    .video-ready p,.video-repair p{margin-top:7px;font-size:14px!important;line-height:1.7!important;color:rgb(var(--muted))}
    .video-ready ul{margin:12px 0;padding-left:22px;font-size:14px;line-height:1.75}
    .video-ready__links,.video-repair__choices{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .video-ready__links a,.video-repair__choices button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 13px;border:1px solid rgb(var(--green)/.32);border-radius:11px;background:#fff;color:rgb(var(--green));font:700 13px/1.5 "Bai Jamjuree",sans-serif;text-decoration:none;cursor:pointer}
    .video-repair__choices button[aria-pressed="true"]{background:rgb(var(--green));color:#fff}
    .video-repair__result{margin-top:12px;padding:13px;border-radius:12px;background:rgb(var(--green)/.055)}
    .video-repair__result[hidden]{display:none!important}
    .video-repair__result .prompt{margin-top:12px}
    .video-done-status{margin-top:12px;font-size:13px!important;color:rgb(var(--green))!important}

    .video-fast__intro{padding:19px 21px;border:1px solid rgb(var(--green)/.24);border-radius:17px;background:linear-gradient(135deg,rgb(var(--green)/.08),rgb(var(--gold)/.09))}
    .video-fast__intro b{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:18px;color:rgb(var(--deep))}
    .video-fast__intro p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .video-fast__why{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:13px}
    .video-fast__why div{padding:13px;border:1px solid rgb(var(--ink)/.1);border-radius:13px;background:#fff}
    .video-fast__why b{display:block;color:rgb(var(--green));font-size:14px}.video-fast__why p{margin-top:3px;color:rgb(var(--muted));font-size:13px!important;line-height:1.65!important}
    .video-fast__steps{display:grid;gap:12px;margin-top:14px}
    .video-step{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:18px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:#fff;box-shadow:0 9px 26px rgb(18 40 28/.05)}
    .video-step__num{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgb(var(--green));color:#fff;font-weight:850}
    .video-step h3{font-family:"Bai Jamjuree",sans-serif;font-size:18px;line-height:1.4}.video-step>div>p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .video-ingredients{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
    .video-ingredients span{padding:7px 11px;border:1px solid rgb(var(--gold)/.34);border-radius:999px;background:rgb(var(--gold)/.08);font-size:13px;font-weight:700;color:#705119}
    .video-sauce-alert{margin:12px 0;padding:13px 15px;border:2px solid #c93434;border-radius:13px;background:#fff1f1;color:#7d1717;box-shadow:0 7px 20px rgb(153 25 25/.08)}
    .video-sauce-alert strong{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:15px;color:#a31717}.video-sauce-alert span{display:block;margin-top:2px;font-size:13px;line-height:1.6}
    .source-warning{margin:14px 0 16px;padding:15px 17px;border:2px solid #c53a34;border-radius:14px;background:#fff1ef;color:#872620}
    .source-warning b{display:block;font:800 14px "Bai Jamjuree",sans-serif}
    .source-warning p{margin-top:5px;font-size:13.5px!important;line-height:1.65!important;color:#872620!important}
    .prompt-collapsible{padding-bottom:54px}
    .prompt-copy{display:block}
    .prompt-collapsible:not([data-expanded="true"]) .prompt-copy{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:3.44em;overflow:hidden}
    .prompt-expand{position:absolute;left:14px;bottom:10px;z-index:2;border:1px solid rgb(215 245 226/.3);border-radius:8px;padding:5px 10px;background:rgb(255 255 255/.07);color:#d7f5e2;font-family:"Bai Jamjuree",sans-serif;font-size:11px;font-weight:700;cursor:pointer}
    .prompt-expand:hover{background:rgb(255 255 255/.13)}
    .video-short{margin-top:12px;padding:14px;border:1px solid rgb(var(--green)/.2);border-radius:14px;background:rgb(var(--green)/.055)}
    .video-short b{display:block;color:rgb(var(--green));font-size:14px}.video-short p{font-size:13px!important;color:rgb(var(--muted))}
    .video-done{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .video-done label{display:flex;gap:9px;align-items:flex-start;padding:11px 12px;border:1px solid rgb(var(--ink)/.1);border-radius:12px;background:rgb(var(--paper)/.5);font-size:13px;line-height:1.55;cursor:pointer}
    .video-done input{width:18px;height:18px;margin-top:2px;accent-color:rgb(var(--green));flex:none}
    .video-example{margin-top:15px;padding:18px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:rgb(var(--paper)/.55)}
    .video-example>h2{font-family:"Bai Jamjuree",sans-serif;font-size:20px;color:rgb(var(--deep))}.video-example>p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .video-example__grid{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:18px;align-items:center;margin-top:14px}
    .video-example__media{overflow:hidden;margin:0;border:1px solid rgb(var(--ink)/.12);border-radius:15px;background:#fff}
    .video-example video{display:block;width:100%;aspect-ratio:9/16;max-height:570px;background:#07180f;object-fit:contain}
    .video-example video:not([src]){aspect-ratio:1;background:#fff}
    .video-example__play{display:block;min-height:46px;width:calc(100% - 24px);margin:12px;padding:10px 14px;border:0;border-radius:11px;background:rgb(var(--green));color:#fff;font:750 14px/1.5 "Bai Jamjuree",sans-serif;cursor:pointer}
    .video-example__play[hidden]{display:none!important}
    .video-example__play:disabled{opacity:.65;cursor:wait}
    .video-example__status:empty{display:none}
    .video-example__status{margin:0 14px 12px;font-size:13px!important;color:rgb(var(--muted))}
    .video-example figcaption{padding:13px 14px}.video-example figcaption b{display:block;font-family:"Bai Jamjuree",sans-serif;color:rgb(var(--deep));font-size:15px}.video-example figcaption span{display:block;margin-top:3px;color:rgb(var(--muted));font-size:13px;line-height:1.65}
    .video-example__note{padding:17px;border:1px solid rgb(var(--gold)/.3);border-radius:15px;background:rgb(var(--gold)/.075)}
    .video-example__note h3{font-family:"Bai Jamjuree",sans-serif;font-size:18px;color:#6c4c13}.video-example__note>p{margin-top:5px;color:rgb(var(--muted));font-size:14px!important}
    .video-example__note ol{display:grid;gap:9px;margin:14px 0 0;padding:0;list-style:none;counter-reset:video-fix}
    .video-example__note li{position:relative;padding:10px 11px 10px 42px;border-radius:11px;background:#fff;color:rgb(var(--ink));font-size:13px;line-height:1.65;counter-increment:video-fix}
    .video-example__note li::before{content:counter(video-fix);position:absolute;left:11px;top:10px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgb(var(--green));color:#fff;font-size:12px;font-weight:800}
    .video-example__luck{margin-top:12px!important;padding:11px 13px;border-left:4px solid rgb(var(--gold));border-radius:8px;background:#fff;color:#5f4516!important;font-weight:700}
    .video-optional{margin-top:15px;border:1px solid rgb(var(--gold)/.36);border-radius:17px;background:rgb(var(--gold)/.07);overflow:hidden}
    .video-optional summary{cursor:pointer;padding:16px 18px;font-family:"Bai Jamjuree",sans-serif;font-weight:800;color:#6f5119;list-style:none}
    .video-optional summary::-webkit-details-marker{display:none}.video-optional summary::after{content:'＋';float:right;font-size:20px}.video-optional[open] summary::after{content:'−'}
    .video-optional__body{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 16px}
    .video-optional__intro{grid-column:1/-1;padding:12px 14px;border-radius:12px;background:rgb(var(--green)/.08);color:rgb(var(--muted));font-size:13px;line-height:1.65}
    .video-option{padding:15px;border:1px solid rgb(var(--ink)/.1);border-radius:14px;background:#fff}
    .video-option b{display:block;color:rgb(var(--deep));font-size:15px}.video-option p{margin-top:4px;color:rgb(var(--muted));font-size:13px!important;line-height:1.65!important}.video-option em{display:inline-block;margin-top:7px;color:rgb(var(--green));font-size:12px;font-style:normal;font-weight:750}
    @media(max-width:720px){.video-fast__why,.video-done,.video-example__grid,.video-optional__body{grid-template-columns:1fr}.video-step{grid-template-columns:32px 1fr;padding:16px 14px}}
  `;
  document.head.append(style);
}

function patchTop(){
  document.title='บทที่ 3 · Cook · เอาซอสไปทำจานจริง · AI ใส่ซอส';
  const description=document.querySelector('meta[name="description"]');
  if(description)description.content='ใช้ซอส .md และภาพจากบท 2 ทำซอสวิดีโอ แล้วสร้างวิดีโอแนวตั้ง 9:16 ความยาว 10 วินาทีโดยไม่ต้องถ่ายหรือเขียนบท';
  const head=document.querySelector('.head');
  if(head){
    setText(head.querySelector('.lead'),'เปลี่ยนซอส .md และภาพจากบท 2 ให้เป็นวิดีโอแนวตั้ง 9:16 ความยาว 10 วินาที — ไม่ต้องถ่าย ไม่ต้องเขียนบท');
    const meta=[...head.querySelectorAll('.meta span')];
    ['⏱️ ลงมือ 10–15 นาที + เวลารอสร้าง','🧴 ซอส .md + ภาพบท 2','🎬 ได้วิดีโอ 1 ชิ้น','📱 แนวตั้ง 9:16'].forEach((txt,i)=>setText(meta[i],txt));
    const labels=[...head.querySelectorAll('.hero-label')];
    ['<b>ซอส .md</b>ข้อมูลชีวิต','<b>ภาพบท 2</b>ทิศทางภาพ','<b>ซอสวิดีโอ</b>บริบท 10 วินาที','<b>สร้างวิดีโอ</b>คำสั่งสั้น','<b>เล่นได้จริง</b>9:16 · ไม่เกิน 10 วิ'].forEach((html,i)=>{if(labels[i]&&labels[i].innerHTML!==html)labels[i].innerHTML=html});
  }
  const tldr=document.querySelector('.tldr');
  if(tldr){
    setText(tldr.querySelector('.tldr-main h2'),'ซอสเข้มข้น → คำสั่งสั้น → วิดีโอจริง 1 ชิ้น');
    setText(tldr.querySelector('.tldr-main p'),'วันนี้ไม่ทำเอกสารเตรียมงานหลายชั้น ไม่เขียนสคริปต์ และไม่ต้องถ่ายเอง เราจะใส่รายละเอียดทั้งหมดไว้ในซอสวิดีโอ แล้วใช้คำสั่งสั้น ๆ ให้ระบบสร้างงาน');
    const take=[...tldr.querySelectorAll('.takehome span')];
    ['🧴 ซอสวิดีโอ .md','🖼️ ใช้ภาพจากบท 2','🎬 10 วินาที','📱 9:16'].forEach((txt,i)=>setText(take[i],txt));
  }
}

function buildFastTrack(){
  const tldr=document.querySelector('.tldr');if(!tldr)return;
  let fast=document.getElementById('lesson3VideoFast');
  if(!fast){
    fast=document.createElement('section');fast.id='lesson3VideoFast';fast.className='video-fast';
    fast.innerHTML=`
      <div class="video-fast__intro"><b>เป้าหมายเดียวของบทนี้: กดสร้างแล้วได้วิดีโอ 1 ชิ้น</b><p>ซอสที่ดีต้องบอกบริบทและวิธีทำงานแทนเราได้ จึงไม่ต้องแบกคำอธิบายยาว ๆ ไปไว้ในคำสั่งสุดท้าย</p></div>
      <div class="video-fast__why"><div><b>ไม่ต้องถ่าย</b><p>ใช้ภาพจากบท 2 เป็นวัตถุดิบทางภาพได้เลย</p></div><div><b>ไม่ต้องเขียนบท</b><p>เรื่องราวและลำดับ 10 วินาทีอยู่ในซอสวิดีโอ</p></div><div><b>ไม่ต้องจำ Prompt</b><p>คำสั่งสุดท้ายมีเพียงหนึ่งบรรทัด</p></div></div>
      <figure class="sauce-flow"><span class="sauce-flow__frame"><img src="/classroom/img/sauce-flow-3step.jpeg" width="1600" height="800" loading="lazy" decoding="async" alt="สามขั้นตอนของการปรุงจากซอส · ขั้นที่ 1 ใช้ซอสแม่สกัดซอสลูก · ขั้นที่ 2 ใช้ซอสลูกสร้างงาน เช่น สไลด์ เอกสาร หรือภาพ · ขั้นที่ 3 ตรวจงานที่ได้จากซอสว่าตรงเป้าหมาย ครบถ้วน ชัดเจน และพร้อมใช้"></span><figcaption class="sauce-flow__cap">ทุกบทตั้งแต่นี้ไปใช้จังหวะเดียวกัน — ซอสแม่ให้ซอสลูก ซอสลูกให้งาน แล้วตรวจงานกลับไปที่ซอส</figcaption></figure>
      <section class="video-ready" id="lesson3Ready" aria-labelledby="lesson3ReadyTitle">
        <h2 id="lesson3ReadyTitle">ก่อนกดสร้าง เตรียม 2 ไฟล์และเช็กเครื่องมือ</h2>
        <ul><li><b>ซอสแม่ .md จากบท 1</b> ที่ตรวจแล้วว่าเป็นเรื่องของคุณ</li><li><b>ภาพจากบท 2</b> เก็บไว้ในเครื่องเพื่อแนบในขั้น 2</li><li><b>เครื่องมือที่สร้างวิดีโอจากภาพได้</b> และอ่านไฟล์หรือข้อความซอสได้</li></ul>
        <p>เช็กก่อนว่าบัญชีของคุณมีปุ่มสร้างวิดีโอและโควตาเหลือ ฟีเจอร์และค่าใช้จ่ายขึ้นกับเครื่องมือและบัญชี ถ้ายังสร้างไม่ได้ เก็บซอสวิดีโอจากขั้น 1 ไว้ แล้วกลับมาทำต่อได้</p>
        <div class="video-ready__links"><a href="lesson-0.html">ดูเครื่องมือและเปิดบัญชี ↗</a><a href="free-ai.html">หยิบซอสจากบท 1</a><a href="image-ai.html">เตรียมภาพจากบท 2</a></div>
      </section>
      <div class="video-fast__steps">
        <article class="video-step" id="lesson3SourceStep"><span class="video-step__num">1</span><div><h3>ใช้ซอสแม่ สกัดซอสลูกสำหรับวิดีโอ</h3><p>แนบ<b>ซอสแม่</b>ที่มีข้อมูลชีวิต แล้วใช้ Prompt นี้สร้างซอสลูกสำหรับวิดีโอโดยเฉพาะ ผลลัพธ์คือ <code>video-source-YYYY-MM-DD-HHmm.md</code> ที่มีวันเวลากำกับไว้ในชื่อ</p><div class="video-ingredients"><span>🧴 ซอสแม่ .md</span><span>⏱️ 10 วินาที</span><span>📱 9:16</span></div><div class="video-sauce-alert"><strong>ห้ามลืมแนบซอสแม่</strong><span>ขั้นนี้แนบเฉพาะซอสแม่ .md ก่อนวาง Prompt Prompt ใช้ข้อมูลที่ AI เข้าถึงได้จริงเท่านั้น ถ้ายังขาดจะระบุไว้ให้คุณตรวจ</span></div><div class="prompt" data-video-prompt="source" data-prompt-guard="off" data-prompt-collapse></div></div></article>
        <article class="video-step"><span class="video-step__num">2</span><div><h3>เปิดแชทใหม่ที่สร้างวิดีโอได้</h3><p>แนบวัตถุดิบ <b>2 อย่างให้ครบ</b> แล้ววางคำสั่งสั้นด้านล่าง รายละเอียดการเล่าเรื่องอยู่ในซอส ส่วนภาพใช้กำหนดหน้าตาและบรรยากาศ</p><div class="video-ingredients"><span>🧴 video-source-____.md จากข้อ 1</span><span>🖼️ ภาพที่สร้างจากบท 2</span></div><div class="source-warning"><b>⚠️ อย่าลืมแนบซอส (.md)</b><p>ถ้าไม่แนบไฟล์จากข้อ 1 คำว่า “ซอสนี้” จะไม่มี Source ให้ AI อ้างอิง และ การแนบภาพจากบท 2 จะทำให้ Video แม่นยำขึ้น</p></div><div class="prompt" data-video-prompt="generate" data-prompt-guard="off"></div><div class="video-short"><b>ทำไมสั้นได้</b><p>เพราะซอสระบุเรื่องราว ลำดับภาพ 10 วินาที สัดส่วน 9:16 การเคลื่อนไหว และข้อห้ามไว้ครบแล้ว</p></div></div></article>
        <article class="video-step" id="lesson3VideoCheck"><span class="video-step__num">3</span><div><h3>กดสร้าง แล้วเช็กว่าเล่นได้จริง</h3><p>จบบทเมื่อมีไฟล์วิดีโอที่เปิดดูได้ ไม่ต้องพากย์ ไม่ต้องตัดต่อ และไม่ต้องถ่ายเพิ่ม</p><div class="video-done"><label><input type="checkbox"><span>เปิดเล่นเป็นวิดีโอได้จริง</span></label><label><input type="checkbox"><span>ความยาวไม่เกิน 10 วินาที</span></label><label><input type="checkbox"><span>เป็นภาพแนวตั้ง 9:16</span></label><label><input type="checkbox"><span>ชี้ได้ 1 จุดว่าเล่าเรื่องของฉันตรง และไม่มีประวัติที่ AI แต่งเพิ่ม</span></label></div><p class="video-done-status" id="lesson3CheckStatus" role="status" aria-live="polite"></p></div></article>
      </div>
      <section class="video-example" id="lesson3VideoExample" aria-labelledby="lesson3VideoExampleTitle">
        <h2 id="lesson3VideoExampleTitle">ตัวอย่างผลลัพธ์จากซอส</h2><p>รูปแบบเดียวกับตัวอย่างภาพในบท 2: ดูผลงานจริงแนวตั้ง 9:16 ก่อน แล้วค่อยชิมว่าซอสเล่าเรื่องได้ตรงแค่ไหน</p>
        <div class="video-example__grid">
          <figure class="video-example__media"><video playsinline preload="none" poster="/classroom/img/header-lesson3.webp" data-video-example aria-label="วิดีโอตัวอย่างบทที่ 3"></video><button class="video-example__play" type="button" data-video-play>▶ เล่นคลิปตัวอย่าง</button><p class="video-example__status" data-video-status role="status" aria-live="polite"></p><figcaption><b>🎬 วิดีโอที่สร้างจากซอส</b><span>กดเล่นเพื่อดูแนวทางการเล่าเรื่องและคุณภาพผลลัพธ์ก่อนทำของตัวเอง</span></figcaption></figure>
          <div class="video-example__note"><h3>ดูให้เห็น 1 จุดที่อยากเก็บไว้</h3><p>คลิปนี้ช่วยให้เห็นลำดับภาพและจังหวะ 10 วินาที ก่อนทำของคุณ ลองเลือกว่าชอบสี แสง หรือการเคลื่อนไหวตรงไหน</p><p>AI อาจทำคน วัตถุ หรือภาพเคลื่อนไหวผิดได้ เมื่อคลิปของคุณออกมา ให้ดูรอบหนึ่งแล้วเลือกแก้ทีละจุดด้านล่าง</p><p class="video-example__luck">เวลารอสร้างและโควตาต่างกันตามเครื่องมือ เก็บรอบแรกไว้เปรียบเทียบก่อนสร้างรอบถัดไป</p></div>
        </div>
      </section>
      <section class="video-repair" id="lesson3Repair" aria-labelledby="lesson3RepairTitle">
        <h3 id="lesson3RepairTitle">รอบแรกยังไม่ตรง? เลือกแก้เพียง 1 จุด</h3>
        <p>ดูว่าปัญหาอยู่ที่เรื่องราว ภาพ หรือรูปแบบ แล้วคัดลอกคำสั่งตัวอย่างไปปรับกับคลิปของคุณ</p>
        <div class="video-repair__choices" role="group" aria-label="เลือกจุดที่อยากแก้"><button type="button" data-video-repair="story" aria-pressed="false">เรื่องราวไม่ตรง</button><button type="button" data-video-repair="visual" aria-pressed="false">ภาพหรือการเคลื่อนไหวเพี้ยน</button><button type="button" data-video-repair="format" aria-pressed="false">สัดส่วนหรือเวลาผิด</button></div>
        <div class="video-repair__result" id="lesson3RepairResult" hidden><p id="lesson3RepairHint" role="status" aria-live="polite"></p><div class="prompt" data-video-prompt="repair" data-prompt-guard="off"></div></div>
      </section>
      <details class="video-optional"><summary>เปิดขั้น 4–5 (Optional) · เชื่อมวิดีโอกับตัวตนมากขึ้น</summary><div class="video-optional__body"><p class="video-optional__intro">สองขั้นนี้ช่วยให้งานเชื่อมโยงกับตัวตนผ่านเสียงและภาพจริงมากขึ้น แต่ไม่บังคับ ถ้าต้องการใช้ Video AI ล้วนก็จบบทได้</p><div class="video-option"><b>4 · ใส่ CapCut แล้วพูดด้วยเสียงของคุณ</b><p>นำวิดีโอที่ได้เข้า CapCut แล้วอัดเสียงพูดทับ ถ้าคิดคำพูดไม่ออก ให้ AI ช่วยร่างสคริปต์จากซอส แล้วปรับให้เป็นคำที่คุณพูดจริง</p><em>เพิ่มเสียงและมุมมองของเจ้าของเรื่อง</em></div><div class="video-option"><b>5 · ตัดต่อผสมกับคลิปจริง</b><p>แทรกคลิปจริงของคุณเป็นภาพประกอบการพูด เช่น มือทำงาน โต๊ะ สถานที่ หรือช่วงชีวิตที่เกี่ยวข้อง ไม่ต้องถ่ายใหม่ครบทุกฉาก</p><em>เพิ่มหลักฐานและบรรยากาศจากชีวิตจริง</em></div></div></details>
      <div class="chef-note"><b>เชฟชิมแล้ว</b><p>วันนี้ขอแค่ได้วิดีโอที่เปิดเล่นได้หนึ่งชิ้นก็ผ่านค่ะ เสียงและภาพถ่ายจริงเป็นเควสเพิ่ม อยากทำเมื่อไรค่อยเปิดค่ะ</p></div>`;
    tldr.insertAdjacentElement('afterend',fast);
  }
  setupPractice(fast);
  const sourcePrompt=fast.querySelector('[data-video-prompt="source"]');
  sourcePrompt?.setAttribute('data-prompt-collapse','');
  setPrompt(sourcePrompt,VIDEO_SOURCE_PROMPT);
  setupPromptCollapse(sourcePrompt);
  setPrompt(fast.querySelector('[data-video-prompt="generate"]'),VIDEO_PROMPT);
  if(fast.dataset.legacyRemoved!=='true'){
    let node=fast.nextElementSibling;
    while(node&&!node.classList.contains('quest')){const next=node.nextElementSibling;node.remove();node=next}
    fast.dataset.legacyRemoved='true';
  }
}

function setupPractice(fast){
  if(fast.dataset.practiceReady==='true')return;
  fast.dataset.practiceReady='true';
  const video=fast.querySelector('[data-video-example]');
  const play=fast.querySelector('[data-video-play]');
  play.addEventListener('click',async()=>{
    if(!window.__LESSON3_VIDEO_EXAMPLE__)return;
    play.disabled=true;
    setText(fast.querySelector('[data-video-status]'),'กำลังเปิดคลิปตัวอย่าง…');
    if(!video.hasAttribute('src'))video.src=window.__LESSON3_VIDEO_EXAMPLE__;
    video.controls=true;
    try{
      await video.play();
      play.hidden=true;
      setText(fast.querySelector('[data-video-status]'),'');
    }catch(error){
      setText(fast.querySelector('[data-video-status]'),'ยังเล่นไม่ได้ ลองกดเล่นอีกครั้งเมื่อเชื่อมต่อพร้อม');
    }finally{play.disabled=false}
  });
  const checks=[...fast.querySelectorAll('.video-done input')];
  const key='mc-lesson3-video-check-v1';
  try{const saved=localStorage.getItem(key)||'';checks.forEach((check,i)=>{check.checked=saved[i]==='1'})}catch(error){}
  function updateChecks(){
    const count=checks.filter(check=>check.checked).length;
    setText(fast.querySelector('#lesson3CheckStatus'),count===checks.length?'ตรวจครบ 4 จุดแล้ว เก็บวิดีโอนี้ไว้ใช้ต่อในบทถัดไป':'ตรวจแล้ว '+count+' / 4 จุด · จำรายการที่ติ๊กไว้ในเครื่องนี้');
    try{localStorage.setItem(key,checks.map(check=>check.checked?'1':'0').join(''))}catch(error){}
  }
  checks.forEach(check=>check.addEventListener('change',updateChecks));
  updateChecks();
  const repairs={
    story:{hint:'ถ้า AI แต่งเหตุการณ์ใหม่ ให้แก้ข้อเท็จจริงในซอสวิดีโอก่อน แล้วแนบฉบับแก้พร้อมภาพเดิม ข้อความใน [ ] ให้เปลี่ยนเป็นเรื่องของคุณ',prompt:'ปรับวิดีโอนี้ตาม Source ฉบับแก้ที่แนบ คงสไตล์ภาพและจังหวะที่ผ่านแล้ว เปลี่ยนเฉพาะเหตุการณ์ [สิ่งที่ AI เล่าผิด] เป็น [ข้อเท็จจริงใน Source] ห้ามเพิ่มประวัติหรือเหตุการณ์ใหม่'},
    visual:{hint:'บอกตำแหน่งที่ผิดให้ชัด และคงส่วนที่ชอบไว้ ถ้าเครื่องมือไม่มีโหมดแก้ ให้ใช้คำสั่งนี้ประกอบซอสในการสร้างรอบใหม่ ข้อความใน [ ] ให้เปลี่ยนก่อนส่ง',prompt:'คงเรื่องราว สี แสง และส่วนที่ผ่านแล้วตาม Source แก้เฉพาะ [วัตถุหรือช่วงเวลาที่เพี้ยน] ให้ [ลักษณะที่ต้องการ] รักษาความยาวไม่เกิน 10 วินาทีและแนวตั้ง 9:16'},
    format:{hint:'ตรวจค่าความยาวและสัดส่วนในเครื่องมือก่อนเริ่มรอบใหม่ แล้วใช้คำสั่งย้ำรูปแบบโดยคงเรื่องเดิม',prompt:'คงเรื่องราวและทิศทางภาพตาม Source ที่แนบ ปรับเฉพาะรูปแบบเป็นวิดีโอแนวตั้ง 9:16 ความยาวไม่เกิน 10 วินาที ให้ตัวละครหลักอยู่ครบในกรอบแนวตั้ง'}
  };
  fast.querySelectorAll('[data-video-repair]').forEach(button=>button.addEventListener('click',()=>{
    const repair=repairs[button.dataset.videoRepair];
    if(!repair)return;
    fast.querySelectorAll('[data-video-repair]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    fast.querySelector('#lesson3RepairResult').hidden=false;
    setText(fast.querySelector('#lesson3RepairHint'),repair.hint);
    setPrompt(fast.querySelector('[data-video-prompt="repair"]'),repair.prompt);
  }));
}

function patchQuest(){
  const quest=document.querySelector('.quest');if(!quest)return;
  quest.id='lesson3Complete';
  setText(quest.querySelector('h2'),'🎯 เควสท้ายบท · สร้างวิดีโอจากซอสให้ได้ 1 ชิ้น');
  setText(quest.querySelector(':scope > p'),'ไม่ต้องถ่าย ไม่ต้องพากย์ และไม่ต้องตัดต่อ จบบทเมื่อวิดีโอแนวตั้ง 9:16 ความยาวไม่เกิน 10 วินาทีเปิดเล่นได้จริง');
  const list=quest.querySelector('ol');
  const steps='<li>แนบซอส .md แล้วใช้ Prompt สร้างไฟล์ video-source.md</li><li>เปิดแชทใหม่ที่สร้างวิดีโอได้ แล้วแนบ video-source.md พร้อมภาพที่สร้างจากบท 2</li><li>วางคำสั่งสั้นจากข้อ 2 แล้วกดสร้าง</li><li>เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16 (บางครั้ง AI ชอบทำแนวนอนให้เอง)</li>';
  if(list&&list.innerHTML!==steps)list.innerHTML=steps;
  const finish=quest.querySelector('.finish');
  setText(finish,finish?.disabled?'✓ ผ่านบทที่ 3 แล้ว':'ฉันมีวิดีโอจากซอสแล้ว');
  setText(quest.querySelector('.achievement'),'🍽️ COOK PASSED · ซอสสร้างวิดีโอได้จริง');
}

function apply(){injectStyle();patchTop();buildFastTrack();patchQuest()}
function boot(){apply();requestAnimationFrame(apply);setTimeout(apply,250);setTimeout(apply,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
