import { MANAGEMENT_LINES, TEAM_LINES, YEAR2_LINES, STORY_ALTERNATIVES, getEncounterCopy, selectNarrativeText } from "./game-narrative-data.js";

// Dialogue only: no save flags, random choices, timers, or economic calculations.
// Stable keys let the view animate a new beat once without adding a Next step.
const mentor = (key, line, tip = "", mood = "warm") => ({
  key, speaker: "ทีม", portrait: "teem", line, tip, mood
});

const BEATS = Object.freeze({
  opening: ["ผมทีม จะช่วยพาลองทีละอย่างนะ เริ่มจากคนหนึ่งคน แล้วมาดูว่าเราจะสร้างอะไรต่อได้", "เริ่มจากดูแลตัวเอง แล้วค่อยไปพบคนแรกด้วยกัน"],
  pre_day0_band: ["เริ่มจากดูแลตัวเองก่อนนะ ใส่สายรัด แล้วมาดูเรื่องราวระหว่างวันกัน", "Xircle Band ช่วยดูการขยับและสัญญาณระหว่างวัน"],
  pre_day0_scale: ["เราจะเก็บจุดเริ่มต้นไว้ อีกหน่อยค่อยกลับมาดูว่าอะไรเปลี่ยน", "ข้อมูลครั้งแรกเรียกว่า Baseline ไว้เทียบกับครั้งต่อไป"],
  pre_day0_scanning: ["รอแป๊บเดียว กำลังอ่านข้อมูลนะ"],
  pre_day0_summary: ["ได้จุดเริ่มต้นแล้ว ลองเลือกสิ่งเล็ก ๆ ที่ทำต่อได้ทุกวันกัน"],
  pre_montage: ["ผ่านไปทีละวัน ลองดูว่าสิ่งเล็ก ๆ ที่ทำต่อเนื่องจะทิ้งร่องรอยอะไรไว้"],
  pre_day3_abcd: ["เอโกะเองนะ ลองเลือกสิ่งเล็กที่ทำไหวก่อน ตัวช่วยค่อยเพิ่มให้พอดีกับชีวิต", "C คือพฤติกรรมที่ทำเอง ส่วน A / B / D คือกลุ่มตัวช่วย"],
  pre_day14_scale: ["ผ่านมา 14 วันแล้ว คิดว่าตัวเลขทุกตัวจะเปลี่ยนไปพร้อมกันไหม?"],
  pre_day14_scanning: ["กำลังเทียบกับจุดเริ่มต้น เดี๋ยวค่อยอ่านผลด้วยกัน"],
  pre_day14_review: ["น้ำหนักเท่าเดิม แต่บางอย่างเริ่มเปลี่ยน เห็นไหมว่าเลขเดียวเล่าได้ไม่หมด"],
  pre_day28_scale: ["ครบ 28 วันแล้ว มาดูว่าควรเก็บอะไรไว้ทำต่อ"],
  pre_day28_scanning: ["กำลังเก็บผลรอบนี้ไว้เทียบกัน"],
  pre_day28_review: ["ตอนนี้เราได้ลองฟังทั้งข้อมูลและชีวิตคนแล้ว พร้อมลองช่วยใครสักคนหรือยัง?"],
  exam_transit: ["ลองทบทวน 5 ข้อกัน ข้อไหนยังไม่เข้าใจ กลับมาลองใหม่ได้"],
  certification_ceremony: ["ผ่านแล้วนะ รับใบรับรอง แล้วไปพบคนแรกด้วยกัน", "ค่อย ๆ ฟัง แล้วใช้สิ่งที่เรียนช่วยเขาเริ่มต้น"],
  certified: ["โต๊ะยังว่างอยู่ แต่เราเริ่มได้แล้ว ลองทำให้คนหนึ่งคนอยากกลับมาหาเรา", "พลังงานเดือนละ 28 แต้ม เลือกใช้กับคนที่ต้องการเราก่อน"],
  m1_empty: ["ยังไม่ต้องคิดถึงทีมใหญ่ เริ่มจากฟังคนหนึ่งคนให้เข้าใจก่อน"],
  m1_baseline_intro: ["เขาอนุญาตแล้ว เราดูเฉพาะข้อมูลที่ช่วยคุยและติดตามกันนะ"],
  m1_baseline_scanning: ["ข้อมูลกำลังมา เดี๋ยวลองอ่านคู่กับสิ่งที่เขาเล่า"],
  m1_baseline: ["ถ้าแผนดีแต่ทำไม่ไหว จะช่วยได้แค่ไหน? ลองเลือกให้พอดีกับชีวิตเขา"],
  m1_recommendation: ["คุยแฟ้ม X ให้ชัด แล้วให้เขาเลือกเองว่าจะเริ่มหรือยัง"],
  m1_sale_receipt: ["เขาเลือกเริ่มแล้วนะ ลองดูแลต่อว่าอะไรจะทำให้เขาอยากอยู่กับเรา", "ช่อง ① คือรายได้จากยอดซื้อของลูกค้าที่คุณดูแล"],
  m1_review_scan: ["กลับมาดูด้วยกันว่าอะไรทำได้จริง แล้วค่อยเลือกสิ่งที่จะทำต่อ"],
  m1_review_scanning: ["ดูทั้งสิ่งที่ทำต่อได้และแนวโน้มของข้อมูลนะ"],
  m1_candidate: ["เขาอยากช่วยคนอื่นบ้างแล้ว เรามาช่วยให้เขาทำได้ด้วยตัวเองกัน", "ก่อนเป็น X-VISOR เขาจะได้เรียน ฝึกดูแลคน และผ่านการรับรอง"],
  m1_weekly_running: ["เรามาล้อมวงคุยเคสกัน แต่ละคนจะได้รู้ว่ากลับไปทำอะไรต่อ", "Xcademy คือห้องเรียนและที่ฝึกของทีม"],
  content_running: ["มีคนเห็นเรื่องที่เราเล่าแล้ว ลองฟังต่อว่าเขาสนใจอะไร"],
  ads_running: ["คนใหม่เริ่มเข้ามา แต่ความไว้ใจยังต้องค่อย ๆ สร้างจากการคุย"],
  xcademy_running: ["วันนี้ได้ช่วยกันคิดหลายเคส ลองตามดูว่าแต่ละคนกลับไปทำอะไรได้บ้าง"],
  center_running: ["วันนี้ได้ช่วยกันคิดหลายเคส ลองตามดูว่าแต่ละคนกลับไปทำอะไรได้บ้าง"],
  open_house_running: ["ได้พบกันแล้ว งานต่อไปคือคุยให้ตรงกับสิ่งที่แต่ละคนต้องการ"],
  good_luck_running: ["ได้พบกันแล้ว งานต่อไปคือคุยให้ตรงกับสิ่งที่แต่ละคนต้องการ"],
  xircle_running: ["พักมาฟังกันบ้างนะ เรื่องเล่าของเพื่อนอาจช่วยให้เราเห็นทางไปต่อ"]
});

const CUSTOMER_STAGES = new Set([
  "m1_person_met", "m1_discovery", "m1_routine", "management_routine",
  "m1_onboarding", "m1_followup", "m1_review", "m1_success",
  "m1_xvisor_interest", "m1_g1", "g1_celebration"
]);

function customerBeat(state, content) {
  const people = [...(state.prospects || []), ...(state.customers || []), ...(state.team || [])];
  const person = people.find(item => item.id === state.selectedPersonId);
  const tip = ["m1_g1", "g1_celebration"].includes(state.stage)
    ? "ทีม: คนที่คุณช่วยพัฒนามาโดยตรงเรียกว่า G1 ต่อไปลองช่วยเขาดูแลลูกค้าของตัวเอง"
    : state.stage === "m1_success" ? "ทีม: ความไว้ใจทำให้มีโอกาสกลับมาอีก เราจะเห็นผลตอนที่เขาเลือกเอง"
    : state.lastEvent === "ROUTINE_UNAVAILABLE" ? "ทีม: แผนนี้ยังไม่พร้อม ดูเงื่อนไขที่ปุ่มแล้วค่อยเลือกนะ" : "";
  return {
    key: `${state.stage}:${person?.id || state.sceneReport?.name || "customer"}:${state.lastEvent || ""}`,
    speaker: content.speaker || person?.name || "ลูกค้า",
    portrait: "customer", line: content.dialogue || person?.quote || "", tip, mood: "listening"
  };
}

function changedTransaction(state, context) {
  const transaction = state.economy?.lastTransaction;
  const previous = context.previousState?.economy?.lastTransaction;
  return transaction?.kind === "reorder" && transaction.id && context.previousState
    && transaction.id !== previous?.id && (!context.event || context.event === "REORDER_CUSTOMER")
    ? transaction : null;
}

/**
 * @returns {{speaker:string,line:string,tip:string,mood:string,key:string,portrait:string}|null}
 * context.previousState/event describe the most recent user action. They are
 * optional: loading a save uses the stage beat and never invents a fresh result.
 * context.surface may be "scene", "month-summary", or "finale".
 */
function selectStoryBeat(state = {}, content = {}, context = {}) {
  if (content.quiz || ["exam_active", "exam_repair"].includes(state.stage)) return null;
  if (context.event === "RESOLVE_ENCOUNTER") {
    const previous = context.previousState?.encounters?.pending;
    const resolved = state.encounters?.resolved?.find(item => item.id === previous?.id && item.id === context.payload?.encounterId && item.choiceId === context.payload?.choiceId);
    if (resolved && resolved.choiceId !== "skip") {
      const actor = getEncounterCopy({ ...previous, choices: [{ id: resolved.choiceId }] }, state);
      const choice = actor?.choices.find(item => item.id === resolved.choiceId);
      if (choice?.result) return { key: `encounter-result:${resolved.id}`, speaker: actor.speaker, portrait: actor.portrait, mood: actor.mood, line: choice.result, tip: choice.detail };
    }
  }
  if (state.stage === "live_running") return mentor("live-running", "คุยแฟ้ม X กับคนที่พร้อมได้หลายคนในครั้งเดียว แล้วฟังว่าใครอยากเริ่มหรือขอเวลา");
  const live = state.liveReport;
  const freshLive = live?.id && Number(live.month) === Number(state.month)
    && ((!context.event && state.sceneReport?.kind === "live") || context.event === "SCENE_COMPLETE" && context.previousState?.stage === "live_running" && live.id !== context.previousState.liveReport?.id);
  if (freshLive && Number.isFinite(live.attempted) && Number.isFinite(live.sales)) {
    const waiting = Array.isArray(live.declinedIds) ? live.declinedIds.length : null;
    return mentor(`live-result:${live.id}`, live.attempted ? `คุยแฟ้ม X ผ่าน Live ${live.attempted} คน มี ${live.sales} คนเลือกเริ่ม${waiting ? ` และ ${waiting} คนขอเวลา` : ""}` : "รอบนี้ยังไม่มีคนพร้อมคุยแฟ้ม X ลองกลับไปฟังบริบทของเขาก่อน", live.sales ? "คนที่เริ่มแผนยังต้องรับการดูแลต่อจากวันแรก" : "ยังไม่มียอดขายจากรอบนี้ ให้เวลากับคนที่ยังขอคิด");
  }
  if (state.runComplete || context.surface === "finale" && Number(state.month) >= 24) {
    return mentor("month24", "ครบ 24 เดือนแล้ว ลองย้อนดูว่าลูกค้ากับทีมพาเรื่องของเราไปถึงไหน", "แต่ละรอบเติบโตต่างกัน รายได้และคนที่อยู่ต่อดูได้จากประวัติ", "proud");
  }
  if (state.campaignComplete && !state.organizationMode && context.surface !== "month-summary") {
    return mentor("month12", "ผ่านปีแรกแล้ว ปีต่อไปมาดูว่าลูกค้ากับทีมที่ดูแลไว้จะเดินต่ออย่างไร", "เก็บผลงานปีแรกไว้ แล้วออกเดินต่อจนถึงเดือน 24", "proud");
  }
  if (context.surface === "month-summary" || state.stage === "month_closed") {
    return mentor(`month-summary:${state.month}`, "เดือนนี้มีอะไรเกิดจากลูกค้าเดิม และอะไรเกิดจากทีมบ้าง? ลองเทียบกับเดือนก่อนกัน", "ยอดอาจเพิ่มหรือลดได้ ตัวเลขที่ปิดเดือนแล้วอยู่ในประวัติ");
  }
  if (state.sceneReport?.kind === "xgen-exam" && state.career?.xgenExamPassed && (!context.event || context.event === "XGEN_EXAM") || state.stage === "xgen_milestone" && state.career?.xgenExamPassed) {
    return mentor("xgen-certified", "ผ่าน XGEN แล้วนะ เรามองเห็นผลงานของทั้งองค์กรด้วยกันแล้ว", "TGV คือผลงานรวมทั้งองค์กร ช่อง ③ คิด 5% จากยอดนี้ในแต่ละเดือน", "proud");
  }
  if (state.sceneReport?.kind === "xlead-exam" && (!context.event || context.event === "XLEAD_EXAM") || state.stage === "xlead_milestone") {
    return mentor("xlead-certified", "ตอนนี้เป็น XLEAD แล้ว งานที่ช่วยทีมเริ่มมีส่วนในรายได้ของเรา", "ช่อง ② คิด 20% จากค่าตอบแทนของ G1 แต่ละคน ไม่ใช่ 20% ของยอดขาย", "proud");
  }
  if (!state.organizationMode && !state.career?.xgenExamPassed && (state.career?.xgenQualifiedSingleMonth || state.career?.xgenQualificationRule === "single-month")) {
    return mentor("xgen-ready", "ผลงานเดือนหนึ่งถึงเกณฑ์ XGEN แล้ว เหลือทบทวนและสอบให้ผ่านก่อนเปิดช่อง ③", "เกณฑ์คือ 3,000,000 XV ในเดือนเดียว เปิดรายละเอียดเพื่อดูวิธีนับผลงานได้");
  }
  if (CUSTOMER_STAGES.has(state.stage)) return customerBeat(state, content);
  if (["CHOOSE_MANAGEMENT_ROUTINE", "OFFER_PROSPECT", "MAKE_OFFER"].includes(context.event) && context.previousState && state.stage === "management") {
    const id = context.payload?.id || context.previousState.selectedPersonId;
    const person = [...(state.prospects || []), ...(state.customers || [])].find(item => item.id === id || item.personId === id);
    if (person?.careOnly && context.payload?.planId === "control") return mentor(`care-start:${id}:${state.month}`, `${person.name || "เขา"}เลือกเริ่มจากพฤติกรรมเดียวแล้ว นัดติดตามกันต่อได้`, "แผนนี้ยังไม่มีสินค้า จึงยังไม่มียอดขาย");
    if (person?.journey === "waiting" && Number(person.nextOfferMonth) > Number(state.month)) return mentor(`offer-waiting:${id}:${person.nextOfferMonth}`, `${person.name || "เขา"}ขอเวลาคิดก่อน ความสัมพันธ์ยังอยู่`, `กลับไปคุยแฟ้ม X ได้ในเดือน ${person.nextOfferMonth}`);
  }
  const opening = state.monthOpeningReport;
  const freshOpening = context.event === "START_NEXT_MONTH" && context.previousState
    && state.stage === "management" && !state.organizationMode
    && Number(context.previousState.month) < Number(state.month)
    && Number(opening?.month) === Number(state.month)
    && Number(context.previousState.monthOpeningReport?.month) !== Number(opening.month);
  if (freshOpening) {
    const automatic = opening.automaticCustomerIds?.length || 0;
    const followUp = opening.followUpCustomerIds?.length || 0;
    const paused = opening.pausedCustomerIds?.length || 0;
    const line = Number(opening.eligibleCount) > 0
      ? `เริ่มเดือน ${state.month} แล้ว ลูกค้าเดิมซื้อซ้ำเอง ${automatic} คน${followUp ? ` ยังรอคุย ${followUp} คน` : ""}${paused ? ` และขอพัก ${paused} คน` : ""}`
      : `เริ่มเดือน ${state.month} แล้ว เดือนนี้ยังไม่มีลูกค้าเดิมที่ถึงรอบซื้อซ้ำ`;
    const tip = followUp + paused > 0
      ? "ดูคนที่ยังไม่ซื้อหรือขอพักใน XOS และ “ผู้คน” แล้วฟังว่าเขาพร้อมแค่ไหน"
      : "คนที่ซื้อแล้วไม่ต้องตามซื้อซ้ำ ใช้เวลากับคนที่ยังต้องการความช่วยเหลือได้";
    return mentor(`month-opening:${state.month}`, line, tip);
  }
  if (context.event === "REORDER_CUSTOMER" && context.previousState && state.stage === "management") {
    const id = context.payload?.id;
    const customer = state.customers?.find(person => person.id === id);
    const previous = context.previousState.customers?.find(person => person.id === id);
    if (customer?.renewalStatus === "paused" && Number(customer.renewalMonth) === Number(state.month)
      && Number(customer.lastRenewalFollowUpMonth) === Number(state.month)
      && Number(previous?.lastRenewalFollowUpMonth) !== Number(state.month)) {
      return mentor(`renewal-paused:${id}:${state.month}`, `${customer.name || "เขา"}ขอพักต่อ รอบนี้ยังไม่ซื้อซ้ำ`, `เดือนนี้คุยกันแล้ว ให้เวลาเขา แล้วค่อยกลับมาคุยใหม่เดือน ${Number(state.month) + 1}`);
    }
  }
  const repeat = changedTransaction(state, context);
  if (repeat) return mentor(`repeat:${repeat.id}`, "เขาเลือกกลับมาซื้ออีกแล้ว รายได้ช่อง ① จึงมีส่วนจากลูกค้าคนเดิมด้วย", "การดูแลช่วยเพิ่มโอกาสให้เขาอยู่ต่อ แต่เขายังเป็นคนตัดสินใจ", "happy");
  if (state.stage === "exam_summary") {
    const passed = Object.values(state.exam?.results || {}).filter(Boolean).length === 5;
    return mentor(passed ? "exam-passed" : "exam-summary", passed ? "ผ่านครบแล้วนะ ไปพบคนแรกด้วยกัน" : "ข้อไหนยังไม่ผ่าน เราค่อยทบทวนตรงนั้น ไม่ต้องเริ่มใหม่ทั้งหมด", "", passed ? "proud" : "warm");
  }
  if (state.stage === "m1_team_started") {
    return mentor("month1-complete", state.team?.length ? "เริ่มจากคนเดียว ตอนนี้มีคนร่วมทางแล้ว เดือนหน้าอยากดูแลใครต่อเป็นคนแรก?" : "เราดูแลคนแรกจนจบเดือนแล้ว เดือนหน้าอยากติดตามเขา หรือเริ่มรู้จักคนใหม่ก่อน?", "คนที่ดูแลไว้ยังอยู่ต่อ พลังงานเดือนใหม่กลับมาเป็น 28 แต้ม");
  }
  if (state.organizationMode) return mentor(`year2:${state.month}`, "ปีนี้เราดูภาพรวมกัน เดือนนี้คนเดิมอยู่ต่อแค่ไหน และทีมดูแลคนเพิ่มได้ไหม?", "ดูรายได้ทั้งสามช่องเทียบเดือนก่อน จะเห็นส่วนที่แต่ละทางช่วยสร้าง");
  const entry = BEATS[state.stage];
  if (entry) return mentor(state.stage, ...entry);
  if (state.stage === "management") {
    if (Number(state.energy) === 0) return mentor(`energy-empty:${state.month}`, "เวลาของเดือนนี้ใช้หมดแล้ว มาดูผลงานก่อนเริ่มเดือนใหม่กัน");
    if (Number(state.month) === 2) return mentor("month2-choices", "เดือนนี้คุณเลือกทางเองแล้ว อยากดูแลคนเดิม หรือเริ่มรู้จักคนใหม่ก่อน?", "สามปุ่มคือคำแนะนำ ยังมีทางเลือกเพิ่มใน “งานทั้งหมด” และ “ผู้คน”");
    if (Number(state.monthStats?.teamActions) > 0) return mentor(`team-working:${state.month}`, "ทีมเริ่มทำงานเองได้แล้วนะ ลองดูว่าส่วนไหนมาจากเขาบ้าง", "คุณยังมีเวลาเท่าเดิม แต่มีคนช่วยสร้างผลงานเพิ่ม");
    return mentor(`management:${state.month}`, "ถ้าอยากให้เดือนหน้าไปต่อได้ วันนี้ควรดูแลใครก่อนดี?", "ดูทั้งลูกค้าที่รอเราและคนในทีมที่ยังต้องการความช่วยเหลือ");
  }
  return content.dialogue ? { key: content.scene || state.stage || "scene", speaker: content.speaker || "ทีม", portrait: "teem", line: content.dialogue, tip: "", mood: "warm" } : null;
}


const AKO_BEATS = new Set(["pre_day3_abcd", "pre_day14_scale", "pre_day14_review", "pre_day28_scale", "m1_review_scan"]);

export function getStoryBeat(state = {}, content = {}, context = {}) {
  const beat = selectStoryBeat(state, content, context);
  if (!beat || beat.portrait === "customer" || beat.key.startsWith("encounter-result:")) return beat;
  const alternatives = STORY_ALTERNATIVES[beat.key];
  let line = alternatives ? selectNarrativeText(state, beat.key, [...new Set([beat.line, ...alternatives])]) : beat.line;
  const month = Math.max(0, Number(state.month) || 0);
  if (beat.key === `management:${month}`) line = selectNarrativeText(state, "management", MANAGEMENT_LINES, month - 1);
  if (beat.key === `team-working:${month}`) line = selectNarrativeText(state, "team-working", TEAM_LINES, month - 1);
  if (beat.key === `year2:${month}`) line = selectNarrativeText(state, "year2", YEAR2_LINES, month - 13);
  const ako = AKO_BEATS.has(beat.key);
  return { ...beat, line, speaker: ako ? "เอโกะ" : "ทีม", portrait: ako ? "ako" : "teem", mood: ako ? "cheerful" : beat.mood };
}
