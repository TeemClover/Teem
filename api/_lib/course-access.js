// Shared by Vercel Routing Middleware and Node API handlers. No client secrets.
export const COURSE_COOKIE_NAME = '__Host-myclover_course';
export const COURSE_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_PASSWORD_BYTES = 1024;
const MAX_COOKIE_BYTES = 8192;

function config(env) {
  const password = env?.COURSE_DENT_PASSWORD;
  const secret = env?.COURSE_SESSION_SECRET;
  if (typeof password !== 'string' || !password.length || encoder.encode(password).length > MAX_PASSWORD_BYTES) return null;
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 4096) return null;
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) return null;
  return { password, secret };
}

export function isCourseConfigured(env = process.env) {
  return Boolean(config(env));
}

function encode64(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decode64(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (encode64(bytes) !== value) throw new Error('Noncanonical encoding');
  return bytes;
}

async function signingKey(settings) {
  // Both values participate in the key, so rotating either revokes old sessions.
  const material = encoder.encode(JSON.stringify(['myclover-course-v1', settings.secret, settings.password]));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function verifyCoursePassword(candidate, env = process.env) {
  const settings = config(env);
  if (!settings || typeof candidate !== 'string' || !candidate.length || encoder.encode(candidate).length > MAX_PASSWORD_BYTES) return false;
  try {
    const key = await signingKey(settings);
    const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(settings.password));
    // HMAC-SHA256 verification compares fixed-size hashes inside Web Crypto.
    return await crypto.subtle.verify('HMAC', key, expected, encoder.encode(candidate));
  } catch {
    return false;
  }
}

export async function issueCourseSession(env = process.env, now = Date.now()) {
  const settings = config(env);
  if (!settings || !Number.isFinite(now) || now < 0) throw new Error('Course access unavailable');
  const iat = Math.floor(now / 1000);
  const nonce = encode64(crypto.getRandomValues(new Uint8Array(24)));
  const payload = encode64(encoder.encode(JSON.stringify({ v: 1, scope: 'thedent', iat, exp: iat + COURSE_SESSION_TTL_SECONDS, nonce })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(settings), encoder.encode(payload)));
  return `${payload}.${encode64(signature)}`;
}

export async function verifyCourseSession(cookieHeader, env = process.env, now = Date.now()) {
  const settings = config(env);
  if (!settings || typeof cookieHeader !== 'string' || cookieHeader.length > MAX_COOKIE_BYTES || !Number.isFinite(now) || now < 0) return false;
  try {
    const matches = cookieHeader.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${COURSE_COOKIE_NAME}=`));
    if (matches.length !== 1) return false;
    const token = matches[0].slice(COURSE_COOKIE_NAME.length + 1);
    if (!token || token.length > 2048) return false;
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0].length > 1024 || parts[1].length !== 43) return false;
    const signature = decode64(parts[1]);
    if (signature.length !== 32 || !await crypto.subtle.verify('HMAC', await signingKey(settings), signature, encoder.encode(parts[0]))) return false;
    const payload = JSON.parse(decoder.decode(decode64(parts[0])));
    const seconds = Math.floor(now / 1000);
    if (!payload || payload.v !== 1 || payload.scope !== 'thedent') return false;
    if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return false;
    if (payload.iat < 0 || payload.iat > seconds + 60 || payload.exp <= seconds) return false;
    if (payload.exp - payload.iat !== COURSE_SESSION_TTL_SECONDS) return false;
    if (typeof payload.nonce !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(payload.nonce)) return false;
    return true;
  } catch {
    return false;
  }
}

export function courseSessionCookie(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid session');
  return `${COURSE_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COURSE_SESSION_TTL_SECONDS}`;
}

export function clearCourseSessionCookie() {
  return `${COURSE_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
