(function(){
'use strict';

var SAVE='xvisorQuestOrgV2';
var CERT='xvisorQuestCertifiedStartV1';
var PRE='xvisorQuestPreSeasonV1';

function $(id){return document.getElementById(id)}
function readPre(){try{return JSON.parse(localStorage.getItem(PRE)||'null')||{bought:false,proof:false,learned:false}}catch(e){return{bought:false,proof:false,learned:false}}}
function writePre(p){localStorage.setItem(PRE,JSON.stringify(p))}
function modal(html){$('sheet').innerHTML=html;$('veil').hidden=false}
function closeModal(){$('veil').hidden=true}

function seedCertifiedGame(){
  var G={
    month:1,apMax:20,ap:20,rank:'xvisor',certXGen:false,goalHit:false,
    care:{c:58,a:42,r:40,e:38},lead:{l:35,e:35,a:35,d:35},system:38,role:26,demand:36,
    customers:[],team:[],served:0,cash:0,lastIncome:0,lastPV:0,lastTGV:0,bestTGV:0,
    successCases:0,teamActivities:0,leaderActivities:0,pv50Streak:0,lastSummary:null,
    weekly:0,monthlyEvent:false,xosUsed:false,teamActivitiesMonth:0,leaderActivitiesMonth:0,
    manualActions:0,pv:0,newInterest:0,newXvisors:0,teamGenerated:0,systemGenerated:0,expansionBuff:0
  };
  localStorage.setItem(SAVE,JSON.stringify({g:G,n:0}));
}

function loadMain(){
  if(!localStorage.getItem(SAVE))seedCertifiedGame();
  installRestartGuard();
  var main=document.createElement('script');
  main.src='./quest-v3.js?v=3';
  main.onload=function(){
    var income=document.createElement('script');
    income.src='./quest-income.js?v=1';
    document.body.appendChild(income);
  };
  document.body.appendChild(main);
}

function installRestartGuard(){
  if(window.__xvisorRestartGuard)return;
  window.__xvisorRestartGuard=true;
  var remove=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(key){
    var out=remove.call(this,key);
    if(this===localStorage&&key===SAVE){
      remove.call(this,CERT);remove.call(this,PRE);
      setTimeout(function(){location.reload()},0);
    }
    return out;
  };
}

function stepRow(ok,ico,title,sub){
  return '<div class="orgrow" style="background:'+(ok?'#e4f6e7':'#fff')+'"><span class="f">'+(ok?'✅':ico)+'</span><span class="g">'+title+'<small>'+sub+'</small></span><span class="v">'+(ok?'DONE':'')+'</span></div>';
}

function renderPre(){
  var p=readPre();
  document.documentElement.style.touchAction='pan-x pan-y pinch-zoom';
  var month=document.querySelector('.month');
  if(month)month.innerHTML='<b class="num">PRE-SEASON</b> · ก่อนเดือน 1 / 24';
  var rank=$('hRank');rank.className='badge';rank.textContent='🧪 XVISOR CANDIDATE';
  ['hPv','hTgv','hTeam','hLead'].forEach(function(id){$(id).textContent='0'});
  ['hRole','hSystem'].forEach(function(id){$(id).textContent='0'});$('hDemand').textContent='36';
  ['bRole','bSystem'].forEach(function(id){$(id).style.width='0%'});$('bDemand').style.width='36%';
  $('hPips').innerHTML='';$('hAp').textContent='—';
  document.querySelector('.tabs').style.display='none';
  document.querySelector('.endbar').style.display='none';

  $('board').innerHTML='<div class="org">'+
    '<div class="flow"><strong>เริ่มจาก 0 จริง</strong><br>ตอนนี้คุณยังไม่ใช่ Certified Xvisor · ไม่มีลูกค้า · ไม่มีทีม · ไม่มีสิทธิ์เริ่มดูแลลูกค้า</div>'+
    stepRow(p.bought,'🛍️','1 · ซื้อสินค้าและเริ่มใช้เอง','เริ่มจากเป็นผู้ใช้ก่อน ไม่ใช่เริ่มจากขาย')+
    stepRow(p.proof,'📆','2 · ทำ RoutineX / ใช้ Xircle กับตัวเอง','Be The Proof · เก็บประสบการณ์ 28 วันและเห็นข้อมูลตัวเอง')+
    stepRow(p.learned,'🎓','3 · เรียน CARE · Xircle · XOS','เข้าใจมาตรฐาน เครื่องมือ และการดูแลก่อนออกไปดูแลคนอื่น')+
    stepRow(false,'🪪','4 · สอบ Certified Xvisor','ผ่าน Certification ก่อน จึงเปิดเดือน 1 และเริ่มหาลูกค้าคนแรก')+
    '</div>';

  var h='<p class="acttitle">เส้นทางก่อนเริ่มธุรกิจจริง</p>';
  if(!p.bought)h+='<button class="btn hero" data-pre="buy"><span class="ico">🛍️</span><span class="t">ซื้อสินค้าและเริ่มใช้เอง<small>เปิดเส้นทาง Be The Proof</small></span></button>';
  else if(!p.proof)h+='<button class="btn hero" data-pre="proof"><span class="ico">📆</span><span class="t">ทำ 28 วันกับตัวเอง<small>RoutineX + Xircle · เรียนจากผลของตัวเองก่อน</small></span></button>';
  else if(!p.learned)h+='<button class="btn hero" data-pre="learn"><span class="ico">🎓</span><span class="t">เข้า Xcademy<small>CARE → Xircle → RoutineX → XOS</small></span></button>';
  else h+='<button class="btn gold" data-pre="exam"><span class="ico">🪪</span><span class="t">สอบ Certified Xvisor<small>จำลอง Knowledge · Case · Customer Role Play · Ethics</small></span></button>';
  $('acts').innerHTML=h;
  var btn=$('acts').querySelector('[data-pre]');
  if(btn)btn.onclick=function(){actPre(btn.dataset.pre)};
}

function actPre(a){
  var p=readPre();
  if(a==='buy'){p.bought=true;writePre(p);modal('<h2>BE THE PROOF</h2><div class="note good"><b>เริ่มจากตัวเองก่อน</b><br>คุณซื้อสินค้าเพื่อใช้และเรียนรู้ประสบการณ์ของตัวเอง ยังไม่มีลูกค้าและยังไม่มีรายได้</div><button class="btn" data-close>ไปต่อ</button>')}
  if(a==='proof'){p.proof=true;writePre(p);modal('<h2>28 DAYS</h2><div class="note good"><b>คุณผ่านช่วงทดลองกับตัวเองแล้ว</b><br>ได้ใช้ RoutineX / Xircle และเริ่มเข้าใจว่า Data ต้องถูกเปลี่ยนเป็น Behavior อย่างไร</div><button class="btn" data-close>ไปต่อ</button>')}
  if(a==='learn'){p.learned=true;writePre(p);modal('<h2>XCADEMY</h2><div class="note good"><b>CARE · Xircle · XOS</b><br>คุณเรียนพื้นฐานของการดูแลและระบบแล้ว ขั้นต่อไปคือ Certification</div><button class="btn" data-close>ไปสอบ</button>')}
  if(a==='exam'){
    localStorage.setItem(CERT,'1');seedCertifiedGame();
    modal('<h2>CERTIFIED XVISOR</h2><div class="note good"><b>ผ่าน Certification ในเกมแล้ว</b><br>จากนี้เกมเริ่ม <b>เดือน 1 / 24</b> ด้วยลูกค้า <b>0 คน</b><br>ลูกค้าคนแรกต้องเกิดจากการสร้างความสนใจและการลงมือของคุณเอง</div><button class="btn" data-start>เริ่มเดือน 1</button>');
    $('sheet').querySelector('[data-start]').onclick=function(){location.reload()};
    return;
  }
  var close=$('sheet').querySelector('[data-close]');if(close)close.onclick=function(){closeModal();renderPre()};
}

if(localStorage.getItem(CERT)==='1')loadMain();
else{
  localStorage.removeItem(SAVE);
  renderPre();
  $('veil').onclick=function(e){if(e.target===$('veil')){closeModal();renderPre()}};
}
})();