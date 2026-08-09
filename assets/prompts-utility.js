/* Lesson 5 · utility-first hero, glossary, and exhibition */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;
var V=window.MC_VAULT;
if(!V||!Array.isArray(V.prompts))return;

var TERMS={
  season:'SEASON คือช่วงเติมวิธีใช้ให้ซอสเพื่อให้ออกมาเป็นงานที่ตรงจุด ไม่ใช่การสร้างข้อมูลต้นทางใหม่',
  sourceFirst:'ซอส-first คือเริ่มจากข้อมูลต้นทางก่อน แล้วค่อยเลือกคำสั่งหรือเครื่องมือให้เหมาะกับงาน',
  instant:'Instant คือสูตรที่กดคัดลอกไปใช้กับซอสได้ทันที โดยไม่ต้องกรอกช่องว่างก่อน',
  zone:'โซนเครื่องปรุงคือตัวกรองที่รวมหลายสูตรตามจุดประสงค์เดียวกัน 1 โซนจึงเปิดเจอได้หลายสูตร',
  scoop:'ตักผง คือกดคัดลอกสูตรพร้อมใช้ แล้วนำไปวางต่อจากซอสใน AI ที่ใช้อยู่',
  genesis:'Genesis Seasoning คือกติกาวิธีร่วมงานของ AI ตลอด Session เช่น ถามก่อนเดา รักษาเสียง และตรวจข้อขัดแย้ง ไม่ใช่ข้อเท็จจริงของงาน',
  exhibit:'นิทรรศการหลังครัวคือส่วนอ่านต่อ ดูตัวอย่าง และเข้าใจแนวคิดเพิ่มเติม ไม่จำเป็นต้องอ่านก่อนใช้คลังเครื่องมือ'
};

function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function term(label,key,extra){
  return '<button type="button" class="kterm '+(extra||'')+'" data-kterm="'+key+'" aria-expanded="false">'+label+'</button>';
}

function addStyle(){
  if(document.getElementById('mc-prompts-utility-style'))return;
  var style=document.createElement('style');
  style.id='mc-prompts-utility-style';
  style.textContent=`
    .head.utility-head{
      margin:26px 0 0!important;padding:30px 34px 0!important;
      border-radius:24px 24px 0 0!important;overflow:hidden!important;
      box-shadow:0 18px 46px rgb(10 40 24/.13)!important
    }
    .head.utility-head h1{max-width:21ch!important;margin-top:12px!important}
    .head.utility-head>p{max-width:66ch!important}
    .head.utility-head .meta{margin-top:14px!important;padding-bottom:4px}
    .head.utility-head>.heroimg{
      display:block!important;height:auto!important;min-height:0!important;
      margin:24px -34px 0!important;border-top:1px solid rgb(255 255 255/.1);
      background:transparent!important;overflow:hidden!important
    }
    .head.utility-head>.heroimg::after{display:none!important}
    .head.utility-head>.heroimg svg{display:block!important;width:100%!important;height:auto!important}
    .finder{
      margin-top:-1px!important;padding-top:21px!important;
      border-radius:0 0 24px 24px!important;
      box-shadow:0 20px 52px rgb(10 40 24/.14)
    }
    .zone-label{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:15px 0 8px;color:#fff}
    .zone-label b{font:750 13px "Bai Jamjuree",sans-serif;color:rgb(var(--gold))}
    .zone-label span{font-size:11.5px;color:rgb(255 255 255/.58);text-align:right}
    .resbar{margin-top:20px!important}

    .kterm{
      display:inline;padding:0;border:0;border-bottom:1px dashed currentColor;background:transparent;
      color:inherit;font:inherit;font-weight:800;line-height:inherit;cursor:help
    }
    .lv .kterm{color:rgb(var(--gold));letter-spacing:.12em;text-transform:uppercase}
    .meta .kterm{border-bottom-color:rgb(255 255 255/.38);font-weight:700}
    .zone-label .kterm{color:rgb(var(--gold))}
    .kterm:focus-visible{outline:2px solid rgb(var(--gold));outline-offset:3px;border-radius:4px}
    .kpop{
      position:fixed;z-index:120;width:min(340px,calc(100vw - 28px));
      padding:12px 14px;border:1px solid rgb(190 148 66/.5);border-radius:12px;
      background:#071a10;color:#fff;font-size:12.5px;line-height:1.65;
      box-shadow:0 16px 38px rgb(0 0 0/.28);opacity:0;visibility:hidden;
      transform:translateY(-4px);transition:opacity .14s,transform .14s,visibility .14s;
      pointer-events:none
    }
    .kpop.on{opacity:1;visibility:visible;transform:none}

    .season-exhibition{margin:30px 0 8px;padding-top:5px}
    .exhibit-head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end;margin-bottom:13px}
    .exhibit-head small{display:block;font:800 10.5px "Bai Jamjuree",sans-serif;letter-spacing:.14em;color:rgb(var(--gold));margin-bottom:4px}
    .exhibit-head h2{display:block!important;margin:0!important;font-size:23px!important}
    .exhibit-head h2::after{display:none!important}
    .exhibit-head p{max-width:48ch;font-size:13.5px;color:rgb(var(--muted));margin-top:4px}
    .exhibit-badge{align-self:center;padding:5px 11px;border-radius:999px;background:rgb(var(--green)/.08);border:1px solid rgb(var(--green)/.2);font-size:11.5px;font-weight:750;color:rgb(var(--green))}
    .exhibit-stage{border:1px solid rgb(190 148 66/.3);border-radius:20px;overflow:hidden;background:#0a2818;box-shadow:0 12px 32px rgb(10 40 24/.1)}
    .exhibit-stage svg{display:block;width:100%;height:auto}
    .season-guide{margin-top:12px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:#fff;overflow:visible}
    .season-guide>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none;padding:15px 18px;cursor:pointer;font:750 14px "Bai Jamjuree",sans-serif}
    .season-guide>summary::-webkit-details-marker{display:none}
    .season-guide>summary::after{content:"เปิดคู่มือ +";flex:none;padding:4px 9px;border-radius:999px;background:rgb(var(--green));color:#fff;font-size:11px;pointer-events:none}
    .season-guide[open]>summary::after{content:"ซ่อน −"}
    .season-guide-body{padding:0 16px 16px;border-top:1px solid rgb(var(--ink)/.07)}
    .season-guide .source-primer{margin:16px 0 0!important;box-shadow:none!important}
    .season-guide .season-chef{margin:12px 0 0!important}

    @media(max-width:520px){
      .head.utility-head{padding:25px 22px 0!important}
      .head.utility-head h1{font-size:clamp(27px,8vw,35px)!important}
      .head.utility-head>.heroimg{margin:21px -22px 0!important}
      .head.utility-head .meta span:nth-child(2){display:none}
      .zone-label{display:block}.zone-label span{display:block;margin-top:2px;text-align:left}
      .exhibit-head{display:block}.exhibit-badge{display:inline-block;margin-top:10px}
      .exhibit-stage{border-radius:16px}
    }
    @media(prefers-reduced-motion:reduce){.kpop{transition:none}}
  `;
  document.head.appendChild(style);
}

function exhibitionSvg(){
  return `<svg viewBox="0 0 900 260" role="img" aria-labelledby="exTitle exDesc" xmlns="http://www.w3.org/2000/svg">
    <title id="exTitle">ทางเข้าสู่นิทรรศการหลังครัว</title>
    <desc id="exDesc">โถงนิทรรศการที่มีกรอบแสดงซอสเครื่องปรุง และผลงาน พร้อมทางเดินต่อไปยังเนื้อหาอธิบาย</desc>
    <defs>
      <linearGradient id="exBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071a10"/><stop offset="1" stop-color="#174c32"/></linearGradient>
      <linearGradient id="exFloor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7bd72" stop-opacity=".26"/><stop offset="1" stop-color="#071a10" stop-opacity=".05"/></linearGradient>
      <filter id="exSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".25"/></filter>
    </defs>
    <rect width="900" height="260" fill="url(#exBg)"/>
    <path d="M0 260L258 142H642L900 260Z" fill="url(#exFloor)"/>
    <path d="M450 143V260M258 143L116 260M642 143L784 260" stroke="#f4d37f" stroke-opacity=".18" stroke-width="3"/>
    <g filter="url(#exSh)">
      <rect x="54" y="42" width="198" height="132" rx="12" fill="#f7f0da" stroke="#d2ad59" stroke-width="5"/>
      <rect x="75" y="62" width="156" height="91" rx="8" fill="#e7f0e9"/>
      <path d="M126 78h54l8 60h-70Z" fill="#fff8df" stroke="#ba8a34" stroke-width="4"/>
      <rect x="137" y="91" width="32" height="31" rx="5" fill="#174c32"/>
      <circle cx="153" cy="106" r="8" fill="#d7bd72"/>

      <rect x="351" y="28" width="198" height="146" rx="12" fill="#f7f0da" stroke="#d2ad59" stroke-width="5"/>
      <rect x="372" y="49" width="156" height="104" rx="8" fill="#6e4828"/>
      <g fill="#9d6b38" stroke="#4b2e18" stroke-width="2">
        <rect x="389" y="65" width="34" height="31" rx="4"/><rect x="433" y="65" width="34" height="31" rx="4"/><rect x="477" y="65" width="34" height="31" rx="4"/>
        <rect x="389" y="108" width="34" height="31" rx="4"/><rect x="433" y="108" width="34" height="31" rx="4"/><rect x="477" y="108" width="34" height="31" rx="4"/>
      </g>
      <g fill="#e3bd69"><circle cx="406" cy="80" r="3"/><circle cx="450" cy="80" r="3"/><circle cx="494" cy="80" r="3"/><circle cx="406" cy="123" r="3"/><circle cx="450" cy="123" r="3"/><circle cx="494" cy="123" r="3"/></g>

      <rect x="648" y="42" width="198" height="132" rx="12" fill="#f7f0da" stroke="#d2ad59" stroke-width="5"/>
      <rect x="669" y="62" width="156" height="91" rx="8" fill="#f4e7ca"/>
      <ellipse cx="710" cy="126" rx="28" ry="9" fill="#fff" stroke="#d8cab0" stroke-width="3"/>
      <ellipse cx="747" cy="106" rx="28" ry="9" fill="#fff" stroke="#d8cab0" stroke-width="3"/>
      <ellipse cx="786" cy="126" rx="28" ry="9" fill="#fff" stroke="#d8cab0" stroke-width="3"/>
      <path d="M700 118q12-22 23 0M737 98q12-22 23 0M776 118q12-22 23 0" fill="none" stroke="#be9442" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g fill="#f4d37f"><path d="M292 49l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z"/><path d="M600 72l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/></g>
  </svg>`;
}

function initGlossary(){
  if(document.getElementById('mc-kpop'))return;
  var pop=document.createElement('div');
  pop.id='mc-kpop';pop.className='kpop';pop.setAttribute('role','tooltip');
  document.body.appendChild(pop);
  var active=null,pinned=false;

  function place(btn){
    var r=btn.getBoundingClientRect();
    var w=Math.min(340,window.innerWidth-28);
    var left=Math.max(14,Math.min(window.innerWidth-w-14,r.left+r.width/2-w/2));
    pop.style.width=w+'px';
    pop.style.left=left+'px';
    var h=pop.offsetHeight||90;
    var below=r.bottom+9;
    pop.style.top=(below+h<window.innerHeight-10?below:Math.max(10,r.top-h-9))+'px';
  }
  function show(btn,pin){
    var key=btn&&btn.getAttribute('data-kterm');
    if(!key||!TERMS[key])return;
    if(active&&active!==btn)active.setAttribute('aria-expanded','false');
    active=btn;pinned=!!pin;pop.textContent=TERMS[key];pop.classList.add('on');
    btn.setAttribute('aria-expanded','true');requestAnimationFrame(function(){place(btn)});
  }
  function hide(force){
    if(pinned&&!force)return;
    if(active)active.setAttribute('aria-expanded','false');
    active=null;pinned=false;pop.classList.remove('on');
  }

  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-kterm]');
    if(btn){e.preventDefault();e.stopPropagation();if(active===btn&&pinned)hide(true);else show(btn,true);return}
    hide(true);
  });
  document.addEventListener('focusin',function(e){var btn=e.target.closest&&e.target.closest('[data-kterm]');if(btn)show(btn,false)});
  document.addEventListener('focusout',function(e){if(e.target.closest&&e.target.closest('[data-kterm]'))hide(false)});
  document.addEventListener('pointerover',function(e){var btn=e.target.closest&&e.target.closest('[data-kterm]');if(btn&&!pinned)show(btn,false)});
  document.addEventListener('pointerout',function(e){if(e.target.closest&&e.target.closest('[data-kterm]')&&!pinned)hide(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hide(true)});
  window.addEventListener('resize',function(){if(active)place(active)});
  window.addEventListener('scroll',function(){if(active&&!pinned)hide(true)},{passive:true});
}

function rewriteTop(){
  document.title='บทที่ 5 · เลือกงาน แล้วตักผงไปใช้กับซอส — AI ใส่ซอส';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.content='ค้นหางานหรือเลือกโซนเครื่องปรุง แล้วตัก 1 ใน 44 สูตรไปใช้กับซอสทันที หรือเปิดปรับสูตรเมื่ออยากเปลี่ยนรายละเอียด';

  var head=document.querySelector('.head');
  if(head){
    head.classList.add('utility-head');
    var hero=head.querySelector('.heroimg')||document.querySelector('.heroimg');
    if(hero&&hero.parentNode!==head)head.appendChild(hero);
    else if(hero)head.appendChild(hero);

    var lv=head.querySelector('.lv');
    if(lv)lv.innerHTML='บทที่ 5 · '+term('SEASON','season');
    setText(head.querySelector('h1'),'เลือกงาน แล้วตักผงไปใช้กับซอส');
    var lead=head.querySelector(':scope > p');
    if(lead)lead.innerHTML='ค้นจากผลลัพธ์ที่อยากได้ หรือเลือกโซนเครื่องปรุง ระบบจะแสดงหลายสูตรที่เกี่ยวข้องทันที กด '+term('ตักผง','scoop')+' เพื่อคัดลอก หรือเปิดปรับสูตรเมื่อต้องการเปลี่ยนรายละเอียด';
    var m=head.querySelector('.meta');
    if(m)m.innerHTML='<span>'+term('🫙 ซอส-first','sourceFirst')+'</span><span>🧂 '+V.prompts.length+' สูตร</span><span>'+term('⚡️ Instant - กดใช้ได้ทันที','instant')+'</span>';
  }

  setText(document.querySelector('.finder .qlab'),'อยากให้ซอสกลายเป็นงานแบบไหน?');
  var q=document.getElementById('q');
  if(q)q.placeholder='เช่น อีเมล, สไลด์, รายงาน, คลิป, แผนงาน, คำตอบลูกค้า...';

  var chips=document.getElementById('chips');
  if(chips){
    chips.setAttribute('aria-label','เลือกโซนเครื่องปรุง เลือกได้มากกว่า 1 โซน');
    var z=document.querySelector('.zone-label');
    if(!z){z=document.createElement('div');z.className='zone-label';chips.parentNode.insertBefore(z,chips)}
    z.innerHTML='<b>'+term('โซนเครื่องปรุง','zone')+'</b><span>1 โซนมีหลายสูตร · เลือกพร้อมกันได้</span>';
  }

  setText(document.getElementById('rand'),'🎲 สุ่ม 1 สูตร');
  setText(document.getElementById('reset'),'ล้างโซน');
  setText(document.getElementById('showAll'),'เปิดตู้ทั้ง '+V.prompts.length+' สูตร');
}

function ensureExhibition(){
  var builder=document.querySelector('.builder');
  if(!builder)return null;

  var old=document.querySelector('.season-after-genesis');
  if(old)old.remove();

  var wrap=document.querySelector('.season-exhibition');
  if(!wrap){
    wrap=document.createElement('section');
    wrap.className='season-exhibition';
    wrap.setAttribute('aria-label','นิทรรศการหลังครัว');
    wrap.innerHTML='<div class="exhibit-head"><div><small>OPTIONAL EXHIBITION</small><h2>'+term('นิทรรศการหลังครัว','exhibit')+'</h2><p>จากตรงนี้ลงไปเป็นส่วนอ่านต่อ ดูตัวอย่าง และเข้าใจภาษาของครัว ไม่ขวางทางใช้เครื่องมือด้านบน</p></div><span class="exhibit-badge">ดูเมื่ออยากเข้าใจเพิ่ม</span></div><div class="exhibit-stage">'+exhibitionSvg()+'</div><details class="season-guide"><summary>ซอสกับผงปรุงรสต่างกันยังไง?</summary><div class="season-guide-body"></div></details>';
    builder.insertAdjacentElement('afterend',wrap);
  }

  var body=wrap.querySelector('.season-guide-body');
  ['.source-primer','.season-chef'].forEach(function(selector){
    var el=document.querySelector(selector);
    if(el&&el.parentNode!==body)body.appendChild(el);
  });

  var legend=document.querySelector('.legend h3');
  if(legend&&!legend.querySelector('[data-kterm]')){
    legend.innerHTML=term('GENESIS SEASONING','genesis')+' — ตั้งวิธีร่วมงาน ไม่ใช่สร้างข้อเท็จจริงแทนซอส';
  }
  return wrap;
}

function selectedZones(){
  return Array.prototype.filter.call(document.querySelectorAll('#chips .chip'),function(c){
    return c.getAttribute('aria-pressed')==='true';
  }).map(function(c){return c.textContent.trim()});
}

var painting=false;
function rewriteResults(){
  if(painting)return;
  painting=true;
  requestAnimationFrame(function(){
    painting=false;
    var title=document.getElementById('resTitle');
    var count=document.getElementById('resCount');
    var q=document.getElementById('q');
    var query=q?q.value.trim():'';
    var zones=selectedZones();

    if(title){
      var next='สูตรที่หยิบบ่อย';
      if(query)next='สูตรที่ตรงกับ “'+query+'”';
      else if(zones.length)next='สูตรในโซน '+zones.join(' + ');
      setText(title,next);
    }
    if(count&&count.textContent)setText(count,count.textContent.replace(/ใบ/g,'สูตร').replace(/ไอเท็ม/g,'สูตร'));

    var empty=document.querySelector('#results .empty');
    if(empty){
      setText(empty.querySelector('b'),'ยังไม่เจอสูตรที่ตรง');
      var p=empty.querySelector('p');
      if(p)p.innerHTML='ลองบอก<b>ผลลัพธ์ที่อยากได้</b>ให้กว้างขึ้น หรือเลือกโซนเครื่องปรุงอื่น';
      var all=empty.querySelector('[data-act="tryAll"]');
      if(all)setText(all,'เปิดตู้ทั้ง '+V.prompts.length+' สูตร');
    }
  });
}

function scheduleResults(delay){setTimeout(rewriteResults,delay==null?0:delay)}

function boot(){
  addStyle();
  rewriteTop();
  ensureExhibition();
  initGlossary();
  rewriteResults();

  var q=document.getElementById('q');
  if(q)q.addEventListener('input',function(){scheduleResults(170)});
  var chips=document.getElementById('chips');
  if(chips)chips.addEventListener('click',function(){scheduleResults(20)});
  ['reset','showAll','rand'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('click',function(){scheduleResults(30)});
  });

  var results=document.getElementById('results');
  if(results&&window.MutationObserver){
    new MutationObserver(function(){rewriteResults()}).observe(results,{childList:true});
  }

  setTimeout(function(){rewriteTop();ensureExhibition()},0);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
