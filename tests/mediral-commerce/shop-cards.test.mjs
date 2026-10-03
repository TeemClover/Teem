import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {shopCarousel,CARD_PRODUCTS} from '../../api/_lib/mediral-commerce/shop-cards.js';
import {COUPON_END} from '../../api/_lib/mediral-commerce/catalog.js';
import {selectionFromSearch} from '../../mediral/checkout/selection.js';
import {fixture} from './fixture.mjs';
const walk=(node,fn)=>{if(!node||typeof node!=='object')return;fn(node);Object.values(node).forEach(v=>Array.isArray(v)?v.forEach(n=>walk(n,fn)):walk(v,fn));};
test('visual menu carries seven cards, safe images and item-specific checkout selections',()=>{
 const m=shopCarousel(COUPON_END-1);assert.equal(m.type,'flex');assert.equal(m.contents.contents.length,7);assert.ok(Buffer.byteLength(JSON.stringify(m.contents))<50000);assert.ok(m.altText.length<=400);
 const images=[],links=[];walk(m,n=>{if(n.type==='image')images.push(n.url);if(n.type==='uri')links.push(n.uri);if(n.type==='button')assert.ok(n.action.label.length<=40);});
 for(const image of images){const u=new URL(image);assert.equal(u.origin,'https://www.myclover.com');const file=new URL('../../'+u.pathname.slice(1),import.meta.url);assert.ok(existsSync(file));assert.ok(statSync(file).size<1024*1024);assert.match(image,/\.(jpg|png)$/);}
 for(const p of CARD_PRODUCTS){const link=links.find(l=>l.includes('pick='+p.sku));assert.deepEqual(selectionFromSearch(new URL(link).search),{[p.sku]:1});}
 assert.match(JSON.stringify(m),/2,000 บาท/);assert.match(JSON.stringify(m),/500 บาท/);assert.doesNotMatch(JSON.stringify(m),/399|1,899|หายขาด|รับประกัน|รอยืนยันค่าส่ง/);
});
test('expired LINE promotion cannot leave discounted prices or date in cards',()=>{
 const expired=JSON.stringify(shopCarousel(COUPON_END));assert.match(expired,/2,500 บาท/);assert.doesNotMatch(expired,/400 บาท|2,000 บาท|ลด 500 บาท|15 ต.ค.|−20%/);
});
test('checkout selection ignores invalid input and never carries price or customer data',()=>{
 for(const q of ['?pick=INVALID','?pick=AC&price=1','?pick=__proto__','?pick=AC:99']){const r=selectionFromSearch(q);assert.deepEqual(r,q.includes('pick=AC&')?{AC:1}:{});}
 assert.deepEqual(selectionFromSearch('?pick=set'),{CL:1,AC:1,BR:1,SU:1,PO:1});
});
test('explicit browsing uses one Flex reply even with GPT enabled, no order and no AI bill',async()=>{
 const f=await fixture({ai:{status:()=>({enabled:true}),respond:async()=>{throw Error('MUST_NOT_CALL_AI');}}});
 assert.equal((await f.event('คุยเรื่อง Mediral')).code,200);assert.equal(f.sent.length,1);assert.equal(f.sent[0].messages.length,1);assert.equal(f.sent[0].messages[0].type,'flex');assert.equal((await f.store.list()).orders.length,0);
});
test('preview and validation require admin; validation does not send or create orders',async()=>{
 const f=await fixture();let checks=0;f.providers.validateMessages=async messages=>{checks++;assert.equal(messages[0].type,'flex');return {valid:true};};
 assert.equal((await f.call('cards-preview')).code,401);assert.equal((await f.call('cards-validate',{method:'POST',body:{}})).code,401);
 await f.login();assert.equal((await f.call('cards-preview')).body.messages[0].type,'flex');assert.equal((await f.call('cards-validate',{method:'POST',body:{}})).body.valid,true);assert.equal(checks,1);assert.equal(f.sent.length,0);assert.equal((await f.store.list()).orders.length,0);
 assert.equal((await f.call('cards-validate',{method:'POST',body:{to:'someone'}})).code,400);
});
test('answer includes product image once when focus changes, without repeatedly attaching cards',async()=>{
 const f=await fixture();await f.event('เซรั่มขวดขาว');assert.equal(f.sent.at(-1).messages.length,2);assert.equal(f.sent.at(-1).messages[1].type,'flex');await f.event('ส่วนผสม');assert.equal(f.sent.at(-1).messages.length,1);
});
