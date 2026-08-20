import legacyXtyHandler from './teambook/[...path].js';
import xtyCommitHandler from './teambook/party/[code]/commit.js';
import { handleXtyPartyFinish } from './_lib/xty-party-finish.js';
import { handleXtyBind } from './_lib/xty-bind.js';

function pathOf(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length) return raw.join('/');
  if (raw) return String(raw);
  const pathname = new URL(req.url || '/', 'https://teambook.local').pathname;
  const marker = '/api/teambook/';
  return pathname.startsWith(marker) ? pathname.slice(marker.length) : '';
}

export default function handler(req, res) {
  const path = pathOf(req).replace(/^\/+|\/+$/g, '');
  const method = String(req.method || '').toUpperCase();

  /* Account binding is lossless and self-healing: local lead ownership must
     survive Login/Merge even when the account already had a membership row. */
  if (path === 'bind' && method === 'POST') {
    return handleXtyBind(req, res);
  }

  /* Compatibility firewall for old tabs/service caches. Legacy clients used
     the original /api/teambook/party routes; route lifecycle-sensitive writes into
     the canonical v2/v3 handlers so quota and LV.1 rules cannot diverge. */
  if (path === 'party' && method === 'POST') {
    req.query ||= {};
    req.query.op = 'create-v3';
    return handleXtyPartyFinish(req, res);
  }

  const join = path.match(/^party\/(\d{5})\/join\/?$/);
  if (join && method === 'POST') {
    req.query ||= {};
    req.query.code = join[1];
    req.query.op = 'join-v2';
    return handleXtyPartyFinish(req, res);
  }

  /* vercel.json rewrites every /api/teambook/* request to this single entrypoint.
     That means the filesystem route api/teambook/party/[code]/commit.js is never
     reached by URL matching on production unless we dispatch it here first.
     Keep Commit out of the legacy catch-all: its old SQL used a bare head_seq
     after JOINing teambook_books, which PostgreSQL resolves as ambiguous. */
  const commit = path.match(/^party\/(\d{5})\/commit\/?$/);
  if (commit && method === 'POST') {
    req.query ||= {};
    req.query.code = commit[1];
    return xtyCommitHandler(req, res);
  }

  const finish = path.match(/^party\/(\d{5})\/finish\/?$/);
  if (finish && method === 'POST') {
    req.query ||= {};
    req.query.code = finish[1];
    return handleXtyPartyFinish(req, res);
  }

  return legacyXtyHandler(req, res);
}
