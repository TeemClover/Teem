import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLearnCommerce, requiredCheckoutAmount, RECOVERY_MS } from './learn-commerce.js';
import { learnAccountWrite } from './learn-commerce-lock.js';
import { createAiSourceHandler } from './ai-source-handler.js';
import { createAiSourceStore, ensureAiSourceSchema } from './ai-source-store.js';
import { issueOffer, offerCookie, validateIntake } from './ai-source-domain.js';

const NOW=new Date('2026-09-14T03:00:00Z');
const config={MEET_ADMIN_KEY:'local-commerce-test-secret',DATABASE_URL:'injected-only',TELEGRAM_BOT_TOKEN:'TEST',TELEGRAM_CHAT_ID:'TEST'};
const signed=issueOffer(NOW,config.MEET_ADMIN_KEY),cookie=offerCookie(signed.token).split(';')[0];
const user={id:'alice',email:'alice@example.test',displayName:'Alice',emailVerified:true};
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMsIAAAAASUVORK5CYII=';
const input=()=>({idempotencyKey:randomUUID(),name:'TEST',email:user.email,contact:'TEST-LINE',amountTHB:990,
  transferredAt:'2026-09-14T10:00:01+07:00',consent:true,receipt:{name:'test.png',mime:'image/png',base64:png}});
const req=(extra={})=>({headers:{cookie},testUser:user,...extra});
const afterExpiry=()=>new Date(signed.offer.expires+1000);
const rowBlocked=r=>['pending_verification','payment_verified','admitted'].includes(r.status);

// Stateful injected persistence checks the actual SQL contract and externally
// visible transitions. No production DB or Telegram connection runs in tests.
function commerceHarness(options={}) {
  const offers=[],carts=[],registrations=[],grants=[],events=[],recorded=[];
  const accounts=new Map([['alice',{email_verified_at:NOW}],['bob',{email_verified_at:NOW}]]);
  const blocked=id=>registrations.some(r=>r.account_id===id && rowBlocked(r)) || grants.some(g=>g.user_id===id && g.course_id==='ai-sauce');
  const clone=row=>row?{...row}:undefined;
  async function query(text,p=[]) {
    const q=text.replace(/\s+/g,' ').trim();events.push({q,p});
    if(q==='SELECT email_verified_at FROM mc_accounts WHERE id=$1')return accounts.has(p[0])?[clone(accounts.get(p[0]))]:[];
    if(q==='SELECT id FROM mc_accounts WHERE id=$1 FOR UPDATE') {options.onAccountLock?.({offers,carts,registrations,grants,events});return accounts.has(p[0])?[{id:p[0]}]:[];}
    if(q.startsWith('SELECT 1 FROM mc_ai_source_registrations'))return registrations.some(r=>r.account_id===p[0] && rowBlocked(r))?[{one:1}]:[];
    if(q.startsWith('SELECT 1 FROM mc_learn_grants'))return grants.some(g=>g.user_id===p[0] && g.course_id===p[1])?[{one:1}]:[];
    if(q.startsWith('INSERT INTO mc_learn_offers') && q.includes("VALUES($1,$2,$3,'launch'")) {
      let row=offers.find(o=>o.user_id===p[1] && o.course_id===p[2] && o.kind==='launch');
      if(row){row.first_seen_at=new Date(Math.min(+new Date(row.first_seen_at),+p[3]));row.expires_at=new Date(Math.min(+new Date(row.expires_at),+p[4]));}
      else {assert.ok(!offers.some(o=>o.id===p[0]),'offer PK must not collide between accounts sharing a cookie');row={id:p[0],user_id:p[1],course_id:p[2],kind:'launch',first_seen_at:p[3],expires_at:p[4],created_at:p[5]};offers.push(row);}
      return [clone(row)];
    }
    if(q.startsWith('SELECT * FROM mc_learn_offers WHERE user_id='))return offers.filter(o=>o.user_id===p[0] && o.course_id===p[1] && o.kind==='recovery' && (!q.includes('expires_at>$3') || +new Date(o.expires_at)>+p[2])).map(clone);
    if(q==='SELECT * FROM mc_learn_offers WHERE id=$1')return offers.filter(o=>o.id===p[0]).map(clone);
    if(q.startsWith('SELECT 1 FROM mc_learn_checkouts'))return carts.some(c=>c.user_id===p[0] && c.course_id===p[1] && c.offer_id===p[2] && c.quoted_amount_thb===990 && +new Date(c.issued_at)<+new Date(p[3]))?[{one:1}]:[];
    if(q.startsWith('SELECT id FROM mc_learn_checkouts WHERE user_id='))return carts.filter(c=>c.user_id===p[0] && c.course_id===p[1]).sort((a,b)=>+new Date(b.issued_at)-+new Date(a.issued_at) || b.id.localeCompare(a.id)).slice(0,1).map(c=>({id:c.id}));
    if(q.startsWith('INSERT INTO mc_learn_offers') && q.includes("SELECT $1,$2,$3,'recovery'")) {
      assert.match(q,/JOIN mc_learn_checkouts/);assert.match(q,/NOT EXISTS\(SELECT 1 FROM mc_ai_source_registrations/);assert.match(q,/NOT EXISTS\(SELECT 1 FROM mc_learn_grants/);
      const launch=offers.find(o=>o.id===p[5] && o.user_id===p[1] && o.kind==='launch');
      const actual=carts.some(c=>c.offer_id===launch?.id && c.user_id===p[1] && c.quoted_amount_thb===990 && +c.issued_at<+launch.expires_at);
      if(!launch || +launch.expires_at>+p[3] || !actual || blocked(p[1]) || offers.some(o=>o.user_id===p[1] && o.kind==='recovery'))return [];
      const row={id:p[0],user_id:p[1],course_id:p[2],kind:'recovery',first_seen_at:p[3],expires_at:p[4]};offers.push(row);return [clone(row)];
    }
    if(q.startsWith('WITH cart AS')) {
      assert.match(q,/WHERE NOT EXISTS\( SELECT 1 FROM mc_ai_source_registrations/);assert.match(q,/AND EXISTS\(SELECT 1 FROM cart\)/);
      if(blocked(p[1]))return [];
      const launch=offers.find(o=>o.id===p[7]);if(!launch)return [];
      const same=carts.filter(c=>c.user_id===p[1] && c.offer_id===p[3] && c.quoted_amount_thb===p[4]);
      const generation=p[8]??(p[4]===1690?(same.find(c=>+new Date(c.expires_at)>+p[5])?.generation ?? Math.max(-1,...same.map(c=>c.generation))+1):0);
      let row=same.find(c=>c.generation===generation);
      if(!row){row={id:p[0],user_id:p[1],course_id:p[2],offer_id:p[3],quoted_amount_thb:p[4],issued_at:p[5],expires_at:p[6],generation,status:'open'};carts.push(row);}
      launch.checkout_started_at ||= p[5];return [clone(row)];
    }
    if(q.startsWith('INSERT INTO mc_learn_funnel_events'))return [];
    if(q.startsWith('SELECT c.*,r.reference')) {
      const c=carts.find(c=>c.id===p[0] && c.user_id===p[1] && c.course_id===p[2]);if(!c)return [];
      const r=registrations.find(r=>r.checkout_id===c.id && r.account_id===c.user_id);
      return [{...c,saved_reference:r?.reference,registration_status:r?.status}];
    }
    if(q.startsWith('SELECT * FROM mc_learn_checkouts WHERE id='))return carts.filter(c=>c.id===p[0] && c.user_id===p[1] && (p[2]===undefined || c.course_id===p[2])).map(clone);
    if(q.startsWith('UPDATE mc_learn_checkouts SET status=')) {
      assert.match(q,/CASE WHEN status='paid' THEN 'paid'/);
      const c=carts.find(c=>c.id===p[0] && c.user_id===p[2] && (!c.reference || c.reference===p[1]));if(!c)return [];
      c.reference=p[1];if(c.status!=='paid')c.status=p[3];return [{id:c.id}];
    }
    throw Error('Unhandled test SQL: '+q);
  }
  const sql={query,async transaction(make,options){
    assert.equal(options.isolationLevel,'ReadCommitted');
    const batch=make({query:(q,p)=>({q,p})});assert.equal(batch.length,2);assert.match(batch[0].q,/FOR UPDATE/);
    const out=[];for(const {q,p} of batch)out.push(await query(q,p));return out;
  }};
  const school=createLearnCommerce({config,lookupUser:async r=>r.testUser,ensureCore:async()=>{},ensureCommerce:async()=>{},
    enroll:async()=>{events.push({enroll:true});},recordRegistration:async(s,x)=>{recorded.push(x);},grant:async(s,x)=>({reference:x.reference})});
  return {sql,school,offers,carts,registrations,grants,accounts,events,recorded};
}

test('shared browser cookie preserves deadline without sharing the account offer primary key',async()=>{
  const h=commerceHarness();const alice=await h.school.offer(req(),h.sql,NOW);
  const bob=await h.school.offer(req({testUser:{...user,id:'bob',email:'bob@example.test'}}),h.sql,NOW);
  assert.equal(h.offers.length,2);assert.notEqual(h.offers[0].id,h.offers[1].id);assert.notEqual(h.offers[0].id,signed.offer.id);
  assert.equal(alice.offer.expiresAt,bob.offer.expiresAt);assert.equal(alice.offer.firstSeenAt,NOW.toISOString());
});
test('deleting a cookie or using a newer one never resets the account deadline',async()=>{
  const h=commerceHarness();const a=await h.school.offer(req(),h.sql,NOW),later=afterExpiry();
  const b=await h.school.offer(req({headers:{}}),h.sql,later);
  assert.equal(b.offer.expiresAt,a.offer.expiresAt);assert.equal(b.offer.priceTHB,1690);assert.equal(h.offers.length,1);
});
test('tampered cookie on direct checkout cannot create a replacement offer',async()=>{
  const h=commerceHarness();await assert.rejects(h.school.act(req({headers:{cookie:cookie+'x'}}),h.sql,'checkout',{},NOW),e=>e.code==='OFFER_INVALID');
  assert.equal(h.offers.length,0);assert.equal(h.carts.length,0);
});
test('commerce requires both a verified session and a verified account',async()=>{
  for(const mode of ['guest','old-session','unverified-account']) {
    const h=commerceHarness();if(mode==='unverified-account')h.accounts.set(user.id,{email_verified_at:null});
    const r=req({testUser:mode==='guest'?null:{...user,emailVerified:mode!=='old-session'}});
    await assert.rejects(h.school.act(r,h.sql,'checkout',{},NOW),e=>e.code===(mode==='guest'?'LOGIN_REQUIRED':'EMAIL_VERIFICATION_REQUIRED'));
    assert.equal(h.carts.length,0);assert.equal(h.offers.length,0);
  }
});
test('checkout price and dates come from the server, and replay does not move either',async()=>{
  const h=commerceHarness();const a=await h.school.act(req(),h.sql,'checkout',{price:1,expiresAt:'2099-01-01'},NOW);
  const b=await h.school.act(req(),h.sql,'checkout',{},new Date(+NOW+3600000));
  assert.equal(a.checkout.priceTHB,990);assert.equal(a.checkout.id,b.checkout.id);assert.equal(a.checkout.issuedAt,b.checkout.issuedAt);assert.equal(a.checkout.expiresAt,b.checkout.expiresAt);
  assert.equal(h.offers[0].checkout_started_at.toISOString(),NOW.toISOString());
});
test('expired cart restoration retains identity and allows evidence, never reopens its price window',async()=>{
  const h=commerceHarness();const old=await h.school.act(req(),h.sql,'checkout',{},NOW),before=h.events.length;
  const restored=await h.school.act(req({headers:{}}),h.sql,'checkout',{checkoutId:old.checkout.id},afterExpiry());
  assert.equal(restored.restored,true);assert.equal(restored.checkout.id,old.checkout.id);assert.equal(restored.checkout.expiresAt,old.checkout.expiresAt);
  assert.equal(restored.checkout.priceTHB,990);assert.equal(restored.checkout.expired,true);assert.equal(restored.checkout.priceActive,false);assert.equal(restored.checkout.canSubmitReceipt,true);
  assert.equal(h.carts.length,1);assert.equal(h.events.slice(before).some(e=>e.enroll || /INSERT|UPDATE/.test(e.q || '')),false);
  await assert.rejects(h.school.restore(req({testUser:{...user,id:'bob'}}),h.sql,old.checkout.id,afterExpiry()),e=>e.code==='CHECKOUT_NOT_FOUND');
});
test('verified offer restores latest own checkout across devices without disclosing another account cart',async()=>{
  const h=commerceHarness(),cart=(await h.school.act(req(),h.sql,'checkout',{},NOW)).checkout;
  const same=await h.school.offer(req({headers:{}}),h.sql,afterExpiry());assert.equal(same.school.checkoutId,cart.id);assert.equal(h.carts.length,1);
  const other=await h.school.offer(req({testUser:{...user,id:'bob',email:'bob@example.test'},headers:{}}),h.sql,afterExpiry());assert.equal(other.school.checkoutId,null);
  assert.equal(await h.school.offer(req({testUser:{...user,emailVerified:false}}),h.sql,afterExpiry()),null);
});
test('restoring a partially linked receipt returns its actual pending/paid reference',async()=>{
  const h=commerceHarness(),old=await h.school.act(req(),h.sql,'checkout',{},NOW);
  const row={checkout_id:old.checkout.id,account_id:user.id,reference:'SAUCE-'+ 'A'.repeat(32),status:'pending_verification'};h.registrations.push(row);
  const pending=await h.school.restore(req(),h.sql,old.checkout.id,afterExpiry());assert.equal(pending.checkout.reference,row.reference);assert.equal(pending.checkout.status,'submitted');assert.equal(pending.checkout.canSubmitReceipt,false);
  row.status='admitted';const paid=await h.school.restore(req(),h.sql,old.checkout.id,afterExpiry());assert.equal(paid.checkout.status,'paid');assert.equal(paid.checkout.priceActive,false);
});
test('a page visit or phantom checkout marker does not earn recovery pricing',async()=>{
  const h=commerceHarness();await h.school.offer(req(),h.sql,NOW);h.offers[0].checkout_started_at=NOW;
  const state=await h.school.offer(req(),h.sql,afterExpiry());assert.equal(state.school.recoveryAvailable,false);
  await assert.rejects(h.school.act(req(),h.sql,'recovery',{},afterExpiry()),e=>e.code==='RECOVERY_UNAVAILABLE');assert.equal(h.offers.length,1);
});
test('790 recovery is issued once only after a real 990 checkout and expiry, with a fixed two-hour end',async()=>{
  const h=commerceHarness();await h.school.act(req(),h.sql,'checkout',{},NOW);
  await assert.rejects(h.school.act(req(),h.sql,'recovery',{},new Date(+NOW+1000)),e=>e.code==='RECOVERY_UNAVAILABLE');
  const first=afterExpiry(),a=await h.school.act(req(),h.sql,'recovery',{},first),b=await h.school.act(req(),h.sql,'recovery',{},new Date(+first+60000));
  assert.equal(a.priceTHB,790);assert.equal(a.expiresAt,new Date(+first+RECOVERY_MS).toISOString());assert.equal(b.expiresAt,a.expiresAt);
  const checkout=await h.school.act(req(),h.sql,'checkout',{},new Date(+first+1000));assert.equal(checkout.checkout.priceTHB,790);assert.equal(checkout.checkout.expiresAt,a.expiresAt);
  await assert.rejects(h.school.act(req(),h.sql,'recovery',{},new Date(a.expiresAt)),e=>e.code==='RECOVERY_UNAVAILABLE');
  const regular=await h.school.act(req(),h.sql,'checkout',{},new Date(+new Date(a.expiresAt)+1));assert.equal(regular.checkout.priceTHB,1690);
  assert.equal(h.offers.filter(o=>o.kind==='recovery').length,1);
});
test('starting checkout only after launch expiry never qualifies for the recovery price',async()=>{
  const h=commerceHarness();await h.school.offer(req(),h.sql,NOW);
  const cart=await h.school.act(req(),h.sql,'checkout',{},afterExpiry());assert.equal(cart.checkout.priceTHB,1690);
  await assert.rejects(h.school.act(req(),h.sql,'recovery',{},afterExpiry()),e=>e.code==='RECOVERY_UNAVAILABLE');
});
test('expired regular cart gets a new generation, preserving the old cart for timely-slip uploads',async()=>{
  const h=commerceHarness();await h.school.offer(req(),h.sql,NOW);const start=afterExpiry();
  const a=(await h.school.act(req(),h.sql,'checkout',{},start)).checkout;
  const still=(await h.school.act(req(),h.sql,'checkout',{},new Date(+start+1000))).checkout;assert.equal(still.id,a.id);
  const next=(await h.school.act(req(),h.sql,'checkout',{},new Date(+start+86400000))).checkout;
  assert.notEqual(next.id,a.id);assert.equal(next.priceTHB,1690);assert.equal(h.carts[0].generation,0);assert.equal(h.carts[1].generation,1);
  const old=(await h.school.restore(req(),h.sql,a.id,new Date(+start+86400000))).checkout;assert.equal(old.expiresAt,a.expiresAt);assert.equal(old.expired,true);assert.equal(old.canSubmitReceipt,true);
  assert.equal(requiredCheckoutAmount(h.carts[0],new Date(+start+1000)),1690);
});
test('discount carts keep generation zero and never renew after their own expiry',async()=>{
  const h=commerceHarness(),a=(await h.school.act(req(),h.sql,'checkout',{},NOW)).checkout;
  const r=(await h.school.act(req(),h.sql,'checkout',{},afterExpiry())).checkout;
  assert.equal(r.priceTHB,1690);assert.equal(h.carts.filter(c=>c.quoted_amount_thb===990).length,1);assert.equal(h.carts[0].generation,0);
  const restored=(await h.school.restore(req(),h.sql,a.id,afterExpiry())).checkout;assert.equal(restored.expiresAt,a.expiresAt);assert.equal(restored.priceActive,false);
});
test('pending, verified, admitted and any historical grant exclude new discounts and checkout',async()=>{
  for(const status of ['pending_verification','payment_verified','admitted','expired-grant','revoked-refund']) {
    const h=commerceHarness();await h.school.act(req(),h.sql,'checkout',{},NOW);
    if(status.includes('grant') || status==='revoked-refund')h.grants.push({user_id:user.id,course_id:'ai-sauce',expires_at:NOW,revoked_at:status==='revoked-refund'?NOW:null});
    else h.registrations.push({account_id:user.id,status});
    for(const action of ['recovery','checkout'])await assert.rejects(h.school.act(req(),h.sql,action,{},afterExpiry()),e=>e.code==='ALREADY_REGISTERED');
    const offer=await h.school.offer(req(),h.sql,afterExpiry());assert.equal(offer.school.blocked,true);assert.equal(offer.school.recoveryAvailable,false);
  }
});
test('receipt committed while recovery waits for the account lock prevents issuance',async()=>{
  let race=false;const h=commerceHarness({onAccountLock:({registrations})=>{if(race && !registrations.length)registrations.push({account_id:user.id,status:'pending_verification'});}});
  await h.school.act(req(),h.sql,'checkout',{},NOW);race=true;
  await assert.rejects(h.school.act(req(),h.sql,'recovery',{},afterExpiry()),e=>e.code==='RECOVERY_UNAVAILABLE');assert.equal(h.offers.filter(o=>o.kind==='recovery').length,0);
});
test('a blocked cart insert cannot leave a false checkout-start marker',async()=>{
  const h=commerceHarness({onAccountLock:({registrations})=>registrations.push({account_id:user.id,status:'pending_verification'})});
  await assert.rejects(h.school.act(req(),h.sql,'checkout',{},NOW),e=>e.code==='ALREADY_REGISTERED');
  assert.equal(h.carts.length,0);assert.equal(h.offers[0].checkout_started_at,undefined);
});
test('late evidence is accepted against its own cart, claimed ownership and price cannot override it',async()=>{
  const h=commerceHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),data={...input(),checkoutId:cart.checkout.id,accountId:'bob',quotedAmountTHB:1};
  const actual=await h.school.bind(req({headers:{}}),h.sql,data,validateIntake(data,afterExpiry()),afterExpiry());
  assert.equal(actual.accountId,user.id);assert.equal(actual.checkoutId,cart.checkout.id);assert.equal(actual.quotedAmountTHB,990);assert.equal(actual.amountSatang,99000);
  await assert.rejects(h.school.bind(req({testUser:{...user,id:'bob'}}),h.sql,data,validateIntake(data,afterExpiry()),afterExpiry()),e=>e.code==='CHECKOUT_NOT_FOUND');
  await assert.rejects(h.school.bind(req(),h.sql,data,{...actual,email:'other@example.test'},afterExpiry()),e=>e.code==='ACCOUNT_EMAIL_MISMATCH');
});
test('verification uses actual transfer time, not upload time; exact expiry and malformed evidence fail',()=>{
  const c={issued_at:NOW,expires_at:new Date(signed.offer.expires),quoted_amount_thb:990};
  assert.equal(requiredCheckoutAmount(c,new Date(+NOW+1000)),990);
  assert.throws(()=>requiredCheckoutAmount(c,new Date(+NOW-1)),e=>e.code==='TRANSFER_BEFORE_CHECKOUT');
  assert.throws(()=>requiredCheckoutAmount(c,new Date(signed.offer.expires)),e=>e.code==='OFFER_EXPIRED_AT_TRANSFER');
  for(const bad of [{...c,quoted_amount_thb:1},{...c,issued_at:'bad'},{...c,expires_at:NOW}])assert.throws(()=>requiredCheckoutAmount(bad,NOW),e=>e.code==='CHECKOUT_INVALID');
  assert.throws(()=>requiredCheckoutAmount(c,'bad'),e=>e.code==='CHECKOUT_INVALID');
});
test('verified bank reference is normalized and low amount or absent reference cannot pass',async()=>{
  const h=commerceHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),row={checkout_id:cart.checkout.id,account_id:user.id};
  assert.equal(await h.school.verify(h.sql,row,99000,new Date(+NOW+1000),{bankTransactionId:' abc-123 '}),'ABC-123');
  await assert.rejects(h.school.verify(h.sql,row,98999,NOW,{bankTransactionId:'ABC-123'}),e=>e.code==='PAYMENT_SHORT');
  await assert.rejects(h.school.verify(h.sql,row,99000,NOW,{}),e=>e.field==='bankTransactionId');
});
test('receipt replay never downgrades a paid cart and rejects a conflicting reference',async()=>{
  const h=commerceHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW);
  const row={checkout_id:cart.checkout.id,account_id:user.id,reference:'SAUCE-'+ 'A'.repeat(32),status:'payment_verified'};
  await h.school.recorded(h.sql,row);assert.equal(h.carts[0].status,'paid');
  await h.school.recorded(h.sql,{...row,status:'pending_verification'});assert.equal(h.carts[0].status,'paid');assert.equal(h.recorded.length,2);
  await assert.rejects(h.school.recorded(h.sql,{...row,reference:'SAUCE-'+ 'B'.repeat(32)}),e=>e.code==='CHECKOUT_CONFLICT');
});
test('account-serialized write is two ordered statements with a fresh ReadCommitted snapshot',async()=>{
  const calls=[];const sql={async transaction(make,options){calls.push(options);const batch=make({query:(text,params)=>({text,params})});calls.push(...batch);return [[{id:'alice'}],[{saved:true}]];}};
  assert.deepEqual(await learnAccountWrite(sql,'alice','INSERT example',[]),[{saved:true}]);
  assert.deepEqual(calls[0],{isolationLevel:'ReadCommitted'});assert.match(calls[1].text,/WHERE id=\$1 FOR UPDATE/);assert.deepEqual(calls[1].params,['alice']);assert.equal(calls[2].text,'INSERT example');
});
test('receipt store locks account before saving private bytes and declares canonical bank uniqueness',async()=>{
  const statements=[];const sql={async query(text,args){statements.push({text,args});return [];},async transaction(make,opts){assert.equal(opts.isolationLevel,'ReadCommitted');const batch=make({query:(text,args)=>({text,args})});statements.push(...batch);return [[{id:user.id}],[{reference:'saved'}]];}};
  const intake=validateIntake(input(),new Date(+NOW+1000));
  await createAiSourceStore(sql).insert({...intake,accountId:user.id,checkoutId:randomUUID(),reference:'SAUCE-'+ 'A'.repeat(32),offer:signed.offer,quotedAmountTHB:990,now:NOW});
  assert.match(statements[0].text,/FOR UPDATE/);assert.match(statements[1].text,/receipt_bytes/);assert.match(statements[1].text,/decode\(\$13,'base64'\)/);
  assert.equal(statements[1].args[17],user.id);await ensureAiSourceSchema(sql);
  assert.ok(statements.some(x=>/UNIQUE INDEX.*UPPER\(BTRIM\(bank_transaction_id\)\)/.test(x.text)));
});

function intakeHarness({collision,recordFailsOnce=false}={}) {
  const h=commerceHarness(),rows=new Map(),events=[],sql=h.sql;let seq=0,fail=recordFailsOnce,finds=0;
  const mem={async ensure(){},async rateLimit(){return true;},async findIdempotency(key){finds++;if(collision && finds===1)return null;return [...rows.values()].find(r=>r.key===key);},
    async insert(x){events.push('save');const row={id:String(++seq),key:x.idempotencyKey,payload_hash:x.payloadHash,reference:x.reference,account_id:x.accountId,checkout_id:x.checkoutId,
      quoted_amount_thb:x.quotedAmountTHB,submitted_amount_satang:x.amountSatang,submitted_transferred_at:x.transferredAt,offer_expires_at:new Date(x.offer.expires),offer_first_seen_at:new Date(x.offer.firstSeen),
      name:x.name,email:x.email,contact:x.contact,receipt_mime:x.receipt.mime,receipt_name:x.receipt.name,receipt_sha256:x.receipt.sha256,receipt_size:x.receipt.size,
      status:'pending_verification',notify_status:'pending',created_at:x.now,updated_at:x.now};rows.set(row.reference,row);h.registrations.push(row);
      if(collision==='unique'){const e=Error('race');e.code='23505';throw e;}if(collision==='null')return null;return row;},
    async claimNotify(reference){const r=rows.get(reference);if(r.notify_status==='sent' || r.notify_status==='sending')return false;r.notify_status='sending';return true;},
    async finishNotify(reference,attempt,result){Object.assign(rows.get(reference),{notify_status:result.status,notify_detail:result});},
    async get(reference){return rows.get(reference);},
    async bindLegacyAccount(reference,email,note,time){const r=rows.get(reference);if(!r?.legacy_quote_eligible || r.account_id || r.checkout_id || !['pending_verification','payment_verified'].includes(r.status) || r.email!==email || email!==user.email || !h.accounts.get(user.id)?.email_verified_at)return null;
      Object.assign(r,{account_id:user.id,legacy_bound_at:time,legacy_bound_by:'ai-source-admin',owner_note:note});return r;},
    async verify(reference,amount,transferred,note,time,bankRef){const row=rows.get(reference);if([...rows.values()].some(r=>r.reference!==reference && r.bank_transaction_id===bankRef)){const e=Error('duplicate');e.code='23505';throw e;}
      if(row.status!=='pending_verification')return null;Object.assign(row,{status:'payment_verified',verified_amount_satang:amount,verified_transferred_at:transferred,verified_at:time,bank_transaction_id:bankRef});return row;},
  };
  const school={...h.school,recorded:async(s,row)=>{events.push('record');if(fail){fail=false;throw Error('injected link failure');}return h.school.recorded(s,row);},
    grant:async(s,data)=>{events.push({grant:data});const r=rows.get(data.reference);if(r.status!=='payment_verified')return null;r.status='admitted';r.admitted_at=data.now;return {reference:r.reference};}};
  const handler=createAiSourceHandler({database:()=>sql,sendJson:(res,body,status=200)=>Object.assign(res,{body,statusCode:status}),config,school,storeFactory:()=>mem,now:afterExpiry,log:()=>{},notify:async()=>{events.push('notify');return {status:'sent',code:'TEST_ACCEPTED'};}});
  async function call(method,data={},query={},extra={}) {
    const r={...req(),method,url:'/api/ai-source',query,body:data,headers:{host:'www.myclover.com',origin:'https://www.myclover.com','content-type':'application/json',...extra.headers},testUser:extra.testUser===undefined?user:extra.testUser};
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(){}};await handler(r,res);return res;
  }
  return {...h,rows,events,call};
}
test('school intake works without an offer cookie using an owned expired cart; no automatic approval',async()=>{
  const h=intakeHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),data={...input(),checkoutId:cart.checkout.id,paid:true,status:'admitted'};
  const r=await h.call('POST',data);assert.equal(r.statusCode,201);assert.equal(r.body.status,'pending_verification');assert.equal(r.body.quotedAmountTHB,990);assert.equal(h.grants.length,0);
  assert.deepEqual(h.events,['save','record','notify']);assert.equal(h.carts[0].status,'submitted');
});
test('partial school save can be retried with the original key, repairing link before a single notification',async()=>{
  const h=intakeHarness({recordFailsOnce:true}),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),data={...input(),checkoutId:cart.checkout.id};
  const failed=await h.call('POST',data);assert.equal(failed.statusCode,500);assert.equal(h.rows.size,1);assert.equal(h.events.includes('notify'),false);
  const retry=await h.call('POST',data);assert.equal(retry.statusCode,200);assert.equal(retry.body.replayed,true);assert.equal(retry.body.reference,[...h.rows.keys()][0]);assert.equal(retry.body.notification.status,'sent');
  await h.call('POST',data);assert.equal(h.events.filter(x=>x==='notify').length,1);assert.equal(h.rows.size,1);
  assert.equal((await h.call('POST',{...data,amountTHB:1690})).body.code,'IDEMPOTENCY_CONFLICT');
});
for(const collision of ['null','unique'])test(`concurrent ${collision} insert replay reconciles school state and notification`,async()=>{
  const h=intakeHarness({collision}),cart=await h.school.act(req(),h.sql,'checkout',{},NOW);
  const r=await h.call('POST',{...input(),checkoutId:cart.checkout.id});assert.equal(r.statusCode,200);assert.equal(r.body.replayed,true);assert.equal(h.carts[0].status,'submitted');assert.equal(h.recorded.length,1);assert.equal(h.events.filter(x=>x==='notify').length,1);
});
test('GET and POST checkout restoration both authorize the owner and preserve an expired cart',async()=>{
  const h=intakeHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW);
  const get=await h.call('GET',undefined,{action:'checkout',checkoutId:cart.checkout.id}),post=await h.call('POST',{checkoutId:cart.checkout.id},{action:'checkout'});
  assert.equal(get.statusCode,200);assert.deepEqual(get.body.checkout,post.body.checkout);assert.equal(get.body.checkout.expired,true);assert.equal(h.carts.length,1);
  const other=await h.call('GET',undefined,{action:'checkout',checkoutId:cart.checkout.id},{testUser:{...user,id:'bob'}});assert.equal(other.statusCode,404);
  const guest=await h.call('GET',undefined,{action:'checkout',checkoutId:cart.checkout.id},{testUser:null});assert.equal(guest.statusCode,401);
});
test('admin verification replays only with the same bank reference; same bank transfer cannot verify twice',async()=>{
  const h=intakeHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),created=await h.call('POST',{...input(),checkoutId:cart.checkout.id});
  const data={action:'verify_payment',reference:created.body.reference,confirmedReceived:true,verifiedAmountTHB:990,verifiedTransferredAt:'2026-09-14T10:00:01+07:00',bankTransactionId:' abc-123 '},auth={headers:{'x-admin-key':config.MEET_ADMIN_KEY}};
  assert.equal((await h.call('PATCH',data,{},auth)).statusCode,200);assert.equal(h.carts[0].status,'paid');
  const replay=await h.call('PATCH',data,{},auth);assert.equal(replay.statusCode,200);assert.equal(replay.body.replayed,true);
  assert.equal((await h.call('PATCH',{...data,bankTransactionId:'DIFFERENT-123'},{},auth)).body.code,'BANK_TRANSACTION_CONFLICT');
  const old=[...h.rows.values()][0],duplicate={...old,reference:'SAUCE-'+ 'B'.repeat(32),status:'pending_verification',bank_transaction_id:null};h.rows.set(duplicate.reference,duplicate);
  assert.equal((await h.call('PATCH',{...data,reference:duplicate.reference},{},auth)).body.code,'DUPLICATE_BANK_TRANSACTION');
});
test('admission passes the owner note to the atomic grant helper and a replay never grants again',async()=>{
  const h=intakeHarness(),cart=await h.school.act(req(),h.sql,'checkout',{},NOW),created=await h.call('POST',{...input(),checkoutId:cart.checkout.id});
  const row=[...h.rows.values()][0];Object.assign(row,{status:'payment_verified',verified_at:NOW,verified_amount_satang:99000,verified_transferred_at:NOW});
  const data={action:'mark_admitted',reference:created.body.reference,accessSent:true,note:'ตรวจบัญชีผู้ซื้อแล้ว'},extra={headers:{'x-admin-key':config.MEET_ADMIN_KEY}};
  assert.equal((await h.call('PATCH',data,{},extra)).statusCode,200);assert.equal(h.events.find(x=>x.grant).grant.note,data.note);
  assert.equal((await h.call('PATCH',data,{},extra)).body.replayed,true);assert.equal(h.events.filter(x=>x.grant).length,1);assert.equal(h.carts[0].status,'paid');
});
test('only an explicitly bound legacy row may use the old offer window without a checkout',async()=>{
  const h=commerceHarness(),legacy={reference:'SAUCE-'+ 'C'.repeat(32),account_id:user.id,checkout_id:null,legacy_quote_eligible:true,legacy_bound_at:NOW,legacy_bound_by:'ai-source-admin',offer_expires_at:new Date(signed.offer.expires)};
  assert.equal(await h.school.verify(h.sql,legacy,99000,NOW,{bankTransactionId:'LEGACY-123'}),'LEGACY-123');
  await assert.rejects(h.school.verify(h.sql,legacy,99000,afterExpiry(),{bankTransactionId:'LEGACY-123'}),e=>e.code==='PAYMENT_SHORT');
  assert.equal(await h.school.verify(h.sql,legacy,169000,afterExpiry(),{bankTransactionId:'LEGACY-123'}),'LEGACY-123');
  await h.school.recorded(h.sql,legacy);assert.equal(h.recorded.length,1);assert.equal(h.events.some(e=>e.q?.startsWith('UPDATE mc_learn_checkouts')),false);
  for(const changed of [{legacy_quote_eligible:false},{legacy_bound_at:null},{legacy_bound_by:'client'}]){
    await assert.rejects(h.school.verify(h.sql,{...legacy,...changed},99000,NOW,{bankTransactionId:'LEGACY-123'}),e=>e.code==='CHECKOUT_NOT_FOUND');
    await assert.rejects(h.school.recorded(h.sql,{...legacy,...changed}),e=>e.code==='ACCOUNT_BINDING_REQUIRED');
  }
});
test('legacy binding is admin-only, requires matched verified email and note, and never grants or verifies',async()=>{
  const h=intakeHarness(),reference='SAUCE-'+ 'D'.repeat(32),row={reference,id:'1',email:user.email,name:'Legacy TEST',account_id:null,checkout_id:null,legacy_quote_eligible:true,status:'pending_verification',quoted_amount_thb:990,submitted_amount_satang:99000,submitted_transferred_at:NOW,offer_expires_at:new Date(signed.offer.expires),created_at:NOW,updated_at:NOW};h.rows.set(reference,row);
  const data={action:'bind_account',reference,accountEmail:user.email,note:'ตรวจผู้ซื้อกับอีเมลที่ยืนยันแล้ว'},auth={headers:{'x-admin-key':config.MEET_ADMIN_KEY}};
  assert.equal((await h.call('PATCH',data)).statusCode,401);assert.equal(row.account_id,null);
  assert.equal((await h.call('PATCH',{...data,note:''},{},auth)).body.code,'LEGACY_BINDING_FIELDS_REQUIRED');
  assert.equal((await h.call('PATCH',{...data,accountEmail:'other@example.test'},{},auth)).body.code,'LEGACY_BINDING_NOT_ELIGIBLE');
  h.accounts.set(user.id,{email_verified_at:null});assert.equal((await h.call('PATCH',data,{},auth)).body.code,'LEGACY_BINDING_NOT_ELIGIBLE');h.accounts.set(user.id,{email_verified_at:NOW});
  const bound=await h.call('PATCH',data,{},auth);assert.equal(bound.statusCode,200);assert.equal(bound.body.registration.accountId,user.id);assert.equal(bound.body.registration.status,'pending_verification');assert.equal(bound.body.registration.legacyBindingEligible,false);assert.equal(h.events.some(x=>x.grant || x==='notify'),false);
  assert.equal((await h.call('PATCH',data,{},auth)).body.replayed,true);assert.equal(row.status,'pending_verification');
});
test('a newly inserted checkout-less row is not eligible for legacy binding',async()=>{
  const h=intakeHarness(),reference='SAUCE-'+ 'E'.repeat(32);h.rows.set(reference,{reference,email:user.email,legacy_quote_eligible:false,status:'pending_verification'});
  const r=await h.call('PATCH',{action:'bind_account',reference,accountEmail:user.email,note:'attempt'},{},{headers:{'x-admin-key':config.MEET_ADMIN_KEY}});
  assert.equal(r.body.code,'LEGACY_BINDING_NOT_ELIGIBLE');assert.equal(h.recorded.length,0);
});
test('legacy schema stamps existing rows only once and binding SQL requires the exact verified account',async()=>{
  const queries=[];const sql={async query(text,args){queries.push({text,args});if(text.startsWith('UPDATE mc_ai_source_registrations r SET account_id='))return [{reference:'saved'}];if(text.startsWith('SELECT '))return [{reference:'saved',account_id:user.id,status:'pending_verification'}];return [];}};
  await ensureAiSourceSchema(sql);const migration=queries.find(x=>x.text.includes('ADD COLUMN legacy_quote_eligible')).text;
  assert.match(migration,/IF NOT EXISTS\(SELECT 1 FROM information_schema.columns/);assert.match(migration,/DEFAULT FALSE/);assert.match(migration,/WHERE account_id IS NULL AND checkout_id IS NULL/);
  const got=await createAiSourceStore(sql).bindLegacyAccount('saved',user.email,'checked',NOW);assert.equal(got.status,'pending_verification');
  const bind=queries.find(x=>x.text.startsWith('UPDATE mc_ai_source_registrations r SET account_id=')).text;
  assert.match(bind,/r.legacy_quote_eligible=TRUE/);assert.match(bind,/LOWER\(BTRIM\(r.email\)\)=\$2/);assert.match(bind,/LOWER\(a.email\)=\$2 AND a.email_verified_at IS NOT NULL/);
  assert.doesNotMatch(bind,/status='admitted'|status='payment_verified'|INSERT INTO mc_learn_grants/);
});

test('pay-first signed quote binds after login and preserves pre-login transfer time, including late uploads',async()=>{
  const {paymentQuote}=await import('./ai-source-domain.js');
  const payment=paymentQuote(signed.offer,NOW,config.MEET_ADMIN_KEY),h=commerceHarness();
  const time=afterExpiry();
  const result=await h.school.act(req(),h.sql,'checkout',{guestQuote:payment.token},time);
  assert.equal(result.checkout.priceTHB,990);assert.equal(result.checkout.issuedAt,NOW.toISOString());
  assert.equal(requiredCheckoutAmount(h.carts[0],new Date(+NOW+60000)),990);
  assert.throws(()=>requiredCheckoutAmount(h.carts[0],new Date(signed.offer.expires+1)),/หมดสิทธิ์/);
  assert.throws(()=>requiredCheckoutAmount(h.carts[0],new Date(+NOW-1)),/ก่อนเปิดรายการ/);
  await assert.rejects(h.school.act(req(),h.sql,'checkout',{guestQuote:payment.token+'tampered'},time),/ไม่ถูกต้อง/);
});
