/* AI ใส่ซอส · คำจำหน้าชื่อบท + ทางเดินด่าน 7
   คงชื่อบทเดิมด้านหลังจุดกลาง และคงหัว LV ภาษาอังกฤษด้านบนไว้
   ด่าน 7 ใหม่อยู่ที่ /classroom/dungeon/; ของเก่ายังเก็บไว้ตามเดิม
*/
(function(){
'use strict';

const CARD_TITLES = {
  'free-ai.html': 'ซอส · เริ่มจากการปรุงซอส',
  'image-ai.html': 'เทส · ชิมซอสก่อนเติม',
  'clip-ai.html': 'ผัด · เอาซอสไปทำจานจริง',
  'notebooklm.html': 'แบ่ง · ซอสขวดเดียว แตกได้หลายเมนู',
  'prompts.html': 'ปรุง · เลือกงาน แล้วตักผงไปใช้กับซอส',
  'first-web.html': 'เสิร์ฟ · เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต',
};

function patchClassroom(){
  if(!/^\/classroom\/?(?:index\.html)?$/.test(location.pathname)) return;

  document.querySelectorAll('a.ls').forEach(card=>{
    const href=(card.getAttribute('href')||'').split('#')[0].split('?')[0];
    const key=Object.keys(CARD_TITLES).find(name=>href.endsWith(name));
    if(!key) return;
    const title=card.querySelector('.lsbody > b');
    if(title && title.textContent!==CARD_TITLES[key]) title.textContent=CARD_TITLES[key];
  });

  const dungeon=document.querySelector('.cfinish .cgo');
  if(dungeon) dungeon.href='/classroom/dungeon/';
}

function patchLessonSix(){
  if(!/^\/classroom\/first-web\.html$/.test(location.pathname)) return;
  const link=document.querySelector('#bossDoor .boss-go, a.boss-go');
  if(!link) return;
  link.href='/classroom/dungeon/';
  link.dataset.bossRoom='dungeon';
  link.textContent='เข้าสู่ด่านบอส →';
}

function apply(){
  patchClassroom();
  patchLessonSix();
}

function boot(){
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply,120);
  setTimeout(apply,600);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
