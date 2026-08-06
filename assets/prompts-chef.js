/* Lesson 5 · chef assistant, kitchen glossary, and main course teaser */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var TERMS={
  ingredients:'วัตถุดิบหลัก คือเนื้อหาและความจริงที่มาจากผู้ใช้ เช่น ประสบการณ์ ไอเดีย โน้ต ภาพ เสียง เอกสาร ตัวเลข ความต้องการ และข้อจำกัดจริง',
  source:'Source คือซอสตั้งต้นที่คัด จัด และเคี่ยววัตถุดิบหลักให้เป็น Source of Truth แบบพกพา พร้อมใช้ซ้ำโดยไม่ต้องเล่าใหม่ทุกครั้ง',
  order:'ใบออร์เดอร์ คือผลลัพธ์ที่ผู้ใช้ต้องการจากครัว เช่น อีเมล สไลด์ คลิป รายงาน แผนงาน หรือหน้าเว็บ',
  seasoning:'ผงปรุง คือคำสั่งที่บอกว่าจะนำ Source ไปทำอะไร ต้องการรสแบบไหน มีข้อจำกัดอะไร และควรตรวจอะไรบ้าง',
  chef:'เชฟผู้ช่วย คือชุดกติกาที่กำหนดว่า AI ควรถาม คิด วิจารณ์ ตรวจ และจัดคำตอบอย่างไรตลอด Session เดียวกัน โดยยังใช้ Source เป็นข้อเท็จจริงหลัก',
  kitchen:'ครัว AI ใส่ซอส คือภาษาภาพจำของ myClover ที่แยกวัตถุดิบ Source ใบออร์เดอร์ ผงปรุง เครื่องมือ AI และการชิมของมนุษย์ออกจากกันให้ชัด',
  owner:'เจ้าของครัวคือคุณ ผู้เลือกรส ชิม ตรวจ และตัดสินใจสุดท้าย ส่วนความเข้าใจ วิธีคิด และ Mindset คือรสมือกับลิ้นที่ใช้ตัดสินว่างานไหนใช่',
  mainCourse:'MAIN COURSE คือบทที่ 6 · SERVE — นำวัตถุดิบ Source ผงปรุง และรสมือทั้งหมดมาทำเป็นงานจริงที่คนอื่นเปิดใช้ได้'
};

function addStyle(){
  if(document.getElementById('mc-prompts-chef-style'))return;
  var s=document.createElement('style');
  s.id='mc-prompts-chef-style';
  s.textContent=`
    .chef-tool{
      margin:38px 0 8px;border:1px solid rgb(190 148 66/.48);border-radius:20px;
      background:linear-gradient(145deg,#fff,rgb(190 148 66/.08));
      box-shadow:0 16px 42px -30px rgb(10 40 24/.7)
    }
    .chef-tool>summary{
      list-style:none;cursor:pointer;padding:20px 22px;display:grid;
      grid-template-columns:auto 1fr auto;gap:15px;align-items:center
    }
    .chef-tool>summary::-webkit-details-marker{display:none}
    .chef-tool-icon{
      width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:29px;
      background:rgb(27 106 66/.09);border:1px solid rgb(27 106 66/.22)
    }
    .chef-tool-kicker{display:block;font:800 10.5px "Bai Jamjuree",sans-serif;letter-spacing:.13em;color:#8a6a22;margin-bottom:3px}
    .chef-tool-title{display:block;font:800 clamp(18px,3.6vw,23px)/1.35 "Bai Jamjuree",sans-serif;color:rgb(var(--ink))}
    .chef-tool-desc{display:block;margin-top:4px;font-size:13.5px;line-height:1.65;color:rgb(var(--muted))}
    .chef-toggle-label{
      pointer-events:none;min-width:82px;text-align:center;padding:7px 11px;border-radius:999px;
      background:rgb(var(--green));color:#fff;font:800 11.5px "Bai Jamjuree",sans-serif
    }
    .chef-toggle-label .opened{display:none}.chef-tool[open] .chef-toggle-label .closed{display:none}.chef-tool[open] .chef-toggle-label .opened{display:inline}
    .chef-tool[open]>summary{border-bottom:1px solid rgb(var(--ink)/.08)}
    .chef-tool-body{padding:4px 22px 24px}
    .chef-tool-body>:first-child{margin-top:25px!important}
    .chef-tool-body>.legend{margin-top:12px}
    .chef-tool-body>.builder{margin-bottom:0}
    .chef-tool-body>.tx{margin-bottom:15px}
    .chef-tool-note{
      margin:18px 0 4px;padding:14px 16px;border-radius:14px;
      background:rgb(27 106 66/.065);border:1px solid rgb(27 106 66/.2);font-size:13.5px;line-height:1.75
    }

    .chef-term{
      display:inline;border-bottom:1px dashed currentColor;font:inherit;font-weight:800;color:inherit;
      cursor:help;outline:none
    }
    .chef-term::after{content:" ?";font-size:.72em;vertical-align:.12em;opacity:.75}
    .chef-term:focus-visible{outline:2px solid rgb(var(--gold));outline-offset:3px;border-radius:4px}
    .chef-pop{
      position:fixed;z-index:140;width:min(340px,calc(100vw - 28px));padding:12px 14px;
      border:1px solid rgb(190 148 66/.55);border-radius:12px;background:#071a10;color:#fff;
      font-size:12.5px;line-height:1.7;box-shadow:0 17px 40px rgb(0 0 0/.3);
      opacity:0;visibility:hidden;transform:translateY(-4px);pointer-events:none;
      transition:opacity .14s,visibility .14s,transform .14s
    }
    .chef-pop.on{opacity:1;visibility:visible;transform:none}

    .kitchen-why{
      margin:0 0 13px;border:1px solid rgb(27 106 66/.2);border-radius:16px;background:rgb(27 106 66/.045)
    }
    .kitchen-why>summary{
      list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;
      gap:13px;font:750 14px "Bai Jamjuree",sans-serif
    }
    .kitchen-why>summary::-webkit-details-marker{display:none}
    .kitchen-toggle{pointer-events:none;flex:none;padding:5px 9px;border-radius:999px;background:rgb(var(--green));color:#fff;font-size:10.5px}
    .kitchen-toggle .opened{display:none}.kitchen-why[open] .kitchen-toggle .closed{display:none}.kitchen-why[open] .kitchen-toggle .opened{display:inline}
    .kitchen-why-body{padding:0 16px 17px;border-top:1px solid rgb(var(--ink)/.07);font-size:14px;line-height:1.78}
    .kitchen-why-body p{margin-top:13px}
    .kitchen-flow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:15px;padding:12px;border-radius:13px;background:#fff;border:1px solid rgb(var(--ink)/.08)}
    .kitchen-flow span{font-size:12px;font-weight:750}.kitchen-flow i{font-style:normal;color:rgb(var(--gold));font-weight:900}
    .kitchen-glossary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
    .kitchen-card{padding:11px 12px;border-radius:12px;background:#fff;border:1px solid rgb(var(--ink)/.09);font-size:12.5px;line-height:1.55}
    .kitchen-card b{display:block;margin-bottom:2px;color:rgb(var(--ink))}
    .kitchen-card p{margin:0;color:rgb(var(--muted));font-size:12px}
    .kitchen-card.owner{grid-column:1/-1;background:rgb(190 148 66/.09);border-color:rgb(190 148 66/.28)}
    .front-door{
      display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:15px;padding:10px 15px;
      border-radius:11px;background:rgb(var(--green));color:#fff!important;font:800 13px "Bai Jamjuree",sans-serif;text-decoration:none!important
    }

    .main-course-tease{
      margin:24px 0 5px;padding:20px 21px;border:1px solid rgb(190 148 66/.48);border-radius:18px;
      background:linear-gradient(145deg,#071a10,#103b27);color:#fff;box-shadow:0 18px 44px -32px rgb(0 0 0/.9)
    }
    .main-course-tease small{display:block;font:800 10.5px "Bai Jamjuree",sans-serif;letter-spacing:.16em;color:rgb(var(--gold));margin-bottom:6px}
    .main-course-tease h3{font:800 clamp(20px,4vw,27px)/1.35 "Bai Jamjuree",sans-serif;margin:0}
    .main-course-tease p{margin-top:7px;color:rgb(255 255 255/.76);font-size:14px;line-height:1.75}
    .main-course-line{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
    .main-course-line span{padding:5px 9px;border-radius:999px;border:1px solid rgb(255 255 255/.15);background:rgb(255 255 255/.06);font-size:11.5px;font-weight:700}
    .nextrow .nx:not(.ghost){background:rgb(var(--deep));color:rgb(var(--gold));border:1px solid rgb(var(--gold)/.62)}

    @media(max-width:560px){
      .chef-tool>summary{grid-template-columns:auto 1fr;padding:18px 17px;gap:12px}
      .chef-toggle-label{grid-column:1/-1;width:100%}
      .chef-tool-body{padding:3px 16px 20px}
      .chef-tool-icon{width:47px;height:47px;font-size:26px}
      .kitchen-why>summary{align-items:flex-start}
      .kitchen-glossary{grid-template-columns:1fr}
      .kitchen-card.owner{grid-column:auto}
    }
    @media(prefers-reduced-motion:reduce){.chef-pop{transition:none}}
  `;
  document.head.appendChild(s);
}

function chefTerm(label,key){
  return '<span class="chef-term" role="button" tabindex="0" aria-expanded="false" data-chef-term="'+key+'">'+label+'</span>';
}

function wrapChefTool(){
  if(document.querySelector('.chef-tool'))return true;
  var legend=document.querySelector('.legend');
  var builder=document.querySelector('.builder');
  if(!legend||!builder)return false;

  var start=legend.previousElementSibling;
  if(!start||start.tagName!=='H2')start=legend;
  var parent=start.parentNode;
  if(!parent||builder.parentNode!==parent)return false;

  var tool=document.createElement('details');
  tool.className='chef-tool';
  tool.innerHTML=
    '<summary aria-label="เปิดเครื่องมือเลือกเชฟผู้ช่วย">'+
      '<span class="chef-tool-icon" aria-hidden="true">👩‍🍳</span>'+
      '<span><span class="chef-tool-kicker">SPECIAL TOOL · CHEF SELECT</span>'+
      '<span class="chef-tool-title">เลือก '+chefTerm('เชฟผู้ช่วยของคุณเอง','chef')+'</span>'+
      '<span class="chef-tool-desc">วัตถุดิบและ Source ขวดเดิม แต่เชฟแต่ละคนมีวิธีถาม ชิม วิจารณ์ และจัดจานต่างกัน เลือกคนที่เข้ากับงานแล้วปรับรสมือได้ทุกช่อง</span></span>'+
      '<span class="chef-toggle-label"><span class="closed">เลือกเชฟ +</span><span class="opened">เก็บครัว −</span></span>'+
    '</summary><div class="chef-tool-body"></div>';
  parent.insertBefore(tool,start);

  var body=tool.querySelector('.chef-tool-body');
  var node=start;
  while(node){
    var next=node.nextSibling;
    body.appendChild(node);
    if(node===builder)break;
    node=next;
  }

  var headings=body.querySelectorAll(':scope > h2');
  if(headings[0])headings[0].innerHTML='<span class="n">★</span>เชฟผู้ช่วยต่างจาก Source ยังไง?';
  if(headings[1])headings[1].innerHTML='<span class="n">👩‍🍳</span>เลือกเชฟ แล้วตั้งรสมือให้เข้ากับงาน';

  var legendTitle=legend.querySelector('h3');
  if(legendTitle)legendTitle.innerHTML='CHEF ASSISTANT — ตั้งวิธีร่วมงานของ AI ตลอด Session';
  var intro=body.querySelector(':scope > p.tx');
  if(intro)intro.innerHTML='เลือกเชฟที่ใกล้งานที่สุดก่อน แล้วแก้รายละเอียดให้เป็นของคุณ — <b>เชฟไม่ได้สร้างวัตถุดิบหรือข้อเท็จจริงแทนคุณ</b> แต่กำหนดวิธีถาม ตรวจ วิจารณ์ และจัดคำตอบ';

  var note=document.createElement('div');
  note.className='chef-tool-note';
  note.innerHTML='<b>แยกให้ออก:</b> '+chefTerm('วัตถุดิบหลัก','ingredients')+' คือสิ่งที่มาจากคุณ · '+chefTerm('Source','source')+' คือซอสที่เคี่ยววัตถุดิบนั้นไว้ให้พร้อมใช้ซ้ำ · เชฟผู้ช่วยคือ “รสมือ” ที่กำหนดว่า AI จะร่วมงานกับคุณแบบไหน';
  body.insertBefore(note,legend);
  return true;
}

function addKitchenWhy(){
  var exhibition=document.querySelector('.season-exhibition');
  if(!exhibition||exhibition.querySelector('.kitchen-why'))return !!exhibition;
  var head=exhibition.querySelector('.exhibit-head');
  if(!head)return false;

  var box=document.createElement('details');
  box.className='kitchen-why';
  box.innerHTML=
    '<summary><span>'+chefTerm('ครัว AI ใส่ซอส','kitchen')+' คืออะไร และทำไมเราใช้คำแบบนี้?</span>'+
    '<span class="kitchen-toggle"><span class="closed">ทบทวนศัพท์ +</span><span class="opened">ซ่อน −</span></span></summary>'+
    '<div class="kitchen-why-body">'+
      '<p>เพราะชื่อ AI ปุ่ม และความสามารถเปลี่ยนตลอด แต่หลักทำงานที่ดีไม่ค่อยเปลี่ยน เราจึงใช้ภาษาครัวเพื่อจำ Workflow ที่ย้ายข้ามเครื่องมือได้ และเพื่อไม่ให้ Prompt ถูกเข้าใจผิดว่าเป็นต้นกำเนิดของงานทั้งหมด</p>'+
      '<div class="kitchen-flow"><span>🥕 วัตถุดิบของคุณ</span><i>→</i><span>🫙 Source</span><i>→</i><span>🧾 ใบออร์เดอร์</span><i>→</i><span>🧂 ผงปรุง</span><i>→</i><span>🛠️ ครัว AI</span><i>→</i><span>🍽️ จานที่เสิร์ฟ</span><i>→</i><span>👅 ชิมและตัดสินใจ</span></div>'+
      '<div class="kitchen-glossary">'+
        '<div class="kitchen-card"><b>🥕 '+chefTerm('วัตถุดิบหลัก','ingredients')+'</b><p>ประสบการณ์ ไอเดีย โน้ต ภาพ เสียง เอกสาร ตัวเลข และข้อจำกัดจริงจากผู้ใช้</p></div>'+
        '<div class="kitchen-card"><b>🫙 '+chefTerm('Source','source')+'</b><p>ซอสตั้งต้นที่คัดและเคี่ยววัตถุดิบให้เป็น Source of Truth พร้อมใช้ซ้ำ</p></div>'+
        '<div class="kitchen-card"><b>🧾 '+chefTerm('เมนู / ใบออร์เดอร์','order')+'</b><p>สิ่งที่ต้องการให้ครัวทำออกมา เช่น อีเมล สไลด์ คลิป รายงาน หรือเว็บ</p></div>'+
        '<div class="kitchen-card"><b>🧂 '+chefTerm('Prompt / ผงปรุง','seasoning')+'</b><p>คำสั่งว่าจะใช้ Source ทำอะไร ต้องการรสแบบไหน และต้องตรวจอะไร</p></div>'+
        '<div class="kitchen-card"><b>👩‍🍳 '+chefTerm('เชฟผู้ช่วย','chef')+'</b><p>วิธีถาม คิด วิจารณ์ ตรวจ และจัดคำตอบของ AI ตลอด Session</p></div>'+
        '<div class="kitchen-card"><b>🛠️ ครัว AI</b><p>เครื่องมือ โมเดล ปุ่ม และแรงงานที่ช่วยแปรวัตถุดิบกับ Source ให้เป็นงาน</p></div>'+
        '<div class="kitchen-card owner"><b>👅 '+chefTerm('คุณคือเจ้าของครัว','owner')+'</b><p>ความเข้าใจ วิธีคิด และ Mindset คือรสมือกับลิ้นของคุณ ใช้เลือก ชิม ตรวจ และตัดสินใจสุดท้าย</p></div>'+
      '</div>'+
      '<p><b>ประโยคเดียวที่ควรจำ:</b> ของที่เป็นของคุณคือวัตถุดิบ · Source คือซอสที่จัดวัตถุดิบนั้นไว้ · Prompt คือผงปรุง · AI คือครัว · ส่วนคุณคือคนเลือกรส ชิม และตัดสินใจ</p>'+
      '<p>หน้านี้เปิดมาใช้เครื่องมือได้ทันที แม้ไม่เคยเรียนคอร์ส แต่ถ้าอยากเห็นว่าเราเปลี่ยนวัตถุดิบดิบให้กลายเป็น Source ได้อย่างไร ลองเดินเข้ามาจากประตูหน้าบ้านก่อน</p>'+
      '<a class="front-door" href="/">🚪 เริ่มจากประตูหน้าบ้าน →</a>'+
    '</div>';
  head.insertAdjacentElement('afterend',box);
  return true;
}

function rewriteReviewAndNext(){
  var lvls=document.querySelector('.lvls');
  if(lvls){
    var h=lvls.previousElementSibling;
    if(h&&h.tagName==='H2')h.innerHTML='<span class="n">5</span>ทบทวนครัวก่อนรอจานหลัก';
    lvls.innerHTML=
      '<div class="lvl"><span class="n">STEP 1 · มีวัตถุดิบ</span><q>นี่คือโน้ต ภาพ เอกสาร และเรื่องจริงของฉัน</q><small>ของจริงเริ่มจากผู้ใช้ ไม่ได้เริ่มจาก Prompt หรือ AI</small></div>'+
      '<div class="lvl"><span class="n">STEP 2 · เคี่ยวเป็น Source</span><q>คัดสิ่งสำคัญ จัดความจริง รักษาเสียง และล็อก Canon ไว้ในซอสขวดเดียว</q><small>Source ทำให้อธิบายน้อยลง ใช้ซ้ำง่ายขึ้น และลดข้อมูลขัดกัน</small></div>'+
      '<div class="lvl best"><span class="n">STEP 3 · รับออร์เดอร์แล้วปรุง</span><q>เลือกเมนู → ตักผงปรุง → เลือกเชฟผู้ช่วย → ชิมก่อนเสิร์ฟ</q><small>บทนี้เตรียมครัวครบแล้ว บทถัดไปจะนำทุกอย่างไปทำจานจริง</small></div>';

    var recap=lvls.nextElementSibling;
    if(recap&&recap.classList.contains('note'))recap.innerHTML='<b>ไม่มีวัตถุดิบ ต่อให้มี Source Template และผงปรุงครบ งานก็เป็นได้แค่อาหารสำเร็จรูปรสกลาง ๆ</b><br>คุณภาพเริ่มจากสิ่งที่คุณรู้ สิ่งที่คุณเจอ และสิ่งที่คุณเลือกใส่ลงไป';
  }

  var quest=document.querySelector('.quest');
  if(quest)quest.innerHTML='🎯 <b>QUEST: จัดครัวให้พร้อมก่อน Main Course</b><ol><li>เลือกวัตถุดิบจริงจากงานของคุณ 1 ชุด</li><li>ยืนยันว่า Source ขวดหลักยังตรงกับข้อเท็จจริงและเสียงของคุณ</li><li>เลือกเมนูที่อยากได้ แล้วตักผงปรุง 1 สูตรไปใช้</li><li>ถ้างานต้องทำต่อหลายรอบ ค่อยเปิด “เลือกเชฟผู้ช่วยของคุณเอง”</li><li>ชิมชื่อ ตัวเลข Key Messages, Tone และ Canon ก่อนเสิร์ฟ</li></ol><p style="margin-top:12px"><b>คำถามทิ้งท้าย:</b> วัตถุดิบชิ้นไหนของคุณที่ AI สร้างแทนไม่ได้?</p><span class="unlock">✨ KITCHEN READY — MAIN COURSE NEXT</span><span class="qshare">เอามาอวดกันได้: “วัตถุดิบหลักของฉันคือ ______ · Source ขวดนี้จะถูกเอาไปทำ ______ 🍀”</span>';

  var nextrow=document.querySelector('.nextrow');
  if(nextrow){
    var existing=document.querySelector('.main-course-tease');
    if(!existing){
      existing=document.createElement('section');
      existing.className='main-course-tease';
      existing.innerHTML='<small>NEXT · บทที่ 6 · SERVE</small><h3>ครัวพร้อมแล้ว — ต่อไปคือ '+chefTerm('MAIN COURSE','mainCourse')+'</h3><p>5 บทที่ผ่านมาเราเตรียมวัตถุดิบ เคี่ยว Source ชิม ทำจานต้นแบบ แตกหลายเมนู และเลือกเครื่องปรุงแล้ว บทถัดไปจะรวมทุกอย่างเป็นงานจริงที่เปิดให้คนอื่นเห็นและใช้งานได้</p><div class="main-course-line"><span>🥕 วัตถุดิบพร้อม</span><span>🫙 Source พร้อม</span><span>🧂 สูตรพร้อม</span><span>👩‍🍳 เชฟพร้อม</span><span>🍽️ รอเสิร์ฟ</span></div>';
      nextrow.parentNode.insertBefore(existing,nextrow);
    }
    var links=nextrow.querySelectorAll('a');
    if(links[0])links[0].textContent='← บทที่ 4 · MULTIPLY';
    if(links[1])links[1].innerHTML='🍽️ บทที่ 6 · SERVE — MAIN COURSE →';
  }
}

function initTooltips(){
  if(document.getElementById('mc-chef-pop'))return;
  var pop=document.createElement('div');
  pop.id='mc-chef-pop';pop.className='chef-pop';pop.setAttribute('role','tooltip');
  document.body.appendChild(pop);
  var active=null,pinned=false;

  function place(el){
    var r=el.getBoundingClientRect();
    var w=Math.min(340,window.innerWidth-28);
    var left=Math.max(14,Math.min(window.innerWidth-w-14,r.left+r.width/2-w/2));
    pop.style.width=w+'px';pop.style.left=left+'px';
    var h=pop.offsetHeight||92;
    var below=r.bottom+9;
    pop.style.top=(below+h<window.innerHeight-10?below:Math.max(10,r.top-h-9))+'px';
  }
  function show(el,pin){
    var key=el&&el.getAttribute('data-chef-term');
    if(!key||!TERMS[key])return;
    if(active&&active!==el)active.setAttribute('aria-expanded','false');
    active=el;pinned=!!pin;pop.textContent=TERMS[key];pop.classList.add('on');
    el.setAttribute('aria-expanded','true');requestAnimationFrame(function(){place(el)});
  }
  function hide(force){
    if(pinned&&!force)return;
    if(active)active.setAttribute('aria-expanded','false');
    active=null;pinned=false;pop.classList.remove('on');
  }

  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-chef-term]');
    if(el){e.preventDefault();e.stopPropagation();if(active===el&&pinned)hide(true);else show(el,true);return}
    hide(true);
  });
  document.addEventListener('keydown',function(e){
    var el=e.target.closest&&e.target.closest('[data-chef-term]');
    if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();if(active===el&&pinned)hide(true);else show(el,true);return}
    if(e.key==='Escape')hide(true);
  });
  document.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('[data-chef-term]');if(el)show(el,false)});
  document.addEventListener('focusout',function(e){if(e.target.closest&&e.target.closest('[data-chef-term]'))hide(false)});
  document.addEventListener('pointerover',function(e){var el=e.target.closest&&e.target.closest('[data-chef-term]');if(el&&!pinned)show(el,false)});
  document.addEventListener('pointerout',function(e){if(e.target.closest&&e.target.closest('[data-chef-term]')&&!pinned)hide(false)});
  window.addEventListener('resize',function(){if(active)place(active)});
  window.addEventListener('scroll',function(){if(active&&!pinned)hide(true)},{passive:true});
}

function boot(){
  addStyle();
  wrapChefTool();
  addKitchenWhy();
  rewriteReviewAndNext();
  initTooltips();
  setTimeout(function(){wrapChefTool();addKitchenWhy();rewriteReviewAndNext()},40);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
