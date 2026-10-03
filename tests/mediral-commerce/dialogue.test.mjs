import test from 'node:test';
import assert from 'node:assert/strict';
import {houseReducer as route} from '../../api/_lib/mediral-commerce/house.js';
import {reducer} from '../../api/_lib/mediral-commerce/domain.js';
import {fixture} from './fixture.mjs';

const event=text=>({type:'message',source:{type:'user'},message:{type:'text',text}});
const say=(state,text,order)=>route(state,event(text),order,{now:Date.parse('2026-10-01T10:00:00+07:00')});
const reply=result=>result.messages[0]?.text||'';

test('screenshot flow: serum inquiry then dullness selects BR, not a cart or generic menu',()=>{
 let result=say({},'เซรั่ม');
 assert.match(reply(result),/2 ขวด/);
 assert.deepEqual(result.state.items,{});
 result=say(result.state,'หน้าหมอง');
 assert.equal(result.state.house.topic,'mediral');
 assert.equal(result.state.productFocus,'BR');
 assert.match(reply(result),/แบร์เบอร์รี่.*ขวดเหลืองเขียว/);
 assert.match(reply(result),/ชะเอมเทศ.*อนุพันธ์วิตามินซี/);
 assert.doesNotMatch(reply(result),/ai-source|ทีมจะกลับมาตอบ|รักษาฝ้า|สิวหาย|รับประกัน/);
 assert.deepEqual(result.state.items,{});
 assert.equal(result.order,null);
 assert.equal(result.state.name,undefined);
 assert.deepEqual(result.state.house.subscriptions,{});
 assert.ok(reply(result).length<430);
});

test('common serum spelling variants reach the same clarification',()=>{
 for(const spelling of ['เซรั่ม','เซรั้ม','เซรัม','เซรม','เชรั่ม','Serum']){
  const result=say({},spelling);
  assert.equal(result.state.inquiry,'serum',spelling);
  assert.deepEqual(result.state.items,{},spelling);
 }
 const result=say({},'สนใจเซรั้มหน้าใสค่ะ');
 assert.equal(result.state.productFocus,'BR');
 assert.deepEqual(result.state.items,{});
});

test('product follow-up preserves context until explicit purchase; consent still gates PII',()=>{
 let result=say({},'หน้าหมอง');
 result=say(result.state,'ราคาเท่าไหร่');
 assert.match(reply(result),/เหลืองเขียว.*400/);
 assert.deepEqual(result.state.items,{});
 result=say(result.state,'ส่วนผสม');
 assert.match(reply(result),/mediral\/br\//);
 assert.deepEqual(result.state.items,{});
 result=say(result.state,'วิธีใช้');
 assert.match(reply(result),/หลังล้างหน้า/);
 assert.deepEqual(result.state.items,{});
 result=say(result.state,'ใช้หลังล้างหน้าไหม');
 assert.equal(result.state.productFocus,'BR');
 assert.match(reply(result),/mediral\/br\//);
 assert.deepEqual(result.state.items,{});
 result=say(result.state,'เอา 1 ขวด');
 assert.deepEqual(result.state.items,{BR:1});
 assert.equal(result.state.name,undefined);
 result=say(result.state,'ยืนยันสินค้า');
 assert.equal(result.state.stage,'consent');
 assert.match(reply(result),/ยินยอม/);
 assert.equal(result.state.name,undefined);
});

test('specific product names are inquiry; explicit product button adds requested item',()=>{
 let result=say({},'เซรั่มขวดขาว');
 assert.deepEqual(result.state.items,{});
 assert.equal(result.state.productFocus,'AC');
 const action=result.messages[0].quickReply.items[0].action.text;
 result=say(result.state,action);
 assert.deepEqual(result.state.items,{AC:1});
 assert.match(reply(result),/400.00/);
});

test('questions and mixed concerns do not silently add a product',()=>{
 let result=say({},'หน้าหมอง');
 for(const question of ['เอาตัวไหนดี','ซื้อที่ไหน','เอาขวดขาวดีไหม','ซื้อแล้วค่ะ']){
  result=say(result.state,question);
  assert.deepEqual(result.state.items,{},question);
 }
 result=say(result.state,'มีสิวด้วยแล้วก็หน้าหมอง');
 assert.equal(result.state.inquiry,'serum');
 assert.equal(result.state.productFocus,undefined);
 assert.deepEqual(result.state.items,{});
 assert.match(reply(result),/อยากเน้นดูแลเรื่องไหน/);
 result=say(result.state,'เอา 1 ขวด');
 assert.deepEqual(result.state.items,{});
});

test('unqualified serum purchase remains ambiguous even after a prior recommendation',()=>{
 let result=say({},'หน้าหมอง');
 result=say(result.state,'สั่งเซรั่ม 1 ขวด');
 assert.equal(result.state.inquiry,'serum');
 assert.deepEqual(result.state.items,{});
});

test('quantity limit is explicit; inquiry never resets an existing cart',()=>{
 let result=say({},'สั่งขวดเหลืองเขียว 2 ขวด');
 assert.deepEqual(result.state.items,{BR:2});
 result=say(result.state,'เซรั่มขวดขาว');
 assert.deepEqual(result.state.items,{BR:2});
 result=say(result.state,'สั่งเซรั่มขวดขาว 6 ขวด');
 assert.deepEqual(result.state.items,{BR:2});
 assert.match(reply(result),/สูงสุดชนิดละ 5/);
});

test('medical or reaction questions pause sales without treatment promises',()=>{
 for(const text of ['ใช้แล้วหน้าแสบมีผื่น','เซรั่มรักษาสิวได้ไหม','ใช้แทนยาได้ไหม','ตั้งครรภ์ใช้เซรั่มได้ไหม']){
  let result=say({},'เซรั่มขวดขาว');
  result=say(result.state,text);
  assert.equal(result.state.paused,true,text);
  assert.deepEqual(result.state.items,{},text);
  assert.doesNotMatch(reply(result),/399|สั่งขวด|รักษาหาย|แน่นอน/);
  assert.equal(say(result.state,'เอา 1 ขวด').messages.length,0);
 }
 const severe=say({},'ทาเซรั่มแล้วหน้าบวม หายใจไม่ออก');
 assert.match(reply(severe),/แพทย์ฉุกเฉิน/);
 assert.equal(severe.state.paused,true);
});

test('sensitive-skin questions and explicitly absent reactions do not pause the conversation',()=>{
 for(const text of ['ผิวแพ้ง่าย','แพ้ไหม','ผิวระคายเคืองง่าย','กลัวแพ้ค่ะ','ใช้แล้วไม่แพ้และไม่มีผื่นค่ะ']){
  let result=say({},'เซรั่มขวดขาว');
  result=say(result.state,text);
  assert.notEqual(result.state.paused,true,text);
  assert.deepEqual(result.state.items,{},text);
  assert.doesNotMatch(reply(result),/ส่งต่อให้คนดูแลแล้ว|แพทย์ฉุกเฉิน/);
 }
 let result=say({},'ผิวแพ้ง่าย ใช้แล้วมีผื่น');
 assert.equal(result.state.paused,true);
 result=say({stage:'name',items:{AC:1},consentAt:1,house:{topic:'mediral',interests:{},subscriptions:{}}},'ใช้แล้วมีผื่นและหน้าแสบ');
 assert.equal(result.state.paused,true);
 assert.equal(result.state.name,undefined);
});

test('explicit information questions during checkout are answered without recording them as PII',()=>{
 for(const stage of ['consent','name','phone','address','confirm']){
  const state={stage,items:{BR:1},productFocus:'BR',consentAt:1,house:{topic:'mediral',interests:{},subscriptions:{}}};
  let result=say(state,'ราคาเท่าไหร่ครับ');
  assert.equal(result.state.stage,stage);
  assert.equal(result.state.name,undefined);
  assert.equal(result.state.phone,undefined);
  assert.equal(result.state.address,undefined);
  assert.match(reply(result),/400.00/);
  result=say(result.state,'ส่วนผสม');
  assert.equal(result.state.stage,stage);
  assert.match(reply(result),/แบร์เบอร์รี่/);
  assert.deepEqual(result.state.items,{BR:1});
  assert.ok(result.messages[0].quickReply.items.every(item=>!/^สั่ง/.test(item.action.text)));
 }
});

test('menu says product names show information and offers explicit whole-set purchase',()=>{
 let result=say({},'คุยเรื่อง Mediral');
 assert.equal(result.messages[0].type,'flex');
 assert.equal(result.messages[0].contents.contents.length,7);
 assert.match(JSON.stringify(result.messages[0]),/สั่งชุด 5 ชิ้น/);
 result=say(result.state,'สั่งชุด 5 ชิ้น');
 assert.deepEqual(result.state.items,{CL:1,AC:1,BR:1,SU:1,PO:1});
 assert.match(reply(result),/2,000.00/);
});

test('product-like address content and pending payment retain their protected flows',()=>{
 const address='99 ร้านเซรั่มหน้าใส แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพ 10100';
 const initial={stage:'address',items:{BR:1},name:'ชื่อ ทดสอบ',phone:'0812345678',consentAt:1,house:{topic:'mediral',interests:{},subscriptions:{}}};
 const collected=say(initial,address);
 assert.equal(collected.state.stage,'confirm');
 assert.equal(collected.state.address,address);
 assert.equal(collected.state.productFocus,undefined);
 const order={id:'MD-TEST',status:'awaiting_quote',items:{BR:1}};
 const pending=say({stage:'ordered',orderId:order.id,house:initial.house},'หน้าหมอง',order);
 assert.deepEqual(pending.order,order);
 assert.match(reply(pending),/ยืนยันสินค้า ราคา และค่าส่ง/);
});

test('shared OA leaves unrelated AI inquiry alone and supports explicit topic selection',()=>{
 assert.equal(reducer({},event('เรียน AI')).messages.length,0);
 const both=say({},'สนใจเซรั่มและเรียน AI');
 assert.equal(both.state.stage,undefined);
 assert.match(reply(both),/เริ่มคุยเรื่องไหน/);
 const ai=say({},'เรียน AI');
 assert.equal(ai.state.house.topic,'ai');
 assert.match(reply(ai),/ai-source/);
});

test('signed webhook persists serum context across real handler turns and reaches consent',async()=>{
 const f=await fixture();f.env.MEDIRAL_SHARED_OA='1';
 await f.event('เซรั่ม');await f.event('หน้าหมอง');
 assert.match(f.sent.at(-1).messages[0].text,/แบร์เบอร์รี่/);
 await f.event('เอา 1 ขวด');await f.event('ยืนยันสินค้า');
 const claimed=await f.store.claim(f.user,f.now());
 assert.equal(claimed.state.stage,'consent');
 assert.deepEqual(claimed.state.items,{BR:1});
 assert.equal(claimed.state.name,undefined);
 assert.deepEqual(claimed.state.house.subscriptions,{});
 await f.store.release(claimed);
 assert.equal((await f.store.list()).orders.length,0);
});
