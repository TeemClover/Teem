(function(){
'use strict';
var FORGE=['ep1-everyone-gets-to-play','ep2-the-first-item','ep3-the-item-that-came-back','ep4-what-traveled-without-us','ep5-from-answers-to-a-system','ep6-the-starter-kit','ep7-a-voice-that-went-further'];
var FORGE_NAME=['ทุกคนมีสิทธิ์ลงเล่น','ไอเท็มชิ้นแรก','ของที่กลับมาพร้อมรอยใช้','สิ่งที่เดินทางแทนเรา','จากคำตอบสู่ระบบ','สำหรับคนที่มาทีหลัง','เวลาที่ได้คืนมา'];
var LEARN=['free-ai','image-ai','clip-ai','notebooklm','prompts','first-web'];
var LEARN_NAME=['เริ่มใช้ AI ฟรี','สร้างภาพด้วย AI','สร้างวิดีโอและคลิป','สร้าง Source ให้ AI','ออกแบบ Prompt','สร้างเว็บชิ้นแรก'];
function raw(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
function list(k){return raw(k,'').split(',').filter(Boolean)}
function json(k,d){try{var v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}}
function titles(){var t=json('mc_titles',[]);return Array.isArray(t)?t:[]}
function hasTitle(t){return titles().indexOf(t)>=0}
function core7Stats(){
  var bot=json('c7:stats_bot',{}),casual=json('c7:stats_casual',{});
  return{
    played:(bot.matchesPlayed||0)+(casual.matchesPlayed||0),
    won:(bot.matchesWon||0)+(casual.matchesWon||0),
    friendPlayed:casual.matchesPlayed||0
  };
}
function firstHandCount(){
  var ids=json('c7:collection',[]);
  if(Array.isArray(ids))return ids.length;
  var count=Number(json('mc_core7_first_hand_count',0));
  return Number.isFinite(count)?count:0;
}
function completedSet(){
  if(raw('c7:first_set_completed','')==='1')return true;
  try{
    for(var i=0;i<localStorage.length;i++){
      var key=localStorage.key(i);
      if(!key||key.indexOf('c7:match_')!==0)continue;
      var snap=JSON.parse(localStorage.getItem(key)||'null');
      var series=snap&&snap.series;
      var target=Number(series&&series.target||0);
      if(target>1&&(Number(series.youWins||0)>=target||Number(series.oppWins||0)>=target)){
        localStorage.setItem('c7:first_set_completed','1');
        return true;
      }
    }
  }catch(e){}
  return false;
}
var read=list('mc_read'),learn=list('mc_learn'),c7=core7Stats();
var forgeCount=FORGE.filter(function(x){return read.indexOf(x)>=0}).length;
var learnCount=LEARN.filter(function(x){return learn.indexOf(x)>=0}).length;
var forgeDone=forgeCount===7;
var cardDone=raw('mc_opened','')==='1';
var classDone=!!raw('mc_class','');
var clubDone=raw('mc_club_seen','')==='1';
var ch7Done=raw('mc_ch7_done','')==='1'||hasTitle('AWAKENED');
var tutorialDone=json('c7:tutorial_completed',false)===true;
var firstHand=firstHandCount();
var setDone=completedSet();
var genesisDone=raw('mc_genesis_found','')==='1'||hasTitle('GENESIS');
var genesisNew=raw('mc_genesis_new','')==='1';
var started=forgeCount>0||learnCount>0||classDone||cardDone||clubDone||c7.played>0;
var groups=[];
function item(o){return o}
var forgeItems=FORGE.map(function(slug,i){var no=String(i+1).padStart(2,'0');return item({id:'forge-'+(i+1),kind:'WHY AI? · EP '+(i+1),name:FORGE_NAME[i],icon:'📖',on:read.indexOf(slug)>=0,hint:'อ่านตอนที่ '+(i+1)+' จนจบ',go:'../forge/'+slug+'/',image:i===6?'../forge/img/07-p1.jpg?v=20260802-current':'../forge/img/'+no+'-thumb.webp'})});
forgeItems.push(item({id:'forge-special',kind:'SPECIAL EPISODE',name:'Version แรก · 12 ภาพต้นฉบับ',icon:'🎁',on:read.indexOf(FORGE[6])>=0,hint:'อ่านตอนที่ 7 จบเพื่อเปิดตอนพิเศษ',go:'../forge/original/',image:'../forge/original/01.jpeg'}));
groups.push({id:'story',eyebrow:'STORY COLLECTION',title:'เรื่องเล่าจากโรงตีเหล็ก',desc:'7 ตอนคือ Progress หลัก ส่วน Version แรกเป็นตอนพิเศษและไม่ถูกนับรวม',items:forgeItems});
var lessonItems=LEARN.map(function(slug,i){return item({id:'lesson-'+(i+1),kind:'FREE LESSON '+(i+1),name:LEARN_NAME[i],icon:['✨','🖼️','🎬','📚','🧠','🌐'][i],on:learn.indexOf(slug)>=0,hint:'เรียนบทที่ '+(i+1)+' จนจบ',go:'../classroom/'+slug+'.html',image:'../img/lesson-'+(i+1)+'.jpg'})});
lessonItems.push(item({id:'awaken',kind:'BOSS CLEAR',name:'บทที่ 7 · ผู้ตื่นรู้',icon:'🌅',on:ch7Done,hint:'เรียนครบ 6 บท แล้วผ่านด่านบอส',go:'../classroom/awaken/',image:'../img/og-awaken.jpg'}));
groups.push({id:'learn',eyebrow:'CLASSROOM COLLECTION',title:'ห้องเรียน AI',desc:'บทเรียนแต่ละบทถูกเก็บแยก และด่านบอสเป็น Achievement เพิ่มจาก 6 บทหลัก',items:lessonItems});
groups.push({id:'world',eyebrow:'WORLD & PROOF',title:'ห้อง เส้นทาง และของที่สร้าง',desc:'สิ่งที่เกิดขึ้นจากการเลือก ลงมือ และเดินเข้าไปสำรวจจริง',items:[
item({id:'home',kind:'FIRST STEP',name:'เริ่มเดินในบ้าน myClover',icon:'🍀',on:started,hint:'เริ่มอ่าน เรียน เลือกสาย หรือเล่นเกมอย่างใดอย่างหนึ่ง',go:'../',image:'../img/og-home.jpg'}),
item({id:'path',kind:'COMPASS',name:'เลือกสายของตัวเอง',icon:'🧭',on:classDone,hint:'เลือกพลัง 1 จาก 4 สาย และเปลี่ยนได้ตลอด',go:'../paths/',image:'../img/og-paths.jpg'}),
item({id:'club',kind:'ROOM VISITED',name:'myClover Club',icon:'🍜',on:clubDone,hint:'เข้าไปเยี่ยม Club 1 ครั้ง',go:'../club/',image:'../img/og-club.jpg'}),
item({id:'resume',kind:'ROOM UNLOCK',name:'Smart Resume',icon:'🧾',on:forgeDone,hint:'อ่าน Forge ครบ 7 ตอน',go:'../resume/',image:'../img/og-resume.jpg'}),
item({id:'walkthrough',kind:'GUIDE UNLOCK',name:'Walkthrough',icon:'🗺️',on:forgeDone||hasTitle('BLACKSMITH'),hint:'อ่าน Forge ครบ 7 ตอน',go:'../walkthrough/',image:'../img/og-walkthrough.jpg'}),
item({id:'card',kind:'PROOF SAVED',name:'การ์ดประจำตัวใบแรก',icon:'🎴',on:cardDone,hint:'สร้างและบันทึกการ์ดประจำตัว',go:'../card/',image:'../img/og-card.jpg'})]});
groups.push({id:'badges',eyebrow:'BADGES & SECRET ROUTE',title:'ตราและของที่พบระหว่างทาง',desc:'บางชิ้นบอกเงื่อนไขตรง ๆ บางชิ้นจะไม่เปิดเผยชื่อจนกว่าคุณจะพบเอง',items:[
item({id:'blacksmith',kind:'SIGIL',name:'ช่างตีเหล็ก',icon:'⚒️',on:forgeDone||hasTitle('BLACKSMITH'),hint:'อ่าน Forge ครบ 7 ตอน',go:'../forge/',image:'../forge/img/07-thumb.webp?v=20260802-sigil'}),
item({id:'awakened',kind:'SIGIL',name:'ผู้ตื่นรู้',icon:'🌅',on:ch7Done,hint:'ผ่านบทที่ 7 · ด่านบอส',go:'../classroom/awaken/',image:'../img/og-awaken.jpg'}),
item({id:'hero',kind:'SIGIL · GUILD X',name:'ฮีโร่',icon:'⚔️',on:hasTitle('HERO'),hint:'ปลดรหัส HERO จาก Guild X',go:'../guild/',image:'../img/achievement-hero-guild-x.jpg'}),
item({id:'seeker',kind:'TITLE',name:'ผู้ค้นพบ',icon:'🔍',on:raw('mc_seek_hit','')==='1'||hasTitle('SEEKER'),hint:'พบโคลเวอร์ที่ซ่อนอยู่ท้ายหน้า Hall',go:'../hall.html',image:'../img/achievement-seeker.webp'}),
item({id:'notebook-found',kind:'SECRET',name:'สมุดที่หายไป',lockedName:'???',icon:'📔',on:raw('mc_nb_seen','')==='1'||raw('mc_nb_restored','')==='1'||raw('mc_secret_end','')==='1',hint:'พบเส้นทางลับด้วยตัวเอง',go:'../classroom/awaken/notebook/',image:'../classroom/awaken/notebook/img/nb-01.jpg',secret:true}),
item({id:'notebook-restored',kind:'SECRET',name:'สมุดที่ซ่อมแล้ว',lockedName:'???',icon:'📓',on:raw('mc_nb_restored','')==='1',hint:'ใช้ RESTORE ซ่อมหน้าที่เสียหาย',go:'../classroom/awaken/notebook/',image:'../classroom/awaken/notebook/img/nb-02.jpg',secret:true}),
item({id:'secret-end',kind:'SECRET ENDING',name:'เพื่อนเล่น · Secret Ending',lockedName:'???',icon:'🏆',on:raw('mc_secret_end','')==='1',hint:'อ่านตอนพิเศษลับจนจบ',go:'../classroom/awaken/notebook/',image:'../classroom/awaken/notebook/img/nb-09.jpg',secret:true}),
item({id:'glhf',kind:'TRUE END TAG',name:'GLHF · Well Played',lockedName:'???',icon:'👊🏻',on:hasTitle('GLHF'),hint:'ทำการกระทำสุดท้ายของ Secret Route',go:'../classroom/awaken/notebook/',image:'../classroom/awaken/notebook/img/nb-10.jpg',secret:true})]});
groups.push({id:'core7',eyebrow:'CORE7 ACHIEVEMENTS',title:'เกมที่เล่นได้จริง',desc:'Achievement อ่านจาก Tutorial, Match, Set และ FIRST HAND Collection ที่ CORE7 เก็บไว้ในเครื่องเดียวกัน',items:[
item({id:'c7-tutorial',kind:'CORE7 · TUTORIAL',name:'เข้าใจกติกา',icon:'🧠',on:tutorialDone,hint:'เล่น Tutorial จนจบ',go:'../core7/tutorial/',image:'../img/core7-achievement-01-victory-wheel.jpeg'}),
item({id:'c7-match',kind:'CORE7 · FIRST MATCH',name:'ดวลครั้งแรก',icon:'⚔️',on:c7.played>0,hint:'เล่น Match แรกจนจบ',go:'../core7/',image:'../img/core7-achievement-02-first-match.jpeg'}),
item({id:'c7-win',kind:'CORE7 · BLACK FRAME',name:'ชัยชนะครั้งแรก',icon:'🏅',on:c7.won>0,hint:'ชนะ CORE7 อย่างน้อย 1 Match',go:'../core7/',image:'../img/core7-achievement-03-first-victory.jpeg'}),
item({id:'c7-friend',kind:'CORE7 · FRIEND MATCH',name:'เล่นกับเพื่อนครั้งแรก',icon:'🤝',on:c7.friendPlayed>0,hint:'เล่น Match กับเพื่อนจนจบ 1 Match',go:'../core7/play/',image:'../img/core7-achievement-04-first-friend-match.jpeg'}),
item({id:'c7-set',kind:'CORE7 · SET',name:'ครบ 1 CORE7 Set',icon:'🏆',on:setDone,hint:'เล่น CORE7 Set จนมีผู้ชนะครบชุด',go:'../core7/play/',image:'../img/core7-achievement-05-first-set.jpeg'}),
item({id:'c7-hand',kind:'CORE7 · FIRST HAND',name:'มือแรกของฉัน',icon:'🖐️',on:firstHand>=7,hint:'ปลดล็อก FIRST HAND ครบ 7 ใบ',go:'../core7/collection/',image:'../img/core7-achievement-06-first-hand.jpeg'}),
item({id:'c7-full',kind:'CORE7 · COLLECTION MASTER',name:'FIRST HAND ครบชุด',icon:'💎',on:firstHand>=28,hint:'สะสม FIRST HAND ครบ 28 ใบ',go:'../core7/collection/',image:'../img/core7-achievement-07-full-collection.jpeg'})]});
if(genesisDone)groups.push({id:'genesis',bonus:true,eyebrow:'HIDDEN ORIGIN · BONUS',title:'ของที่ไม่อยู่ในสารบัญ',desc:'ช่องพิเศษนี้ปรากฏหลังจากพบสิ่งที่ผู้สร้างซ่อนไว้ และไม่ถูกนับรวมใน 36 Achievement หลัก',items:[
item({id:'genesis-scroll',bonus:true,kind:'FORBIDDEN GENESIS · BONUS',name:'คุณเจอ Genesis Prompt ที่ใช้สร้างวิหารแห่งนี้',icon:'📜',on:true,hint:'เลือกทุกหมวดในคลังพรอมพ์ แล้วเปิดม้วนคาถาที่ซ่อนอยู่',go:'../classroom/prompts.html?scroll=forbidden',image:'../img/achievement-genesis-scroll.svg',newBonus:genesisNew})
]});
var filter='all',lastUnlocked=raw('mc_collection_last_count','');
var allItems=[];groups.forEach(function(g){g.items.forEach(function(x){if(!x.bonus)allItems.push(x)})});
var unlockedCount=allItems.filter(function(x){return x.on}).length;
try{localStorage.setItem('mc_collection_last_count',String(unlockedCount))}catch(e){}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cardHTML(x){
  var shown=x.on?x.name:(x.secret?(x.lockedName||'???'):x.name);
  var state=x.on?'✓':'🔒';
  var canLink=!!x.go&&(!x.secret||x.on);
  var tag=canLink?'a':'article';
  var attrs=canLink?' href="'+esc(x.go)+'"':'';
  var cls='ach-card '+(x.on?'unlocked':'locked')+(x.secret?' secret':'')+(canLink?' is-link':'')+(x.bonus?' bonus-card':'');
  var regularNew=x.on&&!x.bonus&&lastUnlocked!==''&&unlockedCount>Number(lastUnlocked);
  var newTag=(regularNew||x.newBonus)?'<span class="new">NEW</span>':'';
  var image=(!x.secret||x.on)&&x.image?'<img src="'+esc(x.image)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'';
  var hint=x.on?'<b>✓ ปลดแล้ว</b> — '+x.hint:'<b>ปลดเมื่อ</b> '+x.hint;
  return '<'+tag+' class="'+cls+'"'+attrs+' data-id="'+esc(x.id)+'">'+newTag+'<div class="ach-art">'+image+'<span class="state">'+state+'</span></div><div class="ach-body"><span class="kind">'+esc(x.kind)+'</span><b class="ach-name"><span class="name-icon">'+x.icon+'</span><span>'+esc(shown)+'</span></b><span class="hint">'+hint+'</span>'+(canLink?'<span class="go">ไปที่เควส →</span>':'')+'</div></'+tag+'>';
}
function render(){
  var root=document.getElementById('album');root.innerHTML='';var visibleTotal=0;
  groups.forEach(function(g){
    var visible=g.items.filter(function(x){return filter==='all'||(filter==='unlocked'?x.on:!x.on)});
    if(!visible.length)return;visibleTotal+=visible.length;
    var got=g.items.filter(function(x){return x.on}).length;
    var sec=document.createElement('section');sec.className='group'+(g.id==='core7'?' core7-group':'')+(g.bonus?' bonus':'');
    sec.innerHTML='<div class="group-head"><div><span class="eyebrow">'+g.eyebrow+'</span><h2>'+g.title+'</h2><p class="group-desc">'+g.desc+'</p></div><span class="group-count">'+got+'/'+g.items.length+'</span></div><div class="grid">'+visible.map(cardHTML).join('')+'</div>';
    root.appendChild(sec);
  });
  if(!visibleTotal)root.innerHTML='<div class="empty">ยังไม่มีช่องในตัวกรองนี้</div>';
  root.insertAdjacentHTML('beforeend','<div class="note"><b>Save ทั้งหมดอยู่ในเครื่องของคุณ</b> — หน้า Inventory แค่อ่าน Local Storage ของเว็บ ไม่ได้ส่งประวัติการเล่นหรือข้อมูลส่วนตัวออกไป หากล้างข้อมูล Browser หรือเปลี่ยนเครื่อง อัลบั้มนี้จะเริ่มใหม่ตาม Save ของเครื่องนั้น</div><div class="actions"><a class="btn gold" href="../hall.html">กลับไปทำ Main Quest →</a><a class="btn" href="../core7/">เล่น CORE7</a><a class="btn" href="../card/">ดูการ์ดของฉัน</a></div>');
  var bonus=document.querySelector('[data-id="genesis-scroll"]');
  if(bonus)bonus.addEventListener('click',function(){try{localStorage.removeItem('mc_genesis_new')}catch(e){}});
}
document.querySelectorAll('.filter').forEach(function(b){b.addEventListener('click',function(){filter=b.dataset.filter;document.querySelectorAll('.filter').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});render()})});
var pct=Math.round(unlockedCount/allItems.length*100);document.getElementById('totalFill').style.width=pct+'%';document.getElementById('totalCopy').innerHTML='เก็บได้ <b>'+unlockedCount+'</b> จาก '+allItems.length+' Achievement · '+pct+'%';render();

var au=document.getElementById('collectionSong'),musicBtn=document.getElementById('collectionMusicBtn'),musicIco=document.getElementById('collectionMusicIco'),musicLbl=document.getElementById('collectionMusicLbl');
if(au&&musicBtn){
  var sub='<small>Clover Song · เวอร์ชันมีเสียงร้อง</small>',want=false;
  function cls(c,on){var re=new RegExp('(^|\\s)'+c+'(?=\\s|$)','g');musicBtn.className=musicBtn.className.replace(re,' ').replace(/\\s+/g,' ').replace(/^ | $/g,'')+(on?' '+c:'')}
  function paint(on){cls('playing',on);musicIco.textContent=on?'⏸':'🎵';musicLbl.innerHTML=(on?'กำลังเล่น · แตะเพื่อหยุด':'เปิดเพลงประจำบ้าน')+sub;musicBtn.setAttribute('aria-pressed',on?'true':'false')}
  musicBtn.addEventListener('click',function(){want=!want;if(want){var pr=au.play();if(pr&&pr.then)pr.catch(function(){want=false;paint(false)});window.mcEvent&&window.mcEvent('music',{item:'collection-vocal-play'})}else{au.pause();window.mcEvent&&window.mcEvent('music',{item:'collection-vocal-pause'})}});
  au.addEventListener('play',function(){want=true;paint(true)});au.addEventListener('pause',function(){want=false;paint(false)});paint(false);
}

var introKey='mc_collection_intro_seen',modal=document.getElementById('collectionIntro'),open=document.getElementById('collectionIntroOpen');
if(modal&&open){
  var seen=false;try{seen=localStorage.getItem(introKey)==='1'}catch(e){}
  if(!seen){
    try{localStorage.setItem(introKey,'1')}catch(e){}
    modal.hidden=false;document.body.style.overflow='hidden';setTimeout(function(){open.focus()},0);
    function close(){modal.hidden=true;document.body.style.overflow=''}
    open.addEventListener('click',close);modal.addEventListener('click',function(e){if(e.target===modal)close()});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!modal.hidden)close()});
  }
}
})();
