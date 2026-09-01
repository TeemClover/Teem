import {
  EVENTS,
  MAX_ENERGY,
  STAGES,
  calculateEconomy,
  getBestNextActions,
  getCurrentExamQuestion
} from "./game-data.js";
import { commercialStatusLabel, TUTORIAL_OFFER } from "./game-commercial-config.js";
import { getSkillSnapshot, getXleadProgress } from "./game-progression.js";
var action = (label, event, options = {}) => ({ label, event, ...options });
var links = [
  ["ดูข้อมูล Xircle", "/xircle/hardware/"],
  ["ดูข้อมูล RoutineX", "/xircle/routinex/"],
  ["ดูข้อมูลผลิตภัณฑ์", "/xircle/products/"]
];
function selectedPerson(state) {
  return [...state.prospects, ...state.customers, ...state.team].find((person) => person.id === state.selectedPersonId) || state.prospects[0] || state.customers[0] || state.team[0];
}
function practiceContent(state, day) {
  const isDay7 = day === 7;
  const feedback = state.preseason.practiceFeedback;
  const selected = state.preseason.selectedPractice;
  const choices = isDay7 ? [["buy_more", "เพิ่มสินค้าอีกตัวทันที"], ["context", "ฟังบริบท แล้วเลือกสิ่งเล็กที่ทำได้จริง"], ["ignore", "รอดูต่อโดยไม่คุยอะไร"]] : [["numbers", "สรุปจากตัวเลขทันที"], ["ask_context", "ถามบริบทชีวิตก่อน"], ["blame_band", "บอกว่า Band น่าจะอ่านผิด"]];
  const actions = feedback === "wrong" ? [action("ลองซ่อมอีกครั้ง", EVENTS.REPAIR_PRACTICE, { icon: "repair" })] : feedback === "correct" ? [action(isDay7 ? "ไปต่อถึง Day 14" : "ไปต่อถึง Day 28", EVENTS.CONTINUE_PRACTICE, { icon: "calendar" })] : [action("ส่งคำตอบ", EVENTS.SUBMIT_PRACTICE, { icon: "submit", disabled: !selected })];
  return {
    scene: isDay7 ? "practice_data" : "practice_care",
    progress: isDay7 ? 20 : 34,
    eyebrow: `PRE-SEASON · DAY ${day}`,
    title: isDay7 ? "เห็นข้อมูล แล้วฟังคนก่อนเลือก" : "ฝึก CARE จากสถานการณ์จริง",
    reason: isDay7 ? "Sleep ลดลงไม่ได้แปลว่าต้องซื้ออะไรเพิ่ม คำตอบเริ่มจากชีวิตจริง" : "ตัวเลขเป็นจุดเริ่มคุย ไม่ใช่คำตัดสิน",
    speaker: isDay7 ? "Guided Data Practice" : "ลูกค้าจำลอง",
    dialogue: isDay7 ? "ข้อมูลบอกว่า Sleep ลดลงหลายวัน คุณควรทำอะไรก่อน?" : "“ช่วงนี้เราเหนื่อยมาก แต่ข้อมูลก็ดูแปลก ๆ” คุณจะตอบอย่างไร?",
    quiz: {
      choices,
      selected,
      feedback,
      repair: isDay7 ? "นี่คือ C · Control: เห็น → ฟัง → เลือก และไม่มีสินค้าใดทำแทนได้" : "CARE เริ่มจากถามบริบท ไม่สรุปจากเลขและไม่โทษอุปกรณ์"
    },
    actions
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
    scene: "exam_active",
    progress: 50,
    eyebrow: repairing ? "CERTIFICATION · REPAIR" : "CERTIFICATION EXAM",
    title: repairing ? `ซ่อมข้อ ${index + 1} / ${state.exam.repairQueue.length}` : `ข้อ ${index + 1} / 5`,
    reason: "เลือกให้ครบก่อน แล้วกดส่งคำตอบ ระบบจะยังไม่เฉลยล่วงหน้า",
    speaker: "Xcademy Exam Room",
    dialogue: question.question,
    quiz: { choices: question.choices, selected, feedback, repair: feedback ? question.repair : "", exam: true },
    actions
  };
}
function routineContent(state, management = false) {
  const person = selectedPerson(state);
  const tooMuch = state.lastEvent === "ROUTINE_TOO_MUCH";
  return {
    scene: "routine_builder",
    progress: management ? 76 : 68,
    eyebrow: "ROUTINE BUILDER · ABCD",
    title: `วาง Routine ให้${person?.name || "คนนี้"}`,
    reason: "เริ่มจากบริบทและสิ่งที่ทำได้จริง ไม่ใช่เลือกสินค้าที่จะขาย",
    speaker: tooMuch ? person?.name || "ลูกค้า" : "RoutineX",
    dialogue: tooMuch ? "“ต้องใช้ทั้งหมดเลยเหรอ?” แผนที่เยอะเกินไปทำให้ความไว้ใจลดลง ลองวางใหม่" : `${person?.name || "ลูกค้า"}บอกว่า “${person?.quote || "อยากเริ่มจากสิ่งที่ทำได้จริง"}”`,
    routineBuilder: {
      fitProducts: person?.fitProducts || [],
      choices: [
        ["control", "เริ่มจาก C", "เริ่มจากพฤติกรรมเดียวที่ทำซ้ำได้ · ยังไม่ต้องซื้อสินค้า"],
        ["fit", "ดู ABCD", "ใช้ A / B / D เท่าที่ตรงกับบริบทและสิ่งที่ฟังมา"],
        ["all", "ครบชุด", "ทางเลือกแรงและเสี่ยงกว่า · คุ้มเมื่อ Skill ผลลัพธ์ Trust และความพร้อมถึงจริง"]
      ]
    },
    actions: [],
    routineEvent: management ? EVENTS.CHOOSE_MANAGEMENT_ROUTINE : EVENTS.CHOOSE_ROUTINE,
    deepLinks: links
  };
}
var missionAction = (mission) => {
  const name = mission.label.split(" · ")[0];
  const map = {
    contact: [`ทัก ${name}`, EVENTS.CONTACT_PROSPECT, "talk", 1],
    meet: [`ไปพบ ${name}`, EVENTS.MEET_PROSPECT, "walk", 2],
    care: [`ติดตาม ${name}`, EVENTS.CARE_CUSTOMER, "care", 1],
    remeasure: ["วัดซ้ำ", EVENTS.REMEASURE_CUSTOMER, "scale", 2],
    consult: [`คุยกับ ${name}`, EVENTS.CONSULT_PROSPECT, "talk", 1],
    baseline: ["ขอ consent + Baseline", EVENTS.BASELINE_PROSPECT, "scale", 2],
    routine: ["วาง Routine", EVENTS.OPEN_MANAGEMENT_ROUTINE, "plan", 0],
    offer: ["คุยแผน", EVENTS.OFFER_PROSPECT, "offer", 1],
    decision: [`ติดตาม ${name}`, EVENTS.FOLLOW_UP_DECISION, "care", 1],
    reorder: [`📦 ต่อ RoutineX เดือนใหม่`, EVENTS.REORDER_CUSTOMER, "offer", 1],
    referral: [`ขอให้ ${name} แนะนำเพื่อน`, EVENTS.ASK_REFERRAL, "talk", 1],
    xvisor: [`ชวน ${name} รู้จัก X-VISOR`, EVENTS.INVITE_XVISOR, "academy", 1],
    "candidate-start": [`ชวน ${name} เรียน Xcademy`, EVENTS.START_CANDIDATE_XCADEMY, "academy", 1],
    "candidate-review": [`Review Case กับ ${name}`, EVENTS.REVIEW_CANDIDATE, "academy", 1],
    "candidate-certify": [`ติดตาม Certification ของ ${name}`, EVENTS.CERTIFY_CANDIDATE, "certificate", 1],
    mentor: [`ช่วย ${name} ทบทวนเคส`, EVENTS.MENTOR_TEAM_MEMBER, "team", 1]
  };
  const value = map[mission.type];
  return value && action(value[0], value[1], { id: mission.targetId, icon: value[2], cost: value[3] });
};
var quickAction = (item) => {
  if (item.mission) return missionAction(item.mission);
  const icon = item.type === "open-house" ? "people" : item.type === "xcademy" ? "academy" : item.type === "skill" ? "skill" : item.type === "end-month" ? "month" : "talk";
  return action(item.label, item.event, {
    icon,
    cost: item.cost,
    id: item.targetId || item.payload?.id,
    source: item.payload?.source,
    skill: item.payload?.skill
  });
};
function managementContent(state) {
  const actions = getBestNextActions(state, 3).map(quickAction).filter(Boolean);
  const teamReport = state.monthStats.teamActions > 0 ? `ทีมทำเองแล้ว ${state.monthStats.teamActions} งานในเดือนนี้ โดยไม่ใช้พลังงานของคุณ` : null;
  return {
    scene: state.monthStats.weeklyDone ? "management_team" : "management",
    progress: Math.min(98, 76 + state.month),
    eyebrow: `MONTH ${state.month} · MANAGEMENT`,
    title: state.energy === 0 ? "พลังงานเดือนนี้หมดแล้ว" : actions[0]?.label || "เลือกลงทุนกับคน งาน หรือ Skill",
    reason: state.energy === 0 ? "ดูว่าสิ่งที่คุณทำและสิ่งที่ทีมทำเองสร้างอะไร แล้วเริ่มเดือนใหม่ที่ ⚡ 28" : "Skill ทำให้งานเดิมคุ้มขึ้น ส่วนทีมที่ทำเองได้จะสร้างผลโดยไม่ใช้พลังงานของคุณ",
    speaker: "XOS · วันนี้ควรดูใครก่อน",
    dialogue: state.lastMessage || teamReport || "คน ลูกค้า และทีมมีจังหวะไม่เหมือนกัน ใช้พลังงานกับสิ่งสำคัญที่สุดก่อน",
    management: {
      missions: state.missions,
      prospects: state.prospects,
      customers: state.customers,
      team: state.team,
      stats: state.monthStats,
      economy: calculateEconomy(state),
      skills: getSkillSnapshot(state),
      xlead: getXleadProgress(state),
      peopleCount: (/* @__PURE__ */ new Set([
        ...state.prospects.map((person) => person.personId || person.id),
        ...state.customers.map((person) => person.personId || person.id),
        ...state.team.map((person) => person.personId || person.id)
      ])).size
    },
    actions,
    energyEmpty: state.energy === 0
  };
}
function eventSceneContent(state) {
  const report = state.sceneReport || {};
  const scenes = {
    [STAGES.CONTENT_RUNNING]: {
      scene: "content_running",
      eyebrow: "CONTENT · REACH → INTEREST",
      title: report.message || "โพสต์นี้เริ่มมีคนสนใจ",
      reason: "Content สร้างบทสนทนา ไม่ได้สร้าง Sale อัตโนมัติ",
      speaker: "Notification",
      dialogue: state.lastMessage,
      status: "content"
    },
    [STAGES.ADS_RUNNING]: {
      scene: "ads_running",
      eyebrow: "ADS · SIMULATION BUDGET",
      title: report.message || "Campaign เริ่มพาคนสนใจเข้ามา",
      reason: "ทุกคนยังต้องคุย นัด ดู Baseline และรับการดูแลเหมือนเดิม",
      speaker: "Campaign report",
      dialogue: state.lastMessage,
      status: "ads"
    },
    [STAGES.XCADEMY_RUNNING]: {
      scene: "xcademy_running",
      eyebrow: "🎓 XCADEMY · BATCH TRAINING",
      title: "หลายคนได้ Next Action ในเวลาเดียวกัน",
      reason: "Xcademy ใช้ 2 ⚡ และเปิดได้ 4 ครั้งต่อเดือน เพื่อช่วย OPP, Candidate และทีมพร้อมกัน",
      speaker: report.room || "Xcademy recap",
      dialogue: report.messages?.join(" · ") || state.lastMessage,
      status: "xcademy"
    },
    [STAGES.OPEN_HOUSE_RUNNING]: {
      scene: "open_house_running",
      eyebrow: "🏠 OPEN HOUSE · BATCH IMPACT",
      title: `ชวน ${report.invited || 0} · มา ${report.attended || 0}`,
      reason: "2 ⚡ เปลี่ยนคนทั้งกลุ่มให้มี Next Action โดยยังไม่แจก Sale อัตโนมัติ",
      speaker: "Open House recap",
      dialogue: report.messages?.join(" · ") || state.lastMessage,
      status: "openhouse"
    },
    [STAGES.G1_CELEBRATION]: {
      scene: "first_g1",
      eyebrow: report.first ? "FIRST G1" : `X-VISOR คนที่ ${state.team.length}`,
      title: `${report.name || "สมาชิกใหม่"} เป็น Certified X-VISOR แล้ว`,
      reason: "นี่ไม่ใช่ฉากจบ ขั้นต่อไปคือช่วยให้เขามีลูกค้าและสร้างผลได้เองทุกเดือน",
      speaker: report.name || "X-VISOR ใหม่",
      dialogue: "“ต่อไปอยากลองดูแลเคสของตัวเอง และกลับมา Review กับทีม”",
      status: "g1",
      milestone: report.first ? "FIRST G1 · เกมยังไปต่อ" : "TEAM GROWTH"
    },
    [STAGES.XLEAD_MILESTONE]: {
      scene: "xlead",
      eyebrow: "🌱 XLEAD · MONEY MOMENT",
      title: "ปลดล็อก ② รายได้จากการพัฒนา G1",
      reason: "X-VISOR ใน G1 ได้คอมเท่าไร คุณได้ 20% ของคอมที่เขาได้ โดยคิดแยกคนตาม tier",
      speaker: "Organization map unlocked",
      dialogue: `ช่อง 2 เดือนนี้ ฿${Number(report.channel2 || calculateEconomy(state).channel2).toLocaleString("th-TH")} · ทีมทำไว้แล้วจึงเห็นผลทันที`,
      status: "xlead",
      milestone: "XLEAD · CHANNEL ② OPEN"
    },
    [STAGES.XGEN_MILESTONE]: {
      scene: "xgen",
      eyebrow: "🏆 3,000,000 TGV · XGEN",
      title: "คุณสร้างองค์กรถึง XGEN แล้ว",
      reason: "Save และ High Score ไม่ถูกรีเซ็ต · เส้นทางองค์กรยังเดินต่อถึงบทสรุป Month 24",
      speaker: "X-VISOR QUEST",
      dialogue: `TGV ${Number(report.tgv || state.organization.tgv).toLocaleString("th-TH")} · รายได้รวม ฿${Number(report.totalIncome || state.economy.totalIncome).toLocaleString("th-TH")}`,
      status: "xgen",
      milestone: "XGEN · ORGANIZATION LEADER",
      actions: [action("เล่นต่อ ▶", EVENTS.START_NEXT_MONTH, { icon: "play" })]
    }
  };
  scenes[STAGES.CENTER_RUNNING] = scenes[STAGES.XCADEMY_RUNNING];
  scenes[STAGES.GOOD_LUCK_RUNNING] = scenes[STAGES.OPEN_HOUSE_RUNNING];
  return { progress: Math.min(99, 78 + state.month), actions: [], ...scenes[state.stage] };
}
function getStageContent(state) {
  if ([STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR].includes(state.stage)) return examContent(state);
  if (state.stage === STAGES.PRE_DAY7_PRACTICE) return practiceContent(state, 7);
  if (state.stage === STAGES.PRE_DAY21_CARE) return practiceContent(state, 21);
  if (state.stage === STAGES.M1_ROUTINE) return routineContent(state);
  if (state.stage === STAGES.MANAGEMENT_ROUTINE) return routineContent(state, true);
  if (state.stage === STAGES.MANAGEMENT) return managementContent(state);
  if ([STAGES.CONTENT_RUNNING, STAGES.ADS_RUNNING, STAGES.XCADEMY_RUNNING, STAGES.OPEN_HOUSE_RUNNING, STAGES.CENTER_RUNNING, STAGES.GOOD_LUCK_RUNNING, STAGES.G1_CELEBRATION, STAGES.XLEAD_MILESTONE, STAGES.XGEN_MILESTONE].includes(state.stage)) return eventSceneContent(state);
  const person = selectedPerson(state);
  const name = person?.name || "คนแรก";
  const transaction = state.economy.lastTransaction;
  const passed = state.exam ? Object.values(state.exam.results).filter(Boolean).length : 0;
  const copy = {
    [STAGES.OPENING]: {
      scene: "opening",
      progress: 0,
      eyebrow: "NEW GAME · PRE-SEASON",
      title: "สร้างความพร้อม 28 วัน ก่อนดูแลคนจริง",
      reason: "เริ่มจากใช้เอง เรียนรู้ข้อมูล และฝึกการดูแล ก่อนสอบเป็น X-VISOR",
      speaker: "X-VISOR QUEST",
      dialogue: "ตอนนี้คุณยังไม่มีลูกค้า ไม่มีทีม และยังไม่มีรายได้ — ก้าวแรกคือเรียนรู้จากตัวเอง",
      actions: [action("เริ่ม PRE-SEASON", EVENTS.START_PATH, { icon: "play" })]
    },
    [STAGES.PRE_DAY0_BAND]: {
      scene: "pre_band",
      progress: 3,
      eyebrow: "PRE-SEASON · DAY 0",
      title: "ใส่ Xircle Band",
      reason: "Band ช่วยเห็นสิ่งที่คุณทำต่อเนื่องระหว่างวัน",
      speaker: "Xircle Band",
      dialogue: "Band ทำงานเงียบ ๆ เพื่อสะท้อนการขยับและสัญญาณที่ระบบรองรับ — ไม่ได้วัดอาหารโดยตรง",
      actions: [action("ใส่ Band", EVENTS.WEAR_BAND, { icon: "band" })],
      deepLinks: [links[0]]
    },
    [STAGES.PRE_DAY0_SCALE]: {
      scene: "pre_scale",
      progress: 5,
      eyebrow: "PRE-SEASON · DAY 0",
      title: "ขึ้น Xircle Scale",
      reason: "Scale ช่วยเห็นสิ่งที่ร่างกายตอบ เพื่อใช้ดูแนวโน้ม ไม่ใช่วินิจฉัย",
      speaker: "Xircle Scale",
      dialogue: "ยืนให้นิ่ง เท้าวางบนตำแหน่งเดิม แล้วเก็บ Baseline ครั้งแรก",
      actions: [action("เริ่มวัด Baseline", EVENTS.START_SELF_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY0_SCANNING]: {
      scene: "pre_scanning",
      progress: 6,
      eyebrow: "PRE-SEASON · DAY 0",
      title: "กำลังเก็บ Baseline",
      reason: "Weight อย่างเดียวไม่พอ ต้องอ่าน Body Fat และ muscle-related trend ร่วมกัน",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY0_SUMMARY]: {
      scene: "pre_summary",
      progress: 8,
      eyebrow: "BASELINE พร้อมแล้ว",
      title: "แยกให้ออกว่าอะไรบอกอะไร",
      reason: "ข้อมูลสองชั้นช่วยให้คุณไม่รีบสรุปจากเลขเดียว",
      speaker: "หลักแรกของ Xircle",
      dialogue: "Band = สิ่งที่คุณทำ · Scale = สิ่งที่ร่างกายตอบ",
      facts: [["BAND", "การขยับและสัญญาณระหว่างวัน"], ["SCALE", "Body Composition และ Trend"]],
      actions: [action("เริ่ม Routine ถึง Day 3", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[0]]
    },
    [STAGES.PRE_MONTAGE]: {
      scene: "pre_montage",
      progress: Math.max(10, state.energy * 1.25),
      eyebrow: "ROUTINEX · 28 DAYS",
      title: "ทำสิ่งที่เลือกให้เกิดซ้ำ",
      reason: "แต่ละวันกำลังสร้างทั้งประสบการณ์ ความรู้ และพลังงานของคุณ",
      speaker: "RoutineX",
      dialogue: "ใช้ชีวิต · Band sync · เลือก C · Control · เรียนรู้ตัวช่วยตามบริบท",
      status: "montage",
      actions: []
    },
    [STAGES.PRE_DAY3_ABCD]: {
      scene: "pre_abcd",
      progress: 14,
      eyebrow: "CHECKPOINT · DAY 3",
      title: "สิ่งที่ซื้อไม่ได้ สำคัญที่สุด",
      reason: "ABCD ช่วยวาง Routine โดยเริ่มจากการกระทำ ไม่ใช่เริ่มจากสินค้า",
      speaker: "RoutineX · ABCD",
      dialogue: "A / B / D มีตัวช่วยตามบริบท ส่วน C · Control คือสิ่งที่คุณทำเองและไม่มีขาย",
      abcd: true,
      facts: [["A · ABSORB", "G.U.S.+ · gut / digestive routine"], ["B · BUILD", "Protein HMB+ · protein / muscle-maintenance support"], ["C · CONTROL", "พฤติกรรม · ไม่มีสินค้า"], ["D · DAILY BALANCE", "Vita Matrix + AstaMega+"]],
      actions: [action("เรียนรู้ต่อถึง Day 7", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[1], links[2]]
    },
    [STAGES.PRE_DAY14_SCALE]: {
      scene: "pre_day14_scale",
      progress: 26,
      eyebrow: "CHECKPOINT · DAY 14",
      title: "กลับมาดู Body Trend",
      reason: "อย่าตัดสินจากครั้งเดียว — รอบนี้อาจดีขึ้นบางค่า คงเดิม หรือแกว่ง",
      speaker: "Xircle Scale",
      dialogue: "วางเท้าบน Scale แล้วเปรียบเทียบ Baseline → Day 14",
      actions: [action("วัด Day 14", EVENTS.START_DAY14_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY14_SCANNING]: {
      scene: "pre_day14_scanning",
      progress: 27,
      eyebrow: "BASELINE → DAY 14",
      title: "กำลังอ่านแนวโน้ม",
      reason: "Scale ไม่ได้สร้าง Habit Score และไม่ได้วัด Sleep โดยตรง",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY14_REVIEW]: {
      scene: "pre_day14_review",
      progress: 29,
      eyebrow: "BODY REVIEW · DAY 14",
      title: "ดู Trend มากกว่าเลขครั้งเดียว",
      reason: "Body Fat ดีขึ้นเล็กน้อย ขณะที่ Weight คงเดิม — นี่ไม่ใช่คำวินิจฉัย",
      speaker: "Xircle",
      dialogue: "ข้อมูลยังไม่ดีทุกอย่าง และคำตอบไม่ใช่ซื้อของเพิ่มเสมอไป",
      resultCards: [["Weight", "คงเดิม", "neutral"], ["Body Fat", "แนวโน้มดีขึ้น", "good"], ["Muscle-related", "ยังแกว่ง", "warn"]],
      facts: [["VITA MATRIX", "D · Daily Balance · water-phase support"], ["ASTAMEGA+", "D · Daily Balance · oil-phase support"], ["สำคัญ", "ไม่จำเป็นว่าทุกคนต้องใช้ทุกตัว"]],
      actions: [action("ไปต่อถึง Day 21", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[0], links[2]]
    },
    [STAGES.PRE_DAY28_SCALE]: {
      scene: "pre_day28_scale",
      progress: 40,
      eyebrow: "FINAL CHECKPOINT · DAY 28",
      title: "วัดซ้ำหลังทำ Routine ครบ 28 วัน",
      reason: "ดูสิ่งที่ทำคู่กับสิ่งที่ร่างกายตอบ แล้วเลือกสิ่งที่ควรทำต่อ",
      speaker: "Xircle Scale",
      dialogue: "นี่คือการทบทวน ไม่ใช่เส้นชัยอัตโนมัติ",
      actions: [action("วัด Day 28", EVENTS.START_DAY28_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY28_SCANNING]: {
      scene: "pre_day28_scanning",
      progress: 42,
      eyebrow: "BASELINE → DAY 28",
      title: "กำลังสรุป Trend",
      reason: "ข้อมูลจะมีความหมายเมื่อเชื่อมกับบริบทและสิ่งที่คุณทำจริง",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY28_REVIEW]: {
      scene: "pre_day28_review",
      progress: 46,
      eyebrow: "28 วันผ่านไป",
      title: "คุณสร้างความพร้อม ⚡ 28 / 28 แล้ว",
      reason: "คุณไม่ได้แค่ใช้ RoutineX แต่เริ่มอ่านข้อมูล ฟังบริบท และรู้ว่าสินค้าอยู่ตรงไหน",
      speaker: "PRE-SEASON COMPLETE",
      dialogue: "Xircle: Data → Meaning → Next Action · RoutineX: ทำสิ่งที่เลือกให้เกิดซ้ำ",
      recap: [["XIRCLE", "Band เห็นสิ่งที่ทำ · Scale เห็นสิ่งที่ร่างกายตอบ"], ["PRODUCT", "A / B / D มีตัวช่วย · C ไม่มีขาย"], ["X-VISOR", "ฟัง → เลือกสิ่งเดียว → ติดตาม → รู้ขอบเขต"]],
      actions: [action("ไปสอบ Certification", EVENTS.GO_EXAM, { icon: "certificate" })],
      deepLinks: links
    },
    [STAGES.EXAM_TRANSIT]: {
      scene: "exam_transit",
      progress: 48,
      eyebrow: "XCademy",
      title: "เดินเข้า Exam Room",
      reason: "คุณจะนั่งสอบ 5 ข้อจาก 5 domain และซ่อมเฉพาะข้อที่ยังไม่ผ่านได้",
      speaker: "Exam Proctor",
      dialogue: "เข้าประตู เดินไปที่โต๊ะ แล้วนั่งให้พร้อม",
      status: "examTransit",
      actions: []
    },
    [STAGES.EXAM_SUMMARY]: {
      scene: "exam_summary",
      progress: 54,
      eyebrow: "EXAM SUMMARY",
      title: passed === 5 ? "ผ่านครบ 5 / 5" : `ผ่านแล้ว ${passed} / 5`,
      reason: passed === 5 ? "คุณผ่านทั้ง 5 domain แล้ว" : `เหลือ ${5 - passed} ข้อที่ต้องซ่อม — ไม่มีการเปิด answer key`,
      speaker: "Exam Proctor",
      dialogue: passed === 5 ? "พร้อมรับ Certification" : "ความผิดพลาดคือจุดเรียนรู้ ซ่อมเฉพาะหลักที่ยังไม่แม่น",
      actions: passed === 5 ? [action("รับ Certification", EVENTS.COMPLETE_CERTIFICATION, { icon: "certificate" })] : [action("เริ่มซ่อมข้อผิด", EVENTS.START_REPAIRS, { icon: "repair" })]
    },
    [STAGES.CERTIFICATION_CEREMONY]: {
      scene: "ceremony",
      progress: 58,
      eyebrow: "CERTIFICATION",
      title: "Certified X-VISOR",
      reason: "ตอนนี้คุณพร้อมเริ่มดูแลคนจริงในเกมแล้ว",
      speaker: "Xcademy",
      dialogue: "ลุกจากโต๊ะ รับใบรับรอง และนำสิ่งที่เรียนรู้ไปใช้กับคนจริง",
      status: "ceremony",
      actions: []
    },
    [STAGES.CERTIFIED]: {
      scene: "certified",
      progress: 60,
      eyebrow: "CERTIFIED X-VISOR",
      title: "เริ่มเดือน 1 ที่ลูกค้า 0",
      reason: "⚡ 28 แต้มนี้มาจาก 28 วันที่คุณเรียนรู้และใช้เอง",
      speaker: "X-VISOR QUEST",
      dialogue: "จากนี้พลังงานคือเวลาที่คุณใช้กับงานต่าง ๆ ในเดือนนี้",
      milestone: "CERTIFIED",
      actions: [action("เริ่มเดือน 1", EVENTS.START_MONTH_1, { icon: "flag" })]
    },
    [STAGES.M1_EMPTY]: {
      scene: "empty_office",
      progress: 62,
      eyebrow: "MONTH 1 · ลูกค้า 0",
      title: "เริ่มจากรู้จักคน 1 คน",
      reason: "งานแรกไม่ใช่ขาย แต่คือฟังว่าใครอยากเปลี่ยนอะไร",
      speaker: "Clover Neighborhood",
      dialogue: "เก้าอี้ฝั่งลูกค้ายังว่าง เริ่มจากทักคนที่คุณรู้จักและนัดคุย",
      actions: [action("ทำความรู้จักคนใหม่", EVENTS.FIND_PERSON, { icon: "talk", cost: 1 })]
    },
    [STAGES.M1_PERSON_MET]: {
      scene: "person_arrives",
      progress: 64,
      eyebrow: "ATTRACT → CONVERSATION",
      title: `ฟังว่า${name}อยากเปลี่ยนอะไร`,
      reason: "ยังไม่ต้องเสนออะไร ให้ความสนใจชีวิตจริงของเขาก่อน",
      speaker: `รู้จัก “${name}” แล้ว`,
      dialogue: person?.quote || "อยากเริ่มดูแลตัวเอง แต่ไม่รู้จะเริ่มตรงไหน",
      actions: [action(`คุยกับ ${name}`, EVENTS.TALK, { icon: "talk", cost: 1 })]
    },
    [STAGES.M1_DISCOVERY]: {
      scene: "consultation",
      progress: 66,
      eyebrow: "DISCOVERY",
      title: `ขออนุญาตก่อนดูข้อมูลของ${name}`,
      reason: "Health summary เป็นข้อมูลอ่อนไหว ดูเฉพาะสิ่งที่จำเป็นต่อการติดตาม",
      speaker: name,
      dialogue: `“เป้าหมายของเราคือ${person?.need || "เริ่มจากสิ่งที่ทำได้จริง"}”`,
      actions: [action("ขอ consent", EVENTS.REQUEST_CONSENT, { icon: "consent" })]
    },
    [STAGES.M1_BASELINE_INTRO]: {
      scene: "customer_scale",
      progress: 67,
      eyebrow: "BASELINE · CONSENTED",
      title: `ดู Baseline ร่วมกับ${name}`,
      reason: `${name}อนุญาตให้คุณดูข้อมูลสรุปเพื่อช่วยติดตามแล้ว`,
      speaker: "Xircle Corner",
      dialogue: "ไม่เปิด raw health dashboard — ดู summary, trend และ Next Action เท่าที่จำเป็น",
      actions: [action("เริ่มวัด Baseline", EVENTS.START_CUSTOMER_BASELINE, { icon: "scale", cost: 2 })]
    },
    [STAGES.M1_BASELINE_SCANNING]: {
      scene: "customer_scanning",
      progress: 68,
      eyebrow: "XIRCLE BASELINE",
      title: `กำลังวัดข้อมูลของ${name}`,
      reason: "Band และ Scale มีหน้าที่ต่างกัน แต่ช่วยให้คุยจากสิ่งที่เห็นร่วมกัน",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.M1_BASELINE]: {
      scene: "customer_result",
      progress: 69,
      eyebrow: "DATA → MEANING",
      title: "วาง Routine จากข้อมูลและบริบท",
      reason: `บริบทของ${name}: ${person?.concern || "อยากเริ่มดูแลตัวเอง"}`,
      speaker: "Baseline Summary",
      dialogue: "เลือกแผนที่ทำได้จริงก่อน สินค้าเป็นเพียงตัวช่วยตามบริบท",
      resultCards: [["การทำต่อเนื่อง", "ควรเริ่มทีละอย่าง", "warn"], ["Body Trend", "Baseline", "neutral"], ["Next Action", person?.need || "เริ่มจาก C", "good"]],
      actions: [action("เปิด Routine Builder", EVENTS.OPEN_ROUTINE_BUILDER, { icon: "plan" })]
    },
    [STAGES.M1_RECOMMENDATION]: {
      scene: "recommendation",
      progress: 71,
      eyebrow: "RECOMMENDATION",
      title: `คุยแผนที่เหมาะกับ${name}`,
      reason: "อธิบายว่าอะไรคือพฤติกรรม อะไรคือตัวช่วย และติดตามอย่างไร",
      speaker: "ความพร้อม: พร้อมเริ่ม",
      dialogue: "การขายเกิดหลังความเข้าใจและความพร้อม ไม่ใช่ก่อน Discovery",
      selectedProducts: person?.routinePlan?.products || [],
      actions: [action("ชวนเริ่ม RoutineX", EVENTS.MAKE_OFFER, { icon: "offer", cost: 1 })]
    },
    [STAGES.M1_SALE_RECEIPT]: {
      scene: "sale",
      progress: 73,
      eyebrow: "FIRST SALE",
      title: `${name}เลือกเริ่ม RoutineX`,
      reason: "รายการขายจบแล้ว แต่งานดูแลเพิ่งเริ่ม",
      speaker: "Transaction complete",
      dialogue: `ยอดนี้ใช้ ${commercialStatusLabel(TUTORIAL_OFFER.status)} ไม่ใช่ราคา/รายได้ทางการ`,
      receipt: transaction,
      milestone: "ลูกค้าคนแรก",
      actions: [action("ดูแลต่อ", EVENTS.CLOSE_RECEIPT, { icon: "care" })]
    },
    [STAGES.M1_ONBOARDING]: {
      scene: "onboarding",
      progress: 74,
      eyebrow: "ONBOARDING",
      title: `ช่วย${name}เริ่มให้ถูกจุด`,
      reason: "ทวนวิธีใช้ วาง C · Control และนัดติดตามก่อนแยกกัน",
      speaker: name,
      dialogue: "“ถ้าวันไหนหลุด เรากลับมาเริ่มจากสิ่งเล็กที่สุดได้ใช่ไหม?”",
      actions: [action("Onboarding + นัดติดตาม", EVENTS.START_ONBOARDING, { icon: "calendar", cost: 2 })]
    },
    [STAGES.M1_FOLLOWUP]: {
      scene: "followup",
      progress: 76,
      eyebrow: "FOLLOW-UP",
      title: `อย่าปล่อย${name}ไว้หลังซื้อ`,
      reason: "การติดตามช่วยให้รู้ว่าอะไรทำได้ อะไรติดขัด และควรปรับ Next Action อย่างไร",
      speaker: `Day 7 · ${name}`,
      dialogue: "“ทำได้บ้าง หลุดบ้าง แต่รู้สึกว่าเริ่มกลับมาได้เร็วขึ้น”",
      actions: [action("ติดตามจนถึง Day 28", EVENTS.FOLLOW_UP_CUSTOMER, { icon: "care", cost: 1 })]
    },
    [STAGES.M1_REVIEW_SCAN]: {
      scene: "review_scale",
      progress: 78,
      eyebrow: "DAY 28 · REVIEW",
      title: `ชวน${name}วัดซ้ำ`,
      reason: "ครบ 28 วันไม่แปลว่า Success อัตโนมัติ ต้องดู adherence, trend และบริบท",
      speaker: "Xircle Corner",
      dialogue: "เปรียบเทียบ Baseline → Day 28 แล้วคุยว่าอะไรควรทำต่อ",
      actions: [action("วัดซ้ำ", EVENTS.START_CUSTOMER_REVIEW, { icon: "scale", cost: 2 })]
    },
    [STAGES.M1_REVIEW_SCANNING]: {
      scene: "review_scanning",
      progress: 79,
      eyebrow: "BASELINE → DAY 28",
      title: `กำลังดู Trend ของ${name}`,
      reason: "ผลลัพธ์ต้องมาจากการทำต่อเนื่องและการดูแล ไม่ใช่สุ่มแจก",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.M1_REVIEW]: {
      scene: "review_result",
      progress: 81,
      eyebrow: "RESULT REVIEW",
      title: `${name}เริ่มเห็นแนวโน้มดี`,
      reason: "บันทึกสิ่งที่เปลี่ยนและ Next Action รอบต่อไป โดยไม่ใช้คำรับประกัน",
      speaker: name,
      dialogue: "“ไม่ได้สมบูรณ์ทุกวัน แต่ตอนนี้รู้ว่าหลุดแล้วกลับมายังไง”",
      resultCards: [["Routine", "ทำต่อเนื่องขึ้น", "good"], ["Body Trend", "เริ่มดีขึ้น", "good"], ["Next Action", "ทำต่อแบบไม่เพิ่มภาระ", "neutral"]],
      actions: [action("บันทึก Success Case", EVENTS.SAVE_SUCCESS, { icon: "check" })]
    },
    [STAGES.M1_SUCCESS]: {
      scene: "success",
      progress: 83,
      eyebrow: "VALUE CREATED",
      title: "การดูแลต่อทำให้ผลลัพธ์มีความหมาย",
      reason: "ลูกค้าที่ได้รับการติดตาม มีโอกาสทำต่อ ซื้อซ้ำ หรือบอกต่อจากความไว้ใจ",
      speaker: name,
      dialogue: "“อยากทำต่อ และถ้ามีเพื่อนอยากเริ่ม เราจะแนะนำให้”",
      milestone: "SUCCESS CASE",
      actions: [action("บันทึกเป็นลูกค้าและไปต่อ", EVENTS.CONTINUE_CARE, { icon: "care" })]
    },
    [STAGES.M1_XVISOR_INTEREST]: {
      scene: "interest",
      progress: 85,
      eyebrow: "ELEVATE",
      title: `อธิบายบทบาท X-VISOR ให้${name}`,
      reason: "X-VISOR ไม่ใช่แค่คนขาย แต่ฟัง วาง Next Action ติดตาม และรู้ขอบเขต",
      speaker: name,
      dialogue: "“ถ้าเราอยากช่วยคนอื่นให้เริ่มแบบนี้บ้าง ต้องเรียนอะไร?”",
      actions: [action("เล่าเส้นทาง Xcademy", EVENTS.EXPLAIN_XVISOR, { icon: "academy" })]
    },
    [STAGES.M1_CANDIDATE]: {
      scene: "candidate",
      progress: 87,
      eyebrow: "CANDIDATE → G1",
      title: `ช่วย${name}เตรียมเป็น X-VISOR`,
      reason: "เขาต้องใช้เอง ฝึก และผ่าน Certification เช่นเดียวกับคุณ",
      speaker: "Xcademy Path",
      dialogue: "การพัฒนาคนคือทำให้เขาทำได้เอง ไม่ใช่แค่เพิ่มชื่อในทีม",
      actions: [action("พัฒนาเป็น G1", EVENTS.PREPARE_G1, { icon: "team", cost: 3 })]
    },
    [STAGES.M1_G1]: {
      scene: "first_g1",
      progress: 89,
      eyebrow: "FIRST G1",
      title: "ทีมของคุณเริ่มต้นแล้ว — เกมยังไม่จบ",
      reason: `${name}เป็น X-VISOR ใหม่ แต่ยังมีลูกค้า 0 และยังต้องฝึกจากเคสจริง`,
      speaker: name,
      dialogue: "“เรายังไม่มั่นใจว่าจะเริ่มคุยกับใครก่อน”",
      milestone: "FIRST G1 · เกมยังไปต่อ",
      actions: [action("พาทีมเข้า Xcademy", EVENTS.START_WEEKLY, { icon: "weekly", cost: 2 })]
    },
    [STAGES.M1_WEEKLY_RUNNING]: {
      scene: "weekly",
      progress: 90,
      eyebrow: "XCADEMY · TRAINING",
      title: "ช่วยทุกคนเลือก Next Action",
      reason: "Xcademy ช่วยหลายคนพร้อมกันและทำให้แต่ละคนเห็นเคสถัดไป",
      speaker: "Xcademy Case Table",
      dialogue: "กำลังทบทวนคนที่ควรคุย เคสที่ควรติดตาม และสิ่งที่แต่ละคนจะทำต่อ…",
      status: "weekly",
      actions: []
    },
    [STAGES.M1_TEAM_STARTED]: {
      scene: "team_started",
      progress: 91,
      eyebrow: "MONTH 1 COMPLETE",
      title: "ลูกค้าคนแรกได้รับการดูแลครบวงจร",
      reason: "เดือนถัดไปคุณจะเลือกเองว่าจะหาคน ดูแลลูกค้า ลงทุน Skill หรือเริ่มพัฒนา Candidate",
      speaker: "Management game เริ่มแล้ว",
      dialogue: "28 ⚡ เท่าเดิม แต่ Skill, Referral และทีมที่ทำเองได้จะทำให้ผลลัพธ์รวมโตขึ้น",
      actions: [action("จบเดือน 1", EVENTS.END_MONTH, { icon: "month" })]
    },
    [STAGES.MONTH_CLOSED]: {
      scene: "month_closed",
      progress: Math.min(98, 75 + state.month),
      eyebrow: `ปิดรอบ · MONTH ${state.month}`,
      title: "สรุปคุณค่าที่สร้างในเดือนนี้",
      reason: "รายได้ประมาณถูกปิดรอบและเพิ่มเข้าเงินรับแล้วในแบบจำลองเกม",
      speaker: "MONTH SUMMARY",
      dialogue: "เดือนใหม่จะรีเซ็ตพลังงานเป็น ⚡ 28 / 28 แต่ฐานลูกค้า ทีม รายได้รวม และ Best TGV ยังอยู่",
      monthSummary: state.monthSummaries.at(-1),
      actions: [action(`▶ เริ่มเดือน ${state.month + 1}`, EVENTS.START_NEXT_MONTH, { icon: "month" })]
    },
    [STAGES.SEASON_REVIEW]: {
      scene: "season_review",
      progress: 100,
      eyebrow: "ENDLESS ORGANIZATION",
      title: "องค์กรโตจากคนที่ทำได้เอง",
      reason: "Reach · Sell · Care · Retain · Mentor · Build Systems — ไม่มีรายได้เพราะมีชื่ออยู่ใต้ทีมเฉย ๆ",
      speaker: "X-VISOR QUEST",
      dialogue: "ช่วงแรกคุณทำเอง ต่อมาคุณทำให้คนอื่นทำได้ และรายได้จึงโตตามคุณค่าที่ทีมสร้างจริง",
      actions: []
    }
  };
  return { actions: [], progress: 0, eyebrow: "X-VISOR QUEST", ...copy[state.stage] };
}
var TERM_HELP = Object.freeze({
  XV: "หน่วย Volume ของเกม ไม่ใช่เงินบาท ช่อง 1 คิดจากยอดขายบาท ส่วน TGV รวม XV ของทั้งองค์กรในเดือนนี้",
  ENERGY: `พลังงานคือเวลาที่คุณลงทุนกับคน งาน หรือ Skill ในเดือนนี้ สูงสุด ${MAX_ENERGY} ทีมที่ทำเองได้จะสร้างผลเพิ่มโดยไม่หักพลังงานของคุณ`,
  XIRCLE: "Data → Meaning → Next Action: Band ช่วยเห็นสิ่งที่ทำ ส่วน Scale ช่วยเห็นสิ่งที่ร่างกายตอบ",
  XOS: "รายการช่วยจัดลำดับว่าวันนี้ควรดูใครก่อน แต่ไม่ทำงานแทนผู้เล่น"
});

import { EVENTS as EVENTS2, XIRCLE_MONTHS, calculateEconomy as calculateEconomy2, getBestNextActions as getBestNextActions2 } from "./game-data.js";
function getStageContent2(state) {
  const base = getStageContent(state);
  if (state.organizationMode) {
    const economy = calculateEconomy2(state);
    const agg = state.organization?.aggregate || {};
    return {
      ...base,
      scene: "management_org",
      progress: 100,
      eyebrow: `ORGANIZATION MODE · MONTH ${state.month}`,
      title: `องค์กรเดินต่อ · ${Number(economy.tgv || 0).toLocaleString("th-TH")} XV`,
      reason: "หลัง 12 เดือน ไม่มี Energy และไม่มีงานรายคนให้ grind — ดูภาพใหญ่และผ่านเวลาได้เลย",
      speaker: "XOS · Organization",
      dialogue: `❤️ ลูกค้า active ${Number(agg.activeCustomers || 0).toLocaleString("th-TH")} · 🌱 X-VISOR ${Number(agg.xvisorCount || state.team?.length || 0).toLocaleString("th-TH")} · 👑 XLEAD ${Number(agg.xleadCount || 0).toLocaleString("th-TH")}`,
      facts: [
        ["🏙️ TGV", `${Number(economy.tgv || 0).toLocaleString("th-TH")} XV`],
        ["💰 รายได้เดือนนี้", `฿${Number(economy.projectedIncome || 0).toLocaleString("th-TH")}`],
        ["⭐ เรื่องขององค์กร", state.sceneReport?.story || state.lastMessage || "ระบบยังเดินต่อ"]
      ],
      actions: [{ label: "▶ ผ่านไปอีก 1 เดือน", event: EVENTS2.END_MONTH, icon: "month" }]
    };
  }
  if (state.sceneReport?.kind === "xircle-announcement") {
    return {
      ...base,
      scene: "open_house_running",
      eyebrow: "🏕️ THE XIRCLE · QUARTERLY EVENT",
      title: "The Xircle มาแล้ว · แคมป์ 2 วัน 1 คืน",
      reason: "เตรียมคนให้พร้อม เพราะทุกคนที่เข้าร่วม—including คุณ—จะได้ Momentum แรงขึ้น",
      speaker: "THE XIRCLE",
      dialogue: `รอบปีนี้: ${XIRCLE_MONTHS.map((month) => `Month ${month}`).join(" · ")}`,
      facts: [["เป้าหมาย", "ชวนคนที่เหมาะสมให้มากที่สุด"], ["ผล", "Buff ตามบทบาท + Momentum 2 เดือน"]],
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "the-xircle") {
    return {
      ...base,
      scene: "open_house_running",
      eyebrow: `🏕️ THE XIRCLE · MONTH ${state.month}`,
      title: `มา ${state.sceneReport.attended} จาก ${state.sceneReport.invited} คน`,
      reason: "คนที่มาได้รับแรงส่งตามบทบาท โดยไม่ได้ถูกเปลี่ยนเป็น Sale หรือ X-VISOR แบบอัตโนมัติ",
      speaker: "THE XIRCLE",
      dialogue: "⭐ คุณเองก็ได้รับ Buff และ Skill XP จากแคมป์นี้",
      facts: (state.sceneReport.messages || []).map((message, index) => [index === 0 ? "ATTENDANCE" : index === 1 ? "TEAM" : "YOU", message]),
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "xlead-exam") {
    return {
      ...base,
      eyebrow: "🎓 XLEAD EXAM · PASSED",
      title: "Certified XLEAD",
      reason: "Qualification อย่างเดียวไม่ปลดล็อกรายได้ — ต้องผ่าน Exam ก่อน",
      speaker: "Xcademy",
      dialogue: "② รายได้จากการพัฒนา Direct G1 ปลดล็อกแล้ว",
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "xgen-exam") {
    return {
      ...base,
      eyebrow: "🎓 XGEN EXAM · PASSED",
      title: "Certified XGEN",
      reason: "3,000,000 TGV คือ Qualification; Certification คือสิ่งที่ปลดล็อกแผนรายได้",
      speaker: "Xcademy",
      dialogue: "③ รายได้จากการบริหาร Organization ปลดล็อกแล้ว",
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.campaignComplete && state.stage === "month_closed") {
    const score = state.campaignScore || {};
    return {
      ...base,
      scene: "season_review",
      eyebrow: "🏆 MONTH 12 · REVELATION",
      title: "12 เดือนแรกจบแล้ว · High Score ถูกล็อก",
      reason: "จากคนเดียว → ลูกค้า → X-VISOR → XLEAD → Organization ที่ไม่ต้องรอคุณทำทุก transaction",
      speaker: "X-VISOR QUEST",
      dialogue: "คุณไม่ได้หยุดทำธุรกิจ แต่ธุรกิจไม่ต้องรอคุณทำทุกอย่างด้วยตัวเองอีกแล้ว",
      facts: [
        ["🏆 Best TGV", `${Number(score.bestTgv || 0).toLocaleString("th-TH")} XV`],
        ["💰 รายได้รวม 12 เดือน", `฿${Number(score.totalIncome || 0).toLocaleString("th-TH")}`],
        ["💎 สูงสุด/เดือน", `฿${Number(score.bestMonthlyIncome || 0).toLocaleString("th-TH")}`],
        ["🏙️ Organization", `${Number(score.organizationSize || 0).toLocaleString("th-TH")} คน`]
      ],
      actions: [{ label: "▶ เล่นต่อ · Organization Mode", event: EVENTS2.START_NEXT_MONTH, icon: "play" }]
    };
  }
  return base;
}

import {
  CAMPAIGN_MONTHS,
  EVENTS as EVENTS3,
  XGEN_SINGLE_MONTH_TARGET,
  calculateEconomy as calculateEconomy3,
  getBestNextActions as getBestNextActions3
} from "./game-data.js";
var XGEN_GOAL_VISIBLE_AT = 15e5;
function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function selectedPerson2(state) {
  const people = [...state.prospects || [], ...state.customers || [], ...state.team || []];
  return people.find((person) => person.id === state.selectedPersonId) || people[0] || null;
}
function nameTutorialActions(state, content) {
  const target = selectedPerson2(state);
  if (!target?.name || !Array.isArray(content?.actions)) return content;
  const name = target.name;
  const labels = {
    [EVENTS3.TALK]: `💬 คุยกับ ${name}`,
    [EVENTS3.REQUEST_CONSENT]: `🛡️ ขอ consent จาก ${name}`,
    [EVENTS3.START_CUSTOMER_BASELINE]: `⚖️ ดู Baseline กับ ${name}`,
    [EVENTS3.OPEN_ROUTINE_BUILDER]: `🧩 วาง Routine ให้ ${name}`,
    [EVENTS3.MAKE_OFFER]: `📁 คุยแฟ้ม X กับ ${name}`,
    [EVENTS3.CLOSE_RECEIPT]: `❤️ ดูแล ${name} ต่อ`,
    [EVENTS3.START_ONBOARDING]: `🧭 Onboarding ${name} และนัดติดตาม`,
    [EVENTS3.FOLLOW_UP_CUSTOMER]: `❤️ ติดตาม ${name} ถึง Day 28`,
    [EVENTS3.START_CUSTOMER_REVIEW]: `📊 วัดซ้ำกับ ${name}`,
    [EVENTS3.SAVE_SUCCESS]: `✅ บันทึก Success Case · ${name}`,
    [EVENTS3.CONTINUE_CARE]: `❤️ ดูแล ${name} ต่อ`,
    [EVENTS3.EXPLAIN_XVISOR]: `✨ เล่าเส้นทาง X-VISOR ให้ ${name}`,
    [EVENTS3.PREPARE_G1]: `🌱 เตรียม ${name} เป็น X-VISOR`,
    [EVENTS3.START_WEEKLY]: `🎓 พา ${name} เข้า Xcademy`
  };
  return {
    ...content,
    actions: content.actions.map((item) => labels[item.event] ? { ...item, label: labels[item.event] } : item)
  };
}
function quick3(state) {
  return getBestNextActions3(state, 3).map((item) => item?.targetId && !item.id ? { ...item, id: item.targetId } : item);
}
function finish(state, content) {
  return nameTutorialActions(state, content);
}
function realSingleMonthXgen(state, tgv) {
  return Boolean(
    Number(tgv || 0) >= XGEN_SINGLE_MONTH_TARGET || state.career?.xgenQualifiedSingleMonth || state.career?.xgenQualificationRule === "single-month" || state.career?.xgenCertified1b || state.campaignOutcome?.xgenByMonth12
  );
}
function getStageContent3(state) {
  const base = getStageContent2(state);
  if (state.organizationMode) {
    const economy2 = calculateEconomy3(state);
    const agg = state.organization?.aggregate || {};
    const xgenPath = state.year2Path === "xgen";
    return finish(state, {
      ...base,
      scene: base.scene,
      progress: 100,
      eyebrow: `${xgenPath ? "⭐ XGEN" : "👑 XLEAD"} ORGANIZATION · MONTH ${state.month}`,
      title: `องค์กรเดินต่อ · ${fmt(economy2.tgv)} XV`,
      reason: "ปีที่ 2 คุณไม่ต้องกลับไปขายหรือตามรายคน — กดเดือนละครั้งแล้วดูระบบที่สร้างไว้ทำงานต่อ",
      speaker: "XOS · Organization",
      dialogue: `❤️ ลูกค้า active ${fmt(agg.activeCustomers)} · 🌱 X-VISOR ${fmt(agg.xvisorCount || state.team?.length)} · 👑 XLEAD ${fmt(agg.xleadCount)}`,
      facts: [
        ["🏙️ TGV เดือนนี้", `${fmt(economy2.tgv)} XV`],
        ["💰 รายได้เดือนนี้", `฿${fmt(economy2.projectedIncome)}`],
        ["เส้นทางปีที่ 2", xgenPath ? "XGEN · มี ③ Organization 5% + Recognition Trip" : "XLEAD · ไม่มี ③ และไม่มี Recognition Trip"]
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: "▶ ผ่านไปอีก 1 เดือน", event: EVENTS3.END_MONTH, icon: "month" }]
    });
  }
  if (state.campaignComplete && state.campaignScore?.locked && !state.organizationMode) {
    const score = state.campaignScore;
    return finish(state, {
      ...base,
      scene: "season_review",
      progress: 100,
      eyebrow: "🏆 MONTH 12 · REVELATION",
      title: "12 เดือนแรกจบแล้ว",
      reason: "High Score ถูกล็อกตรงนี้ — ใส่ชื่อก่อน แล้วค่อยดูสิ่งที่คุณสร้างเดินต่อเองใน Year 2",
      speaker: "X-VISOR QUEST",
      dialogue: state.campaignOutcome?.xgenByMonth12 ? "⭐ คุณแตะ 3,000,000 XV ในเดือนเดียวสำเร็จ · Year 2 เปิด XGEN Path" : "👑 รอบนี้ยังไม่แตะ 3,000,000 XV ในเดือนเดียว · Year 2 จะเป็น XLEAD Path",
      facts: [
        ["🏆 Best TGV", `${fmt(score.bestTgv)} XV`],
        ["💰 รายได้รวม 12 เดือน", `฿${fmt(score.totalIncome)}`],
        ["💎 สูงสุด / เดือน", `฿${fmt(score.bestMonthlyIncome)}`],
        ["🏙️ Organization", `${fmt(score.organizationSize)} คน`]
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: "🏆 ใส่ชื่อ High Score ก่อน", ui: "v9-finale", icon: "certificate" }]
    });
  }
  const economy = calculateEconomy3(state);
  const tgv = Number(economy.tgv || 0);
  const singleMonthQualified = realSingleMonthXgen(state, tgv);
  if (["xgen-qualified", "xgen-qualified-1b", "xgen-exam"].includes(state.sceneReport?.kind) && singleMonthQualified) {
    return finish(state, {
      ...base,
      scene: "xgen",
      eyebrow: "🏆 XGEN QUALIFIED",
      title: "แตะ 3,000,000 XV ในเดือนเดียวแล้ว",
      reason: "ผ่านครั้งเดียวและอยู่ถาวรในรอบนี้ — ③ Organization 5% เริ่มนับตั้งแต่เดือนที่ผ่านทันที",
      speaker: "XOS · Organization",
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} XV · เกณฑ์ ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ["ช่วงที่วัด", "เดือนปัจจุบันเดือนเดียว"],
        ["Qualification", "ผ่านแล้วถาวรในรอบนี้"],
        ["③ Organization", "5% ของ TGV เดือนนี้เริ่มทันที"]
      ],
      actions: quick3(state)
    });
  }
  if (!singleMonthQualified && Number(state.month || 0) >= 1 && Number(state.month || 0) <= CAMPAIGN_MONTHS && tgv >= XGEN_GOAL_VISIBLE_AT) {
    const remaining = Math.max(0, XGEN_SINGLE_MONTH_TARGET - tgv);
    return finish(state, {
      ...base,
      scene: base.scene,
      eyebrow: "🏙️ XGEN TARGET",
      title: `เหลืออีก ${fmt(remaining)} XV ในเดือนนี้`,
      reason: "เกณฑ์เดียวคือ TGV 3,000,000 XV ภายในเดือนเดียว — ตอนนี้ยังไม่ Qualified",
      speaker: "XOS · Organization",
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} / ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ["ช่วงที่วัด", "เดือนปัจจุบันเดือนเดียว"],
        ["Qualification", "ยังไม่ผ่าน"]
      ],
      actions: quick3(state)
    });
  }
  if (state.sceneReport?.kind === "the-xircle" || state.sceneReport?.kind === "xircle-announcement") {
    return finish(state, {
      ...base,
      scene: "the-xircle",
      eyebrow: state.sceneReport?.kind === "xircle-announcement" ? "🏕️ THE XIRCLE · SPECIAL EVENT" : "🏕️ THE XIRCLE",
      title: state.sceneReport?.kind === "xircle-announcement" ? "ถึงรอบ The Xircle แล้ว" : "RESET · RECONNECT · RISE",
      reason: "กิจกรรมหลักต้องใช้ฉากแคมป์ The Xircle โดยตรง ไม่ใช้ฉาก Open House",
      actions: quick3(state)
    });
  }
  if (state.stage === "management" || state.sceneReport?.kind === "xlead-exam") {
    return finish(state, { ...base, actions: quick3(state) });
  }
  if (Number(state.month || 0) > 0 && Number(state.month || 0) <= CAMPAIGN_MONTHS && base.management) {
    return finish(state, { ...base, actions: quick3(state) });
  }
  return finish(state, base);
}
export {
  TERM_HELP,
  getStageContent3 as getStageContent
};
