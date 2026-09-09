import test from 'node:test';
import assert from 'node:assert/strict';
import {WISHES,recommend,visualRecord,savePath,loadPath} from './compass-path.js';
import {createTelemetry} from '../assets/front-door/telemetry.js';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const input={wish:'make',answer:'screen',cursor:{x:.4,y:.5},trail:[{x:.2,y:.3}],crossing:[{x:.1,y:.6},{x:.8,y:.6}]};
function setup(storage=memory(),options={}){return createTelemetry({storage,sessionStorage:memory(),enabled:false,window:null,document:null,...options});}
test('six explicit answer pairs resolve to four real destinations, never a catch-all Dungeon',()=>{
 const doors=new Set();for(const [wish,w]of Object.entries(WISHES))for(const [answer]of w.options){const d=recommend(wish,answer);assert.ok(d.href);doors.add(d.id);}assert.equal(doors.size,4);assert.equal(recommend('unknown','screen'),null);assert.equal(recommend('care','screen'),null);
});
test('the old house is an additional resumable destination, not a fifth RGBS classification',()=>{
 const s=memory(),t=setup(s);t.open();s.setItem('mc_read','episode-before');
 assert.equal(recommend('home','original').href,'/home/?entry=compass');
 assert.equal(recommend('home','arbitrary'),null);assert.equal(Object.hasOwn(WISHES,'home'),false);
 assert.equal(savePath(t,s,{wish:'home',answer:'original'},'cp-original-house').ok,true);
 const saved=loadPath(t.state.snapshot(),s);assert.equal(saved.wish,'home');assert.equal(saved.answer,'original');
 assert.equal(t.state.snapshot().journey.checkpoint.doorId,'home');assert.equal(s.getItem('mc_read'),'episode-before');
 t.dispose();
});
test('visual companions bound geometry and discard raw/sensitive input',()=>{
 const v=visualRecord({...input,email:'private',trail:[{x:Infinity,y:0},...Array(300).fill({x:.2,y:.5,freeText:'private'})]},'j-test');assert.equal(v.trail.length,256);assert.equal(JSON.stringify(v).includes('private'),false);assert.equal(visualRecord({wish:'bad'},'j-test'),null);
});
test('a durable checkpoint points to the exact restored artifact and never sends its coordinates',()=>{
 const s=memory(),t=setup(s);t.open();const result=savePath(t,s,input,'cp-first');assert.equal(result.ok,true);assert.deepEqual(loadPath(t.state.snapshot(),s),visualRecord(input,t.state.snapshot().journey.journeyId));
 const event=t.pending().find(e=>e.eventName==='SAVE');assert.ok(event);assert.equal('checkpointRef'in event,false);assert.equal(JSON.stringify(event).includes('crossing'),false);t.dispose();
});
test('companion failure emits no SAVE and preserves the previous resumable visual',()=>{
 const s=memory(),t=setup(s);savePath(t,s,input,'cp-first');const before=t.pending().length,old=loadPath(t.state.snapshot(),s);s.setItem=()=>{throw Error('quota')};assert.equal(savePath(t,s,{...input,wish:'care',answer:'notice'},'cp-next').ok,false);assert.deepEqual(loadPath(t.state.snapshot(),s),old);assert.equal(t.pending().length,before);t.dispose();
});
test('foundation checkpoint failure after companion preparation keeps the older checkpoint intact',()=>{
 const s=memory(),t=setup(s);savePath(t,s,input,'cp-first');const old=t.state.snapshot().journey.checkpoint,write=s.setItem;
 s.setItem=(k,v)=>{if(k.includes('mc:frontdoor:v2:journey:'))throw Error('quota');write(k,v);};
 assert.equal(savePath(t,s,{...input,wish:'care',answer:'notice'},'cp-next').ok,false);assert.deepEqual(t.state.snapshot().journey.checkpoint,old);assert.equal(loadPath(t.state.snapshot(),s).wish,'make');t.dispose();
});
test('blocked storage remains usable without a successful SAVE',()=>{const t=setup(null);assert.equal(savePath(t,null,input,'cp-first').ok,false);assert.equal(t.pending().some(e=>e.eventName==='SAVE'),false);t.dispose();});
test('refresh restores the path without RETURN; later explicit RESUME retains it; REBUILD preserves history',()=>{
 const s=memory();s.setItem('legacy-achievement','untouched');let at=Date.now()-3800000,t=setup(s,{now:()=>at});savePath(t,s,input,'cp-first');const journey=t.state.snapshot().journey.journeyId;t.dispose();
 at+=1900000;t=setup(s,{now:()=>at,navigationType:'reload'});t.open();assert.ok(loadPath(t.state.snapshot(),s));assert.equal(t.pending().some(e=>e.eventName==='RETURN'),false);t.dispose();
 at+=1900000;t=setup(s,{now:()=>at,navigationType:'navigate'});t.open();assert.equal(t.pending().some(e=>e.eventName==='RETURN'),true);assert.equal(t.resume().ok,true);assert.equal(t.resume().ok,false);t.rebuild();assert.notEqual(t.state.snapshot().journey.journeyId,journey);assert.equal(s.getItem('legacy-achievement'),'untouched');assert.ok(s.getItem(`mc:frontdoor:v2:journey:${journey}`));t.dispose();
});
