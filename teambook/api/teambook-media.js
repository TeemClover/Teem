import {
  currentUser, database, ensureSchema, sendJson, sha256,
} from './_lib/core.js';
import { validPartyCode } from './_lib/xty-rules.js';
import { partyMediaToken, readStoredImage } from './_lib/xty-image.js';

async function memberFor(req, sql, partyId, partyCode) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const token = partyMediaToken(req, partyCode);
  if (!token) return null;
  /* Native clients may use an account session as their bearer while local
     profiles use the per-party bearer. The media cookie can therefore carry
     either kind; try the account session before the membership hash. */
  const tokenRequest = Object.create(req);
  tokenRequest.headers = { ...(req.headers || {}), authorization: `Bearer ${token}` };
  const bearerAccount = await currentUser(tokenRequest, sql);
  if (bearerAccount) {
    const accountRows = await sql.query(`SELECT user_id FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${bearerAccount.id}`]);
    if (accountRows[0]) return accountRows[0];
  }
  const rows = await sql.query(`SELECT user_id FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

function imageHeaders(res, result) {
  res.setHeader('Content-Type', result.blob.contentType);
  res.setHeader('Content-Length', String(result.blob.size));
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('ETag', result.blob.etag);
  res.setHeader('Vary', 'Cookie, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export default async function handler(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const partyCode = String(req.query?.code || '').trim();
    if (!validPartyCode(partyCode)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database();
    await ensureSchema(sql);
    const parties = await sql.query('SELECT id,cover_type,cover_value FROM teambook_books WHERE code=$1', [partyCode]);
    const party = parties[0];
    if (!party) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!await memberFor(req, sql, party.id, partyCode)) {
      return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    }

    let storageUrl = '';
    if (String(req.query?.cover || '') === '1') {
      storageUrl = party.cover_type === 'image' ? String(party.cover_value || '') : '';
    } else {
      const seq = Number(req.query?.seq || 0);
      if (!Number.isSafeInteger(seq) || seq <= 0) {
        return sendJson(res, { ok: false, error: 'INVALID_IMAGE' }, 400);
      }
      const entries = await sql.query(`SELECT image_url FROM teambook_book_entries
        WHERE book_id=$1 AND seq=$2 AND retracted=FALSE LIMIT 1`, [party.id, seq]);
      storageUrl = String(entries[0]?.image_url || '');
    }
    if (!storageUrl) return sendJson(res, { ok: false, error: 'IMAGE_NOT_FOUND' }, 404);

    const result = await readStoredImage(storageUrl, { ifNoneMatch: req.headers['if-none-match'] });
    if (!result) return sendJson(res, { ok: false, error: 'IMAGE_NOT_FOUND' }, 404);
    if (result.statusCode === 304) {
      res.statusCode = 304;
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('ETag', result.blob.etag);
      res.setHeader('Vary', 'Cookie, Authorization');
      return res.end();
    }

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    imageHeaders(res, result);
    res.statusCode = 200;
    return res.end(buffer);
  } catch (error) {
    console.error('TeamBook private image route failed', error);
    return sendJson(res, { ok: false, error: 'IMAGE_READ_FAILED' }, 502);
  }
}
