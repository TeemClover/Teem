(function(){
  'use strict';

  const STYLE_ID='kickstarter-stable-language-v9-styles';
  const FONT_ID='kickstarter-thai-font-v9';
  const VERSION='20260804-stable-language-v9';
  const q=selector=>document.querySelector(selector);
  let repairTimer=0;
  let observer=null;

  const copy={
    en:{
      eyebrow:'ONE SYSTEM · THREE GAMES',
      title:'Learn CORE7 once. The same card opens two more games.',
      body:'CORE7 teaches the shared color language in seconds. Once it clicks, turn over the same Rule Card and play HERO’S DUEL for rapid-fire combat or 三川 MIKAWA for the deepest positional war. No new deck. No new symbols. No second rules lesson.',
      start:'START HERE',
      flip:'TAP TO FLIP · MIKAWA / CORE7',
      front:'FRONT · MIKAWA + HERO’S DUEL',
      back:'BACK · CORE7',
      frontAlt:'三川 MIKAWA and HERO’S DUEL visual rule card',
      backAlt:'CORE7 visual rule card'
    },
    th:{
      eyebrow:'ระบบเดียว · 3 เกมเต็ม',
      title:'เรียน CORE7 เพียงครั้งเดียว แล้วพลิกการ์ดใบเดิมเพื่อเล่นอีก 2 เกม',
      body:'CORE7 ทำให้เข้าใจภาษาสีร่วมกันภายในไม่กี่วินาที พอเล่นเป็นแล้ว เพียงพลิก Rule Card ใบเดิมก็เริ่ม HERO’S DUEL แบบดวลรัว หรือเข้าสู่ 三川 MIKAWA ซึ่งเป็นสงครามวางตำแหน่งที่ลึกที่สุดได้ทันที ไม่ต้องเปลี่ยนเด็ค ไม่ต้องจำสัญลักษณ์ใหม่ และไม่ต้องเริ่มเรียนระบบใหม่',
      start:'เริ่มจากเกมนี้',
      flip:'แตะเพื่อพลิก · MIKAWA / CORE7',
      front:'ด้านหน้า · MIKAWA + HERO’S DUEL',
      back:'ด้านหลัง · CORE7',
      frontAlt:'การ์ดกติกาภาพ 三川 MIKAWA และ HERO’S DUEL',
      backAlt:'การ์ดกติกาภาพ CORE7'
    }
  };

  function loadThaiFont(){
    if(document.getElementById(FONT_ID)) return;
    const link=document.createElement('link');
    link.id=FONT_ID;
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html[lang='th'] body,
      html[lang='th'] button,
      html[lang='th'] input,
      html[lang='th'] select,
      html[lang='th'] textarea{
        font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important;
      }
      html[lang='th'] h1,
      html[lang='th'] h2,
      html[lang='th'] h3,
      html[lang='th'] h4,
      html[lang='th'] strong,
      html[lang='th'] b{
        font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important;
        letter-spacing:-.025em;
      }

      /* Stable two-image flip: no 3D blank side, no language-dependent rebuild. */
      html body #official-games .ogv7-stage{
        display:grid!important;
        transform:none!important;
        transform-style:flat!important;
        transition:none!important;
        filter:drop-shadow(0 24px 28px rgba(5,24,17,.23))!important;
      }
      html body #official-games .ogv7-face,
      html body #official-games .ogv7-face.back{
        grid-area:1/1!important;
        display:block!important;
        transform:none!important;
        backface-visibility:visible!important;
        -webkit-backface-visibility:visible!important;
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
        transition:opacity .26s ease,visibility 0s linear .26s!important;
      }
      html body #official-games .ogv7-face.front{
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
        transition-delay:0s!important;
      }
      html body #official-games .ogv7-flip[data-flipped='true'] .ogv7-face.front{
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
      html body #official-games .ogv7-flip[data-flipped='true'] .ogv7-face.back{
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
        transition-delay:0s!important;
      }
      html body #official-games .ogv7-face img{
        display:block!important;
        width:100%!important;
        height:auto!important;
        aspect-ratio:1061/1482!important;
        object-fit:contain!important;
      }
      @media(prefers-reduced-motion:reduce){
        html body #official-games .ogv7-face{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function currentLanguage(){
    return document.documentElement.lang==='th'?'th':'en';
  }

  function setText(node,value){
    if(node&&node.textContent!==value) node.textContent=value;
  }

  function repairRuleSection(){
    injectStyles();
    const section=q('#official-games');
    if(!section) return;

    const language=currentLanguage();
    const c=copy[language];
    const rule=section.querySelector('.ogv7-rule');
    if(!rule) return;

    const eyebrow=rule.querySelector('.ogv7-rule-copy .eyebrow');
    const title=rule.querySelector('.ogv7-rule-copy h3');
    const body=rule.querySelector('.ogv7-rule-copy>p:not(.eyebrow)');
    const sideLabels=rule.querySelectorAll('.ogv7-sides span');
    const startBadge=section.querySelector('.ogv7-start');
    const hint=rule.querySelector('.ogv7-flip-hint');

    setText(eyebrow,c.eyebrow);
    setText(title,c.title);
    setText(body,c.body);
    setText(startBadge,c.start);
    if(hint) setText(hint,'↻ '+c.flip);
    if(sideLabels[0]) setText(sideLabels[0],c.front);
    if(sideLabels[1]) setText(sideLabels[1],c.back);

    const button=rule.querySelector('.ogv7-flip');
    if(!button) return;
    button.setAttribute('aria-label',c.flip);

    let stage=button.querySelector('.ogv7-stage');
    if(!stage){
      stage=document.createElement('span');
      stage.className='ogv7-stage';
      button.prepend(stage);
    }

    let front=stage.querySelector('.ogv7-face.front');
    let back=stage.querySelector('.ogv7-face.back');
    if(!front){
      front=document.createElement('span');
      front.className='ogv7-face front';
      stage.appendChild(front);
    }
    if(!back){
      back=document.createElement('span');
      back.className='ogv7-face back';
      stage.appendChild(back);
    }

    let frontImage=front.querySelector('img');
    let backImage=back.querySelector('img');
    if(!frontImage){frontImage=document.createElement('img');front.appendChild(frontImage);}
    if(!backImage){backImage=document.createElement('img');back.appendChild(backImage);}

    if(!frontImage.src.includes('/core7/assets/mikawa-rule.webp')) frontImage.src='/core7/assets/mikawa-rule.webp?v='+VERSION;
    if(!backImage.src.includes('/core7/assets/core7-rule.webp')) backImage.src='/core7/assets/core7-rule.webp?v='+VERSION;
    frontImage.alt=c.frontAlt;
    backImage.alt=c.backAlt;
    frontImage.loading='eager';
    backImage.loading='eager';
    frontImage.decoding='async';
    backImage.decoding='async';

    if(button.dataset.flipped!=='true') button.dataset.flipped='false';
    button.setAttribute('aria-pressed',String(button.dataset.flipped==='true'));

    if(button.dataset.wired!=='true'&&button.dataset.stableFlipV9!=='true'){
      button.dataset.stableFlipV9='true';
      button.addEventListener('click',()=>{
        const next=button.dataset.flipped!=='true';
        button.dataset.flipped=String(next);
        button.setAttribute('aria-pressed',String(next));
      });
    }
  }

  function scheduleRepair(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(repairRuleSection,16);
  }

  function initObserver(){
    if(observer) return;
    observer=new MutationObserver(mutations=>{
      const relevant=mutations.some(mutation=>{
        if(mutation.type==='attributes') return mutation.target===document.documentElement&&mutation.attributeName==='lang';
        return Array.from(mutation.addedNodes||[]).some(node=>node.nodeType===1&&(node.id==='official-games'||(node.querySelector&&node.querySelector('#official-games,.ogv7-rule'))));
      });
      if(relevant) scheduleRepair();
    });
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang'],childList:true,subtree:true});
  }

  function init(){
    loadThaiFont();
    injectStyles();
    repairRuleSection();
    initObserver();
    [80,260,760,1800,3400,6400].forEach(delay=>setTimeout(repairRuleSection,delay));
  }

  /* The page's canonical language engine already starts every fresh load in English.
     This patch never clicks a language button and never rewrites <html lang>, removing
     the EN/TH feedback loop that caused the visible flashing. */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
