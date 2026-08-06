/* Lesson 5 · collapsed chef assistant and AI Sauce kitchen explainer */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var TERMS={
  chef:'เชฟผู้ช่วย คือชุดกติกาที่กำหนดว่า AI ควรถาม คิด วิจารณ์ ตรวจ และจัดคำตอบอย่างไรตลอด Session เดียวกัน โดยยังใช้ Source เป็นข้อเท็จจริงหลัก',
  kitchen:'ครัว AI ใส่ซอส คือภาษาภาพจำของ myClover: Source เป็นซอสตั้งต้น, Prompt เป็นผงปรุง, เครื่องมือ AI เป็นอุปกรณ์ในครัว และคนยังเป็นผู้ชิมกับผู้ตัดสินใจสุดท้าย'
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
      background:rgb(27 106 66/.065);border:1px solid rgb(27 106 66/.2);font-size:13.5px;line-height:1.7
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
    .kitchen-map{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
    .kitchen-map span{padding:5px 9px;border-radius:999px;background:#fff;border:1px solid rgb(var(--ink)/.1);font-size:11.5px;font-weight:700}
    .front-door{
      display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:15px;padding:10px 15px;
      border-radius:11px;background:rgb(var(--green));color:#fff!important;font:800 13px "Bai Jamjuree",sans-serif;text-decoration:none!important
    }

    @media(max-width:560px){
      .chef-tool>summary{grid-template-columns:auto 1fr;padding:18px 17px;gap:12px}
      .chef-toggle-label{grid-column:1/-1;width:100%}
      .chef-tool-body{padding:3px 16px 20px}
      .chef-tool-icon{width:47px;height:47px;font-size:26px}
      .kitchen-why>summary{align-items:flex-start}
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
      '<span class="chef-tool-desc">Source ขวดเดิม แต่เชฟแต่ละคนมีวิธีถาม ชิม วิจารณ์ และจัดจานต่างกัน เลือกคนที่เข้ากับงานแล้วปรับรสมือได้ทุกช่อง</span></span>'+
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
  if(intro)intro.innerHTML='เลือกเชฟที่ใกล้งานที่สุดก่อน แล้วแก้รายละเอียดให้เป็นของคุณ — <b>เชฟไม่ได้สร้างข้อเท็จจริงแทน Source</b> แต่กำหนดวิธีถาม ตรวจ วิจารณ์ และจัดคำตอบ';

  var note=document.createElement('div');
  note.className='chef-tool-note';
  note.innerHTML='<b>จำง่าย ๆ:</b> Source คือสูตรและวัตถุดิบจริงของงาน ส่วนเชฟผู้ช่วยคือ “รสมือ” ที่กำหนดว่า AI จะร่วมงานกับคุณแบบไหน';
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
    '<span class="kitchen-toggle"><span class="closed">เปิดอ่าน +</span><span class="opened">ซ่อน −</span></span></summary>'+
    '<div class="kitchen-why-body">'+
      '<p>เพราะชื่อ AI ปุ่ม และความสามารถเปลี่ยนตลอด แต่หลักทำงานที่ดีไม่ค่อยเปลี่ยน เราจึงใช้ภาษาครัวให้จำ Workflow ได้โดยไม่ต้องผูกตัวเองกับเครื่องมือหรือ Prompt ชุดใดชุดหนึ่ง</p>'+
      '<div class="kitchen-map"><span>🫙 Source = ซอสตั้งต้น</span><span>🧂 Prompt = ผงปรุง</span><span>🛠️ AI = อุปกรณ์ในครัว</span><span>👅 คุณ = คนชิมและตัดสินใจ</span></div>'+
      '<p>หน้านี้เปิดมาใช้เครื่องมือได้ทันที แม้ไม่เคยเรียนคอร์ส แต่ถ้าอยากเห็นเส้นทางทั้งหมดตั้งแต่เหตุผล วิธีคิด ไปจนถึงการลงมือ ลองเดินเข้ามาจากประตูหน้าบ้านก่อน</p>'+
      '<a class="front-door" href="/">🚪 เริ่มจากประตูหน้าบ้าน →</a>'+
    '</div>';
  head.insertAdjacentElement('afterend',box);
  return true;
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
  initTooltips();
  setTimeout(function(){wrapChefTool();addKitchenWhy()},40);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
