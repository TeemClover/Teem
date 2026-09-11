/* AI ใส่ซอส · One clear start, a saved place, and an actual finished artifact.
   Reading/boss progress remains in quest.js. This layer records learner-confirmed work. */
(function(){
'use strict';
const KEY='mc_course_journey_v1';
const LESSONS=[
 {id:'free-ai',name:'SOURCE',title:'ทำซอสขวดแรก',outcome:'ได้ไฟล์ .md ที่พกไปใช้ต่อได้ทั้งคอร์ส',need:'เรื่องที่จะเล่า ไฟล์ที่มี หรือแชตเก่า',start:'เริ่มทำซอสของฉัน',work:'#lesson1Work',example:'#lesson1Example',check:'#lesson1Check',finish:'#lesson1Complete',native:'#finishLesson',legacy:'mc-sauce-lesson-1-complete',artifact:'ฉันมีซอส .md ที่เปิดอ่านได้แล้ว',review:'ตรวจข้อเท็จจริงและสิ่งที่ห้ามเปลี่ยนแล้ว'},
 {id:'image-ai',name:'TASTE',title:'สร้างภาพ แล้วชิมให้ตรงเรื่อง',outcome:'ได้ภาพ 1 ภาพ พร้อมรู้ว่าจะเก็บหรือแก้อะไร',need:'ซอสจากบท 1 · รูปจริงเป็นทางเลือก',start:'เริ่มสร้างภาพของฉัน',work:'#lesson2Work',example:'#lesson2Examples',check:'#lesson2Taste',finish:'#lesson2Complete',native:'#finishLesson',legacy:'mc-image-ai-complete',artifact:'ฉันเก็บภาพที่สร้างจากซอสไว้แล้ว',review:'เทียบภาพกับซอส และแก้หรือยืนยันว่าตรงแล้ว'},
 {id:'clip-ai',name:'COOK',title:'ทำภาพให้กลายเป็นคลิป',outcome:'ได้คลิปสั้นที่เล่นได้จริงจากเรื่องของคุณ',need:'ซอส .md + ภาพจากบท 2 + เครื่องมือสร้างวิดีโอ',start:'เริ่มทำคลิปของฉัน',work:'#lesson3VideoFast',example:'#lesson3VideoExample',check:'#lesson3VideoCheck',finish:'#lesson3Complete',native:'#finishLesson',legacy:'mc-clip-ai-complete',artifact:'ฉันมีคลิปที่เปิดเล่นได้จริงแล้ว',review:'ตรวจเรื่องราว ภาพ และรูปแบบกับซอสแล้ว'},
 {id:'notebooklm',name:'SPLIT',title:'เรื่องเดียว เล่าได้หลายแบบ',outcome:'เริ่มจากผลงานแรก แล้วแตกเป็นอีก 2 รูปแบบ',need:'ใช้ซอสเรื่องเดิม · มีตัวอย่างให้ลอง',start:'เลือกผลงานแรกของฉัน',work:'#source',example:'#lesson4Examples',check:'#lesson4Practice',finish:'#lesson4Complete',native:'#finish',legacy:'mc-notebooklm-complete',artifact:'ฉันได้ผลงาน 3 รูปแบบจากซอสเดียวกัน',review:'เทียบชื่อ ตัวเลข และข้อเท็จจริงให้ตรงกันแล้ว'},
 {id:'prompts',name:'SEASON',title:'เลือกสูตร ให้งานวันนี้เสร็จ',outcome:'ได้งานที่ใช้จริง 1 ชิ้น พร้อมสูตรที่ปรับเป็นของคุณ',need:'ซอสของคุณ + งานที่อยากทำวันนี้',start:'เลือกงานที่จะทำ',work:'#promptPractice',example:'#promptExample',check:'#promptCheck',finish:'.quest',native:null,legacy:null,artifact:'ฉันใช้สูตรกับซอสจนได้งานจริงแล้ว',review:'ตรวจข้อมูล น้ำเสียง และคนที่จะใช้ผลงานแล้ว'},
 {id:'first-web',name:'SERVE',title:'เสิร์ฟเว็บแรกของคุณ',outcome:'ได้ไฟล์ HTML ที่เปิดดูและลองใช้งานได้จริง',need:'ซอสเรื่องเดิม · เริ่มจากเว็บฉบับเล็กได้',start:'เริ่มสร้างเว็บของฉัน',work:'#resumeStarter',example:'#resumeStarter',check:'#resumeDeviceGuide',finish:'#courseEnd',native:'#finishBtn',legacy:null,artifact:'ฉันเปิดและลองใช้ไฟล์ HTML ของตัวเองแล้ว',review:'ตรวจข้อมูลและปุ่มที่สำคัญก่อนส่งต่อแล้ว'}
];
const WORKFLOWS={
 'free-ai':[
  {target:'.map',id:'lesson1Ingredients',label:'เลือกวัตถุดิบ'},
  {target:'#lesson1Work',label:'สร้างซอส'},
  {target:'#lesson1Check',label:'ตรวจไฟล์',after:'.recipe'}],
 'image-ai':[
  {target:'#lesson2Work',label:'สกัดซอสลูก'},
  {target:'.life-fast__step:nth-child(2)',id:'lesson2Create',label:'สร้างภาพ'},
  {target:'.life-fast__step:nth-child(3)',id:'lesson2Check',label:'ตรวจภาพ',after:'#lesson2Taste'}],
 'clip-ai':[
  {target:'#lesson3SourceStep',label:'สกัดซอสลูก'},
  {target:'.video-step:nth-child(2)',id:'lesson3Create',label:'สร้างวิดีโอ'},
  {target:'#lesson3VideoCheck',label:'ลองเล่นและตรวจ',after:'#lesson3Repair'}],
 'notebooklm':[
  {target:'#source',label:'เลือกซอส',after:'.source-options + .note'},
  {target:'#lesson4FirstOutput',label:'สร้างผลงาน'},
  {target:'#multiplyBoard',label:'เทียบข้อเท็จจริง'}],
 'prompts':[
  {target:'#promptPractice',label:'เลือกงาน'},
  {target:'#results',label:'เติมแล้วคัดลอก'},
  {target:'#promptCheck',label:'ตรวจคำตอบ'}],
 'first-web':[
  {target:'#resumeStarter',label:'แนบซอสแล้วสั่ง',after:'#resumeStarter .prompt-card'},
  {target:'#resumeDeviceGuide',label:'บันทึกและเปิด'},
  {target:'#cl-completion',label:'ตรวจหน้าเว็บ'}]
};
const slug=location.pathname.split('/').pop()?.replace(/\.html$/,'');
const index=LESSONS.findIndex(item=>item.id===slug);
if(index<0)return;
const lesson=LESSONS[index];
let state={version:1,lessons:{}};
function read(){
 try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(value?.version===1&&value.lessons&&typeof value.lessons==='object'&&!Array.isArray(value.lessons))state=value;}catch{}
 for(const item of LESSONS){
  if(!state.lessons[item.id]||typeof state.lessons[item.id]!=='object')state.lessons[item.id]={};
  try{if(item.legacy&&localStorage.getItem(item.legacy)==='1')state.lessons[item.id].done=true;}catch{}
 }
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
function current(){return state.lessons[slug];}
function styles(){
 if(document.getElementById('course-learning-style'))return;
 const s=document.createElement('style');s.id='course-learning-style';
 s.textContent=`
 body.course-learning{--cl-green:#176242;--cl-ink:#163325;--cl-muted:#576b5e;--cl-paper:#faf9f5;--cl-gold:#c1a15d}
 .course-learning .cl-launch,.course-learning .cl-completion,.course-learning .cl-rail,.course-learning .cl-steps,.course-learning .cl-fold{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai","Thonburi",sans-serif;line-height:1.6}
 .cl-rail{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:14px 0 12px;margin:0}
 .cl-rail a{display:flex;align-items:center;justify-content:center;gap:7px;min-height:40px;border-radius:10px;background:#eeeee7;color:#59675e;font-size:11px;font-weight:750;text-decoration:none}
 .cl-rail a b{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;font-size:12px;flex:none}
 .cl-rail a[aria-current="page"]{background:#173f2c;color:#fff}.cl-rail a[aria-current="page"] b{background:#d6ba73;color:#143623}
 .cl-rail a[data-done="true"] b{background:#d8e8d9;color:#18532b}
 .cl-launch{position:relative;isolation:isolate;overflow:hidden;margin:0 0 12px!important;padding:25px!important;border:1px solid #355540!important;border-radius:23px!important;background:radial-gradient(ellipse at top right,#285a3a 0,transparent 55%),#102b1d!important;color:#fff!important;box-shadow:0 18px 45px -30px #173d2b}
 .cl-launch::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.075;pointer-events:none;background-image:linear-gradient(#e6f0d9 1px,transparent 1px),linear-gradient(90deg,#e6f0d9 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(110deg,transparent,black)}
 .cl-launch .cl-launch-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:22px;align-items:center}
 .cl-launch .cl-eyebrow{display:block;font-size:11px;font-weight:800;letter-spacing:.13em;color:#e3c98b;margin:0 0 10px}
 .cl-launch h1.cl-title{font:800 clamp(26px,4.3vw,38px)/1.23 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai","Thonburi",sans-serif!important;color:#fff!important;letter-spacing:-.035em;margin:0 0 11px!important;overflow-wrap:anywhere}
 .cl-launch .cl-outcome{font-size:15px!important;color:#e1ebdf!important;line-height:1.7!important;margin:0!important;max-width:560px}
 .cl-launch .cl-need{font-size:12px!important;color:#c0d0c2!important;margin:12px 0 0!important;line-height:1.6!important}
 .cl-launch .cl-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:23px}.cl-launch .cl-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:11px;padding:12px 18px;font-family:inherit;font-size:14px;font-weight:750;line-height:1.4;text-decoration:none;cursor:pointer}
 .cl-launch .cl-start{background:#e5c981;color:#173321;border:1px solid #efd79d;flex:1 1 230px}.cl-launch .cl-example{background:#ffffff0a;color:#f3f6ee;border:1px solid #8da28d;flex:0 1 180px}
 .cl-launch .cl-progress-line{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11px;color:#c4d7c6;margin-top:17px}.cl-launch .cl-track{height:3px;border:0;background:#ffffff20;border-radius:3px;overflow:hidden;margin-top:7px}.cl-launch .cl-track i{display:block;height:100%;width:0;background:#d8bd79;transition:width .3s}
 .cl-steps{position:sticky;top:58px;z-index:21;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;background:#faf9f5f5;padding:8px 0;margin:0 0 12px;border-bottom:1px solid #d9dfd5;backdrop-filter:blur(8px)}
 .cl-steps a{display:flex;gap:7px;align-items:center;justify-content:center;min-height:43px;padding:8px 5px;font-size:12px;font-weight:750;color:#4a6251;border-radius:9px;text-decoration:none;background:#eef1e9}.cl-steps a[aria-current="step"]{color:#fff;background:#226445}.cl-steps a b{font-size:11px;opacity:.8}
 .course-learning [data-cl-target]{scroll-margin-top:130px}.course-learning #cl-completion{scroll-margin-top:130px}
 .course-learning .cl-completion{color:var(--cl-ink);margin:24px 0 6px;padding:22px;border-radius:17px;border:1px solid #b4ccb4;background:linear-gradient(140deg,#eff5e8,#fff)}
 .cl-completion .cl-finish-kicker{font-size:11px;letter-spacing:.1em;font-weight:800;color:#356c43}.cl-completion h3{font-size:23px!important;line-height:1.35!important;margin:7px 0 8px!important;color:#173b27!important}.cl-completion p{font-size:13px!important;color:#536654!important;line-height:1.65!important;margin:0 0 14px!important}
 .cl-completion label{display:flex;gap:10px;align-items:flex-start;padding:11px 0;color:#294b35;font-size:14px!important;font-weight:600;cursor:pointer}.cl-completion input{flex:none;margin:3px 0 0;width:18px;height:18px;accent-color:#236742}
 .cl-completion .cl-save{display:block;min-height:47px;width:100%;padding:12px 16px;margin-top:14px;border:1px solid #236742;border-radius:11px;background:#236742;color:#fff;font-family:inherit;font-size:14px;font-weight:750;line-height:1.5;cursor:pointer}.cl-completion .cl-save:disabled{background:#e0e8db;border-color:#c9d7c3;color:#607259;cursor:default}
 .cl-completion .cl-finish-state{display:block;margin-top:12px;color:#31563c;font-size:13px}.cl-completion .cl-next{display:inline-flex;align-items:center;min-height:44px;margin-top:12px;padding:10px 15px;border-radius:10px;background:#183d2a;color:#fff;font-size:13px;font-weight:750;text-decoration:none}
 .course-learning .cl-native-completion{display:none!important}
 .cl-completion .cl-next[hidden]{display:none!important}
 .cl-launch a:focus-visible,.cl-launch button:focus-visible,.cl-steps a:focus-visible,.cl-rail a:focus-visible{outline:3px solid #bb9738;outline-offset:4px}
 @media(max-width:700px){.cl-rail{gap:5px}.cl-rail a{min-height:38px}.cl-rail a span{display:none}.cl-launch{padding:22px 19px!important;border-radius:18px!important}.cl-launch .cl-launch-grid{grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}.cl-launch .cl-title{font-size:27px!important}.cl-launch .cl-eyebrow{font-size:10px;letter-spacing:.1em}.cl-launch .cl-outcome{font-size:14px!important}.cl-launch .cl-need{grid-column:1/-1}.cl-launch .cl-actions{margin-top:20px;gap:8px}.cl-launch .cl-actions a{font-size:13px;padding:11px 14px}.cl-launch .cl-example{flex:1 1 140px}.cl-launch .cl-start{flex:1 1 180px}.cl-steps a{font-size:11px;gap:4px}.cl-completion{padding:18px!important}.cl-completion h3{font-size:21px!important}}

 .cl-visible-hero{margin-top:18px!important}
 .cl-step-next{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:44px;margin:8px 0 20px;padding:10px 15px;border:1px solid #bfd0bf;border-radius:11px;background:#edf3e8;color:#245537;font-size:13px;font-weight:750;text-decoration:none}
 .cl-launch .cl-finish-jump{display:inline-block;padding:9px 0 0;font-size:11px;color:#e1cf9c;text-underline-offset:3px}
 .cl-fold{display:block;margin:14px 0;border:1px solid #d6dfd0;border-radius:14px;background:#f2f4ed;overflow:hidden}
 .cl-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;cursor:pointer;list-style:none;color:#31553c;font-size:14px;font-weight:750}
 .cl-fold>summary::-webkit-details-marker{display:none}.cl-fold>summary::after{content:'+';font:400 24px/1 system-ui;flex:none;color:#63815c}.cl-fold[open]>summary::after{content:'−'}.cl-fold[open]>summary{border-bottom:1px solid #d6dfd0}
 .cl-fold .cl-fold-body{padding:1px 17px 17px}.cl-fold .cl-fold-body>:first-child{margin-top:16px!important}.cl-fold .cl-fold-body>:last-child{margin-bottom:0!important}
 .cl-fold>summary:focus-visible,.cl-step-next:focus-visible,.cl-finish-jump:focus-visible{outline:3px solid #bb9738;outline-offset:-3px}
 @media(prefers-reduced-motion:reduce){.cl-launch .cl-track i{transition:none}}
 `;document.head.appendChild(s);
}
function condenseExplanations(){
 const main=document.querySelector('main')||document.querySelector('body > .wrap');
 if(!main)return;
 function fold(nodes,title,id){
  nodes=nodes.filter(Boolean);
  if(!nodes.length||document.getElementById(id)||nodes.some(el=>el.closest('.cl-fold')))return;
  // Header images and SVG diagrams always stay on the page, even within a theory section.
  if(nodes.some(el=>el.matches('svg,.classroom-lesson-header-image')||el.querySelector('svg,.classroom-lesson-header-image')))return;
  if(nodes.some(el=>el.parentElement!==nodes[0].parentElement))return;
  const detail=document.createElement('details');detail.className='cl-fold';detail.id=id;
  const summary=document.createElement('summary');summary.textContent=title;detail.appendChild(summary);
  const body=document.createElement('div');body.className='cl-fold-body';detail.appendChild(body);
  nodes[0].before(detail);nodes.forEach(el=>body.appendChild(el));
 }
 function group(start,end,title,id){
  const first=typeof start==='string'?main.querySelector(start):start;
  const last=typeof end==='string'?main.querySelector(end):end;
  if(!first||!last||first.parentElement!==last.parentElement)return;
  const nodes=[];for(let node=first;node;node=node.nextElementSibling){nodes.push(node);if(node===last){fold(nodes,title,id);return;}}
 }
 const q=selector=>main.querySelector(selector);
 if(slug==='free-ai'){
  fold([q('.tldr')],'อ่านสรุปแนวคิดก่อนเริ่ม','cl-theory-summary');
  group('.quote','.mapnote','อ่านเพิ่ม: Source คืออะไร','cl-source-theory');
  const fast=q('.fastgrid');fold([fast?.previousElementSibling,fast],'อ่านเพิ่ม: ทำไมซอสกลางถึงช่วยได้','cl-source-benefit');
 }else if(slug==='image-ai'){
  fold([q('.tldr')],'อ่านสรุปแนวคิดก่อนเริ่ม','cl-theory-summary');
  fold([q('#lesson2FastTrack > .life-why')],'อ่านเพิ่ม: ทำไมต้องทดสอบด้วยภาพ','cl-image-theory');
 }else if(slug==='clip-ai'){
  fold([q('.tldr')],'อ่านสรุปแนวคิดก่อนเริ่ม','cl-theory-summary');
  fold([q('.video-fast__why')],'อ่านเพิ่ม: ทำไมใช้ซอสเดิมทำคลิปได้','cl-video-theory');
  fold([q('.video-short')],'อ่านเพิ่ม: ทำไมคำสั่งสร้างคลิปสั้นได้','cl-video-prompt-theory');
 }else if(slug==='notebooklm'){
  group('.tldr','.core','อ่านสรุปแนวคิดก่อนเริ่ม','cl-theory-summary');
  const magic=q('.magic');group(magic?.previousElementSibling,magic?.nextElementSibling,'อ่านเพิ่ม: เครื่องมือแตกผลงาน','cl-notebook-tools');
  const flow=q('.flow');fold([flow?.previousElementSibling,flow],'อ่านเพิ่ม: วงจรการทำงาน','cl-notebook-flow');
 }else if(slug==='prompts'){
  const levels=q('.lvls');group(levels?.previousElementSibling,levels?.nextElementSibling?.nextElementSibling,'อ่านเพิ่ม: ระดับของ Prompt และวิธีใช้','cl-prompt-theory');
  fold([q('.main-course-tease')],'อ่านก่อนต่อบท 6','cl-prompt-next');
 }else if(slug==='first-web'){
  group('#serveTldr','main > .block:has(.house)','อ่านเพิ่ม: HTML ทำอะไรได้บ้าง','cl-html-theory');
  fold([q('#smart-resume > .smart-steps')],'สูตรเต็ม: ทำซอสลูกสำหรับเว็บ WORK / LIFE','cl-resume-full');
  group('main > .block:has(.share-grid)','.chef-break','อ่านเพิ่ม: วิธีส่งต่อและต่อยอด','cl-html-share');
 }
}
function boot(){
 const main=document.querySelector('main')||document.querySelector('body > .wrap');
 const hero=main?.querySelector(':scope > .head,:scope > .hero');
 if(!main||!hero||document.getElementById('cl-launch'))return;
 read();styles();document.body.classList.add('course-learning');
 const native=lesson.native&&document.querySelector(lesson.native);
 const quest=document.querySelector(lesson.finish)||document.querySelector('.quest');
 // Keep the original header, full illustration and SVG on the visible page.
 hero.classList.add('cl-visible-hero');
 const launch=document.createElement('section');launch.className='cl-launch';launch.id='cl-launch';launch.setAttribute('aria-labelledby','cl-title');
 launch.innerHTML='<div class="cl-launch-grid"><div><span class="cl-eyebrow">บท '+(index+1)+' / 6 · '+lesson.name+'</span><h1 class="cl-title" id="cl-title">'+lesson.title+'</h1><p class="cl-outcome">'+lesson.outcome+'</p><p class="cl-need">'+lesson.need+'</p></div></div><div class="cl-actions"><a class="cl-start" id="cl-start" href="'+lesson.work+'">'+lesson.start+' →</a><a class="cl-example" href="'+lesson.example+'">ดูตัวอย่างก่อน</a></div><div class="cl-progress-line"><span id="cl-course-progress"></span><span id="cl-current-state"></span></div><div class="cl-track" aria-hidden="true"><i></i></div>';
 const rail=document.createElement('nav');rail.className='cl-rail';rail.setAttribute('aria-label','เส้นทางบทเรียนทั้ง 6 บท');
 for(const [i,item] of LESSONS.entries()){const a=document.createElement('a');a.href='/classroom/'+item.id+'.html';a.dataset.lesson=item.id;a.innerHTML='<b>'+(i+1)+'</b><span>'+item.name+'</span>';a.setAttribute('aria-label','บท '+(i+1)+' '+item.name);if(i===index)a.setAttribute('aria-current','page');rail.appendChild(a);}
 const steps=document.createElement('nav');steps.className='cl-steps';steps.setAttribute('aria-label','ขั้นตอนในบทนี้');
 const workflow=WORKFLOWS[slug];
 const targets=workflow.map((step,i)=>{
  const target=document.querySelector(step.target);
  if(target&&!target.id)target.id=step.id||'cl-work-'+i;
  return target?'#'+target.id:step.target;
 });
 workflow.forEach((step,i)=>{const a=document.createElement('a');a.href=targets[i];a.dataset.step=String(i);a.innerHTML='<b>'+String(i+1)+'</b> '+step.label;steps.appendChild(a);});
 launch.querySelector('.cl-start').href=targets[0];
 hero.before(rail,launch,steps);
 function goTo(target){
  if(!target)return;
  let parent=target.closest('details');while(parent){parent.open=true;parent=parent.parentElement?.closest('details');}
  target.setAttribute('data-cl-target','');
  if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }
 function selectStep(step){current().started=true;current().step=step;state.last=slug;save();paint();}
 function follow(event,selector,step){const target=document.querySelector(selector);if(!target)return;event.preventDefault();if(step!==undefined)selectStep(step);goTo(target);}
 launch.querySelector('.cl-start').addEventListener('click',event=>{const step=current().done?0:Math.min(2,Math.max(0,Number(current().step)||0));follow(event,targets[step],step);});
 launch.querySelector('.cl-example').addEventListener('click',event=>follow(event,lesson.example));
 steps.querySelectorAll('a').forEach(a=>a.addEventListener('click',event=>follow(event,targets[Number(a.dataset.step)],Number(a.dataset.step))));
 const complete=document.createElement('section');complete.className='cl-completion';complete.id='cl-completion';complete.setAttribute('aria-labelledby','cl-finish-title');
 complete.innerHTML='<span class="cl-finish-kicker">ของที่ได้กลับไป · '+lesson.name+'</span><h3 id="cl-finish-title">เก็บผลงานบทนี้ไว้กับคุณ</h3><p>เช็กจากงานที่คุณทำจริง แล้วบันทึกไว้เพื่อกลับมาต่อได้</p><label><input type="checkbox" data-cl-check="artifact"><span>'+lesson.artifact+'</span></label><label><input type="checkbox" data-cl-check="review"><span>'+lesson.review+'</span></label><button type="button" class="cl-save" disabled>บันทึกว่าฉันทำบทนี้แล้ว</button><span class="cl-finish-state" role="status" aria-live="polite"></span>';
 if(quest)quest.after(complete);else{const footer=main.querySelector('footer');footer?footer.before(complete):main.appendChild(complete);}
 if(native)native.classList.add('cl-native-completion');
 for(const cb of complete.querySelectorAll('input')){cb.checked=current().done===true||current()[cb.dataset.clCheck]===true;cb.addEventListener('change',()=>{current()[cb.dataset.clCheck]=cb.checked;save();paint();});}
 complete.querySelector('.cl-save').addEventListener('click',()=>{
  if(![...complete.querySelectorAll('input')].every(cb=>cb.checked))return;
  if(native&&!native.disabled)native.click();
  current().done=true;current().started=true;current().step=2;current().finishedAt=Date.now();save();
  try{window.MC_QUEST?.track('learn')?.mark(slug);}catch{}
  paint();
 });
 if(index<LESSONS.length-1){const next=document.createElement('a');next.className='cl-next';next.href='/classroom/'+LESSONS[index+1].id+'.html';next.textContent='ใช้ของเดิมต่อบท '+(index+2)+' · '+LESSONS[index+1].name+' →';next.hidden=true;complete.appendChild(next);}
 function paint(){
  const done=LESSONS.filter(item=>state.lessons[item.id]?.done).length;
  setText(launch.querySelector('#cl-course-progress'),'เก็บผลงานแล้ว '+done+' / 6 บท');
  setText(launch.querySelector('#cl-current-state'),current().done?'บทนี้มีผลงานแล้ว ✓':current().started?'กลับมาทำต่อได้ทุกเมื่อ':'เริ่มทีละชิ้น ใช้เรื่องเดิมต่อได้');
  setText(launch.querySelector('.cl-start'),current().done?'กลับไปต่อยอดงาน →':current().started?'กลับไปขั้นที่ทำค้าง →':lesson.start+' →');
  launch.querySelector('.cl-track i').style.width=(done/6*100)+'%';
  rail.querySelectorAll('a').forEach(a=>{a.dataset.done=String(state.lessons[a.dataset.lesson]?.done===true);});
  steps.querySelectorAll('a').forEach(a=>{const active=Number(a.dataset.step)===(Number(current().step)||0);if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
  complete.querySelectorAll('input').forEach(cb=>{cb.disabled=current().done===true;});
  const ready=[...complete.querySelectorAll('input')].every(cb=>cb.checked);
  complete.querySelector('.cl-save').disabled=!ready||current().done===true;
  setText(complete.querySelector('.cl-save'),current().done?'✓ เก็บผลงานบทนี้แล้ว':'บันทึกว่าฉันทำบทนี้แล้ว');
  setText(complete.querySelector('.cl-finish-state'),current().done?(index===5?'คุณทำของที่เปิดใช้ได้จริงสำเร็จแล้ว เก็บไฟล์นี้ไว้ให้ดี':'งานชิ้นนี้เป็นวัตถุดิบให้บทถัดไปได้เลย'):ready?'พร้อมเก็บบทนี้แล้ว':'ยืนยัน 2 ข้อจากงานที่คุณทำจริง');
  const next=complete.querySelector('.cl-next');if(next)next.hidden=current().done!==true;
 }
 window.addEventListener('storage',event=>{if(event.key!==KEY)return;read();complete.querySelectorAll('input').forEach(cb=>{cb.checked=current().done===true||current()[cb.dataset.clCheck]===true;});paint();});
 // Put the next action beside the work, without moving controls or replacing their listeners.
 workflow.forEach((step,i)=>{
  const target=document.querySelector(step.after||targets[i]);
  if(!target||target===complete)return;
  const link=document.createElement('a');link.className='cl-step-next';
  const next=i<2?targets[i+1]:'#cl-completion';
  link.href=next;link.dataset.fromStep=String(i);
  link.textContent=i<2?'ต่อขั้น '+(i+2)+' · '+workflow[i+1].label+' →':'ตรวจแล้ว เก็บผลงานบทนี้ →';
  link.addEventListener('click',event=>follow(event,next,Math.min(i+1,2)));
  target.after(link);
 });
 const finishLink=document.createElement('a');finishLink.className='cl-finish-jump';finishLink.href='#cl-completion';finishLink.textContent='มีผลงานแล้ว → ตรวจและเก็บบทนี้';
 finishLink.addEventListener('click',event=>follow(event,'#cl-completion',2));
 launch.querySelector('.cl-progress-line').after(finishLink);
 condenseExplanations();
 // Some retained lesson modules finish placing optional explanations after DOM ready.
 setTimeout(condenseExplanations,120);
 save();paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(boot),{once:true});else requestAnimationFrame(boot);
})();
