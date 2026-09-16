import test from 'node:test';
import assert from 'node:assert/strict';
import {companionEntitlement,paymentIncludesCompanion,COMPANION_BONUS_ID} from './learn-bonus.js';
import {authorizeLearnMedia} from './learn-media-authorization.js';
import {createLearnMediaHandler,learnMediaPathname} from './learn-media-handler.js';
import {LEARN_COURSES,LEARN_ASSETS} from './learn-catalog.js';
import {readFile} from 'node:fs/promises';
import {Writable} from 'node:stream';
const now=Date.parse('2026-09-16T10:00:00Z');
const payment={starts_at:'2026-09-01',expires_at:'2027-09-01',revoked_at:null,status:'admitted',verified_at:'2026-09-02',
  verified_amount_satang:99000,verified_transferred_at:'2026-09-01T03:00:00Z',checkout_id:'checked-cart',checkout_bound:true,
  checkout_price:990,checkout_issued_at:'2026-09-01T00:00:00Z',checkout_expires_at:'2026-09-02T00:00:00Z'};
test('only verified active 990/full purchases include companion; recovery never upgrades from an overpayment',()=>{
  assert.equal(paymentIncludesCompanion(payment,now),true);
  assert.equal(paymentIncludesCompanion({...payment,checkout_price:1690,verified_amount_satang:169000},now),true);
  for(const verified_amount_satang of [79000,99000,169000])assert.equal(paymentIncludesCompanion({...payment,checkout_price:790,verified_amount_satang},now),false);
  for(const patch of [{status:'pending_verification'},{verified_at:null},{verified_amount_satang:79000},{verified_transferred_at:null},
    {checkout_bound:false},{checkout_bound:'false'},{checkout_bound:1},{checkout_price:100},{checkout_issued_at:'2026-09-01T04:00:00Z'},{checkout_expires_at:'2026-09-01T03:00:00Z'},
    {expires_at:'2026-09-15'},{revoked_at:'2026-09-16'},{starts_at:'2026-10-01'}])assert.equal(paymentIncludesCompanion({...payment,...patch},now),null,JSON.stringify(patch));
});
test('trusted historical 990/full receipt binding works without a checkout; uncertain legacy prices fail closed',()=>{
  const legacy={...payment,checkout_id:null,quoted_amount_thb:990,legacy_quote_eligible:true,legacy_bound_at:'2026-09-02',
    legacy_bound_by:'ai-source-admin',offer_first_seen_at:'2026-09-01T00:00:00Z',offer_expires_at:'2026-09-02T00:00:00Z'};
  assert.equal(paymentIncludesCompanion(legacy,now),true);
  assert.equal(paymentIncludesCompanion({...legacy,verified_transferred_at:'2026-09-03',verified_amount_satang:169000},now),true);
  for(const patch of [{legacy_bound_by:'client'},{legacy_quote_eligible:false},{quoted_amount_thb:790},{legacy_bound_at:null},
    {verified_transferred_at:'2026-09-03'},{offer_first_seen_at:null}])assert.equal(paymentIncludesCompanion({...legacy,...patch},now),null);
});
test('bonus lookup binds active grant to its own account receipt and checkout; missing payment service affects bonuses only',async()=>{
  let query,args;const sql={query:async(q,a)=>{query=q;args=a;return[payment];}};
  assert.equal(await companionEntitlement(sql,'alice','ai-sauce',now),'included');
  assert.deepEqual(args,['alice','ai-sauce',new Date(now)]);
  assert.match(query,/r.reference=g.reference AND r.account_id=g.user_id/);
  assert.match(query,/l.reference=g.reference AND l.user_id=g.user_id AND l.course_id=g.course_id/);
  assert.match(query,/c.user_id=r.account_id AND c.course_id=g.course_id/);
  assert.match(query,/c.id=r.checkout_id/);assert.match(query,/c.reference IS NULL OR c.reference=r.reference/);
  assert.match(query,/g.user_id=\$1 AND g.course_id=\$2 AND g.revoked_at IS NULL AND g.starts_at<=\$3 AND g.expires_at>\$3/);
  assert.equal(await companionEntitlement({query:async()=>[{...payment,checkout_price:790}]},'alice','ai-sauce',now),'not_included');
  assert.equal(await companionEntitlement({query:async()=>[]},'alice','ai-sauce',now),'unverified');
  assert.equal(await companionEntitlement({query:async()=>{throw Error('unavailable');}},'alice','ai-sauce',now),'unverified');
});
test('a valid grant or instructor cannot fetch bonus bytes under a mismatched catalog course, lesson, bundle or asset type',async()=>{
  for(const asset of [{...bonusAsset,courseId:'other'},{...bonusAsset,lessonIds:['EP01']},{...bonusAsset,entitlement:'another-bundle'},
    {...bonusAsset,kind:'video'},{...bonusAsset,entitlement:undefined}]){
    await assert.rejects(authorizeLearnMedia({query:async()=>[{...mediaAccess,active_instructor:true}]},req,ids,
      {now,courses:[bonusCourse],assets:[asset]}),e=>e.code==='ASSET_NOT_FOUND');
  }
  const altered={...bonusCourse,bonus:{...bonusCourse.bonus,resourceIds:['different_asset']}};
  await assert.rejects(authorizeLearnMedia({query:async()=>[{...mediaAccess,active_instructor:true}]},req,ids,
    {now,courses:[altered],assets:[bonusAsset]}),e=>e.code==='ASSET_NOT_FOUND');
});
test('forged price, other account/reference and cached validators cannot download an excluded bonus or reach storage',async()=>{
  let blobCalls=0,payments=[{...payment,checkout_price:790}],session={...mediaAccess};
  const sql={query:async q=>q.includes('FROM mc_sessions')?[session]:payments};
  const handler=createLearnMediaHandler({getSql:()=>sql,authorize:(sql,req,ids)=>authorizeLearnMedia(sql,req,ids,
    {now,courses:[bonusCourse],assets:[bonusAsset]}),registryAssets:[bonusAsset],timingLog:()=>{},
    getBlob:async()=>{blobCalls++;throw Error('denied request reached private storage');}});
  const call=async(method='GET')=>{
    const res=new Writable({write(chunk,encoding,done){this.parts.push(Buffer.from(chunk));done();}});res.parts=[];res.headers={};
    res.setHeader=(k,v)=>{res.headers[k.toLowerCase()]=v;};res.removeHeader=k=>{delete res.headers[k.toLowerCase()];};
    await handler({method,url:'/api/learn-media?'+new URLSearchParams({...ids,priceTHB:'990',accountId:'someone-else',reference:'OTHER-PAID'}),
      headers:{...req.headers,'if-none-match':'*','x-myclover-media-if-none-match':'*',range:'bytes=0-9'}},res);
    return res;
  };
  for(const method of ['GET','HEAD'])for(const rows of [[{...payment,checkout_price:790}],[],[{...payment,expires_at:'2026-09-15'}],
    [{...payment,status:'pending_verification'}],[{...payment,checkout_bound:false}]]){
    payments=rows;const res=await call(method);assert.equal(res.statusCode,403);assert.equal(res.headers['cache-control'],'private, no-store');
    assert.equal(res.headers.etag,undefined);
  }
  session.enrolled_user_id='another-account';payments=[payment];assert.equal((await call()).statusCode,403);
  session.enrolled_user_id='alice';session.active_grant=false;assert.equal((await call()).statusCode,403);
  assert.equal(blobCalls,0);
});
test('marketing uses assigned bundle value, never an invented historical selling price; terms copies remain synchronized',async()=>{
  const html=await readFile(new URL('../../ai-source/index.html',import.meta.url),'utf8');
  const config=JSON.parse(await readFile(new URL('../../ai-source/OFFER_CONFIG.json',import.meta.url),'utf8'));
  const inline=JSON.parse(/<script type="application\/json" id="offer-config">\s*([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(inline,config);assert.match(html,/มูลค่ารวม ฿1,690/);
  assert.doesNotMatch(html,/(?:เคยขาย|เคยจำหน่าย|ราคาขายเดิม|ขายแยก)[^<\n]{0,60}1,690/);
  assert.match(html,/<section id="recovery-offer"[^>]* hidden/);
  const visibleWithoutRecovery=html.replace(/<section id="recovery-offer"[\s\S]*?<\/section>/,'');
  assert.doesNotMatch(visibleWithoutRecovery,/(?:฿|ราคา|แพ็ก)\s*790/);
});
const bonusAsset={id:'m_bonus',courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'resource',entitlement:COMPANION_BONUS_ID};
const bonusCourse={id:'ai-sauce',bonus:{id:COMPANION_BONUS_ID,lessonId:'FOUNDATION',resourceIds:['m_bonus']},lessons:[{id:'FOUNDATION',mediaId:'m_video'}]};
const mediaAccess={account_id:'alice',session_verified_at:'2026-09-01',account_verified_at:'2026-09-01',session_expires_at:'2026-10-01',
  enrolled_user_id:'alice',active_grant:true,active_instructor:false,pathname:'learn/228.pdf'};
const req={headers:{cookie:'mc_session=fixture-session'}};
const ids={courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'m_bonus'};
test('bonus direct URL checks verified package on every request; instructors work, 790 and unknown deny, lesson video is unaffected',async()=>{
  let row={...mediaAccess},payments=[payment],calls=0;
  const sql={query:async q=>{calls++;return q.includes('FROM mc_sessions')?[row]:payments;}};
  const options={now,courses:[bonusCourse],assets:[bonusAsset,{id:'m_video',courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'video'}]};
  assert.equal((await authorizeLearnMedia(sql,req,ids,options)).asset.id,'m_bonus');assert.equal(calls,2);
  payments=[{...payment,checkout_price:790}];await assert.rejects(authorizeLearnMedia(sql,req,ids,options),e=>e.code==='BONUS_ACCESS_REQUIRED');
  payments=[];await assert.rejects(authorizeLearnMedia(sql,req,ids,options),e=>e.code==='BONUS_ACCESS_REQUIRED');
  assert.equal((await authorizeLearnMedia(sql,req,{...ids,assetId:'m_video'},options)).asset.id,'m_video');
  row.active_instructor=true;calls=0;assert.equal((await authorizeLearnMedia(sql,req,ids,options)).asset.id,'m_bonus');assert.equal(calls,1);
  row.active_instructor=false;row.active_grant=false;await assert.rejects(authorizeLearnMedia(sql,req,ids,options),e=>e.code==='COURSE_ACCESS_REQUIRED');
});
test('placing a restricted asset in ordinary resourceIds cannot bypass bonus authorization',async()=>{
  const course={...bonusCourse,bonus:undefined,lessons:[{id:'FOUNDATION',resourceIds:['m_bonus']}]};
  await assert.rejects(authorizeLearnMedia({query:async()=>[mediaAccess]},req,ids,{now,courses:[course],assets:[bonusAsset]}),e=>e.code==='BONUS_ACCESS_REQUIRED');
});

test('real catalog publishes exactly two restricted companion attachments at frozen append-only upload positions',()=>{
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),bonus=course.bonus;
  assert.equal(bonus.id,COMPANION_BONUS_ID);assert.equal(bonus.valueTHB,1690);assert.equal(bonus.lessonId,'FOUNDATION');
  assert.equal(new Set(bonus.resourceIds).size,2);assert.equal(bonus.resourceIds.length,2);
  const expected=[['AI_SAUCE_FIELD_GUIDE.pdf','application/pdf','learn/250.pdf'],['AI_SAUCE_WORK_COACH.md','text/markdown; charset=utf-8','learn/251.md']];
  for(const [index,id] of bonus.resourceIds.entries()){
    const entries=LEARN_ASSETS.filter(a=>a.id===id);assert.equal(entries.length,1);const asset=entries[0];
    assert.equal(asset.filename,expected[index][0]);assert.equal(asset.contentType,expected[index][1]);assert.equal(learnMediaPathname(asset),expected[index][2]);
    assert.equal(asset.courseId,course.id);assert.deepEqual(asset.lessonIds,['FOUNDATION']);assert.equal(asset.kind,'resource');
    assert.equal(asset.entitlement,COMPANION_BONUS_ID);assert.equal(asset.disposition,'attachment');assert.equal(asset.previewAllowed,false);
    assert.ok(Number.isSafeInteger(asset.bytes)&&asset.bytes>0);
    for(const lesson of course.lessons)assert.ok(![...(lesson.resourceIds||[]),...(lesson.additionalResourceIds||[])].includes(id),'Bonus must not enter all-package lesson file lists');
  }
  const retired=[['m_fbcb3c7aad0816213a8eeb8430eba847',228,'learn/228.pdf'],
    ['m_4175a4b0038580f97018e45d277e9d5a',229,'learn/229.md'],['m_7442bf578d1f80ebe7e8836fed65a8ac',249,'learn/249.pdf']];
  for(const [id,index,pathname] of retired){
    assert.equal(LEARN_ASSETS[index].id,id);assert.equal(learnMediaPathname(LEARN_ASSETS[index]),pathname);
    assert.ok(!bonus.resourceIds.includes(id),'Only the current companion editions may be offered');
  }
  assert.deepEqual(new Set(LEARN_ASSETS.filter(a=>a.entitlement===COMPANION_BONUS_ID).map(a=>a.id)),new Set([...bonus.resourceIds,...retired.map(([id])=>id)]));
});
test('retired ebook and assistant editions cannot be downloaded even by an instructor or a valid 990/full member',async()=>{
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce');
  const retiredIds=['m_fbcb3c7aad0816213a8eeb8430eba847','m_4175a4b0038580f97018e45d277e9d5a','m_7442bf578d1f80ebe7e8836fed65a8ac'];
  for(const assetId of retiredIds)for(const tier of ['instructor',990,1690]){
    const sql={query:async q=>q.includes('FROM mc_sessions')?[{...mediaAccess,active_instructor:tier==='instructor'}]
      :[{...payment,checkout_price:tier,verified_amount_satang:Number(tier)*100}]};
    await assert.rejects(authorizeLearnMedia(sql,req,{courseId:course.id,lessonId:course.bonus.lessonId,assetId},{now}),
      e=>e.code==='ASSET_NOT_FOUND',`Retired attachment ${assetId} denied for ${tier}`);
  }
});
test('actual catalog download routes deliver both exact attachments for instructor/990/1690 and deny both for790',async()=>{
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),bonus=course.bonus;
  for(const tier of ['instructor',990,1690,790])for(const assetId of bonus.resourceIds){
    const asset=LEARN_ASSETS.find(a=>a.id===assetId),pathname=learnMediaPathname(asset),payload=Buffer.alloc(asset.bytes,65);
    const actualSession={...mediaAccess,active_instructor:tier==='instructor',active_grant:tier!=='instructor',pathname,
      content_type:asset.contentType,bytes:asset.bytes,sha256:'a'.repeat(64)};
    const sql={query:async q=>q.includes('FROM mc_sessions')?[actualSession]:[{...payment,checkout_price:tier,verified_amount_satang:Number(tier)*100}]};
    let reads=0;
    const handler=createLearnMediaHandler({getSql:()=>sql,authorize:(sql,req,ids)=>authorizeLearnMedia(sql,req,ids,{now}),
      config:{LEARN_BLOB_READ_WRITE_TOKEN:'test-only'},timingLog:()=>{},getBlob:async(path,options)=>{
        reads++;assert.equal(path,pathname);assert.equal(options.access,'private');
        return {headers:new Headers({'content-length':String(payload.length)}),stream:new ReadableStream({start(c){c.enqueue(payload);c.close();}})};
      }});
    const res=new Writable({write(chunk,encoding,done){this.parts.push(Buffer.from(chunk));done();}});res.parts=[];res.headers={};
    res.setHeader=(k,v)=>{res.headers[k.toLowerCase()]=v;};res.removeHeader=k=>{delete res.headers[k.toLowerCase()];};
    await handler({method:'GET',url:'/api/learn-media?'+new URLSearchParams({courseId:course.id,lessonId:bonus.lessonId,assetId}),headers:req.headers},res);
    assert.equal(res.statusCode,tier===790?403:200,`${tier}: ${asset.filename}`);
    if(tier===790){assert.equal(reads,0);assert.equal(res.headers['content-disposition'],undefined);}
    else{assert.equal(reads,1);assert.equal(res.headers['content-type'],asset.contentType);
      assert.equal(res.headers['content-disposition'],`attachment; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);
      assert.equal(res.headers['content-length'],asset.bytes);assert.equal(Buffer.concat(res.parts).equals(payload),true);}
    assert.equal(res.headers['cache-control'],'private, no-store');
  }
});
