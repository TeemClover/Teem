import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
// Optional, isolated PostgreSQL engine: npm install --prefix /tmp/mediral-commerce-deps @electric-sql/pglite
// PGLITE_MODULE=/tmp/mediral-commerce-deps/node_modules/@electric-sql/pglite/dist/index.js node --test ...
test('PostgreSQL transaction path: schema, order, quote, slip, duplicate rollback and delivery', {skip:!process.env.PGLITE_MODULE}, async()=>{
 const {PGlite}=await import(process.env.PGLITE_MODULE);const pg=new PGlite();
 const sql={query:async(s,p=[]) => (await pg.query(s,p)).rows,transaction:fn=>pg.transaction(async tx=>{const parts=fn({query:(s,p=[])=>({s,p})});const rows=[];for(const {s,p}of parts)rows.push((await tx.query(s,p)).rows);return rows;})};
 try{
  const f=await fixture({sql});const o=await f.checkout();await f.login();
  const q=await f.call('update',{method:'POST',body:{command:'quote',id:o.id,prices:{CL:'1',AC:'1',BR:'1',SU:'1',PO:'1'},shipping:'0',stockConfirmed:true}});assert.equal(q.code,200,JSON.stringify(q));
  assert.equal((await f.event('',{image:'1234567890'})).code,200);assert.equal((await f.store.order(o.id)).paymentCheck.ok,true);
  const paid={command:'paid',id:o.id,amount:'5',transRef:'TEST-PG-TRANSFER',transferredAt:new Date(f.now()).toISOString(),confirmedReceived:true};assert.equal((await f.call('update',{method:'POST',body:paid})).code,200);
  const other={...await f.store.order(o.id),id:'MD-PG-SECOND',status:'awaiting_payment',userId:'U'+'c'.repeat(32)};
  const c=await f.store.claim(other.userId,f.now());await f.store.commit(c,{state:{orderId:other.id},order:other},f.now());assert.equal((await f.call('update',{method:'POST',body:{...paid,id:other.id}})).code,409);assert.equal((await f.store.order(other.id)).status,'awaiting_payment');
  assert.equal((await f.call('update',{method:'POST',body:{command:'shipped',id:o.id,carrier:'TEST ONLY',tracking:'TESTPG1234'}})).code,200);
  await f.store.cleanup(f.now());assert.equal((await f.store.order(o.id)).status,'shipped');
 }finally{await pg.close();}
});
