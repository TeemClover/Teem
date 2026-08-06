/* Lesson 5 · kitchen metaphor stays in the UI; copied prompts stay literal.

   The 44 vault templates are already written in normal working language.
   Do not wrap them in a course-specific Source/seasoning preamble.
   Users may customize first (recommended) or copy the original template directly.
*/
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var V=window.MC_VAULT;
if(!V||!Array.isArray(V.prompts))return;

var VERSION='original-44-generic-ai-v2';
var EXPECTED_TOTAL=44;
var COURSE_ONLY_MARKERS=[
  'ใช้ผงปรุงรสนี้กับ Source',
  'ผงปรุงรสสำหรับงานนี้:',
  'ตักผงปรุงรส',
  'ปรุงซอส',
  'สกัดหัวซอส',
  'เชฟผู้ช่วยของคุณเอง'
];

function setText(el,value){
  if(el&&el.textContent!==value)el.textContent=value;
}

function stripCourseWrapper(value){
  var text=String(value||'').trim();
  text=text.replace(
    /^SOURCE FIRST[^\n]*\n[\s\S]*?ผงปรุงรสสำหรับงานนี้:\s*/,
    ''
  );
  text=text.replace(
    /^ใช้ Source ที่แนบหรือวางไว้ในบทสนทนานี้เป็นฐานหลักของงาน\n[\s\S]*?รายละเอียดงาน:\s*/,
    ''
  );
  return text.trim();
}

function originalTemplate(prompt){
  var stored=typeof prompt.__originalTpl==='string' ? prompt.__originalTpl.trim() : '';
  if(stored)return stripCourseWrapper(stored);
  return stripCourseWrapper(prompt.tpl);
}

function restorePrompt(prompt){
  var original=originalTemplate(prompt);
  prompt.__originalTpl=original;
  prompt.tpl=original;
  prompt.__promptLanguage=VERSION;
}

V.prompts.forEach(restorePrompt);

function addStyles(){
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
    .pc .pcb [data-act="use"].main{
      order:-2!important;background:rgb(var(--green))!important;border-color:rgb(var(--green))!important;color:#fff!important;
      flex:1 1 210px!important
    }
    .pc .pcb [data-act="raw"]{
      order:-1!important;background:#fff!important;border-color:rgb(27 106 66/.32)!important;color:rgb(var(--green))!important
    }
    .drawer .drow [data-act="copyFilled"].main{
      background:rgb(var(--green))!important;border-color:rgb(var(--green))!important;color:#fff!important
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
  var prompt=promptByCard(card);
  if(!prompt)return;

  if(card.dataset.genericPreviewVersion===VERSION)return;
  card.dataset.genericPreviewVersion=VERSION;

  var field=card.querySelector('.drawer input,.drawer textarea');
  if(field){
    field.dispatchEvent(new Event('input',{bubbles:true}));
    return;
  }

  var preview=card.querySelector('[data-prev]');
  if(preview){
    preview.textContent=prompt.tpl;
    preview.dataset.text=prompt.tpl;
  }
}

function patchCard(card){
  if(!card)return;

  var row=card.querySelector('.pcb');
  var customize=card.querySelector('[data-act="use"]');
  var direct=card.querySelector('[data-act="raw"]');

  if(customize){
    customize.classList.add('main');
    setText(customize,'⚙️ ปรับแต่งก่อนใช้');
  }
  if(direct){
    direct.classList.remove('main');
    setText(direct,'คัดลอกแบบพร้อมใช้');
  }
  if(row&&customize&&row.firstElementChild!==customize){
    row.insertBefore(customize,row.firstElementChild);
  }
  if(row&&customize&&direct&&customize.nextElementSibling!==direct){
    row.insertBefore(direct,customize.nextSibling);
  }

  var drawer=card.querySelector('.drawer');
  if(drawer){
    var headings=drawer.querySelectorAll('.dh');
    setText(headings[0],'ปรับข้อมูลให้ตรงกับงานของคุณ');
    setText(headings[1],'Prompt ที่จะส่งให้ AI');

    var sourceHelp=drawer.querySelector('.drawer-source small');
    setText(sourceHelp,'ปรับเฉพาะข้อมูลที่จำเป็น แล้วตรวจข้อความก่อนคัดลอกไปใช้กับ AI ตัวใดก็ได้');

    var copyFilled=drawer.querySelector('[data-act="copyFilled"]');
    if(copyFilled){
      copyFilled.classList.add('main');
      setText(copyFilled,'คัดลอก Prompt ที่ปรับแล้ว');
    }
  }

  refreshOpenPreview(card);
}

function patchAllCards(){
  document.querySelectorAll('.pc').forEach(patchCard);
}

function patchPage(){
  addStyles();

  var head=document.querySelector('.head');
  var lead=head&&head.querySelector(':scope > p');
  if(lead){
    lead.innerHTML='บนหน้าเว็บเราเรียกคลังนี้ว่า <b>“ผงปรุงรส”</b> เพื่อให้จำง่าย แต่ Prompt ทั้ง 44 ตัวเป็นภาษางานปกติจากคลังต้นฉบับ ใช้ได้กับ AI ทั่วไปโดยไม่ต้องรู้ศัพท์ของหลักสูตร <b>แนะนำให้กดปรับแต่งก่อนใช้</b> แล้วค่อยคัดลอก';
  }

  var primer=document.querySelector('.source-primer');
  if(primer&&!primer.querySelector('.prompt-language-note')){
    var note=document.createElement('div');
    note.className='prompt-language-note';
    note.innerHTML='<b>Prompt ต้นฉบับ 44 ตัวกลับมาแล้ว</b><p>ปุ่มหลักคือ “ปรับแต่งก่อนใช้” เพื่อให้บริบท เป้าหมาย และข้อจำกัดตรงกับงานจริง ส่วน “คัดลอกแบบพร้อมใช้” เป็นทางลัดสำหรับ Prompt ที่ข้อมูลครบอยู่แล้ว</p><span class="prompt-language-badge">✓ UI ใช้คำเปรียบเทียบ · Clipboard ใช้ภาษาปกติ</span>';
    primer.appendChild(note);
  }

  var guide=document.querySelector('.season-guide>summary');
  setText(guide,'หน้าเว็บใช้คำว่า “ผงปรุงรส” แต่ Prompt จริงหน้าตาแบบไหน?');

  patchAllCards();

  var results=document.getElementById('results');
  if(results&&!results.__genericPromptObserver){
    results.__genericPromptObserver=new MutationObserver(function(){
      patchAllCards();
    });
    results.__genericPromptObserver.observe(results,{childList:true,subtree:true,characterData:true});
    results.addEventListener('click',function(){
      window.setTimeout(patchAllCards,0);
      window.setTimeout(patchAllCards,1700);
    },true);
  }
}

function audit(){
  var failures=[];
  V.prompts.forEach(function(prompt){
    var value=String(prompt.tpl||'');
    COURSE_ONLY_MARKERS.forEach(function(marker){
      if(value.includes(marker))failures.push(prompt.id+': '+marker);
    });
  });
  if(V.prompts.length!==EXPECTED_TOTAL){
    failures.push('expected '+EXPECTED_TOTAL+' prompts, found '+V.prompts.length);
  }
  return {
    version:VERSION,
    expected:EXPECTED_TOTAL,
    total:V.prompts.length,
    passed:failures.length===0,
    failures:failures
  };
}

window.MC_PROMPT_LANGUAGE={version:VERSION,audit:audit};

function boot(){
  V.prompts.forEach(restorePrompt);
  patchPage();
  try{
    var result=audit();
    if(!result.passed)console.warn('[Lesson 5] generic AI prompt audit failed',result.failures);
  }catch(error){
    console.warn('[Lesson 5] generic AI prompt audit crashed',error);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
