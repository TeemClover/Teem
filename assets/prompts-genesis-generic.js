/* Lesson 5 · keep Genesis UI language separate from copied instructions */
(function(){
'use strict';
var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var OLD_PREFIX='SOURCE FIRST — ใน Session นี้ให้ใช้ Source หลักต่อไปนี้';
var NEW_PREFIX='ในบทสนทนานี้ ให้ใช้ Source หลักต่อไปนี้เป็นฐานข้อเท็จจริง';

function normalize(text){
  return String(text||'').replace(OLD_PREFIX,NEW_PREFIX).trim();
}

function copy(text){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
  return new Promise(function(resolve,reject){
    var area=document.createElement('textarea');
    area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(area);area.select();
    try{document.execCommand('copy')?resolve():reject(new Error('copy failed'))}catch(error){reject(error)}
    area.remove();
  });
}

function paint(){
  var preview=document.getElementById('gPrev');
  if(!preview)return;
  var next=normalize(preview.innerText||preview.textContent||'');
  if(next!==(preview.innerText||preview.textContent||''))preview.textContent=next;
}

function bind(){
  var preview=document.getElementById('gPrev');
  if(preview&&!preview.__genericGenesisObserver){
    preview.__genericGenesisObserver=new MutationObserver(paint);
    preview.__genericGenesisObserver.observe(preview,{childList:true,subtree:true,characterData:true});
    paint();
  }

  document.addEventListener('click',function(event){
    var button=event.target.closest&&event.target.closest('#gCopy');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    var text=normalize(document.getElementById('gPrev')?.innerText||'');
    copy(text).then(function(){
      var old=button.textContent;button.textContent='✓ คัดลอกแล้ว';
      setTimeout(function(){button.textContent=old},1400);
    }).catch(function(){button.textContent='เลือกข้อความแล้วคัดลอกเอง'});
  },true);
}

function extendAudit(){
  var api=window.MC_PROMPT_LANGUAGE;
  if(!api||typeof api.audit!=='function'||api.__genesisExtended)return;
  var baseAudit=api.audit.bind(api);
  api.audit=function(){
    var result=baseAudit();
    var failures=(result.failures||[]).slice();
    var preview=document.getElementById('gPrev');
    var text=normalize(preview?.innerText||preview?.textContent||'');
    if(text.includes(OLD_PREFIX))failures.push('genesis: '+OLD_PREFIX);
    return Object.assign({},result,{passed:failures.length===0,failures:failures,genesisChecked:true});
  };
  api.__genesisExtended=true;
}

function boot(){bind();extendAudit()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
