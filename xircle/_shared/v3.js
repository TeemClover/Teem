/* XIRCLE × myClover XTY — Partner Experience v3 interactions */
(function(){
  "use strict";
  var REDUCED=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage=document.querySelector("[data-x-stage]");
  if(!stage)return;
  var progress=document.querySelector("[data-x-progress]");
  var scenes=[].slice.call(stage.querySelectorAll("[data-scene]"));
  var current=scenes.find(function(s){return s.classList.contains("is-active")})||scenes[0];
  if(current&&!current.classList.contains("is-active"))current.classList.add("is-active");
  var toast=document.querySelector("[data-toast]");

  function track(name,props){try{window.XAnalytics&&window.XAnalytics.track(name,props||{})}catch(e){}}
  function pctFor(scene){var p=parseInt(scene.getAttribute("data-progress")||"0",10);return isFinite(p)?p:0}
  function go(id){
    var next=stage.querySelector('[data-scene="'+id+'"]');
    if(!next||next===current)return;
    var prev=current;current=next;
    prev.classList.remove("is-active");
    if(!REDUCED){prev.classList.add("is-leaving");setTimeout(function(){prev.classList.remove("is-leaving")},380)}
    next.classList.add("is-active");
    if(progress)progress.style.width=pctFor(next)+"%";
    try{window.XState&&window.XState.setSession("scene",id)}catch(e){}
    window.scrollTo(0,0);
    var h=next.querySelector("h1,h2");if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
    track("xircle_scene_view",{scene:id});
    sceneEnter(id,next);
  }

  stage.addEventListener("click",function(e){
    var n=e.target.closest("[data-next]");if(n){go(n.getAttribute("data-next"));return}
    var choice=e.target.closest("[data-choice-group]");if(choice){handleChoice(choice)}
  });

  function handleChoice(btn){
    var group=btn.getAttribute("data-choice-group"),value=btn.getAttribute("data-value");
    var scene=btn.closest("[data-scene]");
    scene.querySelectorAll('[data-choice-group="'+group+'"]').forEach(function(b){b.setAttribute("aria-pressed",b===btn?"true":"false")});
    if(window.XState&&window.XState.memory)window.XState.memory[group]=value;
    var reveal=scene.querySelector("[data-reveal]");if(reveal)reveal.classList.remove("x-hidden");
    var next=scene.querySelector("[data-unlock-next]");if(next)next.disabled=false;

    if(group==="memoryGapChoice"){
      reveal&&setReveal(reveal,"แน่ใจ — หรือแค่จำได้?","Xircle เริ่มจากการทำให้สิ่งที่เกิดขึ้น มองเห็นย้อนหลังได้")
    }
    if(group==="sleep")animateMeter(scene,value==="full"?.88:value==="mid"?.62:.36,"sleep");
    if(group==="eat")animateMeter(scene,value==="balanced"?.82:value==="light"?.68:.46,"eat");
    if(group==="move")animateMeter(scene,value==="intentional"?.84:value==="walk"?.61:.31,"move");
    if(group==="adjust"){
      reveal&&setReveal(reveal,"หนึ่งอย่างพอ","ข้อมูลมีค่าตอนที่มันช่วยให้เรารู้ว่าควรทำอะไรต่อ")
      track("adjust_one_complete")
    }
  }

  function setReveal(el,title,body){el.innerHTML="<strong>"+title+"</strong><p>"+body+"</p>"}
  function animateMeter(scene,value,type){
    var meter=scene.querySelector("[data-meter]");if(meter)meter.style.setProperty("--fill",Math.round(value*100)+"%");
    var reveal=scene.querySelector("[data-reveal]");
    if(reveal){
      var copy=type==="sleep"?["เก็บไว้ก่อน ยังไม่ต้องตัดสิน","เรากำลังต่อภาพของเมื่อวานทีละชิ้น"]:type==="eat"?["มื้อนี้ไม่หายไปจากความจำแล้ว","การบันทึกช่วยให้ย้อนกลับมาดู Pattern ได้"]:["สิ่งเล็ก ๆ กำลังกลายเป็น Pattern","หนึ่งวันยังไม่ใช่คำตัดสิน แต่หลายวันทำให้เห็นทิศทาง"];
      setReveal(reveal,copy[0],copy[1]);
    }
  }

  function sceneEnter(id,scene){
    if(id==="S5")setTimeout(function(){if(current===scene)go("S6")},REDUCED?700:1900);
    if(id==="S6")buildHabitScore(scene);
    if(id==="S9")animateLoop(scene);
    if(id==="S10"){
      try{window.XState&&window.XState.completeJourney()}catch(e){}
      track("xircle_journey_complete")
    }
  }

  function buildHabitScore(scene){
    var mem=(window.XState&&window.XState.memory)||{};
    var values={eat:mem.eat==="balanced"?.82:mem.eat==="light"?.68:.46,move:mem.move==="intentional"?.84:mem.move==="walk"?.61:.31,sleep:mem.sleep==="full"?.88:mem.sleep==="mid"?.62:.36};
    if(!mem.eat)values.eat=.72;if(!mem.move)values.move=.58;if(!mem.sleep)values.sleep=.66;
    var score=Math.round((values.eat+values.move+values.sleep)/3*100);
    var out=scene.querySelector("[data-score]");if(out)countTo(out,score);
    var ring=scene.querySelector(".x-ring");if(ring)ring.style.filter="saturate("+(0.8+score/200)+")";
  }

  function countTo(el,target){
    if(REDUCED){el.textContent=target;return}
    var start=performance.now(),dur=700;
    function frame(now){var p=Math.min(1,(now-start)/dur);el.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)
  }

  function animateLoop(scene){
    var rows=[].slice.call(scene.querySelectorAll(".x-loop-row"));rows.forEach(function(r,i){r.style.opacity="0";r.style.transform="translateY(8px)";setTimeout(function(){r.style.transition=".45s";r.style.opacity="1";r.style.transform="none"},REDUCED?0:i*170)})
  }

  document.querySelectorAll("img[data-art-src]").forEach(function(img){
    var src=img.getAttribute("data-art-src");if(!src)return;img.onload=function(){img.hidden=false};img.onerror=function(){img.hidden=true};img.hidden=true;img.src=src;
  });

  document.querySelectorAll("[data-copy]").forEach(function(btn){btn.addEventListener("click",function(){var value=btn.getAttribute("data-copy")||"";navigator.clipboard&&navigator.clipboard.writeText(value).then(function(){showToast("คัดลอกแล้ว")})})});
  function showToast(msg){if(!toast)return;toast.textContent=msg;toast.classList.add("on");setTimeout(function(){toast.classList.remove("on")},1500)}

  try{
    if(window.XState){window.XState.touchVisit();var returning=window.XState.getLocal("journeyCompleted");document.querySelectorAll("[data-returning]").forEach(function(el){el.hidden=!returning})}
  }catch(e){}
  track("xircle_view",{v:3});
})();
