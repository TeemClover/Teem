import test from 'node:test';
import assert from 'node:assert/strict';
import {writeCraftHandoff,loadCraftHandoff,craftHandoffKey,craftHTML,craftPreview,CRAFT_HANDOFF_TTL,mountDungeonCraftHandoff,
  craftWorkKey,loadCraftWork,saveCraftWork,CRAFT_SOURCE_LIMIT,craftIndexKey,forkCraftHandoff,readCraftModel} from './craft-handoff.js';

const journeyId='j-original-journey', id='h-our-first-craft', instant=1788800000000;
const reward={title:'บ้านที่ฉันสร้าง',design:'signal',edited:true,complete:true};
const options={journeyId,now:()=>instant,idFactory:()=>id};
function memory(){const map=new Map();return{map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}

test('craft travels by opaque reference, retaining title and design only in verified local storage',()=>{
 const store=memory(),result=writeCraftHandoff(store,reward,options);
 assert.equal(result.ok,true);assert.equal(result.href,`/classroom/dungeon/?entry=compass&work=${id}#q2`);
 assert.equal(result.href.includes(reward.title),false);
 const read=loadCraftHandoff(store,id,{journeyId,now:()=>instant});
 assert.equal(read.title,reward.title);assert.equal(read.design,'signal');
 assert.deepEqual(Object.keys(read).sort(),['version','id','journeyId','createdAt','title','design'].sort());
});

test('craft handoff rejects cross-journey, expired, future, unknown and malformed records',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);
 assert.equal(loadCraftHandoff(store,id,{journeyId:'j-another-journey',now:()=>instant}),null);
 assert.equal(loadCraftHandoff(store,id,{journeyId,now:()=>instant+CRAFT_HANDOFF_TTL+1}),null);
 assert.equal(loadCraftHandoff(store,id,{journeyId,now:()=>instant-1}),null);
 assert.equal(loadCraftHandoff(store,'../../keys',{journeyId,now:()=>instant}),null);
 store.setItem(craftHandoffKey(id),JSON.stringify({version:1,id,journeyId,createdAt:instant,title:'x'.repeat(53),design:'signal'}));
 assert.equal(loadCraftHandoff(store,id,{journeyId,now:()=>instant}),null);
 store.setItem(craftHandoffKey(id),'[');assert.equal(loadCraftHandoff(store,id,{journeyId,now:()=>instant}),null);
});

test('craft storage unavailable or failed verification never claims a transferable artifact',()=>{
 assert.equal(writeCraftHandoff(null,reward,options).ok,false);
 assert.equal(writeCraftHandoff({setItem(){throw Error('quota');}},reward,options).ok,false);
 assert.equal(writeCraftHandoff({setItem(){},getItem(){return null;}},reward,options).ok,false);
 assert.equal(writeCraftHandoff(memory(),{...reward,complete:false},options).ok,false);
 assert.equal(writeCraftHandoff(memory(),reward,{...options,journeyId:'bad'}).ok,false);
});

test('craft transfer preserves old Dungeon voice, code, achievements and prior handoffs',()=>{
 const store=memory();store.setItem('mc_dungeon_state_v2','legacy voice and code');store.setItem('mc_titles','["HERO"]');
 writeCraftHandoff(store,reward,options);const old=store.getItem(craftHandoffKey(id));
 writeCraftHandoff(store,{...reward,title:'ชิ้นใหม่'},{...options,idFactory:()=> 'h-second-craft'});
 assert.equal(store.getItem(craftHandoffKey(id)),old);assert.equal(store.getItem('mc_dungeon_state_v2'),'legacy voice and code');assert.equal(store.getItem('mc_titles'),'["HERO"]');
});

test('initial HTML escapes malicious titles and every edited preview has a restrictive policy',()=>{
 const html=craftHTML({title:'</h1><script>alert(1)</script>&"',design:'signal'});
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/#c7e687/);assert.match(craftHTML({...reward,design:'editorial'}),/#e7dec6/);
 const preview=craftPreview('<script>parent.location="bad"</script>');
 assert.ok(preview.startsWith('<meta http-equiv="Content-Security-Policy"'));
 assert.match(preview,/default-src 'none'/);assert.match(preview,/form-action 'none'/);
});

test('default Dungeon and legacy compass entry do not mount or read storage',()=>{
 const forbidden={getItem(){throw Error('must not read');}};
 assert.equal(mountDungeonCraftHandoff({search:'',storage:forbidden}),null);
 assert.equal(mountDungeonCraftHandoff({search:'?entry=compass',storage:forbidden}),null);
});

test('explicit save restores exactly the edited HTML without changing the original artifact or legacy state',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);
 store.setItem('mc_dungeon_state_v2','original lesson');store.setItem('mc_titles','["HERO"]');
 const original=store.getItem(craftHandoffKey(id)),source='<!doctype html><h1>เว็บใหม่ของฉัน & ของเรา</h1><style>body{background:gold}</style>';
 assert.deepEqual(saveCraftWork(store,id,source,options),{ok:true,savedAt:instant});
 assert.equal(loadCraftWork(store,id,options).source,source);
 assert.equal(store.getItem(craftHandoffKey(id)),original);
 assert.equal(store.getItem('mc_dungeon_state_v2'),'original lesson');assert.equal(store.getItem('mc_titles'),'["HERO"]');
 assert.equal(loadCraftWork(store,id,{...options,journeyId:'j-different'}),null);
 assert.ok([...store.map.keys()].filter(key=>key.startsWith('mc:frontdoor:craft-work:')).every(key=>key.includes(journeyId)&&key.includes(id)));
});

test('saved work survives the handoff expiry; an unsaved expired handoff still fails',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);saveCraftWork(store,id,'<h1>เก็บไว้แล้ว</h1>',options);
 const later={journeyId,now:()=>instant+CRAFT_HANDOFF_TTL+1};
 assert.equal(loadCraftHandoff(store,id,later),null);assert.equal(loadCraftWork(store,id,later).source,'<h1>เก็บไว้แล้ว</h1>');
 const other='h-not-saved';writeCraftHandoff(store,reward,{...options,idFactory:()=>other});
 assert.equal(loadCraftHandoff(store,other,later),null);assert.equal(loadCraftWork(store,other,later),null);
 assert.equal(saveCraftWork(store,id,'<h1>กลับมาทำต่อ</h1>',later).ok,true);
 assert.equal(loadCraftWork(store,id,later).source,'<h1>กลับมาทำต่อ</h1>');
});

test('source is bounded and exact, including markup, empty HTML and unusual Unicode',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);
 const source='<script>parent.location="https://example.invalid"</script><h1>👩🏽‍🍳<>&"\u0000</h1>';
 assert.equal(saveCraftWork(store,id,source,options).ok,true);
 assert.equal(loadCraftWork(store,id,options).source,source);
 assert.ok(craftPreview(loadCraftWork(store,id,options).source).startsWith('<meta http-equiv="Content-Security-Policy"'));
 assert.equal(saveCraftWork(store,id,'x'.repeat(CRAFT_SOURCE_LIMIT+1),options).ok,false);
 assert.equal(loadCraftWork(store,id,options).source,source);
 assert.equal(saveCraftWork(store,id,{},options).ok,false);
 assert.equal(saveCraftWork(store,id,'',options).ok,true);assert.equal(loadCraftWork(store,id,options).source,'');
});

test('quota or source readback failure reports failure and retains the previous saved source',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);saveCraftWork(store,id,'old source',options);
 const blocked={getItem:store.getItem,setItem(){throw Error('quota');}};
 assert.equal(saveCraftWork(blocked,id,'new source',options).ok,false);
 assert.equal(loadCraftWork(store,id,options).source,'old source');
 const failingRead={setItem:store.setItem,getItem:key=>key.endsWith(':b')?null:store.getItem(key)};
 assert.equal(saveCraftWork(failingRead,id,'unverified source',options).ok,false);
 assert.equal(loadCraftWork(store,id,options).source,'old source');
 assert.equal(saveCraftWork(null,id,'memory only',options).ok,false);
});

test('pointer write/readback failure never claims success and each work uses only two bounded revision slots',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);saveCraftWork(store,id,'old',options);
 const key=craftWorkKey(journeyId,id);
 const blockedPointer={getItem:store.getItem,setItem:(name,value)=>{if(name===key)throw Error('pointer blocked');store.setItem(name,value);}};
 assert.equal(saveCraftWork(blockedPointer,id,'new',options).ok,false);assert.equal(loadCraftWork(store,id,options).source,'old');
 const ignoredPointer={getItem:store.getItem,setItem:(name,value)=>{if(name!==key)store.setItem(name,value);}};
 assert.equal(saveCraftWork(ignoredPointer,id,'ignored',options).ok,false);assert.equal(loadCraftWork(store,id,options).source,'old');
 for(let i=0;i<20;i++)assert.equal(saveCraftWork(store,id,`revision ${i}`,options).ok,true);
 assert.equal(loadCraftWork(store,id,options).source,'revision 19');
 assert.equal([...store.map.keys()].filter(name=>name.startsWith(key)).length,3);
});

test('saved records reject malformed data, mismatched origin and future timestamps',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);saveCraftWork(store,id,'safe',options);
 const key=craftWorkKey(journeyId,id),slotKey=`${key}:a`,raw=store.getItem(slotKey),record=JSON.parse(raw);
 for(const changes of [{version:2},{id:'h-someone-else'},{journeyId:'j-someone-else'},{createdAt:instant-1},{savedAt:instant+1},{savedAt:instant-1},{source:'x'.repeat(CRAFT_SOURCE_LIMIT+1)},{source:{}}]){
   store.setItem(slotKey,JSON.stringify({...record,...changes}));assert.equal(loadCraftWork(store,id,options),null);
 }
 store.setItem(slotKey,'{');assert.equal(loadCraftWork(store,id,options),null);
 store.setItem(slotKey,raw);store.setItem(key,'../../legacy');assert.equal(loadCraftWork(store,id,options),null);
 assert.equal(saveCraftWork(store,id,'no',{...options,now:()=>instant-1}).ok,false);
});

test('returning to a completed Front Door reward reuses its saved work instead of replacing edits',()=>{
 const store=memory();const original=writeCraftHandoff(store,reward,options);
 saveCraftWork(store,id,'<h1>แก้ต่อจากชิ้นเดิม</h1>',options);
 const again=writeCraftHandoff(store,reward,{...options,idFactory:()=> 'h-do-not-create'});
 assert.equal(again.href,original.href);assert.equal(store.getItem(craftHandoffKey('h-do-not-create')),null);
 const later=writeCraftHandoff(store,reward,{...options,now:()=>instant+CRAFT_HANDOFF_TTL+1,idFactory:()=> 'h-do-not-create'});
 assert.equal(later.href,original.href);
 assert.equal(loadCraftWork(store,id,options).source,'<h1>แก้ต่อจากชิ้นเดิม</h1>');
});

test('an unsaved expired handoff gets a fresh reference and the previous artifact is preserved',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);const original=store.getItem(craftHandoffKey(id));
 const result=writeCraftHandoff(store,reward,{...options,now:()=>instant+CRAFT_HANDOFF_TTL+1,idFactory:()=> 'h-fresh-link'});
 assert.match(result.href,/h-fresh-link/);assert.equal(store.getItem(craftHandoffKey(id)),original);
});

test('keepsake continuation copies saved source into its new journey without changing active or old journeys',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);saveCraftWork(store,id,'<h1>งานที่ทำต่อไว้</h1>',options);
 const old=[...store.map],newJourney='j-keep-going';store.setItem('mc:frontdoor:underpaper-study:v1:active_journey',newJourney);
 const result=forkCraftHandoff(store,journeyId,newJourney,reward,{now:()=>instant,idFactory:()=> 'h-copied-work'});
 assert.equal(result.ok,true);assert.equal(result.restored,true);assert.match(result.href,/h-copied-work/);
 assert.equal(loadCraftWork(store,'h-copied-work',{journeyId:newJourney,now:()=>instant}).source,'<h1>งานที่ทำต่อไว้</h1>');
 assert.equal(loadCraftWork(store,'h-copied-work',options),null);
 for(const [key,value]of old)assert.equal(store.getItem(key),value,key);
 assert.equal(store.getItem('mc:frontdoor:underpaper-study:v1:active_journey'),newJourney);
});

test('forking an unsaved keepsake is honest and failed copy cannot erase the original',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);
 assert.equal(forkCraftHandoff(store,journeyId,'j-unsaved-copy',reward,{now:()=>instant,idFactory:()=> 'h-unsaved-copy'}).restored,false);
 saveCraftWork(store,id,'precious source',options);
 const blocked={getItem:store.getItem,setItem:(key,value)=>{if(key.startsWith('mc:frontdoor:craft-work:v1:j-copy-failed:'))throw Error('full');store.setItem(key,value);}};
 const result=forkCraftHandoff(blocked,journeyId,'j-copy-failed',reward,{now:()=>instant,idFactory:()=> 'h-copy-failed'});
 assert.equal(result.ok,false);assert.equal(result.restored,false);
 assert.equal(loadCraftWork(store,id,options).source,'precious source');
});

test('handoff index is bounded, contains opaque references only, and cannot overwrite an existing artifact',()=>{
 const store=memory();writeCraftHandoff(store,reward,options);const original=store.getItem(craftHandoffKey(id));
 assert.equal(writeCraftHandoff(store,{...reward,title:'different'},options).ok,false);
 assert.equal(store.getItem(craftHandoffKey(id)),original);
 for(let i=0;i<20;i++)writeCraftHandoff(store,{...reward,title:`ชิ้น ${i}`},{...options,idFactory:()=> `h-work-${i}`});
 const list=JSON.parse(store.getItem(craftIndexKey(journeyId)));
 assert.equal(list.length,16);assert.equal(list.every(value=>typeof value==='string'&&value.startsWith('h-')),true);
 assert.equal(store.getItem(craftHandoffKey(id)),original);
});


test('interactive gallery content and selected photo survive opaque handoff, saved source and keepsake fork',()=>{
 const store=memory(),gallery={...reward,collection:'food',photo:1};
 const first=writeCraftHandoff(store,gallery,options);assert.equal(first.ok,true);
 const read=loadCraftHandoff(store,id,options);assert.equal(read.collection,'food');assert.equal(read.photo,1);
 const source=craftHTML(read);assert.match(source,/type="radio"/);assert.match(source,/seed-food-warm-v2-mobile.webp/);
 assert.doesNotMatch(source,/<script|onclick=/);assert.equal(readCraftModel(source).photo,1);
 saveCraftWork(store,id,source,options);
 const fork=forkCraftHandoff(store,journeyId,'j-new-gallery',gallery,{now:()=>instant,idFactory:()=> 'h-gallery-copy'});
 assert.equal(fork.restored,true);assert.equal(loadCraftWork(store,'h-gallery-copy',{journeyId:'j-new-gallery',now:()=>instant}).source,source);
 const other=writeCraftHandoff(store,{...gallery,photo:2},{...options,idFactory:()=> 'h-other-photo'});
 assert.notEqual(other.href,first.href);assert.equal(loadCraftWork(store,id,options).source,source);
});

test('visual editor only accepts its exact generated source and cannot overwrite custom HTML from a spoofed marker',()=>{
 const source=craftHTML({...reward,collection:'garden',photo:2});
 assert.equal(readCraftModel(source).collection,'garden');
 assert.equal(readCraftModel(source.replace('โลกบนโต๊ะทำงาน','เรื่องที่เขียนเอง')),null);
 assert.equal(readCraftModel('<h1>legacy saved source</h1>'),null);
 const weird=craftHTML({...reward,title:'<!-- <script> & 😀',collection:'maker',photo:0});
 assert.equal(readCraftModel(weird).title,'<!-- <script> & 😀');assert.doesNotMatch(weird,/<script>/);
 const preview=craftPreview(source,{origin:'http://127.0.0.1:4174'});
 assert.match(preview,/img-src data: http:\/\/127.0.0.1:4174\/frontdoor\/art\//);
 assert.doesNotMatch(preview.split('>')[0],/img-src[^;]* https:;|img-src[^;]*\*/);
 assert.doesNotMatch(craftPreview(source,{origin:'https://evil.test/?"'}).split('>')[0],/evil/);
});
