import {
  currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './_lib/core.js';
import {
  aiConfigured, hasPersona, isDirectedAtPet, readAndRespond,
} from './_lib/pet-brain.js';
import { AVATAR_BY_ID } from '../xty/_shared/avatars.js';
import { PET_BY_ID } from '../xty/_shared/pets.js';

const ICT_OFFSET_MINUTES = 7 * 60;
const ICT_OFFSET_MS = ICT_OFFSET_MINUTES * 60000;
const WAKE_HOURS = [0, 6, 12, 18];
const LOG_SLICE = 120;
/* หนึ่งรอบต้องอ่าน "ทุกสมุดที่มีเหตุ" ไม่ใช่สุ่มบางสมุด

   เวลาเกือบทั้งหมดของหนึ่งสมุดคือการนั่งรอโมเดลตอบ ไม่ใช่การประมวลผล
   การวนทีละสมุดจึงเป็นการต่อคิวรอเปล่า ๆ — ทำพร้อมกันทีละกลุ่มทำให้ 100 สมุด
   จบในเวลาที่เดิมใช้กับสิบกว่าสมุด

   และมีงบเวลาไว้ด้วย: พองบใกล้หมดจะหยุด "เริ่ม" สมุดใหม่ สมุดที่ยังไม่ได้
   เริ่มจะไม่ถูกจอง รอบถัดไปจึงหยิบไปทำได้ตามปกติ ดีกว่าถูกฆ่ากลางทาง
   แล้วสมุดที่จองไว้เงียบหายไปหกชั่วโมงโดยไม่มีใครรู้

   ค่าพวกนี้อ่านจาก env ตอนเรียกทุกครั้ง ไม่ใช่ตอนโหลดไฟล์ — ปรับจังหวะรอบตื่น
   ได้จากหน้า Vercel โดยไม่ต้อง deploy ใหม่ */
function wakeTuning() {
  return {
    limit: Number(process.env.XTY_PET_WAKE_LIMIT) || 400,
    concurrency: Math.max(1, Number(process.env.XTY_PET_WAKE_CONCURRENCY) || 6),
    budgetMs: Math.max(100, Number(process.env.XTY_PET_WAKE_BUDGET_MS) || 45000),
  };
}
const ACTIVE_STATES = ['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE'];
const WHITE_CAT_ID = 'xvisor_white_cat_silver';
const WHITE_CAT_INTRO = 'อยู่ด้วยกันตรงนี้นะ 🐈 ถ้าอยากถามอะไร พิมพ์ “แมวขาว” แล้วตามด้วยคำถามได้เลย — เรื่อง Xircle, RoutineX, ABCD หรือสมุดนี้ก็ได้';

function wakeWindow(now = new Date()) {
  const local = new Date(now.getTime() + ICT_OFFSET_MS);
  const hour = [...WAKE_HOURS].reverse().find(value => value <= local.getUTCHours()) ?? 0;
  local.setUTCHours(hour, 0, 0, 0);
  return { hour, start: new Date(local.getTime() - ICT_OFFSET_MS) };
}

function dayKey(date = new Date()) {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function dataOf(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function avatarName(id) { return AVATAR_BY_ID[id]?.nameTh || String(id || 'ตัวละคร'); }

function eventLine(type, rawData) {
  const data = dataOf(rawData);
  switch (String(type || '')) {
    case 'PARTY_CREATED': return data.coverName
      ? `${data.alias || 'เจ้าของสมุด'} เปิดสมุดนี้ และใช้ ${data.coverName} เป็นการ์ดประจำสมุด`
      : (data.alias ? `${data.alias} เปิดสมุดนี้` : 'สมุดถูกสร้างขึ้น');
    case 'MEMBER_JOINED': return `${data.alias || 'สมาชิก'} เข้าร่วมสมุด`;
    case 'MEMBER_LEFT': return `${data.alias || 'สมาชิก'} ออกจากสมุด`;
    case 'MEMBER_KICKED': return `${data.alias || 'สมาชิก'} ถูกนำออกจากสมุด`;
    case 'MEMBER_ALIAS_CHANGED': return `${data.from || 'สมาชิก'} เปลี่ยนชื่อในสมุดเป็น ${data.to || data.alias || 'ชื่อใหม่'}`;
    case 'MEMBER_AVATAR_CHANGED': {
      const alias = data.alias || 'สมาชิก';
      if (data.fromAvatar || data.toAvatar) return `${alias} เปลี่ยนตัวละครจาก ${avatarName(data.fromAvatar)} เป็น ${avatarName(data.toAvatar)}`;
      return `${alias} เปลี่ยนตัวละครเป็น ${avatarName(data.avatar)}`;
    }
    case 'LEAD_TRANSFERRED': return `${data.to || 'สมาชิกคนถัดไป'} รับหน้าที่เจ้าของสมุดต่อจาก ${data.from || 'เจ้าของสมุดเดิม'}`;
    case 'PARTY_RENAMED': return `ชื่อสมุดเปลี่ยนจาก ${data.from || 'ชื่อเดิม'} เป็น ${data.to || 'ชื่อใหม่'}`;
    case 'RULE_CHANGED': return 'วันนี้ลงชื่อได้เมื่อ ของสมุดถูกเปลี่ยน';
    case 'LEAD_CARD_CHANGED': return `${data.alias || 'เจ้าของสมุด'} เปลี่ยนการ์ดประจำสมุดจาก ${data.fromName || data.from || 'ใบเดิม'} เป็น ${data.toName || data.to || 'ใบใหม่'}`;
    case 'NPC_CHANGED': return 'เพื่อนร่วมทางของสมุดถูกเปลี่ยน';
    case 'PARTY_COMPLETED': return 'ช่วง ของสมุดจบสำเร็จ';
    case 'PARTY_DISSOLVED': return 'สมุดถูกยุบ';
    default: return `เกิด Event: ${String(type || 'UNKNOWN')}`;
  }
}

function laterDate(a, b) {
  const aa = a ? new Date(a) : null; const bb = b ? new Date(b) : null;
  if (!aa || !Number.isFinite(aa.getTime())) return bb && Number.isFinite(bb.getTime()) ? bb : null;
  if (!bb || !Number.isFinite(bb.getTime())) return aa;
  return aa.getTime() >= bb.getTime() ? aa : bb;
}

async function recentLog(sql, partyId) {
  const [postRows, eventRows] = await Promise.all([
    sql.query(`SELECT p.seq,p.kind,p.body,p.sent_at,p.retracted,p.pet_id,p.image_url,m.alias FROM xty_posts p LEFT JOIN xty_members m
      ON m.party_id=p.party_id AND m.user_id=p.user_id WHERE p.party_id=$1 ORDER BY p.seq DESC LIMIT $2`, [partyId, LOG_SLICE]),
    sql.query(`SELECT id,type,data_json,created_at FROM xty_party_events WHERE party_id=$1 ORDER BY id DESC LIMIT $2`, [partyId, LOG_SLICE]),
  ]);
  const posts = postRows.reverse();
  if (posts.length) {
    const numeric = posts.filter(post => Number.isFinite(Number(post.seq))).map(post => Number(post.seq));
    if (numeric.length) {
      const reactions = await sql.query(`SELECT seq,emoji,COUNT(*)::int n FROM xty_reactions
        WHERE party_id=$1 AND seq>=$2 GROUP BY seq,emoji`, [partyId, Math.min(...numeric)]);
      const bySeq = new Map();
      for (const row of reactions) {
        const key = Number(row.seq);
        bySeq.set(key, `${bySeq.get(key) ? `${bySeq.get(key)} ` : ''}${row.emoji}×${row.n}`);
      }
      for (const post of posts) post.reactions = bySeq.get(Number(post.seq)) || '';
    }
  }
  const events = eventRows.reverse().map(event => ({
    seq: `event:${event.id}`, kind: 'event', body: eventLine(event.type, event.data_json),
    sent_at: event.created_at, retracted: false, alias: 'ระบบสมุด', reactions: '', pet_id: null, image_url: null,
  }));
  return [...posts, ...events]
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    .slice(-LOG_SLICE);
}

function reminderDue(history, lastPetAt, now = new Date()) {
  const petMs = lastPetAt ? new Date(lastPetAt).getTime() : 0;
  const nowMs = now.getTime();
  for (const post of [...history].reverse()) {
    if (post.kind !== 'message' || post.retracted || post.pet_id) continue;
    const body = String(post.body || '');
    if (!/(?:อย่าลืม|ช่วยเตือน|เตือน|ตั้งปลุก|รอบ|เวลา)/i.test(body)) continue;
    const match = body.match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?:\D|$)/);
    if (!match) continue;
    const posted = new Date(post.sent_at);
    if (!Number.isFinite(posted.getTime())) continue;
    const local = new Date(posted.getTime() + ICT_OFFSET_MS);
    const targetMs = Date.UTC(
      local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(match[1]), Number(match[2]),
    ) - ICT_OFFSET_MS;
    if (targetMs < posted.getTime()) continue;
    /* One useful callback shortly after the promised time; never carry a stale
       reminder into the next day and never repeat after the pet has spoken. */
    if (targetMs <= nowMs && nowMs - targetMs <= 12 * 3600000 && petMs < targetMs) return true;
  }
  return false;
}

async function contextFor(sql, partyId, since, now = new Date(), history = null) {
  const [counts, eventCounts, members] = await Promise.all([
    sql.query(`SELECT COUNT(*) FILTER (WHERE kind IN ('commit','message') AND sent_at>$2)::int human_updates,
      COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE AND day_key=$3::date THEN user_id END)::int committed,
      MAX(sent_at) FILTER (WHERE kind IN ('commit','message')) last_human_at,
      MAX(sent_at) FILTER (WHERE kind='pet') last_pet_at
      FROM xty_posts WHERE party_id=$1`, [partyId, since, dayKey(now)]),
    sql.query(`SELECT COUNT(*) FILTER (WHERE created_at>$2)::int event_updates,
      MAX(created_at) FILTER (WHERE created_at>$2) last_event_at FROM xty_party_events WHERE party_id=$1`, [partyId, since]),
    sql.query(`SELECT alias,role FROM xty_members WHERE party_id=$1 AND left_at IS NULL
      ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, joined_at`, [partyId]),
  ]);
  const count = counts[0] || {}; const eventCount = eventCounts[0] || {};
  const lastHumanAt = laterDate(count.last_human_at, eventCount.last_event_at);
  const lastPetAt = count.last_pet_at ? new Date(count.last_pet_at) : null;
  const fullHistory = history || await recentLog(sql, partyId);
  return {
    humanUpdates: Number(count.human_updates || 0) + Number(eventCount.event_updates || 0),
    committed: Number(count.committed || 0), members,
    lastHumanAt, lastPetAt,
    timedThreadDue: reminderDue(fullHistory, lastPetAt, now),
  };
}

/* Scheduled pets read only when the room gives them a reason. The old rule
   returned true for every wake and manufactured generic engagement bubbles. */
export function worthReading(_hour, context, force = false) {
  if (force) return true;
  if (context?.humanUpdates > 0) return true;
  if (context?.timedThreadDue) return true;
  if (context?.lastHumanAt && (!context.lastPetAt || context.lastPetAt < context.lastHumanAt)) return true;
  return false;
}

async function appendBubble(sql, party, text, wakeHour, now = new Date()) {
  const rows = await sql.query(`WITH next AS (
      UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$2 WHERE id=$1 RETURNING head_seq
    ) INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted,pet_id,wake_hour)
    SELECT $1,head_seq,$3,'pet',$4,$2,$5::date,FALSE,$6,$7 FROM next RETURNING seq`,
  [party.id, now, `pet:${party.pet_id}`, text, dayKey(now), party.pet_id, wakeHour]);
  return Number(rows[0]?.seq || 0);
}

async function restoreClaimedWake(sql, party, claimedAt) {
  const previousWake = party.pet_last_wake ? new Date(party.pet_last_wake) : null;
  await sql.query(`UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2 AND pet_last_wake=$3`,
    [previousWake, party.id, claimedAt]);
}

async function memberForRequest(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,role FROM xty_members
      WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,alias,role FROM xty_members
    WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function directReply(req, res, sql) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const code = String(body.code || '').trim();
  if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake,state
    FROM xty_parties WHERE code=$1`, [code]);
  const party = rows[0];
  if (!party || !ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
    return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  }
  if (!party.pet_id || !hasPersona(party.pet_id)) return sendJson(res, { ok: true, skipped: 'NO_PET' });
  const member = await memberForRequest(req, sql, party.id);
  if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

  const latestRows = await sql.query(`SELECT seq,user_id,kind,body,sent_at,retracted FROM xty_posts
    WHERE party_id=$1 AND kind='message' AND retracted=FALSE ORDER BY seq DESC LIMIT 1`, [party.id]);
  const latest = latestRows[0];
  if (!latest || latest.user_id !== member.user_id || !isDirectedAtPet(latest.body, party.pet_id)) {
    return sendJson(res, { ok: true, skipped: 'NOT_DIRECT' });
  }

  const already = await sql.query(`SELECT 1 FROM xty_posts WHERE party_id=$1 AND kind='pet'
    AND retracted=FALSE AND sent_at>$2 LIMIT 1`, [party.id, latest.sent_at]);
  if (already[0]) return sendJson(res, { ok: true, skipped: 'ALREADY_ANSWERED' });
  if (!aiConfigured()) {
    return sendJson(res, { ok: true, skipped: 'AI_UNAVAILABLE', behavior: 'QUIET', spoke: false, bubbles: 0 });
  }

  const now = new Date();
  const history = await recentLog(sql, party.id);
  const since = new Date(new Date(latest.sent_at).getTime() - 1);
  const context = await contextFor(sql, party.id, since, now, history);
  const decision = await readAndRespond({
    party, context, history, since, hour: wakeWindow(now).hour,
    trigger: 'direct', directText: latest.body,
  });
  if (!decision) {
    return sendJson(res, { ok: true, skipped: 'AI_PROVIDER_FAILURE', behavior: 'QUIET', spoke: false, bubbles: 0 });
  }

  const bubbles = Array.isArray(decision.bubbles) ? decision.bubbles.slice(0, 3) : [];
  let written = 0;
  for (const line of bubbles) if (await appendBubble(sql, party, line, null, now)) written += 1;
  /* A successful direct brain turn is itself a wake/read — even when the
     model deliberately chose QUIET. Provider/config failures above do not
     consume the wake, so the same activity can still be read later. */
  await sql.query('UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2', [now, party.id]);
  return sendJson(res, {
    ok: true, behavior: decision.behavior || 'QUIET', spoke: written > 0, bubbles: written,
  });
}

async function whiteCatIntro(req, res, sql) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const code = String(body.code || '').trim();
  if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake,state
    FROM xty_parties WHERE code=$1`, [code]);
  const party = rows[0];
  if (!party || !ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
    return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  }
  if (party.pet_id !== WHITE_CAT_ID) return sendJson(res, { ok: true, skipped: 'NOT_WHITE_CAT' });
  const member = await memberForRequest(req, sql, party.id);
  if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
  if (member.role !== 'lead') return sendJson(res, { ok: true, skipped: 'LEAD_ONLY_INTRO' });

  const existing = await sql.query(`SELECT 1 FROM xty_posts WHERE party_id=$1 AND kind='pet'
    AND pet_id=$2 AND retracted=FALSE LIMIT 1`, [party.id, WHITE_CAT_ID]);
  if (existing[0]) return sendJson(res, { ok: true, skipped: 'ALREADY_INTRODUCED' });

  const now = new Date();
  const seq = await appendBubble(sql, party, WHITE_CAT_INTRO, null, now);
  if (!seq) return sendJson(res, { ok: true, skipped: 'WRITE_FAILED' });
  /* The onboarding bubble is a real PET turn. Mark the room as read so the
     cron does not immediately manufacture another first-turn response. */
  await sql.query('UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2', [now, party.id]);
  return sendJson(res, { ok: true, spoke: true, bubbles: 1, intro: true });
}

function manualFallback(party) {
  const pet = PET_BY_ID[party.pet_id] || { nameTh: 'สัตว์ประจำสมุด', emoji: '🐾' };
  return [`${pet.emoji} ${pet.nameTh} ตื่นแล้ว — รอบทดสอบอ่านเรื่องในสมุดได้อยู่`];
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const sql = database(); await ensureSchema(sql);

    /* Same Vercel function, browser-authenticated direct/intro modes plus the
       CRON_SECRET scheduled wake. No extra serverless function is needed. */
    if (req.method === 'POST' && req.body?.mode === 'direct') return directReply(req, res, sql);
    if (req.method === 'POST' && req.body?.mode === 'white_cat_intro') return whiteCatIntro(req, res, sql);

    if (!process.env.CRON_SECRET) return sendJson(res, { ok: false, error: 'CRON_SECRET_NOT_CONFIGURED' }, 503);
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return sendJson(res, { ok: false, error: 'UNAUTHORIZED' }, 401);
    }

    const force = ['1', 'true', 'yes'].includes(String(req.query?.force || '').toLowerCase());
    const tuning = wakeTuning();
    const now = new Date(); const wake = wakeWindow(now);
    const due = force
      ? await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties
          WHERE pet_id IS NOT NULL AND state='ACTIVE' ORDER BY updated_at DESC LIMIT 1`)
      : await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties
          WHERE pet_id IS NOT NULL AND state='ACTIVE'
          AND (pet_last_wake IS NULL OR pet_last_wake < $1)
          ORDER BY updated_at DESC LIMIT $2`, [wake.start, tuning.limit]);

    const tally = {
      claimed: 0, read: 0, spoke: 0, bubbles: 0,
      quiet: 0, byAi: 0, providerFailures: 0, deferred: 0, failed: 0,
    };

    /* งานหนึ่งสมุดทั้งชุด เขียนเป็นก้อนเดียวเพื่อให้รันพร้อมกันได้ปลอดภัย
       ทุกทางออกต้องคืนสิทธิ์ให้สมุดถ้ายังไม่ได้พูด ไม่งั้นสมุดจะถูกนับว่า
       "รอบนี้ทำแล้ว" ทั้งที่ไม่มีอะไรเกิดขึ้น */
    async function runParty(party) {
      const marked = force
        ? await sql.query('UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2 RETURNING id', [now, party.id])
        : await sql.query(`UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2
            AND (pet_last_wake IS NULL OR pet_last_wake < $3) RETURNING id`, [now, party.id, wake.start]);
      if (!marked[0]) return;
      tally.claimed += 1;

      try {
        const since = party.pet_last_wake ? new Date(party.pet_last_wake) : wake.start;
        const history = await recentLog(sql, party.id);
        const context = await contextFor(sql, party.id, since, now, history);
        if (!worthReading(wake.hour, context, force)) {
          tally.quiet += 1;
          return;
        }

        tally.read += 1;
        let decision = null;
        if (aiConfigured() && hasPersona(party.pet_id)) {
          decision = await readAndRespond({
            party, context, history, since, hour: wake.hour, trigger: 'scheduled',
          });
          if (decision) tally.byAi += 1; else tally.providerFailures += 1;
        }

        /* Claim-before-read prevents duplicate cron workers, but a missing AI
           configuration or provider outage must not permanently consume human
           activity. Roll this claim back so the next wake can retry it. */
        if (!force && (!aiConfigured() || !hasPersona(party.pet_id) || !decision)) {
          await restoreClaimedWake(sql, party, now);
          tally.deferred += 1;
          tally.quiet += 1;
          return;
        }

        let lines = Array.isArray(decision?.bubbles) ? decision.bubbles.slice(0, 3) : [];
        if (force && !lines.length) lines = manualFallback(party);
        if (!lines.length) {
          tally.quiet += 1;
          return;
        }

        tally.spoke += 1;
        for (const line of lines) if (await appendBubble(sql, party, line, wake.hour, now)) tally.bubbles += 1;
      } catch (error) {
        /* งานสมุดเดียวล้มต้องไม่ลากทั้งรอบลงไปด้วย และสมุดนั้นต้องได้คิวรอบหน้า */
        console.error('XTY pet wake party failed', party.code, error?.message || error);
        tally.failed += 1;
        if (!force) {
          await restoreClaimedWake(sql, party, now).catch(() => {});
          tally.deferred += 1;
        }
      }
    }

    const startedAt = Date.now();
    let remaining = 0;
    for (let index = 0; index < due.length; index += tuning.concurrency) {
      if (!force && Date.now() - startedAt > tuning.budgetMs) {
        remaining = due.length - index;
        break;
      }
      await Promise.all(due.slice(index, index + tuning.concurrency).map(runParty));
    }
    if (remaining) {
      console.warn('XTY pet wake ran out of budget', `remaining=${remaining}`, `of=${due.length}`);
    }
    const { claimed, read, spoke, bubbles, quiet, byAi, providerFailures, deferred, failed } = tally;

    return sendJson(res, {
      ok: true, wakeHour: wake.hour, ai: aiConfigured(), force,
      due: due.length, claimed, read, byAi, providerFailures, deferred, failed, quiet, spoke, bubbles,
      remaining, concurrency: tuning.concurrency, elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('XTY pet wake failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'XTY_PET_WAKE_ERROR' }, 500);
  }
}
