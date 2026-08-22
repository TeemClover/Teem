import { database, ensureSchema, sendJson } from './core.js';
import { handleXtyPartyFinish } from './xty-party-finish.js';
import { ensureLineageSchema, sealBookMemory } from './xty-lineage.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function codeOf(req) {
  const fromQuery = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  if (/^\d{5}$/.test(String(fromQuery || ''))) return String(fromQuery);
  const rawPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : String(req.query?.path || '');
  const pathMatch = rawPath.match(/(?:^|\/)party\/(\d{5})\/finish\/?$/);
  if (pathMatch) return pathMatch[1];
  const match = new URL(req.url || '/', 'https://teambook.local').pathname.match(/\/party\/(\d{5})\/finish\/?$/);
  return match ? match[1] : '';
}

async function captureFinish(req) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  await handleXtyPartyFinish(req, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  return { status: capture.statusCode, data, headers };
}

export async function handleFinishWithMemoryV1(req, res) {
  const finished = await captureFinish(req);
  if (finished.status >= 400 || finished.data?.error) {
    return sendJson(res, finished.data, finished.status || 500);
  }

  try {
    const code = codeOf(req);
    if (!code) return sendJson(res, finished.data, finished.status || 200);
    const sql = database();
    await ensureSchema(sql);
    await ensureLineageSchema(sql);
    const rows = await sql.query('SELECT id,state,ended_at FROM teambook_books WHERE code=$1 LIMIT 1', [code]);
    const book = rows[0];
    if (!book || ACTIVE_STATES.includes(String(book.state || '').toUpperCase())) {
      return sendJson(res, finished.data, finished.status || 200);
    }
    const memory = await sealBookMemory(sql, book.id, book.ended_at ? new Date(book.ended_at) : new Date());
    return sendJson(res, {
      ...finished.data,
      memorySealed: !!memory,
    }, finished.status || 200);
  } catch (error) {
    // Finishing the book is the primary operation. A memory-seal problem must
    // never roll the book lifecycle back; surface it for telemetry and retry.
    console.error('TeamBook memory seal after finish failed', error);
    return sendJson(res, {
      ...finished.data,
      memorySealed: false,
      memorySealError: error.code || 'MEMORY_SEAL_FAILED',
    }, finished.status || 200);
  }
}

export default handleFinishWithMemoryV1;
