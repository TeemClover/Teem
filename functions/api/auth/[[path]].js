import {
  accountForIdentity, authRateLimited, clean, clearSessionCookie, consumeOAuthState, createOAuthState,
  createSession, currentUser, destroySession, ensureAccountSchema, ensureMemberNo, json, newPasswordRecord,
  passwordMatches, pkceChallenge, providerConfig, publicUser, prune, safeReturn,
  sameOrigin, sessionCookie, validEmail,
} from '../../_lib/account.js';

function parts(context) {
  const value = context.params.path;
  return Array.isArray(value) ? value : String(value || '').split('/').filter(Boolean);
}

async function bodyOf(request) {
  try { return await request.json(); } catch { return null; }
}

function redirect(url, cookie) {
  const headers = cookie ? { 'Set-Cookie': cookie } : {};
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store', ...headers } });
}

async function googleIdentity(code, verifier, redirectUri, config) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.id, client_secret: config.secret,
      redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw new Error('google_token');
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.sub || profile.email_verified === false) throw new Error('google_profile');
  return { provider: 'google', id: String(profile.sub), email: clean(profile.email, 120), name: clean(profile.name, 80) };
}

async function lineIdentity(code, verifier, redirectUri, config) {
  const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.id, client_secret: config.secret,
      redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw new Error('line_token');
  const profileResponse = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.userId) throw new Error('line_profile');
  let email = '';
  if (tokens.id_token) {
    const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: tokens.id_token, client_id: config.id }),
    });
    const verified = await verifyResponse.json();
    if (verifyResponse.ok) email = clean(verified.email, 120);
  }
  return { provider: 'line', id: String(profile.userId), email, name: clean(profile.displayName, 80) };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'ACCOUNT_DB_NOT_CONFIGURED' }, 503);
  await ensureAccountSchema(env.DB);
  const route = parts(context);
  const method = request.method.toUpperCase();

  if (method === 'GET' && route[0] === 'providers') {
    return json({ ok: true, providers: {
      email: true,
      google: !!providerConfig(env, 'google'),
      line: !!providerConfig(env, 'line'),
    } });
  }

  if (method === 'GET' && route[0] === 'session') {
    return json({ ok: true, user: await currentUser(request, env.DB) });
  }

  if (method === 'POST' && route[0] === 'signup') {
    if (!sameOrigin(request)) return json({ ok: false, error: 'BAD_ORIGIN' }, 403);
    const body = await bodyOf(request);
    const name = clean(body && body.name, 80);
    const email = clean(body && body.email, 120).toLowerCase();
    const password = typeof (body && body.password) === 'string' ? body.password : '';
    if (!name) return json({ ok: false, error: 'NAME_REQUIRED', message: 'ใส่ชื่อที่อยากให้เราเรียกก่อนนะครับ' }, 400);
    if (!validEmail(email)) return json({ ok: false, error: 'EMAIL_INVALID', message: 'อีเมลยังไม่ถูกรูปแบบครับ' }, 400);
    if (password.length < 8) return json({ ok: false, error: 'PASSWORD_SHORT', message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, 400);
    if (password.length > 128) return json({ ok: false, error: 'PASSWORD_LONG', message: 'รหัสผ่านยาวเกิน 128 ตัวอักษรครับ' }, 400);
    if (!body || body.consent !== true) return json({ ok: false, error: 'CONSENT_REQUIRED', message: 'ต้องยินยอมให้เก็บบัญชีและ Progress ก่อนครับ' }, 400);
    if (await authRateLimited(env.DB, request, 'signup', email, 6, 60)) {
      return json({ ok: false, error: 'RATE_LIMITED', message: 'สมัครถี่เกินไป ลองใหม่อีกสักครู่นะครับ' }, 429);
    }

    const existing = await env.DB.prepare('SELECT id, password_hash FROM mc_accounts WHERE email = ?1').bind(email).first();
    if (existing) return json({ ok: false, error: 'EMAIL_EXISTS', message: existing.password_hash
      ? 'อีเมลนี้มีบัญชีแล้ว ลองกดเข้าสู่ระบบครับ'
      : 'อีเมลนี้เคยสมัครด้วย Google หรือ LINE แล้วครับ' }, 409);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordRecord = await newPasswordRecord(password);
    const memberNo = await ensureMemberNo(env.DB, email, name, now);
    await env.DB.prepare(
      `INSERT INTO mc_accounts
       (id, email, display_name, password_hash, password_salt, password_iterations, member_no, consent_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8)`
    ).bind(id, email, name, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, memberNo || null, now).run();
    await env.DB.prepare(
      `INSERT INTO mc_auth_identities (provider, provider_user_id, user_id, email, created_at)
       VALUES ('email', ?1, ?2, ?1, ?3)`
    ).bind(email, id, now).run();
    const token = await createSession(env.DB, id);
    await prune(env.DB);
    return json({ ok: true, user: { id, email, displayName: name, memberNo } }, 201, { 'Set-Cookie': sessionCookie(token) });
  }

  if (method === 'POST' && route[0] === 'login') {
    if (!sameOrigin(request)) return json({ ok: false, error: 'BAD_ORIGIN' }, 403);
    const body = await bodyOf(request);
    const email = clean(body && body.email, 120).toLowerCase();
    const password = typeof (body && body.password) === 'string' ? body.password : '';
    if (await authRateLimited(env.DB, request, 'login', email, 20, 15)) {
      return json({ ok: false, error: 'RATE_LIMITED', message: 'ลองเข้าสู่ระบบถี่เกินไป รออีกสักครู่นะครับ' }, 429);
    }
    const row = validEmail(email) ? await env.DB.prepare(
      'SELECT id, email, display_name, member_no, password_hash, password_salt, password_iterations FROM mc_accounts WHERE email = ?1'
    ).bind(email).first() : null;
    if (!row || !(await passwordMatches(password, row))) {
      return json({ ok: false, error: 'LOGIN_FAILED', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้องครับ' }, 401);
    }
    const token = await createSession(env.DB, row.id);
    await prune(env.DB);
    return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': sessionCookie(token) });
  }

  if (method === 'POST' && route[0] === 'logout') {
    if (!sameOrigin(request)) return json({ ok: false, error: 'BAD_ORIGIN' }, 403);
    await destroySession(request, env.DB);
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  if (method === 'GET' && route[0] === 'oauth' && route[2] === 'start') {
    const provider = route[1];
    const config = providerConfig(env, provider);
    if (!config) return redirect('/card/?account=unavailable');
    if (await authRateLimited(env.DB, request, `oauth-${provider}`, '', 30, 60)) return redirect('/card/?account=rate_limited');
    const url = new URL(request.url);
    const returnTo = safeReturn(url.searchParams.get('return') || '/card/');
    const state = await createOAuthState(env.DB, provider, returnTo);
    const redirectUri = `${url.origin}/api/auth/oauth/${provider}/callback`;
    const challenge = await pkceChallenge(state.verifier);
    if (provider === 'google') {
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({ client_id: config.id, redirect_uri: redirectUri,
        response_type: 'code', scope: 'openid email profile', state: state.state,
        code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      return redirect(auth.toString());
    }
    const auth = new URL('https://access.line.me/oauth2/v2.1/authorize');
    auth.search = new URLSearchParams({ response_type: 'code', client_id: config.id,
      redirect_uri: redirectUri, state: state.state, scope: 'openid profile email',
      code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return redirect(auth.toString());
  }

  if (method === 'GET' && route[0] === 'oauth' && route[2] === 'callback') {
    const provider = route[1];
    const config = providerConfig(env, provider);
    const url = new URL(request.url);
    const state = config ? await consumeOAuthState(env.DB, provider, url.searchParams.get('state')) : null;
    if (!config || !state || !url.searchParams.get('code')) return redirect('/card/?account=oauth_error');
    const redirectUri = `${url.origin}/api/auth/oauth/${provider}/callback`;
    try {
      const identity = provider === 'google'
        ? await googleIdentity(url.searchParams.get('code'), state.verifier, redirectUri, config)
        : await lineIdentity(url.searchParams.get('code'), state.verifier, redirectUri, config);
      const account = await accountForIdentity(env.DB, identity);
      const token = await createSession(env.DB, account.id);
      const back = new URL(safeReturn(state.return_to), url.origin);
      back.searchParams.set('account', 'connected');
      return redirect(`${back.pathname}${back.search}${back.hash}`, sessionCookie(token));
    } catch (error) {
      console.error('OAuth callback failed', provider, error);
      return redirect('/card/?account=oauth_error');
    }
  }

  return json({ ok: false, error: 'NOT_FOUND' }, 404);
}
