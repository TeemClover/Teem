import { loadPath, savePath, recommend } from './compass-path.js';
import { SEEDS, seedDestination, seedIntent, saveSeed, loadSeed, getRewardOutcome } from './seed-path.js';
import { mountReward } from './rewards.js';
import { createAssembly } from './assembly.js';
import { EXPERIENCE } from './flow.js';
import { randomId } from '../assets/front-door/contract.js';
import { writeCraftHandoff, forkCraftHandoff } from './craft-handoff.js';
import { createExhibit } from './exhibit.js';
import { mountKeepsakes, rememberKeepsake } from './keepsakes.js';
import { prepareOutcomeLink, captureOutcomeDeparture } from '../assets/front-door/outcomes.js';

/** The river, artifact and visitor's marks stay mounted through every discovery. */
export function createPathRuntime({telemetry,storage,reduced,visual,restore,stopHand}){
 const $=s=>document.querySelector(s),body=document.body;
 const exhibit=createExhibit($('#seed-exhibit'));
 let active=false,busy=false,color=null,phase='question',reward=null,rewardState=null,retry=null,legacy=null,craftLink=null;
 const handoffs=new Map();
 function emit(name,details={}){return telemetry.emit(name,{...details,properties:{...details.properties,...(color?{seedColor:color}:{})}});}
 function outcomeLink(anchor,fresh=false){
  const url=new URL(anchor.href,location.origin);url.searchParams.delete('fdh');anchor.setAttribute('href',url.pathname+url.search+url.hash);
  const key=`${telemetry.state.snapshot().journey.journeyId}:${anchor.getAttribute('href')}`;
  if(fresh||!handoffs.has(key))handoffs.set(key,prepareOutcomeLink(anchor.getAttribute('href'),{env:telemetry.env,enabled:telemetry.enabled,store:storage,snapshot:telemetry.state.snapshot(),seedColor:color}));
  const link=handoffs.get(key);anchor.href=link.href;anchor.dataset.handoff=link.handoffId;
 }
 const assembly=createAssembly($('#world-assembly'),{reduced,origin:()=>{const r=$('#instrument').getBoundingClientRect();return{x:(r.x+r.width*.5)/innerWidth,y:(r.y+r.height*.6)/innerHeight};}});
 const keepsakes=mountKeepsakes({storage,
  onContinue(saved){
   if(busy)return;telemetry.rebuild();const journey=telemetry.state.updateJourney({experienceVersion:EXPERIENCE});
   const fork=saved.color==='silver'&&saved.reward?.complete?forkCraftHandoff(storage,saved.journeyId,journey.journeyId,saved.reward):null;
   void recover(saved,false,true).then(()=>{if(fork&&!fork.ok)$('#path-status').textContent='เครื่องนี้ยังคัดลอกฉบับที่แก้ต่อให้ไม่ได้ ชิ้นเดิมที่เก็บไว้ยังอยู่';});
  },
  onExplore(){if(busy)return;telemetry.rebuild();telemetry.state.updateJourney({experienceVersion:EXPERIENCE});question();}
 });
 function copy(title,line='',overline=''){$('#path-title').textContent=title;$('#path-line').textContent=line;$('#path-overline').textContent=overline;$('#path-copy').scrollTop=0;}
 function focus(){$('#path-title').focus({preventScroll:true});}
 function choices(items,action){$('#path-answers').replaceChildren(...items.map(([id,label,accent])=>{const b=document.createElement('button');b.type='button';b.dataset.answer=id;b.textContent=label;if(accent){b.style.setProperty('--choice-color',accent);b.className='seed-choice';}b.addEventListener('click',()=>{if(!busy)void action(id);});return b;}));}
 function activate(){active=true;stopHand();body.classList.add('path-active');$('#continue-discovery').hidden=true;$('#path-copy').hidden=false;$('#instrument').tabIndex=-1;$('#instrument').setAttribute('aria-hidden','true');$('.invitation').setAttribute('aria-hidden','true');}
 function hideNext(){$('#seed-next').hidden=true;$('#open-path').hidden=true;$('#cross-seed').hidden=true;$('#door-actions').hidden=true;$('#path-end').hidden=true;$('#visit-house').hidden=true;}
 function markDirty(){$('#save-path').disabled=false;$('#save-path').textContent='เก็บสิ่งที่เจอไว้';$('#path-status').textContent='';}
 function fields(){if(!color)return;const door=seedDestination(color,rewardState);telemetry.state.updateJourney({experienceVersion:EXPERIENCE,...seedIntent(color,rewardState),doorId:door.id});}
 function question(){
  legacy=null;retry=null;craftLink=null;exhibit.clear();reward?.destroy();reward=null;rewardState=null;color=null;phase='question';
  activate();assembly.clear();body.classList.remove('seed-crossing','seed-arrived','seed-horizon');delete body.dataset.seed;body.dataset.seedPhase='question';
  $('#retry-assembly').hidden=true;$('#seed-reward').hidden=true;$('#rebuild-path').hidden=true;$('#path-status').textContent='';hideNext();
  copy('อีกฝั่งหนึ่ง… อยากให้มีอะไรรออยู่?','','ทางข้ามยังไปต่อได้');
  choices(Object.entries(SEEDS).map(([id,s])=>[id,s.label,s.color]),chooseSeed);$('#visit-house').hidden=false;focus();
 }
 async function work(task){
  if(busy)return;busy=true;retry=null;$('#retry-assembly').hidden=true;$('#path-status').textContent='';body.classList.add('path-assembling');
  $('#cross-seed').disabled=true;$('#rebuild-path').disabled=true;$('#save-path').disabled=true;
  try{await task();}
  catch{retry=()=>work(task);$('#path-status').textContent='ภาพยังมาไม่ถึง สิ่งที่เลือกยังอยู่';$('#retry-assembly').hidden=false;$('#rebuild-path').hidden=false;}
  finally{busy=false;body.classList.remove('path-assembling');$('#cross-seed').disabled=false;$('#rebuild-path').disabled=false;if(color)$('#save-path').disabled=false;}
 }
 function renderOptions(extra={}){return {final:true,color,rotation:0,trace:visual().crossing,crop:SEEDS[color]?.crop,mobileSrc:SEEDS[color]?.imageMobile,...extra};}
 function horizon({saved=false}={}){
  const seed=SEEDS[color];phase='horizon';body.dataset.seedPhase=phase;body.classList.add('seed-horizon');body.classList.remove('seed-arrived');
  copy(seed.title,seed.promise,seed.hint);choices([],()=>{});$('#seed-reward').hidden=true;
  $('#cross-seed').hidden=false;$('#door-actions').hidden=false;$('#open-path').hidden=true;$('#seed-next').hidden=true;
  $('#rebuild-path').hidden=false;$('#save-path').disabled=saved;$('#save-path').textContent=saved?'เก็บไว้แล้วบนเครื่องนี้':'เก็บทางนี้ไว้';focus();
 }
 function chooseSeed(id){
  if(!Object.hasOwn(SEEDS,id))return;$('#visit-house').hidden=true;color=id;rewardState=null;body.dataset.seed=id;body.style.setProperty('--seed-color',SEEDS[id].color);fields();
  emit('FRONTDOOR_CHOICE',{properties:{choiceStage:'primary',fromNode:'value',toNode:SEEDS[id].primary}});
  choices([],()=>{});copy(SEEDS[id].title);return work(async()=>{
   await assembly.assemble(SEEDS[id].image,renderOptions());horizon();
   telemetry.state.updateJourney({stage:'reward'});
   emit('REWARD_HORIZON',{properties:{fromNode:SEEDS[id].primary,toNode:'reward'}});
  });
 }
 function showNext(){
  if(color==='blue'&&phase==='reward'){
   const learningTitle=rewardState?.scenario==='course'?{comic:'อ่านแล้วเห็น จุดที่ AI แต่งเติม','hands-on':'เพิ่มบริบท งานก็ชัดขึ้น'}[rewardState.learningPath]:null;
   $('#path-title').textContent=learningTitle||(rewardState?.scenario==='network'?'สิ่งที่มี พาไปต่อได้':SEEDS.blue.title);
  }
  const outcome=getRewardOutcome(color,rewardState);if(!outcome.complete){$('#open-path').hidden=true;$('#seed-next').hidden=true;$('#path-end').hidden=true;return;}
  fields();const door=seedDestination(color,rewardState);
  $('#door-actions').hidden=false;$('#open-path').hidden=false;$('#open-path').href=door.href;$('#open-path').textContent=door.action;
  delete $('#open-path').dataset.withoutWork;
  if(color==='silver'){
   const journeyId=telemetry.state.snapshot().journey.journeyId;
   const signature=JSON.stringify([journeyId,rewardState.title,rewardState.design,rewardState.collection||'',rewardState.photo??0]);
   if(craftLink?.signature!==signature){
    const result=writeCraftHandoff(storage,rewardState,{journeyId});
    craftLink={signature,...result};
   }
   // The actual href must carry the artifact for context-menu and middle-click
   // navigation too. Preparing it is local persistence, never a DOOR_OPEN event.
   if(craftLink.ok)$('#open-path').href=craftLink.href;
   else{
    $('#open-path').dataset.withoutWork='true';$('#open-path').textContent='เปิดห้องทดลองใหม่';
    $('#path-status').textContent='เครื่องนี้ส่งชิ้นงานไปต่อให้ไม่ได้ งานยังอยู่ตรงนี้ หรือเปิดห้องทดลองใหม่ได้';
   }
  }
  $('#path-end').textContent='สิ่งที่เริ่มตรงนี้ เก็บไว้กลับมาทำต่อได้';$('#path-end').hidden=false;
  telemetry.state.updateJourney({stage:'door-found'});
  emit('DOOR_FOUND',{properties:{fromNode:'reward',toNode:door.id}});
  $('#seed-next').hidden=!(door.meet||door.explore);$('#seed-meet').hidden=!door.meet;$('#seed-explore').hidden=!door.explore;
  if(door.meet){$('#seed-meet').href=door.meet;$('#seed-meet').textContent=door.meetLabel;}
  if(door.explore){$('#seed-explore').href=door.explore;$('#seed-explore').textContent=door.exploreLabel;}
  outcomeLink($('#open-path'));if(door.meet)outcomeLink($('#seed-meet'));if(door.explore)outcomeLink($('#seed-explore'));
 }
 function enterReward(){
  phase='reward';body.dataset.seedPhase=phase;body.classList.add('seed-arrived');body.classList.remove('seed-crossing','seed-horizon');
  $('#cross-seed').hidden=true;$('#seed-reward').hidden=false;$('#door-actions').hidden=false;$('#open-path').hidden=true;$('#seed-next').hidden=true;$('#path-end').hidden=true;
  copy(SEEDS[color].title,'','คุณมาถึงแล้ว · ลองด้วยตัวเอง');choices([],()=>{});
  exhibit.clear();reward?.destroy();reward=mountReward($('#seed-reward'),{color,initial:rewardState,
   onChange(value){rewardState=value;exhibit.sync(color,$('#seed-reward'),value);markDirty();showNext();
    if(getRewardOutcome(color,value).complete)requestAnimationFrame(()=>{
      // Let the visitor see what just assembled before offering the next action.
      const discovery=$('#seed-reward .seed-reward-rhythm, #seed-reward .seed-reward-example, #seed-reward .seed-reward-work, #seed-reward .seed-reward-recipe');
      if(innerWidth<=700)discovery?.scrollIntoView({block:'start',behavior:reduced()?'instant':'smooth'});
    });
   },
   onComplete(value){rewardState=value;fields();emit('FRONTDOOR_FREE_ROAM',{properties:{fromNode:'reward',toNode:'value'}});showNext();},
  });rewardState=reward.snapshot();exhibit.sync(color,$('#seed-reward'),rewardState);showNext();$('#rebuild-path').hidden=false;focus();
 }
 function cross(){if(!color)return;return work(async()=>{
  markDirty();$('#cross-seed').hidden=true;body.classList.add('seed-crossing');copy('ลองเดินข้ามมา','','ทางที่คุณเลือก กำลังต่อถึงกัน');
  await assembly.walk();emit('FRONTDOOR_FREE_ROAM',{properties:{fromNode:'value',toNode:'reward'}});enterReward();
 });}
 $('#continue-discovery').addEventListener('click',question);
 $('#visit-house').addEventListener('click',()=>{
  if(busy)return;const door=recommend('home','original');
  color=null;rewardState=null;legacy={wish:'home',answer:'original',...visual()};
  telemetry.state.updateJourney({experienceVersion:EXPERIENCE,stage:'reward',doorId:door.id,intentPrimary:door.primary,intentSecondary:door.secondary});
  emit('FRONTDOOR_CHOICE',{properties:{choiceStage:'primary',fromNode:'value',toNode:'home'}});
  hideNext();choices([],()=>{});copy('รอยทางของเจ้าบ้าน','','มีอีกเรื่องหนึ่งอยู่ในเข็มทิศ');
  void work(async()=>{
   await assembly.assemble(door.image,{final:true,trace:visual().crossing,crop:{fit:'cover',focusY:.45,aspect:.84}});
   body.classList.add('seed-horizon');legacyDoor(legacy,{saved:false});
   emit('REWARD_HORIZON',{properties:{fromNode:'value',toNode:'home'}});
   emit('DOOR_FOUND',{properties:{fromNode:'reward',toNode:'home'}});
  });
 });
 $('#cross-seed').addEventListener('click',cross);
 $('#retry-assembly').addEventListener('click',()=>void retry?.());
 $('#save-path').addEventListener('click',()=>{
  if(busy||(!color&&!legacy))return;rewardState=reward?.snapshot()||rewardState;
  const result=legacy?savePath(telemetry,storage,{...legacy,...visual()},randomId('cp')):saveSeed(telemetry,storage,{color,phase,reward:rewardState,...visual()},randomId('cp'));
  $('#path-status').textContent=result.ok?'เก็บรอยและสิ่งที่ทำไว้แล้ว กลับมาที่ลิงก์เดิมบนเครื่องนี้ได้':'เครื่องนี้ยังเก็บให้ไม่ได้ แต่สิ่งที่ทำยังอยู่ และเล่นต่อได้';
  if(result.ok){rememberKeepsake(storage,telemetry.state.snapshot());keepsakes.refresh();$('#save-path').disabled=true;$('#save-path').textContent='เก็บไว้แล้วบนเครื่องนี้';}
 });
 function handoff(event,id){
  if(event.type==='auxclick'&&event.button!==1)return;
  if(busy){event.preventDefault();return;}if(telemetry.state.snapshot().qualifyingReturn)telemetry.resume();
  outcomeLink(event.currentTarget,true);
  const handoffId=event.currentTarget.dataset.handoff||randomId('h');telemetry.state.updateJourney({stage:'door-open',doorId:id});
  const sent=emit('DOOR_OPEN',{handoffId,properties:{fromNode:'reward',toNode:id}});
  if(sent.ok)captureOutcomeDeparture(handoffId,telemetry.pending().find(e=>e.eventId===sent.eventId),storage);
  if(id==='dungeon'){
   const dungeon=emit('DUNGEON_HANDOFF',{handoffId,properties:{fromNode:'reward',toNode:'dungeon'}});
   if(dungeon.ok)captureOutcomeDeparture(handoffId,telemetry.pending().find(e=>e.eventId===dungeon.eventId),storage);
  }
  void telemetry.flush({force:true});
 }
 $('#open-path').addEventListener('click',event=>{
  handoff(event,legacy?recommend(legacy.wish,legacy.answer).id:seedDestination(color,rewardState).id);
 });
 $('#seed-meet').addEventListener('click',event=>handoff(event,'meet'));
 $('#seed-explore').addEventListener('click',event=>handoff(event,'classroom'));
 for(const [selector,door] of [['#open-path',null],['#seed-meet','meet'],['#seed-explore','classroom']])$(selector).addEventListener('auxclick',event=>handoff(event,door||(legacy?recommend(legacy.wish,legacy.answer).id:seedDestination(color,rewardState).id)));
 for(const selector of ['#open-path','#seed-meet','#seed-explore'])$(selector).addEventListener('contextmenu',event=>{if(!busy)outcomeLink(event.currentTarget,true);});
 window.addEventListener('pageshow',event=>{if(event.persisted){handoffs.clear();for(const selector of ['#open-path','#seed-meet','#seed-explore'])if(!$(selector).hidden&&$(selector).getAttribute('href')!=='#')outcomeLink($(selector),true);}});
 $('#rebuild-path').addEventListener('click',()=>{if(busy)return;telemetry.rebuild();telemetry.state.updateJourney({experienceVersion:EXPERIENCE});question();});
 function legacyDoor(saved,{saved:durable=true}={}){
  legacy=saved;const door=recommend(saved.wish,saved.answer);copy(door.title,door.line,'ทางที่คุณเก็บไว้');choices([],()=>{});hideNext();
  $('#door-actions').hidden=false;$('#open-path').hidden=false;$('#open-path').href=door.href;$('#open-path').textContent=door.action;
  outcomeLink($('#open-path'));
  $('#save-path').disabled=durable;$('#save-path').textContent=durable?'เก็บไว้แล้วบนเครื่องนี้':'เก็บทางนี้ไว้';$('#rebuild-path').hidden=false;
  if(door.id==='home'){$('#path-overline').textContent='ทางหนึ่งที่เข็มทิศยังจำได้';$('#path-end').textContent=door.end;$('#path-end').hidden=false;}
 }
 function recover(saved,old=false,newCopy=false){activate();hideNext();copy('ทางของคุณยังอยู่','','รอยเดิม เข็มทิศเดิม');return work(async()=>{
  await restore(saved);
  if(old){const door=recommend(saved.wish,saved.answer);await assembly.assemble(door.image,{final:true,immediate:true,crop:{focusY:door.id==='meet'?.08:.5}});}
  else{color=saved.color;rewardState=saved.reward;body.dataset.seed=color;body.style.setProperty('--seed-color',SEEDS[color].color);await assembly.assemble(SEEDS[color].image,renderOptions({immediate:true,arrived:saved.phase==='reward'}));}
  copy('ทางของคุณยังอยู่',old?recommend(saved.wish,saved.answer).title:getRewardOutcome(color,rewardState).complete?getRewardOutcome(color,rewardState).summary:SEEDS[color].title,'ยินดีที่ได้เจอกันอีก');
  choices([['resume','ไปต่อจากตรงนี้']],()=>{if(telemetry.state.snapshot().qualifyingReturn)telemetry.resume();if(old)legacyDoor(saved);else{saved.phase==='reward'?enterReward():horizon({saved:!newCopy});$('#save-path').disabled=!newCopy;$('#save-path').textContent=newCopy?'เก็บรอยที่เริ่มต่อไว้':'เก็บไว้แล้วบนเครื่องนี้';}});
  $('#rebuild-path').hidden=false;focus();
 });}
 const snapshot=telemetry.state.snapshot(),saved=loadSeed(snapshot,storage),old=loadPath(snapshot,storage);if(saved){rememberKeepsake(storage,snapshot);keepsakes.refresh();void recover(saved);}else if(old)void recover(old,true);
 document.addEventListener('visibilitychange',()=>document.hidden?assembly.suspend():assembly.resume());
 return {get active(){return active;},ready(){if(!active)$('#continue-discovery').hidden=false;},hide(){if(!active)$('#continue-discovery').hidden=true;}};
}
