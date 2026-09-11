/* Keep the original lesson from painting while its inline learning UI is prepared.
   Opacity preserves layout for diagrams, tooltips and native scroll restoration. */
(function(){
'use strict';
const root=document.documentElement;
root.dataset.classroomRender='loading';
const style=document.createElement('style');
style.id='classroom-render-style';
style.textContent='html[data-classroom-render="loading"] body{opacity:0!important;pointer-events:none!important}';
document.head.appendChild(style);
const blockFocus=event=>{if(event.key==='Tab')event.preventDefault();};
document.addEventListener('keydown',blockFocus,true);
let finished=false;
let safety=0;
function reveal(state){
 if(finished)return;
 finished=true;
 clearTimeout(safety);
 document.removeEventListener('readystatechange',armSafety);
 root.dataset.classroomRender=state;
 document.removeEventListener('keydown',blockFocus,true);
 document.dispatchEvent(new Event('classroom:ready'));
}
// Only an initialization failure escape hatch. Do not reveal a partly downloaded
// document on a slow connection; successful loading never waits for this timer.
function armSafety(){
 if(document.readyState==='loading'||finished)return;
 document.removeEventListener('readystatechange',armSafety);
 safety=setTimeout(()=>reveal('fallback'),5000);
}
document.addEventListener('readystatechange',armSafety);
armSafety();
window.MC_CLASSROOM_RENDER={
 finish(){
  // Flush queued DOM observers and their frame work before the first visible frame.
  requestAnimationFrame(()=>requestAnimationFrame(()=>reveal('ready')));
 },
 fail(){reveal('fallback');}
};
})();
