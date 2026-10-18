/* Page wiring for /classroom: header player, a "watch" link in the hero, and the first-visit popup.
   The popup opens only until the visitor has played the trailer once (or skipped it twice);
   ?trailer=1 forces it, ?trailer=0 suppresses it. */
(function(){
'use strict';
const TR=window.MC_TRAILER;if(!TR)return;
function start(){
 const host=document.getElementById('classroomTrailer');
 let header=null;
 const pop=document.getElementById('trailerPop');
 const popCopy={play:(TR.popupCopy&&TR.popupCopy.play)||undefined};
 // On phones the header box is too small for the captions, so play opens the full-screen portrait player.
 const small=()=>innerWidth<640&&!!pop;
 const openFull=from=>{TR.openPopup(pop,{poster:TR.poster,copy:popCopy,autoplay:true,from:from||0,onClose:()=>{host?._player?.draw();}});return true;};
 if(host&&!host._player)header=TR.mount(host,{poster:TR.poster,copy:{play:(TR.headerCopy&&TR.headerCopy.play)||undefined},intercept:()=>small()&&openFull(),onFullscreen:from=>openFull(from),preferDialog:small});
 document.querySelectorAll('[data-trailer-play]').forEach(btn=>btn.addEventListener('click',e=>{
  e.preventDefault();if(small()){openFull();return;}if(!host||!header)return;
  const lenis=window.cloverMotion?.lenis;
  if(lenis)lenis.scrollTo(host,{offset:-80,duration:.9});else host.scrollIntoView({behavior:'smooth',block:'center'});
  header.play(0);
 }));
 if(!pop)return;
 const q=new URLSearchParams(location.search);
 if(q.get('trailer')==='0')return;
 if(q.get('trailer')==='1')TR.writeState({played:false,dismissed:0});
 // Without storage the popup could never remember a visit, so it only opens when storage works.
 try{localStorage.setItem('mc_trailer_probe','1');localStorage.removeItem('mc_trailer_probe');}catch{return;}
 const st=TR.readState();
 if(st.played||(st.dismissed||0)>=2)return;
 // Let the page paint first so the course is visible behind the dialog.
 setTimeout(()=>{if(document.querySelector('dialog[open]:not(#trailerPop)'))return;TR.popup(pop,{poster:TR.poster,copy:popCopy,onClose:()=>{host?._player?.draw();}});},450);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
