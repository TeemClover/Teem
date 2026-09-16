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
async function boot({checkoutId=null,post,restore,receipt,offerStatus=200,offerGate,offerConfig={},omitIds=[],displayName='ผู้เรียน'}={}) {
  const ids=new Map([...html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)].map(m=>[m[3],new Element(m[1],m[2])]));
  for(const id of omitIds)ids.delete(id);
  ids.get('offer-config').textContent=JSON.stringify({...config,...offerConfig});
  const calls=[],events={},timers=new Map();let nextTimer=0;
  const state={email:'learner@example.test',checkoutId,blocked:false,offerStatus,elapsed:0,recovery:null,cartPrice:990};
  const cart=()=>({id:CART,priceTHB:state.cartPrice,expiresAt:new Date(NOW+172800000).toISOString(),status:'open'});
  const fetch=async(url,options={})=>{
    calls.push({url,options});
    if(url==='/api/ai-source?action=payment')return response({ok:true,payment:{token:'signed-test-quote',quote:{price:990,issuedAt:NOW,expiresAt:NOW+172800000}},offer:{promoActive:true,timeZone:'Asia/Bangkok',priceTHB:990,promoPriceTHB:990,regularPriceTHB:1690,firstSeenAt:new Date(NOW).toISOString(),expiresAt:new Date(NOW+172800000).toISOString(),serverNow:new Date(NOW+state.elapsed).toISOString()}});

    if(url==='/api/ai-source?action=offer'){if(offerGate)await offerGate;return response({ok:true,ready:true,school:{user:state.email?{email:state.email,displayName}:null,checkoutId:state.checkoutId,blocked:state.blocked,recovery:state.recovery},offer:{promoActive:state.elapsed<172800000,timeZone:'Asia/Bangkok',priceTHB:state.elapsed<172800000?990:1690,promoPriceTHB:990,regularPriceTHB:1690,firstSeenAt:new Date(NOW).toISOString(),expiresAt:new Date(NOW+172800000).toISOString(),serverNow:new Date(NOW+state.elapsed).toISOString()}},state.offerStatus);}
    if(url.startsWith('/api/ai-source?action=checkout&'))return restore?restore(options):response({ok:true,checkout:cart()});
    if(url==='/api/ai-source?action=checkout'&&options.method==='POST')return post?post(options):response({ok:true,checkout:cart()});
    if(url==='/api/ai-source'&&options.method==='POST'&&receipt)return receipt(options);
    throw Error('Unexpected endpoint '+url);
  };
  const location={protocol:'https:',origin:'https://www.myclover.com',search:'',hash:'',assign(url){this.assigned=url;}};
  const document={hidden:false,activeElement:null,documentElement:{dataset:{}},body:{classList:{add(){},remove(){}}},getElementById:id=>ids.get(id),addEventListener:(t,fn)=>{(events['document:'+t]??=[]).push(fn);}};
  const sessionStorage=store();
  const window={document,fetch,location,localStorage:store(),sessionStorage,performance:{now:()=>state.elapsed},AbortController,crypto:webcrypto,TextEncoder,
    URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,dGVzdA==';this.onload();}},
    setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,
    addEventListener:(t,fn)=>{(events[t]??=[]).push(fn);}};
  const context=vm.createContext({window,document,location,fetch,sessionStorage,URL,URLSearchParams,Intl,Date,AbortController});
  vm.runInContext(engine,context);vm.runInContext(source,context);await settle();
  return{ids,state,calls,cart,location,fill:async()=>{ids.get('customer-name').value='ผู้เรียน';ids.get('customer-contact').value='line-learner';ids.get('paid-amount').value='990';ids.get('transferred-at').value='2026-09-16T10:00';ids.get('registration-consent').checked=true;ids.get('receipt-file').files=[{name:'receipt.png',type:'image/png',size:100}];await ids.get('receipt-file').fire('change');},submit:()=>ids.get('receipt-form').fire('submit'),qrClick:()=>ids.get('purchase-button').fire('click'),click:()=>ids.get('finish-payment').fire('click'),focus:async()=>{for(const fn of events.focus||[])await fn();await settle();},timeout:async()=>{const selected=[...timers].filter(([,t])=>t.delay===20000);assert.ok(selected.length,'checkout timeout is scheduled');for(const[id,t]of selected){timers.delete(id);t.fn();}await settle();}};
}

test('QR is available before an account checkout; the receipt form still requires an owned cart',async()=>{
  const ui=await boot();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('receipt-form').hidden,true);
  await ui.click();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('bank-details').hidden,false);assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('upload-button').disabled,false);
  assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);
});
test('payer name starts empty even when the account display name contains an email or a real name',async()=>{
  for(const displayName of ['learner@example.test','ชื่อเจ้าของบัญชี']){
    const ui=await boot({displayName});await ui.click();
    assert.equal(ui.ids.get('customer-name').value,'');
    assert.equal(ui.ids.get('customer-email').value,'learner@example.test');
    assert.equal(ui.ids.get('customer-email').readOnly,true);
  }
});
test('a name entered by the payer survives offer refresh, a transient failure and a checkout timeout',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>waiting.promise});
  ui.ids.get('customer-name').value='ชื่อผู้โอนที่กรอกเอง';await ui.focus();
  assert.equal(ui.ids.get('customer-name').value,'ชื่อผู้โอนที่กรอกเอง');
  ui.state.offerStatus=503;await ui.focus();assert.equal(ui.ids.get('customer-name').value,'ชื่อผู้โอนที่กรอกเอง');
  ui.state.offerStatus=200;await ui.focus();const click=ui.click();await settle();await ui.timeout();await click;
  assert.equal(ui.ids.get('customer-name').value,'ชื่อผู้โอนที่กรอกเอง');
});
test('a confirmed account change or logout clears the payer name even after an offer failure',async()=>{
  for(const nextEmail of ['other@example.test',null]){
    const ui=await boot();ui.ids.get('customer-name').value='ชื่อผู้โอนบัญชีก่อน';
    ui.state.offerStatus=503;await ui.focus();ui.state.email=nextEmail;ui.state.offerStatus=200;await ui.focus();
    assert.equal(ui.ids.get('customer-name').value,'');assert.equal(ui.ids.get('customer-email').value,nextEmail||'');
    ui.state.email='learner@example.test';await ui.focus();assert.equal(ui.ids.get('customer-name').value,'','switching back never restores the old payer name');
  }
});
test('receipt registration requires the name the payer enters and never substitutes the account name',async()=>{
  const ui=await boot({checkoutId:CART});await ui.fill();ui.ids.get('customer-name').value='';await ui.submit();
  assert.equal(ui.ids.get('upload-status').textContent,'กรอกชื่อผู้ชำระ');assert.equal(ui.calls.filter(c=>c.url==='/api/ai-source').length,0);
});
test('launch and full packages include both bonus files while recovery excludes them in the offer and checkout',async()=>{
  const ui=await boot({checkoutId:CART});
  const offerBonus=ui.ids.get('offer-bonus-summary').textContent;
  assert.match(offerBonus,/วิดีโอ/);assert.match(offerBonus,/แบบฝึกบนเว็บ/);assert.match(offerBonus,/E-book/);assert.match(offerBonus,/\.md/);assert.doesNotMatch(offerBonus,/฿|ไม่รวม/);
  assert.equal(ui.ids.get('checkout-bonus-summary').textContent,'รายการนี้รวมคู่มือ PDF และผู้ช่วยงาน .md');
  assert.equal(ui.ids.get('upload-button').textContent,'ส่งหลักฐานการชำระเงิน');
  ui.state.elapsed=172800001;ui.state.cartPrice=1690;await ui.focus();await ui.click();
  assert.equal(ui.ids.get('offer-bonus-summary').textContent,offerBonus);
  assert.equal(ui.ids.get('checkout-bonus-summary').textContent,'รายการนี้รวมคู่มือ PDF และผู้ช่วยงาน .md');
  ui.state.recovery={active:true,priceTHB:790,expiresAt:new Date(NOW+ui.state.elapsed+3600000).toISOString()};ui.state.cartPrice=790;await ui.focus();await ui.click();
  assert.match(ui.ids.get('offer-bonus-summary').textContent,/ไม่รวม/);assert.match(ui.ids.get('checkout-bonus-summary').textContent,/ไม่รวม/);
});
test('added value and opening-offer urgency follow launch, expiry and recovery without counting the course price',async()=>{
  const ui=await boot();
  const value=()=>ui.ids.get('offer-added-value').textContent;
  const bonusesHidden=()=>['stack-bonus-ebook','stack-bonus-assistant'].map(id=>ui.ids.get(id).hidden);
  const urgencyHidden=()=>['offer-cohort-note','offer-urgency-copy'].map(id=>ui.ids.get(id).hidden);
  assert.match(ui.ids.get('current-price').textContent,/990/);assert.match(value(),/2,380/);assert.deepEqual(bonusesHidden(),[false,false]);assert.deepEqual(urgencyHidden(),[false,false]);
  assert.equal(ui.ids.get('offer-added-note').textContent,'รวมให้ในแพ็ก ไม่มีค่าใช้จ่ายส่วนนี้เพิ่ม');
  assert.equal(ui.ids.get('offer-cohort-note').textContent,'สิทธิ์ราคาเปิดเรียนเฉพาะรุ่นนี้');
  assert.match(ui.ids.get('offer-urgency-copy').textContent,/ก่อนเวลาที่แสดง.*1,690/);
  ui.state.elapsed=172800001;await ui.focus();
  assert.match(ui.ids.get('current-price').textContent,/1,690/);assert.match(value(),/2,380/);assert.deepEqual(bonusesHidden(),[false,false]);assert.deepEqual(urgencyHidden(),[true,true]);
  ui.state.recovery={active:true,priceTHB:790,expiresAt:new Date(NOW+ui.state.elapsed+3600000).toISOString()};await ui.focus();
  assert.match(ui.ids.get('current-price').textContent,/790/);assert.match(value(),/690/);assert.doesNotMatch(value(),/2,380/);assert.deepEqual(bonusesHidden(),[true,true]);assert.deepEqual(urgencyHidden(),[true,true]);
  assert.equal(ui.ids.get('offer-added-note').textContent,'สิทธิ์นี้รวมเครื่องมือฝึกบนเว็บ ไม่รวม E-book และผู้ช่วย .md');
  for(const id of ['price-label','hero-price-label'])assert.equal(ui.ids.get(id).textContent,'สิทธิ์เฉพาะบัญชีของคุณ');
  assert.equal(ui.ids.get('countdown').hidden,false,'recovery keeps its own server-backed countdown');
  ui.state.elapsed+=3600001;await ui.focus();
  assert.match(ui.ids.get('current-price').textContent,/1,690/);assert.match(value(),/2,380/);assert.deepEqual(bonusesHidden(),[false,false]);assert.deepEqual(urgencyHidden(),[true,true]);
});
test('quick server quote keeps QR usable while the membership database is slow or unavailable',async()=>{
  const waiting=deferred(),ui=await boot({offerGate:waiting.promise});
  assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('payment-qr').hidden,false);
  const before=ui.calls.length;await ui.qrClick();assert.equal(ui.ids.get('payment-qr').scrolls,1);assert.equal(ui.calls.length,before);
  assert.equal(ui.ids.get('receipt-form').hidden,true);
  waiting.resolve();await settle();ui.state.offerStatus=503;await ui.focus();
  assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('receipt-form').hidden,true);
});
test('added value uses configured component values instead of the package price or a stale bonus subtotal',async()=>{
  const ui=await boot({offerConfig:{learning_tools_value_thb:710,bonus_values_thb:{ebook_pdf:600,work_coach_md:1280,total:1}}});
  assert.match(ui.ids.get('offer-added-value').textContent,/2,590/);
  ui.state.recovery={active:true,priceTHB:790,expiresAt:new Date(NOW+3600000).toISOString()};await ui.focus();
  assert.match(ui.ids.get('offer-added-value').textContent,/710/);
});
test('checkout remains usable with cached HTML that has no value-stack or urgency elements',async()=>{
  const ui=await boot({omitIds:['offer-added-value','offer-added-note','stack-bonus-ebook','stack-bonus-assistant','offer-cohort-note','offer-urgency-copy']});
  await ui.click();assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('purchase-button').disabled,false);
});
test('a hanging checkout request stops waiting, remains retryable and does not automatically send another POST',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>waiting.promise});const click=ui.click();await settle();assert.equal(ui.ids.get('finish-payment').disabled,true);assert.equal(ui.ids.get('checkout-loading').hidden,false);
  await ui.timeout();await click;assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('checkout-loading').hidden,true);assert.match(ui.ids.get('purchase-status').textContent,/กดลองอีกครั้ง/);assert.match(ui.ids.get('purchase-status').textContent,/อย่าโอนซ้ำ/);assert.equal(ui.ids.get('receipt-form').hidden,true);
  assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);assert.equal(ui.calls.find(c=>c.options.method==='POST').options.signal.aborted,true);
  ui.state.checkoutId=CART;await ui.click();assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1,'explicit retry restores the server cart before considering a new POST');
  waiting.resolve(response({ok:true,checkout:{...ui.cart(),priceTHB:1690}}));await settle();assert.match(ui.ids.get('bank-amount').textContent,/990/,'late original reply cannot replace the restored cart');
});
test('timeout also covers a response body that never resolves',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>({ok:true,status:200,json:()=>waiting.promise})});const click=ui.click();await settle();await ui.timeout();await click;
  assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('receipt-form').hidden,true);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,1);
});
test('hanging initial restoration unblocks the retry button without opening a new checkout',async()=>{
  let fail=true;const ui=await boot({checkoutId:CART,restore:()=>fail?new Promise(()=>{}):response({ok:true,checkout:{id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'open'}})});
  assert.equal(ui.ids.get('finish-payment').disabled,true);await ui.timeout();assert.equal(ui.ids.get('purchase-button').disabled,false);assert.match(ui.ids.get('purchase-status').textContent,/รายการชำระเดิม/);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
  fail=false;await ui.click();assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
});
test('account changes invalidate a pending checkout and never reveal the former account payment details',async()=>{
  const waiting=deferred(),ui=await boot({post:()=>waiting.promise});const click=ui.click();await settle();ui.state.email='other@example.test';await ui.focus();
  waiting.resolve(response({ok:true,checkout:ui.cart()}));await click;assert.equal(ui.ids.get('receipt-form').hidden,true);assert.equal(ui.ids.get('upload-button').disabled,true);assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('customer-email').value,'other@example.test');
});
test('an expired or submitted restored cart never shows a payable QR',async()=>{
  for(const patch of [{expiresAt:new Date(NOW-1000).toISOString()},{status:'submitted',reference:'SAUCE-'+'A'.repeat(32)}]){
    const ui=await boot({checkoutId:CART,restore:()=>response({ok:true,checkout:{id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'open',...patch}})});
    assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.ids.get('copy-payment').disabled,true);
  }
});

test('offer connectivity failure exposes a working reconnect action and never silently starts payment',async()=>{
  const ui=await boot({offerStatus:503});assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.ids.get('retry-offer').hidden,false);assert.equal(ui.ids.get('retry-offer').disabled,false);assert.equal(ui.ids.get('payment-qr').hidden,false);
  ui.state.offerStatus=200;await ui.ids.get('retry-offer').fire('click');assert.equal(ui.ids.get('retry-offer').hidden,true);assert.equal(ui.ids.get('purchase-button').disabled,false);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);assert.equal(ui.ids.get('receipt-form').hidden,true);
});
test('a guest purchase goes to account enrollment without creating an unowned checkout',async()=>{
  const ui=await boot();ui.state.email=null;await ui.focus();await ui.click();assert.match(ui.location.assigned,/^\/learn\/\?enroll=ai-sauce&return=/);assert.match(decodeURIComponent(ui.location.assigned),/\/ai-source\/#submit-receipt/);assert.equal(ui.calls.filter(c=>c.options.method==='POST').length,0);
});

test('a transient offer failure during receipt upload preserves the submitted cart and accepts its confirmed result',async()=>{
  const waiting=deferred(),started=deferred(),ui=await boot({checkoutId:CART,receipt:()=>{started.resolve();return waiting.promise;}});await ui.fill();const submission=ui.submit();await Promise.race([started.promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('receipt did not start: '+ui.ids.get('upload-status').textContent)),1000))]);
  assert.equal(ui.calls.filter(c=>c.url==='/api/ai-source').length,1,ui.ids.get('upload-status').textContent);ui.state.offerStatus=503;await ui.focus();assert.equal(ui.ids.get('payment-qr').hidden,true);assert.doesNotMatch(ui.ids.get('copy-status').textContent,/ราคาเปลี่ยนแล้ว/);
  waiting.resolve(response({ok:true,status:'pending_verification',reference:'SAUCE-'+'A'.repeat(32),admissionDueAt:new Date(NOW+3600000).toISOString()},201));await submission;
  assert.match(ui.ids.get('upload-status').textContent,/รับลงทะเบียนแล้ว/);assert.doesNotMatch(ui.ids.get('upload-status').textContent,/ยังยืนยันการรับข้อมูลไม่ได้/);assert.equal(ui.ids.get('upload-button').disabled,true);assert.equal(ui.ids.get('upload-button').textContent,'ส่งหลักฐานแล้ว');
  ui.state.offerStatus=200;await ui.focus();assert.equal(ui.ids.get('bank-details').hidden,false);assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.ids.get('upload-button').disabled,true);assert.equal(ui.calls.filter(c=>c.url==='/api/ai-source').length,1);
});

test('repeated clicks reveal the current valid QR immediately without another offer or checkout request',async()=>{
  const ui=await boot({checkoutId:CART});const count=ui.calls.length;assert.equal(ui.ids.get('payment-qr').hidden,false);
  ui.state.offerStatus=503;await ui.click();await ui.click();assert.equal(ui.calls.length,count);assert.equal(ui.ids.get('payment-qr').hidden,false);assert.equal(ui.ids.get('bank-details').scrolls,2);assert.equal(ui.ids.get('checkout-loading').hidden,true);assert.equal(ui.ids.get('purchase-button').disabled,false);
});
test('an expired cart still checks the authoritative offer before opening another payment',async()=>{
  const ui=await boot({checkoutId:CART});const count=ui.calls.length;ui.state.elapsed=172800001;ui.state.cartPrice=1690;await ui.click();
  assert.equal(ui.calls[count].url,'/api/ai-source?action=offer');assert.equal(ui.calls.slice(count).filter(c=>c.options.method==='POST').length,1);assert.equal(ui.ids.get('payment-qr').hidden,true,'expired returned cart is never shown as payable');
});
test('a submitted cart uses the registered-account path rather than reopening QR',async()=>{
  const ui=await boot({checkoutId:CART,restore:()=>response({ok:true,checkout:{id:CART,priceTHB:990,expiresAt:new Date(NOW+172800000).toISOString(),status:'submitted',reference:'SAUCE-'+'A'.repeat(32)}})});ui.state.blocked=true;await ui.focus();const count=ui.calls.length;await ui.click();
  assert.equal(ui.calls[count].url,'/api/ai-source?action=offer');assert.equal(ui.location.assigned,'/learn/?course=ai-sauce');assert.equal(ui.ids.get('payment-qr').hidden,true);assert.equal(ui.calls.slice(count).filter(c=>c.options.method==='POST').length,0);
});
test('a newly active recovery price cannot reveal an existing cart for a different price',async()=>{
  const ui=await boot({checkoutId:CART});ui.state.recovery={active:true,priceTHB:790,expiresAt:new Date(NOW+3600000).toISOString()};ui.state.cartPrice=790;await ui.focus();const count=ui.calls.length;await ui.click();
  assert.equal(ui.calls[count].url,'/api/ai-source?action=offer');assert.equal(ui.calls.slice(count).filter(c=>c.options.method==='POST').length,1);assert.match(ui.ids.get('bank-amount').textContent,/790/);assert.equal(ui.ids.get('payment-qr').hidden,false);
});
