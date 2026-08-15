import {
  accountForIdentity, authRateLimited, clean, clearSessionCookie, consumeOAuthState,
  createOAuthState, createSession, currentUser, database, destroySession, ensureMemberNo,
  ensureSchema, newPasswordRecord, passwordMatches, pkceChallenge, providerConfig,
  publicUser, prune, safeReturn, sameOrigin, sendJson, sessionCookie, validEmail,
} from '../_lib/core.js';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function otpRecord(value, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(String(value), salt, 32).toString('hex') };
}

function otpMatches(value, row) {
  if (!/^\d{6}$/.test(String(value || '')) || !row?.otp_hash || !row.otp_salt) return false;
  const actual = Buffer.from(otpRecord(value, row.otp_salt).hash, 'hex');
  const expected = Buffer.from(row.otp_hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function sendOtpEmail(email, otp) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.XTY_FROM_EMAIL || process.env.FIRST_CLASS_FROM_EMAIL;
  if (!key || !from) return { ok: false, error: 'EMAIL_DELIVERY_NOT_CONFIGURED' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [email], subject: 'รหัสเก็บ Progress ของ XTY',
      text: `รหัส XTY ของคุณคือ ${otp}\n\nรหัสนี้ใช้ได้ 10 นาที และใช้ได้ครั้งเดียว\nถ้าคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร`,
    }),
  });
  return response.ok ? { ok: true } : { ok: false, error: 'EMAIL_DELIVERY_FAILED' };
}

function routeParts(req) {
  // Vercel does not consistently expose catch-all segments in req.query for
  // plain Node functions. Parse the public URL first and keep req.query only
  // as a compatibility fallback for local/dev runtimes.
  const pathname = new URL(req.url || '/', 'https://myclover.local').pathname;
  const marker = '/api/auth/';
  if (pathname.startsWith(marker)) {
    return pathname.slice(marker.length).split('/').filter(Boolean).map(part => decodeURIComponent(part));
  }
  const value = req.query?.path;
  return Array.isArray(value) ? value : String(value || '').split('/').filter(Boolean);
}
function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function redirect(res, url, cookie) {
  res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store');
  if (cookie) res.setHeader('Set-Cookie', cookie); res.end();
}
function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}
function accountReturn(returnTo, status, origin) {
  const back = new URL(safeReturn(returnTo || '/card/'), origin);
  back.searchParams.set('account', status);
  return `${back.pathname}${back.search}${back.hash}`;
}

async function googleIdentity(code, verifier, redirectUri, config) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.id, client_secret: config.secret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenResponse.json(); if (!tokenResponse.ok || !tokens.access_token) throw new Error('google_token');
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.sub || profile.email_verified === false) throw new Error('google_profile');
  return { provider: 'google', id: String(profile.sub), email: clean(profile.email, 120), name: clean(profile.name, 80) };
}

async function lineIdentity(code, verifier, redirectUri, config) {
  const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.id, client_secret: config.secret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenResponse.json(); if (!tokenResponse.ok || !tokens.access_token) throw new Error('line_token');
  const profileResponse = await fetch('https://api.line.me/v2/profile', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = await profileResponse.json(); if (!profileResponse.ok || !profile.userId) throw new Error('line_profile');
  let email = '';
  if (tokens.id_token) {
    const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: tokens.id_token, client_id: config.id }),
    });
    const verified = await verifyResponse.json(); if (verifyResponse.ok) email = clean(verified.email, 120);
  }
  return { provider: 'line', id: String(profile.userId), email, name: clean(profile.displayName, 80) };
}

export default async function handler(req, res) {
  try {
    const sql = database(); await ensureSchema(sql);
    const route = routeParts(req); const method = req.method.toUpperCase();

    if (method === 'GET' && route[0] === 'providers') return sendJson(res, { ok: true, providers: { email: true, google: !!providerConfig('google'), line: !!providerConfig('line') } });
    if (method === 'GET' && route[0] === 'session') return sendJson(res, { ok: true, user: await currentUser(req, sql) });

    if (method === 'POST' && route[0] === 'otp' && route[1] === 'request') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const body = bodyOf(req); const email = clean(body.email, 120).trim().toLowerCase();
      if (!validEmail(email)) return sendJson(res, { ok: false, error: 'EMAIL_INVALID', message: 'อีเมลยังไม่ถูกรูปแบบครับ' }, 400);
      if (await authRateLimited(sql, req, 'email-otp-request', email, 5, 60)) {
        return sendJson(res, { ok: false, error: 'RATE_LIMITED', message: 'ขอรหัสถี่เกินไป ลองใหม่ภายหลังครับ' }, 429);
      }
      const otp = String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0');
      const record = otpRecord(otp); const id = randomUUID(); const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + OTP_TTL_MS);
      await sql.query(`UPDATE mc_email_otps SET used_at=$1 WHERE normalized_email=$2 AND used_at IS NULL`, [createdAt, email]);
      await sql.query(`INSERT INTO mc_email_otps
        (id,normalized_email,otp_hash,otp_salt,attempt_count,created_at,expires_at,used_at)
        VALUES ($1,$2,$3,$4,0,$5,$6,NULL)`, [id, email, record.hash, record.salt, createdAt, expiresAt]);
      const sent = await sendOtpEmail(email, otp);
      if (!sent.ok) {
        await sql.query('DELETE FROM mc_email_otps WHERE id=$1', [id]);
        return sendJson(res, { ok: false, error: sent.error }, 503);
      }
      return sendJson(res, { ok: true, requestId: id, expiresIn: Math.floor(OTP_TTL_MS / 1000), resendAfter: 45 });
    }

    if (method === 'POST' && route[0] === 'otp' && route[1] === 'verify') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const body = bodyOf(req); const requestId = clean(body.requestId, 80); const otp = clean(body.otp, 6);
      if (!requestId || !/^\d{6}$/.test(otp)) return sendJson(res, { ok: false, error: 'OTP_INVALID' }, 400);
      const rows = await sql.query(`SELECT id,normalized_email,otp_hash,otp_salt,attempt_count,expires_at,used_at
        FROM mc_email_otps WHERE id=$1`, [requestId]);
      const row = rows[0]; const now = new Date();
      if (!row || row.used_at || new Date(row.expires_at).getTime() <= now.getTime()) {
        return sendJson(res, { ok: false, error: 'OTP_EXPIRED', message: 'รหัสหมดอายุแล้ว ขอรหัสใหม่ได้เลยครับ' }, 410);
      }
      if (Number(row.attempt_count || 0) >= OTP_MAX_ATTEMPTS) {
        return sendJson(res, { ok: false, error: 'OTP_ATTEMPTS_EXCEEDED' }, 429);
      }
      if (!otpMatches(otp, row)) {
        await sql.query('UPDATE mc_email_otps SET attempt_count=attempt_count+1 WHERE id=$1 AND used_at IS NULL', [requestId]);
        return sendJson(res, { ok: false, error: 'OTP_INVALID', message: 'รหัสไม่ถูกต้อง ลองอีกครั้งครับ' }, 401);
      }
      const claimed = await sql.query(`UPDATE mc_email_otps SET used_at=$1
        WHERE id=$2 AND used_at IS NULL AND expires_at>$1 RETURNING normalized_email`, [now, requestId]);
      if (!claimed[0]) return sendJson(res, { ok: false, error: 'OTP_ALREADY_USED' }, 409);
      const email = claimed[0].normalized_email;
      let accounts = await sql.query('SELECT id,email,display_name,member_no FROM mc_accounts WHERE email=$1', [email]);
      let account = accounts[0];
      if (!account) {
        const id = randomUUID(); const name = clean(body.name, 80) || 'Clover';
        const memberNo = await ensureMemberNo(sql, email, name, now);
        accounts = await sql.query(`INSERT INTO mc_accounts
          (id,email,display_name,password_hash,password_salt,password_iterations,member_no,consent_at,created_at,updated_at)
          VALUES ($1,$2,$3,NULL,NULL,NULL,$4,$5,$5,$5) RETURNING id,email,display_name,member_no`,
        [id, email, name, memberNo || null, now]);
        account = accounts[0];
      }
      await sql.query(`INSERT INTO mc_auth_identities (provider,provider_user_id,user_id,email,created_at)
        VALUES ('email',$1,$2,$1,$3) ON CONFLICT (provider,provider_user_id) DO NOTHING`, [email, account.id, now]);
      const session = await createSession(sql, account.id); await prune(sql);
      return sendJson(res, { ok: true, user: publicUser(account) }, 200, { 'Set-Cookie': sessionCookie(session) });
    }

    if (method === 'POST' && route[0] === 'signup') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const body = bodyOf(req); const name = clean(body.name, 80); const email = clean(body.email, 120).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!name) return sendJson(res, { ok: false, error: 'NAME_REQUIRED', message: 'ใส่ชื่อที่อยากให้เราเรียกก่อนนะครับ' }, 400);
      if (!validEmail(email)) return sendJson(res, { ok: false, error: 'EMAIL_INVALID', message: 'อีเมลยังไม่ถูกรูปแบบครับ' }, 400);
      if (password.length < 8) return sendJson(res, { ok: false, error: 'PASSWORD_SHORT', message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, 400);
      if (password.length > 128) return sendJson(res, { ok: false, error: 'PASSWORD_LONG', message: 'รหัสผ่านยาวเกิน 128 ตัวอักษรครับ' }, 400);
      if (body.consent !== true) return sendJson(res, { ok: false, error: 'CONSENT_REQUIRED', message: 'ต้องยินยอมให้เก็บบัญชีและ Progress ก่อนครับ' }, 400);
      if (await authRateLimited(sql, req, 'signup', email, 6, 60)) return sendJson(res, { ok: false, error: 'RATE_LIMITED', message: 'สมัครถี่เกินไป ลองใหม่อีกสักครู่นะครับ' }, 429);
      const existing = await sql.query('SELECT id,password_hash FROM mc_accounts WHERE email=$1', [email]);
      if (existing[0]) return sendJson(res, { ok: false, error: 'EMAIL_EXISTS', message: existing[0].password_hash ? 'อีเมลนี้มีบัญชีแล้ว ลองกดเข้าสู่ระบบครับ' : 'อีเมลนี้เคยสมัครด้วย Google หรือ LINE แล้วครับ' }, 409);
      const id = randomUUID(); const now = new Date(); const passwordRecord = await newPasswordRecord(password);
      const memberNo = await ensureMemberNo(sql, email, name, now);
      await sql.query(`INSERT INTO mc_accounts (id,email,display_name,password_hash,password_salt,password_iterations,member_no,consent_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$8)`, [id, email, name, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, memberNo || null, now]);
      await sql.query(`INSERT INTO mc_auth_identities (provider,provider_user_id,user_id,email,created_at) VALUES ('email',$1,$2,$1,$3)`, [email, id, now]);
      const token = await createSession(sql, id); await prune(sql);
      return sendJson(res, { ok: true, user: { id, email, displayName: name, memberNo } }, 201, { 'Set-Cookie': sessionCookie(token) });
    }

    if (method === 'POST' && route[0] === 'login') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const body = bodyOf(req); const email = clean(body.email, 120).toLowerCase(); const password = typeof body.password === 'string' ? body.password : '';
      if (await authRateLimited(sql, req, 'login', email, 20, 15)) return sendJson(res, { ok: false, error: 'RATE_LIMITED', message: 'ลองเข้าสู่ระบบถี่เกินไป รออีกสักครู่นะครับ' }, 429);
      const rows = validEmail(email) ? await sql.query('SELECT id,email,display_name,member_no,password_hash,password_salt,password_iterations FROM mc_accounts WHERE email=$1', [email]) : [];
      if (!rows[0] || !(await passwordMatches(password, rows[0]))) return sendJson(res, { ok: false, error: 'LOGIN_FAILED', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้องครับ' }, 401);
      const token = await createSession(sql, rows[0].id); await prune(sql);
      return sendJson(res, { ok: true, user: publicUser(rows[0]) }, 200, { 'Set-Cookie': sessionCookie(token) });
    }

    if (method === 'POST' && route[0] === 'logout') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      await destroySession(req, sql); return sendJson(res, { ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }

    if (method === 'GET' && route[0] === 'oauth' && route[2] === 'start') {
      const provider = route[1]; const returnTo = safeReturn(req.query.return || '/card/'); const origin = requestOrigin(req);
      const config = providerConfig(provider);
      if (!config) return redirect(res, accountReturn(returnTo, 'unavailable', origin));
      if (await authRateLimited(sql, req, `oauth-${provider}`, '', 30, 60)) return redirect(res, accountReturn(returnTo, 'rate_limited', origin));
      const state = await createOAuthState(sql, provider, returnTo);
      const redirectUri = `${requestOrigin(req)}/api/auth/oauth/${provider}/callback`; const challenge = await pkceChallenge(state.verifier);
      if (provider === 'google') {
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.search = new URLSearchParams({ client_id: config.id, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state: state.state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' }).toString();
        return redirect(res, auth.toString());
      }
      const auth = new URL('https://access.line.me/oauth2/v2.1/authorize');
      auth.search = new URLSearchParams({ response_type: 'code', client_id: config.id, redirect_uri: redirectUri, state: state.state, scope: 'openid profile email', code_challenge: challenge, code_challenge_method: 'S256' }).toString();
      return redirect(res, auth.toString());
    }

    if (method === 'GET' && route[0] === 'oauth' && route[2] === 'callback') {
      const provider = route[1]; const config = providerConfig(provider); const state = config ? await consumeOAuthState(sql, provider, req.query.state) : null;
      if (!config || !state) return redirect(res, '/card/?account=oauth_error');
      if (!req.query.code) return redirect(res, accountReturn(state.return_to, 'oauth_error', requestOrigin(req)));
      const redirectUri = `${requestOrigin(req)}/api/auth/oauth/${provider}/callback`;
      try {
        const identity = provider === 'google' ? await googleIdentity(req.query.code, state.verifier, redirectUri, config) : await lineIdentity(req.query.code, state.verifier, redirectUri, config);
        const account = await accountForIdentity(sql, identity); const token = await createSession(sql, account.id);
        const back = new URL(safeReturn(state.return_to), requestOrigin(req)); back.searchParams.set('account', 'connected');
        return redirect(res, `${back.pathname}${back.search}${back.hash}`, sessionCookie(token));
      } catch (error) { console.error('OAuth callback failed', provider, error); return redirect(res, accountReturn(state.return_to, 'oauth_error', requestOrigin(req))); }
    }
    return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
  } catch (error) {
    console.error('Account API failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code, message: 'ระบบสมาชิกกำลังเชื่อมฐานข้อมูล กรุณาลองใหม่อีกครั้งครับ' }, 503);
    return sendJson(res, { ok: false, error: 'ACCOUNT_API_ERROR', message: 'ระบบสมาชิกขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ' }, 500);
  }
}
