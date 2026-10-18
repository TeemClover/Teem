/* AI ใส่ซอส · Course trailer engine (60 s, drawn in code at the display's frame rate).
   Built into /assets/classroom-trailer.js by tools/build-classroom-trailer.mjs — edit the sources
   in tools/classroom-trailer/, not the bundle.
   Scenes register with MC_TRAILER.defineScene({id,start,end,draw(ctx,s)}); s carries the clock,
   the stage size and the shared helpers. Every scene paints the full frame itself. */
(function(){
'use strict';
const TR=window.MC_TRAILER=window.MC_TRAILER||{};
const DURATION=60,BPM=120,BEAT=60/BPM;
const scenes=[];
TR.DURATION=DURATION;TR.BPM=BPM;TR.BEAT=BEAT;TR.scenes=scenes;
TR.defineScene=def=>{scenes.push(def);scenes.sort((a,b)=>a.start-b.start);};
TR.overlays=[];TR.defineOverlay=def=>{TR.overlays.push(def);};
// Custom instruments for the score: TR.instruments.name=(syn,t,...args)=>{...} using syn.osc/syn.noise/syn.bus.
TR.instruments={};

/* ── Helpers shared by every scene ───────────────────────── */
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const E={
 linear:x=>clamp(x),
 outCubic:x=>1-Math.pow(1-clamp(x),3),
 inCubic:x=>Math.pow(clamp(x),3),
 inOutCubic:x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;},
 outExpo:x=>{x=clamp(x);return x===1?1:1-Math.pow(2,-10*x);},
 inExpo:x=>{x=clamp(x);return x===0?0:Math.pow(2,10*x-10);},
 outBack:x=>{x=clamp(x);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);},
 outElastic:x=>{x=clamp(x);if(x===0||x===1)return x;return Math.pow(2,-10*x)*Math.sin((x*10-.75)*(TAU/3))+1;},
 inOutSine:x=>-(Math.cos(Math.PI*clamp(x))-1)/2,
};
// 0→1 over [a,a+fi], hold, 1→0 over [b-fo,b]
function env(t,a,b,fi=.35,fo=.3){if(t<a||t>b)return 0;const i=fi>0?clamp((t-a)/fi):1,o=fo>0?clamp((b-t)/fo):1;return Math.min(E.outCubic(i),E.inOutSine(o));}
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function hexA(hex,a){const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
// Storyboard palette. ember = heat only, mint = ✓ only, rose = the secret only, slate* = the opening grind only.
const PAL={green:'#0b2619',deep:'#06170f',deep2:'#06170f',void:'#04100a',gold:'#e2c27a',hot:'#f6dc9a',gold2:'#f6dc9a',cream:'#f4ecd8',leaf:'#1f5a3a',ember:'#e07a4f',mint:'#7fd6a4',rose:'#f2a07b',slate:'#1b2420',slate2:'#2a3530',slate3:'#8e9a95',paper:'#fbf8f1',ink:'#0a120d',white:'#ffffff',amber:'#d99a2b',red:'#c8402f'};
const LESSONS=[
 {n:1,name:'SOURCE',icon:'🫙',th:'ซอส',title:'ซอส .md ขวดแรก',loot:'ซอส .md ขวดแรก',color:'#e2a33b'},
 {n:2,name:'TASTE',icon:'🥄',th:'ชิม',title:'ชิมด้วยภาพ',loot:'ช้อนชิมภาพ',color:'#e86a5c'},
 {n:3,name:'COOK',icon:'🍳',th:'ผัด',title:'คลิปจากซอส',loot:'กระทะคลิปสั้น',color:'#f0c24b'},
 {n:4,name:'SPLIT',icon:'🍱',th:'แบ่ง',title:'ซอสเดียวหลายเมนู',loot:'ปิ่นโตหลายเมนู',color:'#5bb98c'},
 {n:5,name:'SEASON',icon:'🧂',th:'ปรุง',title:'คำสั่งลัด + Agent',loot:'ผงปรุงคำสั่งลัด',color:'#8f7cf0'},
 {n:6,name:'SERVE',icon:'🍽️',th:'เสิร์ฟ',title:'เว็บของคุณเอง',loot:'จานเสิร์ฟ HTML',color:'#4fb3e8'}
];
const THAI='"Noto Sans Thai","Sukhumvit Set","Thonburi",system-ui,sans-serif';
const FONT={head:'"Reel Kanit",'+THAI,round:'"Reel Mitr",'+THAI,tech:'"Reel Chakra",'+THAI,script:'"Reel Charm",'+THAI,hand:'"Reel Sriracha",'+THAI,emoji:'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'};
const WEIGHT={head:800,round:600,tech:700,script:700,hand:400};
TR.FONT_LOADS=['800 40px "Reel Kanit"','600 40px "Reel Mitr"','700 40px "Reel Chakra"','700 40px "Reel Charm"','400 40px "Reel Sriracha"'];

function fit(ctx,str,font,weight,size,maxW){ctx.font=`${weight} ${size}px ${font}`;const w=ctx.measureText(str).width;return w>maxW&&w>0?Math.max(8,Math.floor(size*maxW/w)):size;}
// Draws text; size shrinks to fit maxW. Returns {w,size}.
function text(ctx,str,x,y,o={}){
 const fam=o.family||'head',font=o.font||FONT[fam]||FONT.head,weight=o.weight||WEIGHT[fam]||800;
 let size=o.size||48;const maxW=o.maxW||Infinity;
 ctx.save();
 if('letterSpacing' in ctx)ctx.letterSpacing=(o.spacing||0)+'px';
 size=fit(ctx,str,font,weight,size,maxW);
 ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=o.align||'center';ctx.textBaseline=o.baseline||'middle';
 ctx.globalAlpha*=o.alpha??1;
 ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);if(o.scale&&o.scale!==1)ctx.scale(o.scale,o.scale);
 if(o.glow){ctx.shadowColor=o.glow;ctx.shadowBlur=o.glowBlur??size*.45;}
 if(o.shadow){ctx.shadowColor=o.shadow;ctx.shadowBlur=o.shadowBlur??size*.25;ctx.shadowOffsetY=o.shadowY??size*.08;}
 if(o.stroke){ctx.lineJoin='round';ctx.lineWidth=o.strokeWidth||size*.12;ctx.strokeStyle=o.stroke;ctx.strokeText(str,0,0);}
 if(o.gradient){const g=ctx.createLinearGradient(0,-size*.6,0,size*.6);o.gradient.forEach((c,i)=>g.addColorStop(i/(o.gradient.length-1),c));ctx.fillStyle=g;}else ctx.fillStyle=o.color||PAL.cream;
 ctx.fillText(str,0,0);
 const w=ctx.measureText(str).width;ctx.restore();return {w,size};
}
// Emoji are rendered once into 160 px sprites and drawn as images (consistent colour, cheap per frame).
const sprites=new Map();
function emojiSprite(ch){let c=sprites.get(ch);if(c)return c;c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d');g.font=`128px ${FONT.emoji}`;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,80,86);sprites.set(ch,c);return c;}
function emoji(ctx,ch,x,y,size,o={}){if(size<=0)return;ctx.save();ctx.globalAlpha*=o.alpha??1;ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);if(o.scale)ctx.scale(o.scale,o.scale);if(o.glow)glow(ctx,0,0,size*.9,o.glow,.6);const k=size/128*1.25;ctx.drawImage(emojiSprite(ch),-80*k,-80*k,160*k,160*k);ctx.restore();}
function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function card(ctx,x,y,w,h,o={}){ctx.save();ctx.globalAlpha*=o.alpha??1;if(o.shadow){ctx.shadowColor=o.shadow;ctx.shadowBlur=o.blur??24;ctx.shadowOffsetY=o.offY??10;}rr(ctx,x,y,w,h,o.r??16);ctx.fillStyle=o.fill||PAL.cream;ctx.fill();ctx.shadowColor='transparent';if(o.stroke){ctx.lineWidth=o.lw||2;ctx.strokeStyle=o.stroke;ctx.stroke();}ctx.restore();}
function bg(ctx,s,top,bottom,mid){const g=ctx.createLinearGradient(0,0,0,s.h);g.addColorStop(0,top);if(mid)g.addColorStop(.5,mid);g.addColorStop(1,bottom||top);ctx.fillStyle=g;ctx.fillRect(0,0,s.w,s.h);}
function radial(ctx,x,y,r,inner,outer){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);return g;}
function glow(ctx,x,y,r,color,alpha=1){if(r<=0||alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='lighter';ctx.fillStyle=radial(ctx,x,y,r,color,hexA('#000000',0));ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
function rays(ctx,x,y,r,count,rot,color,alpha=1,width=.12){ctx.save();ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='lighter';ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=radial(ctx,0,0,r,color,hexA('#000000',0));for(let i=0;i<count;i++){ctx.rotate(TAU/count);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r,-r*width);ctx.lineTo(r,r*width);ctx.closePath();ctx.fill();}ctx.restore();}
// Deterministic burst that started at time t0 (seconds, same clock as t).
function burst(ctx,t,t0,o){const age=t-t0;if(age<0||age>(o.life||1.6))return;const r=rng(o.seed||1),n=o.count||60,cols=o.colors||[PAL.gold,PAL.cream];const life=o.life||1.6;ctx.save();ctx.globalCompositeOperation=o.blend||'lighter';
 for(let i=0;i<n;i++){const a=r()*TAU,sp=(o.speed||400)*(0.35+r()*0.9),lf=life*(0.55+r()*0.45);if(age>lf)continue;const k=age/lf,dist=sp*age*(1-k*.45);const x=o.x+Math.cos(a)*dist,y=o.y+Math.sin(a)*dist+(o.gravity||0)*age*age;const sz=(o.size||5)*(1-k)*(0.5+r());ctx.globalAlpha=(1-k)*(o.alpha??1);ctx.fillStyle=cols[i%cols.length];if(o.shape==='line'){ctx.strokeStyle=cols[i%cols.length];ctx.lineWidth=sz*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*sz*4,y-Math.sin(a)*sz*4);ctx.stroke();}else{ctx.beginPath();ctx.arc(x,y,Math.max(.1,sz),0,TAU);ctx.fill();}}
 ctx.restore();}
// Ambient floating motes over the whole stage.
function dust(ctx,s,o={}){const r=rng(o.seed||7),n=o.count||50;ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const bx=r()*s.w,by=r()*s.h,sp=(o.speed||12)*(0.4+r()),ph=r()*TAU;const x=(bx+Math.sin(s.T*0.3+ph)*20+s.T*sp*(o.dx??0.4))%(s.w+40)-20,y=((by-s.T*sp)%(s.h+40)+s.h+40)%(s.h+40)-20;ctx.globalAlpha=(o.alpha??.5)*(0.3+0.7*Math.abs(Math.sin(s.T*.8+ph)));ctx.fillStyle=o.color||PAL.gold2;ctx.beginPath();ctx.arc(x,y,(o.size||1.6)*(0.5+r()),0,TAU);ctx.fill();}ctx.restore();}
function speedLines(ctx,s,o={}){const r=rng(o.seed||11),n=o.count||70,cx=o.x??s.w/2,cy=o.y??s.h/2,R=Math.hypot(s.w,s.h);ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=o.color||PAL.cream;for(let i=0;i<n;i++){const a=r()*TAU,ph=(r()+s.T*(o.speed||1.4))%1;const r0=R*(0.18+ph*0.7),len=R*(0.06+r()*0.12)*(o.len||1);ctx.globalAlpha=(o.alpha??.35)*(1-ph);ctx.lineWidth=(o.width||2)*(0.5+r());ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);ctx.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len));ctx.stroke();}ctx.restore();}
// Camera shake (skipped for reduced motion).
function shake(ctx,s,amount){if(s.reduced||amount<=0)return;const k=amount*s.u;ctx.translate(Math.sin(s.T*91.7)*k,Math.cos(s.T*77.3)*k*.8);}
// Full-frame flash, capped for photosensitivity and softened for reduced motion.
function flash(ctx,s,alpha,color='#ffffff'){alpha=clamp(alpha)*(s.reduced?.25:.85);if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(0,0,s.w,s.h);ctx.restore();}
function vignette(ctx,s,alpha=.55){const g=ctx.createRadialGradient(s.w/2,s.h/2,Math.min(s.w,s.h)*.35,s.w/2,s.h/2,Math.hypot(s.w,s.h)*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${alpha})`);ctx.fillStyle=g;ctx.fillRect(0,0,s.w,s.h);}
// Standard readable caption (storyboard TEXT spec). t is absolute; in/out are absolute seconds.
// Entrance 0.35 s (fade, 16 px rise, upward mask wipe); exit 0.3 s finishing at `out` (fade, 8 px drift).
// layout 'center' (default): 16:9 headline at 79%H / sub 87%H; 9:16 at 70% / 76%.
// layout 'column' (lessons): 16:9 left-aligned column x58–95%W, headline 47%H / sub 56%H, emoji chip inline;
// 9:16 falls back to centred 70% / 76% with the chip. accent: substring drawn in hot gold. Text never shakes:
// draw captions after resetting any WORLD transform (ctx.setTransform is restored by the engine per scene).
function caption(ctx,s,o){
 const T=s.T;if(T<o.in||T>o.out)return;
 const kin=E.outCubic((T-o.in)/.35),kout=clamp((o.out-T)/.3),alpha=Math.min(kin,E.inOutSine(kout));if(alpha<=0)return;
 const col=(o.layout==='column')&&!s.portrait;
 const head=o.size||s.type.head,subSize=o.subSize||s.type.sub;
 let x,hy,sy,align,maxW;
 if(col){x=s.w*.58;align='left';maxW=s.w*.37;hy=s.h*(o.hy??.47);sy=s.h*(o.sy??.56);}
 else{x=s.w/2;align='center';maxW=s.w*(s.portrait?.88:.80)*.88;hy=s.h*(o.hy??(s.portrait?.70:.79));sy=s.h*(o.sy??(s.portrait?.76:.87));}
 const chip=o.chip?head*1.3:0,gap=chip?head*.35:0;
 ctx.save();
 const fam='head',font=FONT.head,weight=800;
 let size=fit(ctx,o.text,font,weight,head,maxW-chip-gap);
 ctx.font=`${weight} ${size}px ${font}`;const tw=ctx.measureText(o.text).width;
 const blockW=Math.max(tw+chip+gap,o.sub?(()=>{ctx.font=`600 ${subSize}px ${FONT.round}`;return Math.min(maxW,ctx.measureText(o.sub).width);})():0);
 // soft scrim behind the block
 if(o.scrim!==false){const cx=col?x+blockW/2:x,cy=(hy+(o.sub?sy:hy))/2,rx=blockW*.62+s.u*6,ry=(o.sub?(sy-hy):0)/2+head*1.1;ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(6,23,15,.62)');g.addColorStop(.7,'rgba(6,23,15,.38)');g.addColorStop(1,'rgba(6,23,15,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();}
 const rise=(1-kin)*16+(1-kout)*-8;
 // headline with upward mask wipe
 ctx.save();ctx.globalAlpha=alpha;
 const band=size*1.6;ctx.beginPath();ctx.rect(0,hy-band/2+(1-kin)*band*.6,s.w,band);ctx.clip();
 let left=col?x:x-(tw+chip+gap)/2;
 if(chip){const cx=left+chip/2,cy=hy+rise;ctx.save();ctx.beginPath();ctx.arc(cx,cy,chip/2,0,TAU);ctx.fillStyle=PAL.green;ctx.fill();ctx.lineWidth=Math.max(1.5,chip*.07);ctx.strokeStyle=PAL.gold;ctx.stroke();ctx.restore();emoji(ctx,o.chip,cx,cy,chip*.58);left+=chip+gap;}
 ctx.font=`${weight} ${size}px ${font}`;ctx.textBaseline='middle';ctx.textAlign='left';
 const parts=o.accent&&o.text.includes(o.accent)?(()=>{const i=o.text.indexOf(o.accent);return [[o.text.slice(0,i),o.color||PAL.cream],[o.accent,PAL.hot],[o.text.slice(i+o.accent.length),o.color||PAL.cream]];})():[[o.text,o.color||PAL.cream]];
 if(o.glow){ctx.shadowColor=o.glow;ctx.shadowBlur=size*.35;}
 let px=left;for(const [str,c] of parts){if(!str)continue;ctx.fillStyle=c;ctx.fillText(str,px,hy+rise);px+=ctx.measureText(str).width;}
 ctx.restore();
 if(o.sub){const ks=E.outCubic((T-o.in-.05)/.3);const subA=Math.min(ks,E.inOutSine(kout))*.88;
  text(ctx,o.sub,col?x:x,sy+(1-ks)*16-(1-kout)*8,{size:subSize,family:'round',maxW,color:o.subColor||PAL.cream,alpha:subA,align:col?'left':'center'});}
 ctx.restore();
}
function jar(ctx,x,y,size,fill,o={}){
 const w=size*.62,h=size;ctx.save();ctx.translate(x,y);
 ctx.fillStyle=o.lid||PAL.gold;rr(ctx,-w*.42,-h*.58,w*.84,h*.14,size*.03);ctx.fill();
 ctx.fillStyle=hexA('#ffffff',.14);ctx.strokeStyle=hexA('#ffffff',.55);ctx.lineWidth=Math.max(1.5,size*.018);rr(ctx,-w/2,-h*.44,w,h*.9,size*.1);ctx.fill();ctx.stroke();
 ctx.save();rr(ctx,-w/2,-h*.44,w,h*.9,size*.1);ctx.clip();const fy=h*.46-h*.88*clamp(fill);const g=ctx.createLinearGradient(0,fy,0,h*.46);g.addColorStop(0,o.sauce2||'#f0b44c');g.addColorStop(1,o.sauce||'#b9561f');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-w,h);ctx.lineTo(-w,fy);for(let i=-w;i<=w;i+=w/8)ctx.lineTo(i,fy+Math.sin(i*.08+(o.wave||0))*size*.02);ctx.lineTo(w,h);ctx.fill();ctx.restore();
 if(o.label){card(ctx,-w*.36,-h*.02,w*.72,h*.24,{fill:PAL.cream,r:size*.04});text(ctx,o.label,0,h*.1,{size:size*.12,family:'tech',color:PAL.deep,maxW:w*.64});}
 ctx.restore();
}
function browserWin(ctx,x,y,w,h,o={}){card(ctx,x,y,w,h,{fill:o.fill||'#f4f6f5',r:Math.min(w,h)*.04,shadow:o.shadow??'rgba(0,0,0,.45)',blur:30,alpha:o.alpha});ctx.save();ctx.globalAlpha*=o.alpha??1;const bar=Math.min(h*.09,26);ctx.fillStyle='#dfe4e1';rr(ctx,x,y,w,bar,Math.min(w,h)*.04);ctx.fill();ctx.fillRect(x,y+bar*.5,w,bar*.5);['#e5675c','#e8b84a','#5bc27a'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+bar*.6+i*bar*.55,y+bar/2,bar*.17,0,TAU);ctx.fill();});if(o.url)text(ctx,o.url,x+w/2,y+bar/2,{size:bar*.42,family:'tech',color:'#6a756f',maxW:w*.55});ctx.restore();return {x,y:y+bar,w,h:h-bar};}
function phone(ctx,x,y,w,h,o={}){card(ctx,x,y,w,h,{fill:o.frame||'#111',r:w*.14,shadow:'rgba(0,0,0,.5)',blur:30,alpha:o.alpha});ctx.save();ctx.globalAlpha*=o.alpha??1;const p=w*.05;rr(ctx,x+p,y+p,w-2*p,h-2*p,w*.11);ctx.fillStyle=o.screen||'#000';ctx.fill();ctx.restore();return {x:x+p,y:y+p,w:w-2*p,h:h-2*p};}
function chatBubble(ctx,x,y,w,str,o={}){const size=o.size||16,h=size*2.1;card(ctx,x,y,w,h,{fill:o.fill||'#ffffff',r:h*.45,alpha:o.alpha,shadow:o.shadow});text(ctx,str,x+w/2,y+h/2,{size,family:o.family||'round',color:o.color||PAL.ink,maxW:w-size,alpha:o.alpha});}
function grainCanvas(){if(TR._grain)return TR._grain;const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d');const img=g.createImageData(192,192);const r=rng(99);for(let i=0;i<img.data.length;i+=4){const v=r()*255;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=18;}g.putImageData(img,0,0);TR._grain=c;return c;}
function grain(ctx,s,alpha=1){const c=grainCanvas();ctx.save();ctx.globalAlpha=alpha;const p=ctx.createPattern(c,'repeat');const ox=(Math.floor(s.T*24)*53)%192,oy=(Math.floor(s.T*24)*97)%192;ctx.translate(-ox,-oy);ctx.fillStyle=p;ctx.fillRect(ox,oy,s.w,s.h);ctx.restore();}
TR.H={TAU,clamp,lerp,E,env,rng,hexA,PAL,LESSONS,FONT,WEIGHT,fit,text,emoji,rr,card,bg,radial,glow,rays,burst,dust,speedLines,shake,flash,vignette,caption,jar,browserWin,phone,chatBubble,grain};

/* ── Frame rendering ─────────────────────────────────────── */
function stageInfo(w,h,T,reduced){
 const portrait=h>w*1.05,u=Math.min(w,h)/100;
 const head=u*(portrait?7.4:7),sub=u*(portrait?4.4:4);
 return {w,h,T,u,portrait,reduced,cx:w/2,cy:h/2,safeW:w*(portrait?.88:.82),gutter:w*(portrait?.06:.05),type:{head,sub,huge:head*1.9,small:head*.36},H:TR.H};
}
TR.render=function(ctx,w,h,T,o={}){
 T=clamp(T,0,DURATION-1e-4);
 const s=stageInfo(w,h,T,!!o.reduced);
 ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
 for(const sc of scenes){if(T>=sc.start&&T<sc.end){const t=T-sc.start,d=sc.end-sc.start;ctx.save();try{sc.draw(ctx,Object.assign({},s,{t,d,p:t/d,scene:sc}));}catch(err){if(!TR._warned){TR._warned=true;console.error('trailer scene',sc.id,err);}}ctx.restore();}}
 for(const ov of TR.overlays){if(T>=ov.start&&T<ov.end){ctx.save();try{ov.draw(ctx,s);}catch(err){if(!TR._warnedO){TR._warnedO=true;console.error('trailer overlay',ov.id,err);}}ctx.restore();}}
 grain(ctx,s,.6);
 ctx.restore();
};

/* ── Procedural soundtrack, scheduled on the audio clock ─── */
function Synth(ac){
 const master=ac.createGain();master.gain.value=0.9;
 const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
 const verb=ac.createConvolver();const len=Math.floor(ac.sampleRate*2.8),ir=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4);}verb.buffer=ir;
 const send=ac.createGain();send.gain.value=.28;
 const bus=ac.createGain();bus.connect(master);bus.connect(send);send.connect(verb);verb.connect(master);
 master.connect(comp);comp.connect(ac.destination);
 const live=new Set();
 const track=node=>{live.add(node);node.onended=()=>live.delete(node);return node;};
 const noiseBuf=(()=>{const b=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;})();
 const hz=m=>440*Math.pow(2,(m-69)/12);
 function env(g,t,a,d,peak,curve='exp'){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);if(curve==='exp')g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);else g.gain.linearRampToValueAtTime(0.0001,t+a+d);}
 function osc(t,midi,{type='sine',a=.005,d=.4,vol=.2,detune=0,glideTo=null,dest=bus,filter=null}={}){const o=track(ac.createOscillator()),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(hz(midi),t);if(glideTo!=null)o.frequency.exponentialRampToValueAtTime(hz(glideTo),t+a+d);o.detune.value=detune;let n=o;if(filter){const f=ac.createBiquadFilter();f.type=filter.type||'lowpass';f.frequency.setValueAtTime(filter.from||1200,t);if(filter.to)f.frequency.exponentialRampToValueAtTime(filter.to,t+a+d);f.Q.value=filter.q||1;o.connect(f);n=f;}n.connect(g).connect(dest);env(g,t,a,d,vol);o.start(t);o.stop(t+a+d+.05);}
 function noise(t,{dur=.3,vol=.2,type='highpass',from=4000,to=null,q=.7,attack=.002,curve='exp'}={}){const s=track(ac.createBufferSource()),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;f.type=type;f.frequency.setValueAtTime(from,t);if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);f.Q.value=q;s.connect(f).connect(g).connect(bus);env(g,t,attack,dur,vol,curve);s.start(t,Math.random());s.stop(t+dur+attack+.05);}
 const I={
  kick(t,v=.9){const o=track(ac.createOscillator()),g=ac.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.16);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.32);o.connect(g).connect(master);o.start(t);o.stop(t+.35);noise(t,{dur:.02,vol:.12*v,from:3000});},
  snare(t,v=.4){noise(t,{dur:.18,vol:v,type:'bandpass',from:1800,q:.8});osc(t,55,{type:'triangle',d:.1,vol:v*.4});},
  clap(t,v=.35){for(let i=0;i<3;i++)noise(t+i*.011,{dur:.08,vol:v*(i===2?1:.6),type:'bandpass',from:1400,q:1.2});noise(t+.03,{dur:.25,vol:v*.4,type:'bandpass',from:1200,q:.9});},
  hat(t,v=.08,open=false){noise(t,{dur:open?.22:.045,vol:v,from:8000});},
  bass(t,midi,dur=.45,v=.22){osc(t,midi,{type:'sawtooth',d:dur,vol:v,filter:{from:900,to:180,q:4}});osc(t,midi-12,{type:'sine',d:dur,vol:v*.8});},
  pluck(t,midi,v=.12){osc(t,midi,{type:'triangle',d:.35,vol:v});osc(t,midi+12,{type:'sine',d:.25,vol:v*.35});},
  arp(t,midi,v=.07){osc(t,midi,{type:'square',d:.16,vol:v,filter:{from:3200,to:900,q:2}});},
  bell(t,midi,v=.1){osc(t,midi,{type:'sine',d:1.6,vol:v});osc(t,midi+19,{type:'sine',d:.9,vol:v*.25});},
  pad(t,notes,dur,v=.05){for(const m of notes){osc(t,m,{type:'sawtooth',a:dur*.35,d:dur*.65,vol:v,detune:-7,filter:{from:500,to:1400,q:.5},});osc(t,m,{type:'sawtooth',a:dur*.35,d:dur*.65,vol:v,detune:7,filter:{from:500,to:1400,q:.5}});}},
  sub(t,midi,dur,v=.35){osc(t,midi,{type:'sine',a:.02,d:dur,vol:v});},
  riser(t,dur,v=.22){noise(t,{dur,vol:v,type:'bandpass',from:400,to:9000,q:1.4,attack:dur*.95,curve:'lin'});osc(t,48,{type:'sawtooth',a:dur*.95,d:.05,vol:v*.3,glideTo:84,filter:{from:600,to:5000}});},
  reverse(t,dur,v=.2){noise(t,{dur:.08,vol:v,from:3000,attack:dur});},
  whoosh(t,dur=.45,v=.28){noise(t,{dur,vol:v,type:'bandpass',from:600,to:5000,q:1.1,attack:dur*.45});},
  impact(t,v=.9){I.kick(t,v);osc(t,33,{type:'sine',a:.005,d:1.8,vol:v*.55,glideTo:24});noise(t,{dur:1.4,vol:v*.25,type:'lowpass',from:2400,to:200});noise(t,{dur:.9,vol:v*.12,from:5000});},
  boom(t,v=1){I.impact(t,v);osc(t,28,{type:'sine',a:.01,d:3.2,vol:v*.5});},
  drop(t,v=.4){osc(t,72,{type:'sine',a:.005,d:.7,vol:v,glideTo:36});},
  tick(t,v=.12){osc(t,96,{type:'square',d:.025,vol:v,filter:{type:'highpass',from:2000}});},
  heartbeat(t,v=.5){osc(t,38,{type:'sine',d:.18,vol:v,glideTo:30});osc(t+.22,38,{type:'sine',d:.16,vol:v*.7,glideTo:30});},
  shimmer(t,v=.07){[84,88,91,96].forEach((m,i)=>osc(t+i*.04,m,{type:'sine',a:.01,d:1.4,vol:v}));},
  sparkle(t,v=.06){[91,95,98].forEach((m,i)=>osc(t+i*.06,m,{type:'triangle',d:.25,vol:v}));},
  click(t,v=.15){noise(t,{dur:.012,vol:v,from:2500});},
  type(t,v=.08){noise(t,{dur:.02,vol:v,type:'bandpass',from:2600,q:2});},
  coin(t,v=.12){osc(t,83,{type:'square',d:.07,vol:v});osc(t+.07,88,{type:'square',d:.3,vol:v});},
 };
 return {ac,master,bus,I,hz,osc,noise,stopAll(){for(const n of live){try{n.stop();}catch{}}live.clear();},setMute(m){master.gain.setTargetAtTime(m?0:0.9,ac.currentTime,.03);}};
}
// The score is a list of timed events (seconds from the trailer start); scenes may add their own SFX.
TR.score=[];
TR.addCues=list=>{for(const c of list)TR.score.push(c);TR.score.sort((a,b)=>a.t-b.t);};
function playCue(syn,c,at){const args=c.args||[];const custom=TR.instruments[c.type];if(custom){try{custom(syn,at,...args);}catch(e){}return;}const f=syn.I[c.type];if(f)f(at,...args);}

/* ── Player ──────────────────────────────────────────────── */
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function fontsReady(){if(!document.fonts?.load)return Promise.resolve();return Promise.race([Promise.all(TR.FONT_LOADS.map(f=>document.fonts.load(f,'กขคไทยAa').catch(()=>null))),new Promise(r=>setTimeout(r,1800))]);}
TR.fontsReady=fontsReady;
class Player{
 constructor(canvas,o={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.o=o;this.T=o.poster??10.5;this.playing=false;this.muted=false;this.ended=false;
  this.raf=0;this.token=0;this.syn=null;this.base=0;this.cueIndex=0;this.listeners={};this.frames=0;
  this.resize=this.resize.bind(this);this.loop=this.loop.bind(this);
  if('ResizeObserver' in window){this.ro=new ResizeObserver(this.resize);this.ro.observe(canvas);}else addEventListener('resize',this.resize);
  this.resize();fontsReady().then(()=>this.draw());
 }
 on(ev,fn){(this.listeners[ev]||(this.listeners[ev]=[])).push(fn);return this;}
 emit(ev,v){(this.listeners[ev]||[]).forEach(fn=>fn(v));}
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;let dpr=Math.min(2,window.devicePixelRatio||1);const max=2560*1440;if(r.width*r.height*dpr*dpr>max)dpr=Math.sqrt(max/(r.width*r.height));const W=Math.round(r.width*dpr),Hh=Math.round(r.height*dpr);if(this.canvas.width!==W||this.canvas.height!==Hh){this.canvas.width=W;this.canvas.height=Hh;}this.dpr=dpr;this.cssW=r.width;this.cssH=r.height;this.draw();}
 draw(){if(!this.cssW)return;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);TR.render(this.ctx,this.cssW,this.cssH,this.T,{reduced:reducedMotion()});}
 now(){if(this.syn&&this.syn.ac.state==='running')return this.syn.ac.currentTime-this.base;return(performance.now()-this.perfBase)/1000;}
 ensureAudio(){if(this.syn||this.noAudio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this.noAudio=true;return;}try{this.syn=Synth(new AC({latencyHint:'interactive'}));this.syn.setMute(this.muted);}catch{this.noAudio=true;}}
 async play(from){
  if(from!=null){this.T=from;this.ended=false;}
  if(this.ended){this.T=0;this.ended=false;}
  // Freeze the target time and stop the old frame loop before any await, so a seek is never lost.
  const target=this.T,token=++this.token;cancelAnimationFrame(this.raf);this.playing=false;
  this.ensureAudio();
  // Never let a slow or blocked audio unlock hold the picture: wait at most 250 ms, then play anyway.
  if(this.syn){if(this.syn.ac.state!=='running')await Promise.race([this.syn.ac.resume().catch(()=>{}),new Promise(r=>setTimeout(r,250))]);if(token!==this.token)return;this.syn.stopAll();this.base=this.syn.ac.currentTime+.06-target;this.cueIndex=TR.score.findIndex(c=>c.t>=target-1e-6);if(this.cueIndex<0)this.cueIndex=TR.score.length;}
  this.T=target;this.perfBase=performance.now()-target*1000;
  this.playing=true;this.emit('state','playing');this.raf=requestAnimationFrame(this.loop);
 }
 pause(){this.token++;if(!this.playing)return;this.T=this.now();this.playing=false;cancelAnimationFrame(this.raf);if(this.syn){this.syn.stopAll();}this.emit('state','paused');this.draw();}
 toggle(){this.playing?this.pause():this.play();}
 seek(T){const was=this.playing;this.T=clamp(T,0,DURATION-.01);this.ended=false;if(was)this.play(this.T);else{this.draw();this.emit('time',this.T);}}
 setMuted(m){this.muted=m;this.syn?.setMute(m);this.emit('mute',m);}
 schedule(){if(!this.syn)return;const ac=this.syn.ac,horizon=this.now()+.35;while(this.cueIndex<TR.score.length&&TR.score[this.cueIndex].t<=horizon){const c=TR.score[this.cueIndex++];const at=this.base+c.t;if(at>=ac.currentTime-.02)playCue(this.syn,c,Math.max(at,ac.currentTime));}}
 loop(){
  if(!this.playing)return;
  this.T=this.now();this.schedule();
  if(this.T>=DURATION){this.T=DURATION-1e-3;this.draw();this.playing=false;this.ended=true;this.emit('state','ended');return;}
  this.draw();this.frames++;this.emit('time',this.T);
  this.raf=requestAnimationFrame(this.loop);
 }
 destroy(){this.pause();this.ro?.disconnect();try{this.syn?.ac.close();}catch{}this.syn=null;}
}
TR.Player=Player;TR.Synth=Synth;TR.playCue=playCue;

/* ── DOM: header player, end card and first-visit popup ─── */
const KEY='mc_classroom_trailer_v1';
function readState(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&typeof v==='object'?v:{};}catch{return {};}}
function writeState(patch){const v={...readState(),...patch};try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}return v;}
TR.readState=readState;TR.writeState=writeState;
const fmt=t=>{t=Math.max(0,Math.floor(t));return '0:'+String(t).padStart(2,'0');};
function chapters(){return (TR.chapters||[]).map(c=>c);}
function buildUI(host,copy){
 host.classList.add('trx');
 host.innerHTML=`<div class="trx-stage"><canvas class="trx-canvas" aria-hidden="true"></canvas>
 <button type="button" class="trx-big" aria-label="${copy.play}"><span class="trx-big-ico" aria-hidden="true">▶</span><span class="trx-big-tx">${copy.play}</span></button>
 <div class="trx-end" hidden><p class="trx-end-h">${copy.endHeadline}</p><div class="trx-end-row"><a class="trx-cta" href="/classroom/free-ai.html">${copy.primaryCta}</a><button type="button" class="trx-replay">${copy.secondaryCta}</button></div></div>
 <div class="trx-bar"><button type="button" class="trx-pp" aria-label="เล่น">▶</button><div class="trx-track" role="slider" tabindex="0" aria-label="ตำแหน่งวิดีโอ" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0"><i class="trx-fill"></i><span class="trx-chaps"></span></div><span class="trx-time">0:00</span><button type="button" class="trx-mute" aria-label="ปิดเสียง">🔊</button><button type="button" class="trx-fs" aria-label="เต็มจอ">⛶</button></div></div>
 <p class="trx-sr">${(TR.transcript||[]).map(l=>l.replace(/[<>&]/g,'')).join(' · ')}</p>`;
 const q=sel=>host.querySelector(sel);
 const chaps=q('.trx-chaps');chaps.innerHTML=chapters().map(c=>`<b style="left:${c.t/DURATION*100}%" title="${c.label}"><em>${c.icon}</em></b>`).join('');
 return q;
}
TR.mount=function(host,o={}){
 const copy=Object.assign({play:'▶ ดูก่อนเริ่ม · 60 วิ',endHeadline:'พร้อมทำซอสขวดแรกหรือยัง?',primaryCta:'เริ่มบท 1 ฟรี →',secondaryCta:'↺ ดูอีกครั้ง'},TR.copy||{});
 for(const [k,v] of Object.entries(o.copy||{}))if(v!=null)copy[k]=v;
 const q=buildUI(host,copy);
 const canvas=q('.trx-canvas'),big=q('.trx-big'),pp=q('.trx-pp'),fill=q('.trx-fill'),time=q('.trx-time'),track=q('.trx-track'),mute=q('.trx-mute'),fs=q('.trx-fs'),end=q('.trx-end');
 const player=new Player(canvas,{poster:o.poster});
 const setState=st=>{host.dataset.state=st;pp.textContent=st==='playing'?'❚❚':'▶';pp.setAttribute('aria-label',st==='playing'?'หยุดชั่วคราว':'เล่น');end.hidden=st!=='ended';big.hidden=st!=='idle';};
 setState('idle');
 let lastPct=-1;
 player.on('time',T=>{const pct=Math.round(T/DURATION*1000)/10;if(pct!==lastPct){lastPct=pct;fill.style.transform=`scaleX(${T/DURATION})`;time.textContent=fmt(T);track.setAttribute('aria-valuenow',String(Math.floor(T)));}});
 player.on('state',st=>{setState(st);if(st==='playing'){writeState({played:true,lastPlay:1});o.onPlay?.();}if(st==='ended'){writeState({completed:true});o.onEnd?.();q('.trx-cta')?.focus({preventScroll:true});}});
 player.on('mute',m=>{mute.textContent=m?'🔇':'🔊';mute.setAttribute('aria-label',m?'เปิดเสียง':'ปิดเสียง');});
 big.addEventListener('click',()=>player.play(0));
 pp.addEventListener('click',()=>{if(host.dataset.state==='idle')player.play(0);else player.toggle();});
 q('.trx-replay').addEventListener('click',()=>player.play(0));
 mute.addEventListener('click',()=>player.setMuted(!player.muted));
 canvas.addEventListener('click',()=>{if(host.dataset.state!=='idle'&&host.dataset.state!=='ended')player.toggle();});
 const seekAt=x=>{const r=track.getBoundingClientRect();player.seek(clamp((x-r.left)/r.width)*DURATION);if(host.dataset.state==='idle'){player.play();}};
 track.addEventListener('pointerdown',e=>{seekAt(e.clientX);const mv=ev=>seekAt(ev.clientX);const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);};addEventListener('pointermove',mv);addEventListener('pointerup',up);});
 track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){player.seek(player.T+5);e.preventDefault();}if(e.key==='ArrowLeft'){player.seek(player.T-5);e.preventDefault();}});
 fs.addEventListener('click',()=>{const el=host.querySelector('.trx-stage');if(document.fullscreenElement)document.exitFullscreen?.();else (el.requestFullscreen||el.webkitRequestFullscreen)?.call(el);});
 host.addEventListener('keydown',e=>{if(e.key===' '&&e.target===host){e.preventDefault();player.toggle();}});
 if('IntersectionObserver' in window){new IntersectionObserver(es=>{for(const en of es)if(!en.isIntersecting&&player.playing&&!o.keepPlaying)player.pause();},{threshold:.15}).observe(host);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.playing)player.pause();});
 host._player=player;return player;
};
TR.popup=function(dialog,o={}){
 const st=readState();
 if(st.played||(st.dismissed||0)>=2)return false;
 const host=dialog.querySelector('.trx-host');
 let player=null;
 const close=how=>{if(how==='skip'&&!readState().played)writeState({dismissed:(readState().dismissed||0)+1});player?.pause();dialog.close?.();dialog.removeAttribute('open');document.documentElement.classList.remove('trx-locked');o.onClose?.();};
 dialog.querySelector('.trx-skip')?.addEventListener('click',()=>close('skip'));
 dialog.addEventListener('cancel',e=>{e.preventDefault();close('skip');});
 dialog.addEventListener('click',e=>{if(e.target===dialog)close('skip');});
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 document.documentElement.classList.add('trx-locked');
 player=TR.mount(host,{keepPlaying:true,poster:o.poster,copy:o.copy,onEnd:()=>{dialog.classList.add('trx-done');}});
 dialog.querySelector('.trx-cta')?.addEventListener('click',()=>writeState({completed:true}));
 return player;
};
})();
