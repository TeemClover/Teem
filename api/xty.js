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
  const finish = path.match(/^party\/(\d{5})\/finish\/?$/);
  if (finish && String(req.method || '').toUpperCase() === 'POST') {
    req.query ||= {};
    if (!req.query.code) req.query.code = finish[1];
    return handleXtyPartyFinish(req, res);
  }
  return legacyXtyHandler(req, res);
}
