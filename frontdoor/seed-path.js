/** myClover 6.0: RGBS are wishes for this visit, never personality classes. */
import { validateReward, getRewardOutcome } from './rewards.js';
export const SEED_VERSION = 6;
export const SEEDS = Object.freeze({
 red:{name:'BODY',label:'อะไรที่ทำให้มีความสุขกับชีวิต',color:'#ed8266',leaf:0,primary:'self',secondary:'see',image:'/frontdoor/art/seed-red-ako-v2.webp',imageMobile:'/frontdoor/art/seed-red-ako-v2-mobile.webp',crop:{fit:'cover',focusX:.5,focusY:.58,aspect:1.04},title:'ความอร่อย อยู่ใกล้กว่าที่คิด',promise:'ลองเปลี่ยนรสของสิ่งธรรมดา ให้เป็นมื้อที่อยากกิน',hint:'มีอะไรให้ลองในครัวเล็ก ๆ ฝั่งนั้น'},
 green:{name:'SOUL',label:'จังหวะชีวิตที่ดีกับตัวเอง',color:'#b2ca78',leaf:1,primary:'self',secondary:'improve',image:'/frontdoor/art/seed-green-pause-v2.webp',imageMobile:'/frontdoor/art/seed-green-pause-v2-mobile.webp',crop:{fit:'cover',focusX:.5,focusY:.35,aspect:1.12},title:'เว้นที่ให้ตัวเองสักนิด',promise:'เลือกหนึ่งเรื่องของวันนี้ แล้วหาจุดเริ่มที่พอดีกับคุณ',hint:'วันนี้ เริ่มเพียงอย่างเดียวก็ได้'},
 blue:{name:'MIND',label:'มุมมองที่ยังหาไม่เจอ',color:'#86bde0',leaf:2,primary:'curious',secondary:'learn',image:'/frontdoor/art/seed-blue-teem-v2.webp',imageMobile:'/frontdoor/art/seed-blue-teem-v2-mobile.webp',crop:{fit:'cover',focusX:.5,focusY:.45,aspect:1.12},title:'คำถามเปลี่ยน สิ่งที่เห็นก็เปลี่ยน',promise:'ลองวางโจทย์งานให้ AI แล้วดูว่าบริบทเปลี่ยนคำตอบอย่างไร',hint:'มีวิธีคิดที่เอากลับไปใช้กับงานได้'},
 silver:{name:'CRAFT',label:'สิ่งที่อยากทำให้เป็นจริง',color:'#d5d5ce',leaf:3,primary:'build',secondary:'skill',image:'/frontdoor/art/seed-silver-maker-v2.webp',imageMobile:'/frontdoor/art/seed-silver-maker-v2-mobile.webp',crop:{fit:'cover',focusX:.5,focusY:.55,aspect:1.12},title:'พื้นที่ชิ้นแรกของคุณ',promise:'เปลี่ยนหนึ่งประโยค แล้วเห็นเว็บที่เป็นของคุณต่อหน้าต่อตา',hint:'อีกฝั่งมีพื้นที่ให้สร้างจริง'},
});
export function seedIntent(color,state){return color==='blue'&&state?.scenario==='network'?{intentPrimary:'income',intentSecondary:'business'}:{intentPrimary:SEEDS[color].primary,intentSecondary:SEEDS[color].secondary};}
export function seedDestination(color,state){
 const reward=validateReward(color,state);if(!reward)return null;
 if(color==='red')return {id:'ako',href:'/ako/',action:'ไปดูครัวของเอโกะ',meet:'/meet/?entry=compass&intent=health',meetLabel:'คุยเรื่องกินและดูแลตัวเอง'};
 if(color==='green'){
  const focus=reward.context?`&focus=${reward.context}`:'';
  return {id:'xircle',href:`/xircle/?entry=compass${focus}`,action:'ลองมองหนึ่งวันกับ Xircle',meet:`/meet/?intent=health&from=xircle&open=booking${focus}`,meetLabel:'นัดดูข้อมูลและกิจวัตรด้วยกัน'};
 }
 if(color==='blue'){
  if(reward.scenario==='network')return {id:'meet',href:`/meet/?entry=compass&intent=opportunity&need=${reward.need||'first-test'}&offer=${reward.offer||'skill'}`,action:'เอาแผนนี้มาคุยกับทีม',meetLabel:'หาโอกาสที่พอดีกับสิ่งที่มี'};
  if(reward.scenario==='course'&&reward.learningPath){
   const coach={meet:'/meet/?entry=compass&intent=ai&topic=course',meetLabel:'ให้ทีมช่วยเลือกคอร์สหรือพาลอง'};
   return reward.learningPath==='comic'
    ? {id:'forge',href:'/forge/ep1-everyone-gets-to-play/?entry=compass',action:'เปิดการ์ตูน ตอนแรก',...coach}
    : {id:'classroom',href:'/classroom/free-ai.html?entry=compass',action:'ลองต่อกับ AI ใส่ซอส',...coach};
  }
  const topic={executive:'private',team:'team',solo:'private',course:'course'}[reward.scenario]||'explore';
  return {id:'meet',href:`/meet/?entry=compass&intent=ai&topic=${topic}`,action:topic==='team'?'คุยเรื่อง AI สำหรับทีม':topic==='course'?'หาคอร์ส AI ที่เหมาะกับฉัน':'เอางานแบบนี้มาคุยกับทีม'};
 }
 return {id:'dungeon',href:'/classroom/dungeon/?entry=compass#q2',action:'ทดลองสร้างต่อในห้องทำเว็บ',meet:'/meet/?entry=compass&intent=ai&topic=private',meetLabel:'ให้ทีมช่วยพาไปต่อด้วย AI'};
}
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export function seedRecord(input,journeyId){
 if(!input||!Object.hasOwn(SEEDS,input.color)||typeof journeyId!=='string')return null;
 const reward=validateReward(input.color,input.reward);if(!reward)return null;
 return {version:SEED_VERSION,journeyId,color:input.color,phase:['horizon','reward'].includes(input.phase)?input.phase:'horizon',reward,
  cursor:point(input.cursor)?{x:input.cursor.x,y:input.cursor.y}:{x:.44,y:.55},
  trail:Array.isArray(input.trail)?input.trail.filter(point).slice(0,256).map(p=>({x:p.x,y:p.y})):[],
  crossing:Array.isArray(input.crossing)?input.crossing.filter(point).slice(0,97).map(p=>({x:p.x,y:p.y})):[]};
}
export const seedKey=(journeyId,revision)=>`mc:frontdoor:seed:v6:${journeyId}:${revision}`;
export function saveSeed(telemetry,storage,input,revision){
 const record=seedRecord(input,telemetry.state.snapshot().journey.journeyId);
 if(!record||!/^cp-[a-zA-Z0-9_-]{1,64}$/.test(revision))return {ok:false,error:'INVALID_SEED'};
 const key=seedKey(record.journeyId,revision),raw=JSON.stringify(record);
 try{if(!storage)return {ok:false,error:'STORAGE_UNAVAILABLE'};storage.setItem(key,raw);if(storage.getItem(key)!==raw)return {ok:false,error:'SEED_SAVE_FAILED'};}catch{return {ok:false,error:'SEED_SAVE_FAILED'};}
 const door=seedDestination(record.color,record.reward);
 return telemetry.save({stage:getRewardOutcome(record.color,record.reward).complete?'door-found':'reward',doorId:door.id,...seedIntent(record.color,record.reward),checkpointRef:revision});
}
export function loadSeed(snapshot,storage){
 const cp=snapshot?.journey?.checkpoint,ref=cp?.checkpointRef;
 if(!/^cp-[a-zA-Z0-9_-]{1,64}$/.test(ref||''))return null;
 try{const raw=storage?.getItem(seedKey(cp.journeyId,ref));if(!raw||raw.length>22000)return null;const data=JSON.parse(raw);return data.version===SEED_VERSION&&data.journeyId===cp.journeyId?seedRecord(data,cp.journeyId):null;}catch{return null;}
}
export {getRewardOutcome};
