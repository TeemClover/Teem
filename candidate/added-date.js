const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
const labelFormatter=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium'});

// Convert the original SEEK application timestamp using the team's timezone.
export function addedDay(timestamp){
 if(!timestamp)return '';
 const date=new Date(timestamp);
 if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(dayFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function addedDayLabel(day){
 if(day==='unknown')return 'รอยืนยันวันที่สมัคร';
 if(day==='2026-10')return 'ตุลาคม 2569 · สะสมเดิม';
 return labelFormatter.format(new Date(`${day}T00:00:00+07:00`));
}
export function applicationDay(card){return addedDay(card.applied_at||card.profile?.presentation?.appliedAt);}
export function applicationGroup(card){const day=applicationDay(card);return !day?'unknown':day<'2026-11-01'?'2026-10':day;}
export function matchesAddedDay(card,day){
 return !day||applicationGroup(card)===day;
}
export function addedDays(cards,selected=''){
 const counts=new Map();
 for(const card of cards){const key=applicationGroup(card);counts.set(key,(counts.get(key)||0)+1);}
 if(selected&&!counts.has(selected))counts.set(selected,0);
 return [...counts].sort(([a],[b])=>a==='unknown'?1:b==='unknown'?-1:b.localeCompare(a));
}
