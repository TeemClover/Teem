const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
const labelFormatter=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium'});

// Keep the first database insertion date separate from later scoring or edits.
export function addedDay(timestamp){
 if(!timestamp)return '';
 const date=new Date(timestamp);
 if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(dayFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function addedDayLabel(day){
 return day==='unknown'?'ไม่ทราบวันที่เพิ่ม':labelFormatter.format(new Date(`${day}T00:00:00+07:00`));
}
export function matchesAddedDay(card,day){
 return !day||(addedDay(card.created_at)||'unknown')===day;
}
export function addedDays(cards,selected=''){
 const counts=new Map();
 for(const card of cards){const key=addedDay(card.created_at)||'unknown';counts.set(key,(counts.get(key)||0)+1);}
 if(selected&&!counts.has(selected))counts.set(selected,0);
 return [...counts].sort(([a],[b])=>a==='unknown'?1:b==='unknown'?-1:b.localeCompare(a));
}
