import '/assets/awaken-static-chapter.js?v=20260810-static1';

/* myclover · reliable expandable details on mobile WebViews */
(function(){
  var SELECTOR='details.fold';

  function reflow(details){
    requestAnimationFrame(function(){
      void details.offsetHeight;
      void document.documentElement.scrollHeight;
      window.dispatchEvent(new Event('resize'));
    });
  }

  function prepare(details){
    if(details.dataset.mcDetailsFixed==='1') return;
    details.dataset.mcDetailsFixed='1';
    details.style.setProperty('overflow','visible','important');
    details.style.setProperty('contain','none','important');

    var summary=details.firstElementChild;
    if(!summary || summary.tagName!=='SUMMARY') summary=details.querySelector('summary');
    if(!summary) return;

    summary.style.touchAction='manipulation';
    summary.setAttribute('aria-expanded',details.open?'true':'false');

    summary.addEventListener('click',function(event){
      event.preventDefault();
      var opening=!details.open;

      if(opening){
        details.querySelectorAll('img[loading="lazy"]').forEach(function(img){
          img.loading='eager';
          if(!img.complete){
            img.addEventListener('load',function(){reflow(details)},{once:true});
            img.addEventListener('error',function(){reflow(details)},{once:true});
          }
        });
      }

      details.open=opening;
      summary.setAttribute('aria-expanded',opening?'true':'false');
      reflow(details);
    },{passive:false});

    details.addEventListener('toggle',function(){
      summary.setAttribute('aria-expanded',details.open?'true':'false');
      reflow(details);
    });
  }

  function boot(root){
    if(root && root.matches && root.matches(SELECTOR)) prepare(root);
    (root||document).querySelectorAll(SELECTOR).forEach(prepare);
  }

  boot(document);

  if(window.MutationObserver){
    new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType===1) boot(node);
        });
      });
    }).observe(document.body,{childList:true,subtree:true});
  }
})();
