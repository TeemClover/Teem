/* /share · เก็บสถิติว่าหน้าแชร์ถูกเปิดกี่ครั้ง มาจากรหัสไหน มีคนสร้างลิงก์รหัสอะไร และกดปุ่มไหน
   เก็บแค่เหตุการณ์ (ชนิด หน้า ปุ่ม รหัส เครื่องแบบย่อ) ไม่เก็บ IP ไม่เก็บข้อมูลส่วนตัว
   รหัสเครื่องถูก hash ก่อนเก็บ ใช้นับจำนวนคนไม่ซ้ำเท่านั้น */
import { createHash } from 'node:crypto';
import { lookupReferral } from './xircle-referral.js';

export const KINDS = ['view', 'click', 'gen'];
export const PAGES = ['share', 'code', 'slide', 'routinex', 'xircle', 'review'];
export const TARGETS = ['', 'routinex', 'xircle', 'review', 'buy', 'forward', 'copy', 'send', 'open'];
export const RANGES = [1, 7, 30, 90, 0];

const kinds = new Set(KINDS);
const pages = new Set(PAGES);
const targets = new Set(TARGETS);
const schemas = new WeakMap();
const hash = value => createHash('sha256').update(value).digest('hex');

export function cleanRef(value) {
  return String(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32).toUpperCase();
}

export function deviceOf(userAgent) {
  const ua = String(userAgent || '');
  if (/\bLine\//i.test(ua)) return 'line';
  if (/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)) return 'facebook';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'tiktok';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function validateEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = String(raw.kind || '');
  const page = String(raw.page || '');
  const target = String(raw.target || '');
  if (!kinds.has(kind) || !pages.has(page) || !targets.has(target)) return null;
  if (kind === 'click' && !target) return null;
  if (kind !== 'click' && target) return null;
  const ref = cleanRef(raw.ref);
  if (kind === 'gen' && !ref) return null;
  const vid = typeof raw.vid === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(raw.vid) ? raw.vid : '';
  return { kind, page, target, ref, visitor: vid ? hash(`share-v1|${vid}`).slice(0, 32) : '' };
}

export function sameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (req.headers.origin) return req.headers.origin === `${proto}://${host}`;
  // บันทึกต้องมาจากเบราว์เซอร์ในเว็บเดียวกัน ส่วนการอ่านยังต้องล็อกอินหลังบ้านอยู่ดี
  return req.method === 'GET';
}

export async function ensureShareStatSchema(sql) {
  if (!schemas.has(sql)) schemas.set(sql, (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_share_events (
      id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(),
      kind TEXT NOT NULL, page TEXT NOT NULL, target TEXT NOT NULL DEFAULT '',
      ref TEXT NOT NULL DEFAULT '', visitor TEXT NOT NULL DEFAULT '', device TEXT NOT NULL DEFAULT ''
    )`);
    await sql.query('CREATE INDEX IF NOT EXISTS mc_share_events_at ON mc_share_events(at)');
    await sql.query('CREATE TABLE IF NOT EXISTS mc_share_stat_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL)');
    // ชื่อเจ้าของรหัส ถามจาก buy.xircle.health แล้วจำไว้ (ไม่ต้องถามซ้ำทุกครั้งที่เปิดหน้าสถิติ)
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_share_ref_names (
      ref TEXT PRIMARY KEY, status TEXT NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '', checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  })().catch(error => { schemas.delete(sql); throw error; }));
  return schemas.get(sql);
}

// ถามใหม่เมื่อไหร่: ชื่อจริง 7 วัน · รหัสผิดไม่ถามซ้ำ (คนใส่มั่ว) · ถามไม่สำเร็จ 10 นาที
const FRESH_SECONDS = { valid: 7 * 86400, not_found: Infinity, error: 600 };
const LOOKUP_BUDGET_MS = 5000;
const LOOKUP_MAX = 60;
const LOOKUP_PARALLEL = 6;

export function createShareStatStore(sql, { lookup = lookupReferral, now = () => Date.now() } = {}) {
  /* ชื่อของรหัสในรายงาน: ใช้ที่จำไว้ ถ้ายังไม่มีหรือเก่าแล้วค่อยถามทีละรหัส มีเวลาจำกัด ที่เหลือถามรอบหน้า */
  async function names(codes) {
    const list = [...new Set(codes.map(cleanRef).filter(Boolean))];
    if (!list.length) return {};
    const rows = await sql.query(`SELECT ref,status,first_name,last_name,role,
        extract(epoch FROM now()-checked_at)::int age FROM mc_share_ref_names WHERE ref = ANY($1::text[])`, [list]);
    const known = Object.fromEntries(rows.map(r => [r.ref, r]));
    const stale = list.filter(code => !known[code] || Number(known[code].age) > (FRESH_SECONDS[known[code].status] ?? 0)).slice(0, LOOKUP_MAX);
    const started = now();
    let next = 0;
    const worker = async () => {
      while (next < stale.length && now() - started < LOOKUP_BUDGET_MS) {
        const code = stale[next++];
        const found = await lookup(code);
        if (found.status === 'error' && known[code] && known[code].status !== 'error') continue; // ชื่อเดิมยังใช้ได้
        const row = { ref: code, status: found.status, first_name: found.first_name || '', last_name: found.last_name || '', role: found.role || '' };
        await sql.query(`INSERT INTO mc_share_ref_names(ref,status,first_name,last_name,role,checked_at) VALUES($1,$2,$3,$4,$5,now())
          ON CONFLICT(ref) DO UPDATE SET status=$2,first_name=$3,last_name=$4,role=$5,checked_at=now()`,
        [row.ref, row.status, row.first_name, row.last_name, row.role]);
        known[code] = row;
      }
    };
    await Promise.all(Array.from({ length: Math.min(LOOKUP_PARALLEL, stale.length) }, worker));
    const out = {};
    for (const code of list) {
      const r = known[code];
      out[code] = r ? { status: r.status, name: `${r.first_name} ${r.last_name}`.trim(), role: r.role } : { status: 'pending', name: '', role: '' };
    }
    return out;
  }

  return {
    names,
    async accept(req, event) {
      // ถังกันยิงรัว หมุนทุกชั่วโมง เก็บแค่ hash ของ IP ไว้ 2 ชั่วโมง ไม่อยู่ในตารางสถิติ
      const hour = new Date().toISOString().slice(0, 13);
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const limits = await sql.query(`INSERT INTO mc_share_stat_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '2 hours')
        ON CONFLICT(bucket) DO UPDATE SET hits=mc_share_stat_limits.hits+1 WHERE mc_share_stat_limits.hits<600 RETURNING hits`,
      [hash(`share-limit|${hour}|${ip}`)]);
      if (!limits.length) return false;
      await sql.query('INSERT INTO mc_share_events(kind,page,target,ref,visitor,device) VALUES($1,$2,$3,$4,$5,$6)',
        [event.kind, event.page, event.target, event.ref, event.visitor, deviceOf(req.headers['user-agent'])]);
      if (Number(limits[0].hits) === 1) {
        await sql.query('DELETE FROM mc_share_stat_limits WHERE expires_at<now()');
        await sql.query("DELETE FROM mc_share_events WHERE at<now()-interval '400 days'");
      }
      return true;
    },

    async report(days) {
      const filter = `($1::int=0 OR at >= (date_trunc('day',now() AT TIME ZONE 'Asia/Bangkok') - ($1::int-1)*interval '1 day') AT TIME ZONE 'Asia/Bangkok')`;
      const shareView = "kind='view' AND page='share'";
      const queries = {
        summary: `SELECT
            count(*) FILTER(WHERE ${shareView})::int share_views,
            count(DISTINCT visitor) FILTER(WHERE ${shareView} AND visitor<>'')::int share_visitors,
            count(DISTINCT ref) FILTER(WHERE ${shareView} AND ref<>'')::int share_refs,
            count(*) FILTER(WHERE kind='click' AND page='share')::int share_clicks,
            count(*) FILTER(WHERE kind='click' AND target='buy')::int buy_clicks,
            count(*) FILTER(WHERE kind='gen')::int gens,
            count(DISTINCT ref) FILTER(WHERE kind='gen')::int gen_codes,
            count(*) FILTER(WHERE kind='view' AND page IN ('routinex','xircle','review'))::int dest_views
          FROM mc_share_events WHERE ${filter}`,
        refs: `SELECT ref,
            count(*) FILTER(WHERE ${shareView})::int views,
            count(DISTINCT visitor) FILTER(WHERE ${shareView} AND visitor<>'')::int visitors,
            count(*) FILTER(WHERE kind='click' AND page='share' AND target='routinex')::int routinex,
            count(*) FILTER(WHERE kind='click' AND page='share' AND target='xircle')::int xircle,
            count(*) FILTER(WHERE kind='click' AND page='share' AND target='review')::int review,
            count(*) FILTER(WHERE kind='click' AND target='buy')::int buy,
            count(*) FILTER(WHERE kind='view' AND page IN ('routinex','xircle','review'))::int dest_views,
            to_char(max(at) AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') last_at
          FROM mc_share_events WHERE kind<>'gen' AND page NOT IN ('code','slide') AND ${filter}
          GROUP BY ref ORDER BY views DESC, buy DESC, ref LIMIT 3000`,
        gens: `SELECT ref code,count(*)::int gens,count(DISTINCT visitor) FILTER(WHERE visitor<>'')::int devices,
            to_char(min(at) AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') first_at,
            to_char(max(at) AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') last_at
          FROM mc_share_events WHERE kind='gen' AND ${filter} GROUP BY ref ORDER BY gens DESC, last_at DESC LIMIT 3000`,
        clicks: `SELECT page,target,count(*)::int clicks,count(DISTINCT visitor) FILTER(WHERE visitor<>'')::int visitors
          FROM mc_share_events WHERE kind='click' AND ${filter} GROUP BY page,target ORDER BY clicks DESC`,
        pages: `SELECT page,count(*)::int views,count(DISTINCT visitor) FILTER(WHERE visitor<>'')::int visitors
          FROM mc_share_events WHERE kind='view' AND ${filter} GROUP BY page ORDER BY views DESC`,
        devices: `SELECT device,count(*)::int views FROM mc_share_events WHERE ${shareView} AND ${filter} GROUP BY device ORDER BY views DESC`,
        daily: `SELECT to_char(at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD') AS day,
            count(*) FILTER(WHERE ${shareView})::int views,
            count(*) FILTER(WHERE kind='click' AND page='share')::int clicks,
            count(*) FILTER(WHERE kind='click' AND target='buy')::int buy,
            count(*) FILTER(WHERE kind='gen')::int gens
          FROM mc_share_events WHERE ${filter} GROUP BY day ORDER BY day DESC LIMIT 120`,
        hourly: `SELECT to_char(at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD') AS day,
            extract(hour FROM at AT TIME ZONE 'Asia/Bangkok')::int AS hour,
            count(*) FILTER(WHERE ${shareView})::int views,
            count(*) FILTER(WHERE kind='click' AND page='share')::int clicks,
            count(*) FILTER(WHERE kind='click' AND target='buy')::int buy,
            count(*) FILTER(WHERE kind='gen')::int gens
          FROM mc_share_events WHERE ${filter} GROUP BY day,hour ORDER BY day,hour LIMIT 12000`,
        coverage: `SELECT to_char(min(at) AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') first_at FROM mc_share_events WHERE $1::int>=0`,
      };
      const entries = await Promise.all(Object.entries(queries).map(async ([key, query]) => [key, await sql.query(query, [days])]));
      const result = Object.fromEntries(entries);
      let refNames = {};
      try { refNames = await names([...result.refs.map(r => r.ref), ...result.gens.map(r => r.code)]); } catch (error) {
        console.error(JSON.stringify({ route: 'share-stat', event: 'names-error', code: error?.code || error?.name || 'ERROR' }));
      }
      return { ...result, names: refNames, summary: result.summary[0], coverage: result.coverage[0], days, timezone: 'Asia/Bangkok', generatedAt: new Date().toISOString() };
    },
  };
}
