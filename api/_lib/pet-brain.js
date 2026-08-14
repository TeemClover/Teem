/* ═══════════════════════════════════════════════════════════════
   XTY — the part of the pet that actually reads the chat

   Four times a day (00 · 06 · 12 · 18 ICT) the cron hands this module
   whatever the party said since the pet last woke, plus the pet's own
   last few lines. It returns 0–3 short bubbles.

   Zero is a normal, frequent, correct answer.

   Everything the model is allowed to know comes from the party's own
   log — there is no memory, no profile, no health data, no browsing.
   The party's stored commit rule is passed through verbatim so the pet
   can refer to it without inventing one.
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import { PET_PERSONAS, SHARED_RULES } from './pet-personas.js';

const MODEL = 'claude-opus-5';
const MAX_BUBBLES = 3;
const MAX_BUBBLE_CHARS = 160;
const ICT_OFFSET_MINUTES = 7 * 60;

/* The pet only speaks when the party turned it on AND a key exists.
   Both are deliberate: shipping the code must not start the behaviour. */
export function aiConfigured() {
  return process.env.XTY_PET_AI === 'on' && !!process.env.ANTHROPIC_API_KEY;
}

export function hasPersona(petId) {
  return Object.prototype.hasOwnProperty.call(PET_PERSONAS, petId);
}

let client;
function anthropic() {
  /* One client per warm lambda; the SDK reads ANTHROPIC_API_KEY itself */
  if (!client) client = new Anthropic({ timeout: 30000, maxRetries: 1 });
  return client;
}

function ictClock(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function ictStamp(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${date.toISOString().slice(5, 10)} ${ictClock(value)}`;
}

/* ---------- prompt ---------- */

function systemPrompt(petId, party, context, hour) {
  const persona = PET_PERSONAS[petId];
  const roster = context.members.length
    ? context.members.map(m => `- ${m.alias}${m.role === 'lead' ? ' (หัวตี้)' : ''}`).join('\n')
    : '- (ยังไม่มีสมาชิก)';

  return `คุณคือ ${persona.emoji} ${persona.nameTh} — สัตว์ประจำตี้ในแอป XTY
XTY คือแอปที่คนกลุ่มเล็ก 2–5 คนตั้งตี้กันเพื่อไปทำอะไรสักอย่างในชีวิตจริง
แล้วกลับมากด Commit เมื่อทำแล้ว คุณอ่านสิ่งที่เกิดขึ้นในตี้วันละ 4 รอบ
(00 · 06 · 12 · 18 น. เวลาไทย) แล้วเลือกว่าจะพูดหรือไม่พูด

${persona.block}

## ตี้ที่คุณอยู่
ชื่อตี้: ${party.name || '(ไม่มีชื่อ)'}
กิจกรรม: ${party.activity || '(ยังไม่ระบุ)'}
กติกาว่าแบบไหนนับว่า Commit: ${party.commit_rule || '(ตี้ยังไม่ได้ตั้งกติกา — ห้ามตั้งให้เอง)'}
สมาชิก ${context.members.length} คน:
${roster}

## รอบนี้
เวลา ${String(hour).padStart(2, '0')}:00 น. (เวลาไทย)
วันนี้มีคน Commit แล้ว ${context.committed} จาก ${context.members.length} คน

${SHARED_RULES}`;
}

function transcript(log, ownRecent, since, quietCheckin) {
  const lines = [];

  if (ownRecent.length) {
    lines.push('## สิ่งที่คุณพูดไปก่อนหน้านี้ (ห้ามพูดซ้ำ)');
    for (const post of ownRecent) lines.push(`[${ictStamp(post.sent_at)}] ${post.body}`);
    lines.push('');
  }

  if (quietCheckin) {
    /* Nothing has happened for a full day. The slice reaches back to the
       last real activity so the pet can refer to it instead of guessing. */
    lines.push('## ตี้นี้เงียบมาเกินหนึ่งวันแล้ว');
    lines.push(`ข้างล่างคือสิ่งสุดท้ายที่เกิดขึ้น (${ictStamp(since)}) หลังจากนั้นไม่มีใครพูดอีกเลย`);
    lines.push('รอบนี้คุณทักได้ครั้งเดียว แล้วจะไม่ทักอีกจนกว่าจะมีคนกลับมา — หรือจะเงียบก็ได้');
  } else {
    lines.push(`## สิ่งที่เกิดขึ้นในตี้ตั้งแต่รอบที่แล้ว (${ictStamp(since)} เป็นต้นมา)`);
  }

  if (!log.length) {
    lines.push('(ไม่มีความเคลื่อนไหวเลยตั้งแต่รอบที่แล้ว)');
  } else {
    for (const post of log) {
      const who = post.alias || 'ใครสักคน';
      const stamp = `[${ictClock(post.sent_at)}]`;
      if (post.kind === 'pet') {
        lines.push(`${stamp} ${who || 'คุณ'} (คุณเอง): ${post.body}`);
      } else if (post.retracted) {
        lines.push(`${stamp} ${who} ถอนข้อความออกไป`);
      } else if (post.kind === 'commit') {
        const note = post.body && post.body !== '✓' ? ` — ${post.body}` : '';
        lines.push(`${stamp} ${who} · COMMIT${note}`);
      } else {
        lines.push(`${stamp} ${who}: ${post.body}`);
      }
      if (post.reactions) lines.push(`         (รีแอค: ${post.reactions})`);
    }
  }

  lines.push('');
  lines.push('อ่านแล้วตัดสินใจ: จะพูดอะไรไหม หรือ QUIET');
  return lines.join('\n');
}

/* ---------- output guards ---------- */

/* A net under the prompt, not the policy itself. Any hit drops the whole
   turn — a pet that was about to say one of these has already lost the
   thread, so the safe move is silence rather than partial output.
   Thai has no word boundaries, so only distinctive strings live here;
   short syllables that appear inside ordinary words are left out. */
const FORBIDDEN = [
  'อ้วน', 'ผอม', 'น้ำหนัก', 'พุง', 'หุ่น', 'ลดความอ้วน',
  'โรค', 'พิการ', 'ซึมเศร้า', 'ฆ่าตัวตาย', 'ทำร้ายตัวเอง',
  'เชื้อชาติ', 'ศาสนา', 'เกย์', 'ตุ๊ด', 'กะเทย',
  'ขี้เกียจ', 'ไร้ค่า', 'น่าสมเพช', 'สมน้ำหน้า', 'โง่', 'งี่เง่า',
  'fat', 'obese', 'lazy', 'loser', 'stupid', 'pathetic',
];

export function sanitize(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  if (/^quiet$/i.test(text)) return [];

  const bubbles = [];
  for (const line of text.split('\n')) {
    const cleaned = line
      .replace(/[\u0000-\u001F\u007F]/g, '')
      /* strip list markers and wrapping quotes the model may add */
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
      .replace(/^["“”'`]+|["“”'`]+$/g, '')
      .trim();
    if (!cleaned) continue;
    if (/^quiet$/i.test(cleaned)) continue;
    bubbles.push(cleaned.slice(0, MAX_BUBBLE_CHARS));
    if (bubbles.length === MAX_BUBBLES) break;
  }

  const joined = bubbles.join(' ').toLowerCase();
  if (FORBIDDEN.some(term => joined.includes(term))) return [];
  return bubbles;
}

/* ---------- the call ---------- */

/**
 * @returns {Promise<string[]|null>} bubbles to post, [] to stay quiet,
 *   or null when the AI path is unavailable and the caller should fall
 *   back to its fixed templates.
 */
export async function readAndRespond({ party, context, log, ownRecent, since, hour, quietCheckin = false }) {
  if (!aiConfigured() || !hasPersona(party.pet_id)) return null;

  let response;
  try {
    response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      /* Deciding whether to speak is a small judgement call, not a
         reasoning problem — low effort keeps the four daily wakes cheap */
      output_config: { effort: 'low' },
      system: systemPrompt(party.pet_id, party, context, hour),
      messages: [{ role: 'user', content: transcript(log, ownRecent, since, quietCheckin) }],
    });
  } catch (error) {
    console.error('XTY pet brain call failed', party.code, error?.status || error?.name || error);
    return null;
  }

  if (response.stop_reason === 'refusal') return [];

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
  return sanitize(text);
}
