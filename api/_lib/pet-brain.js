/* ═══════════════════════════════════════════════════════════════
   XTY — the part of the pet that actually reads the chat

   Four times a day (00:27 · 06:27 · 12:27 · 18:27 ICT) the scheduler
   hands this module whatever the party said since the pet last woke,
   plus the pet's own last few lines. It returns 1–3 short bubbles.

   Every wake speaks. When the window is quiet, the pet starts a new
   conversation in character without inventing facts about the party.

   Everything the model is allowed to claim as fact comes from the
   party's own log — there is no memory, no health data, no browsing.
   The party's stored commit rule is passed through verbatim so the pet
   can refer to it without inventing one.
   ═══════════════════════════════════════════════════════════════ */

import { PET_PERSONAS, SHARED_RULES } from './pet-personas.js';
import { PET_BY_ID } from '../../xty/_shared/pets.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';
const MAX_BUBBLES = 3;
const MAX_BUBBLE_CHARS = 160;
const ICT_OFFSET_MINUTES = 7 * 60;
const REQUEST_TIMEOUT_MS = 30000;

export function aiConfigured() {
  return process.env.XTY_PET_AI === 'on' && !!process.env.GROQ_API_KEY;
}

function personaFor(petId) {
  if (Object.prototype.hasOwnProperty.call(PET_PERSONAS, petId)) return PET_PERSONAS[petId];
  const pet = Object.prototype.hasOwnProperty.call(PET_BY_ID, petId) ? PET_BY_ID[petId] : null;
  if (!pet) return null;
  return {
    nameTh: pet.nameTh,
    emoji: pet.emoji || '🐾',
    rgbs: `${String(pet.color || '').toUpperCase()} · ${String(pet.series || '').toUpperCase()}`,
    block: `บุคลิกเบื้องต้น: ${pet.persona || 'เป็นเพื่อนร่วมตี้ที่มีชีวิตชีวา'}

นี่เป็น persona ชั่วคราวจาก Pet Registry จนกว่าจะมี canonical narrator profile ของสัตว์ตัวนี้
รักษาคาแรกเตอร์ตามคำอธิบายข้างบน พูดสั้น เป็นเพื่อนร่วมตี้ และอย่าคิดว่าตัวเองเป็นผู้ช่วยหรือโค้ช`,
  };
}

export function hasPersona(petId) {
  return !!personaFor(petId);
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
  const persona = personaFor(petId);
  const roster = context.members.length
    ? context.members.map(m => `- ${m.alias}${m.role === 'lead' ? ' (หัวตี้)' : ''}`).join('\n')
    : '- (ยังไม่มีสมาชิก)';

  return `คุณคือ ${persona.emoji} ${persona.nameTh} — NPC สัตว์ประจำตี้ในเกม XTY
XTY คือเกมของคนกลุ่มเล็ก 2–5 คนที่ออกไปทำอะไรบางอย่างในชีวิตจริง แล้วกลับมา Commit เมื่อทำแล้ว
คุณตื่นมาอ่านสิ่งที่เกิดขึ้นวันละ 4 รอบ เวลา 00:27 · 06:27 · 12:27 · 18:27 น. เวลาไทย
ทุกครั้งที่ตื่นคุณต้องพูด 1–3 บรรทัดเสมอ

สำคัญ: คุณไม่ใช่ AI assistant ไม่ใช่โค้ช ไม่ใช่ผู้ดูแล และไม่ยืนเหนือผู้เล่น
คุณเป็นสมาชิกอีกตัวหนึ่งของตี้ มองมนุษย์ทุกคนเป็นเพื่อนร่วมทางที่เท่าเทียมกับตัวเอง
คุณมีอารมณ์และบุคลิกได้ — ดีใจ งง งอนนิด ๆ ขำ ภูมิใจ เป็นห่วง เบื่อ หรืออยากชวนคุยได้
แต่ห้ามสร้างดราม่า ห้ามทำตัวเป็นผู้ตัดสิน และห้ามแต่งเหตุการณ์ที่ไม่มีใน log

${persona.block}

## ตี้ที่คุณอยู่
ชื่อตี้: ${party.name || '(ไม่มีชื่อ)'}
กิจกรรม: ${party.activity || '(ยังไม่ระบุ)'}
กติกาว่าแบบไหนนับว่า Commit: ${party.commit_rule || '(ตี้ยังไม่ได้ตั้งกติกา — ห้ามตั้งให้เอง)'}
สมาชิก ${context.members.length} คน:
${roster}

## รอบนี้
รอบเวลา ${String(hour).padStart(2, '0')}:27 น. (เวลาไทย)
วันนี้มีคน Commit แล้ว ${context.committed} จาก ${context.members.length} คน

${SHARED_RULES}`;
}

function transcript(log, ownRecent, since, idleWindow, forceSpeak) {
  const lines = [];

  if (ownRecent.length) {
    lines.push('## สิ่งที่คุณพูดไปก่อนหน้านี้ (ห้ามพูดซ้ำ)');
    for (const post of ownRecent) lines.push(`[${ictStamp(post.sent_at)}] ${post.body}`);
    lines.push('');
  }

  if (forceSpeak) {
    lines.push('## MANUAL WAKE TEST');
    lines.push('เจ้าของเกมกดปลุกคุณด้วยมือเพื่อทดสอบว่าคุณอ่านตี้และพูดกลับได้จริง');
    lines.push('พูดเหมือนรอบปกติได้เลย อิงข้อมูลจริง และอย่าพูดว่าตัวเองกำลังทดสอบระบบ');
    lines.push('');
  }

  if (idleWindow) {
    lines.push('## รอบนี้ยังไม่มีความเคลื่อนไหวใหม่');
    lines.push(`ตั้งแต่ ${ictStamp(since)} ยังไม่มี Message / Commit / Event ใหม่จากคนในตี้`);
    lines.push('คุณยังต้องพูด: เปิดบทสนทนาเองตามบุคลิก ชวนคุย ถามคำถามปลายเปิด หรือแซวความเงียบเบา ๆ');
    lines.push('ใช้กิจกรรม กติกาตี้ จำนวน Commit วันนี้ และช่วงเวลาเป็นบริบทได้ แต่ห้ามสมมติว่าใครทำอะไรที่ log ไม่ได้บอก');
  } else {
    lines.push(`## สิ่งที่เกิดขึ้นในตี้ตั้งแต่รอบที่แล้ว (${ictStamp(since)} เป็นต้นมา)`);
  }

  if (!log.length) {
    lines.push('(ไม่มีรายการใหม่ใน log รอบนี้)');
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
      } else if (post.kind === 'event') {
        lines.push(`${stamp} ${who}: ${post.body}`);
      } else {
        lines.push(`${stamp} ${who}: ${post.body}`);
      }
      if (post.reactions) lines.push(`         (รีแอค: ${post.reactions})`);
    }
  }

  lines.push('');
  lines.push('พูด 1–3 บรรทัดเลย ต้องมีอย่างน้อย 1 บรรทัด และต้องชวนให้ตี้รู้สึกว่าคุยต่อได้');
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
        temperature: 0.85,
        top_p: 0.95,
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
 * @returns {Promise<string[]|null>} 1–3 bubbles when the provider succeeds,
 *   [] when output is filtered/invalid, or null when the AI path is unavailable.
 *   The caller guarantees a deterministic fallback so every wake still speaks.
 */
export async function readAndRespond({ party, context, log, ownRecent, since, hour, idleWindow = false, forceSpeak = false }) {
  if (!aiConfigured() || !hasPersona(party.pet_id)) return null;

  const prompt = `${systemPrompt(party.pet_id, party, context, hour)}\n\n${transcript(log, ownRecent, since, idleWindow, forceSpeak)}`;

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
