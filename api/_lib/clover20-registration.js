import { createHash, randomUUID } from 'node:crypto';

const SCHEMA=`CREATE TABLE IF NOT EXISTS mc_clover20_rsvp (
  request_id UUID PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
const clean=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim():'';
const digest=value=>createHash('sha256').update(value).digest('hex');

export function validateRegistration(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))return {error:'ข้อมูลคำตอบรับไม่ถูกต้อง'};
  const name=clean(body.name),contact=clean(body.contact),message=clean(body.message);
  if(name.length<2||name.length>100)return {error:'กรอกชื่อระหว่าง 2–100 ตัวอักษรนะ'};
  if(contact.length<3||contact.length>150)return {error:'กรอกช่องทางที่เราติดต่อคุณได้อีกครั้งนะ'};
  if(message.length>500)return {error:'ฝากเรื่องเล่าได้ไม่เกิน 500 ตัวอักษรนะ'};
  if(body.consent!==true)return {error:'กรุณายินยอมให้ผู้จัดใช้ข้อมูลเพื่อประสานงานครั้งนี้'};
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId||''))return {error:'กรุณาโหลดหน้าใหม่แล้วลองตอบรับอีกครั้ง'};
  if(clean(body.website))return {error:'ยังส่งคำตอบรับไม่ได้ ลองอีกครั้งนะ'};
  return {value:{name,contact,message,requestId:body.requestId,consentVersion:'clover20-event-contact-v1',payloadHash:digest(JSON.stringify([name,contact,message]))}};
}

export function createRegistrationHandler({getStore, salt='local-preview'}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    const send=(code,body)=>res.status(code).json(body);
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{ok:false,message:'หน้านี้รับคำตอบรับผ่านแบบฟอร์มเท่านั้น'});}
    const host=String(req.headers.host||'');
    if(req.headers.origin){
      try{if(new URL(req.headers.origin).host!==host)return send(403,{ok:false,message:'กรุณาส่งคำตอบรับจากหน้าเชิญของ Clover'});}
      catch{return send(403,{ok:false,message:'ไม่สามารถยืนยันหน้าที่ส่งข้อมูลได้'});}
    }
    if(!String(req.headers['content-type']||'').includes('application/json'))return send(415,{ok:false,message:'รูปแบบข้อมูลไม่ถูกต้อง'});
    let body=req.body;
    try{if(typeof body==='string'){if(Buffer.byteLength(body)>8192)return send(413,{ok:false,message:'ข้อมูลยาวเกินไป'});body=JSON.parse(body);}}
    catch{return send(400,{ok:false,message:'ข้อมูลคำตอบรับไม่ถูกต้อง'});}
    if(Buffer.byteLength(JSON.stringify(body||{}))>8192)return send(413,{ok:false,message:'ข้อมูลยาวเกินไป'});
    const validation=validateRegistration(body);
    if(validation.error)return send(400,{ok:false,message:validation.error});
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
    const record={...validation.value,ipHash:digest(salt+':'+ip),reference:`CL20-${randomUUID().slice(0,8).toUpperCase()}`};
    try{
      const store=await getStore();
      const result=await store.save(record);
      if(result.conflict)return send(409,{ok:false,message:'คำตอบรับเดิมถูกบันทึกแล้ว กรุณาโหลดหน้าใหม่หากต้องการส่งข้อมูลใหม่'});
      if(result.limited){res.setHeader('Retry-After','3600');return send(429,{ok:false,message:'มีการส่งคำตอบรับหลายครั้ง กรุณารอสักครู่แล้วลองใหม่'});}
      return send(result.existing?200:201,{ok:true,reference:result.reference});
    }catch{
      // Never report acceptance until the durable write has completed.
      return send(503,{ok:false,message:'ระบบตอบรับยังไม่พร้อมในขณะนี้ ข้อมูลยังไม่ได้ส่ง กรุณาลองใหม่ภายหลัง'});
    }
  };
}

export function createSqlStore(sql) {
  let schemaReady;
  return {async save(record){
    schemaReady ||= sql.query(SCHEMA).catch(error=>{schemaReady=undefined;throw error;});
    await schemaReady;
    // The transaction-level lock serializes concurrent attempts from one source.
    // Idempotent retries return the already-committed reference, even at the limit.
    const results=await sql.transaction(tx=>[
      tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[record.ipHash]),
      tx.query(`INSERT INTO mc_clover20_rsvp (request_id,reference,name,contact,message,consent_version,payload_hash,ip_hash)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8
        WHERE (SELECT COUNT(*) FROM mc_clover20_rsvp WHERE ip_hash=$8 AND created_at>NOW()-INTERVAL '1 hour')<60
        ON CONFLICT (request_id) DO NOTHING
        RETURNING reference`,[record.requestId,record.reference,record.name,record.contact,record.message,record.consentVersion,record.payloadHash,record.ipHash]),
      tx.query('SELECT reference,payload_hash FROM mc_clover20_rsvp WHERE request_id=$1',[record.requestId]),
    ]);
    const existing=results[2][0];
    if(existing&&existing.payload_hash!==record.payloadHash)return {conflict:true};
    if(!existing)return {limited:true};
    return {reference:existing.reference,existing:!results[1].length};
  }};
}
