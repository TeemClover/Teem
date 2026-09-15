import { randomUUID, createHash } from 'node:crypto';
import { currentUser, ensureSchema } from './core.js';
import { InputError, issueOffer, readOffer, hasOfferCookie, publicOffer, amountDueAt, UUID } from './ai-source-domain.js';
import { recordLearnRegistration, grantForVerifiedRegistration, ensureLearnSchema } from './learn-store.js';
import { enrollLearnCourse } from './learn-authorization.js';
import { learnAccountWrite } from './learn-commerce-lock.js';

export const COURSE_ID = 'ai-sauce';
export const RECOVERY_MS = 2 * 60 * 60 * 1000;
const schemaPromises = new WeakMap();
export async function ensureCommerceSchema(sql) {
  if (!schemaPromises.has(sql)) {
    const promise = initializeCommerceSchema(sql)
      .catch(error => { schemaPromises.delete(sql); throw error; });
    schemaPromises.set(sql, promise);
  }
  return schemaPromises.get(sql);
}
async function initializeCommerceSchema(sql) {
  await ensureLearnSchema(sql);
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_learn_offers (
    id UUID PRIMARY KEY,user_id TEXT NOT NULL REFERENCES mc_accounts(id),course_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('launch','recovery')),first_seen_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
    checkout_started_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL,UNIQUE(user_id,course_id,kind))`);
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_learn_checkouts (
    id UUID PRIMARY KEY,user_id TEXT NOT NULL REFERENCES mc_accounts(id),course_id TEXT NOT NULL,
    offer_id UUID NOT NULL REFERENCES mc_learn_offers(id),quoted_amount_thb INTEGER NOT NULL CHECK(quoted_amount_thb IN(790,990,1690)),
    issued_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','submitted','paid')),
    reference TEXT UNIQUE,UNIQUE(user_id,course_id,offer_id,quoted_amount_thb))`);
  await sql.query('ALTER TABLE mc_learn_checkouts ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 0 CHECK(generation>=0)');
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_learn_checkouts_generation ON mc_learn_checkouts(user_id,course_id,offer_id,quoted_amount_thb,generation)');
  await sql.query(`DO $$ DECLARE old_constraint RECORD; BEGIN FOR old_constraint IN
    SELECT conname FROM pg_constraint WHERE conrelid='mc_learn_checkouts'::regclass AND contype='u'
      AND pg_get_constraintdef(oid)='UNIQUE (user_id, course_id, offer_id, quoted_amount_thb)'
    LOOP EXECUTE format('ALTER TABLE mc_learn_checkouts DROP CONSTRAINT %I',old_constraint.conname); END LOOP; END $$`);
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_learn_funnel_events (
    id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES mc_accounts(id),course_id TEXT NOT NULL,event TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,utm_source TEXT,utm_medium TEXT,utm_campaign TEXT)`);
}
export function requiredCheckoutAmount(checkout, when) {
  const time = new Date(when).getTime(), issued = new Date(checkout.issued_at).getTime(), expires = new Date(checkout.expires_at).getTime();
  if (![time,issued,expires].every(Number.isFinite) || expires<=issued || ![790,990,1690].includes(Number(checkout.quoted_amount_thb))) throw new InputError('ข้อมูลรายการชำระไม่สมบูรณ์ กรุณาติดต่อผู้ดูแล',undefined,409,'CHECKOUT_INVALID');
  if (time < issued) throw new InputError('เวลาโอนอยู่ก่อนเปิดรายการนี้ กรุณาติดต่อผู้ดูแล','verifiedTransferredAt',409,'TRANSFER_BEFORE_CHECKOUT');
  if (time >= expires) throw new InputError('โอนหลังหมดสิทธิ์ของรายการนี้ กรุณาจัดการส่วนต่างหรือคืนเงินก่อนอนุมัติ','verifiedTransferredAt',409,'OFFER_EXPIRED_AT_TRANSFER');
  return Number(checkout.quoted_amount_thb);
}
export function recoveryEligible({launch, recovery, blocked, now}) {
  return Boolean(launch?.checkout_started_at && new Date(launch.expires_at) <= now && !recovery && !blocked);
}
function shape(row) {return {id:row.id,firstSeen:new Date(row.first_seen_at).getTime(),expires:new Date(row.expires_at).getTime()};}
export function cartShape(row,time=new Date()) {const expired=new Date(row.expires_at)<=time;return {id:row.id,priceTHB:Number(row.quoted_amount_thb),issuedAt:new Date(row.issued_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),status:row.status,reference:row.reference || null,expired,priceActive:!expired && row.status==='open',canSubmitReceipt:row.status==='open'};}
export function isBoundLegacyRegistration(row) {return Boolean(row.account_id && !row.checkout_id && row.legacy_quote_eligible===true && row.legacy_bound_at && row.legacy_bound_by==='ai-source-admin');}
export function createLearnCommerce({config=process.env,lookupUser=currentUser,ensureCore=ensureSchema,
  ensureCommerce=ensureCommerceSchema,enroll=enrollLearnCourse,recordRegistration=recordLearnRegistration,grant=grantForVerifiedRegistration}={}) {
  async function userFor(req,sql) {
    await ensureCore(sql);
    const user=await lookupUser(req,sql);
    if (!user) throw new InputError('เข้าสู่บัญชี myClover ก่อนลงทะเบียน',undefined,401,'LOGIN_REQUIRED');
    if (!user.emailVerified || !user.email) throw new InputError('ยืนยันอีเมลเพื่อผูกสิทธิ์กับบัญชีของคุณ',undefined,403,'EMAIL_VERIFICATION_REQUIRED');
    const account=(await sql.query('SELECT email_verified_at FROM mc_accounts WHERE id=$1',[user.id]))[0];
    if(!account?.email_verified_at)throw new InputError('ยืนยันอีเมลเพื่อผูกสิทธิ์กับบัญชีของคุณ',undefined,403,'EMAIL_VERIFICATION_REQUIRED');
    await ensureCommerce(sql);return user;
  }
  async function blocked(sql,userId) {
    const rows=await sql.query(`SELECT 1 FROM mc_ai_source_registrations WHERE account_id=$1 AND status IN('pending_verification','payment_verified','admitted') LIMIT 1`,[userId]);
    if(rows.length)return true;
    const grants=await sql.query(`SELECT 1 FROM mc_learn_grants WHERE user_id=$1 AND course_id=$2 LIMIT 1`,[userId,COURSE_ID]);
    return grants.length>0;
  }
  async function launchFor(req,sql,user,time) {
    const signed=readOffer(req,config.MEET_ADMIN_KEY,time);
    if(!signed && hasOfferCookie(req))throw new InputError('ข้อมูลสิทธิ์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล',undefined,409,'OFFER_INVALID');
    const prior=signed?.offer || issueOffer(time,config.MEET_ADMIN_KEY).offer;
    const rows=await sql.query(`INSERT INTO mc_learn_offers(id,user_id,course_id,kind,first_seen_at,expires_at,created_at)
      VALUES($1,$2,$3,'launch',$4,$5,$6) ON CONFLICT(user_id,course_id,kind) DO UPDATE SET
      first_seen_at=LEAST(mc_learn_offers.first_seen_at,EXCLUDED.first_seen_at),expires_at=LEAST(mc_learn_offers.expires_at,EXCLUDED.expires_at)
      RETURNING *`,[randomUUID(),user.id,COURSE_ID,new Date(prior.firstSeen),new Date(prior.expires),time]);return rows[0];
  }
  async function offer(req,sql,time) {
    await ensureCore(sql);const user=await lookupUser(req,sql);
    if(!user?.emailVerified)return null;
    await userFor(req,sql);
    const launch=await launchFor(req,sql,user,time),recovery=(await sql.query(`SELECT * FROM mc_learn_offers WHERE user_id=$1 AND course_id=$2 AND kind='recovery'`,[user.id,COURSE_ID]))[0];
    const actualCheckout=(await sql.query(`SELECT 1 FROM mc_learn_checkouts WHERE user_id=$1 AND course_id=$2 AND offer_id=$3
      AND quoted_amount_thb=990 AND issued_at<$4 LIMIT 1`,[user.id,COURSE_ID,launch.id,launch.expires_at])).length>0;
    const isBlocked=await blocked(sql,user.id);
    const latestCheckout=(await sql.query('SELECT id FROM mc_learn_checkouts WHERE user_id=$1 AND course_id=$2 ORDER BY issued_at DESC,id DESC LIMIT 1',[user.id,COURSE_ID]))[0];
    return {offer:publicOffer(shape(launch),time),school:{user:{email:user.email,displayName:user.displayName},blocked:isBlocked,
      checkoutId:latestCheckout?.id || null,
      recoveryAvailable:actualCheckout && recoveryEligible({launch,recovery,blocked:isBlocked,now:time}),
      recovery:recovery&&!isBlocked?{priceTHB:790,firstSeenAt:new Date(recovery.first_seen_at).toISOString(),expiresAt:new Date(recovery.expires_at).toISOString(),active:time<new Date(recovery.expires_at)}:null}};
  }
  async function restore(req,sql,checkoutId,time) {
    const user=await userFor(req,sql);
    if(!UUID.test(checkoutId || ''))throw new InputError('เลขรายการชำระไม่ถูกต้อง','checkoutId');
    const checkout=(await sql.query(`SELECT c.*,r.reference AS saved_reference,r.status AS registration_status
      FROM mc_learn_checkouts c LEFT JOIN mc_ai_source_registrations r ON r.checkout_id=c.id AND r.account_id=c.user_id
      WHERE c.id=$1 AND c.user_id=$2 AND c.course_id=$3`,[checkoutId,user.id,COURSE_ID]))[0];
    if(!checkout)throw new InputError('ไม่พบรายการชำระของบัญชีนี้',undefined,404,'CHECKOUT_NOT_FOUND');
    if(checkout.saved_reference){checkout.reference=checkout.saved_reference;checkout.status=['payment_verified','admitted'].includes(checkout.registration_status)?'paid':'submitted';}
    return {ok:true,restored:true,checkout:cartShape(checkout,time),user:{email:user.email,displayName:user.displayName}};
  }
  async function act(req,sql,action,data,time) {
    // Restoring a receipt cart is read-only, even after expiry or a later grant.
    if(action==='checkout' && data.checkoutId!==undefined)return restore(req,sql,data.checkoutId,time);
    const user=await userFor(req,sql);await enroll(sql,req,{courseId:COURSE_ID});
    const launch=await launchFor(req,sql,user,time);
    if(await blocked(sql,user.id))throw new InputError('มีรายการสมัครหรือสิทธิ์เรียนอยู่แล้ว เปิดดูสถานะในห้องเรียน',undefined,409,'ALREADY_REGISTERED');
    if(action==='recovery'){
      // Price is issued once, only after a real checkout and the first offer ended.
      const rows=await learnAccountWrite(sql,user.id,`INSERT INTO mc_learn_offers(id,user_id,course_id,kind,first_seen_at,expires_at,created_at)
        SELECT $1,$2,$3,'recovery',$4,$5,$4 WHERE EXISTS(
          SELECT 1 FROM mc_learn_offers o JOIN mc_learn_checkouts c ON c.offer_id=o.id AND c.user_id=o.user_id AND c.course_id=o.course_id
          WHERE o.id=$6 AND o.user_id=$2 AND o.course_id=$3 AND o.kind='launch' AND o.expires_at<=$4
            AND c.quoted_amount_thb=990 AND c.issued_at<o.expires_at)
        AND NOT EXISTS(SELECT 1 FROM mc_ai_source_registrations WHERE account_id=$2 AND status IN('pending_verification','payment_verified','admitted'))
        AND NOT EXISTS(SELECT 1 FROM mc_learn_grants WHERE user_id=$2 AND course_id=$3)
        ON CONFLICT(user_id,course_id,kind) DO NOTHING RETURNING *`,[randomUUID(),user.id,COURSE_ID,time,new Date(time.getTime()+RECOVERY_MS),launch.id]);
      const row=rows[0]||(await sql.query(`SELECT * FROM mc_learn_offers WHERE user_id=$1 AND course_id=$2 AND kind='recovery'`,[user.id,COURSE_ID]))[0];
      if(!row||new Date(row.expires_at)<=time||await blocked(sql,user.id))throw new InputError('ไม่มีสิทธิ์ข้อเสนอนี้หรือหมดเวลาแล้ว',undefined,409,'RECOVERY_UNAVAILABLE');
      return {ok:true,priceTHB:790,expiresAt:new Date(row.expires_at).toISOString()};
    }
    if(action!=='checkout')throw new InputError('คำสั่งไม่ถูกต้อง');
    const recovery=(await sql.query(`SELECT * FROM mc_learn_offers WHERE user_id=$1 AND course_id=$2 AND kind='recovery' AND expires_at>$3`,[user.id,COURSE_ID,time]))[0];
    const selected=recovery||launch,price=recovery?790:time<new Date(launch.expires_at)?990:1690;
    const expires=price===1690?new Date(time.getTime()+86400000):new Date(selected.expires_at);
    const rows=await learnAccountWrite(sql,user.id,`WITH cart AS (
      INSERT INTO mc_learn_checkouts(id,user_id,course_id,offer_id,quoted_amount_thb,issued_at,expires_at,generation)
      SELECT $1,$2,$3,$4,$5,$6,$7,CASE WHEN $5::integer=1690 THEN COALESCE(
        (SELECT generation FROM mc_learn_checkouts WHERE user_id=$2 AND course_id=$3 AND offer_id=$4
          AND quoted_amount_thb=1690 AND expires_at>$6 ORDER BY generation DESC LIMIT 1),
        (SELECT COALESCE(MAX(generation),-1)+1 FROM mc_learn_checkouts WHERE user_id=$2 AND course_id=$3 AND offer_id=$4 AND quoted_amount_thb=1690))
        ELSE 0 END WHERE NOT EXISTS(
        SELECT 1 FROM mc_ai_source_registrations WHERE account_id=$2 AND status IN('pending_verification','payment_verified','admitted'))
        AND NOT EXISTS(SELECT 1 FROM mc_learn_grants WHERE user_id=$2 AND course_id=$3)
      ON CONFLICT(user_id,course_id,offer_id,quoted_amount_thb,generation) DO UPDATE SET id=mc_learn_checkouts.id RETURNING *
    ), started AS (
      UPDATE mc_learn_offers SET checkout_started_at=COALESCE(checkout_started_at,$6)
      WHERE id=$8 AND EXISTS(SELECT 1 FROM cart) RETURNING id
    ) SELECT cart.* FROM cart JOIN started ON TRUE`,[randomUUID(),user.id,COURSE_ID,selected.id,price,time,expires,launch.id]);
    if(!rows[0])throw new InputError('มีรายการสมัครหรือสิทธิ์เรียนแล้ว กรุณาดูสถานะในห้องเรียน',undefined,409,'ALREADY_REGISTERED');
    const row=rows[0];if(new Date(row.expires_at)<=time)throw new InputError('รายการเดิมหมดเวลา กรุณาติดต่อผู้ดูแลก่อนโอน',undefined,409,'CHECKOUT_EXPIRED');
    const trim=v=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,'').slice(0,160):null;
    await sql.query(`INSERT INTO mc_learn_funnel_events(user_id,course_id,event,occurred_at,utm_source,utm_medium,utm_campaign) VALUES($1,$2,'checkout_started',$3,$4,$5,$6)`,[user.id,COURSE_ID,time,trim(data.utm_source),trim(data.utm_medium),trim(data.utm_campaign)]);
    return {ok:true,checkout:cartShape(row,time),user:{email:user.email,displayName:user.displayName}};
  }
  async function bind(req,sql,data,intake,time) {
    const user=await userFor(req,sql);
    if(!UUID.test(data.checkoutId||''))throw new InputError('เปิดรายละเอียดชำระจากปุ่มสมัครเรียนก่อนโอน',undefined,428,'CHECKOUT_REQUIRED');
    const row=(await sql.query('SELECT * FROM mc_learn_checkouts WHERE id=$1 AND user_id=$2 AND course_id=$3',[data.checkoutId,user.id,COURSE_ID]))[0];
    if(!row)throw new InputError('ไม่พบรายการชำระของบัญชีนี้',undefined,404,'CHECKOUT_NOT_FOUND');
    if(intake.email!==user.email.toLowerCase())throw new InputError('ใช้อีเมลบัญชีที่ยืนยันไว้','email',409,'ACCOUNT_EMAIL_MISMATCH');
    // Accept late-uploaded evidence for review; never treat claimed timestamps as proof.
    intake.accountId=user.id;intake.checkoutId=row.id;intake.quotedAmountTHB=Number(row.quoted_amount_thb);
    intake.payloadHash=createHash('sha256').update(intake.payloadHash+':'+user.id+':'+row.id).digest('hex');
    const selected=(await sql.query('SELECT * FROM mc_learn_offers WHERE id=$1',[row.offer_id]))[0];
    intake.boundOffer=shape(selected);return intake;
  }
  async function recorded(sql,row) {
    if(!row.checkout_id){
      if(!isBoundLegacyRegistration(row))throw new InputError('รายการเดิมยังไม่ได้ผูกบัญชีโดยผู้ดูแล',undefined,409,'ACCOUNT_BINDING_REQUIRED');
      await recordRegistration(sql,{reference:row.reference,courseId:COURSE_ID,userId:row.account_id});return;
    }
    const status=['payment_verified','admitted'].includes(row.status)?'paid':'submitted';
    const updated=await sql.query(`UPDATE mc_learn_checkouts SET status=CASE WHEN status='paid' THEN 'paid' ELSE $4 END,reference=$2
      WHERE id=$1 AND user_id=$3 AND (reference IS NULL OR reference=$2) RETURNING id`,[row.checkout_id,row.reference,row.account_id,status]);
    if(!updated[0])throw new InputError('รายการชำระนี้ผูกกับรายการอื่นแล้ว',undefined,409,'CHECKOUT_CONFLICT');
    await recordRegistration(sql,{reference:row.reference,courseId:COURSE_ID,userId:row.account_id});
  }
  async function verify(sql,row,amount,transferred,data) {
    let required;
    if(isBoundLegacyRegistration(row)){
      const expires=new Date(row.offer_expires_at).getTime();
      if(!Number.isFinite(expires))throw new InputError('ข้อมูลสิทธิ์เดิมไม่สมบูรณ์',undefined,409,'CHECKOUT_INVALID');
      required=amountDueAt({expires},transferred);
    } else {
      const checkout=(await sql.query('SELECT * FROM mc_learn_checkouts WHERE id=$1 AND user_id=$2',[row.checkout_id,row.account_id]))[0];
      if(!checkout)throw new InputError('รายการยังไม่ผูกบัญชีและสิทธิ์ราคา',undefined,409,'CHECKOUT_NOT_FOUND');
      required=requiredCheckoutAmount(checkout,transferred);
    }
    if(amount<required*100)throw new InputError(`ยอดที่ตรวจพบต่ำกว่าสิทธิ์ ${required} บาท`,'verifiedAmountTHB',409,'PAYMENT_SHORT');
    const bankRef=typeof data.bankTransactionId==='string'?data.bankTransactionId.trim().toUpperCase():'';
    if(!/^[A-Za-z0-9._:/-]{6,120}$/.test(bankRef))throw new InputError('กรอกรหัสรายการโอนจากธนาคารเพื่อกันสลิปซ้ำ','bankTransactionId');
    return bankRef;
  }
  return {offer,act,restore,bind,recorded,verify,grant};
}
