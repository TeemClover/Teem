const root = document.documentElement;
if(location.hash)history.scrollRestoration='manual';
const chapters = [...document.querySelectorAll('.chapter')];
const journey = document.querySelector('#journey');
const invitation = document.querySelector('#invitation');
const motionButton = document.querySelector('#motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
if(!motionPreference.matches)root.classList.add('pending-3d');
const progressBar = document.querySelector('#journey-progress');
let engine, enhanced = false, frame, active = 0, bounds = [], lastY = -1, resizeTimer;
let initialAnchorHandled=false;
let stillMemories;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = (a, b, n) => { const t = clamp((n-a)/(b-a)); return t*t*(3-2*t); };

function restoreInitialAnchor(){
  if(initialAnchorHandled)return;
  initialAnchorHandled=true;
  const id=decodeURIComponent(location.hash.slice(1));
  const target=document.getElementById(id);
  if(target&&(target.classList.contains('chapter')||id==='invitation')){
    scrollTo({top:Math.max(0,target.offsetTop-(id==='invitation'?document.querySelector('.header').offsetHeight:0)),behavior:'instant'});
  }
}
addEventListener('load',()=>{if(location.hash){initialAnchorHandled=false;restoreInitialAnchor();}},{once:true});

function measure() {
  bounds = chapters.map(el => ({top:el.offsetTop, height:el.offsetHeight}));
  if(innerWidth>=1100)document.querySelector('.programme').open=true;
  engine?.resize();
  lastY = -1;
}
function update(time) {
  const y = scrollY;
  const atInvitation = y + innerHeight * .5 >= invitation.offsetTop;
  root.classList.toggle('on-invitation', atInvitation);
  if (enhanced) {
    let i = bounds.findLastIndex(b => y >= b.top - 1);
    i = Math.max(0, i);
    const local = clamp((y-bounds[i].top)/bounds[i].height);
    const tail = smooth(.73, 1, local);
    const position = i + (i < chapters.length-1 ? tail : 0);
    if (y !== lastY) {
      active = Math.min(7,i+(tail>.55?1:0));
      chapters.forEach((el, n) => {
        const opacity = n === i ? (i===7 ? 1 : 1-smooth(.2,.55,tail)) : n===i+1?smooth(.55,.9,tail):0;
        el.classList.toggle('is-active', opacity>.4);
        el.style.setProperty('--copy-opacity', opacity);
        el.style.setProperty('--copy-offset', `${(1-opacity)*(n===i?-18:18)}px`);
        // An inactive fixed caption must not intercept focus or pointer input.
        const copy = el.querySelector('.chapter-copy');
        copy.inert = opacity < .4;
        copy.setAttribute('aria-hidden', opacity < .4 ? 'true' : 'false');
        const scrollLink=el.querySelector('.scroll-invitation');
        if(scrollLink){scrollLink.inert=opacity<.4;scrollLink.setAttribute('aria-hidden',opacity<.4?'true':'false');}
      });
      progressBar.style.width = `${clamp(y/(journey.offsetHeight-innerHeight))*100}%`;
      lastY = y;
    }
    if (!atInvitation && !document.hidden) engine?.update(position, local, time*.001,i+local);
  }
  if (enhanced && !document.hidden) frame=requestAnimationFrame(update);
}
function setStatic() {
  enhanced = false;
  cancelAnimationFrame(frame);
  root.classList.remove('enhanced');
  root.classList.remove('pending-3d');
  root.classList.add('static-mode');
  motionButton.setAttribute('aria-pressed','false');
  motionButton.setAttribute('aria-label','เปิดภาพเคลื่อนไหว 3 มิติ');
  motionButton.textContent='เปิดภาพเคลื่อนไหว';
  chapters.forEach(el => {el.querySelector('.chapter-copy').inert=false;el.querySelector('.chapter-copy').removeAttribute('aria-hidden');const a=el.querySelector('.scroll-invitation');if(a){a.inert=false;a.removeAttribute('aria-hidden');}});
  engine?.pause();
  measure();
  restoreInitialAnchor();
  addStillMemories();
}
async function addStillMemories(){
  if(stillMemories)return stillMemories;
  stillMemories=(async()=>{
    const [{memoryOrder},photos]=await Promise.all([import('./memory-order.js'),fetch('./assets/photos/manifest.json').then(r=>r.json())]);
    const info=new Map(photos.map(p=>[p.id,p]));
    const before=scrollY;
    memoryOrder.forEach((id,i)=>{
      const chapter=chapters[Math.min(7,1+Math.floor(i*7/memoryOrder.length))];
      let strip=chapter.querySelector('.still-memories');
      if(!strip){strip=document.createElement('div');strip.className='still-memories';chapter.append(strip);}
      const p=info.get(id),img=document.createElement('img');
      img.src=p.src;img.alt=p.caption;img.width=p.width;img.height=p.height;img.loading='lazy';img.decoding='async';strip.append(img);
    });
    if(!enhanced){measure();if(scrollY===before&&location.hash){initialAnchorHandled=false;restoreInitialAnchor();}}
  })().catch(()=>{stillMemories=undefined;});
  return stillMemories;
}
async function setEnhanced() {
  motionButton.disabled=true;
  try {
    if (!engine) {
      const {createWorld} = await import('./world.js');
      engine=await createWorld(document.querySelector('#world'));
    }
    enhanced=true;
    root.classList.add('enhanced');
    root.classList.remove('pending-3d');
    root.classList.remove('static-mode');
    motionButton.setAttribute('aria-pressed','true');
    motionButton.setAttribute('aria-label','ปิดภาพเคลื่อนไหว 3 มิติ');
    motionButton.textContent='ลดการเคลื่อนไหว';
    measure();
    restoreInitialAnchor();
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(update);
  } catch(error) {
    console.warn('The memory journey is available in still-image mode.',error);
    setStatic();
    motionButton.hidden=true;
  } finally {motionButton.disabled=false;}
}
motionButton.addEventListener('click',async()=>{
  const current=chapters[active];
  if(enhanced) setStatic(); else await setEnhanced();
  current.scrollIntoView({behavior:'instant',block:'start'});
});
motionPreference.addEventListener('change',e=>{if(e.matches)setStatic();});
window.addEventListener('clover-context-lost',setStatic);
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,120);},{passive:true});
addEventListener('orientationchange',()=>setTimeout(measure,250),{passive:true});
addEventListener('scroll',()=>{if(!enhanced)root.classList.toggle('on-invitation',scrollY+innerHeight*.5>=invitation.offsetTop);},{passive:true});
document.addEventListener('visibilitychange',()=>{if(enhanced){cancelAnimationFrame(frame);if(!document.hidden)frame=requestAnimationFrame(update);}});
document.querySelector('.programme').open=innerWidth>=1100;
if(motionPreference.matches)setStatic();else setEnhanced();

const form=document.querySelector('#rsvp-form');
const status=document.querySelector('#form-status');
let requestId;
form.addEventListener('input',()=>{requestId=undefined;});
form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const submit=form.querySelector('button[type="submit"]');
  if(submit.disabled)return;
  const data=new FormData(form);
  requestId ||= crypto.randomUUID();
  const payload={name:String(data.get('name')).trim(),message:String(data.get('message')).trim(),website:String(data.get('website')||''),requestId};
  submit.disabled=true;submit.firstElementChild.textContent='กำลังส่งคำตอบรับ…';status.textContent='';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch('/api/clover20-rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.message||'ยังส่งคำตอบรับไม่ได้ ลองอีกครั้งนะ');
    form.hidden=true;document.querySelector('.rsvp-intro').hidden=true;
    const success=document.querySelector('#rsvp-success');success.hidden=false;success.focus({preventScroll:true});
    form.reset();
  }catch(error){
    status.textContent=error.name==='AbortError'?'การเชื่อมต่อใช้เวลานาน ลองส่งอีกครั้งได้ ข้อมูลที่กรอกยังอยู่ครบ':error.message==='Failed to fetch'?'เชื่อมต่อไม่ได้ในขณะนี้ ลองอีกครั้งเมื่ออินเทอร์เน็ตพร้อมนะ':error.message;
  }finally{clearTimeout(timeout);submit.disabled=false;submit.firstElementChild.textContent='แล้วเจอกัน';}
});
