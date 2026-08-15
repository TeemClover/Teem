import { database, ensureSchema, sendJson } from './_lib/core.js';
import { aiConfigured, hasPersona, readAndRespond } from './_lib/pet-brain.js';
import { AVATAR_BY_ID } from '../xty/_shared/avatars.js';

const ICT_OFFSET_MINUTES = 7 * 60;
const WAKE_HOURS = [0, 6, 12, 18];
const STARTERS = new Set(['pig', 'dog', 'crow', 'chicken']);
const LOG_SLICE = 60;
const OWN_RECALL = 3;
const QUIET_CHECKIN_HOURS = 24;

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

function observe(party, hour, context) {
  if (!STARTERS.has(party.pet_id) || context.humanUpdates === 0) return [];
  const score = `${context.committed}/${context.members.length}`;
  if (hour === 12 && context.committed >= 2) {
    const lines = { pig:`ครึ่งวันแล้ว ตี้นี้ Commit ไป ${score} คน 🐷`, dog:`เห็นแล้วนะ — วันนี้มีคน Commit ${score} คนแล้ว 🐶`, crow:`กลางวัน: ${score} คน Commit แล้ว กาจดไว้แค่นี้ 🐦‍⬛`, chicken:`${score} คนลงมือแล้ว ทีละนิดก็เดินหน้า 🐔` };
    return [lines[party.pet_id]];
  }
  if (hour === 18 && context.committed > 0 && context.committed < context.members.length) {
    const rule = party.commit_rule ? ` — กติกาคือ “${party.commit_rule}”` : '';
    const lines = { pig:`เย็นนี้ ${score} คน Commit แล้ว ที่เหลือยังทันนะ${rule}`, dog:`วันนี้ ${score} คน Commit แล้ว ค่อย ๆ กลับมาตอนพร้อม${rule}`, crow:`18:00 — ตอนนี้ Commit ${score} คน${rule}`, chicken:`ตอนนี้ ${score} คนแล้ว เหลือก้าวเล็ก ๆ ก่อนปิดวัน${rule}` };
    return [lines[party.pet_id]];
  }
  if (hour === 0 && context.committed > 0) {
    const lines = { pig:`ปิดวันด้วย ${score} Commit เจอกันรอบหน้า 🐷`, dog:`วันนี้ตี้เรากลับมา Commit ${score} คน พักได้แล้ว 🐶`, crow:`สรุปวันนี้: Commit ${score} คน · ไม่มีอะไรต้องแต่งเพิ่ม 🐦‍⬛`, chicken:`วันนี้จิกงานสำเร็จ ${score} คน พรุ่งนี้ค่อยต่อ 🐔` };
    return [lines[party.pet_id]];
  }
  return [];
}

function manualWakeFallback(party) {
  const lines = {
    pig: 'กูตื่นละ 🐷 รอบนี้มาดูตี้จริง ๆ แล้ว',
    dog: 'กูตื่นแล้ว 🐶 ยังอยู่กับตี้นี้นะ',
    crow: 'กาตื่นแล้ว 🐦‍⬛ รอบนี้อ่านตี้จริง',
    chicken: 'ตื่นแล้ว 🐔 รอบนี้มาจิกดูตี้จริง ๆ',
  };
  return lines[party.pet_id] ? [lines[party.pet_id]] : [];
}

export function worthReading(hour, context, force = false) {
  if (force) return true;
  if (context.humanUpdates > 0) return true;
  if (hour !== 18 || !context.lastHumanAt) return false;
  if (context.lastPetAt && context.lastPetAt >= context.lastHumanAt) return false;
  return (Date.now() - context.lastHumanAt.getTime()) / 3600000 >= QUIET_CHECKIN_HOURS;
}

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

    // Manual runs are a proof-of-life test: pick exactly one recent ACTIVE party
    // whose PET has a real persona, so one click never spams every party.
    const due = force
      ? await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties
          WHERE pet_id IN ('pig','dog','crow','chicken') AND state='ACTIVE' ORDER BY updated_at DESC LIMIT 1`)
      : await sql.query(`SELECT id,code,name,activity,commit_rule,pet_id,pet_last_wake FROM xty_parties WHERE pet_id IS NOT NULL AND state='ACTIVE'
          AND (pet_last_wake IS NULL OR pet_last_wake < $1) ORDER BY updated_at LIMIT 250`, [wake.start]);

    let claimed=0, read=0, spoke=0, bubbles=0, byAi=0;
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
      let lines=null;
      if (aiConfigured() && hasPersona(party.pet_id) && worthReading(wake.hour,context,force)) {
        read += 1;
        const quietCheckin=!force && context.humanUpdates===0;
        const readSince=quietCheckin && context.lastHumanAt ? new Date(context.lastHumanAt.getTime()-1) : since;
        const [log,mine]=await Promise.all([logSlice(sql,party.id,readSince),ownRecent(sql,party.id,readSince)]);
        lines=await readAndRespond({party,context,log,ownRecent:mine,since:readSince,hour:wake.hour,quietCheckin,forceSpeak:force});
        if (Array.isArray(lines)) byAi += 1;
      }

      // A scheduled wake may stay silent. A manual wake may not: it is a
      // diagnostic button whose whole purpose is proving the bubble path works.
      if (force && (!Array.isArray(lines) || lines.length === 0)) lines=manualWakeFallback(party);
      if (!lines) lines=observe(party,wake.hour,context);
      lines=lines.slice(0,3);
      if(!lines.length) continue;
      spoke += 1;
      for (const line of lines) if (await appendBubble(sql,party,line,wake.hour,now)) bubbles += 1;
    }
    return sendJson(res,{ok:true,wakeHour:wake.hour,ai:aiConfigured(),force,due:due.length,claimed,read,byAi,spoke,bubbles});
  } catch (error) {
    console.error('XTY pet wake failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res,{ok:false,error:error.code},503);
    return sendJson(res,{ok:false,error:'XTY_PET_WAKE_ERROR'},500);
  }
}
