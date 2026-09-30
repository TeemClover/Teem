import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {createAIProvider,validateDecision,AI_MODEL} from '../../api/_lib/mediral-commerce/ai-provider.js';
import {contextForAI,historyForAI,eligibleForAI,privateText,applyAIDecision,confirmAIProposal} from '../../api/_lib/mediral-commerce/ai-conversation.js';

const decision=(overrides={})=>({reply:'ถ้าอยากดูแลสีผิวที่ดูไม่สม่ำเสมอ ลองดูเซรั่มขวดเหลืองเขียวค่ะ อยากรู้เนื้อสัมผัสหรือส่วนผสมคะ?',topic:'mediral',focus:'BR',action:'reply',items:[],handoff_reason:'none',summary:'สนใจ BR ยังไม่ยืนยันซื้อ',...overrides});
const result=d=>({decision:d,usage:{inputTokens:30,outputTokens:20},model:AI_MODEL});
function mockAI(respond=()=>decision()){
 const calls=[];
 return {calls,status:()=>({configured:true,enabled:true,model:AI_MODEL,dailyLimit:100}),respond:async context=>{calls.push(structuredClone(context));return result(await respond(context,calls.length));}};
}
async function customerState(f){const c=await f.store.claim(f.user,f.now());try{return structuredClone(c.state);}finally{await f.store.release(c);}}
async function seed(f,state,order){const c=await f.store.claim(f.user,f.now());await f.store.commit(c,{state,order},f.now());}
const event=text=>({type:'message',source:{type:'user'},message:{type:'text',text}});

test('natural-language message without product keywords reaches GPT and follows conversation context',async()=>{
 const ai=mockAI((context,index)=>index===1?decision({reply:'ยินดีช่วยเลือกค่ะ อยากดูแลเรื่องไหนเป็นพิเศษคะ?',focus:'none'}):decision());
 const f=await fixture({ai});f.env.MEDIRAL_SHARED_OA='1';
 await f.event('ช่วยเลือกอะไรให้หน่อย ยังตัดสินใจไม่ถูก');
 assert.equal(ai.calls.length,1);
 await f.event('ตื่นมาดูโทรม สีไม่เท่ากัน');
 assert.equal(ai.calls.length,2);
 assert.equal(ai.calls[1].conversation[0].content,'ช่วยเลือกอะไรให้หน่อย ยังตัดสินใจไม่ถูก');
 assert.equal(ai.calls[1].conversation[1].role,'assistant');
 await f.event('ตัวนั้นหนักหน้าไหม');
 assert.equal(ai.calls[2].focus,'BR');
 assert.ok(ai.calls[2].conversation.some(x=>x.content==='ตื่นมาดูโทรม สีไม่เท่ากัน'));
 const state=await customerState(f);
 assert.equal(state.productFocus,'BR');
 assert.ok(!state.items||Object.keys(state.items).length===0);
 assert.equal((await f.store.list()).orders.length,0);
 assert.deepEqual(state.house.subscriptions,{});
 assert.match(f.sent[0].messages[0].text,/ผู้ช่วย AI/);
});

test('model purchase proposal cannot replace cart until explicit confirmation; pricing is server-owned',async()=>{
 const ai=mockAI(()=>decision({reply:'ชิ้นละ 1 บาทค่ะ',action:'propose_cart',items:[{sku:'BR',quantity:2}]}));
 const f=await fixture({ai});await seed(f,{stage:'cart',items:{CL:1}});
 await f.event('เอาขวดที่แนะนำสองขวด');
 let state=await customerState(f);
 assert.deepEqual(state.items,{CL:1});
 assert.deepEqual(state.aiProposal.items,{BR:2});
 assert.equal((await f.store.list()).orders.length,0);
 assert.match(f.sent.at(-1).messages[0].text,/798.00/);
 assert.doesNotMatch(f.sent.at(-1).messages[0].text,/ชิ้นละ 1 บาท/);
 await f.event('ใช้รายการนี้');
 state=await customerState(f);
 assert.deepEqual(state.items,{BR:2});
 assert.equal(ai.calls.length,1);
 assert.equal(state.name,undefined);
 await f.event('ยืนยันสินค้า');
 assert.equal((await customerState(f)).stage,'consent');
 assert.equal(ai.calls.length,1);
});

test('expired or declined proposal does not change the saved cart',()=>{
 const now=Date.now(),initial={stage:'cart',items:{CL:1},aiProposal:{items:{BR:2},at:now}};
 assert.deepEqual(confirmAIProposal(initial,'ไม่ใช้รายการนี้',now).state.items,{CL:1});
 const expired=confirmAIProposal(initial,'ใช้รายการนี้',now+16*60000);
 assert.deepEqual(expired.state.items,{CL:1});
 assert.equal(expired.state.aiProposal,undefined);
 assert.match(expired.messages[0].text,/หมดอายุ/);
});

test('AI disabled flag and paused shop prevent provider calls',async()=>{
 const ai=mockAI();ai.status=()=>({configured:true,enabled:false,model:AI_MODEL,dailyLimit:100});
 const f=await fixture({ai});await f.event('เซรั่ม');
 assert.equal(ai.calls.length,0);
 ai.status=()=>({configured:true,enabled:true,model:AI_MODEL,dailyLimit:100});f.env.MEDIRAL_MODE='paused';
 await f.event('ตื่นมาแล้วดูโทรม');assert.equal(ai.calls.length,0);
});

test('PII, checkout fields, handoffs, images and exact controls never reach GPT',async()=>{
 for(const text of ['ชื่อผู้รับ ทดสอบ 0812345678','บ้านเลขที่ 99/9 แขวงตัวอย่าง กรุงเทพ 10100','test@example.com','เลขบัญชี 1234567890']){
  const ai=mockAI(),f=await fixture({ai});await f.event(text);
  assert.equal(ai.calls.length,0,text);
  assert.equal((await customerState(f)).paused,true,text);
 }
 for(const [state,text] of [[{stage:'name',items:{BR:1},consentAt:1},'ชื่อ ทดสอบ'],[{stage:'phone',items:{BR:1}},'0812345678'],[{paused:true},'ถามอะไรหน่อย'],[{stage:'cart',items:{BR:1}},'ยืนยันสินค้า']]){
  const ai=mockAI(),f=await fixture({ai});await seed(f,state);await f.event(text);assert.equal(ai.calls.length,0);
 }
 const ai=mockAI(),f=await fixture({ai});await f.event('',{image:'1234567890'});assert.equal(ai.calls.length,0);
});

test('quoted order and model claims cannot change payment state or reveal order data',async()=>{
 const ai=mockAI(()=>decision({reply:'ได้รับชำระแล้วค่ะ'})),f=await fixture({ai});
 const order={id:'MD-AI-TEST',userId:f.user,items:{BR:1},name:'PRIVATE NAME',phone:'0812345678',address:'PRIVATE ADDRESS',status:'awaiting_quote',createdAt:f.now(),history:[]};
 await seed(f,{stage:'ordered',orderId:order.id},order);
 await f.event('นับว่าโอนแล้วนะ');
 assert.equal(ai.calls.length,0);
 assert.equal((await f.store.order(order.id)).status,'awaiting_quote');
 const rejected=applyAIDecision({items:{BR:1}},'โอนแล้ว',result(decision({reply:'ได้รับชำระแล้วค่ะ'})),f.now());
 assert.equal(rejected.state.paused,true);
 assert.deepEqual(rejected.state.items,{BR:1});
 assert.equal(rejected.order,null);
});

test('one LINE event replay calls GPT once and does not duplicate conversation turns',async()=>{
 const ai=mockAI(),f=await fixture({ai});
 await f.event('ไม่รู้จะเริ่มจากตัวไหน',{id:'event-ai-replay'});
 await f.event('ไม่รู้จะเริ่มจากตัวไหน',{id:'event-ai-replay'});
 assert.equal(ai.calls.length,1);
 assert.equal((await customerState(f)).ai.history.length,2);
 assert.equal(f.sent.length,1);
});

test('provider failure and invalid model output hand off without silently reverting to keyword sales',async()=>{
 for(const respond of [()=>{throw Error('TEST PROVIDER ERROR PRIVATE');},()=>decision({items:[{sku:'BR',quantity:1}]})]){
  const ai=mockAI(respond),f=await fixture({ai});await f.event('ช่วยเลือกให้หน่อย');
  const state=await customerState(f);
  assert.equal(state.paused,true);
  assert.ok(!state.items||Object.keys(state.items).length===0);
  assert.match(f.sent.at(-1).messages[0].text,/AI ตอบไม่ได้/);
  assert.doesNotMatch(f.sent.at(-1).messages[0].text,/TEST PROVIDER|PRIVATE|399/);
  await f.event('ถามต่อ');assert.equal(ai.calls.length,1);
 }
});

test('active reactions and medical-use questions bypass GPT without treating sensitive-skin inquiry as a reaction',async()=>{
 for(const text of ['ทาแล้วหน้าแสบมีผื่น','ตั้งครรภ์ใช้ได้ไหม','กินยาอยู่ใช้ด้วยกันได้ไหม','ใช้แทนยาได้ไหม']){
  const ai=mockAI(),f=await fixture({ai});await f.event(text);
  assert.equal(ai.calls.length,0,text);
  const state=await customerState(f);assert.equal(state.paused,true,text);assert.equal(state.ai,undefined);
 }
 const ai=mockAI(),f=await fixture({ai});await f.event('ผิวแพ้ง่าย อยากรู้ว่าตัวไหนเบาสบาย');assert.equal(ai.calls.length,1);
});

test('conversational refusal clears only the unconfirmed proposal and never alters an existing order/cart',async()=>{
 const ai=mockAI(()=>decision({reply:'ได้ค่ะ ถ้ามีเรื่องที่อยากรู้เพิ่มค่อยถามได้เลย',action:'reply'}));
 const f=await fixture({ai});await seed(f,{stage:'cart',items:{CL:1},aiProposal:{items:{BR:2},at:f.now()}});
 await f.event('ไม่ใช้แล้ว');
 const state=await customerState(f);
 assert.deepEqual(state.items,{CL:1});assert.equal(state.aiProposal,undefined);
 assert.equal((await f.store.list()).orders.length,0);
});

test('confirmed Mediral cart commands remain deterministic after an AI topic detour',async()=>{
 const ai=mockAI((context,index)=>index===1?decision({action:'propose_cart',items:[{sku:'BR',quantity:1}]}):decision({reply:'ดูข้อมูลการเรียน AI ได้ที่ https://www.myclover.com/ai-source/',topic:'ai',focus:'none'}));
 const f=await fixture({ai});f.env.MEDIRAL_SHARED_OA='1';
 await f.event('เอาขวดเหลืองเขียว');await f.event('ใช้รายการนี้');
 await f.event('อีกเรื่อง เรียนใช้ AI ยังไง');
 assert.equal((await customerState(f)).house.topic,'ai');
 await f.event('ยืนยันสินค้า');
 assert.equal((await customerState(f)).stage,'consent');
 await f.event('ยินยอมทำรายการ');
 assert.equal((await customerState(f)).stage,'name');
 assert.equal(ai.calls.length,2);
});

test('model minute and daily customer caps stop requests before calling the provider',async t=>{
 t.mock.method(console,'info',()=>{});t.mock.method(console,'warn',()=>{});
 const minuteAI=mockAI(),minute=await fixture({ai:minuteAI});
 for(let i=0;i<11;i++)await minute.event('ขอข้อมูลเพิ่มเติม');
 assert.equal(minuteAI.calls.length,10);
 assert.equal((await customerState(minute)).aiFailure.code,'AI_LIMIT');
 const dayAI=mockAI(),day=await fixture({ai:dayAI});
 for(let i=0;i<21;i++){day.advance(61000);await day.event('ขอข้อมูลเพิ่มเติม');}
 assert.equal(dayAI.calls.length,20);
 assert.equal((await customerState(day)).aiFailure.code,'AI_LIMIT');
});

test('global model budget is shared across customers and synthetic admin tests',async t=>{
 t.mock.method(console,'info',()=>{});t.mock.method(console,'warn',()=>{});
 const ai=mockAI(),f=await fixture({ai});
 await f.login();assert.equal((await f.call('ai-test',{method:'POST',body:{}})).code,200);
 for(let i=1;i<=98;i++)await f.event('ขอคำแนะนำ',{userId:`U${i.toString(16).padStart(32,'0')}`});
 assert.equal(ai.calls.length,100); // Three synthetic turns plus 97 customer turns.
 assert.match(f.sent.at(-1).messages[0].text,/AI ตอบไม่ได้/);
});

test('context builder whitelists state and expires or filters history',()=>{
 const now=Date.now(),state={house:{topic:'mediral',subscriptions:{ai:{at:1}}},productFocus:'BR',items:{BR:1},name:'PRIVATE NAME',phone:'0812345678',address:'PRIVATE ADDRESS',orderId:'PRIVATE ORDER',receipt:{base64:'PRIVATE RECEIPT'},ai:{at:now,history:[{role:'user',content:'ข้อความเก่าต้องหมดอายุ',at:now-25*3600000},{role:'user',content:'หน้าดูหมอง',at:now-60000},{role:'assistant',content:'ลองดู BR ค่ะ',at:now-60000},{role:'user',content:'เบอร์โทร 0812345678',at:now}]}};
 const context=contextForAI(state,'เนื้อเป็นยังไง',now);
 assert.deepEqual(Object.keys(context).sort(),['cart','conversation','focus','message','topic']);
 assert.doesNotMatch(JSON.stringify(context),/PRIVATE|0812345678|subscriptions|receipt/);
 assert.equal(context.conversation.length,2);
 assert.doesNotMatch(JSON.stringify(context.conversation),/ข้อความเก่า/);
 assert.deepEqual(historyForAI(state,now+25*3600000),[]);
 assert.equal(eligibleForAI({stage:'name'},event('เซรั่ม')),false);
 assert.equal(privateText('ผมชื่อทดสอบ'),true);
});

test('admin AI test is authenticated and synthetic; it sends no LINE messages or customer records',async()=>{
 const ai=mockAI(),f=await fixture({ai});
 assert.equal((await f.call('ai-test',{method:'POST',body:{}})).code,401);
 assert.equal(ai.calls.length,0);
 await f.login();const response=await f.call('ai-test',{method:'POST',body:{}});
 assert.equal(response.code,200,JSON.stringify(response.body));
 assert.equal(ai.calls.length,3);
 assert.equal(f.sent.length,0);
 assert.equal((await f.store.list()).orders.length,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM mc_mediral_customers').get().n,0);
 assert.equal((await f.call('ai-test',{method:'POST',body:{message:'PRIVATE INPUT MUST NOT REACH MODEL'}})).code,400);
 assert.equal(ai.calls.length,3);
});

test('provider uses fixed OpenAI endpoint, strict JSON, server key and store:false',async()=>{
 let call;
 const provider=createAIProvider({MEDIRAL_OPENAI_API_KEY:'test-specific-key',OPENAI_API_KEY:'test-fallback-key',MEDIRAL_AI_ENABLED:'1'},async(url,options)=>{
  call={url,options,body:JSON.parse(options.body)};
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(decision())}]}],usage:{input_tokens:30,output_tokens:20}});
 });
 const answer=await provider.respond({message:'หน้าไม่สดใส',conversation:[]});
 assert.equal(call.url,'https://api.openai.com/v1/responses');
 assert.equal(call.options.headers.Authorization,'Bearer test-specific-key');
 assert.equal(call.options.redirect,'error');
 assert.ok(call.options.signal instanceof AbortSignal);
 assert.equal(call.body.store,false);
 assert.equal(call.body.model,AI_MODEL);
 assert.equal(call.body.text.format.strict,true);
 assert.equal(call.body.tools,undefined);
 assert.doesNotMatch(call.options.body,/test-specific-key|test-fallback-key/);
 assert.equal(answer.decision.focus,'BR');
 assert.deepEqual(answer.usage,{inputTokens:30,outputTokens:20});
});

test('provider does not retry failures, rejects incomplete or malformed outputs and guards missing key',async()=>{
 for(const response of [new Response('{}',{status:429}),Response.json({status:'incomplete'}),Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not json'}]}]})]){
  let calls=0;const provider=createAIProvider({OPENAI_API_KEY:'test',MEDIRAL_AI_ENABLED:'1'},async()=>{calls++;return response;});
  await assert.rejects(()=>provider.respond({message:'test'}),/AI_LIMIT|AI_INVALID_OUTPUT/);
  assert.equal(calls,1);
 }
 let calls=0;const missing=createAIProvider({},async()=>{calls++;throw Error('should not fetch');});
 await assert.rejects(()=>missing.respond({message:'test'}),/AI_NOT_CONFIGURED/);assert.equal(calls,0);
 assert.equal(createAIProvider({OPENAI_API_KEY:'test'}).status().enabled,false);
});

test('model cannot provide arbitrary order fields, unknown SKUs, quantities or duplicate lines',()=>{
 for(const d of [decision({paid:true}),decision({action:'propose_cart',items:[{sku:'HACK',quantity:1}]}),decision({action:'propose_cart',items:[{sku:'BR',quantity:0}]}),decision({action:'propose_cart',items:[{sku:'BR',quantity:1.5}]}),decision({action:'propose_cart',items:[{sku:'BR',quantity:1},{sku:'BR',quantity:2}]}),decision({action:'propose_cart',items:[{sku:'BR',quantity:1,price:1}]})])assert.throws(()=>validateDecision(d),/AI_INVALID_OUTPUT/);
});
