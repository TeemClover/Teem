import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const engine=await readFile(new URL('./offer-engine.js',import.meta.url),'utf8');
const source=await readFile(new URL('./sales-page.js',import.meta.url),'utf8');
const config=JSON.parse(html.match(/<script type="application\/json" id="offer-config">([\s\S]*?)<\/script>/)[1]);
const NOW=Date.parse('2026-09-16T03:00:00Z');
const CART='12345678-1234-4123-8123-123456789abc';
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};};
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
const store=()=>{const data=new Map();return{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
class Element {
  constructor(tag,attributes){this.tagName=tag;this.hidden=/\shidden(?:\s|$)/.test(attributes);this.listeners={};this.parentElement={hidden:false};this.value='';this.textContent='';this.files=[];this.paused=true;this.disabled=false;this.checked=false;this.scrolls=0;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async fire(type){for(const fn of this.listeners[type]||[])await fn({preventDefault(){},target:this});}
  removeAttribute(name){delete this[name];}
  scrollIntoView(){this.scrolls++;}
  contains(){return false;}
  close(){this.open=false;}
}
async function boot({checkoutId=null,post,restore,receipt,offerStatus=200}={}) {
  const ids=new Map([...html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)].map(m=>[m[3],new Element(m[1],m[2])]));
  ids.get('offer-config').textContent=JSON.stringify(config);
  const calls=[],events={},timers=new Map();let nextTimer=0;
  const state={email:'learner@example.test',checkoutId,blocked:false,offerStatus};
  const cart=()=>({id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'open'});
  const fetch=async(url,options={})=>{
    calls.push({url,options});
    if(url==='/api/ai-source?action=offer')return response({ok:true,ready:true,school:{user:state.email?{email:state.email,displayName:'ผู้เรียน'}:null,checkoutId:state.checkoutId,blocked:state.blocked},offer:{promoActive:true,timeZone:'Asia/Bangkok',priceTHB:990,promoPriceTHB:990,regularPriceTHB:1690,firstSeenAt:new Date(NOW).toISOString(),expiresAt:new Date(NOW+172800000).toISOString(),serverNow:new Date(NOW).toISOString()}},state.offerStatus);
    if(url.startsWith('/api/ai-source?action=checkout&'))return restore?restore(options):response({ok:true,checkout:cart()});
    if(url==='/api/ai-source?action=checkout'&&options.method==='POST')return post?post(options):response({ok:true,checkout:cart()});
    if(url==='/api/ai-source'&&options.method==='POST'&&receipt)return receipt(options);
    throw Error('Unexpected endpoint '+url);
  };
  const location={protocol:'https:',origin:'https://www.myclover.com',search:'',hash:'',assign(url){this.assigned=url;}};
  const document={hidden:false,activeElement:null,documentElement:{dataset:{}},body:{classList:{add(){},remove(){}}},getElementById:id=>ids.get(id),addEventListener:(t,fn)=>{(events['document:'+t]??=[]).push(fn);}};
  const sessionStorage=store();
  const window={document,fetch,location,localStorage:store(),sessionStorage,performance:{now:()=>0},AbortController,crypto:webcrypto,TextEncoder,
    URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,dGVzdA==';this.onload();}},
    setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,
    addEventListener:(t,fn)=>{(events[t]??=[]).push(fn);}};
  const context=vm.createContext({window,document,location,fetch,sessionStorage,URL,URLSearchParams,Intl,Date,AbortController});
  vm.runInContext(engine,context);vm.runInContext(source,context);await settle();
  return{ids,state,calls,cart,location,fill:async()=>{ids.get('customer-name').value='ผู้เรียน';ids.get('customer-contact').value='line-learner';ids.get('paid-amount').value='990';ids.get('transferred-at').value='2026-09-16T10:00';ids.get('registration-consent').checked=true;ids.get('receipt-file').files=[{name:'receipt.png',type:'image/png',size:100}];await ids.get('receipt-file').fire('change');},submit:()=>ids.get('receipt-form').fire('submit'),click:()=>ids.get('purchase-button').fire('click'),focus:async()=>{for(const fn of events.focus||[])await fn();await settle();},timeout:async()=>{const selected=[...timers].filter(([,t])=>t.delay===20000);assert.ok(selected.length,'checkout timeout is scheduled');for(const[id,t]of selected){timers.delete(id);t.fn();}await settle();}};
}

test('checkout becomes usable without a page reload and exposes the QR only for its own open cart',async()=>{
  const ui=await boot();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('payment-qr').hidden,true);
  await ui.click();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('bank-details').hidden,false);assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('upload-button').disabled,false);
  assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);
});
test('a hanging checkout request stops waiting, remains retryable and does not automatically send another POST',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>waiting.promise});const click=ui.click();await settle();assert.equal(ui.ids.get('purchase-button').disabled,true);assert.equal(ui.ids.get('checkout-loading').hidden,false);
  await ui.timeout();await click;assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('checkout-loading').hidden,true);assert.match(ui.ids.get('purchase-status').textContent,/กดลองอีกครั้ง/);assert.match(ui.ids.get('purchase-status').textContent,/อย่าโอนซ้ำ/);assert.equal(ui.ids.get('payment-qr').hidden,true);
  assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);assert.equal(ui.calls.find(c=>c.options.method==='POST').options.signal.aborted,true);
  ui.state.checkoutId=CART;await ui.click();assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1,'explicit retry restores the server cart before considering a new POST');
  waiting.resolve(response({ok:true,checkout:{...ui.cart(),priceTHB:1690}}));await settle();assert.match(ui.ids.get('bank-amount').textContent,/990/,'late original reply cannot replace the restored cart');
});
test('timeout also covers a response body that never resolves',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>({ok:true,status:200,json:()=>waiting.promise})});const click=ui.click();await settle();await ui.timeout();await click;
  assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);
});
test('hanging initial restoration unblocks the retry button without opening a new checkout',async()=>{
  let fail=true;const ui=await boot({checkoutId:CART,restore:()=>fail?new Promise(()=>{}):response({ok:true,checkout:{id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'open'}})});
  assert.equal(ui.ids.get('purchase-button').disabled,true);await ui.timeout();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.match(ui.ids.get('purchase-status').textContent,/รายการชำระเดิม/);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
  fail=false;await ui.click();assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
});
test('account changes invalidate a pending checkout and never reveal the former account payment details',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>waiting.promise});const click=ui.click();await settle();ui.state.email='other@example.test';await ui.focus();
  waiting.resolve(response({ok:true,checkout:ui.cart()}));await click;assert.equal(ui.ids.get('bank-details').hidden,true);assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('customer-email').value,'other@example.test');
});
test('an expired or submitted restored cart never shows a payable QR',async()=>{
  for(const patch of [{expiresAt:new Date(NOW-1000).toISOString()},{status:'submitted',reference:'SAUCE-'+'A'.repeat(32)}]){
    const ui=await boot({checkoutId:CART,restore:()=>response({ok:true,checkout:{id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'open',...patch}})});
    assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.ids.get('copy-payment').disabled,true);
  }
});

test('offer connectivity failure exposes a working reconnect action and never silently starts payment',async()=>{
  const ui=await boot({offerStatus:503});assert.equal(ui.ids.get('purchase-button').disabled,true);assert.equal(ui.ids.get('retry-offer').hidden,false);assert.equal(ui.ids.get('retry-offer').disabled,false);
  ui.state.offerStatus=200;await ui.ids.get('retry-offer').fire('click');assert.equal(ui.ids.get('retry-offer').hidden,true);assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);assert.equal(ui.ids.get('payment-qr').hidden,true);
});
test('a guest purchase goes to account enrollment without creating an unowned checkout',async()=>{
  const ui=await boot();ui.state.email=null;await ui.focus();await ui.click();assert.match(ui.location.assigned,/^\/learn\/\?enroll=ai-sauce&return=/);assert.match(decodeURIComponent(ui.location.assigned),/\/ai-source\/#bank-details/);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
});

test('a transient offer failure during receipt upload preserves the submitted cart and accepts its confirmed result',async()=>{
  const waiting=deferred(),started=deferred(),ui=await boot({checkoutId:CART,receipt:()=>{started.resolve();return waiting.promise;}});await ui.fill();const submission=ui.submit();await Promise.race([started.promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('receipt did not start: '+ui.ids.get('upload-status').textContent)),1000))]);
  assert.equal(ui.calls.filter(c=>c.url==='/api/ai-source').length,1,ui.ids.get('upload-status').textContent);ui.state.offerStatus=503;await ui.focus();assert.equal(ui.ids.get('bank-details').hidden,true);
  waiting.resolve(response({ok:true,status:'pending_verification',reference:'SAUCE-'+'A'.repeat(32),admissionDueAt:new Date(NOW+3600000).toISOString()},201));await submission;
  assert.match(ui.ids.get('upload-status').textContent,/รับลงทะเบียนแล้ว/);assert.doesNotMatch(ui.ids.get('upload-status').textContent,/ยังยืนยันการรับข้อมูลไม่ได้/);assert.equal(ui.ids.get('upload-button').disabled,true);
  ui.state.offerStatus=200;await ui.focus();assert.equal(ui.ids.get('bank-details').hidden,false);assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.ids.get('upload-button').disabled,true);assert.equal(ui.calls.filter(c=>c.url==='/api/ai-source').length,1);
});
