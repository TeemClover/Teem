// X-VISOR Studio content "sauce": reads what the person wrote, picks a way to tell it, and builds the clip plan.
// Pure module (no DOM). The live preview, the exported file and the Claude brief all read the plan built here.
//
// Rules that come from the X-VISOR skill (TeemClover/xvisor skills/xvisor/references/clip-playbook.md, claims.md):
// - personal experience only comes from the person's own words; templates never add results, days of use or numbers
// - no camera is ever required; every shot uses a photo the person has (or an official sample photo)
// - at most two questions, each with a recommended answer, and none that the story already answers

import { FRAME, ZONES, coverCrop, graphemes } from './layout.js';

export const STYLES = {
  story: { id: 'story', label: 'เล่าเรื่องเช้านี้', hint: 'เล่าเหมือนคุยกับเพื่อน ทีละประโยค', font: 'story' },
  question: { id: 'question', label: 'ชวนตอบหนึ่งคำถาม', hint: 'ถามคนดู แล้วให้ตอบในคอมเมนต์', font: 'question' },
  steps: { id: 'steps', label: 'โชว์ทีละขั้น', hint: 'สามขั้นสั้น ๆ ที่ทำตามได้', font: 'steps' }
};
export const STYLE_ORDER = ['story', 'question', 'steps'];

const TOPICS = {
  scale: {
    match: /เครื่องชั่ง|ตาชั่ง|ชั่งน้ำหนัก|ชั่ง|scale/i,
    noun: 'เครื่องชั่ง',
    audiences: [
      { id: 'confused', label: 'คนที่ชั่งแล้วเห็นเลขขึ้นลง แล้วสับสน', recommended: true },
      { id: 'starter', label: 'คนที่เพิ่งเริ่มชั่งน้ำหนักที่บ้าน' },
      { id: 'customer', label: 'ลูกค้าที่มีเครื่องชั่ง XIRCLE อยู่แล้ว' }
    ],
    story: {
      hook: { confused: 'เลขบนเครื่องชั่ง วันเดียว บอกอะไรเราได้ไม่หมด', starter: 'เพิ่งเริ่มชั่งน้ำหนัก ลองดูแบบนี้', customer: 'มีเครื่องชั่งแล้ว ลองดูแบบนี้' },
      points: ['น้ำหนักวันเดียวขยับได้ ทั้งมื้อเมื่อคืน เวลานอน เวลาที่ชั่ง', 'ลองชั่งเวลาเดิม ที่เดิม หลายวัน แล้วดูเป็นแนวโน้ม']
    },
    question: {
      hook: 'ปกติเพื่อน ๆ ชั่งน้ำหนักบ่อยแค่ไหน?',
      choices: ['ทุกเช้า', 'อาทิตย์ละครั้ง', 'นาน ๆ ที'],
      insight: 'ชั่งเวลาเดิมหลายวัน จะเห็นแนวโน้มชัดกว่าดูวันเดียว'
    },
    steps: {
      hook: 'ชั่งน้ำหนักให้เห็นแนวโน้ม ใน 3 ขั้น',
      items: ['ชั่งเวลาเดิมทุกวัน', 'วางเครื่องที่เดิม บนพื้นเรียบ', 'ดูหลายวันต่อกัน ไม่ใช่วันเดียว']
    },
    close: { save: 'เซฟไว้ดูตอนชั่งครั้งหน้านะ', comment: 'ตอบในคอมเมนต์หน่อย', dm: 'สงสัยตรงไหน ทักมาคุยกันได้นะ' }
  },
  routine: {
    match: /routine\s*x|routinex|รูทีน|ซอง|habix|โปรตีน|daily routine/i,
    noun: 'กิจวัตร',
    audiences: [
      { id: 'busy', label: 'คนทำงานที่อยากมีกิจวัตรง่าย ๆ', recommended: true },
      { id: 'starter', label: 'คนที่เพิ่งเริ่มดูแลตัวเอง' },
      { id: 'customer', label: 'ลูกค้าที่มี RoutineX อยู่แล้ว' }
    ],
    story: {
      hook: { busy: 'กิจวัตรเล็ก ๆ เริ่มได้จากมุมเดียวในบ้าน', starter: 'เริ่มดูแลตัวเอง เริ่มจากเรื่องเล็กก่อน', customer: 'มีกล่องแล้ว จัดมุมให้หยิบง่าย' },
      points: ['วางไว้ที่เดียวกันทุกวัน หยิบง่าย ไม่ต้องคิด', 'ทำง่าย ๆ ซ้ำทุกวัน ดีกว่าทำหนักแล้วหยุด']
    },
    question: {
      hook: 'ของที่ตั้งใจทำทุกวัน เพื่อน ๆ ลืมบ่อยไหม?',
      choices: ['ลืมบ่อยมาก', 'บางวัน', 'ไม่ค่อยลืม'],
      insight: 'วางไว้จุดเดิมที่เห็นทุกเช้า ช่วยให้ไม่ลืม'
    },
    steps: {
      hook: 'จัดมุมกิจวัตร ให้ทำได้ทุกวัน ใน 3 ขั้น',
      items: ['เลือกมุมที่เห็นทุกเช้า', 'วางของไว้ที่เดิมเสมอ', 'ทำเวลาเดิมทุกวัน']
    },
    close: { save: 'เซฟไว้เป็นไอเดียจัดมุมของตัวเอง', comment: 'ตอบในคอมเมนต์หน่อย', dm: 'อยากคุยเรื่องนี้ ทักมาได้นะ' }
  },
  food: {
    match: /อาหาร|มื้อ|ข้าว|กับข้าว|สลัด|เมนู|ของกิน/,
    noun: 'มื้ออาหาร',
    audiences: [
      { id: 'busy', label: 'คนทำงานที่กินข้าวนอกบ้านบ่อย', recommended: true },
      { id: 'starter', label: 'คนที่เพิ่งเริ่มสนใจเรื่องกิน' },
      { id: 'family', label: 'คนที่ทำกับข้าวให้ครอบครัว' }
    ],
    story: {
      hook: { busy: 'ก่อนกิน ถ่ายรูปมื้อนี้เก็บไว้ก่อน', starter: 'เริ่มสนใจเรื่องกิน เริ่มจากถ่ายรูปมื้อ', family: 'มื้อของบ้านเรา ถ่ายเก็บไว้ดูย้อนหลัง' },
      points: ['ถ่ายเก็บไว้ ย้อนดูได้ว่ากินอะไรไปบ้าง', 'ไม่ต้องเป๊ะทุกมื้อ ขอแค่เห็นภาพรวมของสัปดาห์']
    },
    question: {
      hook: 'มื้อเช้าของเพื่อน ๆ ส่วนใหญ่เป็นแบบไหน?',
      choices: ['ทำกินเอง', 'ซื้อระหว่างทาง', 'ข้ามมื้อเช้า'],
      insight: 'ถ่ายรูปมื้อเก็บไว้ จะเห็นว่าเรากินแบบไหนบ่อย'
    },
    steps: {
      hook: 'จดมื้ออาหารแบบไม่เหนื่อย ใน 3 ขั้น',
      items: ['ถ่ายรูปก่อนกินทุกมื้อ', 'เก็บไว้ในอัลบั้มเดียว', 'ย้อนดูทุกสิ้นสัปดาห์']
    },
    close: { save: 'เซฟไว้ ลองถ่ายมื้อต่อไปดู', comment: 'ตอบในคอมเมนต์หน่อย', dm: 'อยากคุยเรื่องกิน ทักมาได้นะ' }
  },
  general: {
    match: null,
    noun: 'เรื่องนี้',
    audiences: [
      { id: 'friends', label: 'เพื่อน ๆ ที่ติดตามพี่อยู่แล้ว', recommended: true },
      { id: 'new', label: 'คนที่ยังไม่รู้จักพี่' },
      { id: 'customer', label: 'ลูกค้าที่เคยคุยกัน' }
    ],
    story: {
      hook: { friends: 'เรื่องเล็ก ๆ ที่อยากเล่าให้ฟัง', new: 'ขอเล่าเรื่องเล็ก ๆ เรื่องหนึ่ง', customer: 'มีเรื่องอยากเล่าให้ฟัง' },
      points: ['เรื่องเล็ก ๆ แบบนี้ เกิดขึ้นได้ทุกวัน', 'ใครเคยเป็นแบบนี้บ้าง']
    },
    question: {
      hook: 'ถ้าเป็นเพื่อน ๆ จะทำยังไง?',
      choices: ['ทำแบบเดียวกัน', 'ทำอีกแบบ', 'ยังไม่แน่ใจ'],
      insight: 'แต่ละคนมีวิธีของตัวเอง อยากฟังของทุกคน'
    },
    steps: {
      hook: 'เรื่องนี้ทำตามได้ ใน 3 ขั้น',
      items: ['เริ่มจากสิ่งที่มีอยู่แล้ว', 'ลองทำวันละนิด', 'กลับมาดูอีกทีสิ้นสัปดาห์']
    },
    close: { save: 'เซฟไว้ก่อนนะ', comment: 'ตอบในคอมเมนต์หน่อย', dm: 'ทักมาคุยกันได้นะ' }
  }
};

export const CTA_OPTIONS = [
  { id: 'save', label: 'เซฟคลิปไว้ดูอีกครั้ง', recommended: true },
  { id: 'comment', label: 'ตอบในคอมเมนต์' },
  { id: 'dm', label: 'ทักมาคุย' }
];

// Starter ideas for people who have not thought of what to say (ก ข ค, then ง = type your own).
export const STARTER_IDEAS = [
  'มีรูปเครื่องชั่งเมื่อเช้า พี่ไม่อยากออกกล้อง อยากทำคลิปสั้นแบบคุยกับเพื่อน',
  'มีรูปมื้อเช้าวันนี้ อยากเล่าสั้น ๆ ว่าวันนี้กินอะไร',
  'มีรูปกล่อง RoutineX บนโต๊ะ อยากชวนเพื่อนจัดมุมกิจวัตรของตัวเอง'
];

const META = /คลิป|ออกกล้อง|ถ่ายหน้า|โชว์หน้า|อัดเสียง|คุยกับเพื่อน|เป็นกันเอง|อยากทำ|ช่วย(ทำ|เขียน|คิด)|prompt|พรอมต์/i;
const NO_CAMERA = /ไม่(อยาก|ชอบ|ถนัด|กล้า)?\s*(ออก|เข้า)กล้อง|ไม่(อยาก)?(ถ่าย|โชว์|เห็น)หน้า|อายกล้อง|ไม่พูดหน้ากล้อง/;
const FRIEND_TONE = /เพื่อน|เป็นกันเอง|สบาย ๆ|ภาษาพูด|ชิล/;
const TIME_WORDS = /(เมื่อเช้า|เช้านี้|วันนี้|เมื่อวาน|เมื่อคืน|คืนนี้|ตอนเช้า|ตอนเย็น)/;
const AUDIENCE_WORDS = /(ให้|สำหรับ)\s*(ลูกค้า|คนที่[^\s]*|มือใหม่|คนทำงาน|แม่|พ่อ|ผู้สูงอายุ|วัยรุ่น)/;
const CTA_WORDS = { save: /เซฟ|บันทึกไว้/, comment: /คอมเมนต์|ตอบ/, dm: /ทัก|inbox|ไลน์|line/i };

function clauses(text) {
  return String(text || '').replace(/[\n,.!?]+/g, ' | ').split(/\s+(?=พี่|อยาก|แต่|และ|แล้ว)|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
}

// Turn the person's own clause into an on-screen line in their voice. Never adds facts.
export function userLineFrom(story) {
  const kept = clauses(story).filter(c => !META.test(c) && !NO_CAMERA.test(c));
  if (!kept.length) return '';
  let line = kept.join(' ');
  const photo = line.match(/^มีรูป\s*(.+?)\s*(เมื่อเช้า|เช้านี้|วันนี้|เมื่อวาน|เมื่อคืน|ตอนเช้า|ตอนเย็น)?$/);
  if (photo) line = photo[2] ? `รูป${photo[1]} ถ่ายไว้${photo[2]}` : `รูป${photo[1]} ที่ถ่ายไว้`;
  line = line.replace(/\s+/g, ' ').trim();
  if (graphemes(line) > 64) {
    const cut = [...line].slice(0, 60).join('');
    line = cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).trim() + '…';
  }
  return line;
}

export function understand(story) {
  const text = String(story || '').trim();
  const topicId = Object.keys(TOPICS).find(id => TOPICS[id].match && TOPICS[id].match.test(text)) || 'general';
  const ctaId = Object.keys(CTA_WORDS).find(id => CTA_WORDS[id].test(text.replace(/คุยกับเพื่อน/g, ''))) || null;
  const audience = text.match(AUDIENCE_WORDS);
  const time = text.match(TIME_WORDS);
  return {
    text,
    enough: graphemes(text) >= 8,
    topic: topicId,
    noCamera: true, // Studio never asks anyone to film themselves; this records whether they said so.
    saidNoCamera: NO_CAMERA.test(text),
    friendTone: FRIEND_TONE.test(text),
    time: time ? time[1] : null,
    audienceText: audience ? audience[0].replace(/^(ให้|สำหรับ)\s*/, '') : null,
    cta: ctaId,
    userLine: userLineFrom(text)
  };
}

// Questions still worth asking, with the recommended answer first. Known answers are skipped.
export function openQuestions(info) {
  const topic = TOPICS[info.topic];
  const qs = [];
  if (!info.audienceText) qs.push({ id: 'audience', title: 'คลิปนี้อยากให้ใครดู', options: topic.audiences });
  if (!info.cta) qs.push({ id: 'cta', title: 'ดูจบแล้ว อยากให้เขาทำอะไรต่อ', options: CTA_OPTIONS });
  return qs;
}

export function audienceLabel(info, answers) {
  if (info.audienceText) return info.audienceText;
  const topic = TOPICS[info.topic];
  if (answers.audienceText) return answers.audienceText;
  const pick = topic.audiences.find(a => a.id === answers.audience) || topic.audiences[0];
  return pick.label;
}

// Build the editable copy for a style. Text the person already edited (hook, lines) is kept when they switch style.
export function draftCopy(info, answers, style, keep = {}) {
  const topic = TOPICS[info.topic];
  const audienceId = answers.audience || topic.audiences[0].id;
  const ctaId = info.cta || answers.cta || (style === 'question' ? 'comment' : 'save');
  const userLine = info.userLine;
  const closeText = answers.ctaText || topic.close[ctaId] || topic.close.save;
  let copy;
  if (style === 'story') {
    const hook = topic.story.hook[audienceId] || Object.values(topic.story.hook)[0];
    copy = { hook, kicker: info.time ? `เล่าจากรูป${info.time}` : 'เล่าจากรูปของพี่', lines: [userLine, ...topic.story.points].filter(Boolean), close: closeText };
  } else if (style === 'question') {
    copy = { hook: topic.question.hook, kicker: 'ถามหน่อย', choices: [...topic.question.choices], lines: [userLine, topic.question.insight].filter(Boolean), close: ctaId === 'comment' ? 'ตอบในคอมเมนต์ ก ข หรือ ค' : closeText };
  } else {
    copy = { hook: topic.steps.hook, kicker: userLine || 'ทำตามได้เลย', lines: [...topic.steps.items], close: closeText };
  }
  if (keep.hook) copy.hook = keep.hook;
  return { ...copy, cta: ctaId };
}

// Reading-time based shot length for Thai on a phone, about 12 characters per second plus a beat.
function readTime(text, min, max) {
  return Math.max(min, Math.min(max, 1.2 + graphemes(text) / 12));
}

const MOTION = [
  { z0: 1.16, z1: 1.06, dx: 0, dy: 0 },
  { z0: 1.08, z1: 1.18, dx: -0.04, dy: 0.02 },
  { z0: 1.22, z1: 1.12, dx: 0.05, dy: -0.02 },
  { z0: 1.1, z1: 1.2, dx: 0.02, dy: 0.04 },
  { z0: 1.14, z1: 1.08, dx: -0.03, dy: -0.03 }
];

export const MIN_DURATION = 15;
export const MAX_DURATION = 30;

// draft: { style, photos:[{id,width,height,focus,origin,label}], copy, textPos:'auto'|'top'|'bottom', shotPhotos:{index:photoIndex} }
export function buildPlan(draft) {
  const { style, photos, copy } = draft;
  const shots = [];
  const add = (kind, text, extra = {}) => shots.push({ kind, text: String(text || '').trim(), ...extra });
  add('hook', copy.hook, { kicker: copy.kicker || '' });
  if (style === 'question') {
    add('choices', copy.hook, { choices: copy.choices || [] });
    copy.lines.forEach(line => add('line', line));
  } else if (style === 'steps') {
    copy.lines.forEach((line, i) => add('step', line, { step: i + 1, total: copy.lines.length }));
  } else {
    copy.lines.forEach(line => add('line', line));
  }
  add('close', copy.close, { recap: style === 'steps' ? copy.lines : null, choices: style === 'question' ? copy.choices : null });

  // Timing
  for (const shot of shots) {
    if (shot.kind === 'hook') shot.dur = readTime(shot.text, 3.4, 5);
    else if (shot.kind === 'choices') shot.dur = 2.2 + 1.1 * shot.choices.length;
    else if (shot.kind === 'close') shot.dur = readTime(shot.text, 3.4, 5) + (shot.recap ? 1.2 : 0);
    else shot.dur = readTime(shot.text, 3, 6);
  }
  let total = shots.reduce((s, x) => s + x.dur, 0);
  const target = Math.min(MAX_DURATION, Math.max(MIN_DURATION, total));
  if (target !== total) {
    const k = target / total;
    shots.forEach(s => { s.dur *= k; });
  }
  let t = 0;
  shots.forEach((shot, i) => {
    shot.index = i;
    shot.start = round(t);
    t += shot.dur;
    shot.end = round(t);
    shot.dur = round(shot.end - shot.start);
  });
  const duration = shots[shots.length - 1].end;

  // Photos, motion and the text zone that keeps words off the subject.
  shots.forEach((shot, i) => {
    const override = draft.shotPhotos && Number.isInteger(draft.shotPhotos[i]) ? draft.shotPhotos[i] : null;
    const auto = shot.kind === 'close' || shot.kind === 'hook' ? 0 : i % photos.length;
    shot.photo = Math.min(photos.length - 1, override ?? auto);
    const p = photos[shot.photo];
    const m = MOTION[i % MOTION.length];
    const focus = { x: clampUnit(p.focus.x + m.dx), y: clampUnit(p.focus.y + m.dy) };
    shot.motion = { z0: m.z0, z1: m.z1 };
    shot.focus = focus;
    const zone = chooseZone(draft.textPos, p, focus, (m.z0 + m.z1) / 2, shot.kind);
    shot.zone = zone;
    shot.target = { x: 0.5, y: zone === 'top' ? 0.66 : zone === 'center' ? 0.5 : 0.4 };
  });

  const plan = {
    version: 1,
    style,
    width: FRAME.w,
    height: FRAME.h,
    fps: 30,
    duration,
    photos: photos.map(p => ({ id: p.id, label: p.label, origin: p.origin, width: p.width, height: p.height, focus: { ...p.focus } })),
    shots: shots.map(s => ({ ...s })),
    sample: photos.every(p => p.origin === 'sample')
  };
  plan.id = planId(plan);
  return plan;
}

function chooseZone(pref, photo, focus, zoom, kind) {
  if (kind === 'close' || kind === 'choices') return 'center';
  if (pref === 'top' || pref === 'bottom') return pref;
  // Where would the focus land if we aim it at the middle? Put words on the side away from it.
  const probe = coverCrop(photo.width, photo.height, focus, zoom, 0.5, 0.5);
  return probe.fy / FRAME.h > 0.56 ? 'top' : 'bottom';
}

export function zoneBox(zone) {
  return ZONES[zone] || { y0: 560, y1: 1380 };
}

const clampUnit = v => Math.max(0.02, Math.min(0.98, v));
const round = v => Math.round(v * 100) / 100;

// Stable short id of everything the clip shows. The brief and the file name carry it so all three can be matched.
export function planId(plan) {
  const material = JSON.stringify({
    style: plan.style,
    photos: plan.photos.map(p => [p.id, round(p.focus.x), round(p.focus.y)]),
    shots: plan.shots.map(s => [s.kind, s.text, s.kicker || '', s.choices || '', s.photo, s.zone, s.start, s.end])
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(6, '0').slice(-6);
}

// Claim Guard (claims.md): words that need a rewrite before posting. Returns [{word, fix}].
const RISKY = [
  [/รักษา(?!ไว้|ระยะ|การ)/, 'รักษา', 'ใช้ “ช่วยดูแล” หรือเล่าเป็นกิจวัตรแทน'],
  [/หายขาด/, 'หายขาด', 'ตัดออก'],
  [/ป้องกันโรค/, 'ป้องกันโรค', 'ใช้ “ช่วยดูแล”'],
  [/ดีท็อก|ดีทอก|detox|ล้างสารพิษ|ล้างลำไส้/i, 'ดีท็อกซ์', 'ห้ามใช้ ใช้ภาษาดูแลกิจวัตรแทน'],
  [/การันตี|รับประกัน/, 'การันตี', 'บอกว่า “ผลของแต่ละคนไม่เหมือนกัน”'],
  [/ลด(น้ำหนัก)?\s*\d+\s*(กิโล|โล|kg)/i, 'ลดกี่กิโล', 'ตัดตัวเลขผลลัพธ์ออก'],
  [/ผอมแน่|ผอมเร็ว|ลดไว/, 'ผอมเร็ว', 'ตัดออก'],
  [/รายได้\s*\d|รวยแน่|ได้เงินแน่/, 'รายได้', 'ห้ามสื่อว่าทุกคนได้เท่ากัน'],
  [/เบาหวาน|ความดัน|มะเร็ง|กระดูกพรุน/, 'ชื่อโรค', 'อย่าโยงกับโรค เล่าเป็นการดูแลตัวเอง']
];
export function claimCheck(texts) {
  const found = [];
  for (const text of [].concat(texts)) {
    for (const [re, word, fix] of RISKY) if (re.test(String(text || '')) && !found.some(f => f.word === word)) found.push({ word, fix, text });
  }
  return found;
}

export function topicOf(info) {
  return TOPICS[info.topic];
}
