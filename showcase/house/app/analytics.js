import {FEATURES,SIGNALS,ANALYTICS_KEY,OPT_OUT_KEY,sourceOf,createActivityClock} from './analytics-contract.js';
const ENDPOINT='/api/house-stats';
const noop={use(){},signal(){},transition(){},ready(){}};
export function createHouseAnalytics(options={}) {
 try{return initialize(options);}catch{return noop;}
}
function initialize({enabled=/^(www\.)?myclover\.com$/.test(location.hostname)||(location.hostname==='127.0.0.1'&&globalThis.__houseStatsPreview===true)}={}){
 let disabled=false;try{disabled=localStorage.getItem(OPT_OUT_KEY)==='1';}catch{}
 if(!enabled||disabled||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return noop;
 let visitor=crypto.randomUUID();
 try{
  const saved=JSON.parse(localStorage.getItem(ANALYTICS_KEY)||'null');
  if(saved?.expires>Date.now()&&/^[a-f0-9-]{36}$/i.test(saved.id))visitor=saved.id;
  else localStorage.setItem(ANALYTICS_KEY,JSON.stringify({id:visitor,expires:Date.now()+180*86400000}));
 }catch{} // Without storage, visitors are only deduplicated within this page.
 const data={visit:crypto.randomUUID(),visitor,seq:0,activeSeconds:0,...sourceOf(document.referrer,location.search,location.hostname),
  device:matchMedia('(pointer:coarse)').matches?(innerWidth>=768?'tablet':'mobile'):'desktop',counts:{},exposures:{},signals:{},rooms:{},readyMs:null};
 const clock=createActivityClock(undefined,!document.hidden);
 let stopped=false,dirty=true,inflight=false,timer=0,attempts=0,lastSentActive=-1;
 const timers=[];
 function flush(beacon=false){
  if(stopped)return;
  data.activeSeconds=Math.min(14400,clock.seconds());
  if(!dirty&&data.activeSeconds===lastSentActive)return;
  if(inflight&&!beacon)return;
  data.seq++;const body=JSON.stringify(data);dirty=false;lastSentActive=data.activeSeconds;
  if(beacon&&navigator.sendBeacon?.(ENDPOINT,new Blob([body],{type:'application/json'})))return;
  inflight=true;
  fetch(ENDPOINT,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body,keepalive:true})
   .then(async response=>{if(response.ok){attempts=0;const result=await response.json();if(result.ignored)stop();}
    else {dirty=true;if(response.status===429||++attempts>=3)stop();}})
   .catch(()=>{dirty=true;if(++attempts>=3)stop();}).finally(()=>{inflight=false;});
 }
 function soon(){dirty=true;if(!timer)timer=setTimeout(()=>{timer=0;flush();},1800);}
 function expose(key){if(!data.exposures[key]){data.exposures[key]=1;dirty=true;}}
 function use(key){if(stopped||!FEATURES[key])return;clock.activity();expose(key);data.counts[key]=Math.min(1000,(data.counts[key]||0)+1);soon();}
 function signal(key){if(stopped||!SIGNALS.includes(key)||data.signals[key])return;data.signals[key]=1;soon();}
 function transition(event,before,after){
  if(stopped)return;
  const map={VIEW:()=>{if(before.view!==after.view){use(after.view==='exploded'?'exploded':'floor');}},
   SELECT_ROOM:()=>{if(after.selectedRoomId&&before.selectedRoomId!==after.selectedRoomId){use('rooms');data.rooms[after.selectedRoomId]=Math.min(1000,(data.rooms[after.selectedRoomId]||0)+1);}},
   LENS:()=>{if(before.lens!==after.lens)use(after.lens);},
   RENDER_MODE:()=>{if(before.renderMode!==after.renderMode)use(after.renderMode);},
   WALL:()=>{if(before.wallMode!==after.wallMode)use('walls');},BUILTINS:()=>use('layers'),FURNITURE:()=>use('layers'),GRID:()=>use('layers'),ISOLATE:()=>use('isolate')};
  map[event.type]?.();
 }
 const actions={'reset':'reset','ceiling':'ceiling','settings':'settings','photo-prev':'photo','photo-next':'photo','photo-fullscreen':'photo','plan-plus':'plan','plan-minus':'plan','plan-reset':'plan','inside':'inside','tour':'tour','help':'help','about':'story','learn':'learn','focus-view':'focus','camera-iso':'camera','camera-top':'camera','camera-front':'camera','zoom-in':'camera','zoom-out':'camera','rotate':'camera'};
 const feature=el=>{
  if(el.matches('a[href]')){try{const u=new URL(el.href);if(/^(www\.)?myclover\.com$/.test(u.hostname)&&u.pathname==='/ai-source/')return 'course';}catch{}}
  if(el.dataset.renderMode)return el.dataset.renderMode;
  if(el.dataset.wallMode)return 'walls';
  if(el.dataset.room)return 'rooms';
  if(el.dataset.lens)return el.dataset.lens;
  if(el.dataset.view)return el.dataset.view==='exploded'?'exploded':'floor';
  if(el.dataset.photoSet)return 'photo';
  if(el.dataset.action==='isolate')return 'isolate';
  if(['layer-builtins','layer-furniture','layer-grid'].includes(el.dataset.action))return 'layers';
  return actions[el.dataset.action];
 };
 function click(event){
  if(event.type==='auxclick'&&event.button!==1)return;
  const el=event.target.closest('button,a,polygon[data-room]');if(!el)return;
  const key=feature(el);
  if(key==='course'){use('course');flush(true);}
  else if(actions[el.dataset.action])use(actions[el.dataset.action]);
 }
 function visible(el){
  if(el.closest('[hidden],[inert]')||el.disabled)return false;
  const style=getComputedStyle(el);if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)return false;
  const r=el.getBoundingClientRect(),x=Math.max(0,r.left)+(Math.min(innerWidth,r.right)-Math.max(0,r.left))/2,
   y=Math.max(0,r.top)+(Math.min(innerHeight,r.bottom)-Math.max(0,r.top))/2;
  if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return false;
  const top=document.elementFromPoint(x,y);return top===el||el.contains(top);
 }
 function scan(){
  if(document.hidden||stopped)return;
  for(const el of document.querySelectorAll('button,a[href],polygon[data-room]')){const key=feature(el);if(key&&!data.exposures[key]&&visible(el))expose(key);}
  const scene=document.querySelector('#scene canvas');if(scene&&document.querySelector('#app')?.dataset.ready==='true'&&visible(scene))expose('camera');
 }
 const activity=()=>clock.activity();
 const visibility=()=>{clock.visibility(!document.hidden);if(document.hidden)flush(true);};
 const pagehide=()=>flush(true);
 let drag=null,wheelAt=-Infinity;
 const pointerdown=e=>{if(e.target.matches('#scene canvas'))drag={id:e.pointerId,x:e.clientX,y:e.clientY};};
 const pointerup=e=>{if(drag&&drag.id===e.pointerId&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)use('camera');drag=null;};
 const wheel=e=>{if(e.target.matches('#scene canvas')&&performance.now()-wheelAt>800){wheelAt=performance.now();use('camera');}};
 const keydown=e=>{if(e.target.closest('#scene')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','q','e','+','-','='].includes(e.key))use('camera');};
 const listeners=[[document,'click',click,true],[document,'auxclick',click,true],[document,'pointerdown',activity,true],[document,'keydown',activity,true],
  [document,'pointerdown',pointerdown,true],[document,'pointerup',pointerup,true],[document,'pointercancel',()=>{drag=null;},true],
  [document,'wheel',activity,{passive:true}],[document,'pointermove',event=>{if(event.buttons)clock.activity();},{passive:true}],[document,'wheel',wheel,{passive:true}],[document,'keydown',keydown,false],[document,'visibilitychange',visibility,false],[window,'pagehide',pagehide,false]];
 function stop(){stopped=true;clearTimeout(timer);timers.forEach(clearInterval);for(const args of listeners)args[0].removeEventListener(...args.slice(1));}
 for(const args of listeners)args[0].addEventListener(...args.slice(1));
 timers.push(setInterval(()=>{clock.seconds();scan();},1000),setInterval(()=>flush(),15000));
 flush();
 return {use,signal,transition,ready(ms){if(data.readyMs===null)data.readyMs=Math.min(120000,Math.round(ms));signal('model_ready');}};
}
