import {scryptSync,timingSafeEqual} from 'node:crypto';
export function candidatePasswordMatches(password,record){
 if(typeof password!=='string'||password.length>300||typeof record!=='string')return false;
 const parts=record.split(':');if(parts.length!==2||!/^[a-f0-9]{32}$/.test(parts[0])||!/^[a-f0-9]{64}$/.test(parts[1]))return false;
 const actual=scryptSync(password,parts[0],32),wanted=Buffer.from(parts[1],'hex');
 return timingSafeEqual(actual,wanted);
}
export function normalizePresentation(input={}){
 const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
 const p={};
 for(const [key,limit] of [['nickname',80],['nicknameSource',500],['portraitSource',500]])if(Object.hasOwn(input,key))p[key]=clean(input[key],limit);
 if(Object.hasOwn(input,'appliedAt')){
  const value=clean(input.appliedAt,80),source=clean(input.appliedAtSource,500),date=new Date(value);
  if(!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(date.getTime())||!source)throw Object.assign(new Error('BAD_APPLICATION_DATE'),{code:'BAD_APPLICATION_DATE',status:400});
  p.appliedAt=date.toISOString();p.appliedAtSource=source;
 }
 if(p.nickname&&!p.nicknameSource)throw Object.assign(new Error('PRESENTATION_SOURCE_REQUIRED'),{code:'PRESENTATION_SOURCE_REQUIRED',status:400});
 if(input.portraitBase64){
  if(typeof input.portraitBase64!=='string'||input.portraitBase64.length>400000||!p.portraitSource)throw Object.assign(new Error('BAD_PORTRAIT'),{code:'BAD_PORTRAIT',status:400});
  const bytes=Buffer.from(input.portraitBase64,'base64');const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if((!png&&!jpg)||bytes.length>300000)throw Object.assign(new Error('BAD_PORTRAIT'),{code:'BAD_PORTRAIT',status:400});
  p.portraitBase64=bytes.toString('base64');p.portraitMime=png?'image/png':'image/jpeg';
 }
 return p;
}
