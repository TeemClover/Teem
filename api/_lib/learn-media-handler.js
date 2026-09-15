import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { get } from '@vercel/blob';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { database } from './core.js';
import { authorizeLearnMedia } from './learn-media-authorization.js';
import { LearnError } from './learn-domain.js';
import { LEARN_ASSETS } from './learn-catalog.js';
import { PRIVATE_VIDEO_CACHE, videoETag, videoPreconditionStatus, ifRangeMatches, mediaConditionalRequest } from './learn-media-cache.js';

const mediaSchemaPromises = new WeakMap();
export async function ensureLearnMediaSchema(sql) {
  if (!mediaSchemaPromises.has(sql)) {
    const promise = sql.query(`CREATE TABLE IF NOT EXISTS mc_learn_media (
    asset_id TEXT PRIMARY KEY,pathname TEXT NOT NULL UNIQUE,content_type TEXT NOT NULL,
    bytes BIGINT NOT NULL CHECK(bytes>0),sha256 TEXT NOT NULL,verified_at TIMESTAMPTZ NOT NULL)`)
      .catch(error => { mediaSchemaPromises.delete(sql); throw error; });
    mediaSchemaPromises.set(sql, promise);
  }
  return mediaSchemaPromises.get(sql);
}

// Only the exact opaque upload name may resolve; request URLs and arbitrary DB paths cannot.
export function learnMediaPathname(asset, registryAssets = LEARN_ASSETS) {
  const extension = /\.([a-z0-9]+)$/i.exec(asset?.filename || '')?.[1].toLowerCase();
  if (!/^m_[a-f0-9]{32}$/.test(asset?.id || '') || !extension) return null;
  const index = registryAssets.findIndex(row => row.id === asset.id);
  if (index < 0 || index > 999) return null;
  // Frozen upload inventory uses 000.ext...185.ext in this exact catalog order.
  // Future additions must append, or migrate the registry and upload mapping together.
  return `learn/${String(index).padStart(3, '0')}.${extension}`;
}

export function mediaRange(header, size, maxBytes = 4 * 1024 * 1024) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new LearnError('MEDIA_NOT_READY', 503);
  if (!header) return null;
  const match = typeof header === 'string' && /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new LearnError('INVALID_RANGE', 416);
  const suffix = !match[1];
  const first = Number(match[1] || match[2]);
  const last = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || (suffix && first === 0)) throw new LearnError('INVALID_RANGE', 416);
  const start = suffix ? Math.max(0, size - Math.min(first, maxBytes)) : first;
  const end = suffix ? size - 1 : Math.min(last, size - 1, start + maxBytes - 1);
  if (start < 0 || start >= size || end < start) throw new LearnError('INVALID_RANGE', 416);
  return { start, end, value: `bytes=${start}-${end}` };
}

export async function privateBlobCredentials(config, getOidcToken = getVercelOidcToken) {
  const token = config.LEARN_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  const storeId = config.LEARN_BLOB_STORE_ID?.trim();
  if (!storeId || !/^(?:store_)?[a-z0-9]+$/i.test(storeId)) throw new LearnError('MEDIA_STORAGE_UNCONFIGURED', 503);
  let oidcToken;
  try { oidcToken = (await getOidcToken())?.trim(); } catch { /* fail closed below */ }
  if (!oidcToken) throw new LearnError('MEDIA_STORAGE_UNCONFIGURED', 503);
  // Resolve OIDC explicitly: SDK fallback BLOB_READ_WRITE_TOKEN belongs to another store.
  return { storeId, oidcToken };
}

export function createLearnMediaHandler({
  getSql = database, ensureCoreSchema = async()=>{}, authorize = authorizeLearnMedia,
  getBlob = get, getOidcToken = getVercelOidcToken, config = process.env, registryAssets = LEARN_ASSETS,
  timingLog = data => console.info('LEARN_MEDIA_TIMING',JSON.stringify(data)),
} = {}) {
  return async (req, res) => {
    for (const key of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(key, 'private, no-store');
    res.setHeader('Vary', 'Cookie');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    let size;const started=performance.now(),timings={},validatorMetrics={};let validatorMarkers=[];
    const measure=async(name,fn)=>{const begin=performance.now();try{return await fn();}finally{timings[name]=Math.max(0,Math.round((performance.now()-begin)*10)/10);}};
    const timingHeaders=()=>{res.setHeader('Server-Timing',[...Object.entries({...timings,headers:Math.max(0,Math.round((performance.now()-started)*10)/10)}).map(([name,ms])=>`${name};dur=${ms}`),...validatorMarkers].join(', '));};
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD'); throw new LearnError('METHOD_NOT_ALLOWED', 405);
      }
      const url = new URL(req.url, 'https://learn.invalid'), values = {};
      for (const key of ['courseId', 'lessonId', 'assetId']) {
        const found = url.searchParams.getAll(key);
        if (found.length !== 1 || !found[0]) throw new LearnError('INVALID_QUERY');
        values[key] = found[0];
      }
      const sql = getSql();
      const permitted = await measure('authorization',async()=>{await ensureCoreSchema(sql);return authorize(sql,req,values);});
      // The production authorizer returns the registry from its same fresh SQL
      // read. The fallback supports alternate trusted server authorizers only.
      const row = permitted.mediaRow!==undefined ? permitted.mediaRow
        : (await sql.query('SELECT pathname,content_type,bytes,sha256 FROM mc_learn_media WHERE asset_id=$1',[values.assetId]))[0];
      const asset = permitted.asset, pathname = learnMediaPathname(asset, registryAssets);
      size = Number(row?.bytes);
      if (!row || !pathname || row.pathname !== pathname || !Number.isSafeInteger(size) || size <= 0
        || size !== asset.bytes || row.content_type !== asset.contentType || !/^[a-f0-9]{64}$/.test(row.sha256)) {
        throw new LearnError('MEDIA_NOT_READY', 503, 'ไฟล์บทเรียนนี้กำลังเตรียม กรุณาติดต่อผู้สอน');
      }
      const etag = videoETag(asset, row);
      const videoCacheHeaders = () => {
        if (etag) { res.setHeader('ETag', etag); res.setHeader('Cache-Control', PRIVATE_VIDEO_CACHE); }
      };
      // Never validate a browser's cached bytes before checking current account
      // access and the complete private registry above. No Blob request is
      // needed for unchanged bytes; shared/CDN caches remain disabled.
      const conditional = mediaConditionalRequest(req.headers, { allowForwarded: url.pathname === '/api/learn-media' });
      const precondition = videoPreconditionStatus(conditional.headers, etag);
      if (etag) {
        const source=conditional.validatorSource,matched=precondition===304;
        Object.assign(validatorMetrics,{validatorNative:Number(source==='native'),validatorForwarded:Number(source==='forwarded'),
          validatorMissing:Number(source==='missing'),validatorMatch:Number(matched),validatorMismatch:Number(source!=='missing'&&!matched)});
        validatorMarkers=['validator_'+source,...(source==='missing'?[]:[matched?'validator_match':'validator_mismatch'])];
      }
      if (precondition === 412) throw new LearnError('MEDIA_PRECONDITION_FAILED', 412);
      if (precondition === 304) {
        res.statusCode = 304; videoCacheHeaders(); timingHeaders(); return res.end();
      }
      // Range applies to GET, while HEAD uses the same authorization without a blob read.
      // A failed If-Range must ignore Range entirely (even an invalid range),
      // so a browser cannot combine old cached bytes with a new representation.
      const range = req.method === 'GET' && ifRangeMatches(conditional.headers['if-range'], etag)
        ? mediaRange(conditional.headers.range, size) : null;
      const credentials = await measure('storage_auth',()=>privateBlobCredentials(config,getOidcToken));
      res.setHeader('Content-Type', asset.contentType); res.setHeader('Accept-Ranges', 'bytes');
      if (asset.kind !== 'video') {
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(asset.filename || 'course-file')}`);
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      }
      if (req.method === 'HEAD') { res.statusCode = 200; res.setHeader('Content-Length', size);videoCacheHeaders();timingHeaders();return res.end(); }
      const controller = new AbortController();
      res.once('close', () => { if (!res.writableFinished) controller.abort(); });
      const result = await measure('blob_headers',()=>getBlob(pathname, {
        access: 'private', ...credentials, headers: range ? { Range: range.value } : {}, abortSignal: controller.signal,
      }));
      if (!result?.stream) throw new LearnError('MEDIA_NOT_READY', 503);
      const contentRange = result.headers.get('content-range'), contentLength = result.headers.get('content-length');
      const expectedLength = range ? range.end - range.start + 1 : size;
      if ((range && contentRange !== `bytes ${range.start}-${range.end}/${size}`)
        || (!range && contentRange) || (contentLength !== null && Number(contentLength) !== expectedLength)) {
        await result.stream.cancel(); throw new LearnError('MEDIA_RANGE_UNAVAILABLE', 502);
      }
      res.statusCode = range ? 206 : 200;
      if (range) res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', expectedLength);
      videoCacheHeaders();
      timingHeaders();
      await pipeline(Readable.fromWeb(result.stream), res);
    } catch (error) {
      if (res.headersSent) { if (!res.writableEnded) res.destroy(); return; }
      const known = error instanceof LearnError; res.statusCode = known ? error.status : 503;
      if (!known) console.error('LEARN_MEDIA_UNAVAILABLE',String(error?.code || error?.name || 'UnknownError').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60));
      res.removeHeader('Content-Length'); res.removeHeader('Content-Disposition'); res.removeHeader('Content-Range');
      res.removeHeader('ETag'); res.setHeader('Cache-Control', 'private, no-store');
      if (res.statusCode === 416 && Number.isSafeInteger(size) && size > 0) res.setHeader('Content-Range', `bytes */${size}`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      timingHeaders();
      const body = JSON.stringify({ ok: false, code: known ? error.code : 'MEDIA_UNAVAILABLE', message: known ? error.message : 'ยังเปิดไฟล์ไม่ได้ กรุณาลองใหม่' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } finally {
      // Numeric durations, validator presence flags and HTTP status only: no cookie, account, path, asset
      // identifier or upstream URL is emitted to the performance log.
      timingLog({status:Number(res.statusCode)||0,...timings,...validatorMetrics,totalMs:Math.max(0,Math.round((performance.now()-started)*10)/10)});
    }
  };
}
