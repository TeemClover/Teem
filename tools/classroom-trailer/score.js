/* AI ใส่ซอส · trailer soundtrack (procedural WebAudio, 120 BPM, 60 s).
   Key journey: D minor (grind) → D major (the sauce + quest) → E major (life) → E minor colour
   (secret) → E major (finale). Every music and SFX event of the film is a cue here; scenes add no audio.
   The score runs on its own little mixer (dry bus, warm plate reverb, soft limiter) that feeds the
   engine's master. Hush moments (3.0–3.5, 51.5–52.0) and the outro tail are kept DRY so no reverb
   tail leaks into the silence. Kicks sidechain-duck the sustained voices and every impact ducks the
   music about −3 dB; ducking is computed per voice (seek-safe, no shared automation). */
(function(){
'use strict';
const TR=window.MC_TRAILER;if(!TR||!TR.addCues)return;
const IN=TR.instruments||(TR.instruments={});
const B=TR.BEAT||.5,S8=B/2,S16=B/4;
const hz=m=>440*Math.pow(2,(m-69)/12);
const TRIM=.88;              // overall level into the engine master
const KICKS=[];              // trailer-time kick hits (for sidechain ducking)
const IMPACTS=[7,8,10,12.5,14,18,19.5,22,26,30,34,41,52,56]; // music ducks −3 dB under these
const RIGS=new WeakMap();
// Mix balance: mid-range layers lifted so the groove reads on phone speakers, not just the kick sub.
const MIX={bass:2,pad:2.3,choir:2,clap:1.5,stab:1.4,str:1.8,arp:1.6,hat:1.4,lead:1.4};
// …applied only inside the loud sections (drop 1 → life, drop 2), so the grind, hushes and secret keep their contrast.
const LOUD=T=>(T>=7&&T<44.5)||(T>=52&&T<56);
// The quest run also climbs lesson by lesson (energy 7→9): ×0.88 at L1 rising to ×1.18 at L6; the finale gets ×1.2.
const mg=(k,o)=>{const T=o&&o.T!=null?o.T:-1;if(!LOUD(T))return 1;return MIX[k]*(T>=10&&T<34?.88+.3*Math.floor((T-10)/4)/5:T>=52?1.2:1);}; // finale groove (energy 10) sits on top

/* ── Mixer rig (one per Synth / AudioContext) ───────────────────── */
function lcg(seed){let s=seed>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function rig(syn){
 let r=RIGS.get(syn);if(r)return r;
 const ac=syn.ac,sr=ac.sampleRate;
 const out=ac.createGain();out.gain.value=TRIM;
 const lim=ac.createDynamicsCompressor();lim.threshold.value=-5;lim.knee.value=4;lim.ratio.value=14;lim.attack.value=.002;lim.release.value=.14;
 out.connect(lim);lim.connect(syn.master);
 const dry=ac.createGain();dry.connect(out);
 const send=ac.createGain();
 const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=260;
 const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6500;
 const conv=ac.createConvolver();
 const len=Math.floor(sr*2.1),ir=ac.createBuffer(2,len,sr),pre=Math.floor(sr*.014);
 for(let c=0;c<2;c++){const d=ir.getChannelData(c),rnd=lcg(97+c*131);let y=0;for(let i=pre;i<len;i++){y+=((rnd()*2-1)-y)*.55;const k=(i-pre)/(len-pre);d[i]=y*Math.pow(1-k,3.2);}}
 conv.buffer=ir;
 const ret=ac.createGain();ret.gain.value=.7;
 send.connect(hp);hp.connect(lp);lp.connect(conv);conv.connect(ret);ret.connect(out);
 const nb=ac.createBuffer(1,sr*2,sr);{const d=nb.getChannelData(0),rnd=lcg(4242);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1;}
 const curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*3)/Math.tanh(3);}
 r={ac,out,dry,send,nb,curve,sends:{}};RIGS.set(syn,r);return r;
}
function sendAt(r,rv){const k=Math.max(1,Math.min(10,Math.round(rv*10)));let g=r.sends[k];if(!g){g=r.ac.createGain();g.gain.value=k/10;g.connect(r.send);r.sends[k]=g;}return g;}
function env(p,t,a,h,d,v,lin,expA){
 p.setValueAtTime(1e-4,t);
 if(expA)p.exponentialRampToValueAtTime(Math.max(v,1e-4),t+a);else p.linearRampToValueAtTime(v,t+a);
 if(h>0)p.setValueAtTime(v,t+a+h);
 if(lin)p.linearRampToValueAtTime(0,t+a+h+d);else p.exponentialRampToValueAtTime(1e-4,t+a+h+d);
}
function filt(ac,src,t,fl,dur){
 const b=ac.createBiquadFilter();b.type=fl.type||'lowpass';b.frequency.setValueAtTime(fl.f,t);b.Q.value=fl.q??.7;
 if(fl.pts){let last=t;for(const[dt,f]of fl.pts){const tt=t+dt;if(tt<=last)continue;b.frequency.exponentialRampToValueAtTime(f,tt);last=tt;}}
 else if(fl.to)b.frequency.exponentialRampToValueAtTime(fl.to,t+(fl.t||dur));
 src.connect(b);return b;
}
function out(r,n,t,o){
 let x=n;
 if(o.pan&&r.ac.createStereoPanner){const p=r.ac.createStereoPanner();if(Array.isArray(o.pan)){p.pan.setValueAtTime(o.pan[0],t);p.pan.linearRampToValueAtTime(o.pan[1],t+(o.panT||.3));}else p.pan.value=o.pan;x.connect(p);x=p;}
 x.connect(o.dest||r.dry);
 if(o.rev>0)x.connect(sendAt(r,o.rev));
}
// Sidechain: dips for the kick and −3 dB holds for impacts, scheduled on the voice's own gain nodes.
function duck(r,src,t,end,o){
 let x=src;const off=t-(o.T??t),ac=r.ac;
 if(o.duck&&o.duck<1){const ks=KICKS.map(k=>k+off).filter(k=>k>=t-1e-4&&k<end);if(ks.length){const g=ac.createGain(),p=g.gain;p.setValueAtTime(1,t);let last=t-1;for(const k of ks){if(k<last)continue;p.setValueAtTime(1,k);p.linearRampToValueAtTime(o.duck,k+.012);p.linearRampToValueAtTime(1,k+.21);last=k+.21;}x.connect(g);x=g;}}
 const is=IMPACTS.map(i=>i+off).filter(i=>i>t+.02&&i<end);
 if(is.length){const g=ac.createGain(),p=g.gain;p.setValueAtTime(1,t);let last=t-1;for(const i of is){if(i<last)continue;p.setValueAtTime(1,i);p.linearRampToValueAtTime(.7,i+.02);p.setValueAtTime(.7,i+.35);p.linearRampToValueAtTime(1,i+.8);last=i+.8;}x.connect(g);x=g;}
 return x;
}
/* one oscillator voice */
function V(r,t,o){
 const ac=r.ac,a=Math.max(o.a??.004,.001),h=o.h||0,d=o.d??.3,end=t+a+h+d;
 const osc=ac.createOscillator();osc.type=o.type||'sine';
 osc.frequency.setValueAtTime(o.f||hz(o.m),t);if(o.to)osc.frequency.exponentialRampToValueAtTime(o.to,t+(o.toT||a+h+d));
 if(o.det)osc.detune.setValueAtTime(o.det,t);
 let n=osc;if(o.fl)n=filt(ac,osc,t,o.fl,end-t);
 const g=ac.createGain();env(g.gain,t,a,h,d,o.v??.2,o.lin,o.expA);n.connect(g);
 out(r,g,t,o);osc.start(t);osc.stop(end+.03);
}
/* one filtered-noise voice */
function N(r,t,o){
 const ac=r.ac,a=Math.max(o.a??.002,.001),h=o.h||0,d=o.d??.2,end=t+a+h+d;
 const s=ac.createBufferSource();s.buffer=r.nb;s.loop=true;if(o.rate)s.playbackRate.value=o.rate;
 const n=filt(ac,s,t,{type:o.type||'bandpass',f:o.f||2000,to:o.to,t:o.toT,q:o.q,pts:o.pts},end-t);
 const g=ac.createGain();env(g.gain,t,a,h,d,o.v??.2,o.lin,o.expA);n.connect(g);
 out(r,g,t,o);s.start(t,(t*.6180339)%1.7);s.stop(end+.03);
}
/* a chord of detuned oscillators through ONE filter/envelope (pads, stabs, choir, strings) */
function C(r,t,notes,o){
 const ac=r.ac,a=Math.max(o.a??.01,.001),h=o.h||0,d=o.d??.5,end=t+a+h+d;
 const mix=ac.createGain();mix.gain.value=1;
 let lfo=null;if(o.vib){lfo=ac.createOscillator();lfo.frequency.value=o.vib[0];const lg=ac.createGain();lg.gain.value=o.vib[1];lfo.connect(lg);lfo.start(t);lfo.stop(end+.03);lfo=lg;}
 for(const m of notes)for(const dt of(o.dets||[0])){
  const osc=ac.createOscillator();osc.type=o.type||'sawtooth';const f=o.freq?m:hz(m);
  osc.frequency.setValueAtTime(f,t);if(o.glide)osc.frequency.exponentialRampToValueAtTime(f*o.glide[1],t+o.glide[0]);
  osc.detune.value=dt;if(lfo)lfo.connect(osc.detune);osc.connect(mix);osc.start(t);osc.stop(end+.03);
 }
 const g=ac.createGain();env(g.gain,t,a,h,d,o.v??.03,o.lin,o.expA);
 if(o.formants){for(const[f,q,k]of o.formants){const b=ac.createBiquadFilter();b.type='bandpass';b.frequency.value=f;b.Q.value=q;const bg=ac.createGain();bg.gain.value=k;mix.connect(b);b.connect(bg);bg.connect(g);}}
 else if(o.fl){filt(ac,mix,t,o.fl,end-t).connect(g);}else mix.connect(g);
 out(r,duck(r,g,t,end,o),t,o);
}

/* ── Instruments (cue = {t,type,args:[options]}) ────────────────── */
const R=rig;
IN.mKick=(syn,t,o={})=>{const r=R(syn),v=o.v??1;
 V(r,t,{f:175,to:47,toT:.13,a:.002,h:.03,d:.3,v:.6*v});
 V(r,t,{type:'triangle',f:150,to:66,toT:.07,a:.001,d:.1,v:.42*v});
 N(r,t,{type:'highpass',f:2800,d:.016,v:.24*v});};
IN.mSnare=(syn,t,o={})=>{const r=R(syn),v=o.v??.4,big=o.big;
 N(r,t,{type:'bandpass',f:1900,q:.6,d:big?.32:.16,v,rev:big?.5:.22});
 N(r,t,{type:'highpass',f:5200,d:big?.2:.09,v:v*.45,rev:.15});
 V(r,t,{type:'triangle',f:205,to:150,toT:.08,d:.1,v:v*.55});
 if(big)V(r,t,{f:105,to:62,toT:.2,d:.24,v:v*.7});};
IN.mClap=(syn,t,o={})=>{const r=R(syn),v=(o.v??.35)*mg('clap',o);
 for(let i=0;i<3;i++)N(r,t+i*.011,{type:'bandpass',f:1300,q:1.1,d:.028,v:v*(i===2?1:.7)});
 N(r,t+.033,{type:'bandpass',f:1150,q:.8,d:.2,v:v*.45,rev:.35});};
IN.mHat=(syn,t,o={})=>{N(R(syn),t,{type:'highpass',f:o.open?6200:8200,d:o.open?.18:.032,v:(o.v??.07)*mg('hat',o),pan:o.pan||0});};
IN.mShaker=(syn,t,o={})=>{const r=R(syn),v=o.v??.08;N(r,t,{type:'bandpass',f:5200,q:1.4,a:.03,d:.06,v,pan:-.3});N(r,t+.09,{type:'bandpass',f:5600,q:1.4,a:.02,d:.07,v:v*.8,pan:.3});};
IN.mCrash=(syn,t,o={})=>{const r=R(syn),v=o.v??.22;
 N(r,t,{type:'highpass',f:4300,d:o.d??1.8,v,rev:.35});
 N(r,t,{type:'bandpass',f:7600,q:1.6,d:(o.d??1.8)*.6,v:v*.55,pan:.25});
 N(r,t,{type:'bandpass',f:3100,q:2,d:.35,v:v*.5,pan:-.25});};
IN.mRevCym=(syn,t,o={})=>{const r=R(syn),dur=o.dur??.5;N(r,t,{type:'highpass',f:2600,to:6500,toT:dur,a:dur,d:.03,v:o.v??.28,lin:1,expA:1,rev:o.rev??.12});};
IN.mBoom=(syn,t,o={})=>{const r=R(syn),ac=r.ac,v=o.v??1;
 IN.mKick(syn,t,{v:v*.95});
 V(r,t,{f:110,to:40,toT:.55,a:.004,h:.25,d:o.tail??1.5,v:.7*v});
 // saturated low layer: harmonics so the hit survives phone speakers
 const osc=ac.createOscillator();osc.frequency.setValueAtTime(o.warm?73:82,t);osc.frequency.exponentialRampToValueAtTime(41,t+.7);
 const pre=ac.createGain();pre.gain.value=o.warm?1.6:2.6;const sh=ac.createWaveShaper();sh.curve=r.curve;
 const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(o.warm?900:1500,t);lp.frequency.exponentialRampToValueAtTime(140,t+1.1);
 const g=ac.createGain();env(g.gain,t,.003,.08,1.25,.2*v);osc.connect(pre);pre.connect(sh);sh.connect(lp);lp.connect(g);out(r,g,t,{rev:.3});osc.start(t);osc.stop(t+1.4);
 N(r,t,{type:'lowpass',f:o.warm?1400:2600,to:110,d:1.3,v:.34*v,rev:.45});
 if(!o.noCrash)IN.mCrash(syn,t,{v:(o.warm?.13:.26)*v,d:o.warm?2.2:1.9});};
IN.mImpact=(syn,t,o={})=>{const r=R(syn),v=o.v??.8;
 V(r,t,{f:98,to:42,toT:.45,a:.003,h:.06,d:o.d??.8,v:.55*v});
 V(r,t,{type:'triangle',f:190,to:72,toT:.14,d:.18,v:.3*v});
 N(r,t,{type:'lowpass',f:1900,to:150,d:.7,v:.3*v,rev:o.rev??.35});
 if(o.crash)IN.mCrash(syn,t,{v:o.crash});};
IN.mThunk=(syn,t,o={})=>{const r=R(syn),v=o.v??.5;V(r,t,{f:78,to:46,toT:.3,a:.004,d:.55,v:.6*v});V(r,t,{type:'triangle',f:150,to:90,toT:.1,d:.12,v:.25*v});N(r,t,{type:'lowpass',f:700,to:120,d:.35,v:.3*v,rev:.4});};
IN.mStab=(syn,t,o)=>{const r=R(syn),v=(o.v??.05)*mg('stab',o),d=o.d??.7;
 C(r,t,o.notes,{type:'sawtooth',dets:[-10,10],a:.012,h:.05,d,v,fl:{f:300,pts:[[.035,3800],[d,650]],q:1.4},rev:.38,T:o.T});
 C(r,t,o.notes.filter((m,i)=>i>0).map(m=>m+12),{type:'sawtooth',dets:[-7,7],a:.03,h:.06,d:d*1.3,v:v*.5,formants:[[780,5,1],[1180,6,.7],[2600,7,.25]],rev:.55,T:o.T});};
IN.mPad=(syn,t,o)=>{const r=R(syn),dur=o.dur,a=o.a??Math.min(.5,dur*.3),rel=o.rel??.3,h=Math.max(0,dur-a-rel);
 C(r,t,o.notes,{type:o.type||'sawtooth',dets:o.dets||[-9,9],a,h,d:rel,v:(o.v??.03)*mg('pad',o),lin:o.lin??1,fl:{f:o.f0??700,pts:o.fpts||[[Math.max(.05,dur*.8),o.f1??1600]],q:o.q??.6},duck:o.duck,T:o.T,rev:o.rev??.35,pan:o.pan,dest:null});};
IN.mChoir=(syn,t,o)=>{const r=R(syn),dur=o.dur,a=o.a??.4,rel=o.rel??.4,h=Math.max(0,dur-a-rel);
 C(r,t,o.notes,{type:'sawtooth',dets:[-12,0,12],a,h,d:rel,v:(o.v??.03)*mg('choir',o),lin:1,vib:[5.2,9],formants:o.formants||[[720,4.5,1],[1150,6,.6],[2700,8,.18]],duck:o.duck,T:o.T,rev:o.rev??.5});};
IN.mStr=(syn,t,o)=>{const r=R(syn);C(r,t,[o.m],{type:'sawtooth',dets:[-8,8],a:.008,h:.03,d:o.d??.16,v:(o.v??.05)*mg('str',o),fl:{f:2600,to:1100,q:1},rev:.3,pan:o.pan});};
IN.mLead=(syn,t,o)=>{const r=R(syn),d=o.d??.5,lv=(o.v??.05)*mg('lead',o);C(r,t,[o.m],{type:'sawtooth',dets:[-6,6],a:.03,h:d*.6,d:d*.4+.25,v:lv,vib:[5.5,14],fl:{f:900,pts:[[.06,3200],[d+.2,1400]],q:1.2},rev:.5,T:o.T});
 V(r,t,{type:'triangle',m:o.m+12,a:.02,h:d*.5,d:.3,v:lv*.35,rev:.5});};
IN.mBass=(syn,t,o)=>{const r=R(syn),m=o.m,d=o.d??.2,v=(o.v??.16)*mg('bass',o);
 V(r,t,{type:'sawtooth',m,a:.004,h:d*.3,d:d*.7,v,fl:{f:o.bright?2200:1500,to:210,t:d,q:3}});
 V(r,t,{m:m-12,a:.004,h:d*.4,d:d*.6+.03,v:v*.85});};
IN.mSub=(syn,t,o)=>{const r=R(syn),a=o.a??.05,rel=o.rel??.2,h=Math.max(0,o.dur-a-rel);V(r,t,{m:o.m,a,h,d:rel,v:o.v??.25,lin:1});V(r,t,{type:'triangle',m:o.m+12,a,h,d:rel,v:(o.v??.25)*.22,lin:1,fl:{f:420}});};
IN.mPluck=(syn,t,o)=>{const r=R(syn),v=o.v??.1;V(r,t,{type:'triangle',m:o.m,d:o.d??.4,v,rev:o.rev??.35,pan:o.pan});V(r,t,{m:o.m+12,d:(o.d??.4)*.6,v:v*.35,rev:o.rev??.35,pan:o.pan});};
IN.mArp=(syn,t,o)=>{V(R(syn),t,{type:'square',m:o.m,d:o.d??.13,v:(o.v??.045)*mg('arp',o),fl:{f:3600,to:900,q:2},rev:o.rev??.3,pan:o.pan});};
IN.mBell=(syn,t,o)=>{const r=R(syn),v=o.v??.08,d=o.d??1.6,rv=o.rev??.45,f=hz(o.m);
 V(r,t,{f,a:.002,d,v,rev:rv,pan:o.pan});V(r,t,{f:f*2,a:.002,d:d*.55,v:v*.32,rev:rv,pan:o.pan});V(r,t,{f:f*3.01,a:.002,d:d*.3,v:v*.12,rev:rv,pan:o.pan});};
IN.mGlass=(syn,t,o)=>{const r=R(syn),v=o.v??.07,f=hz(o.m),d=o.d??.7;
 V(r,t,{f,a:.001,d,v,rev:o.rev??0,pan:o.pan});V(r,t,{f:f*2.32,a:.001,d:d*.5,v:v*.45,rev:o.rev??0,pan:o.pan});V(r,t,{f:f*4.25,a:.001,d:d*.25,v:v*.25,rev:o.rev??0,pan:o.pan});};
IN.mWood=(syn,t,o={})=>{const r=R(syn),v=o.v??.2,det=o.det||0;
 V(r,t,{f:1040,det,a:.001,d:.055,v});V(r,t,{f:1040*2.41,det,a:.001,d:.025,v:v*.35});N(r,t,{type:'bandpass',f:2400,q:3,d:.012,v:v*.5});};
IN.mBlip=(syn,t,o)=>{const r=R(syn),f=hz(o.m),v=o.v??.06;V(r,t,{f,to:f*1.9,toT:.05,a:.002,d:.075,v,pan:o.pan});V(r,t,{type:'triangle',f:f*.5,to:f,toT:.05,a:.002,d:.05,v:v*.4,pan:o.pan});};
IN.mType=(syn,t,o={})=>{N(R(syn),t,{type:'bandpass',f:o.f??2700,q:2,d:.018,v:o.v??.05,pan:o.pan||0});};
IN.mDrone=(syn,t,o)=>{const r=R(syn),dur=o.dur,a=o.a??.5,rel=o.rel??.02,h=Math.max(0,dur-a-rel),v=o.v??.15;
 const fs=[[o.f,1,'sine'],[o.f*2,.4,'triangle']];if(o.beat)fs.push([o.f+o.beat,1,'sine']);
 if(o.cluster)for(const f of o.cluster)fs.push([f,o.clusterV??.125,'triangle']);
 for(const[f,k,type]of fs)V(r,t,{f,type,a,h,d:rel,v:v*k,lin:1,fl:type==='triangle'?{f:o.lp??520}:null});};
IN.mRing=(syn,t,o)=>{V(R(syn),t,{m:o.m,a:.04,h:Math.max(0,o.dur-.12),d:.08,v:o.v??.03,lin:1});};
IN.mHeart=(syn,t,o={})=>{const r=R(syn),v=o.v??.5;
 for(const[dt,k]of[[0,1],[.21,.7]]){V(r,t+dt,{f:64,to:42,toT:.14,a:.004,d:.19,v:v*k});V(r,t+dt,{type:'triangle',f:128,to:78,toT:.06,a:.002,d:.08,v:v*k*.4});}};
IN.mPlip=(syn,t,o={})=>{const r=R(syn),v=o.v??.3,f=o.f??420;
 V(r,t,{f,to:f*2.7,toT:.06,a:.002,d:.22,v,rev:o.rev??1});V(r,t,{f:70,to:48,toT:.25,a:.003,d:.32,v:v*(o.sub??1)});};
IN.mBloom=(syn,t,o)=>{o.notes.forEach((m,i)=>IN.mBell(syn,t+i*.06,{m,v:o.v??.06,d:2.2,rev:.7,pan:(i%2?.35:-.35)}));};
IN.mSparkle=(syn,t,o={})=>{const r=R(syn),n=o.n??4,m=o.m??86,v=o.v??.035,st=[0,4,7,12,16,19,24];
 for(let i=0;i<n;i++)V(r,t+i*(o.gap??.045),{type:'triangle',m:m+st[i%st.length],a:.002,d:.22,v:v*(1-i/(n+2)),rev:o.rev??.5,pan:(i%2?.5:-.5)});};
IN.mShimmer=(syn,t,o={})=>{const r=R(syn),base=o.m??84,v=o.v??.03;[0,4,7,12].forEach((s,i)=>V(r,t+i*.05,{m:base+s,a:.08,d:o.d??1.2,v,rev:o.rev??.7,pan:(i%2?.4:-.4)}));};
IN.mCoin=(syn,t,o)=>{const r=R(syn),v=o.v??.05;V(r,t,{type:'square',m:o.m,d:.05,v,fl:{f:5000}});V(r,t+.055,{type:'square',m:o.m+5,d:.22,v:v*.9,fl:{f:5000},rev:.3});};
IN.mJingle=(syn,t,o)=>{const r=R(syn),v=o.v??.06,top=o.top,third=o.minor?3:4,ns=[top-12,top-12+third,top-5,top];
 ns.forEach((m,i)=>{const last=i===3;V(r,t+i*S16,{type:'square',m,d:last?.45:.11,v:v*(last?1.1:.85),fl:{f:4200,to:1800},rev:.3});V(r,t+i*S16,{type:'triangle',m:m+12,d:last?.6:.1,v:v*.5,rev:.4});});
 IN.mGlass(syn,t+.375,{m:top+12,v:v*.9,d:1,rev:.5});IN.mSparkle(syn,t+.4,{m:top+12,n:5,v:v*.45});};
IN.mWhoosh=(syn,t,o={})=>{const r=R(syn),dur=o.dur??.45,a=o.a??dur*.45;
 N(r,t,{type:'bandpass',f:o.f0??600,to:o.f1??4500,toT:dur,q:o.q??1.1,a,d:Math.max(.02,dur-a),v:o.v??.2,pan:o.p0!=null?[o.p0,o.p1??0]:0,panT:dur,rev:o.rev??.15,expA:o.expA,lin:o.lin});};
IN.mRiser=(syn,t,o)=>{const r=R(syn),dur=o.dur,v=o.v??.2;
 N(r,t,{type:'bandpass',f:o.f0??350,to:o.f1??8000,toT:dur,q:1.2,a:dur,d:.012,v,lin:1,expA:1,rev:o.rev??.15});
 V(r,t,{type:'sawtooth',m:o.m0??50,to:hz(o.m1??86),toT:dur,a:dur,d:.012,v:v*.22,lin:1,expA:1,fl:{f:500,to:5000,t:dur}});};
IN.mSnap=(syn,t,o={})=>{const r=R(syn),v=o.v??.2;N(r,t,{type:'highpass',f:2600,d:.03,v});V(r,t,{f:o.up?520:900,to:o.up?2100:600,toT:.06,a:.001,d:.08,v:v*.7,rev:.2});};
IN.mPop=(syn,t,o)=>{const r=R(syn),v=o.v??.07,f=hz(o.m);V(r,t,{f:f*.5,to:f,toT:.03,a:.001,d:.06,v:v*.8,pan:o.pan});IN.mPluck(syn,t+.01,{m:o.m,v,d:.5,rev:.45,pan:o.pan});};
IN.mTick=(syn,t,o)=>{V(R(syn),t,{type:'square',m:o.m??96,a:.001,d:.03,v:o.v??.06,fl:{type:'highpass',f:1800},pan:o.pan});};
IN.mRevTick=(syn,t,o={})=>{const r=R(syn);N(r,t,{type:'bandpass',f:o.f??3200,q:4,a:.09,d:.006,v:o.v??.09,expA:1,lin:1,pan:o.pan||0});};
IN.mTape=(syn,t,o)=>{const r=R(syn);C(r,t,o.notes,{type:'sawtooth',dets:[-8,8],glide:[.25,.22],a:.004,h:.16,d:.1,v:o.v??.04,fl:{f:2600,to:200,t:.26}});};
IN.mSizzle=(syn,t,o={})=>{const r=R(syn),dur=o.dur??.5,v=o.v??.08;N(r,t,{type:'highpass',f:5200,q:.4,a:.01,d:dur,v,lin:1,rate:.8,pan:-.2});N(r,t+.02,{type:'bandpass',f:9000,q:1.5,a:.01,d:dur*.8,v:v*.7,rate:1.3,pan:.2});};
IN.mApplause=(syn,t,o)=>{const r=R(syn),dur=o.dur,v=o.v??.06,rnd=lcg(331);
 N(r,t,{type:'bandpass',f:2300,q:.45,a:dur*.45,h:dur*.25,d:dur*.3,v,lin:1,rev:.4});
 for(let i=0;i<22;i++){const tt=t+dur*(.1+.8*rnd());const k=Math.sin(Math.PI*(tt-t)/dur);N(r,tt,{type:'bandpass',f:1300+rnd()*1800,q:1.6,d:.03,v:v*.9*k,pan:rnd()*1.4-.7});}};
IN.mWhisper=(syn,t,o)=>{const r=R(syn),dur=o.dur??.9,v=o.v??.07;
 N(r,t,{type:'bandpass',f:2700,to:3400,toT:dur,q:5,a:dur,d:.05,v,expA:1,lin:1,pan:[-.5,.5],panT:dur});
 N(r,t,{type:'bandpass',f:1150,to:900,toT:dur,q:7,a:dur,d:.05,v:v*.8,expA:1,lin:1,pan:[.5,-.5],panT:dur});};
IN.mShepard=(syn,t,o)=>{const r=R(syn),ac=r.ac,dur=o.dur,P=o.period??1.5,n=Math.max(1,Math.round(dur/P)),base=o.f??82.41,v=o.v??.05,K=4;
 const lvl=c=>v*(.45+.55*c/n);
 for(let c=0;c<n;c++){const t0=t+c*P,t1=t0+P,last=c===n-1;
  for(let k=0;k<K;k++){const osc=ac.createOscillator();osc.type='triangle';const f0=base*Math.pow(2,k);osc.frequency.setValueAtTime(f0,t0);osc.frequency.exponentialRampToValueAtTime(f0*2,t1);
   const g=ac.createGain(),p=g.gain,g0=k===0?1e-4:lvl(c),g1=k===K-1?1e-4:lvl(c+1);p.setValueAtTime(g0,t0);
   if(last){p.linearRampToValueAtTime(g1,t1-.015);p.linearRampToValueAtTime(0,t1);}else p.linearRampToValueAtTime(g1,t1);
   osc.connect(g);out(r,g,t0,{pan:(k%2?.25:-.25)});osc.start(t0);osc.stop(t1+.01);}}};
IN.mRattle=(syn,t,o={})=>{const r=R(syn),v=o.v??.16;
 [[0,1],[.045,.7],[.085,.85],[.14,.6],[.2,.45]].forEach(([dt,k],i)=>{N(r,t+dt,{type:'bandpass',f:3000+i*260,q:6,d:.045,v:v*k,pan:(i%2?.3:-.3)});V(r,t+dt,{f:1900+i*170,a:.001,d:.05,v:v*k*.35});});
 V(r,t,{f:120,to:70,toT:.08,a:.002,d:.12,v:v*1.4});V(r,t+.085,{f:110,to:70,toT:.08,a:.002,d:.1,v:v});};
IN.mSkid=(syn,t,o={})=>{N(R(syn),t,{type:'bandpass',f:2200,to:600,toT:.3,q:2.5,a:.01,d:.3,v:o.v??.1,pan:[.6,0],panT:.3});};
IN.mTap=(syn,t,o={})=>{const r=R(syn),v=o.v??.25;N(r,t,{type:'highpass',f:3200,d:.012,v});V(r,t,{f:1150,to:640,toT:.05,a:.001,d:.07,v:v*.8});V(r,t,{f:180,to:90,toT:.06,a:.002,d:.1,v:v*.9});V(r,t+.1,{f:900,to:1300,toT:.04,a:.001,d:.05,v:v*.35});};
IN.mTrem=(syn,t,o)=>{const r=R(syn),ac=r.ac,dur=o.dur,end=t+dur;
 const lfo=ac.createOscillator();lfo.frequency.setValueAtTime(o.rate??8,t);const lg=ac.createGain();lg.gain.value=.5;lfo.connect(lg);
 const trem=ac.createGain();trem.gain.value=.5;lg.connect(trem.gain);lfo.start(t);lfo.stop(end+.03);
 const mix=ac.createGain();for(const m of o.notes)for(const dt of[-8,8]){const os=ac.createOscillator();os.type='sawtooth';os.frequency.value=hz(m);os.detune.value=dt;os.connect(mix);os.start(t);os.stop(end+.03);}
 const f=filt(ac,mix,t,{f:o.f0??300,to:o.f1??1800,t:dur,q:1.2},dur);const g=ac.createGain();env(g.gain,t,dur-.02,0,.015,o.v??.05,1,1);
 f.connect(trem);trem.connect(g);out(r,g,t,{});};

/* ── Score ──────────────────────────────────────────────────────── */
const cues=[];
const at=(t,type,o={})=>{if(t<0||t>=59.999)return;cues.push({t:Math.round(t*1e4)/1e4,type,args:[Object.assign({},o,{T:t})]});};
const kick=(t,v=1)=>{KICKS.push(t);at(t,'mKick',{v});};
const dk=t=>{let g=1;for(const i of IMPACTS){if(t<i-1e-6||t>i+.8)continue;g=Math.min(g,t<i+.35?.7:.7+.3*(t-i-.35)/.45);}return g;};
const Q={maj:[0,4,7],min:[0,3,7],dom7:[0,4,7,10],sus4:[0,5,7],add9:[0,4,7,14]};
const voice=(root,q,lo=57)=>{const base=lo+(((root-lo)%12)+12)%12;return Q[q].map(i=>base+i);};
const range=(a,b,step,fn)=>{for(let t=a,i=0;t<b-1e-6;t=a+(++i)*step)fn(Math.round(t*1e4)/1e4,i);};

/* 0.0–3.0 GRIND · D minor · no drums, everything DRY and cut dead at 3.0 */
at(0,'mDrone',{f:73.42,beat:.7,dur:3,v:.105,a:.7,rel:.012});
at(0,'mPad',{notes:[50,53,57,62],dur:3,v:.016,a:.9,rel:.012,f0:260,f1:400,rev:0,dets:[-7,7]});
range(0,3,B,(t,i)=>at(t,'mWood',{v:.15+.03*i,det:i%2?-14:9}));
range(2.25,3,B,(t,i)=>at(t,'mWood',{v:.17+.02*i,det:i%2?18:-6}));
{const sc=[74,76,77,79,81,82];let i=0;for(let t=0;t<3-1e-6;t+=(t<1-1e-6?S8:S16),i++){const b=Math.min(5,Math.floor(t/B+1e-6));at(t,'mBlip',{m:sc[b]+(t>=2?(i%3)*5:0),v:(.045+.012*b)*(t>=2?.7:1),pan:t>=2?((i*7)%5-2)*.3:(i%2?.2:-.2)});}}
range(2,3,S16,(t,i)=>{at(t+.06,'mType',{v:.035+.002*i,pan:((i*3)%7-3)*.25,f:2300+((i*37)%9)*120});});
at(.93,'mWhoosh',{dur:.22,a:.07,v:.12,f0:1400,f1:5200,p0:-.7,p1:.7,rev:0});
at(1,'mHeart',{v:.32});
at(2,'mRiser',{dur:1,v:.2,rev:0,f0:300,f1:7000,m0:45,m1:74});
at(2,'mWhoosh',{dur:.55,a:.2,v:.14,f0:250,f1:900,q:.8,rev:0});
/* 3.0–3.5 HUSH · a thin D6 ring only (≈ −30 dB) */
at(3,'mRing',{m:86,dur:.5,v:.022});

/* 3.5–6.5 TURN · D major, pad opens 400 Hz → 6 kHz, band out at 6.5 */
at(3.5,'mPlip',{v:.32});
at(3.5,'mBloom',{notes:[74,78,81,88],v:.05});
at(3.5,'mPad',{notes:[50,57,62,66,69,76],dur:3,v:.017,a:.6,rel:.05,f0:400,fpts:[[2.95,6000]],rev:.4,duck:.5});
at(3.5,'mSub',{m:38,dur:3,v:.2,a:1.4,rel:.05});
{const tops=[76,78,79,81,83];range(4,6.5,S16,(t,i)=>{const b=Math.floor(i/4),k=i%4;at(t,'mPluck',{m:k===3?tops[b]:[62,66,69][k],v:.05+.008*b+(k===0?.015:0),d:.3,rev:.4,pan:(k%2?.35:-.35)});});}
kick(5,.8);kick(5.5,.85);kick(6,.9);
range(5,6.5,S8,(t,i)=>at(t,'mBass',{m:38,d:.2,v:.1+.015*i}));
at(5.5,'mSnare',{v:.14});at(5.75,'mSnare',{v:.17});
range(6,6.5,S16,(t,i)=>at(t,'mSnare',{v:.2+.06*i}));
at(5,'mRiser',{dur:1.5,v:.2,m0:50,m1:86});
at(6,'mWhoosh',{dur:.5,a:.45,v:.18,f0:5000,f1:500,q:1.4,expA:1});
/* 6.5–7.0 BREATH · reverse cymbal alone */
at(6.5,'mRevCym',{dur:.5,v:.3});

/* 7.0–10.0 DROP 1 / TITLE · D (7) Bm (8) G (9) */
at(7,'mBoom',{v:1});KICKS.push(7);
at(7,'mStab',{notes:[38,45,50,57,62],v:.06,d:1});
at(7.04,'mSparkle',{m:86,n:7,v:.035,gap:.04});
range(7.5,8.25,S16,(t,i)=>at(t,'mCoin',{m:[81,83,85,86,88,90][i],v:.035}));
[[7,[50,57,62,66,69],38],[8,[47,54,59,62,66],35],[9,[43,55,59,62,67],31]].forEach(([t,ns,b])=>{
 at(t,'mPad',{notes:ns,dur:1,v:.022,a:t===7?.02:.06,rel:.12,f0:1300,f1:2600,duck:.5,rev:.4});
 at(t,'mChoir',{notes:ns.slice(2).map(m=>m),dur:1,v:.011,a:.12,rel:.2});
 at(t,'mSub',{m:b+12,dur:1,v:.22,a:.01,rel:.08});});
at(8,'mImpact',{v:.55});at(8,'mStab',{notes:[47,54,59,62,66],v:.042,d:.55});
range(8,10,B,(t,i)=>{kick(t,.85);at(t+S8,'mHat',{open:1,v:.05*dk(t+S8)});});
range(8,9.5,S8,(t,i)=>at(t,'mBass',{m:[38,35][Math.floor((t-8)+1e-6)]||31,d:.2,v:.12*dk(t)}));
at(9,'mHeart',{v:.42});
at(9,'mRiser',{dur:1,v:.2,m0:55,m1:86});
range(9.5,10,S16,(t,i)=>at(t,'mSnare',{v:.2+.07*i}));
at(9.5,'mWhoosh',{dur:.5,a:.45,v:.2,f0:500,f1:6000,p0:.2,p1:-.85});

/* 10.0–34.0 QUEST RUN · D major, 2 bars per lesson, roots climb D E F# G A B */
const L=[{r:38,q:'maj'},{r:40,q:'min'},{r:42,q:'min'},{r:43,q:'maj'},{r:45,q:'maj'},{r:47,q:'min'}];
const LOOT=[13,17,21,25,29,32.5],TOP=[74,76,78,79,81,83],LOOTMIN=[0,1,1,0,0,0];
for(let l=0;l<6;l++){
 const Ls=10+4*l;
 // lesson downbeat: crash + impact + brass stab on the climbing root
 KICKS.push(Ls);at(Ls,'mKick',{v:1});at(Ls,'mImpact',{v:.75,crash:.2});
 const st=voice(L[l].r,L[l].q,57);at(Ls,'mStab',{notes:[L[l].r,L[l].r+7,...st],v:.045,d:.6});
 at(Ls,'mWhoosh',{dur:.3,a:.015,v:.12,f0:4200,f1:700,p0:.8,p1:0});
 at(Ls+3.5,'mWhoosh',{dur:.5,a:.44,v:.17,f0:400,f1:5200,p0:0,p1:-.85});
 for(let bar=0;bar<2;bar++){
  const t0=Ls+bar*2,last=l===5&&bar===1;
  const ch=bar===0?L[l]:(l===5?{r:47,q:'dom7'}:{r:45,q:'maj'});
  const root=ch.r,tones=voice(root,ch.q,57);
  const gap=t=>(t>=15.5&&t<15.75)||(t>=33.5);
  // drums
  range(t0,t0+2,B,(t,i)=>{if(!(i===0&&bar===0)&&!gap(t)&&!(last&&t>33.25))kick(t,.92);
   if((i===1||i===3)&&!gap(t))at(t,'mClap',{v:.3});
   if(!gap(t+S8))at(t+S8,'mHat',{open:1,v:(.05+.004*l)*dk(t+S8),pan:.15});});
  if(l>=2)range(t0,t0+2,S16,(t,j)=>{if(j%4!==2&&!gap(t))at(t,'mHat',{v:(j%4===0?.035:.026)*dk(t),pan:-.2});});
  // 8th plucked bass (octave jumps from L3)
  range(t0,t0+2,S8,(t,j)=>{if(gap(t))return;at(t,'mBass',{m:root+(l>=2&&j%2?12:0),d:.2,v:(.14+.006*l)*dk(t),bright:l>=3});});
  // pad (kick-ducked)
  at(t0,'mPad',{notes:tones,dur:(l===1&&bar===1)?1.5:(last?1.5:2),v:.016+.0015*l,a:.06,rel:(l===1&&bar===1)?.06:.25,f0:900,f1:1900+250*l,duck:.45,rev:.35});
  // L4 string ostinato (8ths)
  if(l>=3){const pat=[0,2,1,2,0,2,1,2];range(t0,t0+2,S8,(t,j)=>{if(gap(t))return;const tn=voice(root,ch.q,62);at(t,'mStr',{m:tn[pat[j]%tn.length]+(j%4===2?12:0),v:.026*dk(t),pan:(j%2?.3:-.3)});});}
  // L5 lead arp (16ths)
  if(l>=4){const tn=voice(root,ch.q,69);const pat=[0,1,2,1,2,0,1,2];range(t0,t0+2,S16,(t,j)=>{if(gap(t))return;at(t,'mArp',{m:tn[pat[j%8]]+(j%8>=4?12:0),v:.022*dk(t),pan:(j%2?.4:-.4)});});}
  // L6 choir pad
  if(l>=5)at(t0,'mChoir',{notes:voice(root,ch.q,64),dur:last?1.5:2,v:.012,a:.25,rel:.3,duck:.6});
 }
 // loot: level-up jingle, top note climbs D5 → B5
 at(LOOT[l],'mJingle',{top:TOP[l],minor:LOOTMIN[l],v:.05});
}
// L1 ear candy: plucks D F# A as the ingredients land, Markdown bars type, wax seal
[[10.5,62],[11,66],[11.5,69]].forEach(([t,m])=>{at(t,'mPluck',{m:m+12,v:.07,d:.6});at(t,'mPop',{m:m+24,v:.03});});
at(11.5,'mShimmer',{m:86,v:.016,d:.8});
at(12,'mShimmer',{m:81,v:.02});range(12,12.375+1e-3,S16,t=>at(t,'mType',{v:.06,f:3200}));
at(12.5,'mThunk',{v:.6});at(12.5,'mSnap',{v:.12});at(12.52,'mSparkle',{m:86,n:5,v:.025});
// L2: spoon-drip plink, paint-in, tape-stop (the wrong taste), pulse back, snap into focus ✓
at(14.5,'mPlip',{v:.12,f:900,sub:.25,rev:.6});at(14.52,'mGlass',{m:93,v:.03,rev:.4});
at(15,'mShimmer',{m:84,v:.02});
at(15.5,'mTape',{notes:[50,57,62,66],v:.05});
at(16,'mWhoosh',{dur:.25,a:.2,v:.1,f0:900,f1:3000,p0:.4,p1:-.4});at(16.05,'mType',{v:.07});at(16.18,'mType',{v:.06});
at(16.5,'mSnap',{v:.18,up:1});at(16.55,'mGlass',{m:83,v:.05,rev:.4});at(16.68,'mGlass',{m:88,v:.06,rev:.45});at(16.52,'mSparkle',{m:88,n:4,v:.022});
// L3: sizzle, pour, toss, landing + play click, 10 progress ticks, slash
at(18,'mSizzle',{dur:.45,v:.07});at(18.5,'mSizzle',{dur:.7,v:.07});at(18.5,'mPlip',{v:.08,f:300,sub:.3,rev:.4});
at(19,'mWhoosh',{dur:.5,a:.3,v:.15,f0:400,f1:4500});
at(19.5,'mThunk',{v:.55});at(19.5,'mTap',{v:.12});
range(19.5,20.75,S16,(t,i)=>at(t,'mTick',{m:84+i,v:.03,pan:-.5+i*.1}));
at(20.5,'mSnap',{v:.16});at(20.5,'mWhoosh',{dur:.2,a:.03,v:.1,f0:5000,f1:1500});
// L4: prism fan-out, five pentatonic pops, threads pulse on each beat
at(22.5,'mShimmer',{m:88,v:.022});at(22.5,'mGlass',{m:91,v:.04,rev:.5});
[79,81,83,86,91].forEach((m,i)=>at(23+i*S8,'mPop',{m,v:.05,pan:-.6+.3*i}));
[24,24.5,25.5].forEach(t=>at(t,'mPluck',{m:86,v:.025,d:.5,rev:.5}));
// L5: shaker on each beat, chip snaps + ♪ motif, agent awakens
range(26,28,B,t=>at(t,'mShaker',{v:.06}));
[[26.5,81,86],[27,85,88],[27.5,88,93]].forEach(([t,a,b])=>{at(t,'mSnap',{v:.14});at(t+S16,'mLead',{m:a,d:.1,v:.03});at(t+S8,'mLead',{m:b,d:.18,v:.034});});
at(27.6,'mWhoosh',{dur:.4,a:.38,v:.1,f0:5000,f1:800,expA:1});at(28,'mBlip',{m:81,v:.06});at(28.12,'mBlip',{m:88,v:.06});at(28,'mShimmer',{m:84,v:.02});
// L6: plate skid, cloche light, page blocks snap, devices light up, overload → implosion
at(30.02,'mSkid',{v:.09});
at(30.5,'mShimmer',{m:86,v:.025});at(30.5,'mGlass',{m:76,v:.03,d:1.2,rev:.5});
range(31,31.5,S16,(t,i)=>at(t,'mSnap',{v:.1+.015*i}));
at(31.5,'mTap',{v:.18});[31.5,31.56,32,32.06].forEach((t,i)=>at(t,'mPop',{m:[86,90,88,93][i],v:.035,pan:i%2?.5:-.5}));
at(32.6,'mSparkle',{m:95,n:6,v:.03});
range(33,33.5+1e-3,S16,(t,i)=>at(t,'mTick',{m:88+2*i,v:.05}));
range(33,34,S16,(t,i)=>at(t,'mSnare',{v:.13+.028*i}));
at(33,'mRiser',{dur:1,v:.18,m0:59,m1:95});
at(33.5,'mRevCym',{dur:.5,v:.3});

/* 34.0–44.5 LIFE · lift to E major, half-time */
at(34,'mBoom',{v:.85,warm:1,tail:2});KICKS.push(34);
const LIFE=[[34,2,40,'maj',40],[36,1.5,47,'maj',47],[37.5,2.5,49,'min',49],[40,1,45,'maj',45],[41,1,40,'maj',44],[42,1,45,'maj',45],[43,1.5,47,'sus4',47]];
LIFE.forEach(([t,d,root,q,bass],k)=>{
 const tn=voice(root,q,59),lastC=k===LIFE.length-1;
 at(t,'mPad',{notes:[root+12,...tn],dur:d,v:.019,a:.08,rel:lastC?.06:.25,f0:1200,fpts:lastC?[[.3,2600],[1,2600],[1.5,140]]:[[d*.8,2800]],duck:.65,rev:.45});
 range(t,t+d,S8,(tt,j)=>{if(tt>=44)return;at(tt,'mBass',{m:bass,d:j%2?.18:.32,v:.15*dk(tt),bright:1});});
 range(t,t+d,S8,(tt,j)=>{if(tt>=44||tt<35.5)return;const ar=voice(root,q,71);at(tt,'mBell',{m:ar[j%3]+(j%4===3?12:0),v:.018*dk(tt),d:.6,rev:.4,pan:j%2?.4:-.4});});
 if(t>=37.5)at(t,'mChoir',{notes:voice(root,q,64),dur:d,v:.014,a:t===37.5?.5:.12,rel:lastC?.06:.2,duck:.7,rev:.6,formants:lastC?[[700,4.5,1],[1100,6,.5]]:undefined});
});
[34,36,37.5,38,40,42].forEach(t=>kick(t,t===37.5?.9:1));[35.25,39.25,41.25].forEach(t=>kick(t,.6));
[35,37,39,41,43].forEach(t=>at(t,'mSnare',{v:.36,big:1}));
range(34,44,S8,(t,i)=>at(t,'mHat',{open:i%2,v:(i%2?.045:.03)*dk(t),pan:i%2?.2:-.2}));
at(37.5,'mCrash',{v:.12});
range(34,35.5,S16,(t,i)=>at(t,'mRevTick',{v:.07,f:i%2?2800:3600,pan:i%2?.3:-.3}));
at(35.5,'mTap',{v:.14});at(35.5,'mShimmer',{m:88,v:.022,d:1.6});
[76,78,80,83,85,88].forEach((m,i)=>{const t=37.5+i*B;at(t,'mPop',{m,v:.05,pan:-.5+.2*i});at(t+.02,'mSparkle',{m:m+12,n:3,v:.014});});
[[40,85,.45],[40.5,83,.45],[41,88,.9],[42,85,.45],[42.5,83,.45],[43,83,.9]].forEach(([t,m,d])=>at(t,'mLead',{m,d,v:.032}));
at(41,'mThunk',{v:.5});
at(41.5,'mApplause',{dur:2,v:.05});[88,92,95].forEach((m,i)=>at(41.5+i*.09,'mBell',{m,v:.03,d:1.4,rev:.6}));
at(44,'mWhoosh',{dur:.5,a:.05,v:.12,f0:3000,f1:200,q:.8,rev:.1});

/* 44.5–51.5 SECRET · E minor colour, drums out, DRY so 51.5 cuts to true silence */
at(44.5,'mDrone',{f:82.41,dur:3.6,v:.11,a:.9,rel:.4,cluster:[87.31,174.61],clusterV:.13,lp:600});
at(47.7,'mDrone',{f:82.41,dur:3.8,v:.13,a:.4,rel:.015,cluster:[87.31,174.61],clusterV:.15,lp:900});
at(44.5,'mPad',{notes:[52,55,59],dur:3.6,v:.01,a:1.4,rel:.4,f0:500,f1:900,rev:0,type:'triangle'});
at(48,'mChoir',{notes:[52,59,64,67],dur:3.5,v:.009,a:1.2,rel:.015,rev:0,formants:[[650,5,1],[1050,7,.4]]});
[44.5,45.5,46.5,47.5].forEach(t=>at(t,'mHeart',{v:.42}));
range(48,51.01,B,(t,i)=>at(t,'mHeart',{v:.42+.03*i}));
range(45,46.25+1e-3,S8,(t,i)=>at(t,'mGlass',{m:93+(i%2?2:0),v:.022,d:.25,pan:-.4+.16*i}));
at(46.5,'mWhisper',{dur:.9,v:.08});
at(47,'mWhoosh',{dur:.9,a:.12,v:.15,f0:5000,f1:250,q:.9,rev:0});at(47,'mThunk',{v:.3});
at(47,'mShepard',{dur:4.5,v:.045,period:1.5});
at(48,'mTrem',{notes:[40,47],dur:3.5,v:.035,f0:250,f1:1600,rate:8});
range(48,50.5+1e-3,B,(t,i)=>at(t,'mGlass',{m:88+i,v:.05,d:.6,pan:[-.6,.6,-.4,.4,-.2,0][i]}));
at(50.5,'mBell',{m:76,v:.05,d:.9,rev:0});at(50.5,'mShimmer',{m:88,v:.012,d:.8,rev:0});
at(51,'mRattle',{v:.17});

/* 51.5–52.0 SILENCE — nothing scheduled */

/* 52.0–56.0 DROP 2 / FINALE · E major, the biggest hit, full band */
at(52,'mBoom',{v:1.12,tail:1.6});KICKS.push(52);at(52,'mSnap',{v:.18});
at(52,'mStab',{notes:[40,47,52,56,59],v:.05,d:.45});at(52.375,'mStab',{notes:[47,54,59,63,66],v:.045,d:.35});at(52.75,'mStab',{notes:[52,59,64,68,71],v:.05,d:.6});
at(52.02,'mSparkle',{m:88,n:7,v:.03,gap:.04});at(54.02,'mSparkle',{m:91,n:7,v:.03,gap:.04});at(54,'mCrash',{v:.12});
at(52.5,'mShimmer',{m:88,v:.02});
[[52,40,'maj'],[53,49,'min'],[54,45,'maj'],[55,47,'maj']].forEach(([t,root,q])=>{
 const tn=voice(root,q,59);
 at(t,'mPad',{notes:[root+12,...tn],dur:1,v:.02,a:t===52?.02:.04,rel:t===55?.25:.12,f0:1500,f1:3200,duck:.45,rev:.4});
 at(t,'mChoir',{notes:voice(root,q,64),dur:1,v:.012,a:.08,rel:.15,duck:.6});
 range(t,t+1,S8,(tt,j)=>{if(tt>=55.5)return;at(tt,'mBass',{m:root>=47?root-12:root,d:.2,v:.16*dk(tt),bright:1});});
 const ar=voice(root,q,71);range(t,t+1,S16,(tt,j)=>{if(tt>=55.5)return;at(tt,'mArp',{m:ar[[0,1,2,1][j%4]]+(j>=4?12:0),v:.022*dk(tt),pan:j%2?.4:-.4});});
 range(t,t+1,S8,(tt,j)=>{if(tt>=55.5)return;const sn=voice(root,q,64);at(tt,'mStr',{m:sn[[0,2,1,2][j%4]],v:.026*dk(tt),pan:j%2?.3:-.3});});
});
range(52,55.5,B,(t,i)=>{if(i>0)kick(t,.95);if(i%2)at(t,'mClap',{v:.32});});
range(52,55.5,S16,(t,j)=>at(t,'mHat',{open:j%4===2,v:(j%4===2?.05:.03)*dk(t),pan:j%2?.2:-.2}));
at(55,'mWhoosh',{dur:.4,a:.25,v:.08,f0:800,f1:2500,p0:.6,p1:.1});
at(55.5,'mTap',{v:.3});at(55.5,'mWhoosh',{dur:.5,a:.46,v:.14,f0:600,f1:5500,expA:1});at(55.5,'mRevCym',{dur:.5,v:.18});

/* 56.0–60.0 OUTRO · clover locks on Eadd9, drums stop, arp slows, dry tail to silence */
at(56,'mImpact',{v:.7,rev:.3});KICKS.push(56);
[64,68,71,78].forEach((m,i)=>at(56+i*.03,'mBell',{m,v:.045,d:2.2,rev:.3,pan:(i%2?.3:-.3)}));
at(56,'mPad',{notes:[52,59,64,66,68,71],dur:3.3,v:.015,a:.03,rel:2.3,lin:0,f0:2400,f1:900,rev:0});
at(56,'mSub',{m:40,dur:2.2,v:.2,a:.02,rel:1.4});
[56,56.25,56.5,56.75].forEach((t,i)=>at(t,'mSparkle',{m:88+[0,2,4,7][i],n:3,v:.02,rev:i<2?.3:0}));
{const ns=[76,80,83,90];let i=0;
 range(56,57,S16,t=>{at(t,'mArp',{m:ns[i%4],v:.026-.001*i,rev:t<56.5?.3:0,pan:i%2?.4:-.4});i++;});
 range(57,58,S8,t=>{at(t,'mArp',{m:ns[i%4],v:.018,rev:0,d:.2,pan:i%2?.4:-.4});i++;});
 range(58,59.5,B,(t,k)=>{at(t,'mPluck',{m:ns[i%4],v:.04-.008*k,d:.5,rev:0});i++;});}
at(58,'mShimmer',{m:83,v:.02,d:1.4,rev:0});
at(58,'mPad',{notes:[76,83,88,92],dur:1.7,v:.008,a:.6,rel:1,lin:0,f0:3000,f1:1500,rev:0,type:'triangle'});
at(59.5,'mPluck',{m:40,v:.1,d:.36,rev:0});

TR.addCues(cues);
TR.scoreInfo={cues:cues.length,kicks:KICKS.length};
})();
