import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {validateBehavior,createSalesBehaviorHandler} from './sales-behavior.js';
import {issueOffer,paymentQuote,readPaymentQuote,offerCookie} from './ai-source-domain.js';
import {createAiSourceHandler} from './ai-source-handler.js';
const now=new Date('2026-09-16T03:00:00Z'),secret='local-test-only';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.body=JSON.parse(raw);}};}
test('payment quotes cannot be forged, moved to another visitor, or changed to 790',()=>{
 const o=issueOffer(now,secret),p=paymentQuote(o.offer,now,secret);
 assert.equal(readPaymentQuote(p.token,o.offer,now,secret).price,990);
 assert.equal(readPaymentQuote(p.token,issueOffer(now,secret).offer,now,secret),null);
 const [payload,sig]=p.token.split('.');const q=JSON.parse(Buffer.from(payload,'base64url'));
 for(const edit of [{price:790},{issuedAt:q.issuedAt-100000},{expiresAt:q.expiresAt+100000}])assert.equal(readPaymentQuote(Buffer.from(JSON.stringify({...q,...edit})).toString('base64url')+'.'+sig,o.offer,now,secret),null);
 assert.equal(readPaymentQuote(p.token,o.offer,new Date(q.expiresAt+86400000),secret).price,990,'late submission retains historical quote; transfer time must still be checked');
});
test('guest payment quote does not access membership or database and preserves its deadline',async()=>{
 const config={MEET_ADMIN_KEY:secret,DATABASE_URL:'not-a-real-connection'};
 const h=createAiSourceHandler({config,now:()=>now,database(){throw Error('must not query DB');},school:{offer(){throw Error('must not query membership');}},sendJson(res,body,status=200){res.statusCode=status;res.end(JSON.stringify(body));}});
 const req={method:'GET',url:'/api/ai-source?action=payment',headers:{host:'www.myclover.com'}};const res=response();await h(req,res);
 assert.equal(res.statusCode,200);assert.equal(res.body.payment.quote.price,990);
 const cookie=res.headers['Set-Cookie'].split(';')[0],second=response();await h({method:'POST',url:req.url,headers:{host:'www.myclover.com',origin:'https://www.myclover.com','content-type':'application/json',cookie},body:{quote:res.body.payment.token}},second);
 assert.equal(second.statusCode,200);assert.deepEqual(second.body.payment,res.body.payment);
});
test('behavior payload drops extra fields and rejects fake server purchase events',()=>{
 const base={visitor:randomUUID(),session:randomUUID(),events:[{id:randomUUID(),name:'qr_view',email:'never store',value:'private'}],campaign:{utm_source:'fb',email:'never store'},device:'mobile',receipt:'never store'};
 const data=validateBehavior(base);assert.equal(JSON.stringify(data).includes('never store'),false);assert.equal(data.campaign.utm_source,'fb');
 assert.throws(()=>validateBehavior({...base,events:[{id:randomUUID(),name:'checkout_started'}]}));
 assert.throws(()=>validateBehavior({...base,events:Array(21).fill(base.events[0])}));
});
test('anonymous and cross-origin clients cannot read reports or submit behavior',async()=>{
 const h=createSalesBehaviorHandler({config:{MEET_ADMIN_KEY:secret},getSql(){throw Error('must not access DB');}});
 for(const req of [{method:'GET',headers:{}},{method:'POST',headers:{host:'www.myclover.com',origin:'https://wrong.test'}}]){const res=response();await h(req,res);assert.ok([401,403].includes(res.statusCode));}
});
