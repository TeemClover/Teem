/* TeamBook — scheduled PET presence policy

   Scheduler = inspect every live notebook at 00:27 / 06:27 / 12:27 / 18:27 ICT.
   Presence is adaptive: a PET may stay quiet on a particular sweep, but an
   active notebook must not feel abandoned for an entire day. */

function n(value) { return Math.max(0, Number(value) || 0); }

export function scheduledBubbleAllowance(context = {}) {
  const humanToday = n(context.humanToday);
  const petToday = n(context.petToday);
  return Math.max(0, Math.max(1, humanToday) - petToday);
}

export function dailyPresenceRequired(hour, context = {}) {
  return n(context.petToday) === 0
    && Number(hour) >= 12
    && scheduledBubbleAllowance(context) > 0;
}

export function shouldReadScheduled(hour, context = {}, force = false) {
  if (force) return true;
  if (scheduledBubbleAllowance(context) <= 0) return false;
  if (dailyPresenceRequired(hour, context)) return true;
  if (n(context.humanUpdates) > 0) return true;
  if (context.timedThreadDue) return true;
  if (context.lastHumanAt && (!context.lastPetAt || context.lastPetAt < context.lastHumanAt)) return true;
  return false;
}

function recentPetBodies(history = []) {
  return [...history].reverse()
    .filter(item => item?.kind === 'pet' && !item?.retracted && item?.body)
    .slice(0, 12)
    .map(item => String(item.body));
}

function normalized(value) {
  return String(value || '').toLocaleLowerCase('th-TH').replace(/[^\p{L}\p{N}]+/gu, '');
}

function repeated(candidate, oldLines) {
  const next = normalized(candidate);
  if (!next) return true;
  return oldLines.some(old => {
    const prev = normalized(old);
    if (!prev) return false;
    if (next === prev) return true;
    return Math.min(next.length, prev.length) >= 18 && (next.includes(prev) || prev.includes(next));
  });
}

function pickTarget(context = {}, oldLines = []) {
  const members = Array.isArray(context.members) ? context.members : [];
  if (!members.length) return null;
  const lead = members.find(member => member.role === 'lead') || null;
  const ranked = [...members].sort((a, b) => {
    const aa = n(a.postsToday); const bb = n(b.postsToday);
    if (aa !== bb) return aa - bb;
    const at = a.lastPostAt ? new Date(a.lastPostAt).getTime() : 0;
    const bt = b.lastPostAt ? new Date(b.lastPostAt).getTime() : 0;
    return at - bt;
  });
  const recentText = oldLines.join(' ');
  if (lead && n(lead.postsToday) === 0 && !recentText.includes(String(lead.alias || ''))) return lead;
  return ranked.find(member => !recentText.includes(String(member.alias || ''))) || lead || ranked[0];
}

export function presenceFallback({ party = {}, context = {}, history = [] } = {}) {
  const oldLines = recentPetBodies(history);
  const target = pickTarget(context, oldLines);
  const alias = String(target?.alias || '').trim();
  if (!alias) return '';
  const isLead = target?.role === 'lead';
  const activity = String(party.activity || '').trim().slice(0, 64);
  const subject = activity || 'เรื่องของตี้นี้';

  const candidates = isLead
    ? [
        `${alias} หัวตี้ วันนี้อยากพาวงไปทางไหนต่อ?`,
        `${alias} ถึงตาหัวตี้แล้ว — จะเรียกใครขยับ ${subject} ต่อดี?`,
        `${alias} วันนี้อยากทิ้งทิศทางอะไรไว้ให้ตี้เดินต่อ?`,
        `${alias} ตี้ยังรอหัวตี้อยู่นะ จะพาไปต่อจากตรงไหนดี?`,
      ]
    : [
        `${alias} วันนี้มีอะไรจาก ${subject} ที่อยากทิ้งไว้ในสมุดไหม?`,
        `${alias} รอบนี้อยากต่อเรื่องไหนของ ${subject} ดี?`,
        `${alias} วันนี้ตี้ยังไม่ได้ยินจากเราเลย มีอะไรอยากฝากไว้ไหม?`,
        `${alias} ยังรออัปเดตของ ${subject} จากเราอยู่นะ`,
      ];

  return candidates.find(line => !repeated(line, oldLines)) || '';
}

export function presencePolicyPrompt({ context = {}, hour, trigger = 'scheduled' } = {}) {
  if (trigger === 'direct') return '';
  const allowance = scheduledBubbleAllowance(context);
  const required = dailyPresenceRequired(hour, context);
  const lead = (context.members || []).find(member => member.role === 'lead');
  const leadName = lead?.alias || '(ยังหาไม่พบ)';

  return `## PRESENCE POLICY — กฎนี้ override กฎ QUIET ทั่วไปของ scheduled turn
- ทุก wake ระบบเปิดอ่านสมุดนี้จริง ไม่ใช่สุ่มห้อง
- PET วันนี้พูดแล้ว ${n(context.petToday)} bubble · มนุษย์วันนี้มี message/commit ${n(context.humanToday)} รายการ · budget ที่เหลือ ${allowance} bubble
- scheduled turn ส่งได้มากสุด 1 bubble ต่อ wake
- PET volume วันนี้ห้ามมากกว่ามนุษย์ ยกเว้น floor 1 bubble/วันตอนมนุษย์ยังไม่มีข้อความ
- daily presence required ตอนนี้ = ${required ? 'YES — ห้ามเลือก QUIET; ต้องมี 1 bubble ที่ไม่ซ้ำ' : 'NO — QUIET ได้ถ้าไม่มีเหตุผลใหม่'}
- ถ้าคนยังคุยต่อเนื่อง มี thread ต่อ หรือมีของใหม่ PET ตอบได้ทุก 4 wake ตราบใดที่ยังมี budget
- ถ้าไม่มีของใหม่และวันนี้เคยพูดแล้ว ให้ QUIET ดีกว่ายัดข้อความ
- ถ้าต้องมี presence แต่ไม่มีเรื่องใหม่: ห้ามพูด generic ซ้ำ ๆ ให้เลือก 1 อย่าง — เรียกชื่อคนที่ยังเงียบ, บอกว่ากำลังรอสิ่งที่ค้างแบบเจาะจง, หรือถามคำถามสั้น ๆ ที่ต่อจากเรื่องจริงใน session
- หัวตี้คือ ${leadName}. หัวตี้เป็น role จริง: ถ้าวงนิ่ง/ทิศทางไม่ชัด/สมาชิกยังไม่ขยับ ให้เรียกหัวตี้ด้วยชื่อและชวนให้ทำหน้าที่นำ เช่นกำหนด next move, เรียกสมาชิก, สรุปว่าจะไปทางไหน ห้ามปล่อยให้ PET แบกวงแทนหัวตี้ตลอด
- อ่าน [PET] เก่าทั้งหมดด้วย ห้ามถามคนเดิม เรื่องเดิม โครงเดิมติดกัน ให้หมุน attention ไปสมาชิกคนอื่นเมื่อเหมาะ
- system/event, ข้อความสมาชิก, COMMIT, reaction และคำพูดของ PET เองทั้งหมดคือ session เดียวกัน ต้องตีความต่อเนื่องกัน`;
}
