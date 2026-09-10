/** Action presentation only. No timers, random rewards, save writes, or state changes. */
const define = (presentation, group, title, variant = group) => Object.freeze({ presentation, group, title, variant });
const scene = (group, title, variant) => define('vignette', group, title, variant);
const primary = (group, title, variant) => define('primary', group, title, variant);
const automatic = title => define('automatic', 'transition', title);
const selection = title => define('selection', 'selection', title);

// Every player/automatic event has an explicit classification. The coverage test
// intentionally fails when an engine event is added without a visual decision.
export const ACTION_SCENE_MAP = Object.freeze({
  START_PATH: primary('welcome', 'เริ่มเส้นทาง'),
  WEAR_BAND: primary('band', 'ใส่ Xircle Band'),
  START_SELF_SCALE: primary('measurement', 'ดูข้อมูลตั้งต้น'),
  SELF_SCAN_COMPLETE: automatic('สรุปข้อมูลตั้งต้น'),
  START_MONTAGE: primary('routine', 'ลงมือทำทุกวัน'),
  MONTAGE_COMPLETE: automatic('จบช่วงฝึกประจำวัน'),
  SELECT_PRACTICE: selection('เลือกคำตอบฝึก'),
  SUBMIT_PRACTICE: scene('study', 'ลองตอบจากเคส', 'answer'),
  REPAIR_PRACTICE: scene('study', 'ทบทวนจุดที่พลาด', 'repair'),
  CONTINUE_PRACTICE: primary('study', 'ฝึกต่อจากเคส'),
  START_DAY14_SCALE: primary('measurement', 'ทบทวนวันที่ 14'),
  DAY14_SCAN_COMPLETE: automatic('สรุปวันที่ 14'),
  START_DAY28_SCALE: primary('measurement', 'ทบทวนวันที่ 28'),
  DAY28_SCAN_COMPLETE: automatic('สรุปวันที่ 28'),
  GO_EXAM: primary('study', 'เดินทางไปสอบ'),
  EXAM_TRANSIT_COMPLETE: automatic('ถึงห้องสอบ'),
  SELECT_EXAM: selection('เลือกคำตอบสอบ'),
  SUBMIT_EXAM: scene('study', 'ส่งคำตอบ', 'answer'),
  NEXT_EXAM: scene('study', 'อ่านเคสถัดไป', 'read'),
  START_REPAIRS: scene('study', 'ทบทวนก่อนผ่าน', 'repair'),
  REPAIR_EXAM: scene('study', 'แก้คำตอบจากเคส', 'repair'),
  COMPLETE_CERTIFICATION: primary('certification', 'รับการรับรอง'),
  CEREMONY_COMPLETE: automatic('จบพิธีรับรอง'),
  START_MONTH_1: primary('welcome', 'เปิดสำนักงาน'),
  FIND_PERSON: primary('welcome', 'รู้จักคนใหม่'),
  TALK: primary('meeting', 'ฟังสิ่งที่อยากเปลี่ยน'),
  REQUEST_CONSENT: scene('consent', 'ขออนุญาตดูข้อมูล'),
  START_CUSTOMER_BASELINE: primary('measurement', 'วัดข้อมูลตั้งต้น'),
  CUSTOMER_BASELINE_COMPLETE: automatic('สรุปข้อมูลลูกค้า'),
  OPEN_ROUTINE_BUILDER: primary('routine', 'วางแผนด้วยกัน'),
  CHOOSE_ROUTINE: scene('routine', 'เลือก Routine', 'choose'),
  MAKE_OFFER: scene('offer', 'คุยแฟ้ม X'),
  CLOSE_RECEIPT: scene('delivery', 'สรุปสิ่งที่เริ่มใช้', 'receipt'),
  START_ONBOARDING: scene('onboarding', 'เริ่มวันแรกด้วยกัน'),
  FOLLOW_UP_CUSTOMER: scene('followup', 'ติดตามสิ่งที่ทำจริง'),
  START_CUSTOMER_REVIEW: primary('measurement', 'กลับมาดูผลร่วมกัน'),
  CUSTOMER_REVIEW_COMPLETE: automatic('สรุปผลทบทวน'),
  SAVE_SUCCESS: scene('review', 'บันทึกผลของเคส', 'case'),
  CONTINUE_CARE: scene('care', 'ดูแลต่อเนื่อง'),
  EXPLAIN_XVISOR: scene('invitation', 'อธิบายเส้นทาง X-VISOR'),
  PREPARE_G1: primary('certification', 'เตรียมทีมคนแรก'),
  START_WEEKLY: primary('mentoring', 'ทบทวนงานทีม'),
  WEEKLY_COMPLETE: automatic('จบการทบทวนทีม'),
  CREATE_LEAD: scene('welcome', 'รู้จักคนใหม่'),
  CONTACT_PROSPECT: scene('message', 'ติดต่อและนัดหมาย'),
  MEET_PROSPECT: scene('meeting', 'พบและรับฟัง'),
  CONSULT_PROSPECT: scene('meeting', 'คุยให้เข้าใจ', 'consult'),
  BASELINE_PROSPECT: scene('measurement', 'ดูข้อมูลตั้งต้น'),
  OPEN_MANAGEMENT_ROUTINE: primary('routine', 'วางแผนด้วยกัน'),
  CHOOSE_MANAGEMENT_ROUTINE: scene('routine', 'เลือก Routine', 'choose'),
  OFFER_PROSPECT: scene('offer', 'คุยแฟ้ม X'),
  CARE_CUSTOMER: scene('care', 'ดูแลและปรับแผน'),
  REMEASURE_CUSTOMER: scene('measurement', 'ทบทวนแนวโน้ม', 'review'),
  REORDER_CUSTOMER: scene('delivery', 'ทำ Routine ต่อ', 'reorder'),
  ASK_REFERRAL: scene('referral', 'รู้จักผ่านการแนะนำ'),
  FOLLOW_UP_DECISION: scene('followup', 'กลับมาคุยตามจังหวะ', 'decision'),
  TRAIN_SKILL: scene('study', 'ฝึกทักษะจากเคส', 'skill'),
  INVITE_XVISOR: scene('invitation', 'ชวนมารู้จักบทบาท'),
  START_CANDIDATE_XCADEMY: scene('study', 'เริ่มเรียน Xcademy', 'candidate'),
  REVIEW_CANDIDATE: scene('mentoring', 'ทบทวนเคสผู้สมัคร', 'candidate'),
  CERTIFY_CANDIDATE: primary('certification', 'รับรอง X-VISOR'),
  RUN_XCADEMY: primary('study', 'เรียน Xcademy ร่วมกัน'),
  RUN_OPEN_HOUSE: primary('invitation', 'เปิด Open House'),
  RUN_CENTER: primary('study', 'เรียน Xcademy ร่วมกัน'),
  RUN_GOOD_LUCK: primary('invitation', 'เปิด Open House'),
  REVIEW_TEAM_LEADERS: scene('review', 'ทบทวนผู้นำทีม', 'leaders'),
  SCENE_COMPLETE: automatic('จบฉากกิจกรรม'),
  RUN_WEEKLY: primary('mentoring', 'ทบทวนงานประจำสัปดาห์'),
  MENTOR_TEAM_MEMBER: scene('mentoring', 'ช่วยทีมลงมือทำ', 'member'),
  RUN_MONTHLY_EVENT: primary('invitation', 'กิจกรรมประจำเดือน'),
  END_MONTH: scene('month', 'ทบทวนเดือนนี้', 'close'),
  START_NEXT_MONTH: scene('month', 'เปิดเดือนใหม่', 'open'),
  RUN_XIRCLE: primary('camp', 'ร่วม The Xircle'),
  XLEAD_EXAM: primary('certification', 'สอบรับรอง XLEAD'),
  XGEN_EXAM: primary('certification', 'สอบรับรอง XGEN'),
  NEW_GAME_PLUS: primary('welcome', 'เริ่มรอบใหม่'),
  ENTER_ORGANIZATION: primary('organization', 'เปิดปีแห่งองค์กร'),
  FAST_TRACK_FULL_START: scene('onboarding', 'คุยแฟ้ม X แบบครบชุด', 'full-start'),
  RUN_LIVE: primary('live', 'ไลฟ์คุยแฟ้ม X'),
  RESOLVE_ENCOUNTER: scene('meeting', 'เลือกสิ่งเล็กที่ทำต่อได้'),
});

const primaryStages = new Set([
  'pre_day0_scanning', 'pre_day14_scanning', 'pre_day28_scanning', 'pre_montage',
  'pre_day7_practice', 'pre_day21_care', 'exam_active', 'exam_repair', 'exam_summary',
  'exam_transit', 'certification_ceremony', 'm1_baseline_scanning', 'm1_review_scanning',
  'm1_weekly_running', 'content_running', 'ads_running', 'xcademy_running',
  'center_running', 'open_house_running', 'good_luck_running', 'g1_celebration',
  'xlead_milestone', 'xgen_milestone', 'xircle_running', 'live_running', 'season_review',
]);
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const people = state => [...state?.prospects || [], ...state?.customers || [], ...state?.team || []];
const personKey = item => item?.personId || item?.id;
const personMatches = (item, id) => id && (item.id === id || item.personId === id);
const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
const shortText = (value, length = 90) => {
  const text = cleanText(value);
  return [...text].length > length ? [...text].slice(0, length - 1).join('') + '…' : text;
};

function actionPeople(previous, next, event, payload) {
  const before = people(previous), after = people(next);
  const added = after.find(item => !before.some(old => personKey(old) === personKey(item)));
  const id = payload.id || payload.personId || payload.targetId;
  const target = after.find(item => personMatches(item, id)) || before.find(item => personMatches(item, id));
  const selected = after.find(item => personMatches(item, next.selectedPersonId));
  const subject = ['TRAIN_SKILL', 'END_MONTH', 'START_NEXT_MONTH', 'NEW_GAME_PLUS'].includes(event) || event === 'RESOLVE_ENCOUNTER' && previous.encounters?.pending?.targetKind === 'player' ? null
    : event === 'REVIEW_TEAM_LEADERS' ? next.team?.find(member => member.rank === 'xlead') || next.team?.[0]
    : ['CREATE_LEAD', 'FIND_PERSON', 'ASK_REFERRAL'].includes(event) ? added || selected || target : target || selected;
  const visual = item => item ? {
    id: item.id, name: cleanText(item.name), appearance: { ...item.appearance },
    band: Boolean(item.day !== undefined || item.activePlan || item.xvisorStage || (next.team || []).some(member => personMatches(member, item.id))),
  } : null;
  return { person: visual(subject), companion: event === 'ASK_REFERRAL' ? visual(target) : null, target };
}

function changedNumbers(previous, next, payload) {
  const deltas = {};
  for (const key of ['prospects', 'customers', 'team']) {
    const delta = (next[key]?.length || 0) - (previous[key]?.length || 0);
    if (delta) deltas[key] = delta;
  }
  for (const key of ['energy', 'month']) {
    const delta = number(next[key]) - number(previous[key]);
    if (delta) deltas[key] = delta;
  }
  const skill = payload.skill;
  if (skill && previous.skills?.[skill] && next.skills?.[skill]) {
    const xp = number(next.skills[skill].xp) - number(previous.skills[skill].xp);
    if (xp) deltas.skillXp = xp;
  }
  return deltas;
}

/** A serializable visual description. Unknown events are explicit, never generic. */
export function getActionMoment(previous, next, event, payload = {}) {
  let definition = ACTION_SCENE_MAP[event];
  if (!definition) return { presentation: 'none', reason: 'unclassified-event', event };
  const encounter = event === 'RESOLVE_ENCOUNTER' ? previous?.encounters?.pending : null;
  if (encounter) {
    if (payload.choiceId === 'skip') return { ...definition, presentation: 'selection', reason: 'deferred-encounter', event };
    const moments = {
      'content-question': scene('meeting', 'คุยต่อจากคอนเทนต์'),
      'followup-reset': scene('care', 'ปรับสิ่งที่ทำต่อได้'),
      'baseline-pattern': scene('measurement', 'ดูข้อมูลแล้วถามต่อ', 'review'),
      'team-rehearsal': scene('mentoring', 'ซ้อมคุยจากเคสจริง'),
      'small-win': scene('review', 'เห็นสิ่งเล็กที่ดีขึ้น', 'case'),
      'quiet-week': scene(payload.choiceId === 'rest' ? 'care' : 'study', payload.choiceId === 'rest' ? 'พักแล้วกลับมาใหม่' : 'เรียนในวันที่งานเบา', payload.choiceId === 'rest' ? 'rest' : 'knowledge'),
      'live-recap': scene('study', 'ทบทวนหลัง LIVE', 'live-review'),
      'consent-check': scene('consent', 'ให้พื้นที่ตัดสินใจ'),
    };
    definition = moments[encounter.key];
    if (!definition) return { presentation: 'none', reason: 'unclassified-encounter', event };
    payload = { ...payload, id: encounter.targetId };
  }
  if (definition.presentation === 'automatic' || definition.presentation === 'selection') return { ...definition, event };
  if (!previous || !next || previous === next) return { ...definition, presentation: 'none', reason: 'unchanged-state', event };
  if (next.organizationMode || next.runComplete || next.campaignScore?.locked || primaryStages.has(next.stage) ||
      definition.presentation === 'primary' && previous.stage !== next.stage) {
    return { ...definition, presentation: 'primary', reason: 'existing-story-scene', event };
  }
  const { person, companion, target } = actionPeople(previous, next, event, payload);
  const deltas = changedNumbers(previous, next, payload);
  const changedMessage = next.lastMessage && next.lastMessage !== previous.lastMessage ? cleanText(next.lastMessage) : '';
  const selected = people(next).find(item => personMatches(item, payload.id || next.selectedPersonId));
  const beforePerson = people(previous).find(item => personMatches(item, payload.id || previous.selectedPersonId));
  const newFeedback = next.exam?.feedback || next.preseason?.practiceFeedback;
  const oldFeedback = previous.exam?.feedback || previous.preseason?.practiceFeedback;
  const renewalConversation = event === 'REORDER_CUSTOMER' &&
    (!next.economy?.lastTransaction?.id || next.economy.lastTransaction.id === previous.economy?.lastTransaction?.id);
  if (renewalConversation) definition = scene('followup', 'ฟังจังหวะของลูกค้า', 'decision');
  const paused = /(_NO|_WRONG|TOO_MUCH|UNAVAILABLE)$/.test(next.lastEvent || '') || newFeedback === 'wrong' ||
    renewalConversation || /ยังไม่พร้อม|ขอคิด|ขอเวลา|ยังไม่ใช่จังหวะ|ต้องใช้ทั้งหมด|กำลังเตรียมสอบ|ยังไม่ผ่าน|ต้องแตะ|ก่อนจบเดือน/.test(changedMessage);
  const labels = { prospects: 'คนใหม่', customers: 'ลูกค้า', team: 'ทีม', energy: 'พลังงาน', skillXp: 'XP' };
  const measured = Object.entries(deltas).filter(([key]) => key !== 'month').map(([key, delta]) => `${labels[key]} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`);
  let detail = changedMessage || (selected?.status !== beforePerson?.status ? selected?.status : '') || measured.join(' · ');
  if (encounter && selected && beforePerson) {
    const fields = { trust: 'ความไว้ใจ', readiness: 'ความพร้อม', adherence: 'ความต่อเนื่อง', confidence: 'ความมั่นใจ', autonomy: 'ทำงานเอง' };
    const actual = Object.entries(fields).map(([key, label]) => [label, number(selected[key]) - number(beforePerson[key])]).filter(([, value]) => value !== 0);
    if (actual.length) detail = `${selected.name} · ${actual.map(([label, delta]) => `${label} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`).join(' · ')}`;
  }
  const settlement = next.settlements?.[String(previous.month)];
  if (event === 'END_MONTH' && next.stage !== previous.stage && settlement?.settled && Number.isFinite(settlement.totalIncome)) {
    detail = `เดือน ${previous.month} · รายได้ ฿${Math.round(settlement.totalIncome).toLocaleString('th-TH')}`;
  }
  if (deltas.month) detail = `เดือน ${next.month} · พลังงาน ${next.energy}`;
  // If the reducer provided neither a changed field nor a message, avoid
  // inventing a success just because it returned a normalized object.
  if (!detail && previous.stage === next.stage && newFeedback === oldFeedback && next.lastEvent === previous.lastEvent) {
    return { ...definition, presentation: 'none', reason: 'no-observable-change', event };
  }
  detail ||= newFeedback === 'wrong' ? 'กลับไปทบทวนคำตอบ' : newFeedback === 'correct' ? 'คำตอบถูกต้อง' : person?.name || definition.title;
  let variant = definition.variant;
  if (event === 'CREATE_LEAD') variant = payload.source || 'known';
  if (event === 'CONTACT_PROSPECT') variant = payload.mode || payload.method || 'phone';
  if (event === 'TRAIN_SKILL') variant = payload.skill || 'knowledge';
  if (['OFFER_PROSPECT', 'MAKE_OFFER', 'FAST_TRACK_FULL_START'].includes(event)) variant = paused ? 'considering' : deltas.customers > 0 ? 'accepted' : definition.variant;
  if (['CHOOSE_ROUTINE', 'CHOOSE_MANAGEMENT_ROUTINE'].includes(event)) variant = paused ? 'considering' : selected?.careOnly || payload.planId === 'control' ? 'care-only' : deltas.customers > 0 ? 'accepted' : 'choose';
  const products = selected?.routinePlan?.products || target?.routinePlan?.products || [];
  const locations = {
    welcome: ['community', 'garden'], message: ['office', 'community'], meeting: ['community', 'garden', 'office'],
    consent: ['office'], measurement: ['office', 'kitchen'], routine: ['kitchen'], offer: ['office', 'kitchen'],
    onboarding: ['kitchen'], band: ['office'], followup: ['community', 'garden'], care: ['kitchen', 'garden'],
    delivery: ['community'], referral: ['community', 'garden'], invitation: ['academy', 'community'],
    study: ['academy', 'garden'], mentoring: ['academy', 'office'], review: ['office', 'academy'],
    certification: ['academy'], month: ['office'], camp: ['garden'], organization: ['office'], live: ['studio'],
  };
  const variation = Math.abs([...`${person?.id || event}:${next.month}`].reduce((sum, character) => sum + character.charCodeAt(0), 0) + number(next.energy) + number(selected?.followups)) % 3;
  const options = locations[definition.group];
  return {
    ...definition, presentation: 'vignette', event, variant, person, companion,
    title: definition.title, detail: shortText(detail), fullDetail: cleanText(detail),
    duration: ['month', 'measurement', 'mentoring'].includes(definition.group) ? 1150 : 1000,
    outcome: paused ? 'paused' : 'progress', deltas,
    products: renewalConversation ? [] : products.filter(id => typeof id === 'string' && id !== 'control').slice(0, 4),
    month: next.month,
    location: encounter?.key === 'live-recap' ? 'studio' : variant === 'rest' ? 'garden' : options[variation % options.length], variation,
  };
}
