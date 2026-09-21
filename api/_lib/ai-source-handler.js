import { createHmac, randomUUID } from 'node:crypto';
import { ADMIN_URL, JSON_MAX_BYTES, RECEIPT_MAX_BYTES, REFERENCE, InputError, adminAccess, amountDueAt, clean, datesFromTransfer,
  paymentQuote, readPaymentQuote, hasOfferCookie, issueOffer, makeReference, offerCookie, parseAmount, parseTransferTime, publicOffer, readOffer, sameOrigin, validateIntake } from './ai-source-domain.js';
import { createAiSourceStore } from './ai-source-store.js';
import { createTelegramNotifier, registrationText, testText } from './ai-source-notify.js';
import { LearnError } from './learn-domain.js';

async function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || ''))) throw new InputError('ส่งข้อมูลแบบ JSON',undefined,415,'UNSUPPORTED_CONTENT_TYPE');
  const len = Number(req.headers?.['content-length'] || 0);
  if (len > JSON_MAX_BYTES) throw new InputError('ข้อมูลใหญ่เกินไป กรุณาลดสลิปให้ไม่เกิน 2 MB','receipt',413,'BODY_TOO_LARGE');
  let raw = req.body;
  if (raw == null && req[Symbol.asyncIterator]) {
    const parts = []; let size = 0;
    for await (const part of req) { const b = Buffer.from(part); size += b.length; if (size > JSON_MAX_BYTES) throw new InputError('ข้อมูลใหญ่เกินไป','receipt',413,'BODY_TOO_LARGE'); parts.push(b); }
    raw = Buffer.concat(parts);
  }
  try {
    if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
    if (typeof raw === 'string') { if (Buffer.byteLength(raw)>JSON_MAX_BYTES) throw new InputError('ข้อมูลใหญ่เกินไป','receipt',413,'BODY_TOO_LARGE'); raw = JSON.parse(raw); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError('ข้อมูลไม่ถูกต้อง');
    if (Buffer.byteLength(JSON.stringify(raw)) > JSON_MAX_BYTES) throw new InputError('ข้อมูลใหญ่เกินไป','receipt',413,'BODY_TOO_LARGE');
    return raw;
  } catch (error) { if (error instanceof InputError) throw error; throw new InputError('JSON ไม่ถูกต้อง'); }
}
function query(req, name) {
  const value = req.query?.[name] ?? new URL(req.url || '/', 'https://local.invalid').searchParams.get(name);
  return typeof value === 'string' ? value : '';
}
function iso(value) { return value == null ? null : new Date(value).toISOString(); }
function notification(row) { return {status:row.notify_status || 'pending',code:row.notify_detail?.code || null}; }
function publicRegistration(row, replayed, delivery = notification(row)) {
  const transfer = row.verified_transferred_at || row.submitted_transferred_at;
  return {ok:true,reference:row.reference,status:row.status,replayed,quotedAmountTHB:Number(row.quoted_amount_thb),
    submittedAmountTHB:Number(row.submitted_amount_satang)/100,submittedTransferredAt:iso(row.submitted_transferred_at),
    ...datesFromTransfer(transfer),datesVerified:Boolean(row.verified_at),notification:delivery,
    message:({pending_verification:'บันทึกข้อมูลและสลิปแล้ว รอผู้ดูแลตรวจยอดและติดต่อเพื่อรับเข้าเรียน',payment_verified:'ผู้ดูแลยืนยันยอดแล้ว รอจัดสิทธิ์เข้าเรียน',admitted:'ผู้ดูแลบันทึกว่าจัดสิทธิ์เข้าเรียนแล้ว',rejected:'รายการนี้ยังไม่ได้รับอนุมัติ กรุณาติดต่อผู้ดูแล'})[row.status] || 'พบรายการที่บันทึกแล้ว'};
}
function adminRegistration(row) {
  return {id:String(row.id),reference:row.reference,name:row.name,email:row.email || '',contact:row.contact || '',status:row.status,
    quotedAmountTHB:Number(row.quoted_amount_thb),submittedAmountTHB:Number(row.submitted_amount_satang)/100,
    submittedTransferredAt:iso(row.submitted_transferred_at),verifiedAmountTHB:row.verified_amount_satang == null ? null : Number(row.verified_amount_satang)/100,
    verifiedTransferredAt:iso(row.verified_transferred_at),verifiedAt:iso(row.verified_at),admittedAt:iso(row.admitted_at),
    ...datesFromTransfer(row.verified_transferred_at || row.submitted_transferred_at),datesVerified:Boolean(row.verified_at),
    offer:{firstSeenAt:iso(row.offer_first_seen_at),expiresAt:iso(row.offer_expires_at)},
    receipt:{mime:row.receipt_mime,name:row.receipt_name,size:Number(row.receipt_size),sha256:row.receipt_sha256},
    accountId:row.account_id || null,checkoutId:row.checkout_id || null,bankTransactionId:row.bank_transaction_id || null,
    legacyBindingEligible:Boolean(row.legacy_quote_eligible && !row.account_id && !row.checkout_id && ['pending_verification','payment_verified'].includes(row.status)),
    notification:notification(row),ownerNote:row.owner_note || '',history:row.admin_history || [],createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)};
}
async function deliver(store, row, notify, now) {
  const attempt = randomUUID(); let claimed;
  try { claimed = await store.claimNotify(row.reference,attempt,now); }
  catch { return {status:'pending',code:'NOTIFICATION_CLAIM_NOT_SAVED'}; }
  if (!claimed) return notification(row);
  let result;
  try { result = await notify(registrationText(row)); }
  catch { result = {status:'failed',code:'NOTIFIER_FAILED'}; }
  if (!['sent','failed','unconfigured'].includes(result?.status)) result = {status:'failed',code:'INVALID_NOTIFIER_RESULT'};
  // Permit only bounded code values, never arbitrary provider error strings or tokens.
  result = {status:result.status,code:/^[A-Z0-9_]{1,80}$/.test(result.code || '') ? result.code : 'NOTIFICATION_RESULT'};
  try { await store.finishNotify(row.reference,attempt,result,now); }
  catch { return {...result,persistenceWarning:true}; } // The intake itself already committed; do not return a false registration failure.
  return result;
}
export function createAiSourceHandler({database,sendJson,config = process.env,notify,school,now = () => new Date(),
  referenceFactory = makeReference,storeFactory = createAiSourceStore,log = code => console.error(code)} = {}) {
  const notifier = notify || createTelegramNotifier({config});
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, private'); res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const time = new Date(now()); const action = query(req,'action');
      if (!['GET','POST','PATCH'].includes(req.method)) {res.setHeader('Allow','GET, POST, PATCH');return sendJson(res,{ok:false,message:'Method not allowed'},405);}
      if ((req.method==='GET'||req.method==='POST') && action==='payment') {
        if(!sameOrigin(req))throw new InputError('คำขอไม่ถูกต้อง',undefined,403,'ORIGIN_REJECTED');
        if(!config.MEET_ADMIN_KEY||!config.DATABASE_URL)throw new InputError('ระบบชำระยังไม่พร้อม',undefined,503,'SERVICE_UNCONFIGURED');
        const old=readOffer(req,config.MEET_ADMIN_KEY,time);
        if(!old&&hasOfferCookie(req))throw new InputError('ข้อมูลสิทธิ์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล',undefined,409,'OFFER_INVALID');
        const signed=old||issueOffer(time,config.MEET_ADMIN_KEY);
        const data=req.method==='POST'?await readJson(req):{};
        let payment;
        if(data.quote){const quote=readPaymentQuote(data.quote,signed.offer,time,config.MEET_ADMIN_KEY);if(!quote)throw new InputError('ข้อมูลยอดชำระไม่ถูกต้อง กรุณาติดต่อผู้ดูแล',undefined,409,'QUOTE_INVALID');payment={quote,token:data.quote};}
        else payment=paymentQuote(signed.offer,time,config.MEET_ADMIN_KEY);
        res.setHeader('Set-Cookie',offerCookie(signed.token));
        return sendJson(res,{ok:true,ready:true,offer:publicOffer(signed.offer,time),payment});
      }
      if (req.method === 'GET' && action === 'offer') {
        const availability = {databaseConfigured:Boolean(config.DATABASE_URL),telegramConfigured:Boolean(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID),adminConfigured:Boolean(config.MEET_ADMIN_KEY)};
        if (!availability.adminConfigured) return sendJson(res,{ok:false,ready:false,availability,code:'SERVICE_UNCONFIGURED',message:'ระบบลงทะเบียนยังไม่พร้อม'},503);
        const previous = readOffer(req,config.MEET_ADMIN_KEY,time);
        if (!previous && hasOfferCookie(req)) return sendJson(res,{ok:false,ready:false,availability,code:'OFFER_INVALID',message:'ข้อมูลสิทธิ์ในเบราว์เซอร์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล'},409);
        const signed = previous || issueOffer(time,config.MEET_ADMIN_KEY);
        availability.databaseConnected = false;
        if (availability.databaseConfigured) {
          try { const rows = await database().query('SELECT 1 AS ai_source_ready'); availability.databaseConnected = Number(rows[0]?.ai_source_ready) === 1; } catch { /* No connection details in public output. */ }
        }
        let memberOffer = null;
        if (school && availability.databaseConnected) { const sql=database(); await storeFactory(sql).ensure(); memberOffer=await school.offer(req,sql,time); }
        res.setHeader('Set-Cookie',offerCookie(signed.token));
        return sendJson(res,{ok:availability.databaseConnected,ready:availability.databaseConnected,availability,offer:publicOffer(signed.offer,time),receiptMaxBytes:RECEIPT_MAX_BYTES,
          ...memberOffer,code:availability.databaseConnected ? undefined : 'PERSISTENCE_UNAVAILABLE',message:availability.databaseConnected ? undefined : 'ระบบรับลงทะเบียนยังไม่พร้อม'},availability.databaseConnected?200:503);
      }
      if (req.method === 'GET' && action === 'checkout' && school) {
        const sql=database();await storeFactory(sql).ensure();
        return sendJson(res,await school.restore(req,sql,query(req,'checkoutId'),time));
      }
      if (req.method !== 'POST' && !adminAccess(req,config)) return sendJson(res,{ok:false,code:config.MEET_ADMIN_KEY?'UNAUTHORIZED':'SERVICE_UNCONFIGURED',message:'ไม่มีสิทธิ์เข้าถึง'},config.MEET_ADMIN_KEY?401:503);
      if ((req.method === 'POST' || req.method === 'PATCH') && !sameOrigin(req)) return sendJson(res,{ok:false,code:'ORIGIN_REJECTED',message:'คำขอไม่ถูกต้อง'},403);
      if (req.method === 'POST') {
        if (!config.MEET_ADMIN_KEY) throw new InputError('ระบบลงทะเบียนยังไม่พร้อม',undefined,503,'SERVICE_UNCONFIGURED');
        if (school && ['checkout','recovery'].includes(action)) {const data=await readJson(req),sql=database();await storeFactory(sql).ensure();return sendJson(res,await school.act(req,sql,action,data,time));}
        const signed = readOffer(req,config.MEET_ADMIN_KEY,time);
        // Account-bound carts remain recoverable on another device after cookie
        // loss or expiry. The server cart supplies their price and time window.
        if (!signed && !school) throw new InputError('กรุณาโหลดข้อเสนอจากหน้าเว็บอีกครั้งก่อนส่ง',undefined,428,'OFFER_REQUIRED');
        const data = await readJson(req);
        if (clean(data.website,200)) throw new InputError('คำขอไม่ถูกต้อง');
        let intake = validateIntake(data,time);
        const sql=database(),store = storeFactory(sql); await store.ensure();
        if(school)intake=await school.bind(req,sql,data,intake,time);
        const finish=async(row,replayed)=>{
          if(school)await school.recorded(sql,row);
          // The notification claim prevents a second send, while retrying a
          // partially saved school registration also repairs its enrollment.
          const delivery=(!replayed || school)?await deliver(store,row,notifier,time):notification(row);
          return sendJson(res,publicRegistration(row,replayed,delivery),replayed?200:201);
        };
        const prior = await store.findIdempotency(intake.idempotencyKey);
        if (prior) {
          if (prior.payload_hash !== intake.payloadHash) throw new InputError('รหัสส่งรายการเดิมมีข้อมูลต่างกัน กรุณาใช้รายการเดิมหรือตั้งรายการใหม่',undefined,409,'IDEMPOTENCY_CONFLICT');
          return await finish(prior,true);
        }
        const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0,100);
        const bucket = createHmac('sha256',config.MEET_ADMIN_KEY).update(`ai-source-ip:${ip}`).digest('hex');
        if (!await store.rateLimit(bucket,time)) throw new InputError('ส่งรายการถี่เกินไป กรุณาลองภายหลัง',undefined,429,'RATE_LIMITED');
        let row;
        try { row = await store.insert({...intake,offer:intake.boundOffer || signed?.offer,quotedAmountTHB:intake.quotedAmountTHB ?? amountDueAt(signed.offer,time),reference:referenceFactory(),now:time}); }
        catch (error) {
          if (error?.code === '23505') {
            // A concurrent identical request may win either unique-index check first.
            const winner = await store.findIdempotency(intake.idempotencyKey);
            if (winner) {
              if (winner.payload_hash !== intake.payloadHash) throw new InputError('รหัสส่งรายการเดิมมีข้อมูลต่างกัน',undefined,409,'IDEMPOTENCY_CONFLICT');
              return await finish(winner,true);
            }
            throw new InputError('สลิปนี้มีรายการบันทึกแล้ว กรุณาใช้เลขอ้างอิงเดิมหรือติดต่อผู้ดูแล','receipt',409,'DUPLICATE_RECEIPT');
          }
          throw error;
        }
        if (!row) { // Concurrent request won the unique idempotency insert.
          const saved = await store.findIdempotency(intake.idempotencyKey);
          if (!saved || saved.payload_hash !== intake.payloadHash) throw new InputError('รหัสส่งรายการซ้ำกับข้อมูลต่างกัน',undefined,409,'IDEMPOTENCY_CONFLICT');
          return await finish(saved,true);
        }
        return await finish(row,false);
      }
      // No DB work, list or receipt bytes were exposed before the header-key check.
      const store = storeFactory(database()); await store.ensure();
      if (req.method === 'GET') {
        if (action === 'list' || !action) {
          const limitRaw = query(req,'limit') || '100'; const beforeRaw = query(req,'before');
          if (!/^\d{1,3}$/.test(limitRaw) || Number(limitRaw)<1 || Number(limitRaw)>100 || (beforeRaw && !/^[1-9]\d{0,18}$/.test(beforeRaw))) throw new InputError('รูปแบบหน้ารายการไม่ถูกต้อง');
          const limit = Number(limitRaw); const rows = await store.list(limit,beforeRaw || null);
          return sendJson(res,{ok:true,registrations:rows.map(adminRegistration),nextCursor:rows.length===limit?String(rows.at(-1).id):null,
            channels:{telegram:Boolean(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID)},adminUrl:ADMIN_URL});
        }
        if (action === 'receipt') {
          const reference = query(req,'reference'); if (!REFERENCE.test(reference)) throw new InputError('เลขอ้างอิงไม่ถูกต้อง');
          const row = await store.receipt(reference); if (!row) throw new InputError('ไม่พบรายการ',undefined,404,'NOT_FOUND');
          const ext = {'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'}[row.receipt_mime];
          if (!ext) throw new Error('INVALID_STORED_MIME');
          const bytes = Buffer.from(row.receipt_base64.replace(/\s/g,''),'base64');
          res.statusCode=200;res.setHeader('Content-Type',row.receipt_mime);res.setHeader('Content-Length',bytes.length);
          res.setHeader('Content-Disposition',`attachment; filename="${reference}.${ext}"`);res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.end(bytes);return;
        }
        throw new InputError('คำสั่งไม่ถูกต้อง');
      }
      const data = await readJson(req);
      if (data.action === 'test_notification') {
        const id = randomUUID(); await store.persistenceProbe(id,time);
        let result;try {result=await notifier(testText(id));} catch {result={status:'failed',code:'NOTIFIER_FAILED'};}
        result={status:['sent','failed','unconfigured'].includes(result?.status)?result.status:'failed',code:/^[A-Z0-9_]{1,80}$/.test(result?.code || '')?result.code:'NOTIFICATION_RESULT'};
        return sendJson(res,{ok:result.status==='sent',test:true,testReference:`TEST-${id}`,databaseWriteReadDelete:true,notification:result},result.status==='sent'?200:502);
      }
      const reference = typeof data.reference === 'string' ? data.reference : '';
      if (!REFERENCE.test(reference)) throw new InputError('เลขอ้างอิงไม่ถูกต้อง','reference');
      const row = await store.get(reference); if (!row) throw new InputError('ไม่พบรายการ',undefined,404,'NOT_FOUND');
      const note = clean(data.note,1000);
      if(data.action==='bind_account'){
        if(!school)throw new InputError('ระบบผูกบัญชียังไม่พร้อม',undefined,503,'SERVICE_UNCONFIGURED');
        const email=typeof data.accountEmail==='string'?data.accountEmail.trim().toLowerCase():'';
        if(!note || !email || email.length>254)throw new InputError('กรอกอีเมลบัญชีและบันทึกการตรวจให้ครบ',undefined,400,'LEGACY_BINDING_FIELDS_REQUIRED');
        if(row.account_id && row.legacy_bound_at && row.legacy_bound_by==='ai-source-admin' && email===String(row.email || '').trim().toLowerCase()){
          await school.recorded(database(),row);return sendJson(res,{ok:true,replayed:true,registration:adminRegistration(row)});
        }
        const bound=await store.bindLegacyAccount(reference,email,note,time);
        if(!bound)throw new InputError('ผูกได้เฉพาะรายการเดิมที่ยังไม่มีบัญชี อีเมลต้องตรงสลิปและเป็นบัญชีที่ยืนยันอีเมลแล้ว',undefined,409,'LEGACY_BINDING_NOT_ELIGIBLE');
        await school.recorded(database(),bound);
        return sendJson(res,{ok:true,registration:adminRegistration(bound)});
      }
      if (data.action === 'retry_notification') return sendJson(res,{ok:true,reference,notification:await deliver(store,row,notifier,time)});
      let updated;
      if (data.action === 'verify_payment') {
        if (data.confirmedReceived !== true) throw new InputError('ผู้ดูแลต้องยืนยันว่าได้ตรวจยอดเงินเข้าจริงแล้ว','confirmedReceived');
        const amount = parseAmount(data.verifiedAmountTHB,'verifiedAmountTHB'); const transferred = parseTransferTime(data.verifiedTransferredAt,time,'verifiedTransferredAt');
        let bankTransactionId = null;
        if(school && row.account_id)bankTransactionId=await school.verify(database(),row,amount,transferred,data);
        else {const required = amountDueAt({expires:new Date(row.offer_expires_at).getTime()},transferred);
          if (amount < required*100) throw new InputError(`ยอดที่ตรวจพบต่ำกว่าราคาที่ใช้ ณ เวลาโอน (${required} บาท)`,'verifiedAmountTHB',409,'PAYMENT_SHORT');}
        if (['payment_verified','admitted'].includes(row.status) && Number(row.verified_amount_satang) === amount && iso(row.verified_transferred_at) === transferred) {
          if(bankTransactionId && String(row.bank_transaction_id || '').trim().toUpperCase()!==bankTransactionId)throw new InputError('รหัสโอนไม่ตรงกับรายการที่ตรวจไว้ กรุณาโหลดรายการเดิม',undefined,409,'BANK_TRANSACTION_CONFLICT');
          if(school && row.account_id){
            await school.recorded(database(),row);
            await school.grant(database(),{reference,actorId:'ai-source-admin',note,now:time});
          }
          return sendJson(res,{ok:true,replayed:true,registration:adminRegistration(await store.get(reference))});
        }
        try {updated = await store.verify(reference,amount,transferred,note,time,bankTransactionId);} catch(error){if(error?.code==='23505')throw new InputError('รายการโอนนี้ถูกใช้แล้ว กรุณาตรวจรายการเดิม',undefined,409,'DUPLICATE_BANK_TRANSACTION');throw error;}
      } else if (data.action === 'mark_admitted') {
        if (data.accessSent !== true) throw new InputError('ยืนยันเปิดสิทธิ์เรียนให้บัญชีนี้','accessSent');
        if (row.status === 'admitted') {
          if(school && row.account_id)await school.recorded(database(),row);
          return sendJson(res,{ok:true,replayed:true,registration:adminRegistration(row)});
        }
        if(school && row.account_id){await school.grant(database(),{reference,actorId:'ai-source-admin',note,now:time});updated=await store.get(reference);}
        else if(school)throw new InputError('รายการเดิมยังไม่ผูกบัญชี กรุณายืนยันบัญชีผู้ซื้อก่อนเปิดสิทธิ์',undefined,409,'ACCOUNT_BINDING_REQUIRED');
        else updated = await store.admit(reference,note,time);
      } else if (data.action === 'reject') {
        if (!note) throw new InputError('ระบุเหตุผลที่ต้องติดต่อผู้ซื้อหรือปฏิเสธรายการ','note');
        updated = await store.reject(reference,note,time);
      } else throw new InputError('คำสั่งไม่ถูกต้อง','action');
      if (!updated) throw new InputError('สถานะรายการเปลี่ยนแล้วหรือยังไม่พร้อมสำหรับคำสั่งนี้ กรุณาโหลดรายการใหม่',undefined,409,'STATUS_CONFLICT');
      if(school && updated.account_id){
        await school.recorded(database(),updated);
        if(data.action==='verify_payment'){
          await school.grant(database(),{reference,actorId:'ai-source-admin',note,now:time});
          updated=await store.get(reference);
          if(updated?.status!=='admitted')throw new InputError('ยืนยันเงินแล้ว แต่ยังเปิดสิทธิ์ไม่สำเร็จ กรุณารีเฟรชแล้วกดเปิดสิทธิ์อีกครั้ง',undefined,503,'ACCESS_GRANT_INCOMPLETE');
        }
      }
      return sendJson(res,{ok:true,registration:adminRegistration(updated)});
    } catch (error) {
      if (error instanceof InputError || error instanceof LearnError) return sendJson(res,{ok:false,code:error.code,field:error.field,message:error.message},error.status);
      log(error?.code === 'DATABASE_URL_NOT_CONFIGURED' ? 'AI_SOURCE_DATABASE_UNCONFIGURED' : 'AI_SOURCE_API_FAILED');
      return sendJson(res,{ok:false,code:'PERSISTENCE_UNAVAILABLE',message:'ระบบบันทึกข้อมูลสะดุด กรุณาส่งซ้ำด้วยรายการเดิม'},error?.code === 'DATABASE_URL_NOT_CONFIGURED'?503:500);
    }
  };
}
