import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

export const CAMPAIGN = 'bodymestory-workbook-7-days';
export const CONSENT_VERSION = '2026-11-01-bodymestory-v1';
export const DOWNLOAD_URL = '/bodymestory/assets/bodymestory-7-day-workbook.pdf';
export const MAX_BODY_BYTES = 8192;
export const SOURCES = new Set(['bodymestory', 'facebook', 'instagram', 'manychat', 'website']);
const UTM_NAMES = ['source', 'medium', 'campaign', 'content', 'term'];

export class BodyInputError extends Error {
  constructor(message, field, status = 400, code = 'INVALID_INPUT') {
    super(message); Object.assign(this, { field, status, code });
  }
}
export const clean = (value, max = 100) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
export const hash = value => createHash('sha256').update(String(value)).digest('hex');

export function sameOrigin(req) {
  if (String(req.headers?.['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false;
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = String(req.headers?.host || '').trim().toLowerCase();
    const proto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return Boolean(host) && parsed.origin === `${proto}://${host}` && !parsed.username && !parsed.password;
  } catch { return false; }
}

export function readBody(req) {
  const declared = Number(req.headers?.['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new BodyInputError('ข้อมูลมากเกินไป กรุณาโหลดฟอร์มใหม่', undefined, 413, 'BODY_TOO_LARGE');
  }
  const type = String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new BodyInputError('กรุณาส่งฟอร์มจากหน้าเว็บ', undefined, 415, 'JSON_REQUIRED');
  let value = req.body;
  try {
    if (Buffer.isBuffer(value)) value = value.toString('utf8');
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof serialized !== 'string') throw new Error('EMPTY_BODY');
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) {
      throw new BodyInputError('ข้อมูลมากเกินไป กรุณาโหลดฟอร์มใหม่', undefined, 413, 'BODY_TOO_LARGE');
    }
    if (typeof value === 'string') value = JSON.parse(value);
  } catch (error) {
    if (error instanceof BodyInputError) throw error;
    throw new BodyInputError('ข้อมูลฟอร์มไม่ถูกต้อง');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BodyInputError('ข้อมูลฟอร์มไม่ถูกต้อง');
  return value;
}

function optionalBoolean(data, field) {
  if (data[field] == null) return false;
  if (typeof data[field] !== 'boolean') throw new BodyInputError('กรุณาตรวจตัวเลือกการยินยอม', field);
  return data[field];
}
function optionalText(data, field, limit) {
  if (data[field] == null || data[field] === '') return '';
  if (typeof data[field] !== 'string' || data[field].length > limit) throw new BodyInputError('กรุณาตรวจข้อมูลในฟอร์ม', field);
  return clean(data[field], limit);
}

export function validateIntake(data) {
  const name = optionalText(data, 'name', 80);
  if (typeof data.email !== 'string' || data.email.length > 254) throw new BodyInputError('กรุณาตรวจอีเมลอีกครั้ง', 'email');
  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]{2,}$/.test(email)) {
    throw new BodyInputError('กรุณาตรวจอีเมลอีกครั้ง', 'email');
  }
  if (data.privacyAcknowledged !== true) throw new BodyInputError('กรุณารับทราบการใช้ข้อมูลเพื่อส่งมอบของแจก', 'privacyAcknowledged');
  const marketingConsent = optionalBoolean(data, 'marketingConsent');
  const adsConsent = optionalBoolean(data, 'adsConsent');
  if (data.campaign != null && !['7-days', CAMPAIGN].includes(data.campaign)) throw new BodyInputError('ไม่พบของแจกนี้', 'campaign');
  const source = optionalText(data, 'source', 30) || 'bodymestory';
  if (!SOURCES.has(source)) throw new BodyInputError('แหล่งที่มาไม่ถูกต้อง', 'source');
  const episode = optionalText(data, 'episode', 4).toUpperCase();
  if (episode && !/^RG(?:0[1-9]|[12][0-9]|30)$/.test(episode)) throw new BodyInputError('รหัสคลิปไม่ถูกต้อง', 'episode');
  const rawUtm = data.utm == null ? {} : data.utm;
  if (!rawUtm || typeof rawUtm !== 'object' || Array.isArray(rawUtm)) throw new BodyInputError('ข้อมูลแหล่งที่มาไม่ถูกต้อง', 'utm');
  const utm = {};
  for (const key of UTM_NAMES) {
    const raw = rawUtm[`utm_${key}`] ?? rawUtm[key];
    if (raw == null || raw === '') continue;
    // Campaign identifiers only: never accept arbitrary URLs, emails or form text.
    if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(raw)) throw new BodyInputError('ข้อมูลแหล่งที่มาไม่ถูกต้อง', 'utm');
    utm[`utm_${key}`] = raw;
  }
  return { campaign: CAMPAIGN, email, name, privacyAcknowledged: true, marketingConsent, adsConsent,
    source, episode: episode || null, utm, eventId: randomUUID() };
}

function constantEqual(a, b) {
  const aa = Buffer.from(String(a || '')), bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function adminAccess(req, config) {
  const wantedPassword = config.MEMBER_ADMIN_PASSWORD || config.STAT_PASSWORD;
  if (!wantedPassword) return { ok: false, unconfigured: true };
  const wantedUser = config.MEMBER_ADMIN_USER || config.STAT_USER || 'admin';
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Basic ')) return { ok: false };
  try {
    const [user, ...rest] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    return { ok: constantEqual(user, wantedUser) && constantEqual(rest.join(':'), wantedPassword) };
  } catch { return { ok: false }; }
}
export function rateBuckets(req, email) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return { ip: `ip:${hash(`bodymestory-v1|${ip}`)}`, email: `email:${hash(`bodymestory-v1|${email}`)}` };
}
export function publicConfig(config) {
  const raw = config.BODYMESTORY_PIXEL_ID === undefined ? '1055629253871262' : String(config.BODYMESTORY_PIXEL_ID).trim();
  return { ok: true, pixelId: /^\d{5,30}$/.test(raw) ? raw : null, adsConsentRequired: true, consentVersion: CONSENT_VERSION };
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
