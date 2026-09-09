import {entryContext,notebookHref} from './route-contract.js';

// Standalone reference content: no first-day gate, tracking or progress writes.
let storage;try{storage=localStorage;}catch{storage=null;}
const context=entryContext(location.search,storage);
const link=(href,label)=>{const a=document.createElement('a');a.href=href;a.textContent=label;return a;};
const nav=document.querySelector('.xp-nav');
if(nav){
  nav.dataset.currentReference='true';
  nav.replaceChildren(link('/xircle/learn/','ห้องความรู้'),link('/meet/?intent=health&from=xircle&open=booking','นัดคุย'));
  nav.setAttribute('aria-label','ทางไปต่อ');nav.hidden=false;
}
document.querySelectorAll('[data-after-unlock]').forEach(el=>{el.hidden=false;});
document.querySelectorAll('[data-whitecat-link],[data-whitecat-bridge],[data-room-join]').forEach(a=>{a.href=notebookHref(context);});
document.querySelectorAll('[data-room-code]').forEach(el=>{el.textContent=context.invitation||'';});
document.querySelectorAll('[data-invite-room]').forEach(el=>{el.hidden=!context.invitation;});
document.querySelectorAll('img[data-art-src]').forEach(img=>{
  const src=img.getAttribute('data-art-src');if(!src?.startsWith('/xircle/assets/'))return;
  const frame=img.closest('.xp-art'),fallback=img.nextElementSibling;
  const show=ready=>{img.hidden=!ready;frame?.classList.toggle('art-ready',ready);if(fallback?.classList.contains('xp-fallback'))fallback.style.opacity=ready?'0':'';};
  img.addEventListener('load',()=>show(true),{once:true});img.addEventListener('error',()=>show(false),{once:true});
  img.src=src;if(img.complete)show(img.naturalWidth>0);
});
