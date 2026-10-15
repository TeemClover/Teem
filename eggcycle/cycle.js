// Calendar estimates only. All arithmetic uses date-only UTC values; today is Bangkok.
export const DAY = 86400000;
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
}
export const addDays = (s,n) => new Date(Date.parse(s)+n*DAY).toISOString().slice(0,10);
export const daysBetween = (a,b) => Math.round((Date.parse(b)-Date.parse(a))/DAY);
export const todayBangkok = (now=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function blankState(initialStart='') {
  return {cycleLength:28,periodLength:5,periods:initialStart?[{start:initialStart,end:null}]:[],notes:{},notifications:{enabled:false,hour:8,detail:false},revision:0};
}
export function validateState(value,today=todayBangkok()) {
  const bad=()=>{throw Object.assign(new Error('ข้อมูลไม่ถูกต้อง กรุณาตรวจวันที่และค่าที่บันทึก'),{status:400});};
  if(!value || !Number.isInteger(value.cycleLength)||value.cycleLength<21||value.cycleLength>45 || !Number.isInteger(value.periodLength)||value.periodLength<1||value.periodLength>10 || !Number.isInteger(value.revision)||value.revision<0) bad();
  if(!Array.isArray(value.periods)||value.periods.length>500) bad();
  const seen=new Set();
  const periods=value.periods.map(p=>{
    if(!validDate(p.start)||p.start>today||p.start<'2000-01-01'||seen.has(p.start))bad();
    if(p.end!==null&&(!validDate(p.end)||p.end<p.start||p.end>today||daysBetween(p.start,p.end)>30))bad();
    seen.add(p.start);return {start:p.start,end:p.end};
  }).sort((a,b)=>a.start.localeCompare(b.start));
  if(periods.some((p,i)=>i>0&&periods[i-1].end&&periods[i-1].end>=p.start))bad();
  const notes={};
  if(!value.notes||typeof value.notes!=='object'||Array.isArray(value.notes)||Object.keys(value.notes).length>2000)bad();
  for(const [date,n] of Object.entries(value.notes)){
    if(!validDate(date)||date>today||!n||typeof n.text!=='string'||n.text.length>1000||!['none','light','medium','heavy'].includes(n.flow)||!Number.isInteger(n.pain)||n.pain<0||n.pain>3)bad();
    notes[date]={text:n.text,flow:n.flow,pain:n.pain};
  }
  const n=value.notifications;
  if(!n||typeof n.enabled!=='boolean'||typeof n.detail!=='boolean'||!Number.isInteger(n.hour)||n.hour<0||n.hour>23)bad();
  return {cycleLength:value.cycleLength,periodLength:value.periodLength,periods,notes,notifications:{enabled:n.enabled,hour:n.hour,detail:n.detail},revision:value.revision};
}
export function estimate(state,date=todayBangkok()) {
  const periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));
  const p=periods.filter(p=>p.start<=date).at(-1);
  if(!p)return {kind:'unknown',label:'ยังไม่มีข้อมูล',estimated:true};
  const day=daysBetween(p.start,date)+1;
  const next=addDays(p.start,state.cycleLength);
  // Day 14 of a 28-day cycle, not a confirmed ovulation measurement.
  const ovulation=addDays(p.start,state.cycleLength-15);
  const fertileStart=addDays(p.start,7),fertileEnd=addDays(p.start,18);
  const regular=state.cycleLength>=26&&state.cycleLength<=32&&periods.slice(-7).every((x,i,a)=>i===0||(daysBetween(a[i-1].start,x.start)>=26&&daysBetween(a[i-1].start,x.start)<=32));
  const end=p.end||addDays(p.start,state.periodLength-1);
  const recorded=Boolean(p.end&&date<=p.end)||date===p.start;
  let kind,label;
  if(date>=next){kind='unknown';label='รอยืนยันรอบใหม่';}
  else if(date<=end){kind='period';label=recorded?'บันทึกประจำเดือน':'ประจำเดือน (คาดการณ์)';}
  else if(!regular){kind='unknown';label='ช่วงเจริญพันธุ์ไม่แน่นอน';}
  else if(date>=fertileStart&&date<=fertileEnd){kind='fertile';label='โอกาสตั้งครรภ์สูงขึ้น';}
  else{kind='lower';label='โอกาสต่ำกว่า · ยังตั้งครรภ์ได้';}
  return {kind,label,day,start:p.start,next,ovulation,ovulationFrom:addDays(ovulation,-2),ovulationTo:addDays(ovulation,2),fertileStart,fertileEnd,regular,estimated:!recorded};
}
export function calendarDay(state,date,today=todayBangkok()) {
  const result=estimate(state,date);
  const last=state.periods.at(-1);
  if(last&&date>=addDays(last.start,state.cycleLength)&&date>today){
    const n=Math.floor(daysBetween(last.start,date)/state.cycleLength);
    const start=addDays(last.start,n*state.cycleLength);
    if(daysBetween(start,date)<state.periodLength)return {...result,kind:'predicted',label:'ประจำเดือนรอบถัดไป (คาดการณ์)',estimated:true};
  }
  return result;
}
export function reminders(state,date) {
  if(!state.notifications.enabled||!state.periods.length)return [];
  const e=estimate(state,date),out=[];
  const push=(type,text)=>out.push({key:`${e.start}:${type}:${date}`,type,text});
  if(e.regular){
    if(date===addDays(e.fertileStart,-1))push('fertile-soon','พรุ่งนี้เข้าสู่ช่วงที่โอกาสตั้งครรภ์สูงขึ้นตามปฏิทิน');
    if(date===e.fertileStart)push('fertile','เริ่มช่วงที่โอกาสตั้งครรภ์สูงขึ้นตามปฏิทิน');
    if(date===addDays(e.ovulation,-2))push('ovulation','เข้าสู่ช่วงประมาณการไข่ตก (±2 วัน) ไม่ใช่การยืนยันไข่ตก');
  }
  const remaining=daysBetween(date,e.next);
  if([3,1,0].includes(remaining))push('period',remaining?`ประจำเดือนอาจมาในอีก ${remaining} วัน`:'วันนี้เป็นวันที่คาดว่าประจำเดือนจะมา');
  if(remaining===-3)push('late','เลยวันคาดการณ์มา 3 วันแล้ว หากมาแล้วให้บันทึกรอบใหม่');
  return out;
}
