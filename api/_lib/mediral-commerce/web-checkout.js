import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {COUPON_START,COUPON_END,retailPrice} from './catalog.js';
import {BANK,Fault,clean,hmac,same} from './domain.js';
const COOKIE='__Host-mediral-shop';
const END=COUPON_END,START=COUPON_START;
export function webPrice(items,now){
 if(!items||Array.isArray(items)||typeof items!=='object'||!Object.keys(items).length||Object.keys(items).some(k=>!['CL','AC','BR','SU','PO'].includes(k))||Object.values(items).some(n=>!Number.isInteger(n)||n<1||n>5))throw new Fault('INVALID_CART');
 const active=now>=START&&now<END;
 return {...retailPrice(items,now),coupon:active?'WELCOME20':null,couponExpiresAt:active?END:null};
}
export function publicOrder(o,now){
 const expired=o.status==='awaiting_payment'&&now>o.expiresAt;
 return {id:o.id,items:o.items,status:expired?'quote_expired':o.status,subtotal:o.subtotal??o.webPricing.subtotal,discount:o.discount??o.webPricing.discount,shipping:o.shipping??null,total:o.total??null,expiresAt:o.expiresAt??null,carrier:o.carrier||null,tracking:o.tracking||null,bank:o.status==='awaiting_payment'&&!expired?BANK:null};
}
export function receiptFrom(input){
 const b=Buffer.from(typeof input==='string'?input:'','base64');
 if(!b.length||b.length>3*1024*1024)throw new Fault('INVALID_IMAGE');
 const png=b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
 const jpeg=b[0]===255&&b[1]===216&&b[2]===255;
 if(!png&&!jpeg)throw new Fault('INVALID_IMAGE');
 return {mime:png?'image/png':'image/jpeg',base64:b.toString('base64')};
}
export async function webCheckout({action,req,res,store,env,now,raw,parse,originOK,json}){
 if(req.method!=='POST')throw new Fault('METHOD_NOT_ALLOWED',405);
 if(!originOK(req))throw new Fault('INVALID_ORIGIN',403);
 const secret=env.MEDIRAL_ADMIN_SESSION_SECRET||env.MEDIRAL_LINE_SECRET||env.MEDIRAL_ADMIN_KEY||'';
 if(secret.length<24||env.MEDIRAL_MODE!=='live')throw new Fault('SHOP_NOT_READY',503);
 await store.ensure();
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
 if(await store.limited('web:'+createHash('sha256').update(ip).digest('hex'),120,600000,now))throw new Fault('TRY_LATER',429);
 const token=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 let [user,expires,sig]=token.split('.');
 const valid=/^W[0-9a-f]{32}$/.test(user||'')&&/^\d{13}$/.test(expires||'')&&+expires>now&&+expires<=now+30*86400000&&same(sig,hmac('web-shop:'+user+'.'+expires,secret));
 if(action==='shop-session'){
  if(!valid){user='W'+randomBytes(16).toString('hex');expires=String(now+30*86400000);sig=hmac('web-shop:'+user+'.'+expires,secret);res.setHeader('Set-Cookie',`${COOKIE}=${user}.${expires}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`);}
  return json({ok:true,unit:50000,discountPercent:now>=START&&now<END?20:0,couponExpiresAt:END});
 }
 if(!valid)throw new Fault('SHOP_SESSION_REQUIRED',401);
 const body=parse(await raw(req,action==='shop-slip'?4300000:12000));
 const c=await store.claim(user,now);if(!c)throw new Fault('CUSTOMER_BUSY',409);
 try{
  let order=c.state.orderId?await store.order(c.state.orderId):null;
  if(action==='shop-create'){
   // A retry in this browser returns the same order, including after a lost response.
   if(!order){
    const pricing=webPrice(body.items,now),name=clean(body.name,100),phone=clean(body.phone,30).replace(/[\s-]/g,''),address=clean(body.address,700);
    if(body.consent!==true||name.length<2||!/^0[0-9]{8,9}$/.test(phone)||address.length<15)throw new Fault('CHECK_CUSTOMER_DETAILS');
    if(await store.limited('web-create:'+createHash('sha256').update(ip).digest('hex'),5,3600000,now))throw new Fault('TRY_LATER',429);
    order={id:'MD-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),channel:'web',items:body.items,name,phone,address,consentAt:now,status:'awaiting_quote',createdAt:now,webPricing:pricing,history:[{at:now,action:'submitted_web'}]};
    await store.commit(c,{state:{orderId:order.id,stage:'ordered'},order},now);
   }
  }else if(action==='shop-slip'){
   if(!order||!['awaiting_payment','payment_review'].includes(order.status))throw new Fault('ORDER_NOT_PAYABLE',409);
   if(order.status!=='payment_review'){
    order.receipt=receiptFrom(body.image);order.status='payment_review';order.paymentCheck={ok:false,reason:'STAFF_BANK_CONFIRMATION_REQUIRED',checkedAt:now};order.history.push({at:now,action:'slip_received_web'});
    await store.commit(c,{state:c.state,order},now);
   }
  }else if(action==='shop-new'){
   if(order&&!['cancelled','shipped'].includes(order.status))throw new Fault('ORDER_STILL_ACTIVE',409);
   await store.commit(c,{state:{}},now);order=null;
  }else if(action!=='shop-status')throw new Fault('NOT_FOUND',404);
  return json({ok:true,order:order?publicOrder(order,now):null});
 }finally{await store.release(c);}
}
