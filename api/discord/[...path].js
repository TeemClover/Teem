import { discordLogin, discordCallback, discordStatus } from '../_lib/discord.js';

const handlers = {
  login: discordLogin,
  callback: discordCallback,
  status: discordStatus,
};

export default function handler(req, res) {
  const raw = req.query?.path;
  const route = Array.isArray(raw) ? raw[0] : raw;
  const target = handlers[route];

  if (!target) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  return target(req, res);
}
