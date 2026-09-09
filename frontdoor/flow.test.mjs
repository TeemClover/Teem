import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetry } from '../assets/front-door/telemetry.js';
import { createFlow, prototypeStorage, EXPERIENCE } from './flow.js';
import { position, createTrail } from './underpaper.js';
import { createCrossing, crossingCurve } from './paper-crossing.js';
const memory = initial => { const values=new Map(Object.entries(initial||{}));return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}; };
function fixture(raw=memory()) {
  const telemetry=createTelemetry({storage:prototypeStorage(raw),sessionStorage:prototypeStorage(memory()),enabled:false,location:{hostname:'localhost',origin:'http://localhost',pathname:'/frontdoor/',search:''}});
  const flow=createFlow(telemetry);telemetry.open();
  return {telemetry,flow,raw,names:()=>telemetry.pending().map(event=>event.eventName)};
}
test('pickup yields a controllable discovery without a question, route, Door or fabricated save',()=>{
  const f=fixture();assert.equal(f.flow.phase,'opening');assert.equal(f.flow.pickup(),true);assert.equal(f.flow.phase,'holding');
  assert.equal(f.flow.control(),false);assert.deepEqual(f.names(),['FRONTDOOR_OPEN','FRONTDOOR_CHOICE']);
  f.flow.reveal({painted:true});assert.equal(f.flow.phase,'alive');assert.equal(f.names().includes('LUCKY_RETURN'),true);
  f.flow.control();assert.deepEqual(f.names(),['FRONTDOOR_OPEN','FRONTDOOR_CHOICE','FRONTDOOR_REACTION_COMPLETE','LUCKY_RETURN']);
  assert.ok(f.telemetry.pending().every(event=>event.experienceVersion===EXPERIENCE&&!event.doorId&&!event.intentPrimary));f.telemetry.dispose();
});
test('a hidden or premature reveal cannot manufacture received value',()=>{
  const f=fixture();assert.equal(f.flow.reveal(),false);f.flow.pickup();assert.equal(f.flow.reveal({visible:false}),false);assert.equal(f.flow.phase,'holding');
  f.flow.control();assert.equal(f.names().includes('LUCKY_RETURN'),false);f.telemetry.dispose();
});
test('repeated input and putting down the same artifact do not spam milestones or REBUILD',()=>{
  const f=fixture();f.flow.pickup();assert.equal(f.flow.pickup(),false);f.flow.reveal({painted:true});f.flow.control();f.flow.control();f.flow.putDown();f.flow.pickup();f.flow.reveal({painted:true});f.flow.control();
  assert.deepEqual(f.names(),['FRONTDOOR_OPEN','FRONTDOOR_CHOICE','FRONTDOOR_REACTION_COMPLETE','LUCKY_RETURN']);f.telemetry.dispose();
});
test('study identity and outbox are isolated while original installation and approved checkpoints survive unchanged',()=>{
  const initial={'c7:install_id':'legacy-install-123','mc:frontdoor:v2:active_journey':'j-original-save','mc:frontdoor:v2:journey:j-original-save':'{"checkpoint":{"doorId":"dungeon"}}','mc:frontdoor:v2:outbox:local':'original-pending-data','mc:frontdoor:compass-study:v1:active_journey':'j-old-leaf-study',mc_nb_seen_ever_v1:'1',mc_read:'ep1-everyone-gets-to-play'};
  const raw=memory(initial);const f=fixture(raw);f.flow.pickup();f.flow.reveal({painted:true});f.flow.control();f.flow.putDown();
  for(const [key,value] of Object.entries(initial))assert.equal(raw.getItem(key),value,key);
  assert.equal(f.telemetry.state.installation.installId,initial['c7:install_id']);
  assert.ok([...raw.values.keys()].some(key=>key.startsWith('mc:frontdoor:underpaper-study:v1:journey:')));f.telemetry.dispose();
});
test('blocked storage leaves the entire curiosity loop usable without a durable-save claim',()=>{
  const f=fixture({getItem(){throw Error('denied')},setItem(){throw Error('denied')}});const id=f.telemetry.state.installation.installId;
  f.flow.pickup();f.flow.reveal({painted:true});f.flow.control();assert.equal(f.flow.phase,'alive');assert.equal(f.telemetry.state.installation.installId,id);assert.equal(f.telemetry.state.installation.durable,false);assert.equal(f.names().includes('SAVE'),false);f.telemetry.dispose();
});
test('cumulative exploration keeps old points and bounds duplicate allocation',()=>{
  const trail=createTrail();assert.equal(trail.add(.3,.4),true);const first={...trail.points[0]};
  assert.equal(trail.add(.3,.4),false);assert.equal(trail.add(.7,.6),true);assert.deepEqual(trail.points[0],first);
  for(let i=0;i<10000;i++)trail.add((i%100)/100,Math.floor(i/100)/100);
  assert.ok(trail.points.length<=256);assert.deepEqual(trail.points[0],first);
});
test('coordinates stay bounded without NaN, even after extreme drag input',()=>{
 for(const [x,y] of [[NaN,Infinity],[9999,-9999],[0,0]]){const p=position(x,y);assert.ok(p.x>=.12&&p.x<=.88);assert.ok(p.y>=.22&&p.y<=.82);}
});
test('a fast drag exposes a continuous strip instead of disconnected holes',()=>{
 const trail=createTrail(),start={x:.44,y:.55},end={x:.14,y:.77};trail.connect(start,end);
 for(let i=0;i<=40;i++){
  const p={x:start.x+(end.x-start.x)*i/40,y:start.y+(end.y-start.y)*i/40};
  assert.ok(trail.points.some(q=>Math.hypot((p.x-q.x)/q.rx,(p.y-q.y)/q.ry)<1));
 }
});
test('a decoded image without an actual visible paint cannot report received discovery',()=>{
 const f=fixture();f.flow.pickup();assert.equal(f.flow.reveal({painted:false}),false);
 assert.equal(f.flow.reveal({painted:true,visible:false}),false);assert.equal(f.names().includes('LUCKY_RETURN'),false);
 assert.equal(f.flow.reveal({painted:true,visible:true}),true);assert.equal(f.names().filter(n=>n==='LUCKY_RETURN').length,1);f.telemetry.dispose();
});
test('a short or vertical paper tug cannot fabricate a crossing',()=>{
 const c=createCrossing();assert.equal(c.begin(),false);c.arm({x:.12,y:.61});c.begin();c.extend({x:.12,y:.32});
 assert.equal(c.commit({x:.84,y:.38}),false);assert.equal(c.revision,0);assert.equal(c.phase,'ready');assert.deepEqual(c.points,[]);
 c.begin();c.extend({x:.3,y:.61});assert.equal(c.commit({x:.84,y:.61}),false);
});
test('different hand traces construct different curves, with the same truthful endpoints',()=>{
 const traces=[.42,.72].map(y=>{const c=createCrossing();c.arm({x:.12,y:.61});c.begin();c.extend({x:.38,y});c.extend({x:.65,y});c.extend({x:.79,y:.57});assert.equal(c.commit({x:.86,y:.57}),true);return crossingCurve(c.points);});
 assert.notDeepEqual(traces[0],traces[1]);assert.deepEqual(traces[0][0],traces[1][0]);assert.deepEqual(traces[0].at(-1),traces[1].at(-1));
});
test('canceling a redraw preserves the previous crossing without advancing its revision',()=>{
 const c=createCrossing();c.arm({x:.12,y:.61});c.begin();c.extend({x:.8,y:.58});c.commit({x:.86,y:.58});const original=c.points;
 c.begin();c.extend({x:.4,y:.4});c.cancel();assert.deepEqual(c.points,original);assert.equal(c.revision,1);assert.equal(c.phase,'complete');
});
test('paper traces remain finite and bounded through extreme and noisy input',()=>{
 const c=createCrossing();c.arm({x:.12,y:.61});c.begin();
 for(let i=0;i<10000;i++)c.extend({x:i%2?NaN:999,y:i%3?Infinity:-999});
 assert.ok(c.points.length<=96);const curve=crossingCurve(c.points);assert.ok(curve.length<=1153);
 assert.ok(curve.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=.06&&p.x<=.94&&p.y>=.26&&p.y<=.82));
});
test('only a new visibly painted crossing records free roam, without classifying or saving a visitor',()=>{
 const f=fixture();f.flow.pickup();assert.equal(f.flow.crossing({revision:1,painted:true}),false);f.flow.reveal({painted:true});
 assert.equal(f.flow.crossing({revision:1,painted:false}),false);assert.equal(f.flow.crossing({revision:1,painted:true,visible:false}),false);
 assert.equal(f.flow.crossing({revision:1,painted:true}),true);assert.equal(f.flow.crossing({revision:1,painted:true}),false);
 f.flow.putDown();f.flow.pickup();f.flow.reveal({painted:true});assert.equal(f.flow.crossing({revision:1,painted:true}),false);
 assert.equal(f.flow.crossing({revision:2,painted:true}),true);
 const events=f.telemetry.pending();assert.equal(events.filter(e=>e.eventName==='FRONTDOOR_FREE_ROAM').length,2);
 assert.ok(events.every(e=>!e.intentPrimary&&!e.doorId));assert.equal(f.names().includes('SAVE'),false);f.telemetry.dispose();
});
