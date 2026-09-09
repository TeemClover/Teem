import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { createMeetHandler } from '../../../api/_lib/meet-handler.js';

export const LOCAL_MEET_ADMIN_KEY = 'frontdoor-local-meet-only';
const MAX_BYTES = 16 * 1024;

/** Real disk-backed SQLite for local review only. The production Meet SQL is
 * executed after translating its PostgreSQL types, casts and parameters.
 * No production DB, credentials or notification implementation are invoked. */
export function createLocalMeet(filename) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=2000');
  const sql = { async query(statement, values = []) {
    const parameters = [];
    const translated = statement
      .replace(/BIGSERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/::(?:jsonb|int)\b/gi, '')
      .replace(/\b(?:TIMESTAMPTZ|JSONB)\b/g, 'TEXT')
      .replace(/NOW\(\) - INTERVAL '1 hour'/g, "strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')")
      .replace(/\$(\d+)/g, (_, index) => {
        const value = values[Number(index) - 1];
        parameters.push(value instanceof Date ? value.toISOString() : value);
        return '?';
      });
    return sqlite.prepare(translated).all(...parameters).map(row => ({ ...row }));
  } };
  const handler = createMeetHandler({
    database: () => sql,
    config: Object.freeze({ MEET_ADMIN_KEY: LOCAL_MEET_ADMIN_KEY }),
    notify: async () => ({
      line: { status: 'skipped', detail: 'LOCAL_NOTIFICATIONS_DISABLED' },
      telegram: { status: 'skipped', detail: 'LOCAL_NOTIFICATIONS_DISABLED' },
    }),
    makeReference: () => `LOCAL-MEET-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    receipt: Object.freeze({ env: 'local', notifications: 'disabled' }),
    sendJson(res, body, status = 200) {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    },
  });
  return {
    filename, sqlite,
    async fetch(request) {
      const url = new URL(request.url);
      // This adapter must never be a public API or accept a forwarded identity.
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return new Response('Local preview only', { status: 403 });
      let body = {};
      if (['POST', 'PATCH'].includes(request.method)) {
        if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return new Response('Payload too large', { status: 413 });
        const reader = request.body?.getReader();
        let bytes = 0; const chunks = [];
        if (reader) {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            bytes += next.value.byteLength;
            if (bytes > MAX_BYTES) { await reader.cancel(); return new Response('Payload too large', { status: 413 }); }
            chunks.push(next.value);
          }
        }
        try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
        catch { return Response.json({ ok: false, message: 'Malformed JSON' }, { status: 400 }); }
      }
      const headers = Object.fromEntries(request.headers);
      delete headers['x-forwarded-for'];
      headers.host = url.host;
      headers['x-forwarded-host'] = url.host;
      headers['x-forwarded-proto'] = url.protocol.slice(0, -1);
      let response;
      const responseHeaders = new Headers();
      await handler({ method: request.method, body, headers, socket: { remoteAddress: '127.0.0.1' } }, {
        statusCode: 200,
        setHeader(name, value) { responseHeaders.set(name, value); },
        end(data) { response = new Response(data, { status: this.statusCode, headers: responseHeaders }); },
      });
      return response;
    },
    close() { sqlite.close(); },
  };
}
