import {
  applyAction, createRoomState, heartbeat, joinRoom, leaveRoom, publicLobbyItem,
  readyNextMatch, seatForHash, setHand, validCode, viewFor,
} from '../../../core7/backend/room-service.js';
import {
  recordBotMatchComplete, recordBotMatchStart, syncRoomAnalytics,
} from '../../../core7/backend/analytics.js';
import {
  CORE7_ANALYTICS_VERSION, CORE7_GAME_VERSION,
  readMatchCounters, recordBotDevelopment, recordClientEvent, syncRoomDevelopment,
  migrateSilverDatabase,
} from '../../../core7/backend/analytics-v11.js';
import { readAnalyticsDevelopmentReport } from '../../../core7/backend/analytics-v11-report.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { ...JSON_HEADERS, ...extra },
});

async function bodyOf(request) {
  try { return await request.json(); } catch { return {}; }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function rateLimited(db, request, action, limit) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const minute = Math.floor(Date.now() / 60000);
  const bucket = (await sha256(`${ip}|${action}|${minute}`)).slice(0, 32);
  await db.prepare('DELETE FROM c7_beta_rate_limits WHERE expires_at < ?').bind(Date.now()).run();
  await db.prepare(
    'INSERT INTO c7_beta_rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1',
  ).bind(bucket, (minute + 2) * 60000).run();
  const row = await db.prepare('SELECT hits FROM c7_beta_rate_limits WHERE bucket = ?').bind(bucket).first();
  return Number(row?.hits || 0) > limit;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return String(n).padStart(4, '0');
}

function routeParts(context) {
  const raw = context.params.path;
  return (Array.isArray(raw) ? raw : String(raw || '').split('/')).filter(Boolean);
}

async function readRoom(db, code) {
  const row = await db.prepare(
    'SELECT state_json, version FROM c7_beta_rooms WHERE room_code = ? AND expires_at > ?',
  ).bind(code, Date.now()).first();
  return row ? { state: JSON.parse(row.state_json), version: row.version } : null;
}

async function mutateRoom(db, code, mutation, afterSave) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await readRoom(db, code);
    if (!row) return { error: 'ROOM_NOT_FOUND', status: 404 };
    const before = JSON.parse(JSON.stringify(row.state));
    const result = await mutation(row.state);
    if (result?.ok === false) return { error: result.error, status: result.error === 'ROOM_FULL' ? 409 : 400 };
    const nextVersion = row.version + 1;
    const saved = await db.prepare(
      'UPDATE c7_beta_rooms SET state_json = ?, status = ?, visibility = ?, mode = ?, updated_at = ?, expires_at = ?, version = ? WHERE room_code = ? AND version = ?',
    ).bind(
      JSON.stringify(row.state), row.state.status, row.state.visibility, row.state.mode,
      row.state.updatedAt, row.state.expiresAt, nextVersion, code, row.version,
    ).run();
    if (saved.meta?.changes === 1) {
      if (afterSave) afterSave(before, row.state);
      return { state: row.state, result, version: nextVersion };
    }
  }
  return { error: 'ROOM_BUSY', status: 409 };
}

async function authenticate(request, room) {
  const value = request.headers.get('authorization') || '';
  const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  if (!token) return null;
  return seatForHash(room, await sha256(token));
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'CORE7_DB_NOT_CONFIGURED' }, 503);
  const parts = routeParts(context);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  /* แปลงข้อมูลเก่าจาก GRAY เป็น SILVER — มี flag กันไว้ในตัว รันจริงครั้งเดียว
     ต่อ worker instance ที่เหลือคืนทันที ถ้าพลาดก็ไม่ทำให้ request ล้ม
     เพราะสถิติที่แปลงไม่ทันเสียหายน้อยกว่าเกมเล่นไม่ได้ */
  await migrateSilverDatabase(env.DB).catch(error => console.error('CORE7 silver migration failed', error));

  if (method === 'GET' && parts[0] === 'health') {
    return json({ ok: true, version: CORE7_GAME_VERSION, analytics: CORE7_ANALYTICS_VERSION });
  }

  /* ตัวนับสาธารณะสำหรับหน้าแรกของเกม — ไม่มีข้อมูลรายบุคคล มีแค่ผลรวม */
  if (method === 'GET' && parts[0] === 'counters') {
    try {
      return json(await readMatchCounters(env.DB));
    } catch (error) {
      console.error('CORE7 counters failed', error);
      return json({ ok: false, error: 'COUNTERS_UNAVAILABLE' }, 500);
    }
  }

  if (method === 'GET' && parts[0] === 'stats') {
    const url = new URL(request.url);
    try {
      const stats = await readAnalyticsDevelopmentReport(env.DB, {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
      });
      return json(stats);
    } catch (error) {
      console.error('CORE7 stats failed', error);
      return json({ ok: false, error: 'STATS_UNAVAILABLE' }, 500);
    }
  }

  if (method === 'POST' && parts[0] === 'analytics' && parts[1] === 'event') {
    if (await rateLimited(env.DB, request, 'client-analytics', 240)) {
      return json({ ok: false, error: 'RATE_LIMITED' }, 429);
    }
    const result = await recordClientEvent(env.DB, await bodyOf(request));
    return json(result, result.ok ? 202 : 400);
  }

  if (method === 'POST' && parts[0] === 'analytics' && parts[1] === 'bot') {
    if (await rateLimited(env.DB, request, 'bot-analytics', 180)) {
      return json({ ok: false, error: 'RATE_LIMITED' }, 429);
    }
    const body = await bodyOf(request);
    const stage = parts[2];
    const result = stage === 'start'
      ? await recordBotMatchStart(env.DB, body)
      : (stage === 'complete' ? await recordBotMatchComplete(env.DB, body) : null);
    if (!result) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    if (result.ok) {
      const task = recordBotDevelopment(env.DB, stage, body).catch(error => {
        console.error('CORE7 bot development analytics failed', error);
      });
      if (typeof context.waitUntil === 'function') context.waitUntil(task); else await task;
    }
    return json(result, result.ok ? 202 : 400);
  }

  if (parts[0] !== 'rooms') return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const scheduleAnalytics = (before, after) => {
    const task = Promise.all([
      syncRoomAnalytics(env.DB, before, after),
      syncRoomDevelopment(env.DB, before, after),
    ]).catch(error => console.error('CORE7 room analytics failed', error));
    if (typeof context.waitUntil === 'function') context.waitUntil(task);
  };

  if (method === 'GET' && parts.length === 1) {
    const rows = await env.DB.prepare(
      "SELECT state_json FROM c7_beta_rooms WHERE visibility = 'public' AND status = 'WAITING' AND expires_at > ? ORDER BY created_at DESC LIMIT 50",
    ).bind(Date.now()).all();
    const rooms = (rows.results || []).map(row => publicLobbyItem(JSON.parse(row.state_json))).filter(Boolean);
    return json({ ok: true, rooms });
  }

  if (method === 'POST' && parts.length === 1) {
    if (await rateLimited(env.DB, request, 'create', 12)) return json({ ok: false, error: 'RATE_LIMITED' }, 429);
    const body = await bodyOf(request);
    const token = randomToken();
    const authHash = await sha256(token);
    await env.DB.prepare('DELETE FROM c7_beta_rooms WHERE expires_at <= ?').bind(Date.now()).run();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const code = randomCode();
      const now = Date.now();
      const room = createRoomState({
        roomId: crypto.randomUUID(), code, displayName: body.displayName,
        authHash, visibility: body.visibility, mode: body.mode, now,
      });
      try {
        await env.DB.prepare(
          'INSERT INTO c7_beta_rooms (room_code, room_id, status, visibility, mode, state_json, version, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
        ).bind(code, room.roomId, room.status, room.visibility, room.mode, JSON.stringify(room), now, now, room.expiresAt).run();
        return json({ ok: true, code, token, view: viewFor(room, 'a') }, 201);
      } catch (error) {
        if (!String(error).toLowerCase().includes('unique')) throw error;
      }
    }
    return json({ ok: false, error: 'ROOM_CAPACITY_REACHED' }, 503);
  }

  const code = parts[1];
  if (!validCode(code)) return json({ ok: false, error: 'INVALID_ROOM_CODE' }, 400);

  if (method === 'POST' && parts[2] === 'join') {
    if (await rateLimited(env.DB, request, 'join', 30)) return json({ ok: false, error: 'RATE_LIMITED' }, 429);
    const body = await bodyOf(request);
    const token = randomToken();
    const authHash = await sha256(token);
    const changed = await mutateRoom(env.DB, code, room => joinRoom(room, { displayName: body.displayName, authHash }));
    if (changed.error) return json({ ok: false, error: changed.error }, changed.status);
    return json({ ok: true, code, token, view: viewFor(changed.state, 'b') });
  }

  const existing = await readRoom(env.DB, code);
  if (!existing) return json({ ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  const seat = await authenticate(request, existing.state);
  if (!seat) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  if (method === 'GET' && parts[2] === 'state') {
    if ((existing.state.players[seat]?.lastSeenAt || 0) < Date.now() - 5000) {
      const changed = await mutateRoom(env.DB, code, room => heartbeat(room, seat));
      if (!changed.error) return json({ ok: true, version: changed.version, ...viewFor(changed.state, seat) });
    }
    return json({ ok: true, version: existing.version, ...viewFor(existing.state, seat) });
  }

  const changed = await mutateRoom(env.DB, code, async room => {
    const currentSeat = await authenticate(request, room);
    if (!currentSeat) return { ok: false, error: 'UNAUTHORIZED' };
    const body = await bodyOf(request);
    if (parts[2] === 'hand') return setHand(room, currentSeat, body.cards);
    if (parts[2] === 'action') return applyAction(room, currentSeat, body.action || {});
    if (parts[2] === 'next') return readyNextMatch(room, currentSeat);
    if (parts[2] === 'leave') return leaveRoom(room, currentSeat);
    return { ok: false, error: 'NOT_FOUND' };
  }, scheduleAnalytics);
  if (changed.error) return json({ ok: false, error: changed.error }, changed.status);
  return json({ ok: true, version: changed.version, ...viewFor(changed.state, seat) });
}
