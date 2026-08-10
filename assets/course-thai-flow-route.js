/* AI ใส่ซอส · คำจำหน้าชื่อบท + ทางเดินด่าน 7
   ชื่อไทยหลังจุดกลางคงเดิม ใช้คำหน้าสั้น ๆ เป็น flow ครัว
   English canon: SOURCE → TASTE → COOK → SPLIT → SEASON → SERVE
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

const FLOW = ['SOURCE','TASTE','COOK','SPLIT','SEASON','SERVE'];
const TITLES = Object.values(CARD_TITLES);

function replaceMultiply(root){
  if(!root) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) if(walker.currentNode.nodeValue.includes('MULTIPLY')) nodes.push(walker.currentNode);
  nodes.forEach(node=>{ node.nodeValue=node.nodeValue.replace(/MULTIPLY/g,'SPLIT'); });
}

function patchClassroom(){
  if(!/^\/classroom\/?(?:index\.html)?$/.test(location.pathname)) return;

  document.querySelectorAll('a.ls').forEach((card,index)=>{
    const href=(card.getAttribute('href')||'').split('#')[0].split('?')[0];
    const key=Object.keys(CARD_TITLES).find(name=>href.endsWith(name));
    if(!key) return;
    const title=card.querySelector('.lsbody > b');
    if(title && title.textContent!==CARD_TITLES[key]) title.textContent=CARD_TITLES[key];
    if(key==='notebooklm.html'){
      const level=card.querySelector('.lslv');
      if(level) level.innerHTML='LV.4 <em>SPLIT</em>';
    }
  });

  document.querySelectorAll('.steps6 .st6').forEach((row,index)=>{
    const label=row.querySelector('b');
    if(label && TITLES[index]) label.textContent=TITLES[index];
  });

  replaceMultiply(document.querySelector('main')||document.body);

  const dungeon=document.querySelector('.cfinish .cgo');
  if(dungeon) dungeon.href='/classroom/dungeon/';
}

function patchLessonFour(){
  if(!/^\/classroom\/notebooklm\.html$/.test(location.pathname)) return;
  replaceMultiply(document.querySelector('main')||document.body);
  const tag=document.querySelector('#mcSauceFirstPop .mc-sauce-pop__tag');
  if(tag && /Multiply/i.test(tag.textContent)) tag.textContent=tag.textContent.replace(/Multiply/ig,'Split');
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
  patchLessonFour();
  patchLessonSix();
}

function boot(){
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply,120);
  setTimeout(apply,600);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-mc-sauce-term]')) setTimeout(patchLessonFour,0);
  });
  document.addEventListener('pointerover',event=>{
    if(event.target.closest?.('[data-mc-sauce-term]')) requestAnimationFrame(patchLessonFour);
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
