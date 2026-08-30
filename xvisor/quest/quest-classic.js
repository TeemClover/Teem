(function(){
'use strict';

var XV_SET=7000, PRICE_SET=7490, GOAL=3000000, MONTHS=24, SAVE='xvisorQuestClassicV1';
var NAMES=['มิ้นท์','พลอย','เมย์','นนท์','โอม','โจ','แพร','วิน','แนน','ตูน','ฝ้าย','นัท','อ้อม','ซัน','ก้อย','เบิร์ด'];
var FACES=['👩','🧑','👨','👩‍🦰','👨‍🦱','👩‍🦱','🧔','👱','🧑‍🦳','👨'];
var G,view='people',sel=null,nid=0;

function $(id){return document.getElementById(id)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function fmt(n){return Math.round(n||0).toLocaleString('en-US')}
function money(n){return '฿'+fmt(n)}
function save(){try{localStorage.setItem(SAVE,JSON.stringify({g:G,n:nid}))}catch(e){}}
function load(){try{var x=JSON.parse(localStorage.getItem(SAVE)||'null');if(x&&x.g&&x.g.version===1){G=x.g;nid=x.n||100;return true}}catch(e){}return false}
function toast(s){var d=document.createElement('div');d.className='toast';d.textContent=s;$('toasts').appendChild(d);setTimeout(function(){d.remove()},1900)}
function modal(h){$('sheet').innerHTML=h;$('veil').hidden=false;var c=$('sheet').querySelector('[data-close]');if(c)c.onclick=closeModal}
function closeModal(){$('veil').hidden=true}

function tierOf(xv){
  if(xv>=100000)return{lv:3,rate:.25,mentor:.05,name:'STAR 25%',short:'25%'};
  if(xv>=40000)return{lv:2,rate:.23,mentor:.046,name:'ROOKIE 23%',short:'23%'};
  return{lv:1,rate:.20,mentor:.04,name:'START 20%',short:'20%'};
}
function customerCount(){return G.people.filter(function(p){return p.state==='customer'}).length}
function leadCount(){return G.people.filter(function(p){return p.state==='lead'}).length}
function interestCount(){return G.people.filter(function(p){return p.interest}).length}
function xleadCount(){return G.team.filter(function(m){return m.rank==='xlead'}).length}
function teamXV(){return G.team.reduce(function(s,m){return s+(m.monthXV||0)},0)}
function deepXV(){return G.team.reduce(function(s,m){return s+(m.deepXV||0)},0)}
function tgv(){return G.personalXV+teamXV()+deepXV()}
function income(){
  var t=tierOf(G.personalXV),c1=G.personalXV*t.rate,c2=0,c3=0;
  if(G.rank==='xlead'||G.rank==='xgen')G.team.forEach(function(m){c2+=(m.monthXV||0)*tierOf(m.monthXV||0).mentor});
  if(G.rank==='xgen'&&tgv()>=GOAL)c3=tgv()*.05;
  return{tier:t,c1:c1,c2:c2,c3:c3,total:c1+c2+c3};
}
function spend(n){if(G.ap<n){toast('แรงเดือนนี้ไม่พอ');return false}G.ap-=n;G.manualActions++;return true}

function mkLead(){return{id:++nid,n:pick(NAMES),f:pick(FACES),state:'lead',trust:Math.round(rnd(28,48)),result:0,asp:Math.round(rnd(8,20)),interest:false,totalSets:0,boughtThisMonth:0,cared:false};}
function mkMember(c){return{id:++nid,n:c.n,f:c.f,rank:'xvisor',system:clamp(Math.round(c.trust*.65+c.result*.25),32,62),leadPotential:20,activeCustomers:0,monthXV:0,downline:0,deepXV:0};}

function newGame(){
  nid=0;
  G={version:1,phase:'pre',preStep:0,month:0,ap:0,apMax:20,rank:'candidate',
    people:[],team:[],personalXV:0,personalSets:0,cash:0,lastPayout:0,lastPersonalXV:0,lastTGV:0,bestTGV:0,
    role:12,system:18,demand:36,weekly:0,monthlyEvent:false,xosUsed:false,manualActions:0,
    teamActions:0,systemActions:0,teamActivityTotal:0,successCases:0,goalHit:false,lastSummary:null};
  save();
}
function startMain(){
  G.phase='main';G.month=1;G.ap=20;G.apMax=20;G.rank='xvisor';G.role=24;G.system=30;G.personalXV=0;G.personalSets=0;
  G.people=[];G.team=[];G.cash=0;G.lastPayout=0;G.lastPersonalXV=0;G.lastTGV=0;G.bestTGV=0;resetMonthFlags();save();
}
function resetMonthFlags(){
  G.weekly=0;G.monthlyEvent=false;G.xosUsed=false;G.manualActions=0;G.teamActions=0;G.systemActions=0;G.personalXV=0;G.personalSets=0;
  G.people.forEach(function(p){p.boughtThisMonth=0;p.cared=false});
  G.team.forEach(function(m){m.monthXV=0;m.deepXV=0});
}

function readiness(p){return clamp(Math.round(p.trust+(p.state==='customer'?p.result*.25:0)),0,100)}
function heartClass(v){return v>=70?'good':v>=45?'mid':''}

function goalInfo(){
  if(G.phase==='pre'){
    var pres=[['ซื้อสินค้าและเริ่มใช้เอง','เริ่มจากตัวเองก่อน',0,1],['ทำ RoutineX / Xircle 28 วัน','รู้จักข้อมูลและผลของตัวเอง',0,1],['เรียน Xcademy','CARE · Xircle · XOS',0,1],['สอบ Certified XVISOR','ผ่านก่อนถึงเริ่มมีลูกค้า',0,1]];
    var x=pres[Math.min(G.preStep,3)];return{title:x[0],sub:x[1],now:0,max:1};
  }
  if(G.people.length===0)return{title:'หาคนคุยคนแรก',sub:'ยังไม่ต้องขาย แค่เริ่มรู้จักคน',now:0,max:1};
  if(customerCount()===0)return{title:'ขายเซตแรกให้ได้',sub:'คุยให้เข้าใจก่อน แล้วค่อยเสนอ',now:G.personalSets,max:1};
  if(customerCount()<3)return{title:'สร้างลูกค้า 3 คน',sub:'ให้การขายเริ่มเป็นระบบ ไม่ใช่ครั้งเดียว',now:customerCount(),max:3};
  if(G.successCases<1)return{title:'พาลูกค้า 1 คนให้เห็นผล',sub:'ยอดขายเริ่มต้นเรื่อง แต่ผลลัพธ์ทำให้เขาอยู่ต่อ',now:G.successCases,max:1};
  if(G.team.length===0&&interestCount()===0)return{title:'ดูแลจนมีคนอยากเป็น XVISOR',sub:'บางคนจะถามเองเมื่อเขาเห็นผลและเห็นคุณเติบโต',now:0,max:1};
  if(G.team.length===0)return{title:'สร้าง XVISOR คนแรก',sub:'พาคนที่สนใจเข้า Xcademy และ Certification',now:0,max:1};
  if(G.rank==='xvisor'){
    var q=Math.max(G.personalXV,G.lastPersonalXV);
    if(q<40000)return{title:'ทำยอดส่วนตัว 40,000 XV',sub:'ให้ฐานลูกค้าแข็งแรงก่อนขึ้น XLEAD',now:q,max:40000};
    return{title:'สอบ XLEAD',sub:'มีฐานลูกค้าและ XVISOR G1 แล้ว',now:1,max:1};
  }
  if(G.rank==='xlead'){
    if(xleadCount()<2)return{title:'พัฒนา XLEAD ในสังกัด 2 คน',sub:'จากทำเอง → ทำให้คนอื่นพัฒนาคนได้',now:xleadCount(),max:2};
    var v=Math.max(tgv(),G.lastTGV);if(v<1000000)return{title:'สร้าง TGV 1,000,000',sub:'พิสูจน์ว่าทีมเริ่มเดินเป็นระบบ',now:v,max:1000000};
    return{title:'สอบ XGEN',sub:'เปลี่ยนจากดูแลทีม เป็นดูแลระบบ',now:1,max:1};
  }
  return{title:'3M ORGANIZATION',sub:'เป้าหมายคือระบบที่สร้างยอด 3,000,000 XV/เดือน',now:Math.max(tgv(),G.lastTGV),max:GOAL};
}

function draw(){
  if(G.phase==='pre'){drawPre();save();return}
  document.querySelector('.tabs').style.display='flex';document.querySelector('.endbar').style.display='block';
  $('hMonth').textContent=G.month;$('hAp').textContent=G.ap;
  var inc=income();$('hXv').textContent=fmt(G.personalXV);$('hTier').textContent=inc.tier.short;$('hIncome').textContent=money(inc.total);$('hCash').textContent=money(G.cash);
  var rb=$('hRank');rb.className='badge '+(G.rank==='xlead'?'lead':G.rank==='xgen'?'gen':'');rb.textContent=G.rank==='xvisor'?'🌱 XVISOR':G.rank==='xlead'?'⚔️ XLEAD':'👑 XGEN';
  var pips='';for(var i=0;i<G.apMax;i++)pips+='<i class="pip'+(i<G.ap?' on':'')+'"></i>';$('hPips').innerHTML=pips;
  var t=inc.tier;if(t.lv===3)$('hNext').innerHTML='STAR 25% · ขั้นรายได้ส่วนตัวสูงสุดในเกม';else{var nx=t.lv===1?40000:100000;$('hNext').innerHTML='อีก <b>'+fmt(Math.max(0,nx-G.personalXV))+' XV</b> → '+tierOf(nx).name;}
  var gi=goalInfo(),gp=gi.max?clamp(gi.now/gi.max*100,0,100):0;$('goalTitle').textContent=gi.title;$('goalSub').textContent=gi.sub;$('goalBar').style.width=gp+'%';
  $('nPeople').textContent=G.people.length;$('nTeam').textContent=G.team.length;
  ['tabPeople','tabTeam','tabOrg'].forEach(function(id,i){$(id).setAttribute('aria-selected',view===['people','team','org'][i])});
  drawBoard();drawActs();save();
}

function drawPre(){
  document.querySelector('.tabs').style.display='none';document.querySelector('.endbar').style.display='none';
  document.querySelector('.month').innerHTML='<b class="num">ก่อนเริ่ม</b>';$('hAp').textContent='—';$('hPips').innerHTML='';
  $('hRank').className='badge';$('hRank').textContent='🧪 XVISOR CANDIDATE';$('hXv').textContent='0';$('hTier').textContent='—';$('hIncome').textContent='฿0';$('hCash').textContent='฿0';$('hNext').textContent='ยังไม่มีรายได้ · ยังไม่มีลูกค้า';
  var gi=goalInfo();$('goalTitle').textContent=gi.title;$('goalSub').textContent=gi.sub;$('goalBar').style.width='0%';
  var labels=[['🛍️','ซื้อสินค้าและเริ่มใช้เอง','เริ่มจากเป็นผู้ใช้ก่อน'],['📆','ทำ 28 วันกับตัวเอง','RoutineX + Xircle'],['🎓','เรียน Xcademy','CARE · Xircle · XOS'],['🪪','สอบ Certified XVISOR','ผ่านก่อนเริ่มดูแลลูกค้า']];
  var h='<div class="presteps">';labels.forEach(function(x,i){h+='<div class="prestep '+(i<G.preStep?'done':'')+'"><span class="n">'+(i<G.preStep?'✅':x[0])+'</span><span class="g">'+(i+1)+' · '+x[1]+'<small>'+x[2]+'</small></span></div>'});h+='</div>';$('board').innerHTML=h;
  var a=labels[Math.min(G.preStep,3)];$('acts').innerHTML='<p class="acthead">ทำทีละขั้น ไม่ต้องจำระบบทั้งหมด</p><button class="btn hero" data-a="pre"><span class="ico">'+a[0]+'</span><span class="t">'+a[1]+'<small>'+a[2]+'</small></span></button>';
  $('acts').querySelector('[data-a]').onclick=doPre;
}
function doPre(){
  if(G.preStep===0){G.preStep=1;modal('<h2>BE THE PROOF</h2><div class="note good"><b>ซื้อเพื่อใช้เองก่อน</b><br>ตอนนี้ยังไม่มีลูกค้า ไม่มี XV และไม่มีรายได้</div><button class="btn" data-close>ไปต่อ</button>')}
  else if(G.preStep===1){G.preStep=2;modal('<h2>28 DAYS</h2><div class="note good"><b>คุณผ่านช่วงทดลองกับตัวเอง</b><br>เริ่มเข้าใจว่าข้อมูลและ Routine เชื่อมกับพฤติกรรมอย่างไร</div><button class="btn" data-close>ไปต่อ</button>')}
  else if(G.preStep===2){G.preStep=3;modal('<h2>XCADEMY</h2><div class="note good"><b>เรียนพื้นฐานการดูแลแล้ว</b><br>ขั้นต่อไปคือ Certification ก่อนออกไปดูแลคนจริง</div><button class="btn" data-close>ไปสอบ</button>')}
  else{startMain();modal('<h2>CERTIFIED XVISOR</h2><div class="note good"><b>เริ่มเดือน 1 / 24</b><br>ลูกค้า 0 คน · XV 0 · รายได้ ฿0<br><br>งานแรกง่ายมาก: <b>หาคนคุยคนแรก</b></div><button class="btn" data-close>เริ่มเกม</button>')}
  draw();
}

function drawBoard(){
  var b=$('board');
  if(view==='org'){drawOrg();return}
  var list=view==='people'?G.people:G.team;
  if(!list.length){b.innerHTML=view==='people'?'<div class="empty"><b>ยังไม่มีใครในรายชื่อ</b>กด “หาคนคุยใหม่” ด้านล่าง<br>คนที่เพิ่งรู้จักยังไม่ใช่ลูกค้าจนกว่าจะซื้อ</div>':'<div class="empty"><b>ยังไม่มี XVISOR G1</b>ลูกค้าที่เห็นผลอาจสนใจเติบโตเป็น XVISOR ได้เอง</div>';return}
  var h='<div class="grid">';list.forEach(function(x){var s=sel&&sel.id===x.id;if(view==='people'){
    var ready=readiness(x),label=x.state==='lead'?'กำลังคุย':'ลูกค้า';
    h+='<button class="who '+(s?'sel':'')+'" data-id="'+x.id+'">'+(x.interest?'<span class="tag interest">XVISOR?</span>':'')+'<span class="face">'+x.f+'</span><span class="nm">'+x.n+'</span><span class="sub">'+label+' · พร้อม '+ready+'%</span>'+(x.state==='customer'?'<span class="xv">ซื้อรวม '+x.totalSets+' เซต</span>':'')+'<span class="hp"><i class="'+heartClass(ready)+'" style="width:'+ready+'%"></i></span></button>';
  }else{
    h+='<button class="who '+(s?'sel':'')+'" data-id="'+x.id+'">'+(x.rank==='xlead'?'<span class="tag lead">XLEAD</span>':'')+'<span class="face">'+x.f+'</span><span class="nm">'+x.n+'</span><span class="xv">'+fmt(x.monthXV)+' XV</span><span class="sub">ลูกค้า '+x.activeCustomers+' · ระบบ '+x.system+'</span><span class="hp"><i class="'+heartClass(x.system)+'" style="width:'+x.system+'%"></i></span></button>';
  }});h+='</div>';b.innerHTML=h;Array.prototype.forEach.call(b.querySelectorAll('.who'),function(el){el.onclick=function(){var id=+el.dataset.id,arr=view==='people'?G.people:G.team,f=arr.filter(function(z){return z.id===id})[0];sel=sel&&sel.id===id?null:f;draw()}});
}

function drawOrg(){
  var tv=tgv(),shown=Math.max(tv,G.lastTGV),prog=clamp(shown/GOAL*100,0,100),inc=income();
  var h='<div class="org"><div class="tgvbar"><i style="width:'+prog+'%"></i><span>TGV '+fmt(shown)+' / 3,000,000</span></div>'+
    '<div class="incomeBox"><div class="incomeCell"><small>ช่อง 1 · ขาย/ดูแล</small><b>'+money(inc.c1)+'</b></div><div class="incomeCell"><small>ช่อง 2 · พัฒนา G1</small><b>'+(G.rank==='xvisor'?'LOCK':money(inc.c2))+'</b></div><div class="incomeCell"><small>ช่อง 3 · 3M Organization</small><b>'+(G.rank==='xgen'&&shown>=GOAL?money(inc.c3):'LOCK')+'</b></div></div>'+
    '<div class="orgrow me"><span class="f">🧑‍🚀</span><span class="g">คุณ<small>ยอดส่วนตัวเดือนนี้ · '+tierOf(G.personalXV).name+'</small></span><span class="v">'+fmt(G.personalXV)+'</span></div>';
  if(!G.team.length)h+='<div class="empty"><b>สังกัดยังว่าง</b>เริ่มจากลูกค้า → ผลลัพธ์ → XVISOR คนแรก</div>';
  G.team.forEach(function(m){h+='<div class="orgrow"><span class="f">'+m.f+'</span><span class="g">'+m.n+'<small>'+(m.rank==='xlead'?'XLEAD':'XVISOR')+' · ลูกค้า '+m.activeCustomers+'</small></span><span class="v">'+fmt(m.monthXV)+'</span></div>';if(m.downline>0)h+='<div class="orgrow g2"><span class="f">👥</span><span class="g">ทีมของ'+m.n+'<small>'+m.downline+' XVISOR รุ่นถัดไป</small></span><span class="v">'+fmt(m.deepXV)+'</span></div>'});
  if(G.lastSummary)h+='<div class="flow"><b>เดือนก่อน:</b> คุณทำ '+G.lastSummary.manual+' ครั้ง · ทีมทำเอง '+G.lastSummary.teamActions+' ครั้ง · ระบบต่อยอด '+G.lastSummary.systemActions+' ครั้ง</div>';
  h+='</div>';$('board').innerHTML=h;
}

function button(a,ico,title,sub,cost,disabled,cls){return'<button class="btn '+(cls||'')+'" data-a="'+a+'" '+(disabled?'disabled':'')+'><span class="ico">'+ico+'</span><span class="t">'+title+'<small>'+sub+'</small></span>'+(cost==null?'':'<span class="cost">'+cost+' AP</span>')+'</button>'}
function drawActs(){
  var h='<p class="acthead">เลือกสิ่งที่ทำตอนนี้ — การขายเกิดจากคนที่พร้อม ไม่ใช่กดแล้วได้ยอดฟรี</p>';
  if(view==='people'&&sel){
    if(sel.interest)h+=button('academy','🎓','พา '+sel.n+' เข้า Xcademy','เรียน + Certification ก่อนกลายเป็น XVISOR G1',3,G.ap<3,'hero');
    if(sel.state==='lead'){
      h+=button('talk','💬','คุยและเข้าใจ '+sel.n,'เพิ่มความไว้ใจ · ตอนนี้พร้อม '+readiness(sel)+'%',2,G.ap<2);
      h+=button('sell','🛍️','เสนอ RoutineX 1 เซต','ถ้าซื้อ: '+money(PRICE_SET)+' · +'+fmt(XV_SET)+' XV · รายได้คำนวณทันที',2,G.ap<2,'gold');
    }else{
      h+=button('care','❤️','ดูแล '+sel.n,'ช่วยให้เห็นผล · เพิ่มโอกาสซื้อซ้ำและสนใจ XVISOR',2,G.ap<2);
      h+=button('sell','🔁','ต่อ RoutineX รอบนี้',sel.boughtThisMonth?'ซื้อรอบนี้แล้ว':'ซื้อซ้ำ: '+money(PRICE_SET)+' · +'+fmt(XV_SET)+' XV',1,G.ap<1||sel.boughtThisMonth,'gold');
    }
  }
  if(view==='team'&&sel&&(G.rank==='xlead'||G.rank==='xgen'))h+=button('coach','🧭','ช่วย '+sel.n+' วางระบบ','เพิ่มความสามารถให้เขาหาลูกค้าและสร้างทีมเอง ไม่เสกยอดตรงๆ',3,G.ap<3,'hero');
  h+=button('find','👋','หาคนคุยใหม่','ได้คนใหม่ 1 คน · ยังไม่ใช่ลูกค้าจนกว่าจะซื้อ',3,G.ap<3);
  if(customerCount()>0)h+=button('xos','📋','ติดตามลูกค้าด้วย XOS','เพิ่มโอกาสซื้อซ้ำของลูกค้าทั้งพอร์ต',2,G.ap<2||G.xosUsed);
  if(G.team.length>0)h+=button('weekly','📅','พาทีมเข้า Weekly','เพิ่มความสามารถให้ XVISOR หลายคนพร้อมกัน',3,G.ap<3||G.weekly>=4,'gold');
  if(G.people.length+G.team.length>0)h+=button('event','🎪','พาเข้างานประจำเดือน','ลูกค้าเชื่อมกับ Community · ทีมได้แรงส่ง',5,G.ap<5||G.monthlyEvent,'gold');
  if(G.rank==='xvisor')h+=button('examLead','⚔️','สอบ XLEAD','ต้องมี XVISOR G1 ≥ 1 และยอดส่วนตัว 40,000 XV ในเดือนปัจจุบันหรือเดือนก่อน',4,G.ap<4||!leadEligible(),'hero');
  if(G.rank==='xlead')h+=button('examGen','👑','สอบ XGEN','ต้องมี XLEAD ในสังกัด 2 คน และ TGV เคยถึง 1,000,000',5,G.ap<5||!genEligible(),'hero');
  h+=button('income','💰','ดูรายได้ 3 ช่อง','แยกให้ชัด: ขายเอง / พัฒนา G1 / 3M Organization',null,false);
  $('acts').innerHTML=h;Array.prototype.forEach.call($('acts').querySelectorAll('[data-a]'),function(el){el.onclick=function(){act(el.dataset.a)}});
}
function leadEligible(){return G.team.length>=1&&Math.max(G.personalXV,G.lastPersonalXV)>=40000}
function genEligible(){return xleadCount()>=2&&Math.max(tgv(),G.lastTGV)>=1000000}

function act(a){
  if(a==='find'){
    if(!spend(3))return;var p=mkLead();G.people.push(p);toast('รู้จัก '+p.n+' แล้ว · ยังไม่ใช่ลูกค้า');
  }
  if(a==='talk'&&sel){
    if(!spend(2))return;sel.trust=clamp(sel.trust+Math.round(rnd(14,22)),0,100);G.role=clamp(G.role+1,0,100);toast(sel.n+' ไว้ใจคุณมากขึ้น');
  }
  if(a==='sell'&&sel){if(!spend(sel.state==='customer'?1:2))return;attemptSale(sel)}
  if(a==='care'&&sel){
    if(!spend(2))return;sel.cared=true;sel.trust=clamp(sel.trust+8,0,100);sel.result=clamp(sel.result+Math.round(rnd(13,21)),0,100);sel.asp=clamp(sel.asp+Math.round(3+G.role/30),0,100);if(!sel.interest&&sel.result>=65&&sel.trust>=70&&sel.asp>=58){sel.interest=true;toast(sel.n+' เริ่มถามเรื่อง XVISOR') }else toast(sel.n+' เห็นผลชัดขึ้น');
  }
  if(a==='academy'&&sel&&sel.interest){
    if(!spend(3))return;var m=mkMember(sel);G.team.push(m);G.people=G.people.filter(function(p){return p.id!==sel.id});modal('<h2>NEW XVISOR G1</h2><div class="note good"><b>'+sel.n+' ผ่าน Xcademy + Certification</b><br>เขาไม่ได้เกิดจากการกด Recruit แต่เกิดจากลูกค้าที่เห็นผลและอยากเติบโตต่อ</div><button class="btn" data-close>ดูทีม</button>');sel=null;view='team';
  }
  if(a==='xos'){
    if(!spend(2))return;G.xosUsed=true;G.system=clamp(G.system+4,0,100);G.people.forEach(function(p){if(p.state==='customer'){p.trust=clamp(p.trust+4,0,100);p.result=clamp(p.result+3,0,100)}});toast('XOS · ลูกค้าทั้งพอร์ตถูกติดตาม');
  }
  if(a==='weekly'){
    if(!spend(3))return;G.weekly++;G.teamActivityTotal++;G.team.forEach(function(m){m.system=clamp(m.system+6,0,100);m.leadPotential=clamp(m.leadPotential+7,0,100)});toast('Weekly · ทีม '+G.team.length+' คนเก่งขึ้นพร้อมกัน');
  }
  if(a==='event'){
    if(!spend(5))return;G.monthlyEvent=true;G.demand=clamp(G.demand+7,0,100);G.role=clamp(G.role+3,0,100);G.people.forEach(function(p){p.trust=clamp(p.trust+5,0,100);p.asp=clamp(p.asp+8,0,100)});G.team.forEach(function(m){m.system=clamp(m.system+4,0,100)});toast('งานประจำเดือน · Demand และความเชื่อมั่นเพิ่ม');
  }
  if(a==='coach'&&sel){
    if(!spend(3))return;sel.system=clamp(sel.system+10,0,100);sel.leadPotential=clamp(sel.leadPotential+14,0,100);toast(sel.n+' วางระบบได้ดีขึ้น');
  }
  if(a==='examLead'&&leadEligible()){
    if(!spend(4))return;G.rank='xlead';G.apMax=22;G.ap+=2;modal('<h2>CERTIFIED XLEAD</h2><div class="note good"><b>ช่อง 2 เปิดแล้ว</b><br>จากนี้รายได้ Direct Mentoring 4–5% มาจากยอดของ XVISOR G1 ที่คุณพัฒนา ไม่ใช่จากการชวนคนเฉยๆ</div><button class="btn" data-close>ไปต่อ</button>');
  }
  if(a==='examGen'&&genEligible()){
    if(!spend(5))return;G.rank='xgen';G.apMax=24;G.ap+=2;modal('<h2>CERTIFIED XGEN</h2><div class="note good"><b>คุณเข้าสู่บทสร้างระบบ</b><br>ช่อง 3 ยังไม่จ่ายจนกว่า TGV เดือนนั้นจะถึง 3,000,000 XV</div><button class="btn" data-close>ไปต่อ</button>');
  }
  if(a==='income')showIncome();
  draw();
}

function attemptSale(p){
  if(p.boughtThisMonth){toast('คนนี้ซื้อรอบนี้แล้ว');return}
  var before=income(),oldTier=before.tier,ready=readiness(p),chance;
  if(p.state==='customer')chance=clamp(.45+p.trust/250+p.result/350+(G.xosUsed?.08:0),.45,.96);
  else chance=clamp(.18+p.trust/150+G.demand/600,.28,.92);
  if(Math.random()>chance){p.trust=clamp(p.trust+3,0,100);modal('<h2>ยังไม่ซื้อ</h2><div class="note"><b>'+p.n+' ยังไม่พร้อม</b><br>การเสนอขายไม่ได้แปลว่าจะขายได้ทุกครั้ง ลองคุยให้เข้าใจหรือสร้างความเชื่อมั่นก่อน</div><button class="btn" data-close>โอเค</button>');return}
  p.state='customer';p.boughtThisMonth=1;p.totalSets++;p.trust=clamp(p.trust+6,0,100);p.result=clamp(p.result+5,0,100);G.personalXV+=XV_SET;G.personalSets++;
  var after=income(),delta=after.c1-before.c1,tierUp=after.tier.lv>oldTier.lv;
  modal('<h2>SALE!</h2><div class="rcp"><div class="r"><span>ลูกค้า</span><b>'+p.n+'</b></div><div class="r"><span>ยอดขายสินค้า</span><b>'+money(PRICE_SET)+'</b></div><div class="r"><span>XV ที่เพิ่ม</span><b>+'+fmt(XV_SET)+' XV</b></div><div class="r"><span>ระดับรายได้ตอนนี้</span><b>'+after.tier.short+'</b></div><div class="r"><span>รายได้ช่อง 1 เพิ่มจากดีลนี้</span><b>+'+money(delta)+'</b></div><div class="tot"><span>รายได้ช่อง 1 สะสมเดือนนี้</span><b>'+money(after.c1)+'</b></div></div>'+(tierUp?'<div class="note good"><b>LEVEL UP → '+after.tier.name+'</b><br>เมื่อยอดเดือนนี้ข้ามขั้น ระบบคำนวณรายได้ส่วนตัวทั้งเดือนด้วยอัตราใหม่ จึงเห็นรายได้เพิ่มมากกว่าโบนัสของเซตล่าสุดอย่างเดียว</div>':'<div class="note">ยอดขาย '+money(PRICE_SET)+' ไม่ใช่ตัวเลขเดียวกับรายได้ของคุณ · เกมแยกยอดขาย, XV และค่าตอบแทนให้เห็นชัด</div>')+'<button class="btn" data-close>รับทราบ</button>');
}

function showIncome(){
  var inc=income(),tv=tgv();
  modal('<h2>รายได้เดือนนี้</h2><div class="rcp"><div class="r"><span>ยอดขายสินค้าของคุณ<small>'+G.personalSets+' เซต × '+money(PRICE_SET)+'</small></span><b>'+money(G.personalSets*PRICE_SET)+'</b></div><div class="r"><span>XV ส่วนตัว</span><b>'+fmt(G.personalXV)+'</b></div><div class="r"><span>ช่อง 1 · Active Retail '+inc.tier.short+'</span><b>'+money(inc.c1)+'</b></div><div class="r"><span>ช่อง 2 · Direct Mentoring 4–5%</span><b>'+(G.rank==='xvisor'?'LOCK':money(inc.c2))+'</b></div><div class="r"><span>ช่อง 3 · Organization 5%<small>TGV '+fmt(tv)+' / 3,000,000</small></span><b>'+(G.rank==='xgen'&&tv>=GOAL?money(inc.c3):'LOCK')+'</b></div><div class="tot"><span>รายได้สะสมเดือนนี้</span><b>'+money(inc.total)+'</b></div></div><div class="note"><b>เงินรับแล้วทั้งหมด '+money(G.cash)+'</b><br>รายได้ด้านบนคือยอดสะสมของเดือนปัจจุบัน เมื่อกดจบเดือน เกมจะปิดยอดและโอนเข้า “เงินรับแล้ว”</div><button class="btn" data-close>กลับเกม</button>');
}

function customerMonth(log){
  G.people.forEach(function(p){
    if(p.state!=='customer')return;
    if(p.cared){p.result=clamp(p.result+Math.round(rnd(5,10)),0,100);p.trust=clamp(p.trust+4,0,100)}
    if(p.result>=70&&!p.success){p.success=true;G.successCases++;G.role=clamp(G.role+4,0,100);log.push('🌟 '+p.n+' เห็นผลชัด กลายเป็น Success Case')}
    if(!p.interest&&p.result>=62&&p.trust>=68){p.asp=clamp(p.asp+Math.round(5+G.role/25+(G.monthlyEvent?6:0)),0,100);if(p.asp>=62&&Math.random()<.28+p.asp/300){p.interest=true;log.push('💬 '+p.n+' ถามเองว่า ถ้าอยากเป็น XVISOR ต้องเริ่มยังไง?')}}
    if(!p.boughtThisMonth&&p.result>=45&&p.trust>=58){var ch=.12+p.trust/350+p.result/500+(G.xosUsed?.10:0);if(Math.random()<ch){var before=income().c1;p.boughtThisMonth=1;p.totalSets++;G.personalXV+=XV_SET;G.personalSets++;var after=income().c1;G.systemActions++;log.push('🔁 '+p.n+' ซื้อซ้ำจากการดูแล +'+fmt(XV_SET)+' XV · รายได้ช่อง 1 +'+money(after-before))}}
    p.cared=false;
  });
}

function teamMonth(log){
  var actions=0,systems=0;
  G.team.forEach(function(m){
    var move=1+Math.floor(m.system/35)+Math.floor(G.weekly/2)+(G.monthlyEvent?1:0);actions+=move;
    var newCus=0;if(Math.random()<clamp((m.system+G.demand)/150,0,.9))newCus++;if(m.system>=70&&Math.random()<.35)newCus++;m.activeCustomers+=newCus;
    var sets=Math.max(0,Math.round(m.activeCustomers*(.32+m.system/250)+rnd(-.3,.7)));m.monthXV=sets*XV_SET;
    if(newCus)log.push('👥 '+m.n+' หาลูกค้าเอง +'+newCus+' คน');
    var growChance=(m.system+G.demand)/360+(G.weekly?0.05:0)+(G.monthlyEvent?0.06:0)+(m.rank==='xlead'?0.10:0);
    if(m.system>=52&&Math.random()<growChance){var add=m.rank==='xlead'&&Math.random()<.3?2:1;m.downline+=add;systems+=add;log.push('🌱 '+m.n+' สร้าง XVISOR รุ่นถัดไป +'+add)}
    if(G.weekly)m.system=clamp(m.system+G.weekly*2,0,100);
    if(m.rank==='xvisor'&&m.leadPotential>=72&&m.system>=62&&m.activeCustomers>=4&&m.downline>=2){m.rank='xlead';log.push('⚔️ '+m.n+' โตเป็น XLEAD จากการสร้างลูกค้าและพัฒนาคน')}
    m.deepXV=Math.round(m.downline*(26000+m.system*520+(m.rank==='xlead'?9000:0)));
    if(m.rank==='xlead')systems+=1+Math.floor(m.system/45);
  });
  G.teamActions=actions;G.systemActions+=systems;
}

function endMonth(){
  if(G.phase!=='main')return;
  var log=[];customerMonth(log);teamMonth(log);
  var inc=income(),tv=tgv();G.cash+=inc.total;G.lastPayout=inc.total;G.lastPersonalXV=G.personalXV;G.lastTGV=tv;G.bestTGV=Math.max(G.bestTGV,tv);
  if(tv>=GOAL&&!G.goalHit){G.goalHit=true;log.push('🏆 3M ORGANIZATION — TGV เดือนนี้เกิน 3,000,000 XV')}
  G.lastSummary={manual:G.manualActions,teamActions:G.teamActions,systemActions:G.systemActions,payout:inc.total,tgv:tv};
  var h='<h2>ปิดเดือน '+G.month+'</h2><div class="rcp"><div class="r"><span>ยอดขายของคุณ</span><b>'+money(G.personalSets*PRICE_SET)+'</b></div><div class="r"><span>XV ส่วนตัว</span><b>'+fmt(G.personalXV)+'</b></div><div class="r"><span>ช่อง 1 · ขายและดูแล</span><b>'+money(inc.c1)+'</b></div><div class="r"><span>ช่อง 2 · พัฒนา G1</span><b>'+money(inc.c2)+'</b></div><div class="r"><span>ช่อง 3 · Organization</span><b>'+money(inc.c3)+'</b></div><div class="r"><span>TGV เดือนนี้</span><b>'+fmt(tv)+'</b></div><div class="tot"><span>โอนเข้าเงินรับแล้ว</span><b>'+money(inc.total)+'</b></div></div>';
  if(log.length)h+='<div class="note">'+log.join('<br>')+'</div>';
  h+='<div class="note good"><b>เงินรับแล้วสะสม '+money(G.cash)+'</b><br>คุณทำเอง '+G.manualActions+' ครั้ง · ทีมทำเอง '+G.teamActions+' ครั้ง · ระบบต่อยอด '+G.systemActions+' ครั้ง</div><button class="btn" data-next>'+(G.month>=MONTHS?'ดูผล 24 เดือน':'ไปเดือนถัดไป')+'</button>';
  modal(h);$('sheet').querySelector('[data-next]').onclick=function(){closeModal();if(G.month>=MONTHS){finalReport();return}G.month++;G.ap=G.apMax;resetMonthFlags();sel=null;draw()};save();
}
function finalReport(){
  modal('<h2>24 MONTHS</h2><div class="note good"><b>'+(G.bestTGV>=GOAL?'🏆 สร้าง 3M Organization สำเร็จ':'🌱 องค์กรยังไม่ถึง 3M')+'</b><br>Best TGV '+fmt(G.bestTGV)+'<br>เงินรับแล้วสะสม '+money(G.cash)+'<br>XVISOR G1 '+G.team.length+' · XLEAD '+xleadCount()+'</div><div class="note">เกมนี้ไม่ได้ชนะด้วยยอดอย่างเดียว: เริ่มจากขายให้เป็น → ดูแลให้คนอยู่ต่อ → ทำให้คนเติบโต → สร้างระบบที่เดินได้โดยไม่ต้องผ่านคุณทุกครั้ง</div><button class="btn" data-restart>เล่นใหม่</button>');$('sheet').querySelector('[data-restart]').onclick=function(){localStorage.removeItem(SAVE);newGame();closeModal();view='people';sel=null;draw()};
}

$('tabPeople').onclick=function(){view='people';sel=null;draw()};$('tabTeam').onclick=function(){view='team';sel=null;draw()};$('tabOrg').onclick=function(){view='org';sel=null;draw()};$('btnEnd').onclick=endMonth;$('veil').onclick=function(e){if(e.target===$('veil'))closeModal()};

if(!load())newGame();draw();
})();
