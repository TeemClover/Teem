/* s07_split (22–26 s) + s08_season (26–30 s).
   s07 · Lesson 4 SPLIT 🍱: one gold beam leaves the jar, splits through a glass prism into five beams that strike
   the tiers of a ปิ่นโต; the tiers spring apart and five dish tiles (slides, audio, FAQ, handbook, images) fan out,
   each tied back to the single jar by a gold thread that pulses on the beat. Loot: the bento docks into slot 4.
   s08 · Lesson 5 SEASON 🧂: a salt shaker swings on the beat and its seasoning condenses into three slash-command
   chips; a cursor drags each onto the jar, which spits out a ♪ film strip into orbit. The jar's glow condenses into
   the AI Agent (green orb, chef hat, a glowing jar in its chest) who blinks, nods and glances at the headline.
   WORLD layers take every push / shake / whip / orbit; captions are drawn after restoring and never move. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H;
const {TAU,clamp,lerp,E,rng,hexA,PAL}=H;
const k01=(T,a,b)=>clamp((T-a)/(b-a));
const red=(s,v)=>s.reduced?v*.3:v;
const bez=(a,b,c,k)=>(1-k)*(1-k)*a+2*(1-k)*k*b+k*k*c;
const kick=T=>{const ph=((T%.5)+.5)%.5;return Math.exp(-ph*9);};
// underdamped spring step response (k=180, damping 14): 0 → 1 with ~15% overshoot
const SW=Math.sqrt(180),SZ=14/(2*SW),SWD=SW*Math.sqrt(1-SZ*SZ);
const spring=t=>t<=0?0:1-Math.exp(-SZ*SW*t)*(Math.cos(SWD*t)+SZ*SW/SWD*Math.sin(SWD*t));
const outBackS=(x,c1=1.70158)=>{x=clamp(x);const c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};

/* ── shared drawing helpers ─────────────────────────────── */
function whipLines(ctx,s,k,seed,o={}){
 if(k<=0)return;const r=rng(seed),n=o.count||24,vert=!!o.vertical,dir=o.dir||-1,span=vert?s.h:s.w,cross=vert?s.w:s.h;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(let i=0;i<n;i++){const c=r()*cross,len=span*(.12+r()*.3)*(.4+.6*k),ph=(r()+s.T*(2.2+r()*2))%1;const p=dir<0?span*(1.15-ph*1.4):span*(-.15+ph*1.4);
  ctx.globalAlpha=Math.min(1,k)*(.18+r()*.4);ctx.strokeStyle=i%3?PAL.hot:PAL.cream;ctx.lineWidth=Math.max(1,s.u*(.15+r()*.35));ctx.beginPath();
  if(vert){ctx.moveTo(c,p);ctx.lineTo(c,p-dir*len);}else{ctx.moveTo(p,c);ctx.lineTo(p-dir*len,c);}ctx.stroke();}
 ctx.restore();
}
function eglow(ctx,x,y,rx,ry,color,a){if(rx<=0||a<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);H.glow(ctx,0,0,rx,color,a);ctx.restore();}
// Hex emblem with the lesson emoji at low alpha; slams in at t0 (scale 0→1.15→1) with a local shard burst.
function emblem(ctx,s,x,y,K,icon,T,t0){
 const t=T-t0,es=s.reduced?1:outBackS(clamp(t/.3),2.4),eA=.07+.2*(1-E.outCubic(k01(T,t0+.15,t0+.7)));
 ctx.save();ctx.translate(x,y);ctx.scale(es,es);ctx.rotate(T*.08);
 for(const [rad,al,lw] of [[46,.22,.5],[40,.1,.3]]){ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU+Math.PI/6;const px=Math.cos(a)*rad*K,py=Math.sin(a)*rad*K;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle=hexA(PAL.gold,al);ctx.lineWidth=Math.max(1,lw*K);ctx.stroke();}
 ctx.rotate(-T*.08);H.emoji(ctx,icon,0,0,56*K,{alpha:eA});ctx.restore();
 H.burst(ctx,T,t0,{x,y,count:30,seed:Math.round(t0*100),speed:K*75,life:.6,size:K*.9,shape:'line',colors:[PAL.hot,PAL.gold]});
 if(t>=0&&t<.35)H.glow(ctx,x,y,K*30,PAL.hot,.35*(1-t/.35));
}
function clover(ctx,x,y,r,color){ctx.save();ctx.fillStyle=color;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;ctx.beginPath();ctx.arc(x+Math.cos(a)*r*.42,y+Math.sin(a)*r*.42,r*.38,0,TAU);ctx.fill();}ctx.restore();}
// The sealed jar from Lesson 1 (same look as s04). o: sq squash, lid (0..1 hop), glow, sx flip
function jarV(ctx,x,y,S,T,o={}){
 const w=S*.62,bx=-w/2,by=-S*.4,bh=S*.86,br=S*.14;
 ctx.save();ctx.translate(x,y+S*.46);const sq=o.sq||0;ctx.scale(1+sq,1-sq);ctx.translate(0,-S*.46);if(o.sx!=null)ctx.scale(o.sx,1);
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,S*.47,w*.62,S*.05,0,0,TAU);ctx.fill();
 H.rr(ctx,bx,by,w,bh,br);ctx.fillStyle='rgba(244,236,216,.07)';ctx.fill();
 ctx.save();H.rr(ctx,bx,by,w,bh,br);ctx.clip();const sy=by+bh-bh*.8;const amp=S*.014;
 const lg=ctx.createLinearGradient(0,sy,0,by+bh);lg.addColorStop(0,PAL.hot);lg.addColorStop(.25,'#f0b44c');lg.addColorStop(1,'#a8571a');ctx.fillStyle=lg;
 ctx.beginPath();ctx.moveTo(bx-2,by+bh+2);for(let i=0;i<=10;i++){const xx=bx+w*i/10;ctx.lineTo(xx,sy+Math.sin(i*.9+T*6)*amp);}ctx.lineTo(bx+w+2,by+bh+2);ctx.closePath();ctx.fill();
 if(o.glow>0){ctx.globalCompositeOperation='lighter';ctx.fillStyle=hexA(PAL.hot,.35*o.glow);ctx.fillRect(bx,by,w,bh);}
 ctx.restore();
 H.rr(ctx,bx,by,w,bh,br);ctx.lineWidth=Math.max(1.5,S*.018);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.2)';H.rr(ctx,bx+w*.1,by+bh*.12,w*.07,bh*.58,w*.035);ctx.fill();
 H.rr(ctx,-w*.38,-S*.47,w*.76,S*.08,S*.03);ctx.fillStyle='rgba(244,236,216,.16)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,S*.012);ctx.stroke();
 const lid=o.lid||0;ctx.save();ctx.translate(-w*.43*lid*.3,-S*.53-S*.16*lid);ctx.rotate(-.35*lid);
 const lgd=ctx.createLinearGradient(-w*.42,0,w*.42,0);lgd.addColorStop(0,'#8a6420');lgd.addColorStop(.35,PAL.hot);lgd.addColorStop(.7,PAL.gold);lgd.addColorStop(1,'#7a5618');
 ctx.fillStyle=lgd;H.rr(ctx,-w*.43,-S*.07,w*.86,S*.14,S*.035);ctx.fill();ctx.restore();
 // label + seal
 const lw=w*.76,lh=S*.28,lx=-lw/2,ly=S*.12-lh/2;H.card(ctx,lx,ly,lw,lh,{fill:PAL.cream,r:S*.025});ctx.fillStyle=PAL.gold;ctx.fillRect(lx+lh*.1,ly,lw-lh*.2,Math.max(1,lh*.035));
 for(let i=0;i<3;i++){ctx.fillStyle=i===0?PAL.gold:hexA(PAL.deep,.42);H.rr(ctx,lx+lh*.14,ly+lh*(.28+i*.2),lw*(i===0?.42:[.5,.36][i-1]),lh*.08,lh*.04);ctx.fill();}
 ctx.save();ctx.translate(lx+lw*.8,ly+lh*.66);ctx.fillStyle='#b8862c';ctx.beginPath();ctx.arc(0,0,S*.075,0,TAU);ctx.fill();ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,S*.01);ctx.stroke();clover(ctx,0,0,S*.05,PAL.hot);ctx.restore();
 ctx.restore();
}
// Loot coin: deep green disc, gold rim, lesson emoji.
function coin(ctx,x,y,r,icon,a,o={}){
 if(r<=0||a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);
 const g=ctx.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#21603d');g.addColorStop(1,PAL.deep);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(1.5,r*.13);ctx.strokeStyle=PAL.gold;ctx.stroke();
 H.emoji(ctx,icon,0,0,r*1.2);ctx.restore();
}
// A copy arcs from (x0,y0) into HUD slot i, landing exactly at tEnd (the HUD fills at that moment).
function lootFlight(ctx,s,T,x0,y0,i,icon,t0,tEnd,K){
 if(T<t0||T>tEnd+.5)return;const slot=TR.hudRect(s,i);
 const cx=lerp(x0,slot.x,.25),cy=Math.min(y0,slot.y)-K*6;
 const at=k=>({x:bez(x0,cx,slot.x,k),y:bez(y0,cy,slot.y,k)});
 if(T<tEnd){const k=E.inOutCubic(k01(T,t0,tEnd));
  ctx.save();ctx.globalCompositeOperation='lighter';for(let j=1;j<=8;j++){const p=at(Math.max(0,k-j*.04));ctx.globalAlpha=(1-j/9)*.7;ctx.fillStyle=j%2?PAL.hot:PAL.gold;ctx.beginPath();ctx.arc(p.x,p.y,K*(1.1-j*.1),0,TAU);ctx.fill();}ctx.restore();
  const p=at(k),r=lerp(K*8,slot.size*.34,k);H.glow(ctx,p.x,p.y,r*2.6,PAL.hot,.5);coin(ctx,p.x,p.y,r,icon,1,{rot:(1-k)*.8});
 }else H.burst(ctx,T,tEnd,{x:slot.x,y:slot.y,count:26,seed:Math.round(tEnd*10),speed:s.u*22,life:.45,size:s.u*.4,colors:[PAL.hot,PAL.cream]});
}
function cursorArrow(ctx,x,y,sz,press,a=1){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.scale(press,press);ctx.rotate(-.12);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.moveTo(sz*.08,sz*.1);ctx.lineTo(sz*.08,sz*1.1);ctx.lineTo(sz*.85,sz*.8);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,sz);ctx.lineTo(sz*.27,sz*.76);ctx.lineTo(sz*.46,sz*1.12);ctx.lineTo(sz*.6,sz*1.05);ctx.lineTo(sz*.42,sz*.7);ctx.lineTo(sz*.75,sz*.7);ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=Math.max(1,sz*.07);ctx.strokeStyle=PAL.ink;ctx.lineJoin='round';ctx.stroke();ctx.restore();}
function bg(ctx,s,hx,hy){ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);ctx.fillStyle=H.radial(ctx,hx,hy,Math.max(s.w,s.h)*.8,'#103723',PAL.void);ctx.fillRect(0,0,s.w,s.h);}

/* ═════════════ s07_split ═════════════ */
const DISHES=['📊','🎧','❓','📘','🖼️'];
const TILE_T=[23,23.25,23.5,23.75,24];
function g07(s){
 const P=s.portrait,W=s.w,Hh=s.h,K=P?Math.min(W*.9,Hh*.48)/100:Math.min(W*.56,Hh*.8)/100;
 const g={P,K};
 if(!P){Object.assign(g,{hx:W*.3,hy:Hh*.52,jx:W*.1,jy:Hh*.72,S:19*K,qx:W*.2,qy:Hh*.36,qr:7*K,bx:W*.335,by:Hh*.68,bk:K,tile:s.u*9.5});
  const cx=W*.31,cy=Hh*.64,rx=W*.21,ry=Hh*.4;g.tiles=[205,237,270,303,335].map(a=>({x:cx+Math.cos(a*Math.PI/180)*rx,y:cy+Math.sin(a*Math.PI/180)*ry}));}
 else{Object.assign(g,{hx:W*.5,hy:Hh*.36,jx:W*.15,jy:Hh*.555,S:20*K,qx:W*.3,qy:Hh*.175,qr:7.5*K,bx:W*.58,by:Hh*.47,bk:K*1.3,tile:s.u*13});
  const cx=W*.5,cy=Hh*.47,rx=W*.37,ry=Hh*.29;g.tiles=[200,235,270,305,340].map(a=>({x:cx+Math.cos(a*Math.PI/180)*rx,y:cy+Math.sin(a*Math.PI/180)*ry}));}
 g.tw=24*g.bk;g.th=5.2*g.bk;g.mouthY=g.jy-g.S*.58;
 return g;
}
// tier separation (in bk units): springs apart at 23.0, compresses back for the loot at 24.78
const gapAt=T=>2.4*spring(T-23)*(1-E.inOutCubic(k01(T,24.78,24.95)));
const tierY=(G,i,gap)=>G.by+(i-2)*(G.th+gap*G.bk);
function pinto(ctx,G,x,y,T,gap,o={}){
 const K=G.bk,tw=G.tw,th=G.th,step=th+gap*K;
 ctx.save();ctx.translate(x,y);if(o.sx!=null)ctx.scale(o.sx,1);if(o.sq)ctx.scale(1+o.sq,1-o.sq);
 const top=-2*step-th/2,bot=2*step+th/2,rx=tw/2+K*1.1,hTop=top-th*.9-K*5.5;
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,bot+K*1.2,tw*.62,K*1.6,0,0,TAU);ctx.fill();
 // carry frame: two rods and an arched handle
 ctx.lineCap='round';ctx.strokeStyle='#b8862c';ctx.lineWidth=Math.max(1.5,K*1.1);
 ctx.beginPath();ctx.moveTo(-rx,bot-th*.4);ctx.lineTo(-rx,hTop+K*2);ctx.moveTo(rx,bot-th*.4);ctx.lineTo(rx,hTop+K*2);ctx.stroke();
 ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1.5,K*1.3);ctx.beginPath();ctx.moveTo(-rx,hTop+K*2);ctx.bezierCurveTo(-rx,hTop-K*3,rx,hTop-K*3,rx,hTop+K*2);ctx.stroke();
 ctx.strokeStyle=hexA(PAL.hot,.7);ctx.lineWidth=Math.max(1,K*.4);ctx.beginPath();ctx.moveTo(-rx*.6,hTop-K*1.3);ctx.quadraticCurveTo(0,hTop-K*2.2,rx*.6,hTop-K*1.3);ctx.stroke();
 if(gap>.05){const lk=clamp(gap/2.4);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const yy=(i-2)*step+step/2;eglow(ctx,0,yy,tw*.62,gap*K*1.6+K,PAL.hot,.6*lk);}ctx.restore();}
 for(let i=4;i>=0;i--){
  const yi=(i-2)*step,y0=yi-th/2;
  const g=ctx.createLinearGradient(-tw/2,0,tw/2,0);g.addColorStop(0,'#d9cdb0');g.addColorStop(.3,PAL.paper);g.addColorStop(.75,PAL.cream);g.addColorStop(1,'#cbbd9c');
  ctx.fillStyle=g;H.rr(ctx,-tw/2,y0,tw,th,th*.32);ctx.fill();
  ctx.fillStyle=PAL.gold;ctx.fillRect(-tw/2+th*.1,y0+th*.16,tw-th*.2,Math.max(1,th*.13));
  ctx.fillStyle=hexA('#8a6420',.45);ctx.fillRect(-tw/2+th*.2,y0+th*.84,tw-th*.4,Math.max(1,th*.07));
  // side latches tie into the rods
  ctx.fillStyle='#b8862c';H.rr(ctx,-rx-K*.7,yi-th*.18,K*1.6,th*.36,K*.3);ctx.fill();H.rr(ctx,rx-K*.9,yi-th*.18,K*1.6,th*.36,K*.3);ctx.fill();
  ctx.fillStyle=PAL.gold;ctx.beginPath();ctx.arc(0,yi+th*.12,th*.2,0,TAU);ctx.fill();clover(ctx,0,yi+th*.12,th*.15,'#8a6420');
  const hit=o.hit?o.hit[i]:0;if(hit>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=hit;ctx.fillStyle=hexA(PAL.hot,.55);H.rr(ctx,-tw/2,y0,tw,th,th*.32);ctx.fill();ctx.restore();}
 }
 // lid on the top tier
 const ly=top;ctx.fillStyle=PAL.cream;ctx.beginPath();ctx.moveTo(-tw*.47,ly+K*.2);ctx.quadraticCurveTo(-tw*.44,ly-th*.75,0,ly-th*.8);ctx.quadraticCurveTo(tw*.44,ly-th*.75,tw*.47,ly+K*.2);ctx.closePath();ctx.fill();
 ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,K*.45);ctx.stroke();
 ctx.fillStyle=PAL.gold;ctx.beginPath();ctx.ellipse(0,ly-th*.82,K*1.4,K*.8,0,0,TAU);ctx.fill();
 ctx.restore();
}
function prism(ctx,x,y,r,T,lit,a){
 if(a<=0||r<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.rotate(.18*Math.sin(T*1.7));
 const pts=[];for(let k=0;k<6;k++){const an=k/6*TAU-Math.PI/2;pts.push([Math.cos(an)*r,Math.sin(an)*r]);}
 if(lit>0)H.glow(ctx,0,0,r*3,PAL.hot,.55*lit);
 const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(.5,'rgba(244,236,216,.08)');g.addColorStop(1,'rgba(246,220,154,.26)');
 ctx.fillStyle=g;ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(255,252,240,.85)';ctx.lineWidth=Math.max(1.2,r*.07);ctx.lineJoin='round';ctx.stroke();
 ctx.strokeStyle='rgba(255,252,240,.32)';ctx.lineWidth=Math.max(1,r*.035);ctx.beginPath();for(let k=0;k<6;k+=2){ctx.moveTo(0,0);ctx.lineTo(pts[k][0],pts[k][1]);}ctx.stroke();
 ctx.beginPath();for(let k=0;k<6;k++){const p=pts[k];ctx[k?'lineTo':'moveTo'](p[0]*.5,p[1]*.5);}ctx.closePath();ctx.stroke();
 if(lit>0){ctx.globalCompositeOperation='lighter';ctx.fillStyle=hexA(PAL.hot,.5*lit);ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p[0]*.55,p[1]*.55):ctx.moveTo(p[0]*.55,p[1]*.55));ctx.closePath();ctx.fill();}
 ctx.restore();
}
// Tapered additive light beam from (x0,y0) toward (x1,y1); k = how far it has travelled.
function beam(ctx,x0,y0,x1,y1,w0,w1,k,a){
 if(k<=0||a<=0)return;const ex=lerp(x0,x1,k),ey=lerp(y0,y1,k),dx=ex-x0,dy=ey-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,we=lerp(w0,w1,k);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;
 const g=ctx.createLinearGradient(x0,y0,ex,ey);g.addColorStop(0,hexA(PAL.hot,.95));g.addColorStop(1,hexA(PAL.gold,.55));ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(x0+nx*w0,y0+ny*w0);ctx.lineTo(ex+nx*we,ey+ny*we);ctx.lineTo(ex-nx*we,ey-ny*we);ctx.lineTo(x0-nx*w0,y0-ny*w0);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(255,252,240,.9)';ctx.lineWidth=Math.max(1,w0*.35);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(ex,ey);ctx.stroke();
 ctx.restore();H.glow(ctx,ex,ey,we*4,PAL.hot,.55*a);
}
function dishTile(ctx,x,y,sz,icon,T,o={}){
 const sc=o.sc??1;if(sc<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.rotate(o.rot||0);ctx.scale(sc*(o.sx??1),sc*(o.sy??1));
 const r=sz*.24;ctx.fillStyle='rgba(0,0,0,.35)';H.rr(ctx,-sz/2+sz*.04,-sz/2+sz*.08,sz,sz,r);ctx.fill();
 const g=ctx.createLinearGradient(0,-sz/2,0,sz/2);g.addColorStop(0,PAL.paper);g.addColorStop(1,'#eadfc2');ctx.fillStyle=g;H.rr(ctx,-sz/2,-sz/2,sz,sz,r);ctx.fill();
 ctx.lineWidth=Math.max(1.2,sz*.045);ctx.strokeStyle=PAL.gold;ctx.stroke();
 ctx.strokeStyle=hexA(PAL.gold,.35);ctx.lineWidth=Math.max(1,sz*.02);H.rr(ctx,-sz/2+sz*.08,-sz/2+sz*.08,sz*.84,sz*.84,r*.7);ctx.stroke();
 if(o.wave){H.emoji(ctx,icon,0,-sz*.1,sz*.5);const kk=kick(T);ctx.fillStyle=PAL.leaf;for(let j=0;j<5;j++){const lv=.25+.75*kk*(.55+.45*Math.abs(Math.sin(j*1.9+T*7)));const bh=sz*.2*lv,bw=sz*.07;ctx.fillRect(-sz*.22+j*sz*.11-bw/2,sz*.33-bh,bw,bh);}}
 else H.emoji(ctx,icon,0,0,sz*.6);
 if(o.flash>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=o.flash;ctx.fillStyle=hexA(PAL.hot,.7);H.rr(ctx,-sz/2,-sz/2,sz,sz,r);ctx.fill();}
 ctx.restore();
}
// Tile i: launched from its tier at TILE_T[i], lands on the arc 0.3 s later, folds back at 24.75.
function tileState(G,i,T,gap){
 const t0=TILE_T[i],fin=G.tiles[i];if(T<t0)return null;
 const side=G.P?(fin.x<G.bx?-1:1):-1;
 const sx=G.bx+side*G.tw*.35,sy=tierY(G,i,gap);
 const fold=k01(T,24.75,24.95);if(fold>=1)return null;
 const fly=k01(T,t0,t0+.3),k=E.outCubic(fly);
 const cx=lerp(sx,fin.x,.35),cy=Math.min(sy,fin.y)-G.K*8;
 let x=bez(sx,cx,fin.x,k),y=bez(sy,cy,fin.y,k),sc=outBackS(fly,2.2),rot=(1-k)*-1.2*side;
 if(fly>=1){const kk=kick(T),ph=T*2.6+i*1.3;y+=Math.sin(ph)*G.K*.8-kk*G.K*.9;sc=1+.07*kk;rot=Math.sin(ph*.7)*.06;}
 if(fold>0){const f=E.inCubic(fold);x=lerp(x,G.bx,f);y=lerp(y,G.by,f);sc*=1-f;rot+=f*2;}
 return {x,y,sc,rot,fly,launch:{x:sx,y:sy}};
}
function threadPath(G,p){const x0=G.jx,y0=G.mouthY-G.S*.05;const mx=(x0+p.x)/2,my=Math.max(y0,p.y)+G.K*6;return {x0,y0,mx,my};}
function drawThreads(ctx,G,T,tiles,front,mid){
 const draw=k01(T,24,24.25);if(draw<=0)return;
 ctx.save();ctx.lineCap='round';
 tiles.forEach((st,i)=>{if(!st)return;const p={x:st.x+front.x,y:st.y+front.y},q=threadPath(G,{x:p.x-mid.x,y:p.y-mid.y});q.x0+=mid.x;q.y0+=mid.y;q.mx+=mid.x;q.my+=mid.y;
  const kd=E.outCubic(draw)*(st.sc>=.99?1:clamp(st.sc));
  const at=k=>({x:bez(p.x,q.mx,q.x0,k),y:bez(p.y,q.my,q.y0,k)});
  ctx.strokeStyle=hexA(PAL.gold,.65);ctx.lineWidth=Math.max(1,G.K*.32);ctx.beginPath();for(let j=0;j<=20;j++){const pt=at(j/20*kd);j?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y);}ctx.stroke();
  // light pulses travel from the jar to each tile on every beat
  if(draw>=1)for(const b of [24.25,24.5,24.75]){const pk=k01(T,b,b+.32);if(pk>0&&pk<1){const pt=at(1-E.inOutSine(pk));H.glow(ctx,pt.x,pt.y,G.K*3.2,PAL.hot,.9*Math.sin(Math.PI*pk));ctx.fillStyle='#fffaf0';ctx.globalAlpha=Math.sin(Math.PI*pk);ctx.beginPath();ctx.arc(pt.x,pt.y,G.K*.55,0,TAU);ctx.fill();ctx.globalAlpha=1;}}
 });
 ctx.restore();
}
function world07(ctx,s,G,T,cam){
 const K=G.K;
 // far layer: emblem + hero glow (moves less with the orbit)
 ctx.save();ctx.translate(cam.far,0);
 H.glow(ctx,G.hx,G.hy,48*K,'#1f5a3a',.85);
 emblem(ctx,s,G.hx,G.hy,K,'🍱',T,22);
 ctx.restore();
 const mid={x:cam.mid,y:0},front={x:cam.front,y:cam.frontY};
 const gap=gapAt(T);
 // mid layer: jar, beams, prism, pinto
 ctx.save();ctx.translate(mid.x,mid.y);
 // spotlight cone on the pinto
 ctx.save();ctx.globalCompositeOperation='lighter';const sg=ctx.createLinearGradient(0,G.by-40*K,0,G.by+18*K);sg.addColorStop(0,'rgba(246,220,154,0)');sg.addColorStop(1,'rgba(246,220,154,.07)');ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(G.bx-5*K,G.by-42*K);ctx.lineTo(G.bx+5*K,G.by-42*K);ctx.lineTo(G.bx+24*K,G.by+18*K);ctx.lineTo(G.bx-24*K,G.by+18*K);ctx.closePath();ctx.fill();ctx.restore();
 const jarPop=E.outBack(k01(T,22.05,22.35)),lid=Math.min(E.outBack(k01(T,22.4,22.55)),1-E.inOutCubic(k01(T,23.1,23.35)));
 const jsq=(T>22.5?.07*Math.exp(-(T-22.5)*8)*Math.sin((T-22.5)*30):0)+(T>24.25?.025*kick(T):0);
 const jglow=Math.max(.6*Math.max(0,1-Math.abs(T-22.55)/.3),T>24.25&&T<24.95?.5*kick(T):0);
 H.glow(ctx,G.jx,G.jy,G.S*(.6+.3*jglow),PAL.gold,.2+.35*jglow);
 ctx.save();ctx.translate(G.jx,G.jy+G.S*.46);ctx.scale(jarPop,jarPop);ctx.translate(-G.jx,-G.jy-G.S*.46);jarV(ctx,G.jx,G.jy,G.S,T,{lid,sq:jsq,glow:jglow});ctx.restore();
 // the single beam: jar → prism (22.5), then the five-beam fan (22.6–22.9 sweep)
 const fade=1-E.inOutCubic(k01(T,23.05,23.45));
 const b0=k01(T,22.5,22.62);beam(ctx,G.jx,G.mouthY-G.S*.06,G.qx,G.qy,K*1.2,K*1.2,E.outCubic(b0),fade);
 const hits=[0,0,0,0,0];
 for(let i=0;i<5;i++){const ks=k01(T,22.62+i*.05,22.84+i*.05),ty=tierY(G,i,0);const tx=G.bx+(G.P?-1:-1)*G.tw*.47;
  beam(ctx,G.qx,G.qy,tx,ty,K*.45,K*1.5,E.outCubic(ks),fade*.9);
  hits[i]=Math.max(ks>=1?Math.max(0,1-(T-(22.84+i*.05))/.5):0,T>=23&&T<23.5?1-(T-23)/.5:0)*.9;}
 const prA=E.outBack(k01(T,22.2,22.45))*(1-E.inCubic(k01(T,23.05,23.35)));
 prism(ctx,G.qx,G.qy,G.qr*(1+.25*Math.max(0,1-Math.abs(T-22.62)/.15)),T,clamp((T-22.55)/.08)*fade,prA);
 if(T>=23.05&&T<23.6)H.burst(ctx,T,23.05,{x:G.qx,y:G.qy,count:24,seed:2305,speed:K*30,life:.55,size:K*.55,colors:[PAL.hot,PAL.cream]});
 // the ปิ่นโต: pops in, springs open, flips for the loot
 const pop=E.outBack(k01(T,22.12,22.42)),flip=k01(T,24.8,25.12),sx=flip>0&&flip<1?Math.cos(E.inOutCubic(flip)*TAU):1;
 const comp=T>=24.9&&T<25.2?.08*Math.exp(-(T-24.9)*10)*Math.sin((T-24.9)*34):0;
 const rk=Math.min(E.outCubic(k01(T,24.85,25.05)),1-k01(T,25.15,25.6));
 if(rk>0){H.rays(ctx,G.bx,G.by,32*K,12,T*.9,PAL.hot,.4*rk);H.glow(ctx,G.bx,G.by,24*K,PAL.hot,.35*rk);}
 ctx.save();ctx.translate(G.bx,G.by+18*G.bk);ctx.scale(pop,pop);ctx.translate(-G.bx,-G.by-18*G.bk);
 pinto(ctx,G,G.bx,G.by,T,gap,{hit:hits,sx,sq:comp});ctx.restore();
 if(T>=23)H.burst(ctx,T,23,{x:G.bx-G.tw*.5,y:G.by,count:30,seed:2300,speed:K*45,life:.5,size:K*.6,colors:[PAL.hot,PAL.gold,PAL.cream]});
 ctx.restore();
 // front layer: threads + tiles
 const tiles=DISHES.map((_,i)=>tileState(G,i,T,gap));
 drawThreads(ctx,G,T,tiles,front,mid);
 ctx.save();ctx.translate(front.x,front.y);
 tiles.forEach((st,i)=>{if(!st)return;
  if(st.fly<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=hexA(PAL.hot,.5*(1-st.fly));ctx.lineWidth=Math.max(1,K*.6);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(st.launch.x-front.x+mid.x,st.launch.y);ctx.lineTo(st.x,st.y);ctx.stroke();ctx.restore();}
  H.glow(ctx,st.x,st.y,G.tile*.9*st.sc,PAL.gold,.22);
  dishTile(ctx,st.x,st.y,G.tile,DISHES[i],T,{sc:st.sc,rot:st.rot,wave:i===1,flash:st.fly<1?0:Math.max(0,1-(T-TILE_T[i]-.3)/.25)*.8});
  H.burst(ctx,T,TILE_T[i]+.3,{x:G.tiles[i].x,y:G.tiles[i].y,count:18,seed:2400+i,speed:K*32,life:.45,size:K*.5,colors:[PAL.hot,PAL.cream]});
 });
 ctx.restore();
 // glamour sparkles circling the closed bento after the loot
 const gk=k01(T,25,25.2);if(gk>0){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const a=i/14*TAU+T*1.3,rr=G.tw*(.75+.08*Math.sin(T*3+i));const x=G.bx+mid.x+Math.cos(a)*rr,y=G.by+Math.sin(a)*rr*.6;const tw=.5+.5*Math.sin(T*7+i*2.1);ctx.globalAlpha=gk*tw*.85;ctx.fillStyle=i%2?PAL.hot:PAL.cream;ctx.beginPath();ctx.arc(x,y,K*(.35+.35*tw),0,TAU);ctx.fill();}ctx.restore();}
 H.dust(ctx,s,{count:28,seed:2201,alpha:.4,size:s.u*.26,speed:s.u*1.6});
}
TR.defineScene({id:'s07_split',start:22,end:26,draw(ctx,s){
 const T=s.T,t=s.t,G=g07(s);
 bg(ctx,s,G.hx,G.hy);
 const kin=1-E.outExpo(clamp(t/.25)),kout=E.inCubic(k01(T,25.5,26));
 let ox=-red(s,s.w*.85)*kout,oy=0;if(G.P)oy=red(s,s.h*.3)*kin;else ox+=red(s,s.w*.3)*kin;
 // camera orbit 22.5–25.5 (±40 px at 1920 wide) with depth parallax, and a slow push-in
 const A=red(s,40*s.w/1920*(G.P?1.6:1)),ok=E.inOutSine(k01(T,22.5,25.5)),orb=Math.sin(ok*TAU)*A;
 const cam={far:-orb*.4,mid:orb,front:orb*1.6,frontY:-Math.abs(orb)*.15};
 const push=1+.045*E.inOutSine(k01(T,22,25.5));
 const drawW=(dx,dy,a)=>{ctx.save();ctx.globalAlpha=a;ctx.translate(ox+dx,oy+dy);ctx.translate(G.hx,G.hy);ctx.scale(push,push);ctx.translate(-G.hx,-G.hy);
  if(t<.3)H.shake(ctx,s,.55*(1-t/.3));if(T>=23&&T<23.15)H.shake(ctx,s,.3*(1-(T-23)/.15));world07(ctx,s,G,T,cam);ctx.restore();};
 if(kin>.15&&!s.reduced){if(G.P)drawW(0,s.h*.06*kin,.28);else drawW(s.w*.06*kin,0,.28);}
 if(kout>.08&&!s.reduced)drawW(s.w*.09*kout,0,.3*kout);
 drawW(0,0,1);
 H.vignette(ctx,s,.5);
 whipLines(ctx,s,kin*1.3,2210,{count:24,vertical:G.P,dir:-1});
 whipLines(ctx,s,kout*1.3,2220,{count:24,dir:-1});
 // loot: a copy of the closed bento arcs into slot 4, landing at 25.0
 const sxp=G.hx+(G.bx+cam.mid-G.hx)*push+ox,syp=G.hy+(G.by-G.hy)*push+oy;
 lootFlight(ctx,s,T,sxp,syp,3,'🍱',24.78,25,G.K);
 H.caption(ctx,s,{text:'ซอสเดียว ได้หลายเมนู',sub:'บท 4 · สไลด์ เสียง FAQ คู่มือ ภาพ',in:22.15,out:25.9,accent:'หลายเมนู',layout:'column',chip:'🍱'});
}});

/* ═════════════ s08_season ═════════════ */
const CHIP_ICONS=['📸','👗','🖌️'];
const DRAG=[26.5,27,27.5],DROP=DRAG.map(d=>d+.3);
const AG=28;
function g08(s){
 const P=s.portrait,W=s.w,Hh=s.h,K=P?Math.min(W*.9,Hh*.48)/100:Math.min(W*.56,Hh*.8)/100;
 const g={P,K};
 if(!P)Object.assign(g,{hx:W*.3,hy:Hh*.52,shx:W*.43,shy:Hh*.27,sh:21*K,jx:W*.24,jy:Hh*.68,S:19*K,ax:W*.3,ay:Hh*.36,R:10.2*K,
  chips:[{x:W*.465,y:Hh*.43},{x:W*.465,y:Hh*.545},{x:W*.465,y:Hh*.66}],cw:s.u*18,ch:s.u*7.4,cur:s.u*4.6,look:{x:W*.6,y:Hh*.47}});
 else Object.assign(g,{hx:W*.5,hy:Hh*.36,shx:W*.5,shy:Hh*.178,sh:21*K,shx2:W*.83,shy2:Hh*.17,jx:W*.5,jy:Hh*.52,S:24*K,ax:W*.5,ay:Hh*.265,R:11.8*K,
  chips:[{x:W*.27,y:Hh*.3,from:-1},{x:W*.73,y:Hh*.3,from:1},{x:W*.27,y:Hh*.385,from:-1}],cw:s.u*23,ch:s.u*9,cur:s.u*5.5,look:{x:W*.5,y:Hh*.72}});
 g.mouthY=g.jy-g.S*.58;
 return g;
}
function shakerAt(G,T){
 let x=G.shx,y=G.shy,sc=1;
 if(G.P){const k=E.inOutCubic(k01(T,27.85,28.2));x=lerp(G.shx,G.shx2,k);y=lerp(G.shy,G.shy2,k);sc=lerp(1,.8,k);}
 const swing=T<28.05?.26*Math.cos(TAU*(T-26)):.26*Math.cos(TAU*2.05)*Math.exp(-(T-28.05)*5)*Math.cos((T-28.05)*14);
 const rot=swing+(G.P?0:-.3);
 return {x,y,sc,rot,h:G.sh*sc};
}
const capOf=(p)=>({x:p.x-Math.sin(p.rot)*p.h*.5,y:p.y+Math.cos(p.rot)*p.h*.5});
function shaker(ctx,x,y,h,rot,sx,T){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);if(sx!=null)ctx.scale(sx,1);
 const bw=h*.5,top=-h*.5,bot=h*.2;
 const body=()=>{ctx.beginPath();ctx.moveTo(-bw*.42,top);ctx.lineTo(bw*.42,top);ctx.lineTo(bw*.5,top+h*.12);ctx.lineTo(bw*.5,bot);ctx.lineTo(-bw*.5,bot);ctx.lineTo(-bw*.5,top+h*.12);ctx.closePath();};
 // glass
 body();ctx.fillStyle='rgba(244,236,216,.16)';ctx.fill();
 // salt settled toward the cap
 ctx.save();body();ctx.clip();const sl=top+h*.3+Math.sin(T*TAU)*h*.02;
 const sg=ctx.createLinearGradient(0,sl,0,bot);sg.addColorStop(0,'#ffffff');sg.addColorStop(1,'#e9e1cc');ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(-bw,bot);ctx.lineTo(-bw,sl+h*.03);ctx.quadraticCurveTo(0,sl-h*.05,bw,sl+h*.03);ctx.lineTo(bw,bot);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(150,140,110,.35)';for(let i=0;i<14;i++){const gx=-bw*.42+((i*37)%14)/14*bw*.84,gy=sl+h*.05+((i*53)%9)/9*(bot-sl-h*.07);ctx.fillRect(gx,gy,Math.max(1,h*.018),Math.max(1,h*.018));}
 ctx.restore();
 body();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=Math.max(1.2,h*.022);ctx.lineJoin='round';ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=Math.max(1,h*.012);ctx.beginPath();ctx.moveTo(-bw*.17,top+h*.06);ctx.lineTo(-bw*.17,bot-h*.02);ctx.moveTo(bw*.17,top+h*.06);ctx.lineTo(bw*.17,bot-h*.02);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.45)';H.rr(ctx,-bw*.4,top+h*.1,bw*.08,h*.5,bw*.04);ctx.fill();
 ctx.fillStyle='rgba(244,236,216,.5)';H.rr(ctx,-bw*.42,top-h*.015,bw*.84,h*.05,h*.02);ctx.fill();
 // gold dome cap (pointing down) with holes
 const cg=ctx.createLinearGradient(-bw*.56,0,bw*.56,0);cg.addColorStop(0,'#8a6420');cg.addColorStop(.35,PAL.hot);cg.addColorStop(.7,PAL.gold);cg.addColorStop(1,'#7a5618');
 ctx.fillStyle=cg;H.rr(ctx,-bw*.56,bot-h*.02,bw*1.12,h*.09,h*.025);ctx.fill();
 ctx.beginPath();ctx.moveTo(-bw*.52,bot+h*.07);ctx.lineTo(bw*.52,bot+h*.07);ctx.quadraticCurveTo(bw*.5,bot+h*.27,0,bot+h*.29);ctx.quadraticCurveTo(-bw*.5,bot+h*.27,-bw*.52,bot+h*.07);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(90,62,14,.5)';ctx.lineWidth=Math.max(1,h*.01);ctx.beginPath();ctx.moveTo(-bw*.5,bot+h*.07);ctx.lineTo(bw*.5,bot+h*.07);ctx.stroke();
 ctx.fillStyle='#3a2a0c';for(const [hx,hy] of [[0,.24],[-.2,.2],[.2,.2],[-.1,.14],[.1,.14]]){ctx.beginPath();ctx.arc(hx*bw,bot+hy*h,Math.max(.8,h*.016),0,TAU);ctx.fill();}
 ctx.fillStyle='rgba(255,250,230,.55)';ctx.beginPath();ctx.ellipse(-bw*.22,bot+h*.11,bw*.14,h*.02,0,0,TAU);ctx.fill();
 ctx.restore();
}
function cmdChip(ctx,x,y,w,h,icon,o={}){
 const sc=o.sc??1;if(sc<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.rotate(o.rot||0);ctx.scale(sc,sc);
 if(o.lift>0){ctx.fillStyle=`rgba(0,0,0,${.35*o.lift})`;ctx.beginPath();ctx.ellipse(h*.25*o.lift,h*(.6+.5*o.lift),w*.45,h*.22,0,0,TAU);ctx.fill();}
 const g=ctx.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,'#174a31');g.addColorStop(1,PAL.green);ctx.fillStyle=g;H.rr(ctx,-w/2,-h/2,w,h,h/2);ctx.fill();
 ctx.lineWidth=Math.max(1.2,h*.07);ctx.strokeStyle=PAL.gold;ctx.stroke();
 // stroked slash mark
 ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,h*.1);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-w*.2,-h*.24);ctx.lineTo(-w*.3,h*.24);ctx.stroke();
 H.emoji(ctx,icon,w*.14,0,h*.72);
 if(o.glint>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=o.glint;ctx.fillStyle=hexA(PAL.hot,.6);H.rr(ctx,-w/2,-h/2,w,h,h/2);ctx.fill();}
 ctx.restore();
}
function note(ctx,x,y,sz,color){ctx.save();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,sz*.12);ctx.lineCap='round';
 ctx.beginPath();ctx.ellipse(x-sz*.18,y+sz*.32,sz*.2,sz*.14,-.4,0,TAU);ctx.fill();
 ctx.beginPath();ctx.moveTo(x,y+sz*.3);ctx.lineTo(x,y-sz*.42);ctx.quadraticCurveTo(x+sz*.28,y-sz*.3,x+sz*.3,y-sz*.05);ctx.stroke();ctx.restore();}
function filmStrip(ctx,x,y,w,h,rot,a){
 if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.rotate(rot);
 ctx.fillStyle=PAL.ink;H.rr(ctx,-w/2,-h/2,w,h,h*.12);ctx.fill();ctx.strokeStyle=hexA(PAL.gold,.8);ctx.lineWidth=Math.max(1,h*.05);ctx.stroke();
 ctx.fillStyle=PAL.cream;for(let i=0;i<5;i++){const hx=-w/2+w*(.12+i*.19);ctx.fillRect(hx-h*.05,-h*.42,h*.1,h*.1);ctx.fillRect(hx-h*.05,h*.32,h*.1,h*.1);}
 ctx.fillStyle=PAL.gold;ctx.fillRect(-w*.44,-h*.26,w*.4,h*.52);ctx.fillStyle=PAL.hot;ctx.fillRect(w*.04,-h*.26,w*.4,h*.52);
 note(ctx,w*.24,0,h*.55,PAL.ink);note(ctx,-w*.24,0,h*.5,PAL.ink);
 ctx.restore();
}
function agent(ctx,G,x,y,R,T,o){
 const sc=o.sc;if(sc<=0)return;ctx.save();ctx.translate(x,y);const sq=o.sq||0;ctx.scale(sc*(1+sq),sc*(1-sq));
 // body with a glowing jar in its chest
 const bw=R*1.3,bh=R*1.05,by=R*.78;
 const bgG=ctx.createLinearGradient(0,by,0,by+bh);bgG.addColorStop(0,PAL.leaf);bgG.addColorStop(1,PAL.green);ctx.fillStyle=bgG;H.rr(ctx,-bw/2,by,bw,bh,R*.42);ctx.fill();ctx.strokeStyle=hexA(PAL.gold,.8);ctx.lineWidth=Math.max(1,R*.05);ctx.stroke();
 const kk=kick(T),cy=by+bh*.5;H.glow(ctx,0,cy,R*(.8+.25*kk),PAL.hot,.55+.3*kk);
 const jw=R*.36,jh=R*.48;ctx.fillStyle=hexA(PAL.hot,.95);H.rr(ctx,-jw/2,cy-jh*.35,jw,jh*.8,jw*.25);ctx.fill();ctx.fillStyle=PAL.gold;H.rr(ctx,-jw*.42,cy-jh*.52,jw*.84,jh*.18,jw*.08);ctx.fill();ctx.fillStyle=PAL.cream;ctx.fillRect(-jw*.3,cy-jh*.05,jw*.6,jh*.18);
 // head (nods toward the text)
 ctx.save();ctx.rotate(o.nod*(G.P?0:.22));ctx.translate(0,o.nod*R*(G.P?.14:.06));
 H.glow(ctx,0,0,R*1.9,PAL.leaf,.7);
 const hg=ctx.createRadialGradient(-R*.35,-R*.4,R*.1,0,0,R);hg.addColorStop(0,'#4fae78');hg.addColorStop(.55,PAL.leaf);hg.addColorStop(1,'#0e3220');ctx.fillStyle=hg;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.fill();
 ctx.strokeStyle=hexA(PAL.gold,.85);ctx.lineWidth=Math.max(1,R*.06);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.32)';ctx.beginPath();ctx.ellipse(-R*.35,-R*.48,R*.32,R*.16,-.5,0,TAU);ctx.fill();
 const lx=o.look.x*R*.14,ly=o.look.y*R*.14,bl=Math.max(.08,o.blink);
 ctx.fillStyle=PAL.cream;for(const ex of [-.34,.34]){ctx.beginPath();ctx.ellipse(ex*R+lx,-R*.02+ly,R*.12,R*.17*bl,0,0,TAU);ctx.fill();}
 ctx.fillStyle='rgba(255,255,255,.9)';for(const ex of [-.34,.34]){if(bl>.5){ctx.beginPath();ctx.arc(ex*R+lx+R*.035,-R*.08+ly,R*.04,0,TAU);ctx.fill();}}
 // tiny chef hat
 ctx.save();ctx.translate(R*.06,-R*.93);ctx.rotate(.1);ctx.fillStyle=PAL.paper;
 ctx.beginPath();ctx.arc(-R*.2,-R*.2,R*.22,0,TAU);ctx.arc(R*.2,-R*.2,R*.22,0,TAU);ctx.arc(0,-R*.34,R*.26,0,TAU);ctx.fill();
 H.rr(ctx,-R*.3,-R*.16,R*.6,R*.26,R*.06);ctx.fill();ctx.fillStyle=PAL.gold;ctx.fillRect(-R*.3,R*.02,R*.6,Math.max(1,R*.06));ctx.restore();
 ctx.restore();
 ctx.restore();
}
function chipState(G,s,i,T){
 const c=G.chips[i],form=26.05+i*.12;if(T<form)return null;
 const k=k01(T,form,form+.35);let x=c.x,y=c.y,sc=outBackS(k,2),rot=0,lift=0,glint=Math.max(0,1-Math.abs(T-form-.3)/.2);
 if(G.P){sc=1;const kx=outBackS(k,1.4);x=lerp(c.from<0?-G.cw:s.w+G.cw,c.x,kx);rot=(1-k)*.4*c.from;}
 if(T>=DRAG[i]){const dk=k01(T,DRAG[i],DROP[i]);if(dk>=1)return null;const e=E.inOutCubic(dk);const ex=G.jx,ey=G.mouthY-G.S*.04;const cx=lerp(c.x,ex,.5),cy=Math.min(c.y,ey)-G.K*(G.P?10:12);
  x=bez(c.x,cx,ex,e);y=bez(c.y,cy,ey,e);lift=Math.sin(Math.PI*dk);sc=1+.12*lift-.35*E.inCubic(clamp((dk-.7)/.3));rot=-.15*lift*(ex<c.x?1:-1);}
 else{y+=Math.sin(T*3+i)*G.K*.4;}
 return {x,y,sc,rot,lift,glint};
}
function cursorAt(G,s,T){
 const off=G.P?{x:-s.w*.12,y:s.h*.42}:{x:s.w*.1,y:s.h*1.08};
 const ch=i=>({x:G.chips[i].x+G.cw*.08,y:G.chips[i].y+G.ch*.1});
 if(T<26.15)return null;
 if(T<26.5){const k=E.outCubic(k01(T,26.15,26.45)),p=ch(0);return {x:lerp(off.x,p.x,k),y:lerp(off.y,p.y,k),press:1-.15*k01(T,26.42,26.5),a:1};}
 for(let i=0;i<3;i++){
  if(T<DROP[i]){const st=chipState(G,s,i,T);return st?{x:st.x+G.cw*.08,y:st.y+G.ch*.1,press:.85,a:1}:null;}
  const next=i<2?DRAG[i+1]:28.2;
  if(T<next){const ex=G.jx+G.cw*.08,ey=G.mouthY-G.S*.04+G.ch*.1;const k=E.inOutCubic(k01(T,DROP[i]+.02,next-.04));const p=i<2?ch(i+1):off;
   return {x:lerp(ex,p.x,k),y:lerp(ey,p.y,k),press:i<2?1-.15*k01(T,next-.06,next):1,a:i<2?1:1-k01(T,27.95,28.2)};}
 }
 return null;
}
function world08(ctx,s,G,T,cam){
 const K=G.K;
 ctx.save();ctx.translate(cam.far,0);
 H.glow(ctx,G.hx,G.hy,48*K,'#1f5a3a',.85);
 emblem(ctx,s,G.hx,G.hy,K,'🧂',T,26);
 ctx.restore();
 ctx.save();ctx.translate(cam.mid,0);
 // jar + orbiting ♪ film strips (behind / in front by depth)
 const jsq=DROP.reduce((a,d)=>{const q=T-d;return q>0?a+.09*Math.exp(-q*8)*Math.sin(q*30):a;},0)+(T>=AG&&T<AG+.4?-.04*Math.sin(Math.PI*k01(T,AG,AG+.4)):0);
 const jglow=Math.max(...DROP.map(d=>T>=d?Math.max(0,1-(T-d)/.35):0),T>=AG?Math.sin(Math.PI*k01(T,AG,AG+.45)):0);
 const strips=DROP.map((d,i)=>{if(T<d)return null;const age=T-d,pop=outBackS(k01(T,d,d+.3),2);const th=-Math.PI/2+i*TAU/3+age*2.4+(i===1?.6:0);const z=Math.sin(th);
  const rx=G.S*(G.P?1.25:1.05)*pop,ry=G.S*.22*pop;return {x:G.jx+Math.cos(th)*rx,y:G.jy-G.S*.12+z*ry-(1-pop)*G.S*.4,z,sc:(.9+.2*z)*pop,rot:Math.cos(th)*.3};});
 const drawStrips=front=>strips.forEach(st=>{if(!st||(st.z>=0)!==front)return;filmStrip(ctx,st.x,st.y,G.S*.78*st.sc,G.S*.36*st.sc,st.rot,.55+.45*(st.z+1)/2);});
 H.glow(ctx,G.jx,G.jy,G.S*(.7+.4*jglow),PAL.gold,.22+.4*jglow);
 drawStrips(false);
 jarV(ctx,G.jx,G.jy,G.S,T,{sq:jsq,glow:jglow,lid:0});
 drawStrips(true);
 DROP.forEach((d,i)=>{H.burst(ctx,T,d,{x:G.jx,y:G.mouthY,count:18,seed:2700+i,speed:K*40,life:.5,size:K*.6,colors:[PAL.hot,PAL.gold,PAL.cream]});
  const rk=k01(T,d,d+.35);if(rk>0&&rk<1){ctx.save();ctx.strokeStyle=hexA(PAL.hot,.8*(1-rk));ctx.lineWidth=Math.max(1,K*.5);ctx.beginPath();ctx.ellipse(G.jx,G.mouthY,K*(3+12*E.outCubic(rk)),K*(1+4*E.outCubic(rk)),0,0,TAU);ctx.stroke();ctx.restore();}});
 // 28.0: the jar's glow rises and condenses into the agent
 const col=Math.sin(Math.PI*k01(T,AG,AG+.5));
 if(col>0){ctx.save();ctx.globalCompositeOperation='lighter';const cg=ctx.createLinearGradient(0,G.mouthY,0,G.ay);cg.addColorStop(0,hexA(PAL.hot,.4*col));cg.addColorStop(1,hexA(PAL.hot,.05*col));ctx.fillStyle=cg;const w0=G.S*.3,w1=G.R*.6;ctx.beginPath();ctx.moveTo(G.jx-w0,G.mouthY);ctx.lineTo(G.jx+w0,G.mouthY);ctx.lineTo(G.ax+w1,G.ay);ctx.lineTo(G.ax-w1,G.ay);ctx.closePath();ctx.fill();ctx.restore();}
 if(T>=AG&&T<AG+.55){const r=rng(2801);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<80;i++){const a=r()*TAU,R0=K*(12+r()*24),dl=r()*.15,cc=r(),k=k01(T,AG+dl,AG+dl+.32);if(k<=0||k>=1)continue;const kk=E.inCubic(k),R1=R0*(1-kk);
   ctx.globalAlpha=.4+.6*kk;ctx.fillStyle=cc>.5?PAL.hot:PAL.cream;const x=G.ax+Math.cos(a)*R1,y=G.ay+Math.sin(a)*R1;ctx.beginPath();ctx.arc(x,y,K*(.3+.4*kk),0,TAU);ctx.fill();}ctx.restore();
  H.glow(ctx,G.ax,G.ay,G.R*2.2,PAL.hot,.6*k01(T,AG+.1,AG+.4));}
 // agent: settles with overshoot, blinks at 28.5, nods toward the text, then glances at the headline
 const ak=k01(T,AG+.3,AG+.62),sc=T<AG+.3?0:outBackS(ak,2.6);
 if(sc>0){const flashK=Math.max(0,1-(T-AG-.3)/.3);if(flashK>0)H.glow(ctx,G.ax,G.ay,G.R*3,'#ffffff',.5*flashK);
  const bob=Math.sin(T*3.2)*K*.6,sq=.05*kick(T)*(T>AG+.7?1:0);
  const blink=1-Math.sin(Math.PI*k01(T,28.5,28.64))-Math.sin(Math.PI*k01(T,29.55,29.68));
  const nod=Math.sin(Math.PI*k01(T,28.66,28.98));
  const gl=E.inOutCubic(k01(T,28.95,29.15));const dx=G.look.x-G.ax,dy=G.look.y-G.ay,dl=Math.hypot(dx,dy)||1;
  const look={x:dx/dl*gl,y:dy/dl*gl+nod*.5};
  // gold rim light behind
  H.glow(ctx,G.ax,G.ay,G.R*2.4,PAL.gold,.25);
  agent(ctx,G,G.ax,G.ay+bob,G.R,T,{sc,sq,blink:clamp(blink),nod,look});}
 ctx.restore();
 // seasoning: 20 grains per beat from the swinging shaker
 const sp=shakerAt(G,T);
 ctx.save();ctx.translate(cam.front,0);
 const beats=[26,26.5,27,27.5];
 ctx.save();ctx.globalCompositeOperation='lighter';
 beats.forEach((b,bi)=>{const age=T-b;if(age<0||age>.8)return;const ps=shakerAt(G,b),cp=capOf(ps),r=rng(2600+bi);const dir=-Math.sin(ps.rot);
  for(let i=0;i<20;i++){const vx=(dir*.7+(r()-.5)*1.7)*K*26,vy=K*(10+r()*22),g=K*70,lf=.4+r()*.35,z=K*(.3+.3*r());if(age>lf)continue;const x=cp.x+vx*age,y=cp.y+vy*age+g*age*age*.5;ctx.globalAlpha=(1-age/lf)*.95;ctx.fillStyle=i%3?PAL.hot:PAL.cream;ctx.beginPath();ctx.arc(x,y,z,0,TAU);ctx.fill();}});
 // condensation streams into each chip as it forms (16:9)
 if(!G.P)for(let i=0;i<3;i++){const form=26.05+i*.12,k=k01(T,form-.1,form+.25);if(k<=0||k>=1)continue;const cp=capOf(shakerAt(G,form)),c=G.chips[i],r=rng(2650+i);for(let j=0;j<12;j++){const kk=clamp(k*1.3-r()*.3),jx=(r()-.5)*G.cw;if(kk<=0||kk>=1)continue;const e=E.inCubic(kk);ctx.globalAlpha=Math.sin(Math.PI*kk);ctx.fillStyle=PAL.hot;const x=lerp(cp.x,c.x+jx,e),y=lerp(cp.y,c.y,e);ctx.beginPath();ctx.arc(x,y,K*.4,0,TAU);ctx.fill();}}
 ctx.restore();
 // shaker (card-flips for the loot at 28.75)
 const flip=k01(T,28.72,29.05),fsx=flip>0&&flip<1?Math.cos(E.inOutCubic(flip)*TAU):1;
 const rk=Math.min(E.outCubic(k01(T,28.85,29.05)),1-k01(T,29.15,29.6));
 if(rk>0){H.rays(ctx,sp.x,sp.y,G.sh*1.4,12,T*.9,PAL.hot,.4*rk);H.glow(ctx,sp.x,sp.y,G.sh,PAL.hot,.35*rk);}
 const shPop=outBackS(k01(T,26.02,26.3),2);
 H.glow(ctx,sp.x,sp.y,G.sh*.8,PAL.gold,.18);
 ctx.save();ctx.translate(sp.x,sp.y);ctx.scale(shPop,shPop);ctx.translate(-sp.x,-sp.y);shaker(ctx,sp.x,sp.y,sp.h,sp.rot,fsx,T);ctx.restore();
 // command chips + cursor
 for(let i=0;i<3;i++){const st=chipState(G,s,i,T);if(!st)continue;if(st.glint>0)H.glow(ctx,st.x,st.y,G.cw*.6,PAL.hot,.35*st.glint);cmdChip(ctx,st.x,st.y,G.cw,G.ch,CHIP_ICONS[i],{sc:st.sc,rot:st.rot,lift:st.lift,glint:st.glint});
  if(G.P&&T<26.45+i*.12){const k=k01(T,26.05+i*.12,26.4+i*.12);if(k>0&&k<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=hexA(PAL.hot,.5*(1-k));ctx.lineWidth=Math.max(1,K*.7);ctx.beginPath();ctx.moveTo(st.x-G.chips[i].from*G.cw*.5,st.y);ctx.lineTo(st.x-G.chips[i].from*(G.cw*.5+s.w*.25*(1-k)),st.y);ctx.stroke();ctx.restore();}}}
 const cu=cursorAt(G,s,T);if(cu)cursorArrow(ctx,cu.x,cu.y,G.cur,cu.press,cu.a);
 ctx.restore();
 H.dust(ctx,s,{count:28,seed:2601,alpha:.4,size:s.u*.26,speed:s.u*1.6});
}
TR.defineScene({id:'s08_season',start:26,end:30,draw(ctx,s){
 const T=s.T,t=s.t,G=g08(s);
 bg(ctx,s,G.hx,G.hy);
 const kin=1-E.outExpo(clamp(t/.25)),kout=E.inCubic(k01(T,29.5,30));
 let ox=-red(s,s.w*.85)*kout,oy=0;if(G.P)oy=red(s,s.h*.3)*kin;else ox+=red(s,s.w*.3)*kin;
 const A=red(s,30*s.w/1920*(G.P?1.6:1)),orb=Math.sin(E.inOutSine(k01(T,26.3,29.5))*TAU)*A;
 const cam={far:-orb*.4,mid:orb,front:orb*1.5};
 const push=1+.04*E.inOutSine(k01(T,26,29.5));
 const drawW=(dx,dy,a)=>{ctx.save();ctx.globalAlpha=a;ctx.translate(ox+dx,oy+dy);ctx.translate(G.hx,G.hy);ctx.scale(push,push);ctx.translate(-G.hx,-G.hy);
  if(t<.3)H.shake(ctx,s,.55*(1-t/.3));for(const d of DROP)if(T>=d&&T<d+.12)H.shake(ctx,s,.25*(1-(T-d)/.12));world08(ctx,s,G,T,cam);ctx.restore();};
 if(kin>.15&&!s.reduced){if(G.P)drawW(0,s.h*.06*kin,.28);else drawW(s.w*.06*kin,0,.28);}
 if(kout>.08&&!s.reduced)drawW(s.w*.09*kout,0,.3*kout);
 drawW(0,0,1);
 H.vignette(ctx,s,.5);
 whipLines(ctx,s,kin*1.3,2610,{count:24,vertical:G.P,dir:-1});
 whipLines(ctx,s,kout*1.3,2620,{count:24,dir:-1});
 // loot: a 🧂 coin leaves the flipping shaker and docks into slot 5 at 29.0; the hat brim glows hot
 const sp=shakerAt(G,T),sx=G.hx+(sp.x+cam.front-G.hx)*push+ox,sy=G.hy+(sp.y-G.hy)*push+oy;
 lootFlight(ctx,s,T,sx,sy,4,'🧂',28.78,29,G.K);
 if(T>=29&&T<29.7){const hp=TR.hudRect(s,7);H.glow(ctx,hp.x,hp.y+hp.size*.1,hp.size*1.3,PAL.hot,.55*(1-k01(T,29,29.7)));}
 H.caption(ctx,s,{text:'AI Agent ที่รู้ใจคุณ',sub:'บท 5 · /foodangle + คลิปมีเพลง',in:26.15,out:29.9,accent:'รู้ใจคุณ',layout:'column',chip:'🧂'});
}});
})();
