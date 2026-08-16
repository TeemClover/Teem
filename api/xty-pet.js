import { database, ensureSchema, sendJson } from './_lib/core.js';
import { aiConfigured, hasPersona, readAndRespond } from './_lib/pet-brain.js';
import { AVATAR_BY_ID } from '../xty/_shared/avatars.js';
import { PET_BY_ID } from '../xty/_shared/pets.js';

const ICT_OFFSET_MINUTES = 7 * 60;
const WAKE_HOURS = [0, 6, 12, 18];
const LOG_SLICE = 60;
const OWN_RECALL = 3;

function wakeWindow(now = new Date()) {
  const local = new Date(now.getTime() + ICT_OFFSET_MINUTES * 60000);
  const hour = [...WAKE_HOURS].reverse().find(value => value <= local.getUTCHours()) ?? 0;
  local.setUTCHours(hour, 0, 0, 0);
  return { hour, start: new Date(local.getTime() - ICT_OFFSET_MINUTES * 60000) };
}
function dayKey(date = new Date()) { return new Date(date.getTime() + ICT_OFFSET_MINUTES * 60000).toISOString().slice(0, 10); }
function dataOf(value) { if (value && typeof value === 'object') return value; try { return JSON.parse(value || '{}'); } catch { return {}; } }
function avatarName(id) { return AVATAR_BY_ID[id]?.nameTh || String(id || 'ตัวละคร'); }

function eventLine(type, rawData) {
  const data = dataOf(rawData);
  switch (String(type || '')) {
    case 'PARTY_CREATED': return data.coverName
      ? `${data.alias || 'หัวตี้'} ตั้งตี้นี้ และใช้ ${data.coverName} เป็นการ์ดประจำตี้`
      : (data.alias ? `${data.alias} ตั้งตี้นี้` : 'ตี้ถูกสร้างขึ้น');
    case 'MEMBER_JOINED': return `${data.alias || 'สมาชิก'} เข้าร่วมตี้`;
    case 'MEMBER_LEFT': return `${data.alias || 'สมาชิก'} ออกจากตี้`;
    case 'MEMBER_KICKED': return `${data.alias || 'สมาชิก'} ถูกนำออกจากตี้`;
    case 'MEMBER_ALIAS_CHANGED': return `${data.from || 'สมาชิก'} เปลี่ยนชื่อในตี้เป็น ${data.to || data.alias || 'ชื่อใหม่'}`;
    case 'MEMBER_AVATAR_CHANGED': {
      const alias = data.alias || 'สมาชิก';
      if (data.fromAvatar || data.toAvatar) return `${alias} เปลี่ยนตัวละครจาก ${avatarName(data.fromAvatar)} เป็น ${avatarName(data.toAvatar)}`;
      return `${alias} เปลี่ยนตัวละครเป็น ${avatarName(data.avatar)}`;
    }
    case 'LEAD_TRANSFERRED': return `${data.to || 'สมาชิกคนถัดไป'} รับหน้าที่หัวตี้ต่อจาก ${data.from || 'หัวตี้เดิม'}`;
    case 'PARTY_RENAMED': return `ชื่อตี้เปลี่ยนจาก ${data.from || 'ชื่อเดิม'} เป็น ${data.to || 'ชื่อใหม่'}`;
    case 'RULE_CHANGED': return 'กติกา Commit ของตี้ถูกเปลี่ยน';
    case 'LEAD_CARD_CHANGED': return `${data.alias || 'หัวตี้'} เปลี่ยนการ์ดประจำตี้จาก ${data.fromName || data.from || 'ใบเดิม'} เป็น ${data.toName || data.to || 'ใบใหม่'}`;
    case 'NPC_CHANGED': return 'PET / NPC ของตี้ถูกเปลี่ยน';
    case 'PARTY_COMPLETED': return 'Quest ของตี้จบสำเร็จ';
    case 'PARTY_DISSOLVED': return 'ตี้ถูกยุบ';
    default: return `เกิด Event: ${String(type || 'UNKNOWN')}`;
  }
}
function laterDate(a, b) {
  const aa = a ? new Date(a) : null; const bb = b ? new Date(b) : null;
  if (!aa || !Number.isFinite(aa.getTime())) return bb && Number.isFinite(bb.getTime()) ? bb : null;
  if (!bb || !Number.isFinite(bb.getTime())) return aa;
  return aa.getTime() >= bb.getTime() ? aa : bb;
}

/* Provider failure, filtering or a missing future persona must never make
   an ACTIVE pet disappear. This is intentionally simple: Groq owns the
   expressive turn; this fallback only guarantees that the NPC is alive. */
function fallbackWake(party, hour, context) {
  const pet = PET_BY_ID[party.pet_id] || { id: party.pet_id, nameTh: 'สัตว์ประจำตี้', emoji: '🐾' };
  const score = `${context.committed}/${context.members.length}`;
  const activity = String(party.activity || '').trim();
  const subject = activity ? `เรื่อง ${activity}` : 'เควสนี้';
  const byPet = {
    pig: context.humanUpdates > 0 ? `เห็นตี้ขยับแล้ว 🐷 ใครมีอะไรอยากเล่าต่ออีกไหม` : `เงียบจัง 🐷 วันนี้ใครอยากเริ่ม ${subject} จากตรงไหนบ้าง`,
    dog: context.humanUpdates > 0 ? `เห็นอัปเดตแล้วนะ 🐶 มีใครอยากต่อเรื่องนี้ไหม` : `ยังอยู่นี่นะ 🐶 วันนี้ใครเป็นไงกับ ${subject} บ้าง`,
    crow: context.humanUpdates > 0 ? `กาเห็นความเคลื่อนไหวแล้ว 🐦‍⬛ มีรายละเอียดไหนที่ตี้ควรจำไว้ไหม` : `รอบนี้เงียบ 🐦‍⬛ ถ้าต้องเลือกเรื่องเดียวเกี่ยวกับ ${subject} ตอนนี้ จะคุยเรื่องอะไร`,
    chicken: context.humanUpdates > 0 ? `มีคนขยับแล้ว 🐔 ก้าวถัดไปเล็กสุดของตี้คืออะไร` : `จิกถามหนึ่งที 🐔 วันนี้ก้าวเล็กสุดของ ${subject} ที่อยากทำคืออะไร`,
    buffalo: context.humanUpdates > 0 ? `เห็นตี้เดินต่อแล้ว 🐃 รอบนี้ใครอยากพา ${subject} ไปอีกก้าว` : `ค่อย ๆ ไปก็ได้ 🐃 วันนี้ ${subject} จะขยับหนึ่งก้าวตรงไหนดี`,
    unicorn: context.humanUpdates > 0 ? `มีอะไรเกิดขึ้นแล้วนะ 🦄 อยากเก็บโมเมนต์ไหนของรอบนี้ไว้ที่สุด` : `รอบนี้ยังเงียบอยู่ 🦄 ถ้าวันนี้ ${subject} ดีขึ้นนิดเดียว อยากให้เป็นตรงไหน`,
    cat: context.humanUpdates > 0 ? `โอเค มีเรื่องให้ตามแล้ว 🐱 ใครจะเล่าต่อให้แมวฟังหน่อย` : `เงียบจนแมวจะงีบแล้ว 🐱 ใครมีอะไรเกี่ยวกับ ${subject} มาโยนไว้ให้แมวฟังหน่อย`,
    turtle: context.humanUpdates > 0 ? `ตี้ขยับแล้ว 🐢 ไม่ต้องรีบ รอบหน้าพวกเราจะค่อย ๆ ต่อจากตรงไหนดี` : `ยังไม่ขยับก็ไม่เป็นไร 🐢 วันนี้อยากค่อย ๆ เริ่ม ${subject} ตรงไหน`,
  };
  if (byPet[party.pet_id]) return [byPet[party.pet_id]];
  if (context.humanUpdates > 0) return [`${pet.emoji} ${pet.nameTh} เห็นอัปเดตรอบนี้แล้ว — ใครอยากเล่าต่ออีกหน่อยไหม`];
  if (hour === 0) return [`${pet.emoji} ก่อนปิดวัน ขอถามหน่อย — วันนี้มีอะไรเกี่ยวกับ ${subject} ที่อยากเล่าไว้ไหม`];
  return [`${pet.emoji} รอบนี้ขอเปิดวงเอง — ใครมีอะไรเกี่ยวกับ ${subject} อยากคุยบ้าง`];
}

/* Kept exported for tests/diagnostics. Product rule now is simple:
   every due ACTIVE pet reads every wake; there is no silence gate. */
export function worthReading() { return true; }

async function logSlice(sql, partyId, since) {
  const [postRows, eventRows] = await Promise.all([
    sql.query(`SELECT p.seq,p.kind,p.body,p.sent_at,p.retracted,m.alias FROM xty_posts p LEFT JOIN xty_members m
      ON m.party_id=p.party_id AND m.user_id=p.user_id WHERE p.party_id=$1 AND p.sent_at>$2 ORDER BY p.seq DESC LIMIT $3`, [partyId, since, LOG_SLICE]),
    sql.query(`SELECT id,type,data_json,created_at FROM xty_party_events WHERE party_id=$1 AND created_at>$2 ORDER BY id DESC LIMIT $3`, [partyId, since, LOG_SLICE]),
  ]);
  const posts = postRows.reverse();
  if (posts.length) {
    const reactions = await sql.query(`SELECT seq,emoji,COUNT(*)::int n FROM xty_reactions WHERE party_id=$1 AND seq>=$2 GROUP BY seq,emoji`, [partyId, Number(posts[0].seq)]);
    const bySeq = new Map();
    for (const row of reactions) { const key = Number(row.seq); bySeq.set(key, `${bySeq.get(key) ? `${bySeq.get(key)} ` : ''}${row.emoji}×${row.n}`); }
    for (const post of posts) post.reactions = bySeq.get(Number(post.seq)) || '';
  }
  const events = eventRows.reverse().map(event => ({ seq:`event:${event.id}`, kind:'event', body:eventLine(event.type,event.data_json), sent_at:event.created_at, retracted:false, alias:'ระบบตี้', reactions:'' }));
  return [...posts, ...events].sort((a,b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()).slice(-LOG_SLICE);
}
async function ownRecent(sql, partyId, since) {
  const rows = await sql.query(`SELECT body,sent_at FROM xty_posts WHERE party_id=$1 AND kind='pet' AND retracted=FALSE AND sent_at<=$2 ORDER BY seq DESC LIMIT $3`, [partyId, since, OWN_RECALL]);
  return rows.reverse();
}
async function appendBubble(sql, party, text, wakeHour, now) {
  const rows = await sql.query(`WITH next AS (UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$2 WHERE id=$1 RETURNING head_seq)
    INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted,pet_id,wake_hour)
    SELECT $1,head_seq,$3,'pet',$4,$2,$5::date,FALSE,$6,$7 FROM next RETURNING seq`, [party.id, now, `pet:${party.pet_id}`, text, dayKey(now), party.pet_id, wakeHour]);
  return Number(rows[0]?.seq || 0);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, { ok:false,error:'METHOD_NOT_ALLOWED' }, 405);
    if (!process.env.CRON_SECRET) return sendJson(res, { ok:false,error:'CRON_SECRET_NOT_CONFIGURED' }, 503);
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return sendJson(res, { ok:false,error:'UNAUTHORIZED' }, 401);
    const force = ['1','true','yes'].includes(String(req.query?.force || '').toLowerCase());
    const sql = database(); await ensureSchema(sql); const now = new Date(); const wake = wakeWindow(now);

    // Manual runs are proof-of-life: one recent ACTIVE party only.
    // Scheduled runs process every party that is due for this wake window.
    const due = force
      ? await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties
          WHERE pet_id IS NOT NULL AND state='ACTIVE' ORDER BY updated_at DESC LIMIT 1`)
      : await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties WHERE pet_id IS NOT NULL AND state='ACTIVE'
          AND (pet_last_wake IS NULL OR pet_last_wake < $1) ORDER BY updated_at LIMIT 250`, [wake.start]);

    let claimed=0, read=0, spoke=0, bubbles=0, byAi=0, fallbacks=0;
    for (const party of due) {
      const marked = force
        ? await sql.query(`UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2 RETURNING id`, [now, party.id])
        : await sql.query(`UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2 AND (pet_last_wake IS NULL OR pet_last_wake < $3) RETURNING id`, [now, party.id, wake.start]);
      if (!marked[0]) continue; claimed += 1;
      const since = party.pet_last_wake ? new Date(party.pet_last_wake) : wake.start;
      const [counts,eventCounts,members] = await Promise.all([
        sql.query(`SELECT COUNT(*) FILTER (WHERE kind IN ('commit','message') AND sent_at>$2)::int human_updates,
          COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE AND day_key=$3::date THEN user_id END)::int committed,
          MAX(sent_at) FILTER (WHERE kind IN ('commit','message')) last_human_at, MAX(sent_at) FILTER (WHERE kind='pet') last_pet_at
          FROM xty_posts WHERE party_id=$1`, [party.id,since,dayKey(now)]),
        sql.query(`SELECT COUNT(*) FILTER (WHERE created_at>$2)::int event_updates, MAX(created_at) FILTER (WHERE created_at>$2) last_event_at FROM xty_party_events WHERE party_id=$1`, [party.id,since]),
        sql.query(`SELECT alias,role FROM xty_members WHERE party_id=$1 AND left_at IS NULL ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, joined_at`, [party.id]),
      ]);
      const count=counts[0]||{}, eventCount=eventCounts[0]||{};
      const context={ humanUpdates:Number(count.human_updates||0)+Number(eventCount.event_updates||0), committed:Number(count.committed||0), members,
        lastHumanAt:laterDate(count.last_human_at,eventCount.last_event_at), lastPetAt:count.last_pet_at?new Date(count.last_pet_at):null };

      const idleWindow = context.humanUpdates === 0;
      const [log,mine] = await Promise.all([logSlice(sql,party.id,since),ownRecent(sql,party.id,since)]);
      let lines=null;
      if (aiConfigured() && hasPersona(party.pet_id)) {
        read += 1;
        lines=await readAndRespond({party,context,log,ownRecent:mine,since,hour:wake.hour,idleWindow,forceSpeak:force});
        if (Array.isArray(lines) && lines.length) byAi += 1;
      }

      // Product rule: a pet that wakes is visible. Provider errors, filters,
      // empty model output or a future pet without a full persona all fall back.
      if (!Array.isArray(lines) || lines.length === 0) {
        lines=fallbackWake(party,wake.hour,context);
        fallbacks += 1;
      }
      lines=lines.slice(0,3);
      spoke += 1;
      for (const line of lines) if (await appendBubble(sql,party,line,wake.hour,now)) bubbles += 1;
    }
    return sendJson(res,{ok:true,wakeHour:wake.hour,ai:aiConfigured(),force,due:due.length,claimed,read,byAi,fallbacks,spoke,bubbles});
  } catch (error) {
    console.error('XTY pet wake failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res,{ok:false,error:error.code},503);
    return sendJson(res,{ok:false,error:'XTY_PET_WAKE_ERROR'},500);
  }
}
