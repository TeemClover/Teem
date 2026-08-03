import './kickstarter-final-patch-base.js?v=20260803-final-qa-base';

// The preserved QA base still injects the older Founder grid and rewrites
// the first proof value to “397”. Apply the canonical Founder layout after
// every hydration pass so the rendered page—not only the static HTML—wins.
(function(){
  'use strict';

  const STYLE_ID='founder-runtime-canonical-v3';

  function injectFounderLayout(){
    const previous=document.getElementById(STYLE_ID);
    if(previous) previous.remove();

    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html body #founder .founder-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1.2fr) minmax(360px,.9fr)!important;
        grid-template-areas:
          "head head"
          "story proof"
          "story media"!important;
        column-gap:clamp(36px,5vw,72px)!important;
        row-gap:clamp(24px,3vw,38px)!important;
        align-items:start!important;
      }

      html body #founder .founder-head{
        grid-area:head!important;
        max-width:960px!important;
        margin:0!important;
      }

      html body #founder .founder-story{
        grid-area:story!important;
        max-width:720px!important;
        margin:0!important;
        align-self:start!important;
      }

      html body #founder .founder-story>p:first-child{
        margin-top:0!important;
      }

      html body #founder .founder-story blockquote{
        margin:clamp(28px,4vw,44px) 0 0!important;
      }

      html body #founder .founder-proof{
        grid-area:proof!important;
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:14px!important;
        width:100%!important;
        margin:0!important;
        align-self:start!important;
      }

      html body #founder .founder-proof article{
        min-width:0!important;
        min-height:126px!important;
        padding:clamp(18px,2vw,24px)!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:space-between!important;
      }

      html body #founder .founder-proof article b{
        white-space:nowrap!important;
        line-height:.94!important;
      }

      html body #founder [data-story-inline="founder"]{
        grid-area:media!important;
        width:100%!important;
        min-width:0!important;
        margin:0!important;
        align-self:start!important;
        overflow:hidden!important;
      }

      html body #founder [data-story-inline="founder"] img{
        display:block!important;
        width:100%!important;
        height:auto!important;
        aspect-ratio:1586/992!important;
        object-fit:cover!important;
        object-position:center!important;
      }

      html body #founder [data-story-inline="founder"] figcaption{
        min-height:0!important;
      }

      @media(max-width:900px){
        html body #founder .founder-grid{
          grid-template-columns:1fr!important;
          grid-template-areas:
            "head"
            "story"
            "proof"
            "media"!important;
          row-gap:clamp(24px,5vw,38px)!important;
        }

        html body #founder .founder-head,
        html body #founder .founder-story{
          max-width:none!important;
        }

        html body #founder .founder-proof{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
        }
      }

      @media(max-width:680px){
        html body #founder .founder-proof{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
      }

      @media(max-width:390px){
        html body #founder .founder-proof{
          grid-template-columns:1fr!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function correctFounderRuntime(){
    injectFounderLayout();

    const firstValue=document.querySelector('#founder .founder-proof article:first-child b');
    if(firstValue){
      const value=document.documentElement.lang==='th'?'1 ใน 397':'1 of 397';
      if(firstValue.textContent!==value) firstValue.textContent=value;
    }
  }

  function scheduleCorrections(){
    [0,40,180,520,1180,2860,3600].forEach(delay=>setTimeout(correctFounderRuntime,delay));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleCorrections,{once:true});
  }else{
    scheduleCorrections();
  }

  const rootObserver=new MutationObserver(()=>setTimeout(correctFounderRuntime,20));
  rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  const startFounderObserver=()=>{
    const founder=document.getElementById('founder');
    if(!founder) return;
    const observer=new MutationObserver(()=>setTimeout(correctFounderRuntime,20));
    observer.observe(founder,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startFounderObserver,{once:true});
  else startFounderObserver();
})();

// Re-run the idempotent QA layer after the older campaign scripts finish
// their delayed hydration passes. Different query strings intentionally
// create fresh module instances without touching the preserved base file.
setTimeout(()=>import('./kickstarter-final-patch-base.js?v=20260803-final-qa-mid').then(()=>setTimeout(()=>{
  window.dispatchEvent(new Event('founder-runtime-refresh'));
},20)),1100);
setTimeout(()=>import('./kickstarter-final-patch-base.js?v=20260803-final-qa-late').then(()=>setTimeout(()=>{
  window.dispatchEvent(new Event('founder-runtime-refresh'));
},20)),2750);
