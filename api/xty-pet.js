import { database, ensureSchema, sendJson } from './_lib/core.js';

const ICT_OFFSET_MINUTES = 7 * 60;
const WAKE_HOURS = [0, 6, 12, 18];
const STARTERS = new Set(['pig', 'dog', 'crow', 'chicken']);

function wakeWindow(now = new Date()) {
  const local = new Date(now.getTime() + ICT_OFFSET_MINUTES * 60000);
  const hour = [...WAKE_HOURS].reverse().find(value => value <= local.getUTCHours()) ?? 0;
  local.setUTCHours(hour, 0, 0, 0);
  return { hour, start: new Date(local.getTime() - ICT_OFFSET_MINUTES * 60000) };
}

function dayKey(date = new Date()) {
  return new Date(date.getTime() + ICT_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

/* V1 is deliberately conservative. It only states counts and the rule
   stored by the party; it never invents an event, diagnosis, motive, or
   judgment. Silence is the most common result. */
function observe(party, hour, context) {
  if (!STARTERS.has(party.pet_id) || context.humanUpdates === 0) return [];
  const score = `${context.committed}/${context.members}`;

  if (hour === 12 && context.committed >= 2) {
    const lines = {
      pig: `ครึ่งวันแล้ว ตี้นี้ Commit ไป ${score} คน 🐷`,
      dog: `เห็นแล้วนะ — วันนี้มีคน Commit ${score} คนแล้ว 🐶`,
      crow: `กลางวัน: ${score} คน Commit แล้ว กาจดไว้แค่นี้ 🐦‍⬛`,
      chicken: `${score} คนลงมือแล้ว ทีละนิดก็เดินหน้า 🐔`,
    };
    return [lines[party.pet_id]];
  }

  if (hour === 18 && context.committed > 0 && context.committed < context.members) {
    const rule = party.commit_rule ? ` — กติกาคือ “${party.commit_rule}”` : '';
    const lines = {
      pig: `เย็นนี้ ${score} คน Commit แล้ว ที่เหลือยังทันนะ${rule}`,
      dog: `วันนี้ ${score} คน Commit แล้ว ค่อย ๆ กลับมาตอนพร้อม${rule}`,
      crow: `18:00 — ตอนนี้ Commit ${score} คน${rule}`,
      chicken: `ตอนนี้ ${score} คนแล้ว เหลือก้าวเล็ก ๆ ก่อนปิดวัน${rule}`,
    };
    return [lines[party.pet_id]];
  }

  if (hour === 0 && context.committed > 0) {
    const lines = {
      pig: `ปิดวันด้วย ${score} Commit เจอกันรอบหน้า 🐷`,
      dog: `วันนี้ตี้เรากลับมา Commit ${score} คน พักได้แล้ว 🐶`,
      crow: `สรุปวันนี้: Commit ${score} คน · ไม่มีอะไรต้องแต่งเพิ่ม 🐦‍⬛`,
      chicken: `วันนี้จิกงานสำเร็จ ${score} คน พรุ่งนี้ค่อยต่อ 🐔`,
    };
    return [lines[party.pet_id]];
  }
  return [];
}

async function appendBubble(sql, party, text, wakeHour, now) {
  const rows = await sql.query(`WITH next AS (
      UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$2 WHERE id=$1 RETURNING head_seq
    ) INSERT INTO xty_posts
      (party_id,seq,user_id,kind,body,sent_at,day_key,retracted,pet_id,wake_hour)
    SELECT $1,head_seq,$3,'pet',$4,$2,$5::date,FALSE,$6,$7 FROM next RETURNING seq`,
  [party.id, now, `pet:${party.pet_id}`, text, dayKey(now), party.pet_id, wakeHour]);
  return Number(rows[0]?.seq || 0);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!process.env.CRON_SECRET) return sendJson(res, { ok: false, error: 'CRON_SECRET_NOT_CONFIGURED' }, 503);
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return sendJson(res, { ok: false, error: 'UNAUTHORIZED' }, 401);
    }

    const sql = database(); await ensureSchema(sql);
    const now = new Date(); const wake = wakeWindow(now);
    const due = await sql.query(`SELECT id,code,name,commit_rule,pet_id,pet_last_wake
      FROM xty_parties WHERE pet_id IS NOT NULL
        AND (pet_last_wake IS NULL OR pet_last_wake < $1)
      ORDER BY updated_at LIMIT 250`, [wake.start]);

    let claimed = 0; let spoke = 0; let bubbles = 0;
    for (const party of due) {
      const marked = await sql.query(`UPDATE xty_parties SET pet_last_wake=$1 WHERE id=$2
        AND (pet_last_wake IS NULL OR pet_last_wake < $3) RETURNING id`, [now, party.id, wake.start]);
      if (!marked[0]) continue;
      claimed += 1;
      const since = party.pet_last_wake ? new Date(party.pet_last_wake) : wake.start;
      const counts = await sql.query(`SELECT
          COUNT(*) FILTER (WHERE kind IN ('commit','message') AND sent_at>$2)::int human_updates,
          COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE AND day_key=$3::date THEN user_id END)::int committed
        FROM xty_posts WHERE party_id=$1`, [party.id, since, dayKey(now)]);
      const members = await sql.query('SELECT COUNT(*)::int n FROM xty_members WHERE party_id=$1', [party.id]);
      const context = {
        humanUpdates: Number(counts[0]?.human_updates || 0),
        committed: Number(counts[0]?.committed || 0),
        members: Number(members[0]?.n || 0),
      };
      const lines = observe(party, wake.hour, context).slice(0, 3);
      if (!lines.length) continue;
      spoke += 1;
      for (const line of lines) {
        if (await appendBubble(sql, party, line, wake.hour, now)) bubbles += 1;
      }
    }
    return sendJson(res, { ok: true, wakeHour: wake.hour, due: due.length, claimed, spoke, bubbles });
  } catch (error) {
    console.error('XTY pet wake failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'XTY_PET_WAKE_ERROR' }, 500);
  }
}
