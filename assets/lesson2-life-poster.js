/* AI ใส่ซอส · Lesson 2 life-poster flow
   แชทเก่า → สกัดซอสชีวิต .md → แชทใหม่ → โปสเตอร์หนังชีวิต → ชิมและแก้ซอส
*/
(function(){
'use strict';
if(!/^\/classroom\/image-ai\.html$/.test(location.pathname)) return;

const EXTRACT_PROMPT = `จากบทสนทนาเก่าในแชทนี้ ช่วยสกัดข้อมูลเกี่ยวกับฉันออกมาเป็นไฟล์ Markdown (.md) เพื่อใช้สร้าง “โปสเตอร์หนังชีวิตของฉัน” ในแชทใหม่

สรุปเฉพาะสิ่งที่บทสนทนารองรับ:
- ฉันเป็นใคร ทำอะไร และสนใจอะไร
- บุคลิก วิธีพูด จุดเด่น และสิ่งที่ให้ความสำคัญ
- เรื่องราวหรือจุดเปลี่ยนสำคัญ
- ฉาก สี วัตถุ และบรรยากาศที่เหมาะกับการเล่าเรื่องชีวิต
- รูปลักษณ์หรือการแต่งตัว ถ้ามีข้อมูลจริง
- สิ่งที่ไม่รู้ให้เขียนว่า “ยังไม่มีข้อมูล” ห้ามเดา

ปิดท้ายด้วย:
## Prompt Seed — โปสเตอร์หนังชีวิตของฉัน

ส่งออกเป็นไฟล์ .md พร้อมให้ดาวน์โหลด`;

const POSTER_PROMPT = `ใช้ไฟล์ .md ที่แนบเป็น Source หลัก สร้างโปสเตอร์หนังชีวิตของฉัน 1 ภาพ

ให้ภาพเล่าว่า “ฉันคือใคร ผ่านอะไรมาบ้าง และกำลังไปทางไหน” จากข้อมูลในซอส
เลือกฉาก องค์ประกอบ และอารมณ์ที่สะท้อนชีวิตจริง มากกว่าทำแค่ภาพสวย

ถ้ามีรูปฉันแนบ ให้ใช้เป็นภาพอ้างอิง
ถ้าไม่มีรูปจริง ให้ทำเป็นตัวละครการ์ตูนหรือ Illustration แทน และไม่อ้างว่าเหมือนตัวจริง
ห้ามแต่งประวัติ เหตุการณ์ ความสำเร็จ หรือรายละเอียดที่ไม่มีในซอส
ไม่มีตัวหนังสือบนภาพ เว้นแต่ฉันสั่งเพิ่ม`;

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
      button.textContent=ok?'✓ คัดลอกแล้ว':'คัดลอก';
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
  `;
  document.head.append(style);
}

function patchTop(){
  const tldr=document.querySelector('.tldr');
  if(tldr){
    setText(tldr.querySelector('.tldr-main h2'),'สกัดซอสจากแชทเดิม แล้วสร้างโปสเตอร์หนังชีวิตตัวเอง');
    setText(tldr.querySelector('.tldr-main p'),'ให้ AI สกัดสิ่งที่รู้เกี่ยวกับคุณเป็นไฟล์ .md เปิดแชทใหม่ แล้วใช้ซอสนั้นสร้างโปสเตอร์ 1 ภาพเพื่อชิมว่า AI เข้าใจคุณจริงแค่ไหน');
    const take=[...tldr.querySelectorAll('.takehome span')];
    ['🧴 ซอสชีวิต .md','🎬 โปสเตอร์หนังชีวิต 1 ภาพ','🥄 จุดที่ AI เข้าใจ / เข้าใจผิด','🎨 Visual Canon'].forEach((txt,i)=>setText(take[i],txt));
  }

  const menu=[...document.querySelectorAll('.menu .menu-card')];
  const menuData=[
    ['🧴','สกัดซอส','จากแชทเก่า'],
    ['💬','เปิดแชทใหม่','แนบไฟล์ .md'],
    ['📎','แนบรูปถ้ามี','ไม่มีก็ใช้การ์ตูน'],
    ['🎬','สร้างโปสเตอร์','หนังชีวิตของคุณ'],
    ['🥄','ชิมแล้วแก้','เก็บกลับเข้าซอส']
  ];
  menuData.forEach((d,i)=>{
    const card=menu[i]; if(!card) return;
    setText(card.querySelector('.dish'),d[0]);
    setText(card.querySelector('b'),d[1]);
    setText(card.querySelector('small'),d[2]);
  });

  const ingredients=[...document.querySelectorAll('.ingredient-grid .ingredient')];
  if(ingredients[0]){
    setText(ingredients[0].querySelector('b'),'ซอสชีวิต .md');
    setText(ingredients[0].querySelector('p'),'สกัดจากแชทเดิมในข้อ 1 เพื่อพาบริบทของคุณไปใช้ต่อในแชทใหม่');
  }
  if(ingredients[1]){
    setText(ingredients[1].querySelector('b'),'โปสเตอร์หนังชีวิต 1 ภาพ');
    setText(ingredients[1].querySelector('p'),'ภาพเดียวที่เล่าตัวตน เรื่องราว จุดเปลี่ยน และทิศทางชีวิตให้เห็นพร้อมกัน');
  }
  if(ingredients[2]){
    setText(ingredients[2].querySelector('b'),'รูปตัวเอง ถ้าอยากให้เหมือนจริง');
    setText(ingredients[2].querySelector('p'),'แนบรูปจริงเมื่ออยากให้ภาพเหมือนคุณ ถ้าไม่อัปโหลด ให้ใช้ตัวละครการ์ตูนแทน');
  }
}

function patchSteps(){
  const section=[...document.querySelectorAll('h2.section')].find(h=>h.textContent.includes('ลงมือปรุง'));
  if(!section) return;
  const steps=section.nextElementSibling;
  if(!steps?.classList.contains('steps')) return;
  const cards=[...steps.querySelectorAll(':scope > .step')];
  if(cards.length<4) return;

  const c1=cards[0];
  setText(c1.querySelector('b'),'สกัดซอสชีวิตจากแชทเดิม');
  setText(c1.querySelector('p'),'ใช้แชทเก่าที่คุยกับ AI มานาน สกัดสิ่งที่มันรู้เกี่ยวกับคุณออกมาเป็นไฟล์ .md สำหรับพาไปแชทใหม่');
  setPrompt(c1.querySelector('.prompt'),EXTRACT_PROMPT);

  const c2=cards[1];
  if(c2.dataset.lifePoster!=='1'){
    c2.dataset.lifePoster='1';
    const body=c2.querySelector('div');
    if(body) body.innerHTML=`<b>เปิดแชทใหม่ แล้วแนบซอส</b><p>ดาวน์โหลดไฟล์ <code>.md</code> จากข้อ 1 แล้วเปิดแชทใหม่ ถ้ามีรูปตัวเองและอยากให้ภาพเหมือนจริง ให้แนบเพิ่มได้</p><div class="life-md-alert"><strong>⚠️ ต้องแนบไฟล์ .md จากข้อ 1</strong>ไฟล์นี้คือซอสหลักของโปสเตอร์ ถ้าไม่แนบ AI จะต้องเดาบริบทชีวิตของคุณใหม่</div><details class="life-photo-note"><summary>ไม่มีรูปจริง ทำยังไง?</summary><p>ไม่ต้องอัปโหลดก็ได้ ให้ทำเป็นตัวละครการ์ตูนหรือ Illustration แทน โดยไม่อ้างว่าเป็นหน้าตาจริงของคุณ</p></details>`;
  }

  const c3=cards[2];
  setText(c3.querySelector('b'),'สร้างโปสเตอร์หนังชีวิตตัวเอง');
  setText(c3.querySelector('p'),'ให้ซอสเป็นคนเล่าเรื่องก่อน ภาพแรกมีหน้าที่เช็กว่า AI เข้าใจตัวคุณ ไม่ได้มีหน้าที่สมบูรณ์แบบ');
  setPrompt(c3.querySelector('.prompt'),POSTER_PROMPT);

  const c4=cards[3];
  setText(c4.querySelector('b'),'ชิมโปสเตอร์ด้วย Checklist');
  setText(c4.querySelector('p'),'ตรวจว่าภาพสะท้อนชีวิตจากซอสจริงแค่ไหน ไม่ใช่ดูแค่ว่าสวยหรือไม่');
  const labels=[...c4.querySelectorAll('.check span')];
  [
    'ตัวละครและภาพลักษณ์สอดคล้องกับข้อมูลในซอส',
    'เรื่องราวไม่แต่งเหตุการณ์หรือความสำเร็จเพิ่ม',
    'ฉาก วัตถุ และสัญลักษณ์มีที่มาจากซอส',
    'อารมณ์ แสง และสีเข้ากับตัวตนและเรื่องราว',
    'ถ้าใช้รูปจริง หน้าตาและรายละเอียดสำคัญไม่หลุด',
    'ไม่มีข้อมูลลับหรือสิ่งที่เราไม่ได้อนุญาตให้ใส่'
  ].forEach((txt,i)=>setText(labels[i],txt));
}

function patchFaqAndQuest(){
  document.querySelectorAll('details.deep').forEach(d=>{
    const summary=d.querySelector('summary');
    if(summary?.textContent.includes('ซอสที่ดีทำให้ AI ไม่ผิดเลยหรือไม่')){
      const ps=d.querySelectorAll('.deepbody p');
      if(ps[0]) setText(ps[0],'ไม่ AI ยังอ่านตกหล่น เชื่อมเหตุผลพลาด หรือทำไม่ครบได้ ซอสที่ดีช่วยลดพื้นที่ที่ระบบต้องเดา และช่วยให้เราแยกได้ว่าปัญหาเกิดจากวัตถุดิบ กติกา หรือการลงมือของ AI');
    }
  });

  const quest=document.querySelector('.quest');
  if(!quest) return;
  setText(quest.querySelector('h2'),'🎯 เควสท้ายบท · สร้างโปสเตอร์หนังชีวิตตัวเอง');
  setText(quest.querySelector(':scope > p'),'สกัดซอสชีวิตจากแชทเดิม แล้วใช้มันสร้างและชิมโปสเตอร์ 1 ภาพ');
  const items=[...quest.querySelectorAll('ol > li')];
  [
    'สกัดข้อมูลจากแชทเดิมเป็นไฟล์ .md',
    'เปิดแชทใหม่แล้วแนบไฟล์ .md',
    'แนบรูปตัวเองถ้าต้องการความเหมือนจริง',
    'สร้างโปสเตอร์หนังชีวิต 1 ภาพ',
    'ชิม แก้ และเก็บสิ่งที่ยืนยันแล้วกลับเข้าซอส'
  ].forEach((txt,i)=>setText(items[i],txt));
}

function apply(){
  injectStyle();
  patchTop();
  patchSteps();
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
