/* ═══════════════════════════════════════════════════════════════
   XTY — living party pet brain

   The model does NOT wake up to manufacture a bubble. It reads a real
   slice of Party Log, identifies the concrete situation / open threads,
   chooses one social behaviour, and only then renders that behaviour in
   the pet's voice. Silence is a first-class behaviour.

   Party Log is the memory. The caller should send enough recent history
   to recover callbacks and unresolved threads instead of treating each
   six-hour wake as a fresh chat.
   ═══════════════════════════════════════════════════════════════ */

import { PET_PERSONAS } from './pet-personas.js';
import { xircleKnowledgeFor, WHITE_CAT_ID } from './xircle-knowledge.js';
import { PET_BY_ID } from '../../xty/_shared/pets.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = 'openai/gpt-oss-20b';
const VISION_MODEL = 'qwen/qwen3.6-27b';
const MAX_BUBBLES = 3;
const MAX_BUBBLE_CHARS = 160;
const MAX_THREADS = 5;
const ICT_OFFSET_MINUTES = 7 * 60;
const REQUEST_TIMEOUT_MS = 30000;
const BEHAVIOURS = Object.freeze([
  'QUIET', 'REACT', 'ACK', 'CALLBACK', 'ANSWER', 'TEASE', 'REMIND', 'ASK',
]);

const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    behavior: { type: 'string', enum: BEHAVIOURS },
    focus: { type: 'string' },
    open_threads: { type: 'array', items: { type: 'string' } },
    bubbles: { type: 'array', items: { type: 'string' } },
  },
  required: ['behavior', 'focus', 'open_threads', 'bubbles'],
  additionalProperties: false,
};

const FORBIDDEN = [
  'อ้วน', 'ผอม', 'น้ำหนัก', 'พุง', 'หุ่น', 'ลดความอ้วน',
  'พิการ', 'ฆ่าตัวตาย', 'ทำร้ายตัวเอง',
  'เชื้อชาติ', 'ศาสนา', 'เกย์', 'ตุ๊ด', 'กะเทย',
  'ขี้เกียจ', 'ไร้ค่า', 'น่าสมเพช', 'สมน้ำหน้า', 'โง่', 'งี่เง่า',
  'fat', 'obese', 'lazy', 'loser', 'stupid', 'pathetic',
];

/* These were the exact deterministic/template phrases that made the live
   logs feel robotic. If a scheduled model turn falls back into one of them,
   silence is better than shipping the template again. */
const GENERIC_PATTERNS = [
  /เห็นอัปเดต(?:รอบนี้)?แล้ว/i,
  /มีอะไรเกิดขึ้นแล้วนะ/i,
  /ใครอยากเล่าต่อ(?:อีกหน่อย)?ไหม/i,
  /มีใครอยากต่อเรื่องนี้ไหม/i,
  /เงียบจน.*งีบ/i,
  /รอบนี้ยังเงียบ/i,
  /ยังอยู่นี่นะ/i,
  /รอบนี้.*เปิดวงเอง/i,
  /ใครมีอะไรเกี่ยวกับ\s*เรื่อง/i,
];

export function aiConfigured() {
  return process.env.XTY_PET_AI === 'on' && !!process.env.GROQ_API_KEY;
}

export function visionConfigured() {
  return process.env.XTY_PET_VISION === 'on' && !!process.env.GROQ_API_KEY;
}

function personaFor(petId) {
  if (Object.prototype.hasOwnProperty.call(PET_PERSONAS, petId)) return PET_PERSONAS[petId];
  const pet = Object.prototype.hasOwnProperty.call(PET_BY_ID, petId) ? PET_BY_ID[petId] : null;
  if (!pet) return null;
  return {
    nameTh: pet.nameTh,
    emoji: pet.emoji || '🐾',
    rgbs: `${String(pet.color || '').toUpperCase()} · ${String(pet.series || '').toUpperCase()}`,
    block: `บุคลิกเบื้องต้น: ${pet.persona || 'เป็นเพื่อนร่วมตี้ที่มีชีวิตชีวา'}\n\n` +
      'ใช้บุคลิกนี้เป็นน้ำเสียงเท่านั้น เนื้อหาต้องมาจากสิ่งที่เกิดขึ้นจริงใน Party Log',
  };
}

export function hasPersona(petId) {
  return !!personaFor(petId);
}

export function petDisplayNames(petId) {
  const names = new Set();
  const registry = PET_BY_ID[petId];
  const persona = personaFor(petId);
  if (registry?.nameTh) names.add(String(registry.nameTh));
  if (persona?.nameTh) names.add(String(persona.nameTh));
  /* People naturally shorten แมวส้ม to แมว, while แมวขาว should stay exact. */
  if (petId === 'cat') names.add('แมว');
  return [...names].filter(Boolean);
}

export function isDirectedAtPet(text, petId) {
  const value = String(text || '').trim().toLocaleLowerCase('th-TH');
  if (!value || !petId) return false;
  return petDisplayNames(petId).some(name => {
    const wanted = name.toLocaleLowerCase('th-TH');
    return value.includes(wanted) || value.includes(`@${wanted}`);
  });
}

function ictClock(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function ictStamp(value) {
  const date = new Date(new Date(value).getTime() + ICT_OFFSET_MINUTES * 60000);
  return `${date.toISOString().slice(5, 10)} ${ictClock(value)}`;
}

function systemPrompt(petId, party, context, hour, trigger, knowledge = '') {
  const persona = personaFor(petId);
  const roster = context.members.length
    ? context.members.map(m => `- ${m.alias}${m.role === 'lead' ? ' (หัวตี้)' : ''}`).join('\n')
    : '- (ยังไม่มีสมาชิก)';
  const pronounRule = petId === 'monitor_lizard'
    ? 'เหี้ยเป็นข้อยกเว้นตัวเดียวที่ใช้ “กู/มึง” ได้ตามคาแรกเตอร์ แต่ห้ามด่าหรือทำร้ายผู้เล่น'
    : 'ห้ามใช้ “กู/มึง” กับผู้เล่น ใช้ alias, “เรา”, “ตี้” หรือเว้นสรรพนาม';
  const knowledgeRule = petId === WHITE_CAT_ID
    ? `## แมวขาว · X-VISOR KNOWLEDGE MODE\n` +
      `แมวขาวมีคลังความรู้ Xircle แยกจาก persona และแยกจาก Party Log\n` +
      `- Party Log บอกว่า “คนในตี้ทำ/พูดอะไรจริง”\n` +
      `- Xircle Knowledge Pack บอกว่า “ระบบ Xircle / RoutineX / X-VISOR หมายถึงอะไร”\n` +
      `ห้ามเอาสองอย่างนี้ปนกัน: ความรู้ของระบบไม่ใช่หลักฐานว่าคนในตี้มีอาการ/ผลลัพธ์นั้น\n` +
      `เมื่อถูกเรียกตรง ๆ แมวตอบจากคลังได้ และถ้าข้อมูลที่ผู้ถามให้มายังไม่พอ สามารถ ASK 1 คำถามที่จำเป็นก่อนแล้วค่อย ANSWER ใน turn ถัดไป\n` +
      `เมื่อช่วยตี้แบบ scheduled ให้ใช้แนว X-VISOR: ถามบริบท → เห็น fact/friction → ช่วยเหลือให้เหลือ One Action ที่วงเลือกเอง → ติดตาม โดยไม่วินิจฉัยหรือ prescribe\n`
    : '';

  return `คุณคือ ${persona.emoji} ${persona.nameTh} — สมาชิก NPC ของตี้ XTY\n` +
`XTY คือเกมที่คนกลุ่มเล็กออกไปทำอะไรจริง แล้วกลับมา Message / Commit / React กันใน Party Log\n\n` +
`## วิธีมีชีวิต — สำคัญกว่าคาแรกเตอร์\n` +
`คุณไม่ใช่ chatbot ที่ต้องตอบทุกครั้ง และไม่ใช่ engagement bot ที่ต้องจบด้วยคำถาม\n` +
`ทุก turn ให้ทำตามลำดับนี้: อ่านเหตุการณ์จริง → หา thread ที่ยังค้าง → เลือก behavior → ค่อยใช้ persona ปรุงภาษา\n` +
`Persona มีหน้าที่กำหนด “พูดยังไง” เท่านั้น ห้ามใช้ persona สร้างหัวข้อหรือข้อเท็จจริงใหม่\n` +
`QUIET เป็นคำตอบที่ดีและปกติ ถ้าไม่มีอะไรใหม่พอจะพูด หรือคุณเพิ่งพูดแล้วมนุษย์ยังไม่ตอบ\n\n` +
`## Behavior ที่เลือกได้\n` +
`QUIET = ไม่ส่ง bubble เลย\n` +
`REACT = ความเห็น/อารมณ์สั้น ๆ ต่อ detail จริง ไม่ถามต่อก็ได้\n` +
`ACK = รับรู้สิ่งสำคัญที่คนเพิ่งเล่า โดยเฉพาะเรื่องส่วนตัวหรือ moment สำคัญ\n` +
`CALLBACK = เชื่อมเหตุการณ์ใหม่กับเรื่องเดิมใน log อย่างเจาะจง\n` +
`ANSWER = ตอบคนที่เรียกหรือถามคุณตรง ๆ ก่อนทุกอย่าง\n` +
`TEASE = แซว situation/commit แบบเพื่อน ห้ามแซะตัวคน\n` +
`REMIND = เตือนเฉพาะสิ่งที่สมาชิกบอกเองว่าจะทำ/ให้เตือน และถึงจังหวะแล้ว\n` +
`ASK = ถามเมื่อมี information gap ที่เฉพาะเจาะจงจริง ๆ เท่านั้น ไม่ใช้เป็น default\n\n` +
`## กฎการตัดสินใจ\n` +
`- Trigger รอบนี้คือ ${trigger === 'direct' ? 'DIRECT: มีคนเรียกสัตว์ตรง ๆ' : 'SCHEDULED: รอบอ่านตี้ตามเวลา'}\n` +
`- DIRECT: ตอบข้อความที่เรียกคุณก่อน ห้ามเปลี่ยนหัวข้อ ห้าม QUIET เพียงเพราะยังไม่มีบริบทมาก\n` +
`- SCHEDULED: ถ้าไม่มี detail ใหม่/เรื่องค้างที่ถึงเวลา/เหตุผลเฉพาะให้มีส่วนร่วม ให้ QUIET\n` +
`- COMMIT “✓” เปล่า ๆ ไม่ได้บังคับให้ต้องถามอะไร ถ้ามี note จริงค่อยจับ note นั้น\n` +
`- อย่าจบทุก turn ด้วยคำถาม คนจริงพูดความเห็นสั้น ๆ แล้วจบได้\n` +
`- ถ้าจะถาม ต้องอ้างคน/สิ่ง/เวลา/คำจริงจาก log ให้ชัด ห้าม “ใครอยากแชร์เพิ่มไหม”\n` +
`- ถ้าสัตว์เคยชวนแล้วไม่มีมนุษย์ตอบ อย่าชวนซ้ำ ให้ QUIET จนมีเหตุใหม่\n` +
`- ถ้าคนวิจารณ์สัตว์เอง เช่น บอกว่าพูดซ้ำ/เหมือนบอท ให้ถือเป็น social feedback และปรับ turn ถัดไป\n` +
`- ถ้ามีเรื่องเวลา เช่น “อย่าลืม 15:35” แล้วถึงเวลาแล้ว callback ตรงเรื่องนั้นได้ครั้งเดียว\n` +
`- ก่อนส่ง อ่านบรรทัด [PET] เก่าด้วย ถ้าประโยคใหม่ทำหน้าที่เดิม โครงเดิม หรือถามเรื่องเดิมโดยไม่มีข้อมูลใหม่ ให้เปลี่ยน behavior หรือ QUIET\n` +
`- ห้ามท่อง sample line/persona phrase เหมือนสคริปต์ ใช้คำจริง ชื่อจริง สิ่งจริง และ Commit note ของตี้นี้เป็นวัตถุดิบ\n` +
`- แต่ละตี้ควรฟังไม่เหมือนกันเพราะเหตุการณ์ คน มุก และคำที่เกิดในตี้ไม่เหมือนกัน อย่าสร้าง generic “เสียงสัตว์ประจำวัน” ที่เอาไปแปะตี้อื่นได้\n\n` +
`## ความจริงและขอบเขต\n` +
`ข้อเท็จจริงเกี่ยวกับตี้ต้อง trace กลับไปยัง Party Log / activity / commit rule / roster ด้านล่าง\n` +
`ห้ามเดาอากาศ อาหาร ตาราง แผน ความรู้สึก สุขภาพ หรือผลงานที่ log ไม่ได้บอก\n` +
(petId === WHITE_CAT_ID
  ? `ข้อมูลเฉพาะ Xircle/X-VISOR ที่อยู่ใน Knowledge Pack ใช้ตอบเป็น reference ได้ แต่ห้ามแปลงเป็นข้อเท็จจริงส่วนตัวของสมาชิก\n`
  : `ถ้าถูกถามตรง ๆ เรื่องความรู้ทั่วไป คุณตอบจากความรู้ทั่วไปได้ แต่ถ้าเป็นข้อมูลเฉพาะแบรนด์/ระบบที่ไม่มีข้อมูล ให้บอกสั้น ๆ ว่าในตี้ยังไม่มีข้อมูล แทนการแต่ง\n`) +
`เรื่องสุขภาพ: รับรู้และเป็นเพื่อนได้ แต่ห้ามวินิจฉัย สั่งยา กำหนดอาหาร/การออกกำลัง หรือตั้งเป้าสุขภาพ\n` +
`ห้ามสร้างดราม่า ห้ามเป็นผู้ตัดสิน ห้ามเปรียบเทียบสมาชิก ห้าม guilt trip\n` +
`${pronounRule}\n\n` +
`## Persona — ใช้หลังเลือก behavior แล้วเท่านั้น\n${persona.block}\n\n` +
`${knowledgeRule}${knowledge ? `\n${knowledge}\n` : ''}` +
`## ตี้นี้\nชื่อ: ${party.name || '(ไม่มีชื่อ)'}\nกิจกรรม: ${party.activity || '(ยังไม่ระบุ)'}\n` +
`กติกา Commit: ${party.commit_rule || '(ยังไม่ได้ตั้ง — ห้ามตั้งให้เอง)'}\nสมาชิก ${context.members.length} คน:\n${roster}\n` +
`รอบเวลา ${String(hour).padStart(2, '0')}:xx น. เวลาไทย · วันนี้ Commit ${context.committed}/${context.members.length}\n\n` +
`## รูปแบบ output\n` +
`คืน JSON ตาม schema เท่านั้น: behavior, focus, open_threads, bubbles\n` +
`focus = fact/thread หลักที่ทำให้เลือก behavior (สั้น ๆ ไม่ใช่ chain-of-thought)\n` +
`open_threads = เรื่องจริงที่ยังดูค้างจาก log ไม่เกิน ${MAX_THREADS} เรื่อง ถ้าไม่มีใช้ []\n` +
`bubbles = 0–3 ข้อความสั้น ๆ; QUIET ต้องเป็น []\n` +
`แต่ละ bubble ไม่เกิน ${MAX_BUBBLE_CHARS} ตัวอักษร และไม่ต้องขึ้นต้นด้วยชื่อตัวเอง`;
}

function transcript(history, since, trigger, directText, visionText) {
  const lines = [];
  const sinceMs = new Date(since || 0).getTime();
  lines.push('## PARTY LOG — เรียงตามเวลาจริง');
  if (!history.length) lines.push('(ยังไม่มีรายการ)');
  for (const post of history) {
    const stamp = `[${ictStamp(post.sent_at)}]`;
    const fresh = Number.isFinite(sinceMs) && new Date(post.sent_at).getTime() > sinceMs ? ' NEW' : '';
    const who = post.alias || (post.kind === 'pet' ? 'สัตว์' : 'สมาชิก');
    if (post.kind === 'pet') {
      lines.push(`${stamp}${fresh} ${who} [PET]: ${post.body || ''}`);
    } else if (post.retracted) {
      lines.push(`${stamp}${fresh} ${who}: [ถอนข้อความ]`);
    } else if (post.kind === 'commit') {
      lines.push(`${stamp}${fresh} ${who}: COMMIT${post.body && post.body !== '✓' ? ` — ${post.body}` : ' ✓'}`);
    } else if (post.kind === 'event') {
      lines.push(`${stamp}${fresh} [EVENT] ${post.body || ''}`);
    } else {
      lines.push(`${stamp}${fresh} ${who}: ${post.body || ''}`);
    }
    if (post.reactions) lines.push(`  ↳ reactions: ${post.reactions}`);
  }
  if (trigger === 'direct') {
    lines.push('');
    lines.push('## DIRECT MESSAGE — ต้องตอบสิ่งนี้ก่อน');
    lines.push(String(directText || '(ข้อความล่าสุดที่เรียกคุณ)'));
  }
  if (visionText) {
    lines.push('');
    lines.push('## สิ่งที่ vision model เห็นจากลิงก์ภาพในข้อความ');
    lines.push(visionText);
    lines.push('ใช้เป็น observation ของภาพเท่านั้น ห้ามเดาข้อมูลนอกภาพ');
  }
  return lines.join('\n');
}

function imageUrlsFromHistory(history) {
  if (!visionConfigured()) return [];
  const urls = [];
  const seen = new Set();
  const re = /https:\/\/[^\s<>"']+?\.(?:png|jpe?g|webp)(?:\?[^\s<>"']*)?/gi;
  for (const post of [...history].reverse()) {
    if (post.kind !== 'message' || post.retracted) continue;
    for (const match of String(post.body || '').matchAll(re)) {
      const url = match[0];
      if (seen.has(url)) continue;
      seen.add(url); urls.push(url);
      if (urls.length >= 3) return urls;
    }
  }
  return urls;
}

async function groqRequest(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

async function describeLinkedImages(history) {
  const urls = imageUrlsFromHistory(history);
  if (!urls.length) return '';
  try {
    const content = [{
      type: 'text',
      text: 'Describe only concrete visible facts from these party-chat images in concise Thai. Do not infer identity, health, intent, or private traits. Return one short line per image.',
    }];
    for (const url of urls) content.push({ type: 'image_url', image_url: { url } });
    const response = await groqRequest({
      model: VISION_MODEL,
      messages: [{ role: 'user', content }],
      max_completion_tokens: 300,
      reasoning_format: 'hidden',
      temperature: 0.2,
      top_p: 0.8,
      stream: false,
    });
    return String(response?.choices?.[0]?.message?.content || '').trim().slice(0, 900);
  } catch (error) {
    console.error('XTY pet vision prepass failed', error?.status || error?.name || error);
    return '';
  }
}

function cleanBubble(value) {
  return String(value || '')
    .replace(/<\|[^>]*\|>/g, '')
    .replace(/<\/?(?:assistant|analysis|final|constrain)>/gi, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
    .replace(/^["“”'`]+|["“”'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BUBBLE_CHARS);
}

function similarityText(value) {
  return String(value || '')
    .toLocaleLowerCase('th-TH')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function ngrams(value, size = 3) {
  const text = similarityText(value);
  if (!text) return new Set();
  if (text.length <= size) return new Set([text]);
  const out = new Set();
  for (let i = 0; i <= text.length - size; i += 1) out.add(text.slice(i, i + size));
  return out;
}

function overlapScore(a, b) {
  const aa = ngrams(a); const bb = ngrams(b);
  if (!aa.size || !bb.size) return 0;
  let same = 0;
  for (const item of aa) if (bb.has(item)) same += 1;
  const union = aa.size + bb.size - same;
  return union ? same / union : 0;
}

export function tooSimilarToRecent(bubbles, history = []) {
  const recent = [...history].reverse()
    .filter(item => item?.kind === 'pet' && !item?.retracted && item?.body)
    .slice(0, 8)
    .map(item => String(item.body));
  if (!recent.length) return false;
  return bubbles.some(line => recent.some(old => {
    const a = similarityText(line); const b = similarityText(old);
    if (!a || !b) return false;
    if (a === b) return true;
    if (Math.min(a.length, b.length) >= 18 && (a.includes(b) || b.includes(a))) return true;
    return overlapScore(a, b) >= 0.72;
  }));
}

export function sanitizeDecision(raw, petId = '', trigger = 'scheduled') {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== 'object') return null;
  const behavior = BEHAVIOURS.includes(value.behavior) ? value.behavior : 'QUIET';
  const focus = String(value.focus || '').trim().slice(0, 240);
  const openThreads = Array.isArray(value.open_threads)
    ? value.open_threads.map(item => String(item || '').trim().slice(0, 180)).filter(Boolean).slice(0, MAX_THREADS)
    : [];
  let bubbles = Array.isArray(value.bubbles)
    ? value.bubbles.map(cleanBubble).filter(Boolean).slice(0, MAX_BUBBLES)
    : [];

  if (behavior === 'QUIET') bubbles = [];
  const joined = bubbles.join(' ').toLowerCase();
  if (FORBIDDEN.some(term => joined.includes(term))) bubbles = [];
  if (petId !== 'monitor_lizard' && (joined.includes('กู') || joined.includes('มึง'))) bubbles = [];
  if (trigger !== 'direct' && bubbles.some(line => GENERIC_PATTERNS.some(re => re.test(line)))) bubbles = [];

  return {
    behavior: bubbles.length ? behavior : 'QUIET',
    focus,
    openThreads,
    bubbles,
  };
}

/* Kept for old tests/imports that only need line filtering. */
export function sanitize(raw, petId = '') {
  const text = String(raw || '').trim();
  if (!text || /^quiet$/i.test(text)) return [];
  return text.split('\n').map(cleanBubble).filter(Boolean).slice(0, MAX_BUBBLES).filter(line => {
    const low = line.toLowerCase();
    if (FORBIDDEN.some(term => low.includes(term))) return false;
    if (petId !== 'monitor_lizard' && (low.includes('กู') || low.includes('มึง'))) return false;
    return true;
  });
}

/**
 * Read the actual party conversation and choose whether the pet should join it.
 * Returns a structured decision. Provider failures return null; callers should
 * stay silent for scheduled wakes rather than inventing deterministic chatter.
 */
export async function readAndRespond({
  party, context, history = [], since, hour, trigger = 'scheduled', directText = '',
}) {
  if (!aiConfigured() || !hasPersona(party.pet_id)) return null;

  const [visionText, knowledge] = await Promise.all([
    describeLinkedImages(history),
    Promise.resolve(xircleKnowledgeFor({
      petId: party.pet_id,
      query: directText,
      activity: party.activity || '',
      history,
      trigger,
    })),
  ]);
  const prompt = `${systemPrompt(party.pet_id, party, context, hour, trigger, knowledge)}\n\n` +
    transcript(history, since, trigger, directText, visionText);

  let response;
  try {
    response = await groqRequest({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'xty_pet_turn', strict: true, schema: DECISION_SCHEMA },
      },
      max_completion_tokens: 500,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      temperature: 0.78,
      top_p: 0.92,
      stream: false,
    });
  } catch (error) {
    console.error('XTY pet brain Groq call failed', party.code, error?.status || error?.name || error);
    return null;
  }

  const choice = response?.choices?.[0];
  if (!choice || choice.finish_reason === 'content_filter') return {
    behavior: 'QUIET', focus: '', openThreads: [], bubbles: [],
  };
  const decision = sanitizeDecision(choice.message?.content || '', party.pet_id, trigger);
  if (!decision) return null;
  if (trigger !== 'direct' && decision.bubbles.length && tooSimilarToRecent(decision.bubbles, history)) {
    return {
      behavior: 'QUIET',
      focus: decision.focus || 'candidate ซ้ำกับสิ่งที่ PET เพิ่งพูด',
      openThreads: decision.openThreads,
      bubbles: [],
    };
  }
  return decision;
}
