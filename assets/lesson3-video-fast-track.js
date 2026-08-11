/* AI ใส่ซอส · Lesson 3 fast video flow
   ซอสเดิม + ภาพบท 2 → ซอสวิดีโอ .md → วิดีโอ 10 วินาที 9:16
*/
(function(){
'use strict';
if(!/\/classroom\/clip-ai\.html$/.test(location.pathname)) return;

const VIDEO_SOURCE_PROMPT=`ใช้ Source .md และภาพจากบท 2 ที่แนบเป็นวัตถุดิบ แล้วสร้าง Source ใหม่สำหรับวิดีโอเล่าเรื่องชีวิตเจ้าของบัญชี ความยาว 10 วินาที อัตราส่วนแนวตั้ง 9:16

ใช้เฉพาะข้อเท็จจริงจาก Source เดิม และใช้ภาพที่แนบเป็นทิศทางด้านบุคคล สี ฉาก และบรรยากาศ ห้ามแต่งประวัติ ความสำเร็จ หรือเหตุการณ์ใหม่

สร้างไฟล์ชื่อ life-video-source.md ให้ครบตามหัวข้อนี้:
# Life Video Source — 10 Seconds
## เป้าหมายของวิดีโอ
- เล่าให้เห็นว่าเจ้าของบัญชีเป็นใคร ผ่านอะไรมาบ้าง และกำลังไปทางไหน
- ความยาว 10 วินาที
- ภาพแนวตั้ง 9:16

## ข้อเท็จจริงของเจ้าของเรื่อง
## Message เดียวที่คนดูควรรู้สึกได้
## ภาพอ้างอิงที่แนบและรายละเอียดที่ต้องรักษา
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
ส่งออกเป็นไฟล์ .md พร้อมดาวน์โหลด ถ้าแนบไฟล์ไม่ได้ ให้ส่ง Markdown ทั้งหมดใน code block เดียว`;

const VIDEO_PROMPT=`สร้างวิดีโอตาม Source นี้`;

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
  if(button)return;
  const copyLabel=el.hasAttribute('data-prompt-collapse')?'Copy Prompt':'คัดลอก';
  button=document.createElement('button');
  button.type='button';button.className='cpx';button.textContent=copyLabel;button.setAttribute('aria-label','คัดลอกคำสั่ง');
  button.setAttribute('data-copy-full','true');
  button.addEventListener('click',async()=>{
    let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true}catch(error){}
    if(!ok){
      const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0;pointer-events:none';
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
  if(copy)copy.textContent='Copy Prompt';
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
    .video-example{margin-top:15px;padding:18px;border:1px solid rgb(var(--green)/.22);border-radius:18px;background:linear-gradient(145deg,#fff,rgb(var(--green)/.045));box-shadow:0 10px 28px rgb(18 40 28/.06)}
    .video-example__head b{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:19px;color:rgb(var(--deep))}.video-example__head p{margin-top:4px;color:rgb(var(--muted));font-size:14px!important}
    .video-example__grid{display:grid;grid-template-columns:minmax(280px,1.05fr) 1fr;gap:18px;align-items:center;margin-top:14px}
    .video-example video{display:block;width:100%;aspect-ratio:16/9;border-radius:16px;background:#07180f;object-fit:contain;box-shadow:0 14px 32px rgb(4 30 18/.18)}
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
    .video-option{padding:15px;border:1px solid rgb(var(--ink)/.1);border-radius:14px;background:#fff}
    .video-option b{display:block;color:rgb(var(--deep));font-size:15px}.video-option p{margin-top:4px;color:rgb(var(--muted));font-size:13px!important;line-height:1.65!important}.video-option em{display:inline-block;margin-top:7px;color:rgb(var(--green));font-size:12px;font-style:normal;font-weight:750}
    @media(max-width:720px){.video-fast__why,.video-done,.video-example__grid,.video-optional__body{grid-template-columns:1fr}.video-step{grid-template-columns:32px 1fr;padding:16px 14px}}
  `;
  document.head.append(style);
}

function patchTop(){
  document.title='บทที่ 3 · Cook · เปลี่ยนซอสเป็นวิดีโอ 10 วินาที · AI ใส่ซอส';
  const description=document.querySelector('meta[name="description"]');
  if(description)description.content='ใช้ซอส .md และภาพจากบท 2 ทำซอสวิดีโอ แล้วสร้างวิดีโอแนวตั้ง 9:16 ความยาว 10 วินาทีโดยไม่ต้องถ่ายหรือเขียนบท';
  const head=document.querySelector('.head');
  if(head){
    setText(head.querySelector('.lead'),'เปลี่ยนซอส .md และภาพจากบท 2 ให้เป็นวิดีโอแนวตั้ง 9:16 ความยาว 10 วินาที — ไม่ต้องถ่าย ไม่ต้องเขียนบท');
    const meta=[...head.querySelectorAll('.meta span')];
    ['⏱️ 10–15 นาที','🧴 ซอส .md + ภาพบท 2','🎬 ได้วิดีโอ 1 ชิ้น','📱 แนวตั้ง 9:16'].forEach((txt,i)=>setText(meta[i],txt));
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
      <div class="video-fast__steps">
        <article class="video-step"><span class="video-step__num">1</span><div><h3>ทำซอสวิดีโอ .md</h3><p>นำข้อมูลดิบสองอย่างจากบทก่อนมาแนบในแชทที่อ่านไฟล์ได้ แล้วใช้ Prompt นี้สร้างซอสใหม่สำหรับวิดีโอโดยเฉพาะ</p><div class="video-ingredients"><span>🧴 ซอส .md</span><span>🖼️ ภาพจากบท 2</span><span>⏱️ 10 วินาที</span><span>📱 9:16</span></div><div class="video-sauce-alert"><strong>ห้ามลืมแนบซอส</strong><span>แนบซอส .md พร้อมภาพจากบท 2 ให้ครบก่อนวาง Prompt ไม่อย่างนั้นระบบจะไม่มีข้อมูลชีวิตเจ้าของบัญชีสำหรับทำวิดีโอ</span></div><div class="prompt" data-video-prompt="source" data-prompt-collapse></div></div></article>
        <article class="video-step"><span class="video-step__num">2</span><div><h3>เปิดแชทใหม่ที่สร้างวิดีโอได้</h3><p>แนบไฟล์ <b>life-video-source.md</b> ที่ได้จากข้อ 1 แล้ววางคำสั่งสั้น ๆ นี้ รายละเอียดทุกอย่างอยู่ในซอสแล้ว</p><div class="prompt" data-video-prompt="generate" data-prompt-guard="off"></div><div class="video-short"><b>ทำไมสั้นได้</b><p>เพราะซอสระบุเรื่องราว ลำดับภาพ 10 วินาที สัดส่วน 9:16 การเคลื่อนไหว และข้อห้ามไว้ครบแล้ว</p></div></div></article>
        <article class="video-step"><span class="video-step__num">3</span><div><h3>กดสร้าง แล้วเช็กว่าเล่นได้จริง</h3><p>จบบทเมื่อมีไฟล์วิดีโอที่เปิดดูได้ ไม่ต้องพากย์ ไม่ต้องตัดต่อ และไม่ต้องถ่ายเพิ่ม</p><div class="video-done"><label><input type="checkbox"><span>เปิดเล่นเป็นวิดีโอได้จริง</span></label><label><input type="checkbox"><span>ความยาวไม่เกิน 10 วินาที</span></label><label><input type="checkbox"><span>เป็นภาพแนวตั้ง 9:16</span></label><label><input type="checkbox"><span>ดูแล้วเชื่อมโยงกับเรื่องชีวิตเจ้าของบัญชีได้</span></label></div></div></article>
      </div>
      <section class="video-example" aria-labelledby="lesson3VideoExampleTitle">
        <div class="video-example__head"><b id="lesson3VideoExampleTitle">ตัวอย่างวิดีโอที่ได้จากซอส</b><p>กดเล่นเพื่อดูแนวทางการเล่าเรื่องและคุณภาพผลลัพธ์ ส่วนงานของคุณให้ตั้งเป็นแนวตั้ง 9:16 ตามเช็กลิสต์</p></div>
        <div class="video-example__grid">
          <video controls playsinline preload="metadata" data-video-example aria-label="วิดีโอตัวอย่างบทที่ 3"></video>
          <div class="video-example__note"><h3>Video AI ยังผิดพลาดและมีความสุ่ม</h3><p>ภาพ คน วัตถุ หรือการเคลื่อนไหวอาจเพี้ยนได้ แม้ซอสจะชัดเจนแล้วก็ตาม ถ้าผลยังไม่ถูกใจ ให้แก้แบบนี้</p><ol><li><b>ยังไม่ใกล้เลย:</b> ลองสร้างใหม่จากซอสเดิมก่อน ผลรอบใหม่อาจต่างจากเดิมมาก</li><li><b>ใกล้แล้ว:</b> บอกจุดที่อยากแก้ทีละนิดด้วยภาษาพูด เช่น “คงทุกอย่างไว้ แก้เฉพาะมือขวาให้เป็นธรรมชาติ”</li><li><b>แก้ทีละเรื่อง:</b> อย่ารวมหลายจุดไว้ในครั้งเดียว เพราะส่วนที่ดีอยู่แล้วอาจเปลี่ยนตาม</li></ol><p class="video-example__luck">คำสั่งเหมือนกันก็อาจได้ผลไม่เหมือนกัน — ดวงมีผล เผื่อเวลาลอง 2–3 รอบ</p></div>
        </div>
      </section>
      <details class="video-optional"><summary>เปิดเควสเพิ่ม (Optional) · อยากใส่ความเป็นมนุษย์มากขึ้น</summary><div class="video-optional__body"><div class="video-option"><b>4 · เติมเสียงของคุณ</b><p>อัดเสียงสั้น ๆ หนึ่ง Take แล้วแนบเพิ่มให้วิดีโอ ใช้ประโยคที่คุณพูดได้จริง ไม่ต้องเขียนบทใหม่ทั้งชุด</p><em>ไม่ทำก็จบบทได้</em></div><div class="video-option"><b>5 · เติมภาพถ่ายจริง</b><p>ถ่ายเพียงหนึ่งช็อตง่าย ๆ เช่น มือทำงาน โต๊ะ หรือสถานที่จริง แล้วใช้เป็นวัตถุดิบเพิ่ม ไม่ต้องถ่ายครบทุกฉาก</p><em>ไม่ทำก็จบบทได้</em></div></div></details>
      <div class="chef-note"><b>เชฟชิมแล้ว</b><p>วันนี้ขอแค่ได้วิดีโอที่เปิดเล่นได้หนึ่งชิ้นก็ผ่านค่ะ เสียงและภาพถ่ายจริงเป็นเควสเพิ่ม อยากทำเมื่อไรค่อยเปิดค่ะ</p></div>`;
    tldr.insertAdjacentElement('afterend',fast);
  }
  const sourcePrompt=fast.querySelector('[data-video-prompt="source"]');
  sourcePrompt?.setAttribute('data-prompt-collapse','');
  setPrompt(sourcePrompt,VIDEO_SOURCE_PROMPT);
  setupPromptCollapse(sourcePrompt);
  setPrompt(fast.querySelector('[data-video-prompt="generate"]'),VIDEO_PROMPT);
  const video=fast.querySelector('[data-video-example]');
  if(video&&window.__LESSON3_VIDEO_EXAMPLE__&&!video.hasAttribute('src')){
    video.setAttribute('src',window.__LESSON3_VIDEO_EXAMPLE__);
    video.load();
  }
  let node=fast.nextElementSibling;
  while(node&&!node.classList.contains('quest')){const next=node.nextElementSibling;node.remove();node=next}
}

function patchQuest(){
  const quest=document.querySelector('.quest');if(!quest)return;
  setText(quest.querySelector('h2'),'🎯 เควสท้ายบท · สร้างวิดีโอจากซอสให้ได้ 1 ชิ้น');
  setText(quest.querySelector(':scope > p'),'ไม่ต้องถ่าย ไม่ต้องพากย์ และไม่ต้องตัดต่อ จบบทเมื่อวิดีโอแนวตั้ง 9:16 ความยาวไม่เกิน 10 วินาทีเปิดเล่นได้จริง');
  const list=quest.querySelector('ol');
  if(list)list.innerHTML='<li>แนบซอส .md และภาพจากบท 2</li><li>ใช้ Prompt สร้างไฟล์ life-video-source.md</li><li>เปิดแชทใหม่ที่สร้างวิดีโอได้ แล้วแนบซอสวิดีโอ</li><li>วางคำสั่งสั้นจากข้อ 2 แล้วกดสร้าง</li><li>เช็กว่าไฟล์เล่นได้จริง ไม่เกิน 10 วินาที และเป็นแนวตั้ง 9:16</li>';
  setText(quest.querySelector('.finish'),'ฉันมีวิดีโอจากซอสแล้ว');
  setText(quest.querySelector('.achievement'),'🍽️ COOK PASSED · ซอสสร้างวิดีโอได้จริง');
}

function apply(){injectStyle();patchTop();buildFastTrack();patchQuest()}
function boot(){apply();requestAnimationFrame(apply);setTimeout(apply,250);setTimeout(apply,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
