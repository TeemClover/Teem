import legacyXtyHandler from '../teambook/[...path].js';
import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';
import { dissolveXtyParty } from './xty-dissolve.js';
import { handleCreatePartyV2 } from './xty-create-v2.js';
import { handleCreatePartyV3 } from './xty-create-v3.js';
import { handleJoinPartyV2 } from './xty-join-v2.js';
import { handleIdentityV2, handleLeaveV2, handleProfileV2, handleCoverV2 } from './xty-member-actions-v2.js';
import { handleDebugLevel2 } from './xty-debug-level-v2.js';
import { handlePublicPreviewV2 } from './xty-public-preview-v2.js';

const LEVEL_FLAVORS = Object.freeze({
  2: Object.freeze([
    'หน้าแรกของคุณไม่ว่างอีกแล้ว — คุณมีเรื่องที่เกิดขึ้นจริงอยู่ใน TeamBook แล้ว',
    'คุณไม่ได้แค่ลองเปิดสมุด คุณอยู่จนเห็นเรื่องหนึ่งเดินไปถึงตอนจบ',
    'จากคนที่เพิ่งเข้ามา วันนี้คุณมีบทแรกของตัวเองแล้ว',
    'สมุดเล่มหนึ่งจำได้แล้วว่าคุณเคยอยู่ตรงนี้ และนั่นคือการเริ่มต้นที่ดี',
    'ก้าวแรกไม่ต้องใหญ่ แค่เกิดขึ้นจริงก็พอ — และของคุณเกิดขึ้นแล้ว',
    'คุณผ่านจากการมองดู มาเป็นคนหนึ่งที่มีรอยอยู่ในสมุดจริง ๆ แล้ว',
    'เรื่องแรกจบลง แต่พื้นที่ที่คุณสร้างได้เพิ่งกว้างขึ้น',
    'TeamBook รู้จักคุณมากกว่าเดิมหนึ่งบท เพราะคุณอยู่กับมันจนจบ',
    'นี่ไม่ใช่คะแนนจากการกดเล่น แต่มาจากช่วงเวลาที่คุณอยู่ร่วมกับคนอื่นจริง ๆ',
    'คุณเริ่มมีประวัติของตัวเองในโลกนี้แล้ว — ไม่ใช่แค่โปรไฟล์ว่าง ๆ',
    'จากหน้าแรกที่ยังไม่รู้ว่าจะเกิดอะไร ตอนนี้มันกลายเป็นความทรงจำหนึ่งชิ้นแล้ว',
    'การเติบโตครั้งแรกเกิดจากเรื่องเล็กมาก: คุณเข้ามา แล้วอยู่จนมันจบ',
    'คุณไม่ต้องรีบเก่งขึ้น แค่มีเรื่องจริงเพิ่มขึ้นทีละเล่มก็พอ',
    'เล่มแรกพิสูจน์แล้วว่าคุณไม่ได้มาแค่ผ่านทาง',
    'มีบางอย่างต่างจากวันแรกแล้ว — ตอนนี้สมุดเคยมีคุณอยู่จริง ๆ',
    'ยินดีด้วย คุณเปลี่ยนจากคนเปิดสมุด เป็นคนที่มีบทหนึ่งอยู่ในนั้นแล้ว',
    'ทุกระดับเริ่มจากร่องรอยเล็ก ๆ และร่องรอยแรกของคุณถูกเก็บไว้แล้ว',
    'คุณเพิ่งเรียนรู้ภาษาง่ายที่สุดของ TeamBook: กลับมา อยู่ด้วยกัน แล้วปิดเล่มให้จบ',
    'เรื่องแรกไม่จำเป็นต้องสมบูรณ์ แค่เป็นเรื่องที่เกิดขึ้นจริงก็มีค่าพอแล้ว',
    'สมุดเล่มนี้จบ แต่คุณไม่ได้กลับไปเป็นคนเดิมก่อนเปิดมันแล้ว',
    'วันนี้ TeamBook ไม่ได้แค่จำชื่อคุณ — มันจำช่วงเวลาหนึ่งของคุณได้แล้ว',
    'การเดินทางแรกถูกเก็บเรียบร้อย และนี่คือสิทธิ์ในการเปิดพื้นที่ให้เรื่องถัดไป',
    'หนึ่งเล่ม หนึ่งบท หนึ่งก้าว — คุณโตขึ้นแล้วจริง ๆ',
    'ขอบคุณที่ไม่ได้แค่เริ่ม แต่ยอมอยู่จนเห็นปลายทางของเล่มแรก',
  ]),
  3: Object.freeze([
    'ครั้งนี้คุณไม่ได้แค่ร่วมทาง — คุณเป็นคนเปิดพื้นที่ แล้วพามันไปถึงตอนจบ',
    'การเริ่มสมุดง่ายกว่าการดูแลมันจนจบ และคุณทำอย่างหลังได้แล้ว',
    'จากสมาชิกคนหนึ่ง วันนี้คุณพิสูจน์แล้วว่าคุณสร้างพื้นที่ให้คนอื่นมาอยู่ร่วมกันได้',
    'คุณไม่ได้สร้างแค่สมุดหนึ่งเล่ม แต่สร้างช่วงเวลาที่คนอื่นเข้ามามีส่วนร่วมได้จริง',
    'เจ้าของสมุดไม่ได้แปลว่าเป็นหัวหน้า แปลว่าเป็นคนที่เปิดหน้าแรกและอยู่รับผิดชอบจนหน้าสุดท้าย',
    'เล่มนี้ไปถึงตอนจบเพราะมีคนเริ่มมัน และคนนั้นคือคุณ',
    'คุณเริ่มเห็นแล้วว่าการสร้างทีมอาจเริ่มจากหน้ากระดาษเล็ก ๆ เพียงหน้าเดียว',
    'พื้นที่ที่คุณเปิดไม่ได้ว่างเปล่าอีกแล้ว มันมีเรื่องของคนหลายคนอยู่ในนั้น',
    'ยินดีด้วย คุณโตจากคนที่มีเรื่องของตัวเอง เป็นคนที่สร้างที่ให้เรื่องของคนอื่นเกิดร่วมกัน',
    'การพาเล่มหนึ่งไปจนจบ คือหลักฐานว่าคุณดูแลพื้นที่ร่วมกันได้',
    'วันนี้คำว่า “Team” ใน TeamBook มีรอยมือของคุณอยู่ข้างในแล้ว แม้โลกนี้จะไม่มีมือมนุษย์ให้เห็นก็ตาม',
    'คุณไม่ได้ต้องพูดมากเพื่อพาคนไปด้วยกัน แค่เปิดที่ไว้และกลับมาอย่างต่อเนื่องก็พอ',
    'เล่มนี้สอนสิ่งหนึ่ง: การสร้างพื้นที่เล็ก ๆ ให้คนกลับมา อาจมีค่ากว่าการเรียกทุกคนให้พร้อมกัน',
    'จากการอยู่ในสมุด สู่การสร้างสมุด — นี่คือการเติบโตอีกแบบหนึ่ง',
    'คุณพาเรื่องที่ตัวเองเริ่ม เดินครบระยะของมันแล้ว',
    'การเปิดเล่มคือคำชวน ส่วนการอยู่จนจบคือคำยืนยัน — คุณทำครบทั้งสองอย่างแล้ว',
    'มีคนเคยเข้ามาอยู่ในพื้นที่ที่คุณเปิด และตอนนี้พื้นที่นั้นมีตอนจบของมันเองแล้ว',
    'Level นี้ไม่ได้มาจากจำนวนข้อความ แต่มาจากการสร้างช่วงเวลาที่มีต้นและมีปลายจริง ๆ',
    'คุณกำลังเก่งขึ้นในสิ่งที่ TeamBook ให้ค่าที่สุด: สร้างพื้นที่ แล้วปล่อยให้คนเห็นกัน',
    'สมุดหนึ่งเล่มเกิดได้เพราะใครบางคนเริ่ม และโตได้เพราะใครบางคนยังอยู่ — ครั้งนี้เป็นคุณทั้งสองอย่าง',
    'จากนี้คุณมีพื้นที่มากขึ้น ไม่ใช่เพื่อเปิดให้เยอะที่สุด แต่เพื่อเลือกเรื่องที่อยากดูแลจริง ๆ',
    'การสร้างทีมไม่จำเป็นต้องเริ่มจากองค์กร บางทีมันเริ่มจากสมุดหนึ่งเล่มที่คุณไม่ปล่อยกลางทาง',
    'คุณพาเรื่องหนึ่งเดินครบระยะ และ TeamBook จำการเติบโตนั้นไว้แล้ว',
    'ยินดีด้วย คุณไม่ได้แค่สร้างสมุดสำเร็จ คุณสร้างความต่อเนื่องให้คนกลุ่มหนึ่งสำเร็จด้วย',
  ]),
  4: Object.freeze([
    '7 วันติดกัน มีสิ่งหนึ่งไม่ขาดหาย: คุณกลับมา และมีใครบางคนเห็นมัน',
    'ความสม่ำเสมอของคุณไม่ได้อยู่ลำพัง — ตลอด 7 วัน มีสายตาของใครบางคนอยู่ข้าง ๆ',
    'คุณมาถึงระดับนี้ด้วยสิ่งที่ TeamBook ให้ค่าที่สุด: ทำจริง และมีคนเห็นจริง',
    '7 วันติดกันอาจดูเล็กในปฏิทิน แต่ในชีวิตจริง มันคือความต่อเนื่องที่สร้างขึ้นทีละวัน',
    'คุณไม่ต้องมี streak เพื่ออวดใคร แต่ครั้งนี้ streak ของคุณมีคนอยู่ร่วมเป็นพยานจริง ๆ',
    'ไม่มีวันไหนใน 7 วันนี้หายไปเงียบ ๆ — ทุกวันมีรอย และมีคนเห็นรอยนั้น',
    'นี่คือ Level ที่ไม่ได้วัดว่าคุณทำมากแค่ไหน แต่วัดว่าคุณกลับมาได้ต่อเนื่องแค่ไหน',
    'คุณรักษาสัญญาเล็ก ๆ ไว้ 7 วันติด และทุกวันนั้นไม่ได้เกิดขึ้นลำพัง',
    'บางความเติบโตไม่ต้องมีเสียงดัง แค่กลับมาทุกวัน แล้วมีคนหนึ่งเห็น ก็ชัดพอแล้ว',
    '7 วันติดกันเปลี่ยนสิ่งที่ตั้งใจไว้ ให้กลายเป็นเรื่องที่มีหลักฐานอยู่ในสมุดแล้ว',
    'คุณเดินมาถึงขอบเขตสูงสุดของ TeamBook ตอนนี้ ด้วยการทำสิ่งธรรมดาให้เกิดขึ้นซ้ำอย่างมีความหมาย',
    'สิ่งที่พาคุณมาถึงตรงนี้ไม่ใช่ความสมบูรณ์แบบ แต่คือการไม่ปล่อยให้ 7 วันนั้นขาดจากกัน',
    'คุณไม่ได้ชนะใครเลย และนั่นแหละคือประเด็น — คุณแค่เติบโตจากสิ่งที่ตัวเองทำจริง',
    'ทุกวันที่ถูกเห็นต่อกัน กลายเป็นเส้นเดียวกัน และเส้นนั้นพาคุณมาถึง Level 4',
    'ความต่อเนื่องมีน้ำหนักขึ้น เมื่อรู้ว่ามีใครบางคนรับรู้ว่ามันเกิดขึ้นจริง',
    'คุณทำให้คำว่า “เห็นกัน” ยาวต่อเนื่องพอที่จะกลายเป็นบทหนึ่งของชีวิตแล้ว',
    '7 วันที่ไม่ขาด ไม่ใช่เพราะแอพเรียกคุณกลับมา — คุณกลับมาเอง และเพื่อนก็ยังเห็นคุณ',
    'นี่คือสิ่งที่ TeamBook อยากให้ Level สูงสุดหมายถึงในตอนนี้: ความสม่ำเสมอที่มีคนร่วมรับรู้',
    'จากวันแรกที่แค่ลองเปิดสมุด วันนี้คุณมีประวัติของการกลับมาและถูกเห็นต่อเนื่องแล้ว',
    'Level 4 ไม่ได้บอกว่าคุณเก่งที่สุด มันบอกว่าคุณมีเรื่องจริงมากพอให้สมุดจำได้',
    'คุณรักษาจังหวะของตัวเองไว้ และเพื่อนรักษาการมองเห็นคุณไว้ด้วยกันครบ 7 วันติด',
    'ไม่มี Notification ไหนพาคุณมาถึงตรงนี้ มีแต่การกลับมาของคุณเอง และการเห็นของคนข้าง ๆ',
    'ยินดีด้วย คุณโตมาถึงระดับสูงสุดของบทแรก TeamBook แล้ว — จากนี้คือเรื่องที่คุณเลือกจะเขียนต่อ',
    '7 วันต่อเนื่องถูกเก็บเป็นมากกว่า streak มันกลายเป็นความทรงจำร่วมของคนในเล่มแล้ว',
  ]),
});

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function inviteCodeOf(req) {
  const fromQuery = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  if (/^\d{5}$/.test(String(fromQuery || ''))) return String(fromQuery);

  const rawPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : String(req.query?.path || '');
  const pathMatch = rawPath.match(/(?:^|\/)party\/(\d{5})\/finish\/?$/);
  if (pathMatch) return pathMatch[1];

  const match = new URL(req.url || '/', 'https://teambook.local').pathname.match(/\/party\/(\d{5})\/finish\/?$/);
  return match ? match[1] : '';
}

function seededIndex(value, length) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return length ? (hash >>> 0) % length : 0;
}

function nextQuestForLevel(level) {
  if (level === 2) return 'สร้างสมุดเอง และอยู่กับมันจนจบตามระยะเวลา เพื่อเติบโตเป็น Level 3';
  if (level === 3) return 'ลงชื่อและถูกเห็นให้ครบอย่างน้อย 7 วันติดกันในสมุดที่จบแล้ว เพื่อเติบโตเป็น Level 4';
  return 'Level 4 คือระดับสูงสุดของ TeamBook ในตอนนี้ · สร้างสมุดเองได้พร้อมกัน 4 เล่ม';
}

function flavorFor(userId, bookId, toLevel) {
  const pool = LEVEL_FLAVORS[toLevel] || [];
  return pool[seededIndex(`${userId}|${bookId}|${toLevel}`, pool.length)] || 'ยินดีด้วย คุณเติบโตขึ้นอีกขั้นแล้ว';
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,role FROM teambook_book_members WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || ''); const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,role FROM teambook_book_members WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function stateAfterClose(req, code) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET';
  proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` };
  proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (capture.statusCode >= 400 || data.error) return null;
  return data;
}

async function captureLegacyComplete(req, code) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'POST';
  proxy.url = `/api/teambook/party/${encodeURIComponent(code)}/finish`;
  proxy.query = { path: `party/${code}/finish` };
  proxy.body = { ...bodyOf(req), mode: 'complete' };
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  return { status: capture.statusCode || 200, data };
}

async function confirmedSeenStreak(sql, bookId, userId) {
  const rows = await sql.query(`SELECT DISTINCT p.day_key::text day_key
    FROM teambook_book_entries p
    WHERE p.book_id=$1 AND p.user_id=$2 AND p.kind='commit' AND p.retracted=FALSE
      AND EXISTS (SELECT 1 FROM teambook_confirmations c
        WHERE c.book_id=p.book_id AND c.commit_seq=p.seq)
    ORDER BY day_key`, [bookId, userId]);
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const row of rows) {
    const current = Date.parse(`${row.day_key}T00:00:00.000Z`);
    if (!Number.isFinite(current)) continue;
    run = previous !== null && current - previous === 86400000 ? run + 1 : 1;
    previous = current;
    if (run > longest) longest = run;
  }
  return longest;
}

async function ensureProgressionRow(sql, userId, at) {
  await sql.query(`INSERT INTO teambook_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
    VALUES ($1,1,'free',0,$2) ON CONFLICT (user_id) DO NOTHING`, [userId, at]);
  const rows = await sql.query(`SELECT level FROM teambook_progression WHERE user_id=$1 LIMIT 1`, [userId]);
  return Math.min(4, Math.max(1, Math.floor(Number(rows[0]?.level || 1)) || 1));
}

async function levelEventFor(sql, bookId, userId) {
  const rows = await sql.query(`SELECT user_id,book_id,from_level,to_level,reason,created_at
    FROM teambook_level_events WHERE user_id=$1 AND book_id=$2 LIMIT 1`, [userId, bookId]);
  return rows[0] || null;
}

async function removeInvalidLevelFour(sql, bookId, userId, event) {
  if (!event || Number(event.from_level) !== 3 || Number(event.to_level) !== 4) return;
  await sql.query(`DELETE FROM teambook_level_events WHERE user_id=$1 AND book_id=$2`, [userId, bookId]);
  const other = await sql.query(`SELECT 1 FROM teambook_level_events
    WHERE user_id=$1 AND book_id<>$2 AND to_level>=4 LIMIT 1`, [userId, bookId]);
  if (!other[0]) {
    await sql.query(`UPDATE teambook_progression SET level=3,updated_at=NOW()
      WHERE user_id=$1 AND level=4`, [userId]);
  }
}

async function grantLevelFour(sql, bookId, userId, at) {
  const inserted = await sql.query(`INSERT INTO teambook_level_events
    (user_id,book_id,from_level,to_level,reason,created_at)
    VALUES ($1,$2,3,4,'SEVEN_DAY_SEEN_STREAK',$3)
    ON CONFLICT (user_id,book_id) DO NOTHING RETURNING user_id`, [userId, bookId, at]);
  if (!inserted[0]) return false;
  await sql.query(`UPDATE teambook_progression SET level=4,updated_at=$2
    WHERE user_id=$1 AND level=3`, [userId, at]);
  return true;
}

async function writeLevelUpIntoBook(sql, row, membership, event, at) {
  if (!event) return null;
  const fromLevel = Number(event.from_level || 1);
  const toLevel = Number(event.to_level || Math.min(4, fromLevel + 1));
  if (toLevel <= fromLevel || toLevel > 4) return null;
  const already = await sql.query(`SELECT 1 FROM teambook_book_events
    WHERE book_id=$1 AND type='MEMBER_LEVEL_UP' AND actor_id=$2
      AND data_json->>'toLevel'=$3 LIMIT 1`, [row.id, membership.user_id, String(toLevel)]);
  const flavor = flavorFor(membership.user_id, row.id, toLevel);
  const nextQuest = nextQuestForLevel(toLevel);
  const alias = membership.alias || 'เพื่อนในสมุด';
  const payload = {
    alias,
    fromLevel,
    toLevel,
    capacity: toLevel,
    flavor,
    nextQuest,
    reason: event.reason || '',
    congratulations: `ยินดีด้วย ${alias} เติบโตขึ้นเป็น Level ${toLevel}`,
  };
  if (!already[0]) {
    await sql.query(`INSERT INTO teambook_book_events
      (book_id,type,actor_id,party_day,data_json,created_at)
      VALUES ($1,'MEMBER_LEVEL_UP',$2,$3,$4::jsonb,$5)`, [
      row.id, membership.user_id, Number(row.duration_days || 1), JSON.stringify(payload), at,
    ]);
    const body = `🎉 ${alias} เติบโตแล้ว · Level ${fromLevel} → ${toLevel} · ${flavor} · ตอนนี้สร้างสมุดได้ ${toLevel} เล่มพร้อมกัน`;
    await sql.query(`WITH next AS (
        UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1 WHERE id=$2 RETURNING head_seq
      ) INSERT INTO teambook_book_entries
        (book_id,seq,user_id,kind,body,sent_at,day_key,retracted)
        SELECT $2,next.head_seq,$3,'level_up',$4,$1,$5::date,FALSE FROM next`, [
      at, row.id, membership.user_id, body, at.toISOString().slice(0, 10),
    ]);
  }
  return payload;
}

async function reconcileGrowth(sql, row, at = new Date()) {
  const members = await sql.query(`SELECT user_id,alias,role,joined_at,left_at
    FROM teambook_book_members WHERE book_id=$1 ORDER BY joined_at`, [row.id]);
  const payloads = new Map();

  for (const membership of members) {
    let event = await levelEventFor(sql, row.id, membership.user_id);
    let level = await ensureProgressionRow(sql, membership.user_id, at);

    /* Legacy progression required every expected day and could also accept
       trust-mode commits without a Seen confirmation. Level 4 now means one
       exact thing: at least seven consecutive days where this member signed
       and somebody else actually pressed เห็นแล้ว. */
    if (event && Number(event.from_level) === 3 && Number(event.to_level) === 4) {
      const streak = await confirmedSeenStreak(sql, row.id, membership.user_id);
      if (streak < 7) {
        await removeInvalidLevelFour(sql, row.id, membership.user_id, event);
        event = null;
        level = await ensureProgressionRow(sql, membership.user_id, at);
      }
    }

    /* The new rule is intentionally easier than “perfect every day of a
       14/28-day book”: seven uninterrupted Seen days are enough, but the book
       still has to reach its real ending. One book can only insert one event. */
    if (!event && level === 3) {
      const streak = await confirmedSeenStreak(sql, row.id, membership.user_id);
      if (streak >= 7) {
        await grantLevelFour(sql, row.id, membership.user_id, at);
        event = await levelEventFor(sql, row.id, membership.user_id);
      }
    }

    if (!event) continue;
    const payload = await writeLevelUpIntoBook(sql, row, membership, event, at);
    if (payload) payloads.set(membership.user_id, payload);
  }
  return payloads;
}

async function completeWithGrowth(req, res, code) {
  try {
    if (String(req.method || 'GET').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database();
    await ensureSchema(sql);
    const before = await sql.query(`SELECT id,code,state,duration_days,started_at,created_at,scheduled_end_at,ended_at,timezone
      FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
    const rowBefore = before[0];
    if (!rowBefore) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const caller = await memberFor(req, sql, rowBefore.id);
    if (!caller) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (caller.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);

    const completed = await captureLegacyComplete(req, code);
    if (completed.status >= 400 || completed.data?.error) {
      return sendJson(res, completed.data || { ok: false, error: 'TEAMBOOK_API_ERROR' }, completed.status || 500);
    }

    const after = await sql.query(`SELECT id,code,state,duration_days,started_at,created_at,scheduled_end_at,ended_at,timezone
      FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
    const row = after[0] || rowBefore;
    const at = row.ended_at ? new Date(row.ended_at) : new Date();
    const levelUps = await reconcileGrowth(sql, row, at);
    const fresh = await stateAfterClose(req, code);
    if (!fresh) return sendJson(res, completed.data || { ok: true });
    return sendJson(res, {
      ...fresh,
      levelUp: levelUps.get(caller.user_id) || null,
    });
  } catch (error) {
    console.error('TeamBook complete + growth failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export async function handleXtyPartyFinish(req, res) {
  const op = Array.isArray(req.query?.op) ? req.query.op[0] : req.query?.op;
  if (op === 'create-v2') return handleCreatePartyV2(req, res);
  if (op === 'create-v3') return handleCreatePartyV3(req, res);
  if (op === 'join-v2') return handleJoinPartyV2(req, res, legacyXtyHandler);
  if (op === 'identity-v2') return handleIdentityV2(req, res, legacyXtyHandler);
  if (op === 'leave-v2') return handleLeaveV2(req, res);
  if (op === 'profile-v2') return handleProfileV2(req, res);
  if (op === 'cover-v2') return handleCoverV2(req, res, legacyXtyHandler);
  if (op === 'debug-level2') return handleDebugLevel2(req, res);
  if (op === 'public-preview-v2') return handlePublicPreviewV2(req, res);

  const mode = bodyOf(req).mode === 'dissolve' ? 'dissolve' : 'complete';
  const code = inviteCodeOf(req);
  if (mode === 'complete') return completeWithGrowth(req, res, code);

  try {
    if (String(req.method || 'GET').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql);
    const rows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,
      commit_rule,budget,pet_id,owner_id,state,created_at,updated_at,head_seq,lead_card_id,npc_card_id,
      started_at,ended_at,timezone,verification_mode,scheduled_end_at,cover_type,cover_value FROM teambook_books WHERE code=$1`, [code]);
    const row = rows[0]; if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const member = await memberFor(req, sql, row.id); if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);

    const dissolved = await dissolveXtyParty(sql, row, member.user_id);
    if (!dissolved) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);

    /* V1.2 keeps membership readable after dissolve. Return the canonical
       closed state instead of replacing the local cache with an empty shell. */
    const state = await stateAfterClose(req, code);
    if (state?.party) {
      return sendJson(res, {
        ...state,
        dissolved: true,
        removedMembers: dissolved.removedMembers,
      });
    }
    return sendJson(res, { ok: true, dissolved: true, removedMembers: 0 });
  } catch (error) {
    console.error('TeamBook dissolve failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export default handleXtyPartyFinish;
