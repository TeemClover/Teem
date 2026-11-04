import {applicationDay} from './added-date.js';
export const BASELINE_DAY='2026-11-01';
const DAY=86400000;
export function validDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function dayKey(at=new Date()){if(validDay(at))return at;return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
export function addDays(day,n){return new Date(Date.parse(day+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);}
export function weekStart(day=dayKey()){const days=Math.max(0,Math.floor((Date.parse(day)-Date.parse(BASELINE_DAY))/DAY));return addDays(BASELINE_DAY,Math.floor(days/7)*7);}
// The first day includes earlier SEEK applications. Import/edit timestamps
// never establish an application date; missing source dates remain explicit.
export function discoveryDay(card){const day=applicationDay(card);return !day?'':day<=BASELINE_DAY?BASELINE_DAY:day;}
export function inRange(card,range,selectedDay,start){const day=discoveryDay(card);return range==='all'||(range==='unknown'?!day:range==='week'?Boolean(day)&&day>=start&&day<addDays(start,7):day===selectedDay);}
export function formatDay(day,options={day:'numeric',month:'short'}){return new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',...options}).format(new Date(day+'T12:00:00Z'));}
export const CALL_LABELS={not_contacted:'ยังไม่โทร',no_answer:'โทรไม่ติด',callback:'รอโทรกลับ',contacted:'คุยแล้ว',scheduled:'นัดสัมภาษณ์แล้ว'};
