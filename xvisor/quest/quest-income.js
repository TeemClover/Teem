(function(){
'use strict';
var SAVE='xvisorQuestOrgV2';
function fmt(n){return Math.round(n||0).toLocaleString('en-US')}
function rate(pv){if(pv>=100000)return .25;if(pv>=40000)return .23;return .20}
function mentorRate(pv){if(pv>=100000)return .05;if(pv>=40000)return .046;return .04}
function read(){try{var x=JSON.parse(localStorage.getItem(SAVE)||'null');return x&&x.g?x.g:null}catch(e){return null}}
function calc(G){
  var pv=G.pv||0;
  var g1=(G.team||[]).reduce(function(s,m){return s+(m.pv||0)},0);
  var deep=(G.team||[]).reduce(function(s,m){return s+(m.teamXv||0)},0);
  var tgv=pv+g1+deep;
  var c1=pv*rate(pv),c2=0;
  if(G.rank!=='xvisor')c2=(G.team||[]).reduce(function(s,m){return s+(m.pv||0)*mentorRate(m.pv||0)},0);
  var c3=tgv>=3000000?tgv*.05:0;
  return {pv:pv,tgv:tgv,rate:rate(pv),c1:c1,c2:c2,c3:c3,total:c1+c2+c3,g1:g1,deep:deep};
}
function pct(r){var n=r*100;return (n%1?n.toFixed(1):n.toFixed(0))+'%'}

var style=document.createElement('style');
style.textContent='.incomehud{border:2.5px solid var(--line);border-radius:11px;background:#fff;padding:8px;box-shadow:0 2.5px 0 var(--line)}.incomehead{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:5px}.incomehead b{font-size:11px}.incomehead strong{font:700 16px Silkscreen,Mitr,monospace;color:var(--grass-d)}.incomerows{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.incomech{border:1.8px solid var(--line);border-radius:8px;padding:5px;background:var(--paper2);min-width:0}.incomech small{display:block;font-size:8.5px;color:var(--ink2);line-height:1.25}.incomech b{display:block;font:700 10px Silkscreen,Mitr,monospace;margin-top:2px}.incomehint{font-size:8.5px;color:var(--ink2);margin-top:5px}.incomeBreak{margin-top:8px;border:2px solid var(--grass-d);background:#e4f6e7;border-radius:9px;padding:8px}.incomeBreak .ibrow{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;padding:3px 0;border-bottom:1px dotted #8da48f}.incomeBreak .ibrow:last-child{border-bottom:0;font-weight:600}.incomeBreak b{font-family:Silkscreen,Mitr,monospace}@media(max-width:390px){.incomerows{grid-template-columns:1fr}.incomech{display:flex;justify-content:space-between;align-items:center;gap:8px}.incomech small,.incomech b{display:block;margin:0}}';
document.head.appendChild(style);

var hud=document.createElement('div');hud.className='incomehud';hud.id='incomeHud';
hud.innerHTML='<div class="incomehead"><b>💰 รายได้จำลองเดือนนี้</b><strong id="incTotal">0</strong></div><div class="incomerows"><div class="incomech"><small id="inc1label">ช่อง 1 · Active Retail</small><b id="inc1">0</b></div><div class="incomech"><small>ช่อง 2 · Direct Mentoring</small><b id="inc2">LOCK</b></div><div class="incomech"><small>ช่อง 3 · Organization 5%</small><b id="inc3">LOCK</b></div></div><div class="incomehint" id="incHint">คำนวณจากยอดที่เกิดจริงใน simulation · ไม่ใช่การรับประกันรายได้</div>';
var meters=document.querySelector('.meters');if(meters)meters.insertAdjacentElement('afterend',hud);

function updateHud(){
  var G=read();if(!G)return;var x=calc(G);
  document.getElementById('incTotal').textContent=fmt(x.total);
  document.getElementById('inc1').textContent=fmt(x.c1);
  document.getElementById('inc1label').textContent='ช่อง 1 · PV × '+pct(x.rate);
  document.getElementById('inc2').textContent=G.rank==='xvisor'?'LOCK':fmt(x.c2);
  document.getElementById('inc3').textContent=x.tgv>=3000000?fmt(x.c3):'LOCK';
  var next=x.pv<40000?'อีก '+fmt(40000-x.pv)+' XV → 23%':(x.pv<100000?'อีก '+fmt(100000-x.pv)+' XV → 25%':'ขั้นส่วนตัว 25%');
  document.getElementById('incHint').textContent=next+' · ช่อง 2 เปิดเมื่อ XLEAD · ช่อง 3 เปิดเมื่อ TGV 3,000,000';
}
function updateReport(){
  var sheet=document.getElementById('sheet'),G=read();if(!sheet||!G)return;
  var h=sheet.querySelector('h2');if(!h||h.textContent.indexOf('MONTH ')!==0||sheet.querySelector('.incomeBreak'))return;
  var x=calc(G),box=document.createElement('div');box.className='incomeBreak';
  box.innerHTML='<div class="ibrow"><span>ช่อง 1 · Active Retail · '+pct(x.rate)+'</span><b>'+fmt(x.c1)+'</b></div>'+
    '<div class="ibrow"><span>ช่อง 2 · Direct Mentoring</span><b>'+(G.rank==='xvisor'?'ยังไม่เปิด':fmt(x.c2))+'</b></div>'+
    '<div class="ibrow"><span>ช่อง 3 · TGV 5%</span><b>'+(x.tgv>=3000000?fmt(x.c3):'ยังไม่ถึง 3M')+'</b></div>'+
    '<div class="ibrow"><span>รายได้จำลองรวมเดือนนี้</span><b>'+fmt(x.total)+'</b></div>';
  var receipt=sheet.querySelector('.receipt');if(receipt)receipt.insertAdjacentElement('afterend',box);else h.insertAdjacentElement('afterend',box);
}

var sheet=document.getElementById('sheet');if(sheet)new MutationObserver(function(){setTimeout(function(){updateHud();updateReport()},0)}).observe(sheet,{childList:true,subtree:true});
setInterval(function(){updateHud();updateReport()},350);
updateHud();
})();