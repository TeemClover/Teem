/* AI ใส่ซอส · Generic AI prompt compatibility

   Course metaphors may remain in headings and explanations.
   Text copied into an AI must use literal, tool-agnostic working language.
   This module patches only copyable prompt payloads and exposes an audit API.
*/
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
var item=meta&&meta.content;
if(!item||!/^learn:/.test(item))return;

var VERSION='generic-ai-course-v1';

var REPLACEMENTS={
  'learn:free-ai':[
    ['เก็บวัตถุดิบสำคัญ','เก็บข้อมูลสำคัญ'],
    ['เมื่อฉันพูดว่า “ปรุงซอส”','เมื่อฉันพูดว่า “สร้าง Source”'],
    ['## วัตถุดิบและข้อมูลที่มี','## ข้อมูลและเอกสารที่มี'],
    ['## รสชาติของงาน: น้ำเสียง สไตล์ และตัวอย่าง','## น้ำเสียง สไตล์ และตัวอย่างที่ต้องรักษา'],
    ['อ่านวัตถุดิบทั้งหมดที่ฉันแนบ แล้วช่วย “สกัดหัวซอส” สำหรับงานต่อไป','อ่านไฟล์และข้อมูลทั้งหมดที่ฉันแนบ แล้วช่วยสกัด Source สำหรับงานต่อไป'],
    ['บอกว่าวัตถุดิบส่วนใดควรเก็บเป็นภาคผนวก','บอกว่าข้อมูลส่วนใดควรเก็บเป็นภาคผนวก'],
    ['หัวซอสที่สกัดได้','Source ที่สกัดได้'],
    ['ฉันมีหัวซอสหรือ Source ตั้งต้นอยู่ด้านล่าง','ฉันมี Source ตั้งต้นอยู่ด้านล่าง'],
    ['ช่วยปรุง Source ชุดใหม่ให้เหมาะกับงานนี้โดย','ช่วยจัดทำ Source ชุดใหม่ให้เหมาะกับงานนี้โดย'],
    ['[วางหัวซอสหรือแนบไฟล์ตรงนี้]','[วาง Source หรือแนบไฟล์ตรงนี้]']
  ],
  'learn:image-ai':[
    ['Decisions Added From This Taste Test','Decisions Added From This Review']
  ],
  'learn:clip-ai':[
    ['Production Recipe Card','Production Brief'],
    ['Recipe Card','Production Brief']
  ],
  'learn:notebooklm':[],
  'learn:first-web':[]
};

var COURSE_ONLY_MARKERS=[
  'ใช้ผงปรุงรสนี้กับ Source',
  'ผงปรุงรสสำหรับงานนี้:',
  'ตักผงปรุงรส',
  'ปรุงซอส',
  'สกัดหัวซอส',
  'หัวซอส',
  'ซอสขวด',
  'เชฟผู้ช่วย',
  'Production Recipe Card',
  'Recipe Card',
  'Taste Test'
];

function replaceAll(value,from,to){
  return String(value).split(from).join(to);
}

function editableTextNodes(root){
  var nodes=[];
  if(!root)return nodes;
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
    var parent=node.parentElement;
    if(!parent)return NodeFilter.FILTER_REJECT;
    if(parent.closest('button,script,style,input,textarea,select,option'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  while(walker.nextNode())nodes.push(walker.currentNode);
  return nodes;
}

function rewriteElement(root,replacements){
  editableTextNodes(root).forEach(function(node){
    var next=node.nodeValue;
    replacements.forEach(function(pair){next=replaceAll(next,pair[0],pair[1])});
    if(next!==node.nodeValue)node.nodeValue=next;
  });
}

function copyableRoots(){
  var roots=[].slice.call(document.querySelectorAll('.prompt'));
  var dynamic=document.getElementById('promptText');
  if(dynamic)roots.push(dynamic);
  return roots;
}

function promptText(root){
  if(!root)return'';
  var clone=root.cloneNode(true);
  clone.querySelectorAll&&clone.querySelectorAll('button').forEach(function(button){button.remove()});
  return (clone.innerText||clone.textContent||'').trim();
}

function patchStaticPrompts(){
  if(item==='learn:prompts')return;
  var replacements=REPLACEMENTS[item]||[];
  copyableRoots().forEach(function(root){rewriteElement(root,replacements)});
}

function collectPayloads(){
  var payloads=[];

  copyableRoots().forEach(function(root,index){
    payloads.push({id:item+':dom-'+(index+1),text:promptText(root)});
  });

  if(item==='learn:prompts'){
    var V=window.MC_VAULT;
    if(V&&Array.isArray(V.prompts)){
      V.prompts.forEach(function(prompt){
        payloads.push({id:'learn:prompts:'+prompt.id,text:String(prompt.tpl||'')});
      });
    }
    var genesis=document.getElementById('gPrev');
    if(genesis)payloads.push({id:'learn:prompts:genesis',text:genesis.innerText||genesis.textContent||''});
  }

  return payloads;
}

function audit(){
  var failures=[];
  var payloads=collectPayloads();

  payloads.forEach(function(payload){
    COURSE_ONLY_MARKERS.forEach(function(marker){
      if(payload.text.includes(marker))failures.push(payload.id+': '+marker);
    });
  });

  var lessonFive=window.MC_PROMPT_LANGUAGE&&window.MC_PROMPT_LANGUAGE.audit;
  if(typeof lessonFive==='function'){
    var result=lessonFive();
    if(!result.passed){
      result.failures.forEach(function(failure){failures.push('lesson-5: '+failure)});
    }
  }

  return {
    version:VERSION,
    lesson:item,
    promptCount:payloads.length,
    passed:failures.length===0,
    failures:failures
  };
}

function run(){
  patchStaticPrompts();
  var result=audit();
  window.MC_COURSE_PROMPT_AUDIT={version:VERSION,run:audit,last:result};
  if(!result.passed)console.warn('[AI Sauce] generic AI prompt audit failed',result);
}

function watch(){
  var root=document.querySelector('main')||document.body;
  if(!root||root.__genericAiPromptObserver)return;
  root.__genericAiPromptObserver=new MutationObserver(function(){
    patchStaticPrompts();
  });
  root.__genericAiPromptObserver.observe(root,{childList:true,subtree:true,characterData:true});
}

function boot(){
  run();
  watch();
  window.addEventListener('load',function(){run()},{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
