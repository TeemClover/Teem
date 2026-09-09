/** Explicit wishes, not inferred personality. Only the chosen pair selects a destination. */
export const PATH_VERSION = 1;
export const WISHES = Object.freeze({
 make: { label:'ได้ลองทำสิ่งใหม่', question:'อยากให้สิ่งที่ทำ ไปอยู่ตรงไหน?', image:'/frontdoor/art/workshop.webp', reply:'ที่ว่างนี้ กำลังกลายเป็นที่ให้คุณลอง', options:[['screen','บนจอที่เปลี่ยนได้'],['daily','ในชีวิตจริง ทีละนิด']] },
 care: { label:'มีวันที่เบาขึ้นสักหน่อย', question:'เริ่มแบบไหนสบายใจกว่า?', image:'/frontdoor/art/underpaper-valley.webp', reply:'เว้นที่ไว้ให้หนึ่งวันของคุณ', options:[['notice','ลองมองหนึ่งวันของตัวเอง'],['person','มีคนช่วยคิดด้วย']] },
 together: { label:'มีใครสักคนร่วมทาง', question:'อยากเริ่มด้วยอะไรเล็ก ๆ?', image:'/teambook/assets/entry/notebook-open.webp', reply:'จากที่ของคนเดียว มีที่ให้อีกคนแล้ว', options:[['trace','ฝากรอยไว้ให้กัน'],['talk','คุยเรื่องที่ยังค้างอยู่']] },
});
const routes = {
 'home:original':{id:'home',primary:'curious',secondary:'learn',image:'/img/home-opening-poster.jpg',title:'บ้านที่เรื่องทั้งหมดเริ่มต้น',line:'ฟังเจ้าบ้านเปิดบ้าน 44 วินาที แล้วลองเดินตามเรื่องราว การ์ตูน และบทเรียนที่อยู่ข้างใน',action:'เปิดบ้าน myClover',href:'/home/?entry=compass',room:'บ้าน myClover · เส้นทางดั้งเดิม',end:'ฟังเจ้าบ้าน → เดินตามเรื่องราว → ลองเรียนและเล่น'},
 'make:screen':{id:'dungeon',primary:'build',secondary:'learn',image:'/frontdoor/art/workshop.webp',title:'โลกที่คุณแก้ได้',line:'เปลี่ยนประโยคหนึ่ง แล้วเปิดดูเว็บที่เปลี่ยนตามมือคุณ',action:'เข้าไปลองแก้',href:'/classroom/dungeon/?entry=compass#q2',room:'THE DUNGEON · ห้องทดลองเว็บ',end:'แก้ → เปิดดู → เห็นผลจริง'},
 'make:daily':{id:'teambook',primary:'build',secondary:'repeat',image:'/teambook/assets/entry/notebook-open.webp',title:'สิ่งเล็ก ๆ ที่เริ่มเป็นจริง',line:'ตั้งชื่อสมุดส่วนตัว ลงรอยแรกวันนี้ แล้วค่อยชวนใครมาก็ได้',action:'เปิดสมุดของฉัน',href:'https://teambook.me/?open=1&entry=compass',room:'TeamBook · สมุด 7 วัน',end:'ตั้งชื่อ → เปิดเล่ม → ลงรอยแรก'},
 'care:notice':{id:'xircle',primary:'self',secondary:'see',image:'/frontdoor/art/underpaper-valley.webp',title:'หนึ่งวันที่มองเห็น',line:'ลองมองการกิน ขยับ นอน แล้วเลือกสิ่งเดียวที่อยากสังเกตต่อ',action:'ลองมองหนึ่งวัน',href:'/xircle/?entry=compass',room:'XIRCLE · แบบลองมองหนึ่งวัน',end:'ทบทวน → เห็นภาพ → เลือกหนึ่งอย่าง'},
 'care:person':{id:'meet',primary:'self',secondary:'human-help',image:'/meet/img/hero.jpg',title:'มีคนอยู่ตรงนี้',line:'เอาเรื่องของคุณมาคุยกับทีมและอาโกะ เริ่มจากนัดเวลาที่สะดวก',action:'เลือกเวลาคุยกัน',href:'/meet/?entry=compass&intent=health',room:'myClover Session · คุยกับคนจริง',end:'เลือกเวลา → ส่งคำขอนัด → รอการยืนยัน'},
 'together:trace':{id:'teambook',primary:'people',secondary:'together',image:'/teambook/assets/entry/notebook-many-traces.webp',title:'รอยเล็ก ๆ ที่เห็นกันทุกวัน',line:'เปิดสมุดส่วนตัว ฝากรอยแรก แล้วส่งรหัสให้คนที่นึกถึง',action:'เริ่มสมุดของเรา',href:'https://teambook.me/?open=1&entry=compass',room:'TeamBook · สมุด 7 วัน',end:'เปิดเล่ม → ลงรอย → ชวนเมื่อพร้อม'},
 'together:talk':{id:'meet',primary:'people',secondary:'human-help',image:'/meet/img/hero.jpg',title:'เรื่องที่ไม่ต้องคิดคนเดียว',line:'ไม่ต้องเตรียมคำตอบให้พร้อม เอาเรื่องที่คิดอยู่มาคุยกัน',action:'เลือกเวลาคุยกัน',href:'/meet/?entry=compass&intent=curious',room:'myClover Session · คุยกับคนจริง',end:'เลือกเวลา → ส่งคำขอนัด → รอการยืนยัน'},
};
export function recommend(wish,answer){const item=routes[`${wish}:${answer}`];return item?{...item}:null;}
export function validAnswers(value){return value&&(WISHES[value.wish]||(value.wish==='home'&&value.answer==='original'))&&recommend(value.wish,value.answer)?{wish:value.wish,answer:value.answer}:null;}
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
/** Only bounded visual coordinates live here. This object is never passed to analytics. */
export function visualRecord(input,journeyId){
 const answers=validAnswers(input);if(!answers||typeof journeyId!=='string')return null;
 return {version:PATH_VERSION,journeyId,...answers,cursor:point(input.cursor)?{x:input.cursor.x,y:input.cursor.y}:{x:.44,y:.55},
  trail:Array.isArray(input.trail)?input.trail.filter(point).slice(0,256).map(p=>({x:p.x,y:p.y})):[],
  crossing:Array.isArray(input.crossing)?input.crossing.filter(point).slice(0,97).map(p=>({x:p.x,y:p.y})):[]};
}
export const visualKey=(journeyId,revision)=>`mc:frontdoor:compass-path:v1:${journeyId}:${revision}`;
/** Write the visual companion first. Failed foundation save leaves the older companion untouched. */
export function savePath(telemetry,storage,input,revision){
 const before=telemetry.state.snapshot(),record=visualRecord(input,before.journey.journeyId);
 if(!record||!/^cp-[a-zA-Z0-9_-]{1,64}$/.test(revision))return {ok:false,error:'INVALID_PATH'};
 const key=visualKey(record.journeyId,revision),serialized=JSON.stringify(record);
 try{if(!storage)return {ok:false,error:'STORAGE_UNAVAILABLE'};storage.setItem(key,serialized);if(storage.getItem(key)!==serialized)return {ok:false,error:'VISUAL_SAVE_FAILED'};}catch{return {ok:false,error:'VISUAL_SAVE_FAILED'};}
 // The companion reference commits in the same durable foundation checkpoint.
 // A failed checkpoint never changes which old visual record can be resumed.
 const door=recommend(record.wish,record.answer);
 return telemetry.save({stage:'door-found',doorId:door.id,intentPrimary:door.primary,intentSecondary:door.secondary,checkpointRef:revision});
}
export function loadPath(snapshot,storage){
 const cp=snapshot?.journey?.checkpoint,revision=cp?.checkpointRef;if(!/^cp-[a-zA-Z0-9_-]{1,64}$/.test(revision||''))return null;
 try{const raw=storage?.getItem(visualKey(cp.journeyId,revision));if(!raw||raw.length>20000)return null;const data=JSON.parse(raw);if(data.version!==PATH_VERSION||data.journeyId!==cp.journeyId)return null;return visualRecord(data,cp.journeyId);}catch{return null;}
}
