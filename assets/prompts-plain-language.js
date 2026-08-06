/* Lesson 5 · keep the kitchen metaphor in the UI, never inside copied prompts

   หน้าเว็บยังเรียกสูตรว่า “ผงปรุงรส” เพื่อให้จำง่ายได้
   แต่ข้อความที่ส่งให้ AI ต้องเป็นภาษางานปกติ เพื่อใช้ได้กับทุกโมเดล
   โดยไม่ต้องให้ AI ตีความคำเปรียบเทียบของหลักสูตรก่อนเริ่มงาน
*/
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var V=window.MC_VAULT;
if(!V||!Array.isArray(V.prompts))return;

var VERSION='plain-language-v1';
var OLD_MARKERS=[
  'ใช้ผงปรุงรสนี้กับ Source',
  'ผงปรุงรสสำหรับงานนี้:',
  'ตักผงปรุงรส'
];

function text(el,value){
  if(el&&el.textContent!==value)el.textContent=value;
}

function sourceInfo(prompt){
  return prompt.__source||{icon:'🫙',label:'.md Source'};
}

function originalTemplate(prompt){
  if(typeof prompt.__originalTpl==='string'&&prompt.__originalTpl.trim()){
    return prompt.__originalTpl.trim();
  }

  var current=String(prompt.tpl||'').trim();
  var contextIndex=current.indexOf('\nบริบท:');
  if(contextIndex>=0)return current.slice(contextIndex+1).trim();

  return current
    .replace(/^SOURCE FIRST[^\n]*\n[\s\S]*?ผงปรุงรสสำหรับงานนี้:\s*/,'')
    .trim();
}

function plainPrefix(prompt){
  var source=sourceInfo(prompt);
  return [
    'ใช้ Source ที่แนบหรือวางไว้ในบทสนทนานี้เป็นฐานหลักของงาน',
    'Source ที่เหมาะที่สุดสำหรับงานนี้: '+source.icon+' '+source.label,
    '',
    'กติกาการใช้ Source:',
    '- ใช้ Source เป็นฐานข้อเท็จจริงหลักของงาน',
    '- อ่าน Source แล้วเติมข้อมูลใน [วงเล็บ] เฉพาะส่วนที่ Source ระบุได้',
    '- ถ้าข้อมูลสำคัญไม่มีใน Source ให้ถามก่อน ห้ามเดาหรือแต่งเพิ่ม',
    '- ถ้ายังไม่มี Source ในบทสนทนานี้ ให้แจ้งว่าต้องแนบหรือวางข้อมูลก่อนเริ่มงาน',
    '- รักษาชื่อ ตัวเลข Key Messages, Tone และ Canon ตาม Source',
    '- ใช้ Source เพิ่มเติมได้ แต่ข้อมูลใหม่ต้องไม่ขัดกับ Source หลัก',
    '- ถ้า Source หลายชิ้นขัดกัน ให้ชี้จุดที่ขัดกันและถามว่าอันใดเป็น Source หลัก',
    '',
    'รายละเอียดงาน:'
  ].join('\n');
}

function rewritePrompt(prompt){
  var base=originalTemplate(prompt);
  prompt.__originalTpl=base;
  prompt.tpl=plainPrefix(prompt)+'\n\n'+base;
  prompt.__promptLanguage=VERSION;
}

V.prompts.forEach(rewritePrompt);

function addStyle(){
  if(document.getElementById('mc-prompt-language-style'))return;
  var style=document.createElement('style');
  style.id='mc-prompt-language-style';
  style.textContent=`
    .prompt-language-note{
      grid-column:1/-1;margin-top:13px;padding:14px 16px;border:1px solid rgb(27 106 66/.25);
      border-radius:14px;background:#fff;color:rgb(var(--ink));font-size:13.5px;line-height:1.72
    }
    .prompt-language-note b{display:block;color:rgb(var(--green));font-family:"Bai Jamjuree",system-ui;font-size:14px}
    .prompt-language-note p{margin:4px 0 0!important;color:rgb(var(--muted))!important;font-size:13px!important}
    .prompt-language-badge{
      display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 9px;border-radius:999px;
      border:1px solid rgb(27 106 66/.22);background:rgb(27 106 66/.06);color:rgb(var(--green));
      font:750 11.5px "Bai Jamjuree",system-ui
    }
  `;
  document.head.appendChild(style);
}

function promptByCard(card){
  var id=card&&card.dataset&&card.dataset.id;
  return V.prompts.find(function(prompt){return prompt.id===id});
}

function refreshOpenPreview(card){
  if(!card||!card.classList.contains('open'))return;
  if(card.dataset.plainPreviewVersion===VERSION)return;
  card.dataset.plainPreviewVersion=VERSION;

  var field=card.querySelector('.drawer input,.drawer textarea');
  if(field){
    field.dispatchEvent(new Event('input',{bubbles:true}));
    return;
  }

  var prompt=promptByCard(card);
  var preview=card.querySelector('[data-prev]');
  if(prompt&&preview){
    preview.textContent=prompt.tpl;
    preview.dataset.text=prompt.tpl;
  }
}

function patchCard(card){
  if(!card)return;
  var drawer=card.querySelector('.drawer');
  if(drawer){
    var headings=drawer.querySelectorAll('.dh');
    text(headings[1],'ข้อความจริงที่ AI จะได้รับ');

    var sourceHelp=drawer.querySelector('.drawer-source small');
    text(sourceHelp,'แนบหรือวาง Source ก่อน แล้วคัดลอกคำสั่งด้านล่างไปใช้กับ AI ตัวไหนก็ได้');
  }
  refreshOpenPreview(card);
}

function patchPage(){
  addStyle();

  var head=document.querySelector('.head');
  var lead=head&&head.querySelector(':scope > p');
  if(lead){
    lead.innerHTML='บนหน้าเว็บเราเรียกสูตรเหล่านี้ว่า <b>“ผงปรุงรส”</b> เพื่อให้เลือกใช้ง่าย แต่เมื่อกดคัดลอก ข้อความที่ส่งให้ AI จะใช้ภาษางานปกติทั้งหมด: บริบท เป้าหมาย ข้อมูล ข้อจำกัด และรูปแบบคำตอบ';
  }

  var primer=document.querySelector('.source-primer');
  if(primer&&!primer.querySelector('.prompt-language-note')){
    var note=document.createElement('div');
    note.className='prompt-language-note';
    note.innerHTML='<b>คำเปรียบเทียบอยู่บนหน้าเว็บเท่านั้น</b><p>AI จะไม่ได้รับคำว่า “ผงปรุงรส”, “ตักผง”, “เชฟ” หรือ “ครัว” จากสูตรทั่วไป ข้อความที่คัดลอกจะเป็นคำสั่งภาษาปกติ เพื่อให้ใช้ได้ตรงกันกับ AI ทุกตัว</p><span class="prompt-language-badge">✓ UI จำง่าย · Prompt ไม่กำกวม</span>';
    primer.appendChild(note);
  }

  var guide=document.querySelector('.season-guide>summary');
  text(guide,'ทำไมหน้าเว็บเรียก “ผงปรุงรส” แต่ Prompt ใช้ภาษาปกติ?');

  document.querySelectorAll('.pc').forEach(patchCard);

  var results=document.getElementById('results');
  if(results&&!results.__plainLanguageObserver){
    results.__plainLanguageObserver=new MutationObserver(function(){
      document.querySelectorAll('.pc').forEach(patchCard);
    });
    results.__plainLanguageObserver.observe(results,{childList:true,subtree:true});
  }
}

function audit(){
  var failures=[];
  V.prompts.forEach(function(prompt){
    OLD_MARKERS.forEach(function(marker){
      if(String(prompt.tpl||'').includes(marker))failures.push(prompt.id+': '+marker);
    });
  });
  return {version:VERSION,total:V.prompts.length,passed:failures.length===0,failures:failures};
}

window.MC_PROMPT_LANGUAGE={version:VERSION,audit:audit};

function boot(){
  V.prompts.forEach(rewritePrompt);
  patchPage();
  try{
    var result=audit();
    if(!result.passed)console.warn('[Lesson 5] copied prompt still contains UI metaphor',result.failures);
  }catch(error){
    console.warn('[Lesson 5] prompt language audit failed',error);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
