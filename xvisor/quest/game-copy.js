import {
  EVENTS,
  MAX_ENERGY,
  STAGES,
  calculateEconomy,
  getBestNextActions,
  getRoutineChoices,
  getCurrentExamQuestion
} from "./game-data.js";
import { getSkillSnapshot, getXleadProgress } from "./game-progression.js";
import { getStoryBeat } from "./game-story.js";
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
  const actions = feedback === "wrong" ? [action("ลองอีกครั้ง", EVENTS.REPAIR_PRACTICE, { icon: "repair" })] : feedback === "correct" ? [action(isDay7 ? "ไปวันที่ 14" : "ไปวันที่ 28", EVENTS.CONTINUE_PRACTICE, { icon: "calendar" })] : [action("ส่งคำตอบ", EVENTS.SUBMIT_PRACTICE, { icon: "submit", disabled: !selected })];
  return {
    scene: isDay7 ? "practice_data" : "practice_care",
    progress: isDay7 ? 20 : 34,
    eyebrow: `ช่วงฝึก · วันที่ ${day}`,
    title: isDay7 ? "ลองฟังให้เข้าใจ" : "ถ้าเขามาปรึกษาคุณ",
    reason: "เลือกคำตอบที่คุณอยากลอง แล้วดูผลด้วยกัน",
    speaker: isDay7 ? "เอโกะ" : "ลูกค้าในเกม",
    dialogue: isDay7 ? "นอนน้อยลงมาหลายวันแล้ว คุณจะเริ่มคุยอย่างไร?" : "“ช่วงนี้เราเหนื่อยมาก แต่ข้อมูลก็ดูแปลก ๆ” คุณจะตอบอย่างไร?",
    quiz: {
      choices,
      selected,
      feedback,
      repair: isDay7 ? "ลองฟังก่อนว่าเขาเจออะไร แล้วเลือกสิ่งเล็ก ๆ ที่ทำเองได้" : "เริ่มจากถามชีวิตช่วงนี้ก่อน ตัวเลขยังเล่าเรื่องของเขาไม่หมด"
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
    eyebrow: repairing ? "ทบทวนข้อที่ยังไม่ผ่าน" : "ทดสอบความพร้อม",
    title: repairing ? `ซ่อมข้อ ${index + 1} / ${state.exam.repairQueue.length}` : `ข้อ ${index + 1} / 5`,
    reason: "ค่อย ๆ คิด ข้อที่ยังไม่ผ่านกลับมาลองใหม่ได้",
    speaker: "ห้องสอบ Xcademy",
    dialogue: question.question,
    quiz: { choices: question.choices, selected, feedback, repair: feedback ? question.repair : "", exam: true },
    actions
  };
}
function routineContent(state, management = false) {
  const person = selectedPerson(state);
  const unavailable = ["ROUTINE_TOO_MUCH", "ROUTINE_UNAVAILABLE"].includes(state.lastEvent);
  const labels = {
    control: ["เริ่มจากสิ่งที่ทำเอง", "เลือกพฤติกรรมเดียว แล้วนัดติดตาม"],
    fit: ["เริ่มแผนที่พอดี", "เลือกตัวช่วยที่เหมาะ แล้วคุยแฟ้ม X ครั้งเดียว"],
    all: ["เริ่มแผนเต็มเมื่อพร้อม", "ต้องมีประสบการณ์และความพร้อมของทั้งสองฝ่าย"]
  };
  return {
    scene: "routine_builder",
    progress: management ? 76 : 68,
    eyebrow: "เลือกแผนดูแล",
    title: `แบบไหนพอดีกับ${person?.name || "คนนี้"}`,
    reason: unavailable ? state.lastMessage || "ดูเงื่อนไขของแผน แล้วเลือกสิ่งที่พร้อมทำตอนนี้" : "ดูความพร้อมก่อนเลือก เขายังเป็นคนตัดสินใจว่าจะเริ่มหรือไม่",
    speaker: person?.name || "ลูกค้า",
    dialogue: `“${person?.quote || "อยากเริ่มจากสิ่งที่ทำได้จริง"}”`,
    routineBuilder: {
      fitProducts: person?.fitProducts || [],
      choices: getRoutineChoices(state, person).map(choice => ({
        ...choice, label: labels[choice.id][0], detail: labels[choice.id][1]
      }))
    },
    actions: [],
    routineEvent: management ? EVENTS.CHOOSE_MANAGEMENT_ROUTINE : EVENTS.CHOOSE_ROUTINE,
    deepLinks: links
  };
}
var missionAction = (mission) => {
  const name = mission.targetName || mission.label.split(" · ")[0];
  const map = {
    contact: [`ทัก ${name}`, EVENTS.CONTACT_PROSPECT, "talk", 1],
    meet: [`ไปพบ ${name}`, EVENTS.MEET_PROSPECT, "walk", 2],
    care: [`ติดตาม ${name}`, EVENTS.CARE_CUSTOMER, "care", 1],
    remeasure: ["วัดซ้ำ", EVENTS.REMEASURE_CUSTOMER, "scale", 2],
    consult: [`คุยกับ ${name}`, EVENTS.CONSULT_PROSPECT, "talk", 1],
    baseline: ["ขออนุญาตดูข้อมูลเริ่มต้น", EVENTS.BASELINE_PROSPECT, "scale", 2],
    routine: ["เลือกแผนดูแล", EVENTS.OPEN_MANAGEMENT_ROUTINE, "plan", 0],
    offer: [`คุยแฟ้ม X กับ ${name}`, EVENTS.OFFER_PROSPECT, "offer", 1],
    decision: [`ติดตาม ${name}`, EVENTS.FOLLOW_UP_DECISION, "care", 1],
    reorder: [`📁 คุยแฟ้ม X กับ ${name}`, EVENTS.REORDER_CUSTOMER, "offer", 1],
    referral: [`ขอให้ ${name} แนะนำเพื่อน`, EVENTS.ASK_REFERRAL, "talk", 1],
    xvisor: [`ชวน ${name} รู้จัก X-VISOR`, EVENTS.INVITE_XVISOR, "academy", 1],
    "candidate-start": [`ชวน ${name} เรียน Xcademy`, EVENTS.START_CANDIDATE_XCADEMY, "academy", 1],
    "candidate-review": [`ทบทวนเคสกับ ${name}`, EVENTS.REVIEW_CANDIDATE, "academy", 1],
    "candidate-certify": [`ติดตามการสอบของ ${name}`, EVENTS.CERTIFY_CANDIDATE, "certificate", 1],
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
    eyebrow: `เดือน ${state.month} · ดูแลคนและทีม`,
    title: state.energy === 0 ? "พร้อมสรุปเดือนนี้" : "วันนี้จะเริ่มตรงไหนดี",
    reason: state.energy === 0 ? "ตรวจผลงาน แล้วเริ่มเดือนใหม่ด้วยพลังงาน 28 แต้ม" : "เลือกงานตามคนที่รอคุณอยู่",
    speaker: "ทีม",
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
      eyebrow: "เรื่องที่คุณเล่าออกไป",
      title: "มีคนเห็นโพสต์แล้ว",
      reason: "ดูว่าใครสนใจ แล้วค่อยเริ่มคุย",
      speaker: "ทีม",
      dialogue: state.lastMessage,
      status: "content"
    },
    [STAGES.ADS_RUNNING]: {
      scene: "ads_running",
      eyebrow: "ประชาสัมพันธ์ในเกม",
      title: "คนใหม่เริ่มเข้ามา",
      reason: "ติดตามคนที่สนใจได้จากรายชื่อ",
      speaker: "ทีม",
      dialogue: state.lastMessage,
      status: "ads"
    },
    [STAGES.XCADEMY_RUNNING]: {
      scene: "xcademy_running",
      eyebrow: "ห้องเรียน Xcademy",
      title: "ช่วยกันคิด ช่วยกันลอง",
      reason: "ใช้ 2 พลังงาน · เปิดได้ 4 ครั้งต่อเดือน",
      speaker: report.room || "ทีม",
      dialogue: report.messages?.join(" · ") || state.lastMessage,
      status: "xcademy"
    },
    [STAGES.OPEN_HOUSE_RUNNING]: {
      scene: "open_house_running",
      eyebrow: "เปิดบ้านให้ได้รู้จักกัน",
      title: `ชวน ${report.invited || 0} · มา ${report.attended || 0}`,
      reason: "พบหลายคนในครั้งเดียว ใช้ 2 พลังงาน",
      speaker: "ทีม",
      dialogue: report.messages?.join(" · ") || state.lastMessage,
      status: "openhouse"
    },
    [STAGES.G1_CELEBRATION]: {
      scene: "first_g1",
      eyebrow: report.first ? "สมาชิกทีมคนแรก" : `X-VISOR คนที่ ${state.team.length}`,
      title: `${report.name || "สมาชิกใหม่"} ผ่านการรับรองแล้ว`,
      reason: "ต่อไปช่วยเขาลองดูแลลูกค้าของตัวเอง",
      speaker: report.name || "X-VISOR ใหม่",
      dialogue: "“ต่อไปอยากลองดูแลคนของตัวเอง แล้วกลับมาคุยกับทีม”",
      status: "g1",
      milestone: report.first ? "สมาชิกทีมคนแรก" : "มีคนร่วมทีมเพิ่ม"
    },
    [STAGES.XLEAD_MILESTONE]: {
      scene: "xlead",
      eyebrow: "เติบโตเป็น XLEAD",
      title: "เปิดรายได้จากการช่วยทีม",
      reason: "ดูส่วนที่ทีมช่วยสร้างในช่อง ②",
      speaker: "ทีม",
      dialogue: `ช่อง 2 เดือนนี้ ฿${Number(report.channel2 || calculateEconomy(state).channel2).toLocaleString("th-TH")} · ทีมทำไว้แล้วจึงเห็นผลทันที`,
      status: "xlead",
      milestone: "XLEAD · เปิดช่อง ②"
    },
    [STAGES.XGEN_MILESTONE]: {
      scene: "xgen",
      eyebrow: "เติบโตเป็น XGEN",
      title: "เห็นผลงานของทั้งองค์กร",
      reason: "ดูเส้นทางที่สร้างต่อไปถึงเดือน 24",
      speaker: "ทีม",
      dialogue: `TGV ${Number(report.tgv || state.organization.tgv).toLocaleString("th-TH")} · รายได้รวม ฿${Number(report.totalIncome || state.economy.totalIncome).toLocaleString("th-TH")}`,
      status: "xgen",
      milestone: "XGEN · ดูแลทั้งองค์กร",
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
      eyebrow: "เรื่องของคุณกำลังเริ่ม",
      title: "เริ่มดูแลคนแรกไปด้วยกัน",
      reason: "ลองเป็น X-VISOR ช่วยให้คนดูแลตัวเองได้ ตลอด 24 เดือนจำลอง",
      speaker: "ทีม",
      dialogue: "ผมทีม จะช่วยพาลองทีละอย่างนะ วันในเกมผ่านได้ทันที ไม่ต้องมีอุปกรณ์หรือซื้ออะไรก่อนเล่น",
      actions: [action("ลองไปด้วยกัน", EVENTS.START_PATH, { icon: "play" })]
    },
    [STAGES.PRE_DAY0_BAND]: {
      scene: "pre_band",
      progress: 3,
      eyebrow: "ช่วงฝึก · วันเริ่มต้น",
      title: "ลองสวมสายรัดในเกม",
      reason: "มาดูการขยับระหว่างวัน",
      speaker: "ทีม",
      dialogue: "Xircle Band ช่วยสะท้อนสิ่งที่ทำระหว่างวัน ไม่ได้วัดอาหารที่เรากิน",
      actions: [action("สวมสายรัดในเกม", EVENTS.WEAR_BAND, { icon: "band" })],
      deepLinks: [links[0]]
    },
    [STAGES.PRE_DAY0_SCALE]: {
      scene: "pre_scale",
      progress: 5,
      eyebrow: "ช่วงฝึก · วันเริ่มต้น",
      title: "เก็บข้อมูลครั้งแรก",
      reason: "เก็บไว้เทียบเมื่อวันในเกมผ่านไป",
      speaker: "ทีม",
      dialogue: "Xircle Scale ช่วยดูแนวโน้มร่างกาย เราจะเก็บจุดเริ่มต้นไว้ก่อน",
      actions: [action("ลองวัดในเกม", EVENTS.START_SELF_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY0_SCANNING]: {
      scene: "pre_scanning",
      progress: 6,
      eyebrow: "ช่วงฝึก · วันเริ่มต้น",
      title: "กำลังเก็บจุดเริ่มต้น",
      reason: "เดี๋ยวเราจะอ่านผลด้วยกัน",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY0_SUMMARY]: {
      scene: "pre_summary",
      progress: 8,
      eyebrow: "ได้ข้อมูลแล้ว",
      title: "สองมุมของเรื่องเดียวกัน",
      reason: "ดูสิ่งที่ทำคู่กับแนวโน้มร่างกาย",
      speaker: "ทีม",
      dialogue: "สายรัดเล่าสิ่งที่เราทำ เครื่องชั่งช่วยดูว่าร่างกายเปลี่ยนอย่างไร",
      facts: [["สายรัด", "การขยับและสัญญาณระหว่างวัน"], ["เครื่องชั่ง", "องค์ประกอบร่างกายและแนวโน้ม"]],
      actions: [action("ลองทำต่อถึงวันที่ 3", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[0]]
    },
    [STAGES.PRE_MONTAGE]: {
      scene: "pre_montage",
      progress: Math.max(10, state.energy * 1.25),
      eyebrow: "ช่วงฝึก · วันจำลอง",
      title: "ทำสิ่งที่เลือกให้เกิดซ้ำ",
      reason: "ดูวันในเกมผ่านไป โดยไม่ต้องรอวันจริง",
      speaker: "ทีม",
      dialogue: "เริ่มทีละอย่าง แล้วลองทำต่อให้เข้ากับชีวิต",
      status: "montage",
      actions: []
    },
    [STAGES.PRE_DAY3_ABCD]: {
      scene: "pre_abcd",
      progress: 14,
      eyebrow: "ช่วงฝึก · วันที่ 3",
      title: "เริ่มจากสิ่งที่ทำเองได้",
      reason: "แผนเล็ก ๆ ที่ทำต่อไหวเป็นจุดเริ่มต้น",
      speaker: "ทีม",
      dialogue: "เราเรียกพฤติกรรมที่ทำเองว่า C ส่วนตัวช่วยเลือกเพิ่มให้เหมาะกับแต่ละคน",
      abcd: true,
      facts: [["A · การดูดซึม", "G.U.S.+"], ["B · การสร้าง", "Protein HMB+"], ["C · สิ่งที่ทำเอง", "พฤติกรรม · ไม่มีสินค้า"], ["D · สมดุลประจำวัน", "Vita Matrix + AstaMega+"]],
      actions: [action("ไปวันที่ 7", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[1], links[2]]
    },
    [STAGES.PRE_DAY14_SCALE]: {
      scene: "pre_day14_scale",
      progress: 26,
      eyebrow: "ช่วงฝึก · วันที่ 14",
      title: "กลับมาดูสิ่งที่เปลี่ยน",
      reason: "บางค่าอาจคงเดิม บางค่าอาจเปลี่ยน",
      speaker: "ทีม",
      dialogue: "ลองเทียบกับวันเริ่มต้น แล้วค่อยคุยกันว่ามันบอกอะไร",
      actions: [action("วัดวันที่ 14", EVENTS.START_DAY14_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY14_SCANNING]: {
      scene: "pre_day14_scanning",
      progress: 27,
      eyebrow: "วันเริ่มต้น → วันที่ 14",
      title: "กำลังอ่านแนวโน้ม",
      reason: "เครื่องชั่งไม่ได้วัดการนอนโดยตรง",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY14_REVIEW]: {
      scene: "pre_day14_review",
      progress: 29,
      eyebrow: "ผลจำลอง · วันที่ 14",
      title: "น้ำหนักเท่าเดิม ก็มีเรื่องให้ดู",
      reason: "อ่านหลายค่าประกอบกันเพื่อดูแนวโน้ม",
      speaker: "ทีม",
      dialogue: "ยังไม่ดีขึ้นทุกค่า เราค่อยดูว่าสิ่งที่ทำอยู่เหมาะแค่ไหน",
      resultCards: [["น้ำหนัก", "คงเดิม", "neutral"], ["ไขมันร่างกาย", "แนวโน้มดีขึ้น", "good"], ["แนวโน้มกล้ามเนื้อ", "ยังแกว่ง", "warn"]],
      facts: [["ตัวช่วยกลุ่ม D", "Vita Matrix · AstaMega+"], ["เลือกให้พอดี", "แต่ละคนไม่จำเป็นต้องใช้ทุกตัว"]],
      actions: [action("ไปวันที่ 21", EVENTS.START_MONTAGE, { icon: "calendar" })],
      deepLinks: [links[0], links[2]]
    },
    [STAGES.PRE_DAY28_SCALE]: {
      scene: "pre_day28_scale",
      progress: 40,
      eyebrow: "ช่วงฝึก · วันที่ 28",
      title: "ทบทวนก่อนออกไปช่วยคนอื่น",
      reason: "ดูสิ่งที่ทำคู่กับสิ่งที่ร่างกายตอบ แล้วเลือกสิ่งที่ควรทำต่อ",
      speaker: "ทีม",
      dialogue: "มาดูว่าสิ่งไหนควรเก็บไว้ทำต่อ",
      actions: [action("วัดวันที่ 28", EVENTS.START_DAY28_SCALE, { icon: "scale" })]
    },
    [STAGES.PRE_DAY28_SCANNING]: {
      scene: "pre_day28_scanning",
      progress: 42,
      eyebrow: "วันเริ่มต้น → วันที่ 28",
      title: "กำลังสรุปแนวโน้ม",
      reason: "ดูผลคู่กับสิ่งที่ทำมาตลอด",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.PRE_DAY28_REVIEW]: {
      scene: "pre_day28_review",
      progress: 46,
      eyebrow: "28 วันผ่านไป",
      title: "พร้อมลองดูแลคนแรก",
      reason: "ทบทวนสิ่งที่เรียน แล้วไปลองตอบ 5 คำถาม",
      speaker: "ทีม",
      dialogue: "ฟังให้เข้าใจ เลือกแผนที่ทำไหว แล้วกลับมาดูด้วยกัน",
      recap: [["ดูข้อมูล", "ดูสิ่งที่ทำคู่กับแนวโน้มร่างกาย"], ["เลือกแผน", "เริ่มจากพฤติกรรม ตัวช่วยเลือกเท่าที่เหมาะ"], ["ดูแลต่อ", "ฟัง → เลือก → ติดตาม"]],
      actions: [action("ลองทดสอบความพร้อม", EVENTS.GO_EXAM, { icon: "certificate" })],
      deepLinks: links
    },
    [STAGES.EXAM_TRANSIT]: {
      scene: "exam_transit",
      progress: 48,
      eyebrow: "ห้องเรียน Xcademy",
      title: "มาลองตอบ 5 คำถาม",
      reason: "กลับมาทบทวนเฉพาะข้อที่ยังไม่ผ่านได้",
      speaker: "ทีม",
      dialogue: "นั่งให้สบาย แล้วค่อย ๆ คิดไปทีละข้อ",
      status: "examTransit",
      actions: []
    },
    [STAGES.EXAM_SUMMARY]: {
      scene: "exam_summary",
      progress: 54,
      eyebrow: "ผลทดสอบ",
      title: passed === 5 ? "ผ่านครบ 5 / 5" : `ผ่านแล้ว ${passed} / 5`,
      reason: passed === 5 ? "พร้อมนำสิ่งที่เรียนไปใช้ในเกม" : `ทบทวนอีก ${5 - passed} ข้อที่ยังไม่เข้าใจ`,
      speaker: "ทีม",
      dialogue: passed === 5 ? "ไปพบคนแรกด้วยกันนะ" : "ยังไม่เข้าใจตรงไหน เราค่อยลองกันใหม่",
      actions: passed === 5 ? [action("รับใบรับรองในเกม", EVENTS.COMPLETE_CERTIFICATION, { icon: "certificate" })] : [action("ทบทวนข้อที่ยังไม่ผ่าน", EVENTS.START_REPAIRS, { icon: "repair" })]
    },
    [STAGES.CERTIFICATION_CEREMONY]: {
      scene: "ceremony",
      progress: 58,
      eyebrow: "ผ่านการฝึกแล้ว",
      title: "เป็น X-VISOR ในเกมแล้ว",
      reason: "ลองใช้สิ่งที่เรียนกับคนแรก",
      speaker: "Xcademy",
      dialogue: "รับใบรับรองในเกม แล้วไปเริ่มเรื่องของคุณกัน",
      status: "ceremony",
      actions: []
    },
    [STAGES.CERTIFIED]: {
      scene: "certified",
      progress: 60,
      eyebrow: "X-VISOR · พร้อมเริ่ม",
      title: "เปิดโต๊ะรับคนแรก",
      reason: "มีพลังงาน 28 แต้มสำหรับงานในเดือนนี้",
      speaker: "ทีม",
      dialogue: "จากนี้พลังงานคือเวลาที่คุณใช้กับงานต่าง ๆ ในเดือนนี้",
      milestone: "CERTIFIED",
      actions: [action("เริ่มเดือน 1", EVENTS.START_MONTH_1, { icon: "flag" })]
    },
    [STAGES.M1_EMPTY]: {
      scene: "empty_office",
      progress: 62,
      eyebrow: "เดือน 1 · ลูกค้า 0",
      title: "เริ่มจากรู้จักคน 1 คน",
      reason: "ไปพบคนที่อยากเริ่มดูแลตัวเอง",
      speaker: "ทีม",
      dialogue: "เก้าอี้ฝั่งลูกค้ายังว่าง เริ่มจากทักคนที่คุณรู้จักและนัดคุย",
      actions: [action("ทำความรู้จักคนใหม่", EVENTS.FIND_PERSON, { icon: "talk", cost: 1 })]
    },
    [STAGES.M1_PERSON_MET]: {
      scene: "person_arrives",
      progress: 64,
      eyebrow: "ได้รู้จักกันแล้ว",
      title: `ฟังว่า${name}อยากเปลี่ยนอะไร`,
      reason: "ยังไม่ต้องเสนออะไร ให้ความสนใจชีวิตจริงของเขาก่อน",
      speaker: name,
      dialogue: person?.quote || "อยากเริ่มดูแลตัวเอง แต่ไม่รู้จะเริ่มตรงไหน",
      actions: [action(`คุยกับ ${name}`, EVENTS.TALK, { icon: "talk", cost: 1 })]
    },
    [STAGES.M1_DISCOVERY]: {
      scene: "consultation",
      progress: 66,
      eyebrow: "คุยให้เข้าใจ",
      title: `ขออนุญาตก่อนดูข้อมูลของ${name}`,
      reason: "ให้เขาเลือกว่าจะเปิดข้อมูลส่วนไหนให้ดู",
      speaker: name,
      dialogue: `“เป้าหมายของเราคือ${person?.need || "เริ่มจากสิ่งที่ทำได้จริง"}”`,
      actions: [action("ขออนุญาตดูข้อมูล", EVENTS.REQUEST_CONSENT, { icon: "consent" })]
    },
    [STAGES.M1_BASELINE_INTRO]: {
      scene: "customer_scale",
      progress: 67,
      eyebrow: "ได้รับอนุญาตแล้ว",
      title: `ดูจุดเริ่มต้นกับ${name}`,
      reason: `${name}อนุญาตให้คุณดูข้อมูลสรุปเพื่อช่วยติดตามแล้ว`,
      speaker: "ทีม",
      dialogue: "ดูข้อมูลสรุปเท่าที่จำเป็น แล้วช่วยกันเลือกสิ่งที่จะทำต่อ",
      actions: [action("เริ่มดูข้อมูล", EVENTS.START_CUSTOMER_BASELINE, { icon: "scale", cost: 2 })]
    },
    [STAGES.M1_BASELINE_SCANNING]: {
      scene: "customer_scanning",
      progress: 68,
      eyebrow: "ข้อมูลเริ่มต้น",
      title: `กำลังวัดข้อมูลของ${name}`,
      reason: "เก็บไว้ดูความเปลี่ยนแปลงในครั้งต่อไป",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.M1_BASELINE]: {
      scene: "customer_result",
      progress: 69,
      eyebrow: "มองเห็นจุดเริ่มต้นแล้ว",
      title: "เลือกแผนที่เขาทำไหว",
      reason: `บริบทของ${name}: ${person?.concern || "อยากเริ่มดูแลตัวเอง"}`,
      speaker: "ทีม",
      dialogue: "ฟังสิ่งที่เขาต้องการ แล้วเลือกแผนที่พอดี",
      resultCards: [["การทำต่อเนื่อง", "ควรเริ่มทีละอย่าง", "warn"], ["แนวโน้มร่างกาย", "ข้อมูลครั้งแรก", "neutral"], ["สิ่งที่จะลอง", person?.need || "เริ่มจากพฤติกรรมเดียว", "good"]],
      actions: [action("เลือกแผนดูแล", EVENTS.OPEN_ROUTINE_BUILDER, { icon: "plan" })]
    },
    [STAGES.M1_RECOMMENDATION]: {
      scene: "recommendation",
      progress: 71,
      eyebrow: "แผนพร้อมแล้ว",
      title: `คุยแฟ้ม X กับ ${name}`,
      reason: "อธิบายว่าอะไรคือพฤติกรรม อะไรคือตัวช่วย และติดตามอย่างไร",
      speaker: "ทีม",
      dialogue: "คุยแฟ้ม X ให้ชัด แล้วให้เขาเลือกเองว่าจะเริ่มหรือยัง",
      selectedProducts: person?.routinePlan?.products || [],
      actions: [action("คุยแฟ้ม X", EVENTS.MAKE_OFFER, { icon: "offer", cost: 1 })]
    },
    [STAGES.M1_SALE_RECEIPT]: {
      scene: "sale",
      progress: 73,
      eyebrow: "เขาเลือกเริ่มแล้ว",
      title: `${name}เลือกเริ่ม RoutineX`,
      reason: "รายการขายจบแล้ว แต่งานดูแลเพิ่งเริ่ม",
      speaker: "ทีม",
      dialogue: "นี่เป็นยอดจำลองในเกม เก็บไว้ดูว่าการดูแลต่อจะสร้างอะไรขึ้นอีก",
      receipt: transaction,
      milestone: "ลูกค้าคนแรก",
      actions: [action("ดูแลต่อ", EVENTS.CLOSE_RECEIPT, { icon: "care" })]
    },
    [STAGES.M1_ONBOARDING]: {
      scene: "onboarding",
      progress: 74,
      eyebrow: "เริ่มดูแลด้วยกัน",
      title: `ช่วย${name}เริ่มให้ถูกจุด`,
      reason: person?.careOnly ? "เลือกพฤติกรรมเดียว แล้วนัดกลับมาคุยกัน" : "ทวนวิธีใช้และสิ่งที่จะลอง แล้วนัดติดตาม",
      speaker: name,
      dialogue: "“ถ้าวันไหนหลุด เรากลับมาเริ่มจากสิ่งเล็กที่สุดได้ใช่ไหม?”",
      actions: [action("ช่วยเริ่มและนัดติดตาม", EVENTS.START_ONBOARDING, { icon: "calendar", cost: 2 })]
    },
    [STAGES.M1_FOLLOWUP]: {
      scene: "followup",
      progress: 76,
      eyebrow: "นัดติดตาม",
      title: `กลับมาฟัง${name}`,
      reason: "ดูว่าทำอะไรได้ และติดขัดตรงไหน",
      speaker: name,
      dialogue: "“ทำได้บ้าง หลุดบ้าง แต่รู้สึกว่าเริ่มกลับมาได้เร็วขึ้น”",
      actions: [action("ติดตามถึงวันที่ 28", EVENTS.FOLLOW_UP_CUSTOMER, { icon: "care", cost: 1 })]
    },
    [STAGES.M1_REVIEW_SCAN]: {
      scene: "review_scale",
      progress: 78,
      eyebrow: "วันที่ 28 · กลับมาดูผล",
      title: `ชวน${name}วัดซ้ำ`,
      reason: "ดูสิ่งที่ทำต่อได้คู่กับข้อมูลรอบนี้",
      speaker: "ทีม",
      dialogue: "เทียบกับวันแรก แล้วฟังว่าเขารู้สึกอย่างไร",
      actions: [action("วัดซ้ำ", EVENTS.START_CUSTOMER_REVIEW, { icon: "scale", cost: 2 })]
    },
    [STAGES.M1_REVIEW_SCANNING]: {
      scene: "review_scanning",
      progress: 79,
      eyebrow: "วันเริ่มต้น → วันที่ 28",
      title: `กำลังดูแนวโน้มของ${name}`,
      reason: "เก็บผลไว้คุยกันต่อ",
      speaker: "Xircle",
      dialogue: "กำลังวัด…",
      status: "scan",
      actions: []
    },
    [STAGES.M1_REVIEW]: {
      scene: "review_result",
      progress: 81,
      eyebrow: "ผลที่ได้จากการดูแล",
      title: `${name}เริ่มเห็นแนวโน้มดี`,
      reason: "เก็บสิ่งที่ได้เรียนรู้ แล้วเลือกสิ่งที่จะทำต่อ",
      speaker: name,
      dialogue: "“ไม่ได้สมบูรณ์ทุกวัน แต่ตอนนี้รู้ว่าหลุดแล้วกลับมายังไง”",
      resultCards: [["สิ่งที่ทำ", "ต่อเนื่องขึ้น", "good"], ["แนวโน้มร่างกาย", "เริ่มดีขึ้น", "good"], ["รอบต่อไป", "ทำต่อแบบไม่เพิ่มภาระ", "neutral"]],
      actions: [action("บันทึกสิ่งที่ได้ผล", EVENTS.SAVE_SUCCESS, { icon: "check" })]
    },
    [STAGES.M1_SUCCESS]: {
      scene: "success",
      progress: 83,
      eyebrow: "ความไว้ใจเริ่มเกิดขึ้น",
      title: "เขาอยากทำต่อแล้ว",
      reason: person?.careOnly ? "ติดตามต่อได้ แม้แผนนี้ยังไม่มีสินค้า" : "ลองดูว่าเขาจะเลือกทำต่อแบบไหน",
      speaker: name,
      dialogue: "“อยากทำต่อ และถ้ามีเพื่อนอยากเริ่ม เราจะแนะนำให้”",
      milestone: "ดูแลคนแรกสำเร็จ",
      actions: [action("ดูแลต่อในเดือนหน้า", EVENTS.CONTINUE_CARE, { icon: "care" })]
    },
    [STAGES.M1_XVISOR_INTEREST]: {
      scene: "interest",
      progress: 85,
      eyebrow: "มีคนอยากร่วมทาง",
      title: `อธิบายบทบาท X-VISOR ให้${name}`,
      reason: "เล่าว่าการดูแลคนต้องเรียนรู้และฝึกอย่างไร",
      speaker: name,
      dialogue: "“ถ้าเราอยากช่วยคนอื่นให้เริ่มแบบนี้บ้าง ต้องเรียนอะไร?”",
      actions: [action("เล่าเส้นทาง Xcademy", EVENTS.EXPLAIN_XVISOR, { icon: "academy" })]
    },
    [STAGES.M1_CANDIDATE]: {
      scene: "candidate",
      progress: 87,
      eyebrow: "เตรียมสมาชิกใหม่",
      title: `ช่วย${name}เตรียมเป็น X-VISOR`,
      reason: "ช่วยเขาฝึกและผ่านการรับรองในเกม",
      speaker: "ทีม",
      dialogue: "การพัฒนาคนคือทำให้เขาทำได้เอง ไม่ใช่แค่เพิ่มชื่อในทีม",
      actions: [action("ช่วยเขาเตรียมเป็น X-VISOR", EVENTS.PREPARE_G1, { icon: "team", cost: 3 })]
    },
    [STAGES.M1_G1]: {
      scene: "first_g1",
      progress: 89,
      eyebrow: "สมาชิกทีมคนแรก",
      title: "มีคนร่วมทางแล้ว",
      reason: `${name}เป็น X-VISOR ใหม่ แต่ยังมีลูกค้า 0 และยังต้องฝึกจากเคสจริง`,
      speaker: name,
      dialogue: "“เรายังไม่มั่นใจว่าจะเริ่มคุยกับใครก่อน”",
      milestone: "สมาชิกทีมคนแรก",
      actions: [action("พาทีมเข้า Xcademy", EVENTS.START_WEEKLY, { icon: "weekly", cost: 2 })]
    },
    [STAGES.M1_WEEKLY_RUNNING]: {
      scene: "weekly",
      progress: 90,
      eyebrow: "ห้องเรียน Xcademy",
      title: "ล้อมวงคุยเคสกัน",
      reason: "ช่วยกันเลือกสิ่งที่จะกลับไปลอง",
      speaker: "ทีม",
      dialogue: "กำลังทบทวนคนที่ควรคุย เคสที่ควรติดตาม และสิ่งที่แต่ละคนจะทำต่อ…",
      status: "weekly",
      actions: []
    },
    [STAGES.M1_TEAM_STARTED]: {
      scene: "team_started",
      progress: 91,
      eyebrow: "เดินผ่านเดือนแรกแล้ว",
      title: state.team.length ? "จากคนแรก สู่เพื่อนร่วมทีม" : "ดูแลคนแรกครบเดือนแล้ว",
      reason: "เดือนหน้าคุณเลือกเองว่าจะดูแลใครต่อ",
      speaker: "ทีม",
      dialogue: "คนที่ดูแลไว้ยังอยู่ต่อ ลองดูว่าเดือนหน้าจะเกิดอะไรขึ้นบ้าง",
      actions: [action("จบเดือน 1", EVENTS.END_MONTH, { icon: "month" })]
    },
    [STAGES.MONTH_CLOSED]: {
      scene: "month_closed",
      progress: Math.min(98, 75 + state.month),
      eyebrow: `สรุปเดือน ${state.month}`,
      title: "เดือนนี้สร้างอะไรไว้บ้าง",
      reason: "บันทึกยอดเดือนนี้แล้ว เทียบกับเดือนก่อนได้",
      speaker: "ทีม",
      dialogue: "เริ่มเดือนใหม่ด้วยพลังงาน 28 แต้ม ลูกค้า ทีม และประวัติยังอยู่",
      monthSummary: state.monthSummaries.at(-1),
      actions: [action(`▶ เริ่มเดือน ${state.month + 1}`, EVENTS.START_NEXT_MONTH, { icon: "month" })]
    },
    [STAGES.SEASON_REVIEW]: {
      scene: "season_review",
      progress: 100,
      eyebrow: "เส้นทางที่คุณสร้าง",
      title: "องค์กรโตจากคนที่ทำได้เอง",
      reason: "ย้อนดูว่าลูกค้าและทีมร่วมสร้างอะไรไว้",
      speaker: "ทีม",
      dialogue: "จากที่ลงมือเอง คุณเริ่มมีคนช่วยดูแลคนอื่น ลองดูผลงานของแต่ละเดือนกัน",
      actions: []
    }
  };
  return { actions: [], progress: 0, eyebrow: "X-VISOR QUEST", ...copy[state.stage] };
}
var TERM_HELP = Object.freeze({
  XV: "XV เป็นหน่วยผลงานในเกม ไม่ใช่เงินบาท ส่วน TGV คือ XV รวมของทั้งองค์กรในเดือนนั้น",
  ENERGY: `พลังงานคือเวลาทำงานในเดือนนี้ มี ${MAX_ENERGY} แต้ม งานที่ทีมทำเองไม่หักพลังงานของคุณ`,
  XIRCLE: "สายรัดช่วยดูสิ่งที่ทำ เครื่องชั่งช่วยดูแนวโน้มร่างกาย ใช้ข้อมูลมาคุยและเลือกสิ่งที่จะทำต่อ",
  XOS: "รายการแนะนำว่าวันนี้ควรดูแลใครก่อน คุณเลือกทางอื่นได้เสมอ"
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
      eyebrow: `ดูแลภาพรวม · เดือน ${state.month}`,
      title: `องค์กรเดินต่อ · ${Number(economy.tgv || 0).toLocaleString("th-TH")} XV`,
      reason: "ปีนี้ดูผลของลูกค้าและทีมที่สร้างไว้ทีละเดือน",
      speaker: "ทีม",
      dialogue: `ลูกค้าที่อยู่ต่อ ${Number(agg.activeCustomers || 0).toLocaleString("th-TH")} คน · X-VISOR ${Number(agg.xvisorCount || state.team?.length || 0).toLocaleString("th-TH")} คน · XLEAD ${Number(agg.xleadCount || 0).toLocaleString("th-TH")} คน`,
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
      eyebrow: "นัดพบทีม · The Xircle",
      title: "The Xircle มาแล้ว · แคมป์ 2 วัน 1 คืน",
      reason: "พักมาพบกัน แล้วเติมแรงกลับไปดูแลคนต่อ",
      speaker: "ทีม",
      dialogue: `นัดปีนี้: ${XIRCLE_MONTHS.map((month) => `เดือน ${month}`).join(" · ")}`,
      facts: [["ชวนใคร", "คนที่พร้อมมาพบและเรียนรู้กับทีม"], ["ผลในเกม", "เพิ่มแรงส่งในการทำงาน 2 เดือน"]],
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "the-xircle") {
    return {
      ...base,
      scene: "open_house_running",
      eyebrow: `The Xircle · เดือน ${state.month}`,
      title: `มา ${state.sceneReport.attended} จาก ${state.sceneReport.invited} คน`,
      reason: "นำสิ่งที่ได้เรียนรู้กลับไปลองกับงานของแต่ละคน",
      speaker: "ทีม",
      dialogue: "คุณเองก็ได้ฝึกและเติมแรงจากการพบกันครั้งนี้",
      facts: (state.sceneReport.messages || []).map((message, index) => [index === 0 ? "คนที่มา" : index === 1 ? "ทีม" : "คุณ", message]),
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "xlead-exam") {
    return {
      ...base,
      eyebrow: "ผ่านการรับรอง XLEAD",
      title: "เปิดรายได้จากการช่วยทีม",
      reason: "ดูส่วนที่ทีมช่วยสร้างในช่อง ②",
      speaker: "ทีม",
      dialogue: "คุณผ่านการสอบแล้ว ช่อง ② เริ่มนับจากผลงานของทีมที่คุณพัฒนามาโดยตรง",
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.sceneReport?.kind === "xgen-exam") {
    return {
      ...base,
      eyebrow: "ผ่านการรับรอง XGEN",
      title: "เห็นผลงานทั้งองค์กร",
      reason: "ช่อง ③ เปิดหลังถึงเกณฑ์และผ่านการสอบ",
      speaker: "ทีม",
      dialogue: "ตอนนี้ผลงานของทั้งองค์กรมีส่วนในรายได้ช่อง ③ แล้ว",
      actions: getBestNextActions2(state, 3)
    };
  }
  if (state.campaignComplete && state.stage === "month_closed") {
    const score = state.campaignScore || {};
    return {
      ...base,
      scene: "season_review",
      eyebrow: "สรุปปีแรก · เดือน 12",
      title: "เก็บผลงานปีแรกไว้",
      reason: "คะแนนช่วงนี้บันทึกแล้ว เล่นต่อปีที่สองได้",
      speaker: "ทีม",
      dialogue: "ปีต่อไปลองดูว่าลูกค้าและทีมจะเดินต่ออย่างไร",
      facts: [
        ["🏆 Best TGV", `${Number(score.bestTgv || 0).toLocaleString("th-TH")} XV`],
        ["💰 รายได้รวม 12 เดือน", `฿${Number(score.totalIncome || 0).toLocaleString("th-TH")}`],
        ["💎 สูงสุด/เดือน", `฿${Number(score.bestMonthlyIncome || 0).toLocaleString("th-TH")}`],
        ["🏙️ คนในองค์กร", `${Number(score.organizationSize || 0).toLocaleString("th-TH")} คน`]
      ],
      actions: [{ label: "▶ เล่นต่อปีที่ 2", event: EVENTS2.START_NEXT_MONTH, icon: "play" }]
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
    [EVENTS3.REQUEST_CONSENT]: `🛡️ ขออนุญาต ${name} ดูข้อมูล`,
    [EVENTS3.START_CUSTOMER_BASELINE]: `⚖️ ดูข้อมูลเริ่มต้นกับ ${name}`,
    [EVENTS3.OPEN_ROUTINE_BUILDER]: `🧩 เลือกแผนดูแล ${name}`,
    [EVENTS3.MAKE_OFFER]: `📁 คุยแฟ้ม X กับ ${name}`,
    [EVENTS3.CLOSE_RECEIPT]: `❤️ ดูแล ${name} ต่อ`,
    [EVENTS3.START_ONBOARDING]: `🧭 ช่วย ${name} เริ่มและนัดติดตาม`,
    [EVENTS3.FOLLOW_UP_CUSTOMER]: `❤️ ติดตาม ${name} ถึงวันที่ 28`,
    [EVENTS3.START_CUSTOMER_REVIEW]: `📊 วัดซ้ำกับ ${name}`,
    [EVENTS3.SAVE_SUCCESS]: `✅ บันทึกสิ่งที่ได้ผลกับ ${name}`,
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
  return getBestNextActions3(state, 3).map((item) => ({ ...item, ...item.payload, id: item.id ?? item.payload?.id ?? item.targetId }));
}
function finish(state, content) {
  // Keep fallback copy and its portrait aligned with the actual narrator.
  // Questions and customer quotes remain intact when the story view is absent.
  const beat = getStoryBeat(state, content);
  const portrait = beat?.portrait || content.portrait || (content.speaker === "เอโกะ" ? "ako" : content.speaker === "ทีม" ? "teem" : content.quiz?.exam ? "teacher" : content.quiz ? "customer" : "teem");
  return nameTutorialActions(state, {
    ...content,
    speaker: beat?.speaker || content.speaker,
    portrait,
    dialogue: beat && beat.portrait !== "customer" ? beat.line : content.dialogue
  });
}
function realSingleMonthXgen(state, tgv) {
  return Boolean(
    Number(tgv || 0) >= XGEN_SINGLE_MONTH_TARGET || state.career?.xgenQualifiedSingleMonth || state.career?.xgenQualificationRule === "single-month" || state.career?.xgenCertified1b || state.campaignOutcome?.xgenByMonth12
  );
}
function getStageContent3(state) {
  if (state.stage === STAGES.LIVE_RUNNING) {
    return finish(state, {
      scene: "live-studio", progress: Math.min(98, 76 + Number(state.month || 0)),
      eyebrow: `Live · เดือน ${state.month}`, title: "ไลฟ์คุยแฟ้ม X",
      reason: "ให้แต่ละคนฟังและเลือกตามความพร้อม",
      speaker: "ทีม", dialogue: "คุยแฟ้ม X กับคนที่พร้อมได้หลายคนในครั้งเดียว แล้วฟังว่าใครอยากเริ่มหรือขอเวลา",
      status: "live", actions: []
    });
  }
  if (state.stage === STAGES.XIRCLE_RUNNING) {
    return finish(state, {
      scene: "the-xircle",
      progress: Math.min(98, 76 + Number(state.month || 0)),
      eyebrow: `The Xircle · เดือน ${state.month}`,
      title: "พักมาฟังเรื่องของกันและกัน",
      reason: "ใช้เวลาพบทีม ก่อนกลับไปดูแลคนต่อ",
      speaker: "ทีม",
      dialogue: "เรื่องของเพื่อนอาจช่วยให้เราเห็นทางไปต่อ",
      status: "xircle",
      actions: []
    });
  }
  const base = getStageContent2(state);
  if (state.organizationMode) {
    const economy2 = calculateEconomy3(state);
    const agg = state.organization?.aggregate || {};
    const xgenPath = state.year2Path === "xgen";
    return finish(state, {
      ...base,
      scene: base.scene,
      progress: 100,
      eyebrow: `${xgenPath ? "XGEN" : "XLEAD"} · เดือน ${state.month}`,
      title: "ดูเส้นทางของลูกค้าและทีม",
      reason: "ผ่านไปทีละเดือน แล้วเทียบกับสิ่งที่เคยสร้างไว้",
      speaker: "ทีม",
      dialogue: `ลูกค้าที่อยู่ต่อ ${fmt(agg.activeCustomers)} คน · X-VISOR ${fmt(agg.xvisorCount || state.team?.length)} คน · XLEAD ${fmt(agg.xleadCount)} คน`,
      facts: [
        ["🏙️ TGV เดือนนี้", `${fmt(economy2.tgv)} XV`],
        ["💰 รายได้เดือนนี้", `฿${fmt(economy2.projectedIncome)}`],
        ["เส้นทางปีที่ 2", xgenPath ? "XGEN · เปิดช่อง ③ และทริปของทีม" : "XLEAD · ดูแลทีมต่อในช่อง ① และ ②"]
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
      eyebrow: "สรุปปีแรก · เดือน 12",
      title: "12 เดือนแรกจบแล้ว",
      reason: "ใส่ชื่อเก็บคะแนนปีแรก แล้วไปต่อถึงเดือน 24",
      speaker: "ทีม",
      dialogue: state.campaignOutcome?.xgenByMonth12 ? "ปีที่สองเดินต่อในเส้นทาง XGEN" : "ปีที่สองเดินต่อในเส้นทาง XLEAD ลองดูสิ่งที่ลูกค้าและทีมช่วยสร้าง",
      facts: [
        ["🏆 Best TGV", `${fmt(score.bestTgv)} XV`],
        ["💰 รายได้รวม 12 เดือน", `฿${fmt(score.totalIncome)}`],
        ["💎 สูงสุด / เดือน", `฿${fmt(score.bestMonthlyIncome)}`],
        ["🏙️ คนในองค์กร", `${fmt(score.organizationSize)} คน`]
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: "🏆 ใส่ชื่อเก็บคะแนน", ui: "v9-finale", icon: "certificate" }]
    });
  }
  const economy = calculateEconomy3(state);
  const tgv = Number(economy.tgv || 0);
  const singleMonthQualified = realSingleMonthXgen(state, tgv);
  if (singleMonthQualified && !state.career?.xgenExamPassed && !state.organizationMode) {
    return finish(state, {
      ...base,
      eyebrow: "พร้อมสอบ XGEN",
      title: "ถึงเกณฑ์แล้ว · สอบ XGEN ได้เลย",
      reason: "แตะ 3,000,000 XV ในเดือนเดียวแล้ว สอบผ่านเพื่อเปิดรายได้ช่อง ③",
      actions: quick3(state)
    });
  }
  if (["xgen-qualified", "xgen-qualified-1b", "xgen-exam"].includes(state.sceneReport?.kind) && singleMonthQualified) {
    return finish(state, {
      ...base,
      scene: "xgen",
      eyebrow: "ผ่านการรับรอง XGEN",
      title: "เปิดรายได้จากทั้งองค์กร",
      reason: "ช่อง ③ เริ่มนับในเดือนที่ผ่านเกณฑ์และสอบผ่าน",
      speaker: "ทีม",
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} XV · เกณฑ์ ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ["ช่วงที่วัด", "เดือนปัจจุบันเดือนเดียว"],
        ["การรับรอง", "ผ่านแล้วในรอบนี้"],
        ["รายได้ช่อง ③", "5% ของ TGV เดือนนี้"]
      ],
      actions: quick3(state)
    });
  }
  if (!singleMonthQualified && state.stage === STAGES.MANAGEMENT && Number(state.month || 0) >= 1 && Number(state.month || 0) <= CAMPAIGN_MONTHS && tgv >= XGEN_GOAL_VISIBLE_AT) {
    const remaining = Math.max(0, XGEN_SINGLE_MONTH_TARGET - tgv);
    return finish(state, {
      ...base,
      scene: base.scene,
      eyebrow: "ใกล้เกณฑ์ XGEN",
      title: `เหลืออีก ${fmt(remaining)} XV ในเดือนนี้`,
      reason: "เป้าหมายคือ 3,000,000 XV ภายในเดือนเดียว ตอนนี้ยังไม่ถึงเกณฑ์",
      speaker: "ทีม",
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} / ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ["ช่วงที่วัด", "เดือนปัจจุบันเดือนเดียว"],
        ["เกณฑ์เดือนเดียว", "ยังไม่ผ่าน"]
      ],
      actions: quick3(state)
    });
  }
  if (state.sceneReport?.kind === "the-xircle" || state.sceneReport?.kind === "xircle-announcement") {
    return finish(state, {
      ...base,
      scene: "the-xircle",
      eyebrow: "นัดพบทีม · The Xircle",
      title: state.sceneReport?.kind === "xircle-announcement" ? "ถึงรอบนัดพบทีมแล้ว" : "เติมแรงกลับไปดูแลกันต่อ",
      reason: "พักจากงานประจำ เชื่อมความสัมพันธ์ และเติมพลังให้ทีมพร้อมเริ่มอีกครั้ง",
      actions: quick3(state)
    });
  }
  if (state.stage === "management" || state.sceneReport?.kind === "xlead-exam") {
    const actions = quick3(state);
    return finish(state, { ...base, actions });
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
