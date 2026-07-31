/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Bot Logic
   Deterministic / Probabilistic เท่านั้น — ไม่มี LLM ไม่มีการโกง

   บอทเห็นเฉพาะสิ่งที่ผู้เล่นจริงเห็น: view จาก MatchAuthority.viewFor()
   (มือคู่แข่งไม่อยู่ใน view — โกงไม่ได้โดยโครงสร้าง)

   ระดับ:
   - friendly   สุ่มยุติธรรมจากมือตัวเอง เหมาะกับมือใหม่ / Tutorial
   - reader     อ่านเฉพาะข้อมูลหงายหน้า ประเมินสีที่คู่แข่งน่าจะเหลือ
   - mindgame   อ่าน Pattern การเลือกหลังชนะ/แพ้/เสมอ + ทิ้งเพื่อซ่อนข้อมูล
   ═══════════════════════════════════════════════════════════════ */

import { HAND_SIZE } from './rules.js';

const BEATS = { RED: 'GREEN', GREEN: 'BLUE', BLUE: 'RED' };   // key ชนะ value
const BEATEN_BY = { GREEN: 'RED', BLUE: 'GREEN', RED: 'BLUE' };

/* mulberry32 — RNG แบบ seed ได้ เพื่อให้ replay / test ได้ */
export function seededRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function inHand(view) {
  return view.you.hand.filter(c => c.status === 'IN_HAND');
}

function pickWeighted(items, weightFn, rng) {
  const weights = items.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/* สีที่คู่แข่งเปิดแล้วทั้งหมด (ลง + ทิ้งเพิ่ม) — ข้อมูลหงายหน้าเท่านั้น */
function opponentRevealedColors(view) {
  const out = [];
  for (const r of view.rounds) {
    out.push(r.opp.color);
    for (const d of r.discards) if (!d.yours) out.push(d.color);
  }
  return out;
}

export class Core7Bot {
  constructor({ level = 'friendly', seed = Date.now() } = {}) {
    this.level = level;
    this.rng = seededRng(seed);
    this.log = [];          // Bot Decision Log สำหรับ Debug (ไม่โชว์ระหว่างเกม)
  }

  /* เลือกใบที่จะลงในรอบนี้ → คืน iid */
  chooseCard(view) {
    const hand = inHand(view);
    if (hand.length === 0) return null;
    let choice, reason;
    if (this.level === 'friendly') {
      ({ choice, reason } = this._friendly(hand));
    } else if (this.level === 'reader') {
      ({ choice, reason } = this._reader(view, hand));
    } else {
      ({ choice, reason } = this._mindgame(view, hand));
    }
    this.log.push({ round: view.roundNumber, act: 'play', color: choice.color, reason });
    return choice.iid;
  }

  /* friendly — สุ่มจากสีที่มี แบบกระจายเท่ากันต่อ "สี" ไม่ใช่ต่อใบ
     เพื่อให้มือที่ถือหลายใบสีเดียวไม่กลายเป็นบอทเดาง่าย */
  _friendly(hand) {
    const colors = [...new Set(hand.map(c => c.color))];
    const color = colors[Math.floor(this.rng() * colors.length)];
    const options = hand.filter(c => c.color === color);
    return {
      choice: options[Math.floor(this.rng() * options.length)],
      reason: `random color ${color}`,
    };
  }

  /* reader — ประเมินสีที่คู่แข่ง "น่าจะยังเหลือ" จากข้อมูลหงายหน้า
     สมมุติฐานเริ่มต้น: มือคนทั่วไปกระจายทุกสีเท่า ๆ กัน (7/4 ต่อสี)
     แล้วหักออกตามที่เปิดแล้ว → เลือกสีที่ชนะสีที่คาดว่าเหลือมากสุด */
  _reader(view, hand) {
    const revealed = opponentRevealedColors(view);
    const est = { RED: HAND_SIZE / 4, GREEN: HAND_SIZE / 4, BLUE: HAND_SIZE / 4, GRAY: HAND_SIZE / 4 };
    for (const c of revealed) est[c] = Math.max(0, est[c] - 1);
    /* ความน่าจะเป็นที่คู่แข่งลงสี X ≈ สัดส่วนที่คาดว่าเหลือ */
    const total = est.RED + est.GREEN + est.BLUE + est.GRAY || 1;
    const choice = pickWeighted(hand, card => {
      if (card.color === 'GRAY') return 0.5 / hand.length;   // GRAY เสมอ — ค่ากลาง
      const target = BEATS[card.color];                       // สีที่ใบนี้ชนะ
      const threat = BEATEN_BY[card.color];                   // สีที่ชนะใบนี้
      return 0.2 + (est[target] / total) - 0.6 * (est[threat] / total);
    }, this.rng);
    return { choice, reason: `est ${JSON.stringify(est)}` };
  }

  /* mindgame — โมเดล Markov อย่างง่ายบนข้อมูลหงายหน้า:
     "หลังผลรอบแบบนี้ คู่แข่งชอบลงสีอะไรต่อ" + ผสม reader เป็นฐาน */
  _mindgame(view, hand) {
    /* สร้างตารางเปลี่ยนผ่านจากประวัติจริงของ Match นี้ */
    const trans = {};   // key: ผลรอบก่อนจากมุมคู่แข่ง (W/L/T) → { color: count }
    const rounds = view.rounds;
    for (let i = 1; i < rounds.length; i++) {
      const prev = rounds[i - 1];
      const oppPrevResult = prev.result === 'TIE' ? 'T' : (prev.youWon ? 'L' : 'W');
      const key = oppPrevResult;
      trans[key] = trans[key] || { RED: 0, GREEN: 0, BLUE: 0, GRAY: 0 };
      trans[key][rounds[i].opp.color] += 1;
    }
    let predicted = null;
    if (rounds.length > 0) {
      const last = rounds[rounds.length - 1];
      const key = last.result === 'TIE' ? 'T' : (last.youWon ? 'L' : 'W');
      const t = trans[key];
      if (t) {
        const totalT = t.RED + t.GREEN + t.BLUE + t.GRAY;
        if (totalT >= 2) {
          predicted = Object.entries(t).sort((x, y) => y[1] - x[1])[0][0];
        }
      }
    }
    if (predicted && predicted !== 'GRAY') {
      /* มีสีที่ชนะสีที่ทายไว้ไหม */
      const counter = BEATEN_BY[predicted];
      const options = hand.filter(c => c.color === counter);
      if (options.length > 0 && this.rng() < 0.7) {
        return {
          choice: options[Math.floor(this.rng() * options.length)],
          reason: `predict ${predicted} → counter ${counter}`,
        };
      }
    }
    /* ไม่มีข้อมูลพอ → ถอยไปใช้ reader */
    const r = this._reader(view, hand);
    return { choice: r.choice, reason: `fallback ${r.reason}` };
  }

  /* เลือกใบที่จะทิ้งเพิ่มเมื่อแพ้ → คืน iid */
  chooseDiscard(view) {
    const hand = inHand(view);
    if (hand.length === 0) return null;
    let choice, reason;
    if (this.level === 'friendly') {
      choice = hand[Math.floor(this.rng() * hand.length)];
      reason = 'random discard';
    } else if (this.level === 'reader') {
      /* ทิ้งสีที่ถือซ้ำมากสุด — รักษาความหลากหลายของมือ */
      const counts = {};
      for (const c of hand) counts[c.color] = (counts[c.color] || 0) + 1;
      const most = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const options = hand.filter(c => c.color === most);
      choice = options[Math.floor(this.rng() * options.length)];
      reason = `discard duplicate ${most}`;
    } else {
      /* mindgame — ทิ้งเพื่อซ่อนข้อมูล: ทิ้งสีที่ "เปิดไปแล้วเยอะ"
         เพื่อไม่เผยว่าสีลับที่เหลือคืออะไร */
      const mine = [];
      for (const r of view.rounds) {
        mine.push(r.you.color);
        for (const d of r.discards) if (d.yours) mine.push(d.color);
      }
      const exposure = {};
      for (const c of hand) exposure[c.color] = 0;
      for (const c of mine) if (c in exposure) exposure[c] += 1;
      const best = hand.slice().sort((x, y) =>
        (exposure[y.color] || 0) - (exposure[x.color] || 0))[0];
      choice = best;
      reason = 'discard already-revealed color';
    }
    this.log.push({ round: view.roundNumber, act: 'discard', color: choice.color, reason });
    return choice.iid;
  }

  /* เลือกมือ 7 ใบของบอทจาก Generic — กระจายพอประมาณ สุ่มเล็กน้อย */
  static buildHand(rng = Math.random) {
    const base = ['RED', 'RED', 'GREEN', 'GREEN', 'BLUE', 'BLUE'];
    const all = ['RED', 'GREEN', 'BLUE', 'GRAY'];
    base.push(all[Math.floor(rng() * all.length)]);
    /* สลับ 0–2 ใบเป็นสีสุ่ม เพื่อไม่ให้ทุกเกมเหมือนกัน */
    const swaps = Math.floor(rng() * 3);
    for (let i = 0; i < swaps; i++) {
      base[Math.floor(rng() * base.length)] = all[Math.floor(rng() * all.length)];
    }
    const GEN = { RED: 'gen-red', GREEN: 'gen-green', BLUE: 'gen-blue', GRAY: 'gen-gray' };
    return base.map(c => GEN[c]);
  }
}
