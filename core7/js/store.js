/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Local Store
   สถิติ Guest / มือที่เลือก / Preset / Favorite / สถานะ Tutorial
   เก็บในอุปกรณ์ (localStorage) ตามสัญญา Guest Model — ไม่ส่งขึ้น Server

   เมื่อ Backend จริงพร้อม: AuthAdapter + CollectionAdapter จะทับชั้นนี้
   ═══════════════════════════════════════════════════════════════ */

const NS = 'c7:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch { /* private mode */ }
}

/* ── ตัวตน Guest ── */
const ADJ = ['กล้าหาญ', 'ใจดี', 'ช่างคิด', 'ขยัน', 'ร่าเริง', 'สุขุม', 'ว่องไว', 'ใจเย็น'];
const NOUN = ['โคลเวอร์', 'ใบไม้', 'สายลม', 'แสงเช้า', 'ภูเขา', 'สายน้ำ', 'ดวงดาว', 'เมล็ดพันธุ์'];

export function getGuest() {
  let g = read('guest', null);
  if (!g) {
    g = {
      id: 'g-' + Math.random().toString(36).slice(2, 10),
      name: `${NOUN[Math.floor(Math.random() * NOUN.length)]}${ADJ[Math.floor(Math.random() * ADJ.length)]}`,
      createdAt: Date.now(),
    };
    write('guest', g);
  }
  return g;
}
export function setGuestName(name) {
  const g = getGuest();
  g.name = String(name || '').trim().slice(0, 24) || g.name;
  write('guest', g);
  return g;
}

/* ── ตัวตนต่อแท็บ (สำหรับห้อง Local ที่เปิด 2 แท็บบนเครื่องเดียว) ──
   localStorage แชร์กันทุกแท็บ — ถ้าใช้ id เดียวกัน host กับ guest จะชนกัน
   sessionStorage แยกต่อแท็บและรอด Refresh จึงใช้เป็น player id บนโต๊ะ */
export function getTabPlayerId() {
  try {
    let t = sessionStorage.getItem('c7tab_pid');
    if (!t) {
      t = getGuest().id + '-' + Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem('c7tab_pid', t);
    }
    return t;
  } catch { return getGuest().id; }
}

/* ── บัญชีทดลองในเครื่อง (Local Member Preview) ──
   ปลดล็อกภาพการ์ด FIRST HAND เพื่อทดลอง Collection / Hand Builder
   เก็บในเครื่องเท่านั้น — Member จริงจะมาพร้อม Backend (ดู README) */
export function isLocalMember() { return read('local_member', false); }
export function setLocalMember(v) { write('local_member', !!v); }

/* ── Tutorial ── */
export function tutorialCompleted() { return read('tutorial_completed', false); }
export function setTutorialCompleted() { write('tutorial_completed', true); }

/* ── Settings ── */
export function getSettings() {
  return read('settings', { sound: false, haptics: true, reducedSensory: false });
}
export function setSettings(patch) {
  write('settings', { ...getSettings(), ...patch });
}

/* ── มือ 7 ใบล่าสุด ── */
export function getHand() { return read('hand', null); }
export function setHand(cards) { write('hand', cards); }

/* ── Preset (หลายชุด ตั้งชื่อได้ — ไม่ใช่ Deck Lock) ── */
export function getPresets() { return read('presets', []); }
export function savePreset(name, cards) {
  const ps = getPresets();
  ps.push({ id: 'p-' + Date.now().toString(36), name: name.slice(0, 30), cards });
  write('presets', ps.slice(-20));
  return ps;
}
export function deletePreset(id) {
  write('presets', getPresets().filter(p => p.id !== id));
}

/* ── Favorite cards ── */
export function getFavorites() { return read('favorites', []); }
export function toggleFavorite(cardId) {
  let f = getFavorites();
  f = f.includes(cardId) ? f.filter(x => x !== cardId) : [...f, cardId];
  write('favorites', f);
  return f;
}

/* ── สถิติ (แยก bot / casual ตาม Brief §21) ── */
const EMPTY_STATS = {
  matchesPlayed: 0, matchesWon: 0, matchesLost: 0, draws: 0,
  roundsWon: 0, tiebreakWins: 0, finalGrayLosses: 0,
  currentStreak: 0, bestStreak: 0,
  colorPlays: {}, cardPlays: {}, cardDiscards: {},
  opponents: [],
};
export function getStats(mode /* 'bot' | 'casual' */) {
  return read('stats_' + mode, structuredClone(EMPTY_STATS));
}
export function getAllStats() {
  const bot = getStats('bot'), casual = getStats('casual');
  const sum = structuredClone(EMPTY_STATS);
  for (const s of [bot, casual]) {
    for (const k of ['matchesPlayed', 'matchesWon', 'matchesLost', 'draws', 'roundsWon', 'tiebreakWins', 'finalGrayLosses']) sum[k] += s[k];
    for (const map of ['colorPlays', 'cardPlays', 'cardDiscards']) {
      for (const [k, v] of Object.entries(s[map])) sum[map][k] = (sum[map][k] || 0) + v;
    }
    sum.opponents = [...new Set([...sum.opponents, ...s.opponents])];
    sum.bestStreak = Math.max(sum.bestStreak, s.bestStreak);
  }
  return { bot, casual, all: sum };
}

/* บันทึกผล Match — เรียกจากหน้า Result ด้วย view ของผู้เล่น */
export function recordMatch(mode, view, opponentName) {
  const s = getStats(mode);
  const r = view.result;
  s.matchesPlayed += 1;
  if (r.draw) { s.draws += 1; s.currentStreak = 0; }
  else if (r.youWon) {
    s.matchesWon += 1;
    s.currentStreak = Math.max(1, s.currentStreak + 1);
    s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
    if (r.resultType.startsWith('TIEBREAK')) s.tiebreakWins += 1;
  } else {
    s.matchesLost += 1;
    s.currentStreak = 0;
    if (r.resultType === 'TIEBREAK_FINAL_GRAY') s.finalGrayLosses += 1;
  }
  s.roundsWon += view.you.roundWins;
  for (const round of view.rounds) {
    s.colorPlays[round.you.color] = (s.colorPlays[round.you.color] || 0) + 1;
    s.cardPlays[round.you.cardId] = (s.cardPlays[round.you.cardId] || 0) + 1;
    for (const d of round.discards) if (d.yours) {
      s.cardDiscards[d.cardId] = (s.cardDiscards[d.cardId] || 0) + 1;
    }
  }
  if (opponentName && !s.opponents.includes(opponentName)) {
    s.opponents = [...s.opponents, opponentName].slice(-200);
  }
  write('stats_' + mode, s);

  /* ประวัติ Match ล่าสุด */
  const hist = read('history', []);
  hist.unshift({
    at: Date.now(), mode,
    opponent: opponentName || '?',
    result: r.draw ? 'DRAW' : (r.youWon ? 'WIN' : 'LOSS'),
    resultType: r.resultType,
    score: `${view.you.roundWins}–${view.opponent.roundWins}`,
    rounds: view.rounds.length,
  });
  write('history', hist.slice(0, 50));
}
export function getHistory() { return read('history', []); }

/* ── Snapshot ของ Match ที่กำลังเล่น (Refresh / Reconnect) ── */
export function saveMatchSnapshot(matchId, data) { write('match_' + matchId, data); }
export function loadMatchSnapshot(matchId) { return read('match_' + matchId, null); }
export function clearMatchSnapshot(matchId) {
  try { localStorage.removeItem(NS + 'match_' + matchId); } catch { /* ok */ }
}

/* ── Analytics (เก็บในเครื่อง — นับอย่างเดียว ไม่มีการส่งออก) ── */
export function track(event) {
  const a = read('analytics', {});
  a[event] = (a[event] || 0) + 1;
  write('analytics', a);
}
