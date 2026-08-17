import { discordLogin, discordCallback, discordStatus } from '../_lib/discord.js';

const handlers = {
  login: discordLogin,
  callback: discordCallback,
  status: discordStatus,
};

function routeOf(req) {
  const pathname = new URL(req.url || '/', 'https://myclover.local').pathname;
  const marker = '/api/discord/';
  if (pathname.startsWith(marker)) {
    return decodeURIComponent(pathname.slice(marker.length).split('/').filter(Boolean)[0] || '');
  }
  const raw = req.query?.path;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || '').split('/').filter(Boolean)[0] || '';
}

export default function handler(req, res) {
  const target = handlers[routeOf(req)];

  if (!target) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  return target(req, res);
}
