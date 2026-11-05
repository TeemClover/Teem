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
export function hasCompleteApplicationDirectory(cards,counts){
 if(!Array.isArray(cards)||!Array.isArray(counts))return false;
 const expected=new Map(),actual=new Map(),ids=new Set();
 for(const row of counts){if(!row||!['number','string'].includes(typeof row.count)||String(row.count).trim()==='')return false;const count=Number(row.count);if(!row.job_id||!Number.isSafeInteger(count)||count<0)return false;expected.set(row.job_id,(expected.get(row.job_id)||0)+count);}
 for(const card of cards){if(!card||!card.id||!card.job_id||ids.has(card.id))return false;ids.add(card.id);actual.set(card.job_id,(actual.get(card.job_id)||0)+1);}
 return [...new Set([...expected.keys(),...actual.keys()])].every(job=>(expected.get(job)||0)===(actual.get(job)||0));
}
export function addedDays(cards,selected='',{now=new Date(),complete=false}={}){
 const counts=new Map();
 for(const card of cards){const key=applicationGroup(card);counts.set(key,(counts.get(key)||0)+1);}
 const today=addedDay(now);
 // Zero means no confirmed application date in a complete directory. Unknown
 // source dates stay separate; future and unloaded dates are never padded.
 if(complete&&today){
  for(let day='2026-11-01';day<=today;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10))if(!counts.has(day))counts.set(day,0);
  if(['unknown','2026-10'].includes(selected)&&!counts.has(selected))counts.set(selected,0);
 }
 return [...counts].sort(([a],[b])=>a==='unknown'?1:b==='unknown'?-1:b.localeCompare(a));
}
