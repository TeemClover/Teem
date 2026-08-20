import { handleXtyMine } from './_lib/xty-mine.js';
import { handleXtyStars } from './_lib/xty-stars.js';
import { handleXtyPartyFinish } from './_lib/xty-party-finish.js';

function routeOf(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length) return raw.join('/');
  if (raw) return String(raw);
  const pathname = new URL(req.url || '/', 'https://teambook.local').pathname;
  return pathname.replace(/^\/api\/?/, '');
}

function finishRequest(req, rawRoute) {
  if (String(req.method || '').toUpperCase() !== 'POST') return false;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (body.mode !== 'dissolve' && body.mode !== 'complete') return false;

  const rawCode = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  if (/^\d{5}$/.test(String(rawCode || ''))) return true;
  if (/^teambook\/party\/\d{5}\/finish\/?$/.test(String(rawRoute || ''))) return true;

  const pathname = new URL(req.url || '/', 'https://teambook.local').pathname;
  return /\/api\/teambook\/party\/\d{5}\/finish\/?$/.test(pathname);
}

export default function handler(req, res) {
  const rawRoute = routeOf(req).replace(/^\/+|\/+$/g, '');
  const route = rawRoute.split('/').filter(Boolean)[0] || '';

  if (route === 'teambook-mine') return handleXtyMine(req, res);
  if (route === 'teambook-stars') return handleXtyStars(req, res);
  if (route === 'teambook-party-finish' || finishRequest(req, rawRoute)) {
    return handleXtyPartyFinish(req, res);
  }
  return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
}
