import { handleXtyMine } from './_lib/xty-mine.js';
import { handleXtyStars } from './_lib/xty-stars.js';
import { handleXtyPartyFinish } from './_lib/xty-party-finish.js';

function routeOf(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length) return raw.join('/');
  if (raw) return String(raw);
  const pathname = new URL(req.url || '/', 'https://myclover.local').pathname;
  return pathname.replace(/^\/api\/?/, '');
}

export default function handler(req, res) {
  const route = routeOf(req).split('/').filter(Boolean)[0] || '';
  if (route === 'xty-mine') return handleXtyMine(req, res);
  if (route === 'xty-stars') return handleXtyStars(req, res);
  if (route === 'xty-party-finish') return handleXtyPartyFinish(req, res);
  return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
}
