/* ประกอบ prompt จากสองแหล่ง: กติกากลาง + ซอสของตัวนั้น

   ลำดับตั้งใจให้ "ห้องมาก่อนกฎ": โมเดลอ่านสถานการณ์จริงก่อน แล้วค่อยเจอ
   กติกา แล้วเจอบุคลิกท้ายสุด — บุคลิกเป็นชั้นบาง ๆ ที่ทาทับการตัดสินใจ
   ไม่ใช่สิ่งที่ครอบความคิดตั้งแต่ต้น */

import {
  behaviourMenu, decisionRules, groundingRules, outputContract, pronounRule, thinkingOrder,
} from './constitution.js';
import { presencePolicyPrompt } from './presence-policy.js';

const AXIS_LABELS = Object.freeze({
  warmth: 'อบอุ่น', directness: 'ตรงไปตรงมา', humor: 'ตลก', sarcasm: 'ประชด',
  profanity: 'ภาษาหยาบ', pressure: 'กดดัน', verbosity: 'พูดเยอะ', weirdness: 'หลุดโลก',
});

const SPEECH_LABELS = Object.freeze({
  length: 'ความยาว',
  pronouns: 'สรรพนาม',
  likes: 'คำที่เข้ากับตัวนี้',
  avoids: 'คำที่ห้ามใช้',
  rhythm: 'จังหวะ',
  punctuation: 'เครื่องหมาย',
});

const SAUCE_LABELS = Object.freeze({
  role: 'บทบาท',
  character: 'บุคลิก',
  voice: 'น้ำเสียง',
  naming: 'การเรียกชื่อ',
  watches: 'สิ่งที่มอง',
  ignores: 'ไม่มอง',
  whenEngaging: 'เมื่อเลือกจะมีส่วนร่วม',
  example: 'ตัวอย่างพลัง',
  signature: 'มุกหลัก',
  heavyMode: 'โหมดเรื่องหนัก',
  ending: 'ตอนจบช่วง',
});

function listLine(label, value) {
  const items = Array.isArray(value) ? value.filter(Boolean) : [];
  return items.length ? `${label}: ${items.join(' · ')}` : '';
}

export function sauceBlock(sauce) {
  const lines = [];
  for (const [key, label] of Object.entries(SAUCE_LABELS)) {
    if (sauce?.[key] && !Array.isArray(sauce[key])) lines.push(`${label}: ${sauce[key]}`);
  }
  /* ตัวเลขทำงานได้ดีกว่าคำบรรยาย: "อบอุ่น 5 ตลก 3 กดดัน 1" สั่งเสียงได้คมกว่า
     ประโยคว่า "อบอุ่นเป็นกันเอง" และเป็นสิ่งที่ทำให้แต่ละตัวไม่กลืนกัน */
  const axes = Object.entries(sauce?.voiceVector || {})
    .filter(([axis]) => AXIS_LABELS[axis])
    .map(([axis, value]) => `${AXIS_LABELS[axis]} ${value}`);
  if (axes.length) lines.push(`เวกเตอร์เสียง (0–5): ${axes.join(' · ')}`);
  for (const [key, label] of Object.entries(SPEECH_LABELS)) {
    const line = listLine(label, sauce?.speech?.[key]);
    if (line) lines.push(line);
  }
  for (const key of ['watches', 'ignores']) {
    const line = listLine(SAUCE_LABELS[key], sauce?.[key]);
    if (line) lines.push(line);
  }
  for (const note of sauce?.notes || []) lines.push(note);
  if (sauce?.provisional) {
    lines.push('ใช้บุคลิกนี้เป็นน้ำเสียงเท่านั้น เนื้อหาต้องมาจากสิ่งที่เกิดขึ้นจริงใน เรื่องในสมุด');
  }
  return lines.join('\n');
}

export function buildPrompt({
  sauce, party, context, hour, trigger = 'scheduled', knowledge = '', transcript = '',
}) {
  const roster = context.members.length
    ? context.members.map(m => {
        const role = m.role === 'lead' ? ' (หัวตี้)' : '';
        const today = Number(m.postsToday || 0);
        return `- ${m.alias}${role} · วันนี้มี message/commit ${today} รายการ`;
      }).join('\n')
    : '- (ยังไม่มีคนในสมุด)';

  return [
    `คุณคือ ${sauce.emoji} ${sauce.nameTh} — เพื่อนร่วมทางประจำสมุดเล่มนี้`,
    'TeamBook คือสมุดกลุ่มมีชีวิต คนกลุ่มเล็กออกไปใช้ชีวิตจริง แล้วกลับมาลงชื่อ เขียนสั้น ๆ และกดเห็นแล้วให้กันในสมุดเล่มเดียวกัน',
    '',
    '## สมุดนี้',
    `ชื่อ: ${party.name || '(ไม่มีชื่อ)'}`,
    `กิจกรรม: ${party.activity || '(ยังไม่ระบุ)'}`,
    `วันนี้ลงชื่อได้เมื่อ: ${party.commit_rule || '(ยังไม่ได้ตั้ง — ห้ามตั้งให้เอง)'}`,
    `คนในสมุด ${context.members.length} คน:`,
    roster,
    `รอบเวลา ${String(hour).padStart(2, '0')}:27 น. เวลาไทย · วันนี้ ลงชื่อ ${context.committed}/${context.members.length}`,
    '',
    transcript,
    '',
    thinkingOrder(),
    '',
    behaviourMenu(),
    '',
    decisionRules(trigger),
    '',
    presencePolicyPrompt({ context, hour, trigger }),
    '',
    groundingRules({ hasKnowledgePack: !!knowledge }),
    pronounRule(sauce),
    knowledge ? `\n${knowledge}` : '',
    '',
    `## เสียงของคุณ — ใช้หลังเลือก behavior และเขียน intent แล้วเท่านั้น`,
    sauceBlock(sauce),
    '',
    outputContract(),
  ].filter(line => line !== null).join('\n');
}
