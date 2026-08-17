/* ═══════════════════════════════════════════════════════════════
   XTY × Xircle — knowledge pack for the hidden White Cat

   Persona and knowledge are intentionally separate:
   - pet-personas.js = how the cat sounds
   - this file = what Xircle/X-VISOR reference facts it may use
   - pet-brain.js = when/how it decides to speak

   Sources are compact public-safe canon already shipped by /xircle:
   xircle/data/canon.json, xircle/data/products.json,
   xircle/data/library-simple-v1.js and xircle/doc/xvisor/*.
   Do not add doses, medical claims, private health data, or unverified
   ingredient details here.
   ═══════════════════════════════════════════════════════════════ */

export const WHITE_CAT_ID = 'xvisor_white_cat_silver';

const BASE_RULES = Object.freeze([
  'X-VISOR คือ Health Partner ที่ช่วยแปลข้อมูลเป็นการดูแลและการตัดสินใจในชีวิตจริง ไม่ใช่ผู้วินิจฉัยหรือรักษาโรค',
  'Xircle ใช้แนวคิด เห็นเมื่อวาน → เข้าใจบริบท → เลือก 1 อย่าง → ทำจริง → ติดตาม ไม่ตัดสินคนจากคะแนนหรือเลขวันเดียว',
  'Behavior (Eat/Move/Sleep/Habit Score) กับ Outcome (Body Composition/Trend) เป็นคนละชั้น ห้ามเอามารวมเป็นข้อสรุปเดียว',
  'คำแนะนำของแมวขาวเป็น process guidance: ถามเป้าหมาย ฟังบริบท ลด friction เลือก One Action และติดตาม ห้ามวินิจฉัย สั่งยา กำหนดอาหาร/การออกกำลังกาย หรือ health target',
]);

const TOPICS = Object.freeze([
  {
    id: 'xircle',
    terms: ['xircle', 'กิน', 'ขยับ', 'นอน', 'เมื่อวาน', 'habit tracker'],
    title: 'Xircle',
    summary: 'ช่วยมองย้อนกลับไปว่าเมื่อวานกิน ขยับ และนอนเป็นอย่างไร แล้วเลือกสิ่งที่จะปรับวันนี้',
    points: ['ดูเมื่อวานก่อน ไม่ต้องเดาจากความจำ', 'กิน + ขยับ + นอน คือภาพหลักของพฤติกรรม', 'ช่วยเห็นแนวโน้ม ไม่ใช่เครื่องมือวินิจฉัยโรค'],
  },
  {
    id: 'habit-score',
    terms: ['habit score', 'habitscore', 'คะแนน', 'eat move sleep'],
    title: 'Habit Score',
    summary: 'สรุปพฤติกรรมของเมื่อวานจาก 3 เสา Eat + Move + Sleep เท่านั้น',
    points: ['เป็นภาพสะท้อนพฤติกรรม ไม่ใช่คะแนนตัดสินคน', 'Body Composition แยกจาก Habit Score', 'คะแนนต่ำไม่ได้แปลว่าคนนั้นสุขภาพแย่'],
  },
  {
    id: 'band-scale',
    terms: ['band', 'scale', 'xircle band', 'เครื่องชั่ง', 'body composition'],
    title: 'Band / Scale',
    summary: 'Band วัดสิ่งที่คุณทำ (Behavior) ส่วน Scale วัดผลลัพธ์ที่ร่างกายตอบ (Outcome)',
    points: ['ดูแนวโน้มหลายวันมากกว่าเลขวันเดียว', 'ค่าจากอุปกรณ์ไม่ใช่ผลตรวจทางการแพทย์'],
  },
  {
    id: 'trend',
    terms: ['trend', 'baseline', 'แนวโน้ม', 'หลายวัน', 'วันเดียว'],
    title: 'Trend / Baseline',
    summary: 'วันเดียวอาจเป็นวันพิเศษ หลายวันจึงเริ่มช่วยให้เห็นว่าอะไรเหมาะกับชีวิตจริง',
    points: ['เทียบกับตัวเองก่อน', 'ถามว่าช่วงนั้นชีวิตมีอะไรเปลี่ยนไปไหม', 'อย่ารีบสรุปจากคืนเดียว วันเดียว หรือเลขเดียว'],
  },
  {
    id: 'food-ai',
    terms: ['food ai', 'อาหาร', 'ถ่ายอาหาร', 'มื้อ', 'กิน'],
    title: 'Food AI',
    summary: 'ช่วยเก็บภาพของมื้อและมองการกินย้อนหลังได้ง่ายขึ้น',
    points: ['ค่าที่ระบบประเมินเป็นการประมาณ', 'ผู้ใช้ควรตรวจและแก้ข้อมูลเมื่อจำเป็น', 'ห้ามอ้างว่าประเมินจากภาพแม่น 100%'],
  },
  {
    id: 'maxage',
    terms: ['maxage', 'maxage™', 'อายุ', 'อายุขัย'],
    title: 'MaxAge™',
    summary: 'ใช้ดูทิศทางระยะยาวเพื่อพากลับมาดูแลสิ่งที่ทำได้วันนี้',
    points: ['มองเป็นทิศทาง ไม่ใช่คำตัดสิน', 'อ่านร่วมกับแนวโน้มอื่นของตัวเอง', 'ไม่ใช่คำทำนายอายุขัย'],
  },
  {
    id: 'routinex',
    terms: ['routinex', 'routine x', '28 วัน', '28 days', 'routine'],
    title: 'RoutineX / 28 วัน',
    summary: 'ช่วยจัดสิ่งที่ควรทำให้เป็นจังหวะที่ทำซ้ำได้ง่ายขึ้นในชีวิตจริง',
    points: ['ลดการต้องคิดใหม่ทุกวัน', 'เริ่มจากสิ่งที่ทำได้จริง', '28 วันคือจังหวะเริ่ม-เช็กอิน-ทบทวน ไม่ใช่คำรับประกันผล'],
  },
  {
    id: 'abcd',
    terms: ['abcd', 'absorb', 'build', 'control', 'daily balance', 'gus', 'g.u.s', 'protein hmb', 'astamega', 'vita matrix', 'flavor'],
    title: 'ABCD + Flavor+',
    summary: 'A=ABSORB → G.U.S.+ / B=BUILD → Protein HMB+ / C=CONTROL → Behavior (ซื้อไม่ได้) / D=DAILY BALANCE → AstaMega+ + Vita Matrix / += Flavor+',
    points: ['จำหน้าที่ก่อนชื่อสินค้า', 'C คือพฤติกรรม ไม่มีสินค้าและซื้อไม่ได้', 'อย่าเติม E', 'รายละเอียดส่วนผสม ปริมาณ หรือคำเตือนต้องดูเอกสาร/ฉลากล่าสุด'],
  },
  {
    id: 'xvisor',
    terms: ['x-visor', 'xvisor', 'x visor', 'health partner', 'ดูแล', 'แนะนำ'],
    title: 'X-VISOR',
    summary: 'ข้อมูลบอกว่าอะไรเกิดขึ้น ส่วน X-VISOR ช่วยถามบริบทและเลือกว่าจะทำอะไรต่อ',
    points: ['ถามเป้าหมายก่อน', 'ฟังงาน ครอบครัว เวลา และข้อจำกัด', 'ช่วยเลือก 1 อย่างที่ทำได้จริงแล้วติดตาม', 'ไม่วินิจฉัยและไม่แทนผู้เชี่ยวชาญ'],
  },
  {
    id: 'care',
    terms: ['care', 'change', 'attract', 'result', 'elevate', 'framework'],
    title: 'CARE',
    summary: 'Change · Attract · Result · Elevate เป็นกรอบให้การดูแลไม่จบแค่วันเริ่ม',
    points: ['Change: เริ่มจากเปลี่ยนตัวเอง', 'Attract: สร้างความสนใจจากเรื่องจริงและคุณค่า', 'Result: ช่วยให้เริ่มได้ถูกทาง', 'Elevate: ดูแลต่อเนื่องจนไปต่อได้เอง'],
  },
  {
    id: 'privacy',
    terms: ['privacy', 'consent', 'ความเป็นส่วนตัว', 'ข้อมูลสุขภาพ', 'screenshot', 'รูปหน้าจอ'],
    title: 'Privacy / Consent',
    summary: 'เห็นข้อมูลเท่าที่จำเป็นต่อการดูแล และต้องมีความยินยอม',
    points: ['ข้อมูลสุขภาพเป็น sensitive data', 'ไม่แชร์ screenshot/ผลลัพธ์ของคนอื่นโดยไม่มี consent', 'ใช้ข้อมูลเพื่อดูแล ไม่ใช่เอาไปเล่าต่อ'],
  },
  {
    id: 'claims',
    terms: ['claim', 'เคลม', 'รักษา', 'ป้องกันโรค', 'รับประกัน', 'การันตี'],
    title: 'Claim Safety',
    summary: 'พูดเท่าที่ข้อมูลรองรับ ไม่วินิจฉัย ไม่รับประกัน และไม่เดาเมื่อยังไม่แน่ใจ',
    points: ['ไม่สรุปโรคจากตัวเลข', 'ไม่รับประกันผลในเวลาตายตัว', 'ข้อมูลผลิตภัณฑ์ที่ละเอียดต้องเช็กเอกสารล่าสุดก่อนพูด'],
  },
  {
    id: 'circle-pulse',
    terms: ['circle pulse', 'pulse', 'วง', 'ranking', 'อันดับ'],
    title: 'Circle Pulse',
    summary: 'วัดการ “โผล่มา” (showed up) ของสมาชิกในวง ไม่ใช่ผลสุขภาพและไม่มี ranking',
    points: ['ใช้เห็น participation ของวง', 'ไม่ใช้เปรียบเทียบคุณค่าของคน'],
  },
  {
    id: 'ecosystem',
    terms: ['cloverx', 'clover x', 'ecosystem', 'xos', 'ระบบ'],
    title: 'CloverX Connected Loop',
    summary: 'Xircle ช่วยเห็นและเข้าใจ → RoutineX ช่วยลงมือและทำซ้ำ → X-VISOR ช่วยดูแล → XOS/ชุมชนช่วยให้ระบบไปต่อ',
    points: ['เห็นอย่างเดียวไม่พอ ต้องเข้าใจ ลงมือ ช่วยกัน และทบทวน', 'แต่ละส่วนมีหน้าที่ของตัวเอง ไม่ควรเอาชื่อหนึ่งไปแทนอีกหน้าที่'],
  },
]);

function normalize(value) {
  return String(value || '').toLocaleLowerCase('th-TH').replace(/\s+/g, ' ').trim();
}

function queryText({ query = '', activity = '', history = [] } = {}) {
  const recent = [...history].reverse()
    .filter(item => item && item.kind !== 'pet' && !item.retracted)
    .slice(0, 16)
    .map(item => `${item.alias || ''} ${item.body || ''}`)
    .join(' ');
  return normalize(`${query} ${activity} ${recent}`);
}

function scoreTopic(topic, text) {
  let score = 0;
  for (const term of topic.terms) {
    const wanted = normalize(term);
    if (!wanted || !text.includes(wanted)) continue;
    score += wanted.length >= 8 ? 5 : 2;
  }
  if (text.includes(normalize(topic.title))) score += 4;
  return score;
}

function formatTopic(topic) {
  return `### ${topic.title}\n${topic.summary}\n${topic.points.map(point => `- ${point}`).join('\n')}`;
}

/**
 * Returns a small, query-relevant reference pack for the White Cat only.
 * It is deliberately NOT a dump of the whole /xircle site on every turn.
 */
export function xircleKnowledgeFor({ petId, query = '', activity = '', history = [], trigger = 'scheduled' } = {}) {
  if (petId !== WHITE_CAT_ID) return '';
  const text = queryText({ query, activity, history });
  const ranked = TOPICS
    .map(topic => ({ topic, score: scoreTopic(topic, text) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, trigger === 'direct' ? 5 : 3)
    .map(item => item.topic);

  if (!ranked.length && trigger === 'direct') {
    ranked.push(TOPICS.find(topic => topic.id === 'xvisor'));
  }

  const selected = ranked.filter(Boolean);
  return `## XIRCLE KNOWLEDGE PACK — reference, not Party evidence\n` +
    BASE_RULES.map(rule => `- ${rule}`).join('\n') +
    (selected.length ? `\n\n${selected.map(formatTopic).join('\n\n')}` : '') +
    `\n\nกฎใช้คลัง:\n` +
    `- ใช้ข้อมูลนี้ตอบคำถามเรื่อง Xircle / RoutineX / ABCD / X-VISOR ได้ แม้ข้อความอธิบายไม่ได้อยู่ใน Party Log\n` +
    `- ห้ามเอาความรู้ทั่วไปในคลังไปแต่งว่า “สมาชิกคนนี้เป็นแบบนั้น” ถ้า Party Log ไม่ได้บอก\n` +
    `- Scheduled wake: ห้ามเปิดหัวข้อจากคลังเอง ถ้า log ไม่ได้แตะเรื่องนั้น; คลังมีไว้ช่วยเข้าใจสิ่งที่คนกำลังคุย\n` +
    `- Direct call: ถ้าคำถามคลุมเครือ ถามกลับได้ 1 คำถามที่จำเป็น แล้วตอบเมื่อได้บริบทเพิ่ม\n` +
    `- ถ้าคลังไม่มีข้อมูลพอ หรือคำถามต้องใช้ฉลาก/เอกสารล่าสุด ให้บอกตรง ๆ ว่ายังยืนยันไม่ได้ ห้ามเดา`;
}

export const XIRCLE_KNOWLEDGE_TOPIC_IDS = Object.freeze(TOPICS.map(topic => topic.id));
