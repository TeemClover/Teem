/* AI ใส่ซอส · Lesson 2 life-poster flow
   แชทเก่า → สกัดซอสชีวิต .md → แชทใหม่ → โปสเตอร์หนังชีวิต → ชิมและแก้ซอส
*/
(function(){
'use strict';
if(!/\/classroom\/image-ai\.html$/.test(location.pathname)) return;

const EXTRACT_PROMPT = `สกัดข้อมูลเกี่ยวกับฉันจากบทสนทนาในแชทนี้ แล้วสร้างเป็น Source ไฟล์ Markdown (.md) ที่พร้อมใช้สร้าง “โปสเตอร์หนังชีวิตของฉัน” ได้ทันที โดยไม่ต้องอธิบายเพิ่มใน Prompt รอบถัดไป

ใช้เฉพาะสิ่งที่บทสนทนานี้รองรับ:
- ฉันเป็นใคร ทำอะไร และสนใจอะไร
- บุคลิก วิธีพูด จุดเด่น และสิ่งที่ให้ความสำคัญ
- เรื่องราวหรือจุดเปลี่ยนสำคัญ
- ฉาก สี วัตถุ และบรรยากาศที่เหมาะกับการเล่าเรื่องชีวิต
- รูปลักษณ์หรือการแต่งตัว ถ้ามีข้อมูลจริง
- สิ่งที่ไม่รู้ให้เขียนว่า “ยังไม่มีข้อมูลในแชทนี้” ห้ามเดา

จัด Source ให้ครบตามหัวข้อนี้:
# Life Poster Source
## ตัวตนและบริบทของเจ้าของเรื่อง
## เส้นเรื่อง — มาจากไหน กำลังทำอะไร และกำลังไปทางไหน
## สิ่งสำคัญที่ภาพต้องสื่อ
## ฉาก วัตถุ สี แสง และอารมณ์
## รายละเอียดบุคคลและการแต่งตัวที่มีหลักฐาน
## สิ่งที่ห้ามแต่งเพิ่ม
## Image Recipe — โปสเตอร์หนังชีวิต
- ภาพแนวตั้งอัตราส่วน 9:16
- เล่าเรื่องด้วยภาพ ไม่มีตัวหนังสือบนภาพ
- ถ้าแนบเฉพาะ Source ให้สร้างเป็น Illustration โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง
- ถ้าแนบ Source พร้อมรูปจริง ให้ใช้รูปเป็นภาพอ้างอิงหลัก และรักษาใบหน้า ทรงผม และลักษณะสำคัญ
- เลือกองค์ประกอบและจังหวะภาพให้สะท้อนเรื่องราวใน Source
- รายละเอียดที่ไม่มีข้อมูลให้ใช้ทางเลือกเรียบและเป็นกลาง ห้ามสร้างข้อเท็จจริงใหม่

ลงมือสร้าง Source ทันที ห้ามถามคำถามกลับ
ส่งออกเป็นไฟล์ .md พร้อมให้ดาวน์โหลด
ถ้าระบบแนบไฟล์ไม่ได้ ให้ส่ง Markdown ทั้งหมดใน code block เดียวทันที โดยไม่ถามกลับ`;

const POSTER_PROMPT = `สร้างภาพตาม Source นี้`;

function setText(el,text){
  if(el && el.textContent!==text) el.textContent=text;
}

function setPrompt(el,text){
  if(!el) return;
  let button=el.querySelector('.cpx');
  const current=[...el.childNodes].filter(n=>n!==button).map(n=>n.textContent||'').join('').trim();
  if(current===text.trim()) return;
  [...el.childNodes].forEach(n=>{ if(n!==button) n.remove(); });
  el.insertBefore(document.createTextNode(text),button||null);
  if(!button){
    button=document.createElement('button');
    button.type='button';button.className='cpx';button.textContent='คัดลอก';
    button.setAttribute('aria-label','คัดลอกคำสั่ง');
    button.addEventListener('click',async()=>{
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
      setTimeout(()=>button.textContent='คัดลอก',1400);
    });
    el.append(button);
  }
}

function injectStyle(){
  if(document.getElementById('lesson2-life-poster-style')) return;
  const style=document.createElement('style');
  style.id='lesson2-life-poster-style';
  style.textContent=`
    .life-md-alert{margin-top:12px;padding:14px 16px;border:2px solid #c93434;border-radius:14px;background:#fff1f1;color:#7d1717;box-shadow:0 8px 22px rgba(153,25,25,.08)}
    .life-md-alert strong{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:15px;margin-bottom:3px;color:#a31717}
    .life-md-alert code{background:rgba(163,23,23,.08);padding:1px 5px;border-radius:5px}
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
    .life-taste{margin-top:15px;padding:18px 19px;border:1px solid rgb(var(--gold)/.35);border-radius:17px;background:rgb(var(--gold)/.08)}
    .life-taste h2{font-family:"Bai Jamjuree",sans-serif;font-size:20px;color:#6f5119}
    .life-taste p{margin-top:5px;color:rgb(var(--muted));font-size:14px!important}
    .life-taste ol{margin:10px 0 0 21px}.life-taste li{margin:5px 0;font-size:14px!important}
    .life-checkcards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}
    .life-checkcard{padding:17px 18px;border:1px solid rgb(var(--ink)/.1);border-radius:16px;background:#fff;box-shadow:0 7px 22px rgb(18 40 28/.045)}
    .life-checkcard h3{font-family:"Bai Jamjuree",sans-serif;font-size:16px;margin-bottom:9px;color:rgb(var(--deep))}
    .life-checkcard label{display:flex;align-items:flex-start;gap:9px;padding:6px 0;color:rgb(var(--ink));font-size:14px;line-height:1.55;cursor:pointer}
    .life-checkcard input{width:18px;height:18px;margin-top:2px;accent-color:rgb(var(--green));flex:none}
    .life-checkcard ul{list-style:none;margin:0;padding:0}.life-checkcard li{display:flex;gap:8px;margin:7px 0;color:rgb(var(--muted));font-size:14px!important;line-height:1.55!important}.life-checkcard li::before{content:'⚠️';flex:none}
    @media(max-width:720px){.life-why__grid,.life-checkcards{grid-template-columns:1fr}.life-paths,.life-examples__grid{grid-template-columns:1fr}.life-fast__step{grid-template-columns:32px 1fr;padding:16px 14px}}
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
    setText(tldr.querySelector('.tldr-main h2'),'สกัดซอส แล้วสร้างโปสเตอร์หนังชีวิตให้ได้วันนี้');
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
      <div class="life-fast__intro"><b>แชทเดิมสร้างภาพไม่ได้ก็ไม่เป็นไร</b><p>ใช้แชทเดิมสกัดซอส .md แล้วนำไฟล์ไปเปิดในแชทใหม่ที่สร้างภาพได้ ผู้เรียนไม่ต้องเริ่มเล่าเรื่องตัวเองใหม่</p></div>
      <section class="life-why"><h2><span class="life-section-num">1</span>ทำไมบทนี้ต้อง “ชิม” ด้วยภาพ</h2><div class="life-why__quote">ภาพ 1 ภาพ สื่อความหมายได้มากกว่าคำ 1,000 คำ</div><p>ซอสที่อ่านแล้วดูครบ อาจยังมีช่องว่างซ่อนอยู่ พอให้ระบบแปลงเป็นภาพ เราจะเห็นทันทีว่ามันเข้าใจตัวตน เรื่องราว อารมณ์ และสิ่งสำคัญของเราตรงหรือไม่ ก่อนเอาซอสไปทำงานจริงหลายชิ้น</p><div class="life-why__grid"><div><b>👀 เห็นความเข้าใจผิด</b><p>สิ่งที่คลุมเครือจะโผล่ออกมาเป็นคน ฉาก สี และวัตถุที่ผิด</p></div><div><b>⚡ ตรวจได้เร็ว</b><p>มองภาพครั้งเดียว เห็นทั้งสิ่งที่ตรง สิ่งที่ขาด และสิ่งที่ระบบแต่งเพิ่ม</p></div><div><b>🧴 พิสูจน์ว่าซอสใช้ได้</b><p>ถ้าซอสสร้างภาพที่เล่าเรื่องเราได้ ก็พร้อมนำไปต่อยอดกับงานอื่น</p></div></div></section>
      <div class="life-fast__steps">
        <article class="life-fast__step"><span class="life-fast__num">2</span><div><h3>สกัดซอส .md จากแชทเดิม</h3><p>วาง Prompt นี้ในแชทที่รู้จักคุณอยู่แล้ว ระบบต้องสร้างไฟล์ทันทีโดยไม่ถามกลับ</p><div class="prompt" data-life-prompt="extract"></div></div></article>
        <article class="life-fast__step"><span class="life-fast__num">3</span><div><h3>เปิดแชทใหม่ที่สร้างภาพได้</h3><p>แนบซอส .md ทุกครั้ง แล้วเลือกเส้นทางที่ตรงกับไฟล์ในมือ</p><div class="life-paths"><div class="life-path"><b>🎨 มีซอส .md อย่างเดียว</b><p>ได้ Illustration หรือตัวละครวาดที่เล่าเรื่องจากซอส โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง</p></div><div class="life-path"><b>📷 มีซอส .md + รูปจริง</b><p>ได้ภาพที่รักษาใบหน้า ทรงผม และลักษณะสำคัญของคนในรูปให้ใกล้เคียงต้นฉบับ</p></div></div></div></article>
        <article class="life-fast__step"><span class="life-fast__num">4</span><div><h3>สร้างภาพด้วยคำสั่งสั้น ๆ</h3><p>รายละเอียด 9:16 เรื่องราว สไตล์ และข้อห้ามอยู่ในซอสครบแล้ว แนบไฟล์ให้ครบ วางคำสั่งนี้ แล้วรอรับภาพได้เลย</p><div class="prompt" data-life-prompt="poster" data-prompt-guard="off"></div></div></article>
      </div>
      <section class="life-examples"><h2>ตัวอย่างผลลัพธ์จาก Prompt เดียวกัน</h2><p>ทั้งสองภาพใช้ Prompt สร้างภาพด้านบนกับแชทใหม่ที่สร้างภาพได้ ต่างกันเพียงไฟล์ที่แนบ</p><div class="life-examples__grid"><figure class="life-example"><img data-poster-example="illustration" width="540" height="960" loading="lazy" alt="ตัวอย่างโปสเตอร์แนวตั้งแบบ Illustration เมื่อแนบเฉพาะซอส .md"><figcaption><b>🎨 แนบเฉพาะซอส .md</b><span>ได้ Illustration ที่เล่าเรื่องจากซอส โดยไม่อ้างว่าใบหน้าเหมือนตัวจริง</span></figcaption></figure><figure class="life-example"><img data-poster-example="portrait" width="540" height="960" loading="lazy" alt="ตัวอย่างโปสเตอร์แนวตั้งแบบภาพเหมือน เมื่อแนบซอส .md พร้อมรูปจริง"><figcaption><b>📷 แนบซอส .md + รูปจริง</b><span>ได้โปสเตอร์ที่เล่าเรื่องเดียวกัน พร้อมรักษาความเหมือนของบุคคลในรูป</span></figcaption></figure></div></section>
      <section class="life-taste"><h2><span class="life-section-num">5</span>ชิมภาพหลังสร้าง — อย่าเพิ่งดูแค่ว่าสวยไหม</h2><p>ภาพแรกคือกระจกที่สะท้อนว่าระบบเข้าใจซอสอย่างไร ใช้เวลา 1 นาทีตรวจ 3 เรื่อง แล้วเก็บข้อสังเกตไว้ปรับซอสในบทต่อไป</p><ol><li><b>ตรง:</b> ตัวตน เรื่องราว และอารมณ์หลักที่เห็นในภาพตรงกับคุณหรือไม่</li><li><b>ขาด:</b> สิ่งสำคัญอะไรในซอสที่ภาพไม่ได้เล่าออกมา</li><li><b>เกิน:</b> มีประวัติ ความสำเร็จ ฉาก หรือสัญลักษณ์ใดที่ระบบแต่งขึ้นเอง</li></ol></section>
      <div class="chef-note"><b>เชฟชิมแล้ว</b><p>ถ้ามีแค่ซอส เชฟเสิร์ฟเป็น Illustration ให้ค่ะ ถ้าอยากได้ภาพเหมือน ให้แนบรูปจริงเพิ่มพร้อมซอสตั้งแต่รอบแรกค่ะ</p></div>
      <div class="life-checkcards"><div class="life-checkcard"><h3>ภาพนี้ผ่านการชิมเมื่อ</h3><label><input type="checkbox"><span>ได้ภาพแนวตั้ง 9:16 จริง 1 ภาพ</span></label><label><input type="checkbox"><span>เรื่องหลักและอารมณ์ในภาพตรงกับซอส</span></label><label><input type="checkbox"><span>ไม่มีประวัติหรือความสำเร็จที่ซอสไม่เคยบอก</span></label><label><input type="checkbox"><span>มีแค่ซอสจึงได้ Illustration หรือแนบรูปจริงแล้วใบหน้ายังตรง</span></label><label><input type="checkbox"><span>บอกได้อย่างน้อยอย่างละ 1 ข้อว่าอะไรตรง ขาด และเกิน</span></label></div><div class="life-checkcard"><h3>เจอแบบนี้ อย่าเพิ่งผ่านบท</h3><ul><li>ภาพสวย แต่ดูแล้วบอกไม่ได้ว่าเรื่องนี้เป็นเรื่องของคุณอย่างไร</li><li>มีรางวัล อาชีพ เหตุการณ์ หรือสัญลักษณ์ที่ซอสไม่เคยบอก</li><li>แนบเฉพาะซอส แต่ภาพพยายามอ้างว่าเป็นใบหน้าจริงของคุณ</li><li>แนบรูปจริงแล้ว แต่ใบหน้าและลักษณะสำคัญเปลี่ยนไปชัดเจน</li></ul></div></div>`;
    tldr.insertAdjacentElement('afterend',fast);
  }
  setPrompt(fast.querySelector('[data-life-prompt="extract"]'),EXTRACT_PROMPT);
  setPrompt(fast.querySelector('[data-life-prompt="poster"]'),POSTER_PROMPT);
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

function patchFaqAndQuest(){
  const quest=document.querySelector('.quest');
  if(!quest) return;
  setText(quest.querySelector('h2'),'🎯 เควสท้ายบท · ได้ภาพจากซอสจริง 1 ภาพ');
  setText(quest.querySelector(':scope > p'),'จบบทเมื่อสร้างโปสเตอร์แนวตั้ง 9:16 ได้จริง และชิมได้ว่าซอสตรง ขาด หรือเกินตรงไหน');
  const list=quest.querySelector('ol');
  if(list) list.innerHTML='<li>สกัดซอสจากแชทเดิมเป็นไฟล์ .md</li><li>เปิดแชทใหม่ที่สร้างภาพได้ แล้วแนบซอส .md</li><li>แนบรูปจริงเพิ่มเฉพาะเมื่อต้องการความเหมือน</li><li>วาง Prompt และสร้างโปสเตอร์ 9:16 ให้ได้ 1 ภาพ</li><li>ติ๊ก checklist และชิมว่าอะไรตรง ขาด หรือถูกแต่งเกินจากซอส</li>';
  setText(quest.querySelector('.finish'),'ฉันได้ภาพจากซอสและชิมแล้ว');
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
  requestAnimationFrame(apply);
  setTimeout(apply,250);
  setTimeout(apply,1000);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
