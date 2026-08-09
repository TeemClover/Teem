/* myClover · AWAKEN floating tooltip v1
   Final tooltip layer. It disables every legacy ::after tooltip and renders one
   fixed node on <body>, so cards/details/overflow cannot clip the explanation.
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

let tip=null, active=null, sticky=false;

function style(){
  if(document.getElementById('awaken-floating-tooltip-v1-style')) return;
  const s=document.createElement('style');
  s.id='awaken-floating-tooltip-v1-style';
  s.textContent=`
    html body .aw-term::after{content:none!important;display:none!important;opacity:0!important;visibility:hidden!important}
    #aw-floating-tip{display:none!important}
    #aw-floating-tip-v1{position:fixed!important;z-index:2147483640!important;box-sizing:border-box!important;
      width:max-content;max-width:min(330px,calc(100vw - 20px));padding:12px 14px;border:1px solid rgba(217,185,103,.5);
      border-radius:12px;background:#07130c;color:#f8f6f0;-webkit-text-fill-color:#f8f6f0;
      font:650 13px/1.65 "Anuphan",system-ui,sans-serif;text-align:left;white-space:normal;
      overflow-wrap:anywhere;box-shadow:0 18px 42px rgba(0,0,0,.62);pointer-events:none;
      opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease}
    #aw-floating-tip-v1[data-open="1"]{opacity:1;visibility:visible;transform:none}
    @media(max-width:560px){#aw-floating-tip-v1{max-width:calc(100vw - 20px);font-size:13.5px}}
    @media(prefers-reduced-motion:reduce){#aw-floating-tip-v1{transition:none}}
  `;
  document.head.append(s);
}
function node(){
  if(tip?.isConnected) return tip;
  tip=document.createElement('div');
  tip.id='aw-floating-tip-v1';
  tip.role='tooltip';
  tip.setAttribute('aria-hidden','true');
  document.body.append(tip);
  return tip;
}
function viewport(){
  const v=visualViewport;
  return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};
}
function place(term){
  if(!term?.isConnected) return;
  const n=node(), r=term.getBoundingClientRect(), v=viewport(), margin=10, gap=9;
  n.style.left=`${v.left+margin}px`; n.style.top=`${v.top+margin}px`;
  const tr=n.getBoundingClientRect();
  let left=r.left+r.width/2-tr.width/2;
  left=Math.max(v.left+margin,Math.min(left,v.left+v.width-tr.width-margin));
  let top=r.bottom+gap;
  const above=r.top-tr.height-gap;
  if(top+tr.height>v.top+v.height-margin && above>=v.top+margin) top=above;
  top=Math.max(v.top+margin,Math.min(top,v.top+v.height-tr.height-margin));
  n.style.left=`${Math.round(left)}px`; n.style.top=`${Math.round(top)}px`;
}
function show(term,keep){
  const text=term?.dataset?.tip; if(!text) return;
  const n=node(); active=term; sticky=!!keep;
  n.textContent=text; n.dataset.open='1'; n.setAttribute('aria-hidden','false');
  term.setAttribute('aria-describedby',n.id);
  requestAnimationFrame(()=>place(term));
}
function hide(force=false){
  if(sticky&&!force) return;
  if(active) active.removeAttribute('aria-describedby');
  active=null; sticky=false;
  const n=node(); n.dataset.open='0'; n.setAttribute('aria-hidden','true');
}

function boot(){
  style(); node();
  /* Capture events so legacy tooltip handlers cannot leave a clipped pseudo bubble visible. */
  document.addEventListener('pointerover',e=>{const t=e.target.closest?.('.aw-term[data-tip]');if(t&&!sticky)show(t,false)},true);
  document.addEventListener('pointerout',e=>{const t=e.target.closest?.('.aw-term[data-tip]');if(t&&!sticky)hide(true)},true);
  document.addEventListener('focusin',e=>{const t=e.target.closest?.('.aw-term[data-tip]');if(t)show(t,false)},true);
  document.addEventListener('focusout',e=>{if(e.target.closest?.('.aw-term[data-tip]')&&!sticky)hide(true)},true);
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('.aw-term[data-tip]');
    if(!t){hide(true);return}
    e.stopPropagation();
    if(active===t&&sticky) hide(true); else show(t,true);
  },true);
  addEventListener('scroll',()=>{if(active) sticky?place(active):hide(true)},{passive:true,capture:true});
  addEventListener('resize',()=>{if(active)place(active)});
  visualViewport?.addEventListener('resize',()=>{if(active)place(active)});
  visualViewport?.addEventListener('scroll',()=>{if(active)place(active)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
