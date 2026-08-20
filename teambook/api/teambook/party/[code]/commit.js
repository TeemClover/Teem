import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from '../../../_lib/core.js';
import {
  TEAMBOOK_TIMEZONE, partyDateKey, validPartyCode,
} from '../../../_lib/xty-rules.js';
import {
  blobConfigured, decodeImagePayload, discardPartyImage, isCredentialError, storePartyImage,
} from '../../../_lib/xty-image.js';
import xtyHandler from '../../[...path].js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const value = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!value) return null;
  const rows = await sql.query(`SELECT user_id FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(value)]);
  return rows[0] || null;
}

async function intakeImage(partyCode, image) {
  if (!image) return { ok: true, stored: null };
  if (!blobConfigured()) return { ok: false, error: 'IMAGE_UPLOAD_NOT_CONFIGURED', status: 503 };
  const decoded = decodeImagePayload(image);
  if (decoded.error) return { ok: false, error: decoded.error, status: 400 };
  try {
    return { ok: true, stored: await storePartyImage(partyCode, decoded) };
  } catch (error) {
    console.error('TeamBook commit image upload failed', error);
    if (isCredentialError(error)) return { ok: false, error: 'IMAGE_UPLOAD_NOT_CONFIGURED', status: 503 };
    return { ok: false, error: 'IMAGE_UPLOAD_FAILED', status: 502 };
  }
}

export default async function handler(req, res) {
  let sql;
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const partyCode = String(req.query?.code || '').trim();
    if (!validPartyCode(partyCode)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    sql = database();
    await ensureSchema(sql);
    const rows = await sql.query(`SELECT id,state,timezone,activity_mode,activity_id,activity,
      shared_activity_color FROM teambook_books WHERE code=$1`, [partyCode]);
    const row = rows[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || 'ACTIVE').toUpperCase())) {
      return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    }

    const member = await memberFor(req, sql, row.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const body = bodyOf(req);
    const intake = await intakeImage(partyCode, body.image);
    if (!intake.ok) return sendJson(res, { ok: false, error: intake.error }, intake.status);

    const image = intake.stored || {};
    const imageUrl = image.url || null;
    const imageW = imageUrl ? image.width ?? null : null;
    const imageH = imageUrl ? image.height ?? null : null;
    const now = new Date();
    const key = partyDateKey(now, row.timezone || TEAMBOOK_TIMEZONE);
    const text = clean(body.note, 300) || '✓';

    try {
      await sql.query(`WITH next AS (
          UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$4
          WHERE id=$1 AND state = ANY($9::text[]) RETURNING head_seq
        )
        INSERT INTO teambook_book_entries (
          book_id,seq,user_id,kind,body,sent_at,day_key,retracted,image_url,image_w,image_h,
          activity_id,activity_label,activity_color,success_rule_snapshot
        )
        SELECT $1,next.head_seq,$2,'commit',$3,$4,$5::date,FALSE,$6,$7,$8,
          CASE WHEN p.activity_mode='individual' THEN m.activity_id ELSE p.activity_id END,
          CASE WHEN p.activity_mode='individual' THEN m.activity_label ELSE p.activity END,
          CASE WHEN p.activity_mode='individual' THEN m.activity_color ELSE p.shared_activity_color END,
          m.success_rule
        FROM next
        JOIN teambook_books p ON p.id=$1
        JOIN teambook_book_members m ON m.book_id=$1 AND m.user_id=$2
        RETURNING seq`, [
        row.id, member.user_id, text, now, key, imageUrl, imageW, imageH, ACTIVE_STATES,
      ]);
    } catch (error) {
      await discardPartyImage(imageUrl);
      if (error.code === '23505') return sendJson(res, { ok: false, error: 'ALREADY_COMMITTED' }, 409);
      throw error;
    }

    /* Reuse the canonical GET shaper after the write, so commit responses stay
       byte-for-byte compatible with the rest of the existing TeamBook client. */
    const proxy = Object.create(req);
    proxy.method = 'GET';
    proxy.url = `/api/teambook/party/${encodeURIComponent(partyCode)}`;
    proxy.query = { ...(req.query || {}), path: ['party', partyCode] };
    return xtyHandler(proxy, res);
  } catch (error) {
    console.error('TeamBook commit route failed', error);
    if (sql) {
      await sql.query(`INSERT INTO teambook_system_errors (error_code,endpoint,created_at)
        VALUES ($1,$2,$3)`, [String(error?.code || 'TEAMBOOK_COMMIT_ERROR').slice(0, 60), '/api/teambook/party/[code]/commit', new Date()]).catch(() => {});
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}
