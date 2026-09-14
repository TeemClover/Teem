import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ADMIN_URL, COOKIE_NAME, RECEIPT_MAX_BYTES, amountDueAt, datesFromTransfer, issueOffer, offerCookie, offerExpiry,
  parseAmount, parseTransferTime, publicOffer, readOffer, validateIntake, validateReceipt } from './ai-source-domain.js';
import { createAiSourceHandler } from './ai-source-handler.js';
import { createAiSourceStore } from './ai-source-store.js';
import { createTelegramNotifier, registrationText } from './ai-source-notify.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMsIAAAAASUVORK5CYII=','base64');
const secret='local-test-only-not-a-production-key';
const config={MEET_ADMIN_KEY:secret,DATABASE_URL:'injected-only',TELEGRAM_BOT_TOKEN:'TEST_TOKEN',TELEGRAM_CHAT_ID:'TEST_CHAT'};
const first=new Date('2026-09-14T03:00:00.000Z');
const signed=issueOffer(first,secret); const cookie=offerCookie(signed.token).split(';')[0];
const body=()=>({idempotencyKey:randomUUID(),name:'ผู้ทดสอบ',email:'test@example.test',contact:'TEST-LINE',amountTHB:'990.25',transferredAt:'2026-09-14T10:00:00+07:00',consent:true,receipt:{name:'../../fake.png',mime:'image/png',base64:png.toString('base64')}});
function harness(options={}) {
  let seq=0;const rows=new Map();const events=[];
  const mem={
    async ensure(){events.push('schema');},
    async findIdempotency(k){return [...rows.values()].find(x=>x.key===k)||null;},
    async rateLimit(){return !options.rateLimited;},
    async insert(x){
      events.push('insert');if(options.insertFails)throw new Error('injected DB failure');
      const prior=await this.findIdempotency(x.idempotencyKey);if(prior)return null;
      if([...rows.values()].some(r=>r.receipt_sha256===x.receipt.sha256)){const e=new Error('duplicate');e.code='23505';throw e;}
      const r={id:String(++seq),reference:x.reference,key:x.idempotencyKey,payload_hash:x.payloadHash,offer_id:x.offer.id,offer_first_seen_at:new Date(x.offer.firstSeen),offer_expires_at:new Date(x.offer.expires),quoted_amount_thb:x.quotedAmountTHB,
        name:x.name,email:x.email,contact:x.contact,submitted_amount_satang:x.amountSatang,submitted_transferred_at:x.transferredAt,receipt_sha256:x.receipt.sha256,receipt_mime:x.receipt.mime,receipt_name:x.receipt.name,receipt_size:x.receipt.size,
        receipt_base64:x.receipt.base64,status:'pending_verification',notify_status:'pending',admin_history:[],created_at:x.now,updated_at:x.now};rows.set(r.reference,r);return r;
    },
    async claimNotify(ref){events.push('claim');if(options.claimFails)throw Error('claim failure');const r=rows.get(ref);if(['sent','sending'].includes(r.notify_status))return false;r.notify_status='sending';return true;},
    async finishNotify(ref,attempt,result){events.push('finishNotify');if(options.finishFails)throw Error('finish failure');Object.assign(rows.get(ref),{notify_status:result.status,notify_detail:result});},
    async list(limit,before){return [...rows.values()].filter(x=>!before||Number(x.id)<Number(before)).reverse().slice(0,limit);},
    async get(ref){return rows.get(ref)||null;},async receipt(ref){return rows.get(ref)||null;},
    async verify(ref,amount,transfer,note,now){const r=rows.get(ref);if(r.status!=='pending_verification')return null;Object.assign(r,{status:'payment_verified',verified_amount_satang:amount,verified_transferred_at:transfer,verified_at:now,owner_note:note});return r;},
    async admit(ref,note,now){const r=rows.get(ref);if(r.status!=='payment_verified')return null;Object.assign(r,{status:'admitted',admitted_at:now,owner_note:note});return r;},
    async reject(ref,note){const r=rows.get(ref);if(r.status!=='pending_verification')return null;Object.assign(r,{status:'rejected',owner_note:note});return r;},
    async persistenceProbe(){events.push('probe_write_read_delete');if(options.probeFails)throw Error('probe');},
  };
  const handler=createAiSourceHandler({database:()=>{events.push('database');return {async query(){if(options.dbFails)throw Error('DB_URL_WITH_SECRET');return [{ai_source_ready:1}];}};},
    sendJson:(res,b,s=200)=>{res.statusCode=s;res.body=b;},config:options.config||config,storeFactory:()=>mem,now:()=>options.now||first,log:()=>{},
    notify:async text=>{events.push({notify:text});if(options.notifyThrows)throw Error('TEST_TOKEN should not leak');return options.delivery||{status:'sent',code:'TELEGRAM_ACCEPTED'};}});
  async function call(method='POST',data=body(),extra={}){
    const req={method,url:extra.url||'/api/ai-source',query:extra.query,body:data,headers:{host:'www.example.test',origin:'https://www.example.test','content-type':'application/json',cookie,...extra.headers}};
    const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(b){this.binary=b;}};await handler(req,res);return res;
  }
  return {rows,events,mem,call};
}
test('Bangkok calendar-day deadline crosses UTC, month and year correctly',()=>{
  for(const [input,expected] of [['2026-09-14T00:00:00+07:00','2026-09-16T17:00:00.000Z'],['2026-09-14T23:59:59+07:00','2026-09-16T17:00:00.000Z'],['2026-12-31T22:00:00+07:00','2027-01-02T17:00:00.000Z']]) assert.equal(new Date(offerExpiry(+new Date(input))).toISOString(),expected);
  assert.equal(amountDueAt(signed.offer,signed.offer.expires-1),990);assert.equal(amountDueAt(signed.offer,signed.offer.expires),1690);
});
test('signed offer persists expired identity and rejects tampering/future first visits',()=>{
  const req={headers:{cookie}};assert.equal(readOffer(req,secret,new Date('2026-09-20')).offer.firstSeen,+first);
  assert.equal(publicOffer(signed.offer,new Date('2026-09-20')).priceTHB,1690);
  assert.equal(readOffer({headers:{cookie:cookie+'x'}},secret,first),null);
  assert.equal(readOffer(req,'wrong key',first),null);
  assert.match(offerCookie(signed.token),/HttpOnly; Secure; SameSite=Lax; Max-Age=31536000/);
});
test('amount parsing preserves satang without trusting client quote/paid fields',()=>{
  assert.equal(parseAmount('990.25'),99025);assert.equal(parseAmount(1690),169000);
  for(const x of ['9.999','-1','1e3','1,690',NaN,Infinity,{},'0'])assert.throws(()=>parseAmount(x));
  const x=validateIntake({...body(),paid:true,status:'admitted',quotedAmountTHB:1,deadlineAt:'2099-01-01'},first);
  assert.equal(x.amountSatang,99025);assert.equal(x.status,undefined);
});
test('transfer timestamp needs actual valid calendar date and explicit timezone',()=>{
  assert.equal(parseTransferTime('2026-09-14T10:00+07:00',first),'2026-09-14T03:00:00.000Z');
  for(const value of ['2026-02-30T10:00:00+07:00','2026-09-14T10:00','2026-09-14T10:00:00+15:00','2026-09-15T10:00:00+07:00','garbage'])assert.throws(()=>parseTransferTime(value,first));
  const dates=datesFromTransfer('2026-09-14T03:00:00Z');assert.equal(dates.admissionDueAt,'2026-09-15T03:00:00.000Z');assert.equal(dates.guaranteeUntil,'2026-10-14T03:00:00.000Z');
});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function paddedPng(size){const payload=Buffer.alloc(size-png.length-12,65);payload.write('Comment\0');const type=Buffer.from('tEXt');const length=Buffer.alloc(4);length.writeUInt32BE(payload.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([type,payload])));return Buffer.concat([png.subarray(0,-12),length,type,payload,crc,png.subarray(-12)]);}
test('full 2MiB PNG base64 does not overflow regex; one byte over rejects',()=>{
  const bytes=paddedPng(RECEIPT_MAX_BYTES);assert.equal(bytes.length,RECEIPT_MAX_BYTES);
  assert.equal(validateReceipt({mime:'image/png',base64:bytes.toString('base64')}).size,RECEIPT_MAX_BYTES);
  assert.throws(()=>validateReceipt({mime:'image/png',base64:paddedPng(RECEIPT_MAX_BYTES+1).toString('base64')}),e=>e.status===413);
});
test('type mismatch, HTML, malformed/noncanonical base64 and damaged PNG are rejected',()=>{
  for(const r of [{mime:'application/pdf',base64:png.toString('base64')},{mime:'image/png',base64:Buffer.from('<html>not a receipt</html>').toString('base64')},{mime:'image/png',base64:'abcd===x'},{mime:'image/png',base64:png.subarray(0,-8).toString('base64')}])assert.throws(()=>validateReceipt(r));
});
test('offer readiness actually probes DB; no public token or admin key appears',async()=>{
  const h=harness();const r=await h.call('GET',undefined,{query:{action:'offer'},headers:{cookie:''}});
  assert.equal(r.statusCode,200);assert.equal(r.body.ready,true);assert.equal(r.body.availability.databaseConnected,true);assert.doesNotMatch(JSON.stringify(r.body),/TEST_TOKEN|local-test-only/);assert.match(r.headers['set-cookie'],/^__Host-ai_source_offer=/);
  const failed=await harness({dbFails:true}).call('GET',undefined,{query:{action:'offer'}});assert.equal(failed.statusCode,503);assert.equal(failed.body.ready,false);assert.doesNotMatch(JSON.stringify(failed.body),/DB_URL_WITH_SECRET/);
});
test('present invalid offer cookie never silently starts a fresh discount',async()=>{
  const h=harness();const r=await h.call('GET',undefined,{query:{action:'offer'},headers:{cookie:cookie+'tampered'}});assert.equal(r.statusCode,409);assert.equal(r.body.code,'OFFER_INVALID');assert.equal(r.headers['set-cookie'],undefined);assert.equal(h.events.length,0);
});
test('registration and receipt commit before notification; amounts and pending state preserved',async()=>{
  const h=harness();const r=await h.call('POST',{...body(),paid:true,status:'admitted',quotedAmountTHB:1});assert.equal(r.statusCode,201);assert.equal(r.body.status,'pending_verification');assert.equal(r.body.submittedAmountTHB,990.25);assert.equal(r.body.quotedAmountTHB,990);
  assert.ok(h.events.indexOf('insert')<h.events.findIndex(x=>x.notify));const saved=[...h.rows.values()][0];assert.equal(saved.receipt_base64,png.toString('base64'));assert.equal(saved.submitted_amount_satang,99025);assert.equal(saved.verified_at,undefined);
  assert.match(h.events.find(x=>x.notify).notify,new RegExp(ADMIN_URL.replaceAll('.','\\.')));assert.doesNotMatch(h.events.find(x=>x.notify).notify,/www\.example\.test/);
});
test('same input retry returns same reference, sends once; changed payload conflicts',async()=>{
  const h=harness();const input=body();const a=await h.call('POST',input);const b=await h.call('POST',input);assert.equal(b.statusCode,200);assert.equal(b.body.reference,a.body.reference);assert.equal(b.body.replayed,true);assert.equal(h.events.filter(x=>x.notify).length,1);
  assert.equal((await h.call('POST',{...input,amountTHB:'1690'})).statusCode,409);assert.equal(h.rows.size,1);
});
test('concurrent retry reuses stored row and never double-notifies',async()=>{
  const h=harness();const input=body();const results=await Promise.all([h.call('POST',input),h.call('POST',input)]);assert.equal(h.rows.size,1);assert.equal(results[0].body.reference,results[1].body.reference);assert.equal(h.events.filter(x=>x.notify).length,1);
});
test('receipt cannot be reused for a different registration',async()=>{
  const h=harness();await h.call();const r=await h.call();assert.equal(r.statusCode,409);assert.equal(r.body.code,'DUPLICATE_RECEIPT');assert.equal(h.rows.size,1);
});
test('DB insert failure never sends Telegram; notification failures never erase successful intake',async()=>{
  const failed=harness({insertFails:true});assert.equal((await failed.call()).statusCode,500);assert.equal(failed.events.filter(x=>x.notify).length,0);
  for(const options of [{notifyThrows:true},{delivery:{status:'failed',code:'TELEGRAM_TIMEOUT'}},{finishFails:true},{claimFails:true}]){
    const h=harness(options);const r=await h.call();assert.equal(r.statusCode,201);assert.equal(h.rows.size,1);assert.equal(r.body.status,'pending_verification');assert.doesNotMatch(JSON.stringify(r.body),/TEST_TOKEN/);
  }
});
test('missing/tampered cookies, foreign origins, honeypot, oversized body fail before persistence',async()=>{
  for(const x of [{headers:{cookie:''},status:428},{headers:{cookie:cookie+'x'},status:428},{headers:{origin:'https://evil.test'},status:403},{data:{...body(),website:'spam'},status:400},{headers:{'content-length':String(4*1024*1024)},status:413}]){
    const h=harness();const r=await h.call('POST',x.data||body(),{headers:x.headers});assert.equal(r.statusCode,x.status);assert.equal(h.rows.size,0);assert.equal(h.events.filter(e=>e.notify).length,0);
  }
});
test('expired offer quotes1690 and preserves underpayment; only manually verified predeadline transfer qualifies990',async()=>{
  const h=harness({now:new Date('2026-09-18T03:00:00Z')});const r=await h.call('POST',{...body(),amountTHB:'990',transferredAt:'2026-09-18T10:00:00+07:00'});assert.equal(r.body.quotedAmountTHB,1690);assert.equal(r.body.submittedAmountTHB,990);
  const headers={'x-admin-key':secret};const ref=r.body.reference;
  const short=await h.call('PATCH',{reference:ref,action:'verify_payment',confirmedReceived:true,verifiedAmountTHB:'990',verifiedTransferredAt:'2026-09-18T10:00:00+07:00'},{headers});assert.equal(short.statusCode,409);assert.equal(short.body.code,'PAYMENT_SHORT');
  const old=await h.call('PATCH',{reference:ref,action:'verify_payment',confirmedReceived:true,verifiedAmountTHB:'990',verifiedTransferredAt:'2026-09-16T10:00:00+07:00'},{headers});assert.equal(old.statusCode,200);assert.equal(old.body.registration.status,'payment_verified');assert.equal(old.body.registration.submittedTransferredAt,'2026-09-18T03:00:00.000Z');assert.equal(old.body.registration.verifiedTransferredAt,'2026-09-16T03:00:00.000Z');
});
test('all admin actions and receipt bytes require header auth before any DB work',async()=>{
  for(const [method,query,data] of [['GET',{action:'list'},undefined],['GET',{action:'receipt',reference:'SAUCE-'+ 'A'.repeat(32)},undefined],['PATCH',{}, {action:'test_notification'}],['PATCH',{}, {action:'mark_admitted'}]]){
    const h=harness();const r=await h.call(method,data,{query});assert.equal(r.statusCode,401);assert.equal(h.events.length,0);assert.equal(r.binary,undefined);
  }
});
test('manual verification and admission are separate guarded transitions; originals unchanged',async()=>{
  const h=harness();const created=await h.call();const ref=created.body.reference;const headers={'x-admin-key':secret};
  assert.equal((await h.call('PATCH',{reference:ref,action:'mark_admitted',accessSent:true},{headers})).statusCode,409);
  const verified=await h.call('PATCH',{reference:ref,action:'verify_payment',confirmedReceived:true,verifiedAmountTHB:990.25,verifiedTransferredAt:'2026-09-14T10:00:00+07:00'},{headers});assert.equal(verified.body.registration.status,'payment_verified');
  assert.equal((await h.call('PATCH',{reference:ref,action:'mark_admitted'},{headers})).statusCode,400);
  const admitted=await h.call('PATCH',{reference:ref,action:'mark_admitted',accessSent:true},{headers});assert.equal(admitted.body.registration.status,'admitted');assert.equal(admitted.body.registration.submittedAmountTHB,990.25);
  assert.equal(h.events.filter(x=>x.notify).length,1); // No auto-invite, customer email, or second notification side effect.
});
test('admin list has metadata only; protected receipt is attachment with safe server filename',async()=>{
  const h=harness();const created=await h.call();const headers={'x-admin-key':secret};const list=await h.call('GET',undefined,{headers,query:{action:'list'}});const row=list.body.registrations[0];assert.ok(row.receipt.sha256);assert.equal(row.receipt.bytes,undefined);assert.doesNotMatch(JSON.stringify(list.body),new RegExp(png.toString('base64').slice(0,20)));
  const r=await h.call('GET',undefined,{headers,query:{action:'receipt',reference:created.body.reference}});assert.deepEqual(r.binary,png);assert.match(r.headers['content-disposition'],/^attachment; filename="SAUCE-[A-F0-9]{32}\.png"$/);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.match(r.headers['cache-control'],/no-store/);
});
test('notification test is admin-only, probes persistence before clearly labelled TEST, no fake buyer',async()=>{
  const h=harness();const r=await h.call('PATCH',{action:'test_notification'},{headers:{'x-admin-key':secret}});assert.equal(r.statusCode,200);assert.equal(r.body.databaseWriteReadDelete,true);assert.equal(h.rows.size,0);assert.ok(h.events.indexOf('probe_write_read_delete')<h.events.findIndex(x=>x.notify));assert.match(h.events.find(x=>x.notify).notify,/^TEST ·/);
  const failed=harness({probeFails:true});assert.equal((await failed.call('PATCH',{action:'test_notification'},{headers:{'x-admin-key':secret}})).statusCode,500);assert.equal(failed.events.filter(x=>x.notify).length,0);
});
test('Telegram requires API ok:true, plain text, canonical destination; errors cannot disclose token',async()=>{
  let call;
  const notify=createTelegramNotifier({config,fetchImpl:async(url,options)=>{call={url,options};return {ok:true,json:async()=>({ok:true})};}});
  assert.equal((await notify('TEST safe <b>text</b>')).status,'sent');const sent=JSON.parse(call.options.body);assert.equal(sent.chat_id,'TEST_CHAT');assert.equal(sent.parse_mode,undefined);
  for(const response of [{ok:false,status:401},{ok:true,json:async()=>({ok:false})}])assert.equal((await createTelegramNotifier({config,fetchImpl:async()=>response})('TEST')).status,'failed');
  const result=await createTelegramNotifier({config,fetchImpl:async()=>{throw Error('https://example/TEST_TOKEN');}})('TEST');assert.equal(result.code,'TELEGRAM_NETWORK_ERROR');assert.doesNotMatch(JSON.stringify(result),/TEST_TOKEN/);
});
test('store puts private bytes in same INSERT and probes with finally cleanup on read failure',async()=>{
  const calls=[];const sql={async query(text,args){calls.push({text,args});if(text.startsWith('SELECT id'))throw Error('read failed');return [];}};const store=createAiSourceStore(sql);
  const intake=validateIntake(body(),first);await store.insert({...intake,reference:'SAUCE-'+ 'A'.repeat(32),offer:signed.offer,quotedAmountTHB:990,now:first});
  assert.equal(calls.length,1);assert.match(calls[0].text,/receipt_bytes/);assert.match(calls[0].text,/decode\(\$13,'base64'\)/);assert.equal(calls[0].args[12],png.toString('base64'));
  await assert.rejects(store.persistenceProbe(randomUUID(),first));assert.ok(calls.at(-1).text.startsWith('DELETE FROM mc_ai_source_api_checks'));
});

test('retry notice preserves the current verified/admitted status instead of claiming still unpaid',()=>{
  const row={reference:'SAUCE-'+ 'A'.repeat(32),name:'TEST',contact:'TEST',submitted_amount_satang:99000,quoted_amount_thb:990,submitted_transferred_at:first,verified_transferred_at:first,verified_at:first,status:'admitted'};
  const text=registrationText(row);assert.match(text,/จัดสิทธิ์เข้าเรียนแล้ว/);assert.doesNotMatch(text,/ยังไม่ยืนยันรับเงิน|รอตรวจเงินเข้า/);
});
