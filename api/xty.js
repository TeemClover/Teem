import legacyXtyHandler from './xty/[...path].js';
import { handleXtyPartyFinish } from './_lib/xty-party-finish.js';

function pathOf(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length) return raw.join('/');
  if (raw) return String(raw);
  const pathname = new URL(req.url || '/', 'https://myclover.local').pathname;
  const marker = '/api/xty/';
  return pathname.startsWith(marker) ? pathname.slice(marker.length) : '';
}

export default function handler(req, res) {
  const path = pathOf(req).replace(/^\/+|\/+$/g, '');
  const method = String(req.method || '').toUpperCase();

  /* Compatibility firewall for old tabs/service caches. Legacy clients used
     the original /api/xty/party routes; route lifecycle-sensitive writes into
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

  const finish = path.match(/^party\/(\d{5})\/finish\/?$/);
  if (finish && method === 'POST') {
    req.query ||= {};
    req.query.code = finish[1];
    return handleXtyPartyFinish(req, res);
  }

  return legacyXtyHandler(req, res);
}
