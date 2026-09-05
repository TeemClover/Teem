import { CUSTOMER_STATES, EVENTS, PEOPLE_RENDER_LIMIT, SAVE_KEY, V1_SCORE_VERSION, buildPersonAction, findPerson, getPersonContextAction, getTgvHistory } from "./game-data.js";
import { getSkillSnapshot } from "./game-progression.js";
import { getEconomyView } from "./game-presentation.js";

export function focusDialogStart(dialog) {
  requestAnimationFrame(() => {
    if (!dialog?.open) return;
    const start = dialog.querySelector("h2") || dialog.querySelector("input, button");
    if (start?.tagName === "H2") start.setAttribute("tabindex", "-1");
    start?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  });
}

export function mountPanels({ getState, dispatch, requestSync }) {
var PROFILE_KEY = "mc_xvisor_certified";
var $2 = (selector, root = document) => root.querySelector(selector);
var dialog = $2("#gameDialog");
var dialogContent = $2("#dialogContent");
var peopleTab = "priority";
var peopleQuery = "";
var peoplePage = 0;
var peopleFocusId = null;
var cloudSyncAttempted = false;
var PERSON_EVENTS = /* @__PURE__ */ new Set([
  EVENTS.CONTACT_PROSPECT,
  EVENTS.MEET_PROSPECT,
  EVENTS.CONSULT_PROSPECT,
  EVENTS.BASELINE_PROSPECT,
  EVENTS.OPEN_MANAGEMENT_ROUTINE,
  EVENTS.OFFER_PROSPECT,
  EVENTS.FOLLOW_UP_DECISION,
  EVENTS.CARE_CUSTOMER,
  EVENTS.REMEASURE_CUSTOMER,
  EVENTS.REORDER_CUSTOMER,
  EVENTS.ASK_REFERRAL,
  EVENTS.INVITE_XVISOR,
  EVENTS.START_CANDIDATE_XCADEMY,
  EVENTS.REVIEW_CANDIDATE,
  EVENTS.CERTIFY_CANDIDATE,
  EVENTS.MENTOR_TEAM_MEMBER
]);
function escapeHtml2(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function baht(value) {
  return `฿${fmt(value)}`;
}
function stateNow() { return getState(); }
function profileCertified() {
  try {
    return localStorage.getItem(PROFILE_KEY) === "1";
  } catch {
    return false;
  }
}
function hardClose() {
  if (dialog?.open) dialog.close();
  if (dialogContent) dialogContent.innerHTML = "";
  if (dialog) {
    delete dialog.dataset.peopleTab;
    delete dialog.dataset.v9Dialog;
  }
  peopleFocusId = null;
  document.body.style.removeProperty("overflow");
  requestAnimationFrame(() => $2("#actionBar button, #peopleButton, #monthButton")?.focus?.());
}
function showDialog2(html, kind = "wide", key = "v9") {
  if (!dialog || !dialogContent) return;
  dialogContent.innerHTML = html;
  dialog.dataset.kind = kind;
  dialog.dataset.v9Dialog = key;
  document.body.style.overflow = "hidden";
  if (!dialog.open) dialog.showModal();
  requestSync();
  focusDialogStart(dialog);
}
function originLabel(person) {
  const origin = person.origin || {};
  if (origin.sourceName) return origin.sourceName;
  const source = origin.sourceType || person.source;
  return { known: "คนที่คุณรู้จัก", referral: "Referral", content: "Content", ads: "Ads", event: "Open House / Event", team: "ทีมพามา", tutorial: "Month 1" }[source] || "Journey ในเกม";
}
function peopleRows(state2) {
  const rows = [
    ...(state2.prospects || []).map((person) => ({ person, kind: "prospect" })),
    ...(state2.customers || []).map((person) => ({ person, kind: "customer" })),
    ...(state2.team || []).map((person) => ({ person, kind: "team" }))
  ];
  const priority = { prospect: 1, customer: 2, team: 3 };
  const unique = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = row.person.personId || row.person.id;
    if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
  }
  return [...unique.values()];
}
function categoryFor(row) {
  const { person, kind } = row;
  if (kind === "team") {
    if (person.rank === "xlead" || Number(person.leaderReadiness || 0) >= 65) return "grow";
    if (Number(person.autonomy || 0) < 55) return "priority";
    return "stable";
  }
  if (kind === "customer") {
    const sat = Number(person.satisfaction || 0);
    if (sat < 55 || person.customerState === CUSTOMER_STATES.NEEDS_HELP) return "priority";
    if (person.xvisorInterest || person.xvisorStage || person.referralReady) return "opportunity";
    if (sat >= 75 || person.selfDirected) return "stable";
    return "priority";
  }
  if (["recommendation", "waiting", "discovery", "baseline"].includes(person.journey)) return "opportunity";
  return ["new", "scheduled", "conversation"].includes(person.journey) ? "grow" : "stable";
}
function actionButton(action, person) {
  if (!action) return "";
  const state2 = stateNow();
  const disabled = Number(action.cost || 0) > Number(state2?.energy || 0) && !state2?.organizationMode;
  return `<button class="work-button" type="button" data-work-event="${escapeHtml2(action.event)}" data-id="${escapeHtml2(person.id)}"${disabled ? " disabled" : ""}><strong>${escapeHtml2(action.label)}</strong><span>${escapeHtml2(action.reason || person.status || "")}</span>${action.cost ? `<b>⚡ ${action.cost}</b>` : ""}</button>`;
}
function rowCard(row, state2) {
  const { person, kind } = row;
  const action = getPersonContextAction(state2, person, kind);
  const actionHtml = actionButton(action, person);
  if (kind === "team") {
    return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.rank === "xlead" ? "XLEAD" : "Certified X-VISOR")} · ${escapeHtml2(person.specialtyLabel || "⚖️ สมดุล")}</span></div><b>${person.active ? "กำลังทำงาน" : "พักอยู่"}</b></div><dl><div><dt>Personal XV</dt><dd>${fmt(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${fmt(person.customers)}</dd></div><div><dt>ทีมย่อย</dt><dd>${fmt(person.downstreamXvisors)}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml || "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>"}</article>`;
  }
  if (kind === "customer") {
    return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>ลูกค้า · ❤️ ${fmt(person.satisfaction)}%</span></div><b>${escapeHtml2(person.status || "")}</b></div><dl><div><dt>ความพอใจ</dt><dd>${fmt(person.satisfaction)}%</dd></div><div><dt>Routine</dt><dd>${person.selfDirected ? "เดินเองได้" : "กำลังดูแล"}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml || "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>"}</article>`;
  }
  return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.journey || "Prospect")}</span></div><b>${escapeHtml2(person.status || "")}</b></div><dl><div><dt>เปิดใจ</dt><dd>${fmt(person.readiness)}%</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
}
function renderPeople(focusId = peopleFocusId) {
  const state2 = stateNow();
  if (!state2) return;
  if (state2.organizationMode) return renderOrganization();
  peopleFocusId = focusId || null;
  const rows = peopleRows(state2);
  const query = peopleQuery.trim().toLocaleLowerCase("th");
  const filtered = rows.filter((row) => {
    if (peopleFocusId && row.person.id !== peopleFocusId && row.person.personId !== peopleFocusId) return false;
    if (query && !String(row.person.name || "").toLocaleLowerCase("th").includes(query)) return false;
    return peopleFocusId || peopleTab === "all" || categoryFor(row) === peopleTab;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PEOPLE_RENDER_LIMIT));
  peoplePage = Math.max(0, Math.min(peoplePage, pages - 1));
  const visible = filtered.slice(peoplePage * PEOPLE_RENDER_LIMIT, (peoplePage + 1) * PEOPLE_RENDER_LIMIT);
  const aggregate = state2.organization?.aggregate;
  showDialog2(`<div class="dialog-kicker">👥 คนของคุณ · ${fmt(rows.length)}${aggregate?.overflowPeople ? ` + ${fmt(aggregate.overflowPeople)} ใน Organization` : ""}</div><h2>${peopleFocusId ? "รายละเอียดและ Next Action" : "ดูเฉพาะคนที่มีเหตุผลให้ดูตอนนี้"}</h2><p class="dialog-note">เลือกกลุ่มหรือค้นหาชื่อ เพื่อดูสิ่งที่แต่ละคนต้องการตอนนี้</p>
    ${peopleFocusId ? `<button class="people-back" type="button" data-v9-clear-focus>← กลับไปรายชื่อ</button>` : `<div class="people-tabs" role="tablist">${[["priority", "🔴 ต้องช่วย"], ["opportunity", "💰 โอกาสดี"], ["grow", "✨ มีแววโต"], ["stable", "✅ เดินเองได้"], ["all", "ทั้งหมด"]].map(([id, label]) => `<button type="button" data-v9-people-tab="${id}" aria-selected="${peopleTab === id}">${label}</button>`).join("")}</div><label class="people-search">ค้นหาชื่อ <input type="search" data-v9-people-search value="${escapeHtml2(peopleQuery)}" placeholder="เช่น เมย์"></label>`}
    <div class="people-grid">${visible.map((row) => rowCard(row, state2)).join("") || '<p class="work-empty">ไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions">${peopleFocusId ? "" : `<button class="dialog-button dialog-button--secondary" type="button" data-v9-page="prev" ${peoplePage <= 0 ? "disabled" : ""}>← ก่อนหน้า</button><span>${peoplePage + 1} / ${pages}</span><button class="dialog-button dialog-button--secondary" type="button" data-v9-page="next" ${peoplePage >= pages - 1 ? "disabled" : ""}>ถัดไป →</button>`}<button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button></div>`, "wide", "people");
}
function renderOrganization() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = getEconomyView(state2);
  const agg = state2.organization?.aggregate || {};
  const leaders = (state2.team || []).filter((member) => member.parentId === "player" || member.rank === "xlead").slice(0, 12);
  showDialog2(`<div class="dialog-kicker">🏙️ ORGANIZATION MODE · MONTH ${state2.month}</div><h2>${fmt(economy.tgv)} XV · ${baht(economy.projectedIncome)}</h2><p class="dialog-note">ภาพรวมลูกค้าและทีม พร้อมผู้นำที่กำลังสร้างผลลัพธ์</p>
    <div class="income-sections"><section><div class="income-heading"><span>❤️ Active Customers</span><b>${fmt(agg.activeCustomers)}</b></div></section><section><div class="income-heading"><span>🌱 X-VISOR</span><b>${fmt(agg.xvisorCount)}</b></div></section><section><div class="income-heading"><span>👑 XLEAD</span><b>${fmt(agg.xleadCount)}</b></div></section><section><div class="income-heading"><span>ทีมทำงานเอง</span><b>${fmt(state2.monthStats?.teamActions)}</b></div><p>งานดูแลลูกค้าและพัฒนาคนที่ทีมทำเองในเดือนนี้</p></section></div>
    <section class="work-section"><h3>ผู้นำของคุณ</h3><div class="people-grid">${leaders.map((member) => rowCard({ person: member, kind: "team" }, state2)).join("") || "<p>ยังไม่มีผู้นำในกลุ่มนี้</p>"}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`, "wide", "organization");
}
function renderIncome() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = getEconomyView(state2);
  const report = state2.organizationMode ? state2.lastOrganizationReport : null;
  const shownIncome = report ? Number(report.income || 0) : Number(economy.projectedIncome || 0);
  const shownLifetime = report ? Number(report.totalIncome || state2.economy?.totalIncome || 0) : Number(economy.lifetimeIncome || 0);
  const shownChannel1 = report ? Number(report.incomeBreakdown?.channel1 || 0) : Number(economy.channel1 || 0);
  const shownChannel2 = report ? Number(report.incomeBreakdown?.channel2 || 0) : Number(economy.channel2 || 0);
  const shownChannel3 = report ? Number(report.incomeBreakdown?.channel3 || 0) : Number(economy.channel3 || 0);
  const top = (economy.mentoringBreakdown || []).slice().sort((a, b) => b.mentorIncome - a.mentorIncome).slice(0, 5);
  const history = [...economy.incomeHistory || []].reverse().slice(0, 12);
  const historyCards = history.map((item) => `<details class="income-history-card"><summary><span>เดือน ${item.month}</span><span>${fmt(item.tgv)} XV</span><b>${baht(item.total)}</b></summary><div><span>① ลูกค้า <b>${baht(item.channel1)}</b></span><span>② พัฒนา G1 <b>${baht(item.channel2)}</b></span><span>③ Organization <b>${baht(item.channel3)}</b></span></div></details>`).join("");
  showDialog2(`<div class="dialog-kicker">REVENUE STACK · 1.0b</div><h2>${report ? `เดือน ${report.month}` : "เดือนนี้"} ${baht(shownIncome)}</h2>
    <div class="revenue-hero"><div><span>💰 ${report ? "รายได้เดือนล่าสุด" : "รายได้เดือนนี้"}</span><strong>${baht(shownIncome)}</strong></div><div><span>∑ รายได้สะสม</span><strong>${baht(shownLifetime)}</strong></div></div>
    <div class="income-sections">
      <section><div class="income-heading"><span>① ขายและดูแลลูกค้า</span><b>${baht(shownChannel1)}</b></div><p>${report ? `ยอดขายบาท ${baht(report.personalSalesBaht)} · XV ${fmt(report.personalXV)} แยกเป็น Volume` : `Personal XV ${fmt(economy.personalXV)} × ${Math.round(economy.retailRate * 100)}% · Tier ดูจากยอดขาย ${baht(economy.personalSalesBaht)}`}</p></section>
      <section><div class="income-heading"><span>② พัฒนา Direct G1 ${economy.mentoringUnlocked ? "" : "· รอ Certified XLEAD"}</span><b>${economy.mentoringUnlocked ? baht(shownChannel2) : "🔒"}</b></div><p>20% ของ commission G1 แต่ละคน</p>${!report && economy.mentoringUnlocked ? `<ul class="income-breakdown">${top.map((item) => `<li><span>${escapeHtml2(item.name)} · ${fmt(item.personalXV)} XV · คอม ${baht(item.commission)}</span><b>${baht(item.mentorIncome)}</b></li>`).join("") || "<li><span>G1 ยังไม่มียอดเดือนนี้</span><b>฿0</b></li>"}</ul>` : ""}</section>
      <section><div class="income-heading"><span>③ บริหาร Organization ${state2.career?.xgenCertified ? "" : "· รอ Certified XGEN"}</span><b>${state2.career?.xgenCertified ? baht(shownChannel3) : "🔒"}</b></div><p>5% ของ TGV <b>เดือนนั้นเท่านั้น</b> · ปิดเดือนแล้วไม่จ่ายยอดเดิมซ้ำ</p></section>
    </div>
    <section class="income-history"><h3>ย้อนหลังรายเดือน</h3>${history.length ? `<div class="income-history-cards">${historyCards}</div><div class="table-scroll income-history-table"><table><thead><tr><th>เดือน</th><th>TGV</th><th>①</th><th>②</th><th>③</th><th>รวม</th></tr></thead><tbody>${history.map((item) => `<tr><th>${item.month}</th><td>${fmt(item.tgv)} XV</td><td>${baht(item.channel1)}</td><td>${baht(item.channel2)}</td><td>${baht(item.channel3)}</td><td><b>${baht(item.total)}</b></td></tr>`).join("")}</tbody></table></div>` : "<p>ปิดเดือนแรกเพื่อเริ่มเก็บประวัติรายได้</p>"}</section>
    <p class="dialog-note">ตัวเลขเป็นผลจากแบบจำลองในเกม ไม่ใช่การรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-v9-close>กลับเกม</button>`, "wide", "income");
}
function renderTgvHelp() {
  const state2 = stateNow();
  if (!state2) return;
  const history = getTgvHistory(state2);
  const last = history.at(-1);
  const best = history.reduce((max, entry) => Math.max(max, Number(entry.tgv || 0)), 0);
  showDialog2(`<div class="dialog-kicker">🏙️ TGV</div><h2>ยอด XV ของคุณและทีมในเดือนนี้</h2><p class="term-definition">TGV เริ่มใหม่ทุกเดือน เดือนที่ปิดไปแล้วจะเก็บไว้เป็นสถิติและจะไม่ถูกนำมาจ่ายซ้ำ</p><div class="summary-grid"><div><span>เดือนนี้</span><strong>${fmt(getEconomyView(state2).tgv)} XV</strong></div><div><span>เดือนที่แล้ว</span><strong>${fmt(last?.tgv)} XV</strong></div><div><span>Best TGV</span><strong>${fmt(best)} XV</strong></div>${state2.career?.xgenQualified ? `<div><span>ถึงเกณฑ์ XGEN</span><strong>เดือน ${fmt(state2.career.xgenQualifiedAtMonth)}</strong></div>` : ""}</div><button class="dialog-button" type="button" data-v9-close>เข้าใจแล้ว</button>`, "wide", "tgv");
}
function renderMonthConfirm() {
  const state2 = stateNow();
  if (!state2) return;
  if (state2.organizationMode) {
    hardClose();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const economy = getEconomyView(state2);
  showDialog2(`<div class="dialog-kicker">🌙 จบเดือน ${state2.month}</div><h2>จบเดือน ${state2.month} ตอนนี้ไหม?</h2><div class="summary-grid"><div><span>🏙️ TGV เดือนนี้</span><strong>${fmt(economy.tgv)} XV</strong></div><div><span>💰 คาดว่าจะได้รับ</span><strong>${baht(economy.projectedIncome)}</strong></div></div><p class="dialog-note">⚡ พลังงานที่เหลือ ${fmt(state2.energy)} จะไม่ทบไปเดือนหน้า</p><div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v9-close>← กลับกระดาน</button><button class="dialog-button" type="button" data-v9-end-month>🌙 จบเดือน</button></div>`, "wide", "month");
}
function patchPersonActions(state2) {
  const missions = state2?.missions || [];
  for (const button of document.querySelectorAll("#actionBar button[data-event], #gameDialog [data-work-event]")) {
    const event = button.dataset.event || button.dataset.workEvent;
    if (!PERSON_EVENTS.has(event)) continue;
    let id = button.dataset.id;
    const visibleLabel = button.querySelector("strong")?.textContent?.trim() || "";
    if (!id) {
      const mission = missions.find((item) => item.event === event && (!visibleLabel || item.label === visibleLabel || visibleLabel.includes(item.targetName || "")));
      id = mission?.targetId || "";
      if (id) button.dataset.id = id;
    }
    const target = findPerson(state2, id);
    const action = buildPersonAction({ event, target, state: state2 });
    if (!action) {
      button.disabled = true;
      button.hidden = true;
      continue;
    }
    const strong = button.querySelector("strong");
    if (strong && strong.textContent !== action.label) strong.textContent = action.label;
  }
}
function patchMonthSummaryCopy() {
  const root = $2("#sceneDetails");
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\/\s*3,000,000/g, "").replace(/\s*\/\s*3000000/g, "");
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
function patchMaxSkillButtons(state2) {
  if (!state2) return;
  const snapshot = getSkillSnapshot(state2);
  for (const button of document.querySelectorAll(`#gameDialog [data-work-event="${EVENTS.TRAIN_SKILL}"][data-skill]`)) {
    if (snapshot.skills?.[button.dataset.skill]?.level >= 10) button.remove();
  }
}
function patchHud() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = getEconomyView(state2);
  const organizationVisible = state2.organizationMode || state2.milestones?.firstG1 || Number(state2.team?.length || 0) > 0;
  const volumeLabel = $2("#hudVolumeLabel");
  const volume = $2("#hudXV");
  if (organizationVisible) {
    if (volumeLabel) volumeLabel.innerHTML = '🏙️ TGV เดือนนี้ <b aria-hidden="true">?</b>';
    if (volume) volume.textContent = `${fmt(economy.tgv)} XV`;
  }
  if (state2.organizationMode) {
    const energy = $2("#hudEnergyButton");
    if (energy) energy.hidden = true;
    const monthButton = $2("#monthButton");
    if (monthButton) {
      monthButton.hidden = false;
      monthButton.textContent = "ผ่านไปอีก 1 เดือน";
    }
    const people = $2("#peopleButton");
    if (people) {
      people.hidden = false;
      const count = state2.organization?.aggregate?.xvisorCount || state2.team?.length || 0;
      people.innerHTML = `Organization <b id="peopleCount">${fmt(count)}</b>`;
    }
  }
  patchPersonActions(state2);
  patchMonthSummaryCopy();
  patchMaxSkillButtons(state2);

}
async function syncCertifiedToCloud() {
  if (cloudSyncAttempted || !profileCertified()) return;
  cloudSyncAttempted = true;
  try {
    const response = await fetch("/api/progress", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = await response.json();
    const progress = { ...payload.progress || {}, [PROFILE_KEY]: "1" };
    await fetch("/api/progress", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) });
  } catch {
  }
}
function persistCertification() {
  const state2 = stateNow();
  if (!state2?.milestones?.certified) return;
  try {
    localStorage.setItem(PROFILE_KEY, "1");
  } catch {
  }
  syncCertifiedToCloud();
}
document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-v9-close]");
  if (close) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    return;
  }
  const finale = event.target.closest('[data-ui="v9-finale"]');
  if (finale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow());
    return;
  }
  const peopleTrigger = event.target.closest('#peopleButton, [data-open-people], [data-dialog-action="people"]');
  if (peopleTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const personTrigger = event.target.closest("#sceneDetails [data-person-id]");
  if (personTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    renderPeople(personTrigger.dataset.personId);
    return;
  }
  const incomeTrigger = event.target.closest("#incomeButton");
  if (incomeTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderIncome();
    return;
  }
  const tgvTrigger = event.target.closest("#hudXVButton");
  if (tgvTrigger) {
    const state2 = stateNow();
    if (state2 && (state2.organizationMode || state2.milestones?.firstG1 || state2.team?.length)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderTgvHelp();
      return;
    }
  }
  const monthTrigger = event.target.closest("#monthButton");
  if (monthTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderMonthConfirm();
    return;
  }
  const orgPass = event.target.closest('#actionBar button[data-event="END_MONTH"]');
  if (orgPass && stateNow()?.organizationMode) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const work = event.target.closest("#gameDialog [data-work-event]");
  if (work && !work.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    const gameEvent = work.dataset.workEvent;
    hardClose();
    dispatch(gameEvent, payload);
    return;
  }
  const endMonth = event.target.closest("[data-v9-end-month]");
  if (endMonth) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const tab = event.target.closest("[data-v9-people-tab]");
  if (tab) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleTab = tab.dataset.v9PeopleTab;
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const clearFocus = event.target.closest("[data-v9-clear-focus]");
  if (clearFocus) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleFocusId = null;
    peoplePage = 0;
    renderPeople();
    return;
  }
  const page = event.target.closest("[data-v9-page]");
  if (page && !page.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage += page.dataset.v9Page === "next" ? 1 : -1;
    renderPeople();
    return;
  }
  const submit = event.target.closest("[data-v9-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  const enter = event.target.closest("[data-v9-enter-org]");
  if (enter) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const current = stateNow();
    if (!scoreName(current)) return openCampaignGate(current);
    hardClose();
    dispatch(EVENTS.ENTER_ORGANIZATION);
    return;
  }
  const newRun = event.target.closest("[data-v9-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
  }
}, true);
document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-v9-people-search]");
  if (!input) return;
  event.stopImmediatePropagation();
  peopleQuery = input.value;
  peoplePage = 0;
  const position = input.selectionStart;
  renderPeople();
  requestAnimationFrame(() => {
    const next = $2("[data-v9-people-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(position, position);
    }
  });
}, true);
dialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  const current = getState();
  if (current.campaignScore?.locked && !current.organizationMode) return;
  if (current.runComplete) dismissedRun = current.runId;
  hardClose();
}, true);
var month24DismissedRun = null;
function signed(value) {
  const number = Math.round(Number(value || 0));
  return `${number > 0 ? "+" : ""}${fmt(number)}`;
}
function setText(node, value) {
  if (node && node.textContent !== String(value)) node.textContent = String(value);
}
function setHtml(node, value) {
  if (node && node.innerHTML !== value) node.innerHTML = value;
}
function setHidden(node, hidden) {
  if (node && node.hidden !== Boolean(hidden)) node.hidden = Boolean(hidden);
}
function organizationReportHtml(report) {
  if (!report) return "<p>กด <b>ผ่านไปอีก 1 เดือน</b> แล้วระบบจะรันงานประจำองค์กรให้ครบในครั้งเดียว</p>";
  const xircle = report.activities?.xircle ? '<span class="is-xircle">🏕️ The Xircle ×1</span>' : "";
  const trend = report.tgvDeltaPct == null ? "เดือนแรกของ Year 2" : `${report.tgvDeltaPct > 0 ? "▲" : report.tgvDeltaPct < 0 ? "▼" : "•"} ${Math.abs(report.tgvDeltaPct)}% จากเดือนก่อน`;
  const xircleBonus = report.xircleBonus ? `<section class="v1-xircle-bonus"><div><span>THE XIRCLE</span><strong>RESET · RECONNECT · RISE</strong></div><ul><li>❤️ Retention ${escapeHtml2(report.xircleBonus.retention)}</li><li>👥 Referral ${escapeHtml2(report.xircleBonus.referral)}</li><li>🔄 Member comeback ${signed(report.xircleBonus.comeback)}</li><li>🎓 ${escapeHtml2(report.xircleBonus.certification)}</li></ul></section>` : "";
  const trip = report.trip ? `<section class="v1-travel-reward"><span>✈️ RECOGNITION TRIP ${fmt(report.trip.number)}</span><strong>${escapeHtml2(report.trip.destination)}</strong><small>${escapeHtml2(report.trip.landmark)}</small></section>` : "";
  return `<div class="v1-org-report">
    <section class="v1-auto-plan"><div><span>เดือนนี้ทีมเดินให้คุณ</span><strong>กิจกรรม → คน → ลูกค้า → XV → TGV → รายได้</strong></div><div class="v1-org-rhythm"><span>🎓 Xcademy ×4</span><span>🏠 Open House ×1</span>${xircle}</div></section>
    <div class="v1-report-headline"><div><span>🏙️ TGV · MONTH ${report.month}</span><strong>${fmt(report.tgv)} XV</strong><small>${trend}</small></div><div><span>💰 รายได้เดือนนี้</span><strong>${baht(report.income)}</strong><small>สะสม ${baht(report.totalIncome)}</small></div></div>
    <section class="v1-flow-section"><h3>ลูกค้า</h3><div class="v1-flow-grid v1-flow-grid--customers"><div><span>คนใหม่</span><b>${fmt(report.newPeople)}</b></div><div><span>ลูกค้าใหม่</span><b>+${fmt(report.newCustomers)}</b></div><div><span>ใช้ต่อ</span><b>${fmt(report.repeatCustomers)}</b></div><div class="is-warning"><span>พัก</span><b>−${fmt(report.pausedCustomers)}</b></div><div class="is-loss"><span>หยุด</span><b>−${fmt(report.stoppedCustomers)}</b></div><div class="is-comeback"><span>กลับมา</span><b>+${fmt(report.comebackCustomers)}</b></div><div class="is-net"><span>สุทธิ</span><b>${signed(report.netCustomers)}</b></div></div></section>
    <section class="v1-flow-section"><h3>ทีมสร้างทีม</h3><div class="v1-flow-grid v1-flow-grid--team"><div><span>X-VISOR ใหม่</span><b>+${fmt(report.newXvisors)}</b></div><div class="is-warning"><span>ช้าลง</span><b>${fmt(report.slowedMembers)}</b></div><div class="is-warning"><span>พักงาน</span><b>−${fmt(report.pausedMembers)}</b></div><div class="is-loss"><span>หยุดทำ</span><b>−${fmt(report.quitMembers)}</b></div><div class="is-comeback"><span>กลับมา active</span><b>+${fmt(report.comebackMembers)}</b></div><div class="is-net"><span>ทีมสุทธิ</span><b>${signed(report.netXvisors)}</b></div><div><span>XLEAD ใหม่</span><b>+${fmt(report.newXleads)}</b></div></div></section>
    ${xircleBonus}${trip}
    <details class="v1-rhythm-details"><summary>ดูที่มาของรายได้เดือนนี้</summary><div class="v1-income-mini"><span>① ลูกค้า <b>${baht(report.incomeBreakdown?.channel1)}</b></span><span>② Direct G1 <b>${baht(report.incomeBreakdown?.channel2)}</b></span><span>③ Organization <b>${baht(report.incomeBreakdown?.channel3)}</b></span></div></details>
  </div>`;
}
function roleLabel(member) {
  if (member.rank === "xlead") return "👑 XLEAD";
  return member.specialtyLabel || { sales: "💰 ขายเก่ง", care: "❤️ ดูแลเก่ง", builder: "🌱 สร้างทีมเก่ง", balanced: "⚖️ สมดุล" }[member.specialty] || "⚖️ สมดุล";
}
function memberStatusLabel(member) {
  return { active: "🟢 Active", slow: "🟡 Slow", paused: "💤 Paused", inactive: "⚪ Inactive" }[member.organizationStatus] || (member.active === false ? "💤 Paused" : "🟢 Active");
}
function organizationDialogHtml(state2) {
  if (state2.runComplete) return finaleHtml2(state2);
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  const leaders = (state2.team || []).filter((member) => member.active !== false).sort((a, b) => Number(b.personalXV || 0) - Number(a.personalXV || 0)).slice(0, 8);
  return `<div class="dialog-kicker">🏙️ ORGANIZATION YEAR · MONTH ${state2.month}</div>
    <h2>ระบบที่สร้างไว้กำลังเดินต่อ</h2>
    ${organizationReportHtml(report)}
    <div class="v1-org-grid v1-org-grid--totals">
      <div><span>❤️ Active Customers</span><strong>${fmt(agg.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR ทั้งองค์กร</span><strong>${fmt(agg.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(agg.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(agg.organizationSize ?? agg.xvisorCount)}</strong></div>
    </div>
    <section class="work-section"><h3>คนที่กำลังสร้างผลลัพธ์</h3><div class="income-breakdown">${leaders.map((member) => `<div class="v1-leader"><span><b>${escapeHtml2(member.name)}</b><small>${escapeHtml2(roleLabel(member))} · ${escapeHtml2(memberStatusLabel(member))}</small></span><b>${fmt(member.personalXV)} XV</b></div>`).join("") || "<p>ยังไม่มีทีม</p>"}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`;
}
function patchOrganizationDialog(state2) {
  const dialog2 = $2("#gameDialog");
  const content2 = $2("#dialogContent");
  if (!dialog2?.open || !content2 || dialog2.dataset.v9Dialog !== "organization") return;
  const key = `${state2.month}:${state2.lastOrganizationReport?.month || 0}:${state2.runComplete ? 1 : 0}`;
  if (dialog2.dataset.v1OrganizationKey === key) return;
  dialog2.dataset.v1OrganizationKey = key;
  setHtml(content2, organizationDialogHtml(state2));
}
function finaleDetails(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  return `<div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
  <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
    <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
    <div><span>🏆 Best TGV</span><strong>${fmt(summary.bestTGV)} XV</strong></div>
    <div><span>💎 Best Month Income</span><strong>${baht(summary.bestMonthIncome)}</strong></div>
    <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht(summary.total24Income ?? summary.totalIncome)}</strong></div>
    <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
    <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
    <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
    <div><span>🏙️ Organization Size</span><strong>${fmt(summary.organizationSize)}</strong></div>
  </div><div class="v1-trip-stamps" aria-label="ทริปที่ได้รับ">${trips.map((trip) => `<span>✈️ ${escapeHtml2(trip.destination)}<small>M${fmt(trip.month)}</small></span>`).join("") || '<span class="is-empty">ทริปคือรางวัลจากผลงานที่ถึงเงื่อนไข</span>'}</div><blockquote class="v1-ending-quote">คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง</blockquote>`;
}
function patchOrganizationBoard(state2) {
  if (!state2.organizationMode) return;
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  setHidden($2("#monthButton"), true);
  setHidden($2("#hudEnergyButton"), true);
  const teamChip = $2("#teamChip");
  setHidden(teamChip, false);
  setText(teamChip, `ทีม ${fmt(agg.xvisorCount)} X-VISOR · ${fmt(agg.xleadCount)} XLEAD`);
  setText($2("#hudCustomers"), `${fmt(agg.activeCustomers)} คน`);
  setText($2("#hudVolumeLabel"), report ? `🏙️ TGV ล่าสุด · M${report.month}` : "🏙️ TGV เดือนนี้");
  setText($2("#hudXV"), `${fmt(report?.tgv)} XV`);
  setText($2(".status-item--income span"), "รายได้ล่าสุด · สะสม");
  setText($2("#hudIncome"), `${baht(report?.income)} · Σ${baht(state2.economy?.totalIncome)}`);
  const people = $2("#peopleButton");
  if (people) {
    setHidden(people, false);
    setHtml(people, `Organization <b id="peopleCount">${fmt(agg.xvisorCount)}</b>`);
  }
  setText($2("#goalEyebrow"), state2.runComplete ? "จบเส้นทาง 24 เดือน" : "YEAR 2 · ORGANIZATION");
  setText($2("#goalTitle"), state2.runComplete ? "🏁 2 ปีผ่านไปแล้ว" : `Organization Year · เดือน ${state2.month}`);
  setText($2("#goalReason"), state2.runComplete ? "ดู Best TGV รายได้ 24 เดือน ขนาดองค์กร และทริปที่ทีมปลดล็อกได้ แล้วเลือกเส้นทางถัดไป" : "ปุ่มเดียวรัน Xcademy ×4, Open House ×1 และ The Xircle ตามรอบ · ลูกค้าและทีมมีทั้งโต พัก หยุด และกลับมา");
  setText($2("#dialogueSpeaker"), state2.runComplete ? "24-MONTH FINALE" : "ORGANIZATION REPORT");
  setText($2("#dialogueText"), state2.runComplete ? "ปีแรกคุณสร้างระบบ ปีที่สองระบบเผชิญทั้งแรงส่งและแรงเสียดทาน — และยังเดินมาถึงเส้นชัย" : report ? `เดือน ${report.month} · ลูกค้าสุทธิ ${signed(report.netCustomers)} · ทีมสุทธิ ${signed(report.netXvisors)} · รายได้ ${baht(report.income)}` : "จากนี้ Organization จะดูแลลูกค้า สร้าง Candidate และพัฒนาคนต่อโดยไม่รอคุณทำทุกเรื่อง");
  const details = $2("#sceneDetails");
  setHtml(details, state2.runComplete ? finaleDetails(state2) : organizationReportHtml(report));
  setText($2(".action-dock__heading span"), state2.runComplete ? "เล่นให้ดีกว่าเดิม" : "เดินระบบองค์กร");
  setText($2(".action-dock__heading small"), state2.runComplete ? "เริ่มรอบใหม่ทันที" : "หนึ่งปุ่ม · หนึ่งเดือน");
  const actionBar = $2("#actionBar");
  if (!actionBar) return;
  const mode = state2.runComplete ? "complete" : `month-${state2.month}`;
  if (actionBar.dataset.v1Mode === mode && actionBar.querySelector(state2.runComplete ? "[data-v1-open-finale]" : "[data-v1-org-pass]")) return;
  actionBar.dataset.v1Mode = mode;
  setHtml(actionBar, state2.runComplete ? '<button class="action-button action-button--primary" type="button" data-v1-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>Scoreboard · NEW GAME+ · เล่นใหม่</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1-org-pass><span class="action-button__icon" aria-hidden="true">▶</span><span class="action-button__copy"><strong>▶ ผ่านไปอีก 1 เดือน</strong><small>Xcademy ×4 · Open House ×1 · The Xircle ตามรอบ · สรุปครั้งเดียว</small></span></button>');
}
function patchReleaseUi() {
  
  const state2 = stateNow();
  if (!state2) return;
  document.body.dataset.releaseMoment = state2.runComplete ? "month24" : state2.campaignScore?.locked && !state2.organizationMode ? "month12" : state2.runMode === "NEW_GAME_PLUS" && state2.month === 1 ? "new-game-plus" : "play";
  
  if (state2.organizationMode) {
    patchOrganizationBoard(state2);
    patchOrganizationDialog(state2);

  } else {
    
  }
}
document.addEventListener("click", (event) => {
  const submit = event.target.closest("[data-v1-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  const pass = event.target.closest("[data-v1-org-pass]");
  if (pass) {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.add("is-month-passing");
    dispatch(EVENTS.END_MONTH);
    window.setTimeout(() => document.body.classList.remove("is-month-passing"), 720);
    return;
  }
  const openFinale2 = event.target.closest("[data-v1-open-finale]");
  if (openFinale2) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (state2?.runComplete) {
      month24DismissedRun = null;
      openFinale(state2);
    }
    return;
  }
  const closeFinale = event.target.closest("[data-v1-close-finale]");
  if (closeFinale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    month24DismissedRun = state2?.runId || "dismissed";
    dismissedRun = month24DismissedRun;
    const dialog2 = $2("#gameDialog");
    if (dialog2?.open) dialog2.close();
    document.body.style.removeProperty("overflow");
    return;
  }
  const newRun = event.target.closest("[data-v1-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
    return;
  }
  const ng = event.target.closest("[data-v1-new-game-plus]");
  if (ng) {
    event.preventDefault();
    event.stopImmediatePropagation();
    
    hardClose2();
    dismissedRun = null;
    dispatch(EVENTS.NEW_GAME_PLUS);
  }
}, true);
$2("#gameDialog")?.addEventListener("cancel", () => {
  const state2 = stateNow();
  if (state2?.runComplete) dismissedRun = month24DismissedRun = state2.runId || "dismissed";
}, true);
var SCORE_SENT_PREFIX3 = "mc_xvisor_1b_score_sent:";
const submittedScores = new Map();
const submittingRuns = new Set();
var dismissedRun = null;
function scoreName(state2) {
  if (submittedScores.has(state2?.runId)) return submittedScores.get(state2.runId);
  try {
    return localStorage.getItem(`${SCORE_SENT_PREFIX3}${state2?.runId || ""}`) || "";
  } catch {
    return "";
  }
}
function hardClose2() {
  const dialog2 = $2("#gameDialog");
  if (dialog2?.open) dialog2.close();
  if (dialog2) {
    delete dialog2.dataset.v1bCampaignGate;
    delete dialog2.dataset.v1bFinale;
  }
  document.body.style.removeProperty("overflow");
}
function show(html, kind, key) {
  const dialog2 = $2("#gameDialog");
  const content2 = $2("#dialogContent");
  if (!dialog2 || !content2) return;
  content2.innerHTML = html;
  dialog2.dataset.kind = kind;
  if (key === "campaign") {
    dialog2.dataset.v1bCampaignGate = "1";
    delete dialog2.dataset.v1bFinale;
  } else {
    dialog2.dataset.v1bFinale = key;
    delete dialog2.dataset.v1bCampaignGate;
  }
  document.body.style.overflow = "hidden";
  if (!dialog2.open) dialog2.showModal();
  focusDialogStart(dialog2);
}
function campaignScoreDetails(state2) {
  const score = state2.campaignScore || {};
  const path = state2.campaignOutcome?.xgenByMonth12 || score.xgenByMonth12 ? "XGEN" : "XLEAD";
  return `<div class="dialog-kicker">🏆 MONTH 12 · CAMPAIGN COMPLETE · 1.0b</div>
    <h2>12 เดือนแรกจบแล้ว — บันทึกชื่อคุณก่อน</h2>
    <p class="dialog-note">High Score ใช้ผล Month 1–12 เท่านั้น ปีที่ 2 จะไม่แก้คะแนนก้อนนี้</p>
    <div class="v1-finale-grid" aria-label="High Score 12 เดือน">
      <div><span>🏆 Best TGV</span><strong>${fmt(score.bestTgv)} XV</strong></div>
      <div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht(score.totalIncome)}</strong></div>
      <div><span>💎 สูงสุด / เดือน</span><strong>${baht(score.bestMonthlyIncome)}</strong></div>
      <div><span>🏙️ Organization</span><strong>${fmt(score.organizationSize)} คน</strong></div>
    </div>
    <blockquote class="v1-ending-quote">${path === "XGEN" ? "⭐ คุณผ่าน XGEN ภายใน 12 เดือน — ปีที่ 2 จะเปิด XGEN Path และ Recognition Trip" : "👑 คุณจบปีแรกใน XLEAD Path — ปีที่ 2 จะทำให้เห็นความต่างของระบบที่สร้างไว้"}</blockquote>`;
}
function campaignGateHtml(state2, status = "") {
  const sent = scoreName(state2);
  if (sent) {
    return `${campaignScoreDetails(state2)}
      <div class="v1-score-lock-success"><strong>✅ High Score บันทึกแล้ว</strong><span>ชื่อบนตาราง: ${escapeHtml2(sent)}</span></div>
      <h3>ทีนี้ดูสิ่งที่คุณสร้างไว้เดินต่อเอง</h3>
      <p class="dialog-note">จาก Month 13 เป็นต้นไป คุณไม่ต้องขายหรือตามรายคนแล้ว กดเดือนละครั้งเพื่อดูระบบเดินต่อจน Month 24</p>
      <div class="dialog-actions v1-finale-actions"><button class="dialog-button" type="button" data-v1b-enter-org>▶ ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</button></div>`;
  }
  return `${campaignScoreDetails(state2)}
    <div class="v1-score-required">
      <strong>ขั้นสุดท้ายของปีแรก</strong>
      <p>ใส่ชื่ออะไรก็ได้เพื่อขึ้น High Score ก่อน แล้วเกมจะเปิด Year 2 ให้ทันที</p>
      <label class="v9-score-name">ชื่อบน High Score <input type="text" maxlength="28" autocomplete="nickname" data-v1b-score-name placeholder="เช่น Teem / Ako / แมวขาว"></label>
      <p class="dialog-note" data-v1b-score-status>${escapeHtml2(status || "ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score")}</p>
      <button class="dialog-button" type="button" data-v1b-submit-score>🏆 บันทึกชื่อขึ้น High Score</button>
    </div>`;
}
function openCampaignGate(state2, status = "") {
  if (!state2?.campaignScore?.locked || state2.organizationMode) return;
  show(campaignGateHtml(state2, status), "wide", "campaign");
}
function finaleDetails2(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  const path = summary.year2Path || state2.year2Path || "xlead";
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING · 1.0b</div>
    <h2>2 ปีผ่านไปแล้ว — นี่คือสิ่งที่ระบบของคุณสร้าง</h2>
    <div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
    <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
      <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
      <div><span>🏆 Best TGV</span><strong>${fmt(summary.bestTGV)} XV</strong></div>
      <div><span>💎 Best Month Income</span><strong>${baht(summary.bestMonthIncome)}</strong></div>
      <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht(summary.total24Income ?? summary.totalIncome)}</strong></div>
      <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(summary.organizationSize)}</strong></div>
    </div>
    <div class="v1-trip-stamps">${path === "xgen" ? trips.map((trip) => `<span>✈️ ${escapeHtml2(trip.destination)}<small>M${fmt(trip.month)}</small></span>`).join("") : '<span class="is-empty">XLEAD Path · รอบนี้ยังไม่ผ่าน XGEN ก่อนจบ Month 12 จึงไม่มี Recognition Trip</span>'}</div>
    <blockquote class="v1-ending-quote">${path === "xgen" ? "คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง" : "คุณสร้างทีมได้แล้ว — NEW GAME+ รอบหน้า ลองแตะ 3,000,000 XV ในเดือนเดียวก่อนจบ Month 12"}</blockquote>`;
}
function finaleHtml2(state2) {
  const sent = scoreName(state2);
  return `${finaleDetails2(state2)}
    <div class="v1-score-lock-success"><strong>🏆 High Score ปีแรก</strong><span>${sent ? `บันทึกในชื่อ ${escapeHtml2(sent)}` : "คะแนน Month 12 ถูกล็อกไว้ในรอบนี้"}</span></div>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1b-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v1b-new-game-plus>⚡ NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1b-close-finale>กลับไปดูฉากจบ</button>`;
}
function openFinale(state2) {
  if (!state2?.runComplete) return;
  show(finaleHtml2(state2), "wide", state2.runId || "complete");
}
function patch() {
  
  
  const state2 = stateNow();
  if (!state2) return;
  if (state2.campaignScore?.locked && !state2.organizationMode) {
    const dialog3 = $2("#gameDialog");
    if (!dialog3?.open || !dialog3.dataset.v1bCampaignGate) openCampaignGate(state2);
    const actionBar2 = $2("#actionBar");
    if (actionBar2) actionBar2.innerHTML = scoreName(state2) ? '<button class="action-button action-button--primary" type="button" data-v1b-enter-org><span class="action-button__icon">▶</span><span class="action-button__copy"><strong>ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</strong><small>Year 2 · กดเดือนละครั้งจน Month 24</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1b-open-campaign-gate><span class="action-button__icon">🏆</span><span class="action-button__copy"><strong>ใส่ชื่อ High Score ก่อน</strong><small>บันทึกปีแรก แล้วค่อยเปิด Year 2</small></span></button>';
    return;
  }
  if (!state2.runComplete) return;
  const actionBar = $2("#actionBar");
  if (actionBar && !actionBar.querySelector("[data-v1b-open-finale]")) {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1b-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>จบจริง · NEW GAME+</small></span></button>';
  }
  const dialog2 = $2("#gameDialog");
  if (dialog2?.open && dialog2.dataset.v1bFinale !== state2.runId) openFinale(state2);
  else if (!dialog2?.open && dismissedRun !== state2.runId) openFinale(state2);
}
async function submitScore2() {
  const state2 = stateNow();
  const score = state2?.campaignScore;
  if (!score?.locked || submittingRuns.has(state2.runId)) return;
  const input = $2("[data-v1b-score-name], [data-v9-score-name]");
  const status = $2("[data-v1b-score-status], [data-v9-score-status]");
  const displayName = String(input?.value || "").trim().slice(0, 28);
  if (!displayName) {
    if (status) status.textContent = "ใส่ชื่ออะไรก็ได้ก่อน แล้วค่อยไป Year 2";
    input?.focus();
    return;
  }
  if (status) status.textContent = "กำลังบันทึก High Score 1.0b…";
  submittingRuns.add(state2.runId);
  const button = $2("[data-v1b-submit-score]");
  if (button) button.disabled = true;
  try {
    const response = await fetch("/api/xvisor-scores", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        runId: score.runId || state2.runId,
        scoreVersion: V1_SCORE_VERSION,
        runMode: state2.runMode || "FIRST_RUN",
        bestTgv: score.bestTgv,
        totalIncome: score.totalIncome,
        bestMonthlyIncome: score.bestMonthlyIncome,
        organizationSize: score.organizationSize,
        completedAt: score.completedAt
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "SUBMIT_FAILED");
    submittedScores.set(state2.runId, displayName);
    try {
      localStorage.setItem(`${SCORE_SENT_PREFIX3}${state2.runId}`, displayName);
    } catch {
    }
    openCampaignGate(state2, `✅ บันทึก High Score แล้วในชื่อ ${displayName}`);
  } catch {
    if (status) status.textContent = "ส่ง High Score ไม่สำเร็จ · ต้องส่งสำเร็จก่อนจึงจะเปิด Year 2";
  } finally {
    submittingRuns.delete(state2.runId);
    if (button?.isConnected) button.disabled = false;
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-v1b-submit-score],[data-v9-submit-score],[data-v1-submit-score]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  if (event.target.closest("[data-v1b-open-campaign-gate]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow());
    return;
  }
  if (event.target.closest("[data-v1b-enter-org],[data-v9-enter-org]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (!state2?.campaignScore?.locked) return;
    if (!scoreName(state2)) {
      openCampaignGate(state2, "ใส่ชื่อ High Score ให้สำเร็จก่อน แล้วปุ่ม Year 2 จะเปิด");
      return;
    }
    hardClose2();
    dispatch(EVENTS.ENTER_ORGANIZATION);
    return;
  }
  if (event.target.closest("[data-v1b-open-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (state2?.runComplete) {
      dismissedRun = null;
      openFinale(state2);
    }
    return;
  }
  if (event.target.closest("[data-v1b-close-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    dismissedRun = state2?.runId || "dismissed";
    hardClose2();
    return;
  }
  if (event.target.closest("[data-v1b-new-run]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
    return;
  }
  if (event.target.closest("[data-v1b-new-game-plus]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose2();
    dismissedRun = null;
    dispatch(EVENTS.NEW_GAME_PLUS);
  }
}, true);
document.addEventListener("cancel", (event) => {
  const state2 = stateNow();
  if (event.target?.id === "gameDialog" && state2?.campaignScore?.locked && !state2.organizationMode) {
    event.preventDefault();
    openCampaignGate(state2);
  }
}, true);

function sync() {
  const current = getState();
  const app = $2("#gameApp");
  app.classList.toggle("is-organization-mode", Boolean(current.organizationMode));
  app.classList.toggle("is-travel-month", Boolean(current.organizationMode && current.activeTravel));
  persistCertification();
  patchHud();
  patchReleaseUi();
  patch();
  for (const link of app.querySelectorAll("a[href]")) {
    if (link.getAttribute("href").startsWith("#")) continue;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}
return {
  sync,
  showIncome: renderIncome,
  showMonthConfirmation: renderMonthConfirm,
  showPeople(tab = "all", query = "", focusId = null) {
    peopleTab = tab; peopleQuery = query; peoplePage = 0; peopleFocusId = focusId;
    renderPeople(focusId);
  }
};
}
