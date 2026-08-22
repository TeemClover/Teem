import v12GameplayHandler from './_lib/v12-gameplay.js';
import { handleV12Create } from './_lib/v12-create.js';

export default function handler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  if (String(action || '').toLowerCase() === 'create') return handleV12Create(req, res);
  return v12GameplayHandler(req, res);
}
