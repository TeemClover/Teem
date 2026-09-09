import { createTelemetry } from '../assets/front-door/telemetry.js';
import { createFlow, prototypeStorage } from './flow.js';
import { createUnderpaper, position } from './underpaper.js';
import { createPaperCrossing } from './paper-crossing.js';
import { createPathRuntime } from './path-runtime.js';
import { createMotionPreference, createOpeningFilm } from './motion.js';
const $ = value => document.querySelector(value);
const field=$('#playfield'), paper=$('#film-space'), film=$('#opening-film'), instrument=$('#instrument');
const underpaper=createUnderpaper($('#underpaper'));
function storage(name){try{return prototypeStorage(globalThis[name]);}catch{return null;}}
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const motion=createMotionPreference({reduced:preference.matches,saveData:navigator.connection?.saveData});
const openingFilm=createOpeningFilm(film);
let audioOn=false,audio,assetsPromise,criticalReady=false;
let cursor=position(.44,.55),gesture=null,generation=0,hintTimer,hasExplored=false,crossingTip=null,crossingHintTimer,pathRuntime;
const deviceContext={viewport:innerWidth<600?'mobile':innerWidth<1024?'tablet':'desktop',graphicsTier:motion.enabled?'premium':'essential',motion:motion.enabled?'full':'reduced',audio:'muted'};
const telemetry=createTelemetry({
 storage:storage('localStorage'),sessionStorage:storage('sessionStorage'),
 ...(document.querySelector('meta[name="frontdoor-telemetry"]')?.content==='local'?{enabled:true,env:'local'}:{}),
 context:deviceContext,
});
const flow=createFlow(telemetry);telemetry.open();
const crossing=createPaperCrossing($('#paper-crossing'),$('#paper-clean'),{
 onTip(p){
  crossingTip=p;placeCrossing();if(crossing.model.phase==='drawing'||crossing.settling){placeArtifact();underpaper.activity();}
  if(crossing.model.phase==='drawing'){instrument.setAttribute('aria-valuenow',String(Math.round(p.x*100)));instrument.setAttribute('aria-valuetext',`รอยพับอยู่ตำแหน่ง ${Math.round(p.x*100)}, ${Math.round(p.y*100)} กด Enter เพื่อวาง`);}
 },
 onPaint(revision){
  if(!flow.crossing({revision,painted:true,visible:!document.hidden}))return;
  cursor=position(crossing.model.tip.x,crossing.model.tip.y);reflect();
  syncCrossing();$('#crossing-hint').hidden=false;$('#crossing-hint').textContent='ทางนี้เกิดจากมือคุณ';
  $('#announcement').textContent='รอยพับกลายเป็นทางข้ามตามที่คุณลากแล้ว ลากรอยพับเดิมเพื่อลองทางอื่นได้';
  clearTimeout(crossingHintTimer);crossingHintTimer=setTimeout(()=>{$('#crossing-hint').hidden=true;},2600);sound();
 },
});
function assets(){
 if(!assetsPromise){
  for(const img of [$('#paper-clean'),$('.compass-body')])if(img.complete&&!img.naturalWidth)img.src=img.getAttribute('src');
  assetsPromise=Promise.all([underpaper.ready(),$('#paper-clean').decode(),$('.compass-body').decode()]).catch(error=>{assetsPromise=null;throw error;});
 }
 return assetsPromise;
}
// Decode the small discovery layers during the opening, not after an extra question.
void assets().then(()=>{criticalReady=true;playOpening();}).catch(()=>{});
function geometry(){
 const host=field.getBoundingClientRect(),mobile=host.width<701&&host.height>=host.width;
 const width=mobile?host.width:Math.min(host.width*.58,host.height*.5625);
 const scale=Math.max(width/540,host.height/960),size=482*scale/.766;
 const restX=host.width*(mobile?.5:.68),restY=(host.height-960*scale)/2+492*scale;
 const zoom=mobile?1:1.5,finalWidth=width*zoom,finalHeight=host.height*zoom;
 return {host,mobile,size,restX,restY,paper:{left:host.width*(mobile?.5:.51)-finalWidth/2,top:(host.height-finalHeight)/2,width:finalWidth,height:finalHeight}};
}
function placeArtifact(){
 const g=geometry();
 field.style.setProperty('--rest-left',`${g.restX}px`);field.style.setProperty('--rest-top',`${g.restY-g.size*.58}px`);field.style.setProperty('--rest-size',`${g.size}px`);
 if(gesture?.object)return;
 const size=Math.min(g.mobile?g.host.width*.62:g.host.width*.30,g.host.height*(g.mobile?.34:.42),400);
 if(crossingTip&&(crossing.model.phase==='drawing'||crossing.settling)){
  const x=Math.max(size*.5,Math.min(g.host.width-size*.5,g.paper.left+crossingTip.x*g.paper.width));
  const top=Math.max(70,Math.min(g.host.height-size-50,g.paper.top+crossingTip.y*g.paper.height-size*.79));
  field.style.setProperty('--held-left',`${x}px`);field.style.setProperty('--held-top',`${top}px`);field.style.setProperty('--held-size',`${size}px`);return;
 }
 const x=Math.max(size*.42,Math.min(g.host.width-size*.42,g.paper.left+(cursor.x+.36)*g.paper.width));
 const top=Math.max(76,Math.min(g.host.height-size*.95-60,g.paper.top+(cursor.y-(g.mobile?.27:.15))*g.paper.height-size*.58));
 field.style.setProperty('--held-left',`${x}px`);field.style.setProperty('--held-top',`${top}px`);field.style.setProperty('--held-size',`${size}px`);
}
function placeCrossing(){
 if(!crossingTip)return;const g=geometry(),a=crossing.model.anchor;
 const p=crossing.model.phase==='complete'?{x:a.x+.075,y:a.y-.02}:crossingTip;
 field.style.setProperty('--grip-x',`${g.paper.left+p.x*g.paper.width}px`);field.style.setProperty('--grip-y',`${g.paper.top+p.y*g.paper.height}px`);
}
function syncCrossing(){
 const phase=crossing.model.phase,shown=document.body.dataset.phase!=='opening'&&phase!=='hidden';
 $('#paper-grip').hidden=!shown;
 instrument.setAttribute('aria-label',phase==='drawing'?'พารอยพับไปอีกฝั่ง':'เลื่อนเข็มทิศสำรวจใต้กระดาษ');
 if(phase!=='drawing'){instrument.setAttribute('aria-valuenow',String(Math.round(cursor.x*100)));instrument.setAttribute('aria-valuetext',`สำรวจตำแหน่ง ${Math.round(cursor.x*100)}, ${Math.round(cursor.y*100)} ส่วนที่เปิดแล้วยังอยู่`);}
 document.body.classList.toggle('crossing-ready',shown);document.body.classList.toggle('crossing-drawing',phase==='drawing');document.body.classList.toggle('crossing-complete',phase==='complete');
 $('#paper-grip').setAttribute('aria-label',phase==='complete'?'ดึงรอยพับเปลี่ยนทางข้าม':'ดึงรอยพับเป็นทางข้าม');placeCrossing();
}
function armCrossing(){
 if(!hasExplored||flow.phase!=='alive'||!crossing.arm(underpaper.paperEdge('left',.61)))return;
 syncCrossing();$('#crossing-hint').textContent='ลองดึงรอยพับข้ามน้ำ';$('#crossing-hint').hidden=false;
}
function reflect(){
 paper.style.setProperty('--light-x',`${cursor.x*100}%`);paper.style.setProperty('--light-y',`${cursor.y*100}%`);
 field.style.setProperty('--angle',`${205+(cursor.x-.44)*45}deg`);
 instrument.setAttribute('aria-valuenow',String(Math.round(cursor.x*100)));
 instrument.setAttribute('aria-valuetext',`สำรวจตำแหน่ง ${Math.round(cursor.x*100)}, ${Math.round(cursor.y*100)} ส่วนที่เปิดแล้วยังอยู่`);
 placeArtifact();
}
let fieldWidth=0,fieldHeight=0;
new ResizeObserver(([entry])=>{
 const {width,height}=entry.contentRect;
 if(width!==fieldWidth||height!==fieldHeight){fieldWidth=width;fieldHeight=height;cancelGesture();placeCrossing();}
}).observe(field);
function playOpening(){
 openingFilm.sync({ready:criticalReady,enabled:motion.enabled,visible:!document.hidden,opening:flow.phase==='opening'&&!pathRuntime?.active});
}
function syncMotion(){
 const enabled=motion.enabled,active=enabled&&!document.hidden;
 deviceContext.motion=enabled?'full':'reduced';deviceContext.graphicsTier=enabled?'premium':'essential';
 document.body.dataset.motion=enabled?'full':'reduced';
 document.body.classList.toggle('motion-paused',!enabled);
 document.body.classList.toggle('motion-hidden',document.hidden);
 const toggle=$('#motion-toggle');toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label','เอฟเฟกต์เคลื่อนไหว');toggle.textContent=enabled?'เอฟเฟกต์: เปิด':'เอฟเฟกต์: ปิด';
 toggle.title='การเคลื่อนไหวของเข็มทิศ น้ำ และการประกอบหน้า';
 underpaper.setMotion(active);crossing.setMotion(active);
 playOpening();
}
function sound(){
 if(!audioOn)return;
 try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();
 const t=audio.currentTime;[196,294,392].forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t+i*.05);g.gain.linearRampToValueAtTime(.022,t+i*.05+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.05+.8);o.connect(g);g.connect(audio.destination);o.start(t+i*.05);o.stop(t+i*.05+.9);});
 }catch{audioOn=false;syncSound();}
}
function syncSound(){const b=$('#sound-toggle');b.textContent=audioOn?'เสียงเปิด':'เสียงปิด';b.setAttribute('aria-pressed',String(audioOn));b.setAttribute('aria-label',audioOn?'ปิดเสียงเข็มทิศ':'เปิดเสียงเข็มทิศ');}
function received(){
 if(flow.reveal({visible:!document.hidden,painted:underpaper.painted})){
  document.body.dataset.phase='alive';
  $('#announcement').textContent='ใต้กระดาษมีลำธารอยู่ ส่วนที่พบจะเปิดค้าง เลื่อนเข็มทิศหรือใช้ปุ่มลูกศรเพื่อสำรวจต่อ';
  armCrossing();
  pathRuntime?.ready();
 }
}
async function lift(token){
 try{
  await assets();if(token!==generation||flow.phase==='opening')return;
  document.body.classList.remove('pickup-pending','image-failed');$('#retry-world').hidden=true;
  $('#pickup').hidden=true;instrument.setAttribute('aria-hidden','false');instrument.tabIndex=0;
  placeArtifact();document.body.dataset.phase='holding';instrument.focus({preventScroll:true});sound();
  $('#put-down').hidden=false;$('#discovery-copy').setAttribute('aria-hidden','false');
  underpaper.start(received);crossing.resume();reflect();syncCrossing();
  hintTimer=setTimeout(()=>{if(token===generation&&!hasExplored)document.body.classList.add('hint-visible');},4500);
 }catch{
  if(token!==generation)return;
  document.body.classList.remove('pickup-pending');document.body.classList.add('image-failed','hint-visible');
  $('#touch-hint').textContent='ภาพยังมาไม่ถึง';$('#discovery-copy').setAttribute('aria-hidden','false');$('#retry-world').hidden=false;
 }
}
function pickup(){
 if(!flow.pickup())return;const token=++generation;
 document.body.classList.add('pickup-pending');openingFilm.hold();
 void lift(token);
}
$('#pickup').addEventListener('click',pickup);
$('#retry-world').addEventListener('click',()=>{document.body.classList.add('pickup-pending');$('#touch-hint').textContent='ลองเลื่อนเข็มทิศดู';void lift(generation);});
function explore(x,y){
 cursor=position(x,y);underpaper.explore(cursor.x,cursor.y);reflect();flow.control();hasExplored=true;
 clearTimeout(hintTimer);document.body.classList.remove('hint-visible');
 if(!gesture)armCrossing();
}
field.addEventListener('pointerdown',event=>{
 if(pathRuntime?.active)return;
 if(event.target.closest('#paper-grip')&&flow.phase==='alive'&&event.button===0&&!gesture){
  event.preventDefault();if(!crossing.begin())return;
  const bounds=paper.getBoundingClientRect();field.setPointerCapture(event.pointerId);
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,bounds,crossing:true};
  const a=crossing.model.anchor;crossing.extend({x:a.x+.04,y:a.y-.015});
  document.body.classList.add('interacting');syncCrossing();$('#crossing-hint').textContent='พารอยพับไปอีกฝั่ง แล้วปล่อยมือ';return;
 }
 if(flow.phase==='opening'||document.body.dataset.phase==='opening'||event.button!==0||event.target.closest('button,a,header,footer'))return;
 if(gesture)return;
 const bounds=paper.getBoundingClientRect(),onObject=instrument.contains(event.target);
 if(!onObject&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))return;
 event.preventDefault();field.setPointerCapture(event.pointerId);
 const object=onObject?instrument.getBoundingClientRect():null;
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,cursor:{...cursor},bounds,object};
 if(object){
  // Take control at the current rendered pose, including during the first lift.
  instrument.style.transition='none';field.style.setProperty('--held-left',`${object.left+object.width/2-geometry().host.left}px`);
  field.style.setProperty('--held-top',`${object.top-geometry().host.top}px`);field.style.setProperty('--held-size',`${object.width}px`);
 }else{explore((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height);gesture.cursor={...cursor};}
 document.body.classList.add('interacting');
});
field.addEventListener('pointermove',event=>{
 if(!gesture||event.pointerId!==gesture.id)return;
 const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
 if(Math.hypot(dx,dy)<2)return;
 if(gesture.crossing){crossing.extend({x:(event.clientX-gesture.bounds.left)/gesture.bounds.width,y:(event.clientY-gesture.bounds.top)/gesture.bounds.height});return;}
 explore(gesture.cursor.x+dx/gesture.bounds.width,gesture.cursor.y+dy/gesture.bounds.height);
 if(gesture.object){const host=geometry().host;field.style.setProperty('--held-left',`${gesture.object.left+gesture.object.width/2-host.left+dx}px`);field.style.setProperty('--held-top',`${gesture.object.top-host.top+dy}px`);}
});
function cancelGesture(){
 const pointerId=gesture?.id;
 gesture=null;document.body.classList.remove('interacting');instrument.style.transition='';placeArtifact();
 if(crossing.model.phase==='drawing'){crossing.cancel();syncCrossing();$('#crossing-hint').textContent='ลองดึงรอยพับข้ามน้ำ';}
 if(pointerId!==undefined&&field.hasPointerCapture(pointerId))field.releasePointerCapture(pointerId);
}
function release(event){
 if(gesture?.id!==event.pointerId)return;
 if(gesture.crossing&&event.type==='pointerup')finishCrossing();
 cancelGesture();armCrossing();
}
field.addEventListener('pointerup',release);field.addEventListener('pointercancel',release);field.addEventListener('lostpointercapture',release);
instrument.addEventListener('keydown',event=>{
 if(crossing.model.phase==='drawing'&&['Enter','Escape'].includes(event.key)){
  event.preventDefault();if(event.key==='Enter')finishCrossing();else crossing.cancel();syncCrossing();return;
 }
 const delta={ArrowUp:[0,-.12],ArrowRight:[.16,0],ArrowDown:[0,.12],ArrowLeft:[-.16,0]}[event.key];
 if(!delta||flow.phase==='opening')return;event.preventDefault();
 if(crossing.model.phase==='drawing'){const p=crossing.model.tip;crossing.extend({x:p.x+delta[0],y:p.y+delta[1]});return;}
 explore(cursor.x+delta[0],cursor.y+delta[1]);
});
function finishCrossing(){
 const p=crossing.model.tip,done=crossing.commit(underpaper.paperEdge('right',p.y));syncCrossing();
 if(!done)$('#crossing-hint').textContent='ลองลากรอยพับข้ามน้ำ';
 return done;
}
$('#paper-grip').addEventListener('keydown',event=>{
 if(!['Enter',' '].includes(event.key)||flow.phase!=='alive')return;
 event.preventDefault();if(!crossing.begin())return;const a=crossing.model.anchor;crossing.extend({x:a.x+.075,y:a.y-.02});
 syncCrossing();instrument.focus({preventScroll:true});$('#crossing-hint').hidden=false;$('#crossing-hint').textContent='ใช้ลูกศรพารอยพับ · Enter เพื่อวาง';
 $('#announcement').textContent='ใช้ปุ่มลูกศรสร้างทางข้าม กด Enter เพื่อวาง หรือ Escape เพื่อคลายรอยพับ';
});
$('#put-down').addEventListener('click',()=>{
 if(!flow.putDown())return;++generation;clearTimeout(hintTimer);clearTimeout(crossingHintTimer);underpaper.suspend();cancelGesture();crossing.suspend();
 document.body.dataset.phase='opening';document.body.classList.remove('hint-visible','interacting');
 instrument.tabIndex=-1;instrument.setAttribute('aria-hidden','true');$('#discovery-copy').setAttribute('aria-hidden','true');$('#put-down').hidden=true;
 $('#pickup').hidden=false;$('#pickup').focus({preventScroll:true});
 $('#crossing-hint').hidden=true;syncCrossing();
 pathRuntime?.hide();
});
$('#sound-toggle').addEventListener('click',()=>{audioOn=!audioOn;syncSound();if(audioOn)sound();});
$('#motion-toggle').addEventListener('click',()=>{motion.setEnabled(!motion.enabled);syncMotion();});
preference.addEventListener('change',event=>{motion.setSystemReduced(event.matches);syncMotion();});
document.addEventListener('visibilitychange',()=>{
 syncMotion();if(document.hidden){cancelGesture();underpaper.suspend();crossing.suspend();}
 else if(document.body.dataset.phase!=='opening'){underpaper.continue();crossing.resume();}
});
window.addEventListener('blur',cancelGesture);
reflect();syncSound();syncMotion();
pathRuntime=createPathRuntime({
 telemetry,storage:storage('localStorage'),reduced:()=>!motion.enabled,stopHand:cancelGesture,
 visual:()=>({cursor:{...cursor},trail:underpaper.snapshot(),crossing:crossing.model.phase==='complete'?crossing.model.points:[]}),
 async restore(saved){
  $('#pickup').hidden=true;openingFilm.hold();await assets();flow.restore();cursor=position(saved.cursor.x,saved.cursor.y);
  underpaper.restore(saved.trail);crossing.restore(saved.crossing);document.body.dataset.phase='alive';
  underpaper.start(()=>{});crossing.resume();reflect();
 },
});
document.body.dataset.runtimeReady='true';
if(document.body.dataset.earlyPickup==='true'&&!pathRuntime.active)pickup();
else if(pathRuntime.active)document.body.classList.remove('pickup-pending');
