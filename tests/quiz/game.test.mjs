import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore, tokenHash, newToken, prepareQuestions, validateJoin, scoreAnswer, publicState } from '../../api/_lib/quiz/game.js';
import { QUESTIONS } from '../../api/_lib/quiz/questions.js';
import { AVATARS } from '../../quiz/avatars.js';
import { createQuizHandler } from '../../api/_lib/quiz/handler.js';

function fixture(){let time=1800000000000;const store=createMemoryStore({clock:()=>time});const host=newToken(),hash=tokenHash(host);return {store,host,hash,clock:()=>time,advance(ms){time+=ms;},async room(){return store.create({title:'Clover',questions:prepareQuestions(),hostHash:hash});}};}
const join=(store,code,hash,name='ทีม')=>store.command({code,hash,action:'join',payload:validateJoin({name,avatar:AVATARS[0].id})});
test('source has exactly twelve four-choice questions; shuffled answer stays attached to text',()=>{
 assert.equal(QUESTIONS.length,12);assert.equal(AVATARS.length,68);
 for(let n=0;n<40;n++)for(const [i,q] of prepareQuestions().entries()){assert.equal(q.options.length,4);assert.equal(q.options[q.correctIndex],QUESTIONS[i].options[0]);assert.equal(new Set(q.options).size,4);}
 assert.throws(()=>prepareQuestions(15));assert.throws(()=>validateJoin({name:'  ',avatar:AVATARS[0].id}));assert.throws(()=>validateJoin({name:'<script>',avatar:AVATARS[0].id}));assert.throws(()=>validateJoin({name:'ok',avatar:'fake'}));
 assert.equal(scoreAnswer(0,20000),1000);assert.equal(scoreAnswer(10000,20000),750);assert.equal(scoreAnswer(20000,20000),500);
});
test('100 simultaneous joins admit exactly 100; retries do not consume seats; 101st fails',async()=>{
 const f=fixture(),{code}=await f.room(),tokens=Array.from({length:100},()=>newToken());
 const players=await Promise.all(tokens.map((t,i)=>join(f.store,code,tokenHash(t),'คนที่ '+i)));
 assert.equal(new Set(players.map(p=>p.playerId)).size,100);assert.equal((await f.store.snapshot(code)).playerCount,100);
 const retry=await join(f.store,code,tokenHash(tokens[0]),'คนที่ 0');assert.equal(retry.playerId,players[0].playerId);
 await assert.rejects(join(f.store,code,tokenHash(newToken()),'เกิน'),{code:'ROOM_FULL'});
});
test('speed, deadline, retries, host ownership, hidden answers and rankings',async()=>{
 const f=fixture(),{code}=await f.room(),slow=tokenHash(newToken()),fast=tokenHash(newToken());
 await join(f.store,code,slow,'คนช้า');f.advance(1);await join(f.store,code,fast,'คนไว');
 await assert.rejects(f.store.command({code,hash:slow,action:'start',payload:{version:0}}),{code:'UNAUTHORIZED'});
 await f.store.command({code,hash:f.hash,action:'start',payload:{version:0}});
 let s=await f.store.snapshot(code);assert.ok(!('correctIndex' in s.question));assert.equal(s.distribution,null);
 const correct=f.store.inspect(code).room.questions[0].correctIndex;
 await assert.rejects(f.store.command({code,hash:fast,action:'answer',payload:{index:0,choice:correct}}),{code:'ANSWER_CLOSED'});
 f.advance(4000);await f.store.command({code,hash:fast,action:'answer',payload:{index:0,choice:correct}});
 s=await f.store.snapshot(code);assert.equal(s.players[0].name,'คนช้า','ranking does not leak correctness during question');assert.equal(s.players[1].score,0);assert.equal(s.players[1].correct,0);
 const me=await f.store.command({code,hash:fast,action:'me'});assert.deepEqual(Object.keys(me.answer),['choice']);
 f.advance(10000);await f.store.command({code,hash:slow,action:'answer',payload:{index:0,choice:correct}});
 const retry=await f.store.command({code,hash:fast,action:'answer',payload:{index:0,choice:(correct+1)%4}});assert.equal(retry.choice,correct);
 f.advance(10000);s=await f.store.snapshot(code);assert.equal(s.phase,'reveal');assert.equal(s.question.correctIndex,correct);assert.equal(s.players[0].name,'คนไว');assert.equal(s.players[0].score,1000);assert.equal(s.players[1].score,750);
 assert.equal(s.distribution.reduce((a,b)=>a+b),2);
 const unjoined=tokenHash(newToken());await join(f.store,code,unjoined,'มาช้า');await assert.rejects(f.store.command({code,hash:unjoined,action:'answer',payload:{index:0,choice:correct}}),{code:'ANSWER_CLOSED'});
 await f.store.command({code,hash:f.hash,action:'leaderboard',payload:{version:1}});
 await f.store.command({code,hash:f.hash,action:'next',payload:{version:2}});
 await assert.rejects(f.store.command({code,hash:f.hash,action:'next',payload:{version:2}}),{code:'STATE_CHANGED'});
 await assert.rejects(f.store.command({code,hash:fast,action:'answer',payload:{index:0,choice:correct}}),{code:'QUESTION_CHANGED'});
});
test('duplicate names are normalized, expired rooms cannot resume',async()=>{
 const f=fixture(),{code}=await f.room();await join(f.store,code,tokenHash(newToken()),'Team');
 await assert.rejects(join(f.store,code,tokenHash(newToken()),'  TEAM  '),{code:'NAME_TAKEN'});
 f.advance(12*3600000);await assert.rejects(f.store.snapshot(code),{code:'ROOM_NOT_FOUND'});
});
test('100 API clients play all twelve rounds; immutable answer, final leaderboard, API isolation',async()=>{
 const f=fixture(),handler=createQuizHandler({getStore:async()=>f.store,clock:f.clock}),origin='https://www.myclover.com';
 async function request(action,data={},token='',method='POST'){
  const req={url:'/api/quiz'+(method==='GET'?'?'+new URLSearchParams({action,...data}):''),method,headers:{'content-type':'application/json',origin,host:'www.myclover.com',...(token?{authorization:'Bearer '+token}:{})},...(method==='POST'?{body:JSON.stringify({action,...data})}:{})};
  const headers=new Map();let result;
  await handler(req,{statusCode:200,setHeader(k,v){headers.set(k.toLowerCase(),v);},end(body){result={status:this.statusCode,data:JSON.parse(body),headers};}});return result;
 }
 const created=await request('create',{seconds:20});assert.equal(created.status,201);const {code,hostToken}=created.data;
 const players=Array.from({length:100},(_,i)=>({token:newToken(),name:'ผู้เล่น '+String(i+1).padStart(3,'0')}));
 const joined=await Promise.all(players.map(p=>request('join',{code,name:p.name,avatar:AVATARS[0].id},p.token)));
 assert.ok(joined.every(r=>r.status===200));assert.equal((await request('join',{code,name:'101',avatar:AVATARS[0].id},newToken())).data.error,'ROOM_FULL');
 const start=await request('start',{code,version:0},hostToken);assert.equal(start.status,200);let version=start.data.state.version;
 for(let index=0;index<12;index++){
  f.advance(4000);const correct=f.store.inspect(code).room.questions[index].correctIndex;
  const answers=await Promise.all(players.map((p,i)=>request('answer',{code,index,choice:i%5===0?(correct+1)%4:correct},p.token)));
  assert.ok(answers.every(r=>r.status===200));assert.ok(answers.every(r=>!('points' in r.data)&&!('correct' in r.data)));
  const duplicate=await request('answer',{code,index,choice:(correct+2)%4},players[1].token);assert.equal(duplicate.data.choice,correct);
  const current=await request('state',{code},'','GET');assert.equal(current.data.answered,100);assert.ok(!('correctIndex' in current.data.question));assert.equal(current.headers.get('vercel-cdn-cache-control'),'public, s-maxage=1');assert.ok(!JSON.stringify(current.data).includes('host_hash'));assert.ok(!JSON.stringify(current.data).includes('token_hash'));
  f.advance(20000);const revealed=await request('state',{code},'','GET');assert.equal(revealed.data.phase,'reveal');assert.equal(revealed.data.distribution.reduce((a,b)=>a+b),100);
  const board=await request('leaderboard',{code,version},hostToken);assert.equal(board.status,200);version=board.data.state.version;
  const next=await request('next',{code,version},hostToken);assert.equal(next.status,200);version=next.data.state.version;
 }
 const final=await request('state',{code},'','GET');assert.equal(final.data.phase,'finished');assert.equal(final.data.players[0].score,12000);assert.equal(final.data.players[0].correct,12);assert.equal(final.data.players.at(-1).score,0);
 const winner=final.data.players[0];assert.equal(winner.correct,12);assert.equal(final.data.players.filter(p=>p.score===12000).length,80);
 let evilStatus;await handler({url:'/api/quiz',method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example',host:'www.myclover.com'},body:'{"action":"create"}'},{setHeader(){},end(){evilStatus=this.statusCode;}});assert.equal(evilStatus,403);
 assert.equal((await request('start',{code,version},players[0].token)).status,401);
 console.log('Verified 100 clients, 1,200 scored answers, all 12 rounds, final podium and rejected 101st player.');
});
