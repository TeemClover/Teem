import './kickstarter-final-patch-base.js?v=20260803-final-qa-base';

// The preserved QA base still injects older campaign copy and layout during
// delayed hydration. Apply the current canonical Founder layout and official
// game naming after every pass so the rendered page always wins.
(function(){
  'use strict';

  const STYLE_ID='founder-runtime-canonical-v3';
  const isThai=()=>document.documentElement.lang==='th';
  const q=selector=>document.querySelector(selector);
  const qa=selector=>Array.from(document.querySelectorAll(selector));

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

  function replaceText(root,from,to){
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent||/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue&&node.nodeValue.includes(from)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
      }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{node.nodeValue=node.nodeValue.replaceAll(from,to);});
  }

  function applyMikawaCanonical(){
    const th=isThai();

    // Remove every legacy public-facing spelling without changing the
    // Three Rivers descriptor used to explain the battlefield.
    replaceText(document.body,'三川 3IVERS','三川 MIKAWA');
    replaceText(document.body,'CORE7 + 3IVERS','CORE7 + 三川 MIKAWA');
    replaceText(document.body,'3IVERS','MIKAWA');

    document.title='myClover — 0% RNG. 100% Decisions.';
    const description=q('meta[name="description"]');
    const ogTitle=q('meta[property="og:title"]');
    const ogDescription=q('meta[property="og:description"]');
    if(description) description.setAttribute('content','Choose 7 words and play 2 zero-randomness games with one 32-card system: CORE7, the flagship rule, and 三川 MIKAWA, a Three-River strategy game.');
    if(ogTitle) ogTitle.setAttribute('content','myClover — CORE7 + 三川 MIKAWA');
    if(ogDescription) ogDescription.setAttribute('content','1 keyword. 4 colors. 7 chosen cards. 2 official games. 0% RNG. 100% decisions.');

    const brand=q('.brand > span:not(.brand-mark)');
    if(brand) brand.innerHTML='myClover <b>· CORE7 + 三川 MIKAWA</b>';

    const title=q('#official-games [data-official-title]');
    const lead=q('#official-games [data-official-lead]');
    const riversCard=q('#official-games [data-rivers-card]');
    const rivers=q('#official-games .official-game-card.rivers');
    if(title) title.textContent=th
      ? 'CORE7 คือจุดเริ่มต้นของทุกคน ส่วน 三川 MIKAWA เปลี่ยนมือ 7 ใบเดิมให้กลายเป็นสมรภูมิ'
      : 'CORE7 is where everyone begins. 三川 MIKAWA is where the same 7 cards become a battlefield.';
    if(lead) lead.textContent=th
      ? 'ระบบเดียวกันสร้างได้ทั้งเกมที่เรียนรู้ทันที และเกมกลยุทธ์ 3 สายน้ำที่ทุกตำแหน่งมีความหมาย'
      : 'The same system holds an instant flagship rule and a Three-River strategy game where every position matters.';
    if(riversCard) riversCard.textContent=th
      ? 'เกมกลยุทธ์ที่ใช้มือ 7 ใบเดิมต่อสู้บน 3 สายน้ำ ชนะ 2 สายน้ำเพื่อรับ 1 Win จับการ์ดที่พ่ายแพ้จากสายน้ำที่ยึดได้ และเป็นคนแรกที่ได้ 3 Wins'
      : 'A strategy game played with the same 7-card hand across 3 Rivers. Win 2 Rivers to claim 1 Win, capture 1 defeated card from a River you conquered, and become the first to 3 Wins.';
    if(rivers){
      const h3=rivers.querySelector('h3');
      const descriptor=rivers.querySelector('b');
      const small=rivers.querySelector('small');
      if(h3) h3.textContent='三川 MIKAWA';
      if(descriptor) descriptor.textContent=th?'กลยุทธ์ 3 สายน้ำ':'THREE RIVERS';
      if(small) small.textContent=th?'7 ใบ · 3 สายน้ำ · คนแรกที่ได้ 3 WINS':'7 CARDS · 3 RIVERS · FIRST TO 3 WINS';
    }

    const ruleCopy=q('#box .box-item:nth-child(2) p');
    if(ruleCopy) ruleCopy.textContent=th
      ? 'CORE7 Match, CORE7 Set, 三川 MIKAWA และ Open Play ส่งต่อกติกาแล้วเริ่มเล่นได้ทันที'
      : 'CORE7 Match, CORE7 Set, 三川 MIKAWA and Open Play. Hand them around and begin.';

    const productDefinition=q('#pledges .product-definition span');
    if(productDefinition) productDefinition.textContent=th
      ? 'สินค้า 1 กล่อง · การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · CORE7 + 三川 MIKAWA'
      : '1 product box · 28 word cards · 4 rule cards · CORE7 + 三川 MIKAWA';

    const finalCopy=q('.final-cta .final-inner>p:not(.eyebrow)');
    const finalSmall=q('.final-cta small');
    if(finalCopy) finalCopy.textContent=th
      ? 'เล่น CORE7 หรือข้าม 3 สายน้ำของ 三川 MIKAWA แล้วออกจากโต๊ะพร้อมความทรงจำร่วมกัน'
      : 'Play CORE7—or cross the 3 Rivers of 三川 MIKAWA—and leave the table with a shared memory.';
    if(finalSmall) finalSmall.textContent='myClover · CORE7 + 三川 MIKAWA · 0% RNG · 100% Decisions';
  }

  function correctRuntime(){
    injectFounderLayout();
    applyMikawaCanonical();

    const firstValue=q('#founder .founder-proof article:first-child b');
    if(firstValue){
      const value=isThai()?'1 ใน 397':'1 of 397';
      if(firstValue.textContent!==value) firstValue.textContent=value;
    }
  }

  function scheduleCorrections(){
    [0,40,180,520,1180,2860,3600].forEach(delay=>setTimeout(correctRuntime,delay));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleCorrections,{once:true});
  }else{
    scheduleCorrections();
  }

  const rootObserver=new MutationObserver(()=>setTimeout(correctRuntime,20));
  rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  const startFounderObserver=()=>{
    const founder=document.getElementById('founder');
    if(!founder) return;
    const observer=new MutationObserver(()=>setTimeout(correctRuntime,20));
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
