import {
  createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual,
} from 'node:crypto';

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const OAUTH_COOKIE = 'mc_discord_oauth';
const SESSION_COOKIE = 'mc_discord';
const OAUTH_MAX_AGE_SECONDS = 10 * 60;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function config() {
  const value = {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  };
  return value.clientId && value.clientSecret && value.guildId ? value : null;
}

function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

function requestUrl(req) {
  return new URL(req.url || '/', requestOrigin(req));
}

function safeReturn(value) {
  const path = typeof value === 'string' ? value.trim().slice(0, 300) : '';
  return path.startsWith('/') && !path.startsWith('//') ? path : '/card/';
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; }
    }
  }
  return '';
}

function cookie(name, value, req, { maxAge, path = '/' } = {}) {
  const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name, req, path = '/') {
  return cookie(name, '', req, { maxAge: 0, path });
}

function encryptionKey(secret) {
  return createHash('sha256').update(`myclover-discord-cookie-v1\0${secret}`).digest();
}

export function sealDiscordCookie(payload, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openDiscordCookie(value, secret) {
  try {
    const packed = Buffer.from(String(value || ''), 'base64url');
    if (packed.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    const clear = Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(clear);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirect(res, location, cookies = []) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end();
}

function json(res, body, status = 200, cookies = []) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(JSON.stringify(body));
}

function backToCard(req, returnTo, state) {
  const back = new URL(safeReturn(returnTo), requestOrigin(req));
  back.searchParams.set('discord', state);
  return `${back.pathname}${back.search}${back.hash}`;
}

async function tokenRequest(discord, fields) {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: discord.clientId,
      client_secret: discord.clientSecret,
      ...fields,
    }),
  });
  const tokens = await response.json().catch(() => ({}));
  if (!response.ok || !tokens.access_token) {
    const error = new Error('DISCORD_TOKEN_EXCHANGE_FAILED');
    error.status = response.status;
    throw error;
  }
  return tokens;
}

async function discordProfile(accessToken) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user.id) {
    const error = new Error('DISCORD_PROFILE_FAILED');
    error.status = response.status;
    throw error;
  }
  return {
    id: String(user.id),
    displayName: String(user.global_name || user.username || 'Discord member').slice(0, 80),
  };
}

async function discordMembership(accessToken, guildId) {
  const response = await fetch(`${DISCORD_API}/users/@me/guilds/${encodeURIComponent(guildId)}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return { member: false, pending: false };
  if (!response.ok) {
    const error = new Error('DISCORD_MEMBERSHIP_CHECK_FAILED');
    error.status = response.status;
    throw error;
  }
  const guildMember = await response.json().catch(() => ({}));
  return { member: true, pending: guildMember.pending === true };
}

function makeSession(tokens, user, previous = {}) {
  const expiresIn = Math.max(60, Number(tokens.expires_in) || 604800);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || previous.refreshToken || '',
    tokenExpiresAt: Date.now() + expiresIn * 1000,
    user,
  };
}

async function refreshSession(discord, session) {
  if (!session.refreshToken) throw new Error('DISCORD_REFRESH_TOKEN_MISSING');
  const tokens = await tokenRequest(discord, {
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });
  return makeSession(tokens, session.user, session);
}

export async function discordLogin(req, res) {
  if (req.method !== 'GET') return json(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  const discord = config();
  if (!discord) return redirect(res, backToCard(req, '/card/', 'unavailable'));

  const url = requestUrl(req);
  const state = randomBytes(24).toString('base64url');
  const stateCookie = sealDiscordCookie({
    state,
    returnTo: safeReturn(url.searchParams.get('return') || '/card/'),
    createdAt: Date.now(),
  }, discord.clientSecret);
  const redirectUri = discord.redirectUri || `${requestOrigin(req)}/api/discord/callback`;
  const authorize = new URL(DISCORD_AUTHORIZE);
  authorize.search = new URLSearchParams({
    client_id: discord.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
    prompt: 'consent',
  }).toString();
  return redirect(res, authorize.toString(), [cookie(OAUTH_COOKIE, stateCookie, req, {
    maxAge: OAUTH_MAX_AGE_SECONDS,
    path: '/api/discord',
  })]);
}

export async function discordCallback(req, res) {
  if (req.method !== 'GET') return json(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  const discord = config();
  if (!discord) return redirect(res, backToCard(req, '/card/', 'unavailable'));

  const url = requestUrl(req);
  const oauth = openDiscordCookie(cookieValue(req, OAUTH_COOKIE), discord.clientSecret);
  const validState = oauth && Date.now() - Number(oauth.createdAt) <= OAUTH_MAX_AGE_SECONDS * 1000 &&
    constantTimeEqual(oauth.state, url.searchParams.get('state'));
  const clearOAuth = clearCookie(OAUTH_COOKIE, req, '/api/discord');
  if (!validState || url.searchParams.get('error') || !url.searchParams.get('code')) {
    return redirect(res, backToCard(req, oauth?.returnTo, url.searchParams.get('error') ? 'cancelled' : 'error'), [clearOAuth]);
  }

  try {
    const redirectUri = discord.redirectUri || `${requestOrigin(req)}/api/discord/callback`;
    const tokens = await tokenRequest(discord, {
      grant_type: 'authorization_code',
      code: url.searchParams.get('code'),
      redirect_uri: redirectUri,
    });
    const scopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);
    if (scopes.length && (!scopes.includes('identify') || !scopes.includes('guilds.members.read'))) {
      throw new Error('DISCORD_SCOPES_MISSING');
    }
    const user = await discordProfile(tokens.access_token);
    const session = makeSession(tokens, user);
    let membership;
    try { membership = await discordMembership(session.accessToken, discord.guildId); }
    catch { membership = null; }
    const sealed = sealDiscordCookie(session, discord.clientSecret);
    const result = membership ? (membership.member ? 'connected' : 'not_member') : 'check_error';
    return redirect(res, backToCard(req, oauth.returnTo, result), [
      clearOAuth,
      cookie(SESSION_COOKIE, sealed, req, { maxAge: SESSION_MAX_AGE_SECONDS, path: '/api/discord' }),
    ]);
  } catch (error) {
    console.error('Discord OAuth callback failed', error.message, error.status || '');
    return redirect(res, backToCard(req, oauth.returnTo, 'error'), [clearOAuth]);
  }
}

export async function discordStatus(req, res) {
  if (req.method !== 'GET') return json(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  const discord = config();
  if (!discord) return json(res, { ok: true, available: false, connected: false, member: false });

  let session = openDiscordCookie(cookieValue(req, SESSION_COOKIE), discord.clientSecret);
  if (!session?.accessToken || !session?.user?.id) {
    return json(res, { ok: true, available: true, connected: false, member: false });
  }

  let changed = false;
  try {
    if (Number(session.tokenExpiresAt) <= Date.now() + 60000) {
      session = await refreshSession(discord, session);
      changed = true;
    }
    let membership;
    try { membership = await discordMembership(session.accessToken, discord.guildId); }
    catch (error) {
      if (error.status !== 401) throw error;
      session = await refreshSession(discord, session);
      changed = true;
      membership = await discordMembership(session.accessToken, discord.guildId);
    }
    const cookies = changed ? [cookie(SESSION_COOKIE, sealDiscordCookie(session, discord.clientSecret), req, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/api/discord',
    })] : [];
    return json(res, {
      ok: true,
      available: true,
      connected: true,
      member: membership.member,
      pending: membership.pending,
      user: session.user,
    }, 200, cookies);
  } catch (error) {
    console.error('Discord status failed', error.message, error.status || '');
    if (error.status === 401 || error.message === 'DISCORD_REFRESH_TOKEN_MISSING') {
      return json(res, { ok: true, available: true, connected: false, member: false }, 200, [
        clearCookie(SESSION_COOKIE, req, '/api/discord'),
      ]);
    }
    return json(res, { ok: false, error: 'DISCORD_STATUS_ERROR', connected: true }, 502);
  }
}
