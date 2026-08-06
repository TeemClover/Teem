/* Lesson 4 · keep the signature illustration inside the green hero */
(function(){
  var meta=document.querySelector('meta[name="mc-item"]');
  if(!meta||meta.content!=='learn:notebooklm') return;

  if(!document.getElementById('notebooklm-hero-position-style')){
    var style=document.createElement('style');
    style.id='notebooklm-hero-position-style';
    style.textContent=`
      .head .multiply-ill{
        margin:25px -5px -8px!important;
        padding-top:16px!important;
        border:0!important;
        border-top:1px solid rgb(255 255 255/.1)!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      .head .multiply-ill svg{
        display:block;
        width:100%;
        height:auto;
        border-radius:18px;
        filter:drop-shadow(0 18px 23px rgb(0 0 0/.16));
      }
      @media(max-width:580px){
        .head .multiply-ill{margin:22px -4px -6px!important;padding-top:14px!important}
        .head .multiply-ill svg{border-radius:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function moveIntoHero(){
    var head=document.querySelector('.head');
    var figure=document.querySelector('.multiply-ill');
    if(!head||!figure) return false;

    var oldHero=head.querySelector('.hero');
    if(oldHero) oldHero.replaceWith(figure);
    else if(figure.parentNode!==head) head.appendChild(figure);

    figure.classList.add('multiply-ill-hero');
    return true;
  }

  if(moveIntoHero()) return;

  if(window.MutationObserver){
    var observer=new MutationObserver(function(){
      if(moveIntoHero()) observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();