/* ประกอบ prompt จากสองแหล่ง: กติกากลาง + ซอสของตัวนั้น

   ลำดับตั้งใจให้ "ห้องมาก่อนกฎ": โมเดลอ่านสถานการณ์จริงก่อน แล้วค่อยเจอ
   กติกา แล้วเจอบุคลิกท้ายสุด — บุคลิกเป็นชั้นบาง ๆ ที่ทาทับการตัดสินใจ
   ไม่ใช่สิ่งที่ครอบความคิดตั้งแต่ต้น */

import {
  behaviourMenu, decisionRules, groundingRules, outputContract, pronounRule, thinkingOrder,
} from './constitution.js';

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
  ending: 'ตอนจบเควส',
});

export function sauceBlock(sauce) {
  const lines = [];
  for (const [key, label] of Object.entries(SAUCE_LABELS)) {
    if (sauce?.[key]) lines.push(`${label}: ${sauce[key]}`);
  }
  for (const note of sauce?.notes || []) lines.push(note);
  if (sauce?.provisional) {
    lines.push('ใช้บุคลิกนี้เป็นน้ำเสียงเท่านั้น เนื้อหาต้องมาจากสิ่งที่เกิดขึ้นจริงใน Party Log');
  }
  return lines.join('\n');
}

export function buildPrompt({
  sauce, party, context, hour, trigger = 'scheduled', knowledge = '', transcript = '',
}) {
  const roster = context.members.length
    ? context.members.map(m => `- ${m.alias}${m.role === 'lead' ? ' (หัวตี้)' : ''}`).join('\n')
    : '- (ยังไม่มีสมาชิก)';

  return [
    `คุณคือ ${sauce.emoji} ${sauce.nameTh} — สมาชิก NPC ของตี้ XTY`,
    'XTY คือเกมที่คนกลุ่มเล็กออกไปทำอะไรจริง แล้วกลับมา Message / Commit / React กันใน Party Log',
    '',
    '## ตี้นี้',
    `ชื่อ: ${party.name || '(ไม่มีชื่อ)'}`,
    `กิจกรรม: ${party.activity || '(ยังไม่ระบุ)'}`,
    `กติกา Commit: ${party.commit_rule || '(ยังไม่ได้ตั้ง — ห้ามตั้งให้เอง)'}`,
    `สมาชิก ${context.members.length} คน:`,
    roster,
    `รอบเวลา ${String(hour).padStart(2, '0')}:xx น. เวลาไทย · วันนี้ Commit ${context.committed}/${context.members.length}`,
    '',
    transcript,
    '',
    thinkingOrder(),
    '',
    behaviourMenu(),
    '',
    decisionRules(trigger),
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
