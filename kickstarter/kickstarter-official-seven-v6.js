(function(){
  'use strict';

  const STYLE_ID='kickstarter-official-seven-v6-styles';
  const HERO_IDS=[
    'fh-red-courage',
    'fh-green-balance',
    'fh-blue-clarity',
    'fh-gray-build',
    'fh-red-joy',
    'fh-green-recovery',
    'fh-blue-strategy'
  ];
  const POCKET_FACE_IDS=[
    'fh-red-desire',
    'fh-green-discipline',
    'fh-blue-perspective',
    'fh-gray-observe',
    'fh-red-warmth',
    'fh-green-commitment'
  ];

  let artPromise;
  let repairing=false;
  let repairTimer=0;
  const q=selector=>document.querySelector(selector);

  function injectStyles(){
    if(q('#'+STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Canonical hero: exactly 7 cards in a balanced 3–1–3 fan. */
      html body #heroCards.hero-cards{
        position:relative!important;
        width:min(620px,100%)!important;
        height:590px!important;
        margin-inline:auto!important;
      }
      html body #heroCards .hero-card{
        left:50%!important;
        top:50%!important;
        width:230px!important;
        transform-origin:50% 112%!important;
      }
      html body #heroCards .hero-card:nth-child(1),html body .hero-stage:hover #heroCards .hero-card:nth-child(1){transform:translate(-84%,-42%) rotate(-24deg) translateZ(-50px)!important;z-index:1!important}
      html body #heroCards .hero-card:nth-child(2),html body .hero-stage:hover #heroCards .hero-card:nth-child(2){transform:translate(-72%,-51%) rotate(-16deg) translateZ(-30px)!important;z-index:2!important}
      html body #heroCards .hero-card:nth-child(3),html body .hero-stage:hover #heroCards .hero-card:nth-child(3){transform:translate(-60%,-58%) rotate(-8deg) translateZ(-10px)!important;z-index:3!important}
      html body #heroCards .hero-card:nth-child(4),html body .hero-stage:hover #heroCards .hero-card:nth-child(4){transform:translate(-50%,-62%) rotate(0deg) translateZ(32px)!important;z-index:7!important}
      html body #heroCards .hero-card:nth-child(5),html body .hero-stage:hover #heroCards .hero-card:nth-child(5){transform:translate(-40%,-58%) rotate(8deg) translateZ(-10px)!important;z-index:3!important}
      html body #heroCards .hero-card:nth-child(6),html body .hero-stage:hover #heroCards .hero-card:nth-child(6){transform:translate(-28%,-51%) rotate(16deg) translateZ(-30px)!important;z-index:2!important}
      html body #heroCards .hero-card:nth-child(7),html body .hero-stage:hover #heroCards .hero-card:nth-child(7){transform:translate(-16%,-42%) rotate(24deg) translateZ(-50px)!important;z-index:1!important}
      html body #heroCards .hero-card:nth-child(n+8){display:none!important}

      /* Official chosen hand: 6 face-up cards + 1 shared-back card = 7. */
      html body .pocket-visual{overflow:visible!important}
      html body .pocket-card-back{
        left:50%!important;
        top:5%!important;
        width:210px!important;
        z-index:1!important;
        transform:translateX(-50%) rotate(-3deg)!important;
      }
      html body #pocketCards.pocket-seven{
        position:relative!important;
        width:480px!important;
        height:520px!important;
        margin:0 auto!important;
        transform:none!important;
        z-index:2!important;
      }
      html body #pocketCards .mini-card{
        left:50%!important;
        top:50%!important;
        width:150px!important;
        transform-origin:50% 112%!important;
      }
      html body #pocketCards .mini-card:nth-child(1){transform:translate(-94%,-45%) rotate(-23deg)!important;z-index:2!important}
      html body #pocketCards .mini-card:nth-child(2){transform:translate(-76%,-56%) rotate(-14deg)!important;z-index:3!important}
      html body #pocketCards .mini-card:nth-child(3){transform:translate(-58%,-63%) rotate(-5deg)!important;z-index:4!important}
      html body #pocketCards .mini-card:nth-child(4){transform:translate(-42%,-63%) rotate(5deg)!important;z-index:4!important}
      html body #pocketCards .mini-card:nth-child(5){transform:translate(-24%,-56%) rotate(14deg)!important;z-index:3!important}
      html body #pocketCards .mini-card:nth-child(6){transform:translate(-6%,-45%) rotate(23deg)!important;z-index:2!important}
      html body #pocketCards .mini-card:nth-child(n+7){display:none!important}

      /* The controlled-production photo is a supporting landscape beat. */
      html body [data-story-image="shipping"] img{
        display:block!important;
        width:100%!important;
        height:clamp(260px,32vw,420px)!important;
        aspect-ratio:auto!important;
        object-fit:cover!important;
        object-position:center 48%!important;
      }

      @media(max-width:680px){
        html body .hero-stage{min-height:470px!important;overflow:visible!important}
        html body #heroCards.hero-cards{width:min(100%,390px)!important;height:430px!important;transform:none!important}
        html body #heroCards .hero-card{width:166px!important}
        html body #heroCards .hero-card:nth-child(1),html body .hero-stage:hover #heroCards .hero-card:nth-child(1){transform:translate(-88%,-40%) rotate(-24deg)!important}
        html body #heroCards .hero-card:nth-child(2),html body .hero-stage:hover #heroCards .hero-card:nth-child(2){transform:translate(-74%,-50%) rotate(-16deg)!important}
        html body #heroCards .hero-card:nth-child(3),html body .hero-stage:hover #heroCards .hero-card:nth-child(3){transform:translate(-61%,-57%) rotate(-8deg)!important}
        html body #heroCards .hero-card:nth-child(4),html body .hero-stage:hover #heroCards .hero-card:nth-child(4){transform:translate(-50%,-61%) rotate(0deg)!important}
        html body #heroCards .hero-card:nth-child(5),html body .hero-stage:hover #heroCards .hero-card:nth-child(5){transform:translate(-39%,-57%) rotate(8deg)!important}
        html body #heroCards .hero-card:nth-child(6),html body .hero-stage:hover #heroCards .hero-card:nth-child(6){transform:translate(-26%,-50%) rotate(16deg)!important}
        html body #heroCards .hero-card:nth-child(7),html body .hero-stage:hover #heroCards .hero-card:nth-child(7){transform:translate(-12%,-40%) rotate(24deg)!important}
        html body .hero-seal{width:112px!important;right:3%!important;bottom:2%!important}

        html body .pocket-visual{min-height:465px!important}
        html body .pocket-card-back{width:142px!important;top:6%!important;transform:translateX(-50%) rotate(-3deg)!important}
        html body #pocketCards.pocket-seven{width:min(100%,350px)!important;height:390px!important;margin:0 auto!important}
        html body #pocketCards .mini-card{width:126px!important}
        html body #pocketCards .mini-card:nth-child(1){transform:translate(-96%,-43%) rotate(-23deg)!important}
        html body #pocketCards .mini-card:nth-child(2){transform:translate(-77%,-55%) rotate(-14deg)!important}
        html body #pocketCards .mini-card:nth-child(3){transform:translate(-58%,-62%) rotate(-5deg)!important}
        html body #pocketCards .mini-card:nth-child(4){transform:translate(-42%,-62%) rotate(5deg)!important}
        html body #pocketCards .mini-card:nth-child(5){transform:translate(-23%,-55%) rotate(14deg)!important}
        html body #pocketCards .mini-card:nth-child(6){transform:translate(-4%,-43%) rotate(23deg)!important}
        html body .pocket-note{left:5%!important;right:5%!important;bottom:0!important;width:auto!important;min-width:0!important}

        html body #box .box-grid .box-item{padding:38px 30px 42px!important}
        html body #box .production-spec div{padding:27px 29px 29px!important;text-align:left!important}
        html body #box .ksv2-digital-unlock{padding:28px 30px 31px!important}
        html body .ks-story-figure figcaption{padding:24px 26px 28px!important}
        html body [data-story-image="shipping"] img{height:220px!important;object-position:center 46%!important}
      }

      @media(max-width:390px){
        html body #heroCards.hero-cards{width:350px!important;height:410px!important}
        html body #heroCards .hero-card{width:153px!important}
        html body #pocketCards.pocket-seven{width:320px!important;height:370px!important}
        html body #pocketCards .mini-card{width:116px!important}
        html body #box .box-grid .box-item{padding:34px 25px 38px!important}
        html body #box .production-spec div,html body #box .ksv2-digital-unlock{padding-left:26px!important;padding-right:26px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function fingerprint(container,ids){
    if(!container) return false;
    const cards=Array.from(container.children);
    return cards.length===ids.length&&cards.every((card,index)=>card.dataset.cardId===ids[index]);
  }

  async function renderHands(){
    if(repairing) return;
    const hero=q('#heroCards');
    const pocket=q('#pocketCards');
    if(!hero&&!pocket) return;
    repairing=true;
    try{
      artPromise=artPromise||import('/core7/js/art.js');
      const {cardSVG}=await artPromise;

      if(hero&&!fingerprint(hero,HERO_IDS)){
        const fragment=document.createDocumentFragment();
        HERO_IDS.forEach((id,index)=>{
          const card=document.createElement('div');
          card.className='hero-card';
          card.dataset.index=String(index);
          card.dataset.cardId=id;
          card.innerHTML=cardSVG(id,{width:300,showNumber:true});
          fragment.appendChild(card);
        });
        hero.replaceChildren(fragment);
        hero.dataset.rgbgV4='true';
        hero.dataset.officialSeven='true';
      }

      if(pocket&&!fingerprint(pocket,POCKET_FACE_IDS)){
        const fragment=document.createDocumentFragment();
        POCKET_FACE_IDS.forEach(id=>{
          const card=document.createElement('div');
          card.className='mini-card';
          card.dataset.cardId=id;
          card.innerHTML=cardSVG(id,{width:220,showNumber:false});
          fragment.appendChild(card);
        });
        pocket.replaceChildren(fragment);
        pocket.dataset.rgbgV4='true';
        pocket.dataset.officialSeven='true';
      }

      const back=q('.pocket-card-back img');
      if(back){
        back.src='/core7/assets/card-back-core7.webp?v=20260803-official-seven-v6';
        back.alt=document.documentElement.lang==='th'?'การ์ดคว่ำ 1 ใบในมือทางการ 7 ใบ':'1 face-down card in the official 7-card hand';
      }
    }catch(error){
      console.error('Unable to enforce official seven-card campaign visuals.',error);
    }finally{
      repairing=false;
    }
  }

  function scheduleRepair(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(renderHands,24);
  }

  function observeHands(){
    ['#heroCards','#pocketCards'].forEach(selector=>{
      const node=q(selector);
      if(!node||node.dataset.officialSevenObserver==='true') return;
      node.dataset.officialSevenObserver='true';
      new MutationObserver(scheduleRepair).observe(node,{childList:true});
    });
  }

  function apply(){
    injectStyles();
    renderHands().then(observeHands);
  }

  function init(){
    apply();
    [80,260,720,1500,2800,4300].forEach(delay=>setTimeout(apply,delay));
    new MutationObserver(()=>setTimeout(apply,20)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
