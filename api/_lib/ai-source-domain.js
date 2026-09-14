import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const DAY_MS = 86400000;
export const RECEIPT_MAX_BYTES = 2 * 1024 * 1024;
export const JSON_MAX_BYTES = 3 * 1024 * 1024;
export const COOKIE_NAME = '__Host-ai_source_offer';
export const ADMIN_URL = 'https://www.myclover.com/ai-source/admin/';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REFERENCE = /^SAUCE-[0-9A-F]{32}$/;
export const clean = (v, max = 200) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
  const aa = Buffer.from(String(a || '')), bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export class InputError extends Error {
  constructor(message, field, status = 400, code = 'INVALID_INPUT') { super(message); Object.assign(this, { field, status, code }); }
}
export function adminAccess(req, env) {
  return Boolean(env.MEET_ADMIN_KEY) && equal(req.headers?.['x-admin-key'], env.MEET_ADMIN_KEY);
}
export function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true; // Same-site non-browser clients may omit Origin; admin still needs its header key.
  try {
    const parsed = new URL(origin);
    const host = String(req.headers.host || '').toLowerCase();
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return parsed.origin === `${proto}://${host}` && !parsed.username && !parsed.password;
  } catch { return false; }
}

// First visit on Sep14 Bangkok ends at the end of Sep16, NOT a rolling 48-hour timer.
export function offerExpiry(firstSeenMs) {
  const bangkokDay = Math.floor((firstSeenMs + 7 * 3600000) / DAY_MS);
  return (bangkokDay + 3) * DAY_MS - 7 * 3600000;
}
function signature(payload, secret) { return createHmac('sha256', secret).update(`ai-source-offer:v1:${payload}`).digest('base64url'); }
export function issueOffer(now, secret, id = randomUUID()) {
  if (!secret) throw new InputError('ระบบข้อเสนอยังไม่พร้อม', undefined, 503, 'SERVICE_UNCONFIGURED');
  const firstSeen = new Date(now).getTime();
  const offer = { v: 1, id, firstSeen, expires: offerExpiry(firstSeen) };
  const payload = Buffer.from(JSON.stringify(offer)).toString('base64url');
  return { offer, token: `${payload}.${signature(payload, secret)}` };
}
export function hasOfferCookie(req) { return String(req.headers?.cookie || '').split(';').some(x => x.trim().startsWith(`${COOKIE_NAME}=`)); }
export function readOffer(req, secret, now) {
  if (!secret) return null;
  const raw = String(req.headers?.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE_NAME}=`));
  if (!raw) return null;
  const token = raw.slice(COOKIE_NAME.length + 1);
  if (token.length > 1200) return null;
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra || !/^[A-Za-z0-9_-]+$/.test(payload) || !equal(sig, signature(payload, secret))) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (v.v !== 1 || !UUID.test(v.id) || !Number.isSafeInteger(v.firstSeen) || !Number.isSafeInteger(v.expires)
      || v.firstSeen < Date.UTC(2020, 0, 1) || v.firstSeen > new Date(now).getTime() + 60000 || v.expires !== offerExpiry(v.firstSeen)) return null;
    return { offer: v, token };
  } catch { return null; }
}
export function offerCookie(token) {
  // Keep the identity after the promotion expires so an ordinary revisit does not restart it.
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}
export function amountDueAt(offer, when) { return new Date(when).getTime() < offer.expires ? 990 : 1690; }
export function publicOffer(offer, now) {
  return { priceTHB: amountDueAt(offer, now), regularPriceTHB: 1690, promoPriceTHB: 990,
    firstSeenAt: new Date(offer.firstSeen).toISOString(), expiresAt: new Date(offer.expires).toISOString(),
    deadlineAt: new Date(offer.expires - 1).toISOString(), serverNow: new Date(now).toISOString(),
    promoActive: new Date(now).getTime() < offer.expires, timeZone: 'Asia/Bangkok', deadlineRule: 'end_of_day_two_calendar_days_after_first_visit' };
}
function textField(data, key, max, required = true) {
  if (typeof data[key] !== 'string' || data[key].length > max || (required && !clean(data[key], max))) {
    if (!required && (data[key] == null || data[key] === '')) return '';
    throw new InputError(`กรุณาตรวจช่อง ${key}`, key);
  }
  return clean(data[key], max);
}
export function parseAmount(value, field = 'amountTHB') {
  // Store integer satang so submitted amounts are never rounded into the quoted price.
  if (!['number', 'string'].includes(typeof value) || !/^\d{1,7}(?:\.\d{1,2})?$/.test(String(value))) throw new InputError('ยอดโอนไม่ถูกต้อง', field);
  const [whole, decimal = ''] = String(value).split('.');
  const satang = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(satang) || satang <= 0 || satang > 100000000) throw new InputError('ยอดโอนไม่ถูกต้อง', field);
  return satang;
}
export function parseTransferTime(value, now, field = 'transferredAt') {
  // Explicit timezone only; do not interpret datetime-local in the server's timezone.
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new InputError('กรุณาใส่วันเวลาโอนตามสลิปพร้อมเขตเวลา', field);
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const offset = match[8]; const offsetHours = offset === 'Z' ? 0 : Number(offset.slice(1, 3)); const offsetMinutes = offset === 'Z' ? 0 : Number(offset.slice(4));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 2020 || month < 1 || month > 12 || day < 1 || day > days || hour > 23 || minute > 59 || second > 59 || offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes)) throw new InputError('วันเวลาโอนไม่ถูกต้อง', field);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > new Date(now).getTime() + 5 * 60000) throw new InputError('วันเวลาโอนอยู่ในอนาคตหรือไม่ถูกต้อง', field);
  return date.toISOString();
}
export function validateReceipt(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('กรุณาแนบสลิป', 'receipt');
  const b64 = value.base64;
  const maxEncoded = Math.ceil(RECEIPT_MAX_BYTES / 3) * 4;
  if (typeof b64 !== 'string' || b64.length > maxEncoded) throw new InputError('สลิปต้องไม่เกิน 2 MB', 'receipt', 413, 'RECEIPT_TOO_LARGE');
  if (!b64.length || b64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new InputError('ข้อมูลสลิปไม่ถูกต้อง', 'receipt');
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length > RECEIPT_MAX_BYTES) throw new InputError('สลิปต้องไม่เกิน 2 MB', 'receipt', 413, 'RECEIPT_TOO_LARGE');
  if (bytes.length < 16 || bytes.toString('base64') !== b64) throw new InputError('ข้อมูลสลิปไม่ถูกต้อง', 'receipt');
  let mime = '';
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && bytes.subarray(-8).equals(Buffer.from('49454e44ae426082', 'hex'))) mime = 'image/png';
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) mime = 'image/jpeg';
  else if (/^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString('ascii')) && bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) mime = 'application/pdf';
  if (!mime || value.mime !== mime) throw new InputError('ใช้ไฟล์ PNG, JPEG หรือ PDF ที่ถูกต้อง', 'receipt');
  return { bytes, base64: b64, mime, sha256: sha256(bytes), name: clean(value.name, 120) || 'receipt', size: bytes.length };
}
export function validateIntake(data, now) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new InputError('ข้อมูลไม่ถูกต้อง');
  if (!UUID.test(String(data.idempotencyKey || ''))) throw new InputError('กรุณาโหลดฟอร์มใหม่แล้วลองอีกครั้ง', 'idempotencyKey');
  const name = textField(data, 'name', 120); const email = textField(data, 'email', 254, false).toLowerCase();
  const contact = textField(data, 'contact', 160, false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new InputError('อีเมลไม่ถูกต้อง', 'email');
  if (!email && !contact) throw new InputError('กรุณาใส่อีเมลหรือช่องทางที่ติดต่อได้', 'contact');
  if (data.consent !== true) throw new InputError('กรุณายินยอมให้ใช้ข้อมูลเพื่อตรวจยอดและติดต่อเรื่องคอร์ส', 'consent');
  const amountSatang = parseAmount(data.amountTHB); const transferredAt = parseTransferTime(data.transferredAt, now); const receipt = validateReceipt(data.receipt);
  const payloadHash = sha256(JSON.stringify({ name, email, contact, amountSatang, transferredAt, receiptSha256: receipt.sha256, receiptMime: receipt.mime, consent: true }));
  return { idempotencyKey: data.idempotencyKey.toLowerCase(), name, email, contact, amountSatang, transferredAt, receipt, payloadHash };
}
export const datesFromTransfer = timestamp => ({ admissionDueAt: new Date(new Date(timestamp).getTime() + DAY_MS).toISOString(), guaranteeUntil: new Date(new Date(timestamp).getTime() + 30 * DAY_MS).toISOString() });
export const makeReference = () => `SAUCE-${randomUUID().replaceAll('-', '').toUpperCase()}`;
