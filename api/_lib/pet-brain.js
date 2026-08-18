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

import {
  BEHAVIOURS, DECISION_SCHEMA, FORBIDDEN, GENERIC_PATTERNS, LIMITS,
} from './pet/constitution.js';
import { sauceFor, hasSauce } from './pet/sauce/index.js';
import { buildPrompt } from './pet/compose.js';
import { xircleKnowledgeFor, WHITE_CAT_ID } from './xircle-knowledge.js';
import { PET_BY_ID } from '../../xty/_shared/pets.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
/* ชื่อโมเดลเปลี่ยนได้จาก env โดยไม่ต้อง deploy — แคตตาล็อกของผู้ให้บริการ
   ขยับได้เรื่อย ๆ และรอบที่แล้วเราตั้งชื่อรุ่น vision ที่เรียกไม่ติด แล้วมัน
   ล้มเงียบอยู่นานโดยไม่มีใครรู้ */
const TEXT_MODEL = process.env.XTY_PET_TEXT_MODEL || 'openai/gpt-oss-20b';
const VISION_MODEL = process.env.XTY_PET_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_IMAGES_PER_TURN = 3;
const ICT_OFFSET_MINUTES = 7 * 60;

export function aiConfigured() {
  return process.env.XTY_PET_AI === 'on' && !!process.env.GROQ_API_KEY;
}

export function visionConfigured() {
  return process.env.XTY_PET_VISION === 'on' && !!process.env.GROQ_API_KEY;
}

function registryPet(petId) {
  const key = String(petId || '');
  return Object.prototype.hasOwnProperty.call(PET_BY_ID, key) ? PET_BY_ID[key] : null;
}

function personaFor(petId) {
  return sauceFor(String(petId || ''), registryPet(petId));
}

export function hasPersona(petId) {
  return !!personaFor(petId);
}

/* True only for animals with a hand-written sauce file. */
export function hasAuthoredPersona(petId) {
  return hasSauce(petId);
}

export function petDisplayNames(petId) {
  const names = new Set();
  const registry = registryPet(petId);
  const sauce = personaFor(petId);
  if (registry?.nameTh) names.add(String(registry.nameTh));
  if (sauce?.nameTh) names.add(String(sauce.nameTh));
  /* People naturally shorten แมวส้ม to แมว, while แมวขาว should stay exact. */
  if (petId === 'cat') names.add('แมว');
  for (const alias of sauce?.aliases || []) names.add(String(alias));
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

/* รูปที่คนแนบอยู่คนละที่กับข้อความ ถ้าไม่หยิบมาด้วย บรรทัดนั้นจะกลายเป็น
   ข้อความเปล่าในสายตาสัตว์ — เหมือนมีคนโพสต์แล้วไม่มีอะไรอยู่ในนั้น */
function imageOf(post) {
  return post?.image_url || post?.imageUrl || '';
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
    const photo = !post.retracted && imageOf(post) ? ' [แนบรูป]' : '';
    if (post.kind === 'pet') {
      lines.push(`${stamp}${fresh} ${who} [PET]: ${post.body || ''}`);
    } else if (post.retracted) {
      lines.push(`${stamp}${fresh} ${who}: [ถอนข้อความ]`);
    } else if (post.kind === 'commit') {
      lines.push(`${stamp}${fresh} ${who}: COMMIT${post.body && post.body !== '✓' ? ` — ${post.body}` : ' ✓'}${photo}`);
    } else if (post.kind === 'event') {
      lines.push(`${stamp}${fresh} [EVENT] ${post.body || ''}`);
    } else {
      lines.push(`${stamp}${fresh} ${who}:${photo} ${post.body || ''}`.trimEnd());
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
    lines.push('## สิ่งที่ vision model เห็นจากรูปที่แนบล่าสุด');
    lines.push(visionText);
    lines.push('ใช้เป็น observation ของภาพเท่านั้น ห้ามเดาข้อมูลนอกภาพ');
  }
  return lines.join('\n');
}

/* รูปที่แนบจริง (คอลัมน์ image_url) มาก่อนเสมอ ส่วนลิงก์รูปที่พิมพ์มาใน
   ข้อความยังรับไว้ เผื่อมีคนแปะ URL มาเอง */
function imageUrlsFromHistory(history) {
  if (!visionConfigured()) return [];
  const urls = [];
  const seen = new Set();
  const linkRe = /https:\/\/[^\s<>"']+?\.(?:png|jpe?g|webp)(?:\?[^\s<>"']*)?/gi;
  for (const post of [...history].reverse()) {
    if (post.retracted) continue;
    const attached = imageOf(post);
    if (attached && !seen.has(attached)) {
      seen.add(attached); urls.push(attached);
      if (urls.length >= MAX_IMAGES_PER_TURN) return urls;
    }
    if (post.kind !== 'message') continue;
    for (const match of String(post.body || '').matchAll(linkRe)) {
      const url = match[0];
      if (seen.has(url)) continue;
      seen.add(url); urls.push(url);
      if (urls.length >= MAX_IMAGES_PER_TURN) return urls;
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
      temperature: 0.2,
      top_p: 0.8,
      stream: false,
    });
    return String(response?.choices?.[0]?.message?.content || '').trim().slice(0, 900);
  } catch (error) {
    console.error('XTY pet vision prepass failed',
      `model=${VISION_MODEL}`, error?.status || error?.name || error, error?.message || '');
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
    .slice(0, LIMITS.maxBubbleChars);
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
  const situation = String(value.situation || '').trim().slice(0, 400);
  const focus = String(value.focus || '').trim().slice(0, 240);
  const intent = String(value.intent || '').trim().slice(0, 400);
  const openThreads = Array.isArray(value.open_threads)
    ? value.open_threads.map(item => String(item || '').trim().slice(0, 180)).filter(Boolean).slice(0, LIMITS.maxThreads)
    : [];
  let bubbles = Array.isArray(value.bubbles)
    ? value.bubbles.map(cleanBubble).filter(Boolean).slice(0, LIMITS.maxBubbles)
    : [];

  if (behavior === 'QUIET') bubbles = [];
  const joined = bubbles.join(' ').toLowerCase();
  if (FORBIDDEN.some(term => joined.includes(term))) bubbles = [];
  if (petId !== 'monitor_lizard' && (joined.includes('กู') || joined.includes('มึง'))) bubbles = [];
  if (trigger !== 'direct' && bubbles.some(line => GENERIC_PATTERNS.some(re => re.test(line)))) bubbles = [];

  return {
    behavior: bubbles.length ? behavior : 'QUIET',
    situation,
    focus,
    intent: bubbles.length ? intent : '',
    openThreads,
    bubbles,
  };
}

/* Kept for old tests/imports that only need line filtering. */
export function sanitize(raw, petId = '') {
  const text = String(raw || '').trim();
  if (!text || /^quiet$/i.test(text)) return [];
  return text.split('\n').map(cleanBubble).filter(Boolean).slice(0, LIMITS.maxBubbles).filter(line => {
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
  const sauce = personaFor(party.pet_id);
  if (!aiConfigured() || !sauce) return null;

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
  const prompt = buildPrompt({
    sauce, party, context, hour, trigger, knowledge,
    transcript: transcript(history, since, trigger, directText, visionText),
  });

  let response;
  try {
    response = await groqRequest({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'xty_pet_turn', strict: true, schema: DECISION_SCHEMA },
      },
      max_completion_tokens: 700,
      /* A direct message has a human waiting on the other side and there are
         few of them; a scheduled sweep touches every party at once. */
      reasoning_effort: trigger === 'direct' ? 'medium' : 'low',
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
    behavior: 'QUIET', situation: '', focus: '', intent: '', openThreads: [], bubbles: [],
  };
  const decision = sanitizeDecision(choice.message?.content || '', party.pet_id, trigger);
  if (!decision) return null;
  if (trigger !== 'direct' && decision.bubbles.length && tooSimilarToRecent(decision.bubbles, history)) {
    return {
      ...decision,
      behavior: 'QUIET',
      focus: decision.focus || 'candidate ซ้ำกับสิ่งที่ PET เพิ่งพูด',
      intent: '',
      bubbles: [],
    };
  }
  return decision;
}
