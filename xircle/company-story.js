import {entryContext,FOCUS_LABELS} from './route-contract.js';
/* A company presentation: no health inputs, account creation, telemetry or storage writes. */
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const chapters=[...document.querySelectorAll('[data-chapter]')];
const steps=[...document.querySelectorAll('[data-story-step]')];
const stage=$('stage-caption');
const sceneText={sleep:['01 / SLEEP','SLEEP / กลับมาดูจังหวะการพัก'],eat:['02 / EAT','EAT / เก็บมื้อที่อยากกลับมาดู'],move:['03 / MOVE','MOVE / เห็นการขยับในวันธรรมดา'],body:['04 / MY BODY','BODY / อ่านสิ่งที่ร่างกายตอบ']};
let activeScene='sleep',frame=0,scrollProgress=0,field;
function updateScene(id){
  if(id===activeScene)return;activeScene=id;
  document.querySelectorAll('[data-plate]').forEach(el=>el.classList.toggle('is-active',el.dataset.plate===id));
  $('stage-index').textContent=sceneText[id][0];stage.textContent=sceneText[id][1];
}
function updateScroll(){
  frame=0;
  const height=document.documentElement.scrollHeight-innerHeight;
  scrollProgress=height>0?Math.min(1,Math.max(0,scrollY/height)):0;
  document.documentElement.style.setProperty('--page-progress',scrollProgress.toFixed(4));
  document.documentElement.style.setProperty('--hero-progress',Math.min(1,scrollY/Math.max(1,$('overview').offsetHeight)).toFixed(4));
  const mobile=innerWidth<=840;
  const line=mobile?Math.min(innerHeight-100,70+document.querySelector('.story-stage').offsetHeight+105):innerHeight*.5;
  let scene='sleep';for(const el of steps)if(el.getBoundingClientRect().top<=line)scene=el.dataset.storyStep;updateScene(scene);
  let chapter='overview';for(const el of chapters)if(el.getBoundingClientRect().top<innerHeight*.55)chapter=el.dataset.chapter;
  document.querySelectorAll('[data-dock]').forEach(link=>{if(link.dataset.dock===chapter)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}
const requestScroll=()=>{if(!frame)frame=requestAnimationFrame(updateScroll);};
addEventListener('scroll',requestScroll,{passive:true});addEventListener('resize',requestScroll,{passive:true});
$('overview').querySelector('img').addEventListener('load',requestScroll,{once:true});
document.querySelector('.story-dock').hidden=false;updateScroll();document.fonts.ready.then(requestScroll);

// Native tabs are an enhancement: all three explanations remain readable without JS.
const tabs=[...document.querySelectorAll('[data-device]')];
function selectDevice(name,{focus=false}={}){
  tabs.forEach(tab=>{const active=tab.dataset.device===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();});
  document.querySelectorAll('[data-device-panel]').forEach(panel=>{panel.hidden=panel.dataset.devicePanel!==name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+panel.dataset.devicePanel);panel.tabIndex=0;});
  document.querySelectorAll('[data-device-dot]').forEach(dot=>dot.classList.toggle('is-active',dot.dataset.deviceDot===name));
}
for(const tab of tabs){
  tab.addEventListener('click',()=>selectDevice(tab.dataset.device));
  tab.addEventListener('keydown',event=>{
    const current=tabs.indexOf(tab);let next;
    if(event.key==='ArrowRight')next=(current+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(current+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();selectDevice(tabs[next].dataset.device,{focus:true});}
  });
}
document.querySelector('.device-tabs').hidden=false;document.querySelector('.product-devices').classList.add('devices-ready');selectDevice('band');

// A sales conversation can use exactly the same content as a focused, keyboard-ready deck.
const articleSlide=(element,id)=>({id,title:element.querySelector('h2').innerText,label:element.querySelector('.product-eyebrow').textContent,summary:element.querySelector('.story-summary').textContent,image:element.dataset.deckImage,points:[...element.querySelectorAll('.story-points li')].map(li=>li.textContent),href:element.querySelector('.product-read')?.getAttribute('href')||'/xircle/doc/'});
const slides=[{id:'overview',title:'เห็นทั้งวัน.\nเข้าใจตัวเอง.',label:'XIRCLE / THE HABIT TRACKER',summary:'การกิน การขยับ การนอน และองค์ประกอบร่างกาย เชื่อมให้เห็นเป็นภาพเดียวกัน',image:'/xircle/assets/v5/xircle-hardware-hero.webp',points:['App เชื่อมข้อมูลให้กลับมาดูได้','Band ช่วยติดตามสิ่งที่ทำ','Scale ช่วยดูสิ่งที่ร่างกายตอบ'],href:'/xircle/hardware/'},...steps.map(el=>articleSlide(el,el.id)),{...articleSlide($('devices'),'devices'),points:['Band / สิ่งที่คุณทำ','App / ภาพข้อมูลในที่เดียว','Scale / สิ่งที่ร่างกายตอบ'],href:'/xircle/hardware/'},{...articleSlide($('routine'),'routine'),points:['A / Absorb · B / Build','C / Control คือการเลือกและลงมือ ไม่มีขาย','D / Daily Balance · ตรวจรายละเอียดผลิตภัณฑ์ก่อนเลือกใช้'],href:'/xircle/products/'}];
const dialog=$('presentation');let slide=0,returnFocus,returnURL,direct=false;
function renderSlide({focus=true}={}){
  const item=slides[slide];$('presentation-title').textContent=item.title;$('presentation-label').textContent=item.label;$('presentation-summary').textContent=item.summary;
  const list=$('presentation-points');list.replaceChildren(...item.points.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('presentation-image').src=item.image;$('presentation-image').alt='ภาพประกอบ '+item.label;
  $('presentation-reference').href=item.href;$('presentation-count').textContent=`${slide+1} / ${slides.length}`;
  $('presentation-prev').disabled=slide===0;$('presentation-next').disabled=slide===slides.length-1;
  if(dialog.open){try{history.replaceState({...history.state,xirclePresentation:true,returnURL},'','#present-'+item.id);}catch{}dialog.scrollTop=0;if(focus)$('presentation-title').focus({preventScroll:true});}
}
function openDeck(id='overview',{push=true}={}){
  if(!dialog.open){returnFocus=document.activeElement;returnURL=history.state?.returnURL||location.pathname+location.search+(location.hash.startsWith('#present-')?'#'+id:location.hash);direct=!push;}
  slide=Math.max(0,slides.findIndex(item=>item.id===id));renderSlide({focus:false});
  if(!dialog.open){if(push)try{history.pushState({xirclePresentation:true,returnURL},'','#present-'+slides[slide].id);}catch{}dialog.showModal();document.body.classList.add('is-presenting');}
  renderSlide();
}
function closeDeck({fromHistory=false}={}){
  if(!dialog.open)return;dialog.close();document.body.classList.remove('is-presenting');
  if(!fromHistory){if(!direct&&history.state?.xirclePresentation)history.back();else try{history.replaceState(null,'',returnURL);}catch{}}
  returnFocus?.focus?.({preventScroll:true});
}
for(const button of document.querySelectorAll('[data-open-presentation]')){button.hidden=false;button.addEventListener('click',()=>openDeck(button.dataset.openPresentation||'overview'));}
$('presentation-close').addEventListener('click',()=>closeDeck());
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDeck();});
dialog.addEventListener('keydown',event=>{
  let next=slide;if(event.key==='ArrowRight'||event.key==='PageDown')next=Math.min(slides.length-1,slide+1);else if(event.key==='ArrowLeft'||event.key==='PageUp')next=Math.max(0,slide-1);else if(event.key==='Home')next=0;else if(event.key==='End')next=slides.length-1;else return;
  event.preventDefault();if(next!==slide){slide=next;renderSlide();}
});
$('presentation-prev').addEventListener('click',()=>{if(slide>0){slide--;renderSlide();}});$('presentation-next').addEventListener('click',()=>{if(slide<slides.length-1){slide++;renderSlide();}});
addEventListener('popstate',()=>{if(history.state?.xirclePresentation){const id=location.hash.slice(9);if(slides.some(s=>s.id===id))openDeck(id,{push:false});}else closeDeck({fromHistory:true});});
addEventListener('hashchange',()=>{
  const id=location.hash.startsWith('#present-')?location.hash.slice(9):null;
  if(id&&slides.some(item=>item.id===id)){
    if(!dialog.open||slides[slide].id!==id)openDeck(id,{push:false});
  }else if(dialog.open)closeDeck({fromHistory:true});
  requestScroll();
});
const initialDeck=location.hash.startsWith('#present-')?location.hash.slice(9):null;
if(initialDeck&&slides.some(item=>item.id===initialDeck))openDeck(initialDeck,{push:false});

// Old sample/appointment bookmarks now explain the product, without starting a personal funnel.
const aliases={'#appointment':'#start','#experience':'#sleep','#fallback':'#sleep'};
if(aliases[location.hash]){const target=aliases[location.hash];try{history.replaceState(null,'',location.pathname+location.search+target);}catch{}requestAnimationFrame(()=>document.querySelector(target)?.scrollIntoView({behavior:'instant'}));}
const context=entryContext(location.search);
if(context.compass&&context.focus){const box=$('company-context');const note=document.createElement('span');note.textContent=`จากเข็มทิศ · เลือกอ่านเรื่อง${FOCUS_LABELS[context.focus]}`;const link=document.createElement('a');link.href='#'+({food:'eat',sleep:'sleep',move:'move'}[context.focus]);link.textContent='เปิดเรื่องนี้ ↓';box.append(note,link);box.hidden=false;}
if(/^\/xircle\/?$/i.test(location.pathname)&&location.pathname!=='/xircle/')try{history.replaceState(history.state,'','/xircle/'+location.search+location.hash);}catch{}

// WebGL is isolated from the information and controls. Unsupported or low-motion devices keep the static artwork.
let fieldLoading=false;
async function startField(){
  if(reduced.matches||navigator.connection?.saveData||field||fieldLoading)return;fieldLoading=true;
  try{const {createOrbField}=await import('./orb-field.js');if(!reduced.matches)field=createOrbField($('orbit-field'),()=>scrollProgress);}catch{/* The static product experience remains complete. */}finally{fieldLoading=false;}
}
const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,600));idle(startField);
reduced.addEventListener('change',()=>{if(reduced.matches){field?.destroy();field=null;}else startField();requestScroll();});
addEventListener('pagehide',()=>{field?.destroy();field=null;});

addEventListener('pageshow',()=>{startField();requestScroll();});
