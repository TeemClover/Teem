import {
  currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './_lib/core.js';
import {
  aiConfigured, hasPersona, isDirectedAtPet, readAndRespond,
} from './_lib/pet-brain.js';
import {
  dailyPresenceRequired, presenceFallback, scheduledBubbleAllowance, shouldReadScheduled,
} from './_lib/pet/presence-policy.js';
import { AVATAR_BY_ID } from '../_shared/avatars.js';
import { PET_BY_ID } from '../_shared/pets.js';

/* A scheduled sweep is intentionally allowed to finish every live Party on
   Vercel Pro instead of abandoning the tail of the zoo after a 45s budget. */
export const config = { maxDuration: 300 };

const ICT_OFFSET_MINUTES = 7 * 60;
const ICT_OFFSET_MS = ICT_OFFSET_MINUTES * 60000;
const WAKE_HOURS = [0, 6, 12, 18];

/* Every wake inspects every live notebook. Concurrency only controls how many
   Groq turns happen together; it never limits which notebooks are scanned. */
function wakeTuning() {
  return {
    concurrency: Math.max(1, Number(process.env.TEAMBOOK_PET_WAKE_CONCURRENCY) || 12),
  };
}
const ACTIVE_STATES = ['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE'];
/* Unicorn is not a chat PET. It says goodbye at the beginning, disappears for
   the whole live book, then returns through the existing ending flow. Keep it
   out before any Party Log read or AI call; QUIET would still be a chat read. */
const MUTE_PET_ID = 'unicorn';
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
    case 'FIRST_SEEN_REWARD_EARNED': return `${data.alias || 'สมาชิก'} กด “เห็นแล้ว” ครั้งแรกและได้รับการ์ด 1 ใบ`;
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

/* Party Log is the PET's session memory. Read the whole live session: system
   events, every human message/commit, reactions and every prior PET bubble. */
async function recentLog(sql, partyId) {
  const [postRows, eventRows] = await Promise.all([
    sql.query(`SELECT p.seq,p.kind,p.body,p.sent_at,p.retracted,p.pet_id,p.image_url,m.alias,m.role
      FROM teambook_book_entries p LEFT JOIN teambook_book_members m
      ON m.book_id=p.book_id AND m.user_id=p.user_id
      WHERE p.book_id=$1 ORDER BY p.seq`, [partyId]),
    sql.query(`SELECT id,type,data_json,created_at FROM teambook_book_events
      WHERE book_id=$1 ORDER BY id`, [partyId]),
  ]);
  const posts = postRows.map(post => {
    const copy = { ...post };
    if (copy.kind === 'system' && !copy.alias) copy.alias = 'ระบบสมุด';
    if (copy.role === 'lead' && copy.alias && !copy.pet_id) copy.alias = `${copy.alias} [หัวตี้]`;
    return copy;
  });
  if (posts.length) {
    const reactions = await sql.query(`SELECT seq,emoji,COUNT(*)::int n FROM teambook_reactions
      WHERE book_id=$1 GROUP BY seq,emoji`, [partyId]);
    const bySeq = new Map();
    for (const row of reactions) {
      const key = Number(row.seq);
      bySeq.set(key, `${bySeq.get(key) ? `${bySeq.get(key)} ` : ''}${row.emoji}×${row.n}`);
    }
    for (const post of posts) post.reactions = bySeq.get(Number(post.seq)) || '';
  }
  const events = eventRows.map(event => ({
    seq: `event:${event.id}`, kind: 'event', body: eventLine(event.type, event.data_json),
    sent_at: event.created_at, retracted: false, alias: 'ระบบสมุด', reactions: '', pet_id: null, image_url: null,
  }));
  return [...posts, ...events]
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
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
    if (targetMs <= nowMs && nowMs - targetMs <= 12 * 3600000 && petMs < targetMs) return true;
  }
  return false;
}

async function contextFor(sql, partyId, since, now = new Date(), history = null) {
  const today = dayKey(now);
  const [counts, eventCounts, memberRows] = await Promise.all([
    sql.query(`SELECT
      COUNT(*) FILTER (WHERE kind IN ('commit','message') AND retracted=FALSE AND sent_at>$2)::int human_updates,
      COUNT(*) FILTER (WHERE kind IN ('commit','message') AND retracted=FALSE AND day_key=$3::date)::int human_today,
      COUNT(*) FILTER (WHERE kind='pet' AND retracted=FALSE AND day_key=$3::date)::int pet_today,
      COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE AND day_key=$3::date THEN user_id END)::int committed,
      MAX(sent_at) FILTER (WHERE kind IN ('commit','message') AND retracted=FALSE) last_human_at,
      MAX(sent_at) FILTER (WHERE kind='pet' AND retracted=FALSE) last_pet_at
      FROM teambook_book_entries WHERE book_id=$1`, [partyId, since, today]),
    sql.query(`SELECT COUNT(*) FILTER (WHERE created_at>$2)::int event_updates,
      MAX(created_at) FILTER (WHERE created_at>$2) last_event_at FROM teambook_book_events WHERE book_id=$1`, [partyId, since]),
    sql.query(`SELECT m.alias,m.role,
      COUNT(p.seq) FILTER (WHERE p.kind IN ('commit','message') AND p.retracted=FALSE AND p.day_key=$2::date)::int posts_today,
      MAX(p.sent_at) FILTER (WHERE p.kind IN ('commit','message') AND p.retracted=FALSE) last_post_at
      FROM teambook_book_members m LEFT JOIN teambook_book_entries p
        ON p.book_id=m.book_id AND p.user_id=m.user_id
      WHERE m.book_id=$1 AND m.left_at IS NULL
      GROUP BY m.user_id,m.alias,m.role,m.joined_at
      ORDER BY CASE m.role WHEN 'lead' THEN 0 ELSE 1 END, m.joined_at`, [partyId, today]),
  ]);
  const count = counts[0] || {}; const eventCount = eventCounts[0] || {};
  const lastHumanAt = laterDate(count.last_human_at, eventCount.last_event_at);
  const lastPetAt = count.last_pet_at ? new Date(count.last_pet_at) : null;
  const fullHistory = history || await recentLog(sql, partyId);
  const members = memberRows.map(member => ({
    alias: member.alias,
    role: member.role,
    postsToday: Number(member.posts_today || 0),
    lastPostAt: member.last_post_at || null,
  }));
  return {
    humanUpdates: Number(count.human_updates || 0) + Number(eventCount.event_updates || 0),
    humanToday: Number(count.human_today || 0),
    petToday: Number(count.pet_today || 0),
    committed: Number(count.committed || 0),
    members,
    lastHumanAt, lastPetAt,
    timedThreadDue: reminderDue(fullHistory, lastPetAt, now),
  };
}

/* Every live room is inspected on every scheduled wake. This function only
   decides whether the already-inspected session needs a model turn now. */
export function worthReading(hour, context, force = false) {
  return shouldReadScheduled(hour, context, force);
}

async function appendBubble(sql, party, text, wakeHour, now = new Date()) {
  const rows = await sql.query(`WITH next AS (
      UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$2 WHERE id=$1 RETURNING head_seq
    ) INSERT INTO teambook_book_entries (book_id,seq,user_id,kind,body,sent_at,day_key,retracted,pet_id,wake_hour)
    SELECT $1,head_seq,$3,'pet',$4,$2,$5::date,FALSE,$6,$7 FROM next RETURNING seq`,
  [party.id, now, `pet:${party.pet_id}`, text, dayKey(now), party.pet_id, wakeHour]);
  return Number(rows[0]?.seq || 0);
}

async function restoreClaimedWake(sql, party, claimedAt) {
  const previousWake = party.pet_last_wake ? new Date(party.pet_last_wake) : null;
  await sql.query(`UPDATE teambook_books SET pet_last_wake=$1 WHERE id=$2 AND pet_last_wake=$3`,
    [previousWake, party.id, claimedAt]);
}

async function memberForRequest(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

function latestScheduledWakeAt(now = new Date()) {
  const local = new Date(now.getTime() + ICT_OFFSET_MS);
  let hour = [...WAKE_HOURS].reverse().find(value => value <= local.getUTCHours()) ?? 0;
  if (local.getUTCHours() === hour && local.getUTCMinutes() < 27) {
    const index = WAKE_HOURS.indexOf(hour);
    if (index > 0) hour = WAKE_HOURS[index - 1];
    else { hour = WAKE_HOURS[WAKE_HOURS.length - 1]; local.setUTCDate(local.getUTCDate() - 1); }
  }
  const localMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, 27, 0, 0);
  return new Date(localMs - ICT_OFFSET_MS);
}

function firstWakeGreeting(party, context = {}) {
  const pet = PET_BY_ID[party?.pet_id] || { nameTh: 'เพื่อนร่วมทาง', emoji: '🐾' };
  const lead = (context.members || []).find(member => member.role === 'lead')?.alias || '';
  const activity = String(party?.activity || '').trim();
  const subject = activity ? `เรื่อง “${activity}”` : 'เรื่องในสมุดนี้';
  return `${pet.emoji || '🐾'} ${pet.nameTh} มารายงานตัวแล้ว — ${lead ? `${lead} ` : ''}${subject} เริ่มเดินแล้วนะ ฝากเรื่องของวันนี้ไว้ได้เลย`;
}

async function firstWakeCatchup(req, res, sql) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const code = String(body.code || '').trim();
  if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,
      COALESCE(pet_id, CASE WHEN npc_card_id LIKE 'WHITE_CAT_%' THEN '${WHITE_CAT_ID}' END) AS pet_id,
      pet_last_wake,state,created_at,started_at
    FROM teambook_books WHERE code=$1`, [code]);
  const party = rows[0];
  if (!party || !ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
    return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  }
  if (!party.pet_id || party.pet_id === MUTE_PET_ID) return sendJson(res, { ok: true, skipped: 'MUTED' });
  const member = await memberForRequest(req, sql, party.id);
  if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
  if (party.pet_last_wake) return sendJson(res, { ok: true, skipped: 'ALREADY_WOKE' });

  const dueAt = latestScheduledWakeAt(new Date());
  const openedAt = new Date(party.started_at || party.created_at || 0);
  if (!Number.isFinite(openedAt.getTime()) || openedAt.getTime() > dueAt.getTime()) {
    return sendJson(res, { ok: true, skipped: 'NOT_DUE', dueAt: dueAt.toISOString() });
  }

  const now = new Date();
  const claimed = await sql.query(`UPDATE teambook_books SET pet_last_wake=$1
    WHERE id=$2 AND pet_last_wake IS NULL RETURNING id`, [now, party.id]);
  if (!claimed[0]) return sendJson(res, { ok: true, skipped: 'ALREADY_WOKE' });
  const history = await recentLog(sql, party.id);
  const context = await contextFor(sql, party.id, dueAt, now, history);
  const wake = wakeWindow(now);
  const seq = await appendBubble(sql, party, firstWakeGreeting(party, context), wake.hour, now);
  if (!seq) {
    await sql.query('UPDATE teambook_books SET pet_last_wake=NULL WHERE id=$1 AND pet_last_wake=$2', [party.id, now]).catch(() => {});
    return sendJson(res, { ok: false, error: 'FIRST_WAKE_WRITE_FAILED' }, 500);
  }
  return sendJson(res, { ok: true, spoke: true, firstWake: true, bubbles: 1, seq });
}

async function directReply(req, res, sql) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const code = String(body.code || '').trim();
  if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,
      COALESCE(pet_id, CASE WHEN npc_card_id LIKE 'WHITE_CAT_%' THEN '${WHITE_CAT_ID}' END) AS pet_id,
      pet_last_wake,state
    FROM teambook_books WHERE code=$1`, [code]);
  const party = rows[0];
  if (!party || !ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
    return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  }
  if (party.pet_id === MUTE_PET_ID) {
    return sendJson(res, {
      ok: true, skipped: 'MUTE_MODE', behavior: 'QUIET', spoke: false, bubbles: 0,
    });
  }
  if (!party.pet_id || !hasPersona(party.pet_id)) return sendJson(res, { ok: true, skipped: 'NO_PET' });
  const member = await memberForRequest(req, sql, party.id);
  if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

  const latestRows = await sql.query(`SELECT seq,user_id,kind,body,sent_at,retracted FROM teambook_book_entries
    WHERE book_id=$1 AND kind='message' AND retracted=FALSE ORDER BY seq DESC LIMIT 1`, [party.id]);
  const latest = latestRows[0];
  if (!latest || latest.user_id !== member.user_id || !isDirectedAtPet(latest.body, party.pet_id)) {
    return sendJson(res, { ok: true, skipped: 'NOT_DIRECT' });
  }

  const already = await sql.query(`SELECT 1 FROM teambook_book_entries WHERE book_id=$1 AND kind='pet'
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
  /* Direct conversation is real Party Log, but it must never move the scheduled
     sweep clock. Every live Party is still inspected again at the next :27. */
  return sendJson(res, {
    ok: true, behavior: decision.behavior || 'QUIET', spoke: written > 0, bubbles: written,
  });
}

async function whiteCatIntro(req, res, sql) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const code = String(body.code || '').trim();
  if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,
      COALESCE(pet_id, CASE WHEN npc_card_id LIKE 'WHITE_CAT_%' THEN '${WHITE_CAT_ID}' END) AS pet_id,
      pet_last_wake,state
    FROM teambook_books WHERE code=$1`, [code]);
  const party = rows[0];
  if (!party || !ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
    return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  }
  if (party.pet_id !== WHITE_CAT_ID) return sendJson(res, { ok: true, skipped: 'NOT_WHITE_CAT' });
  const member = await memberForRequest(req, sql, party.id);
  if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
  if (member.role !== 'lead') return sendJson(res, { ok: true, skipped: 'LEAD_ONLY_INTRO' });

  const existing = await sql.query(`SELECT 1 FROM teambook_book_entries WHERE book_id=$1 AND kind='pet'
    AND pet_id=$2 AND retracted=FALSE LIMIT 1`, [party.id, WHITE_CAT_ID]);
  if (existing[0]) return sendJson(res, { ok: true, skipped: 'ALREADY_INTRODUCED' });

  const now = new Date();
  const seq = await appendBubble(sql, party, WHITE_CAT_INTRO, null, now);
  if (!seq) return sendJson(res, { ok: true, skipped: 'WRITE_FAILED' });
  /* Intro is a PET message and therefore counts toward today's volume, but it
     does not consume the next scheduled inspection. */
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

    if (req.method === 'POST' && req.body?.mode === 'direct') return directReply(req, res, sql);
    if (req.method === 'POST' && req.body?.mode === 'white_cat_intro') return whiteCatIntro(req, res, sql);
    if (req.method === 'POST' && req.body?.mode === 'first_wake_catchup') return firstWakeCatchup(req, res, sql);

    if (!process.env.CRON_SECRET) return sendJson(res, { ok: false, error: 'CRON_SECRET_NOT_CONFIGURED' }, 503);
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return sendJson(res, { ok: false, error: 'UNAUTHORIZED' }, 401);
    }

    const force = ['1', 'true', 'yes'].includes(String(req.query?.force || '').toLowerCase());
    const tuning = wakeTuning();
    const now = new Date(); const wake = wakeWindow(now);
    const liveStateSql = "('DRAFT','RECRUITING','STARTED','ACTIVE')";
    const due = force
      ? await sql.query(`SELECT id,code,name,activity,commit_rule,
          COALESCE(pet_id, CASE WHEN npc_card_id LIKE 'WHITE_CAT_%' THEN '${WHITE_CAT_ID}' END) AS pet_id,
          pet_last_wake FROM teambook_books
          WHERE (pet_id IS NOT NULL OR npc_card_id LIKE 'WHITE_CAT_%') AND state IN ${liveStateSql}
          AND COALESCE(pet_id,'') <> '${MUTE_PET_ID}'
          ORDER BY updated_at DESC LIMIT 1`)
      : await sql.query(`SELECT id,code,name,activity,commit_rule,
          COALESCE(pet_id, CASE WHEN npc_card_id LIKE 'WHITE_CAT_%' THEN '${WHITE_CAT_ID}' END) AS pet_id,
          pet_last_wake FROM teambook_books
          WHERE (pet_id IS NOT NULL OR npc_card_id LIKE 'WHITE_CAT_%') AND state IN ${liveStateSql}
          AND COALESCE(pet_id,'') <> '${MUTE_PET_ID}'
          AND (pet_last_wake IS NULL OR pet_last_wake < $1)
          ORDER BY updated_at DESC`, [wake.start]);

    const tally = {
      claimed: 0, read: 0, spoke: 0, bubbles: 0,
      quiet: 0, byAi: 0, providerFailures: 0, deferred: 0, failed: 0,
      presenceFallbacks: 0,
    };

    async function runParty(party) {
      const marked = force
        ? await sql.query('UPDATE teambook_books SET pet_last_wake=$1 WHERE id=$2 RETURNING id', [now, party.id])
        : await sql.query(`UPDATE teambook_books SET pet_last_wake=$1 WHERE id=$2
            AND (pet_last_wake IS NULL OR pet_last_wake < $3) RETURNING id`, [now, party.id, wake.start]);
      if (!marked[0]) return;
      tally.claimed += 1;

      try {
        const since = party.pet_last_wake ? new Date(party.pet_last_wake) : wake.start;
        const history = await recentLog(sql, party.id);
        const context = await contextFor(sql, party.id, since, now, history);
        const allowance = scheduledBubbleAllowance(context);
        const firstWake = !party.pet_last_wake;
        if (!force && firstWake) {
          tally.read += 1;
          if (await appendBubble(sql, party, firstWakeGreeting(party, context), wake.hour, now)) {
            tally.spoke += 1;
            tally.bubbles += 1;
            return;
          }
        }
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

        if (!force && (!aiConfigured() || !hasPersona(party.pet_id) || !decision)) {
          await restoreClaimedWake(sql, party, now);
          tally.deferred += 1;
          tally.quiet += 1;
          return;
        }

        let lines = Array.isArray(decision?.bubbles)
          ? decision.bubbles.slice(0, force ? 3 : Math.min(1, allowance))
          : [];

        /* The model is still allowed to choose QUIET on normal sweeps. At the
           daily presence deadline only, QUIET/similarity filtering falls back
           to one grounded, non-identical ping that rotates lead/member focus. */
        if (!force && !lines.length && dailyPresenceRequired(wake.hour, context) && allowance > 0) {
          const fallback = presenceFallback({ party, context, history });
          if (fallback) {
            lines = [fallback];
            tally.presenceFallbacks += 1;
          }
        }
        if (force && !lines.length) lines = manualFallback(party);
        if (!lines.length) {
          tally.quiet += 1;
          return;
        }

        tally.spoke += 1;
        for (const line of lines) if (await appendBubble(sql, party, line, wake.hour, now)) tally.bubbles += 1;
      } catch (error) {
        console.error('TeamBook pet wake party failed', party.code, error?.message || error);
        tally.failed += 1;
        if (!force) {
          await restoreClaimedWake(sql, party, now).catch(() => {});
          tally.deferred += 1;
        }
      }
    }

    const startedAt = Date.now();
    for (let index = 0; index < due.length; index += tuning.concurrency) {
      await Promise.all(due.slice(index, index + tuning.concurrency).map(runParty));
    }
    const {
      claimed, read, spoke, bubbles, quiet, byAi, providerFailures, deferred, failed, presenceFallbacks,
    } = tally;

    return sendJson(res, {
      ok: true, wakeHour: wake.hour, ai: aiConfigured(), force,
      due: due.length, inspected: due.length, claimed, read, byAi, providerFailures, deferred, failed,
      quiet, spoke, bubbles, presenceFallbacks,
      remaining: 0, concurrency: tuning.concurrency, elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('TeamBook pet wake failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_PET_WAKE_ERROR' }, 500);
  }
}
