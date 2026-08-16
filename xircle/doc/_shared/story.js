/* Xircle deep-reference loader v6
   Keeps the proven legacy reference runtime intact as story-core.js, then layers
   the new Answer Engine / Experience bridge on top. */
(function(){
  'use strict';
  var core='/xircle/doc/_shared/story-core.js?v=20260816';
  var bridge='/xircle/doc/_shared/deep-bridge.js?v=1';
  if(document.readyState==='loading'){
    document.write('<script src="'+core+'"><\/script><script src="'+bridge+'"><\/script>');
    return;
  }
  function load(src,done){var s=document.createElement('script');s.src=src;s.onload=done||function(){};s.onerror=done||function(){};document.head.appendChild(s)}
  load(core,function(){load(bridge)});
})();
