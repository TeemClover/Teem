/* ═══════════════════════════════════════════════════════════════
   อะไรปลดแล้วบ้าง — แหล่งเดียวของความจริง

   กติกาชุดนี้เคยอยู่ในหน้า /collection/ หน้าเดียว ผลคือสถิติ Achievement
   นับได้เฉพาะคนที่บังเอิญเปิดอัลบั้ม คนที่อ่านการ์ตูนจบแล้วเดินต่อไปเลย
   ไม่เคยถูกนับ ตัวเลขจึงอ่านว่า "ปลดแล้วและเคยเปิดดู" ซึ่งไม่ใช่คำถามที่ถาม

   ย้ายมาไว้ตรงนี้เพื่อให้ทั้งหน้าอัลบั้มและตัวรายงานสถิติอ่านกติกาเดียวกัน
   ห้ามลอกเงื่อนไขพวกนี้ไปไว้ที่อื่นอีก — สองชุดที่ต้องตรงกันตลอดไป
   สุดท้ายมันจะไม่ตรงกัน แล้วจะไม่มีใครรู้ว่าอันไหนคือของจริง

   ⚠️ id ทุกตัวต้องตรงกับ ACHIEVEMENTS ใน assets/achievements.js
   เพราะฝั่ง backend ใช้ทะเบียนนั้นตัดสินว่า ref ที่ยิงมารู้จักหรือไม่
   ═══════════════════════════════════════════════════════════════ */

export const FORGE_SLUGS = Object.freeze([
  'ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back',
  'ep4-what-traveled-without-us', 'ep5-from-answers-to-a-system',
  'ep6-the-starter-kit', 'ep7-a-voice-that-went-further',
]);
export const LEARN_SLUGS = Object.freeze([
  'free-ai', 'image-ai', 'clip-ai', 'notebooklm', 'prompts', 'first-web',
]);

function raw(k, d = '') { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } }
function list(k) { return raw(k).split(',').filter(Boolean); }
function json(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function titles() { const t = json('mc_titles', []); return Array.isArray(t) ? t : []; }
function hasTitle(t) { return titles().includes(t); }

function core7Stats() {
  /* ⚠️ คีย์คือ c7:stats_bot ขีดล่าง ไม่ใช่ c7:stats:bot */
  const bot = json('c7:stats_bot', {}) || {};
  const casual = json('c7:stats_casual', {}) || {};
  return {
    played: (bot.matchesPlayed || 0) + (casual.matchesPlayed || 0),
    won: (bot.matchesWon || 0) + (casual.matchesWon || 0),
    friendPlayed: casual.matchesPlayed || 0,
  };
}

function firstHandCount() {
  const ids = json('c7:collection', []);
  if (Array.isArray(ids)) return ids.length;
  const n = Number(json('mc_core7_first_hand_count', 0));
  return Number.isFinite(n) ? n : 0;
}

/* เคยจบ SET ไหม — ผลลัพธ์ถูกจดไว้เป็นธงถาวรตั้งแต่ครั้งแรกที่เจอ
   เพราะ snapshot ของ Match ถูกลบทิ้งได้ ถ้าไม่จดไว้ Achievement จะหายย้อนหลัง */
function completedSet() {
  if (raw('c7:first_set_completed') === '1') return true;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('c7:match_')) continue;
      const snap = JSON.parse(localStorage.getItem(key) || 'null');
      const series = snap && snap.series;
      const target = Number((series && series.target) || 0);
      if (target > 1 && (Number(series.youWins || 0) >= target || Number(series.oppWins || 0) >= target)) {
        localStorage.setItem('c7:first_set_completed', '1');
        return true;
      }
    }
  } catch { /* private mode */ }
  return false;
}

/* คืนค่าเป็น Map id → true/false ให้หน้าอัลบั้มเอาไปวาดได้ตรง ๆ
   ไม่ใช่คืนแค่รายการที่ปลดแล้ว เพราะหน้านั้นต้องวาดช่องที่ยังไม่ปลดด้วย */
export function achievementState() {
  const read = list('mc_read');
  const learn = list('mc_learn');
  const c7 = core7Stats();
  const forgeCount = FORGE_SLUGS.filter(s => read.includes(s)).length;
  const learnCount = LEARN_SLUGS.filter(s => learn.includes(s)).length;
  const forgeDone = forgeCount === FORGE_SLUGS.length;
  const cardDone = raw('mc_opened') === '1';
  const classDone = !!raw('mc_class');
  const clubDone = raw('mc_club_seen') === '1';
  const ch7Done = raw('mc_ch7_done') === '1' || hasTitle('AWAKENED');
  const blacksmith = forgeDone || hasTitle('BLACKSMITH');
  const firstHand = firstHandCount();
  const state = {};

  FORGE_SLUGS.forEach((slug, i) => { state['forge-' + (i + 1)] = read.includes(slug); });
  /* ตอนพิเศษปลดพร้อมกับอ่านตอนที่ 7 จบ */
  state['forge-special'] = read.includes(FORGE_SLUGS[6]);
  LEARN_SLUGS.forEach((slug, i) => { state['lesson-' + (i + 1)] = learn.includes(slug); });

  state.awaken = ch7Done;
  state.home = forgeCount > 0 || learnCount > 0 || classDone || cardDone || clubDone || c7.played > 0;
  state.path = classDone;
  state.club = clubDone;
  state.resume = forgeDone;
  state.walkthrough = blacksmith;
  state.card = cardDone;

  state.blacksmith = blacksmith;
  state.awakened = ch7Done;
  state.hero = hasTitle('HERO');
  state.seeker = raw('mc_seek_hit') === '1' || hasTitle('SEEKER');
  state['notebook-found'] = raw('mc_nb_seen') === '1' || raw('mc_nb_restored') === '1' || raw('mc_secret_end') === '1';
  state['notebook-restored'] = raw('mc_nb_restored') === '1';
  state['secret-end'] = raw('mc_secret_end') === '1';
  state.glhf = hasTitle('GLHF');

  state['c7-tutorial'] = json('c7:tutorial_completed', false) === true;
  state['c7-match'] = c7.played > 0;
  state['c7-win'] = c7.won > 0;
  state['c7-friend'] = c7.friendPlayed > 0;
  state['c7-set'] = completedSet();
  state['c7-hand'] = firstHand >= 7;
  state['c7-full'] = firstHand >= 28;

  return state;
}

export function unlockedAchievementIds() {
  const state = achievementState();
  return Object.keys(state).filter(id => state[id]);
}
