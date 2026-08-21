from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def replace_once(path, old, new):
    text = read(path)
    if old not in text:
        raise SystemExit(f'expected text not found in {path}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


# Exact API entrypoints: critical operations must not depend on api/[...path].js.
write('teambook/api/teambook-party-finish.js', "export { default } from './_lib/xty-party-finish.js';\n")
write('teambook/api/teambook-mine.js', "export { default } from './_lib/xty-mine.js';\n")
write('teambook/api/teambook-stars.js', "export { default } from './_lib/xty-stars.js';\n")

# Collection wording.
replace_once(
    'teambook/_shared/card-ui.js',
    "AVATAR_IN_USE: 'ใช้อยู่เป็นสัตว์'",
    "AVATAR_IN_USE: 'การ์ดประจำตัว'",
)

# Join recovery: save intent before I/O and persist credentials independently of snapshot refresh.
path = 'teambook/_shared/join-party-v2.js'
text = read(path)
text = text.replace(
    "const K_TOKENS = 'teambook_book_tokens_v1';",
    "const K_TOKENS = 'teambook_book_tokens_v1';\nconst K_PENDING_JOIN = 'teambook_pending_join_v1';",
    1,
)
old = '''function remember(result) {
  const party = result?.party;
  if (!party?.code) return result;

  const cached = read(K_PARTIES, []);
  const parties = Array.isArray(cached) ? cached : [];
  const index = parties.findIndex(item => item?.code === party.code);
  if (index >= 0) parties[index] = party;
  else parties.unshift(party);
  write(K_PARTIES, parties);

  const cachedTokens = read(K_TOKENS, {});
  const tokens = cachedTokens && typeof cachedTokens === 'object' && !Array.isArray(cachedTokens) ? cachedTokens : {};
  tokens[party.code] = {
    token: result.token || tokenFor(party.code),
    userId: result.meUserId || tokens[party.code]?.userId || '',
    quotaSystem: 'v2-separated',
  };
  write(K_TOKENS, tokens);

  return { ...result, party };
}'''
new = '''function clearPendingJoin() {
  try { localStorage.removeItem(K_PENDING_JOIN); } catch {}
}

function remember(result, fallbackCode = '') {
  const party = result?.party || null;
  const code = String(party?.code || result?.code || fallbackCode || '').toUpperCase();
  if (!code) return result;

  if (party?.code) {
    const cached = read(K_PARTIES, []);
    const parties = Array.isArray(cached) ? cached : [];
    const index = parties.findIndex(item => item?.code === party.code);
    if (index >= 0) parties[index] = party;
    else parties.unshift(party);
    write(K_PARTIES, parties);
  }

  const cachedTokens = read(K_TOKENS, {});
  const tokens = cachedTokens && typeof cachedTokens === 'object' && !Array.isArray(cachedTokens) ? cachedTokens : {};
  tokens[code] = {
    token: result.token || tokenFor(code),
    userId: result.meUserId || tokens[code]?.userId || '',
    quotaSystem: 'v2-separated',
  };
  write(K_TOKENS, tokens);
  if (result.token) clearPendingJoin();

  return party ? { ...result, code, party } : { ...result, code };
}'''
if old not in text:
    raise SystemExit('join remember() block drifted')
text = text.replace(old, new, 1)
marker = '''  let response;
  try {
    response = await fetch(`/api/teambook-party-finish?op=join-v2&code=${encodeURIComponent(wanted)}`, {'''
addition = '''  const pendingPayload = {
    alias: String(alias || profile.alias || '').trim(),
    avatar: avatar || profile.avatarId || profile.avatarFallback || 'orange_cat',
    avatarColor: avatarColor || profile.avatarFrame || 'green',
    activityId: activityId || '', activityLabel: activityLabel || '',
    activityDescription: activityDescription || '', activityColor: activityColor || '',
    successRule: successRule || '',
  };
  write(K_PENDING_JOIN, { code: wanted, payload: pendingPayload, attemptedAt: new Date().toISOString() });

'''
if marker not in text:
    raise SystemExit('join fetch marker drifted')
text = text.replace(marker, addition + marker, 1)
old = '''  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    return { ...result, ok: false, error: result.error || `HTTP_${response.status}` };
  }
  return remember(result);
}'''
new = '''  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    const error = result.error || `HTTP_${response.status}`;
    if (response.status < 500 && !/^HTTP_5/.test(error)) clearPendingJoin();
    return { ...result, ok: false, error };
  }
  const remembered = remember(result, wanted);
  clearPendingJoin();
  return remembered;
}

export async function recoverPendingJoinV2() {
  const pending = read(K_PENDING_JOIN, null);
  if (!pending?.code || !pending?.payload) return { ok: true, recovered: false };
  const attempted = new Date(pending.attemptedAt || 0).getTime();
  if (!Number.isFinite(attempted) || Date.now() - attempted > 24 * 60 * 60 * 1000) {
    clearPendingJoin();
    return { ok: true, recovered: false, expired: true };
  }
  const result = await joinPartyV2(pending.code, pending.payload);
  return result.error ? result : { ...result, recovered: true };
}'''
if old not in text:
    raise SystemExit('join result block drifted')
text = text.replace(old, new, 1)
write(path, text)

replace_once(
    'teambook/index.html',
    "import { joinPartyV2 } from '/_shared/join-party-v2.js';",
    "import { joinPartyV2, recoverPendingJoinV2 } from '/_shared/join-party-v2.js';",
)
replace_once(
    'teambook/index.html',
    "  const hadLocalProfile = hasProfile();",
    "  const hadLocalProfile = hasProfile();\n  if (hadLocalProfile) await recoverPendingJoinV2().catch(() => null);",
)
replace_once(
    'teambook/join/index.html',
    "    location.href = `/p/?c=${encodeURIComponent(res.party.code)}`;",
    "    location.href = `/p/?c=${encodeURIComponent(res.party?.code || res.code || input.value)}`;",
)

# Server join: a committed membership must return success even if secondary state hydration fails.
path = 'teambook/api/_lib/xty-join-v2.js'
text = read(path)
old = '''      const state = await legacyState(legacyXtyHandler, req, code, token);
      return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' });'''
new = '''      try {
        const state = await legacyState(legacyXtyHandler, req, code, token);
        return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' });
      } catch (stateError) {
        console.error('TeamBook join v2 state refresh failed after existing membership recovery', code, stateError?.message || stateError);
        return sendJson(res, {
          ok: true, joined: true, recoveryRequired: true, code, token,
          meUserId: existing.user_id, quotaSystem: 'v2-separated',
        });
      }'''
if old not in text:
    raise SystemExit('existing-member join state block drifted')
text = text.replace(old, new, 1)
old = '''    const state = await legacyState(legacyXtyHandler, req, code, token);
    return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' }, 201);'''
new = '''    try {
      const state = await legacyState(legacyXtyHandler, req, code, token);
      return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' }, 201);
    } catch (stateError) {
      console.error('TeamBook join v2 state refresh failed after membership commit', code, stateError?.message || stateError);
      return sendJson(res, {
        ok: true, joined: true, recoveryRequired: true, code, token,
        meUserId: userId, quotaSystem: 'v2-separated',
      }, 201);
    }'''
if old not in text:
    raise SystemExit('new-member join state block drifted')
text = text.replace(old, new, 1)
write(path, text)

# First Seen reward recovery while a book is still active, plus actor identity in event snapshots.
path = 'teambook/api/teambook/[...path].js'
text = read(path)
text = text.replace(
    "SELECT type,party_day,data_json,created_at FROM teambook_book_events",
    "SELECT type,actor_id,party_day,data_json,created_at FROM teambook_book_events",
    1,
)
text = text.replace(
    "type: row.type, partyDay: Number(row.party_day || 1), data,",
    "type: row.type, actorId: row.actor_id || null, partyDay: Number(row.party_day || 1), data,",
    1,
)
text = text.replace(
    "JSON.stringify({ rewardId: inserted[0].id, cardId: inserted[0].card_id || null }), at,",
    "JSON.stringify({ rewardId: inserted[0].id, cardId: inserted[0].card_id || null, alias: member.alias }), at,",
    1,
)
old = '''async function rewardsOf(sql, row, member) {
  if (String(row?.state || '').toUpperCase() !== 'COMPLETED') {
    return { claims: [], mine: null };
  }'''
new = '''async function rewardsOf(sql, row, member) {
  let pendingFirstSeen = null;
  if (member?.user_id) {
    const firstSeenRows = await sql.query(`SELECT r.id,r.user_id,r.book_id,r.card_id,r.created_at,r.revealed_at,p.code
      FROM teambook_card_unlock_events r LEFT JOIN teambook_books p ON p.id=r.book_id
      WHERE r.user_id=$1 AND r.unlock_source='first_seen' AND r.revealed_at IS NULL
      ORDER BY r.created_at,r.id LIMIT 1`, [member.user_id]);
    if (firstSeenRows[0]) pendingFirstSeen = shapedFirstSeenReward(firstSeenRows[0], row.code);
  }
  if (String(row?.state || '').toUpperCase() !== 'COMPLETED') {
    return { claims: [], mine: pendingFirstSeen };
  }'''
if old not in text:
    raise SystemExit('rewardsOf active guard drifted')
text = text.replace(old, new, 1)
start = text.index('async function rewardsOf')
end = text.find('\nasync function', start + 10)
if end < 0:
    end = len(text)
section = text[start:end]
if 'mine: mine ? {' not in section or '} : null,\n  };' not in section:
    raise SystemExit('rewardsOf ending shape drifted')
section = section.replace('mine: mine ? {', 'mine: pendingFirstSeen || (mine ? {', 1)
section = section.replace('    } : null,\n  };', '    } : null),\n  };', 1)
text = text[:start] + section + text[end:]
old = '''      const firstSeenReward = await firstSeenRewardFor(sql, row, member, at);
      if (String(row.state || '').toUpperCase() === 'COMPLETED') await applyProgressionForParty(sql, row, at);
      const state = await stateFor(sql, row, member);
      return sendJson(res, {
        ...state,
        myReward: firstSeenReward || state.myReward,
        firstSeenReward: firstSeenReward || null,
      });'''
new = '''      const firstSeenReward = await firstSeenRewardFor(sql, row, member, at);
      if (String(row.state || '').toUpperCase() === 'COMPLETED') await applyProgressionForParty(sql, row, at);
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
      }'''
if old not in text:
    raise SystemExit('confirm post-write state block drifted')
text = text.replace(old, new, 1)
write(path, text)

# Party page opens any stranded first-seen reward returned by a normal refresh.
path = 'teambook/p/index.html'
text = read(path)
old = '''let foilPlayed = false;
let terminalReward = null;

start();'''
new = '''let foilPlayed = false;
let terminalReward = null;

function openRecoveredFirstSeen(result) {
  const reward = result?.myReward;
  if (!reward?.rewardId || reward.revealedAt || !/^first-seen:/.test(String(reward.questId || ''))) return false;
  location.replace(`/reveal/?r=${encodeURIComponent(reward.rewardId)}`);
  return true;
}

start();'''
if old not in text:
    raise SystemExit('party page state marker drifted')
text = text.replace(old, new, 1)
old = "  const fresh = await refreshParty(code);\n"
if old not in text:
    raise SystemExit('party initial refresh marker drifted')
text = text.replace(old, "  const fresh = await refreshParty(code);\n  if (openRecoveredFirstSeen(fresh)) return;\n", 1)
old = '''  const result = await refreshParty(code);
  $('refresh').disabled = false;
  if (result.error) { toast('ยังดึงอัปเดตไม่ได้'); return; }'''
new = '''  const result = await refreshParty(code);
  $('refresh').disabled = false;
  if (result.error) { toast('ยังดึงอัปเดตไม่ได้'); return; }
  if (openRecoveredFirstSeen(result)) return;'''
if old not in text:
    raise SystemExit('party refresh button marker drifted')
text = text.replace(old, new, 1)
old = '''  const result = await refreshParty(code);
  if (!result.error) render();
});'''
new = '''  const result = await refreshParty(code);
  if (openRecoveredFirstSeen(result)) return;
  if (!result.error) render();
});'''
if old not in text:
    raise SystemExit('party visibility refresh marker drifted')
text = text.replace(old, new, 1)
write(path, text)

# Show the reward-earned event in the shared Party Log, including old rows that lack alias in data_json.
path = 'teambook/_shared/party-enhancements.js'
text = read(path)
old = "function eventText(event) {\n  const data = event?.data && typeof event.data === 'object' ? event.data : {};"
new = "function eventText(event) {\n  const data = event?.data && typeof event.data === 'object' ? event.data : {};\n  const party = getParty(code);\n  const actor = (party?.memberHistory?.length ? party.memberHistory : party?.members || []).find(member => member.userId === event?.actorId);"
if old not in text:
    raise SystemExit('party eventText marker drifted')
text = text.replace(old, new, 1)
old = "    case 'NPC_CHANGED': return 'สมุดเปลี่ยนเพื่อนร่วมทาง';"
new = "    case 'NPC_CHANGED': return 'สมุดเปลี่ยนเพื่อนร่วมทาง';\n    case 'FIRST_SEEN_REWARD_EARNED': return `${data.alias || actor?.alias || 'สมาชิก'} กด “เห็นแล้ว” ครั้งแรก · ได้การ์ด 1 ใบ`;"
if old not in text:
    raise SystemExit('party event switch marker drifted')
text = text.replace(old, new, 1)
write(path, text)

# PET first wake: deterministic once, then adaptive. Add member-authenticated catch-up if cron missed.
path = 'teambook/api/teambook-pet.js'
text = read(path)
old = "    case 'NPC_CHANGED': return 'เพื่อนร่วมทางของสมุดถูกเปลี่ยน';"
new = "    case 'NPC_CHANGED': return 'เพื่อนร่วมทางของสมุดถูกเปลี่ยน';\n    case 'FIRST_SEEN_REWARD_EARNED': return `${data.alias || 'สมาชิก'} กด “เห็นแล้ว” ครั้งแรกและได้รับการ์ด 1 ใบ`;"
if old not in text:
    raise SystemExit('pet eventLine marker drifted')
text = text.replace(old, new, 1)
marker = '''async function directReply(req, res, sql) {'''
addition = r'''function latestScheduledWakeAt(now = new Date()) {
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

'''
if marker not in text:
    raise SystemExit('pet directReply marker drifted')
text = text.replace(marker, addition + marker, 1)
old = "    if (req.method === 'POST' && req.body?.mode === 'direct') return directReply(req, res, sql);\n    if (req.method === 'POST' && req.body?.mode === 'white_cat_intro') return whiteCatIntro(req, res, sql);"
new = "    if (req.method === 'POST' && req.body?.mode === 'direct') return directReply(req, res, sql);\n    if (req.method === 'POST' && req.body?.mode === 'white_cat_intro') return whiteCatIntro(req, res, sql);\n    if (req.method === 'POST' && req.body?.mode === 'first_wake_catchup') return firstWakeCatchup(req, res, sql);"
if old not in text:
    raise SystemExit('pet handler mode marker drifted')
text = text.replace(old, new, 1)
old = '''        const history = await recentLog(sql, party.id);
        const context = await contextFor(sql, party.id, since, now, history);
        const allowance = scheduledBubbleAllowance(context);
        if (!worthReading(wake.hour, context, force)) {'''
new = '''        const history = await recentLog(sql, party.id);
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
        if (!worthReading(wake.hour, context, force)) {'''
if old not in text:
    raise SystemExit('pet scheduled runParty marker drifted')
text = text.replace(old, new, 1)
write(path, text)

path = 'teambook/_shared/pet-direct.js'
text = read(path)
marker = '''async function introduceCollectibleWhiteCat() {'''
addition = '''async function catchUpFirstScheduledWake() {
  if (!code) return;
  const identity = partyIdentity(code);
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  if (identity?.token) headers.authorization = `Bearer ${identity.token}`;
  try {
    const response = await fetch('/api/teambook-pet', {
      method: 'POST', credentials: 'same-origin', headers,
      body: JSON.stringify({ mode: 'first_wake_catchup', code }),
    });
    const result = await response.json().catch(() => ({}));
    if (result?.spoke) document.getElementById('refresh')?.click();
  } catch {
    // Scheduled cron remains canonical; this is a one-time missed-wake repair.
  }
}

'''
if marker not in text:
    raise SystemExit('pet-direct intro marker drifted')
text = text.replace(marker, addition + marker, 1)
old = "setTimeout(() => { void introduceCollectibleWhiteCat(); }, 650);"
new = "setTimeout(() => { void catchUpFirstScheduledWake(); }, 420);\nsetTimeout(() => { void introduceCollectibleWhiteCat(); }, 650);"
if old not in text:
    raise SystemExit('pet-direct timer marker drifted')
text = text.replace(old, new, 1)
write(path, text)

# Health: verify a real DB round-trip and key schema, not just env presence.
write('teambook/api/health.js', '''import { database, ensureSchema, hasDatabaseConfig } from './_lib/core.js';

function reply(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function enabled(primary, legacy) {
  return ['on', '1', 'true', 'yes'].includes(
    String(process.env[primary] || process.env[legacy] || '').trim().toLowerCase(),
  );
}

export default async function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    return reply(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const configured = hasDatabaseConfig();
  let databaseConnected = false;
  let schemaReady = false;
  let databaseError = null;
  if (configured) {
    try {
      const sql = database();
      await ensureSchema(sql);
      const ping = await sql.query(`SELECT
        to_regclass('public.teambook_books') IS NOT NULL AS books,
        to_regclass('public.teambook_book_members') IS NOT NULL AS members,
        to_regclass('public.teambook_sessions') IS NOT NULL AS sessions,
        to_regclass('public.teambook_card_unlock_events') IS NOT NULL AS rewards`);
      databaseConnected = true;
      schemaReady = !!(ping[0]?.books && ping[0]?.members && ping[0]?.sessions && ping[0]?.rewards);
    } catch (error) {
      databaseError = String(error?.code || error?.message || 'DATABASE_UNREACHABLE').slice(0, 120);
    }
  }

  const checks = {
    databaseConfigured: configured,
    databaseConnected,
    schemaReady,
    groqConfigured: enabled('TEAMBOOK_PET_AI', 'XTY_PET_AI') && !!process.env.GROQ_API_KEY,
    visionConfigured: enabled('TEAMBOOK_PET_VISION', 'XTY_PET_VISION') && !!process.env.GROQ_API_KEY,
    blobConfigured: !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID),
    cronConfigured: !!process.env.CRON_SECRET,
    emailConfigured: !!process.env.RESEND_API_KEY && !!process.env.TEAMBOOK_FROM_EMAIL,
  };
  const required = ['databaseConfigured', 'databaseConnected', 'schemaReady', 'groqConfigured', 'blobConfigured', 'cronConfigured'];
  const ready = required.every(key => checks[key]);
  return reply(res, { ok: true, ready, service: 'teambook', checks, ...(databaseError ? { databaseError } : {}) }, ready ? 200 : 503);
}
''')

# Build-time contract makes the exact class of regression that caused today fail the build.
write('teambook/scripts/check-runtime-wiring.mjs', r'''import { existsSync, readFileSync } from 'node:fs';

function must(path, pattern, reason) {
  if (!existsSync(path)) throw new Error(`${path}: missing (${reason})`);
  const source = readFileSync(path, 'utf8');
  if (!pattern.test(source)) throw new Error(`${path}: ${reason}`);
}
function mustNot(path, pattern, reason) {
  const source = readFileSync(path, 'utf8');
  if (pattern.test(source)) throw new Error(`${path}: ${reason}`);
}

must('api/teambook-party-finish.js', /xty-party-finish\.js/, 'exact lifecycle endpoint is not wired');
must('api/teambook-mine.js', /xty-mine\.js/, 'exact account recovery endpoint is not wired');
must('api/teambook-stars.js', /xty-stars\.js/, 'exact stars endpoint is not wired');
must('api/teambook.js', /teambook\/\[\.\.\.path\]\.js/, 'canonical TeamBook API dispatcher missing');
must('_shared/join-party-v2.js', /teambook_pending_join_v1[\s\S]*recoverPendingJoinV2/, 'join recovery contract missing');
must('api/_lib/xty-join-v2.js', /recoveryRequired: true[\s\S]*meUserId/, 'post-commit join recovery missing');
must('api/teambook/[...path].js', /unlock_source='first_seen' AND r\.revealed_at IS NULL/, 'active first-seen reward recovery missing');
must('p/index.html', /openRecoveredFirstSeen/, 'party reward recovery UI missing');
must('_shared/party-enhancements.js', /FIRST_SEEN_REWARD_EARNED/, 'reward event is hidden from Party Log');
must('api/teambook-pet.js', /firstWakeGreeting[\s\S]*first_wake_catchup/, 'guaranteed first PET wake missing');
must('_shared/card-ui.js', /AVATAR_IN_USE: 'การ์ดประจำตัว'/, 'collection identity-card copy drifted');
must('api/health.js', /databaseConnected[\s\S]*schemaReady/, 'health endpoint is config-only');
mustNot('api/_lib/xty-party-finish.js', /from ['"]\.\.\/\[\.\.\.path\]\.js['"]/, 'lifecycle router points at ambiguous top-level catch-all');

const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
if (config.outputDirectory !== 'dist') throw new Error('vercel.json: TeamBook must publish dist at project root');
if (!config.rewrites?.some(item => item.source === '/api/teambook/:path*')) throw new Error('vercel.json: missing canonical TeamBook API rewrite');
if (!config.crons?.some(item => ['/api/teambook-pet', '/api/teambook-pet-compat'].includes(item.path))) throw new Error('vercel.json: PET cron is not wired inside TeamBook project');
console.log('TeamBook runtime wiring OK.');
''')

path = 'teambook/scripts/check-standalone.mjs'
text = read(path)
needle = "  [/put\\(\\s*[\"'`]xty\\//g, 'legacy Blob object prefix'],\n"
if needle not in text:
    raise SystemExit('standalone forbidden-list marker drifted')
text = text.replace(needle, needle + "  [/from\\s*[\"']\\.\\.\\/\\[\\.\\.\\.path\\]\\.js[\"']/g, 'ambiguous top-level API catch-all'],\n", 1)
write(path, text)

path = 'teambook/package.json'
text = read(path)
if '"check:wiring"' not in text:
    text = text.replace(
        '"check:standalone": "node scripts/check-standalone.mjs",',
        '"check:standalone": "node scripts/check-standalone.mjs",\n    "check:wiring": "node scripts/check-runtime-wiring.mjs",',
        1,
    )
text = text.replace(
    '"build": "npm run check:syntax && npm run check:standalone && npm run check:assets && node scripts/build-static.mjs"',
    '"build": "npm run check:syntax && npm run check:standalone && npm run check:wiring && npm run check:assets && node scripts/build-static.mjs"',
    1,
)
write(path, text)
