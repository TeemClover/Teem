from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique patch anchor: {label} count={text.count(old)}')
    return text.replace(old, new, 1)

# 1) Fast schema warmup: pay DDL only when the schema version changes.
path = 'teambook/api/_lib/core.js'
text = read(path)
text = replace_once(text, 'let schemaPromise;\n', 'let schemaPromise;\nconst SCHEMA_VERSION = 1;\n', 'core schema version')
text = replace_once(
    text,
    "  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS reward_source TEXT`,\n",
    "  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS reward_source TEXT`,\n  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS reward_id TEXT`,\n",
    'reward id schema',
)
text = replace_once(
    text,
    "  `CREATE TABLE IF NOT EXISTS teambook_uploads (\n    id TEXT PRIMARY KEY, user_id TEXT, book_id TEXT, storage_url TEXT NOT NULL,\n    mime_type TEXT NOT NULL, width INTEGER, height INTEGER,\n    status TEXT NOT NULL DEFAULT 'ready', created_at TIMESTAMPTZ NOT NULL\n  )`,\n];",
    "  `CREATE TABLE IF NOT EXISTS teambook_uploads (\n    id TEXT PRIMARY KEY, user_id TEXT, book_id TEXT, storage_url TEXT NOT NULL,\n    mime_type TEXT NOT NULL, width INTEGER, height INTEGER,\n    status TEXT NOT NULL DEFAULT 'ready', created_at TIMESTAMPTZ NOT NULL\n  )`,\n  `CREATE TABLE IF NOT EXISTS teambook_book_quota_v2 (\n    quota_key TEXT NOT NULL, book_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner',\n    created_at TIMESTAMPTZ NOT NULL, released_at TIMESTAMPTZ,\n    PRIMARY KEY (quota_key, book_id, role)\n  )`,\n  `CREATE INDEX IF NOT EXISTS idx_teambook_book_quota_v2_active\n    ON teambook_book_quota_v2(quota_key, role, released_at)`,\n  `CREATE TABLE IF NOT EXISTS teambook_schema_state (\n    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),\n    version INTEGER NOT NULL, updated_at TIMESTAMPTZ NOT NULL\n  )`,\n  `INSERT INTO teambook_schema_state (singleton,version,updated_at) VALUES (TRUE,${SCHEMA_VERSION},NOW())\n    ON CONFLICT (singleton) DO UPDATE SET version=GREATEST(teambook_schema_state.version,EXCLUDED.version),updated_at=NOW()`,\n];",
    'schema tail',
)
text = replace_once(
    text,
    "export async function ensureSchema(sql) {\n  if (!schemaPromise) schemaPromise = (async () => {\n    for (const statement of SCHEMA) await sql.query(statement);\n  })().catch(error => { schemaPromise = undefined; throw error; });\n  return schemaPromise;\n}",
    "export async function ensureSchema(sql) {\n  if (!schemaPromise) schemaPromise = (async () => {\n    let version = 0;\n    try {\n      const rows = await sql.query('SELECT version FROM teambook_schema_state WHERE singleton=TRUE LIMIT 1');\n      version = Number(rows[0]?.version || 0);\n    } catch (error) {\n      if (String(error?.code || '') !== '42P01') throw error;\n    }\n    if (version >= SCHEMA_VERSION) return;\n    for (const statement of SCHEMA) await sql.query(statement);\n  })().catch(error => { schemaPromise = undefined; throw error; });\n  return schemaPromise;\n}",
    'ensureSchema fast path',
)
write(path, text)

# 2) Quota DDL belongs to the shared schema, not every create/join request.
for path in ['teambook/api/_lib/xty-create-v2.js', 'teambook/api/_lib/xty-join-v2.js']:
    text = read(path)
    text, n = re.subn(
        r"async function ensureQuotaV2\(sql\) \{.*?\n\}",
        "async function ensureQuotaV2() {\n  /* Owned by core SCHEMA. Keeping the call makes old entrypoints compatible\n     without paying CREATE TABLE / CREATE INDEX on every request. */\n}",
        text,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit(f'missing quota patch in {path}')
    write(path, text)

# Join should acknowledge the committed membership immediately; the party page
# hydrates canonical state after navigation instead of making Join wait for it.
path = 'teambook/api/_lib/xty-join-v2.js'
text = read(path)
text, n1 = re.subn(
    r"      try \{\n        const state = await legacyState\(legacyXtyHandler, req, code, token\);\n        return sendJson\(res, \{ \.\.\.state, token, quotaSystem: 'v2-separated' \}\);\n      \} catch \(stateError\) \{.*?\n      \}",
    "      return sendJson(res, {\n        ok: true, joined: true, recoveryRequired: true, code, token,\n        meUserId: existing.user_id, quotaSystem: 'v2-separated',\n      });",
    text,
    count=1,
    flags=re.S,
)
text, n2 = re.subn(
    r"    try \{\n      const state = await legacyState\(legacyXtyHandler, req, code, token\);\n      return sendJson\(res, \{ \.\.\.state, token, quotaSystem: 'v2-separated' \}, 201\);\n    \} catch \(stateError\) \{.*?\n    \}",
    "    return sendJson(res, {\n      ok: true, joined: true, recoveryRequired: true, code, token,\n      meUserId: userId, quotaSystem: 'v2-separated',\n    }, 201);",
    text,
    count=1,
    flags=re.S,
)
if n1 != 1 or n2 != 1:
    raise SystemExit(f'join fast-return patch failed existing={n1} new={n2}')
write(path, text)

# 3) First Seen reward is reserved when earned, but becomes Collection ownership
# only after the player actually opens it. A pending card-back entry lives in the
# notebook so there is always a durable place to come back and tap.
path = 'teambook/api/teambook/[...path].js'
text = read(path)
text = replace_once(
    text,
    "    const ownedRows = await sql.query(`SELECT card_id FROM teambook_user_cards\n      WHERE user_id=$1`, [membership.user_id]);",
    "    const ownedRows = await sql.query(`SELECT card_id FROM teambook_user_cards WHERE user_id=$1\n      UNION SELECT card_id FROM teambook_card_unlock_events WHERE user_id=$1 AND card_id IS NOT NULL`, [membership.user_id]);",
    'ending reserved cards',
)
text = replace_once(
    text,
    "  const ownedRows = await sql.query('SELECT card_id FROM teambook_user_cards WHERE user_id=$1', [member.user_id]);",
    "  const ownedRows = await sql.query(`SELECT card_id FROM teambook_user_cards WHERE user_id=$1\n    UNION SELECT card_id FROM teambook_card_unlock_events WHERE user_id=$1 AND card_id IS NOT NULL`, [member.user_id]);",
    'first seen reserved cards',
)
text = replace_once(
    text,
    "  if (inserted[0].card_id) {\n    await sql.query(`INSERT INTO teambook_user_cards (user_id,card_id,acquired_from,acquired_at)\n      VALUES ($1,$2,'first_seen',$3) ON CONFLICT (user_id,card_id) DO NOTHING`, [\n      member.user_id, inserted[0].card_id, at,\n    ]);\n  }",
    "  if (inserted[0].card_id) {\n    const key = dayKey(at, row.timezone);\n    const pending = await sql.query(`WITH next AS (\n        UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1 WHERE id=$2 RETURNING head_seq\n      ) INSERT INTO teambook_book_entries\n        (book_id,seq,user_id,kind,body,reward_source,reward_id,sent_at,day_key,retracted)\n        SELECT $2,next.head_seq,$3,'reward','', 'first_seen_pending',$4,$1,$5::date,FALSE\n        FROM next RETURNING seq`, [at, row.id, member.user_id, inserted[0].id, key]);\n    if (pending[0]) row.head_seq = Number(pending[0].seq);\n  }",
    'pending first seen log',
)
text = replace_once(
    text,
    "    p.pet_id,p.wake_hour,p.image_url,p.image_w,p.image_h,\n    p.activity_id,p.activity_label,p.activity_color,p.success_rule_snapshot,p.reward_source,",
    "    p.pet_id,p.wake_hour,p.image_url,p.image_w,p.image_h,\n    p.activity_id,p.activity_label,p.activity_color,p.success_rule_snapshot,p.reward_source,p.reward_id,",
    'posts select reward id',
)
text = replace_once(
    text,
    "    rewardSource: row.reward_source || null,\n    sentAt:",
    "    rewardSource: row.reward_source || null, rewardId: row.reward_id || null,\n    sentAt:",
    'posts shape reward id',
)
old_reveal = """      if (!reward.revealed_at && reward.card_id) {
        const at = new Date(); const key = dayKey(at, row.timezone);
        const posted = await sql.query(`WITH claimed AS (
            UPDATE teambook_card_unlock_events SET revealed_at=$1
            WHERE id=$2 AND book_id=$3 AND user_id=$4 AND revealed_at IS NULL
            RETURNING card_id,unlock_source
          ), next AS (
            UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1
            WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
          ) INSERT INTO teambook_book_entries
            (book_id,seq,user_id,kind,body,reward_source,sent_at,day_key,retracted)
            SELECT $3,next.head_seq,$4,'reward',claimed.card_id,claimed.unlock_source,$1,$5::date,FALSE
            FROM next,claimed RETURNING seq`, [at, rewardId, row.id, member.user_id, key]);
        if (posted[0]) row.head_seq = Number(posted[0].seq);
      }"""
new_reveal = """      if (!reward.revealed_at && reward.card_id) {
        const at = new Date(); const key = dayKey(at, row.timezone);
        if (reward.unlock_source === 'first_seen') {
          const claimed = await sql.query(`WITH claimed AS (
              UPDATE teambook_card_unlock_events SET revealed_at=$1
              WHERE id=$2 AND book_id=$3 AND user_id=$4 AND revealed_at IS NULL
              RETURNING card_id
            ), owned AS (
              INSERT INTO teambook_user_cards (user_id,card_id,acquired_from,acquired_at)
              SELECT $4,card_id,'first_seen',$1 FROM claimed
              ON CONFLICT (user_id,card_id) DO NOTHING RETURNING card_id
            ), revealed_post AS (
              UPDATE teambook_book_entries
              SET body=(SELECT card_id FROM claimed),reward_source='first_seen'
              WHERE book_id=$3 AND user_id=$4 AND kind='reward'
                AND reward_source='first_seen_pending' AND reward_id=$2
              RETURNING seq
            ) UPDATE teambook_books SET updated_at=$1
              WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq`,
          [at, rewardId, row.id, member.user_id]);
          if (claimed[0]) row.updated_at = at;
        } else {
          const posted = await sql.query(`WITH claimed AS (
              UPDATE teambook_card_unlock_events SET revealed_at=$1
              WHERE id=$2 AND book_id=$3 AND user_id=$4 AND revealed_at IS NULL
              RETURNING card_id,unlock_source
            ), next AS (
              UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1
              WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
            ) INSERT INTO teambook_book_entries
              (book_id,seq,user_id,kind,body,reward_source,reward_id,sent_at,day_key,retracted)
              SELECT $3,next.head_seq,$4,'reward',claimed.card_id,claimed.unlock_source,$2,$1,$5::date,FALSE
              FROM next,claimed RETURNING seq`, [at, rewardId, row.id, member.user_id, key]);
          if (posted[0]) row.head_seq = Number(posted[0].seq);
        }
      }"""
text = replace_once(text, old_reveal, new_reveal, 'reveal ownership timing')
old_confirm_tail = """      if (String(row.state || '').toUpperCase() === 'COMPLETED') await applyProgressionForParty(sql, row, at);
      try {
        const state = await stateFor(sql, row, member);
        return sendJson(res, {
          ...state,
          myReward: firstSeenReward || state.myReward,
          firstSeenReward: firstSeenReward || null,
        });
      } catch (stateError) {
        console.error('TeamBook confirm state refresh failed after confirmation commit', row.code, stateError?.message || stateError);
        return sendJson(res, {
          ok: true, confirmed: true, recoveryRequired: true,
          myReward: firstSeenReward || null,
          firstSeenReward: firstSeenReward || null,
        });
      }"""
new_confirm_tail = """      if (String(row.state || '').toUpperCase() === 'COMPLETED') await applyProgressionForParty(sql, row, at);
      /* Confirm is latency-sensitive. The durable confirmation + reward are
         already committed; let the room refresh state after the tap instead
         of blocking the acknowledgement on a full multi-query state read. */
      return sendJson(res, {
        ok: true, confirmed: true, recoveryRequired: true,
        myReward: firstSeenReward || null,
        firstSeenReward: firstSeenReward || null,
      });"""
text = replace_once(text, old_confirm_tail, new_confirm_tail, 'fast confirm response')
write(path, text)

# 4) Client ownership: pending First Seen is visible but not owned yet.
path = 'teambook/_shared/store.js'
text = read(path)
text = replace_once(
    text,
    "  const owned = new Set(ownedCardIds(profile));\n  const ownedCards = cardId && !owned.has(cardId)\n    ? [...profile.ownedCards, { cardId, acquiredAt: earnedAt, acquiredFrom: `party:${reward.partyCode}` }]\n    : profile.ownedCards;",
    "  const owned = new Set(ownedCardIds(profile));\n  const firstSeenClaim = /^first-seen:/.test(reward.questId);\n  const shouldOwnNow = cardId && (!firstSeenClaim || !!reward.revealedAt);\n  const ownedCards = shouldOwnNow && !owned.has(cardId)\n    ? [...profile.ownedCards, { cardId, acquiredAt: reward.revealedAt || earnedAt, acquiredFrom: firstSeenClaim ? 'first_seen' : `party:${reward.partyCode}` }]\n    : profile.ownedCards;",
    'client pending ownership',
)
text = replace_once(
    text,
    "  const remembered = rememberResponse(reward.partyCode, result);\n  return { ...remembered, reward: pendingCardReward(reward.rewardId) };",
    "  const remembered = rememberResponse(reward.partyCode, result);\n  if (/^first-seen:/.test(String(reward.questId || '')) && reward.cardId) {\n    const profile = getProfile();\n    if (profile && !ownedCardIds(profile).includes(reward.cardId)) {\n      saveProfile({ ...profile, ownedCards: [...profile.ownedCards, {\n        cardId: reward.cardId, acquiredAt: now(), acquiredFrom: 'first_seen',\n      }] }, { touch: true });\n    }\n  }\n  markCardRewardRevealed(reward.rewardId);\n  return { ...remembered, reward: pendingCardReward(reward.rewardId) };",
    'claim local first seen on reveal',
)
write(path, text)

# 5) Party room: no forced redirect. Pending card stays in chat and is tapped there.
path = 'teambook/p/index.html'
text = read(path)
text = replace_once(
    text,
    "function openRecoveredFirstSeen(result) {\n  const reward = result?.myReward;\n  if (!reward?.rewardId || reward.revealedAt || !/^first-seen:/.test(String(reward.questId || ''))) return false;\n  location.replace(`/reveal/?r=${encodeURIComponent(reward.rewardId)}`);\n  return true;\n}",
    "let pendingRewardNoticeShown = false;\nfunction openRecoveredFirstSeen(result) {\n  const reward = result?.myReward;\n  if (!reward?.rewardId || reward.revealedAt || !/^first-seen:/.test(String(reward.questId || ''))) return false;\n  if (!pendingRewardNoticeShown) {\n    pendingRewardNoticeShown = true;\n    toast('มีการ์ดรอเปิดอยู่ในเรื่องในสมุด · แตะการ์ดเพื่อเปิด');\n  }\n  /* Returning false deliberately keeps the player in the notebook. */\n  return false;\n}",
    'no forced reward redirect',
)
old_log = """    const isPet = post.kind === 'pet';
    const isReward = post.kind === 'reward';
    const rewardCard = isReward ? cardById(post.body) : null;
    const el = document.createElement('div');
    el.className = 'post'
      + (post.kind === 'commit' ? ' commit' : '')
      + (isReward ? ' reward' : '')
      + (isPet ? ' pet' : '')
      + (post.retracted ? ' retracted' : '');
    /* The whole message is tinted by what came out of the card, so a
       Legendary reads as an event from across the log. */
    if (rewardCard) el.dataset.rarity = rewardCard.rarity || 'common';

    const rewardReason = post.rewardSource === 'first_seen'
      ? 'รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก'
      : (post.rewardSource === 'party_stars' ? 'รางวัลครบ 3 ดาวในสมุดนี้' : '');
    const body = post.retracted
      ? '<span>ข้อความถูกถอนโดยเจ้าของ</span>'
      : (isReward && rewardCard
        ? `<div class="reward-log-card">`
          + (rewardReason ? `<p class="reward-log-reason"><b>${esc(rewardReason)}</b></p>` : '')
          + `${cardMarkup(rewardCard)}`
          + `<p>เปิดได้ <b>${esc(cardNameTh(rewardCard))}</b>`
          + ` · ${esc((TEAMBOOK_RARITY_META[rewardCard.rarity] || TEAMBOOK_RARITY_META.common).label)}</p></div>`
        : esc(post.body));
    const tag = post.kind === 'commit' ? '<span class="tag">COMMIT</span>'
      : (isReward ? '<span class="tag reward-tag">การ์ด</span>' : '');"""
new_log = """    const isPet = post.kind === 'pet';
    const isReward = post.kind === 'reward';
    const pendingFirstSeen = isReward && post.rewardSource === 'first_seen_pending' && post.rewardId;
    const rewardCard = isReward && !pendingFirstSeen ? cardById(post.body) : null;
    const el = document.createElement('div');
    el.className = 'post'
      + (post.kind === 'commit' ? ' commit' : '')
      + (isReward ? ' reward' : '')
      + (pendingFirstSeen ? ' reward-pending' : '')
      + (isPet ? ' pet' : '')
      + (post.retracted ? ' retracted' : '');
    /* The whole message is tinted by what came out of the card, so a
       Legendary reads as an event from across the log. */
    if (rewardCard) el.dataset.rarity = rewardCard.rarity || 'common';

    const rewardReason = post.rewardSource === 'first_seen'
      ? 'รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก'
      : (post.rewardSource === 'first_seen_pending'
        ? 'เห็นความพยายามของคนอื่นเป็นครั้งแรก'
        : (post.rewardSource === 'party_stars' ? 'รางวัลครบ 3 ดาวในสมุดนี้' : ''));
    const body = post.retracted
      ? '<span>ข้อความถูกถอนโดยเจ้าของ</span>'
      : (pendingFirstSeen
        ? `<a class="reward-log-pending" href="/reveal/?r=${encodeURIComponent(post.rewardId)}">`
          + `<img src="/assets/card-back.webp" alt="การ์ดรอเปิด" width="630" height="880">`
          + `<span><b>${esc(post.alias)} เจอการ์ด</b><small>แตะเพื่อเปิด · ยังไม่เข้า Collection จนกว่าจะเปิด</small></span></a>`
        : (isReward && rewardCard
          ? `<div class="reward-log-card">`
            + (rewardReason ? `<p class="reward-log-reason"><b>${esc(rewardReason)}</b></p>` : '')
            + `${cardMarkup(rewardCard)}`
            + `<p>เปิดได้ <b>${esc(cardNameTh(rewardCard))}</b>`
            + ` · ${esc((TEAMBOOK_RARITY_META[rewardCard.rarity] || TEAMBOOK_RARITY_META.common).label)}</p></div>`
          : esc(post.body)));
    const tag = post.kind === 'commit' ? '<span class="tag">COMMIT</span>'
      : (isReward ? `<span class="tag reward-tag">${esc(post.alias)} เจอการ์ด</span>` : '');"""
text = replace_once(text, old_log, new_log, 'pending reward log card')
old_confirm = """        confirm.addEventListener('click', async () => {
          confirm.disabled = true;
          const result = await confirmCommit(code, post.seq);
          if (result.error === 'ALREADY_CONFIRMED') toast('มีเพื่อน เห็นแล้ว');
          else if (result.error === 'CONFIRM_WINDOW_CLOSED') toast('หมดเวลากดเห็นแล้วของการลงชื่อนี้');
          else if (result.error) toast('ยัง เห็นแล้ว ไม่สำเร็จ');
          else if (result.firstSeenReward?.rewardId && !result.firstSeenReward.revealedAt) {
            toast('เห็นคนอื่นครั้งแรก · ได้การ์ด 1 ใบ');
            location.href = `/reveal/?r=${encodeURIComponent(result.firstSeenReward.rewardId)}`;
            return;
          }
          render();
        });"""
new_confirm = """        confirm.addEventListener('click', async () => {
          confirm.disabled = true;
          confirm.classList.add('is-loading');
          confirm.innerHTML = '<span class="tb-spinner" aria-hidden="true"></span><span>กำลังบันทึกว่าเห็นแล้ว</span><span class="tb-loading-dots" aria-hidden="true"></span>';
          const result = await confirmCommit(code, post.seq);
          if (result.error) {
            confirm.classList.remove('is-loading');
            confirm.disabled = false;
            confirm.textContent = '◎ เห็นแล้ว';
            if (result.error === 'ALREADY_CONFIRMED') toast('มีเพื่อนเห็นแล้ว');
            else if (result.error === 'CONFIRM_WINDOW_CLOSED') toast('หมดเวลากดเห็นแล้วของการลงชื่อนี้');
            else toast('ยังเห็นแล้วไม่สำเร็จ');
            if (result.error === 'ALREADY_CONFIRMED') refreshParty(code).then(fresh => { if (!fresh.error) render(); });
            return;
          }
          confirm.classList.remove('is-loading');
          confirm.textContent = '◎ เห็นแล้ว ✓';
          if (result.firstSeenReward?.rewardId && !result.firstSeenReward.revealedAt) {
            toast('เจอการ์ดแล้ว · การ์ดอยู่ในเรื่องในสมุด แตะเพื่อเปิดเมื่อพร้อม');
          } else {
            toast('เห็นแล้ว ✓');
          }
          /* Confirmation already committed. Hydrate in the background so the
             tap never waits for the whole notebook payload. */
          refreshParty(code).then(fresh => { if (!fresh.error) render(); });
        });"""
text = replace_once(text, old_confirm, new_confirm, 'fast seen button')
write(path, text)

# 6) Reveal: flip on the tap, then persist in parallel. If persistence fails,
# the same pending card remains in the notebook and can be retried.
path = 'teambook/reveal/index.html'
text = read(path)
text = replace_once(
    text,
    '<p class="whisper">เพิ่มเข้าคอลเลกชันแล้วก่อนเปิด จึง refresh เพื่อสุ่มใหม่ไม่ได้</p>',
    '<p class="whisper">เพิ่มเข้าคอลเลกชันแล้ว ✓ · การ์ดใบเดิมถูกล็อกไว้ตั้งแต่ตอนเจอ จึง refresh เพื่อสุ่มใหม่ไม่ได้</p>',
    'reveal ownership copy',
)
text = replace_once(
    text,
    "  if (firstSeenDrop) {\n    $('rewardKicker').textContent = 'เห็นคนอื่นเป็นครั้งแรก ✓';\n    $('instruction').textContent = 'การเห็นคนอื่นเป็นเรื่องที่ดี · กดเปิดการ์ดใบแรกของคุณ';\n  } else if (starDrop) {",
    "  if (firstSeenDrop) {\n    const party = allParties().find(item => item.code === item.partyCode) || allParties().find(item => item.code === reward.partyCode);\n    const identity = partyIdentity(item.partyCode);\n    const alias = party?.members?.find(member => member.userId === identity?.userId)?.alias || 'คุณ';\n    $('rewardKicker').textContent = `${alias} เจอการ์ด`;\n    $('instruction').textContent = 'การเห็นคนอื่นเป็นเรื่องที่ดี · กดการ์ดเพื่อเปิด';\n  } else if (starDrop) {",
    'first seen alias heading',
)
old_click = """  button.addEventListener('click', async () => {
    if (opened) return;
    /* Sound belongs to the tap, not to the network round trip that follows —
       waiting for the save first made the card feel unresponsive. */
    playCardFlip(false);
    if (navigator.vibrate) navigator.vibrate(12);
    button.disabled = true;
    $('instruction').textContent = 'กำลังบันทึกช่วงเวลานี้ลง เรื่องในสมุด…';
    const revealed = starDrop
      ? await revealStarReward(item)
      : await revealPartyCardReward(item.rewardId);
    if (revealed.error) {
      button.disabled = false;
      $('instruction').textContent = revealed.error === 'OFFLINE'
        ? 'ยังออฟไลน์อยู่ · ต่อเน็ตแล้วกดเปิดอีกครั้ง'
        : 'ยังเปิดการ์ดไม่ได้ · ลองอีกครั้ง';
      return;
    }
    opened = true;
    markCardRewardRevealed(item.rewardId);
    button.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', cardNameTh(card));
    $('instruction').textContent = firstSeenDrop
      ? 'เปิดแล้ว · การเห็นความพยายามของคนอื่นคือเรื่องที่ดี'
      : (starDrop
        ? 'เปิดแล้ว · เพื่อนในสมุดจะเห็น เปิดการ์ด ใบนี้ใน เรื่องในสมุด'
        : 'การ์ดใบนี้เป็นความทรงจำจากเล่มที่เขียนจบ ไม่ใช่ของที่ซื้อสุ่ม');
    syncXtyProfile();
    /* Keep the reveal cadence: flip first, brighter note around the
       quarter-turn, then let the reward copy arrive while the 3D turn settles. */
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => playSfx('reveal'), reducedMotion ? 0 : 250);
    setTimeout(finishOpen, reducedMotion ? 0 : 390);
  });"""
new_click = """  let saving = false;
  button.addEventListener('click', async () => {
    if (opened || saving) return;
    saving = true;
    playCardFlip(false);
    if (navigator.vibrate) navigator.vibrate(12);
    button.disabled = true;

    /* The reveal is visual first. The card was already reserved server-side,
       so there is no reason to hold the flip behind a network round trip. */
    button.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', cardNameTh(card));
    $('instruction').textContent = 'กำลังเก็บการ์ดเข้าคอลเลกชัน…';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => playSfx('reveal'), reducedMotion ? 0 : 250);
    setTimeout(() => { $('copy').hidden = false; }, reducedMotion ? 0 : 390);

    const revealed = starDrop
      ? await revealStarReward(item)
      : await revealPartyCardReward(item.rewardId);
    if (revealed.error) {
      saving = false;
      button.disabled = false;
      $('instruction').textContent = revealed.error === 'OFFLINE'
        ? 'เห็นการ์ดแล้ว · ยังไม่ได้เก็บ เพราะออฟไลน์ · ต่อเน็ตแล้วแตะการ์ดอีกครั้ง'
        : 'เห็นการ์ดแล้ว · ยังบันทึกไม่สำเร็จ · แตะการ์ดอีกครั้งเพื่อเก็บ';
      return;
    }
    opened = true;
    saving = false;
    markCardRewardRevealed(item.rewardId);
    $('instruction').textContent = firstSeenDrop
      ? 'เปิดแล้ว · เพิ่มเข้าคอลเลกชันแล้ว ✓'
      : (starDrop
        ? 'เปิดแล้ว · เพื่อนในสมุดจะเห็นการ์ดใบนี้ในเรื่องในสมุด'
        : 'การ์ดใบนี้เป็นความทรงจำจากเล่มที่เขียนจบ ไม่ใช่ของที่ซื้อสุ่ม');
    syncXtyProfile();
    finishOpen();
  });"""
text = replace_once(text, old_click, new_click, 'instant reveal')
write(path, text)

# 7) Create / Join interaction feedback + warm server while user fills the form.
path = 'teambook/new/index.html'
text = read(path)
text = replace_once(
    text,
    '<p class="note"><strong>หลังจากกดสร้างสมุดแล้ว รอประมาณ 5–12 วินาที เพื่อรับรหัสเข้าร่วมสมุด</strong><br>หนึ่งคนสร้างสมุดที่กำลังเขียนได้ 1 สมุด และเข้าร่วมสมุดของเพื่อนได้ 3 สมุด</p>',
    '<p class="note">ตอนกดสร้าง ระบบจะเขียนสมุดและรับรหัสให้ · ปุ่มจะขยับตลอดเวลาที่กำลังบันทึก เพื่อให้รู้ว่าระบบยังทำงานอยู่<br>หนึ่งคนสร้างสมุดที่กำลังเขียนได้ตาม Level และเข้าร่วมสมุดของเพื่อนได้ 3 สมุด</p>',
    'create wait copy',
)
text = replace_once(
    text,
    "if (!hasProfile()) location.replace('/'); else init();",
    "if (!hasProfile()) location.replace('/'); else {\n  fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' }).catch(() => {});\n  init();\n}",
    'create prewarm',
)
text = replace_once(
    text,
    "    const go = $('go'); go.disabled = true; go.textContent = 'กำลังสร้างสมุด…';",
    "    const go = $('go'); go.disabled = true; go.classList.add('is-loading');\n    go.innerHTML = '<span class=\"tb-spinner\" aria-hidden=\"true\"></span><span>กำลังเขียนสมุด</span><span class=\"tb-loading-dots\" aria-hidden=\"true\"></span>';",
    'create loading state',
)
text = replace_once(
    text,
    "      go.disabled = false; go.textContent = 'สร้างสมุด';",
    "      go.disabled = false; go.classList.remove('is-loading'); go.textContent = 'สร้างสมุด';",
    'create loading reset',
)
write(path, text)

path = 'teambook/join/index.html'
text = read(path)
text = replace_once(
    text,
    '<p class="hint" id="joinWait" style="margin-top:12px">หลังจากกดเข้าร่วมสมุดแล้ว รอประมาณ 5–12 วินาที เพื่อยืนยัน Slot สมุด</p>',
    '<p class="hint" id="joinWait" style="margin-top:12px">ตอนกดเข้าร่วม ปุ่มจะขยับขณะกำลังเขียนชื่อคุณลงสมุด · พอยืนยันสมาชิกแล้วจะพาเข้าเล่มทันที</p>',
    'join wait copy',
)
text = replace_once(
    text,
    "} else {\n  initJoin(prefill);\n}",
    "} else {\n  fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' }).catch(() => {});\n  initJoin(prefill);\n}",
    'join prewarm',
)
text = replace_once(
    text,
    "    go.disabled = true;\n    go.textContent = 'กำลังยืนยัน Slot…';",
    "    go.disabled = true;\n    go.classList.add('is-loading');\n    go.innerHTML = '<span class=\"tb-spinner\" aria-hidden=\"true\"></span><span>กำลังเขียนชื่อคุณลงสมุด</span><span class=\"tb-loading-dots\" aria-hidden=\"true\"></span>';",
    'join loading state',
)
text = text.replace(
    "      go.disabled = false;\n      go.textContent = 'เข้าร่วมสมุด';",
    "      go.disabled = false;\n      go.classList.remove('is-loading');\n      go.textContent = 'เข้าร่วมสมุด';",
)
write(path, text)

# 8) Party Log export / weekly sauce should understand an unopened card.
path = 'teambook/_shared/party-log-export.js'
text = read(path)
text = replace_once(
    text,
    "    if (post.kind === 'reward' && post.rewardSource === 'first_seen') {\n      lines.push('rewardLabel: รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก');\n    }",
    "    if (post.kind === 'reward' && post.rewardSource === 'first_seen') {\n      lines.push('rewardLabel: รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก');\n    } else if (post.kind === 'reward' && post.rewardSource === 'first_seen_pending') {\n      lines.push(`rewardLabel: ${speaker} เจอการ์ด · ยังไม่ได้เปิด`);\n    }",
    'export pending reward label',
)
text = replace_once(
    text,
    "    } else {\n      lines.push('message:');\n      lines.push(indentBody(post.body));\n    }",
    "    } else {\n      lines.push('message:');\n      lines.push(post.kind === 'reward' && post.rewardSource === 'first_seen_pending'\n        ? '  [การ์ดรอเปิด]' : indentBody(post.body));\n    }",
    'export hide pending reward id',
)
write(path, text)

path = 'teambook/_shared/reward-loop.js'
text = read(path)
text = replace_once(
    text,
    "    if (post.kind === 'reward') return post.rewardSource === 'first_seen'\n      ? `- รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`\n      : `- เปิดการ์ด · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`;",
    "    if (post.kind === 'reward') {\n      if (post.rewardSource === 'first_seen_pending') return `- ${memberAlias(party, post.userId)} เจอการ์ด · ยังไม่ได้เปิด`;\n      return post.rewardSource === 'first_seen'\n        ? `- รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`\n        : `- เปิดการ์ด · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`;\n    }",
    'weekly pending reward',
)
write(path, text)

# 9) Shared motion styles. Keep them calm, visible and reduced-motion safe.
path = 'teambook/_shared/xty.css'
text = read(path)
marker = '/* TEAMBOOK_ASYNC_FEEDBACK_V1 */'
if marker not in text:
    text += r'''

/* TEAMBOOK_ASYNC_FEEDBACK_V1 */
.btn.is-loading,.confirm-button.is-loading{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:wait}
.tb-spinner{width:16px;height:16px;flex:0 0 16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:tb-spin .72s linear infinite}
.tb-loading-dots{display:inline-block;width:18px;overflow:hidden;vertical-align:bottom}
.tb-loading-dots::after{content:'...';display:inline-block;width:0;white-space:nowrap;animation:tb-dots 1.2s steps(4,end) infinite}
.reward-log-pending{display:flex;align-items:center;gap:13px;padding:12px;text-decoration:none;color:inherit;border:1px dashed rgba(166,116,45,.38);border-radius:16px;background:rgba(255,250,235,.72);transition:transform .16s ease,background .16s ease}
.reward-log-pending:hover,.reward-log-pending:focus-visible{transform:translateY(-1px);background:rgba(255,247,221,.96)}
.reward-log-pending img{width:54px;aspect-ratio:63/88;height:auto;object-fit:cover;border-radius:8px;box-shadow:0 5px 14px rgba(64,45,24,.16)}
.reward-log-pending span{display:grid;gap:3px}.reward-log-pending b{font-size:14px}.reward-log-pending small{font-size:12px;color:var(--xty-muted);line-height:1.45}
@keyframes tb-spin{to{transform:rotate(360deg)}}
@keyframes tb-dots{0%{width:0}100%{width:18px}}
@media (prefers-reduced-motion:reduce){.tb-spinner,.tb-loading-dots::after{animation:none}.tb-loading-dots::after{width:18px}.reward-log-pending{transition:none}}
'''
write(path, text)

print('TeamBook fast reward UX patch applied')
