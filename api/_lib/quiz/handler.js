import { createHash } from 'node:crypto';
import { GameError, newToken, tokenHash, prepareQuestions, validateJoin } from './game.js';
import { productionStore } from './store.js';
import { ANNIVERSARY_TITLE } from '../../../quiz/question-set.js';

const MUTATIONS=new Set(['join','answer','start','reveal','leaderboard','next','finish']);
const TOKEN=/^[a-f0-9]{64}$/;
function send(res,body,status=200,shared=false){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control',shared?'public, max-age=0, must-revalidate':'private, no-store');
 res.setHeader('Vercel-CDN-Cache-Control',shared?'public, s-maxage=1':'no-store');
 res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));
}
export function createQuizHandler({getStore=productionStore,clock=Date.now,log=console.error}={}){
 return async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method==='OPTIONS'){res.setHeader('Allow','GET, POST');return send(res,{ok:true});}
   if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,{ok:false,error:'METHOD_NOT_ALLOWED'},405);}
   let payload={};
   if(req.method==='POST'){
    const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
    if(origin && new URL(origin).host!==host)throw new GameError('BAD_ORIGIN',403);
    if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new GameError('JSON_REQUIRED',415);
    const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
    if(Buffer.byteLength(raw)>96*1024)throw new GameError('BODY_TOO_LARGE',413);
    try{payload=typeof req.body==='object'&&req.body!==null?req.body:JSON.parse(raw);}catch{throw new GameError('BAD_JSON');}
    if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new GameError('BAD_JSON');
   }
   const action=req.method==='GET'?url.searchParams.get('action')||'state':payload.action;
   if(action==='clock'&&req.method==='GET')return send(res,{ok:true,serverNow:clock()});
   if(action==='create'&&req.method==='POST'){
    const mode=payload.mode??'anniversary';
    if(!['anniversary','custom'].includes(mode))throw new GameError('BAD_MODE');
    if(mode==='custom'&&!Array.isArray(payload.questions))throw new GameError('BAD_QUESTION_COUNT');
    const title=String(payload.title||'').trim().slice(0,80)||(mode==='custom'?'คำถามของเรา':ANNIVERSARY_TITLE);
    const hostToken=newToken(),questions=prepareQuestions(Number(payload.seconds||20),mode==='custom'?payload.questions:null);
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
    const rateKey=createHash('sha256').update(ip+':'+Math.floor(clock()/3600000)).digest('hex');
    const store=await getStore();const room=await store.create({title,questions,hostHash:tokenHash(hostToken),rateKey});
    return send(res,{ok:true,...room,hostToken},201);
   }
   const code=String(req.method==='GET'?url.searchParams.get('code')||'':payload.code||'');
   if(!/^\d{6}$/.test(code))throw new GameError('BAD_CODE');
   if(action==='state'&&req.method==='GET'){const store=await getStore();return send(res,{ok:true,...await store.snapshot(code)},200,true);}
   if((action==='me'&&req.method==='GET')||(MUTATIONS.has(action)&&req.method==='POST')){
    const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
    if(!TOKEN.test(token))throw new GameError('UNAUTHORIZED',401);
    if(action==='join')payload=validateJoin(payload);
    if(action==='answer'&&(!Number.isInteger(payload.index)||!Number.isInteger(payload.choice)||payload.choice<0||payload.choice>3))throw new GameError('BAD_CHOICE');
    const store=await getStore();const result=await store.command({code,hash:tokenHash(token),action,payload});
    const state=['start','reveal','leaderboard','next','finish'].includes(action)?await store.snapshot(code):undefined;
    return send(res,{ok:true,...result,...(state?{state}:{})});
   }
   throw new GameError('UNKNOWN_ACTION',404);
  }catch(e){
   if(e instanceof GameError)return send(res,{ok:false,error:e.code},e.status);
   log('QUIZ_REQUEST_FAILED',e?.code||'INTERNAL');return send(res,{ok:false,error:'SERVICE_UNAVAILABLE'},503);
  }
 };
}
