const root = document.documentElement;
if(location.hash)history.scrollRestoration='manual';
const chapters = [...document.querySelectorAll('.chapter')];
const journey = document.querySelector('#journey');
const invitation = document.querySelector('#invitation');
const motionButton = document.querySelector('#motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
if(!motionPreference.matches)root.classList.add('pending-3d');
const index = document.querySelector('#chapter-index');
const label = document.querySelector('#chapter-label');
const progressBar = document.querySelector('#journey-progress');
let engine, enhanced = false, frame, active = 0, bounds = [], lastY = -1, resizeTimer;
let initialAnchorHandled=false;
let photos = [];
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = (a, b, n) => { const t = clamp((n-a)/(b-a)); return t*t*(3-2*t); };
const album = document.querySelector('#album');

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
      index.textContent = String(active).padStart(2,'0');
      label.textContent = chapters[active].dataset.label;
      progressBar.style.width = `${clamp(y/(journey.offsetHeight-innerHeight))*100}%`;
      lastY = y;
    }
    if (!atInvitation && !document.hidden && !album.open) engine?.update(position, local, time*.001);
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
  chapters.forEach(el => {el.querySelector('.chapter-copy').inert=false;el.querySelector('.chapter-copy').removeAttribute('aria-hidden');const a=el.querySelector('.scroll-invitation');if(a){a.inert=false;a.removeAttribute('aria-hidden');}});
  engine?.pause();
  measure();
  restoreInitialAnchor();
}
async function setEnhanced() {
  motionButton.disabled=true;
  try {
    if (!engine) {
      const {createWorld} = await import('./world.js');
      engine=await createWorld(document.querySelector('#world'), photoId=>openAlbum(photoId));
    }
    enhanced=true;
    root.classList.add('enhanced');
    root.classList.remove('pending-3d');
    root.classList.remove('static-mode');
    motionButton.setAttribute('aria-pressed','true');
    motionButton.setAttribute('aria-label','ปิดภาพเคลื่อนไหว 3 มิติ');
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

// The same source photographs are available at full width, outside the 3D view.
const photosReady=fetch('./assets/photos/manifest.json').then(r=>{if(!r.ok)throw Error('Photo manifest unavailable');return r.json();}).then(data=>{photos=data;}).catch(()=>{
  photos=[{id:'table',src:'./assets/photos/table.webp',caption:'ความโชคดีเริ่มจากบทสนทนา'}];
});
let currentPhoto=0, albumReturnFocus;
function displayPhoto() {
  const photo=photos[currentPhoto];
  const image=document.querySelector('#album-image');
  image.src=photo.src;image.alt=photo.caption;
  document.querySelector('#album-caption').textContent=photo.caption;
  document.querySelector('#photo-index').textContent=`${String(currentPhoto+1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}`;
}
async function openAlbum(id='table') {
  await photosReady;
  currentPhoto=Math.max(0,photos.findIndex(p=>p.id===id));
  displayPhoto();
  albumReturnFocus=document.activeElement;
  if(!album.open)album.showModal();
  document.body.style.overflow='hidden';
}
document.querySelectorAll('[data-album]').forEach(b=>b.addEventListener('click',()=>openAlbum()));
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>openAlbum(b.dataset.photo)));
document.querySelector('.close-album').addEventListener('click',()=>album.close());
album.addEventListener('close',()=>{document.body.style.overflow='';albumReturnFocus?.focus({preventScroll:true});});
album.addEventListener('click',e=>{if(e.target===album){const r=album.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)album.close();}});
function changePhoto(direction){currentPhoto=(currentPhoto+direction+photos.length)%photos.length;displayPhoto();}
document.querySelector('#previous-photo').addEventListener('click',()=>changePhoto(-1));
document.querySelector('#next-photo').addEventListener('click',()=>changePhoto(1));
album.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();changePhoto(-1);}if(e.key==='ArrowRight'){e.preventDefault();changePhoto(1);}});

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
  const payload={name:String(data.get('name')).trim(),contact:String(data.get('contact')).trim(),message:String(data.get('message')).trim(),consent:data.get('consent')==='on',website:String(data.get('website')||''),requestId};
  submit.disabled=true;submit.firstElementChild.textContent='กำลังส่งคำตอบรับ…';status.textContent='';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch('/api/clover20-rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.message||'ยังส่งคำตอบรับไม่ได้ ลองอีกครั้งนะ');
    form.hidden=true;document.querySelector('.rsvp-intro').hidden=true;
    document.querySelector('#receipt').textContent=`หมายเลขตอบรับ ${result.reference}`;
    const success=document.querySelector('#rsvp-success');success.hidden=false;success.focus({preventScroll:true});
    form.reset();
  }catch(error){
    status.textContent=error.name==='AbortError'?'การเชื่อมต่อใช้เวลานาน ลองส่งอีกครั้งได้ ข้อมูลที่กรอกยังอยู่ครบ':error.message==='Failed to fetch'?'เชื่อมต่อไม่ได้ในขณะนี้ ลองอีกครั้งเมื่ออินเทอร์เน็ตพร้อมนะ':error.message;
  }finally{clearTimeout(timeout);submit.disabled=false;submit.firstElementChild.textContent='ฉันจะกลับไปเจอเพื่อน ๆ';}
});
