import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../../api/_lib/candidate/store.js';
import {createHandler} from '../../api/_lib/candidate/handler.js';

test('a second team session reads the saved note and questions; stale saves preserve the current version',async()=>{
 const record={id:'synthetic-person',job_id:'synthetic-job',source_id:'synthetic-source',profile:{name:'ข้อมูลทดสอบสมมติ',presentation:{},assessments:[]},rubric:[],notes:'',status:'new',version:1};
 const store=createStore({query:async(sql,args)=>{
  if(sql.startsWith('UPDATE mc_candidates SET status=')){
   if(record.id!==args[0]||record.version!==args[1])return [];
   Object.assign(record,{status:args[2],notes:args[3],version:record.version+1});return[{version:record.version}];
  }
  if(sql.startsWith('SELECT id,job_id,source_id,'))return[structuredClone(record)];
  throw new Error('Unexpected test query');
 }});
 store.ensure=async()=>{};
 const handler=createHandler({getStore:()=>store,authenticate:async()=>true,env:{NODE_ENV:'test'}});
 const request=async(body)=>{
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(data){this.body=JSON.parse(data);}};
  await handler({method:body?'POST':'GET',url:body?'/api/candidate':'/api/candidate?id=synthetic-person',headers:{host:'localhost',origin:'http://localhost'},body},res);return res;
 };
 const before=(await request()).body.candidate;
 const notes=JSON.stringify({note:'โทรแล้ว สนใจคุยผลงานเพิ่ม นัดผู้สัมภาษณ์ต่อ',answers:{0:'ขอตัวอย่างผลงานเพิ่มเติม'}});
 assert.equal((await request({action:'review',id:before.id,version:before.version,status:'prescreen',notes})).statusCode,200);
 const next=(await request()).body.candidate;
 assert.equal(next.notes,notes);assert.equal(next.version,2);assert.equal(next.status,'prescreen');
 const stale=await request({action:'review',id:before.id,version:before.version,status:'hold',notes:'outdated note'});
 assert.equal(stale.statusCode,409);
 assert.equal((await request()).body.candidate.notes,notes);
});
