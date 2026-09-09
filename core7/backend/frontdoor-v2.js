import {
  ANALYTICS_VERSION, EVENTS, MAX_PAYLOAD_BYTES, ENVIRONMENTS, SOURCES,
  VISITOR_CLASSES, VIEWPORTS, INTENTS, DOORS, validateEvent, dedupeKey,
} from '../../assets/front-door/contract.js';
import { onRequest as protectStat } from '../../functions/stat/_middleware.js';
import { persistOutcome, readOutcomes } from './frontdoor-outcomes.js';

const DAY = 86400000;
const BKK = 7 * 3600000;
const TABLE = 'fd_v2_events';
const productionHosts = new Set(['myclover.com', 'www.myclover.com', 'teem.pages.dev']);
const schemas = new WeakMap();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

/** V2 owns a separate table. No V1 tables, identifiers or migrations are touched. */
export function ensureFrontdoorSchema(db) {
  if (!schemas.has(db)) {
    const pending = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE} (
        env TEXT NOT NULL CHECK(env IN ('local','preview','prod')),
        event_id TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE,
        install_id TEXT NOT NULL, journey_id TEXT NOT NULL, visit_id TEXT NOT NULL,
        handoff_id TEXT, event_name TEXT NOT NULL, occurred_at INTEGER NOT NULL,
        path TEXT NOT NULL, source TEXT, visitor_class TEXT,
        intent_primary TEXT, intent_secondary TEXT, door_id TEXT,
        experience_version TEXT NOT NULL, analytics_version TEXT NOT NULL,
        graphics_tier TEXT, viewport TEXT, motion TEXT, audio TEXT,
        scope TEXT NOT NULL, properties_json TEXT NOT NULL, received_at INTEGER NOT NULL,
        PRIMARY KEY (env, event_id)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS fd_v2_time ON ${TABLE}(env, occurred_at, event_name)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS fd_v2_journey ON ${TABLE}(env, install_id, journey_id, event_name, occurred_at)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS fd_v2_stage ON ${TABLE}(env, event_name, occurred_at)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS fd_v2_handoff ON ${TABLE}(env, handoff_id, event_name, occurred_at)`).run();
    })().catch(error => { schemas.delete(db); throw error; });
    schemas.set(db, pending);
  }
  return schemas.get(db);
}

export function deploymentEnvironment(request, env = {}) {
  const host = new URL(request.url).hostname.toLowerCase();
  // A bad binding must never upgrade local/known preview traffic into production.
  if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) return 'local';
  if (host.endsWith('.teem.pages.dev') && env.FRONTDOOR_ENV === 'prod') return null;
  // The binding is server configuration, never a header/query supplied by a client.
  if (env.FRONTDOOR_ENV != null) return ENVIRONMENTS.includes(env.FRONTDOOR_ENV) ? env.FRONTDOOR_ENV : null;
  if (productionHosts.has(host)) return 'prod';
  if (host.endsWith('.teem.pages.dev')) return 'preview';
  return null;
}

function allowedOrigin(request, destinationEnv) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Same-origin/server fixtures need not supply Origin.
  let url;
  try { url = new URL(origin); } catch { return false; }
  const destination = new URL(request.url);
  if (destinationEnv === 'local') return deploymentEnvironment(new Request(url.origin)) === 'local';
  if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) return false;
  if (destinationEnv === 'prod') return url.origin === destination.origin || productionHosts.has(url.hostname);
  return url.origin === destination.origin || url.hostname.endsWith('.teem.pages.dev');
}

async function limitedBody(request) {
  const length = Number(request.headers.get('content-length'));
  if (length > MAX_PAYLOAD_BYTES) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
  if (!request.body) throw Object.assign(new Error('MALFORMED_EVENT'), { status: 400 });
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PAYLOAD_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
      }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw Object.assign(new Error('MALFORMED_EVENT'), { status: 400 }); }
}

export async function persistFrontdoorEvent(db, event) {
  await ensureFrontdoorSchema(db);
  const result = await db.prepare(`INSERT INTO ${TABLE} (
    env,event_id,dedupe_key,install_id,journey_id,visit_id,handoff_id,event_name,occurred_at,
    path,source,visitor_class,intent_primary,intent_secondary,door_id,experience_version,
    analytics_version,graphics_tier,viewport,motion,audio,scope,properties_json,received_at
  ) VALUES (${Array(24).fill('?').join(',')}) ON CONFLICT DO NOTHING`).bind(
    event.env, event.eventId, dedupeKey(event), event.installId, event.journeyId, event.visitId,
    event.handoffId || null, event.eventName, event.occurredAt, event.path, event.source || null,
    event.visitorClass || null, event.intentPrimary || null, event.intentSecondary || null,
    event.doorId || null, event.experienceVersion, event.analyticsVersion, event.graphicsTier || null,
    event.viewport || null, event.motion || null, event.audio || null, event.scope,
    JSON.stringify(event.properties), Date.now(),
  ).run();
  return { ok: true, eventId: event.eventId, duplicate: Number(result.meta?.changes || 0) === 0, analyticsVersion: ANALYTICS_VERSION };
}

const filterFields = {
  source: ['source', SOURCES], visitorClass: ['visitor_class', VISITOR_CLASSES],
  viewport: ['viewport', VIEWPORTS], intentPrimary: ['intent_primary', INTENTS], doorId: ['door_id', DOORS],
};
function dayString(time) { return new Date(time + BKK).toISOString().slice(0, 10); }
function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const n = Date.parse(`${value}T00:00:00+07:00`);
  return Number.isFinite(n) && dayString(n) === value ? n : NaN;
}
function filters(params, alias = 'e') {
  const clauses = [];
  const values = [];
  for (const [key, [column, allowed]] of Object.entries(filterFields)) {
    if (params[key]) {
      if (!allowed.includes(params[key])) throw Object.assign(new Error('INVALID_FILTER'), { status: 400 });
      clauses.push(`${alias}.${column} = ?`); values.push(params[key]);
    }
  }
  return { suffix: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', values };
}
function countFields(alias = 'e') {
  return `COUNT(DISTINCT ${alias}.install_id) installations,
    COUNT(DISTINCT ${alias}.install_id || char(0) || ${alias}.journey_id) journeys, COUNT(*) events`;
}
const numbers = row => ({ installations: Number(row?.installations || 0), journeys: Number(row?.journeys || 0), events: Number(row?.events || 0) });

/** SQL aggregates all matching rows; no truncated event sample is used for metrics. */
export async function readFrontdoorStats(db, params = {}) {
  const today = dayString(Date.now());
  const from = params.from || dayString(Date.now() - 29 * DAY);
  const to = params.to || today;
  const start = parseDay(from); const end = parseDay(to) + DAY;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 93 * DAY) {
    throw Object.assign(new Error('INVALID_DATE_RANGE'), { status: 400 });
  }
  const environment = params.env || 'prod';
  if (!ENVIRONMENTS.includes(environment)) throw Object.assign(new Error('INVALID_ENV'), { status: 400 });
  const filter = filters(params);
  await ensureFrontdoorSchema(db);
  const where = `e.env = ? AND e.occurred_at >= ? AND e.occurred_at < ?${filter.suffix}`;
  const bind = [environment, start, end, ...filter.values];
  const metricResult = await db.prepare(`SELECT e.event_name, ${countFields()} FROM ${TABLE} e WHERE ${where} GROUP BY e.event_name`).bind(...bind).all();
  const metrics = Object.fromEntries(Object.keys(EVENTS).map(name => [name, numbers()]));
  for (const row of metricResult.results || []) metrics[row.event_name] = numbers(row);

  const pairs = [
    ['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE'], ['FRONTDOOR_CHOICE', 'LUCKY_RETURN'],
    ['LUCKY_RETURN', 'REWARD_HORIZON'], ['REWARD_HORIZON', 'DOOR_FOUND'],
    ['DOOR_FOUND', 'SAVE'], ['DOOR_FOUND', 'DOOR_OPEN'], ['SAVE', 'RETURN'],
    ['RETURN', 'RESUME'], ['ANOMALY_START', 'LEGACY_WARNING'], ['LEGACY_WARNING', 'DUNGEON_HANDOFF'],
  ];
  const rates = [];
  for (const [a, b] of pairs) {
    // Save cohort includes prior dates. A Return requires a later visit on the SAME saved journey.
    const returning = a === 'SAVE';
    const cohort = returning
      ? `e.env = ? AND e.occurred_at < ?${filter.suffix}` : where;
    const cohortBind = returning ? [environment, end, ...filter.values] : bind;
    const followup = `t.env=e.env AND t.install_id=e.install_id AND t.journey_id=e.journey_id
      AND t.event_name=? AND t.occurred_at>=e.occurred_at AND t.occurred_at<?
      ${returning ? 'AND t.occurred_at>=? AND t.visit_id<>e.visit_id' : ''}`;
    const row = await db.prepare(`SELECT COUNT(DISTINCT e.install_id) denominator,
      COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM ${TABLE} t WHERE ${followup}) THEN e.install_id END) numerator
      FROM ${TABLE} e WHERE ${cohort} AND e.event_name=?`).bind(
      b, end, ...(returning ? [start] : []), ...cohortBind, a,
    ).first();
    const numerator = Number(row?.numerator || 0); const denominator = Number(row?.denominator || 0);
    rates.push({ from: a, to: b, numerator, denominator, rate: denominator ? numerator / denominator : null,
      unit: 'installations', cohort: returning ? 'saved-through-range-end; return-in-range; different-visit' : 'from-in-range; same-journey; chronological' });
  }

  const timings = {};
  for (const [name, eventName] of [['activeMsToFirstChoice', 'FRONTDOOR_CHOICE'], ['activeMsToLuckyReturn', 'LUCKY_RETURN'], ['activeMsToDoorFound', 'DOOR_FOUND']]) {
    const row = await db.prepare(`WITH milestone AS (
      SELECT MIN(json_extract(e.properties_json, '$.${name}')) value
      FROM ${TABLE} e WHERE ${where} AND e.event_name=? AND json_type(e.properties_json, '$.${name}')='integer'
      GROUP BY e.install_id, e.journey_id
    ), ranked AS (SELECT value, ROW_NUMBER() OVER(ORDER BY value) rn, COUNT(*) OVER() n FROM milestone)
    SELECT AVG(value) median FROM ranked WHERE rn IN ((n+1)/2, (n+2)/2)`).bind(...bind, eventName).first();
    timings[name] = row?.median == null ? null : Number(row.median);
  }
  const transitionsResult = await db.prepare(`SELECT json_extract(e.properties_json,'$.fromNode') from_node,
    json_extract(e.properties_json,'$.toNode') to_node, ${countFields()}
    FROM ${TABLE} e WHERE ${where} AND json_extract(e.properties_json,'$.fromNode') IS NOT NULL
    AND json_extract(e.properties_json,'$.toNode') IS NOT NULL GROUP BY from_node,to_node`).bind(...bind).all();
  const transitions = (transitionsResult.results || []).map(row => ({ from: row.from_node, to: row.to_node, ...numbers(row) }));
  const breakdowns = {};
  for (const [name, [column]] of Object.entries(filterFields)) {
    const result = await db.prepare(`SELECT COALESCE(e.${column},'unknown') value, ${countFields()}
      FROM ${TABLE} e WHERE ${where} GROUP BY value ORDER BY installations DESC,value`).bind(...bind).all();
    breakdowns[name] = (result.results || []).map(row => ({ value: row.value, ...numbers(row) }));
  }
  const seedRows=await db.prepare(`SELECT json_extract(e.properties_json,'$.seedColor') value, ${countFields()}
    FROM ${TABLE} e WHERE ${where} AND json_extract(e.properties_json,'$.seedColor') IS NOT NULL GROUP BY value`).bind(...bind).all();
  breakdowns.seedColor=(seedRows.results||[]).map(row=>({value:row.value,...numbers(row)}));
  return { ok: true, status: Object.values(metrics).some(m => m.events) ? 'ready' : 'no-data',
    analyticsVersion: ANALYTICS_VERSION, range: { from, to }, timezone: 'Asia/Bangkok', env: environment,
    metrics, rates, timings, transitions, breakdowns,
    outcomes: await readOutcomes(db,where,bind,start,end),
    rows: Object.entries(metrics).map(([eventName, values]) => ({ eventName, ...values })),
    handoffMeans: 'departure-not-confirmed-arrival', generatedAt: Date.now() };
}

export async function handleFrontdoorRequest(context) {
  const { request, env = {} } = context;
  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  const isStats = pathname === '/api/core7/frontdoor-stats';
  const isOutcome = pathname === '/api/core7/analytics/frontdoor-outcome';
  const destination = deploymentEnvironment(request, env);
  const serve = async () => {
    if (!env.DB || !destination) return json({ ok: false, status: 'unwired', error: !env.DB ? 'FRONTDOOR_DB_NOT_CONFIGURED' : 'FRONTDOOR_ENV_NOT_CONFIGURED' }, 503);
    if (!allowedOrigin(request, destination)) return json({ ok: false, error: 'ORIGIN_ENV_MISMATCH' }, 403);
    const origin = request.headers.get('origin');
    const cors = origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...cors, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': isStats ? 'GET' : 'POST', 'cache-control': 'no-store',
    } });
    try {
      if (isStats) {
        if (request.method !== 'GET') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'GET' });
        const params = Object.fromEntries(new URL(request.url).searchParams);
        // A local/preview collector cannot read production rows even if a DB binding is shared.
        if (destination !== 'prod' && params.env && params.env !== destination) return json({ ok: false, error: 'ENV_MISMATCH' }, 403);
        return json(await readFrontdoorStats(env.DB, { ...params, env: params.env || destination }));
      }
      if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'POST' });
      const body = await limitedBody(request);
      if(isOutcome){
        if(body?.env!==destination)return json({ok:false,error:'ENV_MISMATCH'},403,cors);
        await ensureFrontdoorSchema(env.DB);
        return json(await persistOutcome(env.DB,body),202,cors);
      }
      const parsed = validateEvent(body);
      if (!parsed.ok) return json(parsed, parsed.error === 'PAYLOAD_TOO_LARGE' ? 413 : 400, cors);
      if (parsed.event.env !== destination) return json({ ok: false, error: 'ENV_MISMATCH' }, 403, cors);
      return json(await persistFrontdoorEvent(env.DB, parsed.event), 202, cors);
    } catch (error) {
      const status = error.status || 500;
      return json({ ok: false, status: status === 500 ? 'request-failed' : 'invalid',
        error: status === 500 ? 'FRONTDOOR_REQUEST_FAILED' : error.message }, status, cors);
    }
  };
  if (!isStats) return serve();
  const protectedResponse = await protectStat({ ...context, env, next: serve });
  // Keep the existing fail-closed gate, while making API failures understandable to Stat.
  if (protectedResponse.status === 503 && !env.STAT_PASSWORD) return json({ ok: false, status: 'unwired', error: 'STAT_ACCESS_NOT_CONFIGURED' }, 503);
  return protectedResponse;
}
