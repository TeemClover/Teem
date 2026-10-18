/* s12_start (52–56) + s13_endcard (56–60): DROP 2 and the brand lock.
   52.0 hard cut from black: flash, the glowing jar slams onto a gold pedestal, five reward coins and the
   agent orb whip into a tilted orbit, 16 god rays turn, confetti fountains fire at 52 and 54, a gold
   capsule draws around the headline like a button and a cursor taps it at 55.5. At 56 the jar becomes the
   myClover clover (four heart leaves, one 360° turn, spark ring), the six rewards orbit slowly and every
   motion eases to rest by 59.7 so the HTML end card can take over the held frame. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H,{TAU,clamp,lerp,E,PAL,LESSONS}=H;
const DEG=Math.PI/180;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const beatBump=(T,from,k=9)=>T<from?0:Math.exp(-((T-from)%.5)*k);

/* ── Layout ─────────────────────────────────────────────── */
function jarLayout(s){return s.portrait?{x:s.w*.5,y:s.h*.34,size:30*s.u}:{x:s.w*.5,y:s.h*.38,size:24*s.u};}
function cloverLayout(s){return s.portrait?{x:s.w*.5,y:s.h*.26,r:20*s.u}:{x:s.w*.5,y:s.h*.30,r:14*s.u};}

/* ── Shared world pieces ────────────────────────────────── */
function world(ctx,s,cx,cy,heat){
 ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);
 const R=Math.hypot(s.w,s.h)*.62;
 const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
 g.addColorStop(0,'#1d5a3a');g.addColorStop(.28,PAL.green);g.addColorStop(.7,PAL.deep);g.addColorStop(1,PAL.void);
 ctx.fillStyle=g;ctx.fillRect(0,0,s.w,s.h);
 H.glow(ctx,cx,cy,Math.min(s.w,s.h)*.62,PAL.gold,.16+.1*heat);
}
// Rotation of the god rays: 8°/s from 52, easing to ~2°/s in the outro (continuous at 56).
function rayAngle(Te){return Te<56?(Te-52)*8*DEG:32*DEG+(Te-56)*2.5*DEG;}
function godRays(ctx,s,cx,cy,Te,alpha){
 const R=Math.hypot(s.w,s.h)*.75,a=rayAngle(Te);
 H.rays(ctx,cx,cy,R,16,a,PAL.gold,.24*alpha,.075);
 H.rays(ctx,cx,cy,R*.7,8,-a*.6+.2,PAL.hot,.16*alpha,.05);
}
// Confetti fountains: gold squares and tiny clover leaves, fully deterministic in (T - t0).
function confetti(ctx,s,T,t0,seed,alphaMul=1,boost=0){
 const age=T-t0;if(age<0||age>3.4||alphaMul<=0)return;
 const r=H.rng(seed),u=s.u;
 const srcs=s.portrait?[[s.w*.12,s.h*1.02,-.18],[s.w*.5,s.h*1.03,0],[s.w*.88,s.h*1.02,.18]]:[[-s.w*.01,s.h*1.02,.55+.17*boost],[s.w*1.01,s.h*1.02,-.55-.17*boost]];
 const per=s.portrait?60:90;
 const buckets={sq0:new Path2D(),sq1:new Path2D(),sq2:new Path2D(),leaf:new Path2D()};
 const k=2.1,g=s.h*.95;
 const ky=s.h*(s.portrait?.73:.83),kh=s.h*(s.portrait?.075:.085),kx=s.w*(s.portrait?.38:.24);
 for(const [sx,sy,lean] of srcs){
  for(let i=0;i<per;i++){
   const delay=r()*.32,life=2.0+r()*1.1,spd=s.h*(1.25+r()*1.05)*(s.portrait?1.05:1+.14*boost),spread=(r()-.5)*(s.portrait?.62:.42);
   const ph=r()*TAU,spin=(r()-.5)*14,fl=5+r()*7,sz=u*(.75+r()*.75),kind=r();
   const a=age-delay;if(a<=0||a>life)continue;
   const ang=-Math.PI/2+lean+spread;
   const vx=Math.cos(ang)*spd,vy=Math.sin(ang)*spd;
   const dr=(1-Math.exp(-k*a))/k;
   const x=sx+vx*dr+Math.sin(a*3.1+ph)*u*1.6;
   const y=sy+(vy+g/k)*dr-g*a/k;
   if(y<-20||x<-20||x>s.w+20)continue;
   const fade=1-smooth((a-(life-.45))/.45);
   // keep the caption block clean: confetti shrinks away as it crosses the text band
   const ox=Math.abs(x-s.w/2)-kx,oy=Math.abs(y-ky)-kh,out=Math.max(ox,oy);
   const keep=out>0?.25+.75*smooth(out/(u*5)):.25*(1+out/(u*20));
   const size=sz*fade*keep;if(size<.3)continue;
   const rot=ph+a*spin;
   if(kind<.24){
    const p=buckets.leaf,lr=size*.55;
    for(let q=0;q<3;q++){const qa=rot+q*TAU/3,lx=x+Math.cos(qa)*lr*.8,ly=y+Math.sin(qa)*lr*.8;p.moveTo(lx+lr,ly);p.arc(lx,ly,lr,0,TAU);}
   }else{
    const p=kind<.55?buckets.sq0:kind<.8?buckets.sq1:buckets.sq2;
    const hx=size,hy=size*.62*Math.abs(Math.cos(a*fl+ph)),c=Math.cos(rot),sn=Math.sin(rot);
    p.moveTo(x+c*hx-sn*hy,y+sn*hx+c*hy);p.lineTo(x-c*hx-sn*hy,y-sn*hx+c*hy);p.lineTo(x-c*hx+sn*hy,y-sn*hx-c*hy);p.lineTo(x+c*hx+sn*hy,y+sn*hx-c*hy);p.closePath();
   }
  }
 }
 ctx.save();ctx.globalAlpha*=alphaMul;
 ctx.fillStyle=PAL.gold;ctx.fill(buckets.sq0);
 ctx.fillStyle=PAL.hot;ctx.fill(buckets.sq1);
 ctx.fillStyle=PAL.cream;ctx.fill(buckets.sq2);
 ctx.fillStyle='#2f7a50';ctx.fill(buckets.leaf);ctx.lineWidth=Math.max(.8,u*.12);ctx.strokeStyle=PAL.gold;ctx.stroke(buckets.leaf);
 ctx.restore();
}
// Vector Markdown mark (M + ↓) on a cream label.
function mdLabel(ctx,size){
 const w=size*.62,h=size,cw=w*.62,ch=h*.2,y0=h*.1;
 H.card(ctx,-cw/2,y0-ch/2,cw,ch,{fill:PAL.cream,r:size*.035});
 ctx.save();ctx.strokeStyle=PAL.deep;ctx.lineWidth=Math.max(1.2,size*.03);ctx.lineJoin='round';ctx.lineCap='round';
 const m=ch*.26;
 ctx.beginPath();ctx.moveTo(-cw*.3,y0+m);ctx.lineTo(-cw*.3,y0-m);ctx.lineTo(-cw*.13,y0);ctx.lineTo(cw*.04,y0-m);ctx.lineTo(cw*.04,y0+m);
 ctx.moveTo(cw*.24,y0-m);ctx.lineTo(cw*.24,y0+m);ctx.moveTo(cw*.13,y0+m*.15);ctx.lineTo(cw*.24,y0+m);ctx.lineTo(cw*.35,y0+m*.15);ctx.stroke();
 ctx.restore();
}
// The hero jar with inner light; drawn centred at (x,y) (body centre), height size.
function heroJar(ctx,T,x,y,size,o={}){
 const bump=o.bump||0;
 H.glow(ctx,x,y,size*1.25,PAL.gold,.55*(o.glow??1));
 ctx.save();ctx.translate(x,y+size*.46);ctx.scale(o.sx||1,o.sy||1);ctx.translate(0,-size*.46);
 H.jar(ctx,0,0,size,.7+.05*bump+.02*Math.sin(T*3.1),{wave:T*5.2+bump*4,sauce2:'#f6c25a',sauce:'#c0641f'});
 mdLabel(ctx,size);
 // glass highlight
 ctx.save();ctx.globalAlpha*=.5;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1.5,size*.025);ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-size*.22,-size*.33);ctx.lineTo(-size*.22,-size*.08);ctx.stroke();ctx.restore();
 ctx.restore();
 H.glow(ctx,x,y+size*.12,size*.5,PAL.hot,.28*(o.glow??1));
}
function pedestal(ctx,x,y,w,h,alpha=1){
 ctx.save();ctx.globalAlpha*=alpha;
 const g=ctx.createLinearGradient(0,y,0,y+h*1.6);g.addColorStop(0,'#a9853c');g.addColorStop(1,'#3d2e12');
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y+h*.9,w/2,h*.5,0,0,Math.PI);ctx.lineTo(x-w/2,y);ctx.ellipse(x,y,w/2,h*.5,0,Math.PI,0,true);ctx.closePath();ctx.fill();
 const t=ctx.createLinearGradient(x-w/2,0,x+w/2,0);t.addColorStop(0,PAL.gold);t.addColorStop(.5,PAL.hot);t.addColorStop(1,PAL.gold);
 ctx.fillStyle=t;ctx.beginPath();ctx.ellipse(x,y,w/2,h*.5,0,0,TAU);ctx.fill();
 ctx.fillStyle=hexA0('#0b2619',.35);ctx.beginPath();ctx.ellipse(x,y,w*.4,h*.36,0,0,TAU);ctx.fill();
 ctx.restore();
 H.glow(ctx,x,y,w*.75,PAL.gold,.35*alpha);
}
const hexA0=H.hexA;
function coin(ctx,x,y,R,icon,alpha,ring){
 ctx.save();ctx.globalAlpha*=alpha;
 const g=ctx.createRadialGradient(x-R*.35,y-R*.4,R*.1,x,y,R);g.addColorStop(0,PAL.hot);g.addColorStop(.6,PAL.gold);g.addColorStop(1,'#8a6a2a');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();
 ctx.fillStyle=PAL.green;ctx.beginPath();ctx.arc(x,y,R*.78,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(1,R*.08);ctx.strokeStyle=ring||PAL.gold;ctx.globalAlpha*=.8;ctx.beginPath();ctx.arc(x,y,R*.78,0,TAU);ctx.stroke();
 ctx.restore();
 H.emoji(ctx,icon,x,y+R*.02,R*1.05,{alpha});
}
function agentOrb(ctx,T,x,y,R,alpha){
 H.glow(ctx,x,y,R*2.2,'#8f7cf0',.5*alpha);
 ctx.save();ctx.globalAlpha*=alpha;
 const g=ctx.createRadialGradient(x-R*.35,y-R*.35,R*.08,x,y,R);g.addColorStop(0,'#f1edff');g.addColorStop(.45,'#a998f6');g.addColorStop(1,'#3a2c86');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();
 ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,R*.09);ctx.beginPath();ctx.ellipse(x,y,R*1.45,R*.42,-.35+T*.8,0,TAU);ctx.stroke();
 // two small "eyes": the agent is awake
 ctx.fillStyle=PAL.deep;const blink=Math.abs(Math.sin(T*1.3))>.97?.25:1;
 ctx.beginPath();ctx.ellipse(x-R*.28,y-R*.02,R*.1,R*.16*blink,0,0,TAU);ctx.ellipse(x+R*.28,y-R*.02,R*.1,R*.16*blink,0,0,TAU);ctx.fill();
 ctx.restore();
}
// Positions on a tilted ellipse; depth = sin(θ) (1 = nearest).
function orbitPts(n,cx,cy,rx,ry,tilt,phase){
 const out=[],c=Math.cos(tilt),sn=Math.sin(tilt);
 for(let i=0;i<n;i++){const th=phase+i*TAU/n,ex=Math.cos(th)*rx,ey=Math.sin(th)*ry;out.push({i,th,x:cx+ex*c-ey*sn,y:cy+ex*sn+ey*c,depth:Math.sin(th)});}
 return out;
}
function trail(ctx,cx,cy,rx,ry,tilt,th,len,width,color,alpha){
 if(len<=.02||alpha<=0)return;
 const c=Math.cos(tilt),sn=Math.sin(tilt),N=10;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=color;ctx.lineCap='round';
 let px=null,py=null;
 for(let k=0;k<=N;k++){const a=th-len*k/N,ex=Math.cos(a)*rx,ey=Math.sin(a)*ry,x=cx+ex*c-ey*sn,y=cy+ex*sn+ey*c;
  if(px!==null){ctx.globalAlpha=alpha*(1-k/N);ctx.lineWidth=width*(1-k/N*.8);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();}px=x;py=y;}
 ctx.restore();
}
function cursorArrow(ctx,x,y,size,alpha,press){
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(press,press);ctx.rotate(-.12);
 const k=size;
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,k*1.0);ctx.lineTo(k*.26,k*.76);ctx.lineTo(k*.44,k*1.12);ctx.lineTo(k*.6,k*1.04);ctx.lineTo(k*.42,k*.68);ctx.lineTo(k*.76,k*.66);ctx.closePath();
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.save();ctx.translate(k*.06,k*.08);ctx.fill();ctx.restore();
 ctx.fillStyle=PAL.paper;ctx.fill();ctx.lineJoin='round';ctx.lineWidth=Math.max(1.2,k*.07);ctx.strokeStyle=PAL.ink;ctx.stroke();
 ctx.restore();
}

/* ── Caption geometry (mirrors H.caption's centred layout so the capsule hugs the headline) ── */
function capGeom(ctx,s,text,hyF){
 const head=s.type.head,maxW=s.w*(s.portrait?.88:.80)*.88;
 ctx.save();const size=H.fit(ctx,text,H.FONT.head,800,head,maxW);ctx.font=`800 ${size}px ${H.FONT.head}`;const tw=ctx.measureText(text).width;ctx.restore();
 const hy=s.h*hyF;
 return {size,tw,hy,maxW,cx:s.w/2};
}
// Sub line with one gold word, matching H.caption's sub entrance/exit exactly.
function subTwoTone(ctx,s,o){
 const T=s.T;if(T<o.in||T>o.out)return;
 const ks=E.outCubic((T-o.in-.05)/.3),kout=clamp((o.out-T)/.3);const a=Math.min(ks,E.inOutSine(kout))*.88;if(a<=0)return;
 const subSize=s.type.sub,maxW=s.w*(s.portrait?.88:.80)*.88,font=H.FONT.round;
 ctx.save();
 const size=H.fit(ctx,o.text,font,600,subSize,maxW);ctx.font=`600 ${size}px ${font}`;
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.globalAlpha*=a;
 const total=ctx.measureText(o.text).width,y=o.y+(1-ks)*16-(1-kout)*8+H.midOffset(ctx);
 H.fillAccent(ctx,o.text,s.w/2-total/2,y,o.gold,PAL.cream,PAL.hot);
 ctx.restore();
}

/* ── s12 · START ────────────────────────────────────────── */
const L12={text:'เรียนจบ คุณก็ทำได้',sub:'วิดีโอนี้ กับเว็บนี้ สร้างจากสิ่งที่คุณจะได้เรียน',in:52.15,out:55.9};
// Orbit phase in revolutions: 3 rev/s at 52 easing to 0.5 rev/s by 53, then a spiral-in kick from 55.5.
function orbitRev(T,red=1){const t=T-52;if(t<1)return .5*t+red*2.5*(1-Math.pow(1-t,3))/3;return .5*t+red*2.5/3;}
const COINS=[1,2,3,4,5].map(i=>LESSONS[i]);

TR.defineScene({id:'s12_start',start:52,end:56,draw(ctx,s){
 const T=s.T,t=T-52,u=s.u,J=jarLayout(s),red=s.reduced?.3:1;
 const slam=clamp(t/.42),kick=beatBump(T,52.5),kick2=T>=53&&T<55.5?beatBump(T,53,10):0;
 const heat=Math.max(0,1-t/.6)+.25*kick;
 // background stays put (no shake) so the frame edge never shows
 world(ctx,s,J.x,J.y,heat);
 ctx.save();
 // WORLD: slam punch-in, 12 px decaying shake, slow push toward the jar
 const push=1+.035*E.inOutSine(t/3.5)+.05*(1-E.outCubic(t/.5));
 ctx.translate(J.x,J.y);ctx.scale(push,push);ctx.translate(-J.x,-J.y);
 if(t<.32)H.shake(ctx,s,1.15*(1-t/.32));
 godRays(ctx,s,J.x,J.y,T,1+.35*(1-slam));
 // shockwave rings from the slam
 for(const [d,mul] of [[0,1],[.12,.7]]){const k=clamp((t-d)/.55);if(k>0&&k<1){ctx.save();ctx.globalAlpha=(1-k)*.85;ctx.strokeStyle=PAL.hot;ctx.lineWidth=u*(1.6*(1-k)+.2);ctx.beginPath();ctx.ellipse(J.x,J.y+J.size*.47,J.size*2.1*E.outCubic(k)*mul,J.size*.55*E.outCubic(k)*mul,0,0,TAU);ctx.stroke();ctx.restore();}}
 if(t<.55)H.speedLines(ctx,s,{x:J.x,y:J.y,count:60,alpha:.55*red*(1-t/.55),width:2.2,speed:2.2,seed:52});
 H.dust(ctx,s,{count:36,seed:52,speed:12,alpha:.55,size:1.8});
 confetti(ctx,s,T,52,5201);
 confetti(ctx,s,T,54,5401,1,1);
 // orbit
 const spiral=E.inCubic((T-55.5)/.5);
 const rx=(s.portrait?37:27)*u,ry=rx*(s.portrait?.3:.27),tilt=-10*DEG;
 const whip=E.outBack(clamp((t-.04)/.55));
 const rad=lerp(2.4,1,whip)*(1-spiral*.97);
 const rev=orbitRev(T,red)+spiral*1.4*red,phase=rev*TAU+.4;
 const omega=t<1?.5+red*2.5*Math.pow(1-t,2):.5+red*spiral*4;
 const ocx=J.x,ocy=J.y+J.size*.05;
 const pts=orbitPts(6,ocx,ocy,rx*rad,ry*rad,tilt,phase);
 const coinR=(s.portrait?6:5)*u;
 const drawItem=p=>{
  const sc=(.82+.24*p.depth)*(1-spiral*.75)*E.outBack(clamp((t-.02)/.3));if(sc<=.02)return;
  const al=(.72+.28*(p.depth+1)/2)*(1-smooth((spiral-.6)/.3));if(al<=.01)return;
  trail(ctx,ocx,ocy,rx*rad,ry*rad,tilt,p.th,Math.min(1.9,omega*.35*TAU),coinR*.55*sc,p.i===5?'#8f7cf0':PAL.gold,.55*al);
  if(p.i===5)agentOrb(ctx,T,p.x,p.y,coinR*.8*sc,al);
  else coin(ctx,p.x,p.y,coinR*sc,COINS[p.i].icon,al,COINS[p.i].color);
 };
 for(const p of pts)if(p.depth<0)drawItem(p);
 // pedestal + jar (slam 2.5→1 with overshoot, squash on each kick)
 const js=J.size*lerp(2.5,1,E.outBack(slam));
 {ctx.save();ctx.translate(J.x,J.y+J.size*.66);ctx.scale(1,.2);H.glow(ctx,0,0,J.size*2.2,PAL.gold,.55+.25*kick);ctx.restore();}
 pedestal(ctx,J.x,J.y+J.size*.5,J.size*1.25,J.size*.2,clamp(t/.12));
 const sq=kick2*.06;
 const impactSquash=Math.max(0,1-Math.abs(t-.3)/.14)*.12;
 heroJar(ctx,T,J.x,J.y,js,{sx:1+sq*.7+impactSquash,sy:1-sq-impactSquash,bump:kick2,glow:1+.6*(1-slam)+spiral*1.4});
 for(const p of pts)if(p.depth>=0)drawItem(p);
 // spiral-in light gathering in the jar
 if(spiral>0)H.glow(ctx,J.x,J.y,J.size*(.9+spiral*.6),PAL.hot,.5*spiral);
 // twinkles around the jar (≤2 Hz)
 {const r=H.rng(5252);for(let i=0;i<14;i++){const a=r()*TAU,d=J.size*(.75+r()*1.1),ph=r()*TAU,x=J.x+Math.cos(a)*d*1.3,y=J.y+Math.sin(a)*d*.75;const tw=Math.max(0,Math.sin(T*3.2+ph));if(tw<.05)continue;star(ctx,x,y,u*(.9+r()*.8)*tw,PAL.hot,.8*tw*clamp(t/.4)*(1-spiral));}}
 // anamorphic streak on the slam
 if(t<.7){ctx.save();ctx.translate(J.x,J.y);ctx.scale(1,.05);H.glow(ctx,0,0,s.w*.55,PAL.hot,.8*(1-t/.7));ctx.restore();}
 ctx.restore();
 H.vignette(ctx,s,.5);

 // TEXT layer: capsule button + caption + cursor tap (never shakes)
 const G=capGeom(ctx,s,L12.text,s.portrait?.70:.79);
 const capH=G.size*(s.portrait?1.45:1.35),padX=G.size*1.05,capW=G.tw+padX*2,capX=G.cx-capW/2,capY=G.hy-capH/2;
 const tri={x:capX+capW-padX*.5,y:G.hy};
 const tap=55.5,press=T>=tap&&T<tap+.22?(T<tap+.05?E.outCubic((T-tap)/.05):1-E.outBack(clamp((T-tap-.05)/.17))):0;
 const pScale=1-.06*press;
 const draw=E.outCubic((T-52.5)/.3),capOut=clamp((55.9-T)/.3),capA=Math.min(clamp((T-52.5)/.06),E.inOutSine(capOut));
 ctx.save();
 ctx.translate(G.cx,G.hy);ctx.scale(pScale,pScale);ctx.translate(-G.cx,-G.hy);
 if(capA>0&&draw>0){
  ctx.save();ctx.globalAlpha=capA*draw;H.rr(ctx,capX,capY,capW,capH,capH/2);ctx.fillStyle='rgba(6,23,15,.55)';ctx.fill();
  // one slow sheen across the button (local, not a flash)
  const sh=clamp((T-53.3)/1.1);if(sh>0&&sh<1){ctx.save();ctx.clip();const sx=capX-capW*.3+sh*capW*1.6;const g=ctx.createLinearGradient(sx-capH,0,sx+capH,0);g.addColorStop(0,'rgba(246,220,154,0)');g.addColorStop(.5,'rgba(246,220,154,.22)');g.addColorStop(1,'rgba(246,220,154,0)');ctx.fillStyle=g;ctx.fillRect(capX,capY,capW,capH);ctx.restore();}
  ctx.restore();
 }
 ctx.restore();
 // tap ripple + sparks: UNDER the text, grown sideways/up only so the sub stays clean
 if(T>=tap){const k=clamp((T-tap)/.4);if(k<1){const e=E.outCubic(k);ctx.save();ctx.globalAlpha=(1-k)*.85;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,u*.5*(1-k));
   const gx=G.size*.8*e,gu=G.size*.3*e;H.rr(ctx,capX-gx,capY-gu,capW+gx*2,capH+gu,(capH+gu)/2);ctx.stroke();
   ctx.beginPath();ctx.arc(tri.x,tri.y,G.size*(.35+.85*e),0,TAU);ctx.stroke();ctx.restore();}
  H.glow(ctx,tri.x,tri.y,G.size*2.2,PAL.hot,.5*(1-clamp((T-tap)/.4)));
  H.burst(ctx,T,tap,{x:tri.x,y:tri.y,count:40,speed:u*48,life:.65,size:u*.45,colors:[PAL.hot,PAL.gold,PAL.cream],shape:'line',seed:5550});
 }
 H.caption(ctx,s,{text:L12.text,sub:L12.sub,in:L12.in,out:L12.out,accent:'คุณก็ทำได้',subColor:'rgba(0,0,0,0)'});
 ctx.save();
 ctx.translate(G.cx,G.hy);ctx.scale(pScale,pScale);ctx.translate(-G.cx,-G.hy);
 if(capA>0&&draw>0){
  const per=2*(capW-capH)+Math.PI*capH;
  ctx.save();ctx.globalAlpha=capA;
  H.rr(ctx,capX,capY,capW,capH,capH/2);
  if(draw<1)ctx.setLineDash([per*draw,per*2]);
  ctx.strokeStyle=hexA0(PAL.hot,.25);ctx.lineWidth=Math.max(3,u*1.1);ctx.stroke();
  ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1.6,u*.42);ctx.stroke();
  ctx.setLineDash([]);
  // draw-head spark rides the stroke head
  if(draw<1){const hp=pillPoint(capX,capY,capW,capH,per*draw);H.glow(ctx,hp.x,hp.y,capH*.9,PAL.hot,.6*(1-draw));star(ctx,hp.x,hp.y,u*.9,PAL.cream,1-draw);}
  // ▶ at the right end: pulses scale 1→1.06 on every beat
  const pb=1+.06*beatBump(T,52.5,8)*(T>=52.8?1:0),ts=G.size*.3*pb;
  ctx.globalAlpha=capA*clamp((draw-.6)/.4);
  ctx.translate(tri.x,tri.y);ctx.scale(pb,pb);
  ctx.fillStyle=PAL.hot;ctx.beginPath();ctx.moveTo(-ts*.45,-ts*.6);ctx.lineTo(ts*.62,0);ctx.lineTo(-ts*.45,ts*.6);ctx.closePath();ctx.lineJoin='round';ctx.lineWidth=ts*.18;ctx.strokeStyle=PAL.hot;ctx.stroke();ctx.fill();
  ctx.restore();
 }
 ctx.restore();
 subTwoTone(ctx,s,{text:L12.sub,gold:'สิ่งที่คุณจะได้เรียน',in:L12.in,out:L12.out,y:s.h*(s.portrait?.76:.87)});
 // cursor glides in from lower right at 55.0, taps at 55.5, leaves with the caption
 if(T>=55&&T<55.9){
  const k=E.outCubic((T-55)/.4),tx=tri.x+G.size*.12,ty=tri.y+G.size*.1;
  const x=lerp(s.w+u*6,tx,k),y=lerp(s.h+u*8,ty,k)+(T<tap?-Math.sin(clamp((T-55.4)/.1)*Math.PI)*u*.6:0);
  cursorArrow(ctx,x,y,(s.portrait?6.5:5.2)*u,clamp((T-55)/.12)*E.inOutSine(capOut),1-.12*press);
 }
 // FLASH 2 of 2 (0.15 s, peak ≤ 60%)
 if(t<.15)H.flash(ctx,s,.7*(1-t/.15),'#fff4d6');
}});
// Point at arc length d along H.rr's pill path (starts at top-left x+r, runs clockwise).
function pillPoint(x,y,w,h,d){
 const r=h/2,Ls=w-h;
 if(d<=Ls)return {x:x+r+d,y};d-=Ls;
 if(d<=Math.PI*r){const a=-Math.PI/2+d/r;return {x:x+w-r+Math.cos(a)*r,y:y+r+Math.sin(a)*r};}d-=Math.PI*r;
 if(d<=Ls)return {x:x+w-r-d,y:y+h};d-=Ls;
 const a=Math.PI/2+Math.min(d,Math.PI*r)/r;return {x:x+r+Math.cos(a)*r,y:y+r+Math.sin(a)*r};
}
function star(ctx,x,y,r,color,alpha){
 if(r<=0||alpha<=0)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='lighter';ctx.fillStyle=color;
 ctx.beginPath();ctx.moveTo(x,y-r*2.2);ctx.quadraticCurveTo(x,y,x+r*2.2,y);ctx.quadraticCurveTo(x,y,x,y+r*2.2);ctx.quadraticCurveTo(x,y,x-r*2.2,y);ctx.quadraticCurveTo(x,y,x,y-r*2.2);ctx.fill();
 ctx.restore();
}

/* ── s13 · END CARD ─────────────────────────────────────── */
const L13={text:'โชคดีที่เราได้เจอกัน',sub:'บทที่ 1 รอคุณอยู่ · ฟรี ไม่ต้องสมัคร',in:56.15,out:60};
// Motion clock: real time until 59.5, then eases to a full stop (velocity (1-x)^2 over 0.5 s).
function motionT(T){if(T<59.5)return T;const x=clamp((T-59.5)/.5);return 59.5+.5*(1-Math.pow(1-x,3))/3;}
// Heart-shaped leaf pointing up (-y), tip at distance `off` from the centre, length L.
function leafPath(p,L,off){
 const P=(x,y)=>[x*L,-(off+y*L)];
 const m=(a,b,c)=>{const A=P(...a),B=P(...b),C=P(...c);p.bezierCurveTo(A[0],A[1],B[0],B[1],C[0],C[1]);};
 const s0=P(0,0);p.moveTo(s0[0],s0[1]);
 m([-.5,.18],[-.66,.8],[-.32,.97]);
 m([-.13,1.04],[0,.95],[0,.83]);
 m([0,.95],[.13,1.04],[.32,.97]);
 m([.66,.8],[.5,.18],[0,0]);
 p.closePath();
}
const LEAF_ANG=[-3*Math.PI/4,-Math.PI/4,Math.PI/4,3*Math.PI/4];
TR.defineScene({id:'s13_endcard',start:56,end:60,draw(ctx,s){
 const T=s.T,Te=motionT(T),t=T-56,u=s.u,J=jarLayout(s),C=cloverLayout(s);
 // jar → clover heart: slide up and shrink
 const mv=E.inOutCubic(t/.5);
 const cx=lerp(J.x,C.x,mv),cy=lerp(J.y,C.y,mv),R=C.r;
 const calm=smooth((Te-57)/2.5);
 world(ctx,s,cx,cy,Math.max(0,.6-t)*.6);
 godRays(ctx,s,cx,cy,Te,1-.5*calm);
 // dust at half speed (continuous with s12's drift)
 H.dust(ctx,Object.assign({},s,{T:56+(Te-56)*.5}),{count:36,seed:52,speed:12,alpha:.5,size:1.8});
 // leftover confetti from the 54 fountain settles out
 if(t<.7)confetti(ctx,s,T,54,5401,1-t/.7,1);
 // the pedestal drops away under the rising jar
 {const k=clamp(t/.28);if(k<1){const a=1-E.outCubic(k),dy=J.size*.25*E.inCubic(k);ctx.save();ctx.translate(J.x,J.y+J.size*.66+dy);ctx.scale(1,.2);H.glow(ctx,0,0,J.size*2.2,PAL.gold,.55*a);ctx.restore();pedestal(ctx,J.x,J.y+J.size*.5+dy,J.size*1.25*(1-.3*k),J.size*.2,a);}}
 // halo
 const breath=1+.015*(1-Math.cos(Math.max(0,Te-57)*Math.PI));
 const haloK=E.outCubic((t-.15)/.8);
 H.glow(ctx,cx,cy,R*2.6*(.6+.4*haloK),PAL.gold,.42*haloK);
 if(haloK>0){ctx.save();ctx.strokeStyle=PAL.gold;ctx.globalAlpha=.4*haloK;ctx.lineWidth=Math.max(1,u*.22);ctx.beginPath();ctx.arc(cx,cy,R*1.38*breath,-Math.PI/2,-Math.PI/2+TAU*haloK);ctx.stroke();
  ctx.setLineDash([u*.6,u*1.4]);ctx.globalAlpha=.28*haloK;ctx.beginPath();ctx.arc(cx,cy,R*1.55*breath,Te*.15,Te*.15+TAU);ctx.stroke();ctx.restore();}
 // spark ring + shockwave at the lock
 {const k=clamp(t/.9);if(k<1){const e=E.outCubic(k);ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.hot;ctx.lineCap='round';
  for(let i=0;i<30;i++){const a=i*TAU/30+.1,r0=R*(.35+2.3*e),r1=r0+R*.32*(1-k);ctx.globalAlpha=(1-k)*.9;ctx.lineWidth=Math.max(1,u*.4*(1-k*.6));ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);ctx.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.stroke();}
  ctx.globalAlpha=(1-k)*.7;ctx.lineWidth=u*(1.2*(1-k)+.2);ctx.beginPath();ctx.arc(cx,cy,R*(.4+2.1*e),0,TAU);ctx.stroke();ctx.restore();}}
 // orbit of six small rewards (behind half first)
 const emerge=E.outBack(clamp((t-.1)/.7));
 const orx=R*(s.portrait?1.78:2.3)*emerge,ory=R*.46*emerge,otilt=-8*DEG,oph=(Te-56)*.07*TAU+t*0+1.1-(1-emerge)*2.2;
 const opts=orbitPts(6,cx,cy+R*.05,orx,ory,otilt,oph);
 const iconR=R*(s.portrait?.25:.3);
 const drawIcon=p=>{const sc=(.8+.22*p.depth)*clamp(emerge*1.4);if(sc<=.02)return;coin(ctx,p.x,p.y,iconR*sc,LESSONS[p.i].icon,.72+.28*(p.depth+1)/2,LESSONS[p.i].color);};
 for(const p of opts)if(p.depth<0)drawIcon(p);
 // clover
 const rot=TAU*E.outCubic(clamp((t-.05)/.8));
 ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(breath,breath);
 // stem grows with the first leaf
 const stemK=E.outCubic(clamp((t-.05)/.45));
 if(stemK>0){ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,R*.12);ctx.quadraticCurveTo(R*.06,R*.62*stemK,R*.36*stemK,R*1.02*stemK);
  ctx.strokeStyle=PAL.gold;ctx.lineWidth=R*.13;ctx.stroke();ctx.strokeStyle=PAL.leaf;ctx.lineWidth=R*.08;ctx.stroke();ctx.restore();}
 const all=new Path2D();
 for(let k=0;k<4;k++){
  const lk=E.outBack(clamp((t-.25*k)/.38));if(lk<=0)continue;
  const L=R*1.0*lk,off=R*.1;
  ctx.save();ctx.rotate(LEAF_ANG[k]+Math.PI/2);
  const p=new Path2D();leafPath(p,L,off);
  const g=ctx.createLinearGradient(0,-off,0,-(off+L));g.addColorStop(0,'#143f29');g.addColorStop(.65,PAL.leaf);g.addColorStop(1,'#3a8f5f');
  ctx.fillStyle=g;ctx.fill(p);
  H.glow(ctx,0,-(off+L*.62),L*.55,PAL.hot,.16);
  ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1.2,R*.04);ctx.lineJoin='round';ctx.stroke(p);
  // centre vein
  ctx.globalAlpha=.55;ctx.lineWidth=Math.max(1,R*.018);ctx.beginPath();ctx.moveTo(0,-off-L*.08);ctx.lineTo(0,-(off+L*.78));ctx.stroke();
  ctx.restore();
  const m=new DOMMatrix().rotate((LEAF_ANG[k]+Math.PI/2)/DEG);all.addPath(p,m);
 }
 // gold specular band sweeps across the leaves at 58.0
 const sw=(T-58)/.6;
 if(sw>0&&sw<1){ctx.save();ctx.clip(all);ctx.rotate(-rot+.5);const bx=lerp(-R*1.6,R*1.6,E.inOutSine(sw));const g=ctx.createLinearGradient(bx-R*.35,0,bx+R*.35,0);g.addColorStop(0,'rgba(246,220,154,0)');g.addColorStop(.5,'rgba(255,246,214,.6)');g.addColorStop(1,'rgba(246,220,154,0)');ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(-R*2,-R*2,R*4,R*4);ctx.restore();}
 ctx.restore();
 // leaf-unfold sparkles on 8ths
 for(let k=0;k<4;k++){const a=LEAF_ANG[k]+rot,d=R*.8;H.burst(ctx,T,56+.25*k+.12,{x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,count:10,speed:u*22,life:.6,size:u*.35,colors:[PAL.hot,PAL.cream],seed:5600+k});}
 // the jar at the clover's heart
 const js=lerp(J.size,R*.74,mv);
 heroJar(ctx,Te,cx,cy-js*.02,js,{glow:.7+.5*(1-mv),bump:0});
 for(const p of opts)if(p.depth>=0)drawIcon(p);
 // a few slow twinkles
 {const r=H.rng(5656);for(let i=0;i<10;i++){const a=r()*TAU,d=R*(1.3+r()*1.1),ph=r()*TAU,x=cx+Math.cos(a)*d*1.4,y=cy+Math.sin(a)*d*.8;const tw=Math.max(0,Math.sin(Te*1.6+ph));if(tw<.05)continue;star(ctx,x,y,u*(.7+r()*.6)*tw,PAL.hot,.7*tw*haloK);}}
 H.vignette(ctx,s,.55);
 // text sits higher so the bottom stays clear for the HTML end-card buttons
 H.caption(ctx,s,{text:L13.text,sub:L13.sub,in:L13.in,out:L13.out,accent:'โชคดี',hy:s.portrait?.50:.58,sy:s.portrait?.56:.66});
}});
})();
