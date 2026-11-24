// X-VISOR QUEST 3.0 · Clip Edition: the whole game as pure functions (no DOM), so it can be tested in Node.
// One month = 3 moves. Clips are assets: each clip keeps earning views for months; views bring chats; chats become
// customers; customers renew. Income uses the same rules as QUEST 2.0 (game-commercial-config.js): retail tiers on
// personal XV, and 20% direct mentoring on each team member's own commission. Figures are simulation only.
import { TUTORIAL_OFFER, XIRCLE_STARTER, DIRECT_MENTORING_RULE, getRetailTier } from '../quest/game-commercial-config.js';

export const VERSION = 3;
export const MONTHS = 12;
export const MOVES_PER_MONTH = 3;
export const FIRST_ORDER = Object.freeze({ baht: TUTORIAL_OFFER.price + XIRCLE_STARTER.price, xv: TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv });
export const RENEWAL = Object.freeze({ baht: TUTORIAL_OFFER.price, xv: TUTORIAL_OFFER.xv });
export const CUSTOMERS_PER_RECRUIT = 3;
export const MAX_TEAM = 4;
export const REPLIES_PER_MOVE = 6;

const FRESH = [1, 0.65, 0.45, 0.32, 0.25];
const TEAM_NAMES = ['พี่นก', 'พี่ต้น', 'พี่ฝน', 'พี่เอก'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---- seeded random (mulberry32): same seed, same game ----
function rand(state) {
  let t = (state.seed = (state.seed + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// whole number near `expected`, never negative: the fraction decides the last unit
function roll(state, expected) {
  const base = Math.floor(expected);
  return base + (rand(state) < expected - base ? 1 : 0);
}
function binomial(state, n, p) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand(state) < p) k++;
  return k;
}

// ---- the 12 clip decisions: each teaches one principle of a review clip ----
// score: +1 good, 0 plain, -1 weak. risk: the clip breaks a claim or consent rule and gets no reach.
export const QUIZ = Object.freeze([
  { id: 'hook', ask: 'เปิดคลิปด้วยประโยคไหนดี', topic: 'เครื่องชั่ง', options: [
    { t: '"ชั่งเช้านี้ขึ้น 1 โล ต้องตกใจไหม"', score: 1, why: 'เปิดด้วยเรื่องที่คนดูเจอเอง 3 วินาทีแรกเขาหยุดดู' },
    { t: '"สวัสดีค่ะ วันนี้จะมารีวิวสินค้า"', score: 0, why: 'สุภาพดี แต่ช้าไป คนเลื่อนผ่านก่อนถึงเรื่อง' },
    { t: '"ลด 5 โลใน 7 วัน ทำได้จริง!"', score: -1, risk: true, why: 'สัญญาตัวเลขผลลัพธ์ไม่ได้ คลิปแบบนี้เสี่ยงโดนปิดการมองเห็น' } ] },
  { id: 'real', ask: 'จะเล่าอะไรในคลิปรีวิว', topic: 'เช้าของพี่', options: [
    { t: 'อ่านสรรพคุณจากฉลากให้ครบ', score: 0, why: 'ข้อมูลถูก แต่คนดูหาอ่านเองได้ เขาอยากฟังเรื่องของพี่' },
    { t: 'สิ่งที่พี่ทำจริงทุกเช้า', score: 1, why: 'ประสบการณ์จริงของพี่คือสิ่งที่ไม่มีใครลอกได้' },
    { t: 'เล่าว่าเพื่อนบอกว่าดีมาก', score: -1, why: 'เล่าแทนคนอื่น คนดูจับได้ว่าพี่ไม่ได้ใช้เอง' } ] },
  { id: 'insert', ask: 'ใช้ภาพอะไรแทรกในคลิป', topic: 'แคปแอป', options: [
    { t: 'ภาพจากเน็ตของคนอื่น', score: -1, why: 'ไม่มีสิทธิ์ใช้ และไม่ใช่เรื่องของพี่' },
    { t: 'แคปของลูกค้า ที่ยังไม่ได้ขอ', score: -1, risk: true, why: 'ข้อมูลสุขภาพของลูกค้า ต้องขออนุญาตและปิดชื่อก่อนเสมอ' },
    { t: 'แคปหน้าจอแอปของพี่เอง', score: 1, why: 'ของจริงของพี่เอง ใช้ได้เลย และคนเห็นว่าพี่ใช้จริง' } ] },
  { id: 'one', ask: 'คลิปนี้จะเล่ากี่เรื่อง', topic: 'เรื่องเดียว', options: [
    { t: 'เรื่องเดียว จบใน 30 วินาที', score: 1, why: 'เรื่องเดียวจำง่าย คนดูจนจบ แพลตฟอร์มก็ดันต่อ' },
    { t: 'สามเรื่อง ยาว 3 นาที', score: 0, why: 'เนื้อหาดี แต่ยาวไปสำหรับคลิปแรก แบ่งเป็น 3 คลิปได้' },
    { t: 'ไลฟ์ 1 ชั่วโมง แล้วลงทั้งก้อน', score: -1, why: 'ไม่มีจุดให้คนหยุดดู คลิปสั้นต้องตัดให้เหลือแก่น' } ] },
  { id: 'cta', ask: 'ปิดท้ายคลิปยังไง', topic: 'ชวนเซฟ', options: [
    { t: '"รีบซื้อ ของจะหมดแล้ว"', score: -1, why: 'เร่งขายทำให้คนถอย คนยังไม่ได้ไว้ใจพี่เลย' },
    { t: '"เซฟไว้ดูตอนชั่งครั้งหน้า"', score: 1, why: 'ชวนทำสิ่งเดียวที่ง่าย คนเซฟ คลิปก็วิ่งต่อ' },
    { t: 'ไม่ต้องปิด จบเลย', score: 0, why: 'ไม่ผิด แต่เสียโอกาสบอกคนดูว่าทำอะไรต่อ' } ] },
  { id: 'claim', ask: 'พูดถึงอาหารเสริมยังไง', topic: 'รูทีน', options: [
    { t: '"กินแล้วหายขาด"', score: -1, risk: true, why: 'คำว่ารักษาหรือหายขาด ใช้กับอาหารเสริมไม่ได้เด็ดขาด' },
    { t: '"เป็นส่วนหนึ่งของรูทีนที่พี่ทำทุกวัน"', score: 1, why: 'พูดในกรอบช่วยดูแล และเล่าจากสิ่งที่พี่ทำจริง' },
    { t: 'ไม่พูด โชว์แต่กล่อง', score: 0, why: 'ปลอดภัย แต่คนดูไม่รู้ว่าเกี่ยวกับชีวิตเขายังไง' } ] },
  { id: 'light', ask: 'ตั้งกล้องยังไง', topic: 'แสงหน้าต่าง', options: [
    { t: 'หันหน้าเข้าหน้าต่าง ตั้งมือถือให้นิ่ง', score: 1, why: 'แสงสวยฟรี ภาพนิ่ง คนดูอยู่จนจบ' },
    { t: 'ยืนย้อนแสง ถือมือถือเอง', score: -1, why: 'หน้ามืด ภาพสั่น คนดูเลื่อนผ่าน' },
    { t: 'ใส่เพลงดัง ๆ ให้ดูสนุก', score: 0, why: 'เพลงกลบเสียงพูด คนฟังไม่รู้เรื่อง เบาเพลงลง' } ] },
  { id: 'series', ask: 'คลิปที่แล้วคนดูเยอะ ทำไงต่อ', topic: 'ตอนต่อ', options: [
    { t: 'เปลี่ยนเรื่องใหม่หมด', score: 0, why: 'ได้ลองของใหม่ แต่ทิ้งคนที่ตามเรื่องเดิมอยู่' },
    { t: 'ลบแล้วลงซ้ำอีกรอบ', score: -1, why: 'เสียยอดเดิม และคนดูเห็นซ้ำ' },
    { t: 'ทำตอนต่อจากเรื่องเดิม', score: 1, why: 'ตัวไหนปัง ทำซ้ำตัวนั้น สถิติคือเข็มทิศ' } ] },
  { id: 'comment', ask: 'มีคนถามราคาในคอมเมนต์', topic: 'ตอบคอมเมนต์', options: [
    { t: 'ตอบสั้น ๆ แล้วชวนทักแชต', score: 1, why: 'คนที่ถามคือคนสนใจจริง พาเขาไปคุยต่อ' },
    { t: 'ปล่อยไว้ เดี๋ยวเขาก็ทักเอง', score: -1, why: 'คนถามแล้วเงียบ เขาไปถามคนอื่น' },
    { t: 'วางโปรยาว ๆ ทุกคอมเมนต์', score: 0, why: 'ได้ตอบ แต่ดูเป็นสแปม ตอบเป็นคำของพี่ดีกว่า' } ] },
  { id: 'consent', ask: 'อยากทำรีวิวของลูกค้า', topic: 'รีวิวลูกค้า', options: [
    { t: 'โชว์ภาพก่อน–หลังพร้อมตัวเลขน้ำหนัก', score: -1, risk: true, why: 'ภาพก่อน–หลังกับตัวเลขน้ำหนัก ชวนให้เข้าใจว่าทุกคนจะได้แบบนี้ ใช้ไม่ได้' },
    { t: 'ขออนุญาตเป็นข้อความ และปิดชื่อ', score: 1, why: 'ลูกค้าไว้ใจพี่ และพี่เล่าเรื่องเขาได้อย่างสบายใจ' },
    { t: 'เล่าแทนลูกค้า ไม่ต้องถาม', score: -1, why: 'เรื่องของเขา ต้องให้เขาอนุญาตก่อน' } ] },
  { id: 'shop', ask: 'อยากให้คนสั่งซื้อจากคลิปได้', topic: 'ปักลิงก์', options: [
    { t: 'พูดขายตั้งแต่วินาทีแรก', score: -1, why: 'คนยังไม่รู้ว่าทำไมต้องฟัง ก็โดนขายแล้ว' },
    { t: 'เล่าเรื่องก่อน บอกที่สั่ง 1 ประโยคตอนท้าย', score: 1, why: 'คลิปให้ประโยชน์ก่อน คนที่พร้อมก็กดสั่งได้เลย' },
    { t: 'ไม่บอกเลยว่าซื้อที่ไหน', score: 0, why: 'คนสนใจแต่หาทางซื้อไม่เจอ เสียโอกาส' } ] },
  { id: 'faq', ask: 'วันนี้คิดเรื่องไม่ออก', topic: 'ตอบคำถาม', options: [
    { t: 'ก๊อปคลิปคนอื่นมาลง', score: -1, why: 'ไม่ใช่เสียงของพี่ และผิดสิทธิ์เขา' },
    { t: 'วันนี้ไม่ลง', score: 0, why: 'พักได้ แต่คลิปที่ไม่ได้ลง ไม่ได้ทำงานให้พี่' },
    { t: 'ตอบคำถามที่ลูกค้าถามบ่อย 1 ข้อ', score: 1, why: 'คำถามจริงของลูกค้า คือคลังไอเดียที่ไม่มีวันหมด' } ] },
]);

// one idea per month, said by the companion at month end
export const LESSONS = Object.freeze([
  { t: 'คลิปคือพนักงานที่ไม่นอน', b: 'คลิปที่ลงแล้วยังมีคนดูต่อทุกเดือน ลงครั้งเดียว ทำงานให้พี่ไปเรื่อย ๆ' },
  { t: 'คนทักคือโอกาส', b: 'คนที่ทักมาหลังดูคลิป สนใจจริง ตอบช้าครึ่งหนึ่งหายไป' },
  { t: 'ตัวพี่คือหลักฐาน', b: 'คะแนนนิสัยของพี่ดี คนเชื่อคลิปพี่มากขึ้น และลูกค้าอยู่กับพี่นานขึ้น' },
  { t: 'ขายได้ตอนพี่หลับ', b: 'ปักลิงก์สั่งซื้อไว้ในคลิป คนที่พร้อมซื้อไม่ต้องรอทัก' },
  { t: 'ลูกค้าเก่าคือรายได้ประจำ', b: 'คนที่ต่อรูทีนทุกเดือน ทำเงินมากกว่าการหาคนใหม่ทุกครั้ง' },
  { t: 'สอนทีมทำคลิป = คูณคลังคลิป', b: 'ทีมหนึ่งคนลงคลิปทุกเดือน คลังคลิปของทั้งทีมโตเร็วกว่าพี่ทำคนเดียว' },
  { t: 'ดูสถิติ แล้วทำซ้ำตัวที่ปัง', b: 'คลิปดาวเยอะวิ่งนานกว่าหลายเท่า คุณภาพชนะจำนวน' },
  { t: 'พูดเกินจริง คลิปไม่วิ่ง', b: 'สัญญาผล ตัวเลขน้ำหนัก หรือคำรักษา ทำให้คลิปโดนปิดการมองเห็น' },
  { t: 'ตลาดนี้ขายความสม่ำเสมอ', b: 'คนอยากดูแลน้ำหนักมีเยอะ สิ่งที่เขาขาดคือคนพาทำทุกวัน ไม่ใช่สินค้าวิเศษ' },
  { t: 'ขั้นบันไดรายได้', b: 'ยอดขายส่วนตัวยิ่งสูง เปอร์เซ็นต์ยิ่งขึ้น 20% 23% 25%' },
  { t: 'ผู้นำที่ดีสอนให้ทีมขายเองได้', b: 'รายได้จากทีมมาจากยอดที่เขาทำเอง พี่ได้ส่วนแบ่งเมื่อเขาเก่งขึ้น' },
  { t: 'คลังคลิปคือทรัพย์สิน', b: 'ครบ 12 เดือน พี่มีคลิปที่ยังวิ่งอยู่ทุกวัน นี่คือของที่ติดตัวพี่ไป' },
]);

export function habitScore(state) {
  const h = state.habit;
  return Math.round((h.eat + h.move + h.sleep) / 3);
}
export function lowestHabit(state) {
  return ['eat', 'move', 'sleep'].reduce((a, k) => (state.habit[k] < state.habit[a] ? k : a), 'eat');
}

export function newGame(seed = 20261124) {
  return {
    v: VERSION, seed: seed | 0, month: 1, moves: MOVES_PER_MONTH, phase: 'play',
    habit: { eat: 55, move: 45, sleep: 50 },
    clipsMade: 0, quiz: 0, nextId: 1,
    clips: [], dms: 2, customers: 0, joined: 0, shop: false,
    team: [],
    totals: { income: 0, views: 0, dms: 0, orders: 0, sales: 0, myClips: 0, teamClips: 0, flagged: 0 },
    best: { income: 0, views: 0 },
    history: [], last: null,
  };
}
const copy = (state) => JSON.parse(JSON.stringify(state));
const canPlay = (state) => state.phase === 'play' && state.moves > 0;

export function currentQuiz(state) { return QUIZ[state.quiz % QUIZ.length]; }
export function skillBonus(state) { return state.clipsMade >= 4 ? 1 : 0; }

// ---- moves ----
export function makeClip(state, choice) {
  if (!canPlay(state)) return { state, ok: false, msg: 'เดือนนี้ใช้เวลาครบแล้ว กดจบเดือนได้เลย' };
  const s = copy(state);
  const quiz = currentQuiz(s);
  const opt = quiz.options[choice];
  if (!opt) return { state, ok: false, msg: 'เลือกคำตอบก่อนนะครับ' };
  const score = habitScore(s);
  const q = clamp(2 + opt.score + skillBonus(s) + (score >= 70 ? 1 : 0) - (score < 40 ? 1 : 0), 1, 5);
  const clip = { id: s.nextId++, by: 'me', q, age: 0, flag: Boolean(opt.risk), topic: quiz.topic, views: 0 };
  s.clips.push(clip);
  s.clipsMade += 1; s.quiz += 1; s.moves -= 1;
  s.totals.myClips += 1;
  if (clip.flag) s.totals.flagged += 1;
  return { state: s, ok: true, clip, good: opt.score > 0, risk: Boolean(opt.risk), why: opt.why,
    best: quiz.options.find((o) => o.score > 0)?.t || '' };
}

export function replyChats(state) {
  if (!canPlay(state)) return { state, ok: false, msg: 'เดือนนี้ใช้เวลาครบแล้ว กดจบเดือนได้เลย' };
  if (state.dms < 1) return { state, ok: false, msg: 'ยังไม่มีคนทักเข้ามา ลงคลิปก่อน แล้วจบเดือนให้คลิปวิ่ง' };
  const s = copy(state);
  const handled = Math.min(s.dms, REPLIES_PER_MOVE);
  const rate = 0.2 + habitScore(s) * 0.004;
  const won = Math.max(binomial(s, handled, rate), s.customers + s.joined === 0 ? 1 : 0);
  s.dms -= handled; s.joined += won; s.moves -= 1;
  return { state: s, ok: true, handled, won };
}

export function selfCare(state) {
  if (!canPlay(state)) return { state, ok: false, msg: 'เดือนนี้ใช้เวลาครบแล้ว กดจบเดือนได้เลย' };
  const s = copy(state);
  const low = lowestHabit(s);
  const before = habitScore(s);
  for (const k of ['eat', 'move', 'sleep']) s.habit[k] = clamp(s.habit[k] + (k === low ? 24 : 10), 0, 100);
  s.moves -= 1;
  return { state: s, ok: true, pillar: low, gain: habitScore(s) - before };
}

export function recruitable(state) {
  return Math.min(MAX_TEAM, Math.floor(state.customers / CUSTOMERS_PER_RECRUIT)) - state.team.length;
}
export function teachTeam(state) {
  if (!canPlay(state)) return { state, ok: false, msg: 'เดือนนี้ใช้เวลาครบแล้ว กดจบเดือนได้เลย' };
  const s = copy(state);
  if (recruitable(s) > 0) {
    const member = { id: 't' + (s.team.length + 1), name: TEAM_NAMES[s.team.length], skill: 1, customers: 0, clips: 0, views: 0 };
    s.team.push(member); s.moves -= 1;
    return { state: s, ok: true, kind: 'new', member };
  }
  const member = [...s.team].sort((a, b) => a.skill - b.skill)[0];
  if (member && member.skill < 3) {
    member.skill += 1; s.moves -= 1;
    return { state: s, ok: true, kind: 'up', member };
  }
  if (member) return { state, ok: false, msg: 'ทีมเก่งเต็มที่แล้ว หาลูกค้าประจำเพิ่ม จะมีคนอยากเป็น X-VISOR ตามพี่อีก' };
  return { state, ok: false, msg: `ต้องมีลูกค้าประจำ ${CUSTOMERS_PER_RECRUIT} คนก่อน ถึงจะมีคนอยากทำตามพี่` };
}

export function openShop(state) {
  if (!canPlay(state)) return { state, ok: false, msg: 'เดือนนี้ใช้เวลาครบแล้ว กดจบเดือนได้เลย' };
  if (state.shop) return { state, ok: false, msg: 'ปักลิงก์สั่งซื้อไว้แล้วครับ' };
  const s = copy(state);
  s.shop = true; s.moves -= 1;
  return { state: s, ok: true };
}

// ---- income: same rules as QUEST 2.0 ----
export function retailIncome(baht, xv) {
  const tier = getRetailTier(baht);
  return { tier, income: Math.round(xv * tier.rate) };
}
export function mentoringIncome(memberBaht, memberXv) {
  const { income } = retailIncome(memberBaht, memberXv);
  return Math.round(income * DIRECT_MENTORING_RULE.rate);
}

function clipViews(state, clip, habitMul) {
  if (clip.flag) return 0;
  const fresh = FRESH[Math.min(clip.age, FRESH.length - 1)];
  return Math.round(260 * Math.pow(clip.q, 1.35) * fresh * habitMul * (0.85 + rand(state) * 0.3));
}

export function endMonth(state) {
  if (state.phase !== 'play') return { state, ok: false, msg: 'เกมจบแล้ว' };
  const s = copy(state);
  const score = habitScore(s);
  const habitMul = 0.6 + score * 0.008;

  // the team posts its own clips this month
  const teamNew = [];
  for (const m of s.team) {
    const clip = { id: s.nextId++, by: m.id, q: m.skill + 1, age: 0, flag: false, topic: 'คลิปของ' + m.name, views: 0 };
    s.clips.push(clip); teamNew.push(clip); m.clips += 1; s.totals.teamClips += 1;
  }

  // every clip ever posted runs again
  let viewsMe = 0, viewsTeam = 0;
  const memberViews = Object.fromEntries(s.team.map((m) => [m.id, 0]));
  const ran = [];
  for (const clip of s.clips) {
    const v = clipViews(s, clip, habitMul);
    clip.views += v;
    if (clip.by === 'me') viewsMe += v; else { viewsTeam += v; memberViews[clip.by] += v; }
    if (v > 0) ran.push({ id: clip.id, by: clip.by, q: clip.q, topic: clip.topic, views: v, age: clip.age });
  }

  // my clips: chats, and direct orders once the shop link is on
  const dmsNew = roll(s, viewsMe * 0.007);
  const online = s.shop ? roll(s, viewsMe * 0.0007) : 0;

  // my customers: regulars renew, this month's new ones buy the starter set
  const keepRate = 0.45 + score * 0.0045;
  const renewed = binomial(s, s.customers, keepRate);
  const lost = s.customers - renewed;
  const joined = s.joined + online;
  const personalBaht = joined * FIRST_ORDER.baht + renewed * RENEWAL.baht;
  const personalXv = joined * FIRST_ORDER.xv + renewed * RENEWAL.xv;
  const retail = retailIncome(personalBaht, personalXv);

  // each team member sells from the views of their own clips
  let mentoring = 0, teamBaht = 0, teamOrders = 0;
  const teamRows = [];
  for (const m of s.team) {
    const mNew = roll(s, memberViews[m.id] * 0.007 * 0.3);
    const mKept = binomial(s, m.customers, 0.72);
    const baht = mNew * FIRST_ORDER.baht + mKept * RENEWAL.baht;
    const xv = mNew * FIRST_ORDER.xv + mKept * RENEWAL.xv;
    const cut = mentoringIncome(baht, xv);
    m.customers = mKept + mNew; m.views += memberViews[m.id];
    mentoring += cut; teamBaht += baht; teamOrders += mNew + mKept;
    teamRows.push({ id: m.id, name: m.name, skill: m.skill, clips: m.clips, views: memberViews[m.id], customers: m.customers, sales: baht, cut });
  }

  const income = retail.income + mentoring;
  const report = {
    month: s.month, habit: score, clips: ran.sort((a, b) => b.views - a.views),
    teamNewClips: teamNew.length, viewsMe, viewsTeam, dmsNew, online, joined, renewed, lost,
    personalBaht, personalXv, tier: retail.tier.label, retail: retail.income, mentoring, income,
    teamBaht, teamRows, lesson: LESSONS[(s.month - 1) % LESSONS.length],
    dmsExpired: Math.floor(s.dms / 2),
  };

  s.customers = renewed + joined; s.joined = 0;
  s.dms = s.dms - report.dmsExpired + dmsNew;
  for (const clip of s.clips) clip.age += 1;
  for (const k of ['eat', 'move', 'sleep']) s.habit[k] = clamp(s.habit[k] - 6, 0, 100);
  s.totals.income += income; s.totals.views += viewsMe + viewsTeam; s.totals.dms += dmsNew;
  s.totals.orders += joined + renewed + teamOrders; s.totals.sales += personalBaht + teamBaht;
  s.best.income = Math.max(s.best.income, income); s.best.views = Math.max(s.best.views, viewsMe + viewsTeam);
  s.history.push({ month: s.month, income, views: viewsMe + viewsTeam, customers: s.customers, clips: s.clips.length, habit: score });
  s.last = report;
  if (s.month >= MONTHS) s.phase = 'done';
  else { s.month += 1; s.moves = MOVES_PER_MONTH; }
  return { state: s, ok: true, report };
}

// ---- what the companion says next: one short, useful nudge ----
export function advice(state) {
  if (state.phase === 'done') return 'ครบ 12 เดือนแล้วครับ มาดูคลังคลิปของพี่กัน';
  const score = habitScore(state);
  if (state.moves === 0) return 'ใช้เวลาครบแล้วครับ กด "จบเดือน" ให้คลิปออกไปวิ่ง';
  if (state.clips.length === 0) return 'เริ่มที่คลิปแรกเลยครับ คลิปคือของที่ทำงานแทนพี่';
  if (state.dms >= 3) return `มีคนทักรออยู่ ${state.dms} คนครับ ตอบก่อนเขาหาย`;
  if (score < 45) return 'คะแนนนิสัยของพี่ตกแล้วครับ ดูแลตัวเองสักตา คลิปจะน่าเชื่อขึ้น';
  if (recruitable(state) > 0) return 'มีลูกค้าอยากทำตามพี่แล้วครับ สอนเขาทำคลิป คลังคลิปจะโตเป็นทีม';
  if (!state.shop && state.month >= 3 && state.clips.length >= 3) return 'ปักลิงก์สั่งซื้อในคลิปได้แล้วครับ คนพร้อมซื้อจะไม่ต้องรอทัก';
  if (state.dms > 0) return `มีคนทัก ${state.dms} คนครับ ตอบเลยก็ได้ หรือลงคลิปเพิ่มก่อน`;
  return 'ลงคลิปเพิ่มได้เลยครับ ยิ่งมีคลิปดีในคลัง ยิ่งมีคนทักทุกเดือน';
}

export function finalRank(state) {
  const clips = state.clips.filter((c) => !c.flag).length;
  const income = state.totals.income;
  if (income >= 250000 && state.team.length >= 2) return { title: 'ผู้นำคลังคลิป', note: 'พี่สร้างทั้งคลังคลิปและทีมที่ทำคลิปเองได้' };
  if (income >= 120000) return { title: 'นักเล่าเรื่องมือโปร', note: 'คลิปของพี่ทำงานแทนพี่ได้จริงทุกเดือน' };
  if (clips >= 10) return { title: 'เจ้าของคลังคลิป', note: 'คลังคลิปของพี่ใหญ่แล้ว รอบหน้าลองตอบคนทักให้ไวขึ้น' };
  return { title: 'นักเล่าเรื่องฝึกหัด', note: 'เริ่มได้แล้ว รอบหน้าลองลงคลิปให้สม่ำเสมอขึ้น' };
}

export function parseSave(raw) {
  try {
    const s = JSON.parse(raw || 'null');
    return s && s.v === VERSION && s.habit && Array.isArray(s.clips) ? s : null;
  } catch { return null; }
}
