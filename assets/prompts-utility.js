/* Lesson 5 · utility-first layout and seasoning zones */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;
var V=window.MC_VAULT;
if(!V||!Array.isArray(V.prompts))return;

function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

function addStyle(){
  if(document.getElementById('mc-prompts-utility-style'))return;
  var style=document.createElement('style');
  style.id='mc-prompts-utility-style';
  style.textContent=`
    .head.utility-head{padding-top:30px!important}
    .head.utility-head>.heroimg{display:none!important}
    .head.utility-head h1{max-width:21ch!important;margin-top:12px!important}
    .head.utility-head>p{max-width:66ch!important}
    .head.utility-head .meta{margin-top:14px!important}
    .finder{padding-top:20px!important}
    .zone-label{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:15px 0 8px;color:#fff}
    .zone-label b{font:750 13px "Bai Jamjuree",sans-serif;color:rgb(var(--gold))}
    .zone-label span{font-size:11.5px;color:rgb(255 255 255/.58);text-align:right}
    .resbar{margin-top:20px!important}
    .season-after-genesis{margin:22px 0 8px}
    .season-after-genesis>.heroimg{display:block!important;height:auto!important;min-height:0!important;margin:0!important;border:1px solid rgb(190 148 66/.34);border-radius:20px;overflow:hidden;background:linear-gradient(145deg,#071a10,#0b3420 58%,#145337)!important;box-shadow:0 12px 32px rgb(10 40 24/.1)}
    .season-after-genesis>.heroimg::after{display:none!important}
    .season-after-genesis>.heroimg svg{display:block!important;width:100%!important;height:auto!important}
    .season-guide{margin-top:12px;border:1px solid rgb(var(--ink)/.1);border-radius:17px;background:#fff;overflow:visible}
    .season-guide>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none;padding:15px 18px;cursor:pointer;font:750 14px "Bai Jamjuree",sans-serif}
    .season-guide>summary::-webkit-details-marker{display:none}
    .season-guide>summary::after{content:"เปิดคู่มือ +";flex:none;padding:4px 9px;border-radius:999px;background:rgb(var(--green));color:#fff;font-size:11px;pointer-events:none}
    .season-guide[open]>summary::after{content:"ซ่อน −"}
    .season-guide-body{padding:0 16px 16px;border-top:1px solid rgb(var(--ink)/.07)}
    .season-guide .source-primer{margin:16px 0 0!important;box-shadow:none!important}
    .season-guide .season-chef{margin:12px 0 0!important}
    @media(max-width:520px){
      .head.utility-head{padding-top:25px!important}
      .head.utility-head h1{font-size:clamp(27px,8vw,35px)!important}
      .head.utility-head .meta span:nth-child(n+4){display:none}
      .zone-label{display:block}.zone-label span{display:block;margin-top:2px;text-align:left}
      .season-after-genesis>.heroimg{border-radius:16px}
    }
  `;
  document.head.appendChild(style);
}

function rewriteTop(){
  document.title='บทที่ 5 · เลือกงาน แล้วตักผงไปใช้กับ Source — AI ใส่ซอส';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.content='ค้นหางานหรือเลือกโซนเครื่องปรุง แล้วตัก 1 ใน 44 สูตรไปใช้กับ Source ทันที หรือเปิดปรับสูตรเมื่ออยากเปลี่ยนรายละเอียด';

  var head=document.querySelector('.head');
  if(head){
    head.classList.add('utility-head');
    setText(head.querySelector('.lv'),'บทที่ 5 · SEASON');
    setText(head.querySelector('h1'),'เลือกงาน แล้วตักผงไปใช้กับ Source');
    setText(head.querySelector(':scope > p'),'ค้นจากผลลัพธ์ที่อยากได้ หรือเลือกโซนเครื่องปรุง ระบบจะแสดงหลายสูตรที่เกี่ยวข้องทันที กดตักเพื่อคัดลอก หรือเปิดปรับสูตรเมื่อต้องการเปลี่ยนรายละเอียด');
    var m=head.querySelector('.meta');
    if(m)m.innerHTML='<span>🫙 Source-first</span><span>🧂 '+V.prompts.length+' สูตร</span><span>🥄 กดใช้ได้ทันที</span>';
  }

  setText(document.querySelector('.finder .qlab'),'อยากให้ Source กลายเป็นงานแบบไหน?');
  var q=document.getElementById('q');
  if(q)q.placeholder='เช่น อีเมล, สไลด์, รายงาน, คลิป, แผนงาน, คำตอบลูกค้า...';

  var chips=document.getElementById('chips');
  if(chips){
    chips.setAttribute('aria-label','เลือกโซนเครื่องปรุง เลือกได้มากกว่า 1 โซน');
    if(!document.querySelector('.zone-label')){
      var z=document.createElement('div');
      z.className='zone-label';
      z.innerHTML='<b>โซนเครื่องปรุง</b><span>1 โซนมีหลายสูตร · เลือกพร้อมกันได้</span>';
      chips.parentNode.insertBefore(z,chips);
    }
  }

  setText(document.getElementById('rand'),'🎲 สุ่ม 1 สูตร');
  setText(document.getElementById('reset'),'ล้างโซน');
  setText(document.getElementById('showAll'),'เปิดตู้ทั้ง '+V.prompts.length+' สูตร');
}

function ensureAfterGenesis(){
  var builder=document.querySelector('.builder');
  if(!builder)return null;
  var wrap=document.querySelector('.season-after-genesis');
  if(!wrap){
    wrap=document.createElement('section');
    wrap.className='season-after-genesis';
    wrap.setAttribute('aria-label','ลายเซ็นและคู่มือเสริมของบทที่ 5');
    builder.insertAdjacentElement('afterend',wrap);
  }

  var hero=document.querySelector('.head .heroimg')||document.querySelector('.heroimg');
  if(hero&&hero.parentNode!==wrap)wrap.insertBefore(hero,wrap.firstChild);

  var guide=wrap.querySelector('.season-guide');
  if(!guide){
    guide=document.createElement('details');
    guide.className='season-guide';
    guide.innerHTML='<summary>Source กับผงปรุงรสต่างกันยังไง?</summary><div class="season-guide-body"></div>';
    wrap.appendChild(guide);
  }
  var body=guide.querySelector('.season-guide-body');
  ['.source-primer','.season-chef'].forEach(function(selector){
    var el=document.querySelector(selector);
    if(el&&el.parentNode!==body)body.appendChild(el);
  });
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
    if(count&&count.textContent) setText(count,count.textContent.replace(/ใบ/g,'สูตร').replace(/ไอเท็ม/g,'สูตร'));

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

function boot(){
  addStyle();
  rewriteTop();
  ensureAfterGenesis();
  rewriteResults();

  var q=document.getElementById('q');
  if(q)q.addEventListener('input',rewriteResults);
  var chips=document.getElementById('chips');
  if(chips)chips.addEventListener('click',function(){setTimeout(rewriteResults,0)});
  ['reset','showAll','rand'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('click',function(){setTimeout(rewriteResults,0)});
  });

  if(window.MutationObserver){
    new MutationObserver(function(){
      ensureAfterGenesis();
      rewriteResults();
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
