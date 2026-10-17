/* AI ใส่ซอส · Quest layer — one clear start, a saved place, missions you clear one by one,
   and an actual finished artifact. Reading/boss progress remains in quest.js.
   This layer records learner-confirmed work only: scrolling never clears a mission. */
(function(){
'use strict';
const KEY='mc_course_journey_v1';
const LESSONS=[
 {id:'free-ai',name:'SOURCE',icon:'🫙',loot:'ซอส .md ขวดแรก',title:'ทำซอสขวดแรก',outcome:'ได้ไฟล์ .md ที่พกไปใช้ต่อได้ทั้งคอร์ส',need:'เรื่องที่จะเล่า ไฟล์ที่มี หรือแชตเก่า',start:'เริ่มทำซอสของฉัน',work:'#lesson1Work',example:'#lesson1Example',check:'#lesson1Check',finish:'#lesson1Complete',native:'#finishLesson',legacy:'mc-sauce-lesson-1-complete',artifact:'ฉันมีซอส .md ที่เปิดอ่านได้แล้ว',review:'ตรวจข้อเท็จจริงและสิ่งที่ห้ามเปลี่ยนแล้ว'},
 {id:'image-ai',name:'TASTE',icon:'🥄',loot:'ช้อนชิมภาพ',title:'สร้างภาพ แล้วชิมให้ตรงเรื่อง',outcome:'ได้ภาพ 1 ภาพ พร้อมรู้ว่าจะเก็บหรือแก้อะไร',need:'ซอสจากบท 1 · รูปจริงเป็นทางเลือก',start:'เริ่มสร้างภาพของฉัน',work:'#lesson2Work',example:'#lesson2Examples',check:'#lesson2Taste',finish:'#lesson2Complete',native:'#finishLesson',legacy:'mc-image-ai-complete',artifact:'ฉันเก็บภาพที่สร้างจากซอสไว้แล้ว',review:'เทียบภาพกับซอส และแก้หรือยืนยันว่าตรงแล้ว'},
 {id:'clip-ai',name:'COOK',icon:'🍳',loot:'กระทะคลิปสั้น',title:'ทำภาพให้กลายเป็นคลิป',outcome:'ได้คลิปสั้นที่เล่นได้จริงจากเรื่องของคุณ',need:'ซอส .md + ภาพจากบท 2 + เครื่องมือสร้างวิดีโอ',start:'เริ่มทำคลิปของฉัน',work:'#lesson3VideoFast',example:'#lesson3VideoExample',check:'#lesson3VideoCheck',finish:'#lesson3Complete',native:'#finishLesson',legacy:'mc-clip-ai-complete',artifact:'ฉันมีคลิปที่เปิดเล่นได้จริงแล้ว',review:'ตรวจเรื่องราว ภาพ และรูปแบบกับซอสแล้ว'},
 {id:'notebooklm',name:'SPLIT',icon:'🍱',loot:'ปิ่นโตหลายเมนู',title:'เรื่องเดียว เล่าได้หลายแบบ',outcome:'เริ่มจากผลงานแรก แล้วแตกเป็นอีก 2 รูปแบบ',need:'ใช้ซอสเรื่องเดิม · มีตัวอย่างให้ลอง',start:'เลือกผลงานแรกของฉัน',work:'#source',example:'#lesson4Examples',check:'#lesson4Practice',finish:'#lesson4Complete',native:'#finish',legacy:'mc-notebooklm-complete',artifact:'ฉันได้ผลงาน 3 รูปแบบจากซอสเดียวกัน',review:'เทียบชื่อ ตัวเลข และข้อเท็จจริงให้ตรงกันแล้ว'},
 {id:'prompts',name:'SEASON',icon:'🧂',loot:'ผงปรุงคำสั่งลัด',title:'หยิบคำสั่งลัด ปรุงงานทันที',outcome:'ได้งานจริง 1 ชิ้นจากการหยิบ-วางคำสั่ง และชุดคำสั่งลัดที่ใช้ซ้ำได้',need:'ซอสของคุณ + รูปหรือเรื่องที่อยากปรับ',start:'เปิดชั้นคำสั่งลัด',work:'#deck',example:'#deckExample',check:'#promptCheck',finish:'.quest',native:null,legacy:null,artifact:'ฉันใช้คำสั่งลัดกับงานจริงจนได้ผลงานแล้ว',review:'ชิมผลงานเทียบกับซอส แล้วสั่งปรับจนพอใจ'},
 {id:'first-web',name:'SERVE',icon:'🍽️',loot:'จานเสิร์ฟ HTML',title:'เสิร์ฟเว็บแรกของคุณ',outcome:'ได้ไฟล์ HTML ที่เปิดดูและลองใช้งานได้จริง',need:'ซอสเรื่องเดิม · เริ่มจากเว็บฉบับเล็กได้',start:'เริ่มสร้างเว็บของฉัน',work:'#resumeStarter',example:'#resumeStarter',check:'#resumeDeviceGuide',finish:'#courseEnd',native:'#finishBtn',legacy:null,artifact:'ฉันเปิดและลองใช้ไฟล์ HTML ของตัวเองแล้ว',review:'ตรวจข้อมูลและปุ่มที่สำคัญก่อนส่งต่อแล้ว'}
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
  {target:'#deck',label:'หยิบคำสั่ง'},
  {target:'#forge',label:'ปรุงแล้วส่ง AI'},
  {target:'#promptCheck',label:'ชิมแล้วสั่งปรับ'}],
 'first-web':[
  {target:'#resumeStarter',label:'แนบซอสแล้วสั่ง',after:'#resumeStarter .prompt-card'},
  {target:'#resumeDeviceGuide',label:'บันทึกและเปิด'},
  {target:'#cl-completion',label:'ตรวจหน้าเว็บ'}]
};
// XP is derived from saved work, never stored, so it cannot drift from what the learner confirmed.
const STEP_XP=100,FINISH_XP=200;
const RANKS=[[0,'🥄','ลูกมือหัดปรุง'],[300,'🔪','ผู้ช่วยครัว'],[900,'🍳','เชฟประจำสถานี'],[1800,'👨‍🍳','หัวหน้าเชฟ'],[3000,'🏆','เชฟซอสระดับตำนาน']];
const slug=location.pathname.split('/').pop()?.replace(/\.html$/,'');
const index=LESSONS.findIndex(item=>item.id===slug);
if(index<0)return;
const lesson=LESSONS[index];
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function cleared(entry,step){return entry?.done===true||(Array.isArray(entry?.cleared)&&entry.cleared[step]===true);}
function lessonXP(entry){let xp=0;for(let i=0;i<3;i++)if(cleared(entry,i))xp+=STEP_XP;return xp+(entry?.done===true?FINISH_XP:0);}
function totalXP(){return LESSONS.reduce((sum,item)=>sum+lessonXP(state.lessons[item.id]),0);}
function rank(xp){let found=RANKS[0];for(const r of RANKS)if(xp>=r[0])found=r;return found;}
function nextRank(xp){return RANKS.find(r=>r[0]>xp)||null;}
function styles(){
 if(document.getElementById('course-learning-style'))return;
 const s=document.createElement('style');s.id='course-learning-style';
 s.textContent=`
 body.course-learning{--cl-green:#176242;--cl-deep:#0d2418;--cl-ink:#163325;--cl-muted:#576b5e;--cl-paper:#faf9f5;--cl-gold:#e2c27a;--cl-gold-deep:#b98f35;--cl-line:#d9e1d4;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
 body.course-learning ::selection{background:#ecd9a6;color:#173321}
 .course-learning .cl-launch,.course-learning .cl-completion,.course-learning .cl-rail,.course-learning .cl-steps,.course-learning .cl-fold,.cl-toast{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai","Thonburi",sans-serif;line-height:1.6}
 .cl-rail{position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding:16px 0 12px;margin:0;counter-reset:node}
 .cl-rail::before{content:"";position:absolute;left:8%;right:8%;top:37px;height:2px;background:repeating-linear-gradient(90deg,#c9d3c4 0 6px,transparent 6px 11px);z-index:0}
 .cl-rail a{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:44px;padding:0 2px;color:#5d6d62;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-decoration:none;transition:color .2s}
 .cl-rail a b{position:relative;display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#fff;border:1.5px solid #d3dccf;font-size:19px;line-height:1;box-shadow:0 6px 14px -10px #1f3b2b;transition:transform .25s cubic-bezier(.2,.9,.3,1.3),background .2s,border-color .2s}
 .cl-rail a:hover b{transform:translateY(-3px) rotate(-4deg)}
 .cl-rail a[aria-current="page"]{color:#173f2c}
 .cl-rail a[aria-current="page"] b{background:linear-gradient(150deg,#1f5a3c,#0f2c1d);border-color:#e2c27a;box-shadow:0 0 0 4px #e2c27a33,0 10px 22px -10px #173f2c}
 .cl-rail a[aria-current="page"] b::after{content:"";position:absolute;inset:-7px;border-radius:18px;border:2px solid #e2c27a88;animation:clPulse 2.2s ease-out infinite}
 .cl-rail a[data-done="true"] b{background:#e6f1e2;border-color:#9cc39b}
 .cl-rail a[data-done="true"] b::before{content:"✓";position:absolute;right:-6px;top:-6px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#2c7a4b;color:#fff;font-size:11px;font-weight:900;box-shadow:0 0 0 2px #faf9f5}
 @keyframes clPulse{0%{opacity:.9;transform:scale(.92)}70%,100%{opacity:0;transform:scale(1.18)}}
 .cl-launch{position:relative;isolation:isolate;overflow:hidden;margin:0 0 12px!important;padding:24px 25px 22px!important;border:1px solid #2f5a40!important;border-radius:24px!important;background:radial-gradient(120% 90% at 100% 0,#2b6844 0,transparent 55%),radial-gradient(80% 80% at 0 100%,#1b3f2b 0,transparent 60%),#0e271a!important;color:#fff!important;box-shadow:0 24px 50px -32px #0d2418,inset 0 1px 0 #ffffff14}
 .cl-launch::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.07;pointer-events:none;background-image:linear-gradient(#e6f0d9 1px,transparent 1px),linear-gradient(90deg,#e6f0d9 1px,transparent 1px);background-size:30px 30px;mask-image:linear-gradient(115deg,transparent 10%,black)}
 .cl-launch::after{content:attr(data-icon);position:absolute;right:-6px;bottom:-26px;z-index:-1;font-size:150px;line-height:1;opacity:.11;transform:rotate(-12deg);pointer-events:none;filter:saturate(.6)}
 .cl-launch .cl-launch-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:center}
 .cl-launch .cl-topline{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin:0 0 10px}
 .cl-launch .cl-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.13em;color:#e9d08f;margin:0}
 .cl-launch .cl-eyebrow i{font-style:normal;display:inline-block;padding:3px 8px;border-radius:999px;background:#e2c27a1f;border:1px solid #e2c27a55;letter-spacing:.08em}
 .cl-launch .cl-rank{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:999px;background:#ffffff10;border:1px solid #ffffff1f;font-size:11px;font-weight:750;color:#e6efe3;white-space:nowrap}
 .cl-launch .cl-rank b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#e2c27a;font-size:11px}
 .cl-launch .cl-rank em{font-style:normal;color:#e9d08f;font-variant-numeric:tabular-nums}
 .cl-launch h1.cl-title{font:800 clamp(26px,4.3vw,40px)/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai","Thonburi",sans-serif!important;color:#fff!important;letter-spacing:-.035em;margin:0 0 10px!important;overflow-wrap:anywhere;text-wrap:balance}
 .cl-launch .cl-outcome{font-size:15px!important;color:#e1ebdf!important;line-height:1.7!important;margin:0!important;max-width:600px}
 .cl-launch .cl-kit{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 0!important;font-size:12px!important;color:#c0d0c2!important;line-height:1.55!important}
 .cl-launch .cl-kit span{display:inline-flex;gap:6px;align-items:baseline}.cl-launch .cl-kit b{color:#f1e4bf;font-weight:750}
 .cl-launch .cl-need{display:inline!important;margin:0!important;font-size:inherit!important;color:inherit!important}
 .cl-launch .cl-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}.cl-launch .cl-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;border-radius:13px;padding:12px 18px;font-family:inherit;font-size:14px;font-weight:800;line-height:1.4;text-decoration:none;cursor:pointer;transition:transform .15s,box-shadow .2s,background .2s}
 .cl-launch .cl-start{position:relative;overflow:hidden;background:linear-gradient(180deg,#f0d998,#ddbb6c);color:#173321;border:1px solid #f4e1ad;flex:1 1 230px;box-shadow:0 10px 24px -14px #e2c27a,inset 0 1px 0 #fff8}
 .cl-launch .cl-start::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;background:linear-gradient(100deg,transparent,#ffffff8c,transparent);transform:skewX(-18deg);animation:clShine 4.5s ease-in-out 1.2s infinite}
 .cl-launch .cl-start:hover{transform:translateY(-1px);box-shadow:0 14px 28px -14px #e2c27a}
 @keyframes clShine{0%,70%{left:-60%}100%{left:130%}}
 .cl-launch .cl-example{background:#ffffff0d;color:#f3f6ee;border:1px solid #8da28d88;flex:0 1 180px}.cl-launch .cl-example:hover{background:#ffffff1a}
 .cl-launch .cl-progress-line{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11px;color:#c4d7c6;margin-top:16px}.cl-launch .cl-track{height:5px;border:0;background:#ffffff1a;border-radius:5px;overflow:hidden;margin-top:7px}.cl-launch .cl-track i{display:block;height:100%;width:0;border-radius:5px;background:linear-gradient(90deg,#9fd3a6,#e2c27a);transition:width .6s cubic-bezier(.2,.8,.2,1)}
 .cl-steps{position:sticky;top:58px;z-index:21;display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:6px;align-items:center;background:#faf9f5e6;padding:8px 0 10px;margin:0 0 12px;border-bottom:1px solid #d9dfd5;backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px)}
 .cl-steps a{position:relative;display:flex;gap:8px;align-items:center;justify-content:center;min-height:44px;padding:8px 6px;font-size:12px;font-weight:800;color:#4a6251;border-radius:12px;text-decoration:none;background:#eef1e9;border:1px solid transparent;transition:background .2s,color .2s,transform .15s}
 .cl-steps a:hover{background:#e4ebdf}
 .cl-steps a b{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff;color:#3b5a45;font-size:11px;flex:none;border:1px solid #cfdacb}
 .cl-steps a[aria-current="step"]{color:#fff;background:linear-gradient(160deg,#2a7350,#1a5537);box-shadow:0 8px 18px -12px #1a5537}
 .cl-steps a[aria-current="step"] b{background:#e2c27a;border-color:#e2c27a;color:#173321}
 .cl-steps a[data-cleared="true"] b{background:#2c7a4b;border-color:#2c7a4b;color:#fff;font-size:0}.cl-steps a[data-cleared="true"] b::after{content:"✓";font-size:12px}
 .cl-steps .cl-trophy{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#eef1e9;font-size:19px;filter:grayscale(1);opacity:.55;transition:filter .3s,opacity .3s,transform .3s}
 .cl-steps .cl-trophy[data-won="true"]{filter:none;opacity:1;background:#fbf1d6;transform:rotate(-6deg)}
 .cl-steps .cl-meter{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;height:4px}
 .cl-steps .cl-meter i{border-radius:4px;background:#dfe5da;transition:background .4s}.cl-steps .cl-meter i[data-on="true"]{background:linear-gradient(90deg,#3d9364,#e2c27a)}
 .course-learning [data-cl-target]{scroll-margin-top:140px}.course-learning #cl-completion{scroll-margin-top:140px}
 .cl-mission-tag{display:flex;align-items:center;gap:10px;margin:26px 0 10px;color:#2c5a3d;font-size:11px;font-weight:850;letter-spacing:.14em}
 .cl-mission-tag b{display:inline-grid;place-items:center;min-width:28px;height:28px;padding:0 8px;border-radius:9px;background:#173f2c;color:#e9d08f;font-size:12px;letter-spacing:0}
 .cl-mission-tag span{letter-spacing:.02em;font-size:13px;color:#173f2c}
 .cl-mission-tag::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#c9d6c4,transparent)}
 .cl-mission-tag[data-cleared="true"] b{background:#2c7a4b;color:#fff}
 .course-learning .cl-completion{position:relative;overflow:hidden;color:var(--cl-ink);margin:28px 0 8px;padding:24px;border-radius:22px;border:1px solid #c9b47a;background:radial-gradient(120% 80% at 100% 0,#fbf0d1 0,transparent 55%),linear-gradient(150deg,#f3f7ee,#fff);box-shadow:0 22px 44px -34px #6d5a26}
 .cl-completion .cl-loot{float:right;display:grid;place-items:center;width:78px;height:78px;margin:0 0 10px 14px;border-radius:22px;background:#fff;border:1.5px dashed #c9b47a;font-size:38px;filter:grayscale(1);opacity:.5;transition:filter .5s,opacity .5s,transform .5s cubic-bezier(.2,.9,.3,1.4)}
 .cl-completion[data-done="true"] .cl-loot{filter:none;opacity:1;border-style:solid;border-color:#e2c27a;background:linear-gradient(160deg,#fff8e4,#f6e2a8);transform:rotate(-6deg) scale(1.04);box-shadow:0 12px 26px -14px #b98f35}
 .cl-completion .cl-finish-kicker{font-size:11px;letter-spacing:.12em;font-weight:850;color:#8a6a1d}.cl-completion h3{font-size:24px!important;line-height:1.35!important;margin:7px 0 6px!important;color:#173b27!important;letter-spacing:-.02em}.cl-completion p{font-size:13px!important;color:#536654!important;line-height:1.65!important;margin:0 0 12px!important}
 .cl-completion .cl-loot-name{display:inline-flex;gap:6px;align-items:center;margin:0 0 6px;padding:4px 10px;border-radius:999px;background:#fff;border:1px solid #e3d3a4;font-size:12px;font-weight:750;color:#6d5418}
 .cl-completion label{clear:both;display:flex;gap:12px;align-items:flex-start;margin:8px 0 0;padding:12px 14px;border-radius:14px;background:#ffffffb3;border:1px solid #dfe6da;color:#294b35;font-size:14px!important;font-weight:650;cursor:pointer;transition:border-color .2s,background .2s}
 .cl-completion label:has(input:checked){border-color:#8fc096;background:#eef7ea}
 .cl-completion input{flex:none;margin:3px 0 0;width:19px;height:19px;accent-color:#236742}
 .cl-completion .cl-save{display:block;min-height:50px;width:100%;padding:12px 16px;margin-top:14px;border:1px solid #1d5e3c;border-radius:14px;background:linear-gradient(180deg,#2a7350,#1d5e3c);color:#fff;font-family:inherit;font-size:15px;font-weight:800;line-height:1.5;cursor:pointer;box-shadow:0 12px 24px -16px #1d5e3c;transition:transform .15s}
 .cl-completion .cl-save:not(:disabled):hover{transform:translateY(-1px)}
 .cl-completion .cl-save:disabled{background:#e0e8db;border-color:#c9d7c3;color:#607259;cursor:default;box-shadow:none}
 .cl-completion .cl-finish-state{display:block;margin-top:12px;color:#31563c;font-size:13px}.cl-completion .cl-next{display:inline-flex;align-items:center;min-height:46px;margin-top:12px;padding:10px 16px;border-radius:12px;background:#183d2a;color:#fff;font-size:14px;font-weight:800;text-decoration:none}
 .course-learning .cl-native-completion{display:none!important}
 .cl-completion .cl-next[hidden]{display:none!important}
 .cl-confetti{position:absolute;left:50%;top:40%;width:9px;height:14px;border-radius:2px;pointer-events:none;animation:clBurst 1.3s cubic-bezier(.15,.7,.3,1) forwards}
 @keyframes clBurst{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}
 .cl-toast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:11px 16px 11px 12px;border-radius:16px;background:#10291c;color:#f1f5ee;font-size:13px;font-weight:700;box-shadow:0 18px 40px -16px #0008;border:1px solid #2f5a40;transform:translate(-50%,140%);opacity:0;transition:transform .45s cubic-bezier(.2,.9,.3,1.2),opacity .3s;pointer-events:none}
 .cl-toast[data-show="true"]{transform:translate(-50%,0);opacity:1}
 .cl-toast b{flex:none;padding:3px 9px;border-radius:999px;background:#e2c27a;color:#173321;font-size:12px;font-weight:900}
 .cl-launch a:focus-visible,.cl-launch button:focus-visible,.cl-steps a:focus-visible,.cl-rail a:focus-visible{outline:3px solid #bb9738;outline-offset:4px}
 .cl-visible-hero{margin-top:18px!important}
 .cl-step-next{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:50px;margin:12px 0 22px;padding:10px 12px 10px 16px;border:1px solid #bcd2bb;border-radius:14px;background:linear-gradient(90deg,#eef6ea,#f7f3e3);color:#245537;font-size:13.5px;font-weight:800;text-decoration:none;transition:transform .15s,box-shadow .2s,border-color .2s}
 .cl-step-next:hover{transform:translateY(-1px);border-color:#8fbf95;box-shadow:0 10px 22px -16px #245537}
 .cl-step-next .cl-xp{flex:none;padding:4px 9px;border-radius:999px;background:#173f2c;color:#e9d08f;font-size:11px;font-weight:900;letter-spacing:.04em}
 .cl-step-next[data-cleared="true"]{background:#f1f5ee;color:#4b6553}.cl-step-next[data-cleared="true"] .cl-xp{background:#2c7a4b;color:#fff}
 .cl-launch .cl-finish-jump{display:inline-block;padding:9px 0 0;font-size:11px;color:#e1cf9c;text-underline-offset:3px}
 .cl-fold{display:block;margin:14px 0;border:1px solid #d6dfd0;border-radius:16px;background:#f2f4ed;overflow:hidden;transition:background .2s}
 .cl-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;cursor:pointer;list-style:none;color:#31553c;font-size:14px;font-weight:750}
 .cl-fold>summary::before{content:"📖";flex:none;margin-right:-2px}
 .cl-fold>summary::-webkit-details-marker{display:none}.cl-fold>summary::after{content:'+';display:grid;place-items:center;width:26px;height:26px;margin-left:auto;border-radius:50%;background:#fff;font:500 18px/1 system-ui;flex:none;color:#4f7a52;transition:transform .25s}.cl-fold[open]>summary::after{transform:rotate(45deg)}.cl-fold[open]>summary{border-bottom:1px solid #d6dfd0}
 .cl-fold .cl-fold-body{padding:1px 17px 17px;background:#fbfbf8}.cl-fold .cl-fold-body>:first-child{margin-top:16px!important}.cl-fold .cl-fold-body>:last-child{margin-bottom:0!important}
 .cl-fold>summary:focus-visible,.cl-step-next:focus-visible,.cl-finish-jump:focus-visible{outline:3px solid #bb9738;outline-offset:-3px}
 @media(max-width:700px){.cl-rail{gap:3px;padding:12px 0 8px}.cl-rail::before{top:31px}.cl-rail a{font-size:0;gap:0}.cl-rail a b{width:36px;height:36px;border-radius:12px;font-size:16px}.cl-launch{padding:20px 18px 18px!important;border-radius:20px!important}.cl-launch::after{font-size:110px}.cl-launch .cl-launch-grid{grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}.cl-launch .cl-title{font-size:26px!important}.cl-launch .cl-eyebrow{font-size:10px;letter-spacing:.1em}.cl-launch .cl-rank{font-size:10px;padding:3px 8px 3px 4px}.cl-launch .cl-outcome{font-size:14px!important}.cl-launch .cl-kit{gap:4px 12px;font-size:11.5px!important}.cl-launch .cl-actions{margin-top:16px;gap:8px}.cl-launch .cl-actions a{font-size:13px;padding:11px 14px;min-height:46px}.cl-launch .cl-example{flex:1 1 140px}.cl-launch .cl-start{flex:1 1 180px}.cl-steps{gap:4px;grid-template-columns:repeat(3,minmax(0,1fr)) 40px}.cl-steps a{font-size:11px;gap:5px;padding:6px 4px;flex-direction:column;min-height:50px;line-height:1.25;text-align:center}.cl-steps .cl-trophy{width:40px;height:50px;font-size:17px}.cl-completion{padding:19px!important}.cl-completion h3{font-size:21px!important}.cl-completion .cl-loot{width:62px;height:62px;font-size:30px;border-radius:18px}}
 @media(prefers-reduced-motion:reduce){.cl-launch .cl-track i,.cl-rail a b,.cl-completion .cl-loot,.cl-toast{transition:none}.cl-rail a[aria-current="page"] b::after,.cl-launch .cl-start::after{animation:none;display:none}}
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
  fold([q('#promptLevels')],'อ่านเพิ่ม: Prompt 3 ระดับ และทำไมคำสั่งลัดถึงเวิร์ก','cl-prompt-theory');
  fold([q('.main-course-tease')],'อ่านก่อนต่อบท 6','cl-prompt-next');
 }else if(slug==='first-web'){
  group('#serveTldr','main > .block:has(.house)','อ่านเพิ่ม: HTML ทำอะไรได้บ้าง','cl-html-theory');
  fold([q('#smart-resume > .smart-steps')],'สูตรเต็ม: ทำซอสลูกสำหรับเว็บ WORK / LIFE','cl-resume-full');
  group('main > .block:has(.share-grid)','.chef-break','อ่านเพิ่ม: วิธีส่งต่อและต่อยอด','cl-html-share');
 }
}
let toastTimer;
function toast(badge,message){
 let el=document.getElementById('cl-toast');
 if(!el){el=document.createElement('div');el.id='cl-toast';el.className='cl-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML='<b></b><span></span>';document.body.appendChild(el);}
 setText(el.querySelector('b'),badge);setText(el.querySelector('span'),message);
 el.dataset.show='false';void el.offsetWidth;el.dataset.show='true';
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.dataset.show='false';},2600);
}
function confetti(host){
 if(reduceMotion())return;
 const colors=['#e2c27a','#2c7a4b','#9fd3a6','#f0d998','#1a5537','#ffffff'];
 for(let i=0;i<28;i++){
  const p=document.createElement('i');p.className='cl-confetti';p.setAttribute('aria-hidden','true');
  const angle=Math.random()*Math.PI*2,dist=90+Math.random()*170;
  p.style.cssText='--x:'+Math.round(Math.cos(angle)*dist)+'px;--y:'+Math.round(Math.sin(angle)*dist-60)+'px;--r:'+Math.round(Math.random()*720-360)+'deg;background:'+colors[i%colors.length]+';animation-delay:'+(Math.random()*.12).toFixed(2)+'s';
  host.appendChild(p);setTimeout(()=>p.remove(),1600);
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
 const launch=document.createElement('section');launch.className='cl-launch';launch.id='cl-launch';launch.dataset.icon=lesson.icon;launch.setAttribute('aria-labelledby','cl-title');
 launch.innerHTML='<div class="cl-launch-grid"><div><div class="cl-topline"><span class="cl-eyebrow"><i>ภารกิจ '+(index+1)+' / 6</i>'+lesson.name+'</span><span class="cl-rank" id="cl-rank"><b aria-hidden="true"></b><span></span><em></em></span></div><h1 class="cl-title" id="cl-title">'+lesson.title+'</h1><p class="cl-outcome">'+lesson.outcome+'</p><div class="cl-kit"><span>🎒 <b>ของที่ต้องพก</b> <span class="cl-need">'+lesson.need+'</span></span><span>🎁 <b>รางวัล</b> '+lesson.loot+'</span></div></div></div><div class="cl-actions"><a class="cl-start" id="cl-start" href="'+lesson.work+'">'+lesson.start+' →</a><a class="cl-example" href="'+lesson.example+'">ดูตัวอย่างก่อน</a></div><div class="cl-progress-line"><span id="cl-course-progress"></span><span id="cl-current-state"></span></div><div class="cl-track" aria-hidden="true"><i></i></div>';
 const rail=document.createElement('nav');rail.className='cl-rail';rail.setAttribute('aria-label','แผนที่ภารกิจทั้ง 6 บท');
 for(const [i,item] of LESSONS.entries()){const a=document.createElement('a');a.href='/classroom/'+item.id+'.html';a.dataset.lesson=item.id;a.innerHTML='<b aria-hidden="true">'+item.icon+'</b><span>'+(i+1)+' · '+item.name+'</span>';a.setAttribute('aria-label','บท '+(i+1)+' '+item.name);if(i===index)a.setAttribute('aria-current','page');rail.appendChild(a);}
 const steps=document.createElement('nav');steps.className='cl-steps';steps.setAttribute('aria-label','ภารกิจในบทนี้');
 const workflow=WORKFLOWS[slug];
 const targets=workflow.map((step,i)=>{
  const target=document.querySelector(step.target);
  if(target&&!target.id)target.id=step.id||'cl-work-'+i;
  return target?'#'+target.id:step.target;
 });
 workflow.forEach((step,i)=>{const a=document.createElement('a');a.href=targets[i];a.dataset.step=String(i);a.innerHTML='<b>'+String(i+1)+'</b> '+step.label;steps.appendChild(a);});
 const trophy=document.createElement('span');trophy.className='cl-trophy';trophy.setAttribute('aria-hidden','true');trophy.textContent='🏆';steps.appendChild(trophy);
 const meter=document.createElement('span');meter.className='cl-meter';meter.setAttribute('aria-hidden','true');meter.innerHTML='<i></i><i></i><i></i><i></i>';steps.appendChild(meter);
 launch.querySelector('.cl-start').href=targets[0];
 hero.before(rail,launch,steps);
 // A small heading marks each mission, unless inserting a sibling would shift a positional selector or grid.
 const tags=[];
 workflow.forEach((step,i)=>{
  const target=document.querySelector(targets[i]);
  if(!target||target.id==='cl-completion'||/nth-|\+/.test(step.target))return;
  const parentDisplay=target.parentElement?getComputedStyle(target.parentElement).display:'';
  if(/grid|flex/.test(parentDisplay))return;
  const tag=document.createElement('div');tag.className='cl-mission-tag';tag.setAttribute('aria-hidden','true');tag.dataset.step=String(i);
  tag.innerHTML='<b>'+(i+1)+'</b>MISSION <span>'+step.label+'</span>';
  target.before(tag);tags.push(tag);
 });
 function goTo(target){
  if(!target)return;
  let parent=target.closest('details');while(parent){parent.open=true;parent=parent.parentElement?.closest('details');}
  target.setAttribute('data-cl-target','');
  if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
  // The site's smooth-scroll layer (Lenis) would override native smooth scrolling.
  const lenis=window.cloverMotion?.lenis;
  if(lenis)lenis.scrollTo(target,{offset:-140,duration:1.1,immediate:reduceMotion()});
  else target.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});
 }
 // The tracker follows the mission on screen; only explicit actions change the saved resume step.
 let spy=null;
 function selectStep(step){spy=null;current().started=true;current().step=step;state.last=slug;save();paint();}
 function clearStep(step){
  const entry=current();if(!Array.isArray(entry.cleared))entry.cleared=[false,false,false];
  if(entry.cleared[step]===true||entry.done===true)return false;
  const before=rank(totalXP());entry.cleared[step]=true;save();
  const after=rank(totalXP());
  toast('+'+STEP_XP+' XP',after!==before?'เลื่อนขั้นเป็น '+after[1]+' '+after[2]+'!':'ผ่านภารกิจ '+(step+1)+' · '+workflow[step].label);
  return true;
 }
 function follow(event,selector,step){const target=document.querySelector(selector);if(!target)return;event.preventDefault();if(step!==undefined)selectStep(step);goTo(target);}
 launch.querySelector('.cl-start').addEventListener('click',event=>{const step=current().done?0:Math.min(2,Math.max(0,Number(current().step)||0));follow(event,targets[step],step);});
 launch.querySelector('.cl-example').addEventListener('click',event=>follow(event,lesson.example));
 steps.querySelectorAll('a').forEach(a=>a.addEventListener('click',event=>follow(event,targets[Number(a.dataset.step)],Number(a.dataset.step))));
 const complete=document.createElement('section');complete.className='cl-completion';complete.id='cl-completion';complete.setAttribute('aria-labelledby','cl-finish-title');
 complete.innerHTML='<span class="cl-loot" aria-hidden="true">'+lesson.icon+'</span><span class="cl-finish-kicker">ด่านเก็บรางวัล · '+lesson.name+'</span><h3 id="cl-finish-title">เก็บผลงานบทนี้ไว้กับคุณ</h3><span class="cl-loot-name">🎁 '+lesson.loot+' · +'+FINISH_XP+' XP</span><p>เช็กจากงานที่คุณทำจริง แล้วบันทึกไว้เพื่อกลับมาต่อได้</p><label><input type="checkbox" data-cl-check="artifact"><span>'+lesson.artifact+'</span></label><label><input type="checkbox" data-cl-check="review"><span>'+lesson.review+'</span></label><button type="button" class="cl-save" disabled>บันทึกว่าฉันทำบทนี้แล้ว</button><span class="cl-finish-state" role="status" aria-live="polite"></span>';
 if(quest)quest.after(complete);else{const footer=main.querySelector('footer');footer?footer.before(complete):main.appendChild(complete);}
 if(native)native.classList.add('cl-native-completion');
 for(const cb of complete.querySelectorAll('input')){cb.checked=current().done===true||current()[cb.dataset.clCheck]===true;cb.addEventListener('change',()=>{current()[cb.dataset.clCheck]=cb.checked;save();paint();});}
 complete.querySelector('.cl-save').addEventListener('click',()=>{
  if(![...complete.querySelectorAll('input')].every(cb=>cb.checked))return;
  if(native&&!native.disabled)native.click();
  const before=rank(totalXP());
  current().done=true;current().started=true;current().step=2;current().cleared=[true,true,true];current().finishedAt=Date.now();save();
  try{window.MC_QUEST?.track('learn')?.mark(slug);}catch{}
  paint();confetti(complete);
  const after=rank(totalXP());
  toast('🎁 '+lesson.loot,after!==before?'เลื่อนขั้นเป็น '+after[1]+' '+after[2]+'!':'เก็บรางวัลบทนี้แล้ว · รวม '+totalXP()+' XP');
 });
 if(index<LESSONS.length-1){const next=document.createElement('a');next.className='cl-next';next.href='/classroom/'+LESSONS[index+1].id+'.html';next.textContent='ภารกิจถัดไป · บท '+(index+2)+' '+LESSONS[index+1].icon+' '+LESSONS[index+1].name+' →';next.hidden=true;complete.appendChild(next);}
 function paint(){
  const done=LESSONS.filter(item=>state.lessons[item.id]?.done).length;
  const xp=totalXP(),r=rank(xp),up=nextRank(xp);
  setText(launch.querySelector('#cl-course-progress'),'เก็บผลงานแล้ว '+done+' / 6 บท');
  setText(launch.querySelector('#cl-current-state'),current().done?'บทนี้มีผลงานแล้ว ✓':up?'อีก '+(up[0]-xp)+' XP เป็น '+up[2]:'ครบทุกด่านแล้ว');
  setText(launch.querySelector('.cl-start'),current().done?'กลับไปต่อยอดงาน →':current().started?'กลับไปภารกิจที่ทำค้าง →':lesson.start+' →');
  setText(launch.querySelector('#cl-rank b'),r[1]);setText(launch.querySelector('#cl-rank span'),r[2]);setText(launch.querySelector('#cl-rank em'),xp+' XP');
  launch.querySelector('.cl-track i').style.width=(done/6*100)+'%';
  rail.querySelectorAll('a').forEach(a=>{a.dataset.done=String(state.lessons[a.dataset.lesson]?.done===true);});
  const here=spy??(Number(current().step)||0);
  steps.querySelectorAll('a').forEach(a=>{const i=Number(a.dataset.step);const active=i===here;if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');a.dataset.cleared=String(cleared(current(),i));});
  trophy.dataset.won=String(current().done===true);
  meter.querySelectorAll('i').forEach((bar,i)=>{bar.dataset.on=String(i<3?cleared(current(),i):current().done===true);});
  tags.forEach(tag=>{tag.dataset.cleared=String(cleared(current(),Number(tag.dataset.step)));});
  document.querySelectorAll('.cl-step-next').forEach(link=>{const i=Number(link.dataset.fromStep);link.dataset.cleared=String(cleared(current(),i));setText(link.querySelector('.cl-xp'),cleared(current(),i)?'✓ ผ่านแล้ว':'+'+STEP_XP+' XP');});
  complete.dataset.done=String(current().done===true);
  complete.querySelectorAll('input').forEach(cb=>{cb.disabled=current().done===true;});
  const ready=[...complete.querySelectorAll('input')].every(cb=>cb.checked);
  complete.querySelector('.cl-save').disabled=!ready||current().done===true;
  setText(complete.querySelector('.cl-save'),current().done?'✓ เก็บรางวัลบทนี้แล้ว':ready?'🏆 เก็บรางวัลบทนี้':'บันทึกว่าฉันทำบทนี้แล้ว');
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
  const label=document.createElement('span');label.textContent=i<2?'ผ่านภารกิจ '+(i+1)+' แล้ว · ไปต่อ: '+workflow[i+1].label+' →':'ผ่านครบ 3 ภารกิจ · ไปเก็บรางวัล 🏆';
  const xp=document.createElement('span');xp.className='cl-xp';
  link.append(label,xp);
  link.addEventListener('click',event=>{clearStep(i);follow(event,next,Math.min(i+1,2));});
  target.after(link);
 });
 const finishLink=document.createElement('a');finishLink.className='cl-finish-jump';finishLink.href='#cl-completion';finishLink.textContent='มีผลงานแล้ว → ข้ามไปเก็บรางวัลบทนี้';
 finishLink.addEventListener('click',event=>follow(event,'#cl-completion',2));
 launch.querySelector('.cl-progress-line').after(finishLink);
 condenseExplanations();
 save();paint();
 if('IntersectionObserver' in window){
  const watched=targets.map(selector=>document.querySelector(selector));
  const spyObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;const i=watched.indexOf(entry.target);if(i>=0&&i!==spy){spy=i;paint();}}
  },{rootMargin:'-40% 0px -55% 0px'});
  watched.forEach(el=>{if(el)spyObserver.observe(el);});
 }
}
function start(){
 try{
  // All preceding inline lesson modules have mounted. Reconcile their final copy
  // before folding sections and binding step targets; optional network scripts follow us.
  document.dispatchEvent(new Event('classroom:prepare'));
  boot();
  document.dispatchEvent(new Event('classroom:decorate'));
  window.MC_CLASSROOM_RENDER?.finish();
 }catch(error){
  window.MC_CLASSROOM_RENDER?.fail();
  throw error;
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
