import {createHash} from 'node:crypto';
import {BANK,Fault,clean,hmac,same,reducer,quote,inspectSlip,paymentMessage,lineText,amount} from './domain.js';
import {dispatch} from './providers.js';
import {houseReducer} from './house.js';
import {attention,queueOwnerAttention} from './attention.js';
const COOKIE='__Host-mediral-admin';
function cookieToken(env,now){const expires=String(now+4*3600000);return `${expires}.${hmac('mediral-admin:'+expires,env.MEDIRAL_ADMIN_KEY||env.MEET_ADMIN_KEY).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}`;}
function authenticated(req,env,now){const value=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';const [expires]=value.split('.');return /^\d{13}$/.test(expires)&&+expires>now&&+expires<=now+4*3600000&&same(value,cookieToken(env,+expires-4*3600000));}
function originOK(req){return req.headers.origin===`https://${req.headers.host}`||(!process.env.VERCEL&&/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')&&req.headers.origin===`http://${req.headers.host}`);}
async function raw(req,max=1024*1024){if(Buffer.isBuffer(req.body)){if(req.body.length>max)throw new Fault('BODY_TOO_LARGE',413);return req.body;}if(typeof req.body==='string'){const b=Buffer.from(req.body);if(b.length>max)throw new Fault('BODY_TOO_LARGE',413);return b;}if(req.body&&typeof req.body==='object')throw new Fault('RAW_BODY_REQUIRED',400);const chunks=[];let size=0;for await(const c of req){const b=Buffer.from(c);size+=b.length;if(size>max)throw new Fault('BODY_TOO_LARGE',413);chunks.push(b);}return Buffer.concat(chunks);}
function parse(b){try{return JSON.parse(b.toString('utf8'));}catch{throw new Fault('INVALID_JSON');}}
export function createHandler({store,providers,env=process.env,clock=()=>Date.now()}){
 const configured=()=>Boolean(env.MEDIRAL_LINE_ACCESS_TOKEN&&env.MEDIRAL_LINE_SECRET&&(env.MEDIRAL_LINE_BOT_ID||env.MEDIRAL_LINE_BASIC_ID));
 const operatorReady=()=>String(env.MEDIRAL_ADMIN_KEY||env.MEET_ADMIN_KEY||'').length>=24;
 const botId=()=>env.MEDIRAL_LINE_BOT_ID||providers.botId();
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
  const action=new URL(req.url,'https://local.invalid').searchParams.get('action')||'status';const now=clock();
  try{
   if(action==='health'&&req.method==='GET')return json({ok:true,service:'mediral-commerce',acceptingOrders:env.MEDIRAL_MODE==='live'&&configured()&&operatorReady()});
   if(action==='webhook'){
    if(req.method!=='POST')throw new Fault('METHOD_NOT_ALLOWED',405);
    if(!configured())throw new Fault('LINE_NOT_CONFIGURED',503);
    const bytes=await raw(req);if(!same(req.headers['x-line-signature'],hmac(bytes,env.MEDIRAL_LINE_SECRET)))throw new Fault('INVALID_SIGNATURE',401);
    const body=parse(bytes);if(body.destination!==await botId()||!Array.isArray(body.events)||body.events.length>100)throw new Fault('INVALID_WEBHOOK');
    if(!body.events.length)return json({ok:true});
    if(!operatorReady())throw new Fault('ADMIN_NOT_CONFIGURED',503);
    if(env.MEDIRAL_MODE!=='live')return json({ok:true,paused:true});
    if(!env.MEDIRAL_LINE_ACCESS_TOKEN)throw new Fault('LINE_NOT_CONFIGURED',503);
    await store.ensure();
    for(const event of body.events){
     if(clock()-now>40000)throw new Fault('REDELIVER_REMAINING',503);
     if(!['follow','unfollow','message'].includes(event.type)||event.source?.type!=='user')continue;
     const user=event.source.userId;if(!/^U[0-9a-f]{32}$/.test(user||'')||!/^[-A-Za-z0-9_]{8,100}$/.test(event.webhookEventId||'')||!Number.isFinite(event.timestamp))throw new Fault('INVALID_EVENT');
     if(await store.event(event.webhookEventId))continue;
     const c=await store.claim(user,clock());if(!c)throw new Fault('CUSTOMER_BUSY',503);
     try{
      if(await store.event(event.webhookEventId))continue;
      if(event.timestamp<(c.state.lastEventAt||0)||event.timestamp<clock()-24*3600000){await store.commit(c,{state:c.state,eventId:event.webhookEventId},clock());continue;}
      const order=c.state.orderId?await store.order(c.state.orderId):null;
      let result=(env.MEDIRAL_SHARED_OA==='1'?houseReducer:reducer)(c.state,event,order,{now:clock(),nativeGreeting:env.MEDIRAL_NATIVE_GREETING!=='0'});result.state.lastEventAt=event.timestamp;
      if(await store.limited('user:'+user,40,60000,clock())){result={state:c.state,order:null,messages:[]};}
      if(result.verifyImage){
       const o=result.order;let checked={ok:false,reason:'PROVIDER_UNAVAILABLE'};
       try{o.receipt=await providers.image(result.verifyImage);const response=await providers.verify(o.receipt,o);checked=inspectSlip(response,o,clock());if(checked.ok&&await store.crossCourseReference(checked.transRef))checked={ok:false,reason:'TRANSACTION_USED_IN_AI_SOURCE'};}
       catch{checked={ok:false,reason:'VERIFICATION_UNAVAILABLE'};}
       o.paymentCheck={...checked,checkedAt:clock()};o.status='payment_review';o.history.push({at:clock(),action:'slip_received',check:checked.reason||'provider_passed'});
       result.state.paused=true;result.state.reason=checked.ok?'ตรวจสลิปผ่าน รอตรวจยอดเงินเข้า':'สลิปรอตรวจ';
       // Provider results are evidence; staff confirms actual receipt of funds before fulfillment.
       result.messages=[lineText(checked.ok?`สลิปตรงกับยอดและบัญชีของรายการ ${o.id} ค่ะ กำลังยืนยันยอดเงินเข้า แล้วจะแจ้งเตรียมจัดส่งให้ ไม่ต้องโอนซ้ำนะคะ`:`ได้รับสลิปของ ${o.id} แล้วค่ะ ให้คนดูแลตรวจเพิ่มเติมก่อน ยังไม่ต้องโอนซ้ำหรือโอนเพิ่ม`)];
      }
      if(result.state.paused&&(!c.state.paused||result.state.reason!==c.state.reason))result.state.attentionId=event.webhookEventId;
      const out=await store.commit(c,{...result,eventId:event.webhookEventId,replyToken:event.replyToken,messages:event.replyToken?result.messages:[]},clock());
      if(out)await dispatch(store,providers,out,clock());
     }finally{await store.release(c);}
    }
    // Retry persisted replies after a redelivery, never mutate an order twice.
    for(const row of await store.drainRows(clock())){if(clock()-now>48000)break;await dispatch(store,providers,row.id,clock());}
    return json({ok:true});
   }
   if(action==='drain'){
    if(!configured())return json({ok:true,skipped:'not_connected'});
    if(!['GET','POST'].includes(req.method))throw new Fault('METHOD_NOT_ALLOWED',405);
    if(!env.CRON_SECRET||!same(req.headers.authorization,`Bearer ${env.CRON_SECRET}`))throw new Fault('UNAUTHORIZED',401);
    await store.ensure();await queueOwnerAttention(store,env,clock());for(const row of await store.drainRows(now)){if(clock()-now>45000)break;await dispatch(store,providers,row.id,clock());}await store.cleanup(clock());return json({ok:true});
   }
   const key=env.MEDIRAL_ADMIN_KEY||env.MEET_ADMIN_KEY;if(!key||key.length<24)throw new Fault('ADMIN_NOT_CONFIGURED',503);
   if(req.method!=='GET'&&!originOK(req))throw new Fault('INVALID_ORIGIN',403);
   if(action==='login'&&req.method==='POST'){
    const body=parse(await raw(req,4096));await store.ensure();const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
    if(await store.limited('login:'+createHash('sha256').update(ip).digest('hex'),8,15*60000,now))throw new Fault('TRY_LATER',429);
    if(!same(body.key,key))throw new Fault('UNAUTHORIZED',401);res.setHeader('Set-Cookie',`${COOKIE}=${cookieToken(env,now)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=14400`);return json({ok:true});
   }
   if(!authenticated(req,env,now))throw new Fault('UNAUTHORIZED',401);
   if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);return json({ok:true});}
   await store.ensure();
   if(action==='status'&&req.method==='GET')return json({ok:true,mode:env.MEDIRAL_MODE||'paused',lineConfigured:configured(),slipConfigured:Boolean(env.MEDIRAL_EASYSLIP_KEY),retryConfigured:Boolean(env.CRON_SECRET),bank:{...BANK,number:'••••••'+BANK.number.slice(-4)},outbox:await store.queueStatus()});
   if(action==='retry'&&req.method==='POST'){for(const row of await store.drainRows(now)){if(clock()-now>45000)break;await dispatch(store,providers,row.id,clock());}return json({ok:true});}
   if(action==='list'&&req.method==='GET'){const data=await store.list();return json({ok:true,...data,attention:attention(data)});}
   if(action==='receipt'&&req.method==='GET'){
    const id=new URL(req.url,'https://local.invalid').searchParams.get('id');const order=await store.order(id);if(!order?.receipt)throw new Fault('NOT_FOUND',404);if(!['image/jpeg','image/png'].includes(order.receipt.mime))throw new Fault('INVALID_IMAGE',500);
    res.setHeader('Content-Type',order.receipt.mime);res.setHeader('Content-Disposition','attachment; filename="receipt.'+(order.receipt.mime==='image/png'?'png':'jpg')+'"');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.statusCode=200;return res.end(Buffer.from(order.receipt.base64,'base64'));
   }
   if(action!=='update'||req.method!=='POST')throw new Fault('METHOD_NOT_ALLOWED',405);
   const body=parse(await raw(req,12000));const existing=body.id?await store.order(body.id):null;const user=existing?.userId||body.userId;if(!/^U[0-9a-f]{32}$/.test(user||''))throw new Fault('INVALID_CUSTOMER');
   const c=await store.claim(user,now);if(!c)throw new Fault('CUSTOMER_BUSY',409);
   let out;
   try{
    let order=existing?await store.order(existing.id):null;const state=c.state;let messages=[],transfer;
    if(body.command==='resume'){state.paused=false;delete state.reason;}
    else if(body.command==='pause'){state.paused=true;state.reason='คนดูแลรับช่วง';}
    else{
     if(!order)throw new Fault('NOT_FOUND',404);
     if(body.command==='quote'){if(env.MEDIRAL_MODE!=='live'||!configured())throw new Fault('LINE_NOT_READY',409);order=quote(order,body,now);state.paused=false;delete state.reason;messages=[paymentMessage(order)];}
     else if(body.command==='paid'){
      if(!['awaiting_payment','payment_review'].includes(order.status))throw new Fault('ORDER_NOT_PAYABLE',409);
      const ref=clean(body.transRef,120).toUpperCase();const transferred=Date.parse(body.transferredAt);
      if(body.confirmedReceived!==true||!/^[-A-Z0-9._:/]{6,120}$/.test(ref)||amount(body.amount)!==order.total||!Number.isFinite(transferred)||transferred<order.quotedAt||transferred>order.expiresAt||transferred>now+60000)throw new Fault('CHECK_PAYMENT_DETAILS');
      if(await store.crossCourseReference(ref))throw new Fault('TRANSFER_ALREADY_USED',409);
      transfer=ref;order.status='paid';order.payment={transRef:ref,amount:order.total,transferredAt:transferred,verifiedAt:now,method:'staff_bank_confirmation'};state.paused=false;delete state.reason;order.history.push({at:now,action:'paid'});messages=[lineText(`ยืนยันรับชำระ ${order.id} แล้วค่ะ 🍀\nเตรียมจัดสินค้าให้ และจะแจ้งเลขพัสดุในแชทนี้`,['สถานะออเดอร์','คุยกับคนดูแล'])];
     }else if(body.command==='packing'){if(order.status!=='paid')throw new Fault('STATUS_CONFLICT',409);order.status='packing';order.history.push({at:now,action:'packing'});}
     else if(body.command==='shipped'){if(!['paid','packing'].includes(order.status))throw new Fault('STATUS_CONFLICT',409);const carrier=clean(body.carrier,80),tracking=clean(body.tracking,80);if(!carrier||!/^[-A-Za-z0-9]{5,80}$/.test(tracking))throw new Fault('INVALID_TRACKING');order={...order,status:'shipped',carrier,tracking};order.history.push({at:now,action:'shipped'});state.stage='cart';messages=[lineText(`ส่ง ${order.id} แล้วค่ะ 🍀\n${carrier}\nเลขพัสดุ ${tracking}\nขอบคุณที่ให้ myClover ดูแลค่ะ`,['สถานะออเดอร์','คุยกับคนดูแล'])];}
     else if(body.command==='cancel'){if(!['awaiting_quote','awaiting_payment'].includes(order.status))throw new Fault('USE_PAYMENT_REVIEW',409);order.status='cancelled';order.history.push({at:now,action:'cancelled'});state.stage='cart';state.paused=false;messages=[lineText(`ยกเลิกรายการ ${order.id} แล้วค่ะ กรุณาอย่าโอนยอดเดิม หากโอนแล้วให้ส่งต่อคนดูแลทันที`,['คุยกับคนดูแล'])];}
     else throw new Fault('UNKNOWN_COMMAND');
    }
    out=await store.commit(c,{state,order,messages,kind:'push',transfer},clock());
   }finally{await store.release(c);}
   if(out)await dispatch(store,providers,out,clock());return json({ok:true,delivery:out?'queued_check_outbox':'none'});
  }catch(e){const duplicate=e?.code==='23505'||String(e?.code).startsWith('SQLITE_CONSTRAINT')||[1555,2067].includes(e?.errcode);const code=duplicate?'TRANSFER_OR_EVENT_ALREADY_USED':e instanceof Fault?e.code:'SERVICE_UNAVAILABLE';return json({ok:false,code},duplicate?409:e instanceof Fault?e.status:503);}
 };
}
