(function(){
'use strict';

var SAVE='xvisorQuestNewbieV1';
var GOAL=3000000, XV_SET=7000, MONTHS=24;
var NAMES=['มิ้นท์','พลอย','เมย์','นนท์','โอม','โจ','แพร','วิน','แนน','ตูน','ฝ้าย','นัท','อ้อม','ซัน'];
var FACES=['👩','🧑','👨','👩‍🦰','👨‍🦱','👩‍🦱','🧔','👱'];
var STAGE=['เพิ่งรู้จัก','กำลังลอง','เริ่มเห็นผล','ลูกค้าประจำ','สนใจเป็น XVISOR'];
var G, selected=null;
function $(id){return document.getElementById(id)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function rnd(a,b){return Math.floor(a+Math.random()*(b-a+1))}
function fmt(n){return Math.round(n||0).toLocaleString('en-US')}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(G))}catch(e){}}
function load(){try{var x=JSON.parse(localStorage.getItem(SAVE)||'null');if(x&&x.version===1){G=x;return true}}catch(e){}return false}
function reset(){localStorage.removeItem(SAVE);newGame();draw();showIntro()}
function newGame(){
  G={version:1,phase:'pre',pre:0,month:0,ap:0,apMax:20,rank:'candidate',customers:[],team:[],
    care:{c:30,a:25,r:25,e:25},system:18,role:10,demand:36,
    pv:0,lastPV:0,lastTGV:0,lastIncome:0,cash:0,bestTGV:0,success:0,
    weekly:0,monthly:false,xos:false,teamActivities:0,leaderActivities:0,
    manual:0,teamActions:0,systemActions:0,lastSummary:null,goalHit:false};
  save();
}
function newCustomer(){return{id:Date.now()+Math.random(),name:pick(NAMES),face:pick(FACES),stage:0,trust:rnd(35,55),result:rnd(5,18),asp:rnd(5,15),repeat:0,cared:false};}
function memberFromCustomer(c){return{id:c.id,name:c.name,face:c.face,rank:'xvisor',customers:1,pv:7000,system:48,skill:rnd(42,62),lead:20,downline:0,teamXv:0};}
function xleadCount(){return G.team.filter(function(m){return m.rank==='xlead'}).length}
function teamPV(){return G.team.reduce(function(s,m){return s+m.pv},0)}
function deepXV(){return G.team.reduce(function(s,m){return s+m.teamXv},0)}
function tgv(){return G.pv+teamPV()+deepXV()}
function rate(xv){return xv>=100000?.25:xv>=40000?.23:.20}
function mentorRate(xv){return xv>=100000?.05:xv>=40000?.046:.04}
function income(){
  var c1=G.rank==='candidate'?0:G.pv*rate(G.pv), c2=0;
  if(G.rank==='xlead'||G.rank==='xgen')G.team.forEach(function(m){c2+=m.pv*mentorRate(m.pv)});
  var tv=tgv(), c3=(tv>=GOAL?tv*.05:0);
  return{c1:c1,c2:c2,c3:c3,total:c1+c2+c3,tgv:tv};
}
function spend(n){if(G.ap<n){toast('แรงไม่พอ');return false}G.ap-=n;G.manual++;return true}
function toast(s){var d=document.createElement('div');d.className='toast';d.textContent=s;$('toasts').appendChild(d);setTimeout(function(){d.remove()},1800)}
function modal(h){$('sheet').innerHTML=h;$('veil').hidden=false}
function closeModal(){$('veil').hidden=true}

function phaseLabel(){if(G.phase==='pre')return'ก่อนเริ่ม';return 'เดือน '+G.month+' / '+MONTHS}
function rankLabel(){if(G.rank==='candidate')return'🧪 กำลังเตรียมตัว';if(G.rank==='xvisor')return'🌱 XVISOR';if(G.rank==='xlead')return'⚔️ XLEAD';return'👑 XGEN'}
function nextGoal(){
  if(G.phase==='pre')return ['เริ่มให้ถูกทาง','ซื้อและใช้สินค้าเอง → เรียน → สอบ XVISOR','เริ่มจากเป็นผู้ใช้ก่อนเป็นผู้ดูแล'];
  if(G.customers.length===0)return ['เป้าหมายแรก','หาลูกค้าคนแรก','เริ่มจากรู้จัก 1 คน ไม่ต้องคิดถึง 3 ล้าน'];
  if(G.success===0)return ['เป้าหมายถัดไป','ช่วยลูกค้า 1 คนให้เห็นผล','ผลลัพธ์ของลูกค้าคือฐานของการเติบโต'];
  if(G.team.length===0)return ['เป้าหมายถัดไป','ให้ลูกค้าคนหนึ่งอยากเป็น XVISOR เอง','ยิ่งคุณดูแลดีและเติบโต คนยิ่งอยากทำแบบคุณ'];
  if(G.rank==='xvisor')return ['เป้าหมายถัดไป','สร้างทีมให้ทำต่อเอง แล้วขึ้น XLEAD','Weekly + งานเดือน ช่วยให้คนเก่งขึ้นโดยไม่ต้องสอนทีละคน'];
  if(G.rank==='xlead'&&xleadCount()===0)return ['เป้าหมายถัดไป','พัฒนา XLEAD คนแรกในทีม','จากทำเอง → ทำให้คนอื่นพัฒนาคนต่อได้'];
  if(G.rank!=='xgen')return ['เป้าหมายถัดไป','สร้างผู้นำหลายคน แล้วขึ้น XGEN','บทบาทของคุณกำลังเปลี่ยนจากดูแลคน → ดูแลระบบ'];
  return ['เป้าหมายใหญ่','พาสังกัดไป 3,000,000 TGV','อย่าขายเองให้ถึง 3 ล้าน ให้ระบบและคนรุ่นต่อไปช่วยกันสร้าง'];
}
function roadmapStep(){
  if(G.phase==='pre')return 0;if(G.customers.length===0)return 1;if(G.success===0)return 2;if(G.team.length===0)return 3;if(G.rank==='xvisor')return 4;if(G.rank==='xlead')return 5;return 6;
}
function draw(){
  document.querySelector('.endbar').style.display=G.phase==='pre'?'none':'';
  var inc=income(), goal=nextGoal(), step=roadmapStep();
  $('phase').textContent=phaseLabel();$('rank').textContent=rankLabel();
  $('income').textContent=fmt(inc.total);$('customers').textContent=G.customers.length;$('team').textContent=G.team.length;$('tgv').textContent=fmt(inc.tgv);
  $('goalKicker').textContent=goal[0];$('goalTitle').textContent=goal[1];$('goalHint').textContent=goal[2];
  $('roadFill').style.width=(step/6*100)+'%';
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(el){el.classList.toggle('done',+el.dataset.step<=step)});
  $('apWrap').hidden=G.phase==='pre';$('ap').textContent=G.ap;
  drawPeople();drawActions();drawMomentum();save();
}
function drawPeople(){
  var b=$('people');
  if(G.phase==='pre'){
    var labels=['ซื้อสินค้าและเริ่มใช้เอง','ทำ RoutineX / Xircle กับตัวเอง','เรียน CARE · Xircle · XOS','สอบ Certified XVISOR'];
    var h='<div class="pre-list">';labels.forEach(function(x,i){h+='<div class="pre-step '+(i<G.pre?'done':'')+'"><span>'+(i<G.pre?'✓':i+1)+'</span><div><b>'+x+'</b><small>'+(i===3?'ผ่านแล้วจึงเริ่มหาลูกค้าได้':'ทำทีละขั้น ไม่ต้องรีบ')+'</small></div></div>'});h+='</div>';b.innerHTML=h;return;
  }
  if(!G.customers.length&&!G.team.length){b.innerHTML='<div class="empty"><b>ยังไม่มีลูกค้า</b><span>ดีแล้ว — เกมเริ่มจาก 0 จริง<br>เป้าหมายตอนนี้มีอย่างเดียว: รู้จักลูกค้าคนแรก</span></div>';return}
  var h='';
  if(G.customers.length){h+='<h3>ลูกค้าของคุณ</h3><div class="people-grid">';G.customers.forEach(function(c){h+='<button class="person '+(selected===c.id?'sel':'')+'" data-customer="'+c.id+'"><span class="face">'+c.face+'</span><span><b>'+c.name+'</b><small>'+STAGE[c.stage]+'</small></span>'+(c.stage===4?'<em>อยากเป็น XVISOR</em>':'')+'</button>'});h+='</div>'}
  if(G.team.length){h+='<h3>ทีมของคุณ</h3><div class="people-grid">';G.team.forEach(function(m){h+='<button class="person team '+(selected===m.id?'sel':'')+'" data-member="'+m.id+'"><span class="face">'+m.face+'</span><span><b>'+m.name+'</b><small>'+(m.rank==='xlead'?'XLEAD · ดูแลทีมเอง':'XVISOR · ลูกค้า '+m.customers+' คน')+'</small></span></button>'});h+='</div>'}
  b.innerHTML=h;
  Array.prototype.forEach.call(b.querySelectorAll('[data-customer]'),function(el){el.onclick=function(){selected=selected===+el.dataset.customer?null:+el.dataset.customer;draw()}});
  Array.prototype.forEach.call(b.querySelectorAll('[data-member]'),function(el){el.onclick=function(){selected=selected===+el.dataset.member?null:+el.dataset.member;draw()}});
}
function action(title,sub,key,cost,disabled,primary){return'<button class="action '+(primary?'primary':'')+'" data-action="'+key+'" '+(disabled?'disabled':'')+'><span><b>'+title+'</b><small>'+sub+'</small></span>'+(cost?'<em>'+cost+' แรง</em>':'')+'</button>'}
function drawActions(){
  var a=$('actions'),h='';
  if(G.phase==='pre'){
    var titles=['ซื้อสินค้าและเริ่มใช้เอง','ทำ 28 วันกับตัวเอง','เข้า Xcademy','สอบ Certified XVISOR'];
    var subs=['เริ่มจากเป็นผู้ใช้ก่อน','เห็นข้อมูลและผลของตัวเอง','เรียนพื้นฐานการดูแลและระบบ','ผ่านแล้วเริ่มเดือน 1 ด้วยลูกค้า 0 คน'];
    h=action(titles[G.pre],subs[G.pre],'pre',0,false,true);
  }else{
    var c=G.customers.filter(function(x){return x.id===selected})[0];
    var m=G.team.filter(function(x){return x.id===selected})[0];
    if(c)h+=action('ดูแล '+c.name,'ช่วยให้เขาเข้าใจ → ลงมือ → เห็นผล','care',2,G.ap<2,true);
    if(c&&c.stage===4)h+=action('พา '+c.name+' เข้า Xcademy','เขาสนใจเองแล้ว ช่วยให้เขาเริ่มเส้นทาง XVISOR','academy',3,G.ap<3,true);
    if(m&&(G.rank==='xlead'||G.rank==='xgen'))h+=action('ช่วย '+m.name+' วางแผน','เพิ่มความสามารถในการทำเองและพัฒนาคน','coach',3,G.ap<3,true);
    h+=action('รู้จักคนใหม่','สร้างความสนใจ แล้วพาคนใหม่เข้ามา 1 คน','meet',3,G.ap<3,!c&&!m);
    if(G.customers.length||G.team.length)h+=action('พาเข้างานเดือน','ลูกค้าอยากลงมือมากขึ้น · ทีมได้แรงและไอเดีย','event',4,G.ap<4||G.monthly,false);
    if(G.team.length)h+=action('ประชุมทีมประจำสัปดาห์','ช่วยหลายคนพร้อมกัน ให้ทีมทำต่อเองเก่งขึ้น','weekly',3,G.ap<3||G.weekly>=4,false);
    if(G.rank==='xvisor'&&canXLead())h+=action('สอบขึ้น XLEAD','คุณไม่ได้เก่งแค่ดูแลลูกค้าแล้ว แต่เริ่มพัฒนาทีมได้','xlead',4,G.ap<4,true);
    if(G.rank==='xlead'&&canXGen())h+=action('สอบขึ้น XGEN','เริ่มบริหารผู้นำและระบบ ไม่ต้องผ่านคุณทุกเรื่อง','xgen',5,G.ap<5,true);
    if(G.rank==='xgen')h+=action('ประชุมผู้นำ','บัฟ XLEAD ทั้งองค์กรและเร่งรุ่นถัดไป','leaders',4,G.ap<4,false);
  }
  h+='<button class="linkbtn" data-income>ดูว่ารายได้ 3 ช่องคำนวณยังไง</button>';
  a.innerHTML=h;
  Array.prototype.forEach.call(a.querySelectorAll('[data-action]'),function(el){el.onclick=function(){act(el.dataset.action)}});
  var inc=a.querySelector('[data-income]');if(inc)inc.onclick=showIncome;
}
function drawMomentum(){
  var box=$('momentum');
  if(G.phase==='pre'){box.hidden=true;return}box.hidden=false;
  var s=G.lastSummary;
  if(!s){box.innerHTML='<b>พลังทวีคูณจะเริ่มเห็นตรงนี้</b><span>ตอนแรกคุณจะทำเกือบทุกอย่างเอง พอมีทีมและระบบ ตัวเลข “ทีมทำเอง” จะโตขึ้นเรื่อย ๆ</span>';return}
  box.innerHTML='<b>เดือนก่อน: คุณทำ '+s.manual+' ครั้ง → ทีมและระบบทำต่อ '+(s.team+s.system)+' ครั้ง</b><span>TGV '+fmt(s.tgv)+' · รายได้ '+fmt(s.income)+' บาท</span>';
}
function canXLead(){return G.team.length>=2&&G.success>=1&&G.teamActivities>=2&&G.lastPV>=40000}
function canXGen(){return xleadCount()>=2&&G.team.length>=6&&G.lastTGV>=700000&&G.leaderActivities>=2}
function act(k){
  if(k==='pre'){
    G.pre++;
    if(G.pre>=4){G.phase='game';G.rank='xvisor';G.month=1;G.ap=G.apMax;G.care={c:58,a:42,r:40,e:38};G.system=30;G.role=24;G.pre=4;modal('<h2>ผ่าน Certified XVISOR</h2><p>เกมเริ่มเดือน 1 ด้วยลูกค้า <b>0 คน</b></p><div class="note">เป้าหมายแรกง่ายมาก: <b>หาลูกค้าคนแรก</b><br>ยังไม่ต้องคิดเรื่องทีม หรือ 3 ล้าน</div><button class="modalbtn" data-close>เริ่มเดือน 1</button>')}
    draw();bindClose();return;
  }
  if(k==='meet'){
    if(!spend(3))return;var c=newCustomer();G.customers.push(c);G.care.a=clamp(G.care.a+2,0,100);toast('รู้จัก '+c.name+' แล้ว');selected=c.id;
  }
  if(k==='care'){
    if(!spend(2))return;var c1=G.customers.filter(function(x){return x.id===selected})[0];if(!c1)return;c1.cared=true;c1.trust=clamp(c1.trust+10,0,100);c1.result=clamp(c1.result+8+Math.floor(G.care.r/25),0,100);if(c1.stage<3)c1.stage++;else if(c1.stage===3&&c1.result>=65){c1.stage=4;c1.asp=70}G.care.r=clamp(G.care.r+2,0,100);G.care.e=clamp(G.care.e+1,0,100);toast(c1.name+' ขยับไปอีกขั้น');
  }
  if(k==='academy'){
    if(!spend(3))return;var c2=G.customers.filter(function(x){return x.id===selected})[0];if(!c2||c2.stage!==4)return;G.customers=G.customers.filter(function(x){return x.id!==c2.id});G.team.push(memberFromCustomer(c2));selected=null;toast(c2.name+' เป็น XVISOR แล้ว');
  }
  if(k==='event'){
    if(!spend(4))return;G.monthly=true;G.demand=clamp(G.demand+6,0,100);G.role=clamp(G.role+4,0,100);G.customers.forEach(function(c){c.trust=clamp(c.trust+6,0,100);c.asp=clamp(c.asp+10,0,100);if(c.stage===3&&c.asp>=65)c.stage=4});G.team.forEach(function(m){m.system=clamp(m.system+5,0,100);m.lead=clamp(m.lead+4,0,100)});toast('ทั้งกลุ่มได้แรงจากงานเดือน');
  }
  if(k==='weekly'){
    if(!spend(3))return;G.weekly++;G.teamActivities++;G.system=clamp(G.system+4,0,100);G.team.forEach(function(m){m.system=clamp(m.system+5,0,100);m.skill=clamp(m.skill+3,0,100);m.lead=clamp(m.lead+5,0,100)});toast('ทีมเก่งขึ้นพร้อมกัน');
  }
  if(k==='coach'){
    if(!spend(3))return;var m1=G.team.filter(function(x){return x.id===selected})[0];if(!m1)return;m1.system=clamp(m1.system+8,0,100);m1.lead=clamp(m1.lead+10,0,100);toast(m1.name+' ทำเองได้มากขึ้น');
  }
  if(k==='xlead'){
    if(!spend(4))return;G.rank='xlead';G.apMax=22;G.ap+=2;modal('<h2>คุณขึ้น XLEAD</h2><div class="note">จากนี้เป้าหมายไม่ใช่แค่ “ดูแลลูกค้าเก่ง” แต่คือ <b>ทำให้ XVISOR ในทีมทำได้เอง</b></div><button class="modalbtn" data-close>ไปต่อ</button>');bindClose();
  }
  if(k==='xgen'){
    if(!spend(5))return;G.rank='xgen';G.apMax=24;G.ap+=2;modal('<h2>คุณขึ้น XGEN</h2><div class="note">จากนี้คุณกำลังสร้าง <b>ระบบที่สร้างผู้นำรุ่นต่อไป</b> เป้าหมายใหญ่คือ 3,000,000 TGV</div><button class="modalbtn" data-close>ไปต่อ</button>');bindClose();
  }
  if(k==='leaders'){
    if(!spend(4))return;G.leaderActivities++;G.team.forEach(function(m){if(m.rank==='xlead'){m.lead=clamp(m.lead+8,0,100);m.system=clamp(m.system+6,0,100)}});G.system=clamp(G.system+6,0,100);toast('ผู้นำทั้งองค์กรแข็งแรงขึ้น');
  }
  draw();
}
function bindClose(){var x=$('sheet').querySelector('[data-close]');if(x)x.onclick=function(){closeModal();draw()}}
function showIncome(){
  var i=income(),r=rate(G.pv),g1=teamPV();
  modal('<h2>รายได้ 3 ช่อง</h2><div class="incomeRows">'+
    '<div><span>ช่อง 1 · ขายและดูแลลูกค้า<small>XV ส่วนตัว '+fmt(G.pv)+' × '+Math.round(r*100)+'%</small></span><b>'+fmt(i.c1)+'</b></div>'+
    '<div><span>ช่อง 2 · พัฒนา XVISOR<small>'+(G.rank==='xvisor'?'ปลดล็อกเมื่อขึ้น XLEAD':'ยอด G1 '+fmt(g1)+' · คิด 4–5% ตามระดับของแต่ละคน')+'</small></span><b>'+fmt(i.c2)+'</b></div>'+
    '<div><span>ช่อง 3 · บริหารสังกัด<small>'+(i.tgv>=GOAL?'TGV ถึง 3 ล้านแล้ว × 5%':'เปิดเมื่อ TGV ถึง 3,000,000')+'</small></span><b>'+fmt(i.c3)+'</b></div>'+
    '<div class="total"><span>รวมประมาณการเดือนนี้</span><b>'+fmt(i.total)+' บาท</b></div></div><div class="note">ตัวเลขนี้เป็น simulation เพื่ออ่านแผน ไม่ใช่การรับประกันรายได้</div><button class="modalbtn" data-close>ปิด</button>');bindClose();
}
function customerEngine(log){
  G.customers.forEach(function(c){
    if(c.cared&&c.stage<4&&Math.random()<.45)c.stage++;
    if(c.stage>=2){c.result=clamp(c.result+rnd(3,7)+(G.xos?2:0),0,100);if(Math.random()<.35+c.result/250){G.pv+=XV_SET;G.systemActions++}}
    if(c.stage>=3){c.repeat++;if(c.result>=70&&!c._success){c._success=true;G.success++;G.role=clamp(G.role+5,0,100);log.push('⭐ '+c.name+' เห็นผลชัด กลายเป็นเรื่องเล่าที่ดีของคุณ')}}
    c.asp=clamp(c.asp+Math.floor(G.role/25)+(G.monthly?7:0),0,100);
    if(c.stage===3&&c.asp>=65&&Math.random()<.35){c.stage=4;log.push('💬 '+c.name+' ถามเองว่า ถ้าอยากเป็น XVISOR ต้องเริ่มยังไง')}
    c.cared=false;
  });
}
function teamEngine(log){
  var teamActions=0;
  G.team.forEach(function(m){
    var auto=1+Math.floor(m.system/35)+(G.weekly>=2?1:0)+(G.monthly?1:0)+(m.rank==='xlead'?2:0);
    teamActions+=auto;
    var gained=Math.max(0,Math.floor(auto*(.35+m.skill/160)));
    m.customers=clamp(m.customers+gained,1,30);
    m.pv=Math.round(m.customers*XV_SET*(.55+m.skill/200));
    if(m.system>=58&&Math.random()<.16+m.system/300){m.downline+=1;log.push('🌱 '+m.name+' สร้าง XVISOR รุ่นถัดไปได้เอง 1 คน')}
    if(m.rank==='xvisor'&&m.lead>=70&&m.system>=65&&m.customers>=7&&m.downline>=1){m.rank='xlead';log.push('⚔️ '+m.name+' โตเป็น XLEAD — ตอนนี้ทีมเริ่มสร้างผู้นำเอง')}
    if(m.rank==='xlead'&&Math.random()<.18+m.lead/350)m.downline++;
    m.teamXv=Math.round(m.downline*(42000+m.system*260+m.lead*180));
  });
  return teamActions;
}
function endMonth(){
  if(G.phase==='pre')return;
  var log=[];G.teamActions=teamEngine(log);customerEngine(log);
  var i=income();G.lastPV=G.pv;G.lastTGV=i.tgv;G.lastIncome=i.total;G.cash+=i.total;G.bestTGV=Math.max(G.bestTGV,i.tgv);
  if(i.tgv>=GOAL&&!G.goalHit){G.goalHit=true;log.push('🏆 3M ORGANIZATION — ระบบของคุณสร้าง TGV เกิน 3 ล้านแล้ว')}
  G.lastSummary={manual:G.manual,team:G.teamActions,system:G.systemActions,tgv:i.tgv,income:i.total};
  var total=G.manual+G.teamActions+G.systemActions;
  var h='<h2>สรุปเดือน '+G.month+'</h2><div class="bigResult"><b>'+total+' การเคลื่อนไหว</b><span>คุณทำเอง '+G.manual+' · ทีมทำเอง '+G.teamActions+' · ระบบช่วย '+G.systemActions+'</span></div>'+
    '<div class="incomeRows"><div><span>รายได้เดือนนี้</span><b>'+fmt(i.total)+' บาท</b></div><div><span>TGV สังกัด</span><b>'+fmt(i.tgv)+'</b></div></div>';
  if(log.length)h+='<div class="note">'+log.join('<br>')+'</div>';
  h+='<button class="modalbtn" data-next>'+(G.month>=MONTHS?'ดูผล 24 เดือน':'ไปเดือนถัดไป')+'</button>';modal(h);
  $('sheet').querySelector('[data-next]').onclick=function(){closeModal();if(G.month>=MONTHS){finalReport();return}G.month++;G.ap=G.apMax;G.pv=0;G.weekly=0;G.monthly=false;G.xos=false;G.manual=0;G.teamActions=0;G.systemActions=0;selected=null;draw()};
  save();
}
function finalReport(){modal('<h2>ครบ 24 เดือน</h2><div class="bigResult"><b>'+ (G.bestTGV>=GOAL?'สร้าง 3M Organization สำเร็จ':'ยังไม่ถึง 3M แต่เห็นเครื่องยนต์แล้ว') +'</b><span>Best TGV '+fmt(G.bestTGV)+' · ทีม '+G.team.length+' · XLEAD '+xleadCount()+'</span></div><div class="note">สิ่งสำคัญไม่ใช่ขายเองให้มากที่สุด แต่คือค่อย ๆ เปลี่ยนจาก <b>ทำเอง → ทำให้คนทำได้ → ทำให้ระบบสร้างคนรุ่นต่อไป</b></div><button class="modalbtn" data-reset>เล่นใหม่</button>');$('sheet').querySelector('[data-reset]').onclick=reset}
function showIntro(){modal('<h2>เริ่มจาก 0 จริง</h2><p>เกมนี้จะไม่โยนศัพท์เยอะใส่คุณตั้งแต่แรก</p><div class="note"><b>เป้าหมายแรกมีอย่างเดียว</b><br>เตรียมตัวให้ผ่าน Certified XVISOR แล้วค่อยหาลูกค้าคนแรก</div><button class="modalbtn" data-close>เริ่ม</button>');bindClose()}

$('endMonth').onclick=endMonth;$('incomeQuick').onclick=showIncome;$('veil').onclick=function(e){if(e.target===$('veil'))closeModal()};
if(!load()){newGame();draw();showIntro()}else draw();
})();