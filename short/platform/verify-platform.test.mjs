import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bangkokDay,nextMidnight,chargeMatches,validateFile,validateSubmission,qualifiedView} from './rules.js';
import {gatewayReady} from '../../api/_lib/torntor-payment.js';
test('bonus day changes exactly at Thai midnight',()=>{const before=Date.parse('2026-10-08T16:59:59.999Z'),after=before+1;assert.equal(bangkokDay(before),'2026-10-08');assert.equal(bangkokDay(after),'2026-10-09');assert.equal(nextMidnight(before),after);assert.equal(nextMidnight(after),after+86400000)});
test('only matching independently verified payment can settle',()=>{const order={id:'order',user_id:'viewer',charge_id:'chrg_test_a',amount:4900};const charge={id:order.charge_id,metadata:{torntor_order:order.id,torntor_user:order.user_id},amount:4900,currency:'THB',livemode:false,status:'successful',paid:true};assert.ok(chargeMatches(charge,order,false));for(const patch of [{amount:1},{livemode:true},{status:'pending'},{paid:false},{refunded:true},{refunded_amount:1},{metadata:{torntor_order:'other',torntor_user:'viewer'}}])assert.equal(chargeMatches({...charge,...patch},order,false),false)});
test('live keys and explicit activation both required',()=>{const before={...process.env};try{process.env.TORNTOR_MODE='live';process.env.TORNTOR_OMISE_SECRET_KEY='skey_test_fake';process.env.TORNTOR_OMISE_PUBLIC_KEY='pkey_test_fake';process.env.TORNTOR_LIVE_ENABLED='true';assert.equal(gatewayReady(),false);process.env.TORNTOR_OMISE_SECRET_KEY='skey_live_fake';process.env.TORNTOR_OMISE_PUBLIC_KEY='pkey_live_fake';process.env.TORNTOR_LIVE_ENABLED='false';assert.equal(gatewayReady(),false)}finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}});
test('file and submission validation reject dangerous input',()=>{assert.throws(()=>validateFile({size:100,type:'text/html'},'novel'));assert.throws(()=>validateFile({size:300*1024**2,type:'video/mp4'},'drama'));assert.throws(()=>validateSubmission({title:'x',summary:'x',team:'x',format:'comic',price:10,episode:1,rights:false}));assert.equal(qualifiedView(2,true,'drama'),false);assert.equal(qualifiedView(10,false,'comic'),true)});
test('wallet SQL is atomic: daily, unlock, payment retries and insufficient funds',async()=>{
 const {PGlite}=await import(process.env.TORNTOR_PGLITE||'/private/tmp/torntor-qa-deps/node_modules/@electric-sql/pglite/dist/index.js');const db=new PGlite();await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 try{
 await db.query("INSERT INTO tt_users(id,role) VALUES('viewer','viewer'),('creator','creator'),('admin','admin')");
 await Promise.all(Array.from({length:10},()=>db.query("SELECT tt_claim('viewer')")));assert.equal((await db.query("SELECT free FROM tt_users WHERE id='viewer'")).rows[0].free,20);
 await Promise.all(Array.from({length:10},()=>db.query("SELECT tt_unlock('viewer','somchai',4,10)")));assert.equal((await db.query("SELECT free FROM tt_users WHERE id='viewer'")).rows[0].free,10);assert.equal((await db.query('SELECT count(*)::int AS n FROM tt_unlocks')).rows[0].n,1);
 await assert.rejects(db.query("SELECT tt_unlock('viewer','somchai',5,30)"),/INSUFFICIENT_COINS/);assert.equal((await db.query("SELECT free FROM tt_users WHERE id='viewer'")).rows[0].free,10);
 await db.query("INSERT INTO tt_orders(id,user_id,pack,coins,amount,method,charge_id,mode) VALUES('o1','viewer','50',50,4900,'promptpay','chrg_test_a','test')");
 await Promise.all(Array.from({length:10},()=>db.query("SELECT tt_settle('o1','chrg_test_a',150)")));assert.equal((await db.query("SELECT paid FROM tt_users WHERE id='viewer'")).rows[0].paid,50);
 await assert.rejects(db.query("SELECT tt_settle('o1','wrong',150)"),/INVALID_ORDER/);
 await db.query("SELECT tt_unlock('viewer','somchai',5,10)");await db.query("SELECT tt_unlock('viewer','somchai',6,10)");const spend=(await db.query("SELECT free,paid FROM tt_unlocks WHERE episode=6")).rows[0];assert.deepEqual(spend,{free:0,paid:10});
 await db.query("SELECT tt_refund('o1',4900)");await assert.rejects(db.query("SELECT tt_unlock('viewer','somchai',7,10)"),/ACCOUNT_REVIEW_REQUIRED/);
 await db.query("SELECT tt_refund('o1',4900)");assert.equal((await db.query("SELECT refunded FROM tt_orders WHERE id='o1'")).rows[0].refunded,4900);
 await db.query("INSERT INTO tt_assets(id,owner,key,type,size,role) VALUES('c','creator','c','image/webp',10,'cover'),('p','creator','p','image/webp',10,'page')");
 const data={title:'work',summary:'story',team:'team',format:'comic',episode:1,price:0};await db.query("SELECT tt_submit('w','creator',$1::jsonb,ARRAY['c','p'])",[JSON.stringify(data)]);assert.equal((await db.query('SELECT status FROM tt_works')).rows[0].status,'pending');await assert.rejects(db.query("SELECT tt_submit('w2','creator',$1::jsonb,ARRAY['c','p'])",[JSON.stringify(data)]),/INVALID_ASSETS/);assert.equal((await db.query('SELECT count(*)::int AS n FROM tt_works')).rows[0].n,1);
 }finally{await db.close()}
});
