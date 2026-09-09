import test from 'node:test';
import assert from 'node:assert/strict';
import {SEEDS,seedDestination,seedRecord,saveSeed,loadSeed,seedKey} from './seed-path.js';
import {savePath,loadPath} from './compass-path.js';
import {createTelemetry} from '../assets/front-door/telemetry.js';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const fixture={color:'silver',phase:'reward',reward:{title:'บ้านที่ฉันสร้าง',design:'signal',edited:true,complete:true}};
function setup(storage=memory()){const t=createTelemetry({storage,sessionStorage:memory(),enabled:false,window:null,document:null});t.open();return t;}
test('V6 canonical RGBS order and definitions remain Body Soul Mind Craft',()=>{assert.deepEqual(Object.keys(SEEDS),['red','green','blue','silver']);assert.deepEqual(Object.values(SEEDS).map(x=>x.name),['BODY','SOUL','MIND','CRAFT']);});
test('reward context selects the relevant real continuation without mapping all people to health or Dungeon',()=>{assert.equal(seedDestination('red').id,'ako');assert.equal(seedDestination('green').id,'xircle');assert.equal(seedDestination('blue',{scenario:'team'}).href,'/meet/?entry=compass&intent=ai&topic=team');assert.match(seedDestination('silver').meet,/intent=ai/);assert.equal(seedDestination('unknown'),null);});
test('green continuation carries only the explicitly selected subject into Xircle and its meeting',()=>{
 for(const context of ['sleep','move','food']){
  const door=seedDestination('green',{context,complete:true});
  assert.equal(door.href,`/xircle/?entry=compass&focus=${context}`);
  assert.equal(door.meet,`/meet/?intent=health&from=xircle&open=booking&focus=${context}`);
 }
 assert.equal(seedDestination('green',{context:'sensitive free text'}).href,'/xircle/?entry=compass');
});
test('explicit learning modes continue directly to comic or hands-on; legacy course keeps its original meeting',()=>{
 const legacy={scenario:'course',constraint:'short',compared:true};
 assert.equal(seedDestination('blue',legacy).href,'/meet/?entry=compass&intent=ai&topic=course');
 assert.deepEqual(seedDestination('blue',{...legacy,learningPath:'private text'}),seedDestination('blue',legacy));
 const comic=seedDestination('blue',{...legacy,learningPath:'comic'});
 const handsOn=seedDestination('blue',{...legacy,learningPath:'hands-on'});
 assert.equal(comic.id,'forge');assert.equal(comic.href,'/forge/ep1-everyone-gets-to-play/?entry=compass');
 assert.equal(handsOn.id,'classroom');assert.equal(handsOn.href,'/classroom/free-ai.html?entry=compass');
 for(const door of [comic,handsOn])assert.equal(door.meet,'/meet/?entry=compass&intent=ai&topic=course');
 assert.equal(seedDestination('blue',{scenario:'team',learningPath:'comic'}).id,'meet');
});
test('saved learning mode and prepared payoff resume without replacing old journeys or inventing a mode',()=>{
 const storage=memory(),telemetry=setup(storage);
 const old={color:'blue',phase:'reward',reward:{scenario:'course',constraint:'short',compared:true}};
 assert.equal(saveSeed(telemetry,storage,old,'cp-course-old').ok,true);
 const oldSnapshot=telemetry.state.snapshot();
 for(const learningPath of ['comic','hands-on']){
  telemetry.rebuild();
  assert.equal(saveSeed(telemetry,storage,{...old,reward:{scenario:'course',learningPath,compared:true}},`cp-${learningPath}`).ok,true);
  const saved=loadSeed(telemetry.state.snapshot(),storage);
  assert.equal(saved.reward.learningPath,learningPath);
  assert.equal(seedDestination('blue',saved.reward).id,learningPath==='comic'?'forge':'classroom');
  assert.equal('learningPath' in loadSeed(oldSnapshot,storage).reward,false);
  assert.equal(seedDestination('blue',loadSeed(oldSnapshot,storage).reward).id,'meet');
 }
 telemetry.dispose();
});
test('V6 save retains actual work but never adds its title or coordinates to telemetry',()=>{const s=memory(),t=setup(s);assert.equal(saveSeed(t,s,fixture,'cp-seed').ok,true);assert.equal(loadSeed(t.state.snapshot(),s).reward.title,'บ้านที่ฉันสร้าง');const event=t.pending().find(e=>e.eventName==='SAVE');assert.ok(event);assert.equal(JSON.stringify(event).includes('บ้านที่ฉันสร้าง'),false);t.dispose();});
test('new record drops unknown data and bounds geometry and user-written title',()=>{const data=seedRecord({...fixture,secret:'private',reward:{...fixture.reward,title:'a'.repeat(1000),rawLocalStorage:'private'},trail:Array(300).fill({x:.5,y:.5,secret:'private'})},'j-test');assert.equal(data.trail.length,256);assert.equal(data.reward.title.length,52);assert.equal(JSON.stringify(data).includes('private'),false);});
test('unavailable storage and failed second checkpoint commit never claim SAVE or replace earlier work',()=>{const s=memory(),t=setup(s);assert.equal(saveSeed(t,null,fixture,'cp-none').ok,false);saveSeed(t,s,fixture,'cp-old');const old=t.state.snapshot().journey.checkpoint,write=s.setItem;s.setItem=(k,v)=>{if(k.includes('mc:frontdoor:v2:journey:'))throw Error('quota');write(k,v);};assert.equal(saveSeed(t,s,{...fixture,reward:{...fixture.reward,title:'new'}},'cp-new').ok,false);assert.deepEqual(t.state.snapshot().journey.checkpoint,old);assert.equal(loadSeed(t.state.snapshot(),s).reward.title,fixture.reward.title);assert.equal(t.pending().filter(e=>e.eventName==='SAVE').length,1);t.dispose();});
test('legacy saved paths retain exact companions while V6 creates another journey',()=>{const s=memory(),t=setup(s);savePath(t,s,{wish:'care',answer:'notice'},'cp-old');const snapshot=t.state.snapshot(),old=loadPath(snapshot,s);assert.equal(loadSeed(snapshot,s),null);s.setItem('mc-legacy-progress','keep');t.rebuild();saveSeed(t,s,fixture,'cp-seed');assert.deepEqual(loadPath(snapshot,s),old);assert.equal(s.getItem('mc-legacy-progress'),'keep');assert.ok(loadSeed(t.state.snapshot(),s));t.dispose();});
test('malformed saved color/version/geometry cannot inject an arbitrary URL',()=>{const s=memory(),t=setup(s);saveSeed(t,s,fixture,'cp-seed');const snap=t.state.snapshot(),key=seedKey(snap.journey.journeyId,'cp-seed');s.setItem(key,JSON.stringify({...loadSeed(snap,s),color:'__proto__',href:'javascript:evil()'}));assert.equal(loadSeed(snap,s),null);assert.equal(seedRecord({...fixture,color:'constructor'},'j-test'),null);t.dispose();});
