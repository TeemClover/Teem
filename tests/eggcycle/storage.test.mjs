import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {ensureSchema,sqlStore} from '../../api/_lib/eggcycle/store.js';
import {createHandler} from '../../api/_lib/eggcycle/handler.js';
import {call} from './fixture.mjs';
test('actual Postgres schema, durable state, competing revisions and HTTP boundary',{skip:!process.env.EGGCYCLE_PGLITE},async()=>{
  const {PGlite}=await import(pathToFileURL(process.env.EGGCYCLE_PGLITE).href);
  const db=new PGlite(),sql={query:async(q,params)=>(await db.query(q,params)).rows};
  try{
    await Promise.all([ensureSchema(sql),ensureSchema(sql)]);
    const store=sqlStore(sql,{EGGCYCLE_INITIAL_PERIOD_START:'2025-02-03'});
    const first=await store.load();assert.equal(first.periods[0].start,'2025-02-03');
    await store.save({...first,periodLength:4});assert.equal((await sqlStore(sql,{}).load()).periodLength,4);
    await assert.rejects(()=>store.save(first),e=>e.status===409);
    assert.equal(await store.limited('bucket',1000,1),false);assert.equal(await store.limited('bucket',1000,1),true);assert.equal(await store.limited('bucket',901000,1),false);
    const handler=createHandler({store,env:{BACKOFFICE_ADMIN_KEY:'test'},clock:()=>new Date('2025-02-09T01:00:00Z')});
    const login=await call(handler,'login',{method:'POST',body:{password:'test'}});const cookie=login.headers['set-cookie'].split(';')[0];
    const state=(await call(handler,'state',{cookie})).body.state;state.notes['2025-02-09']={text:'synthetic',flow:'light',pain:1};
    assert.equal((await call(handler,'save',{method:'POST',cookie,body:state})).statusCode,200);
    assert.equal((await sqlStore(sql,{}).load()).notes['2025-02-09'].text,'synthetic');
  }finally{await db.close();}
});
