/* myClover · card Platinum Trophy compatibility
   The saved secret title stays GLHF so old saves keep working.
   On /card/ it is presented as the final PLATINUM TROPHY tag.
*/
(function(){
'use strict';
if(!/^\/card\/?(?:index\.html)?$/.test(location.pathname)) return;

/* The card renderer is an inline closure. Patch only the two canvas primitives it uses
   so its existing GLHF secret slot measures and draws as PLATINUM TROPHY without
   duplicating the entire card renderer. */
try{
  const proto=CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype;
  if(proto && !proto.__mcPlatinumPatched){
    proto.__mcPlatinumPatched=true;
    const oldMeasure=proto.measureText;
    const oldFill=proto.fillText;
    proto.measureText=function(text){
      return oldMeasure.call(this, String(text)==='GLHF' ? 'PLATINUM TROPHY' : text);
    };
    proto.fillText=function(text,x,y,maxWidth){
      let out=text;
      if(String(text)==='GLHF') out='PLATINUM TROPHY';
      else if(String(text)==='👊🏻') out='🍀';
      return arguments.length>3 ? oldFill.call(this,out,x,y,maxWidth) : oldFill.call(this,out,x,y);
    };
  }
}catch(e){}

function paintDOM(){
  document.querySelectorAll('.bd').forEach(function(row){
    const name=row.querySelector('.tx b');
    if(!name || name.textContent.trim()!=='GLHF') return;
    name.textContent='PLATINUM TROPHY';
    const icon=row.querySelector('.ic');
    if(icon) icon.textContent='🍀';
    const small=row.querySelector('.tx small');
    if(small && /อยู่บนการ์ด/.test(small.textContent)) small.textContent='Platinum Trophy อยู่บนการ์ดเข็มทิศของคุณแล้ว';
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',paintDOM,{once:true});
else paintDOM();
new MutationObserver(paintDOM).observe(document.documentElement,{childList:true,subtree:true});
})();