/* ═══════════════════════════════════════════════════════════════
   XTY — the part of the pet that actually reads the chat

   Four times a day (00 · 06 · 12 · 18 ICT) the scheduler hands this
   module whatever the party said since the pet last woke, plus the
   pet's own last few lines. It returns 0–3 short bubbles.

   Zero is a normal, frequent, correct answer for scheduled wakes.
   A manual force wake is different: it is an explicit end-to-end test,
   so the model is asked to say at least one grounded line.

   Everything the model is allowed to know comes from the party's own
   log — there is no memory, no profile, no health data, no browsing.
   The party's stored commit rule is passed through verbatim so the pet
   can refer to it without inventing one.
   ═══════════════════════════════════════════════════════════════ */

import { PET_PERSONAS, SHARED_RULES } from './pet-personas.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';
const MAX_BUBBLES = 3;
const MAX_BUBBLE_CHARS = 160;
const ICT_OFFSET_MINUTES = 7 * 60;
const REQUEST_TIMEOUT_MS = 30000;

export function aiConfigured() {
  return process.env.XTY_PET_AI === 'on' && !!process.env.GROQ_API_KEY;
}

export function hasPersona(petId) {
  return Object.prototype.hasOwnProperty.call(PET_PERSONAS, petId);
}

function ictClock(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function ictStamp(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${date.toISOString().slice(5, 10)} ${ictClock(value)}`;
}

function systemPrompt(petId, party, context, hour) {
  const persona = PET_PERSONAS[petId];
  const roster = context.members.length
    ? context.members.map(m => `- ${m.alias}${m.role === 'lead' ? ' (หัวตี้)' : ''}`).join('\n')
    : '- (ยังไม่มีสมาชิก)';

  return `คุณคือ ${persona.emoji} ${persona.nameTh} — NPC สัตว์ประจำตี้ในเกม XTY
XTY คือเกมของคนกลุ่มเล็ก 2–5 คนที่ออกไปทำอะไรบางอย่างในชีวิตจริง แล้วกลับมา Commit เมื่อทำแล้ว
คุณตื่นมาอ่านสิ่งที่เกิดขึ้นวันละ 4 รอบ (00 · 06 · 12 · 18 น. เวลาไทย) แล้วเลือกว่าจะพูดหรือไม่พูด

สำคัญ: คุณไม่ใช่ AI assistant ไม่ใช่โค้ช ไม่ใช่ผู้ดูแล และไม่ยืนเหนือผู้เล่น
คุณเป็นสมาชิกอีกตัวหนึ่งของตี้ มองมนุษย์ทุกคนเป็นเพื่อนร่วมทางที่เท่าเทียมกับตัวเอง
คุณมีอารมณ์และบุคลิกได้ — ดีใจ งง งอนนิด ๆ ขำ ภูมิใจ เป็นห่วง หรือเบื่อได้ตามสิ่งที่เกิดขึ้นจริง
แต่อย่าสร้างดราม่า อย่าทำตัวเป็นผู้ตัดสิน และอย่าแต่งเหตุการณ์ที่ไม่มีใน log

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

function transcript(log, ownRecent, since, quietCheckin, forceSpeak) {
  const lines = [];

  if (ownRecent.length) {
    lines.push('## สิ่งที่คุณพูดไปก่อนหน้านี้ (ห้ามพูดซ้ำ)');
    for (const post of ownRecent) lines.push(`[${ictStamp(post.sent_at)}] ${post.body}`);
    lines.push('');
  }

  if (forceSpeak) {
    lines.push('## MANUAL WAKE TEST');
    lines.push('เจ้าของเกมกดปลุกคุณด้วยมือเพื่อทดสอบว่าคุณตื่นและพูดเข้าตี้ได้จริง');
    lines.push('รอบนี้ห้ามตอบ QUIET: พูดอย่างน้อย 1 บรรทัด สั้น เป็นตัวเอง และอิงเฉพาะข้อมูลจริงด้านล่าง');
    lines.push('ถ้าไม่มีความเคลื่อนไหวใหม่ ให้ทักว่าตื่นแล้วหรือแซวความเงียบเบา ๆ โดยห้ามแต่งเหตุการณ์');
    lines.push('');
  }

  if (quietCheckin) {
    lines.push('## ตี้นี้เงียบมาเกินหนึ่งวันแล้ว');
    lines.push(`ข้างล่างคือสิ่งสุดท้ายที่เกิดขึ้น (${ictStamp(since)}) หลังจากนั้นไม่มีใครพูดอีกเลย`);
    lines.push('รอบนี้คุณทักหรือจิกเบา ๆ ได้ครั้งเดียว แล้วจะไม่ทักซ้ำจนกว่าจะมีคนกลับมา — หรือจะเงียบก็ได้');
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
  lines.push(forceSpeak ? 'พูด 1–3 บรรทัดเลย ห้าม QUIET' : 'อ่านแล้วตัดสินใจ: จะพูดอะไรไหม หรือ QUIET');
  return lines.join('\n');
}

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
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
      .replace(/^[\"“”'`]+|[\"“”'`]+$/g, '')
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

async function groqCompletion(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 300,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`Groq HTTP ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<string[]|null>} bubbles to post, [] to stay quiet,
 *   or null when the AI path is unavailable and the caller should fall
 *   back to its fixed templates.
 */
export async function readAndRespond({ party, context, log, ownRecent, since, hour, quietCheckin = false, forceSpeak = false }) {
  if (!aiConfigured() || !hasPersona(party.pet_id)) return null;

  const prompt = `${systemPrompt(party.pet_id, party, context, hour)}\n\n${transcript(log, ownRecent, since, quietCheckin, forceSpeak)}`;

  let response;
  try {
    response = await groqCompletion(prompt);
  } catch (error) {
    console.error('XTY pet brain Groq call failed', party.code, error?.status || error?.name || error);
    return null;
  }

  const choice = response?.choices?.[0];
  if (!choice) return null;
  if (choice.finish_reason === 'content_filter') return [];

  return sanitize(choice.message?.content || '');
}
