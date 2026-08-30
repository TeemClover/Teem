import {
  EVENTS,
  MAX_ENERGY,
  STAGES,
  calculateEconomy,
  getCurrentExamQuestion,
} from "./game-data.js";
import { commercialStatusLabel, TUTORIAL_OFFER } from "./game-commercial-config.js";

const action = (label, event, options = {}) => ({ label, event, ...options });
const links = [
  ["ดูข้อมูล Xircle", "/xircle/hardware/"],
  ["ดูข้อมูล RoutineX", "/xircle/routinex/"],
  ["ดูข้อมูลผลิตภัณฑ์", "/xircle/products/"],
];

function selectedPerson(state) {
  return [...state.prospects, ...state.customers, ...state.team]
    .find((person) => person.id === state.selectedPersonId)
    || state.prospects[0] || state.customers[0] || state.team[0];
}

function practiceContent(state, day) {
  const isDay7 = day === 7;
  const feedback = state.preseason.practiceFeedback;
  const selected = state.preseason.selectedPractice;
  const choices = isDay7
    ? [["buy_more", "เพิ่มสินค้าอีกตัวทันที"], ["context", "ฟังบริบท แล้วเลือกสิ่งเล็กที่ทำได้จริง"], ["ignore", "รอดูต่อโดยไม่คุยอะไร"]]
    : [["numbers", "สรุปจากตัวเลขทันที"], ["ask_context", "ถามบริบทชีวิตก่อน"], ["blame_band", "บอกว่า Band น่าจะอ่านผิด"]];
  const actions = feedback === "wrong"
    ? [action("ลองซ่อมอีกครั้ง", EVENTS.REPAIR_PRACTICE, { icon: "repair" })]
    : feedback === "correct"
      ? [action(isDay7 ? "ไปต่อถึง Day 14" : "ไปต่อถึง Day 28", EVENTS.CONTINUE_PRACTICE, { icon: "calendar" })]
      : [action("ส่งคำตอบ", EVENTS.SUBMIT_PRACTICE, { icon: "submit", disabled: !selected })];
  return {
    scene: isDay7 ? "practice_data" : "practice_care",
    progress: isDay7 ? 20 : 34,
    eyebrow: `PRE-SEASON · DAY ${day}`,
    title: isDay7 ? "เห็นข้อมูล แล้วฟังคนก่อนเลือก" : "ฝึก CARE จากสถานการณ์จริง",
    reason: isDay7 ? "Sleep ลดลงไม่ได้แปลว่าต้องซื้ออะไรเพิ่ม คำตอบเริ่มจากชีวิตจริง" : "ตัวเลขเป็นจุดเริ่มคุย ไม่ใช่คำตัดสิน",
    speaker: isDay7 ? "Guided Data Practice" : "ลูกค้าจำลอง",
    dialogue: isDay7 ? "ข้อมูลบอกว่า Sleep ลดลงหลายวัน คุณควรทำอะไรก่อน?" : "“ช่วงนี้เราเหนื่อยมาก แต่ข้อมูลก็ดูแปลก ๆ” คุณจะตอบอย่างไร?",
    quiz: {
      choices, selected, feedback,
      repair: isDay7
        ? "นี่คือ C · Control: เห็น → ฟัง → เลือก และไม่มีสินค้าใดทำแทนได้"
        : "CARE เริ่มจากถามบริบท ไม่สรุปจากเลขและไม่โทษอุปกรณ์",
    },
    actions,
  };
}

function examContent(state) {
  const question = getCurrentExamQuestion(state);
  const repairing = state.stage === STAGES.EXAM_REPAIR;
  const feedback = state.exam?.feedback;
  const selected = state.exam?.selected;
  const index = repairing ? state.exam.repairIndex : state.exam.index;
  let actions = [action("ส่งคำตอบ", EVENTS.SUBMIT_EXAM, { icon: "submit", disabled: !selected })];
  if (feedback === "correct") actions = [action(repairing ? "ไปข้อซ่อมถัดไป" : "ไปข้อต่อไป", EVENTS.NEXT_EXAM, { icon: "next" })];
  if (feedback === "wrong") actions = [action(repairing ? "ซ่อมข้อนี้อีกครั้ง" : "จำหลักนี้ แล้วไปข้อต่อไป", repairing ? EVENTS.REPAIR_EXAM : EVENTS.NEXT_EXAM, { icon: "repair" })];
  return {
    scene: "exam_active", progress: 50,
    eyebrow: repairing ? "CERTIFICATION · REPAIR" : "CERTIFICATION EXAM",
    title: repairing ? `ซ่อมข้อ ${index + 1} / ${state.exam.repairQueue.length}` : `ข้อ ${index + 1} / 5`,
    reason: "เลือกให้ครบก่อน แล้วกดส่งคำตอบ ระบบจะยังไม่เฉลยล่วงหน้า",
    speaker: "Xcademy Exam Room", dialogue: question.question,
    quiz: { choices: question.choices, selected, feedback, repair: feedback ? question.repair : "", exam: true },
    actions,
  };
}

function routineContent(state, management = false) {
  const person = selectedPerson(state);
  const tooMuch = state.lastEvent === "ROUTINE_TOO_MUCH";
  return {
    scene: "routine_builder", progress: management ? 76 : 68,
    eyebrow: "ROUTINE BUILDER · ABCD", title: `วาง Routine ให้${person?.name || "คนนี้"}`,
    reason: "เริ่มจากบริบทและสิ่งที่ทำได้จริง ไม่ใช่เลือกสินค้าที่จะขาย",
    speaker: tooMuch ? person?.name || "ลูกค้า" : "RoutineX",
    dialogue: tooMuch ? "“ต้องใช้ทั้งหมดเลยเหรอ?” แผนที่เยอะเกินไปทำให้ความไว้ใจลดลง ลองวางใหม่" : `${person?.name || "ลูกค้า"}บอกว่า “${person?.quote || "อยากเริ่มจากสิ่งที่ทำได้จริง"}”`,
    routineBuilder: {
      fitProducts: person?.fitProducts || [],
      choices: [
        ["control", "เริ่มจาก C · Control", "ไม่มีสินค้า · เลือกพฤติกรรมเดียวที่ทำซ้ำได้"],
        ["fit", "วางตามบริบท", "ใช้ A / B / D เฉพาะเมื่อสอดคล้องกับสิ่งที่ฟังมา"],
        ["all", "ใส่ทุกตัว", "แผนใหญ่ที่สุด แต่ไม่ใช่กลยุทธ์ที่ดีที่สุด"],
      ],
    },
    actions: [], routineEvent: management ? EVENTS.CHOOSE_MANAGEMENT_ROUTINE : EVENTS.CHOOSE_ROUTINE,
    deepLinks: links,
  };
}

const missionAction = (mission) => {
  const map = {
    care: ["ติดตามลูกค้า", EVENTS.CARE_CUSTOMER, "care", 2],
    remeasure: ["วัดซ้ำ", EVENTS.REMEASURE_CUSTOMER, "scale", 2],
    consult: ["ฟังบริบท", EVENTS.CONSULT_PROSPECT, "talk", 2],
    baseline: ["ขอ consent + Baseline", EVENTS.BASELINE_PROSPECT, "scale", 2],
    routine: ["วาง Routine", EVENTS.OPEN_MANAGEMENT_ROUTINE, "plan", 0],
    offer: ["คุยแผน", EVENTS.OFFER_PROSPECT, "offer", 1],
    reorder: ["ทบทวนรอบต่อไป", EVENTS.REORDER_CUSTOMER, "offer", 1],
    referral: ["ขอ Referral", EVENTS.ASK_REFERRAL, "talk", 1],
    mentor: ["ช่วย X-VISOR ใหม่", EVENTS.MENTOR_TEAM_MEMBER, "team", 2],
  };
  const value = map[mission.type];
  return value && action(value[0], value[1], { id: mission.targetId, icon: value[2], cost: value[3] });
};

function managementContent(state) {
  const actions = state.missions.map(missionAction).filter(Boolean).slice(0, 2);
  if (actions.length < 3) actions.push(action("เปิดเมนูงาน", null, { ui: "work", icon: "briefcase" }));
  return {
    scene: state.monthStats.weeklyDone ? "management_team" : "management",
    progress: Math.min(98, 76 + state.month), eyebrow: `MONTH ${state.month} · MANAGEMENT`,
    title: state.missions[0]?.label || "เลือกงานที่สร้างคุณค่าต่อ",
    reason: "XOS ช่วยจัดลำดับ แต่คุณยังต้องเลือก ลงมือ และดูแลผลลัพธ์เอง",
    speaker: "XOS · วันนี้ควรดูใครก่อน",
    dialogue: state.lastMessage || "คน ลูกค้า และทีมมีจังหวะไม่เหมือนกัน ใช้พลังงานกับสิ่งสำคัญที่สุดก่อน",
    management: {
      missions: state.missions, prospects: state.prospects, customers: state.customers,
      team: state.team, stats: state.monthStats, economy: calculateEconomy(state),
    },
    actions: actions.slice(0, 3),
  };
}

export function getStageContent(state) {
  if ([STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR].includes(state.stage)) return examContent(state);
  if (state.stage === STAGES.PRE_DAY7_PRACTICE) return practiceContent(state, 7);
  if (state.stage === STAGES.PRE_DAY21_CARE) return practiceContent(state, 21);
  if (state.stage === STAGES.M1_ROUTINE) return routineContent(state);
  if (state.stage === STAGES.MANAGEMENT_ROUTINE) return routineContent(state, true);
  if (state.stage === STAGES.MANAGEMENT) return managementContent(state);

  const person = selectedPerson(state);
  const name = person?.name || "คนแรก";
  const transaction = state.economy.lastTransaction;
  const passed = state.exam ? Object.values(state.exam.results).filter(Boolean).length : 0;
  const copy = {
    [STAGES.OPENING]: {
      scene: "opening", progress: 0, eyebrow: "NEW GAME · PRE-SEASON", title: "สร้างความพร้อม 28 วัน ก่อนดูแลคนจริง",
      reason: "เริ่มจากใช้เอง เรียนรู้ข้อมูล และฝึกการดูแล ก่อนสอบเป็น X-VISOR", speaker: "X-VISOR QUEST",
      dialogue: "ตอนนี้คุณยังไม่มีลูกค้า ไม่มีทีม และยังไม่มีรายได้ — ก้าวแรกคือเรียนรู้จากตัวเอง",
      actions: [action("เริ่ม PRE-SEASON", EVENTS.START_PATH, { icon: "play" })],
    },
    [STAGES.PRE_DAY0_BAND]: {
      scene: "pre_band", progress: 3, eyebrow: "PRE-SEASON · DAY 0", title: "ใส่ Xircle Band",
      reason: "Band ช่วยเห็นสิ่งที่คุณทำต่อเนื่องระหว่างวัน", speaker: "Xircle Band",
      dialogue: "Band ทำงานเงียบ ๆ เพื่อสะท้อนการขยับและสัญญาณที่ระบบรองรับ — ไม่ได้วัดอาหารโดยตรง",
      actions: [action("ใส่ Band", EVENTS.WEAR_BAND, { icon: "band" })], deepLinks: [links[0]],
    },
    [STAGES.PRE_DAY0_SCALE]: {
      scene: "pre_scale", progress: 5, eyebrow: "PRE-SEASON · DAY 0", title: "ขึ้น Xircle Scale",
      reason: "Scale ช่วยเห็นสิ่งที่ร่างกายตอบ เพื่อใช้ดูแนวโน้ม ไม่ใช่วินิจฉัย", speaker: "Xircle Scale",
      dialogue: "ยืนให้นิ่ง เท้าวางบนตำแหน่งเดิม แล้วเก็บ Baseline ครั้งแรก",
      actions: [action("เริ่มวัด Baseline", EVENTS.START_SELF_SCALE, { icon: "scale" })],
    },
    [STAGES.PRE_DAY0_SCANNING]: {
      scene: "pre_scanning", progress: 6, eyebrow: "PRE-SEASON · DAY 0", title: "กำลังเก็บ Baseline",
      reason: "Weight อย่างเดียวไม่พอ ต้องอ่าน Body Fat และ muscle-related trend ร่วมกัน", speaker: "Xircle",
      dialogue: "กำลังวัด…", status: "scan", actions: [],
    },
    [STAGES.PRE_DAY0_SUMMARY]: {
      scene: "pre_summary", progress: 8, eyebrow: "BASELINE พร้อมแล้ว", title: "แยกให้ออกว่าอะไรบอกอะไร",
      reason: "ข้อมูลสองชั้นช่วยให้คุณไม่รีบสรุปจากเลขเดียว", speaker: "หลักแรกของ Xircle",
      dialogue: "Band = สิ่งที่คุณทำ · Scale = สิ่งที่ร่างกายตอบ",
      facts: [["BAND", "การขยับและสัญญาณระหว่างวัน"], ["SCALE", "Body Composition และ Trend"]],
      actions: [action("เริ่ม Routine ถึง Day 3", EVENTS.START_MONTAGE, { icon: "calendar" })], deepLinks: [links[0]],
    },
    [STAGES.PRE_MONTAGE]: {
      scene: "pre_montage", progress: Math.max(10, state.energy * 1.25), eyebrow: "ROUTINEX · 28 DAYS", title: "ทำสิ่งที่เลือกให้เกิดซ้ำ",
      reason: "แต่ละวันกำลังสร้างทั้งประสบการณ์ ความรู้ และพลังงานของคุณ", speaker: "RoutineX",
      dialogue: "ใช้ชีวิต · Band sync · เลือก C · Control · เรียนรู้ตัวช่วยตามบริบท", status: "montage", actions: [],
    },
    [STAGES.PRE_DAY3_ABCD]: {
      scene: "pre_abcd", progress: 14, eyebrow: "CHECKPOINT · DAY 3", title: "สิ่งที่ซื้อไม่ได้ สำคัญที่สุด",
      reason: "ABCD ช่วยวาง Routine โดยเริ่มจากการกระทำ ไม่ใช่เริ่มจากสินค้า", speaker: "RoutineX · ABCD",
      dialogue: "A / B / D มีตัวช่วยตามบริบท ส่วน C · Control คือสิ่งที่คุณทำเองและไม่มีขาย", abcd: true,
      facts: [["A · ABSORB", "G.U.S.+ · gut / digestive routine"], ["B · BUILD", "Protein HMB+ · protein / muscle-maintenance support"], ["C · CONTROL", "พฤติกรรม · ไม่มีสินค้า"], ["D · DAILY BALANCE", "Vita Matrix + AstaMega+"]],
      actions: [action("เรียนรู้ต่อถึง Day 7", EVENTS.START_MONTAGE, { icon: "calendar" })], deepLinks: [links[1], links[2]],
    },
    [STAGES.PRE_DAY14_SCALE]: {
      scene: "pre_day14_scale", progress: 26, eyebrow: "CHECKPOINT · DAY 14", title: "กลับมาดู Body Trend",
      reason: "อย่าตัดสินจากครั้งเดียว — รอบนี้อาจดีขึ้นบางค่า คงเดิม หรือแกว่ง", speaker: "Xircle Scale",
      dialogue: "วางเท้าบน Scale แล้วเปรียบเทียบ Baseline → Day 14",
      actions: [action("วัด Day 14", EVENTS.START_DAY14_SCALE, { icon: "scale" })],
    },
    [STAGES.PRE_DAY14_SCANNING]: {
      scene: "pre_day14_scanning", progress: 27, eyebrow: "BASELINE → DAY 14", title: "กำลังอ่านแนวโน้ม",
      reason: "Scale ไม่ได้สร้าง Habit Score และไม่ได้วัด Sleep โดยตรง", speaker: "Xircle", dialogue: "กำลังวัด…", status: "scan", actions: [],
    },
    [STAGES.PRE_DAY14_REVIEW]: {
      scene: "pre_day14_review", progress: 29, eyebrow: "BODY REVIEW · DAY 14", title: "ดู Trend มากกว่าเลขครั้งเดียว",
      reason: "Body Fat ดีขึ้นเล็กน้อย ขณะที่ Weight คงเดิม — นี่ไม่ใช่คำวินิจฉัย", speaker: "Xircle",
      dialogue: "ข้อมูลยังไม่ดีทุกอย่าง และคำตอบไม่ใช่ซื้อของเพิ่มเสมอไป",
      resultCards: [["Weight", "คงเดิม", "neutral"], ["Body Fat", "แนวโน้มดีขึ้น", "good"], ["Muscle-related", "ยังแกว่ง", "warn"]],
      facts: [["VITA MATRIX", "D · Daily Balance · water-phase support"], ["ASTAMEGA+", "D · Daily Balance · oil-phase support"], ["สำคัญ", "ไม่จำเป็นว่าทุกคนต้องใช้ทุกตัว"]],
      actions: [action("ไปต่อถึง Day 21", EVENTS.START_MONTAGE, { icon: "calendar" })], deepLinks: [links[0], links[2]],
    },
    [STAGES.PRE_DAY28_SCALE]: {
      scene: "pre_day28_scale", progress: 40, eyebrow: "FINAL CHECKPOINT · DAY 28", title: "วัดซ้ำหลังทำ Routine ครบ 28 วัน",
      reason: "ดูสิ่งที่ทำคู่กับสิ่งที่ร่างกายตอบ แล้วเลือกสิ่งที่ควรทำต่อ", speaker: "Xircle Scale",
      dialogue: "นี่คือการทบทวน ไม่ใช่เส้นชัยอัตโนมัติ", actions: [action("วัด Day 28", EVENTS.START_DAY28_SCALE, { icon: "scale" })],
    },
    [STAGES.PRE_DAY28_SCANNING]: {
      scene: "pre_day28_scanning", progress: 42, eyebrow: "BASELINE → DAY 28", title: "กำลังสรุป Trend",
      reason: "ข้อมูลจะมีความหมายเมื่อเชื่อมกับบริบทและสิ่งที่คุณทำจริง", speaker: "Xircle", dialogue: "กำลังวัด…", status: "scan", actions: [],
    },
    [STAGES.PRE_DAY28_REVIEW]: {
      scene: "pre_day28_review", progress: 46, eyebrow: "28 วันผ่านไป", title: "คุณสร้างความพร้อม ⚡ 28 / 28 แล้ว",
      reason: "คุณไม่ได้แค่ใช้ RoutineX แต่เริ่มอ่านข้อมูล ฟังบริบท และรู้ว่าสินค้าอยู่ตรงไหน", speaker: "PRE-SEASON COMPLETE",
      dialogue: "Xircle: Data → Meaning → Next Action · RoutineX: ทำสิ่งที่เลือกให้เกิดซ้ำ",
      recap: [["XIRCLE", "Band เห็นสิ่งที่ทำ · Scale เห็นสิ่งที่ร่างกายตอบ"], ["PRODUCT", "A / B / D มีตัวช่วย · C ไม่มีขาย"], ["X-VISOR", "ฟัง → เลือกสิ่งเดียว → ติดตาม → รู้ขอบเขต"]],
      actions: [action("ไปสอบ Certification", EVENTS.GO_EXAM, { icon: "certificate" })], deepLinks: links,
    },
    [STAGES.EXAM_TRANSIT]: {
      scene: "exam_transit", progress: 48, eyebrow: "XCademy", title: "เดินเข้า Exam Room",
      reason: "คุณจะนั่งสอบ 5 ข้อจาก 5 domain และซ่อมเฉพาะข้อที่ยังไม่ผ่านได้", speaker: "Exam Proctor",
      dialogue: "เข้าประตู เดินไปที่โต๊ะ แล้วนั่งให้พร้อม", status: "examTransit", actions: [],
    },
    [STAGES.EXAM_SUMMARY]: {
      scene: "exam_summary", progress: 54, eyebrow: "EXAM SUMMARY", title: passed === 5 ? "ผ่านครบ 5 / 5" : `ผ่านแล้ว ${passed} / 5`,
      reason: passed === 5 ? "คุณผ่านทั้ง 5 domain แล้ว" : `เหลือ ${5 - passed} ข้อที่ต้องซ่อม — ไม่มีการเปิด answer key`, speaker: "Exam Proctor",
      dialogue: passed === 5 ? "พร้อมรับ Certification" : "ความผิดพลาดคือจุดเรียนรู้ ซ่อมเฉพาะหลักที่ยังไม่แม่น",
      actions: passed === 5 ? [action("รับ Certification", EVENTS.COMPLETE_CERTIFICATION, { icon: "certificate" })] : [action("เริ่มซ่อมข้อผิด", EVENTS.START_REPAIRS, { icon: "repair" })],
    },
    [STAGES.CERTIFICATION_CEREMONY]: {
      scene: "ceremony", progress: 58, eyebrow: "CERTIFICATION", title: "Certified X-VISOR",
      reason: "ตอนนี้คุณพร้อมเริ่มดูแลคนจริงในเกมแล้ว", speaker: "Xcademy",
      dialogue: "ลุกจากโต๊ะ รับใบรับรอง และนำสิ่งที่เรียนรู้ไปใช้กับคนจริง", status: "ceremony", actions: [],
    },
    [STAGES.CERTIFIED]: {
      scene: "certified", progress: 60, eyebrow: "CERTIFIED X-VISOR", title: "เริ่มเดือน 1 ที่ลูกค้า 0",
      reason: "⚡ 28 แต้มนี้มาจาก 28 วันที่คุณเรียนรู้และใช้เอง", speaker: "X-VISOR QUEST",
      dialogue: "จากนี้พลังงานคือเวลาที่คุณใช้กับงานต่าง ๆ ในเดือนนี้", milestone: "CERTIFIED",
      actions: [action("เริ่มเดือน 1", EVENTS.START_MONTH_1, { icon: "flag" })],
    },
    [STAGES.M1_EMPTY]: {
      scene: "empty_office", progress: 62, eyebrow: "MONTH 1 · ลูกค้า 0", title: "เริ่มจากรู้จักคน 1 คน",
      reason: "งานแรกไม่ใช่ขาย แต่คือฟังว่าใครอยากเปลี่ยนอะไร", speaker: "Clover Neighborhood",
      dialogue: "เก้าอี้ฝั่งลูกค้ายังว่าง คุณต้องออกไปสร้างบทสนทนาแรก", actions: [action("ออกไปพบคน", EVENTS.FIND_PERSON, { icon: "walk", cost: 2 })],
    },
    [STAGES.M1_PERSON_MET]: {
      scene: "person_arrives", progress: 64, eyebrow: "ATTRACT → CONVERSATION", title: `ฟังว่า${name}อยากเปลี่ยนอะไร`,
      reason: "ยังไม่ต้องเสนออะไร ให้ความสนใจชีวิตจริงของเขาก่อน", speaker: `รู้จัก “${name}” แล้ว`,
      dialogue: person?.quote || "อยากเริ่มดูแลตัวเอง แต่ไม่รู้จะเริ่มตรงไหน", actions: [action(`คุยกับ${name}`, EVENTS.TALK, { icon: "talk", cost: 2 })],
    },
    [STAGES.M1_DISCOVERY]: {
      scene: "consultation", progress: 66, eyebrow: "DISCOVERY", title: `ขออนุญาตก่อนดูข้อมูลของ${name}`,
      reason: "Health summary เป็นข้อมูลอ่อนไหว ดูเฉพาะสิ่งที่จำเป็นต่อการติดตาม", speaker: name,
      dialogue: `“เป้าหมายของเราคือ${person?.need || "เริ่มจากสิ่งที่ทำได้จริง"}”`, actions: [action("ขอ consent", EVENTS.REQUEST_CONSENT, { icon: "consent" })],
    },
    [STAGES.M1_BASELINE_INTRO]: {
      scene: "customer_scale", progress: 67, eyebrow: "BASELINE · CONSENTED", title: `ดู Baseline ร่วมกับ${name}`,
      reason: `${name}อนุญาตให้คุณดูข้อมูลสรุปเพื่อช่วยติดตามแล้ว`, speaker: "Xircle Corner",
      dialogue: "ไม่เปิด raw health dashboard — ดู summary, trend และ Next Action เท่าที่จำเป็น",
      actions: [action("เริ่มวัด Baseline", EVENTS.START_CUSTOMER_BASELINE, { icon: "scale", cost: 3 })],
    },
    [STAGES.M1_BASELINE_SCANNING]: {
      scene: "customer_scanning", progress: 68, eyebrow: "XIRCLE BASELINE", title: `กำลังวัดข้อมูลของ${name}`,
      reason: "Band และ Scale มีหน้าที่ต่างกัน แต่ช่วยให้คุยจากสิ่งที่เห็นร่วมกัน", speaker: "Xircle", dialogue: "กำลังวัด…", status: "scan", actions: [],
    },
    [STAGES.M1_BASELINE]: {
      scene: "customer_result", progress: 69, eyebrow: "DATA → MEANING", title: "วาง Routine จากข้อมูลและบริบท",
      reason: `บริบทของ${name}: ${person?.concern || "อยากเริ่มดูแลตัวเอง"}`, speaker: "Baseline Summary",
      dialogue: "เลือกแผนที่ทำได้จริงก่อน สินค้าเป็นเพียงตัวช่วยตามบริบท",
      resultCards: [["การทำต่อเนื่อง", "ควรเริ่มทีละอย่าง", "warn"], ["Body Trend", "Baseline", "neutral"], ["Next Action", person?.need || "เริ่มจาก C", "good"]],
      actions: [action("เปิด Routine Builder", EVENTS.OPEN_ROUTINE_BUILDER, { icon: "plan" })],
    },
    [STAGES.M1_RECOMMENDATION]: {
      scene: "recommendation", progress: 71, eyebrow: "RECOMMENDATION", title: `คุยแผนที่เหมาะกับ${name}`,
      reason: "อธิบายว่าอะไรคือพฤติกรรม อะไรคือตัวช่วย และติดตามอย่างไร", speaker: "ความพร้อม: พร้อมเริ่ม",
      dialogue: "การขายเกิดหลังความเข้าใจและความพร้อม ไม่ใช่ก่อน Discovery", selectedProducts: person?.routinePlan?.products || [],
      actions: [action("ชวนเริ่ม RoutineX", EVENTS.MAKE_OFFER, { icon: "offer", cost: 1 })],
    },
    [STAGES.M1_SALE_RECEIPT]: {
      scene: "sale", progress: 73, eyebrow: "FIRST SALE", title: `${name}เลือกเริ่ม RoutineX`,
      reason: "รายการขายจบแล้ว แต่งานดูแลเพิ่งเริ่ม", speaker: "Transaction complete",
      dialogue: `ยอดนี้ใช้ ${commercialStatusLabel(TUTORIAL_OFFER.status)} ไม่ใช่ราคา/รายได้ทางการ`, receipt: transaction,
      milestone: "ลูกค้าคนแรก", actions: [action("ดูแลต่อ", EVENTS.CLOSE_RECEIPT, { icon: "care" })],
    },
    [STAGES.M1_ONBOARDING]: {
      scene: "onboarding", progress: 74, eyebrow: "ONBOARDING", title: `ช่วย${name}เริ่มให้ถูกจุด`,
      reason: "ทวนวิธีใช้ วาง C · Control และนัดติดตามก่อนแยกกัน", speaker: name,
      dialogue: "“ถ้าวันไหนหลุด เรากลับมาเริ่มจากสิ่งเล็กที่สุดได้ใช่ไหม?”",
      actions: [action("เริ่ม Routine + นัดติดตาม", EVENTS.START_ONBOARDING, { icon: "calendar", cost: 1 })],
    },
    [STAGES.M1_FOLLOWUP]: {
      scene: "followup", progress: 76, eyebrow: "FOLLOW-UP", title: `อย่าปล่อย${name}ไว้หลังซื้อ`,
      reason: "การติดตามช่วยให้รู้ว่าอะไรทำได้ อะไรติดขัด และควรปรับ Next Action อย่างไร", speaker: `Day 7 · ${name}`,
      dialogue: "“ทำได้บ้าง หลุดบ้าง แต่รู้สึกว่าเริ่มกลับมาได้เร็วขึ้น”",
      actions: [action("ติดตามจนถึง Day 28", EVENTS.FOLLOW_UP_CUSTOMER, { icon: "care", cost: 2 })],
    },
    [STAGES.M1_REVIEW_SCAN]: {
      scene: "review_scale", progress: 78, eyebrow: "DAY 28 · REVIEW", title: `ชวน${name}วัดซ้ำ`,
      reason: "ครบ 28 วันไม่แปลว่า Success อัตโนมัติ ต้องดู adherence, trend และบริบท", speaker: "Xircle Corner",
      dialogue: "เปรียบเทียบ Baseline → Day 28 แล้วคุยว่าอะไรควรทำต่อ",
      actions: [action("วัดซ้ำ", EVENTS.START_CUSTOMER_REVIEW, { icon: "scale", cost: 3 })],
    },
    [STAGES.M1_REVIEW_SCANNING]: {
      scene: "review_scanning", progress: 79, eyebrow: "BASELINE → DAY 28", title: `กำลังดู Trend ของ${name}`,
      reason: "ผลลัพธ์ต้องมาจากการทำต่อเนื่องและการดูแล ไม่ใช่สุ่มแจก", speaker: "Xircle", dialogue: "กำลังวัด…", status: "scan", actions: [],
    },
    [STAGES.M1_REVIEW]: {
      scene: "review_result", progress: 81, eyebrow: "RESULT REVIEW", title: `${name}เริ่มเห็นแนวโน้มดี`,
      reason: "บันทึกสิ่งที่เปลี่ยนและ Next Action รอบต่อไป โดยไม่ใช้คำรับประกัน", speaker: name,
      dialogue: "“ไม่ได้สมบูรณ์ทุกวัน แต่ตอนนี้รู้ว่าหลุดแล้วกลับมายังไง”",
      resultCards: [["Routine", "ทำต่อเนื่องขึ้น", "good"], ["Body Trend", "เริ่มดีขึ้น", "good"], ["Next Action", "ทำต่อแบบไม่เพิ่มภาระ", "neutral"]],
      actions: [action("บันทึก Success Case", EVENTS.SAVE_SUCCESS, { icon: "check" })],
    },
    [STAGES.M1_SUCCESS]: {
      scene: "success", progress: 83, eyebrow: "VALUE CREATED", title: "การดูแลต่อทำให้ผลลัพธ์มีความหมาย",
      reason: "ลูกค้าที่ได้รับการติดตาม มีโอกาสทำต่อ ซื้อซ้ำ หรือบอกต่อจากความไว้ใจ", speaker: name,
      dialogue: "“อยากทำต่อ และอยากรู้ว่าคุณช่วยคนอื่นแบบนี้ได้อย่างไร”", milestone: "SUCCESS CASE",
      actions: [action("ดูแลความสัมพันธ์ต่อ", EVENTS.CONTINUE_CARE, { icon: "care" })],
    },
    [STAGES.M1_XVISOR_INTEREST]: {
      scene: "interest", progress: 85, eyebrow: "ELEVATE", title: `อธิบายบทบาท X-VISOR ให้${name}`,
      reason: "X-VISOR ไม่ใช่แค่คนขาย แต่ฟัง วาง Next Action ติดตาม และรู้ขอบเขต", speaker: name,
      dialogue: "“ถ้าเราอยากช่วยคนอื่นให้เริ่มแบบนี้บ้าง ต้องเรียนอะไร?”", actions: [action("เล่าเส้นทาง Xcademy", EVENTS.EXPLAIN_XVISOR, { icon: "academy" })],
    },
    [STAGES.M1_CANDIDATE]: {
      scene: "candidate", progress: 87, eyebrow: "CANDIDATE → G1", title: `ช่วย${name}เตรียมเป็น X-VISOR`,
      reason: "เขาต้องใช้เอง ฝึก และผ่าน Certification เช่นเดียวกับคุณ", speaker: "Xcademy Path",
      dialogue: "การพัฒนาคนคือทำให้เขาทำได้เอง ไม่ใช่แค่เพิ่มชื่อในทีม", actions: [action("พัฒนาเป็น G1", EVENTS.PREPARE_G1, { icon: "team", cost: 3 })],
    },
    [STAGES.M1_G1]: {
      scene: "first_g1", progress: 89, eyebrow: "FIRST G1", title: "ทีมของคุณเริ่มต้นแล้ว — เกมยังไม่จบ",
      reason: `${name}เป็น X-VISOR ใหม่ แต่ยังมีลูกค้า 0 และยังต้องฝึกจากเคสจริง`, speaker: name,
      dialogue: "“เรายังไม่มั่นใจว่าจะเริ่มคุยกับใครก่อน”", milestone: "FIRST G1",
      actions: [action("จัด Weekly แรก", EVENTS.START_WEEKLY, { icon: "weekly", cost: 3 })],
    },
    [STAGES.M1_WEEKLY_RUNNING]: {
      scene: "weekly", progress: 90, eyebrow: "WEEKLY", title: "ช่วยทุกคนเลือก Next Action",
      reason: "Weekly ไม่ใช่ฉากจบ แต่เป็นระบบดูแลให้คนในทีมเดินต่อ", speaker: "Weekly Table",
      dialogue: "กำลังทบทวนคนที่ควรคุย เคสที่ควรติดตาม และสิ่งที่แต่ละคนจะทำต่อ…", status: "weekly", actions: [],
    },
    [STAGES.M1_TEAM_STARTED]: {
      scene: "team_started", progress: 91, eyebrow: "MONTH 1 COMPLETE", title: "เริ่มเดือนถัดไปเพื่อบริหารงานจริง",
      reason: `${name}รู้ว่าจะทักใครก่อน แต่ยังต้องช่วยจนดูแลลูกค้าคนแรกได้เอง`, speaker: "ทีมของคุณเริ่มต้นแล้ว",
      dialogue: "Month 2 จะไม่มีเส้นเรื่องบังคับ คุณต้องเลือกเองว่าจะหา ดูแล รักษา หรือพัฒนาคน",
      actions: [action("จบเดือน 1", EVENTS.END_MONTH, { icon: "month" })],
    },
    [STAGES.MONTH_CLOSED]: {
      scene: "month_closed", progress: Math.min(98, 75 + state.month), eyebrow: `ปิดรอบ · MONTH ${state.month}`, title: "สรุปคุณค่าที่สร้างในเดือนนี้",
      reason: "รายได้ประมาณถูกปิดรอบและเพิ่มเข้าเงินรับแล้วในแบบจำลองเกม", speaker: "MONTH SUMMARY",
      dialogue: state.month < 24 ? "เดือนใหม่จะรีเซ็ตพลังงานเป็น ⚡ 28 / 28" : "ครบ 24 เดือนแล้ว",
      monthSummary: state.monthSummaries.at(-1), actions: [action(state.month < 24 ? `เริ่มเดือน ${state.month + 1}` : "ดู Season Review", EVENTS.START_NEXT_MONTH, { icon: "month" })],
    },
    [STAGES.SEASON_REVIEW]: {
      scene: "season_review", progress: 100, eyebrow: "24-MONTH REVIEW", title: "องค์กรโตจากคนที่ทำได้เอง",
      reason: "Reach · Sell · Care · Retain · Mentor · Build Systems — ไม่มีรายได้เพราะมีชื่ออยู่ใต้ทีมเฉย ๆ", speaker: "X-VISOR QUEST",
      dialogue: "ช่วงแรกคุณทำเอง ต่อมาคุณทำให้คนอื่นทำได้ และรายได้จึงโตตามคุณค่าที่ทีมสร้างจริง", actions: [],
    },
  };
  return { actions: [], progress: 0, eyebrow: "X-VISOR QUEST", ...copy[state.stage] };
}

export const TERM_HELP = Object.freeze({
  XV: "หน่วยยอดในเกมที่ใช้คำนวณขั้นรายได้ตาม config ไม่ใช่เงินบาท และค่าปัจจุบันเป็นแบบจำลองจนกว่าจะยืนยันเชิงพาณิชย์",
  ENERGY: `พลังงานคือเวลาที่คุณใช้กับงานต่าง ๆ ในเดือนนี้ สูงสุด ${MAX_ENERGY} เมื่อคนที่คุณพัฒนาทำได้เอง คุณไม่ต้องใช้พลังงานกับทุกเรื่องคนเดียว`,
  XIRCLE: "Data → Meaning → Next Action: Band ช่วยเห็นสิ่งที่ทำ ส่วน Scale ช่วยเห็นสิ่งที่ร่างกายตอบ",
  XOS: "รายการช่วยจัดลำดับว่าวันนี้ควรดูใครก่อน แต่ไม่ทำงานแทนผู้เล่น",
});
