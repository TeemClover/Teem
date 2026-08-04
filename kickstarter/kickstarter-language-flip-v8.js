(function(){
  'use strict';

  const STYLE_ID='kickstarter-language-flip-v8-styles';
  const VERSION='20260804-language-flip-v8';
  const q=selector=>document.querySelector(selector);
  let defaultApplied=false;
  let repairTimer=0;

  function injectStyles(){
    if(q('#'+STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Reliable two-image rule-card flip. Both real images stay in the DOM. */
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
        transition:opacity .28s ease,visibility 0s linear .28s!important;
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
        transition-delay:0s,.28s!important;
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

  function setToggleState(language){
    document.querySelectorAll('.ksv2-lang button').forEach(button=>{
      const active=button.dataset.lang===language;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function applyEnglishDefault(){
    if(defaultApplied) return;
    defaultApplied=true;
    document.documentElement.lang='en';
    setToggleState('en');

    // Use the page's existing translation engine so every legacy section
    // returns to English too. No language value is read from or saved to storage.
    const englishButton=q('.ksv2-lang button[data-lang="en"]');
    if(englishButton) englishButton.click();
    document.documentElement.lang='en';
    setToggleState('en');
  }

  function repairRuleCard(){
    injectStyles();
    const button=q('#official-games .ogv7-flip');
    if(!button) return;

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
    if(!frontImage){
      frontImage=document.createElement('img');
      front.appendChild(frontImage);
    }
    if(!backImage){
      backImage=document.createElement('img');
      back.appendChild(backImage);
    }

    const frontSrc='/core7/assets/mikawa-rule.webp?v='+VERSION;
    const backSrc='/core7/assets/core7-rule.webp?v='+VERSION;
    if(!frontImage.src.includes('/core7/assets/mikawa-rule.webp')) frontImage.src=frontSrc;
    if(!backImage.src.includes('/core7/assets/core7-rule.webp')) backImage.src=backSrc;
    frontImage.alt='三川 MIKAWA and HERO’S DUEL visual rule card';
    backImage.alt='CORE7 visual rule card';
    frontImage.loading='eager';
    backImage.loading='eager';
    frontImage.decoding='async';
    backImage.decoding='async';

    if(button.dataset.flipped!=='true') button.dataset.flipped='false';
    button.setAttribute('aria-pressed',String(button.dataset.flipped==='true'));

    // The v7 listener already toggles data-flipped. Add a fallback only when
    // that listener has not been attached yet.
    if(button.dataset.wired!=='true'&&button.dataset.flipV8Wired!=='true'){
      button.dataset.flipV8Wired='true';
      button.addEventListener('click',()=>{
        const next=button.dataset.flipped!=='true';
        button.dataset.flipped=String(next);
        button.setAttribute('aria-pressed',String(next));
      });
    }
  }

  function scheduleRepair(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(()=>{
      injectStyles();
      repairRuleCard();
    },24);
  }

  function bindLanguageButtons(){
    if(document.documentElement.dataset.ksLanguageV8==='true') return;
    document.documentElement.dataset.ksLanguageV8='true';
    document.addEventListener('click',event=>{
      const button=event.target.closest&&event.target.closest('.ksv2-lang button[data-lang]');
      if(!button) return;
      const language=button.dataset.lang==='th'?'th':'en';
      document.documentElement.lang=language;
      setToggleState(language);
      setTimeout(scheduleRepair,0);
    },true);
  }

  function init(){
    injectStyles();
    bindLanguageButtons();
    applyEnglishDefault();
    repairRuleCard();
    [40,140,360,820,1600,3200,5200,6800].forEach(delay=>setTimeout(()=>{
      injectStyles();
      repairRuleCard();
    },delay));

    new MutationObserver(scheduleRepair).observe(document.documentElement,{
      childList:true,
      subtree:true
    });
  }

  // Kickstarter always starts in English on every page load. The visitor may
  // switch to Thai for the current visit, but this page never restores a saved language.
  document.documentElement.lang='en';
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.addEventListener('pageshow',event=>{
    if(!event.persisted) return;
    defaultApplied=false;
    applyEnglishDefault();
    scheduleRepair();
  });
})();
