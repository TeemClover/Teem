import {problem} from './model.js';
import {BASELINE_DAY,validDay,weekStart,CALL_LABELS} from '../../../candidate/calendar.js';
export function activityWeek(value){if(!validDay(value)||value<BASELINE_DAY||weekStart(value)!==value)throw problem('BAD_ACTIVITY_WEEK');return value;}
function bounded(value,max,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw problem('BAD_TEAM_NOTE');return value.trim();}
export function normalizeTeamNote(body){
 const id=bounded(body.noteId,80,true);if(!/^[a-zA-Z0-9_-]{12,80}$/.test(id))throw problem('BAD_TEAM_NOTE');
 const author=bounded(body.author,80,true),note=bounded(body.note,4000),owner=bounded(body.owner,80),callStatus=body.callStatus;
 if(!Object.hasOwn(CALL_LABELS,callStatus))throw problem('BAD_CALL_STATUS');
 const nextContactAt=body.nextContactAt||'';if(typeof nextContactAt!=='string'||nextContactAt&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+07:00$/.test(nextContactAt)||!validDay(nextContactAt.slice(0,10))||Number(nextContactAt.slice(11,13))>23||Number(nextContactAt.slice(14,16))>59||Number.isNaN(Date.parse(nextContactAt))))throw problem('BAD_CONTACT_TIME');
 const answers=body.answers;if(answers!==undefined&&(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.entries(answers).some(([k,v])=>!/^\d{1,2}$/.test(k)||typeof v!=='string'||v.length>4000)))throw problem('BAD_TEAM_NOTE');
 const values={owner,callStatus,nextContactAt},fields=body.screeningFields??Object.keys(values);if(!Array.isArray(fields)||new Set(fields).size!==fields.length||fields.some(k=>!Object.hasOwn(values,k)))throw problem('BAD_TEAM_NOTE');
 return {id,author,note,screening:Object.fromEntries(fields.map(k=>[k,values[k]])),...(answers===undefined?{}:{answers})};
}
export function mergeAnswers(existing,answers){
 if(answers===undefined)return existing;
 let notes={note:existing||'',answers:{}};try{const parsed=JSON.parse(existing);if(parsed&&typeof parsed==='object'&&typeof parsed.note==='string'&&!Array.isArray(parsed))notes=parsed;}catch{}
 const value=JSON.stringify({...notes,answers:{...notes.answers,...answers}});if(value.length>12000)throw problem('NOTE_TOO_LONG',413);return value;
}
