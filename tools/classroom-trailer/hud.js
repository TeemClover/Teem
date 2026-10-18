/* Quest HUD (storyboard: born 8.0, live 10.0–34.0). Six reward slots, a gap, a fogged 7th slot with a
   padlock (the secret seed), a 2 px gold XP line and a chef hat with up to 5 pips. Never shakes; scenes
   can read MC_TRAILER.hudRect(s) to aim loot at a slot. Loot lands at each lesson's start + 3.0 s. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H,{clamp,E,PAL,LESSONS}=H;
const BORN=8,END=34,LOOT=[13,17,21,25,29,33],LESSON_START=[10,14,18,22,26,30];
TR.hudLootTimes=LOOT;TR.hudLessonStarts=LESSON_START;
function rect(s){const w=s.portrait?s.w*.84:s.w*.42,cy=s.portrait?s.h*.05:s.h*.06;const slot=Math.min(w/9.4,s.u*(s.portrait?8.5:6.4));return {x:(s.w-w)/2,y:cy-slot/2,w,h:slot,cy,slot};}
// Centre of slot i (0–5), the secret slot (6) or the hat (7).
TR.hudRect=(s,i)=>{const r=rect(s),step=r.slot*1.18;const total=step*6+r.slot*.55+step+r.slot*1.25;const left=s.w/2-total/2;let x;if(i<6)x=left+step*i+r.slot/2;else if(i===6)x=left+step*6+r.slot*.55+r.slot/2;else x=left+step*7+r.slot*.55+r.slot*.62;return {x,y:r.cy,size:r.slot};};
TR.defineOverlay({id:'hud',start:BORN,end:END,draw(ctx,s){
 const T=s.T,r=rect(s);
 const enter=E.outCubic((T-BORN)/.3),exit=1-E.inCubic((T-(END-.35))/.35);
 const a=Math.min(enter,exit);if(a<=0)return;
 const overload=T>=33&&T<34?E.outBack(clamp((T-33)/.25))*(1-clamp((T-33.7)/.3)):0;
 ctx.save();ctx.globalAlpha=a;ctx.translate(0,-(1-enter)*r.slot*1.6);
 const cx=s.w/2;ctx.translate(cx,r.cy);ctx.scale(1+.15*overload,1+.15*overload);ctx.translate(-cx,-r.cy);
 const done=LOOT.filter(t=>T>=t).length;
 // rail backing
 const a0=TR.hudRect(s,0),a7=TR.hudRect(s,7);
 H.card(ctx,a0.x-r.slot*.75,r.cy-r.slot*.82,a7.x-a0.x+r.slot*1.5,r.slot*1.9,{fill:'rgba(4,16,10,.55)',r:r.slot*.6,stroke:'rgba(226,194,122,.22)',lw:1});
 for(let i=0;i<6;i++){
  const p=TR.hudRect(s,i),sz=p.size,filled=T>=LOOT[i],active=T>=LESSON_START[i]&&T<LESSON_START[i]+4;
  const land=filled?E.outBack(clamp((T-LOOT[i])/.3)):0;
  const breathe=active&&!filled?.5+.5*Math.sin((T-LESSON_START[i])*Math.PI*2):0;
  ctx.save();
  H.rr(ctx,p.x-sz/2,p.y-sz/2,sz,sz,sz*.28);
  ctx.fillStyle=filled?'rgba(226,194,122,.18)':'rgba(255,255,255,.04)';ctx.fill();
  ctx.lineWidth=Math.max(1,sz*.05);ctx.strokeStyle=filled?PAL.gold:active?`rgba(246,220,154,${.35+.5*breathe})`:'rgba(244,236,216,.22)';ctx.stroke();
  if(active&&!filled)H.glow(ctx,p.x,p.y,sz*.9,PAL.gold,.25*breathe);
  if(filled){H.emoji(ctx,LESSONS[i].icon,p.x,p.y,sz*.62*(0.6+.4*land));if(T-LOOT[i]<.6)H.glow(ctx,p.x,p.y,sz*1.4,PAL.hot,.6*(1-(T-LOOT[i])/.6));}
  else if(T>=9.5){H.emoji(ctx,LESSONS[i].icon,p.x,p.y,sz*.5,{alpha:.18});}
  ctx.restore();
 }
 // secret slot in drifting fog with a padlock silhouette
 const sp=TR.hudRect(s,6),ss=sp.size;
 ctx.save();H.rr(ctx,sp.x-ss/2,sp.y-ss/2,ss,ss,ss*.28);ctx.setLineDash([ss*.12,ss*.1]);ctx.lineWidth=Math.max(1,ss*.04);ctx.strokeStyle='rgba(244,236,216,.25)';ctx.stroke();ctx.setLineDash([]);
 for(let k=0;k<5;k++){const fx=sp.x+Math.sin(T*.7+k*1.7)*ss*.35,fy=sp.y+Math.cos(T*.5+k)*ss*.2;H.glow(ctx,fx,fy,ss*.55,'#9fb3a8',.12);}
 const glint=T>=9&&T<9.3?Math.sin((T-9)/.3*Math.PI):0;
 ctx.globalAlpha*=.35+.5*glint;ctx.strokeStyle=glint>0?PAL.rose:'#cfd8d2';ctx.lineWidth=Math.max(1,ss*.07);
 ctx.beginPath();ctx.arc(sp.x,sp.y-ss*.08,ss*.14,Math.PI,0);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;H.rr(ctx,sp.x-ss*.2,sp.y-ss*.08,ss*.4,ss*.3,ss*.06);ctx.fill();
 if(glint>0)H.glow(ctx,sp.x,sp.y,ss*1.2,PAL.rose,.5*glint);
 ctx.restore();
 // XP line
 const xl=a0.x-r.slot/2,xr=TR.hudRect(s,5).x+r.slot/2,xy=r.cy+r.slot*.72;
 let xp=0;for(let i=0;i<6;i++){if(T>=LOOT[i])xp=i+E.outBack(clamp((T-LOOT[i])/.35));}xp=Math.min(6,xp)/6;
 ctx.fillStyle='rgba(244,236,216,.15)';ctx.fillRect(xl,xy,xr-xl,2);
 ctx.fillStyle=PAL.gold;ctx.fillRect(xl,xy,(xr-xl)*xp,2);
 if(overload>0){H.glow(ctx,(xl+xr)/2,xy,(xr-xl)*.6,PAL.hot,.45*overload);}
 // chef hat + pips
 const hp=TR.hudRect(s,7),hs=hp.size;
 ctx.save();ctx.fillStyle=PAL.cream;ctx.globalAlpha*=.92;
 ctx.beginPath();ctx.arc(hp.x-hs*.18,hp.y-hs*.08,hs*.2,0,Math.PI*2);ctx.arc(hp.x+hs*.18,hp.y-hs*.08,hs*.2,0,Math.PI*2);ctx.arc(hp.x,hp.y-hs*.22,hs*.24,0,Math.PI*2);ctx.fill();
 H.rr(ctx,hp.x-hs*.28,hp.y-hs*.02,hs*.56,hs*.28,hs*.05);ctx.fill();ctx.restore();
 const pips=Math.min(5,done);
 for(let k=0;k<5;k++){const on=k<pips||(overload>0&&T>=33+k*.12);ctx.beginPath();ctx.arc(hp.x-hs*.32+k*hs*.16,hp.y+hs*.48,hs*.055,0,Math.PI*2);ctx.fillStyle=on?PAL.hot:'rgba(244,236,216,.25)';ctx.fill();}
 ctx.restore();
}});
})();
