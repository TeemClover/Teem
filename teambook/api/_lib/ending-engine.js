import { put } from '@vercel/blob';
import legacyXtyHandler from '../teambook/[...path].js';
import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import { blobConfigured, sniffImageType } from './xty-image.js';
import { cardById } from '../../_shared/cards.js';
import { endingPersonaPrompt } from '../../_shared/ending-personas.js';
import {
  buildEndingArtBriefs, buildEndingEvidence, endingVoteWinner,
} from '../../_shared/ending-evidence.js';

const TERMINAL_STATES = new Set(['COMPLETED', 'DISSOLVED']);
const CANDIDATE_IDS = Object.freeze(['A', 'B', 'C']);
const MAX_GENERATED_IMAGE_BYTES = 8 * 1024 * 1024;

const ENDING_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teambook_endings (
    book_id TEXT PRIMARY KEY,
    evidence_version INTEGER NOT NULL DEFAULT 2,
    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    briefs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    candidates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'BRIEF_READY',
    selected_candidate TEXT,
    generated_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    error_code TEXT,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_ending_votes (
    book_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (book_id,user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_ending_votes_book
    ON teambook_ending_votes(book_id,candidate_id)`,
];

async function ensureEndingSchema(sql) {
  for (const statement of ENDING_SCHEMA) await sql.query(statement);
}

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function codeOf(req) {
  const raw = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  const value = String(raw || bodyOf(req).code || '').trim();
  return /^\d{5}$/.test(value) ? value : '';
}

async function partyRow(sql, code) {
  const rows = await sql.query(`SELECT id,code,name,state,owner_id,created_at,started_at,ended_at,updated_at,
    duration_days,timezone,cover_type,cover_value FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
  return rows[0] || null;
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL LIMIT 1`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL LIMIT 1`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function stateViaLegacy(req, code) {
  let raw = '';
  const capture = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return this.headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET';
  proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` };
  proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (capture.statusCode >= 400 || data.error || !data.party) {
    const error = new Error(data.error || `STATE_${capture.statusCode}`);
    error.code = data.error || 'STATE_READ_FAILED';
    throw error;
  }
  return data;
}

function companionPersonaId(party) {
  const raw = party?.npcCardId || party?.petId || null;
  const card = raw ? cardById(raw) : null;
  return card?.species || raw || '';
}

function generatorConfig() {
  const endpoint = String(process.env.TEAMBOOK_ENDING_IMAGE_ENDPOINT || '').trim();
  const token = String(process.env.TEAMBOOK_ENDING_IMAGE_TOKEN || '').trim();
  const model = String(process.env.TEAMBOOK_ENDING_IMAGE_MODEL || '').trim();
  return {
    endpoint,
    token,
    model,
    ready: !!endpoint && blobConfigured(),
  };
}

async function endingRow(sql, bookId) {
  const rows = await sql.query(`SELECT book_id,evidence_version,evidence_json,briefs_json,candidates_json,
    status,selected_candidate,generated_at,finalized_at,error_code,updated_at
    FROM teambook_endings WHERE book_id=$1 LIMIT 1`, [bookId]);
  return rows[0] || null;
}

async function rebuildBrief(sql, req, row, member) {
  const state = await stateViaLegacy(req, row.code);
  const evidence = buildEndingEvidence(state.party);
  const persona = endingPersonaPrompt(companionPersonaId(state.party));
  const briefs = buildEndingArtBriefs(evidence, { personaPrompt: persona });
  const at = new Date();
  await sql.query(`INSERT INTO teambook_endings
      (book_id,evidence_version,evidence_json,briefs_json,candidates_json,status,updated_at)
    VALUES ($1,$2,$3::jsonb,$4::jsonb,'[]'::jsonb,'BRIEF_READY',$5)
    ON CONFLICT (book_id) DO UPDATE SET
      evidence_version=EXCLUDED.evidence_version,
      evidence_json=EXCLUDED.evidence_json,
      briefs_json=EXCLUDED.briefs_json,
      status=CASE WHEN teambook_endings.status IN ('READY','FINALIZED','GENERATING')
        THEN teambook_endings.status ELSE 'BRIEF_READY' END,
      error_code=CASE WHEN teambook_endings.status IN ('READY','FINALIZED','GENERATING')
        THEN teambook_endings.error_code ELSE NULL END,
      updated_at=EXCLUDED.updated_at`, [
    row.id, Number(evidence.version || 2), JSON.stringify(evidence), JSON.stringify(briefs), at,
  ]);
  return { state, evidence, briefs, member };
}

async function votesOf(sql, bookId, meUserId) {
  const rows = await sql.query(`SELECT candidate_id,COUNT(*)::int votes
    FROM teambook_ending_votes WHERE book_id=$1 GROUP BY candidate_id`, [bookId]);
  const counts = Object.fromEntries(CANDIDATE_IDS.map(id => [id, 0]));
  rows.forEach(item => { if (Object.prototype.hasOwnProperty.call(counts, item.candidate_id)) counts[item.candidate_id] = Number(item.votes || 0); });
  const mineRows = meUserId
    ? await sql.query(`SELECT candidate_id FROM teambook_ending_votes WHERE book_id=$1 AND user_id=$2 LIMIT 1`, [bookId, meUserId])
    : [];
  return { counts, mine: mineRows[0]?.candidate_id || null };
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function publicEnding(record, voteState, member) {
  const evidence = parseJson(record?.evidence_json, {});
  const briefs = parseJson(record?.briefs_json, []);
  const candidates = parseJson(record?.candidates_json, []);
  const config = generatorConfig();
  const publicBriefs = briefs.map(brief => ({
    id: brief.id,
    direction: brief.direction,
    titleTh: brief.titleTh,
    ...(member?.role === 'lead' ? { prompt: brief.prompt } : {}),
  }));
  return {
    ok: true,
    status: record?.status || 'BRIEF_READY',
    selectedCandidate: record?.selected_candidate || null,
    generatedAt: record?.generated_at ? new Date(record.generated_at).toISOString() : null,
    finalizedAt: record?.finalized_at ? new Date(record.finalized_at).toISOString() : null,
    generatorReady: config.ready,
    errorCode: member?.role === 'lead' ? (record?.error_code || null) : null,
    evidence,
    briefs: publicBriefs,
    candidates: candidates.map(item => ({
      id: item.id,
      direction: item.direction,
      titleTh: item.titleTh,
      imageUrl: item.imageUrl,
    })),
    votes: voteState,
    me: member ? { userId: member.user_id, alias: member.alias, role: member.role } : null,
  };
}

function decodeDataUrl(value) {
  const raw = String(value || '');
  const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], 'base64');
    return buffer.length ? { buffer, contentType: match[1].toLowerCase() } : null;
  } catch { return null; }
}

async function providerImage(config, prompt) {
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  if (config.token) headers.authorization = `Bearer ${config.token}`;
  const response = await fetch(config.endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({
      model: config.model || undefined,
      prompt,
      aspectRatio: '63:88',
      width: 1008,
      height: 1408,
      n: 1,
      responseFormat: 'base64',
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.error || `ENDING_PROVIDER_${response.status}`);
    error.code = 'ENDING_IMAGE_PROVIDER_FAILED';
    throw error;
  }

  const encoded = payload.imageBase64
    || payload.image_base64
    || payload.b64_json
    || payload.data?.[0]?.b64_json
    || payload.images?.[0]?.base64
    || payload.images?.[0]?.b64_json
    || '';
  if (encoded) {
    const decoded = decodeDataUrl(encoded) || (() => {
      try { const buffer = Buffer.from(String(encoded), 'base64'); return buffer.length ? { buffer, contentType: sniffImageType(buffer) } : null; }
      catch { return null; }
    })();
    if (!decoded?.buffer?.length || !decoded.contentType) {
      const error = new Error('ENDING_PROVIDER_BAD_IMAGE'); error.code = 'ENDING_PROVIDER_BAD_IMAGE'; throw error;
    }
    return decoded;
  }

  const remoteUrl = payload.url || payload.data?.[0]?.url || payload.images?.[0]?.url || '';
  if (!/^https:\/\//i.test(String(remoteUrl))) {
    const error = new Error('ENDING_PROVIDER_NO_IMAGE'); error.code = 'ENDING_PROVIDER_NO_IMAGE'; throw error;
  }
  const imageResponse = await fetch(remoteUrl, { redirect: 'follow' });
  if (!imageResponse.ok) {
    const error = new Error('ENDING_PROVIDER_IMAGE_FETCH_FAILED'); error.code = 'ENDING_PROVIDER_IMAGE_FETCH_FAILED'; throw error;
  }
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const contentType = sniffImageType(buffer);
  if (!buffer.length || !contentType || buffer.length > MAX_GENERATED_IMAGE_BYTES) {
    const error = new Error('ENDING_PROVIDER_BAD_IMAGE'); error.code = 'ENDING_PROVIDER_BAD_IMAGE'; throw error;
  }
  return { buffer, contentType };
}

async function storeCandidate(code, brief, generated) {
  if (generated.buffer.length > MAX_GENERATED_IMAGE_BYTES) {
    const error = new Error('ENDING_IMAGE_TOO_LARGE'); error.code = 'ENDING_IMAGE_TOO_LARGE'; throw error;
  }
  const ext = generated.contentType === 'image/png' ? 'png' : (generated.contentType === 'image/jpeg' ? 'jpg' : 'webp');
  const blob = await put(`teambook/${code}/ending/${brief.id}-${Date.now()}.${ext}`, generated.buffer, {
    access: 'public', contentType: generated.contentType, addRandomSuffix: true, cacheControlMaxAge: 31536000,
  });
  return {
    id: brief.id,
    direction: brief.direction,
    titleTh: brief.titleTh,
    imageUrl: blob.url,
    storageUrl: blob.url,
  };
}

async function generateEnding(sql, req, party, member) {
  if (member.role !== 'lead') {
    const error = new Error('LEAD_REQUIRED'); error.code = 'LEAD_REQUIRED'; throw error;
  }
  const config = generatorConfig();
  if (!config.ready) {
    const error = new Error('ENDING_IMAGE_PROVIDER_NOT_CONFIGURED');
    error.code = 'ENDING_IMAGE_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  await rebuildBrief(sql, req, party, member);
  const current = await endingRow(sql, party.id);
  const existing = parseJson(current?.candidates_json, []);
  if (existing.length === CANDIDATE_IDS.length && ['READY', 'FINALIZED'].includes(current.status)) return current;

  const at = new Date();
  const claimed = await sql.query(`UPDATE teambook_endings SET status='GENERATING',error_code=NULL,updated_at=$2
    WHERE book_id=$1 AND status IN ('BRIEF_READY','FAILED') RETURNING book_id`, [party.id, at]);
  if (!claimed[0] && current?.status === 'GENERATING') {
    const error = new Error('ENDING_ALREADY_GENERATING'); error.code = 'ENDING_ALREADY_GENERATING'; throw error;
  }
  if (!claimed[0] && current?.status === 'FINALIZED') return current;

  const briefs = parseJson((await endingRow(sql, party.id))?.briefs_json, []);
  try {
    const candidates = [];
    for (const brief of briefs) {
      const generated = await providerImage(config, brief.prompt);
      candidates.push(await storeCandidate(party.code, brief, generated));
    }
    const generatedAt = new Date();
    await sql.query(`UPDATE teambook_endings SET candidates_json=$2::jsonb,status='READY',generated_at=$3,
      error_code=NULL,updated_at=$3 WHERE book_id=$1`, [party.id, JSON.stringify(candidates), generatedAt]);
  } catch (error) {
    await sql.query(`UPDATE teambook_endings SET status='FAILED',error_code=$2,updated_at=$3 WHERE book_id=$1`, [
      party.id, clean(error.code || 'ENDING_IMAGE_GENERATION_FAILED', 80), new Date(),
    ]).catch(() => {});
    throw error;
  }
  return endingRow(sql, party.id);
}

async function vote(sql, party, member, candidateId) {
  if (!CANDIDATE_IDS.includes(candidateId)) {
    const error = new Error('INVALID_ENDING_CANDIDATE'); error.code = 'INVALID_ENDING_CANDIDATE'; throw error;
  }
  const record = await endingRow(sql, party.id);
  const candidates = parseJson(record?.candidates_json, []);
  if (!candidates.some(item => item.id === candidateId) || !['READY', 'FINALIZED'].includes(record?.status)) {
    const error = new Error('ENDING_CANDIDATES_NOT_READY'); error.code = 'ENDING_CANDIDATES_NOT_READY'; throw error;
  }
  if (record.status === 'FINALIZED') {
    const error = new Error('ENDING_ALREADY_FINALIZED'); error.code = 'ENDING_ALREADY_FINALIZED'; throw error;
  }
  const at = new Date();
  await sql.query(`INSERT INTO teambook_ending_votes (book_id,user_id,candidate_id,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$4)
    ON CONFLICT (book_id,user_id) DO UPDATE SET candidate_id=EXCLUDED.candidate_id,updated_at=EXCLUDED.updated_at`, [
    party.id, member.user_id, candidateId, at,
  ]);
}

async function finalize(sql, party, member, requestedCandidate) {
  if (member.role !== 'lead') {
    const error = new Error('LEAD_REQUIRED'); error.code = 'LEAD_REQUIRED'; throw error;
  }
  const record = await endingRow(sql, party.id);
  if (record?.status === 'FINALIZED') return record;
  if (record?.status !== 'READY') {
    const error = new Error('ENDING_CANDIDATES_NOT_READY'); error.code = 'ENDING_CANDIDATES_NOT_READY'; throw error;
  }
  const candidates = parseJson(record.candidates_json, []);
  const voteRows = await sql.query(`SELECT candidate_id AS "candidateId" FROM teambook_ending_votes WHERE book_id=$1`, [party.id]);
  const voteResult = endingVoteWinner(voteRows, CANDIDATE_IDS);
  let candidateId = CANDIDATE_IDS.includes(requestedCandidate) ? requestedCandidate : voteResult.winner;
  if (!candidateId) {
    const error = new Error('ENDING_NO_VOTES'); error.code = 'ENDING_NO_VOTES'; throw error;
  }
  if (!requestedCandidate && voteResult.tied.length > 1) {
    const error = new Error('ENDING_VOTE_TIED'); error.code = 'ENDING_VOTE_TIED'; error.tied = voteResult.tied; throw error;
  }
  const candidate = candidates.find(item => item.id === candidateId);
  if (!candidate?.storageUrl) {
    const error = new Error('ENDING_IMAGE_MISSING'); error.code = 'ENDING_IMAGE_MISSING'; throw error;
  }

  const at = new Date();
  await sql.query(`WITH picked AS (
      UPDATE teambook_endings SET selected_candidate=$1,status='FINALIZED',finalized_at=$2,updated_at=$2
      WHERE book_id=$3 AND status='READY' RETURNING book_id
    ), cover AS (
      UPDATE teambook_books SET cover_type='image',cover_value=$4,lead_card_id=NULL,updated_at=$2
      WHERE id=$3 AND EXISTS (SELECT 1 FROM picked) RETURNING id
    ) INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT id,'ENDING_COVER_SELECTED',$5,$6,$7::jsonb,$2 FROM cover`, [
    candidateId, at, party.id, candidate.storageUrl, member.user_id,
    Math.max(1, Number(parseJson(record.evidence_json, {})?.book?.calendarDays || parseJson(record.evidence_json, {})?.book?.targetDays || 1)),
    JSON.stringify({ candidateId, direction: candidate.direction, voteCounts: voteResult.counts }),
  ]);
  return endingRow(sql, party.id);
}

function errorStatus(code) {
  if (['AUTH_REQUIRED'].includes(code)) return 401;
  if (['LEAD_REQUIRED'].includes(code)) return 403;
  if (['NOT_FOUND'].includes(code)) return 404;
  if (['INVALID_CODE', 'INVALID_ENDING_CANDIDATE'].includes(code)) return 400;
  if (['ENDING_IMAGE_PROVIDER_NOT_CONFIGURED'].includes(code)) return 503;
  if (['ENDING_IMAGE_PROVIDER_FAILED', 'ENDING_PROVIDER_BAD_IMAGE', 'ENDING_PROVIDER_NO_IMAGE', 'ENDING_PROVIDER_IMAGE_FETCH_FAILED'].includes(code)) return 502;
  return 409;
}

export default async function endingHandler(req, res) {
  let sql;
  try {
    const method = String(req.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (method === 'POST' && !sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    sql = database();
    await ensureSchema(sql);
    await ensureEndingSchema(sql);
    const party = await partyRow(sql, code);
    if (!party) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!TERMINAL_STATES.has(String(party.state || '').toUpperCase())) {
      return sendJson(res, { ok: false, error: 'ENDING_NOT_READY' }, 409);
    }
    const member = await memberFor(req, sql, party.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    let record = await endingRow(sql, party.id);
    if (!record || !['READY', 'FINALIZED', 'GENERATING'].includes(record.status)) {
      await rebuildBrief(sql, req, party, member);
      record = await endingRow(sql, party.id);
    }

    if (method === 'POST') {
      const action = String(bodyOf(req).action || '').toLowerCase();
      if (action === 'generate') record = await generateEnding(sql, req, party, member);
      else if (action === 'vote') {
        await vote(sql, party, member, String(bodyOf(req).candidateId || '').toUpperCase());
        record = await endingRow(sql, party.id);
      } else if (action === 'finalize') {
        record = await finalize(sql, party, member, String(bodyOf(req).candidateId || '').toUpperCase());
      } else return sendJson(res, { ok: false, error: 'BAD_ACTION' }, 400);
    }

    const voteState = await votesOf(sql, party.id, member.user_id);
    return sendJson(res, publicEnding(record, voteState, member));
  } catch (error) {
    console.error('TeamBook Ending engine failed', error);
    const code = clean(error?.code || 'TEAMBOOK_ENDING_ERROR', 80) || 'TEAMBOOK_ENDING_ERROR';
    const body = { ok: false, error: code };
    if (Array.isArray(error?.tied)) body.tied = error.tied;
    return sendJson(res, body, errorStatus(code));
  }
}
