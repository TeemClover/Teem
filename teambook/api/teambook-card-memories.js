import { currentUser, database, ensureSchema, sendJson } from './_lib/core.js';

function localIds(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map(item => String(item || '').trim())
    .filter(item => /^[a-z0-9_-]{6,80}$/i.test(item))
    .map(item => `local:${item}`);
}

function time(value) {
  const n = new Date(value || 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

function firstByCard(rows) {
  const map = new Map();
  for (const row of [...rows].sort((a, b) => time(a.created_at) - time(b.created_at))) {
    if (row.card_id && !map.has(row.card_id)) map.set(row.card_id, row);
  }
  return map;
}

export default async function handler(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const sql = database();
    await ensureSchema(sql);
    const user = await currentUser(req, sql);
    if (!user) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const profileRows = await sql.query(`SELECT profile_ids FROM teambook_profile_state
      WHERE user_id=$1 LIMIT 1`, [user.id]);
    const profileIds = profileRows[0]?.profile_ids;
    const identities = [...new Set([`account:${user.id}`, ...localIds(profileIds)])];

    const [ownedRows, unlockRows, starRows] = await Promise.all([
      sql.query(`SELECT card_id,acquired_from,acquired_at FROM teambook_user_cards
        WHERE user_id = ANY($1::text[]) ORDER BY acquired_at`, [identities]),
      sql.query(`SELECT card_id,book_id,unlock_source,created_at,revealed_at FROM teambook_card_unlock_events
        WHERE user_id = ANY($1::text[]) AND card_id IS NOT NULL ORDER BY created_at`, [identities]),
      sql.query(`SELECT card_id,book_id,milestone,created_at,revealed_at FROM teambook_star_rewards
        WHERE user_id = ANY($1::text[]) AND card_id IS NOT NULL ORDER BY created_at`, [identities])
        .catch(() => []),
    ]);

    const unlockByCard = firstByCard(unlockRows);
    const starByCard = firstByCard(starRows);
    const bookIds = [...new Set([
      ...unlockRows.map(row => row.book_id),
      ...starRows.map(row => row.book_id),
    ].filter(Boolean))];
    const books = bookIds.length ? await sql.query(`SELECT b.id,b.code,b.name,
        (SELECT m.alias FROM teambook_book_members m
          WHERE m.book_id=b.id AND m.role='lead'
          ORDER BY m.joined_at LIMIT 1) AS owner_alias
      FROM teambook_books b WHERE b.id = ANY($1::text[])`, [bookIds]) : [];
    const bookById = new Map(books.map(row => [row.id, row]));

    const seenCards = new Set();
    const memories = [];
    for (const owned of ownedRows) {
      if (!owned.card_id || seenCards.has(owned.card_id)) continue;
      seenCards.add(owned.card_id);
      const from = String(owned.acquired_from || '');
      const star = starByCard.get(owned.card_id) || null;
      const unlock = unlockByCard.get(owned.card_id) || null;
      const source = /^stars:/.test(from) && star ? star : (unlock || star);
      const book = source?.book_id ? bookById.get(source.book_id) : null;
      let trigger = 'พบระหว่างทางใน TeamBook';
      if (source?.unlock_source === 'first_seen') trigger = 'เห็นความพยายามของคนอื่นเป็นครั้งแรก';
      else if (source?.unlock_source === 'ending') trigger = 'ความทรงจำจากตอนสมุดเล่มนี้จบ';
      else if (star) trigger = `ถูกเห็นครบ ${Math.max(1, Number(star.milestone || 1)) * 3} ครั้ง`;

      memories.push({
        cardId: owned.card_id,
        acquiredAt: owned.acquired_at ? new Date(owned.acquired_at).toISOString() : null,
        acquiredFrom: from,
        originBookCode: book?.code || null,
        originBookName: book?.name || null,
        originOwnerAlias: book?.owner_alias || null,
        originTrigger: trigger,
      });
    }

    return sendJson(res, { ok: true, memories });
  } catch (error) {
    console.error('TeamBook card memories failed', error);
    if (error?.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_CARD_MEMORIES_ERROR' }, 500);
  }
}
