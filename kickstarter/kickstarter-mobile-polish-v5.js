(function(){
  'use strict';

  const MOBILE_QUERY='(max-width:680px)';
  const STYLE_ID='campaign-mobile-polish-v5-styles';
  const q=selector=>document.querySelector(selector);
  const qa=selector=>Array.from(document.querySelectorAll(selector));

  function injectStyles(){
    if(q('#'+STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media(max-width:680px){
        /* Hero hand: 6 cards, centred as a compact fan. Desktop is untouched. */
        html body .hero-stage{
          min-height:450px!important;
          margin-top:10px!important;
          overflow:visible!important;
        }
        html body #heroCards.hero-cards{
          width:min(100%,390px)!important;
          height:420px!important;
          margin-inline:auto!important;
          transform:none!important;
          left:auto!important;
        }
        html body #heroCards .hero-card{
          width:174px!important;
          transform-origin:50% 112%!important;
        }
        html body #heroCards .hero-card:nth-child(1){transform:translate(-86%,-40%) rotate(-25deg) translateZ(-50px)!important}
        html body #heroCards .hero-card:nth-child(2){transform:translate(-73%,-51%) rotate(-16deg) translateZ(-30px)!important}
        html body #heroCards .hero-card:nth-child(3){transform:translate(-59%,-58%) rotate(-7deg) translateZ(-10px)!important}
        html body #heroCards .hero-card:nth-child(4){transform:translate(-50%,-61%) rotate(2deg) translateZ(18px)!important}
        html body #heroCards .hero-card:nth-child(5){transform:translate(-36%,-53%) rotate(14deg) translateZ(-12px)!important}
        html body #heroCards .hero-card:nth-child(6){transform:translate(-20%,-41%) rotate(25deg) translateZ(-36px)!important}
        html body #heroCards .hero-card:nth-child(n+7){display:none!important}
        html body .hero-seal{
          width:112px!important;
          right:3%!important;
          bottom:3%!important;
        }

        /* Chosen hand: fewer visible cards so the complete composition fits. */
        html body .pocket-visual{
          min-height:455px!important;
          overflow:visible!important;
          padding-inline:0!important;
        }
        html body .pocket-card-back{
          width:150px!important;
          left:50%!important;
          top:8%!important;
          transform:translateX(-103%) rotate(-10deg)!important;
        }
        html body #pocketCards.pocket-seven{
          width:min(100%,350px)!important;
          height:385px!important;
          margin:0 auto!important;
          transform:none!important;
        }
        html body #pocketCards .mini-card{
          width:132px!important;
          transform-origin:50% 112%!important;
        }
        html body #pocketCards .mini-card:nth-child(1){transform:translate(-92%,-42%) rotate(-24deg)!important}
        html body #pocketCards .mini-card:nth-child(2){transform:translate(-73%,-55%) rotate(-12deg)!important}
        html body #pocketCards .mini-card:nth-child(3){transform:translate(-50%,-61%) rotate(0deg)!important}
        html body #pocketCards .mini-card:nth-child(4){transform:translate(-27%,-55%) rotate(12deg)!important}
        html body #pocketCards .mini-card:nth-child(5){transform:translate(-8%,-42%) rotate(24deg)!important}
        html body #pocketCards .mini-card:nth-child(n+6){display:none!important}
        html body .pocket-note{
          left:5%!important;
          right:5%!important;
          bottom:1%!important;
          width:auto!important;
          max-width:none!important;
          min-width:0!important;
        }

        /* Mobile gallery shows only the selected 7-card colour family. */
        html body[data-mobile-energy="RED"] #cardGallery .gallery-card[data-energy="RED"],
        html body[data-mobile-energy="GREEN"] #cardGallery .gallery-card[data-energy="GREEN"],
        html body[data-mobile-energy="BLUE"] #cardGallery .gallery-card[data-energy="BLUE"],
        html body[data-mobile-energy="GRAY"] #cardGallery .gallery-card[data-energy="GRAY"]{
          display:block!important;
          opacity:1!important;
          filter:none!important;
        }
        html body[data-mobile-energy="RED"] #cardGallery .gallery-card:not([data-energy="RED"]),
        html body[data-mobile-energy="GREEN"] #cardGallery .gallery-card:not([data-energy="GREEN"]),
        html body[data-mobile-energy="BLUE"] #cardGallery .gallery-card:not([data-energy="BLUE"]),
        html body[data-mobile-energy="GRAY"] #cardGallery .gallery-card:not([data-energy="GRAY"]){
          display:none!important;
        }
        html body #cardGallery.card-gallery{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:12px!important;
        }
        html body #cardGallery .gallery-card{
          min-width:0!important;
        }

        /* What comes in the box: restore comfortable inset on stacked cards. */
        html body #box .box-grid{
          margin-inline:4px!important;
          border-radius:22px!important;
        }
        html body #box .box-grid .box-item{
          padding:34px 26px 38px!important;
        }
        html body #box .box-grid .box-count{
          display:block!important;
          margin:0 0 20px!important;
          line-height:.88!important;
        }
        html body #box .box-grid .box-item h3{
          margin:0 0 12px!important;
          line-height:1.12!important;
        }
        html body #box .box-grid .box-item p{
          line-height:1.65!important;
        }
      }

      @media(max-width:390px){
        html body #heroCards.hero-cards{width:350px!important;height:400px!important}
        html body #heroCards .hero-card{width:158px!important}
        html body #pocketCards.pocket-seven{width:322px!important;height:365px!important}
        html body #pocketCards .mini-card{width:120px!important}
        html body #box .box-grid .box-item{padding:30px 22px 34px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedEnergy(){
    const active=q('.energy-button.active[data-energy]');
    return active&&active.dataset.energy ? active.dataset.energy : 'RED';
  }

  function syncMobileGallery(forceDefault){
    if(!matchMedia(MOBILE_QUERY).matches){
      delete document.body.dataset.mobileEnergy;
      return;
    }
    const energy=forceDefault ? 'RED' : selectedEnergy();
    document.body.dataset.mobileEnergy=energy;

    if(forceDefault){
      qa('.energy-button[data-energy]').forEach(button=>{
        button.classList.toggle('active',button.dataset.energy==='RED');
      });
    }
  }

  function bindEnergyButtons(){
    qa('.energy-button[data-energy]').forEach(button=>{
      if(button.dataset.mobileGalleryBound==='1') return;
      button.dataset.mobileGalleryBound='1';
      button.addEventListener('click',()=>{
        if(matchMedia(MOBILE_QUERY).matches){
          document.body.dataset.mobileEnergy=button.dataset.energy||'RED';
        }
      });
    });
  }

  function applyAll(initial){
    injectStyles();
    bindEnergyButtons();
    syncMobileGallery(Boolean(initial&&matchMedia(MOBILE_QUERY).matches));
  }

  function init(){
    applyAll(true);
    [120,420,1000,2200,3800].forEach(delay=>setTimeout(()=>applyAll(false),delay));
    addEventListener('resize',()=>syncMobileGallery(false),{passive:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
