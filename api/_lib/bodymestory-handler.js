import { createBodymestoryStore } from './bodymestory-store.js';
import { BodyInputError, CONSENT_VERSION, DOWNLOAD_URL, adminAccess, clean, csvCell, hash,
  publicConfig, rateBuckets, readBody, sameOrigin, validateIntake } from './bodymestory-domain.js';

export function createBodymestoryHandler({ database, sendJson, config = process.env,
  createStore = createBodymestoryStore, clock = () => new Date() }) {
  return async function bodymestoryHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method === 'GET' && req.query?.public === 'config') return sendJson(res, publicConfig(config));
      if (req.method === 'POST') {
        if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'ORIGIN_NOT_ALLOWED', message: 'กรุณาส่งฟอร์มจากหน้าเว็บ myClover' }, 403);
        const data = readBody(req);
        if (clean(data.website, 200)) return sendJson(res, { ok: true, eventId: null, downloadUrl: DOWNLOAD_URL }, 201);
        const input = validateIntake(data);
        input.payloadHash = hash(JSON.stringify({ campaign: input.campaign,email: input.email,name: input.name,
          privacyAcknowledged:true,marketingConsent:input.marketingConsent,adsConsent:input.adsConsent,
          source:input.source,episode:input.episode,utm:input.utm,consentVersion:CONSENT_VERSION }));
        const store = createStore(database());
        const now = clock();
        if (!await store.rateLimit(rateBuckets(req,input.email),now)) {
          res.setHeader('Retry-After', '3600');
          return sendJson(res, { ok:false,error:'RATE_LIMITED',message:'ส่งฟอร์มถี่เกินไป ลองใหม่อีกครั้งในภายหลัง' }, 429);
        }
        const result = await store.register(input,now);
        if (!result?.eventId) throw new Error('LEAD_WRITE_NOT_CONFIRMED');
        return sendJson(res, { ok:true,eventId:result.eventId,downloadUrl:DOWNLOAD_URL }, 201);
      }
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return sendJson(res, { ok:false,error:'METHOD_NOT_ALLOWED' }, 405);
      }
      const access = adminAccess(req,config);
      if (!access.ok) {
        if (access.unconfigured) return sendJson(res, {ok:false,error:'ADMIN_NOT_CONFIGURED'},503);
        res.setHeader('WWW-Authenticate', 'Basic realm="myClover Giveaway Registry", charset="UTF-8"');
        return sendJson(res, {ok:false,error:'AUTH_REQUIRED'},401);
      }
      const rawLimit = req.query?.limit ?? 500;
      const limit = Number(rawLimit);
      if (!Number.isInteger(limit) || limit<1 || limit>1000) return sendJson(res, {ok:false,error:'INVALID_LIMIT'},400);
      const rows = await createStore(database()).list(limit);
      if (req.query?.format === 'csv') {
        const fields = ['id','campaign','name','email','marketing_consent_at','marketing_consent_version','ads_consent_at','ads_consent_version',
          'privacy_acknowledged_at','privacy_version','first_source','last_source','first_episode','last_episode','created_at','updated_at'];
        const table = [fields,...rows.map(row=>fields.map(field=>row[field]))];
        res.statusCode=200;
        res.setHeader('Content-Type','text/csv; charset=utf-8');
        res.setHeader('Content-Disposition','attachment; filename="bodymestory-leads.csv"');
        return res.end('\ufeff'+table.map(row=>row.map(csvCell).join(',')).join('\r\n'));
      }
      return sendJson(res,{ok:true,count:rows.length,leads:rows});
    } catch(error) {
      if (error instanceof BodyInputError) return sendJson(res,{ok:false,error:error.code,field:error.field,message:error.message},error.status);
      // Do not log bodies, SQL parameters or provider errors that may contain PII.
      return sendJson(res,{ok:false,error:'PERSISTENCE_UNAVAILABLE',message:'ยังบันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'},503);
    }
  };
}
