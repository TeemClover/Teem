/* Bonus achievement: Forbidden Genesis Scroll — deliberately excluded from the 33-item meter. */
(function(){
'use strict';
var KEY='mc_genesis_found';
var NEW_KEY='mc_genesis_new';
var ID='mcGenesisBonus';
function unlocked(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
function activeFilter(){var b=document.querySelector('.filter[aria-pressed="true"]');return b?b.getAttribute('data-filter'):'all'}
function html(){
  var isNew=false;try{isNew=localStorage.getItem(NEW_KEY)==='1'}catch(e){}
  return '<section class="group" id="'+ID+'" data-bonus-achievement="true">'+
    '<div class="group-head"><div><span class="eyebrow">HIDDEN ORIGIN · BONUS</span><h2>ของที่ไม่อยู่ในสารบัญ</h2><p class="group-desc">ช่องพิเศษนี้ปรากฏหลังจากพบสิ่งที่ผู้สร้างซ่อนไว้ และไม่ถูกนับรวมใน 33 Achievement หลัก</p></div><span class="group-count">1/1</span></div>'+
    '<div class="grid"><a class="ach-card unlocked is-link" href="../classroom/prompts.html?scroll=forbidden" data-id="genesis-scroll">'+
      (isNew?'<span class="new">NEW</span>':'')+
      '<div class="ach-art"><img src="../img/achievement-genesis-scroll.svg" alt="ม้วนคาถา Genesis Prompt" loading="lazy" decoding="async"><span class="state">✓</span></div>'+
      '<div class="ach-body"><span class="kind">FORBIDDEN GENESIS · BONUS</span><b class="ach-name"><span class="name-icon">📜</span><span>คุณเจอ Genesis Prompt ที่ใช้สร้างวิหารแห่งนี้</span></b><span class="hint"><b>✓ ปลดแล้ว</b> — เลือกทุกหมวดในคลังพรอมพ์ แล้วเปิดม้วนคาถาที่ซ่อนอยู่</span><span class="go">กลับไปเปิดม้วนคาถา →</span></div>'+
    '</a></div></section>';
}
function inject(){
  var root=document.getElementById('album');if(!root)return;
  var old=document.getElementById(ID);
  var show=unlocked()&&activeFilter()!=='locked';
  if(!show){if(old)old.remove();return}
  if(old)return;
  var anchor=root.querySelector('.note');
  if(anchor)anchor.insertAdjacentHTML('beforebegin',html());else root.insertAdjacentHTML('beforeend',html());
  var card=document.querySelector('#'+ID+' .ach-card');
  if(card)card.addEventListener('click',function(){try{localStorage.removeItem(NEW_KEY)}catch(e){}});
}
function boot(){
  var root=document.getElementById('album');if(!root)return;
  inject();
  document.querySelectorAll('.filter').forEach(function(b){b.addEventListener('click',function(){setTimeout(inject,0)})});
  var lock=false;
  new MutationObserver(function(){
    if(lock)return;lock=true;setTimeout(function(){inject();lock=false},0);
  }).observe(root,{childList:true});
  window.addEventListener('storage',inject);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)inject()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
