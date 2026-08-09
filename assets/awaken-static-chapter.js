/* myClover · AWAKEN static chapter controller
   Goal: after the Terminal gate is accepted, Chapter 7 is one normal continuous page.
   The legacy inline progress/watch code keeps its detached DOM references, while the
   visible chapter is a clean clone with all 4 phases present immediately.
*/
(function(){
'use strict';

if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;
if(document.documentElement.dataset.awakenStaticChapter==='1') return;
document.documentElement.dataset.awakenStaticChapter='1';

const K_DONE='mc_ch7_done';
const K_IN='mc_ch7_entered';
const K_Y='mc_ch7_y';
const TITLE='AWAKENED';
let chapter=null;
let endObserver=null;
let chestLoaded=false;

function get(key,fallback=''){
  try{const value=localStorage.getItem(key);return value===null?fallback:value}catch{return fallback}
}
function set(key,value){try{localStorage.setItem(key,String(value))}catch{}}
function done(){return get(K_DONE)==='1'}

function loadChest(){
  if(chestLoaded)return;
  chestLoaded=true;
  import('/assets/awaken-chest-object-v5.js?v=20260810-static1').catch(()=>{chestLoaded=false});
}

function grant(){
  try{
    if(window.MC_QUEST?.grant) return window.MC_QUEST.grant(TITLE);
  }catch{}
  try{
    const titles=JSON.parse(get('mc_titles','[]'));
    const list=Array.isArray(titles)?titles:[];
    if(!list.includes(TITLE)){
      list.push(TITLE);
      set('mc_titles',JSON.stringify(list));
    }
  }catch{}
}

function finish(){
  if(done())return;
  set(K_DONE,'1');
  grant();
  try{window.MC_ACT?.('awaken-finish')}catch{}
}

function armEnd(){
  if(!chapter||chapter.hidden||done()||endObserver)return;
  const end=chapter.querySelector('#end');
  if(!end)return;
  if('IntersectionObserver' in window){
    endObserver=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting&&!document.hidden)){
        finish();
        endObserver?.disconnect();
        endObserver=null;
      }
    },{rootMargin:'0px 0px 120px 0px'});
    endObserver.observe(end);
    return;
  }
  const onScroll=()=>{
    if(end.getBoundingClientRect().top<=innerHeight+120){
      removeEventListener('scroll',onScroll);
      finish();
    }
  };
  addEventListener('scroll',onScroll,{passive:true});
  onScroll();
}

function wireNotebook(){
  if(!chapter)return;
  const book=chapter.querySelector('#book');
  const choice=chapter.querySelector('#bookChoice');
  const no=chapter.querySelector('#bookNo');
  const go=chapter.querySelector('#bookGo');
  if(book&&choice){
    book.addEventListener('click',()=>{
      const open=choice.hidden;
      choice.hidden=!open;
      book.setAttribute('aria-expanded',open?'true':'false');
    });
  }
  no?.addEventListener('click',()=>{
    if(choice)choice.hidden=true;
    book?.setAttribute('aria-expanded','false');
    book?.focus();
  });
  go?.addEventListener('click',()=>{
    set(K_Y,String(Math.round(scrollY||document.documentElement.scrollTop||0)));
  });
}

function fillCounts(){
  chapter?.querySelectorAll('[data-count]').forEach(box=>{
    const text=box.querySelector('p')?.textContent.trim()||'';
    const chars=[...text.replace(/\s/g,'')].length;
    const words=text?text.split(/\s+/).length:0;
    const out=box.querySelector('.count');
    if(out)out.textContent=`${chars} ตัวอักษร · ${words} ช่วงคำ`;
  });
}

function showAllPhases(){
  if(!chapter)return;
  chapter.hidden=false;
  chapter.removeAttribute('aria-hidden');
  chapter.querySelectorAll('.phase').forEach(phase=>{
    phase.hidden=false;
    phase.removeAttribute('aria-hidden');
    phase.style.removeProperty('display');
    phase.style.removeProperty('visibility');
    phase.style.removeProperty('opacity');
    phase.style.removeProperty('transform');
    phase.style.removeProperty('max-height');
    phase.style.removeProperty('overflow');
    phase.style.removeProperty('clip-path');
    phase.style.removeProperty('filter');
  });
}

function openChapter(scrollTop=true){
  const gate=document.getElementById('gate');
  gate && (gate.hidden=true);
  showAllPhases();
  set(K_IN,'1');
  document.getElementById('xp')?.remove();
  document.getElementById('dots')?.remove();
  if(scrollTop)scrollTo(0,0);
  armEnd();
  setTimeout(loadChest,120);
}

function buildStaticChapter(){
  const original=document.getElementById('chapter');
  if(!original)return false;

  const clone=original.cloneNode(true);
  clone.dataset.staticChapter='1';
  clone.hidden=original.hidden;
  clone.querySelectorAll('[data-clear]').forEach(marker=>marker.remove());
  clone.querySelectorAll('.phase').forEach(phase=>{
    phase.hidden=false;
    phase.removeAttribute('aria-hidden');
  });
  original.replaceWith(clone);
  chapter=clone;

  document.getElementById('xp')?.remove();
  document.getElementById('dots')?.remove();

  const style=document.createElement('style');
  style.id='awaken-static-chapter-style';
  style.textContent=`
    #chapter .phase{display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;translate:none!important;scale:1!important;max-height:none!important;overflow:visible!important;clip-path:none!important;filter:none!important}
    #chapter .phase>[hidden]{display:none!important}
  `;
  document.head.append(style);

  fillCounts();
  wireNotebook();

  const enter=document.getElementById('enter');
  enter?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    openChapter(true);
  },true);

  const forceIntro=new URLSearchParams(location.search).get('intro')==='1';
  if(forceIntro){
    const gate=document.getElementById('gate');
    if(gate)gate.hidden=false;
    chapter.hidden=true;
  }else if(!original.hidden||get(K_IN)==='1'||done()){
    openChapter(false);
    const y=parseInt(get(K_Y,''),10);
    if((document.referrer||'').includes('/notebook')&&y>0){
      requestAnimationFrame(()=>scrollTo(0,y));
      setTimeout(()=>scrollTo(0,y),80);
    }
  }

  return true;
}

function boot(){
  if(!buildStaticChapter())return;
  addEventListener('pageshow',()=>{
    if(!chapter?.hidden){showAllPhases();armEnd()}
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
